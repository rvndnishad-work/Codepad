/**
 * DSA ULTRA — batch 15: binary trees I — the traversal orders, maximum depth, inverting
 * a tree, the symmetric (mirror) check and root-to-leaf path sum. One complete answer per
 * language (Python, JavaScript, Java, C++). Every example was run with python3 / node /
 * javac+java / g++ -std=c++17 by scripts/verify-dsa-examples.ts and the quoted output is
 * that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What are the tree traversal methods?",
    difficulty: "easy",
    seoDescription: "Preorder, inorder, postorder and level-order traversal in Python, JavaScript, Java and C++, recursive and iterative, with verified output.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Walk me through the ways you can traverse a binary tree. Then, in Python, write preorder, inorder and postorder recursively, write inorder iteratively with a stack, and tell me when you would pick each order."

**What a strong answer should cover:**
- The two families: depth-first (preorder, inorder, postorder) and breadth-first (level order with a queue), and that the three DFS orders differ only in when the node is visited.
- The output of each order on a small example, and that inorder of a BST is sorted.
- Typical uses: preorder to copy or serialise, inorder for BST problems, postorder when a node needs its children's results, level order for per-level questions.
- O(n) time for all; O(h) space for DFS (call stack or explicit stack) and O(w) for BFS.
- Python specifics: the default recursion limit is 1000, so a deep chain raises \`RecursionError\` and the iterative version matters; a \`list\` is the stack and \`collections.deque\` is the queue (\`list.pop(0)\` is O(n)); never use a mutable default argument like \`out=[]\`.

**Code / implementation expected:** Yes — the three recursive orders in Python plus at least one iterative version with a list as the stack.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; no prior knowledge of trees assumed.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Python version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Imagine you have just moved into a big old house with rooms that branch off rooms. You want to check every room exactly once for a lost key. There are only two sensible plans. Plan one: walk down a corridor as far as it goes, then back up and try the next door (going **deep** first). Plan two: check every room on the ground floor, then every room on the first floor, then the second (going **wide** first, floor by floor).

A tree traversal is the same choice for a tree of data. Every tree algorithm you will meet in an interview — maximum depth, inverting a tree, checking symmetry, path sums, serialisation, validating a BST — is one of these walks with a small piece of work done at each node. If you know the four standard orders by heart, and can write each one both with recursion and with an explicit stack or queue, most "easy" and many "medium" tree questions become a matter of choosing the order and filling in one line.

## 2. The Core Idea

📌 **Interview term: Binary tree** — a structure made of **nodes**, where each node holds a value and up to two links called its **left child** and **right child**. The top node is the **root**; a node with no children is a **leaf**.

📌 **Interview term: Traversal** — visiting every node of the tree exactly once in a fixed order. "Visiting" means doing the work for that node: printing it, adding it to a list, comparing it, and so on.

There are two families of traversal:

📌 **Interview term: Depth-first search (DFS)** — go as deep as possible down one branch before backing up. On a tree it comes in three orders, which differ only in **when the node itself is visited** compared with its two subtrees.

📌 **Interview term: Breadth-first search (BFS) / level-order traversal** — visit all nodes at depth 0, then all at depth 1, then depth 2, and so on, using a **queue**. It has its own page: [level-order (BFS) traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree), and the general trade-off is covered in [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs).

Here is the tree used in every example below:

<svg class="iq-diagram" width="100%" viewBox="0 0 620 260" role="img" aria-label="Sample binary tree: root 1, children 2 and 3, node 2 has children 4 and 5, node 3 has right child 6, arranged in levels 0, 1 and 2">
  <line class="d-edge" x1="283" y1="61" x2="197" y2="119"/>
  <line class="d-edge" x1="317" y1="61" x2="403" y2="119"/>
  <line class="d-edge" x1="167" y1="145" x2="123" y2="195"/>
  <line class="d-edge" x1="193" y1="145" x2="237" y2="195"/>
  <line class="d-edge" x1="433" y1="145" x2="477" y2="195"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">1</text>
  <circle class="d-box" cx="180" cy="130" r="20"/>
  <text class="d-text" x="180" y="135" text-anchor="middle">2</text>
  <circle class="d-box" cx="420" cy="130" r="20"/>
  <text class="d-text" x="420" y="135" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="110" cy="210" r="20"/>
  <text class="d-text" x="110" y="215" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="250" cy="210" r="20"/>
  <text class="d-text" x="250" y="215" text-anchor="middle">5</text>
  <circle class="d-box-muted" cx="490" cy="210" r="20"/>
  <text class="d-text" x="490" y="215" text-anchor="middle">6</text>
  <text class="d-sub" x="580" y="55" text-anchor="middle">level 0</text>
  <text class="d-sub" x="580" y="135" text-anchor="middle">level 1</text>
  <text class="d-sub" x="580" y="215" text-anchor="middle">level 2</text>
</svg>

The root \`1\` is on level 0, its children \`2\` and \`3\` on level 1, and \`4\`, \`5\`, \`6\` on level 2. Node \`3\` has no left child, which is why it is written as \`null\` in the level-order input \`[1, 2, 3, 4, 5, null, 6]\`.

### The three depth-first orders

The name tells you where the node goes. **Pre** = the node comes *before* its subtrees, **in** = *in between* them, **post** = *after* them. Left always comes before right. The numbers in each picture are the visiting order.

**Preorder — node, left, right:**

<svg class="iq-diagram" width="100%" viewBox="0 0 260 210" role="img" aria-label="Preorder visits the node first, then the left subtree, then the right subtree">
  <line class="d-edge" x1="118" y1="78" x2="72" y2="134"/>
  <line class="d-edge" x1="142" y1="78" x2="188" y2="134"/>
  <circle class="d-box-accent" cx="130" cy="62" r="20"/>
  <text class="d-text" x="130" y="67" text-anchor="middle">1</text>
  <circle class="d-box" cx="60" cy="150" r="20"/>
  <text class="d-text" x="60" y="155" text-anchor="middle">2</text>
  <circle class="d-box" cx="200" cy="150" r="20"/>
  <text class="d-text" x="200" y="155" text-anchor="middle">3</text>
  <text class="d-sub" x="130" y="26" text-anchor="middle">node</text>
  <text class="d-sub" x="60" y="196" text-anchor="middle">left subtree</text>
  <text class="d-sub" x="200" y="196" text-anchor="middle">right subtree</text>
</svg>

**Inorder — left, node, right:**

<svg class="iq-diagram" width="100%" viewBox="0 0 260 210" role="img" aria-label="Inorder visits the left subtree first, then the node, then the right subtree">
  <line class="d-edge" x1="118" y1="78" x2="72" y2="134"/>
  <line class="d-edge" x1="142" y1="78" x2="188" y2="134"/>
  <circle class="d-box" cx="60" cy="150" r="20"/>
  <text class="d-text" x="60" y="155" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="130" cy="62" r="20"/>
  <text class="d-text" x="130" y="67" text-anchor="middle">2</text>
  <circle class="d-box" cx="200" cy="150" r="20"/>
  <text class="d-text" x="200" y="155" text-anchor="middle">3</text>
  <text class="d-sub" x="130" y="26" text-anchor="middle">node</text>
  <text class="d-sub" x="60" y="196" text-anchor="middle">left subtree</text>
  <text class="d-sub" x="200" y="196" text-anchor="middle">right subtree</text>
</svg>

**Postorder — left, right, node:**

<svg class="iq-diagram" width="100%" viewBox="0 0 260 210" role="img" aria-label="Postorder visits the left subtree, then the right subtree, and the node last">
  <line class="d-edge" x1="118" y1="78" x2="72" y2="134"/>
  <line class="d-edge" x1="142" y1="78" x2="188" y2="134"/>
  <circle class="d-box" cx="60" cy="150" r="20"/>
  <text class="d-text" x="60" y="155" text-anchor="middle">1</text>
  <circle class="d-box" cx="200" cy="150" r="20"/>
  <text class="d-text" x="200" y="155" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="130" cy="62" r="20"/>
  <text class="d-text" x="130" y="67" text-anchor="middle">3</text>
  <text class="d-sub" x="130" y="26" text-anchor="middle">node</text>
  <text class="d-sub" x="60" y="196" text-anchor="middle">left subtree</text>
  <text class="d-sub" x="200" y="196" text-anchor="middle">right subtree</text>
</svg>

📌 **Interview term: Preorder** — visit the node, then its left subtree, then its right subtree. On the sample tree: \`1, 2, 4, 5, 3, 6\`.

📌 **Interview term: Inorder** — left subtree, then the node, then the right subtree. On the sample tree: \`4, 2, 5, 1, 3, 6\`. On a [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) this gives the values in **sorted order**, which Example 2 checks.

📌 **Interview term: Postorder** — left subtree, right subtree, then the node. On the sample tree: \`4, 5, 2, 6, 3, 1\`. The root is always last.

Level order on the same tree is \`1, 2, 3, 4, 5, 6\`, or grouped by level \`[[1], [2, 3], [4, 5, 6]]\`.

### Which order for which job

| Order | The node is handled... | Typical uses |
| :--- | :--- | :--- |
| Preorder | before its children | copying a tree, [serialising it](/interview-question/how-do-you-serialize-and-deserialize-a-binary-tree), printing a folder structure, passing information *down* (for example a running [path sum](/interview-question/how-do-you-check-if-a-root-to-leaf-path-sums-to-a-target)) |
| Inorder | between its children | reading a BST in sorted order, [validating a BST](/interview-question/how-do-you-validate-that-a-binary-tree-is-a-bst), finding the k-th smallest value |
| Postorder | after its children | anything that needs the children's answers first: [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree), [diameter](/interview-question/how-do-you-compute-the-diameter-of-a-binary-tree), [balance check](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced), freeing memory |
| Level order | level by level | shortest number of edges from the root, [right-side view](/interview-question/how-do-you-get-the-right-side-view-of-a-binary-tree), anything "per level" |

📌 **Interview term: Base case** — the input small enough to answer without recursing. For every traversal it is the empty tree (a missing child): do nothing and return. See [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).

### Recursion versus an explicit stack

The recursive versions are three lines each because the language's **call stack** remembers where you were. Each call waits while its children are processed, and the deepest the call stack ever gets is the **height** of the tree.

📌 **Interview term: Height (h)** — the number of nodes on the longest path from the root down to a leaf (some books count edges instead, one less). A balanced tree of n nodes has a height of about log2 n; a "chain" where every node has only one child has height n.

That is why interviewers often ask for the **iterative** version too: on a chain of 100000 nodes the recursive version uses 100000 nested calls, which many runtimes refuse (the Verified section shows exactly what happens). An explicit stack lives on the heap and has no such limit:

- **Iterative preorder:** pop a node, visit it, push its **right** child and then its **left** child, so the left one comes off first.
- **Iterative inorder:** walk left pushing every node; when you cannot go further left, pop, visit, and move to the right child.
- **Iterative postorder:** run the preorder idea but push left before right, which produces node, right, left; then reverse the list to get left, right, node.

📌 **Interview term: Call stack** — the memory where the runtime keeps one frame per active function call. Its size is limited, so deep recursion can overflow it. See [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 3. The Python Code, Line by Line

The node class and the three recursive orders. Notice that the three functions are identical except for **where** \`out.append(node.val)\` sits:

~~~python
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def preorder(node, out):      # node, left, right
    if node is None:
        return out
    out.append(node.val)
    preorder(node.left, out)
    preorder(node.right, out)
    return out


def inorder(node, out):       # left, node, right
    if node is None:
        return out
    inorder(node.left, out)
    out.append(node.val)
    inorder(node.right, out)
    return out
~~~

Postorder moves the \`append\` after both recursive calls. Level order uses a queue:

~~~python
from collections import deque


def level_order(root):        # breadth-first, one list per level
    levels = []
    queue = deque([root] if root else [])
    while queue:
        level = []
        for _ in range(len(queue)):   # exactly the nodes of this level
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        levels.append(level)
    return levels
~~~

The iterative inorder, which never recurses:

~~~python
def inorder_it(root):
    out, stack, node = [], [], root
    while stack or node:
        while node:               # walk as far left as possible
            stack.append(node)
            node = node.left
        node = stack.pop()        # leftmost unvisited node
        out.append(node.val)
        node = node.right         # then its right subtree
    return out
~~~

What each Python piece is doing:

- **\`if node is None\`** is the base case. \`is None\` is the idiomatic test; it is also what \`if not node\` means here, because a \`TreeNode\` object is always truthy.
- **The list is passed in, not returned fresh at every level.** Building \`inorder(left) + [val] + inorder(right)\` also works, but it copies lists at every node and can cost O(n²) on a chain. Appending to one shared list keeps it O(n).
- **A \`list\` as the stack.** \`append\` and \`pop()\` at the end are amortised O(1); the [Python wiki TimeComplexity page](https://wiki.python.org/moin/TimeComplexity) lists \`pop()\` from the end as O(1) and \`pop(i)\` from the middle or front as O(n).
- **\`collections.deque\` as the queue.** \`popleft()\` is O(1), which is why BFS uses a deque rather than \`list.pop(0)\`; the [collections documentation](https://docs.python.org/3/library/collections.html#collections.deque) describes deques as supporting appends and pops from either side in approximately O(1).
- **\`for _ in range(len(queue))\`** freezes the size of the current level before the loop adds the next level's nodes, which is how BFS groups by level.
- **\`out[::-1]\`** in the iterative postorder returns a reversed copy of the list.

**The mutable default argument trap.** It is tempting to write \`def inorder(node, out=[])\` so callers can skip the list. In Python the default list is created **once**, when the function is defined, and shared by every call:

~~~python
def inorder_buggy(node, out=[]):      # the default list is created ONCE
    if node:
        inorder_buggy(node.left, out)
        out.append(node.val)
        inorder_buggy(node.right, out)
    return out


tree = TreeNode(2, TreeNode(1), TreeNode(3))
print(inorder_buggy(tree))
print(inorder_buggy(tree))            # second call still sees the first result
~~~

~~~text
[1, 2, 3]
[1, 2, 3, 1, 2, 3]
~~~

Pass the list explicitly (as the examples do) or use \`out=None\` and create the list inside.

**A generator version** is very Pythonic and uses no output list at all; \`yield from\` hands every value of the sub-generator up to the caller:

~~~python
def inorder_gen(node):
    if node:
        yield from inorder_gen(node.left)
        yield node.val
        yield from inorder_gen(node.right)


print(list(inorder_gen(tree)))
~~~

~~~text
[1, 2, 3]
~~~

It is still recursive, so it has the same depth limit.

📌 **Interview term: Recursion limit** — Python's guard on how many nested calls are allowed. \`sys.getrecursionlimit()\` returned 1000 on Python 3.13, and a recursive depth function on a 100000-node chain stopped with this:

~~~text
recursion limit: 1000
RecursionError: maximum recursion depth exceeded
~~~

\`sys.setrecursionlimit\` can raise it, but the C stack underneath can still overflow and crash the interpreter, so for very deep trees the iterative version is the safe answer.

### Dry run: iterative inorder on the sample tree

| Step | Action | Stack (bottom to top) | Output so far |
| :--- | :--- | :--- | :--- |
| 1 | walk left from 1: push 1, 2, 4 | 1, 2, 4 | |
| 2 | pop 4, visit, go to its right (none) | 1, 2 | 4 |
| 3 | pop 2, visit, go right to 5 | 1 | 4, 2 |
| 4 | walk left from 5: push 5 | 1, 5 | 4, 2 |
| 5 | pop 5, visit, right is none | 1 | 4, 2, 5 |
| 6 | pop 1, visit, go right to 3 | empty | 4, 2, 5, 1 |
| 7 | walk left from 3: push 3 | 3 | 4, 2, 5, 1 |
| 8 | pop 3, visit, go right to 6; push 6 | 6 | 4, 2, 5, 1, 3 |
| 9 | pop 6, visit; stack empty and no node: stop | empty | 4, 2, 5, 1, 3, 6 |

The stack never holds more nodes than the height of the tree (3 here), which is where the O(h) space comes from.

## 4. Verified: Running the Code

Each example below was saved to a file and run with \`python3 main.py\` (Python 3.13). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive preorder, inorder, postorder and level order** printed:

~~~text
preorder:  [1, 2, 4, 5, 3, 6]
inorder:   [4, 2, 5, 1, 3, 6]
postorder: [4, 5, 2, 6, 3, 1]
levels:    [[1], [2, 3], [4, 5, 6]]
flat BFS:  [1, 2, 3, 4, 5, 6]
empty tree: [] []
one node:   [7]
~~~

**Example 2 — Iterative traversals with an explicit stack, a BST and a 100000-node chain** printed:

~~~text
iterative preorder:  [1, 2, 4, 5, 3, 6]
iterative inorder:   [4, 2, 5, 1, 3, 6]
iterative postorder: [4, 5, 2, 6, 3, 1]
inorder matches recursive: true
BST inorder: [1, 3, 4, 6, 7, 8, 10, 13, 14]
BST inorder is sorted: true
left chain of 100000 nodes, iterative inorder visited: 100000
~~~

Example 2 shows the three iterative versions agree with the recursive ones, that inorder on a BST comes out sorted, and that the iterative inorder walks a 100000-node chain that the recursive version could not handle in every runtime.

## 5. Complexity

| Traversal | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Preorder / inorder / postorder (recursive) | O(n) | O(h) | Each node is entered once; the call stack holds one frame per level of the current path |
| Same, iterative with a stack | O(n) | O(h) | Each node is pushed and popped once; the stack holds at most one path (preorder can hold a few siblings, still O(h)) |
| Iterative postorder by reversing | O(n) | O(n) | The output list is reversed at the end; the stack itself is still O(h) |
| Level order (BFS) | O(n) | O(w) | Each node is queued once; the queue holds at most one level, w = the widest level (up to about n/2 in a full tree) |

Here n is the number of nodes and h the height: O(log n) for a balanced tree and O(n) for a chain. Output lists are O(n) in every version and are not counted as "extra". See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read these.

## 6. Edge Cases

- **Empty tree** (\`root\` is null) — every traversal returns an empty list. Example 1 prints \`empty tree: [] []\`.
- **Single node** — all four orders return just that value (\`one node: [7]\`).
- **Missing children** — node \`3\` has only a right child; the base case handles the missing left child without a special branch.
- **A chain (every node has one child)** — height equals n, so recursion depth equals n. Use the iterative version for very deep trees (Example 2 runs a 100000-node chain).
- **Duplicate values** — traversals do not care about values at all; only "sorted inorder" reasoning on a BST depends on how duplicates are placed.

## Common Pitfalls

- **Mixing up the names.** Remember "where is the node": pre = first, in = middle, post = last. Left is always before right in all three.
- **Pushing left before right in iterative preorder.** A stack pops the last item pushed, so push **right first**, then left. Getting it backwards produces node, right, left.
- **Using \`list.pop(0)\` as a queue for BFS.** It shifts every element and is O(n) per call, turning BFS into O(n²) on big trees. Use \`collections.deque.popleft()\`.
- **\`def f(node, out=[])\`.** The default list is shared between calls (shown above), so the second call returns stale values.
- **Concatenating lists at every level** (\`return f(l) + [v] + f(r)\`). Correct, but it copies and can cost O(n²) on a skewed tree.
- **Recursing on a very deep tree.** The default limit of 1000 means a 1000-node chain already fails; switch to the explicit stack.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two families:</strong> <span style="color:#f0e2c8;">Depth-first goes down one branch before backing up and comes in three orders; breadth-first, or level order, visits level by level with a queue.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The three DFS orders:</strong> <span style="color:#f0e2c8;">They differ only in when the node is visited: preorder node-left-right, inorder left-node-right, postorder left-right-node. On a BST, inorder is sorted.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. When to use which:</strong> <span style="color:#f0e2c8;">Preorder to copy or serialise, inorder for BST questions, postorder when a node needs its children answers like depth or diameter, level order for anything per level.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Python details:</strong> <span style="color:#f0e2c8;">Recursion is three lines with the base case <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if node is None</code>; for deep trees I switch to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code> used as a stack because the default recursion limit is 1000, and BFS uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque</code> because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.pop(0)</code> is O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">Every traversal is O(n) time; DFS uses O(h) space for the stack, BFS uses O(w) for the widest level.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Write iterative inorder without recursion.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a stack and a pointer: push nodes while going left, then pop, visit, and move to the right child; loop while the stack is non-empty or the pointer is not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do inorder in O(1) extra space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with Morris traversal: temporarily link each node's inorder predecessor back to it, use those threads to return upward, and remove them afterwards. It is O(n) time and O(1) space but modifies the tree while it runs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Given only a preorder list, can you rebuild the tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not uniquely in general. Preorder plus inorder (with distinct values) is enough; see the question on building a tree from preorder and inorder.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is postorder the natural order for deleting a tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A node must outlive its children while they are being processed; postorder handles both children before the node itself. In Python the garbage collector frees nodes, but in C++ this is literally how you free memory.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you yield values lazily instead of building a list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Write a generator with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield from</code> for the subtrees and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield node.val</code> in the right position; the caller can stop early, for example to find the k-th smallest value in a BST.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Binary tree** | Nodes with up to two children, left and right; the top node is the root, childless nodes are leaves |
| **Traversal** | Visiting every node exactly once in a fixed order |
| **Depth-first search (DFS)** | Go down one branch as far as possible before backing up |
| **Breadth-first search (BFS) / level-order traversal** | Visit level 0, then level 1, and so on, using a queue |
| **Preorder** | Node, then left subtree, then right subtree |
| **Inorder** | Left subtree, then node, then right subtree; sorted on a BST |
| **Postorder** | Left subtree, then right subtree, then node |
| **Base case** | The input answered without recursing; for traversals, the empty tree |
| **Height (h)** | Nodes on the longest root-to-leaf path; about log2 n when balanced, n for a chain |
| **Call stack** | Runtime memory holding one frame per active call; deep recursion can overflow it |
| **Recursion limit** | Python cap on nested calls; 1000 by default, raising \`RecursionError\` when exceeded |

---
**Conclusion:** Tree traversal is choosing *when* to handle a node: before its children (preorder), between them (inorder), after them (postorder), or level by level (BFS). In Python each DFS order is three lines of recursion, but the default recursion limit of 1000 makes the iterative list-as-stack version the one to trust on deep trees, and BFS should always use \`collections.deque\`. Learn the four outputs on one small tree and the rest of the tree questions in this set reuse them.`,
        examples: [
          {
            label: "Recursive preorder, inorder, postorder and level order",
            code: `from collections import deque


class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def build(values):
    """Build a tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root


def preorder(node, out):      # node, left, right
    if node is None:
        return out
    out.append(node.val)
    preorder(node.left, out)
    preorder(node.right, out)
    return out


def inorder(node, out):       # left, node, right
    if node is None:
        return out
    inorder(node.left, out)
    out.append(node.val)
    inorder(node.right, out)
    return out


def postorder(node, out):     # left, right, node
    if node is None:
        return out
    postorder(node.left, out)
    postorder(node.right, out)
    out.append(node.val)
    return out


def level_order(root):        # breadth-first, one list per level
    levels = []
    queue = deque([root] if root else [])
    while queue:
        level = []
        for _ in range(len(queue)):   # exactly the nodes of this level
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        levels.append(level)
    return levels


def fmt(xs):
    return "[" + ", ".join(fmt(x) if isinstance(x, list) else str(x) for x in xs) + "]"


root = build([1, 2, 3, 4, 5, None, 6])
print("preorder:  " + fmt(preorder(root, [])))  # preorder:  [1, 2, 4, 5, 3, 6]
print("inorder:   " + fmt(inorder(root, [])))  # inorder:   [4, 2, 5, 1, 3, 6]
print("postorder: " + fmt(postorder(root, [])))  # postorder: [4, 5, 2, 6, 3, 1]
print("levels:    " + fmt(level_order(root)))  # levels:    [[1], [2, 3], [4, 5, 6]]
print("flat BFS:  " + fmt(sum(level_order(root), [])))  # flat BFS:  [1, 2, 3, 4, 5, 6]
print("empty tree: " + fmt(preorder(None, [])) + " " + fmt(level_order(None)))  # empty tree: [] []
print("one node:   " + fmt(inorder(build([7]), [])))  # one node:   [7]
`,
          },
          {
            label: "Iterative traversals with an explicit stack, a BST and a 100000-node chain",
            code: `from collections import deque


class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def build(values):
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root


def inorder_rec(node, out):
    if node:
        inorder_rec(node.left, out)
        out.append(node.val)
        inorder_rec(node.right, out)
    return out


def preorder_it(root):
    out, stack = [], [root] if root else []
    while stack:
        node = stack.pop()
        out.append(node.val)
        if node.right:            # push right first so left is popped first
            stack.append(node.right)
        if node.left:
            stack.append(node.left)
    return out


def inorder_it(root):
    out, stack, node = [], [], root
    while stack or node:
        while node:               # walk as far left as possible
            stack.append(node)
            node = node.left
        node = stack.pop()        # leftmost unvisited node
        out.append(node.val)
        node = node.right         # then its right subtree
    return out


def postorder_it(root):
    out, stack = [], [root] if root else []
    while stack:                  # produces node, right, left ...
        node = stack.pop()
        out.append(node.val)
        if node.left:
            stack.append(node.left)
        if node.right:
            stack.append(node.right)
    return out[::-1]              # ... reversed: left, right, node


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


root = build([1, 2, 3, 4, 5, None, 6])
print("iterative preorder:  " + fmt(preorder_it(root)))  # iterative preorder:  [1, 2, 4, 5, 3, 6]
print("iterative inorder:   " + fmt(inorder_it(root)))  # iterative inorder:   [4, 2, 5, 1, 3, 6]
print("iterative postorder: " + fmt(postorder_it(root)))  # iterative postorder: [4, 5, 2, 6, 3, 1]
print("inorder matches recursive: " + str(inorder_it(root) == inorder_rec(root, [])).lower())  # inorder matches recursive: true

bst = build([8, 3, 10, 1, 6, None, 14, None, None, 4, 7, 13])
print("BST inorder: " + fmt(inorder_it(bst)))  # BST inorder: [1, 3, 4, 6, 7, 8, 10, 13, 14]
print("BST inorder is sorted: " + str(inorder_it(bst) == sorted(inorder_it(bst))).lower())  # BST inorder is sorted: true

chain = None
for v in range(100000, 0, -1):    # 100000 nodes, each with only a left child
    chain = TreeNode(v, chain)
print("left chain of 100000 nodes, iterative inorder visited: " + str(len(inorder_it(chain))))  # left chain of 100000 nodes, iterative inorder visited: 100000
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Explain the different ways to traverse a binary tree. Then write them in JavaScript: preorder, inorder and postorder recursively, plus one of them iteratively, and tell me which order you would choose for which problem."

**What a strong answer should cover:**
- Depth-first (preorder, inorder, postorder) versus breadth-first (level order with a queue), and that the DFS orders differ only in when the node is visited.
- The output of each order on a small tree, and that inorder of a BST is sorted.
- Typical uses of each order (serialise, BST, children-first computations, per-level questions).
- O(n) time; O(h) space for DFS, O(w) for BFS.
- JavaScript specifics: an array is the stack (\`push\` and \`pop\`); for a queue avoid repeated \`shift()\` and use a head index or a level array; deep recursion throws \`RangeError: Maximum call stack size exceeded\`; default parameters like \`out = []\` are evaluated on every call, unlike Python.

**Code / implementation expected:** Yes — the three recursive orders in JavaScript and one iterative version using an array as the stack.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; no prior knowledge of trees assumed.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this JavaScript version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Imagine you have just moved into a big old house with rooms that branch off rooms. You want to check every room exactly once for a lost key. There are only two sensible plans. Plan one: walk down a corridor as far as it goes, then back up and try the next door (going **deep** first). Plan two: check every room on the ground floor, then every room on the first floor, then the second (going **wide** first, floor by floor).

A tree traversal is the same choice for a tree of data. Every tree algorithm you will meet in an interview — maximum depth, inverting a tree, checking symmetry, path sums, serialisation, validating a BST — is one of these walks with a small piece of work done at each node. If you know the four standard orders by heart, and can write each one both with recursion and with an explicit stack or queue, most "easy" and many "medium" tree questions become a matter of choosing the order and filling in one line.

## 2. The Core Idea

📌 **Interview term: Binary tree** — a structure made of **nodes**, where each node holds a value and up to two links called its **left child** and **right child**. The top node is the **root**; a node with no children is a **leaf**.

📌 **Interview term: Traversal** — visiting every node of the tree exactly once in a fixed order. "Visiting" means doing the work for that node: printing it, adding it to a list, comparing it, and so on.

There are two families of traversal:

📌 **Interview term: Depth-first search (DFS)** — go as deep as possible down one branch before backing up. On a tree it comes in three orders, which differ only in **when the node itself is visited** compared with its two subtrees.

📌 **Interview term: Breadth-first search (BFS) / level-order traversal** — visit all nodes at depth 0, then all at depth 1, then depth 2, and so on, using a **queue**. It has its own page: [level-order (BFS) traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree), and the general trade-off is covered in [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs).

Here is the tree used in every example below:

<svg class="iq-diagram" width="100%" viewBox="0 0 620 260" role="img" aria-label="Sample binary tree: root 1, children 2 and 3, node 2 has children 4 and 5, node 3 has right child 6, arranged in levels 0, 1 and 2">
  <line class="d-edge" x1="283" y1="61" x2="197" y2="119"/>
  <line class="d-edge" x1="317" y1="61" x2="403" y2="119"/>
  <line class="d-edge" x1="167" y1="145" x2="123" y2="195"/>
  <line class="d-edge" x1="193" y1="145" x2="237" y2="195"/>
  <line class="d-edge" x1="433" y1="145" x2="477" y2="195"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">1</text>
  <circle class="d-box" cx="180" cy="130" r="20"/>
  <text class="d-text" x="180" y="135" text-anchor="middle">2</text>
  <circle class="d-box" cx="420" cy="130" r="20"/>
  <text class="d-text" x="420" y="135" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="110" cy="210" r="20"/>
  <text class="d-text" x="110" y="215" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="250" cy="210" r="20"/>
  <text class="d-text" x="250" y="215" text-anchor="middle">5</text>
  <circle class="d-box-muted" cx="490" cy="210" r="20"/>
  <text class="d-text" x="490" y="215" text-anchor="middle">6</text>
  <text class="d-sub" x="580" y="55" text-anchor="middle">level 0</text>
  <text class="d-sub" x="580" y="135" text-anchor="middle">level 1</text>
  <text class="d-sub" x="580" y="215" text-anchor="middle">level 2</text>
</svg>

The root \`1\` is on level 0, its children \`2\` and \`3\` on level 1, and \`4\`, \`5\`, \`6\` on level 2. Node \`3\` has no left child, which is why it is written as \`null\` in the level-order input \`[1, 2, 3, 4, 5, null, 6]\`.

### The three depth-first orders

The name tells you where the node goes. **Pre** = the node comes *before* its subtrees, **in** = *in between* them, **post** = *after* them. Left always comes before right. The numbers in each picture are the visiting order.

**Preorder — node, left, right:**

<svg class="iq-diagram" width="100%" viewBox="0 0 260 210" role="img" aria-label="Preorder visits the node first, then the left subtree, then the right subtree">
  <line class="d-edge" x1="118" y1="78" x2="72" y2="134"/>
  <line class="d-edge" x1="142" y1="78" x2="188" y2="134"/>
  <circle class="d-box-accent" cx="130" cy="62" r="20"/>
  <text class="d-text" x="130" y="67" text-anchor="middle">1</text>
  <circle class="d-box" cx="60" cy="150" r="20"/>
  <text class="d-text" x="60" y="155" text-anchor="middle">2</text>
  <circle class="d-box" cx="200" cy="150" r="20"/>
  <text class="d-text" x="200" y="155" text-anchor="middle">3</text>
  <text class="d-sub" x="130" y="26" text-anchor="middle">node</text>
  <text class="d-sub" x="60" y="196" text-anchor="middle">left subtree</text>
  <text class="d-sub" x="200" y="196" text-anchor="middle">right subtree</text>
</svg>

**Inorder — left, node, right:**

<svg class="iq-diagram" width="100%" viewBox="0 0 260 210" role="img" aria-label="Inorder visits the left subtree first, then the node, then the right subtree">
  <line class="d-edge" x1="118" y1="78" x2="72" y2="134"/>
  <line class="d-edge" x1="142" y1="78" x2="188" y2="134"/>
  <circle class="d-box" cx="60" cy="150" r="20"/>
  <text class="d-text" x="60" y="155" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="130" cy="62" r="20"/>
  <text class="d-text" x="130" y="67" text-anchor="middle">2</text>
  <circle class="d-box" cx="200" cy="150" r="20"/>
  <text class="d-text" x="200" y="155" text-anchor="middle">3</text>
  <text class="d-sub" x="130" y="26" text-anchor="middle">node</text>
  <text class="d-sub" x="60" y="196" text-anchor="middle">left subtree</text>
  <text class="d-sub" x="200" y="196" text-anchor="middle">right subtree</text>
</svg>

**Postorder — left, right, node:**

<svg class="iq-diagram" width="100%" viewBox="0 0 260 210" role="img" aria-label="Postorder visits the left subtree, then the right subtree, and the node last">
  <line class="d-edge" x1="118" y1="78" x2="72" y2="134"/>
  <line class="d-edge" x1="142" y1="78" x2="188" y2="134"/>
  <circle class="d-box" cx="60" cy="150" r="20"/>
  <text class="d-text" x="60" y="155" text-anchor="middle">1</text>
  <circle class="d-box" cx="200" cy="150" r="20"/>
  <text class="d-text" x="200" y="155" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="130" cy="62" r="20"/>
  <text class="d-text" x="130" y="67" text-anchor="middle">3</text>
  <text class="d-sub" x="130" y="26" text-anchor="middle">node</text>
  <text class="d-sub" x="60" y="196" text-anchor="middle">left subtree</text>
  <text class="d-sub" x="200" y="196" text-anchor="middle">right subtree</text>
</svg>

📌 **Interview term: Preorder** — visit the node, then its left subtree, then its right subtree. On the sample tree: \`1, 2, 4, 5, 3, 6\`.

📌 **Interview term: Inorder** — left subtree, then the node, then the right subtree. On the sample tree: \`4, 2, 5, 1, 3, 6\`. On a [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) this gives the values in **sorted order**, which Example 2 checks.

📌 **Interview term: Postorder** — left subtree, right subtree, then the node. On the sample tree: \`4, 5, 2, 6, 3, 1\`. The root is always last.

Level order on the same tree is \`1, 2, 3, 4, 5, 6\`, or grouped by level \`[[1], [2, 3], [4, 5, 6]]\`.

### Which order for which job

| Order | The node is handled... | Typical uses |
| :--- | :--- | :--- |
| Preorder | before its children | copying a tree, [serialising it](/interview-question/how-do-you-serialize-and-deserialize-a-binary-tree), printing a folder structure, passing information *down* (for example a running [path sum](/interview-question/how-do-you-check-if-a-root-to-leaf-path-sums-to-a-target)) |
| Inorder | between its children | reading a BST in sorted order, [validating a BST](/interview-question/how-do-you-validate-that-a-binary-tree-is-a-bst), finding the k-th smallest value |
| Postorder | after its children | anything that needs the children's answers first: [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree), [diameter](/interview-question/how-do-you-compute-the-diameter-of-a-binary-tree), [balance check](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced), freeing memory |
| Level order | level by level | shortest number of edges from the root, [right-side view](/interview-question/how-do-you-get-the-right-side-view-of-a-binary-tree), anything "per level" |

📌 **Interview term: Base case** — the input small enough to answer without recursing. For every traversal it is the empty tree (a missing child): do nothing and return. See [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).

### Recursion versus an explicit stack

The recursive versions are three lines each because the language's **call stack** remembers where you were. Each call waits while its children are processed, and the deepest the call stack ever gets is the **height** of the tree.

📌 **Interview term: Height (h)** — the number of nodes on the longest path from the root down to a leaf (some books count edges instead, one less). A balanced tree of n nodes has a height of about log2 n; a "chain" where every node has only one child has height n.

That is why interviewers often ask for the **iterative** version too: on a chain of 100000 nodes the recursive version uses 100000 nested calls, which many runtimes refuse (the Verified section shows exactly what happens). An explicit stack lives on the heap and has no such limit:

- **Iterative preorder:** pop a node, visit it, push its **right** child and then its **left** child, so the left one comes off first.
- **Iterative inorder:** walk left pushing every node; when you cannot go further left, pop, visit, and move to the right child.
- **Iterative postorder:** run the preorder idea but push left before right, which produces node, right, left; then reverse the list to get left, right, node.

📌 **Interview term: Call stack** — the memory where the runtime keeps one frame per active function call. Its size is limited, so deep recursion can overflow it. See [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 3. The JavaScript Code, Line by Line

The node class and the three recursive orders. The only difference between them is where \`out.push(node.val)\` sits:

~~~javascript
class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

function preorder(node, out = []) {   // node, left, right
  if (node === null) return out;
  out.push(node.val);
  preorder(node.left, out);
  preorder(node.right, out);
  return out;
}

function inorder(node, out = []) {    // left, node, right
  if (node === null) return out;
  inorder(node.left, out);
  out.push(node.val);
  inorder(node.right, out);
  return out;
}
~~~

Postorder moves the \`push\` after both calls. Level order processes one level array at a time, which avoids \`shift()\` entirely:

~~~javascript
function levelOrder(root) {           // breadth-first, one array per level
  const levels = [];
  let current = root ? [root] : [];
  while (current.length > 0) {
    const next = [];
    levels.push(current.map((n) => n.val));
    for (const node of current) {
      if (node.left) next.push(node.left);
      if (node.right) next.push(node.right);
    }
    current = next;
  }
  return levels;
}
~~~

The iterative inorder:

~~~javascript
function inorderIt(root) {
  const out = [];
  const stack = [];
  let node = root;
  while (stack.length > 0 || node) {
    while (node) {          // walk as far left as possible
      stack.push(node);
      node = node.left;
    }
    node = stack.pop();     // leftmost unvisited node
    out.push(node.val);
    node = node.right;      // then its right subtree
  }
  return out;
}
~~~

What each JavaScript piece is doing:

- **\`node === null\`** is the base case. The examples build children as \`null\`, so strict equality is exact. If some code leaves children \`undefined\`, \`if (!node)\` covers both.
- **\`out = []\` as a default parameter is safe in JavaScript.** Default values are evaluated each time the function is called without that argument, so two calls do not share a list. The recursive calls pass \`out\` explicitly, so the whole traversal fills one array:

~~~javascript
function inorder(node, out = []) {   // the default is evaluated on every call
  if (node) {
    inorder(node.left, out);
    out.push(node.val);
    inorder(node.right, out);
  }
  return out;
}
const tree = { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } };
console.log(inorder(tree).join(', '));
console.log(inorder(tree).join(', '));
~~~

~~~text
1, 2, 3
1, 2, 3
~~~

The same code in Python would print the values twice on the second call; this is a classic difference between the two languages.
- **An array as the stack.** \`push\` adds at the end and \`pop\` removes from the end.
- **No \`shift()\` loop for BFS.** The [ECMAScript specification](https://tc39.es/ecma262/#sec-array.prototype.shift) defines \`Array.prototype.shift\` as moving every remaining element down one index, so a \`while (queue.length) queue.shift()\` loop is quadratic in the worst case unless the engine optimises it. The level-array version above, or a \`head\` index into the array as the \`build\` helper uses, is reliably O(n).
- **\`out.reverse()\`** in the iterative postorder reverses the array **in place** and returns it.
- **\`levelOrder(root).flat()\`** flattens the per-level arrays into one list (ES2019).

**A generator version** with \`function*\` and \`yield*\`:

~~~javascript
function* inorderGen(node) {
  if (node) {
    yield* inorderGen(node.left);
    yield node.val;
    yield* inorderGen(node.right);
  }
}
console.log([...inorderGen(tree)].join(', '));
~~~

~~~text
1, 2, 3
~~~

📌 **Interview term: Stack overflow (\`RangeError\`)** — when the call stack runs out of room. A recursive depth function on a 100000-node chain, run with Node.js 22, threw:

~~~text
RangeError: Maximum call stack size exceeded
~~~

The exact depth at which this happens depends on the engine and on how big each frame is, so it is different in each browser; the iterative versions do not have this limit.

### Dry run: iterative inorder on the sample tree

| Step | Action | Stack (bottom to top) | Output so far |
| :--- | :--- | :--- | :--- |
| 1 | walk left from 1: push 1, 2, 4 | 1, 2, 4 | |
| 2 | pop 4, visit, go to its right (none) | 1, 2 | 4 |
| 3 | pop 2, visit, go right to 5 | 1 | 4, 2 |
| 4 | walk left from 5: push 5 | 1, 5 | 4, 2 |
| 5 | pop 5, visit, right is none | 1 | 4, 2, 5 |
| 6 | pop 1, visit, go right to 3 | empty | 4, 2, 5, 1 |
| 7 | walk left from 3: push 3 | 3 | 4, 2, 5, 1 |
| 8 | pop 3, visit, go right to 6; push 6 | 6 | 4, 2, 5, 1, 3 |
| 9 | pop 6, visit; stack empty and no node: stop | empty | 4, 2, 5, 1, 3, 6 |

The stack never holds more nodes than the height of the tree (3 here), which is where the O(h) space comes from.

## 4. Verified: Running the Code

Each example below was saved to a file and run with \`node main.js\` (Node.js 22). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive preorder, inorder, postorder and level order** printed:

~~~text
preorder:  [1, 2, 4, 5, 3, 6]
inorder:   [4, 2, 5, 1, 3, 6]
postorder: [4, 5, 2, 6, 3, 1]
levels:    [[1], [2, 3], [4, 5, 6]]
flat BFS:  [1, 2, 3, 4, 5, 6]
empty tree: [] []
one node:   [7]
~~~

**Example 2 — Iterative traversals with an explicit stack, a BST and a 100000-node chain** printed:

~~~text
iterative preorder:  [1, 2, 4, 5, 3, 6]
iterative inorder:   [4, 2, 5, 1, 3, 6]
iterative postorder: [4, 5, 2, 6, 3, 1]
inorder matches recursive: true
BST inorder: [1, 3, 4, 6, 7, 8, 10, 13, 14]
BST inorder is sorted: true
left chain of 100000 nodes, iterative inorder visited: 100000
~~~

Example 2 shows the three iterative versions agree with the recursive ones, that inorder on a BST comes out sorted, and that the iterative inorder walks a 100000-node chain that the recursive version could not handle in every runtime.

## 5. Complexity

| Traversal | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Preorder / inorder / postorder (recursive) | O(n) | O(h) | Each node is entered once; the call stack holds one frame per level of the current path |
| Same, iterative with a stack | O(n) | O(h) | Each node is pushed and popped once; the stack holds at most one path (preorder can hold a few siblings, still O(h)) |
| Iterative postorder by reversing | O(n) | O(n) | The output list is reversed at the end; the stack itself is still O(h) |
| Level order (BFS) | O(n) | O(w) | Each node is queued once; the queue holds at most one level, w = the widest level (up to about n/2 in a full tree) |

Here n is the number of nodes and h the height: O(log n) for a balanced tree and O(n) for a chain. Output lists are O(n) in every version and are not counted as "extra". See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read these.

## 6. Edge Cases

- **Empty tree** (\`root\` is null) — every traversal returns an empty list. Example 1 prints \`empty tree: [] []\`.
- **Single node** — all four orders return just that value (\`one node: [7]\`).
- **Missing children** — node \`3\` has only a right child; the base case handles the missing left child without a special branch.
- **A chain (every node has one child)** — height equals n, so recursion depth equals n. Use the iterative version for very deep trees (Example 2 runs a 100000-node chain).
- **Duplicate values** — traversals do not care about values at all; only "sorted inorder" reasoning on a BST depends on how duplicates are placed.

## Common Pitfalls

- **Mixing up the names.** pre = node first, in = node in the middle, post = node last; left before right always.
- **Pushing left before right in iterative preorder.** The stack pops the last push first, so push right, then left.
- **\`queue.shift()\` in a loop.** It re-indexes the array on every call; use a head index or a per-level array for BFS on large trees.
- **Printing arrays with \`console.log(arr)\`.** Node prints \`[ 1, 2, 3 ]\` with spaces inside the brackets; format with \`'[' + arr.join(', ') + ']'\` when the exact text matters.
- **Checking \`node === null\` when children may be \`undefined\`.** If a tree comes from JSON with missing keys, \`node.left\` is \`undefined\` and \`=== null\` is false; the recursion then reads \`undefined.left\` and throws a \`TypeError\`. Use \`if (!node)\` in that case.
- **Very deep recursion.** A long chain throws \`RangeError: Maximum call stack size exceeded\`; switch to the explicit stack.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two families:</strong> <span style="color:#f0e2c8;">Depth-first goes deep before wide and has three orders; breadth-first, or level order, goes level by level with a queue.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The three DFS orders:</strong> <span style="color:#f0e2c8;">Preorder is node-left-right, inorder is left-node-right, postorder is left-right-node; only the moment the node is visited changes. Inorder of a BST is sorted.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. When to use which:</strong> <span style="color:#f0e2c8;">Preorder to copy or serialise, inorder for BSTs, postorder when a node needs its children results, level order for per-level questions.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. JavaScript details:</strong> <span style="color:#f0e2c8;">The recursive versions are a few lines with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node === null</code> as the base case; iteratively I use an array as a stack with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code>, and for BFS I avoid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code> because it re-indexes the array.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">O(n) time for every traversal; O(h) space for DFS and O(w) for BFS. Deep chains throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code> with recursion, so the iterative version is the safe one.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Write iterative inorder without recursion.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use an array as a stack and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node</code> pointer: push while moving left, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code>, record the value, and move to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node.right</code>; loop while the stack has items or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node</code> is not null.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you traverse in O(1) extra space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Morris traversal threads each node's inorder predecessor to it temporarily, follows those threads upward and removes them again: O(n) time, O(1) space, but it mutates the tree during the walk.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you stop early, say at the k-th smallest in a BST?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a generator (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function*</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield*</code>) or the iterative inorder with a counter, and return as soon as the counter reaches k; you never visit the rest of the tree.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">levelOrder</code> not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">queue.shift()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The specification makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift</code> move every remaining element down one index, so a loop of shifts can be O(n squared). Processing one level array at a time, or keeping a head index, keeps BFS O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which traversal would you use to serialise a tree and why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Preorder with markers for missing children: the root comes first, so the reader can rebuild the tree top-down in one pass.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Binary tree** | Nodes with up to two children, left and right; the top node is the root, childless nodes are leaves |
| **Traversal** | Visiting every node exactly once in a fixed order |
| **Depth-first search (DFS)** | Go down one branch as far as possible before backing up |
| **Breadth-first search (BFS) / level-order traversal** | Visit level 0, then level 1, and so on, using a queue |
| **Preorder** | Node, then left subtree, then right subtree |
| **Inorder** | Left subtree, then node, then right subtree; sorted on a BST |
| **Postorder** | Left subtree, then right subtree, then node |
| **Base case** | The input answered without recursing; for traversals, the empty tree |
| **Height (h)** | Nodes on the longest root-to-leaf path; about log2 n when balanced, n for a chain |
| **Call stack** | Runtime memory holding one frame per active call; deep recursion can overflow it |
| **Stack overflow (\`RangeError\`)** | The call stack ran out of space; JavaScript reports \`RangeError: Maximum call stack size exceeded\` |

---
**Conclusion:** Tree traversal is choosing *when* to handle a node: before its children (preorder), between them (inorder), after them (postorder), or level by level (BFS). In JavaScript the recursive orders are tiny, arrays serve as the stack, BFS should avoid repeated \`shift()\`, and deep chains throw \`RangeError\` — so know the iterative versions too. Learn the four outputs on one small tree and the other tree questions build on them.`,
        examples: [
          {
            label: "Recursive preorder, inorder, postorder and level order",
            code: `class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// Build a tree from a level-order array; null marks a missing child.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new TreeNode(values[0]);
  const queue = [root];
  let head = 0; // index of the next node to give children (avoids O(n) shift())
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) {
      node.left = new TreeNode(values[i]);
      queue.push(node.left);
    }
    i++;
    if (i < values.length && values[i] !== null) {
      node.right = new TreeNode(values[i]);
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

function preorder(node, out = []) {   // node, left, right
  if (node === null) return out;
  out.push(node.val);
  preorder(node.left, out);
  preorder(node.right, out);
  return out;
}

function inorder(node, out = []) {    // left, node, right
  if (node === null) return out;
  inorder(node.left, out);
  out.push(node.val);
  inorder(node.right, out);
  return out;
}

function postorder(node, out = []) {  // left, right, node
  if (node === null) return out;
  postorder(node.left, out);
  postorder(node.right, out);
  out.push(node.val);
  return out;
}

function levelOrder(root) {           // breadth-first, one array per level
  const levels = [];
  let current = root ? [root] : [];
  while (current.length > 0) {
    const next = [];
    levels.push(current.map((n) => n.val));
    for (const node of current) {
      if (node.left) next.push(node.left);
      if (node.right) next.push(node.right);
    }
    current = next;
  }
  return levels;
}

function fmt(xs) {
  return '[' + xs.map((x) => (Array.isArray(x) ? fmt(x) : String(x))).join(', ') + ']';
}

const root = build([1, 2, 3, 4, 5, null, 6]);
console.log('preorder:  ' + fmt(preorder(root))); // preorder:  [1, 2, 4, 5, 3, 6]
console.log('inorder:   ' + fmt(inorder(root))); // inorder:   [4, 2, 5, 1, 3, 6]
console.log('postorder: ' + fmt(postorder(root))); // postorder: [4, 5, 2, 6, 3, 1]
console.log('levels:    ' + fmt(levelOrder(root))); // levels:    [[1], [2, 3], [4, 5, 6]]
console.log('flat BFS:  ' + fmt(levelOrder(root).flat())); // flat BFS:  [1, 2, 3, 4, 5, 6]
console.log('empty tree: ' + fmt(preorder(null)) + ' ' + fmt(levelOrder(null))); // empty tree: [] []
console.log('one node:   ' + fmt(inorder(build([7])))); // one node:   [7]
`,
          },
          {
            label: "Iterative traversals with an explicit stack, a BST and a 100000-node chain",
            code: `class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new TreeNode(values[0]);
  const queue = [root];
  let head = 0;
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) { node.left = new TreeNode(values[i]); queue.push(node.left); }
    i++;
    if (i < values.length && values[i] !== null) { node.right = new TreeNode(values[i]); queue.push(node.right); }
    i++;
  }
  return root;
}

function inorderRec(node, out = []) {
  if (node) {
    inorderRec(node.left, out);
    out.push(node.val);
    inorderRec(node.right, out);
  }
  return out;
}

function preorderIt(root) {
  const out = [];
  const stack = root ? [root] : [];
  while (stack.length > 0) {
    const node = stack.pop();
    out.push(node.val);
    if (node.right) stack.push(node.right); // push right first so left is popped first
    if (node.left) stack.push(node.left);
  }
  return out;
}

function inorderIt(root) {
  const out = [];
  const stack = [];
  let node = root;
  while (stack.length > 0 || node) {
    while (node) {          // walk as far left as possible
      stack.push(node);
      node = node.left;
    }
    node = stack.pop();     // leftmost unvisited node
    out.push(node.val);
    node = node.right;      // then its right subtree
  }
  return out;
}

function postorderIt(root) {
  const out = [];
  const stack = root ? [root] : [];
  while (stack.length > 0) { // produces node, right, left ...
    const node = stack.pop();
    out.push(node.val);
    if (node.left) stack.push(node.left);
    if (node.right) stack.push(node.right);
  }
  return out.reverse();      // ... reversed: left, right, node
}

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

function sameArray(a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

const root = build([1, 2, 3, 4, 5, null, 6]);
console.log('iterative preorder:  ' + fmt(preorderIt(root))); // iterative preorder:  [1, 2, 4, 5, 3, 6]
console.log('iterative inorder:   ' + fmt(inorderIt(root))); // iterative inorder:   [4, 2, 5, 1, 3, 6]
console.log('iterative postorder: ' + fmt(postorderIt(root))); // iterative postorder: [4, 5, 2, 6, 3, 1]
console.log('inorder matches recursive: ' + sameArray(inorderIt(root), inorderRec(root))); // inorder matches recursive: true

const bst = build([8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13]);
console.log('BST inorder: ' + fmt(inorderIt(bst))); // BST inorder: [1, 3, 4, 6, 7, 8, 10, 13, 14]
console.log('BST inorder is sorted: ' + sameArray(inorderIt(bst), [...inorderIt(bst)].sort((a, b) => a - b))); // BST inorder is sorted: true

let chain = null;
for (let v = 100000; v >= 1; v--) chain = new TreeNode(v, chain); // 100000 nodes, each with only a left child
console.log('left chain of 100000 nodes, iterative inorder visited: ' + inorderIt(chain).length); // left chain of 100000 nodes, iterative inorder visited: 100000
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"What are the ways to traverse a binary tree? Code preorder, inorder and postorder in Java recursively, then give me an iterative inorder, and explain which data structure you use for the stack and the queue."

**What a strong answer should cover:**
- Depth-first (preorder, inorder, postorder) versus breadth-first (level order with a queue); the DFS orders differ only in when the node is visited.
- Outputs on a small example and that inorder of a BST is sorted.
- Typical uses of each order.
- O(n) time; O(h) space for DFS, O(w) for BFS.
- Java specifics: \`ArrayDeque\` as both the stack (\`push\`/\`pop\`) and the queue (\`offer\`/\`poll\`) instead of the legacy \`Stack\`; \`ArrayDeque\` rejects \`null\` elements, so never enqueue a missing child; deep recursion throws \`StackOverflowError\` (an \`Error\`, not an \`Exception\`); \`List.toString()\` prints \`[1, 2, 3]\`.

**Code / implementation expected:** Yes — static recursive methods in Java plus an iterative version using \`Deque<TreeNode>\`.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; no prior knowledge of trees assumed.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Java version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Imagine you have just moved into a big old house with rooms that branch off rooms. You want to check every room exactly once for a lost key. There are only two sensible plans. Plan one: walk down a corridor as far as it goes, then back up and try the next door (going **deep** first). Plan two: check every room on the ground floor, then every room on the first floor, then the second (going **wide** first, floor by floor).

A tree traversal is the same choice for a tree of data. Every tree algorithm you will meet in an interview — maximum depth, inverting a tree, checking symmetry, path sums, serialisation, validating a BST — is one of these walks with a small piece of work done at each node. If you know the four standard orders by heart, and can write each one both with recursion and with an explicit stack or queue, most "easy" and many "medium" tree questions become a matter of choosing the order and filling in one line.

## 2. The Core Idea

📌 **Interview term: Binary tree** — a structure made of **nodes**, where each node holds a value and up to two links called its **left child** and **right child**. The top node is the **root**; a node with no children is a **leaf**.

📌 **Interview term: Traversal** — visiting every node of the tree exactly once in a fixed order. "Visiting" means doing the work for that node: printing it, adding it to a list, comparing it, and so on.

There are two families of traversal:

📌 **Interview term: Depth-first search (DFS)** — go as deep as possible down one branch before backing up. On a tree it comes in three orders, which differ only in **when the node itself is visited** compared with its two subtrees.

📌 **Interview term: Breadth-first search (BFS) / level-order traversal** — visit all nodes at depth 0, then all at depth 1, then depth 2, and so on, using a **queue**. It has its own page: [level-order (BFS) traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree), and the general trade-off is covered in [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs).

Here is the tree used in every example below:

<svg class="iq-diagram" width="100%" viewBox="0 0 620 260" role="img" aria-label="Sample binary tree: root 1, children 2 and 3, node 2 has children 4 and 5, node 3 has right child 6, arranged in levels 0, 1 and 2">
  <line class="d-edge" x1="283" y1="61" x2="197" y2="119"/>
  <line class="d-edge" x1="317" y1="61" x2="403" y2="119"/>
  <line class="d-edge" x1="167" y1="145" x2="123" y2="195"/>
  <line class="d-edge" x1="193" y1="145" x2="237" y2="195"/>
  <line class="d-edge" x1="433" y1="145" x2="477" y2="195"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">1</text>
  <circle class="d-box" cx="180" cy="130" r="20"/>
  <text class="d-text" x="180" y="135" text-anchor="middle">2</text>
  <circle class="d-box" cx="420" cy="130" r="20"/>
  <text class="d-text" x="420" y="135" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="110" cy="210" r="20"/>
  <text class="d-text" x="110" y="215" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="250" cy="210" r="20"/>
  <text class="d-text" x="250" y="215" text-anchor="middle">5</text>
  <circle class="d-box-muted" cx="490" cy="210" r="20"/>
  <text class="d-text" x="490" y="215" text-anchor="middle">6</text>
  <text class="d-sub" x="580" y="55" text-anchor="middle">level 0</text>
  <text class="d-sub" x="580" y="135" text-anchor="middle">level 1</text>
  <text class="d-sub" x="580" y="215" text-anchor="middle">level 2</text>
</svg>

The root \`1\` is on level 0, its children \`2\` and \`3\` on level 1, and \`4\`, \`5\`, \`6\` on level 2. Node \`3\` has no left child, which is why it is written as \`null\` in the level-order input \`[1, 2, 3, 4, 5, null, 6]\`.

### The three depth-first orders

The name tells you where the node goes. **Pre** = the node comes *before* its subtrees, **in** = *in between* them, **post** = *after* them. Left always comes before right. The numbers in each picture are the visiting order.

**Preorder — node, left, right:**

<svg class="iq-diagram" width="100%" viewBox="0 0 260 210" role="img" aria-label="Preorder visits the node first, then the left subtree, then the right subtree">
  <line class="d-edge" x1="118" y1="78" x2="72" y2="134"/>
  <line class="d-edge" x1="142" y1="78" x2="188" y2="134"/>
  <circle class="d-box-accent" cx="130" cy="62" r="20"/>
  <text class="d-text" x="130" y="67" text-anchor="middle">1</text>
  <circle class="d-box" cx="60" cy="150" r="20"/>
  <text class="d-text" x="60" y="155" text-anchor="middle">2</text>
  <circle class="d-box" cx="200" cy="150" r="20"/>
  <text class="d-text" x="200" y="155" text-anchor="middle">3</text>
  <text class="d-sub" x="130" y="26" text-anchor="middle">node</text>
  <text class="d-sub" x="60" y="196" text-anchor="middle">left subtree</text>
  <text class="d-sub" x="200" y="196" text-anchor="middle">right subtree</text>
</svg>

**Inorder — left, node, right:**

<svg class="iq-diagram" width="100%" viewBox="0 0 260 210" role="img" aria-label="Inorder visits the left subtree first, then the node, then the right subtree">
  <line class="d-edge" x1="118" y1="78" x2="72" y2="134"/>
  <line class="d-edge" x1="142" y1="78" x2="188" y2="134"/>
  <circle class="d-box" cx="60" cy="150" r="20"/>
  <text class="d-text" x="60" y="155" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="130" cy="62" r="20"/>
  <text class="d-text" x="130" y="67" text-anchor="middle">2</text>
  <circle class="d-box" cx="200" cy="150" r="20"/>
  <text class="d-text" x="200" y="155" text-anchor="middle">3</text>
  <text class="d-sub" x="130" y="26" text-anchor="middle">node</text>
  <text class="d-sub" x="60" y="196" text-anchor="middle">left subtree</text>
  <text class="d-sub" x="200" y="196" text-anchor="middle">right subtree</text>
</svg>

**Postorder — left, right, node:**

<svg class="iq-diagram" width="100%" viewBox="0 0 260 210" role="img" aria-label="Postorder visits the left subtree, then the right subtree, and the node last">
  <line class="d-edge" x1="118" y1="78" x2="72" y2="134"/>
  <line class="d-edge" x1="142" y1="78" x2="188" y2="134"/>
  <circle class="d-box" cx="60" cy="150" r="20"/>
  <text class="d-text" x="60" y="155" text-anchor="middle">1</text>
  <circle class="d-box" cx="200" cy="150" r="20"/>
  <text class="d-text" x="200" y="155" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="130" cy="62" r="20"/>
  <text class="d-text" x="130" y="67" text-anchor="middle">3</text>
  <text class="d-sub" x="130" y="26" text-anchor="middle">node</text>
  <text class="d-sub" x="60" y="196" text-anchor="middle">left subtree</text>
  <text class="d-sub" x="200" y="196" text-anchor="middle">right subtree</text>
</svg>

📌 **Interview term: Preorder** — visit the node, then its left subtree, then its right subtree. On the sample tree: \`1, 2, 4, 5, 3, 6\`.

📌 **Interview term: Inorder** — left subtree, then the node, then the right subtree. On the sample tree: \`4, 2, 5, 1, 3, 6\`. On a [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) this gives the values in **sorted order**, which Example 2 checks.

📌 **Interview term: Postorder** — left subtree, right subtree, then the node. On the sample tree: \`4, 5, 2, 6, 3, 1\`. The root is always last.

Level order on the same tree is \`1, 2, 3, 4, 5, 6\`, or grouped by level \`[[1], [2, 3], [4, 5, 6]]\`.

### Which order for which job

| Order | The node is handled... | Typical uses |
| :--- | :--- | :--- |
| Preorder | before its children | copying a tree, [serialising it](/interview-question/how-do-you-serialize-and-deserialize-a-binary-tree), printing a folder structure, passing information *down* (for example a running [path sum](/interview-question/how-do-you-check-if-a-root-to-leaf-path-sums-to-a-target)) |
| Inorder | between its children | reading a BST in sorted order, [validating a BST](/interview-question/how-do-you-validate-that-a-binary-tree-is-a-bst), finding the k-th smallest value |
| Postorder | after its children | anything that needs the children's answers first: [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree), [diameter](/interview-question/how-do-you-compute-the-diameter-of-a-binary-tree), [balance check](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced), freeing memory |
| Level order | level by level | shortest number of edges from the root, [right-side view](/interview-question/how-do-you-get-the-right-side-view-of-a-binary-tree), anything "per level" |

📌 **Interview term: Base case** — the input small enough to answer without recursing. For every traversal it is the empty tree (a missing child): do nothing and return. See [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).

### Recursion versus an explicit stack

The recursive versions are three lines each because the language's **call stack** remembers where you were. Each call waits while its children are processed, and the deepest the call stack ever gets is the **height** of the tree.

📌 **Interview term: Height (h)** — the number of nodes on the longest path from the root down to a leaf (some books count edges instead, one less). A balanced tree of n nodes has a height of about log2 n; a "chain" where every node has only one child has height n.

That is why interviewers often ask for the **iterative** version too: on a chain of 100000 nodes the recursive version uses 100000 nested calls, which many runtimes refuse (the Verified section shows exactly what happens). An explicit stack lives on the heap and has no such limit:

- **Iterative preorder:** pop a node, visit it, push its **right** child and then its **left** child, so the left one comes off first.
- **Iterative inorder:** walk left pushing every node; when you cannot go further left, pop, visit, and move to the right child.
- **Iterative postorder:** run the preorder idea but push left before right, which produces node, right, left; then reverse the list to get left, right, node.

📌 **Interview term: Call stack** — the memory where the runtime keeps one frame per active function call. Its size is limited, so deep recursion can overflow it. See [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 3. The Java Code, Line by Line

The node class and the three recursive orders. They differ only in where \`out.add(node.val)\` sits:

~~~java
static class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}

static List<Integer> preorder(TreeNode node, List<Integer> out) {   // node, left, right
    if (node == null) return out;
    out.add(node.val);
    preorder(node.left, out);
    preorder(node.right, out);
    return out;
}

static List<Integer> inorder(TreeNode node, List<Integer> out) {    // left, node, right
    if (node == null) return out;
    inorder(node.left, out);
    out.add(node.val);
    inorder(node.right, out);
    return out;
}
~~~

Level order with a queue:

~~~java
static List<List<Integer>> levelOrder(TreeNode root) {             // breadth-first
    List<List<Integer>> levels = new ArrayList<>();
    Deque<TreeNode> queue = new ArrayDeque<>();
    if (root != null) queue.add(root);
    while (!queue.isEmpty()) {
        int size = queue.size();          // exactly the nodes of this level
        List<Integer> level = new ArrayList<>();
        for (int k = 0; k < size; k++) {
            TreeNode node = queue.poll();
            level.add(node.val);
            if (node.left != null) queue.add(node.left);
            if (node.right != null) queue.add(node.right);
        }
        levels.add(level);
    }
    return levels;
}
~~~

The iterative inorder:

~~~java
static List<Integer> inorderIt(TreeNode root) {
    List<Integer> out = new ArrayList<>();
    Deque<TreeNode> stack = new ArrayDeque<>();
    TreeNode node = root;
    while (!stack.isEmpty() || node != null) {
        while (node != null) {      // walk as far left as possible
            stack.push(node);
            node = node.left;
        }
        node = stack.pop();         // leftmost unvisited node
        out.add(node.val);
        node = node.right;          // then its right subtree
    }
    return out;
}
~~~

What each Java piece is doing:

- **\`static class TreeNode\`** is a static nested class, so \`main\` can create nodes without an outer instance; fields default to \`null\` for the children and \`0\` for \`val\`.
- **\`List<Integer>\`** stores boxed \`Integer\` objects. That is fine here; the values are only added and printed. \`List.toString()\` prints \`[4, 2, 5, 1, 3, 6]\` and nested lists as \`[[1], [2, 3], [4, 5, 6]]\`, which is why the Java example can print lists directly and still match the other languages.
- **\`ArrayDeque\` as the stack and the queue.** \`push\`/\`pop\` work at the head (stack); \`add\`/\`poll\` add at the tail and remove from the head (queue). The [\`java.util.Stack\` documentation](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Stack.html) recommends \`Deque\` implementations in preference to \`Stack\`.
- **Null children are never added.** The [\`ArrayDeque\` documentation](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayDeque.html) says null elements are prohibited, so \`queue.add(node.left)\` on a missing child throws \`NullPointerException\`. The \`if (node.left != null)\` guards are required, not just tidy. (\`LinkedList\` does accept \`null\`, which hides this bug until the poll returns \`null\` and you dereference it.)
- **\`int size = queue.size()\`** is read *before* the loop so the nodes of the next level, added during the loop, are not processed too early.
- **\`Collections.reverse(out)\`** reverses the list in place for the iterative postorder.
- **\`build(Integer... values)\`** in the examples takes varargs of \`Integer\` so that \`null\` can mark a missing child; an \`int...\` could not hold \`null\`.

📌 **Interview term: \`StackOverflowError\`** — what the JVM throws when the call stack runs out. It extends \`Error\`, not \`Exception\`, so a \`catch (Exception e)\` does not catch it. A recursive depth method on a 100000-node chain, run with plain \`java Main\` on OpenJDK 21 and no \`-Xss\` flag, ended with:

~~~text
caught java.lang.StackOverflowError
~~~

The thread stack size can be raised with \`-Xss\` or by running the work on a \`new Thread(null, task, "name", stackSize)\`, but the iterative version avoids the question entirely.

### Dry run: iterative inorder on the sample tree

| Step | Action | Stack (bottom to top) | Output so far |
| :--- | :--- | :--- | :--- |
| 1 | walk left from 1: push 1, 2, 4 | 1, 2, 4 | |
| 2 | pop 4, visit, go to its right (none) | 1, 2 | 4 |
| 3 | pop 2, visit, go right to 5 | 1 | 4, 2 |
| 4 | walk left from 5: push 5 | 1, 5 | 4, 2 |
| 5 | pop 5, visit, right is none | 1 | 4, 2, 5 |
| 6 | pop 1, visit, go right to 3 | empty | 4, 2, 5, 1 |
| 7 | walk left from 3: push 3 | 3 | 4, 2, 5, 1 |
| 8 | pop 3, visit, go right to 6; push 6 | 6 | 4, 2, 5, 1, 3 |
| 9 | pop 6, visit; stack empty and no node: stop | empty | 4, 2, 5, 1, 3, 6 |

The stack never holds more nodes than the height of the tree (3 here), which is where the O(h) space comes from.

## 4. Verified: Running the Code

Each example below was saved to a file and run with \`javac Main.java && java Main\` (OpenJDK 21 (javac 21)). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive preorder, inorder, postorder and level order** printed:

~~~text
preorder:  [1, 2, 4, 5, 3, 6]
inorder:   [4, 2, 5, 1, 3, 6]
postorder: [4, 5, 2, 6, 3, 1]
levels:    [[1], [2, 3], [4, 5, 6]]
flat BFS:  [1, 2, 3, 4, 5, 6]
empty tree: [] []
one node:   [7]
~~~

**Example 2 — Iterative traversals with an explicit stack, a BST and a 100000-node chain** printed:

~~~text
iterative preorder:  [1, 2, 4, 5, 3, 6]
iterative inorder:   [4, 2, 5, 1, 3, 6]
iterative postorder: [4, 5, 2, 6, 3, 1]
inorder matches recursive: true
BST inorder: [1, 3, 4, 6, 7, 8, 10, 13, 14]
BST inorder is sorted: true
left chain of 100000 nodes, iterative inorder visited: 100000
~~~

Example 2 shows the three iterative versions agree with the recursive ones, that inorder on a BST comes out sorted, and that the iterative inorder walks a 100000-node chain that the recursive version could not handle in every runtime.

## 5. Complexity

| Traversal | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Preorder / inorder / postorder (recursive) | O(n) | O(h) | Each node is entered once; the call stack holds one frame per level of the current path |
| Same, iterative with a stack | O(n) | O(h) | Each node is pushed and popped once; the stack holds at most one path (preorder can hold a few siblings, still O(h)) |
| Iterative postorder by reversing | O(n) | O(n) | The output list is reversed at the end; the stack itself is still O(h) |
| Level order (BFS) | O(n) | O(w) | Each node is queued once; the queue holds at most one level, w = the widest level (up to about n/2 in a full tree) |

Here n is the number of nodes and h the height: O(log n) for a balanced tree and O(n) for a chain. Output lists are O(n) in every version and are not counted as "extra". See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read these.

## 6. Edge Cases

- **Empty tree** (\`root\` is null) — every traversal returns an empty list. Example 1 prints \`empty tree: [] []\`.
- **Single node** — all four orders return just that value (\`one node: [7]\`).
- **Missing children** — node \`3\` has only a right child; the base case handles the missing left child without a special branch.
- **A chain (every node has one child)** — height equals n, so recursion depth equals n. Use the iterative version for very deep trees (Example 2 runs a 100000-node chain).
- **Duplicate values** — traversals do not care about values at all; only "sorted inorder" reasoning on a BST depends on how duplicates are placed.

## Common Pitfalls

- **Mixing up the names.** pre = node first, in = node in the middle, post = node last; left before right always.
- **Adding \`null\` to an \`ArrayDeque\`.** It throws \`NullPointerException\`; always check \`node.left != null\` before \`add\` or \`push\`.
- **Using \`java.util.Stack\` or \`LinkedList\` by habit.** \`Stack\` is a synchronised legacy class; \`LinkedList\` allocates a node object per element and accepts \`null\`, hiding bugs. \`ArrayDeque\` is the usual choice.
- **Reading \`queue.size()\` inside the \`for\` condition.** \`for (int k = 0; k < queue.size(); k++)\` re-reads the size as children are added, so the levels blur together. Save it in a variable first.
- **Catching \`Exception\` to handle deep recursion.** \`StackOverflowError\` is an \`Error\`; it slips past \`catch (Exception e)\`. Fix the depth with an explicit stack instead.
- **Pushing left before right in iterative preorder.** The stack pops the most recent push first, so push right, then left.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two families:</strong> <span style="color:#f0e2c8;">Depth-first goes down one branch before backing up and has three orders; breadth-first, or level order, goes level by level with a queue.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The three DFS orders:</strong> <span style="color:#f0e2c8;">Preorder node-left-right, inorder left-node-right, postorder left-right-node; only when the node is visited changes. Inorder of a BST is sorted.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. When to use which:</strong> <span style="color:#f0e2c8;">Preorder to copy or serialise, inorder for BST problems, postorder when a node needs its children answers, level order for per-level questions.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Java details:</strong> <span style="color:#f0e2c8;">Recursive static methods with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node == null</code> as the base case; iteratively I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> for both stack and queue, and I never add a null child because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> rejects nulls.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">O(n) time; O(h) space for DFS, O(w) for BFS. A deep chain throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code> with recursion, which is why I know the iterative form.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ArrayDeque</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Stack</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Stack</code> extends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vector</code> and synchronises every call, which single-threaded code does not need, and its own Javadoc recommends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deque</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> is a resizable array with fast operations at both ends.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Write iterative preorder.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push the root; while the stack is not empty, pop, add the value, then push the right child and then the left child (only if not null), so the left child is processed next.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you traverse without any stack at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Morris traversal: temporarily point each inorder predecessor right link back at the current node, use it to climb back up, and restore it. O(n) time, O(1) extra space, but it modifies the tree while running.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Iterator&lt;Integer&gt;</code> over the tree in sorted order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Implement a BST iterator: keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deque&lt;TreeNode&gt;</code>, push the left spine in the constructor, and in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code> pop a node, then push the left spine of its right child. Each call is amortised O(1) and memory is O(h).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your recursion overflows on a degenerate tree. Options?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rewrite iteratively with an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deque</code>, or run the recursion on a thread created with a larger stack size; the first is the portable fix.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Binary tree** | Nodes with up to two children, left and right; the top node is the root, childless nodes are leaves |
| **Traversal** | Visiting every node exactly once in a fixed order |
| **Depth-first search (DFS)** | Go down one branch as far as possible before backing up |
| **Breadth-first search (BFS) / level-order traversal** | Visit level 0, then level 1, and so on, using a queue |
| **Preorder** | Node, then left subtree, then right subtree |
| **Inorder** | Left subtree, then node, then right subtree; sorted on a BST |
| **Postorder** | Left subtree, then right subtree, then node |
| **Base case** | The input answered without recursing; for traversals, the empty tree |
| **Height (h)** | Nodes on the longest root-to-leaf path; about log2 n when balanced, n for a chain |
| **Call stack** | Runtime memory holding one frame per active call; deep recursion can overflow it |
| **\`StackOverflowError\`** | JVM error thrown when the call stack is exhausted; it is an \`Error\`, not an \`Exception\` |

---
**Conclusion:** Tree traversal is choosing *when* to handle a node: before its children (preorder), between them (inorder), after them (postorder), or level by level (BFS). In Java the recursive orders are short static methods, \`ArrayDeque\` is both the stack and the queue (never add a null child), and deep chains throw \`StackOverflowError\` — so keep the iterative versions ready. Learn the four outputs on one small tree and the other tree questions build on them.`,
        examples: [
          {
            label: "Recursive preorder, inorder, postorder and level order",
            code: `import java.util.*;

public class Main {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }

    // Build a tree from level-order values; null marks a missing child.
    static TreeNode build(Integer... values) {
        if (values.length == 0 || values[0] == null) return null;
        TreeNode root = new TreeNode(values[0]);
        Deque<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            TreeNode node = queue.poll();
            if (i < values.length && values[i] != null) {
                node.left = new TreeNode(values[i]);
                queue.add(node.left);
            }
            i++;
            if (i < values.length && values[i] != null) {
                node.right = new TreeNode(values[i]);
                queue.add(node.right);
            }
            i++;
        }
        return root;
    }

    static List<Integer> preorder(TreeNode node, List<Integer> out) {   // node, left, right
        if (node == null) return out;
        out.add(node.val);
        preorder(node.left, out);
        preorder(node.right, out);
        return out;
    }

    static List<Integer> inorder(TreeNode node, List<Integer> out) {    // left, node, right
        if (node == null) return out;
        inorder(node.left, out);
        out.add(node.val);
        inorder(node.right, out);
        return out;
    }

    static List<Integer> postorder(TreeNode node, List<Integer> out) {  // left, right, node
        if (node == null) return out;
        postorder(node.left, out);
        postorder(node.right, out);
        out.add(node.val);
        return out;
    }

    static List<List<Integer>> levelOrder(TreeNode root) {             // breadth-first
        List<List<Integer>> levels = new ArrayList<>();
        Deque<TreeNode> queue = new ArrayDeque<>();
        if (root != null) queue.add(root);
        while (!queue.isEmpty()) {
            int size = queue.size();          // exactly the nodes of this level
            List<Integer> level = new ArrayList<>();
            for (int k = 0; k < size; k++) {
                TreeNode node = queue.poll();
                level.add(node.val);
                if (node.left != null) queue.add(node.left);
                if (node.right != null) queue.add(node.right);
            }
            levels.add(level);
        }
        return levels;
    }

    public static void main(String[] args) {
        TreeNode root = build(1, 2, 3, 4, 5, null, 6);
        System.out.println("preorder:  " + preorder(root, new ArrayList<>()));   // [1, 2, 4, 5, 3, 6]
        System.out.println("inorder:   " + inorder(root, new ArrayList<>()));    // [4, 2, 5, 1, 3, 6]
        System.out.println("postorder: " + postorder(root, new ArrayList<>()));  // [4, 5, 2, 6, 3, 1]
        System.out.println("levels:    " + levelOrder(root));                    // [[1], [2, 3], [4, 5, 6]]
        List<Integer> flat = new ArrayList<>();
        for (List<Integer> level : levelOrder(root)) flat.addAll(level);
        System.out.println("flat BFS:  " + flat);                                // [1, 2, 3, 4, 5, 6]
        System.out.println("empty tree: " + preorder(null, new ArrayList<>()) + " " + levelOrder(null));
        System.out.println("one node:   " + inorder(build(7), new ArrayList<>()));  // [7]
    }
}
`,
          },
          {
            label: "Iterative traversals with an explicit stack, a BST and a 100000-node chain",
            code: `import java.util.*;

public class Main {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left) { this.val = val; this.left = left; }
    }

    static TreeNode build(Integer... values) {
        if (values.length == 0 || values[0] == null) return null;
        TreeNode root = new TreeNode(values[0]);
        Deque<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            TreeNode node = queue.poll();
            if (i < values.length && values[i] != null) { node.left = new TreeNode(values[i]); queue.add(node.left); }
            i++;
            if (i < values.length && values[i] != null) { node.right = new TreeNode(values[i]); queue.add(node.right); }
            i++;
        }
        return root;
    }

    static List<Integer> inorderRec(TreeNode node, List<Integer> out) {
        if (node != null) {
            inorderRec(node.left, out);
            out.add(node.val);
            inorderRec(node.right, out);
        }
        return out;
    }

    static List<Integer> preorderIt(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        Deque<TreeNode> stack = new ArrayDeque<>();
        if (root != null) stack.push(root);
        while (!stack.isEmpty()) {
            TreeNode node = stack.pop();
            out.add(node.val);
            if (node.right != null) stack.push(node.right); // right first so left pops first
            if (node.left != null) stack.push(node.left);
        }
        return out;
    }

    static List<Integer> inorderIt(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        Deque<TreeNode> stack = new ArrayDeque<>();
        TreeNode node = root;
        while (!stack.isEmpty() || node != null) {
            while (node != null) {      // walk as far left as possible
                stack.push(node);
                node = node.left;
            }
            node = stack.pop();         // leftmost unvisited node
            out.add(node.val);
            node = node.right;          // then its right subtree
        }
        return out;
    }

    static List<Integer> postorderIt(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        Deque<TreeNode> stack = new ArrayDeque<>();
        if (root != null) stack.push(root);
        while (!stack.isEmpty()) {      // produces node, right, left ...
            TreeNode node = stack.pop();
            out.add(node.val);
            if (node.left != null) stack.push(node.left);
            if (node.right != null) stack.push(node.right);
        }
        Collections.reverse(out);       // ... reversed: left, right, node
        return out;
    }

    public static void main(String[] args) {
        TreeNode root = build(1, 2, 3, 4, 5, null, 6);
        System.out.println("iterative preorder:  " + preorderIt(root));   // [1, 2, 4, 5, 3, 6]
        System.out.println("iterative inorder:   " + inorderIt(root));    // [4, 2, 5, 1, 3, 6]
        System.out.println("iterative postorder: " + postorderIt(root));  // [4, 5, 2, 6, 3, 1]
        System.out.println("inorder matches recursive: " + inorderIt(root).equals(inorderRec(root, new ArrayList<>())));

        TreeNode bst = build(8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13);
        List<Integer> in = inorderIt(bst);
        List<Integer> sorted = new ArrayList<>(in);
        Collections.sort(sorted);
        System.out.println("BST inorder: " + in);                        // [1, 3, 4, 6, 7, 8, 10, 13, 14]
        System.out.println("BST inorder is sorted: " + in.equals(sorted));

        TreeNode chain = null;
        for (int v = 100000; v >= 1; v--) chain = new TreeNode(v, chain); // each with only a left child
        System.out.println("left chain of 100000 nodes, iterative inorder visited: " + inorderIt(chain).size());
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Describe the tree traversal methods, then implement preorder, inorder and postorder for a binary tree in C++ recursively, show me an iterative inorder, and tell me how you would free the tree afterwards."

**What a strong answer should cover:**
- Depth-first (preorder, inorder, postorder) versus breadth-first (level order with \`std::queue\`); the DFS orders differ only in when the node is visited.
- Outputs on a small example and that inorder of a BST is sorted.
- Typical uses, including that postorder is how you free a tree: children before parent.
- O(n) time; O(h) space for DFS, O(w) for BFS.
- C++ specifics: \`std::stack::pop()\` and \`std::queue::pop()\` return \`void\`, so read \`top()\` or \`front()\` first; pass the output vector by reference; raw \`new\` nodes must be deleted (post-order) or wrapped in \`std::unique_ptr\`; deep recursion overflows the stack and crashes with a segmentation fault rather than throwing.

**Code / implementation expected:** Yes — recursive functions in C++ taking \`TreeNode*\` and a \`std::vector<int>&\`, plus an iterative version with \`std::stack\`.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; no prior knowledge of trees assumed.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this C++ version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Imagine you have just moved into a big old house with rooms that branch off rooms. You want to check every room exactly once for a lost key. There are only two sensible plans. Plan one: walk down a corridor as far as it goes, then back up and try the next door (going **deep** first). Plan two: check every room on the ground floor, then every room on the first floor, then the second (going **wide** first, floor by floor).

A tree traversal is the same choice for a tree of data. Every tree algorithm you will meet in an interview — maximum depth, inverting a tree, checking symmetry, path sums, serialisation, validating a BST — is one of these walks with a small piece of work done at each node. If you know the four standard orders by heart, and can write each one both with recursion and with an explicit stack or queue, most "easy" and many "medium" tree questions become a matter of choosing the order and filling in one line.

## 2. The Core Idea

📌 **Interview term: Binary tree** — a structure made of **nodes**, where each node holds a value and up to two links called its **left child** and **right child**. The top node is the **root**; a node with no children is a **leaf**.

📌 **Interview term: Traversal** — visiting every node of the tree exactly once in a fixed order. "Visiting" means doing the work for that node: printing it, adding it to a list, comparing it, and so on.

There are two families of traversal:

📌 **Interview term: Depth-first search (DFS)** — go as deep as possible down one branch before backing up. On a tree it comes in three orders, which differ only in **when the node itself is visited** compared with its two subtrees.

📌 **Interview term: Breadth-first search (BFS) / level-order traversal** — visit all nodes at depth 0, then all at depth 1, then depth 2, and so on, using a **queue**. It has its own page: [level-order (BFS) traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree), and the general trade-off is covered in [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs).

Here is the tree used in every example below:

<svg class="iq-diagram" width="100%" viewBox="0 0 620 260" role="img" aria-label="Sample binary tree: root 1, children 2 and 3, node 2 has children 4 and 5, node 3 has right child 6, arranged in levels 0, 1 and 2">
  <line class="d-edge" x1="283" y1="61" x2="197" y2="119"/>
  <line class="d-edge" x1="317" y1="61" x2="403" y2="119"/>
  <line class="d-edge" x1="167" y1="145" x2="123" y2="195"/>
  <line class="d-edge" x1="193" y1="145" x2="237" y2="195"/>
  <line class="d-edge" x1="433" y1="145" x2="477" y2="195"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">1</text>
  <circle class="d-box" cx="180" cy="130" r="20"/>
  <text class="d-text" x="180" y="135" text-anchor="middle">2</text>
  <circle class="d-box" cx="420" cy="130" r="20"/>
  <text class="d-text" x="420" y="135" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="110" cy="210" r="20"/>
  <text class="d-text" x="110" y="215" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="250" cy="210" r="20"/>
  <text class="d-text" x="250" y="215" text-anchor="middle">5</text>
  <circle class="d-box-muted" cx="490" cy="210" r="20"/>
  <text class="d-text" x="490" y="215" text-anchor="middle">6</text>
  <text class="d-sub" x="580" y="55" text-anchor="middle">level 0</text>
  <text class="d-sub" x="580" y="135" text-anchor="middle">level 1</text>
  <text class="d-sub" x="580" y="215" text-anchor="middle">level 2</text>
</svg>

The root \`1\` is on level 0, its children \`2\` and \`3\` on level 1, and \`4\`, \`5\`, \`6\` on level 2. Node \`3\` has no left child, which is why it is written as \`null\` in the level-order input \`[1, 2, 3, 4, 5, null, 6]\`.

### The three depth-first orders

The name tells you where the node goes. **Pre** = the node comes *before* its subtrees, **in** = *in between* them, **post** = *after* them. Left always comes before right. The numbers in each picture are the visiting order.

**Preorder — node, left, right:**

<svg class="iq-diagram" width="100%" viewBox="0 0 260 210" role="img" aria-label="Preorder visits the node first, then the left subtree, then the right subtree">
  <line class="d-edge" x1="118" y1="78" x2="72" y2="134"/>
  <line class="d-edge" x1="142" y1="78" x2="188" y2="134"/>
  <circle class="d-box-accent" cx="130" cy="62" r="20"/>
  <text class="d-text" x="130" y="67" text-anchor="middle">1</text>
  <circle class="d-box" cx="60" cy="150" r="20"/>
  <text class="d-text" x="60" y="155" text-anchor="middle">2</text>
  <circle class="d-box" cx="200" cy="150" r="20"/>
  <text class="d-text" x="200" y="155" text-anchor="middle">3</text>
  <text class="d-sub" x="130" y="26" text-anchor="middle">node</text>
  <text class="d-sub" x="60" y="196" text-anchor="middle">left subtree</text>
  <text class="d-sub" x="200" y="196" text-anchor="middle">right subtree</text>
</svg>

**Inorder — left, node, right:**

<svg class="iq-diagram" width="100%" viewBox="0 0 260 210" role="img" aria-label="Inorder visits the left subtree first, then the node, then the right subtree">
  <line class="d-edge" x1="118" y1="78" x2="72" y2="134"/>
  <line class="d-edge" x1="142" y1="78" x2="188" y2="134"/>
  <circle class="d-box" cx="60" cy="150" r="20"/>
  <text class="d-text" x="60" y="155" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="130" cy="62" r="20"/>
  <text class="d-text" x="130" y="67" text-anchor="middle">2</text>
  <circle class="d-box" cx="200" cy="150" r="20"/>
  <text class="d-text" x="200" y="155" text-anchor="middle">3</text>
  <text class="d-sub" x="130" y="26" text-anchor="middle">node</text>
  <text class="d-sub" x="60" y="196" text-anchor="middle">left subtree</text>
  <text class="d-sub" x="200" y="196" text-anchor="middle">right subtree</text>
</svg>

**Postorder — left, right, node:**

<svg class="iq-diagram" width="100%" viewBox="0 0 260 210" role="img" aria-label="Postorder visits the left subtree, then the right subtree, and the node last">
  <line class="d-edge" x1="118" y1="78" x2="72" y2="134"/>
  <line class="d-edge" x1="142" y1="78" x2="188" y2="134"/>
  <circle class="d-box" cx="60" cy="150" r="20"/>
  <text class="d-text" x="60" y="155" text-anchor="middle">1</text>
  <circle class="d-box" cx="200" cy="150" r="20"/>
  <text class="d-text" x="200" y="155" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="130" cy="62" r="20"/>
  <text class="d-text" x="130" y="67" text-anchor="middle">3</text>
  <text class="d-sub" x="130" y="26" text-anchor="middle">node</text>
  <text class="d-sub" x="60" y="196" text-anchor="middle">left subtree</text>
  <text class="d-sub" x="200" y="196" text-anchor="middle">right subtree</text>
</svg>

📌 **Interview term: Preorder** — visit the node, then its left subtree, then its right subtree. On the sample tree: \`1, 2, 4, 5, 3, 6\`.

📌 **Interview term: Inorder** — left subtree, then the node, then the right subtree. On the sample tree: \`4, 2, 5, 1, 3, 6\`. On a [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) this gives the values in **sorted order**, which Example 2 checks.

📌 **Interview term: Postorder** — left subtree, right subtree, then the node. On the sample tree: \`4, 5, 2, 6, 3, 1\`. The root is always last.

Level order on the same tree is \`1, 2, 3, 4, 5, 6\`, or grouped by level \`[[1], [2, 3], [4, 5, 6]]\`.

### Which order for which job

| Order | The node is handled... | Typical uses |
| :--- | :--- | :--- |
| Preorder | before its children | copying a tree, [serialising it](/interview-question/how-do-you-serialize-and-deserialize-a-binary-tree), printing a folder structure, passing information *down* (for example a running [path sum](/interview-question/how-do-you-check-if-a-root-to-leaf-path-sums-to-a-target)) |
| Inorder | between its children | reading a BST in sorted order, [validating a BST](/interview-question/how-do-you-validate-that-a-binary-tree-is-a-bst), finding the k-th smallest value |
| Postorder | after its children | anything that needs the children's answers first: [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree), [diameter](/interview-question/how-do-you-compute-the-diameter-of-a-binary-tree), [balance check](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced), freeing memory |
| Level order | level by level | shortest number of edges from the root, [right-side view](/interview-question/how-do-you-get-the-right-side-view-of-a-binary-tree), anything "per level" |

📌 **Interview term: Base case** — the input small enough to answer without recursing. For every traversal it is the empty tree (a missing child): do nothing and return. See [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).

### Recursion versus an explicit stack

The recursive versions are three lines each because the language's **call stack** remembers where you were. Each call waits while its children are processed, and the deepest the call stack ever gets is the **height** of the tree.

📌 **Interview term: Height (h)** — the number of nodes on the longest path from the root down to a leaf (some books count edges instead, one less). A balanced tree of n nodes has a height of about log2 n; a "chain" where every node has only one child has height n.

That is why interviewers often ask for the **iterative** version too: on a chain of 100000 nodes the recursive version uses 100000 nested calls, which many runtimes refuse (the Verified section shows exactly what happens). An explicit stack lives on the heap and has no such limit:

- **Iterative preorder:** pop a node, visit it, push its **right** child and then its **left** child, so the left one comes off first.
- **Iterative inorder:** walk left pushing every node; when you cannot go further left, pop, visit, and move to the right child.
- **Iterative postorder:** run the preorder idea but push left before right, which produces node, right, left; then reverse the list to get left, right, node.

📌 **Interview term: Call stack** — the memory where the runtime keeps one frame per active function call. Its size is limited, so deep recursion can overflow it. See [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 3. The C++ Code, Line by Line

The node struct and the three recursive orders. They differ only in where \`out.push_back(node->val)\` sits:

~~~cpp
struct TreeNode {
    int val;
    TreeNode* left = nullptr;
    TreeNode* right = nullptr;
    explicit TreeNode(int v) : val(v) {}
};

void preorder(TreeNode* node, std::vector<int>& out) {   // node, left, right
    if (!node) return;
    out.push_back(node->val);
    preorder(node->left, out);
    preorder(node->right, out);
}

void inorder(TreeNode* node, std::vector<int>& out) {    // left, node, right
    if (!node) return;
    inorder(node->left, out);
    out.push_back(node->val);
    inorder(node->right, out);
}
~~~

Level order with \`std::queue\`:

~~~cpp
std::vector<std::vector<int>> levelOrder(TreeNode* root) {  // breadth-first
    std::vector<std::vector<int>> levels;
    std::queue<TreeNode*> q;
    if (root) q.push(root);
    while (!q.empty()) {
        size_t size = q.size();               // exactly the nodes of this level
        std::vector<int> level;
        for (size_t k = 0; k < size; k++) {
            TreeNode* node = q.front();
            q.pop();
            level.push_back(node->val);
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
        levels.push_back(level);
    }
    return levels;
}
~~~

The iterative inorder:

~~~cpp
std::vector<int> inorderIt(TreeNode* root) {
    std::vector<int> out;
    std::stack<TreeNode*> st;
    TreeNode* node = root;
    while (!st.empty() || node) {
        while (node) {               // walk as far left as possible
            st.push(node);
            node = node->left;
        }
        node = st.top();             // leftmost unvisited node
        st.pop();
        out.push_back(node->val);
        node = node->right;          // then its right subtree
    }
    return out;
}
~~~

What each C++ piece is doing:

- **\`TreeNode* left = nullptr\`** uses default member initialisers, so a new node never has garbage pointers. \`if (!node)\` is the base case: a null pointer converts to \`false\`.
- **\`std::vector<int>& out\`** is passed by reference, so all calls append to one vector. Passing it by value would copy the vector at every call and the caller would see nothing.
- **\`top()\` then \`pop()\`.** \`std::stack::pop\` and \`std::queue::pop\` return \`void\` ([cppreference: std::stack::pop](https://en.cppreference.com/w/cpp/container/stack/pop)), so you must read \`top()\` or \`front()\` first. Calling \`top()\` on an empty stack is undefined behaviour, which is why the loop checks \`st.empty()\`.
- **\`std::stack\` and \`std::queue\` are adaptors** over \`std::deque\` by default; \`std::vector<TreeNode*>\` with \`push_back\`/\`back\`/\`pop_back\` is an equally good stack.
- **\`std::reverse\`** from \`<algorithm>\` reverses the postorder result in place, and **\`std::is_sorted\`** checks the BST inorder in Example 2.
- **\`std::optional<int>\` and \`NIL\`.** The \`build\` helper takes \`std::vector<std::optional<int>>\`, so \`{1, 2, 3, 4, 5, NIL, 6}\` can mark a missing child; \`NIL\` is just a named \`std::nullopt\`.
- **Freeing the tree.** Every \`new\` needs a \`delete\`. Postorder is the natural order: free both children, then the node.

~~~cpp
void destroy(TreeNode* node) {   // post-order: free children before the parent
    if (!node) return;
    destroy(node->left);
    destroy(node->right);
    delete node;
}
~~~

Example 2 uses an iterative \`destroy\` with a \`std::stack\`, because the recursive one has the same depth problem as any other recursion. An alternative is \`std::unique_ptr<TreeNode>\` children, but each destructor destroys its child before returning, so the destructor chain is itself recursive. When we built a 100000-node chain of \`std::unique_ptr\` nodes and reset the root, the build succeeded and the teardown crashed:

~~~text
built 100000
Segmentation fault
~~~

📌 **Interview term: Stack overflow (segmentation fault)** — in C++ running out of call stack is not an exception you can catch. A recursive depth function compiled with \`g++ -std=c++17\` (no optimisation flags) handled a 100000-node chain, but on a 10000000-node chain the process was killed:

~~~text
depth = 100000
Segmentation fault
~~~

The machine it ran on had the common Linux default stack of 8192 KB (\`ulimit -s\`); the limit differs between systems and threads, which is exactly why the iterative version is the safe answer for unknown input.

### Dry run: iterative inorder on the sample tree

| Step | Action | Stack (bottom to top) | Output so far |
| :--- | :--- | :--- | :--- |
| 1 | walk left from 1: push 1, 2, 4 | 1, 2, 4 | |
| 2 | pop 4, visit, go to its right (none) | 1, 2 | 4 |
| 3 | pop 2, visit, go right to 5 | 1 | 4, 2 |
| 4 | walk left from 5: push 5 | 1, 5 | 4, 2 |
| 5 | pop 5, visit, right is none | 1 | 4, 2, 5 |
| 6 | pop 1, visit, go right to 3 | empty | 4, 2, 5, 1 |
| 7 | walk left from 3: push 3 | 3 | 4, 2, 5, 1 |
| 8 | pop 3, visit, go right to 6; push 6 | 6 | 4, 2, 5, 1, 3 |
| 9 | pop 6, visit; stack empty and no node: stop | empty | 4, 2, 5, 1, 3, 6 |

The stack never holds more nodes than the height of the tree (3 here), which is where the O(h) space comes from.

## 4. Verified: Running the Code

Each example below was saved to a file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3 with -std=c++17). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive preorder, inorder, postorder and level order** printed:

~~~text
preorder:  [1, 2, 4, 5, 3, 6]
inorder:   [4, 2, 5, 1, 3, 6]
postorder: [4, 5, 2, 6, 3, 1]
levels:    [[1], [2, 3], [4, 5, 6]]
flat BFS:  [1, 2, 3, 4, 5, 6]
empty tree: [] []
one node:   [7]
~~~

**Example 2 — Iterative traversals with an explicit stack, a BST and a 100000-node chain** printed:

~~~text
iterative preorder:  [1, 2, 4, 5, 3, 6]
iterative inorder:   [4, 2, 5, 1, 3, 6]
iterative postorder: [4, 5, 2, 6, 3, 1]
inorder matches recursive: true
BST inorder: [1, 3, 4, 6, 7, 8, 10, 13, 14]
BST inorder is sorted: true
left chain of 100000 nodes, iterative inorder visited: 100000
~~~

Example 2 shows the three iterative versions agree with the recursive ones, that inorder on a BST comes out sorted, and that the iterative inorder walks a 100000-node chain that the recursive version could not handle in every runtime.

## 5. Complexity

| Traversal | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Preorder / inorder / postorder (recursive) | O(n) | O(h) | Each node is entered once; the call stack holds one frame per level of the current path |
| Same, iterative with a stack | O(n) | O(h) | Each node is pushed and popped once; the stack holds at most one path (preorder can hold a few siblings, still O(h)) |
| Iterative postorder by reversing | O(n) | O(n) | The output list is reversed at the end; the stack itself is still O(h) |
| Level order (BFS) | O(n) | O(w) | Each node is queued once; the queue holds at most one level, w = the widest level (up to about n/2 in a full tree) |

Here n is the number of nodes and h the height: O(log n) for a balanced tree and O(n) for a chain. Output lists are O(n) in every version and are not counted as "extra". See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read these.

## 6. Edge Cases

- **Empty tree** (\`root\` is null) — every traversal returns an empty list. Example 1 prints \`empty tree: [] []\`.
- **Single node** — all four orders return just that value (\`one node: [7]\`).
- **Missing children** — node \`3\` has only a right child; the base case handles the missing left child without a special branch.
- **A chain (every node has one child)** — height equals n, so recursion depth equals n. Use the iterative version for very deep trees (Example 2 runs a 100000-node chain).
- **Duplicate values** — traversals do not care about values at all; only "sorted inorder" reasoning on a BST depends on how duplicates are placed.

## Common Pitfalls

- **Mixing up the names.** pre = node first, in = node in the middle, post = node last; left before right always.
- **Writing \`TreeNode* node = st.pop();\`.** \`pop()\` returns \`void\`, so this does not compile; read \`st.top()\` first, then \`st.pop()\`.
- **Passing the output vector by value.** \`void inorder(TreeNode* n, std::vector<int> out)\` copies the vector at each call and the caller ends with an empty result. Use \`std::vector<int>&\`.
- **Leaking every node.** Interview code often never deletes; mention it and show a post-order \`destroy\`, or use \`std::unique_ptr\` (keeping in mind its recursive destructor, which crashed on a 100000-node chain in our test).
- **Pushing \`nullptr\` children onto the stack or queue.** It is allowed, but then every pop must check for null; guarding before the push is cleaner.
- **Deep recursion.** A degenerate tree can exhaust the native stack and crash the whole process; there is no exception to catch.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two families:</strong> <span style="color:#f0e2c8;">Depth-first goes deep before wide and has three orders; breadth-first, or level order, goes level by level with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The three DFS orders:</strong> <span style="color:#f0e2c8;">Preorder node-left-right, inorder left-node-right, postorder left-right-node; only the moment the node is visited changes. Inorder of a BST is sorted.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. When to use which:</strong> <span style="color:#f0e2c8;">Preorder to copy or serialise, inorder for BSTs, postorder when a node needs its children results, including freeing memory, level order for per-level questions.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. C++ details:</strong> <span style="color:#f0e2c8;">Recursive functions take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeNode*</code> and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt;&amp;</code>; iteratively I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack</code>, remembering <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> returns void so I read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code> first; I free the tree post-order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">O(n) time; O(h) space for DFS and O(w) for BFS. Deep recursion can segfault, so for untrusted input I use the explicit stack.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is postorder the right order for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">delete</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A node holds the only pointers to its children; if you delete the node first you lose them. Deleting children first, then the node, frees everything exactly once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::unique_ptr</code> for children?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, ownership is then automatic and nothing leaks. The cost is a recursive destructor chain, so a very deep degenerate tree can overflow while being destroyed; an iterative teardown avoids that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Write iterative preorder with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::stack</code>.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push the root; while not empty, read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>, record the value, push the right child then the left child if they exist, so the left child is processed next.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do inorder in O(1) extra space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Morris traversal: temporarily make each inorder predecessor right pointer point to the current node, follow it to climb back, then restore it. O(n) time and O(1) space; it mutates pointers during the walk.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::queue</code> for BFS and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::vector</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS removes from the front; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code> over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::deque</code> does that in O(1), while erasing the front of a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> shifts every element.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Binary tree** | Nodes with up to two children, left and right; the top node is the root, childless nodes are leaves |
| **Traversal** | Visiting every node exactly once in a fixed order |
| **Depth-first search (DFS)** | Go down one branch as far as possible before backing up |
| **Breadth-first search (BFS) / level-order traversal** | Visit level 0, then level 1, and so on, using a queue |
| **Preorder** | Node, then left subtree, then right subtree |
| **Inorder** | Left subtree, then node, then right subtree; sorted on a BST |
| **Postorder** | Left subtree, then right subtree, then node |
| **Base case** | The input answered without recursing; for traversals, the empty tree |
| **Height (h)** | Nodes on the longest root-to-leaf path; about log2 n when balanced, n for a chain |
| **Call stack** | Runtime memory holding one frame per active call; deep recursion can overflow it |
| **Stack overflow (segmentation fault)** | In C++, exhausting the native call stack crashes the process; it cannot be caught as an exception |

---
**Conclusion:** Tree traversal is choosing *when* to handle a node: before its children (preorder), between them (inorder), after them (postorder), or level by level (BFS). In C++ the recursive orders take a \`TreeNode*\` and a vector by reference, \`std::stack\`/\`std::queue\` need \`top()\`/\`front()\` before \`pop()\`, postorder is also how you free the tree, and deep recursion crashes rather than throws — so the iterative versions matter. Learn the four outputs on one small tree and the other tree questions build on them.`,
        examples: [
          {
            label: "Recursive preorder, inorder, postorder and level order",
            code: `#include <iostream>
#include <optional>
#include <queue>
#include <string>
#include <vector>

struct TreeNode {
    int val;
    TreeNode* left = nullptr;
    TreeNode* right = nullptr;
    explicit TreeNode(int v) : val(v) {}
};

const std::nullopt_t NIL = std::nullopt;   // marks a missing child in the input

// Build a tree from level-order values.
TreeNode* build(const std::vector<std::optional<int>>& values) {
    if (values.empty() || !values[0]) return nullptr;
    TreeNode* root = new TreeNode(*values[0]);
    std::queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        TreeNode* node = q.front();
        q.pop();
        if (i < values.size() && values[i]) { node->left = new TreeNode(*values[i]); q.push(node->left); }
        i++;
        if (i < values.size() && values[i]) { node->right = new TreeNode(*values[i]); q.push(node->right); }
        i++;
    }
    return root;
}

void preorder(TreeNode* node, std::vector<int>& out) {   // node, left, right
    if (!node) return;
    out.push_back(node->val);
    preorder(node->left, out);
    preorder(node->right, out);
}

void inorder(TreeNode* node, std::vector<int>& out) {    // left, node, right
    if (!node) return;
    inorder(node->left, out);
    out.push_back(node->val);
    inorder(node->right, out);
}

void postorder(TreeNode* node, std::vector<int>& out) {  // left, right, node
    if (!node) return;
    postorder(node->left, out);
    postorder(node->right, out);
    out.push_back(node->val);
}

std::vector<std::vector<int>> levelOrder(TreeNode* root) {  // breadth-first
    std::vector<std::vector<int>> levels;
    std::queue<TreeNode*> q;
    if (root) q.push(root);
    while (!q.empty()) {
        size_t size = q.size();               // exactly the nodes of this level
        std::vector<int> level;
        for (size_t k = 0; k < size; k++) {
            TreeNode* node = q.front();
            q.pop();
            level.push_back(node->val);
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
        levels.push_back(level);
    }
    return levels;
}

void destroy(TreeNode* node) {   // post-order: free children before the parent
    if (!node) return;
    destroy(node->left);
    destroy(node->right);
    delete node;
}

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

std::string fmt(const std::vector<std::vector<int>>& xss) {
    std::string s = "[";
    for (size_t i = 0; i < xss.size(); i++) s += (i ? ", " : "") + fmt(xss[i]);
    return s + "]";
}

int main() {
    TreeNode* root = build({1, 2, 3, 4, 5, NIL, 6});
    std::vector<int> pre, in, post, flat, empty;
    preorder(root, pre);
    inorder(root, in);
    postorder(root, post);
    std::cout << "preorder:  " << fmt(pre) << "\\n";    // [1, 2, 4, 5, 3, 6]
    std::cout << "inorder:   " << fmt(in) << "\\n";     // [4, 2, 5, 1, 3, 6]
    std::cout << "postorder: " << fmt(post) << "\\n";   // [4, 5, 2, 6, 3, 1]
    std::cout << "levels:    " << fmt(levelOrder(root)) << "\\n";  // [[1], [2, 3], [4, 5, 6]]
    for (const auto& level : levelOrder(root)) flat.insert(flat.end(), level.begin(), level.end());
    std::cout << "flat BFS:  " << fmt(flat) << "\\n";   // [1, 2, 3, 4, 5, 6]
    preorder(nullptr, empty);
    std::cout << "empty tree: " << fmt(empty) << " " << fmt(levelOrder(nullptr)) << "\\n";
    TreeNode* one = build({7});
    std::vector<int> oneIn;
    inorder(one, oneIn);
    std::cout << "one node:   " << fmt(oneIn) << "\\n";  // [7]
    destroy(root);
    destroy(one);
}
`,
          },
          {
            label: "Iterative traversals with an explicit stack, a BST and a 100000-node chain",
            code: `#include <algorithm>
#include <iostream>
#include <optional>
#include <queue>
#include <stack>
#include <string>
#include <vector>

struct TreeNode {
    int val;
    TreeNode* left = nullptr;
    TreeNode* right = nullptr;
    explicit TreeNode(int v, TreeNode* l = nullptr) : val(v), left(l) {}
};

const std::nullopt_t NIL = std::nullopt;

TreeNode* build(const std::vector<std::optional<int>>& values) {
    if (values.empty() || !values[0]) return nullptr;
    TreeNode* root = new TreeNode(*values[0]);
    std::queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        TreeNode* node = q.front();
        q.pop();
        if (i < values.size() && values[i]) { node->left = new TreeNode(*values[i]); q.push(node->left); }
        i++;
        if (i < values.size() && values[i]) { node->right = new TreeNode(*values[i]); q.push(node->right); }
        i++;
    }
    return root;
}

void inorderRec(TreeNode* node, std::vector<int>& out) {
    if (!node) return;
    inorderRec(node->left, out);
    out.push_back(node->val);
    inorderRec(node->right, out);
}

std::vector<int> preorderIt(TreeNode* root) {
    std::vector<int> out;
    std::stack<TreeNode*> st;
    if (root) st.push(root);
    while (!st.empty()) {
        TreeNode* node = st.top();   // top() reads, pop() removes and returns void
        st.pop();
        out.push_back(node->val);
        if (node->right) st.push(node->right);  // right first so left pops first
        if (node->left) st.push(node->left);
    }
    return out;
}

std::vector<int> inorderIt(TreeNode* root) {
    std::vector<int> out;
    std::stack<TreeNode*> st;
    TreeNode* node = root;
    while (!st.empty() || node) {
        while (node) {               // walk as far left as possible
            st.push(node);
            node = node->left;
        }
        node = st.top();             // leftmost unvisited node
        st.pop();
        out.push_back(node->val);
        node = node->right;          // then its right subtree
    }
    return out;
}

std::vector<int> postorderIt(TreeNode* root) {
    std::vector<int> out;
    std::stack<TreeNode*> st;
    if (root) st.push(root);
    while (!st.empty()) {            // produces node, right, left ...
        TreeNode* node = st.top();
        st.pop();
        out.push_back(node->val);
        if (node->left) st.push(node->left);
        if (node->right) st.push(node->right);
    }
    std::reverse(out.begin(), out.end());  // ... reversed: left, right, node
    return out;
}

void destroy(TreeNode* root) {       // iterative, so a deep chain cannot overflow the stack
    std::stack<TreeNode*> st;
    if (root) st.push(root);
    while (!st.empty()) {
        TreeNode* node = st.top();
        st.pop();
        if (node->left) st.push(node->left);
        if (node->right) st.push(node->right);
        delete node;
    }
}

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

int main() {
    std::cout << std::boolalpha;
    TreeNode* root = build({1, 2, 3, 4, 5, NIL, 6});
    std::cout << "iterative preorder:  " << fmt(preorderIt(root)) << "\\n";   // [1, 2, 4, 5, 3, 6]
    std::cout << "iterative inorder:   " << fmt(inorderIt(root)) << "\\n";    // [4, 2, 5, 1, 3, 6]
    std::cout << "iterative postorder: " << fmt(postorderIt(root)) << "\\n";  // [4, 5, 2, 6, 3, 1]
    std::vector<int> rec;
    inorderRec(root, rec);
    std::cout << "inorder matches recursive: " << (inorderIt(root) == rec) << "\\n";

    TreeNode* bst = build({8, 3, 10, 1, 6, NIL, 14, NIL, NIL, 4, 7, 13});
    std::vector<int> in = inorderIt(bst);
    std::cout << "BST inorder: " << fmt(in) << "\\n";   // [1, 3, 4, 6, 7, 8, 10, 13, 14]
    std::cout << "BST inorder is sorted: " << std::is_sorted(in.begin(), in.end()) << "\\n";

    TreeNode* chain = nullptr;
    for (int v = 100000; v >= 1; v--) chain = new TreeNode(v, chain);  // each with only a left child
    std::cout << "left chain of 100000 nodes, iterative inorder visited: " << inorderIt(chain).size() << "\\n";
    destroy(root);
    destroy(bst);
    destroy(chain);
}
`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you find the maximum depth of a binary tree?",
    difficulty: "easy",
    seoDescription: "Maximum depth of a binary tree in Python, JavaScript, Java and C++: recursion, BFS and stack versions, the min-depth trap and verified output.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given the root of a binary tree, write a Python function that returns its maximum depth: the number of nodes on the longest path from the root down to a leaf. Start with whatever is simplest, then tell me what happens if the tree is a very long chain."

**What a strong answer should cover:**
- The recurrence \`depth(None) = 0\`, \`depth(node) = 1 + max(depth(left), depth(right))\`, and that it is a postorder traversal.
- O(n) time because every node is visited once; O(h) space for the call stack, which is O(n) for a chain.
- An iterative alternative: BFS counting levels with \`collections.deque\`, or a stack of \`(node, depth)\` tuples.
- Clarifying nodes versus edges and the empty-tree answer; awareness of the minimum-depth trap with one-child nodes.
- Python specifics: the default recursion limit of 1000 means a 1000-deep chain raises \`RecursionError\`; use \`deque.popleft()\` not \`list.pop(0)\`; tuple unpacking \`node, d = stack.pop()\` keeps the stack version short.

**Clarifying questions expected:**
- "Is depth counted in nodes or edges, and what should an empty tree return?"
- "Could the tree be very deep, like a linked list?"

**Code / implementation expected:** Yes — a recursive Python function, ideally followed by an iterative BFS or stack version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a binary tree is.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Python version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Picture a family tree drawn on a wall: great-grandmother at the top, her children below, their children below that. Someone asks, "How many generations are on this wall?" You do not need to count everyone. You only need the longest line from the top down to someone with no children.

There is a lazy and clever way to answer. Ask each of great-grandmother's children, "How many generations are there from you downwards?" Each of them asks their own children the same question, and so on. A person with no children answers "just me: 1". Every parent takes the bigger of their children's answers and adds 1 for themselves. When the answers reach the top, you have the number of generations.

That is the whole algorithm for maximum depth. It is the warm-up tree question because it shows whether you can trust recursion: solve the problem for the two subtrees, combine the two answers, and handle the empty tree. The same "ask the children, combine, add one" shape powers [diameter](/interview-question/how-do-you-compute-the-diameter-of-a-binary-tree), [balance checking](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced) and many more.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is depth counted in **nodes** or in **edges**? | The usual version (LeetCode 104) counts nodes, so a single node has depth 1. Counting edges gives one less, and an empty tree is then usually -1. |
| What should an empty tree return? | With node counting it is 0; confirm it so the base case is right. |
| How deep can the tree be? Could it be a long chain? | A chain of 100000 nodes breaks plain recursion in many runtimes; you would then write the iterative version. |
| Is it a binary tree, or can a node have many children? | The idea is the same; with many children you take the max over a list instead of two values. |
| Do you want the **maximum** or the **minimum** depth? | Minimum depth has a trap with one-child nodes, covered below. |

## 3. The Core Idea

📌 **Interview term: Maximum depth (height)** — the number of nodes on the longest path from the root down to a leaf. A leaf is a node with no children. An empty tree has depth 0, a single node has depth 1.

📌 **Interview term: Recurrence** — a rule that defines the answer for a node in terms of the answers for smaller inputs. Here:

- \`depth(empty) = 0\`
- \`depth(node) = 1 + max(depth(node.left), depth(node.right))\`

The \`1\` counts the node itself; the \`max\` picks the deeper side. Each node needs its children's answers **before** it can answer, so the recursion is a **postorder** traversal (children first, then the node). The [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods) page explains the orders.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 300" role="img" aria-label="Tree 3, 9, 20, 15, 7. Leaves 9, 15 and 7 return 1, node 20 returns 1 plus max of 1 and 1 which is 2, the root returns 1 plus max of 1 and 2 which is 3">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge-accent" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="408" y1="156" x2="362" y2="214"/>
  <line class="d-edge" x1="432" y1="156" x2="478" y2="214"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">3</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">9</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">20</text>
  <circle class="d-box-muted" cx="350" cy="230" r="20"/>
  <text class="d-text" x="350" y="235" text-anchor="middle">15</text>
  <circle class="d-box-muted" cx="490" cy="230" r="20"/>
  <text class="d-text" x="490" y="235" text-anchor="middle">7</text>
  <text class="d-text d-accent" x="240" y="45" text-anchor="end">1 + max(1, 2) = 3</text>
  <text class="d-sub" x="180" y="186" text-anchor="middle">leaf: returns 1</text>
  <text class="d-sub" x="460" y="120" text-anchor="start">1 + max(1, 1) = 2</text>
  <text class="d-sub" x="350" y="276" text-anchor="middle">returns 1</text>
  <text class="d-sub" x="490" y="276" text-anchor="middle">returns 1</text>
</svg>

The answers flow **upward**: the three leaves return 1, node \`20\` returns 2, and the root returns 3. The highlighted edge is the side that won the \`max\` at the root.

📌 **Interview term: Divide and conquer** — split a problem into independent smaller problems (here: the left subtree and the right subtree), solve each, then combine the results (here: \`1 + max\`).

### The other way: count levels with a queue

A [level-order (BFS) traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree) visits the tree one level at a time. If you count how many levels you process, that count **is** the depth:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="The same tree processed level by level with a queue: level 1 holds 3, level 2 holds 9 and 20, level 3 holds 15 and 7, so the depth is 3">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="408" y1="156" x2="362" y2="214"/>
  <line class="d-edge" x1="432" y1="156" x2="478" y2="214"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">3</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">9</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">20</text>
  <circle class="d-box-muted" cx="350" cy="230" r="20"/>
  <text class="d-text" x="350" y="235" text-anchor="middle">15</text>
  <circle class="d-box-muted" cx="490" cy="230" r="20"/>
  <text class="d-text" x="490" y="235" text-anchor="middle">7</text>
  <text class="d-sub" x="580" y="55" text-anchor="start">level 1: queue [3]</text>
  <text class="d-sub" x="580" y="145" text-anchor="start">level 2: queue [9, 20]</text>
  <text class="d-sub" x="580" y="235" text-anchor="start">level 3: queue [15, 7]</text>
</svg>

Each pass of the outer loop removes exactly the nodes of one level from the queue and adds their children, so the loop runs once per level.

📌 **Interview term: Breadth-first search (BFS)** — visiting nodes in order of distance from the root, using a first-in-first-out **queue**. See [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs).

A third option is **iterative DFS**: put \`(node, depth)\` pairs on an explicit stack, and keep the largest depth you pop. It avoids recursion without the wide queue BFS needs.

### The minimum-depth trap

Interviewers often follow up with "now the **minimum** depth". The naive change \`1 + min(left, right)\` is wrong. For the tree \`[1, null, 2]\` (root \`1\` with only a right child \`2\`) it returns 1, because the missing left child counts as depth 0. But a missing child is not a leaf; the only leaf is \`2\`, so the answer is 2. The fix: if one child is missing, the path must go through the other one. Example 1 prints both depths so you can see the difference.

## 4. Brute Force First, Then the Clean Solutions

**Brute force — list every root-to-leaf path.** Walk the tree, copy the current path into a list each time you reach a leaf, and take the longest list. It gives the right answer but copies a path of up to h nodes at every leaf, so it costs O(n · h) time and memory it does not need.

**Better — just return a number.** Every node must be looked at at least once (the deepest leaf could be anywhere), so O(n) time is the best possible. The recursive version does exactly one visit per node and keeps only one number per call. BFS and iterative DFS do the same work with an explicit queue or stack.

| Approach | Time | Extra space | When to choose it |
| :--- | :--- | :--- | :--- |
| Recursive DFS | O(n) | O(h) call stack | Default: shortest and clearest |
| BFS level count | O(n) | O(w) queue, w = widest level | Deep, narrow trees; or when you also need per-level data |
| Iterative DFS with (node, depth) | O(n) | O(h) explicit stack | Deep trees where recursion would overflow |

Example 2 measures the memory difference: on a perfect tree of 1023 nodes the BFS queue reaches 512 nodes (the whole bottom level) while the DFS stack never holds more than 10; on a 100000-node chain both hold just 1.

## 5. The Python Code, Line by Line

The recursive version is the answer interviewers expect first:

~~~python
def max_depth(node):
    if node is None:                      # an empty tree has depth 0
        return 0
    return 1 + max(max_depth(node.left), max_depth(node.right))
~~~

The BFS version counts levels:

~~~python
from collections import deque


def depth_bfs(root):
    if root is None:
        return 0
    queue, depth = deque([root]), 0
    while queue:
        depth += 1
        for _ in range(len(queue)):       # remove exactly one level
            node = queue.popleft()
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
    return depth
~~~

And the iterative DFS keeps \`(node, depth)\` tuples on a list used as a stack:

~~~python
def depth_dfs(root):
    best = 0
    stack = [(root, 1)] if root else []
    while stack:
        node, d = stack.pop()             # tuple unpacking
        best = max(best, d)
        if node.right:
            stack.append((node.right, d + 1))
        if node.left:
            stack.append((node.left, d + 1))
    return best
~~~

(Example 2 also tracks the peak queue and stack size; the logic is the same.)

What each Python piece is doing:

- **\`if node is None: return 0\`** is the base case. Every missing child returns 0, so a leaf gets \`1 + max(0, 0) = 1\` without any leaf test.
- **\`max(a, b)\`** is the built-in; it also takes any iterable, so for a tree with a list of \`children\` you would write \`1 + max((depth(c) for c in node.children), default=0)\`.
- **\`deque([root])\`** builds the queue; \`popleft()\` removes from the front in O(1). The [collections documentation](https://docs.python.org/3/library/collections.html#collections.deque) describes deques as supporting pops from either side in approximately O(1), whereas \`list.pop(0)\` must shift every element.
- **\`for _ in range(len(queue))\`** — \`range\` is evaluated once, so the loop removes exactly the nodes that were in the queue when this level started, even though children are appended during the loop.
- **Tuples on the stack.** \`(node.right, d + 1)\` stores the depth together with the node, and \`node, d = stack.pop()\` unpacks it.

📌 **Interview term: Recursion limit** — Python refuses to nest calls deeper than \`sys.getrecursionlimit()\`. When the recursive \`max_depth\` above ran on a chain of 100000 nodes:

~~~text
recursion limit: 1000
RecursionError: maximum recursion depth exceeded
~~~

So in Python the recursive version only works for trees whose height is below roughly 1000. The BFS and stack versions in Example 2 handled the 100000-node chain. \`sys.setrecursionlimit\` can raise the limit, but the [sys documentation](https://docs.python.org/3/library/sys.html#sys.setrecursionlimit) warns that too high a limit can crash the interpreter, so the iterative versions are the safer answer.

### Dry run on \`[3, 9, 20, null, null, 15, 7]\`

| Call | Left answer | Right answer | Returns |
| :--- | :--- | :--- | :--- |
| \`depth(9)\` | \`depth(null)\` = 0 | \`depth(null)\` = 0 | 1 + max(0, 0) = **1** |
| \`depth(15)\` | 0 | 0 | **1** |
| \`depth(7)\` | 0 | 0 | **1** |
| \`depth(20)\` | \`depth(15)\` = 1 | \`depth(7)\` = 1 | 1 + max(1, 1) = **2** |
| \`depth(3)\` | \`depth(9)\` = 1 | \`depth(20)\` = 2 | 1 + max(1, 2) = **3** |

The calls finish in postorder: 9, 15, 7, 20, then the root.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`python3 main.py\` (Python 3.13). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive maximum depth (and the minimum-depth trap) on five trees** printed:

~~~text
maxDepth([3, 9, 20, null, null, 15, 7]) = 3, minDepth = 2
maxDepth([]) = 0, minDepth = 0
maxDepth([1]) = 1, minDepth = 1
maxDepth([1, null, 2]) = 2, minDepth = 2
maxDepth([1, 2, 3, 4, null, null, 5, 6]) = 4, minDepth = 3
~~~

**Example 2 — Iterative BFS and DFS: depth plus peak queue and stack sizes** printed:

~~~text
example tree: bfs depth 3 (peak queue 2), dfs depth 3 (peak stack 2)
empty tree: bfs depth 0 (peak queue 0), dfs depth 0 (peak stack 0)
perfect tree of 1023 nodes: bfs depth 10 (peak queue 512), dfs depth 10 (peak stack 10)
left chain of 100000 nodes: bfs depth 100000 (peak queue 1), dfs depth 100000 (peak stack 1)
~~~

In Example 1, \`[1, null, 2]\` has minimum depth 2, not 1, because the root is not a leaf. In Example 2 the perfect tree makes the BFS queue hold 512 nodes while the DFS stack holds 10, and the 100000-node chain finishes in both iterative versions.

## 7. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive | O(n) | O(h) | One call per node; the call stack holds one frame per node on the current path |
| BFS level count | O(n) | O(w) | Each node enters and leaves the queue once; the queue holds at most one level (512 of 1023 nodes in Example 2) |
| Iterative DFS | O(n) | O(h) | Each node is pushed and popped once; the stack holds about one path plus waiting siblings |

h is the height: about log2 n for a balanced tree, n for a chain. w is the widest level: up to about n/2 for a perfect tree. See [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 8. Edge Cases

- **Empty tree** — returns 0 from the base case; no special code needed.
- **Single node** — \`1 + max(0, 0) = 1\`.
- **Only right children (or only left)** — \`[1, null, 2]\` has depth 2; the missing side contributes 0 and loses the \`max\`.
- **Very deep chain** — depth equals n. Recursion may overflow; the BFS and stack versions in Example 2 handle 100000 nodes.
- **Unbalanced shapes** — \`[1, 2, 3, 4, null, null, 5, 6]\` has depth 4 through \`1 → 2 → 4 → 6\` even though the other side stops at 3.
- **Minimum depth on one-child nodes** — do not treat a missing child as a leaf (the trap above).

## Common Pitfalls

- **Returning 1 for an empty tree.** Then every leaf reports 2 and the whole answer is off by one. The base case for \`None\` must be 0 (when counting nodes).
- **Using \`min\` for minimum depth without the one-child rule.** \`[1, None, 2]\` would return 1; Example 1 shows the correct answer is 2.
- **\`list.pop(0)\` as the BFS queue.** Each call shifts the list, so BFS becomes O(n²) on wide trees. Use \`deque.popleft()\`.
- **Recursing on a deep chain.** The default limit of 1000 is easy to hit; prefer the iterative version when the height could be large.
- **Reading \`len(queue)\` inside a \`while\` instead of fixing it per level.** Writing \`while i < len(queue)\` re-reads the growing length and merges levels; \`for _ in range(len(queue))\` freezes it.
- **Global or class-level counters.** A \`self.best\` updated during recursion works but is easy to forget to reset between test cases; returning the value is cleaner.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The recurrence:</strong> <span style="color:#f0e2c8;">An empty tree has depth 0; otherwise depth is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + max(depth(left), depth(right))</code>, so each node asks its children and adds one for itself.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">The longest root-to-leaf path goes through the root and then down whichever subtree is deeper, so taking the max of the two subtree depths and adding 1 is exactly that path.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">Every node is visited once, so O(n) time; the recursion is O(h) stack, which is O(log n) when balanced and O(n) for a chain.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Python details:</strong> <span style="color:#f0e2c8;">In Python the default recursion limit is 1000, so for a possibly deep tree I count levels with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque</code> or keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(node, depth)</code> tuples on a list used as a stack.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Follow-up awareness:</strong> <span style="color:#f0e2c8;">If asked for minimum depth, I would not just swap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min</code>: a missing child is not a leaf, so a one-child node must take the depth of its only child.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes if depth is counted in edges?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return -1 for an empty tree (or subtract 1 at the end), so a single node has depth 0. The recurrence itself stays <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + max(left, right)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Write minimum depth.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If the node is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> return 0; if one child is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + min_depth(other child)</code>; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + min(both)</code>. BFS is even better here: return the level number of the first leaf you dequeue, which can stop early.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you do this for a tree where each node has a list of children?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + max((depth(c) for c in node.children), default=0)</code>; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">default=0</code> handles a node with no children.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">BFS or DFS, which uses less memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It depends on shape. On a perfect tree the BFS queue holds the bottom level, about n/2 nodes (512 of 1023 in Example 2), while DFS holds about h. On a chain both hold one node.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you get the depth of every node, not just the maximum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: pass the depth down in a preorder walk (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(node, d)</code> tuples), or record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">depth</code> when BFS dequeues each node. That gives a dict from node to depth in O(n).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Maximum depth (height)** | Number of nodes on the longest root-to-leaf path; 0 for an empty tree |
| **Recurrence** | A rule defining an answer from answers to smaller inputs, here \`1 + max(left, right)\` |
| **Divide and conquer** | Solve independent subproblems (the two subtrees), then combine the results |
| **Breadth-first search (BFS)** | Visiting nodes level by level with a first-in-first-out queue |
| **Recursion limit** | Python cap on nested calls (1000 by default); exceeding it raises \`RecursionError\` |

---
**Conclusion:** Maximum depth is \`1 + max(depth(left), depth(right))\` with 0 for an empty tree: one visit per node, O(n) time and O(h) stack. In Python the recursion limit of 1000 makes the iterative versions — BFS with \`collections.deque\` or a list of \`(node, depth)\` tuples — the ones to reach for on deep trees, and the minimum-depth follow-up needs the one-child rule rather than a plain \`min\`.`,
        examples: [
          {
            label: "Recursive maximum depth (and the minimum-depth trap) on five trees",
            code: `from collections import deque


class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def build(values):
    """Build a tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root


def max_depth(node):
    if node is None:                      # an empty tree has depth 0
        return 0
    return 1 + max(max_depth(node.left), max_depth(node.right))


def min_depth(node):
    if node is None:
        return 0
    if node.left is None:                 # only one child: the path must go through it
        return 1 + min_depth(node.right)
    if node.right is None:
        return 1 + min_depth(node.left)
    return 1 + min(min_depth(node.left), min_depth(node.right))


def show(text, values):
    root = build(values)
    return "maxDepth(" + text + ") = " + str(max_depth(root)) + ", minDepth = " + str(min_depth(root))


print(show("[3, 9, 20, null, null, 15, 7]", [3, 9, 20, None, None, 15, 7]))  # maxDepth([3, 9, 20, null, null, 15, 7]) = 3, minDepth = 2
print(show("[]", []))  # maxDepth([]) = 0, minDepth = 0
print(show("[1]", [1]))  # maxDepth([1]) = 1, minDepth = 1
print(show("[1, null, 2]", [1, None, 2]))  # maxDepth([1, null, 2]) = 2, minDepth = 2
print(show("[1, 2, 3, 4, null, null, 5, 6]", [1, 2, 3, 4, None, None, 5, 6]))  # maxDepth([1, 2, 3, 4, null, null, 5, 6]) = 4, minDepth = 3
`,
          },
          {
            label: "Iterative BFS and DFS: depth plus peak queue and stack sizes",
            code: `from collections import deque


class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def build(values):
    """Build a tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root


def depth_bfs(root):
    """Count levels with a queue. Returns (depth, largest queue size)."""
    if root is None:
        return 0, 0
    queue, depth, peak = deque([root]), 0, 1
    while queue:
        depth += 1
        for _ in range(len(queue)):       # remove exactly one level
            node = queue.popleft()
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        peak = max(peak, len(queue))
    return depth, peak


def depth_dfs(root):
    """Explicit stack of (node, depth) pairs. Returns (depth, largest stack size)."""
    best, peak = 0, 0
    stack = [(root, 1)] if root else []
    while stack:
        peak = max(peak, len(stack))
        node, d = stack.pop()
        best = max(best, d)
        if node.right:
            stack.append((node.right, d + 1))
        if node.left:
            stack.append((node.left, d + 1))
    return best, peak


def report(name, root):
    b, qpeak = depth_bfs(root)
    d, speak = depth_dfs(root)
    return name + ": bfs depth " + str(b) + " (peak queue " + str(qpeak) + "), dfs depth " + str(d) + " (peak stack " + str(speak) + ")"


print(report("example tree", build([3, 9, 20, None, None, 15, 7])))  # example tree: bfs depth 3 (peak queue 2), dfs depth 3 (peak stack 2)
print(report("empty tree", None))  # empty tree: bfs depth 0 (peak queue 0), dfs depth 0 (peak stack 0)
print(report("perfect tree of 1023 nodes", build(list(range(1, 1024)))))  # perfect tree of 1023 nodes: bfs depth 10 (peak queue 512), dfs depth 10 (peak stack 10)

chain = None
for v in range(100000):                   # every node has only a left child
    chain = TreeNode(v, chain)
print(report("left chain of 100000 nodes", chain))  # left chain of 100000 nodes: bfs depth 100000 (peak queue 1), dfs depth 100000 (peak stack 1)
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given the root of a binary tree, write a JavaScript function maxDepth(root) that returns the number of nodes on the longest path from the root to a leaf. Then tell me how you would handle a tree that is really a long chain."

**What a strong answer should cover:**
- The recurrence \`maxDepth(null) = 0\`, \`maxDepth(node) = 1 + Math.max(left, right)\`, and that it is postorder.
- O(n) time; O(h) space for recursion, which is O(n) for a chain.
- An iterative alternative: BFS counting levels, or a stack of \`[node, depth]\` pairs.
- Clarify node versus edge counting and the empty-tree answer; know the minimum-depth trap.
- JavaScript specifics: deep recursion throws \`RangeError: Maximum call stack size exceeded\`; avoid \`shift()\` loops for the BFS queue; destructuring \`const [node, d] = stack.pop()\`; \`Math.max()\` with no arguments is \`-Infinity\`, so do not spread an empty array into it.

**Clarifying questions expected:**
- "Do we count nodes or edges, and what does an empty tree return?"
- "Could the tree be very deep, like a linked list?"

**Code / implementation expected:** Yes — a recursive JavaScript function, then an iterative BFS or stack version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a binary tree is.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this JavaScript version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Picture a family tree drawn on a wall: great-grandmother at the top, her children below, their children below that. Someone asks, "How many generations are on this wall?" You do not need to count everyone. You only need the longest line from the top down to someone with no children.

There is a lazy and clever way to answer. Ask each of great-grandmother's children, "How many generations are there from you downwards?" Each of them asks their own children the same question, and so on. A person with no children answers "just me: 1". Every parent takes the bigger of their children's answers and adds 1 for themselves. When the answers reach the top, you have the number of generations.

That is the whole algorithm for maximum depth. It is the warm-up tree question because it shows whether you can trust recursion: solve the problem for the two subtrees, combine the two answers, and handle the empty tree. The same "ask the children, combine, add one" shape powers [diameter](/interview-question/how-do-you-compute-the-diameter-of-a-binary-tree), [balance checking](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced) and many more.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is depth counted in **nodes** or in **edges**? | The usual version (LeetCode 104) counts nodes, so a single node has depth 1. Counting edges gives one less, and an empty tree is then usually -1. |
| What should an empty tree return? | With node counting it is 0; confirm it so the base case is right. |
| How deep can the tree be? Could it be a long chain? | A chain of 100000 nodes breaks plain recursion in many runtimes; you would then write the iterative version. |
| Is it a binary tree, or can a node have many children? | The idea is the same; with many children you take the max over a list instead of two values. |
| Do you want the **maximum** or the **minimum** depth? | Minimum depth has a trap with one-child nodes, covered below. |

## 3. The Core Idea

📌 **Interview term: Maximum depth (height)** — the number of nodes on the longest path from the root down to a leaf. A leaf is a node with no children. An empty tree has depth 0, a single node has depth 1.

📌 **Interview term: Recurrence** — a rule that defines the answer for a node in terms of the answers for smaller inputs. Here:

- \`depth(empty) = 0\`
- \`depth(node) = 1 + max(depth(node.left), depth(node.right))\`

The \`1\` counts the node itself; the \`max\` picks the deeper side. Each node needs its children's answers **before** it can answer, so the recursion is a **postorder** traversal (children first, then the node). The [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods) page explains the orders.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 300" role="img" aria-label="Tree 3, 9, 20, 15, 7. Leaves 9, 15 and 7 return 1, node 20 returns 1 plus max of 1 and 1 which is 2, the root returns 1 plus max of 1 and 2 which is 3">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge-accent" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="408" y1="156" x2="362" y2="214"/>
  <line class="d-edge" x1="432" y1="156" x2="478" y2="214"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">3</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">9</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">20</text>
  <circle class="d-box-muted" cx="350" cy="230" r="20"/>
  <text class="d-text" x="350" y="235" text-anchor="middle">15</text>
  <circle class="d-box-muted" cx="490" cy="230" r="20"/>
  <text class="d-text" x="490" y="235" text-anchor="middle">7</text>
  <text class="d-text d-accent" x="240" y="45" text-anchor="end">1 + max(1, 2) = 3</text>
  <text class="d-sub" x="180" y="186" text-anchor="middle">leaf: returns 1</text>
  <text class="d-sub" x="460" y="120" text-anchor="start">1 + max(1, 1) = 2</text>
  <text class="d-sub" x="350" y="276" text-anchor="middle">returns 1</text>
  <text class="d-sub" x="490" y="276" text-anchor="middle">returns 1</text>
</svg>

The answers flow **upward**: the three leaves return 1, node \`20\` returns 2, and the root returns 3. The highlighted edge is the side that won the \`max\` at the root.

📌 **Interview term: Divide and conquer** — split a problem into independent smaller problems (here: the left subtree and the right subtree), solve each, then combine the results (here: \`1 + max\`).

### The other way: count levels with a queue

A [level-order (BFS) traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree) visits the tree one level at a time. If you count how many levels you process, that count **is** the depth:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="The same tree processed level by level with a queue: level 1 holds 3, level 2 holds 9 and 20, level 3 holds 15 and 7, so the depth is 3">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="408" y1="156" x2="362" y2="214"/>
  <line class="d-edge" x1="432" y1="156" x2="478" y2="214"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">3</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">9</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">20</text>
  <circle class="d-box-muted" cx="350" cy="230" r="20"/>
  <text class="d-text" x="350" y="235" text-anchor="middle">15</text>
  <circle class="d-box-muted" cx="490" cy="230" r="20"/>
  <text class="d-text" x="490" y="235" text-anchor="middle">7</text>
  <text class="d-sub" x="580" y="55" text-anchor="start">level 1: queue [3]</text>
  <text class="d-sub" x="580" y="145" text-anchor="start">level 2: queue [9, 20]</text>
  <text class="d-sub" x="580" y="235" text-anchor="start">level 3: queue [15, 7]</text>
</svg>

Each pass of the outer loop removes exactly the nodes of one level from the queue and adds their children, so the loop runs once per level.

📌 **Interview term: Breadth-first search (BFS)** — visiting nodes in order of distance from the root, using a first-in-first-out **queue**. See [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs).

A third option is **iterative DFS**: put \`(node, depth)\` pairs on an explicit stack, and keep the largest depth you pop. It avoids recursion without the wide queue BFS needs.

### The minimum-depth trap

Interviewers often follow up with "now the **minimum** depth". The naive change \`1 + min(left, right)\` is wrong. For the tree \`[1, null, 2]\` (root \`1\` with only a right child \`2\`) it returns 1, because the missing left child counts as depth 0. But a missing child is not a leaf; the only leaf is \`2\`, so the answer is 2. The fix: if one child is missing, the path must go through the other one. Example 1 prints both depths so you can see the difference.

## 4. Brute Force First, Then the Clean Solutions

**Brute force — list every root-to-leaf path.** Walk the tree, copy the current path into a list each time you reach a leaf, and take the longest list. It gives the right answer but copies a path of up to h nodes at every leaf, so it costs O(n · h) time and memory it does not need.

**Better — just return a number.** Every node must be looked at at least once (the deepest leaf could be anywhere), so O(n) time is the best possible. The recursive version does exactly one visit per node and keeps only one number per call. BFS and iterative DFS do the same work with an explicit queue or stack.

| Approach | Time | Extra space | When to choose it |
| :--- | :--- | :--- | :--- |
| Recursive DFS | O(n) | O(h) call stack | Default: shortest and clearest |
| BFS level count | O(n) | O(w) queue, w = widest level | Deep, narrow trees; or when you also need per-level data |
| Iterative DFS with (node, depth) | O(n) | O(h) explicit stack | Deep trees where recursion would overflow |

Example 2 measures the memory difference: on a perfect tree of 1023 nodes the BFS queue reaches 512 nodes (the whole bottom level) while the DFS stack never holds more than 10; on a 100000-node chain both hold just 1.

## 5. The JavaScript Code, Line by Line

The recursive version:

~~~javascript
function maxDepth(node) {
  if (node === null) return 0;            // an empty tree has depth 0
  return 1 + Math.max(maxDepth(node.left), maxDepth(node.right));
}
~~~

BFS, one level array at a time:

~~~javascript
function depthBfs(root) {
  if (root === null) return 0;
  let level = [root];
  let depth = 0;
  while (level.length > 0) {
    depth++;
    const next = [];
    for (const node of level) {
      if (node.left) next.push(node.left);
      if (node.right) next.push(node.right);
    }
    level = next;
  }
  return depth;
}
~~~

Iterative DFS with \`[node, depth]\` pairs:

~~~javascript
function depthDfs(root) {
  let best = 0;
  const stack = root ? [[root, 1]] : [];
  while (stack.length > 0) {
    const [node, d] = stack.pop();        // array destructuring
    best = Math.max(best, d);
    if (node.right) stack.push([node.right, d + 1]);
    if (node.left) stack.push([node.left, d + 1]);
  }
  return best;
}
~~~

(Example 2 also records the largest level and stack size.)

What each JavaScript piece is doing:

- **\`node === null\`** is the base case; the example trees use \`null\` for missing children. If your nodes come from JSON where missing children are simply absent (\`undefined\`), write \`if (!node)\` instead.
- **\`Math.max(a, b)\`** returns the larger number. Careful with the n-ary version: \`Math.max(...[])\` returns \`-Infinity\`, so \`1 + Math.max(...children.map(depth))\` gives \`-Infinity\` for a leaf; use \`Math.max(0, ...children.map(depth))\`.
- **Level arrays instead of \`shift()\`.** Building a \`next\` array per level is O(n) overall. The [ECMAScript specification](https://tc39.es/ecma262/#sec-array.prototype.shift) defines \`shift\` as moving every remaining element down one index, so a loop of shifts is not guaranteed to be fast.
- **\`const [node, d] = stack.pop()\`** unpacks the pair; it is the JavaScript equivalent of a tuple.

📌 **Interview term: Stack overflow (\`RangeError\`)** — the call stack ran out of space. The recursive \`maxDepth\` above, run with Node.js 22 on a chain of 100000 nodes, threw:

~~~text
RangeError: Maximum call stack size exceeded
~~~

The exact depth at which this happens depends on the engine and on the size of each frame, so do not rely on a number; Example 2 shows the BFS and stack versions finishing the same 100000-node chain.

### Dry run on \`[3, 9, 20, null, null, 15, 7]\`

| Call | Left answer | Right answer | Returns |
| :--- | :--- | :--- | :--- |
| \`depth(9)\` | \`depth(null)\` = 0 | \`depth(null)\` = 0 | 1 + max(0, 0) = **1** |
| \`depth(15)\` | 0 | 0 | **1** |
| \`depth(7)\` | 0 | 0 | **1** |
| \`depth(20)\` | \`depth(15)\` = 1 | \`depth(7)\` = 1 | 1 + max(1, 1) = **2** |
| \`depth(3)\` | \`depth(9)\` = 1 | \`depth(20)\` = 2 | 1 + max(1, 2) = **3** |

The calls finish in postorder: 9, 15, 7, 20, then the root.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`node main.js\` (Node.js 22). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive maximum depth (and the minimum-depth trap) on five trees** printed:

~~~text
maxDepth([3, 9, 20, null, null, 15, 7]) = 3, minDepth = 2
maxDepth([]) = 0, minDepth = 0
maxDepth([1]) = 1, minDepth = 1
maxDepth([1, null, 2]) = 2, minDepth = 2
maxDepth([1, 2, 3, 4, null, null, 5, 6]) = 4, minDepth = 3
~~~

**Example 2 — Iterative BFS and DFS: depth plus peak queue and stack sizes** printed:

~~~text
example tree: bfs depth 3 (peak queue 2), dfs depth 3 (peak stack 2)
empty tree: bfs depth 0 (peak queue 0), dfs depth 0 (peak stack 0)
perfect tree of 1023 nodes: bfs depth 10 (peak queue 512), dfs depth 10 (peak stack 10)
left chain of 100000 nodes: bfs depth 100000 (peak queue 1), dfs depth 100000 (peak stack 1)
~~~

In Example 1, \`[1, null, 2]\` has minimum depth 2, not 1, because the root is not a leaf. In Example 2 the perfect tree makes the BFS queue hold 512 nodes while the DFS stack holds 10, and the 100000-node chain finishes in both iterative versions.

## 7. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive | O(n) | O(h) | One call per node; the call stack holds one frame per node on the current path |
| BFS level count | O(n) | O(w) | Each node enters and leaves the queue once; the queue holds at most one level (512 of 1023 nodes in Example 2) |
| Iterative DFS | O(n) | O(h) | Each node is pushed and popped once; the stack holds about one path plus waiting siblings |

h is the height: about log2 n for a balanced tree, n for a chain. w is the widest level: up to about n/2 for a perfect tree. See [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 8. Edge Cases

- **Empty tree** — returns 0 from the base case; no special code needed.
- **Single node** — \`1 + max(0, 0) = 1\`.
- **Only right children (or only left)** — \`[1, null, 2]\` has depth 2; the missing side contributes 0 and loses the \`max\`.
- **Very deep chain** — depth equals n. Recursion may overflow; the BFS and stack versions in Example 2 handle 100000 nodes.
- **Unbalanced shapes** — \`[1, 2, 3, 4, null, null, 5, 6]\` has depth 4 through \`1 → 2 → 4 → 6\` even though the other side stops at 3.
- **Minimum depth on one-child nodes** — do not treat a missing child as a leaf (the trap above).

## Common Pitfalls

- **Returning 1 for \`null\`.** Every leaf then reports 2; the empty tree must be 0 when counting nodes.
- **\`Math.max(...[])\` on a leaf in an n-ary tree.** It is \`-Infinity\`; seed it with \`0\`.
- **Swapping \`max\` for \`min\` to get minimum depth.** \`[1, null, 2]\` returns 1 instead of 2, because a missing child is treated as a leaf. Example 1 prints the correct value.
- **\`queue.shift()\` in a hot loop.** It re-indexes the array; use level arrays or a head index.
- **\`=== null\` with \`undefined\` children.** Objects built from JSON or with omitted properties have \`undefined\` children; the base case then misses and the code reads \`undefined.left\`, throwing \`TypeError\`.
- **Recursing on a deep chain.** It throws \`RangeError\`; switch to the iterative version.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The recurrence:</strong> <span style="color:#f0e2c8;">An empty tree has depth 0; otherwise depth is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + Math.max(maxDepth(left), maxDepth(right))</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">The longest path goes through the root and then down the deeper subtree, so the bigger child depth plus one is exactly its length.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">One visit per node, O(n) time; O(h) call stack, O(log n) when balanced and O(n) for a chain.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. JavaScript details:</strong> <span style="color:#f0e2c8;">Deep recursion throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>, so for an unknown tree I would count levels with per-level arrays, avoiding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code>, or use a stack of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[node, depth]</code> pairs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Follow-up awareness:</strong> <span style="color:#f0e2c8;">For minimum depth I would not just use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.min</code>: a node with one child must use that child, because a missing child is not a leaf.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if depth is measured in edges?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return -1 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> or subtract 1 at the end, so a single node is depth 0.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Write minimum depth.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return 0 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>; if one child is null, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + minDepth(other)</code>; else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + Math.min(both)</code>. With BFS you can return the level of the first leaf you meet and stop early.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you do it for an n-ary tree with a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">children</code> array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + Math.max(0, ...node.children.map(maxDepth))</code>; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> stops an empty spread from producing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-Infinity</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which iterative version uses less memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On a perfect tree BFS holds a whole level, about n/2 nodes (512 of 1023 in Example 2), while the DFS stack holds about h; on a chain both hold one node.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you return the depth without recursion and without a queue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in general without some memory; Morris-style threading can walk the tree in O(1) space but tracking depth with it is awkward. The honest answer is BFS or an explicit stack.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Maximum depth (height)** | Number of nodes on the longest root-to-leaf path; 0 for an empty tree |
| **Recurrence** | A rule defining an answer from answers to smaller inputs, here \`1 + max(left, right)\` |
| **Divide and conquer** | Solve independent subproblems (the two subtrees), then combine the results |
| **Breadth-first search (BFS)** | Visiting nodes level by level with a first-in-first-out queue |
| **Stack overflow (\`RangeError\`)** | JavaScript error when the call stack is exhausted |

---
**Conclusion:** Maximum depth is \`1 + Math.max(depth(left), depth(right))\` with 0 for \`null\`: one visit per node, O(n) time and O(h) stack. In JavaScript a deep chain throws \`RangeError\`, so know the level-array BFS (no \`shift()\` loops) and the \`[node, depth]\` stack version, and remember the minimum-depth follow-up needs the one-child rule rather than a plain \`Math.min\`.`,
        examples: [
          {
            label: "Recursive maximum depth (and the minimum-depth trap) on five trees",
            code: `class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// Build a tree from a level-order array; null marks a missing child.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new TreeNode(values[0]);
  const queue = [root];
  let head = 0; // index of the next node to give children (avoids shift())
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) { node.left = new TreeNode(values[i]); queue.push(node.left); }
    i++;
    if (i < values.length && values[i] !== null) { node.right = new TreeNode(values[i]); queue.push(node.right); }
    i++;
  }
  return root;
}

function maxDepth(node) {
  if (node === null) return 0;            // an empty tree has depth 0
  return 1 + Math.max(maxDepth(node.left), maxDepth(node.right));
}

function minDepth(node) {
  if (node === null) return 0;
  if (node.left === null) return 1 + minDepth(node.right); // one child: path must use it
  if (node.right === null) return 1 + minDepth(node.left);
  return 1 + Math.min(minDepth(node.left), minDepth(node.right));
}

function show(text, values) {
  const root = build(values);
  return 'maxDepth(' + text + ') = ' + maxDepth(root) + ', minDepth = ' + minDepth(root);
}

console.log(show('[3, 9, 20, null, null, 15, 7]', [3, 9, 20, null, null, 15, 7])); // maxDepth([3, 9, 20, null, null, 15, 7]) = 3, minDepth = 2
console.log(show('[]', [])); // maxDepth([]) = 0, minDepth = 0
console.log(show('[1]', [1])); // maxDepth([1]) = 1, minDepth = 1
console.log(show('[1, null, 2]', [1, null, 2])); // maxDepth([1, null, 2]) = 2, minDepth = 2
console.log(show('[1, 2, 3, 4, null, null, 5, 6]', [1, 2, 3, 4, null, null, 5, 6])); // maxDepth([1, 2, 3, 4, null, null, 5, 6]) = 4, minDepth = 3
`,
          },
          {
            label: "Iterative BFS and DFS: depth plus peak queue and stack sizes",
            code: `class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// Build a tree from a level-order array; null marks a missing child.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new TreeNode(values[0]);
  const queue = [root];
  let head = 0; // index of the next node to give children (avoids shift())
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) { node.left = new TreeNode(values[i]); queue.push(node.left); }
    i++;
    if (i < values.length && values[i] !== null) { node.right = new TreeNode(values[i]); queue.push(node.right); }
    i++;
  }
  return root;
}

// Count levels, one level array at a time. Returns [depth, largest level size].
function depthBfs(root) {
  if (root === null) return [0, 0];
  let level = [root];
  let depth = 0;
  let peak = 1;
  while (level.length > 0) {
    depth++;
    const next = [];
    for (const node of level) {
      if (node.left) next.push(node.left);
      if (node.right) next.push(node.right);
    }
    level = next;
    peak = Math.max(peak, level.length);
  }
  return [depth, peak];
}

// Explicit stack of [node, depth] pairs. Returns [depth, largest stack size].
function depthDfs(root) {
  let best = 0;
  let peak = 0;
  const stack = root ? [[root, 1]] : [];
  while (stack.length > 0) {
    peak = Math.max(peak, stack.length);
    const [node, d] = stack.pop();
    best = Math.max(best, d);
    if (node.right) stack.push([node.right, d + 1]);
    if (node.left) stack.push([node.left, d + 1]);
  }
  return [best, peak];
}

function report(name, root) {
  const [b, qpeak] = depthBfs(root);
  const [d, speak] = depthDfs(root);
  return name + ': bfs depth ' + b + ' (peak queue ' + qpeak + '), dfs depth ' + d + ' (peak stack ' + speak + ')';
}

const perfect = [];
for (let v = 1; v <= 1023; v++) perfect.push(v);

console.log(report('example tree', build([3, 9, 20, null, null, 15, 7]))); // example tree: bfs depth 3 (peak queue 2), dfs depth 3 (peak stack 2)
console.log(report('empty tree', null)); // empty tree: bfs depth 0 (peak queue 0), dfs depth 0 (peak stack 0)
console.log(report('perfect tree of 1023 nodes', build(perfect))); // perfect tree of 1023 nodes: bfs depth 10 (peak queue 512), dfs depth 10 (peak stack 10)

let chain = null;
for (let v = 0; v < 100000; v++) chain = new TreeNode(v, chain); // every node has only a left child
console.log(report('left chain of 100000 nodes', chain)); // left chain of 100000 nodes: bfs depth 100000 (peak queue 1), dfs depth 100000 (peak stack 1)
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given the root of a binary tree, write a Java method int maxDepth(TreeNode root) that returns the number of nodes on the longest root-to-leaf path. Then tell me what happens on a degenerate tree with 100000 nodes."

**What a strong answer should cover:**
- The recurrence \`maxDepth(null) = 0\`, \`maxDepth(node) = 1 + Math.max(left, right)\`, and that it is postorder.
- O(n) time; O(h) space for recursion, O(n) for a chain.
- An iterative alternative: BFS with \`ArrayDeque\` counting levels, or a stack of (node, depth) frames.
- Clarify node versus edge counting and the empty-tree answer; know the minimum-depth trap.
- Java specifics: a degenerate tree throws \`StackOverflowError\` (an \`Error\`, not an \`Exception\`); \`ArrayDeque\` rejects \`null\`, so only add existing children; a small \`record Frame(TreeNode node, int depth)\` (Java 16+) is a clean way to store pairs.

**Clarifying questions expected:**
- "Is depth counted in nodes or edges, and what do I return for null?"
- "Can the tree be degenerate, like a linked list?"

**Code / implementation expected:** Yes — a recursive Java method, then an iterative BFS with \`ArrayDeque\`.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a binary tree is.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Java version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Picture a family tree drawn on a wall: great-grandmother at the top, her children below, their children below that. Someone asks, "How many generations are on this wall?" You do not need to count everyone. You only need the longest line from the top down to someone with no children.

There is a lazy and clever way to answer. Ask each of great-grandmother's children, "How many generations are there from you downwards?" Each of them asks their own children the same question, and so on. A person with no children answers "just me: 1". Every parent takes the bigger of their children's answers and adds 1 for themselves. When the answers reach the top, you have the number of generations.

That is the whole algorithm for maximum depth. It is the warm-up tree question because it shows whether you can trust recursion: solve the problem for the two subtrees, combine the two answers, and handle the empty tree. The same "ask the children, combine, add one" shape powers [diameter](/interview-question/how-do-you-compute-the-diameter-of-a-binary-tree), [balance checking](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced) and many more.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is depth counted in **nodes** or in **edges**? | The usual version (LeetCode 104) counts nodes, so a single node has depth 1. Counting edges gives one less, and an empty tree is then usually -1. |
| What should an empty tree return? | With node counting it is 0; confirm it so the base case is right. |
| How deep can the tree be? Could it be a long chain? | A chain of 100000 nodes breaks plain recursion in many runtimes; you would then write the iterative version. |
| Is it a binary tree, or can a node have many children? | The idea is the same; with many children you take the max over a list instead of two values. |
| Do you want the **maximum** or the **minimum** depth? | Minimum depth has a trap with one-child nodes, covered below. |

## 3. The Core Idea

📌 **Interview term: Maximum depth (height)** — the number of nodes on the longest path from the root down to a leaf. A leaf is a node with no children. An empty tree has depth 0, a single node has depth 1.

📌 **Interview term: Recurrence** — a rule that defines the answer for a node in terms of the answers for smaller inputs. Here:

- \`depth(empty) = 0\`
- \`depth(node) = 1 + max(depth(node.left), depth(node.right))\`

The \`1\` counts the node itself; the \`max\` picks the deeper side. Each node needs its children's answers **before** it can answer, so the recursion is a **postorder** traversal (children first, then the node). The [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods) page explains the orders.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 300" role="img" aria-label="Tree 3, 9, 20, 15, 7. Leaves 9, 15 and 7 return 1, node 20 returns 1 plus max of 1 and 1 which is 2, the root returns 1 plus max of 1 and 2 which is 3">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge-accent" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="408" y1="156" x2="362" y2="214"/>
  <line class="d-edge" x1="432" y1="156" x2="478" y2="214"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">3</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">9</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">20</text>
  <circle class="d-box-muted" cx="350" cy="230" r="20"/>
  <text class="d-text" x="350" y="235" text-anchor="middle">15</text>
  <circle class="d-box-muted" cx="490" cy="230" r="20"/>
  <text class="d-text" x="490" y="235" text-anchor="middle">7</text>
  <text class="d-text d-accent" x="240" y="45" text-anchor="end">1 + max(1, 2) = 3</text>
  <text class="d-sub" x="180" y="186" text-anchor="middle">leaf: returns 1</text>
  <text class="d-sub" x="460" y="120" text-anchor="start">1 + max(1, 1) = 2</text>
  <text class="d-sub" x="350" y="276" text-anchor="middle">returns 1</text>
  <text class="d-sub" x="490" y="276" text-anchor="middle">returns 1</text>
</svg>

The answers flow **upward**: the three leaves return 1, node \`20\` returns 2, and the root returns 3. The highlighted edge is the side that won the \`max\` at the root.

📌 **Interview term: Divide and conquer** — split a problem into independent smaller problems (here: the left subtree and the right subtree), solve each, then combine the results (here: \`1 + max\`).

### The other way: count levels with a queue

A [level-order (BFS) traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree) visits the tree one level at a time. If you count how many levels you process, that count **is** the depth:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="The same tree processed level by level with a queue: level 1 holds 3, level 2 holds 9 and 20, level 3 holds 15 and 7, so the depth is 3">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="408" y1="156" x2="362" y2="214"/>
  <line class="d-edge" x1="432" y1="156" x2="478" y2="214"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">3</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">9</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">20</text>
  <circle class="d-box-muted" cx="350" cy="230" r="20"/>
  <text class="d-text" x="350" y="235" text-anchor="middle">15</text>
  <circle class="d-box-muted" cx="490" cy="230" r="20"/>
  <text class="d-text" x="490" y="235" text-anchor="middle">7</text>
  <text class="d-sub" x="580" y="55" text-anchor="start">level 1: queue [3]</text>
  <text class="d-sub" x="580" y="145" text-anchor="start">level 2: queue [9, 20]</text>
  <text class="d-sub" x="580" y="235" text-anchor="start">level 3: queue [15, 7]</text>
</svg>

Each pass of the outer loop removes exactly the nodes of one level from the queue and adds their children, so the loop runs once per level.

📌 **Interview term: Breadth-first search (BFS)** — visiting nodes in order of distance from the root, using a first-in-first-out **queue**. See [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs).

A third option is **iterative DFS**: put \`(node, depth)\` pairs on an explicit stack, and keep the largest depth you pop. It avoids recursion without the wide queue BFS needs.

### The minimum-depth trap

Interviewers often follow up with "now the **minimum** depth". The naive change \`1 + min(left, right)\` is wrong. For the tree \`[1, null, 2]\` (root \`1\` with only a right child \`2\`) it returns 1, because the missing left child counts as depth 0. But a missing child is not a leaf; the only leaf is \`2\`, so the answer is 2. The fix: if one child is missing, the path must go through the other one. Example 1 prints both depths so you can see the difference.

## 4. Brute Force First, Then the Clean Solutions

**Brute force — list every root-to-leaf path.** Walk the tree, copy the current path into a list each time you reach a leaf, and take the longest list. It gives the right answer but copies a path of up to h nodes at every leaf, so it costs O(n · h) time and memory it does not need.

**Better — just return a number.** Every node must be looked at at least once (the deepest leaf could be anywhere), so O(n) time is the best possible. The recursive version does exactly one visit per node and keeps only one number per call. BFS and iterative DFS do the same work with an explicit queue or stack.

| Approach | Time | Extra space | When to choose it |
| :--- | :--- | :--- | :--- |
| Recursive DFS | O(n) | O(h) call stack | Default: shortest and clearest |
| BFS level count | O(n) | O(w) queue, w = widest level | Deep, narrow trees; or when you also need per-level data |
| Iterative DFS with (node, depth) | O(n) | O(h) explicit stack | Deep trees where recursion would overflow |

Example 2 measures the memory difference: on a perfect tree of 1023 nodes the BFS queue reaches 512 nodes (the whole bottom level) while the DFS stack never holds more than 10; on a 100000-node chain both hold just 1.

## 5. The Java Code, Line by Line

The recursive version:

~~~java
static int maxDepth(TreeNode node) {
    if (node == null) return 0;            // an empty tree has depth 0
    return 1 + Math.max(maxDepth(node.left), maxDepth(node.right));
}
~~~

BFS counting levels:

~~~java
static int depthBfs(TreeNode root) {
    if (root == null) return 0;
    Deque<TreeNode> queue = new ArrayDeque<>();
    queue.add(root);
    int depth = 0;
    while (!queue.isEmpty()) {
        depth++;
        int size = queue.size();               // remove exactly one level
        for (int k = 0; k < size; k++) {
            TreeNode node = queue.poll();
            if (node.left != null) queue.add(node.left);
            if (node.right != null) queue.add(node.right);
        }
    }
    return depth;
}
~~~

Iterative DFS with a record holding the pair:

~~~java
record Frame(TreeNode node, int depth) {}

static int depthDfs(TreeNode root) {
    int best = 0;
    Deque<Frame> stack = new ArrayDeque<>();
    if (root != null) stack.push(new Frame(root, 1));
    while (!stack.isEmpty()) {
        Frame f = stack.pop();
        best = Math.max(best, f.depth());
        if (f.node().right != null) stack.push(new Frame(f.node().right, f.depth() + 1));
        if (f.node().left != null) stack.push(new Frame(f.node().left, f.depth() + 1));
    }
    return best;
}
~~~

(Example 2 returns \`{depth, peak}\` as an \`int[]\` to also report memory.)

What each Java piece is doing:

- **\`if (node == null) return 0\`** is the base case; a leaf gets \`1 + Math.max(0, 0) = 1\`.
- **\`Math.max(int, int)\`** works on primitives, so there is no boxing in the recursive version.
- **\`int size = queue.size()\`** freezes the level size before children are added. Writing \`k < queue.size()\` in the loop condition would keep growing and merge levels.
- **Null guards before \`add\`/\`push\`.** The [\`ArrayDeque\` documentation](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayDeque.html) states that null elements are prohibited; \`queue.add(null)\` throws \`NullPointerException\`.
- **\`record Frame(TreeNode node, int depth)\`** declares an immutable pair with a constructor and accessors \`node()\` and \`depth()\`. Records are standard since Java 16 ([JEP 395](https://openjdk.org/jeps/395)); a nested record is implicitly static, so \`main\` can create it directly. Before Java 16 you would write a tiny static class or push two parallel stacks.
- **No overflow risk in the depth itself.** The depth is at most the number of nodes, which fits in an \`int\` for any tree that fits in memory.

📌 **Interview term: \`StackOverflowError\`** — the JVM error thrown when a thread runs out of call stack. The recursive \`maxDepth\`, run with plain \`java Main\` (OpenJDK 21, no \`-Xss\` flag) on a 100000-node chain, ended with:

~~~text
caught java.lang.StackOverflowError
~~~

\`StackOverflowError\` extends \`VirtualMachineError\`, which extends \`Error\` (checked by printing its superclasses), so \`catch (Exception e)\` does not catch it. The iterative versions in Example 2 handled the same chain.

### Dry run on \`[3, 9, 20, null, null, 15, 7]\`

| Call | Left answer | Right answer | Returns |
| :--- | :--- | :--- | :--- |
| \`depth(9)\` | \`depth(null)\` = 0 | \`depth(null)\` = 0 | 1 + max(0, 0) = **1** |
| \`depth(15)\` | 0 | 0 | **1** |
| \`depth(7)\` | 0 | 0 | **1** |
| \`depth(20)\` | \`depth(15)\` = 1 | \`depth(7)\` = 1 | 1 + max(1, 1) = **2** |
| \`depth(3)\` | \`depth(9)\` = 1 | \`depth(20)\` = 2 | 1 + max(1, 2) = **3** |

The calls finish in postorder: 9, 15, 7, 20, then the root.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`javac Main.java && java Main\` (OpenJDK 21 (javac 21)). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive maximum depth (and the minimum-depth trap) on five trees** printed:

~~~text
maxDepth([3, 9, 20, null, null, 15, 7]) = 3, minDepth = 2
maxDepth([]) = 0, minDepth = 0
maxDepth([1]) = 1, minDepth = 1
maxDepth([1, null, 2]) = 2, minDepth = 2
maxDepth([1, 2, 3, 4, null, null, 5, 6]) = 4, minDepth = 3
~~~

**Example 2 — Iterative BFS and DFS: depth plus peak queue and stack sizes** printed:

~~~text
example tree: bfs depth 3 (peak queue 2), dfs depth 3 (peak stack 2)
empty tree: bfs depth 0 (peak queue 0), dfs depth 0 (peak stack 0)
perfect tree of 1023 nodes: bfs depth 10 (peak queue 512), dfs depth 10 (peak stack 10)
left chain of 100000 nodes: bfs depth 100000 (peak queue 1), dfs depth 100000 (peak stack 1)
~~~

In Example 1, \`[1, null, 2]\` has minimum depth 2, not 1, because the root is not a leaf. In Example 2 the perfect tree makes the BFS queue hold 512 nodes while the DFS stack holds 10, and the 100000-node chain finishes in both iterative versions.

## 7. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive | O(n) | O(h) | One call per node; the call stack holds one frame per node on the current path |
| BFS level count | O(n) | O(w) | Each node enters and leaves the queue once; the queue holds at most one level (512 of 1023 nodes in Example 2) |
| Iterative DFS | O(n) | O(h) | Each node is pushed and popped once; the stack holds about one path plus waiting siblings |

h is the height: about log2 n for a balanced tree, n for a chain. w is the widest level: up to about n/2 for a perfect tree. See [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 8. Edge Cases

- **Empty tree** — returns 0 from the base case; no special code needed.
- **Single node** — \`1 + max(0, 0) = 1\`.
- **Only right children (or only left)** — \`[1, null, 2]\` has depth 2; the missing side contributes 0 and loses the \`max\`.
- **Very deep chain** — depth equals n. Recursion may overflow; the BFS and stack versions in Example 2 handle 100000 nodes.
- **Unbalanced shapes** — \`[1, 2, 3, 4, null, null, 5, 6]\` has depth 4 through \`1 → 2 → 4 → 6\` even though the other side stops at 3.
- **Minimum depth on one-child nodes** — do not treat a missing child as a leaf (the trap above).

## Common Pitfalls

- **Returning 1 for \`null\`.** Every leaf then reports 2; the empty tree must be 0 when counting nodes.
- **\`for (int k = 0; k < queue.size(); k++)\`.** The size changes as children are added, so levels merge and the count is wrong. Save \`size\` first.
- **Adding null children to \`ArrayDeque\`.** It throws \`NullPointerException\`; check before adding.
- **Swapping \`max\` for \`min\` for minimum depth.** \`[1, null, 2]\` gives 1 instead of 2; a one-child node must use its only child.
- **Expecting \`catch (Exception e)\` to rescue deep recursion.** \`StackOverflowError\` is an \`Error\`; use an iterative version instead.
- **Using an instance field as the running maximum.** It works, but a reused \`Solution\` object keeps the old value between test cases unless you reset it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The recurrence:</strong> <span style="color:#f0e2c8;">Null returns 0; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + Math.max(maxDepth(left), maxDepth(right))</code>, a postorder computation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">The longest path goes through the root and down the deeper subtree, so the larger child depth plus one is its length.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">Each node once, O(n) time; O(h) stack, which is O(log n) when balanced and O(n) when degenerate.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Java details:</strong> <span style="color:#f0e2c8;">A degenerate tree throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code> with the default thread stack, so I can switch to BFS with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code>, reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queue.size()</code> once per level and never adding null children.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Follow-up awareness:</strong> <span style="color:#f0e2c8;">Minimum depth is not just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.min</code>: a missing child is not a leaf, so a one-child node takes its only child depth.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if depth counts edges?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return -1 for null or subtract one at the end; a single node then has depth 0.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Write minimum depth.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Null gives 0; if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left == null</code> return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + minDepth(right)</code>, if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">right == null</code> return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + minDepth(left)</code>, else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + Math.min</code> of both. BFS can stop at the first leaf.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your recursion overflowed. Besides rewriting, what can you do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run it in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Thread</code> constructed with a larger stack size, or start the JVM with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-Xss</code>. Both are configuration workarounds; the iterative version is the robust fix.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ArrayDeque</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LinkedList</code> for the queue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> is a resizable array, so it allocates far fewer objects than a node per element, and it rejects nulls, which catches bugs early. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LinkedList</code> accepts nulls and hides them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you do it for an n-ary tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Loop over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node.children</code>, keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int best = 0</code>, update <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best = Math.max(best, maxDepth(child))</code>, and return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + best</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Maximum depth (height)** | Number of nodes on the longest root-to-leaf path; 0 for an empty tree |
| **Recurrence** | A rule defining an answer from answers to smaller inputs, here \`1 + max(left, right)\` |
| **Divide and conquer** | Solve independent subproblems (the two subtrees), then combine the results |
| **Breadth-first search (BFS)** | Visiting nodes level by level with a first-in-first-out queue |
| **\`StackOverflowError\`** | JVM error when the call stack is exhausted; an \`Error\`, not an \`Exception\` |
| **Record** | Java 16+ compact immutable data class, used here for (node, depth) pairs |

---
**Conclusion:** Maximum depth is \`1 + Math.max(depth(left), depth(right))\` with 0 for \`null\`: one visit per node, O(n) time and O(h) stack. In Java a degenerate tree throws \`StackOverflowError\`, so keep the \`ArrayDeque\` BFS (size read once per level, no null children) and the record-based stack version ready, and remember the minimum-depth follow-up needs the one-child rule.`,
        examples: [
          {
            label: "Recursive maximum depth (and the minimum-depth trap) on five trees",
            code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
    }

    // Build a tree from level-order values; null marks a missing child.
    static TreeNode build(Integer... values) {
        if (values.length == 0 || values[0] == null) return null;
        TreeNode root = new TreeNode(values[0]);
        Deque<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            TreeNode node = queue.poll();
            if (i < values.length && values[i] != null) { node.left = new TreeNode(values[i]); queue.add(node.left); }
            i++;
            if (i < values.length && values[i] != null) { node.right = new TreeNode(values[i]); queue.add(node.right); }
            i++;
        }
        return root;
    }


    static int maxDepth(TreeNode node) {
        if (node == null) return 0;            // an empty tree has depth 0
        return 1 + Math.max(maxDepth(node.left), maxDepth(node.right));
    }

    static int minDepth(TreeNode node) {
        if (node == null) return 0;
        if (node.left == null) return 1 + minDepth(node.right);  // one child: path must use it
        if (node.right == null) return 1 + minDepth(node.left);
        return 1 + Math.min(minDepth(node.left), minDepth(node.right));
    }

    static String show(String text, Integer... values) {
        TreeNode root = build(values);
        return "maxDepth(" + text + ") = " + maxDepth(root) + ", minDepth = " + minDepth(root);
    }

    public static void main(String[] args) {
        System.out.println(show("[3, 9, 20, null, null, 15, 7]", 3, 9, 20, null, null, 15, 7));  // = 3, minDepth = 2
        System.out.println(show("[]"));                                                        // = 0, minDepth = 0
        System.out.println(show("[1]", 1));                                                    // = 1, minDepth = 1
        System.out.println(show("[1, null, 2]", 1, null, 2));                                  // = 2, minDepth = 2
        System.out.println(show("[1, 2, 3, 4, null, null, 5, 6]", 1, 2, 3, 4, null, null, 5, 6));  // = 4, minDepth = 3
    }
}
`,
          },
          {
            label: "Iterative BFS and DFS: depth plus peak queue and stack sizes",
            code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
    }

    // Build a tree from level-order values; null marks a missing child.
    static TreeNode build(Integer... values) {
        if (values.length == 0 || values[0] == null) return null;
        TreeNode root = new TreeNode(values[0]);
        Deque<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            TreeNode node = queue.poll();
            if (i < values.length && values[i] != null) { node.left = new TreeNode(values[i]); queue.add(node.left); }
            i++;
            if (i < values.length && values[i] != null) { node.right = new TreeNode(values[i]); queue.add(node.right); }
            i++;
        }
        return root;
    }


    // Count levels with a queue. Returns {depth, largest queue size}.
    static int[] depthBfs(TreeNode root) {
        if (root == null) return new int[] {0, 0};
        Deque<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        int depth = 0, peak = 1;
        while (!queue.isEmpty()) {
            depth++;
            int size = queue.size();               // remove exactly one level
            for (int k = 0; k < size; k++) {
                TreeNode node = queue.poll();
                if (node.left != null) queue.add(node.left);
                if (node.right != null) queue.add(node.right);
            }
            peak = Math.max(peak, queue.size());
        }
        return new int[] {depth, peak};
    }

    // A frame on the explicit stack: a node and its depth.
    record Frame(TreeNode node, int depth) {}

    static int[] depthDfs(TreeNode root) {
        int best = 0, peak = 0;
        Deque<Frame> stack = new ArrayDeque<>();
        if (root != null) stack.push(new Frame(root, 1));
        while (!stack.isEmpty()) {
            peak = Math.max(peak, stack.size());
            Frame f = stack.pop();
            best = Math.max(best, f.depth());
            if (f.node().right != null) stack.push(new Frame(f.node().right, f.depth() + 1));
            if (f.node().left != null) stack.push(new Frame(f.node().left, f.depth() + 1));
        }
        return new int[] {best, peak};
    }

    static String report(String name, TreeNode root) {
        int[] b = depthBfs(root), d = depthDfs(root);
        return name + ": bfs depth " + b[0] + " (peak queue " + b[1] + "), dfs depth " + d[0] + " (peak stack " + d[1] + ")";
    }

    public static void main(String[] args) {
        System.out.println(report("example tree", build(3, 9, 20, null, null, 15, 7)));
        System.out.println(report("empty tree", null));
        Integer[] perfect = new Integer[1023];
        for (int v = 1; v <= 1023; v++) perfect[v - 1] = v;
        System.out.println(report("perfect tree of 1023 nodes", build(perfect)));

        TreeNode chain = null;
        for (int v = 0; v < 100000; v++) chain = new TreeNode(v, chain, null);  // only left children
        System.out.println(report("left chain of 100000 nodes", chain));
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a pointer to the root of a binary tree, write a C++ function int maxDepth(TreeNode* root) that returns the number of nodes on the longest root-to-leaf path. Then tell me what happens with a tree that is a ten-million-node chain."

**What a strong answer should cover:**
- The recurrence \`maxDepth(nullptr) = 0\`, \`maxDepth(node) = 1 + std::max(left, right)\`, and that it is postorder.
- O(n) time; O(h) space for recursion, which is O(n) for a chain.
- An iterative alternative: BFS with \`std::queue\`, or a \`std::vector<std::pair<TreeNode*, int>>\` used as a stack.
- Clarify node versus edge counting and the empty-tree answer; know the minimum-depth trap.
- C++ specifics: running out of stack is a crash (segmentation fault), not an exception; \`std::max\` needs both arguments of the same type (\`int\` and \`size_t\` do not compile); \`std::queue::pop()\` returns \`void\`; structured bindings \`auto [node, d] = st.back();\` (C++17).

**Clarifying questions expected:**
- "Do we count nodes or edges, and what should a null root return?"
- "How deep can the tree get?"

**Code / implementation expected:** Yes — a recursive C++ function, then an iterative version with \`std::queue\` or an explicit stack.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a binary tree is.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this C++ version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Picture a family tree drawn on a wall: great-grandmother at the top, her children below, their children below that. Someone asks, "How many generations are on this wall?" You do not need to count everyone. You only need the longest line from the top down to someone with no children.

There is a lazy and clever way to answer. Ask each of great-grandmother's children, "How many generations are there from you downwards?" Each of them asks their own children the same question, and so on. A person with no children answers "just me: 1". Every parent takes the bigger of their children's answers and adds 1 for themselves. When the answers reach the top, you have the number of generations.

That is the whole algorithm for maximum depth. It is the warm-up tree question because it shows whether you can trust recursion: solve the problem for the two subtrees, combine the two answers, and handle the empty tree. The same "ask the children, combine, add one" shape powers [diameter](/interview-question/how-do-you-compute-the-diameter-of-a-binary-tree), [balance checking](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced) and many more.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is depth counted in **nodes** or in **edges**? | The usual version (LeetCode 104) counts nodes, so a single node has depth 1. Counting edges gives one less, and an empty tree is then usually -1. |
| What should an empty tree return? | With node counting it is 0; confirm it so the base case is right. |
| How deep can the tree be? Could it be a long chain? | A chain of 100000 nodes breaks plain recursion in many runtimes; you would then write the iterative version. |
| Is it a binary tree, or can a node have many children? | The idea is the same; with many children you take the max over a list instead of two values. |
| Do you want the **maximum** or the **minimum** depth? | Minimum depth has a trap with one-child nodes, covered below. |

## 3. The Core Idea

📌 **Interview term: Maximum depth (height)** — the number of nodes on the longest path from the root down to a leaf. A leaf is a node with no children. An empty tree has depth 0, a single node has depth 1.

📌 **Interview term: Recurrence** — a rule that defines the answer for a node in terms of the answers for smaller inputs. Here:

- \`depth(empty) = 0\`
- \`depth(node) = 1 + max(depth(node.left), depth(node.right))\`

The \`1\` counts the node itself; the \`max\` picks the deeper side. Each node needs its children's answers **before** it can answer, so the recursion is a **postorder** traversal (children first, then the node). The [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods) page explains the orders.

<svg class="iq-diagram" width="100%" viewBox="0 0 620 300" role="img" aria-label="Tree 3, 9, 20, 15, 7. Leaves 9, 15 and 7 return 1, node 20 returns 1 plus max of 1 and 1 which is 2, the root returns 1 plus max of 1 and 2 which is 3">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge-accent" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="408" y1="156" x2="362" y2="214"/>
  <line class="d-edge" x1="432" y1="156" x2="478" y2="214"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">3</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">9</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">20</text>
  <circle class="d-box-muted" cx="350" cy="230" r="20"/>
  <text class="d-text" x="350" y="235" text-anchor="middle">15</text>
  <circle class="d-box-muted" cx="490" cy="230" r="20"/>
  <text class="d-text" x="490" y="235" text-anchor="middle">7</text>
  <text class="d-text d-accent" x="240" y="45" text-anchor="end">1 + max(1, 2) = 3</text>
  <text class="d-sub" x="180" y="186" text-anchor="middle">leaf: returns 1</text>
  <text class="d-sub" x="460" y="120" text-anchor="start">1 + max(1, 1) = 2</text>
  <text class="d-sub" x="350" y="276" text-anchor="middle">returns 1</text>
  <text class="d-sub" x="490" y="276" text-anchor="middle">returns 1</text>
</svg>

The answers flow **upward**: the three leaves return 1, node \`20\` returns 2, and the root returns 3. The highlighted edge is the side that won the \`max\` at the root.

📌 **Interview term: Divide and conquer** — split a problem into independent smaller problems (here: the left subtree and the right subtree), solve each, then combine the results (here: \`1 + max\`).

### The other way: count levels with a queue

A [level-order (BFS) traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree) visits the tree one level at a time. If you count how many levels you process, that count **is** the depth:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="The same tree processed level by level with a queue: level 1 holds 3, level 2 holds 9 and 20, level 3 holds 15 and 7, so the depth is 3">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="408" y1="156" x2="362" y2="214"/>
  <line class="d-edge" x1="432" y1="156" x2="478" y2="214"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">3</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">9</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">20</text>
  <circle class="d-box-muted" cx="350" cy="230" r="20"/>
  <text class="d-text" x="350" y="235" text-anchor="middle">15</text>
  <circle class="d-box-muted" cx="490" cy="230" r="20"/>
  <text class="d-text" x="490" y="235" text-anchor="middle">7</text>
  <text class="d-sub" x="580" y="55" text-anchor="start">level 1: queue [3]</text>
  <text class="d-sub" x="580" y="145" text-anchor="start">level 2: queue [9, 20]</text>
  <text class="d-sub" x="580" y="235" text-anchor="start">level 3: queue [15, 7]</text>
</svg>

Each pass of the outer loop removes exactly the nodes of one level from the queue and adds their children, so the loop runs once per level.

📌 **Interview term: Breadth-first search (BFS)** — visiting nodes in order of distance from the root, using a first-in-first-out **queue**. See [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs).

A third option is **iterative DFS**: put \`(node, depth)\` pairs on an explicit stack, and keep the largest depth you pop. It avoids recursion without the wide queue BFS needs.

### The minimum-depth trap

Interviewers often follow up with "now the **minimum** depth". The naive change \`1 + min(left, right)\` is wrong. For the tree \`[1, null, 2]\` (root \`1\` with only a right child \`2\`) it returns 1, because the missing left child counts as depth 0. But a missing child is not a leaf; the only leaf is \`2\`, so the answer is 2. The fix: if one child is missing, the path must go through the other one. Example 1 prints both depths so you can see the difference.

## 4. Brute Force First, Then the Clean Solutions

**Brute force — list every root-to-leaf path.** Walk the tree, copy the current path into a list each time you reach a leaf, and take the longest list. It gives the right answer but copies a path of up to h nodes at every leaf, so it costs O(n · h) time and memory it does not need.

**Better — just return a number.** Every node must be looked at at least once (the deepest leaf could be anywhere), so O(n) time is the best possible. The recursive version does exactly one visit per node and keeps only one number per call. BFS and iterative DFS do the same work with an explicit queue or stack.

| Approach | Time | Extra space | When to choose it |
| :--- | :--- | :--- | :--- |
| Recursive DFS | O(n) | O(h) call stack | Default: shortest and clearest |
| BFS level count | O(n) | O(w) queue, w = widest level | Deep, narrow trees; or when you also need per-level data |
| Iterative DFS with (node, depth) | O(n) | O(h) explicit stack | Deep trees where recursion would overflow |

Example 2 measures the memory difference: on a perfect tree of 1023 nodes the BFS queue reaches 512 nodes (the whole bottom level) while the DFS stack never holds more than 10; on a 100000-node chain both hold just 1.

## 5. The C++ Code, Line by Line

The recursive version:

~~~cpp
int maxDepth(TreeNode* node) {
    if (!node) return 0;                   // an empty tree has depth 0
    return 1 + std::max(maxDepth(node->left), maxDepth(node->right));
}
~~~

BFS counting levels:

~~~cpp
int depthBfs(TreeNode* root) {
    if (!root) return 0;
    std::queue<TreeNode*> q;
    q.push(root);
    int depth = 0;
    while (!q.empty()) {
        depth++;
        size_t size = q.size();                 // remove exactly one level
        for (size_t k = 0; k < size; k++) {
            TreeNode* node = q.front();         // read first: pop() returns void
            q.pop();
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
    }
    return depth;
}
~~~

Iterative DFS with pairs on a vector:

~~~cpp
int depthDfs(TreeNode* root) {
    int best = 0;
    std::vector<std::pair<TreeNode*, int>> st;
    if (root) st.push_back({root, 1});
    while (!st.empty()) {
        auto [node, d] = st.back();            // structured binding (C++17)
        st.pop_back();
        best = std::max(best, d);
        if (node->right) st.push_back({node->right, d + 1});
        if (node->left) st.push_back({node->left, d + 1});
    }
    return best;
}
~~~

(Example 2 returns \`std::pair<int, size_t>\` to also report the peak size.)

What each C++ piece is doing:

- **\`if (!node) return 0\`** — a null pointer converts to \`false\`, so this is the base case.
- **\`std::max\` from \`<algorithm>\`** is a template that needs both arguments of the same type. \`std::max(best, st.size())\` with \`int best\` does not compile (\`no matching function for call to max(int&, ...size_type)\`); either keep both \`int\`, keep both \`size_t\` as Example 2 does for the peak, or write \`std::max<size_t>(...)\`.
- **\`q.front()\` then \`q.pop()\`** — \`pop()\` returns \`void\`, so you must read the element first ([cppreference: std::queue::pop](https://en.cppreference.com/w/cpp/container/queue/pop)).
- **\`auto [node, d] = st.back();\`** copies the pair into two names; then \`pop_back()\` removes it. Reading \`back()\` on an empty vector is undefined behaviour, which the \`while (!st.empty())\` loop prevents.
- **\`std::vector\` as the stack** is the common C++ choice; \`push_back\`, \`back\` and \`pop_back\` are all constant time (amortised for \`push_back\`).
- **Memory.** The examples free every tree with an iterative \`destroy\`, because a recursive teardown would have the same depth problem.

📌 **Interview term: Stack overflow (segmentation fault)** — in C++ a too-deep recursion is not an exception; the operating system kills the process. The recursive \`maxDepth\` compiled with \`g++ -std=c++17\` (no optimisation flags) handled a chain of 100000 nodes and crashed on a chain of 10000000:

~~~text
depth = 100000
Segmentation fault
~~~

That machine used an 8192 KB main-thread stack (\`ulimit -s\`). Limits differ between systems, so for untrusted depth use the iterative versions, which Example 2 runs on a 100000-node chain.

### Dry run on \`[3, 9, 20, null, null, 15, 7]\`

| Call | Left answer | Right answer | Returns |
| :--- | :--- | :--- | :--- |
| \`depth(9)\` | \`depth(null)\` = 0 | \`depth(null)\` = 0 | 1 + max(0, 0) = **1** |
| \`depth(15)\` | 0 | 0 | **1** |
| \`depth(7)\` | 0 | 0 | **1** |
| \`depth(20)\` | \`depth(15)\` = 1 | \`depth(7)\` = 1 | 1 + max(1, 1) = **2** |
| \`depth(3)\` | \`depth(9)\` = 1 | \`depth(20)\` = 2 | 1 + max(1, 2) = **3** |

The calls finish in postorder: 9, 15, 7, 20, then the root.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3 with -std=c++17). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive maximum depth (and the minimum-depth trap) on five trees** printed:

~~~text
maxDepth([3, 9, 20, null, null, 15, 7]) = 3, minDepth = 2
maxDepth([]) = 0, minDepth = 0
maxDepth([1]) = 1, minDepth = 1
maxDepth([1, null, 2]) = 2, minDepth = 2
maxDepth([1, 2, 3, 4, null, null, 5, 6]) = 4, minDepth = 3
~~~

**Example 2 — Iterative BFS and DFS: depth plus peak queue and stack sizes** printed:

~~~text
example tree: bfs depth 3 (peak queue 2), dfs depth 3 (peak stack 2)
empty tree: bfs depth 0 (peak queue 0), dfs depth 0 (peak stack 0)
perfect tree of 1023 nodes: bfs depth 10 (peak queue 512), dfs depth 10 (peak stack 10)
left chain of 100000 nodes: bfs depth 100000 (peak queue 1), dfs depth 100000 (peak stack 1)
~~~

In Example 1, \`[1, null, 2]\` has minimum depth 2, not 1, because the root is not a leaf. In Example 2 the perfect tree makes the BFS queue hold 512 nodes while the DFS stack holds 10, and the 100000-node chain finishes in both iterative versions.

## 7. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive | O(n) | O(h) | One call per node; the call stack holds one frame per node on the current path |
| BFS level count | O(n) | O(w) | Each node enters and leaves the queue once; the queue holds at most one level (512 of 1023 nodes in Example 2) |
| Iterative DFS | O(n) | O(h) | Each node is pushed and popped once; the stack holds about one path plus waiting siblings |

h is the height: about log2 n for a balanced tree, n for a chain. w is the widest level: up to about n/2 for a perfect tree. See [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 8. Edge Cases

- **Empty tree** — returns 0 from the base case; no special code needed.
- **Single node** — \`1 + max(0, 0) = 1\`.
- **Only right children (or only left)** — \`[1, null, 2]\` has depth 2; the missing side contributes 0 and loses the \`max\`.
- **Very deep chain** — depth equals n. Recursion may overflow; the BFS and stack versions in Example 2 handle 100000 nodes.
- **Unbalanced shapes** — \`[1, 2, 3, 4, null, null, 5, 6]\` has depth 4 through \`1 → 2 → 4 → 6\` even though the other side stops at 3.
- **Minimum depth on one-child nodes** — do not treat a missing child as a leaf (the trap above).

## Common Pitfalls

- **Returning 1 for \`nullptr\`.** Every leaf then reports 2; the empty tree must be 0 when counting nodes.
- **Mixing \`int\` and \`size_t\` in \`std::max\`.** It does not compile; keep the types the same.
- **\`TreeNode* node = q.pop();\`** — \`pop()\` returns \`void\`; use \`front()\` then \`pop()\`.
- **Swapping \`max\` for \`min\` for minimum depth.** \`[1, null, 2]\` gives 1 instead of 2.
- **Deep recursion.** A long chain segfaults with no chance to catch it; use \`std::queue\` or an explicit stack when depth is unknown.
- **Leaking the tree.** Raw \`new\` nodes need a \`delete\`; a recursive \`destroy\` on a deep chain can itself overflow, so free iteratively.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The recurrence:</strong> <span style="color:#f0e2c8;">A null pointer returns 0; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + std::max(maxDepth(left), maxDepth(right))</code>, computed in postorder.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">The longest path goes through the root and down the deeper subtree, so the larger child depth plus one is its length.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">One visit per node, O(n) time; O(h) stack, O(log n) when balanced and O(n) for a chain.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. C++ details:</strong> <span style="color:#f0e2c8;">Stack overflow in C++ is a segfault, not an exception, so for deep input I use BFS with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code>, reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">front()</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>, or a vector of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(node, depth)</code> pairs with structured bindings.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Follow-up awareness:</strong> <span style="color:#f0e2c8;">For minimum depth a one-child node must use its only child, since a missing child is not a leaf.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if depth is counted in edges?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return -1 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code> or subtract one at the end, so a single node has depth 0.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Write minimum depth.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code> returns 0; if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!node-&gt;left</code> return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + minDepth(node-&gt;right)</code>, if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!node-&gt;right</code> return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + minDepth(node-&gt;left)</code>, otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + std::min</code> of both. BFS can stop at the first leaf.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">-O2</code> make the recursion safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not reliably. This recursion is not a tail call (the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + std::max</code> happens after both calls), so the compiler cannot simply turn it into a loop. Do not depend on optimiser behaviour for correctness.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::vector</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::stack</code> for the DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both work. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack</code> is an adaptor with a minimal interface; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size()</code>, iteration and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reserve</code>, and is what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack&lt;T, std::vector&lt;T&gt;&gt;</code> would wrap anyway.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you do this for an n-ary tree with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::vector&lt;Node*&gt; children</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int best = 0</code>, loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for (Node* c : node-&gt;children) best = std::max(best, maxDepth(c));</code> and return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + best</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Maximum depth (height)** | Number of nodes on the longest root-to-leaf path; 0 for an empty tree |
| **Recurrence** | A rule defining an answer from answers to smaller inputs, here \`1 + max(left, right)\` |
| **Divide and conquer** | Solve independent subproblems (the two subtrees), then combine the results |
| **Breadth-first search (BFS)** | Visiting nodes level by level with a first-in-first-out queue |
| **Stack overflow (segmentation fault)** | In C++, exhausting the native stack crashes the process; it cannot be caught |

---
**Conclusion:** Maximum depth is \`1 + std::max(depth(left), depth(right))\` with 0 for \`nullptr\`: one visit per node, O(n) time and O(h) stack. In C++ a too-deep recursion is a segfault rather than an exception, so know the \`std::queue\` BFS and the vector-of-pairs stack version, keep \`std::max\` arguments the same type, and remember the minimum-depth follow-up needs the one-child rule.`,
        examples: [
          {
            label: "Recursive maximum depth (and the minimum-depth trap) on five trees",
            code: `#include <algorithm>
#include <iostream>
#include <optional>
#include <queue>
#include <string>
#include <vector>

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    explicit TreeNode(int v, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

const std::nullopt_t NIL = std::nullopt;   // marks a missing child in the input

// Build a tree from level-order values.
TreeNode* build(const std::vector<std::optional<int>>& values) {
    if (values.empty() || !values[0]) return nullptr;
    TreeNode* root = new TreeNode(*values[0]);
    std::queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        TreeNode* node = q.front();
        q.pop();
        if (i < values.size() && values[i]) { node->left = new TreeNode(*values[i]); q.push(node->left); }
        i++;
        if (i < values.size() && values[i]) { node->right = new TreeNode(*values[i]); q.push(node->right); }
        i++;
    }
    return root;
}

// Free every node without recursion, so deep trees are safe too.
void destroy(TreeNode* root) {
    std::vector<TreeNode*> st;
    if (root) st.push_back(root);
    while (!st.empty()) {
        TreeNode* node = st.back();
        st.pop_back();
        if (node->left) st.push_back(node->left);
        if (node->right) st.push_back(node->right);
        delete node;
    }
}

int maxDepth(TreeNode* node) {
    if (!node) return 0;                   // an empty tree has depth 0
    return 1 + std::max(maxDepth(node->left), maxDepth(node->right));
}

int minDepth(TreeNode* node) {
    if (!node) return 0;
    if (!node->left) return 1 + minDepth(node->right);   // one child: path must use it
    if (!node->right) return 1 + minDepth(node->left);
    return 1 + std::min(minDepth(node->left), minDepth(node->right));
}

std::string show(const std::string& text, const std::vector<std::optional<int>>& values) {
    TreeNode* root = build(values);
    std::string s = "maxDepth(" + text + ") = " + std::to_string(maxDepth(root)) +
                    ", minDepth = " + std::to_string(minDepth(root));
    destroy(root);
    return s;
}

int main() {
    std::cout << show("[3, 9, 20, null, null, 15, 7]", {3, 9, 20, NIL, NIL, 15, 7}) << "\\n";  // = 3, minDepth = 2
    std::cout << show("[]", {}) << "\\n";                                                     // = 0, minDepth = 0
    std::cout << show("[1]", {1}) << "\\n";                                                   // = 1, minDepth = 1
    std::cout << show("[1, null, 2]", {1, NIL, 2}) << "\\n";                                  // = 2, minDepth = 2
    std::cout << show("[1, 2, 3, 4, null, null, 5, 6]", {1, 2, 3, 4, NIL, NIL, 5, 6}) << "\\n";  // = 4, minDepth = 3
}
`,
          },
          {
            label: "Iterative BFS and DFS: depth plus peak queue and stack sizes",
            code: `#include <algorithm>
#include <iostream>
#include <optional>
#include <queue>
#include <string>
#include <utility>
#include <vector>

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    explicit TreeNode(int v, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

const std::nullopt_t NIL = std::nullopt;   // marks a missing child in the input

// Build a tree from level-order values.
TreeNode* build(const std::vector<std::optional<int>>& values) {
    if (values.empty() || !values[0]) return nullptr;
    TreeNode* root = new TreeNode(*values[0]);
    std::queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        TreeNode* node = q.front();
        q.pop();
        if (i < values.size() && values[i]) { node->left = new TreeNode(*values[i]); q.push(node->left); }
        i++;
        if (i < values.size() && values[i]) { node->right = new TreeNode(*values[i]); q.push(node->right); }
        i++;
    }
    return root;
}

// Free every node without recursion, so deep trees are safe too.
void destroy(TreeNode* root) {
    std::vector<TreeNode*> st;
    if (root) st.push_back(root);
    while (!st.empty()) {
        TreeNode* node = st.back();
        st.pop_back();
        if (node->left) st.push_back(node->left);
        if (node->right) st.push_back(node->right);
        delete node;
    }
}

// Count levels with a queue. Returns {depth, largest queue size}.
std::pair<int, size_t> depthBfs(TreeNode* root) {
    if (!root) return {0, 0};
    std::queue<TreeNode*> q;
    q.push(root);
    int depth = 0;
    size_t peak = 1;
    while (!q.empty()) {
        depth++;
        size_t size = q.size();                 // remove exactly one level
        for (size_t k = 0; k < size; k++) {
            TreeNode* node = q.front();
            q.pop();
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
        peak = std::max(peak, q.size());
    }
    return {depth, peak};
}

// Explicit stack of (node, depth) pairs. Returns {depth, largest stack size}.
std::pair<int, size_t> depthDfs(TreeNode* root) {
    int best = 0;
    size_t peak = 0;
    std::vector<std::pair<TreeNode*, int>> st;
    if (root) st.push_back({root, 1});
    while (!st.empty()) {
        peak = std::max(peak, st.size());
        auto [node, d] = st.back();            // structured binding (C++17)
        st.pop_back();
        best = std::max(best, d);
        if (node->right) st.push_back({node->right, d + 1});
        if (node->left) st.push_back({node->left, d + 1});
    }
    return {best, peak};
}

std::string report(const std::string& name, TreeNode* root) {
    auto [b, qpeak] = depthBfs(root);
    auto [d, speak] = depthDfs(root);
    return name + ": bfs depth " + std::to_string(b) + " (peak queue " + std::to_string(qpeak) +
           "), dfs depth " + std::to_string(d) + " (peak stack " + std::to_string(speak) + ")";
}

int main() {
    TreeNode* example = build({3, 9, 20, NIL, NIL, 15, 7});
    std::cout << report("example tree", example) << "\\n";
    std::cout << report("empty tree", nullptr) << "\\n";
    std::vector<std::optional<int>> values;
    for (int v = 1; v <= 1023; v++) values.push_back(v);
    TreeNode* perfect = build(values);
    std::cout << report("perfect tree of 1023 nodes", perfect) << "\\n";

    TreeNode* chain = nullptr;
    for (int v = 0; v < 100000; v++) chain = new TreeNode(v, chain);  // only left children
    std::cout << report("left chain of 100000 nodes", chain) << "\\n";
    destroy(example);
    destroy(perfect);
    destroy(chain);
}
`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you invert a binary tree?",
    difficulty: "easy",
    seoDescription: "Invert (mirror) a binary tree in Python, JavaScript, Java and C++: recursive and BFS versions, the assignment-order bug and verified output.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given the root of a binary tree, invert it — mirror it so every node's left and right children are swapped — and return the root. Please write it in Python, then show me a version that would not hit the recursion limit."

**What a strong answer should cover:**
- Inverting means swapping the left and right child at every node, not just the root; any traversal order works because each node is swapped once.
- A recursive version (swap, then recurse, or recurse, then swap) and an iterative BFS with \`collections.deque\`.
- O(n) time; O(h) space recursively, O(w) for BFS; in place, no new nodes.
- The assignment-order bug: two separate assignments with recursive calls overwrite \`node.left\` before it is read.
- Python specifics: the tuple swap \`node.left, node.right = invert(node.right), invert(node.left)\` evaluates the whole right-hand side first, so it is safe; the default recursion limit of 1000 makes BFS the safe choice for deep trees.

**Clarifying questions expected:**
- "Should I invert in place or return a new tree?"
- "How deep can the tree be?"

**Code / implementation expected:** Yes — a short recursive Python function, ideally with an iterative BFS version too.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a binary tree is.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Python version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Hold a printed organisation chart up to a mirror. Every manager is still above the same people, but everyone who was on the left is now on the right and the other way round, at every level of the chart. Inverting a binary tree is exactly that mirror image: at every node, the left and right children trade places.

The question is famous for a reason outside computer science. In June 2015 Max Howell, the creator of the Homebrew package manager, [tweeted](https://x.com/mxcl/status/608682016205344768) that Google had turned him down even though, in his words, 90% of their engineers used his software, because he could not invert a binary tree on a whiteboard. The tweet became a running joke about whiteboard interviews, and the problem became a standard warm-up. The good news: once you see that "invert the tree" means "swap the two children at every node", the code is about five lines, and the interesting part of the interview is everything around it — recursion versus a queue, in-place versus a copy, and one assignment-order bug that catches many people.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Should I change the tree **in place**, or return a new mirrored copy? | In place is the usual version (LeetCode 226) and uses no extra nodes; a copy leaves the original untouched but costs O(n) new nodes. |
| Should I return the root? | The usual signature returns the same root so calls can be chained; with in-place inversion the root node itself does not move. |
| Does "invert" mean mirror left and right? | Yes in the standard problem. "Upside-down" binary tree is a different problem (LeetCode 156) where leaves become roots. |
| How deep can the tree be? | A very deep chain breaks plain recursion in many runtimes; the BFS version avoids it. |
| Can the tree be empty? | The function should return null / \`None\` / \`nullptr\` without failing. |

## 3. The Core Idea

📌 **Interview term: Invert (mirror) a binary tree** — produce the mirror image: for **every** node, its left subtree becomes its right subtree and its right subtree becomes its left subtree.

Here is a small binary search tree before:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="Before: root 4 with left child 2 and right child 7; 2 has children 1 and 3; 7 has children 6 and 9">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="169" y1="157" x2="131" y2="213"/>
  <line class="d-edge" x1="191" y1="157" x2="229" y2="213"/>
  <line class="d-edge" x1="409" y1="157" x2="371" y2="213"/>
  <line class="d-edge" x1="431" y1="157" x2="469" y2="213"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">4</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">7</text>
  <circle class="d-box-muted" cx="120" cy="230" r="20"/>
  <text class="d-text" x="120" y="235" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="240" cy="230" r="20"/>
  <text class="d-text" x="240" y="235" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="360" cy="230" r="20"/>
  <text class="d-text" x="360" y="235" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="480" cy="230" r="20"/>
  <text class="d-text" x="480" y="235" text-anchor="middle">9</text>
</svg>

And after inverting it:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="After inverting: root 4 with left child 7 and right child 2; 7 has children 9 and 6; 2 has children 3 and 1">
  <line class="d-edge-accent" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge-accent" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="169" y1="157" x2="131" y2="213"/>
  <line class="d-edge" x1="191" y1="157" x2="229" y2="213"/>
  <line class="d-edge" x1="409" y1="157" x2="371" y2="213"/>
  <line class="d-edge" x1="431" y1="157" x2="469" y2="213"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">4</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">7</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="120" cy="230" r="20"/>
  <text class="d-text" x="120" y="235" text-anchor="middle">9</text>
  <circle class="d-box-muted" cx="240" cy="230" r="20"/>
  <text class="d-text" x="240" y="235" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="360" cy="230" r="20"/>
  <text class="d-text" x="360" y="235" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="480" cy="230" r="20"/>
  <text class="d-text" x="480" y="235" text-anchor="middle">1</text>
</svg>

Read the second picture left to right: \`7\` and \`2\` have swapped under the root, and inside each of them the children have swapped too (\`9, 6\` and \`3, 1\`). The values are now in **descending** order when read with an inorder traversal, which Example 2 prints.

### The one operation: swap at every node

At any single node the work is tiny: swap its two child links. The subtrees move as whole units; you do not touch their insides at that moment.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="One node swap: node N with children L and R becomes node N with children R and L; the subtrees move as whole units">
  <defs>
    <marker id="b15q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <circle class="d-box-accent" cx="150" cy="50" r="20"/>
  <text class="d-text" x="150" y="55" text-anchor="middle">N</text>
  <line class="d-edge" x1="136" y1="64" x2="94" y2="116"/>
  <line class="d-edge" x1="164" y1="64" x2="206" y2="116"/>
  <rect class="d-box" x="50" y="120" width="70" height="40" rx="6"/>
  <text class="d-text" x="85" y="145" text-anchor="middle">L</text>
  <rect class="d-box-muted" x="180" y="120" width="70" height="40" rx="6"/>
  <text class="d-text" x="215" y="145" text-anchor="middle">R</text>
  <path class="d-edge" d="M 280 100 L 350 100" marker-end="url(#b15q3-arrow)"/>
  <text class="d-sub" x="315" y="80" text-anchor="middle">swap</text>
  <circle class="d-box-accent" cx="490" cy="50" r="20"/>
  <text class="d-text" x="490" y="55" text-anchor="middle">N</text>
  <line class="d-edge-accent" x1="476" y1="64" x2="434" y2="116"/>
  <line class="d-edge-accent" x1="504" y1="64" x2="546" y2="116"/>
  <rect class="d-box-muted" x="390" y="120" width="70" height="40" rx="6"/>
  <text class="d-text" x="425" y="145" text-anchor="middle">R</text>
  <rect class="d-box" x="520" y="120" width="70" height="40" rx="6"/>
  <text class="d-text" x="555" y="145" text-anchor="middle">L</text>
</svg>

Swapping only at the root is not enough, because the subtrees would still be in their old orientation inside. So you do the swap **at every node**, and the order you visit nodes in does not matter:

- **Recursive:** invert the left subtree, invert the right subtree, swap them (postorder) — or swap first and then invert both children (preorder). Both are correct because each node is swapped exactly once.
- **Iterative BFS:** take nodes from a queue, swap each one's children, and add the children to the queue.
- **Iterative DFS:** the same with a stack.

📌 **Interview term: In-place** — modifying the existing structure instead of building a new one. Inverting in place allocates no nodes; only the recursion stack or the queue costs memory.

📌 **Interview term: Structural recursion** — a recursive function whose recursive calls are on the parts of the input (here, the two subtrees), so it naturally terminates when it reaches the empty tree. See [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).

### The assignment-order bug

The most common wrong answer is writing the swap as two separate assignments with recursive calls inside:

1. \`node.left = invert(node.right)\` — this **overwrites** \`node.left\`, so the original left subtree is no longer reachable from \`node\`.
2. \`node.right = invert(node.left)\` — this now reads the **new** left, which is the old right subtree, already inverted, and inverts it back.

The result loses the whole original left subtree and makes both children point at the same node. Example 2 runs exactly this bug on \`[4, 2, 7, 1, 3, 6, 9]\`: it prints \`[4, 7, 7, 9, 9, 9, 9]\` — the \`2, 1, 3\` side has vanished. The fix is to save both results (or the old left) before assigning, or to swap the pointers first and then recurse.

## 4. Approaches Compared

There is no meaningful brute force here: every node has to be visited, so O(n) is the floor, and every approach below achieves it. The choice is about memory and style.

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| Recursive (swap after or before recursing) | O(n) | O(h) call stack | Shortest code; overflows on very deep chains |
| Iterative BFS with a queue | O(n) | O(w), w = widest level | No recursion; up to about n/2 nodes queued on a perfect tree |
| Iterative DFS with a stack | O(n) | O(h) | No recursion; same memory profile as the recursive version |
| Build a mirrored copy | O(n) | O(n) new nodes | Use only when the original must stay unchanged |

📌 **Interview term: Height (h)** — the number of nodes on the longest root-to-leaf path; see [maximum depth of a binary tree](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree).

## 5. The Python Code, Line by Line

Recursive, using a tuple assignment:

~~~python
def invert(node):
    if node is None:
        return None
    node.left, node.right = invert(node.right), invert(node.left)  # swap the inverted subtrees
    return node
~~~

Iterative BFS:

~~~python
from collections import deque


def invert_iterative(root):
    queue = deque([root] if root else [])
    while queue:
        node = queue.popleft()
        node.left, node.right = node.right, node.left   # swap this node's children
        if node.left:
            queue.append(node.left)
        if node.right:
            queue.append(node.right)
    return root
~~~

What each Python piece is doing:

- **Tuple assignment is the safe swap.** In \`a, b = x, y\` Python evaluates the entire right-hand side first, building a tuple, and only then assigns to \`a\` and \`b\` from left to right (the [Python reference on assignment statements](https://docs.python.org/3/reference/simple_stmts.html#assignment-statements) describes this order). So \`invert(node.right)\` and \`invert(node.left)\` both run on the **original** children before either link changes. Example 2 runs the two-statement version for comparison:

~~~python
def invert_buggy(node):
    if node is None:
        return None
    node.left = invert_buggy(node.right)    # overwrites node.left ...
    node.right = invert_buggy(node.left)    # ... so this reads the NEW left
    return node
~~~

  which turns \`[4, 2, 7, 1, 3, 6, 9]\` into \`[4, 7, 7, 9, 9, 9, 9]\`.
- **\`return node\`** lets callers write \`root = invert(root)\` and lets the recursive call's result go straight into the tuple.
- **\`deque([root] if root else [])\`** starts with an empty queue for an empty tree, so the function returns \`None\` unchanged.
- **Swapping before enqueueing** in BFS means the order nodes are processed is the mirrored order, but it would be equally correct to enqueue first and swap afterwards.
- **\`serialize\`** in the examples prints the tree as a level-order list with \`null\` for gaps (the LeetCode format), so a one-child tree visibly changes sides.

📌 **Interview term: Recursion limit** — the recursive \`invert\` makes one nested call per level. With Python's default limit of 1000 (\`sys.getrecursionlimit()\`), a recursive function on a 100000-node chain raised \`RecursionError: maximum recursion depth exceeded\` when we ran it (see the [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) page for the run). The BFS version in Example 2 inverts that 100000-node chain without trouble.

**A non-destructive copy**, if the interviewer wants the original kept:

~~~python
def mirrored_copy(node):
    if node is None:
        return None
    return TreeNode(node.val, mirrored_copy(node.right), mirrored_copy(node.left))
~~~

It builds new nodes, so it costs O(n) extra memory.

### Dry run of the iterative BFS on \`[4, 2, 7, 1, 3, 6, 9]\`

| Dequeued | Children before | Children after the swap | Queue after adding children |
| :--- | :--- | :--- | :--- |
| 4 | 2, 7 | 7, 2 | 7, 2 |
| 7 | 6, 9 | 9, 6 | 2, 9, 6 |
| 2 | 1, 3 | 3, 1 | 9, 6, 3, 1 |
| 9 | none | none | 6, 3, 1 |
| 6 | none | none | 3, 1 |
| 3 | none | none | 1 |
| 1 | none | none | empty |

Seven nodes, seven swaps (four of them swap two \`null\`s, which is harmless). The level-order reading of the result is \`[4, 7, 2, 9, 6, 3, 1]\`.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`python3 main.py\` (Python 3.13). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive invert on six trees, shown in level-order form** printed:

~~~text
[4, 2, 7, 1, 3, 6, 9] -> [4, 7, 2, 9, 6, 3, 1]
[2, 1, 3] -> [2, 3, 1]
[1, 2] -> [1, null, 2]
[1, 2, null, 3] -> [1, null, 2, null, 3]
[7] -> [7]
[] -> []
inverting twice gives the original: true
~~~

**Example 2 — Iterative BFS invert, the two-step assignment bug, and a 100000-node chain** printed:

~~~text
recursive: [4, 7, 2, 9, 6, 3, 1]
iterative: [4, 7, 2, 9, 6, 3, 1]
same result: true
buggy two-step assignment: [4, 7, 7, 9, 9, 9, 9]
BST inorder:      [1, 2, 3, 4, 6, 7, 9]
inverted inorder: [9, 7, 6, 4, 3, 2, 1]
100000-node left chain inverted; nodes reachable going right: 100000
~~~

In Example 1, \`[1, 2] -> [1, null, 2]\` shows the only child moving from the left to the right. In Example 2 the recursive and iterative versions agree, the two-step assignment bug loses the whole \`2, 1, 3\` subtree, the inverted BST reads in descending order, and the 100000-node left chain becomes a right chain.

## 7. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive | O(n) | O(h) | One call and one swap per node; the call stack holds the current path |
| Iterative BFS | O(n) | O(w) | Each node is queued once; the queue holds at most one level |
| Iterative DFS | O(n) | O(h) | Each node is pushed once |
| Mirrored copy | O(n) | O(n) | One new node per old node, plus the stack |

h is about log2 n for a balanced tree and n for a chain. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty tree** — return null immediately; Example 1 prints \`[] -> []\`.
- **Single node** — nothing to swap below it; \`[7] -> [7]\`.
- **One child only** — \`[1, 2]\` becomes \`[1, null, 2]\`: the left child moves to the right. The level-order output has to show the \`null\` gap to prove it.
- **A chain** — \`[1, 2, null, 3]\` (left, left) becomes a right, right chain \`[1, null, 2, null, 3]\`. A 100000-node chain is the case where only the iterative version is safe (Example 2).
- **Inverting twice** returns the original tree, a handy self-test that Example 1 prints.
- **A BST** stops being a valid BST after inversion (its inorder becomes descending); that is expected, not a bug.

## Common Pitfalls

- **Two separate assignments with recursive calls.** \`node.left = invert(node.right)\` followed by \`node.right = invert(node.left)\` loses the original left subtree; Example 2 shows the damage. Use the tuple form.
- **Swapping only the root.** The subtrees keep their old orientation; the swap must happen at every node.
- **Forgetting to return the root.** \`invert\` that returns nothing makes \`node.left, node.right = invert(...), invert(...)\` assign \`None\` to both children.
- **\`list.pop(0)\` as the queue.** It is O(n) per call; use \`deque.popleft()\`.
- **Checking the result by printing node values in preorder only.** Preorder of \`[1, 2]\` and \`[1, null, 2]\` is the same \`[1, 2]\`; a level-order form with \`null\` markers (as in the examples) shows which side a child is on.
- **Recursing on a very deep tree.** The default recursion limit is 1000; use the BFS version.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Inverting mirrors the tree: at every node the left and right children swap, so the whole structure is flipped left to right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursive solution:</strong> <span style="color:#f0e2c8;">Base case <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node.left, node.right = invert(node.right), invert(node.left)</code> and return the node. The tuple assignment evaluates both calls before assigning, so nothing is lost.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Iterative solution:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque</code> BFS: pop a node, swap its children, push the non-empty ones. It avoids the recursion limit of 1000.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time since each node is swapped once; O(h) stack recursively or O(w) for the queue; in place, no new nodes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap:</strong> <span style="color:#f0e2c8;">Two separate assignments with the recursive calls inside overwrite <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node.left</code> before it is read and lose a subtree; I avoid that with the tuple swap or by swapping first.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the traversal order matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Each node needs exactly one swap; preorder, postorder and BFS all perform one swap per node and give the same mirror. Inorder needs care: after swapping at a node, the subtree you meant to visit second is now on the other side.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you check that two trees are mirrors of each other?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recursively compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a.left</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b.right</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a.right</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b.left</code> along with the values; that is the same idea as the symmetric tree check.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you invert without modifying the input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: build a mirrored copy with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeNode(node.val, copy(node.right), copy(node.left))</code>, at the cost of O(n) new nodes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to a BST when you invert it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It becomes a mirror BST: every left subtree holds larger values, so an inorder traversal comes out descending, as Example 2 prints.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which is better here, BFS or DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both are O(n). DFS with a stack uses O(h) memory and BFS uses O(w); for a balanced tree DFS uses less, for a long chain both are tiny.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Invert (mirror) a binary tree** | Swap the left and right subtrees at every node |
| **In-place** | Changing the existing structure rather than building a new one |
| **Structural recursion** | Recursion on the parts of the input (the subtrees), ending at the empty tree |
| **Height (h)** | Nodes on the longest root-to-leaf path; sets the recursion depth |
| **Tuple assignment** | \`a, b = x, y\` evaluates the right side fully before assigning; the safe Python swap |

---
**Conclusion:** Inverting a binary tree is one swap per node, done in any order: recursively with the safe tuple assignment \`node.left, node.right = invert(node.right), invert(node.left)\`, or iteratively with a \`collections.deque\` BFS that sidesteps the recursion limit. It is O(n) time, in place, and the only real trap is assigning one child before the other has been read.`,
        examples: [
          {
            label: "Recursive invert on six trees, shown in level-order form",
            code: `from collections import deque


class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def build(values):
    """Build a tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root


def serialize(root):
    """Level-order list with 'null' for gaps, trailing nulls removed."""
    out, queue = [], deque([root])
    while queue:
        node = queue.popleft()
        if node is None:
            out.append("null")
            continue
        out.append(str(node.val))
        queue.append(node.left)
        queue.append(node.right)
    while out and out[-1] == "null":
        out.pop()
    return "[" + ", ".join(out) + "]"


def invert(node):
    if node is None:
        return None
    node.left, node.right = invert(node.right), invert(node.left)  # swap the inverted subtrees
    return node


def show(values):
    root = build(values)
    before = serialize(root)
    return before + " -> " + serialize(invert(root))


print(show([4, 2, 7, 1, 3, 6, 9]))  # [4, 2, 7, 1, 3, 6, 9] -> [4, 7, 2, 9, 6, 3, 1]
print(show([2, 1, 3]))  # [2, 1, 3] -> [2, 3, 1]
print(show([1, 2]))  # [1, 2] -> [1, null, 2]
print(show([1, 2, None, 3]))  # [1, 2, null, 3] -> [1, null, 2, null, 3]
print(show([7]))  # [7] -> [7]
print(show([]))  # [] -> []
tree = build([4, 2, 7, 1, 3, 6, 9])
print("inverting twice gives the original: " + str(serialize(invert(invert(tree))) == "[4, 2, 7, 1, 3, 6, 9]").lower())  # inverting twice gives the original: true
`,
          },
          {
            label: "Iterative BFS invert, the two-step assignment bug, and a 100000-node chain",
            code: `from collections import deque


class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def build(values):
    """Build a tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root


def serialize(root):
    """Level-order list with 'null' for gaps, trailing nulls removed."""
    out, queue = [], deque([root])
    while queue:
        node = queue.popleft()
        if node is None:
            out.append("null")
            continue
        out.append(str(node.val))
        queue.append(node.left)
        queue.append(node.right)
    while out and out[-1] == "null":
        out.pop()
    return "[" + ", ".join(out) + "]"


def invert(node):
    if node is None:
        return None
    node.left, node.right = invert(node.right), invert(node.left)
    return node


def invert_iterative(root):
    queue = deque([root] if root else [])
    while queue:
        node = queue.popleft()
        node.left, node.right = node.right, node.left   # swap this node's children
        if node.left:
            queue.append(node.left)
        if node.right:
            queue.append(node.right)
    return root


def invert_buggy(node):
    if node is None:
        return None
    node.left = invert_buggy(node.right)    # overwrites node.left ...
    node.right = invert_buggy(node.left)    # ... so this reads the NEW left
    return node


def inorder(root):
    out, stack, node = [], [], root
    while stack or node:
        while node:
            stack.append(node)
            node = node.left
        node = stack.pop()
        out.append(node.val)
        node = node.right
    return out


values = [4, 2, 7, 1, 3, 6, 9]
a = serialize(invert(build(values)))
b = serialize(invert_iterative(build(values)))
print("recursive: " + a)  # recursive: [4, 7, 2, 9, 6, 3, 1]
print("iterative: " + b)  # iterative: [4, 7, 2, 9, 6, 3, 1]
print("same result: " + str(a == b).lower())  # same result: true
print("buggy two-step assignment: " + serialize(invert_buggy(build(values))))  # buggy two-step assignment: [4, 7, 7, 9, 9, 9, 9]

bst = build([4, 2, 7, 1, 3, 6, 9])
print("BST inorder:      " + str(inorder(bst)))
print("inverted inorder: " + str(inorder(invert_iterative(bst))))

chain = None
for v in range(100000):                  # every node has only a left child
    chain = TreeNode(v, chain)
invert_iterative(chain)
right_steps, node = 0, chain
while node:
    right_steps += 1
    node = node.right
print("100000-node left chain inverted; nodes reachable going right: " + str(right_steps))  # 100000-node left chain inverted; nodes reachable going right: 100000
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Write a JavaScript function invertTree(root) that mirrors a binary tree in place — every node's left and right children swap — and returns the root. After that, give me a version that does not use recursion."

**What a strong answer should cover:**
- Swap the children at every node; any visiting order works because each node is swapped once.
- A recursive version and an iterative BFS using an array with a head index.
- O(n) time; O(h) space recursively, O(w) for BFS; in place.
- The assignment-order bug: two separate assignments with recursive calls overwrite \`node.left\` before it is read.
- JavaScript specifics: the destructuring swap \`[node.left, node.right] = [invert(node.right), invert(node.left)]\` builds the right-hand array first, so it is safe; avoid repeated \`shift()\` for the queue; deep recursion throws \`RangeError\`.

**Clarifying questions expected:**
- "Should I invert in place or return a new tree?"
- "How deep can the tree be?"

**Code / implementation expected:** Yes — a recursive JavaScript function plus an iterative BFS version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a binary tree is.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this JavaScript version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Hold a printed organisation chart up to a mirror. Every manager is still above the same people, but everyone who was on the left is now on the right and the other way round, at every level of the chart. Inverting a binary tree is exactly that mirror image: at every node, the left and right children trade places.

The question is famous for a reason outside computer science. In June 2015 Max Howell, the creator of the Homebrew package manager, [tweeted](https://x.com/mxcl/status/608682016205344768) that Google had turned him down even though, in his words, 90% of their engineers used his software, because he could not invert a binary tree on a whiteboard. The tweet became a running joke about whiteboard interviews, and the problem became a standard warm-up. The good news: once you see that "invert the tree" means "swap the two children at every node", the code is about five lines, and the interesting part of the interview is everything around it — recursion versus a queue, in-place versus a copy, and one assignment-order bug that catches many people.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Should I change the tree **in place**, or return a new mirrored copy? | In place is the usual version (LeetCode 226) and uses no extra nodes; a copy leaves the original untouched but costs O(n) new nodes. |
| Should I return the root? | The usual signature returns the same root so calls can be chained; with in-place inversion the root node itself does not move. |
| Does "invert" mean mirror left and right? | Yes in the standard problem. "Upside-down" binary tree is a different problem (LeetCode 156) where leaves become roots. |
| How deep can the tree be? | A very deep chain breaks plain recursion in many runtimes; the BFS version avoids it. |
| Can the tree be empty? | The function should return null / \`None\` / \`nullptr\` without failing. |

## 3. The Core Idea

📌 **Interview term: Invert (mirror) a binary tree** — produce the mirror image: for **every** node, its left subtree becomes its right subtree and its right subtree becomes its left subtree.

Here is a small binary search tree before:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="Before: root 4 with left child 2 and right child 7; 2 has children 1 and 3; 7 has children 6 and 9">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="169" y1="157" x2="131" y2="213"/>
  <line class="d-edge" x1="191" y1="157" x2="229" y2="213"/>
  <line class="d-edge" x1="409" y1="157" x2="371" y2="213"/>
  <line class="d-edge" x1="431" y1="157" x2="469" y2="213"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">4</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">7</text>
  <circle class="d-box-muted" cx="120" cy="230" r="20"/>
  <text class="d-text" x="120" y="235" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="240" cy="230" r="20"/>
  <text class="d-text" x="240" y="235" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="360" cy="230" r="20"/>
  <text class="d-text" x="360" y="235" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="480" cy="230" r="20"/>
  <text class="d-text" x="480" y="235" text-anchor="middle">9</text>
</svg>

And after inverting it:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="After inverting: root 4 with left child 7 and right child 2; 7 has children 9 and 6; 2 has children 3 and 1">
  <line class="d-edge-accent" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge-accent" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="169" y1="157" x2="131" y2="213"/>
  <line class="d-edge" x1="191" y1="157" x2="229" y2="213"/>
  <line class="d-edge" x1="409" y1="157" x2="371" y2="213"/>
  <line class="d-edge" x1="431" y1="157" x2="469" y2="213"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">4</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">7</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="120" cy="230" r="20"/>
  <text class="d-text" x="120" y="235" text-anchor="middle">9</text>
  <circle class="d-box-muted" cx="240" cy="230" r="20"/>
  <text class="d-text" x="240" y="235" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="360" cy="230" r="20"/>
  <text class="d-text" x="360" y="235" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="480" cy="230" r="20"/>
  <text class="d-text" x="480" y="235" text-anchor="middle">1</text>
</svg>

Read the second picture left to right: \`7\` and \`2\` have swapped under the root, and inside each of them the children have swapped too (\`9, 6\` and \`3, 1\`). The values are now in **descending** order when read with an inorder traversal, which Example 2 prints.

### The one operation: swap at every node

At any single node the work is tiny: swap its two child links. The subtrees move as whole units; you do not touch their insides at that moment.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="One node swap: node N with children L and R becomes node N with children R and L; the subtrees move as whole units">
  <defs>
    <marker id="b15q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <circle class="d-box-accent" cx="150" cy="50" r="20"/>
  <text class="d-text" x="150" y="55" text-anchor="middle">N</text>
  <line class="d-edge" x1="136" y1="64" x2="94" y2="116"/>
  <line class="d-edge" x1="164" y1="64" x2="206" y2="116"/>
  <rect class="d-box" x="50" y="120" width="70" height="40" rx="6"/>
  <text class="d-text" x="85" y="145" text-anchor="middle">L</text>
  <rect class="d-box-muted" x="180" y="120" width="70" height="40" rx="6"/>
  <text class="d-text" x="215" y="145" text-anchor="middle">R</text>
  <path class="d-edge" d="M 280 100 L 350 100" marker-end="url(#b15q3-arrow)"/>
  <text class="d-sub" x="315" y="80" text-anchor="middle">swap</text>
  <circle class="d-box-accent" cx="490" cy="50" r="20"/>
  <text class="d-text" x="490" y="55" text-anchor="middle">N</text>
  <line class="d-edge-accent" x1="476" y1="64" x2="434" y2="116"/>
  <line class="d-edge-accent" x1="504" y1="64" x2="546" y2="116"/>
  <rect class="d-box-muted" x="390" y="120" width="70" height="40" rx="6"/>
  <text class="d-text" x="425" y="145" text-anchor="middle">R</text>
  <rect class="d-box" x="520" y="120" width="70" height="40" rx="6"/>
  <text class="d-text" x="555" y="145" text-anchor="middle">L</text>
</svg>

Swapping only at the root is not enough, because the subtrees would still be in their old orientation inside. So you do the swap **at every node**, and the order you visit nodes in does not matter:

- **Recursive:** invert the left subtree, invert the right subtree, swap them (postorder) — or swap first and then invert both children (preorder). Both are correct because each node is swapped exactly once.
- **Iterative BFS:** take nodes from a queue, swap each one's children, and add the children to the queue.
- **Iterative DFS:** the same with a stack.

📌 **Interview term: In-place** — modifying the existing structure instead of building a new one. Inverting in place allocates no nodes; only the recursion stack or the queue costs memory.

📌 **Interview term: Structural recursion** — a recursive function whose recursive calls are on the parts of the input (here, the two subtrees), so it naturally terminates when it reaches the empty tree. See [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).

### The assignment-order bug

The most common wrong answer is writing the swap as two separate assignments with recursive calls inside:

1. \`node.left = invert(node.right)\` — this **overwrites** \`node.left\`, so the original left subtree is no longer reachable from \`node\`.
2. \`node.right = invert(node.left)\` — this now reads the **new** left, which is the old right subtree, already inverted, and inverts it back.

The result loses the whole original left subtree and makes both children point at the same node. Example 2 runs exactly this bug on \`[4, 2, 7, 1, 3, 6, 9]\`: it prints \`[4, 7, 7, 9, 9, 9, 9]\` — the \`2, 1, 3\` side has vanished. The fix is to save both results (or the old left) before assigning, or to swap the pointers first and then recurse.

## 4. Approaches Compared

There is no meaningful brute force here: every node has to be visited, so O(n) is the floor, and every approach below achieves it. The choice is about memory and style.

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| Recursive (swap after or before recursing) | O(n) | O(h) call stack | Shortest code; overflows on very deep chains |
| Iterative BFS with a queue | O(n) | O(w), w = widest level | No recursion; up to about n/2 nodes queued on a perfect tree |
| Iterative DFS with a stack | O(n) | O(h) | No recursion; same memory profile as the recursive version |
| Build a mirrored copy | O(n) | O(n) new nodes | Use only when the original must stay unchanged |

📌 **Interview term: Height (h)** — the number of nodes on the longest root-to-leaf path; see [maximum depth of a binary tree](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree).

## 5. The JavaScript Code, Line by Line

Recursive, using a destructuring swap:

~~~javascript
function invert(node) {
  if (node === null) return null;
  [node.left, node.right] = [invert(node.right), invert(node.left)]; // swap the inverted subtrees
  return node;
}
~~~

Iterative BFS, with a head index instead of \`shift()\`:

~~~javascript
function invertIterative(root) {
  const queue = root ? [root] : [];
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    [node.left, node.right] = [node.right, node.left]; // swap this node's children
    if (node.left) queue.push(node.left);
    if (node.right) queue.push(node.right);
  }
  return root;
}
~~~

What each JavaScript piece is doing:

- **The destructuring swap is safe.** The right-hand side \`[invert(node.right), invert(node.left)]\` is an array literal, fully evaluated before the destructuring assigns anything, so both recursive calls see the **original** children. Example 2 runs the two-statement version for comparison:

~~~javascript
function invertBuggy(node) {
  if (node === null) return null;
  node.left = invertBuggy(node.right);   // overwrites node.left ...
  node.right = invertBuggy(node.left);   // ... so this reads the NEW left
  return node;
}
~~~

  which turns \`[4, 2, 7, 1, 3, 6, 9]\` into \`[4, 7, 7, 9, 9, 9, 9]\`.
- **A semicolon before a line that starts with \`[\`.** If the previous line has no semicolon, JavaScript can join \`foo()\` and \`[a, b] = [b, a]\` into \`foo()[a, b] = ...\`. The examples end every statement with \`;\`, which avoids this automatic-semicolon-insertion trap.
- **The head-index loop** reads \`queue[head]\` and keeps pushing to the end; it never removes from the front, so each step is O(1). The array grows to n entries, which is fine for this purpose.
- **\`return node\`** allows \`root = invert(root)\` and is required for the destructuring version, which assigns the returned values.
- **\`serialize\`** in the examples prints the level-order form with \`null\` gaps so a one-child tree visibly changes sides.

📌 **Interview term: Stack overflow (\`RangeError\`)** — the recursive version nests one call per level; on a 100000-node chain a recursive tree function threw \`RangeError: Maximum call stack size exceeded\` in Node.js 22 (see the [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) page for that run). Example 2 inverts the same size of chain with the BFS version.

**A non-destructive copy**, if the original must be kept:

~~~javascript
function mirroredCopy(node) {
  if (node === null) return null;
  return new TreeNode(node.val, mirroredCopy(node.right), mirroredCopy(node.left));
}
~~~

### Dry run of the iterative BFS on \`[4, 2, 7, 1, 3, 6, 9]\`

| Dequeued | Children before | Children after the swap | Queue after adding children |
| :--- | :--- | :--- | :--- |
| 4 | 2, 7 | 7, 2 | 7, 2 |
| 7 | 6, 9 | 9, 6 | 2, 9, 6 |
| 2 | 1, 3 | 3, 1 | 9, 6, 3, 1 |
| 9 | none | none | 6, 3, 1 |
| 6 | none | none | 3, 1 |
| 3 | none | none | 1 |
| 1 | none | none | empty |

Seven nodes, seven swaps (four of them swap two \`null\`s, which is harmless). The level-order reading of the result is \`[4, 7, 2, 9, 6, 3, 1]\`.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`node main.js\` (Node.js 22). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive invert on six trees, shown in level-order form** printed:

~~~text
[4, 2, 7, 1, 3, 6, 9] -> [4, 7, 2, 9, 6, 3, 1]
[2, 1, 3] -> [2, 3, 1]
[1, 2] -> [1, null, 2]
[1, 2, null, 3] -> [1, null, 2, null, 3]
[7] -> [7]
[] -> []
inverting twice gives the original: true
~~~

**Example 2 — Iterative BFS invert, the two-step assignment bug, and a 100000-node chain** printed:

~~~text
recursive: [4, 7, 2, 9, 6, 3, 1]
iterative: [4, 7, 2, 9, 6, 3, 1]
same result: true
buggy two-step assignment: [4, 7, 7, 9, 9, 9, 9]
BST inorder:      [1, 2, 3, 4, 6, 7, 9]
inverted inorder: [9, 7, 6, 4, 3, 2, 1]
100000-node left chain inverted; nodes reachable going right: 100000
~~~

In Example 1, \`[1, 2] -> [1, null, 2]\` shows the only child moving from the left to the right. In Example 2 the recursive and iterative versions agree, the two-step assignment bug loses the whole \`2, 1, 3\` subtree, the inverted BST reads in descending order, and the 100000-node left chain becomes a right chain.

## 7. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive | O(n) | O(h) | One call and one swap per node; the call stack holds the current path |
| Iterative BFS | O(n) | O(w) | Each node is queued once; the queue holds at most one level |
| Iterative DFS | O(n) | O(h) | Each node is pushed once |
| Mirrored copy | O(n) | O(n) | One new node per old node, plus the stack |

h is about log2 n for a balanced tree and n for a chain. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty tree** — return null immediately; Example 1 prints \`[] -> []\`.
- **Single node** — nothing to swap below it; \`[7] -> [7]\`.
- **One child only** — \`[1, 2]\` becomes \`[1, null, 2]\`: the left child moves to the right. The level-order output has to show the \`null\` gap to prove it.
- **A chain** — \`[1, 2, null, 3]\` (left, left) becomes a right, right chain \`[1, null, 2, null, 3]\`. A 100000-node chain is the case where only the iterative version is safe (Example 2).
- **Inverting twice** returns the original tree, a handy self-test that Example 1 prints.
- **A BST** stops being a valid BST after inversion (its inorder becomes descending); that is expected, not a bug.

## Common Pitfalls

- **Two separate assignments with recursive calls.** Loses the original left subtree; Example 2 prints the broken result. Use the destructuring swap or a temporary variable.
- **Swapping only at the root.** Every node needs a swap.
- **A missing semicolon before \`[a, b] = [b, a]\`.** The line can merge with the previous expression; end the previous statement with \`;\`.
- **\`queue.shift()\` in a loop.** It re-indexes the array each time; use a head index.
- **Forgetting \`return node\`.** The destructuring version then assigns \`undefined\` to both children.
- **Comparing trees by preorder values only.** \`[1, 2]\` and \`[1, null, 2]\` have the same preorder; print a level-order form with \`null\` markers.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Inverting mirrors the tree: at every node the left and right children swap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursive solution:</strong> <span style="color:#f0e2c8;">Return null for null; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[node.left, node.right] = [invert(node.right), invert(node.left)]</code> and return the node. The array literal is evaluated before assignment, so nothing is lost.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Iterative solution:</strong> <span style="color:#f0e2c8;">BFS with an array and a head index: take a node, swap its children, push the non-null ones. No recursion, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, one swap per node; O(h) stack recursively or O(w) for the queue; in place.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap:</strong> <span style="color:#f0e2c8;">Writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node.left = invert(node.right)</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node.right = invert(node.left)</code> overwrites the left link before it is read and loses a subtree.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the traversal order matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No; preorder, postorder and BFS all swap each node once. Inorder is the awkward one, because after swapping at a node the subtree you planned to visit next is now on the other side.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you invert without mutating the input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build a mirrored copy: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new TreeNode(node.val, mirroredCopy(node.right), mirroredCopy(node.left))</code>; O(n) extra nodes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if nodes are plain objects from JSON with missing keys?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node.left</code> may be <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if (!node) return null;</code> as the base case, and the swap still works because it just moves <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> across.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is inverting the same as reversing the level-order array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Reversing the whole level-order array would move nodes between levels. Inverting reverses each level separately, and only in the sense of mirroring the structure.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to a BST?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It becomes a mirror BST, so an inorder traversal comes out in descending order; Example 2 prints it.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Invert (mirror) a binary tree** | Swap the left and right subtrees at every node |
| **In-place** | Changing the existing structure rather than building a new one |
| **Structural recursion** | Recursion on the parts of the input (the subtrees), ending at the empty tree |
| **Height (h)** | Nodes on the longest root-to-leaf path; sets the recursion depth |
| **Destructuring swap** | \`[a, b] = [b, a]\` builds the right-hand array first, then assigns; the safe JavaScript swap |

---
**Conclusion:** Inverting a binary tree is one swap per node, done in any order: recursively with the destructuring swap \`[node.left, node.right] = [invert(node.right), invert(node.left)]\`, or iteratively with a head-index BFS that avoids both \`shift()\` and \`RangeError\`. It is O(n) time, in place, and the trap to avoid is assigning one child before the other has been read.`,
        examples: [
          {
            label: "Recursive invert on six trees, shown in level-order form",
            code: `class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// Build a tree from a level-order array; null marks a missing child.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new TreeNode(values[0]);
  const queue = [root];
  let head = 0; // index of the next node to give children (avoids shift())
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) { node.left = new TreeNode(values[i]); queue.push(node.left); }
    i++;
    if (i < values.length && values[i] !== null) { node.right = new TreeNode(values[i]); queue.push(node.right); }
    i++;
  }
  return root;
}

// Level-order array with 'null' for gaps, trailing nulls removed.
function serialize(root) {
  const out = [];
  const queue = [root];
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    if (node === null) { out.push('null'); continue; }
    out.push(String(node.val));
    queue.push(node.left, node.right);
  }
  while (out.length > 0 && out[out.length - 1] === 'null') out.pop();
  return '[' + out.join(', ') + ']';
}

function invert(node) {
  if (node === null) return null;
  [node.left, node.right] = [invert(node.right), invert(node.left)]; // swap the inverted subtrees
  return node;
}

function show(values) {
  const root = build(values);
  const before = serialize(root);
  return before + ' -> ' + serialize(invert(root));
}

console.log(show([4, 2, 7, 1, 3, 6, 9])); // [4, 2, 7, 1, 3, 6, 9] -> [4, 7, 2, 9, 6, 3, 1]
console.log(show([2, 1, 3])); // [2, 1, 3] -> [2, 3, 1]
console.log(show([1, 2])); // [1, 2] -> [1, null, 2]
console.log(show([1, 2, null, 3])); // [1, 2, null, 3] -> [1, null, 2, null, 3]
console.log(show([7])); // [7] -> [7]
console.log(show([])); // [] -> []
const tree = build([4, 2, 7, 1, 3, 6, 9]);
console.log('inverting twice gives the original: ' + (serialize(invert(invert(tree))) === '[4, 2, 7, 1, 3, 6, 9]')); // inverting twice gives the original: true
`,
          },
          {
            label: "Iterative BFS invert, the two-step assignment bug, and a 100000-node chain",
            code: `class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// Build a tree from a level-order array; null marks a missing child.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new TreeNode(values[0]);
  const queue = [root];
  let head = 0; // index of the next node to give children (avoids shift())
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) { node.left = new TreeNode(values[i]); queue.push(node.left); }
    i++;
    if (i < values.length && values[i] !== null) { node.right = new TreeNode(values[i]); queue.push(node.right); }
    i++;
  }
  return root;
}

// Level-order array with 'null' for gaps, trailing nulls removed.
function serialize(root) {
  const out = [];
  const queue = [root];
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    if (node === null) { out.push('null'); continue; }
    out.push(String(node.val));
    queue.push(node.left, node.right);
  }
  while (out.length > 0 && out[out.length - 1] === 'null') out.pop();
  return '[' + out.join(', ') + ']';
}

function invert(node) {
  if (node === null) return null;
  [node.left, node.right] = [invert(node.right), invert(node.left)];
  return node;
}

function invertIterative(root) {
  const queue = root ? [root] : [];
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    [node.left, node.right] = [node.right, node.left]; // swap this node's children
    if (node.left) queue.push(node.left);
    if (node.right) queue.push(node.right);
  }
  return root;
}

function invertBuggy(node) {
  if (node === null) return null;
  node.left = invertBuggy(node.right);   // overwrites node.left ...
  node.right = invertBuggy(node.left);   // ... so this reads the NEW left
  return node;
}

function inorder(root) {
  const out = [];
  const stack = [];
  let node = root;
  while (stack.length > 0 || node) {
    while (node) { stack.push(node); node = node.left; }
    node = stack.pop();
    out.push(node.val);
    node = node.right;
  }
  return out;
}

const values = [4, 2, 7, 1, 3, 6, 9];
const a = serialize(invert(build(values)));
const b = serialize(invertIterative(build(values)));
console.log('recursive: ' + a); // recursive: [4, 7, 2, 9, 6, 3, 1]
console.log('iterative: ' + b); // iterative: [4, 7, 2, 9, 6, 3, 1]
console.log('same result: ' + (a === b)); // same result: true
console.log('buggy two-step assignment: ' + serialize(invertBuggy(build(values)))); // buggy two-step assignment: [4, 7, 7, 9, 9, 9, 9]

const bst = build([4, 2, 7, 1, 3, 6, 9]);
console.log('BST inorder:      [' + inorder(bst).join(', ') + ']'); // BST inorder:      [1, 2, 3, 4, 6, 7, 9]
console.log('inverted inorder: [' + inorder(invertIterative(bst)).join(', ') + ']'); // inverted inorder: [9, 7, 6, 4, 3, 2, 1]

let chain = null;
for (let v = 0; v < 100000; v++) chain = new TreeNode(v, chain); // every node has only a left child
invertIterative(chain);
let rightSteps = 0;
for (let node = chain; node; node = node.right) rightSteps++;
console.log('100000-node left chain inverted; nodes reachable going right: ' + rightSteps); // 100000-node left chain inverted; nodes reachable going right: 100000
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Write a Java method TreeNode invertTree(TreeNode root) that mirrors a binary tree in place and returns the root. Then show me an iterative version and tell me which queue implementation you would use."

**What a strong answer should cover:**
- Swap the children at every node; any visiting order works because each node is swapped once.
- A recursive version and an iterative BFS with \`ArrayDeque\`.
- O(n) time; O(h) space recursively, O(w) for BFS; in place.
- The assignment-order bug: two separate assignments with recursive calls overwrite \`node.left\` before it is read.
- Java specifics: Java has no tuple swap, so save both recursive results (or the old \`left\`) in local variables first; \`ArrayDeque\` rejects \`null\` so only enqueue existing children; deep recursion throws \`StackOverflowError\`.

**Clarifying questions expected:**
- "Should I modify the tree in place?"
- "Could the tree be degenerate?"

**Code / implementation expected:** Yes — a recursive Java method with local variables for the swap, plus an iterative \`ArrayDeque\` version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a binary tree is.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Java version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Hold a printed organisation chart up to a mirror. Every manager is still above the same people, but everyone who was on the left is now on the right and the other way round, at every level of the chart. Inverting a binary tree is exactly that mirror image: at every node, the left and right children trade places.

The question is famous for a reason outside computer science. In June 2015 Max Howell, the creator of the Homebrew package manager, [tweeted](https://x.com/mxcl/status/608682016205344768) that Google had turned him down even though, in his words, 90% of their engineers used his software, because he could not invert a binary tree on a whiteboard. The tweet became a running joke about whiteboard interviews, and the problem became a standard warm-up. The good news: once you see that "invert the tree" means "swap the two children at every node", the code is about five lines, and the interesting part of the interview is everything around it — recursion versus a queue, in-place versus a copy, and one assignment-order bug that catches many people.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Should I change the tree **in place**, or return a new mirrored copy? | In place is the usual version (LeetCode 226) and uses no extra nodes; a copy leaves the original untouched but costs O(n) new nodes. |
| Should I return the root? | The usual signature returns the same root so calls can be chained; with in-place inversion the root node itself does not move. |
| Does "invert" mean mirror left and right? | Yes in the standard problem. "Upside-down" binary tree is a different problem (LeetCode 156) where leaves become roots. |
| How deep can the tree be? | A very deep chain breaks plain recursion in many runtimes; the BFS version avoids it. |
| Can the tree be empty? | The function should return null / \`None\` / \`nullptr\` without failing. |

## 3. The Core Idea

📌 **Interview term: Invert (mirror) a binary tree** — produce the mirror image: for **every** node, its left subtree becomes its right subtree and its right subtree becomes its left subtree.

Here is a small binary search tree before:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="Before: root 4 with left child 2 and right child 7; 2 has children 1 and 3; 7 has children 6 and 9">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="169" y1="157" x2="131" y2="213"/>
  <line class="d-edge" x1="191" y1="157" x2="229" y2="213"/>
  <line class="d-edge" x1="409" y1="157" x2="371" y2="213"/>
  <line class="d-edge" x1="431" y1="157" x2="469" y2="213"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">4</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">7</text>
  <circle class="d-box-muted" cx="120" cy="230" r="20"/>
  <text class="d-text" x="120" y="235" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="240" cy="230" r="20"/>
  <text class="d-text" x="240" y="235" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="360" cy="230" r="20"/>
  <text class="d-text" x="360" y="235" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="480" cy="230" r="20"/>
  <text class="d-text" x="480" y="235" text-anchor="middle">9</text>
</svg>

And after inverting it:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="After inverting: root 4 with left child 7 and right child 2; 7 has children 9 and 6; 2 has children 3 and 1">
  <line class="d-edge-accent" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge-accent" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="169" y1="157" x2="131" y2="213"/>
  <line class="d-edge" x1="191" y1="157" x2="229" y2="213"/>
  <line class="d-edge" x1="409" y1="157" x2="371" y2="213"/>
  <line class="d-edge" x1="431" y1="157" x2="469" y2="213"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">4</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">7</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="120" cy="230" r="20"/>
  <text class="d-text" x="120" y="235" text-anchor="middle">9</text>
  <circle class="d-box-muted" cx="240" cy="230" r="20"/>
  <text class="d-text" x="240" y="235" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="360" cy="230" r="20"/>
  <text class="d-text" x="360" y="235" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="480" cy="230" r="20"/>
  <text class="d-text" x="480" y="235" text-anchor="middle">1</text>
</svg>

Read the second picture left to right: \`7\` and \`2\` have swapped under the root, and inside each of them the children have swapped too (\`9, 6\` and \`3, 1\`). The values are now in **descending** order when read with an inorder traversal, which Example 2 prints.

### The one operation: swap at every node

At any single node the work is tiny: swap its two child links. The subtrees move as whole units; you do not touch their insides at that moment.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="One node swap: node N with children L and R becomes node N with children R and L; the subtrees move as whole units">
  <defs>
    <marker id="b15q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <circle class="d-box-accent" cx="150" cy="50" r="20"/>
  <text class="d-text" x="150" y="55" text-anchor="middle">N</text>
  <line class="d-edge" x1="136" y1="64" x2="94" y2="116"/>
  <line class="d-edge" x1="164" y1="64" x2="206" y2="116"/>
  <rect class="d-box" x="50" y="120" width="70" height="40" rx="6"/>
  <text class="d-text" x="85" y="145" text-anchor="middle">L</text>
  <rect class="d-box-muted" x="180" y="120" width="70" height="40" rx="6"/>
  <text class="d-text" x="215" y="145" text-anchor="middle">R</text>
  <path class="d-edge" d="M 280 100 L 350 100" marker-end="url(#b15q3-arrow)"/>
  <text class="d-sub" x="315" y="80" text-anchor="middle">swap</text>
  <circle class="d-box-accent" cx="490" cy="50" r="20"/>
  <text class="d-text" x="490" y="55" text-anchor="middle">N</text>
  <line class="d-edge-accent" x1="476" y1="64" x2="434" y2="116"/>
  <line class="d-edge-accent" x1="504" y1="64" x2="546" y2="116"/>
  <rect class="d-box-muted" x="390" y="120" width="70" height="40" rx="6"/>
  <text class="d-text" x="425" y="145" text-anchor="middle">R</text>
  <rect class="d-box" x="520" y="120" width="70" height="40" rx="6"/>
  <text class="d-text" x="555" y="145" text-anchor="middle">L</text>
</svg>

Swapping only at the root is not enough, because the subtrees would still be in their old orientation inside. So you do the swap **at every node**, and the order you visit nodes in does not matter:

- **Recursive:** invert the left subtree, invert the right subtree, swap them (postorder) — or swap first and then invert both children (preorder). Both are correct because each node is swapped exactly once.
- **Iterative BFS:** take nodes from a queue, swap each one's children, and add the children to the queue.
- **Iterative DFS:** the same with a stack.

📌 **Interview term: In-place** — modifying the existing structure instead of building a new one. Inverting in place allocates no nodes; only the recursion stack or the queue costs memory.

📌 **Interview term: Structural recursion** — a recursive function whose recursive calls are on the parts of the input (here, the two subtrees), so it naturally terminates when it reaches the empty tree. See [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).

### The assignment-order bug

The most common wrong answer is writing the swap as two separate assignments with recursive calls inside:

1. \`node.left = invert(node.right)\` — this **overwrites** \`node.left\`, so the original left subtree is no longer reachable from \`node\`.
2. \`node.right = invert(node.left)\` — this now reads the **new** left, which is the old right subtree, already inverted, and inverts it back.

The result loses the whole original left subtree and makes both children point at the same node. Example 2 runs exactly this bug on \`[4, 2, 7, 1, 3, 6, 9]\`: it prints \`[4, 7, 7, 9, 9, 9, 9]\` — the \`2, 1, 3\` side has vanished. The fix is to save both results (or the old left) before assigning, or to swap the pointers first and then recurse.

## 4. Approaches Compared

There is no meaningful brute force here: every node has to be visited, so O(n) is the floor, and every approach below achieves it. The choice is about memory and style.

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| Recursive (swap after or before recursing) | O(n) | O(h) call stack | Shortest code; overflows on very deep chains |
| Iterative BFS with a queue | O(n) | O(w), w = widest level | No recursion; up to about n/2 nodes queued on a perfect tree |
| Iterative DFS with a stack | O(n) | O(h) | No recursion; same memory profile as the recursive version |
| Build a mirrored copy | O(n) | O(n) new nodes | Use only when the original must stay unchanged |

📌 **Interview term: Height (h)** — the number of nodes on the longest root-to-leaf path; see [maximum depth of a binary tree](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree).

## 5. The Java Code, Line by Line

Recursive, with both results saved before assigning:

~~~java
static TreeNode invert(TreeNode node) {
    if (node == null) return null;
    TreeNode left = invert(node.left);     // keep both results before assigning
    TreeNode right = invert(node.right);
    node.left = right;
    node.right = left;
    return node;
}
~~~

Iterative BFS:

~~~java
static TreeNode invertIterative(TreeNode root) {
    Deque<TreeNode> queue = new ArrayDeque<>();
    if (root != null) queue.add(root);
    while (!queue.isEmpty()) {
        TreeNode node = queue.poll();
        TreeNode tmp = node.left;          // swap this node's children
        node.left = node.right;
        node.right = tmp;
        if (node.left != null) queue.add(node.left);
        if (node.right != null) queue.add(node.right);
    }
    return root;
}
~~~

What each Java piece is doing:

- **Local variables make the swap safe.** Java has no multiple assignment, so the classic three-step swap with a temporary (\`tmp\`) is the idiom. In the recursive version both recursive results are stored first; nothing is overwritten before it has been read. Example 2 runs the two-statement version for comparison:

~~~java
static TreeNode invertBuggy(TreeNode node) {
    if (node == null) return null;
    node.left = invertBuggy(node.right);   // overwrites node.left ...
    node.right = invertBuggy(node.left);   // ... so this reads the NEW left
    return node;
}
~~~

  which turns \`[4, 2, 7, 1, 3, 6, 9]\` into \`[4, 7, 7, 9, 9, 9, 9]\`.
- **Object references, not copies.** \`node.left = right\` moves a reference; the subtree itself is not copied, which is why inversion is O(1) per node.
- **\`ArrayDeque\` and nulls.** The [\`ArrayDeque\` documentation](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayDeque.html) says null elements are prohibited, so the null checks before \`add\` are required. The \`serialize\` helper in the examples deliberately uses a \`LinkedList\` queue because it *does* want to enqueue \`null\` children to print \`null\` gaps; \`LinkedList\` permits null elements.
- **\`String.join(", ", out)\`** builds the \`[4, 7, 2, ...]\` string in \`serialize\`.
- **Returning the root** lets callers write \`root = invertTree(root)\`.

📌 **Interview term: \`StackOverflowError\`** — one nested call per level means a 100000-node chain overflows the default thread stack; the [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) page shows that run (\`caught java.lang.StackOverflowError\`). Example 2 inverts a 100000-node chain with the \`ArrayDeque\` version.

**A non-destructive copy**, if the input must stay unchanged:

~~~java
static TreeNode mirroredCopy(TreeNode node) {
    if (node == null) return null;
    return new TreeNode(node.val, mirroredCopy(node.right), mirroredCopy(node.left));
}
~~~

### Dry run of the iterative BFS on \`[4, 2, 7, 1, 3, 6, 9]\`

| Dequeued | Children before | Children after the swap | Queue after adding children |
| :--- | :--- | :--- | :--- |
| 4 | 2, 7 | 7, 2 | 7, 2 |
| 7 | 6, 9 | 9, 6 | 2, 9, 6 |
| 2 | 1, 3 | 3, 1 | 9, 6, 3, 1 |
| 9 | none | none | 6, 3, 1 |
| 6 | none | none | 3, 1 |
| 3 | none | none | 1 |
| 1 | none | none | empty |

Seven nodes, seven swaps (four of them swap two \`null\`s, which is harmless). The level-order reading of the result is \`[4, 7, 2, 9, 6, 3, 1]\`.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`javac Main.java && java Main\` (OpenJDK 21 (javac 21)). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive invert on six trees, shown in level-order form** printed:

~~~text
[4, 2, 7, 1, 3, 6, 9] -> [4, 7, 2, 9, 6, 3, 1]
[2, 1, 3] -> [2, 3, 1]
[1, 2] -> [1, null, 2]
[1, 2, null, 3] -> [1, null, 2, null, 3]
[7] -> [7]
[] -> []
inverting twice gives the original: true
~~~

**Example 2 — Iterative BFS invert, the two-step assignment bug, and a 100000-node chain** printed:

~~~text
recursive: [4, 7, 2, 9, 6, 3, 1]
iterative: [4, 7, 2, 9, 6, 3, 1]
same result: true
buggy two-step assignment: [4, 7, 7, 9, 9, 9, 9]
BST inorder:      [1, 2, 3, 4, 6, 7, 9]
inverted inorder: [9, 7, 6, 4, 3, 2, 1]
100000-node left chain inverted; nodes reachable going right: 100000
~~~

In Example 1, \`[1, 2] -> [1, null, 2]\` shows the only child moving from the left to the right. In Example 2 the recursive and iterative versions agree, the two-step assignment bug loses the whole \`2, 1, 3\` subtree, the inverted BST reads in descending order, and the 100000-node left chain becomes a right chain.

## 7. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive | O(n) | O(h) | One call and one swap per node; the call stack holds the current path |
| Iterative BFS | O(n) | O(w) | Each node is queued once; the queue holds at most one level |
| Iterative DFS | O(n) | O(h) | Each node is pushed once |
| Mirrored copy | O(n) | O(n) | One new node per old node, plus the stack |

h is about log2 n for a balanced tree and n for a chain. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty tree** — return null immediately; Example 1 prints \`[] -> []\`.
- **Single node** — nothing to swap below it; \`[7] -> [7]\`.
- **One child only** — \`[1, 2]\` becomes \`[1, null, 2]\`: the left child moves to the right. The level-order output has to show the \`null\` gap to prove it.
- **A chain** — \`[1, 2, null, 3]\` (left, left) becomes a right, right chain \`[1, null, 2, null, 3]\`. A 100000-node chain is the case where only the iterative version is safe (Example 2).
- **Inverting twice** returns the original tree, a handy self-test that Example 1 prints.
- **A BST** stops being a valid BST after inversion (its inorder becomes descending); that is expected, not a bug.

## Common Pitfalls

- **Two separate assignments with recursive calls.** Loses the original left subtree; Example 2 prints \`[4, 7, 7, 9, 9, 9, 9]\`. Save both results, or the old \`left\`, first.
- **Swapping only at the root.** Every node needs a swap.
- **Adding null children to \`ArrayDeque\`.** \`NullPointerException\`; check before \`add\`.
- **Assuming \`node.left = node.right\` copies the subtree.** It copies a reference; after it both fields point at the same subtree until you assign \`right\`.
- **Forgetting \`return node\`** in a method declared to return \`TreeNode\`. It will not compile in Java, which is a small mercy, but a \`void\` version cannot be used as \`root = invertTree(root)\`.
- **Deep recursion on a degenerate tree.** \`StackOverflowError\`; use the iterative version.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Inverting mirrors the tree: at every node the left and right children swap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursive solution:</strong> <span style="color:#f0e2c8;">Null returns null; otherwise invert both subtrees into local variables, then assign <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node.left = right</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node.right = left</code> and return the node.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Iterative solution:</strong> <span style="color:#f0e2c8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> BFS: poll a node, swap its children with a temporary, add the non-null children. No recursion, so no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, one swap per node; O(h) stack recursively or O(w) for the queue; in place, only references move.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap:</strong> <span style="color:#f0e2c8;">Assigning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node.left = invert(node.right)</code> before reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node.left</code> loses the original left subtree, so I always keep the old values in locals.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the traversal order matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, as long as each node is swapped exactly once; preorder, postorder and BFS all work. Inorder needs care because the subtree to visit second has moved.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make an inverted copy instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new TreeNode(node.val, mirroredCopy(node.right), mirroredCopy(node.left))</code>; it allocates n new nodes and leaves the input untouched.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">serialize</code> use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LinkedList</code> while the BFS uses <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ArrayDeque</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">serialize</code> must enqueue null children to print <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> gaps, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> throws on null. The inversion BFS never needs nulls, so it uses the faster <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the iterative version thread-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No; it mutates shared nodes without locking. If other threads read the tree concurrently you would need synchronisation or to build a new mirrored tree and publish it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to a BST?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It becomes a mirror BST; inorder becomes descending, which Example 2 prints.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Invert (mirror) a binary tree** | Swap the left and right subtrees at every node |
| **In-place** | Changing the existing structure rather than building a new one |
| **Structural recursion** | Recursion on the parts of the input (the subtrees), ending at the empty tree |
| **Height (h)** | Nodes on the longest root-to-leaf path; sets the recursion depth |
| **Temporary-variable swap** | \`tmp = a; a = b; b = tmp;\` the standard Java swap, since Java has no tuple assignment |

---
**Conclusion:** Inverting a binary tree is one swap per node, done in any order: recursively by saving both inverted subtrees in locals before assigning, or iteratively with an \`ArrayDeque\` BFS and a temporary-variable swap. It is O(n) time and in place — only references move — and the trap to avoid is overwriting \`node.left\` before it is read.`,
        examples: [
          {
            label: "Recursive invert on six trees, shown in level-order form",
            code: `import java.util.*;

public class Main {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
    }

    // Build a tree from level-order values; null marks a missing child.
    static TreeNode build(Integer... values) {
        if (values.length == 0 || values[0] == null) return null;
        TreeNode root = new TreeNode(values[0]);
        Deque<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            TreeNode node = queue.poll();
            if (i < values.length && values[i] != null) { node.left = new TreeNode(values[i]); queue.add(node.left); }
            i++;
            if (i < values.length && values[i] != null) { node.right = new TreeNode(values[i]); queue.add(node.right); }
            i++;
        }
        return root;
    }


    // Level-order list with "null" for gaps, trailing nulls removed.
    static String serialize(TreeNode root) {
        List<String> out = new ArrayList<>();
        Queue<TreeNode> queue = new LinkedList<>();   // LinkedList accepts null, ArrayDeque does not
        queue.add(root);
        while (!queue.isEmpty()) {
            TreeNode node = queue.poll();
            if (node == null) { out.add("null"); continue; }
            out.add(String.valueOf(node.val));
            queue.add(node.left);
            queue.add(node.right);
        }
        while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
        return "[" + String.join(", ", out) + "]";
    }

    static TreeNode invert(TreeNode node) {
        if (node == null) return null;
        TreeNode left = invert(node.left);     // keep both results before assigning
        TreeNode right = invert(node.right);
        node.left = right;
        node.right = left;
        return node;
    }

    static String show(Integer... values) {
        TreeNode root = build(values);
        String before = serialize(root);
        return before + " -> " + serialize(invert(root));
    }

    public static void main(String[] args) {
        System.out.println(show(4, 2, 7, 1, 3, 6, 9));   // -> [4, 7, 2, 9, 6, 3, 1]
        System.out.println(show(2, 1, 3));               // -> [2, 3, 1]
        System.out.println(show(1, 2));                  // -> [1, null, 2]
        System.out.println(show(1, 2, null, 3));         // -> [1, null, 2, null, 3]
        System.out.println(show(7));                     // -> [7]
        System.out.println(show());                      // -> []
        TreeNode tree = build(4, 2, 7, 1, 3, 6, 9);
        System.out.println("inverting twice gives the original: " + serialize(invert(invert(tree))).equals("[4, 2, 7, 1, 3, 6, 9]"));
    }
}
`,
          },
          {
            label: "Iterative BFS invert, the two-step assignment bug, and a 100000-node chain",
            code: `import java.util.*;

public class Main {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
    }

    // Build a tree from level-order values; null marks a missing child.
    static TreeNode build(Integer... values) {
        if (values.length == 0 || values[0] == null) return null;
        TreeNode root = new TreeNode(values[0]);
        Deque<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            TreeNode node = queue.poll();
            if (i < values.length && values[i] != null) { node.left = new TreeNode(values[i]); queue.add(node.left); }
            i++;
            if (i < values.length && values[i] != null) { node.right = new TreeNode(values[i]); queue.add(node.right); }
            i++;
        }
        return root;
    }

    // Level-order list with "null" for gaps, trailing nulls removed.
    static String serialize(TreeNode root) {
        List<String> out = new ArrayList<>();
        Queue<TreeNode> queue = new LinkedList<>();   // LinkedList accepts null, ArrayDeque does not
        queue.add(root);
        while (!queue.isEmpty()) {
            TreeNode node = queue.poll();
            if (node == null) { out.add("null"); continue; }
            out.add(String.valueOf(node.val));
            queue.add(node.left);
            queue.add(node.right);
        }
        while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
        return "[" + String.join(", ", out) + "]";
    }

    static TreeNode invert(TreeNode node) {
        if (node == null) return null;
        TreeNode left = invert(node.left);
        TreeNode right = invert(node.right);
        node.left = right;
        node.right = left;
        return node;
    }

    static TreeNode invertIterative(TreeNode root) {
        Deque<TreeNode> queue = new ArrayDeque<>();
        if (root != null) queue.add(root);
        while (!queue.isEmpty()) {
            TreeNode node = queue.poll();
            TreeNode tmp = node.left;          // swap this node's children
            node.left = node.right;
            node.right = tmp;
            if (node.left != null) queue.add(node.left);
            if (node.right != null) queue.add(node.right);
        }
        return root;
    }

    static TreeNode invertBuggy(TreeNode node) {
        if (node == null) return null;
        node.left = invertBuggy(node.right);   // overwrites node.left ...
        node.right = invertBuggy(node.left);   // ... so this reads the NEW left
        return node;
    }

    static List<Integer> inorder(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        Deque<TreeNode> stack = new ArrayDeque<>();
        TreeNode node = root;
        while (!stack.isEmpty() || node != null) {
            while (node != null) { stack.push(node); node = node.left; }
            node = stack.pop();
            out.add(node.val);
            node = node.right;
        }
        return out;
    }

    public static void main(String[] args) {
        Integer[] values = {4, 2, 7, 1, 3, 6, 9};
        String a = serialize(invert(build(values)));
        String b = serialize(invertIterative(build(values)));
        System.out.println("recursive: " + a);
        System.out.println("iterative: " + b);
        System.out.println("same result: " + a.equals(b));
        System.out.println("buggy two-step assignment: " + serialize(invertBuggy(build(values))));

        TreeNode bst = build(4, 2, 7, 1, 3, 6, 9);
        System.out.println("BST inorder:      " + inorder(bst));
        System.out.println("inverted inorder: " + inorder(invertIterative(bst)));

        TreeNode chain = null;
        for (int v = 0; v < 100000; v++) chain = new TreeNode(v, chain, null);  // only left children
        invertIterative(chain);
        int rightSteps = 0;
        for (TreeNode node = chain; node != null; node = node.right) rightSteps++;
        System.out.println("100000-node left chain inverted; nodes reachable going right: " + rightSteps);
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Write a C++ function TreeNode* invertTree(TreeNode* root) that mirrors a binary tree in place and returns the root. Then show me a non-recursive version."

**What a strong answer should cover:**
- Swap the children at every node; any visiting order works because each node is swapped once.
- A recursive version and an iterative BFS with \`std::queue\`.
- O(n) time; O(h) space recursively, O(w) for BFS; in place, only pointers move.
- The assignment-order bug: two separate assignments with recursive calls overwrite \`node->left\` before it is read.
- C++ specifics: \`std::swap(node->left, node->right)\` from \`<utility>\` swaps the two pointers in O(1); \`std::queue::pop()\` returns \`void\`; a buggy version that makes two children share a subtree turns a later \`delete\` into a double free; deep recursion is a segfault.

**Clarifying questions expected:**
- "Should I modify the tree in place?"
- "How deep can it be?"

**Code / implementation expected:** Yes — a recursive C++ function using \`std::swap\`, plus an iterative \`std::queue\` version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a binary tree is.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this C++ version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Hold a printed organisation chart up to a mirror. Every manager is still above the same people, but everyone who was on the left is now on the right and the other way round, at every level of the chart. Inverting a binary tree is exactly that mirror image: at every node, the left and right children trade places.

The question is famous for a reason outside computer science. In June 2015 Max Howell, the creator of the Homebrew package manager, [tweeted](https://x.com/mxcl/status/608682016205344768) that Google had turned him down even though, in his words, 90% of their engineers used his software, because he could not invert a binary tree on a whiteboard. The tweet became a running joke about whiteboard interviews, and the problem became a standard warm-up. The good news: once you see that "invert the tree" means "swap the two children at every node", the code is about five lines, and the interesting part of the interview is everything around it — recursion versus a queue, in-place versus a copy, and one assignment-order bug that catches many people.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Should I change the tree **in place**, or return a new mirrored copy? | In place is the usual version (LeetCode 226) and uses no extra nodes; a copy leaves the original untouched but costs O(n) new nodes. |
| Should I return the root? | The usual signature returns the same root so calls can be chained; with in-place inversion the root node itself does not move. |
| Does "invert" mean mirror left and right? | Yes in the standard problem. "Upside-down" binary tree is a different problem (LeetCode 156) where leaves become roots. |
| How deep can the tree be? | A very deep chain breaks plain recursion in many runtimes; the BFS version avoids it. |
| Can the tree be empty? | The function should return null / \`None\` / \`nullptr\` without failing. |

## 3. The Core Idea

📌 **Interview term: Invert (mirror) a binary tree** — produce the mirror image: for **every** node, its left subtree becomes its right subtree and its right subtree becomes its left subtree.

Here is a small binary search tree before:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="Before: root 4 with left child 2 and right child 7; 2 has children 1 and 3; 7 has children 6 and 9">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="169" y1="157" x2="131" y2="213"/>
  <line class="d-edge" x1="191" y1="157" x2="229" y2="213"/>
  <line class="d-edge" x1="409" y1="157" x2="371" y2="213"/>
  <line class="d-edge" x1="431" y1="157" x2="469" y2="213"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">4</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">7</text>
  <circle class="d-box-muted" cx="120" cy="230" r="20"/>
  <text class="d-text" x="120" y="235" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="240" cy="230" r="20"/>
  <text class="d-text" x="240" y="235" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="360" cy="230" r="20"/>
  <text class="d-text" x="360" y="235" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="480" cy="230" r="20"/>
  <text class="d-text" x="480" y="235" text-anchor="middle">9</text>
</svg>

And after inverting it:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 270" role="img" aria-label="After inverting: root 4 with left child 7 and right child 2; 7 has children 9 and 6; 2 has children 3 and 1">
  <line class="d-edge-accent" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge-accent" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="169" y1="157" x2="131" y2="213"/>
  <line class="d-edge" x1="191" y1="157" x2="229" y2="213"/>
  <line class="d-edge" x1="409" y1="157" x2="371" y2="213"/>
  <line class="d-edge" x1="431" y1="157" x2="469" y2="213"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">4</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">7</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="120" cy="230" r="20"/>
  <text class="d-text" x="120" y="235" text-anchor="middle">9</text>
  <circle class="d-box-muted" cx="240" cy="230" r="20"/>
  <text class="d-text" x="240" y="235" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="360" cy="230" r="20"/>
  <text class="d-text" x="360" y="235" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="480" cy="230" r="20"/>
  <text class="d-text" x="480" y="235" text-anchor="middle">1</text>
</svg>

Read the second picture left to right: \`7\` and \`2\` have swapped under the root, and inside each of them the children have swapped too (\`9, 6\` and \`3, 1\`). The values are now in **descending** order when read with an inorder traversal, which Example 2 prints.

### The one operation: swap at every node

At any single node the work is tiny: swap its two child links. The subtrees move as whole units; you do not touch their insides at that moment.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="One node swap: node N with children L and R becomes node N with children R and L; the subtrees move as whole units">
  <defs>
    <marker id="b15q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <circle class="d-box-accent" cx="150" cy="50" r="20"/>
  <text class="d-text" x="150" y="55" text-anchor="middle">N</text>
  <line class="d-edge" x1="136" y1="64" x2="94" y2="116"/>
  <line class="d-edge" x1="164" y1="64" x2="206" y2="116"/>
  <rect class="d-box" x="50" y="120" width="70" height="40" rx="6"/>
  <text class="d-text" x="85" y="145" text-anchor="middle">L</text>
  <rect class="d-box-muted" x="180" y="120" width="70" height="40" rx="6"/>
  <text class="d-text" x="215" y="145" text-anchor="middle">R</text>
  <path class="d-edge" d="M 280 100 L 350 100" marker-end="url(#b15q3-arrow)"/>
  <text class="d-sub" x="315" y="80" text-anchor="middle">swap</text>
  <circle class="d-box-accent" cx="490" cy="50" r="20"/>
  <text class="d-text" x="490" y="55" text-anchor="middle">N</text>
  <line class="d-edge-accent" x1="476" y1="64" x2="434" y2="116"/>
  <line class="d-edge-accent" x1="504" y1="64" x2="546" y2="116"/>
  <rect class="d-box-muted" x="390" y="120" width="70" height="40" rx="6"/>
  <text class="d-text" x="425" y="145" text-anchor="middle">R</text>
  <rect class="d-box" x="520" y="120" width="70" height="40" rx="6"/>
  <text class="d-text" x="555" y="145" text-anchor="middle">L</text>
</svg>

Swapping only at the root is not enough, because the subtrees would still be in their old orientation inside. So you do the swap **at every node**, and the order you visit nodes in does not matter:

- **Recursive:** invert the left subtree, invert the right subtree, swap them (postorder) — or swap first and then invert both children (preorder). Both are correct because each node is swapped exactly once.
- **Iterative BFS:** take nodes from a queue, swap each one's children, and add the children to the queue.
- **Iterative DFS:** the same with a stack.

📌 **Interview term: In-place** — modifying the existing structure instead of building a new one. Inverting in place allocates no nodes; only the recursion stack or the queue costs memory.

📌 **Interview term: Structural recursion** — a recursive function whose recursive calls are on the parts of the input (here, the two subtrees), so it naturally terminates when it reaches the empty tree. See [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).

### The assignment-order bug

The most common wrong answer is writing the swap as two separate assignments with recursive calls inside:

1. \`node.left = invert(node.right)\` — this **overwrites** \`node.left\`, so the original left subtree is no longer reachable from \`node\`.
2. \`node.right = invert(node.left)\` — this now reads the **new** left, which is the old right subtree, already inverted, and inverts it back.

The result loses the whole original left subtree and makes both children point at the same node. Example 2 runs exactly this bug on \`[4, 2, 7, 1, 3, 6, 9]\`: it prints \`[4, 7, 7, 9, 9, 9, 9]\` — the \`2, 1, 3\` side has vanished. The fix is to save both results (or the old left) before assigning, or to swap the pointers first and then recurse.

## 4. Approaches Compared

There is no meaningful brute force here: every node has to be visited, so O(n) is the floor, and every approach below achieves it. The choice is about memory and style.

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| Recursive (swap after or before recursing) | O(n) | O(h) call stack | Shortest code; overflows on very deep chains |
| Iterative BFS with a queue | O(n) | O(w), w = widest level | No recursion; up to about n/2 nodes queued on a perfect tree |
| Iterative DFS with a stack | O(n) | O(h) | No recursion; same memory profile as the recursive version |
| Build a mirrored copy | O(n) | O(n) new nodes | Use only when the original must stay unchanged |

📌 **Interview term: Height (h)** — the number of nodes on the longest root-to-leaf path; see [maximum depth of a binary tree](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree).

## 5. The C++ Code, Line by Line

Recursive, swapping first and then recursing (preorder):

~~~cpp
TreeNode* invert(TreeNode* node) {
    if (!node) return nullptr;
    std::swap(node->left, node->right);    // swap the two child pointers...
    invert(node->left);                    // ...then invert each subtree
    invert(node->right);
    return node;
}
~~~

Iterative BFS:

~~~cpp
TreeNode* invertIterative(TreeNode* root) {
    std::queue<TreeNode*> q;
    if (root) q.push(root);
    while (!q.empty()) {
        TreeNode* node = q.front();
        q.pop();
        std::swap(node->left, node->right);    // swap this node's children
        if (node->left) q.push(node->left);
        if (node->right) q.push(node->right);
    }
    return root;
}
~~~

What each C++ piece is doing:

- **\`std::swap(node->left, node->right)\`** exchanges the two pointer values in place; it is declared in \`<utility>\`. Because the swap happens **before** recursing, no recursive result is ever assigned, so the assignment-order bug cannot happen. Example 2 runs the two-statement version for comparison:

~~~cpp
TreeNode* invertBuggy(TreeNode* node) {
    if (!node) return nullptr;
    node->left = invertBuggy(node->right);     // overwrites node->left ...
    node->right = invertBuggy(node->left);     // ... so this reads the NEW left
    return node;
}
~~~

  which turns \`[4, 2, 7, 1, 3, 6, 9]\` into \`[4, 7, 7, 9, 9, 9, 9]\`. In C++ this is worse than a wrong answer: the original left subtree is now unreachable (a memory leak), and both children point at the same node, so freeing the tree would \`delete\` those nodes twice, which is undefined behaviour. That is why Example 2 deliberately does not pass the buggy tree to \`destroy\`.
- **Only pointers move.** Swapping two \`TreeNode*\` values is O(1); the subtrees themselves stay where they are in memory.
- **\`q.front()\` then \`q.pop()\`** — \`pop()\` returns \`void\`, so read the element first.
- **\`serialize\`** pushes \`nullptr\` children into a \`std::queue<TreeNode*>\` (allowed for pointers) to print \`null\` gaps.
- **Returning \`node\`** allows \`root = invertTree(root);\`.

📌 **Interview term: Double free** — calling \`delete\` twice on the same object. It is undefined behaviour and often crashes; it is the C++ consequence of two pointers sharing one subtree.

📌 **Interview term: Stack overflow (segmentation fault)** — one nested call per level; the [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) page shows a recursive tree function crashing on a 10000000-node chain. Example 2 inverts a 100000-node chain with the \`std::queue\` version.

**A non-destructive copy**, if the input must stay unchanged:

~~~cpp
TreeNode* mirroredCopy(const TreeNode* node) {
    if (!node) return nullptr;
    return new TreeNode(node->val, mirroredCopy(node->right), mirroredCopy(node->left));
}
~~~

Taking \`const TreeNode*\` documents that the input is not modified.

### Dry run of the iterative BFS on \`[4, 2, 7, 1, 3, 6, 9]\`

| Dequeued | Children before | Children after the swap | Queue after adding children |
| :--- | :--- | :--- | :--- |
| 4 | 2, 7 | 7, 2 | 7, 2 |
| 7 | 6, 9 | 9, 6 | 2, 9, 6 |
| 2 | 1, 3 | 3, 1 | 9, 6, 3, 1 |
| 9 | none | none | 6, 3, 1 |
| 6 | none | none | 3, 1 |
| 3 | none | none | 1 |
| 1 | none | none | empty |

Seven nodes, seven swaps (four of them swap two \`null\`s, which is harmless). The level-order reading of the result is \`[4, 7, 2, 9, 6, 3, 1]\`.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3 with -std=c++17). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive invert on six trees, shown in level-order form** printed:

~~~text
[4, 2, 7, 1, 3, 6, 9] -> [4, 7, 2, 9, 6, 3, 1]
[2, 1, 3] -> [2, 3, 1]
[1, 2] -> [1, null, 2]
[1, 2, null, 3] -> [1, null, 2, null, 3]
[7] -> [7]
[] -> []
inverting twice gives the original: true
~~~

**Example 2 — Iterative BFS invert, the two-step assignment bug, and a 100000-node chain** printed:

~~~text
recursive: [4, 7, 2, 9, 6, 3, 1]
iterative: [4, 7, 2, 9, 6, 3, 1]
same result: true
buggy two-step assignment: [4, 7, 7, 9, 9, 9, 9]
BST inorder:      [1, 2, 3, 4, 6, 7, 9]
inverted inorder: [9, 7, 6, 4, 3, 2, 1]
100000-node left chain inverted; nodes reachable going right: 100000
~~~

In Example 1, \`[1, 2] -> [1, null, 2]\` shows the only child moving from the left to the right. In Example 2 the recursive and iterative versions agree, the two-step assignment bug loses the whole \`2, 1, 3\` subtree, the inverted BST reads in descending order, and the 100000-node left chain becomes a right chain.

## 7. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive | O(n) | O(h) | One call and one swap per node; the call stack holds the current path |
| Iterative BFS | O(n) | O(w) | Each node is queued once; the queue holds at most one level |
| Iterative DFS | O(n) | O(h) | Each node is pushed once |
| Mirrored copy | O(n) | O(n) | One new node per old node, plus the stack |

h is about log2 n for a balanced tree and n for a chain. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty tree** — return null immediately; Example 1 prints \`[] -> []\`.
- **Single node** — nothing to swap below it; \`[7] -> [7]\`.
- **One child only** — \`[1, 2]\` becomes \`[1, null, 2]\`: the left child moves to the right. The level-order output has to show the \`null\` gap to prove it.
- **A chain** — \`[1, 2, null, 3]\` (left, left) becomes a right, right chain \`[1, null, 2, null, 3]\`. A 100000-node chain is the case where only the iterative version is safe (Example 2).
- **Inverting twice** returns the original tree, a handy self-test that Example 1 prints.
- **A BST** stops being a valid BST after inversion (its inorder becomes descending); that is expected, not a bug.

## Common Pitfalls

- **Two separate assignments with recursive calls.** Loses the left subtree, leaks it, and shares the other one; a later \`delete\` pass then frees nodes twice. Use \`std::swap\` first, then recurse.
- **Swapping only at the root.** Every node needs a swap.
- **\`TreeNode* node = q.pop();\`** does not compile; \`pop()\` returns \`void\`.
- **Forgetting \`#include <utility>\`.** \`std::swap\` often compiles anyway through other headers, but the standard header for it is \`<utility>\`; include it explicitly.
- **Recursion on a degenerate tree.** The stack overflow is a crash with no exception to catch.
- **Leaking the tree.** Free it after use, iteratively for deep trees (the examples' \`destroy\`).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Inverting mirrors the tree: at every node the left and right child pointers swap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursive solution:</strong> <span style="color:#f0e2c8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code> for null; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::swap(node-&gt;left, node-&gt;right)</code>, recurse on both children, and return the node.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Iterative solution:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue&lt;TreeNode*&gt;</code> BFS: read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">front()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>, swap the children, push the non-null ones. No recursion, so no stack overflow.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, one O(1) pointer swap per node; O(h) stack recursively or O(w) for the queue; in place.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap:</strong> <span style="color:#f0e2c8;">Two separate assignments with the recursive calls inside overwrite the left pointer first; in C++ that also leaks a subtree and sets up a double free, so I swap first.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the traversal order matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No; each node needs exactly one swap, so preorder, postorder and BFS all work. Inorder is awkward because the subtree you planned to visit next has moved.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return an inverted copy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new TreeNode(node-&gt;val, mirroredCopy(node-&gt;right), mirroredCopy(node-&gt;left))</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const TreeNode*</code> parameter; O(n) new nodes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::unique_ptr</code> children change the code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes slightly: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::swap(node-&gt;left, node-&gt;right)</code> still works because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unique_ptr</code> is swappable, and ownership stays correct automatically. You would pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node-&gt;left.get()</code> when recursing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the buggy version only a wrong-answer problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It leaks the lost subtree and makes two pointers share one subtree, so a normal teardown deletes those nodes twice, which is undefined behaviour.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to a BST?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It becomes a mirror BST; inorder becomes descending, as Example 2 prints.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Invert (mirror) a binary tree** | Swap the left and right subtrees at every node |
| **In-place** | Changing the existing structure rather than building a new one |
| **Structural recursion** | Recursion on the parts of the input (the subtrees), ending at the empty tree |
| **Height (h)** | Nodes on the longest root-to-leaf path; sets the recursion depth |
| **\`std::swap\`** | Standard library function in \`<utility>\` that exchanges two values, here two pointers |

---
**Conclusion:** Inverting a binary tree is one swap per node, done in any order: recursively with \`std::swap(node->left, node->right)\` before recursing, or iteratively with a \`std::queue\` BFS. It is O(n) time and in place — only pointers move — and the assignment-order bug is especially costly in C++ because it leaks a subtree and sets up a double free.`,
        examples: [
          {
            label: "Recursive invert on six trees, shown in level-order form",
            code: `#include <iostream>
#include <optional>
#include <queue>
#include <string>
#include <utility>
#include <vector>

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    explicit TreeNode(int v, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

const std::nullopt_t NIL = std::nullopt;   // marks a missing child in the input

// Build a tree from level-order values.
TreeNode* build(const std::vector<std::optional<int>>& values) {
    if (values.empty() || !values[0]) return nullptr;
    TreeNode* root = new TreeNode(*values[0]);
    std::queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        TreeNode* node = q.front();
        q.pop();
        if (i < values.size() && values[i]) { node->left = new TreeNode(*values[i]); q.push(node->left); }
        i++;
        if (i < values.size() && values[i]) { node->right = new TreeNode(*values[i]); q.push(node->right); }
        i++;
    }
    return root;
}

// Free every node without recursion, so deep trees are safe too.
void destroy(TreeNode* root) {
    std::vector<TreeNode*> st;
    if (root) st.push_back(root);
    while (!st.empty()) {
        TreeNode* node = st.back();
        st.pop_back();
        if (node->left) st.push_back(node->left);
        if (node->right) st.push_back(node->right);
        delete node;
    }
}

// Level-order list with "null" for gaps, trailing nulls removed.
std::string serialize(TreeNode* root) {
    std::vector<std::string> out;
    std::queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* node = q.front();
        q.pop();
        if (!node) { out.push_back("null"); continue; }
        out.push_back(std::to_string(node->val));
        q.push(node->left);
        q.push(node->right);
    }
    while (!out.empty() && out.back() == "null") out.pop_back();
    std::string s = "[";
    for (size_t i = 0; i < out.size(); i++) s += (i ? ", " : "") + out[i];
    return s + "]";
}

TreeNode* invert(TreeNode* node) {
    if (!node) return nullptr;
    std::swap(node->left, node->right);    // swap the two child pointers...
    invert(node->left);                    // ...then invert each subtree
    invert(node->right);
    return node;
}

std::string show(const std::vector<std::optional<int>>& values) {
    TreeNode* root = build(values);
    std::string before = serialize(root);
    std::string s = before + " -> " + serialize(invert(root));
    destroy(root);
    return s;
}

int main() {
    std::cout << std::boolalpha;
    std::cout << show({4, 2, 7, 1, 3, 6, 9}) << "\\n";   // -> [4, 7, 2, 9, 6, 3, 1]
    std::cout << show({2, 1, 3}) << "\\n";               // -> [2, 3, 1]
    std::cout << show({1, 2}) << "\\n";                  // -> [1, null, 2]
    std::cout << show({1, 2, NIL, 3}) << "\\n";          // -> [1, null, 2, null, 3]
    std::cout << show({7}) << "\\n";                     // -> [7]
    std::cout << show({}) << "\\n";                      // -> []
    TreeNode* tree = build({4, 2, 7, 1, 3, 6, 9});
    std::cout << "inverting twice gives the original: " << (serialize(invert(invert(tree))) == "[4, 2, 7, 1, 3, 6, 9]") << "\\n";
    destroy(tree);
}
`,
          },
          {
            label: "Iterative BFS invert, the two-step assignment bug, and a 100000-node chain",
            code: `#include <iostream>
#include <optional>
#include <queue>
#include <string>
#include <utility>
#include <vector>

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    explicit TreeNode(int v, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

const std::nullopt_t NIL = std::nullopt;   // marks a missing child in the input

// Build a tree from level-order values.
TreeNode* build(const std::vector<std::optional<int>>& values) {
    if (values.empty() || !values[0]) return nullptr;
    TreeNode* root = new TreeNode(*values[0]);
    std::queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        TreeNode* node = q.front();
        q.pop();
        if (i < values.size() && values[i]) { node->left = new TreeNode(*values[i]); q.push(node->left); }
        i++;
        if (i < values.size() && values[i]) { node->right = new TreeNode(*values[i]); q.push(node->right); }
        i++;
    }
    return root;
}

// Free every node without recursion, so deep trees are safe too.
void destroy(TreeNode* root) {
    std::vector<TreeNode*> st;
    if (root) st.push_back(root);
    while (!st.empty()) {
        TreeNode* node = st.back();
        st.pop_back();
        if (node->left) st.push_back(node->left);
        if (node->right) st.push_back(node->right);
        delete node;
    }
}

// Level-order list with "null" for gaps, trailing nulls removed.
std::string serialize(TreeNode* root) {
    std::vector<std::string> out;
    std::queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* node = q.front();
        q.pop();
        if (!node) { out.push_back("null"); continue; }
        out.push_back(std::to_string(node->val));
        q.push(node->left);
        q.push(node->right);
    }
    while (!out.empty() && out.back() == "null") out.pop_back();
    std::string s = "[";
    for (size_t i = 0; i < out.size(); i++) s += (i ? ", " : "") + out[i];
    return s + "]";
}

TreeNode* invert(TreeNode* node) {
    if (!node) return nullptr;
    std::swap(node->left, node->right);
    invert(node->left);
    invert(node->right);
    return node;
}

TreeNode* invertIterative(TreeNode* root) {
    std::queue<TreeNode*> q;
    if (root) q.push(root);
    while (!q.empty()) {
        TreeNode* node = q.front();
        q.pop();
        std::swap(node->left, node->right);    // swap this node's children
        if (node->left) q.push(node->left);
        if (node->right) q.push(node->right);
    }
    return root;
}

TreeNode* invertBuggy(TreeNode* node) {
    if (!node) return nullptr;
    node->left = invertBuggy(node->right);     // overwrites node->left ...
    node->right = invertBuggy(node->left);     // ... so this reads the NEW left
    return node;
}

std::string inorder(TreeNode* root) {
    std::vector<int> out;
    std::vector<TreeNode*> st;
    TreeNode* node = root;
    while (!st.empty() || node) {
        while (node) { st.push_back(node); node = node->left; }
        node = st.back();
        st.pop_back();
        out.push_back(node->val);
        node = node->right;
    }
    std::string s = "[";
    for (size_t i = 0; i < out.size(); i++) s += (i ? ", " : "") + std::to_string(out[i]);
    return s + "]";
}

int main() {
    std::cout << std::boolalpha;
    std::vector<std::optional<int>> values = {4, 2, 7, 1, 3, 6, 9};
    TreeNode* t1 = build(values);
    TreeNode* t2 = build(values);
    std::string a = serialize(invert(t1));
    std::string b = serialize(invertIterative(t2));
    std::cout << "recursive: " << a << "\\n";
    std::cout << "iterative: " << b << "\\n";
    std::cout << "same result: " << (a == b) << "\\n";
    // The buggy version loses nodes and shares subtrees, so this tree is
    // deliberately not passed to destroy (it would free shared nodes twice).
    std::cout << "buggy two-step assignment: " << serialize(invertBuggy(build(values))) << "\\n";

    TreeNode* bst = build({4, 2, 7, 1, 3, 6, 9});
    std::cout << "BST inorder:      " << inorder(bst) << "\\n";
    std::cout << "inverted inorder: " << inorder(invertIterative(bst)) << "\\n";

    TreeNode* chain = nullptr;
    for (int v = 0; v < 100000; v++) chain = new TreeNode(v, chain);  // only left children
    invertIterative(chain);
    int rightSteps = 0;
    for (TreeNode* node = chain; node; node = node->right) rightSteps++;
    std::cout << "100000-node left chain inverted; nodes reachable going right: " << rightSteps << "\\n";
    destroy(t1);
    destroy(t2);
    destroy(bst);
    destroy(chain);
}
`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you check if a binary tree is symmetric?",
    difficulty: "easy",
    seoDescription: "Check if a binary tree is symmetric in Python, JavaScript, Java and C++: the mirror recursion, a queue of pairs, a wrong shortcut and verified output.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given the root of a binary tree, write a Python function that returns True if the tree is a mirror of itself — symmetric around its centre — and False otherwise. Can you do it both recursively and iteratively?"

**What a strong answer should cover:**
- Reduce the problem to a two-argument mirror check: \`is_mirror(root.left, root.right)\`.
- The four cases: both None, exactly one None, different values, then outer pair and inner pair.
- An iterative version with a \`deque\` of node pairs (pairs containing \`None\` are fine).
- O(n) time, O(h) recursion or O(w) queue space; why an inorder palindrome check is wrong.
- Python specifics: compare values with \`==\`, not \`is\` (\`is\` tests object identity and fails for larger ints built at runtime); \`and\` short-circuits; the recursion limit of 1000 limits the recursive version on deep trees.

**Clarifying questions expected:**
- "Must the shape mirror as well as the values?"
- "Should an empty tree count as symmetric?"

**Code / implementation expected:** Yes — a recursive Python helper on two nodes, and ideally an iterative queue-of-pairs version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a binary tree is.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Python version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Fold a sheet of paper in half, put a blob of paint on one side, and press the halves together. When you open it, the picture is perfectly symmetric: every blob on the left has a twin at the same height on the right, the same distance from the fold.

A symmetric binary tree is that ink-blot picture. Draw a vertical line through the root; the left half must be the exact mirror image of the right half — same values, same shape, flipped. The trap is in the word "mirror". It is not enough for the two halves to look the same; the **outer** edge of the left side must match the **outer** edge of the right side, and the **inner** parts must match each other. Getting those pairings right is the whole question, and it is a common warm-up because it tests whether you can write a recursion that walks **two** trees at once.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does symmetric mean both values **and** shape must mirror? | In the standard problem (LeetCode 101), yes: a missing child on one side must be missing on the other side too. |
| Is an empty tree symmetric? | Usually yes; the code returns \`true\` for it, but confirm. |
| Do you want both a recursive and an iterative solution? | The problem statement often asks for both; the iterative one uses a queue or stack of pairs. |
| How deep can the tree be? | A deep tree can overflow the recursion; the iterative version avoids that. |
| What type are the values? | Matters for how you compare them (for example boxed integers in Java, or floating-point values). |

## 3. The Core Idea

📌 **Interview term: Symmetric (mirror-symmetric) tree** — a tree whose left subtree is the **mirror image** of its right subtree.

📌 **Interview term: Mirror image** — two trees \`A\` and \`B\` are mirrors when their roots have equal values, \`A.left\` mirrors \`B.right\`, and \`A.right\` mirrors \`B.left\`. Two empty trees are mirrors; an empty tree and a non-empty one are not.

So the question "is this tree symmetric?" becomes "is \`root.left\` a mirror of \`root.right\`?", and the mirror test is a recursive function of **two** nodes:

1. Both missing — mirror (return true).
2. Exactly one missing — not a mirror (return false).
3. Different values — not a mirror.
4. Otherwise check the **outer pair** (\`a.left\` with \`b.right\`) **and** the **inner pair** (\`a.right\` with \`b.left\`).

<svg class="iq-diagram" width="100%" viewBox="0 0 600 320" role="img" aria-label="Symmetric tree 1, 2, 2, 3, 4, 4, 3 with a dashed mirror line through the root; the outer pair is 3 and 3, the inner pair is 4 and 4">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="169" y1="157" x2="131" y2="213"/>
  <line class="d-edge" x1="191" y1="157" x2="229" y2="213"/>
  <line class="d-edge" x1="409" y1="157" x2="371" y2="213"/>
  <line class="d-edge" x1="431" y1="157" x2="469" y2="213"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">1</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="120" cy="230" r="20"/>
  <text class="d-text" x="120" y="235" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="240" cy="230" r="20"/>
  <text class="d-text" x="240" y="235" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="360" cy="230" r="20"/>
  <text class="d-text" x="360" y="235" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="480" cy="230" r="20"/>
  <text class="d-text" x="480" y="235" text-anchor="middle">3</text>
  <text class="d-sub" x="300" y="300" text-anchor="middle">mirror line</text>
  <text class="d-sub" x="120" y="280" text-anchor="middle">outer</text>
  <text class="d-sub" x="480" y="280" text-anchor="middle">outer</text>
  <text class="d-sub" x="240" y="280" text-anchor="middle">inner</text>
  <text class="d-sub" x="360" y="280" text-anchor="middle">inner</text>
  <line class="d-edge-dashed" x1="300" y1="80" x2="300" y2="270"/>
</svg>

The outer pair is the two \`3\`s on the far edges; the inner pair is the two \`4\`s next to the mirror line. Each pair is checked by the same rules one level down.

Here is a tree that fails:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 320" role="img" aria-label="Not symmetric: tree 1, 2, 2, null, 3, null, 3. Both nodes 2 have their child 3 on the right, so the shapes are not mirror images">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge-accent" x1="191" y1="157" x2="229" y2="213"/>
  <line class="d-edge-accent" x1="431" y1="157" x2="469" y2="213"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">1</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="240" cy="230" r="20"/>
  <text class="d-text" x="240" y="235" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="480" cy="230" r="20"/>
  <text class="d-text" x="480" y="235" text-anchor="middle">3</text>
  <text class="d-sub" x="120" y="235" text-anchor="middle">missing</text>
  <text class="d-sub" x="360" y="235" text-anchor="middle">missing</text>
  <text class="d-sub" x="300" y="300" text-anchor="middle">mirror line</text>
  <line class="d-edge-dashed" x1="300" y1="80" x2="300" y2="270"/>
</svg>

The values on each level are identical (\`2, 2\` then \`3, 3\`), but both \`3\`s hang to the right of their parent. In a mirror, the left \`2\` would need its \`3\` on the **left**. The inner-pair check (\`a.right\` with \`b.left\`) finds a \`3\` against a missing node and returns false.

📌 **Interview term: Short-circuit evaluation** — \`x and y\` (or \`x && y\`) does not evaluate \`y\` when \`x\` is already false. The mirror check uses it to stop as soon as one pair fails, so an asymmetric tree is often rejected after a few comparisons.

### Why "inorder is a palindrome" is wrong

A tempting shortcut is: read the tree in [inorder](/interview-question/what-are-the-tree-traversal-methods) and check that the list reads the same backwards. It works for the first picture, but values alone lose the **shape**. The tree \`[1, 2, 2, 2, null, 2]\` has inorder \`2, 2, 1, 2, 2\` (a palindrome) yet both lower \`2\`s are left children, so it is not symmetric. Example 2 prints the wrong \`true\` from the shortcut next to the right \`false\`. If you want a traversal-based check you must include markers for missing children, at which point the direct pair comparison is simpler.

### The iterative version: a queue of pairs

Instead of recursing, put pairs that must mirror each other in a queue. Start with \`(root.left, root.right)\`. Take a pair; if both are missing, skip it; if one is missing or the values differ, return false; otherwise add \`(a.left, b.right)\` and \`(a.right, b.left)\`. If the queue empties, the tree is symmetric. A stack works just as well — the order in which pairs are checked does not matter, only that every pair is checked.

A closely related approach: [invert](/interview-question/how-do-you-invert-a-binary-tree) a copy of the left subtree and check that it is identical to the right subtree. It is correct, but it allocates a copy (or mutates the tree), so the direct pair comparison is preferred.

## 4. The Python Code, Line by Line

Recursive:

~~~python
def is_mirror(a, b):
    if a is None and b is None:          # both missing: still a mirror
        return True
    if a is None or b is None:           # only one missing: shapes differ
        return False
    return (a.val == b.val
            and is_mirror(a.left, b.right)   # outer pair
            and is_mirror(a.right, b.left))  # inner pair


def is_symmetric(root):
    return root is None or is_mirror(root.left, root.right)
~~~

Iterative, with a queue of pairs:

~~~python
from collections import deque


def is_symmetric_iterative(root):
    if root is None:
        return True
    queue = deque([(root.left, root.right)])   # pairs that must mirror each other
    while queue:
        a, b = queue.popleft()
        if a is None and b is None:
            continue
        if a is None or b is None or a.val != b.val:
            return False
        queue.append((a.left, b.right))           # outer pair
        queue.append((a.right, b.left))           # inner pair
    return True
~~~

What each Python piece is doing:

- **The order of the two \`None\` checks matters.** The "both missing" test must come first; otherwise \`a is None or b is None\` would reject two empty subtrees.
- **\`a is None\`** is the right way to test for a missing node: there is only one \`None\` object, so identity is exactly what you want.
- **\`a.val == b.val\`, never \`a.val is b.val\`.** \`is\` checks whether two names refer to the *same object*. CPython happens to reuse small integer objects, so \`is\` can look like it works in tests and then fail on larger values:

~~~python
a, b = int("1000"), int("1000")
c, d = int("100"), int("100")
print("1000 == 1000:", a == b)
print("1000 is 1000:", a is b)
print("100 is 100:", c is d)
~~~

~~~text
1000 == 1000: True
1000 is 1000: False
100 is 100: True
~~~

- **\`and\` short-circuits.** The parenthesised \`return (... and ... and ...)\` stops at the first false part, so the inner pair is not even visited if the outer pair fails.
- **Tuples in the deque.** \`(root.left, root.right)\` is one queue element even when a slot is \`None\`; \`a, b = queue.popleft()\` unpacks it.
- **\`root is None or ...\`** handles the empty tree in one line.

📌 **Interview term: Recursion limit** — Python's default cap of 1000 nested calls (\`sys.getrecursionlimit()\`). The mirror recursion goes one level deeper per tree level. When we ran the recursive \`is_mirror\` on the 100001-node V tree from Example 2 (height 50001) it stopped with \`RecursionError: maximum recursion depth exceeded\`; the iterative version in Example 2 checks the same tree without trouble.

### Dry run on \`[1, 2, 2, 3, 4, 4, 3]\`

| Call | a, b | Values equal? | Next checks |
| :--- | :--- | :--- | :--- |
| \`mirror(2, 2)\` | left 2, right 2 | yes | outer \`(3, 3)\`, inner \`(4, 4)\` |
| \`mirror(3, 3)\` | both leaves | yes | \`(null, null)\` twice: true |
| \`mirror(4, 4)\` | both leaves | yes | \`(null, null)\` twice: true |
| result | | | **true** |

And on \`[1, 2, 2, null, 3, null, 3]\`: \`mirror(2, 2)\` has equal values, the outer pair \`(null, null)\` is fine, but the inner pair is \`(3, null)\` — exactly one missing — so it returns **false**.

## 5. Verified: Running the Code

Each example below was saved to a file and run with \`python3 main.py\` (Python 3.13). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive mirror check on six trees** printed:

~~~text
isSymmetric([1, 2, 2, 3, 4, 4, 3]) = true
isSymmetric([1, 2, 2, null, 3, null, 3]) = false
isSymmetric([1, 2, 2, 2, null, 2]) = false
isSymmetric([1, 2, 3]) = false
isSymmetric([1]) = true
isSymmetric([]) = true
~~~

**Example 2 — Iterative queue of pairs, the wrong inorder-palindrome idea, and a 100001-node V tree** printed:

~~~text
[1, 2, 2, 3, 4, 4, 3]: recursive true, iterative true, inorder palindrome true
[1, 2, 2, null, 3, null, 3]: recursive false, iterative false, inorder palindrome false
[1, 2, 2, 2, null, 2]: recursive false, iterative false, inorder palindrome true
V tree of 100001 nodes, iterative: true
same tree with one leaf changed, iterative: false
~~~

In Example 2 the third tree is the important line: the inorder-palindrome shortcut says \`true\` while both correct checks say \`false\`. The V tree is symmetric all the way down, and changing one bottom leaf flips the answer to \`false\`.

## 6. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive mirror check | O(n) | O(h) | Each node is compared at most once (it is in exactly one pair); the call stack follows one path |
| Iterative queue of pairs | O(n) | O(w) | Each pair is enqueued once; the queue holds about one level of pairs |
| Invert a copy and compare | O(n) | O(n) | The copy costs a node per node |
| Inorder palindrome | O(n) | O(n) | Cheap but **incorrect** without null markers |

The worst case is a symmetric tree, where every node must be checked; an asymmetric tree usually stops early thanks to short-circuiting. h is the height and w the widest level. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 7. Edge Cases

- **Empty tree** — symmetric (\`isSymmetric([]) = true\`).
- **Single node** — symmetric; both children are missing.
- **Same values, wrong shape** — \`[1, 2, 2, null, 3, null, 3]\` and \`[1, 2, 2, 2, null, 2]\` are both false.
- **Same shape, different values** — \`[1, 2, 3]\` is false at the first pair.
- **Very deep but symmetric** — the 100001-node V tree in Example 2 (a long left chain mirrored by a long right chain) is checked iteratively; a recursive check would recurse 50000 levels deep.
- **A difference at the very bottom** — changing one leaf of the V tree makes the iterative check return false after walking all the way down.

## Common Pitfalls

- **Comparing \`left\` with \`left\`.** \`is_mirror(a.left, b.left)\` checks that the halves are *identical*, not mirrored. The pairs are outer \`(a.left, b.right)\` and inner \`(a.right, b.left)\`.
- **Checking only values level by level.** \`[1, 2, 2, null, 3, null, 3]\` has the same values on each level but is not symmetric; shape matters.
- **The inorder-palindrome shortcut.** Example 2 shows it returning \`true\` for a non-symmetric tree.
- **Using \`is\` for values.** Works for small integers by accident, fails for larger ones, as the snippet above prints.
- **Testing \`a is None or b is None\` before "both None".** Two empty subtrees would then be reported as a mismatch.
- **Recursing on very deep trees.** The 1000-call limit; use the queue-of-pairs version.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reduce it:</strong> <span style="color:#f0e2c8;">A tree is symmetric when its left subtree mirrors its right subtree, so I write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is_mirror(a, b)</code> and call it on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">root.left, root.right</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The mirror rules:</strong> <span style="color:#f0e2c8;">Both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> is true, one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> is false, different values is false; otherwise the outer pair <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a.left, b.right</code> and the inner pair <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a.right, b.left</code> must both mirror.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Iterative version:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque</code> of node pairs: pop a pair, apply the same rules, push the outer and inner pairs. Tuples with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> inside are fine.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time since each node is in one pair; O(h) for recursion or O(w) for the queue; asymmetric trees often stop early because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">and</code> short-circuits.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python details:</strong> <span style="color:#f0e2c8;">I compare values with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code>, and I use the iterative version for deep trees because of the recursion limit of 1000.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just check that the inorder traversal is a palindrome?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because values lose the shape: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 2, 2, None, 2]</code> has a palindromic inorder but is not symmetric, as Example 2 prints. With null markers it could work, but the pair check is simpler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this related to inverting a tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A tree is symmetric exactly when inverting its left subtree produces a tree identical to its right subtree. That works but needs a copy or mutation; comparing in place is cheaper.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use a stack instead of a queue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Order does not matter, only that every pair is checked; swap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popleft</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code> and it is a DFS.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you check that two separate trees are identical?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same recursion with same-side pairs: values equal, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">same(a.left, b.left)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">same(a.right, b.right)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the values are floats?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exact <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> may be what the problem wants; if values come from calculations, compare with a tolerance such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">math.isclose</code>, and say so.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Symmetric (mirror-symmetric) tree** | A tree whose left subtree is the mirror image of its right subtree |
| **Mirror image** | Equal root values, \`A.left\` mirrors \`B.right\`, \`A.right\` mirrors \`B.left\` |
| **Short-circuit evaluation** | \`x and y\` / \`x && y\` skips \`y\` when \`x\` is already false |
| **Recursion limit** | Python cap of 1000 nested calls by default; exceeding it raises \`RecursionError\` |

---
**Conclusion:** A tree is symmetric when \`is_mirror(root.left, root.right)\` holds: both \`None\` is true, one \`None\` or different values is false, and otherwise the outer pair and the inner pair must mirror. It is O(n) time; recursion costs O(h) stack and the \`deque\`-of-pairs version O(w) and avoids Python's recursion limit. Compare values with \`==\`, keep the shape in the comparison, and the inorder-palindrome shortcut will not fool you.`,
        examples: [
          {
            label: "Recursive mirror check on six trees",
            code: `from collections import deque


class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def build(values):
    """Build a tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root


def is_mirror(a, b):
    if a is None and b is None:          # both missing: still a mirror
        return True
    if a is None or b is None:           # only one missing: shapes differ
        return False
    return (a.val == b.val
            and is_mirror(a.left, b.right)   # outer pair
            and is_mirror(a.right, b.left))  # inner pair


def is_symmetric(root):
    return root is None or is_mirror(root.left, root.right)


def show(text, values):
    return "isSymmetric(" + text + ") = " + str(is_symmetric(build(values))).lower()


print(show("[1, 2, 2, 3, 4, 4, 3]", [1, 2, 2, 3, 4, 4, 3]))  # isSymmetric([1, 2, 2, 3, 4, 4, 3]) = true
print(show("[1, 2, 2, null, 3, null, 3]", [1, 2, 2, None, 3, None, 3]))  # isSymmetric([1, 2, 2, null, 3, null, 3]) = false
print(show("[1, 2, 2, 2, null, 2]", [1, 2, 2, 2, None, 2]))  # isSymmetric([1, 2, 2, 2, null, 2]) = false
print(show("[1, 2, 3]", [1, 2, 3]))  # isSymmetric([1, 2, 3]) = false
print(show("[1]", [1]))  # isSymmetric([1]) = true
print(show("[]", []))  # isSymmetric([]) = true
`,
          },
          {
            label: "Iterative queue of pairs, the wrong inorder-palindrome idea, and a 100001-node V tree",
            code: `from collections import deque


class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def build(values):
    """Build a tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root


def is_mirror(a, b):
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    return a.val == b.val and is_mirror(a.left, b.right) and is_mirror(a.right, b.left)


def is_symmetric_iterative(root):
    if root is None:
        return True
    queue = deque([(root.left, root.right)])   # pairs that must mirror each other
    while queue:
        a, b = queue.popleft()
        if a is None and b is None:
            continue
        if a is None or b is None or a.val != b.val:
            return False
        queue.append((a.left, b.right))           # outer pair
        queue.append((a.right, b.left))           # inner pair
    return True


def inorder_palindrome(root):                    # WRONG idea, shown for contrast
    vals, stack, node = [], [], root
    while stack or node:
        while node:
            stack.append(node)
            node = node.left
        node = stack.pop()
        vals.append(node.val)
        node = node.right
    return vals == vals[::-1]


def row(text, values):
    root = build(values)
    rec = root is None or is_mirror(root.left, root.right)
    return (text + ": recursive " + str(rec).lower()
            + ", iterative " + str(is_symmetric_iterative(root)).lower()
            + ", inorder palindrome " + str(inorder_palindrome(root)).lower())


print(row("[1, 2, 2, 3, 4, 4, 3]", [1, 2, 2, 3, 4, 4, 3]))  # [1, 2, 2, 3, 4, 4, 3]: recursive true, iterative true, inorder palindrome true
print(row("[1, 2, 2, null, 3, null, 3]", [1, 2, 2, None, 3, None, 3]))  # [1, 2, 2, null, 3, null, 3]: recursive false, iterative false, inorder palindrome false
print(row("[1, 2, 2, 2, null, 2]", [1, 2, 2, 2, None, 2]))  # [1, 2, 2, 2, null, 2]: recursive false, iterative false, inorder palindrome true

# A V-shaped tree: a left-only chain and a right-only chain of 50000 nodes each.
root = TreeNode(0)
left_end, right_end = root, root
for v in range(1, 50001):
    left_end.left = TreeNode(v)
    right_end.right = TreeNode(v)
    left_end, right_end = left_end.left, right_end.right
print("V tree of 100001 nodes, iterative: " + str(is_symmetric_iterative(root)).lower())
right_end.val = -1                              # break the mirror at the very bottom
print("same tree with one leaf changed, iterative: " + str(is_symmetric_iterative(root)).lower())  # same tree with one leaf changed, iterative: false
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Write a JavaScript function isSymmetric(root) that returns true if a binary tree is a mirror of itself around its centre. Show me a recursive version and then an iterative one."

**What a strong answer should cover:**
- Reduce the problem to \`isMirror(root.left, root.right)\` on two nodes.
- The four cases: both null, exactly one null, different values, then outer and inner pairs.
- An iterative version with an array of \`[a, b]\` pairs and a head index.
- O(n) time, O(h) or O(w) space; why an inorder palindrome check is wrong.
- JavaScript specifics: use \`===\` for values; \`&&\` short-circuits; if children may be \`undefined\` (JSON input) test with \`!a\` instead of \`=== null\`; deep recursion throws \`RangeError\`.

**Clarifying questions expected:**
- "Must the shape mirror as well as the values?"
- "Is an empty tree symmetric?"

**Code / implementation expected:** Yes — a recursive JavaScript helper on two nodes plus an iterative queue-of-pairs version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a binary tree is.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this JavaScript version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Fold a sheet of paper in half, put a blob of paint on one side, and press the halves together. When you open it, the picture is perfectly symmetric: every blob on the left has a twin at the same height on the right, the same distance from the fold.

A symmetric binary tree is that ink-blot picture. Draw a vertical line through the root; the left half must be the exact mirror image of the right half — same values, same shape, flipped. The trap is in the word "mirror". It is not enough for the two halves to look the same; the **outer** edge of the left side must match the **outer** edge of the right side, and the **inner** parts must match each other. Getting those pairings right is the whole question, and it is a common warm-up because it tests whether you can write a recursion that walks **two** trees at once.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does symmetric mean both values **and** shape must mirror? | In the standard problem (LeetCode 101), yes: a missing child on one side must be missing on the other side too. |
| Is an empty tree symmetric? | Usually yes; the code returns \`true\` for it, but confirm. |
| Do you want both a recursive and an iterative solution? | The problem statement often asks for both; the iterative one uses a queue or stack of pairs. |
| How deep can the tree be? | A deep tree can overflow the recursion; the iterative version avoids that. |
| What type are the values? | Matters for how you compare them (for example boxed integers in Java, or floating-point values). |

## 3. The Core Idea

📌 **Interview term: Symmetric (mirror-symmetric) tree** — a tree whose left subtree is the **mirror image** of its right subtree.

📌 **Interview term: Mirror image** — two trees \`A\` and \`B\` are mirrors when their roots have equal values, \`A.left\` mirrors \`B.right\`, and \`A.right\` mirrors \`B.left\`. Two empty trees are mirrors; an empty tree and a non-empty one are not.

So the question "is this tree symmetric?" becomes "is \`root.left\` a mirror of \`root.right\`?", and the mirror test is a recursive function of **two** nodes:

1. Both missing — mirror (return true).
2. Exactly one missing — not a mirror (return false).
3. Different values — not a mirror.
4. Otherwise check the **outer pair** (\`a.left\` with \`b.right\`) **and** the **inner pair** (\`a.right\` with \`b.left\`).

<svg class="iq-diagram" width="100%" viewBox="0 0 600 320" role="img" aria-label="Symmetric tree 1, 2, 2, 3, 4, 4, 3 with a dashed mirror line through the root; the outer pair is 3 and 3, the inner pair is 4 and 4">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="169" y1="157" x2="131" y2="213"/>
  <line class="d-edge" x1="191" y1="157" x2="229" y2="213"/>
  <line class="d-edge" x1="409" y1="157" x2="371" y2="213"/>
  <line class="d-edge" x1="431" y1="157" x2="469" y2="213"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">1</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="120" cy="230" r="20"/>
  <text class="d-text" x="120" y="235" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="240" cy="230" r="20"/>
  <text class="d-text" x="240" y="235" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="360" cy="230" r="20"/>
  <text class="d-text" x="360" y="235" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="480" cy="230" r="20"/>
  <text class="d-text" x="480" y="235" text-anchor="middle">3</text>
  <text class="d-sub" x="300" y="300" text-anchor="middle">mirror line</text>
  <text class="d-sub" x="120" y="280" text-anchor="middle">outer</text>
  <text class="d-sub" x="480" y="280" text-anchor="middle">outer</text>
  <text class="d-sub" x="240" y="280" text-anchor="middle">inner</text>
  <text class="d-sub" x="360" y="280" text-anchor="middle">inner</text>
  <line class="d-edge-dashed" x1="300" y1="80" x2="300" y2="270"/>
</svg>

The outer pair is the two \`3\`s on the far edges; the inner pair is the two \`4\`s next to the mirror line. Each pair is checked by the same rules one level down.

Here is a tree that fails:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 320" role="img" aria-label="Not symmetric: tree 1, 2, 2, null, 3, null, 3. Both nodes 2 have their child 3 on the right, so the shapes are not mirror images">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge-accent" x1="191" y1="157" x2="229" y2="213"/>
  <line class="d-edge-accent" x1="431" y1="157" x2="469" y2="213"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">1</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="240" cy="230" r="20"/>
  <text class="d-text" x="240" y="235" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="480" cy="230" r="20"/>
  <text class="d-text" x="480" y="235" text-anchor="middle">3</text>
  <text class="d-sub" x="120" y="235" text-anchor="middle">missing</text>
  <text class="d-sub" x="360" y="235" text-anchor="middle">missing</text>
  <text class="d-sub" x="300" y="300" text-anchor="middle">mirror line</text>
  <line class="d-edge-dashed" x1="300" y1="80" x2="300" y2="270"/>
</svg>

The values on each level are identical (\`2, 2\` then \`3, 3\`), but both \`3\`s hang to the right of their parent. In a mirror, the left \`2\` would need its \`3\` on the **left**. The inner-pair check (\`a.right\` with \`b.left\`) finds a \`3\` against a missing node and returns false.

📌 **Interview term: Short-circuit evaluation** — \`x and y\` (or \`x && y\`) does not evaluate \`y\` when \`x\` is already false. The mirror check uses it to stop as soon as one pair fails, so an asymmetric tree is often rejected after a few comparisons.

### Why "inorder is a palindrome" is wrong

A tempting shortcut is: read the tree in [inorder](/interview-question/what-are-the-tree-traversal-methods) and check that the list reads the same backwards. It works for the first picture, but values alone lose the **shape**. The tree \`[1, 2, 2, 2, null, 2]\` has inorder \`2, 2, 1, 2, 2\` (a palindrome) yet both lower \`2\`s are left children, so it is not symmetric. Example 2 prints the wrong \`true\` from the shortcut next to the right \`false\`. If you want a traversal-based check you must include markers for missing children, at which point the direct pair comparison is simpler.

### The iterative version: a queue of pairs

Instead of recursing, put pairs that must mirror each other in a queue. Start with \`(root.left, root.right)\`. Take a pair; if both are missing, skip it; if one is missing or the values differ, return false; otherwise add \`(a.left, b.right)\` and \`(a.right, b.left)\`. If the queue empties, the tree is symmetric. A stack works just as well — the order in which pairs are checked does not matter, only that every pair is checked.

A closely related approach: [invert](/interview-question/how-do-you-invert-a-binary-tree) a copy of the left subtree and check that it is identical to the right subtree. It is correct, but it allocates a copy (or mutates the tree), so the direct pair comparison is preferred.

## 4. The JavaScript Code, Line by Line

Recursive:

~~~javascript
function isMirror(a, b) {
  if (a === null && b === null) return true;   // both missing: still a mirror
  if (a === null || b === null) return false;  // only one missing: shapes differ
  return a.val === b.val
    && isMirror(a.left, b.right)               // outer pair
    && isMirror(a.right, b.left);              // inner pair
}

function isSymmetric(root) {
  return root === null || isMirror(root.left, root.right);
}
~~~

Iterative, with an array of pairs and a head index:

~~~javascript
function isSymmetricIterative(root) {
  if (root === null) return true;
  const queue = [[root.left, root.right]];    // pairs that must mirror each other
  for (let head = 0; head < queue.length; head++) {
    const [a, b] = queue[head];
    if (a === null && b === null) continue;
    if (a === null || b === null || a.val !== b.val) return false;
    queue.push([a.left, b.right]);            // outer pair
    queue.push([a.right, b.left]);            // inner pair
  }
  return true;
}
~~~

What each JavaScript piece is doing:

- **The "both null" test comes first**, so two empty subtrees are accepted before the "one null" test can reject them.
- **\`===\` for values.** Strict equality never converts types. With \`==\`, a tree built from mixed input such as \`'2'\` and \`2\` would be called symmetric.
- **\`&&\` short-circuits**, and the \`return\` on several lines is safe because the expression starts on the same line as \`return\`. (Putting \`return\` alone on a line triggers automatic semicolon insertion: a function whose body is \`return\` then \`42;\` on the next line returned \`undefined\` when we ran it.)
- **\`const [a, b] = queue[head]\`** destructures the pair; \`null\` slots are fine.
- **The head index** avoids \`shift()\`, which re-indexes the array on every call.
- **\`null\` versus \`undefined\`.** The examples always set missing children to \`null\`. If nodes come from JSON with omitted keys, \`a.left\` is \`undefined\`, \`undefined === null\` is \`false\`, and the checks fall through to \`a.val\` on \`undefined\`, which throws. Use \`if (!a && !b)\` and \`if (!a || !b)\` in that case.

📌 **Interview term: Stack overflow (\`RangeError\`)** — the recursive mirror check nests one call per level. When we ran the recursive \`isMirror\` on the 100001-node V tree from Example 2 (height 50001) with Node.js 22 it threw \`RangeError: Maximum call stack size exceeded\`; the iterative version in Example 2 checks the same tree fine.

### Dry run on \`[1, 2, 2, 3, 4, 4, 3]\`

| Call | a, b | Values equal? | Next checks |
| :--- | :--- | :--- | :--- |
| \`mirror(2, 2)\` | left 2, right 2 | yes | outer \`(3, 3)\`, inner \`(4, 4)\` |
| \`mirror(3, 3)\` | both leaves | yes | \`(null, null)\` twice: true |
| \`mirror(4, 4)\` | both leaves | yes | \`(null, null)\` twice: true |
| result | | | **true** |

And on \`[1, 2, 2, null, 3, null, 3]\`: \`mirror(2, 2)\` has equal values, the outer pair \`(null, null)\` is fine, but the inner pair is \`(3, null)\` — exactly one missing — so it returns **false**.

## 5. Verified: Running the Code

Each example below was saved to a file and run with \`node main.js\` (Node.js 22). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive mirror check on six trees** printed:

~~~text
isSymmetric([1, 2, 2, 3, 4, 4, 3]) = true
isSymmetric([1, 2, 2, null, 3, null, 3]) = false
isSymmetric([1, 2, 2, 2, null, 2]) = false
isSymmetric([1, 2, 3]) = false
isSymmetric([1]) = true
isSymmetric([]) = true
~~~

**Example 2 — Iterative queue of pairs, the wrong inorder-palindrome idea, and a 100001-node V tree** printed:

~~~text
[1, 2, 2, 3, 4, 4, 3]: recursive true, iterative true, inorder palindrome true
[1, 2, 2, null, 3, null, 3]: recursive false, iterative false, inorder palindrome false
[1, 2, 2, 2, null, 2]: recursive false, iterative false, inorder palindrome true
V tree of 100001 nodes, iterative: true
same tree with one leaf changed, iterative: false
~~~

In Example 2 the third tree is the important line: the inorder-palindrome shortcut says \`true\` while both correct checks say \`false\`. The V tree is symmetric all the way down, and changing one bottom leaf flips the answer to \`false\`.

## 6. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive mirror check | O(n) | O(h) | Each node is compared at most once (it is in exactly one pair); the call stack follows one path |
| Iterative queue of pairs | O(n) | O(w) | Each pair is enqueued once; the queue holds about one level of pairs |
| Invert a copy and compare | O(n) | O(n) | The copy costs a node per node |
| Inorder palindrome | O(n) | O(n) | Cheap but **incorrect** without null markers |

The worst case is a symmetric tree, where every node must be checked; an asymmetric tree usually stops early thanks to short-circuiting. h is the height and w the widest level. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 7. Edge Cases

- **Empty tree** — symmetric (\`isSymmetric([]) = true\`).
- **Single node** — symmetric; both children are missing.
- **Same values, wrong shape** — \`[1, 2, 2, null, 3, null, 3]\` and \`[1, 2, 2, 2, null, 2]\` are both false.
- **Same shape, different values** — \`[1, 2, 3]\` is false at the first pair.
- **Very deep but symmetric** — the 100001-node V tree in Example 2 (a long left chain mirrored by a long right chain) is checked iteratively; a recursive check would recurse 50000 levels deep.
- **A difference at the very bottom** — changing one leaf of the V tree makes the iterative check return false after walking all the way down.

## Common Pitfalls

- **Comparing \`left\` with \`left\`.** That checks the halves are identical, not mirrored; the pairs are \`(a.left, b.right)\` and \`(a.right, b.left)\`.
- **Values only, level by level.** \`[1, 2, 2, null, 3, null, 3]\` passes a values-per-level check but is not symmetric.
- **The inorder-palindrome shortcut.** Example 2 shows it wrongly returning \`true\`.
- **\`==\` instead of \`===\`.** Type coercion can make \`'2'\` equal \`2\`.
- **\`return\` on its own line.** \`return\` followed by a newline returns \`undefined\` because of automatic semicolon insertion; keep the expression on the same line.
- **\`undefined\` children with \`=== null\` checks.** Use \`!a\` if the input may omit children.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reduce it:</strong> <span style="color:#f0e2c8;">A tree is symmetric when the left subtree mirrors the right one, so I write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isMirror(a, b)</code> and call it on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">root.left, root.right</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The mirror rules:</strong> <span style="color:#f0e2c8;">Both null is true, one null is false, different values is false; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isMirror(a.left, b.right) &amp;&amp; isMirror(a.right, b.left)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Iterative version:</strong> <span style="color:#f0e2c8;">An array of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[a, b]</code> pairs with a head index: apply the same rules and push the outer and inner pairs; no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(h) for recursion or O(w) for the queue; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;&amp;</code> short-circuits so most asymmetric trees stop early.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript details:</strong> <span style="color:#f0e2c8;">I compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code>, keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code> on the same line as its expression, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!a</code> if children might be <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>; deep trees use the iterative version to avoid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not check that inorder is a palindrome?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It ignores shape: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 2, 2, null, 2]</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2, 2, 1, 2, 2</code> but is not symmetric, which Example 2 prints.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to inverting a tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The tree is symmetric exactly when the inverted left subtree is identical to the right subtree; comparing directly avoids building or mutating anything.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Stack or queue for the iterative version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either; every pair must be checked and the order does not matter. Replace the head index with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> for a DFS.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you check two trees are identical?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same function with same-side pairs: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">same(a.left, b.left) &amp;&amp; same(a.right, b.right)</code> plus equal values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if values can be <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NaN</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN === NaN</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> (and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.is(NaN, NaN)</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code>, checked in Node.js 22), so two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code> mirror nodes would fail with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code>; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.is(a.val, b.val)</code> if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code> should match.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Symmetric (mirror-symmetric) tree** | A tree whose left subtree is the mirror image of its right subtree |
| **Mirror image** | Equal root values, \`A.left\` mirrors \`B.right\`, \`A.right\` mirrors \`B.left\` |
| **Short-circuit evaluation** | \`x and y\` / \`x && y\` skips \`y\` when \`x\` is already false |
| **Stack overflow (\`RangeError\`)** | JavaScript error when the call stack is exhausted |

---
**Conclusion:** A tree is symmetric when \`isMirror(root.left, root.right)\` holds: both null is true, one null or different values is false, and otherwise the outer pair and the inner pair must mirror. It is O(n) time; recursion costs O(h) stack and the array-of-pairs version O(w) and avoids \`RangeError\`. Use \`===\`, keep the shape in the comparison, and the inorder-palindrome shortcut will not fool you.`,
        examples: [
          {
            label: "Recursive mirror check on six trees",
            code: `class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// Build a tree from a level-order array; null marks a missing child.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new TreeNode(values[0]);
  const queue = [root];
  let head = 0; // index of the next node to give children (avoids shift())
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) { node.left = new TreeNode(values[i]); queue.push(node.left); }
    i++;
    if (i < values.length && values[i] !== null) { node.right = new TreeNode(values[i]); queue.push(node.right); }
    i++;
  }
  return root;
}

function isMirror(a, b) {
  if (a === null && b === null) return true;   // both missing: still a mirror
  if (a === null || b === null) return false;  // only one missing: shapes differ
  return a.val === b.val
    && isMirror(a.left, b.right)               // outer pair
    && isMirror(a.right, b.left);              // inner pair
}

function isSymmetric(root) {
  return root === null || isMirror(root.left, root.right);
}

function show(text, values) {
  return 'isSymmetric(' + text + ') = ' + isSymmetric(build(values));
}

console.log(show('[1, 2, 2, 3, 4, 4, 3]', [1, 2, 2, 3, 4, 4, 3])); // isSymmetric([1, 2, 2, 3, 4, 4, 3]) = true
console.log(show('[1, 2, 2, null, 3, null, 3]', [1, 2, 2, null, 3, null, 3])); // isSymmetric([1, 2, 2, null, 3, null, 3]) = false
console.log(show('[1, 2, 2, 2, null, 2]', [1, 2, 2, 2, null, 2])); // isSymmetric([1, 2, 2, 2, null, 2]) = false
console.log(show('[1, 2, 3]', [1, 2, 3])); // isSymmetric([1, 2, 3]) = false
console.log(show('[1]', [1])); // isSymmetric([1]) = true
console.log(show('[]', [])); // isSymmetric([]) = true
`,
          },
          {
            label: "Iterative queue of pairs, the wrong inorder-palindrome idea, and a 100001-node V tree",
            code: `class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// Build a tree from a level-order array; null marks a missing child.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new TreeNode(values[0]);
  const queue = [root];
  let head = 0; // index of the next node to give children (avoids shift())
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) { node.left = new TreeNode(values[i]); queue.push(node.left); }
    i++;
    if (i < values.length && values[i] !== null) { node.right = new TreeNode(values[i]); queue.push(node.right); }
    i++;
  }
  return root;
}

function isMirror(a, b) {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.val === b.val && isMirror(a.left, b.right) && isMirror(a.right, b.left);
}

function isSymmetricIterative(root) {
  if (root === null) return true;
  const queue = [[root.left, root.right]];    // pairs that must mirror each other
  for (let head = 0; head < queue.length; head++) {
    const [a, b] = queue[head];
    if (a === null && b === null) continue;
    if (a === null || b === null || a.val !== b.val) return false;
    queue.push([a.left, b.right]);            // outer pair
    queue.push([a.right, b.left]);            // inner pair
  }
  return true;
}

function inorderPalindrome(root) {            // WRONG idea, shown for contrast
  const vals = [];
  const stack = [];
  let node = root;
  while (stack.length > 0 || node) {
    while (node) { stack.push(node); node = node.left; }
    node = stack.pop();
    vals.push(node.val);
    node = node.right;
  }
  return vals.every((v, i) => v === vals[vals.length - 1 - i]);
}

function row(text, values) {
  const root = build(values);
  const rec = root === null || isMirror(root.left, root.right);
  return text + ': recursive ' + rec + ', iterative ' + isSymmetricIterative(root) +
    ', inorder palindrome ' + inorderPalindrome(root);
}

console.log(row('[1, 2, 2, 3, 4, 4, 3]', [1, 2, 2, 3, 4, 4, 3])); // [1, 2, 2, 3, 4, 4, 3]: recursive true, iterative true, inorder palindrome true
console.log(row('[1, 2, 2, null, 3, null, 3]', [1, 2, 2, null, 3, null, 3])); // [1, 2, 2, null, 3, null, 3]: recursive false, iterative false, inorder palindrome false
console.log(row('[1, 2, 2, 2, null, 2]', [1, 2, 2, 2, null, 2])); // [1, 2, 2, 2, null, 2]: recursive false, iterative false, inorder palindrome true

// A V-shaped tree: a left-only chain and a right-only chain of 50000 nodes each.
const root = new TreeNode(0);
let leftEnd = root;
let rightEnd = root;
for (let v = 1; v <= 50000; v++) {
  leftEnd.left = new TreeNode(v);
  rightEnd.right = new TreeNode(v);
  leftEnd = leftEnd.left;
  rightEnd = rightEnd.right;
}
console.log('V tree of 100001 nodes, iterative: ' + isSymmetricIterative(root)); // V tree of 100001 nodes, iterative: true
rightEnd.val = -1; // break the mirror at the very bottom
console.log('same tree with one leaf changed, iterative: ' + isSymmetricIterative(root)); // same tree with one leaf changed, iterative: false
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Write a Java method boolean isSymmetric(TreeNode root) that returns true if the tree is a mirror of itself around its centre. Give me the recursive version first, then an iterative one."

**What a strong answer should cover:**
- Reduce the problem to \`isMirror(root.left, root.right)\` on two nodes.
- The four cases: both null, exactly one null, different values, then outer and inner pairs.
- An iterative version with a queue of pairs.
- O(n) time, O(h) or O(w) space; why an inorder palindrome check is wrong.
- Java specifics: \`ArrayDeque\` rejects \`null\`, so either enqueue a \`TreeNode[]\` pair (the array is never null) or use \`LinkedList\`; with an \`int val\` field \`==\` is right, but if values were \`Integer\` you must use \`equals\` because \`==\` compares references outside the cached range -128 to 127.

**Clarifying questions expected:**
- "Must the shape mirror as well as the values?"
- "Is an empty tree symmetric?"

**Code / implementation expected:** Yes — a recursive Java helper on two nodes plus an iterative queue-of-pairs version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a binary tree is.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Java version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Fold a sheet of paper in half, put a blob of paint on one side, and press the halves together. When you open it, the picture is perfectly symmetric: every blob on the left has a twin at the same height on the right, the same distance from the fold.

A symmetric binary tree is that ink-blot picture. Draw a vertical line through the root; the left half must be the exact mirror image of the right half — same values, same shape, flipped. The trap is in the word "mirror". It is not enough for the two halves to look the same; the **outer** edge of the left side must match the **outer** edge of the right side, and the **inner** parts must match each other. Getting those pairings right is the whole question, and it is a common warm-up because it tests whether you can write a recursion that walks **two** trees at once.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does symmetric mean both values **and** shape must mirror? | In the standard problem (LeetCode 101), yes: a missing child on one side must be missing on the other side too. |
| Is an empty tree symmetric? | Usually yes; the code returns \`true\` for it, but confirm. |
| Do you want both a recursive and an iterative solution? | The problem statement often asks for both; the iterative one uses a queue or stack of pairs. |
| How deep can the tree be? | A deep tree can overflow the recursion; the iterative version avoids that. |
| What type are the values? | Matters for how you compare them (for example boxed integers in Java, or floating-point values). |

## 3. The Core Idea

📌 **Interview term: Symmetric (mirror-symmetric) tree** — a tree whose left subtree is the **mirror image** of its right subtree.

📌 **Interview term: Mirror image** — two trees \`A\` and \`B\` are mirrors when their roots have equal values, \`A.left\` mirrors \`B.right\`, and \`A.right\` mirrors \`B.left\`. Two empty trees are mirrors; an empty tree and a non-empty one are not.

So the question "is this tree symmetric?" becomes "is \`root.left\` a mirror of \`root.right\`?", and the mirror test is a recursive function of **two** nodes:

1. Both missing — mirror (return true).
2. Exactly one missing — not a mirror (return false).
3. Different values — not a mirror.
4. Otherwise check the **outer pair** (\`a.left\` with \`b.right\`) **and** the **inner pair** (\`a.right\` with \`b.left\`).

<svg class="iq-diagram" width="100%" viewBox="0 0 600 320" role="img" aria-label="Symmetric tree 1, 2, 2, 3, 4, 4, 3 with a dashed mirror line through the root; the outer pair is 3 and 3, the inner pair is 4 and 4">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="169" y1="157" x2="131" y2="213"/>
  <line class="d-edge" x1="191" y1="157" x2="229" y2="213"/>
  <line class="d-edge" x1="409" y1="157" x2="371" y2="213"/>
  <line class="d-edge" x1="431" y1="157" x2="469" y2="213"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">1</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="120" cy="230" r="20"/>
  <text class="d-text" x="120" y="235" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="240" cy="230" r="20"/>
  <text class="d-text" x="240" y="235" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="360" cy="230" r="20"/>
  <text class="d-text" x="360" y="235" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="480" cy="230" r="20"/>
  <text class="d-text" x="480" y="235" text-anchor="middle">3</text>
  <text class="d-sub" x="300" y="300" text-anchor="middle">mirror line</text>
  <text class="d-sub" x="120" y="280" text-anchor="middle">outer</text>
  <text class="d-sub" x="480" y="280" text-anchor="middle">outer</text>
  <text class="d-sub" x="240" y="280" text-anchor="middle">inner</text>
  <text class="d-sub" x="360" y="280" text-anchor="middle">inner</text>
  <line class="d-edge-dashed" x1="300" y1="80" x2="300" y2="270"/>
</svg>

The outer pair is the two \`3\`s on the far edges; the inner pair is the two \`4\`s next to the mirror line. Each pair is checked by the same rules one level down.

Here is a tree that fails:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 320" role="img" aria-label="Not symmetric: tree 1, 2, 2, null, 3, null, 3. Both nodes 2 have their child 3 on the right, so the shapes are not mirror images">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge-accent" x1="191" y1="157" x2="229" y2="213"/>
  <line class="d-edge-accent" x1="431" y1="157" x2="469" y2="213"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">1</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="240" cy="230" r="20"/>
  <text class="d-text" x="240" y="235" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="480" cy="230" r="20"/>
  <text class="d-text" x="480" y="235" text-anchor="middle">3</text>
  <text class="d-sub" x="120" y="235" text-anchor="middle">missing</text>
  <text class="d-sub" x="360" y="235" text-anchor="middle">missing</text>
  <text class="d-sub" x="300" y="300" text-anchor="middle">mirror line</text>
  <line class="d-edge-dashed" x1="300" y1="80" x2="300" y2="270"/>
</svg>

The values on each level are identical (\`2, 2\` then \`3, 3\`), but both \`3\`s hang to the right of their parent. In a mirror, the left \`2\` would need its \`3\` on the **left**. The inner-pair check (\`a.right\` with \`b.left\`) finds a \`3\` against a missing node and returns false.

📌 **Interview term: Short-circuit evaluation** — \`x and y\` (or \`x && y\`) does not evaluate \`y\` when \`x\` is already false. The mirror check uses it to stop as soon as one pair fails, so an asymmetric tree is often rejected after a few comparisons.

### Why "inorder is a palindrome" is wrong

A tempting shortcut is: read the tree in [inorder](/interview-question/what-are-the-tree-traversal-methods) and check that the list reads the same backwards. It works for the first picture, but values alone lose the **shape**. The tree \`[1, 2, 2, 2, null, 2]\` has inorder \`2, 2, 1, 2, 2\` (a palindrome) yet both lower \`2\`s are left children, so it is not symmetric. Example 2 prints the wrong \`true\` from the shortcut next to the right \`false\`. If you want a traversal-based check you must include markers for missing children, at which point the direct pair comparison is simpler.

### The iterative version: a queue of pairs

Instead of recursing, put pairs that must mirror each other in a queue. Start with \`(root.left, root.right)\`. Take a pair; if both are missing, skip it; if one is missing or the values differ, return false; otherwise add \`(a.left, b.right)\` and \`(a.right, b.left)\`. If the queue empties, the tree is symmetric. A stack works just as well — the order in which pairs are checked does not matter, only that every pair is checked.

A closely related approach: [invert](/interview-question/how-do-you-invert-a-binary-tree) a copy of the left subtree and check that it is identical to the right subtree. It is correct, but it allocates a copy (or mutates the tree), so the direct pair comparison is preferred.

## 4. The Java Code, Line by Line

Recursive:

~~~java
static boolean isMirror(TreeNode a, TreeNode b) {
    if (a == null && b == null) return true;    // both missing: still a mirror
    if (a == null || b == null) return false;   // only one missing: shapes differ
    return a.val == b.val
        && isMirror(a.left, b.right)            // outer pair
        && isMirror(a.right, b.left);           // inner pair
}

static boolean isSymmetric(TreeNode root) {
    return root == null || isMirror(root.left, root.right);
}
~~~

Iterative, with a queue of two-slot arrays:

~~~java
static boolean isSymmetricIterative(TreeNode root) {
    if (root == null) return true;
    // Each element is a two-slot array; the array itself is never null, so
    // ArrayDeque accepts it even when a slot holds a null child.
    Deque<TreeNode[]> queue = new ArrayDeque<>();
    queue.add(new TreeNode[] {root.left, root.right});
    while (!queue.isEmpty()) {
        TreeNode[] pair = queue.poll();
        TreeNode a = pair[0], b = pair[1];
        if (a == null && b == null) continue;
        if (a == null || b == null || a.val != b.val) return false;
        queue.add(new TreeNode[] {a.left, b.right});   // outer pair
        queue.add(new TreeNode[] {a.right, b.left});   // inner pair
    }
    return true;
}
~~~

What each Java piece is doing:

- **The "both null" test comes first**, so two empty subtrees are accepted before the "one null" test rejects anything.
- **\`a.val == b.val\` is correct because \`val\` is an \`int\`.** If your \`TreeNode\` stores \`Integer val\`, \`==\` compares *references*. Java caches \`Integer\` objects only for small values, so it seems to work in small tests:

~~~java
Integer a = 127, b = 127, c = 1000, d = 1000;
System.out.println("Integer 127 == 127: " + (a == b));
System.out.println("Integer 1000 == 1000: " + (c == d));
System.out.println("Integer 1000 equals 1000: " + c.equals(d));
~~~

~~~text
Integer 127 == 127: true
Integer 1000 == 1000: false
Integer 1000 equals 1000: true
~~~

  The [\`Integer.valueOf\` documentation](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Integer.html#valueOf(int)) says values in the range -128 to 127 are always cached. With \`Integer\` values use \`a.val.equals(b.val)\` or \`Objects.equals\`.
- **\`TreeNode[]\` pairs in \`ArrayDeque\`.** \`ArrayDeque\` throws \`NullPointerException\` on a null element, and the children in a pair are often null. Wrapping them in an array solves it because the array itself is never null. Alternatives: a \`LinkedList<TreeNode>\` (which permits nulls) with nodes added two at a time, or a small \`record Pair(TreeNode a, TreeNode b)\`.
- **\`&&\` short-circuits**, so the inner pair is not checked if the outer pair fails.

📌 **Interview term: \`StackOverflowError\`** — the recursive check nests one call per level; when we ran the recursive \`isMirror\` on the 100001-node V tree from Example 2 (height 50001) with plain \`java Main\` on OpenJDK 21 and no \`-Xss\` flag, it ended with \`caught java.lang.StackOverflowError\`. The iterative version in Example 2 checks the same tree without recursion.

### Dry run on \`[1, 2, 2, 3, 4, 4, 3]\`

| Call | a, b | Values equal? | Next checks |
| :--- | :--- | :--- | :--- |
| \`mirror(2, 2)\` | left 2, right 2 | yes | outer \`(3, 3)\`, inner \`(4, 4)\` |
| \`mirror(3, 3)\` | both leaves | yes | \`(null, null)\` twice: true |
| \`mirror(4, 4)\` | both leaves | yes | \`(null, null)\` twice: true |
| result | | | **true** |

And on \`[1, 2, 2, null, 3, null, 3]\`: \`mirror(2, 2)\` has equal values, the outer pair \`(null, null)\` is fine, but the inner pair is \`(3, null)\` — exactly one missing — so it returns **false**.

## 5. Verified: Running the Code

Each example below was saved to a file and run with \`javac Main.java && java Main\` (OpenJDK 21 (javac 21)). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive mirror check on six trees** printed:

~~~text
isSymmetric([1, 2, 2, 3, 4, 4, 3]) = true
isSymmetric([1, 2, 2, null, 3, null, 3]) = false
isSymmetric([1, 2, 2, 2, null, 2]) = false
isSymmetric([1, 2, 3]) = false
isSymmetric([1]) = true
isSymmetric([]) = true
~~~

**Example 2 — Iterative queue of pairs, the wrong inorder-palindrome idea, and a 100001-node V tree** printed:

~~~text
[1, 2, 2, 3, 4, 4, 3]: recursive true, iterative true, inorder palindrome true
[1, 2, 2, null, 3, null, 3]: recursive false, iterative false, inorder palindrome false
[1, 2, 2, 2, null, 2]: recursive false, iterative false, inorder palindrome true
V tree of 100001 nodes, iterative: true
same tree with one leaf changed, iterative: false
~~~

In Example 2 the third tree is the important line: the inorder-palindrome shortcut says \`true\` while both correct checks say \`false\`. The V tree is symmetric all the way down, and changing one bottom leaf flips the answer to \`false\`.

## 6. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive mirror check | O(n) | O(h) | Each node is compared at most once (it is in exactly one pair); the call stack follows one path |
| Iterative queue of pairs | O(n) | O(w) | Each pair is enqueued once; the queue holds about one level of pairs |
| Invert a copy and compare | O(n) | O(n) | The copy costs a node per node |
| Inorder palindrome | O(n) | O(n) | Cheap but **incorrect** without null markers |

The worst case is a symmetric tree, where every node must be checked; an asymmetric tree usually stops early thanks to short-circuiting. h is the height and w the widest level. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 7. Edge Cases

- **Empty tree** — symmetric (\`isSymmetric([]) = true\`).
- **Single node** — symmetric; both children are missing.
- **Same values, wrong shape** — \`[1, 2, 2, null, 3, null, 3]\` and \`[1, 2, 2, 2, null, 2]\` are both false.
- **Same shape, different values** — \`[1, 2, 3]\` is false at the first pair.
- **Very deep but symmetric** — the 100001-node V tree in Example 2 (a long left chain mirrored by a long right chain) is checked iteratively; a recursive check would recurse 50000 levels deep.
- **A difference at the very bottom** — changing one leaf of the V tree makes the iterative check return false after walking all the way down.

## Common Pitfalls

- **Comparing \`left\` with \`left\`.** That tests identical halves, not mirrored ones; the pairs are \`(a.left, b.right)\` and \`(a.right, b.left)\`.
- **Putting null children straight into an \`ArrayDeque\`.** \`NullPointerException\`; wrap the pair in an array or record, or use \`LinkedList\`.
- **\`==\` on \`Integer\` values.** Passes for small numbers because of the cache and fails for 1000, as printed above.
- **The inorder-palindrome shortcut.** Example 2 shows it returning \`true\` for a non-symmetric tree.
- **Testing \`a == null || b == null\` before "both null".** Rejects two empty subtrees.
- **Deep recursion.** \`StackOverflowError\` on very tall trees; use the iterative version.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reduce it:</strong> <span style="color:#f0e2c8;">A tree is symmetric when the left subtree mirrors the right, so I write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isMirror(a, b)</code> and call it on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">root.left</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">root.right</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The mirror rules:</strong> <span style="color:#f0e2c8;">Both null is true, one null is false, different values is false; otherwise both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isMirror(a.left, b.right)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isMirror(a.right, b.left)</code> must hold.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Iterative version:</strong> <span style="color:#f0e2c8;">A queue of pairs; since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> rejects nulls I enqueue <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeNode[]</code> pairs, which are never null themselves.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(h) for recursion or O(w) for the queue; short-circuiting stops most asymmetric trees early.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val</code> is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> is right; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> values I would use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> compares references outside the -128 to 127 cache.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not check that inorder is a palindrome?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Values lose the shape: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 2, 2, null, 2]</code> has inorder <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2, 2, 1, 2, 2</code> but is not symmetric, as Example 2 prints.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">TreeNode[]</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LinkedList</code> for the pairs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both work. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> with an array per pair keeps the faster deque and makes each element a real pair; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LinkedList</code> accepts nulls but you must remember to add and remove two at a time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to inverting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A tree is symmetric exactly when the inverted left subtree equals the right subtree; comparing directly avoids copying or mutating.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you check that two trees are identical?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same structure with same-side pairs: equal values, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">same(a.left, b.left) &amp;&amp; same(a.right, b.right)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your recursion overflows on a tall tree. What now?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Switch to the iterative queue-of-pairs version, or run on a thread with a bigger stack; the iterative version is the portable fix.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Symmetric (mirror-symmetric) tree** | A tree whose left subtree is the mirror image of its right subtree |
| **Mirror image** | Equal root values, \`A.left\` mirrors \`B.right\`, \`A.right\` mirrors \`B.left\` |
| **Short-circuit evaluation** | \`x and y\` / \`x && y\` skips \`y\` when \`x\` is already false |
| **\`Integer\` cache** | Java reuses \`Integer\` objects for -128 to 127, so \`==\` on boxed values only seems to work for small numbers |

---
**Conclusion:** A tree is symmetric when \`isMirror(root.left, root.right)\` holds: both null is true, one null or different values is false, and otherwise the outer pair and the inner pair must mirror. It is O(n) time; recursion costs O(h) stack and the queue-of-pairs version O(w). In Java, wrap null-containing pairs before putting them in an \`ArrayDeque\`, and use \`equals\` if values are ever boxed \`Integer\`s.`,
        examples: [
          {
            label: "Recursive mirror check on six trees",
            code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
    }

    // Build a tree from level-order values; null marks a missing child.
    static TreeNode build(Integer... values) {
        if (values.length == 0 || values[0] == null) return null;
        TreeNode root = new TreeNode(values[0]);
        Deque<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            TreeNode node = queue.poll();
            if (i < values.length && values[i] != null) { node.left = new TreeNode(values[i]); queue.add(node.left); }
            i++;
            if (i < values.length && values[i] != null) { node.right = new TreeNode(values[i]); queue.add(node.right); }
            i++;
        }
        return root;
    }


    static boolean isMirror(TreeNode a, TreeNode b) {
        if (a == null && b == null) return true;    // both missing: still a mirror
        if (a == null || b == null) return false;   // only one missing: shapes differ
        return a.val == b.val
            && isMirror(a.left, b.right)            // outer pair
            && isMirror(a.right, b.left);           // inner pair
    }

    static boolean isSymmetric(TreeNode root) {
        return root == null || isMirror(root.left, root.right);
    }

    static String show(String text, Integer... values) {
        return "isSymmetric(" + text + ") = " + isSymmetric(build(values));
    }

    public static void main(String[] args) {
        System.out.println(show("[1, 2, 2, 3, 4, 4, 3]", 1, 2, 2, 3, 4, 4, 3));             // true
        System.out.println(show("[1, 2, 2, null, 3, null, 3]", 1, 2, 2, null, 3, null, 3)); // false
        System.out.println(show("[1, 2, 2, 2, null, 2]", 1, 2, 2, 2, null, 2));             // false
        System.out.println(show("[1, 2, 3]", 1, 2, 3));                                     // false
        System.out.println(show("[1]", 1));                                                 // true
        System.out.println(show("[]"));                                                     // true
    }
}
`,
          },
          {
            label: "Iterative queue of pairs, the wrong inorder-palindrome idea, and a 100001-node V tree",
            code: `import java.util.*;

public class Main {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
    }

    // Build a tree from level-order values; null marks a missing child.
    static TreeNode build(Integer... values) {
        if (values.length == 0 || values[0] == null) return null;
        TreeNode root = new TreeNode(values[0]);
        Deque<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            TreeNode node = queue.poll();
            if (i < values.length && values[i] != null) { node.left = new TreeNode(values[i]); queue.add(node.left); }
            i++;
            if (i < values.length && values[i] != null) { node.right = new TreeNode(values[i]); queue.add(node.right); }
            i++;
        }
        return root;
    }


    static boolean isMirror(TreeNode a, TreeNode b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        return a.val == b.val && isMirror(a.left, b.right) && isMirror(a.right, b.left);
    }

    static boolean isSymmetricIterative(TreeNode root) {
        if (root == null) return true;
        // Each element is a two-slot array; the array itself is never null, so
        // ArrayDeque accepts it even when a slot holds a null child.
        Deque<TreeNode[]> queue = new ArrayDeque<>();
        queue.add(new TreeNode[] {root.left, root.right});
        while (!queue.isEmpty()) {
            TreeNode[] pair = queue.poll();
            TreeNode a = pair[0], b = pair[1];
            if (a == null && b == null) continue;
            if (a == null || b == null || a.val != b.val) return false;
            queue.add(new TreeNode[] {a.left, b.right});   // outer pair
            queue.add(new TreeNode[] {a.right, b.left});   // inner pair
        }
        return true;
    }

    static boolean inorderPalindrome(TreeNode root) {     // WRONG idea, shown for contrast
        List<Integer> vals = new ArrayList<>();
        Deque<TreeNode> stack = new ArrayDeque<>();
        TreeNode node = root;
        while (!stack.isEmpty() || node != null) {
            while (node != null) { stack.push(node); node = node.left; }
            node = stack.pop();
            vals.add(node.val);
            node = node.right;
        }
        List<Integer> rev = new ArrayList<>(vals);
        Collections.reverse(rev);
        return vals.equals(rev);
    }

    static String row(String text, Integer... values) {
        TreeNode root = build(values);
        boolean rec = root == null || isMirror(root.left, root.right);
        return text + ": recursive " + rec + ", iterative " + isSymmetricIterative(root)
            + ", inorder palindrome " + inorderPalindrome(root);
    }

    public static void main(String[] args) {
        System.out.println(row("[1, 2, 2, 3, 4, 4, 3]", 1, 2, 2, 3, 4, 4, 3));
        System.out.println(row("[1, 2, 2, null, 3, null, 3]", 1, 2, 2, null, 3, null, 3));
        System.out.println(row("[1, 2, 2, 2, null, 2]", 1, 2, 2, 2, null, 2));

        // A V-shaped tree: a left-only chain and a right-only chain of 50000 nodes each.
        TreeNode root = new TreeNode(0);
        TreeNode leftEnd = root, rightEnd = root;
        for (int v = 1; v <= 50000; v++) {
            leftEnd.left = new TreeNode(v);
            rightEnd.right = new TreeNode(v);
            leftEnd = leftEnd.left;
            rightEnd = rightEnd.right;
        }
        System.out.println("V tree of 100001 nodes, iterative: " + isSymmetricIterative(root));
        rightEnd.val = -1;                                  // break the mirror at the very bottom
        System.out.println("same tree with one leaf changed, iterative: " + isSymmetricIterative(root));
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Write a C++ function bool isSymmetric(TreeNode* root) that returns true if the tree is a mirror of itself around its centre. Then show me a version without recursion."

**What a strong answer should cover:**
- Reduce the problem to \`isMirror(root->left, root->right)\` on two nodes.
- The four cases: both null, exactly one null, different values, then outer and inner pairs.
- An iterative version with \`std::queue<std::pair<const TreeNode*, const TreeNode*>>\`.
- O(n) time, O(h) or O(w) space; why an inorder palindrome check is wrong.
- C++ specifics: take \`const TreeNode*\` because the check does not modify the tree; check for null **before** dereferencing (\`a->val\` on a null pointer is undefined behaviour); \`&&\` short-circuits; \`std::equal(v.begin(), v.end(), v.rbegin())\` is the idiomatic palindrome test used in the counter-example.

**Clarifying questions expected:**
- "Must the shape mirror as well as the values?"
- "Is an empty tree symmetric?"

**Code / implementation expected:** Yes — a recursive C++ helper taking two \`const TreeNode*\` plus an iterative queue-of-pairs version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a binary tree is.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this C++ version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Fold a sheet of paper in half, put a blob of paint on one side, and press the halves together. When you open it, the picture is perfectly symmetric: every blob on the left has a twin at the same height on the right, the same distance from the fold.

A symmetric binary tree is that ink-blot picture. Draw a vertical line through the root; the left half must be the exact mirror image of the right half — same values, same shape, flipped. The trap is in the word "mirror". It is not enough for the two halves to look the same; the **outer** edge of the left side must match the **outer** edge of the right side, and the **inner** parts must match each other. Getting those pairings right is the whole question, and it is a common warm-up because it tests whether you can write a recursion that walks **two** trees at once.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does symmetric mean both values **and** shape must mirror? | In the standard problem (LeetCode 101), yes: a missing child on one side must be missing on the other side too. |
| Is an empty tree symmetric? | Usually yes; the code returns \`true\` for it, but confirm. |
| Do you want both a recursive and an iterative solution? | The problem statement often asks for both; the iterative one uses a queue or stack of pairs. |
| How deep can the tree be? | A deep tree can overflow the recursion; the iterative version avoids that. |
| What type are the values? | Matters for how you compare them (for example boxed integers in Java, or floating-point values). |

## 3. The Core Idea

📌 **Interview term: Symmetric (mirror-symmetric) tree** — a tree whose left subtree is the **mirror image** of its right subtree.

📌 **Interview term: Mirror image** — two trees \`A\` and \`B\` are mirrors when their roots have equal values, \`A.left\` mirrors \`B.right\`, and \`A.right\` mirrors \`B.left\`. Two empty trees are mirrors; an empty tree and a non-empty one are not.

So the question "is this tree symmetric?" becomes "is \`root.left\` a mirror of \`root.right\`?", and the mirror test is a recursive function of **two** nodes:

1. Both missing — mirror (return true).
2. Exactly one missing — not a mirror (return false).
3. Different values — not a mirror.
4. Otherwise check the **outer pair** (\`a.left\` with \`b.right\`) **and** the **inner pair** (\`a.right\` with \`b.left\`).

<svg class="iq-diagram" width="100%" viewBox="0 0 600 320" role="img" aria-label="Symmetric tree 1, 2, 2, 3, 4, 4, 3 with a dashed mirror line through the root; the outer pair is 3 and 3, the inner pair is 4 and 4">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge" x1="169" y1="157" x2="131" y2="213"/>
  <line class="d-edge" x1="191" y1="157" x2="229" y2="213"/>
  <line class="d-edge" x1="409" y1="157" x2="371" y2="213"/>
  <line class="d-edge" x1="431" y1="157" x2="469" y2="213"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">1</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="120" cy="230" r="20"/>
  <text class="d-text" x="120" y="235" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="240" cy="230" r="20"/>
  <text class="d-text" x="240" y="235" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="360" cy="230" r="20"/>
  <text class="d-text" x="360" y="235" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="480" cy="230" r="20"/>
  <text class="d-text" x="480" y="235" text-anchor="middle">3</text>
  <text class="d-sub" x="300" y="300" text-anchor="middle">mirror line</text>
  <text class="d-sub" x="120" y="280" text-anchor="middle">outer</text>
  <text class="d-sub" x="480" y="280" text-anchor="middle">outer</text>
  <text class="d-sub" x="240" y="280" text-anchor="middle">inner</text>
  <text class="d-sub" x="360" y="280" text-anchor="middle">inner</text>
  <line class="d-edge-dashed" x1="300" y1="80" x2="300" y2="270"/>
</svg>

The outer pair is the two \`3\`s on the far edges; the inner pair is the two \`4\`s next to the mirror line. Each pair is checked by the same rules one level down.

Here is a tree that fails:

<svg class="iq-diagram" width="100%" viewBox="0 0 600 320" role="img" aria-label="Not symmetric: tree 1, 2, 2, null, 3, null, 3. Both nodes 2 have their child 3 on the right, so the shapes are not mirror images">
  <line class="d-edge" x1="284" y1="62" x2="196" y2="128"/>
  <line class="d-edge" x1="316" y1="62" x2="404" y2="128"/>
  <line class="d-edge-accent" x1="191" y1="157" x2="229" y2="213"/>
  <line class="d-edge-accent" x1="431" y1="157" x2="469" y2="213"/>
  <circle class="d-box-accent" cx="300" cy="50" r="20"/>
  <text class="d-text" x="300" y="55" text-anchor="middle">1</text>
  <circle class="d-box" cx="180" cy="140" r="20"/>
  <text class="d-text" x="180" y="145" text-anchor="middle">2</text>
  <circle class="d-box" cx="420" cy="140" r="20"/>
  <text class="d-text" x="420" y="145" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="240" cy="230" r="20"/>
  <text class="d-text" x="240" y="235" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="480" cy="230" r="20"/>
  <text class="d-text" x="480" y="235" text-anchor="middle">3</text>
  <text class="d-sub" x="120" y="235" text-anchor="middle">missing</text>
  <text class="d-sub" x="360" y="235" text-anchor="middle">missing</text>
  <text class="d-sub" x="300" y="300" text-anchor="middle">mirror line</text>
  <line class="d-edge-dashed" x1="300" y1="80" x2="300" y2="270"/>
</svg>

The values on each level are identical (\`2, 2\` then \`3, 3\`), but both \`3\`s hang to the right of their parent. In a mirror, the left \`2\` would need its \`3\` on the **left**. The inner-pair check (\`a.right\` with \`b.left\`) finds a \`3\` against a missing node and returns false.

📌 **Interview term: Short-circuit evaluation** — \`x and y\` (or \`x && y\`) does not evaluate \`y\` when \`x\` is already false. The mirror check uses it to stop as soon as one pair fails, so an asymmetric tree is often rejected after a few comparisons.

### Why "inorder is a palindrome" is wrong

A tempting shortcut is: read the tree in [inorder](/interview-question/what-are-the-tree-traversal-methods) and check that the list reads the same backwards. It works for the first picture, but values alone lose the **shape**. The tree \`[1, 2, 2, 2, null, 2]\` has inorder \`2, 2, 1, 2, 2\` (a palindrome) yet both lower \`2\`s are left children, so it is not symmetric. Example 2 prints the wrong \`true\` from the shortcut next to the right \`false\`. If you want a traversal-based check you must include markers for missing children, at which point the direct pair comparison is simpler.

### The iterative version: a queue of pairs

Instead of recursing, put pairs that must mirror each other in a queue. Start with \`(root.left, root.right)\`. Take a pair; if both are missing, skip it; if one is missing or the values differ, return false; otherwise add \`(a.left, b.right)\` and \`(a.right, b.left)\`. If the queue empties, the tree is symmetric. A stack works just as well — the order in which pairs are checked does not matter, only that every pair is checked.

A closely related approach: [invert](/interview-question/how-do-you-invert-a-binary-tree) a copy of the left subtree and check that it is identical to the right subtree. It is correct, but it allocates a copy (or mutates the tree), so the direct pair comparison is preferred.

## 4. The C++ Code, Line by Line

Recursive:

~~~cpp
bool isMirror(const TreeNode* a, const TreeNode* b) {
    if (!a && !b) return true;               // both missing: still a mirror
    if (!a || !b) return false;              // only one missing: shapes differ
    return a->val == b->val
        && isMirror(a->left, b->right)       // outer pair
        && isMirror(a->right, b->left);      // inner pair
}

bool isSymmetric(const TreeNode* root) {
    return !root || isMirror(root->left, root->right);
}
~~~

Iterative, with a queue of pointer pairs:

~~~cpp
bool isSymmetricIterative(const TreeNode* root) {
    if (!root) return true;
    std::queue<std::pair<const TreeNode*, const TreeNode*>> q;   // pairs that must mirror
    q.push({root->left, root->right});
    while (!q.empty()) {
        auto [a, b] = q.front();
        q.pop();
        if (!a && !b) continue;
        if (!a || !b || a->val != b->val) return false;
        q.push({a->left, b->right});          // outer pair
        q.push({a->right, b->left});          // inner pair
    }
    return true;
}
~~~

What each C++ piece is doing:

- **\`const TreeNode*\`** promises the function only reads the tree; a \`TreeNode*\` converts to it implicitly, and the compiler rejects any accidental write such as \`a->val = 0\`.
- **Null checks before \`->\`.** The two \`if\` lines guarantee that both pointers are valid before \`a->val\` is read. Dereferencing a null pointer is undefined behaviour — usually a crash, but not guaranteed to be one.
- **\`&&\` short-circuits**, so \`isMirror(a->right, b->left)\` is skipped when the outer pair already failed.
- **\`std::pair\` of pointers** can hold \`nullptr\` in either slot; \`auto [a, b] = q.front();\` (C++17 structured bindings) unpacks it, and \`q.pop()\` (which returns \`void\`) removes it.
- **\`std::equal(vals.begin(), vals.end(), vals.rbegin())\`** in the counter-example compares the list with its own reverse — a one-line palindrome test from \`<algorithm>\`.

📌 **Interview term: Undefined behaviour** — code whose result the C++ standard does not define at all, such as dereferencing \`nullptr\`. It may crash, appear to work, or do something else; the null checks exist to make it impossible here.

The recursive check nests one call per level. The 100001-node V tree in Example 2 has height 50001; the [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) page shows how a recursion that is too deep ends in a segmentation fault, which is why the iterative version is used there.

### Dry run on \`[1, 2, 2, 3, 4, 4, 3]\`

| Call | a, b | Values equal? | Next checks |
| :--- | :--- | :--- | :--- |
| \`mirror(2, 2)\` | left 2, right 2 | yes | outer \`(3, 3)\`, inner \`(4, 4)\` |
| \`mirror(3, 3)\` | both leaves | yes | \`(null, null)\` twice: true |
| \`mirror(4, 4)\` | both leaves | yes | \`(null, null)\` twice: true |
| result | | | **true** |

And on \`[1, 2, 2, null, 3, null, 3]\`: \`mirror(2, 2)\` has equal values, the outer pair \`(null, null)\` is fine, but the inner pair is \`(3, null)\` — exactly one missing — so it returns **false**.

## 5. Verified: Running the Code

Each example below was saved to a file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3 with -std=c++17). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive mirror check on six trees** printed:

~~~text
isSymmetric([1, 2, 2, 3, 4, 4, 3]) = true
isSymmetric([1, 2, 2, null, 3, null, 3]) = false
isSymmetric([1, 2, 2, 2, null, 2]) = false
isSymmetric([1, 2, 3]) = false
isSymmetric([1]) = true
isSymmetric([]) = true
~~~

**Example 2 — Iterative queue of pairs, the wrong inorder-palindrome idea, and a 100001-node V tree** printed:

~~~text
[1, 2, 2, 3, 4, 4, 3]: recursive true, iterative true, inorder palindrome true
[1, 2, 2, null, 3, null, 3]: recursive false, iterative false, inorder palindrome false
[1, 2, 2, 2, null, 2]: recursive false, iterative false, inorder palindrome true
V tree of 100001 nodes, iterative: true
same tree with one leaf changed, iterative: false
~~~

In Example 2 the third tree is the important line: the inorder-palindrome shortcut says \`true\` while both correct checks say \`false\`. The V tree is symmetric all the way down, and changing one bottom leaf flips the answer to \`false\`.

## 6. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive mirror check | O(n) | O(h) | Each node is compared at most once (it is in exactly one pair); the call stack follows one path |
| Iterative queue of pairs | O(n) | O(w) | Each pair is enqueued once; the queue holds about one level of pairs |
| Invert a copy and compare | O(n) | O(n) | The copy costs a node per node |
| Inorder palindrome | O(n) | O(n) | Cheap but **incorrect** without null markers |

The worst case is a symmetric tree, where every node must be checked; an asymmetric tree usually stops early thanks to short-circuiting. h is the height and w the widest level. See [Big-O notation](/interview-question/what-is-big-o-notation).

## 7. Edge Cases

- **Empty tree** — symmetric (\`isSymmetric([]) = true\`).
- **Single node** — symmetric; both children are missing.
- **Same values, wrong shape** — \`[1, 2, 2, null, 3, null, 3]\` and \`[1, 2, 2, 2, null, 2]\` are both false.
- **Same shape, different values** — \`[1, 2, 3]\` is false at the first pair.
- **Very deep but symmetric** — the 100001-node V tree in Example 2 (a long left chain mirrored by a long right chain) is checked iteratively; a recursive check would recurse 50000 levels deep.
- **A difference at the very bottom** — changing one leaf of the V tree makes the iterative check return false after walking all the way down.

## Common Pitfalls

- **Comparing \`left\` with \`left\`.** That tests identical halves, not a mirror; the pairs are \`(a->left, b->right)\` and \`(a->right, b->left)\`.
- **Reading \`a->val\` before the null checks.** Undefined behaviour on a missing child.
- **\`auto [a, b] = q.front();\` after \`q.pop()\`.** The element is gone; read first, then pop.
- **The inorder-palindrome shortcut.** Example 2 shows it returning \`true\` for a non-symmetric tree.
- **Testing \`!a || !b\` before "both null".** Rejects two empty subtrees.
- **Deep recursion on tall trees.** A segfault rather than an exception; use the iterative version.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reduce it:</strong> <span style="color:#f0e2c8;">A tree is symmetric when the left subtree mirrors the right, so I write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isMirror(a, b)</code> on two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const TreeNode*</code> and call it on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">root-&gt;left, root-&gt;right</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The mirror rules:</strong> <span style="color:#f0e2c8;">Both null is true, one null is false, different values is false; otherwise the outer pair and the inner pair must both mirror.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Iterative version:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code> of pointer pairs; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code> in a slot is fine; I read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">front()</code> with a structured binding, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(h) for recursion or O(w) for the queue; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;&amp;</code> short-circuits so most asymmetric trees stop early.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ details:</strong> <span style="color:#f0e2c8;">The null checks come before any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-&gt;</code>, because dereferencing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code> is undefined behaviour, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> pointers document that the tree is not changed.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not check that inorder is a palindrome?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It loses shape: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 2, 2, null, 2]</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2, 2, 1, 2, 2</code> but is not symmetric, which Example 2 prints.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this relate to inverting a tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Symmetric means the inverted left subtree equals the right subtree; comparing directly avoids copying or mutating.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Stack or queue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either; the order does not matter as long as every pair is checked. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> of pairs with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">back</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_back</code> gives a DFS.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you check two trees are identical?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same recursion with same-side pairs: equal values, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">same(a-&gt;left, b-&gt;left) &amp;&amp; same(a-&gt;right, b-&gt;right)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">val</code> were a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">double</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exact <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> might be what the problem wants, but for computed values compare with a tolerance such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::fabs(x - y) &lt; 1e-9</code>, and say so.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Symmetric (mirror-symmetric) tree** | A tree whose left subtree is the mirror image of its right subtree |
| **Mirror image** | Equal root values, \`A.left\` mirrors \`B.right\`, \`A.right\` mirrors \`B.left\` |
| **Short-circuit evaluation** | \`x and y\` / \`x && y\` skips \`y\` when \`x\` is already false |
| **Undefined behaviour** | Code the C++ standard gives no meaning to, such as dereferencing \`nullptr\` |

---
**Conclusion:** A tree is symmetric when \`isMirror(root->left, root->right)\` holds: both null is true, one null or different values is false, and otherwise the outer pair and the inner pair must mirror. It is O(n) time; recursion costs O(h) stack and the \`std::queue\` of pointer pairs O(w). In C++, do the null checks before any \`->\`, take \`const TreeNode*\`, and use the iterative version for very tall trees.`,
        examples: [
          {
            label: "Recursive mirror check on six trees",
            code: `#include <iostream>
#include <optional>
#include <queue>
#include <string>
#include <vector>

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    explicit TreeNode(int v, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

const std::nullopt_t NIL = std::nullopt;   // marks a missing child in the input

// Build a tree from level-order values.
TreeNode* build(const std::vector<std::optional<int>>& values) {
    if (values.empty() || !values[0]) return nullptr;
    TreeNode* root = new TreeNode(*values[0]);
    std::queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        TreeNode* node = q.front();
        q.pop();
        if (i < values.size() && values[i]) { node->left = new TreeNode(*values[i]); q.push(node->left); }
        i++;
        if (i < values.size() && values[i]) { node->right = new TreeNode(*values[i]); q.push(node->right); }
        i++;
    }
    return root;
}

// Free every node without recursion, so deep trees are safe too.
void destroy(TreeNode* root) {
    std::vector<TreeNode*> st;
    if (root) st.push_back(root);
    while (!st.empty()) {
        TreeNode* node = st.back();
        st.pop_back();
        if (node->left) st.push_back(node->left);
        if (node->right) st.push_back(node->right);
        delete node;
    }
}

bool isMirror(const TreeNode* a, const TreeNode* b) {
    if (!a && !b) return true;               // both missing: still a mirror
    if (!a || !b) return false;              // only one missing: shapes differ
    return a->val == b->val
        && isMirror(a->left, b->right)       // outer pair
        && isMirror(a->right, b->left);      // inner pair
}

bool isSymmetric(const TreeNode* root) {
    return !root || isMirror(root->left, root->right);
}

std::string show(const std::string& text, const std::vector<std::optional<int>>& values) {
    TreeNode* root = build(values);
    std::string s = "isSymmetric(" + text + ") = " + (isSymmetric(root) ? "true" : "false");
    destroy(root);
    return s;
}

int main() {
    std::cout << show("[1, 2, 2, 3, 4, 4, 3]", {1, 2, 2, 3, 4, 4, 3}) << "\\n";             // true
    std::cout << show("[1, 2, 2, null, 3, null, 3]", {1, 2, 2, NIL, 3, NIL, 3}) << "\\n";   // false
    std::cout << show("[1, 2, 2, 2, null, 2]", {1, 2, 2, 2, NIL, 2}) << "\\n";              // false
    std::cout << show("[1, 2, 3]", {1, 2, 3}) << "\\n";                                     // false
    std::cout << show("[1]", {1}) << "\\n";                                                 // true
    std::cout << show("[]", {}) << "\\n";                                                   // true
}
`,
          },
          {
            label: "Iterative queue of pairs, the wrong inorder-palindrome idea, and a 100001-node V tree",
            code: `#include <algorithm>
#include <iostream>
#include <optional>
#include <queue>
#include <string>
#include <utility>
#include <vector>

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    explicit TreeNode(int v, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

const std::nullopt_t NIL = std::nullopt;   // marks a missing child in the input

// Build a tree from level-order values.
TreeNode* build(const std::vector<std::optional<int>>& values) {
    if (values.empty() || !values[0]) return nullptr;
    TreeNode* root = new TreeNode(*values[0]);
    std::queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        TreeNode* node = q.front();
        q.pop();
        if (i < values.size() && values[i]) { node->left = new TreeNode(*values[i]); q.push(node->left); }
        i++;
        if (i < values.size() && values[i]) { node->right = new TreeNode(*values[i]); q.push(node->right); }
        i++;
    }
    return root;
}

// Free every node without recursion, so deep trees are safe too.
void destroy(TreeNode* root) {
    std::vector<TreeNode*> st;
    if (root) st.push_back(root);
    while (!st.empty()) {
        TreeNode* node = st.back();
        st.pop_back();
        if (node->left) st.push_back(node->left);
        if (node->right) st.push_back(node->right);
        delete node;
    }
}

bool isMirror(const TreeNode* a, const TreeNode* b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a->val == b->val && isMirror(a->left, b->right) && isMirror(a->right, b->left);
}

bool isSymmetricIterative(const TreeNode* root) {
    if (!root) return true;
    std::queue<std::pair<const TreeNode*, const TreeNode*>> q;   // pairs that must mirror
    q.push({root->left, root->right});
    while (!q.empty()) {
        auto [a, b] = q.front();
        q.pop();
        if (!a && !b) continue;
        if (!a || !b || a->val != b->val) return false;
        q.push({a->left, b->right});          // outer pair
        q.push({a->right, b->left});          // inner pair
    }
    return true;
}

bool inorderPalindrome(TreeNode* root) {      // WRONG idea, shown for contrast
    std::vector<int> vals;
    std::vector<TreeNode*> st;
    TreeNode* node = root;
    while (!st.empty() || node) {
        while (node) { st.push_back(node); node = node->left; }
        node = st.back();
        st.pop_back();
        vals.push_back(node->val);
        node = node->right;
    }
    return std::equal(vals.begin(), vals.end(), vals.rbegin());
}

std::string row(const std::string& text, const std::vector<std::optional<int>>& values) {
    TreeNode* root = build(values);
    bool rec = !root || isMirror(root->left, root->right);
    auto b = [](bool x) { return std::string(x ? "true" : "false"); };
    std::string s = text + ": recursive " + b(rec) + ", iterative " + b(isSymmetricIterative(root)) +
                    ", inorder palindrome " + b(inorderPalindrome(root));
    destroy(root);
    return s;
}

int main() {
    std::cout << std::boolalpha;
    std::cout << row("[1, 2, 2, 3, 4, 4, 3]", {1, 2, 2, 3, 4, 4, 3}) << "\\n";
    std::cout << row("[1, 2, 2, null, 3, null, 3]", {1, 2, 2, NIL, 3, NIL, 3}) << "\\n";
    std::cout << row("[1, 2, 2, 2, null, 2]", {1, 2, 2, 2, NIL, 2}) << "\\n";

    // A V-shaped tree: a left-only chain and a right-only chain of 50000 nodes each.
    TreeNode* root = new TreeNode(0);
    TreeNode* leftEnd = root;
    TreeNode* rightEnd = root;
    for (int v = 1; v <= 50000; v++) {
        leftEnd->left = new TreeNode(v);
        rightEnd->right = new TreeNode(v);
        leftEnd = leftEnd->left;
        rightEnd = rightEnd->right;
    }
    std::cout << "V tree of 100001 nodes, iterative: " << isSymmetricIterative(root) << "\\n";
    rightEnd->val = -1;                         // break the mirror at the very bottom
    std::cout << "same tree with one leaf changed, iterative: " << isSymmetricIterative(root) << "\\n";
    destroy(root);
}
`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you check if a root-to-leaf path sums to a target?",
    difficulty: "easy",
    seoDescription: "Root-to-leaf path sum in Python, JavaScript, Java and C++: carry the remainder down, the one-child leaf trap, all paths, overflow and verified output.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given the root of a binary tree and an integer target, write a Python function that returns True if some path from the root down to a leaf has values adding up to exactly the target. Then tell me how you would return all such paths."

**What a strong answer should cover:**
- Carry the remaining target down: subtract the node's value, and at a leaf check that the remainder is 0.
- A leaf has no children; a one-child node is not a leaf, so \`[1, 2]\` with target 1 is False.
- O(n) time, O(h) space; the short-circuit \`or\` stops at the first valid path; negative values mean no pruning.
- Follow-up: all paths with backtracking (append, recurse, pop) and a copy at each match.
- Python specifics: ints never overflow; store \`list(path)\` (a copy) or every stored path is the same list that later gets emptied; the recursion limit of 1000 suggests an iterative \`(node, remaining)\` stack for deep trees.

**Clarifying questions expected:**
- "Must the path end at a leaf, and start at the root?"
- "Can the values or the target be negative?"

**Code / implementation expected:** Yes — a short recursive Python function; optionally the iterative stack and the all-paths version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a binary tree is.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Python version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

You are on a hike with a fixed amount of energy, say 22 snack bars' worth. The trail starts at one trailhead and keeps forking; every trail segment costs a certain number of bars. The trails end at viewpoints with no further forks. Question: is there a route from the trailhead to some viewpoint that uses **exactly** all 22 bars?

You do not need to add up every route from scratch. Walk down a fork and keep track of how many bars you still have. At each point, subtract the cost of where you are. When you arrive at a viewpoint (a dead end), check whether you have exactly zero left. If not, walk back and try the next fork.

That is the root-to-leaf path sum problem. It is a classic because it teaches the **top-down** style of tree recursion: instead of returning answers upward (as [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) does), you pass information **down** — here, the amount still needed. It also contains one of the most common tree bugs: treating a missing child as if it were the end of a path.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must the path end at a **leaf**, or can it stop at any node? | The standard version (LeetCode 112) requires a leaf. Stopping anywhere is a different, easier check. |
| Must it start at the root? | Yes here. "Any downward path" is Path Sum III, which needs prefix sums. |
| Can values or the target be negative? | Yes in the standard problem, so you **cannot** stop early when the running sum passes the target. |
| What should an empty tree return? | \`false\` — there is no path at all, even for target 0. |
| Do you want a yes/no answer, or the paths themselves? | Returning all paths (Path Sum II) needs backtracking and copies. |
| How large can the values be? | Large values can overflow a 32-bit integer when added, which matters in Java and C++. |

## 3. The Core Idea

📌 **Interview term: Root-to-leaf path** — a sequence of nodes that starts at the root, moves to a child at each step, and ends at a **leaf**.

📌 **Interview term: Leaf** — a node with **no** children: both \`left\` and \`right\` are missing. A node with one child is *not* a leaf.

The trick is to carry the **remaining target** down the tree:

1. Empty tree: return false (there is no path).
2. Subtract the current node's value from the target.
3. If the node is a leaf, the answer is "is the remainder exactly 0?".
4. Otherwise, the answer is "does the **left** subtree have a path for the remainder, **or** does the **right** one?".

Here is tree A, \`[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1]\`, looking for 22:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 350" role="img" aria-label="Tree A with the path 5, 4, 11, 2 highlighted. The needed sum goes 22, then 17, then 13, then 2, and the leaf 2 brings it to 0">
  <line class="d-edge-accent" x1="303" y1="60" x2="197" y2="120"/>
  <line class="d-edge" x1="337" y1="60" x2="443" y2="120"/>
  <line class="d-edge-accent" x1="167" y1="145" x2="123" y2="195"/>
  <line class="d-edge" x1="447" y1="145" x2="403" y2="195"/>
  <line class="d-edge" x1="473" y1="145" x2="517" y2="195"/>
  <line class="d-edge" x1="99" y1="227" x2="71" y2="273"/>
  <line class="d-edge-accent" x1="121" y1="227" x2="149" y2="273"/>
  <line class="d-edge" x1="541" y1="227" x2="569" y2="273"/>
  <circle class="d-box-accent" cx="320" cy="50" r="20"/>
  <text class="d-text" x="320" y="55" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="180" cy="130" r="20"/>
  <text class="d-text" x="180" y="135" text-anchor="middle">4</text>
  <circle class="d-box" cx="460" cy="130" r="20"/>
  <text class="d-text" x="460" y="135" text-anchor="middle">8</text>
  <circle class="d-box-accent" cx="110" cy="210" r="20"/>
  <text class="d-text" x="110" y="215" text-anchor="middle">11</text>
  <circle class="d-box" cx="390" cy="210" r="20"/>
  <text class="d-text" x="390" y="215" text-anchor="middle">13</text>
  <circle class="d-box" cx="530" cy="210" r="20"/>
  <text class="d-text" x="530" y="215" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="60" cy="290" r="20"/>
  <text class="d-text" x="60" y="295" text-anchor="middle">7</text>
  <circle class="d-box-accent" cx="160" cy="290" r="20"/>
  <text class="d-text" x="160" y="295" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="580" cy="290" r="20"/>
  <text class="d-text" x="580" y="295" text-anchor="middle">1</text>
  <text class="d-sub" x="380" y="55" text-anchor="start">need 22</text>
  <text class="d-sub" x="120" y="125" text-anchor="end">need 17</text>
  <text class="d-sub" x="50" y="205" text-anchor="end">need 13</text>
  <text class="d-text d-accent" x="160" y="335" text-anchor="middle">leaf: 2 - 2 = 0</text>
</svg>

The highlighted path \`5 → 4 → 11 → 2\` sums to 22: the amount still needed shrinks from 22 to 17 to 13 to 2, and the leaf \`2\` brings it to exactly 0. Other root-to-leaf paths in A sum to 27 (\`5, 4, 11, 7\`), 26 (\`5, 8, 13\`) and 18 (\`5, 8, 4, 1\`); Example 1 checks all of them.

📌 **Interview term: Top-down recursion (passing state down)** — the parent hands each child extra information (here the remaining sum) as an argument, which is a [preorder](/interview-question/what-are-the-tree-traversal-methods) pattern: work at the node first, then recurse.

📌 **Interview term: Short-circuit OR** — \`left or right\` stops as soon as the left side returns true, so once one valid path is found the rest of the tree is never visited.

### The one-child trap

<svg class="iq-diagram" width="100%" viewBox="0 0 560 230" role="img" aria-label="Tree 1 with only a left child 2. The missing right child is not a leaf, so the path 1 alone does not count for target 1">
  <line class="d-edge" x1="262" y1="65" x2="178" y2="135"/>
  <line class="d-edge-dashed" x1="298" y1="65" x2="382" y2="135"/>
  <circle class="d-box-accent" cx="280" cy="50" r="24"/>
  <text class="d-text" x="280" y="55" text-anchor="middle">1</text>
  <circle class="d-box" cx="160" cy="150" r="24"/>
  <text class="d-text" x="160" y="155" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="400" cy="150" r="24"/>
  <text class="d-text" x="400" y="155" text-anchor="middle">null</text>
  <text class="d-sub" x="160" y="200" text-anchor="middle">the only leaf: sum 3</text>
  <text class="d-sub" x="400" y="200" text-anchor="middle">not a node, not a leaf</text>
</svg>

For the tree \`[1, 2]\` and target 1, the root alone sums to 1. But the root has a child, so it is not a leaf, and the only root-to-leaf path is \`1 → 2\`, which sums to 3. The correct answer is **false**.

The common buggy version uses "empty tree and target is 0" as its success test. At the root it recurses into the missing right child with a remainder of 0 and wrongly returns **true**. Example 2 runs that buggy version and prints \`true\` for \`[1, 2]\` with target 1, and also for tree A with target 9 (\`5 + 4\`, where node \`4\` is not a leaf). The fix is to test for a leaf **at the node**, before recursing.

### Why you cannot stop early

With only positive values you might be tempted to stop once the remaining sum drops below zero. Values can be negative (\`[-2, null, -3]\` with target -5 is true), so a path that goes "over" can come back. Every root-to-leaf path may need to be checked.

## 4. Brute Force First, Then the Clean Solution

**Brute force — collect every path, then sum it.** Walk the tree, copy the current path into a list at every leaf, and afterwards sum each list. It works, but storing and summing a path of length up to h at each of up to n/2 leaves costs O(n · h) time and memory.

**Better — carry the remainder.** Subtract as you go and only ever compare one number at a leaf: O(n) time, O(h) space for the recursion. It is optimal, since in the worst case (no valid path) every node must be visited.

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| Store every path, then sum | O(n · h) | O(n · h) | Wasteful copying |
| Recursive, remaining target | O(n) | O(h) | The standard answer; stops at the first valid path |
| Iterative stack of (node, remaining) | O(n) | O(h) | No recursion depth limit |
| BFS queue of (node, remaining) | O(n) | O(w) | Also fine; level order does not matter here |

If the interviewer then asks for **all** matching paths (Path Sum II), you keep one shared \`path\` list, add a node when you enter it, record a **copy** at each matching leaf, and remove the node when you leave. That add-recurse-remove pattern is called backtracking.

📌 **Interview term: Backtracking** — building a partial answer step by step and undoing the last step when you return, so one shared list can describe every path in turn.

## 5. The Python Code, Line by Line

Recursive:

~~~python
def has_path_sum(node, target):
    if node is None:                         # no path through an empty tree
        return False
    remaining = target - node.val
    if node.left is None and node.right is None:   # a leaf: the path ends here
        return remaining == 0
    return has_path_sum(node.left, remaining) or has_path_sum(node.right, remaining)
~~~

Iterative, with \`(node, remaining)\` tuples on a list used as a stack:

~~~python
def has_path_sum_iterative(root, target):
    stack = [(root, target)] if root else []      # (node, sum still needed)
    while stack:
        node, need = stack.pop()
        need -= node.val
        if node.left is None and node.right is None and need == 0:
            return True
        if node.right:
            stack.append((node.right, need))
        if node.left:
            stack.append((node.left, need))
    return False
~~~

All matching paths, with backtracking:

~~~python
def all_paths(root, target):
    result, path = [], []

    def dfs(node, need):
        if node is None:
            return
        path.append(node.val)                     # choose
        need -= node.val
        if node.left is None and node.right is None and need == 0:
            result.append(list(path))             # copy, because path keeps changing
        dfs(node.left, need)
        dfs(node.right, need)
        path.pop()                                # un-choose (backtrack)

    dfs(root, target)
    return result
~~~

What each Python piece is doing:

- **The leaf test happens at the node**, before recursing. That is what makes \`[1, 2]\` with target 1 correctly \`False\`.
- **\`or\` short-circuits**, so the right subtree is only searched when the left one failed.
- **No overflow.** Python integers have arbitrary precision, so sums of huge values are exact; Example 2's 4000000000 target needs no special type in Python (it does in Java and C++).
- **A nested \`dfs\` function** can read and modify \`path\` and \`result\` from the enclosing function because it only *mutates* them (\`append\`, \`pop\`) and never reassigns the names. Reassigning one would need the \`nonlocal\` keyword.
- **\`list(path)\` makes a copy.** Appending \`path\` itself stores a reference to the one shared list, which backtracking later empties:

~~~python
result, path = [], []
for v in [5, 4, 11, 2]:
    path.append(v)
result.append(path)          # stores a reference, not a copy
path.clear()                 # backtracking empties the same list
print(result)
~~~

~~~text
[[]]
~~~

  \`path[:]\` and \`path.copy()\` are equivalent to \`list(path)\`.
- **\`str(result)\`** prints nested lists as \`[[5, 4, 11, 2], [5, 8, 4, 5]]\`, which matches the other languages' output in Example 2.

📌 **Interview term: Recursion limit** — each level of the tree is one nested call, and Python stops at 1000 by default (\`RecursionError\`, measured on the [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) page). The tuple-stack version has no such limit.

### Dry run: \`hasPathSum(A, 22)\`

| Node | Remaining before | After subtracting | Leaf? | Result |
| :--- | :--- | :--- | :--- | :--- |
| 5 | 22 | 17 | no | try left |
| 4 | 17 | 13 | no | try left |
| 11 | 13 | 2 | no | try left |
| 7 | 2 | -5 | yes | -5 is not 0: **false**, try the right child of 11 |
| 2 | 2 | 0 | yes | 0: **true** |

Because of the short-circuit OR, \`true\` is returned all the way up and the right half of the tree (\`8\` and below) is never visited.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`python3 main.py\` (Python 3.13). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive hasPathSum on ten cases, including the one-child trap and negatives** printed:

~~~text
hasPathSum(A, 22) = true
hasPathSum(A, 26) = true
hasPathSum(A, 18) = true
hasPathSum(A, 27) = true
hasPathSum(A, 9) = false
hasPathSum(A, 5) = false
hasPathSum([], 0) = false
hasPathSum([1, 2], 1) = false
hasPathSum([1], 1) = true
hasPathSum([-2, null, -3], -5) = true
~~~

**Example 2 — Iterative stack, the null-base-case bug, all matching paths, and 64-bit sums** printed:

~~~text
iterative: A 22 -> true, A 9 -> false
buggy: [1, 2] 1 -> true, A 9 -> true
all paths to 22 in B: [[5, 4, 11, 2], [5, 8, 4, 5]]
big values [2000000000, 2000000000] target 4000000000: true
~~~

In Example 1, target 9 on tree A and target 1 on \`[1, 2]\` are both \`false\` because the partial path stops at a node that is not a leaf. In Example 2 the buggy version (success test at a missing child) gets both of those wrong, the backtracking version finds both paths to 22 in tree B (\`[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, 5, 1]\`), and the 64-bit remainder handles a 4000000000 target.

## 7. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive | O(n) | O(h) | Each node visited at most once; one frame per node on the current path |
| Iterative stack | O(n) | O(h) | Each node pushed once; the stack holds a path plus waiting siblings |
| All paths (backtracking) | O(n · h) worst case | O(h) plus the output | Copying a path of length up to h at each matching leaf |

h is about log2 n for a balanced tree and n for a chain. The early exit makes the yes/no version faster in practice when a path exists, but the worst case (no path) is still O(n). See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty tree** — false for every target, including 0 (\`hasPathSum([], 0) = false\`).
- **Single node** — true only if its value equals the target (\`[1]\` with 1 is true).
- **One-child nodes** — not leaves; \`[1, 2]\` with target 1 is false, and A with target 9 is false.
- **Negative values** — \`[-2, null, -3]\` with -5 is true; never prune when the remainder goes negative.
- **Large values** — two values of 2000000000 sum past the 32-bit limit; Example 2 uses a 64-bit sum and gets \`true\` for target 4000000000.
- **Zero values** — a path through zeros is still a valid path; the leaf test, not the value, decides where a path ends.

## Common Pitfalls

- **\`if node is None: return target == 0\`.** Treats a missing child as the end of a path; Example 2 shows it returning \`True\` for \`[1, 2]\` with target 1. Check for a leaf at the node instead.
- **Returning \`False\` early when the remainder goes negative.** Wrong whenever values can be negative.
- **\`result.append(path)\` without a copy.** Every stored path is the same list, emptied by backtracking (\`[[]]\` above).
- **Forgetting \`path.pop()\`** in the all-paths version: the path keeps growing and later paths contain nodes from other branches.
- **Treating an empty tree with target 0 as \`True\`.** There is no path at all; the answer is \`False\`.
- **Recursing on a very deep tree.** The default limit of 1000; use the tuple stack.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Carry the remaining target down the tree: subtract each node value, and when I reach a leaf, check whether exactly 0 is left.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The leaf rule:</strong> <span style="color:#f0e2c8;">A leaf has no children. I test for it at the node, so a one-child node like the root of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2]</code> never counts as the end of a path.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The code:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code>; compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remaining</code>; at a leaf return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remaining == 0</code>; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has_path_sum(left, remaining) or has_path_sum(right, remaining)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time and O(h) stack; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">or</code> short-circuits once a path is found; negative values mean I cannot prune early.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python details:</strong> <span style="color:#f0e2c8;">Python ints do not overflow; for all paths I backtrack with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code> and store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(path)</code> copies; for deep trees I use a stack of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(node, remaining)</code> tuples because of the recursion limit.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Return all root-to-leaf paths with that sum.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Backtracking: append the node to a shared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code>, subtract, record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(path)</code> at a matching leaf, recurse left and right, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code>. Example 2 prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[5, 4, 11, 2], [5, 8, 4, 5]]</code> for tree B.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the path can start and end anywhere, as long as it goes downward?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is Path Sum III. Keep a running prefix sum from the root and a dict counting earlier prefix sums; at each node add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count[prefix - target]</code>. It is O(n) instead of starting a search at every node.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you stop when the remaining sum becomes negative?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if every value is guaranteed non-negative. The standard problem allows negatives, as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-2, None, -3]</code> with target -5 shows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not pass the running sum instead of the remainder?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either works: pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sum_so_far + node.val</code> and compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target</code> at a leaf. The remainder version needs one argument fewer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is BFS any good here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, a queue of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(node, remaining)</code> pairs works too; level order does not matter for this question. DFS uses O(h) memory, BFS O(w).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Root-to-leaf path** | Nodes from the root down, one child at a time, ending at a leaf |
| **Leaf** | A node with no children; a one-child node is not a leaf |
| **Top-down recursion (passing state down)** | The parent passes information, here the remaining sum, to its children |
| **Short-circuit OR** | \`a or b\` / \`a || b\` skips \`b\` when \`a\` is already true |
| **Backtracking** | Add a step, recurse, then undo the step, so one shared list describes each path in turn |
| **Recursion limit** | Python cap of 1000 nested calls by default; exceeding it raises \`RecursionError\` |

---
**Conclusion:** Root-to-leaf path sum is top-down recursion: subtract each value from the target on the way down and, at a node with no children, check for exactly zero. It is O(n) time and O(h) space, stops at the first match, and must not prune on negative remainders. In Python, integers cannot overflow, the all-paths follow-up needs \`list(path)\` copies with \`append\`/\`pop\` backtracking, and a tuple stack sidesteps the recursion limit.`,
        examples: [
          {
            label: "Recursive hasPathSum on ten cases, including the one-child trap and negatives",
            code: `from collections import deque


class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def build(values):
    """Build a tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root


def has_path_sum(node, target):
    if node is None:                         # no path through an empty tree
        return False
    remaining = target - node.val
    if node.left is None and node.right is None:   # a leaf: the path ends here
        return remaining == 0
    return has_path_sum(node.left, remaining) or has_path_sum(node.right, remaining)


A = build([5, 4, 8, 11, None, 13, 4, 7, 2, None, None, None, 1])


def show(name, root, target):
    return "hasPathSum(" + name + ", " + str(target) + ") = " + str(has_path_sum(root, target)).lower()


print(show("A", A, 22))  # hasPathSum(A, 22) = true
print(show("A", A, 26))  # hasPathSum(A, 26) = true
print(show("A", A, 18))  # hasPathSum(A, 18) = true
print(show("A", A, 27))  # hasPathSum(A, 27) = true
print(show("A", A, 9))  # hasPathSum(A, 9) = false
print(show("A", A, 5))  # hasPathSum(A, 5) = false
print(show("[]", None, 0))  # hasPathSum([], 0) = false
print(show("[1, 2]", build([1, 2]), 1))  # hasPathSum([1, 2], 1) = false
print(show("[1]", build([1]), 1))  # hasPathSum([1], 1) = true
print(show("[-2, null, -3]", build([-2, None, -3]), -5))  # hasPathSum([-2, null, -3], -5) = true
`,
          },
          {
            label: "Iterative stack, the null-base-case bug, all matching paths, and 64-bit sums",
            code: `from collections import deque


class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def build(values):
    """Build a tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root


def has_path_sum_iterative(root, target):
    stack = [(root, target)] if root else []      # (node, sum still needed)
    while stack:
        node, need = stack.pop()
        need -= node.val
        if node.left is None and node.right is None and need == 0:
            return True
        if node.right:
            stack.append((node.right, need))
        if node.left:
            stack.append((node.left, need))
    return False


def has_path_sum_buggy(node, target):            # WRONG: treats a missing child as a leaf
    if node is None:
        return target == 0
    return (has_path_sum_buggy(node.left, target - node.val)
            or has_path_sum_buggy(node.right, target - node.val))


def all_paths(root, target):
    result, path = [], []

    def dfs(node, need):
        if node is None:
            return
        path.append(node.val)                     # choose
        need -= node.val
        if node.left is None and node.right is None and need == 0:
            result.append(list(path))             # copy, because path keeps changing
        dfs(node.left, need)
        dfs(node.right, need)
        path.pop()                                # un-choose (backtrack)

    dfs(root, target)
    return result


def b(x):
    return str(x).lower()


A = build([5, 4, 8, 11, None, 13, 4, 7, 2, None, None, None, 1])
B = build([5, 4, 8, 11, None, 13, 4, 7, 2, None, None, 5, 1])
print("iterative: A 22 -> " + b(has_path_sum_iterative(A, 22)) + ", A 9 -> " + b(has_path_sum_iterative(A, 9)))  # iterative: A 22 -> true, A 9 -> false
print("buggy: [1, 2] 1 -> " + b(has_path_sum_buggy(build([1, 2]), 1)) + ", A 9 -> " + b(has_path_sum_buggy(A, 9)))  # buggy: [1, 2] 1 -> true, A 9 -> true
print("all paths to 22 in B: " + str(all_paths(B, 22)))  # all paths to 22 in B: [[5, 4, 11, 2], [5, 8, 4, 5]]
print("big values [2000000000, 2000000000] target 4000000000: " + b(has_path_sum_iterative(build([2000000000, 2000000000]), 4000000000)))  # big values [2000000000, 2000000000] target 4000000000: true
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Write a JavaScript function hasPathSum(root, targetSum) that returns true if some root-to-leaf path adds up to exactly targetSum. Then extend it to return all such paths."

**What a strong answer should cover:**
- Carry the remaining target down; at a leaf check that the remainder is 0.
- A leaf has no children; \`[1, 2]\` with target 1 is false because the root is not a leaf.
- O(n) time, O(h) space; \`||\` short-circuits; negative values mean no pruning.
- Follow-up: all paths with backtracking and a copy (\`[...path]\`) at each match.
- JavaScript specifics: numbers are doubles, exact for integers up to \`Number.MAX_SAFE_INTEGER\` (2^53 - 1), so ordinary sums are safe but very large ones are not; \`result.push(path)\` stores a reference; deep recursion throws \`RangeError\`.

**Clarifying questions expected:**
- "Must the path end at a leaf and start at the root?"
- "Can values be negative?"

**Code / implementation expected:** Yes — a recursive JavaScript function; optionally the iterative stack and the all-paths version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a binary tree is.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this JavaScript version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

You are on a hike with a fixed amount of energy, say 22 snack bars' worth. The trail starts at one trailhead and keeps forking; every trail segment costs a certain number of bars. The trails end at viewpoints with no further forks. Question: is there a route from the trailhead to some viewpoint that uses **exactly** all 22 bars?

You do not need to add up every route from scratch. Walk down a fork and keep track of how many bars you still have. At each point, subtract the cost of where you are. When you arrive at a viewpoint (a dead end), check whether you have exactly zero left. If not, walk back and try the next fork.

That is the root-to-leaf path sum problem. It is a classic because it teaches the **top-down** style of tree recursion: instead of returning answers upward (as [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) does), you pass information **down** — here, the amount still needed. It also contains one of the most common tree bugs: treating a missing child as if it were the end of a path.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must the path end at a **leaf**, or can it stop at any node? | The standard version (LeetCode 112) requires a leaf. Stopping anywhere is a different, easier check. |
| Must it start at the root? | Yes here. "Any downward path" is Path Sum III, which needs prefix sums. |
| Can values or the target be negative? | Yes in the standard problem, so you **cannot** stop early when the running sum passes the target. |
| What should an empty tree return? | \`false\` — there is no path at all, even for target 0. |
| Do you want a yes/no answer, or the paths themselves? | Returning all paths (Path Sum II) needs backtracking and copies. |
| How large can the values be? | Large values can overflow a 32-bit integer when added, which matters in Java and C++. |

## 3. The Core Idea

📌 **Interview term: Root-to-leaf path** — a sequence of nodes that starts at the root, moves to a child at each step, and ends at a **leaf**.

📌 **Interview term: Leaf** — a node with **no** children: both \`left\` and \`right\` are missing. A node with one child is *not* a leaf.

The trick is to carry the **remaining target** down the tree:

1. Empty tree: return false (there is no path).
2. Subtract the current node's value from the target.
3. If the node is a leaf, the answer is "is the remainder exactly 0?".
4. Otherwise, the answer is "does the **left** subtree have a path for the remainder, **or** does the **right** one?".

Here is tree A, \`[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1]\`, looking for 22:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 350" role="img" aria-label="Tree A with the path 5, 4, 11, 2 highlighted. The needed sum goes 22, then 17, then 13, then 2, and the leaf 2 brings it to 0">
  <line class="d-edge-accent" x1="303" y1="60" x2="197" y2="120"/>
  <line class="d-edge" x1="337" y1="60" x2="443" y2="120"/>
  <line class="d-edge-accent" x1="167" y1="145" x2="123" y2="195"/>
  <line class="d-edge" x1="447" y1="145" x2="403" y2="195"/>
  <line class="d-edge" x1="473" y1="145" x2="517" y2="195"/>
  <line class="d-edge" x1="99" y1="227" x2="71" y2="273"/>
  <line class="d-edge-accent" x1="121" y1="227" x2="149" y2="273"/>
  <line class="d-edge" x1="541" y1="227" x2="569" y2="273"/>
  <circle class="d-box-accent" cx="320" cy="50" r="20"/>
  <text class="d-text" x="320" y="55" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="180" cy="130" r="20"/>
  <text class="d-text" x="180" y="135" text-anchor="middle">4</text>
  <circle class="d-box" cx="460" cy="130" r="20"/>
  <text class="d-text" x="460" y="135" text-anchor="middle">8</text>
  <circle class="d-box-accent" cx="110" cy="210" r="20"/>
  <text class="d-text" x="110" y="215" text-anchor="middle">11</text>
  <circle class="d-box" cx="390" cy="210" r="20"/>
  <text class="d-text" x="390" y="215" text-anchor="middle">13</text>
  <circle class="d-box" cx="530" cy="210" r="20"/>
  <text class="d-text" x="530" y="215" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="60" cy="290" r="20"/>
  <text class="d-text" x="60" y="295" text-anchor="middle">7</text>
  <circle class="d-box-accent" cx="160" cy="290" r="20"/>
  <text class="d-text" x="160" y="295" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="580" cy="290" r="20"/>
  <text class="d-text" x="580" y="295" text-anchor="middle">1</text>
  <text class="d-sub" x="380" y="55" text-anchor="start">need 22</text>
  <text class="d-sub" x="120" y="125" text-anchor="end">need 17</text>
  <text class="d-sub" x="50" y="205" text-anchor="end">need 13</text>
  <text class="d-text d-accent" x="160" y="335" text-anchor="middle">leaf: 2 - 2 = 0</text>
</svg>

The highlighted path \`5 → 4 → 11 → 2\` sums to 22: the amount still needed shrinks from 22 to 17 to 13 to 2, and the leaf \`2\` brings it to exactly 0. Other root-to-leaf paths in A sum to 27 (\`5, 4, 11, 7\`), 26 (\`5, 8, 13\`) and 18 (\`5, 8, 4, 1\`); Example 1 checks all of them.

📌 **Interview term: Top-down recursion (passing state down)** — the parent hands each child extra information (here the remaining sum) as an argument, which is a [preorder](/interview-question/what-are-the-tree-traversal-methods) pattern: work at the node first, then recurse.

📌 **Interview term: Short-circuit OR** — \`left or right\` stops as soon as the left side returns true, so once one valid path is found the rest of the tree is never visited.

### The one-child trap

<svg class="iq-diagram" width="100%" viewBox="0 0 560 230" role="img" aria-label="Tree 1 with only a left child 2. The missing right child is not a leaf, so the path 1 alone does not count for target 1">
  <line class="d-edge" x1="262" y1="65" x2="178" y2="135"/>
  <line class="d-edge-dashed" x1="298" y1="65" x2="382" y2="135"/>
  <circle class="d-box-accent" cx="280" cy="50" r="24"/>
  <text class="d-text" x="280" y="55" text-anchor="middle">1</text>
  <circle class="d-box" cx="160" cy="150" r="24"/>
  <text class="d-text" x="160" y="155" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="400" cy="150" r="24"/>
  <text class="d-text" x="400" y="155" text-anchor="middle">null</text>
  <text class="d-sub" x="160" y="200" text-anchor="middle">the only leaf: sum 3</text>
  <text class="d-sub" x="400" y="200" text-anchor="middle">not a node, not a leaf</text>
</svg>

For the tree \`[1, 2]\` and target 1, the root alone sums to 1. But the root has a child, so it is not a leaf, and the only root-to-leaf path is \`1 → 2\`, which sums to 3. The correct answer is **false**.

The common buggy version uses "empty tree and target is 0" as its success test. At the root it recurses into the missing right child with a remainder of 0 and wrongly returns **true**. Example 2 runs that buggy version and prints \`true\` for \`[1, 2]\` with target 1, and also for tree A with target 9 (\`5 + 4\`, where node \`4\` is not a leaf). The fix is to test for a leaf **at the node**, before recursing.

### Why you cannot stop early

With only positive values you might be tempted to stop once the remaining sum drops below zero. Values can be negative (\`[-2, null, -3]\` with target -5 is true), so a path that goes "over" can come back. Every root-to-leaf path may need to be checked.

## 4. Brute Force First, Then the Clean Solution

**Brute force — collect every path, then sum it.** Walk the tree, copy the current path into a list at every leaf, and afterwards sum each list. It works, but storing and summing a path of length up to h at each of up to n/2 leaves costs O(n · h) time and memory.

**Better — carry the remainder.** Subtract as you go and only ever compare one number at a leaf: O(n) time, O(h) space for the recursion. It is optimal, since in the worst case (no valid path) every node must be visited.

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| Store every path, then sum | O(n · h) | O(n · h) | Wasteful copying |
| Recursive, remaining target | O(n) | O(h) | The standard answer; stops at the first valid path |
| Iterative stack of (node, remaining) | O(n) | O(h) | No recursion depth limit |
| BFS queue of (node, remaining) | O(n) | O(w) | Also fine; level order does not matter here |

If the interviewer then asks for **all** matching paths (Path Sum II), you keep one shared \`path\` list, add a node when you enter it, record a **copy** at each matching leaf, and remove the node when you leave. That add-recurse-remove pattern is called backtracking.

📌 **Interview term: Backtracking** — building a partial answer step by step and undoing the last step when you return, so one shared list can describe every path in turn.

## 5. The JavaScript Code, Line by Line

Recursive:

~~~javascript
function hasPathSum(node, target) {
  if (node === null) return false;                       // no path through an empty tree
  const remaining = target - node.val;
  if (node.left === null && node.right === null) return remaining === 0; // a leaf
  return hasPathSum(node.left, remaining) || hasPathSum(node.right, remaining);
}
~~~

Iterative, with \`[node, remaining]\` pairs:

~~~javascript
function hasPathSumIterative(root, target) {
  const stack = root ? [[root, target]] : [];   // [node, sum still needed]
  while (stack.length > 0) {
    const [node, needBefore] = stack.pop();
    const need = needBefore - node.val;
    if (node.left === null && node.right === null && need === 0) return true;
    if (node.right) stack.push([node.right, need]);
    if (node.left) stack.push([node.left, need]);
  }
  return false;
}
~~~

All matching paths, with backtracking:

~~~javascript
function allPaths(root, target) {
  const result = [];
  const path = [];
  function dfs(node, need) {
    if (node === null) return;
    path.push(node.val);                        // choose
    need -= node.val;
    if (node.left === null && node.right === null && need === 0) {
      result.push([...path]);                   // copy, because path keeps changing
    }
    dfs(node.left, need);
    dfs(node.right, need);
    path.pop();                                 // un-choose (backtrack)
  }
  dfs(root, target);
  return result;
}
~~~

What each JavaScript piece is doing:

- **The leaf test at the node** makes \`[1, 2]\` with target 1 correctly \`false\`.
- **\`||\` short-circuits**, so the right subtree is only searched when the left failed.
- **\`need -= node.val\` inside \`dfs\`** changes only that call's own parameter; parameters are local copies of numbers, so the caller's \`need\` is untouched — which is exactly what backtracking needs for the number. The shared \`path\` array, on the other hand, must be undone with \`pop()\`.
- **\`[...path]\` copies the array.** Pushing \`path\` itself stores a reference to the one shared array:

~~~javascript
const result = [];
const path = [5, 4, 11, 2];
result.push(path);           // stores a reference, not a copy
path.length = 0;             // backtracking empties the same array
console.log(JSON.stringify(result));
~~~

~~~text
[[]]
~~~

- **Number precision.** JavaScript numbers are 64-bit floating point. Integers are exact up to \`Number.MAX_SAFE_INTEGER\`; when run in Node.js 22, \`Number.MAX_SAFE_INTEGER\` printed \`9007199254740991\`, \`2 ** 53 + 1 === 2 ** 53\` printed \`true\`, and \`2000000000 + 2000000000\` printed \`4000000000\`. So Example 2's 4000000000 target is exact, but sums near 2^53 would silently round; use \`BigInt\` if values can be that large.

📌 **Interview term: Stack overflow (\`RangeError\`)** — one nested call per tree level; a very deep tree throws \`RangeError: Maximum call stack size exceeded\` (measured on the [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) page). The pair-stack version avoids it.

### Dry run: \`hasPathSum(A, 22)\`

| Node | Remaining before | After subtracting | Leaf? | Result |
| :--- | :--- | :--- | :--- | :--- |
| 5 | 22 | 17 | no | try left |
| 4 | 17 | 13 | no | try left |
| 11 | 13 | 2 | no | try left |
| 7 | 2 | -5 | yes | -5 is not 0: **false**, try the right child of 11 |
| 2 | 2 | 0 | yes | 0: **true** |

Because of the short-circuit OR, \`true\` is returned all the way up and the right half of the tree (\`8\` and below) is never visited.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`node main.js\` (Node.js 22). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive hasPathSum on ten cases, including the one-child trap and negatives** printed:

~~~text
hasPathSum(A, 22) = true
hasPathSum(A, 26) = true
hasPathSum(A, 18) = true
hasPathSum(A, 27) = true
hasPathSum(A, 9) = false
hasPathSum(A, 5) = false
hasPathSum([], 0) = false
hasPathSum([1, 2], 1) = false
hasPathSum([1], 1) = true
hasPathSum([-2, null, -3], -5) = true
~~~

**Example 2 — Iterative stack, the null-base-case bug, all matching paths, and 64-bit sums** printed:

~~~text
iterative: A 22 -> true, A 9 -> false
buggy: [1, 2] 1 -> true, A 9 -> true
all paths to 22 in B: [[5, 4, 11, 2], [5, 8, 4, 5]]
big values [2000000000, 2000000000] target 4000000000: true
~~~

In Example 1, target 9 on tree A and target 1 on \`[1, 2]\` are both \`false\` because the partial path stops at a node that is not a leaf. In Example 2 the buggy version (success test at a missing child) gets both of those wrong, the backtracking version finds both paths to 22 in tree B (\`[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, 5, 1]\`), and the 64-bit remainder handles a 4000000000 target.

## 7. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive | O(n) | O(h) | Each node visited at most once; one frame per node on the current path |
| Iterative stack | O(n) | O(h) | Each node pushed once; the stack holds a path plus waiting siblings |
| All paths (backtracking) | O(n · h) worst case | O(h) plus the output | Copying a path of length up to h at each matching leaf |

h is about log2 n for a balanced tree and n for a chain. The early exit makes the yes/no version faster in practice when a path exists, but the worst case (no path) is still O(n). See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty tree** — false for every target, including 0 (\`hasPathSum([], 0) = false\`).
- **Single node** — true only if its value equals the target (\`[1]\` with 1 is true).
- **One-child nodes** — not leaves; \`[1, 2]\` with target 1 is false, and A with target 9 is false.
- **Negative values** — \`[-2, null, -3]\` with -5 is true; never prune when the remainder goes negative.
- **Large values** — two values of 2000000000 sum past the 32-bit limit; Example 2 uses a 64-bit sum and gets \`true\` for target 4000000000.
- **Zero values** — a path through zeros is still a valid path; the leaf test, not the value, decides where a path ends.

## Common Pitfalls

- **\`if (node === null) return target === 0;\`** Treats a missing child as a path end; Example 2 prints \`true\` for \`[1, 2]\` with target 1.
- **Pruning when the remainder goes negative.** Wrong with negative values.
- **\`result.push(path)\` without a copy.** All stored paths are the same emptied array (\`[[]]\` above).
- **Forgetting \`path.pop()\`.** Later paths contain nodes from earlier branches.
- **Sums beyond 2^53.** They round silently; use \`BigInt\` for huge values.
- **\`=== null\` with \`undefined\` children** from JSON input; use \`!node.left && !node.right\` for the leaf test in that case.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Carry the remaining target down: subtract each node value, and at a leaf check for exactly 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The leaf rule:</strong> <span style="color:#f0e2c8;">A leaf has no children; I test for it at the node so the root of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2]</code> never counts as a path end.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The code:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>; compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remaining</code>; at a leaf return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remaining === 0</code>; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hasPathSum(left, remaining) || hasPathSum(right, remaining)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time and O(h) stack; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">||</code> stops at the first path; negatives mean no early pruning.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript details:</strong> <span style="color:#f0e2c8;">Numbers are exact up to 2^53 - 1, so normal sums are fine; for all paths I push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...path]</code> copies and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> when backtracking; deep trees use an explicit stack to avoid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Return all root-to-leaf paths with that sum.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Backtracking with a shared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code>: push, subtract, record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...path]</code> at a matching leaf, recurse, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>. Example 2 prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[5, 4, 11, 2], [5, 8, 4, 5]]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Any downward path, not just root to leaf?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Path Sum III: track the running prefix sum and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> of how many times each earlier prefix occurred; at each node add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map.get(prefix - target) ?? 0</code>. O(n) overall.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you prune when the remainder is negative?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if all values are non-negative; the standard problem allows negatives.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">need -= node.val</code> not break backtracking?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">need</code> is a number parameter, so each call has its own copy; only the shared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> array needs explicit undoing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if values can exceed 2^53?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store them as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> and compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0n</code>; plain numbers would round and could report a wrong match.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Root-to-leaf path** | Nodes from the root down, one child at a time, ending at a leaf |
| **Leaf** | A node with no children; a one-child node is not a leaf |
| **Top-down recursion (passing state down)** | The parent passes information, here the remaining sum, to its children |
| **Short-circuit OR** | \`a or b\` / \`a || b\` skips \`b\` when \`a\` is already true |
| **Backtracking** | Add a step, recurse, then undo the step, so one shared list describes each path in turn |
| **\`Number.MAX_SAFE_INTEGER\`** | 2^53 - 1, the largest integer JavaScript numbers represent exactly |

---
**Conclusion:** Root-to-leaf path sum is top-down recursion: subtract each value from the target on the way down and, at a node with no children, check for exactly zero. It is O(n) time and O(h) space, stops at the first match, and must not prune on negative remainders. In JavaScript, sums are exact up to 2^53 - 1, the all-paths follow-up needs \`[...path]\` copies with \`push\`/\`pop\` backtracking, and an explicit stack avoids \`RangeError\` on deep trees.`,
        examples: [
          {
            label: "Recursive hasPathSum on ten cases, including the one-child trap and negatives",
            code: `class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// Build a tree from a level-order array; null marks a missing child.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new TreeNode(values[0]);
  const queue = [root];
  let head = 0; // index of the next node to give children (avoids shift())
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) { node.left = new TreeNode(values[i]); queue.push(node.left); }
    i++;
    if (i < values.length && values[i] !== null) { node.right = new TreeNode(values[i]); queue.push(node.right); }
    i++;
  }
  return root;
}

function hasPathSum(node, target) {
  if (node === null) return false;                       // no path through an empty tree
  const remaining = target - node.val;
  if (node.left === null && node.right === null) return remaining === 0; // a leaf
  return hasPathSum(node.left, remaining) || hasPathSum(node.right, remaining);
}

const A = build([5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1]);

function show(name, root, target) {
  return 'hasPathSum(' + name + ', ' + target + ') = ' + hasPathSum(root, target);
}

console.log(show('A', A, 22)); // hasPathSum(A, 22) = true
console.log(show('A', A, 26)); // hasPathSum(A, 26) = true
console.log(show('A', A, 18)); // hasPathSum(A, 18) = true
console.log(show('A', A, 27)); // hasPathSum(A, 27) = true
console.log(show('A', A, 9)); // hasPathSum(A, 9) = false
console.log(show('A', A, 5)); // hasPathSum(A, 5) = false
console.log(show('[]', null, 0)); // hasPathSum([], 0) = false
console.log(show('[1, 2]', build([1, 2]), 1)); // hasPathSum([1, 2], 1) = false
console.log(show('[1]', build([1]), 1)); // hasPathSum([1], 1) = true
console.log(show('[-2, null, -3]', build([-2, null, -3]), -5)); // hasPathSum([-2, null, -3], -5) = true
`,
          },
          {
            label: "Iterative stack, the null-base-case bug, all matching paths, and 64-bit sums",
            code: `class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// Build a tree from a level-order array; null marks a missing child.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new TreeNode(values[0]);
  const queue = [root];
  let head = 0; // index of the next node to give children (avoids shift())
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) { node.left = new TreeNode(values[i]); queue.push(node.left); }
    i++;
    if (i < values.length && values[i] !== null) { node.right = new TreeNode(values[i]); queue.push(node.right); }
    i++;
  }
  return root;
}

function hasPathSumIterative(root, target) {
  const stack = root ? [[root, target]] : [];   // [node, sum still needed]
  while (stack.length > 0) {
    const [node, needBefore] = stack.pop();
    const need = needBefore - node.val;
    if (node.left === null && node.right === null && need === 0) return true;
    if (node.right) stack.push([node.right, need]);
    if (node.left) stack.push([node.left, need]);
  }
  return false;
}

function hasPathSumBuggy(node, target) {        // WRONG: treats a missing child as a leaf
  if (node === null) return target === 0;
  return hasPathSumBuggy(node.left, target - node.val) || hasPathSumBuggy(node.right, target - node.val);
}

function allPaths(root, target) {
  const result = [];
  const path = [];
  function dfs(node, need) {
    if (node === null) return;
    path.push(node.val);                        // choose
    need -= node.val;
    if (node.left === null && node.right === null && need === 0) {
      result.push([...path]);                   // copy, because path keeps changing
    }
    dfs(node.left, need);
    dfs(node.right, need);
    path.pop();                                 // un-choose (backtrack)
  }
  dfs(root, target);
  return result;
}

function fmt(paths) {
  return '[' + paths.map((p) => '[' + p.join(', ') + ']').join(', ') + ']';
}

const A = build([5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1]);
const B = build([5, 4, 8, 11, null, 13, 4, 7, 2, null, null, 5, 1]);
console.log('iterative: A 22 -> ' + hasPathSumIterative(A, 22) + ', A 9 -> ' + hasPathSumIterative(A, 9)); // iterative: A 22 -> true, A 9 -> false
console.log('buggy: [1, 2] 1 -> ' + hasPathSumBuggy(build([1, 2]), 1) + ', A 9 -> ' + hasPathSumBuggy(A, 9)); // buggy: [1, 2] 1 -> true, A 9 -> true
console.log('all paths to 22 in B: ' + fmt(allPaths(B, 22))); // all paths to 22 in B: [[5, 4, 11, 2], [5, 8, 4, 5]]
console.log('big values [2000000000, 2000000000] target 4000000000: ' + hasPathSumIterative(build([2000000000, 2000000000]), 4000000000)); // big values [2000000000, 2000000000] target 4000000000: true
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Write a Java method boolean hasPathSum(TreeNode root, int targetSum) that returns true if some root-to-leaf path adds up to exactly targetSum. Then return all such paths as a list of lists."

**What a strong answer should cover:**
- Carry the remaining target down; at a leaf check that the remainder is 0.
- A leaf has no children; \`[1, 2]\` with target 1 is false because the root is not a leaf.
- O(n) time, O(h) space; \`||\` short-circuits; negative values mean no pruning.
- Follow-up: all paths with backtracking and \`new ArrayList<>(path)\` copies.
- Java specifics: \`int\` arithmetic silently wraps on overflow, so use \`long\` for the running sum when values are large (or \`Math.addExact\` to detect it); \`path.remove(path.size() - 1)\` removes by index, while \`remove(Integer)\` removes by value; deep recursion throws \`StackOverflowError\`.

**Clarifying questions expected:**
- "Must the path end at a leaf and start at the root?"
- "How large can the values be? Could the sum overflow an int?"

**Code / implementation expected:** Yes — a recursive Java method; optionally an iterative version with \`long\` sums and the all-paths version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a binary tree is.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Java version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

You are on a hike with a fixed amount of energy, say 22 snack bars' worth. The trail starts at one trailhead and keeps forking; every trail segment costs a certain number of bars. The trails end at viewpoints with no further forks. Question: is there a route from the trailhead to some viewpoint that uses **exactly** all 22 bars?

You do not need to add up every route from scratch. Walk down a fork and keep track of how many bars you still have. At each point, subtract the cost of where you are. When you arrive at a viewpoint (a dead end), check whether you have exactly zero left. If not, walk back and try the next fork.

That is the root-to-leaf path sum problem. It is a classic because it teaches the **top-down** style of tree recursion: instead of returning answers upward (as [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) does), you pass information **down** — here, the amount still needed. It also contains one of the most common tree bugs: treating a missing child as if it were the end of a path.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must the path end at a **leaf**, or can it stop at any node? | The standard version (LeetCode 112) requires a leaf. Stopping anywhere is a different, easier check. |
| Must it start at the root? | Yes here. "Any downward path" is Path Sum III, which needs prefix sums. |
| Can values or the target be negative? | Yes in the standard problem, so you **cannot** stop early when the running sum passes the target. |
| What should an empty tree return? | \`false\` — there is no path at all, even for target 0. |
| Do you want a yes/no answer, or the paths themselves? | Returning all paths (Path Sum II) needs backtracking and copies. |
| How large can the values be? | Large values can overflow a 32-bit integer when added, which matters in Java and C++. |

## 3. The Core Idea

📌 **Interview term: Root-to-leaf path** — a sequence of nodes that starts at the root, moves to a child at each step, and ends at a **leaf**.

📌 **Interview term: Leaf** — a node with **no** children: both \`left\` and \`right\` are missing. A node with one child is *not* a leaf.

The trick is to carry the **remaining target** down the tree:

1. Empty tree: return false (there is no path).
2. Subtract the current node's value from the target.
3. If the node is a leaf, the answer is "is the remainder exactly 0?".
4. Otherwise, the answer is "does the **left** subtree have a path for the remainder, **or** does the **right** one?".

Here is tree A, \`[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1]\`, looking for 22:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 350" role="img" aria-label="Tree A with the path 5, 4, 11, 2 highlighted. The needed sum goes 22, then 17, then 13, then 2, and the leaf 2 brings it to 0">
  <line class="d-edge-accent" x1="303" y1="60" x2="197" y2="120"/>
  <line class="d-edge" x1="337" y1="60" x2="443" y2="120"/>
  <line class="d-edge-accent" x1="167" y1="145" x2="123" y2="195"/>
  <line class="d-edge" x1="447" y1="145" x2="403" y2="195"/>
  <line class="d-edge" x1="473" y1="145" x2="517" y2="195"/>
  <line class="d-edge" x1="99" y1="227" x2="71" y2="273"/>
  <line class="d-edge-accent" x1="121" y1="227" x2="149" y2="273"/>
  <line class="d-edge" x1="541" y1="227" x2="569" y2="273"/>
  <circle class="d-box-accent" cx="320" cy="50" r="20"/>
  <text class="d-text" x="320" y="55" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="180" cy="130" r="20"/>
  <text class="d-text" x="180" y="135" text-anchor="middle">4</text>
  <circle class="d-box" cx="460" cy="130" r="20"/>
  <text class="d-text" x="460" y="135" text-anchor="middle">8</text>
  <circle class="d-box-accent" cx="110" cy="210" r="20"/>
  <text class="d-text" x="110" y="215" text-anchor="middle">11</text>
  <circle class="d-box" cx="390" cy="210" r="20"/>
  <text class="d-text" x="390" y="215" text-anchor="middle">13</text>
  <circle class="d-box" cx="530" cy="210" r="20"/>
  <text class="d-text" x="530" y="215" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="60" cy="290" r="20"/>
  <text class="d-text" x="60" y="295" text-anchor="middle">7</text>
  <circle class="d-box-accent" cx="160" cy="290" r="20"/>
  <text class="d-text" x="160" y="295" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="580" cy="290" r="20"/>
  <text class="d-text" x="580" y="295" text-anchor="middle">1</text>
  <text class="d-sub" x="380" y="55" text-anchor="start">need 22</text>
  <text class="d-sub" x="120" y="125" text-anchor="end">need 17</text>
  <text class="d-sub" x="50" y="205" text-anchor="end">need 13</text>
  <text class="d-text d-accent" x="160" y="335" text-anchor="middle">leaf: 2 - 2 = 0</text>
</svg>

The highlighted path \`5 → 4 → 11 → 2\` sums to 22: the amount still needed shrinks from 22 to 17 to 13 to 2, and the leaf \`2\` brings it to exactly 0. Other root-to-leaf paths in A sum to 27 (\`5, 4, 11, 7\`), 26 (\`5, 8, 13\`) and 18 (\`5, 8, 4, 1\`); Example 1 checks all of them.

📌 **Interview term: Top-down recursion (passing state down)** — the parent hands each child extra information (here the remaining sum) as an argument, which is a [preorder](/interview-question/what-are-the-tree-traversal-methods) pattern: work at the node first, then recurse.

📌 **Interview term: Short-circuit OR** — \`left or right\` stops as soon as the left side returns true, so once one valid path is found the rest of the tree is never visited.

### The one-child trap

<svg class="iq-diagram" width="100%" viewBox="0 0 560 230" role="img" aria-label="Tree 1 with only a left child 2. The missing right child is not a leaf, so the path 1 alone does not count for target 1">
  <line class="d-edge" x1="262" y1="65" x2="178" y2="135"/>
  <line class="d-edge-dashed" x1="298" y1="65" x2="382" y2="135"/>
  <circle class="d-box-accent" cx="280" cy="50" r="24"/>
  <text class="d-text" x="280" y="55" text-anchor="middle">1</text>
  <circle class="d-box" cx="160" cy="150" r="24"/>
  <text class="d-text" x="160" y="155" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="400" cy="150" r="24"/>
  <text class="d-text" x="400" y="155" text-anchor="middle">null</text>
  <text class="d-sub" x="160" y="200" text-anchor="middle">the only leaf: sum 3</text>
  <text class="d-sub" x="400" y="200" text-anchor="middle">not a node, not a leaf</text>
</svg>

For the tree \`[1, 2]\` and target 1, the root alone sums to 1. But the root has a child, so it is not a leaf, and the only root-to-leaf path is \`1 → 2\`, which sums to 3. The correct answer is **false**.

The common buggy version uses "empty tree and target is 0" as its success test. At the root it recurses into the missing right child with a remainder of 0 and wrongly returns **true**. Example 2 runs that buggy version and prints \`true\` for \`[1, 2]\` with target 1, and also for tree A with target 9 (\`5 + 4\`, where node \`4\` is not a leaf). The fix is to test for a leaf **at the node**, before recursing.

### Why you cannot stop early

With only positive values you might be tempted to stop once the remaining sum drops below zero. Values can be negative (\`[-2, null, -3]\` with target -5 is true), so a path that goes "over" can come back. Every root-to-leaf path may need to be checked.

## 4. Brute Force First, Then the Clean Solution

**Brute force — collect every path, then sum it.** Walk the tree, copy the current path into a list at every leaf, and afterwards sum each list. It works, but storing and summing a path of length up to h at each of up to n/2 leaves costs O(n · h) time and memory.

**Better — carry the remainder.** Subtract as you go and only ever compare one number at a leaf: O(n) time, O(h) space for the recursion. It is optimal, since in the worst case (no valid path) every node must be visited.

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| Store every path, then sum | O(n · h) | O(n · h) | Wasteful copying |
| Recursive, remaining target | O(n) | O(h) | The standard answer; stops at the first valid path |
| Iterative stack of (node, remaining) | O(n) | O(h) | No recursion depth limit |
| BFS queue of (node, remaining) | O(n) | O(w) | Also fine; level order does not matter here |

If the interviewer then asks for **all** matching paths (Path Sum II), you keep one shared \`path\` list, add a node when you enter it, record a **copy** at each matching leaf, and remove the node when you leave. That add-recurse-remove pattern is called backtracking.

📌 **Interview term: Backtracking** — building a partial answer step by step and undoing the last step when you return, so one shared list can describe every path in turn.

## 5. The Java Code, Line by Line

Recursive:

~~~java
static boolean hasPathSum(TreeNode node, int target) {
    if (node == null) return false;                       // no path through an empty tree
    int remaining = target - node.val;
    if (node.left == null && node.right == null) return remaining == 0;  // a leaf
    return hasPathSum(node.left, remaining) || hasPathSum(node.right, remaining);
}
~~~

Iterative, with a record and a \`long\` remainder:

~~~java
record Frame(TreeNode node, long need) {}      // node and the sum still needed

static boolean hasPathSumIterative(TreeNode root, long target) {
    Deque<Frame> stack = new ArrayDeque<>();
    if (root != null) stack.push(new Frame(root, target));
    while (!stack.isEmpty()) {
        Frame f = stack.pop();
        TreeNode node = f.node();
        long need = f.need() - node.val;      // long: no int overflow on big values
        if (node.left == null && node.right == null && need == 0) return true;
        if (node.right != null) stack.push(new Frame(node.right, need));
        if (node.left != null) stack.push(new Frame(node.left, need));
    }
    return false;
}
~~~

All matching paths, with backtracking:

~~~java
static void dfs(TreeNode node, long need, List<Integer> path, List<List<Integer>> result) {
    if (node == null) return;
    path.add(node.val);                       // choose
    need -= node.val;
    if (node.left == null && node.right == null && need == 0) {
        result.add(new ArrayList<>(path));    // copy, because path keeps changing
    }
    dfs(node.left, need, path, result);
    dfs(node.right, need, path, result);
    path.remove(path.size() - 1);             // un-choose (backtrack); index, not value
}
~~~

What each Java piece is doing:

- **The leaf test at the node** makes \`[1, 2]\` with target 1 correctly \`false\`.
- **\`||\` short-circuits**, so the right subtree is only searched if the left failed.
- **\`int\` overflow wraps silently.** Java defines \`int\` addition as wrapping around on overflow, with no error:

~~~java
int a = 2000000000, b = 2000000000;
System.out.println("int sum:  " + (a + b));
System.out.println("long sum: " + ((long) a + b));
try {
    Math.addExact(a, b);
} catch (ArithmeticException e) {
    System.out.println("Math.addExact threw ArithmeticException: " + e.getMessage());
}
~~~

~~~text
int sum:  -294967296
long sum: 4000000000
Math.addExact threw ArithmeticException: integer overflow
~~~

  That is why Example 2 keeps the remainder in a \`long\` and passes \`4000000000L\` (the \`L\` suffix makes it a \`long\` literal; without it the number does not compile as an \`int\`). In the LeetCode version node values and the target are small enough for \`int\`, but say that you checked.
- **\`new ArrayList<>(path)\`** copies the list. Adding \`path\` itself stores a reference to the one list that backtracking keeps changing.
- **\`path.remove(path.size() - 1)\` removes by index.** \`List<Integer>\` has two \`remove\` methods, and the argument type picks one:

~~~java
List<Integer> path = new ArrayList<>(List.of(5, 4, 11, 2));
path.remove(Integer.valueOf(4));   // removes the VALUE 4
System.out.println(path);
path.remove(1);                    // removes the element at INDEX 1
System.out.println(path);
~~~

~~~text
[5, 11, 2]
[5, 2]
~~~

  With an \`int\` argument you always get the index version, so \`path.remove(node.val)\` would remove the wrong element (or throw \`IndexOutOfBoundsException\`).
- **\`List.toString()\`** prints nested lists as \`[[5, 4, 11, 2], [5, 8, 4, 5]]\`, matching the other languages' output.

📌 **Interview term: Integer overflow** — a result too large for its type. Java \`int\` wraps to a negative number without any warning; \`long\` or \`Math.addExact\` are the fixes.

📌 **Interview term: \`StackOverflowError\`** — one nested call per tree level; a degenerate tree overflows the default thread stack (measured on the [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) page). The iterative version avoids it.

### Dry run: \`hasPathSum(A, 22)\`

| Node | Remaining before | After subtracting | Leaf? | Result |
| :--- | :--- | :--- | :--- | :--- |
| 5 | 22 | 17 | no | try left |
| 4 | 17 | 13 | no | try left |
| 11 | 13 | 2 | no | try left |
| 7 | 2 | -5 | yes | -5 is not 0: **false**, try the right child of 11 |
| 2 | 2 | 0 | yes | 0: **true** |

Because of the short-circuit OR, \`true\` is returned all the way up and the right half of the tree (\`8\` and below) is never visited.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`javac Main.java && java Main\` (OpenJDK 21 (javac 21)). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive hasPathSum on ten cases, including the one-child trap and negatives** printed:

~~~text
hasPathSum(A, 22) = true
hasPathSum(A, 26) = true
hasPathSum(A, 18) = true
hasPathSum(A, 27) = true
hasPathSum(A, 9) = false
hasPathSum(A, 5) = false
hasPathSum([], 0) = false
hasPathSum([1, 2], 1) = false
hasPathSum([1], 1) = true
hasPathSum([-2, null, -3], -5) = true
~~~

**Example 2 — Iterative stack, the null-base-case bug, all matching paths, and 64-bit sums** printed:

~~~text
iterative: A 22 -> true, A 9 -> false
buggy: [1, 2] 1 -> true, A 9 -> true
all paths to 22 in B: [[5, 4, 11, 2], [5, 8, 4, 5]]
big values [2000000000, 2000000000] target 4000000000: true
~~~

In Example 1, target 9 on tree A and target 1 on \`[1, 2]\` are both \`false\` because the partial path stops at a node that is not a leaf. In Example 2 the buggy version (success test at a missing child) gets both of those wrong, the backtracking version finds both paths to 22 in tree B (\`[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, 5, 1]\`), and the 64-bit remainder handles a 4000000000 target.

## 7. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive | O(n) | O(h) | Each node visited at most once; one frame per node on the current path |
| Iterative stack | O(n) | O(h) | Each node pushed once; the stack holds a path plus waiting siblings |
| All paths (backtracking) | O(n · h) worst case | O(h) plus the output | Copying a path of length up to h at each matching leaf |

h is about log2 n for a balanced tree and n for a chain. The early exit makes the yes/no version faster in practice when a path exists, but the worst case (no path) is still O(n). See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty tree** — false for every target, including 0 (\`hasPathSum([], 0) = false\`).
- **Single node** — true only if its value equals the target (\`[1]\` with 1 is true).
- **One-child nodes** — not leaves; \`[1, 2]\` with target 1 is false, and A with target 9 is false.
- **Negative values** — \`[-2, null, -3]\` with -5 is true; never prune when the remainder goes negative.
- **Large values** — two values of 2000000000 sum past the 32-bit limit; Example 2 uses a 64-bit sum and gets \`true\` for target 4000000000.
- **Zero values** — a path through zeros is still a valid path; the leaf test, not the value, decides where a path ends.

## Common Pitfalls

- **\`if (node == null) return target == 0;\`** Treats a missing child as a path end; Example 2 prints \`true\` for \`[1, 2]\` with target 1.
- **\`int\` overflow on large values.** \`2000000000 + 2000000000\` printed \`-294967296\`; use \`long\`.
- **\`result.add(path)\` without a copy.** Every stored path is the same list.
- **\`path.remove(node.val)\`.** Calls \`remove(int index)\`, not remove-by-value; use \`path.remove(path.size() - 1)\`.
- **Pruning when the remainder goes negative.** Wrong with negative values.
- **Deep recursion.** \`StackOverflowError\` on degenerate trees; use the \`Deque<Frame>\` version.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Carry the remaining target down: subtract each node value, and at a leaf check for exactly 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The leaf rule:</strong> <span style="color:#f0e2c8;">A leaf has both children null; I test that at the node, so the root of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2]</code> is not a path end.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The code:</strong> <span style="color:#f0e2c8;">Null returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>; compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remaining</code>; at a leaf return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remaining == 0</code>; otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hasPathSum(left, remaining) || hasPathSum(right, remaining)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time and O(h) stack; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">||</code> stops at the first path; negatives mean no early pruning.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> sums wrap silently, so for large values I use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> remainder; for all paths I store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new ArrayList&lt;&gt;(path)</code> and backtrack with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove(path.size() - 1)</code>, which is the index overload.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Return all root-to-leaf paths with that sum.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Backtracking: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add</code>, subtract, store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new ArrayList&lt;&gt;(path)</code> at a matching leaf, recurse, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove(path.size() - 1)</code>. Example 2 prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[5, 4, 11, 2], [5, 8, 4, 5]]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Any downward path, not only root to leaf?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Path Sum III: keep a running prefix sum (as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>) and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Long, Integer&gt;</code> of earlier prefix counts; at each node add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count.getOrDefault(prefix - target, 0)</code>; undo the count when leaving the node. O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you detect overflow instead of avoiding it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.addExact</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.subtractExact</code>, which throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArithmeticException</code> on overflow, as the snippet above shows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you prune when the remainder is negative?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if values are guaranteed non-negative; the standard problem allows negatives.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a record for the stack frame?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It bundles the node and its remaining sum into one immutable value with accessors, which keeps the iterative loop readable; before Java 16 a small static class does the same.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Root-to-leaf path** | Nodes from the root down, one child at a time, ending at a leaf |
| **Leaf** | A node with no children; a one-child node is not a leaf |
| **Top-down recursion (passing state down)** | The parent passes information, here the remaining sum, to its children |
| **Short-circuit OR** | \`a or b\` / \`a || b\` skips \`b\` when \`a\` is already true |
| **Backtracking** | Add a step, recurse, then undo the step, so one shared list describes each path in turn |
| **Integer overflow** | A result too big for its type; Java \`int\` wraps silently, \`long\` or \`Math.addExact\` avoid or detect it |
| **\`StackOverflowError\`** | JVM error when the call stack is exhausted |

---
**Conclusion:** Root-to-leaf path sum is top-down recursion: subtract each value from the target on the way down and, at a node with no children, check for exactly zero. It is O(n) time and O(h) space, stops at the first match, and must not prune on negative remainders. In Java, \`int\` sums wrap silently, so use \`long\` for large values; the all-paths follow-up needs \`new ArrayList<>(path)\` copies and \`remove(path.size() - 1)\` — the index overload — for backtracking.`,
        examples: [
          {
            label: "Recursive hasPathSum on ten cases, including the one-child trap and negatives",
            code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
    }

    // Build a tree from level-order values; null marks a missing child.
    static TreeNode build(Integer... values) {
        if (values.length == 0 || values[0] == null) return null;
        TreeNode root = new TreeNode(values[0]);
        Deque<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            TreeNode node = queue.poll();
            if (i < values.length && values[i] != null) { node.left = new TreeNode(values[i]); queue.add(node.left); }
            i++;
            if (i < values.length && values[i] != null) { node.right = new TreeNode(values[i]); queue.add(node.right); }
            i++;
        }
        return root;
    }


    static boolean hasPathSum(TreeNode node, int target) {
        if (node == null) return false;                       // no path through an empty tree
        int remaining = target - node.val;
        if (node.left == null && node.right == null) return remaining == 0;  // a leaf
        return hasPathSum(node.left, remaining) || hasPathSum(node.right, remaining);
    }

    static String show(String name, TreeNode root, int target) {
        return "hasPathSum(" + name + ", " + target + ") = " + hasPathSum(root, target);
    }

    public static void main(String[] args) {
        TreeNode a = build(5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1);
        System.out.println(show("A", a, 22));   // true
        System.out.println(show("A", a, 26));   // true
        System.out.println(show("A", a, 18));   // true
        System.out.println(show("A", a, 27));   // true
        System.out.println(show("A", a, 9));    // false
        System.out.println(show("A", a, 5));    // false
        System.out.println(show("[]", null, 0));                      // false
        System.out.println(show("[1, 2]", build(1, 2), 1));           // false
        System.out.println(show("[1]", build(1), 1));                 // true
        System.out.println(show("[-2, null, -3]", build(-2, null, -3), -5));  // true
    }
}
`,
          },
          {
            label: "Iterative stack, the null-base-case bug, all matching paths, and 64-bit sums",
            code: `import java.util.*;

public class Main {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
        TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
    }

    // Build a tree from level-order values; null marks a missing child.
    static TreeNode build(Integer... values) {
        if (values.length == 0 || values[0] == null) return null;
        TreeNode root = new TreeNode(values[0]);
        Deque<TreeNode> queue = new ArrayDeque<>();
        queue.add(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            TreeNode node = queue.poll();
            if (i < values.length && values[i] != null) { node.left = new TreeNode(values[i]); queue.add(node.left); }
            i++;
            if (i < values.length && values[i] != null) { node.right = new TreeNode(values[i]); queue.add(node.right); }
            i++;
        }
        return root;
    }


    record Frame(TreeNode node, long need) {}      // node and the sum still needed

    static boolean hasPathSumIterative(TreeNode root, long target) {
        Deque<Frame> stack = new ArrayDeque<>();
        if (root != null) stack.push(new Frame(root, target));
        while (!stack.isEmpty()) {
            Frame f = stack.pop();
            TreeNode node = f.node();
            long need = f.need() - node.val;      // long: no int overflow on big values
            if (node.left == null && node.right == null && need == 0) return true;
            if (node.right != null) stack.push(new Frame(node.right, need));
            if (node.left != null) stack.push(new Frame(node.left, need));
        }
        return false;
    }

    static boolean hasPathSumBuggy(TreeNode node, int target) {   // WRONG: missing child treated as leaf
        if (node == null) return target == 0;
        return hasPathSumBuggy(node.left, target - node.val) || hasPathSumBuggy(node.right, target - node.val);
    }

    static void dfs(TreeNode node, long need, List<Integer> path, List<List<Integer>> result) {
        if (node == null) return;
        path.add(node.val);                       // choose
        need -= node.val;
        if (node.left == null && node.right == null && need == 0) {
            result.add(new ArrayList<>(path));    // copy, because path keeps changing
        }
        dfs(node.left, need, path, result);
        dfs(node.right, need, path, result);
        path.remove(path.size() - 1);             // un-choose (backtrack); index, not value
    }

    static List<List<Integer>> allPaths(TreeNode root, long target) {
        List<List<Integer>> result = new ArrayList<>();
        dfs(root, target, new ArrayList<>(), result);
        return result;
    }

    public static void main(String[] args) {
        TreeNode a = build(5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1);
        TreeNode b = build(5, 4, 8, 11, null, 13, 4, 7, 2, null, null, 5, 1);
        System.out.println("iterative: A 22 -> " + hasPathSumIterative(a, 22) + ", A 9 -> " + hasPathSumIterative(a, 9));
        System.out.println("buggy: [1, 2] 1 -> " + hasPathSumBuggy(build(1, 2), 1) + ", A 9 -> " + hasPathSumBuggy(a, 9));
        System.out.println("all paths to 22 in B: " + allPaths(b, 22));
        System.out.println("big values [2000000000, 2000000000] target 4000000000: "
            + hasPathSumIterative(build(2000000000, 2000000000), 4000000000L));
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Write a C++ function bool hasPathSum(TreeNode* root, int targetSum) that returns true if some root-to-leaf path adds up to exactly targetSum. Then return all such paths as a vector of vectors."

**What a strong answer should cover:**
- Carry the remaining target down; at a leaf check that the remainder is 0.
- A leaf has no children; \`[1, 2]\` with target 1 is false because the root is not a leaf.
- O(n) time, O(h) space; \`||\` short-circuits; negative values mean no pruning.
- Follow-up: all paths with backtracking (\`push_back\`, recurse, \`pop_back\`); \`result.push_back(path)\` copies the vector.
- C++ specifics: signed \`int\` overflow is undefined behaviour, not wrap-around, so use \`long long\` for sums of large values; pass \`path\` and \`result\` by reference; take \`const TreeNode*\`; deep recursion is a crash, not an exception.

**Clarifying questions expected:**
- "Must the path end at a leaf and start at the root?"
- "How large can the values be? Could the sum overflow an int?"

**Code / implementation expected:** Yes — a recursive C++ function; optionally an iterative version with \`long long\` sums and the all-paths version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a binary tree is.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this C++ version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

You are on a hike with a fixed amount of energy, say 22 snack bars' worth. The trail starts at one trailhead and keeps forking; every trail segment costs a certain number of bars. The trails end at viewpoints with no further forks. Question: is there a route from the trailhead to some viewpoint that uses **exactly** all 22 bars?

You do not need to add up every route from scratch. Walk down a fork and keep track of how many bars you still have. At each point, subtract the cost of where you are. When you arrive at a viewpoint (a dead end), check whether you have exactly zero left. If not, walk back and try the next fork.

That is the root-to-leaf path sum problem. It is a classic because it teaches the **top-down** style of tree recursion: instead of returning answers upward (as [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) does), you pass information **down** — here, the amount still needed. It also contains one of the most common tree bugs: treating a missing child as if it were the end of a path.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Must the path end at a **leaf**, or can it stop at any node? | The standard version (LeetCode 112) requires a leaf. Stopping anywhere is a different, easier check. |
| Must it start at the root? | Yes here. "Any downward path" is Path Sum III, which needs prefix sums. |
| Can values or the target be negative? | Yes in the standard problem, so you **cannot** stop early when the running sum passes the target. |
| What should an empty tree return? | \`false\` — there is no path at all, even for target 0. |
| Do you want a yes/no answer, or the paths themselves? | Returning all paths (Path Sum II) needs backtracking and copies. |
| How large can the values be? | Large values can overflow a 32-bit integer when added, which matters in Java and C++. |

## 3. The Core Idea

📌 **Interview term: Root-to-leaf path** — a sequence of nodes that starts at the root, moves to a child at each step, and ends at a **leaf**.

📌 **Interview term: Leaf** — a node with **no** children: both \`left\` and \`right\` are missing. A node with one child is *not* a leaf.

The trick is to carry the **remaining target** down the tree:

1. Empty tree: return false (there is no path).
2. Subtract the current node's value from the target.
3. If the node is a leaf, the answer is "is the remainder exactly 0?".
4. Otherwise, the answer is "does the **left** subtree have a path for the remainder, **or** does the **right** one?".

Here is tree A, \`[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1]\`, looking for 22:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 350" role="img" aria-label="Tree A with the path 5, 4, 11, 2 highlighted. The needed sum goes 22, then 17, then 13, then 2, and the leaf 2 brings it to 0">
  <line class="d-edge-accent" x1="303" y1="60" x2="197" y2="120"/>
  <line class="d-edge" x1="337" y1="60" x2="443" y2="120"/>
  <line class="d-edge-accent" x1="167" y1="145" x2="123" y2="195"/>
  <line class="d-edge" x1="447" y1="145" x2="403" y2="195"/>
  <line class="d-edge" x1="473" y1="145" x2="517" y2="195"/>
  <line class="d-edge" x1="99" y1="227" x2="71" y2="273"/>
  <line class="d-edge-accent" x1="121" y1="227" x2="149" y2="273"/>
  <line class="d-edge" x1="541" y1="227" x2="569" y2="273"/>
  <circle class="d-box-accent" cx="320" cy="50" r="20"/>
  <text class="d-text" x="320" y="55" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="180" cy="130" r="20"/>
  <text class="d-text" x="180" y="135" text-anchor="middle">4</text>
  <circle class="d-box" cx="460" cy="130" r="20"/>
  <text class="d-text" x="460" y="135" text-anchor="middle">8</text>
  <circle class="d-box-accent" cx="110" cy="210" r="20"/>
  <text class="d-text" x="110" y="215" text-anchor="middle">11</text>
  <circle class="d-box" cx="390" cy="210" r="20"/>
  <text class="d-text" x="390" y="215" text-anchor="middle">13</text>
  <circle class="d-box" cx="530" cy="210" r="20"/>
  <text class="d-text" x="530" y="215" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="60" cy="290" r="20"/>
  <text class="d-text" x="60" y="295" text-anchor="middle">7</text>
  <circle class="d-box-accent" cx="160" cy="290" r="20"/>
  <text class="d-text" x="160" y="295" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="580" cy="290" r="20"/>
  <text class="d-text" x="580" y="295" text-anchor="middle">1</text>
  <text class="d-sub" x="380" y="55" text-anchor="start">need 22</text>
  <text class="d-sub" x="120" y="125" text-anchor="end">need 17</text>
  <text class="d-sub" x="50" y="205" text-anchor="end">need 13</text>
  <text class="d-text d-accent" x="160" y="335" text-anchor="middle">leaf: 2 - 2 = 0</text>
</svg>

The highlighted path \`5 → 4 → 11 → 2\` sums to 22: the amount still needed shrinks from 22 to 17 to 13 to 2, and the leaf \`2\` brings it to exactly 0. Other root-to-leaf paths in A sum to 27 (\`5, 4, 11, 7\`), 26 (\`5, 8, 13\`) and 18 (\`5, 8, 4, 1\`); Example 1 checks all of them.

📌 **Interview term: Top-down recursion (passing state down)** — the parent hands each child extra information (here the remaining sum) as an argument, which is a [preorder](/interview-question/what-are-the-tree-traversal-methods) pattern: work at the node first, then recurse.

📌 **Interview term: Short-circuit OR** — \`left or right\` stops as soon as the left side returns true, so once one valid path is found the rest of the tree is never visited.

### The one-child trap

<svg class="iq-diagram" width="100%" viewBox="0 0 560 230" role="img" aria-label="Tree 1 with only a left child 2. The missing right child is not a leaf, so the path 1 alone does not count for target 1">
  <line class="d-edge" x1="262" y1="65" x2="178" y2="135"/>
  <line class="d-edge-dashed" x1="298" y1="65" x2="382" y2="135"/>
  <circle class="d-box-accent" cx="280" cy="50" r="24"/>
  <text class="d-text" x="280" y="55" text-anchor="middle">1</text>
  <circle class="d-box" cx="160" cy="150" r="24"/>
  <text class="d-text" x="160" y="155" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="400" cy="150" r="24"/>
  <text class="d-text" x="400" y="155" text-anchor="middle">null</text>
  <text class="d-sub" x="160" y="200" text-anchor="middle">the only leaf: sum 3</text>
  <text class="d-sub" x="400" y="200" text-anchor="middle">not a node, not a leaf</text>
</svg>

For the tree \`[1, 2]\` and target 1, the root alone sums to 1. But the root has a child, so it is not a leaf, and the only root-to-leaf path is \`1 → 2\`, which sums to 3. The correct answer is **false**.

The common buggy version uses "empty tree and target is 0" as its success test. At the root it recurses into the missing right child with a remainder of 0 and wrongly returns **true**. Example 2 runs that buggy version and prints \`true\` for \`[1, 2]\` with target 1, and also for tree A with target 9 (\`5 + 4\`, where node \`4\` is not a leaf). The fix is to test for a leaf **at the node**, before recursing.

### Why you cannot stop early

With only positive values you might be tempted to stop once the remaining sum drops below zero. Values can be negative (\`[-2, null, -3]\` with target -5 is true), so a path that goes "over" can come back. Every root-to-leaf path may need to be checked.

## 4. Brute Force First, Then the Clean Solution

**Brute force — collect every path, then sum it.** Walk the tree, copy the current path into a list at every leaf, and afterwards sum each list. It works, but storing and summing a path of length up to h at each of up to n/2 leaves costs O(n · h) time and memory.

**Better — carry the remainder.** Subtract as you go and only ever compare one number at a leaf: O(n) time, O(h) space for the recursion. It is optimal, since in the worst case (no valid path) every node must be visited.

| Approach | Time | Extra space | Notes |
| :--- | :--- | :--- | :--- |
| Store every path, then sum | O(n · h) | O(n · h) | Wasteful copying |
| Recursive, remaining target | O(n) | O(h) | The standard answer; stops at the first valid path |
| Iterative stack of (node, remaining) | O(n) | O(h) | No recursion depth limit |
| BFS queue of (node, remaining) | O(n) | O(w) | Also fine; level order does not matter here |

If the interviewer then asks for **all** matching paths (Path Sum II), you keep one shared \`path\` list, add a node when you enter it, record a **copy** at each matching leaf, and remove the node when you leave. That add-recurse-remove pattern is called backtracking.

📌 **Interview term: Backtracking** — building a partial answer step by step and undoing the last step when you return, so one shared list can describe every path in turn.

## 5. The C++ Code, Line by Line

Recursive:

~~~cpp
bool hasPathSum(const TreeNode* node, int target) {
    if (!node) return false;                              // no path through an empty tree
    int remaining = target - node->val;
    if (!node->left && !node->right) return remaining == 0;   // a leaf: the path ends here
    return hasPathSum(node->left, remaining) || hasPathSum(node->right, remaining);
}
~~~

Iterative, with \`long long\` remainders:

~~~cpp
bool hasPathSumIterative(const TreeNode* root, long long target) {
    std::vector<std::pair<const TreeNode*, long long>> st;   // (node, sum still needed)
    if (root) st.push_back({root, target});
    while (!st.empty()) {
        auto [node, need] = st.back();
        st.pop_back();
        need -= node->val;                        // long long: no overflow on big values
        if (!node->left && !node->right && need == 0) return true;
        if (node->right) st.push_back({node->right, need});
        if (node->left) st.push_back({node->left, need});
    }
    return false;
}
~~~

All matching paths, with backtracking:

~~~cpp
void dfs(const TreeNode* node, long long need, std::vector<int>& path, std::vector<std::vector<int>>& result) {
    if (!node) return;
    path.push_back(node->val);                    // choose
    need -= node->val;
    if (!node->left && !node->right && need == 0) result.push_back(path);  // copies the vector
    dfs(node->left, need, path, result);
    dfs(node->right, need, path, result);
    path.pop_back();                              // un-choose (backtrack)
}
~~~

What each C++ piece is doing:

- **The leaf test at the node** makes \`[1, 2]\` with target 1 correctly \`false\`.
- **\`||\` short-circuits**, so the right subtree is only searched if the left failed.
- **\`result.push_back(path)\` copies.** C++ containers have value semantics: pushing a \`std::vector<int>\` into another vector copies its elements, so later \`pop_back\` calls on \`path\` do not affect the stored copy. (This is the opposite of Python, JavaScript and Java, where you must copy explicitly.)
- **\`std::vector<int>& path\`** is passed by reference so all calls share one path; passing it by value would copy it at every call and make the \`pop_back\` pointless.
- **\`auto [node, need] = st.back();\`** copies the pair into two local variables, so \`need -= node->val\` changes only the local copy.
- **Signed overflow is undefined behaviour.** Unlike Java, C++ does not promise wrap-around for \`int\`. Built with \`g++ -std=c++17 -fsanitize=undefined\`, this program reported the overflow at run time:

~~~cpp
#include <iostream>
int main(int argc, char**) {
    int a = 2000000000 + (argc - 1);   // argc keeps the sum from being computed at compile time
    int b = 2000000000;
    long long ok = static_cast<long long>(a) + b;
    std::cout << "long long sum: " << ok << std::endl;
    int sum = a + b;                   // signed overflow: undefined behaviour
    std::cout << "int sum: " << sum << std::endl;
}
~~~

~~~text
long long sum: 4000000000
main.cpp:7:9: runtime error: signed integer overflow: 2000000000 + 2000000000 cannot be represented in type 'int'
int sum: -294967296
~~~

  The \`-294967296\` printed on this build is not something the language guarantees. Example 2 avoids the problem with \`long long\` and the literal \`4000000000LL\`.

📌 **Interview term: Undefined behaviour (signed overflow)** — the C++ standard gives no meaning to a signed integer result that does not fit its type; the compiler may assume it never happens. Use a wider type or check before adding.

📌 **Interview term: Stack overflow (segmentation fault)** — one nested call per tree level; a very deep tree crashes the process (measured on the [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) page). The explicit-stack version avoids it.

### Dry run: \`hasPathSum(A, 22)\`

| Node | Remaining before | After subtracting | Leaf? | Result |
| :--- | :--- | :--- | :--- | :--- |
| 5 | 22 | 17 | no | try left |
| 4 | 17 | 13 | no | try left |
| 11 | 13 | 2 | no | try left |
| 7 | 2 | -5 | yes | -5 is not 0: **false**, try the right child of 11 |
| 2 | 2 | 0 | yes | 0: **true** |

Because of the short-circuit OR, \`true\` is returned all the way up and the right half of the tree (\`8\` and below) is never visited.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3 with -std=c++17). The same programs in the other three languages print exactly the same lines.

**Example 1 — Recursive hasPathSum on ten cases, including the one-child trap and negatives** printed:

~~~text
hasPathSum(A, 22) = true
hasPathSum(A, 26) = true
hasPathSum(A, 18) = true
hasPathSum(A, 27) = true
hasPathSum(A, 9) = false
hasPathSum(A, 5) = false
hasPathSum([], 0) = false
hasPathSum([1, 2], 1) = false
hasPathSum([1], 1) = true
hasPathSum([-2, null, -3], -5) = true
~~~

**Example 2 — Iterative stack, the null-base-case bug, all matching paths, and 64-bit sums** printed:

~~~text
iterative: A 22 -> true, A 9 -> false
buggy: [1, 2] 1 -> true, A 9 -> true
all paths to 22 in B: [[5, 4, 11, 2], [5, 8, 4, 5]]
big values [2000000000, 2000000000] target 4000000000: true
~~~

In Example 1, target 9 on tree A and target 1 on \`[1, 2]\` are both \`false\` because the partial path stops at a node that is not a leaf. In Example 2 the buggy version (success test at a missing child) gets both of those wrong, the backtracking version finds both paths to 22 in tree B (\`[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, 5, 1]\`), and the 64-bit remainder handles a 4000000000 target.

## 7. Complexity

| Version | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive | O(n) | O(h) | Each node visited at most once; one frame per node on the current path |
| Iterative stack | O(n) | O(h) | Each node pushed once; the stack holds a path plus waiting siblings |
| All paths (backtracking) | O(n · h) worst case | O(h) plus the output | Copying a path of length up to h at each matching leaf |

h is about log2 n for a balanced tree and n for a chain. The early exit makes the yes/no version faster in practice when a path exists, but the worst case (no path) is still O(n). See [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty tree** — false for every target, including 0 (\`hasPathSum([], 0) = false\`).
- **Single node** — true only if its value equals the target (\`[1]\` with 1 is true).
- **One-child nodes** — not leaves; \`[1, 2]\` with target 1 is false, and A with target 9 is false.
- **Negative values** — \`[-2, null, -3]\` with -5 is true; never prune when the remainder goes negative.
- **Large values** — two values of 2000000000 sum past the 32-bit limit; Example 2 uses a 64-bit sum and gets \`true\` for target 4000000000.
- **Zero values** — a path through zeros is still a valid path; the leaf test, not the value, decides where a path ends.

## Common Pitfalls

- **\`if (!node) return target == 0;\`** Treats a missing child as a path end; Example 2 prints \`true\` for \`[1, 2]\` with target 1.
- **\`int\` sums of large values.** Signed overflow is undefined behaviour; use \`long long\`.
- **Passing \`path\` by value.** Each call gets its own copy; it works for the answer but costs a copy per call. Pass by reference and \`pop_back\` on the way out.
- **Forgetting \`path.pop_back()\`.** Later paths contain nodes from other branches.
- **Pruning when the remainder goes negative.** Wrong with negative values.
- **Deep recursion.** A segfault with nothing to catch; use the explicit stack for very deep trees.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Carry the remaining target down: subtract each node value, and at a leaf check for exactly 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The leaf rule:</strong> <span style="color:#f0e2c8;">A leaf has both child pointers null; I test that at the node so the root of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2]</code> is not a path end.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The code:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>; compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remaining</code>; at a leaf return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remaining == 0</code>; otherwise recurse left <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">||</code> right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time and O(h) stack; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">||</code> stops at the first path; negatives mean no early pruning.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ details:</strong> <span style="color:#f0e2c8;">Signed overflow is undefined behaviour, so with large values I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>; for all paths I pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> by reference, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_back</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result.push_back(path)</code> already copies.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Return all root-to-leaf paths with that sum.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Backtracking with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt;&amp;</code> path: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code>, subtract, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result.push_back(path)</code> at a matching leaf, recurse, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_back</code>. Example 2 prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[5, 4, 11, 2], [5, 8, 4, 5]]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Any downward path, not only root to leaf?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Path Sum III: running prefix sum in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> and an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::unordered_map&lt;long long, int&gt;</code> of earlier prefix counts; add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count[prefix - target]</code> at each node and decrement the count when leaving. O(n) on average.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is overflow worse in C++ than in Java?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Java defines <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> overflow as wrap-around. In C++ signed overflow is undefined behaviour, so the optimiser may assume it cannot happen and the program can behave unpredictably; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-fsanitize=undefined</code> reports it at run time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">result.push_back(path)</code> copy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes; standard containers have value semantics, so the stored vector is independent. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::move</code> only if you no longer need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code>, which is not the case during backtracking.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you prune when the remainder is negative?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if values are guaranteed non-negative; the standard problem allows negatives.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Root-to-leaf path** | Nodes from the root down, one child at a time, ending at a leaf |
| **Leaf** | A node with no children; a one-child node is not a leaf |
| **Top-down recursion (passing state down)** | The parent passes information, here the remaining sum, to its children |
| **Short-circuit OR** | \`a or b\` / \`a || b\` skips \`b\` when \`a\` is already true |
| **Backtracking** | Add a step, recurse, then undo the step, so one shared list describes each path in turn |
| **Undefined behaviour (signed overflow)** | A signed result that does not fit its type has no defined meaning in C++ |
| **Stack overflow (segmentation fault)** | Exhausting the native stack crashes the process |

---
**Conclusion:** Root-to-leaf path sum is top-down recursion: subtract each value from the target on the way down and, at a node with no children, check for exactly zero. It is O(n) time and O(h) space, stops at the first match, and must not prune on negative remainders. In C++, signed overflow is undefined behaviour, so use \`long long\` for large values; the all-paths follow-up passes \`path\` by reference and relies on \`push_back\` copying the vector into the result.`,
        examples: [
          {
            label: "Recursive hasPathSum on ten cases, including the one-child trap and negatives",
            code: `#include <iostream>
#include <optional>
#include <queue>
#include <string>
#include <vector>

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    explicit TreeNode(int v, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

const std::nullopt_t NIL = std::nullopt;   // marks a missing child in the input

// Build a tree from level-order values.
TreeNode* build(const std::vector<std::optional<int>>& values) {
    if (values.empty() || !values[0]) return nullptr;
    TreeNode* root = new TreeNode(*values[0]);
    std::queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        TreeNode* node = q.front();
        q.pop();
        if (i < values.size() && values[i]) { node->left = new TreeNode(*values[i]); q.push(node->left); }
        i++;
        if (i < values.size() && values[i]) { node->right = new TreeNode(*values[i]); q.push(node->right); }
        i++;
    }
    return root;
}

// Free every node without recursion, so deep trees are safe too.
void destroy(TreeNode* root) {
    std::vector<TreeNode*> st;
    if (root) st.push_back(root);
    while (!st.empty()) {
        TreeNode* node = st.back();
        st.pop_back();
        if (node->left) st.push_back(node->left);
        if (node->right) st.push_back(node->right);
        delete node;
    }
}

bool hasPathSum(const TreeNode* node, int target) {
    if (!node) return false;                              // no path through an empty tree
    int remaining = target - node->val;
    if (!node->left && !node->right) return remaining == 0;   // a leaf: the path ends here
    return hasPathSum(node->left, remaining) || hasPathSum(node->right, remaining);
}

std::string show(const std::string& name, const TreeNode* root, int target) {
    return "hasPathSum(" + name + ", " + std::to_string(target) + ") = " +
           (hasPathSum(root, target) ? "true" : "false");
}

int main() {
    TreeNode* a = build({5, 4, 8, 11, NIL, 13, 4, 7, 2, NIL, NIL, NIL, 1});
    std::cout << show("A", a, 22) << "\\n";   // true
    std::cout << show("A", a, 26) << "\\n";   // true
    std::cout << show("A", a, 18) << "\\n";   // true
    std::cout << show("A", a, 27) << "\\n";   // true
    std::cout << show("A", a, 9) << "\\n";    // false
    std::cout << show("A", a, 5) << "\\n";    // false
    std::cout << show("[]", nullptr, 0) << "\\n";   // false
    TreeNode* t1 = build({1, 2});
    TreeNode* t2 = build({1});
    TreeNode* t3 = build({-2, NIL, -3});
    std::cout << show("[1, 2]", t1, 1) << "\\n";            // false
    std::cout << show("[1]", t2, 1) << "\\n";               // true
    std::cout << show("[-2, null, -3]", t3, -5) << "\\n";   // true
    for (TreeNode* t : {a, t1, t2, t3}) destroy(t);
}
`,
          },
          {
            label: "Iterative stack, the null-base-case bug, all matching paths, and 64-bit sums",
            code: `#include <iostream>
#include <optional>
#include <queue>
#include <string>
#include <utility>
#include <vector>

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    explicit TreeNode(int v, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {}
};

const std::nullopt_t NIL = std::nullopt;   // marks a missing child in the input

// Build a tree from level-order values.
TreeNode* build(const std::vector<std::optional<int>>& values) {
    if (values.empty() || !values[0]) return nullptr;
    TreeNode* root = new TreeNode(*values[0]);
    std::queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        TreeNode* node = q.front();
        q.pop();
        if (i < values.size() && values[i]) { node->left = new TreeNode(*values[i]); q.push(node->left); }
        i++;
        if (i < values.size() && values[i]) { node->right = new TreeNode(*values[i]); q.push(node->right); }
        i++;
    }
    return root;
}

// Free every node without recursion, so deep trees are safe too.
void destroy(TreeNode* root) {
    std::vector<TreeNode*> st;
    if (root) st.push_back(root);
    while (!st.empty()) {
        TreeNode* node = st.back();
        st.pop_back();
        if (node->left) st.push_back(node->left);
        if (node->right) st.push_back(node->right);
        delete node;
    }
}

bool hasPathSumIterative(const TreeNode* root, long long target) {
    std::vector<std::pair<const TreeNode*, long long>> st;   // (node, sum still needed)
    if (root) st.push_back({root, target});
    while (!st.empty()) {
        auto [node, need] = st.back();
        st.pop_back();
        need -= node->val;                        // long long: no overflow on big values
        if (!node->left && !node->right && need == 0) return true;
        if (node->right) st.push_back({node->right, need});
        if (node->left) st.push_back({node->left, need});
    }
    return false;
}

bool hasPathSumBuggy(const TreeNode* node, int target) {    // WRONG: missing child treated as leaf
    if (!node) return target == 0;
    return hasPathSumBuggy(node->left, target - node->val) || hasPathSumBuggy(node->right, target - node->val);
}

void dfs(const TreeNode* node, long long need, std::vector<int>& path, std::vector<std::vector<int>>& result) {
    if (!node) return;
    path.push_back(node->val);                    // choose
    need -= node->val;
    if (!node->left && !node->right && need == 0) result.push_back(path);  // copies the vector
    dfs(node->left, need, path, result);
    dfs(node->right, need, path, result);
    path.pop_back();                              // un-choose (backtrack)
}

std::string fmt(const std::vector<std::vector<int>>& paths) {
    std::string s = "[";
    for (size_t i = 0; i < paths.size(); i++) {
        s += (i ? ", [" : "[");
        for (size_t j = 0; j < paths[i].size(); j++) s += (j ? ", " : "") + std::to_string(paths[i][j]);
        s += "]";
    }
    return s + "]";
}

int main() {
    std::cout << std::boolalpha;
    TreeNode* a = build({5, 4, 8, 11, NIL, 13, 4, 7, 2, NIL, NIL, NIL, 1});
    TreeNode* b = build({5, 4, 8, 11, NIL, 13, 4, 7, 2, NIL, NIL, 5, 1});
    TreeNode* small = build({1, 2});
    TreeNode* big = build({2000000000, 2000000000});
    std::cout << "iterative: A 22 -> " << hasPathSumIterative(a, 22) << ", A 9 -> " << hasPathSumIterative(a, 9) << "\\n";
    std::cout << "buggy: [1, 2] 1 -> " << hasPathSumBuggy(small, 1) << ", A 9 -> " << hasPathSumBuggy(a, 9) << "\\n";
    std::vector<int> path;
    std::vector<std::vector<int>> result;
    dfs(b, 22, path, result);
    std::cout << "all paths to 22 in B: " << fmt(result) << "\\n";
    std::cout << "big values [2000000000, 2000000000] target 4000000000: " << hasPathSumIterative(big, 4000000000LL) << "\\n";
    for (TreeNode* t : {a, b, small, big}) destroy(t);
}
`,
          },
        ],
      },
    },
  },
];

export default augments;
