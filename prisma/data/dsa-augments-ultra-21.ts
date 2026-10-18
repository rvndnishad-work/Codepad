/**
 * DSA ULTRA — batch 21: graphs I, representation and traversal — what a graph is and how to store
 * it, BFS vs DFS, number of islands, islands with DFS vs BFS vs Union-Find, and connected
 * components in an undirected graph. One complete answer per language (Python, JavaScript, Java,
 * C++). Every example was run with python3 / node / javac+java / g++ -std=c++17 by
 * scripts/verify-dsa-examples.ts and the quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "What is a graph, and how do you represent it?",
    difficulty: "easy",
    seoDescription: "What a graph is (vertices, edges, directed, weighted) and how to store it: edge list, adjacency list or matrix, in Python, JavaScript, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"What is a graph, and how would you store one in memory in Python? Walk me through the options and when you would pick each one."

**What a strong answer should cover:**
- Vertices and edges; directed vs undirected; weighted vs unweighted; degree.
- The three representations — edge list, adjacency list, adjacency matrix — with their space (O(E), O(V + E), O(V²)) and edge-lookup costs.
- Sparse vs dense: why the adjacency list is the default for interview problems.
- Implicit graphs: a grid or a word puzzle is a graph you never build explicitly.
- Python details: \`[[] for _ in range(n)]\` (not \`[[]] * n\`, which shares one list), \`dict\`/\`defaultdict(list)\` for string labels, \`set\` neighbours for O(1) edge checks.

**Code / implementation expected:** Optional — building an adjacency list from an edge list in a few lines of Python.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph knowledge needed, just arrays and loops  
**Difficulty:** Easy  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think of a group chat for a school trip. Some pairs of students are friends, some are not. If you drew every student as a dot and every friendship as a line between two dots, you would have drawn a **graph**. Now swap the words: dots can be cities and lines can be roads; dots can be web pages and lines can be links; dots can be squares on a chessboard and lines can be legal knight moves. The same picture describes all of them.

That is why graphs are everywhere in interviews. Once you can see "this is really dots and lines", a whole family of questions — Can I get from A to B? What is the shortest route? How many separate groups are there? Is there a loop? — turns into a handful of standard algorithms you already know.

But before any algorithm can run, the computer needs the picture written down in memory. There are three common ways to write it down, and choosing the right one is the first decision in every graph problem. That choice is what this page is about.

## 2. What Exactly Is a Graph?

A graph is two things: a set of **things** and a set of **connections** between pairs of those things. Nothing more. The things do not need positions, and the lines do not need lengths, unless the problem gives them.

📌 **Interview term: Vertex (node)** — one of the things in the graph — a person, a city, a grid cell. Usually numbered 0 to n − 1 so they can be array indexes.

📌 **Interview term: Edge** — a connection between two vertices. We write it as a pair (u, v).

Edges come in a few flavours, and the interviewer will expect you to ask which one you have:

📌 **Interview term: Undirected vs directed graph** — in an undirected graph an edge works both ways (friendship); in a directed graph an edge u → v goes one way only (following someone, a one-way street, a course prerequisite).

📌 **Interview term: Weighted graph** — every edge carries a number — a distance, a cost, a time. Without weights every edge counts as 1.

📌 **Interview term: Degree** — how many edges touch a vertex. In a directed graph you count out-degree (edges leaving) and in-degree (edges arriving) separately.

📌 **Interview term: Path and cycle** — a path is a walk along edges from one vertex to another; a cycle is a path that comes back to where it started.

📌 **Interview term: Connected graph** — an undirected graph where every vertex can reach every other vertex. A graph that is not connected splits into separate pieces called connected components (see [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph)).

Here is the small undirected graph that the first example builds. It has six vertices and five edges, and vertex 5 has no edges at all — it is still part of the graph.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 240" role="img" aria-label="An undirected graph with six vertices. Edges 0-1, 0-2, 1-2, 1-3 and 3-4. Vertex 5 has no edges">
  <path class="d-edge" d="M 104 70 L 196 70"/>
  <path class="d-edge" d="M 92 91 L 138 149"/>
  <path class="d-edge" d="M 208 91 L 162 149"/>
  <path class="d-edge" d="M 244 70 L 336 70"/>
  <path class="d-edge" d="M 384 70 L 476 70"/>
  <circle class="d-box-accent" cx="80" cy="70" r="24"/>
  <text class="d-text" x="80" y="75" text-anchor="middle">0</text>
  <circle class="d-box-accent" cx="220" cy="70" r="24"/>
  <text class="d-text" x="220" y="75" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="150" cy="170" r="24"/>
  <text class="d-text" x="150" y="175" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="360" cy="70" r="24"/>
  <text class="d-text" x="360" y="75" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="500" cy="70" r="24"/>
  <text class="d-text" x="500" y="75" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="500" cy="170" r="24"/>
  <text class="d-text" x="500" y="175" text-anchor="middle">5</text>
  <text class="d-sub" x="220" y="30" text-anchor="middle">degree 3</text>
  <text class="d-sub" x="500" y="222" text-anchor="middle">degree 0</text>
  <text class="d-sub" x="150" y="222" text-anchor="middle">triangle 0-1-2</text>
</svg>

Vertices 0, 1 and 2 form a triangle, which is a cycle. Vertex 1 touches three edges, so its degree is 3. Vertex 5 is a component on its own.

## 3. Three Ways to Store a Graph

**1. Edge list** — just write down every edge: \`[(0, 1), (0, 2), (1, 2), (1, 3), (3, 4)]\`. It is the format most problems hand you as input. It is compact (one entry per edge), but asking "who are the neighbours of 1?" means scanning the whole list.

**2. Adjacency list** — for every vertex, keep a list of its neighbours. This is the default for almost every interview problem, because the operation algorithms need most is "give me the neighbours of u", and the adjacency list answers it directly.

**3. Adjacency matrix** — an n × n table where cell [u][v] is 1 when the edge u–v exists. It answers "is there an edge between u and v?" in one lookup, but it always uses n² cells, even when almost all of them are 0.

📌 **Interview term: Adjacency list** — an array (or map) indexed by vertex, where entry u holds the neighbours of u. Space O(V + E).

📌 **Interview term: Adjacency matrix** — a V × V grid of 0/1 (or weights) where cell [u][v] says whether edge u → v exists. Space O(V²), edge check O(1).

📌 **Interview term: Edge list** — a plain list of (u, v) pairs, usually the raw input. Space O(E).

<svg class="iq-diagram" width="100%" viewBox="0 0 620 330" role="img" aria-label="Adjacency list of the six vertex graph. Each vertex points to the list of its neighbours">
  <defs>
    <marker id="b21q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="20" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="43" text-anchor="middle">0</text>
  <path class="d-edge" d="M 92 38 L 146 38" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="20" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="43" text-anchor="middle">1, 2</text>
  <rect class="d-box-accent" x="30" y="70" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="93" text-anchor="middle">1</text>
  <path class="d-edge" d="M 92 88 L 146 88" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="70" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="93" text-anchor="middle">0, 2, 3</text>
  <rect class="d-box-accent" x="30" y="120" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="143" text-anchor="middle">2</text>
  <path class="d-edge" d="M 92 138 L 146 138" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="120" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="143" text-anchor="middle">0, 1</text>
  <rect class="d-box-accent" x="30" y="170" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="193" text-anchor="middle">3</text>
  <path class="d-edge" d="M 92 188 L 146 188" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="170" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="193" text-anchor="middle">1, 4</text>
  <rect class="d-box-accent" x="30" y="220" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="243" text-anchor="middle">4</text>
  <path class="d-edge" d="M 92 238 L 146 238" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="220" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="243" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="30" y="270" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="293" text-anchor="middle">5</text>
  <path class="d-edge" d="M 92 288 L 146 288" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box-muted" x="150" y="270" width="200" height="36" rx="6"/>
  <text class="d-sub" x="250" y="293" text-anchor="middle">empty list</text>
  <rect class="d-box-muted" x="420" y="110" width="170" height="110" rx="10"/>
  <text class="d-text" x="505" y="145" text-anchor="middle">10 entries</text>
  <text class="d-sub" x="505" y="170" text-anchor="middle">5 edges, each</text>
  <text class="d-sub" x="505" y="192" text-anchor="middle">stored twice</text>
</svg>

In an undirected graph every edge is written into **both** endpoint lists, so the lists hold 2E entries in total. That is also why the degrees always add up to twice the number of edges (example 1 prints \`sum of degrees: 10 = 2 x 5 edges\`).

**4. The graph you never build.** Many interview graphs are hidden inside something else. A 2-D grid is a graph whose vertices are cells and whose edges join a cell to its up/down/left/right neighbours — you compute the neighbours with a direction array instead of storing them. The same is true of word puzzles where words are vertices and one-letter changes are edges (see the [word ladder problem](/interview-question/how-do-you-solve-the-word-ladder-problem)).

📌 **Interview term: Implicit graph** — a graph whose edges are computed on demand by a rule (grid moves, one-letter changes) instead of being stored. Space for edges is zero.

📌 **Interview term: Sparse vs dense graph** — sparse means E is close to V (most real graphs: roads, friendships); dense means E is close to V². Sparse graphs want adjacency lists; dense ones can afford a matrix.

## 4. Choosing a Representation

Write V for the number of vertices and E for the number of edges. See [Big-O notation](/interview-question/what-is-big-o-notation) if the notation is new.

| Operation | Edge list | Adjacency list | Adjacency matrix |
| :--- | :--- | :--- | :--- |
| Space | O(E) | O(V + E) | O(V²) |
| Is there an edge u–v? | O(E) | O(deg(u)) | O(1) |
| List the neighbours of u | O(E) | O(deg(u)) | O(V) |
| Visit every edge (BFS/DFS) | O(E) per vertex, so slow | O(V + E) | O(V²) |
| Add an edge | O(1) | O(1) amortised | O(1) |
| Best for | input format, Kruskal, Union-Find | almost everything | dense graphs, Floyd–Warshall, many edge checks |

The numbers from example 2 make the space row concrete: a sparse graph of 1,000 vertices and 3,000 edges needs **6,000** adjacency-list entries but **1,000,000** matrix cells, and only **0.60%** of those cells ever hold an edge.

**Rule of thumb for interviews:** convert the input to an adjacency list first, unless the input is a grid (use it directly as an implicit graph) or the problem is all about edge lookups on a small dense graph (use a matrix). If you need O(1) edge checks *and* sparse storage, store each vertex's neighbours in a hash set instead of a list (see [how a hash table works](/interview-question/how-does-a-hash-table-work)).

## 5. The Code in Python

Building an adjacency list from an edge list is four lines:

~~~python
n = 6
edges = [(0, 1), (0, 2), (1, 2), (1, 3), (3, 4)]
adj = [[] for _ in range(n)]    # one NEW empty list per vertex
for u, v in edges:
    adj[u].append(v)
    adj[v].append(u)            # undirected: store both directions
~~~

**What to point out in this code:**

- \`[[] for _ in range(n)]\` creates *n different* lists. The tempting \`[[]] * n\` creates *one* list referenced n times, so appending to \`adj[0]\` would also change \`adj[1]\`…\`adj[5]\`. This is the most common Python graph bug.
- The matrix is \`[[0] * n for _ in range(n)]\` for the same reason: the inner \`[0] * n\` is fine (integers are immutable), the outer list must be a comprehension.
- \`v in adj[u]\` scans the list (O(degree)); \`matrix[u][v]\` is one index (O(1)). If you need fast edge checks on a sparse graph, use \`adj = [set() for _ in range(n)]\` and \`adj[u].add(v)\`.
- For labels like \`"A"\`, a \`dict\` maps label → list. Example 2 uses \`graph.setdefault(u, []).append(...)\`; \`collections.defaultdict(list)\` does the same with less typing. Both are hash maps with average O(1) lookups.
- Python dicts keep insertion order (an official language guarantee since Python 3.7, per [What's New In Python 3.7](https://docs.python.org/3/whatsnew/3.7.html)), but example 2 still prints \`sorted(graph)\` so the output does not depend on the order edges arrived in.
- A weighted edge is just a tuple \`(neighbour, weight)\` in the list.

📌 **Interview term: Adjacency set** — an adjacency list whose per-vertex container is a hash set, giving average O(1) edge checks while keeping O(V + E) space.

## 6. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — one graph, three representations** prints:

~~~text
nodes: 6, edges: 5
edge list: [(0, 1), (0, 2), (1, 2), (1, 3), (3, 4)]
adjacency list:
  0 -> [1, 2]
  1 -> [0, 2, 3]
  2 -> [0, 1]
  3 -> [1, 4]
  4 -> [3]
  5 -> []
adjacency matrix:
  0 1 1 0 0 0
  1 0 1 1 0 0
  1 1 0 0 0 0
  0 1 0 0 1 0
  0 0 0 1 0 0
  0 0 0 0 0 0
edge 1-3? list: true, matrix: true
edge 0-4? list: false, matrix: false
degree of 1: 3
sum of degrees: 10 = 2 x 5 edges
~~~

**Example 2 — a weighted directed graph, sparse-graph space, and an implicit grid graph** prints:

~~~text
directed weighted graph:
  A -> [B:5, C:2]  out=2 in=0
  B -> [D:4]  out=1 in=2
  C -> [B:1, D:7]  out=2 in=1
  D -> []  out=0 in=2
sparse graph: n = 1000, edges = 3000
  adjacency list entries: 6000
  adjacency matrix cells: 1000000
  matrix cells holding an edge: 0.60%
implicit grid graph 3 x 4:
  (1,1) -> [(0,1), (2,1), (1,0), (1,2)]
  (0,0) -> [(1,0), (0,1)]
  (2,3) -> [(1,3), (2,2)]
~~~

## 7. Complexity

| Representation | Build time | Space | Why |
| :--- | :--- | :--- | :--- |
| Edge list | O(E) | O(E) | one entry per edge, as given |
| Adjacency list | O(V + E) | O(V + E) | one list per vertex, each undirected edge stored twice |
| Adjacency matrix | O(V² + E) | O(V²) | the table is allocated in full before any edge is set |

A \`list\` of \`list\`s is the usual adjacency list; for string labels a \`dict\` (or \`collections.defaultdict(list)\`) does the same job with average O(1) lookups.

## 8. Edge Cases

- **Vertices with no edges.** They still exist and must still get an (empty) entry. If you build the adjacency list only from the edge list, vertex 5 disappears — size the list from n, not from the edges.
- **Self-loop (u, u).** Appending both directions adds u to its own list twice. Decide whether the problem allows it; most "count components" problems simply ignore it.
- **Duplicate edges.** An edge list may contain (0, 1) and (1, 0). In an undirected graph that is the same edge; a matrix absorbs it, a list stores it twice. Use a set of neighbours if duplicates matter.
- **Labels that are not 0..n−1.** Names like "A" or user ids need a hash map from label to neighbours (example 2) or a first pass that maps each label to an index.
- **Directed input treated as undirected (or the reverse).** Adding the reverse edge for a directed graph silently changes every answer, so confirm the direction before you code.

## Common Pitfalls

- **\`[[]] * n\` instead of a comprehension.** All n slots are the same list object; every \`append\` shows up in every vertex.
- **Forgetting the reverse edge.** For an undirected graph you must append \`v\` to \`adj[u]\` *and* \`u\` to \`adj[v]\`; missing one makes traversals miss vertices.
- **Building the list only from the edges.** Isolated vertices (like 5) never appear. Size the structure from \`n\`.
- **Using a matrix for a big sparse graph.** \`[[0] * n for _ in range(n)]\` with n = 100,000 is 10^10 cells — it will not fit in memory.
- **\`v in adj[u]\` inside a hot loop.** On a list that is O(degree) each time; switch to sets when the algorithm checks edges a lot.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A graph is a set of vertices plus a set of edges between pairs of them; edges may be directed and may carry weights.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Default storage:</strong> <span style="color:#f0e2c8;">An adjacency list: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">adj = [[] for _ in range(n)]</code>, append both directions for undirected edges. O(V + E) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Alternative:</strong> <span style="color:#f0e2c8;">An adjacency matrix gives O(1) edge checks but costs O(V²) space — only for small or dense graphs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Implicit graphs:</strong> <span style="color:#f0e2c8;">Grids and word puzzles are graphs too; compute neighbours with a direction list instead of storing edges.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[]] * n</code> (one shared list); use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defaultdict(list)</code> for string labels and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>s for fast edge checks.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the adjacency list the default?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Traversals ask for the neighbours of each vertex, and the list gives exactly those in O(deg) time, for O(V + E) total space. A matrix makes the same traversal O(V²).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you pick a matrix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the graph is small or dense and you check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[u][v]</code> very often, for example Floyd–Warshall all-pairs shortest paths.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you store a weighted graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(neighbour, weight)</code> tuples in each list, or weights instead of 1s in the matrix (with a sentinel such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float('inf')</code> for no edge).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is wrong with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[[]] * n</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It repeats a reference to one list, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">adj[0].append(1)</code> also changes every other entry. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[] for _ in range(n)]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle node names like strings?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> from name to list (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defaultdict(list)</code>), or map each name to an index 0..n−1 first and keep using lists.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Vertex (node)** | One of the things in a graph, usually numbered 0 to n − 1 |
| **Edge** | A connection (u, v) between two vertices |
| **Undirected vs directed graph** | Edges work both ways vs one way only |
| **Weighted graph** | Every edge carries a number such as a distance or cost |
| **Degree** | Number of edges touching a vertex (in-degree and out-degree when directed) |
| **Path and cycle** | A walk along edges; a cycle returns to its start |
| **Connected graph** | Every vertex can reach every other; otherwise it splits into components |
| **Adjacency list** | Per-vertex list of neighbours; O(V + E) space |
| **Adjacency matrix** | V × V table of edges; O(V²) space, O(1) edge check |
| **Edge list** | Plain list of (u, v) pairs; O(E) space |
| **Implicit graph** | Edges computed by a rule (grid moves) instead of stored |
| **Sparse vs dense graph** | E close to V vs E close to V² |
| **Adjacency set** | Per-vertex hash set of neighbours: O(1) average edge check, O(V + E) space |

---
**Conclusion:** In Python a graph is almost always \`adj = [[] for _ in range(n)]\` filled from the edge list — both directions for undirected edges — giving O(V + E) space and direct access to each vertex's neighbours. Keep the matrix for small dense graphs that need O(1) edge checks, use a \`dict\` when vertices have names, remember that grids are graphs you never build, and never write \`[[]] * n\`. Next, see how to walk a graph in [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs), and use it to [count islands in a grid](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) or [count connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph).`,
        examples: [
          {
            label: "One graph, three representations: edge list, adjacency list, matrix",
            code: `def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


n = 6
edges = [(0, 1), (0, 2), (1, 2), (1, 3), (3, 4)]  # node 5 has no edges

# 1. Adjacency list: one list of neighbours per node (undirected: add both ways)
adj = [[] for _ in range(n)]
for u, v in edges:
    adj[u].append(v)
    adj[v].append(u)

# 2. Adjacency matrix: n x n grid of 0/1, symmetric for an undirected graph
matrix = [[0] * n for _ in range(n)]
for u, v in edges:
    matrix[u][v] = 1
    matrix[v][u] = 1

print("nodes: " + str(n) + ", edges: " + str(len(edges)))
print("edge list: [" + ", ".join("(" + str(u) + ", " + str(v) + ")" for u, v in edges) + "]")
print("adjacency list:")
for u in range(n):
    print("  " + str(u) + " -> " + fmt(adj[u]))
print("adjacency matrix:")
for row in matrix:
    print("  " + " ".join(str(c) for c in row))

for u, v in [(1, 3), (0, 4)]:
    in_list = v in adj[u]            # O(degree) scan
    in_matrix = matrix[u][v] == 1    # O(1) lookup
    print("edge " + str(u) + "-" + str(v) + "? list: " + str(in_list).lower() + ", matrix: " + str(in_matrix).lower())

print("degree of 1: " + str(len(adj[1])))
total = sum(len(nbrs) for nbrs in adj)
print("sum of degrees: " + str(total) + " = 2 x " + str(len(edges)) + " edges")`,
          },
          {
            label: "Weighted directed graph, sparse-graph space, implicit grid graph",
            code: `# Part 1: a directed, weighted graph (flight costs) as a dict of lists
flights = [("A", "B", 5), ("A", "C", 2), ("C", "B", 1), ("B", "D", 4), ("C", "D", 7)]
graph = {}                     # node -> list of (neighbour, weight)
in_degree = {}
for u, v, w in flights:
    graph.setdefault(u, []).append((v, w))
    graph.setdefault(v, [])    # make sure sinks like D appear as keys
    in_degree[v] = in_degree.get(v, 0) + 1

print("directed weighted graph:")
for u in sorted(graph):
    out = ", ".join(v + ":" + str(w) for v, w in graph[u])
    print("  " + u + " -> [" + out + "]  out=" + str(len(graph[u])) + " in=" + str(in_degree.get(u, 0)))

# Part 2: a sparse graph - how much space does each representation need?
n = 1000
edge_count = 0
adj = [[] for _ in range(n)]
for i in range(n):
    for step in (1, 2, 5):     # every node links to the nodes 1, 2 and 5 ahead (wrapping)
        j = (i + step) % n
        adj[i].append(j)
        adj[j].append(i)
        edge_count += 1
list_entries = sum(len(a) for a in adj)
matrix_cells = n * n
print("sparse graph: n = " + str(n) + ", edges = " + str(edge_count))
print("  adjacency list entries: " + str(list_entries))
print("  adjacency matrix cells: " + str(matrix_cells))
print("  matrix cells holding an edge: " + format(100 * list_entries / matrix_cells, ".2f") + "%")

# Part 3: a grid is a graph you never build - neighbours are computed
ROWS, COLS = 3, 4
def grid_neighbours(r, c):
    out = []
    for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):   # up, down, left, right
        nr, nc = r + dr, c + dc
        if 0 <= nr < ROWS and 0 <= nc < COLS:
            out.append("(" + str(nr) + "," + str(nc) + ")")
    return out

print("implicit grid graph " + str(ROWS) + " x " + str(COLS) + ":")
for r, c in ((1, 1), (0, 0), (2, 3)):
    print("  (" + str(r) + "," + str(c) + ") -> [" + ", ".join(grid_neighbours(r, c)) + "]")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"What is a graph, and how would you store one in memory in JavaScript? Walk me through the options and when you would pick each one."

**What a strong answer should cover:**
- Vertices and edges; directed vs undirected; weighted vs unweighted; degree.
- The three representations — edge list, adjacency list, adjacency matrix — with their space (O(E), O(V + E), O(V²)) and edge-lookup costs.
- Sparse vs dense: why the adjacency list is the default for interview problems.
- Implicit graphs: a grid or a word puzzle is a graph you never build explicitly.
- JavaScript details: \`Array.from({ length: n }, () => [])\` (not \`new Array(n).fill([])\`, which shares one array), \`Map\` over plain objects for labels, \`Set\` neighbours for O(1) edge checks.

**Code / implementation expected:** Optional — building an adjacency list from an edge list in a few lines of JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph knowledge needed, just arrays and loops  
**Difficulty:** Easy  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think of a group chat for a school trip. Some pairs of students are friends, some are not. If you drew every student as a dot and every friendship as a line between two dots, you would have drawn a **graph**. Now swap the words: dots can be cities and lines can be roads; dots can be web pages and lines can be links; dots can be squares on a chessboard and lines can be legal knight moves. The same picture describes all of them.

That is why graphs are everywhere in interviews. Once you can see "this is really dots and lines", a whole family of questions — Can I get from A to B? What is the shortest route? How many separate groups are there? Is there a loop? — turns into a handful of standard algorithms you already know.

But before any algorithm can run, the computer needs the picture written down in memory. There are three common ways to write it down, and choosing the right one is the first decision in every graph problem. That choice is what this page is about.

## 2. What Exactly Is a Graph?

A graph is two things: a set of **things** and a set of **connections** between pairs of those things. Nothing more. The things do not need positions, and the lines do not need lengths, unless the problem gives them.

📌 **Interview term: Vertex (node)** — one of the things in the graph — a person, a city, a grid cell. Usually numbered 0 to n − 1 so they can be array indexes.

📌 **Interview term: Edge** — a connection between two vertices. We write it as a pair (u, v).

Edges come in a few flavours, and the interviewer will expect you to ask which one you have:

📌 **Interview term: Undirected vs directed graph** — in an undirected graph an edge works both ways (friendship); in a directed graph an edge u → v goes one way only (following someone, a one-way street, a course prerequisite).

📌 **Interview term: Weighted graph** — every edge carries a number — a distance, a cost, a time. Without weights every edge counts as 1.

📌 **Interview term: Degree** — how many edges touch a vertex. In a directed graph you count out-degree (edges leaving) and in-degree (edges arriving) separately.

📌 **Interview term: Path and cycle** — a path is a walk along edges from one vertex to another; a cycle is a path that comes back to where it started.

📌 **Interview term: Connected graph** — an undirected graph where every vertex can reach every other vertex. A graph that is not connected splits into separate pieces called connected components (see [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph)).

Here is the small undirected graph that the first example builds. It has six vertices and five edges, and vertex 5 has no edges at all — it is still part of the graph.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 240" role="img" aria-label="An undirected graph with six vertices. Edges 0-1, 0-2, 1-2, 1-3 and 3-4. Vertex 5 has no edges">
  <path class="d-edge" d="M 104 70 L 196 70"/>
  <path class="d-edge" d="M 92 91 L 138 149"/>
  <path class="d-edge" d="M 208 91 L 162 149"/>
  <path class="d-edge" d="M 244 70 L 336 70"/>
  <path class="d-edge" d="M 384 70 L 476 70"/>
  <circle class="d-box-accent" cx="80" cy="70" r="24"/>
  <text class="d-text" x="80" y="75" text-anchor="middle">0</text>
  <circle class="d-box-accent" cx="220" cy="70" r="24"/>
  <text class="d-text" x="220" y="75" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="150" cy="170" r="24"/>
  <text class="d-text" x="150" y="175" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="360" cy="70" r="24"/>
  <text class="d-text" x="360" y="75" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="500" cy="70" r="24"/>
  <text class="d-text" x="500" y="75" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="500" cy="170" r="24"/>
  <text class="d-text" x="500" y="175" text-anchor="middle">5</text>
  <text class="d-sub" x="220" y="30" text-anchor="middle">degree 3</text>
  <text class="d-sub" x="500" y="222" text-anchor="middle">degree 0</text>
  <text class="d-sub" x="150" y="222" text-anchor="middle">triangle 0-1-2</text>
</svg>

Vertices 0, 1 and 2 form a triangle, which is a cycle. Vertex 1 touches three edges, so its degree is 3. Vertex 5 is a component on its own.

## 3. Three Ways to Store a Graph

**1. Edge list** — just write down every edge: \`[(0, 1), (0, 2), (1, 2), (1, 3), (3, 4)]\`. It is the format most problems hand you as input. It is compact (one entry per edge), but asking "who are the neighbours of 1?" means scanning the whole list.

**2. Adjacency list** — for every vertex, keep a list of its neighbours. This is the default for almost every interview problem, because the operation algorithms need most is "give me the neighbours of u", and the adjacency list answers it directly.

**3. Adjacency matrix** — an n × n table where cell [u][v] is 1 when the edge u–v exists. It answers "is there an edge between u and v?" in one lookup, but it always uses n² cells, even when almost all of them are 0.

📌 **Interview term: Adjacency list** — an array (or map) indexed by vertex, where entry u holds the neighbours of u. Space O(V + E).

📌 **Interview term: Adjacency matrix** — a V × V grid of 0/1 (or weights) where cell [u][v] says whether edge u → v exists. Space O(V²), edge check O(1).

📌 **Interview term: Edge list** — a plain list of (u, v) pairs, usually the raw input. Space O(E).

<svg class="iq-diagram" width="100%" viewBox="0 0 620 330" role="img" aria-label="Adjacency list of the six vertex graph. Each vertex points to the list of its neighbours">
  <defs>
    <marker id="b21q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="20" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="43" text-anchor="middle">0</text>
  <path class="d-edge" d="M 92 38 L 146 38" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="20" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="43" text-anchor="middle">1, 2</text>
  <rect class="d-box-accent" x="30" y="70" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="93" text-anchor="middle">1</text>
  <path class="d-edge" d="M 92 88 L 146 88" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="70" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="93" text-anchor="middle">0, 2, 3</text>
  <rect class="d-box-accent" x="30" y="120" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="143" text-anchor="middle">2</text>
  <path class="d-edge" d="M 92 138 L 146 138" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="120" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="143" text-anchor="middle">0, 1</text>
  <rect class="d-box-accent" x="30" y="170" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="193" text-anchor="middle">3</text>
  <path class="d-edge" d="M 92 188 L 146 188" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="170" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="193" text-anchor="middle">1, 4</text>
  <rect class="d-box-accent" x="30" y="220" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="243" text-anchor="middle">4</text>
  <path class="d-edge" d="M 92 238 L 146 238" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="220" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="243" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="30" y="270" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="293" text-anchor="middle">5</text>
  <path class="d-edge" d="M 92 288 L 146 288" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box-muted" x="150" y="270" width="200" height="36" rx="6"/>
  <text class="d-sub" x="250" y="293" text-anchor="middle">empty list</text>
  <rect class="d-box-muted" x="420" y="110" width="170" height="110" rx="10"/>
  <text class="d-text" x="505" y="145" text-anchor="middle">10 entries</text>
  <text class="d-sub" x="505" y="170" text-anchor="middle">5 edges, each</text>
  <text class="d-sub" x="505" y="192" text-anchor="middle">stored twice</text>
</svg>

In an undirected graph every edge is written into **both** endpoint lists, so the lists hold 2E entries in total. That is also why the degrees always add up to twice the number of edges (example 1 prints \`sum of degrees: 10 = 2 x 5 edges\`).

**4. The graph you never build.** Many interview graphs are hidden inside something else. A 2-D grid is a graph whose vertices are cells and whose edges join a cell to its up/down/left/right neighbours — you compute the neighbours with a direction array instead of storing them. The same is true of word puzzles where words are vertices and one-letter changes are edges (see the [word ladder problem](/interview-question/how-do-you-solve-the-word-ladder-problem)).

📌 **Interview term: Implicit graph** — a graph whose edges are computed on demand by a rule (grid moves, one-letter changes) instead of being stored. Space for edges is zero.

📌 **Interview term: Sparse vs dense graph** — sparse means E is close to V (most real graphs: roads, friendships); dense means E is close to V². Sparse graphs want adjacency lists; dense ones can afford a matrix.

## 4. Choosing a Representation

Write V for the number of vertices and E for the number of edges. See [Big-O notation](/interview-question/what-is-big-o-notation) if the notation is new.

| Operation | Edge list | Adjacency list | Adjacency matrix |
| :--- | :--- | :--- | :--- |
| Space | O(E) | O(V + E) | O(V²) |
| Is there an edge u–v? | O(E) | O(deg(u)) | O(1) |
| List the neighbours of u | O(E) | O(deg(u)) | O(V) |
| Visit every edge (BFS/DFS) | O(E) per vertex, so slow | O(V + E) | O(V²) |
| Add an edge | O(1) | O(1) amortised | O(1) |
| Best for | input format, Kruskal, Union-Find | almost everything | dense graphs, Floyd–Warshall, many edge checks |

The numbers from example 2 make the space row concrete: a sparse graph of 1,000 vertices and 3,000 edges needs **6,000** adjacency-list entries but **1,000,000** matrix cells, and only **0.60%** of those cells ever hold an edge.

**Rule of thumb for interviews:** convert the input to an adjacency list first, unless the input is a grid (use it directly as an implicit graph) or the problem is all about edge lookups on a small dense graph (use a matrix). If you need O(1) edge checks *and* sparse storage, store each vertex's neighbours in a hash set instead of a list (see [how a hash table works](/interview-question/how-does-a-hash-table-work)).

## 5. The Code in JavaScript

Building an adjacency list from an edge list is a few lines:

~~~javascript
const n = 6;
const edges = [[0, 1], [0, 2], [1, 2], [1, 3], [3, 4]];
const adj = Array.from({ length: n }, () => []);   // one NEW array per vertex
for (const [u, v] of edges) {
  adj[u].push(v);
  adj[v].push(u);                                  // undirected: both directions
}
~~~

**What to point out in this code:**

- \`Array.from({ length: n }, () => [])\` calls the arrow function n times, so every vertex gets its own array. The tempting \`new Array(n).fill([])\` puts *the same* array object in every slot, so pushing to \`adj[0]\` changes them all. This is the most common JavaScript graph bug.
- The matrix uses the same pattern: \`Array.from({ length: n }, () => new Array(n).fill(0))\` — filling with the number 0 is fine, filling with an array is not.
- \`adj[u].includes(v)\` scans the array (O(degree)); \`matrix[u][v]\` is one index (O(1)). For fast edge checks on a sparse graph, give every vertex a \`Set\` and call \`adj[u].has(v)\`.
- For labels like \`"A"\`, use a \`Map\` (example 2). A \`Map\` accepts any key type, has a real \`.size\`, and cannot collide with inherited keys such as \`"constructor"\` the way a plain object can. Example 2 still sorts the keys before printing so the output does not depend on insertion order.
- \`inDegree.get(v) ?? 0\` uses nullish coalescing (ES2020) to treat a missing key as 0.
- A weighted edge is a small array \`[neighbour, weight]\`; destructure it with \`for (const [v, w] of graph.get(u))\`.

📌 **Interview term: Adjacency set** — an adjacency list whose per-vertex container is a hash set (a JavaScript \`Set\`), giving average O(1) edge checks while keeping O(V + E) space.

## 6. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\` (Node.js 22; the code is plain browser-safe JavaScript, so it also runs in the page). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — one graph, three representations** prints:

~~~text
nodes: 6, edges: 5
edge list: [(0, 1), (0, 2), (1, 2), (1, 3), (3, 4)]
adjacency list:
  0 -> [1, 2]
  1 -> [0, 2, 3]
  2 -> [0, 1]
  3 -> [1, 4]
  4 -> [3]
  5 -> []
adjacency matrix:
  0 1 1 0 0 0
  1 0 1 1 0 0
  1 1 0 0 0 0
  0 1 0 0 1 0
  0 0 0 1 0 0
  0 0 0 0 0 0
edge 1-3? list: true, matrix: true
edge 0-4? list: false, matrix: false
degree of 1: 3
sum of degrees: 10 = 2 x 5 edges
~~~

**Example 2 — a weighted directed graph, sparse-graph space, and an implicit grid graph** prints:

~~~text
directed weighted graph:
  A -> [B:5, C:2]  out=2 in=0
  B -> [D:4]  out=1 in=2
  C -> [B:1, D:7]  out=2 in=1
  D -> []  out=0 in=2
sparse graph: n = 1000, edges = 3000
  adjacency list entries: 6000
  adjacency matrix cells: 1000000
  matrix cells holding an edge: 0.60%
implicit grid graph 3 x 4:
  (1,1) -> [(0,1), (2,1), (1,0), (1,2)]
  (0,0) -> [(1,0), (0,1)]
  (2,3) -> [(1,3), (2,2)]
~~~

## 7. Complexity

| Representation | Build time | Space | Why |
| :--- | :--- | :--- | :--- |
| Edge list | O(E) | O(E) | one entry per edge, as given |
| Adjacency list | O(V + E) | O(V + E) | one list per vertex, each undirected edge stored twice |
| Adjacency matrix | O(V² + E) | O(V²) | the table is allocated in full before any edge is set |

An array of arrays is the usual adjacency list; for string labels use a \`Map\`, which accepts any key type and iterates in insertion order.

## 8. Edge Cases

- **Vertices with no edges.** They still exist and must still get an (empty) entry. If you build the adjacency list only from the edge list, vertex 5 disappears — size the list from n, not from the edges.
- **Self-loop (u, u).** Appending both directions adds u to its own list twice. Decide whether the problem allows it; most "count components" problems simply ignore it.
- **Duplicate edges.** An edge list may contain (0, 1) and (1, 0). In an undirected graph that is the same edge; a matrix absorbs it, a list stores it twice. Use a set of neighbours if duplicates matter.
- **Labels that are not 0..n−1.** Names like "A" or user ids need a hash map from label to neighbours (example 2) or a first pass that maps each label to an index.
- **Directed input treated as undirected (or the reverse).** Adding the reverse edge for a directed graph silently changes every answer, so confirm the direction before you code.

## Common Pitfalls

- **\`new Array(n).fill([])\`.** Every slot is the same array object; every \`push\` shows up in every vertex. Use \`Array.from({ length: n }, () => [])\`.
- **Forgetting the reverse edge.** For an undirected graph push \`v\` into \`adj[u]\` *and* \`u\` into \`adj[v]\`.
- **Plain objects as maps for user-supplied labels.** Keys become strings and can clash with prototype properties; a \`Map\` avoids both problems.
- **Printing arrays with \`console.log(adj)\`.** Node prints \`[ 1, 2 ]\` with inner spaces, a browser console shows an expandable tree; join the values yourself when the exact text matters.
- **A matrix for a big sparse graph.** n = 100,000 means 10^10 cells — far beyond what a JavaScript engine can allocate.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A graph is a set of vertices plus a set of edges between pairs of them; edges may be directed and may carry weights.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Default storage:</strong> <span style="color:#f0e2c8;">An adjacency list: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from({ length: n }, () =&gt; [])</code>, push both directions for undirected edges. O(V + E) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Alternative:</strong> <span style="color:#f0e2c8;">An adjacency matrix gives O(1) edge checks but costs O(V²) space — only for small or dense graphs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Implicit graphs:</strong> <span style="color:#f0e2c8;">Grids and word puzzles are graphs too; compute neighbours with a direction array instead of storing edges.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Array(n).fill([])</code> (one shared array); use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> for string labels and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>s for fast edge checks.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the adjacency list the default?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Traversals ask for the neighbours of each vertex, and the list gives exactly those in O(deg) time, for O(V + E) total space. A matrix makes the same traversal O(V²).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you pick a matrix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the graph is small or dense and you check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[u][v]</code> very often, for example Floyd–Warshall all-pairs shortest paths.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> and not an object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> takes any key type, keeps insertion order, has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.size</code>, and has no inherited keys; an object turns keys into strings and inherits from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.prototype</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is wrong with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">new Array(n).fill([])</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fill</code> puts the same array reference in every slot, so one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> changes all of them. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from</code> with a factory function creates a fresh array per slot.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you store a weighted graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[neighbour, weight]</code> pairs into each list, or store weights in the matrix with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Infinity</code> meaning no edge.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Vertex (node)** | One of the things in a graph, usually numbered 0 to n − 1 |
| **Edge** | A connection (u, v) between two vertices |
| **Undirected vs directed graph** | Edges work both ways vs one way only |
| **Weighted graph** | Every edge carries a number such as a distance or cost |
| **Degree** | Number of edges touching a vertex (in-degree and out-degree when directed) |
| **Path and cycle** | A walk along edges; a cycle returns to its start |
| **Connected graph** | Every vertex can reach every other; otherwise it splits into components |
| **Adjacency list** | Per-vertex list of neighbours; O(V + E) space |
| **Adjacency matrix** | V × V table of edges; O(V²) space, O(1) edge check |
| **Edge list** | Plain list of (u, v) pairs; O(E) space |
| **Implicit graph** | Edges computed by a rule (grid moves) instead of stored |
| **Sparse vs dense graph** | E close to V vs E close to V² |
| **Adjacency set** | Per-vertex \`Set\` of neighbours: O(1) average edge check, O(V + E) space |

---
**Conclusion:** In JavaScript a graph is almost always \`Array.from({ length: n }, () => [])\` filled from the edge list — both directions for undirected edges — giving O(V + E) space and direct access to each vertex's neighbours. Keep the matrix for small dense graphs that need O(1) edge checks, use a \`Map\` when vertices have names, remember that grids are graphs you never build, and never \`fill\` an array with \`[]\`. Next, see how to walk a graph in [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs), and use it to [count islands in a grid](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) or [count connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph).`,
        examples: [
          {
            label: "One graph, three representations: edge list, adjacency list, matrix",
            code: `function fmt(xs) {
  return "[" + xs.join(", ") + "]";
}

const n = 6;
const edges = [[0, 1], [0, 2], [1, 2], [1, 3], [3, 4]]; // node 5 has no edges

// 1. Adjacency list: one array of neighbours per node (undirected: add both ways)
const adj = Array.from({ length: n }, () => []);
for (const [u, v] of edges) {
  adj[u].push(v);
  adj[v].push(u);
}

// 2. Adjacency matrix: n x n grid of 0/1, symmetric for an undirected graph
const matrix = Array.from({ length: n }, () => new Array(n).fill(0));
for (const [u, v] of edges) {
  matrix[u][v] = 1;
  matrix[v][u] = 1;
}

console.log("nodes: " + n + ", edges: " + edges.length);
console.log("edge list: [" + edges.map(([u, v]) => "(" + u + ", " + v + ")").join(", ") + "]");
console.log("adjacency list:");
for (let u = 0; u < n; u++) console.log("  " + u + " -> " + fmt(adj[u]));
console.log("adjacency matrix:");
for (const row of matrix) console.log("  " + row.join(" "));

for (const [u, v] of [[1, 3], [0, 4]]) {
  const inList = adj[u].includes(v);     // O(degree) scan
  const inMatrix = matrix[u][v] === 1;   // O(1) lookup
  console.log("edge " + u + "-" + v + "? list: " + inList + ", matrix: " + inMatrix);
}

console.log("degree of 1: " + adj[1].length);
const total = adj.reduce((sum, nbrs) => sum + nbrs.length, 0);
console.log("sum of degrees: " + total + " = 2 x " + edges.length + " edges");`,
          },
          {
            label: "Weighted directed graph, sparse-graph space, implicit grid graph",
            code: `// Part 1: a directed, weighted graph (flight costs) as a Map of arrays
const flights = [["A", "B", 5], ["A", "C", 2], ["C", "B", 1], ["B", "D", 4], ["C", "D", 7]];
const graph = new Map();       // node -> array of [neighbour, weight]
const inDegree = new Map();
for (const [u, v, w] of flights) {
  if (!graph.has(u)) graph.set(u, []);
  if (!graph.has(v)) graph.set(v, []);   // make sure sinks like D appear as keys
  graph.get(u).push([v, w]);
  inDegree.set(v, (inDegree.get(v) ?? 0) + 1);
}

console.log("directed weighted graph:");
for (const u of [...graph.keys()].sort()) {
  const out = graph.get(u).map(([v, w]) => v + ":" + w).join(", ");
  console.log("  " + u + " -> [" + out + "]  out=" + graph.get(u).length + " in=" + (inDegree.get(u) ?? 0));
}

// Part 2: a sparse graph - how much space does each representation need?
const n = 1000;
let edgeCount = 0;
const adj = Array.from({ length: n }, () => []);
for (let i = 0; i < n; i++) {
  for (const step of [1, 2, 5]) {   // every node links to the nodes 1, 2 and 5 ahead (wrapping)
    const j = (i + step) % n;
    adj[i].push(j);
    adj[j].push(i);
    edgeCount++;
  }
}
const listEntries = adj.reduce((s, a) => s + a.length, 0);
const matrixCells = n * n;
console.log("sparse graph: n = " + n + ", edges = " + edgeCount);
console.log("  adjacency list entries: " + listEntries);
console.log("  adjacency matrix cells: " + matrixCells);
console.log("  matrix cells holding an edge: " + (100 * listEntries / matrixCells).toFixed(2) + "%");

// Part 3: a grid is a graph you never build - neighbours are computed
const ROWS = 3, COLS = 4;
function gridNeighbours(r, c) {
  const out = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {   // up, down, left, right
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push("(" + nr + "," + nc + ")");
  }
  return out;
}

console.log("implicit grid graph " + ROWS + " x " + COLS + ":");
for (const [r, c] of [[1, 1], [0, 0], [2, 3]]) {
  console.log("  (" + r + "," + c + ") -> [" + gridNeighbours(r, c).join(", ") + "]");
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"What is a graph, and how would you store one in memory in Java? Walk me through the options and when you would pick each one."

**What a strong answer should cover:**
- Vertices and edges; directed vs undirected; weighted vs unweighted; degree.
- The three representations — edge list, adjacency list, adjacency matrix — with their space (O(E), O(V + E), O(V²)) and edge-lookup costs.
- Sparse vs dense: why the adjacency list is the default for interview problems.
- Implicit graphs: a grid or a word puzzle is a graph you never build explicitly.
- Java details: \`List<List<Integer>>\` built with a loop of \`new ArrayList<>()\`, boxing cost of \`Integer\`, \`boolean[][]\` for a matrix, \`Map<String, List<...>>\` with \`computeIfAbsent\` for named vertices, and a \`record\` for weighted edges.

**Code / implementation expected:** Optional — building an adjacency list from an edge array in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph knowledge needed, just arrays and loops  
**Difficulty:** Easy  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think of a group chat for a school trip. Some pairs of students are friends, some are not. If you drew every student as a dot and every friendship as a line between two dots, you would have drawn a **graph**. Now swap the words: dots can be cities and lines can be roads; dots can be web pages and lines can be links; dots can be squares on a chessboard and lines can be legal knight moves. The same picture describes all of them.

That is why graphs are everywhere in interviews. Once you can see "this is really dots and lines", a whole family of questions — Can I get from A to B? What is the shortest route? How many separate groups are there? Is there a loop? — turns into a handful of standard algorithms you already know.

But before any algorithm can run, the computer needs the picture written down in memory. There are three common ways to write it down, and choosing the right one is the first decision in every graph problem. That choice is what this page is about.

## 2. What Exactly Is a Graph?

A graph is two things: a set of **things** and a set of **connections** between pairs of those things. Nothing more. The things do not need positions, and the lines do not need lengths, unless the problem gives them.

📌 **Interview term: Vertex (node)** — one of the things in the graph — a person, a city, a grid cell. Usually numbered 0 to n − 1 so they can be array indexes.

📌 **Interview term: Edge** — a connection between two vertices. We write it as a pair (u, v).

Edges come in a few flavours, and the interviewer will expect you to ask which one you have:

📌 **Interview term: Undirected vs directed graph** — in an undirected graph an edge works both ways (friendship); in a directed graph an edge u → v goes one way only (following someone, a one-way street, a course prerequisite).

📌 **Interview term: Weighted graph** — every edge carries a number — a distance, a cost, a time. Without weights every edge counts as 1.

📌 **Interview term: Degree** — how many edges touch a vertex. In a directed graph you count out-degree (edges leaving) and in-degree (edges arriving) separately.

📌 **Interview term: Path and cycle** — a path is a walk along edges from one vertex to another; a cycle is a path that comes back to where it started.

📌 **Interview term: Connected graph** — an undirected graph where every vertex can reach every other vertex. A graph that is not connected splits into separate pieces called connected components (see [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph)).

Here is the small undirected graph that the first example builds. It has six vertices and five edges, and vertex 5 has no edges at all — it is still part of the graph.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 240" role="img" aria-label="An undirected graph with six vertices. Edges 0-1, 0-2, 1-2, 1-3 and 3-4. Vertex 5 has no edges">
  <path class="d-edge" d="M 104 70 L 196 70"/>
  <path class="d-edge" d="M 92 91 L 138 149"/>
  <path class="d-edge" d="M 208 91 L 162 149"/>
  <path class="d-edge" d="M 244 70 L 336 70"/>
  <path class="d-edge" d="M 384 70 L 476 70"/>
  <circle class="d-box-accent" cx="80" cy="70" r="24"/>
  <text class="d-text" x="80" y="75" text-anchor="middle">0</text>
  <circle class="d-box-accent" cx="220" cy="70" r="24"/>
  <text class="d-text" x="220" y="75" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="150" cy="170" r="24"/>
  <text class="d-text" x="150" y="175" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="360" cy="70" r="24"/>
  <text class="d-text" x="360" y="75" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="500" cy="70" r="24"/>
  <text class="d-text" x="500" y="75" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="500" cy="170" r="24"/>
  <text class="d-text" x="500" y="175" text-anchor="middle">5</text>
  <text class="d-sub" x="220" y="30" text-anchor="middle">degree 3</text>
  <text class="d-sub" x="500" y="222" text-anchor="middle">degree 0</text>
  <text class="d-sub" x="150" y="222" text-anchor="middle">triangle 0-1-2</text>
</svg>

Vertices 0, 1 and 2 form a triangle, which is a cycle. Vertex 1 touches three edges, so its degree is 3. Vertex 5 is a component on its own.

## 3. Three Ways to Store a Graph

**1. Edge list** — just write down every edge: \`[(0, 1), (0, 2), (1, 2), (1, 3), (3, 4)]\`. It is the format most problems hand you as input. It is compact (one entry per edge), but asking "who are the neighbours of 1?" means scanning the whole list.

**2. Adjacency list** — for every vertex, keep a list of its neighbours. This is the default for almost every interview problem, because the operation algorithms need most is "give me the neighbours of u", and the adjacency list answers it directly.

**3. Adjacency matrix** — an n × n table where cell [u][v] is 1 when the edge u–v exists. It answers "is there an edge between u and v?" in one lookup, but it always uses n² cells, even when almost all of them are 0.

📌 **Interview term: Adjacency list** — an array (or map) indexed by vertex, where entry u holds the neighbours of u. Space O(V + E).

📌 **Interview term: Adjacency matrix** — a V × V grid of 0/1 (or weights) where cell [u][v] says whether edge u → v exists. Space O(V²), edge check O(1).

📌 **Interview term: Edge list** — a plain list of (u, v) pairs, usually the raw input. Space O(E).

<svg class="iq-diagram" width="100%" viewBox="0 0 620 330" role="img" aria-label="Adjacency list of the six vertex graph. Each vertex points to the list of its neighbours">
  <defs>
    <marker id="b21q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="20" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="43" text-anchor="middle">0</text>
  <path class="d-edge" d="M 92 38 L 146 38" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="20" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="43" text-anchor="middle">1, 2</text>
  <rect class="d-box-accent" x="30" y="70" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="93" text-anchor="middle">1</text>
  <path class="d-edge" d="M 92 88 L 146 88" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="70" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="93" text-anchor="middle">0, 2, 3</text>
  <rect class="d-box-accent" x="30" y="120" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="143" text-anchor="middle">2</text>
  <path class="d-edge" d="M 92 138 L 146 138" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="120" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="143" text-anchor="middle">0, 1</text>
  <rect class="d-box-accent" x="30" y="170" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="193" text-anchor="middle">3</text>
  <path class="d-edge" d="M 92 188 L 146 188" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="170" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="193" text-anchor="middle">1, 4</text>
  <rect class="d-box-accent" x="30" y="220" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="243" text-anchor="middle">4</text>
  <path class="d-edge" d="M 92 238 L 146 238" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="220" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="243" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="30" y="270" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="293" text-anchor="middle">5</text>
  <path class="d-edge" d="M 92 288 L 146 288" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box-muted" x="150" y="270" width="200" height="36" rx="6"/>
  <text class="d-sub" x="250" y="293" text-anchor="middle">empty list</text>
  <rect class="d-box-muted" x="420" y="110" width="170" height="110" rx="10"/>
  <text class="d-text" x="505" y="145" text-anchor="middle">10 entries</text>
  <text class="d-sub" x="505" y="170" text-anchor="middle">5 edges, each</text>
  <text class="d-sub" x="505" y="192" text-anchor="middle">stored twice</text>
</svg>

In an undirected graph every edge is written into **both** endpoint lists, so the lists hold 2E entries in total. That is also why the degrees always add up to twice the number of edges (example 1 prints \`sum of degrees: 10 = 2 x 5 edges\`).

**4. The graph you never build.** Many interview graphs are hidden inside something else. A 2-D grid is a graph whose vertices are cells and whose edges join a cell to its up/down/left/right neighbours — you compute the neighbours with a direction array instead of storing them. The same is true of word puzzles where words are vertices and one-letter changes are edges (see the [word ladder problem](/interview-question/how-do-you-solve-the-word-ladder-problem)).

📌 **Interview term: Implicit graph** — a graph whose edges are computed on demand by a rule (grid moves, one-letter changes) instead of being stored. Space for edges is zero.

📌 **Interview term: Sparse vs dense graph** — sparse means E is close to V (most real graphs: roads, friendships); dense means E is close to V². Sparse graphs want adjacency lists; dense ones can afford a matrix.

## 4. Choosing a Representation

Write V for the number of vertices and E for the number of edges. See [Big-O notation](/interview-question/what-is-big-o-notation) if the notation is new.

| Operation | Edge list | Adjacency list | Adjacency matrix |
| :--- | :--- | :--- | :--- |
| Space | O(E) | O(V + E) | O(V²) |
| Is there an edge u–v? | O(E) | O(deg(u)) | O(1) |
| List the neighbours of u | O(E) | O(deg(u)) | O(V) |
| Visit every edge (BFS/DFS) | O(E) per vertex, so slow | O(V + E) | O(V²) |
| Add an edge | O(1) | O(1) amortised | O(1) |
| Best for | input format, Kruskal, Union-Find | almost everything | dense graphs, Floyd–Warshall, many edge checks |

The numbers from example 2 make the space row concrete: a sparse graph of 1,000 vertices and 3,000 edges needs **6,000** adjacency-list entries but **1,000,000** matrix cells, and only **0.60%** of those cells ever hold an edge.

**Rule of thumb for interviews:** convert the input to an adjacency list first, unless the input is a grid (use it directly as an implicit graph) or the problem is all about edge lookups on a small dense graph (use a matrix). If you need O(1) edge checks *and* sparse storage, store each vertex's neighbours in a hash set instead of a list (see [how a hash table works](/interview-question/how-does-a-hash-table-work)).

## 5. The Code in Java

Building an adjacency list from an edge array:

~~~java
int n = 6;
int[][] edges = {{0, 1}, {0, 2}, {1, 2}, {1, 3}, {3, 4}};
List<List<Integer>> adj = new ArrayList<>();
for (int i = 0; i < n; i++) adj.add(new ArrayList<>());   // one NEW list per vertex
for (int[] e : edges) {
    adj.get(e[0]).add(e[1]);
    adj.get(e[1]).add(e[0]);                              // undirected: both directions
}
~~~

**What to point out in this code:**

- \`new ArrayList<>(n)\` does **not** create n lists — the argument is only the initial *capacity*; the list is still empty. You must \`add\` n inner lists yourself (or use an array \`List<Integer>[]\`, which needs an unchecked cast).
- Every neighbour is an \`Integer\` object (autoboxing). That costs memory and a pointer per entry. For very large graphs, interviewers like hearing about the compact CSR layout: one \`int[]\` of all neighbours plus one \`int[]\` of start offsets (example 2 of [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph) uses it).
- \`adj.get(u).contains(v)\` scans the list (O(degree)) and boxes \`v\` first; \`matrix[u][v]\` on a \`boolean[][]\` is O(1). A \`boolean[][]\` starts all \`false\`, so no fill is needed.
- \`List.toString()\` prints \`[1, 2]\`, which is why the example can print \`adj.get(u)\` directly; arrays need \`Arrays.toString\`.
- For named vertices, example 2 uses \`Map.computeIfAbsent(key, k -> new ArrayList<>())\` to create the list on first use, \`Map.merge(v, 1, Integer::sum)\` to count in-degrees, and a \`TreeMap\` so keys come out sorted.
- A weighted edge is a \`record Edge(String to, int weight)\` (records became a standard feature in Java 16, [JEP 395](https://openjdk.org/jeps/395)): an immutable value class with a constructor and accessors generated for you.

📌 **Interview term: Autoboxing** — Java automatically wrapping a primitive \`int\` into an \`Integer\` object so it can live in a collection. It costs an object per value and can surprise you with \`==\` comparisons.

## 6. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21; the code only uses Java 17 features). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — one graph, three representations** prints:

~~~text
nodes: 6, edges: 5
edge list: [(0, 1), (0, 2), (1, 2), (1, 3), (3, 4)]
adjacency list:
  0 -> [1, 2]
  1 -> [0, 2, 3]
  2 -> [0, 1]
  3 -> [1, 4]
  4 -> [3]
  5 -> []
adjacency matrix:
  0 1 1 0 0 0
  1 0 1 1 0 0
  1 1 0 0 0 0
  0 1 0 0 1 0
  0 0 0 1 0 0
  0 0 0 0 0 0
edge 1-3? list: true, matrix: true
edge 0-4? list: false, matrix: false
degree of 1: 3
sum of degrees: 10 = 2 x 5 edges
~~~

**Example 2 — a weighted directed graph, sparse-graph space, and an implicit grid graph** prints:

~~~text
directed weighted graph:
  A -> [B:5, C:2]  out=2 in=0
  B -> [D:4]  out=1 in=2
  C -> [B:1, D:7]  out=2 in=1
  D -> []  out=0 in=2
sparse graph: n = 1000, edges = 3000
  adjacency list entries: 6000
  adjacency matrix cells: 1000000
  matrix cells holding an edge: 0.60%
implicit grid graph 3 x 4:
  (1,1) -> [(0,1), (2,1), (1,0), (1,2)]
  (0,0) -> [(1,0), (0,1)]
  (2,3) -> [(1,3), (2,2)]
~~~

## 7. Complexity

| Representation | Build time | Space | Why |
| :--- | :--- | :--- | :--- |
| Edge list | O(E) | O(E) | one entry per edge, as given |
| Adjacency list | O(V + E) | O(V + E) | one list per vertex, each undirected edge stored twice |
| Adjacency matrix | O(V² + E) | O(V²) | the table is allocated in full before any edge is set |

\`List<List<Integer>>\` is the usual adjacency list; each neighbour is a boxed \`Integer\` object, so for very large graphs an \`int[]\` layout (CSR) uses much less memory.

## 8. Edge Cases

- **Vertices with no edges.** They still exist and must still get an (empty) entry. If you build the adjacency list only from the edge list, vertex 5 disappears — size the list from n, not from the edges.
- **Self-loop (u, u).** Appending both directions adds u to its own list twice. Decide whether the problem allows it; most "count components" problems simply ignore it.
- **Duplicate edges.** An edge list may contain (0, 1) and (1, 0). In an undirected graph that is the same edge; a matrix absorbs it, a list stores it twice. Use a set of neighbours if duplicates matter.
- **Labels that are not 0..n−1.** Names like "A" or user ids need a hash map from label to neighbours (example 2) or a first pass that maps each label to an index.
- **Directed input treated as undirected (or the reverse).** Adding the reverse edge for a directed graph silently changes every answer, so confirm the direction before you code.

## Common Pitfalls

- **Thinking \`new ArrayList<>(n)\` makes n slots.** It makes an empty list with capacity n; \`adj.get(0)\` throws \`IndexOutOfBoundsException\` until you add the inner lists.
- **Forgetting the reverse edge.** For an undirected graph add \`v\` to \`adj.get(u)\` *and* \`u\` to \`adj.get(v)\`.
- **\`remove(int)\` vs \`remove(Object)\`.** On a \`List<Integer>\`, \`adj.get(u).remove(v)\` with an \`int v\` removes the element *at index v*, not the value v; use \`remove(Integer.valueOf(v))\`.
- **Comparing boxed values with \`==\`.** \`Integer\` objects outside the small cached range are different objects; compare with \`.equals\` or unbox to \`int\` first.
- **A matrix for a big sparse graph.** \`new boolean[100000][100000]\` asks for about 10 GB and throws \`OutOfMemoryError\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A graph is a set of vertices plus a set of edges between pairs of them; edges may be directed and may carry weights.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Default storage:</strong> <span style="color:#f0e2c8;">An adjacency list: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List&lt;List&lt;Integer&gt;&gt;</code> with one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList</code> per vertex, both directions for undirected edges. O(V + E) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Alternative:</strong> <span style="color:#f0e2c8;">An adjacency matrix (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[][]</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[][]</code>) gives O(1) edge checks but costs O(V²) space — only for small or dense graphs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Implicit graphs:</strong> <span style="color:#f0e2c8;">Grids and word puzzles are graphs too; compute neighbours from a direction array instead of storing edges.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new ArrayList&lt;&gt;(n)</code> is only a capacity; neighbours are boxed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code>s, so huge graphs use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> arrays (CSR).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the adjacency list the default?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Traversals ask for the neighbours of each vertex, and the list gives exactly those in O(deg) time, for O(V + E) total space. A matrix makes the same traversal O(V²).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you pick a matrix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the graph is small or dense and you check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[u][v]</code> very often, for example Floyd–Warshall all-pairs shortest paths.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you store a weighted graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List&lt;List&lt;Edge&gt;&gt;</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">record Edge(int to, int weight)</code>, or an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[][]</code> matrix with a sentinel such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code> for no edge.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does boxing cost here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each neighbour in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List&lt;Integer&gt;</code> is an object reference, so memory is several times that of an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>. For millions of edges, use primitive arrays.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle string vertex names?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map&lt;String, List&lt;String&gt;&gt;</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computeIfAbsent</code>, or assign each name an index first with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;String, Integer&gt;</code> and keep using lists.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Vertex (node)** | One of the things in a graph, usually numbered 0 to n − 1 |
| **Edge** | A connection (u, v) between two vertices |
| **Undirected vs directed graph** | Edges work both ways vs one way only |
| **Weighted graph** | Every edge carries a number such as a distance or cost |
| **Degree** | Number of edges touching a vertex (in-degree and out-degree when directed) |
| **Path and cycle** | A walk along edges; a cycle returns to its start |
| **Connected graph** | Every vertex can reach every other; otherwise it splits into components |
| **Adjacency list** | Per-vertex list of neighbours; O(V + E) space |
| **Adjacency matrix** | V × V table of edges; O(V²) space, O(1) edge check |
| **Edge list** | Plain list of (u, v) pairs; O(E) space |
| **Implicit graph** | Edges computed by a rule (grid moves) instead of stored |
| **Sparse vs dense graph** | E close to V vs E close to V² |
| **Autoboxing** | Automatic \`int\` → \`Integer\` wrapping so a primitive can live in a collection; costs memory and time |

---
**Conclusion:** In Java a graph is usually a \`List<List<Integer>>\` with one \`ArrayList\` per vertex, filled from the edge array in both directions for undirected edges — O(V + E) space with direct access to each vertex's neighbours. Use a \`boolean[][]\` matrix only for small dense graphs, a \`Map\` with \`computeIfAbsent\` for named vertices, a \`record\` for weighted edges, and primitive \`int[]\` arrays when boxing millions of \`Integer\`s would be too heavy. Next, see how to walk a graph in [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs), and use it to [count islands in a grid](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) or [count connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph).`,
        examples: [
          {
            label: "One graph, three representations: edge list, adjacency list, matrix",
            code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        int n = 6;
        int[][] edges = {{0, 1}, {0, 2}, {1, 2}, {1, 3}, {3, 4}}; // node 5 has no edges

        // 1. Adjacency list: one List<Integer> of neighbours per node
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }

        // 2. Adjacency matrix: n x n grid, symmetric for an undirected graph
        boolean[][] matrix = new boolean[n][n];
        for (int[] e : edges) {
            matrix[e[0]][e[1]] = true;
            matrix[e[1]][e[0]] = true;
        }

        System.out.println("nodes: " + n + ", edges: " + edges.length);
        StringBuilder sb = new StringBuilder("edge list: [");
        for (int i = 0; i < edges.length; i++) {
            if (i > 0) sb.append(", ");
            sb.append("(").append(edges[i][0]).append(", ").append(edges[i][1]).append(")");
        }
        System.out.println(sb.append("]"));
        System.out.println("adjacency list:");
        for (int u = 0; u < n; u++) System.out.println("  " + u + " -> " + adj.get(u)); // List.toString prints [1, 2]
        System.out.println("adjacency matrix:");
        for (boolean[] row : matrix) {
            StringBuilder line = new StringBuilder(" ");
            for (boolean cell : row) line.append(" ").append(cell ? 1 : 0);
            System.out.println(line);
        }

        int[][] queries = {{1, 3}, {0, 4}};
        for (int[] q : queries) {
            boolean inList = adj.get(q[0]).contains(q[1]); // O(degree) scan, boxes q[1]
            boolean inMatrix = matrix[q[0]][q[1]];          // O(1) lookup
            System.out.println("edge " + q[0] + "-" + q[1] + "? list: " + inList + ", matrix: " + inMatrix);
        }

        System.out.println("degree of 1: " + adj.get(1).size());
        int total = 0;
        for (List<Integer> nbrs : adj) total += nbrs.size();
        System.out.println("sum of degrees: " + total + " = 2 x " + edges.length + " edges");
    }
}`,
          },
          {
            label: "Weighted directed graph, sparse-graph space, implicit grid graph",
            code: `import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public class Main {
    // A weighted edge: Java 17 record gives us a constructor and accessors for free
    record Edge(String to, int weight) {}

    static final int ROWS = 3, COLS = 4;
    static final int[][] DIRS = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}}; // up, down, left, right

    static List<String> gridNeighbours(int r, int c) {
        List<String> out = new ArrayList<>();
        for (int[] d : DIRS) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.add("(" + nr + "," + nc + ")");
        }
        return out;
    }

    public static void main(String[] args) {
        // Part 1: a directed, weighted graph (flight costs). TreeMap keeps keys sorted.
        String[][] flights = {{"A", "B", "5"}, {"A", "C", "2"}, {"C", "B", "1"}, {"B", "D", "4"}, {"C", "D", "7"}};
        Map<String, List<Edge>> graph = new TreeMap<>();
        Map<String, Integer> inDegree = new HashMap<>();
        for (String[] f : flights) {
            graph.computeIfAbsent(f[0], k -> new ArrayList<>()).add(new Edge(f[1], Integer.parseInt(f[2])));
            graph.computeIfAbsent(f[1], k -> new ArrayList<>()); // make sure sinks like D appear
            inDegree.merge(f[1], 1, Integer::sum);
        }
        System.out.println("directed weighted graph:");
        for (Map.Entry<String, List<Edge>> e : graph.entrySet()) {
            List<String> parts = new ArrayList<>();
            for (Edge edge : e.getValue()) parts.add(edge.to() + ":" + edge.weight());
            System.out.println("  " + e.getKey() + " -> [" + String.join(", ", parts) + "]  out="
                    + e.getValue().size() + " in=" + inDegree.getOrDefault(e.getKey(), 0));
        }

        // Part 2: a sparse graph - how much space does each representation need?
        int n = 1000, edgeCount = 0;
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int i = 0; i < n; i++) {
            for (int step : new int[]{1, 2, 5}) { // every node links to the nodes 1, 2 and 5 ahead
                int j = (i + step) % n;
                adj.get(i).add(j);
                adj.get(j).add(i);
                edgeCount++;
            }
        }
        long listEntries = 0;
        for (List<Integer> a : adj) listEntries += a.size();
        long matrixCells = (long) n * n;
        System.out.println("sparse graph: n = " + n + ", edges = " + edgeCount);
        System.out.println("  adjacency list entries: " + listEntries);
        System.out.println("  adjacency matrix cells: " + matrixCells);
        System.out.println("  matrix cells holding an edge: " + String.format("%.2f", 100.0 * listEntries / matrixCells) + "%");

        // Part 3: a grid is a graph you never build - neighbours are computed
        System.out.println("implicit grid graph " + ROWS + " x " + COLS + ":");
        int[][] cells = {{1, 1}, {0, 0}, {2, 3}};
        for (int[] cell : cells) {
            System.out.println("  (" + cell[0] + "," + cell[1] + ") -> [" + String.join(", ", gridNeighbours(cell[0], cell[1])) + "]");
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"What is a graph, and how would you store one in memory in C++? Walk me through the options and when you would pick each one."

**What a strong answer should cover:**
- Vertices and edges; directed vs undirected; weighted vs unweighted; degree.
- The three representations — edge list, adjacency list, adjacency matrix — with their space (O(E), O(V + E), O(V²)) and edge-lookup costs.
- Sparse vs dense: why the adjacency list is the default for interview problems.
- Implicit graphs: a grid or a word puzzle is a graph you never build explicitly.
- C++ details: \`std::vector<std::vector<int>> adj(n)\`, \`std::vector<std::pair<int,int>>\` for weighted edges, \`std::map\`/\`std::unordered_map\` for named vertices, and why \`std::vector<bool>\` is a special bit-packed case.

**Code / implementation expected:** Optional — building an adjacency list from an edge list in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no graph knowledge needed, just arrays and loops  
**Difficulty:** Easy  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think of a group chat for a school trip. Some pairs of students are friends, some are not. If you drew every student as a dot and every friendship as a line between two dots, you would have drawn a **graph**. Now swap the words: dots can be cities and lines can be roads; dots can be web pages and lines can be links; dots can be squares on a chessboard and lines can be legal knight moves. The same picture describes all of them.

That is why graphs are everywhere in interviews. Once you can see "this is really dots and lines", a whole family of questions — Can I get from A to B? What is the shortest route? How many separate groups are there? Is there a loop? — turns into a handful of standard algorithms you already know.

But before any algorithm can run, the computer needs the picture written down in memory. There are three common ways to write it down, and choosing the right one is the first decision in every graph problem. That choice is what this page is about.

## 2. What Exactly Is a Graph?

A graph is two things: a set of **things** and a set of **connections** between pairs of those things. Nothing more. The things do not need positions, and the lines do not need lengths, unless the problem gives them.

📌 **Interview term: Vertex (node)** — one of the things in the graph — a person, a city, a grid cell. Usually numbered 0 to n − 1 so they can be array indexes.

📌 **Interview term: Edge** — a connection between two vertices. We write it as a pair (u, v).

Edges come in a few flavours, and the interviewer will expect you to ask which one you have:

📌 **Interview term: Undirected vs directed graph** — in an undirected graph an edge works both ways (friendship); in a directed graph an edge u → v goes one way only (following someone, a one-way street, a course prerequisite).

📌 **Interview term: Weighted graph** — every edge carries a number — a distance, a cost, a time. Without weights every edge counts as 1.

📌 **Interview term: Degree** — how many edges touch a vertex. In a directed graph you count out-degree (edges leaving) and in-degree (edges arriving) separately.

📌 **Interview term: Path and cycle** — a path is a walk along edges from one vertex to another; a cycle is a path that comes back to where it started.

📌 **Interview term: Connected graph** — an undirected graph where every vertex can reach every other vertex. A graph that is not connected splits into separate pieces called connected components (see [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph)).

Here is the small undirected graph that the first example builds. It has six vertices and five edges, and vertex 5 has no edges at all — it is still part of the graph.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 240" role="img" aria-label="An undirected graph with six vertices. Edges 0-1, 0-2, 1-2, 1-3 and 3-4. Vertex 5 has no edges">
  <path class="d-edge" d="M 104 70 L 196 70"/>
  <path class="d-edge" d="M 92 91 L 138 149"/>
  <path class="d-edge" d="M 208 91 L 162 149"/>
  <path class="d-edge" d="M 244 70 L 336 70"/>
  <path class="d-edge" d="M 384 70 L 476 70"/>
  <circle class="d-box-accent" cx="80" cy="70" r="24"/>
  <text class="d-text" x="80" y="75" text-anchor="middle">0</text>
  <circle class="d-box-accent" cx="220" cy="70" r="24"/>
  <text class="d-text" x="220" y="75" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="150" cy="170" r="24"/>
  <text class="d-text" x="150" y="175" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="360" cy="70" r="24"/>
  <text class="d-text" x="360" y="75" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="500" cy="70" r="24"/>
  <text class="d-text" x="500" y="75" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="500" cy="170" r="24"/>
  <text class="d-text" x="500" y="175" text-anchor="middle">5</text>
  <text class="d-sub" x="220" y="30" text-anchor="middle">degree 3</text>
  <text class="d-sub" x="500" y="222" text-anchor="middle">degree 0</text>
  <text class="d-sub" x="150" y="222" text-anchor="middle">triangle 0-1-2</text>
</svg>

Vertices 0, 1 and 2 form a triangle, which is a cycle. Vertex 1 touches three edges, so its degree is 3. Vertex 5 is a component on its own.

## 3. Three Ways to Store a Graph

**1. Edge list** — just write down every edge: \`[(0, 1), (0, 2), (1, 2), (1, 3), (3, 4)]\`. It is the format most problems hand you as input. It is compact (one entry per edge), but asking "who are the neighbours of 1?" means scanning the whole list.

**2. Adjacency list** — for every vertex, keep a list of its neighbours. This is the default for almost every interview problem, because the operation algorithms need most is "give me the neighbours of u", and the adjacency list answers it directly.

**3. Adjacency matrix** — an n × n table where cell [u][v] is 1 when the edge u–v exists. It answers "is there an edge between u and v?" in one lookup, but it always uses n² cells, even when almost all of them are 0.

📌 **Interview term: Adjacency list** — an array (or map) indexed by vertex, where entry u holds the neighbours of u. Space O(V + E).

📌 **Interview term: Adjacency matrix** — a V × V grid of 0/1 (or weights) where cell [u][v] says whether edge u → v exists. Space O(V²), edge check O(1).

📌 **Interview term: Edge list** — a plain list of (u, v) pairs, usually the raw input. Space O(E).

<svg class="iq-diagram" width="100%" viewBox="0 0 620 330" role="img" aria-label="Adjacency list of the six vertex graph. Each vertex points to the list of its neighbours">
  <defs>
    <marker id="b21q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="20" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="43" text-anchor="middle">0</text>
  <path class="d-edge" d="M 92 38 L 146 38" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="20" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="43" text-anchor="middle">1, 2</text>
  <rect class="d-box-accent" x="30" y="70" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="93" text-anchor="middle">1</text>
  <path class="d-edge" d="M 92 88 L 146 88" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="70" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="93" text-anchor="middle">0, 2, 3</text>
  <rect class="d-box-accent" x="30" y="120" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="143" text-anchor="middle">2</text>
  <path class="d-edge" d="M 92 138 L 146 138" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="120" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="143" text-anchor="middle">0, 1</text>
  <rect class="d-box-accent" x="30" y="170" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="193" text-anchor="middle">3</text>
  <path class="d-edge" d="M 92 188 L 146 188" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="170" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="193" text-anchor="middle">1, 4</text>
  <rect class="d-box-accent" x="30" y="220" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="243" text-anchor="middle">4</text>
  <path class="d-edge" d="M 92 238 L 146 238" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box" x="150" y="220" width="200" height="36" rx="6"/>
  <text class="d-text" x="250" y="243" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="30" y="270" width="60" height="36" rx="6"/>
  <text class="d-text" x="60" y="293" text-anchor="middle">5</text>
  <path class="d-edge" d="M 92 288 L 146 288" marker-end="url(#b21q1-arrow)"/>
  <rect class="d-box-muted" x="150" y="270" width="200" height="36" rx="6"/>
  <text class="d-sub" x="250" y="293" text-anchor="middle">empty list</text>
  <rect class="d-box-muted" x="420" y="110" width="170" height="110" rx="10"/>
  <text class="d-text" x="505" y="145" text-anchor="middle">10 entries</text>
  <text class="d-sub" x="505" y="170" text-anchor="middle">5 edges, each</text>
  <text class="d-sub" x="505" y="192" text-anchor="middle">stored twice</text>
</svg>

In an undirected graph every edge is written into **both** endpoint lists, so the lists hold 2E entries in total. That is also why the degrees always add up to twice the number of edges (example 1 prints \`sum of degrees: 10 = 2 x 5 edges\`).

**4. The graph you never build.** Many interview graphs are hidden inside something else. A 2-D grid is a graph whose vertices are cells and whose edges join a cell to its up/down/left/right neighbours — you compute the neighbours with a direction array instead of storing them. The same is true of word puzzles where words are vertices and one-letter changes are edges (see the [word ladder problem](/interview-question/how-do-you-solve-the-word-ladder-problem)).

📌 **Interview term: Implicit graph** — a graph whose edges are computed on demand by a rule (grid moves, one-letter changes) instead of being stored. Space for edges is zero.

📌 **Interview term: Sparse vs dense graph** — sparse means E is close to V (most real graphs: roads, friendships); dense means E is close to V². Sparse graphs want adjacency lists; dense ones can afford a matrix.

## 4. Choosing a Representation

Write V for the number of vertices and E for the number of edges. See [Big-O notation](/interview-question/what-is-big-o-notation) if the notation is new.

| Operation | Edge list | Adjacency list | Adjacency matrix |
| :--- | :--- | :--- | :--- |
| Space | O(E) | O(V + E) | O(V²) |
| Is there an edge u–v? | O(E) | O(deg(u)) | O(1) |
| List the neighbours of u | O(E) | O(deg(u)) | O(V) |
| Visit every edge (BFS/DFS) | O(E) per vertex, so slow | O(V + E) | O(V²) |
| Add an edge | O(1) | O(1) amortised | O(1) |
| Best for | input format, Kruskal, Union-Find | almost everything | dense graphs, Floyd–Warshall, many edge checks |

The numbers from example 2 make the space row concrete: a sparse graph of 1,000 vertices and 3,000 edges needs **6,000** adjacency-list entries but **1,000,000** matrix cells, and only **0.60%** of those cells ever hold an edge.

**Rule of thumb for interviews:** convert the input to an adjacency list first, unless the input is a grid (use it directly as an implicit graph) or the problem is all about edge lookups on a small dense graph (use a matrix). If you need O(1) edge checks *and* sparse storage, store each vertex's neighbours in a hash set instead of a list (see [how a hash table works](/interview-question/how-does-a-hash-table-work)).

## 5. The Code in C++

Building an adjacency list from an edge list:

~~~cpp
const int n = 6;
std::vector<std::pair<int, int>> edges = {{0, 1}, {0, 2}, {1, 2}, {1, 3}, {3, 4}};
std::vector<std::vector<int>> adj(n);      // n empty vectors, one per vertex
for (auto [u, v] : edges) {                // C++17 structured bindings
    adj[u].push_back(v);
    adj[v].push_back(u);                   // undirected: both directions
}
~~~

**What to point out in this code:**

- \`std::vector<std::vector<int>> adj(n)\` really does create n separate empty vectors (value-initialised), unlike the shared-reference traps in Python and JavaScript. \`adj[u]\` with u ≥ n is undefined behaviour, though — \`operator[]\` does no bounds check; use \`adj.at(u)\` while debugging.
- \`auto [u, v] : edges\` copies each pair, which is fine for two ints; for bigger elements write \`const auto& [u, v]\`.
- \`std::find(adj[u].begin(), adj[u].end(), v)\` scans the neighbours (O(degree)); \`matrix[u][v]\` is O(1). For fast edge checks on a sparse graph, use \`std::vector<std::unordered_set<int>>\`.
- The matrix in example 1 is \`std::vector<std::vector<int>>\`. A \`std::vector<bool>\` would use one bit per cell, because the standard library specialises \`vector<bool>\` as a bit-packed container — compact, but its elements are proxy objects, not real \`bool&\` references.
- For named vertices, example 2 uses \`std::map\` (a sorted tree, so keys print in order). \`graph[f.to];\` uses the fact that \`operator[]\` inserts a default (empty) value for a missing key — handy here, and a classic bug when you only meant to *read*.
- A weighted edge is \`std::pair<int, int>\` (neighbour, weight) or a small \`struct\`.

📌 **Interview term: Value-initialisation** — C++ filling new elements with a default value — 0 for \`int\`, an empty vector for \`std::vector<int>\` — when you construct \`std::vector<T>(n)\`.

## 6. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — one graph, three representations** prints:

~~~text
nodes: 6, edges: 5
edge list: [(0, 1), (0, 2), (1, 2), (1, 3), (3, 4)]
adjacency list:
  0 -> [1, 2]
  1 -> [0, 2, 3]
  2 -> [0, 1]
  3 -> [1, 4]
  4 -> [3]
  5 -> []
adjacency matrix:
  0 1 1 0 0 0
  1 0 1 1 0 0
  1 1 0 0 0 0
  0 1 0 0 1 0
  0 0 0 1 0 0
  0 0 0 0 0 0
edge 1-3? list: true, matrix: true
edge 0-4? list: false, matrix: false
degree of 1: 3
sum of degrees: 10 = 2 x 5 edges
~~~

**Example 2 — a weighted directed graph, sparse-graph space, and an implicit grid graph** prints:

~~~text
directed weighted graph:
  A -> [B:5, C:2]  out=2 in=0
  B -> [D:4]  out=1 in=2
  C -> [B:1, D:7]  out=2 in=1
  D -> []  out=0 in=2
sparse graph: n = 1000, edges = 3000
  adjacency list entries: 6000
  adjacency matrix cells: 1000000
  matrix cells holding an edge: 0.60%
implicit grid graph 3 x 4:
  (1,1) -> [(0,1), (2,1), (1,0), (1,2)]
  (0,0) -> [(1,0), (0,1)]
  (2,3) -> [(1,3), (2,2)]
~~~

## 7. Complexity

| Representation | Build time | Space | Why |
| :--- | :--- | :--- | :--- |
| Edge list | O(E) | O(E) | one entry per edge, as given |
| Adjacency list | O(V + E) | O(V + E) | one list per vertex, each undirected edge stored twice |
| Adjacency matrix | O(V² + E) | O(V²) | the table is allocated in full before any edge is set |

\`std::vector<std::vector<int>>\` is the usual adjacency list; it stores plain \`int\`s contiguously per vertex, which is cache-friendly.

## 8. Edge Cases

- **Vertices with no edges.** They still exist and must still get an (empty) entry. If you build the adjacency list only from the edge list, vertex 5 disappears — size the list from n, not from the edges.
- **Self-loop (u, u).** Appending both directions adds u to its own list twice. Decide whether the problem allows it; most "count components" problems simply ignore it.
- **Duplicate edges.** An edge list may contain (0, 1) and (1, 0). In an undirected graph that is the same edge; a matrix absorbs it, a list stores it twice. Use a set of neighbours if duplicates matter.
- **Labels that are not 0..n−1.** Names like "A" or user ids need a hash map from label to neighbours (example 2) or a first pass that maps each label to an index.
- **Directed input treated as undirected (or the reverse).** Adding the reverse edge for a directed graph silently changes every answer, so confirm the direction before you code.

## Common Pitfalls

- **\`map[key]\` when you only meant to look.** \`operator[]\` inserts a default entry for a missing key; use \`count\`, \`find\` or \`at\` to read without inserting.
- **Forgetting the reverse edge.** For an undirected graph push \`v\` into \`adj[u]\` *and* \`u\` into \`adj[v]\`.
- **Out-of-range vertex ids.** \`adj[u]\` does no bounds check; an id equal to n is undefined behaviour, not an exception. Validate input or use \`.at()\`.
- **Iterator invalidation.** Holding a reference into \`adj[u]\` and then calling \`adj[u].push_back(...)\` can reallocate the vector and leave the reference dangling.
- **A matrix for a big sparse graph.** \`std::vector<std::vector<int>>(100000, std::vector<int>(100000))\` is 40 GB of ints and throws \`std::bad_alloc\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A graph is a set of vertices plus a set of edges between pairs of them; edges may be directed and may carry weights.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Default storage:</strong> <span style="color:#f0e2c8;">An adjacency list: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;std::vector&lt;int&gt;&gt; adj(n)</code>, push both directions for undirected edges. O(V + E) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Alternative:</strong> <span style="color:#f0e2c8;">An adjacency matrix gives O(1) edge checks but costs O(V²) space — only for small or dense graphs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Implicit graphs:</strong> <span style="color:#f0e2c8;">Grids and word puzzles are graphs too; compute neighbours from a direction array instead of storing edges.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::pair</code> for weighted edges, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::unordered_map</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::map</code> for named vertices, and watch for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> inserting keys.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the adjacency list the default?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Traversals ask for the neighbours of each vertex, and the list gives exactly those in O(deg) time, for O(V + E) total space. A matrix makes the same traversal O(V²).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you pick a matrix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the graph is small or dense and you check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">matrix[u][v]</code> very often, for example Floyd–Warshall all-pairs shortest paths.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you store a weighted graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;std::vector&lt;std::pair&lt;int, int&gt;&gt;&gt;</code> holding (neighbour, weight), or an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> matrix with a large sentinel for no edge.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::vector&lt;bool&gt;</code> everywhere?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a bit-packed specialisation: small, but elements are proxy objects, so you cannot take a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool&amp;</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool*</code> to one. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;char&gt;</code> behaves like a normal array of bytes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::map</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::unordered_map</code> for named vertices?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> gives average O(1) lookups; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map</code> gives O(log n) lookups but keeps keys sorted, which is useful when output order matters.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Vertex (node)** | One of the things in a graph, usually numbered 0 to n − 1 |
| **Edge** | A connection (u, v) between two vertices |
| **Undirected vs directed graph** | Edges work both ways vs one way only |
| **Weighted graph** | Every edge carries a number such as a distance or cost |
| **Degree** | Number of edges touching a vertex (in-degree and out-degree when directed) |
| **Path and cycle** | A walk along edges; a cycle returns to its start |
| **Connected graph** | Every vertex can reach every other; otherwise it splits into components |
| **Adjacency list** | Per-vertex list of neighbours; O(V + E) space |
| **Adjacency matrix** | V × V table of edges; O(V²) space, O(1) edge check |
| **Edge list** | Plain list of (u, v) pairs; O(E) space |
| **Implicit graph** | Edges computed by a rule (grid moves) instead of stored |
| **Sparse vs dense graph** | E close to V vs E close to V² |
| **Value-initialisation** | \`std::vector<T>(n)\` fills n elements with T's default: 0 for ints, empty for vectors |

---
**Conclusion:** In C++ a graph is usually \`std::vector<std::vector<int>> adj(n)\`, filled from the edge list in both directions for undirected edges — O(V + E) space, contiguous neighbour storage and direct access to each vertex's neighbours. Use a matrix only for small dense graphs, \`std::pair\` for weights, a \`std::map\` or \`std::unordered_map\` for named vertices, and remember that \`operator[]\` inserts and does no bounds checking. Next, see how to walk a graph in [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs), and use it to [count islands in a grid](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) or [count connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph).`,
        examples: [
          {
            label: "One graph, three representations: edge list, adjacency list, matrix",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); ++i) {
        if (i) s += ", ";
        s += std::to_string(xs[i]);
    }
    return s + "]";
}

int main() {
    const int n = 6;
    std::vector<std::pair<int, int>> edges = {{0, 1}, {0, 2}, {1, 2}, {1, 3}, {3, 4}}; // node 5 has no edges

    // 1. Adjacency list: one vector<int> of neighbours per node
    std::vector<std::vector<int>> adj(n);
    for (auto [u, v] : edges) {
        adj[u].push_back(v);
        adj[v].push_back(u);
    }

    // 2. Adjacency matrix: n x n grid of 0/1, symmetric for an undirected graph
    std::vector<std::vector<int>> matrix(n, std::vector<int>(n, 0));
    for (auto [u, v] : edges) {
        matrix[u][v] = 1;
        matrix[v][u] = 1;
    }

    std::cout << "nodes: " << n << ", edges: " << edges.size() << "\\n";
    std::cout << "edge list: [";
    for (size_t i = 0; i < edges.size(); ++i)
        std::cout << (i ? ", " : "") << "(" << edges[i].first << ", " << edges[i].second << ")";
    std::cout << "]\\n";
    std::cout << "adjacency list:\\n";
    for (int u = 0; u < n; ++u) std::cout << "  " << u << " -> " << fmt(adj[u]) << "\\n";
    std::cout << "adjacency matrix:\\n";
    for (const auto& row : matrix) {
        std::cout << " ";
        for (int cell : row) std::cout << " " << cell;
        std::cout << "\\n";
    }

    std::cout << std::boolalpha;
    for (auto [u, v] : std::vector<std::pair<int, int>>{{1, 3}, {0, 4}}) {
        bool inList = std::find(adj[u].begin(), adj[u].end(), v) != adj[u].end(); // O(degree)
        bool inMatrix = matrix[u][v] == 1;                                         // O(1)
        std::cout << "edge " << u << "-" << v << "? list: " << inList << ", matrix: " << inMatrix << "\\n";
    }

    std::cout << "degree of 1: " << adj[1].size() << "\\n";
    size_t total = 0;
    for (const auto& nbrs : adj) total += nbrs.size();
    std::cout << "sum of degrees: " << total << " = 2 x " << edges.size() << " edges\\n";
}`,
          },
          {
            label: "Weighted directed graph, sparse-graph space, implicit grid graph",
            code: `#include <cstdio>
#include <iostream>
#include <map>
#include <string>
#include <utility>
#include <vector>

const int ROWS = 3, COLS = 4;
const int DIRS[4][2] = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}}; // up, down, left, right

std::vector<std::string> gridNeighbours(int r, int c) {
    std::vector<std::string> out;
    for (const auto& d : DIRS) {
        int nr = r + d[0], nc = c + d[1];
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS)
            out.push_back("(" + std::to_string(nr) + "," + std::to_string(nc) + ")");
    }
    return out;
}

std::string join(const std::vector<std::string>& parts) {
    std::string s;
    for (size_t i = 0; i < parts.size(); ++i) s += (i ? ", " : "") + parts[i];
    return s;
}

int main() {
    // Part 1: a directed, weighted graph (flight costs). std::map keeps keys sorted.
    struct Flight { std::string from, to; int cost; };
    std::vector<Flight> flights = {{"A", "B", 5}, {"A", "C", 2}, {"C", "B", 1}, {"B", "D", 4}, {"C", "D", 7}};
    std::map<std::string, std::vector<std::pair<std::string, int>>> graph;
    std::map<std::string, int> inDegree;
    for (const auto& f : flights) {
        graph[f.from].push_back({f.to, f.cost});
        graph[f.to];          // operator[] inserts an empty list, so sinks like D appear
        inDegree[f.to]++;
    }
    std::cout << "directed weighted graph:\\n";
    for (const auto& [u, out] : graph) {
        std::vector<std::string> parts;
        for (const auto& [v, w] : out) parts.push_back(v + ":" + std::to_string(w));
        int in = inDegree.count(u) ? inDegree.at(u) : 0;
        std::cout << "  " << u << " -> [" << join(parts) << "]  out=" << out.size() << " in=" << in << "\\n";
    }

    // Part 2: a sparse graph - how much space does each representation need?
    const int n = 1000;
    int edgeCount = 0;
    std::vector<std::vector<int>> adj(n);
    for (int i = 0; i < n; ++i) {
        for (int step : {1, 2, 5}) { // every node links to the nodes 1, 2 and 5 ahead (wrapping)
            int j = (i + step) % n;
            adj[i].push_back(j);
            adj[j].push_back(i);
            ++edgeCount;
        }
    }
    long long listEntries = 0;
    for (const auto& a : adj) listEntries += a.size();
    long long matrixCells = 1LL * n * n;
    std::cout << "sparse graph: n = " << n << ", edges = " << edgeCount << "\\n";
    std::cout << "  adjacency list entries: " << listEntries << "\\n";
    std::cout << "  adjacency matrix cells: " << matrixCells << "\\n";
    char pct[32];
    std::snprintf(pct, sizeof pct, "%.2f", 100.0 * listEntries / matrixCells);
    std::cout << "  matrix cells holding an edge: " << pct << "%\\n";

    // Part 3: a grid is a graph you never build - neighbours are computed
    std::cout << "implicit grid graph " << ROWS << " x " << COLS << ":\\n";
    for (auto [r, c] : std::vector<std::pair<int, int>>{{1, 1}, {0, 0}, {2, 3}})
        std::cout << "  (" << r << "," << c << ") -> [" << join(gridNeighbours(r, c)) << "]\\n";
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between BFS and DFS?",
    difficulty: "medium",
    seoDescription: "BFS vs DFS: queue vs stack, visit order, shortest paths, memory and when to use each, with verified Python, JavaScript, Java and C++ code.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Explain the difference between breadth-first search and depth-first search on a graph. Then implement both in Python and tell me when you would choose one over the other."

**What a strong answer should cover:**
- The one structural difference: BFS uses a FIFO queue, DFS uses a LIFO stack (or recursion).
- Visit order: BFS goes level by level, DFS goes deep then backtracks; both need a visited set for cycles.
- Both are O(V + E) time; memory is the widest level for BFS and the deepest path for DFS.
- BFS gives shortest paths in unweighted graphs; DFS does not. Typical uses of each (topological sort, cycle detection, backtracking vs nearest/minimum steps).
- Python details: \`collections.deque\` with \`popleft()\` (not \`list.pop(0)\`), and the default recursion limit of 1000 that breaks recursive DFS on deep graphs.

**Code / implementation expected:** Yes — BFS with \`deque\` and DFS both recursively and with a list used as a stack, in Python.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a graph and an adjacency list are  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You have lost your cat somewhere in a big old house. Two friends offer to help, and they search in completely different styles.

**Friend one** stands in the hallway and checks every room that opens off the hallway first. Only when all of those are done does she check the rooms that open off *those* rooms, and so on, spreading outwards like a ripple on a pond. If the cat is two doors away, she finds it after checking only the nearby rooms — and she can tell you it was exactly two doors away.

**Friend two** picks one door, walks through, picks a door in that room, walks through again, and keeps going deeper until she hits a dead end. Then she walks back to the last room that still had an unopened door and tries that one. She carries a piece of chalk to mark rooms she has already searched so she never loops forever.

Friend one is **breadth-first search (BFS)**. Friend two is **depth-first search (DFS)**. Both will search the whole house and both take about the same total effort. The difference is the *order* they visit rooms in — and that order decides which problems each one is good at.

## 2. The Core Distinction: Queue vs Stack

Both searches keep a set of rooms they have discovered but not finished yet — the **frontier** — and a set of rooms already marked with chalk. The *only* thing that changes between BFS and DFS is which frontier room you take next:

- BFS takes the room that was discovered **earliest**. That is a queue: first in, first out.
- DFS takes the room that was discovered **latest**. That is a stack: last in, first out. A recursive function gives you this stack for free, because each call waits for the deeper calls to finish.

(If queues and stacks are new, see [the difference between a stack and a queue](/interview-question/what-is-the-difference-between-a-stack-and-a-queue).)

📌 **Interview term: Graph traversal** — visiting every vertex reachable from a start vertex exactly once, following edges.

📌 **Interview term: Breadth-first search (BFS)** — a traversal that visits vertices in order of their distance (number of edges) from the start, using a FIFO queue.

📌 **Interview term: Depth-first search (DFS)** — a traversal that follows one path as deep as it can before backtracking, using a LIFO stack or recursion.

📌 **Interview term: Frontier** — the vertices that have been discovered but not yet processed — the queue in BFS, the stack in DFS.

📌 **Interview term: Visited set** — the record of vertices already discovered, so that cycles do not make the search loop forever and no vertex is processed twice.

Here is the six-vertex graph that example 1 explores, starting from 0. The numbers under each vertex are the order BFS visits them in:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="BFS on a six vertex graph visits vertex 0, then 1 and 2 at level 1, then 3, 4 and 5 at level 2">
  <path class="d-edge-accent" d="M 370 50 L 250 140"/>
  <path class="d-edge-accent" d="M 370 50 L 490 140"/>
  <path class="d-edge-accent" d="M 250 140 L 170 230"/>
  <path class="d-edge-accent" d="M 250 140 L 330 230"/>
  <path class="d-edge-accent" d="M 490 140 L 490 230"/>
  <path class="d-edge-dashed" d="M 330 230 L 490 230"/>
  <circle class="d-box-accent" cx="370" cy="50" r="22"/>
  <text class="d-text" x="370" y="55" text-anchor="middle">0</text>
  <circle class="d-box" cx="250" cy="140" r="22"/>
  <text class="d-text" x="250" y="145" text-anchor="middle">1</text>
  <circle class="d-box" cx="490" cy="140" r="22"/>
  <text class="d-text" x="490" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="170" cy="230" r="22"/>
  <text class="d-text" x="170" y="235" text-anchor="middle">3</text>
  <circle class="d-box" cx="330" cy="230" r="22"/>
  <text class="d-text" x="330" y="235" text-anchor="middle">4</text>
  <circle class="d-box" cx="490" cy="230" r="22"/>
  <text class="d-text" x="490" y="235" text-anchor="middle">5</text>
  <text class="d-sub" x="30" y="55">level 0</text>
  <text class="d-sub" x="30" y="145">level 1</text>
  <text class="d-sub" x="30" y="235">level 2</text>
  <text class="d-sub d-accent" x="370" y="18" text-anchor="middle">visit 1</text>
  <text class="d-sub d-accent" x="218" y="118" text-anchor="end">visit 2</text>
  <text class="d-sub d-accent" x="522" y="118">visit 3</text>
  <text class="d-sub d-accent" x="170" y="280" text-anchor="middle">visit 4</text>
  <text class="d-sub d-accent" x="330" y="280" text-anchor="middle">visit 5</text>
  <text class="d-sub d-accent" x="490" y="280" text-anchor="middle">visit 6</text>
</svg>

BFS finishes level 1 (vertices 1 and 2) before it touches level 2. The solid edges are the ones BFS used to discover each vertex; the dashed edge 4–5 was looked at but led to a vertex already found.

Now the same graph with DFS. It goes 0 → 1 → 3, hits a dead end at 3, backs up to 1, goes 1 → 4 → 5 → 2, and only then is everything visited:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="DFS on the same graph visits 0, 1, 3, then backtracks and visits 4, 5 and finally 2">
  <path class="d-edge-accent" d="M 370 50 L 250 140"/>
  <path class="d-edge-dashed" d="M 370 50 L 490 140"/>
  <path class="d-edge-accent" d="M 250 140 L 170 230"/>
  <path class="d-edge-accent" d="M 250 140 L 330 230"/>
  <path class="d-edge-accent" d="M 490 140 L 490 230"/>
  <path class="d-edge-accent" d="M 330 230 L 490 230"/>
  <circle class="d-box-accent" cx="370" cy="50" r="22"/>
  <text class="d-text" x="370" y="55" text-anchor="middle">0</text>
  <circle class="d-box" cx="250" cy="140" r="22"/>
  <text class="d-text" x="250" y="145" text-anchor="middle">1</text>
  <circle class="d-box" cx="490" cy="140" r="22"/>
  <text class="d-text" x="490" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="170" cy="230" r="22"/>
  <text class="d-text" x="170" y="235" text-anchor="middle">3</text>
  <circle class="d-box" cx="330" cy="230" r="22"/>
  <text class="d-text" x="330" y="235" text-anchor="middle">4</text>
  <circle class="d-box" cx="490" cy="230" r="22"/>
  <text class="d-text" x="490" y="235" text-anchor="middle">5</text>
  <text class="d-sub d-accent" x="370" y="18" text-anchor="middle">visit 1</text>
  <text class="d-sub d-accent" x="218" y="118" text-anchor="end">visit 2</text>
  <text class="d-sub d-accent" x="522" y="118">visit 6</text>
  <text class="d-sub d-accent" x="170" y="280" text-anchor="middle">visit 3</text>
  <text class="d-sub d-accent" x="330" y="280" text-anchor="middle">visit 4</text>
  <text class="d-sub d-accent" x="490" y="280" text-anchor="middle">visit 5</text>
</svg>

DFS reaches vertex 2 last, through the long way round (0 → 1 → 4 → 5 → 2), even though 2 is a direct neighbour of 0. That is exactly why DFS cannot be used for shortest paths: the first route it finds is not necessarily the shortest one.

The frontier itself is the whole difference. The same three waiting vertices are served in opposite orders:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="A queue serves the oldest waiting vertex first. A stack serves the newest waiting vertex first">
  <defs>
    <marker id="b21q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="65">queue</text>
  <path class="d-edge-accent" d="M 148 60 L 100 60" marker-end="url(#b21q2-arrow)"/>
  <text class="d-sub" x="124" y="38" text-anchor="middle">out</text>
  <rect class="d-box-accent" x="150" y="40" width="60" height="40" rx="6"/>
  <text class="d-text" x="180" y="65" text-anchor="middle">3</text>
  <rect class="d-box" x="220" y="40" width="60" height="40" rx="6"/>
  <text class="d-text" x="250" y="65" text-anchor="middle">4</text>
  <rect class="d-box" x="290" y="40" width="60" height="40" rx="6"/>
  <text class="d-text" x="320" y="65" text-anchor="middle">5</text>
  <path class="d-edge" d="M 430 60 L 356 60" marker-end="url(#b21q2-arrow)"/>
  <text class="d-sub" x="393" y="38" text-anchor="middle">in</text>
  <text class="d-sub" x="180" y="104" text-anchor="middle">front</text>
  <text class="d-sub" x="320" y="104" text-anchor="middle">back</text>
  <text class="d-sub" x="520" y="65" text-anchor="middle">BFS: oldest first</text>
  <text class="d-text" x="20" y="175">stack</text>
  <rect class="d-box" x="150" y="150" width="60" height="40" rx="6"/>
  <text class="d-text" x="180" y="175" text-anchor="middle">3</text>
  <rect class="d-box" x="220" y="150" width="60" height="40" rx="6"/>
  <text class="d-text" x="250" y="175" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="290" y="150" width="60" height="40" rx="6"/>
  <text class="d-text" x="320" y="175" text-anchor="middle">5</text>
  <path class="d-edge" d="M 430 160 L 356 160" marker-end="url(#b21q2-arrow)"/>
  <path class="d-edge-accent" d="M 354 182 L 428 182" marker-end="url(#b21q2-arrow)"/>
  <text class="d-sub" x="440" y="164">push</text>
  <text class="d-sub" x="440" y="190">pop</text>
  <text class="d-sub" x="180" y="214" text-anchor="middle">bottom</text>
  <text class="d-sub" x="320" y="214" text-anchor="middle">top</text>
  <text class="d-sub" x="560" y="175" text-anchor="middle">DFS: newest first</text>
</svg>

## 3. Side by Side

| | BFS | DFS |
| :--- | :--- | :--- |
| Frontier | queue (FIFO) | stack (LIFO) or recursion |
| Visit order | by distance from the start, level by level | one branch to the bottom, then backtrack |
| Shortest path (unweighted) | **yes** — the first time BFS reaches a vertex is by a shortest path | no — the first path found can be long |
| Time | O(V + E) | O(V + E) |
| Extra memory | the widest level of the graph | the deepest path of the graph |
| Typical uses | shortest path in steps, level-order, nearest X, multi-source spread | cycle detection, topological sort, backtracking, connected components, path existence |

📌 **Interview term: Shortest path in an unweighted graph** — the route with the fewest edges. BFS finds it because it reaches every vertex at distance d before any vertex at distance d + 1.

📌 **Interview term: Backtracking** — undoing the last step and trying the next option when a path cannot go further — the natural behaviour of DFS.

Both are O(V + E): every vertex enters the frontier once and every edge is examined once from each end (see [Big-O notation](/interview-question/what-is-big-o-notation)). The difference in **memory** is real and depends on the shape of the graph — example 2 measures it:

| Graph shape (1,000-ish vertices) | BFS queue peak | DFS depth peak |
| :--- | :--- | :--- |
| complete binary tree, 1,023 vertices | 512 | 10 |
| path (a line), 1,000 vertices | 1 | 1,000 |
| star (one hub + 999 leaves) | 999 | 2 |

A wide, shallow graph makes BFS hold a lot; a long, thin graph makes DFS go deep. On a line of 1,000 vertices the DFS depth is 1,000, which matters a lot when the "stack" is the language's call stack (see section 9 and [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)).

## 4. The Code in Python

BFS with \`collections.deque\`, recording each vertex's distance from the start:

~~~python
def bfs(adj, start):
    """Visit in waves: everything 1 edge away, then 2 edges away, ..."""
    dist = {start: 0}
    order = []
    queue = deque([start])          # FIFO: popleft() is O(1) on a deque
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in adj[u]:
            if v not in dist:       # mark when ENQUEUED, so no node is queued twice
                dist[v] = dist[u] + 1
                queue.append(v)
    return order, dist
~~~

And DFS, first recursive, then with an explicit stack:

~~~python
def dfs_recursive(adj, u, seen, order):
    """Go as deep as possible before backing up."""
    seen.add(u)
    order.append(u)
    for v in adj[u]:
        if v not in seen:
            dfs_recursive(adj, v, seen, order)
    return order


def dfs_iterative(adj, start, reverse_push):
    """Same idea with an explicit stack (LIFO) instead of the call stack."""
    seen, order, stack = set(), [], [start]
    while stack:
        u = stack.pop()
        if u in seen:
            continue                # a node can sit on the stack twice; skip repeats
        seen.add(u)
        order.append(u)
        nbrs = reversed(adj[u]) if reverse_push else adj[u]
        for v in nbrs:
            if v not in seen:
                stack.append(v)
    return order
~~~

**What to point out in this code:**

- \`deque.popleft()\` removes from the front in O(1). \`list.pop(0)\` gives the same result but shifts every remaining element, which is O(n) per call — the Python docs say deques support appends and pops from either side "with approximately the same O(1) performance in either direction" while lists "incur O(n) memory movement costs for pop(0)" ([collections.deque](https://docs.python.org/3/library/collections.html#collections.deque)).
- \`dist\` doubles as the visited set: a vertex is in \`dist\` exactly when it has been discovered. Marking at enqueue time guarantees each vertex is queued once.
- A plain \`list\` is already a good stack: \`append\` and \`pop()\` both work on the end in O(1).
- In the iterative DFS, a vertex can be pushed twice (two neighbours discover it before it is popped), so we check \`if u in seen: continue\` after popping. That is what makes it match the recursive version.
- \`reversed(adj[u])\` makes the stack pop neighbours in their natural order, giving the same visit order as recursion.
- The recursive version uses Python's call stack. Python allows only 1000 frames by default (\`sys.getrecursionlimit()\` printed 1000 in our run), so it fails on deep graphs — see section 9.

📌 **Interview term: Deque** — a double-ended queue: O(1) adds and removes at both ends. In Python, \`collections.deque\`.

## 5. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 builds a complete binary tree, a path and a star, and measures the largest BFS queue and the deepest DFS path with an explicit stack.

**Example 1 — BFS, recursive DFS and stack DFS on the same graph** prints:

~~~text
BFS order:             [0, 1, 2, 3, 4, 5]
BFS distance from 0:   [0, 1, 1, 2, 2, 2]
DFS recursive:         [0, 1, 3, 4, 5, 2]
DFS stack, push order: [0, 2, 5, 4, 1, 3]
DFS stack, reversed:   [0, 1, 3, 4, 5, 2]
~~~

**Example 2 — shortest path, and how much memory each search needs on three graph shapes** prints:

~~~text
BFS path 0 to 5: 0 -> 2 -> 5
DFS path 0 to 5: 0 -> 1 -> 4 -> 5
complete binary tree, 1023 nodes: BFS queue peak 512, DFS depth peak 10
path (a line), 1000 nodes: BFS queue peak 1, DFS depth peak 1000
star (hub + 999 leaves): BFS queue peak 999, DFS depth peak 2
~~~

## 6. Which One Should You Use?

- **"Fewest steps / minimum moves / nearest"** in an unweighted graph or grid → **BFS**. It is the reason BFS exists: [Rotting Oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs) (multi-source BFS) and the [word ladder](/interview-question/how-do-you-solve-the-word-ladder-problem) are both BFS shortest-path problems. With edge weights you need [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) instead — see [when BFS is enough](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths).
- **"Visit everything / count groups / is it connected"** → **either**. Number of islands and connected components work with both; DFS is usually shorter to write ([number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid), [connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph)).
- **"Does a cycle exist / what order respects the dependencies"** in a directed graph → **DFS** with three colours, or Kahn's BFS-based algorithm for topological order ([cycle detection](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph), [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used)).
- **"Try all possibilities / generate all paths"** → **DFS** (backtracking), because it only holds the current path in memory.
- **Copying or two-colouring a graph** → either; see [clone a graph](/interview-question/how-do-you-clone-a-graph) and [bipartite check](/interview-question/how-do-you-check-if-a-graph-is-bipartite).
- **Trees** are graphs without cycles: level-order traversal is BFS ([level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree)), and preorder/inorder/postorder are DFS ([tree traversal methods](/interview-question/what-are-the-tree-traversal-methods)).

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| BFS with \`deque\` | O(V + E) | O(V) | each vertex enqueued once, each adjacency list scanned once |
| DFS recursive | O(V + E) | O(V) call frames | depth can reach V on a path; limited to about 1000 frames by default |
| DFS with a list stack | O(V + E) | O(V + E) | a vertex may be pushed once per neighbour that sees it unvisited |
| BFS with \`list.pop(0)\` | O(V² + E) | O(V) | each \`pop(0)\` shifts the whole list |

## 8. Edge Cases

- **Disconnected graph.** One BFS or DFS from vertex 0 only visits 0's component. To visit everything, loop over all vertices and start a new search from each unvisited one — that loop is exactly how you count components.
- **Cycles.** Without a visited set, both searches loop forever on the triangle 0–1–4–5–2–0 in the example. Mark vertices as visited.
- **Mark on enqueue, not on dequeue (BFS).** If you mark a vertex only when it leaves the queue, the same vertex can be queued many times (once per neighbour that discovers it). The answer stays right but memory and time blow up on dense graphs.
- **The iterative-DFS order surprise.** Pushing neighbours in their natural order makes the stack pop the *last* neighbour first, so example 1 prints \`[0, 2, 5, 4, 1, 3]\` for the stack version and \`[0, 1, 3, 4, 5, 2]\` for recursion. Push in reverse if you need the recursive order. Both are valid DFS orders.
- **Very deep graphs.** Recursive DFS on a long path uses one call-stack frame per vertex; section 9 shows where each language runs out.

## 9. How Deep Can Recursive DFS Go in Python?

We ran the recursive DFS from example 1 on a path graph (a straight line of vertices) in our sandbox: a 990-vertex path worked, a **1,000-vertex path raised \`RecursionError: maximum recursion depth exceeded\`**. The limit is a safety setting, not your machine's memory — \`sys.getrecursionlimit()\` returns 1000 by default. You can raise it with \`sys.setrecursionlimit\`, but very deep recursion can then crash the interpreter itself, so the robust interview answer is: **use the explicit-stack version for anything that may be deep.** Example 2 measures the stack depth with exactly such an explicit stack.

## Common Pitfalls

- **\`queue.pop(0)\` on a list.** Correct output, but O(n) per pop; on a big BFS it turns O(V + E) into roughly O(V²). Use \`collections.deque\`.
- **Marking visited when dequeuing in BFS.** Vertices get queued several times. Mark (or set \`dist[v]\`) at the moment you enqueue.
- **Recursive DFS on a deep graph.** A 1,000-vertex path already hits the default recursion limit; use an explicit stack.
- **Using a mutable default argument for \`seen\`.** \`def dfs(u, seen=set())\` shares one set across calls to the function, so a second traversal sees everything as visited. Pass it in or create it inside.
- **Claiming DFS finds shortest paths.** Example 2 shows DFS returning 0 → 1 → 4 → 5 while BFS returns 0 → 2 → 5.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The difference:</strong> <span style="color:#f0e2c8;">BFS takes the oldest discovered vertex next (a queue), DFS takes the newest (a stack or recursion).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Visit order:</strong> <span style="color:#f0e2c8;">BFS goes level by level from the start; DFS follows one branch to the end and backtracks.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">Both O(V + E) time. Memory: BFS holds the widest level, DFS holds the deepest path.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When to use:</strong> <span style="color:#f0e2c8;">BFS for fewest steps in an unweighted graph; DFS for cycles, topological sort, backtracking; either for components.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popleft()</code> for BFS; avoid recursive DFS on deep inputs because the default limit is 1000 frames.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does BFS give the shortest path?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It processes all vertices at distance d before any at distance d + 1, so the first time it reaches a vertex, no shorter route exists. Store a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> dict to rebuild the path.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use a list as the BFS queue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.pop(0)</code> shifts every element, O(n) per call. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque.popleft()</code> is O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your recursive DFS crashed on a big input. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Python stops at about 1000 nested calls (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RecursionError</code>). Rewrite with an explicit list as the stack, or raise the limit with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.setrecursionlimit</code> knowing it risks a hard crash.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if edges have weights?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Plain BFS no longer gives shortest paths; use Dijkstra with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code>, or 0-1 BFS with a deque when weights are only 0 and 1.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does your stack DFS print a different order from the recursive one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The stack pops the last pushed neighbour first. Push neighbours in reverse (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reversed(adj[u])</code>) to get the recursive order; both are valid DFS orders.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Graph traversal** | Visiting every reachable vertex once by following edges |
| **Breadth-first search (BFS)** | Visits vertices in order of distance using a FIFO queue |
| **Depth-first search (DFS)** | Goes deep along one path, then backtracks; LIFO stack or recursion |
| **Frontier** | Discovered but unprocessed vertices: the queue or the stack |
| **Visited set** | Record of discovered vertices that stops loops and repeats |
| **Shortest path in an unweighted graph** | Route with the fewest edges; BFS finds it |
| **Backtracking** | Undo the last step and try the next option |
| **Deque** | Double-ended queue with O(1) operations at both ends (\`collections.deque\`) |

---
**Conclusion:** In Python, BFS is a \`collections.deque\` loop that marks vertices when they are enqueued, and DFS is either a short recursive function or a \`list\` used as a stack. Both are O(V + E); BFS visits by distance and gives shortest paths in unweighted graphs, DFS dives deep and backtracks, which suits cycles, ordering and backtracking. Know the two Python traps — \`list.pop(0)\` makes BFS quadratic, and recursion stops at about 1000 frames. Next, put both to work on [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) and [connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph), or compare them with Union-Find in [islands with DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).`,
        examples: [
          {
            label: "BFS order and distances vs recursive and stack-based DFS",
            code: `from collections import deque


def build(n, edges):
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    return adj


def bfs(adj, start):
    """Visit in waves: everything 1 edge away, then 2 edges away, ..."""
    dist = {start: 0}
    order = []
    queue = deque([start])          # FIFO: popleft() is O(1) on a deque
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in adj[u]:
            if v not in dist:       # mark when ENQUEUED, so no node is queued twice
                dist[v] = dist[u] + 1
                queue.append(v)
    return order, dist


def dfs_recursive(adj, u, seen, order):
    """Go as deep as possible before backing up."""
    seen.add(u)
    order.append(u)
    for v in adj[u]:
        if v not in seen:
            dfs_recursive(adj, v, seen, order)
    return order


def dfs_iterative(adj, start, reverse_push):
    """Same idea with an explicit stack (LIFO) instead of the call stack."""
    seen, order, stack = set(), [], [start]
    while stack:
        u = stack.pop()
        if u in seen:
            continue                # a node can sit on the stack twice; skip repeats
        seen.add(u)
        order.append(u)
        nbrs = reversed(adj[u]) if reverse_push else adj[u]
        for v in nbrs:
            if v not in seen:
                stack.append(v)
    return order


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


adj = build(6, [(0, 1), (0, 2), (1, 3), (1, 4), (2, 5), (4, 5)])
order, dist = bfs(adj, 0)
print("BFS order:             " + fmt(order))
print("BFS distance from 0:   " + fmt([dist[v] for v in range(6)]))
print("DFS recursive:         " + fmt(dfs_recursive(adj, 0, set(), [])))
print("DFS stack, push order: " + fmt(dfs_iterative(adj, 0, False)))
print("DFS stack, reversed:   " + fmt(dfs_iterative(adj, 0, True)))`,
          },
          {
            label: "BFS vs DFS paths, and queue size vs stack depth on three graph shapes",
            code: `from collections import deque


def build(n, edges):
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    return adj


def path_to(parent, target):
    path = []
    while target != -1:
        path.append(target)
        target = parent[target]
    return " -> ".join(str(x) for x in reversed(path))


def bfs_path(adj, s, t):
    parent = [-1] * len(adj)
    seen = [False] * len(adj)
    seen[s] = True
    queue = deque([s])
    while queue:
        u = queue.popleft()
        if u == t:
            break
        for v in adj[u]:
            if not seen[v]:
                seen[v] = True
                parent[v] = u
                queue.append(v)
    return path_to(parent, t)


def dfs_path(adj, s, t):
    parent = [-1] * len(adj)
    seen = [False] * len(adj)

    def go(u):
        seen[u] = True
        if u == t:
            return True
        for v in adj[u]:
            if not seen[v]:
                parent[v] = u
                if go(v):
                    return True
        return False

    go(s)
    return path_to(parent, t)


def bfs_max_queue(adj, s):
    """Largest number of nodes waiting in the BFS queue at one time."""
    seen = [False] * len(adj)
    seen[s] = True
    queue, peak = deque([s]), 1
    while queue:
        u = queue.popleft()
        for v in adj[u]:
            if not seen[v]:
                seen[v] = True
                queue.append(v)
        peak = max(peak, len(queue))
    return peak


def dfs_max_depth(adj, s):
    """Deepest DFS path: an explicit stack of (node, next neighbour index) that
    behaves exactly like the recursive version's call stack."""
    seen = [False] * len(adj)
    seen[s] = True
    stack, peak = [[s, 0]], 1
    while stack:
        top = stack[-1]
        u, i = top
        if i < len(adj[u]):
            top[1] += 1
            v = adj[u][i]
            if not seen[v]:
                seen[v] = True
                stack.append([v, 0])
                peak = max(peak, len(stack))
        else:
            stack.pop()
    return peak


g = build(6, [(0, 1), (0, 2), (1, 3), (1, 4), (2, 5), (4, 5)])
print("BFS path 0 to 5: " + bfs_path(g, 0, 5))
print("DFS path 0 to 5: " + dfs_path(g, 0, 5))

shapes = [
    ("complete binary tree, 1023 nodes", 1023, [(i, c) for i in range(1023) for c in (2 * i + 1, 2 * i + 2) if c < 1023]),
    ("path (a line), 1000 nodes", 1000, [(i, i + 1) for i in range(999)]),
    ("star (hub + 999 leaves)", 1000, [(0, i) for i in range(1, 1000)]),
]
for name, n, edges in shapes:
    adj = build(n, edges)
    print(name + ": BFS queue peak " + str(bfs_max_queue(adj, 0)) + ", DFS depth peak " + str(dfs_max_depth(adj, 0)))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Explain the difference between breadth-first search and depth-first search on a graph. Then implement both in JavaScript and tell me when you would choose one over the other."

**What a strong answer should cover:**
- The one structural difference: BFS uses a FIFO queue, DFS uses a LIFO stack (or recursion).
- Visit order: BFS goes level by level, DFS goes deep then backtracks; both need a visited set for cycles.
- Both are O(V + E) time; memory is the widest level for BFS and the deepest path for DFS.
- BFS gives shortest paths in unweighted graphs; DFS does not. Typical uses of each.
- JavaScript details: there is no built-in queue — \`Array.prototype.shift()\` re-indexes the array, so use a head index; recursion depth is limited and throws \`RangeError: Maximum call stack size exceeded\`.

**Code / implementation expected:** Yes — BFS with an array plus a head pointer, and DFS both recursively and with an array used as a stack, in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a graph and an adjacency list are  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You have lost your cat somewhere in a big old house. Two friends offer to help, and they search in completely different styles.

**Friend one** stands in the hallway and checks every room that opens off the hallway first. Only when all of those are done does she check the rooms that open off *those* rooms, and so on, spreading outwards like a ripple on a pond. If the cat is two doors away, she finds it after checking only the nearby rooms — and she can tell you it was exactly two doors away.

**Friend two** picks one door, walks through, picks a door in that room, walks through again, and keeps going deeper until she hits a dead end. Then she walks back to the last room that still had an unopened door and tries that one. She carries a piece of chalk to mark rooms she has already searched so she never loops forever.

Friend one is **breadth-first search (BFS)**. Friend two is **depth-first search (DFS)**. Both will search the whole house and both take about the same total effort. The difference is the *order* they visit rooms in — and that order decides which problems each one is good at.

## 2. The Core Distinction: Queue vs Stack

Both searches keep a set of rooms they have discovered but not finished yet — the **frontier** — and a set of rooms already marked with chalk. The *only* thing that changes between BFS and DFS is which frontier room you take next:

- BFS takes the room that was discovered **earliest**. That is a queue: first in, first out.
- DFS takes the room that was discovered **latest**. That is a stack: last in, first out. A recursive function gives you this stack for free, because each call waits for the deeper calls to finish.

(If queues and stacks are new, see [the difference between a stack and a queue](/interview-question/what-is-the-difference-between-a-stack-and-a-queue).)

📌 **Interview term: Graph traversal** — visiting every vertex reachable from a start vertex exactly once, following edges.

📌 **Interview term: Breadth-first search (BFS)** — a traversal that visits vertices in order of their distance (number of edges) from the start, using a FIFO queue.

📌 **Interview term: Depth-first search (DFS)** — a traversal that follows one path as deep as it can before backtracking, using a LIFO stack or recursion.

📌 **Interview term: Frontier** — the vertices that have been discovered but not yet processed — the queue in BFS, the stack in DFS.

📌 **Interview term: Visited set** — the record of vertices already discovered, so that cycles do not make the search loop forever and no vertex is processed twice.

Here is the six-vertex graph that example 1 explores, starting from 0. The numbers under each vertex are the order BFS visits them in:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="BFS on a six vertex graph visits vertex 0, then 1 and 2 at level 1, then 3, 4 and 5 at level 2">
  <path class="d-edge-accent" d="M 370 50 L 250 140"/>
  <path class="d-edge-accent" d="M 370 50 L 490 140"/>
  <path class="d-edge-accent" d="M 250 140 L 170 230"/>
  <path class="d-edge-accent" d="M 250 140 L 330 230"/>
  <path class="d-edge-accent" d="M 490 140 L 490 230"/>
  <path class="d-edge-dashed" d="M 330 230 L 490 230"/>
  <circle class="d-box-accent" cx="370" cy="50" r="22"/>
  <text class="d-text" x="370" y="55" text-anchor="middle">0</text>
  <circle class="d-box" cx="250" cy="140" r="22"/>
  <text class="d-text" x="250" y="145" text-anchor="middle">1</text>
  <circle class="d-box" cx="490" cy="140" r="22"/>
  <text class="d-text" x="490" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="170" cy="230" r="22"/>
  <text class="d-text" x="170" y="235" text-anchor="middle">3</text>
  <circle class="d-box" cx="330" cy="230" r="22"/>
  <text class="d-text" x="330" y="235" text-anchor="middle">4</text>
  <circle class="d-box" cx="490" cy="230" r="22"/>
  <text class="d-text" x="490" y="235" text-anchor="middle">5</text>
  <text class="d-sub" x="30" y="55">level 0</text>
  <text class="d-sub" x="30" y="145">level 1</text>
  <text class="d-sub" x="30" y="235">level 2</text>
  <text class="d-sub d-accent" x="370" y="18" text-anchor="middle">visit 1</text>
  <text class="d-sub d-accent" x="218" y="118" text-anchor="end">visit 2</text>
  <text class="d-sub d-accent" x="522" y="118">visit 3</text>
  <text class="d-sub d-accent" x="170" y="280" text-anchor="middle">visit 4</text>
  <text class="d-sub d-accent" x="330" y="280" text-anchor="middle">visit 5</text>
  <text class="d-sub d-accent" x="490" y="280" text-anchor="middle">visit 6</text>
</svg>

BFS finishes level 1 (vertices 1 and 2) before it touches level 2. The solid edges are the ones BFS used to discover each vertex; the dashed edge 4–5 was looked at but led to a vertex already found.

Now the same graph with DFS. It goes 0 → 1 → 3, hits a dead end at 3, backs up to 1, goes 1 → 4 → 5 → 2, and only then is everything visited:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="DFS on the same graph visits 0, 1, 3, then backtracks and visits 4, 5 and finally 2">
  <path class="d-edge-accent" d="M 370 50 L 250 140"/>
  <path class="d-edge-dashed" d="M 370 50 L 490 140"/>
  <path class="d-edge-accent" d="M 250 140 L 170 230"/>
  <path class="d-edge-accent" d="M 250 140 L 330 230"/>
  <path class="d-edge-accent" d="M 490 140 L 490 230"/>
  <path class="d-edge-accent" d="M 330 230 L 490 230"/>
  <circle class="d-box-accent" cx="370" cy="50" r="22"/>
  <text class="d-text" x="370" y="55" text-anchor="middle">0</text>
  <circle class="d-box" cx="250" cy="140" r="22"/>
  <text class="d-text" x="250" y="145" text-anchor="middle">1</text>
  <circle class="d-box" cx="490" cy="140" r="22"/>
  <text class="d-text" x="490" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="170" cy="230" r="22"/>
  <text class="d-text" x="170" y="235" text-anchor="middle">3</text>
  <circle class="d-box" cx="330" cy="230" r="22"/>
  <text class="d-text" x="330" y="235" text-anchor="middle">4</text>
  <circle class="d-box" cx="490" cy="230" r="22"/>
  <text class="d-text" x="490" y="235" text-anchor="middle">5</text>
  <text class="d-sub d-accent" x="370" y="18" text-anchor="middle">visit 1</text>
  <text class="d-sub d-accent" x="218" y="118" text-anchor="end">visit 2</text>
  <text class="d-sub d-accent" x="522" y="118">visit 6</text>
  <text class="d-sub d-accent" x="170" y="280" text-anchor="middle">visit 3</text>
  <text class="d-sub d-accent" x="330" y="280" text-anchor="middle">visit 4</text>
  <text class="d-sub d-accent" x="490" y="280" text-anchor="middle">visit 5</text>
</svg>

DFS reaches vertex 2 last, through the long way round (0 → 1 → 4 → 5 → 2), even though 2 is a direct neighbour of 0. That is exactly why DFS cannot be used for shortest paths: the first route it finds is not necessarily the shortest one.

The frontier itself is the whole difference. The same three waiting vertices are served in opposite orders:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="A queue serves the oldest waiting vertex first. A stack serves the newest waiting vertex first">
  <defs>
    <marker id="b21q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="65">queue</text>
  <path class="d-edge-accent" d="M 148 60 L 100 60" marker-end="url(#b21q2-arrow)"/>
  <text class="d-sub" x="124" y="38" text-anchor="middle">out</text>
  <rect class="d-box-accent" x="150" y="40" width="60" height="40" rx="6"/>
  <text class="d-text" x="180" y="65" text-anchor="middle">3</text>
  <rect class="d-box" x="220" y="40" width="60" height="40" rx="6"/>
  <text class="d-text" x="250" y="65" text-anchor="middle">4</text>
  <rect class="d-box" x="290" y="40" width="60" height="40" rx="6"/>
  <text class="d-text" x="320" y="65" text-anchor="middle">5</text>
  <path class="d-edge" d="M 430 60 L 356 60" marker-end="url(#b21q2-arrow)"/>
  <text class="d-sub" x="393" y="38" text-anchor="middle">in</text>
  <text class="d-sub" x="180" y="104" text-anchor="middle">front</text>
  <text class="d-sub" x="320" y="104" text-anchor="middle">back</text>
  <text class="d-sub" x="520" y="65" text-anchor="middle">BFS: oldest first</text>
  <text class="d-text" x="20" y="175">stack</text>
  <rect class="d-box" x="150" y="150" width="60" height="40" rx="6"/>
  <text class="d-text" x="180" y="175" text-anchor="middle">3</text>
  <rect class="d-box" x="220" y="150" width="60" height="40" rx="6"/>
  <text class="d-text" x="250" y="175" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="290" y="150" width="60" height="40" rx="6"/>
  <text class="d-text" x="320" y="175" text-anchor="middle">5</text>
  <path class="d-edge" d="M 430 160 L 356 160" marker-end="url(#b21q2-arrow)"/>
  <path class="d-edge-accent" d="M 354 182 L 428 182" marker-end="url(#b21q2-arrow)"/>
  <text class="d-sub" x="440" y="164">push</text>
  <text class="d-sub" x="440" y="190">pop</text>
  <text class="d-sub" x="180" y="214" text-anchor="middle">bottom</text>
  <text class="d-sub" x="320" y="214" text-anchor="middle">top</text>
  <text class="d-sub" x="560" y="175" text-anchor="middle">DFS: newest first</text>
</svg>

## 3. Side by Side

| | BFS | DFS |
| :--- | :--- | :--- |
| Frontier | queue (FIFO) | stack (LIFO) or recursion |
| Visit order | by distance from the start, level by level | one branch to the bottom, then backtrack |
| Shortest path (unweighted) | **yes** — the first time BFS reaches a vertex is by a shortest path | no — the first path found can be long |
| Time | O(V + E) | O(V + E) |
| Extra memory | the widest level of the graph | the deepest path of the graph |
| Typical uses | shortest path in steps, level-order, nearest X, multi-source spread | cycle detection, topological sort, backtracking, connected components, path existence |

📌 **Interview term: Shortest path in an unweighted graph** — the route with the fewest edges. BFS finds it because it reaches every vertex at distance d before any vertex at distance d + 1.

📌 **Interview term: Backtracking** — undoing the last step and trying the next option when a path cannot go further — the natural behaviour of DFS.

Both are O(V + E): every vertex enters the frontier once and every edge is examined once from each end (see [Big-O notation](/interview-question/what-is-big-o-notation)). The difference in **memory** is real and depends on the shape of the graph — example 2 measures it:

| Graph shape (1,000-ish vertices) | BFS queue peak | DFS depth peak |
| :--- | :--- | :--- |
| complete binary tree, 1,023 vertices | 512 | 10 |
| path (a line), 1,000 vertices | 1 | 1,000 |
| star (one hub + 999 leaves) | 999 | 2 |

A wide, shallow graph makes BFS hold a lot; a long, thin graph makes DFS go deep. On a line of 1,000 vertices the DFS depth is 1,000, which matters a lot when the "stack" is the language's call stack (see section 9 and [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)).

## 4. The Code in JavaScript

BFS with an array and a read pointer, recording each vertex's distance from the start:

~~~javascript
function bfs(adj, start) {
  // Visit in waves: everything 1 edge away, then 2 edges away, ...
  const dist = new Array(adj.length).fill(-1);
  const order = [];
  const queue = [start];
  let head = 0;                     // read pointer: avoids O(n) Array.shift()
  dist[start] = 0;
  while (head < queue.length) {
    const u = queue[head++];
    order.push(u);
    for (const v of adj[u]) {
      if (dist[v] === -1) {         // mark when ENQUEUED, so no node is queued twice
        dist[v] = dist[u] + 1;
        queue.push(v);
      }
    }
  }
  return { order, dist };
}
~~~

And DFS, first recursive, then with an explicit stack:

~~~javascript
function dfsRecursive(adj, u, seen, order) {
  // Go as deep as possible before backing up.
  seen.add(u);
  order.push(u);
  for (const v of adj[u]) {
    if (!seen.has(v)) dfsRecursive(adj, v, seen, order);
  }
  return order;
}

function dfsIterative(adj, start, reversePush) {
  // Same idea with an explicit stack (LIFO) instead of the call stack.
  const seen = new Set(), order = [], stack = [start];
  while (stack.length > 0) {
    const u = stack.pop();
    if (seen.has(u)) continue;      // a node can sit on the stack twice; skip repeats
    seen.add(u);
    order.push(u);
    const nbrs = reversePush ? [...adj[u]].reverse() : adj[u];
    for (const v of nbrs) {
      if (!seen.has(v)) stack.push(v);
    }
  }
  return order;
}
~~~

**What to point out in this code:**

- JavaScript has no queue class. \`queue.shift()\` works, but it removes index 0 and moves every other element down. In our Node 22 sandbox, draining a 100,000-element array with \`shift()\` took about 0.8 s and a 200,000-element one about 3.4 s — four times longer for twice the size, the signature of O(n) per call. A \`head\` index that only moves forward makes each dequeue O(1).
- \`dist\` doubles as the visited marker (\`-1\` means undiscovered). Marking at enqueue time guarantees each vertex is queued once.
- An array is already a good stack: \`push\` and \`pop\` work on the end in O(1).
- In the iterative DFS a vertex can be pushed twice, so we skip it after popping if \`seen.has(u)\`. That is what makes it match the recursive version.
- \`[...adj[u]].reverse()\` copies before reversing — \`reverse()\` alone would mutate the adjacency list in place and change every later traversal.
- A \`Set\` gives O(1) average \`has\`/\`add\`; for dense integer ids a plain array or \`Uint8Array\` of flags is even cheaper.

📌 **Interview term: Head pointer (queue index)** — an integer that marks the front of a queue stored in an array; dequeuing just increments it, so it is O(1) without moving elements.

## 5. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\` (Node.js 22; the code is plain browser-safe JavaScript, so it also runs in the page). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 builds a complete binary tree, a path and a star, and measures the largest BFS queue and the deepest DFS path with an explicit stack.

**Example 1 — BFS, recursive DFS and stack DFS on the same graph** prints:

~~~text
BFS order:             [0, 1, 2, 3, 4, 5]
BFS distance from 0:   [0, 1, 1, 2, 2, 2]
DFS recursive:         [0, 1, 3, 4, 5, 2]
DFS stack, push order: [0, 2, 5, 4, 1, 3]
DFS stack, reversed:   [0, 1, 3, 4, 5, 2]
~~~

**Example 2 — shortest path, and how much memory each search needs on three graph shapes** prints:

~~~text
BFS path 0 to 5: 0 -> 2 -> 5
DFS path 0 to 5: 0 -> 1 -> 4 -> 5
complete binary tree, 1023 nodes: BFS queue peak 512, DFS depth peak 10
path (a line), 1000 nodes: BFS queue peak 1, DFS depth peak 1000
star (hub + 999 leaves): BFS queue peak 999, DFS depth peak 2
~~~

## 6. Which One Should You Use?

- **"Fewest steps / minimum moves / nearest"** in an unweighted graph or grid → **BFS**. It is the reason BFS exists: [Rotting Oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs) (multi-source BFS) and the [word ladder](/interview-question/how-do-you-solve-the-word-ladder-problem) are both BFS shortest-path problems. With edge weights you need [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) instead — see [when BFS is enough](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths).
- **"Visit everything / count groups / is it connected"** → **either**. Number of islands and connected components work with both; DFS is usually shorter to write ([number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid), [connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph)).
- **"Does a cycle exist / what order respects the dependencies"** in a directed graph → **DFS** with three colours, or Kahn's BFS-based algorithm for topological order ([cycle detection](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph), [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used)).
- **"Try all possibilities / generate all paths"** → **DFS** (backtracking), because it only holds the current path in memory.
- **Copying or two-colouring a graph** → either; see [clone a graph](/interview-question/how-do-you-clone-a-graph) and [bipartite check](/interview-question/how-do-you-check-if-a-graph-is-bipartite).
- **Trees** are graphs without cycles: level-order traversal is BFS ([level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree)), and preorder/inorder/postorder are DFS ([tree traversal methods](/interview-question/what-are-the-tree-traversal-methods)).

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| BFS with a head index | O(V + E) | O(V) | each vertex enqueued once, each adjacency list scanned once |
| DFS recursive | O(V + E) | O(V) call frames | depth can reach V on a path; engine limit around 10^4 frames in Node 22 |
| DFS with an array stack | O(V + E) | O(V + E) | a vertex may be pushed once per neighbour that sees it unvisited |
| BFS with \`shift()\` | up to O(V² + E) | O(V) | each \`shift\` can move the whole array |

## 8. Edge Cases

- **Disconnected graph.** One BFS or DFS from vertex 0 only visits 0's component. To visit everything, loop over all vertices and start a new search from each unvisited one — that loop is exactly how you count components.
- **Cycles.** Without a visited set, both searches loop forever on the triangle 0–1–4–5–2–0 in the example. Mark vertices as visited.
- **Mark on enqueue, not on dequeue (BFS).** If you mark a vertex only when it leaves the queue, the same vertex can be queued many times (once per neighbour that discovers it). The answer stays right but memory and time blow up on dense graphs.
- **The iterative-DFS order surprise.** Pushing neighbours in their natural order makes the stack pop the *last* neighbour first, so example 1 prints \`[0, 2, 5, 4, 1, 3]\` for the stack version and \`[0, 1, 3, 4, 5, 2]\` for recursion. Push in reverse if you need the recursive order. Both are valid DFS orders.
- **Very deep graphs.** Recursive DFS on a long path uses one call-stack frame per vertex; section 9 shows where each language runs out.

## 9. How Deep Can Recursive DFS Go in JavaScript?

The call stack size is set by the engine, not by the language standard. We ran the recursive DFS from example 1 on path graphs in Node 22: a 10,000-vertex path worked, while a **12,000-vertex path threw \`RangeError: Maximum call stack size exceeded\`** (one run even failed at 8,000, because the limit depends on how large each stack frame is after the JIT compiles the function). Browsers have their own, different limits. The robust interview answer: **use the explicit-stack version whenever the depth could reach the thousands.** Example 2 measures the depth with exactly such an explicit stack.

## Common Pitfalls

- **\`queue.shift()\` in a big BFS.** It can be O(n) per call (measured above); keep a \`head\` index or use a ring buffer.
- **\`adj[u].reverse()\` without copying.** \`reverse\` mutates the array in place, silently reordering your graph for every later search.
- **Recursive DFS on deep inputs.** Node threw \`RangeError\` on a 12,000-vertex path; use an explicit stack.
- **Marking visited when dequeuing in BFS.** Vertices get queued several times; mark at enqueue.
- **Printing arrays with \`console.log(order)\`.** Node prints \`[ 0, 1, 2 ]\` with spaces, so join the values yourself if the exact text matters (the examples use a small \`fmt\` helper).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The difference:</strong> <span style="color:#f0e2c8;">BFS takes the oldest discovered vertex next (a queue), DFS takes the newest (a stack or recursion).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Visit order:</strong> <span style="color:#f0e2c8;">BFS goes level by level from the start; DFS follows one branch to the end and backtracks.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">Both O(V + E) time. Memory: BFS holds the widest level, DFS holds the deepest path.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When to use:</strong> <span style="color:#f0e2c8;">BFS for fewest steps in an unweighted graph; DFS for cycles, topological sort, backtracking; either for components.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">No built-in queue: use an array with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code> index, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code>; prefer an explicit stack because deep recursion throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does BFS give the shortest path?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It processes all vertices at distance d before any at distance d + 1, so the first time it reaches a vertex, no shorter route exists. Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> array to rebuild the path.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Array.shift()</code> really a problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For small queues no, but it may move every element on each call. In our Node 22 run, doubling the array size made a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code> drain about four times slower — quadratic. A head index avoids it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your recursive DFS crashed. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The engine has a fixed call-stack size; around ten thousand nested calls throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError: Maximum call stack size exceeded</code>. Rewrite with an explicit array stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if edges have weights?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Plain BFS no longer gives shortest paths; use Dijkstra with a binary heap (JavaScript has none built in, so you write a small one), or 0-1 BFS with a deque when weights are 0 and 1.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does your stack DFS print a different order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The stack pops the last pushed neighbour first. Push a reversed copy of the neighbours to get the recursive order; both are valid DFS orders.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Graph traversal** | Visiting every reachable vertex once by following edges |
| **Breadth-first search (BFS)** | Visits vertices in order of distance using a FIFO queue |
| **Depth-first search (DFS)** | Goes deep along one path, then backtracks; LIFO stack or recursion |
| **Frontier** | Discovered but unprocessed vertices: the queue or the stack |
| **Visited set** | Record of discovered vertices that stops loops and repeats |
| **Shortest path in an unweighted graph** | Route with the fewest edges; BFS finds it |
| **Backtracking** | Undo the last step and try the next option |
| **Head pointer (queue index)** | Index of the queue front inside an array; dequeue = increment, O(1) |

---
**Conclusion:** In JavaScript, BFS is an array plus a \`head\` index that marks vertices when they are enqueued, and DFS is either a short recursive function or an array used as a stack. Both are O(V + E); BFS visits by distance and gives shortest paths in unweighted graphs, DFS dives deep and backtracks. Know the two JavaScript traps — \`shift()\` can make BFS quadratic, and deep recursion throws \`RangeError\`. Next, put both to work on [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) and [connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph), or compare them with Union-Find in [islands with DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).`,
        examples: [
          {
            label: "BFS order and distances vs recursive and stack-based DFS",
            code: `function build(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    adj[u].push(v);
    adj[v].push(u);
  }
  return adj;
}

function bfs(adj, start) {
  // Visit in waves: everything 1 edge away, then 2 edges away, ...
  const dist = new Array(adj.length).fill(-1);
  const order = [];
  const queue = [start];
  let head = 0;                     // read pointer: avoids O(n) Array.shift()
  dist[start] = 0;
  while (head < queue.length) {
    const u = queue[head++];
    order.push(u);
    for (const v of adj[u]) {
      if (dist[v] === -1) {         // mark when ENQUEUED, so no node is queued twice
        dist[v] = dist[u] + 1;
        queue.push(v);
      }
    }
  }
  return { order, dist };
}

function dfsRecursive(adj, u, seen, order) {
  // Go as deep as possible before backing up.
  seen.add(u);
  order.push(u);
  for (const v of adj[u]) {
    if (!seen.has(v)) dfsRecursive(adj, v, seen, order);
  }
  return order;
}

function dfsIterative(adj, start, reversePush) {
  // Same idea with an explicit stack (LIFO) instead of the call stack.
  const seen = new Set(), order = [], stack = [start];
  while (stack.length > 0) {
    const u = stack.pop();
    if (seen.has(u)) continue;      // a node can sit on the stack twice; skip repeats
    seen.add(u);
    order.push(u);
    const nbrs = reversePush ? [...adj[u]].reverse() : adj[u];
    for (const v of nbrs) {
      if (!seen.has(v)) stack.push(v);
    }
  }
  return order;
}

const fmt = (xs) => "[" + xs.join(", ") + "]";

const adj = build(6, [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [4, 5]]);
const { order, dist } = bfs(adj, 0);
console.log("BFS order:             " + fmt(order));
console.log("BFS distance from 0:   " + fmt(dist));
console.log("DFS recursive:         " + fmt(dfsRecursive(adj, 0, new Set(), [])));
console.log("DFS stack, push order: " + fmt(dfsIterative(adj, 0, false)));
console.log("DFS stack, reversed:   " + fmt(dfsIterative(adj, 0, true)));`,
          },
          {
            label: "BFS vs DFS paths, and queue size vs stack depth on three graph shapes",
            code: `function build(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    adj[u].push(v);
    adj[v].push(u);
  }
  return adj;
}

function pathTo(parent, target) {
  const path = [];
  for (let x = target; x !== -1; x = parent[x]) path.push(x);
  return path.reverse().join(" -> ");
}

function bfsPath(adj, s, t) {
  const parent = new Array(adj.length).fill(-1);
  const seen = new Array(adj.length).fill(false);
  seen[s] = true;
  const queue = [s];
  let head = 0;
  while (head < queue.length) {
    const u = queue[head++];
    if (u === t) break;
    for (const v of adj[u]) {
      if (!seen[v]) {
        seen[v] = true;
        parent[v] = u;
        queue.push(v);
      }
    }
  }
  return pathTo(parent, t);
}

function dfsPath(adj, s, t) {
  const parent = new Array(adj.length).fill(-1);
  const seen = new Array(adj.length).fill(false);
  function go(u) {
    seen[u] = true;
    if (u === t) return true;
    for (const v of adj[u]) {
      if (!seen[v]) {
        parent[v] = u;
        if (go(v)) return true;
      }
    }
    return false;
  }
  go(s);
  return pathTo(parent, t);
}

function bfsMaxQueue(adj, s) {
  // Largest number of nodes waiting in the BFS queue at one time.
  const seen = new Array(adj.length).fill(false);
  seen[s] = true;
  const queue = [s];
  let head = 0, peak = 1;
  while (head < queue.length) {
    const u = queue[head++];
    for (const v of adj[u]) {
      if (!seen[v]) {
        seen[v] = true;
        queue.push(v);
      }
    }
    peak = Math.max(peak, queue.length - head);  // waiting = pushed minus already read
  }
  return peak;
}

function dfsMaxDepth(adj, s) {
  // Deepest DFS path: an explicit stack of [node, next neighbour index] that
  // behaves exactly like the recursive version's call stack.
  const seen = new Array(adj.length).fill(false);
  seen[s] = true;
  const stack = [[s, 0]];
  let peak = 1;
  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    const [u, i] = top;
    if (i < adj[u].length) {
      top[1]++;
      const v = adj[u][i];
      if (!seen[v]) {
        seen[v] = true;
        stack.push([v, 0]);
        peak = Math.max(peak, stack.length);
      }
    } else {
      stack.pop();
    }
  }
  return peak;
}

const g = build(6, [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [4, 5]]);
console.log("BFS path 0 to 5: " + bfsPath(g, 0, 5)); // BFS path 0 to 5: 0 -> 2 -> 5
console.log("DFS path 0 to 5: " + dfsPath(g, 0, 5)); // DFS path 0 to 5: 0 -> 1 -> 4 -> 5

const tree = [], line = [], star = [];
for (let i = 0; i < 1023; i++) for (const c of [2 * i + 1, 2 * i + 2]) if (c < 1023) tree.push([i, c]);
for (let i = 0; i < 999; i++) line.push([i, i + 1]);
for (let i = 1; i < 1000; i++) star.push([0, i]);
const shapes = [
  ["complete binary tree, 1023 nodes", 1023, tree],
  ["path (a line), 1000 nodes", 1000, line],
  ["star (hub + 999 leaves)", 1000, star],
];
for (const [name, n, edges] of shapes) {
  const adj = build(n, edges);
  console.log(name + ": BFS queue peak " + bfsMaxQueue(adj, 0) + ", DFS depth peak " + dfsMaxDepth(adj, 0));
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Explain the difference between breadth-first search and depth-first search on a graph. Then implement both in Java and tell me when you would choose one over the other."

**What a strong answer should cover:**
- The one structural difference: BFS uses a FIFO queue, DFS uses a LIFO stack (or recursion).
- Visit order: BFS goes level by level, DFS goes deep then backtracks; both need a visited set for cycles.
- Both are O(V + E) time; memory is the widest level for BFS and the deepest path for DFS.
- BFS gives shortest paths in unweighted graphs; DFS does not. Typical uses of each.
- Java details: \`ArrayDeque\` as both queue (\`offer\`/\`poll\`) and stack (\`push\`/\`pop\`) instead of the legacy \`Stack\` class, \`boolean[]\` for visited, and \`StackOverflowError\` from deep recursion.

**Code / implementation expected:** Yes — BFS with \`ArrayDeque\` and DFS both recursively and with an explicit \`Deque\` stack, in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a graph and an adjacency list are  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You have lost your cat somewhere in a big old house. Two friends offer to help, and they search in completely different styles.

**Friend one** stands in the hallway and checks every room that opens off the hallway first. Only when all of those are done does she check the rooms that open off *those* rooms, and so on, spreading outwards like a ripple on a pond. If the cat is two doors away, she finds it after checking only the nearby rooms — and she can tell you it was exactly two doors away.

**Friend two** picks one door, walks through, picks a door in that room, walks through again, and keeps going deeper until she hits a dead end. Then she walks back to the last room that still had an unopened door and tries that one. She carries a piece of chalk to mark rooms she has already searched so she never loops forever.

Friend one is **breadth-first search (BFS)**. Friend two is **depth-first search (DFS)**. Both will search the whole house and both take about the same total effort. The difference is the *order* they visit rooms in — and that order decides which problems each one is good at.

## 2. The Core Distinction: Queue vs Stack

Both searches keep a set of rooms they have discovered but not finished yet — the **frontier** — and a set of rooms already marked with chalk. The *only* thing that changes between BFS and DFS is which frontier room you take next:

- BFS takes the room that was discovered **earliest**. That is a queue: first in, first out.
- DFS takes the room that was discovered **latest**. That is a stack: last in, first out. A recursive function gives you this stack for free, because each call waits for the deeper calls to finish.

(If queues and stacks are new, see [the difference between a stack and a queue](/interview-question/what-is-the-difference-between-a-stack-and-a-queue).)

📌 **Interview term: Graph traversal** — visiting every vertex reachable from a start vertex exactly once, following edges.

📌 **Interview term: Breadth-first search (BFS)** — a traversal that visits vertices in order of their distance (number of edges) from the start, using a FIFO queue.

📌 **Interview term: Depth-first search (DFS)** — a traversal that follows one path as deep as it can before backtracking, using a LIFO stack or recursion.

📌 **Interview term: Frontier** — the vertices that have been discovered but not yet processed — the queue in BFS, the stack in DFS.

📌 **Interview term: Visited set** — the record of vertices already discovered, so that cycles do not make the search loop forever and no vertex is processed twice.

Here is the six-vertex graph that example 1 explores, starting from 0. The numbers under each vertex are the order BFS visits them in:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="BFS on a six vertex graph visits vertex 0, then 1 and 2 at level 1, then 3, 4 and 5 at level 2">
  <path class="d-edge-accent" d="M 370 50 L 250 140"/>
  <path class="d-edge-accent" d="M 370 50 L 490 140"/>
  <path class="d-edge-accent" d="M 250 140 L 170 230"/>
  <path class="d-edge-accent" d="M 250 140 L 330 230"/>
  <path class="d-edge-accent" d="M 490 140 L 490 230"/>
  <path class="d-edge-dashed" d="M 330 230 L 490 230"/>
  <circle class="d-box-accent" cx="370" cy="50" r="22"/>
  <text class="d-text" x="370" y="55" text-anchor="middle">0</text>
  <circle class="d-box" cx="250" cy="140" r="22"/>
  <text class="d-text" x="250" y="145" text-anchor="middle">1</text>
  <circle class="d-box" cx="490" cy="140" r="22"/>
  <text class="d-text" x="490" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="170" cy="230" r="22"/>
  <text class="d-text" x="170" y="235" text-anchor="middle">3</text>
  <circle class="d-box" cx="330" cy="230" r="22"/>
  <text class="d-text" x="330" y="235" text-anchor="middle">4</text>
  <circle class="d-box" cx="490" cy="230" r="22"/>
  <text class="d-text" x="490" y="235" text-anchor="middle">5</text>
  <text class="d-sub" x="30" y="55">level 0</text>
  <text class="d-sub" x="30" y="145">level 1</text>
  <text class="d-sub" x="30" y="235">level 2</text>
  <text class="d-sub d-accent" x="370" y="18" text-anchor="middle">visit 1</text>
  <text class="d-sub d-accent" x="218" y="118" text-anchor="end">visit 2</text>
  <text class="d-sub d-accent" x="522" y="118">visit 3</text>
  <text class="d-sub d-accent" x="170" y="280" text-anchor="middle">visit 4</text>
  <text class="d-sub d-accent" x="330" y="280" text-anchor="middle">visit 5</text>
  <text class="d-sub d-accent" x="490" y="280" text-anchor="middle">visit 6</text>
</svg>

BFS finishes level 1 (vertices 1 and 2) before it touches level 2. The solid edges are the ones BFS used to discover each vertex; the dashed edge 4–5 was looked at but led to a vertex already found.

Now the same graph with DFS. It goes 0 → 1 → 3, hits a dead end at 3, backs up to 1, goes 1 → 4 → 5 → 2, and only then is everything visited:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="DFS on the same graph visits 0, 1, 3, then backtracks and visits 4, 5 and finally 2">
  <path class="d-edge-accent" d="M 370 50 L 250 140"/>
  <path class="d-edge-dashed" d="M 370 50 L 490 140"/>
  <path class="d-edge-accent" d="M 250 140 L 170 230"/>
  <path class="d-edge-accent" d="M 250 140 L 330 230"/>
  <path class="d-edge-accent" d="M 490 140 L 490 230"/>
  <path class="d-edge-accent" d="M 330 230 L 490 230"/>
  <circle class="d-box-accent" cx="370" cy="50" r="22"/>
  <text class="d-text" x="370" y="55" text-anchor="middle">0</text>
  <circle class="d-box" cx="250" cy="140" r="22"/>
  <text class="d-text" x="250" y="145" text-anchor="middle">1</text>
  <circle class="d-box" cx="490" cy="140" r="22"/>
  <text class="d-text" x="490" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="170" cy="230" r="22"/>
  <text class="d-text" x="170" y="235" text-anchor="middle">3</text>
  <circle class="d-box" cx="330" cy="230" r="22"/>
  <text class="d-text" x="330" y="235" text-anchor="middle">4</text>
  <circle class="d-box" cx="490" cy="230" r="22"/>
  <text class="d-text" x="490" y="235" text-anchor="middle">5</text>
  <text class="d-sub d-accent" x="370" y="18" text-anchor="middle">visit 1</text>
  <text class="d-sub d-accent" x="218" y="118" text-anchor="end">visit 2</text>
  <text class="d-sub d-accent" x="522" y="118">visit 6</text>
  <text class="d-sub d-accent" x="170" y="280" text-anchor="middle">visit 3</text>
  <text class="d-sub d-accent" x="330" y="280" text-anchor="middle">visit 4</text>
  <text class="d-sub d-accent" x="490" y="280" text-anchor="middle">visit 5</text>
</svg>

DFS reaches vertex 2 last, through the long way round (0 → 1 → 4 → 5 → 2), even though 2 is a direct neighbour of 0. That is exactly why DFS cannot be used for shortest paths: the first route it finds is not necessarily the shortest one.

The frontier itself is the whole difference. The same three waiting vertices are served in opposite orders:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="A queue serves the oldest waiting vertex first. A stack serves the newest waiting vertex first">
  <defs>
    <marker id="b21q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="65">queue</text>
  <path class="d-edge-accent" d="M 148 60 L 100 60" marker-end="url(#b21q2-arrow)"/>
  <text class="d-sub" x="124" y="38" text-anchor="middle">out</text>
  <rect class="d-box-accent" x="150" y="40" width="60" height="40" rx="6"/>
  <text class="d-text" x="180" y="65" text-anchor="middle">3</text>
  <rect class="d-box" x="220" y="40" width="60" height="40" rx="6"/>
  <text class="d-text" x="250" y="65" text-anchor="middle">4</text>
  <rect class="d-box" x="290" y="40" width="60" height="40" rx="6"/>
  <text class="d-text" x="320" y="65" text-anchor="middle">5</text>
  <path class="d-edge" d="M 430 60 L 356 60" marker-end="url(#b21q2-arrow)"/>
  <text class="d-sub" x="393" y="38" text-anchor="middle">in</text>
  <text class="d-sub" x="180" y="104" text-anchor="middle">front</text>
  <text class="d-sub" x="320" y="104" text-anchor="middle">back</text>
  <text class="d-sub" x="520" y="65" text-anchor="middle">BFS: oldest first</text>
  <text class="d-text" x="20" y="175">stack</text>
  <rect class="d-box" x="150" y="150" width="60" height="40" rx="6"/>
  <text class="d-text" x="180" y="175" text-anchor="middle">3</text>
  <rect class="d-box" x="220" y="150" width="60" height="40" rx="6"/>
  <text class="d-text" x="250" y="175" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="290" y="150" width="60" height="40" rx="6"/>
  <text class="d-text" x="320" y="175" text-anchor="middle">5</text>
  <path class="d-edge" d="M 430 160 L 356 160" marker-end="url(#b21q2-arrow)"/>
  <path class="d-edge-accent" d="M 354 182 L 428 182" marker-end="url(#b21q2-arrow)"/>
  <text class="d-sub" x="440" y="164">push</text>
  <text class="d-sub" x="440" y="190">pop</text>
  <text class="d-sub" x="180" y="214" text-anchor="middle">bottom</text>
  <text class="d-sub" x="320" y="214" text-anchor="middle">top</text>
  <text class="d-sub" x="560" y="175" text-anchor="middle">DFS: newest first</text>
</svg>

## 3. Side by Side

| | BFS | DFS |
| :--- | :--- | :--- |
| Frontier | queue (FIFO) | stack (LIFO) or recursion |
| Visit order | by distance from the start, level by level | one branch to the bottom, then backtrack |
| Shortest path (unweighted) | **yes** — the first time BFS reaches a vertex is by a shortest path | no — the first path found can be long |
| Time | O(V + E) | O(V + E) |
| Extra memory | the widest level of the graph | the deepest path of the graph |
| Typical uses | shortest path in steps, level-order, nearest X, multi-source spread | cycle detection, topological sort, backtracking, connected components, path existence |

📌 **Interview term: Shortest path in an unweighted graph** — the route with the fewest edges. BFS finds it because it reaches every vertex at distance d before any vertex at distance d + 1.

📌 **Interview term: Backtracking** — undoing the last step and trying the next option when a path cannot go further — the natural behaviour of DFS.

Both are O(V + E): every vertex enters the frontier once and every edge is examined once from each end (see [Big-O notation](/interview-question/what-is-big-o-notation)). The difference in **memory** is real and depends on the shape of the graph — example 2 measures it:

| Graph shape (1,000-ish vertices) | BFS queue peak | DFS depth peak |
| :--- | :--- | :--- |
| complete binary tree, 1,023 vertices | 512 | 10 |
| path (a line), 1,000 vertices | 1 | 1,000 |
| star (one hub + 999 leaves) | 999 | 2 |

A wide, shallow graph makes BFS hold a lot; a long, thin graph makes DFS go deep. On a line of 1,000 vertices the DFS depth is 1,000, which matters a lot when the "stack" is the language's call stack (see section 9 and [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)).

## 4. The Code in Java

BFS with \`ArrayDeque\`, recording each vertex's distance from the start:

~~~java
// Visit in waves: everything 1 edge away, then 2 edges away, ...
static List<Integer> bfs(List<List<Integer>> adj, int start, int[] dist) {
    Arrays.fill(dist, -1);
    List<Integer> order = new ArrayList<>();
    Deque<Integer> queue = new ArrayDeque<>();   // offer() at the tail, poll() from the head
    dist[start] = 0;
    queue.offer(start);
    while (!queue.isEmpty()) {
        int u = queue.poll();
        order.add(u);
        for (int v : adj.get(u)) {
            if (dist[v] == -1) {                 // mark when ENQUEUED
                dist[v] = dist[u] + 1;
                queue.offer(v);
            }
        }
    }
    return order;
}
~~~

And DFS, first recursive, then with an explicit stack:

~~~java
// Go as deep as possible before backing up.
static void dfsRecursive(List<List<Integer>> adj, int u, boolean[] seen, List<Integer> order) {
    seen[u] = true;
    order.add(u);
    for (int v : adj.get(u)) {
        if (!seen[v]) dfsRecursive(adj, v, seen, order);
    }
}

// Same idea with an explicit stack (LIFO) instead of the call stack.
static List<Integer> dfsIterative(List<List<Integer>> adj, int start, boolean reversePush) {
    boolean[] seen = new boolean[adj.size()];
    List<Integer> order = new ArrayList<>();
    Deque<Integer> stack = new ArrayDeque<>();   // push()/pop() work on the head
    stack.push(start);
    while (!stack.isEmpty()) {
        int u = stack.pop();
        if (seen[u]) continue;                   // a node can sit on the stack twice
        seen[u] = true;
        order.add(u);
        List<Integer> nbrs = adj.get(u);
        for (int k = 0; k < nbrs.size(); k++) {
            int v = reversePush ? nbrs.get(nbrs.size() - 1 - k) : nbrs.get(k);
            if (!seen[v]) stack.push(v);
        }
    }
    return order;
}
~~~

**What to point out in this code:**

- \`ArrayDeque\` is the standard choice for both roles. Its Javadoc says it "is likely to be faster than \`Stack\` when used as a stack, and faster than \`LinkedList\` when used as a queue" ([ArrayDeque, Java 17 API](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/ArrayDeque.html)); the old \`Stack\` class is synchronised and extends \`Vector\`.
- Queue methods: \`offer\` adds at the tail, \`poll\` removes from the head. Stack methods: \`push\` and \`pop\` both work on the head. Mixing \`push\` with \`poll\` silently turns your stack into a queue, so pick one pair.
- \`ArrayDeque\` does not accept \`null\`, and \`poll\` returns \`null\` on an empty deque — assigning that to an \`int\` throws \`NullPointerException\`. The \`while (!queue.isEmpty())\` guard avoids it.
- \`dist\` (an \`int[]\` filled with -1) doubles as the visited marker, and a \`boolean[]\` is used in DFS: primitive arrays avoid boxing every vertex into an \`Integer\` the way a \`Set<Integer>\` would.
- In the iterative DFS a vertex can be pushed twice, so it is skipped after popping if \`seen[u]\` is already true.
- Reading \`nbrs.get(nbrs.size() - 1 - k)\` walks the neighbours backwards without copying the list, which makes the stack pop them in natural order.

📌 **Interview term: ArrayDeque** — Java's resizable-array double-ended queue: amortised O(1) add and remove at both ends; the recommended stack and queue.

## 5. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21; the code only uses Java 17 features). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 builds a complete binary tree, a path and a star, and measures the largest BFS queue and the deepest DFS path with an explicit stack.

**Example 1 — BFS, recursive DFS and stack DFS on the same graph** prints:

~~~text
BFS order:             [0, 1, 2, 3, 4, 5]
BFS distance from 0:   [0, 1, 1, 2, 2, 2]
DFS recursive:         [0, 1, 3, 4, 5, 2]
DFS stack, push order: [0, 2, 5, 4, 1, 3]
DFS stack, reversed:   [0, 1, 3, 4, 5, 2]
~~~

**Example 2 — shortest path, and how much memory each search needs on three graph shapes** prints:

~~~text
BFS path 0 to 5: 0 -> 2 -> 5
DFS path 0 to 5: 0 -> 1 -> 4 -> 5
complete binary tree, 1023 nodes: BFS queue peak 512, DFS depth peak 10
path (a line), 1000 nodes: BFS queue peak 1, DFS depth peak 1000
star (hub + 999 leaves): BFS queue peak 999, DFS depth peak 2
~~~

## 6. Which One Should You Use?

- **"Fewest steps / minimum moves / nearest"** in an unweighted graph or grid → **BFS**. It is the reason BFS exists: [Rotting Oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs) (multi-source BFS) and the [word ladder](/interview-question/how-do-you-solve-the-word-ladder-problem) are both BFS shortest-path problems. With edge weights you need [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) instead — see [when BFS is enough](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths).
- **"Visit everything / count groups / is it connected"** → **either**. Number of islands and connected components work with both; DFS is usually shorter to write ([number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid), [connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph)).
- **"Does a cycle exist / what order respects the dependencies"** in a directed graph → **DFS** with three colours, or Kahn's BFS-based algorithm for topological order ([cycle detection](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph), [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used)).
- **"Try all possibilities / generate all paths"** → **DFS** (backtracking), because it only holds the current path in memory.
- **Copying or two-colouring a graph** → either; see [clone a graph](/interview-question/how-do-you-clone-a-graph) and [bipartite check](/interview-question/how-do-you-check-if-a-graph-is-bipartite).
- **Trees** are graphs without cycles: level-order traversal is BFS ([level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree)), and preorder/inorder/postorder are DFS ([tree traversal methods](/interview-question/what-are-the-tree-traversal-methods)).

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| BFS with \`ArrayDeque\` | O(V + E) | O(V) | each vertex enqueued once, each adjacency list scanned once |
| DFS recursive | O(V + E) | O(V) stack frames | depth can reach V on a path; 10,000 already overflowed the default stack |
| DFS with a \`Deque\` stack | O(V + E) | O(V + E) | a vertex may be pushed once per neighbour that sees it unvisited |

## 8. Edge Cases

- **Disconnected graph.** One BFS or DFS from vertex 0 only visits 0's component. To visit everything, loop over all vertices and start a new search from each unvisited one — that loop is exactly how you count components.
- **Cycles.** Without a visited set, both searches loop forever on the triangle 0–1–4–5–2–0 in the example. Mark vertices as visited.
- **Mark on enqueue, not on dequeue (BFS).** If you mark a vertex only when it leaves the queue, the same vertex can be queued many times (once per neighbour that discovers it). The answer stays right but memory and time blow up on dense graphs.
- **The iterative-DFS order surprise.** Pushing neighbours in their natural order makes the stack pop the *last* neighbour first, so example 1 prints \`[0, 2, 5, 4, 1, 3]\` for the stack version and \`[0, 1, 3, 4, 5, 2]\` for recursion. Push in reverse if you need the recursive order. Both are valid DFS orders.
- **Very deep graphs.** Recursive DFS on a long path uses one call-stack frame per vertex; section 9 shows where each language runs out.

## 9. How Deep Can Recursive DFS Go in Java?

Each Java thread has a fixed-size stack. We ran the recursive DFS from example 1 on path graphs with OpenJDK 21 and the default stack size: a 5,000-vertex path worked, a **10,000-vertex path threw \`StackOverflowError\`**. The JVM flag \`-Xss\` raises the thread stack size (the verifier for this page runs \`java -Xss64m\`), and you can also run the DFS in a \`new Thread(null, task, "dfs", stackBytes)\`, but the robust interview answer is: **use an explicit \`ArrayDeque\` stack whenever the depth could be large.** Example 2 measures depth with exactly such an explicit stack.

## Common Pitfalls

- **Using \`java.util.Stack\` or \`LinkedList\` by habit.** Both work, but \`ArrayDeque\` is the documented faster choice for each role.
- **Mixing deque methods.** \`push\` + \`poll\` or \`offer\` + \`pop\` changes which end you take from; a "DFS" written that way is really a BFS.
- **Recursive DFS on deep inputs.** A 10,000-vertex path overflowed the default thread stack; use an explicit stack.
- **Marking visited when dequeuing in BFS.** Vertices get queued several times; mark at enqueue.
- **\`Set<Integer>\` or \`List<Integer>\` for visited flags.** Boxing every id costs time and memory; a \`boolean[]\` indexed by vertex is simpler and faster.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The difference:</strong> <span style="color:#f0e2c8;">BFS takes the oldest discovered vertex next (a queue), DFS takes the newest (a stack or recursion).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Visit order:</strong> <span style="color:#f0e2c8;">BFS goes level by level from the start; DFS follows one branch to the end and backtracks.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">Both O(V + E) time. Memory: BFS holds the widest level, DFS holds the deepest path.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When to use:</strong> <span style="color:#f0e2c8;">BFS for fewest steps in an unweighted graph; DFS for cycles, topological sort, backtracking; either for components.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">offer</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">poll</code> for BFS and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code> for DFS, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[]</code> for visited, and no deep recursion because of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does BFS give the shortest path?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It processes all vertices at distance d before any at distance d + 1, so the first time it reaches a vertex, no shorter route exists. Keep an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[] parent</code> to rebuild the path.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ArrayDeque</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Stack</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Stack</code> extends the synchronised <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vector</code>; the Javadoc recommends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deque</code> implementations, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> is documented as likely faster for both stack and queue use.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your recursive DFS threw <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">StackOverflowError</code>. Fix it.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Switch to an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deque&lt;Integer&gt;</code> stack. If recursion is required, run it on a thread created with a larger stack size, or raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-Xss</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if edges have weights?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use Dijkstra with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue&lt;int[]&gt;</code> ordered by distance; BFS only works when all weights are equal (or 0-1 BFS with a deque for weights 0 and 1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does your stack DFS print a different order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The stack pops the last pushed neighbour first. Push neighbours in reverse to get the recursive order; both are valid DFS orders.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Graph traversal** | Visiting every reachable vertex once by following edges |
| **Breadth-first search (BFS)** | Visits vertices in order of distance using a FIFO queue |
| **Depth-first search (DFS)** | Goes deep along one path, then backtracks; LIFO stack or recursion |
| **Frontier** | Discovered but unprocessed vertices: the queue or the stack |
| **Visited set** | Record of discovered vertices that stops loops and repeats |
| **Shortest path in an unweighted graph** | Route with the fewest edges; BFS finds it |
| **Backtracking** | Undo the last step and try the next option |
| **ArrayDeque** | Java's array-backed deque: the recommended stack and queue |

---
**Conclusion:** In Java, BFS is an \`ArrayDeque\` used with \`offer\`/\`poll\` that marks vertices when they are enqueued, and DFS is either a recursive method or the same \`ArrayDeque\` used with \`push\`/\`pop\`. Both are O(V + E); BFS visits by distance and gives shortest paths in unweighted graphs, DFS dives deep and backtracks. Use primitive arrays for visited flags and avoid deep recursion, which throws \`StackOverflowError\`. Next, put both to work on [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) and [connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph), or compare them with Union-Find in [islands with DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).`,
        examples: [
          {
            label: "BFS order and distances vs recursive and stack-based DFS",
            code: `import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.List;

public class Main {
    static List<List<Integer>> build(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        return adj;
    }

    // Visit in waves: everything 1 edge away, then 2 edges away, ...
    static List<Integer> bfs(List<List<Integer>> adj, int start, int[] dist) {
        Arrays.fill(dist, -1);
        List<Integer> order = new ArrayList<>();
        Deque<Integer> queue = new ArrayDeque<>();   // offer() at the tail, poll() from the head
        dist[start] = 0;
        queue.offer(start);
        while (!queue.isEmpty()) {
            int u = queue.poll();
            order.add(u);
            for (int v : adj.get(u)) {
                if (dist[v] == -1) {                 // mark when ENQUEUED
                    dist[v] = dist[u] + 1;
                    queue.offer(v);
                }
            }
        }
        return order;
    }

    // Go as deep as possible before backing up.
    static void dfsRecursive(List<List<Integer>> adj, int u, boolean[] seen, List<Integer> order) {
        seen[u] = true;
        order.add(u);
        for (int v : adj.get(u)) {
            if (!seen[v]) dfsRecursive(adj, v, seen, order);
        }
    }

    // Same idea with an explicit stack (LIFO) instead of the call stack.
    static List<Integer> dfsIterative(List<List<Integer>> adj, int start, boolean reversePush) {
        boolean[] seen = new boolean[adj.size()];
        List<Integer> order = new ArrayList<>();
        Deque<Integer> stack = new ArrayDeque<>();   // push()/pop() work on the head
        stack.push(start);
        while (!stack.isEmpty()) {
            int u = stack.pop();
            if (seen[u]) continue;                   // a node can sit on the stack twice
            seen[u] = true;
            order.add(u);
            List<Integer> nbrs = adj.get(u);
            for (int k = 0; k < nbrs.size(); k++) {
                int v = reversePush ? nbrs.get(nbrs.size() - 1 - k) : nbrs.get(k);
                if (!seen[v]) stack.push(v);
            }
        }
        return order;
    }

    public static void main(String[] args) {
        List<List<Integer>> adj = build(6, new int[][]{{0, 1}, {0, 2}, {1, 3}, {1, 4}, {2, 5}, {4, 5}});
        int[] dist = new int[6];
        List<Integer> order = bfs(adj, 0, dist);
        List<Integer> rec = new ArrayList<>();
        dfsRecursive(adj, 0, new boolean[6], rec);
        System.out.println("BFS order:             " + order);
        System.out.println("BFS distance from 0:   " + Arrays.toString(dist));
        System.out.println("DFS recursive:         " + rec);
        System.out.println("DFS stack, push order: " + dfsIterative(adj, 0, false));
        System.out.println("DFS stack, reversed:   " + dfsIterative(adj, 0, true));
    }
}`,
          },
          {
            label: "BFS vs DFS paths, and queue size vs stack depth on three graph shapes",
            code: `import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Deque;
import java.util.List;

public class Main {
    static List<List<Integer>> build(int n, List<int[]> edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        return adj;
    }

    static String pathTo(int[] parent, int target) {
        List<String> path = new ArrayList<>();
        for (int x = target; x != -1; x = parent[x]) path.add(String.valueOf(x));
        Collections.reverse(path);
        return String.join(" -> ", path);
    }

    static String bfsPath(List<List<Integer>> adj, int s, int t) {
        int[] parent = new int[adj.size()];
        Arrays.fill(parent, -1);
        boolean[] seen = new boolean[adj.size()];
        seen[s] = true;
        Deque<Integer> queue = new ArrayDeque<>();
        queue.offer(s);
        while (!queue.isEmpty()) {
            int u = queue.poll();
            if (u == t) break;
            for (int v : adj.get(u)) {
                if (!seen[v]) {
                    seen[v] = true;
                    parent[v] = u;
                    queue.offer(v);
                }
            }
        }
        return pathTo(parent, t);
    }

    static boolean go(List<List<Integer>> adj, int u, int t, boolean[] seen, int[] parent) {
        seen[u] = true;
        if (u == t) return true;
        for (int v : adj.get(u)) {
            if (!seen[v]) {
                parent[v] = u;
                if (go(adj, v, t, seen, parent)) return true;
            }
        }
        return false;
    }

    static String dfsPath(List<List<Integer>> adj, int s, int t) {
        int[] parent = new int[adj.size()];
        Arrays.fill(parent, -1);
        go(adj, s, t, new boolean[adj.size()], parent);
        return pathTo(parent, t);
    }

    // Largest number of nodes waiting in the BFS queue at one time.
    static int bfsMaxQueue(List<List<Integer>> adj, int s) {
        boolean[] seen = new boolean[adj.size()];
        seen[s] = true;
        Deque<Integer> queue = new ArrayDeque<>();
        queue.offer(s);
        int peak = 1;
        while (!queue.isEmpty()) {
            int u = queue.poll();
            for (int v : adj.get(u)) {
                if (!seen[v]) {
                    seen[v] = true;
                    queue.offer(v);
                }
            }
            peak = Math.max(peak, queue.size());
        }
        return peak;
    }

    // Deepest DFS path: an explicit stack of {node, next neighbour index} that
    // behaves exactly like the recursive version's call stack.
    static int dfsMaxDepth(List<List<Integer>> adj, int s) {
        boolean[] seen = new boolean[adj.size()];
        seen[s] = true;
        Deque<int[]> stack = new ArrayDeque<>();
        stack.push(new int[]{s, 0});
        int peak = 1;
        while (!stack.isEmpty()) {
            int[] top = stack.peek();
            int u = top[0], i = top[1];
            if (i < adj.get(u).size()) {
                top[1]++;
                int v = adj.get(u).get(i);
                if (!seen[v]) {
                    seen[v] = true;
                    stack.push(new int[]{v, 0});
                    peak = Math.max(peak, stack.size());
                }
            } else {
                stack.pop();
            }
        }
        return peak;
    }

    public static void main(String[] args) {
        List<int[]> small = List.of(new int[]{0, 1}, new int[]{0, 2}, new int[]{1, 3},
                new int[]{1, 4}, new int[]{2, 5}, new int[]{4, 5});
        List<List<Integer>> g = build(6, small);
        System.out.println("BFS path 0 to 5: " + bfsPath(g, 0, 5)); // 0 -> 2 -> 5
        System.out.println("DFS path 0 to 5: " + dfsPath(g, 0, 5)); // 0 -> 1 -> 4 -> 5

        List<int[]> tree = new ArrayList<>(), line = new ArrayList<>(), star = new ArrayList<>();
        for (int i = 0; i < 1023; i++)
            for (int c : new int[]{2 * i + 1, 2 * i + 2}) if (c < 1023) tree.add(new int[]{i, c});
        for (int i = 0; i < 999; i++) line.add(new int[]{i, i + 1});
        for (int i = 1; i < 1000; i++) star.add(new int[]{0, i});
        String[] names = {"complete binary tree, 1023 nodes", "path (a line), 1000 nodes", "star (hub + 999 leaves)"};
        int[] sizes = {1023, 1000, 1000};
        List<List<int[]>> all = List.of(tree, line, star);
        for (int k = 0; k < 3; k++) {
            List<List<Integer>> adj = build(sizes[k], all.get(k));
            System.out.println(names[k] + ": BFS queue peak " + bfsMaxQueue(adj, 0) + ", DFS depth peak " + dfsMaxDepth(adj, 0));
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Explain the difference between breadth-first search and depth-first search on a graph. Then implement both in C++ and tell me when you would choose one over the other."

**What a strong answer should cover:**
- The one structural difference: BFS uses a FIFO queue, DFS uses a LIFO stack (or recursion).
- Visit order: BFS goes level by level, DFS goes deep then backtracks; both need a visited set for cycles.
- Both are O(V + E) time; memory is the widest level for BFS and the deepest path for DFS.
- BFS gives shortest paths in unweighted graphs; DFS does not. Typical uses of each.
- C++ details: \`std::queue\` and \`std::stack\` are adaptors over \`std::deque\`, \`pop()\` returns \`void\` (read \`front()\`/\`top()\` first), and deep recursion overflows the thread stack with a crash rather than an exception.

**Code / implementation expected:** Yes — BFS with \`std::queue\` and DFS both recursively and with \`std::stack\`, in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a graph and an adjacency list are  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You have lost your cat somewhere in a big old house. Two friends offer to help, and they search in completely different styles.

**Friend one** stands in the hallway and checks every room that opens off the hallway first. Only when all of those are done does she check the rooms that open off *those* rooms, and so on, spreading outwards like a ripple on a pond. If the cat is two doors away, she finds it after checking only the nearby rooms — and she can tell you it was exactly two doors away.

**Friend two** picks one door, walks through, picks a door in that room, walks through again, and keeps going deeper until she hits a dead end. Then she walks back to the last room that still had an unopened door and tries that one. She carries a piece of chalk to mark rooms she has already searched so she never loops forever.

Friend one is **breadth-first search (BFS)**. Friend two is **depth-first search (DFS)**. Both will search the whole house and both take about the same total effort. The difference is the *order* they visit rooms in — and that order decides which problems each one is good at.

## 2. The Core Distinction: Queue vs Stack

Both searches keep a set of rooms they have discovered but not finished yet — the **frontier** — and a set of rooms already marked with chalk. The *only* thing that changes between BFS and DFS is which frontier room you take next:

- BFS takes the room that was discovered **earliest**. That is a queue: first in, first out.
- DFS takes the room that was discovered **latest**. That is a stack: last in, first out. A recursive function gives you this stack for free, because each call waits for the deeper calls to finish.

(If queues and stacks are new, see [the difference between a stack and a queue](/interview-question/what-is-the-difference-between-a-stack-and-a-queue).)

📌 **Interview term: Graph traversal** — visiting every vertex reachable from a start vertex exactly once, following edges.

📌 **Interview term: Breadth-first search (BFS)** — a traversal that visits vertices in order of their distance (number of edges) from the start, using a FIFO queue.

📌 **Interview term: Depth-first search (DFS)** — a traversal that follows one path as deep as it can before backtracking, using a LIFO stack or recursion.

📌 **Interview term: Frontier** — the vertices that have been discovered but not yet processed — the queue in BFS, the stack in DFS.

📌 **Interview term: Visited set** — the record of vertices already discovered, so that cycles do not make the search loop forever and no vertex is processed twice.

Here is the six-vertex graph that example 1 explores, starting from 0. The numbers under each vertex are the order BFS visits them in:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="BFS on a six vertex graph visits vertex 0, then 1 and 2 at level 1, then 3, 4 and 5 at level 2">
  <path class="d-edge-accent" d="M 370 50 L 250 140"/>
  <path class="d-edge-accent" d="M 370 50 L 490 140"/>
  <path class="d-edge-accent" d="M 250 140 L 170 230"/>
  <path class="d-edge-accent" d="M 250 140 L 330 230"/>
  <path class="d-edge-accent" d="M 490 140 L 490 230"/>
  <path class="d-edge-dashed" d="M 330 230 L 490 230"/>
  <circle class="d-box-accent" cx="370" cy="50" r="22"/>
  <text class="d-text" x="370" y="55" text-anchor="middle">0</text>
  <circle class="d-box" cx="250" cy="140" r="22"/>
  <text class="d-text" x="250" y="145" text-anchor="middle">1</text>
  <circle class="d-box" cx="490" cy="140" r="22"/>
  <text class="d-text" x="490" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="170" cy="230" r="22"/>
  <text class="d-text" x="170" y="235" text-anchor="middle">3</text>
  <circle class="d-box" cx="330" cy="230" r="22"/>
  <text class="d-text" x="330" y="235" text-anchor="middle">4</text>
  <circle class="d-box" cx="490" cy="230" r="22"/>
  <text class="d-text" x="490" y="235" text-anchor="middle">5</text>
  <text class="d-sub" x="30" y="55">level 0</text>
  <text class="d-sub" x="30" y="145">level 1</text>
  <text class="d-sub" x="30" y="235">level 2</text>
  <text class="d-sub d-accent" x="370" y="18" text-anchor="middle">visit 1</text>
  <text class="d-sub d-accent" x="218" y="118" text-anchor="end">visit 2</text>
  <text class="d-sub d-accent" x="522" y="118">visit 3</text>
  <text class="d-sub d-accent" x="170" y="280" text-anchor="middle">visit 4</text>
  <text class="d-sub d-accent" x="330" y="280" text-anchor="middle">visit 5</text>
  <text class="d-sub d-accent" x="490" y="280" text-anchor="middle">visit 6</text>
</svg>

BFS finishes level 1 (vertices 1 and 2) before it touches level 2. The solid edges are the ones BFS used to discover each vertex; the dashed edge 4–5 was looked at but led to a vertex already found.

Now the same graph with DFS. It goes 0 → 1 → 3, hits a dead end at 3, backs up to 1, goes 1 → 4 → 5 → 2, and only then is everything visited:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="DFS on the same graph visits 0, 1, 3, then backtracks and visits 4, 5 and finally 2">
  <path class="d-edge-accent" d="M 370 50 L 250 140"/>
  <path class="d-edge-dashed" d="M 370 50 L 490 140"/>
  <path class="d-edge-accent" d="M 250 140 L 170 230"/>
  <path class="d-edge-accent" d="M 250 140 L 330 230"/>
  <path class="d-edge-accent" d="M 490 140 L 490 230"/>
  <path class="d-edge-accent" d="M 330 230 L 490 230"/>
  <circle class="d-box-accent" cx="370" cy="50" r="22"/>
  <text class="d-text" x="370" y="55" text-anchor="middle">0</text>
  <circle class="d-box" cx="250" cy="140" r="22"/>
  <text class="d-text" x="250" y="145" text-anchor="middle">1</text>
  <circle class="d-box" cx="490" cy="140" r="22"/>
  <text class="d-text" x="490" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="170" cy="230" r="22"/>
  <text class="d-text" x="170" y="235" text-anchor="middle">3</text>
  <circle class="d-box" cx="330" cy="230" r="22"/>
  <text class="d-text" x="330" y="235" text-anchor="middle">4</text>
  <circle class="d-box" cx="490" cy="230" r="22"/>
  <text class="d-text" x="490" y="235" text-anchor="middle">5</text>
  <text class="d-sub d-accent" x="370" y="18" text-anchor="middle">visit 1</text>
  <text class="d-sub d-accent" x="218" y="118" text-anchor="end">visit 2</text>
  <text class="d-sub d-accent" x="522" y="118">visit 6</text>
  <text class="d-sub d-accent" x="170" y="280" text-anchor="middle">visit 3</text>
  <text class="d-sub d-accent" x="330" y="280" text-anchor="middle">visit 4</text>
  <text class="d-sub d-accent" x="490" y="280" text-anchor="middle">visit 5</text>
</svg>

DFS reaches vertex 2 last, through the long way round (0 → 1 → 4 → 5 → 2), even though 2 is a direct neighbour of 0. That is exactly why DFS cannot be used for shortest paths: the first route it finds is not necessarily the shortest one.

The frontier itself is the whole difference. The same three waiting vertices are served in opposite orders:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="A queue serves the oldest waiting vertex first. A stack serves the newest waiting vertex first">
  <defs>
    <marker id="b21q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="65">queue</text>
  <path class="d-edge-accent" d="M 148 60 L 100 60" marker-end="url(#b21q2-arrow)"/>
  <text class="d-sub" x="124" y="38" text-anchor="middle">out</text>
  <rect class="d-box-accent" x="150" y="40" width="60" height="40" rx="6"/>
  <text class="d-text" x="180" y="65" text-anchor="middle">3</text>
  <rect class="d-box" x="220" y="40" width="60" height="40" rx="6"/>
  <text class="d-text" x="250" y="65" text-anchor="middle">4</text>
  <rect class="d-box" x="290" y="40" width="60" height="40" rx="6"/>
  <text class="d-text" x="320" y="65" text-anchor="middle">5</text>
  <path class="d-edge" d="M 430 60 L 356 60" marker-end="url(#b21q2-arrow)"/>
  <text class="d-sub" x="393" y="38" text-anchor="middle">in</text>
  <text class="d-sub" x="180" y="104" text-anchor="middle">front</text>
  <text class="d-sub" x="320" y="104" text-anchor="middle">back</text>
  <text class="d-sub" x="520" y="65" text-anchor="middle">BFS: oldest first</text>
  <text class="d-text" x="20" y="175">stack</text>
  <rect class="d-box" x="150" y="150" width="60" height="40" rx="6"/>
  <text class="d-text" x="180" y="175" text-anchor="middle">3</text>
  <rect class="d-box" x="220" y="150" width="60" height="40" rx="6"/>
  <text class="d-text" x="250" y="175" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="290" y="150" width="60" height="40" rx="6"/>
  <text class="d-text" x="320" y="175" text-anchor="middle">5</text>
  <path class="d-edge" d="M 430 160 L 356 160" marker-end="url(#b21q2-arrow)"/>
  <path class="d-edge-accent" d="M 354 182 L 428 182" marker-end="url(#b21q2-arrow)"/>
  <text class="d-sub" x="440" y="164">push</text>
  <text class="d-sub" x="440" y="190">pop</text>
  <text class="d-sub" x="180" y="214" text-anchor="middle">bottom</text>
  <text class="d-sub" x="320" y="214" text-anchor="middle">top</text>
  <text class="d-sub" x="560" y="175" text-anchor="middle">DFS: newest first</text>
</svg>

## 3. Side by Side

| | BFS | DFS |
| :--- | :--- | :--- |
| Frontier | queue (FIFO) | stack (LIFO) or recursion |
| Visit order | by distance from the start, level by level | one branch to the bottom, then backtrack |
| Shortest path (unweighted) | **yes** — the first time BFS reaches a vertex is by a shortest path | no — the first path found can be long |
| Time | O(V + E) | O(V + E) |
| Extra memory | the widest level of the graph | the deepest path of the graph |
| Typical uses | shortest path in steps, level-order, nearest X, multi-source spread | cycle detection, topological sort, backtracking, connected components, path existence |

📌 **Interview term: Shortest path in an unweighted graph** — the route with the fewest edges. BFS finds it because it reaches every vertex at distance d before any vertex at distance d + 1.

📌 **Interview term: Backtracking** — undoing the last step and trying the next option when a path cannot go further — the natural behaviour of DFS.

Both are O(V + E): every vertex enters the frontier once and every edge is examined once from each end (see [Big-O notation](/interview-question/what-is-big-o-notation)). The difference in **memory** is real and depends on the shape of the graph — example 2 measures it:

| Graph shape (1,000-ish vertices) | BFS queue peak | DFS depth peak |
| :--- | :--- | :--- |
| complete binary tree, 1,023 vertices | 512 | 10 |
| path (a line), 1,000 vertices | 1 | 1,000 |
| star (one hub + 999 leaves) | 999 | 2 |

A wide, shallow graph makes BFS hold a lot; a long, thin graph makes DFS go deep. On a line of 1,000 vertices the DFS depth is 1,000, which matters a lot when the "stack" is the language's call stack (see section 9 and [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)).

## 4. The Code in C++

BFS with \`std::queue\`, recording each vertex's distance from the start:

~~~cpp
// Visit in waves: everything 1 edge away, then 2 edges away, ...
std::vector<int> bfs(const Graph& adj, int start, std::vector<int>& dist) {
    dist.assign(adj.size(), -1);
    std::vector<int> order;
    std::queue<int> q;            // FIFO: push() at the back, front() + pop() at the front
    dist[start] = 0;
    q.push(start);
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        order.push_back(u);
        for (int v : adj[u]) {
            if (dist[v] == -1) {  // mark when ENQUEUED
                dist[v] = dist[u] + 1;
                q.push(v);
            }
        }
    }
    return order;
}
~~~

And DFS, first recursive, then with an explicit stack:

~~~cpp
// Go as deep as possible before backing up.
void dfsRecursive(const Graph& adj, int u, std::vector<bool>& seen, std::vector<int>& order) {
    seen[u] = true;
    order.push_back(u);
    for (int v : adj[u])
        if (!seen[v]) dfsRecursive(adj, v, seen, order);
}

// Same idea with an explicit stack (LIFO) instead of the call stack.
std::vector<int> dfsIterative(const Graph& adj, int start, bool reversePush) {
    std::vector<bool> seen(adj.size(), false);
    std::vector<int> order;
    std::stack<int> st;
    st.push(start);
    while (!st.empty()) {
        int u = st.top();         // top() reads, pop() removes (pop returns void)
        st.pop();
        if (seen[u]) continue;    // a node can sit on the stack twice
        seen[u] = true;
        order.push_back(u);
        const auto& nbrs = adj[u];
        for (size_t k = 0; k < nbrs.size(); ++k) {
            int v = reversePush ? nbrs[nbrs.size() - 1 - k] : nbrs[k];
            if (!seen[v]) st.push(v);
        }
    }
    return order;
}
~~~

**What to point out in this code:**

- \`std::queue\` and \`std::stack\` are container adaptors: they wrap another container, \`std::deque\` by default ([std::stack on cppreference](https://en.cppreference.com/w/cpp/container/stack)), and expose only the operations of a queue or stack.
- \`pop()\` returns \`void\`. You must read \`q.front()\` (queue) or \`st.top()\` (stack) first and then call \`pop()\`. Calling either on an empty container is undefined behaviour, so always check \`empty()\`.
- \`dist\` (filled with -1) doubles as the visited marker in BFS. Passing the graph as \`const Graph&\` avoids copying every adjacency list on each call.
- The examples use \`std::vector<bool>\` for small visited arrays. It is a bit-packed specialisation — fine for flags, but its \`operator[]\` returns a proxy, not a \`bool&\`; many people use \`std::vector<char>\` for speed.
- In the iterative DFS a vertex can be pushed twice, so it is skipped after popping if \`seen[u]\` is already set.
- Indexing \`nbrs[nbrs.size() - 1 - k]\` walks the neighbours backwards without copying, which makes the stack pop them in natural order.

📌 **Interview term: Container adaptor** — a C++ class such as \`std::queue\` or \`std::stack\` that wraps another container (by default \`std::deque\`) and exposes only a restricted interface.

## 5. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 builds a complete binary tree, a path and a star, and measures the largest BFS queue and the deepest DFS path with an explicit stack.

**Example 1 — BFS, recursive DFS and stack DFS on the same graph** prints:

~~~text
BFS order:             [0, 1, 2, 3, 4, 5]
BFS distance from 0:   [0, 1, 1, 2, 2, 2]
DFS recursive:         [0, 1, 3, 4, 5, 2]
DFS stack, push order: [0, 2, 5, 4, 1, 3]
DFS stack, reversed:   [0, 1, 3, 4, 5, 2]
~~~

**Example 2 — shortest path, and how much memory each search needs on three graph shapes** prints:

~~~text
BFS path 0 to 5: 0 -> 2 -> 5
DFS path 0 to 5: 0 -> 1 -> 4 -> 5
complete binary tree, 1023 nodes: BFS queue peak 512, DFS depth peak 10
path (a line), 1000 nodes: BFS queue peak 1, DFS depth peak 1000
star (hub + 999 leaves): BFS queue peak 999, DFS depth peak 2
~~~

## 6. Which One Should You Use?

- **"Fewest steps / minimum moves / nearest"** in an unweighted graph or grid → **BFS**. It is the reason BFS exists: [Rotting Oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs) (multi-source BFS) and the [word ladder](/interview-question/how-do-you-solve-the-word-ladder-problem) are both BFS shortest-path problems. With edge weights you need [Dijkstra](/interview-question/how-does-dijkstra-s-algorithm-work) instead — see [when BFS is enough](/interview-question/when-would-you-use-bfs-over-dijkstra-for-shortest-paths).
- **"Visit everything / count groups / is it connected"** → **either**. Number of islands and connected components work with both; DFS is usually shorter to write ([number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid), [connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph)).
- **"Does a cycle exist / what order respects the dependencies"** in a directed graph → **DFS** with three colours, or Kahn's BFS-based algorithm for topological order ([cycle detection](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph), [topological sort](/interview-question/what-is-topological-sort-and-when-is-it-used)).
- **"Try all possibilities / generate all paths"** → **DFS** (backtracking), because it only holds the current path in memory.
- **Copying or two-colouring a graph** → either; see [clone a graph](/interview-question/how-do-you-clone-a-graph) and [bipartite check](/interview-question/how-do-you-check-if-a-graph-is-bipartite).
- **Trees** are graphs without cycles: level-order traversal is BFS ([level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree)), and preorder/inorder/postorder are DFS ([tree traversal methods](/interview-question/what-are-the-tree-traversal-methods)).

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| BFS with \`std::queue\` | O(V + E) | O(V) | each vertex enqueued once, each adjacency list scanned once |
| DFS recursive | O(V + E) | O(V) stack frames | depth can reach V on a path; 200,000 crashed with an 8 MB stack |
| DFS with \`std::stack\` | O(V + E) | O(V + E) | a vertex may be pushed once per neighbour that sees it unvisited |

## 8. Edge Cases

- **Disconnected graph.** One BFS or DFS from vertex 0 only visits 0's component. To visit everything, loop over all vertices and start a new search from each unvisited one — that loop is exactly how you count components.
- **Cycles.** Without a visited set, both searches loop forever on the triangle 0–1–4–5–2–0 in the example. Mark vertices as visited.
- **Mark on enqueue, not on dequeue (BFS).** If you mark a vertex only when it leaves the queue, the same vertex can be queued many times (once per neighbour that discovers it). The answer stays right but memory and time blow up on dense graphs.
- **The iterative-DFS order surprise.** Pushing neighbours in their natural order makes the stack pop the *last* neighbour first, so example 1 prints \`[0, 2, 5, 4, 1, 3]\` for the stack version and \`[0, 1, 3, 4, 5, 2]\` for recursion. Push in reverse if you need the recursive order. Both are valid DFS orders.
- **Very deep graphs.** Recursive DFS on a long path uses one call-stack frame per vertex; section 9 shows where each language runs out.

## 9. How Deep Can Recursive DFS Go in C++?

C++ has no recursion limit of its own — the limit is the thread's stack size, typically 8 MB for the main thread on Linux (\`ulimit -s\` printed 8192 KB in our sandbox). We ran the recursive DFS from example 1 on path graphs compiled with \`g++ -O2\`: a 100,000-vertex path worked, a **200,000-vertex path crashed with a segmentation fault**. There is no exception to catch; the process just dies. The exact number depends on frame size, optimisation level and platform, so the robust interview answer is: **use an explicit \`std::stack\` or \`std::vector\` stack when depth could be large.** Example 2 measures depth with exactly such an explicit stack.

## Common Pitfalls

- **Expecting \`pop()\` to return the element.** It returns \`void\`; read \`front()\`/\`top()\` first.
- **\`front()\`/\`top()\`/\`pop()\` on an empty container.** Undefined behaviour, not an exception; always test \`empty()\`.
- **Recursive DFS on deep inputs.** A 200,000-vertex path segfaulted with the default 8 MB stack; use an explicit stack.
- **Passing the graph by value.** \`void dfs(Graph adj, ...)\` copies every adjacency list on every recursive call; use \`const Graph&\`.
- **Holding a reference into a vector you then grow.** \`auto& top = st.back(); st.push_back(...)\` can reallocate and leave \`top\` dangling (example 2 is written to avoid this).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The difference:</strong> <span style="color:#f0e2c8;">BFS takes the oldest discovered vertex next (a queue), DFS takes the newest (a stack or recursion).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Visit order:</strong> <span style="color:#f0e2c8;">BFS goes level by level from the start; DFS follows one branch to the end and backtracks.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">Both O(V + E) time. Memory: BFS holds the widest level, DFS holds the deepest path.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When to use:</strong> <span style="color:#f0e2c8;">BFS for fewest steps in an unweighted graph; DFS for cycles, topological sort, backtracking; either for components.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack</code> over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::deque</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code>; deep recursion is a segfault, not an exception.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does BFS give the shortest path?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It processes all vertices at distance d before any at distance d + 1, so the first time it reaches a vertex, no shorter route exists. Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt; parent</code> to rebuild the path.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pop()</code> return <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">void</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Returning by value could throw while copying after the element was already removed, losing it; splitting read (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top</code>) and remove (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code>) keeps the operation safe.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your recursive DFS crashed on a large input. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each call uses stack space and the main thread typically has about 8 MB; a long path overflows it and the process segfaults. Use an explicit stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if edges have weights?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use Dijkstra with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::priority_queue</code> — remember it is a max-heap, so use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::greater&lt;&gt;</code> or negate distances. BFS only works for equal weights.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does your stack DFS print a different order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The stack pops the last pushed neighbour first. Push neighbours in reverse to get the recursive order; both are valid DFS orders.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Graph traversal** | Visiting every reachable vertex once by following edges |
| **Breadth-first search (BFS)** | Visits vertices in order of distance using a FIFO queue |
| **Depth-first search (DFS)** | Goes deep along one path, then backtracks; LIFO stack or recursion |
| **Frontier** | Discovered but unprocessed vertices: the queue or the stack |
| **Visited set** | Record of discovered vertices that stops loops and repeats |
| **Shortest path in an unweighted graph** | Route with the fewest edges; BFS finds it |
| **Backtracking** | Undo the last step and try the next option |
| **Container adaptor** | \`std::queue\`/\`std::stack\`: a restricted interface over another container |

---
**Conclusion:** In C++, BFS is a \`std::queue\` loop that marks vertices when they are enqueued, and DFS is either a recursive function taking the graph by \`const&\` or a \`std::stack\`/\`std::vector\` loop. Both are O(V + E); BFS visits by distance and gives shortest paths in unweighted graphs, DFS dives deep and backtracks. Remember that \`pop()\` returns \`void\` and that deep recursion ends in a segfault, not an exception. Next, put both to work on [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) and [connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph), or compare them with Union-Find in [islands with DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).`,
        examples: [
          {
            label: "BFS order and distances vs recursive and stack-based DFS",
            code: `#include <iostream>
#include <queue>
#include <stack>
#include <string>
#include <utility>
#include <vector>

using Graph = std::vector<std::vector<int>>;

Graph build(int n, const std::vector<std::pair<int, int>>& edges) {
    Graph adj(n);
    for (auto [u, v] : edges) {
        adj[u].push_back(v);
        adj[v].push_back(u);
    }
    return adj;
}

// Visit in waves: everything 1 edge away, then 2 edges away, ...
std::vector<int> bfs(const Graph& adj, int start, std::vector<int>& dist) {
    dist.assign(adj.size(), -1);
    std::vector<int> order;
    std::queue<int> q;            // FIFO: push() at the back, front() + pop() at the front
    dist[start] = 0;
    q.push(start);
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        order.push_back(u);
        for (int v : adj[u]) {
            if (dist[v] == -1) {  // mark when ENQUEUED
                dist[v] = dist[u] + 1;
                q.push(v);
            }
        }
    }
    return order;
}

// Go as deep as possible before backing up.
void dfsRecursive(const Graph& adj, int u, std::vector<bool>& seen, std::vector<int>& order) {
    seen[u] = true;
    order.push_back(u);
    for (int v : adj[u])
        if (!seen[v]) dfsRecursive(adj, v, seen, order);
}

// Same idea with an explicit stack (LIFO) instead of the call stack.
std::vector<int> dfsIterative(const Graph& adj, int start, bool reversePush) {
    std::vector<bool> seen(adj.size(), false);
    std::vector<int> order;
    std::stack<int> st;
    st.push(start);
    while (!st.empty()) {
        int u = st.top();         // top() reads, pop() removes (pop returns void)
        st.pop();
        if (seen[u]) continue;    // a node can sit on the stack twice
        seen[u] = true;
        order.push_back(u);
        const auto& nbrs = adj[u];
        for (size_t k = 0; k < nbrs.size(); ++k) {
            int v = reversePush ? nbrs[nbrs.size() - 1 - k] : nbrs[k];
            if (!seen[v]) st.push(v);
        }
    }
    return order;
}

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); ++i) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

int main() {
    Graph adj = build(6, {{0, 1}, {0, 2}, {1, 3}, {1, 4}, {2, 5}, {4, 5}});
    std::vector<int> dist;
    std::vector<int> order = bfs(adj, 0, dist);
    std::vector<bool> seen(6, false);
    std::vector<int> rec;
    dfsRecursive(adj, 0, seen, rec);
    std::cout << "BFS order:             " << fmt(order) << "\\n";
    std::cout << "BFS distance from 0:   " << fmt(dist) << "\\n";
    std::cout << "DFS recursive:         " << fmt(rec) << "\\n";
    std::cout << "DFS stack, push order: " << fmt(dfsIterative(adj, 0, false)) << "\\n";
    std::cout << "DFS stack, reversed:   " << fmt(dfsIterative(adj, 0, true)) << "\\n";
}`,
          },
          {
            label: "BFS vs DFS paths, and queue size vs stack depth on three graph shapes",
            code: `#include <algorithm>
#include <iostream>
#include <queue>
#include <string>
#include <utility>
#include <vector>

using Graph = std::vector<std::vector<int>>;
using Edges = std::vector<std::pair<int, int>>;

Graph build(int n, const Edges& edges) {
    Graph adj(n);
    for (auto [u, v] : edges) {
        adj[u].push_back(v);
        adj[v].push_back(u);
    }
    return adj;
}

std::string pathTo(const std::vector<int>& parent, int target) {
    std::vector<int> path;
    for (int x = target; x != -1; x = parent[x]) path.push_back(x);
    std::reverse(path.begin(), path.end());
    std::string s;
    for (size_t i = 0; i < path.size(); ++i) s += (i ? " -> " : "") + std::to_string(path[i]);
    return s;
}

std::string bfsPath(const Graph& adj, int s, int t) {
    std::vector<int> parent(adj.size(), -1);
    std::vector<bool> seen(adj.size(), false);
    seen[s] = true;
    std::queue<int> q;
    q.push(s);
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        if (u == t) break;
        for (int v : adj[u]) {
            if (!seen[v]) {
                seen[v] = true;
                parent[v] = u;
                q.push(v);
            }
        }
    }
    return pathTo(parent, t);
}

bool go(const Graph& adj, int u, int t, std::vector<bool>& seen, std::vector<int>& parent) {
    seen[u] = true;
    if (u == t) return true;
    for (int v : adj[u]) {
        if (!seen[v]) {
            parent[v] = u;
            if (go(adj, v, t, seen, parent)) return true;
        }
    }
    return false;
}

std::string dfsPath(const Graph& adj, int s, int t) {
    std::vector<int> parent(adj.size(), -1);
    std::vector<bool> seen(adj.size(), false);
    go(adj, s, t, seen, parent);
    return pathTo(parent, t);
}

// Largest number of nodes waiting in the BFS queue at one time.
size_t bfsMaxQueue(const Graph& adj, int s) {
    std::vector<bool> seen(adj.size(), false);
    seen[s] = true;
    std::queue<int> q;
    q.push(s);
    size_t peak = 1;
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        for (int v : adj[u]) {
            if (!seen[v]) {
                seen[v] = true;
                q.push(v);
            }
        }
        peak = std::max(peak, q.size());
    }
    return peak;
}

// Deepest DFS path: an explicit stack of {node, next neighbour index} that
// behaves exactly like the recursive version's call stack.
size_t dfsMaxDepth(const Graph& adj, int s) {
    std::vector<bool> seen(adj.size(), false);
    seen[s] = true;
    std::vector<std::pair<int, size_t>> st = {{s, 0}};
    size_t peak = 1;
    while (!st.empty()) {
        auto& [u, i] = st.back();      // reference: we update i in place
        if (i < adj[u].size()) {
            int v = adj[u][i++];
            if (!seen[v]) {
                seen[v] = true;
                st.push_back({v, 0});  // may reallocate: do not use u or i after this
                peak = std::max(peak, st.size());
            }
        } else {
            st.pop_back();
        }
    }
    return peak;
}

int main() {
    Graph g = build(6, {{0, 1}, {0, 2}, {1, 3}, {1, 4}, {2, 5}, {4, 5}});
    std::cout << "BFS path 0 to 5: " << bfsPath(g, 0, 5) << "\\n"; // 0 -> 2 -> 5
    std::cout << "DFS path 0 to 5: " << dfsPath(g, 0, 5) << "\\n"; // 0 -> 1 -> 4 -> 5

    Edges tree, line, star;
    for (int i = 0; i < 1023; ++i)
        for (int c : {2 * i + 1, 2 * i + 2}) if (c < 1023) tree.push_back({i, c});
    for (int i = 0; i < 999; ++i) line.push_back({i, i + 1});
    for (int i = 1; i < 1000; ++i) star.push_back({0, i});
    struct Shape { std::string name; int n; const Edges* edges; };
    std::vector<Shape> shapes = {{"complete binary tree, 1023 nodes", 1023, &tree},
                                 {"path (a line), 1000 nodes", 1000, &line},
                                 {"star (hub + 999 leaves)", 1000, &star}};
    for (const auto& sh : shapes) {
        Graph adj = build(sh.n, *sh.edges);
        std::cout << sh.name << ": BFS queue peak " << bfsMaxQueue(adj, 0)
                  << ", DFS depth peak " << dfsMaxDepth(adj, 0) << "\\n";
    }
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you count the number of islands in a grid?",
    difficulty: "medium",
    seoDescription: "Count islands in a grid by scanning and flood-filling each new piece of land, with verified Python, JavaScript, Java and C++ code and recursion limits.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given a 2-D grid of '1's (land) and '0's (water). An island is a group of land cells connected horizontally or vertically. Write a Python function that returns the number of islands."

**What a strong answer should cover:**
- Model the grid as an implicit graph; an island is a connected component of land cells.
- Scan every cell; each unvisited land cell starts a new island, then flood-fill (DFS or BFS) to mark the whole island.
- Mark cells as visited before (or as) you explore them, either by sinking them in place or with a visited grid.
- O(rows × cols) time; O(rows × cols) worst-case space for the recursion or the explicit stack.
- Python details: the default recursion limit of 1000 makes recursive DFS fail on a mostly-land grid as small as 32 × 32, so an explicit list stack (or \`collections.deque\` BFS) is the robust version; strings are immutable, so convert rows to lists before sinking.

**Clarifying questions expected:**
- Do diagonal cells count as connected?
- May I modify the input grid?
- How large can the grid be?

**Code / implementation expected:** Yes — a nested loop plus a flood fill (recursive \`sink\` and an iterative version), in Python.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know 2-D arrays, and ideally what BFS and DFS are  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are handed a printed map of an archipelago drawn on squared paper: every square is either land or sea. Your job is to count the islands, and you have a highlighter.

You read the map like a book, left to right, top to bottom. The first time your eye lands on an un-highlighted land square, you say "that's a new island!", add one to your count, and then highlight *every* land square you can reach from it by stepping up, down, left or right — the whole island, however oddly shaped. Then you keep reading. Any land square you meet later that is already highlighted belongs to an island you have counted, so you skip it.

When you reach the bottom-right corner, your count is the answer. That is the whole algorithm. The highlighter is called a **flood fill**, and the "reading order" is just two nested loops. The interview question is whether you can write it cleanly, explain why it is O(rows × cols), and handle the traps: diagonal squares, modifying the input, and grids so large that recursion breaks.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do diagonal neighbours count as connected? | The classic version uses 4 directions. With 8 directions the \`101 / 010 / 101\` grid is 1 island instead of 5 (example 2). |
| May I modify the grid? | If yes, "sink" visited land by overwriting it — no extra memory. If no, keep a separate visited grid. |
| What are the cell values — characters \`'1'\`/\`'0'\` or integers? | The common LeetCode-style input is characters; comparing a character with the number 1 is a silent bug in some languages. |
| How big can the grid be? | Large, mostly-land grids make recursive DFS go very deep; the safe choice is an iterative stack or BFS. |
| Is everything outside the grid water? | Usually yes. Variants (closed islands, enclaves) treat islands touching the border differently. |
| Can the grid be empty, or rows have different lengths? | Guard \`rows == 0\` before reading \`grid[0]\`. |

## 3. The Core Idea: Scan, Then Flood Fill

Treat the grid as a graph: each land cell is a vertex, and two land cells are joined by an edge when they are side by side (up, down, left or right). An island is then a **connected component** of that graph, and counting islands is counting components (the general version is [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph)). You never build the graph; you compute neighbours on the fly (see [implicit graphs](/interview-question/what-is-a-graph-and-how-do-you-represent-it)).

📌 **Interview term: Grid graph** — a 2-D grid viewed as a graph: cells are vertices, and each cell is connected to its 4 (or 8) neighbours. It is an implicit graph — edges are computed, not stored.

📌 **Interview term: 4-directional adjacency** — two cells are neighbours only if they share a side: (r ± 1, c) or (r, c ± 1). 8-directional also counts the four diagonals.

📌 **Interview term: Flood fill** — starting from one cell, visit every cell reachable through same-coloured neighbours — the paint-bucket tool. Implemented with DFS or BFS.

📌 **Interview term: Connected component** — a maximal group of vertices in which every vertex can reach every other. Each island is one connected component of land cells.

Here is grid 2 from the examples, with each island lettered in the order the scan finds it:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 240" role="img" aria-label="A four by five grid with three islands: A has four cells in the top left, B is one cell in the middle, C has two cells in the bottom right">
  <rect class="d-box-accent" x="40" y="20" width="48" height="48"/>
  <text class="d-text" x="64" y="49" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="88" y="20" width="48" height="48"/>
  <text class="d-text" x="112" y="49" text-anchor="middle">A</text>
  <rect class="d-box-muted" x="136" y="20" width="48" height="48"/>
  <rect class="d-box-muted" x="184" y="20" width="48" height="48"/>
  <rect class="d-box-muted" x="232" y="20" width="48" height="48"/>
  <rect class="d-box-accent" x="40" y="68" width="48" height="48"/>
  <text class="d-text" x="64" y="97" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="88" y="68" width="48" height="48"/>
  <text class="d-text" x="112" y="97" text-anchor="middle">A</text>
  <rect class="d-box-muted" x="136" y="68" width="48" height="48"/>
  <rect class="d-box-muted" x="184" y="68" width="48" height="48"/>
  <rect class="d-box-muted" x="232" y="68" width="48" height="48"/>
  <rect class="d-box-muted" x="40" y="116" width="48" height="48"/>
  <rect class="d-box-muted" x="88" y="116" width="48" height="48"/>
  <rect class="d-box" x="136" y="116" width="48" height="48"/>
  <text class="d-text" x="160" y="145" text-anchor="middle">B</text>
  <rect class="d-box-muted" x="184" y="116" width="48" height="48"/>
  <rect class="d-box-muted" x="232" y="116" width="48" height="48"/>
  <rect class="d-box-muted" x="40" y="164" width="48" height="48"/>
  <rect class="d-box-muted" x="88" y="164" width="48" height="48"/>
  <rect class="d-box-muted" x="136" y="164" width="48" height="48"/>
  <rect class="d-box-accent" x="184" y="164" width="48" height="48"/>
  <text class="d-text" x="208" y="193" text-anchor="middle">C</text>
  <rect class="d-box-accent" x="232" y="164" width="48" height="48"/>
  <text class="d-text" x="256" y="193" text-anchor="middle">C</text>
  <text class="d-text" x="340" y="60">A: found at (0, 0), 4 cells</text>
  <text class="d-text" x="340" y="120">B: found at (2, 2), 1 cell</text>
  <text class="d-text" x="340" y="180">C: found at (3, 3), 2 cells</text>
</svg>

B touches A only at a corner, so with 4-directional adjacency it is a separate island. The scan finds A at (0, 0) and sinks all four of its cells, so (0, 1), (1, 0) and (1, 1) are already water by the time the scan reaches them.

The flood fill itself only ever asks one question per cell: which of my four neighbours are still unvisited land?

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="A cell at row r and column c has four neighbours: up, down, left and right">
  <defs>
    <marker id="b21q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="245" y="110" width="110" height="44" rx="8"/>
  <text class="d-text" x="300" y="137" text-anchor="middle">(r, c)</text>
  <rect class="d-box" x="245" y="20" width="110" height="44" rx="8"/>
  <text class="d-text" x="300" y="47" text-anchor="middle">(r-1, c)</text>
  <rect class="d-box" x="245" y="200" width="110" height="44" rx="8"/>
  <text class="d-text" x="300" y="227" text-anchor="middle">(r+1, c)</text>
  <rect class="d-box" x="70" y="110" width="110" height="44" rx="8"/>
  <text class="d-text" x="125" y="137" text-anchor="middle">(r, c-1)</text>
  <rect class="d-box" x="420" y="110" width="110" height="44" rx="8"/>
  <text class="d-text" x="475" y="137" text-anchor="middle">(r, c+1)</text>
  <path class="d-edge-accent" d="M 300 108 L 300 70" marker-end="url(#b21q3-arrow)"/>
  <path class="d-edge-accent" d="M 300 156 L 300 194" marker-end="url(#b21q3-arrow)"/>
  <path class="d-edge-accent" d="M 243 132 L 186 132" marker-end="url(#b21q3-arrow)"/>
  <path class="d-edge-accent" d="M 357 132 L 414 132" marker-end="url(#b21q3-arrow)"/>
  <text class="d-sub" x="314" y="94">up</text>
  <text class="d-sub" x="314" y="182">down</text>
  <text class="d-sub" x="214" y="122" text-anchor="middle">left</text>
  <text class="d-sub" x="386" y="122" text-anchor="middle">right</text>
  <text class="d-sub" x="540" y="40" text-anchor="middle">skip: off grid or water</text>
</svg>

Each neighbour is first checked against the grid bounds, then against "is it land that has not been visited yet?". Only then does the fill move there.

## 4. From Brute Force to Flood Fill

**A tempting wrong idea:** count land cells that have no land neighbour above or to the left (a "top-left corner" rule). It works for rectangles but fails on shapes like a U, which has two such corners but is one island. Islands can be any shape, so you need to actually explore them.

**The algorithm:**

1. Loop over every cell, row by row.
2. When a cell is land and not yet visited, add 1 to the count — this cell starts a new island.
3. Flood-fill from it, marking every reachable land cell as visited, so none of them can start another island.

📌 **Interview term: Sinking an island** — marking visited land by overwriting it with water in the input grid itself. It saves the visited array, but it destroys the input.

Walking the scan over grid 2:

| Cell reached by the scan | Land and unvisited? | Action | Count |
| :--- | :--- | :--- | :--- |
| (0, 0) | yes | new island; fill sinks (0,0), (1,0), (0,1), (1,1) | 1 |
| (0, 1), (1, 0), (1, 1) | no — already sunk | skip | 1 |
| (2, 2) | yes | new island; fill sinks just (2,2) — its neighbours are water | 2 |
| (3, 3) | yes | new island; fill sinks (3,3), (3,4) | 3 |
| (3, 4) | no — already sunk | skip | 3 |

Every cell is looked at by the scan once and entered by a flood fill at most once, and each entry checks 4 neighbours — so the work is proportional to rows × cols.

## 5. The Code in Python

The recursive version is the one most people write first. The inner function \`sink\` closes over \`grid\`, \`rows\` and \`cols\`:

~~~python
def num_islands(grid):
    """Count groups of '1' cells joined up, down, left or right.
    Sinks each island (sets its cells to '0') so it is never counted twice."""
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])

    def sink(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != "1":
            return                      # off the map, water, or already sunk
        grid[r][c] = "0"                # mark visited BEFORE recursing
        sink(r + 1, c)
        sink(r - 1, c)
        sink(r, c + 1)
        sink(r, c - 1)

    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1":       # an unvisited piece of land: a new island
                count += 1
                sink(r, c)
    return count
~~~

**What to point out in this code:**

- The guard \`r < 0 or r >= rows or ...\` comes **first**. Python's negative indexes would otherwise silently wrap around: \`grid[-1]\` is the last row, so a missing bounds check does not crash — it joins cells from opposite edges of the map.
- \`grid[r][c] = "0"\` happens *before* the four recursive calls. If you marked after, two neighbours could keep calling each other forever.
- Python strings are immutable, so \`parse\` turns each row string into a \`list\` of characters first; \`grid[r][c] = "0"\` on a string row would raise \`TypeError\`.
- The function sinks the caller's grid. If the caller still needs it, pass a copy (\`[row[:] for row in grid]\`) or use a visited grid as in section 6.
- Each recursive call is a Python stack frame — and Python stops at 1000 of them by default.

📌 **Interview term: Recursion depth** — how many function calls are waiting on the call stack at once. A flood fill over one island of k cells can be k calls deep.

## 6. When Recursion Is Not Safe: an Explicit Stack

We ran the recursive \`sink\` from section 5 on all-land square grids in our sandbox (Python 3.13, default limit 1000): a 31 × 31 grid worked, and a **32 × 32 grid (1,024 cells) raised \`RecursionError: maximum recursion depth exceeded\`**. A real interview grid can be 300 × 300. The fix is to manage the stack yourself, with a plain list, and — as a bonus — to keep a separate \`seen\` grid so the input is left untouched:

~~~python
def island_sizes(grid, dirs=FOUR):
    """Iterative DFS with an explicit stack and a separate visited grid:
    no recursion limit, and the caller's grid is left untouched."""
    rows = len(grid)
    cols = len(grid[0]) if rows else 0
    seen = [[False] * cols for _ in range(rows)]
    sizes = []
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != "1" or seen[r][c]:
                continue
            seen[r][c] = True               # mark when PUSHED
            stack, size = [(r, c)], 0
            while stack:
                cr, cc = stack.pop()
                size += 1
                for dr, dc in dirs:
                    nr, nc = cr + dr, cc + dc
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1" and not seen[nr][nc]:
                        seen[nr][nc] = True
                        stack.append((nr, nc))
            sizes.append(size)
    return sorted(sizes)
~~~

Here \`stack.append\` / \`stack.pop()\` work on the end of the list in O(1). A cell is marked \`seen\` when it is **pushed**, so it can never be on the stack twice. Swapping the list for \`collections.deque\` and \`pop()\` for \`popleft()\` turns this into BFS with the same result. Example 2 runs this version on a 500 × 500 all-land grid (one island of 250,000 cells) without any recursion problem.

## 7. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 builds its random 300 × 300 grid with a small deterministic generator (MINSTD), so every language sees the same map and finds the same 7,987 islands.

**Example 1 — the recursive flood fill on seven grids** prints:

~~~text
1
3
5
1
1
0
0
~~~

**Example 2 — iterative DFS with a visited grid: sizes, 8 directions, and large grids** prints:

~~~text
grid 2: 3 islands, sizes [1, 2, 4]
diagonal grid: 4-way 5, 8-way 1
input unchanged: true
500 x 500 all land: count 1, largest 250000
200 x 200 checkerboard: count 20000, largest 1
random 300 x 300 (45% land): count 7987, largest 161
~~~

## 8. Edge Cases and Follow-Ups

- **Empty grid** (\`[]\`) — return 0 before touching \`grid[0]\` (example 1).
- **All water / single cell** — 0, or 1 for a single land cell (example 1).
- **A ring of land around water** (\`111 / 101 / 111\`) — 1 island; the water inside does not split it (example 1).
- **Diagonal-only contact** (\`101 / 010 / 101\`) — 5 islands with 4 directions, 1 with 8 directions (examples 1 and 2). Make the direction list a parameter.
- **One giant island** — the worst case for recursion depth (section 6).
- **Follow-up: island sizes / max area.** Count cells inside the fill and return the size instead of discarding it (example 2 prints the sizes \`[1, 2, 4]\`).
- **Follow-up: land appears one cell at a time** ("Number of Islands II"). Rerunning the fill after every addition is slow; Union-Find answers each addition in near-constant time — see [islands with DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).
- **Related grid searches:** spreading from many cells at once is multi-source BFS ([Rotting Oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs)); DFS with memoisation on a grid is [longest increasing path in a matrix](/interview-question/longest-increasing-path-in-matrix-why-dfs-memo-beats-brute-force).

## 9. Complexity

| Version | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Recursive sink | O(R × C) | O(R × C) call frames worst case | one giant island makes the recursion that deep; capped at about 1000 frames by default |
| Iterative stack + \`seen\` grid | O(R × C) | O(R × C) | \`seen\` is R × C booleans; the stack can hold many cells at once |
| BFS with \`deque\` | O(R × C) | O(R × C) | same marks; the queue holds about one "ring" of the fill |

R × C is the number of cells; each cell is scanned once and entered by a fill at most once, with 4 neighbour checks.

## Common Pitfalls

- **Missing or late bounds check.** Negative indexes wrap around in Python, so \`grid[r - 1]\` at \`r = 0\` reads the last row instead of failing.
- **Recursion on big grids.** A 32 × 32 all-land grid already exceeds the default limit; use an explicit stack or BFS.
- **Comparing with the wrong type.** The grid holds the characters \`"1"\`/\`"0"\`; \`grid[r][c] == 1\` is always \`False\` and the answer is always 0.
- **Trying to sink cells in a string row.** \`row[c] = "0"\` raises \`TypeError\` because \`str\` is immutable; convert rows to lists.
- **Marking visited after exploring.** Mark the cell before (or as) you push or recurse, or cells get processed many times.
- **\`[[False] * cols] * rows\` for the visited grid.** That repeats one row object; marking a cell marks the whole column. Use a comprehension.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">The grid is a graph: land cells are vertices, side-by-side land cells are edges; an island is a connected component.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">Scan every cell; each unvisited <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"1"</code> adds 1 to the count and starts a flood fill that marks its whole island.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Marking:</strong> <span style="color:#f0e2c8;">Sink visited cells to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"0"</code> if the input may change, otherwise keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen</code> grid; mark before exploring.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(rows × cols) time; O(rows × cols) worst-case space for the stack or recursion.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Recursive DFS hits the 1000-frame default limit on a 32 × 32 land grid, so I would ship the explicit list-stack (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque</code> BFS) version.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if diagonal cells also connect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use 8 directions in the neighbour list. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">101 / 010 / 101</code> grid then becomes 1 island instead of 5.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid modifying the input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen = [[False] * cols for _ in range(rows)]</code>, or copy the grid first with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[row[:] for row in grid]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just raise the recursion limit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.setrecursionlimit</code> lifts Python's guard, but deep recursion can then overflow the real C stack and crash the interpreter. An explicit stack has no such limit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the size of the largest island?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count cells inside each fill and keep the maximum; example 2 returns all sizes sorted.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if land is added one cell at a time and you must report the count after each?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use Union-Find: each new cell starts as its own island and is unioned with land neighbours, decreasing the count on each successful union.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Grid graph** | Cells are vertices; each joins its 4 (or 8) neighbours; edges are computed |
| **4-directional adjacency** | Neighbours share a side; 8-directional adds diagonals |
| **Flood fill** | Visit every cell reachable from a start cell — the paint bucket |
| **Connected component** | Maximal group of mutually reachable vertices; one island |
| **Sinking an island** | Mark visited land by overwriting it with water in the input |
| **Recursion depth** | Number of calls waiting on the call stack at the same time |

---
**Conclusion:** In Python, counting islands is two nested loops plus a flood fill: every unvisited \`"1"\` is a new island, and the fill marks the rest of it so it is never counted again. It runs in O(rows × cols). Write the short recursive version if you like, but know that it fails at the default 1000-frame limit on grids as small as 32 × 32, and ship the explicit list-stack (or \`deque\` BFS) version with a \`seen\` grid for real inputs. For the three-way comparison with Union-Find, see [islands with DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).`,
        examples: [
          {
            label: "Recursive flood fill: count islands on seven grids",
            code: `def num_islands(grid):
    """Count groups of '1' cells joined up, down, left or right.
    Sinks each island (sets its cells to '0') so it is never counted twice."""
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])

    def sink(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != "1":
            return                      # off the map, water, or already sunk
        grid[r][c] = "0"                # mark visited BEFORE recursing
        sink(r + 1, c)
        sink(r - 1, c)
        sink(r, c + 1)
        sink(r, c - 1)

    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1":       # an unvisited piece of land: a new island
                count += 1
                sink(r, c)
    return count


def parse(rows):
    """Turn ["110", "011"] into a mutable list of lists of characters."""
    return [list(row) for row in rows]


print(num_islands(parse(["11110", "11010", "11000", "00000"])))  # 1
print(num_islands(parse(["11000", "11000", "00100", "00011"])))  # 3
print(num_islands(parse(["101", "010", "101"])))  # 5
print(num_islands(parse(["111", "101", "111"])))  # 1
print(num_islands(parse(["1"])))  # 1
print(num_islands(parse(["0"])))  # 0
print(num_islands(parse([])))  # 0`,
          },
          {
            label: "Iterative DFS, visited grid, island sizes, 8 directions, large grids",
            code: `FOUR = ((1, 0), (-1, 0), (0, 1), (0, -1))
EIGHT = FOUR + ((1, 1), (1, -1), (-1, 1), (-1, -1))


def island_sizes(grid, dirs=FOUR):
    """Iterative DFS with an explicit stack and a separate visited grid:
    no recursion limit, and the caller's grid is left untouched."""
    rows = len(grid)
    cols = len(grid[0]) if rows else 0
    seen = [[False] * cols for _ in range(rows)]
    sizes = []
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != "1" or seen[r][c]:
                continue
            seen[r][c] = True               # mark when PUSHED
            stack, size = [(r, c)], 0
            while stack:
                cr, cc = stack.pop()
                size += 1
                for dr, dc in dirs:
                    nr, nc = cr + dr, cc + dc
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1" and not seen[nr][nc]:
                        seen[nr][nc] = True
                        stack.append((nr, nc))
            sizes.append(size)
    return sorted(sizes)


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


def report(name, grid):
    sizes = island_sizes(grid)
    print(name + ": count " + str(len(sizes)) + ", largest " + str(sizes[-1] if sizes else 0))


g2 = ["11000", "11000", "00100", "00011"]
print("grid 2: " + str(len(island_sizes(g2))) + " islands, sizes " + fmt(island_sizes(g2)))
diag = ["101", "010", "101"]
print("diagonal grid: 4-way " + str(len(island_sizes(diag))) + ", 8-way " + str(len(island_sizes(diag, EIGHT))))
before = list(g2)
island_sizes(g2)
print("input unchanged: " + str(g2 == before).lower())

report("500 x 500 all land", ["1" * 500] * 500)
report("200 x 200 checkerboard", ["".join("1" if (r + c) % 2 == 0 else "0" for c in range(200)) for r in range(200)])

seed, rows = 7, []
for r in range(300):
    row = []
    for c in range(300):
        seed = seed * 48271 % 2147483647    # MINSTD: the same grid in every language
        row.append("1" if seed % 100 < 45 else "0")
    rows.append("".join(row))
report("random 300 x 300 (45% land)", rows)`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given a 2-D grid of '1's (land) and '0's (water). An island is a group of land cells connected horizontally or vertically. Write a JavaScript function that returns the number of islands."

**What a strong answer should cover:**
- Model the grid as an implicit graph; an island is a connected component of land cells.
- Scan every cell; each unvisited land cell starts a new island, then flood-fill (DFS or BFS) to mark the whole island.
- Mark cells as visited before (or as) you explore them, either by sinking them in place or with a visited array.
- O(rows × cols) time; O(rows × cols) worst-case space for the recursion or the explicit stack.
- JavaScript details: \`grid[-1]\` is \`undefined\` rather than an error, strings are immutable (split rows into arrays before sinking), deep recursion throws \`RangeError\`, and a flat \`Uint8Array\` makes a cheap visited grid.

**Clarifying questions expected:**
- Do diagonal cells count as connected?
- May I modify the input grid?
- How large can the grid be?

**Code / implementation expected:** Yes — a nested loop plus a flood fill (recursive \`sink\` and an iterative version), in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know 2-D arrays, and ideally what BFS and DFS are  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are handed a printed map of an archipelago drawn on squared paper: every square is either land or sea. Your job is to count the islands, and you have a highlighter.

You read the map like a book, left to right, top to bottom. The first time your eye lands on an un-highlighted land square, you say "that's a new island!", add one to your count, and then highlight *every* land square you can reach from it by stepping up, down, left or right — the whole island, however oddly shaped. Then you keep reading. Any land square you meet later that is already highlighted belongs to an island you have counted, so you skip it.

When you reach the bottom-right corner, your count is the answer. That is the whole algorithm. The highlighter is called a **flood fill**, and the "reading order" is just two nested loops. The interview question is whether you can write it cleanly, explain why it is O(rows × cols), and handle the traps: diagonal squares, modifying the input, and grids so large that recursion breaks.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do diagonal neighbours count as connected? | The classic version uses 4 directions. With 8 directions the \`101 / 010 / 101\` grid is 1 island instead of 5 (example 2). |
| May I modify the grid? | If yes, "sink" visited land by overwriting it — no extra memory. If no, keep a separate visited grid. |
| What are the cell values — characters \`'1'\`/\`'0'\` or integers? | The common LeetCode-style input is characters; comparing a character with the number 1 is a silent bug in some languages. |
| How big can the grid be? | Large, mostly-land grids make recursive DFS go very deep; the safe choice is an iterative stack or BFS. |
| Is everything outside the grid water? | Usually yes. Variants (closed islands, enclaves) treat islands touching the border differently. |
| Can the grid be empty, or rows have different lengths? | Guard \`rows == 0\` before reading \`grid[0]\`. |

## 3. The Core Idea: Scan, Then Flood Fill

Treat the grid as a graph: each land cell is a vertex, and two land cells are joined by an edge when they are side by side (up, down, left or right). An island is then a **connected component** of that graph, and counting islands is counting components (the general version is [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph)). You never build the graph; you compute neighbours on the fly (see [implicit graphs](/interview-question/what-is-a-graph-and-how-do-you-represent-it)).

📌 **Interview term: Grid graph** — a 2-D grid viewed as a graph: cells are vertices, and each cell is connected to its 4 (or 8) neighbours. It is an implicit graph — edges are computed, not stored.

📌 **Interview term: 4-directional adjacency** — two cells are neighbours only if they share a side: (r ± 1, c) or (r, c ± 1). 8-directional also counts the four diagonals.

📌 **Interview term: Flood fill** — starting from one cell, visit every cell reachable through same-coloured neighbours — the paint-bucket tool. Implemented with DFS or BFS.

📌 **Interview term: Connected component** — a maximal group of vertices in which every vertex can reach every other. Each island is one connected component of land cells.

Here is grid 2 from the examples, with each island lettered in the order the scan finds it:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 240" role="img" aria-label="A four by five grid with three islands: A has four cells in the top left, B is one cell in the middle, C has two cells in the bottom right">
  <rect class="d-box-accent" x="40" y="20" width="48" height="48"/>
  <text class="d-text" x="64" y="49" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="88" y="20" width="48" height="48"/>
  <text class="d-text" x="112" y="49" text-anchor="middle">A</text>
  <rect class="d-box-muted" x="136" y="20" width="48" height="48"/>
  <rect class="d-box-muted" x="184" y="20" width="48" height="48"/>
  <rect class="d-box-muted" x="232" y="20" width="48" height="48"/>
  <rect class="d-box-accent" x="40" y="68" width="48" height="48"/>
  <text class="d-text" x="64" y="97" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="88" y="68" width="48" height="48"/>
  <text class="d-text" x="112" y="97" text-anchor="middle">A</text>
  <rect class="d-box-muted" x="136" y="68" width="48" height="48"/>
  <rect class="d-box-muted" x="184" y="68" width="48" height="48"/>
  <rect class="d-box-muted" x="232" y="68" width="48" height="48"/>
  <rect class="d-box-muted" x="40" y="116" width="48" height="48"/>
  <rect class="d-box-muted" x="88" y="116" width="48" height="48"/>
  <rect class="d-box" x="136" y="116" width="48" height="48"/>
  <text class="d-text" x="160" y="145" text-anchor="middle">B</text>
  <rect class="d-box-muted" x="184" y="116" width="48" height="48"/>
  <rect class="d-box-muted" x="232" y="116" width="48" height="48"/>
  <rect class="d-box-muted" x="40" y="164" width="48" height="48"/>
  <rect class="d-box-muted" x="88" y="164" width="48" height="48"/>
  <rect class="d-box-muted" x="136" y="164" width="48" height="48"/>
  <rect class="d-box-accent" x="184" y="164" width="48" height="48"/>
  <text class="d-text" x="208" y="193" text-anchor="middle">C</text>
  <rect class="d-box-accent" x="232" y="164" width="48" height="48"/>
  <text class="d-text" x="256" y="193" text-anchor="middle">C</text>
  <text class="d-text" x="340" y="60">A: found at (0, 0), 4 cells</text>
  <text class="d-text" x="340" y="120">B: found at (2, 2), 1 cell</text>
  <text class="d-text" x="340" y="180">C: found at (3, 3), 2 cells</text>
</svg>

B touches A only at a corner, so with 4-directional adjacency it is a separate island. The scan finds A at (0, 0) and sinks all four of its cells, so (0, 1), (1, 0) and (1, 1) are already water by the time the scan reaches them.

The flood fill itself only ever asks one question per cell: which of my four neighbours are still unvisited land?

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="A cell at row r and column c has four neighbours: up, down, left and right">
  <defs>
    <marker id="b21q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="245" y="110" width="110" height="44" rx="8"/>
  <text class="d-text" x="300" y="137" text-anchor="middle">(r, c)</text>
  <rect class="d-box" x="245" y="20" width="110" height="44" rx="8"/>
  <text class="d-text" x="300" y="47" text-anchor="middle">(r-1, c)</text>
  <rect class="d-box" x="245" y="200" width="110" height="44" rx="8"/>
  <text class="d-text" x="300" y="227" text-anchor="middle">(r+1, c)</text>
  <rect class="d-box" x="70" y="110" width="110" height="44" rx="8"/>
  <text class="d-text" x="125" y="137" text-anchor="middle">(r, c-1)</text>
  <rect class="d-box" x="420" y="110" width="110" height="44" rx="8"/>
  <text class="d-text" x="475" y="137" text-anchor="middle">(r, c+1)</text>
  <path class="d-edge-accent" d="M 300 108 L 300 70" marker-end="url(#b21q3-arrow)"/>
  <path class="d-edge-accent" d="M 300 156 L 300 194" marker-end="url(#b21q3-arrow)"/>
  <path class="d-edge-accent" d="M 243 132 L 186 132" marker-end="url(#b21q3-arrow)"/>
  <path class="d-edge-accent" d="M 357 132 L 414 132" marker-end="url(#b21q3-arrow)"/>
  <text class="d-sub" x="314" y="94">up</text>
  <text class="d-sub" x="314" y="182">down</text>
  <text class="d-sub" x="214" y="122" text-anchor="middle">left</text>
  <text class="d-sub" x="386" y="122" text-anchor="middle">right</text>
  <text class="d-sub" x="540" y="40" text-anchor="middle">skip: off grid or water</text>
</svg>

Each neighbour is first checked against the grid bounds, then against "is it land that has not been visited yet?". Only then does the fill move there.

## 4. From Brute Force to Flood Fill

**A tempting wrong idea:** count land cells that have no land neighbour above or to the left (a "top-left corner" rule). It works for rectangles but fails on shapes like a U, which has two such corners but is one island. Islands can be any shape, so you need to actually explore them.

**The algorithm:**

1. Loop over every cell, row by row.
2. When a cell is land and not yet visited, add 1 to the count — this cell starts a new island.
3. Flood-fill from it, marking every reachable land cell as visited, so none of them can start another island.

📌 **Interview term: Sinking an island** — marking visited land by overwriting it with water in the input grid itself. It saves the visited array, but it destroys the input.

Walking the scan over grid 2:

| Cell reached by the scan | Land and unvisited? | Action | Count |
| :--- | :--- | :--- | :--- |
| (0, 0) | yes | new island; fill sinks (0,0), (1,0), (0,1), (1,1) | 1 |
| (0, 1), (1, 0), (1, 1) | no — already sunk | skip | 1 |
| (2, 2) | yes | new island; fill sinks just (2,2) — its neighbours are water | 2 |
| (3, 3) | yes | new island; fill sinks (3,3), (3,4) | 3 |
| (3, 4) | no — already sunk | skip | 3 |

Every cell is looked at by the scan once and entered by a flood fill at most once, and each entry checks 4 neighbours — so the work is proportional to rows × cols.

## 5. The Code in JavaScript

The recursive version is the one most people write first. The inner function \`sink\` closes over \`grid\`, \`rows\` and \`cols\`:

~~~javascript
function numIslands(grid) {
  // Count groups of "1" cells joined up, down, left or right.
  // Sinks each island (sets its cells to "0") so it is never counted twice.
  const rows = grid.length;
  if (rows === 0) return 0;
  const cols = grid[0].length;

  function sink(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== "1") return;
    grid[r][c] = "0";               // mark visited BEFORE recursing
    sink(r + 1, c);
    sink(r - 1, c);
    sink(r, c + 1);
    sink(r, c - 1);
  }

  let count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "1") {     // an unvisited piece of land: a new island
        count++;
        sink(r, c);
      }
    }
  }
  return count;
}
~~~

**What to point out in this code:**

- The bounds check comes **first**. Without it, \`grid[-1]\` is \`undefined\` and \`grid[-1][c]\` throws \`TypeError\`; on the last row, \`grid[rows]\` is also \`undefined\`. Reading past the end of a *row* gives \`undefined\`, which is \`!== "1"\`, so that case fails quietly — do not rely on it.
- \`grid[r][c] = "0"\` happens *before* the four recursive calls, so two neighbours cannot keep calling each other.
- Strings are immutable in JavaScript: \`row[2] = "0"\` on a string is silently ignored (or throws in strict mode). \`parse\` splits each row into an array of characters first.
- Use \`===\` with the string \`"1"\`. With \`==\`, \`"1" == 1\` is \`true\`, which hides type mix-ups between character grids and number grids.
- Each recursive call uses engine stack space, and the engine throws \`RangeError\` when it runs out (section 6).

📌 **Interview term: Recursion depth** — how many function calls are waiting on the call stack at once. A flood fill over one island of k cells can be k calls deep.

## 6. When Recursion Is Not Safe: an Explicit Stack

We ran the recursive \`sink\` from section 5 on all-land square grids in Node 22: 100 × 100 worked, and a **120 × 120 grid (14,400 cells) threw \`RangeError: Maximum call stack size exceeded\`**. Browser limits differ, but they are all finite. The fix is to manage the stack yourself, with an array, and — as a bonus — to keep a separate \`seen\` array so the input is left untouched:

~~~javascript
function islandSizes(grid, dirs = FOUR) {
  // Iterative DFS with an explicit stack and a separate visited grid:
  // no call-stack limit, and the caller's grid is left untouched.
  const rows = grid.length, cols = rows ? grid[0].length : 0;
  const seen = new Uint8Array(rows * cols);      // cell (r, c) lives at index r * cols + c
  const sizes = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== "1" || seen[r * cols + c]) continue;
      seen[r * cols + c] = 1;                    // mark when PUSHED
      const stack = [[r, c]];
      let size = 0;
      while (stack.length > 0) {
        const [cr, cc] = stack.pop();
        size++;
        for (const [dr, dc] of dirs) {
          const nr = cr + dr, nc = cc + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === "1" && !seen[nr * cols + nc]) {
            seen[nr * cols + nc] = 1;
            stack.push([nr, nc]);
          }
        }
      }
      sizes.push(size);
    }
  }
  return sizes.sort((a, b) => a - b);            // numeric sort: the default sort compares strings
}
~~~

\`seen\` is one flat \`Uint8Array\` of rows × cols bytes, indexed by \`r * cols + c\` — compact, zero-filled, and faster than an array of arrays of booleans. A cell is marked when it is **pushed**, so it can never be on the stack twice. The final \`sizes.sort((a, b) => a - b)\` needs the comparator: the default \`sort()\` compares elements as strings, so \`[10, 9, 1, 100]\` would come back as \`[1, 10, 100, 9]\` (we checked in Node). Example 2 runs this version on a 500 × 500 all-land grid (one island of 250,000 cells) with no stack problem.

## 7. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\` (Node.js 22; the code is plain browser-safe JavaScript, so it also runs in the page). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 builds its random 300 × 300 grid with a small deterministic generator (MINSTD), so every language sees the same map and finds the same 7,987 islands.

**Example 1 — the recursive flood fill on seven grids** prints:

~~~text
1
3
5
1
1
0
0
~~~

**Example 2 — iterative DFS with a visited grid: sizes, 8 directions, and large grids** prints:

~~~text
grid 2: 3 islands, sizes [1, 2, 4]
diagonal grid: 4-way 5, 8-way 1
input unchanged: true
500 x 500 all land: count 1, largest 250000
200 x 200 checkerboard: count 20000, largest 1
random 300 x 300 (45% land): count 7987, largest 161
~~~

## 8. Edge Cases and Follow-Ups

- **Empty grid** (\`[]\`) — return 0 before touching \`grid[0]\` (example 1).
- **All water / single cell** — 0, or 1 for a single land cell (example 1).
- **A ring of land around water** (\`111 / 101 / 111\`) — 1 island; the water inside does not split it (example 1).
- **Diagonal-only contact** (\`101 / 010 / 101\`) — 5 islands with 4 directions, 1 with 8 directions (examples 1 and 2). Make the direction list a parameter.
- **One giant island** — the worst case for recursion depth (section 6).
- **Follow-up: island sizes / max area.** Count cells inside the fill and return the size instead of discarding it (example 2 prints the sizes \`[1, 2, 4]\`).
- **Follow-up: land appears one cell at a time** ("Number of Islands II"). Rerunning the fill after every addition is slow; Union-Find answers each addition in near-constant time — see [islands with DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).
- **Related grid searches:** spreading from many cells at once is multi-source BFS ([Rotting Oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs)); DFS with memoisation on a grid is [longest increasing path in a matrix](/interview-question/longest-increasing-path-in-matrix-why-dfs-memo-beats-brute-force).

## 9. Complexity

| Version | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Recursive sink | O(R × C) | O(R × C) call frames worst case | one giant island makes the recursion that deep; Node 22 overflowed at 120 × 120 |
| Iterative stack + \`Uint8Array\` | O(R × C) | O(R × C) | one byte per cell for \`seen\`; the stack can hold many cells at once |
| BFS with array + head index | O(R × C) | O(R × C) | same marks; avoid \`shift()\`, which can be O(n) per call |

R × C is the number of cells; each cell is scanned once and entered by a fill at most once, with 4 neighbour checks.

## Common Pitfalls

- **Missing bounds check.** \`grid[-1][c]\` throws \`TypeError\` (because \`grid[-1]\` is \`undefined\`); check \`r\` and \`c\` before indexing.
- **Recursion on big grids.** Node threw \`RangeError\` on a 120 × 120 all-land grid; use an explicit stack or BFS.
- **Trying to sink cells in a string.** Assigning to \`row[c]\` on a string does nothing; split rows into arrays.
- **\`new Array(rows).fill(new Array(cols).fill(false))\`.** Every row is the same array, so marking one cell marks the whole column. Use \`Array.from\` or a flat \`Uint8Array\`.
- **Sorting sizes without a comparator.** \`sizes.sort()\` sorts numbers as strings.
- **\`queue.shift()\` in a BFS version.** It can move every element; keep a head index.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">The grid is a graph: land cells are vertices, side-by-side land cells are edges; an island is a connected component.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">Scan every cell; each unvisited <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"1"</code> adds 1 to the count and starts a flood fill that marks its whole island.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Marking:</strong> <span style="color:#f0e2c8;">Sink visited cells to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"0"</code> if the input may change, otherwise keep a flat <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Uint8Array</code> of seen flags; mark before exploring.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(rows × cols) time; O(rows × cols) worst-case space for the stack or recursion.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Recursive DFS threw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code> on a 120 × 120 land grid in Node, so I would ship the explicit array-stack version.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if diagonal cells also connect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add the four diagonal offsets to the direction array. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">101 / 010 / 101</code> grid then becomes 1 island instead of 5.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid modifying the input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const seen = new Uint8Array(rows * cols)</code> and index it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r * cols + c</code>, or copy the grid with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">grid.map(row =&gt; [...row])</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a flat <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Uint8Array</code> for visited?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One allocation, one byte per cell, zero-initialised, and no shared-row bugs; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r * cols + c</code> turns a 2-D position into one index.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the size of the largest island?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count cells inside each fill and keep the maximum; example 2 returns all sizes, sorted numerically with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a - b</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if land is added one cell at a time and you must report the count after each?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use Union-Find: each new cell starts as its own island and is unioned with land neighbours, decreasing the count on each successful union.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Grid graph** | Cells are vertices; each joins its 4 (or 8) neighbours; edges are computed |
| **4-directional adjacency** | Neighbours share a side; 8-directional adds diagonals |
| **Flood fill** | Visit every cell reachable from a start cell — the paint bucket |
| **Connected component** | Maximal group of mutually reachable vertices; one island |
| **Sinking an island** | Mark visited land by overwriting it with water in the input |
| **Recursion depth** | Number of calls waiting on the call stack at the same time |

---
**Conclusion:** In JavaScript, counting islands is two nested loops plus a flood fill: every unvisited \`"1"\` is a new island, and the fill marks the rest of it so it is never counted again. It runs in O(rows × cols). The short recursive version is fine for small grids, but Node threw \`RangeError\` at 120 × 120, so ship the explicit array-stack version with a flat \`Uint8Array\` of seen flags — and split string rows into arrays if you sink in place. For the three-way comparison with Union-Find, see [islands with DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).`,
        examples: [
          {
            label: "Recursive flood fill: count islands on seven grids",
            code: `function numIslands(grid) {
  // Count groups of "1" cells joined up, down, left or right.
  // Sinks each island (sets its cells to "0") so it is never counted twice.
  const rows = grid.length;
  if (rows === 0) return 0;
  const cols = grid[0].length;

  function sink(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== "1") return;
    grid[r][c] = "0";               // mark visited BEFORE recursing
    sink(r + 1, c);
    sink(r - 1, c);
    sink(r, c + 1);
    sink(r, c - 1);
  }

  let count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "1") {     // an unvisited piece of land: a new island
        count++;
        sink(r, c);
      }
    }
  }
  return count;
}

// Strings are immutable in JavaScript, so split each row into an array of characters.
const parse = (rows) => rows.map((row) => row.split(""));

console.log(numIslands(parse(["11110", "11010", "11000", "00000"]))); // 1
console.log(numIslands(parse(["11000", "11000", "00100", "00011"]))); // 3
console.log(numIslands(parse(["101", "010", "101"]))); // 5
console.log(numIslands(parse(["111", "101", "111"]))); // 1
console.log(numIslands(parse(["1"]))); // 1
console.log(numIslands(parse(["0"]))); // 0
console.log(numIslands(parse([]))); // 0`,
          },
          {
            label: "Iterative DFS, visited grid, island sizes, 8 directions, large grids",
            code: `const FOUR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const EIGHT = FOUR.concat([[1, 1], [1, -1], [-1, 1], [-1, -1]]);

function islandSizes(grid, dirs = FOUR) {
  // Iterative DFS with an explicit stack and a separate visited grid:
  // no call-stack limit, and the caller's grid is left untouched.
  const rows = grid.length, cols = rows ? grid[0].length : 0;
  const seen = new Uint8Array(rows * cols);      // cell (r, c) lives at index r * cols + c
  const sizes = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== "1" || seen[r * cols + c]) continue;
      seen[r * cols + c] = 1;                    // mark when PUSHED
      const stack = [[r, c]];
      let size = 0;
      while (stack.length > 0) {
        const [cr, cc] = stack.pop();
        size++;
        for (const [dr, dc] of dirs) {
          const nr = cr + dr, nc = cc + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === "1" && !seen[nr * cols + nc]) {
            seen[nr * cols + nc] = 1;
            stack.push([nr, nc]);
          }
        }
      }
      sizes.push(size);
    }
  }
  return sizes.sort((a, b) => a - b);            // numeric sort: the default sort compares strings
}

const fmt = (xs) => "[" + xs.join(", ") + "]";

function report(name, grid) {
  const sizes = islandSizes(grid);
  console.log(name + ": count " + sizes.length + ", largest " + (sizes.length ? sizes[sizes.length - 1] : 0));
}

const g2 = ["11000", "11000", "00100", "00011"];
console.log("grid 2: " + islandSizes(g2).length + " islands, sizes " + fmt(islandSizes(g2)));
const diag = ["101", "010", "101"];
console.log("diagonal grid: 4-way " + islandSizes(diag).length + ", 8-way " + islandSizes(diag, EIGHT).length);
const before = g2.join("|");
islandSizes(g2);
console.log("input unchanged: " + (g2.join("|") === before));

report("500 x 500 all land", new Array(500).fill("1".repeat(500)));
const board = [];
for (let r = 0; r < 200; r++) {
  let row = "";
  for (let c = 0; c < 200; c++) row += (r + c) % 2 === 0 ? "1" : "0";
  board.push(row);
}
report("200 x 200 checkerboard", board);

let seed = 7;
const rand = [];
for (let r = 0; r < 300; r++) {
  let row = "";
  for (let c = 0; c < 300; c++) {
    seed = (seed * 48271) % 2147483647;          // MINSTD; the product stays below 2^53, so it is exact
    row += seed % 100 < 45 ? "1" : "0";
  }
  rand.push(row);
}
report("random 300 x 300 (45% land)", rand);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given a 2-D grid of '1's (land) and '0's (water) as a char[][]. An island is a group of land cells connected horizontally or vertically. Write a Java method that returns the number of islands."

**What a strong answer should cover:**
- Model the grid as an implicit graph; an island is a connected component of land cells.
- Scan every cell; each unvisited land cell starts a new island, then flood-fill (DFS or BFS) to mark the whole island.
- Mark cells as visited before (or as) you explore them, either by sinking them in place or with a \`boolean[][]\`.
- O(rows × cols) time; O(rows × cols) worst-case space for the recursion or the explicit stack.
- Java details: compare with the char literal \`'1'\`, not the int \`1\`; the bounds check must come before indexing or you get \`ArrayIndexOutOfBoundsException\`; deep recursion throws \`StackOverflowError\`, so an \`ArrayDeque\` stack or queue is the robust version.

**Clarifying questions expected:**
- Do diagonal cells count as connected?
- May I modify the input grid?
- How large can the grid be?

**Code / implementation expected:** Yes — \`int numIslands(char[][] grid)\` with a nested loop plus a flood fill, in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know 2-D arrays, and ideally what BFS and DFS are  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are handed a printed map of an archipelago drawn on squared paper: every square is either land or sea. Your job is to count the islands, and you have a highlighter.

You read the map like a book, left to right, top to bottom. The first time your eye lands on an un-highlighted land square, you say "that's a new island!", add one to your count, and then highlight *every* land square you can reach from it by stepping up, down, left or right — the whole island, however oddly shaped. Then you keep reading. Any land square you meet later that is already highlighted belongs to an island you have counted, so you skip it.

When you reach the bottom-right corner, your count is the answer. That is the whole algorithm. The highlighter is called a **flood fill**, and the "reading order" is just two nested loops. The interview question is whether you can write it cleanly, explain why it is O(rows × cols), and handle the traps: diagonal squares, modifying the input, and grids so large that recursion breaks.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do diagonal neighbours count as connected? | The classic version uses 4 directions. With 8 directions the \`101 / 010 / 101\` grid is 1 island instead of 5 (example 2). |
| May I modify the grid? | If yes, "sink" visited land by overwriting it — no extra memory. If no, keep a separate visited grid. |
| What are the cell values — characters \`'1'\`/\`'0'\` or integers? | The common LeetCode-style input is characters; comparing a character with the number 1 is a silent bug in some languages. |
| How big can the grid be? | Large, mostly-land grids make recursive DFS go very deep; the safe choice is an iterative stack or BFS. |
| Is everything outside the grid water? | Usually yes. Variants (closed islands, enclaves) treat islands touching the border differently. |
| Can the grid be empty, or rows have different lengths? | Guard \`rows == 0\` before reading \`grid[0]\`. |

## 3. The Core Idea: Scan, Then Flood Fill

Treat the grid as a graph: each land cell is a vertex, and two land cells are joined by an edge when they are side by side (up, down, left or right). An island is then a **connected component** of that graph, and counting islands is counting components (the general version is [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph)). You never build the graph; you compute neighbours on the fly (see [implicit graphs](/interview-question/what-is-a-graph-and-how-do-you-represent-it)).

📌 **Interview term: Grid graph** — a 2-D grid viewed as a graph: cells are vertices, and each cell is connected to its 4 (or 8) neighbours. It is an implicit graph — edges are computed, not stored.

📌 **Interview term: 4-directional adjacency** — two cells are neighbours only if they share a side: (r ± 1, c) or (r, c ± 1). 8-directional also counts the four diagonals.

📌 **Interview term: Flood fill** — starting from one cell, visit every cell reachable through same-coloured neighbours — the paint-bucket tool. Implemented with DFS or BFS.

📌 **Interview term: Connected component** — a maximal group of vertices in which every vertex can reach every other. Each island is one connected component of land cells.

Here is grid 2 from the examples, with each island lettered in the order the scan finds it:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 240" role="img" aria-label="A four by five grid with three islands: A has four cells in the top left, B is one cell in the middle, C has two cells in the bottom right">
  <rect class="d-box-accent" x="40" y="20" width="48" height="48"/>
  <text class="d-text" x="64" y="49" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="88" y="20" width="48" height="48"/>
  <text class="d-text" x="112" y="49" text-anchor="middle">A</text>
  <rect class="d-box-muted" x="136" y="20" width="48" height="48"/>
  <rect class="d-box-muted" x="184" y="20" width="48" height="48"/>
  <rect class="d-box-muted" x="232" y="20" width="48" height="48"/>
  <rect class="d-box-accent" x="40" y="68" width="48" height="48"/>
  <text class="d-text" x="64" y="97" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="88" y="68" width="48" height="48"/>
  <text class="d-text" x="112" y="97" text-anchor="middle">A</text>
  <rect class="d-box-muted" x="136" y="68" width="48" height="48"/>
  <rect class="d-box-muted" x="184" y="68" width="48" height="48"/>
  <rect class="d-box-muted" x="232" y="68" width="48" height="48"/>
  <rect class="d-box-muted" x="40" y="116" width="48" height="48"/>
  <rect class="d-box-muted" x="88" y="116" width="48" height="48"/>
  <rect class="d-box" x="136" y="116" width="48" height="48"/>
  <text class="d-text" x="160" y="145" text-anchor="middle">B</text>
  <rect class="d-box-muted" x="184" y="116" width="48" height="48"/>
  <rect class="d-box-muted" x="232" y="116" width="48" height="48"/>
  <rect class="d-box-muted" x="40" y="164" width="48" height="48"/>
  <rect class="d-box-muted" x="88" y="164" width="48" height="48"/>
  <rect class="d-box-muted" x="136" y="164" width="48" height="48"/>
  <rect class="d-box-accent" x="184" y="164" width="48" height="48"/>
  <text class="d-text" x="208" y="193" text-anchor="middle">C</text>
  <rect class="d-box-accent" x="232" y="164" width="48" height="48"/>
  <text class="d-text" x="256" y="193" text-anchor="middle">C</text>
  <text class="d-text" x="340" y="60">A: found at (0, 0), 4 cells</text>
  <text class="d-text" x="340" y="120">B: found at (2, 2), 1 cell</text>
  <text class="d-text" x="340" y="180">C: found at (3, 3), 2 cells</text>
</svg>

B touches A only at a corner, so with 4-directional adjacency it is a separate island. The scan finds A at (0, 0) and sinks all four of its cells, so (0, 1), (1, 0) and (1, 1) are already water by the time the scan reaches them.

The flood fill itself only ever asks one question per cell: which of my four neighbours are still unvisited land?

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="A cell at row r and column c has four neighbours: up, down, left and right">
  <defs>
    <marker id="b21q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="245" y="110" width="110" height="44" rx="8"/>
  <text class="d-text" x="300" y="137" text-anchor="middle">(r, c)</text>
  <rect class="d-box" x="245" y="20" width="110" height="44" rx="8"/>
  <text class="d-text" x="300" y="47" text-anchor="middle">(r-1, c)</text>
  <rect class="d-box" x="245" y="200" width="110" height="44" rx="8"/>
  <text class="d-text" x="300" y="227" text-anchor="middle">(r+1, c)</text>
  <rect class="d-box" x="70" y="110" width="110" height="44" rx="8"/>
  <text class="d-text" x="125" y="137" text-anchor="middle">(r, c-1)</text>
  <rect class="d-box" x="420" y="110" width="110" height="44" rx="8"/>
  <text class="d-text" x="475" y="137" text-anchor="middle">(r, c+1)</text>
  <path class="d-edge-accent" d="M 300 108 L 300 70" marker-end="url(#b21q3-arrow)"/>
  <path class="d-edge-accent" d="M 300 156 L 300 194" marker-end="url(#b21q3-arrow)"/>
  <path class="d-edge-accent" d="M 243 132 L 186 132" marker-end="url(#b21q3-arrow)"/>
  <path class="d-edge-accent" d="M 357 132 L 414 132" marker-end="url(#b21q3-arrow)"/>
  <text class="d-sub" x="314" y="94">up</text>
  <text class="d-sub" x="314" y="182">down</text>
  <text class="d-sub" x="214" y="122" text-anchor="middle">left</text>
  <text class="d-sub" x="386" y="122" text-anchor="middle">right</text>
  <text class="d-sub" x="540" y="40" text-anchor="middle">skip: off grid or water</text>
</svg>

Each neighbour is first checked against the grid bounds, then against "is it land that has not been visited yet?". Only then does the fill move there.

## 4. From Brute Force to Flood Fill

**A tempting wrong idea:** count land cells that have no land neighbour above or to the left (a "top-left corner" rule). It works for rectangles but fails on shapes like a U, which has two such corners but is one island. Islands can be any shape, so you need to actually explore them.

**The algorithm:**

1. Loop over every cell, row by row.
2. When a cell is land and not yet visited, add 1 to the count — this cell starts a new island.
3. Flood-fill from it, marking every reachable land cell as visited, so none of them can start another island.

📌 **Interview term: Sinking an island** — marking visited land by overwriting it with water in the input grid itself. It saves the visited array, but it destroys the input.

Walking the scan over grid 2:

| Cell reached by the scan | Land and unvisited? | Action | Count |
| :--- | :--- | :--- | :--- |
| (0, 0) | yes | new island; fill sinks (0,0), (1,0), (0,1), (1,1) | 1 |
| (0, 1), (1, 0), (1, 1) | no — already sunk | skip | 1 |
| (2, 2) | yes | new island; fill sinks just (2,2) — its neighbours are water | 2 |
| (3, 3) | yes | new island; fill sinks (3,3), (3,4) | 3 |
| (3, 4) | no — already sunk | skip | 3 |

Every cell is looked at by the scan once and entered by a flood fill at most once, and each entry checks 4 neighbours — so the work is proportional to rows × cols.

## 5. The Code in Java

The recursive version is the one most people write first:

~~~java
// Count groups of '1' cells joined up, down, left or right.
// Sinks each island (sets its cells to '0') so it is never counted twice.
static int numIslands(char[][] grid) {
    if (grid.length == 0) return 0;
    int count = 0;
    for (int r = 0; r < grid.length; r++) {
        for (int c = 0; c < grid[0].length; c++) {
            if (grid[r][c] == '1') {   // an unvisited piece of land: a new island
                count++;
                sink(grid, r, c);
            }
        }
    }
    return count;
}

static void sink(char[][] grid, int r, int c) {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] != '1') return;
    grid[r][c] = '0';                 // mark visited BEFORE recursing
    sink(grid, r + 1, c);
    sink(grid, r - 1, c);
    sink(grid, r, c + 1);
    sink(grid, r, c - 1);
}
~~~

**What to point out in this code:**

- The bounds check comes **first** in the \`if\`. Java's \`||\` short-circuits, so \`grid[r][c]\` is only read when \`r\` and \`c\` are valid; reversing the order throws \`ArrayIndexOutOfBoundsException\`.
- \`grid[r][c] != '1'\` compares two \`char\`s. Writing \`grid[r][c] != 1\` compiles too (a \`char\` is a number), but compares against the character with code 1, so every cell looks like water.
- \`grid[r][c] = '0'\` happens *before* the four recursive calls, so two neighbours cannot keep calling each other.
- \`String\` is immutable, so \`parse\` uses \`toCharArray()\` to get a mutable \`char[]\` per row. The method sinks the caller's array; pass a copy if the caller still needs it.
- \`parse(String... rows)\` is a varargs method, so \`parse()\` with no arguments gives an empty grid — and \`grid.length == 0\` is checked before \`grid[0]\` is touched.

📌 **Interview term: Recursion depth** — how many method calls are waiting on the call stack at once. A flood fill over one island of k cells can be k calls deep.

## 6. When Recursion Is Not Safe: an Explicit Stack

We ran the recursive \`sink\` from section 5 on all-land square grids with OpenJDK 21 and the default thread stack: 150 × 150 worked, and a **200 × 200 grid (40,000 cells) threw \`StackOverflowError\`**. (With \`java -Xss64m\` even 1,000 × 1,000 passed — but you do not control the flags of the judge or the production server.) The fix is to manage the stack yourself with an \`ArrayDeque\`, and — as a bonus — to keep a separate \`boolean[][]\` so the input is left untouched:

~~~java
// Iterative DFS with an explicit stack and a separate visited grid:
// no StackOverflowError, and the caller's grid is left untouched.
static List<Integer> islandSizes(String[] grid, int[][] dirs) {
    int rows = grid.length, cols = rows == 0 ? 0 : grid[0].length();
    boolean[][] seen = new boolean[rows][cols];
    List<Integer> sizes = new ArrayList<>();
    Deque<int[]> stack = new ArrayDeque<>();
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r].charAt(c) != '1' || seen[r][c]) continue;
            seen[r][c] = true;                       // mark when PUSHED
            stack.push(new int[]{r, c});
            int size = 0;
            while (!stack.isEmpty()) {
                int[] cell = stack.pop();
                size++;
                for (int[] d : dirs) {
                    int nr = cell[0] + d[0], nc = cell[1] + d[1];
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                            && grid[nr].charAt(nc) == '1' && !seen[nr][nc]) {
                        seen[nr][nc] = true;
                        stack.push(new int[]{nr, nc});
                    }
                }
            }
            sizes.add(size);
        }
    }
    Collections.sort(sizes);
    return sizes;
}
~~~

\`push\` and \`pop\` work on the head of the \`ArrayDeque\`; swapping them for \`offer\` and \`poll\` turns this into BFS with the same result. A cell is marked \`seen\` when it is **pushed**, so it can never be on the stack twice. Each cell is stored as a tiny \`int[]{r, c}\` object; to avoid those allocations entirely, push one \`int\` per cell, \`r * cols + c\`, into an \`int[]\` used as a stack. Example 2 runs this version on a 500 × 500 all-land grid (one island of 250,000 cells) with no stack problem.

## 7. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21; the code only uses Java 17 features). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 builds its random 300 × 300 grid with a small deterministic generator (MINSTD), so every language sees the same map and finds the same 7,987 islands.

**Example 1 — the recursive flood fill on seven grids** prints:

~~~text
1
3
5
1
1
0
0
~~~

**Example 2 — iterative DFS with a visited grid: sizes, 8 directions, and large grids** prints:

~~~text
grid 2: 3 islands, sizes [1, 2, 4]
diagonal grid: 4-way 5, 8-way 1
input unchanged: true
500 x 500 all land: count 1, largest 250000
200 x 200 checkerboard: count 20000, largest 1
random 300 x 300 (45% land): count 7987, largest 161
~~~

## 8. Edge Cases and Follow-Ups

- **Empty grid** (\`[]\`) — return 0 before touching \`grid[0]\` (example 1).
- **All water / single cell** — 0, or 1 for a single land cell (example 1).
- **A ring of land around water** (\`111 / 101 / 111\`) — 1 island; the water inside does not split it (example 1).
- **Diagonal-only contact** (\`101 / 010 / 101\`) — 5 islands with 4 directions, 1 with 8 directions (examples 1 and 2). Make the direction list a parameter.
- **One giant island** — the worst case for recursion depth (section 6).
- **Follow-up: island sizes / max area.** Count cells inside the fill and return the size instead of discarding it (example 2 prints the sizes \`[1, 2, 4]\`).
- **Follow-up: land appears one cell at a time** ("Number of Islands II"). Rerunning the fill after every addition is slow; Union-Find answers each addition in near-constant time — see [islands with DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).
- **Related grid searches:** spreading from many cells at once is multi-source BFS ([Rotting Oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs)); DFS with memoisation on a grid is [longest increasing path in a matrix](/interview-question/longest-increasing-path-in-matrix-why-dfs-memo-beats-brute-force).

## 9. Complexity

| Version | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Recursive sink | O(R × C) | O(R × C) stack frames worst case | one giant island makes the recursion that deep; 200 × 200 overflowed the default stack |
| \`ArrayDeque\` stack + \`boolean[][]\` | O(R × C) | O(R × C) | one boolean per cell plus the stack contents |
| BFS with \`ArrayDeque\` | O(R × C) | O(R × C) | same marks; the queue holds about one "ring" of the fill |

R × C is the number of cells; each cell is scanned once and entered by a fill at most once, with 4 neighbour checks.

## Common Pitfalls

- **Comparing a \`char\` with an \`int\`.** \`grid[r][c] == 1\` compiles and is always false for \`'1'\`; use the literal \`'1'\`.
- **Indexing before the bounds check.** \`grid[r][c] != '1' || r < 0\` throws \`ArrayIndexOutOfBoundsException\`; put the range checks first.
- **Recursion on big grids.** 200 × 200 all land threw \`StackOverflowError\` with the default stack; use an explicit \`ArrayDeque\`.
- **Reading \`grid[0].length\` on an empty grid.** Check \`grid.length == 0\` first.
- **Mixing \`push\` with \`poll\`.** That takes from opposite ends and turns your DFS into something else; pick one pair of methods.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">The grid is a graph: land cells are vertices, side-by-side land cells are edges; an island is a connected component.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">Scan every cell; each unvisited <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'1'</code> adds 1 to the count and starts a flood fill that marks its whole island.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Marking:</strong> <span style="color:#f0e2c8;">Sink visited cells to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'0'</code> if the input may change, otherwise keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[][]</code>; mark before exploring.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(rows × cols) time; O(rows × cols) worst-case space for the stack or recursion.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Recursion threw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code> on a 200 × 200 land grid with the default stack, so I would ship the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> version.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if diagonal cells also connect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[][]</code> of 8 direction offsets. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">101 / 010 / 101</code> grid then becomes 1 island instead of 5.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid modifying the input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[][] seen = new boolean[rows][cols]</code> (all <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> by default), or clone each row with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">grid[r].clone()</code> first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you avoid allocating an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int[]</code> per cell?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Encode a cell as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r * cols + c</code> and use an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> of size rows × cols as the stack with a top index; decode with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/ cols</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">% cols</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the size of the largest island?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count cells inside each fill and keep the maximum; example 2 collects all sizes and sorts them with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.sort</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if land is added one cell at a time and you must report the count after each?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use Union-Find over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[] parent</code>: each new cell starts as its own island and is unioned with land neighbours, decreasing the count on each successful union.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Grid graph** | Cells are vertices; each joins its 4 (or 8) neighbours; edges are computed |
| **4-directional adjacency** | Neighbours share a side; 8-directional adds diagonals |
| **Flood fill** | Visit every cell reachable from a start cell — the paint bucket |
| **Connected component** | Maximal group of mutually reachable vertices; one island |
| **Sinking an island** | Mark visited land by overwriting it with water in the input |
| **Recursion depth** | Number of calls waiting on the call stack at the same time |

---
**Conclusion:** In Java, counting islands is two nested loops over a \`char[][]\` plus a flood fill: every unvisited \`'1'\` is a new island, and the fill marks the rest of it so it is never counted again. It runs in O(rows × cols). Compare with \`'1'\`, put the bounds checks first, and remember that the recursive fill threw \`StackOverflowError\` at 200 × 200 with the default stack — the \`ArrayDeque\` version with a \`boolean[][]\` is the one to ship. For the three-way comparison with Union-Find, see [islands with DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).`,
        examples: [
          {
            label: "Recursive flood fill: count islands on seven grids",
            code: `public class Main {
    // Count groups of '1' cells joined up, down, left or right.
    // Sinks each island (sets its cells to '0') so it is never counted twice.
    static int numIslands(char[][] grid) {
        if (grid.length == 0) return 0;
        int count = 0;
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[0].length; c++) {
                if (grid[r][c] == '1') {   // an unvisited piece of land: a new island
                    count++;
                    sink(grid, r, c);
                }
            }
        }
        return count;
    }

    static void sink(char[][] grid, int r, int c) {
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] != '1') return;
        grid[r][c] = '0';                 // mark visited BEFORE recursing
        sink(grid, r + 1, c);
        sink(grid, r - 1, c);
        sink(grid, r, c + 1);
        sink(grid, r, c - 1);
    }

    // Turn {"110", "011"} into a mutable char[][] (String itself is immutable).
    static char[][] parse(String... rows) {
        char[][] g = new char[rows.length][];
        for (int i = 0; i < rows.length; i++) g[i] = rows[i].toCharArray();
        return g;
    }

    public static void main(String[] args) {
        System.out.println(numIslands(parse("11110", "11010", "11000", "00000"))); // 1
        System.out.println(numIslands(parse("11000", "11000", "00100", "00011"))); // 3
        System.out.println(numIslands(parse("101", "010", "101")));                // 5
        System.out.println(numIslands(parse("111", "101", "111")));                // 1
        System.out.println(numIslands(parse("1")));                                // 1
        System.out.println(numIslands(parse("0")));                                // 0
        System.out.println(numIslands(parse()));                                   // 0
    }
}`,
          },
          {
            label: "Iterative DFS, visited grid, island sizes, 8 directions, large grids",
            code: `import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Deque;
import java.util.List;

public class Main {
    static final int[][] FOUR = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
    static final int[][] EIGHT = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}, {1, 1}, {1, -1}, {-1, 1}, {-1, -1}};

    // Iterative DFS with an explicit stack and a separate visited grid:
    // no StackOverflowError, and the caller's grid is left untouched.
    static List<Integer> islandSizes(String[] grid, int[][] dirs) {
        int rows = grid.length, cols = rows == 0 ? 0 : grid[0].length();
        boolean[][] seen = new boolean[rows][cols];
        List<Integer> sizes = new ArrayList<>();
        Deque<int[]> stack = new ArrayDeque<>();
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r].charAt(c) != '1' || seen[r][c]) continue;
                seen[r][c] = true;                       // mark when PUSHED
                stack.push(new int[]{r, c});
                int size = 0;
                while (!stack.isEmpty()) {
                    int[] cell = stack.pop();
                    size++;
                    for (int[] d : dirs) {
                        int nr = cell[0] + d[0], nc = cell[1] + d[1];
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                                && grid[nr].charAt(nc) == '1' && !seen[nr][nc]) {
                            seen[nr][nc] = true;
                            stack.push(new int[]{nr, nc});
                        }
                    }
                }
                sizes.add(size);
            }
        }
        Collections.sort(sizes);
        return sizes;
    }

    static void report(String name, String[] grid) {
        List<Integer> sizes = islandSizes(grid, FOUR);
        System.out.println(name + ": count " + sizes.size() + ", largest " + (sizes.isEmpty() ? 0 : sizes.get(sizes.size() - 1)));
    }

    public static void main(String[] args) {
        String[] g2 = {"11000", "11000", "00100", "00011"};
        System.out.println("grid 2: " + islandSizes(g2, FOUR).size() + " islands, sizes " + islandSizes(g2, FOUR));
        String[] diag = {"101", "010", "101"};
        System.out.println("diagonal grid: 4-way " + islandSizes(diag, FOUR).size() + ", 8-way " + islandSizes(diag, EIGHT).size());
        String[] before = g2.clone();
        islandSizes(g2, FOUR);
        System.out.println("input unchanged: " + Arrays.equals(g2, before));

        String[] land = new String[500];
        Arrays.fill(land, "1".repeat(500));
        report("500 x 500 all land", land);
        String[] board = new String[200];
        for (int r = 0; r < 200; r++) {
            StringBuilder row = new StringBuilder();
            for (int c = 0; c < 200; c++) row.append((r + c) % 2 == 0 ? '1' : '0');
            board[r] = row.toString();
        }
        report("200 x 200 checkerboard", board);

        long seed = 7;                                   // long: seed * 48271 overflows int
        String[] rand = new String[300];
        for (int r = 0; r < 300; r++) {
            StringBuilder row = new StringBuilder();
            for (int c = 0; c < 300; c++) {
                seed = seed * 48271 % 2147483647;
                row.append(seed % 100 < 45 ? '1' : '0');
            }
            rand[r] = row.toString();
        }
        report("random 300 x 300 (45% land)", rand);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given a 2-D grid of '1's (land) and '0's (water). An island is a group of land cells connected horizontally or vertically. Write a C++ function that returns the number of islands."

**What a strong answer should cover:**
- Model the grid as an implicit graph; an island is a connected component of land cells.
- Scan every cell; each unvisited land cell starts a new island, then flood-fill (DFS or BFS) to mark the whole island.
- Mark cells as visited before (or as) you explore them, either by sinking them in place or with a visited array.
- O(rows × cols) time; O(rows × cols) worst-case space for the recursion or the explicit stack.
- C++ details: out-of-range indexing is undefined behaviour (no exception), so the bounds check must come first; mixing \`size_t\` and \`int\` in comparisons; pass by value vs reference decides whether the caller's grid is sunk; deep recursion segfaults.

**Clarifying questions expected:**
- Do diagonal cells count as connected?
- May I modify the input grid?
- How large can the grid be?

**Code / implementation expected:** Yes — \`int numIslands(std::vector<std::string> grid)\` with a nested loop plus a flood fill, in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know 2-D arrays, and ideally what BFS and DFS are  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are handed a printed map of an archipelago drawn on squared paper: every square is either land or sea. Your job is to count the islands, and you have a highlighter.

You read the map like a book, left to right, top to bottom. The first time your eye lands on an un-highlighted land square, you say "that's a new island!", add one to your count, and then highlight *every* land square you can reach from it by stepping up, down, left or right — the whole island, however oddly shaped. Then you keep reading. Any land square you meet later that is already highlighted belongs to an island you have counted, so you skip it.

When you reach the bottom-right corner, your count is the answer. That is the whole algorithm. The highlighter is called a **flood fill**, and the "reading order" is just two nested loops. The interview question is whether you can write it cleanly, explain why it is O(rows × cols), and handle the traps: diagonal squares, modifying the input, and grids so large that recursion breaks.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do diagonal neighbours count as connected? | The classic version uses 4 directions. With 8 directions the \`101 / 010 / 101\` grid is 1 island instead of 5 (example 2). |
| May I modify the grid? | If yes, "sink" visited land by overwriting it — no extra memory. If no, keep a separate visited grid. |
| What are the cell values — characters \`'1'\`/\`'0'\` or integers? | The common LeetCode-style input is characters; comparing a character with the number 1 is a silent bug in some languages. |
| How big can the grid be? | Large, mostly-land grids make recursive DFS go very deep; the safe choice is an iterative stack or BFS. |
| Is everything outside the grid water? | Usually yes. Variants (closed islands, enclaves) treat islands touching the border differently. |
| Can the grid be empty, or rows have different lengths? | Guard \`rows == 0\` before reading \`grid[0]\`. |

## 3. The Core Idea: Scan, Then Flood Fill

Treat the grid as a graph: each land cell is a vertex, and two land cells are joined by an edge when they are side by side (up, down, left or right). An island is then a **connected component** of that graph, and counting islands is counting components (the general version is [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph)). You never build the graph; you compute neighbours on the fly (see [implicit graphs](/interview-question/what-is-a-graph-and-how-do-you-represent-it)).

📌 **Interview term: Grid graph** — a 2-D grid viewed as a graph: cells are vertices, and each cell is connected to its 4 (or 8) neighbours. It is an implicit graph — edges are computed, not stored.

📌 **Interview term: 4-directional adjacency** — two cells are neighbours only if they share a side: (r ± 1, c) or (r, c ± 1). 8-directional also counts the four diagonals.

📌 **Interview term: Flood fill** — starting from one cell, visit every cell reachable through same-coloured neighbours — the paint-bucket tool. Implemented with DFS or BFS.

📌 **Interview term: Connected component** — a maximal group of vertices in which every vertex can reach every other. Each island is one connected component of land cells.

Here is grid 2 from the examples, with each island lettered in the order the scan finds it:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 240" role="img" aria-label="A four by five grid with three islands: A has four cells in the top left, B is one cell in the middle, C has two cells in the bottom right">
  <rect class="d-box-accent" x="40" y="20" width="48" height="48"/>
  <text class="d-text" x="64" y="49" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="88" y="20" width="48" height="48"/>
  <text class="d-text" x="112" y="49" text-anchor="middle">A</text>
  <rect class="d-box-muted" x="136" y="20" width="48" height="48"/>
  <rect class="d-box-muted" x="184" y="20" width="48" height="48"/>
  <rect class="d-box-muted" x="232" y="20" width="48" height="48"/>
  <rect class="d-box-accent" x="40" y="68" width="48" height="48"/>
  <text class="d-text" x="64" y="97" text-anchor="middle">A</text>
  <rect class="d-box-accent" x="88" y="68" width="48" height="48"/>
  <text class="d-text" x="112" y="97" text-anchor="middle">A</text>
  <rect class="d-box-muted" x="136" y="68" width="48" height="48"/>
  <rect class="d-box-muted" x="184" y="68" width="48" height="48"/>
  <rect class="d-box-muted" x="232" y="68" width="48" height="48"/>
  <rect class="d-box-muted" x="40" y="116" width="48" height="48"/>
  <rect class="d-box-muted" x="88" y="116" width="48" height="48"/>
  <rect class="d-box" x="136" y="116" width="48" height="48"/>
  <text class="d-text" x="160" y="145" text-anchor="middle">B</text>
  <rect class="d-box-muted" x="184" y="116" width="48" height="48"/>
  <rect class="d-box-muted" x="232" y="116" width="48" height="48"/>
  <rect class="d-box-muted" x="40" y="164" width="48" height="48"/>
  <rect class="d-box-muted" x="88" y="164" width="48" height="48"/>
  <rect class="d-box-muted" x="136" y="164" width="48" height="48"/>
  <rect class="d-box-accent" x="184" y="164" width="48" height="48"/>
  <text class="d-text" x="208" y="193" text-anchor="middle">C</text>
  <rect class="d-box-accent" x="232" y="164" width="48" height="48"/>
  <text class="d-text" x="256" y="193" text-anchor="middle">C</text>
  <text class="d-text" x="340" y="60">A: found at (0, 0), 4 cells</text>
  <text class="d-text" x="340" y="120">B: found at (2, 2), 1 cell</text>
  <text class="d-text" x="340" y="180">C: found at (3, 3), 2 cells</text>
</svg>

B touches A only at a corner, so with 4-directional adjacency it is a separate island. The scan finds A at (0, 0) and sinks all four of its cells, so (0, 1), (1, 0) and (1, 1) are already water by the time the scan reaches them.

The flood fill itself only ever asks one question per cell: which of my four neighbours are still unvisited land?

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="A cell at row r and column c has four neighbours: up, down, left and right">
  <defs>
    <marker id="b21q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="245" y="110" width="110" height="44" rx="8"/>
  <text class="d-text" x="300" y="137" text-anchor="middle">(r, c)</text>
  <rect class="d-box" x="245" y="20" width="110" height="44" rx="8"/>
  <text class="d-text" x="300" y="47" text-anchor="middle">(r-1, c)</text>
  <rect class="d-box" x="245" y="200" width="110" height="44" rx="8"/>
  <text class="d-text" x="300" y="227" text-anchor="middle">(r+1, c)</text>
  <rect class="d-box" x="70" y="110" width="110" height="44" rx="8"/>
  <text class="d-text" x="125" y="137" text-anchor="middle">(r, c-1)</text>
  <rect class="d-box" x="420" y="110" width="110" height="44" rx="8"/>
  <text class="d-text" x="475" y="137" text-anchor="middle">(r, c+1)</text>
  <path class="d-edge-accent" d="M 300 108 L 300 70" marker-end="url(#b21q3-arrow)"/>
  <path class="d-edge-accent" d="M 300 156 L 300 194" marker-end="url(#b21q3-arrow)"/>
  <path class="d-edge-accent" d="M 243 132 L 186 132" marker-end="url(#b21q3-arrow)"/>
  <path class="d-edge-accent" d="M 357 132 L 414 132" marker-end="url(#b21q3-arrow)"/>
  <text class="d-sub" x="314" y="94">up</text>
  <text class="d-sub" x="314" y="182">down</text>
  <text class="d-sub" x="214" y="122" text-anchor="middle">left</text>
  <text class="d-sub" x="386" y="122" text-anchor="middle">right</text>
  <text class="d-sub" x="540" y="40" text-anchor="middle">skip: off grid or water</text>
</svg>

Each neighbour is first checked against the grid bounds, then against "is it land that has not been visited yet?". Only then does the fill move there.

## 4. From Brute Force to Flood Fill

**A tempting wrong idea:** count land cells that have no land neighbour above or to the left (a "top-left corner" rule). It works for rectangles but fails on shapes like a U, which has two such corners but is one island. Islands can be any shape, so you need to actually explore them.

**The algorithm:**

1. Loop over every cell, row by row.
2. When a cell is land and not yet visited, add 1 to the count — this cell starts a new island.
3. Flood-fill from it, marking every reachable land cell as visited, so none of them can start another island.

📌 **Interview term: Sinking an island** — marking visited land by overwriting it with water in the input grid itself. It saves the visited array, but it destroys the input.

Walking the scan over grid 2:

| Cell reached by the scan | Land and unvisited? | Action | Count |
| :--- | :--- | :--- | :--- |
| (0, 0) | yes | new island; fill sinks (0,0), (1,0), (0,1), (1,1) | 1 |
| (0, 1), (1, 0), (1, 1) | no — already sunk | skip | 1 |
| (2, 2) | yes | new island; fill sinks just (2,2) — its neighbours are water | 2 |
| (3, 3) | yes | new island; fill sinks (3,3), (3,4) | 3 |
| (3, 4) | no — already sunk | skip | 3 |

Every cell is looked at by the scan once and entered by a flood fill at most once, and each entry checks 4 neighbours — so the work is proportional to rows × cols.

## 5. The Code in C++

The recursive version is the one most people write first. Each row is a \`std::string\`, which (unlike in Java, Python or JavaScript) is mutable:

~~~cpp
// Sink one island: turn every connected '1' into '0'.
void sink(Grid& grid, int r, int c) {
    const int rows = grid.size(), cols = grid[0].size();
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] != '1') return;
    grid[r][c] = '0';                    // mark visited BEFORE recursing
    sink(grid, r + 1, c);
    sink(grid, r - 1, c);
    sink(grid, r, c + 1);
    sink(grid, r, c - 1);
}

// Count groups of '1' cells joined up, down, left or right.
// Takes the grid BY VALUE, so the caller's copy is not modified.
int numIslands(Grid grid) {
    int count = 0;
    for (int r = 0; r < (int)grid.size(); ++r) {
        for (int c = 0; c < (int)grid[r].size(); ++c) {
            if (grid[r][c] == '1') {     // an unvisited piece of land: a new island
                ++count;
                sink(grid, r, c);
            }
        }
    }
    return count;
}
~~~

**What to point out in this code:**

- The bounds check comes **first**, and \`||\` short-circuits so \`grid[r][c]\` is only read when it is valid. Reading \`grid[-1]\` or \`grid[rows]\` is undefined behaviour: it may crash, or it may silently read garbage memory and give a wrong count.
- \`rows\` and \`cols\` are converted to \`int\` once. \`grid.size()\` is an unsigned \`size_t\`, and comparing it with a negative \`int\` such as \`r = -1\` converts -1 to a huge unsigned number — a classic source of wrong comparisons (and compiler warnings).
- \`numIslands(Grid grid)\` takes the grid **by value**, so it sinks its own copy and the caller's grid survives. Taking \`Grid&\` would avoid the copy but destroy the caller's data; \`const Grid&\` plus a visited array (section 6) avoids both.
- \`grid[r][c] = '0'\` happens *before* the four recursive calls, so two neighbours cannot keep calling each other.
- \`numIslands({})\` builds an empty vector, so the outer loop simply does not run and the answer is 0.

📌 **Interview term: Undefined behaviour** — C++ code whose result the language does not define — such as reading outside a vector. The program may crash, may seem to work, or may give wrong answers, and the optimiser may assume it never happens.

## 6. When Recursion Is Not Safe: an Explicit Stack

We ran the recursive \`sink\` from section 5 on all-land square grids, compiled with \`g++ -O2\` and the default 8 MB stack: 400 × 400 worked, and a **450 × 450 grid (202,500 cells) crashed with a segmentation fault** — no exception, no message. The fix is to manage the stack yourself with a \`std::vector\`, and — as a bonus — to take the grid by \`const&\` with a separate visited array so the input is never modified:

~~~cpp
// Iterative DFS with an explicit stack and a separate visited grid:
// no stack overflow, and the grid is taken by const reference (never modified).
std::vector<int> islandSizes(const Grid& grid, const std::vector<std::pair<int, int>>& dirs = FOUR) {
    const int rows = grid.size(), cols = rows ? grid[0].size() : 0;
    std::vector<char> seen(rows * cols, 0);          // vector<char>, not vector<bool>: plain bytes
    std::vector<int> sizes;
    std::vector<std::pair<int, int>> stack;
    for (int r = 0; r < rows; ++r) {
        for (int c = 0; c < cols; ++c) {
            if (grid[r][c] != '1' || seen[r * cols + c]) continue;
            seen[r * cols + c] = 1;                  // mark when PUSHED
            stack.push_back({r, c});
            int size = 0;
            while (!stack.empty()) {
                auto [cr, cc] = stack.back();
                stack.pop_back();
                ++size;
                for (auto [dr, dc] : dirs) {
                    int nr = cr + dr, nc = cc + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == '1' && !seen[nr * cols + nc]) {
                        seen[nr * cols + nc] = 1;
                        stack.push_back({nr, nc});
                    }
                }
            }
            sizes.push_back(size);
        }
    }
    std::sort(sizes.begin(), sizes.end());
    return sizes;
}
~~~

\`push_back\` / \`back()\` / \`pop_back()\` on a \`std::vector\` make it a stack; a \`std::queue\` with \`front()\`/\`pop()\` turns this into BFS with the same result. \`seen\` is a flat \`std::vector<char>\` of rows × cols bytes indexed by \`r * cols + c\` — chosen over \`std::vector<bool>\`, whose bit-packed proxies are slower to read and write. A cell is marked when it is **pushed**, so it can never be on the stack twice. Note \`auto [cr, cc] = stack.back();\` copies the pair *before* \`pop_back()\`; taking a reference and then popping would leave it dangling. Example 2 runs this version on a 500 × 500 all-land grid (one island of 250,000 cells) with no stack problem.

## 7. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 builds its random 300 × 300 grid with a small deterministic generator (MINSTD), so every language sees the same map and finds the same 7,987 islands.

**Example 1 — the recursive flood fill on seven grids** prints:

~~~text
1
3
5
1
1
0
0
~~~

**Example 2 — iterative DFS with a visited grid: sizes, 8 directions, and large grids** prints:

~~~text
grid 2: 3 islands, sizes [1, 2, 4]
diagonal grid: 4-way 5, 8-way 1
input unchanged: true
500 x 500 all land: count 1, largest 250000
200 x 200 checkerboard: count 20000, largest 1
random 300 x 300 (45% land): count 7987, largest 161
~~~

## 8. Edge Cases and Follow-Ups

- **Empty grid** (\`[]\`) — return 0 before touching \`grid[0]\` (example 1).
- **All water / single cell** — 0, or 1 for a single land cell (example 1).
- **A ring of land around water** (\`111 / 101 / 111\`) — 1 island; the water inside does not split it (example 1).
- **Diagonal-only contact** (\`101 / 010 / 101\`) — 5 islands with 4 directions, 1 with 8 directions (examples 1 and 2). Make the direction list a parameter.
- **One giant island** — the worst case for recursion depth (section 6).
- **Follow-up: island sizes / max area.** Count cells inside the fill and return the size instead of discarding it (example 2 prints the sizes \`[1, 2, 4]\`).
- **Follow-up: land appears one cell at a time** ("Number of Islands II"). Rerunning the fill after every addition is slow; Union-Find answers each addition in near-constant time — see [islands with DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).
- **Related grid searches:** spreading from many cells at once is multi-source BFS ([Rotting Oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs)); DFS with memoisation on a grid is [longest increasing path in a matrix](/interview-question/longest-increasing-path-in-matrix-why-dfs-memo-beats-brute-force).

## 9. Complexity

| Version | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Recursive sink | O(R × C) | O(R × C) stack frames worst case | one giant island makes the recursion that deep; 450 × 450 segfaulted with an 8 MB stack |
| \`std::vector\` stack + \`vector<char>\` | O(R × C) | O(R × C) | one byte per cell for \`seen\` plus the stack contents |
| BFS with \`std::queue\` | O(R × C) | O(R × C) | same marks; the queue holds about one "ring" of the fill |

R × C is the number of cells; each cell is scanned once and entered by a fill at most once, with 4 neighbour checks. Taking the grid by value adds an O(R × C) copy.

## Common Pitfalls

- **Indexing before the bounds check.** Out-of-range access is undefined behaviour, not an exception; it can produce a wrong count without crashing.
- **Signed/unsigned comparisons.** \`r < grid.size()\` with \`r = -1\` is false for the wrong reason; convert sizes to \`int\` once.
- **Recursion on big grids.** 450 × 450 all land segfaulted with the default stack; use an explicit \`std::vector\` stack or BFS.
- **Taking the grid by non-const reference without saying so.** The caller's map is destroyed; take by value, or by \`const&\` with a visited array.
- **Keeping a reference to \`stack.back()\` across \`pop_back()\` or \`push_back()\`.** The reference dangles; copy the coordinates first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">The grid is a graph: land cells are vertices, side-by-side land cells are edges; an island is a connected component.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">Scan every cell; each unvisited <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'1'</code> adds 1 to the count and starts a flood fill that marks its whole island.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Marking:</strong> <span style="color:#f0e2c8;">Sink visited cells to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'0'</code> in a copy, or take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const std::vector&lt;std::string&gt;&amp;</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;char&gt; seen</code>; mark before exploring.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(rows × cols) time; O(rows × cols) worst-case space for the stack or recursion.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Check bounds first (out-of-range is undefined behaviour) and avoid deep recursion — 450 × 450 segfaulted — by using a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> as the stack.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if diagonal cells also connect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a list of 8 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{dr, dc}</code> offsets. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">101 / 010 / 101</code> grid then becomes 1 island instead of 5.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid modifying the input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Take the grid by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code> and keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;char&gt; seen(rows * cols)</code>, indexed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r * cols + c</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::vector&lt;bool&gt;</code> for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">seen</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is bit-packed, so every access goes through a proxy and bit masking; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;char&gt;</code> is a plain byte array and usually faster.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the size of the largest island?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count cells inside each fill and keep the maximum; example 2 collects all sizes and sorts them with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if land is added one cell at a time and you must report the count after each?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use Union-Find over a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt; parent</code>: each new cell starts as its own island and is unioned with land neighbours, decreasing the count on each successful union.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Grid graph** | Cells are vertices; each joins its 4 (or 8) neighbours; edges are computed |
| **4-directional adjacency** | Neighbours share a side; 8-directional adds diagonals |
| **Flood fill** | Visit every cell reachable from a start cell — the paint bucket |
| **Connected component** | Maximal group of mutually reachable vertices; one island |
| **Sinking an island** | Mark visited land by overwriting it with water in the input |
| **Undefined behaviour** | Code the C++ standard gives no meaning to, such as out-of-range indexing |

---
**Conclusion:** In C++, counting islands is two nested loops plus a flood fill: every unvisited \`'1'\` is a new island, and the fill marks the rest of it so it is never counted again. It runs in O(rows × cols). Put the bounds checks first because out-of-range access is undefined behaviour, decide deliberately between by-value and \`const&\` grids, and use a \`std::vector\` stack instead of recursion — the recursive fill segfaulted at 450 × 450. For the three-way comparison with Union-Find, see [islands with DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).`,
        examples: [
          {
            label: "Recursive flood fill: count islands on seven grids",
            code: `#include <iostream>
#include <string>
#include <vector>

using Grid = std::vector<std::string>;   // each row is a mutable std::string

// Sink one island: turn every connected '1' into '0'.
void sink(Grid& grid, int r, int c) {
    const int rows = grid.size(), cols = grid[0].size();
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] != '1') return;
    grid[r][c] = '0';                    // mark visited BEFORE recursing
    sink(grid, r + 1, c);
    sink(grid, r - 1, c);
    sink(grid, r, c + 1);
    sink(grid, r, c - 1);
}

// Count groups of '1' cells joined up, down, left or right.
// Takes the grid BY VALUE, so the caller's copy is not modified.
int numIslands(Grid grid) {
    int count = 0;
    for (int r = 0; r < (int)grid.size(); ++r) {
        for (int c = 0; c < (int)grid[r].size(); ++c) {
            if (grid[r][c] == '1') {     // an unvisited piece of land: a new island
                ++count;
                sink(grid, r, c);
            }
        }
    }
    return count;
}

int main() {
    std::cout << numIslands({"11110", "11010", "11000", "00000"}) << "\\n"; // 1
    std::cout << numIslands({"11000", "11000", "00100", "00011"}) << "\\n"; // 3
    std::cout << numIslands({"101", "010", "101"}) << "\\n";                // 5
    std::cout << numIslands({"111", "101", "111"}) << "\\n";                // 1
    std::cout << numIslands({"1"}) << "\\n";                                // 1
    std::cout << numIslands({"0"}) << "\\n";                                // 0
    std::cout << numIslands({}) << "\\n";                                   // 0
}`,
          },
          {
            label: "Iterative DFS, visited grid, island sizes, 8 directions, large grids",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

using Grid = std::vector<std::string>;
const std::vector<std::pair<int, int>> FOUR = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
const std::vector<std::pair<int, int>> EIGHT = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}, {1, 1}, {1, -1}, {-1, 1}, {-1, -1}};

// Iterative DFS with an explicit stack and a separate visited grid:
// no stack overflow, and the grid is taken by const reference (never modified).
std::vector<int> islandSizes(const Grid& grid, const std::vector<std::pair<int, int>>& dirs = FOUR) {
    const int rows = grid.size(), cols = rows ? grid[0].size() : 0;
    std::vector<char> seen(rows * cols, 0);          // vector<char>, not vector<bool>: plain bytes
    std::vector<int> sizes;
    std::vector<std::pair<int, int>> stack;
    for (int r = 0; r < rows; ++r) {
        for (int c = 0; c < cols; ++c) {
            if (grid[r][c] != '1' || seen[r * cols + c]) continue;
            seen[r * cols + c] = 1;                  // mark when PUSHED
            stack.push_back({r, c});
            int size = 0;
            while (!stack.empty()) {
                auto [cr, cc] = stack.back();
                stack.pop_back();
                ++size;
                for (auto [dr, dc] : dirs) {
                    int nr = cr + dr, nc = cc + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == '1' && !seen[nr * cols + nc]) {
                        seen[nr * cols + nc] = 1;
                        stack.push_back({nr, nc});
                    }
                }
            }
            sizes.push_back(size);
        }
    }
    std::sort(sizes.begin(), sizes.end());
    return sizes;
}

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); ++i) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

void report(const std::string& name, const Grid& grid) {
    auto sizes = islandSizes(grid);
    std::cout << name << ": count " << sizes.size() << ", largest " << (sizes.empty() ? 0 : sizes.back()) << "\\n";
}

int main() {
    Grid g2 = {"11000", "11000", "00100", "00011"};
    std::cout << "grid 2: " << islandSizes(g2).size() << " islands, sizes " << fmt(islandSizes(g2)) << "\\n";
    Grid diag = {"101", "010", "101"};
    std::cout << "diagonal grid: 4-way " << islandSizes(diag).size() << ", 8-way " << islandSizes(diag, EIGHT).size() << "\\n";
    Grid before = g2;
    islandSizes(g2);
    std::cout << std::boolalpha << "input unchanged: " << (g2 == before) << "\\n";

    report("500 x 500 all land", Grid(500, std::string(500, '1')));
    Grid board(200, std::string(200, '0'));
    for (int r = 0; r < 200; ++r)
        for (int c = 0; c < 200; ++c)
            if ((r + c) % 2 == 0) board[r][c] = '1';
    report("200 x 200 checkerboard", board);

    long long seed = 7;                              // 64-bit: seed * 48271 overflows int
    Grid rnd(300, std::string(300, '0'));
    for (int r = 0; r < 300; ++r)
        for (int c = 0; c < 300; ++c) {
            seed = seed * 48271 % 2147483647;
            if (seed % 100 < 45) rnd[r][c] = '1';
        }
    report("random 300 x 300 (45% land)", rnd);
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "Number of islands with DFS vs BFS vs Union-Find — trade-offs?",
    difficulty: "medium",
    seoDescription: "Number of islands with DFS, BFS or Union-Find: time, memory, recursion risk and the incremental variant, with verified Python, JavaScript, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You have solved number of islands with DFS. Now compare DFS, BFS and Union-Find for this problem — their costs, their risks, and when you would choose each — and implement the Union-Find version in Python."

**What a strong answer should cover:**
- All three are O(rows × cols) for a single count (Union-Find with path compression and union by size is O(α(n)) per operation, effectively constant).
- Memory shape: DFS stack (or recursion) vs BFS queue vs Union-Find's full \`parent\`/\`size\` arrays; recursive DFS can hit the recursion limit.
- Union-Find counts as land − successful unions, looking only right and down from each cell.
- Union-Find shines when land arrives incrementally (Number of Islands II); it cannot handle removals; BFS is the one that gives distances.
- Python details: iterative \`find\` (no recursion), \`list(range(n))\` for \`parent\`, \`collections.deque\` for BFS, and the 1000-frame recursion limit for recursive DFS.

**Code / implementation expected:** Yes — a Union-Find (with path halving and union by size) over cell ids \`r * cols + c\`, in Python.`,
        answer: `**Target Audience:** Candidates who can already solve number of islands once and want to compare the three standard approaches  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Three surveyors are sent to count the islands of a newly mapped archipelago.

**The hiker (DFS)** lands on the first unvisited beach and walks inland as far as she can, then retraces her steps to try every side path, planting a flag on each square. Her notebook only holds the trail back to where she started — but on a huge, winding island that trail can get very long.

**The search party (BFS)** lands on the first beach and spreads out in a ring, everyone stepping one square further each minute, until the ring has swept the whole island. They never need a long trail, but on a wide island the ring itself can be large.

**The land registry clerk (Union-Find)** never leaves the office. She gets a list of squares and, for every pair of neighbouring land squares, staples their deeds into the same folder. When the list is done, the number of folders is the number of islands. Her real superpower shows up when new land is reclaimed from the sea every day: she just staples one more deed, while the other two would have to re-survey the whole map.

All three get the same count. The interview question is about *what each one costs, what can go wrong, and which one you would pick for which variant of the problem*.

## 2. The Three Approaches in One Paragraph Each

All three see the grid as an implicit graph in which each land cell joins its land neighbours (the basic solution and the flood fill are on the [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) page; the traversal orders are on [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs)).

- **DFS flood fill.** Scan the grid; each unvisited land cell starts a new island, and a depth-first fill marks the rest of it — recursively, or with an explicit stack.
- **BFS flood fill.** The same scan, but the fill uses a FIFO queue, so it spreads in rings.
- **Union-Find.** Give every cell an id, start with every land cell in its own set, and for every pair of side-by-side land cells call \`union\`. Each union that actually merges two sets removes one island, so **islands = land cells − successful unions**.

📌 **Interview term: Union-Find (Disjoint Set Union, DSU)** — a structure that keeps elements in disjoint groups and supports two operations: \`find(x)\` returns the representative (root) of x's group, and \`union(a, b)\` merges the groups of a and b. Full treatment: [the Union-Find data structure](/interview-question/what-is-the-union-find-disjoint-set-data-structure).

📌 **Interview term: Path compression / path halving** — while \`find\` walks up to the root, it re-points nodes closer to the root, so later finds are shorter. Path halving points every other node at its grandparent in one loop.

📌 **Interview term: Union by size (or rank)** — always hang the smaller tree under the root of the larger one, so trees stay shallow.

📌 **Interview term: Inverse Ackermann function α(n)** — an extremely slow-growing function. With both optimisations, m Union-Find operations on n elements take O(m · α(n)) time ([Tarjan, J. ACM 22(2), 1975](https://projects.csail.mit.edu/jacm/References/tarjan1975:215.html)); for any input that fits in memory α(n) is at most 4, so each operation is effectively constant time.

📌 **Interview term: Cell id (flattening)** — turning a 2-D position (r, c) into one integer \`r * cols + c\`, so a grid of R × C cells can live in one array of size R × C.

To find every neighbour pair exactly once, Union-Find only looks **right** and **down** from each land cell. Here is the top-left island of grid 2 (5 columns wide, so the cell ids are 0, 1, 5 and 6):

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Four land cells start as four separate sets. After three successful unions all four point to root 0">
  <defs>
    <marker id="b21q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="160" y="30" text-anchor="middle">before: 4 roots</text>
  <rect class="d-box-accent" x="30" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="55" y="90" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="100" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="125" y="90" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="170" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="195" y="90" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="240" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="265" y="90" text-anchor="middle">6</text>
  <text class="d-sub" x="160" y="150" text-anchor="middle">land 4, unions 0</text>
  <path class="d-edge" d="M 300 85 L 410 85" marker-end="url(#b21q4-arrow)"/>
  <text class="d-sub" x="355" y="70" text-anchor="middle">3 unions</text>
  <text class="d-text" x="465" y="30" text-anchor="middle">after: 1 root</text>
  <rect class="d-box-accent" x="440" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="465" y="90" text-anchor="middle">0</text>
  <rect class="d-box" x="360" y="170" width="50" height="50" rx="8"/>
  <text class="d-text" x="385" y="200" text-anchor="middle">1</text>
  <rect class="d-box" x="440" y="170" width="50" height="50" rx="8"/>
  <text class="d-text" x="465" y="200" text-anchor="middle">5</text>
  <rect class="d-box" x="520" y="170" width="50" height="50" rx="8"/>
  <text class="d-text" x="545" y="200" text-anchor="middle">6</text>
  <path class="d-edge-accent" d="M 392 168 L 452 116" marker-end="url(#b21q4-arrow)"/>
  <path class="d-edge-accent" d="M 465 168 L 465 116" marker-end="url(#b21q4-arrow)"/>
  <path class="d-edge-accent" d="M 538 168 L 478 116" marker-end="url(#b21q4-arrow)"/>
  <text class="d-sub" x="465" y="245" text-anchor="middle">land 4, unions 3, islands 1</text>
</svg>

Cell 0 unions with 5 (down) and 1 (right); cell 1 unions with 6 (down). When cell 5 tries to union with 6 (right), both already have root 0, so nothing changes — that pair was a "cycle" in the island. Four land cells minus three successful unions is one island.

## 3. The Trade-Offs Side by Side

| | DFS flood fill | BFS flood fill | Union-Find |
| :--- | :--- | :--- | :--- |
| Time for one count | O(R × C) | O(R × C) | O(R × C · α(R × C)), effectively O(R × C) |
| Extra memory | visited grid (or none if sinking) + stack | visited grid (or none) + queue | \`parent\` + \`size\` arrays of R × C |
| Peak frontier on a 300 × 300 all-land grid | 44,851 cells on the stack | 300 cells in the queue | no frontier; 90,000-entry arrays |
| Recursion risk | yes, if written recursively | none | none (iterative \`find\`) |
| Modifies the input? | if you sink cells | if you sink cells | no |
| Land added one cell at a time | re-run: O(R × C) per addition | re-run: O(R × C) per addition | **O(α) per addition** |
| Land removed | re-run | re-run | not supported (no un-union) |
| Island sizes / shapes | easy (count inside the fill) | easy | sizes from the \`size\` array; shapes harder |
| Code to write | shortest | short | longest (a small class) |

📌 **Interview term: Online (incremental) connectivity** — answering "how many groups are there now?" after each new edge or cell arrives, without recomputing from scratch. Union-Find is built for this; it cannot handle deletions.

The memory row comes from example 1, which runs all three on the same 300 × 300 all-land grid and records how big each one's working storage gets:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="Peak working memory on a 300 by 300 all land grid: DFS stack 44851 cells, BFS queue 300 cells, Union-Find parent array 90000 entries">
  <text class="d-text" x="20" y="52">DFS stack peak</text>
  <rect class="d-box-accent" x="200" y="30" width="150" height="34" rx="4"/>
  <text class="d-sub" x="365" y="52">44,851 cells</text>
  <text class="d-text" x="20" y="112">BFS queue peak</text>
  <rect class="d-box-accent" x="200" y="90" width="3" height="34" rx="1"/>
  <text class="d-sub" x="218" y="112">300 cells</text>
  <text class="d-text" x="20" y="172">Union-Find parent</text>
  <rect class="d-box-muted" x="200" y="150" width="300" height="34" rx="4"/>
  <text class="d-sub" x="515" y="172">90,000 entries</text>
</svg>

Why is the DFS stack so much bigger than the BFS queue? The iterative DFS marks a cell when it pushes it, and on a solid block it keeps pushing neighbours faster than it pops them, so roughly half the island ends up waiting on the stack. BFS spreads as a diagonal wave, and on a 300 × 300 square that wave is never longer than about 300 cells. The order of the direction list changes the DFS number but not the overall picture. Union-Find has no frontier at all, but it always allocates its arrays for every cell, water included.

## 4. Union-Find on a Grid in Python

The DFS and BFS versions are the flood fills from the [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) page (example 1 contains all three). Here is the Union-Find version:

~~~python
def count_union_find(grid):
    """Union-Find over cell ids r * cols + c. Returns (islands, successful unions)."""
    rows, cols = len(grid), len(grid[0]) if grid else 0
    parent = list(range(rows * cols))
    size = [1] * (rows * cols)

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]   # path halving: point to the grandparent
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra == rb:
            return False                     # already on the same island
        if size[ra] < size[rb]:
            ra, rb = rb, ra
        parent[rb] = ra                      # union by size: small tree under big tree
        size[ra] += size[rb]
        return True

    land = unions = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != "1":
                continue
            land += 1
            if r + 1 < rows and grid[r + 1][c] == "1" and union(r * cols + c, (r + 1) * cols + c):
                unions += 1
            if c + 1 < cols and grid[r][c + 1] == "1" and union(r * cols + c, r * cols + c + 1):
                unions += 1
    return land - unions, unions             # every successful union merges two islands
~~~

**What to point out in this code:**

- \`parent = list(range(rows * cols))\` gives every cell its own set. Water cells are allocated too but never touched — the price of a flat array.
- \`find\` is a \`while\` loop, not recursion. A recursive \`find\` with full path compression is the textbook version; with union by size the trees stay about log₂ n deep so it would be safe, but if someone later drops union by size, a long chain would hit Python's 1000-frame limit. The loop removes that risk entirely.
- \`parent[x] = parent[parent[x]]\` is path halving: each step points \`x\` at its grandparent, roughly halving the path every time it is walked.
- \`ra, rb = rb, ra\` swaps with tuple assignment so the larger tree is always \`ra\`.
- Only the right and down neighbours are checked; checking all four would try every pair twice (harmless, but twice the work).
- The function returns a tuple \`(islands, unions)\`; example 1 uses the second value to show that 89,999 unions turn 90,000 land cells into one island.

📌 **Interview term: Amortised cost** — the average cost per operation over a long sequence, even if a single operation is occasionally more expensive. Union-Find's O(α(n)) bound is amortised.

## 5. Where Union-Find Wins: Land Added One Cell at a Time

In "Number of Islands II" the grid starts as all water and you receive a list of cells that become land, one at a time; after each one you must report the current number of islands. Re-running a flood fill after every addition costs O(R × C) each time. With Union-Find, a new land cell is a new one-cell island, and each union with a land neighbour that succeeds glues two islands into one:

~~~python
class Islands:
    """Number of Islands II: land appears one cell at a time; report the count
    after every addition. Union-Find makes each addition nearly O(1)."""

    def __init__(self, rows, cols):
        self.rows, self.cols = rows, cols
        self.parent = [-1] * (rows * cols)   # -1 means water
        self.size = [0] * (rows * cols)
        self.count = 0
        self.steps = 0                       # parent pointers followed inside find()

    def find(self, x):
        while self.parent[x] != x:
            self.steps += 1
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def add_land(self, r, c):
        cell = r * self.cols + c
        if self.parent[cell] != -1:
            return self.count                # already land: nothing changes
        self.parent[cell], self.size[cell] = cell, 1
        self.count += 1                      # a new one-cell island ...
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < self.rows and 0 <= nc < self.cols and self.parent[nr * self.cols + nc] != -1:
                a, b = self.find(cell), self.find(nr * self.cols + nc)
                if a != b:                   # ... that may glue existing islands together
                    if self.size[a] < self.size[b]:
                        a, b = b, a
                    self.parent[b] = a
                    self.size[a] += self.size[b]
                    self.count -= 1
        return self.count
~~~

- \`parent[cell] == -1\` marks water, so the same array tells you both "is this land?" and "what is its parent?".
- Adding a cell that is already land returns the current count unchanged (the duplicate \`(0, 1)\` in the example).
- \`self.steps\` counts parent pointers followed inside \`find\`, so the output can show how little work each addition does.

## 6. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. The random grids and cell sequences come from a small deterministic generator (MINSTD), so every language processes exactly the same input. Example 2 checks Union-Find against a full BFS recount after every one of the 450 additions and reports 0 mismatches.

**Example 1 — DFS, BFS and Union-Find agree, and how much memory each uses** prints:

~~~text
leetcode 1: dfs 1, bfs 1, union-find 1
leetcode 2: dfs 3, bfs 3, union-find 3
ring: dfs 1, bfs 1, union-find 1
diagonal: dfs 5, bfs 5, union-find 5
random 300 x 300: dfs 7987, bfs 7987, union-find 7987
300 x 300 all land:
  DFS stack peak:  44851
  BFS queue peak:  300
  union-find: parent array 90000, successful unions 89999
~~~

**Example 2 — Number of Islands II: Union-Find vs re-running BFS after every addition** prints:

~~~text
3 x 3 additions: [1, 1, 2, 3, 1, 1]
450 additions on 30 x 30: final count 90, mismatches 0
  recount with BFS each time: 405000 cells scanned
  union-find: 207 pointer steps in find()
~~~

## 7. Reading the Numbers

- All three methods agree on every grid, including the random 300 × 300 grid with 7,987 islands.
- On the 300 × 300 all-land grid, the DFS stack peaked at **44,851** cells, the BFS queue at **300**, and Union-Find made **89,999** successful unions (90,000 land cells → 1 island).
- In the incremental test, Union-Find followed only **207** parent pointers across all 450 additions, while recounting with BFS after each addition scanned **405,000** cells — the gap grows with the grid size, because every recount is O(R × C).

## 8. Complexity

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| DFS (iterative list stack) | O(R × C) | O(R × C) | stack reached 44,851 on 300 × 300 all land; recursive version hits the 1000-frame limit at 32 × 32 |
| BFS (\`collections.deque\`) | O(R × C) | O(R × C) worst case | queue peaked at 300 on the same grid |
| Union-Find, one count | O(R × C · α) | O(R × C) | two Python lists of R × C ints |
| Islands II with Union-Find | O(α) amortised per addition | O(R × C) | 207 \`find\` steps for 450 additions |
| Islands II by re-running BFS | O(R × C) per addition | O(R × C) | 405,000 cells scanned for 450 additions |

## 9. Which One Should You Pick?

- **The standard "count islands once" question:** DFS or BFS. They are the shortest to write and need no extra structure. Prefer an **iterative** DFS or BFS for large grids; mention that recursive DFS can overflow the stack on a big island.
- **You care about peak memory on big, solid islands:** BFS — its queue stays about as long as the grid is wide (300 here) while the DFS stack grew to 44,851.
- **Land arrives over time ("Number of Islands II") or edges arrive as a stream:** Union-Find. Example 2 does 450 additions with only 207 pointer steps inside \`find\`, while re-running BFS after each addition scans 405,000 cells.
- **You must not touch the input and want no recursion at all:** Union-Find or iterative BFS with a visited array.
- **You need distances (how far is each cell from the nearest X?):** BFS — Union-Find knows *which* group a cell is in, never *how far*. Multi-source BFS is the tool for spreading problems such as [Rotting Oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs).
- **The same idea on a general graph** (edges instead of grid neighbours) is [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph).

## Common Pitfalls

- **Recursive \`find\` in Python.** It can exceed the recursion limit on an unbalanced tree; write it as a loop with path halving.
- **Forgetting union by size *and* path compression.** With neither, a chain of unions can make \`find\` O(n) and the whole count O(n²).
- **Counting \`len(set(parent))\` at the end.** Water cells are their own parents too; count land minus successful unions instead, or only roots of land cells.
- **Checking all four neighbours in the static version.** Correct but double work; right and down are enough.
- **Treating Union-Find as general-purpose.** It cannot remove land or report distances; for those, go back to BFS.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Same answer, same big-O:</strong> <span style="color:#f0e2c8;">DFS, BFS and Union-Find all count islands in O(rows × cols); Union-Find adds a factor α(n) that is at most 4 in practice.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Memory shape:</strong> <span style="color:#f0e2c8;">DFS keeps a stack (44,851 cells on a 300 × 300 land block), BFS a queue (300 cells), Union-Find two full arrays of rows × cols.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Risks:</strong> <span style="color:#f0e2c8;">Recursive DFS hits Python's 1000-frame limit on a 32 × 32 land grid; iterative DFS, BFS and Union-Find have no recursion.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Union-Find count:</strong> <span style="color:#f0e2c8;">Land cells minus successful unions, uniting each land cell with its right and down land neighbours.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When to choose:</strong> <span style="color:#f0e2c8;">Flood fill for a one-off count, BFS when distances matter, Union-Find when land arrives over time (Number of Islands II).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does Union-Find only look right and down?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every neighbour pair is then seen exactly once, from its top or left cell. Looking in all four directions would try each pair twice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What exactly does path compression buy you?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> flattens the path it walks, so repeated finds become nearly O(1); together with union by size the amortised cost is O(α(n)).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can Union-Find handle land turning back into water?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It has no efficient split operation; you would rebuild, or process the operations in reverse (adding land) if all of them are known up front.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which uses the least memory on a huge grid?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sinking the input with BFS needs only the queue. Union-Find always allocates two arrays of rows × cols, even for water.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you report island sizes with Union-Find?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size[find(x)]</code> is the size of x's island; collect it for each root that belongs to a land cell.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Union-Find (Disjoint Set Union, DSU)** | Disjoint groups with \`find\` (root of x) and \`union\` (merge two groups) |
| **Path compression / path halving** | Re-point nodes toward the root during \`find\` so later finds are short |
| **Union by size (or rank)** | Hang the smaller tree under the larger root to keep trees shallow |
| **Inverse Ackermann function α(n)** | Grows so slowly it is at most 4 in practice; DSU ops cost O(α(n)) |
| **Cell id (flattening)** | \`r * cols + c\`: one integer per grid cell |
| **Online (incremental) connectivity** | Keep the group count up to date as edges or cells arrive |
| **Amortised cost** | Average cost per operation over a whole sequence |

---
**Conclusion:** In Python all three approaches count islands in O(rows × cols); the difference is in their working memory, their failure modes and the variants they handle. A flood fill is the shortest code for a one-off count — iterative, because recursion stops at 1000 frames — BFS gives distances and the smallest frontier on solid islands, and Union-Find, written with a \`while\`-loop \`find\`, path halving and union by size, is the one that keeps the count correct as land arrives one cell at a time.`,
        examples: [
          {
            label: "DFS vs BFS vs Union-Find: same counts, different peak memory",
            code: `from collections import deque

DIRS = ((1, 0), (-1, 0), (0, 1), (0, -1))


def count_dfs(grid):
    """Iterative DFS. Returns (islands, largest stack size seen)."""
    rows, cols = len(grid), len(grid[0]) if grid else 0
    seen = [[False] * cols for _ in range(rows)]
    count = peak = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1" and not seen[r][c]:
                count += 1
                seen[r][c] = True
                stack = [(r, c)]
                while stack:
                    peak = max(peak, len(stack))
                    cr, cc = stack.pop()
                    for dr, dc in DIRS:
                        nr, nc = cr + dr, cc + dc
                        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1" and not seen[nr][nc]:
                            seen[nr][nc] = True
                            stack.append((nr, nc))
    return count, peak


def count_bfs(grid):
    """BFS with collections.deque. Returns (islands, largest queue size seen)."""
    rows, cols = len(grid), len(grid[0]) if grid else 0
    seen = [[False] * cols for _ in range(rows)]
    count = peak = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1" and not seen[r][c]:
                count += 1
                seen[r][c] = True
                queue = deque([(r, c)])
                while queue:
                    peak = max(peak, len(queue))
                    cr, cc = queue.popleft()
                    for dr, dc in DIRS:
                        nr, nc = cr + dr, cc + dc
                        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1" and not seen[nr][nc]:
                            seen[nr][nc] = True
                            queue.append((nr, nc))
    return count, peak


def count_union_find(grid):
    """Union-Find over cell ids r * cols + c. Returns (islands, successful unions)."""
    rows, cols = len(grid), len(grid[0]) if grid else 0
    parent = list(range(rows * cols))
    size = [1] * (rows * cols)

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]   # path halving: point to the grandparent
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra == rb:
            return False                     # already on the same island
        if size[ra] < size[rb]:
            ra, rb = rb, ra
        parent[rb] = ra                      # union by size: small tree under big tree
        size[ra] += size[rb]
        return True

    land = unions = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != "1":
                continue
            land += 1
            if r + 1 < rows and grid[r + 1][c] == "1" and union(r * cols + c, (r + 1) * cols + c):
                unions += 1
            if c + 1 < cols and grid[r][c + 1] == "1" and union(r * cols + c, r * cols + c + 1):
                unions += 1
    return land - unions, unions             # every successful union merges two islands


def minstd_grid(n, seed, percent):
    rows = []
    for _ in range(n):
        row = ""
        for _ in range(n):
            seed = seed * 48271 % 2147483647
            row += "1" if seed % 100 < percent else "0"
        rows.append(row)
    return rows


tests = [
    ("leetcode 1", ["11110", "11010", "11000", "00000"]),
    ("leetcode 2", ["11000", "11000", "00100", "00011"]),
    ("ring", ["111", "101", "111"]),
    ("diagonal", ["101", "010", "101"]),
    ("random 300 x 300", minstd_grid(300, 7, 45)),
]
for name, grid in tests:
    d, b, u = count_dfs(grid)[0], count_bfs(grid)[0], count_union_find(grid)[0]
    print(name + ": dfs " + str(d) + ", bfs " + str(b) + ", union-find " + str(u))

full = ["1" * 300] * 300
print("300 x 300 all land:")
print("  DFS stack peak:  " + str(count_dfs(full)[1]))
print("  BFS queue peak:  " + str(count_bfs(full)[1]))
print("  union-find: parent array " + str(300 * 300) + ", successful unions " + str(count_union_find(full)[1]))`,
          },
          {
            label: "Number of Islands II: Union-Find vs recounting with BFS",
            code: `from collections import deque


class Islands:
    """Number of Islands II: land appears one cell at a time; report the count
    after every addition. Union-Find makes each addition nearly O(1)."""

    def __init__(self, rows, cols):
        self.rows, self.cols = rows, cols
        self.parent = [-1] * (rows * cols)   # -1 means water
        self.size = [0] * (rows * cols)
        self.count = 0
        self.steps = 0                       # parent pointers followed inside find()

    def find(self, x):
        while self.parent[x] != x:
            self.steps += 1
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def add_land(self, r, c):
        cell = r * self.cols + c
        if self.parent[cell] != -1:
            return self.count                # already land: nothing changes
        self.parent[cell], self.size[cell] = cell, 1
        self.count += 1                      # a new one-cell island ...
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < self.rows and 0 <= nc < self.cols and self.parent[nr * self.cols + nc] != -1:
                a, b = self.find(cell), self.find(nr * self.cols + nc)
                if a != b:                   # ... that may glue existing islands together
                    if self.size[a] < self.size[b]:
                        a, b = b, a
                    self.parent[b] = a
                    self.size[a] += self.size[b]
                    self.count -= 1
        return self.count


def recount_bfs(land, rows, cols):
    """The slow way: a full BFS over the whole grid after every addition."""
    seen = [[False] * cols for _ in range(rows)]
    count = 0
    for r in range(rows):
        for c in range(cols):
            if land[r][c] and not seen[r][c]:
                count += 1
                seen[r][c] = True
                q = deque([(r, c)])
                while q:
                    cr, cc = q.popleft()
                    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nr, nc = cr + dr, cc + dc
                        if 0 <= nr < rows and 0 <= nc < cols and land[nr][nc] and not seen[nr][nc]:
                            seen[nr][nc] = True
                            q.append((nr, nc))
    return count


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


small = Islands(3, 3)
adds = [(0, 0), (0, 1), (1, 2), (2, 1), (1, 1), (0, 1)]
print("3 x 3 additions: " + fmt([small.add_land(r, c) for r, c in adds]))

N, K = 30, 450
uf = Islands(N, N)
land = [[False] * N for _ in range(N)]
seed, mismatches, bfs_cells = 11, 0, 0
for _ in range(K):
    seed = seed * 48271 % 2147483647
    r, c = seed % N, (seed // N) % N
    land[r][c] = True
    fast = uf.add_land(r, c)
    slow = recount_bfs(land, N, N)
    bfs_cells += N * N                       # every recount scans all N * N cells
    if fast != slow:
        mismatches += 1
print(str(K) + " additions on " + str(N) + " x " + str(N) + ": final count " + str(uf.count) + ", mismatches " + str(mismatches))
print("  recount with BFS each time: " + str(bfs_cells) + " cells scanned")
print("  union-find: " + str(uf.steps) + " pointer steps in find()")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You have solved number of islands with DFS. Now compare DFS, BFS and Union-Find for this problem — their costs, their risks, and when you would choose each — and implement the Union-Find version in JavaScript."

**What a strong answer should cover:**
- All three are O(rows × cols) for a single count (Union-Find with path compression and union by size is O(α(n)) per operation, effectively constant).
- Memory shape: DFS stack (or recursion) vs BFS queue vs Union-Find's full \`parent\`/\`size\` arrays; recursive DFS can throw \`RangeError\`.
- Union-Find counts as land − successful unions, looking only right and down from each cell.
- Union-Find shines when land arrives incrementally (Number of Islands II); it cannot handle removals; BFS is the one that gives distances.
- JavaScript details: \`Int32Array\` for \`parent\`/\`size\`, a head index instead of \`shift()\` for BFS, \`Math.floor\` for integer division when decoding ids, and destructuring swaps.

**Code / implementation expected:** Yes — a Union-Find (with path halving and union by size) over cell ids \`r * cols + c\`, in JavaScript.`,
        answer: `**Target Audience:** Candidates who can already solve number of islands once and want to compare the three standard approaches  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Three surveyors are sent to count the islands of a newly mapped archipelago.

**The hiker (DFS)** lands on the first unvisited beach and walks inland as far as she can, then retraces her steps to try every side path, planting a flag on each square. Her notebook only holds the trail back to where she started — but on a huge, winding island that trail can get very long.

**The search party (BFS)** lands on the first beach and spreads out in a ring, everyone stepping one square further each minute, until the ring has swept the whole island. They never need a long trail, but on a wide island the ring itself can be large.

**The land registry clerk (Union-Find)** never leaves the office. She gets a list of squares and, for every pair of neighbouring land squares, staples their deeds into the same folder. When the list is done, the number of folders is the number of islands. Her real superpower shows up when new land is reclaimed from the sea every day: she just staples one more deed, while the other two would have to re-survey the whole map.

All three get the same count. The interview question is about *what each one costs, what can go wrong, and which one you would pick for which variant of the problem*.

## 2. The Three Approaches in One Paragraph Each

All three see the grid as an implicit graph in which each land cell joins its land neighbours (the basic solution and the flood fill are on the [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) page; the traversal orders are on [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs)).

- **DFS flood fill.** Scan the grid; each unvisited land cell starts a new island, and a depth-first fill marks the rest of it — recursively, or with an explicit stack.
- **BFS flood fill.** The same scan, but the fill uses a FIFO queue, so it spreads in rings.
- **Union-Find.** Give every cell an id, start with every land cell in its own set, and for every pair of side-by-side land cells call \`union\`. Each union that actually merges two sets removes one island, so **islands = land cells − successful unions**.

📌 **Interview term: Union-Find (Disjoint Set Union, DSU)** — a structure that keeps elements in disjoint groups and supports two operations: \`find(x)\` returns the representative (root) of x's group, and \`union(a, b)\` merges the groups of a and b. Full treatment: [the Union-Find data structure](/interview-question/what-is-the-union-find-disjoint-set-data-structure).

📌 **Interview term: Path compression / path halving** — while \`find\` walks up to the root, it re-points nodes closer to the root, so later finds are shorter. Path halving points every other node at its grandparent in one loop.

📌 **Interview term: Union by size (or rank)** — always hang the smaller tree under the root of the larger one, so trees stay shallow.

📌 **Interview term: Inverse Ackermann function α(n)** — an extremely slow-growing function. With both optimisations, m Union-Find operations on n elements take O(m · α(n)) time ([Tarjan, J. ACM 22(2), 1975](https://projects.csail.mit.edu/jacm/References/tarjan1975:215.html)); for any input that fits in memory α(n) is at most 4, so each operation is effectively constant time.

📌 **Interview term: Cell id (flattening)** — turning a 2-D position (r, c) into one integer \`r * cols + c\`, so a grid of R × C cells can live in one array of size R × C.

To find every neighbour pair exactly once, Union-Find only looks **right** and **down** from each land cell. Here is the top-left island of grid 2 (5 columns wide, so the cell ids are 0, 1, 5 and 6):

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Four land cells start as four separate sets. After three successful unions all four point to root 0">
  <defs>
    <marker id="b21q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="160" y="30" text-anchor="middle">before: 4 roots</text>
  <rect class="d-box-accent" x="30" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="55" y="90" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="100" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="125" y="90" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="170" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="195" y="90" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="240" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="265" y="90" text-anchor="middle">6</text>
  <text class="d-sub" x="160" y="150" text-anchor="middle">land 4, unions 0</text>
  <path class="d-edge" d="M 300 85 L 410 85" marker-end="url(#b21q4-arrow)"/>
  <text class="d-sub" x="355" y="70" text-anchor="middle">3 unions</text>
  <text class="d-text" x="465" y="30" text-anchor="middle">after: 1 root</text>
  <rect class="d-box-accent" x="440" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="465" y="90" text-anchor="middle">0</text>
  <rect class="d-box" x="360" y="170" width="50" height="50" rx="8"/>
  <text class="d-text" x="385" y="200" text-anchor="middle">1</text>
  <rect class="d-box" x="440" y="170" width="50" height="50" rx="8"/>
  <text class="d-text" x="465" y="200" text-anchor="middle">5</text>
  <rect class="d-box" x="520" y="170" width="50" height="50" rx="8"/>
  <text class="d-text" x="545" y="200" text-anchor="middle">6</text>
  <path class="d-edge-accent" d="M 392 168 L 452 116" marker-end="url(#b21q4-arrow)"/>
  <path class="d-edge-accent" d="M 465 168 L 465 116" marker-end="url(#b21q4-arrow)"/>
  <path class="d-edge-accent" d="M 538 168 L 478 116" marker-end="url(#b21q4-arrow)"/>
  <text class="d-sub" x="465" y="245" text-anchor="middle">land 4, unions 3, islands 1</text>
</svg>

Cell 0 unions with 5 (down) and 1 (right); cell 1 unions with 6 (down). When cell 5 tries to union with 6 (right), both already have root 0, so nothing changes — that pair was a "cycle" in the island. Four land cells minus three successful unions is one island.

## 3. The Trade-Offs Side by Side

| | DFS flood fill | BFS flood fill | Union-Find |
| :--- | :--- | :--- | :--- |
| Time for one count | O(R × C) | O(R × C) | O(R × C · α(R × C)), effectively O(R × C) |
| Extra memory | visited grid (or none if sinking) + stack | visited grid (or none) + queue | \`parent\` + \`size\` arrays of R × C |
| Peak frontier on a 300 × 300 all-land grid | 44,851 cells on the stack | 300 cells in the queue | no frontier; 90,000-entry arrays |
| Recursion risk | yes, if written recursively | none | none (iterative \`find\`) |
| Modifies the input? | if you sink cells | if you sink cells | no |
| Land added one cell at a time | re-run: O(R × C) per addition | re-run: O(R × C) per addition | **O(α) per addition** |
| Land removed | re-run | re-run | not supported (no un-union) |
| Island sizes / shapes | easy (count inside the fill) | easy | sizes from the \`size\` array; shapes harder |
| Code to write | shortest | short | longest (a small class) |

📌 **Interview term: Online (incremental) connectivity** — answering "how many groups are there now?" after each new edge or cell arrives, without recomputing from scratch. Union-Find is built for this; it cannot handle deletions.

The memory row comes from example 1, which runs all three on the same 300 × 300 all-land grid and records how big each one's working storage gets:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="Peak working memory on a 300 by 300 all land grid: DFS stack 44851 cells, BFS queue 300 cells, Union-Find parent array 90000 entries">
  <text class="d-text" x="20" y="52">DFS stack peak</text>
  <rect class="d-box-accent" x="200" y="30" width="150" height="34" rx="4"/>
  <text class="d-sub" x="365" y="52">44,851 cells</text>
  <text class="d-text" x="20" y="112">BFS queue peak</text>
  <rect class="d-box-accent" x="200" y="90" width="3" height="34" rx="1"/>
  <text class="d-sub" x="218" y="112">300 cells</text>
  <text class="d-text" x="20" y="172">Union-Find parent</text>
  <rect class="d-box-muted" x="200" y="150" width="300" height="34" rx="4"/>
  <text class="d-sub" x="515" y="172">90,000 entries</text>
</svg>

Why is the DFS stack so much bigger than the BFS queue? The iterative DFS marks a cell when it pushes it, and on a solid block it keeps pushing neighbours faster than it pops them, so roughly half the island ends up waiting on the stack. BFS spreads as a diagonal wave, and on a 300 × 300 square that wave is never longer than about 300 cells. The order of the direction list changes the DFS number but not the overall picture. Union-Find has no frontier at all, but it always allocates its arrays for every cell, water included.

## 4. Union-Find on a Grid in JavaScript

The DFS and BFS versions are the flood fills from the [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) page (example 1 contains all three). Here is the Union-Find version:

~~~javascript
function countUnionFind(grid) {
  // Union-Find over cell ids r * cols + c. Returns [islands, successful unions].
  const rows = grid.length, cols = rows ? grid[0].length : 0;
  const parent = Int32Array.from({ length: rows * cols }, (_, i) => i);
  const size = new Int32Array(rows * cols).fill(1);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];   // path halving: point to the grandparent
      x = parent[x];
    }
    return x;
  };
  const union = (a, b) => {
    let ra = find(a), rb = find(b);
    if (ra === rb) return false;       // already on the same island
    if (size[ra] < size[rb]) [ra, rb] = [rb, ra];
    parent[rb] = ra;                   // union by size: small tree under big tree
    size[ra] += size[rb];
    return true;
  };
  let land = 0, unions = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== "1") continue;
      land++;
      if (r + 1 < rows && grid[r + 1][c] === "1" && union(r * cols + c, (r + 1) * cols + c)) unions++;
      if (c + 1 < cols && grid[r][c + 1] === "1" && union(r * cols + c, r * cols + c + 1)) unions++;
    }
  }
  return [land - unions, unions];      // every successful union merges two islands
}
~~~

**What to point out in this code:**

- \`Int32Array.from({ length: n }, (_, i) => i)\` builds the parent array in one call. Typed arrays are fixed-length, hold real 32-bit integers, and are zero-filled — a compact fit for ids up to about 2 × 10^9.
- \`find\` is a \`while\` loop, not recursion, so a long chain can never throw \`RangeError\`.
- \`parent[x] = parent[parent[x]]\` is path halving: each step points \`x\` at its grandparent, roughly halving the path every time it is walked.
- \`[ra, rb] = [rb, ra]\` swaps with destructuring so the larger tree is always \`ra\`; it needs \`let\`, not \`const\`.
- Only the right and down neighbours are checked; checking all four would try every pair twice.
- The function returns \`[islands, unions]\`; example 1 uses the second value to show that 89,999 unions turn 90,000 land cells into one island.

📌 **Interview term: Amortised cost** — the average cost per operation over a long sequence, even if a single operation is occasionally more expensive. Union-Find's O(α(n)) bound is amortised.

## 5. Where Union-Find Wins: Land Added One Cell at a Time

In "Number of Islands II" the grid starts as all water and you receive a list of cells that become land, one at a time; after each one you must report the current number of islands. Re-running a flood fill after every addition costs O(R × C) each time. With Union-Find, a new land cell is a new one-cell island, and each union with a land neighbour that succeeds glues two islands into one:

~~~javascript
class Islands {
  // Number of Islands II: land appears one cell at a time; report the count
  // after every addition. Union-Find makes each addition nearly O(1).
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.parent = new Int32Array(rows * cols).fill(-1);   // -1 means water
    this.size = new Int32Array(rows * cols);
    this.count = 0;
    this.steps = 0;                                       // parent pointers followed in find()
  }

  find(x) {
    while (this.parent[x] !== x) {
      this.steps++;
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }

  addLand(r, c) {
    const cell = r * this.cols + c;
    if (this.parent[cell] !== -1) return this.count;      // already land: nothing changes
    this.parent[cell] = cell;
    this.size[cell] = 1;
    this.count++;                                         // a new one-cell island ...
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.parent[nr * this.cols + nc] !== -1) {
        let a = this.find(cell), b = this.find(nr * this.cols + nc);
        if (a !== b) {                                    // ... that may glue islands together
          if (this.size[a] < this.size[b]) [a, b] = [b, a];
          this.parent[b] = a;
          this.size[a] += this.size[b];
          this.count--;
        }
      }
    }
    return this.count;
  }
}
~~~

- \`parent\` is filled with \`-1\` for water, so one array answers both "is this land?" and "what is its parent?".
- Adding a cell that is already land returns the current count unchanged (the duplicate \`[0, 1]\` in the example).
- When the example decodes a random number into a cell, it uses \`Math.floor(seed / N)\`: in JavaScript \`/\` is always floating-point division, unlike Java or C++ integer division.

## 6. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\` (Node.js 22; the code is plain browser-safe JavaScript, so it also runs in the page). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. The random grids and cell sequences come from a small deterministic generator (MINSTD), so every language processes exactly the same input. Example 2 checks Union-Find against a full BFS recount after every one of the 450 additions and reports 0 mismatches.

**Example 1 — DFS, BFS and Union-Find agree, and how much memory each uses** prints:

~~~text
leetcode 1: dfs 1, bfs 1, union-find 1
leetcode 2: dfs 3, bfs 3, union-find 3
ring: dfs 1, bfs 1, union-find 1
diagonal: dfs 5, bfs 5, union-find 5
random 300 x 300: dfs 7987, bfs 7987, union-find 7987
300 x 300 all land:
  DFS stack peak:  44851
  BFS queue peak:  300
  union-find: parent array 90000, successful unions 89999
~~~

**Example 2 — Number of Islands II: Union-Find vs re-running BFS after every addition** prints:

~~~text
3 x 3 additions: [1, 1, 2, 3, 1, 1]
450 additions on 30 x 30: final count 90, mismatches 0
  recount with BFS each time: 405000 cells scanned
  union-find: 207 pointer steps in find()
~~~

## 7. Reading the Numbers

- All three methods agree on every grid, including the random 300 × 300 grid with 7,987 islands.
- On the 300 × 300 all-land grid, the DFS stack peaked at **44,851** cells, the BFS queue at **300**, and Union-Find made **89,999** successful unions (90,000 land cells → 1 island).
- In the incremental test, Union-Find followed only **207** parent pointers across all 450 additions, while recounting with BFS after each addition scanned **405,000** cells — the gap grows with the grid size, because every recount is O(R × C).

## 8. Complexity

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| DFS (iterative array stack) | O(R × C) | O(R × C) | stack reached 44,851 on 300 × 300 all land; recursive version threw \`RangeError\` at 120 × 120 in Node |
| BFS (array + head index) | O(R × C) | O(R × C) worst case | queue peaked at 300 on the same grid |
| Union-Find, one count | O(R × C · α) | O(R × C) | two \`Int32Array\`s, 4 bytes per cell each |
| Islands II with Union-Find | O(α) amortised per addition | O(R × C) | 207 \`find\` steps for 450 additions |
| Islands II by re-running BFS | O(R × C) per addition | O(R × C) | 405,000 cells scanned for 450 additions |

## 9. Which One Should You Pick?

- **The standard "count islands once" question:** DFS or BFS. They are the shortest to write and need no extra structure. Prefer an **iterative** DFS or BFS for large grids; mention that recursive DFS can overflow the stack on a big island.
- **You care about peak memory on big, solid islands:** BFS — its queue stays about as long as the grid is wide (300 here) while the DFS stack grew to 44,851.
- **Land arrives over time ("Number of Islands II") or edges arrive as a stream:** Union-Find. Example 2 does 450 additions with only 207 pointer steps inside \`find\`, while re-running BFS after each addition scans 405,000 cells.
- **You must not touch the input and want no recursion at all:** Union-Find or iterative BFS with a visited array.
- **You need distances (how far is each cell from the nearest X?):** BFS — Union-Find knows *which* group a cell is in, never *how far*. Multi-source BFS is the tool for spreading problems such as [Rotting Oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs).
- **The same idea on a general graph** (edges instead of grid neighbours) is [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph).

## Common Pitfalls

- **A recursive \`find\`.** Fine with union by size, but a plain loop removes any chance of \`RangeError\` and is just as short.
- **Forgetting union by size *and* path compression.** With neither, a chain of unions can make \`find\` O(n) and the whole count O(n²).
- **Decoding ids with \`/\`.** \`id / cols\` is a float in JavaScript; use \`Math.floor(id / cols)\` and \`id % cols\`.
- **Using \`queue.shift()\` in the BFS version.** It can move every element; keep a head index.
- **Treating Union-Find as general-purpose.** It cannot remove land or report distances; for those, go back to BFS.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Same answer, same big-O:</strong> <span style="color:#f0e2c8;">DFS, BFS and Union-Find all count islands in O(rows × cols); Union-Find adds a factor α(n) that is at most 4 in practice.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Memory shape:</strong> <span style="color:#f0e2c8;">DFS keeps a stack (44,851 cells on a 300 × 300 land block), BFS a queue (300 cells), Union-Find two full <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Int32Array</code>s.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Risks:</strong> <span style="color:#f0e2c8;">Recursive DFS threw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code> on a 120 × 120 land grid in Node; iterative DFS, BFS and Union-Find have no recursion.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Union-Find count:</strong> <span style="color:#f0e2c8;">Land cells minus successful unions, uniting each land cell with its right and down land neighbours.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When to choose:</strong> <span style="color:#f0e2c8;">Flood fill for a one-off count, BFS when distances matter, Union-Find when land arrives over time (Number of Islands II).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does Union-Find only look right and down?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every neighbour pair is then seen exactly once, from its top or left cell. Looking in all four directions would try each pair twice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Int32Array</code> instead of a normal array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a fixed-size block of 32-bit integers: compact, zero-initialised and fast to index. A normal array works too, but stores boxed or tagged values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can Union-Find handle land turning back into water?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It has no efficient split operation; you would rebuild, or process the operations in reverse if they are all known up front.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which uses the least memory on a huge grid?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sinking the input with BFS needs only the queue. Union-Find always allocates two arrays of rows × cols, even for water.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you report island sizes with Union-Find?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size[find(x)]</code> is the size of x's island; collect it for each root that belongs to a land cell.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Union-Find (Disjoint Set Union, DSU)** | Disjoint groups with \`find\` (root of x) and \`union\` (merge two groups) |
| **Path compression / path halving** | Re-point nodes toward the root during \`find\` so later finds are short |
| **Union by size (or rank)** | Hang the smaller tree under the larger root to keep trees shallow |
| **Inverse Ackermann function α(n)** | Grows so slowly it is at most 4 in practice; DSU ops cost O(α(n)) |
| **Cell id (flattening)** | \`r * cols + c\`: one integer per grid cell |
| **Online (incremental) connectivity** | Keep the group count up to date as edges or cells arrive |
| **Amortised cost** | Average cost per operation over a whole sequence |

---
**Conclusion:** In JavaScript all three approaches count islands in O(rows × cols); the difference is in their working memory, their failure modes and the variants they handle. A flood fill is the shortest code for a one-off count — iterative, because deep recursion throws \`RangeError\` — BFS gives distances and the smallest frontier on solid islands, and Union-Find on two \`Int32Array\`s, with a loop-based \`find\`, path halving and union by size, keeps the count correct as land arrives one cell at a time.`,
        examples: [
          {
            label: "DFS vs BFS vs Union-Find: same counts, different peak memory",
            code: `const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function countDfs(grid) {
  // Iterative DFS. Returns [islands, largest stack size seen].
  const rows = grid.length, cols = rows ? grid[0].length : 0;
  const seen = new Uint8Array(rows * cols);
  let count = 0, peak = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== "1" || seen[r * cols + c]) continue;
      count++;
      seen[r * cols + c] = 1;
      const stack = [[r, c]];
      while (stack.length > 0) {
        peak = Math.max(peak, stack.length);
        const [cr, cc] = stack.pop();
        for (const [dr, dc] of DIRS) {
          const nr = cr + dr, nc = cc + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === "1" && !seen[nr * cols + nc]) {
            seen[nr * cols + nc] = 1;
            stack.push([nr, nc]);
          }
        }
      }
    }
  }
  return [count, peak];
}

function countBfs(grid) {
  // BFS with an array plus a head index (Array.shift() would re-index the array).
  const rows = grid.length, cols = rows ? grid[0].length : 0;
  const seen = new Uint8Array(rows * cols);
  let count = 0, peak = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== "1" || seen[r * cols + c]) continue;
      count++;
      seen[r * cols + c] = 1;
      const queue = [[r, c]];
      let head = 0;
      while (head < queue.length) {
        peak = Math.max(peak, queue.length - head);
        const [cr, cc] = queue[head++];
        for (const [dr, dc] of DIRS) {
          const nr = cr + dr, nc = cc + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === "1" && !seen[nr * cols + nc]) {
            seen[nr * cols + nc] = 1;
            queue.push([nr, nc]);
          }
        }
      }
    }
  }
  return [count, peak];
}

function countUnionFind(grid) {
  // Union-Find over cell ids r * cols + c. Returns [islands, successful unions].
  const rows = grid.length, cols = rows ? grid[0].length : 0;
  const parent = Int32Array.from({ length: rows * cols }, (_, i) => i);
  const size = new Int32Array(rows * cols).fill(1);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];   // path halving: point to the grandparent
      x = parent[x];
    }
    return x;
  };
  const union = (a, b) => {
    let ra = find(a), rb = find(b);
    if (ra === rb) return false;       // already on the same island
    if (size[ra] < size[rb]) [ra, rb] = [rb, ra];
    parent[rb] = ra;                   // union by size: small tree under big tree
    size[ra] += size[rb];
    return true;
  };
  let land = 0, unions = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== "1") continue;
      land++;
      if (r + 1 < rows && grid[r + 1][c] === "1" && union(r * cols + c, (r + 1) * cols + c)) unions++;
      if (c + 1 < cols && grid[r][c + 1] === "1" && union(r * cols + c, r * cols + c + 1)) unions++;
    }
  }
  return [land - unions, unions];      // every successful union merges two islands
}

function minstdGrid(n, seed, percent) {
  const rows = [];
  for (let r = 0; r < n; r++) {
    let row = "";
    for (let c = 0; c < n; c++) {
      seed = (seed * 48271) % 2147483647;
      row += seed % 100 < percent ? "1" : "0";
    }
    rows.push(row);
  }
  return rows;
}

const tests = [
  ["leetcode 1", ["11110", "11010", "11000", "00000"]],
  ["leetcode 2", ["11000", "11000", "00100", "00011"]],
  ["ring", ["111", "101", "111"]],
  ["diagonal", ["101", "010", "101"]],
  ["random 300 x 300", minstdGrid(300, 7, 45)],
];
for (const [name, grid] of tests) {
  console.log(name + ": dfs " + countDfs(grid)[0] + ", bfs " + countBfs(grid)[0] + ", union-find " + countUnionFind(grid)[0]);
}

const full = new Array(300).fill("1".repeat(300));
console.log("300 x 300 all land:");
console.log("  DFS stack peak:  " + countDfs(full)[1]);
console.log("  BFS queue peak:  " + countBfs(full)[1]);
console.log("  union-find: parent array " + 300 * 300 + ", successful unions " + countUnionFind(full)[1]);`,
          },
          {
            label: "Number of Islands II: Union-Find vs recounting with BFS",
            code: `const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

class Islands {
  // Number of Islands II: land appears one cell at a time; report the count
  // after every addition. Union-Find makes each addition nearly O(1).
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.parent = new Int32Array(rows * cols).fill(-1);   // -1 means water
    this.size = new Int32Array(rows * cols);
    this.count = 0;
    this.steps = 0;                                       // parent pointers followed in find()
  }

  find(x) {
    while (this.parent[x] !== x) {
      this.steps++;
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }

  addLand(r, c) {
    const cell = r * this.cols + c;
    if (this.parent[cell] !== -1) return this.count;      // already land: nothing changes
    this.parent[cell] = cell;
    this.size[cell] = 1;
    this.count++;                                         // a new one-cell island ...
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.parent[nr * this.cols + nc] !== -1) {
        let a = this.find(cell), b = this.find(nr * this.cols + nc);
        if (a !== b) {                                    // ... that may glue islands together
          if (this.size[a] < this.size[b]) [a, b] = [b, a];
          this.parent[b] = a;
          this.size[a] += this.size[b];
          this.count--;
        }
      }
    }
    return this.count;
  }
}

function recountBfs(land, rows, cols) {
  // The slow way: a full BFS over the whole grid after every addition.
  const seen = new Uint8Array(rows * cols);
  let count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!land[r * cols + c] || seen[r * cols + c]) continue;
      count++;
      seen[r * cols + c] = 1;
      const q = [[r, c]];
      let head = 0;
      while (head < q.length) {
        const [cr, cc] = q[head++];
        for (const [dr, dc] of DIRS) {
          const nr = cr + dr, nc = cc + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && land[nr * cols + nc] && !seen[nr * cols + nc]) {
            seen[nr * cols + nc] = 1;
            q.push([nr, nc]);
          }
        }
      }
    }
  }
  return count;
}

const small = new Islands(3, 3);
const adds = [[0, 0], [0, 1], [1, 2], [2, 1], [1, 1], [0, 1]];
console.log("3 x 3 additions: [" + adds.map(([r, c]) => small.addLand(r, c)).join(", ") + "]"); // 3 x 3 additions: [1, 1, 2, 3, 1, 1]

const N = 30, K = 450;
const uf = new Islands(N, N);
const land = new Uint8Array(N * N);
let seed = 11, mismatches = 0, bfsCells = 0;
for (let i = 0; i < K; i++) {
  seed = (seed * 48271) % 2147483647;
  const r = seed % N, c = Math.floor(seed / N) % N;   // Math.floor: "/" is float division in JS
  land[r * N + c] = 1;
  const fast = uf.addLand(r, c);
  const slow = recountBfs(land, N, N);
  bfsCells += N * N;                                  // every recount scans all N * N cells
  if (fast !== slow) mismatches++;
}
console.log(K + " additions on " + N + " x " + N + ": final count " + uf.count + ", mismatches " + mismatches);
console.log("  recount with BFS each time: " + bfsCells + " cells scanned");
console.log("  union-find: " + uf.steps + " pointer steps in find()");`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You have solved number of islands with DFS. Now compare DFS, BFS and Union-Find for this problem — their costs, their risks, and when you would choose each — and implement the Union-Find version in Java."

**What a strong answer should cover:**
- All three are O(rows × cols) for a single count (Union-Find with path compression and union by size is O(α(n)) per operation, effectively constant).
- Memory shape: DFS stack (or recursion) vs BFS queue vs Union-Find's full \`parent\`/\`size\` arrays; recursive DFS can throw \`StackOverflowError\`.
- Union-Find counts as land − successful unions, looking only right and down from each cell.
- Union-Find shines when land arrives incrementally (Number of Islands II); it cannot handle removals; BFS is the one that gives distances.
- Java details: a small static nested \`DSU\` class over \`int[]\` (no boxing, unlike \`Map<Integer, Integer>\`), \`ArrayDeque\` for BFS/DFS, and \`long\` where products can overflow \`int\`.

**Code / implementation expected:** Yes — a \`DSU\` class (path halving + union by size) over cell ids \`r * cols + c\`, in Java.`,
        answer: `**Target Audience:** Candidates who can already solve number of islands once and want to compare the three standard approaches  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Three surveyors are sent to count the islands of a newly mapped archipelago.

**The hiker (DFS)** lands on the first unvisited beach and walks inland as far as she can, then retraces her steps to try every side path, planting a flag on each square. Her notebook only holds the trail back to where she started — but on a huge, winding island that trail can get very long.

**The search party (BFS)** lands on the first beach and spreads out in a ring, everyone stepping one square further each minute, until the ring has swept the whole island. They never need a long trail, but on a wide island the ring itself can be large.

**The land registry clerk (Union-Find)** never leaves the office. She gets a list of squares and, for every pair of neighbouring land squares, staples their deeds into the same folder. When the list is done, the number of folders is the number of islands. Her real superpower shows up when new land is reclaimed from the sea every day: she just staples one more deed, while the other two would have to re-survey the whole map.

All three get the same count. The interview question is about *what each one costs, what can go wrong, and which one you would pick for which variant of the problem*.

## 2. The Three Approaches in One Paragraph Each

All three see the grid as an implicit graph in which each land cell joins its land neighbours (the basic solution and the flood fill are on the [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) page; the traversal orders are on [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs)).

- **DFS flood fill.** Scan the grid; each unvisited land cell starts a new island, and a depth-first fill marks the rest of it — recursively, or with an explicit stack.
- **BFS flood fill.** The same scan, but the fill uses a FIFO queue, so it spreads in rings.
- **Union-Find.** Give every cell an id, start with every land cell in its own set, and for every pair of side-by-side land cells call \`union\`. Each union that actually merges two sets removes one island, so **islands = land cells − successful unions**.

📌 **Interview term: Union-Find (Disjoint Set Union, DSU)** — a structure that keeps elements in disjoint groups and supports two operations: \`find(x)\` returns the representative (root) of x's group, and \`union(a, b)\` merges the groups of a and b. Full treatment: [the Union-Find data structure](/interview-question/what-is-the-union-find-disjoint-set-data-structure).

📌 **Interview term: Path compression / path halving** — while \`find\` walks up to the root, it re-points nodes closer to the root, so later finds are shorter. Path halving points every other node at its grandparent in one loop.

📌 **Interview term: Union by size (or rank)** — always hang the smaller tree under the root of the larger one, so trees stay shallow.

📌 **Interview term: Inverse Ackermann function α(n)** — an extremely slow-growing function. With both optimisations, m Union-Find operations on n elements take O(m · α(n)) time ([Tarjan, J. ACM 22(2), 1975](https://projects.csail.mit.edu/jacm/References/tarjan1975:215.html)); for any input that fits in memory α(n) is at most 4, so each operation is effectively constant time.

📌 **Interview term: Cell id (flattening)** — turning a 2-D position (r, c) into one integer \`r * cols + c\`, so a grid of R × C cells can live in one array of size R × C.

To find every neighbour pair exactly once, Union-Find only looks **right** and **down** from each land cell. Here is the top-left island of grid 2 (5 columns wide, so the cell ids are 0, 1, 5 and 6):

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Four land cells start as four separate sets. After three successful unions all four point to root 0">
  <defs>
    <marker id="b21q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="160" y="30" text-anchor="middle">before: 4 roots</text>
  <rect class="d-box-accent" x="30" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="55" y="90" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="100" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="125" y="90" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="170" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="195" y="90" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="240" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="265" y="90" text-anchor="middle">6</text>
  <text class="d-sub" x="160" y="150" text-anchor="middle">land 4, unions 0</text>
  <path class="d-edge" d="M 300 85 L 410 85" marker-end="url(#b21q4-arrow)"/>
  <text class="d-sub" x="355" y="70" text-anchor="middle">3 unions</text>
  <text class="d-text" x="465" y="30" text-anchor="middle">after: 1 root</text>
  <rect class="d-box-accent" x="440" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="465" y="90" text-anchor="middle">0</text>
  <rect class="d-box" x="360" y="170" width="50" height="50" rx="8"/>
  <text class="d-text" x="385" y="200" text-anchor="middle">1</text>
  <rect class="d-box" x="440" y="170" width="50" height="50" rx="8"/>
  <text class="d-text" x="465" y="200" text-anchor="middle">5</text>
  <rect class="d-box" x="520" y="170" width="50" height="50" rx="8"/>
  <text class="d-text" x="545" y="200" text-anchor="middle">6</text>
  <path class="d-edge-accent" d="M 392 168 L 452 116" marker-end="url(#b21q4-arrow)"/>
  <path class="d-edge-accent" d="M 465 168 L 465 116" marker-end="url(#b21q4-arrow)"/>
  <path class="d-edge-accent" d="M 538 168 L 478 116" marker-end="url(#b21q4-arrow)"/>
  <text class="d-sub" x="465" y="245" text-anchor="middle">land 4, unions 3, islands 1</text>
</svg>

Cell 0 unions with 5 (down) and 1 (right); cell 1 unions with 6 (down). When cell 5 tries to union with 6 (right), both already have root 0, so nothing changes — that pair was a "cycle" in the island. Four land cells minus three successful unions is one island.

## 3. The Trade-Offs Side by Side

| | DFS flood fill | BFS flood fill | Union-Find |
| :--- | :--- | :--- | :--- |
| Time for one count | O(R × C) | O(R × C) | O(R × C · α(R × C)), effectively O(R × C) |
| Extra memory | visited grid (or none if sinking) + stack | visited grid (or none) + queue | \`parent\` + \`size\` arrays of R × C |
| Peak frontier on a 300 × 300 all-land grid | 44,851 cells on the stack | 300 cells in the queue | no frontier; 90,000-entry arrays |
| Recursion risk | yes, if written recursively | none | none (iterative \`find\`) |
| Modifies the input? | if you sink cells | if you sink cells | no |
| Land added one cell at a time | re-run: O(R × C) per addition | re-run: O(R × C) per addition | **O(α) per addition** |
| Land removed | re-run | re-run | not supported (no un-union) |
| Island sizes / shapes | easy (count inside the fill) | easy | sizes from the \`size\` array; shapes harder |
| Code to write | shortest | short | longest (a small class) |

📌 **Interview term: Online (incremental) connectivity** — answering "how many groups are there now?" after each new edge or cell arrives, without recomputing from scratch. Union-Find is built for this; it cannot handle deletions.

The memory row comes from example 1, which runs all three on the same 300 × 300 all-land grid and records how big each one's working storage gets:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="Peak working memory on a 300 by 300 all land grid: DFS stack 44851 cells, BFS queue 300 cells, Union-Find parent array 90000 entries">
  <text class="d-text" x="20" y="52">DFS stack peak</text>
  <rect class="d-box-accent" x="200" y="30" width="150" height="34" rx="4"/>
  <text class="d-sub" x="365" y="52">44,851 cells</text>
  <text class="d-text" x="20" y="112">BFS queue peak</text>
  <rect class="d-box-accent" x="200" y="90" width="3" height="34" rx="1"/>
  <text class="d-sub" x="218" y="112">300 cells</text>
  <text class="d-text" x="20" y="172">Union-Find parent</text>
  <rect class="d-box-muted" x="200" y="150" width="300" height="34" rx="4"/>
  <text class="d-sub" x="515" y="172">90,000 entries</text>
</svg>

Why is the DFS stack so much bigger than the BFS queue? The iterative DFS marks a cell when it pushes it, and on a solid block it keeps pushing neighbours faster than it pops them, so roughly half the island ends up waiting on the stack. BFS spreads as a diagonal wave, and on a 300 × 300 square that wave is never longer than about 300 cells. The order of the direction list changes the DFS number but not the overall picture. Union-Find has no frontier at all, but it always allocates its arrays for every cell, water included.

## 4. Union-Find on a Grid in Java

The DFS and BFS versions are the flood fills from the [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) page (example 1 contains all three). Here is the Union-Find version:

~~~java
// Union-Find over cell ids r * cols + c, stored in plain int[] (no boxing).
static class DSU {
    final int[] parent, size;
    DSU(int n) {
        parent = new int[n];
        size = new int[n];
        for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
    }
    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];   // path halving: point to the grandparent
            x = parent[x];
        }
        return x;
    }
    boolean union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;          // already on the same island
        if (size[ra] < size[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra;                     // union by size: small tree under big tree
        size[ra] += size[rb];
        return true;
    }
}

// Returns {islands, successful unions}.
static int[] countUnionFind(String[] grid) {
    int rows = grid.length, cols = rows == 0 ? 0 : grid[0].length();
    DSU dsu = new DSU(rows * cols);
    int land = 0, unions = 0;
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++) {
            if (grid[r].charAt(c) != '1') continue;
            land++;
            if (r + 1 < rows && grid[r + 1].charAt(c) == '1' && dsu.union(r * cols + c, (r + 1) * cols + c)) unions++;
            if (c + 1 < cols && grid[r].charAt(c + 1) == '1' && dsu.union(r * cols + c, r * cols + c + 1)) unions++;
        }
    return new int[]{land - unions, unions};  // every successful union merges two islands
}
~~~

**What to point out in this code:**

- \`DSU\` is a \`static\` nested class, so it does not hold a hidden reference to an outer \`Main\` object and can be created from \`static\` methods.
- \`parent\` and \`size\` are \`int[]\`. A \`Map<Integer, Integer>\` would also work, but every entry would box two \`Integer\`s and hash them — slower and several times larger for 90,000 cells.
- \`find\` is a \`while\` loop with path halving (\`parent[x] = parent[parent[x]]\`), so even an unexpectedly long chain cannot throw \`StackOverflowError\`.
- \`union\` is a fine method name in Java (unlike C++, where it is a keyword).
- Only the right and down neighbours are checked; checking all four would try every pair twice.
- \`countUnionFind\` returns \`new int[]{islands, unions}\`; example 1 uses the second value to show that 89,999 unions turn 90,000 land cells into one island.

📌 **Interview term: Amortised cost** — the average cost per operation over a long sequence, even if a single operation is occasionally more expensive. Union-Find's O(α(n)) bound is amortised.

## 5. Where Union-Find Wins: Land Added One Cell at a Time

In "Number of Islands II" the grid starts as all water and you receive a list of cells that become land, one at a time; after each one you must report the current number of islands. Re-running a flood fill after every addition costs O(R × C) each time. With Union-Find, a new land cell is a new one-cell island, and each union with a land neighbour that succeeds glues two islands into one:

~~~java
// Number of Islands II: land appears one cell at a time; report the count
// after every addition. Union-Find makes each addition nearly O(1).
static class Islands {
    final int rows, cols;
    final int[] parent, size;
    int count = 0;
    long steps = 0;                       // parent pointers followed in find()

    Islands(int rows, int cols) {
        this.rows = rows;
        this.cols = cols;
        parent = new int[rows * cols];
        Arrays.fill(parent, -1);          // -1 means water
        size = new int[rows * cols];
    }

    int find(int x) {
        while (parent[x] != x) {
            steps++;
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }

    int addLand(int r, int c) {
        int cell = r * cols + c;
        if (parent[cell] != -1) return count;   // already land: nothing changes
        parent[cell] = cell;
        size[cell] = 1;
        count++;                                 // a new one-cell island ...
        for (int[] d : DIRS) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && parent[nr * cols + nc] != -1) {
                int a = find(cell), b = find(nr * cols + nc);
                if (a != b) {                    // ... that may glue islands together
                    if (size[a] < size[b]) { int t = a; a = b; b = t; }
                    parent[b] = a;
                    size[a] += size[b];
                    count--;
                }
            }
        }
        return count;
    }
}
~~~

- \`Arrays.fill(parent, -1)\` marks every cell as water, so one array answers both "is this land?" and "what is its parent?".
- Adding a cell that is already land returns the current count unchanged (the duplicate \`{0, 1}\` in the example).
- \`steps\` and the random \`seed\` are \`long\`. The generator computes \`seed * 48271\`, which overflows \`int\` (Java wraps silently on overflow) — \`long\` keeps it exact.

## 6. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21; the code only uses Java 17 features). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. The random grids and cell sequences come from a small deterministic generator (MINSTD), so every language processes exactly the same input. Example 2 checks Union-Find against a full BFS recount after every one of the 450 additions and reports 0 mismatches.

**Example 1 — DFS, BFS and Union-Find agree, and how much memory each uses** prints:

~~~text
leetcode 1: dfs 1, bfs 1, union-find 1
leetcode 2: dfs 3, bfs 3, union-find 3
ring: dfs 1, bfs 1, union-find 1
diagonal: dfs 5, bfs 5, union-find 5
random 300 x 300: dfs 7987, bfs 7987, union-find 7987
300 x 300 all land:
  DFS stack peak:  44851
  BFS queue peak:  300
  union-find: parent array 90000, successful unions 89999
~~~

**Example 2 — Number of Islands II: Union-Find vs re-running BFS after every addition** prints:

~~~text
3 x 3 additions: [1, 1, 2, 3, 1, 1]
450 additions on 30 x 30: final count 90, mismatches 0
  recount with BFS each time: 405000 cells scanned
  union-find: 207 pointer steps in find()
~~~

## 7. Reading the Numbers

- All three methods agree on every grid, including the random 300 × 300 grid with 7,987 islands.
- On the 300 × 300 all-land grid, the DFS stack peaked at **44,851** cells, the BFS queue at **300**, and Union-Find made **89,999** successful unions (90,000 land cells → 1 island).
- In the incremental test, Union-Find followed only **207** parent pointers across all 450 additions, while recounting with BFS after each addition scanned **405,000** cells — the gap grows with the grid size, because every recount is O(R × C).

## 8. Complexity

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| DFS (\`ArrayDeque\` stack) | O(R × C) | O(R × C) | stack reached 44,851 on 300 × 300 all land; recursive version overflowed the default stack at 200 × 200 |
| BFS (\`ArrayDeque\` queue) | O(R × C) | O(R × C) worst case | queue peaked at 300 on the same grid |
| Union-Find, one count | O(R × C · α) | O(R × C) | two \`int[]\` of R × C, 4 bytes per cell each |
| Islands II with Union-Find | O(α) amortised per addition | O(R × C) | 207 \`find\` steps for 450 additions |
| Islands II by re-running BFS | O(R × C) per addition | O(R × C) | 405,000 cells scanned for 450 additions |

## 9. Which One Should You Pick?

- **The standard "count islands once" question:** DFS or BFS. They are the shortest to write and need no extra structure. Prefer an **iterative** DFS or BFS for large grids; mention that recursive DFS can overflow the stack on a big island.
- **You care about peak memory on big, solid islands:** BFS — its queue stays about as long as the grid is wide (300 here) while the DFS stack grew to 44,851.
- **Land arrives over time ("Number of Islands II") or edges arrive as a stream:** Union-Find. Example 2 does 450 additions with only 207 pointer steps inside \`find\`, while re-running BFS after each addition scans 405,000 cells.
- **You must not touch the input and want no recursion at all:** Union-Find or iterative BFS with a visited array.
- **You need distances (how far is each cell from the nearest X?):** BFS — Union-Find knows *which* group a cell is in, never *how far*. Multi-source BFS is the tool for spreading problems such as [Rotting Oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs).
- **The same idea on a general graph** (edges instead of grid neighbours) is [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph).

## Common Pitfalls

- **Using \`Map<Integer, Integer>\` for parents on a dense grid.** Boxing and hashing every cell; \`int[]\` indexed by cell id is simpler and faster.
- **Forgetting union by size *and* path compression.** With neither, a chain of unions can make \`find\` O(n) and the whole count O(n²).
- **Silent \`int\` overflow.** \`r * cols + c\` is safe for normal grids, but random-number or hash arithmetic like \`seed * 48271\` wraps around; use \`long\`.
- **Recursive DFS for the comparison baseline.** It threw \`StackOverflowError\` at 200 × 200; benchmark the iterative versions.
- **Treating Union-Find as general-purpose.** It cannot remove land or report distances; for those, go back to BFS.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Same answer, same big-O:</strong> <span style="color:#f0e2c8;">DFS, BFS and Union-Find all count islands in O(rows × cols); Union-Find adds a factor α(n) that is at most 4 in practice.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Memory shape:</strong> <span style="color:#f0e2c8;">DFS keeps a stack (44,851 cells on a 300 × 300 land block), BFS a queue (300 cells), Union-Find two full <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> arrays.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Risks:</strong> <span style="color:#f0e2c8;">Recursive DFS overflowed the default Java stack on a 200 × 200 land grid; iterative DFS, BFS and Union-Find have no recursion.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Union-Find count:</strong> <span style="color:#f0e2c8;">Land cells minus successful unions, uniting each land cell with its right and down land neighbours.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When to choose:</strong> <span style="color:#f0e2c8;">Flood fill for a one-off count, BFS when distances matter, Union-Find when land arrives over time (Number of Islands II).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does Union-Find only look right and down?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every neighbour pair is then seen exactly once, from its top or left cell. Looking in all four directions would try each pair twice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int[]</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap&lt;Integer, Integer&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Cell ids are dense integers 0..R×C−1, so an array is a perfect map: no hashing, no boxing, one contiguous block.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can Union-Find handle land turning back into water?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It has no efficient split operation; you would rebuild, or process the operations in reverse if they are all known up front.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which uses the least memory on a huge grid?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sinking the input with BFS needs only the queue. Union-Find always allocates two arrays of rows × cols, even for water.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you report island sizes with Union-Find?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size[find(x)]</code> is the size of x's island; collect it for each root that belongs to a land cell.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Union-Find (Disjoint Set Union, DSU)** | Disjoint groups with \`find\` (root of x) and \`union\` (merge two groups) |
| **Path compression / path halving** | Re-point nodes toward the root during \`find\` so later finds are short |
| **Union by size (or rank)** | Hang the smaller tree under the larger root to keep trees shallow |
| **Inverse Ackermann function α(n)** | Grows so slowly it is at most 4 in practice; DSU ops cost O(α(n)) |
| **Cell id (flattening)** | \`r * cols + c\`: one integer per grid cell |
| **Online (incremental) connectivity** | Keep the group count up to date as edges or cells arrive |
| **Amortised cost** | Average cost per operation over a whole sequence |

---
**Conclusion:** In Java all three approaches count islands in O(rows × cols); the difference is in their working memory, their failure modes and the variants they handle. A flood fill with an \`ArrayDeque\` is the shortest code for a one-off count, BFS gives distances and the smallest frontier on solid islands, and a small \`DSU\` class over \`int[]\` arrays — loop-based \`find\`, path halving, union by size — keeps the count correct as land arrives one cell at a time, with no boxing and no \`StackOverflowError\`.`,
        examples: [
          {
            label: "DFS vs BFS vs Union-Find: same counts, different peak memory",
            code: `import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;

public class Main {
    static final int[][] DIRS = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};

    // Iterative DFS (ArrayDeque used as a stack). Returns {islands, largest stack size}.
    static int[] countDfs(String[] grid) {
        int rows = grid.length, cols = rows == 0 ? 0 : grid[0].length();
        boolean[] seen = new boolean[rows * cols];
        int count = 0, peak = 0;
        Deque<int[]> stack = new ArrayDeque<>();
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) {
                if (grid[r].charAt(c) != '1' || seen[r * cols + c]) continue;
                count++;
                seen[r * cols + c] = true;
                stack.push(new int[]{r, c});
                while (!stack.isEmpty()) {
                    peak = Math.max(peak, stack.size());
                    int[] cell = stack.pop();
                    for (int[] d : DIRS) {
                        int nr = cell[0] + d[0], nc = cell[1] + d[1];
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr].charAt(nc) == '1' && !seen[nr * cols + nc]) {
                            seen[nr * cols + nc] = true;
                            stack.push(new int[]{nr, nc});
                        }
                    }
                }
            }
        return new int[]{count, peak};
    }

    // BFS (ArrayDeque used as a queue). Returns {islands, largest queue size}.
    static int[] countBfs(String[] grid) {
        int rows = grid.length, cols = rows == 0 ? 0 : grid[0].length();
        boolean[] seen = new boolean[rows * cols];
        int count = 0, peak = 0;
        Deque<int[]> queue = new ArrayDeque<>();
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) {
                if (grid[r].charAt(c) != '1' || seen[r * cols + c]) continue;
                count++;
                seen[r * cols + c] = true;
                queue.offer(new int[]{r, c});
                while (!queue.isEmpty()) {
                    peak = Math.max(peak, queue.size());
                    int[] cell = queue.poll();
                    for (int[] d : DIRS) {
                        int nr = cell[0] + d[0], nc = cell[1] + d[1];
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr].charAt(nc) == '1' && !seen[nr * cols + nc]) {
                            seen[nr * cols + nc] = true;
                            queue.offer(new int[]{nr, nc});
                        }
                    }
                }
            }
        return new int[]{count, peak};
    }

    // Union-Find over cell ids r * cols + c, stored in plain int[] (no boxing).
    static class DSU {
        final int[] parent, size;
        DSU(int n) {
            parent = new int[n];
            size = new int[n];
            for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
        }
        int find(int x) {
            while (parent[x] != x) {
                parent[x] = parent[parent[x]];   // path halving: point to the grandparent
                x = parent[x];
            }
            return x;
        }
        boolean union(int a, int b) {
            int ra = find(a), rb = find(b);
            if (ra == rb) return false;          // already on the same island
            if (size[ra] < size[rb]) { int t = ra; ra = rb; rb = t; }
            parent[rb] = ra;                     // union by size: small tree under big tree
            size[ra] += size[rb];
            return true;
        }
    }

    // Returns {islands, successful unions}.
    static int[] countUnionFind(String[] grid) {
        int rows = grid.length, cols = rows == 0 ? 0 : grid[0].length();
        DSU dsu = new DSU(rows * cols);
        int land = 0, unions = 0;
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) {
                if (grid[r].charAt(c) != '1') continue;
                land++;
                if (r + 1 < rows && grid[r + 1].charAt(c) == '1' && dsu.union(r * cols + c, (r + 1) * cols + c)) unions++;
                if (c + 1 < cols && grid[r].charAt(c + 1) == '1' && dsu.union(r * cols + c, r * cols + c + 1)) unions++;
            }
        return new int[]{land - unions, unions};  // every successful union merges two islands
    }

    static String[] minstdGrid(int n, long seed, int percent) {
        String[] rows = new String[n];
        for (int r = 0; r < n; r++) {
            StringBuilder row = new StringBuilder();
            for (int c = 0; c < n; c++) {
                seed = seed * 48271 % 2147483647;
                row.append(seed % 100 < percent ? '1' : '0');
            }
            rows[r] = row.toString();
        }
        return rows;
    }

    public static void main(String[] args) {
        String[] names = {"leetcode 1", "leetcode 2", "ring", "diagonal", "random 300 x 300"};
        String[][] grids = {
            {"11110", "11010", "11000", "00000"},
            {"11000", "11000", "00100", "00011"},
            {"111", "101", "111"},
            {"101", "010", "101"},
            minstdGrid(300, 7, 45),
        };
        for (int i = 0; i < names.length; i++)
            System.out.println(names[i] + ": dfs " + countDfs(grids[i])[0] + ", bfs " + countBfs(grids[i])[0]
                    + ", union-find " + countUnionFind(grids[i])[0]);

        String[] full = new String[300];
        Arrays.fill(full, "1".repeat(300));
        System.out.println("300 x 300 all land:");
        System.out.println("  DFS stack peak:  " + countDfs(full)[1]);
        System.out.println("  BFS queue peak:  " + countBfs(full)[1]);
        System.out.println("  union-find: parent array " + 300 * 300 + ", successful unions " + countUnionFind(full)[1]);
    }
}`,
          },
          {
            label: "Number of Islands II: Union-Find vs recounting with BFS",
            code: `import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.List;

public class Main {
    static final int[][] DIRS = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};

    // Number of Islands II: land appears one cell at a time; report the count
    // after every addition. Union-Find makes each addition nearly O(1).
    static class Islands {
        final int rows, cols;
        final int[] parent, size;
        int count = 0;
        long steps = 0;                       // parent pointers followed in find()

        Islands(int rows, int cols) {
            this.rows = rows;
            this.cols = cols;
            parent = new int[rows * cols];
            Arrays.fill(parent, -1);          // -1 means water
            size = new int[rows * cols];
        }

        int find(int x) {
            while (parent[x] != x) {
                steps++;
                parent[x] = parent[parent[x]];
                x = parent[x];
            }
            return x;
        }

        int addLand(int r, int c) {
            int cell = r * cols + c;
            if (parent[cell] != -1) return count;   // already land: nothing changes
            parent[cell] = cell;
            size[cell] = 1;
            count++;                                 // a new one-cell island ...
            for (int[] d : DIRS) {
                int nr = r + d[0], nc = c + d[1];
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && parent[nr * cols + nc] != -1) {
                    int a = find(cell), b = find(nr * cols + nc);
                    if (a != b) {                    // ... that may glue islands together
                        if (size[a] < size[b]) { int t = a; a = b; b = t; }
                        parent[b] = a;
                        size[a] += size[b];
                        count--;
                    }
                }
            }
            return count;
        }
    }

    // The slow way: a full BFS over the whole grid after every addition.
    static int recountBfs(boolean[] land, int rows, int cols) {
        boolean[] seen = new boolean[rows * cols];
        Deque<int[]> q = new ArrayDeque<>();
        int count = 0;
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) {
                if (!land[r * cols + c] || seen[r * cols + c]) continue;
                count++;
                seen[r * cols + c] = true;
                q.offer(new int[]{r, c});
                while (!q.isEmpty()) {
                    int[] cell = q.poll();
                    for (int[] d : DIRS) {
                        int nr = cell[0] + d[0], nc = cell[1] + d[1];
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && land[nr * cols + nc] && !seen[nr * cols + nc]) {
                            seen[nr * cols + nc] = true;
                            q.offer(new int[]{nr, nc});
                        }
                    }
                }
            }
        return count;
    }

    public static void main(String[] args) {
        Islands small = new Islands(3, 3);
        int[][] adds = {{0, 0}, {0, 1}, {1, 2}, {2, 1}, {1, 1}, {0, 1}};
        List<Integer> counts = new ArrayList<>();
        for (int[] a : adds) counts.add(small.addLand(a[0], a[1]));
        System.out.println("3 x 3 additions: " + counts); // [1, 1, 2, 3, 1, 1]

        int N = 30, K = 450;
        Islands uf = new Islands(N, N);
        boolean[] land = new boolean[N * N];
        long seed = 11;
        int mismatches = 0;
        long bfsCells = 0;
        for (int i = 0; i < K; i++) {
            seed = seed * 48271 % 2147483647;
            int r = (int) (seed % N), c = (int) (seed / N % N);
            land[r * N + c] = true;
            int fast = uf.addLand(r, c);
            int slow = recountBfs(land, N, N);
            bfsCells += N * N;                       // every recount scans all N * N cells
            if (fast != slow) mismatches++;
        }
        System.out.println(K + " additions on " + N + " x " + N + ": final count " + uf.count + ", mismatches " + mismatches);
        System.out.println("  recount with BFS each time: " + bfsCells + " cells scanned");
        System.out.println("  union-find: " + uf.steps + " pointer steps in find()");
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You have solved number of islands with DFS. Now compare DFS, BFS and Union-Find for this problem — their costs, their risks, and when you would choose each — and implement the Union-Find version in C++."

**What a strong answer should cover:**
- All three are O(rows × cols) for a single count (Union-Find with path compression and union by size is O(α(n)) per operation, effectively constant).
- Memory shape: DFS stack (or recursion) vs BFS queue vs Union-Find's full \`parent\`/\`size\` arrays; recursive DFS can overflow the stack and segfault.
- Union-Find counts as land − successful unions, looking only right and down from each cell.
- Union-Find shines when land arrives incrementally (Number of Islands II); it cannot handle removals; BFS is the one that gives distances.
- C++ details: \`union\` is a keyword (name the method \`unite\`), \`std::iota\` to initialise parents, \`std::vector<int>\` storage, and 64-bit integers where products overflow.

**Code / implementation expected:** Yes — a \`DSU\` struct (path halving + union by size) over cell ids \`r * cols + c\`, in C++17.`,
        answer: `**Target Audience:** Candidates who can already solve number of islands once and want to compare the three standard approaches  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Three surveyors are sent to count the islands of a newly mapped archipelago.

**The hiker (DFS)** lands on the first unvisited beach and walks inland as far as she can, then retraces her steps to try every side path, planting a flag on each square. Her notebook only holds the trail back to where she started — but on a huge, winding island that trail can get very long.

**The search party (BFS)** lands on the first beach and spreads out in a ring, everyone stepping one square further each minute, until the ring has swept the whole island. They never need a long trail, but on a wide island the ring itself can be large.

**The land registry clerk (Union-Find)** never leaves the office. She gets a list of squares and, for every pair of neighbouring land squares, staples their deeds into the same folder. When the list is done, the number of folders is the number of islands. Her real superpower shows up when new land is reclaimed from the sea every day: she just staples one more deed, while the other two would have to re-survey the whole map.

All three get the same count. The interview question is about *what each one costs, what can go wrong, and which one you would pick for which variant of the problem*.

## 2. The Three Approaches in One Paragraph Each

All three see the grid as an implicit graph in which each land cell joins its land neighbours (the basic solution and the flood fill are on the [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) page; the traversal orders are on [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs)).

- **DFS flood fill.** Scan the grid; each unvisited land cell starts a new island, and a depth-first fill marks the rest of it — recursively, or with an explicit stack.
- **BFS flood fill.** The same scan, but the fill uses a FIFO queue, so it spreads in rings.
- **Union-Find.** Give every cell an id, start with every land cell in its own set, and for every pair of side-by-side land cells call \`union\`. Each union that actually merges two sets removes one island, so **islands = land cells − successful unions**.

📌 **Interview term: Union-Find (Disjoint Set Union, DSU)** — a structure that keeps elements in disjoint groups and supports two operations: \`find(x)\` returns the representative (root) of x's group, and \`union(a, b)\` merges the groups of a and b. Full treatment: [the Union-Find data structure](/interview-question/what-is-the-union-find-disjoint-set-data-structure).

📌 **Interview term: Path compression / path halving** — while \`find\` walks up to the root, it re-points nodes closer to the root, so later finds are shorter. Path halving points every other node at its grandparent in one loop.

📌 **Interview term: Union by size (or rank)** — always hang the smaller tree under the root of the larger one, so trees stay shallow.

📌 **Interview term: Inverse Ackermann function α(n)** — an extremely slow-growing function. With both optimisations, m Union-Find operations on n elements take O(m · α(n)) time ([Tarjan, J. ACM 22(2), 1975](https://projects.csail.mit.edu/jacm/References/tarjan1975:215.html)); for any input that fits in memory α(n) is at most 4, so each operation is effectively constant time.

📌 **Interview term: Cell id (flattening)** — turning a 2-D position (r, c) into one integer \`r * cols + c\`, so a grid of R × C cells can live in one array of size R × C.

To find every neighbour pair exactly once, Union-Find only looks **right** and **down** from each land cell. Here is the top-left island of grid 2 (5 columns wide, so the cell ids are 0, 1, 5 and 6):

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="Four land cells start as four separate sets. After three successful unions all four point to root 0">
  <defs>
    <marker id="b21q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="160" y="30" text-anchor="middle">before: 4 roots</text>
  <rect class="d-box-accent" x="30" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="55" y="90" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="100" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="125" y="90" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="170" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="195" y="90" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="240" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="265" y="90" text-anchor="middle">6</text>
  <text class="d-sub" x="160" y="150" text-anchor="middle">land 4, unions 0</text>
  <path class="d-edge" d="M 300 85 L 410 85" marker-end="url(#b21q4-arrow)"/>
  <text class="d-sub" x="355" y="70" text-anchor="middle">3 unions</text>
  <text class="d-text" x="465" y="30" text-anchor="middle">after: 1 root</text>
  <rect class="d-box-accent" x="440" y="60" width="50" height="50" rx="8"/>
  <text class="d-text" x="465" y="90" text-anchor="middle">0</text>
  <rect class="d-box" x="360" y="170" width="50" height="50" rx="8"/>
  <text class="d-text" x="385" y="200" text-anchor="middle">1</text>
  <rect class="d-box" x="440" y="170" width="50" height="50" rx="8"/>
  <text class="d-text" x="465" y="200" text-anchor="middle">5</text>
  <rect class="d-box" x="520" y="170" width="50" height="50" rx="8"/>
  <text class="d-text" x="545" y="200" text-anchor="middle">6</text>
  <path class="d-edge-accent" d="M 392 168 L 452 116" marker-end="url(#b21q4-arrow)"/>
  <path class="d-edge-accent" d="M 465 168 L 465 116" marker-end="url(#b21q4-arrow)"/>
  <path class="d-edge-accent" d="M 538 168 L 478 116" marker-end="url(#b21q4-arrow)"/>
  <text class="d-sub" x="465" y="245" text-anchor="middle">land 4, unions 3, islands 1</text>
</svg>

Cell 0 unions with 5 (down) and 1 (right); cell 1 unions with 6 (down). When cell 5 tries to union with 6 (right), both already have root 0, so nothing changes — that pair was a "cycle" in the island. Four land cells minus three successful unions is one island.

## 3. The Trade-Offs Side by Side

| | DFS flood fill | BFS flood fill | Union-Find |
| :--- | :--- | :--- | :--- |
| Time for one count | O(R × C) | O(R × C) | O(R × C · α(R × C)), effectively O(R × C) |
| Extra memory | visited grid (or none if sinking) + stack | visited grid (or none) + queue | \`parent\` + \`size\` arrays of R × C |
| Peak frontier on a 300 × 300 all-land grid | 44,851 cells on the stack | 300 cells in the queue | no frontier; 90,000-entry arrays |
| Recursion risk | yes, if written recursively | none | none (iterative \`find\`) |
| Modifies the input? | if you sink cells | if you sink cells | no |
| Land added one cell at a time | re-run: O(R × C) per addition | re-run: O(R × C) per addition | **O(α) per addition** |
| Land removed | re-run | re-run | not supported (no un-union) |
| Island sizes / shapes | easy (count inside the fill) | easy | sizes from the \`size\` array; shapes harder |
| Code to write | shortest | short | longest (a small class) |

📌 **Interview term: Online (incremental) connectivity** — answering "how many groups are there now?" after each new edge or cell arrives, without recomputing from scratch. Union-Find is built for this; it cannot handle deletions.

The memory row comes from example 1, which runs all three on the same 300 × 300 all-land grid and records how big each one's working storage gets:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="Peak working memory on a 300 by 300 all land grid: DFS stack 44851 cells, BFS queue 300 cells, Union-Find parent array 90000 entries">
  <text class="d-text" x="20" y="52">DFS stack peak</text>
  <rect class="d-box-accent" x="200" y="30" width="150" height="34" rx="4"/>
  <text class="d-sub" x="365" y="52">44,851 cells</text>
  <text class="d-text" x="20" y="112">BFS queue peak</text>
  <rect class="d-box-accent" x="200" y="90" width="3" height="34" rx="1"/>
  <text class="d-sub" x="218" y="112">300 cells</text>
  <text class="d-text" x="20" y="172">Union-Find parent</text>
  <rect class="d-box-muted" x="200" y="150" width="300" height="34" rx="4"/>
  <text class="d-sub" x="515" y="172">90,000 entries</text>
</svg>

Why is the DFS stack so much bigger than the BFS queue? The iterative DFS marks a cell when it pushes it, and on a solid block it keeps pushing neighbours faster than it pops them, so roughly half the island ends up waiting on the stack. BFS spreads as a diagonal wave, and on a 300 × 300 square that wave is never longer than about 300 cells. The order of the direction list changes the DFS number but not the overall picture. Union-Find has no frontier at all, but it always allocates its arrays for every cell, water included.

## 4. Union-Find on a Grid in C++

The DFS and BFS versions are the flood fills from the [number of islands](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid) page (example 1 contains all three). Here is the Union-Find version:

~~~cpp
// Union-Find over cell ids r * cols + c.
struct DSU {
    std::vector<int> parent, size;
    explicit DSU(int n) : parent(n), size(n, 1) { std::iota(parent.begin(), parent.end(), 0); }
    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];   // path halving: point to the grandparent
            x = parent[x];
        }
        return x;
    }
    bool unite(int a, int b) {               // "union" is a C++ keyword
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;          // already on the same island
        if (size[ra] < size[rb]) std::swap(ra, rb);
        parent[rb] = ra;                     // union by size: small tree under big tree
        size[ra] += size[rb];
        return true;
    }
};

// Returns {islands, successful unions}.
std::pair<int, int> countUnionFind(const Grid& grid) {
    const int rows = grid.size(), cols = rows ? grid[0].size() : 0;
    DSU dsu(rows * cols);
    int land = 0, unions = 0;
    for (int r = 0; r < rows; ++r)
        for (int c = 0; c < cols; ++c) {
            if (grid[r][c] != '1') continue;
            ++land;
            if (r + 1 < rows && grid[r + 1][c] == '1' && dsu.unite(r * cols + c, (r + 1) * cols + c)) ++unions;
            if (c + 1 < cols && grid[r][c + 1] == '1' && dsu.unite(r * cols + c, r * cols + c + 1)) ++unions;
        }
    return {land - unions, unions};          // every successful union merges two islands
}
~~~

**What to point out in this code:**

- \`union\` is a reserved keyword in C++ (it declares a union type), so the merge method is called \`unite\`.
- \`std::iota(parent.begin(), parent.end(), 0)\` from \`<numeric>\` fills \`parent\` with 0, 1, 2, … — every cell starts as its own root.
- \`find\` is a \`while\` loop with path halving (\`parent[x] = parent[parent[x]]\`), so even an unexpectedly long chain cannot overflow the call stack.
- \`std::swap(ra, rb)\` keeps the larger tree as \`ra\`; union by size bounds tree height by log₂ n even before path halving.
- Only the right and down neighbours are checked; checking all four would try every pair twice.
- \`countUnionFind\` returns a \`std::pair<int, int>\`; example 1 uses \`.second\` to show that 89,999 unions turn 90,000 land cells into one island.

📌 **Interview term: Amortised cost** — the average cost per operation over a long sequence, even if a single operation is occasionally more expensive. Union-Find's O(α(n)) bound is amortised.

## 5. Where Union-Find Wins: Land Added One Cell at a Time

In "Number of Islands II" the grid starts as all water and you receive a list of cells that become land, one at a time; after each one you must report the current number of islands. Re-running a flood fill after every addition costs O(R × C) each time. With Union-Find, a new land cell is a new one-cell island, and each union with a land neighbour that succeeds glues two islands into one:

~~~cpp
// Number of Islands II: land appears one cell at a time; report the count
// after every addition. Union-Find makes each addition nearly O(1).
class Islands {
public:
    Islands(int rows, int cols) : rows_(rows), cols_(cols), parent_(rows * cols, -1), size_(rows * cols, 0) {}

    int addLand(int r, int c) {
        int cell = r * cols_ + c;
        if (parent_[cell] != -1) return count_;     // already land: nothing changes
        parent_[cell] = cell;
        size_[cell] = 1;
        ++count_;                                   // a new one-cell island ...
        for (const auto& d : DIRS) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < rows_ && nc >= 0 && nc < cols_ && parent_[nr * cols_ + nc] != -1) {
                int a = find(cell), b = find(nr * cols_ + nc);
                if (a != b) {                       // ... that may glue islands together
                    if (size_[a] < size_[b]) std::swap(a, b);
                    parent_[b] = a;
                    size_[a] += size_[b];
                    --count_;
                }
            }
        }
        return count_;
    }
    int count() const { return count_; }
    long long steps() const { return steps_; }

private:
    int find(int x) {
        while (parent_[x] != x) {
            ++steps_;
            parent_[x] = parent_[parent_[x]];
            x = parent_[x];
        }
        return x;
    }
    int rows_, cols_, count_ = 0;
    long long steps_ = 0;                           // parent pointers followed in find()
    std::vector<int> parent_, size_;                // parent -1 means water
};
~~~

- The constructor initialises \`parent_\` to \`-1\` for water, so one vector answers both "is this land?" and "what is its parent?".
- Adding a cell that is already land returns the current count unchanged (the duplicate \`{0, 1}\` in the example).
- \`seed\` and \`steps_\` are \`long long\`. \`seed * 48271\` does not fit in a 32-bit \`int\`, and signed overflow is undefined behaviour in C++, not a wrap-around.

## 6. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. The random grids and cell sequences come from a small deterministic generator (MINSTD), so every language processes exactly the same input. Example 2 checks Union-Find against a full BFS recount after every one of the 450 additions and reports 0 mismatches.

**Example 1 — DFS, BFS and Union-Find agree, and how much memory each uses** prints:

~~~text
leetcode 1: dfs 1, bfs 1, union-find 1
leetcode 2: dfs 3, bfs 3, union-find 3
ring: dfs 1, bfs 1, union-find 1
diagonal: dfs 5, bfs 5, union-find 5
random 300 x 300: dfs 7987, bfs 7987, union-find 7987
300 x 300 all land:
  DFS stack peak:  44851
  BFS queue peak:  300
  union-find: parent array 90000, successful unions 89999
~~~

**Example 2 — Number of Islands II: Union-Find vs re-running BFS after every addition** prints:

~~~text
3 x 3 additions: [1, 1, 2, 3, 1, 1]
450 additions on 30 x 30: final count 90, mismatches 0
  recount with BFS each time: 405000 cells scanned
  union-find: 207 pointer steps in find()
~~~

## 7. Reading the Numbers

- All three methods agree on every grid, including the random 300 × 300 grid with 7,987 islands.
- On the 300 × 300 all-land grid, the DFS stack peaked at **44,851** cells, the BFS queue at **300**, and Union-Find made **89,999** successful unions (90,000 land cells → 1 island).
- In the incremental test, Union-Find followed only **207** parent pointers across all 450 additions, while recounting with BFS after each addition scanned **405,000** cells — the gap grows with the grid size, because every recount is O(R × C).

## 8. Complexity

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| DFS (\`std::vector\` stack) | O(R × C) | O(R × C) | stack reached 44,851 on 300 × 300 all land; recursive version segfaulted at 450 × 450 |
| BFS (\`std::queue\`) | O(R × C) | O(R × C) worst case | queue peaked at 300 on the same grid |
| Union-Find, one count | O(R × C · α) | O(R × C) | two \`std::vector<int>\` of R × C |
| Islands II with Union-Find | O(α) amortised per addition | O(R × C) | 207 \`find\` steps for 450 additions |
| Islands II by re-running BFS | O(R × C) per addition | O(R × C) | 405,000 cells scanned for 450 additions |

## 9. Which One Should You Pick?

- **The standard "count islands once" question:** DFS or BFS. They are the shortest to write and need no extra structure. Prefer an **iterative** DFS or BFS for large grids; mention that recursive DFS can overflow the stack on a big island.
- **You care about peak memory on big, solid islands:** BFS — its queue stays about as long as the grid is wide (300 here) while the DFS stack grew to 44,851.
- **Land arrives over time ("Number of Islands II") or edges arrive as a stream:** Union-Find. Example 2 does 450 additions with only 207 pointer steps inside \`find\`, while re-running BFS after each addition scans 405,000 cells.
- **You must not touch the input and want no recursion at all:** Union-Find or iterative BFS with a visited array.
- **You need distances (how far is each cell from the nearest X?):** BFS — Union-Find knows *which* group a cell is in, never *how far*. Multi-source BFS is the tool for spreading problems such as [Rotting Oranges](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs).
- **The same idea on a general graph** (edges instead of grid neighbours) is [counting connected components](/interview-question/how-do-you-count-connected-components-in-an-undirected-graph).

## Common Pitfalls

- **Naming the method \`union\`.** It does not compile; \`union\` is a keyword. Use \`unite\` or \`merge\`.
- **Forgetting union by size *and* path compression.** With neither, a chain of unions can make \`find\` O(n) and the whole count O(n²).
- **Signed overflow in id or random arithmetic.** It is undefined behaviour; use \`long long\` (or \`std::int64_t\`) for products that can exceed 2^31.
- **Recursive \`find\` or DFS on huge inputs.** Recursion depth is limited by the 8 MB default stack; loops are safer.
- **Treating Union-Find as general-purpose.** It cannot remove land or report distances; for those, go back to BFS.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Same answer, same big-O:</strong> <span style="color:#f0e2c8;">DFS, BFS and Union-Find all count islands in O(rows × cols); Union-Find adds a factor α(n) that is at most 4 in practice.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Memory shape:</strong> <span style="color:#f0e2c8;">DFS keeps a stack (44,851 cells on a 300 × 300 land block), BFS a queue (300 cells), Union-Find two full <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt;</code>s.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Risks:</strong> <span style="color:#f0e2c8;">Recursive DFS segfaulted on a 450 × 450 land grid with the default stack; iterative DFS, BFS and Union-Find have no recursion.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Union-Find count:</strong> <span style="color:#f0e2c8;">Land cells minus successful unions, uniting each land cell with its right and down land neighbours.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When to choose:</strong> <span style="color:#f0e2c8;">Flood fill for a one-off count, BFS when distances matter, Union-Find when land arrives over time (Number of Islands II).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does Union-Find only look right and down?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every neighbour pair is then seen exactly once, from its top or left cell. Looking in all four directions would try each pair twice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is your method called <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unite</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">union</code> is a C++ keyword for declaring union types, so it cannot be used as an identifier.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can Union-Find handle land turning back into water?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It has no efficient split operation; you would rebuild, or process the operations in reverse if they are all known up front.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which uses the least memory on a huge grid?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sinking the input with BFS needs only the queue. Union-Find always allocates two arrays of rows × cols, even for water.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you report island sizes with Union-Find?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size[find(x)]</code> is the size of x's island; collect it for each root that belongs to a land cell.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Union-Find (Disjoint Set Union, DSU)** | Disjoint groups with \`find\` (root of x) and \`union\` (merge two groups) |
| **Path compression / path halving** | Re-point nodes toward the root during \`find\` so later finds are short |
| **Union by size (or rank)** | Hang the smaller tree under the larger root to keep trees shallow |
| **Inverse Ackermann function α(n)** | Grows so slowly it is at most 4 in practice; DSU ops cost O(α(n)) |
| **Cell id (flattening)** | \`r * cols + c\`: one integer per grid cell |
| **Online (incremental) connectivity** | Keep the group count up to date as edges or cells arrive |
| **Amortised cost** | Average cost per operation over a whole sequence |

---
**Conclusion:** In C++ all three approaches count islands in O(rows × cols); the difference is in their working memory, their failure modes and the variants they handle. A flood fill with a \`std::vector\` stack or \`std::queue\` is the shortest code for a one-off count, BFS gives distances and the smallest frontier on solid islands, and a small \`DSU\` struct — \`std::iota\` parents, loop-based \`find\`, path halving, union by size, and a method named \`unite\` — keeps the count correct as land arrives one cell at a time.`,
        examples: [
          {
            label: "DFS vs BFS vs Union-Find: same counts, different peak memory",
            code: `#include <algorithm>
#include <iostream>
#include <numeric>
#include <queue>
#include <string>
#include <utility>
#include <vector>

using Grid = std::vector<std::string>;
const int DIRS[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};

// Iterative DFS with a vector used as a stack. Returns {islands, largest stack size}.
std::pair<int, size_t> countDfs(const Grid& grid) {
    const int rows = grid.size(), cols = rows ? grid[0].size() : 0;
    std::vector<char> seen(rows * cols, 0);
    int count = 0;
    size_t peak = 0;
    std::vector<std::pair<int, int>> stack;
    for (int r = 0; r < rows; ++r)
        for (int c = 0; c < cols; ++c) {
            if (grid[r][c] != '1' || seen[r * cols + c]) continue;
            ++count;
            seen[r * cols + c] = 1;
            stack.push_back({r, c});
            while (!stack.empty()) {
                peak = std::max(peak, stack.size());
                auto [cr, cc] = stack.back();
                stack.pop_back();
                for (const auto& d : DIRS) {
                    int nr = cr + d[0], nc = cc + d[1];
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == '1' && !seen[nr * cols + nc]) {
                        seen[nr * cols + nc] = 1;
                        stack.push_back({nr, nc});
                    }
                }
            }
        }
    return {count, peak};
}

// BFS with std::queue. Returns {islands, largest queue size}.
std::pair<int, size_t> countBfs(const Grid& grid) {
    const int rows = grid.size(), cols = rows ? grid[0].size() : 0;
    std::vector<char> seen(rows * cols, 0);
    int count = 0;
    size_t peak = 0;
    std::queue<std::pair<int, int>> q;
    for (int r = 0; r < rows; ++r)
        for (int c = 0; c < cols; ++c) {
            if (grid[r][c] != '1' || seen[r * cols + c]) continue;
            ++count;
            seen[r * cols + c] = 1;
            q.push({r, c});
            while (!q.empty()) {
                peak = std::max(peak, q.size());
                auto [cr, cc] = q.front();
                q.pop();
                for (const auto& d : DIRS) {
                    int nr = cr + d[0], nc = cc + d[1];
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == '1' && !seen[nr * cols + nc]) {
                        seen[nr * cols + nc] = 1;
                        q.push({nr, nc});
                    }
                }
            }
        }
    return {count, peak};
}

// Union-Find over cell ids r * cols + c.
struct DSU {
    std::vector<int> parent, size;
    explicit DSU(int n) : parent(n), size(n, 1) { std::iota(parent.begin(), parent.end(), 0); }
    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];   // path halving: point to the grandparent
            x = parent[x];
        }
        return x;
    }
    bool unite(int a, int b) {               // "union" is a C++ keyword
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;          // already on the same island
        if (size[ra] < size[rb]) std::swap(ra, rb);
        parent[rb] = ra;                     // union by size: small tree under big tree
        size[ra] += size[rb];
        return true;
    }
};

// Returns {islands, successful unions}.
std::pair<int, int> countUnionFind(const Grid& grid) {
    const int rows = grid.size(), cols = rows ? grid[0].size() : 0;
    DSU dsu(rows * cols);
    int land = 0, unions = 0;
    for (int r = 0; r < rows; ++r)
        for (int c = 0; c < cols; ++c) {
            if (grid[r][c] != '1') continue;
            ++land;
            if (r + 1 < rows && grid[r + 1][c] == '1' && dsu.unite(r * cols + c, (r + 1) * cols + c)) ++unions;
            if (c + 1 < cols && grid[r][c + 1] == '1' && dsu.unite(r * cols + c, r * cols + c + 1)) ++unions;
        }
    return {land - unions, unions};          // every successful union merges two islands
}

Grid minstdGrid(int n, long long seed, int percent) {
    Grid rows(n, std::string(n, '0'));
    for (int r = 0; r < n; ++r)
        for (int c = 0; c < n; ++c) {
            seed = seed * 48271 % 2147483647;
            if (seed % 100 < percent) rows[r][c] = '1';
        }
    return rows;
}

int main() {
    std::vector<std::pair<std::string, Grid>> tests = {
        {"leetcode 1", {"11110", "11010", "11000", "00000"}},
        {"leetcode 2", {"11000", "11000", "00100", "00011"}},
        {"ring", {"111", "101", "111"}},
        {"diagonal", {"101", "010", "101"}},
        {"random 300 x 300", minstdGrid(300, 7, 45)},
    };
    for (const auto& [name, grid] : tests)
        std::cout << name << ": dfs " << countDfs(grid).first << ", bfs " << countBfs(grid).first
                  << ", union-find " << countUnionFind(grid).first << "\\n";

    Grid full(300, std::string(300, '1'));
    std::cout << "300 x 300 all land:\\n";
    std::cout << "  DFS stack peak:  " << countDfs(full).second << "\\n";
    std::cout << "  BFS queue peak:  " << countBfs(full).second << "\\n";
    std::cout << "  union-find: parent array " << 300 * 300 << ", successful unions " << countUnionFind(full).second << "\\n";
}`,
          },
          {
            label: "Number of Islands II: Union-Find vs recounting with BFS",
            code: `#include <iostream>
#include <queue>
#include <string>
#include <utility>
#include <vector>

const int DIRS[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};

// Number of Islands II: land appears one cell at a time; report the count
// after every addition. Union-Find makes each addition nearly O(1).
class Islands {
public:
    Islands(int rows, int cols) : rows_(rows), cols_(cols), parent_(rows * cols, -1), size_(rows * cols, 0) {}

    int addLand(int r, int c) {
        int cell = r * cols_ + c;
        if (parent_[cell] != -1) return count_;     // already land: nothing changes
        parent_[cell] = cell;
        size_[cell] = 1;
        ++count_;                                   // a new one-cell island ...
        for (const auto& d : DIRS) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= 0 && nr < rows_ && nc >= 0 && nc < cols_ && parent_[nr * cols_ + nc] != -1) {
                int a = find(cell), b = find(nr * cols_ + nc);
                if (a != b) {                       // ... that may glue islands together
                    if (size_[a] < size_[b]) std::swap(a, b);
                    parent_[b] = a;
                    size_[a] += size_[b];
                    --count_;
                }
            }
        }
        return count_;
    }
    int count() const { return count_; }
    long long steps() const { return steps_; }

private:
    int find(int x) {
        while (parent_[x] != x) {
            ++steps_;
            parent_[x] = parent_[parent_[x]];
            x = parent_[x];
        }
        return x;
    }
    int rows_, cols_, count_ = 0;
    long long steps_ = 0;                           // parent pointers followed in find()
    std::vector<int> parent_, size_;                // parent -1 means water
};

// The slow way: a full BFS over the whole grid after every addition.
int recountBfs(const std::vector<char>& land, int rows, int cols) {
    std::vector<char> seen(rows * cols, 0);
    std::queue<std::pair<int, int>> q;
    int count = 0;
    for (int r = 0; r < rows; ++r)
        for (int c = 0; c < cols; ++c) {
            if (!land[r * cols + c] || seen[r * cols + c]) continue;
            ++count;
            seen[r * cols + c] = 1;
            q.push({r, c});
            while (!q.empty()) {
                auto [cr, cc] = q.front();
                q.pop();
                for (const auto& d : DIRS) {
                    int nr = cr + d[0], nc = cc + d[1];
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && land[nr * cols + nc] && !seen[nr * cols + nc]) {
                        seen[nr * cols + nc] = 1;
                        q.push({nr, nc});
                    }
                }
            }
        }
    return count;
}

int main() {
    Islands small(3, 3);
    std::vector<std::pair<int, int>> adds = {{0, 0}, {0, 1}, {1, 2}, {2, 1}, {1, 1}, {0, 1}};
    std::cout << "3 x 3 additions: [";
    for (size_t i = 0; i < adds.size(); ++i) std::cout << (i ? ", " : "") << small.addLand(adds[i].first, adds[i].second);
    std::cout << "]\\n"; // [1, 1, 2, 3, 1, 1]

    const int N = 30, K = 450;
    Islands uf(N, N);
    std::vector<char> land(N * N, 0);
    long long seed = 11, bfsCells = 0;
    int mismatches = 0;
    for (int i = 0; i < K; ++i) {
        seed = seed * 48271 % 2147483647;
        int r = seed % N, c = seed / N % N;
        land[r * N + c] = 1;
        int fast = uf.addLand(r, c);
        int slow = recountBfs(land, N, N);
        bfsCells += N * N;                          // every recount scans all N * N cells
        if (fast != slow) ++mismatches;
    }
    std::cout << K << " additions on " << N << " x " << N << ": final count " << uf.count() << ", mismatches " << mismatches << "\\n";
    std::cout << "  recount with BFS each time: " << bfsCells << " cells scanned\\n";
    std::cout << "  union-find: " << uf.steps() << " pointer steps in find()\\n";
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you count connected components in an undirected graph?",
    difficulty: "medium",
    seoDescription: "Count connected components in an undirected graph with DFS, BFS or Union-Find (n minus unions), with verified Python, JavaScript, Java and C++ code.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given n nodes labelled 0 to n − 1 and a list of undirected edges. Write a Python function that returns the number of connected components."

**What a strong answer should cover:**
- Build an adjacency list sized by n (so isolated nodes are not lost), then start a DFS/BFS from every unvisited node; the number of starts is the answer.
- The Union-Find alternative: components = n − successful unions; duplicates, self-loops and cycle edges are skipped automatically.
- O(V + E) time for traversal; O(E · α(V)) for Union-Find, with O(V) space and no adjacency list.
- Edge cases: no edges, isolated nodes, duplicate edges, self-loops.
- Python details: iterative DFS with a list as the stack or BFS with \`collections.deque\` (recursive DFS fails beyond about 1000 levels), \`[[] for _ in range(n)]\` for the adjacency list.

**Clarifying questions expected:**
- Is n given separately (can there be nodes with no edges)?
- Can edges repeat or be self-loops?
- Do you need the components themselves or just the count?

**Code / implementation expected:** Yes — a traversal-based count and/or a Union-Find count, in Python.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an adjacency list is and roughly how BFS or DFS work  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A new school has 8 students and a list of who already knows whom: 0 knows 1, 2 knows 3, 3 knows 4, 6 knows 7. The head teacher wants to send one invitation to each friend group and let the news spread by word of mouth inside the group. How many invitations does she need?

She could do it like this: pick any student who has not been reached yet, send them an invitation, and let the news travel friend to friend until it stops. Count one invitation. Repeat until everyone has heard. For our list she sends four invitations — to the groups {0, 1}, {2, 3, 4}, {5} and {6, 7}. Student 5 knows nobody, so 5 is a group of one and still needs an invitation.

Each group is a **connected component**, and "send an invitation, let it spread, repeat" is the entire algorithm. It shows up everywhere: friend circles, networks of computers that can talk to each other, provinces of connected cities, pixels in an image, and — when the graph is a grid — [islands on a map](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are vertices numbered 0 to n − 1, and is n given separately from the edges? | Isolated vertices appear in no edge; if you only look at the edge list you will miss them (n = 4 with no edges has 4 components). |
| Can there be duplicate edges or self-loops? | Both are harmless if handled: a visited check or a "same root" check simply ignores them (example 1 includes both). |
| Is the graph really undirected? | For a directed graph, "connected" splits into weakly and strongly connected; strongly connected components need a different algorithm. |
| Do you want the count, or the groups themselves? | Returning groups means labelling each vertex with a component id (example 2). |
| Is the edge list fixed, or do edges keep arriving? | Arriving edges favour Union-Find, which updates the count in near-constant time per edge. |
| How large are n and the number of edges? | Up to 10^5 vertices makes recursion depth a concern; an iterative stack, BFS or Union-Find avoids it. |

## 3. The Core Idea

📌 **Interview term: Connected component** — a maximal set of vertices in which every vertex can reach every other along edges. "Maximal" means you cannot add another vertex and keep that property.

📌 **Interview term: Isolated vertex** — a vertex with no edges. It is a connected component of size 1 on its own.

**Approach 1 — traverse and count starts.** Loop over every vertex. If it has not been visited, it belongs to a component nobody has explored yet: add 1 to the count and run a DFS or BFS from it that marks everything it can reach (see [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs)). When the loop ends, the count is the number of components. Every vertex is marked exactly once, so the loop never counts a component twice.

**Approach 2 — Union-Find.** Start with n groups, one per vertex. For each edge (u, v), find the group of u and the group of v. If they are different, merge them: two components became one, so the count drops by 1. If they are the same, the edge connects vertices that were already connected (a duplicate, a self-loop, or an edge that closes a cycle) and nothing changes. When all edges are processed, the count is the answer. The structure itself is explained on [the Union-Find page](/interview-question/what-is-the-union-find-disjoint-set-data-structure).

📌 **Interview term: components = n − successful unions** — every union that merges two different groups reduces the number of groups by exactly one, so the final count is n minus the number of edges that actually merged something.

📌 **Interview term: Spanning forest** — the edges that DFS/BFS used to discover new vertices, or that Union-Find successfully merged with. It has exactly n − (number of components) edges; every other edge closes a cycle.

Here is the graph from the story (example 2 builds it):

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="Eight vertices in four connected components: 0 and 1; 2, 3 and 4; 5 alone; 6 and 7">
  <rect class="d-box-muted" x="20" y="50" width="140" height="110" rx="12"/>
  <rect class="d-box-muted" x="180" y="50" width="210" height="110" rx="12"/>
  <rect class="d-box-muted" x="410" y="50" width="80" height="110" rx="12"/>
  <rect class="d-box-muted" x="510" y="50" width="150" height="110" rx="12"/>
  <text class="d-sub" x="90" y="35" text-anchor="middle">component 0</text>
  <text class="d-sub" x="285" y="35" text-anchor="middle">component 1</text>
  <text class="d-sub" x="450" y="35" text-anchor="middle">component 2</text>
  <text class="d-sub" x="585" y="35" text-anchor="middle">component 3</text>
  <path class="d-edge-accent" d="M 55 105 L 125 105"/>
  <path class="d-edge-accent" d="M 215 105 L 285 105"/>
  <path class="d-edge-accent" d="M 285 105 L 355 105"/>
  <path class="d-edge-accent" d="M 550 105 L 620 105"/>
  <circle class="d-box-accent" cx="55" cy="105" r="20"/>
  <text class="d-text" x="55" y="110" text-anchor="middle">0</text>
  <circle class="d-box-accent" cx="125" cy="105" r="20"/>
  <text class="d-text" x="125" y="110" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="215" cy="105" r="20"/>
  <text class="d-text" x="215" y="110" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="285" cy="105" r="20"/>
  <text class="d-text" x="285" y="110" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="355" cy="105" r="20"/>
  <text class="d-text" x="355" y="110" text-anchor="middle">4</text>
  <circle class="d-box" cx="450" cy="105" r="20"/>
  <text class="d-text" x="450" y="110" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="550" cy="105" r="20"/>
  <text class="d-text" x="550" y="110" text-anchor="middle">6</text>
  <circle class="d-box-accent" cx="620" cy="105" r="20"/>
  <text class="d-text" x="620" y="110" text-anchor="middle">7</text>
  <text class="d-sub" x="90" y="190" text-anchor="middle">size 2</text>
  <text class="d-sub" x="285" y="190" text-anchor="middle">size 3</text>
  <text class="d-sub" x="450" y="190" text-anchor="middle">size 1</text>
  <text class="d-sub" x="585" y="190" text-anchor="middle">size 2</text>
</svg>

Vertex 5 appears in no edge but is still a component. The edge list also contains both (6, 7) and (7, 6); in an undirected graph that is the same connection, so it does not change anything.

And here is the single decision Union-Find makes for every edge:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="For each edge, if both ends already have the same root skip it, otherwise merge the two groups and subtract one from the count">
  <defs>
    <marker id="b21q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="90" text-anchor="middle">edge (u, v)</text>
  <text class="d-sub" x="95" y="112" text-anchor="middle">one at a time</text>
  <path class="d-edge" d="M 172 95 L 238 95" marker-end="url(#b21q5-arrow)"/>
  <rect class="d-box-muted" x="242" y="60" width="170" height="70" rx="10"/>
  <text class="d-text" x="327" y="90" text-anchor="middle">same root?</text>
  <text class="d-sub" x="327" y="112" text-anchor="middle">find(u) vs find(v)</text>
  <path class="d-edge" d="M 414 80 L 470 40" marker-end="url(#b21q5-arrow)"/>
  <path class="d-edge" d="M 414 110 L 470 150" marker-end="url(#b21q5-arrow)"/>
  <text class="d-sub" x="436" y="48" text-anchor="middle">yes</text>
  <text class="d-sub" x="436" y="150" text-anchor="middle">no</text>
  <rect class="d-box-muted" x="474" y="14" width="210" height="56" rx="10"/>
  <text class="d-text" x="579" y="38" text-anchor="middle">skip the edge</text>
  <text class="d-sub" x="579" y="58" text-anchor="middle">duplicate, loop or cycle</text>
  <rect class="d-box-accent" x="474" y="122" width="210" height="56" rx="10"/>
  <text class="d-text" x="579" y="146" text-anchor="middle">merge, count - 1</text>
  <text class="d-sub" x="579" y="166" text-anchor="middle">two groups become one</text>
</svg>

On the story graph: start with 8 groups; (0, 1) merges → 7; (2, 3) → 6; (3, 4) → 5; (6, 7) → 4; (7, 6) finds the same root for both ends → skipped. Answer: 4.

## 4. The Code in Python

Approach 1, an iterative DFS that counts how many times it has to start a new search:

~~~python
def count_dfs(n, edges):
    """Start a DFS from every node not yet seen; each start is one component."""
    adj, seen, count = build(n, edges), [False] * n, 0
    for s in range(n):
        if seen[s]:
            continue
        count += 1
        seen[s] = True
        stack = [s]
        while stack:
            u = stack.pop()
            for v in adj[u]:
                if not seen[v]:
                    seen[v] = True
                    stack.append(v)
    return count
~~~

Approach 2, Union-Find, which never builds an adjacency list:

~~~python
def count_union_find(n, edges):
    """Start with n singletons; every edge that joins two different groups removes one."""
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]   # path halving
            x = parent[x]
        return x

    components = n
    for u, v in edges:
        ru, rv = find(u), find(v)
        if ru != rv:
            parent[ru] = rv
            components -= 1
    return components
~~~

**What to point out in this code:**

- \`build\` creates \`[[] for _ in range(n)]\` from \`n\`, not from the edges, so vertex 5 in the story still exists. It appends both directions because the graph is undirected.
- \`seen[v] = True\` happens when \`v\` is **pushed**, so no vertex is ever on the stack twice and each component is counted exactly once.
- The stack is a plain list; switching it to \`collections.deque\` with \`popleft()\` gives BFS (\`count_bfs\` in example 1), with the same count.
- No recursion anywhere, so a 100,000-vertex path is fine; a recursive DFS would hit the default limit of 1000 frames.
- In \`count_union_find\`, \`find\` is an iterative loop with path halving. This short version links \`parent[ru] = rv\` without union by size; path halving alone already keeps it fast in practice, and example 2 adds union by size for the large graph.
- Self-loop \`(2, 2)\`: \`find(2) == find(2)\`, so it is skipped. Duplicate \`(1, 0)\` after \`(0, 1)\`: same root, skipped.

📌 **Interview term: Path halving** — during \`find\`, point every other node on the path at its grandparent; it keeps Union-Find trees flat with a two-line loop.

## 5. Getting the Components, Not Just the Count

Example 2 labels each vertex with the id of its component (\`comp[v]\`), then groups vertices by label. Because the outer loop visits vertices in order 0, 1, 2, …, each group comes out already sorted. Two vertices are in the same component exactly when \`comp[a] == comp[b]\` — an O(1) query after an O(V + E) pass. It then runs both methods on a random graph with 100,000 vertices and 60,000 edges and checks that the counts agree and that the Union-Find count equals n minus the number of successful unions. In Python, \`sizes.count(1)\` counts the single-vertex components and \`max(sizes)\` finds the largest one.

## 6. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. The random graph in example 2 comes from a small deterministic generator (MINSTD), so every language builds exactly the same 60,000 edges.

**Example 1 — DFS, BFS and Union-Find on six graphs** prints:

~~~text
n=5 edges=[[0, 1], [1, 2], [3, 4]]: dfs 2, bfs 2, union-find 2
n=5 edges=[[0, 1], [1, 2], [2, 3], [3, 4]]: dfs 1, bfs 1, union-find 1
n=4 edges=[]: dfs 4, bfs 4, union-find 4
n=1 edges=[]: dfs 1, bfs 1, union-find 1
n=4 edges=[[0, 1], [1, 0], [2, 2]]: dfs 3, bfs 3, union-find 3
n=6 edges=[[0, 1], [1, 2], [2, 0], [3, 4]]: dfs 3, bfs 3, union-find 3
~~~

**Example 2 — labelling components, and a 100,000-vertex random graph** prints:

~~~text
n=8 has 4 components:
  [0, 1]
  [2, 3, 4]
  [5]
  [6, 7]
same component? 2 and 4: true, 1 and 5: false
random graph n=100000, m=60000:
  DFS components:        40394
  union-find components: 40394 (= 100000 - 59606 successful unions)
  largest component: 31118 nodes, single-node components: 30139
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Iterative DFS (list stack) | O(V + E) | O(V + E) | adjacency list is V lists holding 2E entries; each vertex pushed once |
| BFS (\`deque\`) | O(V + E) | O(V + E) | same marks; queue instead of stack |
| Union-Find | O(V + E · α(V)) | O(V) | \`parent\` (and \`size\`) lists only; no adjacency list |
| Recursive DFS | O(V + E) | O(V) call frames | fails past about 1000 levels with the default limit |

## 8. Choosing Between DFS, BFS and Union-Find

| | DFS / BFS | Union-Find |
| :--- | :--- | :--- |
| Needs an adjacency list? | yes — O(V + E) to build | no — works straight from the edge list |
| Time | O(V + E) | O(V + E · α(V)), effectively linear |
| Extra space | O(V + E) (adjacency + visited + stack/queue) | O(V) (parent + size) |
| Gives the members of each component? | yes, by labelling during the traversal | yes, group vertices by \`find(v)\` |
| Edges keep arriving | re-run, O(V + E) each time | O(α) per new edge |
| Also detects | distances (BFS), cycles | "this edge closes a cycle" (union returns false) |

Both are correct for the count. Reach for **DFS/BFS** when you already have (or need) an adjacency list or you want distances and paths; reach for **Union-Find** when edges stream in, when the input is just an edge list, or when you want the smallest memory footprint. The grid version of the same trade-off is worked through in [islands with DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).

**Follow-ups you may get:**

- **"Is this graph a valid tree?"** — a tree on n vertices has exactly n − 1 edges and exactly 1 component. Union-Find answers it in one pass: fail as soon as an edge's ends already share a root (cycle), and check the count is 1 at the end.
- **"Number of provinces"** — the same problem with an n × n adjacency matrix as input; loop over the matrix instead of an edge list (see [graph representations](/interview-question/what-is-a-graph-and-how-do-you-represent-it)).
- **Directed graphs** — "connected" splits into weakly connected (ignore direction and count as above) and strongly connected, which needs Kosaraju or Tarjan: [strongly connected components](/interview-question/how-do-you-find-strongly-connected-components-in-a-directed-graph).
- **Related traversals:** [bipartite check](/interview-question/how-do-you-check-if-a-graph-is-bipartite) (BFS colouring per component) and [cloning a graph](/interview-question/how-do-you-clone-a-graph) (traversal with a copy map).

## 9. Edge Cases

- **No edges** — n components (example 1: n = 4 → 4; n = 1 → 1).
- **Isolated vertices** — counted because the outer loop runs over all n vertices, not over edge endpoints (vertex 5 in example 2).
- **Duplicate edges and self-loops** — \`(0, 1), (1, 0), (2, 2)\` gives 3 components for n = 4 in every method (example 1).
- **Cycles** — the triangle 0–1–2 plus edge 3–4 with n = 6 gives 3 components; the cycle edge is just skipped.
- **Huge, sparse graphs** — on 100,000 vertices and 60,000 random edges, DFS and Union-Find both find 40,394 components, of which 30,139 are single vertices (example 2). Note how many isolated vertices a sparse random graph has.
- **One long path** — a recursive DFS goes n calls deep; use an explicit stack, BFS or Union-Find (all three versions in example 1 are recursion-free).

## Common Pitfalls

- **Building the graph from edge endpoints only.** Isolated vertices disappear; size the adjacency list (and the Union-Find arrays) by \`n\`.
- **\`[[]] * n\`.** One shared list for every vertex; every neighbour shows up everywhere and the count comes out as 1.
- **Recursive DFS on large inputs.** A long path exceeds the 1000-frame default; use a list stack, \`deque\` BFS or Union-Find.
- **Counting distinct \`parent\` values at the end.** Without calling \`find\` on each vertex the parents are not all roots; count \`len({find(v) for v in range(n)})\`, or simply track \`n − unions\`.
- **Adding only one direction.** For an undirected graph append \`v\` to \`adj[u]\` and \`u\` to \`adj[v]\`, or DFS from the wrong end misses vertices.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">Each unvisited vertex starts a new component; a DFS or BFS from it marks the whole component, so the number of starts is the answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Setup:</strong> <span style="color:#f0e2c8;">Adjacency list sized by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> with both directions, so isolated vertices and either edge direction are handled.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Alternative:</strong> <span style="color:#f0e2c8;">Union-Find: start with n groups, subtract one for every edge whose ends have different roots; duplicates and cycles are skipped.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Traversal O(V + E) time and space; Union-Find O(E · α(V)) time and O(V) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Iterative stack or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque</code> BFS, because recursive DFS stops at about 1000 levels.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the components themselves?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Label each vertex with a component id during the traversal, then group by label (example 2), or group vertices by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find(v)</code> with Union-Find.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if edges keep arriving and you must report the count after each?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Union-Find: each new edge is one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">union</code>, and the count drops by one only when it merges two groups. A traversal would have to rerun.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you check whether the graph is a valid tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exactly n − 1 edges and one component; with Union-Find, fail immediately if an edge joins two vertices that already share a root.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for a directed graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Treat edges as undirected for weakly connected components; strongly connected components need Kosaraju or Tarjan.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not recursion?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Python's default recursion limit is 1000, so a long chain of vertices raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RecursionError</code>; an explicit stack has no such limit.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Connected component** | Maximal set of mutually reachable vertices |
| **Isolated vertex** | A vertex with no edges; a component of size 1 |
| **components = n − successful unions** | Each real merge removes exactly one group |
| **Spanning forest** | The n − components edges that discovered or merged; all others close cycles |
| **Path halving** | In \`find\`, point nodes at their grandparents to flatten the tree |

---
**Conclusion:** In Python, counting connected components is one loop over all n vertices: every unvisited vertex adds one to the count and an iterative DFS (list stack) or BFS (\`deque\`) marks its whole component — O(V + E). Union-Find gets the same answer straight from the edge list as n minus the successful unions, in O(V) extra space. Size everything by \`n\` so isolated vertices count, and avoid recursion for large inputs.`,
        examples: [
          {
            label: "Count components three ways: DFS, BFS, Union-Find",
            code: `from collections import deque


def build(n, edges):
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)       # undirected: store both directions
    return adj


def count_dfs(n, edges):
    """Start a DFS from every node not yet seen; each start is one component."""
    adj, seen, count = build(n, edges), [False] * n, 0
    for s in range(n):
        if seen[s]:
            continue
        count += 1
        seen[s] = True
        stack = [s]
        while stack:
            u = stack.pop()
            for v in adj[u]:
                if not seen[v]:
                    seen[v] = True
                    stack.append(v)
    return count


def count_bfs(n, edges):
    adj, seen, count = build(n, edges), [False] * n, 0
    for s in range(n):
        if seen[s]:
            continue
        count += 1
        seen[s] = True
        queue = deque([s])
        while queue:
            u = queue.popleft()
            for v in adj[u]:
                if not seen[v]:
                    seen[v] = True
                    queue.append(v)
    return count


def count_union_find(n, edges):
    """Start with n singletons; every edge that joins two different groups removes one."""
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]   # path halving
            x = parent[x]
        return x

    components = n
    for u, v in edges:
        ru, rv = find(u), find(v)
        if ru != rv:
            parent[ru] = rv
            components -= 1
    return components


def fmt_edges(edges):
    return "[" + ", ".join("[" + str(u) + ", " + str(v) + "]" for u, v in edges) + "]"


tests = [
    (5, [(0, 1), (1, 2), (3, 4)]),
    (5, [(0, 1), (1, 2), (2, 3), (3, 4)]),
    (4, []),
    (1, []),
    (4, [(0, 1), (1, 0), (2, 2)]),           # duplicate edge and a self-loop
    (6, [(0, 1), (1, 2), (2, 0), (3, 4)]),   # a cycle does not change the count
]
for n, edges in tests:
    print("n=" + str(n) + " edges=" + fmt_edges(edges) + ": dfs " + str(count_dfs(n, edges))
          + ", bfs " + str(count_bfs(n, edges)) + ", union-find " + str(count_union_find(n, edges)))`,
          },
          {
            label: "Label the components, and a 100,000-vertex random graph",
            code: `def label_components(n, edges):
    """comp[v] = id of the component containing v (ids 0, 1, 2, ... in discovery order)."""
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    comp = [-1] * n
    next_id = 0
    for s in range(n):
        if comp[s] != -1:
            continue
        comp[s] = next_id
        stack = [s]
        while stack:
            u = stack.pop()
            for v in adj[u]:
                if comp[v] == -1:
                    comp[v] = next_id
                    stack.append(v)
        next_id += 1
    return comp, next_id


def union_find_count(n, edges):
    parent, size = list(range(n)), [1] * n

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    unions = 0
    for u, v in edges:
        a, b = find(u), find(v)
        if a != b:
            if size[a] < size[b]:
                a, b = b, a
            parent[b] = a                  # union by size keeps trees shallow
            size[a] += size[b]
            unions += 1
    return n - unions, unions


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


n = 8
edges = [(0, 1), (2, 3), (3, 4), (6, 7), (7, 6)]
comp, k = label_components(n, edges)
groups = [[] for _ in range(k)]
for v in range(n):
    groups[comp[v]].append(v)              # nodes visited in order, so each group is sorted
print("n=8 has " + str(k) + " components:")
for g in groups:
    print("  " + fmt(g))
print("same component? 2 and 4: " + str(comp[2] == comp[4]).lower() + ", 1 and 5: " + str(comp[1] == comp[5]).lower())

N, M, seed, big = 100000, 60000, 2024, []
for _ in range(M):
    seed = seed * 48271 % 2147483647
    u = seed % N
    seed = seed * 48271 % 2147483647
    big.append((u, seed % N))
comp, k = label_components(N, big)
sizes = [0] * k
for c in comp:
    sizes[c] += 1
uf, unions = union_find_count(N, big)
print("random graph n=" + str(N) + ", m=" + str(M) + ":")
print("  DFS components:        " + str(k))
print("  union-find components: " + str(uf) + " (= " + str(N) + " - " + str(unions) + " successful unions)")
print("  largest component: " + str(max(sizes)) + " nodes, single-node components: " + str(sizes.count(1)))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given n nodes labelled 0 to n − 1 and an array of undirected edges. Write a JavaScript function that returns the number of connected components."

**What a strong answer should cover:**
- Build an adjacency list sized by n (so isolated nodes are not lost), then start a DFS/BFS from every unvisited node; the number of starts is the answer.
- The Union-Find alternative: components = n − successful unions; duplicates, self-loops and cycle edges are skipped automatically.
- O(V + E) time for traversal; O(E · α(V)) for Union-Find, with O(V) space and no adjacency list.
- Edge cases: no edges, isolated nodes, duplicate edges, self-loops.
- JavaScript details: \`Array.from({ length: n }, () => [])\` for the adjacency list, an explicit stack (deep recursion throws \`RangeError\`), a head index instead of \`shift()\` for BFS, typed arrays for large inputs.

**Clarifying questions expected:**
- Is n given separately (can there be nodes with no edges)?
- Can edges repeat or be self-loops?
- Do you need the components themselves or just the count?

**Code / implementation expected:** Yes — a traversal-based count and/or a Union-Find count, in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an adjacency list is and roughly how BFS or DFS work  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A new school has 8 students and a list of who already knows whom: 0 knows 1, 2 knows 3, 3 knows 4, 6 knows 7. The head teacher wants to send one invitation to each friend group and let the news spread by word of mouth inside the group. How many invitations does she need?

She could do it like this: pick any student who has not been reached yet, send them an invitation, and let the news travel friend to friend until it stops. Count one invitation. Repeat until everyone has heard. For our list she sends four invitations — to the groups {0, 1}, {2, 3, 4}, {5} and {6, 7}. Student 5 knows nobody, so 5 is a group of one and still needs an invitation.

Each group is a **connected component**, and "send an invitation, let it spread, repeat" is the entire algorithm. It shows up everywhere: friend circles, networks of computers that can talk to each other, provinces of connected cities, pixels in an image, and — when the graph is a grid — [islands on a map](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are vertices numbered 0 to n − 1, and is n given separately from the edges? | Isolated vertices appear in no edge; if you only look at the edge list you will miss them (n = 4 with no edges has 4 components). |
| Can there be duplicate edges or self-loops? | Both are harmless if handled: a visited check or a "same root" check simply ignores them (example 1 includes both). |
| Is the graph really undirected? | For a directed graph, "connected" splits into weakly and strongly connected; strongly connected components need a different algorithm. |
| Do you want the count, or the groups themselves? | Returning groups means labelling each vertex with a component id (example 2). |
| Is the edge list fixed, or do edges keep arriving? | Arriving edges favour Union-Find, which updates the count in near-constant time per edge. |
| How large are n and the number of edges? | Up to 10^5 vertices makes recursion depth a concern; an iterative stack, BFS or Union-Find avoids it. |

## 3. The Core Idea

📌 **Interview term: Connected component** — a maximal set of vertices in which every vertex can reach every other along edges. "Maximal" means you cannot add another vertex and keep that property.

📌 **Interview term: Isolated vertex** — a vertex with no edges. It is a connected component of size 1 on its own.

**Approach 1 — traverse and count starts.** Loop over every vertex. If it has not been visited, it belongs to a component nobody has explored yet: add 1 to the count and run a DFS or BFS from it that marks everything it can reach (see [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs)). When the loop ends, the count is the number of components. Every vertex is marked exactly once, so the loop never counts a component twice.

**Approach 2 — Union-Find.** Start with n groups, one per vertex. For each edge (u, v), find the group of u and the group of v. If they are different, merge them: two components became one, so the count drops by 1. If they are the same, the edge connects vertices that were already connected (a duplicate, a self-loop, or an edge that closes a cycle) and nothing changes. When all edges are processed, the count is the answer. The structure itself is explained on [the Union-Find page](/interview-question/what-is-the-union-find-disjoint-set-data-structure).

📌 **Interview term: components = n − successful unions** — every union that merges two different groups reduces the number of groups by exactly one, so the final count is n minus the number of edges that actually merged something.

📌 **Interview term: Spanning forest** — the edges that DFS/BFS used to discover new vertices, or that Union-Find successfully merged with. It has exactly n − (number of components) edges; every other edge closes a cycle.

Here is the graph from the story (example 2 builds it):

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="Eight vertices in four connected components: 0 and 1; 2, 3 and 4; 5 alone; 6 and 7">
  <rect class="d-box-muted" x="20" y="50" width="140" height="110" rx="12"/>
  <rect class="d-box-muted" x="180" y="50" width="210" height="110" rx="12"/>
  <rect class="d-box-muted" x="410" y="50" width="80" height="110" rx="12"/>
  <rect class="d-box-muted" x="510" y="50" width="150" height="110" rx="12"/>
  <text class="d-sub" x="90" y="35" text-anchor="middle">component 0</text>
  <text class="d-sub" x="285" y="35" text-anchor="middle">component 1</text>
  <text class="d-sub" x="450" y="35" text-anchor="middle">component 2</text>
  <text class="d-sub" x="585" y="35" text-anchor="middle">component 3</text>
  <path class="d-edge-accent" d="M 55 105 L 125 105"/>
  <path class="d-edge-accent" d="M 215 105 L 285 105"/>
  <path class="d-edge-accent" d="M 285 105 L 355 105"/>
  <path class="d-edge-accent" d="M 550 105 L 620 105"/>
  <circle class="d-box-accent" cx="55" cy="105" r="20"/>
  <text class="d-text" x="55" y="110" text-anchor="middle">0</text>
  <circle class="d-box-accent" cx="125" cy="105" r="20"/>
  <text class="d-text" x="125" y="110" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="215" cy="105" r="20"/>
  <text class="d-text" x="215" y="110" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="285" cy="105" r="20"/>
  <text class="d-text" x="285" y="110" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="355" cy="105" r="20"/>
  <text class="d-text" x="355" y="110" text-anchor="middle">4</text>
  <circle class="d-box" cx="450" cy="105" r="20"/>
  <text class="d-text" x="450" y="110" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="550" cy="105" r="20"/>
  <text class="d-text" x="550" y="110" text-anchor="middle">6</text>
  <circle class="d-box-accent" cx="620" cy="105" r="20"/>
  <text class="d-text" x="620" y="110" text-anchor="middle">7</text>
  <text class="d-sub" x="90" y="190" text-anchor="middle">size 2</text>
  <text class="d-sub" x="285" y="190" text-anchor="middle">size 3</text>
  <text class="d-sub" x="450" y="190" text-anchor="middle">size 1</text>
  <text class="d-sub" x="585" y="190" text-anchor="middle">size 2</text>
</svg>

Vertex 5 appears in no edge but is still a component. The edge list also contains both (6, 7) and (7, 6); in an undirected graph that is the same connection, so it does not change anything.

And here is the single decision Union-Find makes for every edge:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="For each edge, if both ends already have the same root skip it, otherwise merge the two groups and subtract one from the count">
  <defs>
    <marker id="b21q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="90" text-anchor="middle">edge (u, v)</text>
  <text class="d-sub" x="95" y="112" text-anchor="middle">one at a time</text>
  <path class="d-edge" d="M 172 95 L 238 95" marker-end="url(#b21q5-arrow)"/>
  <rect class="d-box-muted" x="242" y="60" width="170" height="70" rx="10"/>
  <text class="d-text" x="327" y="90" text-anchor="middle">same root?</text>
  <text class="d-sub" x="327" y="112" text-anchor="middle">find(u) vs find(v)</text>
  <path class="d-edge" d="M 414 80 L 470 40" marker-end="url(#b21q5-arrow)"/>
  <path class="d-edge" d="M 414 110 L 470 150" marker-end="url(#b21q5-arrow)"/>
  <text class="d-sub" x="436" y="48" text-anchor="middle">yes</text>
  <text class="d-sub" x="436" y="150" text-anchor="middle">no</text>
  <rect class="d-box-muted" x="474" y="14" width="210" height="56" rx="10"/>
  <text class="d-text" x="579" y="38" text-anchor="middle">skip the edge</text>
  <text class="d-sub" x="579" y="58" text-anchor="middle">duplicate, loop or cycle</text>
  <rect class="d-box-accent" x="474" y="122" width="210" height="56" rx="10"/>
  <text class="d-text" x="579" y="146" text-anchor="middle">merge, count - 1</text>
  <text class="d-sub" x="579" y="166" text-anchor="middle">two groups become one</text>
</svg>

On the story graph: start with 8 groups; (0, 1) merges → 7; (2, 3) → 6; (3, 4) → 5; (6, 7) → 4; (7, 6) finds the same root for both ends → skipped. Answer: 4.

## 4. The Code in JavaScript

Approach 1, an iterative DFS that counts how many times it has to start a new search:

~~~javascript
function countDfs(n, edges) {
  // Start a DFS from every node not yet seen; each start is one component.
  const adj = build(n, edges), seen = new Array(n).fill(false);
  let count = 0;
  for (let s = 0; s < n; s++) {
    if (seen[s]) continue;
    count++;
    seen[s] = true;
    const stack = [s];
    while (stack.length > 0) {
      const u = stack.pop();
      for (const v of adj[u]) {
        if (!seen[v]) {
          seen[v] = true;
          stack.push(v);
        }
      }
    }
  }
  return count;
}
~~~

Approach 2, Union-Find, which never builds an adjacency list:

~~~javascript
function countUnionFind(n, edges) {
  // Start with n singletons; every edge that joins two different groups removes one.
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];   // path halving
      x = parent[x];
    }
    return x;
  };
  let components = n;
  for (const [u, v] of edges) {
    const ru = find(u), rv = find(v);
    if (ru !== rv) {
      parent[ru] = rv;
      components--;
    }
  }
  return components;
}
~~~

**What to point out in this code:**

- \`build\` creates \`Array.from({ length: n }, () => [])\` from \`n\`, not from the edges, so isolated vertices still exist. It pushes both directions because the graph is undirected.
- \`seen[v] = true\` happens when \`v\` is **pushed**, so no vertex is on the stack twice and each component is counted exactly once.
- The stack is a plain array (\`push\`/\`pop\` at the end). \`countBfs\` in example 1 is the queue version; it walks the array with a \`head\` index instead of calling \`shift()\`, which can be O(n) per call.
- No recursion, so a 100,000-vertex path is fine; recursion that deep throws \`RangeError: Maximum call stack size exceeded\` in Node.
- In \`countUnionFind\`, \`find\` is an arrow function with a loop and path halving. This short version links \`parent[ru] = rv\` without union by size; example 2 adds union by size for the large graph.
- Self-loop \`[2, 2]\` and duplicate \`[1, 0]\`: both ends already share a root, so they are skipped.

📌 **Interview term: Path halving** — during \`find\`, point every other node on the path at its grandparent; it keeps Union-Find trees flat with a two-line loop.

## 5. Getting the Components, Not Just the Count

Example 2 labels each vertex with the id of its component in an \`Int32Array\` (\`comp[v]\`, \`-1\` until visited), then groups vertices by label. Because the outer loop visits vertices in order, each group comes out already sorted. Two vertices are in the same component exactly when \`comp[a] === comp[b]\`. It then runs both methods on a random graph with 100,000 vertices and 60,000 edges and checks that the counts agree and that the Union-Find count equals n minus the number of successful unions. The largest size is found with a loop rather than \`Math.max(...sizes)\`: spreading puts every element on the call stack as an argument, and in our Node 22 run \`Math.max(...array)\` worked for 120,000 elements but threw \`RangeError\` for 200,000.

## 6. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\` (Node.js 22; the code is plain browser-safe JavaScript, so it also runs in the page). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. The random graph in example 2 comes from a small deterministic generator (MINSTD), so every language builds exactly the same 60,000 edges.

**Example 1 — DFS, BFS and Union-Find on six graphs** prints:

~~~text
n=5 edges=[[0, 1], [1, 2], [3, 4]]: dfs 2, bfs 2, union-find 2
n=5 edges=[[0, 1], [1, 2], [2, 3], [3, 4]]: dfs 1, bfs 1, union-find 1
n=4 edges=[]: dfs 4, bfs 4, union-find 4
n=1 edges=[]: dfs 1, bfs 1, union-find 1
n=4 edges=[[0, 1], [1, 0], [2, 2]]: dfs 3, bfs 3, union-find 3
n=6 edges=[[0, 1], [1, 2], [2, 0], [3, 4]]: dfs 3, bfs 3, union-find 3
~~~

**Example 2 — labelling components, and a 100,000-vertex random graph** prints:

~~~text
n=8 has 4 components:
  [0, 1]
  [2, 3, 4]
  [5]
  [6, 7]
same component? 2 and 4: true, 1 and 5: false
random graph n=100000, m=60000:
  DFS components:        40394
  union-find components: 40394 (= 100000 - 59606 successful unions)
  largest component: 31118 nodes, single-node components: 30139
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Iterative DFS (array stack) | O(V + E) | O(V + E) | adjacency list is V arrays holding 2E entries; each vertex pushed once |
| BFS (array + head index) | O(V + E) | O(V + E) | same marks; queue instead of stack |
| Union-Find | O(V + E · α(V)) | O(V) | \`parent\` (and \`size\`) arrays only; no adjacency list |
| Recursive DFS | O(V + E) | O(V) call frames | throws \`RangeError\` on deep paths |

## 8. Choosing Between DFS, BFS and Union-Find

| | DFS / BFS | Union-Find |
| :--- | :--- | :--- |
| Needs an adjacency list? | yes — O(V + E) to build | no — works straight from the edge list |
| Time | O(V + E) | O(V + E · α(V)), effectively linear |
| Extra space | O(V + E) (adjacency + visited + stack/queue) | O(V) (parent + size) |
| Gives the members of each component? | yes, by labelling during the traversal | yes, group vertices by \`find(v)\` |
| Edges keep arriving | re-run, O(V + E) each time | O(α) per new edge |
| Also detects | distances (BFS), cycles | "this edge closes a cycle" (union returns false) |

Both are correct for the count. Reach for **DFS/BFS** when you already have (or need) an adjacency list or you want distances and paths; reach for **Union-Find** when edges stream in, when the input is just an edge list, or when you want the smallest memory footprint. The grid version of the same trade-off is worked through in [islands with DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).

**Follow-ups you may get:**

- **"Is this graph a valid tree?"** — a tree on n vertices has exactly n − 1 edges and exactly 1 component. Union-Find answers it in one pass: fail as soon as an edge's ends already share a root (cycle), and check the count is 1 at the end.
- **"Number of provinces"** — the same problem with an n × n adjacency matrix as input; loop over the matrix instead of an edge list (see [graph representations](/interview-question/what-is-a-graph-and-how-do-you-represent-it)).
- **Directed graphs** — "connected" splits into weakly connected (ignore direction and count as above) and strongly connected, which needs Kosaraju or Tarjan: [strongly connected components](/interview-question/how-do-you-find-strongly-connected-components-in-a-directed-graph).
- **Related traversals:** [bipartite check](/interview-question/how-do-you-check-if-a-graph-is-bipartite) (BFS colouring per component) and [cloning a graph](/interview-question/how-do-you-clone-a-graph) (traversal with a copy map).

## 9. Edge Cases

- **No edges** — n components (example 1: n = 4 → 4; n = 1 → 1).
- **Isolated vertices** — counted because the outer loop runs over all n vertices, not over edge endpoints (vertex 5 in example 2).
- **Duplicate edges and self-loops** — \`(0, 1), (1, 0), (2, 2)\` gives 3 components for n = 4 in every method (example 1).
- **Cycles** — the triangle 0–1–2 plus edge 3–4 with n = 6 gives 3 components; the cycle edge is just skipped.
- **Huge, sparse graphs** — on 100,000 vertices and 60,000 random edges, DFS and Union-Find both find 40,394 components, of which 30,139 are single vertices (example 2). Note how many isolated vertices a sparse random graph has.
- **One long path** — a recursive DFS goes n calls deep; use an explicit stack, BFS or Union-Find (all three versions in example 1 are recursion-free).

## Common Pitfalls

- **Building the graph from edge endpoints only.** Isolated vertices disappear; size everything by \`n\`.
- **\`new Array(n).fill([])\`.** One shared array for every vertex; the count comes out as 1.
- **Recursive DFS on large inputs.** Deep recursion throws \`RangeError\`; use an explicit stack, BFS or Union-Find.
- **\`Math.max(...bigArray)\`.** Spreading a very large array can throw \`RangeError\`; use a loop or \`reduce\`.
- **\`queue.shift()\` in BFS.** It may move every element on each call; keep a head index.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">Each unvisited vertex starts a new component; a DFS or BFS from it marks the whole component, so the number of starts is the answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Setup:</strong> <span style="color:#f0e2c8;">Adjacency list from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from({ length: n }, () =&gt; [])</code> with both directions, so isolated vertices and either edge direction are handled.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Alternative:</strong> <span style="color:#f0e2c8;">Union-Find: start with n groups, subtract one for every edge whose ends have different roots; duplicates and cycles are skipped.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Traversal O(V + E) time and space; Union-Find O(E · α(V)) time and O(V) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Explicit array stack (no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>), a head index instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code> for BFS, and typed arrays for big inputs.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the components themselves?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Label each vertex with a component id during the traversal, then group by label (example 2), or group vertices by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find(v)</code> with Union-Find.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if edges keep arriving and you must report the count after each?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Union-Find: each new edge is one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">union</code>, and the count drops by one only when it merges two groups. A traversal would have to rerun.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you check whether the graph is a valid tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exactly n − 1 edges and one component; with Union-Find, fail immediately if an edge joins two vertices that already share a root.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Int32Array</code> for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">parent</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">comp</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fixed-size, compact 32-bit integers with fast indexing; for 100,000 vertices that is 400 KB per array, with no per-element overhead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for a directed graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Treat edges as undirected for weakly connected components; strongly connected components need Kosaraju or Tarjan.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Connected component** | Maximal set of mutually reachable vertices |
| **Isolated vertex** | A vertex with no edges; a component of size 1 |
| **components = n − successful unions** | Each real merge removes exactly one group |
| **Spanning forest** | The n − components edges that discovered or merged; all others close cycles |
| **Path halving** | In \`find\`, point nodes at their grandparents to flatten the tree |

---
**Conclusion:** In JavaScript, counting connected components is one loop over all n vertices: every unvisited vertex adds one to the count and an explicit-stack DFS (or head-index BFS) marks its whole component — O(V + E). Union-Find gets the same answer straight from the edge array as n minus the successful unions, in O(V) extra space with typed arrays. Size everything by \`n\`, avoid \`fill([])\`, and keep recursion and huge spreads out of the hot path.`,
        examples: [
          {
            label: "Count components three ways: DFS, BFS, Union-Find",
            code: `function build(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    adj[u].push(v);
    adj[v].push(u);            // undirected: store both directions
  }
  return adj;
}

function countDfs(n, edges) {
  // Start a DFS from every node not yet seen; each start is one component.
  const adj = build(n, edges), seen = new Array(n).fill(false);
  let count = 0;
  for (let s = 0; s < n; s++) {
    if (seen[s]) continue;
    count++;
    seen[s] = true;
    const stack = [s];
    while (stack.length > 0) {
      const u = stack.pop();
      for (const v of adj[u]) {
        if (!seen[v]) {
          seen[v] = true;
          stack.push(v);
        }
      }
    }
  }
  return count;
}

function countBfs(n, edges) {
  const adj = build(n, edges), seen = new Array(n).fill(false);
  let count = 0;
  for (let s = 0; s < n; s++) {
    if (seen[s]) continue;
    count++;
    seen[s] = true;
    const queue = [s];
    for (let head = 0; head < queue.length; head++) {   // head index instead of shift()
      for (const v of adj[queue[head]]) {
        if (!seen[v]) {
          seen[v] = true;
          queue.push(v);
        }
      }
    }
  }
  return count;
}

function countUnionFind(n, edges) {
  // Start with n singletons; every edge that joins two different groups removes one.
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];   // path halving
      x = parent[x];
    }
    return x;
  };
  let components = n;
  for (const [u, v] of edges) {
    const ru = find(u), rv = find(v);
    if (ru !== rv) {
      parent[ru] = rv;
      components--;
    }
  }
  return components;
}

const fmtEdges = (edges) => "[" + edges.map(([u, v]) => "[" + u + ", " + v + "]").join(", ") + "]";

const tests = [
  [5, [[0, 1], [1, 2], [3, 4]]],
  [5, [[0, 1], [1, 2], [2, 3], [3, 4]]],
  [4, []],
  [1, []],
  [4, [[0, 1], [1, 0], [2, 2]]],           // duplicate edge and a self-loop
  [6, [[0, 1], [1, 2], [2, 0], [3, 4]]],   // a cycle does not change the count
];
for (const [n, edges] of tests) {
  console.log("n=" + n + " edges=" + fmtEdges(edges) + ": dfs " + countDfs(n, edges) +
    ", bfs " + countBfs(n, edges) + ", union-find " + countUnionFind(n, edges));
}`,
          },
          {
            label: "Label the components, and a 100,000-vertex random graph",
            code: `function labelComponents(n, edges) {
  // comp[v] = id of the component containing v (ids 0, 1, 2, ... in discovery order).
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    adj[u].push(v);
    adj[v].push(u);
  }
  const comp = new Int32Array(n).fill(-1);
  let nextId = 0;
  for (let s = 0; s < n; s++) {
    if (comp[s] !== -1) continue;
    comp[s] = nextId;
    const stack = [s];
    while (stack.length > 0) {
      const u = stack.pop();
      for (const v of adj[u]) {
        if (comp[v] === -1) {
          comp[v] = nextId;
          stack.push(v);
        }
      }
    }
    nextId++;
  }
  return [comp, nextId];
}

function unionFindCount(n, edges) {
  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const size = new Int32Array(n).fill(1);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  let unions = 0;
  for (const [u, v] of edges) {
    let a = find(u), b = find(v);
    if (a !== b) {
      if (size[a] < size[b]) [a, b] = [b, a];
      parent[b] = a;                       // union by size keeps trees shallow
      size[a] += size[b];
      unions++;
    }
  }
  return [n - unions, unions];
}

const fmt = (xs) => "[" + xs.join(", ") + "]";

const edges = [[0, 1], [2, 3], [3, 4], [6, 7], [7, 6]];
let [comp, k] = labelComponents(8, edges);
const groups = Array.from({ length: k }, () => []);
for (let v = 0; v < 8; v++) groups[comp[v]].push(v);   // nodes visited in order, so each group is sorted
console.log("n=8 has " + k + " components:");
for (const g of groups) console.log("  " + fmt(g));
console.log("same component? 2 and 4: " + (comp[2] === comp[4]) + ", 1 and 5: " + (comp[1] === comp[5]));

const N = 100000, M = 60000;
let seed = 2024;
const big = [];
for (let i = 0; i < M; i++) {
  seed = (seed * 48271) % 2147483647;
  const u = seed % N;
  seed = (seed * 48271) % 2147483647;
  big.push([u, seed % N]);
}
[comp, k] = labelComponents(N, big);
const sizes = new Array(k).fill(0);
for (const c of comp) sizes[c]++;
const [uf, unions] = unionFindCount(N, big);
let largest = 0, singles = 0;
for (const s of sizes) {
  largest = Math.max(largest, s);   // a loop, not Math.max(...sizes): spreading a huge array throws RangeError
  if (s === 1) singles++;
}
console.log("random graph n=" + N + ", m=" + M + ":");
console.log("  DFS components:        " + k);
console.log("  union-find components: " + uf + " (= " + N + " - " + unions + " successful unions)");
console.log("  largest component: " + largest + " nodes, single-node components: " + singles);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given n nodes labelled 0 to n − 1 and an int[][] of undirected edges. Write a Java method that returns the number of connected components."

**What a strong answer should cover:**
- Build an adjacency list sized by n (so isolated nodes are not lost), then start a DFS/BFS from every unvisited node; the number of starts is the answer.
- The Union-Find alternative: components = n − successful unions; duplicates, self-loops and cycle edges are skipped automatically.
- O(V + E) time for traversal; O(E · α(V)) for Union-Find, with O(V) space and no adjacency list.
- Edge cases: no edges, isolated nodes, duplicate edges, self-loops.
- Java details: \`List<List<Integer>>\` built in a loop (boxing cost), \`ArrayDeque\` as stack or queue, \`StackOverflowError\` from deep recursion, and \`int[]\`-based Union-Find (or a CSR adjacency) for large inputs.

**Clarifying questions expected:**
- Is n given separately (can there be nodes with no edges)?
- Can edges repeat or be self-loops?
- Do you need the components themselves or just the count?

**Code / implementation expected:** Yes — a traversal-based count and/or a Union-Find count, in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an adjacency list is and roughly how BFS or DFS work  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A new school has 8 students and a list of who already knows whom: 0 knows 1, 2 knows 3, 3 knows 4, 6 knows 7. The head teacher wants to send one invitation to each friend group and let the news spread by word of mouth inside the group. How many invitations does she need?

She could do it like this: pick any student who has not been reached yet, send them an invitation, and let the news travel friend to friend until it stops. Count one invitation. Repeat until everyone has heard. For our list she sends four invitations — to the groups {0, 1}, {2, 3, 4}, {5} and {6, 7}. Student 5 knows nobody, so 5 is a group of one and still needs an invitation.

Each group is a **connected component**, and "send an invitation, let it spread, repeat" is the entire algorithm. It shows up everywhere: friend circles, networks of computers that can talk to each other, provinces of connected cities, pixels in an image, and — when the graph is a grid — [islands on a map](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are vertices numbered 0 to n − 1, and is n given separately from the edges? | Isolated vertices appear in no edge; if you only look at the edge list you will miss them (n = 4 with no edges has 4 components). |
| Can there be duplicate edges or self-loops? | Both are harmless if handled: a visited check or a "same root" check simply ignores them (example 1 includes both). |
| Is the graph really undirected? | For a directed graph, "connected" splits into weakly and strongly connected; strongly connected components need a different algorithm. |
| Do you want the count, or the groups themselves? | Returning groups means labelling each vertex with a component id (example 2). |
| Is the edge list fixed, or do edges keep arriving? | Arriving edges favour Union-Find, which updates the count in near-constant time per edge. |
| How large are n and the number of edges? | Up to 10^5 vertices makes recursion depth a concern; an iterative stack, BFS or Union-Find avoids it. |

## 3. The Core Idea

📌 **Interview term: Connected component** — a maximal set of vertices in which every vertex can reach every other along edges. "Maximal" means you cannot add another vertex and keep that property.

📌 **Interview term: Isolated vertex** — a vertex with no edges. It is a connected component of size 1 on its own.

**Approach 1 — traverse and count starts.** Loop over every vertex. If it has not been visited, it belongs to a component nobody has explored yet: add 1 to the count and run a DFS or BFS from it that marks everything it can reach (see [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs)). When the loop ends, the count is the number of components. Every vertex is marked exactly once, so the loop never counts a component twice.

**Approach 2 — Union-Find.** Start with n groups, one per vertex. For each edge (u, v), find the group of u and the group of v. If they are different, merge them: two components became one, so the count drops by 1. If they are the same, the edge connects vertices that were already connected (a duplicate, a self-loop, or an edge that closes a cycle) and nothing changes. When all edges are processed, the count is the answer. The structure itself is explained on [the Union-Find page](/interview-question/what-is-the-union-find-disjoint-set-data-structure).

📌 **Interview term: components = n − successful unions** — every union that merges two different groups reduces the number of groups by exactly one, so the final count is n minus the number of edges that actually merged something.

📌 **Interview term: Spanning forest** — the edges that DFS/BFS used to discover new vertices, or that Union-Find successfully merged with. It has exactly n − (number of components) edges; every other edge closes a cycle.

Here is the graph from the story (example 2 builds it):

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="Eight vertices in four connected components: 0 and 1; 2, 3 and 4; 5 alone; 6 and 7">
  <rect class="d-box-muted" x="20" y="50" width="140" height="110" rx="12"/>
  <rect class="d-box-muted" x="180" y="50" width="210" height="110" rx="12"/>
  <rect class="d-box-muted" x="410" y="50" width="80" height="110" rx="12"/>
  <rect class="d-box-muted" x="510" y="50" width="150" height="110" rx="12"/>
  <text class="d-sub" x="90" y="35" text-anchor="middle">component 0</text>
  <text class="d-sub" x="285" y="35" text-anchor="middle">component 1</text>
  <text class="d-sub" x="450" y="35" text-anchor="middle">component 2</text>
  <text class="d-sub" x="585" y="35" text-anchor="middle">component 3</text>
  <path class="d-edge-accent" d="M 55 105 L 125 105"/>
  <path class="d-edge-accent" d="M 215 105 L 285 105"/>
  <path class="d-edge-accent" d="M 285 105 L 355 105"/>
  <path class="d-edge-accent" d="M 550 105 L 620 105"/>
  <circle class="d-box-accent" cx="55" cy="105" r="20"/>
  <text class="d-text" x="55" y="110" text-anchor="middle">0</text>
  <circle class="d-box-accent" cx="125" cy="105" r="20"/>
  <text class="d-text" x="125" y="110" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="215" cy="105" r="20"/>
  <text class="d-text" x="215" y="110" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="285" cy="105" r="20"/>
  <text class="d-text" x="285" y="110" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="355" cy="105" r="20"/>
  <text class="d-text" x="355" y="110" text-anchor="middle">4</text>
  <circle class="d-box" cx="450" cy="105" r="20"/>
  <text class="d-text" x="450" y="110" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="550" cy="105" r="20"/>
  <text class="d-text" x="550" y="110" text-anchor="middle">6</text>
  <circle class="d-box-accent" cx="620" cy="105" r="20"/>
  <text class="d-text" x="620" y="110" text-anchor="middle">7</text>
  <text class="d-sub" x="90" y="190" text-anchor="middle">size 2</text>
  <text class="d-sub" x="285" y="190" text-anchor="middle">size 3</text>
  <text class="d-sub" x="450" y="190" text-anchor="middle">size 1</text>
  <text class="d-sub" x="585" y="190" text-anchor="middle">size 2</text>
</svg>

Vertex 5 appears in no edge but is still a component. The edge list also contains both (6, 7) and (7, 6); in an undirected graph that is the same connection, so it does not change anything.

And here is the single decision Union-Find makes for every edge:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="For each edge, if both ends already have the same root skip it, otherwise merge the two groups and subtract one from the count">
  <defs>
    <marker id="b21q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="90" text-anchor="middle">edge (u, v)</text>
  <text class="d-sub" x="95" y="112" text-anchor="middle">one at a time</text>
  <path class="d-edge" d="M 172 95 L 238 95" marker-end="url(#b21q5-arrow)"/>
  <rect class="d-box-muted" x="242" y="60" width="170" height="70" rx="10"/>
  <text class="d-text" x="327" y="90" text-anchor="middle">same root?</text>
  <text class="d-sub" x="327" y="112" text-anchor="middle">find(u) vs find(v)</text>
  <path class="d-edge" d="M 414 80 L 470 40" marker-end="url(#b21q5-arrow)"/>
  <path class="d-edge" d="M 414 110 L 470 150" marker-end="url(#b21q5-arrow)"/>
  <text class="d-sub" x="436" y="48" text-anchor="middle">yes</text>
  <text class="d-sub" x="436" y="150" text-anchor="middle">no</text>
  <rect class="d-box-muted" x="474" y="14" width="210" height="56" rx="10"/>
  <text class="d-text" x="579" y="38" text-anchor="middle">skip the edge</text>
  <text class="d-sub" x="579" y="58" text-anchor="middle">duplicate, loop or cycle</text>
  <rect class="d-box-accent" x="474" y="122" width="210" height="56" rx="10"/>
  <text class="d-text" x="579" y="146" text-anchor="middle">merge, count - 1</text>
  <text class="d-sub" x="579" y="166" text-anchor="middle">two groups become one</text>
</svg>

On the story graph: start with 8 groups; (0, 1) merges → 7; (2, 3) → 6; (3, 4) → 5; (6, 7) → 4; (7, 6) finds the same root for both ends → skipped. Answer: 4.

## 4. The Code in Java

Approach 1, an iterative DFS that counts how many times it has to start a new search:

~~~java
// Start a DFS from every node not yet seen; each start is one component.
static int countDfs(int n, int[][] edges) {
    List<List<Integer>> adj = build(n, edges);
    boolean[] seen = new boolean[n];
    Deque<Integer> stack = new ArrayDeque<>();
    int count = 0;
    for (int s = 0; s < n; s++) {
        if (seen[s]) continue;
        count++;
        seen[s] = true;
        stack.push(s);
        while (!stack.isEmpty()) {
            int u = stack.pop();
            for (int v : adj.get(u)) {
                if (!seen[v]) {
                    seen[v] = true;
                    stack.push(v);
                }
            }
        }
    }
    return count;
}
~~~

Approach 2, Union-Find, which never builds an adjacency list:

~~~java
static int find(int[] parent, int x) {
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];   // path halving
        x = parent[x];
    }
    return x;
}

// Start with n singletons; every edge that joins two different groups removes one.
static int countUnionFind(int n, int[][] edges) {
    int[] parent = new int[n];
    for (int i = 0; i < n; i++) parent[i] = i;
    int components = n;
    for (int[] e : edges) {
        int ru = find(parent, e[0]), rv = find(parent, e[1]);
        if (ru != rv) {
            parent[ru] = rv;
            components--;
        }
    }
    return components;
}
~~~

**What to point out in this code:**

- \`build\` (in the full example) adds \`n\` empty \`ArrayList\`s first — \`new ArrayList<>(n)\` only sets a capacity — so isolated vertices still have a list. It adds both directions because the graph is undirected.
- \`seen[v] = true\` happens when \`v\` is **pushed**, so no vertex is on the stack twice and each component is counted exactly once. A \`boolean[]\` avoids boxing every id into a \`Set<Integer>\`.
- One \`ArrayDeque<Integer>\` is reused for every start; \`countBfs\` in example 1 is the same loop with \`offer\`/\`poll\`.
- No recursion, so a 100,000-vertex path is fine; a recursive DFS overflowed the default Java stack at about 10,000 levels in our run.
- \`find\` is a static method with a loop and path halving over a plain \`int[]\`. This short version links \`parent[ru] = rv\` without union by size; example 2 adds union by size for the large graph.
- Self-loop \`{2, 2}\` and duplicate \`{1, 0}\`: both ends already share a root, so they are skipped.

📌 **Interview term: Path halving** — during \`find\`, point every other node on the path at its grandparent; it keeps Union-Find trees flat with a two-line loop.

## 5. Getting the Components, Not Just the Count

Example 2 labels each vertex with the id of its component (\`comp[v]\`, \`-1\` until visited), then groups vertices by label. Because the outer loop visits vertices in order, each group comes out already sorted, and \`List.toString()\` prints it as \`[2, 3, 4]\`. Two vertices are in the same component exactly when \`comp[a] == comp[b]\`.

For the large graph (100,000 vertices, 60,000 edges) example 2 does not use \`List<List<Integer>>\` at all. It builds a **CSR** adjacency: count each vertex's degree, turn the counts into start offsets with a prefix sum, then write every neighbour into one big \`int[]\`. The neighbours of \`u\` are \`nbr[deg[u]]\` … \`nbr[deg[u + 1] - 1]\`. That is two primitive arrays instead of 100,000 \`ArrayList\` objects and 120,000 boxed \`Integer\`s, and the DFS stack is an \`int[]\` of size n with a \`top\` index — safe because each vertex is pushed at most once.

📌 **Interview term: CSR (compressed sparse row)** — an adjacency layout with one array of all neighbours and one array of offsets, so the neighbours of u are a contiguous slice. Compact and cache-friendly.

The example then checks that DFS and Union-Find agree on that graph and that the Union-Find count equals n minus the number of successful unions.

## 6. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21; the code only uses Java 17 features). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. The random graph in example 2 comes from a small deterministic generator (MINSTD), so every language builds exactly the same 60,000 edges.

**Example 1 — DFS, BFS and Union-Find on six graphs** prints:

~~~text
n=5 edges=[[0, 1], [1, 2], [3, 4]]: dfs 2, bfs 2, union-find 2
n=5 edges=[[0, 1], [1, 2], [2, 3], [3, 4]]: dfs 1, bfs 1, union-find 1
n=4 edges=[]: dfs 4, bfs 4, union-find 4
n=1 edges=[]: dfs 1, bfs 1, union-find 1
n=4 edges=[[0, 1], [1, 0], [2, 2]]: dfs 3, bfs 3, union-find 3
n=6 edges=[[0, 1], [1, 2], [2, 0], [3, 4]]: dfs 3, bfs 3, union-find 3
~~~

**Example 2 — labelling components, and a 100,000-vertex random graph** prints:

~~~text
n=8 has 4 components:
  [0, 1]
  [2, 3, 4]
  [5]
  [6, 7]
same component? 2 and 4: true, 1 and 5: false
random graph n=100000, m=60000:
  DFS components:        40394
  union-find components: 40394 (= 100000 - 59606 successful unions)
  largest component: 31118 nodes, single-node components: 30139
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Iterative DFS (\`ArrayDeque\`) | O(V + E) | O(V + E) | adjacency lists hold 2E boxed entries; each vertex pushed once |
| BFS (\`ArrayDeque\`) | O(V + E) | O(V + E) | same marks; queue instead of stack |
| DFS on a CSR layout | O(V + E) | O(V + E) ints | two primitive arrays, no boxing (example 2) |
| Union-Find | O(V + E · α(V)) | O(V) | \`int[] parent\` (and \`size\`) only; no adjacency list |
| Recursive DFS | O(V + E) | O(V) stack frames | overflowed at about 10,000 levels with the default stack |

## 8. Choosing Between DFS, BFS and Union-Find

| | DFS / BFS | Union-Find |
| :--- | :--- | :--- |
| Needs an adjacency list? | yes — O(V + E) to build | no — works straight from the edge list |
| Time | O(V + E) | O(V + E · α(V)), effectively linear |
| Extra space | O(V + E) (adjacency + visited + stack/queue) | O(V) (parent + size) |
| Gives the members of each component? | yes, by labelling during the traversal | yes, group vertices by \`find(v)\` |
| Edges keep arriving | re-run, O(V + E) each time | O(α) per new edge |
| Also detects | distances (BFS), cycles | "this edge closes a cycle" (union returns false) |

Both are correct for the count. Reach for **DFS/BFS** when you already have (or need) an adjacency list or you want distances and paths; reach for **Union-Find** when edges stream in, when the input is just an edge list, or when you want the smallest memory footprint. The grid version of the same trade-off is worked through in [islands with DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).

**Follow-ups you may get:**

- **"Is this graph a valid tree?"** — a tree on n vertices has exactly n − 1 edges and exactly 1 component. Union-Find answers it in one pass: fail as soon as an edge's ends already share a root (cycle), and check the count is 1 at the end.
- **"Number of provinces"** — the same problem with an n × n adjacency matrix as input; loop over the matrix instead of an edge list (see [graph representations](/interview-question/what-is-a-graph-and-how-do-you-represent-it)).
- **Directed graphs** — "connected" splits into weakly connected (ignore direction and count as above) and strongly connected, which needs Kosaraju or Tarjan: [strongly connected components](/interview-question/how-do-you-find-strongly-connected-components-in-a-directed-graph).
- **Related traversals:** [bipartite check](/interview-question/how-do-you-check-if-a-graph-is-bipartite) (BFS colouring per component) and [cloning a graph](/interview-question/how-do-you-clone-a-graph) (traversal with a copy map).

## 9. Edge Cases

- **No edges** — n components (example 1: n = 4 → 4; n = 1 → 1).
- **Isolated vertices** — counted because the outer loop runs over all n vertices, not over edge endpoints (vertex 5 in example 2).
- **Duplicate edges and self-loops** — \`(0, 1), (1, 0), (2, 2)\` gives 3 components for n = 4 in every method (example 1).
- **Cycles** — the triangle 0–1–2 plus edge 3–4 with n = 6 gives 3 components; the cycle edge is just skipped.
- **Huge, sparse graphs** — on 100,000 vertices and 60,000 random edges, DFS and Union-Find both find 40,394 components, of which 30,139 are single vertices (example 2). Note how many isolated vertices a sparse random graph has.
- **One long path** — a recursive DFS goes n calls deep; use an explicit stack, BFS or Union-Find (all three versions in example 1 are recursion-free).

## Common Pitfalls

- **Assuming \`new ArrayList<>(n)\` creates n lists.** It is an empty list with capacity n; add the inner lists in a loop.
- **Building the graph from edge endpoints only.** Isolated vertices disappear; size everything by \`n\`.
- **Recursive DFS on large inputs.** \`StackOverflowError\` at around 10,000 levels with the default stack; use \`ArrayDeque\`, BFS or Union-Find.
- **\`Set<Integer>\` for visited and \`Map<Integer, Integer>\` for parents.** Boxing and hashing for no benefit when ids are 0..n−1; use \`boolean[]\` and \`int[]\`.
- **Mixing \`push\` with \`poll\` on the same \`ArrayDeque\`.** That takes from opposite ends; pick \`push\`/\`pop\` (stack) or \`offer\`/\`poll\` (queue).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">Each unvisited vertex starts a new component; a DFS or BFS from it marks the whole component, so the number of starts is the answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Setup:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List&lt;List&lt;Integer&gt;&gt;</code> with n inner <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList</code>s and both directions, so isolated vertices and either edge direction are handled.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Alternative:</strong> <span style="color:#f0e2c8;">Union-Find on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[] parent</code>: start with n groups, subtract one for every edge whose ends have different roots.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Traversal O(V + E) time and space; Union-Find O(E · α(V)) time and O(V) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> instead of recursion (no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[]</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> instead of boxed collections.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the components themselves?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Label each vertex with a component id during the traversal, then group by label (example 2), or group vertices by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find(v)</code> with Union-Find.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if edges keep arriving and you must report the count after each?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Union-Find: each new edge is one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">union</code>, and the count drops by one only when it merges two groups. A traversal would have to rerun.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you check whether the graph is a valid tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exactly n − 1 edges and one component; with Union-Find, fail immediately if an edge joins two vertices that already share a root.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The graph has 10 million edges. What changes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Avoid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List&lt;List&lt;Integer&gt;&gt;</code> and its boxing: use Union-Find directly on the edge array, or a CSR layout of two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>s for a traversal.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for a directed graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Treat edges as undirected for weakly connected components; strongly connected components need Kosaraju or Tarjan.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Connected component** | Maximal set of mutually reachable vertices |
| **Isolated vertex** | A vertex with no edges; a component of size 1 |
| **components = n − successful unions** | Each real merge removes exactly one group |
| **Spanning forest** | The n − components edges that discovered or merged; all others close cycles |
| **Path halving** | In \`find\`, point nodes at their grandparents to flatten the tree |
| **CSR (compressed sparse row)** | Adjacency stored as one \`int[]\` of neighbours plus one \`int[]\` of start offsets per vertex |

---
**Conclusion:** In Java, counting connected components is one loop over all n vertices: every unvisited vertex adds one to the count and an \`ArrayDeque\`-based DFS or BFS marks its whole component — O(V + E). Union-Find on an \`int[]\` gets the same answer straight from the edge array as n minus the successful unions, in O(V) space. Create the n inner lists explicitly, keep visited flags in a \`boolean[]\`, avoid recursion, and switch to primitive arrays (Union-Find or CSR) when the graph is large.`,
        examples: [
          {
            label: "Count components three ways: DFS, BFS, Union-Find",
            code: `import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

public class Main {
    static List<List<Integer>> build(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>(n);
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);   // undirected: store both directions
        }
        return adj;
    }

    // Start a DFS from every node not yet seen; each start is one component.
    static int countDfs(int n, int[][] edges) {
        List<List<Integer>> adj = build(n, edges);
        boolean[] seen = new boolean[n];
        Deque<Integer> stack = new ArrayDeque<>();
        int count = 0;
        for (int s = 0; s < n; s++) {
            if (seen[s]) continue;
            count++;
            seen[s] = true;
            stack.push(s);
            while (!stack.isEmpty()) {
                int u = stack.pop();
                for (int v : adj.get(u)) {
                    if (!seen[v]) {
                        seen[v] = true;
                        stack.push(v);
                    }
                }
            }
        }
        return count;
    }

    static int countBfs(int n, int[][] edges) {
        List<List<Integer>> adj = build(n, edges);
        boolean[] seen = new boolean[n];
        Deque<Integer> queue = new ArrayDeque<>();
        int count = 0;
        for (int s = 0; s < n; s++) {
            if (seen[s]) continue;
            count++;
            seen[s] = true;
            queue.offer(s);
            while (!queue.isEmpty()) {
                int u = queue.poll();
                for (int v : adj.get(u)) {
                    if (!seen[v]) {
                        seen[v] = true;
                        queue.offer(v);
                    }
                }
            }
        }
        return count;
    }

    static int find(int[] parent, int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];   // path halving
            x = parent[x];
        }
        return x;
    }

    // Start with n singletons; every edge that joins two different groups removes one.
    static int countUnionFind(int n, int[][] edges) {
        int[] parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        int components = n;
        for (int[] e : edges) {
            int ru = find(parent, e[0]), rv = find(parent, e[1]);
            if (ru != rv) {
                parent[ru] = rv;
                components--;
            }
        }
        return components;
    }

    static String fmtEdges(int[][] edges) {
        List<String> parts = new ArrayList<>();
        for (int[] e : edges) parts.add("[" + e[0] + ", " + e[1] + "]");
        return "[" + String.join(", ", parts) + "]";
    }

    public static void main(String[] args) {
        int[] ns = {5, 5, 4, 1, 4, 6};
        int[][][] tests = {
            {{0, 1}, {1, 2}, {3, 4}},
            {{0, 1}, {1, 2}, {2, 3}, {3, 4}},
            {},
            {},
            {{0, 1}, {1, 0}, {2, 2}},           // duplicate edge and a self-loop
            {{0, 1}, {1, 2}, {2, 0}, {3, 4}},   // a cycle does not change the count
        };
        for (int i = 0; i < ns.length; i++) {
            int n = ns[i];
            int[][] edges = tests[i];
            System.out.println("n=" + n + " edges=" + fmtEdges(edges) + ": dfs " + countDfs(n, edges)
                    + ", bfs " + countBfs(n, edges) + ", union-find " + countUnionFind(n, edges));
        }
    }
}`,
          },
          {
            label: "Label the components, and a 100,000-vertex random graph",
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Main {
    // Returns comp[] where comp[v] = component id of v (0, 1, 2, ... in discovery order).
    // Uses a compact adjacency layout (CSR: two int arrays) to avoid boxing 120,000 Integers.
    static int[] labelComponents(int n, int[][] edges) {
        int[] deg = new int[n + 1];
        for (int[] e : edges) { deg[e[0] + 1]++; deg[e[1] + 1]++; }
        for (int i = 0; i < n; i++) deg[i + 1] += deg[i];          // prefix sums = start offsets
        int[] nbr = new int[2 * edges.length], fill = Arrays.copyOf(deg, n + 1);
        for (int[] e : edges) { nbr[fill[e[0]]++] = e[1]; nbr[fill[e[1]]++] = e[0]; }

        int[] comp = new int[n];
        Arrays.fill(comp, -1);
        int[] stack = new int[n];
        int nextId = 0;
        for (int s = 0; s < n; s++) {
            if (comp[s] != -1) continue;
            comp[s] = nextId;
            int top = 0;
            stack[top++] = s;
            while (top > 0) {
                int u = stack[--top];
                for (int i = deg[u]; i < deg[u + 1]; i++) {
                    int v = nbr[i];
                    if (comp[v] == -1) {
                        comp[v] = nextId;
                        stack[top++] = v;                         // each node is pushed once, so n slots suffice
                    }
                }
            }
            nextId++;
        }
        return comp;
    }

    static int find(int[] parent, int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }

    // Returns {components, successful unions}.
    static int[] unionFindCount(int n, int[][] edges) {
        int[] parent = new int[n], size = new int[n];
        for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
        int unions = 0;
        for (int[] e : edges) {
            int a = find(parent, e[0]), b = find(parent, e[1]);
            if (a != b) {
                if (size[a] < size[b]) { int t = a; a = b; b = t; }
                parent[b] = a;                                    // union by size keeps trees shallow
                size[a] += size[b];
                unions++;
            }
        }
        return new int[]{n - unions, unions};
    }

    public static void main(String[] args) {
        int[][] edges = {{0, 1}, {2, 3}, {3, 4}, {6, 7}, {7, 6}};
        int[] comp = labelComponents(8, edges);
        int k = Arrays.stream(comp).max().getAsInt() + 1;
        List<List<Integer>> groups = new ArrayList<>();
        for (int i = 0; i < k; i++) groups.add(new ArrayList<>());
        for (int v = 0; v < 8; v++) groups.get(comp[v]).add(v);   // nodes visited in order: groups are sorted
        System.out.println("n=8 has " + k + " components:");
        for (List<Integer> g : groups) System.out.println("  " + g);
        System.out.println("same component? 2 and 4: " + (comp[2] == comp[4]) + ", 1 and 5: " + (comp[1] == comp[5]));

        int N = 100000, M = 60000;
        long seed = 2024;
        int[][] big = new int[M][];
        for (int i = 0; i < M; i++) {
            seed = seed * 48271 % 2147483647;
            int u = (int) (seed % N);
            seed = seed * 48271 % 2147483647;
            big[i] = new int[]{u, (int) (seed % N)};
        }
        comp = labelComponents(N, big);
        k = Arrays.stream(comp).max().getAsInt() + 1;
        int[] sizes = new int[k];
        for (int c : comp) sizes[c]++;
        int[] uf = unionFindCount(N, big);
        int largest = 0, singles = 0;
        for (int s : sizes) { largest = Math.max(largest, s); if (s == 1) singles++; }
        System.out.println("random graph n=" + N + ", m=" + M + ":");
        System.out.println("  DFS components:        " + k);
        System.out.println("  union-find components: " + uf[0] + " (= " + N + " - " + uf[1] + " successful unions)");
        System.out.println("  largest component: " + largest + " nodes, single-node components: " + singles);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given n nodes labelled 0 to n − 1 and a list of undirected edges. Write a C++ function that returns the number of connected components."

**What a strong answer should cover:**
- Build an adjacency list sized by n (so isolated nodes are not lost), then start a DFS/BFS from every unvisited node; the number of starts is the answer.
- The Union-Find alternative: components = n − successful unions; duplicates, self-loops and cycle edges are skipped automatically.
- O(V + E) time for traversal; O(E · α(V)) for Union-Find, with O(V) space and no adjacency list.
- Edge cases: no edges, isolated nodes, duplicate edges, self-loops.
- C++ details: \`std::vector<std::vector<int>> adj(n)\`, a \`std::vector\` as the stack (deep recursion segfaults), \`std::iota\` for parents, passing the edge list by \`const&\`, and 64-bit arithmetic where products overflow.

**Clarifying questions expected:**
- Is n given separately (can there be nodes with no edges)?
- Can edges repeat or be self-loops?
- Do you need the components themselves or just the count?

**Code / implementation expected:** Yes — a traversal-based count and/or a Union-Find count, in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an adjacency list is and roughly how BFS or DFS work  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A new school has 8 students and a list of who already knows whom: 0 knows 1, 2 knows 3, 3 knows 4, 6 knows 7. The head teacher wants to send one invitation to each friend group and let the news spread by word of mouth inside the group. How many invitations does she need?

She could do it like this: pick any student who has not been reached yet, send them an invitation, and let the news travel friend to friend until it stops. Count one invitation. Repeat until everyone has heard. For our list she sends four invitations — to the groups {0, 1}, {2, 3, 4}, {5} and {6, 7}. Student 5 knows nobody, so 5 is a group of one and still needs an invitation.

Each group is a **connected component**, and "send an invitation, let it spread, repeat" is the entire algorithm. It shows up everywhere: friend circles, networks of computers that can talk to each other, provinces of connected cities, pixels in an image, and — when the graph is a grid — [islands on a map](/interview-question/how-do-you-count-the-number-of-islands-in-a-grid).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are vertices numbered 0 to n − 1, and is n given separately from the edges? | Isolated vertices appear in no edge; if you only look at the edge list you will miss them (n = 4 with no edges has 4 components). |
| Can there be duplicate edges or self-loops? | Both are harmless if handled: a visited check or a "same root" check simply ignores them (example 1 includes both). |
| Is the graph really undirected? | For a directed graph, "connected" splits into weakly and strongly connected; strongly connected components need a different algorithm. |
| Do you want the count, or the groups themselves? | Returning groups means labelling each vertex with a component id (example 2). |
| Is the edge list fixed, or do edges keep arriving? | Arriving edges favour Union-Find, which updates the count in near-constant time per edge. |
| How large are n and the number of edges? | Up to 10^5 vertices makes recursion depth a concern; an iterative stack, BFS or Union-Find avoids it. |

## 3. The Core Idea

📌 **Interview term: Connected component** — a maximal set of vertices in which every vertex can reach every other along edges. "Maximal" means you cannot add another vertex and keep that property.

📌 **Interview term: Isolated vertex** — a vertex with no edges. It is a connected component of size 1 on its own.

**Approach 1 — traverse and count starts.** Loop over every vertex. If it has not been visited, it belongs to a component nobody has explored yet: add 1 to the count and run a DFS or BFS from it that marks everything it can reach (see [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs)). When the loop ends, the count is the number of components. Every vertex is marked exactly once, so the loop never counts a component twice.

**Approach 2 — Union-Find.** Start with n groups, one per vertex. For each edge (u, v), find the group of u and the group of v. If they are different, merge them: two components became one, so the count drops by 1. If they are the same, the edge connects vertices that were already connected (a duplicate, a self-loop, or an edge that closes a cycle) and nothing changes. When all edges are processed, the count is the answer. The structure itself is explained on [the Union-Find page](/interview-question/what-is-the-union-find-disjoint-set-data-structure).

📌 **Interview term: components = n − successful unions** — every union that merges two different groups reduces the number of groups by exactly one, so the final count is n minus the number of edges that actually merged something.

📌 **Interview term: Spanning forest** — the edges that DFS/BFS used to discover new vertices, or that Union-Find successfully merged with. It has exactly n − (number of components) edges; every other edge closes a cycle.

Here is the graph from the story (example 2 builds it):

<svg class="iq-diagram" width="100%" viewBox="0 0 680 220" role="img" aria-label="Eight vertices in four connected components: 0 and 1; 2, 3 and 4; 5 alone; 6 and 7">
  <rect class="d-box-muted" x="20" y="50" width="140" height="110" rx="12"/>
  <rect class="d-box-muted" x="180" y="50" width="210" height="110" rx="12"/>
  <rect class="d-box-muted" x="410" y="50" width="80" height="110" rx="12"/>
  <rect class="d-box-muted" x="510" y="50" width="150" height="110" rx="12"/>
  <text class="d-sub" x="90" y="35" text-anchor="middle">component 0</text>
  <text class="d-sub" x="285" y="35" text-anchor="middle">component 1</text>
  <text class="d-sub" x="450" y="35" text-anchor="middle">component 2</text>
  <text class="d-sub" x="585" y="35" text-anchor="middle">component 3</text>
  <path class="d-edge-accent" d="M 55 105 L 125 105"/>
  <path class="d-edge-accent" d="M 215 105 L 285 105"/>
  <path class="d-edge-accent" d="M 285 105 L 355 105"/>
  <path class="d-edge-accent" d="M 550 105 L 620 105"/>
  <circle class="d-box-accent" cx="55" cy="105" r="20"/>
  <text class="d-text" x="55" y="110" text-anchor="middle">0</text>
  <circle class="d-box-accent" cx="125" cy="105" r="20"/>
  <text class="d-text" x="125" y="110" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="215" cy="105" r="20"/>
  <text class="d-text" x="215" y="110" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="285" cy="105" r="20"/>
  <text class="d-text" x="285" y="110" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="355" cy="105" r="20"/>
  <text class="d-text" x="355" y="110" text-anchor="middle">4</text>
  <circle class="d-box" cx="450" cy="105" r="20"/>
  <text class="d-text" x="450" y="110" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="550" cy="105" r="20"/>
  <text class="d-text" x="550" y="110" text-anchor="middle">6</text>
  <circle class="d-box-accent" cx="620" cy="105" r="20"/>
  <text class="d-text" x="620" y="110" text-anchor="middle">7</text>
  <text class="d-sub" x="90" y="190" text-anchor="middle">size 2</text>
  <text class="d-sub" x="285" y="190" text-anchor="middle">size 3</text>
  <text class="d-sub" x="450" y="190" text-anchor="middle">size 1</text>
  <text class="d-sub" x="585" y="190" text-anchor="middle">size 2</text>
</svg>

Vertex 5 appears in no edge but is still a component. The edge list also contains both (6, 7) and (7, 6); in an undirected graph that is the same connection, so it does not change anything.

And here is the single decision Union-Find makes for every edge:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 200" role="img" aria-label="For each edge, if both ends already have the same root skip it, otherwise merge the two groups and subtract one from the count">
  <defs>
    <marker id="b21q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="90" text-anchor="middle">edge (u, v)</text>
  <text class="d-sub" x="95" y="112" text-anchor="middle">one at a time</text>
  <path class="d-edge" d="M 172 95 L 238 95" marker-end="url(#b21q5-arrow)"/>
  <rect class="d-box-muted" x="242" y="60" width="170" height="70" rx="10"/>
  <text class="d-text" x="327" y="90" text-anchor="middle">same root?</text>
  <text class="d-sub" x="327" y="112" text-anchor="middle">find(u) vs find(v)</text>
  <path class="d-edge" d="M 414 80 L 470 40" marker-end="url(#b21q5-arrow)"/>
  <path class="d-edge" d="M 414 110 L 470 150" marker-end="url(#b21q5-arrow)"/>
  <text class="d-sub" x="436" y="48" text-anchor="middle">yes</text>
  <text class="d-sub" x="436" y="150" text-anchor="middle">no</text>
  <rect class="d-box-muted" x="474" y="14" width="210" height="56" rx="10"/>
  <text class="d-text" x="579" y="38" text-anchor="middle">skip the edge</text>
  <text class="d-sub" x="579" y="58" text-anchor="middle">duplicate, loop or cycle</text>
  <rect class="d-box-accent" x="474" y="122" width="210" height="56" rx="10"/>
  <text class="d-text" x="579" y="146" text-anchor="middle">merge, count - 1</text>
  <text class="d-sub" x="579" y="166" text-anchor="middle">two groups become one</text>
</svg>

On the story graph: start with 8 groups; (0, 1) merges → 7; (2, 3) → 6; (3, 4) → 5; (6, 7) → 4; (7, 6) finds the same root for both ends → skipped. Answer: 4.

## 4. The Code in C++

Approach 1, an iterative DFS that counts how many times it has to start a new search:

~~~cpp
// Start a DFS from every node not yet seen; each start is one component.
int countDfs(int n, const Edges& edges) {
    Graph adj = build(n, edges);
    std::vector<char> seen(n, 0);
    std::vector<int> stack;
    int count = 0;
    for (int s = 0; s < n; ++s) {
        if (seen[s]) continue;
        ++count;
        seen[s] = 1;
        stack.push_back(s);
        while (!stack.empty()) {
            int u = stack.back();
            stack.pop_back();
            for (int v : adj[u])
                if (!seen[v]) {
                    seen[v] = 1;
                    stack.push_back(v);
                }
        }
    }
    return count;
}
~~~

Approach 2, Union-Find, which never builds an adjacency list:

~~~cpp
int find(std::vector<int>& parent, int x) {
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];   // path halving
        x = parent[x];
    }
    return x;
}

// Start with n singletons; every edge that joins two different groups removes one.
int countUnionFind(int n, const Edges& edges) {
    std::vector<int> parent(n);
    std::iota(parent.begin(), parent.end(), 0);   // 0, 1, 2, ..., n-1
    int components = n;
    for (auto [u, v] : edges) {
        int ru = find(parent, u), rv = find(parent, v);
        if (ru != rv) {
            parent[ru] = rv;
            --components;
        }
    }
    return components;
}
~~~

**What to point out in this code:**

- \`Graph adj(n)\` (in \`build\`) creates n empty vectors from \`n\`, not from the edges, so isolated vertices still exist. Both directions are pushed because the graph is undirected.
- \`seen[v] = 1\` happens when \`v\` is **pushed**, so no vertex is on the stack twice and each component is counted exactly once. \`seen\` is a \`std::vector<char>\` rather than the bit-packed \`std::vector<bool>\`.
- The stack is a \`std::vector<int>\` (\`push_back\`/\`back\`/\`pop_back\`); \`countBfs\` in example 1 is the same loop with \`std::queue\`.
- No recursion, so a 100,000-vertex path is fine; recursive DFS on a path segfaulted at 200,000 levels with the default 8 MB stack in our run.
- \`std::iota\` fills \`parent\` with 0, 1, 2, …; \`find\` is a loop with path halving. This short version links \`parent[ru] = rv\` without union by size; example 2 adds union by size (and writes \`find\` as a lambda capturing \`parent\` by reference).
- Every function takes \`const Edges&\`, so the edge list is never copied.

📌 **Interview term: Path halving** — during \`find\`, point every other node on the path at its grandparent; it keeps Union-Find trees flat with a two-line loop.

## 5. Getting the Components, Not Just the Count

Example 2 labels each vertex with the id of its component (\`comp[v]\`, \`-1\` until visited), then groups vertices by label. Because the outer loop visits vertices in order, each group comes out already sorted. Two vertices are in the same component exactly when \`comp[a] == comp[b]\`. It then runs both methods on a random graph with 100,000 vertices and 60,000 edges — generated with a 64-bit \`std::int64_t\` seed, because \`seed * 48271\` does not fit in 32 bits and signed overflow is undefined behaviour — and checks that the counts agree and that the Union-Find count equals n minus the number of successful unions. \`std::max_element\` and \`std::count\` from \`<algorithm>\` find the largest component and the single-vertex ones.

## 6. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. The random graph in example 2 comes from a small deterministic generator (MINSTD), so every language builds exactly the same 60,000 edges.

**Example 1 — DFS, BFS and Union-Find on six graphs** prints:

~~~text
n=5 edges=[[0, 1], [1, 2], [3, 4]]: dfs 2, bfs 2, union-find 2
n=5 edges=[[0, 1], [1, 2], [2, 3], [3, 4]]: dfs 1, bfs 1, union-find 1
n=4 edges=[]: dfs 4, bfs 4, union-find 4
n=1 edges=[]: dfs 1, bfs 1, union-find 1
n=4 edges=[[0, 1], [1, 0], [2, 2]]: dfs 3, bfs 3, union-find 3
n=6 edges=[[0, 1], [1, 2], [2, 0], [3, 4]]: dfs 3, bfs 3, union-find 3
~~~

**Example 2 — labelling components, and a 100,000-vertex random graph** prints:

~~~text
n=8 has 4 components:
  [0, 1]
  [2, 3, 4]
  [5]
  [6, 7]
same component? 2 and 4: true, 1 and 5: false
random graph n=100000, m=60000:
  DFS components:        40394
  union-find components: 40394 (= 100000 - 59606 successful unions)
  largest component: 31118 nodes, single-node components: 30139
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Iterative DFS (\`std::vector\` stack) | O(V + E) | O(V + E) | adjacency lists hold 2E ints; each vertex pushed once |
| BFS (\`std::queue\`) | O(V + E) | O(V + E) | same marks; queue instead of stack |
| Union-Find | O(V + E · α(V)) | O(V) | \`std::vector<int>\` parent (and size) only; no adjacency list |
| Recursive DFS | O(V + E) | O(V) stack frames | segfaulted on a 200,000-vertex path with an 8 MB stack |

## 8. Choosing Between DFS, BFS and Union-Find

| | DFS / BFS | Union-Find |
| :--- | :--- | :--- |
| Needs an adjacency list? | yes — O(V + E) to build | no — works straight from the edge list |
| Time | O(V + E) | O(V + E · α(V)), effectively linear |
| Extra space | O(V + E) (adjacency + visited + stack/queue) | O(V) (parent + size) |
| Gives the members of each component? | yes, by labelling during the traversal | yes, group vertices by \`find(v)\` |
| Edges keep arriving | re-run, O(V + E) each time | O(α) per new edge |
| Also detects | distances (BFS), cycles | "this edge closes a cycle" (union returns false) |

Both are correct for the count. Reach for **DFS/BFS** when you already have (or need) an adjacency list or you want distances and paths; reach for **Union-Find** when edges stream in, when the input is just an edge list, or when you want the smallest memory footprint. The grid version of the same trade-off is worked through in [islands with DFS vs BFS vs Union-Find](/interview-question/number-of-islands-with-dfs-vs-bfs-vs-union-find-trade-offs).

**Follow-ups you may get:**

- **"Is this graph a valid tree?"** — a tree on n vertices has exactly n − 1 edges and exactly 1 component. Union-Find answers it in one pass: fail as soon as an edge's ends already share a root (cycle), and check the count is 1 at the end.
- **"Number of provinces"** — the same problem with an n × n adjacency matrix as input; loop over the matrix instead of an edge list (see [graph representations](/interview-question/what-is-a-graph-and-how-do-you-represent-it)).
- **Directed graphs** — "connected" splits into weakly connected (ignore direction and count as above) and strongly connected, which needs Kosaraju or Tarjan: [strongly connected components](/interview-question/how-do-you-find-strongly-connected-components-in-a-directed-graph).
- **Related traversals:** [bipartite check](/interview-question/how-do-you-check-if-a-graph-is-bipartite) (BFS colouring per component) and [cloning a graph](/interview-question/how-do-you-clone-a-graph) (traversal with a copy map).

## 9. Edge Cases

- **No edges** — n components (example 1: n = 4 → 4; n = 1 → 1).
- **Isolated vertices** — counted because the outer loop runs over all n vertices, not over edge endpoints (vertex 5 in example 2).
- **Duplicate edges and self-loops** — \`(0, 1), (1, 0), (2, 2)\` gives 3 components for n = 4 in every method (example 1).
- **Cycles** — the triangle 0–1–2 plus edge 3–4 with n = 6 gives 3 components; the cycle edge is just skipped.
- **Huge, sparse graphs** — on 100,000 vertices and 60,000 random edges, DFS and Union-Find both find 40,394 components, of which 30,139 are single vertices (example 2). Note how many isolated vertices a sparse random graph has.
- **One long path** — a recursive DFS goes n calls deep; use an explicit stack, BFS or Union-Find (all three versions in example 1 are recursion-free).

## Common Pitfalls

- **Building the graph from edge endpoints only.** Isolated vertices disappear; size everything by \`n\`.
- **Vertex ids outside 0..n−1.** \`adj[u]\` and \`parent[u]\` do no bounds checking; a bad id is undefined behaviour, not an exception.
- **Recursive DFS on large inputs.** A deep path overflows the stack and segfaults; use a \`std::vector\` stack, BFS or Union-Find.
- **Passing graphs and edge lists by value.** Each call copies everything; take \`const&\`.
- **Naming the merge function \`union\`.** It is a keyword; call it \`unite\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">Each unvisited vertex starts a new component; a DFS or BFS from it marks the whole component, so the number of starts is the answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Setup:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;std::vector&lt;int&gt;&gt; adj(n)</code> with both directions, so isolated vertices and either edge direction are handled.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Alternative:</strong> <span style="color:#f0e2c8;">Union-Find with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::iota</code> parents: start with n groups, subtract one for every edge whose ends have different roots.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Traversal O(V + E) time and space; Union-Find O(E · α(V)) time and O(V) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> as the stack (deep recursion segfaults), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code> parameters, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;char&gt;</code> for visited flags.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the components themselves?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Label each vertex with a component id during the traversal, then group by label (example 2), or group vertices by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find(v)</code> with Union-Find.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if edges keep arriving and you must report the count after each?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Union-Find: each new edge is one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unite</code>, and the count drops by one only when it merges two groups. A traversal would have to rerun.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you check whether the graph is a valid tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exactly n − 1 edges and one component; with Union-Find, fail immediately if an edge joins two vertices that already share a root.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a lambda for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">find</code> in example 2?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">auto find = [&amp;](int x) { ... }</code> captures <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent</code> by reference, keeping the helper local to the function without a separate struct.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for a directed graph?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Treat edges as undirected for weakly connected components; strongly connected components need Kosaraju or Tarjan.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Connected component** | Maximal set of mutually reachable vertices |
| **Isolated vertex** | A vertex with no edges; a component of size 1 |
| **components = n − successful unions** | Each real merge removes exactly one group |
| **Spanning forest** | The n − components edges that discovered or merged; all others close cycles |
| **Path halving** | In \`find\`, point nodes at their grandparents to flatten the tree |

---
**Conclusion:** In C++, counting connected components is one loop over all n vertices: every unvisited vertex adds one to the count and a \`std::vector\`-stack DFS or \`std::queue\` BFS marks its whole component — O(V + E). Union-Find with \`std::iota\` parents gets the same answer straight from the edge list as n minus the successful unions, in O(V) space. Size everything by \`n\`, pass by \`const&\`, keep recursion out of large inputs, and use 64-bit arithmetic where products can overflow.`,
        examples: [
          {
            label: "Count components three ways: DFS, BFS, Union-Find",
            code: `#include <iostream>
#include <numeric>
#include <queue>
#include <string>
#include <utility>
#include <vector>

using Edges = std::vector<std::pair<int, int>>;
using Graph = std::vector<std::vector<int>>;

Graph build(int n, const Edges& edges) {
    Graph adj(n);
    for (auto [u, v] : edges) {
        adj[u].push_back(v);
        adj[v].push_back(u);   // undirected: store both directions
    }
    return adj;
}

// Start a DFS from every node not yet seen; each start is one component.
int countDfs(int n, const Edges& edges) {
    Graph adj = build(n, edges);
    std::vector<char> seen(n, 0);
    std::vector<int> stack;
    int count = 0;
    for (int s = 0; s < n; ++s) {
        if (seen[s]) continue;
        ++count;
        seen[s] = 1;
        stack.push_back(s);
        while (!stack.empty()) {
            int u = stack.back();
            stack.pop_back();
            for (int v : adj[u])
                if (!seen[v]) {
                    seen[v] = 1;
                    stack.push_back(v);
                }
        }
    }
    return count;
}

int countBfs(int n, const Edges& edges) {
    Graph adj = build(n, edges);
    std::vector<char> seen(n, 0);
    std::queue<int> q;
    int count = 0;
    for (int s = 0; s < n; ++s) {
        if (seen[s]) continue;
        ++count;
        seen[s] = 1;
        q.push(s);
        while (!q.empty()) {
            int u = q.front();
            q.pop();
            for (int v : adj[u])
                if (!seen[v]) {
                    seen[v] = 1;
                    q.push(v);
                }
        }
    }
    return count;
}

int find(std::vector<int>& parent, int x) {
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];   // path halving
        x = parent[x];
    }
    return x;
}

// Start with n singletons; every edge that joins two different groups removes one.
int countUnionFind(int n, const Edges& edges) {
    std::vector<int> parent(n);
    std::iota(parent.begin(), parent.end(), 0);   // 0, 1, 2, ..., n-1
    int components = n;
    for (auto [u, v] : edges) {
        int ru = find(parent, u), rv = find(parent, v);
        if (ru != rv) {
            parent[ru] = rv;
            --components;
        }
    }
    return components;
}

std::string fmtEdges(const Edges& edges) {
    std::string s = "[";
    for (size_t i = 0; i < edges.size(); ++i)
        s += (i ? ", [" : "[") + std::to_string(edges[i].first) + ", " + std::to_string(edges[i].second) + "]";
    return s + "]";
}

int main() {
    std::vector<std::pair<int, Edges>> tests = {
        {5, {{0, 1}, {1, 2}, {3, 4}}},
        {5, {{0, 1}, {1, 2}, {2, 3}, {3, 4}}},
        {4, {}},
        {1, {}},
        {4, {{0, 1}, {1, 0}, {2, 2}}},           // duplicate edge and a self-loop
        {6, {{0, 1}, {1, 2}, {2, 0}, {3, 4}}},   // a cycle does not change the count
    };
    for (const auto& [n, edges] : tests)
        std::cout << "n=" << n << " edges=" << fmtEdges(edges) << ": dfs " << countDfs(n, edges)
                  << ", bfs " << countBfs(n, edges) << ", union-find " << countUnionFind(n, edges) << "\\n";
}`,
          },
          {
            label: "Label the components, and a 100,000-vertex random graph",
            code: `#include <algorithm>
#include <cstdint>
#include <iostream>
#include <numeric>
#include <string>
#include <utility>
#include <vector>

using Edges = std::vector<std::pair<int, int>>;

// comp[v] = id of the component containing v (0, 1, 2, ... in discovery order).
std::vector<int> labelComponents(int n, const Edges& edges, int& count) {
    std::vector<std::vector<int>> adj(n);
    for (auto [u, v] : edges) {
        adj[u].push_back(v);
        adj[v].push_back(u);
    }
    std::vector<int> comp(n, -1), stack;
    count = 0;
    for (int s = 0; s < n; ++s) {
        if (comp[s] != -1) continue;
        comp[s] = count;
        stack.push_back(s);
        while (!stack.empty()) {
            int u = stack.back();
            stack.pop_back();
            for (int v : adj[u])
                if (comp[v] == -1) {
                    comp[v] = count;
                    stack.push_back(v);
                }
        }
        ++count;
    }
    return comp;
}

// Returns {components, successful unions}.
std::pair<int, int> unionFindCount(int n, const Edges& edges) {
    std::vector<int> parent(n), size(n, 1);
    std::iota(parent.begin(), parent.end(), 0);
    auto find = [&](int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    };
    int unions = 0;
    for (auto [u, v] : edges) {
        int a = find(u), b = find(v);
        if (a != b) {
            if (size[a] < size[b]) std::swap(a, b);
            parent[b] = a;                     // union by size keeps trees shallow
            size[a] += size[b];
            ++unions;
        }
    }
    return {n - unions, unions};
}

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); ++i) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

int main() {
    Edges edges = {{0, 1}, {2, 3}, {3, 4}, {6, 7}, {7, 6}};
    int k = 0;
    std::vector<int> comp = labelComponents(8, edges, k);
    std::vector<std::vector<int>> groups(k);
    for (int v = 0; v < 8; ++v) groups[comp[v]].push_back(v);   // nodes visited in order: groups are sorted
    std::cout << "n=8 has " << k << " components:\\n";
    for (const auto& g : groups) std::cout << "  " << fmt(g) << "\\n";
    std::cout << std::boolalpha << "same component? 2 and 4: " << (comp[2] == comp[4])
              << ", 1 and 5: " << (comp[1] == comp[5]) << "\\n";

    const int N = 100000, M = 60000;
    std::int64_t seed = 2024;                  // 64-bit: seed * 48271 overflows 32-bit int
    Edges big;
    big.reserve(M);
    for (int i = 0; i < M; ++i) {
        seed = seed * 48271 % 2147483647;
        int u = seed % N;
        seed = seed * 48271 % 2147483647;
        big.push_back({u, static_cast<int>(seed % N)});
    }
    comp = labelComponents(N, big, k);
    std::vector<int> sizes(k, 0);
    for (int c : comp) ++sizes[c];
    auto [uf, unions] = unionFindCount(N, big);
    std::cout << "random graph n=" << N << ", m=" << M << ":\\n";
    std::cout << "  DFS components:        " << k << "\\n";
    std::cout << "  union-find components: " << uf << " (= " << N << " - " << unions << " successful unions)\\n";
    std::cout << "  largest component: " << *std::max_element(sizes.begin(), sizes.end())
              << " nodes, single-node components: " << std::count(sizes.begin(), sizes.end(), 1) << "\\n";
}`,
          },
        ],
      },
    },
  },
];

export default augments;
