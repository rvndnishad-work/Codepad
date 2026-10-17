/**
 * DSA ULTRA — batch 25: shortest paths (Dijkstra, Bellman-Ford, BFS vs
 * Dijkstra, Floyd-Warshall). One complete answer per language (Python,
 * JavaScript, Java, C++). Every example was run with python3 / node /
 * javac+java / g++ -std=c++17 by scripts/verify-dsa-examples.ts and the
 * quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  {
    title: `How does Dijkstra's algorithm work?`,
    difficulty: "hard",
    seoDescription: `Dijkstra's algorithm in Python, JavaScript, Java and C++: greedy relaxation with a min-heap, lazy deletion, why negative edges break it, verified code.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Explain how Dijkstra's algorithm finds shortest paths in a weighted graph, then implement it in Python for a graph given as an edge list. What is its complexity, and when does it give the wrong answer?"

**What a strong answer should cover:**
- The greedy rule: repeatedly settle the unsettled node with the smallest tentative distance, then relax its outgoing edges.
- Edge relaxation, \`dist\` initialised to infinity except the source, and a \`parent\` array to rebuild the route.
- A min-heap of \`(distance, node)\` tuples with \`heapq\`, and lazy deletion: push a new entry on every improvement and skip stale entries when popped, because \`heapq\` has no decrease-key.
- O((V + E) log V) time with a binary heap, O(V + E) space; why non-negative weights are required (and what to use instead).
- Python specifics: \`float("inf")\` for unreachable, tuples compare element by element so ties fall back to the node, and that node must be comparable.

**Clarifying questions expected:**
- "Can weights be negative, and is the graph directed?"
- "Do you need the route itself, or only the distance? What should unreachable nodes return?"

**Code / implementation expected:** Yes — a Python \`dijkstra(n, edges, source)\` using \`heapq\`, returning distances (and ideally parents for the path).`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph-algorithm background assumed
**Difficulty:** Hard
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a town where every road is a pipe, and the length of a pipe is how long water takes to flow through it. You pour water into the pipe network at your house, A. The water spreads out in every direction at the same speed. Now stand at each crossroads with a stopwatch: the moment water first arrives at a crossroads is exactly the length of the shortest route from your house to it. Water cannot arrive earlier by any route, because it tried every route at once.

Dijkstra's algorithm is that flood, simulated on a computer. It cannot let water flow continuously, so it does the next best thing: it keeps a list of crossroads the water is "about to reach", with the time it would arrive, and always jumps to the one that will be reached **soonest**. That crossroads is now wet for good; its arrival time is final. From there, the water starts down every pipe leaving it, which may give some other crossroads an earlier arrival time than the one written down so far.

This is what every map app, network router and game path-finder does in some form. In interviews it is the standard answer to "shortest path when edges have different costs", and it shows up in disguise in problems like network delay time, path with minimum effort, and [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops). It was published by Edsger W. Dijkstra in 1959, in a three-page paper, "A note on two problems in connexion with graphs" ([Numerische Mathematik 1, 269–271](https://doi.org/10.1007/BF01386390)).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can any edge weight be negative? | Dijkstra is only correct when every weight is zero or positive. With negative edges you need [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work). |
| Are all edges the same cost? | If every edge costs the same, plain BFS gives the same answer faster; see [when BFS is enough](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths). |
| Directed or undirected? | An undirected road is two directed edges, one each way; forgetting the second one is a classic bug. |
| One source, or distances between every pair? | One source is Dijkstra. Every pair on a small, dense graph is often [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work). |
| Do you want the distance only, or the actual route? | The route needs a \`parent\` array, which costs one extra assignment per improvement. |
| What should an unreachable node return? | Infinity, -1, or "unreachable": agree on it before you code. |

## 3. The Building Blocks

A **graph** is a set of points (**nodes** or **vertices**) joined by lines (**edges**). In a **weighted** graph every edge carries a number, its **weight**: a distance, a price, a time. In a **directed** graph an edge goes one way only, like a one-way street. If you have not stored a graph in code before, read [how to represent a graph](/interview-question/what-is-a-graph-and-how-do-you-represent-it) first; this page uses an **adjacency list**: for each node, a list of \`(neighbour, weight)\` pairs.

📌 **Interview term: Single-source shortest path** — the problem of finding the cheapest route from one starting node (the **source**) to every other node, where the cost of a route is the sum of its edge weights.

The one operation every shortest-path algorithm is built from:

📌 **Interview term: Edge relaxation** — for an edge u → v with weight w, check whether going through u gives v a cheaper route than the best one known so far: if \`dist[u] + w < dist[v]\`, set \`dist[v] = dist[u] + w\` and remember that v's best route now comes from u.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Relaxing the edge from u to v, v drops from 12 to 8 because 3 plus 5 is smaller">
  <defs>
    <marker id="dij2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <circle class="d-box-accent" cx="120" cy="90" r="24"/>
  <text class="d-text" x="120" y="95" text-anchor="middle">u</text>
  <circle class="d-box" cx="420" cy="90" r="24"/>
  <text class="d-text" x="420" y="95" text-anchor="middle">v</text>
  <path class="d-edge-accent" d="M 144 90 L 390 90" marker-end="url(#dij2-arrow)"/>
  <text class="d-text d-accent" x="267" y="76" text-anchor="middle">weight 5</text>
  <text class="d-sub" x="120" y="150" text-anchor="middle">dist 3, settled</text>
  <text class="d-sub" x="420" y="150" text-anchor="middle">dist was 12</text>
  <rect class="d-box-accent" x="500" y="60" width="120" height="60" rx="10"/>
  <text class="d-text" x="560" y="84" text-anchor="middle">new dist 8</text>
  <text class="d-sub" x="560" y="106" text-anchor="middle">3 + 5 is less than 12</text>
</svg>

Before relaxing, the best known route to v cost 12. Node u is 3 away from the source and the edge costs 5, so going through u costs 8. Because 8 is less than 12, v's distance drops to 8. "Relax" is an old word for "loosen": the estimate for v was too high (too tight a constraint) and gets loosened down towards the truth.

Every distance starts at **infinity** (meaning "no route found yet"), except the source, which is 0. Shortest-path algorithms differ only in **which edges they relax, and in what order**.

## 4. Brute Force First

The obvious approach: list every simple route from the source to each node, add up the weights, and keep the cheapest. On a graph where each node connects to a few others, the number of routes grows exponentially with the number of nodes; 30 nodes can already have billions of routes. That is hopeless.

A smarter-sounding brute force is "relax every edge, over and over, until nothing changes". That one is actually correct (it is the Bellman-Ford algorithm) and runs in O(V × E) time, where V is the number of nodes and E the number of edges. Dijkstra's contribution is choosing a clever **order** of relaxations so that each edge only needs to be relaxed **once**.

## 5. The Core Idea: Always Finish the Closest Node Next

Dijkstra splits the nodes into two groups:

- **Settled** nodes: their shortest distance is final.
- Everyone else: they have a **tentative** distance, the best route found so far, which may still go down.

Then it repeats one step: **take the unsettled node with the smallest tentative distance, mark it settled, and relax every edge leaving it.** That is the flood from the story: the next crossroads to get wet is always the one the water reaches soonest.

📌 **Interview term: Greedy choice** — making the choice that looks best right now (here: the closest unsettled node) and never revisiting it. Dijkstra is a [greedy algorithm](/interview-question/what-is-a-greedy-algorithm) whose greedy choice can be proved safe, as long as no weight is negative.

To find "the unsettled node with the smallest tentative distance" quickly, Dijkstra keeps candidates in a **min-heap**.

📌 **Interview term: Priority queue (min-heap)** — a collection where you can add an item and remove the smallest item, each in O(log n) time. See [heap / priority queue](/interview-question/what-is-a-heap-priority-queue) for how it works inside.

Here is the graph every example on this page uses. The source is A; F has no edges pointing to it, so it can never be reached.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Example graph with six nodes A to F and weighted directed edges, F has no incoming edges">
  <defs>
    <marker id="dij1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 92 140 L 233 73" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="156" y="97" text-anchor="middle">4</text>
  <path class="d-edge" d="M 92 160 L 233 227" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="156" y="211" text-anchor="middle">2</text>
  <path class="d-edge" d="M 260 216 L 260 90" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="275" y="157" text-anchor="middle">1</text>
  <path class="d-edge" d="M 284 60 L 440 60" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="362" y="49" text-anchor="middle">5</text>
  <path class="d-edge" d="M 278 224 L 447 80" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="393" y="150" text-anchor="middle">8</text>
  <path class="d-edge" d="M 284 240 L 440 240" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="362" y="259" text-anchor="middle">10</text>
  <path class="d-edge" d="M 479 84 L 479 210" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="497" y="151" text-anchor="middle">2</text>
  <path class="d-edge" d="M 461 216 L 461 90" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="443" y="157" text-anchor="middle">1</text>
  <circle class="d-box" cx="70" cy="150" r="24"/>
  <text class="d-text" x="70" y="155" text-anchor="middle">A</text>
  <circle class="d-box" cx="260" cy="60" r="24"/>
  <text class="d-text" x="260" y="65" text-anchor="middle">B</text>
  <circle class="d-box" cx="260" cy="240" r="24"/>
  <text class="d-text" x="260" y="245" text-anchor="middle">C</text>
  <circle class="d-box" cx="470" cy="60" r="24"/>
  <text class="d-text" x="470" y="65" text-anchor="middle">D</text>
  <circle class="d-box" cx="470" cy="240" r="24"/>
  <text class="d-text" x="470" y="245" text-anchor="middle">E</text>
  <circle class="d-box-muted" cx="630" cy="150" r="24"/>
  <text class="d-text" x="630" y="155" text-anchor="middle">F</text>
</svg>

The edges are A→B 4, A→C 2, C→B 1, B→D 5, C→D 8, C→E 10, D→E 2 and E→D 1. The direct edge A→B costs 4, but A→C→B costs only 3; the direct edge C→E costs 10, but C→B→D→E costs 1 + 5 + 2 = 8 from C. A good algorithm must find both detours.

Each row of this table is one item taken out of the heap. The heap holds \`(distance, node)\` pairs; a pair whose distance is larger than the node's current best is **stale** (explained in section 7) and is skipped.

| Pop | Settled? | Edges relaxed | Heap afterwards |
| :--- | :--- | :--- | :--- |
| (0, A) | A = 0 | B: ∞ → 4, C: ∞ → 2 | (2, C) (4, B) |
| (2, C) | C = 2 | B: 4 → 3, D: ∞ → 10, E: ∞ → 12 | (3, B) (4, B) (10, D) (12, E) |
| (3, B) | B = 3 | D: 10 → 8 | (4, B) (8, D) (10, D) (12, E) |
| (4, B) | stale, skip | — | (8, D) (10, D) (12, E) |
| (8, D) | D = 8 | E: 12 → 10 | (10, D) (10, E) (12, E) |
| (10, D) | stale, skip | — | (10, E) (12, E) |
| (10, E) | E = 10 | E→D: 11 is not less than 8 | (12, E) |
| (12, E) | stale, skip | — | empty |

Eight pops, three of them stale, and F stays at infinity. Example 1 below prints exactly these numbers: \`heap pops: 8, stale entries skipped: 3\`.

📌 **Interview term: Tentative distance** — the best distance found so far for a node that is not settled yet; it can only go down.

## 6. Why It Works, and Why Negative Edges Break It

Why is it safe to declare the closest unsettled node, say u at distance d, final? Any other route to u must leave the settled group at some point and pass through some unsettled node x first. Since u was the **closest** unsettled node, x is at least d away already, and every edge after x adds a weight that is **zero or more**. So that other route costs at least d. Nothing can beat d, so d is final.

📌 **Interview term: Non-negative edge weights** — the precondition of Dijkstra's algorithm. The proof above uses it in the words "adds zero or more"; without it, the proof and the algorithm both fail.

A single negative edge breaks the argument:

<svg class="iq-diagram" width="100%" viewBox="0 0 560 230" role="img" aria-label="Negative edge trap, S to A costs 1, S to B costs 5, B to A costs minus 10">
  <defs>
    <marker id="dij3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 103 102 L 252 50" marker-end="url(#dij3-arrow)"/>
  <text class="d-sub" x="172" y="66" text-anchor="middle">1</text>
  <path class="d-edge" d="M 103 118 L 252 170" marker-end="url(#dij3-arrow)"/>
  <text class="d-sub" x="172" y="162" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 280 156 L 280 70" marker-end="url(#dij3-arrow)"/>
  <text class="d-text d-accent" x="300" y="117" text-anchor="middle">-10</text>
  <path class="d-edge" d="M 304 40 L 440 40" marker-end="url(#dij3-arrow)"/>
  <text class="d-sub" x="372" y="29" text-anchor="middle">1</text>
  <circle class="d-box" cx="80" cy="110" r="24"/>
  <text class="d-text" x="80" y="115" text-anchor="middle">S</text>
  <circle class="d-box-accent" cx="280" cy="40" r="24"/>
  <text class="d-text" x="280" y="45" text-anchor="middle">A</text>
  <circle class="d-box" cx="280" cy="180" r="24"/>
  <text class="d-text" x="280" y="185" text-anchor="middle">B</text>
  <circle class="d-box-accent" cx="470" cy="40" r="24"/>
  <text class="d-text" x="470" y="45" text-anchor="middle">T</text>
</svg>

Starting at S, the closest node is A at distance 1, so a textbook Dijkstra settles A = 1 and then T = 2. Only later does it look at B (distance 5) and discover the edge B→A costing -10, which would make A = 5 - 10 = -5. A is already settled, so the textbook version ignores it, and A and T are both wrong. Example 2 prints this:

~~~text
settled Dijkstra: S=0 A=1 B=5 T=2
Bellman-Ford:     S=0 A=-5 B=5 T=-4
wrong nodes: A, T
~~~

The "lazy" version in this page (it skips only stale heap entries and has no separate settled set) happens to fix A here, because it lets A be processed a second time; Example 2 shows A and T processed twice. But then it is no longer Dijkstra's algorithm: nodes can be re-processed many times and the O((V + E) log V) bound no longer holds. With negative weights, use [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work), which is built for them and also detects negative cycles.

Zero-weight edges are fine: "adds zero or more" still holds.

## 7. The Code in Python

Python's standard library has a binary min-heap in the \`heapq\` module. It is not a class: it is a set of functions that treat an ordinary \`list\` as a heap. Its own documentation says "the interesting property of a heap is that a[0] is always its smallest element" (you can read that text with \`python3 -c "import heapq; print(heapq.__doc__)"\`). \`heappush\` and \`heappop\` are O(log n).

We push **tuples** \`(distance, node)\`. Python compares tuples element by element, so the heap orders by distance first and, on a tie, by node number. That tie-break only works if nodes are comparable: if you push \`(5, some_object)\` twice and the objects do not define \`<\`, Python raises an error. Running exactly that printed:

~~~text
TypeError: '<' not supported between instances of 'Node' and 'Node'
~~~

Use integer node ids, or add a counter as a middle element: \`(dist, counter, node)\`.

📌 **Interview term: Lazy deletion** — instead of finding and updating a node's old entry inside the heap (a "decrease-key" operation, which \`heapq\` does not offer), push a fresh entry with the smaller distance and leave the old one in place. When an entry is popped, compare it with \`dist[node]\`: if it is larger, it is stale, so skip it.

~~~python
def dijkstra(n, edges, source):
    graph = [[] for _ in range(n)]
    for u, v, w in edges:
        graph[u].append((v, w))
    dist = [INF] * n
    parent = [-1] * n
    dist[source] = 0
    heap = [(0, source)]          # (distance, node): heapq is a min-heap
    pops = stale = 0
    while heap:
        d, u = heapq.heappop(heap)
        pops += 1
        if d > dist[u]:           # an old, longer entry: skip it
            stale += 1
            continue
        for v, w in graph[u]:
            if d + w < dist[v]:   # relax the edge u -> v
                dist[v] = d + w
                parent[v] = u
                heapq.heappush(heap, (dist[v], v))
    return dist, parent, pops, stale
~~~

**Line by line:**

- \`dist = [INF] * n\` with \`INF = float("inf")\`. Any real number compares as smaller than infinity, and \`inf + 5\` is still \`inf\`, so no special case is needed for "no route yet".
- \`heap = [(0, source)]\`: the source is the only candidate at the start.
- \`d, u = heapq.heappop(heap)\` takes the closest candidate. \`if d > dist[u]: continue\` is the lazy-deletion check: a cheaper route to \`u\` was found after this entry was pushed.
- The relaxation \`if d + w < dist[v]\` uses strict \`<\`, so equal-cost alternatives do not push duplicate entries.
- \`parent[v] = u\` remembers where the best route to \`v\` came from. Following \`parent\` backwards from any node walks the route in reverse.
- There is no separate \`visited\` set. The stale check plays that role: a node's real entry is popped exactly once at its final distance, and every later entry for it is stale.

## 8. Getting the Route Back

The \`parent\` array stores, for each node, the node just before it on its best route. That set of arrows forms a tree rooted at the source.

📌 **Interview term: Shortest-path tree** — the tree formed by every node's \`parent\` pointer after Dijkstra finishes; the path from the root to any node in it is a shortest path.

Walk the pointers from the target back to the source, then reverse:

~~~python
def path_to(parent, v):
    path = []
    while v != -1:
        path.append(NAMES[v])
        v = parent[v]
    return " -> ".join(reversed(path))
~~~

The source's parent is -1, which ends the walk. An unreachable node also has parent -1 and distance infinity; check the distance first, as the examples do.

## 9. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Dijkstra with a min-heap, paths and stale entries** prints:

~~~text
A: 0 via A
B: 3 via A -> C -> B
C: 2 via A -> C
D: 8 via A -> C -> B -> D
E: 10 via A -> C -> B -> D -> E
F: unreachable
heap pops: 8, stale entries skipped: 3
one node: [0]
isolated source: [0, inf, inf]
~~~

**Example 2 — Why a negative edge breaks Dijkstra** prints:

~~~text
settled Dijkstra: S=0 A=1 B=5 T=2
Bellman-Ford:     S=0 A=-5 B=5 T=-4
wrong nodes: A, T
lazy Dijkstra:    S=0 A=-5 B=5 T=-4
times each node was processed: S=1 A=2 B=1 T=2
~~~

**What the numbers show:** Example 1 reproduces the trace table from section 5 (8 pops, 3 stale), finds both detours (B through C, and E through B and D), reports F as unreachable, and handles a one-node graph and a source with no outgoing edges. Example 2 shows the textbook version settling A and T too early when a negative edge exists, while Bellman-Ford finds the true values.

## 10. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Binary heap with lazy deletion (this page) | O((V + E) log V) | O(V + E) | each successful relaxation pushes once (at most E pushes), each push and pop is O(log E) = O(log V) because E ≤ V² |
| Array scan, no heap | O(V²) | O(V) | V times, scan all V nodes for the smallest unsettled one; best for dense graphs |
| Fibonacci heap | O(E + V log V) | O(V + E) | O(1) amortised decrease-key (Fredman and Tarjan, Journal of the ACM 34(3), 1987); mainly of theoretical interest |

In Python the heap can hold up to E entries at once (one per successful relaxation), so the space is O(V + E). \`heapq\` works on a plain list; no extra objects are created besides the tuples. For a refresher on the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 11. Edge Cases

- **Source with no outgoing edges:** only the source gets distance 0; Example 1 prints \`isolated source: [0, inf, inf]\`.
- **Unreachable node:** its distance stays infinity and its parent stays -1 (F in Example 1).
- **Single node:** the answer is \`[0]\`.
- **Zero-weight edges:** allowed; the correctness argument only needs "zero or more".
- **Parallel edges and self-loops:** harmless. Relaxation keeps the cheaper parallel edge, and a self-loop u → u with weight w ≥ 0 can never improve \`dist[u]\`.
- **Negative edges:** not allowed (section 6). **Negative cycles** make "shortest" undefined; [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work) detects them.

## Common Pitfalls

- **Using it with negative weights.** It returns wrong answers silently (Example 2). Ask about negative weights first; use Bellman-Ford if they exist.
- **Forgetting the stale check.** Without \`if d > dist[u]: continue\`, an old entry re-relaxes all of \`u\`'s edges with an outdated distance. The answers usually stay correct but the work can grow far beyond O((V + E) log V).
- **Pushing non-comparable nodes.** \`heapq\` compares the second tuple element on ties; objects without \`<\` raise \`TypeError\` (verified above). Use integer ids or \`(dist, counter, node)\`.
- **Using \`heapq\` as if it were a max-heap.** It is a min-heap only. For "largest first" you push negated values; for Dijkstra the min-heap is exactly what you want.
- **Undirected graph stored one way.** For an undirected road, append both \`(v, w)\` to \`graph[u]\` and \`(u, w)\` to \`graph[v]\`.
- **Returning \`inf\` to a caller that expects -1.** Convert at the end (\`-1 if d == INF else d\`), and never do integer arithmetic such as \`int(dist[v])\` on an unreachable node: \`int(float("inf"))\` raises \`OverflowError\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Dijkstra finds the cheapest route from one source to every node when all weights are non-negative, by always settling the unsettled node with the smallest tentative distance.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Relaxation:</strong> <span style="color:#f0e2c8;">For each edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u → v</code> with weight <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w</code>, if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[u] + w &lt; dist[v]</code> I lower <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[v]</code> and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[v] = u</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The heap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(dist, node)</code> tuples gives me the closest node in O(log V). It has no decrease-key, so I push a new tuple on every improvement and skip stale ones with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if d &gt; dist[u]: continue</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O((V + E) log V) time and O(V + E) space with a binary heap; O(V²) with a plain array scan, which is better for very dense graphs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">Negative edges break the greedy proof, so then I would use Bellman-Ford; equal weights make plain BFS enough.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not use Dijkstra with negative edges?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The proof that the closest unsettled node is final assumes every later edge adds zero or more. A negative edge can make a node cheaper after it was settled; in Example 2 a textbook Dijkstra reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A=1</code> when the true answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A=-5</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Python's <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">heapq</code> has no decrease-key. How do you handle a node whose distance improves?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Lazy deletion: push a new <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(new_dist, node)</code> and leave the old entry. When popping, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if d &gt; dist[u]: continue</code>. The heap may hold up to E entries, which is still O(E log V) work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the actual path, not just the distance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[v] = u</code> whenever <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code> is relaxed through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code>. Walk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> back from the target to the source and reverse the list. Example 1 prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A -&gt; C -&gt; B -&gt; D -&gt; E</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">You only need the distance to one target. Can you stop early?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: the moment the target is popped with a non-stale entry its distance is final, so you can <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code> right there. That does not change the worst case but often saves a lot of work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use a heap at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On a dense graph where E is close to V², scanning an array for the minimum unsettled node costs O(V) per step and O(V²) total, which beats O(V² log V). On an unweighted graph you would use a plain BFS queue.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Single-source shortest path** | cheapest route from one source to every node |
| **Edge relaxation** | if \`dist[u] + w < dist[v]\`, lower \`dist[v]\` and set \`parent[v] = u\` |
| **Greedy choice** | take the option that looks best now and never undo it |
| **Priority queue (min-heap)** | add an item or remove the smallest, each in O(log n) |
| **Tentative distance** | best distance found so far for a node not yet settled |
| **Non-negative edge weights** | every weight is zero or more; Dijkstra needs this |
| **Lazy deletion** | push a new entry instead of updating; skip stale entries when popped |
| **Shortest-path tree** | the tree of \`parent\` pointers; root-to-node paths are shortest paths |

---
**Conclusion:** Dijkstra's algorithm is a greedy flood: settle the closest unsettled node, relax its edges, repeat. In Python that is a \`heapq\` of \`(distance, node)\` tuples, \`float("inf")\` for unknown distances, and a stale check that stands in for the decrease-key operation \`heapq\` does not have. It runs in O((V + E) log V) time and is correct only when no edge weight is negative; say that limit out loud, and name Bellman-Ford as the fallback. Related: [when BFS is enough](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths), [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work) for negative weights, [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work) for all pairs, and [Prim's minimum spanning tree algorithm](/interview-question/what-is-the-difference-between-kruskal-s-and-prim-s-mst-algorithms), which has the same heap-driven shape.`,
        examples: [
          { label: `Dijkstra with a min-heap, paths and stale entries`, code: `import heapq

NAMES = "ABCDEF"
INF = float("inf")


def dijkstra(n, edges, source):
    graph = [[] for _ in range(n)]
    for u, v, w in edges:
        graph[u].append((v, w))
    dist = [INF] * n
    parent = [-1] * n
    dist[source] = 0
    heap = [(0, source)]          # (distance, node): heapq is a min-heap
    pops = stale = 0
    while heap:
        d, u = heapq.heappop(heap)
        pops += 1
        if d > dist[u]:           # an old, longer entry: skip it
            stale += 1
            continue
        for v, w in graph[u]:
            if d + w < dist[v]:   # relax the edge u -> v
                dist[v] = d + w
                parent[v] = u
                heapq.heappush(heap, (dist[v], v))
    return dist, parent, pops, stale


def path_to(parent, v):
    path = []
    while v != -1:
        path.append(NAMES[v])
        v = parent[v]
    return " -> ".join(reversed(path))


edges = [(0, 1, 4), (0, 2, 2), (2, 1, 1), (1, 3, 5), (2, 3, 8),
         (2, 4, 10), (3, 4, 2), (4, 3, 1)]
dist, parent, pops, stale = dijkstra(6, edges, 0)
for v in range(6):
    if dist[v] == INF:
        print(NAMES[v] + ": unreachable")
    else:
        print(NAMES[v] + ": " + str(dist[v]) + " via " + path_to(parent, v))
print("heap pops: " + str(pops) + ", stale entries skipped: " + str(stale))

def fmt(dist):
    return "[" + ", ".join("inf" if x == INF else str(x) for x in dist) + "]"


# Edge cases: a one-node graph, and a source with no outgoing edges
print("one node: " + fmt(dijkstra(1, [], 0)[0]))
print("isolated source: " + fmt(dijkstra(3, [(1, 2, 7)], 0)[0]))` },
          { label: `Why a negative edge breaks Dijkstra`, code: `import heapq

NAMES = "SABT"
INF = float("inf")
# S -> A costs 1, S -> B costs 5, B -> A costs -10 (negative!), A -> T costs 1
EDGES = [(0, 1, 1), (0, 2, 5), (2, 1, -10), (1, 3, 1)]
N = 4


def build():
    graph = [[] for _ in range(N)]
    for u, v, w in EDGES:
        graph[u].append((v, w))
    return graph


def dijkstra_settled(source):
    """Textbook Dijkstra: once a node is popped it is final and never changes."""
    graph, dist, done = build(), [INF] * N, [False] * N
    dist[source] = 0
    heap = [(0, source)]
    while heap:
        d, u = heapq.heappop(heap)
        if done[u]:
            continue
        done[u] = True
        for v, w in graph[u]:
            if not done[v] and d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(heap, (dist[v], v))
    return dist


def dijkstra_lazy(source):
    """Only skips stale entries, so a node can be processed again if it improves."""
    graph, dist, times = build(), [INF] * N, [0] * N
    dist[source] = 0
    heap = [(0, source)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        times[u] += 1
        for v, w in graph[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(heap, (dist[v], v))
    return dist, times


def bellman_ford(source):
    dist = [INF] * N
    dist[source] = 0
    for _ in range(N - 1):
        for u, v, w in EDGES:
            if dist[u] != INF and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    return dist


def show(dist):
    return " ".join(NAMES[i] + "=" + str(dist[i]) for i in range(N))


settled = dijkstra_settled(0)
truth = bellman_ford(0)
lazy, times = dijkstra_lazy(0)
print("settled Dijkstra: " + show(settled))
print("Bellman-Ford:     " + show(truth))
print("wrong nodes: " + ", ".join(NAMES[i] for i in range(N) if settled[i] != truth[i]))
print("lazy Dijkstra:    " + show(lazy))
print("times each node was processed: " + " ".join(NAMES[i] + "=" + str(times[i]) for i in range(N)))` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Explain how Dijkstra's algorithm finds shortest paths in a weighted graph, then implement it in JavaScript for a graph given as an edge list. What is its complexity, and when does it give the wrong answer?"

**What a strong answer should cover:**
- The greedy rule: repeatedly settle the unsettled node with the smallest tentative distance, then relax its outgoing edges.
- Edge relaxation, \`dist\` filled with \`Infinity\` except the source, and a \`parent\` array to rebuild the route.
- A min-heap of \`[distance, node]\` pairs with lazy deletion (push on every improvement, skip stale entries), since JavaScript has no built-in priority queue.
- O((V + E) log V) time with a binary heap, O(V + E) space; why non-negative weights are required.
- JavaScript specifics: writing a small heap class, why \`array.sort()\` after every push is too slow (and sorts numbers as strings by default), and that \`Infinity + w\` stays \`Infinity\`.

**Clarifying questions expected:**
- "Can weights be negative, and is the graph directed?"
- "Do you need the route itself, or only the distance? What should unreachable nodes return?"

**Code / implementation expected:** Yes — a JavaScript \`dijkstra(n, edges, source)\` with a hand-written binary min-heap, returning distances and parents.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph-algorithm background assumed
**Difficulty:** Hard
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a town where every road is a pipe, and the length of a pipe is how long water takes to flow through it. You pour water into the pipe network at your house, A. The water spreads out in every direction at the same speed. Now stand at each crossroads with a stopwatch: the moment water first arrives at a crossroads is exactly the length of the shortest route from your house to it. Water cannot arrive earlier by any route, because it tried every route at once.

Dijkstra's algorithm is that flood, simulated on a computer. It cannot let water flow continuously, so it does the next best thing: it keeps a list of crossroads the water is "about to reach", with the time it would arrive, and always jumps to the one that will be reached **soonest**. That crossroads is now wet for good; its arrival time is final. From there, the water starts down every pipe leaving it, which may give some other crossroads an earlier arrival time than the one written down so far.

This is what every map app, network router and game path-finder does in some form. In interviews it is the standard answer to "shortest path when edges have different costs", and it shows up in disguise in problems like network delay time, path with minimum effort, and [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops). It was published by Edsger W. Dijkstra in 1959, in a three-page paper, "A note on two problems in connexion with graphs" ([Numerische Mathematik 1, 269–271](https://doi.org/10.1007/BF01386390)).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can any edge weight be negative? | Dijkstra is only correct when every weight is zero or positive. With negative edges you need [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work). |
| Are all edges the same cost? | If every edge costs the same, plain BFS gives the same answer faster; see [when BFS is enough](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths). |
| Directed or undirected? | An undirected road is two directed edges, one each way; forgetting the second one is a classic bug. |
| One source, or distances between every pair? | One source is Dijkstra. Every pair on a small, dense graph is often [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work). |
| Do you want the distance only, or the actual route? | The route needs a \`parent\` array, which costs one extra assignment per improvement. |
| What should an unreachable node return? | Infinity, -1, or "unreachable": agree on it before you code. |

## 3. The Building Blocks

A **graph** is a set of points (**nodes** or **vertices**) joined by lines (**edges**). In a **weighted** graph every edge carries a number, its **weight**: a distance, a price, a time. In a **directed** graph an edge goes one way only, like a one-way street. If you have not stored a graph in code before, read [how to represent a graph](/interview-question/what-is-a-graph-and-how-do-you-represent-it) first; this page uses an **adjacency list**: for each node, a list of \`(neighbour, weight)\` pairs.

📌 **Interview term: Single-source shortest path** — the problem of finding the cheapest route from one starting node (the **source**) to every other node, where the cost of a route is the sum of its edge weights.

The one operation every shortest-path algorithm is built from:

📌 **Interview term: Edge relaxation** — for an edge u → v with weight w, check whether going through u gives v a cheaper route than the best one known so far: if \`dist[u] + w < dist[v]\`, set \`dist[v] = dist[u] + w\` and remember that v's best route now comes from u.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Relaxing the edge from u to v, v drops from 12 to 8 because 3 plus 5 is smaller">
  <defs>
    <marker id="dij2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <circle class="d-box-accent" cx="120" cy="90" r="24"/>
  <text class="d-text" x="120" y="95" text-anchor="middle">u</text>
  <circle class="d-box" cx="420" cy="90" r="24"/>
  <text class="d-text" x="420" y="95" text-anchor="middle">v</text>
  <path class="d-edge-accent" d="M 144 90 L 390 90" marker-end="url(#dij2-arrow)"/>
  <text class="d-text d-accent" x="267" y="76" text-anchor="middle">weight 5</text>
  <text class="d-sub" x="120" y="150" text-anchor="middle">dist 3, settled</text>
  <text class="d-sub" x="420" y="150" text-anchor="middle">dist was 12</text>
  <rect class="d-box-accent" x="500" y="60" width="120" height="60" rx="10"/>
  <text class="d-text" x="560" y="84" text-anchor="middle">new dist 8</text>
  <text class="d-sub" x="560" y="106" text-anchor="middle">3 + 5 is less than 12</text>
</svg>

Before relaxing, the best known route to v cost 12. Node u is 3 away from the source and the edge costs 5, so going through u costs 8. Because 8 is less than 12, v's distance drops to 8. "Relax" is an old word for "loosen": the estimate for v was too high (too tight a constraint) and gets loosened down towards the truth.

Every distance starts at **infinity** (meaning "no route found yet"), except the source, which is 0. Shortest-path algorithms differ only in **which edges they relax, and in what order**.

## 4. Brute Force First

The obvious approach: list every simple route from the source to each node, add up the weights, and keep the cheapest. On a graph where each node connects to a few others, the number of routes grows exponentially with the number of nodes; 30 nodes can already have billions of routes. That is hopeless.

A smarter-sounding brute force is "relax every edge, over and over, until nothing changes". That one is actually correct (it is the Bellman-Ford algorithm) and runs in O(V × E) time, where V is the number of nodes and E the number of edges. Dijkstra's contribution is choosing a clever **order** of relaxations so that each edge only needs to be relaxed **once**.

## 5. The Core Idea: Always Finish the Closest Node Next

Dijkstra splits the nodes into two groups:

- **Settled** nodes: their shortest distance is final.
- Everyone else: they have a **tentative** distance, the best route found so far, which may still go down.

Then it repeats one step: **take the unsettled node with the smallest tentative distance, mark it settled, and relax every edge leaving it.** That is the flood from the story: the next crossroads to get wet is always the one the water reaches soonest.

📌 **Interview term: Greedy choice** — making the choice that looks best right now (here: the closest unsettled node) and never revisiting it. Dijkstra is a [greedy algorithm](/interview-question/what-is-a-greedy-algorithm) whose greedy choice can be proved safe, as long as no weight is negative.

To find "the unsettled node with the smallest tentative distance" quickly, Dijkstra keeps candidates in a **min-heap**.

📌 **Interview term: Priority queue (min-heap)** — a collection where you can add an item and remove the smallest item, each in O(log n) time. See [heap / priority queue](/interview-question/what-is-a-heap-priority-queue) for how it works inside.

Here is the graph every example on this page uses. The source is A; F has no edges pointing to it, so it can never be reached.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Example graph with six nodes A to F and weighted directed edges, F has no incoming edges">
  <defs>
    <marker id="dij1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 92 140 L 233 73" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="156" y="97" text-anchor="middle">4</text>
  <path class="d-edge" d="M 92 160 L 233 227" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="156" y="211" text-anchor="middle">2</text>
  <path class="d-edge" d="M 260 216 L 260 90" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="275" y="157" text-anchor="middle">1</text>
  <path class="d-edge" d="M 284 60 L 440 60" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="362" y="49" text-anchor="middle">5</text>
  <path class="d-edge" d="M 278 224 L 447 80" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="393" y="150" text-anchor="middle">8</text>
  <path class="d-edge" d="M 284 240 L 440 240" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="362" y="259" text-anchor="middle">10</text>
  <path class="d-edge" d="M 479 84 L 479 210" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="497" y="151" text-anchor="middle">2</text>
  <path class="d-edge" d="M 461 216 L 461 90" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="443" y="157" text-anchor="middle">1</text>
  <circle class="d-box" cx="70" cy="150" r="24"/>
  <text class="d-text" x="70" y="155" text-anchor="middle">A</text>
  <circle class="d-box" cx="260" cy="60" r="24"/>
  <text class="d-text" x="260" y="65" text-anchor="middle">B</text>
  <circle class="d-box" cx="260" cy="240" r="24"/>
  <text class="d-text" x="260" y="245" text-anchor="middle">C</text>
  <circle class="d-box" cx="470" cy="60" r="24"/>
  <text class="d-text" x="470" y="65" text-anchor="middle">D</text>
  <circle class="d-box" cx="470" cy="240" r="24"/>
  <text class="d-text" x="470" y="245" text-anchor="middle">E</text>
  <circle class="d-box-muted" cx="630" cy="150" r="24"/>
  <text class="d-text" x="630" y="155" text-anchor="middle">F</text>
</svg>

The edges are A→B 4, A→C 2, C→B 1, B→D 5, C→D 8, C→E 10, D→E 2 and E→D 1. The direct edge A→B costs 4, but A→C→B costs only 3; the direct edge C→E costs 10, but C→B→D→E costs 1 + 5 + 2 = 8 from C. A good algorithm must find both detours.

Each row of this table is one item taken out of the heap. The heap holds \`(distance, node)\` pairs; a pair whose distance is larger than the node's current best is **stale** (explained in section 7) and is skipped.

| Pop | Settled? | Edges relaxed | Heap afterwards |
| :--- | :--- | :--- | :--- |
| (0, A) | A = 0 | B: ∞ → 4, C: ∞ → 2 | (2, C) (4, B) |
| (2, C) | C = 2 | B: 4 → 3, D: ∞ → 10, E: ∞ → 12 | (3, B) (4, B) (10, D) (12, E) |
| (3, B) | B = 3 | D: 10 → 8 | (4, B) (8, D) (10, D) (12, E) |
| (4, B) | stale, skip | — | (8, D) (10, D) (12, E) |
| (8, D) | D = 8 | E: 12 → 10 | (10, D) (10, E) (12, E) |
| (10, D) | stale, skip | — | (10, E) (12, E) |
| (10, E) | E = 10 | E→D: 11 is not less than 8 | (12, E) |
| (12, E) | stale, skip | — | empty |

Eight pops, three of them stale, and F stays at infinity. Example 1 below prints exactly these numbers: \`heap pops: 8, stale entries skipped: 3\`.

📌 **Interview term: Tentative distance** — the best distance found so far for a node that is not settled yet; it can only go down.

## 6. Why It Works, and Why Negative Edges Break It

Why is it safe to declare the closest unsettled node, say u at distance d, final? Any other route to u must leave the settled group at some point and pass through some unsettled node x first. Since u was the **closest** unsettled node, x is at least d away already, and every edge after x adds a weight that is **zero or more**. So that other route costs at least d. Nothing can beat d, so d is final.

📌 **Interview term: Non-negative edge weights** — the precondition of Dijkstra's algorithm. The proof above uses it in the words "adds zero or more"; without it, the proof and the algorithm both fail.

A single negative edge breaks the argument:

<svg class="iq-diagram" width="100%" viewBox="0 0 560 230" role="img" aria-label="Negative edge trap, S to A costs 1, S to B costs 5, B to A costs minus 10">
  <defs>
    <marker id="dij3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 103 102 L 252 50" marker-end="url(#dij3-arrow)"/>
  <text class="d-sub" x="172" y="66" text-anchor="middle">1</text>
  <path class="d-edge" d="M 103 118 L 252 170" marker-end="url(#dij3-arrow)"/>
  <text class="d-sub" x="172" y="162" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 280 156 L 280 70" marker-end="url(#dij3-arrow)"/>
  <text class="d-text d-accent" x="300" y="117" text-anchor="middle">-10</text>
  <path class="d-edge" d="M 304 40 L 440 40" marker-end="url(#dij3-arrow)"/>
  <text class="d-sub" x="372" y="29" text-anchor="middle">1</text>
  <circle class="d-box" cx="80" cy="110" r="24"/>
  <text class="d-text" x="80" y="115" text-anchor="middle">S</text>
  <circle class="d-box-accent" cx="280" cy="40" r="24"/>
  <text class="d-text" x="280" y="45" text-anchor="middle">A</text>
  <circle class="d-box" cx="280" cy="180" r="24"/>
  <text class="d-text" x="280" y="185" text-anchor="middle">B</text>
  <circle class="d-box-accent" cx="470" cy="40" r="24"/>
  <text class="d-text" x="470" y="45" text-anchor="middle">T</text>
</svg>

Starting at S, the closest node is A at distance 1, so a textbook Dijkstra settles A = 1 and then T = 2. Only later does it look at B (distance 5) and discover the edge B→A costing -10, which would make A = 5 - 10 = -5. A is already settled, so the textbook version ignores it, and A and T are both wrong. Example 2 prints this:

~~~text
settled Dijkstra: S=0 A=1 B=5 T=2
Bellman-Ford:     S=0 A=-5 B=5 T=-4
wrong nodes: A, T
~~~

The "lazy" version in this page (it skips only stale heap entries and has no separate settled set) happens to fix A here, because it lets A be processed a second time; Example 2 shows A and T processed twice. But then it is no longer Dijkstra's algorithm: nodes can be re-processed many times and the O((V + E) log V) bound no longer holds. With negative weights, use [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work), which is built for them and also detects negative cycles.

Zero-weight edges are fine: "adds zero or more" still holds.

## 7. The Code in JavaScript

JavaScript has no heap or priority queue among its built-in objects (in Node 22, \`typeof PriorityQueue\` is \`"undefined"\`), so in an interview you write a small binary min-heap. It is about 35 lines and worth practising until you can type it from memory. Tell the interviewer what it is ("an array where each parent is no larger than its children; push sifts up, pop moves the last item to the top and sifts down") and that both operations are O(log n). The details are on the [heap / priority queue](/interview-question/what-is-a-heap-priority-queue) page.

Do not replace the heap with "push, then \`sort()\`": that is O(n log n) per operation instead of O(log n), and the default \`sort()\` compares elements as **strings**. Running \`[10, 9, 1].sort()\` printed:

~~~text
[ 1, 10, 9 ]
~~~

📌 **Interview term: Lazy deletion** — instead of finding and updating a node's old entry inside the heap (a "decrease-key" operation, which a simple heap does not support), push a fresh entry with the smaller distance and leave the old one. When an entry is popped, compare it with \`dist[node]\`: if it is larger, it is stale, so skip it.

The heap, comparing by distance and breaking ties by node number:

~~~javascript
// JavaScript has no built-in heap, so here is a small binary min-heap of [dist, node] pairs.
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  less(x, y) { return x[0] !== y[0] ? x[0] < y[0] : x[1] < y[1]; }
  push(item) {
    const a = this.a;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
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

~~~javascript
function dijkstra(n, edges, source) {
  const graph = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) graph[u].push([v, w]);
  const dist = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);
  dist[source] = 0;
  const heap = new MinHeap();
  heap.push([0, source]);
  let pops = 0, stale = 0;
  while (heap.size > 0) {
    const [d, u] = heap.pop();
    pops++;
    if (d > dist[u]) { stale++; continue; }   // an old, longer entry: skip it
    for (const [v, w] of graph[u]) {
      if (d + w < dist[v]) {                   // relax the edge u -> v
        dist[v] = d + w;
        parent[v] = u;
        heap.push([dist[v], v]);
      }
    }
  }
  return { dist, parent, pops, stale };
}
~~~

**Line by line:**

- \`new Array(n).fill(Infinity)\`: \`Infinity\` is a real JavaScript number, every finite number is less than it, and \`Infinity + 5\` is still \`Infinity\`, so "no route yet" needs no special case.
- Edges are destructured with \`for (const [u, v, w] of edges)\`, and the heap stores two-element arrays \`[dist, node]\`.
- \`if (d > dist[u]) { stale++; continue; }\` is the lazy-deletion check: a cheaper route to \`u\` was found after this entry was pushed.
- The relaxation \`if (d + w < dist[v])\` uses strict \`<\`, so equal-cost alternatives do not push duplicates.
- \`parent[v] = u\` remembers where the best route to \`v\` came from; following it backwards gives the route in reverse.
- \`[a[i], a[p]] = [a[p], a[i]]\` in the heap is a destructuring swap; it allocates a small array each time, which is fine for interview code (a temporary variable is faster in hot loops).
- Distances are ordinary numbers (64-bit floats). Integer sums are exact up to \`Number.MAX_SAFE_INTEGER\` (9007199254740991); beyond that, use \`BigInt\`.

## 8. Getting the Route Back

The \`parent\` array stores, for each node, the node just before it on its best route. That set of arrows forms a tree rooted at the source.

📌 **Interview term: Shortest-path tree** — the tree formed by every node's \`parent\` pointer after Dijkstra finishes; the path from the root to any node in it is a shortest path.

Walk the pointers from the target back to the source, then reverse:

~~~javascript
function pathTo(parent, v) {
  const path = [];
  for (; v !== -1; v = parent[v]) path.push(NAMES[v]);
  return path.reverse().join(" -> ");
}
~~~

The source's parent is -1, which ends the walk. An unreachable node also has parent -1 and distance infinity; check the distance first, as the examples do.

## 9. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Dijkstra with a min-heap, paths and stale entries** prints:

~~~text
A: 0 via A
B: 3 via A -> C -> B
C: 2 via A -> C
D: 8 via A -> C -> B -> D
E: 10 via A -> C -> B -> D -> E
F: unreachable
heap pops: 8, stale entries skipped: 3
one node: [0]
isolated source: [0, inf, inf]
~~~

**Example 2 — Why a negative edge breaks Dijkstra** prints:

~~~text
settled Dijkstra: S=0 A=1 B=5 T=2
Bellman-Ford:     S=0 A=-5 B=5 T=-4
wrong nodes: A, T
lazy Dijkstra:    S=0 A=-5 B=5 T=-4
times each node was processed: S=1 A=2 B=1 T=2
~~~

**What the numbers show:** Example 1 reproduces the trace table from section 5 (8 pops, 3 stale), finds both detours (B through C, and E through B and D), reports F as unreachable, and handles a one-node graph and a source with no outgoing edges. Example 2 shows the textbook version settling A and T too early when a negative edge exists, while Bellman-Ford finds the true values.

## 10. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Binary heap with lazy deletion (this page) | O((V + E) log V) | O(V + E) | each successful relaxation pushes once (at most E pushes), each push and pop is O(log E) = O(log V) because E ≤ V² |
| Array scan, no heap | O(V²) | O(V) | V times, scan all V nodes for the smallest unsettled one; best for dense graphs |
| Fibonacci heap | O(E + V log V) | O(V + E) | O(1) amortised decrease-key (Fredman and Tarjan, Journal of the ACM 34(3), 1987); mainly of theoretical interest |

The heap array can hold up to E entries (one per successful relaxation), so the space is O(V + E). Each \`[dist, node]\` pair is a small array object, which costs more memory than a primitive but keeps the code readable. For a refresher on the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 11. Edge Cases

- **Source with no outgoing edges:** only the source gets distance 0; Example 1 prints \`isolated source: [0, inf, inf]\`.
- **Unreachable node:** its distance stays infinity and its parent stays -1 (F in Example 1).
- **Single node:** the answer is \`[0]\`.
- **Zero-weight edges:** allowed; the correctness argument only needs "zero or more".
- **Parallel edges and self-loops:** harmless. Relaxation keeps the cheaper parallel edge, and a self-loop u → u with weight w ≥ 0 can never improve \`dist[u]\`.
- **Negative edges:** not allowed (section 6). **Negative cycles** make "shortest" undefined; [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work) detects them.

## Common Pitfalls

- **Using it with negative weights.** It returns wrong answers silently (Example 2). Ask about negative weights first; use Bellman-Ford if they exist.
- **"Heap" by sorting.** \`queue.push(x); queue.sort(...)\` is O(n log n) per push, and the default \`sort()\` without a comparator sorts numbers as strings (\`[ 1, 10, 9 ]\`, verified above).
- **\`queue.shift()\` as a pop.** Taking the first element of a sorted array re-indexes every remaining element; with a real heap you pop from the end of the array and sift down.
- **Forgetting the stale check.** Without \`if (d > dist[u]) continue;\`, outdated entries re-relax edges and the work can blow up.
- **Undirected graph stored one way.** For an undirected road push \`[v, w]\` into \`graph[u]\` and \`[u, w]\` into \`graph[v]\`.
- **Comparing pairs with \`<\`.** \`[3, 1] < [10, 0]\` compares the arrays as strings (\`"3,1" < "10,0"\` is false). Always compare \`a[0]\` and \`b[0]\` yourself, as \`less()\` does.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Dijkstra finds the cheapest route from one source to every node when all weights are non-negative, by always settling the unsettled node with the smallest tentative distance.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Relaxation:</strong> <span style="color:#f0e2c8;">For each edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u → v</code> with weight <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w</code>, if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[u] + w &lt; dist[v]</code> I lower <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[v]</code> and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[v] = u</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The heap:</strong> <span style="color:#f0e2c8;">JavaScript has no built-in priority queue, so I write a binary min-heap of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[dist, node]</code>. On every improvement I push a new pair, and I skip stale pairs with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if (d &gt; dist[u]) continue</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O((V + E) log V) time and O(V + E) space with a binary heap; O(V²) with a plain array scan, which is better for very dense graphs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">Negative edges break the greedy proof, so then I would use Bellman-Ford; equal weights make plain BFS enough.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not use Dijkstra with negative edges?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The proof that the closest unsettled node is final assumes every later edge adds zero or more. A negative edge can make a node cheaper after it was settled; in Example 2 a textbook Dijkstra reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A=1</code> when the true answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A=-5</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just keep a sorted array instead of writing a heap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keeping it sorted costs O(n) per insert (or O(n log n) if you call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort()</code> each time), so Dijkstra degrades to roughly O(E × V). The heap keeps push and pop at O(log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the actual path, not just the distance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[v] = u</code> whenever <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code> is relaxed through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u</code>. Walk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> back from the target and reverse. Example 1 prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A -&gt; C -&gt; B -&gt; D -&gt; E</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">You only need the distance to one target. Can you stop early?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: the moment the target is popped with a non-stale entry its distance is final, so you can return right there.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use a heap at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On a dense graph where E is close to V², scanning an array for the minimum unsettled node is O(V²) total, which beats O(V² log V). On an unweighted graph you would use a plain BFS queue.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Single-source shortest path** | cheapest route from one source to every node |
| **Edge relaxation** | if \`dist[u] + w < dist[v]\`, lower \`dist[v]\` and set \`parent[v] = u\` |
| **Greedy choice** | take the option that looks best now and never undo it |
| **Priority queue (min-heap)** | add an item or remove the smallest, each in O(log n) |
| **Tentative distance** | best distance found so far for a node not yet settled |
| **Non-negative edge weights** | every weight is zero or more; Dijkstra needs this |
| **Lazy deletion** | push a new entry instead of updating; skip stale entries when popped |
| **Shortest-path tree** | the tree of \`parent\` pointers; root-to-node paths are shortest paths |

---
**Conclusion:** Dijkstra's algorithm is a greedy flood: settle the closest unsettled node, relax its edges, repeat. In JavaScript that means writing a small binary min-heap of \`[distance, node]\` pairs (there is no built-in one), filling \`dist\` with \`Infinity\`, and skipping stale heap entries instead of updating them. It runs in O((V + E) log V) time and is correct only when no edge weight is negative; say that limit out loud, and name Bellman-Ford as the fallback. Related: [when BFS is enough](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths), [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work) for negative weights, [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work) for all pairs, and [Prim's minimum spanning tree algorithm](/interview-question/what-is-the-difference-between-kruskal-s-and-prim-s-mst-algorithms), which has the same heap-driven shape.`,
        examples: [
          { label: `Dijkstra with a min-heap, paths and stale entries`, code: `// JavaScript has no built-in heap, so here is a small binary min-heap of [dist, node] pairs.
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  less(x, y) { return x[0] !== y[0] ? x[0] < y[0] : x[1] < y[1]; }
  push(item) {
    const a = this.a;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
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

const NAMES = "ABCDEF";

function dijkstra(n, edges, source) {
  const graph = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) graph[u].push([v, w]);
  const dist = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);
  dist[source] = 0;
  const heap = new MinHeap();
  heap.push([0, source]);
  let pops = 0, stale = 0;
  while (heap.size > 0) {
    const [d, u] = heap.pop();
    pops++;
    if (d > dist[u]) { stale++; continue; }   // an old, longer entry: skip it
    for (const [v, w] of graph[u]) {
      if (d + w < dist[v]) {                   // relax the edge u -> v
        dist[v] = d + w;
        parent[v] = u;
        heap.push([dist[v], v]);
      }
    }
  }
  return { dist, parent, pops, stale };
}

function pathTo(parent, v) {
  const path = [];
  for (; v !== -1; v = parent[v]) path.push(NAMES[v]);
  return path.reverse().join(" -> ");
}

const edges = [[0, 1, 4], [0, 2, 2], [2, 1, 1], [1, 3, 5], [2, 3, 8],
  [2, 4, 10], [3, 4, 2], [4, 3, 1]];
const r = dijkstra(6, edges, 0);
for (let v = 0; v < 6; v++) {
  if (r.dist[v] === Infinity) console.log(NAMES[v] + ": unreachable");
  else console.log(NAMES[v] + ": " + r.dist[v] + " via " + pathTo(r.parent, v));
}
console.log("heap pops: " + r.pops + ", stale entries skipped: " + r.stale);

function fmt(dist) {
  return "[" + dist.map((x) => (x === Infinity ? "inf" : String(x))).join(", ") + "]";
}

// Edge cases: a one-node graph, and a source with no outgoing edges
console.log("one node: " + fmt(dijkstra(1, [], 0).dist));
console.log("isolated source: " + fmt(dijkstra(3, [[1, 2, 7]], 0).dist));` },
          { label: `Why a negative edge breaks Dijkstra`, code: `// JavaScript has no built-in heap, so here is a small binary min-heap of [dist, node] pairs.
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  less(x, y) { return x[0] !== y[0] ? x[0] < y[0] : x[1] < y[1]; }
  push(item) {
    const a = this.a;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
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

const NAMES = "SABT";
// S -> A costs 1, S -> B costs 5, B -> A costs -10 (negative!), A -> T costs 1
const EDGES = [[0, 1, 1], [0, 2, 5], [2, 1, -10], [1, 3, 1]];
const N = 4;

function build() {
  const graph = Array.from({ length: N }, () => []);
  for (const [u, v, w] of EDGES) graph[u].push([v, w]);
  return graph;
}

// Textbook Dijkstra: once a node is popped it is final and never changes.
function dijkstraSettled(source) {
  const graph = build(), dist = new Array(N).fill(Infinity), done = new Array(N).fill(false);
  dist[source] = 0;
  const heap = new MinHeap();
  heap.push([0, source]);
  while (heap.size > 0) {
    const [d, u] = heap.pop();
    if (done[u]) continue;
    done[u] = true;
    for (const [v, w] of graph[u]) {
      if (!done[v] && d + w < dist[v]) {
        dist[v] = d + w;
        heap.push([dist[v], v]);
      }
    }
  }
  return dist;
}

// Only skips stale entries, so a node can be processed again if it improves.
function dijkstraLazy(source) {
  const graph = build(), dist = new Array(N).fill(Infinity), times = new Array(N).fill(0);
  dist[source] = 0;
  const heap = new MinHeap();
  heap.push([0, source]);
  while (heap.size > 0) {
    const [d, u] = heap.pop();
    if (d > dist[u]) continue;
    times[u]++;
    for (const [v, w] of graph[u]) {
      if (d + w < dist[v]) {
        dist[v] = d + w;
        heap.push([dist[v], v]);
      }
    }
  }
  return { dist, times };
}

function bellmanFord(source) {
  const dist = new Array(N).fill(Infinity);
  dist[source] = 0;
  for (let round = 0; round < N - 1; round++)
    for (const [u, v, w] of EDGES)
      if (dist[u] !== Infinity && dist[u] + w < dist[v]) dist[v] = dist[u] + w;
  return dist;
}

const show = (dist) => dist.map((d, i) => NAMES[i] + "=" + d).join(" ");

const settled = dijkstraSettled(0);
const truth = bellmanFord(0);
const lazy = dijkstraLazy(0);
console.log("settled Dijkstra: " + show(settled));
console.log("Bellman-Ford:     " + show(truth));
console.log("wrong nodes: " + [...NAMES].filter((_, i) => settled[i] !== truth[i]).join(", "));
console.log("lazy Dijkstra:    " + show(lazy.dist));
console.log("times each node was processed: " + lazy.times.map((t, i) => NAMES[i] + "=" + t).join(" "));` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Explain how Dijkstra's algorithm finds shortest paths in a weighted graph, then implement it in Java for a graph given as an edge list. What is its complexity, and when does it give the wrong answer?"

**What a strong answer should cover:**
- The greedy rule: repeatedly settle the unsettled node with the smallest tentative distance, then relax its outgoing edges.
- Edge relaxation, \`dist\` filled with a sentinel "infinity" except the source, and a \`parent\` array to rebuild the route.
- \`java.util.PriorityQueue\` with a comparator, plus lazy deletion, because \`remove(Object)\` is linear time and there is no decrease-key.
- O((V + E) log V) time with a binary heap, O(V + E) space; why non-negative weights are required.
- Java specifics: \`long\` distances and an infinity that cannot overflow, comparing with \`Long.compare\` rather than subtraction, and boxing costs of \`PriorityQueue<Integer>\`-style code.

**Clarifying questions expected:**
- "Can weights be negative, and is the graph directed?"
- "Do you need the route itself, or only the distance? What should unreachable nodes return?"

**Code / implementation expected:** Yes — a Java \`dijkstra(n, edges, source)\` using \`PriorityQueue<long[]>\`, returning distances and parents.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph-algorithm background assumed
**Difficulty:** Hard
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a town where every road is a pipe, and the length of a pipe is how long water takes to flow through it. You pour water into the pipe network at your house, A. The water spreads out in every direction at the same speed. Now stand at each crossroads with a stopwatch: the moment water first arrives at a crossroads is exactly the length of the shortest route from your house to it. Water cannot arrive earlier by any route, because it tried every route at once.

Dijkstra's algorithm is that flood, simulated on a computer. It cannot let water flow continuously, so it does the next best thing: it keeps a list of crossroads the water is "about to reach", with the time it would arrive, and always jumps to the one that will be reached **soonest**. That crossroads is now wet for good; its arrival time is final. From there, the water starts down every pipe leaving it, which may give some other crossroads an earlier arrival time than the one written down so far.

This is what every map app, network router and game path-finder does in some form. In interviews it is the standard answer to "shortest path when edges have different costs", and it shows up in disguise in problems like network delay time, path with minimum effort, and [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops). It was published by Edsger W. Dijkstra in 1959, in a three-page paper, "A note on two problems in connexion with graphs" ([Numerische Mathematik 1, 269–271](https://doi.org/10.1007/BF01386390)).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can any edge weight be negative? | Dijkstra is only correct when every weight is zero or positive. With negative edges you need [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work). |
| Are all edges the same cost? | If every edge costs the same, plain BFS gives the same answer faster; see [when BFS is enough](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths). |
| Directed or undirected? | An undirected road is two directed edges, one each way; forgetting the second one is a classic bug. |
| One source, or distances between every pair? | One source is Dijkstra. Every pair on a small, dense graph is often [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work). |
| Do you want the distance only, or the actual route? | The route needs a \`parent\` array, which costs one extra assignment per improvement. |
| What should an unreachable node return? | Infinity, -1, or "unreachable": agree on it before you code. |

## 3. The Building Blocks

A **graph** is a set of points (**nodes** or **vertices**) joined by lines (**edges**). In a **weighted** graph every edge carries a number, its **weight**: a distance, a price, a time. In a **directed** graph an edge goes one way only, like a one-way street. If you have not stored a graph in code before, read [how to represent a graph](/interview-question/what-is-a-graph-and-how-do-you-represent-it) first; this page uses an **adjacency list**: for each node, a list of \`(neighbour, weight)\` pairs.

📌 **Interview term: Single-source shortest path** — the problem of finding the cheapest route from one starting node (the **source**) to every other node, where the cost of a route is the sum of its edge weights.

The one operation every shortest-path algorithm is built from:

📌 **Interview term: Edge relaxation** — for an edge u → v with weight w, check whether going through u gives v a cheaper route than the best one known so far: if \`dist[u] + w < dist[v]\`, set \`dist[v] = dist[u] + w\` and remember that v's best route now comes from u.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Relaxing the edge from u to v, v drops from 12 to 8 because 3 plus 5 is smaller">
  <defs>
    <marker id="dij2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <circle class="d-box-accent" cx="120" cy="90" r="24"/>
  <text class="d-text" x="120" y="95" text-anchor="middle">u</text>
  <circle class="d-box" cx="420" cy="90" r="24"/>
  <text class="d-text" x="420" y="95" text-anchor="middle">v</text>
  <path class="d-edge-accent" d="M 144 90 L 390 90" marker-end="url(#dij2-arrow)"/>
  <text class="d-text d-accent" x="267" y="76" text-anchor="middle">weight 5</text>
  <text class="d-sub" x="120" y="150" text-anchor="middle">dist 3, settled</text>
  <text class="d-sub" x="420" y="150" text-anchor="middle">dist was 12</text>
  <rect class="d-box-accent" x="500" y="60" width="120" height="60" rx="10"/>
  <text class="d-text" x="560" y="84" text-anchor="middle">new dist 8</text>
  <text class="d-sub" x="560" y="106" text-anchor="middle">3 + 5 is less than 12</text>
</svg>

Before relaxing, the best known route to v cost 12. Node u is 3 away from the source and the edge costs 5, so going through u costs 8. Because 8 is less than 12, v's distance drops to 8. "Relax" is an old word for "loosen": the estimate for v was too high (too tight a constraint) and gets loosened down towards the truth.

Every distance starts at **infinity** (meaning "no route found yet"), except the source, which is 0. Shortest-path algorithms differ only in **which edges they relax, and in what order**.

## 4. Brute Force First

The obvious approach: list every simple route from the source to each node, add up the weights, and keep the cheapest. On a graph where each node connects to a few others, the number of routes grows exponentially with the number of nodes; 30 nodes can already have billions of routes. That is hopeless.

A smarter-sounding brute force is "relax every edge, over and over, until nothing changes". That one is actually correct (it is the Bellman-Ford algorithm) and runs in O(V × E) time, where V is the number of nodes and E the number of edges. Dijkstra's contribution is choosing a clever **order** of relaxations so that each edge only needs to be relaxed **once**.

## 5. The Core Idea: Always Finish the Closest Node Next

Dijkstra splits the nodes into two groups:

- **Settled** nodes: their shortest distance is final.
- Everyone else: they have a **tentative** distance, the best route found so far, which may still go down.

Then it repeats one step: **take the unsettled node with the smallest tentative distance, mark it settled, and relax every edge leaving it.** That is the flood from the story: the next crossroads to get wet is always the one the water reaches soonest.

📌 **Interview term: Greedy choice** — making the choice that looks best right now (here: the closest unsettled node) and never revisiting it. Dijkstra is a [greedy algorithm](/interview-question/what-is-a-greedy-algorithm) whose greedy choice can be proved safe, as long as no weight is negative.

To find "the unsettled node with the smallest tentative distance" quickly, Dijkstra keeps candidates in a **min-heap**.

📌 **Interview term: Priority queue (min-heap)** — a collection where you can add an item and remove the smallest item, each in O(log n) time. See [heap / priority queue](/interview-question/what-is-a-heap-priority-queue) for how it works inside.

Here is the graph every example on this page uses. The source is A; F has no edges pointing to it, so it can never be reached.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Example graph with six nodes A to F and weighted directed edges, F has no incoming edges">
  <defs>
    <marker id="dij1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 92 140 L 233 73" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="156" y="97" text-anchor="middle">4</text>
  <path class="d-edge" d="M 92 160 L 233 227" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="156" y="211" text-anchor="middle">2</text>
  <path class="d-edge" d="M 260 216 L 260 90" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="275" y="157" text-anchor="middle">1</text>
  <path class="d-edge" d="M 284 60 L 440 60" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="362" y="49" text-anchor="middle">5</text>
  <path class="d-edge" d="M 278 224 L 447 80" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="393" y="150" text-anchor="middle">8</text>
  <path class="d-edge" d="M 284 240 L 440 240" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="362" y="259" text-anchor="middle">10</text>
  <path class="d-edge" d="M 479 84 L 479 210" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="497" y="151" text-anchor="middle">2</text>
  <path class="d-edge" d="M 461 216 L 461 90" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="443" y="157" text-anchor="middle">1</text>
  <circle class="d-box" cx="70" cy="150" r="24"/>
  <text class="d-text" x="70" y="155" text-anchor="middle">A</text>
  <circle class="d-box" cx="260" cy="60" r="24"/>
  <text class="d-text" x="260" y="65" text-anchor="middle">B</text>
  <circle class="d-box" cx="260" cy="240" r="24"/>
  <text class="d-text" x="260" y="245" text-anchor="middle">C</text>
  <circle class="d-box" cx="470" cy="60" r="24"/>
  <text class="d-text" x="470" y="65" text-anchor="middle">D</text>
  <circle class="d-box" cx="470" cy="240" r="24"/>
  <text class="d-text" x="470" y="245" text-anchor="middle">E</text>
  <circle class="d-box-muted" cx="630" cy="150" r="24"/>
  <text class="d-text" x="630" y="155" text-anchor="middle">F</text>
</svg>

The edges are A→B 4, A→C 2, C→B 1, B→D 5, C→D 8, C→E 10, D→E 2 and E→D 1. The direct edge A→B costs 4, but A→C→B costs only 3; the direct edge C→E costs 10, but C→B→D→E costs 1 + 5 + 2 = 8 from C. A good algorithm must find both detours.

Each row of this table is one item taken out of the heap. The heap holds \`(distance, node)\` pairs; a pair whose distance is larger than the node's current best is **stale** (explained in section 7) and is skipped.

| Pop | Settled? | Edges relaxed | Heap afterwards |
| :--- | :--- | :--- | :--- |
| (0, A) | A = 0 | B: ∞ → 4, C: ∞ → 2 | (2, C) (4, B) |
| (2, C) | C = 2 | B: 4 → 3, D: ∞ → 10, E: ∞ → 12 | (3, B) (4, B) (10, D) (12, E) |
| (3, B) | B = 3 | D: 10 → 8 | (4, B) (8, D) (10, D) (12, E) |
| (4, B) | stale, skip | — | (8, D) (10, D) (12, E) |
| (8, D) | D = 8 | E: 12 → 10 | (10, D) (10, E) (12, E) |
| (10, D) | stale, skip | — | (10, E) (12, E) |
| (10, E) | E = 10 | E→D: 11 is not less than 8 | (12, E) |
| (12, E) | stale, skip | — | empty |

Eight pops, three of them stale, and F stays at infinity. Example 1 below prints exactly these numbers: \`heap pops: 8, stale entries skipped: 3\`.

📌 **Interview term: Tentative distance** — the best distance found so far for a node that is not settled yet; it can only go down.

## 6. Why It Works, and Why Negative Edges Break It

Why is it safe to declare the closest unsettled node, say u at distance d, final? Any other route to u must leave the settled group at some point and pass through some unsettled node x first. Since u was the **closest** unsettled node, x is at least d away already, and every edge after x adds a weight that is **zero or more**. So that other route costs at least d. Nothing can beat d, so d is final.

📌 **Interview term: Non-negative edge weights** — the precondition of Dijkstra's algorithm. The proof above uses it in the words "adds zero or more"; without it, the proof and the algorithm both fail.

A single negative edge breaks the argument:

<svg class="iq-diagram" width="100%" viewBox="0 0 560 230" role="img" aria-label="Negative edge trap, S to A costs 1, S to B costs 5, B to A costs minus 10">
  <defs>
    <marker id="dij3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 103 102 L 252 50" marker-end="url(#dij3-arrow)"/>
  <text class="d-sub" x="172" y="66" text-anchor="middle">1</text>
  <path class="d-edge" d="M 103 118 L 252 170" marker-end="url(#dij3-arrow)"/>
  <text class="d-sub" x="172" y="162" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 280 156 L 280 70" marker-end="url(#dij3-arrow)"/>
  <text class="d-text d-accent" x="300" y="117" text-anchor="middle">-10</text>
  <path class="d-edge" d="M 304 40 L 440 40" marker-end="url(#dij3-arrow)"/>
  <text class="d-sub" x="372" y="29" text-anchor="middle">1</text>
  <circle class="d-box" cx="80" cy="110" r="24"/>
  <text class="d-text" x="80" y="115" text-anchor="middle">S</text>
  <circle class="d-box-accent" cx="280" cy="40" r="24"/>
  <text class="d-text" x="280" y="45" text-anchor="middle">A</text>
  <circle class="d-box" cx="280" cy="180" r="24"/>
  <text class="d-text" x="280" y="185" text-anchor="middle">B</text>
  <circle class="d-box-accent" cx="470" cy="40" r="24"/>
  <text class="d-text" x="470" y="45" text-anchor="middle">T</text>
</svg>

Starting at S, the closest node is A at distance 1, so a textbook Dijkstra settles A = 1 and then T = 2. Only later does it look at B (distance 5) and discover the edge B→A costing -10, which would make A = 5 - 10 = -5. A is already settled, so the textbook version ignores it, and A and T are both wrong. Example 2 prints this:

~~~text
settled Dijkstra: S=0 A=1 B=5 T=2
Bellman-Ford:     S=0 A=-5 B=5 T=-4
wrong nodes: A, T
~~~

The "lazy" version in this page (it skips only stale heap entries and has no separate settled set) happens to fix A here, because it lets A be processed a second time; Example 2 shows A and T processed twice. But then it is no longer Dijkstra's algorithm: nodes can be re-processed many times and the O((V + E) log V) bound no longer holds. With negative weights, use [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work), which is built for them and also detects negative cycles.

Zero-weight edges are fine: "adds zero or more" still holds.

## 7. The Code in Java

Java's \`java.util.PriorityQueue\` is a binary heap whose head is the **least** element according to the comparator. The Javadoc's implementation note gives O(log n) for \`offer\`, \`poll\`, \`remove()\` and \`add\`, **linear time** for \`remove(Object)\` and \`contains(Object)\`, and constant time for \`peek\` ([PriorityQueue Javadoc](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/PriorityQueue.html)). So "find the old entry and update it" is O(n); we use lazy deletion instead.

📌 **Interview term: Lazy deletion** — instead of removing and re-inserting a node's old entry (O(n) in \`PriorityQueue\`), offer a fresh entry with the smaller distance and leave the old one. When an entry is polled, compare it with \`dist[node]\`: if it is larger, it is stale, so skip it.

Each heap entry here is a \`long[] {distance, node}\`. The comparator uses \`Long.compare\`, **never** \`a[0] - b[0]\`: subtraction overflows. Comparing \`Integer.MAX_VALUE\` with \`-1\` by subtraction printed:

~~~text
subtraction comparator says: -2147483648
Integer.compare: 1
~~~

The subtraction claims the huge value is smaller, which corrupts the heap order. Distances are \`long\`, and "infinity" is \`Long.MAX_VALUE\`; we never add a weight to it because the relaxation only runs from a node that was popped with a real distance.

~~~java
static long[] dijkstra(int n, int[][] edges, int source) {
    List<List<int[]>> graph = new ArrayList<>();
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    for (int[] e : edges) graph.get(e[0]).add(new int[]{e[1], e[2]});
    long[] dist = new long[n];
    Arrays.fill(dist, INF);
    parent = new int[n];
    Arrays.fill(parent, -1);
    dist[source] = 0;
    // min-heap of {distance, node}; compare with Long.compare, never by subtraction
    PriorityQueue<long[]> heap = new PriorityQueue<>((a, b) ->
            a[0] != b[0] ? Long.compare(a[0], b[0]) : Long.compare(a[1], b[1]));
    heap.offer(new long[]{0, source});
    pops = 0;
    stale = 0;
    while (!heap.isEmpty()) {
        long[] top = heap.poll();
        pops++;
        long d = top[0];
        int u = (int) top[1];
        if (d > dist[u]) { stale++; continue; }   // an old, longer entry: skip it
        for (int[] e : graph.get(u)) {
            int v = e[0], w = e[1];
            if (d + w < dist[v]) {                   // relax the edge u -> v
                dist[v] = d + w;
                parent[v] = u;
                heap.offer(new long[]{dist[v], v});
            }
        }
    }
    return dist;
}
~~~

**Line by line:**

- \`List<List<int[]>> graph\` is the adjacency list: for each node, a list of \`{neighbour, weight}\` arrays. Primitive arrays avoid creating an \`Integer\` object per number.
- \`Arrays.fill(dist, INF)\` with \`INF = Long.MAX_VALUE\`. The check \`d + w < dist[v]\` is safe because \`d\` is always a real distance (it came out of the heap); \`INF + w\` would overflow to a negative number.
- \`heap.poll()\` removes the closest entry. \`if (d > dist[u]) { stale++; continue; }\` is the lazy-deletion check.
- The relaxation uses strict \`<\` so equal-cost alternatives do not offer duplicates.
- \`parent[v] = u\` remembers where the best route came from.
- \`(int) top[1]\` converts the node id back from \`long\`; storing both in one \`long[]\` keeps the comparator simple.

## 8. Getting the Route Back

The \`parent\` array stores, for each node, the node just before it on its best route. That set of arrows forms a tree rooted at the source.

📌 **Interview term: Shortest-path tree** — the tree formed by every node's \`parent\` pointer after Dijkstra finishes; the path from the root to any node in it is a shortest path.

Walk the pointers from the target back to the source, then reverse:

~~~java
static String pathTo(int v) {
    List<String> path = new ArrayList<>();
    for (; v != -1; v = parent[v]) path.add(String.valueOf(NAMES.charAt(v)));
    Collections.reverse(path);
    return String.join(" -> ", path);
}
~~~

The source's parent is -1, which ends the walk. An unreachable node also has parent -1 and distance infinity; check the distance first, as the examples do.

## 9. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Dijkstra with a min-heap, paths and stale entries** prints:

~~~text
A: 0 via A
B: 3 via A -> C -> B
C: 2 via A -> C
D: 8 via A -> C -> B -> D
E: 10 via A -> C -> B -> D -> E
F: unreachable
heap pops: 8, stale entries skipped: 3
one node: [0]
isolated source: [0, inf, inf]
~~~

**Example 2 — Why a negative edge breaks Dijkstra** prints:

~~~text
settled Dijkstra: S=0 A=1 B=5 T=2
Bellman-Ford:     S=0 A=-5 B=5 T=-4
wrong nodes: A, T
lazy Dijkstra:    S=0 A=-5 B=5 T=-4
times each node was processed: S=1 A=2 B=1 T=2
~~~

**What the numbers show:** Example 1 reproduces the trace table from section 5 (8 pops, 3 stale), finds both detours (B through C, and E through B and D), reports F as unreachable, and handles a one-node graph and a source with no outgoing edges. Example 2 shows the textbook version settling A and T too early when a negative edge exists, while Bellman-Ford finds the true values.

## 10. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Binary heap with lazy deletion (this page) | O((V + E) log V) | O(V + E) | each successful relaxation pushes once (at most E pushes), each push and pop is O(log E) = O(log V) because E ≤ V² |
| Array scan, no heap | O(V²) | O(V) | V times, scan all V nodes for the smallest unsettled one; best for dense graphs |
| Fibonacci heap | O(E + V log V) | O(V + E) | O(1) amortised decrease-key (Fredman and Tarjan, Journal of the ACM 34(3), 1987); mainly of theoretical interest |

\`PriorityQueue\` can hold up to E entries at once (one per successful relaxation), so space is O(V + E). Each entry is a small \`long[]\` object; for very large graphs you can pack distance and node into one \`long\` to avoid the allocations. For a refresher on the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 11. Edge Cases

- **Source with no outgoing edges:** only the source gets distance 0; Example 1 prints \`isolated source: [0, inf, inf]\`.
- **Unreachable node:** its distance stays infinity and its parent stays -1 (F in Example 1).
- **Single node:** the answer is \`[0]\`.
- **Zero-weight edges:** allowed; the correctness argument only needs "zero or more".
- **Parallel edges and self-loops:** harmless. Relaxation keeps the cheaper parallel edge, and a self-loop u → u with weight w ≥ 0 can never improve \`dist[u]\`.
- **Negative edges:** not allowed (section 6). **Negative cycles** make "shortest" undefined; [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work) detects them.

## Common Pitfalls

- **Using it with negative weights.** It returns wrong answers silently (Example 2). Ask about negative weights first; use Bellman-Ford if they exist.
- **Subtraction comparators.** \`(a, b) -> a[0] - b[0]\` overflows for large values (\`-2147483648\` above) and breaks the heap. Use \`Long.compare\` / \`Integer.compare\` or \`Comparator.comparingLong\`.
- **\`int\` distances and \`Integer.MAX_VALUE\` as infinity.** \`Integer.MAX_VALUE + 1\` is \`-2147483648\` (verified), so one careless relaxation makes an unreachable node look like the cheapest. Use \`long\`, and only relax from popped nodes.
- **\`heap.remove(node)\` to "update" a distance.** It is linear time in \`PriorityQueue\`; lazy deletion is the standard workaround.
- **Comparing boxed distances with \`==\`.** If distances live in \`List<Integer>\` or \`Map<Integer, Integer>\`, \`==\` compares references; it happens to work for small values because of the \`Integer\` cache and fails above 127 (\`Integer p = 128, q = 128; p == q\` printed \`false\`). Use primitives or \`.equals\`.
- **Undirected graph stored one way.** Add the edge to both endpoints' lists.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Dijkstra finds the cheapest route from one source to every node when all weights are non-negative, by always settling the unsettled node with the smallest tentative distance.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Relaxation:</strong> <span style="color:#f0e2c8;">For each edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u → v</code> with weight <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w</code>, if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[u] + w &lt; dist[v]</code> I lower <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[v]</code> and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[v] = u</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The heap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue&lt;long[]&gt;</code> ordered with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Long.compare</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove(Object)</code> is linear, so I offer a new entry on every improvement and skip stale ones with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if (d &gt; dist[u]) continue</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O((V + E) log V) time and O(V + E) space with a binary heap; O(V²) with a plain array scan, which is better for very dense graphs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> distances with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Long.MAX_VALUE</code> as infinity, never add to infinity, and never write a subtraction comparator.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not use Dijkstra with negative edges?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The proof that the closest unsettled node is final assumes every later edge adds zero or more. A negative edge can make a node cheaper after it was settled; in Example 2 a textbook Dijkstra reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A=1</code> when the true answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A=-5</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">heap.remove()</code> and re-insert when a distance improves?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue.remove(Object)</code> is linear time, so each update would cost O(V). Lazy deletion keeps every heap operation O(log n) at the price of up to E entries in the heap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long[]</code> entries and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Long.compare</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Path sums can exceed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> range, and a subtraction comparator overflows. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Long.compare</code> is always correct, and primitive arrays avoid boxing every number into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the actual path?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[v] = u</code> on each successful relaxation, walk back from the target, and reverse. Example 1 prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A -&gt; C -&gt; B -&gt; D -&gt; E</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use a heap at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On a dense graph where E is close to V², an O(V) array scan for the minimum per step gives O(V²) total, which beats O(V² log V). On an unweighted graph a BFS with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> is enough.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Single-source shortest path** | cheapest route from one source to every node |
| **Edge relaxation** | if \`dist[u] + w < dist[v]\`, lower \`dist[v]\` and set \`parent[v] = u\` |
| **Greedy choice** | take the option that looks best now and never undo it |
| **Priority queue (min-heap)** | add an item or remove the smallest, each in O(log n) |
| **Tentative distance** | best distance found so far for a node not yet settled |
| **Non-negative edge weights** | every weight is zero or more; Dijkstra needs this |
| **Lazy deletion** | push a new entry instead of updating; skip stale entries when popped |
| **Shortest-path tree** | the tree of \`parent\` pointers; root-to-node paths are shortest paths |

---
**Conclusion:** Dijkstra's algorithm is a greedy flood: settle the closest unsettled node, relax its edges, repeat. In Java that is a \`PriorityQueue<long[]>\` ordered with \`Long.compare\`, \`long\` distances with \`Long.MAX_VALUE\` as infinity, and lazy deletion because \`remove(Object)\` is linear. It runs in O((V + E) log V) time and is correct only when no edge weight is negative; say that limit out loud, and name Bellman-Ford as the fallback. Related: [when BFS is enough](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths), [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work) for negative weights, [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work) for all pairs, and [Prim's minimum spanning tree algorithm](/interview-question/what-is-the-difference-between-kruskal-s-and-prim-s-mst-algorithms), which has the same heap-driven shape.`,
        examples: [
          { label: `Dijkstra with a min-heap, paths and stale entries`, code: `import java.util.*;

public class Main {
    static final long INF = Long.MAX_VALUE;
    static final String NAMES = "ABCDEF";
    static int pops, stale;
    static int[] parent;

    static long[] dijkstra(int n, int[][] edges, int source) {
        List<List<int[]>> graph = new ArrayList<>();
        for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
        for (int[] e : edges) graph.get(e[0]).add(new int[]{e[1], e[2]});
        long[] dist = new long[n];
        Arrays.fill(dist, INF);
        parent = new int[n];
        Arrays.fill(parent, -1);
        dist[source] = 0;
        // min-heap of {distance, node}; compare with Long.compare, never by subtraction
        PriorityQueue<long[]> heap = new PriorityQueue<>((a, b) ->
                a[0] != b[0] ? Long.compare(a[0], b[0]) : Long.compare(a[1], b[1]));
        heap.offer(new long[]{0, source});
        pops = 0;
        stale = 0;
        while (!heap.isEmpty()) {
            long[] top = heap.poll();
            pops++;
            long d = top[0];
            int u = (int) top[1];
            if (d > dist[u]) { stale++; continue; }   // an old, longer entry: skip it
            for (int[] e : graph.get(u)) {
                int v = e[0], w = e[1];
                if (d + w < dist[v]) {                   // relax the edge u -> v
                    dist[v] = d + w;
                    parent[v] = u;
                    heap.offer(new long[]{dist[v], v});
                }
            }
        }
        return dist;
    }

    static String pathTo(int v) {
        List<String> path = new ArrayList<>();
        for (; v != -1; v = parent[v]) path.add(String.valueOf(NAMES.charAt(v)));
        Collections.reverse(path);
        return String.join(" -> ", path);
    }

    static String fmt(long[] dist) {
        StringJoiner sj = new StringJoiner(", ", "[", "]");
        for (long x : dist) sj.add(x == INF ? "inf" : String.valueOf(x));
        return sj.toString();
    }

    public static void main(String[] args) {
        int[][] edges = {{0, 1, 4}, {0, 2, 2}, {2, 1, 1}, {1, 3, 5}, {2, 3, 8},
                {2, 4, 10}, {3, 4, 2}, {4, 3, 1}};
        long[] dist = dijkstra(6, edges, 0);
        for (int v = 0; v < 6; v++) {
            if (dist[v] == INF) System.out.println(NAMES.charAt(v) + ": unreachable");
            else System.out.println(NAMES.charAt(v) + ": " + dist[v] + " via " + pathTo(v));
        }
        System.out.println("heap pops: " + pops + ", stale entries skipped: " + stale);

        // Edge cases: a one-node graph, and a source with no outgoing edges
        System.out.println("one node: " + fmt(dijkstra(1, new int[][]{}, 0)));
        System.out.println("isolated source: " + fmt(dijkstra(3, new int[][]{{1, 2, 7}}, 0)));
    }
}` },
          { label: `Why a negative edge breaks Dijkstra`, code: `import java.util.*;

public class Main {
    static final long INF = Long.MAX_VALUE;
    static final String NAMES = "SABT";
    // S -> A costs 1, S -> B costs 5, B -> A costs -10 (negative!), A -> T costs 1
    static final int[][] EDGES = {{0, 1, 1}, {0, 2, 5}, {2, 1, -10}, {1, 3, 1}};
    static final int N = 4;
    static int[] times = new int[N];

    static List<List<int[]>> build() {
        List<List<int[]>> graph = new ArrayList<>();
        for (int i = 0; i < N; i++) graph.add(new ArrayList<>());
        for (int[] e : EDGES) graph.get(e[0]).add(new int[]{e[1], e[2]});
        return graph;
    }

    static PriorityQueue<long[]> newHeap() {
        return new PriorityQueue<>((a, b) -> a[0] != b[0] ? Long.compare(a[0], b[0]) : Long.compare(a[1], b[1]));
    }

    // Textbook Dijkstra: once a node is popped it is final and never changes.
    static long[] dijkstraSettled(int source) {
        List<List<int[]>> graph = build();
        long[] dist = new long[N];
        Arrays.fill(dist, INF);
        boolean[] done = new boolean[N];
        dist[source] = 0;
        PriorityQueue<long[]> heap = newHeap();
        heap.offer(new long[]{0, source});
        while (!heap.isEmpty()) {
            long[] top = heap.poll();
            long d = top[0];
            int u = (int) top[1];
            if (done[u]) continue;
            done[u] = true;
            for (int[] e : graph.get(u)) {
                if (!done[e[0]] && d + e[1] < dist[e[0]]) {
                    dist[e[0]] = d + e[1];
                    heap.offer(new long[]{dist[e[0]], e[0]});
                }
            }
        }
        return dist;
    }

    // Only skips stale entries, so a node can be processed again if it improves.
    static long[] dijkstraLazy(int source) {
        List<List<int[]>> graph = build();
        long[] dist = new long[N];
        Arrays.fill(dist, INF);
        dist[source] = 0;
        PriorityQueue<long[]> heap = newHeap();
        heap.offer(new long[]{0, source});
        while (!heap.isEmpty()) {
            long[] top = heap.poll();
            long d = top[0];
            int u = (int) top[1];
            if (d > dist[u]) continue;
            times[u]++;
            for (int[] e : graph.get(u)) {
                if (d + e[1] < dist[e[0]]) {
                    dist[e[0]] = d + e[1];
                    heap.offer(new long[]{dist[e[0]], e[0]});
                }
            }
        }
        return dist;
    }

    static long[] bellmanFord(int source) {
        long[] dist = new long[N];
        Arrays.fill(dist, INF);
        dist[source] = 0;
        for (int round = 0; round < N - 1; round++)
            for (int[] e : EDGES)
                if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]]) dist[e[1]] = dist[e[0]] + e[2];
        return dist;
    }

    static String show(long[] dist) {
        StringJoiner sj = new StringJoiner(" ");
        for (int i = 0; i < N; i++) sj.add(NAMES.charAt(i) + "=" + dist[i]);
        return sj.toString();
    }

    public static void main(String[] args) {
        long[] settled = dijkstraSettled(0);
        long[] truth = bellmanFord(0);
        long[] lazy = dijkstraLazy(0);
        System.out.println("settled Dijkstra: " + show(settled));
        System.out.println("Bellman-Ford:     " + show(truth));
        StringJoiner wrong = new StringJoiner(", ");
        for (int i = 0; i < N; i++) if (settled[i] != truth[i]) wrong.add(String.valueOf(NAMES.charAt(i)));
        System.out.println("wrong nodes: " + wrong);
        System.out.println("lazy Dijkstra:    " + show(lazy));
        StringJoiner t = new StringJoiner(" ");
        for (int i = 0; i < N; i++) t.add(NAMES.charAt(i) + "=" + times[i]);
        System.out.println("times each node was processed: " + t);
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Explain how Dijkstra's algorithm finds shortest paths in a weighted graph, then implement it in C++ for a graph given as an edge list. What is its complexity, and when does it give the wrong answer?"

**What a strong answer should cover:**
- The greedy rule: repeatedly settle the unsettled node with the smallest tentative distance, then relax its outgoing edges.
- Edge relaxation, \`dist\` filled with a sentinel "infinity" except the source, and a \`parent\` vector to rebuild the route.
- \`std::priority_queue\` turned into a min-heap with \`std::greater\`, plus lazy deletion because it has no decrease-key.
- O((V + E) log V) time with a binary heap, O(V + E) space; why non-negative weights are required.
- C++ specifics: \`std::priority_queue\` is a max-heap by default, \`long long\` distances, and that \`INF + w\` on a signed type is undefined behaviour.

**Clarifying questions expected:**
- "Can weights be negative, and is the graph directed?"
- "Do you need the route itself, or only the distance? What should unreachable nodes return?"

**Code / implementation expected:** Yes — a C++ \`dijkstra(n, edges, source)\` with \`priority_queue<pair<long long,int>, vector<...>, greater<>>\`, returning distances and parents.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph-algorithm background assumed
**Difficulty:** Hard
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a town where every road is a pipe, and the length of a pipe is how long water takes to flow through it. You pour water into the pipe network at your house, A. The water spreads out in every direction at the same speed. Now stand at each crossroads with a stopwatch: the moment water first arrives at a crossroads is exactly the length of the shortest route from your house to it. Water cannot arrive earlier by any route, because it tried every route at once.

Dijkstra's algorithm is that flood, simulated on a computer. It cannot let water flow continuously, so it does the next best thing: it keeps a list of crossroads the water is "about to reach", with the time it would arrive, and always jumps to the one that will be reached **soonest**. That crossroads is now wet for good; its arrival time is final. From there, the water starts down every pipe leaving it, which may give some other crossroads an earlier arrival time than the one written down so far.

This is what every map app, network router and game path-finder does in some form. In interviews it is the standard answer to "shortest path when edges have different costs", and it shows up in disguise in problems like network delay time, path with minimum effort, and [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops). It was published by Edsger W. Dijkstra in 1959, in a three-page paper, "A note on two problems in connexion with graphs" ([Numerische Mathematik 1, 269–271](https://doi.org/10.1007/BF01386390)).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can any edge weight be negative? | Dijkstra is only correct when every weight is zero or positive. With negative edges you need [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work). |
| Are all edges the same cost? | If every edge costs the same, plain BFS gives the same answer faster; see [when BFS is enough](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths). |
| Directed or undirected? | An undirected road is two directed edges, one each way; forgetting the second one is a classic bug. |
| One source, or distances between every pair? | One source is Dijkstra. Every pair on a small, dense graph is often [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work). |
| Do you want the distance only, or the actual route? | The route needs a \`parent\` array, which costs one extra assignment per improvement. |
| What should an unreachable node return? | Infinity, -1, or "unreachable": agree on it before you code. |

## 3. The Building Blocks

A **graph** is a set of points (**nodes** or **vertices**) joined by lines (**edges**). In a **weighted** graph every edge carries a number, its **weight**: a distance, a price, a time. In a **directed** graph an edge goes one way only, like a one-way street. If you have not stored a graph in code before, read [how to represent a graph](/interview-question/what-is-a-graph-and-how-do-you-represent-it) first; this page uses an **adjacency list**: for each node, a list of \`(neighbour, weight)\` pairs.

📌 **Interview term: Single-source shortest path** — the problem of finding the cheapest route from one starting node (the **source**) to every other node, where the cost of a route is the sum of its edge weights.

The one operation every shortest-path algorithm is built from:

📌 **Interview term: Edge relaxation** — for an edge u → v with weight w, check whether going through u gives v a cheaper route than the best one known so far: if \`dist[u] + w < dist[v]\`, set \`dist[v] = dist[u] + w\` and remember that v's best route now comes from u.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Relaxing the edge from u to v, v drops from 12 to 8 because 3 plus 5 is smaller">
  <defs>
    <marker id="dij2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <circle class="d-box-accent" cx="120" cy="90" r="24"/>
  <text class="d-text" x="120" y="95" text-anchor="middle">u</text>
  <circle class="d-box" cx="420" cy="90" r="24"/>
  <text class="d-text" x="420" y="95" text-anchor="middle">v</text>
  <path class="d-edge-accent" d="M 144 90 L 390 90" marker-end="url(#dij2-arrow)"/>
  <text class="d-text d-accent" x="267" y="76" text-anchor="middle">weight 5</text>
  <text class="d-sub" x="120" y="150" text-anchor="middle">dist 3, settled</text>
  <text class="d-sub" x="420" y="150" text-anchor="middle">dist was 12</text>
  <rect class="d-box-accent" x="500" y="60" width="120" height="60" rx="10"/>
  <text class="d-text" x="560" y="84" text-anchor="middle">new dist 8</text>
  <text class="d-sub" x="560" y="106" text-anchor="middle">3 + 5 is less than 12</text>
</svg>

Before relaxing, the best known route to v cost 12. Node u is 3 away from the source and the edge costs 5, so going through u costs 8. Because 8 is less than 12, v's distance drops to 8. "Relax" is an old word for "loosen": the estimate for v was too high (too tight a constraint) and gets loosened down towards the truth.

Every distance starts at **infinity** (meaning "no route found yet"), except the source, which is 0. Shortest-path algorithms differ only in **which edges they relax, and in what order**.

## 4. Brute Force First

The obvious approach: list every simple route from the source to each node, add up the weights, and keep the cheapest. On a graph where each node connects to a few others, the number of routes grows exponentially with the number of nodes; 30 nodes can already have billions of routes. That is hopeless.

A smarter-sounding brute force is "relax every edge, over and over, until nothing changes". That one is actually correct (it is the Bellman-Ford algorithm) and runs in O(V × E) time, where V is the number of nodes and E the number of edges. Dijkstra's contribution is choosing a clever **order** of relaxations so that each edge only needs to be relaxed **once**.

## 5. The Core Idea: Always Finish the Closest Node Next

Dijkstra splits the nodes into two groups:

- **Settled** nodes: their shortest distance is final.
- Everyone else: they have a **tentative** distance, the best route found so far, which may still go down.

Then it repeats one step: **take the unsettled node with the smallest tentative distance, mark it settled, and relax every edge leaving it.** That is the flood from the story: the next crossroads to get wet is always the one the water reaches soonest.

📌 **Interview term: Greedy choice** — making the choice that looks best right now (here: the closest unsettled node) and never revisiting it. Dijkstra is a [greedy algorithm](/interview-question/what-is-a-greedy-algorithm) whose greedy choice can be proved safe, as long as no weight is negative.

To find "the unsettled node with the smallest tentative distance" quickly, Dijkstra keeps candidates in a **min-heap**.

📌 **Interview term: Priority queue (min-heap)** — a collection where you can add an item and remove the smallest item, each in O(log n) time. See [heap / priority queue](/interview-question/what-is-a-heap-priority-queue) for how it works inside.

Here is the graph every example on this page uses. The source is A; F has no edges pointing to it, so it can never be reached.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Example graph with six nodes A to F and weighted directed edges, F has no incoming edges">
  <defs>
    <marker id="dij1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 92 140 L 233 73" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="156" y="97" text-anchor="middle">4</text>
  <path class="d-edge" d="M 92 160 L 233 227" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="156" y="211" text-anchor="middle">2</text>
  <path class="d-edge" d="M 260 216 L 260 90" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="275" y="157" text-anchor="middle">1</text>
  <path class="d-edge" d="M 284 60 L 440 60" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="362" y="49" text-anchor="middle">5</text>
  <path class="d-edge" d="M 278 224 L 447 80" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="393" y="150" text-anchor="middle">8</text>
  <path class="d-edge" d="M 284 240 L 440 240" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="362" y="259" text-anchor="middle">10</text>
  <path class="d-edge" d="M 479 84 L 479 210" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="497" y="151" text-anchor="middle">2</text>
  <path class="d-edge" d="M 461 216 L 461 90" marker-end="url(#dij1-arrow)"/>
  <text class="d-sub" x="443" y="157" text-anchor="middle">1</text>
  <circle class="d-box" cx="70" cy="150" r="24"/>
  <text class="d-text" x="70" y="155" text-anchor="middle">A</text>
  <circle class="d-box" cx="260" cy="60" r="24"/>
  <text class="d-text" x="260" y="65" text-anchor="middle">B</text>
  <circle class="d-box" cx="260" cy="240" r="24"/>
  <text class="d-text" x="260" y="245" text-anchor="middle">C</text>
  <circle class="d-box" cx="470" cy="60" r="24"/>
  <text class="d-text" x="470" y="65" text-anchor="middle">D</text>
  <circle class="d-box" cx="470" cy="240" r="24"/>
  <text class="d-text" x="470" y="245" text-anchor="middle">E</text>
  <circle class="d-box-muted" cx="630" cy="150" r="24"/>
  <text class="d-text" x="630" y="155" text-anchor="middle">F</text>
</svg>

The edges are A→B 4, A→C 2, C→B 1, B→D 5, C→D 8, C→E 10, D→E 2 and E→D 1. The direct edge A→B costs 4, but A→C→B costs only 3; the direct edge C→E costs 10, but C→B→D→E costs 1 + 5 + 2 = 8 from C. A good algorithm must find both detours.

Each row of this table is one item taken out of the heap. The heap holds \`(distance, node)\` pairs; a pair whose distance is larger than the node's current best is **stale** (explained in section 7) and is skipped.

| Pop | Settled? | Edges relaxed | Heap afterwards |
| :--- | :--- | :--- | :--- |
| (0, A) | A = 0 | B: ∞ → 4, C: ∞ → 2 | (2, C) (4, B) |
| (2, C) | C = 2 | B: 4 → 3, D: ∞ → 10, E: ∞ → 12 | (3, B) (4, B) (10, D) (12, E) |
| (3, B) | B = 3 | D: 10 → 8 | (4, B) (8, D) (10, D) (12, E) |
| (4, B) | stale, skip | — | (8, D) (10, D) (12, E) |
| (8, D) | D = 8 | E: 12 → 10 | (10, D) (10, E) (12, E) |
| (10, D) | stale, skip | — | (10, E) (12, E) |
| (10, E) | E = 10 | E→D: 11 is not less than 8 | (12, E) |
| (12, E) | stale, skip | — | empty |

Eight pops, three of them stale, and F stays at infinity. Example 1 below prints exactly these numbers: \`heap pops: 8, stale entries skipped: 3\`.

📌 **Interview term: Tentative distance** — the best distance found so far for a node that is not settled yet; it can only go down.

## 6. Why It Works, and Why Negative Edges Break It

Why is it safe to declare the closest unsettled node, say u at distance d, final? Any other route to u must leave the settled group at some point and pass through some unsettled node x first. Since u was the **closest** unsettled node, x is at least d away already, and every edge after x adds a weight that is **zero or more**. So that other route costs at least d. Nothing can beat d, so d is final.

📌 **Interview term: Non-negative edge weights** — the precondition of Dijkstra's algorithm. The proof above uses it in the words "adds zero or more"; without it, the proof and the algorithm both fail.

A single negative edge breaks the argument:

<svg class="iq-diagram" width="100%" viewBox="0 0 560 230" role="img" aria-label="Negative edge trap, S to A costs 1, S to B costs 5, B to A costs minus 10">
  <defs>
    <marker id="dij3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 103 102 L 252 50" marker-end="url(#dij3-arrow)"/>
  <text class="d-sub" x="172" y="66" text-anchor="middle">1</text>
  <path class="d-edge" d="M 103 118 L 252 170" marker-end="url(#dij3-arrow)"/>
  <text class="d-sub" x="172" y="162" text-anchor="middle">5</text>
  <path class="d-edge-accent" d="M 280 156 L 280 70" marker-end="url(#dij3-arrow)"/>
  <text class="d-text d-accent" x="300" y="117" text-anchor="middle">-10</text>
  <path class="d-edge" d="M 304 40 L 440 40" marker-end="url(#dij3-arrow)"/>
  <text class="d-sub" x="372" y="29" text-anchor="middle">1</text>
  <circle class="d-box" cx="80" cy="110" r="24"/>
  <text class="d-text" x="80" y="115" text-anchor="middle">S</text>
  <circle class="d-box-accent" cx="280" cy="40" r="24"/>
  <text class="d-text" x="280" y="45" text-anchor="middle">A</text>
  <circle class="d-box" cx="280" cy="180" r="24"/>
  <text class="d-text" x="280" y="185" text-anchor="middle">B</text>
  <circle class="d-box-accent" cx="470" cy="40" r="24"/>
  <text class="d-text" x="470" y="45" text-anchor="middle">T</text>
</svg>

Starting at S, the closest node is A at distance 1, so a textbook Dijkstra settles A = 1 and then T = 2. Only later does it look at B (distance 5) and discover the edge B→A costing -10, which would make A = 5 - 10 = -5. A is already settled, so the textbook version ignores it, and A and T are both wrong. Example 2 prints this:

~~~text
settled Dijkstra: S=0 A=1 B=5 T=2
Bellman-Ford:     S=0 A=-5 B=5 T=-4
wrong nodes: A, T
~~~

The "lazy" version in this page (it skips only stale heap entries and has no separate settled set) happens to fix A here, because it lets A be processed a second time; Example 2 shows A and T processed twice. But then it is no longer Dijkstra's algorithm: nodes can be re-processed many times and the O((V + E) log V) bound no longer holds. With negative weights, use [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work), which is built for them and also detects negative cycles.

Zero-weight edges are fine: "adds zero or more" still holds.

## 7. The Code in C++

C++ gives you \`std::priority_queue\` in \`<queue>\`, an adaptor over a \`vector\` that keeps a binary heap. By default its comparator is \`std::less\`, which makes \`top()\` the **largest** element; passing \`std::greater\` makes the smallest element appear at \`top()\` ([cppreference: std::priority_queue](https://en.cppreference.com/w/cpp/container/priority_queue)). Pushing 3, 1, 2 and printing \`top()\` showed both:

~~~text
3
1
~~~

(the first line from the default queue, the second from the one declared with \`std::greater<int>\`). \`push\` and \`pop\` are O(log n); there is no way to change the priority of an element already inside.

📌 **Interview term: Lazy deletion** — instead of updating a node's old entry inside the heap (a "decrease-key" operation, which \`std::priority_queue\` does not offer), push a fresh entry with the smaller distance and leave the old one. When an entry is popped, compare it with \`dist[node]\`: if it is larger, it is stale, so skip it.

Entries are \`pair<long long, int>\` = (distance, node). Pairs compare lexicographically, so the heap orders by distance and breaks ties by node id.

~~~cpp
vector<long long> dijkstra(int n, const vector<tuple<int, int, int>>& edges, int source) {
    vector<vector<pair<int, int>>> graph(n);
    for (auto [u, v, w] : edges) graph[u].push_back({v, w});
    vector<long long> dist(n, INF);
    parent.assign(n, -1);
    dist[source] = 0;
    // std::priority_queue is a max-heap; std::greater turns it into a min-heap
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>> heap;
    heap.push({0, source});
    pops = stale = 0;
    while (!heap.empty()) {
        auto [d, u] = heap.top();
        heap.pop();
        pops++;
        if (d > dist[u]) { stale++; continue; }   // an old, longer entry: skip it
        for (auto [v, w] : graph[u]) {
            if (d + w < dist[v]) {                   // relax the edge u -> v
                dist[v] = d + w;
                parent[v] = u;
                heap.push({dist[v], v});
            }
        }
    }
    return dist;
}
~~~

**Line by line:**

- \`vector<vector<pair<int, int>>> graph(n)\` is the adjacency list. \`for (auto [u, v, w] : edges)\` uses C++17 structured bindings to unpack each tuple.
- \`INF = numeric_limits<long long>::max()\`. We never compute \`INF + w\`: the relaxation runs only from a node popped with a real distance. Signed overflow is undefined behaviour in C++, so that rule is not optional.
- \`greater<>\` (the transparent form of \`std::greater\`) turns the max-heap into a min-heap. \`heap.top()\` reads the closest entry and \`heap.pop()\` removes it; \`pop()\` returns nothing, so read first.
- \`if (d > dist[u]) { stale++; continue; }\` is the lazy-deletion check.
- The relaxation uses strict \`<\` so equal-cost alternatives do not push duplicates.
- \`parent[v] = u\` records where the best route came from.

## 8. Getting the Route Back

The \`parent\` array stores, for each node, the node just before it on its best route. That set of arrows forms a tree rooted at the source.

📌 **Interview term: Shortest-path tree** — the tree formed by every node's \`parent\` pointer after Dijkstra finishes; the path from the root to any node in it is a shortest path.

Walk the pointers from the target back to the source, then reverse:

~~~cpp
string pathTo(int v) {
    vector<string> path;
    for (; v != -1; v = parent[v]) path.push_back(string(1, NAMES[v]));
    reverse(path.begin(), path.end());
    string s;
    for (size_t i = 0; i < path.size(); i++) s += (i ? " -> " : "") + path[i];
    return s;
}
~~~

The source's parent is -1, which ends the walk. An unreachable node also has parent -1 and distance infinity; check the distance first, as the examples do.

## 9. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Dijkstra with a min-heap, paths and stale entries** prints:

~~~text
A: 0 via A
B: 3 via A -> C -> B
C: 2 via A -> C
D: 8 via A -> C -> B -> D
E: 10 via A -> C -> B -> D -> E
F: unreachable
heap pops: 8, stale entries skipped: 3
one node: [0]
isolated source: [0, inf, inf]
~~~

**Example 2 — Why a negative edge breaks Dijkstra** prints:

~~~text
settled Dijkstra: S=0 A=1 B=5 T=2
Bellman-Ford:     S=0 A=-5 B=5 T=-4
wrong nodes: A, T
lazy Dijkstra:    S=0 A=-5 B=5 T=-4
times each node was processed: S=1 A=2 B=1 T=2
~~~

**What the numbers show:** Example 1 reproduces the trace table from section 5 (8 pops, 3 stale), finds both detours (B through C, and E through B and D), reports F as unreachable, and handles a one-node graph and a source with no outgoing edges. Example 2 shows the textbook version settling A and T too early when a negative edge exists, while Bellman-Ford finds the true values.

## 10. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Binary heap with lazy deletion (this page) | O((V + E) log V) | O(V + E) | each successful relaxation pushes once (at most E pushes), each push and pop is O(log E) = O(log V) because E ≤ V² |
| Array scan, no heap | O(V²) | O(V) | V times, scan all V nodes for the smallest unsettled one; best for dense graphs |
| Fibonacci heap | O(E + V log V) | O(V + E) | O(1) amortised decrease-key (Fredman and Tarjan, Journal of the ACM 34(3), 1987); mainly of theoretical interest |

The heap's underlying \`vector\` can hold up to E entries at once (one per successful relaxation), so space is O(V + E). \`pair<long long, int>\` is a plain value type, so there is no per-entry heap allocation. For a refresher on the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 11. Edge Cases

- **Source with no outgoing edges:** only the source gets distance 0; Example 1 prints \`isolated source: [0, inf, inf]\`.
- **Unreachable node:** its distance stays infinity and its parent stays -1 (F in Example 1).
- **Single node:** the answer is \`[0]\`.
- **Zero-weight edges:** allowed; the correctness argument only needs "zero or more".
- **Parallel edges and self-loops:** harmless. Relaxation keeps the cheaper parallel edge, and a self-loop u → u with weight w ≥ 0 can never improve \`dist[u]\`.
- **Negative edges:** not allowed (section 6). **Negative cycles** make "shortest" undefined; [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work) detects them.

## Common Pitfalls

- **Using it with negative weights.** It returns wrong answers silently (Example 2). Ask about negative weights first; use Bellman-Ford if they exist.
- **Forgetting \`greater<>\`.** The default \`priority_queue\` is a max-heap, so it would always expand the *farthest* node: the answers come out wrong, and no compiler warning tells you.
- **\`INT_MAX\` as infinity with \`int\` distances.** \`INT_MAX + w\` is signed overflow, which is undefined behaviour. Use \`long long\`, and never add to an unreachable distance. (A common competitive-programming trick is \`0x3f3f3f3f\` = 1061109567, whose double 2122219134 still fits in an \`int\`.)
- **Reading \`top()\` after \`pop()\`.** \`pop()\` returns \`void\`; copy \`top()\` first, as the structured binding \`auto [d, u] = heap.top();\` does.
- **Keeping a reference to \`top()\` across \`pop()\`.** \`const auto& t = heap.top(); heap.pop();\` leaves a dangling reference; copy the pair by value.
- **Undirected graph stored one way.** Push the edge into both endpoints' lists.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Dijkstra finds the cheapest route from one source to every node when all weights are non-negative, by always settling the unsettled node with the smallest tentative distance.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Relaxation:</strong> <span style="color:#f0e2c8;">For each edge <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">u → v</code> with weight <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w</code>, if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[u] + w &lt; dist[v]</code> I lower <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[v]</code> and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[v] = u</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The heap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue&lt;pair&lt;long long,int&gt;, vector&lt;...&gt;, greater&lt;&gt;&gt;</code>, because the default is a max-heap. No decrease-key, so I push on every improvement and skip stale entries with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if (d &gt; dist[u]) continue</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O((V + E) log V) time and O(V + E) space with a binary heap; O(V²) with a plain array scan, which is better for very dense graphs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> distances, never compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INF + w</code> because signed overflow is undefined behaviour, and copy <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not use Dijkstra with negative edges?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The proof that the closest unsettled node is final assumes every later edge adds zero or more. A negative edge can make a node cheaper after it was settled; in Example 2 a textbook Dijkstra reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A=1</code> when the true answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A=-5</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::set</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">priority_queue</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set&lt;pair&lt;long long,int&gt;&gt;</code> supports real decrease-key (erase the old pair, insert the new one, both O(log n)), so the container never holds stale entries. It has a larger constant factor; the lazy <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue</code> is the more common interview answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you forget <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">greater&lt;&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code> returns the largest distance, so the algorithm settles the farthest node first and the results are wrong. It compiles and runs without any warning.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return the actual path?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent[v] = u</code> on each successful relaxation, walk back from the target, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::reverse</code>. Example 1 prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A -&gt; C -&gt; B -&gt; D -&gt; E</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use a heap at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On a dense graph where E is close to V², an O(V) scan for the minimum per step gives O(V²) total, which beats O(V² log V). On an unweighted graph a BFS with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code> is enough.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Single-source shortest path** | cheapest route from one source to every node |
| **Edge relaxation** | if \`dist[u] + w < dist[v]\`, lower \`dist[v]\` and set \`parent[v] = u\` |
| **Greedy choice** | take the option that looks best now and never undo it |
| **Priority queue (min-heap)** | add an item or remove the smallest, each in O(log n) |
| **Tentative distance** | best distance found so far for a node not yet settled |
| **Non-negative edge weights** | every weight is zero or more; Dijkstra needs this |
| **Lazy deletion** | push a new entry instead of updating; skip stale entries when popped |
| **Shortest-path tree** | the tree of \`parent\` pointers; root-to-node paths are shortest paths |

---
**Conclusion:** Dijkstra's algorithm is a greedy flood: settle the closest unsettled node, relax its edges, repeat. In C++ that is a \`std::priority_queue\` of \`(distance, node)\` pairs with \`greater<>\` (the default is a max-heap), \`long long\` distances, and lazy deletion because there is no decrease-key. It runs in O((V + E) log V) time and is correct only when no edge weight is negative; say that limit out loud, and name Bellman-Ford as the fallback. Related: [when BFS is enough](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths), [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work) for negative weights, [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work) for all pairs, and [Prim's minimum spanning tree algorithm](/interview-question/what-is-the-difference-between-kruskal-s-and-prim-s-mst-algorithms), which has the same heap-driven shape.`,
        examples: [
          { label: `Dijkstra with a min-heap, paths and stale entries`, code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <limits>
#include <queue>
#include <string>
#include <tuple>
#include <utility>
#include <vector>
using namespace std;

const long long INF = numeric_limits<long long>::max();
const string NAMES = "ABCDEF";
int pops, stale;
vector<int> parent;

vector<long long> dijkstra(int n, const vector<tuple<int, int, int>>& edges, int source) {
    vector<vector<pair<int, int>>> graph(n);
    for (auto [u, v, w] : edges) graph[u].push_back({v, w});
    vector<long long> dist(n, INF);
    parent.assign(n, -1);
    dist[source] = 0;
    // std::priority_queue is a max-heap; std::greater turns it into a min-heap
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>> heap;
    heap.push({0, source});
    pops = stale = 0;
    while (!heap.empty()) {
        auto [d, u] = heap.top();
        heap.pop();
        pops++;
        if (d > dist[u]) { stale++; continue; }   // an old, longer entry: skip it
        for (auto [v, w] : graph[u]) {
            if (d + w < dist[v]) {                   // relax the edge u -> v
                dist[v] = d + w;
                parent[v] = u;
                heap.push({dist[v], v});
            }
        }
    }
    return dist;
}

string pathTo(int v) {
    vector<string> path;
    for (; v != -1; v = parent[v]) path.push_back(string(1, NAMES[v]));
    reverse(path.begin(), path.end());
    string s;
    for (size_t i = 0; i < path.size(); i++) s += (i ? " -> " : "") + path[i];
    return s;
}

string fmt(const vector<long long>& dist) {
    string s = "[";
    for (size_t i = 0; i < dist.size(); i++)
        s += (i ? ", " : "") + (dist[i] == INF ? string("inf") : to_string(dist[i]));
    return s + "]";
}

int main() {
    vector<tuple<int, int, int>> edges = {{0, 1, 4}, {0, 2, 2}, {2, 1, 1}, {1, 3, 5}, {2, 3, 8},
                                          {2, 4, 10}, {3, 4, 2}, {4, 3, 1}};
    vector<long long> dist = dijkstra(6, edges, 0);
    for (int v = 0; v < 6; v++) {
        if (dist[v] == INF) cout << NAMES[v] << ": unreachable\\n";
        else cout << NAMES[v] << ": " << dist[v] << " via " << pathTo(v) << "\\n";
    }
    cout << "heap pops: " << pops << ", stale entries skipped: " << stale << "\\n";

    // Edge cases: a one-node graph, and a source with no outgoing edges
    cout << "one node: " << fmt(dijkstra(1, {}, 0)) << "\\n";
    cout << "isolated source: " << fmt(dijkstra(3, {{1, 2, 7}}, 0)) << "\\n";
}` },
          { label: `Why a negative edge breaks Dijkstra`, code: `#include <functional>
#include <iostream>
#include <limits>
#include <queue>
#include <string>
#include <utility>
#include <vector>
using namespace std;

const long long INF = numeric_limits<long long>::max();
const string NAMES = "SABT";
const int N = 4;
// S -> A costs 1, S -> B costs 5, B -> A costs -10 (negative!), A -> T costs 1
const vector<vector<int>> EDGES = {{0, 1, 1}, {0, 2, 5}, {2, 1, -10}, {1, 3, 1}};
using Item = pair<long long, int>;
using MinHeap = priority_queue<Item, vector<Item>, greater<Item>>;

vector<vector<pair<int, int>>> build() {
    vector<vector<pair<int, int>>> graph(N);
    for (const auto& e : EDGES) graph[e[0]].push_back({e[1], e[2]});
    return graph;
}

// Textbook Dijkstra: once a node is popped it is final and never changes.
vector<long long> dijkstraSettled(int source) {
    auto graph = build();
    vector<long long> dist(N, INF);
    vector<bool> done(N, false);
    dist[source] = 0;
    MinHeap heap;
    heap.push({0, source});
    while (!heap.empty()) {
        auto [d, u] = heap.top();
        heap.pop();
        if (done[u]) continue;
        done[u] = true;
        for (auto [v, w] : graph[u])
            if (!done[v] && d + w < dist[v]) {
                dist[v] = d + w;
                heap.push({dist[v], v});
            }
    }
    return dist;
}

// Only skips stale entries, so a node can be processed again if it improves.
vector<long long> dijkstraLazy(int source, vector<int>& times) {
    auto graph = build();
    vector<long long> dist(N, INF);
    dist[source] = 0;
    MinHeap heap;
    heap.push({0, source});
    while (!heap.empty()) {
        auto [d, u] = heap.top();
        heap.pop();
        if (d > dist[u]) continue;
        times[u]++;
        for (auto [v, w] : graph[u])
            if (d + w < dist[v]) {
                dist[v] = d + w;
                heap.push({dist[v], v});
            }
    }
    return dist;
}

vector<long long> bellmanFord(int source) {
    vector<long long> dist(N, INF);
    dist[source] = 0;
    for (int round = 0; round < N - 1; round++)
        for (const auto& e : EDGES)
            if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]]) dist[e[1]] = dist[e[0]] + e[2];
    return dist;
}

string show(const vector<long long>& dist) {
    string s;
    for (int i = 0; i < N; i++) s += (i ? " " : "") + string(1, NAMES[i]) + "=" + to_string(dist[i]);
    return s;
}

int main() {
    auto settled = dijkstraSettled(0);
    auto truth = bellmanFord(0);
    vector<int> times(N, 0);
    auto lazy = dijkstraLazy(0, times);
    cout << "settled Dijkstra: " << show(settled) << "\\n";
    cout << "Bellman-Ford:     " << show(truth) << "\\n";
    string wrong;
    for (int i = 0; i < N; i++)
        if (settled[i] != truth[i]) wrong += (wrong.empty() ? "" : ", ") + string(1, NAMES[i]);
    cout << "wrong nodes: " << wrong << "\\n";
    cout << "lazy Dijkstra:    " << show(lazy) << "\\n";
    cout << "times each node was processed:";
    for (int i = 0; i < N; i++) cout << " " << NAMES[i] << "=" << times[i];
    cout << "\\n";
}` },
        ],
      },
    },
  },
  {
    title: `How does the Bellman-Ford algorithm work?`,
    difficulty: "hard",
    seoDescription: `Bellman-Ford in Python, JavaScript, Java and C++: relax every edge V-1 times, handle negative weights, detect and print negative cycles, verified code.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"How does the Bellman-Ford algorithm work? Implement it in Python for a directed graph given as an edge list that may contain negative weights, and tell me how you would detect a negative cycle."

**What a strong answer should cover:**
- Relax every edge V - 1 times; why V - 1 (a shortest simple path has at most V - 1 edges) and the round invariant.
- Negative-cycle detection with one extra round, and how to recover the cycle by walking \`parent\` V times.
- O(V × E) time and O(V) extra space; early exit when a round changes nothing; comparison with Dijkstra.
- Only cycles reachable from the source are detected, and the virtual-source trick to find any cycle.
- Python specifics: \`float("inf")\` absorbs additions so \`inf + (-5)\` stays \`inf\`, but still guard \`dist[u] != INF\` for clarity; iterate a list of \`(u, v, w)\` tuples; \`any()\` for the detection pass.

**Clarifying questions expected:**
- "Can there be a negative cycle, and should I report it or print it?"
- "Is there a limit on the number of edges in a path?"

**Code / implementation expected:** Yes — a Python \`bellman_ford(n, edges, source)\` returning distances and a negative-cycle flag, ideally with early exit.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph-algorithm background assumed
**Difficulty:** Hard
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A group of travel agents each know only the direct ticket prices out of their own city. Every morning, each agent phones the agents in the cities they fly to and says: "I can get a traveller from home to my city for X; add your ticket price and see if that beats what you have." That is one **round**. After the first morning, everyone one flight away from home knows a price. After the second morning, everyone two flights away does, and so on. If there are n cities, no sensible route uses more than n - 1 flights, so after n - 1 mornings every agent knows the cheapest price, whatever order the calls were made in.

Now add a twist: some routes come with **cashback** (a negative cost). The morning calls still work. But suppose there is a loop of three cities whose tickets, cashback included, add up to less than zero. A traveller could fly the loop forever and get paid every time: the "cheapest price" keeps falling, morning after morning, and never settles. The agents notice that something is still changing on morning n, and that is the alarm.

That is the Bellman-Ford algorithm: simple rounds of "relax every edge", correct even with negative edge weights, and able to detect a **negative cycle**. It is slower than [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work), but it works where Dijkstra fails. The same rounds-of-gossip idea runs real networks: RFC 2453 describes the RIP routing protocol as "based on the Bellman-Ford (or distance vector) algorithm" ([RFC 2453](https://www.rfc-editor.org/rfc/rfc2453)). The algorithm is named after Richard Bellman, who published it in "On a routing problem" (Quarterly of Applied Mathematics 16, 1958), and Lester Ford Jr.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can weights be negative? | If not, [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) is much faster: O((V + E) log V) instead of O(V × E). |
| Can there be a negative cycle, and what should happen then? | Shortest distances are undefined through it. Usually you report "negative cycle", sometimes you must print the cycle. |
| Should I detect any negative cycle, or only one reachable from the source? | A plain run from the source only sees reachable cycles. For any cycle, start every node at distance 0 (a virtual source). |
| Is there a limit on the number of edges (stops) in a path? | Then you need the round-by-round variant that relaxes from a copy of the previous round, as in [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops). |
| How big is the graph? | O(V × E) is fine for thousands of edges, too slow for millions. |

## 3. The Core Idea: Relax Every Edge, V - 1 Times

Every shortest-path algorithm is built from **edge relaxation** (defined on the [Dijkstra page](/interview-question/how-does-dijkstra-s-algorithm-work)): for an edge u → v with weight w, if \`dist[u] + w < dist[v]\`, lower \`dist[v]\` to \`dist[u] + w\`. Dijkstra relaxes edges in a clever order so each edge is relaxed once. Bellman-Ford does not try to be clever: it relaxes **every edge**, in any order, and repeats that whole pass V - 1 times, where V is the number of nodes.

📌 **Interview term: Bellman-Ford algorithm** — single-source shortest paths that allows negative edge weights: start with \`dist[source] = 0\` and every other distance infinite, then relax all E edges, V - 1 times. O(V × E) time.

Why V - 1 rounds? A shortest path never needs to repeat a node (if there is no negative cycle, a repeated node means a loop you could cut out without making the path more expensive). A path with no repeated node visits at most V nodes, so it has at most **V - 1 edges**.

📌 **Interview term: Round invariant** — after round k, every node whose shortest path uses at most k edges already has its correct distance. Round 1 fixes the first edge of every path, round 2 the second, and so on.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 130" role="img" aria-label="Rounds of Bellman-Ford, after round k every shortest path with at most k edges is correct, an extra round checks for negative cycles">
  <defs>
    <marker id="bf2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="120" height="70" rx="10"/>
  <text class="d-text" x="80" y="59" text-anchor="middle">round 1</text>
  <text class="d-sub" x="80" y="81" text-anchor="middle">up to 1 edge</text>
  <rect class="d-box" x="170" y="30" width="120" height="70" rx="10"/>
  <text class="d-text" x="230" y="59" text-anchor="middle">round 2</text>
  <text class="d-sub" x="230" y="81" text-anchor="middle">up to 2 edges</text>
  <rect class="d-box" x="320" y="30" width="120" height="70" rx="10"/>
  <text class="d-text" x="380" y="59" text-anchor="middle">round 3</text>
  <text class="d-sub" x="380" y="81" text-anchor="middle">up to 3 edges</text>
  <rect class="d-box" x="470" y="30" width="120" height="70" rx="10"/>
  <text class="d-text" x="530" y="59" text-anchor="middle">round 4</text>
  <text class="d-sub" x="530" y="81" text-anchor="middle">up to 4 edges</text>
  <rect class="d-box-accent" x="620" y="30" width="140" height="70" rx="10"/>
  <text class="d-text" x="690" y="59" text-anchor="middle">extra round</text>
  <text class="d-sub" x="690" y="81" text-anchor="middle">change means cycle</text>
  <path class="d-edge" d="M 144 65 L 164 65" marker-end="url(#bf2-arrow)"/>
  <path class="d-edge" d="M 294 65 L 314 65" marker-end="url(#bf2-arrow)"/>
  <path class="d-edge" d="M 444 65 L 464 65" marker-end="url(#bf2-arrow)"/>
  <path class="d-edge" d="M 594 65 L 614 65" marker-end="url(#bf2-arrow)"/>
</svg>

Why does round k fix the k-th edge? Take a shortest path S → x1 → x2 → … → v. By the invariant, after round k - 1 the node just before v already has its correct distance. During round k the pass relaxes every edge, including the last edge of this path, so v gets its correct distance too. The order of edges inside a round does not matter for correctness; it only decides whether you get lucky and finish early.

📌 **Interview term: Early exit** — if a whole round changes nothing, no later round can change anything either (every round reads the same distances and would make the same no-op checks), so you can stop.

## 4. Walking Through an Example

The examples use this graph, with source S. The chain S → A → B → C → D is the cheapest way to everything; the long edges are tempting but more expensive shortcuts, and B → C has a negative weight.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="Example graph S A B C D in a row, chain edges S to A 1, A to B 3, B to C minus 1, C to D 2, plus longer shortcut edges">
  <defs>
    <marker id="bf1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 84 170 L 180 170" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="132" y="159" text-anchor="middle">1</text>
  <path class="d-edge" d="M 234 170 L 330 170" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="282" y="159" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 384 170 L 480 170" marker-end="url(#bf1-arrow)"/>
  <text class="d-text d-accent" x="432" y="159" text-anchor="middle">-1</text>
  <path class="d-edge" d="M 534 170 L 630 170" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="582" y="159" text-anchor="middle">2</text>
  <path class="d-edge" d="M 60 146 L 60 110 L 350 110 L 350 140" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="200" y="102" text-anchor="middle">6</text>
  <path class="d-edge" d="M 220 146 L 220 50 L 660 50 L 660 140" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="450" y="42" text-anchor="middle">9</text>
  <path class="d-edge" d="M 60 194 L 60 260 L 510 260 L 510 200" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="290" y="280" text-anchor="middle">10</text>
  <circle class="d-box" cx="60" cy="170" r="24"/>
  <text class="d-text" x="60" y="175" text-anchor="middle">S</text>
  <circle class="d-box" cx="210" cy="170" r="24"/>
  <text class="d-text" x="210" y="175" text-anchor="middle">A</text>
  <circle class="d-box" cx="360" cy="170" r="24"/>
  <text class="d-text" x="360" y="175" text-anchor="middle">B</text>
  <circle class="d-box" cx="510" cy="170" r="24"/>
  <text class="d-text" x="510" y="175" text-anchor="middle">C</text>
  <circle class="d-box" cx="660" cy="170" r="24"/>
  <text class="d-text" x="660" y="175" text-anchor="middle">D</text>
</svg>

The direct edges are S→A 1, S→B 6, S→C 10, A→B 3, A→D 9, B→C -1 and C→D 2. True answers: A = 1, B = 1 + 3 = 4, C = 4 - 1 = 3, D = 3 + 2 = 5.

**Worst order.** Example 1 first lists the edges from the far end back towards S: C→D, B→C, A→B, S→A, then the shortcuts. In round 1 the chain edges are relaxed before their start node has a distance, so only S's own edges and A→D do anything. Each round moves the correct value one step further along the chain:

| After round | S | A | B | C | D |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 0 | 1 | 6 | 10 | 10 |
| 2 | 0 | 1 | 4 | 5 | 10 |
| 3 | 0 | 1 | 4 | 3 | 7 |
| 4 | 0 | 1 | 4 | 3 | 5 |

That needed all V - 1 = 4 rounds. **Good order.** Listing the same edges outward from S (S's edges first, then A's, then B's, then C's), the first round already settles everything, because each edge is relaxed after its start node got its final value. Round 2 changes nothing, so the loop stops early:

~~~text
round 1: S=0 A=1 B=4 C=3 D=5
round 2: S=0 A=1 B=4 C=3 D=5
rounds used: 2, successful relaxations: 7, negative cycle: false
~~~

Notice something subtle in that good-order run: after round 1, D = 5 already, through a path of **four** edges. Because relaxations happen in place, a single round can push a value along several edges. That is harmless for plain shortest paths (values only get closer to the truth), but it breaks problems that limit the number of edges, such as [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops); there, each round must read from a **copy** of the previous round's distances.

If you sort the edges by a topological order of a DAG (a directed graph with no cycles), one round is always enough; that is the "shortest path in a DAG" trick.

## 5. Negative Cycles: Detecting Them and Printing One

📌 **Interview term: Negative cycle** — a cycle whose edge weights add up to less than zero. Going around it once more always makes the path cheaper, so nodes reachable from it have no shortest distance (it is minus infinity).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 290" role="img" aria-label="Negative cycle A to B to C and back to A with total cost minus 1, reachable from S, and D hangs off C">
  <defs>
    <marker id="bf3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 94 140 L 210 140" marker-end="url(#bf3-arrow)"/>
  <text class="d-sub" x="152" y="129" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 261 128 L 374 65" marker-end="url(#bf3-arrow)"/>
  <text class="d-text d-accent" x="310" y="87" text-anchor="middle">2</text>
  <path class="d-edge-accent" d="M 400 74 L 400 200" marker-end="url(#bf3-arrow)"/>
  <text class="d-text d-accent" x="420" y="141" text-anchor="middle">-4</text>
  <path class="d-edge-accent" d="M 379 218 L 266 155" marker-end="url(#bf3-arrow)"/>
  <text class="d-text d-accent" x="315" y="204" text-anchor="middle">1</text>
  <path class="d-edge" d="M 424 230 L 550 230" marker-end="url(#bf3-arrow)"/>
  <text class="d-sub" x="487" y="219" text-anchor="middle">1</text>
  <circle class="d-box" cx="70" cy="140" r="24"/>
  <text class="d-text" x="70" y="145" text-anchor="middle">S</text>
  <circle class="d-box-accent" cx="240" cy="140" r="24"/>
  <text class="d-text" x="240" y="145" text-anchor="middle">A</text>
  <circle class="d-box-accent" cx="400" cy="50" r="24"/>
  <text class="d-text" x="400" y="55" text-anchor="middle">B</text>
  <circle class="d-box-accent" cx="400" cy="230" r="24"/>
  <text class="d-text" x="400" y="235" text-anchor="middle">C</text>
  <circle class="d-box" cx="580" cy="230" r="24"/>
  <text class="d-text" x="580" y="235" text-anchor="middle">D</text>
</svg>

Here A → B → C → A costs 2 - 4 + 1 = -1. Every lap lowers the distances of A, B, C, and of D, which hangs off C.

**Detection.** If there is no reachable negative cycle, all distances are final after V - 1 rounds. So run **one more round**: if any edge can still be relaxed, a negative cycle is reachable from the source.

**Finding the cycle.** Keep a \`parent\` array (who last improved each node). In the extra round, remember the last node \`x\` that improved. \`x\` is either on the cycle or downstream of it. Walk \`x = parent[x]\` V times: that is enough steps to be sure you are standing on the cycle. Then follow \`parent\` from there until you come back to the same node, collecting the nodes, and reverse the list. Example 2 prints:

~~~text
graph 1 negative cycle reachable: true
cycle: B -> C -> A -> B
cycle cost: -1
~~~

The cycle is printed starting from B because that is where the walk landed; it is the same cycle as A → B → C → A.

**Only reachable cycles.** Bellman-Ford from a source never relaxes an edge whose start is still at infinity, so a negative cycle the source cannot reach is invisible, and that is correct: it does not affect any distance from the source. Example 2's second graph has a negative cycle X ↔ Y that S cannot reach:

~~~text
graph 2 negative cycle reachable: false
graph 2 distances: S=0 A=1 X=inf Y=inf
~~~

To find **any** negative cycle in the whole graph, start every node at distance 0 instead of infinity. That is the same as adding a virtual source with a 0-weight edge to every node.

📌 **Interview term: Arbitrage detection** — the classic application: with currency exchange rates as edges, use weight \`-log(rate)\`. A cycle of trades that multiplies your money (product of rates greater than 1) becomes a cycle whose weights sum to less than 0, which Bellman-Ford detects.

## 6. The Code in Python

The edges are a plain list of \`(u, v, w)\` tuples; Bellman-Ford never needs an adjacency list because every round looks at every edge. Unreachable distances are \`float("inf")\`. In Python, \`inf + w\` is still \`inf\` for any finite \`w\` (running \`float("inf") - 3\` printed \`inf\`), so the guard \`dist[u] != INF\` is not needed for correctness, but it makes the intent explicit and skips useless work.

~~~python
def bellman_ford(n, edges, source, trace):
    dist = [INF] * n
    parent = [-1] * n
    dist[source] = 0
    relaxations = 0
    for rnd in range(1, n):                      # at most n - 1 rounds
        changed = False
        for u, v, w in edges:
            if dist[u] != INF and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                parent[v] = u
                relaxations += 1
                changed = True
        if trace:
            print("round " + str(rnd) + ": " + show(dist))
        if not changed:                          # nothing moved: we are done early
            return dist, parent, rnd, relaxations, False
    # one extra pass: if anything still improves, a negative cycle is reachable
    has_cycle = any(dist[u] != INF and dist[u] + w < dist[v] for u, v, w in edges)
    return dist, parent, n - 1, relaxations, has_cycle
~~~

**Line by line:**

- \`for rnd in range(1, n)\` runs at most n - 1 rounds. The round number is only used for tracing and reporting.
- Inside a round, every edge is checked with \`dist[u] != INF and dist[u] + w < dist[v]\`; an improvement also records \`parent[v] = u\`.
- \`changed\` turns the loop into an early exit: a round with no improvement means the distances are final.
- After the loop, \`any(...)\` performs the extra detection round without changing anything: if any edge can still be relaxed, a negative cycle is reachable.
- Python integers never overflow, so even long negative-weight paths sum exactly.

The cycle finder used by Example 2:

~~~python
def find_negative_cycle(n, edges, source):
    """Bellman-Ford with an n-th round. Returns (dist, cycle) where cycle is [] if none is reachable."""
    dist = [INF] * n
    parent = [-1] * n
    dist[source] = 0
    last = -1
    for _ in range(n):                 # n rounds: the n-th one only detects
        last = -1
        for u, v, w in edges:
            if dist[u] != INF and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                parent[v] = u
                last = v
    if last == -1:
        return dist, []
    # Walk back n times so we are certainly standing on the cycle, not on a tail leading into it.
    x = last
    for _ in range(n):
        x = parent[x]
    cycle = [x]
    y = parent[x]
    while y != x:
        cycle.append(y)
        y = parent[y]
    cycle.append(x)
    cycle.reverse()
    return dist, cycle
~~~

\`find_negative_cycle\` runs n rounds instead of n - 1 and remembers the last improved node in the final round. The walk-back \`for _ in range(n): x = parent[x]\` guarantees \`x\` is on the cycle before the cycle is collected.

## 7. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Bellman-Ford round by round, worst and best edge order** prints:

~~~text
round 1: S=0 A=1 B=6 C=10 D=10
round 2: S=0 A=1 B=4 C=5 D=10
round 3: S=0 A=1 B=4 C=3 D=7
round 4: S=0 A=1 B=4 C=3 D=5
rounds used: 4, successful relaxations: 9, negative cycle: false
B = 4 via S -> A -> B
C = 3 via S -> A -> B -> C
D = 5 via S -> A -> B -> C -> D
round 1: S=0 A=1 B=4 C=3 D=5
round 2: S=0 A=1 B=4 C=3 D=5
rounds used: 2, successful relaxations: 7, negative cycle: false
~~~

**Example 2 — Detecting and printing a negative cycle** prints:

~~~text
graph 1 negative cycle reachable: true
cycle: B -> C -> A -> B
cycle cost: -1
graph 2 negative cycle reachable: false
graph 2 distances: S=0 A=1 X=inf Y=inf
~~~

**What the numbers show:** Example 1 confirms the round table from section 4 (four rounds in the worst order, every value one step further each round) and the early exit in the good order, and prints the paths found through \`parent\`. Example 2 finds and prints the reachable cycle with its cost, and ignores a negative cycle the source cannot reach.

## 8. Complexity

| | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Bellman-Ford | O(V × E) | O(V) | V - 1 rounds, each relaxing all E edges; \`dist\` and \`parent\` hold V values |
| With early exit | O(k × E) | O(V) | stops after at most k + 1 rounds, where k is the most edges any shortest path needs |
| Negative-cycle check | + O(E) | O(V) | one extra round; printing the cycle walks at most 2V parents |

In Python almost all the time goes into the double loop: V × E tuple unpackings and comparisons, each paying interpreter overhead. Early exit helps a lot in practice, and so does checking first whether Dijkstra is allowed.

**Bellman-Ford vs Dijkstra in one table:**

| | Dijkstra | Bellman-Ford |
| :--- | :--- | :--- |
| Negative weights | wrong answers | correct |
| Negative cycles | cannot detect | detects (reachable ones) |
| Time | O((V + E) log V) | O(V × E) |
| Order of work | greedy, closest node first | every edge, every round |

For distances between **all** pairs, see [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work), which also handles negative weights. See [Big-O notation](/interview-question/what-is-big-o-notation) if the notation is new.

## 9. Edge Cases

- **No negative edges at all:** still correct, just slower than Dijkstra.
- **Unreachable nodes:** stay at infinity; Example 2 prints \`X=inf Y=inf\`.
- **Single node, no edges:** zero rounds of real work; the answer is \`[0]\`.
- **Negative self-loop** (u → u with w < 0): a one-node negative cycle; the extra round catches it if u is reachable.
- **Zero-weight cycle:** not negative, so not reported; distances still converge.
- **Undirected graph with a negative edge:** an undirected edge is two directed edges, so a negative undirected edge is itself a two-edge negative cycle. Bellman-Ford on undirected graphs only makes sense with non-negative weights.

## Common Pitfalls

- **Running only until "it looks done" without the extra round.** Without the V-th round you cannot tell "converged" from "a negative cycle is still pulling values down".
- **Reading the cycle straight from the last improved node.** That node may be downstream of the cycle (like D in the diagram). Walk \`parent\` n times first, then collect.
- **In-place updates when the number of edges is limited.** In round 1 of the good order, D already got a 4-edge path. For "at most k edges", relax from \`prev = dist[:]\` each round.
- **Forgetting that unreachable cycles are invisible.** Start every node at 0 if you must find any negative cycle in the graph.
- **Mutable default arguments.** \`def bellman_ford(n, edges, source, dist=[])\` keeps the same list between calls; create \`dist\` inside the function.
- **Using Bellman-Ford when all weights are non-negative.** It is correct but O(V × E); Dijkstra is the expected answer then.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Bellman-Ford relaxes every edge, V - 1 times. After round k every shortest path with at most k edges is correct, and a simple path has at most V - 1 edges.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why use it:</strong> <span style="color:#f0e2c8;">It handles negative edge weights, which break Dijkstra, and it detects negative cycles.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Detection:</strong> <span style="color:#f0e2c8;">One extra round: if any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[u] + w &lt; dist[v]</code> still holds, a negative cycle is reachable. To print it, walk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> V times to land on the cycle, then follow it around.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(V × E) time, O(V) extra space with an edge list; stop early when a round changes nothing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python details:</strong> <span style="color:#f0e2c8;">Edges as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(u, v, w)</code> tuples, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float("inf")</code> for unreachable, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any()</code> for the detection pass, and no overflow worries.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why exactly V - 1 rounds?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A shortest path without a negative cycle never repeats a node, so it has at most V - 1 edges, and round k fixes paths of up to k edges. Example 1 with the worst edge order needed all 4 rounds for 5 nodes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the order of edges matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for correctness, only for speed. In Example 1 the same edges listed outward from S finished in 1 round plus 1 confirming round, while the reversed order needed all 4.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you print the negative cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code>, remember the last node improved in the V-th round, walk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> V times to be sure you are on the cycle, then follow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> until you return. Example 2 prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B -&gt; C -&gt; A -&gt; B</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this used for currency arbitrage?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use weight <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-math.log(rate)</code> for each exchange. A profitable loop has a rate product above 1, so its log-weights sum below 0, which is a negative cycle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is SPFA?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The Shortest Path Faster Algorithm: a queue-based Bellman-Ford that only re-relaxes edges out of nodes whose distance just changed. Often faster in practice, but its worst case is still O(V × E).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bellman-Ford algorithm** | relax all edges V - 1 times; works with negative weights; O(V × E) |
| **Round invariant** | after round k, every shortest path of at most k edges is correct |
| **Early exit** | stop as soon as a whole round changes nothing |
| **Negative cycle** | a cycle whose weights sum below zero; distances through it are undefined |
| **Arbitrage detection** | exchange rates as \`-log(rate)\` weights; profit loop = negative cycle |

---
**Conclusion:** Bellman-Ford is the patient shortest-path algorithm: relax every edge, V - 1 times, because no simple path has more than V - 1 edges. It accepts negative weights, an extra round detects a reachable negative cycle, and the \`parent\` array lets you print that cycle. In Python it is a few lines over a list of \`(u, v, w)\` tuples with \`float("inf")\` and \`any()\`; the price is O(V × E) time, so reach for it when negative weights or cycle detection make Dijkstra unusable. Related: [Dijkstra's algorithm](/interview-question/how-does-dijkstra-s-algorithm-work), [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work), and [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops), the most common interview problem built on Bellman-Ford rounds.`,
        examples: [
          { label: `Bellman-Ford round by round, worst and best edge order`, code: `INF = float("inf")
NAMES = "SABCD"


def show(dist):
    return " ".join(NAMES[i] + "=" + ("inf" if d == INF else str(d)) for i, d in enumerate(dist))


def bellman_ford(n, edges, source, trace):
    dist = [INF] * n
    parent = [-1] * n
    dist[source] = 0
    relaxations = 0
    for rnd in range(1, n):                      # at most n - 1 rounds
        changed = False
        for u, v, w in edges:
            if dist[u] != INF and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                parent[v] = u
                relaxations += 1
                changed = True
        if trace:
            print("round " + str(rnd) + ": " + show(dist))
        if not changed:                          # nothing moved: we are done early
            return dist, parent, rnd, relaxations, False
    # one extra pass: if anything still improves, a negative cycle is reachable
    has_cycle = any(dist[u] != INF and dist[u] + w < dist[v] for u, v, w in edges)
    return dist, parent, n - 1, relaxations, has_cycle


def path_to(parent, v):
    out = []
    while v != -1:
        out.append(NAMES[v])
        v = parent[v]
    return " -> ".join(reversed(out))


S, A, B, C, D = range(5)
# The edges are deliberately listed from the far end back towards S.
worst = [(C, D, 2), (B, C, -1), (A, B, 3), (S, A, 1), (S, B, 6), (S, C, 10), (A, D, 9)]
dist, parent, rounds, relax, cyc = bellman_ford(5, worst, S, True)
print("rounds used: " + str(rounds) + ", successful relaxations: " + str(relax) + ", negative cycle: " + str(cyc).lower())
for v in (B, C, D):
    print(NAMES[v] + " = " + str(dist[v]) + " via " + path_to(parent, v))

# Same edges, listed outward from S: everything settles in the first round.
good = [(S, A, 1), (S, B, 6), (S, C, 10), (A, B, 3), (A, D, 9), (B, C, -1), (C, D, 2)]
dist, parent, rounds, relax, cyc = bellman_ford(5, good, S, True)
print("rounds used: " + str(rounds) + ", successful relaxations: " + str(relax) + ", negative cycle: " + str(cyc).lower())` },
          { label: `Detecting and printing a negative cycle`, code: `INF = float("inf")


def find_negative_cycle(n, edges, source):
    """Bellman-Ford with an n-th round. Returns (dist, cycle) where cycle is [] if none is reachable."""
    dist = [INF] * n
    parent = [-1] * n
    dist[source] = 0
    last = -1
    for _ in range(n):                 # n rounds: the n-th one only detects
        last = -1
        for u, v, w in edges:
            if dist[u] != INF and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                parent[v] = u
                last = v
    if last == -1:
        return dist, []
    # Walk back n times so we are certainly standing on the cycle, not on a tail leading into it.
    x = last
    for _ in range(n):
        x = parent[x]
    cycle = [x]
    y = parent[x]
    while y != x:
        cycle.append(y)
        y = parent[y]
    cycle.append(x)
    cycle.reverse()
    return dist, cycle


def cycle_cost(edges, cycle):
    total = 0
    for i in range(len(cycle) - 1):
        for u, v, w in edges:
            if u == cycle[i] and v == cycle[i + 1]:
                total += w
    return total


def show(names, dist):
    return " ".join(names[i] + "=" + ("inf" if d == INF else str(d)) for i, d in enumerate(dist))


# Graph 1: A -> B -> C -> A costs 2 - 4 + 1 = -1, and S can reach it.
names1 = ["S", "A", "B", "C", "D"]
edges1 = [(0, 1, 1), (1, 2, 2), (2, 3, -4), (3, 1, 1), (3, 4, 1)]
dist, cycle = find_negative_cycle(5, edges1, 0)
print("graph 1 negative cycle reachable: " + str(bool(cycle)).lower())
print("cycle: " + " -> ".join(names1[v] for v in cycle))
print("cycle cost: " + str(cycle_cost(edges1, cycle)))

# Graph 2: a negative cycle X <-> Y exists, but S cannot reach it.
names2 = ["S", "A", "X", "Y"]
edges2 = [(0, 1, 1), (2, 3, -2), (3, 2, 1)]
dist, cycle = find_negative_cycle(4, edges2, 0)
print("graph 2 negative cycle reachable: " + str(bool(cycle)).lower())
print("graph 2 distances: " + show(names2, dist))` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"How does the Bellman-Ford algorithm work? Implement it in JavaScript for a directed graph given as an edge list that may contain negative weights, and tell me how you would detect a negative cycle."

**What a strong answer should cover:**
- Relax every edge V - 1 times; why V - 1 (a shortest simple path has at most V - 1 edges) and the round invariant.
- Negative-cycle detection with one extra round, and how to recover the cycle by walking \`parent\` V times.
- O(V × E) time and O(V) extra space; early exit when a round changes nothing; comparison with Dijkstra.
- Only cycles reachable from the source are detected, and the virtual-source trick to find any cycle.
- JavaScript specifics: \`Infinity\` arithmetic (\`Infinity + (-3)\` is still \`Infinity\`), \`edges.some(...)\` for the detection pass, destructuring \`[u, v, w]\`, and number precision beyond \`Number.MAX_SAFE_INTEGER\`.

**Clarifying questions expected:**
- "Can there be a negative cycle, and should I report it or print it?"
- "Is there a limit on the number of edges in a path?"

**Code / implementation expected:** Yes — a JavaScript \`bellmanFord(n, edges, source)\` returning distances and a negative-cycle flag, ideally with early exit.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph-algorithm background assumed
**Difficulty:** Hard
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A group of travel agents each know only the direct ticket prices out of their own city. Every morning, each agent phones the agents in the cities they fly to and says: "I can get a traveller from home to my city for X; add your ticket price and see if that beats what you have." That is one **round**. After the first morning, everyone one flight away from home knows a price. After the second morning, everyone two flights away does, and so on. If there are n cities, no sensible route uses more than n - 1 flights, so after n - 1 mornings every agent knows the cheapest price, whatever order the calls were made in.

Now add a twist: some routes come with **cashback** (a negative cost). The morning calls still work. But suppose there is a loop of three cities whose tickets, cashback included, add up to less than zero. A traveller could fly the loop forever and get paid every time: the "cheapest price" keeps falling, morning after morning, and never settles. The agents notice that something is still changing on morning n, and that is the alarm.

That is the Bellman-Ford algorithm: simple rounds of "relax every edge", correct even with negative edge weights, and able to detect a **negative cycle**. It is slower than [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work), but it works where Dijkstra fails. The same rounds-of-gossip idea runs real networks: RFC 2453 describes the RIP routing protocol as "based on the Bellman-Ford (or distance vector) algorithm" ([RFC 2453](https://www.rfc-editor.org/rfc/rfc2453)). The algorithm is named after Richard Bellman, who published it in "On a routing problem" (Quarterly of Applied Mathematics 16, 1958), and Lester Ford Jr.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can weights be negative? | If not, [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) is much faster: O((V + E) log V) instead of O(V × E). |
| Can there be a negative cycle, and what should happen then? | Shortest distances are undefined through it. Usually you report "negative cycle", sometimes you must print the cycle. |
| Should I detect any negative cycle, or only one reachable from the source? | A plain run from the source only sees reachable cycles. For any cycle, start every node at distance 0 (a virtual source). |
| Is there a limit on the number of edges (stops) in a path? | Then you need the round-by-round variant that relaxes from a copy of the previous round, as in [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops). |
| How big is the graph? | O(V × E) is fine for thousands of edges, too slow for millions. |

## 3. The Core Idea: Relax Every Edge, V - 1 Times

Every shortest-path algorithm is built from **edge relaxation** (defined on the [Dijkstra page](/interview-question/how-does-dijkstra-s-algorithm-work)): for an edge u → v with weight w, if \`dist[u] + w < dist[v]\`, lower \`dist[v]\` to \`dist[u] + w\`. Dijkstra relaxes edges in a clever order so each edge is relaxed once. Bellman-Ford does not try to be clever: it relaxes **every edge**, in any order, and repeats that whole pass V - 1 times, where V is the number of nodes.

📌 **Interview term: Bellman-Ford algorithm** — single-source shortest paths that allows negative edge weights: start with \`dist[source] = 0\` and every other distance infinite, then relax all E edges, V - 1 times. O(V × E) time.

Why V - 1 rounds? A shortest path never needs to repeat a node (if there is no negative cycle, a repeated node means a loop you could cut out without making the path more expensive). A path with no repeated node visits at most V nodes, so it has at most **V - 1 edges**.

📌 **Interview term: Round invariant** — after round k, every node whose shortest path uses at most k edges already has its correct distance. Round 1 fixes the first edge of every path, round 2 the second, and so on.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 130" role="img" aria-label="Rounds of Bellman-Ford, after round k every shortest path with at most k edges is correct, an extra round checks for negative cycles">
  <defs>
    <marker id="bf2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="120" height="70" rx="10"/>
  <text class="d-text" x="80" y="59" text-anchor="middle">round 1</text>
  <text class="d-sub" x="80" y="81" text-anchor="middle">up to 1 edge</text>
  <rect class="d-box" x="170" y="30" width="120" height="70" rx="10"/>
  <text class="d-text" x="230" y="59" text-anchor="middle">round 2</text>
  <text class="d-sub" x="230" y="81" text-anchor="middle">up to 2 edges</text>
  <rect class="d-box" x="320" y="30" width="120" height="70" rx="10"/>
  <text class="d-text" x="380" y="59" text-anchor="middle">round 3</text>
  <text class="d-sub" x="380" y="81" text-anchor="middle">up to 3 edges</text>
  <rect class="d-box" x="470" y="30" width="120" height="70" rx="10"/>
  <text class="d-text" x="530" y="59" text-anchor="middle">round 4</text>
  <text class="d-sub" x="530" y="81" text-anchor="middle">up to 4 edges</text>
  <rect class="d-box-accent" x="620" y="30" width="140" height="70" rx="10"/>
  <text class="d-text" x="690" y="59" text-anchor="middle">extra round</text>
  <text class="d-sub" x="690" y="81" text-anchor="middle">change means cycle</text>
  <path class="d-edge" d="M 144 65 L 164 65" marker-end="url(#bf2-arrow)"/>
  <path class="d-edge" d="M 294 65 L 314 65" marker-end="url(#bf2-arrow)"/>
  <path class="d-edge" d="M 444 65 L 464 65" marker-end="url(#bf2-arrow)"/>
  <path class="d-edge" d="M 594 65 L 614 65" marker-end="url(#bf2-arrow)"/>
</svg>

Why does round k fix the k-th edge? Take a shortest path S → x1 → x2 → … → v. By the invariant, after round k - 1 the node just before v already has its correct distance. During round k the pass relaxes every edge, including the last edge of this path, so v gets its correct distance too. The order of edges inside a round does not matter for correctness; it only decides whether you get lucky and finish early.

📌 **Interview term: Early exit** — if a whole round changes nothing, no later round can change anything either (every round reads the same distances and would make the same no-op checks), so you can stop.

## 4. Walking Through an Example

The examples use this graph, with source S. The chain S → A → B → C → D is the cheapest way to everything; the long edges are tempting but more expensive shortcuts, and B → C has a negative weight.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="Example graph S A B C D in a row, chain edges S to A 1, A to B 3, B to C minus 1, C to D 2, plus longer shortcut edges">
  <defs>
    <marker id="bf1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 84 170 L 180 170" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="132" y="159" text-anchor="middle">1</text>
  <path class="d-edge" d="M 234 170 L 330 170" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="282" y="159" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 384 170 L 480 170" marker-end="url(#bf1-arrow)"/>
  <text class="d-text d-accent" x="432" y="159" text-anchor="middle">-1</text>
  <path class="d-edge" d="M 534 170 L 630 170" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="582" y="159" text-anchor="middle">2</text>
  <path class="d-edge" d="M 60 146 L 60 110 L 350 110 L 350 140" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="200" y="102" text-anchor="middle">6</text>
  <path class="d-edge" d="M 220 146 L 220 50 L 660 50 L 660 140" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="450" y="42" text-anchor="middle">9</text>
  <path class="d-edge" d="M 60 194 L 60 260 L 510 260 L 510 200" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="290" y="280" text-anchor="middle">10</text>
  <circle class="d-box" cx="60" cy="170" r="24"/>
  <text class="d-text" x="60" y="175" text-anchor="middle">S</text>
  <circle class="d-box" cx="210" cy="170" r="24"/>
  <text class="d-text" x="210" y="175" text-anchor="middle">A</text>
  <circle class="d-box" cx="360" cy="170" r="24"/>
  <text class="d-text" x="360" y="175" text-anchor="middle">B</text>
  <circle class="d-box" cx="510" cy="170" r="24"/>
  <text class="d-text" x="510" y="175" text-anchor="middle">C</text>
  <circle class="d-box" cx="660" cy="170" r="24"/>
  <text class="d-text" x="660" y="175" text-anchor="middle">D</text>
</svg>

The direct edges are S→A 1, S→B 6, S→C 10, A→B 3, A→D 9, B→C -1 and C→D 2. True answers: A = 1, B = 1 + 3 = 4, C = 4 - 1 = 3, D = 3 + 2 = 5.

**Worst order.** Example 1 first lists the edges from the far end back towards S: C→D, B→C, A→B, S→A, then the shortcuts. In round 1 the chain edges are relaxed before their start node has a distance, so only S's own edges and A→D do anything. Each round moves the correct value one step further along the chain:

| After round | S | A | B | C | D |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 0 | 1 | 6 | 10 | 10 |
| 2 | 0 | 1 | 4 | 5 | 10 |
| 3 | 0 | 1 | 4 | 3 | 7 |
| 4 | 0 | 1 | 4 | 3 | 5 |

That needed all V - 1 = 4 rounds. **Good order.** Listing the same edges outward from S (S's edges first, then A's, then B's, then C's), the first round already settles everything, because each edge is relaxed after its start node got its final value. Round 2 changes nothing, so the loop stops early:

~~~text
round 1: S=0 A=1 B=4 C=3 D=5
round 2: S=0 A=1 B=4 C=3 D=5
rounds used: 2, successful relaxations: 7, negative cycle: false
~~~

Notice something subtle in that good-order run: after round 1, D = 5 already, through a path of **four** edges. Because relaxations happen in place, a single round can push a value along several edges. That is harmless for plain shortest paths (values only get closer to the truth), but it breaks problems that limit the number of edges, such as [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops); there, each round must read from a **copy** of the previous round's distances.

If you sort the edges by a topological order of a DAG (a directed graph with no cycles), one round is always enough; that is the "shortest path in a DAG" trick.

## 5. Negative Cycles: Detecting Them and Printing One

📌 **Interview term: Negative cycle** — a cycle whose edge weights add up to less than zero. Going around it once more always makes the path cheaper, so nodes reachable from it have no shortest distance (it is minus infinity).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 290" role="img" aria-label="Negative cycle A to B to C and back to A with total cost minus 1, reachable from S, and D hangs off C">
  <defs>
    <marker id="bf3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 94 140 L 210 140" marker-end="url(#bf3-arrow)"/>
  <text class="d-sub" x="152" y="129" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 261 128 L 374 65" marker-end="url(#bf3-arrow)"/>
  <text class="d-text d-accent" x="310" y="87" text-anchor="middle">2</text>
  <path class="d-edge-accent" d="M 400 74 L 400 200" marker-end="url(#bf3-arrow)"/>
  <text class="d-text d-accent" x="420" y="141" text-anchor="middle">-4</text>
  <path class="d-edge-accent" d="M 379 218 L 266 155" marker-end="url(#bf3-arrow)"/>
  <text class="d-text d-accent" x="315" y="204" text-anchor="middle">1</text>
  <path class="d-edge" d="M 424 230 L 550 230" marker-end="url(#bf3-arrow)"/>
  <text class="d-sub" x="487" y="219" text-anchor="middle">1</text>
  <circle class="d-box" cx="70" cy="140" r="24"/>
  <text class="d-text" x="70" y="145" text-anchor="middle">S</text>
  <circle class="d-box-accent" cx="240" cy="140" r="24"/>
  <text class="d-text" x="240" y="145" text-anchor="middle">A</text>
  <circle class="d-box-accent" cx="400" cy="50" r="24"/>
  <text class="d-text" x="400" y="55" text-anchor="middle">B</text>
  <circle class="d-box-accent" cx="400" cy="230" r="24"/>
  <text class="d-text" x="400" y="235" text-anchor="middle">C</text>
  <circle class="d-box" cx="580" cy="230" r="24"/>
  <text class="d-text" x="580" y="235" text-anchor="middle">D</text>
</svg>

Here A → B → C → A costs 2 - 4 + 1 = -1. Every lap lowers the distances of A, B, C, and of D, which hangs off C.

**Detection.** If there is no reachable negative cycle, all distances are final after V - 1 rounds. So run **one more round**: if any edge can still be relaxed, a negative cycle is reachable from the source.

**Finding the cycle.** Keep a \`parent\` array (who last improved each node). In the extra round, remember the last node \`x\` that improved. \`x\` is either on the cycle or downstream of it. Walk \`x = parent[x]\` V times: that is enough steps to be sure you are standing on the cycle. Then follow \`parent\` from there until you come back to the same node, collecting the nodes, and reverse the list. Example 2 prints:

~~~text
graph 1 negative cycle reachable: true
cycle: B -> C -> A -> B
cycle cost: -1
~~~

The cycle is printed starting from B because that is where the walk landed; it is the same cycle as A → B → C → A.

**Only reachable cycles.** Bellman-Ford from a source never relaxes an edge whose start is still at infinity, so a negative cycle the source cannot reach is invisible, and that is correct: it does not affect any distance from the source. Example 2's second graph has a negative cycle X ↔ Y that S cannot reach:

~~~text
graph 2 negative cycle reachable: false
graph 2 distances: S=0 A=1 X=inf Y=inf
~~~

To find **any** negative cycle in the whole graph, start every node at distance 0 instead of infinity. That is the same as adding a virtual source with a 0-weight edge to every node.

📌 **Interview term: Arbitrage detection** — the classic application: with currency exchange rates as edges, use weight \`-log(rate)\`. A cycle of trades that multiplies your money (product of rates greater than 1) becomes a cycle whose weights sum to less than 0, which Bellman-Ford detects.

## 6. The Code in JavaScript

The edges are an array of \`[u, v, w]\` triples; Bellman-Ford never needs an adjacency list because every round looks at every edge. Unreachable distances are \`Infinity\`, a real JavaScript number: running \`Infinity + (-3)\` printed \`Infinity\`, so an unreachable start can never fake a real distance. The guard \`dist[u] !== Infinity\` is therefore not needed for correctness, but it states the intent and skips useless work.

~~~javascript
function bellmanFord(n, edges, source, trace) {
  const dist = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);
  dist[source] = 0;
  let relaxations = 0;
  for (let round = 1; round < n; round++) {      // at most n - 1 rounds
    let changed = false;
    for (const [u, v, w] of edges) {
      if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        parent[v] = u;
        relaxations++;
        changed = true;
      }
    }
    if (trace) console.log("round " + round + ": " + show(dist));
    if (!changed) return { dist, parent, rounds: round, relaxations, hasCycle: false };
  }
  // one extra pass: if anything still improves, a negative cycle is reachable
  const hasCycle = edges.some(([u, v, w]) => dist[u] !== Infinity && dist[u] + w < dist[v]);
  return { dist, parent, rounds: n - 1, relaxations, hasCycle };
}
~~~

**Line by line:**

- \`for (let round = 1; round < n; round++)\` runs at most n - 1 rounds.
- \`for (const [u, v, w] of edges)\` destructures each edge; an improvement also records \`parent[v] = u\`.
- \`changed\` gives the early exit: a round with no improvement means the distances are final, so the function returns immediately.
- \`edges.some(([u, v, w]) => ...)\` is the extra detection round. \`some\` stops at the first edge that can still be relaxed and changes nothing.
- Weights here are small integers, which JavaScript numbers (64-bit floats) represent exactly up to \`Number.MAX_SAFE_INTEGER\`, 9007199254740991. Sums beyond that silently lose precision.

The cycle finder used by Example 2:

~~~javascript
// Bellman-Ford with an n-th round. Returns { dist, cycle } where cycle is [] if none is reachable.
function findNegativeCycle(n, edges, source) {
  const dist = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);
  dist[source] = 0;
  let last = -1;
  for (let round = 0; round < n; round++) {     // n rounds: the n-th one only detects
    last = -1;
    for (const [u, v, w] of edges) {
      if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        parent[v] = u;
        last = v;
      }
    }
  }
  if (last === -1) return { dist, cycle: [] };
  // Walk back n times so we are certainly standing on the cycle, not on a tail leading into it.
  let x = last;
  for (let i = 0; i < n; i++) x = parent[x];
  const cycle = [x];
  for (let y = parent[x]; y !== x; y = parent[y]) cycle.push(y);
  cycle.push(x);
  cycle.reverse();
  return { dist, cycle };
}
~~~

\`findNegativeCycle\` runs n rounds instead of n - 1 and remembers the last improved node in the final round. The walk-back \`for (let i = 0; i < n; i++) x = parent[x];\` guarantees \`x\` is on the cycle before the cycle is collected.

## 7. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Bellman-Ford round by round, worst and best edge order** prints:

~~~text
round 1: S=0 A=1 B=6 C=10 D=10
round 2: S=0 A=1 B=4 C=5 D=10
round 3: S=0 A=1 B=4 C=3 D=7
round 4: S=0 A=1 B=4 C=3 D=5
rounds used: 4, successful relaxations: 9, negative cycle: false
B = 4 via S -> A -> B
C = 3 via S -> A -> B -> C
D = 5 via S -> A -> B -> C -> D
round 1: S=0 A=1 B=4 C=3 D=5
round 2: S=0 A=1 B=4 C=3 D=5
rounds used: 2, successful relaxations: 7, negative cycle: false
~~~

**Example 2 — Detecting and printing a negative cycle** prints:

~~~text
graph 1 negative cycle reachable: true
cycle: B -> C -> A -> B
cycle cost: -1
graph 2 negative cycle reachable: false
graph 2 distances: S=0 A=1 X=inf Y=inf
~~~

**What the numbers show:** Example 1 confirms the round table from section 4 (four rounds in the worst order, every value one step further each round) and the early exit in the good order, and prints the paths found through \`parent\`. Example 2 finds and prints the reachable cycle with its cost, and ignores a negative cycle the source cannot reach.

## 8. Complexity

| | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Bellman-Ford | O(V × E) | O(V) | V - 1 rounds, each relaxing all E edges; \`dist\` and \`parent\` hold V values |
| With early exit | O(k × E) | O(V) | stops after at most k + 1 rounds, where k is the most edges any shortest path needs |
| Negative-cycle check | + O(E) | O(V) | one extra round; printing the cycle walks at most 2V parents |

The inner loop creates no new arrays; it only reads the edge triples and writes into \`dist\` and \`parent\`. V × E checks still add up quickly on large inputs, so prefer Dijkstra whenever the weights allow it.

**Bellman-Ford vs Dijkstra in one table:**

| | Dijkstra | Bellman-Ford |
| :--- | :--- | :--- |
| Negative weights | wrong answers | correct |
| Negative cycles | cannot detect | detects (reachable ones) |
| Time | O((V + E) log V) | O(V × E) |
| Order of work | greedy, closest node first | every edge, every round |

For distances between **all** pairs, see [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work), which also handles negative weights. See [Big-O notation](/interview-question/what-is-big-o-notation) if the notation is new.

## 9. Edge Cases

- **No negative edges at all:** still correct, just slower than Dijkstra.
- **Unreachable nodes:** stay at infinity; Example 2 prints \`X=inf Y=inf\`.
- **Single node, no edges:** zero rounds of real work; the answer is \`[0]\`.
- **Negative self-loop** (u → u with w < 0): a one-node negative cycle; the extra round catches it if u is reachable.
- **Zero-weight cycle:** not negative, so not reported; distances still converge.
- **Undirected graph with a negative edge:** an undirected edge is two directed edges, so a negative undirected edge is itself a two-edge negative cycle. Bellman-Ford on undirected graphs only makes sense with non-negative weights.

## Common Pitfalls

- **Skipping the extra round.** Without the V-th round you cannot tell "converged" from "a negative cycle is still pulling values down".
- **Reading the cycle straight from the last improved node.** It may be downstream of the cycle (like D in the diagram). Walk \`parent\` n times first.
- **In-place updates when the number of edges is limited.** For "at most k edges", relax from a copy, \`const prev = dist.slice()\`, each round.
- **\`new Array(n).fill([])\` for per-node lists.** Every slot shares the same array object. Use \`Array.from({ length: n }, () => [])\` when you need adjacency lists.
- **Expecting \`-Infinity\` to mean "negative cycle".** The algorithm never produces \`-Infinity\`; distances just keep falling by the cycle cost each round. Detect with the extra round instead.
- **Using Bellman-Ford when all weights are non-negative.** It is correct but O(V × E); Dijkstra is the expected answer then.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Bellman-Ford relaxes every edge, V - 1 times. After round k every shortest path with at most k edges is correct, and a simple path has at most V - 1 edges.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why use it:</strong> <span style="color:#f0e2c8;">It handles negative edge weights, which break Dijkstra, and it detects negative cycles.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Detection:</strong> <span style="color:#f0e2c8;">One extra round with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">edges.some(...)</code>: if any edge still relaxes, a negative cycle is reachable. To print it, walk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> V times, then follow it around.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(V × E) time, O(V) extra space with an edge list; stop early when a round changes nothing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript details:</strong> <span style="color:#f0e2c8;">Edges as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[u, v, w]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Infinity</code> for unreachable, and copy with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slice()</code> when the number of edges per path is limited.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why exactly V - 1 rounds?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A shortest path without a negative cycle never repeats a node, so it has at most V - 1 edges, and round k fixes paths of up to k edges. Example 1 with the worst edge order needed all 4 rounds for 5 nodes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the order of edges matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for correctness, only for speed. In Example 1 the same edges listed outward from S finished in 1 round plus 1 confirming round, while the reversed order needed all 4.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you print the negative cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code>, remember the last node improved in the V-th round, walk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> V times to be sure you are on the cycle, then follow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> until you return. Example 2 prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B -&gt; C -&gt; A -&gt; B</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this used for currency arbitrage?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use weight <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-Math.log(rate)</code> for each exchange. A profitable loop has a rate product above 1, so its log-weights sum below 0, which is a negative cycle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is SPFA?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The Shortest Path Faster Algorithm: a queue-based Bellman-Ford that only re-relaxes edges out of nodes whose distance just changed. Often faster in practice, but its worst case is still O(V × E).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bellman-Ford algorithm** | relax all edges V - 1 times; works with negative weights; O(V × E) |
| **Round invariant** | after round k, every shortest path of at most k edges is correct |
| **Early exit** | stop as soon as a whole round changes nothing |
| **Negative cycle** | a cycle whose weights sum below zero; distances through it are undefined |
| **Arbitrage detection** | exchange rates as \`-log(rate)\` weights; profit loop = negative cycle |

---
**Conclusion:** Bellman-Ford is the patient shortest-path algorithm: relax every edge, V - 1 times, because no simple path has more than V - 1 edges. It accepts negative weights, an extra round detects a reachable negative cycle, and the \`parent\` array lets you print that cycle. In JavaScript it is a short loop over \`[u, v, w]\` triples with \`Infinity\` and \`edges.some()\`; the price is O(V × E) time, so reach for it when negative weights or cycle detection make Dijkstra unusable. Related: [Dijkstra's algorithm](/interview-question/how-does-dijkstra-s-algorithm-work), [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work), and [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops), the most common interview problem built on Bellman-Ford rounds.`,
        examples: [
          { label: `Bellman-Ford round by round, worst and best edge order`, code: `const NAMES = "SABCD";

const show = (dist) => dist.map((d, i) => NAMES[i] + "=" + (d === Infinity ? "inf" : d)).join(" ");

function bellmanFord(n, edges, source, trace) {
  const dist = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);
  dist[source] = 0;
  let relaxations = 0;
  for (let round = 1; round < n; round++) {      // at most n - 1 rounds
    let changed = false;
    for (const [u, v, w] of edges) {
      if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        parent[v] = u;
        relaxations++;
        changed = true;
      }
    }
    if (trace) console.log("round " + round + ": " + show(dist));
    if (!changed) return { dist, parent, rounds: round, relaxations, hasCycle: false };
  }
  // one extra pass: if anything still improves, a negative cycle is reachable
  const hasCycle = edges.some(([u, v, w]) => dist[u] !== Infinity && dist[u] + w < dist[v]);
  return { dist, parent, rounds: n - 1, relaxations, hasCycle };
}

function pathTo(parent, v) {
  const out = [];
  for (; v !== -1; v = parent[v]) out.push(NAMES[v]);
  return out.reverse().join(" -> ");
}

const [S, A, B, C, D] = [0, 1, 2, 3, 4];
// The edges are deliberately listed from the far end back towards S.
const worst = [[C, D, 2], [B, C, -1], [A, B, 3], [S, A, 1], [S, B, 6], [S, C, 10], [A, D, 9]];
let r = bellmanFord(5, worst, S, true);
console.log("rounds used: " + r.rounds + ", successful relaxations: " + r.relaxations + ", negative cycle: " + r.hasCycle);
for (const v of [B, C, D]) console.log(NAMES[v] + " = " + r.dist[v] + " via " + pathTo(r.parent, v));

// Same edges, listed outward from S: everything settles in the first round.
const good = [[S, A, 1], [S, B, 6], [S, C, 10], [A, B, 3], [A, D, 9], [B, C, -1], [C, D, 2]];
r = bellmanFord(5, good, S, true);
console.log("rounds used: " + r.rounds + ", successful relaxations: " + r.relaxations + ", negative cycle: " + r.hasCycle);` },
          { label: `Detecting and printing a negative cycle`, code: `// Bellman-Ford with an n-th round. Returns { dist, cycle } where cycle is [] if none is reachable.
function findNegativeCycle(n, edges, source) {
  const dist = new Array(n).fill(Infinity);
  const parent = new Array(n).fill(-1);
  dist[source] = 0;
  let last = -1;
  for (let round = 0; round < n; round++) {     // n rounds: the n-th one only detects
    last = -1;
    for (const [u, v, w] of edges) {
      if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        parent[v] = u;
        last = v;
      }
    }
  }
  if (last === -1) return { dist, cycle: [] };
  // Walk back n times so we are certainly standing on the cycle, not on a tail leading into it.
  let x = last;
  for (let i = 0; i < n; i++) x = parent[x];
  const cycle = [x];
  for (let y = parent[x]; y !== x; y = parent[y]) cycle.push(y);
  cycle.push(x);
  cycle.reverse();
  return { dist, cycle };
}

function cycleCost(edges, cycle) {
  let total = 0;
  for (let i = 0; i + 1 < cycle.length; i++)
    for (const [u, v, w] of edges) if (u === cycle[i] && v === cycle[i + 1]) total += w;
  return total;
}

const show = (names, dist) => dist.map((d, i) => names[i] + "=" + (d === Infinity ? "inf" : d)).join(" ");

// Graph 1: A -> B -> C -> A costs 2 - 4 + 1 = -1, and S can reach it.
const names1 = ["S", "A", "B", "C", "D"];
const edges1 = [[0, 1, 1], [1, 2, 2], [2, 3, -4], [3, 1, 1], [3, 4, 1]];
let r = findNegativeCycle(5, edges1, 0);
console.log("graph 1 negative cycle reachable: " + (r.cycle.length > 0));
console.log("cycle: " + r.cycle.map((v) => names1[v]).join(" -> "));
console.log("cycle cost: " + cycleCost(edges1, r.cycle));

// Graph 2: a negative cycle X <-> Y exists, but S cannot reach it.
const names2 = ["S", "A", "X", "Y"];
const edges2 = [[0, 1, 1], [2, 3, -2], [3, 2, 1]];
r = findNegativeCycle(4, edges2, 0);
console.log("graph 2 negative cycle reachable: " + (r.cycle.length > 0));
console.log("graph 2 distances: " + show(names2, r.dist));` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"How does the Bellman-Ford algorithm work? Implement it in Java for a directed graph given as an edge list that may contain negative weights, and tell me how you would detect a negative cycle."

**What a strong answer should cover:**
- Relax every edge V - 1 times; why V - 1 (a shortest simple path has at most V - 1 edges) and the round invariant.
- Negative-cycle detection with one extra round, and how to recover the cycle by walking \`parent\` V times.
- O(V × E) time and O(V) extra space; early exit when a round changes nothing; comparison with Dijkstra.
- Only cycles reachable from the source are detected, and the virtual-source trick to find any cycle.
- Java specifics: \`long\` distances, the \`dist[u] != INF\` guard is mandatory because \`Long.MAX_VALUE + w\` overflows to a negative number, and \`int[][]\` edges to avoid boxing.

**Clarifying questions expected:**
- "Can there be a negative cycle, and should I report it or print it?"
- "Is there a limit on the number of edges in a path?"

**Code / implementation expected:** Yes — a Java \`bellmanFord(n, edges, source)\` over \`int[][]\` edges returning distances and a negative-cycle flag, ideally with early exit.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph-algorithm background assumed
**Difficulty:** Hard
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A group of travel agents each know only the direct ticket prices out of their own city. Every morning, each agent phones the agents in the cities they fly to and says: "I can get a traveller from home to my city for X; add your ticket price and see if that beats what you have." That is one **round**. After the first morning, everyone one flight away from home knows a price. After the second morning, everyone two flights away does, and so on. If there are n cities, no sensible route uses more than n - 1 flights, so after n - 1 mornings every agent knows the cheapest price, whatever order the calls were made in.

Now add a twist: some routes come with **cashback** (a negative cost). The morning calls still work. But suppose there is a loop of three cities whose tickets, cashback included, add up to less than zero. A traveller could fly the loop forever and get paid every time: the "cheapest price" keeps falling, morning after morning, and never settles. The agents notice that something is still changing on morning n, and that is the alarm.

That is the Bellman-Ford algorithm: simple rounds of "relax every edge", correct even with negative edge weights, and able to detect a **negative cycle**. It is slower than [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work), but it works where Dijkstra fails. The same rounds-of-gossip idea runs real networks: RFC 2453 describes the RIP routing protocol as "based on the Bellman-Ford (or distance vector) algorithm" ([RFC 2453](https://www.rfc-editor.org/rfc/rfc2453)). The algorithm is named after Richard Bellman, who published it in "On a routing problem" (Quarterly of Applied Mathematics 16, 1958), and Lester Ford Jr.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can weights be negative? | If not, [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) is much faster: O((V + E) log V) instead of O(V × E). |
| Can there be a negative cycle, and what should happen then? | Shortest distances are undefined through it. Usually you report "negative cycle", sometimes you must print the cycle. |
| Should I detect any negative cycle, or only one reachable from the source? | A plain run from the source only sees reachable cycles. For any cycle, start every node at distance 0 (a virtual source). |
| Is there a limit on the number of edges (stops) in a path? | Then you need the round-by-round variant that relaxes from a copy of the previous round, as in [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops). |
| How big is the graph? | O(V × E) is fine for thousands of edges, too slow for millions. |

## 3. The Core Idea: Relax Every Edge, V - 1 Times

Every shortest-path algorithm is built from **edge relaxation** (defined on the [Dijkstra page](/interview-question/how-does-dijkstra-s-algorithm-work)): for an edge u → v with weight w, if \`dist[u] + w < dist[v]\`, lower \`dist[v]\` to \`dist[u] + w\`. Dijkstra relaxes edges in a clever order so each edge is relaxed once. Bellman-Ford does not try to be clever: it relaxes **every edge**, in any order, and repeats that whole pass V - 1 times, where V is the number of nodes.

📌 **Interview term: Bellman-Ford algorithm** — single-source shortest paths that allows negative edge weights: start with \`dist[source] = 0\` and every other distance infinite, then relax all E edges, V - 1 times. O(V × E) time.

Why V - 1 rounds? A shortest path never needs to repeat a node (if there is no negative cycle, a repeated node means a loop you could cut out without making the path more expensive). A path with no repeated node visits at most V nodes, so it has at most **V - 1 edges**.

📌 **Interview term: Round invariant** — after round k, every node whose shortest path uses at most k edges already has its correct distance. Round 1 fixes the first edge of every path, round 2 the second, and so on.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 130" role="img" aria-label="Rounds of Bellman-Ford, after round k every shortest path with at most k edges is correct, an extra round checks for negative cycles">
  <defs>
    <marker id="bf2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="120" height="70" rx="10"/>
  <text class="d-text" x="80" y="59" text-anchor="middle">round 1</text>
  <text class="d-sub" x="80" y="81" text-anchor="middle">up to 1 edge</text>
  <rect class="d-box" x="170" y="30" width="120" height="70" rx="10"/>
  <text class="d-text" x="230" y="59" text-anchor="middle">round 2</text>
  <text class="d-sub" x="230" y="81" text-anchor="middle">up to 2 edges</text>
  <rect class="d-box" x="320" y="30" width="120" height="70" rx="10"/>
  <text class="d-text" x="380" y="59" text-anchor="middle">round 3</text>
  <text class="d-sub" x="380" y="81" text-anchor="middle">up to 3 edges</text>
  <rect class="d-box" x="470" y="30" width="120" height="70" rx="10"/>
  <text class="d-text" x="530" y="59" text-anchor="middle">round 4</text>
  <text class="d-sub" x="530" y="81" text-anchor="middle">up to 4 edges</text>
  <rect class="d-box-accent" x="620" y="30" width="140" height="70" rx="10"/>
  <text class="d-text" x="690" y="59" text-anchor="middle">extra round</text>
  <text class="d-sub" x="690" y="81" text-anchor="middle">change means cycle</text>
  <path class="d-edge" d="M 144 65 L 164 65" marker-end="url(#bf2-arrow)"/>
  <path class="d-edge" d="M 294 65 L 314 65" marker-end="url(#bf2-arrow)"/>
  <path class="d-edge" d="M 444 65 L 464 65" marker-end="url(#bf2-arrow)"/>
  <path class="d-edge" d="M 594 65 L 614 65" marker-end="url(#bf2-arrow)"/>
</svg>

Why does round k fix the k-th edge? Take a shortest path S → x1 → x2 → … → v. By the invariant, after round k - 1 the node just before v already has its correct distance. During round k the pass relaxes every edge, including the last edge of this path, so v gets its correct distance too. The order of edges inside a round does not matter for correctness; it only decides whether you get lucky and finish early.

📌 **Interview term: Early exit** — if a whole round changes nothing, no later round can change anything either (every round reads the same distances and would make the same no-op checks), so you can stop.

## 4. Walking Through an Example

The examples use this graph, with source S. The chain S → A → B → C → D is the cheapest way to everything; the long edges are tempting but more expensive shortcuts, and B → C has a negative weight.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="Example graph S A B C D in a row, chain edges S to A 1, A to B 3, B to C minus 1, C to D 2, plus longer shortcut edges">
  <defs>
    <marker id="bf1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 84 170 L 180 170" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="132" y="159" text-anchor="middle">1</text>
  <path class="d-edge" d="M 234 170 L 330 170" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="282" y="159" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 384 170 L 480 170" marker-end="url(#bf1-arrow)"/>
  <text class="d-text d-accent" x="432" y="159" text-anchor="middle">-1</text>
  <path class="d-edge" d="M 534 170 L 630 170" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="582" y="159" text-anchor="middle">2</text>
  <path class="d-edge" d="M 60 146 L 60 110 L 350 110 L 350 140" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="200" y="102" text-anchor="middle">6</text>
  <path class="d-edge" d="M 220 146 L 220 50 L 660 50 L 660 140" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="450" y="42" text-anchor="middle">9</text>
  <path class="d-edge" d="M 60 194 L 60 260 L 510 260 L 510 200" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="290" y="280" text-anchor="middle">10</text>
  <circle class="d-box" cx="60" cy="170" r="24"/>
  <text class="d-text" x="60" y="175" text-anchor="middle">S</text>
  <circle class="d-box" cx="210" cy="170" r="24"/>
  <text class="d-text" x="210" y="175" text-anchor="middle">A</text>
  <circle class="d-box" cx="360" cy="170" r="24"/>
  <text class="d-text" x="360" y="175" text-anchor="middle">B</text>
  <circle class="d-box" cx="510" cy="170" r="24"/>
  <text class="d-text" x="510" y="175" text-anchor="middle">C</text>
  <circle class="d-box" cx="660" cy="170" r="24"/>
  <text class="d-text" x="660" y="175" text-anchor="middle">D</text>
</svg>

The direct edges are S→A 1, S→B 6, S→C 10, A→B 3, A→D 9, B→C -1 and C→D 2. True answers: A = 1, B = 1 + 3 = 4, C = 4 - 1 = 3, D = 3 + 2 = 5.

**Worst order.** Example 1 first lists the edges from the far end back towards S: C→D, B→C, A→B, S→A, then the shortcuts. In round 1 the chain edges are relaxed before their start node has a distance, so only S's own edges and A→D do anything. Each round moves the correct value one step further along the chain:

| After round | S | A | B | C | D |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 0 | 1 | 6 | 10 | 10 |
| 2 | 0 | 1 | 4 | 5 | 10 |
| 3 | 0 | 1 | 4 | 3 | 7 |
| 4 | 0 | 1 | 4 | 3 | 5 |

That needed all V - 1 = 4 rounds. **Good order.** Listing the same edges outward from S (S's edges first, then A's, then B's, then C's), the first round already settles everything, because each edge is relaxed after its start node got its final value. Round 2 changes nothing, so the loop stops early:

~~~text
round 1: S=0 A=1 B=4 C=3 D=5
round 2: S=0 A=1 B=4 C=3 D=5
rounds used: 2, successful relaxations: 7, negative cycle: false
~~~

Notice something subtle in that good-order run: after round 1, D = 5 already, through a path of **four** edges. Because relaxations happen in place, a single round can push a value along several edges. That is harmless for plain shortest paths (values only get closer to the truth), but it breaks problems that limit the number of edges, such as [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops); there, each round must read from a **copy** of the previous round's distances.

If you sort the edges by a topological order of a DAG (a directed graph with no cycles), one round is always enough; that is the "shortest path in a DAG" trick.

## 5. Negative Cycles: Detecting Them and Printing One

📌 **Interview term: Negative cycle** — a cycle whose edge weights add up to less than zero. Going around it once more always makes the path cheaper, so nodes reachable from it have no shortest distance (it is minus infinity).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 290" role="img" aria-label="Negative cycle A to B to C and back to A with total cost minus 1, reachable from S, and D hangs off C">
  <defs>
    <marker id="bf3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 94 140 L 210 140" marker-end="url(#bf3-arrow)"/>
  <text class="d-sub" x="152" y="129" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 261 128 L 374 65" marker-end="url(#bf3-arrow)"/>
  <text class="d-text d-accent" x="310" y="87" text-anchor="middle">2</text>
  <path class="d-edge-accent" d="M 400 74 L 400 200" marker-end="url(#bf3-arrow)"/>
  <text class="d-text d-accent" x="420" y="141" text-anchor="middle">-4</text>
  <path class="d-edge-accent" d="M 379 218 L 266 155" marker-end="url(#bf3-arrow)"/>
  <text class="d-text d-accent" x="315" y="204" text-anchor="middle">1</text>
  <path class="d-edge" d="M 424 230 L 550 230" marker-end="url(#bf3-arrow)"/>
  <text class="d-sub" x="487" y="219" text-anchor="middle">1</text>
  <circle class="d-box" cx="70" cy="140" r="24"/>
  <text class="d-text" x="70" y="145" text-anchor="middle">S</text>
  <circle class="d-box-accent" cx="240" cy="140" r="24"/>
  <text class="d-text" x="240" y="145" text-anchor="middle">A</text>
  <circle class="d-box-accent" cx="400" cy="50" r="24"/>
  <text class="d-text" x="400" y="55" text-anchor="middle">B</text>
  <circle class="d-box-accent" cx="400" cy="230" r="24"/>
  <text class="d-text" x="400" y="235" text-anchor="middle">C</text>
  <circle class="d-box" cx="580" cy="230" r="24"/>
  <text class="d-text" x="580" y="235" text-anchor="middle">D</text>
</svg>

Here A → B → C → A costs 2 - 4 + 1 = -1. Every lap lowers the distances of A, B, C, and of D, which hangs off C.

**Detection.** If there is no reachable negative cycle, all distances are final after V - 1 rounds. So run **one more round**: if any edge can still be relaxed, a negative cycle is reachable from the source.

**Finding the cycle.** Keep a \`parent\` array (who last improved each node). In the extra round, remember the last node \`x\` that improved. \`x\` is either on the cycle or downstream of it. Walk \`x = parent[x]\` V times: that is enough steps to be sure you are standing on the cycle. Then follow \`parent\` from there until you come back to the same node, collecting the nodes, and reverse the list. Example 2 prints:

~~~text
graph 1 negative cycle reachable: true
cycle: B -> C -> A -> B
cycle cost: -1
~~~

The cycle is printed starting from B because that is where the walk landed; it is the same cycle as A → B → C → A.

**Only reachable cycles.** Bellman-Ford from a source never relaxes an edge whose start is still at infinity, so a negative cycle the source cannot reach is invisible, and that is correct: it does not affect any distance from the source. Example 2's second graph has a negative cycle X ↔ Y that S cannot reach:

~~~text
graph 2 negative cycle reachable: false
graph 2 distances: S=0 A=1 X=inf Y=inf
~~~

To find **any** negative cycle in the whole graph, start every node at distance 0 instead of infinity. That is the same as adding a virtual source with a 0-weight edge to every node.

📌 **Interview term: Arbitrage detection** — the classic application: with currency exchange rates as edges, use weight \`-log(rate)\`. A cycle of trades that multiplies your money (product of rates greater than 1) becomes a cycle whose weights sum to less than 0, which Bellman-Ford detects.

## 6. The Code in Java

The edges are an \`int[][]\` of \`{u, v, w}\` triples; Bellman-Ford never needs an adjacency list because every round looks at every edge. Distances are \`long\`, with \`INF = Long.MAX_VALUE\` meaning unreachable. Here the guard \`dist[u] != INF\` is **mandatory**, not cosmetic: \`Long.MAX_VALUE + 1\` printed \`-9223372036854775808\`, so relaxing out of an unreachable node would turn "infinitely far" into "hugely negative" and corrupt everything.

~~~java
static void bellmanFord(int n, int[][] edges, int source, boolean trace) {
    dist = new long[n];
    Arrays.fill(dist, INF);
    parent = new int[n];
    Arrays.fill(parent, -1);
    dist[source] = 0;
    relaxations = 0;
    hasCycle = false;
    for (int round = 1; round < n; round++) {            // at most n - 1 rounds
        boolean changed = false;
        for (int[] e : edges) {
            int u = e[0], v = e[1], w = e[2];
            // the INF guard matters: Long.MAX_VALUE + a positive weight would overflow
            if (dist[u] != INF && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                parent[v] = u;
                relaxations++;
                changed = true;
            }
        }
        if (trace) System.out.println("round " + round + ": " + show());
        if (!changed) { rounds = round; return; }
    }
    rounds = n - 1;
    // one extra pass: if anything still improves, a negative cycle is reachable
    for (int[] e : edges)
        if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]]) hasCycle = true;
}
~~~

**Line by line:**

- Results are kept in static fields (\`dist\`, \`parent\`, \`rounds\`, \`relaxations\`, \`hasCycle\`) so one call can return several values without a wrapper class; in production code a small \`record\` would be cleaner.
- \`for (int round = 1; round < n; round++)\` runs at most n - 1 rounds.
- \`if (dist[u] != INF && dist[u] + w < dist[v])\`: the first test prevents the overflow described above; \`w\` is an \`int\` and is widened to \`long\` automatically in the addition.
- \`changed\` gives the early exit.
- The detection loop after the rounds sets \`hasCycle\` if any edge can still be relaxed.

The cycle finder used by Example 2:

~~~java
// Bellman-Ford with an n-th round. Fills dist and returns the cycle (empty if none is reachable).
static List<Integer> findNegativeCycle(int n, int[][] edges, int source) {
    dist = new long[n];
    Arrays.fill(dist, INF);
    int[] parent = new int[n];
    Arrays.fill(parent, -1);
    dist[source] = 0;
    int last = -1;
    for (int round = 0; round < n; round++) {      // n rounds: the n-th one only detects
        last = -1;
        for (int[] e : edges) {
            if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]]) {
                dist[e[1]] = dist[e[0]] + e[2];
                parent[e[1]] = e[0];
                last = e[1];
            }
        }
    }
    List<Integer> cycle = new ArrayList<>();
    if (last == -1) return cycle;
    // Walk back n times so we are certainly standing on the cycle, not on a tail leading into it.
    int x = last;
    for (int i = 0; i < n; i++) x = parent[x];
    cycle.add(x);
    for (int y = parent[x]; y != x; y = parent[y]) cycle.add(y);
    cycle.add(x);
    Collections.reverse(cycle);
    return cycle;
}
~~~

\`findNegativeCycle\` runs n rounds instead of n - 1 and remembers the last improved node in the final round. The walk-back loop guarantees \`x\` is on the cycle, then the cycle is collected into an \`ArrayList<Integer>\` and reversed with \`Collections.reverse\`. Comparing \`e[0] == cycle.get(i)\` in \`cycleCost\` unboxes the \`Integer\` because \`e[0]\` is a primitive \`int\`, so it compares values, not references.

## 7. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Bellman-Ford round by round, worst and best edge order** prints:

~~~text
round 1: S=0 A=1 B=6 C=10 D=10
round 2: S=0 A=1 B=4 C=5 D=10
round 3: S=0 A=1 B=4 C=3 D=7
round 4: S=0 A=1 B=4 C=3 D=5
rounds used: 4, successful relaxations: 9, negative cycle: false
B = 4 via S -> A -> B
C = 3 via S -> A -> B -> C
D = 5 via S -> A -> B -> C -> D
round 1: S=0 A=1 B=4 C=3 D=5
round 2: S=0 A=1 B=4 C=3 D=5
rounds used: 2, successful relaxations: 7, negative cycle: false
~~~

**Example 2 — Detecting and printing a negative cycle** prints:

~~~text
graph 1 negative cycle reachable: true
cycle: B -> C -> A -> B
cycle cost: -1
graph 2 negative cycle reachable: false
graph 2 distances: S=0 A=1 X=inf Y=inf
~~~

**What the numbers show:** Example 1 confirms the round table from section 4 (four rounds in the worst order, every value one step further each round) and the early exit in the good order, and prints the paths found through \`parent\`. Example 2 finds and prints the reachable cycle with its cost, and ignores a negative cycle the source cannot reach.

## 8. Complexity

| | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Bellman-Ford | O(V × E) | O(V) | V - 1 rounds, each relaxing all E edges; \`dist\` and \`parent\` hold V values |
| With early exit | O(k × E) | O(V) | stops after at most k + 1 rounds, where k is the most edges any shortest path needs |
| Negative-cycle check | + O(E) | O(V) | one extra round; printing the cycle walks at most 2V parents |

Storing edges as primitive \`int[]\` triples and distances as a \`long[]\` keeps the double loop free of boxing and allocation; the V × E checks are still the cost to worry about, so prefer Dijkstra when weights are non-negative.

**Bellman-Ford vs Dijkstra in one table:**

| | Dijkstra | Bellman-Ford |
| :--- | :--- | :--- |
| Negative weights | wrong answers | correct |
| Negative cycles | cannot detect | detects (reachable ones) |
| Time | O((V + E) log V) | O(V × E) |
| Order of work | greedy, closest node first | every edge, every round |

For distances between **all** pairs, see [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work), which also handles negative weights. See [Big-O notation](/interview-question/what-is-big-o-notation) if the notation is new.

## 9. Edge Cases

- **No negative edges at all:** still correct, just slower than Dijkstra.
- **Unreachable nodes:** stay at infinity; Example 2 prints \`X=inf Y=inf\`.
- **Single node, no edges:** zero rounds of real work; the answer is \`[0]\`.
- **Negative self-loop** (u → u with w < 0): a one-node negative cycle; the extra round catches it if u is reachable.
- **Zero-weight cycle:** not negative, so not reported; distances still converge.
- **Undirected graph with a negative edge:** an undirected edge is two directed edges, so a negative undirected edge is itself a two-edge negative cycle. Bellman-Ford on undirected graphs only makes sense with non-negative weights.

## Common Pitfalls

- **Dropping the \`dist[u] != INF\` guard.** \`Long.MAX_VALUE + w\` wraps to a negative number (verified above); one unreachable node then poisons every distance.
- **\`int\` distances.** Long chains of large weights overflow \`int\`; use \`long\`.
- **Skipping the extra round.** Without the V-th round you cannot tell "converged" from "a negative cycle is still pulling values down".
- **Reading the cycle straight from the last improved node.** It may be downstream of the cycle (like D in the diagram). Walk \`parent\` n times first.
- **In-place updates when the number of edges is limited.** For "at most k edges", relax from \`long[] prev = dist.clone()\` each round.
- **Comparing two \`Integer\` objects with \`==\`.** If both sides are boxed (for example two \`cycle.get(...)\` calls), \`==\` compares references and fails above 127; use \`.equals\` or unbox.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Bellman-Ford relaxes every edge, V - 1 times. After round k every shortest path with at most k edges is correct, and a simple path has at most V - 1 edges.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why use it:</strong> <span style="color:#f0e2c8;">It handles negative edge weights, which break Dijkstra, and it detects negative cycles.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Detection:</strong> <span style="color:#f0e2c8;">One extra round: if any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[u] + w &lt; dist[v]</code> still holds, a negative cycle is reachable. To print it, walk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> V times, then follow it around.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(V × E) time, O(V) extra space with an edge list; stop early when a round changes nothing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> distances, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INF = Long.MAX_VALUE</code>, and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[u] != INF</code> guard is required because adding to it overflows.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why exactly V - 1 rounds?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A shortest path without a negative cycle never repeats a node, so it has at most V - 1 edges, and round k fixes paths of up to k edges. Example 1 with the worst edge order needed all 4 rounds for 5 nodes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the order of edges matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for correctness, only for speed. In Example 1 the same edges listed outward from S finished in 1 round plus 1 confirming round, while the reversed order needed all 4.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you print the negative cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code>, remember the last node improved in the V-th round, walk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> V times to be sure you are on the cycle, then follow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> until you return. Example 2 prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B -&gt; C -&gt; A -&gt; B</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code> as infinity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE + 1</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-2147483648</code>. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> and an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!= INF</code> guard there is no way to add to infinity by accident.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is SPFA?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The Shortest Path Faster Algorithm: a queue-based Bellman-Ford (an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> of nodes whose distance just changed). Often faster in practice, but its worst case is still O(V × E).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bellman-Ford algorithm** | relax all edges V - 1 times; works with negative weights; O(V × E) |
| **Round invariant** | after round k, every shortest path of at most k edges is correct |
| **Early exit** | stop as soon as a whole round changes nothing |
| **Negative cycle** | a cycle whose weights sum below zero; distances through it are undefined |
| **Arbitrage detection** | exchange rates as \`-log(rate)\` weights; profit loop = negative cycle |

---
**Conclusion:** Bellman-Ford is the patient shortest-path algorithm: relax every edge, V - 1 times, because no simple path has more than V - 1 edges. It accepts negative weights, an extra round detects a reachable negative cycle, and the \`parent\` array lets you print that cycle. In Java the details that matter are \`long\` distances and the \`dist[u] != INF\` guard, because \`Long.MAX_VALUE + w\` wraps around; the price is O(V × E) time, so reach for it when negative weights or cycle detection make Dijkstra unusable. Related: [Dijkstra's algorithm](/interview-question/how-does-dijkstra-s-algorithm-work), [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work), and [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops), the most common interview problem built on Bellman-Ford rounds.`,
        examples: [
          { label: `Bellman-Ford round by round, worst and best edge order`, code: `import java.util.*;

public class Main {
    static final long INF = Long.MAX_VALUE;
    static final String NAMES = "SABCD";
    static long[] dist;
    static int[] parent;
    static int rounds, relaxations;
    static boolean hasCycle;

    static String show() {
        StringJoiner sj = new StringJoiner(" ");
        for (int i = 0; i < dist.length; i++) sj.add(NAMES.charAt(i) + "=" + (dist[i] == INF ? "inf" : String.valueOf(dist[i])));
        return sj.toString();
    }

    static void bellmanFord(int n, int[][] edges, int source, boolean trace) {
        dist = new long[n];
        Arrays.fill(dist, INF);
        parent = new int[n];
        Arrays.fill(parent, -1);
        dist[source] = 0;
        relaxations = 0;
        hasCycle = false;
        for (int round = 1; round < n; round++) {            // at most n - 1 rounds
            boolean changed = false;
            for (int[] e : edges) {
                int u = e[0], v = e[1], w = e[2];
                // the INF guard matters: Long.MAX_VALUE + a positive weight would overflow
                if (dist[u] != INF && dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    parent[v] = u;
                    relaxations++;
                    changed = true;
                }
            }
            if (trace) System.out.println("round " + round + ": " + show());
            if (!changed) { rounds = round; return; }
        }
        rounds = n - 1;
        // one extra pass: if anything still improves, a negative cycle is reachable
        for (int[] e : edges)
            if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]]) hasCycle = true;
    }

    static String pathTo(int v) {
        List<String> out = new ArrayList<>();
        for (; v != -1; v = parent[v]) out.add(String.valueOf(NAMES.charAt(v)));
        Collections.reverse(out);
        return String.join(" -> ", out);
    }

    public static void main(String[] args) {
        final int S = 0, A = 1, B = 2, C = 3, D = 4;
        // The edges are deliberately listed from the far end back towards S.
        int[][] worst = {{C, D, 2}, {B, C, -1}, {A, B, 3}, {S, A, 1}, {S, B, 6}, {S, C, 10}, {A, D, 9}};
        bellmanFord(5, worst, S, true);
        System.out.println("rounds used: " + rounds + ", successful relaxations: " + relaxations + ", negative cycle: " + hasCycle);
        for (int v : new int[]{B, C, D}) System.out.println(NAMES.charAt(v) + " = " + dist[v] + " via " + pathTo(v));

        // Same edges, listed outward from S: everything settles in the first round.
        int[][] good = {{S, A, 1}, {S, B, 6}, {S, C, 10}, {A, B, 3}, {A, D, 9}, {B, C, -1}, {C, D, 2}};
        bellmanFord(5, good, S, true);
        System.out.println("rounds used: " + rounds + ", successful relaxations: " + relaxations + ", negative cycle: " + hasCycle);
    }
}` },
          { label: `Detecting and printing a negative cycle`, code: `import java.util.*;

public class Main {
    static final long INF = Long.MAX_VALUE;
    static long[] dist;

    // Bellman-Ford with an n-th round. Fills dist and returns the cycle (empty if none is reachable).
    static List<Integer> findNegativeCycle(int n, int[][] edges, int source) {
        dist = new long[n];
        Arrays.fill(dist, INF);
        int[] parent = new int[n];
        Arrays.fill(parent, -1);
        dist[source] = 0;
        int last = -1;
        for (int round = 0; round < n; round++) {      // n rounds: the n-th one only detects
            last = -1;
            for (int[] e : edges) {
                if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]]) {
                    dist[e[1]] = dist[e[0]] + e[2];
                    parent[e[1]] = e[0];
                    last = e[1];
                }
            }
        }
        List<Integer> cycle = new ArrayList<>();
        if (last == -1) return cycle;
        // Walk back n times so we are certainly standing on the cycle, not on a tail leading into it.
        int x = last;
        for (int i = 0; i < n; i++) x = parent[x];
        cycle.add(x);
        for (int y = parent[x]; y != x; y = parent[y]) cycle.add(y);
        cycle.add(x);
        Collections.reverse(cycle);
        return cycle;
    }

    static long cycleCost(int[][] edges, List<Integer> cycle) {
        long total = 0;
        for (int i = 0; i + 1 < cycle.size(); i++)
            for (int[] e : edges)
                if (e[0] == cycle.get(i) && e[1] == cycle.get(i + 1)) total += e[2];
        return total;
    }

    static String show(String[] names) {
        StringJoiner sj = new StringJoiner(" ");
        for (int i = 0; i < dist.length; i++) sj.add(names[i] + "=" + (dist[i] == INF ? "inf" : String.valueOf(dist[i])));
        return sj.toString();
    }

    public static void main(String[] args) {
        // Graph 1: A -> B -> C -> A costs 2 - 4 + 1 = -1, and S can reach it.
        String[] names1 = {"S", "A", "B", "C", "D"};
        int[][] edges1 = {{0, 1, 1}, {1, 2, 2}, {2, 3, -4}, {3, 1, 1}, {3, 4, 1}};
        List<Integer> cycle = findNegativeCycle(5, edges1, 0);
        System.out.println("graph 1 negative cycle reachable: " + !cycle.isEmpty());
        StringJoiner sj = new StringJoiner(" -> ");
        for (int v : cycle) sj.add(names1[v]);
        System.out.println("cycle: " + sj);
        System.out.println("cycle cost: " + cycleCost(edges1, cycle));

        // Graph 2: a negative cycle X <-> Y exists, but S cannot reach it.
        String[] names2 = {"S", "A", "X", "Y"};
        int[][] edges2 = {{0, 1, 1}, {2, 3, -2}, {3, 2, 1}};
        cycle = findNegativeCycle(4, edges2, 0);
        System.out.println("graph 2 negative cycle reachable: " + !cycle.isEmpty());
        System.out.println("graph 2 distances: " + show(names2));
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"How does the Bellman-Ford algorithm work? Implement it in C++ for a directed graph given as an edge list that may contain negative weights, and tell me how you would detect a negative cycle."

**What a strong answer should cover:**
- Relax every edge V - 1 times; why V - 1 (a shortest simple path has at most V - 1 edges) and the round invariant.
- Negative-cycle detection with one extra round, and how to recover the cycle by walking \`parent\` V times.
- O(V × E) time and O(V) extra space; early exit when a round changes nothing; comparison with Dijkstra.
- Only cycles reachable from the source are detected, and the virtual-source trick to find any cycle.
- C++ specifics: a \`struct Edge\`, \`long long\` distances, and the \`dist[u] != INF\` guard is mandatory because \`INF + w\` on a signed type is undefined behaviour.

**Clarifying questions expected:**
- "Can there be a negative cycle, and should I report it or print it?"
- "Is there a limit on the number of edges in a path?"

**Code / implementation expected:** Yes — a C++ \`bellmanFord(n, edges, source)\` over \`vector<Edge>\` returning distances and a negative-cycle flag, ideally with early exit.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph-algorithm background assumed
**Difficulty:** Hard
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A group of travel agents each know only the direct ticket prices out of their own city. Every morning, each agent phones the agents in the cities they fly to and says: "I can get a traveller from home to my city for X; add your ticket price and see if that beats what you have." That is one **round**. After the first morning, everyone one flight away from home knows a price. After the second morning, everyone two flights away does, and so on. If there are n cities, no sensible route uses more than n - 1 flights, so after n - 1 mornings every agent knows the cheapest price, whatever order the calls were made in.

Now add a twist: some routes come with **cashback** (a negative cost). The morning calls still work. But suppose there is a loop of three cities whose tickets, cashback included, add up to less than zero. A traveller could fly the loop forever and get paid every time: the "cheapest price" keeps falling, morning after morning, and never settles. The agents notice that something is still changing on morning n, and that is the alarm.

That is the Bellman-Ford algorithm: simple rounds of "relax every edge", correct even with negative edge weights, and able to detect a **negative cycle**. It is slower than [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work), but it works where Dijkstra fails. The same rounds-of-gossip idea runs real networks: RFC 2453 describes the RIP routing protocol as "based on the Bellman-Ford (or distance vector) algorithm" ([RFC 2453](https://www.rfc-editor.org/rfc/rfc2453)). The algorithm is named after Richard Bellman, who published it in "On a routing problem" (Quarterly of Applied Mathematics 16, 1958), and Lester Ford Jr.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can weights be negative? | If not, [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) is much faster: O((V + E) log V) instead of O(V × E). |
| Can there be a negative cycle, and what should happen then? | Shortest distances are undefined through it. Usually you report "negative cycle", sometimes you must print the cycle. |
| Should I detect any negative cycle, or only one reachable from the source? | A plain run from the source only sees reachable cycles. For any cycle, start every node at distance 0 (a virtual source). |
| Is there a limit on the number of edges (stops) in a path? | Then you need the round-by-round variant that relaxes from a copy of the previous round, as in [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops). |
| How big is the graph? | O(V × E) is fine for thousands of edges, too slow for millions. |

## 3. The Core Idea: Relax Every Edge, V - 1 Times

Every shortest-path algorithm is built from **edge relaxation** (defined on the [Dijkstra page](/interview-question/how-does-dijkstra-s-algorithm-work)): for an edge u → v with weight w, if \`dist[u] + w < dist[v]\`, lower \`dist[v]\` to \`dist[u] + w\`. Dijkstra relaxes edges in a clever order so each edge is relaxed once. Bellman-Ford does not try to be clever: it relaxes **every edge**, in any order, and repeats that whole pass V - 1 times, where V is the number of nodes.

📌 **Interview term: Bellman-Ford algorithm** — single-source shortest paths that allows negative edge weights: start with \`dist[source] = 0\` and every other distance infinite, then relax all E edges, V - 1 times. O(V × E) time.

Why V - 1 rounds? A shortest path never needs to repeat a node (if there is no negative cycle, a repeated node means a loop you could cut out without making the path more expensive). A path with no repeated node visits at most V nodes, so it has at most **V - 1 edges**.

📌 **Interview term: Round invariant** — after round k, every node whose shortest path uses at most k edges already has its correct distance. Round 1 fixes the first edge of every path, round 2 the second, and so on.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 130" role="img" aria-label="Rounds of Bellman-Ford, after round k every shortest path with at most k edges is correct, an extra round checks for negative cycles">
  <defs>
    <marker id="bf2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="120" height="70" rx="10"/>
  <text class="d-text" x="80" y="59" text-anchor="middle">round 1</text>
  <text class="d-sub" x="80" y="81" text-anchor="middle">up to 1 edge</text>
  <rect class="d-box" x="170" y="30" width="120" height="70" rx="10"/>
  <text class="d-text" x="230" y="59" text-anchor="middle">round 2</text>
  <text class="d-sub" x="230" y="81" text-anchor="middle">up to 2 edges</text>
  <rect class="d-box" x="320" y="30" width="120" height="70" rx="10"/>
  <text class="d-text" x="380" y="59" text-anchor="middle">round 3</text>
  <text class="d-sub" x="380" y="81" text-anchor="middle">up to 3 edges</text>
  <rect class="d-box" x="470" y="30" width="120" height="70" rx="10"/>
  <text class="d-text" x="530" y="59" text-anchor="middle">round 4</text>
  <text class="d-sub" x="530" y="81" text-anchor="middle">up to 4 edges</text>
  <rect class="d-box-accent" x="620" y="30" width="140" height="70" rx="10"/>
  <text class="d-text" x="690" y="59" text-anchor="middle">extra round</text>
  <text class="d-sub" x="690" y="81" text-anchor="middle">change means cycle</text>
  <path class="d-edge" d="M 144 65 L 164 65" marker-end="url(#bf2-arrow)"/>
  <path class="d-edge" d="M 294 65 L 314 65" marker-end="url(#bf2-arrow)"/>
  <path class="d-edge" d="M 444 65 L 464 65" marker-end="url(#bf2-arrow)"/>
  <path class="d-edge" d="M 594 65 L 614 65" marker-end="url(#bf2-arrow)"/>
</svg>

Why does round k fix the k-th edge? Take a shortest path S → x1 → x2 → … → v. By the invariant, after round k - 1 the node just before v already has its correct distance. During round k the pass relaxes every edge, including the last edge of this path, so v gets its correct distance too. The order of edges inside a round does not matter for correctness; it only decides whether you get lucky and finish early.

📌 **Interview term: Early exit** — if a whole round changes nothing, no later round can change anything either (every round reads the same distances and would make the same no-op checks), so you can stop.

## 4. Walking Through an Example

The examples use this graph, with source S. The chain S → A → B → C → D is the cheapest way to everything; the long edges are tempting but more expensive shortcuts, and B → C has a negative weight.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 320" role="img" aria-label="Example graph S A B C D in a row, chain edges S to A 1, A to B 3, B to C minus 1, C to D 2, plus longer shortcut edges">
  <defs>
    <marker id="bf1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 84 170 L 180 170" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="132" y="159" text-anchor="middle">1</text>
  <path class="d-edge" d="M 234 170 L 330 170" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="282" y="159" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 384 170 L 480 170" marker-end="url(#bf1-arrow)"/>
  <text class="d-text d-accent" x="432" y="159" text-anchor="middle">-1</text>
  <path class="d-edge" d="M 534 170 L 630 170" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="582" y="159" text-anchor="middle">2</text>
  <path class="d-edge" d="M 60 146 L 60 110 L 350 110 L 350 140" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="200" y="102" text-anchor="middle">6</text>
  <path class="d-edge" d="M 220 146 L 220 50 L 660 50 L 660 140" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="450" y="42" text-anchor="middle">9</text>
  <path class="d-edge" d="M 60 194 L 60 260 L 510 260 L 510 200" marker-end="url(#bf1-arrow)"/>
  <text class="d-sub" x="290" y="280" text-anchor="middle">10</text>
  <circle class="d-box" cx="60" cy="170" r="24"/>
  <text class="d-text" x="60" y="175" text-anchor="middle">S</text>
  <circle class="d-box" cx="210" cy="170" r="24"/>
  <text class="d-text" x="210" y="175" text-anchor="middle">A</text>
  <circle class="d-box" cx="360" cy="170" r="24"/>
  <text class="d-text" x="360" y="175" text-anchor="middle">B</text>
  <circle class="d-box" cx="510" cy="170" r="24"/>
  <text class="d-text" x="510" y="175" text-anchor="middle">C</text>
  <circle class="d-box" cx="660" cy="170" r="24"/>
  <text class="d-text" x="660" y="175" text-anchor="middle">D</text>
</svg>

The direct edges are S→A 1, S→B 6, S→C 10, A→B 3, A→D 9, B→C -1 and C→D 2. True answers: A = 1, B = 1 + 3 = 4, C = 4 - 1 = 3, D = 3 + 2 = 5.

**Worst order.** Example 1 first lists the edges from the far end back towards S: C→D, B→C, A→B, S→A, then the shortcuts. In round 1 the chain edges are relaxed before their start node has a distance, so only S's own edges and A→D do anything. Each round moves the correct value one step further along the chain:

| After round | S | A | B | C | D |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 0 | 1 | 6 | 10 | 10 |
| 2 | 0 | 1 | 4 | 5 | 10 |
| 3 | 0 | 1 | 4 | 3 | 7 |
| 4 | 0 | 1 | 4 | 3 | 5 |

That needed all V - 1 = 4 rounds. **Good order.** Listing the same edges outward from S (S's edges first, then A's, then B's, then C's), the first round already settles everything, because each edge is relaxed after its start node got its final value. Round 2 changes nothing, so the loop stops early:

~~~text
round 1: S=0 A=1 B=4 C=3 D=5
round 2: S=0 A=1 B=4 C=3 D=5
rounds used: 2, successful relaxations: 7, negative cycle: false
~~~

Notice something subtle in that good-order run: after round 1, D = 5 already, through a path of **four** edges. Because relaxations happen in place, a single round can push a value along several edges. That is harmless for plain shortest paths (values only get closer to the truth), but it breaks problems that limit the number of edges, such as [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops); there, each round must read from a **copy** of the previous round's distances.

If you sort the edges by a topological order of a DAG (a directed graph with no cycles), one round is always enough; that is the "shortest path in a DAG" trick.

## 5. Negative Cycles: Detecting Them and Printing One

📌 **Interview term: Negative cycle** — a cycle whose edge weights add up to less than zero. Going around it once more always makes the path cheaper, so nodes reachable from it have no shortest distance (it is minus infinity).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 290" role="img" aria-label="Negative cycle A to B to C and back to A with total cost minus 1, reachable from S, and D hangs off C">
  <defs>
    <marker id="bf3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 94 140 L 210 140" marker-end="url(#bf3-arrow)"/>
  <text class="d-sub" x="152" y="129" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 261 128 L 374 65" marker-end="url(#bf3-arrow)"/>
  <text class="d-text d-accent" x="310" y="87" text-anchor="middle">2</text>
  <path class="d-edge-accent" d="M 400 74 L 400 200" marker-end="url(#bf3-arrow)"/>
  <text class="d-text d-accent" x="420" y="141" text-anchor="middle">-4</text>
  <path class="d-edge-accent" d="M 379 218 L 266 155" marker-end="url(#bf3-arrow)"/>
  <text class="d-text d-accent" x="315" y="204" text-anchor="middle">1</text>
  <path class="d-edge" d="M 424 230 L 550 230" marker-end="url(#bf3-arrow)"/>
  <text class="d-sub" x="487" y="219" text-anchor="middle">1</text>
  <circle class="d-box" cx="70" cy="140" r="24"/>
  <text class="d-text" x="70" y="145" text-anchor="middle">S</text>
  <circle class="d-box-accent" cx="240" cy="140" r="24"/>
  <text class="d-text" x="240" y="145" text-anchor="middle">A</text>
  <circle class="d-box-accent" cx="400" cy="50" r="24"/>
  <text class="d-text" x="400" y="55" text-anchor="middle">B</text>
  <circle class="d-box-accent" cx="400" cy="230" r="24"/>
  <text class="d-text" x="400" y="235" text-anchor="middle">C</text>
  <circle class="d-box" cx="580" cy="230" r="24"/>
  <text class="d-text" x="580" y="235" text-anchor="middle">D</text>
</svg>

Here A → B → C → A costs 2 - 4 + 1 = -1. Every lap lowers the distances of A, B, C, and of D, which hangs off C.

**Detection.** If there is no reachable negative cycle, all distances are final after V - 1 rounds. So run **one more round**: if any edge can still be relaxed, a negative cycle is reachable from the source.

**Finding the cycle.** Keep a \`parent\` array (who last improved each node). In the extra round, remember the last node \`x\` that improved. \`x\` is either on the cycle or downstream of it. Walk \`x = parent[x]\` V times: that is enough steps to be sure you are standing on the cycle. Then follow \`parent\` from there until you come back to the same node, collecting the nodes, and reverse the list. Example 2 prints:

~~~text
graph 1 negative cycle reachable: true
cycle: B -> C -> A -> B
cycle cost: -1
~~~

The cycle is printed starting from B because that is where the walk landed; it is the same cycle as A → B → C → A.

**Only reachable cycles.** Bellman-Ford from a source never relaxes an edge whose start is still at infinity, so a negative cycle the source cannot reach is invisible, and that is correct: it does not affect any distance from the source. Example 2's second graph has a negative cycle X ↔ Y that S cannot reach:

~~~text
graph 2 negative cycle reachable: false
graph 2 distances: S=0 A=1 X=inf Y=inf
~~~

To find **any** negative cycle in the whole graph, start every node at distance 0 instead of infinity. That is the same as adding a virtual source with a 0-weight edge to every node.

📌 **Interview term: Arbitrage detection** — the classic application: with currency exchange rates as edges, use weight \`-log(rate)\`. A cycle of trades that multiplies your money (product of rates greater than 1) becomes a cycle whose weights sum to less than 0, which Bellman-Ford detects.

## 6. The Code in C++

The edges are a \`vector<Edge>\` with \`struct Edge { int u, v, w; }\`; Bellman-Ford never needs an adjacency list because every round looks at every edge. Distances are \`long long\`, with \`INF = numeric_limits<long long>::max()\` meaning unreachable. The guard \`dist[u] != INF\` is **mandatory**: \`INF + w\` would be signed integer overflow, which is undefined behaviour in C++, not just a wrong number. Unlike Java, there is no guaranteed wrap-around to quote here, because the compiler is allowed to assume it never happens.

~~~cpp
Result bellmanFord(int n, const vector<Edge>& edges, int source, bool trace) {
    Result r{vector<long long>(n, INF), vector<int>(n, -1), 0, 0, false};
    r.dist[source] = 0;
    for (int round = 1; round < n; round++) {          // at most n - 1 rounds
        bool changed = false;
        for (const Edge& e : edges) {
            // the INF guard matters: INF + w would be signed overflow (undefined behaviour)
            if (r.dist[e.u] != INF && r.dist[e.u] + e.w < r.dist[e.v]) {
                r.dist[e.v] = r.dist[e.u] + e.w;
                r.parent[e.v] = e.u;
                r.relaxations++;
                changed = true;
            }
        }
        if (trace) cout << "round " << round << ": " << show(r.dist) << "\\n";
        if (!changed) { r.rounds = round; return r; }
    }
    r.rounds = n - 1;
    // one extra pass: if anything still improves, a negative cycle is reachable
    for (const Edge& e : edges)
        if (r.dist[e.u] != INF && r.dist[e.u] + e.w < r.dist[e.v]) r.hasCycle = true;
    return r;
}
~~~

**Line by line:**

- The function returns a small \`Result\` struct (distances, parents, rounds used, relaxations, cycle flag), built with aggregate initialisation.
- \`for (int round = 1; round < n; round++)\` runs at most n - 1 rounds; \`for (const Edge& e : edges)\` visits each edge without copying it.
- \`if (r.dist[e.u] != INF && r.dist[e.u] + e.w < r.dist[e.v])\`: the first test prevents the undefined overflow; \`e.w\` is an \`int\` and is converted to \`long long\` in the addition.
- \`changed\` gives the early exit; the extra loop after the rounds sets \`hasCycle\`.
- \`cout << boolalpha\` in \`main\` prints \`bool\` values as \`true\` / \`false\` instead of \`1\` / \`0\`, so the output matches the other languages.

The cycle finder used by Example 2:

~~~cpp
// Bellman-Ford with an n-th round. Fills dist and returns the cycle (empty if none is reachable).
vector<int> findNegativeCycle(int n, const vector<Edge>& edges, int source, vector<long long>& dist) {
    dist.assign(n, INF);
    vector<int> parent(n, -1);
    dist[source] = 0;
    int last = -1;
    for (int round = 0; round < n; round++) {      // n rounds: the n-th one only detects
        last = -1;
        for (const Edge& e : edges)
            if (dist[e.u] != INF && dist[e.u] + e.w < dist[e.v]) {
                dist[e.v] = dist[e.u] + e.w;
                parent[e.v] = e.u;
                last = e.v;
            }
    }
    vector<int> cycle;
    if (last == -1) return cycle;
    // Walk back n times so we are certainly standing on the cycle, not on a tail leading into it.
    int x = last;
    for (int i = 0; i < n; i++) x = parent[x];
    cycle.push_back(x);
    for (int y = parent[x]; y != x; y = parent[y]) cycle.push_back(y);
    cycle.push_back(x);
    reverse(cycle.begin(), cycle.end());
    return cycle;
}
~~~

\`findNegativeCycle\` runs n rounds instead of n - 1, remembers the last improved node in the final round, walks \`parent\` n times to be sure it is on the cycle, collects the cycle into a \`vector<int>\`, and reverses it with \`std::reverse\`.

## 7. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Bellman-Ford round by round, worst and best edge order** prints:

~~~text
round 1: S=0 A=1 B=6 C=10 D=10
round 2: S=0 A=1 B=4 C=5 D=10
round 3: S=0 A=1 B=4 C=3 D=7
round 4: S=0 A=1 B=4 C=3 D=5
rounds used: 4, successful relaxations: 9, negative cycle: false
B = 4 via S -> A -> B
C = 3 via S -> A -> B -> C
D = 5 via S -> A -> B -> C -> D
round 1: S=0 A=1 B=4 C=3 D=5
round 2: S=0 A=1 B=4 C=3 D=5
rounds used: 2, successful relaxations: 7, negative cycle: false
~~~

**Example 2 — Detecting and printing a negative cycle** prints:

~~~text
graph 1 negative cycle reachable: true
cycle: B -> C -> A -> B
cycle cost: -1
graph 2 negative cycle reachable: false
graph 2 distances: S=0 A=1 X=inf Y=inf
~~~

**What the numbers show:** Example 1 confirms the round table from section 4 (four rounds in the worst order, every value one step further each round) and the early exit in the good order, and prints the paths found through \`parent\`. Example 2 finds and prints the reachable cycle with its cost, and ignores a negative cycle the source cannot reach.

## 8. Complexity

| | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Bellman-Ford | O(V × E) | O(V) | V - 1 rounds, each relaxing all E edges; \`dist\` and \`parent\` hold V values |
| With early exit | O(k × E) | O(V) | stops after at most k + 1 rounds, where k is the most edges any shortest path needs |
| Negative-cycle check | + O(E) | O(V) | one extra round; printing the cycle walks at most 2V parents |

The double loop walks a contiguous \`vector<Edge>\`, which is cache-friendly, but the V × E checks are still the cost to worry about; prefer Dijkstra when weights are non-negative.

**Bellman-Ford vs Dijkstra in one table:**

| | Dijkstra | Bellman-Ford |
| :--- | :--- | :--- |
| Negative weights | wrong answers | correct |
| Negative cycles | cannot detect | detects (reachable ones) |
| Time | O((V + E) log V) | O(V × E) |
| Order of work | greedy, closest node first | every edge, every round |

For distances between **all** pairs, see [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work), which also handles negative weights. See [Big-O notation](/interview-question/what-is-big-o-notation) if the notation is new.

## 9. Edge Cases

- **No negative edges at all:** still correct, just slower than Dijkstra.
- **Unreachable nodes:** stay at infinity; Example 2 prints \`X=inf Y=inf\`.
- **Single node, no edges:** zero rounds of real work; the answer is \`[0]\`.
- **Negative self-loop** (u → u with w < 0): a one-node negative cycle; the extra round catches it if u is reachable.
- **Zero-weight cycle:** not negative, so not reported; distances still converge.
- **Undirected graph with a negative edge:** an undirected edge is two directed edges, so a negative undirected edge is itself a two-edge negative cycle. Bellman-Ford on undirected graphs only makes sense with non-negative weights.

## Common Pitfalls

- **Dropping the \`dist[u] != INF\` guard.** \`INF + w\` is signed overflow, which is undefined behaviour; the optimiser may produce any result.
- **\`0x3f3f3f3f\` as infinity with negative weights.** The trick (an \`int\` "infinity" whose double still fits) breaks with negative edges: \`INF + (-5)\` is less than \`INF\`, so unreachable nodes look reachable. Keep the explicit guard.
- **Skipping the extra round.** Without the V-th round you cannot tell "converged" from "a negative cycle is still pulling values down".
- **Reading the cycle straight from the last improved node.** It may be downstream of the cycle (like D in the diagram). Walk \`parent\` n times first.
- **In-place updates when the number of edges is limited.** For "at most k edges", relax from \`auto prev = dist;\` (a copy) each round.
- **Iterating with \`auto e : edges\`.** It copies every \`Edge\`; use \`const Edge& e\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Bellman-Ford relaxes every edge, V - 1 times. After round k every shortest path with at most k edges is correct, and a simple path has at most V - 1 edges.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why use it:</strong> <span style="color:#f0e2c8;">It handles negative edge weights, which break Dijkstra, and it detects negative cycles.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Detection:</strong> <span style="color:#f0e2c8;">One extra round: if any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[u] + w &lt; dist[v]</code> still holds, a negative cycle is reachable. To print it, walk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> V times, then follow it around.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(V × E) time, O(V) extra space with an edge list; stop early when a round changes nothing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;Edge&gt;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> distances, and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[u] != INF</code> guard because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INF + w</code> is undefined behaviour.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why exactly V - 1 rounds?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A shortest path without a negative cycle never repeats a node, so it has at most V - 1 edges, and round k fixes paths of up to k edges. Example 1 with the worst edge order needed all 4 rounds for 5 nodes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the order of edges matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for correctness, only for speed. In Example 1 the same edges listed outward from S finished in 1 round plus 1 confirming round, while the reversed order needed all 4.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you print the negative cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code>, remember the last node improved in the V-th round, walk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> V times to be sure you are on the cycle, then follow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> until you return. Example 2 prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B -&gt; C -&gt; A -&gt; B</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">INF</code> check not optional in C++?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Signed overflow is undefined behaviour, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INF + w</code> is not even guaranteed to wrap. The check also keeps negative weights from making unreachable nodes look reachable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is SPFA?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The Shortest Path Faster Algorithm: a queue-based Bellman-Ford that only re-relaxes edges out of nodes whose distance just changed. Often faster in practice, but its worst case is still O(V × E).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bellman-Ford algorithm** | relax all edges V - 1 times; works with negative weights; O(V × E) |
| **Round invariant** | after round k, every shortest path of at most k edges is correct |
| **Early exit** | stop as soon as a whole round changes nothing |
| **Negative cycle** | a cycle whose weights sum below zero; distances through it are undefined |
| **Arbitrage detection** | exchange rates as \`-log(rate)\` weights; profit loop = negative cycle |

---
**Conclusion:** Bellman-Ford is the patient shortest-path algorithm: relax every edge, V - 1 times, because no simple path has more than V - 1 edges. It accepts negative weights, an extra round detects a reachable negative cycle, and the \`parent\` array lets you print that cycle. In C++ the details that matter are \`long long\` distances and the \`dist[u] != INF\` guard, because signed overflow is undefined behaviour; the price is O(V × E) time, so reach for it when negative weights or cycle detection make Dijkstra unusable. Related: [Dijkstra's algorithm](/interview-question/how-does-dijkstra-s-algorithm-work), [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work), and [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops), the most common interview problem built on Bellman-Ford rounds.`,
        examples: [
          { label: `Bellman-Ford round by round, worst and best edge order`, code: `#include <algorithm>
#include <iostream>
#include <limits>
#include <string>
#include <vector>
using namespace std;

const long long INF = numeric_limits<long long>::max();
const string NAMES = "SABCD";
struct Edge { int u, v, w; };
struct Result { vector<long long> dist; vector<int> parent; int rounds; int relaxations; bool hasCycle; };

string show(const vector<long long>& dist) {
    string s;
    for (size_t i = 0; i < dist.size(); i++)
        s += (i ? " " : "") + string(1, NAMES[i]) + "=" + (dist[i] == INF ? string("inf") : to_string(dist[i]));
    return s;
}

Result bellmanFord(int n, const vector<Edge>& edges, int source, bool trace) {
    Result r{vector<long long>(n, INF), vector<int>(n, -1), 0, 0, false};
    r.dist[source] = 0;
    for (int round = 1; round < n; round++) {          // at most n - 1 rounds
        bool changed = false;
        for (const Edge& e : edges) {
            // the INF guard matters: INF + w would be signed overflow (undefined behaviour)
            if (r.dist[e.u] != INF && r.dist[e.u] + e.w < r.dist[e.v]) {
                r.dist[e.v] = r.dist[e.u] + e.w;
                r.parent[e.v] = e.u;
                r.relaxations++;
                changed = true;
            }
        }
        if (trace) cout << "round " << round << ": " << show(r.dist) << "\\n";
        if (!changed) { r.rounds = round; return r; }
    }
    r.rounds = n - 1;
    // one extra pass: if anything still improves, a negative cycle is reachable
    for (const Edge& e : edges)
        if (r.dist[e.u] != INF && r.dist[e.u] + e.w < r.dist[e.v]) r.hasCycle = true;
    return r;
}

string pathTo(const vector<int>& parent, int v) {
    vector<string> out;
    for (; v != -1; v = parent[v]) out.push_back(string(1, NAMES[v]));
    reverse(out.begin(), out.end());
    string s;
    for (size_t i = 0; i < out.size(); i++) s += (i ? " -> " : "") + out[i];
    return s;
}

int main() {
    const int S = 0, A = 1, B = 2, C = 3, D = 4;
    cout << boolalpha;
    // The edges are deliberately listed from the far end back towards S.
    vector<Edge> worst = {{C, D, 2}, {B, C, -1}, {A, B, 3}, {S, A, 1}, {S, B, 6}, {S, C, 10}, {A, D, 9}};
    Result r = bellmanFord(5, worst, S, true);
    cout << "rounds used: " << r.rounds << ", successful relaxations: " << r.relaxations << ", negative cycle: " << r.hasCycle << "\\n";
    for (int v : {B, C, D}) cout << NAMES[v] << " = " << r.dist[v] << " via " << pathTo(r.parent, v) << "\\n";

    // Same edges, listed outward from S: everything settles in the first round.
    vector<Edge> good = {{S, A, 1}, {S, B, 6}, {S, C, 10}, {A, B, 3}, {A, D, 9}, {B, C, -1}, {C, D, 2}};
    r = bellmanFord(5, good, S, true);
    cout << "rounds used: " << r.rounds << ", successful relaxations: " << r.relaxations << ", negative cycle: " << r.hasCycle << "\\n";
}` },
          { label: `Detecting and printing a negative cycle`, code: `#include <algorithm>
#include <iostream>
#include <limits>
#include <string>
#include <vector>
using namespace std;

const long long INF = numeric_limits<long long>::max();
struct Edge { int u, v, w; };

// Bellman-Ford with an n-th round. Fills dist and returns the cycle (empty if none is reachable).
vector<int> findNegativeCycle(int n, const vector<Edge>& edges, int source, vector<long long>& dist) {
    dist.assign(n, INF);
    vector<int> parent(n, -1);
    dist[source] = 0;
    int last = -1;
    for (int round = 0; round < n; round++) {      // n rounds: the n-th one only detects
        last = -1;
        for (const Edge& e : edges)
            if (dist[e.u] != INF && dist[e.u] + e.w < dist[e.v]) {
                dist[e.v] = dist[e.u] + e.w;
                parent[e.v] = e.u;
                last = e.v;
            }
    }
    vector<int> cycle;
    if (last == -1) return cycle;
    // Walk back n times so we are certainly standing on the cycle, not on a tail leading into it.
    int x = last;
    for (int i = 0; i < n; i++) x = parent[x];
    cycle.push_back(x);
    for (int y = parent[x]; y != x; y = parent[y]) cycle.push_back(y);
    cycle.push_back(x);
    reverse(cycle.begin(), cycle.end());
    return cycle;
}

long long cycleCost(const vector<Edge>& edges, const vector<int>& cycle) {
    long long total = 0;
    for (size_t i = 0; i + 1 < cycle.size(); i++)
        for (const Edge& e : edges)
            if (e.u == cycle[i] && e.v == cycle[i + 1]) total += e.w;
    return total;
}

string show(const vector<string>& names, const vector<long long>& dist) {
    string s;
    for (size_t i = 0; i < dist.size(); i++)
        s += (i ? " " : "") + names[i] + "=" + (dist[i] == INF ? string("inf") : to_string(dist[i]));
    return s;
}

int main() {
    cout << boolalpha;
    vector<long long> dist;
    // Graph 1: A -> B -> C -> A costs 2 - 4 + 1 = -1, and S can reach it.
    vector<string> names1 = {"S", "A", "B", "C", "D"};
    vector<Edge> edges1 = {{0, 1, 1}, {1, 2, 2}, {2, 3, -4}, {3, 1, 1}, {3, 4, 1}};
    vector<int> cycle = findNegativeCycle(5, edges1, 0, dist);
    cout << "graph 1 negative cycle reachable: " << !cycle.empty() << "\\n";
    cout << "cycle: ";
    for (size_t i = 0; i < cycle.size(); i++) cout << (i ? " -> " : "") << names1[cycle[i]];
    cout << "\\n";
    cout << "cycle cost: " << cycleCost(edges1, cycle) << "\\n";

    // Graph 2: a negative cycle X <-> Y exists, but S cannot reach it.
    vector<string> names2 = {"S", "A", "X", "Y"};
    vector<Edge> edges2 = {{0, 1, 1}, {2, 3, -2}, {3, 2, 1}};
    cycle = findNegativeCycle(4, edges2, 0, dist);
    cout << "graph 2 negative cycle reachable: " << !cycle.empty() << "\\n";
    cout << "graph 2 distances: " << show(names2, dist) << "\\n";
}` },
        ],
      },
    },
  },
  {
    title: `When would you use BFS over Dijkstra for shortest paths?`,
    difficulty: "medium",
    seoDescription: `BFS vs Dijkstra for shortest paths in Python, JavaScript, Java and C++: equal weights, 0-1 BFS with a deque, when BFS gives wrong answers, verified code.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You need shortest paths in a graph. When is a plain BFS enough, and when do you need Dijkstra? Show me both in Python and explain what goes wrong if you pick the wrong one."

**What a strong answer should cover:**
- BFS minimises the number of edges; Dijkstra minimises total weight. They agree exactly when all weights are equal (any equal value, not only 1).
- Why BFS is correct there: its FIFO queue already releases nodes in distance order, so the O(log V) heap is unnecessary.
- A concrete counterexample where BFS picks a fewer-edge but more expensive path.
- 0-1 BFS with a deque for weights 0 and 1, and Bellman-Ford when weights can be negative.
- Python specifics: \`collections.deque\` with \`popleft()\` (O(1)) instead of \`list.pop(0)\`, and \`heapq\` for Dijkstra.

**Code / implementation expected:** Yes — a Python BFS with \`collections.deque\` and a Dijkstra with \`heapq\`, ideally plus 0-1 BFS with \`appendleft\`.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph-algorithm background assumed
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are on a metro map and want to get from your stop to a friend's. If every hop between neighbouring stations takes exactly two minutes, the quickest trip is simply the one with the **fewest hops**, and you can find it by looking at all stations one hop away, then all stations two hops away, and so on, like ripples on a pond. That is breadth-first search.

Now the timetable changes: some hops take 2 minutes, one express hop takes 15. "Fewest hops" and "fewest minutes" are no longer the same question. A single 15-minute express hop has fewer hops than three 2-minute hops, but it is slower. Counting ripples no longer works; you have to always extend the trip that is **cheapest so far**, which is Dijkstra's algorithm.

Interviewers ask this question because picking the right tool is half of every shortest-path problem. Grids, word ladders and "minimum number of moves" puzzles have equal-cost steps, and a candidate who reaches for Dijkstra there writes more code for a slower answer. A candidate who uses BFS on a weighted graph gets a wrong answer. The rule fits in one sentence, and this page makes sure you can also explain **why**.

## 2. The Core Distinction

**BFS (breadth-first search)** explores a graph in layers: first the source, then everything one edge away, then everything two edges away. It uses a plain first-in-first-out **queue**. The first time BFS reaches a node, it has reached it with the **fewest possible edges**. The full mechanics are on the [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs) page.

📌 **Interview term: Unweighted graph** — a graph where every edge counts the same (or where edges have no cost at all). The length of a path is just its number of edges.

**Dijkstra's algorithm** always expands the unsettled node with the smallest total **weight** so far, using a **priority queue** (min-heap). It finds the cheapest path when edges have different non-negative weights. The full mechanics are on the [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) page.

So the answer to the question is:

> Use BFS when every edge has the same weight (or no weight). Use Dijkstra when weights differ and none is negative.

📌 **Interview term: Shortest path by edges vs by weight** — BFS minimises the number of edges in the path; Dijkstra minimises the sum of the edge weights. They agree exactly when all weights are equal.

### Why BFS is correct on equal weights

BFS's queue only ever holds nodes at distance d followed by nodes at distance d + 1, never anything else. Every node at distance d is taken out before any node at distance d + 1. So nodes leave the queue **in order of distance**, which is exactly what Dijkstra's priority queue would give you. When all priorities are just "d or d + 1, in that order", a plain queue already **is** a priority queue, only with O(1) operations instead of O(log n).

📌 **Interview term: BFS layer (frontier)** — the set of nodes at the same distance from the source; BFS finishes one layer before starting the next.

### Dijkstra is "BFS with a priority queue"

Put the two side by side and the only real differences are the container and the check:

| | BFS | Dijkstra |
| :--- | :--- | :--- |
| Container | FIFO queue | min-heap of (distance, node) |
| When a node is final | when it is first discovered | when it is popped (non-stale) |
| Update rule | \`if not visited: dist[v] = dist[u] + 1\` | \`if dist[u] + w < dist[v]: dist[v] = dist[u] + w\` |
| Cost per node | O(1) queue operations | O(log V) heap operations |
| Works on | equal weights | any non-negative weights |

## 3. Where BFS Gives the Wrong Answer

As soon as weights differ, "fewest edges" and "cheapest" come apart:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Two routes from A to D, one direct edge costing 10, and a three edge route through B and C costing 1 each">
  <defs>
    <marker id="bd1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge-dashed" d="M 104 120 L 570 120" marker-end="url(#bd1-arrow)"/>
  <text class="d-sub" x="337" y="109" text-anchor="middle">10</text>
  <path class="d-edge-accent" d="M 100 134 L 225 223" marker-end="url(#bd1-arrow)"/>
  <text class="d-text d-accent" x="154" y="195" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 274 240 L 400 240" marker-end="url(#bd1-arrow)"/>
  <text class="d-text d-accent" x="337" y="259" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 450 226 L 575 137" marker-end="url(#bd1-arrow)"/>
  <text class="d-text d-accent" x="521" y="198" text-anchor="middle">1</text>
  <circle class="d-box" cx="80" cy="120" r="24"/>
  <text class="d-text" x="80" y="125" text-anchor="middle">A</text>
  <circle class="d-box" cx="250" cy="240" r="24"/>
  <text class="d-text" x="250" y="245" text-anchor="middle">B</text>
  <circle class="d-box" cx="430" cy="240" r="24"/>
  <text class="d-text" x="430" y="245" text-anchor="middle">C</text>
  <circle class="d-box" cx="600" cy="120" r="24"/>
  <text class="d-text" x="600" y="125" text-anchor="middle">D</text>
  <text class="d-sub" x="340" y="70" text-anchor="middle">BFS route: 1 edge, cost 10</text>
  <text class="d-sub d-accent" x="340" y="200" text-anchor="middle">Dijkstra route: cost 3</text>
</svg>

From A, BFS reaches D directly in its first layer (one edge) and never looks back, so it reports the route A → D, which costs 10. Dijkstra reports A → B → C → D, which costs 3. Example 1 prints both:

~~~text
BFS route:      A -> D (edges 1, cost 10)
Dijkstra route: A -> B -> C -> D (cost 3)
~~~

The BFS answer is not "slightly off": it is the right answer to a different question (fewest edges).

### Equal but not 1

"Equal weights" does not have to mean weight 1. If every edge costs 7, then a path's cost is 7 × (number of edges), and minimising edges minimises cost. Run BFS and multiply at the end. Example 1 checks this on a 5 × 5 maze:

~~~text
maze corner to corner: BFS = 8, Dijkstra = 8
all 25 cells agree: true
weight 7 everywhere: BFS * 7 = 56, Dijkstra = 56
~~~

## 4. The Middle Ground: 0-1 BFS

Some problems have only two kinds of step: free moves (weight 0) and moves that cost one unit (weight 1). Examples: "minimum walls to break to reach the exit", "minimum arrows to flip in a grid", "minimum edge reversals". Plain BFS is wrong here (it would count the free moves too), and Dijkstra works but pays O(log V) per operation. There is a neat trick with the same O(V + E) cost as BFS.

📌 **Interview term: 0-1 BFS** — a shortest-path algorithm for graphs whose weights are only 0 or 1: use a **deque** (double-ended queue); when an edge of weight 0 improves a node, push it to the **front**; when an edge of weight 1 improves it, push it to the **back**.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="A deque for 0-1 BFS, nodes reached by a weight 0 edge go to the front, nodes reached by a weight 1 edge go to the back">
  <defs>
    <marker id="bd3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="160" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="195" y="110" text-anchor="middle">d</text>
  <rect class="d-box-accent" x="240" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="275" y="110" text-anchor="middle">d</text>
  <rect class="d-box-accent" x="320" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="355" y="110" text-anchor="middle">d</text>
  <rect class="d-box" x="400" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="435" y="110" text-anchor="middle">d+1</text>
  <rect class="d-box" x="480" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="515" y="110" text-anchor="middle">d+1</text>
  <text class="d-sub" x="195" y="62" text-anchor="middle">front</text>
  <text class="d-sub" x="515" y="62" text-anchor="middle">back</text>
  <path class="d-edge-accent" d="M 60 190 L 60 105 L 150 105" marker-end="url(#bd3-arrow)"/>
  <text class="d-text d-accent" x="60" y="210" text-anchor="middle">weight 0</text>
  <path class="d-edge" d="M 620 190 L 620 105 L 562 105" marker-end="url(#bd3-arrow)"/>
  <text class="d-text" x="620" y="210" text-anchor="middle">weight 1</text>
</svg>

Why it works: the deque always holds nodes with distance d at the front and d + 1 at the back, like BFS layers. A weight-0 edge produces another node at distance d, so it belongs at the front with its layer; a weight-1 edge produces distance d + 1, which belongs at the back. The front of the deque is therefore always a node with the smallest distance, exactly as a heap would give, without the heap.

📌 **Interview term: Deque (double-ended queue)** — a queue that supports adding and removing at both ends in O(1).

Example 2 runs 0-1 BFS and Dijkstra on a grid where stepping onto a wall \`#\` costs 1 and stepping onto \`.\` is free:

~~~text
walls to break, 0-1 BFS:  1
walls to break, Dijkstra: 1
every cell agrees: true
~~~

Plain BFS on the same grid answers \`8\`, the fewest steps, which is not what was asked. Note one difference from plain BFS: a node can be improved (and pushed) more than once, so 0-1 BFS must check \`dist[u] + w < dist[v]\` like Dijkstra, not just "visited or not".

Beyond 0 and 1: if weights are small integers (say 1 to 5), you can split each edge of weight k into k unit edges with dummy nodes and run BFS, or use a bucket queue (Dial's algorithm). For anything else, Dijkstra.

## 5. Decision Guide

<svg class="iq-diagram" width="100%" viewBox="0 0 780 260" role="img" aria-label="Choosing an algorithm by edge weights, equal weights use BFS, weights 0 or 1 use 0-1 BFS, non-negative use Dijkstra, negative use Bellman-Ford">
  <defs>
    <marker id="bd2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="240" y="10" width="300" height="50" rx="10"/>
  <text class="d-text" x="390" y="40" text-anchor="middle">What do the edges cost?</text>
  <path class="d-edge" d="M 390 60 L 97 150" marker-end="url(#bd2-arrow)"/>
  <path class="d-edge" d="M 390 60 L 292 150" marker-end="url(#bd2-arrow)"/>
  <path class="d-edge" d="M 390 60 L 487 150" marker-end="url(#bd2-arrow)"/>
  <path class="d-edge" d="M 390 60 L 682 150" marker-end="url(#bd2-arrow)"/>
  <rect class="d-box-accent" x="20" y="160" width="155" height="70" rx="10"/>
  <text class="d-text" x="97" y="189" text-anchor="middle">BFS</text>
  <text class="d-sub" x="97" y="211" text-anchor="middle">all weights equal</text>
  <rect class="d-box" x="215" y="160" width="155" height="70" rx="10"/>
  <text class="d-text" x="292" y="189" text-anchor="middle">0-1 BFS</text>
  <text class="d-sub" x="292" y="211" text-anchor="middle">weights 0 or 1</text>
  <rect class="d-box" x="410" y="160" width="155" height="70" rx="10"/>
  <text class="d-text" x="487" y="189" text-anchor="middle">Dijkstra</text>
  <text class="d-sub" x="487" y="211" text-anchor="middle">any non-negative</text>
  <rect class="d-box-muted" x="605" y="160" width="155" height="70" rx="10"/>
  <text class="d-text" x="682" y="189" text-anchor="middle">Bellman-Ford</text>
  <text class="d-sub" x="682" y="211" text-anchor="middle">some negative</text>
</svg>

| Edge weights | Algorithm | Time |
| :--- | :--- | :--- |
| none, or all equal | BFS (multiply by the weight at the end) | O(V + E) |
| only 0 or 1 | 0-1 BFS with a deque | O(V + E) |
| non-negative, different | Dijkstra with a min-heap | O((V + E) log V) |
| some negative | [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work) | O(V × E) |
| all pairs, small graph | [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work) | O(V³) |

Problems where BFS is the intended answer because every move costs the same: [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) style grid walks, [rotting oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs) (multi-source BFS), and [word ladder](/interview-question/how-do-you-solve-the-word-ladder-problem). Problems where weights differ and Dijkstra is intended: network delay time, path with minimum effort, and variants of [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops).

## 6. The Code in Python

For BFS, Python's \`collections.deque\` is the right container: \`append\` and \`popleft\` are both O(1). A plain \`list\` used as a queue with \`pop(0)\` has to shift every remaining element one position left, because a list is a dynamic array, so each pop is O(n). For Dijkstra, \`heapq\` treats a \`list\` as a binary min-heap of \`(distance, node)\` tuples.

~~~python
def bfs(graph, source):
    """Fewest edges from source. Each node enters the queue once."""
    dist = [INF] * len(graph)
    parent = [-1] * len(graph)
    dist[source] = 0
    queue = deque([source])
    while queue:
        u = queue.popleft()
        for v, _w in graph[u]:          # BFS ignores the weight
            if dist[v] == INF:
                dist[v] = dist[u] + 1
                parent[v] = u
                queue.append(v)
    return dist, parent
~~~

~~~python
def dijkstra(graph, source):
    """Cheapest total weight from source."""
    dist = [INF] * len(graph)
    parent = [-1] * len(graph)
    dist[source] = 0
    heap = [(0, source)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        for v, w in graph[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                parent[v] = u
                heapq.heappush(heap, (dist[v], v))
    return dist, parent
~~~

The two functions have the same shape. BFS ignores the weight (\`for v, _w in graph[u]\`) and finalises a node the moment it is first seen (\`if dist[v] == INF\`). Dijkstra adds \`d + w\`, may improve a node several times, and uses the stale check \`if d > dist[u]: continue\` because \`heapq\` cannot update an entry in place.

0-1 BFS needs a deque you can push to at both ends: \`deque.appendleft\` for weight-0 edges, \`deque.append\` for weight-1 edges, \`popleft\` to take the next node.

~~~python
def zero_one_bfs(source):
    dist = [INF] * (H * W)
    dist[source] = 0
    dq = deque([source])
    pops = 0
    while dq:
        u = dq.popleft()
        pops += 1
        for v, w in neighbours(u):
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                if w == 0:
                    dq.appendleft(v)    # free step: same distance, goes to the front
                else:
                    dq.append(v)        # costs 1: goes to the back
    return dist, pops
~~~

\`divmod(cell, W)\` turns a cell number back into \`(row, column)\` in one call. The neighbour generator \`neighbours(cell)\` yields \`(next_cell, weight)\` pairs, with weight 1 for a wall.

## 7. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — BFS and Dijkstra on equal and unequal weights** prints:

~~~text
maze corner to corner: BFS = 8, Dijkstra = 8
all 25 cells agree: true
weight 7 everywhere: BFS * 7 = 56, Dijkstra = 56
BFS route:      A -> D (edges 1, cost 10)
Dijkstra route: A -> B -> C -> D (cost 3)
~~~

**Example 2 — 0-1 BFS with a deque versus Dijkstra** prints:

~~~text
walls to break, 0-1 BFS:  1
walls to break, Dijkstra: 1
every cell agrees: true
deque pops: 25, heap pops: 25
plain BFS fewest steps: 8 (answers a different question)
~~~

**What the numbers show:** Example 1 shows BFS and Dijkstra agreeing on every cell of an equal-weight maze (and still agreeing after scaling every weight to 7), then BFS picking the fewer-edge but more expensive route once weights differ. Example 2 shows 0-1 BFS matching Dijkstra on a 0/1-weight grid with the same number of removals (25 each here), while plain BFS answers a different question.

## 8. Complexity

| Algorithm | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| BFS | O(V + E) | O(V) | each node enters the queue once, each edge is checked once |
| 0-1 BFS | O(V + E) | O(V) | deque operations are O(1); a node is improved only a bounded number of times |
| Dijkstra (binary heap) | O((V + E) log V) | O(V + E) | every push and pop on the heap is O(log V) |

On a grid with R rows and C columns, V = R × C and E is about 4 × R × C, so BFS is O(R × C). See [Big-O notation](/interview-question/what-is-big-o-notation) for the notation.

## 9. Edge Cases

- **Source equals target:** distance 0 in both algorithms.
- **Unreachable target:** both leave it at infinity; decide with the interviewer what to return (often -1).
- **Walls or blocked cells:** never add them to the queue (Example 1's maze), or give them a cost (Example 2's grid). These are different problems.
- **Multiple sources:** put all sources in the BFS queue at distance 0 to start ([rotting oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs)); the same works for Dijkstra's heap.
- **Weight 0 everywhere:** every reachable node has distance 0; any traversal finds that.
- **Negative weights:** neither BFS nor Dijkstra; use [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work).

## Common Pitfalls

- **BFS on a weighted graph.** It returns the fewest-edges path, not the cheapest (\`cost 10\` instead of \`cost 3\` in Example 1).
- **\`list.pop(0)\` as a queue.** Every call shifts the whole list, turning O(V + E) BFS into O(V²). Use \`collections.deque.popleft()\`.
- **Marking visited on pop instead of on push in BFS.** The same node gets queued many times; mark (or set \`dist\`) when you append.
- **"Visited" logic in 0-1 BFS.** A node first reached through a weight-1 edge can later be improved through a weight-0 edge; compare distances, do not block on "already seen".
- **Using Dijkstra on a grid of equal steps.** Correct, but more code and an extra log factor; interviewers notice.
- **Forgetting that equal weight 7 is still BFS.** Multiply the edge count by 7 at the end.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;">BFS when every edge costs the same (or nothing); Dijkstra when weights differ and none is negative.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why BFS works:</strong> <span style="color:#f0e2c8;">A FIFO queue releases nodes in order of distance when every edge adds the same amount, so it already behaves like Dijkstra's heap, at O(1) per operation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it fails otherwise:</strong> <span style="color:#f0e2c8;">BFS minimises edges, not cost: on A → D costing 10 versus A → B → C → D costing 3 it picks the 10.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The middle case:</strong> <span style="color:#f0e2c8;">Weights 0 or 1: 0-1 BFS with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque.appendleft</code> for 0 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code> for 1, still O(V + E).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Complexity:</strong> <span style="color:#f0e2c8;">BFS and 0-1 BFS are O(V + E); Dijkstra with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> is O((V + E) log V); negative weights need Bellman-Ford.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">All edges cost 5. BFS or Dijkstra?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS, then multiply the number of edges by 5. Equal weights preserve the order of paths by edge count. Example 1 shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BFS * 7 = 56</code> matching Dijkstra's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">56</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you just run BFS and add up the weights along its path?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. BFS chooses the path with the fewest edges before looking at weights; adding them afterwards gives that path's cost, not the cheapest cost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not always use Dijkstra to be safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is correct on equal weights too, but costs an extra log factor and more code. On a 10^6-cell grid that difference is real, and interviewers expect you to notice the cheaper tool.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In 0-1 BFS, can a node be popped twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, if it is improved after being pushed. That is why the update checks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[u] + w &lt; dist[v]</code> instead of a visited set; each node can be improved only a bounded number of times, so the total stays O(V + E).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">deque</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">list</code> for BFS in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.pop(0)</code> shifts every element, O(n) per pop; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque.popleft()</code> is O(1).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Unweighted graph** | every edge counts the same; path length is the number of edges |
| **Shortest path by edges vs by weight** | BFS minimises edge count, Dijkstra minimises weight sum |
| **BFS layer (frontier)** | all nodes at the same distance from the source |
| **0-1 BFS** | weights 0 or 1: deque, push front for 0 and back for 1, O(V + E) |
| **Deque (double-ended queue)** | add and remove at both ends in O(1) |

---
**Conclusion:** Use BFS for shortest paths whenever every edge costs the same: its FIFO queue already hands out nodes in distance order, so it gives Dijkstra's answer in O(V + E). Use Dijkstra when weights differ (and are non-negative), 0-1 BFS when they are only 0 or 1, and Bellman-Ford when some are negative. In Python that means \`collections.deque\` for BFS and 0-1 BFS, \`heapq\` for Dijkstra, and never \`list.pop(0)\`.`,
        examples: [
          { label: `BFS and Dijkstra on equal and unequal weights`, code: `from collections import deque
import heapq

INF = float("inf")


def bfs(graph, source):
    """Fewest edges from source. Each node enters the queue once."""
    dist = [INF] * len(graph)
    parent = [-1] * len(graph)
    dist[source] = 0
    queue = deque([source])
    while queue:
        u = queue.popleft()
        for v, _w in graph[u]:          # BFS ignores the weight
            if dist[v] == INF:
                dist[v] = dist[u] + 1
                parent[v] = u
                queue.append(v)
    return dist, parent


def dijkstra(graph, source):
    """Cheapest total weight from source."""
    dist = [INF] * len(graph)
    parent = [-1] * len(graph)
    dist[source] = 0
    heap = [(0, source)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        for v, w in graph[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                parent[v] = u
                heapq.heappush(heap, (dist[v], v))
    return dist, parent


def grid_graph(rows, weight):
    h, w = len(rows), len(rows[0])
    graph = [[] for _ in range(h * w)]
    for r in range(h):
        for c in range(w):
            if rows[r][c] == "#":
                continue
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < h and 0 <= nc < w and rows[nr][nc] != "#":
                    graph[r * w + c].append((nr * w + nc, weight))
    return graph


# 1. An unweighted maze: every step costs the same, so BFS is enough.
maze = ["..#..",
        ".##..",
        "...#.",
        "#....",
        "..#.."]
g = grid_graph(maze, 1)
b, _ = bfs(g, 0)
d, _ = dijkstra(g, 0)
print("maze corner to corner: BFS = " + str(b[24]) + ", Dijkstra = " + str(d[24]))
print("all " + str(len(g)) + " cells agree: " + str(b == d).lower())

# 2. Every edge costs 7: BFS edge count times 7 is still the answer.
g7 = grid_graph(maze, 7)
d7, _ = dijkstra(g7, 0)
print("weight 7 everywhere: BFS * 7 = " + str(b[24] * 7) + ", Dijkstra = " + str(d7[24]))

# 3. Different weights: BFS finds the fewest edges, not the cheapest route.
names = "ABCD"
road = [[(3, 10), (1, 1)], [(2, 1)], [(3, 1)], []]   # A->D costs 10, A->B->C->D costs 3


def route(parent, v):
    out = []
    while v != -1:
        out.append(names[v])
        v = parent[v]
    return " -> ".join(reversed(out))


def cost(path_parent, v):
    total = 0
    while path_parent[v] != -1:
        u = path_parent[v]
        total += next(w for x, w in road[u] if x == v)
        v = u
    return total


bd, bp = bfs(road, 0)
dd, dp = dijkstra(road, 0)
print("BFS route:      " + route(bp, 3) + " (edges " + str(bd[3]) + ", cost " + str(cost(bp, 3)) + ")")
print("Dijkstra route: " + route(dp, 3) + " (cost " + str(dd[3]) + ")")` },
          { label: `0-1 BFS with a deque versus Dijkstra`, code: `from collections import deque
import heapq

INF = float("inf")
# Walk from the top-left to the bottom-right corner. Stepping onto "." is free,
# stepping onto "#" means breaking a wall and costs 1. Edge weights are only 0 or 1.
GRID = [".#...",
        ".#.#.",
        "...#.",
        "##.##",
        "...#."]
H, W = len(GRID), len(GRID[0])
DIRS = ((1, 0), (-1, 0), (0, 1), (0, -1))


def neighbours(cell):
    r, c = divmod(cell, W)
    for dr, dc in DIRS:
        nr, nc = r + dr, c + dc
        if 0 <= nr < H and 0 <= nc < W:
            yield nr * W + nc, (1 if GRID[nr][nc] == "#" else 0)


def zero_one_bfs(source):
    dist = [INF] * (H * W)
    dist[source] = 0
    dq = deque([source])
    pops = 0
    while dq:
        u = dq.popleft()
        pops += 1
        for v, w in neighbours(u):
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                if w == 0:
                    dq.appendleft(v)    # free step: same distance, goes to the front
                else:
                    dq.append(v)        # costs 1: goes to the back
    return dist, pops


def dijkstra(source):
    dist = [INF] * (H * W)
    dist[source] = 0
    heap = [(0, source)]
    pops = 0
    while heap:
        d, u = heapq.heappop(heap)
        pops += 1
        if d > dist[u]:
            continue
        for v, w in neighbours(u):
            if d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(heap, (dist[v], v))
    return dist, pops


def plain_bfs_steps(source, target):
    """Plain BFS counts steps, which is a different question."""
    dist = [INF] * (H * W)
    dist[source] = 0
    q = deque([source])
    while q:
        u = q.popleft()
        for v, _ in neighbours(u):
            if dist[v] == INF:
                dist[v] = dist[u] + 1
                q.append(v)
    return dist[target]


target = H * W - 1
z, zpops = zero_one_bfs(0)
d, dpops = dijkstra(0)
print("walls to break, 0-1 BFS:  " + str(z[target]))
print("walls to break, Dijkstra: " + str(d[target]))
print("every cell agrees: " + str(z == d).lower())
print("deque pops: " + str(zpops) + ", heap pops: " + str(dpops))
print("plain BFS fewest steps: " + str(plain_bfs_steps(0, target)) + " (answers a different question)")` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You need shortest paths in a graph. When is a plain BFS enough, and when do you need Dijkstra? Show me both in JavaScript and explain what goes wrong if you pick the wrong one."

**What a strong answer should cover:**
- BFS minimises the number of edges; Dijkstra minimises total weight. They agree exactly when all weights are equal (any equal value, not only 1).
- Why BFS is correct there: its FIFO queue already releases nodes in distance order, so the O(log V) heap is unnecessary.
- A concrete counterexample where BFS picks a fewer-edge but more expensive path.
- 0-1 BFS with a deque for weights 0 and 1, and Bellman-Ford when weights can be negative.
- JavaScript specifics: an array plus a head index as a queue (not \`shift()\`), a hand-written heap for Dijkstra, and a small deque for 0-1 BFS since there is no built-in one.

**Code / implementation expected:** Yes — a JavaScript BFS with an array queue and head pointer, a Dijkstra with a binary heap, ideally plus 0-1 BFS.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph-algorithm background assumed
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are on a metro map and want to get from your stop to a friend's. If every hop between neighbouring stations takes exactly two minutes, the quickest trip is simply the one with the **fewest hops**, and you can find it by looking at all stations one hop away, then all stations two hops away, and so on, like ripples on a pond. That is breadth-first search.

Now the timetable changes: some hops take 2 minutes, one express hop takes 15. "Fewest hops" and "fewest minutes" are no longer the same question. A single 15-minute express hop has fewer hops than three 2-minute hops, but it is slower. Counting ripples no longer works; you have to always extend the trip that is **cheapest so far**, which is Dijkstra's algorithm.

Interviewers ask this question because picking the right tool is half of every shortest-path problem. Grids, word ladders and "minimum number of moves" puzzles have equal-cost steps, and a candidate who reaches for Dijkstra there writes more code for a slower answer. A candidate who uses BFS on a weighted graph gets a wrong answer. The rule fits in one sentence, and this page makes sure you can also explain **why**.

## 2. The Core Distinction

**BFS (breadth-first search)** explores a graph in layers: first the source, then everything one edge away, then everything two edges away. It uses a plain first-in-first-out **queue**. The first time BFS reaches a node, it has reached it with the **fewest possible edges**. The full mechanics are on the [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs) page.

📌 **Interview term: Unweighted graph** — a graph where every edge counts the same (or where edges have no cost at all). The length of a path is just its number of edges.

**Dijkstra's algorithm** always expands the unsettled node with the smallest total **weight** so far, using a **priority queue** (min-heap). It finds the cheapest path when edges have different non-negative weights. The full mechanics are on the [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) page.

So the answer to the question is:

> Use BFS when every edge has the same weight (or no weight). Use Dijkstra when weights differ and none is negative.

📌 **Interview term: Shortest path by edges vs by weight** — BFS minimises the number of edges in the path; Dijkstra minimises the sum of the edge weights. They agree exactly when all weights are equal.

### Why BFS is correct on equal weights

BFS's queue only ever holds nodes at distance d followed by nodes at distance d + 1, never anything else. Every node at distance d is taken out before any node at distance d + 1. So nodes leave the queue **in order of distance**, which is exactly what Dijkstra's priority queue would give you. When all priorities are just "d or d + 1, in that order", a plain queue already **is** a priority queue, only with O(1) operations instead of O(log n).

📌 **Interview term: BFS layer (frontier)** — the set of nodes at the same distance from the source; BFS finishes one layer before starting the next.

### Dijkstra is "BFS with a priority queue"

Put the two side by side and the only real differences are the container and the check:

| | BFS | Dijkstra |
| :--- | :--- | :--- |
| Container | FIFO queue | min-heap of (distance, node) |
| When a node is final | when it is first discovered | when it is popped (non-stale) |
| Update rule | \`if not visited: dist[v] = dist[u] + 1\` | \`if dist[u] + w < dist[v]: dist[v] = dist[u] + w\` |
| Cost per node | O(1) queue operations | O(log V) heap operations |
| Works on | equal weights | any non-negative weights |

## 3. Where BFS Gives the Wrong Answer

As soon as weights differ, "fewest edges" and "cheapest" come apart:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Two routes from A to D, one direct edge costing 10, and a three edge route through B and C costing 1 each">
  <defs>
    <marker id="bd1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge-dashed" d="M 104 120 L 570 120" marker-end="url(#bd1-arrow)"/>
  <text class="d-sub" x="337" y="109" text-anchor="middle">10</text>
  <path class="d-edge-accent" d="M 100 134 L 225 223" marker-end="url(#bd1-arrow)"/>
  <text class="d-text d-accent" x="154" y="195" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 274 240 L 400 240" marker-end="url(#bd1-arrow)"/>
  <text class="d-text d-accent" x="337" y="259" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 450 226 L 575 137" marker-end="url(#bd1-arrow)"/>
  <text class="d-text d-accent" x="521" y="198" text-anchor="middle">1</text>
  <circle class="d-box" cx="80" cy="120" r="24"/>
  <text class="d-text" x="80" y="125" text-anchor="middle">A</text>
  <circle class="d-box" cx="250" cy="240" r="24"/>
  <text class="d-text" x="250" y="245" text-anchor="middle">B</text>
  <circle class="d-box" cx="430" cy="240" r="24"/>
  <text class="d-text" x="430" y="245" text-anchor="middle">C</text>
  <circle class="d-box" cx="600" cy="120" r="24"/>
  <text class="d-text" x="600" y="125" text-anchor="middle">D</text>
  <text class="d-sub" x="340" y="70" text-anchor="middle">BFS route: 1 edge, cost 10</text>
  <text class="d-sub d-accent" x="340" y="200" text-anchor="middle">Dijkstra route: cost 3</text>
</svg>

From A, BFS reaches D directly in its first layer (one edge) and never looks back, so it reports the route A → D, which costs 10. Dijkstra reports A → B → C → D, which costs 3. Example 1 prints both:

~~~text
BFS route:      A -> D (edges 1, cost 10)
Dijkstra route: A -> B -> C -> D (cost 3)
~~~

The BFS answer is not "slightly off": it is the right answer to a different question (fewest edges).

### Equal but not 1

"Equal weights" does not have to mean weight 1. If every edge costs 7, then a path's cost is 7 × (number of edges), and minimising edges minimises cost. Run BFS and multiply at the end. Example 1 checks this on a 5 × 5 maze:

~~~text
maze corner to corner: BFS = 8, Dijkstra = 8
all 25 cells agree: true
weight 7 everywhere: BFS * 7 = 56, Dijkstra = 56
~~~

## 4. The Middle Ground: 0-1 BFS

Some problems have only two kinds of step: free moves (weight 0) and moves that cost one unit (weight 1). Examples: "minimum walls to break to reach the exit", "minimum arrows to flip in a grid", "minimum edge reversals". Plain BFS is wrong here (it would count the free moves too), and Dijkstra works but pays O(log V) per operation. There is a neat trick with the same O(V + E) cost as BFS.

📌 **Interview term: 0-1 BFS** — a shortest-path algorithm for graphs whose weights are only 0 or 1: use a **deque** (double-ended queue); when an edge of weight 0 improves a node, push it to the **front**; when an edge of weight 1 improves it, push it to the **back**.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="A deque for 0-1 BFS, nodes reached by a weight 0 edge go to the front, nodes reached by a weight 1 edge go to the back">
  <defs>
    <marker id="bd3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="160" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="195" y="110" text-anchor="middle">d</text>
  <rect class="d-box-accent" x="240" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="275" y="110" text-anchor="middle">d</text>
  <rect class="d-box-accent" x="320" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="355" y="110" text-anchor="middle">d</text>
  <rect class="d-box" x="400" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="435" y="110" text-anchor="middle">d+1</text>
  <rect class="d-box" x="480" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="515" y="110" text-anchor="middle">d+1</text>
  <text class="d-sub" x="195" y="62" text-anchor="middle">front</text>
  <text class="d-sub" x="515" y="62" text-anchor="middle">back</text>
  <path class="d-edge-accent" d="M 60 190 L 60 105 L 150 105" marker-end="url(#bd3-arrow)"/>
  <text class="d-text d-accent" x="60" y="210" text-anchor="middle">weight 0</text>
  <path class="d-edge" d="M 620 190 L 620 105 L 562 105" marker-end="url(#bd3-arrow)"/>
  <text class="d-text" x="620" y="210" text-anchor="middle">weight 1</text>
</svg>

Why it works: the deque always holds nodes with distance d at the front and d + 1 at the back, like BFS layers. A weight-0 edge produces another node at distance d, so it belongs at the front with its layer; a weight-1 edge produces distance d + 1, which belongs at the back. The front of the deque is therefore always a node with the smallest distance, exactly as a heap would give, without the heap.

📌 **Interview term: Deque (double-ended queue)** — a queue that supports adding and removing at both ends in O(1).

Example 2 runs 0-1 BFS and Dijkstra on a grid where stepping onto a wall \`#\` costs 1 and stepping onto \`.\` is free:

~~~text
walls to break, 0-1 BFS:  1
walls to break, Dijkstra: 1
every cell agrees: true
~~~

Plain BFS on the same grid answers \`8\`, the fewest steps, which is not what was asked. Note one difference from plain BFS: a node can be improved (and pushed) more than once, so 0-1 BFS must check \`dist[u] + w < dist[v]\` like Dijkstra, not just "visited or not".

Beyond 0 and 1: if weights are small integers (say 1 to 5), you can split each edge of weight k into k unit edges with dummy nodes and run BFS, or use a bucket queue (Dial's algorithm). For anything else, Dijkstra.

## 5. Decision Guide

<svg class="iq-diagram" width="100%" viewBox="0 0 780 260" role="img" aria-label="Choosing an algorithm by edge weights, equal weights use BFS, weights 0 or 1 use 0-1 BFS, non-negative use Dijkstra, negative use Bellman-Ford">
  <defs>
    <marker id="bd2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="240" y="10" width="300" height="50" rx="10"/>
  <text class="d-text" x="390" y="40" text-anchor="middle">What do the edges cost?</text>
  <path class="d-edge" d="M 390 60 L 97 150" marker-end="url(#bd2-arrow)"/>
  <path class="d-edge" d="M 390 60 L 292 150" marker-end="url(#bd2-arrow)"/>
  <path class="d-edge" d="M 390 60 L 487 150" marker-end="url(#bd2-arrow)"/>
  <path class="d-edge" d="M 390 60 L 682 150" marker-end="url(#bd2-arrow)"/>
  <rect class="d-box-accent" x="20" y="160" width="155" height="70" rx="10"/>
  <text class="d-text" x="97" y="189" text-anchor="middle">BFS</text>
  <text class="d-sub" x="97" y="211" text-anchor="middle">all weights equal</text>
  <rect class="d-box" x="215" y="160" width="155" height="70" rx="10"/>
  <text class="d-text" x="292" y="189" text-anchor="middle">0-1 BFS</text>
  <text class="d-sub" x="292" y="211" text-anchor="middle">weights 0 or 1</text>
  <rect class="d-box" x="410" y="160" width="155" height="70" rx="10"/>
  <text class="d-text" x="487" y="189" text-anchor="middle">Dijkstra</text>
  <text class="d-sub" x="487" y="211" text-anchor="middle">any non-negative</text>
  <rect class="d-box-muted" x="605" y="160" width="155" height="70" rx="10"/>
  <text class="d-text" x="682" y="189" text-anchor="middle">Bellman-Ford</text>
  <text class="d-sub" x="682" y="211" text-anchor="middle">some negative</text>
</svg>

| Edge weights | Algorithm | Time |
| :--- | :--- | :--- |
| none, or all equal | BFS (multiply by the weight at the end) | O(V + E) |
| only 0 or 1 | 0-1 BFS with a deque | O(V + E) |
| non-negative, different | Dijkstra with a min-heap | O((V + E) log V) |
| some negative | [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work) | O(V × E) |
| all pairs, small graph | [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work) | O(V³) |

Problems where BFS is the intended answer because every move costs the same: [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) style grid walks, [rotting oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs) (multi-source BFS), and [word ladder](/interview-question/how-do-you-solve-the-word-ladder-problem). Problems where weights differ and Dijkstra is intended: network delay time, path with minimum effort, and variants of [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops).

## 6. The Code in JavaScript

JavaScript has no built-in queue, deque or heap. For BFS, push onto an array and read it with a moving \`head\` index: each node is appended once and read once, so the whole BFS stays O(V + E). Avoid \`queue.shift()\`: the language specification defines \`shift\` as moving every remaining element down one index, so it can cost O(n) per call. For Dijkstra, the page uses the same small \`MinHeap\` class as the [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) page, storing \`[distance, node]\` pairs.

~~~javascript
// BFS: fewest edges from source. Each node enters the queue once.
function bfs(graph, source) {
  const dist = new Array(graph.length).fill(Infinity);
  const parent = new Array(graph.length).fill(-1);
  dist[source] = 0;
  const queue = [source];
  for (let head = 0; head < queue.length; head++) {  // a head index avoids O(n) shift()
    const u = queue[head];
    for (const [v] of graph[u]) {                      // BFS ignores the weight
      if (dist[v] === Infinity) {
        dist[v] = dist[u] + 1;
        parent[v] = u;
        queue.push(v);
      }
    }
  }
  return { dist, parent };
}
~~~

~~~javascript
// Dijkstra: cheapest total weight from source.
function dijkstra(graph, source) {
  const dist = new Array(graph.length).fill(Infinity);
  const parent = new Array(graph.length).fill(-1);
  dist[source] = 0;
  const heap = new MinHeap();
  heap.push([0, source]);
  while (heap.size > 0) {
    const [d, u] = heap.pop();
    if (d > dist[u]) continue;
    for (const [v, w] of graph[u]) {
      if (d + w < dist[v]) {
        dist[v] = d + w;
        parent[v] = u;
        heap.push([dist[v], v]);
      }
    }
  }
  return { dist, parent };
}
~~~

The two functions have the same shape. BFS ignores the weight (\`for (const [v] of graph[u])\` takes only the neighbour) and finalises a node when it is first seen (\`dist[v] === Infinity\`). Dijkstra adds \`d + w\`, may improve a node several times, and skips stale heap entries with \`if (d > dist[u]) continue\`.

0-1 BFS needs pushes at both ends. \`Array.prototype.unshift\` would shift every element, so this small \`Deque\` keeps two stacks back to back: \`pushFront\` pushes onto \`front\`, \`pushBack\` onto \`back\`, and \`popFront\` pops \`front\`, refilling it from the reversed \`back\` only when it runs empty. Each element is moved at most once, so operations are O(1) amortised.

~~~javascript
// A tiny double-ended queue: two stacks back to back, O(1) amortised at both ends.
// (Array.prototype.unshift would shift every element, which is O(n).)
class Deque {
  constructor() { this.front = []; this.back = []; }
  get size() { return this.front.length + this.back.length; }
  pushFront(x) { this.front.push(x); }
  pushBack(x) { this.back.push(x); }
  popFront() {
    if (this.front.length === 0) {
      this.front = this.back.reverse();
      this.back = [];
    }
    return this.front.pop();
  }
}
~~~

~~~javascript
function zeroOneBfs(source) {
  const dist = new Array(H * W).fill(Infinity);
  dist[source] = 0;
  const dq = new Deque();
  dq.pushBack(source);
  let pops = 0;
  while (dq.size > 0) {
    const u = dq.popFront();
    pops++;
    for (const [v, w] of neighbours(u)) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        if (w === 0) dq.pushFront(v);   // free step: same distance, goes to the front
        else dq.pushBack(v);            // costs 1: goes to the back
      }
    }
  }
  return { dist, pops };
}
~~~

\`Math.floor(cell / W)\` and \`cell % W\` turn a cell number back into a row and a column. \`neighbours(cell)\` returns \`[nextCell, weight]\` pairs, with weight 1 for a wall.

## 7. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — BFS and Dijkstra on equal and unequal weights** prints:

~~~text
maze corner to corner: BFS = 8, Dijkstra = 8
all 25 cells agree: true
weight 7 everywhere: BFS * 7 = 56, Dijkstra = 56
BFS route:      A -> D (edges 1, cost 10)
Dijkstra route: A -> B -> C -> D (cost 3)
~~~

**Example 2 — 0-1 BFS with a deque versus Dijkstra** prints:

~~~text
walls to break, 0-1 BFS:  1
walls to break, Dijkstra: 1
every cell agrees: true
deque pops: 25, heap pops: 25
plain BFS fewest steps: 8 (answers a different question)
~~~

**What the numbers show:** Example 1 shows BFS and Dijkstra agreeing on every cell of an equal-weight maze (and still agreeing after scaling every weight to 7), then BFS picking the fewer-edge but more expensive route once weights differ. Example 2 shows 0-1 BFS matching Dijkstra on a 0/1-weight grid with the same number of removals (25 each here), while plain BFS answers a different question.

## 8. Complexity

| Algorithm | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| BFS | O(V + E) | O(V) | each node enters the queue once, each edge is checked once |
| 0-1 BFS | O(V + E) | O(V) | deque operations are O(1); a node is improved only a bounded number of times |
| Dijkstra (binary heap) | O((V + E) log V) | O(V + E) | every push and pop on the heap is O(log V) |

On a grid with R rows and C columns, V = R × C and E is about 4 × R × C, so BFS is O(R × C). See [Big-O notation](/interview-question/what-is-big-o-notation) for the notation.

## 9. Edge Cases

- **Source equals target:** distance 0 in both algorithms.
- **Unreachable target:** both leave it at infinity; decide with the interviewer what to return (often -1).
- **Walls or blocked cells:** never add them to the queue (Example 1's maze), or give them a cost (Example 2's grid). These are different problems.
- **Multiple sources:** put all sources in the BFS queue at distance 0 to start ([rotting oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs)); the same works for Dijkstra's heap.
- **Weight 0 everywhere:** every reachable node has distance 0; any traversal finds that.
- **Negative weights:** neither BFS nor Dijkstra; use [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work).

## Common Pitfalls

- **BFS on a weighted graph.** It returns the fewest-edges path, not the cheapest (\`cost 10\` instead of \`cost 3\` in Example 1).
- **\`queue.shift()\` in a hot loop.** It re-indexes the remaining elements; use a head index (or a real deque).
- **\`unshift()\` for 0-1 BFS.** Same problem at the front; use a deque such as the two-stack one above.
- **Marking visited on pop instead of on push in BFS.** The same node gets queued many times; set \`dist[v]\` when you push.
- **"Visited" logic in 0-1 BFS.** A node can be improved after it was first reached; compare distances instead.
- **Checking \`if (!dist[v])\` for "unvisited".** \`dist[source]\` is \`0\`, which is falsy; compare with \`Infinity\` (or \`undefined\`) explicitly.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;">BFS when every edge costs the same (or nothing); Dijkstra when weights differ and none is negative.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why BFS works:</strong> <span style="color:#f0e2c8;">A FIFO queue releases nodes in order of distance when every edge adds the same amount, so it already behaves like Dijkstra's heap, at O(1) per operation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it fails otherwise:</strong> <span style="color:#f0e2c8;">BFS minimises edges, not cost: on A → D costing 10 versus A → B → C → D costing 3 it picks the 10.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The middle case:</strong> <span style="color:#f0e2c8;">Weights 0 or 1: 0-1 BFS with a deque, push front for 0 and back for 1, still O(V + E).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript details:</strong> <span style="color:#f0e2c8;">Array plus head index for BFS (no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code>), a hand-written heap for Dijkstra, and a small deque for 0-1 BFS.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">All edges cost 5. BFS or Dijkstra?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS, then multiply the number of edges by 5. Equal weights preserve the order of paths by edge count. Example 1 shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BFS * 7 = 56</code> matching Dijkstra's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">56</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you just run BFS and add up the weights along its path?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. BFS chooses the path with the fewest edges before looking at weights; adding them afterwards gives that path's cost, not the cheapest cost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not always use Dijkstra to be safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is correct on equal weights too, but in JavaScript it means writing a heap and paying O(log V) per operation. A queue with a head index is shorter and faster.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In 0-1 BFS, can a node be popped twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, if it is improved after being pushed. That is why the update checks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[u] + w &lt; dist[v]</code> instead of a visited flag; the total work stays O(V + E).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">queue.shift()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The spec defines it as moving every remaining element down one slot, so it can be O(n) per call. A head index makes each dequeue O(1).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Unweighted graph** | every edge counts the same; path length is the number of edges |
| **Shortest path by edges vs by weight** | BFS minimises edge count, Dijkstra minimises weight sum |
| **BFS layer (frontier)** | all nodes at the same distance from the source |
| **0-1 BFS** | weights 0 or 1: deque, push front for 0 and back for 1, O(V + E) |
| **Deque (double-ended queue)** | add and remove at both ends in O(1) |

---
**Conclusion:** Use BFS for shortest paths whenever every edge costs the same: its FIFO queue already hands out nodes in distance order, so it gives Dijkstra's answer in O(V + E). Use Dijkstra when weights differ (and are non-negative), 0-1 BFS when they are only 0 or 1, and Bellman-Ford when some are negative. In JavaScript that means an array with a head index for BFS, a small hand-written heap for Dijkstra, and a two-stack deque for 0-1 BFS.`,
        examples: [
          { label: `BFS and Dijkstra on equal and unequal weights`, code: `// JavaScript has no built-in heap, so here is a small binary min-heap of [dist, node] pairs.
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  less(x, y) { return x[0] !== y[0] ? x[0] < y[0] : x[1] < y[1]; }
  push(item) {
    const a = this.a;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
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

// BFS: fewest edges from source. Each node enters the queue once.
function bfs(graph, source) {
  const dist = new Array(graph.length).fill(Infinity);
  const parent = new Array(graph.length).fill(-1);
  dist[source] = 0;
  const queue = [source];
  for (let head = 0; head < queue.length; head++) {  // a head index avoids O(n) shift()
    const u = queue[head];
    for (const [v] of graph[u]) {                      // BFS ignores the weight
      if (dist[v] === Infinity) {
        dist[v] = dist[u] + 1;
        parent[v] = u;
        queue.push(v);
      }
    }
  }
  return { dist, parent };
}

// Dijkstra: cheapest total weight from source.
function dijkstra(graph, source) {
  const dist = new Array(graph.length).fill(Infinity);
  const parent = new Array(graph.length).fill(-1);
  dist[source] = 0;
  const heap = new MinHeap();
  heap.push([0, source]);
  while (heap.size > 0) {
    const [d, u] = heap.pop();
    if (d > dist[u]) continue;
    for (const [v, w] of graph[u]) {
      if (d + w < dist[v]) {
        dist[v] = d + w;
        parent[v] = u;
        heap.push([dist[v], v]);
      }
    }
  }
  return { dist, parent };
}

function gridGraph(rows, weight) {
  const h = rows.length, w = rows[0].length;
  const graph = Array.from({ length: h * w }, () => []);
  for (let r = 0; r < h; r++)
    for (let c = 0; c < w; c++) {
      if (rows[r][c] === "#") continue;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < h && nc >= 0 && nc < w && rows[nr][nc] !== "#")
          graph[r * w + c].push([nr * w + nc, weight]);
      }
    }
  return graph;
}

const sameArray = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// 1. An unweighted maze: every step costs the same, so BFS is enough.
const maze = ["..#..",
              ".##..",
              "...#.",
              "#....",
              "..#.."];
const g = gridGraph(maze, 1);
const b = bfs(g, 0).dist;
const d = dijkstra(g, 0).dist;
console.log("maze corner to corner: BFS = " + b[24] + ", Dijkstra = " + d[24]);
console.log("all " + g.length + " cells agree: " + sameArray(b, d));

// 2. Every edge costs 7: BFS edge count times 7 is still the answer.
const d7 = dijkstra(gridGraph(maze, 7), 0).dist;
console.log("weight 7 everywhere: BFS * 7 = " + b[24] * 7 + ", Dijkstra = " + d7[24]);

// 3. Different weights: BFS finds the fewest edges, not the cheapest route.
const names = "ABCD";
const road = [[[3, 10], [1, 1]], [[2, 1]], [[3, 1]], []];   // A->D costs 10, A->B->C->D costs 3

function route(parent, v) {
  const out = [];
  for (; v !== -1; v = parent[v]) out.push(names[v]);
  return out.reverse().join(" -> ");
}

function cost(parent, v) {
  let total = 0;
  for (; parent[v] !== -1; v = parent[v]) total += road[parent[v]].find(([x]) => x === v)[1];
  return total;
}

const br = bfs(road, 0), dr = dijkstra(road, 0);
console.log("BFS route:      " + route(br.parent, 3) + " (edges " + br.dist[3] + ", cost " + cost(br.parent, 3) + ")");
console.log("Dijkstra route: " + route(dr.parent, 3) + " (cost " + dr.dist[3] + ")");` },
          { label: `0-1 BFS with a deque versus Dijkstra`, code: `// JavaScript has no built-in heap, so here is a small binary min-heap of [dist, node] pairs.
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  less(x, y) { return x[0] !== y[0] ? x[0] < y[0] : x[1] < y[1]; }
  push(item) {
    const a = this.a;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
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

// A tiny double-ended queue: two stacks back to back, O(1) amortised at both ends.
// (Array.prototype.unshift would shift every element, which is O(n).)
class Deque {
  constructor() { this.front = []; this.back = []; }
  get size() { return this.front.length + this.back.length; }
  pushFront(x) { this.front.push(x); }
  pushBack(x) { this.back.push(x); }
  popFront() {
    if (this.front.length === 0) {
      this.front = this.back.reverse();
      this.back = [];
    }
    return this.front.pop();
  }
}

// Walk from the top-left to the bottom-right corner. Stepping onto "." is free,
// stepping onto "#" means breaking a wall and costs 1. Edge weights are only 0 or 1.
const GRID = [".#...",
              ".#.#.",
              "...#.",
              "##.##",
              "...#."];
const H = GRID.length, W = GRID[0].length;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function neighbours(cell) {
  const r = Math.floor(cell / W), c = cell % W;
  const out = [];
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < H && nc >= 0 && nc < W) out.push([nr * W + nc, GRID[nr][nc] === "#" ? 1 : 0]);
  }
  return out;
}

function zeroOneBfs(source) {
  const dist = new Array(H * W).fill(Infinity);
  dist[source] = 0;
  const dq = new Deque();
  dq.pushBack(source);
  let pops = 0;
  while (dq.size > 0) {
    const u = dq.popFront();
    pops++;
    for (const [v, w] of neighbours(u)) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        if (w === 0) dq.pushFront(v);   // free step: same distance, goes to the front
        else dq.pushBack(v);            // costs 1: goes to the back
      }
    }
  }
  return { dist, pops };
}

function dijkstra(source) {
  const dist = new Array(H * W).fill(Infinity);
  dist[source] = 0;
  const heap = new MinHeap();
  heap.push([0, source]);
  let pops = 0;
  while (heap.size > 0) {
    const [d, u] = heap.pop();
    pops++;
    if (d > dist[u]) continue;
    for (const [v, w] of neighbours(u)) {
      if (d + w < dist[v]) {
        dist[v] = d + w;
        heap.push([dist[v], v]);
      }
    }
  }
  return { dist, pops };
}

// Plain BFS counts steps, which is a different question.
function plainBfsSteps(source, target) {
  const dist = new Array(H * W).fill(Infinity);
  dist[source] = 0;
  const q = [source];
  for (let head = 0; head < q.length; head++) {
    const u = q[head];
    for (const [v] of neighbours(u)) {
      if (dist[v] === Infinity) {
        dist[v] = dist[u] + 1;
        q.push(v);
      }
    }
  }
  return dist[target];
}

const target = H * W - 1;
const z = zeroOneBfs(0);
const d = dijkstra(0);
console.log("walls to break, 0-1 BFS:  " + z.dist[target]);
console.log("walls to break, Dijkstra: " + d.dist[target]);
console.log("every cell agrees: " + z.dist.every((x, i) => x === d.dist[i]));
console.log("deque pops: " + z.pops + ", heap pops: " + d.pops);
console.log("plain BFS fewest steps: " + plainBfsSteps(0, target) + " (answers a different question)");` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You need shortest paths in a graph. When is a plain BFS enough, and when do you need Dijkstra? Show me both in Java and explain what goes wrong if you pick the wrong one."

**What a strong answer should cover:**
- BFS minimises the number of edges; Dijkstra minimises total weight. They agree exactly when all weights are equal (any equal value, not only 1).
- Why BFS is correct there: its FIFO queue already releases nodes in distance order, so the O(log V) heap is unnecessary.
- A concrete counterexample where BFS picks a fewer-edge but more expensive path.
- 0-1 BFS with a deque for weights 0 and 1, and Bellman-Ford when weights can be negative.
- Java specifics: \`ArrayDeque\` for both BFS and 0-1 BFS (\`addFirst\` / \`addLast\`), \`PriorityQueue\` with \`Long.compare\` for Dijkstra, and boxing of \`Integer\` in queues.

**Code / implementation expected:** Yes — a Java BFS with \`ArrayDeque<Integer>\`, a Dijkstra with \`PriorityQueue<long[]>\`, ideally plus 0-1 BFS.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph-algorithm background assumed
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are on a metro map and want to get from your stop to a friend's. If every hop between neighbouring stations takes exactly two minutes, the quickest trip is simply the one with the **fewest hops**, and you can find it by looking at all stations one hop away, then all stations two hops away, and so on, like ripples on a pond. That is breadth-first search.

Now the timetable changes: some hops take 2 minutes, one express hop takes 15. "Fewest hops" and "fewest minutes" are no longer the same question. A single 15-minute express hop has fewer hops than three 2-minute hops, but it is slower. Counting ripples no longer works; you have to always extend the trip that is **cheapest so far**, which is Dijkstra's algorithm.

Interviewers ask this question because picking the right tool is half of every shortest-path problem. Grids, word ladders and "minimum number of moves" puzzles have equal-cost steps, and a candidate who reaches for Dijkstra there writes more code for a slower answer. A candidate who uses BFS on a weighted graph gets a wrong answer. The rule fits in one sentence, and this page makes sure you can also explain **why**.

## 2. The Core Distinction

**BFS (breadth-first search)** explores a graph in layers: first the source, then everything one edge away, then everything two edges away. It uses a plain first-in-first-out **queue**. The first time BFS reaches a node, it has reached it with the **fewest possible edges**. The full mechanics are on the [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs) page.

📌 **Interview term: Unweighted graph** — a graph where every edge counts the same (or where edges have no cost at all). The length of a path is just its number of edges.

**Dijkstra's algorithm** always expands the unsettled node with the smallest total **weight** so far, using a **priority queue** (min-heap). It finds the cheapest path when edges have different non-negative weights. The full mechanics are on the [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) page.

So the answer to the question is:

> Use BFS when every edge has the same weight (or no weight). Use Dijkstra when weights differ and none is negative.

📌 **Interview term: Shortest path by edges vs by weight** — BFS minimises the number of edges in the path; Dijkstra minimises the sum of the edge weights. They agree exactly when all weights are equal.

### Why BFS is correct on equal weights

BFS's queue only ever holds nodes at distance d followed by nodes at distance d + 1, never anything else. Every node at distance d is taken out before any node at distance d + 1. So nodes leave the queue **in order of distance**, which is exactly what Dijkstra's priority queue would give you. When all priorities are just "d or d + 1, in that order", a plain queue already **is** a priority queue, only with O(1) operations instead of O(log n).

📌 **Interview term: BFS layer (frontier)** — the set of nodes at the same distance from the source; BFS finishes one layer before starting the next.

### Dijkstra is "BFS with a priority queue"

Put the two side by side and the only real differences are the container and the check:

| | BFS | Dijkstra |
| :--- | :--- | :--- |
| Container | FIFO queue | min-heap of (distance, node) |
| When a node is final | when it is first discovered | when it is popped (non-stale) |
| Update rule | \`if not visited: dist[v] = dist[u] + 1\` | \`if dist[u] + w < dist[v]: dist[v] = dist[u] + w\` |
| Cost per node | O(1) queue operations | O(log V) heap operations |
| Works on | equal weights | any non-negative weights |

## 3. Where BFS Gives the Wrong Answer

As soon as weights differ, "fewest edges" and "cheapest" come apart:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Two routes from A to D, one direct edge costing 10, and a three edge route through B and C costing 1 each">
  <defs>
    <marker id="bd1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge-dashed" d="M 104 120 L 570 120" marker-end="url(#bd1-arrow)"/>
  <text class="d-sub" x="337" y="109" text-anchor="middle">10</text>
  <path class="d-edge-accent" d="M 100 134 L 225 223" marker-end="url(#bd1-arrow)"/>
  <text class="d-text d-accent" x="154" y="195" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 274 240 L 400 240" marker-end="url(#bd1-arrow)"/>
  <text class="d-text d-accent" x="337" y="259" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 450 226 L 575 137" marker-end="url(#bd1-arrow)"/>
  <text class="d-text d-accent" x="521" y="198" text-anchor="middle">1</text>
  <circle class="d-box" cx="80" cy="120" r="24"/>
  <text class="d-text" x="80" y="125" text-anchor="middle">A</text>
  <circle class="d-box" cx="250" cy="240" r="24"/>
  <text class="d-text" x="250" y="245" text-anchor="middle">B</text>
  <circle class="d-box" cx="430" cy="240" r="24"/>
  <text class="d-text" x="430" y="245" text-anchor="middle">C</text>
  <circle class="d-box" cx="600" cy="120" r="24"/>
  <text class="d-text" x="600" y="125" text-anchor="middle">D</text>
  <text class="d-sub" x="340" y="70" text-anchor="middle">BFS route: 1 edge, cost 10</text>
  <text class="d-sub d-accent" x="340" y="200" text-anchor="middle">Dijkstra route: cost 3</text>
</svg>

From A, BFS reaches D directly in its first layer (one edge) and never looks back, so it reports the route A → D, which costs 10. Dijkstra reports A → B → C → D, which costs 3. Example 1 prints both:

~~~text
BFS route:      A -> D (edges 1, cost 10)
Dijkstra route: A -> B -> C -> D (cost 3)
~~~

The BFS answer is not "slightly off": it is the right answer to a different question (fewest edges).

### Equal but not 1

"Equal weights" does not have to mean weight 1. If every edge costs 7, then a path's cost is 7 × (number of edges), and minimising edges minimises cost. Run BFS and multiply at the end. Example 1 checks this on a 5 × 5 maze:

~~~text
maze corner to corner: BFS = 8, Dijkstra = 8
all 25 cells agree: true
weight 7 everywhere: BFS * 7 = 56, Dijkstra = 56
~~~

## 4. The Middle Ground: 0-1 BFS

Some problems have only two kinds of step: free moves (weight 0) and moves that cost one unit (weight 1). Examples: "minimum walls to break to reach the exit", "minimum arrows to flip in a grid", "minimum edge reversals". Plain BFS is wrong here (it would count the free moves too), and Dijkstra works but pays O(log V) per operation. There is a neat trick with the same O(V + E) cost as BFS.

📌 **Interview term: 0-1 BFS** — a shortest-path algorithm for graphs whose weights are only 0 or 1: use a **deque** (double-ended queue); when an edge of weight 0 improves a node, push it to the **front**; when an edge of weight 1 improves it, push it to the **back**.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="A deque for 0-1 BFS, nodes reached by a weight 0 edge go to the front, nodes reached by a weight 1 edge go to the back">
  <defs>
    <marker id="bd3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="160" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="195" y="110" text-anchor="middle">d</text>
  <rect class="d-box-accent" x="240" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="275" y="110" text-anchor="middle">d</text>
  <rect class="d-box-accent" x="320" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="355" y="110" text-anchor="middle">d</text>
  <rect class="d-box" x="400" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="435" y="110" text-anchor="middle">d+1</text>
  <rect class="d-box" x="480" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="515" y="110" text-anchor="middle">d+1</text>
  <text class="d-sub" x="195" y="62" text-anchor="middle">front</text>
  <text class="d-sub" x="515" y="62" text-anchor="middle">back</text>
  <path class="d-edge-accent" d="M 60 190 L 60 105 L 150 105" marker-end="url(#bd3-arrow)"/>
  <text class="d-text d-accent" x="60" y="210" text-anchor="middle">weight 0</text>
  <path class="d-edge" d="M 620 190 L 620 105 L 562 105" marker-end="url(#bd3-arrow)"/>
  <text class="d-text" x="620" y="210" text-anchor="middle">weight 1</text>
</svg>

Why it works: the deque always holds nodes with distance d at the front and d + 1 at the back, like BFS layers. A weight-0 edge produces another node at distance d, so it belongs at the front with its layer; a weight-1 edge produces distance d + 1, which belongs at the back. The front of the deque is therefore always a node with the smallest distance, exactly as a heap would give, without the heap.

📌 **Interview term: Deque (double-ended queue)** — a queue that supports adding and removing at both ends in O(1).

Example 2 runs 0-1 BFS and Dijkstra on a grid where stepping onto a wall \`#\` costs 1 and stepping onto \`.\` is free:

~~~text
walls to break, 0-1 BFS:  1
walls to break, Dijkstra: 1
every cell agrees: true
~~~

Plain BFS on the same grid answers \`8\`, the fewest steps, which is not what was asked. Note one difference from plain BFS: a node can be improved (and pushed) more than once, so 0-1 BFS must check \`dist[u] + w < dist[v]\` like Dijkstra, not just "visited or not".

Beyond 0 and 1: if weights are small integers (say 1 to 5), you can split each edge of weight k into k unit edges with dummy nodes and run BFS, or use a bucket queue (Dial's algorithm). For anything else, Dijkstra.

## 5. Decision Guide

<svg class="iq-diagram" width="100%" viewBox="0 0 780 260" role="img" aria-label="Choosing an algorithm by edge weights, equal weights use BFS, weights 0 or 1 use 0-1 BFS, non-negative use Dijkstra, negative use Bellman-Ford">
  <defs>
    <marker id="bd2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="240" y="10" width="300" height="50" rx="10"/>
  <text class="d-text" x="390" y="40" text-anchor="middle">What do the edges cost?</text>
  <path class="d-edge" d="M 390 60 L 97 150" marker-end="url(#bd2-arrow)"/>
  <path class="d-edge" d="M 390 60 L 292 150" marker-end="url(#bd2-arrow)"/>
  <path class="d-edge" d="M 390 60 L 487 150" marker-end="url(#bd2-arrow)"/>
  <path class="d-edge" d="M 390 60 L 682 150" marker-end="url(#bd2-arrow)"/>
  <rect class="d-box-accent" x="20" y="160" width="155" height="70" rx="10"/>
  <text class="d-text" x="97" y="189" text-anchor="middle">BFS</text>
  <text class="d-sub" x="97" y="211" text-anchor="middle">all weights equal</text>
  <rect class="d-box" x="215" y="160" width="155" height="70" rx="10"/>
  <text class="d-text" x="292" y="189" text-anchor="middle">0-1 BFS</text>
  <text class="d-sub" x="292" y="211" text-anchor="middle">weights 0 or 1</text>
  <rect class="d-box" x="410" y="160" width="155" height="70" rx="10"/>
  <text class="d-text" x="487" y="189" text-anchor="middle">Dijkstra</text>
  <text class="d-sub" x="487" y="211" text-anchor="middle">any non-negative</text>
  <rect class="d-box-muted" x="605" y="160" width="155" height="70" rx="10"/>
  <text class="d-text" x="682" y="189" text-anchor="middle">Bellman-Ford</text>
  <text class="d-sub" x="682" y="211" text-anchor="middle">some negative</text>
</svg>

| Edge weights | Algorithm | Time |
| :--- | :--- | :--- |
| none, or all equal | BFS (multiply by the weight at the end) | O(V + E) |
| only 0 or 1 | 0-1 BFS with a deque | O(V + E) |
| non-negative, different | Dijkstra with a min-heap | O((V + E) log V) |
| some negative | [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work) | O(V × E) |
| all pairs, small graph | [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work) | O(V³) |

Problems where BFS is the intended answer because every move costs the same: [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) style grid walks, [rotting oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs) (multi-source BFS), and [word ladder](/interview-question/how-do-you-solve-the-word-ladder-problem). Problems where weights differ and Dijkstra is intended: network delay time, path with minimum effort, and variants of [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops).

## 6. The Code in Java

For BFS, \`java.util.ArrayDeque\` is the standard queue: \`add\` at the tail and \`poll\` at the head, both O(1) amortised, backed by a resizable circular array. It also supports \`addFirst\` / \`addLast\` / \`pollFirst\`, which is exactly what 0-1 BFS needs. For Dijkstra, \`PriorityQueue<long[]>\` ordered by \`Long.compare\` on the distance.

~~~java
// BFS: fewest edges from source. Each node enters the queue once.
static long[] bfs(List<List<int[]>> graph, int source) {
    int n = graph.size();
    long[] dist = new long[n];
    Arrays.fill(dist, INF);
    parent = new int[n];
    Arrays.fill(parent, -1);
    dist[source] = 0;
    ArrayDeque<Integer> queue = new ArrayDeque<>();
    queue.add(source);
    while (!queue.isEmpty()) {
        int u = queue.poll();
        for (int[] e : graph.get(u)) {              // BFS ignores the weight e[1]
            if (dist[e[0]] == INF) {
                dist[e[0]] = dist[u] + 1;
                parent[e[0]] = u;
                queue.add(e[0]);
            }
        }
    }
    return dist;
}
~~~

~~~java
// Dijkstra: cheapest total weight from source.
static long[] dijkstra(List<List<int[]>> graph, int source) {
    int n = graph.size();
    long[] dist = new long[n];
    Arrays.fill(dist, INF);
    parent = new int[n];
    Arrays.fill(parent, -1);
    dist[source] = 0;
    PriorityQueue<long[]> heap = new PriorityQueue<>((a, b) -> a[0] != b[0] ? Long.compare(a[0], b[0]) : Long.compare(a[1], b[1]));
    heap.offer(new long[]{0, source});
    while (!heap.isEmpty()) {
        long[] top = heap.poll();
        long d = top[0];
        int u = (int) top[1];
        if (d > dist[u]) continue;
        for (int[] e : graph.get(u)) {
            if (d + e[1] < dist[e[0]]) {
                dist[e[0]] = d + e[1];
                parent[e[0]] = u;
                heap.offer(new long[]{dist[e[0]], e[0]});
            }
        }
    }
    return dist;
}
~~~

The two methods have the same shape. BFS ignores the weight \`e[1]\` and finalises a node when first seen (\`dist[e[0]] == INF\`). Dijkstra adds \`d + e[1]\`, may improve a node several times, and skips stale entries with \`if (d > dist[u]) continue\`. Both store the parent array in a static field; \`main\` copies the reference (\`int[] bp = parent;\`) before the next call replaces it.

0-1 BFS uses the same \`ArrayDeque\`, now from both ends: \`addFirst\` for weight-0 edges, \`addLast\` for weight-1 edges, \`pollFirst\` for the next node.

~~~java
static long[] zeroOneBfs(int source) {
    long[] dist = new long[H * W];
    Arrays.fill(dist, INF);
    dist[source] = 0;
    ArrayDeque<Integer> dq = new ArrayDeque<>();
    dq.addLast(source);
    pops = 0;
    while (!dq.isEmpty()) {
        int u = dq.pollFirst();
        pops++;
        for (int[] e : neighbours(u)) {
            int v = e[0], w = e[1];
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                if (w == 0) dq.addFirst(v);   // free step: same distance, goes to the front
                else dq.addLast(v);           // costs 1: goes to the back
            }
        }
    }
    return dist;
}
~~~

\`cell / W\` and \`cell % W\` turn a cell number back into a row and a column. \`neighbours(cell)\` returns \`{nextCell, weight}\` arrays, with weight 1 for a wall. \`Arrays.equals(z, d)\` compares the two \`long[]\` results element by element.

## 7. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — BFS and Dijkstra on equal and unequal weights** prints:

~~~text
maze corner to corner: BFS = 8, Dijkstra = 8
all 25 cells agree: true
weight 7 everywhere: BFS * 7 = 56, Dijkstra = 56
BFS route:      A -> D (edges 1, cost 10)
Dijkstra route: A -> B -> C -> D (cost 3)
~~~

**Example 2 — 0-1 BFS with a deque versus Dijkstra** prints:

~~~text
walls to break, 0-1 BFS:  1
walls to break, Dijkstra: 1
every cell agrees: true
deque pops: 25, heap pops: 25
plain BFS fewest steps: 8 (answers a different question)
~~~

**What the numbers show:** Example 1 shows BFS and Dijkstra agreeing on every cell of an equal-weight maze (and still agreeing after scaling every weight to 7), then BFS picking the fewer-edge but more expensive route once weights differ. Example 2 shows 0-1 BFS matching Dijkstra on a 0/1-weight grid with the same number of removals (25 each here), while plain BFS answers a different question.

## 8. Complexity

| Algorithm | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| BFS | O(V + E) | O(V) | each node enters the queue once, each edge is checked once |
| 0-1 BFS | O(V + E) | O(V) | deque operations are O(1); a node is improved only a bounded number of times |
| Dijkstra (binary heap) | O((V + E) log V) | O(V + E) | every push and pop on the heap is O(log V) |

On a grid with R rows and C columns, V = R × C and E is about 4 × R × C, so BFS is O(R × C). See [Big-O notation](/interview-question/what-is-big-o-notation) for the notation.

## 9. Edge Cases

- **Source equals target:** distance 0 in both algorithms.
- **Unreachable target:** both leave it at infinity; decide with the interviewer what to return (often -1).
- **Walls or blocked cells:** never add them to the queue (Example 1's maze), or give them a cost (Example 2's grid). These are different problems.
- **Multiple sources:** put all sources in the BFS queue at distance 0 to start ([rotting oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs)); the same works for Dijkstra's heap.
- **Weight 0 everywhere:** every reachable node has distance 0; any traversal finds that.
- **Negative weights:** neither BFS nor Dijkstra; use [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work).

## Common Pitfalls

- **BFS on a weighted graph.** It returns the fewest-edges path, not the cheapest (\`cost 10\` instead of \`cost 3\` in Example 1).
- **\`LinkedList\` or \`Stack\` as the queue.** \`LinkedList\` works but allocates a node per element; \`Stack\` is LIFO and turns BFS into DFS. Use \`ArrayDeque\`.
- **\`ArrayDeque\` with \`null\`.** It rejects \`null\` elements with a \`NullPointerException\`; store node ids, not optional objects.
- **Marking visited on poll instead of on add in BFS.** The same node gets queued many times.
- **"Visited" logic in 0-1 BFS.** A node can be improved after it was first reached; compare distances instead.
- **\`Integer\` comparisons with \`==\`.** \`queue.poll()\` returns an \`Integer\`; assigning it to an \`int\` unboxes it, but comparing two \`Integer\` objects with \`==\` compares references and fails above 127.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;">BFS when every edge costs the same (or nothing); Dijkstra when weights differ and none is negative.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why BFS works:</strong> <span style="color:#f0e2c8;">A FIFO queue releases nodes in order of distance when every edge adds the same amount, so it already behaves like Dijkstra's heap, at O(1) per operation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it fails otherwise:</strong> <span style="color:#f0e2c8;">BFS minimises edges, not cost: on A → D costing 10 versus A → B → C → D costing 3 it picks the 10.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The middle case:</strong> <span style="color:#f0e2c8;">Weights 0 or 1: 0-1 BFS with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque.addFirst</code> for 0 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addLast</code> for 1, still O(V + E).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> for queues and deques, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue&lt;long[]&gt;</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Long.compare</code> for Dijkstra, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> distances.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">All edges cost 5. BFS or Dijkstra?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS, then multiply the number of edges by 5. Equal weights preserve the order of paths by edge count. Example 1 shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BFS * 7 = 56</code> matching Dijkstra's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">56</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you just run BFS and add up the weights along its path?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. BFS chooses the path with the fewest edges before looking at weights; adding them afterwards gives that path's cost, not the cheapest cost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not always use Dijkstra to be safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is correct on equal weights too, but each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code> operation is O(log n) and allocates an entry array. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> BFS is O(1) per step and simpler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In 0-1 BFS, can a node be polled twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, if it is improved after being added. That is why the update checks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[u] + w &lt; dist[v]</code>; the total work stays O(V + E).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ArrayDeque</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LinkedList</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deque</code>, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> stores elements in a circular array without a node object per element, which is lighter and usually faster.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Unweighted graph** | every edge counts the same; path length is the number of edges |
| **Shortest path by edges vs by weight** | BFS minimises edge count, Dijkstra minimises weight sum |
| **BFS layer (frontier)** | all nodes at the same distance from the source |
| **0-1 BFS** | weights 0 or 1: deque, push front for 0 and back for 1, O(V + E) |
| **Deque (double-ended queue)** | add and remove at both ends in O(1) |

---
**Conclusion:** Use BFS for shortest paths whenever every edge costs the same: its FIFO queue already hands out nodes in distance order, so it gives Dijkstra's answer in O(V + E). Use Dijkstra when weights differ (and are non-negative), 0-1 BFS when they are only 0 or 1, and Bellman-Ford when some are negative. In Java that means \`ArrayDeque\` for BFS and 0-1 BFS (\`addFirst\` / \`addLast\`), and \`PriorityQueue<long[]>\` with \`Long.compare\` for Dijkstra.`,
        examples: [
          { label: `BFS and Dijkstra on equal and unequal weights`, code: `import java.util.*;

public class Main {
    static final long INF = Long.MAX_VALUE;
    static int[] parent;

    // BFS: fewest edges from source. Each node enters the queue once.
    static long[] bfs(List<List<int[]>> graph, int source) {
        int n = graph.size();
        long[] dist = new long[n];
        Arrays.fill(dist, INF);
        parent = new int[n];
        Arrays.fill(parent, -1);
        dist[source] = 0;
        ArrayDeque<Integer> queue = new ArrayDeque<>();
        queue.add(source);
        while (!queue.isEmpty()) {
            int u = queue.poll();
            for (int[] e : graph.get(u)) {              // BFS ignores the weight e[1]
                if (dist[e[0]] == INF) {
                    dist[e[0]] = dist[u] + 1;
                    parent[e[0]] = u;
                    queue.add(e[0]);
                }
            }
        }
        return dist;
    }

    // Dijkstra: cheapest total weight from source.
    static long[] dijkstra(List<List<int[]>> graph, int source) {
        int n = graph.size();
        long[] dist = new long[n];
        Arrays.fill(dist, INF);
        parent = new int[n];
        Arrays.fill(parent, -1);
        dist[source] = 0;
        PriorityQueue<long[]> heap = new PriorityQueue<>((a, b) -> a[0] != b[0] ? Long.compare(a[0], b[0]) : Long.compare(a[1], b[1]));
        heap.offer(new long[]{0, source});
        while (!heap.isEmpty()) {
            long[] top = heap.poll();
            long d = top[0];
            int u = (int) top[1];
            if (d > dist[u]) continue;
            for (int[] e : graph.get(u)) {
                if (d + e[1] < dist[e[0]]) {
                    dist[e[0]] = d + e[1];
                    parent[e[0]] = u;
                    heap.offer(new long[]{dist[e[0]], e[0]});
                }
            }
        }
        return dist;
    }

    static List<List<int[]>> gridGraph(String[] rows, int weight) {
        int h = rows.length, w = rows[0].length();
        List<List<int[]>> graph = new ArrayList<>();
        for (int i = 0; i < h * w; i++) graph.add(new ArrayList<>());
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        for (int r = 0; r < h; r++)
            for (int c = 0; c < w; c++) {
                if (rows[r].charAt(c) == '#') continue;
                for (int[] dd : dirs) {
                    int nr = r + dd[0], nc = c + dd[1];
                    if (nr >= 0 && nr < h && nc >= 0 && nc < w && rows[nr].charAt(nc) != '#')
                        graph.get(r * w + c).add(new int[]{nr * w + nc, weight});
                }
            }
        return graph;
    }

    static final String NAMES = "ABCD";

    static String route(int[] par, int v) {
        List<String> out = new ArrayList<>();
        for (; v != -1; v = par[v]) out.add(String.valueOf(NAMES.charAt(v)));
        Collections.reverse(out);
        return String.join(" -> ", out);
    }

    static long cost(List<List<int[]>> road, int[] par, int v) {
        long total = 0;
        for (; par[v] != -1; v = par[v])
            for (int[] e : road.get(par[v])) if (e[0] == v) total += e[1];
        return total;
    }

    public static void main(String[] args) {
        // 1. An unweighted maze: every step costs the same, so BFS is enough.
        String[] maze = {"..#..",
                         ".##..",
                         "...#.",
                         "#....",
                         "..#.."};
        List<List<int[]>> g = gridGraph(maze, 1);
        long[] b = bfs(g, 0);
        long[] d = dijkstra(g, 0);
        System.out.println("maze corner to corner: BFS = " + b[24] + ", Dijkstra = " + d[24]);
        System.out.println("all " + g.size() + " cells agree: " + Arrays.equals(b, d));

        // 2. Every edge costs 7: BFS edge count times 7 is still the answer.
        long[] d7 = dijkstra(gridGraph(maze, 7), 0);
        System.out.println("weight 7 everywhere: BFS * 7 = " + b[24] * 7 + ", Dijkstra = " + d7[24]);

        // 3. Different weights: BFS finds the fewest edges, not the cheapest route.
        List<List<int[]>> road = new ArrayList<>();
        for (int i = 0; i < 4; i++) road.add(new ArrayList<>());
        road.get(0).add(new int[]{3, 10});   // A -> D costs 10
        road.get(0).add(new int[]{1, 1});    // A -> B -> C -> D costs 3
        road.get(1).add(new int[]{2, 1});
        road.get(2).add(new int[]{3, 1});
        long[] bd = bfs(road, 0);
        int[] bp = parent;
        long[] dd = dijkstra(road, 0);
        int[] dp = parent;
        System.out.println("BFS route:      " + route(bp, 3) + " (edges " + bd[3] + ", cost " + cost(road, bp, 3) + ")");
        System.out.println("Dijkstra route: " + route(dp, 3) + " (cost " + dd[3] + ")");
    }
}` },
          { label: `0-1 BFS with a deque versus Dijkstra`, code: `import java.util.*;

public class Main {
    static final long INF = Long.MAX_VALUE;
    // Walk from the top-left to the bottom-right corner. Stepping onto "." is free,
    // stepping onto "#" means breaking a wall and costs 1. Edge weights are only 0 or 1.
    static final String[] GRID = {".#...",
                                  ".#.#.",
                                  "...#.",
                                  "##.##",
                                  "...#."};
    static final int H = GRID.length, W = GRID[0].length();
    static final int[][] DIRS = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    static int pops;

    static List<int[]> neighbours(int cell) {
        int r = cell / W, c = cell % W;
        List<int[]> out = new ArrayList<>();
        for (int[] d : DIRS) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < H && nc >= 0 && nc < W)
                out.add(new int[]{nr * W + nc, GRID[nr].charAt(nc) == '#' ? 1 : 0});
        }
        return out;
    }

    static long[] zeroOneBfs(int source) {
        long[] dist = new long[H * W];
        Arrays.fill(dist, INF);
        dist[source] = 0;
        ArrayDeque<Integer> dq = new ArrayDeque<>();
        dq.addLast(source);
        pops = 0;
        while (!dq.isEmpty()) {
            int u = dq.pollFirst();
            pops++;
            for (int[] e : neighbours(u)) {
                int v = e[0], w = e[1];
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    if (w == 0) dq.addFirst(v);   // free step: same distance, goes to the front
                    else dq.addLast(v);           // costs 1: goes to the back
                }
            }
        }
        return dist;
    }

    static long[] dijkstra(int source) {
        long[] dist = new long[H * W];
        Arrays.fill(dist, INF);
        dist[source] = 0;
        PriorityQueue<long[]> heap = new PriorityQueue<>((a, b) -> a[0] != b[0] ? Long.compare(a[0], b[0]) : Long.compare(a[1], b[1]));
        heap.offer(new long[]{0, source});
        pops = 0;
        while (!heap.isEmpty()) {
            long[] top = heap.poll();
            pops++;
            long d = top[0];
            int u = (int) top[1];
            if (d > dist[u]) continue;
            for (int[] e : neighbours(u)) {
                if (d + e[1] < dist[e[0]]) {
                    dist[e[0]] = d + e[1];
                    heap.offer(new long[]{dist[e[0]], e[0]});
                }
            }
        }
        return dist;
    }

    // Plain BFS counts steps, which is a different question.
    static long plainBfsSteps(int source, int target) {
        long[] dist = new long[H * W];
        Arrays.fill(dist, INF);
        dist[source] = 0;
        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.add(source);
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int[] e : neighbours(u))
                if (dist[e[0]] == INF) {
                    dist[e[0]] = dist[u] + 1;
                    q.add(e[0]);
                }
        }
        return dist[target];
    }

    public static void main(String[] args) {
        int target = H * W - 1;
        long[] z = zeroOneBfs(0);
        int zpops = pops;
        long[] d = dijkstra(0);
        int dpops = pops;
        System.out.println("walls to break, 0-1 BFS:  " + z[target]);
        System.out.println("walls to break, Dijkstra: " + d[target]);
        System.out.println("every cell agrees: " + Arrays.equals(z, d));
        System.out.println("deque pops: " + zpops + ", heap pops: " + dpops);
        System.out.println("plain BFS fewest steps: " + plainBfsSteps(0, target) + " (answers a different question)");
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You need shortest paths in a graph. When is a plain BFS enough, and when do you need Dijkstra? Show me both in C++ and explain what goes wrong if you pick the wrong one."

**What a strong answer should cover:**
- BFS minimises the number of edges; Dijkstra minimises total weight. They agree exactly when all weights are equal (any equal value, not only 1).
- Why BFS is correct there: its FIFO queue already releases nodes in distance order, so the O(log V) heap is unnecessary.
- A concrete counterexample where BFS picks a fewer-edge but more expensive path.
- 0-1 BFS with a deque for weights 0 and 1, and Bellman-Ford when weights can be negative.
- C++ specifics: \`std::queue\` for BFS, \`std::deque\` with \`push_front\` / \`push_back\` for 0-1 BFS, and \`std::priority_queue\` with \`greater<>\` (it is a max-heap by default) for Dijkstra.

**Code / implementation expected:** Yes — a C++ BFS with \`std::queue<int>\`, a Dijkstra with a min-\`priority_queue\`, ideally plus 0-1 BFS with \`std::deque\`.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph-algorithm background assumed
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are on a metro map and want to get from your stop to a friend's. If every hop between neighbouring stations takes exactly two minutes, the quickest trip is simply the one with the **fewest hops**, and you can find it by looking at all stations one hop away, then all stations two hops away, and so on, like ripples on a pond. That is breadth-first search.

Now the timetable changes: some hops take 2 minutes, one express hop takes 15. "Fewest hops" and "fewest minutes" are no longer the same question. A single 15-minute express hop has fewer hops than three 2-minute hops, but it is slower. Counting ripples no longer works; you have to always extend the trip that is **cheapest so far**, which is Dijkstra's algorithm.

Interviewers ask this question because picking the right tool is half of every shortest-path problem. Grids, word ladders and "minimum number of moves" puzzles have equal-cost steps, and a candidate who reaches for Dijkstra there writes more code for a slower answer. A candidate who uses BFS on a weighted graph gets a wrong answer. The rule fits in one sentence, and this page makes sure you can also explain **why**.

## 2. The Core Distinction

**BFS (breadth-first search)** explores a graph in layers: first the source, then everything one edge away, then everything two edges away. It uses a plain first-in-first-out **queue**. The first time BFS reaches a node, it has reached it with the **fewest possible edges**. The full mechanics are on the [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs) page.

📌 **Interview term: Unweighted graph** — a graph where every edge counts the same (or where edges have no cost at all). The length of a path is just its number of edges.

**Dijkstra's algorithm** always expands the unsettled node with the smallest total **weight** so far, using a **priority queue** (min-heap). It finds the cheapest path when edges have different non-negative weights. The full mechanics are on the [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) page.

So the answer to the question is:

> Use BFS when every edge has the same weight (or no weight). Use Dijkstra when weights differ and none is negative.

📌 **Interview term: Shortest path by edges vs by weight** — BFS minimises the number of edges in the path; Dijkstra minimises the sum of the edge weights. They agree exactly when all weights are equal.

### Why BFS is correct on equal weights

BFS's queue only ever holds nodes at distance d followed by nodes at distance d + 1, never anything else. Every node at distance d is taken out before any node at distance d + 1. So nodes leave the queue **in order of distance**, which is exactly what Dijkstra's priority queue would give you. When all priorities are just "d or d + 1, in that order", a plain queue already **is** a priority queue, only with O(1) operations instead of O(log n).

📌 **Interview term: BFS layer (frontier)** — the set of nodes at the same distance from the source; BFS finishes one layer before starting the next.

### Dijkstra is "BFS with a priority queue"

Put the two side by side and the only real differences are the container and the check:

| | BFS | Dijkstra |
| :--- | :--- | :--- |
| Container | FIFO queue | min-heap of (distance, node) |
| When a node is final | when it is first discovered | when it is popped (non-stale) |
| Update rule | \`if not visited: dist[v] = dist[u] + 1\` | \`if dist[u] + w < dist[v]: dist[v] = dist[u] + w\` |
| Cost per node | O(1) queue operations | O(log V) heap operations |
| Works on | equal weights | any non-negative weights |

## 3. Where BFS Gives the Wrong Answer

As soon as weights differ, "fewest edges" and "cheapest" come apart:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Two routes from A to D, one direct edge costing 10, and a three edge route through B and C costing 1 each">
  <defs>
    <marker id="bd1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge-dashed" d="M 104 120 L 570 120" marker-end="url(#bd1-arrow)"/>
  <text class="d-sub" x="337" y="109" text-anchor="middle">10</text>
  <path class="d-edge-accent" d="M 100 134 L 225 223" marker-end="url(#bd1-arrow)"/>
  <text class="d-text d-accent" x="154" y="195" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 274 240 L 400 240" marker-end="url(#bd1-arrow)"/>
  <text class="d-text d-accent" x="337" y="259" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 450 226 L 575 137" marker-end="url(#bd1-arrow)"/>
  <text class="d-text d-accent" x="521" y="198" text-anchor="middle">1</text>
  <circle class="d-box" cx="80" cy="120" r="24"/>
  <text class="d-text" x="80" y="125" text-anchor="middle">A</text>
  <circle class="d-box" cx="250" cy="240" r="24"/>
  <text class="d-text" x="250" y="245" text-anchor="middle">B</text>
  <circle class="d-box" cx="430" cy="240" r="24"/>
  <text class="d-text" x="430" y="245" text-anchor="middle">C</text>
  <circle class="d-box" cx="600" cy="120" r="24"/>
  <text class="d-text" x="600" y="125" text-anchor="middle">D</text>
  <text class="d-sub" x="340" y="70" text-anchor="middle">BFS route: 1 edge, cost 10</text>
  <text class="d-sub d-accent" x="340" y="200" text-anchor="middle">Dijkstra route: cost 3</text>
</svg>

From A, BFS reaches D directly in its first layer (one edge) and never looks back, so it reports the route A → D, which costs 10. Dijkstra reports A → B → C → D, which costs 3. Example 1 prints both:

~~~text
BFS route:      A -> D (edges 1, cost 10)
Dijkstra route: A -> B -> C -> D (cost 3)
~~~

The BFS answer is not "slightly off": it is the right answer to a different question (fewest edges).

### Equal but not 1

"Equal weights" does not have to mean weight 1. If every edge costs 7, then a path's cost is 7 × (number of edges), and minimising edges minimises cost. Run BFS and multiply at the end. Example 1 checks this on a 5 × 5 maze:

~~~text
maze corner to corner: BFS = 8, Dijkstra = 8
all 25 cells agree: true
weight 7 everywhere: BFS * 7 = 56, Dijkstra = 56
~~~

## 4. The Middle Ground: 0-1 BFS

Some problems have only two kinds of step: free moves (weight 0) and moves that cost one unit (weight 1). Examples: "minimum walls to break to reach the exit", "minimum arrows to flip in a grid", "minimum edge reversals". Plain BFS is wrong here (it would count the free moves too), and Dijkstra works but pays O(log V) per operation. There is a neat trick with the same O(V + E) cost as BFS.

📌 **Interview term: 0-1 BFS** — a shortest-path algorithm for graphs whose weights are only 0 or 1: use a **deque** (double-ended queue); when an edge of weight 0 improves a node, push it to the **front**; when an edge of weight 1 improves it, push it to the **back**.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="A deque for 0-1 BFS, nodes reached by a weight 0 edge go to the front, nodes reached by a weight 1 edge go to the back">
  <defs>
    <marker id="bd3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="160" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="195" y="110" text-anchor="middle">d</text>
  <rect class="d-box-accent" x="240" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="275" y="110" text-anchor="middle">d</text>
  <rect class="d-box-accent" x="320" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="355" y="110" text-anchor="middle">d</text>
  <rect class="d-box" x="400" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="435" y="110" text-anchor="middle">d+1</text>
  <rect class="d-box" x="480" y="80" width="70" height="50" rx="6"/>
  <text class="d-text" x="515" y="110" text-anchor="middle">d+1</text>
  <text class="d-sub" x="195" y="62" text-anchor="middle">front</text>
  <text class="d-sub" x="515" y="62" text-anchor="middle">back</text>
  <path class="d-edge-accent" d="M 60 190 L 60 105 L 150 105" marker-end="url(#bd3-arrow)"/>
  <text class="d-text d-accent" x="60" y="210" text-anchor="middle">weight 0</text>
  <path class="d-edge" d="M 620 190 L 620 105 L 562 105" marker-end="url(#bd3-arrow)"/>
  <text class="d-text" x="620" y="210" text-anchor="middle">weight 1</text>
</svg>

Why it works: the deque always holds nodes with distance d at the front and d + 1 at the back, like BFS layers. A weight-0 edge produces another node at distance d, so it belongs at the front with its layer; a weight-1 edge produces distance d + 1, which belongs at the back. The front of the deque is therefore always a node with the smallest distance, exactly as a heap would give, without the heap.

📌 **Interview term: Deque (double-ended queue)** — a queue that supports adding and removing at both ends in O(1).

Example 2 runs 0-1 BFS and Dijkstra on a grid where stepping onto a wall \`#\` costs 1 and stepping onto \`.\` is free:

~~~text
walls to break, 0-1 BFS:  1
walls to break, Dijkstra: 1
every cell agrees: true
~~~

Plain BFS on the same grid answers \`8\`, the fewest steps, which is not what was asked. Note one difference from plain BFS: a node can be improved (and pushed) more than once, so 0-1 BFS must check \`dist[u] + w < dist[v]\` like Dijkstra, not just "visited or not".

Beyond 0 and 1: if weights are small integers (say 1 to 5), you can split each edge of weight k into k unit edges with dummy nodes and run BFS, or use a bucket queue (Dial's algorithm). For anything else, Dijkstra.

## 5. Decision Guide

<svg class="iq-diagram" width="100%" viewBox="0 0 780 260" role="img" aria-label="Choosing an algorithm by edge weights, equal weights use BFS, weights 0 or 1 use 0-1 BFS, non-negative use Dijkstra, negative use Bellman-Ford">
  <defs>
    <marker id="bd2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="240" y="10" width="300" height="50" rx="10"/>
  <text class="d-text" x="390" y="40" text-anchor="middle">What do the edges cost?</text>
  <path class="d-edge" d="M 390 60 L 97 150" marker-end="url(#bd2-arrow)"/>
  <path class="d-edge" d="M 390 60 L 292 150" marker-end="url(#bd2-arrow)"/>
  <path class="d-edge" d="M 390 60 L 487 150" marker-end="url(#bd2-arrow)"/>
  <path class="d-edge" d="M 390 60 L 682 150" marker-end="url(#bd2-arrow)"/>
  <rect class="d-box-accent" x="20" y="160" width="155" height="70" rx="10"/>
  <text class="d-text" x="97" y="189" text-anchor="middle">BFS</text>
  <text class="d-sub" x="97" y="211" text-anchor="middle">all weights equal</text>
  <rect class="d-box" x="215" y="160" width="155" height="70" rx="10"/>
  <text class="d-text" x="292" y="189" text-anchor="middle">0-1 BFS</text>
  <text class="d-sub" x="292" y="211" text-anchor="middle">weights 0 or 1</text>
  <rect class="d-box" x="410" y="160" width="155" height="70" rx="10"/>
  <text class="d-text" x="487" y="189" text-anchor="middle">Dijkstra</text>
  <text class="d-sub" x="487" y="211" text-anchor="middle">any non-negative</text>
  <rect class="d-box-muted" x="605" y="160" width="155" height="70" rx="10"/>
  <text class="d-text" x="682" y="189" text-anchor="middle">Bellman-Ford</text>
  <text class="d-sub" x="682" y="211" text-anchor="middle">some negative</text>
</svg>

| Edge weights | Algorithm | Time |
| :--- | :--- | :--- |
| none, or all equal | BFS (multiply by the weight at the end) | O(V + E) |
| only 0 or 1 | 0-1 BFS with a deque | O(V + E) |
| non-negative, different | Dijkstra with a min-heap | O((V + E) log V) |
| some negative | [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work) | O(V × E) |
| all pairs, small graph | [Floyd-Warshall](/interview-question/how-does-the-floyd-warshall-algorithm-work) | O(V³) |

Problems where BFS is the intended answer because every move costs the same: [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) style grid walks, [rotting oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs) (multi-source BFS), and [word ladder](/interview-question/how-do-you-solve-the-word-ladder-problem). Problems where weights differ and Dijkstra is intended: network delay time, path with minimum effort, and variants of [cheapest flight with at most K stops](/interview-question/how-do-you-find-the-cheapest-flight-with-at-most-k-stops).

## 6. The Code in C++

For BFS, \`std::queue<int>\` (an adaptor over \`std::deque\` by default) gives O(1) \`push\`, \`front\` and \`pop\`. For 0-1 BFS, use \`std::deque<int>\` directly, because you need \`push_front\` as well as \`push_back\`. For Dijkstra, \`std::priority_queue\` with \`greater<>\`, because the default \`std::priority_queue\` is a max-heap.

~~~cpp
// BFS: fewest edges from source. Each node enters the queue once.
vector<long long> bfs(const Graph& graph, int source, vector<int>& parent) {
    vector<long long> dist(graph.size(), INF);
    parent.assign(graph.size(), -1);
    dist[source] = 0;
    queue<int> q;
    q.push(source);
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        for (auto [v, w] : graph[u]) {          // BFS ignores the weight
            (void)w;
            if (dist[v] == INF) {
                dist[v] = dist[u] + 1;
                parent[v] = u;
                q.push(v);
            }
        }
    }
    return dist;
}
~~~

~~~cpp
// Dijkstra: cheapest total weight from source.
vector<long long> dijkstra(const Graph& graph, int source, vector<int>& parent) {
    vector<long long> dist(graph.size(), INF);
    parent.assign(graph.size(), -1);
    dist[source] = 0;
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>> heap;
    heap.push({0, source});
    while (!heap.empty()) {
        auto [d, u] = heap.top();
        heap.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : graph[u])
            if (d + w < dist[v]) {
                dist[v] = d + w;
                parent[v] = u;
                heap.push({dist[v], v});
            }
    }
    return dist;
}
~~~

The two functions have the same shape. BFS ignores the weight (the \`(void)w;\` line silences the unused-variable warning) and finalises a node when first seen (\`dist[v] == INF\`). Dijkstra adds \`d + w\`, may improve a node several times, and skips stale entries with \`if (d > dist[u]) continue\`. \`parent\` is passed by reference so each call fills the caller's vector.

0-1 BFS uses \`std::deque<int>\` from both ends: \`push_front\` for weight-0 edges, \`push_back\` for weight-1 edges, \`front()\` then \`pop_front()\` for the next node.

~~~cpp
vector<long long> zeroOneBfs(int source, int& pops) {
    vector<long long> dist(H * W, INF);
    dist[source] = 0;
    deque<int> dq{source};
    pops = 0;
    while (!dq.empty()) {
        int u = dq.front();
        dq.pop_front();
        pops++;
        for (auto [v, w] : neighbours(u))
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                if (w == 0) dq.push_front(v);   // free step: same distance, goes to the front
                else dq.push_back(v);           // costs 1: goes to the back
            }
    }
    return dist;
}
~~~

\`cell / W\` and \`cell % W\` turn a cell number back into a row and a column. \`neighbours(cell)\` returns \`(nextCell, weight)\` pairs, with weight 1 for a wall. \`z == d\` compares two \`vector<long long>\` element by element.

## 7. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — BFS and Dijkstra on equal and unequal weights** prints:

~~~text
maze corner to corner: BFS = 8, Dijkstra = 8
all 25 cells agree: true
weight 7 everywhere: BFS * 7 = 56, Dijkstra = 56
BFS route:      A -> D (edges 1, cost 10)
Dijkstra route: A -> B -> C -> D (cost 3)
~~~

**Example 2 — 0-1 BFS with a deque versus Dijkstra** prints:

~~~text
walls to break, 0-1 BFS:  1
walls to break, Dijkstra: 1
every cell agrees: true
deque pops: 25, heap pops: 25
plain BFS fewest steps: 8 (answers a different question)
~~~

**What the numbers show:** Example 1 shows BFS and Dijkstra agreeing on every cell of an equal-weight maze (and still agreeing after scaling every weight to 7), then BFS picking the fewer-edge but more expensive route once weights differ. Example 2 shows 0-1 BFS matching Dijkstra on a 0/1-weight grid with the same number of removals (25 each here), while plain BFS answers a different question.

## 8. Complexity

| Algorithm | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| BFS | O(V + E) | O(V) | each node enters the queue once, each edge is checked once |
| 0-1 BFS | O(V + E) | O(V) | deque operations are O(1); a node is improved only a bounded number of times |
| Dijkstra (binary heap) | O((V + E) log V) | O(V + E) | every push and pop on the heap is O(log V) |

On a grid with R rows and C columns, V = R × C and E is about 4 × R × C, so BFS is O(R × C). See [Big-O notation](/interview-question/what-is-big-o-notation) for the notation.

## 9. Edge Cases

- **Source equals target:** distance 0 in both algorithms.
- **Unreachable target:** both leave it at infinity; decide with the interviewer what to return (often -1).
- **Walls or blocked cells:** never add them to the queue (Example 1's maze), or give them a cost (Example 2's grid). These are different problems.
- **Multiple sources:** put all sources in the BFS queue at distance 0 to start ([rotting oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs)); the same works for Dijkstra's heap.
- **Weight 0 everywhere:** every reachable node has distance 0; any traversal finds that.
- **Negative weights:** neither BFS nor Dijkstra; use [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work).

## Common Pitfalls

- **BFS on a weighted graph.** It returns the fewest-edges path, not the cheapest (\`cost 10\` instead of \`cost 3\` in Example 1).
- **Default \`priority_queue\` for Dijkstra.** It is a max-heap; without \`greater<>\` it expands the farthest node first and gives wrong answers silently.
- **\`std::queue\` for 0-1 BFS.** It has no \`push_front\`; use \`std::deque\`.
- **Marking visited on pop instead of on push in BFS.** The same node gets queued many times.
- **"Visited" logic in 0-1 BFS.** A node can be improved after it was first reached; compare distances instead.
- **Holding a reference to \`dq.front()\` across \`pop_front()\`.** The reference dangles; copy the value (\`int u = dq.front();\`) first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;">BFS when every edge costs the same (or nothing); Dijkstra when weights differ and none is negative.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why BFS works:</strong> <span style="color:#f0e2c8;">A FIFO queue releases nodes in order of distance when every edge adds the same amount, so it already behaves like Dijkstra's heap, at O(1) per operation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it fails otherwise:</strong> <span style="color:#f0e2c8;">BFS minimises edges, not cost: on A → D costing 10 versus A → B → C → D costing 3 it picks the 10.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The middle case:</strong> <span style="color:#f0e2c8;">Weights 0 or 1: 0-1 BFS with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::deque</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_front</code> for 0 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code> for 1, still O(V + E).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code> for BFS, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::deque</code> for 0-1 BFS, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">priority_queue</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">greater&lt;&gt;</code> for Dijkstra.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">All edges cost 5. BFS or Dijkstra?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS, then multiply the number of edges by 5. Equal weights preserve the order of paths by edge count. Example 1 shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BFS * 7 = 56</code> matching Dijkstra's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">56</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you just run BFS and add up the weights along its path?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. BFS chooses the path with the fewest edges before looking at weights; adding them afterwards gives that path's cost, not the cheapest cost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not always use Dijkstra to be safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is correct on equal weights too, but costs O(log V) per heap operation. BFS with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code> is O(1) per step and less code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In 0-1 BFS, can a node be popped twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, if it is improved after being pushed. That is why the update checks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[u] + w &lt; dist[v]</code>; the total work stays O(V + E).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::queue</code> built on?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By default it adapts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::deque</code>; it only exposes the FIFO operations. For 0-1 BFS you use the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::deque</code> itself.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Unweighted graph** | every edge counts the same; path length is the number of edges |
| **Shortest path by edges vs by weight** | BFS minimises edge count, Dijkstra minimises weight sum |
| **BFS layer (frontier)** | all nodes at the same distance from the source |
| **0-1 BFS** | weights 0 or 1: deque, push front for 0 and back for 1, O(V + E) |
| **Deque (double-ended queue)** | add and remove at both ends in O(1) |

---
**Conclusion:** Use BFS for shortest paths whenever every edge costs the same: its FIFO queue already hands out nodes in distance order, so it gives Dijkstra's answer in O(V + E). Use Dijkstra when weights differ (and are non-negative), 0-1 BFS when they are only 0 or 1, and Bellman-Ford when some are negative. In C++ that means \`std::queue\` for BFS, \`std::deque\` for 0-1 BFS, and a \`priority_queue\` with \`greater<>\` for Dijkstra.`,
        examples: [
          { label: `BFS and Dijkstra on equal and unequal weights`, code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <limits>
#include <queue>
#include <string>
#include <utility>
#include <vector>
using namespace std;

const long long INF = numeric_limits<long long>::max();
using Graph = vector<vector<pair<int, int>>>;   // node -> list of (neighbour, weight)

// BFS: fewest edges from source. Each node enters the queue once.
vector<long long> bfs(const Graph& graph, int source, vector<int>& parent) {
    vector<long long> dist(graph.size(), INF);
    parent.assign(graph.size(), -1);
    dist[source] = 0;
    queue<int> q;
    q.push(source);
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        for (auto [v, w] : graph[u]) {          // BFS ignores the weight
            (void)w;
            if (dist[v] == INF) {
                dist[v] = dist[u] + 1;
                parent[v] = u;
                q.push(v);
            }
        }
    }
    return dist;
}

// Dijkstra: cheapest total weight from source.
vector<long long> dijkstra(const Graph& graph, int source, vector<int>& parent) {
    vector<long long> dist(graph.size(), INF);
    parent.assign(graph.size(), -1);
    dist[source] = 0;
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>> heap;
    heap.push({0, source});
    while (!heap.empty()) {
        auto [d, u] = heap.top();
        heap.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : graph[u])
            if (d + w < dist[v]) {
                dist[v] = d + w;
                parent[v] = u;
                heap.push({dist[v], v});
            }
    }
    return dist;
}

Graph gridGraph(const vector<string>& rows, int weight) {
    int h = rows.size(), w = rows[0].size();
    Graph graph(h * w);
    const int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    for (int r = 0; r < h; r++)
        for (int c = 0; c < w; c++) {
            if (rows[r][c] == '#') continue;
            for (auto& dd : dirs) {
                int nr = r + dd[0], nc = c + dd[1];
                if (nr >= 0 && nr < h && nc >= 0 && nc < w && rows[nr][nc] != '#')
                    graph[r * w + c].push_back({nr * w + nc, weight});
            }
        }
    return graph;
}

const string NAMES = "ABCD";

string route(const vector<int>& parent, int v) {
    vector<string> out;
    for (; v != -1; v = parent[v]) out.push_back(string(1, NAMES[v]));
    reverse(out.begin(), out.end());
    string s;
    for (size_t i = 0; i < out.size(); i++) s += (i ? " -> " : "") + out[i];
    return s;
}

long long cost(const Graph& road, const vector<int>& parent, int v) {
    long long total = 0;
    for (; parent[v] != -1; v = parent[v])
        for (auto [x, w] : road[parent[v]]) if (x == v) total += w;
    return total;
}

int main() {
    cout << boolalpha;
    vector<int> parent;
    // 1. An unweighted maze: every step costs the same, so BFS is enough.
    vector<string> maze = {"..#..",
                           ".##..",
                           "...#.",
                           "#....",
                           "..#.."};
    Graph g = gridGraph(maze, 1);
    auto b = bfs(g, 0, parent);
    auto d = dijkstra(g, 0, parent);
    cout << "maze corner to corner: BFS = " << b[24] << ", Dijkstra = " << d[24] << "\\n";
    cout << "all " << g.size() << " cells agree: " << (b == d) << "\\n";

    // 2. Every edge costs 7: BFS edge count times 7 is still the answer.
    auto d7 = dijkstra(gridGraph(maze, 7), 0, parent);
    cout << "weight 7 everywhere: BFS * 7 = " << b[24] * 7 << ", Dijkstra = " << d7[24] << "\\n";

    // 3. Different weights: BFS finds the fewest edges, not the cheapest route.
    Graph road = {{{3, 10}, {1, 1}}, {{2, 1}}, {{3, 1}}, {}};   // A->D costs 10, A->B->C->D costs 3
    vector<int> bp, dp;
    auto bd = bfs(road, 0, bp);
    auto dd = dijkstra(road, 0, dp);
    cout << "BFS route:      " << route(bp, 3) << " (edges " << bd[3] << ", cost " << cost(road, bp, 3) << ")\\n";
    cout << "Dijkstra route: " << route(dp, 3) << " (cost " << dd[3] << ")\\n";
}` },
          { label: `0-1 BFS with a deque versus Dijkstra`, code: `#include <deque>
#include <functional>
#include <iostream>
#include <limits>
#include <queue>
#include <string>
#include <utility>
#include <vector>
using namespace std;

const long long INF = numeric_limits<long long>::max();
// Walk from the top-left to the bottom-right corner. Stepping onto "." is free,
// stepping onto "#" means breaking a wall and costs 1. Edge weights are only 0 or 1.
const vector<string> GRID = {".#...",
                             ".#.#.",
                             "...#.",
                             "##.##",
                             "...#."};
const int H = GRID.size(), W = GRID[0].size();
const int DIRS[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};

vector<pair<int, int>> neighbours(int cell) {
    int r = cell / W, c = cell % W;
    vector<pair<int, int>> out;
    for (auto& d : DIRS) {
        int nr = r + d[0], nc = c + d[1];
        if (nr >= 0 && nr < H && nc >= 0 && nc < W) out.push_back({nr * W + nc, GRID[nr][nc] == '#' ? 1 : 0});
    }
    return out;
}

vector<long long> zeroOneBfs(int source, int& pops) {
    vector<long long> dist(H * W, INF);
    dist[source] = 0;
    deque<int> dq{source};
    pops = 0;
    while (!dq.empty()) {
        int u = dq.front();
        dq.pop_front();
        pops++;
        for (auto [v, w] : neighbours(u))
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                if (w == 0) dq.push_front(v);   // free step: same distance, goes to the front
                else dq.push_back(v);           // costs 1: goes to the back
            }
    }
    return dist;
}

vector<long long> dijkstra(int source, int& pops) {
    vector<long long> dist(H * W, INF);
    dist[source] = 0;
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>> heap;
    heap.push({0, source});
    pops = 0;
    while (!heap.empty()) {
        auto [d, u] = heap.top();
        heap.pop();
        pops++;
        if (d > dist[u]) continue;
        for (auto [v, w] : neighbours(u))
            if (d + w < dist[v]) {
                dist[v] = d + w;
                heap.push({dist[v], v});
            }
    }
    return dist;
}

// Plain BFS counts steps, which is a different question.
long long plainBfsSteps(int source, int target) {
    vector<long long> dist(H * W, INF);
    dist[source] = 0;
    queue<int> q;
    q.push(source);
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        for (auto [v, w] : neighbours(u)) {
            (void)w;
            if (dist[v] == INF) {
                dist[v] = dist[u] + 1;
                q.push(v);
            }
        }
    }
    return dist[target];
}

int main() {
    cout << boolalpha;
    int target = H * W - 1, zpops = 0, dpops = 0;
    auto z = zeroOneBfs(0, zpops);
    auto d = dijkstra(0, dpops);
    cout << "walls to break, 0-1 BFS:  " << z[target] << "\\n";
    cout << "walls to break, Dijkstra: " << d[target] << "\\n";
    cout << "every cell agrees: " << (z == d) << "\\n";
    cout << "deque pops: " << zpops << ", heap pops: " << dpops << "\\n";
    cout << "plain BFS fewest steps: " << plainBfsSteps(0, target) << " (answers a different question)\\n";
}` },
        ],
      },
    },
  },
  {
    title: `How does the Floyd-Warshall algorithm work?`,
    difficulty: "hard",
    seoDescription: `Floyd-Warshall all-pairs shortest paths in Python, JavaScript, Java and C++: the k-loop DP, route rebuilding, negative cycles, loop-order bug, tested code.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Explain the Floyd-Warshall algorithm. Implement it in Python for a directed weighted graph with V nodes, return the matrix of shortest distances between every pair, and tell me how you would detect a negative cycle."

**What a strong answer should cover:**
- The DP idea: after processing k, \`dist[i][j]\` is the shortest path using only nodes 0..k as intermediates; the recurrence \`dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])\`.
- The loop order: k must be the outermost loop, and why updating one matrix in place is safe.
- O(V³) time and O(V²) space; when it beats running Dijkstra from every node (small or dense graphs, negative weights).
- Negative weights are fine; a negative cycle shows up as \`dist[i][i] < 0\`; a \`next\` matrix rebuilds routes.
- Python specifics: \`float("inf")\` for missing edges, building the matrix with a list comprehension (not \`[[INF] * n] * n\`, which aliases rows), and pure-Python triple loops being slow for large V.

**Clarifying questions expected:**
- "How many nodes? Are negative weights or negative cycles possible?"
- "Do you need the routes, or only the distances?"

**Code / implementation expected:** Yes — a Python \`floyd_warshall(n, edges)\` returning the distance matrix, ideally plus a \`next\` matrix for route reconstruction.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph-algorithm background assumed
**Difficulty:** Hard
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Old road atlases had a mileage chart: a big table with every city down the side and across the top, and in each square the distance between the two cities. Suppose you only know the **direct** roads, so most squares are blank ("no direct road"). How do you fill in the whole chart?

Here is a patient way. First, allow trips to stop over in city 1: for every pair of cities, check whether going through city 1 is shorter than what the square says, and if so, write the new number. Then allow stopovers in city 2 as well (and city 1, which is already folded in): check every pair again, now through city 2. Keep going until every city has been allowed as a stopover. At the end every square holds the true shortest distance, because every shortest route is just a chain of stopovers, and each one has had its turn.

That is the Floyd-Warshall algorithm: three nested loops over a table, a single \`min\` inside, and the shortest distance between **every** pair of nodes at the end. It works with negative edge weights, and it tells you when a negative cycle exists. Robert Floyd published it as "Algorithm 97: Shortest Path" (Communications of the ACM 5(6), 1962); Stephen Warshall's "A theorem on Boolean matrices" (Journal of the ACM 9(1), 1962) is the same idea for reachability (true/false instead of distances).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you need distances between all pairs, or from one source? | One source is [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) or [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work); Floyd-Warshall is for all pairs. |
| How many nodes? | O(V³) is fine for a few hundred nodes and hopeless for 10^5. |
| Can weights be negative? Can there be a negative cycle? | Negative weights are fine; a negative cycle makes some distances undefined, and you should report it. |
| Directed or undirected? | Undirected roads go into the matrix both ways: \`dist[u][v]\` and \`dist[v][u]\`. |
| Do you need the routes or only the distances? | Routes need a second matrix (\`next\`), the same size as \`dist\`. |
| Can there be several edges between the same two nodes? | Keep the cheapest one when filling the matrix. |

## 3. The Core Idea: Allow One More Stopover at a Time

📌 **Interview term: All-pairs shortest paths** — the problem of finding the shortest distance between every ordered pair of nodes (i, j), usually stored as a V × V matrix \`dist\`.

Number the nodes 0 to V - 1. Call a node on a path an **intermediate node** if it is neither the start nor the end. Floyd-Warshall builds the answer in V stages. After stage k, \`dist[i][j]\` holds the shortest path from i to j that uses **only nodes 0..k as intermediate nodes**.

📌 **Interview term: Intermediate node** — any node on a path other than its two endpoints; Floyd-Warshall grows the set of allowed intermediate nodes one at a time.

Going from stage k - 1 to stage k, the shortest i → j path that may also pass through k either:

- does not use k: its length is the old \`dist[i][j]\`, or
- uses k exactly once: it goes i → k and then k → j, each part using only nodes 0..k - 1, so its length is the old \`dist[i][k] + dist[k][j]\`.

So the whole algorithm is one line, applied to every pair, for every k:

~~~text
dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="The Floyd-Warshall step, the route from i to j through k is compared with the best route from i to j so far">
  <defs>
    <marker id="fw2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge-accent" d="M 111 178 L 294 75" marker-end="url(#fw2-arrow)"/>
  <text class="d-text d-accent" x="192" y="111" text-anchor="middle">dist[i][k]</text>
  <path class="d-edge-accent" d="M 341 72 L 524 175" marker-end="url(#fw2-arrow)"/>
  <text class="d-text d-accent" x="443" y="108" text-anchor="middle">dist[k][j]</text>
  <path class="d-edge-dashed" d="M 114 190 L 520 190" marker-end="url(#fw2-arrow)"/>
  <text class="d-sub" x="317" y="214" text-anchor="middle">dist[i][j]</text>
  <circle class="d-box" cx="90" cy="190" r="24"/>
  <text class="d-text" x="90" y="195" text-anchor="middle">i</text>
  <circle class="d-box-accent" cx="320" cy="60" r="24"/>
  <text class="d-text" x="320" y="65" text-anchor="middle">k</text>
  <circle class="d-box" cx="550" cy="190" r="24"/>
  <text class="d-text" x="550" y="195" text-anchor="middle">j</text>
</svg>

📌 **Interview term: Dynamic programming over intermediate nodes** — Floyd-Warshall is a [dynamic programming](/interview-question/what-is-dynamic-programming) algorithm: the state is "best i → j distance using intermediates 0..k", and each stage is computed from the previous one with the recurrence above.

### Why one matrix is enough

A full DP table would have V + 1 layers of V × V numbers. Floyd-Warshall overwrites a single matrix in place. That is safe because, during stage k, row k and column k do not change: \`dist[i][k] = min(dist[i][k], dist[i][k] + dist[k][k])\`, and \`dist[k][k]\` is 0 when there is no negative cycle, so the \`min\` keeps the old value. Every update in stage k reads only row k and column k, so it does not matter whether it reads them before or after other cells change.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="A four by four distance matrix where row B and column B are highlighted because they feed every update when k is B">
  <text class="d-text" x="120" y="77" text-anchor="middle">A</text>
  <text class="d-text" x="185" y="36" text-anchor="middle">A</text>
  <rect class="d-box" x="150" y="50" width="70" height="44"/>
  <rect class="d-box-accent" x="220" y="50" width="70" height="44"/>
  <rect class="d-box" x="290" y="50" width="70" height="44"/>
  <rect class="d-box" x="360" y="50" width="70" height="44"/>
  <text class="d-text" x="120" y="121" text-anchor="middle">B</text>
  <text class="d-text" x="255" y="36" text-anchor="middle">B</text>
  <rect class="d-box-accent" x="150" y="94" width="70" height="44"/>
  <rect class="d-box-accent" x="220" y="94" width="70" height="44"/>
  <rect class="d-box-accent" x="290" y="94" width="70" height="44"/>
  <rect class="d-box-accent" x="360" y="94" width="70" height="44"/>
  <text class="d-text" x="120" y="165" text-anchor="middle">C</text>
  <text class="d-text" x="325" y="36" text-anchor="middle">C</text>
  <rect class="d-box" x="150" y="138" width="70" height="44"/>
  <rect class="d-box-accent" x="220" y="138" width="70" height="44"/>
  <rect class="d-box" x="290" y="138" width="70" height="44"/>
  <rect class="d-box" x="360" y="138" width="70" height="44"/>
  <text class="d-text" x="120" y="209" text-anchor="middle">D</text>
  <text class="d-text" x="395" y="36" text-anchor="middle">D</text>
  <rect class="d-box" x="150" y="182" width="70" height="44"/>
  <rect class="d-box-accent" x="220" y="182" width="70" height="44"/>
  <rect class="d-box" x="290" y="182" width="70" height="44"/>
  <rect class="d-box" x="360" y="182" width="70" height="44"/>
  <text class="d-sub" x="325" y="209" text-anchor="middle">D to C</text>
  <rect class="d-box-accent" x="460" y="60" width="160" height="64" rx="10"/>
  <text class="d-text" x="540" y="86" text-anchor="middle">k = B</text>
  <text class="d-sub" x="540" y="108" text-anchor="middle">row and column B</text>
  <rect class="d-box" x="460" y="150" width="160" height="64" rx="10"/>
  <text class="d-text" x="540" y="176" text-anchor="middle">every other cell</text>
  <text class="d-sub" x="540" y="198" text-anchor="middle">reads only them</text>
</svg>

When k = B, the cell for D to C is updated from \`dist[D][B] + dist[B][C]\`: one cell in column B plus one cell in row B. The same is true for every other cell, and none of the highlighted cells change during this stage.

## 4. Walking Through an Example

The examples use this directed graph:

<svg class="iq-diagram" width="100%" viewBox="0 0 560 360" role="img" aria-label="Example graph with four nodes A B C D and seven weighted directed edges">
  <defs>
    <marker id="fw1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 134 61 L 420 61" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="277" y="49" text-anchor="middle">3</text>
  <path class="d-edge" d="M 426 79 L 140 79" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="283" y="99" text-anchor="middle">8</text>
  <path class="d-edge" d="M 450 94 L 450 260" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="465" y="181" text-anchor="middle">2</text>
  <path class="d-edge" d="M 426 290 L 140 290" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="283" y="309" text-anchor="middle">1</text>
  <path class="d-edge" d="M 119 94 L 119 260" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="135" y="181" text-anchor="middle">7</text>
  <path class="d-edge" d="M 101 266 L 101 100" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="85" y="187" text-anchor="middle">2</text>
  <path class="d-edge" d="M 430 277 L 135 86" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="304" y="217" text-anchor="middle">5</text>
  <circle class="d-box" cx="110" cy="70" r="24"/>
  <text class="d-text" x="110" y="75" text-anchor="middle">A</text>
  <circle class="d-box" cx="450" cy="70" r="24"/>
  <text class="d-text" x="450" y="75" text-anchor="middle">B</text>
  <circle class="d-box" cx="450" cy="290" r="24"/>
  <text class="d-text" x="450" y="295" text-anchor="middle">C</text>
  <circle class="d-box" cx="110" cy="290" r="24"/>
  <text class="d-text" x="110" y="295" text-anchor="middle">D</text>
</svg>

The edges are A→B 3, A→D 7, B→A 8, B→C 2, C→A 5, C→D 1 and D→A 2. The starting matrix has 0 on the diagonal, the edge weight where a direct edge exists, and INF everywhere else (rows are "from", columns are "to"):

~~~text
       A   B   C   D
A      0   3 INF   7
B      8   0   2 INF
C      5 INF   0   1
D      2 INF INF   0
~~~

After the four stages (k = A, B, C, D):

~~~text
       A   B   C   D
A      0   3   5   6
B      5   0   2   3
C      3   6   0   1
D      2   5   7   0
~~~

Look at A to D: the direct edge costs 7, but A → B → C → D costs 3 + 2 + 1 = 6. And D to C, which had no direct edge at all, is now 7 via D → A → B → C. With V = 4 the inner statement ran 4 × 4 × 4 = 64 times, which Example 1 counts: \`inner loop ran 64 times for n = 4\`.

### Rebuilding the route

Distances alone do not say which way to go. Keep a second matrix \`next[i][j]\`: the first node to visit after i on the best route to j. Initialise it to \`j\` wherever a direct edge exists (and to i on the diagonal); whenever the route through k wins, set \`next[i][j] = next[i][k]\`, because the best route to j now starts the same way as the best route to k. To print a route, start at i and keep jumping \`i = next[i][j]\` until you reach j.

📌 **Interview term: Next-hop matrix** — \`next[i][j]\` is the first step on the shortest route from i to j; it lets you rebuild any route in O(length) time, the same way a router forwards a packet one hop at a time.

Example 1 prints:

~~~text
A to D: A -> B -> C -> D costs 6
D to C: D -> A -> B -> C costs 7
~~~

## 5. The Bug Everyone Makes: Loop Order

The three loops look symmetric, so it is tempting to write them as \`for i, for j, for k\`. That is **wrong**. With k innermost, \`dist[i][j]\` is finished as soon as its inner loop ends, before the parts it depends on (\`dist[i][k]\`, \`dist[k][j]\`) have been improved by later stages.

Example 2 uses the chain A → B → D → C with every edge costing 1. The true A to C distance is 3:

~~~text
A to C with k outside: 3
A to C with k inside:  INF
~~~

With k inside, the cell A to C is finalised while A to D is still INF (A to D is only computed later, when i = A and j = D), so the route through D is never seen. With k outside, every cell is revisited for every k, and the stages build on each other in the right order.

📌 **Interview term: Loop order invariant** — in Floyd-Warshall the intermediate-node loop k must be the outermost loop; i and j can be in either order inside it.

## 6. Negative Weights and Negative Cycles

Floyd-Warshall handles negative edge weights as long as there is no negative cycle. Example 2's second graph has A→B 4, A→C 5, C→B -3 and B→D 2; the shortest A to B goes through C (5 - 3 = 2), and A to D follows it (2 + 2 = 4):

~~~text
negative edge, A to B: 2, A to D: 4
~~~

📌 **Interview term: Negative cycle on the diagonal** — after Floyd-Warshall, \`dist[i][i] < 0\` exactly when node i lies on a negative cycle, because i can reach itself for less than nothing. This is the standard detection test.

Example 2's third graph has B → C costing 1 and C → B costing -3, a cycle of total -2:

~~~text
diagonal: A=0, B=-2, C=-4, D=0
nodes on a negative cycle: B, C
~~~

Once a negative cycle exists, the numbers in the matrix are not meaningful distances any more (C's diagonal is -4, not -2, because the algorithm went around the cycle more than once while updating). Only the sign of the diagonal is reliable: report "negative cycle", do not report the numbers. Any pair (i, j) where i can reach a node on the cycle and that node can reach j has no shortest distance at all.

## 7. The Code in Python

The matrix is a list of lists. Build it with a comprehension, \`[[... for j in range(n)] for i in range(n)]\`: each row is a new list. The shortcut \`[[INF] * n] * n\` repeats **the same row object** n times, so writing one cell writes the whole column. Running \`g = [[0]*2]*2; g[0][1] = 5\` printed:

~~~text
[[0, 5], [0, 5]]
~~~

Missing edges are \`float("inf")\`. Python's infinity absorbs additions (\`inf + (-3)\` is still \`inf\`), so \`dist[i][k] + dist[k][j] < dist[i][j]\` is safe even with negative weights and needs no special case.

~~~python
def floyd_warshall(n, edges):
    dist = [[0 if i == j else INF for j in range(n)] for i in range(n)]
    nxt = [[j if i == j else -1 for j in range(n)] for i in range(n)]
    for u, v, w in edges:
        if w < dist[u][v]:                 # keep the cheapest of parallel edges
            dist[u][v] = w
            nxt[u][v] = v
    steps = 0
    for k in range(n):                     # k MUST be the outer loop
        for i in range(n):
            for j in range(n):
                steps += 1
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
                    nxt[i][j] = nxt[i][k]  # first hop towards k
    return dist, nxt, steps
~~~

**Line by line:**

- Two comprehensions build \`dist\` (0 on the diagonal, \`INF\` elsewhere) and \`nxt\` (\`j\` on the diagonal, -1 elsewhere).
- \`if w < dist[u][v]\` keeps the cheapest of several parallel edges.
- \`for k in range(n)\` is the **outer** loop. Inside, every pair \`(i, j)\` is checked against the route through k.
- \`nxt[i][j] = nxt[i][k]\`: when the route through k wins, the first hop towards j is the first hop towards k.
- \`steps\` only counts the inner statement for Example 1; it shows the n³ work directly.
- A common speed-up in Python is to hoist the rows into locals inside the loops (\`row_k = dist[k]\`, \`row_i = dist[i]\`) so each inner step does fewer index lookups; it does not change the O(n³) count.

Rebuilding a route from the \`next\` matrix:

~~~python
def path(nxt, u, v):
    if nxt[u][v] == -1:
        return "no path"
    out = [NAMES[u]]
    while u != v:
        u = nxt[u][v]
        out.append(NAMES[u])
    return " -> ".join(out)
~~~

## 8. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — All-pairs distances and route rebuilding** prints:

~~~text
direct edges only:
       A   B   C   D
A      0   3 INF   7
B      8   0   2 INF
C      5 INF   0   1
D      2 INF INF   0
all-pairs shortest distances:
       A   B   C   D
A      0   3   5   6
B      5   0   2   3
C      3   6   0   1
D      2   5   7   0
A to D: A -> B -> C -> D costs 6
D to C: D -> A -> B -> C costs 7
inner loop ran 64 times for n = 4
~~~

**Example 2 — Loop order, negative edges and negative cycles** prints:

~~~text
A to C with k outside: 3
A to C with k inside:  INF
negative edge, A to B: 2, A to D: 4
diagonal: A=0, B=-2, C=-4, D=0
nodes on a negative cycle: B, C
~~~

**What the numbers show:** Example 1 turns the direct-edge matrix into the all-pairs matrix from section 4, rebuilds two routes, and counts exactly n³ = 64 inner steps. Example 2 shows the loop-order bug (INF instead of 3), a correct answer with a negative edge, and a negative cycle appearing as negative numbers on the diagonal.

## 9. Complexity

| Approach for all pairs | Time | Space | When to use |
| :--- | :--- | :--- | :--- |
| Floyd-Warshall | O(V³) | O(V²) | small or dense graphs; negative weights allowed |
| Dijkstra from every node | O(V × (V + E) log V) | O(V + E) per run | large sparse graphs, non-negative weights |
| Bellman-Ford from every node | O(V² × E) | O(V) per run | rarely; Floyd-Warshall is simpler |
| BFS from every node | O(V × (V + E)) | O(V) per run | unweighted graphs |

The time is exactly V × V × V executions of the inner statement (64 for V = 4 in Example 1; for V = 400 that is 64 million). The space is the V × V matrix, plus a second one if you keep \`next\`. Pure-Python triple loops pay interpreter overhead on every one of the V³ steps, so Floyd-Warshall in Python is practical only for small V (a few hundred nodes at most). The matrix of \`float\` and \`int\` objects is O(V²) memory.

On large sparse graphs with negative weights, Johnson's algorithm combines the two: one Bellman-Ford run to re-weight the edges so they become non-negative, then Dijkstra from every node. See [Big-O notation](/interview-question/what-is-big-o-notation) for the notation.

## 10. Edge Cases

- **Unreachable pair:** stays \`INF\`; route reconstruction must check \`next[i][j] == -1\` and report "no path".
- **Single node:** the matrix is \`[[0]]\`.
- **Self-loops:** a non-negative self-loop never beats the 0 on the diagonal; a negative one is a one-node negative cycle and shows up as \`dist[i][i] < 0\`.
- **Parallel edges:** keep the cheapest when filling the matrix.
- **Undirected graph:** fill both \`dist[u][v]\` and \`dist[v][u]\`. A negative undirected edge is itself a negative cycle (u → v → u).
- **Negative cycle:** detect it with the diagonal; do not report the other numbers.

## Common Pitfalls

- **k not outermost.** \`for i, for j, for k\` returns wrong answers without any error (Example 2 printed \`INF\` instead of \`3\`).
- **\`[[INF] * n] * n\`.** All rows are the same list, so one write changes every row (verified above). Use a comprehension.
- **Forgetting the diagonal.** \`dist[i][i]\` must start at 0; leaving it at \`INF\` makes every route that starts and ends at i look impossible and breaks the negative-cycle test.
- **Overwriting parallel edges.** \`dist[u][v] = w\` for every edge keeps the **last** one, not the cheapest; use \`min\`.
- **Trusting the numbers after a negative cycle.** Only \`dist[i][i] < 0\` is meaningful; report the cycle.
- **Using it for one source on a big sparse graph.** O(V³) is wasteful there; Dijkstra or Bellman-Ford from that source is the answer.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Floyd-Warshall fills a V × V matrix with the shortest distance between every pair by allowing one more intermediate node per stage.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The recurrence:</strong> <span style="color:#f0e2c8;">For each k, for each i, j: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])</code>, with k as the <strong style="color:#ffca28;">outer</strong> loop.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why in place works:</strong> <span style="color:#f0e2c8;">During stage k, row k and column k do not change, and every update only reads them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(V³) time and O(V²) space; great for a few hundred nodes, negative weights allowed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Extras:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[i][i] &lt; 0</code> means i is on a negative cycle; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nxt</code> matrix rebuilds routes; in Python build rows with a comprehension and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float("inf")</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must k be the outer loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Stage k needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[i][k]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[k][j]</code> to be final for intermediates 0..k-1. With k inner, a cell is finalised before its parts are ready; Example 2 printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INF</code> for a distance of 3.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Floyd-Warshall or Dijkstra from every node?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Dijkstra V times is O(V (V + E) log V), better for sparse graphs with non-negative weights. Floyd-Warshall is O(V³), simpler, and allows negative weights; it wins on small or dense graphs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you detect a negative cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After the loops, any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[i][i] &lt; 0</code> means i is on a negative cycle. Example 2 printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B, C</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you print the actual route?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nxt[i][j]</code>, set it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> for direct edges and to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nxt[i][k]</code> whenever the route through k wins, then follow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i = nxt[i][j]</code> until j.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is Warshall's algorithm?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same triple loop on booleans: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reach[i][j] = reach[i][j] or (reach[i][k] and reach[k][j])</code>. It computes the transitive closure, meaning which nodes can reach which.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **All-pairs shortest paths** | the shortest distance between every ordered pair of nodes |
| **Intermediate node** | a node on a path other than its start and end |
| **Dynamic programming over intermediate nodes** | stage k allows nodes 0..k as stopovers, built from stage k - 1 |
| **Next-hop matrix** | \`next[i][j]\` is the first step on the best route from i to j |
| **Loop order invariant** | the k loop must be outermost |
| **Negative cycle on the diagonal** | \`dist[i][i] < 0\` means i lies on a negative cycle |

---
**Conclusion:** Floyd-Warshall answers every pair at once: three nested loops with k outermost and one \`min\` inside, O(V³) time and O(V²) space. Negative weights are fine, a negative diagonal entry reveals a negative cycle, and a \`next\` matrix lets you print routes. In Python, build the matrix with a comprehension (never \`[[INF] * n] * n\`), use \`float("inf")\` for missing edges, and keep V small, because the triple loop runs in the interpreter. For one source, use [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) (non-negative weights) or [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work) (negative weights); for unweighted graphs, [BFS is enough](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths).`,
        examples: [
          { label: `All-pairs distances and route rebuilding`, code: `INF = float("inf")
NAMES = "ABCD"


def floyd_warshall(n, edges):
    dist = [[0 if i == j else INF for j in range(n)] for i in range(n)]
    nxt = [[j if i == j else -1 for j in range(n)] for i in range(n)]
    for u, v, w in edges:
        if w < dist[u][v]:                 # keep the cheapest of parallel edges
            dist[u][v] = w
            nxt[u][v] = v
    steps = 0
    for k in range(n):                     # k MUST be the outer loop
        for i in range(n):
            for j in range(n):
                steps += 1
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
                    nxt[i][j] = nxt[i][k]  # first hop towards k
    return dist, nxt, steps


def show(dist):
    print("    " + "".join(name.rjust(4) for name in NAMES))
    for i, row in enumerate(dist):
        print(NAMES[i].ljust(4) + "".join(("INF" if d == INF else str(d)).rjust(4) for d in row))


def path(nxt, u, v):
    if nxt[u][v] == -1:
        return "no path"
    out = [NAMES[u]]
    while u != v:
        u = nxt[u][v]
        out.append(NAMES[u])
    return " -> ".join(out)


edges = [(0, 1, 3), (0, 3, 7), (1, 0, 8), (1, 2, 2), (2, 0, 5), (2, 3, 1), (3, 0, 2)]
before = [[0 if i == j else INF for j in range(4)] for i in range(4)]
for u, v, w in edges:
    before[u][v] = w
print("direct edges only:")
show(before)
dist, nxt, steps = floyd_warshall(4, edges)
print("all-pairs shortest distances:")
show(dist)
print("A to D: " + path(nxt, 0, 3) + " costs " + str(dist[0][3]))
print("D to C: " + path(nxt, 3, 2) + " costs " + str(dist[3][2]))
print("inner loop ran " + str(steps) + " times for n = 4")` },
          { label: `Loop order, negative edges and negative cycles`, code: `INF = float("inf")


def init(n, edges):
    dist = [[0 if i == j else INF for j in range(n)] for i in range(n)]
    for u, v, w in edges:
        dist[u][v] = min(dist[u][v], w)
    return dist


def floyd_kij(n, edges):
    """Correct: the middle node k is the OUTER loop."""
    dist = init(n, edges)
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
    return dist


def floyd_ijk(n, edges):
    """Wrong: k is the INNER loop, so dist[i][j] is finished before its parts are."""
    dist = init(n, edges)
    for i in range(n):
        for j in range(n):
            for k in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
    return dist


def fmt(d):
    return "INF" if d == INF else str(d)


# 1. Loop order: the chain A -> B -> D -> C, every edge costs 1.
chain = [(0, 1, 1), (1, 3, 1), (3, 2, 1)]
print("A to C with k outside: " + fmt(floyd_kij(4, chain)[0][2]))
print("A to C with k inside:  " + fmt(floyd_ijk(4, chain)[0][2]))

# 2. Negative edge, no negative cycle: still correct.
neg = [(0, 1, 4), (0, 2, 5), (2, 1, -3), (1, 3, 2)]
d = floyd_kij(4, neg)
print("negative edge, A to B: " + fmt(d[0][1]) + ", A to D: " + fmt(d[0][3]))

# 3. Negative cycle B -> C -> B costs 1 - 3 = -2: it shows up on the diagonal.
cyc = [(0, 1, 1), (1, 2, 1), (2, 1, -3), (2, 3, 1)]
d = floyd_kij(4, cyc)
names = "ABCD"
print("diagonal: " + ", ".join(names[i] + "=" + fmt(d[i][i]) for i in range(4)))
print("nodes on a negative cycle: " + ", ".join(names[i] for i in range(4) if d[i][i] < 0))` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Explain the Floyd-Warshall algorithm. Implement it in JavaScript for a directed weighted graph with V nodes, return the matrix of shortest distances between every pair, and tell me how you would detect a negative cycle."

**What a strong answer should cover:**
- The DP idea: after processing k, \`dist[i][j]\` is the shortest path using only nodes 0..k as intermediates; the recurrence \`dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])\`.
- The loop order: k must be the outermost loop, and why updating one matrix in place is safe.
- O(V³) time and O(V²) space; when it beats running Dijkstra from every node (small or dense graphs, negative weights).
- Negative weights are fine; a negative cycle shows up as \`dist[i][i] < 0\`; a \`next\` matrix rebuilds routes.
- JavaScript specifics: \`Array.from\` for a 2D array (not \`new Array(n).fill(new Array(n))\`, which shares one row), \`Infinity\` arithmetic, and \`padStart\` for printing.

**Clarifying questions expected:**
- "How many nodes? Are negative weights or negative cycles possible?"
- "Do you need the routes, or only the distances?"

**Code / implementation expected:** Yes — a JavaScript \`floydWarshall(n, edges)\` returning the distance matrix, ideally plus a \`next\` matrix for route reconstruction.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph-algorithm background assumed
**Difficulty:** Hard
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Old road atlases had a mileage chart: a big table with every city down the side and across the top, and in each square the distance between the two cities. Suppose you only know the **direct** roads, so most squares are blank ("no direct road"). How do you fill in the whole chart?

Here is a patient way. First, allow trips to stop over in city 1: for every pair of cities, check whether going through city 1 is shorter than what the square says, and if so, write the new number. Then allow stopovers in city 2 as well (and city 1, which is already folded in): check every pair again, now through city 2. Keep going until every city has been allowed as a stopover. At the end every square holds the true shortest distance, because every shortest route is just a chain of stopovers, and each one has had its turn.

That is the Floyd-Warshall algorithm: three nested loops over a table, a single \`min\` inside, and the shortest distance between **every** pair of nodes at the end. It works with negative edge weights, and it tells you when a negative cycle exists. Robert Floyd published it as "Algorithm 97: Shortest Path" (Communications of the ACM 5(6), 1962); Stephen Warshall's "A theorem on Boolean matrices" (Journal of the ACM 9(1), 1962) is the same idea for reachability (true/false instead of distances).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you need distances between all pairs, or from one source? | One source is [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) or [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work); Floyd-Warshall is for all pairs. |
| How many nodes? | O(V³) is fine for a few hundred nodes and hopeless for 10^5. |
| Can weights be negative? Can there be a negative cycle? | Negative weights are fine; a negative cycle makes some distances undefined, and you should report it. |
| Directed or undirected? | Undirected roads go into the matrix both ways: \`dist[u][v]\` and \`dist[v][u]\`. |
| Do you need the routes or only the distances? | Routes need a second matrix (\`next\`), the same size as \`dist\`. |
| Can there be several edges between the same two nodes? | Keep the cheapest one when filling the matrix. |

## 3. The Core Idea: Allow One More Stopover at a Time

📌 **Interview term: All-pairs shortest paths** — the problem of finding the shortest distance between every ordered pair of nodes (i, j), usually stored as a V × V matrix \`dist\`.

Number the nodes 0 to V - 1. Call a node on a path an **intermediate node** if it is neither the start nor the end. Floyd-Warshall builds the answer in V stages. After stage k, \`dist[i][j]\` holds the shortest path from i to j that uses **only nodes 0..k as intermediate nodes**.

📌 **Interview term: Intermediate node** — any node on a path other than its two endpoints; Floyd-Warshall grows the set of allowed intermediate nodes one at a time.

Going from stage k - 1 to stage k, the shortest i → j path that may also pass through k either:

- does not use k: its length is the old \`dist[i][j]\`, or
- uses k exactly once: it goes i → k and then k → j, each part using only nodes 0..k - 1, so its length is the old \`dist[i][k] + dist[k][j]\`.

So the whole algorithm is one line, applied to every pair, for every k:

~~~text
dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="The Floyd-Warshall step, the route from i to j through k is compared with the best route from i to j so far">
  <defs>
    <marker id="fw2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge-accent" d="M 111 178 L 294 75" marker-end="url(#fw2-arrow)"/>
  <text class="d-text d-accent" x="192" y="111" text-anchor="middle">dist[i][k]</text>
  <path class="d-edge-accent" d="M 341 72 L 524 175" marker-end="url(#fw2-arrow)"/>
  <text class="d-text d-accent" x="443" y="108" text-anchor="middle">dist[k][j]</text>
  <path class="d-edge-dashed" d="M 114 190 L 520 190" marker-end="url(#fw2-arrow)"/>
  <text class="d-sub" x="317" y="214" text-anchor="middle">dist[i][j]</text>
  <circle class="d-box" cx="90" cy="190" r="24"/>
  <text class="d-text" x="90" y="195" text-anchor="middle">i</text>
  <circle class="d-box-accent" cx="320" cy="60" r="24"/>
  <text class="d-text" x="320" y="65" text-anchor="middle">k</text>
  <circle class="d-box" cx="550" cy="190" r="24"/>
  <text class="d-text" x="550" y="195" text-anchor="middle">j</text>
</svg>

📌 **Interview term: Dynamic programming over intermediate nodes** — Floyd-Warshall is a [dynamic programming](/interview-question/what-is-dynamic-programming) algorithm: the state is "best i → j distance using intermediates 0..k", and each stage is computed from the previous one with the recurrence above.

### Why one matrix is enough

A full DP table would have V + 1 layers of V × V numbers. Floyd-Warshall overwrites a single matrix in place. That is safe because, during stage k, row k and column k do not change: \`dist[i][k] = min(dist[i][k], dist[i][k] + dist[k][k])\`, and \`dist[k][k]\` is 0 when there is no negative cycle, so the \`min\` keeps the old value. Every update in stage k reads only row k and column k, so it does not matter whether it reads them before or after other cells change.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="A four by four distance matrix where row B and column B are highlighted because they feed every update when k is B">
  <text class="d-text" x="120" y="77" text-anchor="middle">A</text>
  <text class="d-text" x="185" y="36" text-anchor="middle">A</text>
  <rect class="d-box" x="150" y="50" width="70" height="44"/>
  <rect class="d-box-accent" x="220" y="50" width="70" height="44"/>
  <rect class="d-box" x="290" y="50" width="70" height="44"/>
  <rect class="d-box" x="360" y="50" width="70" height="44"/>
  <text class="d-text" x="120" y="121" text-anchor="middle">B</text>
  <text class="d-text" x="255" y="36" text-anchor="middle">B</text>
  <rect class="d-box-accent" x="150" y="94" width="70" height="44"/>
  <rect class="d-box-accent" x="220" y="94" width="70" height="44"/>
  <rect class="d-box-accent" x="290" y="94" width="70" height="44"/>
  <rect class="d-box-accent" x="360" y="94" width="70" height="44"/>
  <text class="d-text" x="120" y="165" text-anchor="middle">C</text>
  <text class="d-text" x="325" y="36" text-anchor="middle">C</text>
  <rect class="d-box" x="150" y="138" width="70" height="44"/>
  <rect class="d-box-accent" x="220" y="138" width="70" height="44"/>
  <rect class="d-box" x="290" y="138" width="70" height="44"/>
  <rect class="d-box" x="360" y="138" width="70" height="44"/>
  <text class="d-text" x="120" y="209" text-anchor="middle">D</text>
  <text class="d-text" x="395" y="36" text-anchor="middle">D</text>
  <rect class="d-box" x="150" y="182" width="70" height="44"/>
  <rect class="d-box-accent" x="220" y="182" width="70" height="44"/>
  <rect class="d-box" x="290" y="182" width="70" height="44"/>
  <rect class="d-box" x="360" y="182" width="70" height="44"/>
  <text class="d-sub" x="325" y="209" text-anchor="middle">D to C</text>
  <rect class="d-box-accent" x="460" y="60" width="160" height="64" rx="10"/>
  <text class="d-text" x="540" y="86" text-anchor="middle">k = B</text>
  <text class="d-sub" x="540" y="108" text-anchor="middle">row and column B</text>
  <rect class="d-box" x="460" y="150" width="160" height="64" rx="10"/>
  <text class="d-text" x="540" y="176" text-anchor="middle">every other cell</text>
  <text class="d-sub" x="540" y="198" text-anchor="middle">reads only them</text>
</svg>

When k = B, the cell for D to C is updated from \`dist[D][B] + dist[B][C]\`: one cell in column B plus one cell in row B. The same is true for every other cell, and none of the highlighted cells change during this stage.

## 4. Walking Through an Example

The examples use this directed graph:

<svg class="iq-diagram" width="100%" viewBox="0 0 560 360" role="img" aria-label="Example graph with four nodes A B C D and seven weighted directed edges">
  <defs>
    <marker id="fw1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 134 61 L 420 61" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="277" y="49" text-anchor="middle">3</text>
  <path class="d-edge" d="M 426 79 L 140 79" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="283" y="99" text-anchor="middle">8</text>
  <path class="d-edge" d="M 450 94 L 450 260" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="465" y="181" text-anchor="middle">2</text>
  <path class="d-edge" d="M 426 290 L 140 290" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="283" y="309" text-anchor="middle">1</text>
  <path class="d-edge" d="M 119 94 L 119 260" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="135" y="181" text-anchor="middle">7</text>
  <path class="d-edge" d="M 101 266 L 101 100" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="85" y="187" text-anchor="middle">2</text>
  <path class="d-edge" d="M 430 277 L 135 86" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="304" y="217" text-anchor="middle">5</text>
  <circle class="d-box" cx="110" cy="70" r="24"/>
  <text class="d-text" x="110" y="75" text-anchor="middle">A</text>
  <circle class="d-box" cx="450" cy="70" r="24"/>
  <text class="d-text" x="450" y="75" text-anchor="middle">B</text>
  <circle class="d-box" cx="450" cy="290" r="24"/>
  <text class="d-text" x="450" y="295" text-anchor="middle">C</text>
  <circle class="d-box" cx="110" cy="290" r="24"/>
  <text class="d-text" x="110" y="295" text-anchor="middle">D</text>
</svg>

The edges are A→B 3, A→D 7, B→A 8, B→C 2, C→A 5, C→D 1 and D→A 2. The starting matrix has 0 on the diagonal, the edge weight where a direct edge exists, and INF everywhere else (rows are "from", columns are "to"):

~~~text
       A   B   C   D
A      0   3 INF   7
B      8   0   2 INF
C      5 INF   0   1
D      2 INF INF   0
~~~

After the four stages (k = A, B, C, D):

~~~text
       A   B   C   D
A      0   3   5   6
B      5   0   2   3
C      3   6   0   1
D      2   5   7   0
~~~

Look at A to D: the direct edge costs 7, but A → B → C → D costs 3 + 2 + 1 = 6. And D to C, which had no direct edge at all, is now 7 via D → A → B → C. With V = 4 the inner statement ran 4 × 4 × 4 = 64 times, which Example 1 counts: \`inner loop ran 64 times for n = 4\`.

### Rebuilding the route

Distances alone do not say which way to go. Keep a second matrix \`next[i][j]\`: the first node to visit after i on the best route to j. Initialise it to \`j\` wherever a direct edge exists (and to i on the diagonal); whenever the route through k wins, set \`next[i][j] = next[i][k]\`, because the best route to j now starts the same way as the best route to k. To print a route, start at i and keep jumping \`i = next[i][j]\` until you reach j.

📌 **Interview term: Next-hop matrix** — \`next[i][j]\` is the first step on the shortest route from i to j; it lets you rebuild any route in O(length) time, the same way a router forwards a packet one hop at a time.

Example 1 prints:

~~~text
A to D: A -> B -> C -> D costs 6
D to C: D -> A -> B -> C costs 7
~~~

## 5. The Bug Everyone Makes: Loop Order

The three loops look symmetric, so it is tempting to write them as \`for i, for j, for k\`. That is **wrong**. With k innermost, \`dist[i][j]\` is finished as soon as its inner loop ends, before the parts it depends on (\`dist[i][k]\`, \`dist[k][j]\`) have been improved by later stages.

Example 2 uses the chain A → B → D → C with every edge costing 1. The true A to C distance is 3:

~~~text
A to C with k outside: 3
A to C with k inside:  INF
~~~

With k inside, the cell A to C is finalised while A to D is still INF (A to D is only computed later, when i = A and j = D), so the route through D is never seen. With k outside, every cell is revisited for every k, and the stages build on each other in the right order.

📌 **Interview term: Loop order invariant** — in Floyd-Warshall the intermediate-node loop k must be the outermost loop; i and j can be in either order inside it.

## 6. Negative Weights and Negative Cycles

Floyd-Warshall handles negative edge weights as long as there is no negative cycle. Example 2's second graph has A→B 4, A→C 5, C→B -3 and B→D 2; the shortest A to B goes through C (5 - 3 = 2), and A to D follows it (2 + 2 = 4):

~~~text
negative edge, A to B: 2, A to D: 4
~~~

📌 **Interview term: Negative cycle on the diagonal** — after Floyd-Warshall, \`dist[i][i] < 0\` exactly when node i lies on a negative cycle, because i can reach itself for less than nothing. This is the standard detection test.

Example 2's third graph has B → C costing 1 and C → B costing -3, a cycle of total -2:

~~~text
diagonal: A=0, B=-2, C=-4, D=0
nodes on a negative cycle: B, C
~~~

Once a negative cycle exists, the numbers in the matrix are not meaningful distances any more (C's diagonal is -4, not -2, because the algorithm went around the cycle more than once while updating). Only the sign of the diagonal is reliable: report "negative cycle", do not report the numbers. Any pair (i, j) where i can reach a node on the cycle and that node can reach j has no shortest distance at all.

## 7. The Code in JavaScript

Build the matrix with \`Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => ...))\`, which creates a new inner array per row. \`new Array(n).fill(row)\` puts **the same array object** in every slot: running \`const a = new Array(2).fill([]); a[0].push(1); console.log(a[1])\` printed

~~~text
[ 1 ]
~~~

because \`a[0]\` and \`a[1]\` are one array. Missing edges are \`Infinity\`, which absorbs additions (\`Infinity + (-3)\` is \`Infinity\`), so the comparison \`dist[i][k] + dist[k][j] < dist[i][j]\` is safe even with negative weights.

~~~javascript
function floydWarshall(n, edges) {
  const dist = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)));
  const next = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? j : -1)));
  for (const [u, v, w] of edges) {
    if (w < dist[u][v]) {                // keep the cheapest of parallel edges
      dist[u][v] = w;
      next[u][v] = v;
    }
  }
  let steps = 0;
  for (let k = 0; k < n; k++)            // k MUST be the outer loop
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        steps++;
        if (dist[i][k] + dist[k][j] < dist[i][j]) {   // Infinity + x stays Infinity
          dist[i][j] = dist[i][k] + dist[k][j];
          next[i][j] = next[i][k];       // first hop towards k
        }
      }
  return { dist, next, steps };
}
~~~

**Line by line:**

- Two nested \`Array.from\` calls build \`dist\` (0 on the diagonal, \`Infinity\` elsewhere) and \`next\` (\`j\` on the diagonal, -1 elsewhere).
- \`if (w < dist[u][v])\` keeps the cheapest of several parallel edges.
- \`for (let k = 0; k < n; k++)\` is the **outer** loop; inside, every pair \`(i, j)\` is checked against the route through k.
- \`next[i][j] = next[i][k]\`: when the route through k wins, the first hop towards j is the first hop towards k.
- \`steps\` only counts the inner statement for Example 1.
- For printing, \`String.prototype.padStart(4)\` right-aligns each number in a 4-character column and \`padEnd(4)\` left-aligns the row label.

Rebuilding a route from the \`next\` matrix:

~~~javascript
function path(next, u, v) {
  if (next[u][v] === -1) return "no path";
  const out = [NAMES[u]];
  while (u !== v) {
    u = next[u][v];
    out.push(NAMES[u]);
  }
  return out.join(" -> ");
}
~~~

## 8. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — All-pairs distances and route rebuilding** prints:

~~~text
direct edges only:
       A   B   C   D
A      0   3 INF   7
B      8   0   2 INF
C      5 INF   0   1
D      2 INF INF   0
all-pairs shortest distances:
       A   B   C   D
A      0   3   5   6
B      5   0   2   3
C      3   6   0   1
D      2   5   7   0
A to D: A -> B -> C -> D costs 6
D to C: D -> A -> B -> C costs 7
inner loop ran 64 times for n = 4
~~~

**Example 2 — Loop order, negative edges and negative cycles** prints:

~~~text
A to C with k outside: 3
A to C with k inside:  INF
negative edge, A to B: 2, A to D: 4
diagonal: A=0, B=-2, C=-4, D=0
nodes on a negative cycle: B, C
~~~

**What the numbers show:** Example 1 turns the direct-edge matrix into the all-pairs matrix from section 4, rebuilds two routes, and counts exactly n³ = 64 inner steps. Example 2 shows the loop-order bug (INF instead of 3), a correct answer with a negative edge, and a negative cycle appearing as negative numbers on the diagonal.

## 9. Complexity

| Approach for all pairs | Time | Space | When to use |
| :--- | :--- | :--- | :--- |
| Floyd-Warshall | O(V³) | O(V²) | small or dense graphs; negative weights allowed |
| Dijkstra from every node | O(V × (V + E) log V) | O(V + E) per run | large sparse graphs, non-negative weights |
| Bellman-Ford from every node | O(V² × E) | O(V) per run | rarely; Floyd-Warshall is simpler |
| BFS from every node | O(V × (V + E)) | O(V) per run | unweighted graphs |

The time is exactly V × V × V executions of the inner statement (64 for V = 4 in Example 1; for V = 400 that is 64 million). The space is the V × V matrix, plus a second one if you keep \`next\`. A JavaScript engine compiles the triple loop to fast machine code, but V³ is still V³: doubling V multiplies the work by 8. For large V with integer weights, a flat \`Float64Array(n * n)\` indexed as \`i * n + j\` avoids the array-of-arrays indirection. The matrix itself is O(V²) memory.

On large sparse graphs with negative weights, Johnson's algorithm combines the two: one Bellman-Ford run to re-weight the edges so they become non-negative, then Dijkstra from every node. See [Big-O notation](/interview-question/what-is-big-o-notation) for the notation.

## 10. Edge Cases

- **Unreachable pair:** stays \`INF\`; route reconstruction must check \`next[i][j] == -1\` and report "no path".
- **Single node:** the matrix is \`[[0]]\`.
- **Self-loops:** a non-negative self-loop never beats the 0 on the diagonal; a negative one is a one-node negative cycle and shows up as \`dist[i][i] < 0\`.
- **Parallel edges:** keep the cheapest when filling the matrix.
- **Undirected graph:** fill both \`dist[u][v]\` and \`dist[v][u]\`. A negative undirected edge is itself a negative cycle (u → v → u).
- **Negative cycle:** detect it with the diagonal; do not report the other numbers.

## Common Pitfalls

- **k not outermost.** \`for i, for j, for k\` returns wrong answers without any error (Example 2 printed \`INF\` instead of \`3\`).
- **\`new Array(n).fill(new Array(n).fill(Infinity))\`.** Every row is the same array (verified above). Use nested \`Array.from\`.
- **Forgetting the diagonal.** \`dist[i][i]\` must start at 0, or paths starting at i are wrong and the negative-cycle test breaks.
- **Overwriting parallel edges.** Assigning \`dist[u][v] = w\` for every edge keeps the last one; use \`Math.min\`.
- **Trusting the numbers after a negative cycle.** Only \`dist[i][i] < 0\` is meaningful; report the cycle.
- **Printing \`Infinity\` raw.** \`String(Infinity)\` is \`"Infinity"\`; format it yourself (\`"INF"\`) so the table lines up.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Floyd-Warshall fills a V × V matrix with the shortest distance between every pair by allowing one more intermediate node per stage.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The recurrence:</strong> <span style="color:#f0e2c8;">For each k, for each i, j: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j])</code>, with k as the <strong style="color:#ffca28;">outer</strong> loop.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why in place works:</strong> <span style="color:#f0e2c8;">During stage k, row k and column k do not change, and every update only reads them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(V³) time and O(V²) space; great for a few hundred nodes, negative weights allowed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Extras:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[i][i] &lt; 0</code> means i is on a negative cycle; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> matrix rebuilds routes; build rows with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from</code> and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Infinity</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must k be the outer loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Stage k needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[i][k]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[k][j]</code> to be final for intermediates 0..k-1. With k inner, a cell is finalised before its parts are ready; Example 2 printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INF</code> for a distance of 3.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Floyd-Warshall or Dijkstra from every node?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Dijkstra V times is O(V (V + E) log V), better for sparse graphs with non-negative weights. Floyd-Warshall is O(V³), simpler, and allows negative weights; it wins on small or dense graphs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you detect a negative cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After the loops, any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[i][i] &lt; 0</code> means i is on a negative cycle. Example 2 printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B, C</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you print the actual route?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next[i][j]</code>, set it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> for direct edges and to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next[i][k]</code> whenever the route through k wins, then follow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i = next[i][j]</code> until j.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is Warshall's algorithm?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same triple loop on booleans: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reach[i][j] = reach[i][j] || (reach[i][k] &amp;&amp; reach[k][j])</code>. It computes the transitive closure, meaning which nodes can reach which.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **All-pairs shortest paths** | the shortest distance between every ordered pair of nodes |
| **Intermediate node** | a node on a path other than its start and end |
| **Dynamic programming over intermediate nodes** | stage k allows nodes 0..k as stopovers, built from stage k - 1 |
| **Next-hop matrix** | \`next[i][j]\` is the first step on the best route from i to j |
| **Loop order invariant** | the k loop must be outermost |
| **Negative cycle on the diagonal** | \`dist[i][i] < 0\` means i lies on a negative cycle |

---
**Conclusion:** Floyd-Warshall answers every pair at once: three nested loops with k outermost and one \`min\` inside, O(V³) time and O(V²) space. Negative weights are fine, a negative diagonal entry reveals a negative cycle, and a \`next\` matrix lets you print routes. In JavaScript, build the matrix with nested \`Array.from\` (never \`fill\` with a shared row), use \`Infinity\` for missing edges, and format the output yourself. For one source, use [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) (non-negative weights) or [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work) (negative weights); for unweighted graphs, [BFS is enough](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths).`,
        examples: [
          { label: `All-pairs distances and route rebuilding`, code: `const NAMES = "ABCD";

function floydWarshall(n, edges) {
  const dist = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)));
  const next = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? j : -1)));
  for (const [u, v, w] of edges) {
    if (w < dist[u][v]) {                // keep the cheapest of parallel edges
      dist[u][v] = w;
      next[u][v] = v;
    }
  }
  let steps = 0;
  for (let k = 0; k < n; k++)            // k MUST be the outer loop
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        steps++;
        if (dist[i][k] + dist[k][j] < dist[i][j]) {   // Infinity + x stays Infinity
          dist[i][j] = dist[i][k] + dist[k][j];
          next[i][j] = next[i][k];       // first hop towards k
        }
      }
  return { dist, next, steps };
}

function show(dist) {
  console.log("    " + [...NAMES].map((s) => s.padStart(4)).join(""));
  dist.forEach((row, i) => {
    console.log(NAMES[i].padEnd(4) + row.map((d) => (d === Infinity ? "INF" : String(d)).padStart(4)).join(""));
  });
}

function path(next, u, v) {
  if (next[u][v] === -1) return "no path";
  const out = [NAMES[u]];
  while (u !== v) {
    u = next[u][v];
    out.push(NAMES[u]);
  }
  return out.join(" -> ");
}

const edges = [[0, 1, 3], [0, 3, 7], [1, 0, 8], [1, 2, 2], [2, 0, 5], [2, 3, 1], [3, 0, 2]];
const before = Array.from({ length: 4 }, (_, i) => Array.from({ length: 4 }, (_, j) => (i === j ? 0 : Infinity)));
for (const [u, v, w] of edges) before[u][v] = w;
console.log("direct edges only:");
show(before);
const r = floydWarshall(4, edges);
console.log("all-pairs shortest distances:");
show(r.dist);
console.log("A to D: " + path(r.next, 0, 3) + " costs " + r.dist[0][3]);
console.log("D to C: " + path(r.next, 3, 2) + " costs " + r.dist[3][2]);
console.log("inner loop ran " + r.steps + " times for n = 4");` },
          { label: `Loop order, negative edges and negative cycles`, code: `function init(n, edges) {
  const dist = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)));
  for (const [u, v, w] of edges) dist[u][v] = Math.min(dist[u][v], w);
  return dist;
}

// Correct: the middle node k is the OUTER loop.
function floydKij(n, edges) {
  const dist = init(n, edges);
  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];
  return dist;
}

// Wrong: k is the INNER loop, so dist[i][j] is finished before its parts are.
function floydIjk(n, edges) {
  const dist = init(n, edges);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < n; k++)
        if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];
  return dist;
}

const fmt = (d) => (d === Infinity ? "INF" : String(d));

// 1. Loop order: the chain A -> B -> D -> C, every edge costs 1.
const chain = [[0, 1, 1], [1, 3, 1], [3, 2, 1]];
console.log("A to C with k outside: " + fmt(floydKij(4, chain)[0][2]));
console.log("A to C with k inside:  " + fmt(floydIjk(4, chain)[0][2]));

// 2. Negative edge, no negative cycle: still correct.
const neg = [[0, 1, 4], [0, 2, 5], [2, 1, -3], [1, 3, 2]];
let d = floydKij(4, neg);
console.log("negative edge, A to B: " + fmt(d[0][1]) + ", A to D: " + fmt(d[0][3]));

// 3. Negative cycle B -> C -> B costs 1 - 3 = -2: it shows up on the diagonal.
const cyc = [[0, 1, 1], [1, 2, 1], [2, 1, -3], [2, 3, 1]];
d = floydKij(4, cyc);
const names = "ABCD";
console.log("diagonal: " + [0, 1, 2, 3].map((i) => names[i] + "=" + fmt(d[i][i])).join(", "));
console.log("nodes on a negative cycle: " + [0, 1, 2, 3].filter((i) => d[i][i] < 0).map((i) => names[i]).join(", "));` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Explain the Floyd-Warshall algorithm. Implement it in Java for a directed weighted graph with V nodes, return the matrix of shortest distances between every pair, and tell me how you would detect a negative cycle."

**What a strong answer should cover:**
- The DP idea: after processing k, \`dist[i][j]\` is the shortest path using only nodes 0..k as intermediates; the recurrence \`dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])\`.
- The loop order: k must be the outermost loop, and why updating one matrix in place is safe.
- O(V³) time and O(V²) space; when it beats running Dijkstra from every node (small or dense graphs, negative weights).
- Negative weights are fine; a negative cycle shows up as \`dist[i][i] < 0\`; a \`next\` matrix rebuilds routes.
- Java specifics: \`long[][]\` with an infinity that cannot overflow, the \`!= INF\` guard that also keeps negative weights from making unreachable pairs look reachable, and \`Arrays.fill\` per row.

**Clarifying questions expected:**
- "How many nodes? Are negative weights or negative cycles possible?"
- "Do you need the routes, or only the distances?"

**Code / implementation expected:** Yes — a Java \`floydWarshall(n, edges)\` returning a \`long[][]\`, ideally plus a \`next\` matrix for route reconstruction.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph-algorithm background assumed
**Difficulty:** Hard
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Old road atlases had a mileage chart: a big table with every city down the side and across the top, and in each square the distance between the two cities. Suppose you only know the **direct** roads, so most squares are blank ("no direct road"). How do you fill in the whole chart?

Here is a patient way. First, allow trips to stop over in city 1: for every pair of cities, check whether going through city 1 is shorter than what the square says, and if so, write the new number. Then allow stopovers in city 2 as well (and city 1, which is already folded in): check every pair again, now through city 2. Keep going until every city has been allowed as a stopover. At the end every square holds the true shortest distance, because every shortest route is just a chain of stopovers, and each one has had its turn.

That is the Floyd-Warshall algorithm: three nested loops over a table, a single \`min\` inside, and the shortest distance between **every** pair of nodes at the end. It works with negative edge weights, and it tells you when a negative cycle exists. Robert Floyd published it as "Algorithm 97: Shortest Path" (Communications of the ACM 5(6), 1962); Stephen Warshall's "A theorem on Boolean matrices" (Journal of the ACM 9(1), 1962) is the same idea for reachability (true/false instead of distances).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you need distances between all pairs, or from one source? | One source is [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) or [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work); Floyd-Warshall is for all pairs. |
| How many nodes? | O(V³) is fine for a few hundred nodes and hopeless for 10^5. |
| Can weights be negative? Can there be a negative cycle? | Negative weights are fine; a negative cycle makes some distances undefined, and you should report it. |
| Directed or undirected? | Undirected roads go into the matrix both ways: \`dist[u][v]\` and \`dist[v][u]\`. |
| Do you need the routes or only the distances? | Routes need a second matrix (\`next\`), the same size as \`dist\`. |
| Can there be several edges between the same two nodes? | Keep the cheapest one when filling the matrix. |

## 3. The Core Idea: Allow One More Stopover at a Time

📌 **Interview term: All-pairs shortest paths** — the problem of finding the shortest distance between every ordered pair of nodes (i, j), usually stored as a V × V matrix \`dist\`.

Number the nodes 0 to V - 1. Call a node on a path an **intermediate node** if it is neither the start nor the end. Floyd-Warshall builds the answer in V stages. After stage k, \`dist[i][j]\` holds the shortest path from i to j that uses **only nodes 0..k as intermediate nodes**.

📌 **Interview term: Intermediate node** — any node on a path other than its two endpoints; Floyd-Warshall grows the set of allowed intermediate nodes one at a time.

Going from stage k - 1 to stage k, the shortest i → j path that may also pass through k either:

- does not use k: its length is the old \`dist[i][j]\`, or
- uses k exactly once: it goes i → k and then k → j, each part using only nodes 0..k - 1, so its length is the old \`dist[i][k] + dist[k][j]\`.

So the whole algorithm is one line, applied to every pair, for every k:

~~~text
dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="The Floyd-Warshall step, the route from i to j through k is compared with the best route from i to j so far">
  <defs>
    <marker id="fw2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge-accent" d="M 111 178 L 294 75" marker-end="url(#fw2-arrow)"/>
  <text class="d-text d-accent" x="192" y="111" text-anchor="middle">dist[i][k]</text>
  <path class="d-edge-accent" d="M 341 72 L 524 175" marker-end="url(#fw2-arrow)"/>
  <text class="d-text d-accent" x="443" y="108" text-anchor="middle">dist[k][j]</text>
  <path class="d-edge-dashed" d="M 114 190 L 520 190" marker-end="url(#fw2-arrow)"/>
  <text class="d-sub" x="317" y="214" text-anchor="middle">dist[i][j]</text>
  <circle class="d-box" cx="90" cy="190" r="24"/>
  <text class="d-text" x="90" y="195" text-anchor="middle">i</text>
  <circle class="d-box-accent" cx="320" cy="60" r="24"/>
  <text class="d-text" x="320" y="65" text-anchor="middle">k</text>
  <circle class="d-box" cx="550" cy="190" r="24"/>
  <text class="d-text" x="550" y="195" text-anchor="middle">j</text>
</svg>

📌 **Interview term: Dynamic programming over intermediate nodes** — Floyd-Warshall is a [dynamic programming](/interview-question/what-is-dynamic-programming) algorithm: the state is "best i → j distance using intermediates 0..k", and each stage is computed from the previous one with the recurrence above.

### Why one matrix is enough

A full DP table would have V + 1 layers of V × V numbers. Floyd-Warshall overwrites a single matrix in place. That is safe because, during stage k, row k and column k do not change: \`dist[i][k] = min(dist[i][k], dist[i][k] + dist[k][k])\`, and \`dist[k][k]\` is 0 when there is no negative cycle, so the \`min\` keeps the old value. Every update in stage k reads only row k and column k, so it does not matter whether it reads them before or after other cells change.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="A four by four distance matrix where row B and column B are highlighted because they feed every update when k is B">
  <text class="d-text" x="120" y="77" text-anchor="middle">A</text>
  <text class="d-text" x="185" y="36" text-anchor="middle">A</text>
  <rect class="d-box" x="150" y="50" width="70" height="44"/>
  <rect class="d-box-accent" x="220" y="50" width="70" height="44"/>
  <rect class="d-box" x="290" y="50" width="70" height="44"/>
  <rect class="d-box" x="360" y="50" width="70" height="44"/>
  <text class="d-text" x="120" y="121" text-anchor="middle">B</text>
  <text class="d-text" x="255" y="36" text-anchor="middle">B</text>
  <rect class="d-box-accent" x="150" y="94" width="70" height="44"/>
  <rect class="d-box-accent" x="220" y="94" width="70" height="44"/>
  <rect class="d-box-accent" x="290" y="94" width="70" height="44"/>
  <rect class="d-box-accent" x="360" y="94" width="70" height="44"/>
  <text class="d-text" x="120" y="165" text-anchor="middle">C</text>
  <text class="d-text" x="325" y="36" text-anchor="middle">C</text>
  <rect class="d-box" x="150" y="138" width="70" height="44"/>
  <rect class="d-box-accent" x="220" y="138" width="70" height="44"/>
  <rect class="d-box" x="290" y="138" width="70" height="44"/>
  <rect class="d-box" x="360" y="138" width="70" height="44"/>
  <text class="d-text" x="120" y="209" text-anchor="middle">D</text>
  <text class="d-text" x="395" y="36" text-anchor="middle">D</text>
  <rect class="d-box" x="150" y="182" width="70" height="44"/>
  <rect class="d-box-accent" x="220" y="182" width="70" height="44"/>
  <rect class="d-box" x="290" y="182" width="70" height="44"/>
  <rect class="d-box" x="360" y="182" width="70" height="44"/>
  <text class="d-sub" x="325" y="209" text-anchor="middle">D to C</text>
  <rect class="d-box-accent" x="460" y="60" width="160" height="64" rx="10"/>
  <text class="d-text" x="540" y="86" text-anchor="middle">k = B</text>
  <text class="d-sub" x="540" y="108" text-anchor="middle">row and column B</text>
  <rect class="d-box" x="460" y="150" width="160" height="64" rx="10"/>
  <text class="d-text" x="540" y="176" text-anchor="middle">every other cell</text>
  <text class="d-sub" x="540" y="198" text-anchor="middle">reads only them</text>
</svg>

When k = B, the cell for D to C is updated from \`dist[D][B] + dist[B][C]\`: one cell in column B plus one cell in row B. The same is true for every other cell, and none of the highlighted cells change during this stage.

## 4. Walking Through an Example

The examples use this directed graph:

<svg class="iq-diagram" width="100%" viewBox="0 0 560 360" role="img" aria-label="Example graph with four nodes A B C D and seven weighted directed edges">
  <defs>
    <marker id="fw1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 134 61 L 420 61" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="277" y="49" text-anchor="middle">3</text>
  <path class="d-edge" d="M 426 79 L 140 79" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="283" y="99" text-anchor="middle">8</text>
  <path class="d-edge" d="M 450 94 L 450 260" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="465" y="181" text-anchor="middle">2</text>
  <path class="d-edge" d="M 426 290 L 140 290" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="283" y="309" text-anchor="middle">1</text>
  <path class="d-edge" d="M 119 94 L 119 260" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="135" y="181" text-anchor="middle">7</text>
  <path class="d-edge" d="M 101 266 L 101 100" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="85" y="187" text-anchor="middle">2</text>
  <path class="d-edge" d="M 430 277 L 135 86" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="304" y="217" text-anchor="middle">5</text>
  <circle class="d-box" cx="110" cy="70" r="24"/>
  <text class="d-text" x="110" y="75" text-anchor="middle">A</text>
  <circle class="d-box" cx="450" cy="70" r="24"/>
  <text class="d-text" x="450" y="75" text-anchor="middle">B</text>
  <circle class="d-box" cx="450" cy="290" r="24"/>
  <text class="d-text" x="450" y="295" text-anchor="middle">C</text>
  <circle class="d-box" cx="110" cy="290" r="24"/>
  <text class="d-text" x="110" y="295" text-anchor="middle">D</text>
</svg>

The edges are A→B 3, A→D 7, B→A 8, B→C 2, C→A 5, C→D 1 and D→A 2. The starting matrix has 0 on the diagonal, the edge weight where a direct edge exists, and INF everywhere else (rows are "from", columns are "to"):

~~~text
       A   B   C   D
A      0   3 INF   7
B      8   0   2 INF
C      5 INF   0   1
D      2 INF INF   0
~~~

After the four stages (k = A, B, C, D):

~~~text
       A   B   C   D
A      0   3   5   6
B      5   0   2   3
C      3   6   0   1
D      2   5   7   0
~~~

Look at A to D: the direct edge costs 7, but A → B → C → D costs 3 + 2 + 1 = 6. And D to C, which had no direct edge at all, is now 7 via D → A → B → C. With V = 4 the inner statement ran 4 × 4 × 4 = 64 times, which Example 1 counts: \`inner loop ran 64 times for n = 4\`.

### Rebuilding the route

Distances alone do not say which way to go. Keep a second matrix \`next[i][j]\`: the first node to visit after i on the best route to j. Initialise it to \`j\` wherever a direct edge exists (and to i on the diagonal); whenever the route through k wins, set \`next[i][j] = next[i][k]\`, because the best route to j now starts the same way as the best route to k. To print a route, start at i and keep jumping \`i = next[i][j]\` until you reach j.

📌 **Interview term: Next-hop matrix** — \`next[i][j]\` is the first step on the shortest route from i to j; it lets you rebuild any route in O(length) time, the same way a router forwards a packet one hop at a time.

Example 1 prints:

~~~text
A to D: A -> B -> C -> D costs 6
D to C: D -> A -> B -> C costs 7
~~~

## 5. The Bug Everyone Makes: Loop Order

The three loops look symmetric, so it is tempting to write them as \`for i, for j, for k\`. That is **wrong**. With k innermost, \`dist[i][j]\` is finished as soon as its inner loop ends, before the parts it depends on (\`dist[i][k]\`, \`dist[k][j]\`) have been improved by later stages.

Example 2 uses the chain A → B → D → C with every edge costing 1. The true A to C distance is 3:

~~~text
A to C with k outside: 3
A to C with k inside:  INF
~~~

With k inside, the cell A to C is finalised while A to D is still INF (A to D is only computed later, when i = A and j = D), so the route through D is never seen. With k outside, every cell is revisited for every k, and the stages build on each other in the right order.

📌 **Interview term: Loop order invariant** — in Floyd-Warshall the intermediate-node loop k must be the outermost loop; i and j can be in either order inside it.

## 6. Negative Weights and Negative Cycles

Floyd-Warshall handles negative edge weights as long as there is no negative cycle. Example 2's second graph has A→B 4, A→C 5, C→B -3 and B→D 2; the shortest A to B goes through C (5 - 3 = 2), and A to D follows it (2 + 2 = 4):

~~~text
negative edge, A to B: 2, A to D: 4
~~~

📌 **Interview term: Negative cycle on the diagonal** — after Floyd-Warshall, \`dist[i][i] < 0\` exactly when node i lies on a negative cycle, because i can reach itself for less than nothing. This is the standard detection test.

Example 2's third graph has B → C costing 1 and C → B costing -3, a cycle of total -2:

~~~text
diagonal: A=0, B=-2, C=-4, D=0
nodes on a negative cycle: B, C
~~~

Once a negative cycle exists, the numbers in the matrix are not meaningful distances any more (C's diagonal is -4, not -2, because the algorithm went around the cycle more than once while updating). Only the sign of the diagonal is reliable: report "negative cycle", do not report the numbers. Any pair (i, j) where i can reach a node on the cycle and that node can reach j has no shortest distance at all.

## 7. The Code in Java

Java has no infinity for integers, so we pick a sentinel. \`Integer.MAX_VALUE\` is a trap: \`Integer.MAX_VALUE + 1\` printed \`-2147483648\`, so \`INF + INF\` would look like a very short path. This page uses \`long\` with \`INF = Long.MAX_VALUE / 4\`, so even \`INF + INF\` fits, **and** it skips any pair where either half is \`INF\`. The guard matters for correctness too, not just overflow: with a negative edge, \`INF + (-3)\` would be smaller than \`INF\` and an unreachable pair would suddenly look reachable.

\`new long[n][n]\` allocates n separate rows (all zeros), so unlike some other languages there is no shared-row trap; fill each row with \`Arrays.fill(dist[i], INF)\`.

~~~java
static long[][] floydWarshall(int n, int[][] edges) {
    long[][] dist = new long[n][n];
    next = new int[n][n];
    for (int i = 0; i < n; i++) {
        Arrays.fill(dist[i], INF);
        Arrays.fill(next[i], -1);
        dist[i][i] = 0;
        next[i][i] = i;
    }
    for (int[] e : edges) {
        if (e[2] < dist[e[0]][e[1]]) {        // keep the cheapest of parallel edges
            dist[e[0]][e[1]] = e[2];
            next[e[0]][e[1]] = e[1];
        }
    }
    steps = 0;
    for (int k = 0; k < n; k++)               // k MUST be the outer loop
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++) {
                steps++;
                if (dist[i][k] == INF || dist[k][j] == INF) continue;
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                    next[i][j] = next[i][k];  // first hop towards k
                }
            }
    return dist;
}
~~~

**Line by line:**

- The first loop fills each row with \`INF\` and -1, then sets the diagonal to 0 and \`next[i][i] = i\`.
- \`if (e[2] < dist[e[0]][e[1]])\` keeps the cheapest of several parallel edges.
- \`for (int k = 0; k < n; k++)\` is the **outer** loop.
- \`if (dist[i][k] == INF || dist[k][j] == INF) continue;\` is the guard described above.
- \`next[i][j] = next[i][k]\`: when the route through k wins, the first hop towards j is the first hop towards k.
- The results are returned through the return value (\`dist\`) and two static fields (\`next\`, \`steps\`) to keep the example short.
- Printing uses \`String.format("%4s", ...)\` to right-align each cell and \`"%-4s"\` to left-align the row label.

Rebuilding a route from the \`next\` matrix:

~~~java
static String path(int u, int v) {
    if (next[u][v] == -1) return "no path";
    StringJoiner sj = new StringJoiner(" -> ");
    sj.add(String.valueOf(NAMES.charAt(u)));
    while (u != v) {
        u = next[u][v];
        sj.add(String.valueOf(NAMES.charAt(u)));
    }
    return sj.toString();
}
~~~

## 8. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — All-pairs distances and route rebuilding** prints:

~~~text
direct edges only:
       A   B   C   D
A      0   3 INF   7
B      8   0   2 INF
C      5 INF   0   1
D      2 INF INF   0
all-pairs shortest distances:
       A   B   C   D
A      0   3   5   6
B      5   0   2   3
C      3   6   0   1
D      2   5   7   0
A to D: A -> B -> C -> D costs 6
D to C: D -> A -> B -> C costs 7
inner loop ran 64 times for n = 4
~~~

**Example 2 — Loop order, negative edges and negative cycles** prints:

~~~text
A to C with k outside: 3
A to C with k inside:  INF
negative edge, A to B: 2, A to D: 4
diagonal: A=0, B=-2, C=-4, D=0
nodes on a negative cycle: B, C
~~~

**What the numbers show:** Example 1 turns the direct-edge matrix into the all-pairs matrix from section 4, rebuilds two routes, and counts exactly n³ = 64 inner steps. Example 2 shows the loop-order bug (INF instead of 3), a correct answer with a negative edge, and a negative cycle appearing as negative numbers on the diagonal.

## 9. Complexity

| Approach for all pairs | Time | Space | When to use |
| :--- | :--- | :--- | :--- |
| Floyd-Warshall | O(V³) | O(V²) | small or dense graphs; negative weights allowed |
| Dijkstra from every node | O(V × (V + E) log V) | O(V + E) per run | large sparse graphs, non-negative weights |
| Bellman-Ford from every node | O(V² × E) | O(V) per run | rarely; Floyd-Warshall is simpler |
| BFS from every node | O(V × (V + E)) | O(V) per run | unweighted graphs |

The time is exactly V × V × V executions of the inner statement (64 for V = 4 in Example 1; for V = 400 that is 64 million). The space is the V × V matrix, plus a second one if you keep \`next\`. A \`long[][]\` is an array of row arrays; for V in the hundreds it is a few hundred kilobytes to a few megabytes. The triple loop over primitive \`long\` values does no allocation and no boxing, which is what you want in the hot loop.

On large sparse graphs with negative weights, Johnson's algorithm combines the two: one Bellman-Ford run to re-weight the edges so they become non-negative, then Dijkstra from every node. See [Big-O notation](/interview-question/what-is-big-o-notation) for the notation.

## 10. Edge Cases

- **Unreachable pair:** stays \`INF\`; route reconstruction must check \`next[i][j] == -1\` and report "no path".
- **Single node:** the matrix is \`[[0]]\`.
- **Self-loops:** a non-negative self-loop never beats the 0 on the diagonal; a negative one is a one-node negative cycle and shows up as \`dist[i][i] < 0\`.
- **Parallel edges:** keep the cheapest when filling the matrix.
- **Undirected graph:** fill both \`dist[u][v]\` and \`dist[v][u]\`. A negative undirected edge is itself a negative cycle (u → v → u).
- **Negative cycle:** detect it with the diagonal; do not report the other numbers.

## Common Pitfalls

- **k not outermost.** \`for i, for j, for k\` returns wrong answers without any error (Example 2 printed \`INF\` instead of \`3\`).
- **\`Integer.MAX_VALUE\` as infinity.** \`INF + anything positive\` overflows to a negative number (\`-2147483648\` above). Use \`long\` and a smaller sentinel, and guard.
- **No \`!= INF\` guard with negative weights.** \`INF + (-3) < INF\`, so an unreachable pair gets a fake finite distance.
- **Forgetting the diagonal.** \`dist[i][i]\` must start at 0, or paths starting at i are wrong and the negative-cycle test breaks.
- **Overwriting parallel edges.** Keep the minimum: \`Math.min(dist[u][v], w)\`.
- **Trusting the numbers after a negative cycle.** Only \`dist[i][i] < 0\` is meaningful; report the cycle.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Floyd-Warshall fills a V × V matrix with the shortest distance between every pair by allowing one more intermediate node per stage.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The recurrence:</strong> <span style="color:#f0e2c8;">For each k, for each i, j: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j])</code>, with k as the <strong style="color:#ffca28;">outer</strong> loop.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why in place works:</strong> <span style="color:#f0e2c8;">During stage k, row k and column k do not change, and every update only reads them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(V³) time and O(V²) space; great for a few hundred nodes, negative weights allowed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long[][]</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INF = Long.MAX_VALUE / 4</code>, skip pairs where either half is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INF</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[i][i] &lt; 0</code> flags a negative cycle.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must k be the outer loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Stage k needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[i][k]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[k][j]</code> to be final for intermediates 0..k-1. With k inner, a cell is finalised before its parts are ready; Example 2 printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INF</code> for a distance of 3.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Floyd-Warshall or Dijkstra from every node?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Dijkstra V times is O(V (V + E) log V), better for sparse graphs with non-negative weights. Floyd-Warshall is O(V³), simpler, and allows negative weights; it wins on small or dense graphs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Long.MAX_VALUE / 4</code> and a guard?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The division leaves room so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INF + INF</code> cannot overflow; the guard stops <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INF + negativeWeight</code> from looking like a real distance. Either alone is not enough with negative weights.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you detect a negative cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After the loops, any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[i][i] &lt; 0</code> means i is on a negative cycle. Example 2 printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B, C</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you print the actual route?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next[i][j]</code>, set it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> for direct edges and to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next[i][k]</code> whenever the route through k wins, then follow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i = next[i][j]</code> until j.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **All-pairs shortest paths** | the shortest distance between every ordered pair of nodes |
| **Intermediate node** | a node on a path other than its start and end |
| **Dynamic programming over intermediate nodes** | stage k allows nodes 0..k as stopovers, built from stage k - 1 |
| **Next-hop matrix** | \`next[i][j]\` is the first step on the best route from i to j |
| **Loop order invariant** | the k loop must be outermost |
| **Negative cycle on the diagonal** | \`dist[i][i] < 0\` means i lies on a negative cycle |

---
**Conclusion:** Floyd-Warshall answers every pair at once: three nested loops with k outermost and one \`min\` inside, O(V³) time and O(V²) space. Negative weights are fine, a negative diagonal entry reveals a negative cycle, and a \`next\` matrix lets you print routes. In Java the details that matter are \`long[][]\`, an infinity like \`Long.MAX_VALUE / 4\`, and the \`!= INF\` guard that protects against both overflow and negative weights. For one source, use [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) (non-negative weights) or [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work) (negative weights); for unweighted graphs, [BFS is enough](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths).`,
        examples: [
          { label: `All-pairs distances and route rebuilding`, code: `import java.util.*;

public class Main {
    // A "large but safe" infinity: INF + INF still fits in a long, but we guard anyway.
    static final long INF = Long.MAX_VALUE / 4;
    static final String NAMES = "ABCD";
    static int[][] next;
    static int steps;

    static long[][] floydWarshall(int n, int[][] edges) {
        long[][] dist = new long[n][n];
        next = new int[n][n];
        for (int i = 0; i < n; i++) {
            Arrays.fill(dist[i], INF);
            Arrays.fill(next[i], -1);
            dist[i][i] = 0;
            next[i][i] = i;
        }
        for (int[] e : edges) {
            if (e[2] < dist[e[0]][e[1]]) {        // keep the cheapest of parallel edges
                dist[e[0]][e[1]] = e[2];
                next[e[0]][e[1]] = e[1];
            }
        }
        steps = 0;
        for (int k = 0; k < n; k++)               // k MUST be the outer loop
            for (int i = 0; i < n; i++)
                for (int j = 0; j < n; j++) {
                    steps++;
                    if (dist[i][k] == INF || dist[k][j] == INF) continue;
                    if (dist[i][k] + dist[k][j] < dist[i][j]) {
                        dist[i][j] = dist[i][k] + dist[k][j];
                        next[i][j] = next[i][k];  // first hop towards k
                    }
                }
        return dist;
    }

    static void show(long[][] dist) {
        StringBuilder sb = new StringBuilder("    ");
        for (char c : NAMES.toCharArray()) sb.append(String.format("%4s", c));
        System.out.println(sb);
        for (int i = 0; i < dist.length; i++) {
            sb = new StringBuilder(String.format("%-4s", NAMES.charAt(i)));
            for (long d : dist[i]) sb.append(String.format("%4s", d == INF ? "INF" : String.valueOf(d)));
            System.out.println(sb);
        }
    }

    static String path(int u, int v) {
        if (next[u][v] == -1) return "no path";
        StringJoiner sj = new StringJoiner(" -> ");
        sj.add(String.valueOf(NAMES.charAt(u)));
        while (u != v) {
            u = next[u][v];
            sj.add(String.valueOf(NAMES.charAt(u)));
        }
        return sj.toString();
    }

    public static void main(String[] args) {
        int[][] edges = {{0, 1, 3}, {0, 3, 7}, {1, 0, 8}, {1, 2, 2}, {2, 0, 5}, {2, 3, 1}, {3, 0, 2}};
        long[][] before = new long[4][4];
        for (int i = 0; i < 4; i++) { Arrays.fill(before[i], INF); before[i][i] = 0; }
        for (int[] e : edges) before[e[0]][e[1]] = e[2];
        System.out.println("direct edges only:");
        show(before);
        long[][] dist = floydWarshall(4, edges);
        System.out.println("all-pairs shortest distances:");
        show(dist);
        System.out.println("A to D: " + path(0, 3) + " costs " + dist[0][3]);
        System.out.println("D to C: " + path(3, 2) + " costs " + dist[3][2]);
        System.out.println("inner loop ran " + steps + " times for n = 4");
    }
}` },
          { label: `Loop order, negative edges and negative cycles`, code: `import java.util.*;

public class Main {
    static final long INF = Long.MAX_VALUE / 4;

    static long[][] init(int n, int[][] edges) {
        long[][] dist = new long[n][n];
        for (int i = 0; i < n; i++) { Arrays.fill(dist[i], INF); dist[i][i] = 0; }
        for (int[] e : edges) dist[e[0]][e[1]] = Math.min(dist[e[0]][e[1]], e[2]);
        return dist;
    }

    // Without this guard, INF + (-3) would look like a real, slightly cheaper distance.
    static boolean better(long[][] d, int i, int k, int j) {
        return d[i][k] != INF && d[k][j] != INF && d[i][k] + d[k][j] < d[i][j];
    }

    // Correct: the middle node k is the OUTER loop.
    static long[][] floydKij(int n, int[][] edges) {
        long[][] d = init(n, edges);
        for (int k = 0; k < n; k++)
            for (int i = 0; i < n; i++)
                for (int j = 0; j < n; j++)
                    if (better(d, i, k, j)) d[i][j] = d[i][k] + d[k][j];
        return d;
    }

    // Wrong: k is the INNER loop, so d[i][j] is finished before its parts are.
    static long[][] floydIjk(int n, int[][] edges) {
        long[][] d = init(n, edges);
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                for (int k = 0; k < n; k++)
                    if (better(d, i, k, j)) d[i][j] = d[i][k] + d[k][j];
        return d;
    }

    static String fmt(long d) {
        return d == INF ? "INF" : String.valueOf(d);
    }

    public static void main(String[] args) {
        // 1. Loop order: the chain A -> B -> D -> C, every edge costs 1.
        int[][] chain = {{0, 1, 1}, {1, 3, 1}, {3, 2, 1}};
        System.out.println("A to C with k outside: " + fmt(floydKij(4, chain)[0][2]));
        System.out.println("A to C with k inside:  " + fmt(floydIjk(4, chain)[0][2]));

        // 2. Negative edge, no negative cycle: still correct.
        int[][] neg = {{0, 1, 4}, {0, 2, 5}, {2, 1, -3}, {1, 3, 2}};
        long[][] d = floydKij(4, neg);
        System.out.println("negative edge, A to B: " + fmt(d[0][1]) + ", A to D: " + fmt(d[0][3]));

        // 3. Negative cycle B -> C -> B costs 1 - 3 = -2: it shows up on the diagonal.
        int[][] cyc = {{0, 1, 1}, {1, 2, 1}, {2, 1, -3}, {2, 3, 1}};
        d = floydKij(4, cyc);
        String names = "ABCD";
        StringJoiner diag = new StringJoiner(", "), bad = new StringJoiner(", ");
        for (int i = 0; i < 4; i++) {
            diag.add(names.charAt(i) + "=" + fmt(d[i][i]));
            if (d[i][i] < 0) bad.add(String.valueOf(names.charAt(i)));
        }
        System.out.println("diagonal: " + diag);
        System.out.println("nodes on a negative cycle: " + bad);
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Explain the Floyd-Warshall algorithm. Implement it in C++ for a directed weighted graph with V nodes, return the matrix of shortest distances between every pair, and tell me how you would detect a negative cycle."

**What a strong answer should cover:**
- The DP idea: after processing k, \`dist[i][j]\` is the shortest path using only nodes 0..k as intermediates; the recurrence \`dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])\`.
- The loop order: k must be the outermost loop, and why updating one matrix in place is safe.
- O(V³) time and O(V²) space; when it beats running Dijkstra from every node (small or dense graphs, negative weights).
- Negative weights are fine; a negative cycle shows up as \`dist[i][i] < 0\`; a \`next\` matrix rebuilds routes.
- C++ specifics: \`vector<vector<long long>>\` with \`INF = LLONG_MAX / 4\`, the \`!= INF\` guard (signed overflow is undefined behaviour, and negative weights would make unreachable pairs look reachable), and \`setw\` for printing.

**Clarifying questions expected:**
- "How many nodes? Are negative weights or negative cycles possible?"
- "Do you need the routes, or only the distances?"

**Code / implementation expected:** Yes — a C++ \`floydWarshall(n, edges, next)\` returning a \`vector<vector<long long>>\`, ideally with a \`next\` matrix for route reconstruction.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph-algorithm background assumed
**Difficulty:** Hard
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Old road atlases had a mileage chart: a big table with every city down the side and across the top, and in each square the distance between the two cities. Suppose you only know the **direct** roads, so most squares are blank ("no direct road"). How do you fill in the whole chart?

Here is a patient way. First, allow trips to stop over in city 1: for every pair of cities, check whether going through city 1 is shorter than what the square says, and if so, write the new number. Then allow stopovers in city 2 as well (and city 1, which is already folded in): check every pair again, now through city 2. Keep going until every city has been allowed as a stopover. At the end every square holds the true shortest distance, because every shortest route is just a chain of stopovers, and each one has had its turn.

That is the Floyd-Warshall algorithm: three nested loops over a table, a single \`min\` inside, and the shortest distance between **every** pair of nodes at the end. It works with negative edge weights, and it tells you when a negative cycle exists. Robert Floyd published it as "Algorithm 97: Shortest Path" (Communications of the ACM 5(6), 1962); Stephen Warshall's "A theorem on Boolean matrices" (Journal of the ACM 9(1), 1962) is the same idea for reachability (true/false instead of distances).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you need distances between all pairs, or from one source? | One source is [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) or [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work); Floyd-Warshall is for all pairs. |
| How many nodes? | O(V³) is fine for a few hundred nodes and hopeless for 10^5. |
| Can weights be negative? Can there be a negative cycle? | Negative weights are fine; a negative cycle makes some distances undefined, and you should report it. |
| Directed or undirected? | Undirected roads go into the matrix both ways: \`dist[u][v]\` and \`dist[v][u]\`. |
| Do you need the routes or only the distances? | Routes need a second matrix (\`next\`), the same size as \`dist\`. |
| Can there be several edges between the same two nodes? | Keep the cheapest one when filling the matrix. |

## 3. The Core Idea: Allow One More Stopover at a Time

📌 **Interview term: All-pairs shortest paths** — the problem of finding the shortest distance between every ordered pair of nodes (i, j), usually stored as a V × V matrix \`dist\`.

Number the nodes 0 to V - 1. Call a node on a path an **intermediate node** if it is neither the start nor the end. Floyd-Warshall builds the answer in V stages. After stage k, \`dist[i][j]\` holds the shortest path from i to j that uses **only nodes 0..k as intermediate nodes**.

📌 **Interview term: Intermediate node** — any node on a path other than its two endpoints; Floyd-Warshall grows the set of allowed intermediate nodes one at a time.

Going from stage k - 1 to stage k, the shortest i → j path that may also pass through k either:

- does not use k: its length is the old \`dist[i][j]\`, or
- uses k exactly once: it goes i → k and then k → j, each part using only nodes 0..k - 1, so its length is the old \`dist[i][k] + dist[k][j]\`.

So the whole algorithm is one line, applied to every pair, for every k:

~~~text
dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="The Floyd-Warshall step, the route from i to j through k is compared with the best route from i to j so far">
  <defs>
    <marker id="fw2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge-accent" d="M 111 178 L 294 75" marker-end="url(#fw2-arrow)"/>
  <text class="d-text d-accent" x="192" y="111" text-anchor="middle">dist[i][k]</text>
  <path class="d-edge-accent" d="M 341 72 L 524 175" marker-end="url(#fw2-arrow)"/>
  <text class="d-text d-accent" x="443" y="108" text-anchor="middle">dist[k][j]</text>
  <path class="d-edge-dashed" d="M 114 190 L 520 190" marker-end="url(#fw2-arrow)"/>
  <text class="d-sub" x="317" y="214" text-anchor="middle">dist[i][j]</text>
  <circle class="d-box" cx="90" cy="190" r="24"/>
  <text class="d-text" x="90" y="195" text-anchor="middle">i</text>
  <circle class="d-box-accent" cx="320" cy="60" r="24"/>
  <text class="d-text" x="320" y="65" text-anchor="middle">k</text>
  <circle class="d-box" cx="550" cy="190" r="24"/>
  <text class="d-text" x="550" y="195" text-anchor="middle">j</text>
</svg>

📌 **Interview term: Dynamic programming over intermediate nodes** — Floyd-Warshall is a [dynamic programming](/interview-question/what-is-dynamic-programming) algorithm: the state is "best i → j distance using intermediates 0..k", and each stage is computed from the previous one with the recurrence above.

### Why one matrix is enough

A full DP table would have V + 1 layers of V × V numbers. Floyd-Warshall overwrites a single matrix in place. That is safe because, during stage k, row k and column k do not change: \`dist[i][k] = min(dist[i][k], dist[i][k] + dist[k][k])\`, and \`dist[k][k]\` is 0 when there is no negative cycle, so the \`min\` keeps the old value. Every update in stage k reads only row k and column k, so it does not matter whether it reads them before or after other cells change.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="A four by four distance matrix where row B and column B are highlighted because they feed every update when k is B">
  <text class="d-text" x="120" y="77" text-anchor="middle">A</text>
  <text class="d-text" x="185" y="36" text-anchor="middle">A</text>
  <rect class="d-box" x="150" y="50" width="70" height="44"/>
  <rect class="d-box-accent" x="220" y="50" width="70" height="44"/>
  <rect class="d-box" x="290" y="50" width="70" height="44"/>
  <rect class="d-box" x="360" y="50" width="70" height="44"/>
  <text class="d-text" x="120" y="121" text-anchor="middle">B</text>
  <text class="d-text" x="255" y="36" text-anchor="middle">B</text>
  <rect class="d-box-accent" x="150" y="94" width="70" height="44"/>
  <rect class="d-box-accent" x="220" y="94" width="70" height="44"/>
  <rect class="d-box-accent" x="290" y="94" width="70" height="44"/>
  <rect class="d-box-accent" x="360" y="94" width="70" height="44"/>
  <text class="d-text" x="120" y="165" text-anchor="middle">C</text>
  <text class="d-text" x="325" y="36" text-anchor="middle">C</text>
  <rect class="d-box" x="150" y="138" width="70" height="44"/>
  <rect class="d-box-accent" x="220" y="138" width="70" height="44"/>
  <rect class="d-box" x="290" y="138" width="70" height="44"/>
  <rect class="d-box" x="360" y="138" width="70" height="44"/>
  <text class="d-text" x="120" y="209" text-anchor="middle">D</text>
  <text class="d-text" x="395" y="36" text-anchor="middle">D</text>
  <rect class="d-box" x="150" y="182" width="70" height="44"/>
  <rect class="d-box-accent" x="220" y="182" width="70" height="44"/>
  <rect class="d-box" x="290" y="182" width="70" height="44"/>
  <rect class="d-box" x="360" y="182" width="70" height="44"/>
  <text class="d-sub" x="325" y="209" text-anchor="middle">D to C</text>
  <rect class="d-box-accent" x="460" y="60" width="160" height="64" rx="10"/>
  <text class="d-text" x="540" y="86" text-anchor="middle">k = B</text>
  <text class="d-sub" x="540" y="108" text-anchor="middle">row and column B</text>
  <rect class="d-box" x="460" y="150" width="160" height="64" rx="10"/>
  <text class="d-text" x="540" y="176" text-anchor="middle">every other cell</text>
  <text class="d-sub" x="540" y="198" text-anchor="middle">reads only them</text>
</svg>

When k = B, the cell for D to C is updated from \`dist[D][B] + dist[B][C]\`: one cell in column B plus one cell in row B. The same is true for every other cell, and none of the highlighted cells change during this stage.

## 4. Walking Through an Example

The examples use this directed graph:

<svg class="iq-diagram" width="100%" viewBox="0 0 560 360" role="img" aria-label="Example graph with four nodes A B C D and seven weighted directed edges">
  <defs>
    <marker id="fw1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 134 61 L 420 61" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="277" y="49" text-anchor="middle">3</text>
  <path class="d-edge" d="M 426 79 L 140 79" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="283" y="99" text-anchor="middle">8</text>
  <path class="d-edge" d="M 450 94 L 450 260" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="465" y="181" text-anchor="middle">2</text>
  <path class="d-edge" d="M 426 290 L 140 290" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="283" y="309" text-anchor="middle">1</text>
  <path class="d-edge" d="M 119 94 L 119 260" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="135" y="181" text-anchor="middle">7</text>
  <path class="d-edge" d="M 101 266 L 101 100" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="85" y="187" text-anchor="middle">2</text>
  <path class="d-edge" d="M 430 277 L 135 86" marker-end="url(#fw1-arrow)"/>
  <text class="d-sub" x="304" y="217" text-anchor="middle">5</text>
  <circle class="d-box" cx="110" cy="70" r="24"/>
  <text class="d-text" x="110" y="75" text-anchor="middle">A</text>
  <circle class="d-box" cx="450" cy="70" r="24"/>
  <text class="d-text" x="450" y="75" text-anchor="middle">B</text>
  <circle class="d-box" cx="450" cy="290" r="24"/>
  <text class="d-text" x="450" y="295" text-anchor="middle">C</text>
  <circle class="d-box" cx="110" cy="290" r="24"/>
  <text class="d-text" x="110" y="295" text-anchor="middle">D</text>
</svg>

The edges are A→B 3, A→D 7, B→A 8, B→C 2, C→A 5, C→D 1 and D→A 2. The starting matrix has 0 on the diagonal, the edge weight where a direct edge exists, and INF everywhere else (rows are "from", columns are "to"):

~~~text
       A   B   C   D
A      0   3 INF   7
B      8   0   2 INF
C      5 INF   0   1
D      2 INF INF   0
~~~

After the four stages (k = A, B, C, D):

~~~text
       A   B   C   D
A      0   3   5   6
B      5   0   2   3
C      3   6   0   1
D      2   5   7   0
~~~

Look at A to D: the direct edge costs 7, but A → B → C → D costs 3 + 2 + 1 = 6. And D to C, which had no direct edge at all, is now 7 via D → A → B → C. With V = 4 the inner statement ran 4 × 4 × 4 = 64 times, which Example 1 counts: \`inner loop ran 64 times for n = 4\`.

### Rebuilding the route

Distances alone do not say which way to go. Keep a second matrix \`next[i][j]\`: the first node to visit after i on the best route to j. Initialise it to \`j\` wherever a direct edge exists (and to i on the diagonal); whenever the route through k wins, set \`next[i][j] = next[i][k]\`, because the best route to j now starts the same way as the best route to k. To print a route, start at i and keep jumping \`i = next[i][j]\` until you reach j.

📌 **Interview term: Next-hop matrix** — \`next[i][j]\` is the first step on the shortest route from i to j; it lets you rebuild any route in O(length) time, the same way a router forwards a packet one hop at a time.

Example 1 prints:

~~~text
A to D: A -> B -> C -> D costs 6
D to C: D -> A -> B -> C costs 7
~~~

## 5. The Bug Everyone Makes: Loop Order

The three loops look symmetric, so it is tempting to write them as \`for i, for j, for k\`. That is **wrong**. With k innermost, \`dist[i][j]\` is finished as soon as its inner loop ends, before the parts it depends on (\`dist[i][k]\`, \`dist[k][j]\`) have been improved by later stages.

Example 2 uses the chain A → B → D → C with every edge costing 1. The true A to C distance is 3:

~~~text
A to C with k outside: 3
A to C with k inside:  INF
~~~

With k inside, the cell A to C is finalised while A to D is still INF (A to D is only computed later, when i = A and j = D), so the route through D is never seen. With k outside, every cell is revisited for every k, and the stages build on each other in the right order.

📌 **Interview term: Loop order invariant** — in Floyd-Warshall the intermediate-node loop k must be the outermost loop; i and j can be in either order inside it.

## 6. Negative Weights and Negative Cycles

Floyd-Warshall handles negative edge weights as long as there is no negative cycle. Example 2's second graph has A→B 4, A→C 5, C→B -3 and B→D 2; the shortest A to B goes through C (5 - 3 = 2), and A to D follows it (2 + 2 = 4):

~~~text
negative edge, A to B: 2, A to D: 4
~~~

📌 **Interview term: Negative cycle on the diagonal** — after Floyd-Warshall, \`dist[i][i] < 0\` exactly when node i lies on a negative cycle, because i can reach itself for less than nothing. This is the standard detection test.

Example 2's third graph has B → C costing 1 and C → B costing -3, a cycle of total -2:

~~~text
diagonal: A=0, B=-2, C=-4, D=0
nodes on a negative cycle: B, C
~~~

Once a negative cycle exists, the numbers in the matrix are not meaningful distances any more (C's diagonal is -4, not -2, because the algorithm went around the cycle more than once while updating). Only the sign of the diagonal is reliable: report "negative cycle", do not report the numbers. Any pair (i, j) where i can reach a node on the cycle and that node can reach j has no shortest distance at all.

## 7. The Code in C++

C++ integers have no infinity, so we pick a sentinel. \`INT_MAX + 1\` is signed overflow, which is undefined behaviour, so never let the algorithm add to the sentinel. This page uses \`long long\` with \`INF = numeric_limits<long long>::max() / 4\` (so even \`INF + INF\` fits) **and** skips any pair where either half is \`INF\`. The guard matters for correctness too: with a negative edge, \`INF + (-3)\` would be smaller than \`INF\` and an unreachable pair would look reachable.

You will also see \`memset(dist, 0x3f, sizeof dist)\` in competitive code: it fills every \`int\` with \`0x3f3f3f3f\` = 1061109567, and twice that, 2122219134, still fits in an \`int\` (whose maximum is 2147483647). It avoids overflow on one addition but has the same negative-weight problem, so keep the guard either way.

~~~cpp
Matrix floydWarshall(int n, const vector<vector<int>>& edges, vector<vector<int>>& next, int& steps) {
    Matrix dist(n, vector<long long>(n, INF));
    next.assign(n, vector<int>(n, -1));
    for (int i = 0; i < n; i++) { dist[i][i] = 0; next[i][i] = i; }
    for (const auto& e : edges)
        if (e[2] < dist[e[0]][e[1]]) {          // keep the cheapest of parallel edges
            dist[e[0]][e[1]] = e[2];
            next[e[0]][e[1]] = e[1];
        }
    steps = 0;
    for (int k = 0; k < n; k++)                 // k MUST be the outer loop
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++) {
                steps++;
                if (dist[i][k] == INF || dist[k][j] == INF) continue;
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                    next[i][j] = next[i][k];    // first hop towards k
                }
            }
    return dist;
}
~~~

**Line by line:**

- \`Matrix dist(n, vector<long long>(n, INF))\` builds n separate rows; \`next.assign(n, vector<int>(n, -1))\` resets the caller's \`next\` matrix.
- \`if (e[2] < dist[e[0]][e[1]])\` keeps the cheapest of several parallel edges.
- \`for (int k = 0; k < n; k++)\` is the **outer** loop.
- \`if (dist[i][k] == INF || dist[k][j] == INF) continue;\` is the guard described above.
- \`next[i][j] = next[i][k]\`: when the route through k wins, the first hop towards j is the first hop towards k.
- Printing uses \`setw(4)\` (right-aligned by default) for cells and \`left << setw(4)\` for the row label, then \`right\` to switch back; manipulators like \`left\` stay in effect until changed, \`setw\` only applies to the next output.

Rebuilding a route from the \`next\` matrix:

~~~cpp
string path(const vector<vector<int>>& next, int u, int v) {
    if (next[u][v] == -1) return "no path";
    string s(1, NAMES[u]);
    while (u != v) {
        u = next[u][v];
        s += " -> " + string(1, NAMES[u]);
    }
    return s;
}
~~~

## 8. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — All-pairs distances and route rebuilding** prints:

~~~text
direct edges only:
       A   B   C   D
A      0   3 INF   7
B      8   0   2 INF
C      5 INF   0   1
D      2 INF INF   0
all-pairs shortest distances:
       A   B   C   D
A      0   3   5   6
B      5   0   2   3
C      3   6   0   1
D      2   5   7   0
A to D: A -> B -> C -> D costs 6
D to C: D -> A -> B -> C costs 7
inner loop ran 64 times for n = 4
~~~

**Example 2 — Loop order, negative edges and negative cycles** prints:

~~~text
A to C with k outside: 3
A to C with k inside:  INF
negative edge, A to B: 2, A to D: 4
diagonal: A=0, B=-2, C=-4, D=0
nodes on a negative cycle: B, C
~~~

**What the numbers show:** Example 1 turns the direct-edge matrix into the all-pairs matrix from section 4, rebuilds two routes, and counts exactly n³ = 64 inner steps. Example 2 shows the loop-order bug (INF instead of 3), a correct answer with a negative edge, and a negative cycle appearing as negative numbers on the diagonal.

## 9. Complexity

| Approach for all pairs | Time | Space | When to use |
| :--- | :--- | :--- | :--- |
| Floyd-Warshall | O(V³) | O(V²) | small or dense graphs; negative weights allowed |
| Dijkstra from every node | O(V × (V + E) log V) | O(V + E) per run | large sparse graphs, non-negative weights |
| Bellman-Ford from every node | O(V² × E) | O(V) per run | rarely; Floyd-Warshall is simpler |
| BFS from every node | O(V × (V + E)) | O(V) per run | unweighted graphs |

The time is exactly V × V × V executions of the inner statement (64 for V = 4 in Example 1; for V = 400 that is 64 million). The space is the V × V matrix, plus a second one if you keep \`next\`. \`vector<vector<long long>>\` stores each row contiguously; for speed on large V, a single \`vector<long long>(n * n)\` indexed as \`i * n + j\` keeps the whole matrix contiguous. Either way the memory is O(V²) and the inner loop does no allocation.

On large sparse graphs with negative weights, Johnson's algorithm combines the two: one Bellman-Ford run to re-weight the edges so they become non-negative, then Dijkstra from every node. See [Big-O notation](/interview-question/what-is-big-o-notation) for the notation.

## 10. Edge Cases

- **Unreachable pair:** stays \`INF\`; route reconstruction must check \`next[i][j] == -1\` and report "no path".
- **Single node:** the matrix is \`[[0]]\`.
- **Self-loops:** a non-negative self-loop never beats the 0 on the diagonal; a negative one is a one-node negative cycle and shows up as \`dist[i][i] < 0\`.
- **Parallel edges:** keep the cheapest when filling the matrix.
- **Undirected graph:** fill both \`dist[u][v]\` and \`dist[v][u]\`. A negative undirected edge is itself a negative cycle (u → v → u).
- **Negative cycle:** detect it with the diagonal; do not report the other numbers.

## Common Pitfalls

- **k not outermost.** \`for i, for j, for k\` returns wrong answers without any error (Example 2 printed \`INF\` instead of \`3\`).
- **\`INT_MAX\` as infinity.** Adding to it is signed overflow, undefined behaviour. Use \`long long\` with \`max() / 4\` and guard.
- **No \`!= INF\` guard with negative weights.** \`INF + (-3) < INF\`, so an unreachable pair gets a fake finite distance.
- **Forgetting the diagonal.** \`dist[i][i]\` must start at 0, or paths starting at i are wrong and the negative-cycle test breaks.
- **\`memset\` with a value other than 0, -1 or a repeated byte.** \`memset\` sets bytes, so \`memset(d, 1000000, ...)\` does not store 1000000; only byte patterns like \`0x3f\` work.
- **Trusting the numbers after a negative cycle.** Only \`dist[i][i] < 0\` is meaningful; report the cycle.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Floyd-Warshall fills a V × V matrix with the shortest distance between every pair by allowing one more intermediate node per stage.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The recurrence:</strong> <span style="color:#f0e2c8;">For each k, for each i, j: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])</code>, with k as the <strong style="color:#ffca28;">outer</strong> loop.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why in place works:</strong> <span style="color:#f0e2c8;">During stage k, row k and column k do not change, and every update only reads them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(V³) time and O(V²) space; great for a few hundred nodes, negative weights allowed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INF = max() / 4</code>, skip pairs where either half is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INF</code> (signed overflow is undefined behaviour), and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[i][i] &lt; 0</code> flags a negative cycle.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must k be the outer loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Stage k needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[i][k]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[k][j]</code> to be final for intermediates 0..k-1. With k inner, a cell is finalised before its parts are ready; Example 2 printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INF</code> for a distance of 3.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Floyd-Warshall or Dijkstra from every node?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Dijkstra V times is O(V (V + E) log V), better for sparse graphs with non-negative weights. Floyd-Warshall is O(V³), simpler, and allows negative weights; it wins on small or dense graphs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">0x3f3f3f3f</code> trick, and is it enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> sentinel whose double still fits, so one addition cannot overflow. With negative weights it is not enough: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INF + (-3)</code> looks reachable. Keep an explicit guard.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you detect a negative cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After the loops, any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dist[i][i] &lt; 0</code> means i is on a negative cycle. Example 2 printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B, C</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you print the actual route?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next[i][j]</code>, set it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> for direct edges and to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next[i][k]</code> whenever the route through k wins, then follow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i = next[i][j]</code> until j.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **All-pairs shortest paths** | the shortest distance between every ordered pair of nodes |
| **Intermediate node** | a node on a path other than its start and end |
| **Dynamic programming over intermediate nodes** | stage k allows nodes 0..k as stopovers, built from stage k - 1 |
| **Next-hop matrix** | \`next[i][j]\` is the first step on the best route from i to j |
| **Loop order invariant** | the k loop must be outermost |
| **Negative cycle on the diagonal** | \`dist[i][i] < 0\` means i lies on a negative cycle |

---
**Conclusion:** Floyd-Warshall answers every pair at once: three nested loops with k outermost and one \`min\` inside, O(V³) time and O(V²) space. Negative weights are fine, a negative diagonal entry reveals a negative cycle, and a \`next\` matrix lets you print routes. In C++ the details that matter are \`long long\` distances, an infinity like \`max() / 4\`, and the \`!= INF\` guard that protects against both undefined overflow and negative weights. For one source, use [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) (non-negative weights) or [Bellman-Ford](/interview-question/how-does-the-bellman-ford-algorithm-work) (negative weights); for unweighted graphs, [BFS is enough](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths).`,
        examples: [
          { label: `All-pairs distances and route rebuilding`, code: `#include <iomanip>
#include <iostream>
#include <limits>
#include <string>
#include <vector>
using namespace std;

// A "large but safe" infinity: INF + INF still fits in a long long, but we guard anyway.
const long long INF = numeric_limits<long long>::max() / 4;
const string NAMES = "ABCD";
using Matrix = vector<vector<long long>>;

Matrix floydWarshall(int n, const vector<vector<int>>& edges, vector<vector<int>>& next, int& steps) {
    Matrix dist(n, vector<long long>(n, INF));
    next.assign(n, vector<int>(n, -1));
    for (int i = 0; i < n; i++) { dist[i][i] = 0; next[i][i] = i; }
    for (const auto& e : edges)
        if (e[2] < dist[e[0]][e[1]]) {          // keep the cheapest of parallel edges
            dist[e[0]][e[1]] = e[2];
            next[e[0]][e[1]] = e[1];
        }
    steps = 0;
    for (int k = 0; k < n; k++)                 // k MUST be the outer loop
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++) {
                steps++;
                if (dist[i][k] == INF || dist[k][j] == INF) continue;
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                    next[i][j] = next[i][k];    // first hop towards k
                }
            }
    return dist;
}

void show(const Matrix& dist) {
    cout << "    ";
    for (char c : NAMES) cout << setw(4) << c;
    cout << "\\n";
    for (size_t i = 0; i < dist.size(); i++) {
        cout << left << setw(4) << NAMES[i] << right;
        for (long long d : dist[i]) cout << setw(4) << (d == INF ? string("INF") : to_string(d));
        cout << "\\n";
    }
}

string path(const vector<vector<int>>& next, int u, int v) {
    if (next[u][v] == -1) return "no path";
    string s(1, NAMES[u]);
    while (u != v) {
        u = next[u][v];
        s += " -> " + string(1, NAMES[u]);
    }
    return s;
}

int main() {
    vector<vector<int>> edges = {{0, 1, 3}, {0, 3, 7}, {1, 0, 8}, {1, 2, 2}, {2, 0, 5}, {2, 3, 1}, {3, 0, 2}};
    Matrix before(4, vector<long long>(4, INF));
    for (int i = 0; i < 4; i++) before[i][i] = 0;
    for (const auto& e : edges) before[e[0]][e[1]] = e[2];
    cout << "direct edges only:\\n";
    show(before);
    vector<vector<int>> next;
    int steps = 0;
    Matrix dist = floydWarshall(4, edges, next, steps);
    cout << "all-pairs shortest distances:\\n";
    show(dist);
    cout << "A to D: " << path(next, 0, 3) << " costs " << dist[0][3] << "\\n";
    cout << "D to C: " << path(next, 3, 2) << " costs " << dist[3][2] << "\\n";
    cout << "inner loop ran " << steps << " times for n = 4\\n";
}` },
          { label: `Loop order, negative edges and negative cycles`, code: `#include <algorithm>
#include <iostream>
#include <limits>
#include <string>
#include <vector>
using namespace std;

const long long INF = numeric_limits<long long>::max() / 4;
using Matrix = vector<vector<long long>>;

Matrix init(int n, const vector<vector<int>>& edges) {
    Matrix d(n, vector<long long>(n, INF));
    for (int i = 0; i < n; i++) d[i][i] = 0;
    for (const auto& e : edges) d[e[0]][e[1]] = min<long long>(d[e[0]][e[1]], e[2]);
    return d;
}

// Without this guard, INF + (-3) would look like a real, slightly cheaper distance.
bool better(const Matrix& d, int i, int k, int j) {
    return d[i][k] != INF && d[k][j] != INF && d[i][k] + d[k][j] < d[i][j];
}

// Correct: the middle node k is the OUTER loop.
Matrix floydKij(int n, const vector<vector<int>>& edges) {
    Matrix d = init(n, edges);
    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (better(d, i, k, j)) d[i][j] = d[i][k] + d[k][j];
    return d;
}

// Wrong: k is the INNER loop, so d[i][j] is finished before its parts are.
Matrix floydIjk(int n, const vector<vector<int>>& edges) {
    Matrix d = init(n, edges);
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            for (int k = 0; k < n; k++)
                if (better(d, i, k, j)) d[i][j] = d[i][k] + d[k][j];
    return d;
}

string fmt(long long d) { return d == INF ? "INF" : to_string(d); }

int main() {
    // 1. Loop order: the chain A -> B -> D -> C, every edge costs 1.
    vector<vector<int>> chain = {{0, 1, 1}, {1, 3, 1}, {3, 2, 1}};
    cout << "A to C with k outside: " << fmt(floydKij(4, chain)[0][2]) << "\\n";
    cout << "A to C with k inside:  " << fmt(floydIjk(4, chain)[0][2]) << "\\n";

    // 2. Negative edge, no negative cycle: still correct.
    vector<vector<int>> neg = {{0, 1, 4}, {0, 2, 5}, {2, 1, -3}, {1, 3, 2}};
    Matrix d = floydKij(4, neg);
    cout << "negative edge, A to B: " << fmt(d[0][1]) << ", A to D: " << fmt(d[0][3]) << "\\n";

    // 3. Negative cycle B -> C -> B costs 1 - 3 = -2: it shows up on the diagonal.
    vector<vector<int>> cyc = {{0, 1, 1}, {1, 2, 1}, {2, 1, -3}, {2, 3, 1}};
    d = floydKij(4, cyc);
    const string names = "ABCD";
    string diag, bad;
    for (int i = 0; i < 4; i++) {
        diag += (i ? ", " : "") + string(1, names[i]) + "=" + fmt(d[i][i]);
        if (d[i][i] < 0) bad += (bad.empty() ? "" : ", ") + string(1, names[i]);
    }
    cout << "diagonal: " << diag << "\\n";
    cout << "nodes on a negative cycle: " << bad << "\\n";
}` },
        ],
      },
    },
  },
];

export default augments;
