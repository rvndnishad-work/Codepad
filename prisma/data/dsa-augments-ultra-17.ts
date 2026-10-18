/**
 * DSA ULTRA — batch 17: binary search trees and tree reconstruction — what a BST is, validating a
 * BST, the kth smallest element, building a tree from preorder + inorder, and serializing /
 * deserializing a binary tree. One complete answer per language (Python, JavaScript, Java, C++).
 * Every example was run with python3 / node / javac+java / g++ -std=c++17 by
 * scripts/verify-dsa-examples.ts and the quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "What is a binary search tree (BST)?",
    difficulty: "easy",
    seoDescription: "What a binary search tree is, how search, insert and delete work, and why height decides speed. Verified Python, JavaScript, Java and C++ code.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Explain what a binary search tree is. Then, in Python, show me how search, insert and delete work, and tell me what their running time depends on."

**What a strong answer should cover:**
- The BST property: every key in a node's left subtree is smaller, every key in its right subtree is larger — for the whole subtree, not just the children.
- Search, insert and delete each walk one root-to-leaf path, so they cost O(h), where h is the height.
- The three delete cases (leaf, one child, two children) and the in-order successor.
- In-order traversal visits the keys in sorted order.
- Height is the whole story: about log2(n) when balanced, n − 1 when keys arrive sorted; self-balancing trees (AVL, red-black) keep it O(log n).
- Python specifics: there is no BST in the standard library (\`dict\` is a hash table, \`bisect\` works on a sorted list), and a recursive insert on sorted keys hits the default recursion limit of 1000.

**Code / implementation expected:** Optional — a small \`Node\` class with \`insert\`, \`search\` and \`delete\` in Python 3.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need to know what a variable, a loop and a function are.  
**Difficulty:** Easy  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Play a guessing game with a friend: they think of a number between 1 and 100, you guess, and they only ever say "higher" or "lower". A smart player never guesses 1, 2, 3...; they guess 50, then 25 or 75, and so on, throwing away half of the remaining numbers with each question. Seven questions are always enough.

Now imagine the numbers are not fixed — your friend keeps adding new ones and crossing old ones out. A sorted list on paper makes the guessing fast but every new number means rewriting everything after it. A **binary search tree** is the answer to "how do I keep the guessing-game speed while numbers come and go?" Each number sits in a little card; every card points to a card of smaller numbers on its left and bigger numbers on its right. To find, add or remove a number, you start at the top card and keep asking "smaller or bigger?" — exactly like the guessing game.

Interviewers ask this question because the BST is the foundation of a whole family of problems — [validating a BST](/interview-question/how-do-you-validate-that-a-binary-tree-is-a-bst), [the kth smallest element](/interview-question/how-do-you-find-the-kth-smallest-element-in-a-bst), [lowest common ancestor](/interview-question/how-do-you-find-the-lowest-common-ancestor-in-a-binary-tree) — and because the honest answer to "how fast is it?" (it depends on the shape) separates people who memorised O(log n) from people who understand it.

## 2. The Rule That Makes It a BST

A **binary tree** is a set of nodes where each node has at most two children, called *left* and *right*. The top node is the **root**; a node with no children is a **leaf**; a node together with everything below it is a **subtree**.

A **binary search tree** adds one rule, and the rule is about whole subtrees, not just children:

> For every node, **every** key in its left subtree is smaller than the node's key, and **every** key in its right subtree is larger.

📌 **Interview term: Binary search tree (BST)** — a binary tree in which every node's key is greater than all keys in its left subtree and smaller than all keys in its right subtree.

📌 **Interview term: BST property (invariant)** — the ordering rule above. An invariant is a fact that must stay true after every operation; insert and delete are written to preserve it.

📌 **Interview term: Key** — the value the tree is ordered by. A node can also carry extra data (a phone number for a name), which makes the BST an ordered map.

Here is the tree built by inserting 8, 3, 10, 1, 6, 14, 4, 7, 13 in that order (the same tree the examples use). The highlighted path is a search for 6:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 320" role="img" aria-label="A binary search tree with root 8. Searching for 6 visits 8, then 3, then 6">
  <path class="d-edge-accent" d="M 300 60 L 200 110"/>
  <path class="d-edge" d="M 340 60 L 440 110"/>
  <path class="d-edge" d="M 166 137 L 124 183"/>
  <path class="d-edge-accent" d="M 194 137 L 236 183"/>
  <path class="d-edge" d="M 474 137 L 516 183"/>
  <path class="d-edge" d="M 240 220 L 220 260"/>
  <path class="d-edge" d="M 260 220 L 280 260"/>
  <path class="d-edge" d="M 520 220 L 500 260"/>
  <circle class="d-box-accent" cx="320" cy="50" r="22"/>
  <text class="d-text" x="320" y="56" text-anchor="middle">8</text>
  <circle class="d-box-accent" cx="180" cy="120" r="22"/>
  <text class="d-text" x="180" y="126" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="460" cy="120" r="22"/>
  <text class="d-text" x="460" y="126" text-anchor="middle">10</text>
  <circle class="d-box-muted" cx="110" cy="200" r="22"/>
  <text class="d-text" x="110" y="206" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="250" cy="200" r="22"/>
  <text class="d-text" x="250" y="206" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="530" cy="200" r="22"/>
  <text class="d-text" x="530" y="206" text-anchor="middle">14</text>
  <circle class="d-box-muted" cx="210" cy="280" r="22"/>
  <text class="d-text" x="210" y="286" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="290" cy="280" r="22"/>
  <text class="d-text" x="290" y="286" text-anchor="middle">7</text>
  <circle class="d-box-muted" cx="490" cy="280" r="22"/>
  <text class="d-text" x="490" y="286" text-anchor="middle">13</text>
  <text class="d-text d-accent" x="20" y="30" text-anchor="start">Search for 6</text>
  <text class="d-sub" x="20" y="54" text-anchor="start">8, then 3, then 6</text>
</svg>

At 8 the search goes left (6 is smaller), at 3 it goes right (6 is bigger), and at 6 it stops. Three nodes looked at out of nine. A search for 5 follows the same path and then falls off the tree to the left of 4 — that is how "not found" is detected, and it is also exactly where \`insert(5)\` would hang the new node.

## 3. The Three Operations

**Search.** Start at the root. If the key matches, stop. If it is smaller, go left; if bigger, go right. If you step onto an empty child, the key is not in the tree.

**Insert.** Do the same walk as search. When you step onto an empty child, put the new node there. A new key always becomes a leaf; nothing else moves. (The examples ignore duplicates; if you need them, pick a side — say "equal keys go right" — or store a count in the node.)

**Delete.** Find the node, then one of three cases applies:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 320" role="img" aria-label="Deleting a node: a node with zero or one child is replaced by its child; a node with two children copies its in-order successor and deletes that successor instead">
  <defs>
    <marker id="b17q1d-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="70" width="150" height="60" rx="8"/>
  <text class="d-text" x="95" y="96" text-anchor="middle">Find the node</text>
  <text class="d-sub" x="95" y="116" text-anchor="middle">walk like search</text>
  <rect class="d-box-muted" x="230" y="70" width="170" height="60" rx="8"/>
  <text class="d-text" x="315" y="96" text-anchor="middle">How many children?</text>
  <text class="d-sub" x="315" y="116" text-anchor="middle">0, 1 or 2</text>
  <rect class="d-box-accent" x="470" y="20" width="210" height="60" rx="8"/>
  <text class="d-text" x="575" y="46" text-anchor="middle">0 or 1 child</text>
  <text class="d-sub" x="575" y="66" text-anchor="middle">replace it by its child</text>
  <rect class="d-box-accent" x="470" y="130" width="210" height="60" rx="8"/>
  <text class="d-text" x="575" y="156" text-anchor="middle">2 children</text>
  <text class="d-sub" x="575" y="176" text-anchor="middle">copy the successor key</text>
  <rect class="d-box" x="470" y="240" width="210" height="60" rx="8"/>
  <text class="d-text" x="575" y="266" text-anchor="middle">Then remove</text>
  <text class="d-sub" x="575" y="286" text-anchor="middle">the successor, lower down</text>
  <path class="d-edge" d="M 170 100 L 226 100" marker-end="url(#b17q1d-arrow)"/>
  <path class="d-edge" d="M 400 88 L 466 56" marker-end="url(#b17q1d-arrow)"/>
  <path class="d-edge" d="M 400 112 L 466 158" marker-end="url(#b17q1d-arrow)"/>
  <path class="d-edge" d="M 575 190 L 575 236" marker-end="url(#b17q1d-arrow)"/>
</svg>

1. **Leaf** — just remove it (its parent's pointer becomes empty).
2. **One child** — the child takes the node's place.
3. **Two children** — find the **in-order successor** (the smallest key in the right subtree: go right once, then left as far as possible), copy its key into this node, then delete the successor from the right subtree. The successor has no left child, so deleting it is always case 1 or 2.

📌 **Interview term: In-order successor** — the next larger key in the tree. For a node with a right subtree it is the leftmost node of that subtree.

Why does the copy keep the BST property? The successor is bigger than everything in the left subtree (it came from the right side) and smaller than everything else in the right subtree (it was the smallest there). So it fits exactly in the deleted node's slot. Using the **in-order predecessor** (largest key of the left subtree) works just as well.

## 4. In-Order Traversal Comes Out Sorted

Visiting *left subtree, then the node, then the right subtree* — an **in-order traversal** — prints a BST's keys in increasing order: everything smaller is printed before the node, everything larger after it. For the tree above that is \`[1, 3, 4, 6, 7, 8, 10, 13, 14]\`. This one fact powers several follow-up questions: a tree is a valid BST exactly when its in-order sequence is strictly increasing, and the kth smallest key is the kth node an in-order walk visits. The full set of traversals is on [the tree traversal page](/interview-question/what-are-the-tree-traversal-methods).

📌 **Interview term: In-order traversal** — visit left subtree, node, right subtree. On a BST it yields the keys in sorted order in O(n) time.

## 5. Shape Is Everything: the Height

Every operation walks one path from the root downwards, so its cost is the length of the longest path — the **height** of the tree. The same keys can produce very different heights depending on the order they arrive in:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Inserting 1, 2, 3, 4, 5 in sorted order builds a chain of height 4">
  <path class="d-edge" d="M 137 61 L 183 89"/>
  <path class="d-edge" d="M 217 111 L 263 139"/>
  <path class="d-edge" d="M 297 161 L 343 189"/>
  <path class="d-edge" d="M 377 211 L 423 239"/>
  <circle class="d-box-muted" cx="120" cy="50" r="20"/>
  <text class="d-text" x="120" y="56" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="200" cy="100" r="20"/>
  <text class="d-text" x="200" y="106" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="280" cy="150" r="20"/>
  <text class="d-text" x="280" y="156" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="360" cy="200" r="20"/>
  <text class="d-text" x="360" y="206" text-anchor="middle">4</text>
  <circle class="d-box-accent" cx="440" cy="250" r="20"/>
  <text class="d-text" x="440" y="256" text-anchor="middle">5</text>
  <text class="d-text" x="600" y="120" text-anchor="end">Sorted inserts</text>
  <text class="d-sub" x="600" y="144" text-anchor="end">height 4</text>
  <text class="d-sub" x="600" y="166" text-anchor="end">a linked list</text>
</svg>

Inserting keys in sorted order makes every new key the right child of the previous one: the tree degenerates into a linked list and search becomes a linear scan.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="The same five keys arranged with the middle key 3 at the root have height 2">
  <path class="d-edge" d="M 303 60 L 217 110"/>
  <path class="d-edge" d="M 337 60 L 423 110"/>
  <path class="d-edge" d="M 212 136 L 248 179"/>
  <path class="d-edge" d="M 452 136 L 488 179"/>
  <circle class="d-box-accent" cx="320" cy="50" r="20"/>
  <text class="d-text" x="320" y="56" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="200" cy="120" r="20"/>
  <text class="d-text" x="200" y="126" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="440" cy="120" r="20"/>
  <text class="d-text" x="440" y="126" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="260" cy="195" r="20"/>
  <text class="d-text" x="260" y="201" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="500" cy="195" r="20"/>
  <text class="d-text" x="500" y="201" text-anchor="middle">5</text>
  <text class="d-text" x="40" y="40" text-anchor="start">Middle key first</text>
  <text class="d-sub" x="40" y="64" text-anchor="start">height 2</text>
</svg>

Putting the middle key at the root (and recursively the middle of each half) gives the shortest possible tree. Example 2 measures this on 1,023 keys: sorted inserts give height 1,022 and 512 comparisons per search on average, a random insertion order gives height 22 and about 12 comparisons, and the perfectly balanced build gives height 9 and about 9 comparisons.

📌 **Interview term: Height** — the number of edges on the longest root-to-leaf path (an empty tree is -1, a single node is 0). BST operations cost O(h).

📌 **Interview term: Degenerate (skewed) tree** — a tree where every node has at most one child, so the height is n − 1 and the tree behaves like a linked list.

📌 **Interview term: Self-balancing BST** — a BST that restructures itself (with rotations) on insert and delete so the height stays O(log n) no matter the insertion order. AVL trees and red-black trees are the two classic designs.

You are rarely asked to code a red-black tree in an interview; you are expected to know that it exists, that it guarantees O(log n), and which library class gives it to you (next section).

## 6. BSTs in Python

**What the standard library gives you.** Python has no balanced BST built in. \`dict\` and \`set\` are hash tables: average O(1) lookups but no ordering by key (a \`dict\` remembers *insertion* order, which is not sorted order — see [how a hash table works](/interview-question/how-does-a-hash-table-work)). For sorted data the usual tools are the \`bisect\` module on a sorted list (O(log n) search, but O(n) insert because the list shifts) and the third-party \`sortedcontainers\` package. In an interview, writing a small \`Node\` class is expected.

**The code.** Example 1 implements the three operations. \`insert\` and \`delete\` *return the new root of the subtree*, and the caller re-assigns it (\`root.left = insert(root.left, key)\`); that one pattern handles "the tree was empty" and "the deleted node was the root" without special cases.

~~~python
class Node:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None


def insert(root, key):
    """Return the root after inserting key; duplicates are ignored."""
    if root is None:
        return Node(key)
    if key < root.key:
        root.left = insert(root.left, key)
    elif key > root.key:
        root.right = insert(root.right, key)
    return root


def search(root, key):
    """Walk down from the root; return (found, path of keys visited)."""
    path = []
    node = root
    while node is not None:
        path.append(node.key)
        if key == node.key:
            return True, path
        node = node.left if key < node.key else node.right
    return False, path


def delete(root, key):
    """Return the root after removing key (three cases)."""
    if root is None:
        return None
    if key < root.key:
        root.left = delete(root.left, key)
    elif key > root.key:
        root.right = delete(root.right, key)
    else:
        if root.left is None:        # leaf or only a right child
            return root.right
        if root.right is None:       # only a left child
            return root.left
        succ = root.right            # two children: in-order successor
        while succ.left is not None:
            succ = succ.left
        root.key = succ.key
        root.right = delete(root.right, succ.key)
    return root
~~~

**What to point out in this code:**

- Compare with \`is None\`, not \`== None\`: \`None\` is a singleton and \`is\` checks identity.
- \`search\` is a \`while\` loop, not recursion — there is nothing to return on the way back up, so the loop is simpler and uses O(1) extra memory.
- In \`delete\`, the two \`return\` lines for "no left child" and "no right child" also cover the leaf case (both children are \`None\`, so it returns \`None\`).
- Python's default recursion limit is 1000 (\`sys.getrecursionlimit()\` printed 1000 in our run). The recursive \`insert\` above works on balanced trees, but when we fed it the keys 1, 2, 3, ... in sorted order it raised \`RecursionError\` while inserting key 998. Example 2 therefore uses an iterative insert:

~~~python
def insert_iterative(root, key):
    """Insert without recursion, so a 1,023-deep chain cannot overflow the stack."""
    new = Node(key)
    if root is None:
        return new
    node = root
    while True:
        if key < node.key:
            if node.left is None:
                node.left = new
                return root
            node = node.left
        else:
            if node.right is None:
                node.right = new
                return root
            node = node.right


def build_balanced(keys, lo, hi):
    """Sorted keys -> balanced BST: the middle key becomes the root."""
    if lo > hi:
        return None
    mid = (lo + hi) // 2
    node = Node(keys[mid])
    node.left = build_balanced(keys, lo, mid - 1)
    node.right = build_balanced(keys, mid + 1, hi)
    return node
~~~

\`build_balanced\` is the "middle key first" construction from section 5; its recursion depth is only about log2(n), so recursion is safe there. \`(lo + hi) // 2\` is floor division; Python integers never overflow.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 shuffles the keys 1..1023 with a Fisher-Yates shuffle driven by a small deterministic generator (MINSTD, seed 42), so every language builds the same random tree.

**Example 1 — build, search, delete (all three cases) and a duplicate insert** prints:

~~~text
insert order: [8, 3, 10, 1, 6, 14, 4, 7, 13]
in-order:     [1, 3, 4, 6, 7, 8, 10, 13, 14]
level-order:  [8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13]
search 6: found, path [8, 3, 6]
search 5: not found, path [8, 3, 6, 4]
min 1, max 14, height 3
delete 3 (two children): [1, 4, 6, 7, 8, 10, 13, 14]
delete 14 (one child): [1, 4, 6, 7, 8, 10, 13]
delete 1 (leaf): [4, 6, 7, 8, 10, 13]
level-order:  [8, 4, 10, null, 6, null, 13, null, 7]
insert 6 again: [4, 6, 7, 8, 10, 13] (duplicate ignored)
~~~

**Example 2 — the same 1,023 keys in three shapes: sorted, shuffled, balanced** prints:

~~~text
n = 1023 keys
sorted insert:   height 1022, avg comparisons per search 512.00
shuffled insert: height 22, avg comparisons per search 11.99
balanced build:  height 9, avg comparisons per search 9.01
~~~

Reading example 1: the in-order line is sorted, which confirms the BST property after the inserts; the search for 5 ends at 4, the node whose empty left child is where 5 would be inserted. Deleting 3 (two children) copied its successor 4 into its place, which is why the final level-order line has 4 as the left child of 8. Reading example 2: the shape changed the average search cost from 512 comparisons to about 9 for the same 1,023 keys.

## 8. Complexity

| Operation | Balanced BST | Degenerate BST | Why |
| :--- | :--- | :--- | :--- |
| search | O(log n) | O(n) | one comparison per level: 9.01 vs 512 average comparisons in example 2 |
| insert | O(log n) | O(n) | the same walk as search, then one new leaf |
| delete | O(log n) | O(n) | one walk to the node, one more walk to its successor |
| in-order traversal | O(n) | O(n) | every node is visited once |
| min / max | O(log n) | O(n) | walk left (or right) until the end |
| space | O(n) | O(n) | one node per key; recursion adds O(h) stack |

For comparison:

| Alternative | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Python \`bisect.insort\` on a sorted list | O(log n) to find + O(n) to shift | O(n) | binary search finds the slot, but the list must move every later element |
| Hash table lookup | O(1) average | O(n) | no ordering: no min, max, floor or range query |

Here **n** is the number of keys and **h** is the height. "O(log n)" is only true when the tree is balanced — say "O(h)" first, then explain when h is log n. [Big-O notation](/interview-question/what-is-big-o-notation) and [the cost of common operations on arrays, hash maps and balanced trees](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance) have the background.

## 9. Edge Cases

- **Empty tree** — search returns "not found", insert creates the root, delete returns an empty tree. The "return the new root" style handles all three without special code.
- **Deleting the root** — it is just another node; the caller's \`root = delete(root, key)\` picks up the replacement.
- **Duplicates** — decide a policy up front: ignore them (as the examples do: inserting 6 again left the tree unchanged), send them consistently to one side, or keep a count per node.
- **Sorted or nearly sorted input** — the tree degenerates (height 1,022 for 1,023 keys in example 2). Shuffle the input, build it balanced from a sorted array, or use a self-balancing tree.
- **A two-child delete whose successor has a right child** — the successor never has a left child, but it can have a right one; deleting it is the "one child" case, which the recursive call handles.

## Common Pitfalls

- **Checking only the children.** \`node.left.key < node.key < node.right.key\` at every node does not make a BST; the rule is about whole subtrees. See [how to validate a BST](/interview-question/how-do-you-validate-that-a-binary-tree-is-a-bst).
- **Forgetting to re-assign the returned root.** Calling \`insert(root, 5)\` without \`root = ...\` loses the new node when the tree was empty, and \`delete(root, root.key)\` without re-assignment keeps the old root.
- **Recursion on a skewed tree.** Recursive insert on 1, 2, 3, ... raised \`RecursionError\` at key 998 in our run. Use loops for operations that walk a path, or keep the tree balanced.
- **Saying "O(log n)" without a condition.** A plain BST is O(h); it is O(log n) only when balanced.
- **Using a \`dict\` when order matters.** A \`dict\` keeps insertion order, not key order, and has no floor/ceiling; sorting its keys every time costs O(n log n).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A binary tree where every key in a node's left subtree is smaller and every key in its right subtree is larger — whole subtrees, not just children.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Operations:</strong> <span style="color:#f0e2c8;">Search, insert and delete all walk one root-to-leaf path: go left if smaller, right if larger. Delete with two children copies the in-order successor.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">O(h). That is O(log n) when balanced and O(n) when keys arrive sorted — 9 vs 512 average comparisons for 1,023 keys in my run.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Ordering:</strong> <span style="color:#f0e2c8;">In-order traversal returns the keys sorted, which is why BSTs support min, max, floor and range queries that a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> cannot.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">No BST in the stdlib, so I write a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Node</code> class with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is None</code> checks and iterative walks; recursion on a skewed tree hits the 1000-frame limit.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dict</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> gives O(1) average lookup but no order: no smallest key, no next-larger key, no range scan. A BST gives all of those in O(h).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep the tree balanced?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a self-balancing design — AVL or red-black — that rotates nodes on insert/delete so the height stays O(log n). If all keys are known up front, build it from the sorted list by picking the middle key as the root.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you delete a node with two children?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Find the in-order successor (right once, then left to the end), copy its key into the node, then delete the successor from the right subtree; it has at most one child.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about duplicate keys?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pick a policy: ignore them, always send equal keys to one side, or store a count in the node. Mixing sides breaks searches.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did your recursive insert crash on sorted input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sorted input builds a chain of depth n, and Python stops at about 1000 frames by default (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RecursionError</code> at key 998 in my run). An iterative loop fixes it.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Binary tree** | Each node has at most two children, left and right |
| **Binary search tree (BST)** | Left subtree keys smaller, right subtree keys larger, at every node |
| **BST property (invariant)** | The ordering rule that every operation must keep true |
| **Key** | The value the tree is ordered by |
| **In-order successor** | The next larger key; leftmost node of the right subtree |
| **In-order traversal** | Left, node, right — yields a BST's keys sorted |
| **Height** | Edges on the longest root-to-leaf path; operations cost O(h) |
| **Degenerate (skewed) tree** | Every node has one child; height n − 1, behaves like a list |
| **Self-balancing BST** | AVL / red-black: rotations keep the height O(log n) |

---
**Conclusion:** A binary search tree stores keys so that everything smaller is on the left and everything larger is on the right, at every node. Search, insert and delete are all the same walk down one path, so they cost O(h) — about log2(n) for a balanced tree, but n − 1 for keys inserted in sorted order (512 vs 9 average comparisons for 1,023 keys in our run). In Python you write the tree yourself with a small \`Node\` class, prefer loops for path walks because of the 1000-frame recursion limit, and reach for a \`dict\` only when you do not need the keys in order.`,
        examples: [
          {
            label: "BST basics: insert, search, delete (3 cases), in-order",
            code: `class Node:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None


def insert(root, key):
    """Return the root after inserting key; duplicates are ignored."""
    if root is None:
        return Node(key)
    if key < root.key:
        root.left = insert(root.left, key)
    elif key > root.key:
        root.right = insert(root.right, key)
    return root


def search(root, key):
    """Walk down from the root; return (found, path of keys visited)."""
    path = []
    node = root
    while node is not None:
        path.append(node.key)
        if key == node.key:
            return True, path
        node = node.left if key < node.key else node.right
    return False, path


def delete(root, key):
    """Return the root after removing key (three cases)."""
    if root is None:
        return None
    if key < root.key:
        root.left = delete(root.left, key)
    elif key > root.key:
        root.right = delete(root.right, key)
    else:
        if root.left is None:        # leaf or only a right child
            return root.right
        if root.right is None:       # only a left child
            return root.left
        succ = root.right            # two children: in-order successor
        while succ.left is not None:
            succ = succ.left
        root.key = succ.key
        root.right = delete(root.right, succ.key)
    return root


def inorder(node, out):
    if node is not None:
        inorder(node.left, out)
        out.append(node.key)
        inorder(node.right, out)
    return out


def height(node):
    """Edges on the longest root-to-leaf path; empty tree is -1."""
    if node is None:
        return -1
    return 1 + max(height(node.left), height(node.right))


def level_order(root):
    out, queue, i = [], [root], 0
    while i < len(queue):
        node = queue[i]
        i += 1
        if node is None:
            out.append("null")
        else:
            out.append(str(node.key))
            queue.append(node.left)
            queue.append(node.right)
    while out and out[-1] == "null":
        out.pop()
    return "[" + ", ".join(out) + "]"


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


keys = [8, 3, 10, 1, 6, 14, 4, 7, 13]
root = None
for k in keys:
    root = insert(root, k)
print("insert order: " + fmt(keys))
print("in-order:     " + fmt(inorder(root, [])))
print("level-order:  " + level_order(root))
for k in [6, 5]:
    found, path = search(root, k)
    print("search " + str(k) + ": " + ("found" if found else "not found") + ", path " + fmt(path))
lo = root
while lo.left is not None:
    lo = lo.left
hi = root
while hi.right is not None:
    hi = hi.right
print("min " + str(lo.key) + ", max " + str(hi.key) + ", height " + str(height(root)))
for k, case in [(3, "two children"), (14, "one child"), (1, "leaf")]:
    root = delete(root, k)
    print("delete " + str(k) + " (" + case + "): " + fmt(inorder(root, [])))
print("level-order:  " + level_order(root))
root = insert(root, 6)
print("insert 6 again: " + fmt(inorder(root, [])) + " (duplicate ignored)")`,
          },
          {
            label: "Shape experiment: sorted vs shuffled vs balanced (1,023 keys)",
            code: `class Node:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None


def insert_iterative(root, key):
    """Insert without recursion, so a 1,023-deep chain cannot overflow the stack."""
    new = Node(key)
    if root is None:
        return new
    node = root
    while True:
        if key < node.key:
            if node.left is None:
                node.left = new
                return root
            node = node.left
        else:
            if node.right is None:
                node.right = new
                return root
            node = node.right


def build_balanced(keys, lo, hi):
    """Sorted keys -> balanced BST: the middle key becomes the root."""
    if lo > hi:
        return None
    mid = (lo + hi) // 2
    node = Node(keys[mid])
    node.left = build_balanced(keys, lo, mid - 1)
    node.right = build_balanced(keys, mid + 1, hi)
    return node


def height(root):
    """Iterative level-by-level height in edges (no recursion)."""
    if root is None:
        return -1
    level, h = [root], -1
    while level:
        h += 1
        level = [c for n in level for c in (n.left, n.right) if c is not None]
    return h


def comparisons(root, key):
    """How many nodes a search for key looks at."""
    count, node = 0, root
    while node is not None:
        count += 1
        if key == node.key:
            return count
        node = node.left if key < node.key else node.right
    return count


def report(name, root, keys):
    total = sum(comparisons(root, k) for k in keys)
    print(name + "height " + str(height(root)) + ", avg comparisons per search " + "%.2f" % (total / len(keys)))


n = 1023
keys = list(range(1, n + 1))
shuffled = keys[:]
seed = 42
for i in range(n - 1, 0, -1):          # Fisher-Yates with a MINSTD generator
    seed = seed * 48271 % 2147483647
    j = seed % (i + 1)
    shuffled[i], shuffled[j] = shuffled[j], shuffled[i]

sorted_root = None
for k in keys:
    sorted_root = insert_iterative(sorted_root, k)
random_root = None
for k in shuffled:
    random_root = insert_iterative(random_root, k)
balanced_root = build_balanced(keys, 0, n - 1)

print("n = " + str(n) + " keys")
report("sorted insert:   ", sorted_root, keys)
report("shuffled insert: ", random_root, keys)
report("balanced build:  ", balanced_root, keys)`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Explain what a binary search tree is. Then, in JavaScript, show me how search, insert and delete work, and tell me what their running time depends on."

**What a strong answer should cover:**
- The BST property: every key in a node's left subtree is smaller, every key in its right subtree is larger — for the whole subtree, not just the children.
- Search, insert and delete each walk one root-to-leaf path, so they cost O(h), where h is the height.
- The three delete cases (leaf, one child, two children) and the in-order successor.
- In-order traversal visits the keys in sorted order.
- Height is the whole story: about log2(n) when balanced, n − 1 when keys arrive sorted; self-balancing trees (AVL, red-black) keep it O(log n).
- JavaScript specifics: there is no built-in sorted tree (\`Map\` and \`Set\` keep insertion order, not sorted order), \`<\` on strings compares character by character (\`'10' < '9'\` is true), and deep recursion throws \`RangeError\`.

**Code / implementation expected:** Optional — a small \`Node\` class with \`insert\`, \`search\` and \`remove\` in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need to know what a variable, a loop and a function are.  
**Difficulty:** Easy  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Play a guessing game with a friend: they think of a number between 1 and 100, you guess, and they only ever say "higher" or "lower". A smart player never guesses 1, 2, 3...; they guess 50, then 25 or 75, and so on, throwing away half of the remaining numbers with each question. Seven questions are always enough.

Now imagine the numbers are not fixed — your friend keeps adding new ones and crossing old ones out. A sorted list on paper makes the guessing fast but every new number means rewriting everything after it. A **binary search tree** is the answer to "how do I keep the guessing-game speed while numbers come and go?" Each number sits in a little card; every card points to a card of smaller numbers on its left and bigger numbers on its right. To find, add or remove a number, you start at the top card and keep asking "smaller or bigger?" — exactly like the guessing game.

Interviewers ask this question because the BST is the foundation of a whole family of problems — [validating a BST](/interview-question/how-do-you-validate-that-a-binary-tree-is-a-bst), [the kth smallest element](/interview-question/how-do-you-find-the-kth-smallest-element-in-a-bst), [lowest common ancestor](/interview-question/how-do-you-find-the-lowest-common-ancestor-in-a-binary-tree) — and because the honest answer to "how fast is it?" (it depends on the shape) separates people who memorised O(log n) from people who understand it.

## 2. The Rule That Makes It a BST

A **binary tree** is a set of nodes where each node has at most two children, called *left* and *right*. The top node is the **root**; a node with no children is a **leaf**; a node together with everything below it is a **subtree**.

A **binary search tree** adds one rule, and the rule is about whole subtrees, not just children:

> For every node, **every** key in its left subtree is smaller than the node's key, and **every** key in its right subtree is larger.

📌 **Interview term: Binary search tree (BST)** — a binary tree in which every node's key is greater than all keys in its left subtree and smaller than all keys in its right subtree.

📌 **Interview term: BST property (invariant)** — the ordering rule above. An invariant is a fact that must stay true after every operation; insert and delete are written to preserve it.

📌 **Interview term: Key** — the value the tree is ordered by. A node can also carry extra data (a phone number for a name), which makes the BST an ordered map.

Here is the tree built by inserting 8, 3, 10, 1, 6, 14, 4, 7, 13 in that order (the same tree the examples use). The highlighted path is a search for 6:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 320" role="img" aria-label="A binary search tree with root 8. Searching for 6 visits 8, then 3, then 6">
  <path class="d-edge-accent" d="M 300 60 L 200 110"/>
  <path class="d-edge" d="M 340 60 L 440 110"/>
  <path class="d-edge" d="M 166 137 L 124 183"/>
  <path class="d-edge-accent" d="M 194 137 L 236 183"/>
  <path class="d-edge" d="M 474 137 L 516 183"/>
  <path class="d-edge" d="M 240 220 L 220 260"/>
  <path class="d-edge" d="M 260 220 L 280 260"/>
  <path class="d-edge" d="M 520 220 L 500 260"/>
  <circle class="d-box-accent" cx="320" cy="50" r="22"/>
  <text class="d-text" x="320" y="56" text-anchor="middle">8</text>
  <circle class="d-box-accent" cx="180" cy="120" r="22"/>
  <text class="d-text" x="180" y="126" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="460" cy="120" r="22"/>
  <text class="d-text" x="460" y="126" text-anchor="middle">10</text>
  <circle class="d-box-muted" cx="110" cy="200" r="22"/>
  <text class="d-text" x="110" y="206" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="250" cy="200" r="22"/>
  <text class="d-text" x="250" y="206" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="530" cy="200" r="22"/>
  <text class="d-text" x="530" y="206" text-anchor="middle">14</text>
  <circle class="d-box-muted" cx="210" cy="280" r="22"/>
  <text class="d-text" x="210" y="286" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="290" cy="280" r="22"/>
  <text class="d-text" x="290" y="286" text-anchor="middle">7</text>
  <circle class="d-box-muted" cx="490" cy="280" r="22"/>
  <text class="d-text" x="490" y="286" text-anchor="middle">13</text>
  <text class="d-text d-accent" x="20" y="30" text-anchor="start">Search for 6</text>
  <text class="d-sub" x="20" y="54" text-anchor="start">8, then 3, then 6</text>
</svg>

At 8 the search goes left (6 is smaller), at 3 it goes right (6 is bigger), and at 6 it stops. Three nodes looked at out of nine. A search for 5 follows the same path and then falls off the tree to the left of 4 — that is how "not found" is detected, and it is also exactly where \`insert(5)\` would hang the new node.

## 3. The Three Operations

**Search.** Start at the root. If the key matches, stop. If it is smaller, go left; if bigger, go right. If you step onto an empty child, the key is not in the tree.

**Insert.** Do the same walk as search. When you step onto an empty child, put the new node there. A new key always becomes a leaf; nothing else moves. (The examples ignore duplicates; if you need them, pick a side — say "equal keys go right" — or store a count in the node.)

**Delete.** Find the node, then one of three cases applies:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 320" role="img" aria-label="Deleting a node: a node with zero or one child is replaced by its child; a node with two children copies its in-order successor and deletes that successor instead">
  <defs>
    <marker id="b17q1d-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="70" width="150" height="60" rx="8"/>
  <text class="d-text" x="95" y="96" text-anchor="middle">Find the node</text>
  <text class="d-sub" x="95" y="116" text-anchor="middle">walk like search</text>
  <rect class="d-box-muted" x="230" y="70" width="170" height="60" rx="8"/>
  <text class="d-text" x="315" y="96" text-anchor="middle">How many children?</text>
  <text class="d-sub" x="315" y="116" text-anchor="middle">0, 1 or 2</text>
  <rect class="d-box-accent" x="470" y="20" width="210" height="60" rx="8"/>
  <text class="d-text" x="575" y="46" text-anchor="middle">0 or 1 child</text>
  <text class="d-sub" x="575" y="66" text-anchor="middle">replace it by its child</text>
  <rect class="d-box-accent" x="470" y="130" width="210" height="60" rx="8"/>
  <text class="d-text" x="575" y="156" text-anchor="middle">2 children</text>
  <text class="d-sub" x="575" y="176" text-anchor="middle">copy the successor key</text>
  <rect class="d-box" x="470" y="240" width="210" height="60" rx="8"/>
  <text class="d-text" x="575" y="266" text-anchor="middle">Then remove</text>
  <text class="d-sub" x="575" y="286" text-anchor="middle">the successor, lower down</text>
  <path class="d-edge" d="M 170 100 L 226 100" marker-end="url(#b17q1d-arrow)"/>
  <path class="d-edge" d="M 400 88 L 466 56" marker-end="url(#b17q1d-arrow)"/>
  <path class="d-edge" d="M 400 112 L 466 158" marker-end="url(#b17q1d-arrow)"/>
  <path class="d-edge" d="M 575 190 L 575 236" marker-end="url(#b17q1d-arrow)"/>
</svg>

1. **Leaf** — just remove it (its parent's pointer becomes empty).
2. **One child** — the child takes the node's place.
3. **Two children** — find the **in-order successor** (the smallest key in the right subtree: go right once, then left as far as possible), copy its key into this node, then delete the successor from the right subtree. The successor has no left child, so deleting it is always case 1 or 2.

📌 **Interview term: In-order successor** — the next larger key in the tree. For a node with a right subtree it is the leftmost node of that subtree.

Why does the copy keep the BST property? The successor is bigger than everything in the left subtree (it came from the right side) and smaller than everything else in the right subtree (it was the smallest there). So it fits exactly in the deleted node's slot. Using the **in-order predecessor** (largest key of the left subtree) works just as well.

## 4. In-Order Traversal Comes Out Sorted

Visiting *left subtree, then the node, then the right subtree* — an **in-order traversal** — prints a BST's keys in increasing order: everything smaller is printed before the node, everything larger after it. For the tree above that is \`[1, 3, 4, 6, 7, 8, 10, 13, 14]\`. This one fact powers several follow-up questions: a tree is a valid BST exactly when its in-order sequence is strictly increasing, and the kth smallest key is the kth node an in-order walk visits. The full set of traversals is on [the tree traversal page](/interview-question/what-are-the-tree-traversal-methods).

📌 **Interview term: In-order traversal** — visit left subtree, node, right subtree. On a BST it yields the keys in sorted order in O(n) time.

## 5. Shape Is Everything: the Height

Every operation walks one path from the root downwards, so its cost is the length of the longest path — the **height** of the tree. The same keys can produce very different heights depending on the order they arrive in:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Inserting 1, 2, 3, 4, 5 in sorted order builds a chain of height 4">
  <path class="d-edge" d="M 137 61 L 183 89"/>
  <path class="d-edge" d="M 217 111 L 263 139"/>
  <path class="d-edge" d="M 297 161 L 343 189"/>
  <path class="d-edge" d="M 377 211 L 423 239"/>
  <circle class="d-box-muted" cx="120" cy="50" r="20"/>
  <text class="d-text" x="120" y="56" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="200" cy="100" r="20"/>
  <text class="d-text" x="200" y="106" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="280" cy="150" r="20"/>
  <text class="d-text" x="280" y="156" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="360" cy="200" r="20"/>
  <text class="d-text" x="360" y="206" text-anchor="middle">4</text>
  <circle class="d-box-accent" cx="440" cy="250" r="20"/>
  <text class="d-text" x="440" y="256" text-anchor="middle">5</text>
  <text class="d-text" x="600" y="120" text-anchor="end">Sorted inserts</text>
  <text class="d-sub" x="600" y="144" text-anchor="end">height 4</text>
  <text class="d-sub" x="600" y="166" text-anchor="end">a linked list</text>
</svg>

Inserting keys in sorted order makes every new key the right child of the previous one: the tree degenerates into a linked list and search becomes a linear scan.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="The same five keys arranged with the middle key 3 at the root have height 2">
  <path class="d-edge" d="M 303 60 L 217 110"/>
  <path class="d-edge" d="M 337 60 L 423 110"/>
  <path class="d-edge" d="M 212 136 L 248 179"/>
  <path class="d-edge" d="M 452 136 L 488 179"/>
  <circle class="d-box-accent" cx="320" cy="50" r="20"/>
  <text class="d-text" x="320" y="56" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="200" cy="120" r="20"/>
  <text class="d-text" x="200" y="126" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="440" cy="120" r="20"/>
  <text class="d-text" x="440" y="126" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="260" cy="195" r="20"/>
  <text class="d-text" x="260" y="201" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="500" cy="195" r="20"/>
  <text class="d-text" x="500" y="201" text-anchor="middle">5</text>
  <text class="d-text" x="40" y="40" text-anchor="start">Middle key first</text>
  <text class="d-sub" x="40" y="64" text-anchor="start">height 2</text>
</svg>

Putting the middle key at the root (and recursively the middle of each half) gives the shortest possible tree. Example 2 measures this on 1,023 keys: sorted inserts give height 1,022 and 512 comparisons per search on average, a random insertion order gives height 22 and about 12 comparisons, and the perfectly balanced build gives height 9 and about 9 comparisons.

📌 **Interview term: Height** — the number of edges on the longest root-to-leaf path (an empty tree is -1, a single node is 0). BST operations cost O(h).

📌 **Interview term: Degenerate (skewed) tree** — a tree where every node has at most one child, so the height is n − 1 and the tree behaves like a linked list.

📌 **Interview term: Self-balancing BST** — a BST that restructures itself (with rotations) on insert and delete so the height stays O(log n) no matter the insertion order. AVL trees and red-black trees are the two classic designs.

You are rarely asked to code a red-black tree in an interview; you are expected to know that it exists, that it guarantees O(log n), and which library class gives it to you (next section).

## 6. BSTs in JavaScript

**What the language gives you.** JavaScript has no built-in sorted tree. \`Map\` and \`Set\` are keyed collections that iterate in *insertion* order — \`new Map([[5, 'a'], [1, 'b'], [3, 'c']])\` iterates its keys as 5, 1, 3 — so they are not a substitute for a BST when you need sorted order, floor/ceiling queries or range scans (see [how a hash table works](/interview-question/how-does-a-hash-table-work)). In an interview, writing a small \`Node\` class is expected.

**The code.** Example 1 implements the three operations. \`insert\` and \`remove\` *return the new root of the subtree*, and the caller re-assigns it (\`root.left = insert(root.left, key)\`); that one pattern handles "the tree was empty" and "the deleted node was the root" without special cases. (\`delete\` is a reserved word in JavaScript, hence \`remove\`.)

~~~javascript
class Node {
  constructor(key) {
    this.key = key;
    this.left = null;
    this.right = null;
  }
}

// Return the root after inserting key; duplicates are ignored.
function insert(root, key) {
  if (root === null) return new Node(key);
  if (key < root.key) root.left = insert(root.left, key);
  else if (key > root.key) root.right = insert(root.right, key);
  return root;
}

// Walk down from the root; return { found, path of keys visited }.
function search(root, key) {
  const path = [];
  let node = root;
  while (node !== null) {
    path.push(node.key);
    if (key === node.key) return { found: true, path };
    node = key < node.key ? node.left : node.right;
  }
  return { found: false, path };
}

// Return the root after removing key (three cases).
function remove(root, key) {
  if (root === null) return null;
  if (key < root.key) root.left = remove(root.left, key);
  else if (key > root.key) root.right = remove(root.right, key);
  else {
    if (root.left === null) return root.right;   // leaf or only a right child
    if (root.right === null) return root.left;   // only a left child
    let succ = root.right;                       // two children: in-order successor
    while (succ.left !== null) succ = succ.left;
    root.key = succ.key;
    root.right = remove(root.right, succ.key);
  }
  return root;
}
~~~

**What to point out in this code:**

- Children start as \`null\` and every check is \`=== null\`. Mixing \`null\` and \`undefined\` (for example a node created with \`{ key }\` and no \`left\` property) makes \`=== null\` silently false — pick one and initialise it in the constructor.
- \`key < node.key\` is numeric only if both are numbers. With strings JavaScript compares character by character: \`'10' < '9'\` is \`true\` in our run. Keys read from text must be converted with \`Number(...)\` first.
- \`search\` is a \`while\` loop: nothing has to happen on the way back up, so a loop is simpler and uses O(1) memory.
- Deep recursion throws \`RangeError: Maximum call stack size exceeded\`. In our Node.js 22 run a recursive height function failed on a 10,000-node chain. Example 2 therefore inserts iteratively:

~~~javascript
// Insert without recursion, so a 1,023-deep chain cannot overflow the stack.
function insertIterative(root, key) {
  const fresh = new Node(key);
  if (root === null) return fresh;
  let node = root;
  while (true) {
    if (key < node.key) {
      if (node.left === null) { node.left = fresh; return root; }
      node = node.left;
    } else {
      if (node.right === null) { node.right = fresh; return root; }
      node = node.right;
    }
  }
}

// Sorted keys -> balanced BST: the middle key becomes the root.
function buildBalanced(keys, lo, hi) {
  if (lo > hi) return null;
  const mid = Math.floor((lo + hi) / 2);
  const node = new Node(keys[mid]);
  node.left = buildBalanced(keys, lo, mid - 1);
  node.right = buildBalanced(keys, mid + 1, hi);
  return node;
}
~~~

\`buildBalanced\` is the "middle key first" construction from section 5; its recursion depth is only about log2(n). \`Math.floor((lo + hi) / 2)\` is needed because \`/\` always produces a floating-point result in JavaScript.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 shuffles the keys 1..1023 with a Fisher-Yates shuffle driven by a small deterministic generator (MINSTD, seed 42), so every language builds the same random tree.

**Example 1 — build, search, delete (all three cases) and a duplicate insert** prints:

~~~text
insert order: [8, 3, 10, 1, 6, 14, 4, 7, 13]
in-order:     [1, 3, 4, 6, 7, 8, 10, 13, 14]
level-order:  [8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13]
search 6: found, path [8, 3, 6]
search 5: not found, path [8, 3, 6, 4]
min 1, max 14, height 3
delete 3 (two children): [1, 4, 6, 7, 8, 10, 13, 14]
delete 14 (one child): [1, 4, 6, 7, 8, 10, 13]
delete 1 (leaf): [4, 6, 7, 8, 10, 13]
level-order:  [8, 4, 10, null, 6, null, 13, null, 7]
insert 6 again: [4, 6, 7, 8, 10, 13] (duplicate ignored)
~~~

**Example 2 — the same 1,023 keys in three shapes: sorted, shuffled, balanced** prints:

~~~text
n = 1023 keys
sorted insert:   height 1022, avg comparisons per search 512.00
shuffled insert: height 22, avg comparisons per search 11.99
balanced build:  height 9, avg comparisons per search 9.01
~~~

Reading example 1: the in-order line is sorted, which confirms the BST property after the inserts; the search for 5 ends at 4, the node whose empty left child is where 5 would be inserted. Deleting 3 (two children) copied its successor 4 into its place, which is why the final level-order line has 4 as the left child of 8. Reading example 2: the shape changed the average search cost from 512 comparisons to about 9 for the same 1,023 keys.

## 8. Complexity

| Operation | Balanced BST | Degenerate BST | Why |
| :--- | :--- | :--- | :--- |
| search | O(log n) | O(n) | one comparison per level: 9.01 vs 512 average comparisons in example 2 |
| insert | O(log n) | O(n) | the same walk as search, then one new leaf |
| delete | O(log n) | O(n) | one walk to the node, one more walk to its successor |
| in-order traversal | O(n) | O(n) | every node is visited once |
| min / max | O(log n) | O(n) | walk left (or right) until the end |
| space | O(n) | O(n) | one node per key; recursion adds O(h) stack |

For comparison:

| Alternative | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Sorted array + \`splice\` | O(log n) to find + O(n) to shift | O(n) | binary search finds the slot, but \`splice\` moves every later element |
| Hash table lookup | O(1) average | O(n) | no ordering: no min, max, floor or range query |

Here **n** is the number of keys and **h** is the height. "O(log n)" is only true when the tree is balanced — say "O(h)" first, then explain when h is log n. [Big-O notation](/interview-question/what-is-big-o-notation) and [the cost of common operations on arrays, hash maps and balanced trees](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance) have the background.

## 9. Edge Cases

- **Empty tree** — search returns "not found", insert creates the root, delete returns an empty tree. The "return the new root" style handles all three without special code.
- **Deleting the root** — it is just another node; the caller's \`root = delete(root, key)\` picks up the replacement.
- **Duplicates** — decide a policy up front: ignore them (as the examples do: inserting 6 again left the tree unchanged), send them consistently to one side, or keep a count per node.
- **Sorted or nearly sorted input** — the tree degenerates (height 1,022 for 1,023 keys in example 2). Shuffle the input, build it balanced from a sorted array, or use a self-balancing tree.
- **A two-child delete whose successor has a right child** — the successor never has a left child, but it can have a right one; deleting it is the "one child" case, which the recursive call handles.

## Common Pitfalls

- **Checking only the children.** \`node.left.key < node.key < node.right.key\` at every node does not make a BST; the rule is about whole subtrees. See [how to validate a BST](/interview-question/how-do-you-validate-that-a-binary-tree-is-a-bst).
- **Forgetting to re-assign the returned root.** Calling \`insert(root, 5)\` without \`root = ...\` loses the new node when the tree was empty.
- **String keys compared as strings.** \`'10' < '9'\` is \`true\`, so a tree built from text input without \`Number(...)\` is ordered "wrongly" for numbers.
- **\`null\` vs \`undefined\`.** A missing property is \`undefined\`, and \`undefined === null\` is \`false\`; initialise \`left\` and \`right\` to \`null\` in the constructor.
- **Recursion on a skewed tree.** A 10,000-node chain already overflowed the call stack in our Node.js run; walk paths with loops.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A binary tree where every key in a node's left subtree is smaller and every key in its right subtree is larger — whole subtrees, not just children.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Operations:</strong> <span style="color:#f0e2c8;">Search, insert and remove all walk one root-to-leaf path: go left if smaller, right if larger. Removing a node with two children copies the in-order successor.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">O(h). That is O(log n) when balanced and O(n) when keys arrive sorted — 9 vs 512 average comparisons for 1,023 keys in my run.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Ordering:</strong> <span style="color:#f0e2c8;">In-order traversal returns the keys sorted; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> only remembers insertion order, so it cannot answer min, floor or range queries.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">No built-in tree, so I write a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Node</code> class with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">=== null</code> checks; keys must really be numbers because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'10' &lt; '9'</code> is true.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> gives fast lookups but iterates in insertion order: no smallest key, no next-larger key, no range scan. A BST gives all of those in O(h).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep the tree balanced?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a self-balancing design — AVL or red-black — that rotates nodes on insert/delete so the height stays O(log n). If all keys are known up front, build it from the sorted array by picking the middle key as the root.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you remove a node with two children?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Find the in-order successor (right once, then left to the end), copy its key into the node, then remove the successor from the right subtree; it has at most one child.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about duplicate keys?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pick a policy: ignore them, always send equal keys to one side, or store a count in the node.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What breaks on a very deep tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recursion: a 10,000-node chain threw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError: Maximum call stack size exceeded</code> in my Node.js run, so path walks should be loops.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Binary tree** | Each node has at most two children, left and right |
| **Binary search tree (BST)** | Left subtree keys smaller, right subtree keys larger, at every node |
| **BST property (invariant)** | The ordering rule that every operation must keep true |
| **Key** | The value the tree is ordered by |
| **In-order successor** | The next larger key; leftmost node of the right subtree |
| **In-order traversal** | Left, node, right — yields a BST's keys sorted |
| **Height** | Edges on the longest root-to-leaf path; operations cost O(h) |
| **Degenerate (skewed) tree** | Every node has one child; height n − 1, behaves like a list |
| **Self-balancing BST** | AVL / red-black: rotations keep the height O(log n) |

---
**Conclusion:** A binary search tree stores keys so that everything smaller is on the left and everything larger is on the right, at every node. Search, insert and remove are all the same walk down one path, so they cost O(h) — about log2(n) for a balanced tree, but n − 1 for keys inserted in sorted order (512 vs 9 average comparisons for 1,023 keys in our run). In JavaScript you write the tree yourself, make sure keys are real numbers before comparing them, initialise children to \`null\`, and use loops for path walks so a skewed tree cannot overflow the call stack.`,
        examples: [
          {
            label: "BST basics: insert, search, delete (3 cases), in-order",
            code: `class Node {
  constructor(key) {
    this.key = key;
    this.left = null;
    this.right = null;
  }
}

// Return the root after inserting key; duplicates are ignored.
function insert(root, key) {
  if (root === null) return new Node(key);
  if (key < root.key) root.left = insert(root.left, key);
  else if (key > root.key) root.right = insert(root.right, key);
  return root;
}

// Walk down from the root; return { found, path of keys visited }.
function search(root, key) {
  const path = [];
  let node = root;
  while (node !== null) {
    path.push(node.key);
    if (key === node.key) return { found: true, path };
    node = key < node.key ? node.left : node.right;
  }
  return { found: false, path };
}

// Return the root after removing key (three cases).
function remove(root, key) {
  if (root === null) return null;
  if (key < root.key) root.left = remove(root.left, key);
  else if (key > root.key) root.right = remove(root.right, key);
  else {
    if (root.left === null) return root.right;   // leaf or only a right child
    if (root.right === null) return root.left;   // only a left child
    let succ = root.right;                       // two children: in-order successor
    while (succ.left !== null) succ = succ.left;
    root.key = succ.key;
    root.right = remove(root.right, succ.key);
  }
  return root;
}

function inorder(node, out) {
  if (node !== null) {
    inorder(node.left, out);
    out.push(node.key);
    inorder(node.right, out);
  }
  return out;
}

// Edges on the longest root-to-leaf path; empty tree is -1.
function height(node) {
  if (node === null) return -1;
  return 1 + Math.max(height(node.left), height(node.right));
}

function levelOrder(root) {
  const out = [];
  const queue = [root];
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    if (node === null) out.push("null");
    else {
      out.push(String(node.key));
      queue.push(node.left, node.right);
    }
  }
  while (out.length && out[out.length - 1] === "null") out.pop();
  return "[" + out.join(", ") + "]";
}

const fmt = (xs) => "[" + xs.join(", ") + "]";

const keys = [8, 3, 10, 1, 6, 14, 4, 7, 13];
let root = null;
for (const k of keys) root = insert(root, k);
console.log("insert order: " + fmt(keys));
console.log("in-order:     " + fmt(inorder(root, [])));
console.log("level-order:  " + levelOrder(root));
for (const k of [6, 5]) {
  const r = search(root, k);
  console.log("search " + k + ": " + (r.found ? "found" : "not found") + ", path " + fmt(r.path));
}
let lo = root;
while (lo.left !== null) lo = lo.left;
let hi = root;
while (hi.right !== null) hi = hi.right;
console.log("min " + lo.key + ", max " + hi.key + ", height " + height(root));
for (const [k, kind] of [[3, "two children"], [14, "one child"], [1, "leaf"]]) {
  root = remove(root, k);
  console.log("delete " + k + " (" + kind + "): " + fmt(inorder(root, [])));
}
console.log("level-order:  " + levelOrder(root));
root = insert(root, 6);
console.log("insert 6 again: " + fmt(inorder(root, [])) + " (duplicate ignored)");`,
          },
          {
            label: "Shape experiment: sorted vs shuffled vs balanced (1,023 keys)",
            code: `class Node {
  constructor(key) {
    this.key = key;
    this.left = null;
    this.right = null;
  }
}

// Insert without recursion, so a 1,023-deep chain cannot overflow the stack.
function insertIterative(root, key) {
  const fresh = new Node(key);
  if (root === null) return fresh;
  let node = root;
  while (true) {
    if (key < node.key) {
      if (node.left === null) { node.left = fresh; return root; }
      node = node.left;
    } else {
      if (node.right === null) { node.right = fresh; return root; }
      node = node.right;
    }
  }
}

// Sorted keys -> balanced BST: the middle key becomes the root.
function buildBalanced(keys, lo, hi) {
  if (lo > hi) return null;
  const mid = Math.floor((lo + hi) / 2);
  const node = new Node(keys[mid]);
  node.left = buildBalanced(keys, lo, mid - 1);
  node.right = buildBalanced(keys, mid + 1, hi);
  return node;
}

// Iterative level-by-level height in edges (no recursion).
function height(root) {
  if (root === null) return -1;
  let level = [root];
  let h = -1;
  while (level.length > 0) {
    h++;
    const next = [];
    for (const n of level) {
      if (n.left !== null) next.push(n.left);
      if (n.right !== null) next.push(n.right);
    }
    level = next;
  }
  return h;
}

// How many nodes a search for key looks at.
function comparisons(root, key) {
  let count = 0;
  let node = root;
  while (node !== null) {
    count++;
    if (key === node.key) return count;
    node = key < node.key ? node.left : node.right;
  }
  return count;
}

function report(name, root, keys) {
  let total = 0;
  for (const k of keys) total += comparisons(root, k);
  console.log(name + "height " + height(root) + ", avg comparisons per search " + (total / keys.length).toFixed(2));
}

const n = 1023;
const keys = [];
for (let i = 1; i <= n; i++) keys.push(i);
const shuffled = keys.slice();
let seed = 42;
for (let i = n - 1; i > 0; i--) {      // Fisher-Yates with a MINSTD generator
  seed = (seed * 48271) % 2147483647;  // stays below 2^53, so exact
  const j = seed % (i + 1);
  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
}

let sortedRoot = null;
for (const k of keys) sortedRoot = insertIterative(sortedRoot, k);
let randomRoot = null;
for (const k of shuffled) randomRoot = insertIterative(randomRoot, k);
const balancedRoot = buildBalanced(keys, 0, n - 1);

console.log("n = " + n + " keys");
report("sorted insert:   ", sortedRoot, keys);
report("shuffled insert: ", randomRoot, keys);
report("balanced build:  ", balancedRoot, keys);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Explain what a binary search tree is. Then, in Java, show me how search, insert and delete work, tell me what their running time depends on, and where the JDK already gives you one."

**What a strong answer should cover:**
- The BST property: every key in a node's left subtree is smaller, every key in its right subtree is larger — for the whole subtree, not just the children.
- Search, insert and delete each walk one root-to-leaf path, so they cost O(h), where h is the height.
- The three delete cases (leaf, one child, two children) and the in-order successor.
- In-order traversal visits the keys in sorted order.
- Height is the whole story: about log2(n) when balanced, n − 1 when keys arrive sorted; self-balancing trees keep it O(log n).
- Java specifics: \`TreeMap\` / \`TreeSet\` are red-black trees with guaranteed log(n) \`get\`/\`put\`/\`remove\`, plus \`floorKey\`/\`ceilingKey\`; boxed \`Integer\` keys must be compared with \`compareTo\`/\`equals\`, not \`==\`.

**Code / implementation expected:** Optional — a static nested \`Node\` class with \`insert\`, \`search\` and \`delete\` in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need to know what a variable, a loop and a function are.  
**Difficulty:** Easy  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Play a guessing game with a friend: they think of a number between 1 and 100, you guess, and they only ever say "higher" or "lower". A smart player never guesses 1, 2, 3...; they guess 50, then 25 or 75, and so on, throwing away half of the remaining numbers with each question. Seven questions are always enough.

Now imagine the numbers are not fixed — your friend keeps adding new ones and crossing old ones out. A sorted list on paper makes the guessing fast but every new number means rewriting everything after it. A **binary search tree** is the answer to "how do I keep the guessing-game speed while numbers come and go?" Each number sits in a little card; every card points to a card of smaller numbers on its left and bigger numbers on its right. To find, add or remove a number, you start at the top card and keep asking "smaller or bigger?" — exactly like the guessing game.

Interviewers ask this question because the BST is the foundation of a whole family of problems — [validating a BST](/interview-question/how-do-you-validate-that-a-binary-tree-is-a-bst), [the kth smallest element](/interview-question/how-do-you-find-the-kth-smallest-element-in-a-bst), [lowest common ancestor](/interview-question/how-do-you-find-the-lowest-common-ancestor-in-a-binary-tree) — and because the honest answer to "how fast is it?" (it depends on the shape) separates people who memorised O(log n) from people who understand it.

## 2. The Rule That Makes It a BST

A **binary tree** is a set of nodes where each node has at most two children, called *left* and *right*. The top node is the **root**; a node with no children is a **leaf**; a node together with everything below it is a **subtree**.

A **binary search tree** adds one rule, and the rule is about whole subtrees, not just children:

> For every node, **every** key in its left subtree is smaller than the node's key, and **every** key in its right subtree is larger.

📌 **Interview term: Binary search tree (BST)** — a binary tree in which every node's key is greater than all keys in its left subtree and smaller than all keys in its right subtree.

📌 **Interview term: BST property (invariant)** — the ordering rule above. An invariant is a fact that must stay true after every operation; insert and delete are written to preserve it.

📌 **Interview term: Key** — the value the tree is ordered by. A node can also carry extra data (a phone number for a name), which makes the BST an ordered map.

Here is the tree built by inserting 8, 3, 10, 1, 6, 14, 4, 7, 13 in that order (the same tree the examples use). The highlighted path is a search for 6:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 320" role="img" aria-label="A binary search tree with root 8. Searching for 6 visits 8, then 3, then 6">
  <path class="d-edge-accent" d="M 300 60 L 200 110"/>
  <path class="d-edge" d="M 340 60 L 440 110"/>
  <path class="d-edge" d="M 166 137 L 124 183"/>
  <path class="d-edge-accent" d="M 194 137 L 236 183"/>
  <path class="d-edge" d="M 474 137 L 516 183"/>
  <path class="d-edge" d="M 240 220 L 220 260"/>
  <path class="d-edge" d="M 260 220 L 280 260"/>
  <path class="d-edge" d="M 520 220 L 500 260"/>
  <circle class="d-box-accent" cx="320" cy="50" r="22"/>
  <text class="d-text" x="320" y="56" text-anchor="middle">8</text>
  <circle class="d-box-accent" cx="180" cy="120" r="22"/>
  <text class="d-text" x="180" y="126" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="460" cy="120" r="22"/>
  <text class="d-text" x="460" y="126" text-anchor="middle">10</text>
  <circle class="d-box-muted" cx="110" cy="200" r="22"/>
  <text class="d-text" x="110" y="206" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="250" cy="200" r="22"/>
  <text class="d-text" x="250" y="206" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="530" cy="200" r="22"/>
  <text class="d-text" x="530" y="206" text-anchor="middle">14</text>
  <circle class="d-box-muted" cx="210" cy="280" r="22"/>
  <text class="d-text" x="210" y="286" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="290" cy="280" r="22"/>
  <text class="d-text" x="290" y="286" text-anchor="middle">7</text>
  <circle class="d-box-muted" cx="490" cy="280" r="22"/>
  <text class="d-text" x="490" y="286" text-anchor="middle">13</text>
  <text class="d-text d-accent" x="20" y="30" text-anchor="start">Search for 6</text>
  <text class="d-sub" x="20" y="54" text-anchor="start">8, then 3, then 6</text>
</svg>

At 8 the search goes left (6 is smaller), at 3 it goes right (6 is bigger), and at 6 it stops. Three nodes looked at out of nine. A search for 5 follows the same path and then falls off the tree to the left of 4 — that is how "not found" is detected, and it is also exactly where \`insert(5)\` would hang the new node.

## 3. The Three Operations

**Search.** Start at the root. If the key matches, stop. If it is smaller, go left; if bigger, go right. If you step onto an empty child, the key is not in the tree.

**Insert.** Do the same walk as search. When you step onto an empty child, put the new node there. A new key always becomes a leaf; nothing else moves. (The examples ignore duplicates; if you need them, pick a side — say "equal keys go right" — or store a count in the node.)

**Delete.** Find the node, then one of three cases applies:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 320" role="img" aria-label="Deleting a node: a node with zero or one child is replaced by its child; a node with two children copies its in-order successor and deletes that successor instead">
  <defs>
    <marker id="b17q1d-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="70" width="150" height="60" rx="8"/>
  <text class="d-text" x="95" y="96" text-anchor="middle">Find the node</text>
  <text class="d-sub" x="95" y="116" text-anchor="middle">walk like search</text>
  <rect class="d-box-muted" x="230" y="70" width="170" height="60" rx="8"/>
  <text class="d-text" x="315" y="96" text-anchor="middle">How many children?</text>
  <text class="d-sub" x="315" y="116" text-anchor="middle">0, 1 or 2</text>
  <rect class="d-box-accent" x="470" y="20" width="210" height="60" rx="8"/>
  <text class="d-text" x="575" y="46" text-anchor="middle">0 or 1 child</text>
  <text class="d-sub" x="575" y="66" text-anchor="middle">replace it by its child</text>
  <rect class="d-box-accent" x="470" y="130" width="210" height="60" rx="8"/>
  <text class="d-text" x="575" y="156" text-anchor="middle">2 children</text>
  <text class="d-sub" x="575" y="176" text-anchor="middle">copy the successor key</text>
  <rect class="d-box" x="470" y="240" width="210" height="60" rx="8"/>
  <text class="d-text" x="575" y="266" text-anchor="middle">Then remove</text>
  <text class="d-sub" x="575" y="286" text-anchor="middle">the successor, lower down</text>
  <path class="d-edge" d="M 170 100 L 226 100" marker-end="url(#b17q1d-arrow)"/>
  <path class="d-edge" d="M 400 88 L 466 56" marker-end="url(#b17q1d-arrow)"/>
  <path class="d-edge" d="M 400 112 L 466 158" marker-end="url(#b17q1d-arrow)"/>
  <path class="d-edge" d="M 575 190 L 575 236" marker-end="url(#b17q1d-arrow)"/>
</svg>

1. **Leaf** — just remove it (its parent's pointer becomes empty).
2. **One child** — the child takes the node's place.
3. **Two children** — find the **in-order successor** (the smallest key in the right subtree: go right once, then left as far as possible), copy its key into this node, then delete the successor from the right subtree. The successor has no left child, so deleting it is always case 1 or 2.

📌 **Interview term: In-order successor** — the next larger key in the tree. For a node with a right subtree it is the leftmost node of that subtree.

Why does the copy keep the BST property? The successor is bigger than everything in the left subtree (it came from the right side) and smaller than everything else in the right subtree (it was the smallest there). So it fits exactly in the deleted node's slot. Using the **in-order predecessor** (largest key of the left subtree) works just as well.

## 4. In-Order Traversal Comes Out Sorted

Visiting *left subtree, then the node, then the right subtree* — an **in-order traversal** — prints a BST's keys in increasing order: everything smaller is printed before the node, everything larger after it. For the tree above that is \`[1, 3, 4, 6, 7, 8, 10, 13, 14]\`. This one fact powers several follow-up questions: a tree is a valid BST exactly when its in-order sequence is strictly increasing, and the kth smallest key is the kth node an in-order walk visits. The full set of traversals is on [the tree traversal page](/interview-question/what-are-the-tree-traversal-methods).

📌 **Interview term: In-order traversal** — visit left subtree, node, right subtree. On a BST it yields the keys in sorted order in O(n) time.

## 5. Shape Is Everything: the Height

Every operation walks one path from the root downwards, so its cost is the length of the longest path — the **height** of the tree. The same keys can produce very different heights depending on the order they arrive in:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Inserting 1, 2, 3, 4, 5 in sorted order builds a chain of height 4">
  <path class="d-edge" d="M 137 61 L 183 89"/>
  <path class="d-edge" d="M 217 111 L 263 139"/>
  <path class="d-edge" d="M 297 161 L 343 189"/>
  <path class="d-edge" d="M 377 211 L 423 239"/>
  <circle class="d-box-muted" cx="120" cy="50" r="20"/>
  <text class="d-text" x="120" y="56" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="200" cy="100" r="20"/>
  <text class="d-text" x="200" y="106" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="280" cy="150" r="20"/>
  <text class="d-text" x="280" y="156" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="360" cy="200" r="20"/>
  <text class="d-text" x="360" y="206" text-anchor="middle">4</text>
  <circle class="d-box-accent" cx="440" cy="250" r="20"/>
  <text class="d-text" x="440" y="256" text-anchor="middle">5</text>
  <text class="d-text" x="600" y="120" text-anchor="end">Sorted inserts</text>
  <text class="d-sub" x="600" y="144" text-anchor="end">height 4</text>
  <text class="d-sub" x="600" y="166" text-anchor="end">a linked list</text>
</svg>

Inserting keys in sorted order makes every new key the right child of the previous one: the tree degenerates into a linked list and search becomes a linear scan.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="The same five keys arranged with the middle key 3 at the root have height 2">
  <path class="d-edge" d="M 303 60 L 217 110"/>
  <path class="d-edge" d="M 337 60 L 423 110"/>
  <path class="d-edge" d="M 212 136 L 248 179"/>
  <path class="d-edge" d="M 452 136 L 488 179"/>
  <circle class="d-box-accent" cx="320" cy="50" r="20"/>
  <text class="d-text" x="320" y="56" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="200" cy="120" r="20"/>
  <text class="d-text" x="200" y="126" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="440" cy="120" r="20"/>
  <text class="d-text" x="440" y="126" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="260" cy="195" r="20"/>
  <text class="d-text" x="260" y="201" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="500" cy="195" r="20"/>
  <text class="d-text" x="500" y="201" text-anchor="middle">5</text>
  <text class="d-text" x="40" y="40" text-anchor="start">Middle key first</text>
  <text class="d-sub" x="40" y="64" text-anchor="start">height 2</text>
</svg>

Putting the middle key at the root (and recursively the middle of each half) gives the shortest possible tree. Example 2 measures this on 1,023 keys: sorted inserts give height 1,022 and 512 comparisons per search on average, a random insertion order gives height 22 and about 12 comparisons, and the perfectly balanced build gives height 9 and about 9 comparisons.

📌 **Interview term: Height** — the number of edges on the longest root-to-leaf path (an empty tree is -1, a single node is 0). BST operations cost O(h).

📌 **Interview term: Degenerate (skewed) tree** — a tree where every node has at most one child, so the height is n − 1 and the tree behaves like a linked list.

📌 **Interview term: Self-balancing BST** — a BST that restructures itself (with rotations) on insert and delete so the height stays O(log n) no matter the insertion order. AVL trees and red-black trees are the two classic designs.

You are rarely asked to code a red-black tree in an interview; you are expected to know that it exists, that it guarantees O(log n), and which library class gives it to you (next section).

## 6. BSTs in Java

**What the JDK gives you.** \`java.util.TreeMap\` and \`TreeSet\` are BSTs you can use directly. The [TreeMap Javadoc](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/TreeMap.html) describes it as "a Red-Black tree based NavigableMap implementation" that "provides guaranteed log(n) time cost for the containsKey, get, put and remove operations". On top of plain lookups it answers ordered questions a hash map cannot: \`firstKey()\`, \`lastKey()\`, \`floorKey(x)\` (largest key ≤ x), \`ceilingKey(x)\` (smallest key ≥ x) and range views like \`headMap\`/\`subMap\`. In an interview you are usually asked to write the tree yourself first, then mention \`TreeMap\` for production.

**The code.** Example 1 implements the three operations with a static nested \`Node\` class. \`insert\` and \`delete\` *return the new root of the subtree*, and the caller re-assigns it (\`root.left = insert(root.left, key)\`); that one pattern handles "the tree was empty" and "the deleted node was the root" without special cases.

~~~java
static class Node {
    int key;
    Node left, right;
    Node(int key) { this.key = key; }
}

/** Return the root after inserting key; duplicates are ignored. */
static Node insert(Node root, int key) {
    if (root == null) return new Node(key);
    if (key < root.key) root.left = insert(root.left, key);
    else if (key > root.key) root.right = insert(root.right, key);
    return root;
}

/** Walk down from the root, recording the keys visited; true if found. */
static boolean search(Node root, int key, List<Integer> path) {
    Node node = root;
    while (node != null) {
        path.add(node.key);
        if (key == node.key) return true;
        node = key < node.key ? node.left : node.right;
    }
    return false;
}

/** Return the root after removing key (three cases). */
static Node delete(Node root, int key) {
    if (root == null) return null;
    if (key < root.key) root.left = delete(root.left, key);
    else if (key > root.key) root.right = delete(root.right, key);
    else {
        if (root.left == null) return root.right;   // leaf or only a right child
        if (root.right == null) return root.left;   // only a left child
        Node succ = root.right;                     // two children: in-order successor
        while (succ.left != null) succ = succ.left;
        root.key = succ.key;
        root.right = delete(root.right, succ.key);
    }
    return root;
}
~~~

**What to point out in this code:**

- The keys are primitive \`int\`, so \`==\` and \`<\` compare values. If you make the tree generic (\`Node<K extends Comparable<K>>\`) or use \`Integer\` keys, compare with \`compareTo\` / \`equals\`: \`==\` on two \`Integer\` objects compares references. In our run \`Integer x = 1000, y = 1000; x == y\` printed \`false\`, while the same test with 100 printed \`true\` (small values come from a cache) — the kind of bug that passes small tests.
- \`search\` is a \`while\` loop: nothing has to happen on the way back up, so a loop is simpler and uses O(1) memory.
- Recursion depth is limited by the thread stack. In our OpenJDK 21 run with default settings, a recursive height function handled a 10,000-node chain but threw \`StackOverflowError\` on a 100,000-node chain. Example 2 therefore inserts iteratively:

~~~java
/** Insert without recursion, so a 1,023-deep chain cannot overflow the stack. */
static Node insertIterative(Node root, int key) {
    Node fresh = new Node(key);
    if (root == null) return fresh;
    Node node = root;
    while (true) {
        if (key < node.key) {
            if (node.left == null) { node.left = fresh; return root; }
            node = node.left;
        } else {
            if (node.right == null) { node.right = fresh; return root; }
            node = node.right;
        }
    }
}

/** Sorted keys -> balanced BST: the middle key becomes the root. */
static Node buildBalanced(int[] keys, int lo, int hi) {
    if (lo > hi) return null;
    int mid = lo + (hi - lo) / 2;   // avoids int overflow of lo + hi
    Node node = new Node(keys[mid]);
    node.left = buildBalanced(keys, lo, mid - 1);
    node.right = buildBalanced(keys, mid + 1, hi);
    return node;
}
~~~

\`buildBalanced\` is the "middle key first" construction from section 5; its recursion depth is only about log2(n). \`lo + (hi - lo) / 2\` is the overflow-safe midpoint: \`(lo + hi) / 2\` overflows \`int\` when both are above about 1.07 billion.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 shuffles the keys 1..1023 with a Fisher-Yates shuffle driven by a small deterministic generator (MINSTD, seed 42), so every language builds the same random tree.

**Example 1 — build, search, delete (all three cases) and a duplicate insert** prints:

~~~text
insert order: [8, 3, 10, 1, 6, 14, 4, 7, 13]
in-order:     [1, 3, 4, 6, 7, 8, 10, 13, 14]
level-order:  [8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13]
search 6: found, path [8, 3, 6]
search 5: not found, path [8, 3, 6, 4]
min 1, max 14, height 3
delete 3 (two children): [1, 4, 6, 7, 8, 10, 13, 14]
delete 14 (one child): [1, 4, 6, 7, 8, 10, 13]
delete 1 (leaf): [4, 6, 7, 8, 10, 13]
level-order:  [8, 4, 10, null, 6, null, 13, null, 7]
insert 6 again: [4, 6, 7, 8, 10, 13] (duplicate ignored)
~~~

**Example 2 — the same 1,023 keys in three shapes: sorted, shuffled, balanced** prints:

~~~text
n = 1023 keys
sorted insert:   height 1022, avg comparisons per search 512.00
shuffled insert: height 22, avg comparisons per search 11.99
balanced build:  height 9, avg comparisons per search 9.01
~~~

Reading example 1: the in-order line is sorted, which confirms the BST property after the inserts; the search for 5 ends at 4, the node whose empty left child is where 5 would be inserted. Deleting 3 (two children) copied its successor 4 into its place, which is why the final level-order line has 4 as the left child of 8. Reading example 2: the shape changed the average search cost from 512 comparisons to about 9 for the same 1,023 keys.

## 8. Complexity

| Operation | Balanced BST | Degenerate BST | Why |
| :--- | :--- | :--- | :--- |
| search | O(log n) | O(n) | one comparison per level: 9.01 vs 512 average comparisons in example 2 |
| insert | O(log n) | O(n) | the same walk as search, then one new leaf |
| delete | O(log n) | O(n) | one walk to the node, one more walk to its successor |
| in-order traversal | O(n) | O(n) | every node is visited once |
| min / max | O(log n) | O(n) | walk left (or right) until the end |
| space | O(n) | O(n) | one node per key; recursion adds O(h) stack |

For comparison:

| Alternative | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| \`TreeMap.get\` / \`put\` / \`remove\` | O(log n) guaranteed | O(n) | red-black tree: height stays O(log n) (Javadoc) |
| Hash table lookup | O(1) average | O(n) | no ordering: no min, max, floor or range query |

Here **n** is the number of keys and **h** is the height. "O(log n)" is only true when the tree is balanced — say "O(h)" first, then explain when h is log n. [Big-O notation](/interview-question/what-is-big-o-notation) and [the cost of common operations on arrays, hash maps and balanced trees](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance) have the background.

## 9. Edge Cases

- **Empty tree** — search returns "not found", insert creates the root, delete returns an empty tree. The "return the new root" style handles all three without special code.
- **Deleting the root** — it is just another node; the caller's \`root = delete(root, key)\` picks up the replacement.
- **Duplicates** — decide a policy up front: ignore them (as the examples do: inserting 6 again left the tree unchanged), send them consistently to one side, or keep a count per node.
- **Sorted or nearly sorted input** — the tree degenerates (height 1,022 for 1,023 keys in example 2). Shuffle the input, build it balanced from a sorted array, or use a self-balancing tree.
- **A two-child delete whose successor has a right child** — the successor never has a left child, but it can have a right one; deleting it is the "one child" case, which the recursive call handles.

## Common Pitfalls

- **Checking only the children.** \`node.left.key < node.key < node.right.key\` at every node does not make a BST; the rule is about whole subtrees. See [how to validate a BST](/interview-question/how-do-you-validate-that-a-binary-tree-is-a-bst).
- **Forgetting to re-assign the returned root.** Calling \`insert(root, 5)\` without \`root = ...\` loses the new node when the tree was empty.
- **\`==\` on boxed keys.** With \`Integer\` or generic keys, \`==\` compares references; \`1000 == 1000\` on two \`Integer\` objects printed \`false\` in our run. Use \`compareTo\` / \`equals\`.
- **\`(lo + hi) / 2\` overflow** in the balanced build or any binary search over large indexes; use \`lo + (hi - lo) / 2\`.
- **Re-implementing \`TreeMap\` in production.** Hand-written trees are for interviews; real code should use \`TreeMap\` / \`TreeSet\`, which stay balanced.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A binary tree where every key in a node's left subtree is smaller and every key in its right subtree is larger — whole subtrees, not just children.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Operations:</strong> <span style="color:#f0e2c8;">Search, insert and delete all walk one root-to-leaf path: go left if smaller, right if larger. Delete with two children copies the in-order successor.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">O(h). That is O(log n) when balanced and O(n) when keys arrive sorted — 9 vs 512 average comparisons for 1,023 keys in my run.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Ordering:</strong> <span style="color:#f0e2c8;">In-order traversal returns the keys sorted, which is why BSTs answer min, max, floor, ceiling and range queries that a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> cannot.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">In production I would use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeMap</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeSet</code>: a red-black tree with guaranteed log(n) <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove</code>, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">floorKey</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ceilingKey</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> gives O(1) average lookup but no order: no smallest key, no next-larger key, no range scan. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeMap</code> gives all of those in O(log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">TreeMap</code> stay balanced?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a red-black tree: every insert or remove may recolour nodes and do a few rotations, which keeps the height O(log n) regardless of insertion order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you delete a node with two children?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Find the in-order successor (right once, then left to the end), copy its key into the node, then delete the successor from the right subtree; it has at most one child.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes if the keys are <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Integer</code> or generic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">compareTo</code> (or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Comparator</code>), and test equality with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">compareTo == 0</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> compares references and failed for 1000 in my run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What breaks on a very deep tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recursion: with default settings a 100,000-node chain threw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code> in my run, so path walks should be loops.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Binary tree** | Each node has at most two children, left and right |
| **Binary search tree (BST)** | Left subtree keys smaller, right subtree keys larger, at every node |
| **BST property (invariant)** | The ordering rule that every operation must keep true |
| **Key** | The value the tree is ordered by |
| **In-order successor** | The next larger key; leftmost node of the right subtree |
| **In-order traversal** | Left, node, right — yields a BST's keys sorted |
| **Height** | Edges on the longest root-to-leaf path; operations cost O(h) |
| **Degenerate (skewed) tree** | Every node has one child; height n − 1, behaves like a list |
| **Self-balancing BST** | AVL / red-black: rotations keep the height O(log n) |

---
**Conclusion:** A binary search tree stores keys so that everything smaller is on the left and everything larger is on the right, at every node. Search, insert and delete are all the same walk down one path, so they cost O(h) — about log2(n) for a balanced tree, but n − 1 for keys inserted in sorted order (512 vs 9 average comparisons for 1,023 keys in our run). In Java you can write the tree with a static nested \`Node\` class for the interview, and in real code use \`TreeMap\` / \`TreeSet\`, red-black trees with guaranteed log(n) operations and ordered queries like \`floorKey\`.`,
        examples: [
          {
            label: "BST basics: insert, search, delete (3 cases), in-order",
            code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    static class Node {
        int key;
        Node left, right;
        Node(int key) { this.key = key; }
    }

    /** Return the root after inserting key; duplicates are ignored. */
    static Node insert(Node root, int key) {
        if (root == null) return new Node(key);
        if (key < root.key) root.left = insert(root.left, key);
        else if (key > root.key) root.right = insert(root.right, key);
        return root;
    }

    /** Walk down from the root, recording the keys visited; true if found. */
    static boolean search(Node root, int key, List<Integer> path) {
        Node node = root;
        while (node != null) {
            path.add(node.key);
            if (key == node.key) return true;
            node = key < node.key ? node.left : node.right;
        }
        return false;
    }

    /** Return the root after removing key (three cases). */
    static Node delete(Node root, int key) {
        if (root == null) return null;
        if (key < root.key) root.left = delete(root.left, key);
        else if (key > root.key) root.right = delete(root.right, key);
        else {
            if (root.left == null) return root.right;   // leaf or only a right child
            if (root.right == null) return root.left;   // only a left child
            Node succ = root.right;                     // two children: in-order successor
            while (succ.left != null) succ = succ.left;
            root.key = succ.key;
            root.right = delete(root.right, succ.key);
        }
        return root;
    }

    static List<Integer> inorder(Node node, List<Integer> out) {
        if (node != null) {
            inorder(node.left, out);
            out.add(node.key);
            inorder(node.right, out);
        }
        return out;
    }

    /** Edges on the longest root-to-leaf path; empty tree is -1. */
    static int height(Node node) {
        if (node == null) return -1;
        return 1 + Math.max(height(node.left), height(node.right));
    }

    static String levelOrder(Node root) {
        List<String> out = new ArrayList<>();
        List<Node> queue = new ArrayList<>();
        queue.add(root);
        for (int i = 0; i < queue.size(); i++) {
            Node node = queue.get(i);
            if (node == null) out.add("null");
            else {
                out.add(String.valueOf(node.key));
                queue.add(node.left);
                queue.add(node.right);
            }
        }
        while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
        return "[" + String.join(", ", out) + "]";
    }

    static String fmt(List<Integer> xs) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < xs.size(); i++) sb.append(i > 0 ? ", " : "").append(xs.get(i));
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        int[] keys = {8, 3, 10, 1, 6, 14, 4, 7, 13};
        Node root = null;
        List<Integer> order = new ArrayList<>();
        for (int k : keys) { root = insert(root, k); order.add(k); }
        System.out.println("insert order: " + fmt(order));
        System.out.println("in-order:     " + fmt(inorder(root, new ArrayList<>())));
        System.out.println("level-order:  " + levelOrder(root));
        for (int k : new int[] {6, 5}) {
            List<Integer> path = new ArrayList<>();
            boolean found = search(root, k, path);
            System.out.println("search " + k + ": " + (found ? "found" : "not found") + ", path " + fmt(path));
        }
        Node lo = root;
        while (lo.left != null) lo = lo.left;
        Node hi = root;
        while (hi.right != null) hi = hi.right;
        System.out.println("min " + lo.key + ", max " + hi.key + ", height " + height(root));
        int[] del = {3, 14, 1};
        String[] kind = {"two children", "one child", "leaf"};
        for (int i = 0; i < del.length; i++) {
            root = delete(root, del[i]);
            System.out.println("delete " + del[i] + " (" + kind[i] + "): " + fmt(inorder(root, new ArrayList<>())));
        }
        System.out.println("level-order:  " + levelOrder(root));
        root = insert(root, 6);
        System.out.println("insert 6 again: " + fmt(inorder(root, new ArrayList<>())) + " (duplicate ignored)");
    }
}`,
          },
          {
            label: "Shape experiment: sorted vs shuffled vs balanced (1,023 keys)",
            code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    static class Node {
        int key;
        Node left, right;
        Node(int key) { this.key = key; }
    }

    /** Insert without recursion, so a 1,023-deep chain cannot overflow the stack. */
    static Node insertIterative(Node root, int key) {
        Node fresh = new Node(key);
        if (root == null) return fresh;
        Node node = root;
        while (true) {
            if (key < node.key) {
                if (node.left == null) { node.left = fresh; return root; }
                node = node.left;
            } else {
                if (node.right == null) { node.right = fresh; return root; }
                node = node.right;
            }
        }
    }

    /** Sorted keys -> balanced BST: the middle key becomes the root. */
    static Node buildBalanced(int[] keys, int lo, int hi) {
        if (lo > hi) return null;
        int mid = lo + (hi - lo) / 2;   // avoids int overflow of lo + hi
        Node node = new Node(keys[mid]);
        node.left = buildBalanced(keys, lo, mid - 1);
        node.right = buildBalanced(keys, mid + 1, hi);
        return node;
    }

    /** Iterative level-by-level height in edges (no recursion). */
    static int height(Node root) {
        if (root == null) return -1;
        List<Node> level = new ArrayList<>();
        level.add(root);
        int h = -1;
        while (!level.isEmpty()) {
            h++;
            List<Node> next = new ArrayList<>();
            for (Node n : level) {
                if (n.left != null) next.add(n.left);
                if (n.right != null) next.add(n.right);
            }
            level = next;
        }
        return h;
    }

    /** How many nodes a search for key looks at. */
    static int comparisons(Node root, int key) {
        int count = 0;
        Node node = root;
        while (node != null) {
            count++;
            if (key == node.key) return count;
            node = key < node.key ? node.left : node.right;
        }
        return count;
    }

    static void report(String name, Node root, int[] keys) {
        long total = 0;
        for (int k : keys) total += comparisons(root, k);
        System.out.println(name + "height " + height(root) + ", avg comparisons per search "
                + String.format("%.2f", (double) total / keys.length));
    }

    public static void main(String[] args) {
        int n = 1023;
        int[] keys = new int[n];
        for (int i = 0; i < n; i++) keys[i] = i + 1;
        int[] shuffled = keys.clone();
        long seed = 42;
        for (int i = n - 1; i > 0; i--) {       // Fisher-Yates with a MINSTD generator
            seed = seed * 48271 % 2147483647L;  // long: the product overflows int
            int j = (int) (seed % (i + 1));
            int t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
        }
        Node sortedRoot = null;
        for (int k : keys) sortedRoot = insertIterative(sortedRoot, k);
        Node randomRoot = null;
        for (int k : shuffled) randomRoot = insertIterative(randomRoot, k);
        Node balancedRoot = buildBalanced(keys, 0, n - 1);

        System.out.println("n = " + n + " keys");
        report("sorted insert:   ", sortedRoot, keys);
        report("shuffled insert: ", randomRoot, keys);
        report("balanced build:  ", balancedRoot, keys);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Explain what a binary search tree is. Then, in C++, show me how search, insert and delete work, tell me what their running time depends on, and where the standard library already gives you one."

**What a strong answer should cover:**
- The BST property: every key in a node's left subtree is smaller, every key in its right subtree is larger — for the whole subtree, not just the children.
- Search, insert and delete each walk one root-to-leaf path, so they cost O(h), where h is the height.
- The three delete cases (leaf, one child, two children) and the in-order successor.
- In-order traversal visits the keys in sorted order.
- Height is the whole story: about log2(n) when balanced, n − 1 when keys arrive sorted; self-balancing trees keep it O(log n).
- C++ specifics: \`std::set\` / \`std::map\` are ordered containers with logarithmic operations (GCC builds them on a red-black tree), \`lower_bound\` gives "first key ≥ x", and a hand-written tree must free its nodes (\`delete\` or \`unique_ptr\`).

**Code / implementation expected:** Optional — a \`struct Node\` with \`insert\`, \`search\` and \`erase\` in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you only need to know what a variable, a loop and a function are.  
**Difficulty:** Easy  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Play a guessing game with a friend: they think of a number between 1 and 100, you guess, and they only ever say "higher" or "lower". A smart player never guesses 1, 2, 3...; they guess 50, then 25 or 75, and so on, throwing away half of the remaining numbers with each question. Seven questions are always enough.

Now imagine the numbers are not fixed — your friend keeps adding new ones and crossing old ones out. A sorted list on paper makes the guessing fast but every new number means rewriting everything after it. A **binary search tree** is the answer to "how do I keep the guessing-game speed while numbers come and go?" Each number sits in a little card; every card points to a card of smaller numbers on its left and bigger numbers on its right. To find, add or remove a number, you start at the top card and keep asking "smaller or bigger?" — exactly like the guessing game.

Interviewers ask this question because the BST is the foundation of a whole family of problems — [validating a BST](/interview-question/how-do-you-validate-that-a-binary-tree-is-a-bst), [the kth smallest element](/interview-question/how-do-you-find-the-kth-smallest-element-in-a-bst), [lowest common ancestor](/interview-question/how-do-you-find-the-lowest-common-ancestor-in-a-binary-tree) — and because the honest answer to "how fast is it?" (it depends on the shape) separates people who memorised O(log n) from people who understand it.

## 2. The Rule That Makes It a BST

A **binary tree** is a set of nodes where each node has at most two children, called *left* and *right*. The top node is the **root**; a node with no children is a **leaf**; a node together with everything below it is a **subtree**.

A **binary search tree** adds one rule, and the rule is about whole subtrees, not just children:

> For every node, **every** key in its left subtree is smaller than the node's key, and **every** key in its right subtree is larger.

📌 **Interview term: Binary search tree (BST)** — a binary tree in which every node's key is greater than all keys in its left subtree and smaller than all keys in its right subtree.

📌 **Interview term: BST property (invariant)** — the ordering rule above. An invariant is a fact that must stay true after every operation; insert and delete are written to preserve it.

📌 **Interview term: Key** — the value the tree is ordered by. A node can also carry extra data (a phone number for a name), which makes the BST an ordered map.

Here is the tree built by inserting 8, 3, 10, 1, 6, 14, 4, 7, 13 in that order (the same tree the examples use). The highlighted path is a search for 6:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 320" role="img" aria-label="A binary search tree with root 8. Searching for 6 visits 8, then 3, then 6">
  <path class="d-edge-accent" d="M 300 60 L 200 110"/>
  <path class="d-edge" d="M 340 60 L 440 110"/>
  <path class="d-edge" d="M 166 137 L 124 183"/>
  <path class="d-edge-accent" d="M 194 137 L 236 183"/>
  <path class="d-edge" d="M 474 137 L 516 183"/>
  <path class="d-edge" d="M 240 220 L 220 260"/>
  <path class="d-edge" d="M 260 220 L 280 260"/>
  <path class="d-edge" d="M 520 220 L 500 260"/>
  <circle class="d-box-accent" cx="320" cy="50" r="22"/>
  <text class="d-text" x="320" y="56" text-anchor="middle">8</text>
  <circle class="d-box-accent" cx="180" cy="120" r="22"/>
  <text class="d-text" x="180" y="126" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="460" cy="120" r="22"/>
  <text class="d-text" x="460" y="126" text-anchor="middle">10</text>
  <circle class="d-box-muted" cx="110" cy="200" r="22"/>
  <text class="d-text" x="110" y="206" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="250" cy="200" r="22"/>
  <text class="d-text" x="250" y="206" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="530" cy="200" r="22"/>
  <text class="d-text" x="530" y="206" text-anchor="middle">14</text>
  <circle class="d-box-muted" cx="210" cy="280" r="22"/>
  <text class="d-text" x="210" y="286" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="290" cy="280" r="22"/>
  <text class="d-text" x="290" y="286" text-anchor="middle">7</text>
  <circle class="d-box-muted" cx="490" cy="280" r="22"/>
  <text class="d-text" x="490" y="286" text-anchor="middle">13</text>
  <text class="d-text d-accent" x="20" y="30" text-anchor="start">Search for 6</text>
  <text class="d-sub" x="20" y="54" text-anchor="start">8, then 3, then 6</text>
</svg>

At 8 the search goes left (6 is smaller), at 3 it goes right (6 is bigger), and at 6 it stops. Three nodes looked at out of nine. A search for 5 follows the same path and then falls off the tree to the left of 4 — that is how "not found" is detected, and it is also exactly where \`insert(5)\` would hang the new node.

## 3. The Three Operations

**Search.** Start at the root. If the key matches, stop. If it is smaller, go left; if bigger, go right. If you step onto an empty child, the key is not in the tree.

**Insert.** Do the same walk as search. When you step onto an empty child, put the new node there. A new key always becomes a leaf; nothing else moves. (The examples ignore duplicates; if you need them, pick a side — say "equal keys go right" — or store a count in the node.)

**Delete.** Find the node, then one of three cases applies:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 320" role="img" aria-label="Deleting a node: a node with zero or one child is replaced by its child; a node with two children copies its in-order successor and deletes that successor instead">
  <defs>
    <marker id="b17q1d-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="70" width="150" height="60" rx="8"/>
  <text class="d-text" x="95" y="96" text-anchor="middle">Find the node</text>
  <text class="d-sub" x="95" y="116" text-anchor="middle">walk like search</text>
  <rect class="d-box-muted" x="230" y="70" width="170" height="60" rx="8"/>
  <text class="d-text" x="315" y="96" text-anchor="middle">How many children?</text>
  <text class="d-sub" x="315" y="116" text-anchor="middle">0, 1 or 2</text>
  <rect class="d-box-accent" x="470" y="20" width="210" height="60" rx="8"/>
  <text class="d-text" x="575" y="46" text-anchor="middle">0 or 1 child</text>
  <text class="d-sub" x="575" y="66" text-anchor="middle">replace it by its child</text>
  <rect class="d-box-accent" x="470" y="130" width="210" height="60" rx="8"/>
  <text class="d-text" x="575" y="156" text-anchor="middle">2 children</text>
  <text class="d-sub" x="575" y="176" text-anchor="middle">copy the successor key</text>
  <rect class="d-box" x="470" y="240" width="210" height="60" rx="8"/>
  <text class="d-text" x="575" y="266" text-anchor="middle">Then remove</text>
  <text class="d-sub" x="575" y="286" text-anchor="middle">the successor, lower down</text>
  <path class="d-edge" d="M 170 100 L 226 100" marker-end="url(#b17q1d-arrow)"/>
  <path class="d-edge" d="M 400 88 L 466 56" marker-end="url(#b17q1d-arrow)"/>
  <path class="d-edge" d="M 400 112 L 466 158" marker-end="url(#b17q1d-arrow)"/>
  <path class="d-edge" d="M 575 190 L 575 236" marker-end="url(#b17q1d-arrow)"/>
</svg>

1. **Leaf** — just remove it (its parent's pointer becomes empty).
2. **One child** — the child takes the node's place.
3. **Two children** — find the **in-order successor** (the smallest key in the right subtree: go right once, then left as far as possible), copy its key into this node, then delete the successor from the right subtree. The successor has no left child, so deleting it is always case 1 or 2.

📌 **Interview term: In-order successor** — the next larger key in the tree. For a node with a right subtree it is the leftmost node of that subtree.

Why does the copy keep the BST property? The successor is bigger than everything in the left subtree (it came from the right side) and smaller than everything else in the right subtree (it was the smallest there). So it fits exactly in the deleted node's slot. Using the **in-order predecessor** (largest key of the left subtree) works just as well.

## 4. In-Order Traversal Comes Out Sorted

Visiting *left subtree, then the node, then the right subtree* — an **in-order traversal** — prints a BST's keys in increasing order: everything smaller is printed before the node, everything larger after it. For the tree above that is \`[1, 3, 4, 6, 7, 8, 10, 13, 14]\`. This one fact powers several follow-up questions: a tree is a valid BST exactly when its in-order sequence is strictly increasing, and the kth smallest key is the kth node an in-order walk visits. The full set of traversals is on [the tree traversal page](/interview-question/what-are-the-tree-traversal-methods).

📌 **Interview term: In-order traversal** — visit left subtree, node, right subtree. On a BST it yields the keys in sorted order in O(n) time.

## 5. Shape Is Everything: the Height

Every operation walks one path from the root downwards, so its cost is the length of the longest path — the **height** of the tree. The same keys can produce very different heights depending on the order they arrive in:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Inserting 1, 2, 3, 4, 5 in sorted order builds a chain of height 4">
  <path class="d-edge" d="M 137 61 L 183 89"/>
  <path class="d-edge" d="M 217 111 L 263 139"/>
  <path class="d-edge" d="M 297 161 L 343 189"/>
  <path class="d-edge" d="M 377 211 L 423 239"/>
  <circle class="d-box-muted" cx="120" cy="50" r="20"/>
  <text class="d-text" x="120" y="56" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="200" cy="100" r="20"/>
  <text class="d-text" x="200" y="106" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="280" cy="150" r="20"/>
  <text class="d-text" x="280" y="156" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="360" cy="200" r="20"/>
  <text class="d-text" x="360" y="206" text-anchor="middle">4</text>
  <circle class="d-box-accent" cx="440" cy="250" r="20"/>
  <text class="d-text" x="440" y="256" text-anchor="middle">5</text>
  <text class="d-text" x="600" y="120" text-anchor="end">Sorted inserts</text>
  <text class="d-sub" x="600" y="144" text-anchor="end">height 4</text>
  <text class="d-sub" x="600" y="166" text-anchor="end">a linked list</text>
</svg>

Inserting keys in sorted order makes every new key the right child of the previous one: the tree degenerates into a linked list and search becomes a linear scan.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="The same five keys arranged with the middle key 3 at the root have height 2">
  <path class="d-edge" d="M 303 60 L 217 110"/>
  <path class="d-edge" d="M 337 60 L 423 110"/>
  <path class="d-edge" d="M 212 136 L 248 179"/>
  <path class="d-edge" d="M 452 136 L 488 179"/>
  <circle class="d-box-accent" cx="320" cy="50" r="20"/>
  <text class="d-text" x="320" y="56" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="200" cy="120" r="20"/>
  <text class="d-text" x="200" y="126" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="440" cy="120" r="20"/>
  <text class="d-text" x="440" y="126" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="260" cy="195" r="20"/>
  <text class="d-text" x="260" y="201" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="500" cy="195" r="20"/>
  <text class="d-text" x="500" y="201" text-anchor="middle">5</text>
  <text class="d-text" x="40" y="40" text-anchor="start">Middle key first</text>
  <text class="d-sub" x="40" y="64" text-anchor="start">height 2</text>
</svg>

Putting the middle key at the root (and recursively the middle of each half) gives the shortest possible tree. Example 2 measures this on 1,023 keys: sorted inserts give height 1,022 and 512 comparisons per search on average, a random insertion order gives height 22 and about 12 comparisons, and the perfectly balanced build gives height 9 and about 9 comparisons.

📌 **Interview term: Height** — the number of edges on the longest root-to-leaf path (an empty tree is -1, a single node is 0). BST operations cost O(h).

📌 **Interview term: Degenerate (skewed) tree** — a tree where every node has at most one child, so the height is n − 1 and the tree behaves like a linked list.

📌 **Interview term: Self-balancing BST** — a BST that restructures itself (with rotations) on insert and delete so the height stays O(log n) no matter the insertion order. AVL trees and red-black trees are the two classic designs.

You are rarely asked to code a red-black tree in an interview; you are expected to know that it exists, that it guarantees O(log n), and which library class gives it to you (next section).

## 6. BSTs in C++

**What the standard library gives you.** \`std::set\` and \`std::map\` (header \`<set>\` / \`<map>\`) are ordered associative containers whose \`find\`, \`insert\` and \`erase\` are logarithmic. The standard specifies the complexity, not the data structure, but GCC's libstdc++ builds \`std::map\` on \`_Rb_tree\`, the red-black tree in \`bits/stl_tree.h\` (we checked the headers shipped with GCC 13.3). They also answer ordered questions a hash map cannot: \`begin()\` is the smallest key, \`lower_bound(x)\` is the first key ≥ x and \`upper_bound(x)\` the first key > x. In an interview you are usually asked to write the tree yourself first, then mention \`std::map\` for production.

**The code.** Example 1 implements the three operations. \`insert\` and \`erase\` *return the new root of the subtree*, and the caller re-assigns it (\`root->left = insert(root->left, key)\`); that one pattern handles "the tree was empty" and "the deleted node was the root" without special cases.

~~~cpp
struct Node {
    int key;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int k) : key(k) {}
};

// Return the root after inserting key; duplicates are ignored.
Node* insert(Node* root, int key) {
    if (root == nullptr) return new Node(key);
    if (key < root->key) root->left = insert(root->left, key);
    else if (key > root->key) root->right = insert(root->right, key);
    return root;
}

// Walk down from the root, recording the keys visited; true if found.
bool search(Node* root, int key, std::vector<int>& path) {
    Node* node = root;
    while (node != nullptr) {
        path.push_back(node->key);
        if (key == node->key) return true;
        node = key < node->key ? node->left : node->right;
    }
    return false;
}

// Return the root after removing key (three cases). Frees the removed node.
Node* erase(Node* root, int key) {
    if (root == nullptr) return nullptr;
    if (key < root->key) root->left = erase(root->left, key);
    else if (key > root->key) root->right = erase(root->right, key);
    else {
        if (root->left == nullptr || root->right == nullptr) {  // leaf or one child
            Node* child = root->left != nullptr ? root->left : root->right;
            delete root;
            return child;
        }
        Node* succ = root->right;                                // two children
        while (succ->left != nullptr) succ = succ->left;
        root->key = succ->key;
        root->right = erase(root->right, succ->key);
    }
    return root;
}
~~~

**What to point out in this code:**

- \`delete\` is a C++ keyword, hence the name \`erase\` (the same name \`std::set\` uses).
- Every \`new\` needs a matching \`delete\`. \`erase\` frees the node it unlinks, and the example frees the whole tree at the end with a post-order \`freeTree\`. Example 2 avoids manual memory management entirely by keeping every node in a \`std::vector<std::unique_ptr<Node>>\` — when the vector is destroyed, so are the nodes.
- \`search\` is a \`while\` loop: nothing has to happen on the way back up, so a loop is simpler and uses O(1) memory.
- Deep recursion has no safety net in C++: overflowing the stack is not an exception, the process just crashes. On our Linux machine (8 MB stack), a recursive height function handled a 100,000-node chain but the 10,000,000-node chain ended with \`Segmentation fault\`. Example 2 therefore inserts iteratively:

~~~cpp
// Insert without recursion, so a 1,023-deep chain cannot overflow the stack.
// Nodes live in a pool (a vector of unique_ptr) so they are freed automatically.
Node* insertIterative(Node* root, int key, std::vector<std::unique_ptr<Node>>& pool) {
    pool.push_back(std::make_unique<Node>(key));
    Node* fresh = pool.back().get();
    if (root == nullptr) return fresh;
    Node* node = root;
    while (true) {
        if (key < node->key) {
            if (node->left == nullptr) { node->left = fresh; return root; }
            node = node->left;
        } else {
            if (node->right == nullptr) { node->right = fresh; return root; }
            node = node->right;
        }
    }
}

// Sorted keys -> balanced BST: the middle key becomes the root.
Node* buildBalanced(const std::vector<int>& keys, int lo, int hi, std::vector<std::unique_ptr<Node>>& pool) {
    if (lo > hi) return nullptr;
    int mid = lo + (hi - lo) / 2;
    pool.push_back(std::make_unique<Node>(keys[mid]));
    Node* node = pool.back().get();
    node->left = buildBalanced(keys, lo, mid - 1, pool);
    node->right = buildBalanced(keys, mid + 1, hi, pool);
    return node;
}
~~~

\`buildBalanced\` is the "middle key first" construction from section 5; its recursion depth is only about log2(n). \`lo + (hi - lo) / 2\` is the overflow-safe midpoint (signed \`int\` overflow is undefined behaviour in C++).

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13.3). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 shuffles the keys 1..1023 with a Fisher-Yates shuffle driven by a small deterministic generator (MINSTD, seed 42), so every language builds the same random tree.

**Example 1 — build, search, delete (all three cases) and a duplicate insert** prints:

~~~text
insert order: [8, 3, 10, 1, 6, 14, 4, 7, 13]
in-order:     [1, 3, 4, 6, 7, 8, 10, 13, 14]
level-order:  [8, 3, 10, 1, 6, null, 14, null, null, 4, 7, 13]
search 6: found, path [8, 3, 6]
search 5: not found, path [8, 3, 6, 4]
min 1, max 14, height 3
delete 3 (two children): [1, 4, 6, 7, 8, 10, 13, 14]
delete 14 (one child): [1, 4, 6, 7, 8, 10, 13]
delete 1 (leaf): [4, 6, 7, 8, 10, 13]
level-order:  [8, 4, 10, null, 6, null, 13, null, 7]
insert 6 again: [4, 6, 7, 8, 10, 13] (duplicate ignored)
~~~

**Example 2 — the same 1,023 keys in three shapes: sorted, shuffled, balanced** prints:

~~~text
n = 1023 keys
sorted insert:   height 1022, avg comparisons per search 512.00
shuffled insert: height 22, avg comparisons per search 11.99
balanced build:  height 9, avg comparisons per search 9.01
~~~

Reading example 1: the in-order line is sorted, which confirms the BST property after the inserts; the search for 5 ends at 4, the node whose empty left child is where 5 would be inserted. Deleting 3 (two children) copied its successor 4 into its place, which is why the final level-order line has 4 as the left child of 8. Reading example 2: the shape changed the average search cost from 512 comparisons to about 9 for the same 1,023 keys.

## 8. Complexity

| Operation | Balanced BST | Degenerate BST | Why |
| :--- | :--- | :--- | :--- |
| search | O(log n) | O(n) | one comparison per level: 9.01 vs 512 average comparisons in example 2 |
| insert | O(log n) | O(n) | the same walk as search, then one new leaf |
| delete | O(log n) | O(n) | one walk to the node, one more walk to its successor |
| in-order traversal | O(n) | O(n) | every node is visited once |
| min / max | O(log n) | O(n) | walk left (or right) until the end |
| space | O(n) | O(n) | one node per key; recursion adds O(h) stack |

For comparison:

| Alternative | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| \`std::map::find\` / \`insert\` / \`erase\` | O(log n) | O(n) | the standard requires logarithmic complexity |
| Hash table lookup | O(1) average | O(n) | no ordering: no min, max, floor or range query |

Here **n** is the number of keys and **h** is the height. "O(log n)" is only true when the tree is balanced — say "O(h)" first, then explain when h is log n. [Big-O notation](/interview-question/what-is-big-o-notation) and [the cost of common operations on arrays, hash maps and balanced trees](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance) have the background.

## 9. Edge Cases

- **Empty tree** — search returns "not found", insert creates the root, delete returns an empty tree. The "return the new root" style handles all three without special code.
- **Deleting the root** — it is just another node; the caller's \`root = delete(root, key)\` picks up the replacement.
- **Duplicates** — decide a policy up front: ignore them (as the examples do: inserting 6 again left the tree unchanged), send them consistently to one side, or keep a count per node.
- **Sorted or nearly sorted input** — the tree degenerates (height 1,022 for 1,023 keys in example 2). Shuffle the input, build it balanced from a sorted array, or use a self-balancing tree.
- **A two-child delete whose successor has a right child** — the successor never has a left child, but it can have a right one; deleting it is the "one child" case, which the recursive call handles.

## Common Pitfalls

- **Checking only the children.** \`node->left->key < node->key < node->right->key\` at every node does not make a BST; the rule is about whole subtrees. See [how to validate a BST](/interview-question/how-do-you-validate-that-a-binary-tree-is-a-bst).
- **Leaking or double-freeing nodes.** Every \`new Node\` needs exactly one \`delete\`; free the unlinked node in \`erase\`, free the tree in post-order, or let \`unique_ptr\` own the nodes.
- **Forgetting to re-assign the returned root.** Calling \`insert(root, 5)\` without \`root = ...\` loses the new node when the tree was empty.
- **Stack overflow is a crash, not an exception.** Recursion on a degenerate tree can end the process with a segmentation fault (it did on a 10,000,000-node chain in our run).
- **Using \`unordered_map\` when order matters.** It has no \`lower_bound\`; \`std::map\` / \`std::set\` do, at O(log n) per operation.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A binary tree where every key in a node's left subtree is smaller and every key in its right subtree is larger — whole subtrees, not just children.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Operations:</strong> <span style="color:#f0e2c8;">Search, insert and erase all walk one root-to-leaf path: go left if smaller, right if larger. Erasing a node with two children copies the in-order successor.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">O(h). That is O(log n) when balanced and O(n) when keys arrive sorted — 9 vs 512 average comparisons for 1,023 keys in my run.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Ordering:</strong> <span style="color:#f0e2c8;">In-order traversal returns the keys sorted, which is why BSTs answer min, max, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lower_bound</code> and range queries that an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> cannot.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">In production I would use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::map</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::set</code> (logarithmic operations, a red-black tree in GCC); by hand I own the memory, so I free nodes or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unique_ptr</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unordered_map</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It gives O(1) average lookup but no order: no smallest key, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lower_bound</code>, no range scan. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::map</code> gives all of those in O(log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::map</code> stay balanced?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In libstdc++ it is a red-black tree: inserts and erases recolour nodes and do a few rotations, keeping the height O(log n). The standard itself only mandates logarithmic complexity.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you erase a node with two children?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Find the in-order successor (right once, then left to the end), copy its key into the node, then erase the successor from the right subtree; it has at most one child.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid leaks in a hand-written tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Free in post-order, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete</code> the node you unlink in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">erase</code>, or let a container of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::unique_ptr&lt;Node&gt;</code> own every node, as example 2 does.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What breaks on a very deep tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recursion: a stack overflow is not an exception in C++, the process crashes (a 10,000,000-node chain segfaulted in my run). Path walks should be loops.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Binary tree** | Each node has at most two children, left and right |
| **Binary search tree (BST)** | Left subtree keys smaller, right subtree keys larger, at every node |
| **BST property (invariant)** | The ordering rule that every operation must keep true |
| **Key** | The value the tree is ordered by |
| **In-order successor** | The next larger key; leftmost node of the right subtree |
| **In-order traversal** | Left, node, right — yields a BST's keys sorted |
| **Height** | Edges on the longest root-to-leaf path; operations cost O(h) |
| **Degenerate (skewed) tree** | Every node has one child; height n − 1, behaves like a list |
| **Self-balancing BST** | AVL / red-black: rotations keep the height O(log n) |

---
**Conclusion:** A binary search tree stores keys so that everything smaller is on the left and everything larger is on the right, at every node. Search, insert and erase are all the same walk down one path, so they cost O(h) — about log2(n) for a balanced tree, but n − 1 for keys inserted in sorted order (512 vs 9 average comparisons for 1,023 keys in our run). In C++ the hand-written tree must manage its memory (\`delete\` or \`unique_ptr\`), and in real code \`std::map\` / \`std::set\` give you a balanced tree with \`lower_bound\` and range iteration for free.`,
        examples: [
          {
            label: "BST basics: insert, search, delete (3 cases), in-order",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct Node {
    int key;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int k) : key(k) {}
};

// Return the root after inserting key; duplicates are ignored.
Node* insert(Node* root, int key) {
    if (root == nullptr) return new Node(key);
    if (key < root->key) root->left = insert(root->left, key);
    else if (key > root->key) root->right = insert(root->right, key);
    return root;
}

// Walk down from the root, recording the keys visited; true if found.
bool search(Node* root, int key, std::vector<int>& path) {
    Node* node = root;
    while (node != nullptr) {
        path.push_back(node->key);
        if (key == node->key) return true;
        node = key < node->key ? node->left : node->right;
    }
    return false;
}

// Return the root after removing key (three cases). Frees the removed node.
Node* erase(Node* root, int key) {
    if (root == nullptr) return nullptr;
    if (key < root->key) root->left = erase(root->left, key);
    else if (key > root->key) root->right = erase(root->right, key);
    else {
        if (root->left == nullptr || root->right == nullptr) {  // leaf or one child
            Node* child = root->left != nullptr ? root->left : root->right;
            delete root;
            return child;
        }
        Node* succ = root->right;                                // two children
        while (succ->left != nullptr) succ = succ->left;
        root->key = succ->key;
        root->right = erase(root->right, succ->key);
    }
    return root;
}

void inorder(Node* node, std::vector<int>& out) {
    if (node == nullptr) return;
    inorder(node->left, out);
    out.push_back(node->key);
    inorder(node->right, out);
}

std::vector<int> inorderOf(Node* root) {
    std::vector<int> out;
    inorder(root, out);
    return out;
}

// Edges on the longest root-to-leaf path; empty tree is -1.
int height(Node* node) {
    if (node == nullptr) return -1;
    return 1 + std::max(height(node->left), height(node->right));
}

std::string levelOrder(Node* root) {
    std::vector<std::string> out;
    std::vector<Node*> queue{root};
    for (size_t i = 0; i < queue.size(); i++) {
        Node* node = queue[i];
        if (node == nullptr) out.push_back("null");
        else {
            out.push_back(std::to_string(node->key));
            queue.push_back(node->left);
            queue.push_back(node->right);
        }
    }
    while (!out.empty() && out.back() == "null") out.pop_back();
    std::string s = "[";
    for (size_t i = 0; i < out.size(); i++) s += (i ? ", " : "") + out[i];
    return s + "]";
}

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

void freeTree(Node* node) {
    if (node == nullptr) return;
    freeTree(node->left);
    freeTree(node->right);
    delete node;
}

int main() {
    std::vector<int> keys{8, 3, 10, 1, 6, 14, 4, 7, 13};
    Node* root = nullptr;
    for (int k : keys) root = insert(root, k);
    std::cout << "insert order: " << fmt(keys) << "\\n";
    std::cout << "in-order:     " << fmt(inorderOf(root)) << "\\n";
    std::cout << "level-order:  " << levelOrder(root) << "\\n";
    for (int k : {6, 5}) {
        std::vector<int> path;
        bool found = search(root, k, path);
        std::cout << "search " << k << ": " << (found ? "found" : "not found") << ", path " << fmt(path) << "\\n";
    }
    Node* lo = root;
    while (lo->left != nullptr) lo = lo->left;
    Node* hi = root;
    while (hi->right != nullptr) hi = hi->right;
    std::cout << "min " << lo->key << ", max " << hi->key << ", height " << height(root) << "\\n";
    std::vector<std::pair<int, std::string>> dels{{3, "two children"}, {14, "one child"}, {1, "leaf"}};
    for (const auto& [k, kind] : dels) {
        root = erase(root, k);
        std::cout << "delete " << k << " (" << kind << "): " << fmt(inorderOf(root)) << "\\n";
    }
    std::cout << "level-order:  " << levelOrder(root) << "\\n";
    root = insert(root, 6);
    std::cout << "insert 6 again: " << fmt(inorderOf(root)) << " (duplicate ignored)\\n";
    freeTree(root);
    return 0;
}`,
          },
          {
            label: "Shape experiment: sorted vs shuffled vs balanced (1,023 keys)",
            code: `#include <cstdio>
#include <iostream>
#include <memory>
#include <string>
#include <utility>
#include <vector>

struct Node {
    int key;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int k) : key(k) {}
};

// Insert without recursion, so a 1,023-deep chain cannot overflow the stack.
// Nodes live in a pool (a vector of unique_ptr) so they are freed automatically.
Node* insertIterative(Node* root, int key, std::vector<std::unique_ptr<Node>>& pool) {
    pool.push_back(std::make_unique<Node>(key));
    Node* fresh = pool.back().get();
    if (root == nullptr) return fresh;
    Node* node = root;
    while (true) {
        if (key < node->key) {
            if (node->left == nullptr) { node->left = fresh; return root; }
            node = node->left;
        } else {
            if (node->right == nullptr) { node->right = fresh; return root; }
            node = node->right;
        }
    }
}

// Sorted keys -> balanced BST: the middle key becomes the root.
Node* buildBalanced(const std::vector<int>& keys, int lo, int hi, std::vector<std::unique_ptr<Node>>& pool) {
    if (lo > hi) return nullptr;
    int mid = lo + (hi - lo) / 2;
    pool.push_back(std::make_unique<Node>(keys[mid]));
    Node* node = pool.back().get();
    node->left = buildBalanced(keys, lo, mid - 1, pool);
    node->right = buildBalanced(keys, mid + 1, hi, pool);
    return node;
}

// Iterative level-by-level height in edges (no recursion).
int height(Node* root) {
    if (root == nullptr) return -1;
    std::vector<Node*> level{root};
    int h = -1;
    while (!level.empty()) {
        h++;
        std::vector<Node*> next;
        for (Node* n : level) {
            if (n->left) next.push_back(n->left);
            if (n->right) next.push_back(n->right);
        }
        level = std::move(next);
    }
    return h;
}

// How many nodes a search for key looks at.
int comparisons(Node* root, int key) {
    int count = 0;
    Node* node = root;
    while (node != nullptr) {
        count++;
        if (key == node->key) return count;
        node = key < node->key ? node->left : node->right;
    }
    return count;
}

void report(const std::string& name, Node* root, const std::vector<int>& keys) {
    long long total = 0;
    for (int k : keys) total += comparisons(root, k);
    char buf[32];
    std::snprintf(buf, sizeof buf, "%.2f", (double)total / keys.size());
    std::cout << name << "height " << height(root) << ", avg comparisons per search " << buf << "\\n";
}

int main() {
    const int n = 1023;
    std::vector<int> keys(n);
    for (int i = 0; i < n; i++) keys[i] = i + 1;
    std::vector<int> shuffled = keys;
    long long seed = 42;
    for (int i = n - 1; i > 0; i--) {     // Fisher-Yates with a MINSTD generator
        seed = seed * 48271 % 2147483647;  // long long: the product overflows int
        int j = (int)(seed % (i + 1));
        std::swap(shuffled[i], shuffled[j]);
    }
    std::vector<std::unique_ptr<Node>> pool;
    Node* sortedRoot = nullptr;
    for (int k : keys) sortedRoot = insertIterative(sortedRoot, k, pool);
    Node* randomRoot = nullptr;
    for (int k : shuffled) randomRoot = insertIterative(randomRoot, k, pool);
    Node* balancedRoot = buildBalanced(keys, 0, n - 1, pool);

    std::cout << "n = " << n << " keys\\n";
    report("sorted insert:   ", sortedRoot, keys);
    report("shuffled insert: ", randomRoot, keys);
    report("balanced build:  ", balancedRoot, keys);
    return 0;
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you validate that a binary tree is a BST?",
    difficulty: "medium",
    seoDescription: "Validate a BST with min/max bounds or a strictly increasing in-order walk, avoiding the INT_MIN sentinel bug. Verified in 4 languages.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given the root of a binary tree. Write a Python function that returns true if it is a valid binary search tree — every key in a node's left subtree is strictly smaller than the node, and every key in its right subtree is strictly larger."

**What a strong answer should cover:**
- Why comparing each node only with its two children is wrong (a deep descendant can break the rule), with a counter-example.
- The range method: pass down an open interval (low, high) that tightens at every step; O(n) time, O(h) space.
- The in-order method: an in-order walk of a BST is strictly increasing, so compare each value with the previous one and stop at the first drop.
- Duplicates: with the strict definition, equal keys make the tree invalid.
- Python specifics: use \`None\` (or \`float('-inf')\` / \`float('inf')\`) for "no bound", and prefer the iterative in-order version on deep trees because recursion stops at about 1000 frames by default.

**Clarifying questions expected:**
- Are duplicate values allowed, and if so on which side?
- How deep can the tree be (is recursion safe)?

**Code / implementation expected:** Yes — a recursive range check or an iterative in-order check with a list as the stack, in Python 3.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree and recursion are.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A library shelves its books by number. Each shelf has a sign: "everything to the left of me is smaller, everything to the right is bigger". A new assistant checks the shelves by looking at each sign and the two books right next to it. Every check passes — and yet a reader still cannot find book 3, because someone put it three shelves to the right of book 5, next to book 6. Book 3 is smaller than its neighbour 6, so the assistant's local check was happy; but it is on the right of 5, where only books bigger than 5 are allowed.

That is exactly the trap in this question. A [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) promises that **every** key in a node's left subtree is smaller and **every** key in its right subtree is larger. Checking parents against children is not enough; each node has to respect the limits set by **all** of its ancestors. Interviewers ask this because the first idea most people have is the assistant's local check, and fixing it shows you understand what the BST property actually says.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are duplicate values allowed? If so, on which side? | The usual definition is strict (\`<\` on the left, \`>\` on the right), so \`[2, 2, 2]\` is **not** a BST. Allowing "equal goes left" changes one comparison. |
| What range can node values take? | If values can be the minimum or maximum 32-bit integer, sentinel bounds like INT_MIN break (see section 6). |
| How many nodes, and how deep? | O(n) is required anyway; depth decides whether recursion is safe or an explicit stack is needed. |
| Is an empty tree valid? | Conventionally yes — there is no node to break the rule. |
| Do you want only true/false, or the first bad node? | The in-order method finds the first out-of-order node naturally. |

## 3. Why Checking Only the Children Fails

The tempting solution: at every node, check \`left.val < node.val < right.val\`, then recurse. Here is a tree where every one of those local checks passes, yet the tree is not a BST:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 310" role="img" aria-label="Tree with root 5, left child 4, right child 6, and 6 has children 3 and 7. Node 3 is in the right subtree of 5 but smaller than 5">
  <path class="d-edge" d="M 301 81 L 199 139"/>
  <path class="d-edge" d="M 339 81 L 441 139"/>
  <path class="d-edge-accent" d="M 446 167 L 404 218"/>
  <path class="d-edge" d="M 474 167 L 516 218"/>
  <circle class="d-box-muted" cx="320" cy="70" r="22"/>
  <text class="d-text" x="320" y="76" text-anchor="middle">5</text>
  <circle class="d-box-muted" cx="180" cy="150" r="22"/>
  <text class="d-text" x="180" y="156" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="460" cy="150" r="22"/>
  <text class="d-text" x="460" y="156" text-anchor="middle">6</text>
  <circle class="d-box-accent" cx="390" cy="235" r="22"/>
  <text class="d-text" x="390" y="241" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="530" cy="235" r="22"/>
  <text class="d-text" x="530" y="241" text-anchor="middle">7</text>
  <text class="d-sub" x="320" y="30" text-anchor="middle">allowed: anything</text>
  <text class="d-sub" x="180" y="196" text-anchor="middle">allowed: below 5</text>
  <text class="d-sub" x="500" y="140" text-anchor="start">allowed: above 5</text>
  <text class="d-text d-accent" x="390" y="282" text-anchor="middle">allowed: 5 to 6</text>
  <text class="d-sub" x="530" y="282" text-anchor="middle">allowed: above 6</text>
</svg>

Node 3 is a fine left child of 6 (3 < 6), so the local check passes. But 3 sits in the right subtree of 5, where every key must be larger than 5. Example 1 runs both checks on this tree (\`[5, 4, 6, null, null, 3, 7]\`): the local check says \`true\`, the correct checks say \`false\`.

The labels show the fix: every node inherits an **allowed range** from its ancestors. Going left from a node lowers the upper limit to that node's value; going right raises the lower limit.

## 4. Approach 1 — Pass Down the Allowed Range

Start at the root with no limits: \`(−∞, +∞)\`. When you go to the left child of a node with value v, the child must be in \`(low, v)\`; when you go to the right child, it must be in \`(v, high)\`. If any node falls outside its range, the tree is invalid.

📌 **Interview term: Valid range (bounds)** — the open interval (low, high) that a node's value must lie in, inherited from its ancestors. Left moves shrink high, right moves raise low.

📌 **Interview term: Top-down recursion** — a recursion that passes information from parent to child through its arguments (here the bounds), instead of combining answers on the way back up.

Each node is checked once against two numbers, so the time is O(n). The recursion is as deep as the tree, so the extra space is O(h): O(log n) for a balanced tree, O(n) for a chain.

## 5. Approach 2 — In-Order Must Be Strictly Increasing

An [in-order traversal](/interview-question/what-are-the-tree-traversal-methods) (left, node, right) of a valid BST lists the keys in sorted order. The reverse is true too: if the in-order sequence is strictly increasing, the tree is a BST. So walk in-order, remember the previous value, and fail as soon as a value is not larger than it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="In-order sequence of the trap tree is 4, 5, 3, 6, 7. The value 3 comes right after 5, so the sequence is not increasing">
  <rect class="d-box-muted" x="50" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="95" y="96" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="160" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="205" y="96" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="270" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="315" y="96" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="380" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="425" y="96" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="490" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="535" y="96" text-anchor="middle">7</text>
  <text class="d-text" x="320" y="32" text-anchor="middle">In-order of the trap tree</text>
  <text class="d-text d-accent" x="315" y="160" text-anchor="middle">3 is not above 5</text>
</svg>

For the trap tree the in-order sequence is 4, 5, 3, 6, 7; the walk stops at 3. Doing it with an explicit stack (instead of recursion) lets it handle very deep trees, and because it stops at the first drop it can finish early — example 2 changes one value in a 5,000-node chain and the walk stops after visiting 4,000 nodes.

📌 **Interview term: Early exit** — returning as soon as the answer is known instead of finishing the traversal. Both methods do it: the range method through short-circuit \`and\`, the in-order method at the first drop.

📌 **Interview term: Strictly increasing** — each value is greater than the one before (no equal neighbours). A BST with the strict definition has a strictly increasing in-order sequence, so duplicates fail.

## 6. The Code in Python

Both methods from example 1. The bounds default to \`None\`, meaning "no limit on that side":

~~~python
def is_valid_range(node, lo=None, hi=None):
    """Every node must lie strictly inside (lo, hi); None means unbounded."""
    if node is None:
        return True
    if (lo is not None and node.val <= lo) or (hi is not None and node.val >= hi):
        return False
    return (is_valid_range(node.left, lo, node.val)
            and is_valid_range(node.right, node.val, hi))


def is_valid_inorder(root):
    """In-order of a BST is strictly increasing; compare with the previous value."""
    stack, prev, node = [], None, root
    while stack or node is not None:
        while node is not None:          # go as far left as possible
            stack.append(node)
            node = node.left
        node = stack.pop()
        if prev is not None and node.val <= prev:
            return False
        prev = node.val
        node = node.right
    return True
~~~

**What to point out in this code:**

- \`is_valid_range(node.left, lo, node.val) and is_valid_range(node.right, node.val, hi)\` short-circuits: if the left subtree is invalid, the right one is never visited.
- \`None\` bounds avoid any "smallest possible value" sentinel. \`float("-inf")\` and \`float("inf")\` also work in Python: comparing an \`int\` with a \`float\` infinity is exact, and Python integers have no fixed size, so no real value can equal the sentinel.
- The in-order version uses a plain list as the stack (\`append\` / \`pop\` are O(1) at the end) and needs no recursion, so it is the one to use on very deep trees. Python's recursion limit defaults to 1000 frames; the range version would raise \`RecursionError\` on the 5,000-node chain of example 2.
- \`prev\` starts as \`None\`, so the first node is never compared — no sentinel needed there either.

**The sentinel trap.** Many Java and C++ answers use the 32-bit limits as the starting bounds. Ported to Python, that bug looks like this (example 2):

~~~python
def sentinel_bounds(node, lo=INT_MIN, hi=INT_MAX):
    """BUGGY port of a common Java/C++ answer: 32-bit limits used as open bounds."""
    if node is None:
        return True
    if node.val <= lo or node.val >= hi:
        return False
    return sentinel_bounds(node.left, lo, node.val) and sentinel_bounds(node.right, node.val, hi)
~~~

A single node holding 2147483647 fails \`node.val >= hi\` against its own sentinel, so a valid one-node tree is reported invalid. Example 2 prints \`false\` for this version and \`true\` for the \`None\`-bounds version.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. The trees are written in LeetCode's level-order format, with \`null\` for a missing child.

**Example 1 — the local check vs the two correct checks on seven trees** prints:

~~~text
[2, 1, 3]: local true, range true, in-order true
[5, 1, 4, null, null, 3, 6]: local false, range false, in-order false
[5, 4, 6, null, null, 3, 7]: local true, range false, in-order false
[10, 5, 15, null, null, 6, 20]: local true, range false, in-order false
[2, 2, 2]: local false, range false, in-order false
[]: local true, range true, in-order true
[2147483647]: local true, range true, in-order true
~~~

**Example 2 — the sentinel-bound bug, and the iterative check on a 5,000-node chain** prints:

~~~text
[2147483647]: sentinel bounds false, safe bounds true
[-2147483648]: sentinel bounds false, safe bounds true
5000-node chain: valid true, visited 5000
chain with 4000 changed to 1: valid false, visited 4000
~~~

Reading example 1: the local check is fooled twice — by the trap tree \`[5, 4, 6, null, null, 3, 7]\` and by \`[10, 5, 15, null, null, 6, 20]\` (6 is in the right subtree of 10). The range and in-order checks agree on every tree. \`[2, 2, 2]\` is rejected by all three because the definition is strict. Reading example 2: the in-order walk visited all 5,000 nodes of a valid chain, but after changing 4000 to 1 it stopped at the 4,000th node, the first one out of order.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Local parent/child check | O(n) | O(h) | fast, but **wrong** (fooled by 2 of 7 trees in example 1) |
| Range bounds (recursive) | O(n) | O(h) | each node compared with two bounds once; recursion depth = height |
| In-order with explicit stack | O(n) | O(h) | each node pushed and popped once; the stack holds one root-to-leaf path |
| Copy in-order to a list, then check | O(n) | O(n) | correct, but stores every value; the running \`prev\` avoids that |

h is the height: O(log n) when balanced, up to n − 1 for a chain. The recursive range check also uses O(h) Python stack frames, and the default limit of 1000 frames caps h.

## 9. Edge Cases

- **Empty tree** — valid (every method returns true; example 1 prints \`true\` for \`[]\`).
- **One node** — valid, whatever its value, including the minimum and maximum 32-bit integers (example 2).
- **Duplicates** — \`[2, 2, 2]\` is invalid under the strict definition; if the interviewer allows "equal goes left", change the left comparison from \`<=\` to \`<\`.
- **The violation is deep** — \`[10, 5, 15, null, null, 6, 20]\`: 6 is a fine child of 15 but breaks the root's limit. Only a check that carries ancestor information catches it.
- **Very deep trees** — a 5,000-node chain is fine for the iterative in-order method; recursive versions depend on the language's stack limit.

## Common Pitfalls

- **Comparing only with the children.** It passes the trap tree; the rule is about whole subtrees.
- **Using \`<\` where \`<=\` is needed.** \`node.val <= lo\` (not \`<\`) is what rejects duplicates.
- **Truthiness instead of \`is None\`.** \`if lo and node.val <= lo\` silently skips the check when the bound is \`0\`, because \`0\` is falsy. Always write \`lo is not None\`.
- **Copying sentinels from other languages.** \`-2**31\` / \`2**31 - 1\` bounds reject valid trees holding those values; use \`None\` or \`float('inf')\`.
- **Recursion on deep input.** The range check recurses once per level; on a skewed tree deeper than about 1000 levels it raises \`RecursionError\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The trap:</strong> <span style="color:#f0e2c8;">Checking each node against its two children is not enough — in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[5, 4, 6, null, null, 3, 7]</code> node 3 is a fine child of 6 but sits right of 5.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Method 1:</strong> <span style="color:#f0e2c8;">Pass an open range down: left child gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(lo, node.val)</code>, right child gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(node.val, hi)</code>; any value outside fails.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Method 2:</strong> <span style="color:#f0e2c8;">In-order of a BST is strictly increasing: walk it with a stack, keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code>, fail at the first value that is not bigger.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Both are O(n) time and O(h) space, with early exit on the first violation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> bounds with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is not None</code> checks, and the iterative version for deep trees because recursion stops near 1000 frames.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle duplicates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Strict definition: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> against the low bound and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;=</code> against the high bound fail, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 2, 2]</code> is invalid. If equal keys may go left, relax only the left-side comparison.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">float('-inf')</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">None</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works in Python — ints compare exactly with float infinity and ints have no fixed size. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> just makes "no bound" explicit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it without recursion?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: the in-order version with a list as the stack. It visited all 5,000 nodes of a chain in my run without hitting the recursion limit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the first bad node?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The in-order walk already has it: the node popped when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node.val &lt;= prev</code> is the first one out of order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it in O(1) extra space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Morris traversal threads temporary right pointers back to the in-order successor so no stack is needed; it is O(n) time but temporarily modifies the tree, so restore it.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Valid range (bounds)** | Open interval (low, high) a node must lie in, set by its ancestors |
| **Top-down recursion** | Passing information from parent to child through arguments |
| **Early exit** | Returning as soon as the answer is known |
| **Strictly increasing** | Each value bigger than the previous; equal values break it |

---
**Conclusion:** A binary tree is a BST only if every node respects limits set by all of its ancestors, not just by its parent — which is why the local check fails on \`[5, 4, 6, null, null, 3, 7]\`. Carry an open range \`(lo, hi)\` down the tree, or walk it in-order and demand strictly increasing values; both are O(n) time and O(h) space and stop at the first violation. In Python, use \`None\` bounds with \`is not None\` checks, never truthiness, and pick the iterative in-order version for trees deeper than the 1000-frame recursion limit.`,
        examples: [
          {
            label: "Local check vs range check vs in-order check (7 trees)",
            code: `class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def build(values):
    """Level-order list with None for gaps (LeetCode style) -> tree."""
    if not values or values[0] is None:
        return None
    root = Node(values[0])
    queue, i = [root], 1
    for node in queue:
        if i < len(values) and values[i] is not None:
            node.left = Node(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = Node(values[i])
            queue.append(node.right)
        i += 1
        if i >= len(values):
            break
    return root


def local_check(node):
    """WRONG: only compares each node with its own children."""
    if node is None:
        return True
    if node.left is not None and node.left.val >= node.val:
        return False
    if node.right is not None and node.right.val <= node.val:
        return False
    return local_check(node.left) and local_check(node.right)


def is_valid_range(node, lo=None, hi=None):
    """Every node must lie strictly inside (lo, hi); None means unbounded."""
    if node is None:
        return True
    if (lo is not None and node.val <= lo) or (hi is not None and node.val >= hi):
        return False
    return (is_valid_range(node.left, lo, node.val)
            and is_valid_range(node.right, node.val, hi))


def is_valid_inorder(root):
    """In-order of a BST is strictly increasing; compare with the previous value."""
    stack, prev, node = [], None, root
    while stack or node is not None:
        while node is not None:          # go as far left as possible
            stack.append(node)
            node = node.left
        node = stack.pop()
        if prev is not None and node.val <= prev:
            return False
        prev = node.val
        node = node.right
    return True


def text(values):
    return "[" + ", ".join("null" if v is None else str(v) for v in values) + "]"


tests = [
    [2, 1, 3],
    [5, 1, 4, None, None, 3, 6],
    [5, 4, 6, None, None, 3, 7],
    [10, 5, 15, None, None, 6, 20],
    [2, 2, 2],
    [],
    [2147483647],
]
for values in tests:
    root = build(values)
    print(text(values) + ": local " + str(local_check(root)).lower()
          + ", range " + str(is_valid_range(root)).lower()
          + ", in-order " + str(is_valid_inorder(root)).lower())`,
          },
          {
            label: "Sentinel-bound bug, and early exit on a 5,000-node chain",
            code: `INT_MIN, INT_MAX = -2147483648, 2147483647


class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def sentinel_bounds(node, lo=INT_MIN, hi=INT_MAX):
    """BUGGY port of a common Java/C++ answer: 32-bit limits used as open bounds."""
    if node is None:
        return True
    if node.val <= lo or node.val >= hi:
        return False
    return sentinel_bounds(node.left, lo, node.val) and sentinel_bounds(node.right, node.val, hi)


def nullable_bounds(node, lo=None, hi=None):
    if node is None:
        return True
    if (lo is not None and node.val <= lo) or (hi is not None and node.val >= hi):
        return False
    return nullable_bounds(node.left, lo, node.val) and nullable_bounds(node.right, node.val, hi)


def inorder_check(root):
    """Iterative in-order; returns (valid, nodes visited before stopping)."""
    stack, prev, node, visited = [], None, root, 0
    while stack or node is not None:
        while node is not None:
            stack.append(node)
            node = node.left
        node = stack.pop()
        visited += 1
        if prev is not None and node.val <= prev:
            return False, visited
        prev = node.val
        node = node.right
    return True, visited


def chain(n):
    """Right-leaning chain 1 -> 2 -> ... -> n, built without recursion."""
    root = Node(1)
    tail = root
    for v in range(2, n + 1):
        tail.right = Node(v)
        tail = tail.right
    return root


for v in [INT_MAX, INT_MIN]:
    print("[" + str(v) + "]: sentinel bounds " + str(sentinel_bounds(Node(v))).lower()
          + ", safe bounds " + str(nullable_bounds(Node(v))).lower())

root = chain(5000)
ok, seen = inorder_check(root)
print("5000-node chain: valid " + str(ok).lower() + ", visited " + str(seen))
node = root
while node.val != 4000:
    node = node.right
node.val = 1
ok, seen = inorder_check(root)
print("chain with 4000 changed to 1: valid " + str(ok).lower() + ", visited " + str(seen))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given the root of a binary tree. Write a JavaScript function that returns true if it is a valid binary search tree — every key in a node's left subtree is strictly smaller than the node, and every key in its right subtree is strictly larger."

**What a strong answer should cover:**
- Why comparing each node only with its two children is wrong (a deep descendant can break the rule), with a counter-example.
- The range method: pass down an open interval (low, high) that tightens at every step; O(n) time, O(h) space.
- The in-order method: an in-order walk of a BST is strictly increasing, so compare each value with the previous one and stop at the first drop.
- Duplicates: with the strict definition, equal keys make the tree invalid.
- JavaScript specifics: \`-Infinity\` / \`Infinity\` (or \`null\`) are safe open bounds because every Number lies strictly between them; an array with \`push\`/\`pop\` is the stack.

**Clarifying questions expected:**
- Are duplicate values allowed, and if so on which side?
- How deep can the tree be (is recursion safe)?

**Code / implementation expected:** Yes — a recursive range check or an iterative in-order check, in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree and recursion are.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A library shelves its books by number. Each shelf has a sign: "everything to the left of me is smaller, everything to the right is bigger". A new assistant checks the shelves by looking at each sign and the two books right next to it. Every check passes — and yet a reader still cannot find book 3, because someone put it three shelves to the right of book 5, next to book 6. Book 3 is smaller than its neighbour 6, so the assistant's local check was happy; but it is on the right of 5, where only books bigger than 5 are allowed.

That is exactly the trap in this question. A [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) promises that **every** key in a node's left subtree is smaller and **every** key in its right subtree is larger. Checking parents against children is not enough; each node has to respect the limits set by **all** of its ancestors. Interviewers ask this because the first idea most people have is the assistant's local check, and fixing it shows you understand what the BST property actually says.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are duplicate values allowed? If so, on which side? | The usual definition is strict (\`<\` on the left, \`>\` on the right), so \`[2, 2, 2]\` is **not** a BST. Allowing "equal goes left" changes one comparison. |
| What range can node values take? | If values can be the minimum or maximum 32-bit integer, sentinel bounds like INT_MIN break (see section 6). |
| How many nodes, and how deep? | O(n) is required anyway; depth decides whether recursion is safe or an explicit stack is needed. |
| Is an empty tree valid? | Conventionally yes — there is no node to break the rule. |
| Do you want only true/false, or the first bad node? | The in-order method finds the first out-of-order node naturally. |

## 3. Why Checking Only the Children Fails

The tempting solution: at every node, check \`left.val < node.val < right.val\`, then recurse. Here is a tree where every one of those local checks passes, yet the tree is not a BST:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 310" role="img" aria-label="Tree with root 5, left child 4, right child 6, and 6 has children 3 and 7. Node 3 is in the right subtree of 5 but smaller than 5">
  <path class="d-edge" d="M 301 81 L 199 139"/>
  <path class="d-edge" d="M 339 81 L 441 139"/>
  <path class="d-edge-accent" d="M 446 167 L 404 218"/>
  <path class="d-edge" d="M 474 167 L 516 218"/>
  <circle class="d-box-muted" cx="320" cy="70" r="22"/>
  <text class="d-text" x="320" y="76" text-anchor="middle">5</text>
  <circle class="d-box-muted" cx="180" cy="150" r="22"/>
  <text class="d-text" x="180" y="156" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="460" cy="150" r="22"/>
  <text class="d-text" x="460" y="156" text-anchor="middle">6</text>
  <circle class="d-box-accent" cx="390" cy="235" r="22"/>
  <text class="d-text" x="390" y="241" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="530" cy="235" r="22"/>
  <text class="d-text" x="530" y="241" text-anchor="middle">7</text>
  <text class="d-sub" x="320" y="30" text-anchor="middle">allowed: anything</text>
  <text class="d-sub" x="180" y="196" text-anchor="middle">allowed: below 5</text>
  <text class="d-sub" x="500" y="140" text-anchor="start">allowed: above 5</text>
  <text class="d-text d-accent" x="390" y="282" text-anchor="middle">allowed: 5 to 6</text>
  <text class="d-sub" x="530" y="282" text-anchor="middle">allowed: above 6</text>
</svg>

Node 3 is a fine left child of 6 (3 < 6), so the local check passes. But 3 sits in the right subtree of 5, where every key must be larger than 5. Example 1 runs both checks on this tree (\`[5, 4, 6, null, null, 3, 7]\`): the local check says \`true\`, the correct checks say \`false\`.

The labels show the fix: every node inherits an **allowed range** from its ancestors. Going left from a node lowers the upper limit to that node's value; going right raises the lower limit.

## 4. Approach 1 — Pass Down the Allowed Range

Start at the root with no limits: \`(−∞, +∞)\`. When you go to the left child of a node with value v, the child must be in \`(low, v)\`; when you go to the right child, it must be in \`(v, high)\`. If any node falls outside its range, the tree is invalid.

📌 **Interview term: Valid range (bounds)** — the open interval (low, high) that a node's value must lie in, inherited from its ancestors. Left moves shrink high, right moves raise low.

📌 **Interview term: Top-down recursion** — a recursion that passes information from parent to child through its arguments (here the bounds), instead of combining answers on the way back up.

Each node is checked once against two numbers, so the time is O(n). The recursion is as deep as the tree, so the extra space is O(h): O(log n) for a balanced tree, O(n) for a chain.

## 5. Approach 2 — In-Order Must Be Strictly Increasing

An [in-order traversal](/interview-question/what-are-the-tree-traversal-methods) (left, node, right) of a valid BST lists the keys in sorted order. The reverse is true too: if the in-order sequence is strictly increasing, the tree is a BST. So walk in-order, remember the previous value, and fail as soon as a value is not larger than it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="In-order sequence of the trap tree is 4, 5, 3, 6, 7. The value 3 comes right after 5, so the sequence is not increasing">
  <rect class="d-box-muted" x="50" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="95" y="96" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="160" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="205" y="96" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="270" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="315" y="96" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="380" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="425" y="96" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="490" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="535" y="96" text-anchor="middle">7</text>
  <text class="d-text" x="320" y="32" text-anchor="middle">In-order of the trap tree</text>
  <text class="d-text d-accent" x="315" y="160" text-anchor="middle">3 is not above 5</text>
</svg>

For the trap tree the in-order sequence is 4, 5, 3, 6, 7; the walk stops at 3. Doing it with an explicit stack (instead of recursion) lets it handle very deep trees, and because it stops at the first drop it can finish early — example 2 changes one value in a 5,000-node chain and the walk stops after visiting 4,000 nodes.

📌 **Interview term: Early exit** — returning as soon as the answer is known instead of finishing the traversal. Both methods do it: the range method through short-circuit \`and\`, the in-order method at the first drop.

📌 **Interview term: Strictly increasing** — each value is greater than the one before (no equal neighbours). A BST with the strict definition has a strictly increasing in-order sequence, so duplicates fail.

## 6. The Code in JavaScript

Both methods from example 1. The bounds default to \`null\`, meaning "no limit on that side":

~~~javascript
// Every node must lie strictly inside (lo, hi); null means unbounded.
function isValidRange(node, lo = null, hi = null) {
  if (node === null) return true;
  if ((lo !== null && node.val <= lo) || (hi !== null && node.val >= hi)) return false;
  return isValidRange(node.left, lo, node.val) && isValidRange(node.right, node.val, hi);
}

// In-order of a BST is strictly increasing; compare with the previous value.
function isValidInorder(root) {
  const stack = [];
  let prev = null;
  let node = root;
  while (stack.length > 0 || node !== null) {
    while (node !== null) {          // go as far left as possible
      stack.push(node);
      node = node.left;
    }
    node = stack.pop();
    if (prev !== null && node.val <= prev) return false;
    prev = node.val;
    node = node.right;
  }
  return true;
}
~~~

**What to point out in this code:**

- \`isValidRange(node.left, lo, node.val) && isValidRange(node.right, node.val, hi)\` short-circuits: if the left subtree is invalid, the right one is never visited.
- Default parameters (\`lo = null\`) let the caller write \`isValidRange(root)\`.
- The in-order version uses an array as the stack (\`push\` / \`pop\` are fast at the end) and needs no recursion, so it is the one to use on very deep trees; deep recursion throws \`RangeError: Maximum call stack size exceeded\`.
- \`prev\` starts as \`null\`, so the first node is never compared.

**Sentinels in JavaScript.** Java and C++ answers often start with the 32-bit limits as bounds. Ported to JavaScript, that bug wrongly rejects a node holding 2147483647. The JavaScript-native fix is \`-Infinity\` / \`Infinity\`: every Number is strictly between them, so they can never collide with a real value (example 2):

~~~javascript
// BUGGY port of a common Java/C++ answer: 32-bit limits used as open bounds.
function sentinelBounds(node, lo = INT_MIN, hi = INT_MAX) {
  if (node === null) return true;
  if (node.val <= lo || node.val >= hi) return false;
  return sentinelBounds(node.left, lo, node.val) && sentinelBounds(node.right, node.val, hi);
}

// The JavaScript fix: -Infinity and Infinity are below and above every number.
function infinityBounds(node, lo = -Infinity, hi = Infinity) {
  if (node === null) return true;
  if (node.val <= lo || node.val >= hi) return false;
  return infinityBounds(node.left, lo, node.val) && infinityBounds(node.right, node.val, hi);
}
~~~

Example 2 prints \`false\` for the sentinel version and \`true\` for the \`Infinity\` version on both a 2147483647 node and a -2147483648 node.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. The trees are written in LeetCode's level-order format, with \`null\` for a missing child.

**Example 1 — the local check vs the two correct checks on seven trees** prints:

~~~text
[2, 1, 3]: local true, range true, in-order true
[5, 1, 4, null, null, 3, 6]: local false, range false, in-order false
[5, 4, 6, null, null, 3, 7]: local true, range false, in-order false
[10, 5, 15, null, null, 6, 20]: local true, range false, in-order false
[2, 2, 2]: local false, range false, in-order false
[]: local true, range true, in-order true
[2147483647]: local true, range true, in-order true
~~~

**Example 2 — the sentinel-bound bug, and the iterative check on a 5,000-node chain** prints:

~~~text
[2147483647]: sentinel bounds false, safe bounds true
[-2147483648]: sentinel bounds false, safe bounds true
5000-node chain: valid true, visited 5000
chain with 4000 changed to 1: valid false, visited 4000
~~~

Reading example 1: the local check is fooled twice — by the trap tree \`[5, 4, 6, null, null, 3, 7]\` and by \`[10, 5, 15, null, null, 6, 20]\` (6 is in the right subtree of 10). The range and in-order checks agree on every tree. \`[2, 2, 2]\` is rejected by all three because the definition is strict. Reading example 2: the in-order walk visited all 5,000 nodes of a valid chain, but after changing 4000 to 1 it stopped at the 4,000th node, the first one out of order.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Local parent/child check | O(n) | O(h) | fast, but **wrong** (fooled by 2 of 7 trees in example 1) |
| Range bounds (recursive) | O(n) | O(h) | each node compared with two bounds once; recursion depth = height |
| In-order with explicit stack | O(n) | O(h) | each node pushed and popped once; the stack holds one root-to-leaf path |
| Copy in-order to a list, then check | O(n) | O(n) | correct, but stores every value; the running \`prev\` avoids that |

h is the height: O(log n) when balanced, up to n − 1 for a chain. The recursive range check uses O(h) call-stack frames; a few thousand levels can already throw \`RangeError\`.

## 9. Edge Cases

- **Empty tree** — valid (every method returns true; example 1 prints \`true\` for \`[]\`).
- **One node** — valid, whatever its value, including the minimum and maximum 32-bit integers (example 2).
- **Duplicates** — \`[2, 2, 2]\` is invalid under the strict definition; if the interviewer allows "equal goes left", change the left comparison from \`<=\` to \`<\`.
- **The violation is deep** — \`[10, 5, 15, null, null, 6, 20]\`: 6 is a fine child of 15 but breaks the root's limit. Only a check that carries ancestor information catches it.
- **Very deep trees** — a 5,000-node chain is fine for the iterative in-order method; recursive versions depend on the language's stack limit.

## Common Pitfalls

- **Comparing only with the children.** It passes the trap tree; the rule is about whole subtrees.
- **Using \`<\` where \`<=\` is needed.** \`node.val <= lo\` (not \`<\`) is what rejects duplicates.
- **Truthiness instead of \`=== null\`.** \`if (lo && node.val <= lo)\` silently skips the check when the bound is \`0\`, because \`0\` is falsy. Use \`lo !== null\`, or \`-Infinity\` bounds and no check at all.
- **Copying 32-bit sentinels.** \`-2147483648\` / \`2147483647\` bounds reject valid trees holding those values; \`-Infinity\` / \`Infinity\` cannot collide with a Number.
- **Recursion on deep input.** The range check recurses once per level; very deep trees throw \`RangeError\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The trap:</strong> <span style="color:#f0e2c8;">Checking each node against its two children is not enough — in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[5, 4, 6, null, null, 3, 7]</code> node 3 is a fine child of 6 but sits right of 5.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Method 1:</strong> <span style="color:#f0e2c8;">Pass an open range down: left child gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(lo, node.val)</code>, right child gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(node.val, hi)</code>; any value outside fails.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Method 2:</strong> <span style="color:#f0e2c8;">In-order of a BST is strictly increasing: walk it with an array as a stack, keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code>, fail at the first value that is not bigger.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Both are O(n) time and O(h) space, with early exit on the first violation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">I start the bounds at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-Infinity</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Infinity</code>, which no Number can equal, and use the iterative version for deep trees.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle duplicates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Strict definition: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> against the low bound and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;=</code> against the high bound fail, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 2, 2]</code> is invalid. If equal keys may go left, relax only the left-side comparison.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not start at -2147483648 and 2147483647?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A node holding exactly that value would fail against its own sentinel — example 2 shows a valid one-node tree reported <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it without recursion?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: the in-order version with an explicit stack. It handled a 5,000-node chain in my run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the values were strings?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> compares strings character by character, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'10' &lt; '9'</code>; convert numeric strings with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number</code> first, or validate with a comparator.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it in O(1) extra space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Morris traversal threads temporary right pointers back to the in-order successor so no stack is needed; it is O(n) time but temporarily modifies the tree.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Valid range (bounds)** | Open interval (low, high) a node must lie in, set by its ancestors |
| **Top-down recursion** | Passing information from parent to child through arguments |
| **Early exit** | Returning as soon as the answer is known |
| **Strictly increasing** | Each value bigger than the previous; equal values break it |

---
**Conclusion:** A binary tree is a BST only if every node respects limits set by all of its ancestors, not just by its parent — which is why the local check fails on \`[5, 4, 6, null, null, 3, 7]\`. Carry an open range down the tree, or walk it in-order and demand strictly increasing values; both are O(n) time and O(h) space and stop at the first violation. In JavaScript, \`-Infinity\` and \`Infinity\` are the safe starting bounds, \`0\` must not be treated as "no bound", and the iterative version protects you from \`RangeError\` on deep trees.`,
        examples: [
          {
            label: "Local check vs range check vs in-order check (7 trees)",
            code: `class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// Level-order array with null for gaps (LeetCode style) -> tree.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new Node(values[0]);
  const queue = [root];
  let i = 1;
  for (let q = 0; q < queue.length && i < values.length; q++) {
    const node = queue[q];
    if (i < values.length && values[i] !== null) queue.push((node.left = new Node(values[i])));
    i++;
    if (i < values.length && values[i] !== null) queue.push((node.right = new Node(values[i])));
    i++;
  }
  return root;
}

// WRONG: only compares each node with its own children.
function localCheck(node) {
  if (node === null) return true;
  if (node.left !== null && node.left.val >= node.val) return false;
  if (node.right !== null && node.right.val <= node.val) return false;
  return localCheck(node.left) && localCheck(node.right);
}

// Every node must lie strictly inside (lo, hi); null means unbounded.
function isValidRange(node, lo = null, hi = null) {
  if (node === null) return true;
  if ((lo !== null && node.val <= lo) || (hi !== null && node.val >= hi)) return false;
  return isValidRange(node.left, lo, node.val) && isValidRange(node.right, node.val, hi);
}

// In-order of a BST is strictly increasing; compare with the previous value.
function isValidInorder(root) {
  const stack = [];
  let prev = null;
  let node = root;
  while (stack.length > 0 || node !== null) {
    while (node !== null) {          // go as far left as possible
      stack.push(node);
      node = node.left;
    }
    node = stack.pop();
    if (prev !== null && node.val <= prev) return false;
    prev = node.val;
    node = node.right;
  }
  return true;
}

const text = (values) => "[" + values.map((v) => (v === null ? "null" : String(v))).join(", ") + "]";

const tests = [
  [2, 1, 3],
  [5, 1, 4, null, null, 3, 6],
  [5, 4, 6, null, null, 3, 7],
  [10, 5, 15, null, null, 6, 20],
  [2, 2, 2],
  [],
  [2147483647],
];
for (const values of tests) {
  const root = build(values);
  console.log(text(values) + ": local " + localCheck(root) + ", range " + isValidRange(root) +
    ", in-order " + isValidInorder(root));
}`,
          },
          {
            label: "Sentinel-bound bug, and early exit on a 5,000-node chain",
            code: `const INT_MIN = -2147483648;
const INT_MAX = 2147483647;

class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// BUGGY port of a common Java/C++ answer: 32-bit limits used as open bounds.
function sentinelBounds(node, lo = INT_MIN, hi = INT_MAX) {
  if (node === null) return true;
  if (node.val <= lo || node.val >= hi) return false;
  return sentinelBounds(node.left, lo, node.val) && sentinelBounds(node.right, node.val, hi);
}

// The JavaScript fix: -Infinity and Infinity are below and above every number.
function infinityBounds(node, lo = -Infinity, hi = Infinity) {
  if (node === null) return true;
  if (node.val <= lo || node.val >= hi) return false;
  return infinityBounds(node.left, lo, node.val) && infinityBounds(node.right, node.val, hi);
}

// Iterative in-order; returns [valid, nodes visited before stopping].
function inorderCheck(root) {
  const stack = [];
  let prev = null;
  let node = root;
  let visited = 0;
  while (stack.length > 0 || node !== null) {
    while (node !== null) {
      stack.push(node);
      node = node.left;
    }
    node = stack.pop();
    visited++;
    if (prev !== null && node.val <= prev) return [false, visited];
    prev = node.val;
    node = node.right;
  }
  return [true, visited];
}

// Right-leaning chain 1 -> 2 -> ... -> n, built without recursion.
function chain(n) {
  const root = new Node(1);
  let tail = root;
  for (let v = 2; v <= n; v++) {
    tail.right = new Node(v);
    tail = tail.right;
  }
  return root;
}

for (const v of [INT_MAX, INT_MIN]) {
  console.log("[" + v + "]: sentinel bounds " + sentinelBounds(new Node(v)) +
    ", safe bounds " + infinityBounds(new Node(v)));
}

const root = chain(5000);
let [ok, seen] = inorderCheck(root);
console.log("5000-node chain: valid " + ok + ", visited " + seen);
let node = root;
while (node.val !== 4000) node = node.right;
node.val = 1;
[ok, seen] = inorderCheck(root);
console.log("chain with 4000 changed to 1: valid " + ok + ", visited " + seen);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given the root of a binary tree. Write a Java function that returns true if it is a valid binary search tree — every key in a node's left subtree is strictly smaller than the node, and every key in its right subtree is strictly larger."

**What a strong answer should cover:**
- Why comparing each node only with its two children is wrong (a deep descendant can break the rule), with a counter-example.
- The range method: pass down an open interval (low, high) that tightens at every step; O(n) time, O(h) space.
- The in-order method: an in-order walk of a BST is strictly increasing, so compare each value with the previous one and stop at the first drop.
- Duplicates: with the strict definition, equal keys make the tree invalid.
- Java specifics: using \`Integer.MIN_VALUE\` / \`Integer.MAX_VALUE\` as bounds wrongly rejects a node that holds one of those values; use nullable \`Integer\` bounds or \`long\` bounds, and \`ArrayDeque\` (not \`Stack\`) for the iterative version.

**Clarifying questions expected:**
- Are duplicate values allowed, and if so on which side?
- Can node values be \`Integer.MIN_VALUE\` or \`Integer.MAX_VALUE\`?

**Code / implementation expected:** Yes — a recursive range check with \`Integer\` (nullable) bounds or an iterative in-order check with an \`ArrayDeque\`, in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree and recursion are.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A library shelves its books by number. Each shelf has a sign: "everything to the left of me is smaller, everything to the right is bigger". A new assistant checks the shelves by looking at each sign and the two books right next to it. Every check passes — and yet a reader still cannot find book 3, because someone put it three shelves to the right of book 5, next to book 6. Book 3 is smaller than its neighbour 6, so the assistant's local check was happy; but it is on the right of 5, where only books bigger than 5 are allowed.

That is exactly the trap in this question. A [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) promises that **every** key in a node's left subtree is smaller and **every** key in its right subtree is larger. Checking parents against children is not enough; each node has to respect the limits set by **all** of its ancestors. Interviewers ask this because the first idea most people have is the assistant's local check, and fixing it shows you understand what the BST property actually says.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are duplicate values allowed? If so, on which side? | The usual definition is strict (\`<\` on the left, \`>\` on the right), so \`[2, 2, 2]\` is **not** a BST. Allowing "equal goes left" changes one comparison. |
| What range can node values take? | If values can be the minimum or maximum 32-bit integer, sentinel bounds like INT_MIN break (see section 6). |
| How many nodes, and how deep? | O(n) is required anyway; depth decides whether recursion is safe or an explicit stack is needed. |
| Is an empty tree valid? | Conventionally yes — there is no node to break the rule. |
| Do you want only true/false, or the first bad node? | The in-order method finds the first out-of-order node naturally. |

## 3. Why Checking Only the Children Fails

The tempting solution: at every node, check \`left.val < node.val < right.val\`, then recurse. Here is a tree where every one of those local checks passes, yet the tree is not a BST:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 310" role="img" aria-label="Tree with root 5, left child 4, right child 6, and 6 has children 3 and 7. Node 3 is in the right subtree of 5 but smaller than 5">
  <path class="d-edge" d="M 301 81 L 199 139"/>
  <path class="d-edge" d="M 339 81 L 441 139"/>
  <path class="d-edge-accent" d="M 446 167 L 404 218"/>
  <path class="d-edge" d="M 474 167 L 516 218"/>
  <circle class="d-box-muted" cx="320" cy="70" r="22"/>
  <text class="d-text" x="320" y="76" text-anchor="middle">5</text>
  <circle class="d-box-muted" cx="180" cy="150" r="22"/>
  <text class="d-text" x="180" y="156" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="460" cy="150" r="22"/>
  <text class="d-text" x="460" y="156" text-anchor="middle">6</text>
  <circle class="d-box-accent" cx="390" cy="235" r="22"/>
  <text class="d-text" x="390" y="241" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="530" cy="235" r="22"/>
  <text class="d-text" x="530" y="241" text-anchor="middle">7</text>
  <text class="d-sub" x="320" y="30" text-anchor="middle">allowed: anything</text>
  <text class="d-sub" x="180" y="196" text-anchor="middle">allowed: below 5</text>
  <text class="d-sub" x="500" y="140" text-anchor="start">allowed: above 5</text>
  <text class="d-text d-accent" x="390" y="282" text-anchor="middle">allowed: 5 to 6</text>
  <text class="d-sub" x="530" y="282" text-anchor="middle">allowed: above 6</text>
</svg>

Node 3 is a fine left child of 6 (3 < 6), so the local check passes. But 3 sits in the right subtree of 5, where every key must be larger than 5. Example 1 runs both checks on this tree (\`[5, 4, 6, null, null, 3, 7]\`): the local check says \`true\`, the correct checks say \`false\`.

The labels show the fix: every node inherits an **allowed range** from its ancestors. Going left from a node lowers the upper limit to that node's value; going right raises the lower limit.

## 4. Approach 1 — Pass Down the Allowed Range

Start at the root with no limits: \`(−∞, +∞)\`. When you go to the left child of a node with value v, the child must be in \`(low, v)\`; when you go to the right child, it must be in \`(v, high)\`. If any node falls outside its range, the tree is invalid.

📌 **Interview term: Valid range (bounds)** — the open interval (low, high) that a node's value must lie in, inherited from its ancestors. Left moves shrink high, right moves raise low.

📌 **Interview term: Top-down recursion** — a recursion that passes information from parent to child through its arguments (here the bounds), instead of combining answers on the way back up.

Each node is checked once against two numbers, so the time is O(n). The recursion is as deep as the tree, so the extra space is O(h): O(log n) for a balanced tree, O(n) for a chain.

## 5. Approach 2 — In-Order Must Be Strictly Increasing

An [in-order traversal](/interview-question/what-are-the-tree-traversal-methods) (left, node, right) of a valid BST lists the keys in sorted order. The reverse is true too: if the in-order sequence is strictly increasing, the tree is a BST. So walk in-order, remember the previous value, and fail as soon as a value is not larger than it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="In-order sequence of the trap tree is 4, 5, 3, 6, 7. The value 3 comes right after 5, so the sequence is not increasing">
  <rect class="d-box-muted" x="50" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="95" y="96" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="160" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="205" y="96" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="270" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="315" y="96" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="380" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="425" y="96" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="490" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="535" y="96" text-anchor="middle">7</text>
  <text class="d-text" x="320" y="32" text-anchor="middle">In-order of the trap tree</text>
  <text class="d-text d-accent" x="315" y="160" text-anchor="middle">3 is not above 5</text>
</svg>

For the trap tree the in-order sequence is 4, 5, 3, 6, 7; the walk stops at 3. Doing it with an explicit stack (instead of recursion) lets it handle very deep trees, and because it stops at the first drop it can finish early — example 2 changes one value in a 5,000-node chain and the walk stops after visiting 4,000 nodes.

📌 **Interview term: Early exit** — returning as soon as the answer is known instead of finishing the traversal. Both methods do it: the range method through short-circuit \`and\`, the in-order method at the first drop.

📌 **Interview term: Strictly increasing** — each value is greater than the one before (no equal neighbours). A BST with the strict definition has a strictly increasing in-order sequence, so duplicates fail.

## 6. The Code in Java

Both methods from example 1. The bounds are \`Integer\` objects so they can be \`null\`, meaning "no limit on that side":

~~~java
/** Every node must lie strictly inside (lo, hi); a null bound means unbounded. */
static boolean isValidRange(Node node, Integer lo, Integer hi) {
    if (node == null) return true;
    if ((lo != null && node.val <= lo) || (hi != null && node.val >= hi)) return false;
    return isValidRange(node.left, lo, node.val) && isValidRange(node.right, node.val, hi);
}

/** In-order of a BST is strictly increasing; compare with the previous value. */
static boolean isValidInorder(Node root) {
    Deque<Node> stack = new ArrayDeque<>();
    Integer prev = null;
    Node node = root;
    while (!stack.isEmpty() || node != null) {
        while (node != null) {           // go as far left as possible
            stack.push(node);
            node = node.left;
        }
        node = stack.pop();
        if (prev != null && node.val <= prev) return false;
        prev = node.val;
        node = node.right;
    }
    return true;
}
~~~

**What to point out in this code:**

- \`node.val <= lo\` compares an \`int\` with an \`Integer\`; Java auto-unboxes \`lo\` to \`int\`, which is safe because we checked \`lo != null\` first (unboxing \`null\` throws \`NullPointerException\`).
- \`isValidRange(node.left, lo, node.val)\` auto-boxes \`node.val\` into an \`Integer\`. That costs a little, which is why some answers use \`long\` bounds instead (\`Long.MIN_VALUE\` is smaller than any \`int\`, so it works as a sentinel for \`int\` values).
- \`&&\` short-circuits: if the left subtree is invalid, the right one is never visited.
- The iterative version uses \`ArrayDeque\` as a stack (\`push\` / \`pop\`); the [Stack Javadoc](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Stack.html) says \`Deque\` implementations "should be used in preference to" the older synchronized \`Stack\` class. It has no recursion, so it handles very deep trees.

**The sentinel trap.** The most common wrong Java answer uses \`Integer.MIN_VALUE\` and \`Integer.MAX_VALUE\` as the starting bounds (example 2):

~~~java
/** BUGGY: Integer.MIN_VALUE / MAX_VALUE used as open bounds. */
static boolean sentinelBounds(Node node, int lo, int hi) {
    if (node == null) return true;
    if (node.val <= lo || node.val >= hi) return false;
    return sentinelBounds(node.left, lo, node.val) && sentinelBounds(node.right, node.val, hi);
}

/** FIX: nullable Integer bounds; null means no limit on that side. */
static boolean nullableBounds(Node node, Integer lo, Integer hi) {
    if (node == null) return true;
    if ((lo != null && node.val <= lo) || (hi != null && node.val >= hi)) return false;
    return nullableBounds(node.left, lo, node.val) && nullableBounds(node.right, node.val, hi);
}
~~~

A single node holding \`Integer.MAX_VALUE\` fails \`node.val >= hi\` against its own sentinel, so a valid one-node tree is reported invalid. Example 2 prints \`false\` for the sentinel version and \`true\` for the nullable version.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. The trees are written in LeetCode's level-order format, with \`null\` for a missing child.

**Example 1 — the local check vs the two correct checks on seven trees** prints:

~~~text
[2, 1, 3]: local true, range true, in-order true
[5, 1, 4, null, null, 3, 6]: local false, range false, in-order false
[5, 4, 6, null, null, 3, 7]: local true, range false, in-order false
[10, 5, 15, null, null, 6, 20]: local true, range false, in-order false
[2, 2, 2]: local false, range false, in-order false
[]: local true, range true, in-order true
[2147483647]: local true, range true, in-order true
~~~

**Example 2 — the sentinel-bound bug, and the iterative check on a 5,000-node chain** prints:

~~~text
[2147483647]: sentinel bounds false, safe bounds true
[-2147483648]: sentinel bounds false, safe bounds true
5000-node chain: valid true, visited 5000
chain with 4000 changed to 1: valid false, visited 4000
~~~

Reading example 1: the local check is fooled twice — by the trap tree \`[5, 4, 6, null, null, 3, 7]\` and by \`[10, 5, 15, null, null, 6, 20]\` (6 is in the right subtree of 10). The range and in-order checks agree on every tree. \`[2, 2, 2]\` is rejected by all three because the definition is strict. Reading example 2: the in-order walk visited all 5,000 nodes of a valid chain, but after changing 4000 to 1 it stopped at the 4,000th node, the first one out of order.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Local parent/child check | O(n) | O(h) | fast, but **wrong** (fooled by 2 of 7 trees in example 1) |
| Range bounds (recursive) | O(n) | O(h) | each node compared with two bounds once; recursion depth = height |
| In-order with explicit stack | O(n) | O(h) | each node pushed and popped once; the stack holds one root-to-leaf path |
| Copy in-order to a list, then check | O(n) | O(n) | correct, but stores every value; the running \`prev\` avoids that |

h is the height: O(log n) when balanced, up to n − 1 for a chain. The recursive range check uses O(h) stack frames; boxing \`node.val\` into \`Integer\` allocates on each call (values -128..127 come from a cache).

## 9. Edge Cases

- **Empty tree** — valid (every method returns true; example 1 prints \`true\` for \`[]\`).
- **One node** — valid, whatever its value, including the minimum and maximum 32-bit integers (example 2).
- **Duplicates** — \`[2, 2, 2]\` is invalid under the strict definition; if the interviewer allows "equal goes left", change the left comparison from \`<=\` to \`<\`.
- **The violation is deep** — \`[10, 5, 15, null, null, 6, 20]\`: 6 is a fine child of 15 but breaks the root's limit. Only a check that carries ancestor information catches it.
- **Very deep trees** — a 5,000-node chain is fine for the iterative in-order method; recursive versions depend on the language's stack limit.

## Common Pitfalls

- **Comparing only with the children.** It passes the trap tree; the rule is about whole subtrees.
- **\`Integer.MIN_VALUE\` / \`MAX_VALUE\` as bounds.** Rejects a valid node holding exactly that value (example 2). Use nullable \`Integer\` or \`long\` bounds.
- **Unboxing a \`null\` bound.** \`node.val <= lo\` with \`lo == null\` throws \`NullPointerException\`; test \`lo != null\` first.
- **\`==\` between two \`Integer\` objects.** If you store \`prev\` as \`Integer\` and test \`prev == other\`, you compare references; values above 127 are different objects. Compare with \`equals\`, or unbox to \`int\`.
- **Using \`Stack\`.** It works, but it is a synchronized legacy class; \`ArrayDeque\` is the recommended stack.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The trap:</strong> <span style="color:#f0e2c8;">Checking each node against its two children is not enough — in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[5, 4, 6, null, null, 3, 7]</code> node 3 is a fine child of 6 but sits right of 5.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Method 1:</strong> <span style="color:#f0e2c8;">Pass an open range down: left child gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(lo, node.val)</code>, right child gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(node.val, hi)</code>; any value outside fails.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Method 2:</strong> <span style="color:#f0e2c8;">In-order of a BST is strictly increasing: walk it with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> as a stack, keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code>, fail at the first value that is not bigger.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Both are O(n) time and O(h) space, with early exit on the first violation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">I never use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MIN_VALUE</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MAX_VALUE</code> as bounds — they reject a node holding that value. Nullable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> bounds fix it.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Show me the bug with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code> bounds.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A single node with value <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2147483647</code> fails <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node.val &gt;= hi</code> because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi</code> is also <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2147483647</code>, so a valid tree returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> — example 2 prints exactly that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long</code> bounds?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Long.MIN_VALUE</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Long.MAX_VALUE</code> lie outside the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> range, so no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> node can collide with them, and there is no boxing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle duplicates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Strict definition: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> against the low bound and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;=</code> against the high bound fail, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 2, 2]</code> is invalid. If equal keys may go left, relax only the left-side comparison.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it without recursion?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: the in-order version with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code>. It handled a 5,000-node chain in my run and stopped at the first bad node.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it in O(1) extra space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Morris traversal threads temporary right pointers back to the in-order successor so no stack is needed; it is O(n) time but temporarily modifies the tree.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Valid range (bounds)** | Open interval (low, high) a node must lie in, set by its ancestors |
| **Top-down recursion** | Passing information from parent to child through arguments |
| **Early exit** | Returning as soon as the answer is known |
| **Strictly increasing** | Each value bigger than the previous; equal values break it |

---
**Conclusion:** A binary tree is a BST only if every node respects limits set by all of its ancestors, not just by its parent — which is why the local check fails on \`[5, 4, 6, null, null, 3, 7]\`. Carry an open range down the tree, or walk it in-order and demand strictly increasing values; both are O(n) time and O(h) space and stop at the first violation. In Java, the classic bug is \`Integer.MIN_VALUE\` / \`MAX_VALUE\` sentinels; nullable \`Integer\` or \`long\` bounds fix it, and \`ArrayDeque\` gives you the stack for the iterative version.`,
        examples: [
          {
            label: "Local check vs range check vs in-order check (7 trees)",
            code: `import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    /** Level-order array with null for gaps (LeetCode style) -> tree. */
    static Node build(Integer[] values) {
        if (values.length == 0 || values[0] == null) return null;
        Node root = new Node(values[0]);
        List<Node> queue = new ArrayList<>();
        queue.add(root);
        int i = 1;
        for (int q = 0; q < queue.size() && i < values.length; q++) {
            Node node = queue.get(q);
            if (i < values.length && values[i] != null) { node.left = new Node(values[i]); queue.add(node.left); }
            i++;
            if (i < values.length && values[i] != null) { node.right = new Node(values[i]); queue.add(node.right); }
            i++;
        }
        return root;
    }

    /** WRONG: only compares each node with its own children. */
    static boolean localCheck(Node node) {
        if (node == null) return true;
        if (node.left != null && node.left.val >= node.val) return false;
        if (node.right != null && node.right.val <= node.val) return false;
        return localCheck(node.left) && localCheck(node.right);
    }

    /** Every node must lie strictly inside (lo, hi); a null bound means unbounded. */
    static boolean isValidRange(Node node, Integer lo, Integer hi) {
        if (node == null) return true;
        if ((lo != null && node.val <= lo) || (hi != null && node.val >= hi)) return false;
        return isValidRange(node.left, lo, node.val) && isValidRange(node.right, node.val, hi);
    }

    /** In-order of a BST is strictly increasing; compare with the previous value. */
    static boolean isValidInorder(Node root) {
        Deque<Node> stack = new ArrayDeque<>();
        Integer prev = null;
        Node node = root;
        while (!stack.isEmpty() || node != null) {
            while (node != null) {           // go as far left as possible
                stack.push(node);
                node = node.left;
            }
            node = stack.pop();
            if (prev != null && node.val <= prev) return false;
            prev = node.val;
            node = node.right;
        }
        return true;
    }

    static String text(Integer[] values) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < values.length; i++) sb.append(i > 0 ? ", " : "").append(values[i] == null ? "null" : values[i].toString());
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        Integer[][] tests = {
            {2, 1, 3},
            {5, 1, 4, null, null, 3, 6},
            {5, 4, 6, null, null, 3, 7},
            {10, 5, 15, null, null, 6, 20},
            {2, 2, 2},
            {},
            {2147483647},
        };
        for (Integer[] values : tests) {
            Node root = build(values);
            System.out.println(text(values) + ": local " + localCheck(root) + ", range " + isValidRange(root, null, null)
                    + ", in-order " + isValidInorder(root));
        }
    }
}`,
          },
          {
            label: "Sentinel-bound bug, and early exit on a 5,000-node chain",
            code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    /** BUGGY: Integer.MIN_VALUE / MAX_VALUE used as open bounds. */
    static boolean sentinelBounds(Node node, int lo, int hi) {
        if (node == null) return true;
        if (node.val <= lo || node.val >= hi) return false;
        return sentinelBounds(node.left, lo, node.val) && sentinelBounds(node.right, node.val, hi);
    }

    /** FIX: nullable Integer bounds; null means no limit on that side. */
    static boolean nullableBounds(Node node, Integer lo, Integer hi) {
        if (node == null) return true;
        if ((lo != null && node.val <= lo) || (hi != null && node.val >= hi)) return false;
        return nullableBounds(node.left, lo, node.val) && nullableBounds(node.right, node.val, hi);
    }

    /** Iterative in-order; returns {valid ? 1 : 0, nodes visited before stopping}. */
    static int[] inorderCheck(Node root) {
        Deque<Node> stack = new ArrayDeque<>();
        Integer prev = null;
        Node node = root;
        int visited = 0;
        while (!stack.isEmpty() || node != null) {
            while (node != null) {
                stack.push(node);
                node = node.left;
            }
            node = stack.pop();
            visited++;
            if (prev != null && node.val <= prev) return new int[] {0, visited};
            prev = node.val;
            node = node.right;
        }
        return new int[] {1, visited};
    }

    /** Right-leaning chain 1 -> 2 -> ... -> n, built without recursion. */
    static Node chain(int n) {
        Node root = new Node(1);
        Node tail = root;
        for (int v = 2; v <= n; v++) {
            tail.right = new Node(v);
            tail = tail.right;
        }
        return root;
    }

    public static void main(String[] args) {
        for (int v : new int[] {Integer.MAX_VALUE, Integer.MIN_VALUE}) {
            System.out.println("[" + v + "]: sentinel bounds "
                    + sentinelBounds(new Node(v), Integer.MIN_VALUE, Integer.MAX_VALUE)
                    + ", safe bounds " + nullableBounds(new Node(v), null, null));
        }
        Node root = chain(5000);
        int[] r = inorderCheck(root);
        System.out.println("5000-node chain: valid " + (r[0] == 1) + ", visited " + r[1]);
        Node node = root;
        while (node.val != 4000) node = node.right;
        node.val = 1;
        r = inorderCheck(root);
        System.out.println("chain with 4000 changed to 1: valid " + (r[0] == 1) + ", visited " + r[1]);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given the root of a binary tree. Write a C++ function that returns true if it is a valid binary search tree — every key in a node's left subtree is strictly smaller than the node, and every key in its right subtree is strictly larger."

**What a strong answer should cover:**
- Why comparing each node only with its two children is wrong (a deep descendant can break the rule), with a counter-example.
- The range method: pass down an open interval (low, high) that tightens at every step; O(n) time, O(h) space.
- The in-order method: an in-order walk of a BST is strictly increasing, so compare each value with the previous one and stop at the first drop.
- Duplicates: with the strict definition, equal keys make the tree invalid.
- C++ specifics: \`INT_MIN\` / \`INT_MAX\` sentinels wrongly reject a node holding those values; pass ancestor pointers (or \`std::optional\`, or \`long long\`) as bounds, and note \`std::stack::pop()\` returns \`void\`.

**Clarifying questions expected:**
- Are duplicate values allowed, and if so on which side?
- Can node values be \`INT_MIN\` or \`INT_MAX\`?

**Code / implementation expected:** Yes — a recursive range check with pointer bounds or an iterative in-order check with \`std::stack\`, in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree and recursion are.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A library shelves its books by number. Each shelf has a sign: "everything to the left of me is smaller, everything to the right is bigger". A new assistant checks the shelves by looking at each sign and the two books right next to it. Every check passes — and yet a reader still cannot find book 3, because someone put it three shelves to the right of book 5, next to book 6. Book 3 is smaller than its neighbour 6, so the assistant's local check was happy; but it is on the right of 5, where only books bigger than 5 are allowed.

That is exactly the trap in this question. A [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) promises that **every** key in a node's left subtree is smaller and **every** key in its right subtree is larger. Checking parents against children is not enough; each node has to respect the limits set by **all** of its ancestors. Interviewers ask this because the first idea most people have is the assistant's local check, and fixing it shows you understand what the BST property actually says.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are duplicate values allowed? If so, on which side? | The usual definition is strict (\`<\` on the left, \`>\` on the right), so \`[2, 2, 2]\` is **not** a BST. Allowing "equal goes left" changes one comparison. |
| What range can node values take? | If values can be the minimum or maximum 32-bit integer, sentinel bounds like INT_MIN break (see section 6). |
| How many nodes, and how deep? | O(n) is required anyway; depth decides whether recursion is safe or an explicit stack is needed. |
| Is an empty tree valid? | Conventionally yes — there is no node to break the rule. |
| Do you want only true/false, or the first bad node? | The in-order method finds the first out-of-order node naturally. |

## 3. Why Checking Only the Children Fails

The tempting solution: at every node, check \`left.val < node.val < right.val\`, then recurse. Here is a tree where every one of those local checks passes, yet the tree is not a BST:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 310" role="img" aria-label="Tree with root 5, left child 4, right child 6, and 6 has children 3 and 7. Node 3 is in the right subtree of 5 but smaller than 5">
  <path class="d-edge" d="M 301 81 L 199 139"/>
  <path class="d-edge" d="M 339 81 L 441 139"/>
  <path class="d-edge-accent" d="M 446 167 L 404 218"/>
  <path class="d-edge" d="M 474 167 L 516 218"/>
  <circle class="d-box-muted" cx="320" cy="70" r="22"/>
  <text class="d-text" x="320" y="76" text-anchor="middle">5</text>
  <circle class="d-box-muted" cx="180" cy="150" r="22"/>
  <text class="d-text" x="180" y="156" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="460" cy="150" r="22"/>
  <text class="d-text" x="460" y="156" text-anchor="middle">6</text>
  <circle class="d-box-accent" cx="390" cy="235" r="22"/>
  <text class="d-text" x="390" y="241" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="530" cy="235" r="22"/>
  <text class="d-text" x="530" y="241" text-anchor="middle">7</text>
  <text class="d-sub" x="320" y="30" text-anchor="middle">allowed: anything</text>
  <text class="d-sub" x="180" y="196" text-anchor="middle">allowed: below 5</text>
  <text class="d-sub" x="500" y="140" text-anchor="start">allowed: above 5</text>
  <text class="d-text d-accent" x="390" y="282" text-anchor="middle">allowed: 5 to 6</text>
  <text class="d-sub" x="530" y="282" text-anchor="middle">allowed: above 6</text>
</svg>

Node 3 is a fine left child of 6 (3 < 6), so the local check passes. But 3 sits in the right subtree of 5, where every key must be larger than 5. Example 1 runs both checks on this tree (\`[5, 4, 6, null, null, 3, 7]\`): the local check says \`true\`, the correct checks say \`false\`.

The labels show the fix: every node inherits an **allowed range** from its ancestors. Going left from a node lowers the upper limit to that node's value; going right raises the lower limit.

## 4. Approach 1 — Pass Down the Allowed Range

Start at the root with no limits: \`(−∞, +∞)\`. When you go to the left child of a node with value v, the child must be in \`(low, v)\`; when you go to the right child, it must be in \`(v, high)\`. If any node falls outside its range, the tree is invalid.

📌 **Interview term: Valid range (bounds)** — the open interval (low, high) that a node's value must lie in, inherited from its ancestors. Left moves shrink high, right moves raise low.

📌 **Interview term: Top-down recursion** — a recursion that passes information from parent to child through its arguments (here the bounds), instead of combining answers on the way back up.

Each node is checked once against two numbers, so the time is O(n). The recursion is as deep as the tree, so the extra space is O(h): O(log n) for a balanced tree, O(n) for a chain.

## 5. Approach 2 — In-Order Must Be Strictly Increasing

An [in-order traversal](/interview-question/what-are-the-tree-traversal-methods) (left, node, right) of a valid BST lists the keys in sorted order. The reverse is true too: if the in-order sequence is strictly increasing, the tree is a BST. So walk in-order, remember the previous value, and fail as soon as a value is not larger than it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="In-order sequence of the trap tree is 4, 5, 3, 6, 7. The value 3 comes right after 5, so the sequence is not increasing">
  <rect class="d-box-muted" x="50" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="95" y="96" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="160" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="205" y="96" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="270" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="315" y="96" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="380" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="425" y="96" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="490" y="60" width="90" height="60" rx="8"/>
  <text class="d-text" x="535" y="96" text-anchor="middle">7</text>
  <text class="d-text" x="320" y="32" text-anchor="middle">In-order of the trap tree</text>
  <text class="d-text d-accent" x="315" y="160" text-anchor="middle">3 is not above 5</text>
</svg>

For the trap tree the in-order sequence is 4, 5, 3, 6, 7; the walk stops at 3. Doing it with an explicit stack (instead of recursion) lets it handle very deep trees, and because it stops at the first drop it can finish early — example 2 changes one value in a 5,000-node chain and the walk stops after visiting 4,000 nodes.

📌 **Interview term: Early exit** — returning as soon as the answer is known instead of finishing the traversal. Both methods do it: the range method through short-circuit \`and\`, the in-order method at the first drop.

📌 **Interview term: Strictly increasing** — each value is greater than the one before (no equal neighbours). A BST with the strict definition has a strictly increasing in-order sequence, so duplicates fail.

## 6. The Code in C++

Both methods from example 1. Instead of numeric sentinels, the bounds are pointers to the ancestor nodes that set them; \`nullptr\` means "no limit on that side":

~~~cpp
// Every node must lie strictly inside (lo, hi). The bounds are the ancestor
// nodes themselves; nullptr means unbounded, so no INT_MIN/INT_MAX sentinel.
bool isValidRange(const Node* node, const Node* lo = nullptr, const Node* hi = nullptr) {
    if (!node) return true;
    if ((lo && node->val <= lo->val) || (hi && node->val >= hi->val)) return false;
    return isValidRange(node->left, lo, node) && isValidRange(node->right, node, hi);
}

// In-order of a BST is strictly increasing; compare with the previous node.
bool isValidInorder(const Node* root) {
    std::stack<const Node*> st;
    const Node* prev = nullptr;
    const Node* node = root;
    while (!st.empty() || node) {
        while (node) {             // go as far left as possible
            st.push(node);
            node = node->left;
        }
        node = st.top();
        st.pop();
        if (prev && node->val <= prev->val) return false;
        prev = node;
        node = node->right;
    }
    return true;
}
~~~

**What to point out in this code:**

- Pointer bounds cost nothing extra and can never collide with a real value. \`std::optional<int>\` or \`long long\` bounds (with \`LLONG_MIN\` / \`LLONG_MAX\`) are other correct choices for \`int\` values.
- \`&&\` short-circuits: if the left subtree is invalid, the right one is never visited.
- \`std::stack::pop()\` returns \`void\`, so you read \`st.top()\` first and then \`pop()\`.
- The iterative version has no recursion, so it handles very deep trees; a stack overflow in C++ is not an exception you can catch, it crashes the program.
- Everything is \`const Node*\`: validation must not modify the tree, and the compiler now enforces that.

**The sentinel trap.** The most common wrong C++ answer uses \`INT_MIN\` and \`INT_MAX\` as the starting bounds (example 2):

~~~cpp
// BUGGY: INT_MIN / INT_MAX used as open bounds.
bool sentinelBounds(const Node* node, int lo = INT_MIN, int hi = INT_MAX) {
    if (!node) return true;
    if (node->val <= lo || node->val >= hi) return false;
    return sentinelBounds(node->left, lo, node->val) && sentinelBounds(node->right, node->val, hi);
}

// FIX: the bounds are ancestor pointers; nullptr means no limit on that side.
bool nullableBounds(const Node* node, const Node* lo = nullptr, const Node* hi = nullptr) {
    if (!node) return true;
    if ((lo && node->val <= lo->val) || (hi && node->val >= hi->val)) return false;
    return nullableBounds(node->left, lo, node) && nullableBounds(node->right, node, hi);
}
~~~

A single node holding \`INT_MAX\` fails \`node->val >= hi\` against its own sentinel, so a valid one-node tree is reported invalid. Example 2 prints \`false\` for the sentinel version and \`true\` for the pointer version.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13.3). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. The trees are written in LeetCode's level-order format, with \`null\` for a missing child.

**Example 1 — the local check vs the two correct checks on seven trees** prints:

~~~text
[2, 1, 3]: local true, range true, in-order true
[5, 1, 4, null, null, 3, 6]: local false, range false, in-order false
[5, 4, 6, null, null, 3, 7]: local true, range false, in-order false
[10, 5, 15, null, null, 6, 20]: local true, range false, in-order false
[2, 2, 2]: local false, range false, in-order false
[]: local true, range true, in-order true
[2147483647]: local true, range true, in-order true
~~~

**Example 2 — the sentinel-bound bug, and the iterative check on a 5,000-node chain** prints:

~~~text
[2147483647]: sentinel bounds false, safe bounds true
[-2147483648]: sentinel bounds false, safe bounds true
5000-node chain: valid true, visited 5000
chain with 4000 changed to 1: valid false, visited 4000
~~~

Reading example 1: the local check is fooled twice — by the trap tree \`[5, 4, 6, null, null, 3, 7]\` and by \`[10, 5, 15, null, null, 6, 20]\` (6 is in the right subtree of 10). The range and in-order checks agree on every tree. \`[2, 2, 2]\` is rejected by all three because the definition is strict. Reading example 2: the in-order walk visited all 5,000 nodes of a valid chain, but after changing 4000 to 1 it stopped at the 4,000th node, the first one out of order.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Local parent/child check | O(n) | O(h) | fast, but **wrong** (fooled by 2 of 7 trees in example 1) |
| Range bounds (recursive) | O(n) | O(h) | each node compared with two bounds once; recursion depth = height |
| In-order with explicit stack | O(n) | O(h) | each node pushed and popped once; the stack holds one root-to-leaf path |
| Copy in-order to a list, then check | O(n) | O(n) | correct, but stores every value; the running \`prev\` avoids that |

h is the height: O(log n) when balanced, up to n − 1 for a chain. The recursive range check uses O(h) stack frames; pointer bounds add no allocation at all.

## 9. Edge Cases

- **Empty tree** — valid (every method returns true; example 1 prints \`true\` for \`[]\`).
- **One node** — valid, whatever its value, including the minimum and maximum 32-bit integers (example 2).
- **Duplicates** — \`[2, 2, 2]\` is invalid under the strict definition; if the interviewer allows "equal goes left", change the left comparison from \`<=\` to \`<\`.
- **The violation is deep** — \`[10, 5, 15, null, null, 6, 20]\`: 6 is a fine child of 15 but breaks the root's limit. Only a check that carries ancestor information catches it.
- **Very deep trees** — a 5,000-node chain is fine for the iterative in-order method; recursive versions depend on the language's stack limit.

## Common Pitfalls

- **Comparing only with the children.** It passes the trap tree; the rule is about whole subtrees.
- **\`INT_MIN\` / \`INT_MAX\` as bounds.** Rejects a valid node holding exactly that value (example 2). Use ancestor pointers, \`std::optional<int>\`, or \`long long\` bounds.
- **\`int\` overflow when widening bounds by one.** Writing \`node->val - 1\` or \`+ 1\` to turn open bounds into closed ones overflows at the extremes, which is undefined behaviour for signed \`int\`.
- **Using the value of \`pop()\`.** \`std::stack::pop()\` returns \`void\`; read \`top()\` first.
- **Dereferencing a null child.** \`node->left->val\` without checking \`node->left\` crashes; the base case \`if (!node) return true;\` must come first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The trap:</strong> <span style="color:#f0e2c8;">Checking each node against its two children is not enough — in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[5, 4, 6, null, null, 3, 7]</code> node 3 is a fine child of 6 but sits right of 5.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Method 1:</strong> <span style="color:#f0e2c8;">Pass an open range down: left child gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(lo, node)</code>, right child gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(node, hi)</code>; any value outside fails.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Method 2:</strong> <span style="color:#f0e2c8;">In-order of a BST is strictly increasing: walk it with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack</code>, keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code>, fail at the first value that is not bigger.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Both are O(n) time and O(h) space, with early exit on the first violation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">I pass ancestor pointers as bounds, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code> meaning unbounded, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INT_MIN</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INT_MAX</code> sentinels reject a node holding those values.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Show me the bug with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">INT_MAX</code> bounds.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A single node with value <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INT_MAX</code> fails <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node-&gt;val &gt;= hi</code> because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi</code> is also <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INT_MAX</code>, so a valid tree returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> — example 2 prints exactly that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long long</code> bounds?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They also work for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> values, since <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LLONG_MIN</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LLONG_MAX</code> are outside the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> range. Pointers or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::optional</code> say "no bound" more directly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle duplicates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Strict definition: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> against the low bound and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;=</code> against the high bound fail, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 2, 2]</code> is invalid. If equal keys may go left, relax only the left-side comparison.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it without recursion?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: the in-order version with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack</code>. It handled a 5,000-node chain in my run; deep recursion in C++ would crash rather than throw.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it in O(1) extra space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Morris traversal threads temporary right pointers back to the in-order successor so no stack is needed; it is O(n) time but temporarily modifies the tree.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Valid range (bounds)** | Open interval (low, high) a node must lie in, set by its ancestors |
| **Top-down recursion** | Passing information from parent to child through arguments |
| **Early exit** | Returning as soon as the answer is known |
| **Strictly increasing** | Each value bigger than the previous; equal values break it |

---
**Conclusion:** A binary tree is a BST only if every node respects limits set by all of its ancestors, not just by its parent — which is why the local check fails on \`[5, 4, 6, null, null, 3, 7]\`. Carry an open range down the tree, or walk it in-order and demand strictly increasing values; both are O(n) time and O(h) space and stop at the first violation. In C++, pass ancestor pointers (or \`std::optional\`) as bounds instead of \`INT_MIN\` / \`INT_MAX\`, keep the tree \`const\`, and remember \`std::stack::pop()\` returns nothing.`,
        examples: [
          {
            label: "Local check vs range check vs in-order check (7 trees)",
            code: `#include <iostream>
#include <memory>
#include <optional>
#include <stack>
#include <string>
#include <vector>

struct Node {
    int val;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int v) : val(v) {}
};

using Values = std::vector<std::optional<int>>;
const std::optional<int> NIL;  // a gap in the level-order list
std::vector<std::unique_ptr<Node>> pool;  // owns every node, freed at exit

Node* make(int v) {
    pool.push_back(std::make_unique<Node>(v));
    return pool.back().get();
}

// Level-order list with NIL for gaps (LeetCode style) -> tree.
Node* build(const Values& values) {
    if (values.empty() || !values[0]) return nullptr;
    Node* root = make(*values[0]);
    std::vector<Node*> queue{root};
    size_t i = 1;
    for (size_t q = 0; q < queue.size() && i < values.size(); q++) {
        Node* node = queue[q];
        if (i < values.size() && values[i]) queue.push_back(node->left = make(*values[i]));
        i++;
        if (i < values.size() && values[i]) queue.push_back(node->right = make(*values[i]));
        i++;
    }
    return root;
}

// WRONG: only compares each node with its own children.
bool localCheck(const Node* node) {
    if (!node) return true;
    if (node->left && node->left->val >= node->val) return false;
    if (node->right && node->right->val <= node->val) return false;
    return localCheck(node->left) && localCheck(node->right);
}

// Every node must lie strictly inside (lo, hi). The bounds are the ancestor
// nodes themselves; nullptr means unbounded, so no INT_MIN/INT_MAX sentinel.
bool isValidRange(const Node* node, const Node* lo = nullptr, const Node* hi = nullptr) {
    if (!node) return true;
    if ((lo && node->val <= lo->val) || (hi && node->val >= hi->val)) return false;
    return isValidRange(node->left, lo, node) && isValidRange(node->right, node, hi);
}

// In-order of a BST is strictly increasing; compare with the previous node.
bool isValidInorder(const Node* root) {
    std::stack<const Node*> st;
    const Node* prev = nullptr;
    const Node* node = root;
    while (!st.empty() || node) {
        while (node) {             // go as far left as possible
            st.push(node);
            node = node->left;
        }
        node = st.top();
        st.pop();
        if (prev && node->val <= prev->val) return false;
        prev = node;
        node = node->right;
    }
    return true;
}

std::string text(const Values& values) {
    std::string s = "[";
    for (size_t i = 0; i < values.size(); i++) s += (i ? ", " : "") + (values[i] ? std::to_string(*values[i]) : "null");
    return s + "]";
}

int main() {
    std::vector<Values> tests{
        {2, 1, 3},
        {5, 1, 4, NIL, NIL, 3, 6},
        {5, 4, 6, NIL, NIL, 3, 7},
        {10, 5, 15, NIL, NIL, 6, 20},
        {2, 2, 2},
        {},
        {2147483647},
    };
    std::cout << std::boolalpha;
    for (const Values& values : tests) {
        Node* root = build(values);
        std::cout << text(values) << ": local " << localCheck(root) << ", range " << isValidRange(root)
                  << ", in-order " << isValidInorder(root) << "\\n";
    }
    return 0;
}`,
          },
          {
            label: "Sentinel-bound bug, and early exit on a 5,000-node chain",
            code: `#include <climits>
#include <iostream>
#include <memory>
#include <stack>
#include <utility>
#include <vector>

struct Node {
    int val;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int v) : val(v) {}
};

// BUGGY: INT_MIN / INT_MAX used as open bounds.
bool sentinelBounds(const Node* node, int lo = INT_MIN, int hi = INT_MAX) {
    if (!node) return true;
    if (node->val <= lo || node->val >= hi) return false;
    return sentinelBounds(node->left, lo, node->val) && sentinelBounds(node->right, node->val, hi);
}

// FIX: the bounds are ancestor pointers; nullptr means no limit on that side.
bool nullableBounds(const Node* node, const Node* lo = nullptr, const Node* hi = nullptr) {
    if (!node) return true;
    if ((lo && node->val <= lo->val) || (hi && node->val >= hi->val)) return false;
    return nullableBounds(node->left, lo, node) && nullableBounds(node->right, node, hi);
}

// Iterative in-order; returns {valid, nodes visited before stopping}.
std::pair<bool, int> inorderCheck(const Node* root) {
    std::stack<const Node*> st;
    const Node* prev = nullptr;
    const Node* node = root;
    int visited = 0;
    while (!st.empty() || node) {
        while (node) {
            st.push(node);
            node = node->left;
        }
        node = st.top();
        st.pop();
        visited++;
        if (prev && node->val <= prev->val) return {false, visited};
        prev = node;
        node = node->right;
    }
    return {true, visited};
}

int main() {
    std::cout << std::boolalpha;
    for (int v : {INT_MAX, INT_MIN}) {
        Node single(v);
        std::cout << "[" << v << "]: sentinel bounds " << sentinelBounds(&single)
                  << ", safe bounds " << nullableBounds(&single) << "\\n";
    }
    // Right-leaning chain 1 -> 2 -> ... -> 5000; the vector owns the nodes.
    std::vector<std::unique_ptr<Node>> pool;
    for (int v = 1; v <= 5000; v++) pool.push_back(std::make_unique<Node>(v));
    for (int i = 0; i + 1 < 5000; i++) pool[i]->right = pool[i + 1].get();
    Node* root = pool[0].get();

    auto [ok, seen] = inorderCheck(root);
    std::cout << "5000-node chain: valid " << ok << ", visited " << seen << "\\n";
    pool[3999]->val = 1;  // the node holding 4000
    auto [ok2, seen2] = inorderCheck(root);
    std::cout << "chain with 4000 changed to 1: valid " << ok2 << ", visited " << seen2 << "\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you find the kth smallest element in a BST?",
    difficulty: "medium",
    seoDescription: "Find the kth smallest value in a BST with an early-stop in-order walk, O(h + k), or subtree sizes, O(h). Verified in four languages.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given the root of a binary search tree and an integer k, write a Python function that returns the kth smallest value in the tree (k is 1-indexed). Then tell me what you would change if the tree is modified often and kth-smallest is asked many times."

**What a strong answer should cover:**
- In-order traversal of a BST visits values in sorted order, so the kth visited node is the answer.
- Stop early: an iterative in-order walk with an explicit stack costs O(h + k) time and O(h) space instead of O(n).
- The simple version (collect the whole in-order list, return index k − 1) is O(n) time and O(n) space — correct, but wasteful.
- The follow-up: store a subtree size in every node (an order-statistic tree) so each query is one root-to-node walk, O(h), and updates keep sizes current.
- Invalid k (k < 1 or k > n) and what to return.
- Python specifics: a list as the stack; a generator with \`yield from\` plus \`itertools.islice\` is a neat lazy alternative, but recursive generators still hit the recursion limit on deep trees.

**Clarifying questions expected:**
- Is k always between 1 and the number of nodes?
- Will the tree be modified between queries, and how many queries will there be?

**Code / implementation expected:** Yes — an iterative in-order walk with a list as the stack, in Python 3.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary search tree and a stack are.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a bookshelf where the books are already sorted by height, but the shelf is not a straight line: it is a family tree of little shelves, where every shelf has a shorter-books shelf to its left and a taller-books shelf to its right. Someone asks you for "the 3rd shortest book". You do not need to measure every book or re-sort anything. You just walk the shelves in left-to-right order — always finish the shorter side first — and count: one, two, three. Stop. That is the book.

The structure is a [binary search tree](/interview-question/what-is-a-binary-search-tree-bst), and "left side first, then me, then the right side" is an **in-order traversal**. This question checks two things: that you know in-order visits a BST in sorted order, and that you can stop the walk the moment you have your answer. The follow-up — "what if the tree changes and we ask this a million times?" — checks whether you can augment a data structure, which is a real-world skill (databases and ranking systems need "the kth item" queries all the time).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is k always valid, 1 ≤ k ≤ n? | If not, you need a "not found" result. The examples return -1 for k = 0 and k = n + 1. |
| Is k 1-indexed? | "1st smallest" is the minimum; an off-by-one here is the most common bug. |
| Is the tree modified between queries? How many queries? | One query: walk in-order. Many queries with inserts and deletes: store subtree sizes (section 5). |
| Can values repeat? | With duplicates, "kth smallest" usually counts each copy; the in-order walk does that naturally. |
| How deep can the tree be? | An explicit stack avoids recursion limits on skewed trees. |

## 3. The Core Idea: In-Order Visits the Values in Sorted Order

An [in-order traversal](/interview-question/what-are-the-tree-traversal-methods) visits a node's left subtree, then the node, then its right subtree. In a BST everything on the left is smaller and everything on the right is larger, so the values come out in increasing order. The kth node visited is the kth smallest.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 340" role="img" aria-label="BST with root 5. In-order visits 1, 2, 3, 4, 5, 6. With k equal to 3 the answer is node 3">
  <path class="d-edge" d="M 341 71 L 239 129"/>
  <path class="d-edge" d="M 379 71 L 481 129"/>
  <path class="d-edge" d="M 204 156 L 156 204"/>
  <path class="d-edge" d="M 236 156 L 284 204"/>
  <path class="d-edge" d="M 127 238 L 93 282"/>
  <circle class="d-box-muted" cx="360" cy="60" r="22"/>
  <text class="d-text" x="360" y="66" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="220" cy="140" r="22"/>
  <text class="d-text" x="220" y="146" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="500" cy="140" r="22"/>
  <text class="d-text" x="500" y="146" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="140" cy="220" r="22"/>
  <text class="d-text" x="140" y="226" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="300" cy="220" r="22"/>
  <text class="d-text" x="300" y="226" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="80" cy="300" r="22"/>
  <text class="d-text" x="80" y="306" text-anchor="middle">1</text>
  <text class="d-sub" x="390" y="66" text-anchor="start">visit 5</text>
  <text class="d-text d-accent" x="250" y="146" text-anchor="start">visit 3</text>
  <text class="d-sub" x="530" y="146" text-anchor="start">visit 6</text>
  <text class="d-sub" x="170" y="226" text-anchor="start">visit 2</text>
  <text class="d-sub" x="330" y="226" text-anchor="start">visit 4</text>
  <text class="d-sub" x="110" y="306" text-anchor="start">visit 1</text>
  <text class="d-text d-accent" x="20" y="30" text-anchor="start">k = 3</text>
</svg>

The walk goes down the left edge first (5, 3, 2, 1 are pushed), then pops 1 (visit 1), 2 (visit 2), 3 (visit 3) — and with k = 3 it stops there, never touching 4, 5 or 6.

📌 **Interview term: In-order traversal** — left subtree, node, right subtree. On a BST it produces the values in sorted order.

📌 **Interview term: Kth order statistic** — the kth smallest value of a collection. The minimum is the 1st order statistic, the median is the middle one.

**Brute force.** Collect the whole in-order sequence into a list, return element k − 1. It is correct and easy to write, but it always visits all n nodes and stores all n values, even for k = 1.

**Better: stop early with an explicit stack.** Simulate the recursion yourself:

1. Push the current node and keep going left until there is no left child (push the "left spine").
2. Pop a node: it is the next smallest value. Count it; if the count reaches k, return it.
3. Move to its right child and repeat from step 1.

The stack never holds more than one root-to-leaf path, so it uses O(h) memory. The walk does O(h) work to reach the smallest node and then roughly one step per value it visits, so the time is **O(h + k)**.

📌 **Interview term: O(h + k)** — the cost of the early-stop walk: reaching the first value takes up to h steps, then each of the k pops costs amortised O(1). On a balanced tree that is O(log n + k).

📌 **Interview term: Explicit stack** — a stack data structure you manage yourself, replacing the call stack of a recursive function. It removes the recursion-depth limit and lets you stop at any moment.

## 4. The Code in Python

The early-stop walk from example 1. A plain list is the stack: \`append\` and \`pop\` work on its end in O(1).

~~~python
def kth_smallest(root, k):
    """Iterative in-order that stops at the k-th pop. Returns (value, pops); value -1 if k is out of range."""
    if k < 1:
        return -1, 0
    stack, node, pops = [], root, 0
    while stack or node is not None:
        while node is not None:      # push the whole left spine
            stack.append(node)
            node = node.left
        node = stack.pop()           # next smallest value
        pops += 1
        if pops == k:
            return node.val, pops
        node = node.right
    return -1, pops
~~~

**What to point out in this code:**

- The guard \`if k < 1\` returns at once; without it, k = 0 would walk the whole tree looking for a pop count that never comes.
- The function returns a tuple \`(value, pops)\` only so the example can show how many nodes it visited; in an interview return just the value.
- There is no recursion, so a skewed tree deeper than Python's default 1000-frame limit is fine.

**A Pythonic alternative.** A recursive generator yields the in-order values lazily, and \`itertools.islice\` skips to the kth one; the walk stops as soon as \`next\` gets its value:

~~~python
from itertools import islice

def inorder(node):
    if node is not None:
        yield from inorder(node.left)
        yield node.val
        yield from inorder(node.right)

def kth_smallest_gen(root, k):
    return next(islice(inorder(root), k - 1, None), -1)   # -1 if k is too large
~~~

On the example tree this returned 3 for k = 3 and -1 for k = 10 when we ran it. It is elegant, but each level of the tree is one more nested generator, so it has the same recursion limit as plain recursion.

**The size-augmented query (example 2).** Each node stores \`size\`; \`size(None)\` is 0:

~~~python
def kth_by_size(root, k):
    """Order-statistic query: one root-to-node walk. Returns (value, nodes visited)."""
    node, visited = root, 0
    while node is not None:
        visited += 1
        left = size(node.left)
        if k == left + 1:
            return node.val, visited      # exactly left nodes are smaller
        if k <= left:
            node = node.left              # answer is in the left subtree
        else:
            k -= left + 1                 # skip left subtree and this node
            node = node.right
    return -1, visited
~~~

## 5. Follow-Up: Many Queries on a Changing Tree

If the tree gets inserts and deletes and you are asked for the kth smallest over and over, O(h + k) per query is too slow when k is large (k = n/2 costs O(n) each time). The fix is to store one more number in each node: the **size** of its subtree (how many nodes it contains, itself included).

With sizes, one walk from the root finds the answer. At each node, let \`left\` be the size of its left subtree:

- If \`k == left + 1\`, this node is the answer: exactly \`left\` values are smaller.
- If \`k <= left\`, the answer is in the left subtree; go left with the same k.
- Otherwise skip the left subtree and this node: \`k -= left + 1\`, go right.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 340" role="img" aria-label="The same BST with subtree sizes. Root 5 has size 6, node 3 has size 4. Looking for k equal to 4 goes from 5 to 3 to 4">
  <path class="d-edge-accent" d="M 341 71 L 239 129"/>
  <path class="d-edge" d="M 379 71 L 481 129"/>
  <path class="d-edge" d="M 204 156 L 156 204"/>
  <path class="d-edge-accent" d="M 236 156 L 284 204"/>
  <path class="d-edge" d="M 127 238 L 93 282"/>
  <circle class="d-box-accent" cx="360" cy="60" r="22"/>
  <text class="d-text" x="360" y="66" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="220" cy="140" r="22"/>
  <text class="d-text" x="220" y="146" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="500" cy="140" r="22"/>
  <text class="d-text" x="500" y="146" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="140" cy="220" r="22"/>
  <text class="d-text" x="140" y="226" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="300" cy="220" r="22"/>
  <text class="d-text" x="300" y="226" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="80" cy="300" r="22"/>
  <text class="d-text" x="80" y="306" text-anchor="middle">1</text>
  <text class="d-sub" x="390" y="66" text-anchor="start">size 6</text>
  <text class="d-sub" x="250" y="146" text-anchor="start">size 4</text>
  <text class="d-sub" x="530" y="146" text-anchor="start">size 1</text>
  <text class="d-sub" x="170" y="226" text-anchor="start">size 2</text>
  <text class="d-sub" x="330" y="226" text-anchor="start">size 1</text>
  <text class="d-sub" x="110" y="306" text-anchor="start">size 1</text>
  <text class="d-text d-accent" x="20" y="30" text-anchor="start">k = 4</text>
</svg>

For k = 4: at 5, the left subtree has 4 nodes and k ≤ 4, so go left. At 3, the left subtree has 2 nodes; k = 4 > 3, so skip 2 + 1 = 3 values: k becomes 1, go right. At 4, the left subtree is empty and k = 1 = 0 + 1: the answer is 4. Three nodes touched.

Every insert adds 1 to the size of each node on its path, and every delete subtracts 1, so updates stay O(h). In a self-balancing tree (red-black, AVL) the rotations also update the two sizes they touch, and every operation becomes O(log n). Example 2 measures the difference on 1,000 random keys: for k = 500 the in-order walk touched 510 nodes and the size walk touched 20.

📌 **Interview term: Augmented BST** — a BST that stores extra information in each node (here the subtree size), kept up to date by insert and delete, to answer new kinds of queries quickly.

📌 **Interview term: Order-statistic tree** — a BST augmented with subtree sizes. It answers "kth smallest" and "rank of x" in O(h).

## 6. Putting It Together

Use the early-stop walk for a one-off question (it needs no change to the tree), and the size-augmented tree when the same tree is queried many times while it changes. Both rely on the same fact — in-order is sorted — and both stop as soon as they know the answer.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 draws 1,000 distinct random keys below 1,000,000 from a small deterministic generator (MINSTD, seed 7), so every language builds the same tree.

**Example 1 — early-stop in-order for k = 0..7, checked against the full-list method** prints:

~~~text
k=0: -1 (popped 0, list method -1)
k=1: 1 (popped 1, list method 1)
k=2: 2 (popped 2, list method 2)
k=3: 3 (popped 3, list method 3)
k=4: 4 (popped 4, list method 4)
k=5: 5 (popped 5, list method 5)
k=6: 6 (popped 6, list method 6)
k=7: -1 (popped 6, list method -1)
tree [3, 1, 4, null, 2], k=1: 1
tree [3, 1, 4, null, 2], k=3: 3
~~~

**Example 2 — order-statistic tree: in-order walk vs size walk on 1,000 random keys** prints:

~~~text
tree size 1000
k=1: 245 | in-order touches 6, size walk touches 6, same true
k=250: 238671 | in-order touches 254, size walk touches 12, same true
k=500: 471995 | in-order touches 510, size walk touches 20, same true
k=1000: 999424 | in-order touches 1000, size walk touches 6, same true
after 200 more inserts: size 1200, every rank matches sorted order true
k=1201 (out of range): -1
~~~

Reading example 1: the number of pops equals k — the walk stops the moment it has the answer — and both methods return -1 for k = 0 and k = 7 on a 6-node tree. Reading example 2: "touches" counts nodes pushed by the in-order walk and nodes visited by the size walk. For k = 1 both touch 6 nodes (the left spine), but for k = 500 the in-order walk touched 510 nodes and the size walk 20. After 200 more inserts the sizes were still right: every rank from 1 to 1,200 matched the sorted list.

## 8. Complexity

| Approach | Time per query | Space | Why |
| :--- | :--- | :--- | :--- |
| Full in-order list, then index | O(n) | O(n) | visits and stores every node, even for k = 1 |
| Early-stop in-order (explicit stack) | O(h + k) | O(h) | reach the minimum in h steps, then stop after k pops |
| Size-augmented BST | O(h) | O(n) extra ints | one root-to-node walk; 20 nodes touched vs 510 for k = 500 in example 2 |
| Size-augmented, self-balancing | O(log n) | O(n) | h stays O(log n); updates also O(log n) |

h is the height: about log2(n) for a balanced tree, up to n − 1 for a chain. The recursive-generator version has the same time but adds one generator frame per level, so it is limited by the recursion limit.

## 9. Edge Cases

- **k = 1** — the minimum: the leftmost node. The early-stop walk pushes the left spine and pops once.
- **k = n** — the maximum: the walk visits everything; the size walk goes straight down the right edge (6 nodes touched for k = 1000 in example 2).
- **k < 1 or k > n** — no answer; the examples return -1. In an interview, say what you return (or throw) before coding.
- **Skewed tree** — a chain of n nodes makes h = n, so even the "O(h)" methods are O(n). The explicit stack still avoids recursion limits.
- **Duplicates** — the in-order walk counts each copy; for "kth distinct value" skip a popped value equal to the previous one.

## Common Pitfalls

- **Off-by-one on k.** k is 1-indexed: the 1st smallest is the minimum. The list method must return \`values[k - 1]\`.
- **Not stopping early.** \`sorted_values = inorder_list(root)\` always costs O(n) time and memory; return from inside the loop.
- **Mutating \`k\` in a recursive helper.** \`k -= 1\` inside a nested function rebinds a local name; you need \`nonlocal k\` (or a one-element list), otherwise the outer \`k\` never changes.
- **Recursive generators on deep trees.** \`yield from\` recursion hits the same 1000-frame limit as plain recursion.
- **Forgetting to update sizes.** In the augmented tree, an insert that finds the key already present must not increment sizes — example 2 checks \`contains\` first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key fact:</strong> <span style="color:#f0e2c8;">In-order traversal of a BST visits values in sorted order, so the kth node visited is the kth smallest.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">Iterative in-order with a list as the stack: push the left spine, pop, count; return when the count hits k, else go right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">O(h + k) time and O(h) space, versus O(n) and O(n) for building the whole sorted list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Follow-up:</strong> <span style="color:#f0e2c8;">For many queries on a changing tree, store subtree sizes: compare k with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size(left) + 1</code> and walk down once, O(h).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">No recursion, so deep trees are fine; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield from</code> generator plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">islice</code> is a lazy one-liner but still recursive.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if k is larger than the tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The walk runs out of nodes; I return -1 (or raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValueError</code>), and I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k &lt; 1</code> up front so k = 0 does not walk the whole tree.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find the kth largest?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do a reverse in-order — right, node, left — and stop at the kth pop. Same O(h + k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep the sizes correct on delete?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Subtract 1 from every node on the path to the removed node; in a self-balancing tree, recompute the sizes of the nodes a rotation moves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it in O(1) extra space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Morris in-order traversal threads temporary pointers instead of using a stack; it is O(n) time and restores the tree as it goes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just sort the values?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sorting is O(n log n); the BST is already sorted, so an in-order walk gives the order for free.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **In-order traversal** | Left, node, right; sorted order on a BST |
| **Kth order statistic** | The kth smallest value of a collection |
| **O(h + k)** | Cost of the early-stop walk: h steps down, then k pops |
| **Explicit stack** | A stack you manage yourself instead of recursion |
| **Augmented BST** | A BST that stores extra data per node, kept up to date on updates |
| **Order-statistic tree** | A BST with subtree sizes; kth smallest and rank in O(h) |

---
**Conclusion:** Because an in-order walk of a BST produces its values in sorted order, the kth smallest value is simply the kth node that walk visits. Doing the walk with a list as an explicit stack and returning at the kth pop costs O(h + k) time and O(h) space, avoids Python's recursion limit, and returned the right value for every k in our runs. When the tree changes and the question is asked again and again, store a subtree size in each node: one root-to-node walk then answers any k in O(h) — 20 nodes instead of 510 for k = 500 in example 2.`,
        examples: [
          {
            label: "Early-stop in-order for every k, checked against the list method",
            code: `class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def build(values):
    """Level-order list with None for gaps (LeetCode style) -> tree."""
    if not values or values[0] is None:
        return None
    root = Node(values[0])
    queue, q, i = [root], 0, 1
    while q < len(queue) and i < len(values):
        node = queue[q]
        q += 1
        if i < len(values) and values[i] is not None:
            node.left = Node(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = Node(values[i])
            queue.append(node.right)
        i += 1
    return root


def kth_smallest(root, k):
    """Iterative in-order that stops at the k-th pop. Returns (value, pops); value -1 if k is out of range."""
    if k < 1:
        return -1, 0
    stack, node, pops = [], root, 0
    while stack or node is not None:
        while node is not None:      # push the whole left spine
            stack.append(node)
            node = node.left
        node = stack.pop()           # next smallest value
        pops += 1
        if pops == k:
            return node.val, pops
        node = node.right
    return -1, pops


def kth_by_list(root, k):
    """Simple version: collect the whole in-order list, then index it."""
    out = []

    def walk(node):
        if node is not None:
            walk(node.left)
            out.append(node.val)
            walk(node.right)

    walk(root)
    return out[k - 1] if 1 <= k <= len(out) else -1


root = build([5, 3, 6, 2, 4, None, None, 1])
for k in range(0, 8):
    value, pops = kth_smallest(root, k)
    print("k=" + str(k) + ": " + str(value) + " (popped " + str(pops) + ", list method " + str(kth_by_list(root, k)) + ")")
small = build([3, 1, 4, None, 2])
print("tree [3, 1, 4, null, 2], k=1: " + str(kth_smallest(small, 1)[0]))
print("tree [3, 1, 4, null, 2], k=3: " + str(kth_smallest(small, 3)[0]))`,
          },
          {
            label: "Order-statistic tree: subtree sizes vs in-order walk (1,000 keys)",
            code: `class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None
        self.size = 1          # nodes in the subtree rooted here


def size(node):
    return node.size if node is not None else 0


def contains(root, val):
    node = root
    while node is not None and node.val != val:
        node = node.left if val < node.val else node.right
    return node is not None


def insert(root, val):
    """Insert a NEW key, adding 1 to the size of every node on the way down."""
    if root is None:
        return Node(val)
    node = root
    while True:
        node.size += 1
        if val < node.val:
            if node.left is None:
                node.left = Node(val)
                return root
            node = node.left
        else:
            if node.right is None:
                node.right = Node(val)
                return root
            node = node.right


def kth_by_size(root, k):
    """Order-statistic query: one root-to-node walk. Returns (value, nodes visited)."""
    node, visited = root, 0
    while node is not None:
        visited += 1
        left = size(node.left)
        if k == left + 1:
            return node.val, visited      # exactly left nodes are smaller
        if k <= left:
            node = node.left              # answer is in the left subtree
        else:
            k -= left + 1                 # skip left subtree and this node
            node = node.right
    return -1, visited


def kth_inorder(root, k):
    """Early-stop in-order. Returns (value, nodes pushed = nodes touched)."""
    stack, node, pops, pushed = [], root, 0, 0
    while stack or node is not None:
        while node is not None:
            stack.append(node)
            pushed += 1
            node = node.left
        node = stack.pop()
        pops += 1
        if pops == k:
            return node.val, pushed
        node = node.right
    return -1, pushed


root, keys, seed = None, [], 7


def add_random(count):
    global root, seed
    added = 0
    while added < count:
        seed = seed * 48271 % 2147483647
        v = seed % 1000000
        if not contains(root, v):
            root = insert(root, v)
            keys.append(v)
            added += 1


add_random(1000)
print("tree size " + str(size(root)))
for k in [1, 250, 500, 1000]:
    v1, pushed = kth_inorder(root, k)
    v2, visited = kth_by_size(root, k)
    print("k=" + str(k) + ": " + str(v2) + " | in-order touches " + str(pushed) + ", size walk touches " + str(visited)
          + ", same " + str(v1 == v2).lower())
add_random(200)
ordered = sorted(keys)
ok = all(kth_by_size(root, k)[0] == ordered[k - 1] for k in range(1, len(ordered) + 1))
print("after 200 more inserts: size " + str(size(root)) + ", every rank matches sorted order " + str(ok).lower())
print("k=1201 (out of range): " + str(kth_by_size(root, 1201)[0]))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given the root of a binary search tree and an integer k, write a JavaScript function that returns the kth smallest value in the tree (k is 1-indexed). Then tell me what you would change if the tree is modified often and kth-smallest is asked many times."

**What a strong answer should cover:**
- In-order traversal of a BST visits values in sorted order, so the kth visited node is the answer.
- Stop early: an iterative in-order walk with an explicit stack costs O(h + k) time and O(h) space instead of O(n).
- The simple version (collect the whole in-order list, return index k − 1) is O(n) time and O(n) space — correct, but wasteful.
- The follow-up: store a subtree size in every node (an order-statistic tree) so each query is one root-to-node walk, O(h), and updates keep sizes current.
- Invalid k (k < 1 or k > n) and what to return.
- JavaScript specifics: an array as the stack; a \`function*\` generator with \`yield*\` gives a lazy in-order; and sorting values for a check needs a numeric comparator, because \`sort()\` compares strings.

**Clarifying questions expected:**
- Is k always between 1 and the number of nodes?
- Will the tree be modified between queries, and how many queries will there be?

**Code / implementation expected:** Yes — an iterative in-order walk with an array as the stack, in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary search tree and a stack are.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a bookshelf where the books are already sorted by height, but the shelf is not a straight line: it is a family tree of little shelves, where every shelf has a shorter-books shelf to its left and a taller-books shelf to its right. Someone asks you for "the 3rd shortest book". You do not need to measure every book or re-sort anything. You just walk the shelves in left-to-right order — always finish the shorter side first — and count: one, two, three. Stop. That is the book.

The structure is a [binary search tree](/interview-question/what-is-a-binary-search-tree-bst), and "left side first, then me, then the right side" is an **in-order traversal**. This question checks two things: that you know in-order visits a BST in sorted order, and that you can stop the walk the moment you have your answer. The follow-up — "what if the tree changes and we ask this a million times?" — checks whether you can augment a data structure, which is a real-world skill (databases and ranking systems need "the kth item" queries all the time).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is k always valid, 1 ≤ k ≤ n? | If not, you need a "not found" result. The examples return -1 for k = 0 and k = n + 1. |
| Is k 1-indexed? | "1st smallest" is the minimum; an off-by-one here is the most common bug. |
| Is the tree modified between queries? How many queries? | One query: walk in-order. Many queries with inserts and deletes: store subtree sizes (section 5). |
| Can values repeat? | With duplicates, "kth smallest" usually counts each copy; the in-order walk does that naturally. |
| How deep can the tree be? | An explicit stack avoids recursion limits on skewed trees. |

## 3. The Core Idea: In-Order Visits the Values in Sorted Order

An [in-order traversal](/interview-question/what-are-the-tree-traversal-methods) visits a node's left subtree, then the node, then its right subtree. In a BST everything on the left is smaller and everything on the right is larger, so the values come out in increasing order. The kth node visited is the kth smallest.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 340" role="img" aria-label="BST with root 5. In-order visits 1, 2, 3, 4, 5, 6. With k equal to 3 the answer is node 3">
  <path class="d-edge" d="M 341 71 L 239 129"/>
  <path class="d-edge" d="M 379 71 L 481 129"/>
  <path class="d-edge" d="M 204 156 L 156 204"/>
  <path class="d-edge" d="M 236 156 L 284 204"/>
  <path class="d-edge" d="M 127 238 L 93 282"/>
  <circle class="d-box-muted" cx="360" cy="60" r="22"/>
  <text class="d-text" x="360" y="66" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="220" cy="140" r="22"/>
  <text class="d-text" x="220" y="146" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="500" cy="140" r="22"/>
  <text class="d-text" x="500" y="146" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="140" cy="220" r="22"/>
  <text class="d-text" x="140" y="226" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="300" cy="220" r="22"/>
  <text class="d-text" x="300" y="226" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="80" cy="300" r="22"/>
  <text class="d-text" x="80" y="306" text-anchor="middle">1</text>
  <text class="d-sub" x="390" y="66" text-anchor="start">visit 5</text>
  <text class="d-text d-accent" x="250" y="146" text-anchor="start">visit 3</text>
  <text class="d-sub" x="530" y="146" text-anchor="start">visit 6</text>
  <text class="d-sub" x="170" y="226" text-anchor="start">visit 2</text>
  <text class="d-sub" x="330" y="226" text-anchor="start">visit 4</text>
  <text class="d-sub" x="110" y="306" text-anchor="start">visit 1</text>
  <text class="d-text d-accent" x="20" y="30" text-anchor="start">k = 3</text>
</svg>

The walk goes down the left edge first (5, 3, 2, 1 are pushed), then pops 1 (visit 1), 2 (visit 2), 3 (visit 3) — and with k = 3 it stops there, never touching 4, 5 or 6.

📌 **Interview term: In-order traversal** — left subtree, node, right subtree. On a BST it produces the values in sorted order.

📌 **Interview term: Kth order statistic** — the kth smallest value of a collection. The minimum is the 1st order statistic, the median is the middle one.

**Brute force.** Collect the whole in-order sequence into a list, return element k − 1. It is correct and easy to write, but it always visits all n nodes and stores all n values, even for k = 1.

**Better: stop early with an explicit stack.** Simulate the recursion yourself:

1. Push the current node and keep going left until there is no left child (push the "left spine").
2. Pop a node: it is the next smallest value. Count it; if the count reaches k, return it.
3. Move to its right child and repeat from step 1.

The stack never holds more than one root-to-leaf path, so it uses O(h) memory. The walk does O(h) work to reach the smallest node and then roughly one step per value it visits, so the time is **O(h + k)**.

📌 **Interview term: O(h + k)** — the cost of the early-stop walk: reaching the first value takes up to h steps, then each of the k pops costs amortised O(1). On a balanced tree that is O(log n + k).

📌 **Interview term: Explicit stack** — a stack data structure you manage yourself, replacing the call stack of a recursive function. It removes the recursion-depth limit and lets you stop at any moment.

## 4. The Code in JavaScript

The early-stop walk from example 1. An array is the stack: \`push\` and \`pop\` work on its end.

~~~javascript
// Iterative in-order that stops at the k-th pop.
// Returns [value, pops]; value is -1 if k is out of range.
function kthSmallest(root, k) {
  if (k < 1) return [-1, 0];
  const stack = [];
  let node = root;
  let pops = 0;
  while (stack.length > 0 || node !== null) {
    while (node !== null) {        // push the whole left spine
      stack.push(node);
      node = node.left;
    }
    node = stack.pop();            // next smallest value
    pops++;
    if (pops === k) return [node.val, pops];
    node = node.right;
  }
  return [-1, pops];
}
~~~

**What to point out in this code:**

- The guard \`if (k < 1)\` returns at once; without it, k = 0 would walk the whole tree looking for a pop count that never comes.
- Returning \`[value, pops]\` and destructuring with \`const [value, pops] = ...\` is the idiomatic way to return two things; in an interview return just the value.
- There is no recursion, so a deep, skewed tree cannot throw \`RangeError: Maximum call stack size exceeded\`.

**A generator alternative.** A \`function*\` yields the in-order values lazily, and a \`for...of\` loop stops consuming as soon as it has the kth one:

~~~javascript
function* inorder(node) {
  if (node) {
    yield* inorder(node.left);
    yield node.val;
    yield* inorder(node.right);
  }
}

function kthSmallestGen(root, k) {
  let i = 0;
  for (const v of inorder(root)) if (++i === k) return v;
  return -1;
}
~~~

On the example tree this returned 3 for k = 3 and -1 for k = 10 when we ran it. It reads nicely, but each level of the tree is another nested generator, so it is still recursion underneath.

**The size-augmented query (example 2).** Each node stores \`size\`; \`size(null)\` is 0:

~~~javascript
// Order-statistic query: one root-to-node walk. Returns [value, nodes visited].
function kthBySize(root, k) {
  let node = root;
  let visited = 0;
  while (node !== null) {
    visited++;
    const left = size(node.left);
    if (k === left + 1) return [node.val, visited];  // exactly \`left\` nodes are smaller
    if (k <= left) node = node.left;                  // answer is in the left subtree
    else {
      k -= left + 1;                                  // skip left subtree and this node
      node = node.right;
    }
  }
  return [-1, visited];
}
~~~

One more JavaScript trap appears in example 2: to check every rank it sorts the keys with \`keys.slice().sort((a, b) => a - b)\`. Without the comparator, \`sort()\` converts numbers to strings and would put 100000 before 99.

## 5. Follow-Up: Many Queries on a Changing Tree

If the tree gets inserts and deletes and you are asked for the kth smallest over and over, O(h + k) per query is too slow when k is large (k = n/2 costs O(n) each time). The fix is to store one more number in each node: the **size** of its subtree (how many nodes it contains, itself included).

With sizes, one walk from the root finds the answer. At each node, let \`left\` be the size of its left subtree:

- If \`k == left + 1\`, this node is the answer: exactly \`left\` values are smaller.
- If \`k <= left\`, the answer is in the left subtree; go left with the same k.
- Otherwise skip the left subtree and this node: \`k -= left + 1\`, go right.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 340" role="img" aria-label="The same BST with subtree sizes. Root 5 has size 6, node 3 has size 4. Looking for k equal to 4 goes from 5 to 3 to 4">
  <path class="d-edge-accent" d="M 341 71 L 239 129"/>
  <path class="d-edge" d="M 379 71 L 481 129"/>
  <path class="d-edge" d="M 204 156 L 156 204"/>
  <path class="d-edge-accent" d="M 236 156 L 284 204"/>
  <path class="d-edge" d="M 127 238 L 93 282"/>
  <circle class="d-box-accent" cx="360" cy="60" r="22"/>
  <text class="d-text" x="360" y="66" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="220" cy="140" r="22"/>
  <text class="d-text" x="220" y="146" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="500" cy="140" r="22"/>
  <text class="d-text" x="500" y="146" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="140" cy="220" r="22"/>
  <text class="d-text" x="140" y="226" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="300" cy="220" r="22"/>
  <text class="d-text" x="300" y="226" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="80" cy="300" r="22"/>
  <text class="d-text" x="80" y="306" text-anchor="middle">1</text>
  <text class="d-sub" x="390" y="66" text-anchor="start">size 6</text>
  <text class="d-sub" x="250" y="146" text-anchor="start">size 4</text>
  <text class="d-sub" x="530" y="146" text-anchor="start">size 1</text>
  <text class="d-sub" x="170" y="226" text-anchor="start">size 2</text>
  <text class="d-sub" x="330" y="226" text-anchor="start">size 1</text>
  <text class="d-sub" x="110" y="306" text-anchor="start">size 1</text>
  <text class="d-text d-accent" x="20" y="30" text-anchor="start">k = 4</text>
</svg>

For k = 4: at 5, the left subtree has 4 nodes and k ≤ 4, so go left. At 3, the left subtree has 2 nodes; k = 4 > 3, so skip 2 + 1 = 3 values: k becomes 1, go right. At 4, the left subtree is empty and k = 1 = 0 + 1: the answer is 4. Three nodes touched.

Every insert adds 1 to the size of each node on its path, and every delete subtracts 1, so updates stay O(h). In a self-balancing tree (red-black, AVL) the rotations also update the two sizes they touch, and every operation becomes O(log n). Example 2 measures the difference on 1,000 random keys: for k = 500 the in-order walk touched 510 nodes and the size walk touched 20.

📌 **Interview term: Augmented BST** — a BST that stores extra information in each node (here the subtree size), kept up to date by insert and delete, to answer new kinds of queries quickly.

📌 **Interview term: Order-statistic tree** — a BST augmented with subtree sizes. It answers "kth smallest" and "rank of x" in O(h).

## 6. Putting It Together

Use the early-stop walk for a one-off question (it needs no change to the tree), and the size-augmented tree when the same tree is queried many times while it changes. Both rely on the same fact — in-order is sorted — and both stop as soon as they know the answer.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 draws 1,000 distinct random keys below 1,000,000 from a small deterministic generator (MINSTD, seed 7), so every language builds the same tree.

**Example 1 — early-stop in-order for k = 0..7, checked against the full-list method** prints:

~~~text
k=0: -1 (popped 0, list method -1)
k=1: 1 (popped 1, list method 1)
k=2: 2 (popped 2, list method 2)
k=3: 3 (popped 3, list method 3)
k=4: 4 (popped 4, list method 4)
k=5: 5 (popped 5, list method 5)
k=6: 6 (popped 6, list method 6)
k=7: -1 (popped 6, list method -1)
tree [3, 1, 4, null, 2], k=1: 1
tree [3, 1, 4, null, 2], k=3: 3
~~~

**Example 2 — order-statistic tree: in-order walk vs size walk on 1,000 random keys** prints:

~~~text
tree size 1000
k=1: 245 | in-order touches 6, size walk touches 6, same true
k=250: 238671 | in-order touches 254, size walk touches 12, same true
k=500: 471995 | in-order touches 510, size walk touches 20, same true
k=1000: 999424 | in-order touches 1000, size walk touches 6, same true
after 200 more inserts: size 1200, every rank matches sorted order true
k=1201 (out of range): -1
~~~

Reading example 1: the number of pops equals k — the walk stops the moment it has the answer — and both methods return -1 for k = 0 and k = 7 on a 6-node tree. Reading example 2: "touches" counts nodes pushed by the in-order walk and nodes visited by the size walk. For k = 1 both touch 6 nodes (the left spine), but for k = 500 the in-order walk touched 510 nodes and the size walk 20. After 200 more inserts the sizes were still right: every rank from 1 to 1,200 matched the sorted list.

## 8. Complexity

| Approach | Time per query | Space | Why |
| :--- | :--- | :--- | :--- |
| Full in-order list, then index | O(n) | O(n) | visits and stores every node, even for k = 1 |
| Early-stop in-order (explicit stack) | O(h + k) | O(h) | reach the minimum in h steps, then stop after k pops |
| Size-augmented BST | O(h) | O(n) extra ints | one root-to-node walk; 20 nodes touched vs 510 for k = 500 in example 2 |
| Size-augmented, self-balancing | O(log n) | O(n) | h stays O(log n); updates also O(log n) |

h is the height: about log2(n) for a balanced tree, up to n − 1 for a chain. The \`function*\` generator version has the same time but adds one generator per level of the tree.

## 9. Edge Cases

- **k = 1** — the minimum: the leftmost node. The early-stop walk pushes the left spine and pops once.
- **k = n** — the maximum: the walk visits everything; the size walk goes straight down the right edge (6 nodes touched for k = 1000 in example 2).
- **k < 1 or k > n** — no answer; the examples return -1. In an interview, say what you return (or throw) before coding.
- **Skewed tree** — a chain of n nodes makes h = n, so even the "O(h)" methods are O(n). The explicit stack still avoids recursion limits.
- **Duplicates** — the in-order walk counts each copy; for "kth distinct value" skip a popped value equal to the previous one.

## Common Pitfalls

- **Off-by-one on k.** k is 1-indexed: the 1st smallest is the minimum. The list method must return \`values[k - 1]\`.
- **Not stopping early.** Building the whole in-order array always costs O(n) time and memory; return from inside the loop.
- **Default \`sort()\` when checking results.** \`[100, 9, 1].sort()\` sorts as strings; use \`sort((a, b) => a - b)\`.
- **Out-of-range \`k\` returning \`undefined\`.** \`values[k - 1]\` on a short array silently gives \`undefined\`; return an explicit -1 or throw.
- **Forgetting to update sizes.** In the augmented tree, an insert that finds the key already present must not increment sizes — example 2 checks \`contains\` first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key fact:</strong> <span style="color:#f0e2c8;">In-order traversal of a BST visits values in sorted order, so the kth node visited is the kth smallest.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">Iterative in-order with an array as the stack: push the left spine, pop, count; return when the count hits k, else go right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">O(h + k) time and O(h) space, versus O(n) and O(n) for building the whole sorted array.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Follow-up:</strong> <span style="color:#f0e2c8;">For many queries on a changing tree, store subtree sizes: compare k with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size(left) + 1</code> and walk down once, O(h).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">No recursion, so no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code> on deep trees; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function*</code> generator is a neat lazy alternative.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if k is larger than the tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The walk runs out of nodes; I return -1 (or throw a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>), and I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k &lt; 1</code> up front.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find the kth largest?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do a reverse in-order — right, node, left — and stop at the kth pop. Same O(h + k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep the sizes correct on delete?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Subtract 1 from every node on the path to the removed node; in a self-balancing tree, recompute the sizes of the nodes a rotation moves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare against the sorted values for every k — sorted with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a - b</code>, since the default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort()</code> compares strings.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it in O(1) extra space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Morris in-order traversal threads temporary pointers instead of using a stack; it is O(n) time and restores the tree as it goes.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **In-order traversal** | Left, node, right; sorted order on a BST |
| **Kth order statistic** | The kth smallest value of a collection |
| **O(h + k)** | Cost of the early-stop walk: h steps down, then k pops |
| **Explicit stack** | A stack you manage yourself instead of recursion |
| **Augmented BST** | A BST that stores extra data per node, kept up to date on updates |
| **Order-statistic tree** | A BST with subtree sizes; kth smallest and rank in O(h) |

---
**Conclusion:** Because an in-order walk of a BST produces its values in sorted order, the kth smallest value is simply the kth node that walk visits. Doing the walk with an array as an explicit stack and returning at the kth pop costs O(h + k) time and O(h) space and cannot throw \`RangeError\` on deep trees. When the tree changes and the question is asked again and again, store a subtree size in each node: one root-to-node walk then answers any k in O(h) — 20 nodes instead of 510 for k = 500 in example 2. And when you test it, sort with \`(a, b) => a - b\`.`,
        examples: [
          {
            label: "Early-stop in-order for every k, checked against the list method",
            code: `class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// Level-order array with null for gaps (LeetCode style) -> tree.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new Node(values[0]);
  const queue = [root];
  let i = 1;
  for (let q = 0; q < queue.length && i < values.length; q++) {
    const node = queue[q];
    if (i < values.length && values[i] !== null) queue.push((node.left = new Node(values[i])));
    i++;
    if (i < values.length && values[i] !== null) queue.push((node.right = new Node(values[i])));
    i++;
  }
  return root;
}

// Iterative in-order that stops at the k-th pop.
// Returns [value, pops]; value is -1 if k is out of range.
function kthSmallest(root, k) {
  if (k < 1) return [-1, 0];
  const stack = [];
  let node = root;
  let pops = 0;
  while (stack.length > 0 || node !== null) {
    while (node !== null) {        // push the whole left spine
      stack.push(node);
      node = node.left;
    }
    node = stack.pop();            // next smallest value
    pops++;
    if (pops === k) return [node.val, pops];
    node = node.right;
  }
  return [-1, pops];
}

// Simple version: collect the whole in-order list, then index it.
function kthByList(root, k) {
  const out = [];
  const walk = (node) => {
    if (node === null) return;
    walk(node.left);
    out.push(node.val);
    walk(node.right);
  };
  walk(root);
  return k >= 1 && k <= out.length ? out[k - 1] : -1;
}

const root = build([5, 3, 6, 2, 4, null, null, 1]);
for (let k = 0; k < 8; k++) {
  const [value, pops] = kthSmallest(root, k);
  console.log("k=" + k + ": " + value + " (popped " + pops + ", list method " + kthByList(root, k) + ")");
}
const small = build([3, 1, 4, null, 2]);
console.log("tree [3, 1, 4, null, 2], k=1: " + kthSmallest(small, 1)[0]);
console.log("tree [3, 1, 4, null, 2], k=3: " + kthSmallest(small, 3)[0]);`,
          },
          {
            label: "Order-statistic tree: subtree sizes vs in-order walk (1,000 keys)",
            code: `class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
    this.size = 1;           // nodes in the subtree rooted here
  }
}

const size = (node) => (node === null ? 0 : node.size);

function contains(root, val) {
  let node = root;
  while (node !== null && node.val !== val) node = val < node.val ? node.left : node.right;
  return node !== null;
}

// Insert a NEW key, adding 1 to the size of every node on the way down.
function insert(root, val) {
  if (root === null) return new Node(val);
  let node = root;
  while (true) {
    node.size++;
    if (val < node.val) {
      if (node.left === null) { node.left = new Node(val); return root; }
      node = node.left;
    } else {
      if (node.right === null) { node.right = new Node(val); return root; }
      node = node.right;
    }
  }
}

// Order-statistic query: one root-to-node walk. Returns [value, nodes visited].
function kthBySize(root, k) {
  let node = root;
  let visited = 0;
  while (node !== null) {
    visited++;
    const left = size(node.left);
    if (k === left + 1) return [node.val, visited];  // exactly \`left\` nodes are smaller
    if (k <= left) node = node.left;                  // answer is in the left subtree
    else {
      k -= left + 1;                                  // skip left subtree and this node
      node = node.right;
    }
  }
  return [-1, visited];
}

// Early-stop in-order. Returns [value, nodes pushed = nodes touched].
function kthInorder(root, k) {
  const stack = [];
  let node = root;
  let pops = 0;
  let pushed = 0;
  while (stack.length > 0 || node !== null) {
    while (node !== null) {
      stack.push(node);
      pushed++;
      node = node.left;
    }
    node = stack.pop();
    pops++;
    if (pops === k) return [node.val, pushed];
    node = node.right;
  }
  return [-1, pushed];
}

let root = null;
const keys = [];
let seed = 7;
function addRandom(count) {
  let added = 0;
  while (added < count) {
    seed = (seed * 48271) % 2147483647;
    const v = seed % 1000000;
    if (!contains(root, v)) {
      root = insert(root, v);
      keys.push(v);
      added++;
    }
  }
}

addRandom(1000);
console.log("tree size " + size(root));
for (const k of [1, 250, 500, 1000]) {
  const [v1, pushed] = kthInorder(root, k);
  const [v2, visited] = kthBySize(root, k);
  console.log("k=" + k + ": " + v2 + " | in-order touches " + pushed + ", size walk touches " + visited +
    ", same " + (v1 === v2));
}
addRandom(200);
const ordered = keys.slice().sort((a, b) => a - b);   // numeric comparator, not the default string sort
let ok = true;
for (let k = 1; k <= ordered.length; k++) if (kthBySize(root, k)[0] !== ordered[k - 1]) ok = false;
console.log("after 200 more inserts: size " + size(root) + ", every rank matches sorted order " + ok);
console.log("k=1201 (out of range): " + kthBySize(root, 1201)[0]);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given the root of a binary search tree and an integer k, write a Java function that returns the kth smallest value in the tree (k is 1-indexed). Then tell me what you would change if the tree is modified often and kth-smallest is asked many times."

**What a strong answer should cover:**
- In-order traversal of a BST visits values in sorted order, so the kth visited node is the answer.
- Stop early: an iterative in-order walk with an explicit stack costs O(h + k) time and O(h) space instead of O(n).
- The simple version (collect the whole in-order list, return index k − 1) is O(n) time and O(n) space — correct, but wasteful.
- The follow-up: store a subtree size in every node (an order-statistic tree) so each query is one root-to-node walk, O(h), and updates keep sizes current.
- Invalid k (k < 1 or k > n) and what to return.
- Java specifics: \`ArrayDeque\` as the stack, and since Java has no pass-by-reference for \`int\`, a recursive version needs a field or a one-element array for the counter.

**Clarifying questions expected:**
- Is k always between 1 and the number of nodes?
- Will the tree be modified between queries, and how many queries will there be?

**Code / implementation expected:** Yes — an iterative in-order walk with an \`ArrayDeque\`, in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary search tree and a stack are.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a bookshelf where the books are already sorted by height, but the shelf is not a straight line: it is a family tree of little shelves, where every shelf has a shorter-books shelf to its left and a taller-books shelf to its right. Someone asks you for "the 3rd shortest book". You do not need to measure every book or re-sort anything. You just walk the shelves in left-to-right order — always finish the shorter side first — and count: one, two, three. Stop. That is the book.

The structure is a [binary search tree](/interview-question/what-is-a-binary-search-tree-bst), and "left side first, then me, then the right side" is an **in-order traversal**. This question checks two things: that you know in-order visits a BST in sorted order, and that you can stop the walk the moment you have your answer. The follow-up — "what if the tree changes and we ask this a million times?" — checks whether you can augment a data structure, which is a real-world skill (databases and ranking systems need "the kth item" queries all the time).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is k always valid, 1 ≤ k ≤ n? | If not, you need a "not found" result. The examples return -1 for k = 0 and k = n + 1. |
| Is k 1-indexed? | "1st smallest" is the minimum; an off-by-one here is the most common bug. |
| Is the tree modified between queries? How many queries? | One query: walk in-order. Many queries with inserts and deletes: store subtree sizes (section 5). |
| Can values repeat? | With duplicates, "kth smallest" usually counts each copy; the in-order walk does that naturally. |
| How deep can the tree be? | An explicit stack avoids recursion limits on skewed trees. |

## 3. The Core Idea: In-Order Visits the Values in Sorted Order

An [in-order traversal](/interview-question/what-are-the-tree-traversal-methods) visits a node's left subtree, then the node, then its right subtree. In a BST everything on the left is smaller and everything on the right is larger, so the values come out in increasing order. The kth node visited is the kth smallest.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 340" role="img" aria-label="BST with root 5. In-order visits 1, 2, 3, 4, 5, 6. With k equal to 3 the answer is node 3">
  <path class="d-edge" d="M 341 71 L 239 129"/>
  <path class="d-edge" d="M 379 71 L 481 129"/>
  <path class="d-edge" d="M 204 156 L 156 204"/>
  <path class="d-edge" d="M 236 156 L 284 204"/>
  <path class="d-edge" d="M 127 238 L 93 282"/>
  <circle class="d-box-muted" cx="360" cy="60" r="22"/>
  <text class="d-text" x="360" y="66" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="220" cy="140" r="22"/>
  <text class="d-text" x="220" y="146" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="500" cy="140" r="22"/>
  <text class="d-text" x="500" y="146" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="140" cy="220" r="22"/>
  <text class="d-text" x="140" y="226" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="300" cy="220" r="22"/>
  <text class="d-text" x="300" y="226" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="80" cy="300" r="22"/>
  <text class="d-text" x="80" y="306" text-anchor="middle">1</text>
  <text class="d-sub" x="390" y="66" text-anchor="start">visit 5</text>
  <text class="d-text d-accent" x="250" y="146" text-anchor="start">visit 3</text>
  <text class="d-sub" x="530" y="146" text-anchor="start">visit 6</text>
  <text class="d-sub" x="170" y="226" text-anchor="start">visit 2</text>
  <text class="d-sub" x="330" y="226" text-anchor="start">visit 4</text>
  <text class="d-sub" x="110" y="306" text-anchor="start">visit 1</text>
  <text class="d-text d-accent" x="20" y="30" text-anchor="start">k = 3</text>
</svg>

The walk goes down the left edge first (5, 3, 2, 1 are pushed), then pops 1 (visit 1), 2 (visit 2), 3 (visit 3) — and with k = 3 it stops there, never touching 4, 5 or 6.

📌 **Interview term: In-order traversal** — left subtree, node, right subtree. On a BST it produces the values in sorted order.

📌 **Interview term: Kth order statistic** — the kth smallest value of a collection. The minimum is the 1st order statistic, the median is the middle one.

**Brute force.** Collect the whole in-order sequence into a list, return element k − 1. It is correct and easy to write, but it always visits all n nodes and stores all n values, even for k = 1.

**Better: stop early with an explicit stack.** Simulate the recursion yourself:

1. Push the current node and keep going left until there is no left child (push the "left spine").
2. Pop a node: it is the next smallest value. Count it; if the count reaches k, return it.
3. Move to its right child and repeat from step 1.

The stack never holds more than one root-to-leaf path, so it uses O(h) memory. The walk does O(h) work to reach the smallest node and then roughly one step per value it visits, so the time is **O(h + k)**.

📌 **Interview term: O(h + k)** — the cost of the early-stop walk: reaching the first value takes up to h steps, then each of the k pops costs amortised O(1). On a balanced tree that is O(log n + k).

📌 **Interview term: Explicit stack** — a stack data structure you manage yourself, replacing the call stack of a recursive function. It removes the recursion-depth limit and lets you stop at any moment.

## 4. The Code in Java

The early-stop walk from example 1, with \`ArrayDeque\` as the stack (\`push\` / \`pop\` work on its head):

~~~java
/**
 * Iterative in-order that stops at the k-th pop.
 * Returns {value, pops}; value is -1 if k is out of range.
 */
static int[] kthSmallest(Node root, int k) {
    if (k < 1) return new int[] {-1, 0};
    Deque<Node> stack = new ArrayDeque<>();   // faster than the legacy Stack class
    Node node = root;
    int pops = 0;
    while (!stack.isEmpty() || node != null) {
        while (node != null) {                 // push the whole left spine
            stack.push(node);
            node = node.left;
        }
        node = stack.pop();                    // next smallest value
        pops++;
        if (pops == k) return new int[] {node.val, pops};
        node = node.right;
    }
    return new int[] {-1, pops};
}
~~~

**What to point out in this code:**

- The guard \`if (k < 1)\` returns at once; without it, k = 0 would walk the whole tree looking for a pop count that never comes.
- Java methods return one value, so the example returns \`new int[] {value, pops}\` to show how many nodes were visited. In an interview return just the \`int\`; in real code a \`record Result(int value, int pops)\` (Java 16+) is clearer.
- There is no recursion, so a deep, skewed tree cannot throw \`StackOverflowError\`.

**The recursive version needs a mutable counter.** Java passes \`int\` by value, so a recursive in-order cannot decrement \`k\` and have the caller see it. Use a field (or a one-element array):

~~~java
static int count, answer;

static void inorder(Node node, int k) {
    if (node == null || count >= k) return;   // stop once found
    inorder(node.left, k);
    if (++count == k) { answer = node.val; return; }
    inorder(node.right, k);
}
~~~

Reset \`count = 0\` before each query. On the example tree this printed 1 2 3 4 5 6 for k = 1 to 6 when we ran it.

**The size-augmented query (example 2).** Each node stores \`size\`; \`size(null)\` is 0:

~~~java
/** Order-statistic query: one root-to-node walk. Returns {value, nodes visited}. */
static int[] kthBySize(Node root, int k) {
    Node node = root;
    int visited = 0;
    while (node != null) {
        visited++;
        int left = size(node.left);
        if (k == left + 1) return new int[] {node.val, visited};  // exactly left nodes are smaller
        if (k <= left) node = node.left;                           // answer is in the left subtree
        else {
            k -= left + 1;                                         // skip left subtree and this node
            node = node.right;
        }
    }
    return new int[] {-1, visited};
}
~~~

## 5. Follow-Up: Many Queries on a Changing Tree

If the tree gets inserts and deletes and you are asked for the kth smallest over and over, O(h + k) per query is too slow when k is large (k = n/2 costs O(n) each time). The fix is to store one more number in each node: the **size** of its subtree (how many nodes it contains, itself included).

With sizes, one walk from the root finds the answer. At each node, let \`left\` be the size of its left subtree:

- If \`k == left + 1\`, this node is the answer: exactly \`left\` values are smaller.
- If \`k <= left\`, the answer is in the left subtree; go left with the same k.
- Otherwise skip the left subtree and this node: \`k -= left + 1\`, go right.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 340" role="img" aria-label="The same BST with subtree sizes. Root 5 has size 6, node 3 has size 4. Looking for k equal to 4 goes from 5 to 3 to 4">
  <path class="d-edge-accent" d="M 341 71 L 239 129"/>
  <path class="d-edge" d="M 379 71 L 481 129"/>
  <path class="d-edge" d="M 204 156 L 156 204"/>
  <path class="d-edge-accent" d="M 236 156 L 284 204"/>
  <path class="d-edge" d="M 127 238 L 93 282"/>
  <circle class="d-box-accent" cx="360" cy="60" r="22"/>
  <text class="d-text" x="360" y="66" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="220" cy="140" r="22"/>
  <text class="d-text" x="220" y="146" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="500" cy="140" r="22"/>
  <text class="d-text" x="500" y="146" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="140" cy="220" r="22"/>
  <text class="d-text" x="140" y="226" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="300" cy="220" r="22"/>
  <text class="d-text" x="300" y="226" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="80" cy="300" r="22"/>
  <text class="d-text" x="80" y="306" text-anchor="middle">1</text>
  <text class="d-sub" x="390" y="66" text-anchor="start">size 6</text>
  <text class="d-sub" x="250" y="146" text-anchor="start">size 4</text>
  <text class="d-sub" x="530" y="146" text-anchor="start">size 1</text>
  <text class="d-sub" x="170" y="226" text-anchor="start">size 2</text>
  <text class="d-sub" x="330" y="226" text-anchor="start">size 1</text>
  <text class="d-sub" x="110" y="306" text-anchor="start">size 1</text>
  <text class="d-text d-accent" x="20" y="30" text-anchor="start">k = 4</text>
</svg>

For k = 4: at 5, the left subtree has 4 nodes and k ≤ 4, so go left. At 3, the left subtree has 2 nodes; k = 4 > 3, so skip 2 + 1 = 3 values: k becomes 1, go right. At 4, the left subtree is empty and k = 1 = 0 + 1: the answer is 4. Three nodes touched.

Every insert adds 1 to the size of each node on its path, and every delete subtracts 1, so updates stay O(h). In a self-balancing tree (red-black, AVL) the rotations also update the two sizes they touch, and every operation becomes O(log n). Example 2 measures the difference on 1,000 random keys: for k = 500 the in-order walk touched 510 nodes and the size walk touched 20.

📌 **Interview term: Augmented BST** — a BST that stores extra information in each node (here the subtree size), kept up to date by insert and delete, to answer new kinds of queries quickly.

📌 **Interview term: Order-statistic tree** — a BST augmented with subtree sizes. It answers "kth smallest" and "rank of x" in O(h).

## 6. Putting It Together

Use the early-stop walk for a one-off question (it needs no change to the tree), and the size-augmented tree when the same tree is queried many times while it changes. Both rely on the same fact — in-order is sorted — and both stop as soon as they know the answer.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 draws 1,000 distinct random keys below 1,000,000 from a small deterministic generator (MINSTD, seed 7), so every language builds the same tree.

**Example 1 — early-stop in-order for k = 0..7, checked against the full-list method** prints:

~~~text
k=0: -1 (popped 0, list method -1)
k=1: 1 (popped 1, list method 1)
k=2: 2 (popped 2, list method 2)
k=3: 3 (popped 3, list method 3)
k=4: 4 (popped 4, list method 4)
k=5: 5 (popped 5, list method 5)
k=6: 6 (popped 6, list method 6)
k=7: -1 (popped 6, list method -1)
tree [3, 1, 4, null, 2], k=1: 1
tree [3, 1, 4, null, 2], k=3: 3
~~~

**Example 2 — order-statistic tree: in-order walk vs size walk on 1,000 random keys** prints:

~~~text
tree size 1000
k=1: 245 | in-order touches 6, size walk touches 6, same true
k=250: 238671 | in-order touches 254, size walk touches 12, same true
k=500: 471995 | in-order touches 510, size walk touches 20, same true
k=1000: 999424 | in-order touches 1000, size walk touches 6, same true
after 200 more inserts: size 1200, every rank matches sorted order true
k=1201 (out of range): -1
~~~

Reading example 1: the number of pops equals k — the walk stops the moment it has the answer — and both methods return -1 for k = 0 and k = 7 on a 6-node tree. Reading example 2: "touches" counts nodes pushed by the in-order walk and nodes visited by the size walk. For k = 1 both touch 6 nodes (the left spine), but for k = 500 the in-order walk touched 510 nodes and the size walk 20. After 200 more inserts the sizes were still right: every rank from 1 to 1,200 matched the sorted list.

## 8. Complexity

| Approach | Time per query | Space | Why |
| :--- | :--- | :--- | :--- |
| Full in-order list, then index | O(n) | O(n) | visits and stores every node, even for k = 1 |
| Early-stop in-order (explicit stack) | O(h + k) | O(h) | reach the minimum in h steps, then stop after k pops |
| Size-augmented BST | O(h) | O(n) extra ints | one root-to-node walk; 20 nodes touched vs 510 for k = 500 in example 2 |
| Size-augmented, self-balancing | O(log n) | O(n) | h stays O(log n); updates also O(log n) |

h is the height: about log2(n) for a balanced tree, up to n − 1 for a chain. The recursive version with a counter field is also O(h + k) time and O(h) stack, but deep trees risk \`StackOverflowError\`.

## 9. Edge Cases

- **k = 1** — the minimum: the leftmost node. The early-stop walk pushes the left spine and pops once.
- **k = n** — the maximum: the walk visits everything; the size walk goes straight down the right edge (6 nodes touched for k = 1000 in example 2).
- **k < 1 or k > n** — no answer; the examples return -1. In an interview, say what you return (or throw) before coding.
- **Skewed tree** — a chain of n nodes makes h = n, so even the "O(h)" methods are O(n). The explicit stack still avoids recursion limits.
- **Duplicates** — the in-order walk counts each copy; for "kth distinct value" skip a popped value equal to the previous one.

## Common Pitfalls

- **Off-by-one on k.** k is 1-indexed: the 1st smallest is the minimum. The list method must return \`values.get(k - 1)\`.
- **Decrementing a parameter in recursion.** \`k--\` inside a recursive method changes only that call's copy; use a field, a one-element \`int[]\`, or the iterative version.
- **Not stopping early.** Building the whole in-order \`List<Integer>\` costs O(n) time and boxes every value.
- **Using \`Stack\`.** It works but is a synchronized legacy class; \`ArrayDeque\` is the recommended stack.
- **Forgetting to update sizes.** In the augmented tree, an insert that finds the key already present must not increment sizes — example 2 checks \`contains\` first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key fact:</strong> <span style="color:#f0e2c8;">In-order traversal of a BST visits values in sorted order, so the kth node visited is the kth smallest.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">Iterative in-order with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> as the stack: push the left spine, pop, count; return when the count hits k, else go right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">O(h + k) time and O(h) space, versus O(n) and O(n) for building the whole sorted list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Follow-up:</strong> <span style="color:#f0e2c8;">For many queries on a changing tree, store subtree sizes: compare k with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size(left) + 1</code> and walk down once, O(h).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">The iterative version avoids <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>; a recursive one needs a field or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> counter because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> is passed by value.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if k is larger than the tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The walk runs out of nodes; I return -1 or throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IllegalArgumentException</code>, and I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k &lt; 1</code> up front.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find the kth largest?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do a reverse in-order — right, node, left — and stop at the kth pop. Same O(h + k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">TreeMap</code> give you this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeMap</code> has no O(log n) select-by-rank. Iterating <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keySet()</code> to the kth key is O(k); for fast rank queries you need your own size-augmented tree.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep the sizes correct on delete?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Subtract 1 from every node on the path to the removed node; in a self-balancing tree, recompute the sizes of the nodes a rotation moves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it in O(1) extra space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Morris in-order traversal threads temporary pointers instead of using a stack; it is O(n) time and restores the tree as it goes.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **In-order traversal** | Left, node, right; sorted order on a BST |
| **Kth order statistic** | The kth smallest value of a collection |
| **O(h + k)** | Cost of the early-stop walk: h steps down, then k pops |
| **Explicit stack** | A stack you manage yourself instead of recursion |
| **Augmented BST** | A BST that stores extra data per node, kept up to date on updates |
| **Order-statistic tree** | A BST with subtree sizes; kth smallest and rank in O(h) |

---
**Conclusion:** Because an in-order walk of a BST produces its values in sorted order, the kth smallest value is simply the kth node that walk visits. Doing the walk with an \`ArrayDeque\` as an explicit stack and returning at the kth pop costs O(h + k) time and O(h) space and cannot throw \`StackOverflowError\`; a recursive version needs a field for the counter because Java passes \`int\` by value. When the tree changes and the question is asked again and again, store a subtree size in each node: one root-to-node walk then answers any k in O(h) — 20 nodes instead of 510 for k = 500 in example 2.`,
        examples: [
          {
            label: "Early-stop in-order for every k, checked against the list method",
            code: `import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    /** Level-order array with null for gaps (LeetCode style) -> tree. */
    static Node build(Integer[] values) {
        if (values.length == 0 || values[0] == null) return null;
        Node root = new Node(values[0]);
        List<Node> queue = new ArrayList<>();
        queue.add(root);
        int i = 1;
        for (int q = 0; q < queue.size() && i < values.length; q++) {
            Node node = queue.get(q);
            if (i < values.length && values[i] != null) { node.left = new Node(values[i]); queue.add(node.left); }
            i++;
            if (i < values.length && values[i] != null) { node.right = new Node(values[i]); queue.add(node.right); }
            i++;
        }
        return root;
    }

    /**
     * Iterative in-order that stops at the k-th pop.
     * Returns {value, pops}; value is -1 if k is out of range.
     */
    static int[] kthSmallest(Node root, int k) {
        if (k < 1) return new int[] {-1, 0};
        Deque<Node> stack = new ArrayDeque<>();   // faster than the legacy Stack class
        Node node = root;
        int pops = 0;
        while (!stack.isEmpty() || node != null) {
            while (node != null) {                 // push the whole left spine
                stack.push(node);
                node = node.left;
            }
            node = stack.pop();                    // next smallest value
            pops++;
            if (pops == k) return new int[] {node.val, pops};
            node = node.right;
        }
        return new int[] {-1, pops};
    }

    static void walk(Node node, List<Integer> out) {
        if (node == null) return;
        walk(node.left, out);
        out.add(node.val);
        walk(node.right, out);
    }

    /** Simple version: collect the whole in-order list, then index it. */
    static int kthByList(Node root, int k) {
        List<Integer> out = new ArrayList<>();
        walk(root, out);
        return k >= 1 && k <= out.size() ? out.get(k - 1) : -1;
    }

    public static void main(String[] args) {
        Node root = build(new Integer[] {5, 3, 6, 2, 4, null, null, 1});
        for (int k = 0; k < 8; k++) {
            int[] r = kthSmallest(root, k);
            System.out.println("k=" + k + ": " + r[0] + " (popped " + r[1] + ", list method " + kthByList(root, k) + ")");
        }
        Node small = build(new Integer[] {3, 1, 4, null, 2});
        System.out.println("tree [3, 1, 4, null, 2], k=1: " + kthSmallest(small, 1)[0]);
        System.out.println("tree [3, 1, 4, null, 2], k=3: " + kthSmallest(small, 3)[0]);
    }
}`,
          },
          {
            label: "Order-statistic tree: subtree sizes vs in-order walk (1,000 keys)",
            code: `import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.List;

public class Main {
    static class Node {
        int val;
        int size = 1;          // nodes in the subtree rooted here
        Node left, right;
        Node(int val) { this.val = val; }
    }

    static int size(Node node) { return node == null ? 0 : node.size; }

    static boolean contains(Node root, int val) {
        Node node = root;
        while (node != null && node.val != val) node = val < node.val ? node.left : node.right;
        return node != null;
    }

    /** Insert a NEW key, adding 1 to the size of every node on the way down. */
    static Node insert(Node root, int val) {
        if (root == null) return new Node(val);
        Node node = root;
        while (true) {
            node.size++;
            if (val < node.val) {
                if (node.left == null) { node.left = new Node(val); return root; }
                node = node.left;
            } else {
                if (node.right == null) { node.right = new Node(val); return root; }
                node = node.right;
            }
        }
    }

    /** Order-statistic query: one root-to-node walk. Returns {value, nodes visited}. */
    static int[] kthBySize(Node root, int k) {
        Node node = root;
        int visited = 0;
        while (node != null) {
            visited++;
            int left = size(node.left);
            if (k == left + 1) return new int[] {node.val, visited};  // exactly left nodes are smaller
            if (k <= left) node = node.left;                           // answer is in the left subtree
            else {
                k -= left + 1;                                         // skip left subtree and this node
                node = node.right;
            }
        }
        return new int[] {-1, visited};
    }

    /** Early-stop in-order. Returns {value, nodes pushed = nodes touched}. */
    static int[] kthInorder(Node root, int k) {
        Deque<Node> stack = new ArrayDeque<>();
        Node node = root;
        int pops = 0, pushed = 0;
        while (!stack.isEmpty() || node != null) {
            while (node != null) {
                stack.push(node);
                pushed++;
                node = node.left;
            }
            node = stack.pop();
            if (++pops == k) return new int[] {node.val, pushed};
            node = node.right;
        }
        return new int[] {-1, pushed};
    }

    static Node root = null;
    static List<Integer> keys = new ArrayList<>();
    static long seed = 7;

    static void addRandom(int count) {
        int added = 0;
        while (added < count) {
            seed = seed * 48271 % 2147483647L;   // long: the product overflows int
            int v = (int) (seed % 1000000);
            if (!contains(root, v)) {
                root = insert(root, v);
                keys.add(v);
                added++;
            }
        }
    }

    public static void main(String[] args) {
        addRandom(1000);
        System.out.println("tree size " + size(root));
        for (int k : new int[] {1, 250, 500, 1000}) {
            int[] a = kthInorder(root, k);
            int[] b = kthBySize(root, k);
            System.out.println("k=" + k + ": " + b[0] + " | in-order touches " + a[1] + ", size walk touches " + b[1]
                    + ", same " + (a[0] == b[0]));
        }
        addRandom(200);
        List<Integer> ordered = new ArrayList<>(keys);
        Collections.sort(ordered);
        boolean ok = true;
        for (int k = 1; k <= ordered.size(); k++) if (kthBySize(root, k)[0] != ordered.get(k - 1)) ok = false;
        System.out.println("after 200 more inserts: size " + size(root) + ", every rank matches sorted order " + ok);
        System.out.println("k=1201 (out of range): " + kthBySize(root, 1201)[0]);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given the root of a binary search tree and an integer k, write a C++ function that returns the kth smallest value in the tree (k is 1-indexed). Then tell me what you would change if the tree is modified often and kth-smallest is asked many times."

**What a strong answer should cover:**
- In-order traversal of a BST visits values in sorted order, so the kth visited node is the answer.
- Stop early: an iterative in-order walk with an explicit stack costs O(h + k) time and O(h) space instead of O(n).
- The simple version (collect the whole in-order list, return index k − 1) is O(n) time and O(n) space — correct, but wasteful.
- The follow-up: store a subtree size in every node (an order-statistic tree) so each query is one root-to-node walk, O(h), and updates keep sizes current.
- Invalid k (k < 1 or k > n) and what to return.
- C++ specifics: \`std::stack\` (whose \`pop()\` returns \`void\`), returning a pair with structured bindings, and \`int& k\` by reference in a recursive version.

**Clarifying questions expected:**
- Is k always between 1 and the number of nodes?
- Will the tree be modified between queries, and how many queries will there be?

**Code / implementation expected:** Yes — an iterative in-order walk with \`std::stack\`, in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary search tree and a stack are.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a bookshelf where the books are already sorted by height, but the shelf is not a straight line: it is a family tree of little shelves, where every shelf has a shorter-books shelf to its left and a taller-books shelf to its right. Someone asks you for "the 3rd shortest book". You do not need to measure every book or re-sort anything. You just walk the shelves in left-to-right order — always finish the shorter side first — and count: one, two, three. Stop. That is the book.

The structure is a [binary search tree](/interview-question/what-is-a-binary-search-tree-bst), and "left side first, then me, then the right side" is an **in-order traversal**. This question checks two things: that you know in-order visits a BST in sorted order, and that you can stop the walk the moment you have your answer. The follow-up — "what if the tree changes and we ask this a million times?" — checks whether you can augment a data structure, which is a real-world skill (databases and ranking systems need "the kth item" queries all the time).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is k always valid, 1 ≤ k ≤ n? | If not, you need a "not found" result. The examples return -1 for k = 0 and k = n + 1. |
| Is k 1-indexed? | "1st smallest" is the minimum; an off-by-one here is the most common bug. |
| Is the tree modified between queries? How many queries? | One query: walk in-order. Many queries with inserts and deletes: store subtree sizes (section 5). |
| Can values repeat? | With duplicates, "kth smallest" usually counts each copy; the in-order walk does that naturally. |
| How deep can the tree be? | An explicit stack avoids recursion limits on skewed trees. |

## 3. The Core Idea: In-Order Visits the Values in Sorted Order

An [in-order traversal](/interview-question/what-are-the-tree-traversal-methods) visits a node's left subtree, then the node, then its right subtree. In a BST everything on the left is smaller and everything on the right is larger, so the values come out in increasing order. The kth node visited is the kth smallest.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 340" role="img" aria-label="BST with root 5. In-order visits 1, 2, 3, 4, 5, 6. With k equal to 3 the answer is node 3">
  <path class="d-edge" d="M 341 71 L 239 129"/>
  <path class="d-edge" d="M 379 71 L 481 129"/>
  <path class="d-edge" d="M 204 156 L 156 204"/>
  <path class="d-edge" d="M 236 156 L 284 204"/>
  <path class="d-edge" d="M 127 238 L 93 282"/>
  <circle class="d-box-muted" cx="360" cy="60" r="22"/>
  <text class="d-text" x="360" y="66" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="220" cy="140" r="22"/>
  <text class="d-text" x="220" y="146" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="500" cy="140" r="22"/>
  <text class="d-text" x="500" y="146" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="140" cy="220" r="22"/>
  <text class="d-text" x="140" y="226" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="300" cy="220" r="22"/>
  <text class="d-text" x="300" y="226" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="80" cy="300" r="22"/>
  <text class="d-text" x="80" y="306" text-anchor="middle">1</text>
  <text class="d-sub" x="390" y="66" text-anchor="start">visit 5</text>
  <text class="d-text d-accent" x="250" y="146" text-anchor="start">visit 3</text>
  <text class="d-sub" x="530" y="146" text-anchor="start">visit 6</text>
  <text class="d-sub" x="170" y="226" text-anchor="start">visit 2</text>
  <text class="d-sub" x="330" y="226" text-anchor="start">visit 4</text>
  <text class="d-sub" x="110" y="306" text-anchor="start">visit 1</text>
  <text class="d-text d-accent" x="20" y="30" text-anchor="start">k = 3</text>
</svg>

The walk goes down the left edge first (5, 3, 2, 1 are pushed), then pops 1 (visit 1), 2 (visit 2), 3 (visit 3) — and with k = 3 it stops there, never touching 4, 5 or 6.

📌 **Interview term: In-order traversal** — left subtree, node, right subtree. On a BST it produces the values in sorted order.

📌 **Interview term: Kth order statistic** — the kth smallest value of a collection. The minimum is the 1st order statistic, the median is the middle one.

**Brute force.** Collect the whole in-order sequence into a list, return element k − 1. It is correct and easy to write, but it always visits all n nodes and stores all n values, even for k = 1.

**Better: stop early with an explicit stack.** Simulate the recursion yourself:

1. Push the current node and keep going left until there is no left child (push the "left spine").
2. Pop a node: it is the next smallest value. Count it; if the count reaches k, return it.
3. Move to its right child and repeat from step 1.

The stack never holds more than one root-to-leaf path, so it uses O(h) memory. The walk does O(h) work to reach the smallest node and then roughly one step per value it visits, so the time is **O(h + k)**.

📌 **Interview term: O(h + k)** — the cost of the early-stop walk: reaching the first value takes up to h steps, then each of the k pops costs amortised O(1). On a balanced tree that is O(log n + k).

📌 **Interview term: Explicit stack** — a stack data structure you manage yourself, replacing the call stack of a recursive function. It removes the recursion-depth limit and lets you stop at any moment.

## 4. The Code in C++

The early-stop walk from example 1, with \`std::stack\`:

~~~cpp
// Iterative in-order that stops at the k-th pop.
// Returns {value, pops}; value is -1 if k is out of range.
std::pair<int, int> kthSmallest(const Node* root, int k) {
    if (k < 1) return {-1, 0};
    std::stack<const Node*> st;
    const Node* node = root;
    int pops = 0;
    while (!st.empty() || node) {
        while (node) {             // push the whole left spine
            st.push(node);
            node = node->left;
        }
        node = st.top();           // next smallest value
        st.pop();                  // pop() returns void in C++
        if (++pops == k) return {node->val, pops};
        node = node->right;
    }
    return {-1, pops};
}
~~~

**What to point out in this code:**

- The guard \`if (k < 1)\` returns at once; without it, k = 0 would walk the whole tree looking for a pop count that never comes.
- \`std::stack::pop()\` returns \`void\`, so read \`top()\` first, then \`pop()\`.
- Returning \`std::pair<int, int>\` and unpacking it with a structured binding, \`auto [value, pops] = kthSmallest(root, k);\`, is the C++17 way to return two values. In an interview return just the \`int\`.
- There is no recursion, so a deep, skewed tree cannot overflow the call stack (which in C++ crashes the program rather than throwing).

**The recursive version.** Pass the counter by reference so every level sees the same one:

~~~cpp
void inorder(const Node* node, int& k, int& answer) {
    if (!node || k <= 0) return;      // k <= 0: already found
    inorder(node->left, k, answer);
    if (--k == 0) { answer = node->val; return; }
    inorder(node->right, k, answer);
}
~~~

The caller passes a copy of k it is happy to lose. On the example tree this printed 1 2 3 4 5 6 for k = 1 to 6 when we ran it.

**The size-augmented query (example 2).** Each node stores \`size\`; \`size(nullptr)\` is 0:

~~~cpp
// Order-statistic query: one root-to-node walk. Returns {value, nodes visited}.
std::pair<int, int> kthBySize(const Node* root, int k) {
    const Node* node = root;
    int visited = 0;
    while (node) {
        visited++;
        int left = size(node->left);
        if (k == left + 1) return {node->val, visited};  // exactly left nodes are smaller
        if (k <= left) node = node->left;                 // answer is in the left subtree
        else {
            k -= left + 1;                                // skip left subtree and this node
            node = node->right;
        }
    }
    return {-1, visited};
}
~~~

## 5. Follow-Up: Many Queries on a Changing Tree

If the tree gets inserts and deletes and you are asked for the kth smallest over and over, O(h + k) per query is too slow when k is large (k = n/2 costs O(n) each time). The fix is to store one more number in each node: the **size** of its subtree (how many nodes it contains, itself included).

With sizes, one walk from the root finds the answer. At each node, let \`left\` be the size of its left subtree:

- If \`k == left + 1\`, this node is the answer: exactly \`left\` values are smaller.
- If \`k <= left\`, the answer is in the left subtree; go left with the same k.
- Otherwise skip the left subtree and this node: \`k -= left + 1\`, go right.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 340" role="img" aria-label="The same BST with subtree sizes. Root 5 has size 6, node 3 has size 4. Looking for k equal to 4 goes from 5 to 3 to 4">
  <path class="d-edge-accent" d="M 341 71 L 239 129"/>
  <path class="d-edge" d="M 379 71 L 481 129"/>
  <path class="d-edge" d="M 204 156 L 156 204"/>
  <path class="d-edge-accent" d="M 236 156 L 284 204"/>
  <path class="d-edge" d="M 127 238 L 93 282"/>
  <circle class="d-box-accent" cx="360" cy="60" r="22"/>
  <text class="d-text" x="360" y="66" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="220" cy="140" r="22"/>
  <text class="d-text" x="220" y="146" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="500" cy="140" r="22"/>
  <text class="d-text" x="500" y="146" text-anchor="middle">6</text>
  <circle class="d-box-muted" cx="140" cy="220" r="22"/>
  <text class="d-text" x="140" y="226" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="300" cy="220" r="22"/>
  <text class="d-text" x="300" y="226" text-anchor="middle">4</text>
  <circle class="d-box-muted" cx="80" cy="300" r="22"/>
  <text class="d-text" x="80" y="306" text-anchor="middle">1</text>
  <text class="d-sub" x="390" y="66" text-anchor="start">size 6</text>
  <text class="d-sub" x="250" y="146" text-anchor="start">size 4</text>
  <text class="d-sub" x="530" y="146" text-anchor="start">size 1</text>
  <text class="d-sub" x="170" y="226" text-anchor="start">size 2</text>
  <text class="d-sub" x="330" y="226" text-anchor="start">size 1</text>
  <text class="d-sub" x="110" y="306" text-anchor="start">size 1</text>
  <text class="d-text d-accent" x="20" y="30" text-anchor="start">k = 4</text>
</svg>

For k = 4: at 5, the left subtree has 4 nodes and k ≤ 4, so go left. At 3, the left subtree has 2 nodes; k = 4 > 3, so skip 2 + 1 = 3 values: k becomes 1, go right. At 4, the left subtree is empty and k = 1 = 0 + 1: the answer is 4. Three nodes touched.

Every insert adds 1 to the size of each node on its path, and every delete subtracts 1, so updates stay O(h). In a self-balancing tree (red-black, AVL) the rotations also update the two sizes they touch, and every operation becomes O(log n). Example 2 measures the difference on 1,000 random keys: for k = 500 the in-order walk touched 510 nodes and the size walk touched 20.

📌 **Interview term: Augmented BST** — a BST that stores extra information in each node (here the subtree size), kept up to date by insert and delete, to answer new kinds of queries quickly.

📌 **Interview term: Order-statistic tree** — a BST augmented with subtree sizes. It answers "kth smallest" and "rank of x" in O(h).

## 6. Putting It Together

Use the early-stop walk for a one-off question (it needs no change to the tree), and the size-augmented tree when the same tree is queried many times while it changes. Both rely on the same fact — in-order is sorted — and both stop as soon as they know the answer.

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13.3). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 2 draws 1,000 distinct random keys below 1,000,000 from a small deterministic generator (MINSTD, seed 7), so every language builds the same tree.

**Example 1 — early-stop in-order for k = 0..7, checked against the full-list method** prints:

~~~text
k=0: -1 (popped 0, list method -1)
k=1: 1 (popped 1, list method 1)
k=2: 2 (popped 2, list method 2)
k=3: 3 (popped 3, list method 3)
k=4: 4 (popped 4, list method 4)
k=5: 5 (popped 5, list method 5)
k=6: 6 (popped 6, list method 6)
k=7: -1 (popped 6, list method -1)
tree [3, 1, 4, null, 2], k=1: 1
tree [3, 1, 4, null, 2], k=3: 3
~~~

**Example 2 — order-statistic tree: in-order walk vs size walk on 1,000 random keys** prints:

~~~text
tree size 1000
k=1: 245 | in-order touches 6, size walk touches 6, same true
k=250: 238671 | in-order touches 254, size walk touches 12, same true
k=500: 471995 | in-order touches 510, size walk touches 20, same true
k=1000: 999424 | in-order touches 1000, size walk touches 6, same true
after 200 more inserts: size 1200, every rank matches sorted order true
k=1201 (out of range): -1
~~~

Reading example 1: the number of pops equals k — the walk stops the moment it has the answer — and both methods return -1 for k = 0 and k = 7 on a 6-node tree. Reading example 2: "touches" counts nodes pushed by the in-order walk and nodes visited by the size walk. For k = 1 both touch 6 nodes (the left spine), but for k = 500 the in-order walk touched 510 nodes and the size walk 20. After 200 more inserts the sizes were still right: every rank from 1 to 1,200 matched the sorted list.

## 8. Complexity

| Approach | Time per query | Space | Why |
| :--- | :--- | :--- | :--- |
| Full in-order list, then index | O(n) | O(n) | visits and stores every node, even for k = 1 |
| Early-stop in-order (explicit stack) | O(h + k) | O(h) | reach the minimum in h steps, then stop after k pops |
| Size-augmented BST | O(h) | O(n) extra ints | one root-to-node walk; 20 nodes touched vs 510 for k = 500 in example 2 |
| Size-augmented, self-balancing | O(log n) | O(n) | h stays O(log n); updates also O(log n) |

h is the height: about log2(n) for a balanced tree, up to n − 1 for a chain. The recursive version with \`int& k\` is also O(h + k) time and O(h) stack, but deep trees can crash the program.

## 9. Edge Cases

- **k = 1** — the minimum: the leftmost node. The early-stop walk pushes the left spine and pops once.
- **k = n** — the maximum: the walk visits everything; the size walk goes straight down the right edge (6 nodes touched for k = 1000 in example 2).
- **k < 1 or k > n** — no answer; the examples return -1. In an interview, say what you return (or throw) before coding.
- **Skewed tree** — a chain of n nodes makes h = n, so even the "O(h)" methods are O(n). The explicit stack still avoids recursion limits.
- **Duplicates** — the in-order walk counts each copy; for "kth distinct value" skip a popped value equal to the previous one.

## Common Pitfalls

- **Off-by-one on k.** k is 1-indexed: the 1st smallest is the minimum. The list method must return \`values[k - 1]\`.
- **Passing \`k\` by value in recursion.** Each call gets its own copy, so the count never reaches zero across calls; pass \`int&\`.
- **Using the result of \`pop()\`.** \`std::stack::pop()\` returns \`void\`; read \`top()\` first.
- **Out-of-range index.** \`values[k - 1]\` with a bad k is undefined behaviour, not an exception; check the range (or use \`.at()\`, which throws).
- **Forgetting to update sizes.** In the augmented tree, an insert that finds the key already present must not increment sizes — example 2 checks \`contains\` first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key fact:</strong> <span style="color:#f0e2c8;">In-order traversal of a BST visits values in sorted order, so the kth node visited is the kth smallest.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">Iterative in-order with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack</code>: push the left spine, read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>, count; return when the count hits k, else go right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">O(h + k) time and O(h) space, versus O(n) and O(n) for building the whole sorted vector.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Follow-up:</strong> <span style="color:#f0e2c8;">For many queries on a changing tree, store subtree sizes: compare k with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size(left) + 1</code> and walk down once, O(h).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">The iterative version cannot overflow the call stack; a recursive one passes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int&amp; k</code> so every level shares the counter.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if k is larger than the tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The walk runs out of nodes; I return -1 (or throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::out_of_range</code>), and I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k &lt; 1</code> up front.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find the kth largest?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do a reverse in-order — right, node, left — and stop at the kth pop. Same O(h + k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::set</code> give you this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in O(log n): <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::next(s.begin(), k - 1)</code> walks k steps. GCC ships a non-standard policy-based tree (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__gnu_pbds::tree</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tree_order_statistics_node_update</code>) whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find_by_order(1)</code> returned 20 for {10, 20, 40, 50} in my run, but standard C++ has no select-by-rank.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep the sizes correct on delete?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Subtract 1 from every node on the path to the removed node; in a self-balancing tree, recompute the sizes of the nodes a rotation moves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it in O(1) extra space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Morris in-order traversal threads temporary pointers instead of using a stack; it is O(n) time and restores the tree as it goes.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **In-order traversal** | Left, node, right; sorted order on a BST |
| **Kth order statistic** | The kth smallest value of a collection |
| **O(h + k)** | Cost of the early-stop walk: h steps down, then k pops |
| **Explicit stack** | A stack you manage yourself instead of recursion |
| **Augmented BST** | A BST that stores extra data per node, kept up to date on updates |
| **Order-statistic tree** | A BST with subtree sizes; kth smallest and rank in O(h) |

---
**Conclusion:** Because an in-order walk of a BST produces its values in sorted order, the kth smallest value is simply the kth node that walk visits. Doing the walk with a \`std::stack\` and returning at the kth pop costs O(h + k) time and O(h) space and cannot overflow the call stack; a recursive version shares the counter through \`int&\`. When the tree changes and the question is asked again and again, store a subtree size in each node: one root-to-node walk then answers any k in O(h) — 20 nodes instead of 510 for k = 500 in example 2.`,
        examples: [
          {
            label: "Early-stop in-order for every k, checked against the list method",
            code: `#include <iostream>
#include <memory>
#include <optional>
#include <stack>
#include <utility>
#include <vector>

struct Node {
    int val;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int v) : val(v) {}
};

using Values = std::vector<std::optional<int>>;
const std::optional<int> NIL;             // a gap in the level-order list
std::vector<std::unique_ptr<Node>> pool;  // owns every node, freed at exit

Node* make(int v) {
    pool.push_back(std::make_unique<Node>(v));
    return pool.back().get();
}

// Level-order list with NIL for gaps (LeetCode style) -> tree.
Node* build(const Values& values) {
    if (values.empty() || !values[0]) return nullptr;
    Node* root = make(*values[0]);
    std::vector<Node*> queue{root};
    size_t i = 1;
    for (size_t q = 0; q < queue.size() && i < values.size(); q++) {
        Node* node = queue[q];
        if (i < values.size() && values[i]) queue.push_back(node->left = make(*values[i]));
        i++;
        if (i < values.size() && values[i]) queue.push_back(node->right = make(*values[i]));
        i++;
    }
    return root;
}

// Iterative in-order that stops at the k-th pop.
// Returns {value, pops}; value is -1 if k is out of range.
std::pair<int, int> kthSmallest(const Node* root, int k) {
    if (k < 1) return {-1, 0};
    std::stack<const Node*> st;
    const Node* node = root;
    int pops = 0;
    while (!st.empty() || node) {
        while (node) {             // push the whole left spine
            st.push(node);
            node = node->left;
        }
        node = st.top();           // next smallest value
        st.pop();                  // pop() returns void in C++
        if (++pops == k) return {node->val, pops};
        node = node->right;
    }
    return {-1, pops};
}

void walk(const Node* node, std::vector<int>& out) {
    if (!node) return;
    walk(node->left, out);
    out.push_back(node->val);
    walk(node->right, out);
}

// Simple version: collect the whole in-order list, then index it.
int kthByList(const Node* root, int k) {
    std::vector<int> out;
    walk(root, out);
    return k >= 1 && k <= (int)out.size() ? out[k - 1] : -1;
}

int main() {
    Node* root = build({5, 3, 6, 2, 4, NIL, NIL, 1});
    for (int k = 0; k < 8; k++) {
        auto [value, pops] = kthSmallest(root, k);
        std::cout << "k=" << k << ": " << value << " (popped " << pops << ", list method " << kthByList(root, k) << ")\\n";
    }
    Node* small = build({3, 1, 4, NIL, 2});
    std::cout << "tree [3, 1, 4, null, 2], k=1: " << kthSmallest(small, 1).first << "\\n";
    std::cout << "tree [3, 1, 4, null, 2], k=3: " << kthSmallest(small, 3).first << "\\n";
    return 0;
}`,
          },
          {
            label: "Order-statistic tree: subtree sizes vs in-order walk (1,000 keys)",
            code: `#include <algorithm>
#include <iostream>
#include <memory>
#include <stack>
#include <utility>
#include <vector>

struct Node {
    int val;
    int size = 1;          // nodes in the subtree rooted here
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int v) : val(v) {}
};

std::vector<std::unique_ptr<Node>> pool;  // owns every node, freed at exit

int size(const Node* node) { return node ? node->size : 0; }

bool contains(const Node* root, int val) {
    const Node* node = root;
    while (node && node->val != val) node = val < node->val ? node->left : node->right;
    return node != nullptr;
}

// Insert a NEW key, adding 1 to the size of every node on the way down.
Node* insert(Node* root, int val) {
    pool.push_back(std::make_unique<Node>(val));
    Node* fresh = pool.back().get();
    if (!root) return fresh;
    Node* node = root;
    while (true) {
        node->size++;
        if (val < node->val) {
            if (!node->left) { node->left = fresh; return root; }
            node = node->left;
        } else {
            if (!node->right) { node->right = fresh; return root; }
            node = node->right;
        }
    }
}

// Order-statistic query: one root-to-node walk. Returns {value, nodes visited}.
std::pair<int, int> kthBySize(const Node* root, int k) {
    const Node* node = root;
    int visited = 0;
    while (node) {
        visited++;
        int left = size(node->left);
        if (k == left + 1) return {node->val, visited};  // exactly left nodes are smaller
        if (k <= left) node = node->left;                 // answer is in the left subtree
        else {
            k -= left + 1;                                // skip left subtree and this node
            node = node->right;
        }
    }
    return {-1, visited};
}

// Early-stop in-order. Returns {value, nodes pushed = nodes touched}.
std::pair<int, int> kthInorder(const Node* root, int k) {
    std::stack<const Node*> st;
    const Node* node = root;
    int pops = 0, pushed = 0;
    while (!st.empty() || node) {
        while (node) {
            st.push(node);
            pushed++;
            node = node->left;
        }
        node = st.top();
        st.pop();
        if (++pops == k) return {node->val, pushed};
        node = node->right;
    }
    return {-1, pushed};
}

Node* root = nullptr;
std::vector<int> keys;
long long seed = 7;

void addRandom(int count) {
    int added = 0;
    while (added < count) {
        seed = seed * 48271 % 2147483647;  // long long: the product overflows int
        int v = (int)(seed % 1000000);
        if (!contains(root, v)) {
            root = insert(root, v);
            keys.push_back(v);
            added++;
        }
    }
}

int main() {
    std::cout << std::boolalpha;
    addRandom(1000);
    std::cout << "tree size " << size(root) << "\\n";
    for (int k : {1, 250, 500, 1000}) {
        auto [v1, pushed] = kthInorder(root, k);
        auto [v2, visited] = kthBySize(root, k);
        std::cout << "k=" << k << ": " << v2 << " | in-order touches " << pushed << ", size walk touches " << visited
                  << ", same " << (v1 == v2) << "\\n";
    }
    addRandom(200);
    std::vector<int> ordered = keys;
    std::sort(ordered.begin(), ordered.end());
    bool ok = true;
    for (int k = 1; k <= (int)ordered.size(); k++) if (kthBySize(root, k).first != ordered[k - 1]) ok = false;
    std::cout << "after 200 more inserts: size " << size(root) << ", every rank matches sorted order " << ok << "\\n";
    std::cout << "k=1201 (out of range): " << kthBySize(root, 1201).first << "\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you build a binary tree from preorder and inorder traversals?",
    difficulty: "medium",
    seoDescription: "Rebuild a binary tree from preorder and inorder in O(n) with a value-to-index map and index ranges. Verified Python, JS, Java and C++ code.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"I give you two arrays: the preorder and the inorder traversal of a binary tree whose values are all distinct. Write a Python function that rebuilds the tree and returns its root."

**What a strong answer should cover:**
- Preorder's first value is the root; finding that value in inorder splits the remaining values into the left subtree (before it) and the right subtree (after it).
- Recurse on the two parts; the left subtree's preorder comes first, so build left before right while consuming preorder with one moving index.
- A value → index hash map makes each split O(1), giving O(n) total; a linear search per node is O(n²) on a skewed tree.
- Pass index ranges instead of copying sub-arrays.
- Why the values must be distinct (duplicates make the answer ambiguous) and why preorder + postorder alone is not enough in general.
- Python specifics: a dict comprehension for the index map, \`nonlocal\` for the shared preorder index, and why \`inorder.index(...)\` plus slicing (\`preorder[1:mid + 1]\`) quietly makes it O(n²).

**Clarifying questions expected:**
- Are all values distinct, and are the two arrays guaranteed to describe the same tree?
- How large can n be (is recursion depth a concern)?

**Code / implementation expected:** Yes — a recursive helper over inorder index ranges with a dict for positions, in Python 3.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree, recursion and a hash map are.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a school photo taken in one long row, and a separate list of names written in the order the head teacher introduced them: always a group leader first, then the people in that leader's group. From the introduction list alone you know who the very first leader is, but not who belongs to which group. From the photo alone you know who stands to the left and right of whom, but not who is in charge. Put the two together and the whole structure falls out: find the first leader in the photo; everyone standing to their left is in one group, everyone to their right in the other. Repeat inside each group.

That is exactly this problem. The **preorder** traversal (root, left subtree, right subtree) is the introduction list — it always names a root before its subtrees. The **inorder** traversal (left subtree, root, right subtree) is the photo — it tells you, for any root, which values are on its left and which on its right. Interviewers like this question because it tests whether you really understand what each [traversal](/interview-question/what-are-the-tree-traversal-methods) guarantees, and whether you can turn a correct O(n²) recursion into O(n) with one hash map.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all values distinct? | The algorithm finds the root's position in inorder by value. With duplicates that position is ambiguous — two different trees can have identical traversals (example 2). |
| Are the arrays guaranteed to be valid and the same length? | If not, you must detect a value that is missing from inorder instead of crashing. |
| Can the arrays be empty? | An empty input should return an empty tree. |
| How large is n? | Recursion depth equals the tree height, up to n for a skewed tree. |
| Which two traversals do I get? | Preorder + inorder or postorder + inorder rebuild a unique tree; preorder + postorder in general does not. |

## 3. The Core Idea: Root From Preorder, Split From Inorder

Take preorder \`[3, 9, 20, 15, 7]\` and inorder \`[9, 3, 15, 20, 7]\`.

1. The first preorder value, **3**, is the root.
2. Find 3 in inorder. Everything before it (\`[9]\`) is the left subtree; everything after it (\`[15, 20, 7]\`) is the right subtree.
3. The left subtree has 1 value, so the next 1 preorder value (9) belongs to it, and the rest (\`[20, 15, 7]\`) to the right subtree. Recurse on each side.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 240" role="img" aria-label="Preorder 3, 9, 20, 15, 7 and inorder 9, 3, 15, 20, 7. The first preorder value 3 is the root; in inorder, 9 is on its left and 15, 20, 7 on its right">
  <rect class="d-box-accent" x="150" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="185" y="76" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="235" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="270" y="76" text-anchor="middle">9</text>
  <rect class="d-box" x="320" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="355" y="76" text-anchor="middle">20</text>
  <rect class="d-box" x="405" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="440" y="76" text-anchor="middle">15</text>
  <rect class="d-box" x="490" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="525" y="76" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="150" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="185" y="166" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="235" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="270" y="166" text-anchor="middle">3</text>
  <rect class="d-box" x="320" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="355" y="166" text-anchor="middle">15</text>
  <rect class="d-box" x="405" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="440" y="166" text-anchor="middle">20</text>
  <rect class="d-box" x="490" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="525" y="166" text-anchor="middle">7</text>
  <text class="d-text" x="20" y="76" text-anchor="start">preorder</text>
  <text class="d-text" x="20" y="166" text-anchor="start">inorder</text>
  <text class="d-sub" x="185" y="220" text-anchor="middle">left</text>
  <text class="d-sub d-accent" x="270" y="220" text-anchor="middle">root</text>
  <text class="d-sub" x="440" y="220" text-anchor="middle">right subtree</text>
</svg>

The root is always the first value of the current preorder range; its position in inorder decides how many values go left. Repeating the step on each side gives this tree:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="The rebuilt tree: root 3 with left child 9 and right child 20; 20 has children 15 and 7">
  <path class="d-edge" d="M 302 62 L 218 118"/>
  <path class="d-edge" d="M 338 62 L 422 118"/>
  <path class="d-edge" d="M 426 147 L 384 193"/>
  <path class="d-edge" d="M 454 147 L 496 193"/>
  <circle class="d-box-accent" cx="320" cy="50" r="22"/>
  <text class="d-text" x="320" y="56" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="200" cy="130" r="22"/>
  <text class="d-text" x="200" y="136" text-anchor="middle">9</text>
  <circle class="d-box" cx="440" cy="130" r="22"/>
  <text class="d-text" x="440" y="136" text-anchor="middle">20</text>
  <circle class="d-box" cx="370" cy="210" r="22"/>
  <text class="d-text" x="370" y="216" text-anchor="middle">15</text>
  <circle class="d-box" cx="510" cy="210" r="22"/>
  <text class="d-text" x="510" y="216" text-anchor="middle">7</text>
</svg>

📌 **Interview term: Preorder traversal** — visit the node, then its left subtree, then its right subtree. The first value is always the root.

📌 **Interview term: Inorder traversal** — visit the left subtree, then the node, then the right subtree. A root's position splits the values into its left and right subtrees.

📌 **Interview term: Divide and conquer** — solve a problem by splitting it into independent smaller problems of the same kind (here: the left and right subtrees), solving those, and combining the results.

**Why one moving preorder index is enough.** Preorder lists the whole left subtree before the whole right subtree. So if the recursion always builds the left child before the right child, the next unused preorder value is always the root of the subtree being built. You never need to compute "where does the right subtree's preorder start" — a single counter that moves forward does it.

Here is the full run on the example, with inorder ranges written as index intervals:

| Step | Preorder index | Root | Inorder range | Root found at | Left range | Right range |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 0 | 3 | [0, 4] | 1 | [0, 0] | [2, 4] |
| 2 | 1 | 9 | [0, 0] | 0 | empty | empty |
| 3 | 2 | 20 | [2, 4] | 3 | [2, 2] | [4, 4] |
| 4 | 3 | 15 | [2, 2] | 2 | empty | empty |
| 5 | 4 | 7 | [4, 4] | 4 | empty | empty |

## 4. From O(n²) to O(n)

**Finding the root in inorder.** The straightforward version scans the inorder range for the root's value. On a balanced tree that is fine, but on a skewed tree each scan is long: for a 500-node left chain, example 2 counted **125,250** comparisons (n(n + 1) / 2). Building a value → index hash map once (O(n)) makes every lookup O(1): **500** lookups for the same tree.

**Copying sub-arrays.** Many first attempts slice the arrays at each step: pass \`preorder[1 : mid + 1]\` and \`inorder[: mid]\` to the left recursion. Each slice copies its elements, so even with a hash map the copies cost O(n) per level and O(n²) on a skewed tree. Passing the **index range** \`[lo, hi]\` of the inorder array (and the shared preorder index) avoids copying anything.

📌 **Interview term: Index map** — a hash map from each value to its position in an array, built in one O(n) pass so later "where is x?" questions are O(1). It needs distinct values.

📌 **Interview term: Index range (bounds) instead of slices** — describing a sub-array by its first and last index rather than copying it; recursion then passes two integers instead of new arrays.

**Why the values must be distinct.** With duplicates, "find the root's position in inorder" has more than one answer. Example 2 builds two different trees — 1 with a left child 1, and 1 with a right child 1 — that both have preorder \`[1, 1]\` and inorder \`[1, 1]\`. No algorithm can tell them apart from the traversals alone.

📌 **Interview term: Unique reconstruction** — two traversals determine the tree only if every tree with those traversals is the same tree. Preorder + inorder (or postorder + inorder) does this for distinct values; preorder + postorder does not when a node has only one child.

## 5. The Code in Python

The O(n) version from example 1:

~~~python
def build_tree(preorder, inorder):
    """Rebuild a tree with distinct values in O(n) using an index map."""
    index = {v: i for i, v in enumerate(inorder)}   # value -> position in inorder
    pre = 0                                          # next root in preorder

    def build(lo, hi):                               # subtree = inorder[lo..hi]
        nonlocal pre
        if lo > hi:
            return None
        root = Node(preorder[pre])
        pre += 1
        mid = index[root.val]                        # O(1) instead of a scan
        root.left = build(lo, mid - 1)               # left part first: preorder order
        root.right = build(mid + 1, hi)
        return root

    return build(0, len(inorder) - 1)
~~~

**What to point out in this code:**

- \`{v: i for i, v in enumerate(inorder)}\` builds the index map in one pass.
- \`nonlocal pre\` lets the inner \`build\` function move the shared preorder index; without it, \`pre += 1\` would create a new local variable and raise \`UnboundLocalError\`.
- \`build(lo, hi)\` receives only two integers — no slicing — and returns \`None\` for an empty range, which is also how an empty input returns an empty tree.
- \`root.left = build(...)\` is called **before** \`root.right = build(...)\`: that order is what makes the single moving \`pre\` index correct.
- Recursion depth equals the tree height. A balanced tree is fine; a skewed tree deeper than about 1000 levels hits Python's default recursion limit. (Example 2 uses a 500-node chain.)

**The version to avoid.** The scan below is what \`inorder.index(root.val)\` does under the hood; example 2 counts its comparisons:

~~~python
def build_scan(preorder, inorder):
    """Same recursion, but find the root by scanning inorder[lo..hi]: O(n^2) worst case."""
    pre = 0

    def build(lo, hi):
        nonlocal pre
        if lo > hi:
            return None
        root = Node(preorder[pre])
        pre += 1
        mid = lo
        while True:
            counter["scan"] += 1          # one comparison
            if inorder[mid] == root.val:
                break
            mid += 1
        root.left = build(lo, mid - 1)
        root.right = build(mid + 1, hi)
        return root

    return build(0, len(inorder) - 1)
~~~

The common slicing one-liner, \`root.left = build(preorder[1:mid + 1], inorder[:mid])\`, has the same O(n²) worst case for a second reason: every slice is a new list.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Trees are printed in LeetCode level-order format, with \`null\` for a missing child.

**Example 1 — rebuild six trees, print level order and postorder, and check the round trip** prints:

~~~text
pre [3, 9, 20, 15, 7] in [9, 3, 15, 20, 7] -> [3, 9, 20, null, null, 15, 7], post [9, 15, 7, 20, 3], round trip true
pre [1, 2, 3] in [3, 2, 1] -> [1, 2, null, 3], post [3, 2, 1], round trip true
pre [1, 2, 3] in [1, 2, 3] -> [1, null, 2, null, 3], post [3, 2, 1], round trip true
pre [4, 2, 1, 3, 6, 5, 7] in [1, 2, 3, 4, 5, 6, 7] -> [4, 2, 6, 1, 3, 5, 7], post [1, 3, 2, 5, 7, 6, 4], round trip true
pre [-1] in [-1] -> [-1], post [-1], round trip true
pre [] in [] -> [], post [], round trip true
~~~

**Example 2 — scan vs hash map on a 500-node chain and a 511-node balanced tree, and the duplicate-value ambiguity** prints:

~~~text
left chain, n = 500: scan comparisons 125250, map lookups 500, same tree true
balanced, n = 511: scan comparisons 2304, map lookups 511, same tree true
duplicates: [1, 1] has pre [1, 1] in [1, 1]
duplicates: [1, null, 1] has pre [1, 1] in [1, 1]
~~~

Reading example 1: every rebuilt tree has exactly the given preorder and inorder ("round trip true"). The same preorder \`[1, 2, 3]\` gives a left chain with inorder \`[3, 2, 1]\` and a right chain with inorder \`[1, 2, 3]\` — the inorder alone decides the shape. Reading example 2: on the chain the scan made 125,250 comparisons against 500 map lookups; on the balanced tree only 2,304, because each scan range is short. The last two lines show two different trees with identical traversals.

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Index map + index ranges | O(n) | O(n) | one map lookup per node (500 for n = 500 in example 2); map is O(n), recursion O(h) |
| Linear scan of the inorder range | O(n²) worst, O(n log n) balanced | O(h) | 125,250 comparisons on the 500-node chain, 2,304 on the 511-node balanced tree |
| \`inorder.index(...)\` + slicing | O(n²) worst | O(n²) worst | scan per node plus a copied list per call |

n is the number of nodes and h the height of the tree (the recursion depth).

## 8. Edge Cases and Variants

- **Empty arrays** — return an empty tree (\`build(0, -1)\` returns at once).
- **One node** — \`[-1]\` and \`[-1]\` give a single node; negative values are fine because the map is keyed by value.
- **Skewed trees** — \`[1, 2, 3]\` with inorder \`[3, 2, 1]\` is a left chain, with \`[1, 2, 3]\` a right chain. Recursion depth is n.
- **Duplicates** — the answer is not unique; say so and ask whether values are distinct.
- **Postorder + inorder** — the same idea mirrored: the *last* postorder value is the root, so consume postorder from the end and build the **right** subtree first.
- **Preorder + postorder** — not unique in general: a node with a single child could have it on either side and both traversals look the same.

## Common Pitfalls

- **Building right before left.** With one shared preorder index, the left subtree must be built first, because preorder lists it first.
- **Forgetting \`nonlocal\`.** \`pre += 1\` inside the nested function without \`nonlocal pre\` raises \`UnboundLocalError\`.
- **Slicing at every call.** \`preorder[1:mid + 1]\` copies; it turns the O(n) idea into O(n²) on skewed trees.
- **\`inorder.index(x)\` per node.** It is a hidden linear scan — 125,250 comparisons instead of 500 on a 500-node chain.
- **Assuming values are distinct without saying so.** With duplicates the dict keeps only the last position of each value, silently building a wrong tree.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">The first preorder value is the root; its position in inorder splits the rest into the left subtree (before) and right subtree (after).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursion:</strong> <span style="color:#f0e2c8;">Recurse on inorder index ranges, building left before right, while one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nonlocal</code> index walks forward through preorder.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Speed-up:</strong> <span style="color:#f0e2c8;">A dict <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{value: index}</code> makes each split O(1): O(n) total instead of O(n²) — 500 lookups vs 125,250 comparisons on a 500-node chain.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Requirement:</strong> <span style="color:#f0e2c8;">Values must be distinct; with duplicates two different trees can share both traversals.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">No slicing and no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inorder.index()</code> inside the recursion — both are hidden O(n) work per call.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you got postorder and inorder instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Take roots from the end of postorder and build the right subtree before the left; everything else is the same.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can preorder and postorder rebuild the tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not uniquely: a node with one child has the same preorder and postorder whether the child is left or right. It works only for full binary trees.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the space complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n) for the dict plus O(h) recursion depth; h is n for a skewed tree.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a very deep tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is an iterative O(n) version that keeps a stack of nodes and walks preorder, attaching each value as a left child until it reaches the matching inorder value; or raise the recursion limit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rebuild, then compute the preorder and inorder of the result and compare with the input — the round-trip check in example 1.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Preorder traversal** | Node, left, right; the first value is the root |
| **Inorder traversal** | Left, node, right; a root splits left values from right values |
| **Divide and conquer** | Split into independent smaller problems, solve, combine |
| **Index map** | Hash map from value to array position, built once in O(n) |
| **Index range (bounds) instead of slices** | Describe a sub-array by two indexes instead of copying it |
| **Unique reconstruction** | The traversals determine exactly one tree |

---
**Conclusion:** Preorder tells you which value is the root, and inorder tells you which values go to its left and to its right; recursing on the two sides — left first, while one \`nonlocal\` index walks through preorder — rebuilds the tree. With a dict from value to inorder position and index ranges instead of slices, the whole build is O(n): 500 lookups instead of 125,250 comparisons on a 500-node chain in example 2. State up front that the values must be distinct, because with duplicates two different trees share the same traversals.`,
        examples: [
          {
            label: "Rebuild from preorder + inorder with an index map (6 cases)",
            code: `class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def build_tree(preorder, inorder):
    """Rebuild a tree with distinct values in O(n) using an index map."""
    index = {v: i for i, v in enumerate(inorder)}   # value -> position in inorder
    pre = 0                                          # next root in preorder

    def build(lo, hi):                               # subtree = inorder[lo..hi]
        nonlocal pre
        if lo > hi:
            return None
        root = Node(preorder[pre])
        pre += 1
        mid = index[root.val]                        # O(1) instead of a scan
        root.left = build(lo, mid - 1)               # left part first: preorder order
        root.right = build(mid + 1, hi)
        return root

    return build(0, len(inorder) - 1)


def traverse(node, order, out):
    if node is None:
        return out
    if order == "pre":
        out.append(node.val)
    traverse(node.left, order, out)
    if order == "in":
        out.append(node.val)
    traverse(node.right, order, out)
    if order == "post":
        out.append(node.val)
    return out


def level_order(root):
    out, queue, i = [], [root], 0
    while i < len(queue):
        node = queue[i]
        i += 1
        if node is None:
            out.append("null")
        else:
            out.append(str(node.val))
            queue.append(node.left)
            queue.append(node.right)
    while out and out[-1] == "null":
        out.pop()
    return "[" + ", ".join(out) + "]"


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


cases = [
    ([3, 9, 20, 15, 7], [9, 3, 15, 20, 7]),
    ([1, 2, 3], [3, 2, 1]),
    ([1, 2, 3], [1, 2, 3]),
    ([4, 2, 1, 3, 6, 5, 7], [1, 2, 3, 4, 5, 6, 7]),
    ([-1], [-1]),
    ([], []),
]
for pre, ino in cases:
    root = build_tree(pre, ino)
    same = traverse(root, "pre", []) == pre and traverse(root, "in", []) == ino
    print("pre " + fmt(pre) + " in " + fmt(ino) + " -> " + level_order(root)
          + ", post " + fmt(traverse(root, "post", [])) + ", round trip " + str(same).lower())`,
          },
          {
            label: "Linear scan vs hash map, and why duplicates break it",
            code: `class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


counter = {"scan": 0, "map": 0}


def build_scan(preorder, inorder):
    """Same recursion, but find the root by scanning inorder[lo..hi]: O(n^2) worst case."""
    pre = 0

    def build(lo, hi):
        nonlocal pre
        if lo > hi:
            return None
        root = Node(preorder[pre])
        pre += 1
        mid = lo
        while True:
            counter["scan"] += 1          # one comparison
            if inorder[mid] == root.val:
                break
            mid += 1
        root.left = build(lo, mid - 1)
        root.right = build(mid + 1, hi)
        return root

    return build(0, len(inorder) - 1)


def build_map(preorder, inorder):
    index = {v: i for i, v in enumerate(inorder)}
    pre = 0

    def build(lo, hi):
        nonlocal pre
        if lo > hi:
            return None
        root = Node(preorder[pre])
        pre += 1
        counter["map"] += 1               # one dictionary lookup
        mid = index[root.val]
        root.left = build(lo, mid - 1)
        root.right = build(mid + 1, hi)
        return root

    return build(0, len(inorder) - 1)


def level_order(root):
    out, queue, i = [], [root], 0
    while i < len(queue):
        node = queue[i]
        i += 1
        if node is None:
            out.append("null")
        else:
            out.append(str(node.val))
            queue.append(node.left)
            queue.append(node.right)
    while out and out[-1] == "null":
        out.pop()
    return "[" + ", ".join(out) + "]"


def walk(node, pre, ino):
    if node is not None:
        pre.append(node.val)
        walk(node.left, pre, ino)
        ino.append(node.val)
        walk(node.right, pre, ino)
    return "pre " + str(pre) + " in " + str(ino)


def balanced_preorder(lo, hi, out):
    if lo <= hi:
        mid = (lo + hi) // 2
        out.append(mid)
        balanced_preorder(lo, mid - 1, out)
        balanced_preorder(mid + 1, hi, out)
    return out


def compare(name, preorder, inorder):
    counter["scan"] = counter["map"] = 0
    a = build_scan(preorder, inorder)
    b = build_map(preorder, inorder)
    print(name + ", n = " + str(len(inorder)) + ": scan comparisons " + str(counter["scan"])
          + ", map lookups " + str(counter["map"]) + ", same tree " + str(level_order(a) == level_order(b)).lower())


n = 500
compare("left chain", list(range(1, n + 1)), list(range(n, 0, -1)))
compare("balanced", balanced_preorder(1, 511, []), list(range(1, 512)))

# Duplicates: two different shapes, identical traversals.
a = Node(1)
a.left = Node(1)
b = Node(1)
b.right = Node(1)
print("duplicates: " + level_order(a) + " has " + walk(a, [], []))
print("duplicates: " + level_order(b) + " has " + walk(b, [], []))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"I give you two arrays: the preorder and the inorder traversal of a binary tree whose values are all distinct. Write a JavaScript function that rebuilds the tree and returns its root."

**What a strong answer should cover:**
- Preorder's first value is the root; finding that value in inorder splits the remaining values into the left subtree (before it) and the right subtree (after it).
- Recurse on the two parts; the left subtree's preorder comes first, so build left before right while consuming preorder with one moving index.
- A value → index hash map makes each split O(1), giving O(n) total; a linear search per node is O(n²) on a skewed tree.
- Pass index ranges instead of copying sub-arrays.
- Why the values must be distinct (duplicates make the answer ambiguous) and why preorder + postorder alone is not enough in general.
- JavaScript specifics: a \`Map\` for positions (not \`indexOf\`, which is a linear scan), a closure variable for the preorder index, and avoiding \`slice\` copies.

**Clarifying questions expected:**
- Are all values distinct, and are the two arrays guaranteed to describe the same tree?
- How large can n be (is recursion depth a concern)?

**Code / implementation expected:** Yes — a recursive helper over inorder index ranges with a \`Map\`, in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree, recursion and a hash map are.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a school photo taken in one long row, and a separate list of names written in the order the head teacher introduced them: always a group leader first, then the people in that leader's group. From the introduction list alone you know who the very first leader is, but not who belongs to which group. From the photo alone you know who stands to the left and right of whom, but not who is in charge. Put the two together and the whole structure falls out: find the first leader in the photo; everyone standing to their left is in one group, everyone to their right in the other. Repeat inside each group.

That is exactly this problem. The **preorder** traversal (root, left subtree, right subtree) is the introduction list — it always names a root before its subtrees. The **inorder** traversal (left subtree, root, right subtree) is the photo — it tells you, for any root, which values are on its left and which on its right. Interviewers like this question because it tests whether you really understand what each [traversal](/interview-question/what-are-the-tree-traversal-methods) guarantees, and whether you can turn a correct O(n²) recursion into O(n) with one hash map.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all values distinct? | The algorithm finds the root's position in inorder by value. With duplicates that position is ambiguous — two different trees can have identical traversals (example 2). |
| Are the arrays guaranteed to be valid and the same length? | If not, you must detect a value that is missing from inorder instead of crashing. |
| Can the arrays be empty? | An empty input should return an empty tree. |
| How large is n? | Recursion depth equals the tree height, up to n for a skewed tree. |
| Which two traversals do I get? | Preorder + inorder or postorder + inorder rebuild a unique tree; preorder + postorder in general does not. |

## 3. The Core Idea: Root From Preorder, Split From Inorder

Take preorder \`[3, 9, 20, 15, 7]\` and inorder \`[9, 3, 15, 20, 7]\`.

1. The first preorder value, **3**, is the root.
2. Find 3 in inorder. Everything before it (\`[9]\`) is the left subtree; everything after it (\`[15, 20, 7]\`) is the right subtree.
3. The left subtree has 1 value, so the next 1 preorder value (9) belongs to it, and the rest (\`[20, 15, 7]\`) to the right subtree. Recurse on each side.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 240" role="img" aria-label="Preorder 3, 9, 20, 15, 7 and inorder 9, 3, 15, 20, 7. The first preorder value 3 is the root; in inorder, 9 is on its left and 15, 20, 7 on its right">
  <rect class="d-box-accent" x="150" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="185" y="76" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="235" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="270" y="76" text-anchor="middle">9</text>
  <rect class="d-box" x="320" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="355" y="76" text-anchor="middle">20</text>
  <rect class="d-box" x="405" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="440" y="76" text-anchor="middle">15</text>
  <rect class="d-box" x="490" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="525" y="76" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="150" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="185" y="166" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="235" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="270" y="166" text-anchor="middle">3</text>
  <rect class="d-box" x="320" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="355" y="166" text-anchor="middle">15</text>
  <rect class="d-box" x="405" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="440" y="166" text-anchor="middle">20</text>
  <rect class="d-box" x="490" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="525" y="166" text-anchor="middle">7</text>
  <text class="d-text" x="20" y="76" text-anchor="start">preorder</text>
  <text class="d-text" x="20" y="166" text-anchor="start">inorder</text>
  <text class="d-sub" x="185" y="220" text-anchor="middle">left</text>
  <text class="d-sub d-accent" x="270" y="220" text-anchor="middle">root</text>
  <text class="d-sub" x="440" y="220" text-anchor="middle">right subtree</text>
</svg>

The root is always the first value of the current preorder range; its position in inorder decides how many values go left. Repeating the step on each side gives this tree:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="The rebuilt tree: root 3 with left child 9 and right child 20; 20 has children 15 and 7">
  <path class="d-edge" d="M 302 62 L 218 118"/>
  <path class="d-edge" d="M 338 62 L 422 118"/>
  <path class="d-edge" d="M 426 147 L 384 193"/>
  <path class="d-edge" d="M 454 147 L 496 193"/>
  <circle class="d-box-accent" cx="320" cy="50" r="22"/>
  <text class="d-text" x="320" y="56" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="200" cy="130" r="22"/>
  <text class="d-text" x="200" y="136" text-anchor="middle">9</text>
  <circle class="d-box" cx="440" cy="130" r="22"/>
  <text class="d-text" x="440" y="136" text-anchor="middle">20</text>
  <circle class="d-box" cx="370" cy="210" r="22"/>
  <text class="d-text" x="370" y="216" text-anchor="middle">15</text>
  <circle class="d-box" cx="510" cy="210" r="22"/>
  <text class="d-text" x="510" y="216" text-anchor="middle">7</text>
</svg>

📌 **Interview term: Preorder traversal** — visit the node, then its left subtree, then its right subtree. The first value is always the root.

📌 **Interview term: Inorder traversal** — visit the left subtree, then the node, then the right subtree. A root's position splits the values into its left and right subtrees.

📌 **Interview term: Divide and conquer** — solve a problem by splitting it into independent smaller problems of the same kind (here: the left and right subtrees), solving those, and combining the results.

**Why one moving preorder index is enough.** Preorder lists the whole left subtree before the whole right subtree. So if the recursion always builds the left child before the right child, the next unused preorder value is always the root of the subtree being built. You never need to compute "where does the right subtree's preorder start" — a single counter that moves forward does it.

Here is the full run on the example, with inorder ranges written as index intervals:

| Step | Preorder index | Root | Inorder range | Root found at | Left range | Right range |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 0 | 3 | [0, 4] | 1 | [0, 0] | [2, 4] |
| 2 | 1 | 9 | [0, 0] | 0 | empty | empty |
| 3 | 2 | 20 | [2, 4] | 3 | [2, 2] | [4, 4] |
| 4 | 3 | 15 | [2, 2] | 2 | empty | empty |
| 5 | 4 | 7 | [4, 4] | 4 | empty | empty |

## 4. From O(n²) to O(n)

**Finding the root in inorder.** The straightforward version scans the inorder range for the root's value. On a balanced tree that is fine, but on a skewed tree each scan is long: for a 500-node left chain, example 2 counted **125,250** comparisons (n(n + 1) / 2). Building a value → index hash map once (O(n)) makes every lookup O(1): **500** lookups for the same tree.

**Copying sub-arrays.** Many first attempts slice the arrays at each step: pass \`preorder[1 : mid + 1]\` and \`inorder[: mid]\` to the left recursion. Each slice copies its elements, so even with a hash map the copies cost O(n) per level and O(n²) on a skewed tree. Passing the **index range** \`[lo, hi]\` of the inorder array (and the shared preorder index) avoids copying anything.

📌 **Interview term: Index map** — a hash map from each value to its position in an array, built in one O(n) pass so later "where is x?" questions are O(1). It needs distinct values.

📌 **Interview term: Index range (bounds) instead of slices** — describing a sub-array by its first and last index rather than copying it; recursion then passes two integers instead of new arrays.

**Why the values must be distinct.** With duplicates, "find the root's position in inorder" has more than one answer. Example 2 builds two different trees — 1 with a left child 1, and 1 with a right child 1 — that both have preorder \`[1, 1]\` and inorder \`[1, 1]\`. No algorithm can tell them apart from the traversals alone.

📌 **Interview term: Unique reconstruction** — two traversals determine the tree only if every tree with those traversals is the same tree. Preorder + inorder (or postorder + inorder) does this for distinct values; preorder + postorder does not when a node has only one child.

## 5. The Code in JavaScript

The O(n) version from example 1:

~~~javascript
// Rebuild a tree with distinct values in O(n) using an index map.
function buildTree(preorder, inorder) {
  const index = new Map();                       // value -> position in inorder
  inorder.forEach((v, i) => index.set(v, i));
  let pre = 0;                                   // next root in preorder

  function build(lo, hi) {                       // subtree = inorder[lo..hi]
    if (lo > hi) return null;
    const root = new Node(preorder[pre++]);
    const mid = index.get(root.val);             // O(1) instead of indexOf
    root.left = build(lo, mid - 1);              // left part first: preorder order
    root.right = build(mid + 1, hi);
    return root;
  }

  return build(0, inorder.length - 1);
}
~~~

**What to point out in this code:**

- A \`Map\` is used for value → index. A plain object would also work for integer values, but its keys become strings; \`Map\` keeps the number keys as they are.
- \`let pre\` lives in the closure of \`buildTree\`, and \`preorder[pre++]\` reads the current root and moves the index in one step.
- \`build(lo, hi)\` receives only two numbers — no \`slice\` copies — and returns \`null\` for an empty range, which is also how an empty input returns an empty tree.
- \`root.left = build(...)\` runs **before** \`root.right = build(...)\`: that order is what makes the single moving \`pre\` index correct.
- The round-trip check in example 1 compares arrays element by element (\`sameArray\`), because \`===\` on two arrays compares references.

**The version to avoid.** \`inorder.indexOf(value)\` scans the array; the explicit scan below makes that cost visible, and example 2 counts its comparisons:

~~~javascript
// Same recursion, but find the root by scanning inorder[lo..hi]: O(n^2) worst case.
// (inorder.indexOf(value) hides exactly this scan.)
function buildScan(preorder, inorder) {
  let pre = 0;
  function build(lo, hi) {
    if (lo > hi) return null;
    const root = new Node(preorder[pre++]);
    let mid = lo;
    while (true) {
      counter.scan++;                  // one comparison
      if (inorder[mid] === root.val) break;
      mid++;
    }
    root.left = build(lo, mid - 1);
    root.right = build(mid + 1, hi);
    return root;
  }
  return build(0, inorder.length - 1);
}
~~~

The common slicing version, \`build(preorder.slice(1, mid + 1), inorder.slice(0, mid))\`, has the same O(n²) worst case for a second reason: every \`slice\` copies.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Trees are printed in LeetCode level-order format, with \`null\` for a missing child.

**Example 1 — rebuild six trees, print level order and postorder, and check the round trip** prints:

~~~text
pre [3, 9, 20, 15, 7] in [9, 3, 15, 20, 7] -> [3, 9, 20, null, null, 15, 7], post [9, 15, 7, 20, 3], round trip true
pre [1, 2, 3] in [3, 2, 1] -> [1, 2, null, 3], post [3, 2, 1], round trip true
pre [1, 2, 3] in [1, 2, 3] -> [1, null, 2, null, 3], post [3, 2, 1], round trip true
pre [4, 2, 1, 3, 6, 5, 7] in [1, 2, 3, 4, 5, 6, 7] -> [4, 2, 6, 1, 3, 5, 7], post [1, 3, 2, 5, 7, 6, 4], round trip true
pre [-1] in [-1] -> [-1], post [-1], round trip true
pre [] in [] -> [], post [], round trip true
~~~

**Example 2 — scan vs hash map on a 500-node chain and a 511-node balanced tree, and the duplicate-value ambiguity** prints:

~~~text
left chain, n = 500: scan comparisons 125250, map lookups 500, same tree true
balanced, n = 511: scan comparisons 2304, map lookups 511, same tree true
duplicates: [1, 1] has pre [1, 1] in [1, 1]
duplicates: [1, null, 1] has pre [1, 1] in [1, 1]
~~~

Reading example 1: every rebuilt tree has exactly the given preorder and inorder ("round trip true"). The same preorder \`[1, 2, 3]\` gives a left chain with inorder \`[3, 2, 1]\` and a right chain with inorder \`[1, 2, 3]\` — the inorder alone decides the shape. Reading example 2: on the chain the scan made 125,250 comparisons against 500 map lookups; on the balanced tree only 2,304, because each scan range is short. The last two lines show two different trees with identical traversals.

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Index map + index ranges | O(n) | O(n) | one map lookup per node (500 for n = 500 in example 2); map is O(n), recursion O(h) |
| Linear scan of the inorder range | O(n²) worst, O(n log n) balanced | O(h) | 125,250 comparisons on the 500-node chain, 2,304 on the 511-node balanced tree |
| \`indexOf\` + \`slice\` | O(n²) worst | O(n²) worst | scan per node plus a copied array per call |

n is the number of nodes and h the height of the tree (the recursion depth).

## 8. Edge Cases and Variants

- **Empty arrays** — return an empty tree (\`build(0, -1)\` returns at once).
- **One node** — \`[-1]\` and \`[-1]\` give a single node; negative values are fine because the map is keyed by value.
- **Skewed trees** — \`[1, 2, 3]\` with inorder \`[3, 2, 1]\` is a left chain, with \`[1, 2, 3]\` a right chain. Recursion depth is n.
- **Duplicates** — the answer is not unique; say so and ask whether values are distinct.
- **Postorder + inorder** — the same idea mirrored: the *last* postorder value is the root, so consume postorder from the end and build the **right** subtree first.
- **Preorder + postorder** — not unique in general: a node with a single child could have it on either side and both traversals look the same.

## Common Pitfalls

- **Building right before left.** With one shared preorder index, the left subtree must be built first, because preorder lists it first.
- **\`indexOf\` per node.** It is a hidden linear scan — 125,250 comparisons instead of 500 on a 500-node chain.
- **\`slice\` at every call.** Each slice copies; it turns the O(n) idea into O(n²) on skewed trees.
- **Comparing arrays with \`===\`.** Two arrays with the same contents are different objects; compare element by element when testing.
- **Assuming values are distinct without saying so.** With duplicates the \`Map\` keeps only the last position of each value, silently building a wrong tree.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">The first preorder value is the root; its position in inorder splits the rest into the left subtree (before) and right subtree (after).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursion:</strong> <span style="color:#f0e2c8;">Recurse on inorder index ranges, building left before right, while one closure index walks forward through preorder.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Speed-up:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from value to index makes each split O(1): O(n) total instead of O(n²) — 500 lookups vs 125,250 comparisons on a 500-node chain.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Requirement:</strong> <span style="color:#f0e2c8;">Values must be distinct; with duplicates two different trees can share both traversals.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">No <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">indexOf</code> and no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slice</code> inside the recursion — both are hidden O(n) work per call.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you got postorder and inorder instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Take roots from the end of postorder and build the right subtree before the left; everything else is the same.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can preorder and postorder rebuild the tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not uniquely: a node with one child has the same preorder and postorder whether the child is left or right.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> and not a plain object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Object keys are converted to strings; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> keeps number keys as numbers and has no inherited properties to collide with.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a very deep tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the iterative O(n) stack-based version, since deep recursion throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code> in JavaScript.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rebuild, then compute the preorder and inorder of the result and compare element by element with the input.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Preorder traversal** | Node, left, right; the first value is the root |
| **Inorder traversal** | Left, node, right; a root splits left values from right values |
| **Divide and conquer** | Split into independent smaller problems, solve, combine |
| **Index map** | Hash map from value to array position, built once in O(n) |
| **Index range (bounds) instead of slices** | Describe a sub-array by two indexes instead of copying it |
| **Unique reconstruction** | The traversals determine exactly one tree |

---
**Conclusion:** Preorder tells you which value is the root, and inorder tells you which values go to its left and to its right; recursing on the two sides — left first, while one closure index walks through preorder — rebuilds the tree. With a \`Map\` from value to inorder position and index ranges instead of \`slice\`, the whole build is O(n): 500 lookups instead of 125,250 comparisons on a 500-node chain in example 2. State up front that the values must be distinct, because with duplicates two different trees share the same traversals.`,
        examples: [
          {
            label: "Rebuild from preorder + inorder with an index map (6 cases)",
            code: `class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// Rebuild a tree with distinct values in O(n) using an index map.
function buildTree(preorder, inorder) {
  const index = new Map();                       // value -> position in inorder
  inorder.forEach((v, i) => index.set(v, i));
  let pre = 0;                                   // next root in preorder

  function build(lo, hi) {                       // subtree = inorder[lo..hi]
    if (lo > hi) return null;
    const root = new Node(preorder[pre++]);
    const mid = index.get(root.val);             // O(1) instead of indexOf
    root.left = build(lo, mid - 1);              // left part first: preorder order
    root.right = build(mid + 1, hi);
    return root;
  }

  return build(0, inorder.length - 1);
}

function traverse(node, order, out) {
  if (node === null) return out;
  if (order === "pre") out.push(node.val);
  traverse(node.left, order, out);
  if (order === "in") out.push(node.val);
  traverse(node.right, order, out);
  if (order === "post") out.push(node.val);
  return out;
}

function levelOrder(root) {
  const out = [];
  const queue = [root];
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    if (node === null) out.push("null");
    else {
      out.push(String(node.val));
      queue.push(node.left, node.right);
    }
  }
  while (out.length && out[out.length - 1] === "null") out.pop();
  return "[" + out.join(", ") + "]";
}

const fmt = (xs) => "[" + xs.join(", ") + "]";
// Arrays are objects, so === compares references; compare element by element.
const sameArray = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

const cases = [
  [[3, 9, 20, 15, 7], [9, 3, 15, 20, 7]],
  [[1, 2, 3], [3, 2, 1]],
  [[1, 2, 3], [1, 2, 3]],
  [[4, 2, 1, 3, 6, 5, 7], [1, 2, 3, 4, 5, 6, 7]],
  [[-1], [-1]],
  [[], []],
];
for (const [pre, ino] of cases) {
  const root = buildTree(pre, ino);
  const same = sameArray(traverse(root, "pre", []), pre) && sameArray(traverse(root, "in", []), ino);
  console.log("pre " + fmt(pre) + " in " + fmt(ino) + " -> " + levelOrder(root) +
    ", post " + fmt(traverse(root, "post", [])) + ", round trip " + same);
}`,
          },
          {
            label: "Linear scan vs hash map, and why duplicates break it",
            code: `class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

const counter = { scan: 0, map: 0 };

// Same recursion, but find the root by scanning inorder[lo..hi]: O(n^2) worst case.
// (inorder.indexOf(value) hides exactly this scan.)
function buildScan(preorder, inorder) {
  let pre = 0;
  function build(lo, hi) {
    if (lo > hi) return null;
    const root = new Node(preorder[pre++]);
    let mid = lo;
    while (true) {
      counter.scan++;                  // one comparison
      if (inorder[mid] === root.val) break;
      mid++;
    }
    root.left = build(lo, mid - 1);
    root.right = build(mid + 1, hi);
    return root;
  }
  return build(0, inorder.length - 1);
}

function buildMap(preorder, inorder) {
  const index = new Map();
  inorder.forEach((v, i) => index.set(v, i));
  let pre = 0;
  function build(lo, hi) {
    if (lo > hi) return null;
    const root = new Node(preorder[pre++]);
    counter.map++;                     // one Map lookup
    const mid = index.get(root.val);
    root.left = build(lo, mid - 1);
    root.right = build(mid + 1, hi);
    return root;
  }
  return build(0, inorder.length - 1);
}

function levelOrder(root) {
  const out = [];
  const queue = [root];
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    if (node === null) out.push("null");
    else {
      out.push(String(node.val));
      queue.push(node.left, node.right);
    }
  }
  while (out.length && out[out.length - 1] === "null") out.pop();
  return "[" + out.join(", ") + "]";
}

function walk(node, pre, ino) {
  if (node !== null) {
    pre.push(node.val);
    walk(node.left, pre, ino);
    ino.push(node.val);
    walk(node.right, pre, ino);
  }
  return "pre [" + pre.join(", ") + "] in [" + ino.join(", ") + "]";
}

function balancedPreorder(lo, hi, out) {
  if (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    out.push(mid);
    balancedPreorder(lo, mid - 1, out);
    balancedPreorder(mid + 1, hi, out);
  }
  return out;
}

function compare(name, preorder, inorder) {
  counter.scan = 0;
  counter.map = 0;
  const a = buildScan(preorder, inorder);
  const b = buildMap(preorder, inorder);
  console.log(name + ", n = " + inorder.length + ": scan comparisons " + counter.scan +
    ", map lookups " + counter.map + ", same tree " + (levelOrder(a) === levelOrder(b)));
}

const n = 500;
const up = [];
const down = [];
for (let v = 1; v <= n; v++) { up.push(v); down.push(n + 1 - v); }
compare("left chain", up, down);
const sorted = [];
for (let v = 1; v <= 511; v++) sorted.push(v);
compare("balanced", balancedPreorder(1, 511, []), sorted);

// Duplicates: two different shapes, identical traversals.
const a = new Node(1);
a.left = new Node(1);
const b = new Node(1);
b.right = new Node(1);
console.log("duplicates: " + levelOrder(a) + " has " + walk(a, [], []));
console.log("duplicates: " + levelOrder(b) + " has " + walk(b, [], []));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"I give you two arrays: the preorder and the inorder traversal of a binary tree whose values are all distinct. Write a Java function that rebuilds the tree and returns its root."

**What a strong answer should cover:**
- Preorder's first value is the root; finding that value in inorder splits the remaining values into the left subtree (before it) and the right subtree (after it).
- Recurse on the two parts; the left subtree's preorder comes first, so build left before right while consuming preorder with one moving index.
- A value → index hash map makes each split O(1), giving O(n) total; a linear search per node is O(n²) on a skewed tree.
- Pass index ranges instead of copying sub-arrays.
- Why the values must be distinct (duplicates make the answer ambiguous) and why preorder + postorder alone is not enough in general.
- Java specifics: a \`HashMap<Integer, Integer>\` (boxing, and a \`NullPointerException\` when unboxing a missing key), sharing the preorder index through a field, and not using \`Arrays.copyOfRange\` per call.

**Clarifying questions expected:**
- Are all values distinct, and are the two arrays guaranteed to describe the same tree?
- How large can n be (is recursion depth a concern)?

**Code / implementation expected:** Yes — a recursive helper over inorder index ranges with a \`HashMap\`, in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree, recursion and a hash map are.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a school photo taken in one long row, and a separate list of names written in the order the head teacher introduced them: always a group leader first, then the people in that leader's group. From the introduction list alone you know who the very first leader is, but not who belongs to which group. From the photo alone you know who stands to the left and right of whom, but not who is in charge. Put the two together and the whole structure falls out: find the first leader in the photo; everyone standing to their left is in one group, everyone to their right in the other. Repeat inside each group.

That is exactly this problem. The **preorder** traversal (root, left subtree, right subtree) is the introduction list — it always names a root before its subtrees. The **inorder** traversal (left subtree, root, right subtree) is the photo — it tells you, for any root, which values are on its left and which on its right. Interviewers like this question because it tests whether you really understand what each [traversal](/interview-question/what-are-the-tree-traversal-methods) guarantees, and whether you can turn a correct O(n²) recursion into O(n) with one hash map.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all values distinct? | The algorithm finds the root's position in inorder by value. With duplicates that position is ambiguous — two different trees can have identical traversals (example 2). |
| Are the arrays guaranteed to be valid and the same length? | If not, you must detect a value that is missing from inorder instead of crashing. |
| Can the arrays be empty? | An empty input should return an empty tree. |
| How large is n? | Recursion depth equals the tree height, up to n for a skewed tree. |
| Which two traversals do I get? | Preorder + inorder or postorder + inorder rebuild a unique tree; preorder + postorder in general does not. |

## 3. The Core Idea: Root From Preorder, Split From Inorder

Take preorder \`[3, 9, 20, 15, 7]\` and inorder \`[9, 3, 15, 20, 7]\`.

1. The first preorder value, **3**, is the root.
2. Find 3 in inorder. Everything before it (\`[9]\`) is the left subtree; everything after it (\`[15, 20, 7]\`) is the right subtree.
3. The left subtree has 1 value, so the next 1 preorder value (9) belongs to it, and the rest (\`[20, 15, 7]\`) to the right subtree. Recurse on each side.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 240" role="img" aria-label="Preorder 3, 9, 20, 15, 7 and inorder 9, 3, 15, 20, 7. The first preorder value 3 is the root; in inorder, 9 is on its left and 15, 20, 7 on its right">
  <rect class="d-box-accent" x="150" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="185" y="76" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="235" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="270" y="76" text-anchor="middle">9</text>
  <rect class="d-box" x="320" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="355" y="76" text-anchor="middle">20</text>
  <rect class="d-box" x="405" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="440" y="76" text-anchor="middle">15</text>
  <rect class="d-box" x="490" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="525" y="76" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="150" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="185" y="166" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="235" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="270" y="166" text-anchor="middle">3</text>
  <rect class="d-box" x="320" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="355" y="166" text-anchor="middle">15</text>
  <rect class="d-box" x="405" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="440" y="166" text-anchor="middle">20</text>
  <rect class="d-box" x="490" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="525" y="166" text-anchor="middle">7</text>
  <text class="d-text" x="20" y="76" text-anchor="start">preorder</text>
  <text class="d-text" x="20" y="166" text-anchor="start">inorder</text>
  <text class="d-sub" x="185" y="220" text-anchor="middle">left</text>
  <text class="d-sub d-accent" x="270" y="220" text-anchor="middle">root</text>
  <text class="d-sub" x="440" y="220" text-anchor="middle">right subtree</text>
</svg>

The root is always the first value of the current preorder range; its position in inorder decides how many values go left. Repeating the step on each side gives this tree:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="The rebuilt tree: root 3 with left child 9 and right child 20; 20 has children 15 and 7">
  <path class="d-edge" d="M 302 62 L 218 118"/>
  <path class="d-edge" d="M 338 62 L 422 118"/>
  <path class="d-edge" d="M 426 147 L 384 193"/>
  <path class="d-edge" d="M 454 147 L 496 193"/>
  <circle class="d-box-accent" cx="320" cy="50" r="22"/>
  <text class="d-text" x="320" y="56" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="200" cy="130" r="22"/>
  <text class="d-text" x="200" y="136" text-anchor="middle">9</text>
  <circle class="d-box" cx="440" cy="130" r="22"/>
  <text class="d-text" x="440" y="136" text-anchor="middle">20</text>
  <circle class="d-box" cx="370" cy="210" r="22"/>
  <text class="d-text" x="370" y="216" text-anchor="middle">15</text>
  <circle class="d-box" cx="510" cy="210" r="22"/>
  <text class="d-text" x="510" y="216" text-anchor="middle">7</text>
</svg>

📌 **Interview term: Preorder traversal** — visit the node, then its left subtree, then its right subtree. The first value is always the root.

📌 **Interview term: Inorder traversal** — visit the left subtree, then the node, then the right subtree. A root's position splits the values into its left and right subtrees.

📌 **Interview term: Divide and conquer** — solve a problem by splitting it into independent smaller problems of the same kind (here: the left and right subtrees), solving those, and combining the results.

**Why one moving preorder index is enough.** Preorder lists the whole left subtree before the whole right subtree. So if the recursion always builds the left child before the right child, the next unused preorder value is always the root of the subtree being built. You never need to compute "where does the right subtree's preorder start" — a single counter that moves forward does it.

Here is the full run on the example, with inorder ranges written as index intervals:

| Step | Preorder index | Root | Inorder range | Root found at | Left range | Right range |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 0 | 3 | [0, 4] | 1 | [0, 0] | [2, 4] |
| 2 | 1 | 9 | [0, 0] | 0 | empty | empty |
| 3 | 2 | 20 | [2, 4] | 3 | [2, 2] | [4, 4] |
| 4 | 3 | 15 | [2, 2] | 2 | empty | empty |
| 5 | 4 | 7 | [4, 4] | 4 | empty | empty |

## 4. From O(n²) to O(n)

**Finding the root in inorder.** The straightforward version scans the inorder range for the root's value. On a balanced tree that is fine, but on a skewed tree each scan is long: for a 500-node left chain, example 2 counted **125,250** comparisons (n(n + 1) / 2). Building a value → index hash map once (O(n)) makes every lookup O(1): **500** lookups for the same tree.

**Copying sub-arrays.** Many first attempts slice the arrays at each step: pass \`preorder[1 : mid + 1]\` and \`inorder[: mid]\` to the left recursion. Each slice copies its elements, so even with a hash map the copies cost O(n) per level and O(n²) on a skewed tree. Passing the **index range** \`[lo, hi]\` of the inorder array (and the shared preorder index) avoids copying anything.

📌 **Interview term: Index map** — a hash map from each value to its position in an array, built in one O(n) pass so later "where is x?" questions are O(1). It needs distinct values.

📌 **Interview term: Index range (bounds) instead of slices** — describing a sub-array by its first and last index rather than copying it; recursion then passes two integers instead of new arrays.

**Why the values must be distinct.** With duplicates, "find the root's position in inorder" has more than one answer. Example 2 builds two different trees — 1 with a left child 1, and 1 with a right child 1 — that both have preorder \`[1, 1]\` and inorder \`[1, 1]\`. No algorithm can tell them apart from the traversals alone.

📌 **Interview term: Unique reconstruction** — two traversals determine the tree only if every tree with those traversals is the same tree. Preorder + inorder (or postorder + inorder) does this for distinct values; preorder + postorder does not when a node has only one child.

## 5. The Code in Java

The O(n) version from example 1. Java has no closures over mutable local variables, so the preorder array, the index map and the moving index are static fields shared by the recursive \`build\`:

~~~java
static int[] preorder;
static Map<Integer, Integer> index;   // value -> position in inorder
static int pre;                       // next root in preorder

/** Rebuild a tree with distinct values in O(n) using an index map. */
static Node buildTree(int[] preorderIn, int[] inorder) {
    preorder = preorderIn;
    index = new HashMap<>();
    for (int i = 0; i < inorder.length; i++) index.put(inorder[i], i);
    pre = 0;
    return build(0, inorder.length - 1);
}

static Node build(int lo, int hi) {   // subtree = inorder[lo..hi]
    if (lo > hi) return null;
    Node root = new Node(preorder[pre++]);
    int mid = index.get(root.val);    // O(1) instead of a scan (auto-unboxing)
    root.left = build(lo, mid - 1);   // left part first: preorder order
    root.right = build(mid + 1, hi);
    return root;
}
~~~

**What to point out in this code:**

- \`HashMap<Integer, Integer>\` boxes every key and value. \`index.get(root.val)\` auto-unboxes the result to \`int\`; if the value were missing from inorder (invalid input), \`get\` returns \`null\` and the unboxing throws \`NullPointerException\`. Check with \`containsKey\` if the input may be bad.
- \`preorder[pre++]\` reads the current root and moves the shared index in one step.
- \`build(lo, hi)\` receives only two \`int\`s. Copying with \`Arrays.copyOfRange\` at each level would add O(n) per level.
- \`root.left = build(...)\` runs **before** \`root.right = build(...)\`: that order is what makes the single moving \`pre\` index correct.
- Static fields keep the example short; in production code put them in an instance (\`new Builder(preorder, inorder).build()\`) so two calls cannot interfere.

**The version to avoid.** A linear scan of the inorder range, as below, is what you write without the map; example 2 counts its comparisons:

~~~java
/** Same recursion, but find the root by scanning inorder[lo..hi]: O(n^2) worst case. */
static Node buildScan(int lo, int hi) {
    if (lo > hi) return null;
    Node root = new Node(preorder[pre++]);
    int mid = lo;
    while (true) {
        scanCount++;                       // one comparison
        if (inorder[mid] == root.val) break;
        mid++;
    }
    root.left = buildScan(lo, mid - 1);
    root.right = buildScan(mid + 1, hi);
    return root;
}
~~~

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Trees are printed in LeetCode level-order format, with \`null\` for a missing child.

**Example 1 — rebuild six trees, print level order and postorder, and check the round trip** prints:

~~~text
pre [3, 9, 20, 15, 7] in [9, 3, 15, 20, 7] -> [3, 9, 20, null, null, 15, 7], post [9, 15, 7, 20, 3], round trip true
pre [1, 2, 3] in [3, 2, 1] -> [1, 2, null, 3], post [3, 2, 1], round trip true
pre [1, 2, 3] in [1, 2, 3] -> [1, null, 2, null, 3], post [3, 2, 1], round trip true
pre [4, 2, 1, 3, 6, 5, 7] in [1, 2, 3, 4, 5, 6, 7] -> [4, 2, 6, 1, 3, 5, 7], post [1, 3, 2, 5, 7, 6, 4], round trip true
pre [-1] in [-1] -> [-1], post [-1], round trip true
pre [] in [] -> [], post [], round trip true
~~~

**Example 2 — scan vs hash map on a 500-node chain and a 511-node balanced tree, and the duplicate-value ambiguity** prints:

~~~text
left chain, n = 500: scan comparisons 125250, map lookups 500, same tree true
balanced, n = 511: scan comparisons 2304, map lookups 511, same tree true
duplicates: [1, 1] has pre [1, 1] in [1, 1]
duplicates: [1, null, 1] has pre [1, 1] in [1, 1]
~~~

Reading example 1: every rebuilt tree has exactly the given preorder and inorder ("round trip true"). The same preorder \`[1, 2, 3]\` gives a left chain with inorder \`[3, 2, 1]\` and a right chain with inorder \`[1, 2, 3]\` — the inorder alone decides the shape. Reading example 2: on the chain the scan made 125,250 comparisons against 500 map lookups; on the balanced tree only 2,304, because each scan range is short. The last two lines show two different trees with identical traversals.

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Index map + index ranges | O(n) | O(n) | one map lookup per node (500 for n = 500 in example 2); map is O(n), recursion O(h) |
| Linear scan of the inorder range | O(n²) worst, O(n log n) balanced | O(h) | 125,250 comparisons on the 500-node chain, 2,304 on the 511-node balanced tree |
| \`Arrays.copyOfRange\` per call | O(n²) worst | O(n²) worst | copying sub-arrays at every level |

n is the number of nodes and h the height of the tree (the recursion depth).

## 8. Edge Cases and Variants

- **Empty arrays** — return an empty tree (\`build(0, -1)\` returns at once).
- **One node** — \`[-1]\` and \`[-1]\` give a single node; negative values are fine because the map is keyed by value.
- **Skewed trees** — \`[1, 2, 3]\` with inorder \`[3, 2, 1]\` is a left chain, with \`[1, 2, 3]\` a right chain. Recursion depth is n.
- **Duplicates** — the answer is not unique; say so and ask whether values are distinct.
- **Postorder + inorder** — the same idea mirrored: the *last* postorder value is the root, so consume postorder from the end and build the **right** subtree first.
- **Preorder + postorder** — not unique in general: a node with a single child could have it on either side and both traversals look the same.

## Common Pitfalls

- **Building right before left.** With one shared preorder index, the left subtree must be built first, because preorder lists it first.
- **Passing the preorder index as an \`int\` parameter.** Java passes \`int\` by value, so a callee's \`pre++\` is invisible to the caller; use a field, an \`int[]\`, or return the new index.
- **Unboxing a missing key.** \`int mid = index.get(x)\` throws \`NullPointerException\` if \`x\` is not in inorder.
- **Copying with \`Arrays.copyOfRange\`.** Each copy costs O(n); pass index ranges.
- **Static state left over between calls.** Reset \`pre\` (and rebuild the map) at the start of every \`buildTree\`, or keep the state in an object.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">The first preorder value is the root; its position in inorder splits the rest into the left subtree (before) and right subtree (after).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursion:</strong> <span style="color:#f0e2c8;">Recurse on inorder index ranges, building left before right, while a shared field index walks forward through preorder.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Speed-up:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> from value to index makes each split O(1): O(n) total instead of O(n²) — 500 lookups vs 125,250 comparisons on a 500-node chain.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Requirement:</strong> <span style="color:#f0e2c8;">Values must be distinct; with duplicates two different trees can share both traversals.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">The preorder index must be shared (a field or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>) because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> parameters are copies; unboxing a missing key throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NullPointerException</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you got postorder and inorder instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Take roots from the end of postorder and build the right subtree before the left; everything else is the same.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can preorder and postorder rebuild the tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not uniquely: a node with one child has the same preorder and postorder whether the child is left or right.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap</code> boxing a problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It allocates for values outside the small <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> cache, but it is still O(1) per lookup. For values in a small known range an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> indexed by value avoids boxing entirely.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a very deep tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the iterative O(n) stack-based version with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code>, since deep recursion can throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rebuild, then compute the preorder and inorder of the result and compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">List.equals</code> — the round-trip check in example 1.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Preorder traversal** | Node, left, right; the first value is the root |
| **Inorder traversal** | Left, node, right; a root splits left values from right values |
| **Divide and conquer** | Split into independent smaller problems, solve, combine |
| **Index map** | Hash map from value to array position, built once in O(n) |
| **Index range (bounds) instead of slices** | Describe a sub-array by two indexes instead of copying it |
| **Unique reconstruction** | The traversals determine exactly one tree |

---
**Conclusion:** Preorder tells you which value is the root, and inorder tells you which values go to its left and to its right; recursing on the two sides — left first, while a shared index walks through preorder — rebuilds the tree. With a \`HashMap\` from value to inorder position and index ranges instead of array copies, the whole build is O(n): 500 lookups instead of 125,250 comparisons on a 500-node chain in example 2. In Java, keep the preorder index in a field (an \`int\` parameter is a copy) and remember that unboxing a missing key throws.`,
        examples: [
          {
            label: "Rebuild from preorder + inorder with an index map (6 cases)",
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    static int[] preorder;
    static Map<Integer, Integer> index;   // value -> position in inorder
    static int pre;                       // next root in preorder

    /** Rebuild a tree with distinct values in O(n) using an index map. */
    static Node buildTree(int[] preorderIn, int[] inorder) {
        preorder = preorderIn;
        index = new HashMap<>();
        for (int i = 0; i < inorder.length; i++) index.put(inorder[i], i);
        pre = 0;
        return build(0, inorder.length - 1);
    }

    static Node build(int lo, int hi) {   // subtree = inorder[lo..hi]
        if (lo > hi) return null;
        Node root = new Node(preorder[pre++]);
        int mid = index.get(root.val);    // O(1) instead of a scan (auto-unboxing)
        root.left = build(lo, mid - 1);   // left part first: preorder order
        root.right = build(mid + 1, hi);
        return root;
    }

    static List<Integer> traverse(Node node, String order, List<Integer> out) {
        if (node == null) return out;
        if (order.equals("pre")) out.add(node.val);
        traverse(node.left, order, out);
        if (order.equals("in")) out.add(node.val);
        traverse(node.right, order, out);
        if (order.equals("post")) out.add(node.val);
        return out;
    }

    static String levelOrder(Node root) {
        List<String> out = new ArrayList<>();
        List<Node> queue = new ArrayList<>();
        queue.add(root);
        for (int i = 0; i < queue.size(); i++) {
            Node node = queue.get(i);
            if (node == null) out.add("null");
            else {
                out.add(String.valueOf(node.val));
                queue.add(node.left);
                queue.add(node.right);
            }
        }
        while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
        return "[" + String.join(", ", out) + "]";
    }

    static List<Integer> list(int[] a) {
        List<Integer> out = new ArrayList<>();
        for (int v : a) out.add(v);
        return out;
    }

    static String fmt(List<Integer> xs) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < xs.size(); i++) sb.append(i > 0 ? ", " : "").append(xs.get(i));
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        int[][][] cases = {
            {{3, 9, 20, 15, 7}, {9, 3, 15, 20, 7}},
            {{1, 2, 3}, {3, 2, 1}},
            {{1, 2, 3}, {1, 2, 3}},
            {{4, 2, 1, 3, 6, 5, 7}, {1, 2, 3, 4, 5, 6, 7}},
            {{-1}, {-1}},
            {{}, {}},
        };
        for (int[][] c : cases) {
            Node root = buildTree(c[0], c[1]);
            // List.equals compares element by element (Integer.equals, not ==)
            boolean same = traverse(root, "pre", new ArrayList<>()).equals(list(c[0]))
                    && traverse(root, "in", new ArrayList<>()).equals(list(c[1]));
            System.out.println("pre " + fmt(list(c[0])) + " in " + fmt(list(c[1])) + " -> " + levelOrder(root)
                    + ", post " + fmt(traverse(root, "post", new ArrayList<>())) + ", round trip " + same);
        }
    }
}`,
          },
          {
            label: "Linear scan vs hash map, and why duplicates break it",
            code: `import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    static long scanCount = 0, mapCount = 0;
    static int[] preorder, inorder;
    static int pre;
    static Map<Integer, Integer> index;

    /** Same recursion, but find the root by scanning inorder[lo..hi]: O(n^2) worst case. */
    static Node buildScan(int lo, int hi) {
        if (lo > hi) return null;
        Node root = new Node(preorder[pre++]);
        int mid = lo;
        while (true) {
            scanCount++;                       // one comparison
            if (inorder[mid] == root.val) break;
            mid++;
        }
        root.left = buildScan(lo, mid - 1);
        root.right = buildScan(mid + 1, hi);
        return root;
    }

    static Node buildMap(int lo, int hi) {
        if (lo > hi) return null;
        Node root = new Node(preorder[pre++]);
        mapCount++;                            // one HashMap lookup
        int mid = index.get(root.val);
        root.left = buildMap(lo, mid - 1);
        root.right = buildMap(mid + 1, hi);
        return root;
    }

    static String levelOrder(Node root) {
        List<String> out = new ArrayList<>();
        List<Node> queue = new ArrayList<>();
        queue.add(root);
        for (int i = 0; i < queue.size(); i++) {
            Node node = queue.get(i);
            if (node == null) out.add("null");
            else {
                out.add(String.valueOf(node.val));
                queue.add(node.left);
                queue.add(node.right);
            }
        }
        while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
        return "[" + String.join(", ", out) + "]";
    }

    static void walk(Node node, List<Integer> pre, List<Integer> ino) {
        if (node == null) return;
        pre.add(node.val);
        walk(node.left, pre, ino);
        ino.add(node.val);
        walk(node.right, pre, ino);
    }

    static String orders(Node node) {
        List<Integer> p = new ArrayList<>(), q = new ArrayList<>();
        walk(node, p, q);
        return "pre " + p + " in " + q;     // List.toString prints [1, 1]
    }

    static void balancedPreorder(int lo, int hi, List<Integer> out) {
        if (lo > hi) return;
        int mid = (lo + hi) / 2;
        out.add(mid);
        balancedPreorder(lo, mid - 1, out);
        balancedPreorder(mid + 1, hi, out);
    }

    static void compare(String name, int[] p, int[] in) {
        preorder = p;
        inorder = in;
        index = new HashMap<>();
        for (int i = 0; i < in.length; i++) index.put(in[i], i);
        scanCount = 0;
        mapCount = 0;
        pre = 0;
        Node a = buildScan(0, in.length - 1);
        pre = 0;
        Node b = buildMap(0, in.length - 1);
        System.out.println(name + ", n = " + in.length + ": scan comparisons " + scanCount
                + ", map lookups " + mapCount + ", same tree " + levelOrder(a).equals(levelOrder(b)));
    }

    public static void main(String[] args) {
        int n = 500;
        int[] up = new int[n], down = new int[n];
        for (int i = 0; i < n; i++) { up[i] = i + 1; down[i] = n - i; }
        compare("left chain", up, down);
        List<Integer> bp = new ArrayList<>();
        balancedPreorder(1, 511, bp);
        int[] p = bp.stream().mapToInt(Integer::intValue).toArray();
        int[] sorted = new int[511];
        for (int i = 0; i < 511; i++) sorted[i] = i + 1;
        compare("balanced", p, sorted);

        // Duplicates: two different shapes, identical traversals.
        Node a = new Node(1);
        a.left = new Node(1);
        Node b = new Node(1);
        b.right = new Node(1);
        System.out.println("duplicates: " + levelOrder(a) + " has " + orders(a));
        System.out.println("duplicates: " + levelOrder(b) + " has " + orders(b));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"I give you two arrays: the preorder and the inorder traversal of a binary tree whose values are all distinct. Write a C++ function that rebuilds the tree and returns its root."

**What a strong answer should cover:**
- Preorder's first value is the root; finding that value in inorder splits the remaining values into the left subtree (before it) and the right subtree (after it).
- Recurse on the two parts; the left subtree's preorder comes first, so build left before right while consuming preorder with one moving index.
- A value → index hash map makes each split O(1), giving O(n) total; a linear search per node is O(n²) on a skewed tree.
- Pass index ranges instead of copying sub-arrays.
- Why the values must be distinct (duplicates make the answer ambiguous) and why preorder + postorder alone is not enough in general.
- C++ specifics: an \`unordered_map<int, int>\`, \`at()\` instead of \`operator[]\` (which silently inserts 0 for a missing key), passing vectors by \`const&\`, and a recursive lambda via \`std::function\`.

**Clarifying questions expected:**
- Are all values distinct, and are the two arrays guaranteed to describe the same tree?
- How large can n be (is recursion depth a concern)?

**Code / implementation expected:** Yes — a recursive helper over inorder index ranges with an \`unordered_map\`, in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree, recursion and a hash map are.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a school photo taken in one long row, and a separate list of names written in the order the head teacher introduced them: always a group leader first, then the people in that leader's group. From the introduction list alone you know who the very first leader is, but not who belongs to which group. From the photo alone you know who stands to the left and right of whom, but not who is in charge. Put the two together and the whole structure falls out: find the first leader in the photo; everyone standing to their left is in one group, everyone to their right in the other. Repeat inside each group.

That is exactly this problem. The **preorder** traversal (root, left subtree, right subtree) is the introduction list — it always names a root before its subtrees. The **inorder** traversal (left subtree, root, right subtree) is the photo — it tells you, for any root, which values are on its left and which on its right. Interviewers like this question because it tests whether you really understand what each [traversal](/interview-question/what-are-the-tree-traversal-methods) guarantees, and whether you can turn a correct O(n²) recursion into O(n) with one hash map.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all values distinct? | The algorithm finds the root's position in inorder by value. With duplicates that position is ambiguous — two different trees can have identical traversals (example 2). |
| Are the arrays guaranteed to be valid and the same length? | If not, you must detect a value that is missing from inorder instead of crashing. |
| Can the arrays be empty? | An empty input should return an empty tree. |
| How large is n? | Recursion depth equals the tree height, up to n for a skewed tree. |
| Which two traversals do I get? | Preorder + inorder or postorder + inorder rebuild a unique tree; preorder + postorder in general does not. |

## 3. The Core Idea: Root From Preorder, Split From Inorder

Take preorder \`[3, 9, 20, 15, 7]\` and inorder \`[9, 3, 15, 20, 7]\`.

1. The first preorder value, **3**, is the root.
2. Find 3 in inorder. Everything before it (\`[9]\`) is the left subtree; everything after it (\`[15, 20, 7]\`) is the right subtree.
3. The left subtree has 1 value, so the next 1 preorder value (9) belongs to it, and the rest (\`[20, 15, 7]\`) to the right subtree. Recurse on each side.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 240" role="img" aria-label="Preorder 3, 9, 20, 15, 7 and inorder 9, 3, 15, 20, 7. The first preorder value 3 is the root; in inorder, 9 is on its left and 15, 20, 7 on its right">
  <rect class="d-box-accent" x="150" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="185" y="76" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="235" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="270" y="76" text-anchor="middle">9</text>
  <rect class="d-box" x="320" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="355" y="76" text-anchor="middle">20</text>
  <rect class="d-box" x="405" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="440" y="76" text-anchor="middle">15</text>
  <rect class="d-box" x="490" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="525" y="76" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="150" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="185" y="166" text-anchor="middle">9</text>
  <rect class="d-box-accent" x="235" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="270" y="166" text-anchor="middle">3</text>
  <rect class="d-box" x="320" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="355" y="166" text-anchor="middle">15</text>
  <rect class="d-box" x="405" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="440" y="166" text-anchor="middle">20</text>
  <rect class="d-box" x="490" y="130" width="70" height="60" rx="8"/>
  <text class="d-text" x="525" y="166" text-anchor="middle">7</text>
  <text class="d-text" x="20" y="76" text-anchor="start">preorder</text>
  <text class="d-text" x="20" y="166" text-anchor="start">inorder</text>
  <text class="d-sub" x="185" y="220" text-anchor="middle">left</text>
  <text class="d-sub d-accent" x="270" y="220" text-anchor="middle">root</text>
  <text class="d-sub" x="440" y="220" text-anchor="middle">right subtree</text>
</svg>

The root is always the first value of the current preorder range; its position in inorder decides how many values go left. Repeating the step on each side gives this tree:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="The rebuilt tree: root 3 with left child 9 and right child 20; 20 has children 15 and 7">
  <path class="d-edge" d="M 302 62 L 218 118"/>
  <path class="d-edge" d="M 338 62 L 422 118"/>
  <path class="d-edge" d="M 426 147 L 384 193"/>
  <path class="d-edge" d="M 454 147 L 496 193"/>
  <circle class="d-box-accent" cx="320" cy="50" r="22"/>
  <text class="d-text" x="320" y="56" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="200" cy="130" r="22"/>
  <text class="d-text" x="200" y="136" text-anchor="middle">9</text>
  <circle class="d-box" cx="440" cy="130" r="22"/>
  <text class="d-text" x="440" y="136" text-anchor="middle">20</text>
  <circle class="d-box" cx="370" cy="210" r="22"/>
  <text class="d-text" x="370" y="216" text-anchor="middle">15</text>
  <circle class="d-box" cx="510" cy="210" r="22"/>
  <text class="d-text" x="510" y="216" text-anchor="middle">7</text>
</svg>

📌 **Interview term: Preorder traversal** — visit the node, then its left subtree, then its right subtree. The first value is always the root.

📌 **Interview term: Inorder traversal** — visit the left subtree, then the node, then the right subtree. A root's position splits the values into its left and right subtrees.

📌 **Interview term: Divide and conquer** — solve a problem by splitting it into independent smaller problems of the same kind (here: the left and right subtrees), solving those, and combining the results.

**Why one moving preorder index is enough.** Preorder lists the whole left subtree before the whole right subtree. So if the recursion always builds the left child before the right child, the next unused preorder value is always the root of the subtree being built. You never need to compute "where does the right subtree's preorder start" — a single counter that moves forward does it.

Here is the full run on the example, with inorder ranges written as index intervals:

| Step | Preorder index | Root | Inorder range | Root found at | Left range | Right range |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 0 | 3 | [0, 4] | 1 | [0, 0] | [2, 4] |
| 2 | 1 | 9 | [0, 0] | 0 | empty | empty |
| 3 | 2 | 20 | [2, 4] | 3 | [2, 2] | [4, 4] |
| 4 | 3 | 15 | [2, 2] | 2 | empty | empty |
| 5 | 4 | 7 | [4, 4] | 4 | empty | empty |

## 4. From O(n²) to O(n)

**Finding the root in inorder.** The straightforward version scans the inorder range for the root's value. On a balanced tree that is fine, but on a skewed tree each scan is long: for a 500-node left chain, example 2 counted **125,250** comparisons (n(n + 1) / 2). Building a value → index hash map once (O(n)) makes every lookup O(1): **500** lookups for the same tree.

**Copying sub-arrays.** Many first attempts slice the arrays at each step: pass \`preorder[1 : mid + 1]\` and \`inorder[: mid]\` to the left recursion. Each slice copies its elements, so even with a hash map the copies cost O(n) per level and O(n²) on a skewed tree. Passing the **index range** \`[lo, hi]\` of the inorder array (and the shared preorder index) avoids copying anything.

📌 **Interview term: Index map** — a hash map from each value to its position in an array, built in one O(n) pass so later "where is x?" questions are O(1). It needs distinct values.

📌 **Interview term: Index range (bounds) instead of slices** — describing a sub-array by its first and last index rather than copying it; recursion then passes two integers instead of new arrays.

**Why the values must be distinct.** With duplicates, "find the root's position in inorder" has more than one answer. Example 2 builds two different trees — 1 with a left child 1, and 1 with a right child 1 — that both have preorder \`[1, 1]\` and inorder \`[1, 1]\`. No algorithm can tell them apart from the traversals alone.

📌 **Interview term: Unique reconstruction** — two traversals determine the tree only if every tree with those traversals is the same tree. Preorder + inorder (or postorder + inorder) does this for distinct values; preorder + postorder does not when a node has only one child.

## 5. The Code in C++

The O(n) version from example 1. The recursive helper is a lambda that captures the map and the index by reference; a lambda cannot call itself by name, so it is stored in a \`std::function\`:

~~~cpp
// Rebuild a tree with distinct values in O(n) using an index map.
Node* buildTree(const std::vector<int>& preorder, const std::vector<int>& inorder) {
    std::unordered_map<int, int> index;                 // value -> position in inorder
    for (int i = 0; i < (int)inorder.size(); i++) index[inorder[i]] = i;
    int pre = 0;                                        // next root in preorder

    std::function<Node*(int, int)> build = [&](int lo, int hi) -> Node* {
        if (lo > hi) return nullptr;                    // subtree = inorder[lo..hi]
        pool.push_back(std::make_unique<Node>(preorder[pre++]));
        Node* root = pool.back().get();
        int mid = index.at(root->val);                  // at() throws instead of inserting
        root->left = build(lo, mid - 1);                // left part first: preorder order
        root->right = build(mid + 1, hi);
        return root;
    };
    return build(0, (int)inorder.size() - 1);
}
~~~

**What to point out in this code:**

- \`index.at(root->val)\` throws \`std::out_of_range\` if the value is missing. \`index[root->val]\` would instead **insert** a new entry with value 0 and carry on with a wrong split (in our run, reading \`m[42]\` from an empty \`unordered_map\` returned 0 and left the map with size 1).
- \`preorder[pre++]\` reads the current root and moves the shared index in one step.
- The vectors are passed as \`const std::vector<int>&\`, and the recursion passes two \`int\`s; no sub-vectors are ever copied.
- \`root->left = build(...)\` runs **before** \`root->right = build(...)\`: that order is what makes the single moving \`pre\` index correct.
- Nodes are owned by a \`std::vector<std::unique_ptr<Node>>\`, so the trees are freed automatically. \`std::function\` adds a small call overhead; a private member function or a static helper avoids it.

**The version to avoid.** A linear scan of the inorder range (what \`std::find\` would do), as below; example 2 counts its comparisons:

~~~cpp
// Same recursion, but find the root by scanning inorder[lo..hi]: O(n^2) worst case.
// (std::find over the range hides exactly this scan.)
Node* buildScan(int lo, int hi) {
    if (lo > hi) return nullptr;
    Node* root = make(preorder[pre++]);
    int mid = lo;
    while (true) {
        scanCount++;                       // one comparison
        if (inorder[mid] == root->val) break;
        mid++;
    }
    root->left = buildScan(lo, mid - 1);
    root->right = buildScan(mid + 1, hi);
    return root;
}
~~~

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13.3). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Trees are printed in LeetCode level-order format, with \`null\` for a missing child.

**Example 1 — rebuild six trees, print level order and postorder, and check the round trip** prints:

~~~text
pre [3, 9, 20, 15, 7] in [9, 3, 15, 20, 7] -> [3, 9, 20, null, null, 15, 7], post [9, 15, 7, 20, 3], round trip true
pre [1, 2, 3] in [3, 2, 1] -> [1, 2, null, 3], post [3, 2, 1], round trip true
pre [1, 2, 3] in [1, 2, 3] -> [1, null, 2, null, 3], post [3, 2, 1], round trip true
pre [4, 2, 1, 3, 6, 5, 7] in [1, 2, 3, 4, 5, 6, 7] -> [4, 2, 6, 1, 3, 5, 7], post [1, 3, 2, 5, 7, 6, 4], round trip true
pre [-1] in [-1] -> [-1], post [-1], round trip true
pre [] in [] -> [], post [], round trip true
~~~

**Example 2 — scan vs hash map on a 500-node chain and a 511-node balanced tree, and the duplicate-value ambiguity** prints:

~~~text
left chain, n = 500: scan comparisons 125250, map lookups 500, same tree true
balanced, n = 511: scan comparisons 2304, map lookups 511, same tree true
duplicates: [1, 1] has pre [1, 1] in [1, 1]
duplicates: [1, null, 1] has pre [1, 1] in [1, 1]
~~~

Reading example 1: every rebuilt tree has exactly the given preorder and inorder ("round trip true"). The same preorder \`[1, 2, 3]\` gives a left chain with inorder \`[3, 2, 1]\` and a right chain with inorder \`[1, 2, 3]\` — the inorder alone decides the shape. Reading example 2: on the chain the scan made 125,250 comparisons against 500 map lookups; on the balanced tree only 2,304, because each scan range is short. The last two lines show two different trees with identical traversals.

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Index map + index ranges | O(n) | O(n) | one map lookup per node (500 for n = 500 in example 2); map is O(n), recursion O(h) |
| Linear scan of the inorder range | O(n²) worst, O(n log n) balanced | O(h) | 125,250 comparisons on the 500-node chain, 2,304 on the 511-node balanced tree |
| sub-vectors copied per call | O(n²) worst | O(n²) worst | copying sub-vectors at every level |

n is the number of nodes and h the height of the tree (the recursion depth).

## 8. Edge Cases and Variants

- **Empty arrays** — return an empty tree (\`build(0, -1)\` returns at once).
- **One node** — \`[-1]\` and \`[-1]\` give a single node; negative values are fine because the map is keyed by value.
- **Skewed trees** — \`[1, 2, 3]\` with inorder \`[3, 2, 1]\` is a left chain, with \`[1, 2, 3]\` a right chain. Recursion depth is n.
- **Duplicates** — the answer is not unique; say so and ask whether values are distinct.
- **Postorder + inorder** — the same idea mirrored: the *last* postorder value is the root, so consume postorder from the end and build the **right** subtree first.
- **Preorder + postorder** — not unique in general: a node with a single child could have it on either side and both traversals look the same.

## Common Pitfalls

- **Building right before left.** With one shared preorder index, the left subtree must be built first, because preorder lists it first.
- **\`operator[]\` on the index map.** For a missing key it inserts 0 and returns it, producing a wrong tree instead of an error; use \`at()\` or \`find()\`.
- **Passing \`pre\` by value.** Each call would get its own copy; capture it by reference (\`[&]\`) or pass \`int&\`.
- **Copying sub-vectors.** \`std::vector<int>(in.begin(), in.begin() + mid)\` at every level costs O(n) per call; pass index ranges and \`const&\`.
- **Leaking nodes.** \`new Node\` in a recursion with no owner leaks the whole tree; use \`unique_ptr\` (or a node pool) as the examples do.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">The first preorder value is the root; its position in inorder splits the rest into the left subtree (before) and right subtree (after).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursion:</strong> <span style="color:#f0e2c8;">Recurse on inorder index ranges, building left before right, while one index captured by reference walks forward through preorder.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Speed-up:</strong> <span style="color:#f0e2c8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> from value to index makes each split O(1): O(n) total instead of O(n²) — 500 lookups vs 125,250 comparisons on a 500-node chain.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Requirement:</strong> <span style="color:#f0e2c8;">Values must be distinct; with duplicates two different trees can share both traversals.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">at()</code> so a missing value throws instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> inserting 0, and pass vectors by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code> with index ranges, never copies.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you got postorder and inorder instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Take roots from the end of postorder and build the right subtree before the left; everything else is the same.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can preorder and postorder rebuild the tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not uniquely: a node with one child has the same preorder and postorder whether the child is left or right.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::function</code> for the lambda?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A lambda cannot refer to itself by name; storing it in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::function</code> lets it recurse, at the cost of an indirect call. A static helper function avoids that.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a very deep tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the iterative O(n) stack-based version with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> as the stack, since deep recursion crashes the program.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Who owns the nodes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;std::unique_ptr&lt;Node&gt;&gt;</code> in the examples; with raw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code> you must free the tree in post-order.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Preorder traversal** | Node, left, right; the first value is the root |
| **Inorder traversal** | Left, node, right; a root splits left values from right values |
| **Divide and conquer** | Split into independent smaller problems, solve, combine |
| **Index map** | Hash map from value to array position, built once in O(n) |
| **Index range (bounds) instead of slices** | Describe a sub-array by two indexes instead of copying it |
| **Unique reconstruction** | The traversals determine exactly one tree |

---
**Conclusion:** Preorder tells you which value is the root, and inorder tells you which values go to its left and to its right; recursing on the two sides — left first, while one index captured by reference walks through preorder — rebuilds the tree. With an \`unordered_map\` from value to inorder position and index ranges instead of sub-vector copies, the whole build is O(n): 500 lookups instead of 125,250 comparisons on a 500-node chain in example 2. In C++, look values up with \`at()\` rather than \`operator[]\`, and let \`unique_ptr\` own the nodes.`,
        examples: [
          {
            label: "Rebuild from preorder + inorder with an index map (6 cases)",
            code: `#include <functional>
#include <iostream>
#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

struct Node {
    int val;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int v) : val(v) {}
};

std::vector<std::unique_ptr<Node>> pool;  // owns every node, freed at exit

// Rebuild a tree with distinct values in O(n) using an index map.
Node* buildTree(const std::vector<int>& preorder, const std::vector<int>& inorder) {
    std::unordered_map<int, int> index;                 // value -> position in inorder
    for (int i = 0; i < (int)inorder.size(); i++) index[inorder[i]] = i;
    int pre = 0;                                        // next root in preorder

    std::function<Node*(int, int)> build = [&](int lo, int hi) -> Node* {
        if (lo > hi) return nullptr;                    // subtree = inorder[lo..hi]
        pool.push_back(std::make_unique<Node>(preorder[pre++]));
        Node* root = pool.back().get();
        int mid = index.at(root->val);                  // at() throws instead of inserting
        root->left = build(lo, mid - 1);                // left part first: preorder order
        root->right = build(mid + 1, hi);
        return root;
    };
    return build(0, (int)inorder.size() - 1);
}

void traverse(const Node* node, const std::string& order, std::vector<int>& out) {
    if (!node) return;
    if (order == "pre") out.push_back(node->val);
    traverse(node->left, order, out);
    if (order == "in") out.push_back(node->val);
    traverse(node->right, order, out);
    if (order == "post") out.push_back(node->val);
}

std::vector<int> walk(const Node* root, const std::string& order) {
    std::vector<int> out;
    traverse(root, order, out);
    return out;
}

std::string levelOrder(Node* root) {
    std::vector<std::string> out;
    std::vector<Node*> queue{root};
    for (size_t i = 0; i < queue.size(); i++) {
        Node* node = queue[i];
        if (!node) out.push_back("null");
        else {
            out.push_back(std::to_string(node->val));
            queue.push_back(node->left);
            queue.push_back(node->right);
        }
    }
    while (!out.empty() && out.back() == "null") out.pop_back();
    std::string s = "[";
    for (size_t i = 0; i < out.size(); i++) s += (i ? ", " : "") + out[i];
    return s + "]";
}

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

int main() {
    std::vector<std::pair<std::vector<int>, std::vector<int>>> cases{
        {{3, 9, 20, 15, 7}, {9, 3, 15, 20, 7}},
        {{1, 2, 3}, {3, 2, 1}},
        {{1, 2, 3}, {1, 2, 3}},
        {{4, 2, 1, 3, 6, 5, 7}, {1, 2, 3, 4, 5, 6, 7}},
        {{-1}, {-1}},
        {{}, {}},
    };
    std::cout << std::boolalpha;
    for (const auto& [pre, ino] : cases) {
        Node* root = buildTree(pre, ino);
        bool same = walk(root, "pre") == pre && walk(root, "in") == ino;  // vector == compares elements
        std::cout << "pre " << fmt(pre) << " in " << fmt(ino) << " -> " << levelOrder(root)
                  << ", post " << fmt(walk(root, "post")) << ", round trip " << same << "\\n";
    }
    return 0;
}`,
          },
          {
            label: "Linear scan vs hash map, and why duplicates break it",
            code: `#include <iostream>
#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

struct Node {
    int val;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int v) : val(v) {}
};

std::vector<std::unique_ptr<Node>> pool;  // owns every node, freed at exit
Node* make(int v) {
    pool.push_back(std::make_unique<Node>(v));
    return pool.back().get();
}

long long scanCount = 0, mapCount = 0;
std::vector<int> preorder, inorder;
int pre = 0;
std::unordered_map<int, int> indexOf;

// Same recursion, but find the root by scanning inorder[lo..hi]: O(n^2) worst case.
// (std::find over the range hides exactly this scan.)
Node* buildScan(int lo, int hi) {
    if (lo > hi) return nullptr;
    Node* root = make(preorder[pre++]);
    int mid = lo;
    while (true) {
        scanCount++;                       // one comparison
        if (inorder[mid] == root->val) break;
        mid++;
    }
    root->left = buildScan(lo, mid - 1);
    root->right = buildScan(mid + 1, hi);
    return root;
}

Node* buildMap(int lo, int hi) {
    if (lo > hi) return nullptr;
    Node* root = make(preorder[pre++]);
    mapCount++;                            // one unordered_map lookup
    int mid = indexOf.at(root->val);
    root->left = buildMap(lo, mid - 1);
    root->right = buildMap(mid + 1, hi);
    return root;
}

std::string levelOrder(Node* root) {
    std::vector<std::string> out;
    std::vector<Node*> queue{root};
    for (size_t i = 0; i < queue.size(); i++) {
        Node* node = queue[i];
        if (!node) out.push_back("null");
        else {
            out.push_back(std::to_string(node->val));
            queue.push_back(node->left);
            queue.push_back(node->right);
        }
    }
    while (!out.empty() && out.back() == "null") out.pop_back();
    std::string s = "[";
    for (size_t i = 0; i < out.size(); i++) s += (i ? ", " : "") + out[i];
    return s + "]";
}

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

void walk(const Node* node, std::vector<int>& p, std::vector<int>& q) {
    if (!node) return;
    p.push_back(node->val);
    walk(node->left, p, q);
    q.push_back(node->val);
    walk(node->right, p, q);
}

std::string orders(const Node* node) {
    std::vector<int> p, q;
    walk(node, p, q);
    return "pre " + fmt(p) + " in " + fmt(q);
}

void balancedPreorder(int lo, int hi, std::vector<int>& out) {
    if (lo > hi) return;
    int mid = (lo + hi) / 2;
    out.push_back(mid);
    balancedPreorder(lo, mid - 1, out);
    balancedPreorder(mid + 1, hi, out);
}

void compare(const std::string& name, const std::vector<int>& p, const std::vector<int>& in) {
    preorder = p;
    inorder = in;
    indexOf.clear();
    for (int i = 0; i < (int)in.size(); i++) indexOf[in[i]] = i;
    scanCount = mapCount = 0;
    pre = 0;
    Node* a = buildScan(0, (int)in.size() - 1);
    pre = 0;
    Node* b = buildMap(0, (int)in.size() - 1);
    std::cout << name << ", n = " << in.size() << ": scan comparisons " << scanCount << ", map lookups " << mapCount
              << ", same tree " << (levelOrder(a) == levelOrder(b)) << "\\n";
}

int main() {
    std::cout << std::boolalpha;
    const int n = 500;
    std::vector<int> up, down;
    for (int i = 0; i < n; i++) { up.push_back(i + 1); down.push_back(n - i); }
    compare("left chain", up, down);
    std::vector<int> bp, sorted;
    balancedPreorder(1, 511, bp);
    for (int v = 1; v <= 511; v++) sorted.push_back(v);
    compare("balanced", bp, sorted);

    // Duplicates: two different shapes, identical traversals.
    Node* a = make(1);
    a->left = make(1);
    Node* b = make(1);
    b->right = make(1);
    std::cout << "duplicates: " << levelOrder(a) << " has " << orders(a) << "\\n";
    std::cout << "duplicates: " << levelOrder(b) << " has " << orders(b) << "\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you serialize and deserialize a binary tree?",
    difficulty: "hard",
    seoDescription: "Serialize a binary tree with preorder and null markers (or BFS level order) and rebuild it exactly. Verified Python, JavaScript, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Design two Python functions: \`serialize\`, which turns a binary tree into a string, and \`deserialize\`, which turns that string back into an identical tree. The format is up to you, but the round trip must be exact for any tree."

**What a strong answer should cover:**
- Why a plain traversal is not enough: different shapes can share the same preorder, so missing children must be recorded with a null marker.
- Preorder with null markers: serialize recursively; deserialize by consuming tokens in the same order with one moving position. O(n) time and space.
- The level-order (BFS) alternative used by LeetCode: a queue, \`null\` for gaps, trailing nulls trimmed; deserialize by reading two tokens per parent.
- A delimiter between tokens so negative and multi-digit values parse correctly.
- Trade-offs: string size of each format, recursion depth versus an iterative queue.
- Python specifics: build a list and \`",".join\` it, consume tokens with \`iter()\` + \`next()\`, use \`collections.deque\` (not \`list.pop(0)\`) for BFS, and remember recursion depth on deep trees.

**Clarifying questions expected:**
- What values can nodes hold (negative numbers, very large numbers, strings)?
- Does the format need to be human-readable or compatible with anything else?

**Code / implementation expected:** Yes — preorder \`serialize\` / \`deserialize\` (and optionally the BFS version), in Python 3.`,
        answer: `**Target Audience:** Intermediate interview candidates — you should know binary trees, recursion and BFS with a queue.  
**Difficulty:** Hard  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You built a model out of building blocks and want to send it to a friend in another city — but you can only send a text message. You could describe it block by block: "red block; on its left a blue block; nothing on the blue block's left; nothing on its right; on the red block's right a green block...". If you ever forget to say "nothing here", your friend cannot tell whether the next block belongs on the left or the right, and they build a different model.

That is serialization. A tree lives in memory as nodes pointing at each other; to save it to a file, send it over a network or cache it, you must flatten it into a string (**serialize**) and later rebuild exactly the same shape from that string (**deserialize**). The key insight is the "nothing here" part: record the missing children, and one traversal is enough to rebuild the tree. This is a "hard" interview question not because the code is long, but because you have to design a format, argue it is unambiguous, and handle the edge cases (empty tree, negative numbers, deep trees) without being told.

📌 **Interview term: Serialization** — converting an in-memory structure into a flat sequence of characters or bytes that can be stored or sent.

📌 **Interview term: Deserialization** — the reverse: rebuilding the identical in-memory structure from that sequence.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What values can a node hold — negative, multi-digit, strings? | Decides the delimiter and the parsing. With strings, the delimiter itself could appear in a value and would need escaping. |
| Must the format match something (LeetCode's \`[1,2,null,3]\`, JSON)? | Otherwise you are free to pick the simplest correct format. |
| Is the tree a BST? | A BST can be serialized as plain preorder without null markers, because the values themselves tell where each subtree ends. |
| How large and how deep can the tree be? | Recursive serialization uses one stack frame per level; a very deep tree may need the iterative BFS version. |
| Does size matter (bytes over a network)? | Then compare formats, or switch to a binary encoding. |

## 3. Why a Plain Traversal Is Not Enough

Write down only the values in preorder and two different trees produce the same string:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="Tree with root 1 and left child 2. Its preorder without markers is 1, 2">
  <path class="d-edge" d="M 184 76 L 136 124"/>
  <circle class="d-box-muted" cx="200" cy="60" r="22"/>
  <text class="d-text" x="200" y="66" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="120" cy="140" r="22"/>
  <text class="d-text" x="120" y="146" text-anchor="middle">2</text>
  <text class="d-text" x="400" y="90" text-anchor="start">2 is the left child</text>
  <text class="d-sub" x="400" y="116" text-anchor="start">preorder: 1, 2</text>
</svg>

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="Tree with root 1 and right child 2. Its preorder without markers is also 1, 2">
  <path class="d-edge" d="M 216 76 L 264 124"/>
  <circle class="d-box-muted" cx="200" cy="60" r="22"/>
  <text class="d-text" x="200" y="66" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="280" cy="140" r="22"/>
  <text class="d-text" x="280" y="146" text-anchor="middle">2</text>
  <text class="d-text" x="400" y="90" text-anchor="start">2 is the right child</text>
  <text class="d-sub" x="400" y="116" text-anchor="start">preorder: 1, 2</text>
</svg>

Both print \`1,2\`; the string has lost which side 2 was on. Example 2 shows exactly this, and then shows that adding markers fixes it: the first tree becomes \`1,2,#,#,#\` and the second \`1,#,2,#,#\`.

📌 **Interview term: Null marker (sentinel token)** — a token such as \`#\` or \`null\` written wherever a child is missing. It records the shape, not just the values.

📌 **Interview term: Delimiter** — a separator between tokens (here a comma). Without it, \`1\` \`23\` and \`12\` \`3\` would both read as \`123\`.

## 4. Approach 1 — Preorder With Null Markers

**Serialize:** do a preorder traversal (node, left, right). Write the node's value; for a missing child write \`#\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 290" role="img" aria-label="Tree 1 with children 2 and 3; 3 has children 4 and 5. Every missing child is drawn as a hash marker">
  <path class="d-edge" d="M 301 60 L 209 110"/>
  <path class="d-edge" d="M 339 60 L 431 110"/>
  <path class="d-edge-dashed" d="M 176 137 L 139 184"/>
  <path class="d-edge-dashed" d="M 204 137 L 241 184"/>
  <path class="d-edge" d="M 436 137 L 404 173"/>
  <path class="d-edge" d="M 464 137 L 496 173"/>
  <path class="d-edge-dashed" d="M 379 209 L 357 248"/>
  <path class="d-edge-dashed" d="M 401 209 L 423 248"/>
  <path class="d-edge-dashed" d="M 499 209 L 477 248"/>
  <path class="d-edge-dashed" d="M 521 209 L 543 248"/>
  <circle class="d-box-accent" cx="320" cy="50" r="22"/>
  <text class="d-text" x="320" y="56" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="190" cy="120" r="22"/>
  <text class="d-text" x="190" y="126" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="450" cy="120" r="22"/>
  <text class="d-text" x="450" y="126" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="130" cy="195" r="14"/>
  <text class="d-text" x="130" y="201" text-anchor="middle">#</text>
  <circle class="d-box-muted" cx="250" cy="195" r="14"/>
  <text class="d-text" x="250" y="201" text-anchor="middle">#</text>
  <circle class="d-box-accent" cx="390" cy="190" r="22"/>
  <text class="d-text" x="390" y="196" text-anchor="middle">4</text>
  <circle class="d-box-accent" cx="510" cy="190" r="22"/>
  <text class="d-text" x="510" y="196" text-anchor="middle">5</text>
  <circle class="d-box-muted" cx="350" cy="260" r="14"/>
  <text class="d-text" x="350" y="266" text-anchor="middle">#</text>
  <circle class="d-box-muted" cx="430" cy="260" r="14"/>
  <text class="d-text" x="430" y="266" text-anchor="middle">#</text>
  <circle class="d-box-muted" cx="470" cy="260" r="14"/>
  <text class="d-text" x="470" y="266" text-anchor="middle">#</text>
  <circle class="d-box-muted" cx="550" cy="260" r="14"/>
  <text class="d-text" x="550" y="266" text-anchor="middle">#</text>
</svg>

Reading it in preorder gives the token stream below — the string is \`1,2,#,#,3,4,#,#,5,#,#\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 150" role="img" aria-label="Token stream 1, 2, hash, hash, 3, 4, hash, hash, 5, hash, hash">
  <rect class="d-box-accent" x="20" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="45" y="81" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="75" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="100" y="81" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="130" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="155" y="81" text-anchor="middle">#</text>
  <rect class="d-box-muted" x="185" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="210" y="81" text-anchor="middle">#</text>
  <rect class="d-box-accent" x="240" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="265" y="81" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="295" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="320" y="81" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="350" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="375" y="81" text-anchor="middle">#</text>
  <rect class="d-box-muted" x="405" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="430" y="81" text-anchor="middle">#</text>
  <rect class="d-box-accent" x="460" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="485" y="81" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="515" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="540" y="81" text-anchor="middle">#</text>
  <rect class="d-box-muted" x="570" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="595" y="81" text-anchor="middle">#</text>
  <text class="d-text" x="320" y="30" text-anchor="middle">Preorder tokens, read left to right</text>
  <text class="d-sub" x="45" y="128" text-anchor="middle">first</text>
  <text class="d-sub" x="595" y="128" text-anchor="middle">last</text>
</svg>

**Deserialize:** read the tokens in the same order with one moving position. Each call to \`build()\` takes the next token: if it is \`#\`, return an empty child; otherwise create a node, then call \`build()\` for its left child and then for its right child. Because the reader consumes tokens in exactly the order the writer produced them, every node gets back its own children.

**Why it is unambiguous.** In preorder with markers, every subtree is written as "value, left subtree, right subtree", and an empty subtree is exactly one \`#\`. So the reader always knows where the left subtree ends: when its recursive call returns. A tree with n nodes has n + 1 missing children, so the string always has 2n + 1 tokens (11 tokens for the 5 nodes above).

📌 **Interview term: Preorder serialization** — writing node, left subtree, right subtree, with a marker for every empty child. It can be rebuilt by reading the tokens back in the same order.

📌 **Interview term: Round trip** — serialize then deserialize (or the reverse) and get exactly what you started with. The standard test: \`serialize(deserialize(s)) == s\`.

## 5. Approach 2 — Level Order (BFS), the LeetCode Format

LeetCode writes trees level by level: \`[1,2,3,null,null,4,5]\`. [Breadth-first traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree) with a queue produces it: pop a node, write its value (or \`null\`), and push both its children, even when they are missing. Trailing \`null\`s carry no information and are trimmed.

To rebuild, create the root from the first token and put it in a queue. Then, for each parent taken from the queue, the next two tokens are its left and right child; every real child created goes into the queue to receive its own two tokens later.

📌 **Interview term: Level-order (BFS) serialization** — writing the tree level by level with a queue, marking missing children, usually trimming trailing markers. It is rebuilt with a queue, two tokens per parent.

**Which one to choose?** Both are O(n) time and O(n) space. Preorder is the shortest code and the easiest to argue correct. BFS is iterative on both sides, so a very deep tree cannot overflow the call stack, and it is the format most people recognise. The string sizes depend on the shape: in example 2 a 6-node right chain took 38 characters in BFS and 25 in preorder, while a 7-node full tree took 15 in BFS (no trailing nulls) and 29 in preorder (8 \`#\` markers).

## 6. The Code in Python

Preorder serialization from example 1:

~~~python
def serialize(root):
    """Preorder with '#' for every missing child, joined by commas."""
    out = []

    def walk(node):
        if node is None:
            out.append("#")
            return
        out.append(str(node.val))
        walk(node.left)
        walk(node.right)

    walk(root)
    return ",".join(out)          # one join at the end


def deserialize(data):
    """Replay the same preorder, consuming one token per call."""
    tokens = iter(data.split(","))

    def build():
        tok = next(tokens)
        if tok == "#":
            return None
        node = Node(int(tok))     # int() handles '-10' and multi-digit values
        node.left = build()
        node.right = build()
        return node

    return build()
~~~

**What to point out in this code:**

- Tokens go into a list and are joined once with \`",".join(out)\` — the idiomatic way to build a string from many pieces.
- \`iter(data.split(","))\` turns the token list into an iterator, and \`next(tokens)\` hands out one token per call. That replaces a shared index variable (and the \`nonlocal\` it would need).
- \`int(tok)\` parses \`"-10"\` and \`"200"\` alike; the comma delimiter is what keeps multi-digit and negative values intact.
- Both functions recurse once per level. On a tree deeper than about 1000 levels, Python's default recursion limit raises \`RecursionError\`; the BFS version below has no recursion at all.

The BFS version from example 2 uses \`collections.deque\`, whose \`popleft()\` is O(1); \`list.pop(0)\` shifts every remaining element:

~~~python
def serialize_bfs(root):
    """Level order with 'null' gaps, trailing nulls trimmed: '[1,2,3,null,null,4,5]'."""
    out, queue = [], deque([root])
    while queue:
        node = queue.popleft()            # deque.popleft is O(1); list.pop(0) is O(n)
        if node is None:
            out.append("null")
        else:
            out.append(str(node.val))
            queue.append(node.left)
            queue.append(node.right)
    while out and out[-1] == "null":
        out.pop()
    return "[" + ",".join(out) + "]"


def deserialize_bfs(data):
    """Read tokens two at a time: the left and right child of the next parent."""
    body = data[1:-1]
    if body == "":
        return None
    tokens = body.split(",")
    root = Node(int(tokens[0]))
    queue, i = deque([root]), 1
    while queue and i < len(tokens):
        parent = queue.popleft()
        if tokens[i] != "null":
            parent.left = Node(int(tokens[i]))
            queue.append(parent.left)
        i += 1
        if i < len(tokens) and tokens[i] != "null":
            parent.right = Node(int(tokens[i]))
            queue.append(parent.right)
        i += 1
    return root
~~~

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — preorder serialize, deserialize, and check the round trip on five trees** prints:

~~~text
"1,2,#,#,3,4,#,#,5,#,#" round trip true, re-serialized equal true
"#" round trip true, re-serialized equal true
"-10,200,#,#,#" round trip true, re-serialized equal true
"1,#,2,#,3,#,#" round trip true, re-serialized equal true
"7,#,#" round trip true, re-serialized equal true
~~~

**Example 2 — the BFS (LeetCode) format, format sizes, and why null markers are needed** prints:

~~~text
[1,2,3,null,null,4,5] -> preorder 1,2,#,#,3,4,#,#,5,#,# -> back [1,2,3,null,null,4,5], equal true
[] -> preorder # -> back [], equal true
[5,4,null,3,null,2] -> preorder 5,4,3,2,#,#,#,#,# -> back [5,4,null,3,null,2], equal true
[1,null,2,null,3] -> preorder 1,#,2,#,3,#,# -> back [1,null,2,null,3], equal true
6-node right chain: BFS 38 chars, preorder 25 chars
7-node full tree: BFS 15 chars, preorder 29 chars
without markers: [1,2] -> 1,2 and [1,null,2] -> 1,2
with markers:    [1,2] -> 1,2,#,#,# and [1,null,2] -> 1,#,2,#,#
~~~

Reading example 1: every string rebuilds the same tree, and re-serializing gives the identical string. The empty tree is the single token \`#\`, and \`-10,200,#,#,#\` shows that negative and multi-digit values survive thanks to the delimiter. Reading example 2: the BFS strings round-trip exactly, each tree's preorder form is printed alongside, and the last two lines show the ambiguity of a plain traversal (\`1,2\` for both trees) disappearing once markers are added.

## 8. Complexity

| Operation | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Preorder serialize | O(n) | O(n) output + O(h) stack | each node and each of the n + 1 empty children written once |
| Preorder deserialize | O(n) | O(n) tokens + O(h) stack | each of the 2n + 1 tokens read once |
| BFS serialize | O(n) | O(n) | each node enqueued and dequeued once |
| BFS deserialize | O(n) | O(n) | two tokens per parent, each read once |

n is the number of nodes and h the height. Recursion uses O(h) stack frames for the preorder version; the deque-based BFS version uses no recursion.

## 9. Edge Cases and Variants

- **Empty tree** — preorder gives \`#\`, BFS gives \`[]\`; both must deserialize back to an empty tree (example 1 and 2).
- **Negative and multi-digit values** — handled by the delimiter and a real integer parse (\`-10,200,#,#,#\`).
- **Skewed trees** — \`[1,null,2,null,3]\` round-trips in both formats; very deep chains are where recursion limits bite.
- **Values that contain the delimiter** — for string values, escape the delimiter or write a length prefix before each value.
- **BST variant** — a [BST](/interview-question/what-is-a-binary-search-tree-bst) can be serialized as plain preorder with no markers: while deserializing, pass down the allowed (low, high) range, exactly as in [validating a BST](/interview-question/how-do-you-validate-that-a-binary-tree-is-a-bst), and a value outside the range means "this subtree is finished".
- **Rebuilding from two traversals** — without markers you need two traversals, as in [building a tree from preorder and inorder](/interview-question/how-do-you-build-a-binary-tree-from-preorder-and-inorder-traversals); markers make one traversal enough.

## Common Pitfalls

- **No null markers.** Plain preorder \`1,2\` fits two different trees; record every missing child.
- **No delimiter.** Concatenating digits (\`"123"\`) cannot be split back into \`1, 23\` or \`12, 3\`.
- **A shared index without \`nonlocal\`.** Incrementing an outer \`i\` inside a nested function raises \`UnboundLocalError\`; \`iter()\` + \`next()\` avoids the problem.
- **\`list.pop(0)\` as a queue.** It shifts every remaining element; use \`collections.deque.popleft()\`.
- **Recursion depth.** The preorder versions recurse once per level and fail on chains deeper than about 1000 nodes by default.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key insight:</strong> <span style="color:#f0e2c8;">A traversal of values alone is ambiguous; writing a marker like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> for every missing child makes one preorder traversal enough.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Serialize:</strong> <span style="color:#f0e2c8;">Preorder: append the value or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> to a list, recurse left then right, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">",".join</code> once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Deserialize:</strong> <span style="color:#f0e2c8;">Split on commas, wrap in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iter()</code>, and let each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">build()</code> call take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next(tokens)</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> means None, else a node whose left and right are built next.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time and O(n) space both ways; a tree of n nodes gives 2n + 1 tokens.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Alternative:</strong> <span style="color:#f0e2c8;">Level-order with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deque</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> gaps is the LeetCode format and needs no recursion, which matters for very deep trees.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need the null markers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without them, a root with only a left child and a root with only a right child both serialize to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1,2</code>; the markers record which side each subtree is on.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a tree deeper than the recursion limit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the BFS format, which is iterative on both sides, or an explicit-stack preorder; raising <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.setrecursionlimit</code> is a last resort.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you make the string smaller?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Trim trailing markers in BFS, use shorter tokens, or for a BST drop markers entirely and rebuild with value ranges.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the values are strings with commas?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Escape the delimiter, or write each value with a length prefix like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">5:hello</code> so no delimiter is needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Round trips: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">serialize(deserialize(s)) == s</code> and a structural comparison of the original and rebuilt trees, including the empty tree and negative values.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Serialization** | Turning an in-memory structure into a flat string or byte sequence |
| **Deserialization** | Rebuilding the identical structure from that sequence |
| **Null marker (sentinel token)** | A token such as # or null written for every missing child |
| **Delimiter** | A separator between tokens, here a comma |
| **Preorder serialization** | Node, left, right, with markers; rebuilt by reading tokens in order |
| **Round trip** | serialize then deserialize gives back exactly the original |
| **Level-order (BFS) serialization** | Level by level with a queue; two tokens per parent when rebuilding |

---
**Conclusion:** To serialize a binary tree, walk it in preorder and write every value — and a \`#\` for every missing child — separated by commas; to deserialize, read the tokens back in the same order with \`iter()\` and \`next()\`, building left before right. The markers are what make one traversal unambiguous: without them \`1,2\` describes two different trees. Both directions are O(n), every round trip in our runs was exact, and for very deep trees the \`deque\`-based level-order format avoids Python's recursion limit.`,
        examples: [
          {
            label: "Preorder with # markers: serialize, deserialize, round trip",
            code: `class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def serialize(root):
    """Preorder with '#' for every missing child, joined by commas."""
    out = []

    def walk(node):
        if node is None:
            out.append("#")
            return
        out.append(str(node.val))
        walk(node.left)
        walk(node.right)

    walk(root)
    return ",".join(out)          # one join at the end


def deserialize(data):
    """Replay the same preorder, consuming one token per call."""
    tokens = iter(data.split(","))

    def build():
        tok = next(tokens)
        if tok == "#":
            return None
        node = Node(int(tok))     # int() handles '-10' and multi-digit values
        node.left = build()
        node.right = build()
        return node

    return build()


def from_level(values):
    """Level-order list with None for gaps -> tree (test helper)."""
    if not values:
        return None
    root = Node(values[0])
    queue, q, i = [root], 0, 1
    while q < len(queue) and i < len(values):
        node = queue[q]
        q += 1
        if i < len(values) and values[i] is not None:
            node.left = Node(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = Node(values[i])
            queue.append(node.right)
        i += 1
    return root


def same(a, b):
    if a is None or b is None:
        return a is b
    return a.val == b.val and same(a.left, b.left) and same(a.right, b.right)


tests = [
    [1, 2, 3, None, None, 4, 5],
    [],
    [-10, 200],
    [1, None, 2, None, 3],
    [7],
]
for values in tests:
    root = from_level(values)
    s = serialize(root)
    back = deserialize(s)
    print('"' + s + '" round trip ' + str(same(root, back)).lower() + ", re-serialized equal " + str(serialize(back) == s).lower())`,
          },
          {
            label: "LeetCode BFS format, format sizes, and the ambiguity of no markers",
            code: `from collections import deque


class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def serialize_bfs(root):
    """Level order with 'null' gaps, trailing nulls trimmed: '[1,2,3,null,null,4,5]'."""
    out, queue = [], deque([root])
    while queue:
        node = queue.popleft()            # deque.popleft is O(1); list.pop(0) is O(n)
        if node is None:
            out.append("null")
        else:
            out.append(str(node.val))
            queue.append(node.left)
            queue.append(node.right)
    while out and out[-1] == "null":
        out.pop()
    return "[" + ",".join(out) + "]"


def deserialize_bfs(data):
    """Read tokens two at a time: the left and right child of the next parent."""
    body = data[1:-1]
    if body == "":
        return None
    tokens = body.split(",")
    root = Node(int(tokens[0]))
    queue, i = deque([root]), 1
    while queue and i < len(tokens):
        parent = queue.popleft()
        if tokens[i] != "null":
            parent.left = Node(int(tokens[i]))
            queue.append(parent.left)
        i += 1
        if i < len(tokens) and tokens[i] != "null":
            parent.right = Node(int(tokens[i]))
            queue.append(parent.right)
        i += 1
    return root


def serialize_pre(node):
    if node is None:
        return "#"
    return str(node.val) + "," + serialize_pre(node.left) + "," + serialize_pre(node.right)


def preorder_values(node, out):
    """Preorder WITHOUT null markers (to show why markers are needed)."""
    if node is not None:
        out.append(str(node.val))
        preorder_values(node.left, out)
        preorder_values(node.right, out)
    return ",".join(out)


for data in ["[1,2,3,null,null,4,5]", "[]", "[5,4,null,3,null,2]", "[1,null,2,null,3]"]:
    root = deserialize_bfs(data)
    again = serialize_bfs(root)
    print(data + " -> preorder " + serialize_pre(root) + " -> back " + again + ", equal " + str(again == data).lower())

chain = deserialize_bfs("[1,null,2,null,3,null,4,null,5,null,6]")
full = deserialize_bfs("[1,2,3,4,5,6,7]")
for name, t in [("6-node right chain", chain), ("7-node full tree", full)]:
    print(name + ": BFS " + str(len(serialize_bfs(t))) + " chars, preorder " + str(len(serialize_pre(t))) + " chars")

a = deserialize_bfs("[1,2]")
b = deserialize_bfs("[1,null,2]")
print("without markers: [1,2] -> " + preorder_values(a, []) + " and [1,null,2] -> " + preorder_values(b, []))
print("with markers:    [1,2] -> " + serialize_pre(a) + " and [1,null,2] -> " + serialize_pre(b))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Design two JavaScript functions: \`serialize\`, which turns a binary tree into a string, and \`deserialize\`, which turns that string back into an identical tree. The format is up to you, but the round trip must be exact for any tree."

**What a strong answer should cover:**
- Why a plain traversal is not enough: different shapes can share the same preorder, so missing children must be recorded with a null marker.
- Preorder with null markers: serialize recursively; deserialize by consuming tokens in the same order with one moving position. O(n) time and space.
- The level-order (BFS) alternative used by LeetCode: a queue, \`null\` for gaps, trailing nulls trimmed; deserialize by reading two tokens per parent.
- A delimiter between tokens so negative and multi-digit values parse correctly.
- Trade-offs: string size of each format, recursion depth versus an iterative queue.
- JavaScript specifics: \`join\` / \`split\`, \`Number(token)\` rather than \`parseInt\` (and why \`Number('')\` silently gives 0), and a head index instead of \`queue.shift()\`.

**Clarifying questions expected:**
- What values can nodes hold (negative numbers, very large numbers, strings)?
- Does the format need to be human-readable or compatible with anything else?

**Code / implementation expected:** Yes — preorder \`serialize\` / \`deserialize\` (and optionally the BFS version), in JavaScript.`,
        answer: `**Target Audience:** Intermediate interview candidates — you should know binary trees, recursion and BFS with a queue.  
**Difficulty:** Hard  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You built a model out of building blocks and want to send it to a friend in another city — but you can only send a text message. You could describe it block by block: "red block; on its left a blue block; nothing on the blue block's left; nothing on its right; on the red block's right a green block...". If you ever forget to say "nothing here", your friend cannot tell whether the next block belongs on the left or the right, and they build a different model.

That is serialization. A tree lives in memory as nodes pointing at each other; to save it to a file, send it over a network or cache it, you must flatten it into a string (**serialize**) and later rebuild exactly the same shape from that string (**deserialize**). The key insight is the "nothing here" part: record the missing children, and one traversal is enough to rebuild the tree. This is a "hard" interview question not because the code is long, but because you have to design a format, argue it is unambiguous, and handle the edge cases (empty tree, negative numbers, deep trees) without being told.

📌 **Interview term: Serialization** — converting an in-memory structure into a flat sequence of characters or bytes that can be stored or sent.

📌 **Interview term: Deserialization** — the reverse: rebuilding the identical in-memory structure from that sequence.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What values can a node hold — negative, multi-digit, strings? | Decides the delimiter and the parsing. With strings, the delimiter itself could appear in a value and would need escaping. |
| Must the format match something (LeetCode's \`[1,2,null,3]\`, JSON)? | Otherwise you are free to pick the simplest correct format. |
| Is the tree a BST? | A BST can be serialized as plain preorder without null markers, because the values themselves tell where each subtree ends. |
| How large and how deep can the tree be? | Recursive serialization uses one stack frame per level; a very deep tree may need the iterative BFS version. |
| Does size matter (bytes over a network)? | Then compare formats, or switch to a binary encoding. |

## 3. Why a Plain Traversal Is Not Enough

Write down only the values in preorder and two different trees produce the same string:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="Tree with root 1 and left child 2. Its preorder without markers is 1, 2">
  <path class="d-edge" d="M 184 76 L 136 124"/>
  <circle class="d-box-muted" cx="200" cy="60" r="22"/>
  <text class="d-text" x="200" y="66" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="120" cy="140" r="22"/>
  <text class="d-text" x="120" y="146" text-anchor="middle">2</text>
  <text class="d-text" x="400" y="90" text-anchor="start">2 is the left child</text>
  <text class="d-sub" x="400" y="116" text-anchor="start">preorder: 1, 2</text>
</svg>

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="Tree with root 1 and right child 2. Its preorder without markers is also 1, 2">
  <path class="d-edge" d="M 216 76 L 264 124"/>
  <circle class="d-box-muted" cx="200" cy="60" r="22"/>
  <text class="d-text" x="200" y="66" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="280" cy="140" r="22"/>
  <text class="d-text" x="280" y="146" text-anchor="middle">2</text>
  <text class="d-text" x="400" y="90" text-anchor="start">2 is the right child</text>
  <text class="d-sub" x="400" y="116" text-anchor="start">preorder: 1, 2</text>
</svg>

Both print \`1,2\`; the string has lost which side 2 was on. Example 2 shows exactly this, and then shows that adding markers fixes it: the first tree becomes \`1,2,#,#,#\` and the second \`1,#,2,#,#\`.

📌 **Interview term: Null marker (sentinel token)** — a token such as \`#\` or \`null\` written wherever a child is missing. It records the shape, not just the values.

📌 **Interview term: Delimiter** — a separator between tokens (here a comma). Without it, \`1\` \`23\` and \`12\` \`3\` would both read as \`123\`.

## 4. Approach 1 — Preorder With Null Markers

**Serialize:** do a preorder traversal (node, left, right). Write the node's value; for a missing child write \`#\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 290" role="img" aria-label="Tree 1 with children 2 and 3; 3 has children 4 and 5. Every missing child is drawn as a hash marker">
  <path class="d-edge" d="M 301 60 L 209 110"/>
  <path class="d-edge" d="M 339 60 L 431 110"/>
  <path class="d-edge-dashed" d="M 176 137 L 139 184"/>
  <path class="d-edge-dashed" d="M 204 137 L 241 184"/>
  <path class="d-edge" d="M 436 137 L 404 173"/>
  <path class="d-edge" d="M 464 137 L 496 173"/>
  <path class="d-edge-dashed" d="M 379 209 L 357 248"/>
  <path class="d-edge-dashed" d="M 401 209 L 423 248"/>
  <path class="d-edge-dashed" d="M 499 209 L 477 248"/>
  <path class="d-edge-dashed" d="M 521 209 L 543 248"/>
  <circle class="d-box-accent" cx="320" cy="50" r="22"/>
  <text class="d-text" x="320" y="56" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="190" cy="120" r="22"/>
  <text class="d-text" x="190" y="126" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="450" cy="120" r="22"/>
  <text class="d-text" x="450" y="126" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="130" cy="195" r="14"/>
  <text class="d-text" x="130" y="201" text-anchor="middle">#</text>
  <circle class="d-box-muted" cx="250" cy="195" r="14"/>
  <text class="d-text" x="250" y="201" text-anchor="middle">#</text>
  <circle class="d-box-accent" cx="390" cy="190" r="22"/>
  <text class="d-text" x="390" y="196" text-anchor="middle">4</text>
  <circle class="d-box-accent" cx="510" cy="190" r="22"/>
  <text class="d-text" x="510" y="196" text-anchor="middle">5</text>
  <circle class="d-box-muted" cx="350" cy="260" r="14"/>
  <text class="d-text" x="350" y="266" text-anchor="middle">#</text>
  <circle class="d-box-muted" cx="430" cy="260" r="14"/>
  <text class="d-text" x="430" y="266" text-anchor="middle">#</text>
  <circle class="d-box-muted" cx="470" cy="260" r="14"/>
  <text class="d-text" x="470" y="266" text-anchor="middle">#</text>
  <circle class="d-box-muted" cx="550" cy="260" r="14"/>
  <text class="d-text" x="550" y="266" text-anchor="middle">#</text>
</svg>

Reading it in preorder gives the token stream below — the string is \`1,2,#,#,3,4,#,#,5,#,#\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 150" role="img" aria-label="Token stream 1, 2, hash, hash, 3, 4, hash, hash, 5, hash, hash">
  <rect class="d-box-accent" x="20" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="45" y="81" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="75" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="100" y="81" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="130" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="155" y="81" text-anchor="middle">#</text>
  <rect class="d-box-muted" x="185" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="210" y="81" text-anchor="middle">#</text>
  <rect class="d-box-accent" x="240" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="265" y="81" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="295" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="320" y="81" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="350" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="375" y="81" text-anchor="middle">#</text>
  <rect class="d-box-muted" x="405" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="430" y="81" text-anchor="middle">#</text>
  <rect class="d-box-accent" x="460" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="485" y="81" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="515" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="540" y="81" text-anchor="middle">#</text>
  <rect class="d-box-muted" x="570" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="595" y="81" text-anchor="middle">#</text>
  <text class="d-text" x="320" y="30" text-anchor="middle">Preorder tokens, read left to right</text>
  <text class="d-sub" x="45" y="128" text-anchor="middle">first</text>
  <text class="d-sub" x="595" y="128" text-anchor="middle">last</text>
</svg>

**Deserialize:** read the tokens in the same order with one moving position. Each call to \`build()\` takes the next token: if it is \`#\`, return an empty child; otherwise create a node, then call \`build()\` for its left child and then for its right child. Because the reader consumes tokens in exactly the order the writer produced them, every node gets back its own children.

**Why it is unambiguous.** In preorder with markers, every subtree is written as "value, left subtree, right subtree", and an empty subtree is exactly one \`#\`. So the reader always knows where the left subtree ends: when its recursive call returns. A tree with n nodes has n + 1 missing children, so the string always has 2n + 1 tokens (11 tokens for the 5 nodes above).

📌 **Interview term: Preorder serialization** — writing node, left subtree, right subtree, with a marker for every empty child. It can be rebuilt by reading the tokens back in the same order.

📌 **Interview term: Round trip** — serialize then deserialize (or the reverse) and get exactly what you started with. The standard test: \`serialize(deserialize(s)) == s\`.

## 5. Approach 2 — Level Order (BFS), the LeetCode Format

LeetCode writes trees level by level: \`[1,2,3,null,null,4,5]\`. [Breadth-first traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree) with a queue produces it: pop a node, write its value (or \`null\`), and push both its children, even when they are missing. Trailing \`null\`s carry no information and are trimmed.

To rebuild, create the root from the first token and put it in a queue. Then, for each parent taken from the queue, the next two tokens are its left and right child; every real child created goes into the queue to receive its own two tokens later.

📌 **Interview term: Level-order (BFS) serialization** — writing the tree level by level with a queue, marking missing children, usually trimming trailing markers. It is rebuilt with a queue, two tokens per parent.

**Which one to choose?** Both are O(n) time and O(n) space. Preorder is the shortest code and the easiest to argue correct. BFS is iterative on both sides, so a very deep tree cannot overflow the call stack, and it is the format most people recognise. The string sizes depend on the shape: in example 2 a 6-node right chain took 38 characters in BFS and 25 in preorder, while a 7-node full tree took 15 in BFS (no trailing nulls) and 29 in preorder (8 \`#\` markers).

## 6. The Code in JavaScript

Preorder serialization from example 1:

~~~javascript
// Preorder with '#' for every missing child, joined by commas.
function serialize(root) {
  const out = [];
  const walk = (node) => {
    if (node === null) { out.push("#"); return; }
    out.push(String(node.val));
    walk(node.left);
    walk(node.right);
  };
  walk(root);
  return out.join(",");
}

// Replay the same preorder, consuming one token per call.
function deserialize(data) {
  const tokens = data.split(",");
  let i = 0;
  const build = () => {
    const tok = tokens[i++];
    if (tok === "#") return null;
    const node = new Node(Number(tok));   // Number('-10') is -10; parseInt('1e3') would be 1
    node.left = build();
    node.right = build();
    return node;
  };
  return build();
}
~~~

**What to point out in this code:**

- Tokens go into an array and are joined once with \`out.join(",")\`; \`data.split(",")\` reverses it.
- \`tokens[i++]\` reads the current token and advances the shared position; the closure keeps \`i\` private to one \`deserialize\` call.
- \`Number(tok)\` parses \`"-10"\` and \`"200"\`. Two traps we checked in Node.js: \`parseInt("1e3")\` returns 1 (it stops at the first non-digit) while \`Number("1e3")\` returns 1000, and \`Number("")\` returns 0 — so an empty token from a stray comma silently becomes a node with value 0 instead of an error.
- Both functions recurse once per level; very deep trees throw \`RangeError: Maximum call stack size exceeded\`. The BFS version below is iterative.

The BFS version from example 2 walks the queue with a \`head\` index instead of \`queue.shift()\`. In our Node.js 22 run, emptying a 200,000-element array with \`shift()\` took about 3.2 seconds, while advancing an index took under a millisecond:

~~~javascript
// Level order with 'null' gaps, trailing nulls trimmed: '[1,2,3,null,null,4,5]'.
function serializeBfs(root) {
  const out = [];
  const queue = [root];
  for (let head = 0; head < queue.length; head++) {   // a head index: queue.shift() re-indexes the array
    const node = queue[head];
    if (node === null) out.push("null");
    else {
      out.push(String(node.val));
      queue.push(node.left, node.right);
    }
  }
  while (out.length > 0 && out[out.length - 1] === "null") out.pop();
  return "[" + out.join(",") + "]";
}

// Read tokens two at a time: the left and right child of the next parent.
function deserializeBfs(data) {
  const body = data.slice(1, -1);
  if (body === "") return null;
  const tokens = body.split(",");
  const root = new Node(Number(tokens[0]));
  const queue = [root];
  let head = 0;
  let i = 1;
  while (head < queue.length && i < tokens.length) {
    const parent = queue[head++];
    if (tokens[i] !== "null") queue.push((parent.left = new Node(Number(tokens[i]))));
    i++;
    if (i < tokens.length && tokens[i] !== "null") queue.push((parent.right = new Node(Number(tokens[i]))));
    i++;
  }
  return root;
}
~~~

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — preorder serialize, deserialize, and check the round trip on five trees** prints:

~~~text
"1,2,#,#,3,4,#,#,5,#,#" round trip true, re-serialized equal true
"#" round trip true, re-serialized equal true
"-10,200,#,#,#" round trip true, re-serialized equal true
"1,#,2,#,3,#,#" round trip true, re-serialized equal true
"7,#,#" round trip true, re-serialized equal true
~~~

**Example 2 — the BFS (LeetCode) format, format sizes, and why null markers are needed** prints:

~~~text
[1,2,3,null,null,4,5] -> preorder 1,2,#,#,3,4,#,#,5,#,# -> back [1,2,3,null,null,4,5], equal true
[] -> preorder # -> back [], equal true
[5,4,null,3,null,2] -> preorder 5,4,3,2,#,#,#,#,# -> back [5,4,null,3,null,2], equal true
[1,null,2,null,3] -> preorder 1,#,2,#,3,#,# -> back [1,null,2,null,3], equal true
6-node right chain: BFS 38 chars, preorder 25 chars
7-node full tree: BFS 15 chars, preorder 29 chars
without markers: [1,2] -> 1,2 and [1,null,2] -> 1,2
with markers:    [1,2] -> 1,2,#,#,# and [1,null,2] -> 1,#,2,#,#
~~~

Reading example 1: every string rebuilds the same tree, and re-serializing gives the identical string. The empty tree is the single token \`#\`, and \`-10,200,#,#,#\` shows that negative and multi-digit values survive thanks to the delimiter. Reading example 2: the BFS strings round-trip exactly, each tree's preorder form is printed alongside, and the last two lines show the ambiguity of a plain traversal (\`1,2\` for both trees) disappearing once markers are added.

## 8. Complexity

| Operation | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Preorder serialize | O(n) | O(n) output + O(h) stack | each node and each of the n + 1 empty children written once |
| Preorder deserialize | O(n) | O(n) tokens + O(h) stack | each of the 2n + 1 tokens read once |
| BFS serialize | O(n) | O(n) | each node enqueued and dequeued once |
| BFS deserialize | O(n) | O(n) | two tokens per parent, each read once |

n is the number of nodes and h the height. Recursion uses O(h) stack frames for the preorder version; the BFS version uses no recursion.

## 9. Edge Cases and Variants

- **Empty tree** — preorder gives \`#\`, BFS gives \`[]\`; both must deserialize back to an empty tree (example 1 and 2).
- **Negative and multi-digit values** — handled by the delimiter and a real integer parse (\`-10,200,#,#,#\`).
- **Skewed trees** — \`[1,null,2,null,3]\` round-trips in both formats; very deep chains are where recursion limits bite.
- **Values that contain the delimiter** — for string values, escape the delimiter or write a length prefix before each value.
- **BST variant** — a [BST](/interview-question/what-is-a-binary-search-tree-bst) can be serialized as plain preorder with no markers: while deserializing, pass down the allowed (low, high) range, exactly as in [validating a BST](/interview-question/how-do-you-validate-that-a-binary-tree-is-a-bst), and a value outside the range means "this subtree is finished".
- **Rebuilding from two traversals** — without markers you need two traversals, as in [building a tree from preorder and inorder](/interview-question/how-do-you-build-a-binary-tree-from-preorder-and-inorder-traversals); markers make one traversal enough.

## Common Pitfalls

- **No null markers.** Plain preorder \`1,2\` fits two different trees; record every missing child.
- **\`parseInt\` for tokens.** It stops at the first non-digit (\`parseInt("1e3")\` is 1); \`Number\` parses the whole token.
- **Empty tokens becoming 0.** \`Number("")\` is 0, so a stray trailing comma silently adds a node; validate tokens or never emit an empty one.
- **\`queue.shift()\` in a loop.** It re-indexes the array each time; a head index was thousands of times faster on 200,000 items in our run.
- **Recursion on deep trees.** The preorder versions recurse once per level and throw \`RangeError\` on very deep chains; switch to the iterative BFS format.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key insight:</strong> <span style="color:#f0e2c8;">A traversal of values alone is ambiguous; writing a marker like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> for every missing child makes one preorder traversal enough.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Serialize:</strong> <span style="color:#f0e2c8;">Preorder: push the value or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> into an array, recurse left then right, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">join(",")</code> once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Deserialize:</strong> <span style="color:#f0e2c8;">Split on commas and keep a position <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>; each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">build()</code> takes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tokens[i++]</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> means null, else a node whose left and right are built next.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time and O(n) space both ways; a tree of n nodes gives 2n + 1 tokens.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Parse with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parseInt</code>; for the BFS version walk the queue with a head index, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need the null markers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without them, a root with only a left child and a root with only a right child both serialize to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1,2</code>; the markers record which side each subtree is on.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">JSON.stringify</code> the tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is much longer — 154 characters for the 5-node example tree versus 21 for the preorder tokens in my run — and it recursed too deeply on a 100,000-node chain (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a very deep tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the BFS format, which is iterative on both sides, since deep recursion throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the values are strings with commas?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Escape the delimiter, or write each value with a length prefix like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">5:hello</code> so no delimiter is needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Round trips: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">serialize(deserialize(s)) === s</code> and a structural comparison of the original and rebuilt trees, including the empty tree and negative values.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Serialization** | Turning an in-memory structure into a flat string or byte sequence |
| **Deserialization** | Rebuilding the identical structure from that sequence |
| **Null marker (sentinel token)** | A token such as # or null written for every missing child |
| **Delimiter** | A separator between tokens, here a comma |
| **Preorder serialization** | Node, left, right, with markers; rebuilt by reading tokens in order |
| **Round trip** | serialize then deserialize gives back exactly the original |
| **Level-order (BFS) serialization** | Level by level with a queue; two tokens per parent when rebuilding |

---
**Conclusion:** To serialize a binary tree, walk it in preorder and write every value — and a \`#\` for every missing child — separated by commas; to deserialize, read the tokens back in the same order with one moving index, building left before right. The markers are what make one traversal unambiguous: without them \`1,2\` describes two different trees. Both directions are O(n), every round trip in our runs was exact, and in JavaScript the details that matter are \`Number\` over \`parseInt\`, never emitting empty tokens, and a head index instead of \`shift()\` for the BFS queue.`,
        examples: [
          {
            label: "Preorder with # markers: serialize, deserialize, round trip",
            code: `class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// Preorder with '#' for every missing child, joined by commas.
function serialize(root) {
  const out = [];
  const walk = (node) => {
    if (node === null) { out.push("#"); return; }
    out.push(String(node.val));
    walk(node.left);
    walk(node.right);
  };
  walk(root);
  return out.join(",");
}

// Replay the same preorder, consuming one token per call.
function deserialize(data) {
  const tokens = data.split(",");
  let i = 0;
  const build = () => {
    const tok = tokens[i++];
    if (tok === "#") return null;
    const node = new Node(Number(tok));   // Number('-10') is -10; parseInt('1e3') would be 1
    node.left = build();
    node.right = build();
    return node;
  };
  return build();
}

// Level-order array with null for gaps -> tree (test helper).
function fromLevel(values) {
  if (values.length === 0) return null;
  const root = new Node(values[0]);
  const queue = [root];
  let i = 1;
  for (let q = 0; q < queue.length && i < values.length; q++) {
    const node = queue[q];
    if (i < values.length && values[i] !== null) queue.push((node.left = new Node(values[i])));
    i++;
    if (i < values.length && values[i] !== null) queue.push((node.right = new Node(values[i])));
    i++;
  }
  return root;
}

function same(a, b) {
  if (a === null || b === null) return a === b;
  return a.val === b.val && same(a.left, b.left) && same(a.right, b.right);
}

const tests = [
  [1, 2, 3, null, null, 4, 5],
  [],
  [-10, 200],
  [1, null, 2, null, 3],
  [7],
];
for (const values of tests) {
  const root = fromLevel(values);
  const s = serialize(root);
  const back = deserialize(s);
  console.log('"' + s + '" round trip ' + same(root, back) + ", re-serialized equal " + (serialize(back) === s));
}`,
          },
          {
            label: "LeetCode BFS format, format sizes, and the ambiguity of no markers",
            code: `class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// Level order with 'null' gaps, trailing nulls trimmed: '[1,2,3,null,null,4,5]'.
function serializeBfs(root) {
  const out = [];
  const queue = [root];
  for (let head = 0; head < queue.length; head++) {   // a head index: queue.shift() re-indexes the array
    const node = queue[head];
    if (node === null) out.push("null");
    else {
      out.push(String(node.val));
      queue.push(node.left, node.right);
    }
  }
  while (out.length > 0 && out[out.length - 1] === "null") out.pop();
  return "[" + out.join(",") + "]";
}

// Read tokens two at a time: the left and right child of the next parent.
function deserializeBfs(data) {
  const body = data.slice(1, -1);
  if (body === "") return null;
  const tokens = body.split(",");
  const root = new Node(Number(tokens[0]));
  const queue = [root];
  let head = 0;
  let i = 1;
  while (head < queue.length && i < tokens.length) {
    const parent = queue[head++];
    if (tokens[i] !== "null") queue.push((parent.left = new Node(Number(tokens[i]))));
    i++;
    if (i < tokens.length && tokens[i] !== "null") queue.push((parent.right = new Node(Number(tokens[i]))));
    i++;
  }
  return root;
}

function serializePre(node) {
  if (node === null) return "#";
  return node.val + "," + serializePre(node.left) + "," + serializePre(node.right);
}

// Preorder WITHOUT null markers (to show why markers are needed).
function preorderValues(node, out) {
  if (node !== null) {
    out.push(String(node.val));
    preorderValues(node.left, out);
    preorderValues(node.right, out);
  }
  return out.join(",");
}

for (const data of ["[1,2,3,null,null,4,5]", "[]", "[5,4,null,3,null,2]", "[1,null,2,null,3]"]) {
  const root = deserializeBfs(data);
  const again = serializeBfs(root);
  console.log(data + " -> preorder " + serializePre(root) + " -> back " + again + ", equal " + (again === data));
}

const chain = deserializeBfs("[1,null,2,null,3,null,4,null,5,null,6]");
const full = deserializeBfs("[1,2,3,4,5,6,7]");
for (const [name, t] of [["6-node right chain", chain], ["7-node full tree", full]]) {
  console.log(name + ": BFS " + serializeBfs(t).length + " chars, preorder " + serializePre(t).length + " chars");
}

const a = deserializeBfs("[1,2]");
const b = deserializeBfs("[1,null,2]");
console.log("without markers: [1,2] -> " + preorderValues(a, []) + " and [1,null,2] -> " + preorderValues(b, []));
console.log("with markers:    [1,2] -> " + serializePre(a) + " and [1,null,2] -> " + serializePre(b));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Design two Java functions: \`serialize\`, which turns a binary tree into a string, and \`deserialize\`, which turns that string back into an identical tree. The format is up to you, but the round trip must be exact for any tree."

**What a strong answer should cover:**
- Why a plain traversal is not enough: different shapes can share the same preorder, so missing children must be recorded with a null marker.
- Preorder with null markers: serialize recursively; deserialize by consuming tokens in the same order with one moving position. O(n) time and space.
- The level-order (BFS) alternative used by LeetCode: a queue, \`null\` for gaps, trailing nulls trimmed; deserialize by reading two tokens per parent.
- A delimiter between tokens so negative and multi-digit values parse correctly.
- Trade-offs: string size of each format, recursion depth versus an iterative queue.
- Java specifics: \`StringBuilder\` instead of \`String +=\`, \`String.split\` takes a regex and drops trailing empty strings, and \`ArrayDeque\` rejects \`null\` (use \`LinkedList\` when the queue holds null children).

**Clarifying questions expected:**
- What values can nodes hold (negative numbers, very large numbers, strings)?
- Does the format need to be human-readable or compatible with anything else?

**Code / implementation expected:** Yes — preorder \`serialize\` / \`deserialize\` with \`StringBuilder\` and \`String.split\` (and optionally the BFS version), in Java.`,
        answer: `**Target Audience:** Intermediate interview candidates — you should know binary trees, recursion and BFS with a queue.  
**Difficulty:** Hard  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You built a model out of building blocks and want to send it to a friend in another city — but you can only send a text message. You could describe it block by block: "red block; on its left a blue block; nothing on the blue block's left; nothing on its right; on the red block's right a green block...". If you ever forget to say "nothing here", your friend cannot tell whether the next block belongs on the left or the right, and they build a different model.

That is serialization. A tree lives in memory as nodes pointing at each other; to save it to a file, send it over a network or cache it, you must flatten it into a string (**serialize**) and later rebuild exactly the same shape from that string (**deserialize**). The key insight is the "nothing here" part: record the missing children, and one traversal is enough to rebuild the tree. This is a "hard" interview question not because the code is long, but because you have to design a format, argue it is unambiguous, and handle the edge cases (empty tree, negative numbers, deep trees) without being told.

📌 **Interview term: Serialization** — converting an in-memory structure into a flat sequence of characters or bytes that can be stored or sent.

📌 **Interview term: Deserialization** — the reverse: rebuilding the identical in-memory structure from that sequence.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What values can a node hold — negative, multi-digit, strings? | Decides the delimiter and the parsing. With strings, the delimiter itself could appear in a value and would need escaping. |
| Must the format match something (LeetCode's \`[1,2,null,3]\`, JSON)? | Otherwise you are free to pick the simplest correct format. |
| Is the tree a BST? | A BST can be serialized as plain preorder without null markers, because the values themselves tell where each subtree ends. |
| How large and how deep can the tree be? | Recursive serialization uses one stack frame per level; a very deep tree may need the iterative BFS version. |
| Does size matter (bytes over a network)? | Then compare formats, or switch to a binary encoding. |

## 3. Why a Plain Traversal Is Not Enough

Write down only the values in preorder and two different trees produce the same string:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="Tree with root 1 and left child 2. Its preorder without markers is 1, 2">
  <path class="d-edge" d="M 184 76 L 136 124"/>
  <circle class="d-box-muted" cx="200" cy="60" r="22"/>
  <text class="d-text" x="200" y="66" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="120" cy="140" r="22"/>
  <text class="d-text" x="120" y="146" text-anchor="middle">2</text>
  <text class="d-text" x="400" y="90" text-anchor="start">2 is the left child</text>
  <text class="d-sub" x="400" y="116" text-anchor="start">preorder: 1, 2</text>
</svg>

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="Tree with root 1 and right child 2. Its preorder without markers is also 1, 2">
  <path class="d-edge" d="M 216 76 L 264 124"/>
  <circle class="d-box-muted" cx="200" cy="60" r="22"/>
  <text class="d-text" x="200" y="66" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="280" cy="140" r="22"/>
  <text class="d-text" x="280" y="146" text-anchor="middle">2</text>
  <text class="d-text" x="400" y="90" text-anchor="start">2 is the right child</text>
  <text class="d-sub" x="400" y="116" text-anchor="start">preorder: 1, 2</text>
</svg>

Both print \`1,2\`; the string has lost which side 2 was on. Example 2 shows exactly this, and then shows that adding markers fixes it: the first tree becomes \`1,2,#,#,#\` and the second \`1,#,2,#,#\`.

📌 **Interview term: Null marker (sentinel token)** — a token such as \`#\` or \`null\` written wherever a child is missing. It records the shape, not just the values.

📌 **Interview term: Delimiter** — a separator between tokens (here a comma). Without it, \`1\` \`23\` and \`12\` \`3\` would both read as \`123\`.

## 4. Approach 1 — Preorder With Null Markers

**Serialize:** do a preorder traversal (node, left, right). Write the node's value; for a missing child write \`#\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 290" role="img" aria-label="Tree 1 with children 2 and 3; 3 has children 4 and 5. Every missing child is drawn as a hash marker">
  <path class="d-edge" d="M 301 60 L 209 110"/>
  <path class="d-edge" d="M 339 60 L 431 110"/>
  <path class="d-edge-dashed" d="M 176 137 L 139 184"/>
  <path class="d-edge-dashed" d="M 204 137 L 241 184"/>
  <path class="d-edge" d="M 436 137 L 404 173"/>
  <path class="d-edge" d="M 464 137 L 496 173"/>
  <path class="d-edge-dashed" d="M 379 209 L 357 248"/>
  <path class="d-edge-dashed" d="M 401 209 L 423 248"/>
  <path class="d-edge-dashed" d="M 499 209 L 477 248"/>
  <path class="d-edge-dashed" d="M 521 209 L 543 248"/>
  <circle class="d-box-accent" cx="320" cy="50" r="22"/>
  <text class="d-text" x="320" y="56" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="190" cy="120" r="22"/>
  <text class="d-text" x="190" y="126" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="450" cy="120" r="22"/>
  <text class="d-text" x="450" y="126" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="130" cy="195" r="14"/>
  <text class="d-text" x="130" y="201" text-anchor="middle">#</text>
  <circle class="d-box-muted" cx="250" cy="195" r="14"/>
  <text class="d-text" x="250" y="201" text-anchor="middle">#</text>
  <circle class="d-box-accent" cx="390" cy="190" r="22"/>
  <text class="d-text" x="390" y="196" text-anchor="middle">4</text>
  <circle class="d-box-accent" cx="510" cy="190" r="22"/>
  <text class="d-text" x="510" y="196" text-anchor="middle">5</text>
  <circle class="d-box-muted" cx="350" cy="260" r="14"/>
  <text class="d-text" x="350" y="266" text-anchor="middle">#</text>
  <circle class="d-box-muted" cx="430" cy="260" r="14"/>
  <text class="d-text" x="430" y="266" text-anchor="middle">#</text>
  <circle class="d-box-muted" cx="470" cy="260" r="14"/>
  <text class="d-text" x="470" y="266" text-anchor="middle">#</text>
  <circle class="d-box-muted" cx="550" cy="260" r="14"/>
  <text class="d-text" x="550" y="266" text-anchor="middle">#</text>
</svg>

Reading it in preorder gives the token stream below — the string is \`1,2,#,#,3,4,#,#,5,#,#\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 150" role="img" aria-label="Token stream 1, 2, hash, hash, 3, 4, hash, hash, 5, hash, hash">
  <rect class="d-box-accent" x="20" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="45" y="81" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="75" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="100" y="81" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="130" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="155" y="81" text-anchor="middle">#</text>
  <rect class="d-box-muted" x="185" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="210" y="81" text-anchor="middle">#</text>
  <rect class="d-box-accent" x="240" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="265" y="81" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="295" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="320" y="81" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="350" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="375" y="81" text-anchor="middle">#</text>
  <rect class="d-box-muted" x="405" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="430" y="81" text-anchor="middle">#</text>
  <rect class="d-box-accent" x="460" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="485" y="81" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="515" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="540" y="81" text-anchor="middle">#</text>
  <rect class="d-box-muted" x="570" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="595" y="81" text-anchor="middle">#</text>
  <text class="d-text" x="320" y="30" text-anchor="middle">Preorder tokens, read left to right</text>
  <text class="d-sub" x="45" y="128" text-anchor="middle">first</text>
  <text class="d-sub" x="595" y="128" text-anchor="middle">last</text>
</svg>

**Deserialize:** read the tokens in the same order with one moving position. Each call to \`build()\` takes the next token: if it is \`#\`, return an empty child; otherwise create a node, then call \`build()\` for its left child and then for its right child. Because the reader consumes tokens in exactly the order the writer produced them, every node gets back its own children.

**Why it is unambiguous.** In preorder with markers, every subtree is written as "value, left subtree, right subtree", and an empty subtree is exactly one \`#\`. So the reader always knows where the left subtree ends: when its recursive call returns. A tree with n nodes has n + 1 missing children, so the string always has 2n + 1 tokens (11 tokens for the 5 nodes above).

📌 **Interview term: Preorder serialization** — writing node, left subtree, right subtree, with a marker for every empty child. It can be rebuilt by reading the tokens back in the same order.

📌 **Interview term: Round trip** — serialize then deserialize (or the reverse) and get exactly what you started with. The standard test: \`serialize(deserialize(s)) == s\`.

## 5. Approach 2 — Level Order (BFS), the LeetCode Format

LeetCode writes trees level by level: \`[1,2,3,null,null,4,5]\`. [Breadth-first traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree) with a queue produces it: pop a node, write its value (or \`null\`), and push both its children, even when they are missing. Trailing \`null\`s carry no information and are trimmed.

To rebuild, create the root from the first token and put it in a queue. Then, for each parent taken from the queue, the next two tokens are its left and right child; every real child created goes into the queue to receive its own two tokens later.

📌 **Interview term: Level-order (BFS) serialization** — writing the tree level by level with a queue, marking missing children, usually trimming trailing markers. It is rebuilt with a queue, two tokens per parent.

**Which one to choose?** Both are O(n) time and O(n) space. Preorder is the shortest code and the easiest to argue correct. BFS is iterative on both sides, so a very deep tree cannot overflow the call stack, and it is the format most people recognise. The string sizes depend on the shape: in example 2 a 6-node right chain took 38 characters in BFS and 25 in preorder, while a 7-node full tree took 15 in BFS (no trailing nulls) and 29 in preorder (8 \`#\` markers).

## 6. The Code in Java

Preorder serialization from example 1:

~~~java
/** Preorder with '#' for every missing child, joined by commas. */
static String serialize(Node root) {
    StringBuilder sb = new StringBuilder();     // String += in a loop would be O(n^2)
    walk(root, sb);
    sb.setLength(sb.length() - 1);              // drop the trailing comma
    return sb.toString();
}

static void walk(Node node, StringBuilder sb) {
    if (node == null) { sb.append("#,"); return; }
    sb.append(node.val).append(',');
    walk(node.left, sb);
    walk(node.right, sb);
}

static String[] tokens;
static int pos;

/** Replay the same preorder, consuming one token per call. */
static Node deserialize(String data) {
    tokens = data.split(",");
    pos = 0;
    return build();
}

static Node build() {
    String tok = tokens[pos++];
    if (tok.equals("#")) return null;           // equals, never == on Strings
    Node node = new Node(Integer.parseInt(tok));
    node.left = build();
    node.right = build();
    return node;
}
~~~

**What to point out in this code:**

- \`StringBuilder\` collects the tokens. \`String\` is immutable, so \`s += token\` in a loop builds a brand-new string every time and copies everything written so far — quadratic in the output length.
- \`sb.append(node.val).append(',')\` writes a comma after every token, and \`sb.setLength(sb.length() - 1)\` removes the last one. (The string is never empty: an empty tree serializes to \`#\`.)
- \`tok.equals("#")\`, never \`tok == "#"\`: \`==\` compares references, and strings produced by \`split\` are new objects.
- \`String.split\` takes a **regular expression** and **drops trailing empty strings**. In our run \`"1,#,,".split(",")\` returned \`[1, #]\` (2 tokens), and \`"1|2".split("|")\` split between every character (\`[1, |, 2]\`) because \`|\` is a regex operator. A comma is safe; for other delimiters escape them (\`"\\\\|"\`) or use \`Pattern.quote\`.
- The shared position is a static field because a recursive method cannot update a caller's \`int\` parameter.

The BFS version from example 2. Note the two different queues: the serializer's queue must hold \`null\` children, and \`ArrayDeque\` throws \`NullPointerException\` on \`add(null)\` (we checked), so it uses \`LinkedList\`; the deserializer only ever queues real nodes and can use \`ArrayDeque\`:

~~~java
/** Level order with "null" gaps, trailing nulls trimmed: "[1,2,3,null,null,4,5]". */
static String serializeBfs(Node root) {
    List<String> out = new ArrayList<>();
    Queue<Node> queue = new LinkedList<>();   // LinkedList accepts null; ArrayDeque throws
    queue.add(root);
    while (!queue.isEmpty()) {
        Node node = queue.poll();
        if (node == null) out.add("null");
        else {
            out.add(String.valueOf(node.val));
            queue.add(node.left);
            queue.add(node.right);
        }
    }
    while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
    return "[" + String.join(",", out) + "]";
}

/** Read tokens two at a time: the left and right child of the next parent. */
static Node deserializeBfs(String data) {
    String body = data.substring(1, data.length() - 1);
    if (body.isEmpty()) return null;
    String[] tokens = body.split(",");
    Node root = new Node(Integer.parseInt(tokens[0]));
    Queue<Node> queue = new ArrayDeque<>();   // only real nodes go in here
    queue.add(root);
    int i = 1;
    while (!queue.isEmpty() && i < tokens.length) {
        Node parent = queue.poll();
        if (!tokens[i].equals("null")) { parent.left = new Node(Integer.parseInt(tokens[i])); queue.add(parent.left); }
        i++;
        if (i < tokens.length && !tokens[i].equals("null")) { parent.right = new Node(Integer.parseInt(tokens[i])); queue.add(parent.right); }
        i++;
    }
    return root;
}
~~~

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — preorder serialize, deserialize, and check the round trip on five trees** prints:

~~~text
"1,2,#,#,3,4,#,#,5,#,#" round trip true, re-serialized equal true
"#" round trip true, re-serialized equal true
"-10,200,#,#,#" round trip true, re-serialized equal true
"1,#,2,#,3,#,#" round trip true, re-serialized equal true
"7,#,#" round trip true, re-serialized equal true
~~~

**Example 2 — the BFS (LeetCode) format, format sizes, and why null markers are needed** prints:

~~~text
[1,2,3,null,null,4,5] -> preorder 1,2,#,#,3,4,#,#,5,#,# -> back [1,2,3,null,null,4,5], equal true
[] -> preorder # -> back [], equal true
[5,4,null,3,null,2] -> preorder 5,4,3,2,#,#,#,#,# -> back [5,4,null,3,null,2], equal true
[1,null,2,null,3] -> preorder 1,#,2,#,3,#,# -> back [1,null,2,null,3], equal true
6-node right chain: BFS 38 chars, preorder 25 chars
7-node full tree: BFS 15 chars, preorder 29 chars
without markers: [1,2] -> 1,2 and [1,null,2] -> 1,2
with markers:    [1,2] -> 1,2,#,#,# and [1,null,2] -> 1,#,2,#,#
~~~

Reading example 1: every string rebuilds the same tree, and re-serializing gives the identical string. The empty tree is the single token \`#\`, and \`-10,200,#,#,#\` shows that negative and multi-digit values survive thanks to the delimiter. Reading example 2: the BFS strings round-trip exactly, each tree's preorder form is printed alongside, and the last two lines show the ambiguity of a plain traversal (\`1,2\` for both trees) disappearing once markers are added.

## 8. Complexity

| Operation | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Preorder serialize | O(n) | O(n) output + O(h) stack | each node and each of the n + 1 empty children written once |
| Preorder deserialize | O(n) | O(n) tokens + O(h) stack | each of the 2n + 1 tokens read once |
| BFS serialize | O(n) | O(n) | each node enqueued and dequeued once |
| BFS deserialize | O(n) | O(n) | two tokens per parent, each read once |

n is the number of nodes and h the height. Recursion uses O(h) stack frames for the preorder version; \`split\` creates all tokens up front (O(n) memory).

## 9. Edge Cases and Variants

- **Empty tree** — preorder gives \`#\`, BFS gives \`[]\`; both must deserialize back to an empty tree (example 1 and 2).
- **Negative and multi-digit values** — handled by the delimiter and a real integer parse (\`-10,200,#,#,#\`).
- **Skewed trees** — \`[1,null,2,null,3]\` round-trips in both formats; very deep chains are where recursion limits bite.
- **Values that contain the delimiter** — for string values, escape the delimiter or write a length prefix before each value.
- **BST variant** — a [BST](/interview-question/what-is-a-binary-search-tree-bst) can be serialized as plain preorder with no markers: while deserializing, pass down the allowed (low, high) range, exactly as in [validating a BST](/interview-question/how-do-you-validate-that-a-binary-tree-is-a-bst), and a value outside the range means "this subtree is finished".
- **Rebuilding from two traversals** — without markers you need two traversals, as in [building a tree from preorder and inorder](/interview-question/how-do-you-build-a-binary-tree-from-preorder-and-inorder-traversals); markers make one traversal enough.

## Common Pitfalls

- **No null markers.** Plain preorder \`1,2\` fits two different trees; record every missing child.
- **\`String +=\` in recursion.** Each concatenation copies the whole string so far; use one \`StringBuilder\`.
- **\`split\` surprises.** The argument is a regex (\`"|"\` splits every character) and trailing empty strings are dropped (\`"1,#,,"\` gives 2 tokens).
- **\`==\` on tokens.** \`tok == "#"\` compares references; use \`tok.equals("#")\`.
- **\`ArrayDeque\` with null children.** \`add(null)\` throws \`NullPointerException\`; use \`LinkedList\` for a queue that holds nulls, or only enqueue real nodes.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key insight:</strong> <span style="color:#f0e2c8;">A traversal of values alone is ambiguous; writing a marker like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> for every missing child makes one preorder traversal enough.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Serialize:</strong> <span style="color:#f0e2c8;">Preorder into one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StringBuilder</code>: append the value or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> plus a comma, recurse left then right, drop the final comma.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Deserialize:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">split(",")</code> into tokens and keep a position field; each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">build()</code> takes the next token: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> means null, else a node whose left and right are built next.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time and O(n) space both ways; a tree of n nodes gives 2n + 1 tokens.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Compare tokens with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>, remember <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">split</code> takes a regex and drops trailing empties, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LinkedList</code> if a queue must hold null.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need the null markers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without them, a root with only a left child and a root with only a right child both serialize to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1,2</code>; the markers record which side each subtree is on.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">StringBuilder</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">String</code> is immutable, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+=</code> copies everything written so far on every append; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StringBuilder</code> appends in amortised O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does your BFS serializer use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LinkedList</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It enqueues null children, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NullPointerException</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add(null)</code>; the deserializer only enqueues real nodes, so it uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a very deep tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the BFS format, which is iterative on both sides, since deep recursion throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use Java serialization (<code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Serializable</code>)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for this: it is verbose and tied to Java classes. A small text or binary format is portable, readable from any language, and easy to test.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Serialization** | Turning an in-memory structure into a flat string or byte sequence |
| **Deserialization** | Rebuilding the identical structure from that sequence |
| **Null marker (sentinel token)** | A token such as # or null written for every missing child |
| **Delimiter** | A separator between tokens, here a comma |
| **Preorder serialization** | Node, left, right, with markers; rebuilt by reading tokens in order |
| **Round trip** | serialize then deserialize gives back exactly the original |
| **Level-order (BFS) serialization** | Level by level with a queue; two tokens per parent when rebuilding |

---
**Conclusion:** To serialize a binary tree, walk it in preorder and write every value — and a \`#\` for every missing child — separated by commas into one \`StringBuilder\`; to deserialize, split the string and read the tokens back in the same order, building left before right. The markers are what make one traversal unambiguous: without them \`1,2\` describes two different trees. Both directions are O(n), every round trip in our runs was exact, and in Java the traps are \`String +=\`, \`split\`'s regex and trailing-empty rules, \`==\` on strings, and \`ArrayDeque\` refusing null.`,
        examples: [
          {
            label: "Preorder with # markers: serialize, deserialize, round trip",
            code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    /** Preorder with '#' for every missing child, joined by commas. */
    static String serialize(Node root) {
        StringBuilder sb = new StringBuilder();     // String += in a loop would be O(n^2)
        walk(root, sb);
        sb.setLength(sb.length() - 1);              // drop the trailing comma
        return sb.toString();
    }

    static void walk(Node node, StringBuilder sb) {
        if (node == null) { sb.append("#,"); return; }
        sb.append(node.val).append(',');
        walk(node.left, sb);
        walk(node.right, sb);
    }

    static String[] tokens;
    static int pos;

    /** Replay the same preorder, consuming one token per call. */
    static Node deserialize(String data) {
        tokens = data.split(",");
        pos = 0;
        return build();
    }

    static Node build() {
        String tok = tokens[pos++];
        if (tok.equals("#")) return null;           // equals, never == on Strings
        Node node = new Node(Integer.parseInt(tok));
        node.left = build();
        node.right = build();
        return node;
    }

    /** Level-order array with null for gaps -> tree (test helper). */
    static Node fromLevel(Integer[] values) {
        if (values.length == 0) return null;
        Node root = new Node(values[0]);
        List<Node> queue = new ArrayList<>();
        queue.add(root);
        int i = 1;
        for (int q = 0; q < queue.size() && i < values.length; q++) {
            Node node = queue.get(q);
            if (i < values.length && values[i] != null) { node.left = new Node(values[i]); queue.add(node.left); }
            i++;
            if (i < values.length && values[i] != null) { node.right = new Node(values[i]); queue.add(node.right); }
            i++;
        }
        return root;
    }

    static boolean same(Node a, Node b) {
        if (a == null || b == null) return a == b;
        return a.val == b.val && same(a.left, b.left) && same(a.right, b.right);
    }

    public static void main(String[] args) {
        Integer[][] tests = {
            {1, 2, 3, null, null, 4, 5},
            {},
            {-10, 200},
            {1, null, 2, null, 3},
            {7},
        };
        for (Integer[] values : tests) {
            Node root = fromLevel(values);
            String s = serialize(root);
            Node back = deserialize(s);
            System.out.println("\\"" + s + "\\" round trip " + same(root, back) + ", re-serialized equal " + serialize(back).equals(s));
        }
    }
}`,
          },
          {
            label: "LeetCode BFS format, format sizes, and the ambiguity of no markers",
            code: `import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;

public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    /** Level order with "null" gaps, trailing nulls trimmed: "[1,2,3,null,null,4,5]". */
    static String serializeBfs(Node root) {
        List<String> out = new ArrayList<>();
        Queue<Node> queue = new LinkedList<>();   // LinkedList accepts null; ArrayDeque throws
        queue.add(root);
        while (!queue.isEmpty()) {
            Node node = queue.poll();
            if (node == null) out.add("null");
            else {
                out.add(String.valueOf(node.val));
                queue.add(node.left);
                queue.add(node.right);
            }
        }
        while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
        return "[" + String.join(",", out) + "]";
    }

    /** Read tokens two at a time: the left and right child of the next parent. */
    static Node deserializeBfs(String data) {
        String body = data.substring(1, data.length() - 1);
        if (body.isEmpty()) return null;
        String[] tokens = body.split(",");
        Node root = new Node(Integer.parseInt(tokens[0]));
        Queue<Node> queue = new ArrayDeque<>();   // only real nodes go in here
        queue.add(root);
        int i = 1;
        while (!queue.isEmpty() && i < tokens.length) {
            Node parent = queue.poll();
            if (!tokens[i].equals("null")) { parent.left = new Node(Integer.parseInt(tokens[i])); queue.add(parent.left); }
            i++;
            if (i < tokens.length && !tokens[i].equals("null")) { parent.right = new Node(Integer.parseInt(tokens[i])); queue.add(parent.right); }
            i++;
        }
        return root;
    }

    static String serializePre(Node node) {
        if (node == null) return "#";
        return node.val + "," + serializePre(node.left) + "," + serializePre(node.right);
    }

    /** Preorder WITHOUT null markers (to show why markers are needed). */
    static String preorderValues(Node node, List<String> out) {
        if (node != null) {
            out.add(String.valueOf(node.val));
            preorderValues(node.left, out);
            preorderValues(node.right, out);
        }
        return String.join(",", out);
    }

    public static void main(String[] args) {
        for (String data : new String[] {"[1,2,3,null,null,4,5]", "[]", "[5,4,null,3,null,2]", "[1,null,2,null,3]"}) {
            Node root = deserializeBfs(data);
            String again = serializeBfs(root);
            System.out.println(data + " -> preorder " + serializePre(root) + " -> back " + again + ", equal " + again.equals(data));
        }
        Node chain = deserializeBfs("[1,null,2,null,3,null,4,null,5,null,6]");
        Node full = deserializeBfs("[1,2,3,4,5,6,7]");
        System.out.println("6-node right chain: BFS " + serializeBfs(chain).length() + " chars, preorder " + serializePre(chain).length() + " chars");
        System.out.println("7-node full tree: BFS " + serializeBfs(full).length() + " chars, preorder " + serializePre(full).length() + " chars");

        Node a = deserializeBfs("[1,2]");
        Node b = deserializeBfs("[1,null,2]");
        System.out.println("without markers: [1,2] -> " + preorderValues(a, new ArrayList<>()) + " and [1,null,2] -> " + preorderValues(b, new ArrayList<>()));
        System.out.println("with markers:    [1,2] -> " + serializePre(a) + " and [1,null,2] -> " + serializePre(b));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Design two C++ functions: \`serialize\`, which turns a binary tree into a string, and \`deserialize\`, which turns that string back into an identical tree. The format is up to you, but the round trip must be exact for any tree."

**What a strong answer should cover:**
- Why a plain traversal is not enough: different shapes can share the same preorder, so missing children must be recorded with a null marker.
- Preorder with null markers: serialize recursively; deserialize by consuming tokens in the same order with one moving position. O(n) time and space.
- The level-order (BFS) alternative used by LeetCode: a queue, \`null\` for gaps, trailing nulls trimmed; deserialize by reading two tokens per parent.
- A delimiter between tokens so negative and multi-digit values parse correctly.
- Trade-offs: string size of each format, recursion depth versus an iterative queue.
- C++ specifics: building a \`std::string\` with \`+=\`, tokenising with \`std::istringstream\` + \`std::getline(in, tok, ',')\`, checking for the marker before \`std::stoi\` (which throws on \`"#"\`), and who owns the new nodes.

**Clarifying questions expected:**
- What values can nodes hold (negative numbers, very large numbers, strings)?
- Does the format need to be human-readable or compatible with anything else?

**Code / implementation expected:** Yes — preorder \`serialize\` / \`deserialize\` with \`std::string\` and \`std::istringstream\` (and optionally the BFS version), in C++17.`,
        answer: `**Target Audience:** Intermediate interview candidates — you should know binary trees, recursion and BFS with a queue.  
**Difficulty:** Hard  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You built a model out of building blocks and want to send it to a friend in another city — but you can only send a text message. You could describe it block by block: "red block; on its left a blue block; nothing on the blue block's left; nothing on its right; on the red block's right a green block...". If you ever forget to say "nothing here", your friend cannot tell whether the next block belongs on the left or the right, and they build a different model.

That is serialization. A tree lives in memory as nodes pointing at each other; to save it to a file, send it over a network or cache it, you must flatten it into a string (**serialize**) and later rebuild exactly the same shape from that string (**deserialize**). The key insight is the "nothing here" part: record the missing children, and one traversal is enough to rebuild the tree. This is a "hard" interview question not because the code is long, but because you have to design a format, argue it is unambiguous, and handle the edge cases (empty tree, negative numbers, deep trees) without being told.

📌 **Interview term: Serialization** — converting an in-memory structure into a flat sequence of characters or bytes that can be stored or sent.

📌 **Interview term: Deserialization** — the reverse: rebuilding the identical in-memory structure from that sequence.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What values can a node hold — negative, multi-digit, strings? | Decides the delimiter and the parsing. With strings, the delimiter itself could appear in a value and would need escaping. |
| Must the format match something (LeetCode's \`[1,2,null,3]\`, JSON)? | Otherwise you are free to pick the simplest correct format. |
| Is the tree a BST? | A BST can be serialized as plain preorder without null markers, because the values themselves tell where each subtree ends. |
| How large and how deep can the tree be? | Recursive serialization uses one stack frame per level; a very deep tree may need the iterative BFS version. |
| Does size matter (bytes over a network)? | Then compare formats, or switch to a binary encoding. |

## 3. Why a Plain Traversal Is Not Enough

Write down only the values in preorder and two different trees produce the same string:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="Tree with root 1 and left child 2. Its preorder without markers is 1, 2">
  <path class="d-edge" d="M 184 76 L 136 124"/>
  <circle class="d-box-muted" cx="200" cy="60" r="22"/>
  <text class="d-text" x="200" y="66" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="120" cy="140" r="22"/>
  <text class="d-text" x="120" y="146" text-anchor="middle">2</text>
  <text class="d-text" x="400" y="90" text-anchor="start">2 is the left child</text>
  <text class="d-sub" x="400" y="116" text-anchor="start">preorder: 1, 2</text>
</svg>

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="Tree with root 1 and right child 2. Its preorder without markers is also 1, 2">
  <path class="d-edge" d="M 216 76 L 264 124"/>
  <circle class="d-box-muted" cx="200" cy="60" r="22"/>
  <text class="d-text" x="200" y="66" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="280" cy="140" r="22"/>
  <text class="d-text" x="280" y="146" text-anchor="middle">2</text>
  <text class="d-text" x="400" y="90" text-anchor="start">2 is the right child</text>
  <text class="d-sub" x="400" y="116" text-anchor="start">preorder: 1, 2</text>
</svg>

Both print \`1,2\`; the string has lost which side 2 was on. Example 2 shows exactly this, and then shows that adding markers fixes it: the first tree becomes \`1,2,#,#,#\` and the second \`1,#,2,#,#\`.

📌 **Interview term: Null marker (sentinel token)** — a token such as \`#\` or \`null\` written wherever a child is missing. It records the shape, not just the values.

📌 **Interview term: Delimiter** — a separator between tokens (here a comma). Without it, \`1\` \`23\` and \`12\` \`3\` would both read as \`123\`.

## 4. Approach 1 — Preorder With Null Markers

**Serialize:** do a preorder traversal (node, left, right). Write the node's value; for a missing child write \`#\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 290" role="img" aria-label="Tree 1 with children 2 and 3; 3 has children 4 and 5. Every missing child is drawn as a hash marker">
  <path class="d-edge" d="M 301 60 L 209 110"/>
  <path class="d-edge" d="M 339 60 L 431 110"/>
  <path class="d-edge-dashed" d="M 176 137 L 139 184"/>
  <path class="d-edge-dashed" d="M 204 137 L 241 184"/>
  <path class="d-edge" d="M 436 137 L 404 173"/>
  <path class="d-edge" d="M 464 137 L 496 173"/>
  <path class="d-edge-dashed" d="M 379 209 L 357 248"/>
  <path class="d-edge-dashed" d="M 401 209 L 423 248"/>
  <path class="d-edge-dashed" d="M 499 209 L 477 248"/>
  <path class="d-edge-dashed" d="M 521 209 L 543 248"/>
  <circle class="d-box-accent" cx="320" cy="50" r="22"/>
  <text class="d-text" x="320" y="56" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="190" cy="120" r="22"/>
  <text class="d-text" x="190" y="126" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="450" cy="120" r="22"/>
  <text class="d-text" x="450" y="126" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="130" cy="195" r="14"/>
  <text class="d-text" x="130" y="201" text-anchor="middle">#</text>
  <circle class="d-box-muted" cx="250" cy="195" r="14"/>
  <text class="d-text" x="250" y="201" text-anchor="middle">#</text>
  <circle class="d-box-accent" cx="390" cy="190" r="22"/>
  <text class="d-text" x="390" y="196" text-anchor="middle">4</text>
  <circle class="d-box-accent" cx="510" cy="190" r="22"/>
  <text class="d-text" x="510" y="196" text-anchor="middle">5</text>
  <circle class="d-box-muted" cx="350" cy="260" r="14"/>
  <text class="d-text" x="350" y="266" text-anchor="middle">#</text>
  <circle class="d-box-muted" cx="430" cy="260" r="14"/>
  <text class="d-text" x="430" y="266" text-anchor="middle">#</text>
  <circle class="d-box-muted" cx="470" cy="260" r="14"/>
  <text class="d-text" x="470" y="266" text-anchor="middle">#</text>
  <circle class="d-box-muted" cx="550" cy="260" r="14"/>
  <text class="d-text" x="550" y="266" text-anchor="middle">#</text>
</svg>

Reading it in preorder gives the token stream below — the string is \`1,2,#,#,3,4,#,#,5,#,#\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 150" role="img" aria-label="Token stream 1, 2, hash, hash, 3, 4, hash, hash, 5, hash, hash">
  <rect class="d-box-accent" x="20" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="45" y="81" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="75" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="100" y="81" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="130" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="155" y="81" text-anchor="middle">#</text>
  <rect class="d-box-muted" x="185" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="210" y="81" text-anchor="middle">#</text>
  <rect class="d-box-accent" x="240" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="265" y="81" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="295" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="320" y="81" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="350" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="375" y="81" text-anchor="middle">#</text>
  <rect class="d-box-muted" x="405" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="430" y="81" text-anchor="middle">#</text>
  <rect class="d-box-accent" x="460" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="485" y="81" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="515" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="540" y="81" text-anchor="middle">#</text>
  <rect class="d-box-muted" x="570" y="50" width="50" height="50" rx="8"/>
  <text class="d-text" x="595" y="81" text-anchor="middle">#</text>
  <text class="d-text" x="320" y="30" text-anchor="middle">Preorder tokens, read left to right</text>
  <text class="d-sub" x="45" y="128" text-anchor="middle">first</text>
  <text class="d-sub" x="595" y="128" text-anchor="middle">last</text>
</svg>

**Deserialize:** read the tokens in the same order with one moving position. Each call to \`build()\` takes the next token: if it is \`#\`, return an empty child; otherwise create a node, then call \`build()\` for its left child and then for its right child. Because the reader consumes tokens in exactly the order the writer produced them, every node gets back its own children.

**Why it is unambiguous.** In preorder with markers, every subtree is written as "value, left subtree, right subtree", and an empty subtree is exactly one \`#\`. So the reader always knows where the left subtree ends: when its recursive call returns. A tree with n nodes has n + 1 missing children, so the string always has 2n + 1 tokens (11 tokens for the 5 nodes above).

📌 **Interview term: Preorder serialization** — writing node, left subtree, right subtree, with a marker for every empty child. It can be rebuilt by reading the tokens back in the same order.

📌 **Interview term: Round trip** — serialize then deserialize (or the reverse) and get exactly what you started with. The standard test: \`serialize(deserialize(s)) == s\`.

## 5. Approach 2 — Level Order (BFS), the LeetCode Format

LeetCode writes trees level by level: \`[1,2,3,null,null,4,5]\`. [Breadth-first traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree) with a queue produces it: pop a node, write its value (or \`null\`), and push both its children, even when they are missing. Trailing \`null\`s carry no information and are trimmed.

To rebuild, create the root from the first token and put it in a queue. Then, for each parent taken from the queue, the next two tokens are its left and right child; every real child created goes into the queue to receive its own two tokens later.

📌 **Interview term: Level-order (BFS) serialization** — writing the tree level by level with a queue, marking missing children, usually trimming trailing markers. It is rebuilt with a queue, two tokens per parent.

**Which one to choose?** Both are O(n) time and O(n) space. Preorder is the shortest code and the easiest to argue correct. BFS is iterative on both sides, so a very deep tree cannot overflow the call stack, and it is the format most people recognise. The string sizes depend on the shape: in example 2 a 6-node right chain took 38 characters in BFS and 25 in preorder, while a 7-node full tree took 15 in BFS (no trailing nulls) and 29 in preorder (8 \`#\` markers).

## 6. The Code in C++

Preorder serialization from example 1:

~~~cpp
// Preorder with '#' for every missing child, joined by commas.
void walk(const Node* node, std::string& out) {
    if (!node) { out += "#,"; return; }
    out += std::to_string(node->val);
    out += ',';
    walk(node->left, out);
    walk(node->right, out);
}

std::string serialize(const Node* root) {
    std::string out;            // += appends in amortised O(1)
    walk(root, out);
    out.pop_back();             // drop the trailing comma
    return out;
}

// Replay the same preorder, consuming one token per call.
Node* build(std::istringstream& in) {
    std::string tok;
    std::getline(in, tok, ',');
    if (tok == "#") return nullptr;    // std::string == compares contents
    Node* node = make(std::stoi(tok)); // stoi handles "-10"
    node->left = build(in);
    node->right = build(in);
    return node;
}

Node* deserialize(const std::string& data) {
    std::istringstream in(data);
    return build(in);
}
~~~

**What to point out in this code:**

- The serializer appends to one \`std::string\` passed by reference; \`+=\` on a \`std::string\` appends in amortised constant time, unlike building new strings with \`a + b\` at every level. \`pop_back()\` removes the final comma.
- \`std::getline(in, tok, ',')\` reads up to the next comma, so the \`std::istringstream\` acts as the moving position — no index variable needed.
- The marker check comes **before** \`std::stoi\`: \`std::stoi("#")\` throws \`std::invalid_argument\` (we checked). \`std::stoi("-10")\` works.
- \`make\` puts every new node into a \`std::vector<std::unique_ptr<Node>>\`, so the deserialized tree is freed automatically. With raw \`new\`, the caller must free the tree.
- Both functions recurse once per level; in C++ a stack overflow crashes the program, so very deep trees call for the BFS version.

The BFS version from example 2. \`std::queue<Node*>\` stores \`nullptr\` children without complaint:

~~~cpp
// Level order with "null" gaps, trailing nulls trimmed: "[1,2,3,null,null,4,5]".
std::string serializeBfs(Node* root) {
    std::vector<std::string> out;
    std::queue<Node*> q;          // std::queue<Node*> happily stores nullptr
    q.push(root);
    while (!q.empty()) {
        Node* node = q.front();
        q.pop();
        if (!node) out.push_back("null");
        else {
            out.push_back(std::to_string(node->val));
            q.push(node->left);
            q.push(node->right);
        }
    }
    while (!out.empty() && out.back() == "null") out.pop_back();
    std::string s = "[";
    for (size_t i = 0; i < out.size(); i++) s += (i ? "," : "") + out[i];
    return s + "]";
}

// Read tokens two at a time: the left and right child of the next parent.
Node* deserializeBfs(const std::string& data) {
    std::string body = data.substr(1, data.size() - 2);
    if (body.empty()) return nullptr;
    std::vector<std::string> tokens;
    std::istringstream in(body);
    for (std::string tok; std::getline(in, tok, ',');) tokens.push_back(tok);
    Node* root = make(std::stoi(tokens[0]));
    std::queue<Node*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < tokens.size()) {
        Node* parent = q.front();
        q.pop();
        if (tokens[i] != "null") q.push(parent->left = make(std::stoi(tokens[i])));
        i++;
        if (i < tokens.size() && tokens[i] != "null") q.push(parent->right = make(std::stoi(tokens[i])));
        i++;
    }
    return root;
}
~~~

## 7. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13.3). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines.

**Example 1 — preorder serialize, deserialize, and check the round trip on five trees** prints:

~~~text
"1,2,#,#,3,4,#,#,5,#,#" round trip true, re-serialized equal true
"#" round trip true, re-serialized equal true
"-10,200,#,#,#" round trip true, re-serialized equal true
"1,#,2,#,3,#,#" round trip true, re-serialized equal true
"7,#,#" round trip true, re-serialized equal true
~~~

**Example 2 — the BFS (LeetCode) format, format sizes, and why null markers are needed** prints:

~~~text
[1,2,3,null,null,4,5] -> preorder 1,2,#,#,3,4,#,#,5,#,# -> back [1,2,3,null,null,4,5], equal true
[] -> preorder # -> back [], equal true
[5,4,null,3,null,2] -> preorder 5,4,3,2,#,#,#,#,# -> back [5,4,null,3,null,2], equal true
[1,null,2,null,3] -> preorder 1,#,2,#,3,#,# -> back [1,null,2,null,3], equal true
6-node right chain: BFS 38 chars, preorder 25 chars
7-node full tree: BFS 15 chars, preorder 29 chars
without markers: [1,2] -> 1,2 and [1,null,2] -> 1,2
with markers:    [1,2] -> 1,2,#,#,# and [1,null,2] -> 1,#,2,#,#
~~~

Reading example 1: every string rebuilds the same tree, and re-serializing gives the identical string. The empty tree is the single token \`#\`, and \`-10,200,#,#,#\` shows that negative and multi-digit values survive thanks to the delimiter. Reading example 2: the BFS strings round-trip exactly, each tree's preorder form is printed alongside, and the last two lines show the ambiguity of a plain traversal (\`1,2\` for both trees) disappearing once markers are added.

## 8. Complexity

| Operation | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Preorder serialize | O(n) | O(n) output + O(h) stack | each node and each of the n + 1 empty children written once |
| Preorder deserialize | O(n) | O(n) tokens + O(h) stack | each of the 2n + 1 tokens read once |
| BFS serialize | O(n) | O(n) | each node enqueued and dequeued once |
| BFS deserialize | O(n) | O(n) | two tokens per parent, each read once |

n is the number of nodes and h the height. Recursion uses O(h) stack frames for the preorder version; the \`istringstream\` reads tokens one at a time.

## 9. Edge Cases and Variants

- **Empty tree** — preorder gives \`#\`, BFS gives \`[]\`; both must deserialize back to an empty tree (example 1 and 2).
- **Negative and multi-digit values** — handled by the delimiter and a real integer parse (\`-10,200,#,#,#\`).
- **Skewed trees** — \`[1,null,2,null,3]\` round-trips in both formats; very deep chains are where recursion limits bite.
- **Values that contain the delimiter** — for string values, escape the delimiter or write a length prefix before each value.
- **BST variant** — a [BST](/interview-question/what-is-a-binary-search-tree-bst) can be serialized as plain preorder with no markers: while deserializing, pass down the allowed (low, high) range, exactly as in [validating a BST](/interview-question/how-do-you-validate-that-a-binary-tree-is-a-bst), and a value outside the range means "this subtree is finished".
- **Rebuilding from two traversals** — without markers you need two traversals, as in [building a tree from preorder and inorder](/interview-question/how-do-you-build-a-binary-tree-from-preorder-and-inorder-traversals); markers make one traversal enough.

## Common Pitfalls

- **No null markers.** Plain preorder \`1,2\` fits two different trees; record every missing child.
- **\`std::stoi\` on the marker.** \`std::stoi("#")\` throws \`std::invalid_argument\`; test for \`#\` (or \`null\`) first.
- **Building strings with \`a + b\` at every level.** It creates temporary strings; append to one \`std::string&\`.
- **Leaking deserialized nodes.** \`new Node\` with no owner leaks the tree; return ownership clearly (a pool of \`unique_ptr\`, or a documented "caller frees").
- **\`substr\` on an empty input.** \`data.substr(1, data.size() - 2)\` assumes at least \`[]\`; validate the input format before slicing.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Key insight:</strong> <span style="color:#f0e2c8;">A traversal of values alone is ambiguous; writing a marker like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> for every missing child makes one preorder traversal enough.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Serialize:</strong> <span style="color:#f0e2c8;">Preorder into one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::string&amp;</code>: append <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::to_string(val)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> plus a comma, recurse left then right, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_back()</code> the final comma.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Deserialize:</strong> <span style="color:#f0e2c8;">Wrap the string in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::istringstream</code> and read with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::getline(in, tok, ',')</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code>, else a node whose left and right are built next.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time and O(n) space both ways; a tree of n nodes gives 2n + 1 tokens.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Check for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stoi</code> (which throws on it), and give the new nodes a clear owner such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unique_ptr</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need the null markers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without them, a root with only a left child and a root with only a right child both serialize to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1,2</code>; the markers record which side each subtree is on.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">getline</code> with a delimiter instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&gt;&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;&gt;</code> splits on whitespace; with a comma format, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getline(in, tok, ',')</code> reads exactly one token, including negative numbers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Who frees the deserialized tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the examples a pool of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::unique_ptr&lt;Node&gt;</code> owns every node; with raw pointers the caller must free it in post-order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle a very deep tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the BFS format, which is iterative on both sides; a stack overflow in C++ crashes the process instead of throwing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use a binary format?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: write each value as 4 bytes plus a 1-byte present/absent flag. It is smaller and faster to parse, but not human-readable.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Serialization** | Turning an in-memory structure into a flat string or byte sequence |
| **Deserialization** | Rebuilding the identical structure from that sequence |
| **Null marker (sentinel token)** | A token such as # or null written for every missing child |
| **Delimiter** | A separator between tokens, here a comma |
| **Preorder serialization** | Node, left, right, with markers; rebuilt by reading tokens in order |
| **Round trip** | serialize then deserialize gives back exactly the original |
| **Level-order (BFS) serialization** | Level by level with a queue; two tokens per parent when rebuilding |

---
**Conclusion:** To serialize a binary tree, walk it in preorder and append every value — and a \`#\` for every missing child — separated by commas to one \`std::string\`; to deserialize, read tokens back with \`std::getline(in, tok, ',')\` in the same order, building left before right. The markers are what make one traversal unambiguous: without them \`1,2\` describes two different trees. Both directions are O(n), every round trip in our runs was exact, and in C++ the details that matter are checking for the marker before \`std::stoi\` and giving the rebuilt nodes a clear owner.`,
        examples: [
          {
            label: "Preorder with # markers: serialize, deserialize, round trip",
            code: `#include <iostream>
#include <memory>
#include <optional>
#include <sstream>
#include <string>
#include <vector>

struct Node {
    int val;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int v) : val(v) {}
};

std::vector<std::unique_ptr<Node>> pool;  // owns every node, freed at exit
Node* make(int v) {
    pool.push_back(std::make_unique<Node>(v));
    return pool.back().get();
}

// Preorder with '#' for every missing child, joined by commas.
void walk(const Node* node, std::string& out) {
    if (!node) { out += "#,"; return; }
    out += std::to_string(node->val);
    out += ',';
    walk(node->left, out);
    walk(node->right, out);
}

std::string serialize(const Node* root) {
    std::string out;            // += appends in amortised O(1)
    walk(root, out);
    out.pop_back();             // drop the trailing comma
    return out;
}

// Replay the same preorder, consuming one token per call.
Node* build(std::istringstream& in) {
    std::string tok;
    std::getline(in, tok, ',');
    if (tok == "#") return nullptr;    // std::string == compares contents
    Node* node = make(std::stoi(tok)); // stoi handles "-10"
    node->left = build(in);
    node->right = build(in);
    return node;
}

Node* deserialize(const std::string& data) {
    std::istringstream in(data);
    return build(in);
}

using Values = std::vector<std::optional<int>>;
const std::optional<int> NIL;

// Level-order list with NIL for gaps -> tree (test helper).
Node* fromLevel(const Values& values) {
    if (values.empty()) return nullptr;
    Node* root = make(*values[0]);
    std::vector<Node*> queue{root};
    size_t i = 1;
    for (size_t q = 0; q < queue.size() && i < values.size(); q++) {
        Node* node = queue[q];
        if (i < values.size() && values[i]) queue.push_back(node->left = make(*values[i]));
        i++;
        if (i < values.size() && values[i]) queue.push_back(node->right = make(*values[i]));
        i++;
    }
    return root;
}

bool same(const Node* a, const Node* b) {
    if (!a || !b) return a == b;
    return a->val == b->val && same(a->left, b->left) && same(a->right, b->right);
}

int main() {
    std::vector<Values> tests{
        {1, 2, 3, NIL, NIL, 4, 5},
        {},
        {-10, 200},
        {1, NIL, 2, NIL, 3},
        {7},
    };
    std::cout << std::boolalpha;
    for (const Values& values : tests) {
        Node* root = fromLevel(values);
        std::string s = serialize(root);
        Node* back = deserialize(s);
        std::cout << "\\"" << s << "\\" round trip " << same(root, back) << ", re-serialized equal " << (serialize(back) == s) << "\\n";
    }
    return 0;
}`,
          },
          {
            label: "LeetCode BFS format, format sizes, and the ambiguity of no markers",
            code: `#include <iostream>
#include <memory>
#include <queue>
#include <sstream>
#include <string>
#include <vector>

struct Node {
    int val;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int v) : val(v) {}
};

std::vector<std::unique_ptr<Node>> pool;  // owns every node, freed at exit
Node* make(int v) {
    pool.push_back(std::make_unique<Node>(v));
    return pool.back().get();
}

// Level order with "null" gaps, trailing nulls trimmed: "[1,2,3,null,null,4,5]".
std::string serializeBfs(Node* root) {
    std::vector<std::string> out;
    std::queue<Node*> q;          // std::queue<Node*> happily stores nullptr
    q.push(root);
    while (!q.empty()) {
        Node* node = q.front();
        q.pop();
        if (!node) out.push_back("null");
        else {
            out.push_back(std::to_string(node->val));
            q.push(node->left);
            q.push(node->right);
        }
    }
    while (!out.empty() && out.back() == "null") out.pop_back();
    std::string s = "[";
    for (size_t i = 0; i < out.size(); i++) s += (i ? "," : "") + out[i];
    return s + "]";
}

// Read tokens two at a time: the left and right child of the next parent.
Node* deserializeBfs(const std::string& data) {
    std::string body = data.substr(1, data.size() - 2);
    if (body.empty()) return nullptr;
    std::vector<std::string> tokens;
    std::istringstream in(body);
    for (std::string tok; std::getline(in, tok, ',');) tokens.push_back(tok);
    Node* root = make(std::stoi(tokens[0]));
    std::queue<Node*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < tokens.size()) {
        Node* parent = q.front();
        q.pop();
        if (tokens[i] != "null") q.push(parent->left = make(std::stoi(tokens[i])));
        i++;
        if (i < tokens.size() && tokens[i] != "null") q.push(parent->right = make(std::stoi(tokens[i])));
        i++;
    }
    return root;
}

std::string serializePre(const Node* node) {
    if (!node) return "#";
    return std::to_string(node->val) + "," + serializePre(node->left) + "," + serializePre(node->right);
}

// Preorder WITHOUT null markers (to show why markers are needed).
void preorderValues(const Node* node, std::string& out) {
    if (!node) return;
    if (!out.empty()) out += ",";
    out += std::to_string(node->val);
    preorderValues(node->left, out);
    preorderValues(node->right, out);
}

std::string plain(const Node* node) {
    std::string out;
    preorderValues(node, out);
    return out;
}

int main() {
    std::cout << std::boolalpha;
    for (std::string data : {"[1,2,3,null,null,4,5]", "[]", "[5,4,null,3,null,2]", "[1,null,2,null,3]"}) {
        Node* root = deserializeBfs(data);
        std::string again = serializeBfs(root);
        std::cout << data << " -> preorder " << serializePre(root) << " -> back " << again << ", equal " << (again == data) << "\\n";
    }
    Node* chain = deserializeBfs("[1,null,2,null,3,null,4,null,5,null,6]");
    Node* full = deserializeBfs("[1,2,3,4,5,6,7]");
    std::cout << "6-node right chain: BFS " << serializeBfs(chain).size() << " chars, preorder " << serializePre(chain).size() << " chars\\n";
    std::cout << "7-node full tree: BFS " << serializeBfs(full).size() << " chars, preorder " << serializePre(full).size() << " chars\\n";

    Node* a = deserializeBfs("[1,2]");
    Node* b = deserializeBfs("[1,null,2]");
    std::cout << "without markers: [1,2] -> " << plain(a) << " and [1,null,2] -> " << plain(b) << "\\n";
    std::cout << "with markers:    [1,2] -> " << serializePre(a) << " and [1,null,2] -> " << serializePre(b) << "\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
];

export default augments;
