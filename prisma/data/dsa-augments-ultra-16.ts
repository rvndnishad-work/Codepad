/**
 * DSA ULTRA — batch 16: binary trees II — checking that a tree is height-balanced, the diameter of
 * a tree, level-order (BFS) traversal, the right-side view, and the lowest common ancestor. One
 * complete answer per language (Python, JavaScript, Java, C++). Every example was run with
 * python3 / node / javac+java / g++ -std=c++17 by scripts/verify-dsa-examples.ts and the quoted
 * output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you check if a binary tree is balanced?",
    difficulty: "medium",
    seoDescription: "Check if a binary tree is height-balanced in O(n) with one post-order pass that returns -1 early. Python, JavaScript, Java and C++ code, run and verified.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given the root of a binary tree, a tree of \`Node\` objects with \`val\`, \`left\` and \`right\`. Write a Python function that returns true if the tree is height-balanced — meaning that at every node, the heights of the left and right subtrees differ by at most one — and false otherwise."

**What a strong answer should cover:**
- The definition applies at every node, not just the root, and an empty tree is balanced.
- The naive top-down approach (compute both heights at every node) and why it repeats work: O(n · h), so O(n log n) on a balanced tree.
- The bottom-up post-order approach: return the height, or a sentinel such as -1 as soon as a subtree fails, so the whole check is O(n).
- Space is the recursion stack, O(h): O(log n) when balanced, O(n) for a chain.
- Python details: compare the sentinel with \`== -1\` (height 0 is falsy), and the default recursion limit of 1000 for skewed trees.
- Why balance matters: search trees stay O(log n) only while their height is small.

**Clarifying questions expected:**
- Is "balanced" the height-gap-at-most-one definition, and is an empty tree balanced?
- Can the tree be very deep (risk of stack overflow)?

**Code / implementation expected:** Yes — \`check_height(node)\` returning an int, plus \`is_balanced(root)\`, in Python 3.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree and a recursive function are; everything else is explained.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a mobile hanging over a baby's cot: a stick, with a string at each end, and on each string either a toy or another, smaller stick with its own two strings. It only hangs nicely if **every** stick is roughly level. A mobile where the top stick is perfectly level but one of the lower sticks droops badly still looks broken.

A binary tree is the same picture turned into data. Each node is a stick, its left and right subtrees hang from it, and "how far down does this side go" is the subtree's **height**. A tree is *balanced* when, at every single node, the left side and the right side hang to almost the same depth — they may differ by at most one level.

Why do interviewers care? Because balance is what keeps trees fast. A [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) answers a lookup in time proportional to its height. If it stays balanced, the height is about log₂ n (20 levels for a million keys); if it degenerates into a chain, the height is n and every lookup is a linear scan. Self-balancing trees (AVL trees, red-black trees) exist precisely to keep that height small — see the [time complexity of common operations on balanced trees](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance).

The coding question is smaller than that: *given a tree, tell me whether it is balanced.* It is a favourite because the obvious answer is correct but wasteful, and the good answer teaches one of the most useful tree tricks there is: **let each recursive call return two facts at once.**

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which definition of balanced: the gap between the left and right *heights* at every node is at most 1? | That is the usual ("height-balanced", AVL) definition. Some people mean "all leaves within one level of each other", which is a different, stricter test. |
| Is an empty tree balanced? | Yes by the usual definition (there is no node that breaks the rule). Saying so up front avoids a debate about the base case. |
| How many nodes, and can the tree be very deep (a long chain)? | A deep tree can overflow the call stack of a recursive solution. It decides whether you need an iterative version. |
| Do you only need true/false, or also where it fails? | Returning the first failing node is a small change, but it changes the return type. |
| Can I add a helper that returns the height? | The good solution is a helper that returns "height, or a failure flag". Asking makes it clear you are planning it. |

## 3. The Core Idea

First, two definitions.

📌 **Interview term: Height of a subtree** — the number of nodes on the longest path from that node down to a leaf. An empty subtree has height 0 and a single leaf has height 1. (Some books count edges instead, so a leaf is 0; either works here, because only *differences* between heights matter.) Computing the height is exactly the [maximum depth of a binary tree](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) problem.

📌 **Interview term: Height-balanced binary tree** — a tree in which, for **every** node, the heights of its left and right subtrees differ by at most 1. This is the balance rule AVL trees maintain.

The word *every* is the whole trap. Checking only the root is not enough:

<svg class="iq-diagram" width="100%" viewBox="0 0 520 290" role="img" aria-label="A balanced tree with root 3, children 9 and 20, and 20 has children 15 and 7. Every node has subtree heights that differ by at most one">
  <rect class="d-box-muted" x="124" y="4" width="272" height="28" rx="14"/>
  <text class="d-text" x="260" y="23" text-anchor="middle">Balanced: every gap is 0 or 1</text>
  <path class="d-edge" d="M 140 80 L 50 160"/>
  <path class="d-edge" d="M 140 80 L 320 160"/>
  <path class="d-edge" d="M 320 160 L 230 240"/>
  <path class="d-edge" d="M 320 160 L 410 240"/>
  <circle class="d-box" cx="140" cy="80" r="20"/>
  <text class="d-text" x="140" y="85" text-anchor="middle">3</text>
  <circle class="d-box" cx="50" cy="160" r="20"/>
  <text class="d-text" x="50" y="165" text-anchor="middle">9</text>
  <circle class="d-box" cx="320" cy="160" r="20"/>
  <text class="d-text" x="320" y="165" text-anchor="middle">20</text>
  <circle class="d-box" cx="230" cy="240" r="20"/>
  <text class="d-text" x="230" y="245" text-anchor="middle">15</text>
  <circle class="d-box" cx="410" cy="240" r="20"/>
  <text class="d-text" x="410" y="245" text-anchor="middle">7</text>
  <text class="d-sub" x="166" y="66">1 vs 2, ok</text>
  <text class="d-sub" x="24" y="146" text-anchor="end">h=1</text>
  <text class="d-sub" x="346" y="146">h=2</text>
  <text class="d-sub" x="204" y="226" text-anchor="end">h=1</text>
  <text class="d-sub" x="436" y="226">h=1</text>
</svg>

In the balanced tree above, the root sees heights 1 (left, node 9) and 2 (right, node 20): a gap of 1, allowed. Node 20 sees 1 and 1. Leaves see 0 and 0. Every gap is at most 1, so the tree is balanced.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 370" role="img" aria-label="A tree whose root has equal subtree heights 3 and 3, but each node with value 2 has heights 2 and 0, so the tree is not balanced">
  <rect class="d-box-muted" x="162" y="4" width="376" height="28" rx="14"/>
  <text class="d-text" x="350" y="23" text-anchor="middle">Not balanced: the root passes, the 2s fail</text>
  <path class="d-edge" d="M 320 80 L 230 160"/>
  <path class="d-edge" d="M 320 80 L 410 160"/>
  <path class="d-edge" d="M 230 160 L 140 240"/>
  <path class="d-edge" d="M 410 160 L 500 240"/>
  <path class="d-edge" d="M 140 240 L 50 320"/>
  <path class="d-edge" d="M 500 240 L 590 320"/>
  <circle class="d-box" cx="320" cy="80" r="20"/>
  <text class="d-text" x="320" y="85" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="230" cy="160" r="20"/>
  <text class="d-text" x="230" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="410" cy="160" r="20"/>
  <text class="d-text" x="410" y="165" text-anchor="middle">2</text>
  <circle class="d-box" cx="140" cy="240" r="20"/>
  <text class="d-text" x="140" y="245" text-anchor="middle">3</text>
  <circle class="d-box" cx="500" cy="240" r="20"/>
  <text class="d-text" x="500" y="245" text-anchor="middle">3</text>
  <circle class="d-box" cx="50" cy="320" r="20"/>
  <text class="d-text" x="50" y="325" text-anchor="middle">4</text>
  <circle class="d-box" cx="590" cy="320" r="20"/>
  <text class="d-text" x="590" y="325" text-anchor="middle">4</text>
  <text class="d-sub" x="346" y="66">3 vs 3, ok</text>
  <text class="d-sub" x="204" y="146" text-anchor="end">2 vs 0, fails</text>
  <text class="d-sub" x="436" y="146">2 vs 0, fails</text>
  <text class="d-sub" x="114" y="226" text-anchor="end">h=2</text>
  <text class="d-sub" x="526" y="226">h=2</text>
  <text class="d-sub" x="24" y="306" text-anchor="end">h=1</text>
  <text class="d-sub" x="616" y="306">h=1</text>
</svg>

In this second tree the root is perfectly happy — both sides have height 3 — but each node with value 2 has a left side of height 2 and an empty right side. A gap of 2 at any node makes the whole tree unbalanced. A solution that only compares the two sides of the root returns the wrong answer here; example 1 includes this exact tree.

## 4. From Brute Force to One Bottom-Up Pass

**Brute force (top-down).** Translate the definition literally: at the root, compute the height of the left subtree and the height of the right subtree (each a full walk), compare them, then recurse into both children and do the same there. It is correct, and it is a fine thing to say first. The waste is that the same heights are recomputed over and over: a node at depth k is walked once for each of its k ancestors.

📌 **Interview term: Top-down recursion** — the parent does its own check first and then asks the children to check themselves; information flows from the root downwards, and here that means each level recomputes the work of the levels below.

**Optimal (bottom-up).** Turn it around. Visit the children *first*, and let each call return its subtree's height. The parent then has both heights for free and can check its own gap in O(1). The only extra need is a way to say "this subtree is already unbalanced, stop", and the classic trick is to return a value that can never be a real height: **-1**.

📌 **Interview term: Post-order traversal** — visit the left subtree, then the right subtree, then the node itself. A node is processed only after both children have reported back, which is exactly what a bottom-up check needs. See the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods).

📌 **Interview term: Sentinel return value** — a special value (here -1) that cannot be a normal answer and is used to signal "failed". It lets one integer carry two facts: the height when things are fine, and the failure flag when they are not.

📌 **Interview term: Early exit (short-circuit)** — stopping the moment the answer is known. As soon as one subtree returns -1, every ancestor returns -1 immediately without looking at its other child.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Bottom-up check at one node: get the left result, get the right result, compare the heights, then return one plus the larger height or return minus one">
  <defs>
    <marker id="b16q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="10" y="30" width="150" height="64" rx="10"/>
  <text class="d-text" x="85" y="58" text-anchor="middle">left = check(L)</text>
  <text class="d-sub" x="85" y="78" text-anchor="middle">children first</text>
  <path class="d-edge" d="M 162 62 L 206 62" marker-end="url(#b16q1-arrow)"/>
  <rect class="d-box" x="210" y="30" width="150" height="64" rx="10"/>
  <text class="d-text" x="285" y="58" text-anchor="middle">right = check(R)</text>
  <text class="d-sub" x="285" y="78" text-anchor="middle">skipped if left failed</text>
  <path class="d-edge" d="M 362 62 L 406 62" marker-end="url(#b16q1-arrow)"/>
  <rect class="d-box-muted" x="410" y="30" width="150" height="64" rx="10"/>
  <text class="d-text" x="485" y="58" text-anchor="middle">gap over 1?</text>
  <text class="d-sub" x="485" y="78" text-anchor="middle">abs(left - right)</text>
  <path class="d-edge" d="M 562 62 L 606 62" marker-end="url(#b16q1-arrow)"/>
  <rect class="d-box-accent" x="610" y="30" width="140" height="64" rx="10"/>
  <text class="d-text" x="680" y="58" text-anchor="middle">1 + max</text>
  <text class="d-sub" x="680" y="78" text-anchor="middle">height of this node</text>
  <path class="d-edge-dashed" d="M 85 96 L 300 166" marker-end="url(#b16q1-arrow)"/>
  <path class="d-edge-dashed" d="M 285 96 L 340 152" marker-end="url(#b16q1-arrow)"/>
  <path class="d-edge-dashed" d="M 485 96 L 420 152" marker-end="url(#b16q1-arrow)"/>
  <rect class="d-box-accent" x="300" y="156" width="160" height="60" rx="10"/>
  <text class="d-text" x="380" y="182" text-anchor="middle">return -1</text>
  <text class="d-sub" x="380" y="202" text-anchor="middle">unbalanced, stop</text>
</svg>

Each call does those four steps. A failure at any node travels straight up the call stack as -1, so the root returns -1 and the answer is "not balanced"; otherwise the root returns the real height of the whole tree and the answer is "balanced".

Here is the bottom-up pass on the unbalanced tree from section 3, one row per node in the order the calls finish:

| Node (in finishing order) | left height | right height | gap | returns |
| :--- | :--- | :--- | :--- | :--- |
| left-most 4 (leaf) | 0 | 0 | 0 | 1 |
| left 3 | 1 | 0 | 1 | 2 |
| left 2 | 2 | 0 | **2** | **-1** |
| root 1 | -1 | not computed | — | -1 (early exit) |

The right half of the tree is never visited: the left 2 already decided the answer.

## 5. The Code in Python

~~~python
def check_height(node):
    """Height of the subtree, or -1 as soon as any part of it is unbalanced."""
    if node is None:
        return 0
    left = check_height(node.left)
    if left == -1:
        return -1                      # stop: left subtree already failed
    right = check_height(node.right)
    if right == -1:
        return -1                      # stop: right subtree already failed
    if abs(left - right) > 1:
        return -1                      # this node breaks the rule
    return 1 + max(left, right)


def is_balanced(root):
    return check_height(root) != -1
~~~

**What to point out in this code:**

- \`if node is None: return 0\` is the [base case](/interview-question/what-is-recursion-and-what-is-a-base-case): an empty subtree has height 0 and is trivially balanced.
- Compare with \`left == -1\`, never \`if not left\`. Height 0 is a perfectly good answer for an empty child, and in Python \`not 0\` is \`True\` (our run printed it), so \`if not left: return -1\` would call every leaf's parent unbalanced.
- The right child is only explored when the left one succeeded. That early exit is why the trace above never touches the right half of the bad tree.
- The tree itself is a tiny class with \`val\`, \`left\` and \`right\`. The examples build it from a level-order list where \`None\` marks a missing child — the same format LeetCode uses — using \`collections.deque\` as the queue (see [level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree)).
- A Pythonic alternative is to return a tuple \`(balanced, height)\`. It reads well, but it allocates a tuple per node and you must remember to stop early yourself; the -1 sentinel keeps it to one int.

The brute force, for comparison (it is what example 2 measures):

~~~python
def height(node):
    if node is None:
        return 0
    work[0] += 1
    return 1 + max(height(node.left), height(node.right))


def top_down(node):
    """Naive: ask for both heights at every node, then recurse."""
    if node is None:
        return True
    if abs(height(node.left) - height(node.right)) > 1:
        return False
    return top_down(node.left) and top_down(node.right)
~~~

📌 **Interview term: Recursion limit** — Python caps how deep function calls may nest. \`sys.getrecursionlimit()\` printed **1000** in our run, and a 1,000-deep recursive call raised \`RecursionError: maximum recursion depth exceeded\`. A chain-shaped tree with a few thousand nodes therefore breaks any recursive solution unless you raise the limit (\`sys.setrecursionlimit\`) or rewrite it iteratively.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 1 runs the bottom-up check on seven trees, including the tricky one whose root is balanced but whose inner nodes are not. Example 2 counts how many real nodes each method touches: the top-down version on perfect trees, and both on a 500-node chain.

**Example 1 — the bottom-up check on seven trees** prints:

~~~text
true
false
false
true
false
true
true
~~~

**Example 2 — top-down vs bottom-up, nodes touched** prints:

~~~text
perfect tree, 3 levels (7 nodes): balanced true/true, top-down touched 10, bottom-up touched 7
perfect tree, 10 levels (1023 nodes): balanced true/true, top-down touched 8194, bottom-up touched 1023
perfect tree, 12 levels (4095 nodes): balanced true/true, top-down touched 40962, bottom-up touched 4095
left chain (500 nodes): balanced false/false, top-down touched 499, bottom-up touched 500
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Top-down (height at every node) | O(n · h), which is O(n log n) on a balanced tree | O(h) | a node at depth k is walked once per ancestor; 8,194 touches for 1,023 nodes and 40,962 for 4,095 in example 2 |
| Bottom-up with -1 sentinel | O(n) | O(h) | every node is visited at most once; exactly n touches on the perfect trees |

Here n is the number of nodes and h the height. The space is the recursion stack: O(log n) for a balanced tree, O(n) for a chain (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)). The touch counts in the table are from example 2, and they match the formula for perfect trees: the sum over levels of (level number × nodes on that level), which is 10 for 3 levels.

Example 2 also shows something honest about the chain: there the top-down version touched 499 nodes and the bottom-up one 500. On a chain the top-down check fails at the root after one height walk, while the bottom-up one first has to recurse all the way down before anything returns. Both are O(n) there; the bottom-up method's advantage is that it is O(n) on **every** input.

## 8. Edge Cases

- **Empty tree** — balanced (the base case returns height 0, never -1). Example 1 prints \`true\` for \`[]\`.
- **A single node** — balanced: both children are empty, gap 0.
- **The root passes but an inner node fails** — \`[1, 2, 2, 3, null, null, 3, 4, null, null, 4]\` must return false. This is the case that catches "only compare the root".
- **Gap of exactly 1 everywhere** — \`[1, 2, 3, 4, 5, 6, null, 8]\` is balanced even though it is lopsided; the rule allows 1.
- **A chain** (\`[1, null, 2, null, 3]\`) — unbalanced as soon as it has 3 nodes. A very long chain is also the input that can overflow the call stack.
- **Balanced is not the same as complete or perfect.** A balanced tree may have gaps anywhere; a complete tree is filled level by level from the left.

## Common Pitfalls

- **Checking only the root.** Comparing the heights of the root's two subtrees misses every deeper violation (the tree with the two 2s).
- **\`if not left\` instead of \`left == -1\`.** Height 0 is falsy in Python, so this marks every node with an empty child as a failure.
- **Forgetting to stop early.** Computing \`right\` even after \`left == -1\` still gives the right answer, but wastes the early exit and can mean extra work on huge trees.
- **Recursion depth.** The default limit of 1000 frames means a 1,000-node chain already raises \`RecursionError\`. Mention \`sys.setrecursionlimit\` or an iterative post-order traversal.
- **Mixing up height conventions.** Pick "nodes" (leaf = 1) or "edges" (leaf = 0) and keep it; mixing them inside one function produces off-by-one gaps.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;">A tree is height-balanced when, at <strong style="color:#ffca28;">every</strong> node, the left and right subtree heights differ by at most 1 — not just at the root.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Naive:</strong> <span style="color:#f0e2c8;">Compute both heights at every node: correct, but O(n · h), which is O(n log n) when balanced, because heights are recomputed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Optimal:</strong> <span style="color:#f0e2c8;">Post-order: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">check_height</code> returns the subtree height, or -1 the moment any subtree is unbalanced, and the parent stops early.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(h) stack — O(log n) when balanced, O(n) for a chain.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">left == -1</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if not left</code> (0 is falsy), and remember the default recursion limit of 1000.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the top-down version not O(n²) on a balanced tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each node is re-walked once per ancestor, and a balanced tree has only O(log n) ancestors per node, so the total is O(n log n). Our count for 4,095 nodes was 40,962 touches versus 4,095.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you avoid recursion for a very deep tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do a post-order walk with a list as a stack and a dict from node to height; process a node once both children are in the dict.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a balanced tree the same as a complete tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Complete means every level is full except possibly the last, which fills from the left. A balanced tree only limits the height gap at each node and may have holes anywhere.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the first node that breaks the rule?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the same post-order walk, but when the gap is over 1, store that node in an outer variable before returning -1. That stores the first failing node the post-order walk finishes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do balanced trees matter in practice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Search, insert and delete in a binary search tree cost O(height). Balanced means height O(log n); AVL and red-black trees rebalance after every change to keep it that way.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Height of a subtree** | Nodes on the longest path from that node down to a leaf (empty = 0) |
| **Height-balanced binary tree** | At every node, left and right heights differ by at most 1 |
| **Top-down recursion** | Parent checks first, then asks children; repeats work here |
| **Post-order traversal** | Left, right, then the node: children report before the parent decides |
| **Sentinel return value** | A value like -1 that can never be a real answer, used to signal failure |
| **Early exit (short-circuit)** | Stop as soon as the answer is known |
| **Recursion limit** | Python's cap on nested calls; 1000 by default (\`sys.getrecursionlimit()\`) |

Related: the [diameter of a binary tree](/interview-question/how-do-you-compute-the-diameter-of-a-binary-tree) uses the same "return the height, record something on the side" pattern.

---
**Conclusion:** Checking balance in Python is one post-order helper: return the subtree height, or -1 the moment any node's two heights differ by more than one, and let that -1 short-circuit all the way to the root. It visits every node at most once (O(n) time, O(h) stack), where the literal top-down translation re-walks each node once per ancestor (8,194 touches instead of 1,023 in our run). The Python-specific traps are treating height 0 as falsy and the 1000-frame recursion limit on skewed trees.`,
        examples: [
          {
            label: "Bottom-up check with a -1 sentinel (7 trees)",
            code: `from collections import deque


class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def build(values):
    """Build a tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = Node(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = Node(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = Node(values[i])
            queue.append(node.right)
        i += 1
    return root


def check_height(node):
    """Height of the subtree, or -1 as soon as any part of it is unbalanced."""
    if node is None:
        return 0
    left = check_height(node.left)
    if left == -1:
        return -1                      # stop: left subtree already failed
    right = check_height(node.right)
    if right == -1:
        return -1                      # stop: right subtree already failed
    if abs(left - right) > 1:
        return -1                      # this node breaks the rule
    return 1 + max(left, right)


def is_balanced(root):
    return check_height(root) != -1


def check(values):
    return str(is_balanced(build(values))).lower()


print(check([3, 9, 20, None, None, 15, 7]))  # true
print(check([1, 2, 2, 3, 3, None, None, 4, 4]))  # false
print(check([1, 2, 2, 3, None, None, 3, 4, None, None, 4]))  # false
print(check([1, 2, 3, 4, 5, 6, None, 8]))  # true
print(check([1, None, 2, None, 3]))  # false
print(check([1]))  # true
print(check([]))  # true`,
          },
          {
            label: "Top-down vs bottom-up: nodes touched",
            code: `class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def perfect(depth, counter):
    """A perfect tree with the given number of levels; values are 1, 2, 3, ..."""
    if depth == 0:
        return None
    counter[0] += 1
    node = Node(counter[0])
    node.left = perfect(depth - 1, counter)
    node.right = perfect(depth - 1, counter)
    return node


def chain(n):
    """n nodes, each the left child of the one above: a linked list."""
    root = Node(1)
    cur = root
    for v in range(2, n + 1):
        cur.left = Node(v)
        cur = cur.left
    return root


work = [0]  # how many real nodes each method touches


def height(node):
    if node is None:
        return 0
    work[0] += 1
    return 1 + max(height(node.left), height(node.right))


def top_down(node):
    """Naive: ask for both heights at every node, then recurse."""
    if node is None:
        return True
    if abs(height(node.left) - height(node.right)) > 1:
        return False
    return top_down(node.left) and top_down(node.right)


def check_height(node):
    """Bottom-up: one post-order pass, -1 means unbalanced."""
    if node is None:
        return 0
    work[0] += 1
    left = check_height(node.left)
    if left == -1:
        return -1
    right = check_height(node.right)
    if right == -1:
        return -1
    if abs(left - right) > 1:
        return -1
    return 1 + max(left, right)


def compare(name, root, n):
    work[0] = 0
    a = top_down(root)
    top = work[0]
    work[0] = 0
    b = check_height(root) != -1
    bottom = work[0]
    print(name + " (" + str(n) + " nodes): balanced " + str(a).lower() + "/" + str(b).lower()
          + ", top-down touched " + str(top) + ", bottom-up touched " + str(bottom))


for d in [3, 10, 12]:
    n = 2 ** d - 1
    compare("perfect tree, " + str(d) + " levels", perfect(d, [0]), n)
compare("left chain", chain(500), 500)`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given the root of a binary tree, a tree of objects with \`val\`, \`left\` and \`right\` (missing children are \`null\`). Write a JavaScript function that returns true if the tree is height-balanced — meaning that at every node, the heights of the left and right subtrees differ by at most one — and false otherwise."

**What a strong answer should cover:**
- The definition applies at every node, not just the root, and an empty tree is balanced.
- The naive top-down approach (compute both heights at every node) and why it repeats work: O(n · h), so O(n log n) on a balanced tree.
- The bottom-up post-order approach: return the height, or a sentinel such as -1 as soon as a subtree fails, so the whole check is O(n).
- Space is the recursion stack, O(h): O(log n) when balanced, O(n) for a chain.
- JavaScript details: return -1 rather than \`false\` (booleans coerce in arithmetic), strict \`===\`, and the engine's call-stack limit on deep trees.
- Why balance matters: search trees stay O(log n) only while their height is small.

**Clarifying questions expected:**
- Is "balanced" the height-gap-at-most-one definition, and is an empty tree balanced?
- Can the tree be very deep (risk of stack overflow)?

**Code / implementation expected:** Yes — \`checkHeight(node)\` returning a number, plus \`isBalanced(root)\`, in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree and a recursive function are; everything else is explained.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a mobile hanging over a baby's cot: a stick, with a string at each end, and on each string either a toy or another, smaller stick with its own two strings. It only hangs nicely if **every** stick is roughly level. A mobile where the top stick is perfectly level but one of the lower sticks droops badly still looks broken.

A binary tree is the same picture turned into data. Each node is a stick, its left and right subtrees hang from it, and "how far down does this side go" is the subtree's **height**. A tree is *balanced* when, at every single node, the left side and the right side hang to almost the same depth — they may differ by at most one level.

Why do interviewers care? Because balance is what keeps trees fast. A [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) answers a lookup in time proportional to its height. If it stays balanced, the height is about log₂ n (20 levels for a million keys); if it degenerates into a chain, the height is n and every lookup is a linear scan. Self-balancing trees (AVL trees, red-black trees) exist precisely to keep that height small — see the [time complexity of common operations on balanced trees](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance).

The coding question is smaller than that: *given a tree, tell me whether it is balanced.* It is a favourite because the obvious answer is correct but wasteful, and the good answer teaches one of the most useful tree tricks there is: **let each recursive call return two facts at once.**

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which definition of balanced: the gap between the left and right *heights* at every node is at most 1? | That is the usual ("height-balanced", AVL) definition. Some people mean "all leaves within one level of each other", which is a different, stricter test. |
| Is an empty tree balanced? | Yes by the usual definition (there is no node that breaks the rule). Saying so up front avoids a debate about the base case. |
| How many nodes, and can the tree be very deep (a long chain)? | A deep tree can overflow the call stack of a recursive solution. It decides whether you need an iterative version. |
| Do you only need true/false, or also where it fails? | Returning the first failing node is a small change, but it changes the return type. |
| Can I add a helper that returns the height? | The good solution is a helper that returns "height, or a failure flag". Asking makes it clear you are planning it. |

## 3. The Core Idea

First, two definitions.

📌 **Interview term: Height of a subtree** — the number of nodes on the longest path from that node down to a leaf. An empty subtree has height 0 and a single leaf has height 1. (Some books count edges instead, so a leaf is 0; either works here, because only *differences* between heights matter.) Computing the height is exactly the [maximum depth of a binary tree](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) problem.

📌 **Interview term: Height-balanced binary tree** — a tree in which, for **every** node, the heights of its left and right subtrees differ by at most 1. This is the balance rule AVL trees maintain.

The word *every* is the whole trap. Checking only the root is not enough:

<svg class="iq-diagram" width="100%" viewBox="0 0 520 290" role="img" aria-label="A balanced tree with root 3, children 9 and 20, and 20 has children 15 and 7. Every node has subtree heights that differ by at most one">
  <rect class="d-box-muted" x="124" y="4" width="272" height="28" rx="14"/>
  <text class="d-text" x="260" y="23" text-anchor="middle">Balanced: every gap is 0 or 1</text>
  <path class="d-edge" d="M 140 80 L 50 160"/>
  <path class="d-edge" d="M 140 80 L 320 160"/>
  <path class="d-edge" d="M 320 160 L 230 240"/>
  <path class="d-edge" d="M 320 160 L 410 240"/>
  <circle class="d-box" cx="140" cy="80" r="20"/>
  <text class="d-text" x="140" y="85" text-anchor="middle">3</text>
  <circle class="d-box" cx="50" cy="160" r="20"/>
  <text class="d-text" x="50" y="165" text-anchor="middle">9</text>
  <circle class="d-box" cx="320" cy="160" r="20"/>
  <text class="d-text" x="320" y="165" text-anchor="middle">20</text>
  <circle class="d-box" cx="230" cy="240" r="20"/>
  <text class="d-text" x="230" y="245" text-anchor="middle">15</text>
  <circle class="d-box" cx="410" cy="240" r="20"/>
  <text class="d-text" x="410" y="245" text-anchor="middle">7</text>
  <text class="d-sub" x="166" y="66">1 vs 2, ok</text>
  <text class="d-sub" x="24" y="146" text-anchor="end">h=1</text>
  <text class="d-sub" x="346" y="146">h=2</text>
  <text class="d-sub" x="204" y="226" text-anchor="end">h=1</text>
  <text class="d-sub" x="436" y="226">h=1</text>
</svg>

In the balanced tree above, the root sees heights 1 (left, node 9) and 2 (right, node 20): a gap of 1, allowed. Node 20 sees 1 and 1. Leaves see 0 and 0. Every gap is at most 1, so the tree is balanced.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 370" role="img" aria-label="A tree whose root has equal subtree heights 3 and 3, but each node with value 2 has heights 2 and 0, so the tree is not balanced">
  <rect class="d-box-muted" x="162" y="4" width="376" height="28" rx="14"/>
  <text class="d-text" x="350" y="23" text-anchor="middle">Not balanced: the root passes, the 2s fail</text>
  <path class="d-edge" d="M 320 80 L 230 160"/>
  <path class="d-edge" d="M 320 80 L 410 160"/>
  <path class="d-edge" d="M 230 160 L 140 240"/>
  <path class="d-edge" d="M 410 160 L 500 240"/>
  <path class="d-edge" d="M 140 240 L 50 320"/>
  <path class="d-edge" d="M 500 240 L 590 320"/>
  <circle class="d-box" cx="320" cy="80" r="20"/>
  <text class="d-text" x="320" y="85" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="230" cy="160" r="20"/>
  <text class="d-text" x="230" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="410" cy="160" r="20"/>
  <text class="d-text" x="410" y="165" text-anchor="middle">2</text>
  <circle class="d-box" cx="140" cy="240" r="20"/>
  <text class="d-text" x="140" y="245" text-anchor="middle">3</text>
  <circle class="d-box" cx="500" cy="240" r="20"/>
  <text class="d-text" x="500" y="245" text-anchor="middle">3</text>
  <circle class="d-box" cx="50" cy="320" r="20"/>
  <text class="d-text" x="50" y="325" text-anchor="middle">4</text>
  <circle class="d-box" cx="590" cy="320" r="20"/>
  <text class="d-text" x="590" y="325" text-anchor="middle">4</text>
  <text class="d-sub" x="346" y="66">3 vs 3, ok</text>
  <text class="d-sub" x="204" y="146" text-anchor="end">2 vs 0, fails</text>
  <text class="d-sub" x="436" y="146">2 vs 0, fails</text>
  <text class="d-sub" x="114" y="226" text-anchor="end">h=2</text>
  <text class="d-sub" x="526" y="226">h=2</text>
  <text class="d-sub" x="24" y="306" text-anchor="end">h=1</text>
  <text class="d-sub" x="616" y="306">h=1</text>
</svg>

In this second tree the root is perfectly happy — both sides have height 3 — but each node with value 2 has a left side of height 2 and an empty right side. A gap of 2 at any node makes the whole tree unbalanced. A solution that only compares the two sides of the root returns the wrong answer here; example 1 includes this exact tree.

## 4. From Brute Force to One Bottom-Up Pass

**Brute force (top-down).** Translate the definition literally: at the root, compute the height of the left subtree and the height of the right subtree (each a full walk), compare them, then recurse into both children and do the same there. It is correct, and it is a fine thing to say first. The waste is that the same heights are recomputed over and over: a node at depth k is walked once for each of its k ancestors.

📌 **Interview term: Top-down recursion** — the parent does its own check first and then asks the children to check themselves; information flows from the root downwards, and here that means each level recomputes the work of the levels below.

**Optimal (bottom-up).** Turn it around. Visit the children *first*, and let each call return its subtree's height. The parent then has both heights for free and can check its own gap in O(1). The only extra need is a way to say "this subtree is already unbalanced, stop", and the classic trick is to return a value that can never be a real height: **-1**.

📌 **Interview term: Post-order traversal** — visit the left subtree, then the right subtree, then the node itself. A node is processed only after both children have reported back, which is exactly what a bottom-up check needs. See the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods).

📌 **Interview term: Sentinel return value** — a special value (here -1) that cannot be a normal answer and is used to signal "failed". It lets one integer carry two facts: the height when things are fine, and the failure flag when they are not.

📌 **Interview term: Early exit (short-circuit)** — stopping the moment the answer is known. As soon as one subtree returns -1, every ancestor returns -1 immediately without looking at its other child.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Bottom-up check at one node: get the left result, get the right result, compare the heights, then return one plus the larger height or return minus one">
  <defs>
    <marker id="b16q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="10" y="30" width="150" height="64" rx="10"/>
  <text class="d-text" x="85" y="58" text-anchor="middle">left = check(L)</text>
  <text class="d-sub" x="85" y="78" text-anchor="middle">children first</text>
  <path class="d-edge" d="M 162 62 L 206 62" marker-end="url(#b16q1-arrow)"/>
  <rect class="d-box" x="210" y="30" width="150" height="64" rx="10"/>
  <text class="d-text" x="285" y="58" text-anchor="middle">right = check(R)</text>
  <text class="d-sub" x="285" y="78" text-anchor="middle">skipped if left failed</text>
  <path class="d-edge" d="M 362 62 L 406 62" marker-end="url(#b16q1-arrow)"/>
  <rect class="d-box-muted" x="410" y="30" width="150" height="64" rx="10"/>
  <text class="d-text" x="485" y="58" text-anchor="middle">gap over 1?</text>
  <text class="d-sub" x="485" y="78" text-anchor="middle">abs(left - right)</text>
  <path class="d-edge" d="M 562 62 L 606 62" marker-end="url(#b16q1-arrow)"/>
  <rect class="d-box-accent" x="610" y="30" width="140" height="64" rx="10"/>
  <text class="d-text" x="680" y="58" text-anchor="middle">1 + max</text>
  <text class="d-sub" x="680" y="78" text-anchor="middle">height of this node</text>
  <path class="d-edge-dashed" d="M 85 96 L 300 166" marker-end="url(#b16q1-arrow)"/>
  <path class="d-edge-dashed" d="M 285 96 L 340 152" marker-end="url(#b16q1-arrow)"/>
  <path class="d-edge-dashed" d="M 485 96 L 420 152" marker-end="url(#b16q1-arrow)"/>
  <rect class="d-box-accent" x="300" y="156" width="160" height="60" rx="10"/>
  <text class="d-text" x="380" y="182" text-anchor="middle">return -1</text>
  <text class="d-sub" x="380" y="202" text-anchor="middle">unbalanced, stop</text>
</svg>

Each call does those four steps. A failure at any node travels straight up the call stack as -1, so the root returns -1 and the answer is "not balanced"; otherwise the root returns the real height of the whole tree and the answer is "balanced".

Here is the bottom-up pass on the unbalanced tree from section 3, one row per node in the order the calls finish:

| Node (in finishing order) | left height | right height | gap | returns |
| :--- | :--- | :--- | :--- | :--- |
| left-most 4 (leaf) | 0 | 0 | 0 | 1 |
| left 3 | 1 | 0 | 1 | 2 |
| left 2 | 2 | 0 | **2** | **-1** |
| root 1 | -1 | not computed | — | -1 (early exit) |

The right half of the tree is never visited: the left 2 already decided the answer.

## 5. The Code in JavaScript

~~~javascript
// Height of the subtree, or -1 as soon as any part of it is unbalanced.
function checkHeight(node) {
  if (node === null) return 0;
  const left = checkHeight(node.left);
  if (left === -1) return -1;            // stop: left subtree already failed
  const right = checkHeight(node.right);
  if (right === -1) return -1;           // stop: right subtree already failed
  if (Math.abs(left - right) > 1) return -1; // this node breaks the rule
  return 1 + Math.max(left, right);
}

function isBalanced(root) {
  return checkHeight(root) !== -1;
}
~~~

**What to point out in this code:**

- \`if (node === null) return 0\` is the [base case](/interview-question/what-is-recursion-and-what-is-a-base-case). The examples always store missing children as \`null\`; if your tree uses \`undefined\` for missing children, test \`node == null\` (loose equality matches both) or normalise when you build it.
- Use \`===\` for the sentinel check (\`left === -1\`). Do not return \`false\` for "unbalanced": JavaScript happily does arithmetic on booleans — \`1 + Math.max(false, 2)\` printed **3** in our run — so a mixed \`false\`/number return value silently turns into a wrong height instead of an error.
- The right child is only explored when the left one succeeded (early exit).
- The tree is a small \`class Node\` with \`val\`, \`left\` and \`right\`. The examples build it from a level-order array where \`null\` marks a missing child, using a plain array plus a \`head\` index as the queue instead of \`shift()\` (see [level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree) for why).

The brute force, for comparison (it is what example 2 measures):

~~~javascript
function height(node) {
  if (node === null) return 0;
  work++;
  return 1 + Math.max(height(node.left), height(node.right));
}

// Naive: ask for both heights at every node, then recurse.
function topDown(node) {
  if (node === null) return true;
  if (Math.abs(height(node.left) - height(node.right)) > 1) return false;
  return topDown(node.left) && topDown(node.right);
}
~~~

📌 **Interview term: Call stack limit** — JavaScript engines give recursion a fixed amount of stack. In our Node 22 run a simple recursive function managed about 10,900 nested calls before throwing \`RangeError: Maximum call stack size exceeded\`; the exact number depends on how big each frame is, so never rely on it. A chain-shaped tree with tens of thousands of nodes needs an iterative solution.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 1 runs the bottom-up check on seven trees, including the tricky one whose root is balanced but whose inner nodes are not. Example 2 counts how many real nodes each method touches: the top-down version on perfect trees, and both on a 500-node chain.

**Example 1 — the bottom-up check on seven trees** prints:

~~~text
true
false
false
true
false
true
true
~~~

**Example 2 — top-down vs bottom-up, nodes touched** prints:

~~~text
perfect tree, 3 levels (7 nodes): balanced true/true, top-down touched 10, bottom-up touched 7
perfect tree, 10 levels (1023 nodes): balanced true/true, top-down touched 8194, bottom-up touched 1023
perfect tree, 12 levels (4095 nodes): balanced true/true, top-down touched 40962, bottom-up touched 4095
left chain (500 nodes): balanced false/false, top-down touched 499, bottom-up touched 500
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Top-down (height at every node) | O(n · h), which is O(n log n) on a balanced tree | O(h) | a node at depth k is walked once per ancestor; 8,194 touches for 1,023 nodes and 40,962 for 4,095 in example 2 |
| Bottom-up with -1 sentinel | O(n) | O(h) | every node is visited at most once; exactly n touches on the perfect trees |

Here n is the number of nodes and h the height. The space is the recursion stack: O(log n) for a balanced tree, O(n) for a chain (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)). The touch counts in the table are from example 2, and they match the formula for perfect trees: the sum over levels of (level number × nodes on that level), which is 10 for 3 levels.

Example 2 also shows something honest about the chain: there the top-down version touched 499 nodes and the bottom-up one 500. On a chain the top-down check fails at the root after one height walk, while the bottom-up one first has to recurse all the way down before anything returns. Both are O(n) there; the bottom-up method's advantage is that it is O(n) on **every** input.

## 8. Edge Cases

- **Empty tree** — balanced (the base case returns height 0, never -1). Example 1 prints \`true\` for \`[]\`.
- **A single node** — balanced: both children are empty, gap 0.
- **The root passes but an inner node fails** — \`[1, 2, 2, 3, null, null, 3, 4, null, null, 4]\` must return false. This is the case that catches "only compare the root".
- **Gap of exactly 1 everywhere** — \`[1, 2, 3, 4, 5, 6, null, 8]\` is balanced even though it is lopsided; the rule allows 1.
- **A chain** (\`[1, null, 2, null, 3]\`) — unbalanced as soon as it has 3 nodes. A very long chain is also the input that can overflow the call stack.
- **Balanced is not the same as complete or perfect.** A balanced tree may have gaps anywhere; a complete tree is filled level by level from the left.

## Common Pitfalls

- **Checking only the root.** Comparing the heights of the root's two subtrees misses every deeper violation (the tree with the two 2s).
- **Returning \`false\` for failure and a number for success.** \`Math.max(false, 2)\` is 2 and \`1 + false\` is 1, so the failure silently becomes a height. Use -1 (or an object \`{ ok, height }\`).
- **\`if (!left)\` instead of \`left === -1\`.** \`!0\` is \`true\`, so every node with an empty child would look like a failure.
- **\`undefined\` vs \`null\` children.** If a tree is built with missing properties instead of \`null\`, \`node === null\` is never true and the code crashes on \`undefined.left\`. Use \`node == null\` or normalise.
- **Deep chains.** About ten thousand nested calls overflowed the stack in our Node run; mention an iterative version for skewed input.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;">A tree is height-balanced when, at <strong style="color:#ffca28;">every</strong> node, the left and right subtree heights differ by at most 1 — not just at the root.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Naive:</strong> <span style="color:#f0e2c8;">Compute both heights at every node: correct, but O(n · h), which is O(n log n) when balanced, because heights are recomputed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Optimal:</strong> <span style="color:#f0e2c8;">Post-order: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">checkHeight</code> returns the subtree height, or -1 the moment any subtree is unbalanced, and the parent stops early.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(h) stack — O(log n) when balanced, O(n) for a chain.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Return -1, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>: booleans silently join arithmetic, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + Math.max(false, 2)</code> is 3.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the top-down version not O(n²) on a balanced tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each node is re-walked once per ancestor, and a balanced tree has only O(log n) ancestors per node, so the total is O(n log n). Our count for 4,095 nodes was 40,962 touches versus 4,095.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you avoid recursion for a very deep tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do a post-order walk with an array as a stack and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> from node to height; process a node once both children have entries.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a balanced tree the same as a complete tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Complete means every level is full except possibly the last, which fills from the left. A balanced tree only limits the height gap at each node and may have holes anywhere.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the first node that breaks the rule?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the same post-order walk, but when the gap is over 1, store that node in an outer variable before returning -1. That stores the first failing node the post-order walk finishes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do balanced trees matter in practice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Search, insert and delete in a binary search tree cost O(height). Balanced means height O(log n); AVL and red-black trees rebalance after every change to keep it that way.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Height of a subtree** | Nodes on the longest path from that node down to a leaf (empty = 0) |
| **Height-balanced binary tree** | At every node, left and right heights differ by at most 1 |
| **Top-down recursion** | Parent checks first, then asks children; repeats work here |
| **Post-order traversal** | Left, right, then the node: children report before the parent decides |
| **Sentinel return value** | A value like -1 that can never be a real answer, used to signal failure |
| **Early exit (short-circuit)** | Stop as soon as the answer is known |
| **Call stack limit** | The engine's fixed stack for recursion; overflow throws \`RangeError\` |

Related: the [diameter of a binary tree](/interview-question/how-do-you-compute-the-diameter-of-a-binary-tree) uses the same "return the height, record something on the side" pattern.

---
**Conclusion:** Checking balance in JavaScript is one post-order helper: return the subtree height, or -1 the moment any node's two heights differ by more than one, and let that -1 short-circuit to the root. It visits every node at most once (O(n) time, O(h) stack), where the top-down translation re-walks each node once per ancestor (8,194 touches instead of 1,023 in our run). The JavaScript-specific traps are mixing \`false\` with numbers, \`!0\` being true, and the engine's call-stack limit on very deep trees.`,
        examples: [
          {
            label: "Bottom-up check with a -1 sentinel (7 trees)",
            code: `class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// Build a tree from a level-order array; null marks a missing child.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new Node(values[0]);
  const queue = [root];
  let head = 0; // index of the next node to fill (cheaper than queue.shift())
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) {
      node.left = new Node(values[i]);
      queue.push(node.left);
    }
    i++;
    if (i < values.length && values[i] !== null) {
      node.right = new Node(values[i]);
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

// Height of the subtree, or -1 as soon as any part of it is unbalanced.
function checkHeight(node) {
  if (node === null) return 0;
  const left = checkHeight(node.left);
  if (left === -1) return -1;            // stop: left subtree already failed
  const right = checkHeight(node.right);
  if (right === -1) return -1;           // stop: right subtree already failed
  if (Math.abs(left - right) > 1) return -1; // this node breaks the rule
  return 1 + Math.max(left, right);
}

function isBalanced(root) {
  return checkHeight(root) !== -1;
}

function check(values) {
  return String(isBalanced(build(values)));
}

console.log(check([3, 9, 20, null, null, 15, 7])); // true
console.log(check([1, 2, 2, 3, 3, null, null, 4, 4])); // false
console.log(check([1, 2, 2, 3, null, null, 3, 4, null, null, 4])); // false
console.log(check([1, 2, 3, 4, 5, 6, null, 8])); // true
console.log(check([1, null, 2, null, 3])); // false
console.log(check([1])); // true
console.log(check([])); // true`,
          },
          {
            label: "Top-down vs bottom-up: nodes touched",
            code: `class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// A perfect tree with the given number of levels; values are 1, 2, 3, ...
function perfect(depth, counter) {
  if (depth === 0) return null;
  counter.n += 1;
  const node = new Node(counter.n);
  node.left = perfect(depth - 1, counter);
  node.right = perfect(depth - 1, counter);
  return node;
}

// n nodes, each the left child of the one above: a linked list.
function chain(n) {
  const root = new Node(1);
  let cur = root;
  for (let v = 2; v <= n; v++) {
    cur.left = new Node(v);
    cur = cur.left;
  }
  return root;
}

let work = 0; // how many real nodes each method touches

function height(node) {
  if (node === null) return 0;
  work++;
  return 1 + Math.max(height(node.left), height(node.right));
}

// Naive: ask for both heights at every node, then recurse.
function topDown(node) {
  if (node === null) return true;
  if (Math.abs(height(node.left) - height(node.right)) > 1) return false;
  return topDown(node.left) && topDown(node.right);
}

// Bottom-up: one post-order pass, -1 means unbalanced.
function checkHeight(node) {
  if (node === null) return 0;
  work++;
  const left = checkHeight(node.left);
  if (left === -1) return -1;
  const right = checkHeight(node.right);
  if (right === -1) return -1;
  if (Math.abs(left - right) > 1) return -1;
  return 1 + Math.max(left, right);
}

function compare(name, root, n) {
  work = 0;
  const a = topDown(root);
  const top = work;
  work = 0;
  const b = checkHeight(root) !== -1;
  const bottom = work;
  console.log(name + ' (' + n + ' nodes): balanced ' + a + '/' + b +
    ', top-down touched ' + top + ', bottom-up touched ' + bottom);
}

for (const d of [3, 10, 12]) {
  const n = 2 ** d - 1;
  compare('perfect tree, ' + d + ' levels', perfect(d, { n: 0 }), n);
}
compare('left chain', chain(500), 500);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given the root of a binary tree, a tree of \`Node\` objects with an \`int val\` and \`left\`/\`right\` references. Write a Java function that returns true if the tree is height-balanced — meaning that at every node, the heights of the left and right subtrees differ by at most one — and false otherwise."

**What a strong answer should cover:**
- The definition applies at every node, not just the root, and an empty tree is balanced.
- The naive top-down approach (compute both heights at every node) and why it repeats work: O(n · h), so O(n log n) on a balanced tree.
- The bottom-up post-order approach: return the height, or a sentinel such as -1 as soon as a subtree fails, so the whole check is O(n).
- Space is the recursion stack, O(h): O(log n) when balanced, O(n) for a chain.
- Java details: keep heights as \`int\` (no boxing, no \`Integer ==\` trap), and \`StackOverflowError\` on very deep trees.
- Why balance matters: search trees stay O(log n) only while their height is small.

**Clarifying questions expected:**
- Is "balanced" the height-gap-at-most-one definition, and is an empty tree balanced?
- Can the tree be very deep (risk of stack overflow)?

**Code / implementation expected:** Yes — \`static int checkHeight(Node node)\` plus \`static boolean isBalanced(Node root)\`, in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree and a recursive function are; everything else is explained.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a mobile hanging over a baby's cot: a stick, with a string at each end, and on each string either a toy or another, smaller stick with its own two strings. It only hangs nicely if **every** stick is roughly level. A mobile where the top stick is perfectly level but one of the lower sticks droops badly still looks broken.

A binary tree is the same picture turned into data. Each node is a stick, its left and right subtrees hang from it, and "how far down does this side go" is the subtree's **height**. A tree is *balanced* when, at every single node, the left side and the right side hang to almost the same depth — they may differ by at most one level.

Why do interviewers care? Because balance is what keeps trees fast. A [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) answers a lookup in time proportional to its height. If it stays balanced, the height is about log₂ n (20 levels for a million keys); if it degenerates into a chain, the height is n and every lookup is a linear scan. Self-balancing trees (AVL trees, red-black trees) exist precisely to keep that height small — see the [time complexity of common operations on balanced trees](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance).

The coding question is smaller than that: *given a tree, tell me whether it is balanced.* It is a favourite because the obvious answer is correct but wasteful, and the good answer teaches one of the most useful tree tricks there is: **let each recursive call return two facts at once.**

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which definition of balanced: the gap between the left and right *heights* at every node is at most 1? | That is the usual ("height-balanced", AVL) definition. Some people mean "all leaves within one level of each other", which is a different, stricter test. |
| Is an empty tree balanced? | Yes by the usual definition (there is no node that breaks the rule). Saying so up front avoids a debate about the base case. |
| How many nodes, and can the tree be very deep (a long chain)? | A deep tree can overflow the call stack of a recursive solution. It decides whether you need an iterative version. |
| Do you only need true/false, or also where it fails? | Returning the first failing node is a small change, but it changes the return type. |
| Can I add a helper that returns the height? | The good solution is a helper that returns "height, or a failure flag". Asking makes it clear you are planning it. |

## 3. The Core Idea

First, two definitions.

📌 **Interview term: Height of a subtree** — the number of nodes on the longest path from that node down to a leaf. An empty subtree has height 0 and a single leaf has height 1. (Some books count edges instead, so a leaf is 0; either works here, because only *differences* between heights matter.) Computing the height is exactly the [maximum depth of a binary tree](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) problem.

📌 **Interview term: Height-balanced binary tree** — a tree in which, for **every** node, the heights of its left and right subtrees differ by at most 1. This is the balance rule AVL trees maintain.

The word *every* is the whole trap. Checking only the root is not enough:

<svg class="iq-diagram" width="100%" viewBox="0 0 520 290" role="img" aria-label="A balanced tree with root 3, children 9 and 20, and 20 has children 15 and 7. Every node has subtree heights that differ by at most one">
  <rect class="d-box-muted" x="124" y="4" width="272" height="28" rx="14"/>
  <text class="d-text" x="260" y="23" text-anchor="middle">Balanced: every gap is 0 or 1</text>
  <path class="d-edge" d="M 140 80 L 50 160"/>
  <path class="d-edge" d="M 140 80 L 320 160"/>
  <path class="d-edge" d="M 320 160 L 230 240"/>
  <path class="d-edge" d="M 320 160 L 410 240"/>
  <circle class="d-box" cx="140" cy="80" r="20"/>
  <text class="d-text" x="140" y="85" text-anchor="middle">3</text>
  <circle class="d-box" cx="50" cy="160" r="20"/>
  <text class="d-text" x="50" y="165" text-anchor="middle">9</text>
  <circle class="d-box" cx="320" cy="160" r="20"/>
  <text class="d-text" x="320" y="165" text-anchor="middle">20</text>
  <circle class="d-box" cx="230" cy="240" r="20"/>
  <text class="d-text" x="230" y="245" text-anchor="middle">15</text>
  <circle class="d-box" cx="410" cy="240" r="20"/>
  <text class="d-text" x="410" y="245" text-anchor="middle">7</text>
  <text class="d-sub" x="166" y="66">1 vs 2, ok</text>
  <text class="d-sub" x="24" y="146" text-anchor="end">h=1</text>
  <text class="d-sub" x="346" y="146">h=2</text>
  <text class="d-sub" x="204" y="226" text-anchor="end">h=1</text>
  <text class="d-sub" x="436" y="226">h=1</text>
</svg>

In the balanced tree above, the root sees heights 1 (left, node 9) and 2 (right, node 20): a gap of 1, allowed. Node 20 sees 1 and 1. Leaves see 0 and 0. Every gap is at most 1, so the tree is balanced.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 370" role="img" aria-label="A tree whose root has equal subtree heights 3 and 3, but each node with value 2 has heights 2 and 0, so the tree is not balanced">
  <rect class="d-box-muted" x="162" y="4" width="376" height="28" rx="14"/>
  <text class="d-text" x="350" y="23" text-anchor="middle">Not balanced: the root passes, the 2s fail</text>
  <path class="d-edge" d="M 320 80 L 230 160"/>
  <path class="d-edge" d="M 320 80 L 410 160"/>
  <path class="d-edge" d="M 230 160 L 140 240"/>
  <path class="d-edge" d="M 410 160 L 500 240"/>
  <path class="d-edge" d="M 140 240 L 50 320"/>
  <path class="d-edge" d="M 500 240 L 590 320"/>
  <circle class="d-box" cx="320" cy="80" r="20"/>
  <text class="d-text" x="320" y="85" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="230" cy="160" r="20"/>
  <text class="d-text" x="230" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="410" cy="160" r="20"/>
  <text class="d-text" x="410" y="165" text-anchor="middle">2</text>
  <circle class="d-box" cx="140" cy="240" r="20"/>
  <text class="d-text" x="140" y="245" text-anchor="middle">3</text>
  <circle class="d-box" cx="500" cy="240" r="20"/>
  <text class="d-text" x="500" y="245" text-anchor="middle">3</text>
  <circle class="d-box" cx="50" cy="320" r="20"/>
  <text class="d-text" x="50" y="325" text-anchor="middle">4</text>
  <circle class="d-box" cx="590" cy="320" r="20"/>
  <text class="d-text" x="590" y="325" text-anchor="middle">4</text>
  <text class="d-sub" x="346" y="66">3 vs 3, ok</text>
  <text class="d-sub" x="204" y="146" text-anchor="end">2 vs 0, fails</text>
  <text class="d-sub" x="436" y="146">2 vs 0, fails</text>
  <text class="d-sub" x="114" y="226" text-anchor="end">h=2</text>
  <text class="d-sub" x="526" y="226">h=2</text>
  <text class="d-sub" x="24" y="306" text-anchor="end">h=1</text>
  <text class="d-sub" x="616" y="306">h=1</text>
</svg>

In this second tree the root is perfectly happy — both sides have height 3 — but each node with value 2 has a left side of height 2 and an empty right side. A gap of 2 at any node makes the whole tree unbalanced. A solution that only compares the two sides of the root returns the wrong answer here; example 1 includes this exact tree.

## 4. From Brute Force to One Bottom-Up Pass

**Brute force (top-down).** Translate the definition literally: at the root, compute the height of the left subtree and the height of the right subtree (each a full walk), compare them, then recurse into both children and do the same there. It is correct, and it is a fine thing to say first. The waste is that the same heights are recomputed over and over: a node at depth k is walked once for each of its k ancestors.

📌 **Interview term: Top-down recursion** — the parent does its own check first and then asks the children to check themselves; information flows from the root downwards, and here that means each level recomputes the work of the levels below.

**Optimal (bottom-up).** Turn it around. Visit the children *first*, and let each call return its subtree's height. The parent then has both heights for free and can check its own gap in O(1). The only extra need is a way to say "this subtree is already unbalanced, stop", and the classic trick is to return a value that can never be a real height: **-1**.

📌 **Interview term: Post-order traversal** — visit the left subtree, then the right subtree, then the node itself. A node is processed only after both children have reported back, which is exactly what a bottom-up check needs. See the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods).

📌 **Interview term: Sentinel return value** — a special value (here -1) that cannot be a normal answer and is used to signal "failed". It lets one integer carry two facts: the height when things are fine, and the failure flag when they are not.

📌 **Interview term: Early exit (short-circuit)** — stopping the moment the answer is known. As soon as one subtree returns -1, every ancestor returns -1 immediately without looking at its other child.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Bottom-up check at one node: get the left result, get the right result, compare the heights, then return one plus the larger height or return minus one">
  <defs>
    <marker id="b16q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="10" y="30" width="150" height="64" rx="10"/>
  <text class="d-text" x="85" y="58" text-anchor="middle">left = check(L)</text>
  <text class="d-sub" x="85" y="78" text-anchor="middle">children first</text>
  <path class="d-edge" d="M 162 62 L 206 62" marker-end="url(#b16q1-arrow)"/>
  <rect class="d-box" x="210" y="30" width="150" height="64" rx="10"/>
  <text class="d-text" x="285" y="58" text-anchor="middle">right = check(R)</text>
  <text class="d-sub" x="285" y="78" text-anchor="middle">skipped if left failed</text>
  <path class="d-edge" d="M 362 62 L 406 62" marker-end="url(#b16q1-arrow)"/>
  <rect class="d-box-muted" x="410" y="30" width="150" height="64" rx="10"/>
  <text class="d-text" x="485" y="58" text-anchor="middle">gap over 1?</text>
  <text class="d-sub" x="485" y="78" text-anchor="middle">abs(left - right)</text>
  <path class="d-edge" d="M 562 62 L 606 62" marker-end="url(#b16q1-arrow)"/>
  <rect class="d-box-accent" x="610" y="30" width="140" height="64" rx="10"/>
  <text class="d-text" x="680" y="58" text-anchor="middle">1 + max</text>
  <text class="d-sub" x="680" y="78" text-anchor="middle">height of this node</text>
  <path class="d-edge-dashed" d="M 85 96 L 300 166" marker-end="url(#b16q1-arrow)"/>
  <path class="d-edge-dashed" d="M 285 96 L 340 152" marker-end="url(#b16q1-arrow)"/>
  <path class="d-edge-dashed" d="M 485 96 L 420 152" marker-end="url(#b16q1-arrow)"/>
  <rect class="d-box-accent" x="300" y="156" width="160" height="60" rx="10"/>
  <text class="d-text" x="380" y="182" text-anchor="middle">return -1</text>
  <text class="d-sub" x="380" y="202" text-anchor="middle">unbalanced, stop</text>
</svg>

Each call does those four steps. A failure at any node travels straight up the call stack as -1, so the root returns -1 and the answer is "not balanced"; otherwise the root returns the real height of the whole tree and the answer is "balanced".

Here is the bottom-up pass on the unbalanced tree from section 3, one row per node in the order the calls finish:

| Node (in finishing order) | left height | right height | gap | returns |
| :--- | :--- | :--- | :--- | :--- |
| left-most 4 (leaf) | 0 | 0 | 0 | 1 |
| left 3 | 1 | 0 | 1 | 2 |
| left 2 | 2 | 0 | **2** | **-1** |
| root 1 | -1 | not computed | — | -1 (early exit) |

The right half of the tree is never visited: the left 2 already decided the answer.

## 5. The Code in Java

~~~java
// Height of the subtree, or -1 as soon as any part of it is unbalanced.
static int checkHeight(Node node) {
    if (node == null) return 0;
    int left = checkHeight(node.left);
    if (left == -1) return -1;              // stop: left subtree already failed
    int right = checkHeight(node.right);
    if (right == -1) return -1;             // stop: right subtree already failed
    if (Math.abs(left - right) > 1) return -1; // this node breaks the rule
    return 1 + Math.max(left, right);
}

static boolean isBalanced(Node root) {
    return checkHeight(root) != -1;
}
~~~

**What to point out in this code:**

- \`if (node == null) return 0;\` is the [base case](/interview-question/what-is-recursion-and-what-is-a-base-case). For object references \`==\` compares identity, which is exactly what a null check needs.
- \`int\` is the right type: heights are small, and returning a primitive avoids boxing an \`Integer\` for every node.
- The right child is only explored when the left one succeeded (early exit).
- The examples build the tree from an \`Integer[]\` in level order, where \`null\` marks a missing child — the only reason the input is \`Integer[]\` instead of \`int[]\`. Unboxing such an element with \`int v = values[i]\` when it is \`null\` throws \`NullPointerException\`, so the builder checks \`values[i] != null\` first.
- If you prefer clarity over the sentinel, a small \`record Result(boolean ok, int height)\` (records are standard since Java 16) works too, at the cost of one object per node.

The brute force, for comparison (it is what example 2 measures):

~~~java
static int height(Node node) {
    if (node == null) return 0;
    work++;
    return 1 + Math.max(height(node.left), height(node.right));
}

// Naive: ask for both heights at every node, then recurse.
static boolean topDown(Node node) {
    if (node == null) return true;
    if (Math.abs(height(node.left) - height(node.right)) > 1) return false;
    return topDown(node.left) && topDown(node.right);
}
~~~

📌 **Interview term: StackOverflowError** — the error the JVM throws when recursion runs out of thread stack. In our run with the default stack, a simple recursive method 10,000 calls deep worked and one 100,000 calls deep threw \`StackOverflowError\`. A chain-shaped tree that deep needs an iterative solution (or a thread created with a bigger stack size).

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21 (the code only uses Java 17 features)). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 1 runs the bottom-up check on seven trees, including the tricky one whose root is balanced but whose inner nodes are not. Example 2 counts how many real nodes each method touches: the top-down version on perfect trees, and both on a 500-node chain.

**Example 1 — the bottom-up check on seven trees** prints:

~~~text
true
false
false
true
false
true
true
~~~

**Example 2 — top-down vs bottom-up, nodes touched** prints:

~~~text
perfect tree, 3 levels (7 nodes): balanced true/true, top-down touched 10, bottom-up touched 7
perfect tree, 10 levels (1023 nodes): balanced true/true, top-down touched 8194, bottom-up touched 1023
perfect tree, 12 levels (4095 nodes): balanced true/true, top-down touched 40962, bottom-up touched 4095
left chain (500 nodes): balanced false/false, top-down touched 499, bottom-up touched 500
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Top-down (height at every node) | O(n · h), which is O(n log n) on a balanced tree | O(h) | a node at depth k is walked once per ancestor; 8,194 touches for 1,023 nodes and 40,962 for 4,095 in example 2 |
| Bottom-up with -1 sentinel | O(n) | O(h) | every node is visited at most once; exactly n touches on the perfect trees |

Here n is the number of nodes and h the height. The space is the recursion stack: O(log n) for a balanced tree, O(n) for a chain (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)). The touch counts in the table are from example 2, and they match the formula for perfect trees: the sum over levels of (level number × nodes on that level), which is 10 for 3 levels.

Example 2 also shows something honest about the chain: there the top-down version touched 499 nodes and the bottom-up one 500. On a chain the top-down check fails at the root after one height walk, while the bottom-up one first has to recurse all the way down before anything returns. Both are O(n) there; the bottom-up method's advantage is that it is O(n) on **every** input.

## 8. Edge Cases

- **Empty tree** — balanced (the base case returns height 0, never -1). Example 1 prints \`true\` for \`[]\`.
- **A single node** — balanced: both children are empty, gap 0.
- **The root passes but an inner node fails** — \`[1, 2, 2, 3, null, null, 3, 4, null, null, 4]\` must return false. This is the case that catches "only compare the root".
- **Gap of exactly 1 everywhere** — \`[1, 2, 3, 4, 5, 6, null, 8]\` is balanced even though it is lopsided; the rule allows 1.
- **A chain** (\`[1, null, 2, null, 3]\`) — unbalanced as soon as it has 3 nodes. A very long chain is also the input that can overflow the call stack.
- **Balanced is not the same as complete or perfect.** A balanced tree may have gaps anywhere; a complete tree is filled level by level from the left.

## Common Pitfalls

- **Checking only the root.** Comparing the heights of the root's two subtrees misses every deeper violation (the tree with the two 2s).
- **Unboxing a null.** When the input is an \`Integer[]\` with \`null\` holes, \`int v = values[i]\` throws \`NullPointerException\`. Check for \`null\` first (the builder does).
- **Static state that is not reset.** If you keep a \`static boolean balanced\` flag instead of the -1 sentinel, reset it before every call, or the second test case inherits the first one's answer.
- **Using \`Integer\` heights and \`==\`.** Comparing two boxed \`Integer\` values with \`==\` compares references; our run printed \`true\` for 127 == 127 but \`false\` for 1000 == 1000. Keep heights as \`int\`.
- **Deep chains.** 100,000 nested calls threw \`StackOverflowError\` with the default stack in our run; mention an iterative post-order traversal for skewed trees.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;">A tree is height-balanced when, at <strong style="color:#ffca28;">every</strong> node, the left and right subtree heights differ by at most 1 — not just at the root.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Naive:</strong> <span style="color:#f0e2c8;">Compute both heights at every node: correct, but O(n · h), which is O(n log n) when balanced, because heights are recomputed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Optimal:</strong> <span style="color:#f0e2c8;">Post-order: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">checkHeight</code> returns the subtree height, or -1 the moment any subtree is unbalanced, and the parent stops early.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(h) stack — O(log n) when balanced, O(n) for a chain.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Keep heights as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code>, and expect <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code> on very deep chains.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the top-down version not O(n²) on a balanced tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each node is re-walked once per ancestor, and a balanced tree has only O(log n) ancestors per node, so the total is O(n log n). Our count for 4,095 nodes was 40,962 touches versus 4,095.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you avoid recursion for a very deep tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do a post-order walk with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> as a stack and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Node, Integer&gt;</code> of heights; process a node once both children are known.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a balanced tree the same as a complete tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Complete means every level is full except possibly the last, which fills from the left. A balanced tree only limits the height gap at each node and may have holes anywhere.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the first node that breaks the rule?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the same post-order walk, but when the gap is over 1, store that node in an outer variable before returning -1. That stores the first failing node the post-order walk finishes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do balanced trees matter in practice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Search, insert and delete in a binary search tree cost O(height). Balanced means height O(log n); AVL and red-black trees rebalance after every change to keep it that way.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Height of a subtree** | Nodes on the longest path from that node down to a leaf (empty = 0) |
| **Height-balanced binary tree** | At every node, left and right heights differ by at most 1 |
| **Top-down recursion** | Parent checks first, then asks children; repeats work here |
| **Post-order traversal** | Left, right, then the node: children report before the parent decides |
| **Sentinel return value** | A value like -1 that can never be a real answer, used to signal failure |
| **Early exit (short-circuit)** | Stop as soon as the answer is known |
| **StackOverflowError** | What the JVM throws when recursion runs out of thread stack |

Related: the [diameter of a binary tree](/interview-question/how-do-you-compute-the-diameter-of-a-binary-tree) uses the same "return the height, record something on the side" pattern.

---
**Conclusion:** Checking balance in Java is one post-order helper: return the subtree height as an \`int\`, or -1 the moment any node's two heights differ by more than one, and let that -1 short-circuit to the root. It visits every node at most once (O(n) time, O(h) stack), where the top-down translation re-walks each node once per ancestor (8,194 touches instead of 1,023 in our run). The Java-specific traps are unboxing null \`Integer\` input, static flags that are not reset, and \`StackOverflowError\` on very deep chains.`,
        examples: [
          {
            label: "Bottom-up check with a -1 sentinel (7 trees)",
            code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    // Build a tree from a level-order array; null marks a missing child.
    static Node build(Integer[] values) {
        if (values.length == 0 || values[0] == null) return null;
        Node root = new Node(values[0]);
        Deque<Node> queue = new ArrayDeque<>();
        queue.offer(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            Node node = queue.poll();
            if (i < values.length && values[i] != null) {
                node.left = new Node(values[i]);
                queue.offer(node.left);
            }
            i++;
            if (i < values.length && values[i] != null) {
                node.right = new Node(values[i]);
                queue.offer(node.right);
            }
            i++;
        }
        return root;
    }

    // Height of the subtree, or -1 as soon as any part of it is unbalanced.
    static int checkHeight(Node node) {
        if (node == null) return 0;
        int left = checkHeight(node.left);
        if (left == -1) return -1;              // stop: left subtree already failed
        int right = checkHeight(node.right);
        if (right == -1) return -1;             // stop: right subtree already failed
        if (Math.abs(left - right) > 1) return -1; // this node breaks the rule
        return 1 + Math.max(left, right);
    }

    static boolean isBalanced(Node root) {
        return checkHeight(root) != -1;
    }

    static String check(Integer[] values) {
        return String.valueOf(isBalanced(build(values)));
    }

    public static void main(String[] args) {
        System.out.println(check(new Integer[]{3, 9, 20, null, null, 15, 7}));          // true
        System.out.println(check(new Integer[]{1, 2, 2, 3, 3, null, null, 4, 4}));      // false
        System.out.println(check(new Integer[]{1, 2, 2, 3, null, null, 3, 4, null, null, 4})); // false
        System.out.println(check(new Integer[]{1, 2, 3, 4, 5, 6, null, 8}));            // true
        System.out.println(check(new Integer[]{1, null, 2, null, 3}));                  // false
        System.out.println(check(new Integer[]{1}));                                    // true
        System.out.println(check(new Integer[]{}));                                     // true
    }
}`,
          },
          {
            label: "Top-down vs bottom-up: nodes touched",
            code: `public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    static int counter = 0;
    static long work = 0; // how many real nodes each method touches

    // A perfect tree with the given number of levels; values are 1, 2, 3, ...
    static Node perfect(int depth) {
        if (depth == 0) return null;
        Node node = new Node(++counter);
        node.left = perfect(depth - 1);
        node.right = perfect(depth - 1);
        return node;
    }

    // n nodes, each the left child of the one above: a linked list.
    static Node chain(int n) {
        Node root = new Node(1);
        Node cur = root;
        for (int v = 2; v <= n; v++) {
            cur.left = new Node(v);
            cur = cur.left;
        }
        return root;
    }

    static int height(Node node) {
        if (node == null) return 0;
        work++;
        return 1 + Math.max(height(node.left), height(node.right));
    }

    // Naive: ask for both heights at every node, then recurse.
    static boolean topDown(Node node) {
        if (node == null) return true;
        if (Math.abs(height(node.left) - height(node.right)) > 1) return false;
        return topDown(node.left) && topDown(node.right);
    }

    // Bottom-up: one post-order pass, -1 means unbalanced.
    static int checkHeight(Node node) {
        if (node == null) return 0;
        work++;
        int left = checkHeight(node.left);
        if (left == -1) return -1;
        int right = checkHeight(node.right);
        if (right == -1) return -1;
        if (Math.abs(left - right) > 1) return -1;
        return 1 + Math.max(left, right);
    }

    static void compare(String name, Node root, int n) {
        work = 0;
        boolean a = topDown(root);
        long top = work;
        work = 0;
        boolean b = checkHeight(root) != -1;
        long bottom = work;
        System.out.println(name + " (" + n + " nodes): balanced " + a + "/" + b
            + ", top-down touched " + top + ", bottom-up touched " + bottom);
    }

    public static void main(String[] args) {
        for (int d : new int[]{3, 10, 12}) {
            int n = (1 << d) - 1;
            counter = 0;
            compare("perfect tree, " + d + " levels", perfect(d), n);
        }
        compare("left chain", chain(500), 500);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given the root of a binary tree, a tree of \`Node\` structs linked by raw pointers. Write a C++ function that returns true if the tree is height-balanced — meaning that at every node, the heights of the left and right subtrees differ by at most one — and false otherwise."

**What a strong answer should cover:**
- The definition applies at every node, not just the root, and an empty tree is balanced.
- The naive top-down approach (compute both heights at every node) and why it repeats work: O(n · h), so O(n log n) on a balanced tree.
- The bottom-up post-order approach: return the height, or a sentinel such as -1 as soon as a subtree fails, so the whole check is O(n).
- Space is the recursion stack, O(h): O(log n) when balanced, O(n) for a chain.
- C++ details: take \`const Node*\`, check \`nullptr\` before \`->\`, \`std::abs\` from \`<cstdlib>\`, and that stack overflow is a crash, not an exception.
- Why balance matters: search trees stay O(log n) only while their height is small.

**Clarifying questions expected:**
- Is "balanced" the height-gap-at-most-one definition, and is an empty tree balanced?
- Can the tree be very deep (risk of stack overflow)?

**Code / implementation expected:** Yes — \`int checkHeight(const Node* node)\` plus \`bool isBalanced(const Node* root)\`, in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree and a recursive function are; everything else is explained.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture a mobile hanging over a baby's cot: a stick, with a string at each end, and on each string either a toy or another, smaller stick with its own two strings. It only hangs nicely if **every** stick is roughly level. A mobile where the top stick is perfectly level but one of the lower sticks droops badly still looks broken.

A binary tree is the same picture turned into data. Each node is a stick, its left and right subtrees hang from it, and "how far down does this side go" is the subtree's **height**. A tree is *balanced* when, at every single node, the left side and the right side hang to almost the same depth — they may differ by at most one level.

Why do interviewers care? Because balance is what keeps trees fast. A [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) answers a lookup in time proportional to its height. If it stays balanced, the height is about log₂ n (20 levels for a million keys); if it degenerates into a chain, the height is n and every lookup is a linear scan. Self-balancing trees (AVL trees, red-black trees) exist precisely to keep that height small — see the [time complexity of common operations on balanced trees](/interview-question/what-is-the-time-complexity-of-common-operations-on-arrays-hash-maps-and-balance).

The coding question is smaller than that: *given a tree, tell me whether it is balanced.* It is a favourite because the obvious answer is correct but wasteful, and the good answer teaches one of the most useful tree tricks there is: **let each recursive call return two facts at once.**

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which definition of balanced: the gap between the left and right *heights* at every node is at most 1? | That is the usual ("height-balanced", AVL) definition. Some people mean "all leaves within one level of each other", which is a different, stricter test. |
| Is an empty tree balanced? | Yes by the usual definition (there is no node that breaks the rule). Saying so up front avoids a debate about the base case. |
| How many nodes, and can the tree be very deep (a long chain)? | A deep tree can overflow the call stack of a recursive solution. It decides whether you need an iterative version. |
| Do you only need true/false, or also where it fails? | Returning the first failing node is a small change, but it changes the return type. |
| Can I add a helper that returns the height? | The good solution is a helper that returns "height, or a failure flag". Asking makes it clear you are planning it. |

## 3. The Core Idea

First, two definitions.

📌 **Interview term: Height of a subtree** — the number of nodes on the longest path from that node down to a leaf. An empty subtree has height 0 and a single leaf has height 1. (Some books count edges instead, so a leaf is 0; either works here, because only *differences* between heights matter.) Computing the height is exactly the [maximum depth of a binary tree](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) problem.

📌 **Interview term: Height-balanced binary tree** — a tree in which, for **every** node, the heights of its left and right subtrees differ by at most 1. This is the balance rule AVL trees maintain.

The word *every* is the whole trap. Checking only the root is not enough:

<svg class="iq-diagram" width="100%" viewBox="0 0 520 290" role="img" aria-label="A balanced tree with root 3, children 9 and 20, and 20 has children 15 and 7. Every node has subtree heights that differ by at most one">
  <rect class="d-box-muted" x="124" y="4" width="272" height="28" rx="14"/>
  <text class="d-text" x="260" y="23" text-anchor="middle">Balanced: every gap is 0 or 1</text>
  <path class="d-edge" d="M 140 80 L 50 160"/>
  <path class="d-edge" d="M 140 80 L 320 160"/>
  <path class="d-edge" d="M 320 160 L 230 240"/>
  <path class="d-edge" d="M 320 160 L 410 240"/>
  <circle class="d-box" cx="140" cy="80" r="20"/>
  <text class="d-text" x="140" y="85" text-anchor="middle">3</text>
  <circle class="d-box" cx="50" cy="160" r="20"/>
  <text class="d-text" x="50" y="165" text-anchor="middle">9</text>
  <circle class="d-box" cx="320" cy="160" r="20"/>
  <text class="d-text" x="320" y="165" text-anchor="middle">20</text>
  <circle class="d-box" cx="230" cy="240" r="20"/>
  <text class="d-text" x="230" y="245" text-anchor="middle">15</text>
  <circle class="d-box" cx="410" cy="240" r="20"/>
  <text class="d-text" x="410" y="245" text-anchor="middle">7</text>
  <text class="d-sub" x="166" y="66">1 vs 2, ok</text>
  <text class="d-sub" x="24" y="146" text-anchor="end">h=1</text>
  <text class="d-sub" x="346" y="146">h=2</text>
  <text class="d-sub" x="204" y="226" text-anchor="end">h=1</text>
  <text class="d-sub" x="436" y="226">h=1</text>
</svg>

In the balanced tree above, the root sees heights 1 (left, node 9) and 2 (right, node 20): a gap of 1, allowed. Node 20 sees 1 and 1. Leaves see 0 and 0. Every gap is at most 1, so the tree is balanced.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 370" role="img" aria-label="A tree whose root has equal subtree heights 3 and 3, but each node with value 2 has heights 2 and 0, so the tree is not balanced">
  <rect class="d-box-muted" x="162" y="4" width="376" height="28" rx="14"/>
  <text class="d-text" x="350" y="23" text-anchor="middle">Not balanced: the root passes, the 2s fail</text>
  <path class="d-edge" d="M 320 80 L 230 160"/>
  <path class="d-edge" d="M 320 80 L 410 160"/>
  <path class="d-edge" d="M 230 160 L 140 240"/>
  <path class="d-edge" d="M 410 160 L 500 240"/>
  <path class="d-edge" d="M 140 240 L 50 320"/>
  <path class="d-edge" d="M 500 240 L 590 320"/>
  <circle class="d-box" cx="320" cy="80" r="20"/>
  <text class="d-text" x="320" y="85" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="230" cy="160" r="20"/>
  <text class="d-text" x="230" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="410" cy="160" r="20"/>
  <text class="d-text" x="410" y="165" text-anchor="middle">2</text>
  <circle class="d-box" cx="140" cy="240" r="20"/>
  <text class="d-text" x="140" y="245" text-anchor="middle">3</text>
  <circle class="d-box" cx="500" cy="240" r="20"/>
  <text class="d-text" x="500" y="245" text-anchor="middle">3</text>
  <circle class="d-box" cx="50" cy="320" r="20"/>
  <text class="d-text" x="50" y="325" text-anchor="middle">4</text>
  <circle class="d-box" cx="590" cy="320" r="20"/>
  <text class="d-text" x="590" y="325" text-anchor="middle">4</text>
  <text class="d-sub" x="346" y="66">3 vs 3, ok</text>
  <text class="d-sub" x="204" y="146" text-anchor="end">2 vs 0, fails</text>
  <text class="d-sub" x="436" y="146">2 vs 0, fails</text>
  <text class="d-sub" x="114" y="226" text-anchor="end">h=2</text>
  <text class="d-sub" x="526" y="226">h=2</text>
  <text class="d-sub" x="24" y="306" text-anchor="end">h=1</text>
  <text class="d-sub" x="616" y="306">h=1</text>
</svg>

In this second tree the root is perfectly happy — both sides have height 3 — but each node with value 2 has a left side of height 2 and an empty right side. A gap of 2 at any node makes the whole tree unbalanced. A solution that only compares the two sides of the root returns the wrong answer here; example 1 includes this exact tree.

## 4. From Brute Force to One Bottom-Up Pass

**Brute force (top-down).** Translate the definition literally: at the root, compute the height of the left subtree and the height of the right subtree (each a full walk), compare them, then recurse into both children and do the same there. It is correct, and it is a fine thing to say first. The waste is that the same heights are recomputed over and over: a node at depth k is walked once for each of its k ancestors.

📌 **Interview term: Top-down recursion** — the parent does its own check first and then asks the children to check themselves; information flows from the root downwards, and here that means each level recomputes the work of the levels below.

**Optimal (bottom-up).** Turn it around. Visit the children *first*, and let each call return its subtree's height. The parent then has both heights for free and can check its own gap in O(1). The only extra need is a way to say "this subtree is already unbalanced, stop", and the classic trick is to return a value that can never be a real height: **-1**.

📌 **Interview term: Post-order traversal** — visit the left subtree, then the right subtree, then the node itself. A node is processed only after both children have reported back, which is exactly what a bottom-up check needs. See the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods).

📌 **Interview term: Sentinel return value** — a special value (here -1) that cannot be a normal answer and is used to signal "failed". It lets one integer carry two facts: the height when things are fine, and the failure flag when they are not.

📌 **Interview term: Early exit (short-circuit)** — stopping the moment the answer is known. As soon as one subtree returns -1, every ancestor returns -1 immediately without looking at its other child.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Bottom-up check at one node: get the left result, get the right result, compare the heights, then return one plus the larger height or return minus one">
  <defs>
    <marker id="b16q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="10" y="30" width="150" height="64" rx="10"/>
  <text class="d-text" x="85" y="58" text-anchor="middle">left = check(L)</text>
  <text class="d-sub" x="85" y="78" text-anchor="middle">children first</text>
  <path class="d-edge" d="M 162 62 L 206 62" marker-end="url(#b16q1-arrow)"/>
  <rect class="d-box" x="210" y="30" width="150" height="64" rx="10"/>
  <text class="d-text" x="285" y="58" text-anchor="middle">right = check(R)</text>
  <text class="d-sub" x="285" y="78" text-anchor="middle">skipped if left failed</text>
  <path class="d-edge" d="M 362 62 L 406 62" marker-end="url(#b16q1-arrow)"/>
  <rect class="d-box-muted" x="410" y="30" width="150" height="64" rx="10"/>
  <text class="d-text" x="485" y="58" text-anchor="middle">gap over 1?</text>
  <text class="d-sub" x="485" y="78" text-anchor="middle">abs(left - right)</text>
  <path class="d-edge" d="M 562 62 L 606 62" marker-end="url(#b16q1-arrow)"/>
  <rect class="d-box-accent" x="610" y="30" width="140" height="64" rx="10"/>
  <text class="d-text" x="680" y="58" text-anchor="middle">1 + max</text>
  <text class="d-sub" x="680" y="78" text-anchor="middle">height of this node</text>
  <path class="d-edge-dashed" d="M 85 96 L 300 166" marker-end="url(#b16q1-arrow)"/>
  <path class="d-edge-dashed" d="M 285 96 L 340 152" marker-end="url(#b16q1-arrow)"/>
  <path class="d-edge-dashed" d="M 485 96 L 420 152" marker-end="url(#b16q1-arrow)"/>
  <rect class="d-box-accent" x="300" y="156" width="160" height="60" rx="10"/>
  <text class="d-text" x="380" y="182" text-anchor="middle">return -1</text>
  <text class="d-sub" x="380" y="202" text-anchor="middle">unbalanced, stop</text>
</svg>

Each call does those four steps. A failure at any node travels straight up the call stack as -1, so the root returns -1 and the answer is "not balanced"; otherwise the root returns the real height of the whole tree and the answer is "balanced".

Here is the bottom-up pass on the unbalanced tree from section 3, one row per node in the order the calls finish:

| Node (in finishing order) | left height | right height | gap | returns |
| :--- | :--- | :--- | :--- | :--- |
| left-most 4 (leaf) | 0 | 0 | 0 | 1 |
| left 3 | 1 | 0 | 1 | 2 |
| left 2 | 2 | 0 | **2** | **-1** |
| root 1 | -1 | not computed | — | -1 (early exit) |

The right half of the tree is never visited: the left 2 already decided the answer.

## 5. The Code in C++

~~~cpp
// Height of the subtree, or -1 as soon as any part of it is unbalanced.
int checkHeight(const Node* node) {
    if (node == nullptr) return 0;
    int left = checkHeight(node->left);
    if (left == -1) return -1;                  // stop: left subtree already failed
    int right = checkHeight(node->right);
    if (right == -1) return -1;                 // stop: right subtree already failed
    if (std::abs(left - right) > 1) return -1;  // this node breaks the rule
    return 1 + std::max(left, right);
}

bool isBalanced(const Node* root) { return checkHeight(root) != -1; }
~~~

**What to point out in this code:**

- \`const Node*\` says the check only reads the tree. \`nullptr\` (not \`NULL\` or \`0\`) is the C++11 null pointer and is the [base case](/interview-question/what-is-recursion-and-what-is-a-base-case).
- \`std::abs\` for \`int\` comes from \`<cstdlib>\`; \`std::max\` from \`<algorithm>\`. Include them yourself instead of relying on another header pulling them in.
- The right child is only explored when the left one succeeded (early exit).
- The examples build the tree from a \`std::vector<int>\` in level order, with \`INT_MIN\` (named \`N\`) marking a missing child, and keep every node in a \`std::vector<std::unique_ptr<Node>>\` so memory is freed automatically at exit while the tree links themselves stay plain raw pointers.
- If -1 feels too magic, \`std::optional<int>\` (C++17) expresses "height or nothing" in the type; it costs a little more to write in an interview.

The brute force, for comparison (it is what example 2 measures):

~~~cpp
int height(const Node* node) {
    if (node == nullptr) return 0;
    work++;
    return 1 + std::max(height(node->left), height(node->right));
}

// Naive: ask for both heights at every node, then recurse.
bool topDown(const Node* node) {
    if (node == nullptr) return true;
    if (std::abs(height(node->left) - height(node->right)) > 1) return false;
    return topDown(node->left) && topDown(node->right);
}
~~~

📌 **Interview term: Stack overflow (undefined behaviour)** — in C++ running out of stack is not an exception you can catch; the program usually just crashes. A chain-shaped tree with hundreds of thousands of nodes can do that to any recursive solution, so mention an iterative post-order version (explicit \`std::vector<const Node*>\` as a stack) for untrusted input.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13 with -std=c++17). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 1 runs the bottom-up check on seven trees, including the tricky one whose root is balanced but whose inner nodes are not. Example 2 counts how many real nodes each method touches: the top-down version on perfect trees, and both on a 500-node chain.

**Example 1 — the bottom-up check on seven trees** prints:

~~~text
true
false
false
true
false
true
true
~~~

**Example 2 — top-down vs bottom-up, nodes touched** prints:

~~~text
perfect tree, 3 levels (7 nodes): balanced true/true, top-down touched 10, bottom-up touched 7
perfect tree, 10 levels (1023 nodes): balanced true/true, top-down touched 8194, bottom-up touched 1023
perfect tree, 12 levels (4095 nodes): balanced true/true, top-down touched 40962, bottom-up touched 4095
left chain (500 nodes): balanced false/false, top-down touched 499, bottom-up touched 500
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Top-down (height at every node) | O(n · h), which is O(n log n) on a balanced tree | O(h) | a node at depth k is walked once per ancestor; 8,194 touches for 1,023 nodes and 40,962 for 4,095 in example 2 |
| Bottom-up with -1 sentinel | O(n) | O(h) | every node is visited at most once; exactly n touches on the perfect trees |

Here n is the number of nodes and h the height. The space is the recursion stack: O(log n) for a balanced tree, O(n) for a chain (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)). The touch counts in the table are from example 2, and they match the formula for perfect trees: the sum over levels of (level number × nodes on that level), which is 10 for 3 levels.

Example 2 also shows something honest about the chain: there the top-down version touched 499 nodes and the bottom-up one 500. On a chain the top-down check fails at the root after one height walk, while the bottom-up one first has to recurse all the way down before anything returns. Both are O(n) there; the bottom-up method's advantage is that it is O(n) on **every** input.

## 8. Edge Cases

- **Empty tree** — balanced (the base case returns height 0, never -1). Example 1 prints \`true\` for \`[]\`.
- **A single node** — balanced: both children are empty, gap 0.
- **The root passes but an inner node fails** — \`[1, 2, 2, 3, null, null, 3, 4, null, null, 4]\` must return false. This is the case that catches "only compare the root".
- **Gap of exactly 1 everywhere** — \`[1, 2, 3, 4, 5, 6, null, 8]\` is balanced even though it is lopsided; the rule allows 1.
- **A chain** (\`[1, null, 2, null, 3]\`) — unbalanced as soon as it has 3 nodes. A very long chain is also the input that can overflow the call stack.
- **Balanced is not the same as complete or perfect.** A balanced tree may have gaps anywhere; a complete tree is filled level by level from the left.

## Common Pitfalls

- **Checking only the root.** Comparing the heights of the root's two subtrees misses every deeper violation (the tree with the two 2s).
- **Leaking or dangling nodes.** Interview code often uses \`new Node(...)\` and never deletes; say that you would own nodes with \`std::unique_ptr\` (or a pool, as the examples do) in real code.
- **\`abs\` without \`std::\`.** Plain \`abs\` may resolve to the C function from \`<stdlib.h>\`; use \`std::abs\` with \`<cstdlib>\` included.
- **Dereferencing null.** Calling \`node->left\` before checking \`node == nullptr\` is undefined behaviour, not a clean exception — the base case must come first.
- **Deep chains.** Stack overflow in C++ is a crash, not a catchable error; for untrusted, skewed input use an explicit stack.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;">A tree is height-balanced when, at <strong style="color:#ffca28;">every</strong> node, the left and right subtree heights differ by at most 1 — not just at the root.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Naive:</strong> <span style="color:#f0e2c8;">Compute both heights at every node: correct, but O(n · h), which is O(n log n) when balanced, because heights are recomputed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Optimal:</strong> <span style="color:#f0e2c8;">Post-order: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">checkHeight</code> returns the subtree height, or -1 the moment any subtree is unbalanced, and the parent stops early.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(h) stack — O(log n) when balanced, O(n) for a chain.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const Node*</code>, check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-&gt;</code>, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::abs</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;cstdlib&gt;</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the top-down version not O(n²) on a balanced tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each node is re-walked once per ancestor, and a balanced tree has only O(log n) ancestors per node, so the total is O(n log n). Our count for 4,095 nodes was 40,962 touches versus 4,095.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you avoid recursion for a very deep tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do a post-order walk with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;const Node*&gt;</code> as a stack and an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::unordered_map&lt;const Node*, int&gt;</code> of heights.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a balanced tree the same as a complete tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Complete means every level is full except possibly the last, which fills from the left. A balanced tree only limits the height gap at each node and may have holes anywhere.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the first node that breaks the rule?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the same post-order walk, but when the gap is over 1, store that node in an outer variable before returning -1. That stores the first failing node the post-order walk finishes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do balanced trees matter in practice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Search, insert and delete in a binary search tree cost O(height). Balanced means height O(log n); AVL and red-black trees rebalance after every change to keep it that way.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Height of a subtree** | Nodes on the longest path from that node down to a leaf (empty = 0) |
| **Height-balanced binary tree** | At every node, left and right heights differ by at most 1 |
| **Top-down recursion** | Parent checks first, then asks children; repeats work here |
| **Post-order traversal** | Left, right, then the node: children report before the parent decides |
| **Sentinel return value** | A value like -1 that can never be a real answer, used to signal failure |
| **Early exit (short-circuit)** | Stop as soon as the answer is known |
| **Stack overflow (undefined behaviour)** | Running out of stack in C++: usually a crash, not a catchable error |

Related: the [diameter of a binary tree](/interview-question/how-do-you-compute-the-diameter-of-a-binary-tree) uses the same "return the height, record something on the side" pattern.

---
**Conclusion:** Checking balance in C++ is one post-order helper over \`const Node*\`: return the subtree height, or -1 the moment any node's two heights differ by more than one, and let that -1 short-circuit to the root. It visits every node at most once (O(n) time, O(h) stack), where the top-down translation re-walks each node once per ancestor (8,194 touches instead of 1,023 in our run). The C++-specific points are checking \`nullptr\` before dereferencing, owning nodes properly, and the fact that a stack overflow is a crash rather than an exception.`,
        examples: [
          {
            label: "Bottom-up check with a -1 sentinel (7 trees)",
            code: `#include <algorithm>
#include <climits>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <queue>
#include <vector>

struct Node {
    int val;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int v) : val(v) {}
};

const int N = INT_MIN;                       // marks a missing child in the input
std::vector<std::unique_ptr<Node>> pool;     // owns every node, frees them at exit

Node* make(int v) {
    pool.push_back(std::make_unique<Node>(v));
    return pool.back().get();
}

// Build a tree from a level-order vector; N marks a missing child.
Node* build(const std::vector<int>& values) {
    if (values.empty() || values[0] == N) return nullptr;
    Node* root = make(values[0]);
    std::queue<Node*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        Node* node = q.front();
        q.pop();
        if (i < values.size() && values[i] != N) {
            node->left = make(values[i]);
            q.push(node->left);
        }
        i++;
        if (i < values.size() && values[i] != N) {
            node->right = make(values[i]);
            q.push(node->right);
        }
        i++;
    }
    return root;
}

// Height of the subtree, or -1 as soon as any part of it is unbalanced.
int checkHeight(const Node* node) {
    if (node == nullptr) return 0;
    int left = checkHeight(node->left);
    if (left == -1) return -1;                  // stop: left subtree already failed
    int right = checkHeight(node->right);
    if (right == -1) return -1;                 // stop: right subtree already failed
    if (std::abs(left - right) > 1) return -1;  // this node breaks the rule
    return 1 + std::max(left, right);
}

bool isBalanced(const Node* root) { return checkHeight(root) != -1; }

void check(const std::vector<int>& values) {
    std::cout << std::boolalpha << isBalanced(build(values)) << "\\n";
}

int main() {
    check({3, 9, 20, N, N, 15, 7});              // true
    check({1, 2, 2, 3, 3, N, N, 4, 4});          // false
    check({1, 2, 2, 3, N, N, 3, 4, N, N, 4});    // false
    check({1, 2, 3, 4, 5, 6, N, 8});             // true
    check({1, N, 2, N, 3});                      // false
    check({1});                                  // true
    check({});                                   // true
}`,
          },
          {
            label: "Top-down vs bottom-up: nodes touched",
            code: `#include <algorithm>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct Node {
    int val;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int v) : val(v) {}
};

std::vector<std::unique_ptr<Node>> pool;   // owns every node
int counter = 0;
long long work = 0;                        // how many real nodes each method touches

Node* make(int v) {
    pool.push_back(std::make_unique<Node>(v));
    return pool.back().get();
}

// A perfect tree with the given number of levels; values are 1, 2, 3, ...
Node* perfect(int depth) {
    if (depth == 0) return nullptr;
    Node* node = make(++counter);
    node->left = perfect(depth - 1);
    node->right = perfect(depth - 1);
    return node;
}

// n nodes, each the left child of the one above: a linked list.
Node* chain(int n) {
    Node* root = make(1);
    Node* cur = root;
    for (int v = 2; v <= n; v++) {
        cur->left = make(v);
        cur = cur->left;
    }
    return root;
}

int height(const Node* node) {
    if (node == nullptr) return 0;
    work++;
    return 1 + std::max(height(node->left), height(node->right));
}

// Naive: ask for both heights at every node, then recurse.
bool topDown(const Node* node) {
    if (node == nullptr) return true;
    if (std::abs(height(node->left) - height(node->right)) > 1) return false;
    return topDown(node->left) && topDown(node->right);
}

// Bottom-up: one post-order pass, -1 means unbalanced.
int checkHeight(const Node* node) {
    if (node == nullptr) return 0;
    work++;
    int left = checkHeight(node->left);
    if (left == -1) return -1;
    int right = checkHeight(node->right);
    if (right == -1) return -1;
    if (std::abs(left - right) > 1) return -1;
    return 1 + std::max(left, right);
}

void compare(const std::string& name, const Node* root, int n) {
    work = 0;
    bool a = topDown(root);
    long long top = work;
    work = 0;
    bool b = checkHeight(root) != -1;
    long long bottom = work;
    std::cout << std::boolalpha << name << " (" << n << " nodes): balanced " << a << "/" << b
              << ", top-down touched " << top << ", bottom-up touched " << bottom << "\\n";
}

int main() {
    for (int d : {3, 10, 12}) {
        int n = (1 << d) - 1;
        counter = 0;
        compare("perfect tree, " + std::to_string(d) + " levels", perfect(d), n);
    }
    compare("left chain", chain(500), 500);
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you compute the diameter of a binary tree?",
    difficulty: "medium",
    seoDescription: "Diameter of a binary tree in O(n): one post-order pass returns heights and records left + right. Python, JavaScript, Java and C++ code, run and verified.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given the root of a binary tree, write a Python function that returns the length of its diameter: the number of edges on the longest path between any two nodes. The path does not have to pass through the root."

**What a strong answer should cover:**
- Every path has a highest (bend) node; the longest path bending at a node has height(left) + height(right) edges.
- The answer is the maximum over all nodes, so a root-only computation is wrong when the longest path sits inside one subtree.
- One post-order pass: return the height to the parent, record the best left + right on the side — O(n) time, O(h) space.
- Why recomputing heights at every node is O(n · h), O(n²) on a chain.
- Python details: a nested helper with \`nonlocal best\` (or a one-element list) instead of a global, and the 1000-frame recursion limit for deep chains.
- Edges vs nodes: a single node has diameter 0.

**Clarifying questions expected:**
- Is the length measured in edges or in nodes?
- Must the path go through the root?

**Code / implementation expected:** Yes — a nested \`height(node)\` helper inside \`diameter(root)\`, in Python 3.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree and a recursive function are; everything else is explained.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a family of hikers spread over a network of mountain trails that never form a loop — every trail splits into at most two smaller trails as it goes downhill. Two friends want to stand as far apart as possible *along the trails* so they can test their walkie-talkies. Where should they stand?

Your first guess might be "one at the very top, one at the deepest point". But the top is not special. The two farthest points could both be deep in one valley, joined by a long trail that turns at a junction halfway down and never goes near the summit.

That is the **diameter** of a binary tree: the number of edges on the longest path between any two nodes. The path may start and end anywhere, it goes up from one end to some turning node and then down to the other end, and — the key insight — the turning node does not have to be the root.

Interviewers like this question because it looks like "find the height", which most candidates know, yet the answer is not stored in the height. It forces you to separate *what a recursive call returns to its parent* from *what you are trying to compute overall*. That pattern — return one thing, record another on the side — shows up again in maximum path sum, longest univalue path and many other tree problems.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the length counted in edges or in nodes? | The usual (LeetCode 543) answer counts **edges**: one node has diameter 0, two connected nodes have diameter 1. Counting nodes adds 1. |
| Must the path go through the root? | No, in the standard problem. Saying it out loud shows you know the trap. |
| What should an empty tree return? | Usually 0. It decides the base case. |
| Do you want just the length, or the path itself? | Returning the nodes means remembering the turning node and walking down twice; see example 2. |
| How deep can the tree be? | A chain of 100,000 nodes can overflow a recursive solution's call stack. |

## 3. The Core Idea

Every path in a tree has one highest node — the place where it stops going up and starts going down. Call it the path's **bend**. A path that bends at node X goes down into X's left subtree as far as it can and down into X's right subtree as far as it can. So:

> the longest path that bends at X = (height of X's left subtree) + (height of X's right subtree), counted in edges, when height counts nodes.

📌 **Interview term: Diameter of a tree** — the number of edges on the longest path between any two nodes. It is a maximum over all possible bend nodes, not a property of the root.

📌 **Interview term: Height of a subtree** — nodes on the longest downward path from that node (empty subtree = 0, leaf = 1). Computing it alone is the [maximum depth of a binary tree](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) problem. With this convention, the longest path bending at X has exactly left height + right height **edges**: each level below X on either side adds one edge.

<svg class="iq-diagram" width="100%" viewBox="0 0 520 290" role="img" aria-label="Tree with root 1, children 2 and 3, and 2 has children 4 and 5. The longest path 4 to 2 to 1 to 3 has three edges and bends at the root">
  <rect class="d-box-muted" x="124" y="4" width="272" height="28" rx="14"/>
  <text class="d-text" x="260" y="23" text-anchor="middle">Diameter 3: bends at the root</text>
  <path class="d-edge-accent" d="M 320 80 L 140 160"/>
  <path class="d-edge-accent" d="M 320 80 L 410 160"/>
  <path class="d-edge-accent" d="M 140 160 L 50 240"/>
  <path class="d-edge" d="M 140 160 L 230 240"/>
  <circle class="d-box-accent" cx="320" cy="80" r="20"/>
  <text class="d-text" x="320" y="85" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="140" cy="160" r="20"/>
  <text class="d-text" x="140" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="410" cy="160" r="20"/>
  <text class="d-text" x="410" y="165" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="50" cy="240" r="20"/>
  <text class="d-text" x="50" y="245" text-anchor="middle">4</text>
  <circle class="d-box" cx="230" cy="240" r="20"/>
  <text class="d-text" x="230" y="245" text-anchor="middle">5</text>
  <text class="d-sub" x="346" y="66">2 + 1 = 3</text>
  <text class="d-sub" x="114" y="146" text-anchor="end">h=2</text>
  <text class="d-sub" x="436" y="146">h=1</text>
  <text class="d-sub" x="24" y="226" text-anchor="end">h=1</text>
  <text class="d-sub" x="256" y="226">h=1</text>
</svg>

In the small tree, node 1 has a left height of 2 (via 2 and 4) and a right height of 1 (node 3). The longest path through it is 4 → 2 → 1 → 3, with 2 + 1 = 3 edges, and here the root happens to be the best bend.

<svg class="iq-diagram" width="100%" viewBox="0 0 790 450" role="img" aria-label="A tree whose longest path 5 4 3 2 6 7 8 has six edges and bends at node 2, below the root, so it never touches the root">
  <rect class="d-box-muted" x="267" y="4" width="256" height="28" rx="14"/>
  <text class="d-text" x="395" y="23" text-anchor="middle">Diameter 6: bends at node 2</text>
  <path class="d-edge" d="M 680 80 L 320 160"/>
  <path class="d-edge-accent" d="M 320 160 L 230 240"/>
  <path class="d-edge-accent" d="M 320 160 L 410 240"/>
  <path class="d-edge-accent" d="M 230 240 L 140 320"/>
  <path class="d-edge-accent" d="M 410 240 L 500 320"/>
  <path class="d-edge-accent" d="M 140 320 L 50 400"/>
  <path class="d-edge-accent" d="M 500 320 L 590 400"/>
  <circle class="d-box-muted" cx="680" cy="80" r="20"/>
  <text class="d-text" x="680" y="85" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="320" cy="160" r="20"/>
  <text class="d-text" x="320" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="230" cy="240" r="20"/>
  <text class="d-text" x="230" y="245" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="410" cy="240" r="20"/>
  <text class="d-text" x="410" y="245" text-anchor="middle">6</text>
  <circle class="d-box-accent" cx="140" cy="320" r="20"/>
  <text class="d-text" x="140" y="325" text-anchor="middle">4</text>
  <circle class="d-box-accent" cx="500" cy="320" r="20"/>
  <text class="d-text" x="500" y="325" text-anchor="middle">7</text>
  <circle class="d-box-accent" cx="50" cy="400" r="20"/>
  <text class="d-text" x="50" y="405" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="590" cy="400" r="20"/>
  <text class="d-text" x="590" y="405" text-anchor="middle">8</text>
  <text class="d-sub" x="706" y="66">4 + 0 = 4</text>
  <text class="d-sub" x="294" y="146" text-anchor="end">3 + 3 = 6</text>
</svg>

In the bigger tree the root only offers 4 + 0 = 4 edges, because everything hangs off its left side. Node 2 offers 3 + 3 = 6: down the left to 5 and down the right to 8. The answer is 6 and the path never visits the root. Any solution that computes "height of root.left + height of root.right" returns 4 here — example 1 tests this exact tree.

## 4. From Brute Force to One Pass

**Brute force.** Try every node as the bend: for each node, compute the height of its left and right subtrees from scratch and keep the largest sum. It is correct but, like the naive [balanced-tree check](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced), it re-walks each node once per ancestor: O(n · h), which is O(n²) on a chain. Example 2 counts 44,850 node visits for a 300-node chain.

**One pass.** Notice that the height function already *has* both child heights in hand right before it returns. So let it do two jobs at once:

1. **Return** to its parent the subtree height, 1 + max(L, R) — that is what the parent needs.
2. **Record** on the side the best diameter seen so far, max(best, L + R) — that is what *we* need.

📌 **Interview term: Post-order traversal** — process the left subtree, then the right, then the node. Only then does the node know both child heights. See the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods).

📌 **Interview term: Return value vs. global answer** — the classic tree-DP split: what a recursive call hands back to its parent (here the height) is often *not* the final answer; the final answer (here the diameter) is accumulated in a variable outside the recursion.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="At each node the left height L and the right height R arrive from the children. The node records L plus R as a candidate diameter and returns one plus the larger of L and R to its parent">
  <defs>
    <marker id="b16q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="170" height="64" rx="10"/>
  <text class="d-text" x="105" y="58" text-anchor="middle">L = height(left)</text>
  <text class="d-sub" x="105" y="78" text-anchor="middle">from the left child</text>
  <rect class="d-box" x="570" y="30" width="170" height="64" rx="10"/>
  <text class="d-text" x="655" y="58" text-anchor="middle">R = height(right)</text>
  <text class="d-sub" x="655" y="78" text-anchor="middle">from the right child</text>
  <path class="d-edge" d="M 192 62 L 296 62" marker-end="url(#b16q2-arrow)"/>
  <path class="d-edge" d="M 568 62 L 464 62" marker-end="url(#b16q2-arrow)"/>
  <rect class="d-box-muted" x="300" y="30" width="160" height="64" rx="10"/>
  <text class="d-text" x="380" y="58" text-anchor="middle">this node</text>
  <text class="d-sub" x="380" y="78" text-anchor="middle">children done first</text>
  <path class="d-edge" d="M 340 96 L 220 160" marker-end="url(#b16q2-arrow)"/>
  <path class="d-edge" d="M 420 96 L 540 160" marker-end="url(#b16q2-arrow)"/>
  <rect class="d-box-accent" x="60" y="164" width="260" height="64" rx="10"/>
  <text class="d-text" x="190" y="192" text-anchor="middle">best = max(best, L + R)</text>
  <text class="d-sub" x="190" y="212" text-anchor="middle">path that bends here, in edges</text>
  <rect class="d-box-accent" x="440" y="164" width="260" height="64" rx="10"/>
  <text class="d-text" x="570" y="192" text-anchor="middle">return 1 + max(L, R)</text>
  <text class="d-sub" x="570" y="212" text-anchor="middle">longest way down, for the parent</text>
</svg>

The left arrow is what the call reports upward; the right arrow is what it writes into the shared \`best\`. The parent never needs to know the diameter of its children — only their heights — because any path that bends higher up can only use one downward branch of each child.

📌 **Interview term: Tree DP (dynamic programming on trees)** — computing an answer for every subtree from its children's answers, bottom-up, so each node is processed once.

Here is the one pass on \`[1, 2, 3, 4, 5]\`, in the order the calls finish:

| Node | L | R | L + R (candidate) | best after | returns |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 4 | 0 | 0 | 0 | 0 | 1 |
| 5 | 0 | 0 | 0 | 0 | 1 |
| 2 | 1 | 1 | 2 | 2 | 2 |
| 3 | 0 | 0 | 0 | 2 | 1 |
| 1 | 2 | 1 | **3** | **3** | 3 |

Note how node 2 offers the path 4 → 2 → 5 (2 edges) first; the root then beats it with 3.

## 5. The Code in Python

~~~python
def diameter(root):
    """Longest path between any two nodes, counted in edges."""
    best = 0

    def height(node):
        nonlocal best                  # write to best in the enclosing function
        if node is None:
            return 0
        left = height(node.left)
        right = height(node.right)
        best = max(best, left + right)  # longest path that bends at this node
        return 1 + max(left, right)     # longest downward path, in nodes

    height(root)
    return best
~~~

**What to point out in this code:**

- The helper \`height\` is nested inside \`diameter\`, so each call to \`diameter\` gets its own fresh \`best\` — no global state leaking between test cases.
- \`nonlocal best\` is required. Without it, the assignment \`best = ...\` would make \`best\` a new local variable of \`height\`, and Python raises \`UnboundLocalError\` the first time it reads it. (Reading an outer variable is fine; *rebinding* it needs \`nonlocal\`.)
- An alternative that avoids \`nonlocal\` is a one-element list (\`best = [0]\`, then \`best[0] = ...\`), which example 2 uses so it can store the bend node too.
- \`max(best, left + right)\` uses the built-in \`max\`; Python ints never overflow, so very large trees cannot break the arithmetic.
- The tree is built from a level-order list with \`None\` for missing children, using \`collections.deque\` as the queue (see [level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree)).

📌 **Interview term: \`nonlocal\`** — a Python statement that lets a nested function assign to a variable of the enclosing function instead of creating a new local one.

The brute force, for comparison (example 2 measures it):

~~~python
def brute(node):
    """Try every node as the bend point, recomputing heights each time."""
    if node is None:
        return 0
    through = height(node.left) + height(node.right)
    return max(through, brute(node.left), brute(node.right))
~~~

Each \`brute\` call walks both child subtrees again through \`height\`, which is where the O(n · h) comes from. The default recursion limit (1000 frames, from \`sys.getrecursionlimit()\` in our run) means both versions need an iterative rewrite for chains of thousands of nodes.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 1 runs the one-pass solution on five trees, including the one whose longest path skips the root. Example 2 reconstructs the longest path itself and counts how many real nodes the brute force and the one pass touch.

**Example 1 — the one-pass diameter on five trees** prints:

~~~text
3
6
1
0
0
~~~

**Example 2 — the path itself, and brute force vs one pass** prints:

~~~text
longest path: 4 -> 2 -> 1 -> 3 (3 edges)
longest path: 5 -> 4 -> 3 -> 2 -> 6 -> 7 -> 8 (6 edges)
perfect tree, 10 levels (1023 nodes): diameter 18/18, brute force touched 8194, one pass touched 1023
left chain (300 nodes): diameter 299/299, brute force touched 44850, one pass touched 300
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (heights from scratch at every node) | O(n · h): O(n log n) balanced, O(n²) for a chain | O(h) | 8,194 touches for 1,023 nodes and 44,850 for a 300-node chain (example 2) |
| One post-order pass | O(n) | O(h) | each node returns its height once: exactly 1,023 and 300 touches |

n is the number of nodes and h the height. The space is the recursion stack — O(log n) for a balanced tree, O(n) for a chain (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)). Reconstructing the path in example 2 adds an extra walk down two branches; it is written for clarity (it recomputes heights while walking), not speed.

## 8. Edge Cases

- **Empty tree** — 0 (nothing to measure).
- **A single node** — 0 edges. Returning 1 here means you are counting nodes; check which one the interviewer wants.
- **Two nodes** — 1.
- **The longest path skips the root** — \`[1, 2, null, 3, 6, 4, null, null, 7, 5, null, null, 8]\` must return 6, not 4.
- **A chain** — the diameter is n − 1, the bend is the top node, and it is also the input that stresses the call stack.
- **Ties** — several paths can share the longest length; the length is unique even when the path is not. Example 2 breaks ties by preferring the left branch.

## Common Pitfalls

- **Answering height(left) + height(right) at the root only.** It misses diameters that bend lower down (6 vs 4 in the big example).
- **Returning the diameter instead of the height.** The recursive call must return the height; the diameter goes into the side variable.
- **Forgetting \`nonlocal\`.** \`best = max(best, ...)\` inside the nested function raises \`UnboundLocalError\` without it.
- **A module-level \`best\`.** If \`best\` is a global, the second call to \`diameter\` starts from the previous tree's answer.
- **Edges vs nodes.** \`left + right\` is edges when height counts nodes; adding 1 gives the node count instead.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">The diameter is the number of edges on the longest path between any two nodes; the path need not pass through the root.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Key fact:</strong> <span style="color:#f0e2c8;">Every path has a highest node where it bends; the longest path bending at X has height(left) + height(right) edges.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;">One post-order pass: each call returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + max(L, R)</code> to its parent and updates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best = max(best, L + R)</code> on the side.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(h) stack; recomputing heights at every node is O(n · h), O(n²) on a chain.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Nest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">height</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">diameter</code> and declare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nonlocal best</code>, or use a one-element list; never a global.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can the parent ignore its children's diameters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A path that bends above a child can only use one downward branch of it, which is exactly the child's height. Paths that bend inside the child were already recorded in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> when the child was processed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the path, not just its length?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Remember the node where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> was last improved. From it, walk down the deeper child repeatedly on each side, then join the reversed left walk, the bend node and the right walk.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this change for the maximum path sum (values can be negative)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same shape: return the best downward sum <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val + max(0, L, R)</code> and record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val + max(0, L) + max(0, R)</code>. Clamping at 0 drops branches that only hurt.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about a general tree or a graph without cycles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For an N-ary tree, keep the two largest child heights. For an unrooted tree, two BFS runs also work: from any node find the farthest node A, then the farthest from A is the diameter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the space really O(h)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the recursion stack holds one frame per level of the current path, plus O(1) per frame. That is O(log n) when balanced and O(n) for a chain.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Diameter of a tree** | Edges on the longest path between any two nodes |
| **Height of a subtree** | Nodes on the longest downward path from a node (empty = 0) |
| **Post-order traversal** | Left, right, then the node itself |
| **Return value vs. global answer** | What a call gives its parent differs from what you are computing overall |
| **Tree DP (dynamic programming on trees)** | Build each subtree's answer from its children's, bottom-up |
| **\`nonlocal\`** | Lets a nested function rebind a variable of the enclosing function |

Related: [checking whether a binary tree is balanced](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced) uses the same "return the height, decide something on the side" post-order pattern.

---
**Conclusion:** The diameter is a maximum over every possible bend node, and the bend at node X gives height(left) + height(right) edges. One post-order pass computes all of them: each call returns its height to the parent and updates a \`best\` held in the enclosing function through \`nonlocal\`. That is O(n) time and O(h) stack, against O(n · h) for recomputing heights — 300 touches instead of 44,850 on a 300-node chain in our run — and it correctly returns 6, not 4, for a tree whose longest path skips the root.`,
        examples: [
          {
            label: "One post-order pass: return height, record L + R (5 trees)",
            code: `from collections import deque


class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def build(values):
    """Build a tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = Node(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = Node(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = Node(values[i])
            queue.append(node.right)
        i += 1
    return root




def diameter(root):
    """Longest path between any two nodes, counted in edges."""
    best = 0

    def height(node):
        nonlocal best                  # write to best in the enclosing function
        if node is None:
            return 0
        left = height(node.left)
        right = height(node.right)
        best = max(best, left + right)  # longest path that bends at this node
        return 1 + max(left, right)     # longest downward path, in nodes

    height(root)
    return best


print(diameter(build([1, 2, 3, 4, 5])))  # 3
print(diameter(build([1, 2, None, 3, 6, 4, None, None, 7, 5, None, None, 8])))  # 6
print(diameter(build([1, 2])))  # 1
print(diameter(build([1])))  # 0
print(diameter(build([])))  # 0`,
          },
          {
            label: "Reconstruct the longest path; brute force vs one pass",
            code: `from collections import deque


class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def build(values):
    """Build a tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = Node(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = Node(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = Node(values[i])
            queue.append(node.right)
        i += 1
    return root




def perfect(depth, counter):
    if depth == 0:
        return None
    counter[0] += 1
    node = Node(counter[0])
    node.left = perfect(depth - 1, counter)
    node.right = perfect(depth - 1, counter)
    return node


def chain(n):
    root = Node(1)
    cur = root
    for v in range(2, n + 1):
        cur.left = Node(v)
        cur = cur.left
    return root


work = [0]


def height(node):
    if node is None:
        return 0
    work[0] += 1
    return 1 + max(height(node.left), height(node.right))


def brute(node):
    """Try every node as the bend point, recomputing heights each time."""
    if node is None:
        return 0
    through = height(node.left) + height(node.right)
    return max(through, brute(node.left), brute(node.right))


def one_pass(root):
    """Post-order: each node returns its height once and records the bend."""
    best = [0, None]                     # [length in edges, bend node]

    def h(node):
        if node is None:
            return 0
        work[0] += 1
        left, right = h(node.left), h(node.right)
        if left + right > best[0]:
            best[0], best[1] = left + right, node
        return 1 + max(left, right)

    h(root)
    return best[0], best[1]


def deepest_path(node):
    """Values on a longest downward path from node (left wins ties)."""
    path = []
    while node is not None:
        path.append(node.val)
        go_left = height(node.left) >= height(node.right)
        node = node.left if go_left else node.right
    return path


def longest_path(root):
    length, bend = one_pass(root)
    if bend is None:
        return [root.val] if root else []
    left = deepest_path(bend.left)
    right = deepest_path(bend.right)
    return left[::-1] + [bend.val] + right


for vals in ([1, 2, 3, 4, 5], [1, 2, None, 3, 6, 4, None, None, 7, 5, None, None, 8]):
    path = longest_path(build(vals))
    print("longest path: " + " -> ".join(str(v) for v in path) + " (" + str(len(path) - 1) + " edges)")

for name, root, n in (("perfect tree, 10 levels", perfect(10, [0]), 1023), ("left chain", chain(300), 300)):
    work[0] = 0
    a = brute(root)
    slow = work[0]
    work[0] = 0
    b = one_pass(root)[0]
    fast = work[0]
    print(name + " (" + str(n) + " nodes): diameter " + str(a) + "/" + str(b)
          + ", brute force touched " + str(slow) + ", one pass touched " + str(fast))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given the root of a binary tree, write a JavaScript function that returns the length of its diameter: the number of edges on the longest path between any two nodes. The path does not have to pass through the root."

**What a strong answer should cover:**
- Every path has a highest (bend) node; the longest path bending at a node has height(left) + height(right) edges.
- The answer is the maximum over all nodes, so a root-only computation is wrong when the longest path sits inside one subtree.
- One post-order pass: return the height to the parent, record the best left + right on the side — O(n) time, O(h) space.
- Why recomputing heights at every node is O(n · h), O(n²) on a chain.
- JavaScript details: a nested helper closing over \`let best\`, not a module-level variable, and the engine's call-stack limit on deep chains.
- Edges vs nodes: a single node has diameter 0.

**Clarifying questions expected:**
- Is the length measured in edges or in nodes?
- Must the path go through the root?

**Code / implementation expected:** Yes — a nested \`height(node)\` function inside \`diameter(root)\`, in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree and a recursive function are; everything else is explained.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a family of hikers spread over a network of mountain trails that never form a loop — every trail splits into at most two smaller trails as it goes downhill. Two friends want to stand as far apart as possible *along the trails* so they can test their walkie-talkies. Where should they stand?

Your first guess might be "one at the very top, one at the deepest point". But the top is not special. The two farthest points could both be deep in one valley, joined by a long trail that turns at a junction halfway down and never goes near the summit.

That is the **diameter** of a binary tree: the number of edges on the longest path between any two nodes. The path may start and end anywhere, it goes up from one end to some turning node and then down to the other end, and — the key insight — the turning node does not have to be the root.

Interviewers like this question because it looks like "find the height", which most candidates know, yet the answer is not stored in the height. It forces you to separate *what a recursive call returns to its parent* from *what you are trying to compute overall*. That pattern — return one thing, record another on the side — shows up again in maximum path sum, longest univalue path and many other tree problems.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the length counted in edges or in nodes? | The usual (LeetCode 543) answer counts **edges**: one node has diameter 0, two connected nodes have diameter 1. Counting nodes adds 1. |
| Must the path go through the root? | No, in the standard problem. Saying it out loud shows you know the trap. |
| What should an empty tree return? | Usually 0. It decides the base case. |
| Do you want just the length, or the path itself? | Returning the nodes means remembering the turning node and walking down twice; see example 2. |
| How deep can the tree be? | A chain of 100,000 nodes can overflow a recursive solution's call stack. |

## 3. The Core Idea

Every path in a tree has one highest node — the place where it stops going up and starts going down. Call it the path's **bend**. A path that bends at node X goes down into X's left subtree as far as it can and down into X's right subtree as far as it can. So:

> the longest path that bends at X = (height of X's left subtree) + (height of X's right subtree), counted in edges, when height counts nodes.

📌 **Interview term: Diameter of a tree** — the number of edges on the longest path between any two nodes. It is a maximum over all possible bend nodes, not a property of the root.

📌 **Interview term: Height of a subtree** — nodes on the longest downward path from that node (empty subtree = 0, leaf = 1). Computing it alone is the [maximum depth of a binary tree](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) problem. With this convention, the longest path bending at X has exactly left height + right height **edges**: each level below X on either side adds one edge.

<svg class="iq-diagram" width="100%" viewBox="0 0 520 290" role="img" aria-label="Tree with root 1, children 2 and 3, and 2 has children 4 and 5. The longest path 4 to 2 to 1 to 3 has three edges and bends at the root">
  <rect class="d-box-muted" x="124" y="4" width="272" height="28" rx="14"/>
  <text class="d-text" x="260" y="23" text-anchor="middle">Diameter 3: bends at the root</text>
  <path class="d-edge-accent" d="M 320 80 L 140 160"/>
  <path class="d-edge-accent" d="M 320 80 L 410 160"/>
  <path class="d-edge-accent" d="M 140 160 L 50 240"/>
  <path class="d-edge" d="M 140 160 L 230 240"/>
  <circle class="d-box-accent" cx="320" cy="80" r="20"/>
  <text class="d-text" x="320" y="85" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="140" cy="160" r="20"/>
  <text class="d-text" x="140" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="410" cy="160" r="20"/>
  <text class="d-text" x="410" y="165" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="50" cy="240" r="20"/>
  <text class="d-text" x="50" y="245" text-anchor="middle">4</text>
  <circle class="d-box" cx="230" cy="240" r="20"/>
  <text class="d-text" x="230" y="245" text-anchor="middle">5</text>
  <text class="d-sub" x="346" y="66">2 + 1 = 3</text>
  <text class="d-sub" x="114" y="146" text-anchor="end">h=2</text>
  <text class="d-sub" x="436" y="146">h=1</text>
  <text class="d-sub" x="24" y="226" text-anchor="end">h=1</text>
  <text class="d-sub" x="256" y="226">h=1</text>
</svg>

In the small tree, node 1 has a left height of 2 (via 2 and 4) and a right height of 1 (node 3). The longest path through it is 4 → 2 → 1 → 3, with 2 + 1 = 3 edges, and here the root happens to be the best bend.

<svg class="iq-diagram" width="100%" viewBox="0 0 790 450" role="img" aria-label="A tree whose longest path 5 4 3 2 6 7 8 has six edges and bends at node 2, below the root, so it never touches the root">
  <rect class="d-box-muted" x="267" y="4" width="256" height="28" rx="14"/>
  <text class="d-text" x="395" y="23" text-anchor="middle">Diameter 6: bends at node 2</text>
  <path class="d-edge" d="M 680 80 L 320 160"/>
  <path class="d-edge-accent" d="M 320 160 L 230 240"/>
  <path class="d-edge-accent" d="M 320 160 L 410 240"/>
  <path class="d-edge-accent" d="M 230 240 L 140 320"/>
  <path class="d-edge-accent" d="M 410 240 L 500 320"/>
  <path class="d-edge-accent" d="M 140 320 L 50 400"/>
  <path class="d-edge-accent" d="M 500 320 L 590 400"/>
  <circle class="d-box-muted" cx="680" cy="80" r="20"/>
  <text class="d-text" x="680" y="85" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="320" cy="160" r="20"/>
  <text class="d-text" x="320" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="230" cy="240" r="20"/>
  <text class="d-text" x="230" y="245" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="410" cy="240" r="20"/>
  <text class="d-text" x="410" y="245" text-anchor="middle">6</text>
  <circle class="d-box-accent" cx="140" cy="320" r="20"/>
  <text class="d-text" x="140" y="325" text-anchor="middle">4</text>
  <circle class="d-box-accent" cx="500" cy="320" r="20"/>
  <text class="d-text" x="500" y="325" text-anchor="middle">7</text>
  <circle class="d-box-accent" cx="50" cy="400" r="20"/>
  <text class="d-text" x="50" y="405" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="590" cy="400" r="20"/>
  <text class="d-text" x="590" y="405" text-anchor="middle">8</text>
  <text class="d-sub" x="706" y="66">4 + 0 = 4</text>
  <text class="d-sub" x="294" y="146" text-anchor="end">3 + 3 = 6</text>
</svg>

In the bigger tree the root only offers 4 + 0 = 4 edges, because everything hangs off its left side. Node 2 offers 3 + 3 = 6: down the left to 5 and down the right to 8. The answer is 6 and the path never visits the root. Any solution that computes "height of root.left + height of root.right" returns 4 here — example 1 tests this exact tree.

## 4. From Brute Force to One Pass

**Brute force.** Try every node as the bend: for each node, compute the height of its left and right subtrees from scratch and keep the largest sum. It is correct but, like the naive [balanced-tree check](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced), it re-walks each node once per ancestor: O(n · h), which is O(n²) on a chain. Example 2 counts 44,850 node visits for a 300-node chain.

**One pass.** Notice that the height function already *has* both child heights in hand right before it returns. So let it do two jobs at once:

1. **Return** to its parent the subtree height, 1 + max(L, R) — that is what the parent needs.
2. **Record** on the side the best diameter seen so far, max(best, L + R) — that is what *we* need.

📌 **Interview term: Post-order traversal** — process the left subtree, then the right, then the node. Only then does the node know both child heights. See the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods).

📌 **Interview term: Return value vs. global answer** — the classic tree-DP split: what a recursive call hands back to its parent (here the height) is often *not* the final answer; the final answer (here the diameter) is accumulated in a variable outside the recursion.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="At each node the left height L and the right height R arrive from the children. The node records L plus R as a candidate diameter and returns one plus the larger of L and R to its parent">
  <defs>
    <marker id="b16q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="170" height="64" rx="10"/>
  <text class="d-text" x="105" y="58" text-anchor="middle">L = height(left)</text>
  <text class="d-sub" x="105" y="78" text-anchor="middle">from the left child</text>
  <rect class="d-box" x="570" y="30" width="170" height="64" rx="10"/>
  <text class="d-text" x="655" y="58" text-anchor="middle">R = height(right)</text>
  <text class="d-sub" x="655" y="78" text-anchor="middle">from the right child</text>
  <path class="d-edge" d="M 192 62 L 296 62" marker-end="url(#b16q2-arrow)"/>
  <path class="d-edge" d="M 568 62 L 464 62" marker-end="url(#b16q2-arrow)"/>
  <rect class="d-box-muted" x="300" y="30" width="160" height="64" rx="10"/>
  <text class="d-text" x="380" y="58" text-anchor="middle">this node</text>
  <text class="d-sub" x="380" y="78" text-anchor="middle">children done first</text>
  <path class="d-edge" d="M 340 96 L 220 160" marker-end="url(#b16q2-arrow)"/>
  <path class="d-edge" d="M 420 96 L 540 160" marker-end="url(#b16q2-arrow)"/>
  <rect class="d-box-accent" x="60" y="164" width="260" height="64" rx="10"/>
  <text class="d-text" x="190" y="192" text-anchor="middle">best = max(best, L + R)</text>
  <text class="d-sub" x="190" y="212" text-anchor="middle">path that bends here, in edges</text>
  <rect class="d-box-accent" x="440" y="164" width="260" height="64" rx="10"/>
  <text class="d-text" x="570" y="192" text-anchor="middle">return 1 + max(L, R)</text>
  <text class="d-sub" x="570" y="212" text-anchor="middle">longest way down, for the parent</text>
</svg>

The left arrow is what the call reports upward; the right arrow is what it writes into the shared \`best\`. The parent never needs to know the diameter of its children — only their heights — because any path that bends higher up can only use one downward branch of each child.

📌 **Interview term: Tree DP (dynamic programming on trees)** — computing an answer for every subtree from its children's answers, bottom-up, so each node is processed once.

Here is the one pass on \`[1, 2, 3, 4, 5]\`, in the order the calls finish:

| Node | L | R | L + R (candidate) | best after | returns |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 4 | 0 | 0 | 0 | 0 | 1 |
| 5 | 0 | 0 | 0 | 0 | 1 |
| 2 | 1 | 1 | 2 | 2 | 2 |
| 3 | 0 | 0 | 0 | 2 | 1 |
| 1 | 2 | 1 | **3** | **3** | 3 |

Note how node 2 offers the path 4 → 2 → 5 (2 edges) first; the root then beats it with 3.

## 5. The Code in JavaScript

~~~javascript
// Longest path between any two nodes, counted in edges.
function diameter(root) {
  let best = 0;
  function height(node) {
    if (node === null) return 0;
    const left = height(node.left);
    const right = height(node.right);
    best = Math.max(best, left + right); // longest path that bends at this node
    return 1 + Math.max(left, right);    // longest downward path, in nodes
  }
  height(root);
  return best;
}
~~~

**What to point out in this code:**

- The helper \`height\` is a nested function and \`best\` is a \`let\` in the enclosing scope. The inner function **closes over** it, so it can read and update it directly, and each call of \`diameter\` starts with its own fresh \`best = 0\`.
- Use \`let\`, not \`const\`, for \`best\`: it is reassigned. Do not make it a module-level variable either — a second call would start from the old value.
- \`Math.max(best, left + right)\` works on plain numbers. Heights and diameters are tiny integers, far below \`Number.MAX_SAFE_INTEGER\`, so floating point is not a concern here.
- The tree is built from a level-order array with \`null\` for missing children, using an array plus a \`head\` index as the queue instead of \`shift()\` (see [level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree)).

📌 **Interview term: Closure** — a function together with the variables of the scope it was created in. \`height\` keeps access to \`best\` because it was defined inside \`diameter\`.

The brute force, for comparison (example 2 measures it):

~~~javascript
// Try every node as the bend point, recomputing heights each time.
function brute(node) {
  if (node === null) return 0;
  const through = height(node.left) + height(node.right);
  return Math.max(through, brute(node.left), brute(node.right));
}
~~~

Each \`brute\` call walks both child subtrees again through \`height\`, which is where the O(n · h) comes from. Both versions recurse once per level, so a chain deeper than roughly ten thousand nodes (our Node 22 run overflowed at about 10,900 nested calls) needs an iterative rewrite.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 1 runs the one-pass solution on five trees, including the one whose longest path skips the root. Example 2 reconstructs the longest path itself and counts how many real nodes the brute force and the one pass touch.

**Example 1 — the one-pass diameter on five trees** prints:

~~~text
3
6
1
0
0
~~~

**Example 2 — the path itself, and brute force vs one pass** prints:

~~~text
longest path: 4 -> 2 -> 1 -> 3 (3 edges)
longest path: 5 -> 4 -> 3 -> 2 -> 6 -> 7 -> 8 (6 edges)
perfect tree, 10 levels (1023 nodes): diameter 18/18, brute force touched 8194, one pass touched 1023
left chain (300 nodes): diameter 299/299, brute force touched 44850, one pass touched 300
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (heights from scratch at every node) | O(n · h): O(n log n) balanced, O(n²) for a chain | O(h) | 8,194 touches for 1,023 nodes and 44,850 for a 300-node chain (example 2) |
| One post-order pass | O(n) | O(h) | each node returns its height once: exactly 1,023 and 300 touches |

n is the number of nodes and h the height. The space is the recursion stack — O(log n) for a balanced tree, O(n) for a chain (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)). Reconstructing the path in example 2 adds an extra walk down two branches; it is written for clarity (it recomputes heights while walking), not speed.

## 8. Edge Cases

- **Empty tree** — 0 (nothing to measure).
- **A single node** — 0 edges. Returning 1 here means you are counting nodes; check which one the interviewer wants.
- **Two nodes** — 1.
- **The longest path skips the root** — \`[1, 2, null, 3, 6, 4, null, null, 7, 5, null, null, 8]\` must return 6, not 4.
- **A chain** — the diameter is n − 1, the bend is the top node, and it is also the input that stresses the call stack.
- **Ties** — several paths can share the longest length; the length is unique even when the path is not. Example 2 breaks ties by preferring the left branch.

## Common Pitfalls

- **Answering height(left) + height(right) at the root only.** It misses diameters that bend lower down (6 vs 4 in the big example).
- **Returning the diameter instead of the height.** The recursive call must return the height; the diameter goes into the side variable.
- **\`best\` as a module-level variable.** A second call to \`diameter\` would start from the previous tree's answer; keep it inside the function.
- **\`const best = 0\`.** Reassigning a \`const\` throws \`TypeError: Assignment to constant variable.\`; use \`let\`.
- **Edges vs nodes.** \`left + right\` is edges when height counts nodes; adding 1 gives the node count instead.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">The diameter is the number of edges on the longest path between any two nodes; the path need not pass through the root.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Key fact:</strong> <span style="color:#f0e2c8;">Every path has a highest node where it bends; the longest path bending at X has height(left) + height(right) edges.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;">One post-order pass: each call returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + max(L, R)</code> to its parent and updates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best = max(best, L + R)</code> on the side.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(h) stack; recomputing heights at every node is O(n · h), O(n²) on a chain.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">A nested <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">height</code> closes over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let best</code>, so each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">diameter</code> call starts fresh.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can the parent ignore its children's diameters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A path that bends above a child can only use one downward branch of it, which is exactly the child's height. Paths that bend inside the child were already recorded in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> when the child was processed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the path, not just its length?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Remember the node where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> was last improved. From it, walk down the deeper child repeatedly on each side, then join the reversed left walk, the bend node and the right walk.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this change for the maximum path sum (values can be negative)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same shape: return the best downward sum <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val + max(0, L, R)</code> and record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val + max(0, L) + max(0, R)</code>. Clamping at 0 drops branches that only hurt.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about a general tree or a graph without cycles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For an N-ary tree, keep the two largest child heights. For an unrooted tree, two BFS runs also work: from any node find the farthest node A, then the farthest from A is the diameter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the space really O(h)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the recursion stack holds one frame per level of the current path, plus O(1) per frame. That is O(log n) when balanced and O(n) for a chain.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Diameter of a tree** | Edges on the longest path between any two nodes |
| **Height of a subtree** | Nodes on the longest downward path from a node (empty = 0) |
| **Post-order traversal** | Left, right, then the node itself |
| **Return value vs. global answer** | What a call gives its parent differs from what you are computing overall |
| **Tree DP (dynamic programming on trees)** | Build each subtree's answer from its children's, bottom-up |
| **Closure** | A function plus the variables of the scope it was created in |

Related: [checking whether a binary tree is balanced](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced) uses the same "return the height, decide something on the side" post-order pattern.

---
**Conclusion:** The diameter is a maximum over every possible bend node, and the bend at node X gives height(left) + height(right) edges. One post-order pass computes all of them: a nested \`height\` function returns its height to the parent and updates a \`let best\` it closes over. That is O(n) time and O(h) stack, against O(n · h) for recomputing heights — 300 touches instead of 44,850 on a 300-node chain in our run — and it correctly returns 6, not 4, for a tree whose longest path skips the root.`,
        examples: [
          {
            label: "One post-order pass: return height, record L + R (5 trees)",
            code: `class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// Build a tree from a level-order array; null marks a missing child.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new Node(values[0]);
  const queue = [root];
  let head = 0; // index of the next node to fill (cheaper than queue.shift())
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) {
      node.left = new Node(values[i]);
      queue.push(node.left);
    }
    i++;
    if (i < values.length && values[i] !== null) {
      node.right = new Node(values[i]);
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

// Longest path between any two nodes, counted in edges.
function diameter(root) {
  let best = 0;
  function height(node) {
    if (node === null) return 0;
    const left = height(node.left);
    const right = height(node.right);
    best = Math.max(best, left + right); // longest path that bends at this node
    return 1 + Math.max(left, right);    // longest downward path, in nodes
  }
  height(root);
  return best;
}

console.log(diameter(build([1, 2, 3, 4, 5]))); // 3
console.log(diameter(build([1, 2, null, 3, 6, 4, null, null, 7, 5, null, null, 8]))); // 6
console.log(diameter(build([1, 2]))); // 1
console.log(diameter(build([1]))); // 0
console.log(diameter(build([]))); // 0`,
          },
          {
            label: "Reconstruct the longest path; brute force vs one pass",
            code: `class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// Build a tree from a level-order array; null marks a missing child.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new Node(values[0]);
  const queue = [root];
  let head = 0; // index of the next node to fill (cheaper than queue.shift())
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) {
      node.left = new Node(values[i]);
      queue.push(node.left);
    }
    i++;
    if (i < values.length && values[i] !== null) {
      node.right = new Node(values[i]);
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

function perfect(depth, counter) {
  if (depth === 0) return null;
  counter.n += 1;
  const node = new Node(counter.n);
  node.left = perfect(depth - 1, counter);
  node.right = perfect(depth - 1, counter);
  return node;
}

function chain(n) {
  const root = new Node(1);
  let cur = root;
  for (let v = 2; v <= n; v++) {
    cur.left = new Node(v);
    cur = cur.left;
  }
  return root;
}

let work = 0;

function height(node) {
  if (node === null) return 0;
  work++;
  return 1 + Math.max(height(node.left), height(node.right));
}

// Try every node as the bend point, recomputing heights each time.
function brute(node) {
  if (node === null) return 0;
  const through = height(node.left) + height(node.right);
  return Math.max(through, brute(node.left), brute(node.right));
}

// Post-order: each node returns its height once and records the bend.
function onePass(root) {
  let best = 0;
  let bend = null;
  function h(node) {
    if (node === null) return 0;
    work++;
    const left = h(node.left);
    const right = h(node.right);
    if (left + right > best) {
      best = left + right;
      bend = node;
    }
    return 1 + Math.max(left, right);
  }
  h(root);
  return [best, bend];
}

// Values on a longest downward path from node (left wins ties).
function deepestPath(node) {
  const path = [];
  while (node !== null) {
    path.push(node.val);
    node = height(node.left) >= height(node.right) ? node.left : node.right;
  }
  return path;
}

function longestPath(root) {
  const [, bend] = onePass(root);
  if (bend === null) return root ? [root.val] : [];
  const left = deepestPath(bend.left).reverse();
  return left.concat([bend.val], deepestPath(bend.right));
}

for (const vals of [[1, 2, 3, 4, 5], [1, 2, null, 3, 6, 4, null, null, 7, 5, null, null, 8]]) {
  const path = longestPath(build(vals));
  console.log('longest path: ' + path.join(' -> ') + ' (' + (path.length - 1) + ' edges)');
}

for (const [name, root, n] of [['perfect tree, 10 levels', perfect(10, { n: 0 }), 1023], ['left chain', chain(300), 300]]) {
  work = 0;
  const a = brute(root);
  const slow = work;
  work = 0;
  const b = onePass(root)[0];
  const fast = work;
  console.log(name + ' (' + n + ' nodes): diameter ' + a + '/' + b +
    ', brute force touched ' + slow + ', one pass touched ' + fast);
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given the root of a binary tree, write a Java function that returns the length of its diameter: the number of edges on the longest path between any two nodes. The path does not have to pass through the root."

**What a strong answer should cover:**
- Every path has a highest (bend) node; the longest path bending at a node has height(left) + height(right) edges.
- The answer is the maximum over all nodes, so a root-only computation is wrong when the longest path sits inside one subtree.
- One post-order pass: return the height to the parent, record the best left + right on the side — O(n) time, O(h) space.
- Why recomputing heights at every node is O(n · h), O(n²) on a chain.
- Java details: captured locals must be effectively final, so keep the running maximum in a field (reset per call) or an \`int[]\`.
- Edges vs nodes: a single node has diameter 0.

**Clarifying questions expected:**
- Is the length measured in edges or in nodes?
- Must the path go through the root?

**Code / implementation expected:** Yes — \`static int height(Node node)\` updating a \`best\` field, plus \`static int diameter(Node root)\`, in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree and a recursive function are; everything else is explained.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a family of hikers spread over a network of mountain trails that never form a loop — every trail splits into at most two smaller trails as it goes downhill. Two friends want to stand as far apart as possible *along the trails* so they can test their walkie-talkies. Where should they stand?

Your first guess might be "one at the very top, one at the deepest point". But the top is not special. The two farthest points could both be deep in one valley, joined by a long trail that turns at a junction halfway down and never goes near the summit.

That is the **diameter** of a binary tree: the number of edges on the longest path between any two nodes. The path may start and end anywhere, it goes up from one end to some turning node and then down to the other end, and — the key insight — the turning node does not have to be the root.

Interviewers like this question because it looks like "find the height", which most candidates know, yet the answer is not stored in the height. It forces you to separate *what a recursive call returns to its parent* from *what you are trying to compute overall*. That pattern — return one thing, record another on the side — shows up again in maximum path sum, longest univalue path and many other tree problems.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the length counted in edges or in nodes? | The usual (LeetCode 543) answer counts **edges**: one node has diameter 0, two connected nodes have diameter 1. Counting nodes adds 1. |
| Must the path go through the root? | No, in the standard problem. Saying it out loud shows you know the trap. |
| What should an empty tree return? | Usually 0. It decides the base case. |
| Do you want just the length, or the path itself? | Returning the nodes means remembering the turning node and walking down twice; see example 2. |
| How deep can the tree be? | A chain of 100,000 nodes can overflow a recursive solution's call stack. |

## 3. The Core Idea

Every path in a tree has one highest node — the place where it stops going up and starts going down. Call it the path's **bend**. A path that bends at node X goes down into X's left subtree as far as it can and down into X's right subtree as far as it can. So:

> the longest path that bends at X = (height of X's left subtree) + (height of X's right subtree), counted in edges, when height counts nodes.

📌 **Interview term: Diameter of a tree** — the number of edges on the longest path between any two nodes. It is a maximum over all possible bend nodes, not a property of the root.

📌 **Interview term: Height of a subtree** — nodes on the longest downward path from that node (empty subtree = 0, leaf = 1). Computing it alone is the [maximum depth of a binary tree](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) problem. With this convention, the longest path bending at X has exactly left height + right height **edges**: each level below X on either side adds one edge.

<svg class="iq-diagram" width="100%" viewBox="0 0 520 290" role="img" aria-label="Tree with root 1, children 2 and 3, and 2 has children 4 and 5. The longest path 4 to 2 to 1 to 3 has three edges and bends at the root">
  <rect class="d-box-muted" x="124" y="4" width="272" height="28" rx="14"/>
  <text class="d-text" x="260" y="23" text-anchor="middle">Diameter 3: bends at the root</text>
  <path class="d-edge-accent" d="M 320 80 L 140 160"/>
  <path class="d-edge-accent" d="M 320 80 L 410 160"/>
  <path class="d-edge-accent" d="M 140 160 L 50 240"/>
  <path class="d-edge" d="M 140 160 L 230 240"/>
  <circle class="d-box-accent" cx="320" cy="80" r="20"/>
  <text class="d-text" x="320" y="85" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="140" cy="160" r="20"/>
  <text class="d-text" x="140" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="410" cy="160" r="20"/>
  <text class="d-text" x="410" y="165" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="50" cy="240" r="20"/>
  <text class="d-text" x="50" y="245" text-anchor="middle">4</text>
  <circle class="d-box" cx="230" cy="240" r="20"/>
  <text class="d-text" x="230" y="245" text-anchor="middle">5</text>
  <text class="d-sub" x="346" y="66">2 + 1 = 3</text>
  <text class="d-sub" x="114" y="146" text-anchor="end">h=2</text>
  <text class="d-sub" x="436" y="146">h=1</text>
  <text class="d-sub" x="24" y="226" text-anchor="end">h=1</text>
  <text class="d-sub" x="256" y="226">h=1</text>
</svg>

In the small tree, node 1 has a left height of 2 (via 2 and 4) and a right height of 1 (node 3). The longest path through it is 4 → 2 → 1 → 3, with 2 + 1 = 3 edges, and here the root happens to be the best bend.

<svg class="iq-diagram" width="100%" viewBox="0 0 790 450" role="img" aria-label="A tree whose longest path 5 4 3 2 6 7 8 has six edges and bends at node 2, below the root, so it never touches the root">
  <rect class="d-box-muted" x="267" y="4" width="256" height="28" rx="14"/>
  <text class="d-text" x="395" y="23" text-anchor="middle">Diameter 6: bends at node 2</text>
  <path class="d-edge" d="M 680 80 L 320 160"/>
  <path class="d-edge-accent" d="M 320 160 L 230 240"/>
  <path class="d-edge-accent" d="M 320 160 L 410 240"/>
  <path class="d-edge-accent" d="M 230 240 L 140 320"/>
  <path class="d-edge-accent" d="M 410 240 L 500 320"/>
  <path class="d-edge-accent" d="M 140 320 L 50 400"/>
  <path class="d-edge-accent" d="M 500 320 L 590 400"/>
  <circle class="d-box-muted" cx="680" cy="80" r="20"/>
  <text class="d-text" x="680" y="85" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="320" cy="160" r="20"/>
  <text class="d-text" x="320" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="230" cy="240" r="20"/>
  <text class="d-text" x="230" y="245" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="410" cy="240" r="20"/>
  <text class="d-text" x="410" y="245" text-anchor="middle">6</text>
  <circle class="d-box-accent" cx="140" cy="320" r="20"/>
  <text class="d-text" x="140" y="325" text-anchor="middle">4</text>
  <circle class="d-box-accent" cx="500" cy="320" r="20"/>
  <text class="d-text" x="500" y="325" text-anchor="middle">7</text>
  <circle class="d-box-accent" cx="50" cy="400" r="20"/>
  <text class="d-text" x="50" y="405" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="590" cy="400" r="20"/>
  <text class="d-text" x="590" y="405" text-anchor="middle">8</text>
  <text class="d-sub" x="706" y="66">4 + 0 = 4</text>
  <text class="d-sub" x="294" y="146" text-anchor="end">3 + 3 = 6</text>
</svg>

In the bigger tree the root only offers 4 + 0 = 4 edges, because everything hangs off its left side. Node 2 offers 3 + 3 = 6: down the left to 5 and down the right to 8. The answer is 6 and the path never visits the root. Any solution that computes "height of root.left + height of root.right" returns 4 here — example 1 tests this exact tree.

## 4. From Brute Force to One Pass

**Brute force.** Try every node as the bend: for each node, compute the height of its left and right subtrees from scratch and keep the largest sum. It is correct but, like the naive [balanced-tree check](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced), it re-walks each node once per ancestor: O(n · h), which is O(n²) on a chain. Example 2 counts 44,850 node visits for a 300-node chain.

**One pass.** Notice that the height function already *has* both child heights in hand right before it returns. So let it do two jobs at once:

1. **Return** to its parent the subtree height, 1 + max(L, R) — that is what the parent needs.
2. **Record** on the side the best diameter seen so far, max(best, L + R) — that is what *we* need.

📌 **Interview term: Post-order traversal** — process the left subtree, then the right, then the node. Only then does the node know both child heights. See the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods).

📌 **Interview term: Return value vs. global answer** — the classic tree-DP split: what a recursive call hands back to its parent (here the height) is often *not* the final answer; the final answer (here the diameter) is accumulated in a variable outside the recursion.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="At each node the left height L and the right height R arrive from the children. The node records L plus R as a candidate diameter and returns one plus the larger of L and R to its parent">
  <defs>
    <marker id="b16q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="170" height="64" rx="10"/>
  <text class="d-text" x="105" y="58" text-anchor="middle">L = height(left)</text>
  <text class="d-sub" x="105" y="78" text-anchor="middle">from the left child</text>
  <rect class="d-box" x="570" y="30" width="170" height="64" rx="10"/>
  <text class="d-text" x="655" y="58" text-anchor="middle">R = height(right)</text>
  <text class="d-sub" x="655" y="78" text-anchor="middle">from the right child</text>
  <path class="d-edge" d="M 192 62 L 296 62" marker-end="url(#b16q2-arrow)"/>
  <path class="d-edge" d="M 568 62 L 464 62" marker-end="url(#b16q2-arrow)"/>
  <rect class="d-box-muted" x="300" y="30" width="160" height="64" rx="10"/>
  <text class="d-text" x="380" y="58" text-anchor="middle">this node</text>
  <text class="d-sub" x="380" y="78" text-anchor="middle">children done first</text>
  <path class="d-edge" d="M 340 96 L 220 160" marker-end="url(#b16q2-arrow)"/>
  <path class="d-edge" d="M 420 96 L 540 160" marker-end="url(#b16q2-arrow)"/>
  <rect class="d-box-accent" x="60" y="164" width="260" height="64" rx="10"/>
  <text class="d-text" x="190" y="192" text-anchor="middle">best = max(best, L + R)</text>
  <text class="d-sub" x="190" y="212" text-anchor="middle">path that bends here, in edges</text>
  <rect class="d-box-accent" x="440" y="164" width="260" height="64" rx="10"/>
  <text class="d-text" x="570" y="192" text-anchor="middle">return 1 + max(L, R)</text>
  <text class="d-sub" x="570" y="212" text-anchor="middle">longest way down, for the parent</text>
</svg>

The left arrow is what the call reports upward; the right arrow is what it writes into the shared \`best\`. The parent never needs to know the diameter of its children — only their heights — because any path that bends higher up can only use one downward branch of each child.

📌 **Interview term: Tree DP (dynamic programming on trees)** — computing an answer for every subtree from its children's answers, bottom-up, so each node is processed once.

Here is the one pass on \`[1, 2, 3, 4, 5]\`, in the order the calls finish:

| Node | L | R | L + R (candidate) | best after | returns |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 4 | 0 | 0 | 0 | 0 | 1 |
| 5 | 0 | 0 | 0 | 0 | 1 |
| 2 | 1 | 1 | 2 | 2 | 2 |
| 3 | 0 | 0 | 0 | 2 | 1 |
| 1 | 2 | 1 | **3** | **3** | 3 |

Note how node 2 offers the path 4 → 2 → 5 (2 edges) first; the root then beats it with 3.

## 5. The Code in Java

~~~java
// Returns the longest downward path from node, counted in nodes.
static int height(Node node) {
    if (node == null) return 0;
    int left = height(node.left);
    int right = height(node.right);
    best = Math.max(best, left + right); // longest path that bends at this node
    return 1 + Math.max(left, right);
}

// Longest path between any two nodes, counted in edges.
static int diameter(Node root) {
    best = 0;                            // reset: a static field keeps old values
    height(root);
    return best;
}
~~~

**What to point out in this code:**

- Java lambdas and inner classes cannot reassign a local variable of the enclosing method (captured locals must be *effectively final*), so the running maximum lives in a \`static int best\` field and \`diameter\` resets it to 0 before each run. Forgetting that reset is a classic bug when several test cases run in one program.
- Alternatives: an \`int[] best = {0}\` passed into the helper, or making the helper an instance method of a small solver object with a \`best\` field. All three are fine to say in an interview; the field is the shortest.
- Everything is \`int\`: the values cannot overflow for any tree that fits in memory, and primitives avoid boxing.
- The examples build the tree from an \`Integer[]\` in level order where \`null\` marks a missing child, with an \`ArrayDeque\` as the queue (see [level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree)).

📌 **Interview term: Effectively final** — a local variable that is never reassigned after it is set. Only such variables can be used inside a lambda or inner class, which is why the running maximum cannot be a plain local \`int\`.

The brute force, for comparison (example 2 measures it):

~~~java
// Try every node as the bend point, recomputing heights each time.
static int brute(Node node) {
    if (node == null) return 0;
    int through = height(node.left) + height(node.right);
    return Math.max(through, Math.max(brute(node.left), brute(node.right)));
}
~~~

Each \`brute\` call walks both child subtrees again through \`height\`, which is where the O(n · h) comes from. Both versions recurse once per level: with the default stack, 10,000 nested calls worked and 100,000 threw \`StackOverflowError\` in our run.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21 (the code only uses Java 17 features)). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 1 runs the one-pass solution on five trees, including the one whose longest path skips the root. Example 2 reconstructs the longest path itself and counts how many real nodes the brute force and the one pass touch.

**Example 1 — the one-pass diameter on five trees** prints:

~~~text
3
6
1
0
0
~~~

**Example 2 — the path itself, and brute force vs one pass** prints:

~~~text
longest path: 4 -> 2 -> 1 -> 3 (3 edges)
longest path: 5 -> 4 -> 3 -> 2 -> 6 -> 7 -> 8 (6 edges)
perfect tree, 10 levels (1023 nodes): diameter 18/18, brute force touched 8194, one pass touched 1023
left chain (300 nodes): diameter 299/299, brute force touched 44850, one pass touched 300
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (heights from scratch at every node) | O(n · h): O(n log n) balanced, O(n²) for a chain | O(h) | 8,194 touches for 1,023 nodes and 44,850 for a 300-node chain (example 2) |
| One post-order pass | O(n) | O(h) | each node returns its height once: exactly 1,023 and 300 touches |

n is the number of nodes and h the height. The space is the recursion stack — O(log n) for a balanced tree, O(n) for a chain (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)). Reconstructing the path in example 2 adds an extra walk down two branches; it is written for clarity (it recomputes heights while walking), not speed.

## 8. Edge Cases

- **Empty tree** — 0 (nothing to measure).
- **A single node** — 0 edges. Returning 1 here means you are counting nodes; check which one the interviewer wants.
- **Two nodes** — 1.
- **The longest path skips the root** — \`[1, 2, null, 3, 6, 4, null, null, 7, 5, null, null, 8]\` must return 6, not 4.
- **A chain** — the diameter is n − 1, the bend is the top node, and it is also the input that stresses the call stack.
- **Ties** — several paths can share the longest length; the length is unique even when the path is not. Example 2 breaks ties by preferring the left branch.

## Common Pitfalls

- **Answering height(left) + height(right) at the root only.** It misses diameters that bend lower down (6 vs 4 in the big example).
- **Returning the diameter instead of the height.** The recursive call must return the height; the diameter goes into the side variable.
- **Not resetting the static \`best\`.** Two test cases in one run share it; reset it at the start of \`diameter\`.
- **Trying to update a local from a lambda.** It will not compile (captured locals must be effectively final); use a field or an \`int[]\`.
- **Edges vs nodes.** \`left + right\` is edges when height counts nodes; adding 1 gives the node count instead.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">The diameter is the number of edges on the longest path between any two nodes; the path need not pass through the root.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Key fact:</strong> <span style="color:#f0e2c8;">Every path has a highest node where it bends; the longest path bending at X has height(left) + height(right) edges.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;">One post-order pass: each call returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + max(L, R)</code> to its parent and updates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best = max(best, L + R)</code> on the side.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(h) stack; recomputing heights at every node is O(n · h), O(n²) on a chain.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Captured locals must be effectively final, so keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> in a field (reset per call) or an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can the parent ignore its children's diameters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A path that bends above a child can only use one downward branch of it, which is exactly the child's height. Paths that bend inside the child were already recorded in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> when the child was processed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the path, not just its length?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Remember the node where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> was last improved. From it, walk down the deeper child repeatedly on each side, then join the reversed left walk, the bend node and the right walk.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this change for the maximum path sum (values can be negative)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same shape: return the best downward sum <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val + max(0, L, R)</code> and record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val + max(0, L) + max(0, R)</code>. Clamping at 0 drops branches that only hurt.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about a general tree or a graph without cycles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For an N-ary tree, keep the two largest child heights. For an unrooted tree, two BFS runs also work: from any node find the farthest node A, then the farthest from A is the diameter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the space really O(h)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the recursion stack holds one frame per level of the current path, plus O(1) per frame. That is O(log n) when balanced and O(n) for a chain.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Diameter of a tree** | Edges on the longest path between any two nodes |
| **Height of a subtree** | Nodes on the longest downward path from a node (empty = 0) |
| **Post-order traversal** | Left, right, then the node itself |
| **Return value vs. global answer** | What a call gives its parent differs from what you are computing overall |
| **Tree DP (dynamic programming on trees)** | Build each subtree's answer from its children's, bottom-up |
| **Effectively final** | A local never reassigned; the only kind a lambda may capture |

Related: [checking whether a binary tree is balanced](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced) uses the same "return the height, decide something on the side" post-order pattern.

---
**Conclusion:** The diameter is a maximum over every possible bend node, and the bend at node X gives height(left) + height(right) edges. One post-order pass computes all of them: \`height\` returns an \`int\` to its parent and updates a \`best\` field that \`diameter\` resets before each run. That is O(n) time and O(h) stack, against O(n · h) for recomputing heights — 300 touches instead of 44,850 on a 300-node chain in our run — and it correctly returns 6, not 4, for a tree whose longest path skips the root.`,
        examples: [
          {
            label: "One post-order pass: return height, record L + R (5 trees)",
            code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    // Build a tree from a level-order array; null marks a missing child.
    static Node build(Integer[] values) {
        if (values.length == 0 || values[0] == null) return null;
        Node root = new Node(values[0]);
        Deque<Node> queue = new ArrayDeque<>();
        queue.offer(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            Node node = queue.poll();
            if (i < values.length && values[i] != null) {
                node.left = new Node(values[i]);
                queue.offer(node.left);
            }
            i++;
            if (i < values.length && values[i] != null) {
                node.right = new Node(values[i]);
                queue.offer(node.right);
            }
            i++;
        }
        return root;
    }


    static int best; // longest path found so far, in edges

    // Returns the longest downward path from node, counted in nodes.
    static int height(Node node) {
        if (node == null) return 0;
        int left = height(node.left);
        int right = height(node.right);
        best = Math.max(best, left + right); // longest path that bends at this node
        return 1 + Math.max(left, right);
    }

    // Longest path between any two nodes, counted in edges.
    static int diameter(Node root) {
        best = 0;                            // reset: a static field keeps old values
        height(root);
        return best;
    }

    public static void main(String[] args) {
        System.out.println(diameter(build(new Integer[]{1, 2, 3, 4, 5})));       // 3
        System.out.println(diameter(build(new Integer[]{1, 2, null, 3, 6, 4, null, null, 7, 5, null, null, 8}))); // 6
        System.out.println(diameter(build(new Integer[]{1, 2})));                // 1
        System.out.println(diameter(build(new Integer[]{1})));                   // 0
        System.out.println(diameter(build(new Integer[]{})));                    // 0
    }
}`,
          },
          {
            label: "Reconstruct the longest path; brute force vs one pass",
            code: `import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.ArrayList;
import java.util.Collections;

public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    // Build a tree from a level-order array; null marks a missing child.
    static Node build(Integer[] values) {
        if (values.length == 0 || values[0] == null) return null;
        Node root = new Node(values[0]);
        Deque<Node> queue = new ArrayDeque<>();
        queue.offer(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            Node node = queue.poll();
            if (i < values.length && values[i] != null) {
                node.left = new Node(values[i]);
                queue.offer(node.left);
            }
            i++;
            if (i < values.length && values[i] != null) {
                node.right = new Node(values[i]);
                queue.offer(node.right);
            }
            i++;
        }
        return root;
    }


    static int counter = 0;
    static long work = 0;

    static Node perfect(int depth) {
        if (depth == 0) return null;
        Node node = new Node(++counter);
        node.left = perfect(depth - 1);
        node.right = perfect(depth - 1);
        return node;
    }

    static Node chain(int n) {
        Node root = new Node(1);
        Node cur = root;
        for (int v = 2; v <= n; v++) {
            cur.left = new Node(v);
            cur = cur.left;
        }
        return root;
    }

    static int height(Node node) {
        if (node == null) return 0;
        work++;
        return 1 + Math.max(height(node.left), height(node.right));
    }

    // Try every node as the bend point, recomputing heights each time.
    static int brute(Node node) {
        if (node == null) return 0;
        int through = height(node.left) + height(node.right);
        return Math.max(through, Math.max(brute(node.left), brute(node.right)));
    }

    static int best;
    static Node bend;

    // Post-order: each node returns its height once and records the bend.
    static int h(Node node) {
        if (node == null) return 0;
        work++;
        int left = h(node.left);
        int right = h(node.right);
        if (left + right > best) {
            best = left + right;
            bend = node;
        }
        return 1 + Math.max(left, right);
    }

    static int onePass(Node root) {
        best = 0;
        bend = null;
        h(root);
        return best;
    }

    // Values on a longest downward path from node (left wins ties).
    static List<Integer> deepestPath(Node node) {
        List<Integer> path = new ArrayList<>();
        while (node != null) {
            path.add(node.val);
            node = height(node.left) >= height(node.right) ? node.left : node.right;
        }
        return path;
    }

    static List<Integer> longestPath(Node root) {
        onePass(root);
        List<Integer> out = new ArrayList<>();
        if (bend == null) {
            if (root != null) out.add(root.val);
            return out;
        }
        Node b = bend;
        out.addAll(deepestPath(b.left));
        Collections.reverse(out);
        out.add(b.val);
        out.addAll(deepestPath(b.right));
        return out;
    }

    static String join(List<Integer> path) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < path.size(); i++) {
            if (i > 0) sb.append(" -> ");
            sb.append(path.get(i));
        }
        return sb.toString();
    }

    public static void main(String[] args) {
        Integer[][] inputs = {{1, 2, 3, 4, 5}, {1, 2, null, 3, 6, 4, null, null, 7, 5, null, null, 8}};
        for (Integer[] vals : inputs) {
            List<Integer> path = longestPath(build(vals));
            System.out.println("longest path: " + join(path) + " (" + (path.size() - 1) + " edges)");
        }
        String[] names = {"perfect tree, 10 levels", "left chain"};
        Node[] roots = {perfect(10), chain(300)};
        int[] sizes = {1023, 300};
        for (int i = 0; i < 2; i++) {
            work = 0;
            int a = brute(roots[i]);
            long slow = work;
            work = 0;
            int b = onePass(roots[i]);
            long fast = work;
            System.out.println(names[i] + " (" + sizes[i] + " nodes): diameter " + a + "/" + b
                + ", brute force touched " + slow + ", one pass touched " + fast);
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given the root of a binary tree, write a C++ function that returns the length of its diameter: the number of edges on the longest path between any two nodes. The path does not have to pass through the root."

**What a strong answer should cover:**
- Every path has a highest (bend) node; the longest path bending at a node has height(left) + height(right) edges.
- The answer is the maximum over all nodes, so a root-only computation is wrong when the longest path sits inside one subtree.
- One post-order pass: return the height to the parent, record the best left + right on the side — O(n) time, O(h) space.
- Why recomputing heights at every node is O(n · h), O(n²) on a chain.
- C++ details: pass the running maximum as \`int&\` (by value updates a copy), take \`const Node*\`, and stack overflow on deep chains is a crash.
- Edges vs nodes: a single node has diameter 0.

**Clarifying questions expected:**
- Is the length measured in edges or in nodes?
- Must the path go through the root?

**Code / implementation expected:** Yes — \`int height(const Node* node, int& best)\` plus \`int diameter(const Node* root)\`, in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree and a recursive function are; everything else is explained.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a family of hikers spread over a network of mountain trails that never form a loop — every trail splits into at most two smaller trails as it goes downhill. Two friends want to stand as far apart as possible *along the trails* so they can test their walkie-talkies. Where should they stand?

Your first guess might be "one at the very top, one at the deepest point". But the top is not special. The two farthest points could both be deep in one valley, joined by a long trail that turns at a junction halfway down and never goes near the summit.

That is the **diameter** of a binary tree: the number of edges on the longest path between any two nodes. The path may start and end anywhere, it goes up from one end to some turning node and then down to the other end, and — the key insight — the turning node does not have to be the root.

Interviewers like this question because it looks like "find the height", which most candidates know, yet the answer is not stored in the height. It forces you to separate *what a recursive call returns to its parent* from *what you are trying to compute overall*. That pattern — return one thing, record another on the side — shows up again in maximum path sum, longest univalue path and many other tree problems.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the length counted in edges or in nodes? | The usual (LeetCode 543) answer counts **edges**: one node has diameter 0, two connected nodes have diameter 1. Counting nodes adds 1. |
| Must the path go through the root? | No, in the standard problem. Saying it out loud shows you know the trap. |
| What should an empty tree return? | Usually 0. It decides the base case. |
| Do you want just the length, or the path itself? | Returning the nodes means remembering the turning node and walking down twice; see example 2. |
| How deep can the tree be? | A chain of 100,000 nodes can overflow a recursive solution's call stack. |

## 3. The Core Idea

Every path in a tree has one highest node — the place where it stops going up and starts going down. Call it the path's **bend**. A path that bends at node X goes down into X's left subtree as far as it can and down into X's right subtree as far as it can. So:

> the longest path that bends at X = (height of X's left subtree) + (height of X's right subtree), counted in edges, when height counts nodes.

📌 **Interview term: Diameter of a tree** — the number of edges on the longest path between any two nodes. It is a maximum over all possible bend nodes, not a property of the root.

📌 **Interview term: Height of a subtree** — nodes on the longest downward path from that node (empty subtree = 0, leaf = 1). Computing it alone is the [maximum depth of a binary tree](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree) problem. With this convention, the longest path bending at X has exactly left height + right height **edges**: each level below X on either side adds one edge.

<svg class="iq-diagram" width="100%" viewBox="0 0 520 290" role="img" aria-label="Tree with root 1, children 2 and 3, and 2 has children 4 and 5. The longest path 4 to 2 to 1 to 3 has three edges and bends at the root">
  <rect class="d-box-muted" x="124" y="4" width="272" height="28" rx="14"/>
  <text class="d-text" x="260" y="23" text-anchor="middle">Diameter 3: bends at the root</text>
  <path class="d-edge-accent" d="M 320 80 L 140 160"/>
  <path class="d-edge-accent" d="M 320 80 L 410 160"/>
  <path class="d-edge-accent" d="M 140 160 L 50 240"/>
  <path class="d-edge" d="M 140 160 L 230 240"/>
  <circle class="d-box-accent" cx="320" cy="80" r="20"/>
  <text class="d-text" x="320" y="85" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="140" cy="160" r="20"/>
  <text class="d-text" x="140" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="410" cy="160" r="20"/>
  <text class="d-text" x="410" y="165" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="50" cy="240" r="20"/>
  <text class="d-text" x="50" y="245" text-anchor="middle">4</text>
  <circle class="d-box" cx="230" cy="240" r="20"/>
  <text class="d-text" x="230" y="245" text-anchor="middle">5</text>
  <text class="d-sub" x="346" y="66">2 + 1 = 3</text>
  <text class="d-sub" x="114" y="146" text-anchor="end">h=2</text>
  <text class="d-sub" x="436" y="146">h=1</text>
  <text class="d-sub" x="24" y="226" text-anchor="end">h=1</text>
  <text class="d-sub" x="256" y="226">h=1</text>
</svg>

In the small tree, node 1 has a left height of 2 (via 2 and 4) and a right height of 1 (node 3). The longest path through it is 4 → 2 → 1 → 3, with 2 + 1 = 3 edges, and here the root happens to be the best bend.

<svg class="iq-diagram" width="100%" viewBox="0 0 790 450" role="img" aria-label="A tree whose longest path 5 4 3 2 6 7 8 has six edges and bends at node 2, below the root, so it never touches the root">
  <rect class="d-box-muted" x="267" y="4" width="256" height="28" rx="14"/>
  <text class="d-text" x="395" y="23" text-anchor="middle">Diameter 6: bends at node 2</text>
  <path class="d-edge" d="M 680 80 L 320 160"/>
  <path class="d-edge-accent" d="M 320 160 L 230 240"/>
  <path class="d-edge-accent" d="M 320 160 L 410 240"/>
  <path class="d-edge-accent" d="M 230 240 L 140 320"/>
  <path class="d-edge-accent" d="M 410 240 L 500 320"/>
  <path class="d-edge-accent" d="M 140 320 L 50 400"/>
  <path class="d-edge-accent" d="M 500 320 L 590 400"/>
  <circle class="d-box-muted" cx="680" cy="80" r="20"/>
  <text class="d-text" x="680" y="85" text-anchor="middle">1</text>
  <circle class="d-box-accent" cx="320" cy="160" r="20"/>
  <text class="d-text" x="320" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="230" cy="240" r="20"/>
  <text class="d-text" x="230" y="245" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="410" cy="240" r="20"/>
  <text class="d-text" x="410" y="245" text-anchor="middle">6</text>
  <circle class="d-box-accent" cx="140" cy="320" r="20"/>
  <text class="d-text" x="140" y="325" text-anchor="middle">4</text>
  <circle class="d-box-accent" cx="500" cy="320" r="20"/>
  <text class="d-text" x="500" y="325" text-anchor="middle">7</text>
  <circle class="d-box-accent" cx="50" cy="400" r="20"/>
  <text class="d-text" x="50" y="405" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="590" cy="400" r="20"/>
  <text class="d-text" x="590" y="405" text-anchor="middle">8</text>
  <text class="d-sub" x="706" y="66">4 + 0 = 4</text>
  <text class="d-sub" x="294" y="146" text-anchor="end">3 + 3 = 6</text>
</svg>

In the bigger tree the root only offers 4 + 0 = 4 edges, because everything hangs off its left side. Node 2 offers 3 + 3 = 6: down the left to 5 and down the right to 8. The answer is 6 and the path never visits the root. Any solution that computes "height of root.left + height of root.right" returns 4 here — example 1 tests this exact tree.

## 4. From Brute Force to One Pass

**Brute force.** Try every node as the bend: for each node, compute the height of its left and right subtrees from scratch and keep the largest sum. It is correct but, like the naive [balanced-tree check](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced), it re-walks each node once per ancestor: O(n · h), which is O(n²) on a chain. Example 2 counts 44,850 node visits for a 300-node chain.

**One pass.** Notice that the height function already *has* both child heights in hand right before it returns. So let it do two jobs at once:

1. **Return** to its parent the subtree height, 1 + max(L, R) — that is what the parent needs.
2. **Record** on the side the best diameter seen so far, max(best, L + R) — that is what *we* need.

📌 **Interview term: Post-order traversal** — process the left subtree, then the right, then the node. Only then does the node know both child heights. See the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods).

📌 **Interview term: Return value vs. global answer** — the classic tree-DP split: what a recursive call hands back to its parent (here the height) is often *not* the final answer; the final answer (here the diameter) is accumulated in a variable outside the recursion.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="At each node the left height L and the right height R arrive from the children. The node records L plus R as a candidate diameter and returns one plus the larger of L and R to its parent">
  <defs>
    <marker id="b16q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="170" height="64" rx="10"/>
  <text class="d-text" x="105" y="58" text-anchor="middle">L = height(left)</text>
  <text class="d-sub" x="105" y="78" text-anchor="middle">from the left child</text>
  <rect class="d-box" x="570" y="30" width="170" height="64" rx="10"/>
  <text class="d-text" x="655" y="58" text-anchor="middle">R = height(right)</text>
  <text class="d-sub" x="655" y="78" text-anchor="middle">from the right child</text>
  <path class="d-edge" d="M 192 62 L 296 62" marker-end="url(#b16q2-arrow)"/>
  <path class="d-edge" d="M 568 62 L 464 62" marker-end="url(#b16q2-arrow)"/>
  <rect class="d-box-muted" x="300" y="30" width="160" height="64" rx="10"/>
  <text class="d-text" x="380" y="58" text-anchor="middle">this node</text>
  <text class="d-sub" x="380" y="78" text-anchor="middle">children done first</text>
  <path class="d-edge" d="M 340 96 L 220 160" marker-end="url(#b16q2-arrow)"/>
  <path class="d-edge" d="M 420 96 L 540 160" marker-end="url(#b16q2-arrow)"/>
  <rect class="d-box-accent" x="60" y="164" width="260" height="64" rx="10"/>
  <text class="d-text" x="190" y="192" text-anchor="middle">best = max(best, L + R)</text>
  <text class="d-sub" x="190" y="212" text-anchor="middle">path that bends here, in edges</text>
  <rect class="d-box-accent" x="440" y="164" width="260" height="64" rx="10"/>
  <text class="d-text" x="570" y="192" text-anchor="middle">return 1 + max(L, R)</text>
  <text class="d-sub" x="570" y="212" text-anchor="middle">longest way down, for the parent</text>
</svg>

The left arrow is what the call reports upward; the right arrow is what it writes into the shared \`best\`. The parent never needs to know the diameter of its children — only their heights — because any path that bends higher up can only use one downward branch of each child.

📌 **Interview term: Tree DP (dynamic programming on trees)** — computing an answer for every subtree from its children's answers, bottom-up, so each node is processed once.

Here is the one pass on \`[1, 2, 3, 4, 5]\`, in the order the calls finish:

| Node | L | R | L + R (candidate) | best after | returns |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 4 | 0 | 0 | 0 | 0 | 1 |
| 5 | 0 | 0 | 0 | 0 | 1 |
| 2 | 1 | 1 | 2 | 2 | 2 |
| 3 | 0 | 0 | 0 | 2 | 1 |
| 1 | 2 | 1 | **3** | **3** | 3 |

Note how node 2 offers the path 4 → 2 → 5 (2 edges) first; the root then beats it with 3.

## 5. The Code in C++

~~~cpp
// Returns the longest downward path from node (in nodes); updates best (in edges).
int height(const Node* node, int& best) {
    if (node == nullptr) return 0;
    int left = height(node->left, best);
    int right = height(node->right, best);
    best = std::max(best, left + right);   // longest path that bends at this node
    return 1 + std::max(left, right);
}

// Longest path between any two nodes, counted in edges.
int diameter(const Node* root) {
    int best = 0;
    height(root, best);
    return best;
}
~~~

**What to point out in this code:**

- The running maximum is passed by reference (\`int& best\`), so every recursive call updates the same variable in \`diameter\`'s stack frame — no global, and each call of \`diameter\` starts from 0.
- A lambda alternative is possible, but a lambda cannot call itself by name; in C++17 you would need \`std::function\` or pass the lambda to itself. The plain helper function is simpler to write under pressure.
- \`const Node*\` documents that the walk does not modify the tree; \`nullptr\` is the base case.
- The examples build the tree from a \`std::vector<int>\` in level order with \`INT_MIN\` (named \`N\`) marking missing children, and own all nodes through \`std::unique_ptr\` in a vector.

📌 **Interview term: Pass by reference** — giving a function an alias (\`int&\`) to the caller's variable instead of a copy, so changes are visible to the caller.

The brute force, for comparison (example 2 measures it):

~~~cpp
// Try every node as the bend point, recomputing heights each time.
int brute(const Node* node) {
    if (node == nullptr) return 0;
    int through = height(node->left) + height(node->right);
    return std::max({through, brute(node->left), brute(node->right)});
}
~~~

\`std::max({a, b, c})\` takes an initializer list, so three values can be compared at once. Each \`brute\` call walks both child subtrees again through \`height\`, which is where the O(n · h) comes from. A very deep chain can overflow the stack, which in C++ is a crash rather than an exception.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13 with -std=c++17). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 1 runs the one-pass solution on five trees, including the one whose longest path skips the root. Example 2 reconstructs the longest path itself and counts how many real nodes the brute force and the one pass touch.

**Example 1 — the one-pass diameter on five trees** prints:

~~~text
3
6
1
0
0
~~~

**Example 2 — the path itself, and brute force vs one pass** prints:

~~~text
longest path: 4 -> 2 -> 1 -> 3 (3 edges)
longest path: 5 -> 4 -> 3 -> 2 -> 6 -> 7 -> 8 (6 edges)
perfect tree, 10 levels (1023 nodes): diameter 18/18, brute force touched 8194, one pass touched 1023
left chain (300 nodes): diameter 299/299, brute force touched 44850, one pass touched 300
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (heights from scratch at every node) | O(n · h): O(n log n) balanced, O(n²) for a chain | O(h) | 8,194 touches for 1,023 nodes and 44,850 for a 300-node chain (example 2) |
| One post-order pass | O(n) | O(h) | each node returns its height once: exactly 1,023 and 300 touches |

n is the number of nodes and h the height. The space is the recursion stack — O(log n) for a balanced tree, O(n) for a chain (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)). Reconstructing the path in example 2 adds an extra walk down two branches; it is written for clarity (it recomputes heights while walking), not speed.

## 8. Edge Cases

- **Empty tree** — 0 (nothing to measure).
- **A single node** — 0 edges. Returning 1 here means you are counting nodes; check which one the interviewer wants.
- **Two nodes** — 1.
- **The longest path skips the root** — \`[1, 2, null, 3, 6, 4, null, null, 7, 5, null, null, 8]\` must return 6, not 4.
- **A chain** — the diameter is n − 1, the bend is the top node, and it is also the input that stresses the call stack.
- **Ties** — several paths can share the longest length; the length is unique even when the path is not. Example 2 breaks ties by preferring the left branch.

## Common Pitfalls

- **Answering height(left) + height(right) at the root only.** It misses diameters that bend lower down (6 vs 4 in the big example).
- **Returning the diameter instead of the height.** The recursive call must return the height; the diameter goes into the side variable.
- **Passing \`best\` by value.** Writing \`int height(const Node*, int best)\` updates a copy, and the answer stays 0. It must be \`int&\`.
- **A global \`best\` that is never reset.** Same symptom as in other languages: the second tree inherits the first answer.
- **Edges vs nodes.** \`left + right\` is edges when height counts nodes; adding 1 gives the node count instead.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">The diameter is the number of edges on the longest path between any two nodes; the path need not pass through the root.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Key fact:</strong> <span style="color:#f0e2c8;">Every path has a highest node where it bends; the longest path bending at X has height(left) + height(right) edges.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;">One post-order pass: each call returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 + max(L, R)</code> to its parent and updates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best = max(best, L + R)</code> on the side.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(h) stack; recomputing heights at every node is O(n · h), O(n²) on a chain.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Pass the running maximum as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int&amp; best</code>; by value it would update a copy.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can the parent ignore its children's diameters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A path that bends above a child can only use one downward branch of it, which is exactly the child's height. Paths that bend inside the child were already recorded in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> when the child was processed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the path, not just its length?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Remember the node where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> was last improved. From it, walk down the deeper child repeatedly on each side, then join the reversed left walk, the bend node and the right walk.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this change for the maximum path sum (values can be negative)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same shape: return the best downward sum <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val + max(0, L, R)</code> and record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val + max(0, L) + max(0, R)</code>. Clamping at 0 drops branches that only hurt.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about a general tree or a graph without cycles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For an N-ary tree, keep the two largest child heights. For an unrooted tree, two BFS runs also work: from any node find the farthest node A, then the farthest from A is the diameter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the space really O(h)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the recursion stack holds one frame per level of the current path, plus O(1) per frame. That is O(log n) when balanced and O(n) for a chain.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Diameter of a tree** | Edges on the longest path between any two nodes |
| **Height of a subtree** | Nodes on the longest downward path from a node (empty = 0) |
| **Post-order traversal** | Left, right, then the node itself |
| **Return value vs. global answer** | What a call gives its parent differs from what you are computing overall |
| **Tree DP (dynamic programming on trees)** | Build each subtree's answer from its children's, bottom-up |
| **Pass by reference** | An \`int&\` alias to the caller's variable instead of a copy |

Related: [checking whether a binary tree is balanced](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced) uses the same "return the height, decide something on the side" post-order pattern.

---
**Conclusion:** The diameter is a maximum over every possible bend node, and the bend at node X gives height(left) + height(right) edges. One post-order pass computes all of them: \`height\` returns its height to the parent and updates the caller's \`best\` through an \`int&\`. That is O(n) time and O(h) stack, against O(n · h) for recomputing heights — 300 touches instead of 44,850 on a 300-node chain in our run — and it correctly returns 6, not 4, for a tree whose longest path skips the root.`,
        examples: [
          {
            label: "One post-order pass: return height, record L + R (5 trees)",
            code: `#include <algorithm>
#include <climits>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <queue>
#include <vector>

struct Node {
    int val;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int v) : val(v) {}
};

const int N = INT_MIN;                       // marks a missing child in the input
std::vector<std::unique_ptr<Node>> pool;     // owns every node, frees them at exit

Node* make(int v) {
    pool.push_back(std::make_unique<Node>(v));
    return pool.back().get();
}

// Build a tree from a level-order vector; N marks a missing child.
Node* build(const std::vector<int>& values) {
    if (values.empty() || values[0] == N) return nullptr;
    Node* root = make(values[0]);
    std::queue<Node*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        Node* node = q.front();
        q.pop();
        if (i < values.size() && values[i] != N) {
            node->left = make(values[i]);
            q.push(node->left);
        }
        i++;
        if (i < values.size() && values[i] != N) {
            node->right = make(values[i]);
            q.push(node->right);
        }
        i++;
    }
    return root;
}

// Returns the longest downward path from node (in nodes); updates best (in edges).
int height(const Node* node, int& best) {
    if (node == nullptr) return 0;
    int left = height(node->left, best);
    int right = height(node->right, best);
    best = std::max(best, left + right);   // longest path that bends at this node
    return 1 + std::max(left, right);
}

// Longest path between any two nodes, counted in edges.
int diameter(const Node* root) {
    int best = 0;
    height(root, best);
    return best;
}

int main() {
    std::cout << diameter(build({1, 2, 3, 4, 5})) << "\\n";                          // 3
    std::cout << diameter(build({1, 2, N, 3, 6, 4, N, N, 7, 5, N, N, 8})) << "\\n";  // 6
    std::cout << diameter(build({1, 2})) << "\\n";                                   // 1
    std::cout << diameter(build({1})) << "\\n";                                      // 0
    std::cout << diameter(build({})) << "\\n";                                       // 0
}`,
          },
          {
            label: "Reconstruct the longest path; brute force vs one pass",
            code: `#include <algorithm>
#include <climits>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <queue>
#include <string>
#include <vector>

struct Node {
    int val;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int v) : val(v) {}
};

const int N = INT_MIN;                       // marks a missing child in the input
std::vector<std::unique_ptr<Node>> pool;     // owns every node, frees them at exit

Node* make(int v) {
    pool.push_back(std::make_unique<Node>(v));
    return pool.back().get();
}

// Build a tree from a level-order vector; N marks a missing child.
Node* build(const std::vector<int>& values) {
    if (values.empty() || values[0] == N) return nullptr;
    Node* root = make(values[0]);
    std::queue<Node*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        Node* node = q.front();
        q.pop();
        if (i < values.size() && values[i] != N) {
            node->left = make(values[i]);
            q.push(node->left);
        }
        i++;
        if (i < values.size() && values[i] != N) {
            node->right = make(values[i]);
            q.push(node->right);
        }
        i++;
    }
    return root;
}
int counter = 0;
long long work = 0;

Node* perfect(int depth) {
    if (depth == 0) return nullptr;
    Node* node = make(++counter);
    node->left = perfect(depth - 1);
    node->right = perfect(depth - 1);
    return node;
}

Node* chain(int n) {
    Node* root = make(1);
    Node* cur = root;
    for (int v = 2; v <= n; v++) {
        cur->left = make(v);
        cur = cur->left;
    }
    return root;
}

int height(const Node* node) {
    if (node == nullptr) return 0;
    work++;
    return 1 + std::max(height(node->left), height(node->right));
}

// Try every node as the bend point, recomputing heights each time.
int brute(const Node* node) {
    if (node == nullptr) return 0;
    int through = height(node->left) + height(node->right);
    return std::max({through, brute(node->left), brute(node->right)});
}

// Post-order: each node returns its height once and records the bend.
int h(const Node* node, int& best, const Node*& bend) {
    if (node == nullptr) return 0;
    work++;
    int left = h(node->left, best, bend);
    int right = h(node->right, best, bend);
    if (left + right > best) {
        best = left + right;
        bend = node;
    }
    return 1 + std::max(left, right);
}

std::pair<int, const Node*> onePass(const Node* root) {
    int best = 0;
    const Node* bend = nullptr;
    h(root, best, bend);
    return {best, bend};
}

// Values on a longest downward path from node (left wins ties).
std::vector<int> deepestPath(const Node* node) {
    std::vector<int> path;
    while (node != nullptr) {
        path.push_back(node->val);
        node = height(node->left) >= height(node->right) ? node->left : node->right;
    }
    return path;
}

std::vector<int> longestPath(const Node* root) {
    auto [len, bend] = onePass(root);
    (void)len;
    if (bend == nullptr) return root ? std::vector<int>{root->val} : std::vector<int>{};
    std::vector<int> out = deepestPath(bend->left);
    std::reverse(out.begin(), out.end());
    out.push_back(bend->val);
    for (int v : deepestPath(bend->right)) out.push_back(v);
    return out;
}

int main() {
    std::vector<std::vector<int>> inputs = {{1, 2, 3, 4, 5}, {1, 2, N, 3, 6, 4, N, N, 7, 5, N, N, 8}};
    for (const auto& vals : inputs) {
        std::vector<int> path = longestPath(build(vals));
        std::cout << "longest path: ";
        for (size_t i = 0; i < path.size(); i++) std::cout << (i ? " -> " : "") << path[i];
        std::cout << " (" << path.size() - 1 << " edges)\\n";
    }
    std::vector<std::string> names = {"perfect tree, 10 levels", "left chain"};
    std::vector<const Node*> roots = {perfect(10), chain(300)};
    std::vector<int> sizes = {1023, 300};
    for (int i = 0; i < 2; i++) {
        work = 0;
        int a = brute(roots[i]);
        long long slow = work;
        work = 0;
        int b = onePass(roots[i]).first;
        long long fast = work;
        std::cout << names[i] << " (" << sizes[i] << " nodes): diameter " << a << "/" << b
                  << ", brute force touched " << slow << ", one pass touched " << fast << "\\n";
    }
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you do a level-order (BFS) traversal of a tree?",
    difficulty: "medium",
    seoDescription: "Level-order (BFS) traversal of a binary tree with a queue and a level-size snapshot, plus zigzag and averages. Python, JavaScript, Java and C++, verified.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given the root of a binary tree, write a Python function that returns its values level by level — the root's level first, and left to right inside each level — as a list of lists. For example, the tree [3, 9, 20, null, null, 15, 7] should give [[3], [9, 20], [15, 7]]."

**What a strong answer should cover:**
- Level order is breadth-first search: a FIFO queue, children added left then right.
- How to group by level: snapshot the queue size at the start of each round (or keep each level in its own list).
- O(n) time and O(w) space, where w is the widest level — about n/2 for a perfect tree.
- Python details: \`collections.deque.popleft()\` is O(1) while \`list.pop(0)\` is O(n); \`range(len(queue))\` is evaluated once, so it works as the size snapshot.
- The DFS alternative (pre-order with a depth index) and when BFS is preferable (stop early, very deep trees).
- The usual variants: zigzag, bottom-up, level averages, right-side view.

**Code / implementation expected:** Yes — \`level_order(root)\` returning a list of lists, using \`collections.deque\`, in Python 3.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree is; queues and BFS are explained here.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think of a family photo for a big reunion. The photographer does not shuffle people randomly; she calls them row by row: "Grandparents in the front row! Now their children behind them! Now the grandchildren at the back!" And within each row, people stand from left to right.

That is a **level-order traversal**: visit the root, then everyone one step below it, then everyone two steps below, and so on, left to right inside each level. The other common traversals (pre-order, in-order, post-order — see the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods)) dive deep down one branch before coming back; level order instead spreads out evenly, like ripples from a stone dropped at the root.

Interviewers ask for it because it is the tree version of **breadth-first search (BFS)**, the most important graph algorithm for "fewest steps" questions, and because a surprising number of tree problems are just level order with a small twist: the [right-side view of a binary tree](/interview-question/how-do-you-get-the-right-side-view-of-a-binary-tree), zigzag order, level averages, the minimum depth, connecting next pointers, or turning a tree into a string level by level ([serialize and deserialize a binary tree](/interview-question/how-do-you-serialize-and-deserialize-a-binary-tree)). Get the basic loop exactly right once, and all of those become five-minute problems.

## 2. The Core Idea

📌 **Interview term: Level (depth) of a node** — how many edges separate it from the root. The root is on level 0, its children on level 1, and so on.

📌 **Interview term: Level-order traversal** — visiting nodes level by level from the top, left to right within a level. The usual output groups them: \`[[3], [9, 20], [15, 7]]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 250" role="img" aria-label="Tree with root 3 on level 0, nodes 9 and 20 on level 1, and nodes 15 and 7 on level 2">
  <rect class="d-box-muted" x="8" y="10" width="664" height="60" rx="10"/>
  <text class="d-sub" x="22" y="44">level 0</text>
  <rect class="d-box-muted" x="8" y="90" width="664" height="60" rx="10"/>
  <text class="d-sub" x="22" y="124">level 1</text>
  <rect class="d-box-muted" x="8" y="170" width="664" height="60" rx="10"/>
  <text class="d-sub" x="22" y="204">level 2</text>
  <path class="d-edge" d="M 220 40 L 130 120"/>
  <path class="d-edge" d="M 220 40 L 400 120"/>
  <path class="d-edge" d="M 400 120 L 310 200"/>
  <path class="d-edge" d="M 400 120 L 490 200"/>
  <circle class="d-box" cx="220" cy="40" r="20"/>
  <text class="d-text" x="220" y="45" text-anchor="middle">3</text>
  <circle class="d-box" cx="130" cy="120" r="20"/>
  <text class="d-text" x="130" y="125" text-anchor="middle">9</text>
  <circle class="d-box" cx="400" cy="120" r="20"/>
  <text class="d-text" x="400" y="125" text-anchor="middle">20</text>
  <circle class="d-box" cx="310" cy="200" r="20"/>
  <text class="d-text" x="310" y="205" text-anchor="middle">15</text>
  <circle class="d-box" cx="490" cy="200" r="20"/>
  <text class="d-text" x="490" y="205" text-anchor="middle">7</text>
</svg>

How do you visit nodes in that order? You cannot just recurse into the left child, because then you would reach 9's grandchildren before 20. You need a waiting line: when you visit a node, its children join the **back** of the line, and the next node to visit always comes from the **front**. Nodes therefore come out in exactly the order they went in, which is level by level.

📌 **Interview term: Queue (FIFO)** — a first-in, first-out container: add at the back (enqueue), remove from the front (dequeue). Both must be O(1) for BFS to be O(n). See the [difference between a stack and a queue](/interview-question/what-is-the-difference-between-a-stack-and-a-queue).

📌 **Interview term: Breadth-first search (BFS)** — explore everything at distance 1, then distance 2, and so on, using a queue. Level order is BFS on a tree. The general comparison with depth-first search is in the [difference between BFS and DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs).

### Knowing where one level ends

A plain BFS loop gives the right *order* — \`[3, 9, 20, 15, 7]\` — but loses the borders between levels. The standard fix is a **size snapshot**: at the start of each round, the queue holds exactly the nodes of one level (all of them, and nothing else). Read its size, remove exactly that many nodes, and every child you add during the round belongs to the next level.

📌 **Interview term: Level-size snapshot** — reading the queue's length once at the start of a round, so the loop processes exactly one level even though children are being added to the same queue.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="Three rounds of the queue: first it holds 3, then 9 and 20, then 15 and 7. Each round removes exactly the nodes that were in the queue when the round started">
  <defs>
    <marker id="b16q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="60">round 1</text>
  <rect class="d-box" x="120" y="34" width="70" height="44" rx="6"/>
  <text class="d-text" x="155" y="61" text-anchor="middle">3</text>
  <text class="d-sub" x="300" y="48" text-anchor="middle">size = 1</text>
  <path class="d-edge" d="M 250 60 L 446 60" marker-end="url(#b16q3-arrow)"/>
  <rect class="d-box-accent" x="450" y="34" width="290" height="44" rx="10"/>
  <text class="d-text" x="595" y="61" text-anchor="middle">level [3], enqueue 9 and 20</text>
  <text class="d-text" x="20" y="145">round 2</text>
  <rect class="d-box" x="120" y="119" width="70" height="44" rx="6"/>
  <text class="d-text" x="155" y="146" text-anchor="middle">9</text>
  <rect class="d-box" x="190" y="119" width="70" height="44" rx="6"/>
  <text class="d-text" x="225" y="146" text-anchor="middle">20</text>
  <text class="d-sub" x="340" y="133" text-anchor="middle">size = 2</text>
  <path class="d-edge" d="M 290 145 L 446 145" marker-end="url(#b16q3-arrow)"/>
  <rect class="d-box-accent" x="450" y="119" width="290" height="44" rx="10"/>
  <text class="d-text" x="595" y="146" text-anchor="middle">level [9, 20], enqueue 15 and 7</text>
  <text class="d-text" x="20" y="230">round 3</text>
  <rect class="d-box" x="120" y="204" width="70" height="44" rx="6"/>
  <text class="d-text" x="155" y="231" text-anchor="middle">15</text>
  <rect class="d-box" x="190" y="204" width="70" height="44" rx="6"/>
  <text class="d-text" x="225" y="231" text-anchor="middle">7</text>
  <text class="d-sub" x="340" y="218" text-anchor="middle">size = 2</text>
  <path class="d-edge" d="M 290 230 L 446 230" marker-end="url(#b16q3-arrow)"/>
  <rect class="d-box-accent" x="450" y="204" width="290" height="44" rx="10"/>
  <text class="d-text" x="595" y="231" text-anchor="middle">level [15, 7], queue now empty</text>
</svg>

Each round starts with one full level in the queue and ends with the next full level in it. The loop stops when a round adds no children, which leaves the queue empty.

## 3. Step by Step

1. If the root is empty, return an empty list.
2. Put the root in the queue.
3. While the queue is not empty:
   - read \`size\` = the number of nodes in the queue right now;
   - repeat \`size\` times: remove the front node, record its value in this level's list, add its left child and then its right child (if they exist) to the back;
   - append this level's list to the result.
4. Return the result.

Adding the **left child before the right child** is what makes each level come out left to right. Swapping the two lines gives each level right to left.

**Could you do it with DFS instead?** Yes: walk the tree in pre-order (node, left, right) carrying the depth, and append each value to \`result[depth]\`, creating that list the first time a depth is reached. Because the left subtree is always visited before the right one, each inner list is still left to right. Example 2 checks that this gives identical output. It uses O(h) stack instead of an O(w) queue, but the name of the question says BFS — lead with the queue and mention DFS as an alternative.

📌 **Interview term: Width of a tree** — the largest number of nodes on any one level. It bounds the queue size; a perfect tree's last level holds about half of all nodes.

## 4. The Code in Python

~~~python
def level_order(root):
    """Values grouped by level, top to bottom, left to right."""
    if root is None:
        return []
    result = []
    queue = deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):        # size snapshot = nodes on this level
            node = queue.popleft()         # O(1); list.pop(0) would be O(n)
            level.append(node.val)
            if node.left is not None:
                queue.append(node.left)
            if node.right is not None:
                queue.append(node.right)
        result.append(level)
    return result
~~~

**What to point out in this code:**

- **Use \`collections.deque\`, not a list.** \`deque.popleft()\` removes from the front in O(1). \`list.pop(0)\` shifts every remaining element one slot left, so it is O(n) per call and the whole BFS becomes O(n²). The Python documentation for [collections.deque](https://docs.python.org/3/library/collections.html#collections.deque) says lists "incur O(n) memory movement costs for pop(0)". In our sandbox, 100,000 \`pop(0)\` calls on a 200,000-item list took about 2.6 seconds; the same number of \`popleft()\` calls on a deque took about 0.002 seconds.
- \`for _ in range(len(queue))\` is the size snapshot, and in Python it is safe by construction: \`range(len(queue))\` is evaluated **once** when the loop starts, so appending children inside the loop does not change how many times it runs.
- Test children with \`is not None\`. Tree nodes are always truthy objects, so \`if node.left:\` also works, but \`is not None\` says what you mean and still works if someone later gives the node class a \`__len__\` or \`__bool__\`.
- Python's \`print\` already formats nested lists as \`[[3], [9, 20], [15, 7]]\`, which is why the examples can print the result directly.

📌 **Interview term: \`collections.deque\`** — Python's double-ended queue: O(1) \`append\`, \`appendleft\`, \`pop\` and \`popleft\`. The standard choice for BFS.

The DFS alternative from example 2, which builds the same lists using recursion and a depth counter:

~~~python
def dfs_levels(node, depth=0, result=None):
    """Same grouping with DFS: pre-order, left before right, append to result[depth]."""
    if result is None:
        result = []
    if node is None:
        return result
    if depth == len(result):
        result.append([])
    result[depth].append(node.val)
    dfs_levels(node.left, depth + 1, result)
    dfs_levels(node.right, depth + 1, result)
    return result
~~~

It uses \`result=None\` and creates the list inside the function on purpose: a default argument \`result=[]\` is evaluated once, when the function is defined, so it would be shared between calls and the second traversal would keep the first one's levels.

## 5. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 1 runs level order on five trees, including a chain and the empty tree. Example 2 runs the common variants on two trees — the plain BFS order, zigzag, bottom-up and per-level averages — and checks that the DFS version gives the same levels.

**Example 1 — level order on five trees** prints:

~~~text
[[3], [9, 20], [15, 7]]
[[1], [2, 3], [4, 5, 6]]
[[1], [2], [3]]
[[1]]
[]
~~~

**Example 2 — variants and the DFS cross-check** prints:

~~~text
levels:    [[3], [9, 20], [15, 7]]
flat BFS:  [3, 9, 20, 15, 7]
zigzag:    [[3], [20, 9], [15, 7]]
bottom-up: [[15, 7], [9, 20], [3]]
averages:  [3.00, 14.50, 11.00]
DFS gives the same levels: true
levels:    [[5], [1, 2], [3, 3, 1]]
flat BFS:  [5, 1, 2, 3, 3, 1]
zigzag:    [[5], [2, 1], [3, 3, 1]]
bottom-up: [[3, 3, 1], [1, 2], [5]]
averages:  [5.00, 1.50, 2.33]
DFS gives the same levels: true
~~~

## 6. Variants You Get for Free

Once the level loop is right, each of these is a one-line change, and example 2 prints all of them:

| Variant | Change | Output for \`[3, 9, 20, null, null, 15, 7]\` |
| :--- | :--- | :--- |
| Plain BFS order | drop the snapshot, append every value to one list | \`[3, 9, 20, 15, 7]\` |
| Zigzag | reverse every odd level | \`[[3], [20, 9], [15, 7]]\` |
| Bottom-up | reverse the list of levels | \`[[15, 7], [9, 20], [3]]\` |
| Level averages | sum each level and divide by its size | \`[3.00, 14.50, 11.00]\` |
| Right-side view | keep only the last value of each level | \`[3, 20, 7]\` — see the [right-side view of a binary tree](/interview-question/how-do-you-get-the-right-side-view-of-a-binary-tree) |
| Minimum depth | stop at the first leaf you meet and return its level + 1 (depth counted in nodes) | 2 (leaf 9 is on level 1) |

The minimum depth is a good example of why BFS matters: the first leaf found level by level is the shallowest one, so you can stop early instead of exploring the whole tree. (Its counterpart, the [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree), needs every level anyway.) The same "first time you reach it is the shortest" property is what makes BFS find shortest paths in unweighted graphs, as in [Rotting Oranges with multi-source BFS](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs).

## 7. Edge Cases

- **Empty tree** — return an empty list, not \`[[]]\`. Example 1 prints \`[]\`.
- **A single node** — \`[[1]]\`.
- **A chain** (\`[1, null, 2, null, 3]\`) — one value per level: \`[[1], [2], [3]]\`. BFS handles a chain of any length without stack trouble.
- **Missing children in the middle** (\`[1, 2, 3, 4, 5, null, 6]\`) — levels skip the holes: \`[[1], [2, 3], [4, 5, 6]]\`.
- **Duplicate values** — fine; the algorithm never looks at values, only at nodes.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| BFS with a real queue | O(n) | O(w) | every node is enqueued and dequeued once; the queue holds at most one level plus part of the next |
| DFS with a depth index | O(n) | O(h) | every node is visited once; the stack holds one path |
| BFS with an O(n) dequeue | O(n²) worst case | O(w) | each removal from the front moves the rest of the array |

n is the number of nodes, w the width (the largest level) and h the height. The output itself takes O(n) in every version. For a perfect tree, w is about n/2, so the queue really can hold half the tree; for a chain, w is 1 but h is n, which is when BFS is the safer choice because it does not recurse. In Python the third row is what you get with \`list.pop(0)\`; \`collections.deque\` gives the first row.

## Common Pitfalls

- **\`list.pop(0)\` as the queue.** O(n) per call; use \`collections.deque\` and \`popleft()\`.
- **Mutable default argument in the DFS version.** \`def dfs(node, depth=0, result=[])\` shares one list across calls; use \`None\` and create it inside.
- **Losing the level borders.** Without the size snapshot (or level lists) you get \`[3, 9, 20, 15, 7]\` instead of \`[[3], [9, 20], [15, 7]]\`.
- **Appending \`None\` children.** If you enqueue \`None\`, the next round crashes on \`None.val\`; check \`is not None\` before appending (or skip \`None\` when you pop it).
- **Returning \`[[]]\` for an empty tree.** Handle \`root is None\` before the loop.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">Level order is BFS on a tree: a FIFO queue makes nodes come out in the order they went in, which is level by level.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Grouping:</strong> <span style="color:#f0e2c8;">At the start of each round the queue holds exactly one level; read its size and remove exactly that many nodes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Order:</strong> <span style="color:#f0e2c8;">Enqueue the left child before the right child so every level reads left to right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(w) extra space for the queue, where w is the widest level (about n/2 for a perfect tree).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popleft</code>, both O(1); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.pop(0)</code> would be O(n).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you print the levels in zigzag order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run the same loop and reverse every odd level before appending it (or fill it from the back). The traversal itself does not change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do level order without a queue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with DFS: carry the depth and append each value to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result[depth]</code>, visiting left before right. Same O(n) time, O(h) stack instead of an O(w) queue.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know where one level ends?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for _ in range(len(queue))</code> evaluates the length once, so it is the snapshot for free.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is BFS better than DFS on a tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the answer is near the top — like the minimum depth, where you can stop at the first leaf — and for very deep trees, where recursion could overflow the stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the space on a perfect tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The last level holds about half of all nodes, and at the end of the second-to-last round they are all in the queue at once, so O(n) in the worst case.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Level (depth) of a node** | Edges between the node and the root; the root is level 0 |
| **Level-order traversal** | Visit nodes level by level, left to right within a level |
| **Queue (FIFO)** | First in, first out: add at the back, remove from the front |
| **Breadth-first search (BFS)** | Explore by distance from the start using a queue |
| **Level-size snapshot** | Read the queue length once per round to process exactly one level |
| **Width of a tree** | The largest number of nodes on one level; bounds the queue size |
| **\`collections.deque\`** | Python's double-ended queue with O(1) operations at both ends |

---
**Conclusion:** Level order is BFS on a tree: a \`collections.deque\` as the FIFO queue, \`popleft()\` to take the next node, children appended left then right, and \`for _ in range(len(queue))\` to process exactly one level per round. It is O(n) time and O(w) space, it handles chains of any length without recursion, and the variants interviewers ask next — zigzag, bottom-up, averages, right-side view, minimum depth — are one-line changes to the same loop. The one Python trap to avoid is \`list.pop(0)\`, which quietly makes it quadratic.`,
        examples: [
          {
            label: "Level order with a queue (5 trees)",
            code: `from collections import deque


class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def build(values):
    """Build a tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = Node(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = Node(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = Node(values[i])
            queue.append(node.right)
        i += 1
    return root




def level_order(root):
    """Values grouped by level, top to bottom, left to right."""
    if root is None:
        return []
    result = []
    queue = deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):        # size snapshot = nodes on this level
            node = queue.popleft()         # O(1); list.pop(0) would be O(n)
            level.append(node.val)
            if node.left is not None:
                queue.append(node.left)
            if node.right is not None:
                queue.append(node.right)
        result.append(level)
    return result


print(level_order(build([3, 9, 20, None, None, 15, 7])))  # [[3], [9, 20], [15, 7]]
print(level_order(build([1, 2, 3, 4, 5, None, 6])))  # [[1], [2, 3], [4, 5, 6]]
print(level_order(build([1, None, 2, None, 3])))  # [[1], [2], [3]]
print(level_order(build([1])))  # [[1]]
print(level_order(build([])))  # []`,
          },
          {
            label: "Zigzag, bottom-up, averages, and the DFS cross-check",
            code: `from collections import deque


class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def build(values):
    """Build a tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = Node(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = Node(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = Node(values[i])
            queue.append(node.right)
        i += 1
    return root




def level_order(root):
    if root is None:
        return []
    result, queue = [], deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left is not None:
                queue.append(node.left)
            if node.right is not None:
                queue.append(node.right)
        result.append(level)
    return result


def flat_bfs(root):
    """BFS without the size snapshot: right order, but level borders are lost."""
    out, queue = [], deque([root] if root else [])
    while queue:
        node = queue.popleft()
        out.append(node.val)
        for child in (node.left, node.right):
            if child is not None:
                queue.append(child)
    return out


def dfs_levels(node, depth=0, result=None):
    """Same grouping with DFS: pre-order, left before right, append to result[depth]."""
    if result is None:
        result = []
    if node is None:
        return result
    if depth == len(result):
        result.append([])
    result[depth].append(node.val)
    dfs_levels(node.left, depth + 1, result)
    dfs_levels(node.right, depth + 1, result)
    return result


def zigzag(root):
    levels = level_order(root)
    return [lv if i % 2 == 0 else lv[::-1] for i, lv in enumerate(levels)]


def averages(root):
    return "[" + ", ".join("%.2f" % (sum(lv) / len(lv)) for lv in level_order(root)) + "]"


for vals in ([3, 9, 20, None, None, 15, 7], [5, 1, 2, 3, 3, 1]):
    root = build(vals)
    print("levels:    " + str(level_order(root)))
    print("flat BFS:  " + str(flat_bfs(root)))
    print("zigzag:    " + str(zigzag(root)))
    print("bottom-up: " + str(level_order(root)[::-1]))
    print("averages:  " + averages(root))
    print("DFS gives the same levels: " + str(dfs_levels(root) == level_order(root)).lower())`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given the root of a binary tree, write a JavaScript function that returns its values level by level — the root's level first, and left to right inside each level — as an array of arrays. For example, the tree [3, 9, 20, null, null, 15, 7] should give [[3], [9, 20], [15, 7]]."

**What a strong answer should cover:**
- Level order is breadth-first search: a FIFO queue, children added left then right.
- How to group by level: snapshot the queue size at the start of each round (or keep each level in its own list).
- O(n) time and O(w) space, where w is the widest level — about n/2 for a perfect tree.
- JavaScript details: there is no built-in queue and \`shift()\` moves every element, so swap level arrays or use a head index.
- The DFS alternative (pre-order with a depth index) and when BFS is preferable (stop early, very deep trees).
- The usual variants: zigzag, bottom-up, level averages, right-side view.

**Code / implementation expected:** Yes — \`levelOrder(root)\` returning an array of arrays, without \`shift()\`, in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree is; queues and BFS are explained here.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think of a family photo for a big reunion. The photographer does not shuffle people randomly; she calls them row by row: "Grandparents in the front row! Now their children behind them! Now the grandchildren at the back!" And within each row, people stand from left to right.

That is a **level-order traversal**: visit the root, then everyone one step below it, then everyone two steps below, and so on, left to right inside each level. The other common traversals (pre-order, in-order, post-order — see the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods)) dive deep down one branch before coming back; level order instead spreads out evenly, like ripples from a stone dropped at the root.

Interviewers ask for it because it is the tree version of **breadth-first search (BFS)**, the most important graph algorithm for "fewest steps" questions, and because a surprising number of tree problems are just level order with a small twist: the [right-side view of a binary tree](/interview-question/how-do-you-get-the-right-side-view-of-a-binary-tree), zigzag order, level averages, the minimum depth, connecting next pointers, or turning a tree into a string level by level ([serialize and deserialize a binary tree](/interview-question/how-do-you-serialize-and-deserialize-a-binary-tree)). Get the basic loop exactly right once, and all of those become five-minute problems.

## 2. The Core Idea

📌 **Interview term: Level (depth) of a node** — how many edges separate it from the root. The root is on level 0, its children on level 1, and so on.

📌 **Interview term: Level-order traversal** — visiting nodes level by level from the top, left to right within a level. The usual output groups them: \`[[3], [9, 20], [15, 7]]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 250" role="img" aria-label="Tree with root 3 on level 0, nodes 9 and 20 on level 1, and nodes 15 and 7 on level 2">
  <rect class="d-box-muted" x="8" y="10" width="664" height="60" rx="10"/>
  <text class="d-sub" x="22" y="44">level 0</text>
  <rect class="d-box-muted" x="8" y="90" width="664" height="60" rx="10"/>
  <text class="d-sub" x="22" y="124">level 1</text>
  <rect class="d-box-muted" x="8" y="170" width="664" height="60" rx="10"/>
  <text class="d-sub" x="22" y="204">level 2</text>
  <path class="d-edge" d="M 220 40 L 130 120"/>
  <path class="d-edge" d="M 220 40 L 400 120"/>
  <path class="d-edge" d="M 400 120 L 310 200"/>
  <path class="d-edge" d="M 400 120 L 490 200"/>
  <circle class="d-box" cx="220" cy="40" r="20"/>
  <text class="d-text" x="220" y="45" text-anchor="middle">3</text>
  <circle class="d-box" cx="130" cy="120" r="20"/>
  <text class="d-text" x="130" y="125" text-anchor="middle">9</text>
  <circle class="d-box" cx="400" cy="120" r="20"/>
  <text class="d-text" x="400" y="125" text-anchor="middle">20</text>
  <circle class="d-box" cx="310" cy="200" r="20"/>
  <text class="d-text" x="310" y="205" text-anchor="middle">15</text>
  <circle class="d-box" cx="490" cy="200" r="20"/>
  <text class="d-text" x="490" y="205" text-anchor="middle">7</text>
</svg>

How do you visit nodes in that order? You cannot just recurse into the left child, because then you would reach 9's grandchildren before 20. You need a waiting line: when you visit a node, its children join the **back** of the line, and the next node to visit always comes from the **front**. Nodes therefore come out in exactly the order they went in, which is level by level.

📌 **Interview term: Queue (FIFO)** — a first-in, first-out container: add at the back (enqueue), remove from the front (dequeue). Both must be O(1) for BFS to be O(n). See the [difference between a stack and a queue](/interview-question/what-is-the-difference-between-a-stack-and-a-queue).

📌 **Interview term: Breadth-first search (BFS)** — explore everything at distance 1, then distance 2, and so on, using a queue. Level order is BFS on a tree. The general comparison with depth-first search is in the [difference between BFS and DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs).

### Knowing where one level ends

A plain BFS loop gives the right *order* — \`[3, 9, 20, 15, 7]\` — but loses the borders between levels. The standard fix is a **size snapshot**: at the start of each round, the queue holds exactly the nodes of one level (all of them, and nothing else). Read its size, remove exactly that many nodes, and every child you add during the round belongs to the next level.

📌 **Interview term: Level-size snapshot** — reading the queue's length once at the start of a round, so the loop processes exactly one level even though children are being added to the same queue.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="Three rounds of the queue: first it holds 3, then 9 and 20, then 15 and 7. Each round removes exactly the nodes that were in the queue when the round started">
  <defs>
    <marker id="b16q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="60">round 1</text>
  <rect class="d-box" x="120" y="34" width="70" height="44" rx="6"/>
  <text class="d-text" x="155" y="61" text-anchor="middle">3</text>
  <text class="d-sub" x="300" y="48" text-anchor="middle">size = 1</text>
  <path class="d-edge" d="M 250 60 L 446 60" marker-end="url(#b16q3-arrow)"/>
  <rect class="d-box-accent" x="450" y="34" width="290" height="44" rx="10"/>
  <text class="d-text" x="595" y="61" text-anchor="middle">level [3], enqueue 9 and 20</text>
  <text class="d-text" x="20" y="145">round 2</text>
  <rect class="d-box" x="120" y="119" width="70" height="44" rx="6"/>
  <text class="d-text" x="155" y="146" text-anchor="middle">9</text>
  <rect class="d-box" x="190" y="119" width="70" height="44" rx="6"/>
  <text class="d-text" x="225" y="146" text-anchor="middle">20</text>
  <text class="d-sub" x="340" y="133" text-anchor="middle">size = 2</text>
  <path class="d-edge" d="M 290 145 L 446 145" marker-end="url(#b16q3-arrow)"/>
  <rect class="d-box-accent" x="450" y="119" width="290" height="44" rx="10"/>
  <text class="d-text" x="595" y="146" text-anchor="middle">level [9, 20], enqueue 15 and 7</text>
  <text class="d-text" x="20" y="230">round 3</text>
  <rect class="d-box" x="120" y="204" width="70" height="44" rx="6"/>
  <text class="d-text" x="155" y="231" text-anchor="middle">15</text>
  <rect class="d-box" x="190" y="204" width="70" height="44" rx="6"/>
  <text class="d-text" x="225" y="231" text-anchor="middle">7</text>
  <text class="d-sub" x="340" y="218" text-anchor="middle">size = 2</text>
  <path class="d-edge" d="M 290 230 L 446 230" marker-end="url(#b16q3-arrow)"/>
  <rect class="d-box-accent" x="450" y="204" width="290" height="44" rx="10"/>
  <text class="d-text" x="595" y="231" text-anchor="middle">level [15, 7], queue now empty</text>
</svg>

Each round starts with one full level in the queue and ends with the next full level in it. The loop stops when a round adds no children, which leaves the queue empty.

## 3. Step by Step

1. If the root is empty, return an empty list.
2. Put the root in the queue.
3. While the queue is not empty:
   - read \`size\` = the number of nodes in the queue right now;
   - repeat \`size\` times: remove the front node, record its value in this level's list, add its left child and then its right child (if they exist) to the back;
   - append this level's list to the result.
4. Return the result.

Adding the **left child before the right child** is what makes each level come out left to right. Swapping the two lines gives each level right to left.

**Could you do it with DFS instead?** Yes: walk the tree in pre-order (node, left, right) carrying the depth, and append each value to \`result[depth]\`, creating that list the first time a depth is reached. Because the left subtree is always visited before the right one, each inner list is still left to right. Example 2 checks that this gives identical output. It uses O(h) stack instead of an O(w) queue, but the name of the question says BFS — lead with the queue and mention DFS as an alternative.

📌 **Interview term: Width of a tree** — the largest number of nodes on any one level. It bounds the queue size; a perfect tree's last level holds about half of all nodes.

## 4. The Code in JavaScript

~~~javascript
// Values grouped by level, top to bottom, left to right.
function levelOrder(root) {
  if (root === null) return [];
  const result = [];
  let queue = [root];
  while (queue.length > 0) {
    const level = [];
    const next = [];                 // children, i.e. the next level
    for (const node of queue) {
      level.push(node.val);
      if (node.left !== null) next.push(node.left);
      if (node.right !== null) next.push(node.right);
    }
    result.push(level);
    queue = next;                    // swap levels instead of calling shift()
  }
  return result;
}
~~~

**What to point out in this code:**

- **JavaScript has no built-in queue.** The tempting \`queue.shift()\` removes the first element of an array by moving every remaining element down one index, so a BFS built on it can turn quadratic on wide trees. In our Node 22 sandbox, draining a 100,000-element array with \`shift()\` took about 0.8 seconds and a 200,000-element one about 3.3 seconds (twice the size, four times the time), while walking a head index over the same array took about 1 ms.
- This version avoids the problem by **swapping levels**: it walks the current level with \`for...of\`, collects the children in a new array \`next\`, then replaces \`queue\` with \`next\`. Each level is its own array, so the snapshot is automatic — no size variable needed.
- The other standard trick (used by the examples' \`build\` helper) is a single array plus a \`head\` index: read \`queue[head++]\` instead of shifting.
- A classic snapshot bug in JavaScript is \`for (let i = 0; i < queue.length; i++)\` on a queue that grows inside the loop: \`queue.length\` is re-read every iteration, so the loop never stops at the level border. Either take \`const size = queue.length\` first or use the level-swap form.
- \`console.log\` prints nested arrays as \`[ [ 3 ], [ 9, 20 ] ]\` in Node, so the examples use a tiny \`fmt\` helper to print \`[[3], [9, 20]]\` exactly like the other three languages.

📌 **Interview term: Level swap (two-array BFS)** — keeping the current level and the next level in separate arrays and swapping them each round. It replaces both the queue and the size snapshot.

The DFS alternative from example 2, which builds the same lists using recursion and a depth counter:

~~~javascript
// Same grouping with DFS: pre-order, left before right, push to result[depth].
function dfsLevels(node, depth = 0, result = []) {
  if (node === null) return result;
  if (depth === result.length) result.push([]);
  result[depth].push(node.val);
  dfsLevels(node.left, depth + 1, result);
  dfsLevels(node.right, depth + 1, result);
  return result;
}
~~~

Default parameters such as \`result = []\` are evaluated **on every call** in JavaScript, so unlike Python's mutable-default trap, each top-level call gets a fresh array.

## 5. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 1 runs level order on five trees, including a chain and the empty tree. Example 2 runs the common variants on two trees — the plain BFS order, zigzag, bottom-up and per-level averages — and checks that the DFS version gives the same levels.

**Example 1 — level order on five trees** prints:

~~~text
[[3], [9, 20], [15, 7]]
[[1], [2, 3], [4, 5, 6]]
[[1], [2], [3]]
[[1]]
[]
~~~

**Example 2 — variants and the DFS cross-check** prints:

~~~text
levels:    [[3], [9, 20], [15, 7]]
flat BFS:  [3, 9, 20, 15, 7]
zigzag:    [[3], [20, 9], [15, 7]]
bottom-up: [[15, 7], [9, 20], [3]]
averages:  [3.00, 14.50, 11.00]
DFS gives the same levels: true
levels:    [[5], [1, 2], [3, 3, 1]]
flat BFS:  [5, 1, 2, 3, 3, 1]
zigzag:    [[5], [2, 1], [3, 3, 1]]
bottom-up: [[3, 3, 1], [1, 2], [5]]
averages:  [5.00, 1.50, 2.33]
DFS gives the same levels: true
~~~

## 6. Variants You Get for Free

Once the level loop is right, each of these is a one-line change, and example 2 prints all of them:

| Variant | Change | Output for \`[3, 9, 20, null, null, 15, 7]\` |
| :--- | :--- | :--- |
| Plain BFS order | drop the snapshot, append every value to one list | \`[3, 9, 20, 15, 7]\` |
| Zigzag | reverse every odd level | \`[[3], [20, 9], [15, 7]]\` |
| Bottom-up | reverse the list of levels | \`[[15, 7], [9, 20], [3]]\` |
| Level averages | sum each level and divide by its size | \`[3.00, 14.50, 11.00]\` |
| Right-side view | keep only the last value of each level | \`[3, 20, 7]\` — see the [right-side view of a binary tree](/interview-question/how-do-you-get-the-right-side-view-of-a-binary-tree) |
| Minimum depth | stop at the first leaf you meet and return its level + 1 (depth counted in nodes) | 2 (leaf 9 is on level 1) |

The minimum depth is a good example of why BFS matters: the first leaf found level by level is the shallowest one, so you can stop early instead of exploring the whole tree. (Its counterpart, the [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree), needs every level anyway.) The same "first time you reach it is the shortest" property is what makes BFS find shortest paths in unweighted graphs, as in [Rotting Oranges with multi-source BFS](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs).

## 7. Edge Cases

- **Empty tree** — return an empty list, not \`[[]]\`. Example 1 prints \`[]\`.
- **A single node** — \`[[1]]\`.
- **A chain** (\`[1, null, 2, null, 3]\`) — one value per level: \`[[1], [2], [3]]\`. BFS handles a chain of any length without stack trouble.
- **Missing children in the middle** (\`[1, 2, 3, 4, 5, null, 6]\`) — levels skip the holes: \`[[1], [2, 3], [4, 5, 6]]\`.
- **Duplicate values** — fine; the algorithm never looks at values, only at nodes.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| BFS with a real queue | O(n) | O(w) | every node is enqueued and dequeued once; the queue holds at most one level plus part of the next |
| DFS with a depth index | O(n) | O(h) | every node is visited once; the stack holds one path |
| BFS with an O(n) dequeue | O(n²) worst case | O(w) | each removal from the front moves the rest of the array |

n is the number of nodes, w the width (the largest level) and h the height. The output itself takes O(n) in every version. For a perfect tree, w is about n/2, so the queue really can hold half the tree; for a chain, w is 1 but h is n, which is when BFS is the safer choice because it does not recurse. In JavaScript the third row is what you risk with \`Array.prototype.shift()\` on large arrays; the level-swap and head-index forms give the first row.

## Common Pitfalls

- **\`queue.shift()\` on big inputs.** It can make BFS quadratic; use a head index or swap level arrays.
- **Re-reading \`queue.length\` in the loop condition.** The queue grows inside the loop, so the level border is lost; snapshot the length first.
- **Printing with \`console.log(result)\`.** Node prints \`[ [ 3 ], [ 9, 20 ] ]\` with extra spaces; tests that compare strings need a formatter.
- **\`reverse()\` mutates.** For zigzag, \`level.reverse()\` reverses the stored level in place; use \`level.slice().reverse()\` (example 2) if you still need the original.
- **Pushing \`null\` children.** The next round crashes on \`null.val\`; check before pushing.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">Level order is BFS on a tree: a FIFO queue makes nodes come out in the order they went in, which is level by level.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Grouping:</strong> <span style="color:#f0e2c8;">At the start of each round the queue holds exactly one level; read its size and remove exactly that many nodes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Order:</strong> <span style="color:#f0e2c8;">Enqueue the left child before the right child so every level reads left to right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(w) extra space for the queue, where w is the widest level (about n/2 for a perfect tree).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">No built-in queue: swap level arrays or use a head index instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code>, which moves every element.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you print the levels in zigzag order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run the same loop and reverse every odd level before appending it (or fill it from the back). The traversal itself does not change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do level order without a queue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with DFS: carry the depth and append each value to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result[depth]</code>, visiting left before right. Same O(n) time, O(h) stack instead of an O(w) queue.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know where one level ends?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Snapshot <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queue.length</code> before the inner loop, or keep each level in its own array.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is BFS better than DFS on a tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the answer is near the top — like the minimum depth, where you can stop at the first leaf — and for very deep trees, where recursion could overflow the stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the space on a perfect tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The last level holds about half of all nodes, and at the end of the second-to-last round they are all in the queue at once, so O(n) in the worst case.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Level (depth) of a node** | Edges between the node and the root; the root is level 0 |
| **Level-order traversal** | Visit nodes level by level, left to right within a level |
| **Queue (FIFO)** | First in, first out: add at the back, remove from the front |
| **Breadth-first search (BFS)** | Explore by distance from the start using a queue |
| **Level-size snapshot** | Read the queue length once per round to process exactly one level |
| **Width of a tree** | The largest number of nodes on one level; bounds the queue size |
| **Level swap (two-array BFS)** | Keep the current and next level in separate arrays and swap them |

---
**Conclusion:** Level order is BFS on a tree. JavaScript has no queue class, so either keep each level in its own array and swap (as here) or walk a head index; avoid \`shift()\`, which moved every element and took seconds on a few hundred thousand items in our run. With left-before-right children and one array per level, the result groups itself, runs in O(n) time and O(w) space, and the follow-up variants — zigzag, bottom-up, averages, right-side view — are one-line changes.`,
        examples: [
          {
            label: "Level order with a queue (5 trees)",
            code: `class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// Build a tree from a level-order array; null marks a missing child.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new Node(values[0]);
  const queue = [root];
  let head = 0; // index of the next node to fill (cheaper than queue.shift())
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) {
      node.left = new Node(values[i]);
      queue.push(node.left);
    }
    i++;
    if (i < values.length && values[i] !== null) {
      node.right = new Node(values[i]);
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

// Values grouped by level, top to bottom, left to right.
function levelOrder(root) {
  if (root === null) return [];
  const result = [];
  let queue = [root];
  while (queue.length > 0) {
    const level = [];
    const next = [];                 // children, i.e. the next level
    for (const node of queue) {
      level.push(node.val);
      if (node.left !== null) next.push(node.left);
      if (node.right !== null) next.push(node.right);
    }
    result.push(level);
    queue = next;                    // swap levels instead of calling shift()
  }
  return result;
}

// Print nested arrays the same way Python and Java do: [[3], [9, 20]]
function fmt(x) {
  return Array.isArray(x) ? '[' + x.map(fmt).join(', ') + ']' : String(x);
}

console.log(fmt(levelOrder(build([3, 9, 20, null, null, 15, 7])))); // [[3], [9, 20], [15, 7]]
console.log(fmt(levelOrder(build([1, 2, 3, 4, 5, null, 6])))); // [[1], [2, 3], [4, 5, 6]]
console.log(fmt(levelOrder(build([1, null, 2, null, 3])))); // [[1], [2], [3]]
console.log(fmt(levelOrder(build([1])))); // [[1]]
console.log(fmt(levelOrder(build([])))); // []`,
          },
          {
            label: "Zigzag, bottom-up, averages, and the DFS cross-check",
            code: `class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// Build a tree from a level-order array; null marks a missing child.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new Node(values[0]);
  const queue = [root];
  let head = 0; // index of the next node to fill (cheaper than queue.shift())
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) {
      node.left = new Node(values[i]);
      queue.push(node.left);
    }
    i++;
    if (i < values.length && values[i] !== null) {
      node.right = new Node(values[i]);
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

function levelOrder(root) {
  if (root === null) return [];
  const result = [];
  let queue = [root];
  while (queue.length > 0) {
    const level = [];
    const next = [];
    for (const node of queue) {
      level.push(node.val);
      if (node.left !== null) next.push(node.left);
      if (node.right !== null) next.push(node.right);
    }
    result.push(level);
    queue = next;
  }
  return result;
}

// BFS without the level split: right order, but level borders are lost.
function flatBfs(root) {
  const out = [];
  const queue = root ? [root] : [];
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    out.push(node.val);
    if (node.left !== null) queue.push(node.left);
    if (node.right !== null) queue.push(node.right);
  }
  return out;
}

// Same grouping with DFS: pre-order, left before right, push to result[depth].
function dfsLevels(node, depth = 0, result = []) {
  if (node === null) return result;
  if (depth === result.length) result.push([]);
  result[depth].push(node.val);
  dfsLevels(node.left, depth + 1, result);
  dfsLevels(node.right, depth + 1, result);
  return result;
}

function zigzag(root) {
  // slice() first: reverse() would change the level array in place
  return levelOrder(root).map((lv, i) => (i % 2 === 0 ? lv : lv.slice().reverse()));
}

function averages(root) {
  return '[' + levelOrder(root).map((lv) => (lv.reduce((a, b) => a + b, 0) / lv.length).toFixed(2)).join(', ') + ']';
}

function fmt(x) {
  return Array.isArray(x) ? '[' + x.map(fmt).join(', ') + ']' : String(x);
}

for (const vals of [[3, 9, 20, null, null, 15, 7], [5, 1, 2, 3, 3, 1]]) {
  const root = build(vals);
  console.log('levels:    ' + fmt(levelOrder(root)));
  console.log('flat BFS:  ' + fmt(flatBfs(root)));
  console.log('zigzag:    ' + fmt(zigzag(root)));
  console.log('bottom-up: ' + fmt(levelOrder(root).reverse()));
  console.log('averages:  ' + averages(root));
  // arrays are compared by reference with ===, so compare their printed form
  console.log('DFS gives the same levels: ' + (fmt(dfsLevels(root)) === fmt(levelOrder(root))));
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given the root of a binary tree, write a Java function that returns its values level by level — the root's level first, and left to right inside each level — as a \`List<List<Integer>>\`. For example, the tree [3, 9, 20, null, null, 15, 7] should give [[3], [9, 20], [15, 7]]."

**What a strong answer should cover:**
- Level order is breadth-first search: a FIFO queue, children added left then right.
- How to group by level: snapshot the queue size at the start of each round (or keep each level in its own list).
- O(n) time and O(w) space, where w is the widest level — about n/2 for a perfect tree.
- Java details: \`ArrayDeque\` with \`offer\`/\`poll\`, it rejects \`null\`, and the \`int size = queue.size()\` snapshot must be taken before the inner loop.
- The DFS alternative (pre-order with a depth index) and when BFS is preferable (stop early, very deep trees).
- The usual variants: zigzag, bottom-up, level averages, right-side view.

**Code / implementation expected:** Yes — \`static List<List<Integer>> levelOrder(Node root)\` using \`ArrayDeque\`, in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree is; queues and BFS are explained here.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think of a family photo for a big reunion. The photographer does not shuffle people randomly; she calls them row by row: "Grandparents in the front row! Now their children behind them! Now the grandchildren at the back!" And within each row, people stand from left to right.

That is a **level-order traversal**: visit the root, then everyone one step below it, then everyone two steps below, and so on, left to right inside each level. The other common traversals (pre-order, in-order, post-order — see the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods)) dive deep down one branch before coming back; level order instead spreads out evenly, like ripples from a stone dropped at the root.

Interviewers ask for it because it is the tree version of **breadth-first search (BFS)**, the most important graph algorithm for "fewest steps" questions, and because a surprising number of tree problems are just level order with a small twist: the [right-side view of a binary tree](/interview-question/how-do-you-get-the-right-side-view-of-a-binary-tree), zigzag order, level averages, the minimum depth, connecting next pointers, or turning a tree into a string level by level ([serialize and deserialize a binary tree](/interview-question/how-do-you-serialize-and-deserialize-a-binary-tree)). Get the basic loop exactly right once, and all of those become five-minute problems.

## 2. The Core Idea

📌 **Interview term: Level (depth) of a node** — how many edges separate it from the root. The root is on level 0, its children on level 1, and so on.

📌 **Interview term: Level-order traversal** — visiting nodes level by level from the top, left to right within a level. The usual output groups them: \`[[3], [9, 20], [15, 7]]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 250" role="img" aria-label="Tree with root 3 on level 0, nodes 9 and 20 on level 1, and nodes 15 and 7 on level 2">
  <rect class="d-box-muted" x="8" y="10" width="664" height="60" rx="10"/>
  <text class="d-sub" x="22" y="44">level 0</text>
  <rect class="d-box-muted" x="8" y="90" width="664" height="60" rx="10"/>
  <text class="d-sub" x="22" y="124">level 1</text>
  <rect class="d-box-muted" x="8" y="170" width="664" height="60" rx="10"/>
  <text class="d-sub" x="22" y="204">level 2</text>
  <path class="d-edge" d="M 220 40 L 130 120"/>
  <path class="d-edge" d="M 220 40 L 400 120"/>
  <path class="d-edge" d="M 400 120 L 310 200"/>
  <path class="d-edge" d="M 400 120 L 490 200"/>
  <circle class="d-box" cx="220" cy="40" r="20"/>
  <text class="d-text" x="220" y="45" text-anchor="middle">3</text>
  <circle class="d-box" cx="130" cy="120" r="20"/>
  <text class="d-text" x="130" y="125" text-anchor="middle">9</text>
  <circle class="d-box" cx="400" cy="120" r="20"/>
  <text class="d-text" x="400" y="125" text-anchor="middle">20</text>
  <circle class="d-box" cx="310" cy="200" r="20"/>
  <text class="d-text" x="310" y="205" text-anchor="middle">15</text>
  <circle class="d-box" cx="490" cy="200" r="20"/>
  <text class="d-text" x="490" y="205" text-anchor="middle">7</text>
</svg>

How do you visit nodes in that order? You cannot just recurse into the left child, because then you would reach 9's grandchildren before 20. You need a waiting line: when you visit a node, its children join the **back** of the line, and the next node to visit always comes from the **front**. Nodes therefore come out in exactly the order they went in, which is level by level.

📌 **Interview term: Queue (FIFO)** — a first-in, first-out container: add at the back (enqueue), remove from the front (dequeue). Both must be O(1) for BFS to be O(n). See the [difference between a stack and a queue](/interview-question/what-is-the-difference-between-a-stack-and-a-queue).

📌 **Interview term: Breadth-first search (BFS)** — explore everything at distance 1, then distance 2, and so on, using a queue. Level order is BFS on a tree. The general comparison with depth-first search is in the [difference between BFS and DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs).

### Knowing where one level ends

A plain BFS loop gives the right *order* — \`[3, 9, 20, 15, 7]\` — but loses the borders between levels. The standard fix is a **size snapshot**: at the start of each round, the queue holds exactly the nodes of one level (all of them, and nothing else). Read its size, remove exactly that many nodes, and every child you add during the round belongs to the next level.

📌 **Interview term: Level-size snapshot** — reading the queue's length once at the start of a round, so the loop processes exactly one level even though children are being added to the same queue.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="Three rounds of the queue: first it holds 3, then 9 and 20, then 15 and 7. Each round removes exactly the nodes that were in the queue when the round started">
  <defs>
    <marker id="b16q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="60">round 1</text>
  <rect class="d-box" x="120" y="34" width="70" height="44" rx="6"/>
  <text class="d-text" x="155" y="61" text-anchor="middle">3</text>
  <text class="d-sub" x="300" y="48" text-anchor="middle">size = 1</text>
  <path class="d-edge" d="M 250 60 L 446 60" marker-end="url(#b16q3-arrow)"/>
  <rect class="d-box-accent" x="450" y="34" width="290" height="44" rx="10"/>
  <text class="d-text" x="595" y="61" text-anchor="middle">level [3], enqueue 9 and 20</text>
  <text class="d-text" x="20" y="145">round 2</text>
  <rect class="d-box" x="120" y="119" width="70" height="44" rx="6"/>
  <text class="d-text" x="155" y="146" text-anchor="middle">9</text>
  <rect class="d-box" x="190" y="119" width="70" height="44" rx="6"/>
  <text class="d-text" x="225" y="146" text-anchor="middle">20</text>
  <text class="d-sub" x="340" y="133" text-anchor="middle">size = 2</text>
  <path class="d-edge" d="M 290 145 L 446 145" marker-end="url(#b16q3-arrow)"/>
  <rect class="d-box-accent" x="450" y="119" width="290" height="44" rx="10"/>
  <text class="d-text" x="595" y="146" text-anchor="middle">level [9, 20], enqueue 15 and 7</text>
  <text class="d-text" x="20" y="230">round 3</text>
  <rect class="d-box" x="120" y="204" width="70" height="44" rx="6"/>
  <text class="d-text" x="155" y="231" text-anchor="middle">15</text>
  <rect class="d-box" x="190" y="204" width="70" height="44" rx="6"/>
  <text class="d-text" x="225" y="231" text-anchor="middle">7</text>
  <text class="d-sub" x="340" y="218" text-anchor="middle">size = 2</text>
  <path class="d-edge" d="M 290 230 L 446 230" marker-end="url(#b16q3-arrow)"/>
  <rect class="d-box-accent" x="450" y="204" width="290" height="44" rx="10"/>
  <text class="d-text" x="595" y="231" text-anchor="middle">level [15, 7], queue now empty</text>
</svg>

Each round starts with one full level in the queue and ends with the next full level in it. The loop stops when a round adds no children, which leaves the queue empty.

## 3. Step by Step

1. If the root is empty, return an empty list.
2. Put the root in the queue.
3. While the queue is not empty:
   - read \`size\` = the number of nodes in the queue right now;
   - repeat \`size\` times: remove the front node, record its value in this level's list, add its left child and then its right child (if they exist) to the back;
   - append this level's list to the result.
4. Return the result.

Adding the **left child before the right child** is what makes each level come out left to right. Swapping the two lines gives each level right to left.

**Could you do it with DFS instead?** Yes: walk the tree in pre-order (node, left, right) carrying the depth, and append each value to \`result[depth]\`, creating that list the first time a depth is reached. Because the left subtree is always visited before the right one, each inner list is still left to right. Example 2 checks that this gives identical output. It uses O(h) stack instead of an O(w) queue, but the name of the question says BFS — lead with the queue and mention DFS as an alternative.

📌 **Interview term: Width of a tree** — the largest number of nodes on any one level. It bounds the queue size; a perfect tree's last level holds about half of all nodes.

## 4. The Code in Java

~~~java
// Values grouped by level, top to bottom, left to right.
static List<List<Integer>> levelOrder(Node root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;
    Deque<Node> queue = new ArrayDeque<>();
    queue.offer(root);
    while (!queue.isEmpty()) {
        int size = queue.size();           // snapshot: nodes on this level
        List<Integer> level = new ArrayList<>(size);
        for (int k = 0; k < size; k++) {
            Node node = queue.poll();
            level.add(node.val);
            if (node.left != null) queue.offer(node.left);   // ArrayDeque rejects null
            if (node.right != null) queue.offer(node.right);
        }
        result.add(level);
    }
    return result;
}
~~~

**What to point out in this code:**

- **\`ArrayDeque\` is the queue to use.** \`offer\` adds at the back and \`poll\` removes from the front, both in amortised O(1). It is backed by a circular array, so it is usually faster than \`LinkedList\`.
- **\`ArrayDeque\` rejects \`null\`.** The [ArrayDeque Javadoc](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayDeque.html) says "Null elements are prohibited", and in our run \`new ArrayDeque<>().offer(null)\` threw \`NullPointerException\`. That is why the code checks \`node.left != null\` before offering. (\`LinkedList\` accepts \`null\` — our run printed size 1 after \`offer(null)\` — which silently hides the same mistake until you dereference it.)
- **Take the snapshot before the loop:** \`int size = queue.size();\`. Writing \`for (int k = 0; k < queue.size(); k++)\` re-reads the size every iteration while children are being added, so the loop runs past the level border.
- \`List.toString()\` prints nested lists as \`[[3], [9, 20], [15, 7]]\`, which is why \`System.out.println(levelOrder(...))\` matches the other languages exactly.
- Declare the variable as the interface (\`Deque<Node>\` or \`Queue<Node>\`) and choose the class on the right; it keeps the code flexible.

📌 **Interview term: \`ArrayDeque\`** — Java's resizable circular-array double-ended queue: amortised O(1) at both ends, no capacity limit, and no \`null\` elements.

The DFS alternative from example 2, which builds the same lists using recursion and a depth counter:

~~~java
// Same grouping with DFS: pre-order, left before right, add to result.get(depth).
static void dfsLevels(Node node, int depth, List<List<Integer>> result) {
    if (node == null) return;
    if (depth == result.size()) result.add(new ArrayList<>());
    result.get(depth).add(node.val);
    dfsLevels(node.left, depth + 1, result);
    dfsLevels(node.right, depth + 1, result);
}
~~~

Example 2 compares the two results with \`viaDfs.equals(levelOrder(root))\`: \`List.equals\` compares element by element, whereas \`==\` would only compare the two references.

## 5. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21 (the code only uses Java 17 features)). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 1 runs level order on five trees, including a chain and the empty tree. Example 2 runs the common variants on two trees — the plain BFS order, zigzag, bottom-up and per-level averages — and checks that the DFS version gives the same levels.

**Example 1 — level order on five trees** prints:

~~~text
[[3], [9, 20], [15, 7]]
[[1], [2, 3], [4, 5, 6]]
[[1], [2], [3]]
[[1]]
[]
~~~

**Example 2 — variants and the DFS cross-check** prints:

~~~text
levels:    [[3], [9, 20], [15, 7]]
flat BFS:  [3, 9, 20, 15, 7]
zigzag:    [[3], [20, 9], [15, 7]]
bottom-up: [[15, 7], [9, 20], [3]]
averages:  [3.00, 14.50, 11.00]
DFS gives the same levels: true
levels:    [[5], [1, 2], [3, 3, 1]]
flat BFS:  [5, 1, 2, 3, 3, 1]
zigzag:    [[5], [2, 1], [3, 3, 1]]
bottom-up: [[3, 3, 1], [1, 2], [5]]
averages:  [5.00, 1.50, 2.33]
DFS gives the same levels: true
~~~

## 6. Variants You Get for Free

Once the level loop is right, each of these is a one-line change, and example 2 prints all of them:

| Variant | Change | Output for \`[3, 9, 20, null, null, 15, 7]\` |
| :--- | :--- | :--- |
| Plain BFS order | drop the snapshot, append every value to one list | \`[3, 9, 20, 15, 7]\` |
| Zigzag | reverse every odd level | \`[[3], [20, 9], [15, 7]]\` |
| Bottom-up | reverse the list of levels | \`[[15, 7], [9, 20], [3]]\` |
| Level averages | sum each level and divide by its size | \`[3.00, 14.50, 11.00]\` |
| Right-side view | keep only the last value of each level | \`[3, 20, 7]\` — see the [right-side view of a binary tree](/interview-question/how-do-you-get-the-right-side-view-of-a-binary-tree) |
| Minimum depth | stop at the first leaf you meet and return its level + 1 (depth counted in nodes) | 2 (leaf 9 is on level 1) |

The minimum depth is a good example of why BFS matters: the first leaf found level by level is the shallowest one, so you can stop early instead of exploring the whole tree. (Its counterpart, the [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree), needs every level anyway.) The same "first time you reach it is the shortest" property is what makes BFS find shortest paths in unweighted graphs, as in [Rotting Oranges with multi-source BFS](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs).

## 7. Edge Cases

- **Empty tree** — return an empty list, not \`[[]]\`. Example 1 prints \`[]\`.
- **A single node** — \`[[1]]\`.
- **A chain** (\`[1, null, 2, null, 3]\`) — one value per level: \`[[1], [2], [3]]\`. BFS handles a chain of any length without stack trouble.
- **Missing children in the middle** (\`[1, 2, 3, 4, 5, null, 6]\`) — levels skip the holes: \`[[1], [2, 3], [4, 5, 6]]\`.
- **Duplicate values** — fine; the algorithm never looks at values, only at nodes.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| BFS with a real queue | O(n) | O(w) | every node is enqueued and dequeued once; the queue holds at most one level plus part of the next |
| DFS with a depth index | O(n) | O(h) | every node is visited once; the stack holds one path |
| BFS with an O(n) dequeue | O(n²) worst case | O(w) | each removal from the front moves the rest of the array |

n is the number of nodes, w the width (the largest level) and h the height. The output itself takes O(n) in every version. For a perfect tree, w is about n/2, so the queue really can hold half the tree; for a chain, w is 1 but h is n, which is when BFS is the safer choice because it does not recurse. In Java both \`ArrayDeque\` and \`LinkedList\` give the first row; \`ArrayList.remove(0)\` would give the third.

## Common Pitfalls

- **\`for (int k = 0; k < queue.size(); k++)\`.** The size changes during the loop; read it once into \`int size\` first.
- **Offering \`null\` to an \`ArrayDeque\`.** It throws \`NullPointerException\`; check children first.
- **Using \`ArrayList.remove(0)\` as a queue.** It shifts every element, so it is O(n) per call.
- **\`String.format("%.2f", x)\` for averages.** It uses the default locale; with \`Locale.GERMANY\` our run printed \`2,50\`. Pass \`Locale.ROOT\` when the output must be stable.
- **Summing a wide level of large values in an \`int\`.** It can overflow silently; sum into a \`long\` (example 2 does).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">Level order is BFS on a tree: a FIFO queue makes nodes come out in the order they went in, which is level by level.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Grouping:</strong> <span style="color:#f0e2c8;">At the start of each round the queue holds exactly one level; read its size and remove exactly that many nodes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Order:</strong> <span style="color:#f0e2c8;">Enqueue the left child before the right child so every level reads left to right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(w) extra space for the queue, where w is the widest level (about n/2 for a perfect tree).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">offer</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">poll</code>; it rejects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>, so check children first.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you print the levels in zigzag order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run the same loop and reverse every odd level before appending it (or fill it from the back). The traversal itself does not change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do level order without a queue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with DFS: carry the depth and append each value to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result[depth]</code>, visiting left before right. Same O(n) time, O(h) stack instead of an O(w) queue.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know where one level ends?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int size = queue.size();</code> before the inner loop — never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k &lt; queue.size()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is BFS better than DFS on a tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the answer is near the top — like the minimum depth, where you can stop at the first leaf — and for very deep trees, where recursion could overflow the stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the space on a perfect tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The last level holds about half of all nodes, and at the end of the second-to-last round they are all in the queue at once, so O(n) in the worst case.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Level (depth) of a node** | Edges between the node and the root; the root is level 0 |
| **Level-order traversal** | Visit nodes level by level, left to right within a level |
| **Queue (FIFO)** | First in, first out: add at the back, remove from the front |
| **Breadth-first search (BFS)** | Explore by distance from the start using a queue |
| **Level-size snapshot** | Read the queue length once per round to process exactly one level |
| **Width of a tree** | The largest number of nodes on one level; bounds the queue size |
| **\`ArrayDeque\`** | Circular-array deque: amortised O(1) at both ends, no \`null\` elements |

---
**Conclusion:** Level order is BFS on a tree: an \`ArrayDeque\` as the queue, \`offer\` children left then right (never \`null\`), \`poll\` the next node, and an \`int size = queue.size()\` snapshot so each round processes exactly one level. It is O(n) time and O(w) space, \`List.toString()\` prints the result in the familiar \`[[3], [9, 20], [15, 7]]\` form, and the variants interviewers ask next are one-line changes. Watch the re-read \`queue.size()\` loop bug and the default-locale trap when formatting averages.`,
        examples: [
          {
            label: "Level order with a queue (5 trees)",
            code: `import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.ArrayList;

public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    // Build a tree from a level-order array; null marks a missing child.
    static Node build(Integer[] values) {
        if (values.length == 0 || values[0] == null) return null;
        Node root = new Node(values[0]);
        Deque<Node> queue = new ArrayDeque<>();
        queue.offer(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            Node node = queue.poll();
            if (i < values.length && values[i] != null) {
                node.left = new Node(values[i]);
                queue.offer(node.left);
            }
            i++;
            if (i < values.length && values[i] != null) {
                node.right = new Node(values[i]);
                queue.offer(node.right);
            }
            i++;
        }
        return root;
    }


    // Values grouped by level, top to bottom, left to right.
    static List<List<Integer>> levelOrder(Node root) {
        List<List<Integer>> result = new ArrayList<>();
        if (root == null) return result;
        Deque<Node> queue = new ArrayDeque<>();
        queue.offer(root);
        while (!queue.isEmpty()) {
            int size = queue.size();           // snapshot: nodes on this level
            List<Integer> level = new ArrayList<>(size);
            for (int k = 0; k < size; k++) {
                Node node = queue.poll();
                level.add(node.val);
                if (node.left != null) queue.offer(node.left);   // ArrayDeque rejects null
                if (node.right != null) queue.offer(node.right);
            }
            result.add(level);
        }
        return result;
    }

    public static void main(String[] args) {
        System.out.println(levelOrder(build(new Integer[]{3, 9, 20, null, null, 15, 7}))); // [[3], [9, 20], [15, 7]]
        System.out.println(levelOrder(build(new Integer[]{1, 2, 3, 4, 5, null, 6})));     // [[1], [2, 3], [4, 5, 6]]
        System.out.println(levelOrder(build(new Integer[]{1, null, 2, null, 3})));        // [[1], [2], [3]]
        System.out.println(levelOrder(build(new Integer[]{1})));                          // [[1]]
        System.out.println(levelOrder(build(new Integer[]{})));                           // []
    }
}`,
          },
          {
            label: "Zigzag, bottom-up, averages, and the DFS cross-check",
            code: `import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Locale;

public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    // Build a tree from a level-order array; null marks a missing child.
    static Node build(Integer[] values) {
        if (values.length == 0 || values[0] == null) return null;
        Node root = new Node(values[0]);
        Deque<Node> queue = new ArrayDeque<>();
        queue.offer(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            Node node = queue.poll();
            if (i < values.length && values[i] != null) {
                node.left = new Node(values[i]);
                queue.offer(node.left);
            }
            i++;
            if (i < values.length && values[i] != null) {
                node.right = new Node(values[i]);
                queue.offer(node.right);
            }
            i++;
        }
        return root;
    }


    static List<List<Integer>> levelOrder(Node root) {
        List<List<Integer>> result = new ArrayList<>();
        if (root == null) return result;
        Deque<Node> queue = new ArrayDeque<>();
        queue.offer(root);
        while (!queue.isEmpty()) {
            int size = queue.size();
            List<Integer> level = new ArrayList<>(size);
            for (int k = 0; k < size; k++) {
                Node node = queue.poll();
                level.add(node.val);
                if (node.left != null) queue.offer(node.left);
                if (node.right != null) queue.offer(node.right);
            }
            result.add(level);
        }
        return result;
    }

    // BFS without the size snapshot: right order, but level borders are lost.
    static List<Integer> flatBfs(Node root) {
        List<Integer> out = new ArrayList<>();
        Deque<Node> queue = new ArrayDeque<>();
        if (root != null) queue.offer(root);
        while (!queue.isEmpty()) {
            Node node = queue.poll();
            out.add(node.val);
            if (node.left != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
        return out;
    }

    // Same grouping with DFS: pre-order, left before right, add to result.get(depth).
    static void dfsLevels(Node node, int depth, List<List<Integer>> result) {
        if (node == null) return;
        if (depth == result.size()) result.add(new ArrayList<>());
        result.get(depth).add(node.val);
        dfsLevels(node.left, depth + 1, result);
        dfsLevels(node.right, depth + 1, result);
    }

    static List<List<Integer>> zigzag(Node root) {
        List<List<Integer>> levels = levelOrder(root);
        for (int i = 1; i < levels.size(); i += 2) Collections.reverse(levels.get(i));
        return levels;
    }

    static String averages(Node root) {
        StringBuilder sb = new StringBuilder("[");
        List<List<Integer>> levels = levelOrder(root);
        for (int i = 0; i < levels.size(); i++) {
            long sum = 0;                          // long: a wide level of big ints can overflow int
            for (int v : levels.get(i)) sum += v;
            if (i > 0) sb.append(", ");
            sb.append(String.format(Locale.ROOT, "%.2f", (double) sum / levels.get(i).size()));
        }
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        Integer[][] inputs = {{3, 9, 20, null, null, 15, 7}, {5, 1, 2, 3, 3, 1}};
        for (Integer[] vals : inputs) {
            Node root = build(vals);
            List<List<Integer>> bottomUp = levelOrder(root);
            Collections.reverse(bottomUp);
            List<List<Integer>> viaDfs = new ArrayList<>();
            dfsLevels(root, 0, viaDfs);
            System.out.println("levels:    " + levelOrder(root));
            System.out.println("flat BFS:  " + flatBfs(root));
            System.out.println("zigzag:    " + zigzag(root));
            System.out.println("bottom-up: " + bottomUp);
            System.out.println("averages:  " + averages(root));
            System.out.println("DFS gives the same levels: " + viaDfs.equals(levelOrder(root)));
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given the root of a binary tree, write a C++ function that returns its values level by level — the root's level first, and left to right inside each level — as a \`std::vector<std::vector<int>>\`. For example, the tree [3, 9, 20, null, null, 15, 7] should give [[3], [9, 20], [15, 7]]."

**What a strong answer should cover:**
- Level order is breadth-first search: a FIFO queue, children added left then right.
- How to group by level: snapshot the queue size at the start of each round (or keep each level in its own list).
- O(n) time and O(w) space, where w is the widest level — about n/2 for a perfect tree.
- C++ details: \`std::queue\` (a \`std::deque\` by default), \`front()\` then \`pop()\` (which returns \`void\`), and \`front()\` on an empty queue is undefined behaviour.
- The DFS alternative (pre-order with a depth index) and when BFS is preferable (stop early, very deep trees).
- The usual variants: zigzag, bottom-up, level averages, right-side view.

**Code / implementation expected:** Yes — \`std::vector<std::vector<int>> levelOrder(const Node* root)\` using \`std::queue\`, in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree is; queues and BFS are explained here.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think of a family photo for a big reunion. The photographer does not shuffle people randomly; she calls them row by row: "Grandparents in the front row! Now their children behind them! Now the grandchildren at the back!" And within each row, people stand from left to right.

That is a **level-order traversal**: visit the root, then everyone one step below it, then everyone two steps below, and so on, left to right inside each level. The other common traversals (pre-order, in-order, post-order — see the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods)) dive deep down one branch before coming back; level order instead spreads out evenly, like ripples from a stone dropped at the root.

Interviewers ask for it because it is the tree version of **breadth-first search (BFS)**, the most important graph algorithm for "fewest steps" questions, and because a surprising number of tree problems are just level order with a small twist: the [right-side view of a binary tree](/interview-question/how-do-you-get-the-right-side-view-of-a-binary-tree), zigzag order, level averages, the minimum depth, connecting next pointers, or turning a tree into a string level by level ([serialize and deserialize a binary tree](/interview-question/how-do-you-serialize-and-deserialize-a-binary-tree)). Get the basic loop exactly right once, and all of those become five-minute problems.

## 2. The Core Idea

📌 **Interview term: Level (depth) of a node** — how many edges separate it from the root. The root is on level 0, its children on level 1, and so on.

📌 **Interview term: Level-order traversal** — visiting nodes level by level from the top, left to right within a level. The usual output groups them: \`[[3], [9, 20], [15, 7]]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 250" role="img" aria-label="Tree with root 3 on level 0, nodes 9 and 20 on level 1, and nodes 15 and 7 on level 2">
  <rect class="d-box-muted" x="8" y="10" width="664" height="60" rx="10"/>
  <text class="d-sub" x="22" y="44">level 0</text>
  <rect class="d-box-muted" x="8" y="90" width="664" height="60" rx="10"/>
  <text class="d-sub" x="22" y="124">level 1</text>
  <rect class="d-box-muted" x="8" y="170" width="664" height="60" rx="10"/>
  <text class="d-sub" x="22" y="204">level 2</text>
  <path class="d-edge" d="M 220 40 L 130 120"/>
  <path class="d-edge" d="M 220 40 L 400 120"/>
  <path class="d-edge" d="M 400 120 L 310 200"/>
  <path class="d-edge" d="M 400 120 L 490 200"/>
  <circle class="d-box" cx="220" cy="40" r="20"/>
  <text class="d-text" x="220" y="45" text-anchor="middle">3</text>
  <circle class="d-box" cx="130" cy="120" r="20"/>
  <text class="d-text" x="130" y="125" text-anchor="middle">9</text>
  <circle class="d-box" cx="400" cy="120" r="20"/>
  <text class="d-text" x="400" y="125" text-anchor="middle">20</text>
  <circle class="d-box" cx="310" cy="200" r="20"/>
  <text class="d-text" x="310" y="205" text-anchor="middle">15</text>
  <circle class="d-box" cx="490" cy="200" r="20"/>
  <text class="d-text" x="490" y="205" text-anchor="middle">7</text>
</svg>

How do you visit nodes in that order? You cannot just recurse into the left child, because then you would reach 9's grandchildren before 20. You need a waiting line: when you visit a node, its children join the **back** of the line, and the next node to visit always comes from the **front**. Nodes therefore come out in exactly the order they went in, which is level by level.

📌 **Interview term: Queue (FIFO)** — a first-in, first-out container: add at the back (enqueue), remove from the front (dequeue). Both must be O(1) for BFS to be O(n). See the [difference between a stack and a queue](/interview-question/what-is-the-difference-between-a-stack-and-a-queue).

📌 **Interview term: Breadth-first search (BFS)** — explore everything at distance 1, then distance 2, and so on, using a queue. Level order is BFS on a tree. The general comparison with depth-first search is in the [difference between BFS and DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs).

### Knowing where one level ends

A plain BFS loop gives the right *order* — \`[3, 9, 20, 15, 7]\` — but loses the borders between levels. The standard fix is a **size snapshot**: at the start of each round, the queue holds exactly the nodes of one level (all of them, and nothing else). Read its size, remove exactly that many nodes, and every child you add during the round belongs to the next level.

📌 **Interview term: Level-size snapshot** — reading the queue's length once at the start of a round, so the loop processes exactly one level even though children are being added to the same queue.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="Three rounds of the queue: first it holds 3, then 9 and 20, then 15 and 7. Each round removes exactly the nodes that were in the queue when the round started">
  <defs>
    <marker id="b16q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="60">round 1</text>
  <rect class="d-box" x="120" y="34" width="70" height="44" rx="6"/>
  <text class="d-text" x="155" y="61" text-anchor="middle">3</text>
  <text class="d-sub" x="300" y="48" text-anchor="middle">size = 1</text>
  <path class="d-edge" d="M 250 60 L 446 60" marker-end="url(#b16q3-arrow)"/>
  <rect class="d-box-accent" x="450" y="34" width="290" height="44" rx="10"/>
  <text class="d-text" x="595" y="61" text-anchor="middle">level [3], enqueue 9 and 20</text>
  <text class="d-text" x="20" y="145">round 2</text>
  <rect class="d-box" x="120" y="119" width="70" height="44" rx="6"/>
  <text class="d-text" x="155" y="146" text-anchor="middle">9</text>
  <rect class="d-box" x="190" y="119" width="70" height="44" rx="6"/>
  <text class="d-text" x="225" y="146" text-anchor="middle">20</text>
  <text class="d-sub" x="340" y="133" text-anchor="middle">size = 2</text>
  <path class="d-edge" d="M 290 145 L 446 145" marker-end="url(#b16q3-arrow)"/>
  <rect class="d-box-accent" x="450" y="119" width="290" height="44" rx="10"/>
  <text class="d-text" x="595" y="146" text-anchor="middle">level [9, 20], enqueue 15 and 7</text>
  <text class="d-text" x="20" y="230">round 3</text>
  <rect class="d-box" x="120" y="204" width="70" height="44" rx="6"/>
  <text class="d-text" x="155" y="231" text-anchor="middle">15</text>
  <rect class="d-box" x="190" y="204" width="70" height="44" rx="6"/>
  <text class="d-text" x="225" y="231" text-anchor="middle">7</text>
  <text class="d-sub" x="340" y="218" text-anchor="middle">size = 2</text>
  <path class="d-edge" d="M 290 230 L 446 230" marker-end="url(#b16q3-arrow)"/>
  <rect class="d-box-accent" x="450" y="204" width="290" height="44" rx="10"/>
  <text class="d-text" x="595" y="231" text-anchor="middle">level [15, 7], queue now empty</text>
</svg>

Each round starts with one full level in the queue and ends with the next full level in it. The loop stops when a round adds no children, which leaves the queue empty.

## 3. Step by Step

1. If the root is empty, return an empty list.
2. Put the root in the queue.
3. While the queue is not empty:
   - read \`size\` = the number of nodes in the queue right now;
   - repeat \`size\` times: remove the front node, record its value in this level's list, add its left child and then its right child (if they exist) to the back;
   - append this level's list to the result.
4. Return the result.

Adding the **left child before the right child** is what makes each level come out left to right. Swapping the two lines gives each level right to left.

**Could you do it with DFS instead?** Yes: walk the tree in pre-order (node, left, right) carrying the depth, and append each value to \`result[depth]\`, creating that list the first time a depth is reached. Because the left subtree is always visited before the right one, each inner list is still left to right. Example 2 checks that this gives identical output. It uses O(h) stack instead of an O(w) queue, but the name of the question says BFS — lead with the queue and mention DFS as an alternative.

📌 **Interview term: Width of a tree** — the largest number of nodes on any one level. It bounds the queue size; a perfect tree's last level holds about half of all nodes.

## 4. The Code in C++

~~~cpp
// Values grouped by level, top to bottom, left to right.
std::vector<std::vector<int>> levelOrder(const Node* root) {
    std::vector<std::vector<int>> result;
    if (root == nullptr) return result;
    std::queue<const Node*> q;
    q.push(root);
    while (!q.empty()) {
        size_t size = q.size();                 // snapshot: nodes on this level
        std::vector<int> level;
        level.reserve(size);
        for (size_t k = 0; k < size; k++) {
            const Node* node = q.front();       // front() reads, pop() removes
            q.pop();
            level.push_back(node->val);
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
        result.push_back(std::move(level));
    }
    return result;
}
~~~

**What to point out in this code:**

- **\`std::queue\` is an adapter**, not a container of its own: by default it wraps a \`std::deque\`. We checked this with \`std::is_same<std::queue<int>::container_type, std::deque<int>>\`, which was true with g++ 13. \`push\` adds at the back, \`front\` reads the first element, \`pop\` removes it.
- **\`pop()\` returns \`void\`.** You must read \`front()\` first and then \`pop()\` — two calls. Calling \`front()\` on an empty queue is undefined behaviour, so the \`while (!q.empty())\` guard matters.
- **Take the snapshot first:** \`size_t size = q.size();\`. A loop condition \`k < q.size()\` is re-evaluated each iteration while children are being pushed, so it would run past the level border.
- \`std::move(level)\` hands the finished level's buffer to \`result\` without copying it; \`level.reserve(size)\` allocates the right capacity once.
- The queue stores \`const Node*\` (8 bytes each), never \`Node\` objects, so pushing a child does not copy a subtree.

📌 **Interview term: Container adapter** — a C++ class like \`std::queue\` or \`std::stack\` that restricts another container (by default \`std::deque\`) to a smaller interface.

The DFS alternative from example 2, which builds the same lists using recursion and a depth counter:

~~~cpp
// Same grouping with DFS: pre-order, left before right, push to result[depth].
void dfsLevels(const Node* node, size_t depth, Levels& result) {
    if (node == nullptr) return;
    if (depth == result.size()) result.emplace_back();
    result[depth].push_back(node->val);
    dfsLevels(node->left, depth + 1, result);
    dfsLevels(node->right, depth + 1, result);
}
~~~

Example 2 compares the two results with \`viaDfs == levelOrder(root)\`: \`operator==\` on \`std::vector\` compares sizes and then elements, so nested vectors compare by content.

## 5. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13 with -std=c++17). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 1 runs level order on five trees, including a chain and the empty tree. Example 2 runs the common variants on two trees — the plain BFS order, zigzag, bottom-up and per-level averages — and checks that the DFS version gives the same levels.

**Example 1 — level order on five trees** prints:

~~~text
[[3], [9, 20], [15, 7]]
[[1], [2, 3], [4, 5, 6]]
[[1], [2], [3]]
[[1]]
[]
~~~

**Example 2 — variants and the DFS cross-check** prints:

~~~text
levels:    [[3], [9, 20], [15, 7]]
flat BFS:  [3, 9, 20, 15, 7]
zigzag:    [[3], [20, 9], [15, 7]]
bottom-up: [[15, 7], [9, 20], [3]]
averages:  [3.00, 14.50, 11.00]
DFS gives the same levels: true
levels:    [[5], [1, 2], [3, 3, 1]]
flat BFS:  [5, 1, 2, 3, 3, 1]
zigzag:    [[5], [2, 1], [3, 3, 1]]
bottom-up: [[3, 3, 1], [1, 2], [5]]
averages:  [5.00, 1.50, 2.33]
DFS gives the same levels: true
~~~

## 6. Variants You Get for Free

Once the level loop is right, each of these is a one-line change, and example 2 prints all of them:

| Variant | Change | Output for \`[3, 9, 20, null, null, 15, 7]\` |
| :--- | :--- | :--- |
| Plain BFS order | drop the snapshot, append every value to one list | \`[3, 9, 20, 15, 7]\` |
| Zigzag | reverse every odd level | \`[[3], [20, 9], [15, 7]]\` |
| Bottom-up | reverse the list of levels | \`[[15, 7], [9, 20], [3]]\` |
| Level averages | sum each level and divide by its size | \`[3.00, 14.50, 11.00]\` |
| Right-side view | keep only the last value of each level | \`[3, 20, 7]\` — see the [right-side view of a binary tree](/interview-question/how-do-you-get-the-right-side-view-of-a-binary-tree) |
| Minimum depth | stop at the first leaf you meet and return its level + 1 (depth counted in nodes) | 2 (leaf 9 is on level 1) |

The minimum depth is a good example of why BFS matters: the first leaf found level by level is the shallowest one, so you can stop early instead of exploring the whole tree. (Its counterpart, the [maximum depth](/interview-question/how-do-you-find-the-maximum-depth-of-a-binary-tree), needs every level anyway.) The same "first time you reach it is the shortest" property is what makes BFS find shortest paths in unweighted graphs, as in [Rotting Oranges with multi-source BFS](/interview-question/how-do-you-solve-the-rotting-oranges-problem-with-multi-source-bfs).

## 7. Edge Cases

- **Empty tree** — return an empty list, not \`[[]]\`. Example 1 prints \`[]\`.
- **A single node** — \`[[1]]\`.
- **A chain** (\`[1, null, 2, null, 3]\`) — one value per level: \`[[1], [2], [3]]\`. BFS handles a chain of any length without stack trouble.
- **Missing children in the middle** (\`[1, 2, 3, 4, 5, null, 6]\`) — levels skip the holes: \`[[1], [2, 3], [4, 5, 6]]\`.
- **Duplicate values** — fine; the algorithm never looks at values, only at nodes.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| BFS with a real queue | O(n) | O(w) | every node is enqueued and dequeued once; the queue holds at most one level plus part of the next |
| DFS with a depth index | O(n) | O(h) | every node is visited once; the stack holds one path |
| BFS with an O(n) dequeue | O(n²) worst case | O(w) | each removal from the front moves the rest of the array |

n is the number of nodes, w the width (the largest level) and h the height. The output itself takes O(n) in every version. For a perfect tree, w is about n/2, so the queue really can hold half the tree; for a chain, w is 1 but h is n, which is when BFS is the safer choice because it does not recurse. In C++ \`std::queue\` over \`std::deque\` gives the first row; \`std::vector::erase(v.begin())\` would give the third.

## Common Pitfalls

- **\`k < q.size()\` as the loop condition.** The size changes while you push children; take \`size_t size = q.size()\` first.
- **Expecting \`pop()\` to return the element.** It returns \`void\`; read \`front()\` first.
- **Calling \`front()\` on an empty queue.** Undefined behaviour, not an exception; always guard with \`empty()\`.
- **Queueing \`Node\` by value.** \`std::queue<Node>\` copies nodes and their pointers; store \`const Node*\`.
- **Summing a wide level in an \`int\`.** Signed overflow is undefined behaviour; sum into \`long long\` (example 2 does).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">Level order is BFS on a tree: a FIFO queue makes nodes come out in the order they went in, which is level by level.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Grouping:</strong> <span style="color:#f0e2c8;">At the start of each round the queue holds exactly one level; read its size and remove exactly that many nodes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Order:</strong> <span style="color:#f0e2c8;">Enqueue the left child before the right child so every level reads left to right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(w) extra space for the queue, where w is the widest level (about n/2 for a perfect tree).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue</code> over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::deque</code>: read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">front()</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>, which returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you print the levels in zigzag order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run the same loop and reverse every odd level before appending it (or fill it from the back). The traversal itself does not change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do level order without a queue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with DFS: carry the depth and append each value to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result[depth]</code>, visiting left before right. Same O(n) time, O(h) stack instead of an O(w) queue.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know where one level ends?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size_t size = q.size();</code> before the inner loop — never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k &lt; q.size()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is BFS better than DFS on a tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the answer is near the top — like the minimum depth, where you can stop at the first leaf — and for very deep trees, where recursion could overflow the stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the space on a perfect tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The last level holds about half of all nodes, and at the end of the second-to-last round they are all in the queue at once, so O(n) in the worst case.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Level (depth) of a node** | Edges between the node and the root; the root is level 0 |
| **Level-order traversal** | Visit nodes level by level, left to right within a level |
| **Queue (FIFO)** | First in, first out: add at the back, remove from the front |
| **Breadth-first search (BFS)** | Explore by distance from the start using a queue |
| **Level-size snapshot** | Read the queue length once per round to process exactly one level |
| **Width of a tree** | The largest number of nodes on one level; bounds the queue size |
| **Container adapter** | A class like \`std::queue\` that restricts an underlying container (default \`std::deque\`) |

---
**Conclusion:** Level order is BFS on a tree: a \`std::queue<const Node*>\` (a \`std::deque\` underneath), \`front()\` then \`pop()\` to take the next node, children pushed left then right, and a \`size_t size = q.size()\` snapshot so each round processes exactly one level. It is O(n) time and O(w) space, and the variants interviewers ask next — zigzag, bottom-up, averages, right-side view — are one-line changes. Guard every \`front()\` with \`empty()\`, and sum wide levels in \`long long\`.`,
        examples: [
          {
            label: "Level order with a queue (5 trees)",
            code: `#include <algorithm>
#include <climits>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <queue>
#include <vector>

struct Node {
    int val;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int v) : val(v) {}
};

const int N = INT_MIN;                       // marks a missing child in the input
std::vector<std::unique_ptr<Node>> pool;     // owns every node, frees them at exit

Node* make(int v) {
    pool.push_back(std::make_unique<Node>(v));
    return pool.back().get();
}

// Build a tree from a level-order vector; N marks a missing child.
Node* build(const std::vector<int>& values) {
    if (values.empty() || values[0] == N) return nullptr;
    Node* root = make(values[0]);
    std::queue<Node*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        Node* node = q.front();
        q.pop();
        if (i < values.size() && values[i] != N) {
            node->left = make(values[i]);
            q.push(node->left);
        }
        i++;
        if (i < values.size() && values[i] != N) {
            node->right = make(values[i]);
            q.push(node->right);
        }
        i++;
    }
    return root;
}
// Values grouped by level, top to bottom, left to right.
std::vector<std::vector<int>> levelOrder(const Node* root) {
    std::vector<std::vector<int>> result;
    if (root == nullptr) return result;
    std::queue<const Node*> q;
    q.push(root);
    while (!q.empty()) {
        size_t size = q.size();                 // snapshot: nodes on this level
        std::vector<int> level;
        level.reserve(size);
        for (size_t k = 0; k < size; k++) {
            const Node* node = q.front();       // front() reads, pop() removes
            q.pop();
            level.push_back(node->val);
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
        result.push_back(std::move(level));
    }
    return result;
}

void print(const std::vector<std::vector<int>>& levels) {
    std::cout << "[";
    for (size_t i = 0; i < levels.size(); i++) {
        std::cout << (i ? ", [" : "[");
        for (size_t j = 0; j < levels[i].size(); j++) std::cout << (j ? ", " : "") << levels[i][j];
        std::cout << "]";
    }
    std::cout << "]\\n";
}

int main() {
    print(levelOrder(build({3, 9, 20, N, N, 15, 7})));   // [[3], [9, 20], [15, 7]]
    print(levelOrder(build({1, 2, 3, 4, 5, N, 6})));     // [[1], [2, 3], [4, 5, 6]]
    print(levelOrder(build({1, N, 2, N, 3})));           // [[1], [2], [3]]
    print(levelOrder(build({1})));                       // [[1]]
    print(levelOrder(build({})));                        // []
}`,
          },
          {
            label: "Zigzag, bottom-up, averages, and the DFS cross-check",
            code: `#include <algorithm>
#include <climits>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <queue>
#include <iomanip>
#include <sstream>
#include <string>
#include <vector>

struct Node {
    int val;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int v) : val(v) {}
};

const int N = INT_MIN;                       // marks a missing child in the input
std::vector<std::unique_ptr<Node>> pool;     // owns every node, frees them at exit

Node* make(int v) {
    pool.push_back(std::make_unique<Node>(v));
    return pool.back().get();
}

// Build a tree from a level-order vector; N marks a missing child.
Node* build(const std::vector<int>& values) {
    if (values.empty() || values[0] == N) return nullptr;
    Node* root = make(values[0]);
    std::queue<Node*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        Node* node = q.front();
        q.pop();
        if (i < values.size() && values[i] != N) {
            node->left = make(values[i]);
            q.push(node->left);
        }
        i++;
        if (i < values.size() && values[i] != N) {
            node->right = make(values[i]);
            q.push(node->right);
        }
        i++;
    }
    return root;
}
using Levels = std::vector<std::vector<int>>;

Levels levelOrder(const Node* root) {
    Levels result;
    if (root == nullptr) return result;
    std::queue<const Node*> q;
    q.push(root);
    while (!q.empty()) {
        size_t size = q.size();
        std::vector<int> level;
        for (size_t k = 0; k < size; k++) {
            const Node* node = q.front();
            q.pop();
            level.push_back(node->val);
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
        result.push_back(std::move(level));
    }
    return result;
}

// BFS without the size snapshot: right order, but level borders are lost.
std::vector<int> flatBfs(const Node* root) {
    std::vector<int> out;
    std::queue<const Node*> q;
    if (root) q.push(root);
    while (!q.empty()) {
        const Node* node = q.front();
        q.pop();
        out.push_back(node->val);
        if (node->left) q.push(node->left);
        if (node->right) q.push(node->right);
    }
    return out;
}

// Same grouping with DFS: pre-order, left before right, push to result[depth].
void dfsLevels(const Node* node, size_t depth, Levels& result) {
    if (node == nullptr) return;
    if (depth == result.size()) result.emplace_back();
    result[depth].push_back(node->val);
    dfsLevels(node->left, depth + 1, result);
    dfsLevels(node->right, depth + 1, result);
}

std::string fmt(const std::vector<int>& v) {
    std::string s = "[";
    for (size_t i = 0; i < v.size(); i++) s += (i ? ", " : "") + std::to_string(v[i]);
    return s + "]";
}

std::string fmt(const Levels& levels) {
    std::string s = "[";
    for (size_t i = 0; i < levels.size(); i++) s += (i ? ", " : "") + fmt(levels[i]);
    return s + "]";
}

std::string averages(const Node* root) {
    std::ostringstream out;
    out << std::fixed << std::setprecision(2) << "[";
    Levels levels = levelOrder(root);
    for (size_t i = 0; i < levels.size(); i++) {
        long long sum = 0;
        for (int v : levels[i]) sum += v;
        out << (i ? ", " : "") << static_cast<double>(sum) / levels[i].size();
    }
    out << "]";
    return out.str();
}

int main() {
    std::vector<std::vector<int>> inputs = {{3, 9, 20, N, N, 15, 7}, {5, 1, 2, 3, 3, 1}};
    for (const auto& vals : inputs) {
        const Node* root = build(vals);
        Levels zig = levelOrder(root);
        for (size_t i = 1; i < zig.size(); i += 2) std::reverse(zig[i].begin(), zig[i].end());
        Levels bottomUp = levelOrder(root);
        std::reverse(bottomUp.begin(), bottomUp.end());
        Levels viaDfs;
        dfsLevels(root, 0, viaDfs);
        std::cout << "levels:    " << fmt(levelOrder(root)) << "\\n";
        std::cout << "flat BFS:  " << fmt(flatBfs(root)) << "\\n";
        std::cout << "zigzag:    " << fmt(zig) << "\\n";
        std::cout << "bottom-up: " << fmt(bottomUp) << "\\n";
        std::cout << "averages:  " << averages(root) << "\\n";
        std::cout << std::boolalpha << "DFS gives the same levels: " << (viaDfs == levelOrder(root)) << "\\n";
    }
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you get the right-side view of a binary tree?",
    difficulty: "medium",
    seoDescription: "Right-side view of a binary tree: the last node of each BFS level, or a right-first DFS by depth. Python, JavaScript, Java and C++ code, run and verified.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Imagine standing on the right side of a binary tree. Write a Python function that returns, as a list, the values of the nodes you can see, ordered from top to bottom."

**What a strong answer should cover:**
- The view is the rightmost node of each level — and it can come from the left subtree when the right side is shorter.
- BFS: level-order traversal with a size snapshot, keeping the last node of each round.
- DFS: visit node, right, left with a depth counter and record a node when depth equals the number of values so far.
- Both are O(n) time; BFS uses O(w) space, DFS O(h).
- Python details: \`collections.deque\` for O(1) \`popleft()\`, and \`view=None\` rather than a mutable default list in the DFS.
- Why "follow the right pointers" is wrong, with a counterexample like [1, 2, 3, 4].

**Clarifying questions expected:**
- One value per level, top to bottom, and an empty list for an empty tree?

**Code / implementation expected:** Yes — \`right_side_view(root)\` with a deque-based BFS, plus the DFS alternative, in Python 3.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree is; BFS and DFS are explained here.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a tree-shaped stack of shelves standing in a dark room, each shelf holding one lamp. You walk around to the right-hand side and look straight at it. On every floor of the stack you see exactly one lamp: the one closest to you. Lamps further to the left on the same floor are hidden behind it — but if a floor has only one lamp, way over on the left, you still see that one, because nothing is in front of it.

That is the **right-side view** of a binary tree: for each level, from top to bottom, the value of the rightmost node on that level.

The problem is popular because it has a trap that catches people who think in pictures instead of levels: "just follow the right children from the root". That works on some trees and fails on many others — whenever the left side is deeper than the right side. Our example 2 generated 200 random trees and found the right-pointer shortcut wrong on 177 of them. The real solution is a tiny change to [level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree), and the follow-up (do it with DFS) tests whether you understand *why* it works.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want values from top to bottom, one per level? | That is the standard output. Some variants want the bottom view or the left view, which change the rule. |
| What should an empty tree return? | An empty list. It is the base case for both solutions. |
| Can levels have gaps, so the rightmost node on a level lives in the left subtree? | Yes in general — and this is exactly why "follow the right pointers" is wrong. Asking shows you see the trap. |
| How deep can the tree be? | A very deep chain favours the BFS version (no recursion). |

## 3. The Core Idea

📌 **Interview term: Right-side view** — the list of the rightmost node's value on each level, from the root's level downwards. Equivalently: the last node of each level in a level-order traversal.

<svg class="iq-diagram" width="100%" viewBox="0 0 520 290" role="img" aria-label="Tree with root 1, children 2 and 3, node 2 has right child 5 and node 3 has right child 4. Seen from the right, the visible nodes are 1, 3 and 4">
  <rect class="d-box-muted" x="160" y="4" width="200" height="28" rx="14"/>
  <text class="d-text" x="260" y="23" text-anchor="middle">Right view [1, 3, 4]</text>
  <path class="d-edge" d="M 230 80 L 50 160"/>
  <path class="d-edge" d="M 230 80 L 320 160"/>
  <path class="d-edge" d="M 50 160 L 140 240"/>
  <path class="d-edge" d="M 320 160 L 410 240"/>
  <circle class="d-box-accent" cx="230" cy="80" r="20"/>
  <text class="d-text" x="230" y="85" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="50" cy="160" r="20"/>
  <text class="d-text" x="50" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="320" cy="160" r="20"/>
  <text class="d-text" x="320" y="165" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="140" cy="240" r="20"/>
  <text class="d-text" x="140" y="245" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="410" cy="240" r="20"/>
  <text class="d-text" x="410" y="245" text-anchor="middle">4</text>
  <text class="d-sub" x="256" y="66">level 0: 1</text>
  <text class="d-sub" x="346" y="146">level 1: 3</text>
  <text class="d-sub" x="436" y="226">level 2: 4</text>
</svg>

In the first tree, level 1 holds 2 and 3, and 3 is further right, so 2 is hidden. Level 2 holds 5 and 4, and 4 is further right, so 5 is hidden even though it is a right child. The view is \`[1, 3, 4]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 370" role="img" aria-label="Tree with root 1, children 2 and 3, node 2 has left child 4 and node 4 has left child 5. The right view is 1, 3, 4, 5 because levels 2 and 3 only have nodes on the left side">
  <rect class="d-box-muted" x="248" y="4" width="224" height="28" rx="14"/>
  <text class="d-text" x="360" y="23" text-anchor="middle">Right view [1, 3, 4, 5]</text>
  <path class="d-edge" d="M 420 80 L 330 160"/>
  <path class="d-edge" d="M 420 80 L 510 160"/>
  <path class="d-edge" d="M 330 160 L 240 240"/>
  <path class="d-edge" d="M 240 240 L 150 320"/>
  <circle class="d-box-accent" cx="420" cy="80" r="20"/>
  <text class="d-text" x="420" y="85" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="330" cy="160" r="20"/>
  <text class="d-text" x="330" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="510" cy="160" r="20"/>
  <text class="d-text" x="510" y="165" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="240" cy="240" r="20"/>
  <text class="d-text" x="240" y="245" text-anchor="middle">4</text>
  <circle class="d-box-accent" cx="150" cy="320" r="20"/>
  <text class="d-text" x="150" y="325" text-anchor="middle">5</text>
  <text class="d-sub" x="214" y="226" text-anchor="end">alone on level 2</text>
  <text class="d-sub" x="124" y="306" text-anchor="end">alone on level 3</text>
</svg>

In the second tree the right side stops after node 3. Levels 2 and 3 only have one node each — 4 and 5 — and both live in the **left** subtree. Nothing is in front of them, so they are visible: the view is \`[1, 3, 4, 5]\`. Following right pointers from the root would stop after \`[1, 3]\`.

So the problem is not about right children at all. It is about **levels**, and there are two classic ways to see levels.

## 4. Two Ways to Solve It

### BFS: keep the last node of each level

Run [level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree) with a level-size snapshot. Within a round, children are processed left to right, so the **last** node removed in each round is the rightmost one on that level. Append its value and you are done.

📌 **Interview term: Level-size snapshot** — reading the queue's length at the start of a round so the loop processes exactly one level, even though children are added to the same queue.

### DFS: visit right before left, keep the first node at each new depth

Do a pre-order walk that visits the **right** child before the left one, and carry the depth. The first time the walk reaches a depth it has never seen before, the node it is standing on must be the rightmost node of that level — every node further right on that level would have been reached earlier, because the walk always tries the right side first. The test "have I seen this depth?" is just \`depth == len(view)\`: the view holds one value for each depth seen so far.

📌 **Interview term: Reverse pre-order (node, right, left)** — pre-order with the children swapped. It reaches each level's rightmost node before any other node of that level. See the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods).

📌 **Interview term: First-visit-per-depth rule** — record a node only when its depth equals the number of values recorded so far; that is exactly the first node seen at that depth.

Here is the DFS on the second tree, \`[1, 2, 3, 4, null, null, null, 5]\`:

| Step | Node | Depth | len(view) before | Recorded? | view after |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 1 | 0 | 0 | yes | [1] |
| 2 | 3 | 1 | 1 | yes | [1, 3] |
| 3 | 2 | 1 | 2 | no (level 1 already seen) | [1, 3] |
| 4 | 4 | 2 | 2 | yes | [1, 3, 4] |
| 5 | 5 | 3 | 3 | yes | [1, 3, 4, 5] |

Node 3 has no children, so after it the walk backs up and goes left into 2; 2 is skipped, but its subtree reaches depths 2 and 3 for the first time.

**The left-side view** is the mirror: BFS keeps the *first* node of each level, or DFS visits left before right. Example 2 prints both views.

Which to present? Both are O(n). BFS is the more direct reading of "per level" and does not recurse; DFS is shorter and uses O(h) instead of O(w) memory. Lead with one, mention the other — the [difference between BFS and DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs) covers the general trade-off.

## 5. The Code in Python

The BFS version (example 1):

~~~python
def right_side_view(root):
    """The last node of every level, top to bottom (BFS)."""
    view = []
    queue = deque([root] if root is not None else [])
    while queue:
        size = len(queue)                  # nodes on this level
        for i in range(size):
            node = queue.popleft()
            if i == size - 1:
                view.append(node.val)      # rightmost node of this level
            if node.left is not None:
                queue.append(node.left)
            if node.right is not None:
                queue.append(node.right)
    return view
~~~

The DFS version (example 2):

~~~python
def view_dfs(node, depth=0, view=None):
    """Visit right child first; the first node met at a new depth is visible."""
    if view is None:
        view = []
    if node is None:
        return view
    if depth == len(view):
        view.append(node.val)
    view_dfs(node.right, depth + 1, view)
    view_dfs(node.left, depth + 1, view)
    return view
~~~

**What to point out in this code:**

- \`collections.deque\` makes \`popleft()\` O(1); a list with \`pop(0)\` would make each removal O(n).
- \`if i == size - 1\` picks the last node of the round. \`size\` is read once before the inner loop, which is the level-size snapshot.
- In the DFS, \`view=None\` with \`view = []\` inside the function avoids Python's shared mutable default argument; \`view=[]\` in the signature would keep growing across calls.
- \`depth == len(view)\` is the whole "first node at this depth" test — no set or dictionary of seen depths is needed.
- Example 2 counts agreements with \`agree += view_bfs(root) == view_dfs(root)\`: comparing two lists with \`==\` compares their contents, and \`True\` adds as 1.
- The DFS recurses once per level, so Python's default recursion limit (1000 in our run) caps the depth it can handle; BFS has no such limit.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 1 runs the BFS version on six trees. Example 2 prints the BFS and DFS right views, the left view and the right-pointer shortcut for three trees, then compares BFS against DFS — and against the shortcut — on 200 trees of different shapes, built by inserting pseudo-random numbers (a MINSTD generator, identical in every language) into a binary search tree.

**Example 1 — the BFS right view on six trees** prints:

~~~text
[1, 3, 4]
[1, 3, 4]
[1, 3, 4, 5]
[1, 3]
[1]
[]
~~~

**Example 2 — BFS vs DFS, left view, and the right-pointer trap** prints:

~~~text
right view [1, 3, 4], DFS [1, 3, 4], left view [1, 2, 5], right pointers only [1, 3, 4]
right view [1, 3, 4], DFS [1, 3, 4], left view [1, 2, 4], right pointers only [1, 3]
right view [1, 3, 4, 5], DFS [1, 3, 4, 5], left view [1, 2, 4, 5], right pointers only [1, 3]
random trees: BFS and DFS agree on 200 of 200; right pointers only is wrong on 177
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| BFS, last node per level | O(n) | O(w) | every node is enqueued and dequeued once; the queue holds about one level |
| DFS, right child first | O(n) | O(h) | every node is visited once; the stack holds one root-to-node path |
| Follow right pointers only | O(h) | O(1) | fast, but wrong whenever a level's rightmost node is in a left subtree |

n is the number of nodes, w the width of the widest level and h the height. The output has one value per level, so it takes O(h) space as well. For a balanced tree w is about n/2 while h is about log n, so DFS uses less memory; for a chain w is 1 while h is n, so BFS is the safer one (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)).

## 8. Edge Cases

- **Empty tree** — \`[]\`.
- **A single node** — \`[1]\`.
- **Only right children** (\`[1, null, 3]\`) — every node is visible: \`[1, 3]\`.
- **Left side deeper than the right side** (\`[1, 2, 3, 4, null, null, null, 5]\`) — left-subtree nodes become visible on the deep levels: \`[1, 3, 4, 5]\`.
- **A right child that is hidden** (\`[1, 2, 3, null, 5, null, 4]\`) — 5 is a right child but 4 is further right on the same level, so 5 is not in the view.
- **Lucky shapes** — on \`[1, 2, 3, null, 5, null, 4]\` the right-pointer shortcut happens to give the right answer \`[1, 3, 4]\`; a single passing test proves nothing, which is why example 2 checks 200 trees.

## Common Pitfalls

- **Following only right pointers.** It ignores deeper levels on the left; wrong on 177 of 200 random trees in example 2.
- **Visiting left before right in the DFS.** Then the first node at each depth is the leftmost one, and you have built the left view.
- **\`list.pop(0)\` in the BFS.** O(n) per removal; use \`collections.deque.popleft()\`.
- **A mutable default \`view=[]\`.** It is created once and shared, so the second call returns the first call's values too.
- **Recording the last node of the queue instead of the last node of the round.** \`queue[-1]\` after the round is a node of the *next* level.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">The right-side view is the rightmost node of each level, top to bottom — a question about levels, not about right children.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. BFS:</strong> <span style="color:#f0e2c8;">Level-order traversal with a size snapshot; the last node removed in each round is the visible one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. DFS:</strong> <span style="color:#f0e2c8;">Visit node, right, left with a depth counter; record a node when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">depth == len(view)</code>, the first time that depth is reached.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Both O(n) time; BFS uses O(w) for the queue, DFS O(h) for the stack.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque</code> for the BFS, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">view=None</code> (not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">view=[]</code>) as the DFS default.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just follow the right children?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A level can have its rightmost node in the left subtree when the right side is shorter. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 3, 4]</code> the answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 3, 4]</code>, but the right pointers stop at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 3]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the left-side view?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mirror it: BFS keeps the first node of each round, or DFS visits left before right and keeps the first node at each new depth.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the DFS rule depth == len(view) work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The view holds exactly one value per depth already seen, so its length is the first unseen depth. Visiting right first guarantees the first node reached at a depth is the rightmost one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which version would you use for a very deep tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS, because it uses an explicit queue instead of recursion; the DFS can overflow the call stack on a long chain.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you get the bottom view?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That needs horizontal positions, not levels: give the root column 0, left child column − 1, right child column + 1, and keep the last node seen per column in a BFS.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Right-side view** | The rightmost node value on each level, top to bottom |
| **Level-size snapshot** | Queue length read once per round so the loop handles exactly one level |
| **Reverse pre-order (node, right, left)** | Pre-order with the children swapped; reaches each level's rightmost node first |
| **First-visit-per-depth rule** | Record a node only when its depth equals the number of values recorded so far |

---
**Conclusion:** The right-side view is about levels, not right children: it is the last node of each level. In Python, a \`collections.deque\` level-order loop that records the node at index \`size - 1\` of each round solves it in O(n) time and O(w) space, and a node-right-left DFS that appends when \`depth == len(view)\` solves it in O(n) time and O(h) stack. Both agreed on all 200 random trees in our run, while the tempting right-pointer shortcut was wrong on 177 of them.`,
        examples: [
          {
            label: "BFS: last node of every level (6 trees)",
            code: `from collections import deque


class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def build(values):
    """Build a tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = Node(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = Node(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = Node(values[i])
            queue.append(node.right)
        i += 1
    return root




def right_side_view(root):
    """The last node of every level, top to bottom (BFS)."""
    view = []
    queue = deque([root] if root is not None else [])
    while queue:
        size = len(queue)                  # nodes on this level
        for i in range(size):
            node = queue.popleft()
            if i == size - 1:
                view.append(node.val)      # rightmost node of this level
            if node.left is not None:
                queue.append(node.left)
            if node.right is not None:
                queue.append(node.right)
    return view


print(right_side_view(build([1, 2, 3, None, 5, None, 4])))  # [1, 3, 4]
print(right_side_view(build([1, 2, 3, 4])))  # [1, 3, 4]
print(right_side_view(build([1, 2, 3, 4, None, None, None, 5])))  # [1, 3, 4, 5]
print(right_side_view(build([1, None, 3])))  # [1, 3]
print(right_side_view(build([1])))  # [1]
print(right_side_view(build([])))  # []`,
          },
          {
            label: "BFS vs DFS, left view, and the right-pointer trap on 200 trees",
            code: `from collections import deque


class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def build(values):
    """Build a tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = Node(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = Node(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = Node(values[i])
            queue.append(node.right)
        i += 1
    return root




def view_bfs(root, right=True):
    """Last (or first) node of each level."""
    view, level = [], [root] if root is not None else []
    while level:
        view.append(level[-1].val if right else level[0].val)
        level = [c for n in level for c in (n.left, n.right) if c is not None]
    return view


def view_dfs(node, depth=0, view=None):
    """Visit right child first; the first node met at a new depth is visible."""
    if view is None:
        view = []
    if node is None:
        return view
    if depth == len(view):
        view.append(node.val)
    view_dfs(node.right, depth + 1, view)
    view_dfs(node.left, depth + 1, view)
    return view


def right_pointers_only(root):
    """The classic wrong answer: just walk .right from the root."""
    out = []
    while root is not None:
        out.append(root.val)
        root = root.right
    return out


def insert(root, v):
    """Plain BST insert, used only to make trees of many shapes."""
    if root is None:
        return Node(v)
    if v < root.val:
        root.left = insert(root.left, v)
    else:
        root.right = insert(root.right, v)
    return root


for vals in ([1, 2, 3, None, 5, None, 4], [1, 2, 3, 4], [1, 2, 3, 4, None, None, None, 5]):
    root = build(vals)
    print("right view " + str(view_bfs(root)) + ", DFS " + str(view_dfs(root))
          + ", left view " + str(view_bfs(root, False)) + ", right pointers only " + str(right_pointers_only(root)))

seed, agree, wrong = 7, 0, 0
for t in range(200):
    root = None
    for k in range(1 + t % 40):
        seed = seed * 48271 % 2147483647           # MINSTD, same numbers in every language
        root = insert(root, seed % 1000)
    agree += view_bfs(root) == view_dfs(root)
    wrong += right_pointers_only(root) != view_bfs(root)
print("random trees: BFS and DFS agree on " + str(agree) + " of 200; right pointers only is wrong on " + str(wrong))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Imagine standing on the right side of a binary tree. Write a JavaScript function that returns, as an array, the values of the nodes you can see, ordered from top to bottom."

**What a strong answer should cover:**
- The view is the rightmost node of each level — and it can come from the left subtree when the right side is shorter.
- BFS: level-order traversal with a size snapshot, keeping the last node of each round.
- DFS: visit node, right, left with a depth counter and record a node when depth equals the number of values so far.
- Both are O(n) time; BFS uses O(w) space, DFS O(h).
- JavaScript details: no built-in queue — swap level arrays or use a head index instead of \`shift()\`; arrays compare by reference.
- Why "follow the right pointers" is wrong, with a counterexample like [1, 2, 3, 4].

**Clarifying questions expected:**
- One value per level, top to bottom, and an empty list for an empty tree?

**Code / implementation expected:** Yes — \`rightSideView(root)\` with a level-by-level BFS, plus the DFS alternative, in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree is; BFS and DFS are explained here.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a tree-shaped stack of shelves standing in a dark room, each shelf holding one lamp. You walk around to the right-hand side and look straight at it. On every floor of the stack you see exactly one lamp: the one closest to you. Lamps further to the left on the same floor are hidden behind it — but if a floor has only one lamp, way over on the left, you still see that one, because nothing is in front of it.

That is the **right-side view** of a binary tree: for each level, from top to bottom, the value of the rightmost node on that level.

The problem is popular because it has a trap that catches people who think in pictures instead of levels: "just follow the right children from the root". That works on some trees and fails on many others — whenever the left side is deeper than the right side. Our example 2 generated 200 random trees and found the right-pointer shortcut wrong on 177 of them. The real solution is a tiny change to [level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree), and the follow-up (do it with DFS) tests whether you understand *why* it works.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want values from top to bottom, one per level? | That is the standard output. Some variants want the bottom view or the left view, which change the rule. |
| What should an empty tree return? | An empty list. It is the base case for both solutions. |
| Can levels have gaps, so the rightmost node on a level lives in the left subtree? | Yes in general — and this is exactly why "follow the right pointers" is wrong. Asking shows you see the trap. |
| How deep can the tree be? | A very deep chain favours the BFS version (no recursion). |

## 3. The Core Idea

📌 **Interview term: Right-side view** — the list of the rightmost node's value on each level, from the root's level downwards. Equivalently: the last node of each level in a level-order traversal.

<svg class="iq-diagram" width="100%" viewBox="0 0 520 290" role="img" aria-label="Tree with root 1, children 2 and 3, node 2 has right child 5 and node 3 has right child 4. Seen from the right, the visible nodes are 1, 3 and 4">
  <rect class="d-box-muted" x="160" y="4" width="200" height="28" rx="14"/>
  <text class="d-text" x="260" y="23" text-anchor="middle">Right view [1, 3, 4]</text>
  <path class="d-edge" d="M 230 80 L 50 160"/>
  <path class="d-edge" d="M 230 80 L 320 160"/>
  <path class="d-edge" d="M 50 160 L 140 240"/>
  <path class="d-edge" d="M 320 160 L 410 240"/>
  <circle class="d-box-accent" cx="230" cy="80" r="20"/>
  <text class="d-text" x="230" y="85" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="50" cy="160" r="20"/>
  <text class="d-text" x="50" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="320" cy="160" r="20"/>
  <text class="d-text" x="320" y="165" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="140" cy="240" r="20"/>
  <text class="d-text" x="140" y="245" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="410" cy="240" r="20"/>
  <text class="d-text" x="410" y="245" text-anchor="middle">4</text>
  <text class="d-sub" x="256" y="66">level 0: 1</text>
  <text class="d-sub" x="346" y="146">level 1: 3</text>
  <text class="d-sub" x="436" y="226">level 2: 4</text>
</svg>

In the first tree, level 1 holds 2 and 3, and 3 is further right, so 2 is hidden. Level 2 holds 5 and 4, and 4 is further right, so 5 is hidden even though it is a right child. The view is \`[1, 3, 4]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 370" role="img" aria-label="Tree with root 1, children 2 and 3, node 2 has left child 4 and node 4 has left child 5. The right view is 1, 3, 4, 5 because levels 2 and 3 only have nodes on the left side">
  <rect class="d-box-muted" x="248" y="4" width="224" height="28" rx="14"/>
  <text class="d-text" x="360" y="23" text-anchor="middle">Right view [1, 3, 4, 5]</text>
  <path class="d-edge" d="M 420 80 L 330 160"/>
  <path class="d-edge" d="M 420 80 L 510 160"/>
  <path class="d-edge" d="M 330 160 L 240 240"/>
  <path class="d-edge" d="M 240 240 L 150 320"/>
  <circle class="d-box-accent" cx="420" cy="80" r="20"/>
  <text class="d-text" x="420" y="85" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="330" cy="160" r="20"/>
  <text class="d-text" x="330" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="510" cy="160" r="20"/>
  <text class="d-text" x="510" y="165" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="240" cy="240" r="20"/>
  <text class="d-text" x="240" y="245" text-anchor="middle">4</text>
  <circle class="d-box-accent" cx="150" cy="320" r="20"/>
  <text class="d-text" x="150" y="325" text-anchor="middle">5</text>
  <text class="d-sub" x="214" y="226" text-anchor="end">alone on level 2</text>
  <text class="d-sub" x="124" y="306" text-anchor="end">alone on level 3</text>
</svg>

In the second tree the right side stops after node 3. Levels 2 and 3 only have one node each — 4 and 5 — and both live in the **left** subtree. Nothing is in front of them, so they are visible: the view is \`[1, 3, 4, 5]\`. Following right pointers from the root would stop after \`[1, 3]\`.

So the problem is not about right children at all. It is about **levels**, and there are two classic ways to see levels.

## 4. Two Ways to Solve It

### BFS: keep the last node of each level

Run [level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree) with a level-size snapshot. Within a round, children are processed left to right, so the **last** node removed in each round is the rightmost one on that level. Append its value and you are done.

📌 **Interview term: Level-size snapshot** — reading the queue's length at the start of a round so the loop processes exactly one level, even though children are added to the same queue.

### DFS: visit right before left, keep the first node at each new depth

Do a pre-order walk that visits the **right** child before the left one, and carry the depth. The first time the walk reaches a depth it has never seen before, the node it is standing on must be the rightmost node of that level — every node further right on that level would have been reached earlier, because the walk always tries the right side first. The test "have I seen this depth?" is just \`depth == len(view)\`: the view holds one value for each depth seen so far.

📌 **Interview term: Reverse pre-order (node, right, left)** — pre-order with the children swapped. It reaches each level's rightmost node before any other node of that level. See the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods).

📌 **Interview term: First-visit-per-depth rule** — record a node only when its depth equals the number of values recorded so far; that is exactly the first node seen at that depth.

Here is the DFS on the second tree, \`[1, 2, 3, 4, null, null, null, 5]\`:

| Step | Node | Depth | len(view) before | Recorded? | view after |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 1 | 0 | 0 | yes | [1] |
| 2 | 3 | 1 | 1 | yes | [1, 3] |
| 3 | 2 | 1 | 2 | no (level 1 already seen) | [1, 3] |
| 4 | 4 | 2 | 2 | yes | [1, 3, 4] |
| 5 | 5 | 3 | 3 | yes | [1, 3, 4, 5] |

Node 3 has no children, so after it the walk backs up and goes left into 2; 2 is skipped, but its subtree reaches depths 2 and 3 for the first time.

**The left-side view** is the mirror: BFS keeps the *first* node of each level, or DFS visits left before right. Example 2 prints both views.

Which to present? Both are O(n). BFS is the more direct reading of "per level" and does not recurse; DFS is shorter and uses O(h) instead of O(w) memory. Lead with one, mention the other — the [difference between BFS and DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs) covers the general trade-off.

## 5. The Code in JavaScript

The BFS version (example 1):

~~~javascript
// The last node of every level, top to bottom (BFS).
function rightSideView(root) {
  const view = [];
  let level = root === null ? [] : [root];
  while (level.length > 0) {
    view.push(level[level.length - 1].val); // rightmost node of this level
    const next = [];
    for (const node of level) {
      if (node.left !== null) next.push(node.left);
      if (node.right !== null) next.push(node.right);
    }
    level = next;
  }
  return view;
}
~~~

The DFS version (example 2):

~~~javascript
// Visit right child first; the first node met at a new depth is visible.
function viewDfs(node, depth = 0, view = []) {
  if (node === null) return view;
  if (depth === view.length) view.push(node.val);
  viewDfs(node.right, depth + 1, view);
  viewDfs(node.left, depth + 1, view);
  return view;
}
~~~

**What to point out in this code:**

- The BFS keeps each level in its own array and swaps (\`level = next\`), so \`level[level.length - 1]\` is the rightmost node and no \`shift()\` is needed. \`shift()\` moves every remaining element, which made it quadratic on large arrays in our run (see [level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree)).
- In the DFS, the default parameter \`view = []\` is evaluated on each call that omits it, so every top-level call gets a fresh array; the recursive calls pass the same array down explicitly.
- Two arrays are never \`===\` to each other unless they are the same object, so example 2 compares the views through their printed form (\`fmt(a) === fmt(b)\`).
- The DFS recurses once per level; in our Node 22 run the engine allowed roughly ten thousand nested calls, so the BFS is safer for extremely deep trees.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 1 runs the BFS version on six trees. Example 2 prints the BFS and DFS right views, the left view and the right-pointer shortcut for three trees, then compares BFS against DFS — and against the shortcut — on 200 trees of different shapes, built by inserting pseudo-random numbers (a MINSTD generator, identical in every language) into a binary search tree.

**Example 1 — the BFS right view on six trees** prints:

~~~text
[1, 3, 4]
[1, 3, 4]
[1, 3, 4, 5]
[1, 3]
[1]
[]
~~~

**Example 2 — BFS vs DFS, left view, and the right-pointer trap** prints:

~~~text
right view [1, 3, 4], DFS [1, 3, 4], left view [1, 2, 5], right pointers only [1, 3, 4]
right view [1, 3, 4], DFS [1, 3, 4], left view [1, 2, 4], right pointers only [1, 3]
right view [1, 3, 4, 5], DFS [1, 3, 4, 5], left view [1, 2, 4, 5], right pointers only [1, 3]
random trees: BFS and DFS agree on 200 of 200; right pointers only is wrong on 177
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| BFS, last node per level | O(n) | O(w) | every node is enqueued and dequeued once; the queue holds about one level |
| DFS, right child first | O(n) | O(h) | every node is visited once; the stack holds one root-to-node path |
| Follow right pointers only | O(h) | O(1) | fast, but wrong whenever a level's rightmost node is in a left subtree |

n is the number of nodes, w the width of the widest level and h the height. The output has one value per level, so it takes O(h) space as well. For a balanced tree w is about n/2 while h is about log n, so DFS uses less memory; for a chain w is 1 while h is n, so BFS is the safer one (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)).

## 8. Edge Cases

- **Empty tree** — \`[]\`.
- **A single node** — \`[1]\`.
- **Only right children** (\`[1, null, 3]\`) — every node is visible: \`[1, 3]\`.
- **Left side deeper than the right side** (\`[1, 2, 3, 4, null, null, null, 5]\`) — left-subtree nodes become visible on the deep levels: \`[1, 3, 4, 5]\`.
- **A right child that is hidden** (\`[1, 2, 3, null, 5, null, 4]\`) — 5 is a right child but 4 is further right on the same level, so 5 is not in the view.
- **Lucky shapes** — on \`[1, 2, 3, null, 5, null, 4]\` the right-pointer shortcut happens to give the right answer \`[1, 3, 4]\`; a single passing test proves nothing, which is why example 2 checks 200 trees.

## Common Pitfalls

- **Following only right pointers.** It ignores deeper levels on the left; wrong on 177 of 200 random trees in example 2.
- **Visiting left before right in the DFS.** Then the first node at each depth is the leftmost one, and you have built the left view.
- **\`queue.shift()\` in the BFS.** It moves every element; swap level arrays or use a head index.
- **Comparing arrays with \`===\`.** Two different arrays with the same values are never \`===\`; compare element by element or by a formatted string.
- **Re-reading \`queue.length\` as the loop bound** while pushing children — it mixes levels.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">The right-side view is the rightmost node of each level, top to bottom — a question about levels, not about right children.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. BFS:</strong> <span style="color:#f0e2c8;">Level-order traversal with a size snapshot; the last node removed in each round is the visible one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. DFS:</strong> <span style="color:#f0e2c8;">Visit node, right, left with a depth counter; record a node when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">depth == len(view)</code>, the first time that depth is reached.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Both O(n) time; BFS uses O(w) for the queue, DFS O(h) for the stack.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Swap level arrays instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift()</code>; the last element <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">level[level.length - 1]</code> is the visible node.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just follow the right children?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A level can have its rightmost node in the left subtree when the right side is shorter. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 3, 4]</code> the answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 3, 4]</code>, but the right pointers stop at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 3]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the left-side view?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mirror it: BFS keeps the first node of each round, or DFS visits left before right and keeps the first node at each new depth.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the DFS rule depth == len(view) work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The view holds exactly one value per depth already seen, so its length is the first unseen depth. Visiting right first guarantees the first node reached at a depth is the rightmost one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which version would you use for a very deep tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS, because it uses an explicit queue instead of recursion; the DFS can overflow the call stack on a long chain.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you get the bottom view?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That needs horizontal positions, not levels: give the root column 0, left child column − 1, right child column + 1, and keep the last node seen per column in a BFS.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Right-side view** | The rightmost node value on each level, top to bottom |
| **Level-size snapshot** | Queue length read once per round so the loop handles exactly one level |
| **Reverse pre-order (node, right, left)** | Pre-order with the children swapped; reaches each level's rightmost node first |
| **First-visit-per-depth rule** | Record a node only when its depth equals the number of values recorded so far |

---
**Conclusion:** The right-side view is about levels, not right children: it is the last node of each level. In JavaScript, a level-by-level BFS that swaps arrays and keeps \`level[level.length - 1]\` solves it in O(n) time and O(w) space without \`shift()\`, and a node-right-left DFS that pushes when \`depth === view.length\` solves it in O(n) time and O(h) stack. Both agreed on all 200 random trees in our run, while the right-pointer shortcut was wrong on 177 of them.`,
        examples: [
          {
            label: "BFS: last node of every level (6 trees)",
            code: `class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// Build a tree from a level-order array; null marks a missing child.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new Node(values[0]);
  const queue = [root];
  let head = 0; // index of the next node to fill (cheaper than queue.shift())
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) {
      node.left = new Node(values[i]);
      queue.push(node.left);
    }
    i++;
    if (i < values.length && values[i] !== null) {
      node.right = new Node(values[i]);
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

// The last node of every level, top to bottom (BFS).
function rightSideView(root) {
  const view = [];
  let level = root === null ? [] : [root];
  while (level.length > 0) {
    view.push(level[level.length - 1].val); // rightmost node of this level
    const next = [];
    for (const node of level) {
      if (node.left !== null) next.push(node.left);
      if (node.right !== null) next.push(node.right);
    }
    level = next;
  }
  return view;
}

function fmt(arr) {
  return '[' + arr.join(', ') + ']';
}

console.log(fmt(rightSideView(build([1, 2, 3, null, 5, null, 4])))); // [1, 3, 4]
console.log(fmt(rightSideView(build([1, 2, 3, 4])))); // [1, 3, 4]
console.log(fmt(rightSideView(build([1, 2, 3, 4, null, null, null, 5])))); // [1, 3, 4, 5]
console.log(fmt(rightSideView(build([1, null, 3])))); // [1, 3]
console.log(fmt(rightSideView(build([1])))); // [1]
console.log(fmt(rightSideView(build([])))); // []`,
          },
          {
            label: "BFS vs DFS, left view, and the right-pointer trap on 200 trees",
            code: `class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// Build a tree from a level-order array; null marks a missing child.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new Node(values[0]);
  const queue = [root];
  let head = 0; // index of the next node to fill (cheaper than queue.shift())
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) {
      node.left = new Node(values[i]);
      queue.push(node.left);
    }
    i++;
    if (i < values.length && values[i] !== null) {
      node.right = new Node(values[i]);
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

// Last (or first) node of each level.
function viewBfs(root, right = true) {
  const view = [];
  let level = root === null ? [] : [root];
  while (level.length > 0) {
    view.push(right ? level[level.length - 1].val : level[0].val);
    const next = [];
    for (const n of level) {
      if (n.left !== null) next.push(n.left);
      if (n.right !== null) next.push(n.right);
    }
    level = next;
  }
  return view;
}

// Visit right child first; the first node met at a new depth is visible.
function viewDfs(node, depth = 0, view = []) {
  if (node === null) return view;
  if (depth === view.length) view.push(node.val);
  viewDfs(node.right, depth + 1, view);
  viewDfs(node.left, depth + 1, view);
  return view;
}

// The classic wrong answer: just walk .right from the root.
function rightPointersOnly(root) {
  const out = [];
  for (let n = root; n !== null; n = n.right) out.push(n.val);
  return out;
}

// Plain BST insert, used only to make trees of many shapes.
function insert(root, v) {
  if (root === null) return new Node(v);
  if (v < root.val) root.left = insert(root.left, v);
  else root.right = insert(root.right, v);
  return root;
}

const fmt = (a) => '[' + a.join(', ') + ']';

for (const vals of [[1, 2, 3, null, 5, null, 4], [1, 2, 3, 4], [1, 2, 3, 4, null, null, null, 5]]) {
  const root = build(vals);
  console.log('right view ' + fmt(viewBfs(root)) + ', DFS ' + fmt(viewDfs(root)) +
    ', left view ' + fmt(viewBfs(root, false)) + ', right pointers only ' + fmt(rightPointersOnly(root)));
}

let seed = 7, agree = 0, wrong = 0;
for (let t = 0; t < 200; t++) {
  let root = null;
  for (let k = 0; k < 1 + (t % 40); k++) {
    seed = (seed * 48271) % 2147483647; // stays below 2^53, so the product is exact
    root = insert(root, seed % 1000);
  }
  if (fmt(viewBfs(root)) === fmt(viewDfs(root))) agree++;
  if (fmt(rightPointersOnly(root)) !== fmt(viewBfs(root))) wrong++;
}
console.log('random trees: BFS and DFS agree on ' + agree + ' of 200; right pointers only is wrong on ' + wrong);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Imagine standing on the right side of a binary tree. Write a Java function that returns, as a \`List<Integer>\`, the values of the nodes you can see, ordered from top to bottom."

**What a strong answer should cover:**
- The view is the rightmost node of each level — and it can come from the left subtree when the right side is shorter.
- BFS: level-order traversal with a size snapshot, keeping the last node of each round.
- DFS: visit node, right, left with a depth counter and record a node when depth equals the number of values so far.
- Both are O(n) time; BFS uses O(w) space, DFS O(h).
- Java details: \`ArrayDeque\` with a \`size\` snapshot read once, no \`null\` offers, and \`equals\` rather than \`==\` to compare lists.
- Why "follow the right pointers" is wrong, with a counterexample like [1, 2, 3, 4].

**Clarifying questions expected:**
- One value per level, top to bottom, and an empty list for an empty tree?

**Code / implementation expected:** Yes — \`static List<Integer> rightSideView(Node root)\` with \`ArrayDeque\`, plus the DFS alternative, in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree is; BFS and DFS are explained here.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a tree-shaped stack of shelves standing in a dark room, each shelf holding one lamp. You walk around to the right-hand side and look straight at it. On every floor of the stack you see exactly one lamp: the one closest to you. Lamps further to the left on the same floor are hidden behind it — but if a floor has only one lamp, way over on the left, you still see that one, because nothing is in front of it.

That is the **right-side view** of a binary tree: for each level, from top to bottom, the value of the rightmost node on that level.

The problem is popular because it has a trap that catches people who think in pictures instead of levels: "just follow the right children from the root". That works on some trees and fails on many others — whenever the left side is deeper than the right side. Our example 2 generated 200 random trees and found the right-pointer shortcut wrong on 177 of them. The real solution is a tiny change to [level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree), and the follow-up (do it with DFS) tests whether you understand *why* it works.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want values from top to bottom, one per level? | That is the standard output. Some variants want the bottom view or the left view, which change the rule. |
| What should an empty tree return? | An empty list. It is the base case for both solutions. |
| Can levels have gaps, so the rightmost node on a level lives in the left subtree? | Yes in general — and this is exactly why "follow the right pointers" is wrong. Asking shows you see the trap. |
| How deep can the tree be? | A very deep chain favours the BFS version (no recursion). |

## 3. The Core Idea

📌 **Interview term: Right-side view** — the list of the rightmost node's value on each level, from the root's level downwards. Equivalently: the last node of each level in a level-order traversal.

<svg class="iq-diagram" width="100%" viewBox="0 0 520 290" role="img" aria-label="Tree with root 1, children 2 and 3, node 2 has right child 5 and node 3 has right child 4. Seen from the right, the visible nodes are 1, 3 and 4">
  <rect class="d-box-muted" x="160" y="4" width="200" height="28" rx="14"/>
  <text class="d-text" x="260" y="23" text-anchor="middle">Right view [1, 3, 4]</text>
  <path class="d-edge" d="M 230 80 L 50 160"/>
  <path class="d-edge" d="M 230 80 L 320 160"/>
  <path class="d-edge" d="M 50 160 L 140 240"/>
  <path class="d-edge" d="M 320 160 L 410 240"/>
  <circle class="d-box-accent" cx="230" cy="80" r="20"/>
  <text class="d-text" x="230" y="85" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="50" cy="160" r="20"/>
  <text class="d-text" x="50" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="320" cy="160" r="20"/>
  <text class="d-text" x="320" y="165" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="140" cy="240" r="20"/>
  <text class="d-text" x="140" y="245" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="410" cy="240" r="20"/>
  <text class="d-text" x="410" y="245" text-anchor="middle">4</text>
  <text class="d-sub" x="256" y="66">level 0: 1</text>
  <text class="d-sub" x="346" y="146">level 1: 3</text>
  <text class="d-sub" x="436" y="226">level 2: 4</text>
</svg>

In the first tree, level 1 holds 2 and 3, and 3 is further right, so 2 is hidden. Level 2 holds 5 and 4, and 4 is further right, so 5 is hidden even though it is a right child. The view is \`[1, 3, 4]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 370" role="img" aria-label="Tree with root 1, children 2 and 3, node 2 has left child 4 and node 4 has left child 5. The right view is 1, 3, 4, 5 because levels 2 and 3 only have nodes on the left side">
  <rect class="d-box-muted" x="248" y="4" width="224" height="28" rx="14"/>
  <text class="d-text" x="360" y="23" text-anchor="middle">Right view [1, 3, 4, 5]</text>
  <path class="d-edge" d="M 420 80 L 330 160"/>
  <path class="d-edge" d="M 420 80 L 510 160"/>
  <path class="d-edge" d="M 330 160 L 240 240"/>
  <path class="d-edge" d="M 240 240 L 150 320"/>
  <circle class="d-box-accent" cx="420" cy="80" r="20"/>
  <text class="d-text" x="420" y="85" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="330" cy="160" r="20"/>
  <text class="d-text" x="330" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="510" cy="160" r="20"/>
  <text class="d-text" x="510" y="165" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="240" cy="240" r="20"/>
  <text class="d-text" x="240" y="245" text-anchor="middle">4</text>
  <circle class="d-box-accent" cx="150" cy="320" r="20"/>
  <text class="d-text" x="150" y="325" text-anchor="middle">5</text>
  <text class="d-sub" x="214" y="226" text-anchor="end">alone on level 2</text>
  <text class="d-sub" x="124" y="306" text-anchor="end">alone on level 3</text>
</svg>

In the second tree the right side stops after node 3. Levels 2 and 3 only have one node each — 4 and 5 — and both live in the **left** subtree. Nothing is in front of them, so they are visible: the view is \`[1, 3, 4, 5]\`. Following right pointers from the root would stop after \`[1, 3]\`.

So the problem is not about right children at all. It is about **levels**, and there are two classic ways to see levels.

## 4. Two Ways to Solve It

### BFS: keep the last node of each level

Run [level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree) with a level-size snapshot. Within a round, children are processed left to right, so the **last** node removed in each round is the rightmost one on that level. Append its value and you are done.

📌 **Interview term: Level-size snapshot** — reading the queue's length at the start of a round so the loop processes exactly one level, even though children are added to the same queue.

### DFS: visit right before left, keep the first node at each new depth

Do a pre-order walk that visits the **right** child before the left one, and carry the depth. The first time the walk reaches a depth it has never seen before, the node it is standing on must be the rightmost node of that level — every node further right on that level would have been reached earlier, because the walk always tries the right side first. The test "have I seen this depth?" is just \`depth == len(view)\`: the view holds one value for each depth seen so far.

📌 **Interview term: Reverse pre-order (node, right, left)** — pre-order with the children swapped. It reaches each level's rightmost node before any other node of that level. See the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods).

📌 **Interview term: First-visit-per-depth rule** — record a node only when its depth equals the number of values recorded so far; that is exactly the first node seen at that depth.

Here is the DFS on the second tree, \`[1, 2, 3, 4, null, null, null, 5]\`:

| Step | Node | Depth | len(view) before | Recorded? | view after |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 1 | 0 | 0 | yes | [1] |
| 2 | 3 | 1 | 1 | yes | [1, 3] |
| 3 | 2 | 1 | 2 | no (level 1 already seen) | [1, 3] |
| 4 | 4 | 2 | 2 | yes | [1, 3, 4] |
| 5 | 5 | 3 | 3 | yes | [1, 3, 4, 5] |

Node 3 has no children, so after it the walk backs up and goes left into 2; 2 is skipped, but its subtree reaches depths 2 and 3 for the first time.

**The left-side view** is the mirror: BFS keeps the *first* node of each level, or DFS visits left before right. Example 2 prints both views.

Which to present? Both are O(n). BFS is the more direct reading of "per level" and does not recurse; DFS is shorter and uses O(h) instead of O(w) memory. Lead with one, mention the other — the [difference between BFS and DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs) covers the general trade-off.

## 5. The Code in Java

The BFS version (example 1):

~~~java
// The last node of every level, top to bottom (BFS).
static List<Integer> rightSideView(Node root) {
    List<Integer> view = new ArrayList<>();
    if (root == null) return view;
    Deque<Node> queue = new ArrayDeque<>();
    queue.offer(root);
    while (!queue.isEmpty()) {
        int size = queue.size();               // nodes on this level
        for (int i = 0; i < size; i++) {
            Node node = queue.poll();
            if (i == size - 1) view.add(node.val); // rightmost node of this level
            if (node.left != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
    }
    return view;
}
~~~

The DFS version (example 2):

~~~java
// Visit right child first; the first node met at a new depth is visible.
static void viewDfs(Node node, int depth, List<Integer> view) {
    if (node == null) return;
    if (depth == view.size()) view.add(node.val);
    viewDfs(node.right, depth + 1, view);
    viewDfs(node.left, depth + 1, view);
}
~~~

**What to point out in this code:**

- \`ArrayDeque\` is the queue (\`offer\` / \`poll\`). It throws \`NullPointerException\` if you offer \`null\`, which is why each child is checked first.
- \`int size = queue.size();\` is read once before the inner loop; \`i == size - 1\` picks the last node of the level. Writing \`i < queue.size()\` in the loop condition would mix levels, because the queue grows inside the loop.
- \`List<Integer>\` boxes each value. Comparing two views with \`==\` would compare references, so example 2 uses \`equals\`, which compares element by element.
- The DFS is a helper with the depth and the shared \`view\` list as parameters; Java passes the reference to the list by value, so every call appends to the same list object.
- The DFS recurses once per level: with the default stack, 100,000 nested calls threw \`StackOverflowError\` in our run, so prefer BFS for very deep trees.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21 (the code only uses Java 17 features)). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 1 runs the BFS version on six trees. Example 2 prints the BFS and DFS right views, the left view and the right-pointer shortcut for three trees, then compares BFS against DFS — and against the shortcut — on 200 trees of different shapes, built by inserting pseudo-random numbers (a MINSTD generator, identical in every language) into a binary search tree.

**Example 1 — the BFS right view on six trees** prints:

~~~text
[1, 3, 4]
[1, 3, 4]
[1, 3, 4, 5]
[1, 3]
[1]
[]
~~~

**Example 2 — BFS vs DFS, left view, and the right-pointer trap** prints:

~~~text
right view [1, 3, 4], DFS [1, 3, 4], left view [1, 2, 5], right pointers only [1, 3, 4]
right view [1, 3, 4], DFS [1, 3, 4], left view [1, 2, 4], right pointers only [1, 3]
right view [1, 3, 4, 5], DFS [1, 3, 4, 5], left view [1, 2, 4, 5], right pointers only [1, 3]
random trees: BFS and DFS agree on 200 of 200; right pointers only is wrong on 177
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| BFS, last node per level | O(n) | O(w) | every node is enqueued and dequeued once; the queue holds about one level |
| DFS, right child first | O(n) | O(h) | every node is visited once; the stack holds one root-to-node path |
| Follow right pointers only | O(h) | O(1) | fast, but wrong whenever a level's rightmost node is in a left subtree |

n is the number of nodes, w the width of the widest level and h the height. The output has one value per level, so it takes O(h) space as well. For a balanced tree w is about n/2 while h is about log n, so DFS uses less memory; for a chain w is 1 while h is n, so BFS is the safer one (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)).

## 8. Edge Cases

- **Empty tree** — \`[]\`.
- **A single node** — \`[1]\`.
- **Only right children** (\`[1, null, 3]\`) — every node is visible: \`[1, 3]\`.
- **Left side deeper than the right side** (\`[1, 2, 3, 4, null, null, null, 5]\`) — left-subtree nodes become visible on the deep levels: \`[1, 3, 4, 5]\`.
- **A right child that is hidden** (\`[1, 2, 3, null, 5, null, 4]\`) — 5 is a right child but 4 is further right on the same level, so 5 is not in the view.
- **Lucky shapes** — on \`[1, 2, 3, null, 5, null, 4]\` the right-pointer shortcut happens to give the right answer \`[1, 3, 4]\`; a single passing test proves nothing, which is why example 2 checks 200 trees.

## Common Pitfalls

- **Following only right pointers.** It ignores deeper levels on the left; wrong on 177 of 200 random trees in example 2.
- **Visiting left before right in the DFS.** Then the first node at each depth is the leftmost one, and you have built the left view.
- **\`i < queue.size()\` as the loop bound.** The size changes while children are offered; read it once.
- **Comparing two \`List<Integer>\` with \`==\`.** It compares references; use \`equals\`.
- **Offering \`null\` children to an \`ArrayDeque\`.** It throws \`NullPointerException\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">The right-side view is the rightmost node of each level, top to bottom — a question about levels, not about right children.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. BFS:</strong> <span style="color:#f0e2c8;">Level-order traversal with a size snapshot; the last node removed in each round is the visible one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. DFS:</strong> <span style="color:#f0e2c8;">Visit node, right, left with a depth counter; record a node when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">depth == len(view)</code>, the first time that depth is reached.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Both O(n) time; BFS uses O(w) for the queue, DFS O(h) for the stack.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int size = queue.size()</code> read once; compare lists with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just follow the right children?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A level can have its rightmost node in the left subtree when the right side is shorter. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 3, 4]</code> the answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 3, 4]</code>, but the right pointers stop at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 3]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the left-side view?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mirror it: BFS keeps the first node of each round, or DFS visits left before right and keeps the first node at each new depth.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the DFS rule depth == len(view) work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The view holds exactly one value per depth already seen, so its length is the first unseen depth. Visiting right first guarantees the first node reached at a depth is the rightmost one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which version would you use for a very deep tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS, because it uses an explicit queue instead of recursion; the DFS can overflow the call stack on a long chain.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you get the bottom view?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That needs horizontal positions, not levels: give the root column 0, left child column − 1, right child column + 1, and keep the last node seen per column in a BFS.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Right-side view** | The rightmost node value on each level, top to bottom |
| **Level-size snapshot** | Queue length read once per round so the loop handles exactly one level |
| **Reverse pre-order (node, right, left)** | Pre-order with the children swapped; reaches each level's rightmost node first |
| **First-visit-per-depth rule** | Record a node only when its depth equals the number of values recorded so far |

---
**Conclusion:** The right-side view is about levels, not right children: it is the last node of each level. In Java, an \`ArrayDeque\` level-order loop with a \`size\` snapshot that keeps the node at \`i == size - 1\` solves it in O(n) time and O(w) space, and a node-right-left DFS that adds when \`depth == view.size()\` solves it in O(n) time and O(h) stack. Both agreed on all 200 random trees in our run, while the right-pointer shortcut was wrong on 177 of them.`,
        examples: [
          {
            label: "BFS: last node of every level (6 trees)",
            code: `import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.ArrayList;

public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    // Build a tree from a level-order array; null marks a missing child.
    static Node build(Integer[] values) {
        if (values.length == 0 || values[0] == null) return null;
        Node root = new Node(values[0]);
        Deque<Node> queue = new ArrayDeque<>();
        queue.offer(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            Node node = queue.poll();
            if (i < values.length && values[i] != null) {
                node.left = new Node(values[i]);
                queue.offer(node.left);
            }
            i++;
            if (i < values.length && values[i] != null) {
                node.right = new Node(values[i]);
                queue.offer(node.right);
            }
            i++;
        }
        return root;
    }


    // The last node of every level, top to bottom (BFS).
    static List<Integer> rightSideView(Node root) {
        List<Integer> view = new ArrayList<>();
        if (root == null) return view;
        Deque<Node> queue = new ArrayDeque<>();
        queue.offer(root);
        while (!queue.isEmpty()) {
            int size = queue.size();               // nodes on this level
            for (int i = 0; i < size; i++) {
                Node node = queue.poll();
                if (i == size - 1) view.add(node.val); // rightmost node of this level
                if (node.left != null) queue.offer(node.left);
                if (node.right != null) queue.offer(node.right);
            }
        }
        return view;
    }

    public static void main(String[] args) {
        System.out.println(rightSideView(build(new Integer[]{1, 2, 3, null, 5, null, 4})));     // [1, 3, 4]
        System.out.println(rightSideView(build(new Integer[]{1, 2, 3, 4})));                    // [1, 3, 4]
        System.out.println(rightSideView(build(new Integer[]{1, 2, 3, 4, null, null, null, 5}))); // [1, 3, 4, 5]
        System.out.println(rightSideView(build(new Integer[]{1, null, 3})));                    // [1, 3]
        System.out.println(rightSideView(build(new Integer[]{1})));                             // [1]
        System.out.println(rightSideView(build(new Integer[]{})));                              // []
    }
}`,
          },
          {
            label: "BFS vs DFS, left view, and the right-pointer trap on 200 trees",
            code: `import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.ArrayList;

public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    // Build a tree from a level-order array; null marks a missing child.
    static Node build(Integer[] values) {
        if (values.length == 0 || values[0] == null) return null;
        Node root = new Node(values[0]);
        Deque<Node> queue = new ArrayDeque<>();
        queue.offer(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            Node node = queue.poll();
            if (i < values.length && values[i] != null) {
                node.left = new Node(values[i]);
                queue.offer(node.left);
            }
            i++;
            if (i < values.length && values[i] != null) {
                node.right = new Node(values[i]);
                queue.offer(node.right);
            }
            i++;
        }
        return root;
    }


    // Last (or first) node of each level.
    static List<Integer> viewBfs(Node root, boolean right) {
        List<Integer> view = new ArrayList<>();
        List<Node> level = new ArrayList<>();
        if (root != null) level.add(root);
        while (!level.isEmpty()) {
            view.add(right ? level.get(level.size() - 1).val : level.get(0).val);
            List<Node> next = new ArrayList<>();
            for (Node n : level) {
                if (n.left != null) next.add(n.left);
                if (n.right != null) next.add(n.right);
            }
            level = next;
        }
        return view;
    }

    // Visit right child first; the first node met at a new depth is visible.
    static void viewDfs(Node node, int depth, List<Integer> view) {
        if (node == null) return;
        if (depth == view.size()) view.add(node.val);
        viewDfs(node.right, depth + 1, view);
        viewDfs(node.left, depth + 1, view);
    }

    static List<Integer> viewDfs(Node root) {
        List<Integer> view = new ArrayList<>();
        viewDfs(root, 0, view);
        return view;
    }

    // The classic wrong answer: just walk .right from the root.
    static List<Integer> rightPointersOnly(Node root) {
        List<Integer> out = new ArrayList<>();
        for (Node n = root; n != null; n = n.right) out.add(n.val);
        return out;
    }

    // Plain BST insert, used only to make trees of many shapes.
    static Node insert(Node root, int v) {
        if (root == null) return new Node(v);
        if (v < root.val) root.left = insert(root.left, v);
        else root.right = insert(root.right, v);
        return root;
    }

    public static void main(String[] args) {
        Integer[][] inputs = {{1, 2, 3, null, 5, null, 4}, {1, 2, 3, 4}, {1, 2, 3, 4, null, null, null, 5}};
        for (Integer[] vals : inputs) {
            Node root = build(vals);
            System.out.println("right view " + viewBfs(root, true) + ", DFS " + viewDfs(root)
                + ", left view " + viewBfs(root, false) + ", right pointers only " + rightPointersOnly(root));
        }
        long seed = 7;                      // long: seed * 48271 overflows int
        int agree = 0, wrong = 0;
        for (int t = 0; t < 200; t++) {
            Node root = null;
            for (int k = 0; k < 1 + t % 40; k++) {
                seed = seed * 48271 % 2147483647;
                root = insert(root, (int) (seed % 1000));
            }
            if (viewBfs(root, true).equals(viewDfs(root))) agree++;   // equals, not ==
            if (!rightPointersOnly(root).equals(viewBfs(root, true))) wrong++;
        }
        System.out.println("random trees: BFS and DFS agree on " + agree + " of 200; right pointers only is wrong on " + wrong);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Imagine standing on the right side of a binary tree. Write a C++ function that returns, as a \`std::vector<int>\`, the values of the nodes you can see, ordered from top to bottom."

**What a strong answer should cover:**
- The view is the rightmost node of each level — and it can come from the left subtree when the right side is shorter.
- BFS: level-order traversal with a size snapshot, keeping the last node of each round.
- DFS: visit node, right, left with a depth counter and record a node when depth equals the number of values so far.
- Both are O(n) time; BFS uses O(w) space, DFS O(h).
- C++ details: \`std::queue\` with \`front()\` then \`pop()\`, a \`size_t\` snapshot, and passing the DFS result by reference.
- Why "follow the right pointers" is wrong, with a counterexample like [1, 2, 3, 4].

**Clarifying questions expected:**
- One value per level, top to bottom, and an empty list for an empty tree?

**Code / implementation expected:** Yes — \`std::vector<int> rightSideView(const Node* root)\` with \`std::queue\`, plus the DFS alternative, in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree is; BFS and DFS are explained here.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Imagine a tree-shaped stack of shelves standing in a dark room, each shelf holding one lamp. You walk around to the right-hand side and look straight at it. On every floor of the stack you see exactly one lamp: the one closest to you. Lamps further to the left on the same floor are hidden behind it — but if a floor has only one lamp, way over on the left, you still see that one, because nothing is in front of it.

That is the **right-side view** of a binary tree: for each level, from top to bottom, the value of the rightmost node on that level.

The problem is popular because it has a trap that catches people who think in pictures instead of levels: "just follow the right children from the root". That works on some trees and fails on many others — whenever the left side is deeper than the right side. Our example 2 generated 200 random trees and found the right-pointer shortcut wrong on 177 of them. The real solution is a tiny change to [level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree), and the follow-up (do it with DFS) tests whether you understand *why* it works.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you want values from top to bottom, one per level? | That is the standard output. Some variants want the bottom view or the left view, which change the rule. |
| What should an empty tree return? | An empty list. It is the base case for both solutions. |
| Can levels have gaps, so the rightmost node on a level lives in the left subtree? | Yes in general — and this is exactly why "follow the right pointers" is wrong. Asking shows you see the trap. |
| How deep can the tree be? | A very deep chain favours the BFS version (no recursion). |

## 3. The Core Idea

📌 **Interview term: Right-side view** — the list of the rightmost node's value on each level, from the root's level downwards. Equivalently: the last node of each level in a level-order traversal.

<svg class="iq-diagram" width="100%" viewBox="0 0 520 290" role="img" aria-label="Tree with root 1, children 2 and 3, node 2 has right child 5 and node 3 has right child 4. Seen from the right, the visible nodes are 1, 3 and 4">
  <rect class="d-box-muted" x="160" y="4" width="200" height="28" rx="14"/>
  <text class="d-text" x="260" y="23" text-anchor="middle">Right view [1, 3, 4]</text>
  <path class="d-edge" d="M 230 80 L 50 160"/>
  <path class="d-edge" d="M 230 80 L 320 160"/>
  <path class="d-edge" d="M 50 160 L 140 240"/>
  <path class="d-edge" d="M 320 160 L 410 240"/>
  <circle class="d-box-accent" cx="230" cy="80" r="20"/>
  <text class="d-text" x="230" y="85" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="50" cy="160" r="20"/>
  <text class="d-text" x="50" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="320" cy="160" r="20"/>
  <text class="d-text" x="320" y="165" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="140" cy="240" r="20"/>
  <text class="d-text" x="140" y="245" text-anchor="middle">5</text>
  <circle class="d-box-accent" cx="410" cy="240" r="20"/>
  <text class="d-text" x="410" y="245" text-anchor="middle">4</text>
  <text class="d-sub" x="256" y="66">level 0: 1</text>
  <text class="d-sub" x="346" y="146">level 1: 3</text>
  <text class="d-sub" x="436" y="226">level 2: 4</text>
</svg>

In the first tree, level 1 holds 2 and 3, and 3 is further right, so 2 is hidden. Level 2 holds 5 and 4, and 4 is further right, so 5 is hidden even though it is a right child. The view is \`[1, 3, 4]\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 370" role="img" aria-label="Tree with root 1, children 2 and 3, node 2 has left child 4 and node 4 has left child 5. The right view is 1, 3, 4, 5 because levels 2 and 3 only have nodes on the left side">
  <rect class="d-box-muted" x="248" y="4" width="224" height="28" rx="14"/>
  <text class="d-text" x="360" y="23" text-anchor="middle">Right view [1, 3, 4, 5]</text>
  <path class="d-edge" d="M 420 80 L 330 160"/>
  <path class="d-edge" d="M 420 80 L 510 160"/>
  <path class="d-edge" d="M 330 160 L 240 240"/>
  <path class="d-edge" d="M 240 240 L 150 320"/>
  <circle class="d-box-accent" cx="420" cy="80" r="20"/>
  <text class="d-text" x="420" y="85" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="330" cy="160" r="20"/>
  <text class="d-text" x="330" y="165" text-anchor="middle">2</text>
  <circle class="d-box-accent" cx="510" cy="160" r="20"/>
  <text class="d-text" x="510" y="165" text-anchor="middle">3</text>
  <circle class="d-box-accent" cx="240" cy="240" r="20"/>
  <text class="d-text" x="240" y="245" text-anchor="middle">4</text>
  <circle class="d-box-accent" cx="150" cy="320" r="20"/>
  <text class="d-text" x="150" y="325" text-anchor="middle">5</text>
  <text class="d-sub" x="214" y="226" text-anchor="end">alone on level 2</text>
  <text class="d-sub" x="124" y="306" text-anchor="end">alone on level 3</text>
</svg>

In the second tree the right side stops after node 3. Levels 2 and 3 only have one node each — 4 and 5 — and both live in the **left** subtree. Nothing is in front of them, so they are visible: the view is \`[1, 3, 4, 5]\`. Following right pointers from the root would stop after \`[1, 3]\`.

So the problem is not about right children at all. It is about **levels**, and there are two classic ways to see levels.

## 4. Two Ways to Solve It

### BFS: keep the last node of each level

Run [level-order traversal](/interview-question/how-do-you-do-a-level-order-bfs-traversal-of-a-tree) with a level-size snapshot. Within a round, children are processed left to right, so the **last** node removed in each round is the rightmost one on that level. Append its value and you are done.

📌 **Interview term: Level-size snapshot** — reading the queue's length at the start of a round so the loop processes exactly one level, even though children are added to the same queue.

### DFS: visit right before left, keep the first node at each new depth

Do a pre-order walk that visits the **right** child before the left one, and carry the depth. The first time the walk reaches a depth it has never seen before, the node it is standing on must be the rightmost node of that level — every node further right on that level would have been reached earlier, because the walk always tries the right side first. The test "have I seen this depth?" is just \`depth == len(view)\`: the view holds one value for each depth seen so far.

📌 **Interview term: Reverse pre-order (node, right, left)** — pre-order with the children swapped. It reaches each level's rightmost node before any other node of that level. See the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods).

📌 **Interview term: First-visit-per-depth rule** — record a node only when its depth equals the number of values recorded so far; that is exactly the first node seen at that depth.

Here is the DFS on the second tree, \`[1, 2, 3, 4, null, null, null, 5]\`:

| Step | Node | Depth | len(view) before | Recorded? | view after |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 1 | 0 | 0 | yes | [1] |
| 2 | 3 | 1 | 1 | yes | [1, 3] |
| 3 | 2 | 1 | 2 | no (level 1 already seen) | [1, 3] |
| 4 | 4 | 2 | 2 | yes | [1, 3, 4] |
| 5 | 5 | 3 | 3 | yes | [1, 3, 4, 5] |

Node 3 has no children, so after it the walk backs up and goes left into 2; 2 is skipped, but its subtree reaches depths 2 and 3 for the first time.

**The left-side view** is the mirror: BFS keeps the *first* node of each level, or DFS visits left before right. Example 2 prints both views.

Which to present? Both are O(n). BFS is the more direct reading of "per level" and does not recurse; DFS is shorter and uses O(h) instead of O(w) memory. Lead with one, mention the other — the [difference between BFS and DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs) covers the general trade-off.

## 5. The Code in C++

The BFS version (example 1):

~~~cpp
// The last node of every level, top to bottom (BFS).
std::vector<int> rightSideView(const Node* root) {
    std::vector<int> view;
    if (root == nullptr) return view;
    std::queue<const Node*> q;
    q.push(root);
    while (!q.empty()) {
        size_t size = q.size();                  // nodes on this level
        for (size_t i = 0; i < size; i++) {
            const Node* node = q.front();
            q.pop();
            if (i == size - 1) view.push_back(node->val); // rightmost of this level
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
    }
    return view;
}
~~~

The DFS version (example 2):

~~~cpp
// Visit right child first; the first node met at a new depth is visible.
void viewDfs(const Node* node, size_t depth, std::vector<int>& view) {
    if (node == nullptr) return;
    if (depth == view.size()) view.push_back(node->val);
    viewDfs(node->right, depth + 1, view);
    viewDfs(node->left, depth + 1, view);
}
~~~

**What to point out in this code:**

- \`std::queue\` has no "last element of this round" accessor that helps here, so the loop counts: \`i == size - 1\` is the rightmost node. Read \`front()\` before \`pop()\`, because \`pop()\` returns \`void\`.
- \`size_t size = q.size();\` is taken once; \`i < q.size()\` in the condition would mix levels as children are pushed.
- The DFS takes \`std::vector<int>& view\` by reference so every call appends to the same vector; passing it by value would give every call its own copy and the result would stay empty.
- \`depth == view.size()\` compares two \`size_t\` values, which is why \`depth\` is a \`size_t\` too (no signed/unsigned comparison warning).
- Comparing two views with \`==\` on \`std::vector\` compares their contents, which example 2 uses to count agreements.
- The DFS recurses once per level; on a very deep chain that risks a stack overflow, which in C++ crashes rather than throws.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13 with -std=c++17). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Example 1 runs the BFS version on six trees. Example 2 prints the BFS and DFS right views, the left view and the right-pointer shortcut for three trees, then compares BFS against DFS — and against the shortcut — on 200 trees of different shapes, built by inserting pseudo-random numbers (a MINSTD generator, identical in every language) into a binary search tree.

**Example 1 — the BFS right view on six trees** prints:

~~~text
[1, 3, 4]
[1, 3, 4]
[1, 3, 4, 5]
[1, 3]
[1]
[]
~~~

**Example 2 — BFS vs DFS, left view, and the right-pointer trap** prints:

~~~text
right view [1, 3, 4], DFS [1, 3, 4], left view [1, 2, 5], right pointers only [1, 3, 4]
right view [1, 3, 4], DFS [1, 3, 4], left view [1, 2, 4], right pointers only [1, 3]
right view [1, 3, 4, 5], DFS [1, 3, 4, 5], left view [1, 2, 4, 5], right pointers only [1, 3]
random trees: BFS and DFS agree on 200 of 200; right pointers only is wrong on 177
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| BFS, last node per level | O(n) | O(w) | every node is enqueued and dequeued once; the queue holds about one level |
| DFS, right child first | O(n) | O(h) | every node is visited once; the stack holds one root-to-node path |
| Follow right pointers only | O(h) | O(1) | fast, but wrong whenever a level's rightmost node is in a left subtree |

n is the number of nodes, w the width of the widest level and h the height. The output has one value per level, so it takes O(h) space as well. For a balanced tree w is about n/2 while h is about log n, so DFS uses less memory; for a chain w is 1 while h is n, so BFS is the safer one (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)).

## 8. Edge Cases

- **Empty tree** — \`[]\`.
- **A single node** — \`[1]\`.
- **Only right children** (\`[1, null, 3]\`) — every node is visible: \`[1, 3]\`.
- **Left side deeper than the right side** (\`[1, 2, 3, 4, null, null, null, 5]\`) — left-subtree nodes become visible on the deep levels: \`[1, 3, 4, 5]\`.
- **A right child that is hidden** (\`[1, 2, 3, null, 5, null, 4]\`) — 5 is a right child but 4 is further right on the same level, so 5 is not in the view.
- **Lucky shapes** — on \`[1, 2, 3, null, 5, null, 4]\` the right-pointer shortcut happens to give the right answer \`[1, 3, 4]\`; a single passing test proves nothing, which is why example 2 checks 200 trees.

## Common Pitfalls

- **Following only right pointers.** It ignores deeper levels on the left; wrong on 177 of 200 random trees in example 2.
- **Visiting left before right in the DFS.** Then the first node at each depth is the leftmost one, and you have built the left view.
- **Passing the view vector by value to the DFS.** Each call appends to its own copy and the caller sees nothing; pass \`std::vector<int>&\`.
- **\`i < q.size()\` as the loop bound** while pushing children — it mixes levels.
- **Mixing \`int\` depth with \`size_t\` sizes.** It compiles, but a negative int compared with a \`size_t\` turns into a huge number; keep both \`size_t\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">The right-side view is the rightmost node of each level, top to bottom — a question about levels, not about right children.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. BFS:</strong> <span style="color:#f0e2c8;">Level-order traversal with a size snapshot; the last node removed in each round is the visible one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. DFS:</strong> <span style="color:#f0e2c8;">Visit node, right, left with a depth counter; record a node when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">depth == len(view)</code>, the first time that depth is reached.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">Both O(n) time; BFS uses O(w) for the queue, DFS O(h) for the stack.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue&lt;const Node*&gt;</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">front()</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>, and pass the DFS result as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt;&amp;</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just follow the right children?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A level can have its rightmost node in the left subtree when the right side is shorter. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 3, 4]</code> the answer is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 3, 4]</code>, but the right pointers stop at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 3]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the left-side view?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mirror it: BFS keeps the first node of each round, or DFS visits left before right and keeps the first node at each new depth.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the DFS rule depth == len(view) work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The view holds exactly one value per depth already seen, so its length is the first unseen depth. Visiting right first guarantees the first node reached at a depth is the rightmost one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which version would you use for a very deep tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BFS, because it uses an explicit queue instead of recursion; the DFS can overflow the call stack on a long chain.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you get the bottom view?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That needs horizontal positions, not levels: give the root column 0, left child column − 1, right child column + 1, and keep the last node seen per column in a BFS.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Right-side view** | The rightmost node value on each level, top to bottom |
| **Level-size snapshot** | Queue length read once per round so the loop handles exactly one level |
| **Reverse pre-order (node, right, left)** | Pre-order with the children swapped; reaches each level's rightmost node first |
| **First-visit-per-depth rule** | Record a node only when its depth equals the number of values recorded so far |

---
**Conclusion:** The right-side view is about levels, not right children: it is the last node of each level. In C++, a \`std::queue\` level-order loop with a \`size\` snapshot that keeps the node at \`i == size - 1\` solves it in O(n) time and O(w) space, and a node-right-left DFS that pushes when \`depth == view.size()\` (with the vector passed by reference) solves it in O(n) time and O(h) stack. Both agreed on all 200 random trees in our run, while the right-pointer shortcut was wrong on 177 of them.`,
        examples: [
          {
            label: "BFS: last node of every level (6 trees)",
            code: `#include <algorithm>
#include <climits>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <queue>
#include <vector>

struct Node {
    int val;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int v) : val(v) {}
};

const int N = INT_MIN;                       // marks a missing child in the input
std::vector<std::unique_ptr<Node>> pool;     // owns every node, frees them at exit

Node* make(int v) {
    pool.push_back(std::make_unique<Node>(v));
    return pool.back().get();
}

// Build a tree from a level-order vector; N marks a missing child.
Node* build(const std::vector<int>& values) {
    if (values.empty() || values[0] == N) return nullptr;
    Node* root = make(values[0]);
    std::queue<Node*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        Node* node = q.front();
        q.pop();
        if (i < values.size() && values[i] != N) {
            node->left = make(values[i]);
            q.push(node->left);
        }
        i++;
        if (i < values.size() && values[i] != N) {
            node->right = make(values[i]);
            q.push(node->right);
        }
        i++;
    }
    return root;
}
// The last node of every level, top to bottom (BFS).
std::vector<int> rightSideView(const Node* root) {
    std::vector<int> view;
    if (root == nullptr) return view;
    std::queue<const Node*> q;
    q.push(root);
    while (!q.empty()) {
        size_t size = q.size();                  // nodes on this level
        for (size_t i = 0; i < size; i++) {
            const Node* node = q.front();
            q.pop();
            if (i == size - 1) view.push_back(node->val); // rightmost of this level
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
    }
    return view;
}

void print(const std::vector<int>& v) {
    std::cout << "[";
    for (size_t i = 0; i < v.size(); i++) std::cout << (i ? ", " : "") << v[i];
    std::cout << "]\\n";
}

int main() {
    print(rightSideView(build({1, 2, 3, N, 5, N, 4})));     // [1, 3, 4]
    print(rightSideView(build({1, 2, 3, 4})));              // [1, 3, 4]
    print(rightSideView(build({1, 2, 3, 4, N, N, N, 5})));  // [1, 3, 4, 5]
    print(rightSideView(build({1, N, 3})));                 // [1, 3]
    print(rightSideView(build({1})));                       // [1]
    print(rightSideView(build({})));                        // []
}`,
          },
          {
            label: "BFS vs DFS, left view, and the right-pointer trap on 200 trees",
            code: `#include <algorithm>
#include <climits>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <queue>
#include <string>
#include <vector>

struct Node {
    int val;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int v) : val(v) {}
};

const int N = INT_MIN;                       // marks a missing child in the input
std::vector<std::unique_ptr<Node>> pool;     // owns every node, frees them at exit

Node* make(int v) {
    pool.push_back(std::make_unique<Node>(v));
    return pool.back().get();
}

// Build a tree from a level-order vector; N marks a missing child.
Node* build(const std::vector<int>& values) {
    if (values.empty() || values[0] == N) return nullptr;
    Node* root = make(values[0]);
    std::queue<Node*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        Node* node = q.front();
        q.pop();
        if (i < values.size() && values[i] != N) {
            node->left = make(values[i]);
            q.push(node->left);
        }
        i++;
        if (i < values.size() && values[i] != N) {
            node->right = make(values[i]);
            q.push(node->right);
        }
        i++;
    }
    return root;
}
// Last (or first) node of each level.
std::vector<int> viewBfs(const Node* root, bool right = true) {
    std::vector<int> view;
    std::vector<const Node*> level;
    if (root) level.push_back(root);
    while (!level.empty()) {
        view.push_back(right ? level.back()->val : level.front()->val);
        std::vector<const Node*> next;
        for (const Node* n : level) {
            if (n->left) next.push_back(n->left);
            if (n->right) next.push_back(n->right);
        }
        level.swap(next);
    }
    return view;
}

// Visit right child first; the first node met at a new depth is visible.
void viewDfs(const Node* node, size_t depth, std::vector<int>& view) {
    if (node == nullptr) return;
    if (depth == view.size()) view.push_back(node->val);
    viewDfs(node->right, depth + 1, view);
    viewDfs(node->left, depth + 1, view);
}

std::vector<int> viewDfs(const Node* root) {
    std::vector<int> view;
    viewDfs(root, 0, view);
    return view;
}

// The classic wrong answer: just walk ->right from the root.
std::vector<int> rightPointersOnly(const Node* root) {
    std::vector<int> out;
    for (const Node* n = root; n; n = n->right) out.push_back(n->val);
    return out;
}

// Plain BST insert, used only to make trees of many shapes.
Node* insert(Node* root, int v) {
    if (root == nullptr) return make(v);
    if (v < root->val) root->left = insert(root->left, v);
    else root->right = insert(root->right, v);
    return root;
}

std::string fmt(const std::vector<int>& v) {
    std::string s = "[";
    for (size_t i = 0; i < v.size(); i++) s += (i ? ", " : "") + std::to_string(v[i]);
    return s + "]";
}

int main() {
    std::vector<std::vector<int>> inputs = {{1, 2, 3, N, 5, N, 4}, {1, 2, 3, 4}, {1, 2, 3, 4, N, N, N, 5}};
    for (const auto& vals : inputs) {
        const Node* root = build(vals);
        std::cout << "right view " << fmt(viewBfs(root)) << ", DFS " << fmt(viewDfs(root))
                  << ", left view " << fmt(viewBfs(root, false))
                  << ", right pointers only " << fmt(rightPointersOnly(root)) << "\\n";
    }
    long long seed = 7;                  // 64-bit: seed * 48271 overflows a 32-bit int
    int agree = 0, wrong = 0;
    for (int t = 0; t < 200; t++) {
        Node* root = nullptr;
        for (int k = 0; k < 1 + t % 40; k++) {
            seed = seed * 48271 % 2147483647;
            root = insert(root, static_cast<int>(seed % 1000));
        }
        if (viewBfs(root) == viewDfs(root)) agree++;           // vector == compares contents
        if (rightPointersOnly(root) != viewBfs(root)) wrong++;
    }
    std::cout << "random trees: BFS and DFS agree on " << agree << " of 200; right pointers only is wrong on " << wrong << "\\n";
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════
  {
    title: "How do you find the lowest common ancestor in a binary tree?",
    difficulty: "medium",
    seoDescription: "Lowest common ancestor in a binary tree via one post-order recursion, plus parent maps and missing nodes. Python, JavaScript, Java and C++, verified.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given the root of a binary tree — not necessarily a binary search tree — and two nodes p and q that are in the tree, write a Python function that returns their lowest common ancestor: the deepest node that has both p and q as descendants, where a node counts as a descendant of itself."

**What a strong answer should cover:**
- The definition, including that p can be the answer when it is an ancestor of q.
- The recursive post-order search: return the node if it is null, p or q; if both children return non-null, the current node is the LCA.
- O(n) time and O(h) space, and why the early return is safe only when both nodes exist.
- How to handle a possibly missing node (count matches, no early return) and the parent-map alternative.
- Python details: compare nodes with \`is\` (identity), nodes hash by identity so they work as dict keys, and the 1000-frame recursion limit on deep trees.
- The BST shortcut and why it does not apply to a general binary tree.

**Clarifying questions expected:**
- Is it a BST or a general binary tree?
- Are both nodes guaranteed to be in the tree, and are they given as nodes or as values?

**Code / implementation expected:** Yes — \`lca(root, p, q)\` returning a node, in Python 3.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree and a recursive function are; everything else is explained.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two cousins at a family reunion are arguing about how they are related. Someone pulls out the family tree. You put a finger on each cousin and move both fingers upward, generation by generation, until they land on the same person. That person — the first shared one, the youngest relative they both descend from — is their **lowest common ancestor**. Their great-great-grandmother is a common ancestor too, but she is higher up and less informative.

In a binary tree the question is the same: given two nodes \`p\` and \`q\`, find the deepest node that has both of them in its subtree. One twist matters a lot: **a node counts as its own descendant**, so if \`p\` is an ancestor of \`q\`, the answer is \`p\` itself.

📌 **Interview term: Lowest common ancestor (LCA)** — the deepest node that has both \`p\` and \`q\` as descendants, where every node is a descendant of itself.

LCA shows up everywhere once you notice it: the distance between two nodes is depth(p) + depth(q) − 2 · depth(LCA); version-control systems find the merge base of two branches with the same idea on a commit graph; and file paths compare by finding their shared parent folder. In interviews it is a favourite because the recursive solution is only a few lines long, yet explaining **why** it works — and when it silently gives a wrong answer — separates candidates sharply.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is this a binary search tree or any binary tree? | In a [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) you can steer by value in O(h) without searching both sides; this page solves the general case. |
| Are \`p\` and \`q\` guaranteed to be in the tree? | The classic short solution **assumes yes**. If one may be missing, it returns a wrong non-null answer (example 2), and you need the counting version. |
| Are \`p\` and \`q\` given as node references or as values? Are values unique? | With references you compare identity. With values you must find the nodes first, and duplicate values make the question ambiguous. |
| Do nodes have parent pointers? | With parent pointers, the problem becomes "first common node of two upward paths", like intersecting two linked lists. |
| One query or many? | Many queries on the same tree justify preprocessing (binary lifting, Euler tour) for faster answers per query. |

## 3. The Core Idea

<svg class="iq-diagram" width="100%" viewBox="0 0 880 370" role="img" aria-label="Tree with root 3. Nodes 7 and 4 are the two children of node 2, so their lowest common ancestor is 2">
  <rect class="d-box-muted" x="368" y="4" width="144" height="28" rx="14"/>
  <text class="d-text" x="440" y="23" text-anchor="middle">LCA(7, 4) = 2</text>
  <path class="d-edge" d="M 500 80 L 140 160"/>
  <path class="d-edge" d="M 500 80 L 680 160"/>
  <path class="d-edge" d="M 140 160 L 50 240"/>
  <path class="d-edge" d="M 140 160 L 320 240"/>
  <path class="d-edge" d="M 680 160 L 590 240"/>
  <path class="d-edge" d="M 680 160 L 770 240"/>
  <path class="d-edge-accent" d="M 320 240 L 230 320"/>
  <path class="d-edge-accent" d="M 320 240 L 410 320"/>
  <circle class="d-box" cx="500" cy="80" r="20"/>
  <text class="d-text" x="500" y="85" text-anchor="middle">3</text>
  <circle class="d-box" cx="140" cy="160" r="20"/>
  <text class="d-text" x="140" y="165" text-anchor="middle">5</text>
  <circle class="d-box" cx="680" cy="160" r="20"/>
  <text class="d-text" x="680" y="165" text-anchor="middle">1</text>
  <circle class="d-box" cx="50" cy="240" r="20"/>
  <text class="d-text" x="50" y="245" text-anchor="middle">6</text>
  <circle class="d-box-accent" cx="320" cy="240" r="20"/>
  <text class="d-text" x="320" y="245" text-anchor="middle">2</text>
  <circle class="d-box" cx="590" cy="240" r="20"/>
  <text class="d-text" x="590" y="245" text-anchor="middle">0</text>
  <circle class="d-box" cx="770" cy="240" r="20"/>
  <text class="d-text" x="770" y="245" text-anchor="middle">8</text>
  <circle class="d-box-accent" cx="230" cy="320" r="20"/>
  <text class="d-text" x="230" y="325" text-anchor="middle">7</text>
  <circle class="d-box-accent" cx="410" cy="320" r="20"/>
  <text class="d-text" x="410" y="325" text-anchor="middle">4</text>
  <text class="d-sub" x="346" y="226">LCA(7, 4)</text>
  <text class="d-sub" x="204" y="306" text-anchor="end">p</text>
  <text class="d-sub" x="436" y="306">q</text>
</svg>

Look at where \`p\` and \`q\` sit relative to each node. For any node X there are only three possibilities:

1. \`p\` and \`q\` are in **different** subtrees of X (one left, one right) — then X is the LCA. No deeper node can contain both.
2. Both are in the **same** subtree of X — then the LCA is deeper, inside that subtree.
3. X **is** \`p\` or \`q\` — then X is the LCA if the other one is below it, which is guaranteed when both are in the tree.

The recursive solution turns those cases into return values. Each call answers: "what did I find in my subtree?"

- \`null\` — neither \`p\` nor \`q\` is here;
- \`p\` or \`q\` — I found one of them (and maybe the other below it);
- some other node — both are here, and this is their LCA, already computed deeper down.

📌 **Interview term: Post-order combination** — each node first collects the results of its left and right recursive calls, then combines them. Here: if both sides are non-null, this node is the answer; otherwise pass up whichever side is non-null. See the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods).

<svg class="iq-diagram" width="100%" viewBox="0 0 880 370" role="img" aria-label="Return values of the recursive search for nodes 7 and 8. Node 7 and node 8 return themselves, empty branches return null, and the root 3 receives a non-null result from both sides so it is the answer">
  <rect class="d-box-muted" x="336" y="4" width="208" height="28" rx="14"/>
  <text class="d-text" x="440" y="23" text-anchor="middle">Searching for 7 and 8</text>
  <path class="d-edge" d="M 500 80 L 140 160"/>
  <path class="d-edge" d="M 500 80 L 680 160"/>
  <path class="d-edge" d="M 140 160 L 50 240"/>
  <path class="d-edge" d="M 140 160 L 320 240"/>
  <path class="d-edge" d="M 680 160 L 590 240"/>
  <path class="d-edge" d="M 680 160 L 770 240"/>
  <path class="d-edge" d="M 320 240 L 230 320"/>
  <path class="d-edge" d="M 320 240 L 410 320"/>
  <circle class="d-box-accent" cx="500" cy="80" r="20"/>
  <text class="d-text" x="500" y="85" text-anchor="middle">3</text>
  <circle class="d-box" cx="140" cy="160" r="20"/>
  <text class="d-text" x="140" y="165" text-anchor="middle">5</text>
  <circle class="d-box" cx="680" cy="160" r="20"/>
  <text class="d-text" x="680" y="165" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="50" cy="240" r="20"/>
  <text class="d-text" x="50" y="245" text-anchor="middle">6</text>
  <circle class="d-box" cx="320" cy="240" r="20"/>
  <text class="d-text" x="320" y="245" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="590" cy="240" r="20"/>
  <text class="d-text" x="590" y="245" text-anchor="middle">0</text>
  <circle class="d-box-accent" cx="770" cy="240" r="20"/>
  <text class="d-text" x="770" y="245" text-anchor="middle">8</text>
  <circle class="d-box-accent" cx="230" cy="320" r="20"/>
  <text class="d-text" x="230" y="325" text-anchor="middle">7</text>
  <circle class="d-box-muted" cx="410" cy="320" r="20"/>
  <text class="d-text" x="410" y="325" text-anchor="middle">4</text>
  <text class="d-sub" x="526" y="66">both sides: 3</text>
  <text class="d-sub" x="114" y="146" text-anchor="end">returns 7</text>
  <text class="d-sub" x="706" y="146">returns 8</text>
  <text class="d-sub" x="24" y="226" text-anchor="end">null</text>
  <text class="d-sub" x="346" y="226">returns 7</text>
  <text class="d-sub" x="564" y="226" text-anchor="end">null</text>
  <text class="d-sub" x="796" y="226">returns 8</text>
  <text class="d-sub" x="204" y="306" text-anchor="end">returns 7</text>
  <text class="d-sub" x="436" y="306">null</text>
</svg>

Searching for 7 and 8: node 7 returns itself, which bubbles up through 2 and 5 because their other side is null. Node 8 returns itself up through 1. The root receives a non-null value from **both** sides, so it returns itself — 3 is the answer. Nodes 6, 4 and 0 contribute nothing.

📌 **Interview term: Early return on a match** — when the current node is \`p\` or \`q\`, the search returns it immediately without exploring its subtree. That is safe only because both nodes are known to exist: if the other one is below, this node is the LCA anyway; if it is elsewhere, another branch will report it.

## 4. Approaches

### Recursive search (the standard answer)

~~~text
lca(node):
    if node is empty or node is p or node is q: return node
    left  = lca(node.left)
    right = lca(node.right)
    if left and right are both non-empty: return node
    return whichever of left / right is non-empty (or empty)
~~~

Each node is visited at most once, so it is O(n) time and O(h) stack.

### Parent pointers + ancestor set

If you cannot reason about the recursion under pressure, there is a very concrete alternative: walk the tree once and record every node's **parent** in a hash map. Then climb from \`p\` to the root, putting every node into a set. Finally climb from \`q\`; the first node you meet that is in the set is the LCA. It is O(n) time and O(n) extra memory, and it is easy to adapt when the tree already stores parent pointers. Example 2 checks that both approaches agree on all 81 (p, q) pairs of the 9-node tree.

📌 **Interview term: Parent map** — a hash map from each node to its parent, built with one traversal. It turns "go up" into an O(1) lookup in a tree that only has child pointers. See [how a hash table works](/interview-question/how-does-a-hash-table-work).

### When one node may be missing

The standard version returns \`p\` as soon as it sees \`p\`, so if \`q\` is not in the tree at all it still answers \`p\` — a confident wrong answer. Example 2 shows it: asked for the LCA of 5 and a node 99 that is not in the tree, the naive version prints 5. The safe version visits the **whole** tree (no early return), counts how many of \`p\` and \`q\` it actually met, and returns a result only if the count is 2.

📌 **Interview term: Precondition** — an assumption the algorithm relies on (here: both nodes exist). State it out loud, or remove it with extra work.

### The binary search tree shortcut

In a BST, values tell you where to go: if both values are smaller than the current node, go left; if both are larger, go right; otherwise the current node splits them and is the LCA. That is O(h) time and O(1) space — but it is wrong on a general binary tree, where values carry no ordering.

## 5. The Code in Python

~~~python
def lca(root, p, q):
    """Lowest common ancestor of nodes p and q; both must be in the tree."""
    if root is None or root is p or root is q:
        return root                    # found p or q (or ran off the tree)
    left = lca(root.left, p, q)
    right = lca(root.right, p, q)
    if left is not None and right is not None:
        return root                    # p on one side, q on the other
    return left if left is not None else right
~~~

The parent-map version (example 2):

~~~python
def lca_parents(root, p, q):
    """Map every node to its parent, collect p's ancestors, climb from q."""
    parent = {root: None}               # Node objects hash by identity
    stack = [root]
    while stack:
        node = stack.pop()
        for child in (node.left, node.right):
            if child is not None:
                parent[child] = node
                stack.append(child)
    ancestors = set()
    while p is not None:
        ancestors.add(p)
        p = parent[p]
    while q not in ancestors:
        q = parent[q]
    return q
~~~

**What to point out in this code:**

- **\`is\`, not \`==\`.** \`root is p\` asks "is this the very same object?", which is what node identity means. \`==\` would call \`__eq__\`, which for a plain class falls back to identity anyway, but breaks if someone defines value equality on nodes.
- **Nodes as dict keys.** A plain class hashes by identity, so \`parent = {root: None}\` works out of the box. If the class defines \`__eq__\` without \`__hash__\`, Python sets \`__hash__\` to \`None\` and the dict raises \`TypeError: unhashable type\` (our run printed exactly that) — another reason not to give nodes value equality.
- The example's \`find(node.left, val) or find(node.right, val)\` relies on nodes being truthy and \`None\` being falsy, which holds for a plain class.
- \`set()\` gives O(1) average membership tests for the ancestor climb.
- The recursive version uses one frame per level; with Python's default recursion limit of 1000 (our run), a chain-shaped tree deeper than about a thousand nodes needs the iterative parent-map version, which uses an explicit list as a stack.

📌 **Interview term: Identity vs. equality** — identity means "the same object in memory" (\`is\`); equality means "equal values" (\`==\`). LCA is about identity: two different nodes can hold the same value.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Both examples use the tree \`[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4]\` from the diagrams. Example 1 asks six LCA questions, including one where p is an ancestor of q and one where p and q are the same node. Example 2 checks the parent-map version against the recursive one on all 81 ordered pairs of nodes, then shows the missing-node trap and the safe counting version.

**Example 1 — six LCA queries** prints:

~~~text
3
5
5
3
2
0
~~~

**Example 2 — parent map cross-check and the missing-node trap** prints:

~~~text
recursive and parent-map agree on 81 of 81 pairs
lca(5, 99) naive: 5
lca(5, 99) safe:  none
lca(6, 4) safe:   5
lca(5, 4) safe:   5
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive search | O(n) | O(h) | each node is visited at most once; one stack frame per level |
| Parent map + ancestor set | O(n) | O(n) | one walk builds the map; the climbs are O(h) each |
| Safe (counting) version | O(n) | O(h) | always visits every node, but still once each |
| BST shortcut (BST only) | O(h) | O(1) | one root-to-node walk steered by value |

n is the number of nodes and h the height: O(log n) when balanced, O(n) for a chain (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)). If the same tree gets many LCA queries, preprocessing such as binary lifting (each node stores its 2^k-th ancestor) brings each query down to O(log n); for a single query, the O(n) recursive search is the expected answer.

## 8. Edge Cases

- **p is an ancestor of q** — the answer is p (\`lca(5, 4) = 5\` in example 1).
- **p and q are the same node** — the answer is that node (\`lca(0, 0) = 0\`).
- **One of them is the root** — the root.
- **p and q are siblings** — their parent (\`lca(7, 4) = 2\`).
- **A node is not in the tree** — the standard version is wrong (it returns 5 for 5 and 99); use the counting version or verify both nodes first.
- **Duplicate values** — if the question gives values instead of nodes, duplicates make "the node with value 5" ambiguous; ask, or work with node references.

## Common Pitfalls

- **Assuming both nodes exist without saying so.** The short version returns a non-null wrong answer when one is missing.
- **Using the BST shortcut on a general binary tree.** Values carry no order there; the walk goes the wrong way.
- **Comparing values instead of nodes.** \`root.val == p.val\` breaks as soon as two nodes share a value; use \`root is p\`.
- **Giving the node class \`__eq__\` without \`__hash__\`.** Nodes become unhashable and the parent dict raises \`TypeError\`.
- **Recursion depth on skewed trees.** The default limit is 1000 frames; use the iterative parent-map version for very deep trees.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">The LCA of p and q is the deepest node with both in its subtree; a node counts as its own descendant.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursion:</strong> <span style="color:#f0e2c8;">Return the node if it is null, p or q; otherwise recurse left and right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Combine:</strong> <span style="color:#f0e2c8;">If both sides return non-null, this node is the LCA; otherwise pass up the non-null side.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time and O(h) stack; it assumes both nodes are in the tree.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Compare nodes with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code>, and nodes hash by identity, so a plain class works as a dict key for the parent map.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if p or q might not be in the tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Visit the whole tree without the early return, count how many of p and q you actually met, and return the result only if the count is 2. Otherwise return null.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does it change for a binary search tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Steer by value: both smaller, go left; both larger, go right; otherwise the current node is the LCA. O(h) time, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if nodes have parent pointers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Climb from p putting ancestors in a set, then climb from q until you hit the set. Or measure both depths, lift the deeper one, and step both up together for O(1) extra space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you answer many LCA queries on the same tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Preprocess once: binary lifting stores each node's 2^k-th ancestor in O(n log n), then each query takes O(log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the distance between two nodes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">depth(p) + depth(q) − 2 · depth(LCA). One more walk computes the depths, so it stays O(n).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lowest common ancestor (LCA)** | Deepest node with both p and q in its subtree (a node is its own descendant) |
| **Post-order combination** | Collect the left and right results first, then combine them at the node |
| **Early return on a match** | Stop exploring below a node that is p or q; safe when both exist |
| **Parent map** | Hash map from each node to its parent, built in one traversal |
| **Precondition** | An assumption the algorithm relies on, such as both nodes being present |
| **Identity vs. equality** | Same object vs. equal values; LCA compares identity |

Related: the same "combine the two child results at the node" pattern drives the [diameter of a binary tree](/interview-question/how-do-you-compute-the-diameter-of-a-binary-tree) and the [balanced-tree check](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced).

---
**Conclusion:** The lowest common ancestor falls out of one post-order rule: a call returns the node if it is \`None\`, \`p\` or \`q\`; otherwise it asks both children, and if both report something, the current node is the LCA. In Python that is a ten-line function using \`is\` for identity, O(n) time and O(h) stack. Know its precondition — both nodes must exist, or it returns a confident wrong answer (5 for 5 and 99 in our run) — the counting fix, the parent-map alternative with nodes as dict keys, and the O(h) shortcut that only works on a BST.`,
        examples: [
          {
            label: "Recursive LCA: six queries on one tree",
            code: `from collections import deque


class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def build(values):
    """Build a tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = Node(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = Node(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = Node(values[i])
            queue.append(node.right)
        i += 1
    return root




def find(node, val):
    """Return the node holding val (values are unique here), or None."""
    if node is None or node.val == val:
        return node
    return find(node.left, val) or find(node.right, val)


def lca(root, p, q):
    """Lowest common ancestor of nodes p and q; both must be in the tree."""
    if root is None or root is p or root is q:
        return root                    # found p or q (or ran off the tree)
    left = lca(root.left, p, q)
    right = lca(root.right, p, q)
    if left is not None and right is not None:
        return root                    # p on one side, q on the other
    return left if left is not None else right


root = build([3, 5, 1, 6, 2, 0, 8, None, None, 7, 4])


def ask(a, b):
    return lca(root, find(root, a), find(root, b)).val


print(ask(5, 1))  # 3
print(ask(5, 4))  # 5
print(ask(6, 4))  # 5
print(ask(7, 8))  # 3
print(ask(7, 4))  # 2
print(ask(0, 0))  # 0`,
          },
          {
            label: "Parent map cross-check and the missing-node trap",
            code: `from collections import deque


class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None


def build(values):
    """Build a tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = Node(values[0])
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        if i < len(values) and values[i] is not None:
            node.left = Node(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = Node(values[i])
            queue.append(node.right)
        i += 1
    return root




def lca(root, p, q):
    if root is None or root is p or root is q:
        return root
    left, right = lca(root.left, p, q), lca(root.right, p, q)
    if left is not None and right is not None:
        return root
    return left if left is not None else right


def lca_parents(root, p, q):
    """Map every node to its parent, collect p's ancestors, climb from q."""
    parent = {root: None}               # Node objects hash by identity
    stack = [root]
    while stack:
        node = stack.pop()
        for child in (node.left, node.right):
            if child is not None:
                parent[child] = node
                stack.append(child)
    ancestors = set()
    while p is not None:
        ancestors.add(p)
        p = parent[p]
    while q not in ancestors:
        q = parent[q]
    return q


def lca_safe(root, p, q):
    """Like lca, but returns None unless BOTH p and q are really in the tree."""
    found = [0]

    def go(node):
        if node is None:
            return None
        left, right = go(node.left), go(node.right)   # no early return: visit all
        if node is p or node is q:
            found[0] += 1
            return node
        if left is not None and right is not None:
            return node
        return left if left is not None else right

    answer = go(root)
    return answer if found[0] == 2 else None


def all_nodes(node, out):
    if node is not None:
        out.append(node)
        all_nodes(node.left, out)
        all_nodes(node.right, out)
    return out


root = build([3, 5, 1, 6, 2, 0, 8, None, None, 7, 4])
nodes = all_nodes(root, [])
same = sum(1 for a in nodes for b in nodes if lca(root, a, b) is lca_parents(root, a, b))
print("recursive and parent-map agree on " + str(same) + " of " + str(len(nodes) ** 2) + " pairs")

by_val = {n.val: n for n in nodes}
stranger = Node(99)                      # never inserted into the tree
naive = lca(root, by_val[5], stranger)
safe = lca_safe(root, by_val[5], stranger)
print("lca(5, 99) naive: " + (str(naive.val) if naive else "none"))
print("lca(5, 99) safe:  " + (str(safe.val) if safe else "none"))
print("lca(6, 4) safe:   " + str(lca_safe(root, by_val[6], by_val[4]).val))
print("lca(5, 4) safe:   " + str(lca_safe(root, by_val[5], by_val[4]).val))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given the root of a binary tree — not necessarily a binary search tree — and two nodes p and q that are in the tree, write a JavaScript function that returns their lowest common ancestor: the deepest node that has both p and q as descendants, where a node counts as a descendant of itself."

**What a strong answer should cover:**
- The definition, including that p can be the answer when it is an ancestor of q.
- The recursive post-order search: return the node if it is null, p or q; if both children return non-null, the current node is the LCA.
- O(n) time and O(h) space, and why the early return is safe only when both nodes exist.
- How to handle a possibly missing node (count matches, no early return) and the parent-map alternative.
- JavaScript details: \`===\` compares object references, and a parent map must be a \`Map\` because plain-object keys become strings.
- The BST shortcut and why it does not apply to a general binary tree.

**Clarifying questions expected:**
- Is it a BST or a general binary tree?
- Are both nodes guaranteed to be in the tree, and are they given as nodes or as values?

**Code / implementation expected:** Yes — \`lca(root, p, q)\` returning a node or \`null\`, in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree and a recursive function are; everything else is explained.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two cousins at a family reunion are arguing about how they are related. Someone pulls out the family tree. You put a finger on each cousin and move both fingers upward, generation by generation, until they land on the same person. That person — the first shared one, the youngest relative they both descend from — is their **lowest common ancestor**. Their great-great-grandmother is a common ancestor too, but she is higher up and less informative.

In a binary tree the question is the same: given two nodes \`p\` and \`q\`, find the deepest node that has both of them in its subtree. One twist matters a lot: **a node counts as its own descendant**, so if \`p\` is an ancestor of \`q\`, the answer is \`p\` itself.

📌 **Interview term: Lowest common ancestor (LCA)** — the deepest node that has both \`p\` and \`q\` as descendants, where every node is a descendant of itself.

LCA shows up everywhere once you notice it: the distance between two nodes is depth(p) + depth(q) − 2 · depth(LCA); version-control systems find the merge base of two branches with the same idea on a commit graph; and file paths compare by finding their shared parent folder. In interviews it is a favourite because the recursive solution is only a few lines long, yet explaining **why** it works — and when it silently gives a wrong answer — separates candidates sharply.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is this a binary search tree or any binary tree? | In a [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) you can steer by value in O(h) without searching both sides; this page solves the general case. |
| Are \`p\` and \`q\` guaranteed to be in the tree? | The classic short solution **assumes yes**. If one may be missing, it returns a wrong non-null answer (example 2), and you need the counting version. |
| Are \`p\` and \`q\` given as node references or as values? Are values unique? | With references you compare identity. With values you must find the nodes first, and duplicate values make the question ambiguous. |
| Do nodes have parent pointers? | With parent pointers, the problem becomes "first common node of two upward paths", like intersecting two linked lists. |
| One query or many? | Many queries on the same tree justify preprocessing (binary lifting, Euler tour) for faster answers per query. |

## 3. The Core Idea

<svg class="iq-diagram" width="100%" viewBox="0 0 880 370" role="img" aria-label="Tree with root 3. Nodes 7 and 4 are the two children of node 2, so their lowest common ancestor is 2">
  <rect class="d-box-muted" x="368" y="4" width="144" height="28" rx="14"/>
  <text class="d-text" x="440" y="23" text-anchor="middle">LCA(7, 4) = 2</text>
  <path class="d-edge" d="M 500 80 L 140 160"/>
  <path class="d-edge" d="M 500 80 L 680 160"/>
  <path class="d-edge" d="M 140 160 L 50 240"/>
  <path class="d-edge" d="M 140 160 L 320 240"/>
  <path class="d-edge" d="M 680 160 L 590 240"/>
  <path class="d-edge" d="M 680 160 L 770 240"/>
  <path class="d-edge-accent" d="M 320 240 L 230 320"/>
  <path class="d-edge-accent" d="M 320 240 L 410 320"/>
  <circle class="d-box" cx="500" cy="80" r="20"/>
  <text class="d-text" x="500" y="85" text-anchor="middle">3</text>
  <circle class="d-box" cx="140" cy="160" r="20"/>
  <text class="d-text" x="140" y="165" text-anchor="middle">5</text>
  <circle class="d-box" cx="680" cy="160" r="20"/>
  <text class="d-text" x="680" y="165" text-anchor="middle">1</text>
  <circle class="d-box" cx="50" cy="240" r="20"/>
  <text class="d-text" x="50" y="245" text-anchor="middle">6</text>
  <circle class="d-box-accent" cx="320" cy="240" r="20"/>
  <text class="d-text" x="320" y="245" text-anchor="middle">2</text>
  <circle class="d-box" cx="590" cy="240" r="20"/>
  <text class="d-text" x="590" y="245" text-anchor="middle">0</text>
  <circle class="d-box" cx="770" cy="240" r="20"/>
  <text class="d-text" x="770" y="245" text-anchor="middle">8</text>
  <circle class="d-box-accent" cx="230" cy="320" r="20"/>
  <text class="d-text" x="230" y="325" text-anchor="middle">7</text>
  <circle class="d-box-accent" cx="410" cy="320" r="20"/>
  <text class="d-text" x="410" y="325" text-anchor="middle">4</text>
  <text class="d-sub" x="346" y="226">LCA(7, 4)</text>
  <text class="d-sub" x="204" y="306" text-anchor="end">p</text>
  <text class="d-sub" x="436" y="306">q</text>
</svg>

Look at where \`p\` and \`q\` sit relative to each node. For any node X there are only three possibilities:

1. \`p\` and \`q\` are in **different** subtrees of X (one left, one right) — then X is the LCA. No deeper node can contain both.
2. Both are in the **same** subtree of X — then the LCA is deeper, inside that subtree.
3. X **is** \`p\` or \`q\` — then X is the LCA if the other one is below it, which is guaranteed when both are in the tree.

The recursive solution turns those cases into return values. Each call answers: "what did I find in my subtree?"

- \`null\` — neither \`p\` nor \`q\` is here;
- \`p\` or \`q\` — I found one of them (and maybe the other below it);
- some other node — both are here, and this is their LCA, already computed deeper down.

📌 **Interview term: Post-order combination** — each node first collects the results of its left and right recursive calls, then combines them. Here: if both sides are non-null, this node is the answer; otherwise pass up whichever side is non-null. See the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods).

<svg class="iq-diagram" width="100%" viewBox="0 0 880 370" role="img" aria-label="Return values of the recursive search for nodes 7 and 8. Node 7 and node 8 return themselves, empty branches return null, and the root 3 receives a non-null result from both sides so it is the answer">
  <rect class="d-box-muted" x="336" y="4" width="208" height="28" rx="14"/>
  <text class="d-text" x="440" y="23" text-anchor="middle">Searching for 7 and 8</text>
  <path class="d-edge" d="M 500 80 L 140 160"/>
  <path class="d-edge" d="M 500 80 L 680 160"/>
  <path class="d-edge" d="M 140 160 L 50 240"/>
  <path class="d-edge" d="M 140 160 L 320 240"/>
  <path class="d-edge" d="M 680 160 L 590 240"/>
  <path class="d-edge" d="M 680 160 L 770 240"/>
  <path class="d-edge" d="M 320 240 L 230 320"/>
  <path class="d-edge" d="M 320 240 L 410 320"/>
  <circle class="d-box-accent" cx="500" cy="80" r="20"/>
  <text class="d-text" x="500" y="85" text-anchor="middle">3</text>
  <circle class="d-box" cx="140" cy="160" r="20"/>
  <text class="d-text" x="140" y="165" text-anchor="middle">5</text>
  <circle class="d-box" cx="680" cy="160" r="20"/>
  <text class="d-text" x="680" y="165" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="50" cy="240" r="20"/>
  <text class="d-text" x="50" y="245" text-anchor="middle">6</text>
  <circle class="d-box" cx="320" cy="240" r="20"/>
  <text class="d-text" x="320" y="245" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="590" cy="240" r="20"/>
  <text class="d-text" x="590" y="245" text-anchor="middle">0</text>
  <circle class="d-box-accent" cx="770" cy="240" r="20"/>
  <text class="d-text" x="770" y="245" text-anchor="middle">8</text>
  <circle class="d-box-accent" cx="230" cy="320" r="20"/>
  <text class="d-text" x="230" y="325" text-anchor="middle">7</text>
  <circle class="d-box-muted" cx="410" cy="320" r="20"/>
  <text class="d-text" x="410" y="325" text-anchor="middle">4</text>
  <text class="d-sub" x="526" y="66">both sides: 3</text>
  <text class="d-sub" x="114" y="146" text-anchor="end">returns 7</text>
  <text class="d-sub" x="706" y="146">returns 8</text>
  <text class="d-sub" x="24" y="226" text-anchor="end">null</text>
  <text class="d-sub" x="346" y="226">returns 7</text>
  <text class="d-sub" x="564" y="226" text-anchor="end">null</text>
  <text class="d-sub" x="796" y="226">returns 8</text>
  <text class="d-sub" x="204" y="306" text-anchor="end">returns 7</text>
  <text class="d-sub" x="436" y="306">null</text>
</svg>

Searching for 7 and 8: node 7 returns itself, which bubbles up through 2 and 5 because their other side is null. Node 8 returns itself up through 1. The root receives a non-null value from **both** sides, so it returns itself — 3 is the answer. Nodes 6, 4 and 0 contribute nothing.

📌 **Interview term: Early return on a match** — when the current node is \`p\` or \`q\`, the search returns it immediately without exploring its subtree. That is safe only because both nodes are known to exist: if the other one is below, this node is the LCA anyway; if it is elsewhere, another branch will report it.

## 4. Approaches

### Recursive search (the standard answer)

~~~text
lca(node):
    if node is empty or node is p or node is q: return node
    left  = lca(node.left)
    right = lca(node.right)
    if left and right are both non-empty: return node
    return whichever of left / right is non-empty (or empty)
~~~

Each node is visited at most once, so it is O(n) time and O(h) stack.

### Parent pointers + ancestor set

If you cannot reason about the recursion under pressure, there is a very concrete alternative: walk the tree once and record every node's **parent** in a hash map. Then climb from \`p\` to the root, putting every node into a set. Finally climb from \`q\`; the first node you meet that is in the set is the LCA. It is O(n) time and O(n) extra memory, and it is easy to adapt when the tree already stores parent pointers. Example 2 checks that both approaches agree on all 81 (p, q) pairs of the 9-node tree.

📌 **Interview term: Parent map** — a hash map from each node to its parent, built with one traversal. It turns "go up" into an O(1) lookup in a tree that only has child pointers. See [how a hash table works](/interview-question/how-does-a-hash-table-work).

### When one node may be missing

The standard version returns \`p\` as soon as it sees \`p\`, so if \`q\` is not in the tree at all it still answers \`p\` — a confident wrong answer. Example 2 shows it: asked for the LCA of 5 and a node 99 that is not in the tree, the naive version prints 5. The safe version visits the **whole** tree (no early return), counts how many of \`p\` and \`q\` it actually met, and returns a result only if the count is 2.

📌 **Interview term: Precondition** — an assumption the algorithm relies on (here: both nodes exist). State it out loud, or remove it with extra work.

### The binary search tree shortcut

In a BST, values tell you where to go: if both values are smaller than the current node, go left; if both are larger, go right; otherwise the current node splits them and is the LCA. That is O(h) time and O(1) space — but it is wrong on a general binary tree, where values carry no ordering.

## 5. The Code in JavaScript

~~~javascript
// Lowest common ancestor of nodes p and q; both must be in the tree.
function lca(root, p, q) {
  if (root === null || root === p || root === q) return root; // === compares references
  const left = lca(root.left, p, q);
  const right = lca(root.right, p, q);
  if (left !== null && right !== null) return root; // p on one side, q on the other
  return left !== null ? left : right;
}
~~~

The parent-map version (example 2):

~~~javascript
// Map every node to its parent, collect p's ancestors, climb from q.
function lcaParents(root, p, q) {
  const parent = new Map([[root, null]]); // Map keys can be objects (by reference)
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    for (const child of [node.left, node.right]) {
      if (child !== null) {
        parent.set(child, node);
        stack.push(child);
      }
    }
  }
  const ancestors = new Set();
  for (let a = p; a !== null; a = parent.get(a)) ancestors.add(a);
  while (!ancestors.has(q)) q = parent.get(q);
  return q;
}
~~~

**What to point out in this code:**

- **\`===\` on objects compares references**, which is exactly node identity: \`root === p\` is true only for the very same node object.
- **Use \`Map\`, not a plain object, for the parent map.** Object keys are strings, so every node used as a key becomes the string \`"[object Object]"\`: in our run, two different nodes used as keys of \`{}\` left a single key, and the second write overwrote the first. A \`Map\` keys by reference (see [when to use Map and Set over objects and arrays](/interview-question/when-should-you-use-map-and-set-over-objects-and-arrays)).
- \`parent.get(a)\` returns \`undefined\` for a missing key, not \`null\`; the climb stops at the root because the root was stored with the value \`null\` explicitly.
- The example's \`find\` uses \`??\` (nullish coalescing, ES2020): it falls back to the right subtree only when the left result is \`null\` or \`undefined\`, unlike \`||\`, which would also skip other falsy values.
- The recursion uses one frame per level; in our Node 22 run the engine allowed roughly ten thousand nested calls, so a deeper chain needs the iterative parent-map version.

📌 **Interview term: Identity vs. equality** — identity means "the same object in memory" (\`===\` on objects); equality means "equal values". LCA is about identity: two different nodes can hold the same value.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Both examples use the tree \`[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4]\` from the diagrams. Example 1 asks six LCA questions, including one where p is an ancestor of q and one where p and q are the same node. Example 2 checks the parent-map version against the recursive one on all 81 ordered pairs of nodes, then shows the missing-node trap and the safe counting version.

**Example 1 — six LCA queries** prints:

~~~text
3
5
5
3
2
0
~~~

**Example 2 — parent map cross-check and the missing-node trap** prints:

~~~text
recursive and parent-map agree on 81 of 81 pairs
lca(5, 99) naive: 5
lca(5, 99) safe:  none
lca(6, 4) safe:   5
lca(5, 4) safe:   5
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive search | O(n) | O(h) | each node is visited at most once; one stack frame per level |
| Parent map + ancestor set | O(n) | O(n) | one walk builds the map; the climbs are O(h) each |
| Safe (counting) version | O(n) | O(h) | always visits every node, but still once each |
| BST shortcut (BST only) | O(h) | O(1) | one root-to-node walk steered by value |

n is the number of nodes and h the height: O(log n) when balanced, O(n) for a chain (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)). If the same tree gets many LCA queries, preprocessing such as binary lifting (each node stores its 2^k-th ancestor) brings each query down to O(log n); for a single query, the O(n) recursive search is the expected answer.

## 8. Edge Cases

- **p is an ancestor of q** — the answer is p (\`lca(5, 4) = 5\` in example 1).
- **p and q are the same node** — the answer is that node (\`lca(0, 0) = 0\`).
- **One of them is the root** — the root.
- **p and q are siblings** — their parent (\`lca(7, 4) = 2\`).
- **A node is not in the tree** — the standard version is wrong (it returns 5 for 5 and 99); use the counting version or verify both nodes first.
- **Duplicate values** — if the question gives values instead of nodes, duplicates make "the node with value 5" ambiguous; ask, or work with node references.

## Common Pitfalls

- **Assuming both nodes exist without saying so.** The short version returns a non-null wrong answer when one is missing.
- **Using the BST shortcut on a general binary tree.** Values carry no order there; the walk goes the wrong way.
- **A plain object as the parent map.** Every node key becomes \`"[object Object]"\`; use \`Map\`.
- **Comparing values instead of nodes.** \`root.val === p.val\` breaks with duplicate values; compare the objects with \`===\`.
- **Confusing \`undefined\` and \`null\`.** \`Map.get\` returns \`undefined\` for missing keys; a loop that stops only on \`null\` will not stop for a node that was never mapped.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">The LCA of p and q is the deepest node with both in its subtree; a node counts as its own descendant.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursion:</strong> <span style="color:#f0e2c8;">Return the node if it is null, p or q; otherwise recurse left and right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Combine:</strong> <span style="color:#f0e2c8;">If both sides return non-null, this node is the LCA; otherwise pass up the non-null side.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time and O(h) stack; it assumes both nodes are in the tree.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Compare nodes with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code> (reference) and use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> for the parent map — plain-object keys all become <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"[object Object]"</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if p or q might not be in the tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Visit the whole tree without the early return, count how many of p and q you actually met, and return the result only if the count is 2. Otherwise return null.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does it change for a binary search tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Steer by value: both smaller, go left; both larger, go right; otherwise the current node is the LCA. O(h) time, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if nodes have parent pointers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Climb from p putting ancestors in a set, then climb from q until you hit the set. Or measure both depths, lift the deeper one, and step both up together for O(1) extra space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you answer many LCA queries on the same tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Preprocess once: binary lifting stores each node's 2^k-th ancestor in O(n log n), then each query takes O(log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the distance between two nodes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">depth(p) + depth(q) − 2 · depth(LCA). One more walk computes the depths, so it stays O(n).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lowest common ancestor (LCA)** | Deepest node with both p and q in its subtree (a node is its own descendant) |
| **Post-order combination** | Collect the left and right results first, then combine them at the node |
| **Early return on a match** | Stop exploring below a node that is p or q; safe when both exist |
| **Parent map** | Hash map from each node to its parent, built in one traversal |
| **Precondition** | An assumption the algorithm relies on, such as both nodes being present |
| **Identity vs. equality** | Same object vs. equal values; LCA compares identity |

Related: the same "combine the two child results at the node" pattern drives the [diameter of a binary tree](/interview-question/how-do-you-compute-the-diameter-of-a-binary-tree) and the [balanced-tree check](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced).

---
**Conclusion:** The lowest common ancestor falls out of one post-order rule: a call returns the node if it is \`null\`, \`p\` or \`q\`; otherwise it asks both children, and if both report something, the current node is the LCA. In JavaScript that is a ten-line function comparing objects with \`===\`, O(n) time and O(h) stack. Know its precondition — both nodes must exist, or it returns a confident wrong answer (5 for 5 and 99 in our run) — the counting fix, the parent-map alternative (with a \`Map\`, never a plain object), and the O(h) shortcut that only works on a BST.`,
        examples: [
          {
            label: "Recursive LCA: six queries on one tree",
            code: `class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// Build a tree from a level-order array; null marks a missing child.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new Node(values[0]);
  const queue = [root];
  let head = 0; // index of the next node to fill (cheaper than queue.shift())
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) {
      node.left = new Node(values[i]);
      queue.push(node.left);
    }
    i++;
    if (i < values.length && values[i] !== null) {
      node.right = new Node(values[i]);
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

// Return the node holding val (values are unique here), or null.
function find(node, val) {
  if (node === null || node.val === val) return node;
  return find(node.left, val) ?? find(node.right, val);
}

// Lowest common ancestor of nodes p and q; both must be in the tree.
function lca(root, p, q) {
  if (root === null || root === p || root === q) return root; // === compares references
  const left = lca(root.left, p, q);
  const right = lca(root.right, p, q);
  if (left !== null && right !== null) return root; // p on one side, q on the other
  return left !== null ? left : right;
}

const root = build([3, 5, 1, 6, 2, 0, 8, null, null, 7, 4]);
const ask = (a, b) => lca(root, find(root, a), find(root, b)).val;

console.log(ask(5, 1)); // 3
console.log(ask(5, 4)); // 5
console.log(ask(6, 4)); // 5
console.log(ask(7, 8)); // 3
console.log(ask(7, 4)); // 2
console.log(ask(0, 0)); // 0`,
          },
          {
            label: "Parent map cross-check and the missing-node trap",
            code: `class Node {
  constructor(val) {
    this.val = val;
    this.left = null;
    this.right = null;
  }
}

// Build a tree from a level-order array; null marks a missing child.
function build(values) {
  if (values.length === 0 || values[0] === null) return null;
  const root = new Node(values[0]);
  const queue = [root];
  let head = 0; // index of the next node to fill (cheaper than queue.shift())
  let i = 1;
  while (head < queue.length && i < values.length) {
    const node = queue[head++];
    if (i < values.length && values[i] !== null) {
      node.left = new Node(values[i]);
      queue.push(node.left);
    }
    i++;
    if (i < values.length && values[i] !== null) {
      node.right = new Node(values[i]);
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

function lca(root, p, q) {
  if (root === null || root === p || root === q) return root;
  const left = lca(root.left, p, q);
  const right = lca(root.right, p, q);
  if (left !== null && right !== null) return root;
  return left !== null ? left : right;
}

// Map every node to its parent, collect p's ancestors, climb from q.
function lcaParents(root, p, q) {
  const parent = new Map([[root, null]]); // Map keys can be objects (by reference)
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    for (const child of [node.left, node.right]) {
      if (child !== null) {
        parent.set(child, node);
        stack.push(child);
      }
    }
  }
  const ancestors = new Set();
  for (let a = p; a !== null; a = parent.get(a)) ancestors.add(a);
  while (!ancestors.has(q)) q = parent.get(q);
  return q;
}

// Like lca, but returns null unless BOTH p and q are really in the tree.
function lcaSafe(root, p, q) {
  let found = 0;
  function go(node) {
    if (node === null) return null;
    const left = go(node.left);   // no early return: visit everything
    const right = go(node.right);
    if (node === p || node === q) {
      found++;
      return node;
    }
    if (left !== null && right !== null) return node;
    return left !== null ? left : right;
  }
  const answer = go(root);
  return found === 2 ? answer : null;
}

function allNodes(node, out) {
  if (node !== null) {
    out.push(node);
    allNodes(node.left, out);
    allNodes(node.right, out);
  }
  return out;
}

const root = build([3, 5, 1, 6, 2, 0, 8, null, null, 7, 4]);
const nodes = allNodes(root, []);
let same = 0;
for (const a of nodes) for (const b of nodes) if (lca(root, a, b) === lcaParents(root, a, b)) same++;
console.log('recursive and parent-map agree on ' + same + ' of ' + nodes.length ** 2 + ' pairs');

const byVal = new Map(nodes.map((n) => [n.val, n]));
const stranger = new Node(99); // never inserted into the tree
const naive = lca(root, byVal.get(5), stranger);
const safe = lcaSafe(root, byVal.get(5), stranger);
console.log('lca(5, 99) naive: ' + (naive ? naive.val : 'none'));
console.log('lca(5, 99) safe:  ' + (safe ? safe.val : 'none'));
console.log('lca(6, 4) safe:   ' + lcaSafe(root, byVal.get(6), byVal.get(4)).val);
console.log('lca(5, 4) safe:   ' + lcaSafe(root, byVal.get(5), byVal.get(4)).val);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given the root of a binary tree — not necessarily a binary search tree — and two nodes p and q that are in the tree, write a Java function that returns their lowest common ancestor: the deepest node that has both p and q as descendants, where a node counts as a descendant of itself."

**What a strong answer should cover:**
- The definition, including that p can be the answer when it is an ancestor of q.
- The recursive post-order search: return the node if it is null, p or q; if both children return non-null, the current node is the LCA.
- O(n) time and O(h) space, and why the early return is safe only when both nodes exist.
- How to handle a possibly missing node (count matches, no early return) and the parent-map alternative.
- Java details: \`==\` compares references, and a \`HashMap<Node, Node>\` relies on \`Node\` keeping identity \`equals\`/\`hashCode\`.
- The BST shortcut and why it does not apply to a general binary tree.

**Clarifying questions expected:**
- Is it a BST or a general binary tree?
- Are both nodes guaranteed to be in the tree, and are they given as nodes or as values?

**Code / implementation expected:** Yes — \`static Node lca(Node root, Node p, Node q)\`, in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree and a recursive function are; everything else is explained.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two cousins at a family reunion are arguing about how they are related. Someone pulls out the family tree. You put a finger on each cousin and move both fingers upward, generation by generation, until they land on the same person. That person — the first shared one, the youngest relative they both descend from — is their **lowest common ancestor**. Their great-great-grandmother is a common ancestor too, but she is higher up and less informative.

In a binary tree the question is the same: given two nodes \`p\` and \`q\`, find the deepest node that has both of them in its subtree. One twist matters a lot: **a node counts as its own descendant**, so if \`p\` is an ancestor of \`q\`, the answer is \`p\` itself.

📌 **Interview term: Lowest common ancestor (LCA)** — the deepest node that has both \`p\` and \`q\` as descendants, where every node is a descendant of itself.

LCA shows up everywhere once you notice it: the distance between two nodes is depth(p) + depth(q) − 2 · depth(LCA); version-control systems find the merge base of two branches with the same idea on a commit graph; and file paths compare by finding their shared parent folder. In interviews it is a favourite because the recursive solution is only a few lines long, yet explaining **why** it works — and when it silently gives a wrong answer — separates candidates sharply.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is this a binary search tree or any binary tree? | In a [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) you can steer by value in O(h) without searching both sides; this page solves the general case. |
| Are \`p\` and \`q\` guaranteed to be in the tree? | The classic short solution **assumes yes**. If one may be missing, it returns a wrong non-null answer (example 2), and you need the counting version. |
| Are \`p\` and \`q\` given as node references or as values? Are values unique? | With references you compare identity. With values you must find the nodes first, and duplicate values make the question ambiguous. |
| Do nodes have parent pointers? | With parent pointers, the problem becomes "first common node of two upward paths", like intersecting two linked lists. |
| One query or many? | Many queries on the same tree justify preprocessing (binary lifting, Euler tour) for faster answers per query. |

## 3. The Core Idea

<svg class="iq-diagram" width="100%" viewBox="0 0 880 370" role="img" aria-label="Tree with root 3. Nodes 7 and 4 are the two children of node 2, so their lowest common ancestor is 2">
  <rect class="d-box-muted" x="368" y="4" width="144" height="28" rx="14"/>
  <text class="d-text" x="440" y="23" text-anchor="middle">LCA(7, 4) = 2</text>
  <path class="d-edge" d="M 500 80 L 140 160"/>
  <path class="d-edge" d="M 500 80 L 680 160"/>
  <path class="d-edge" d="M 140 160 L 50 240"/>
  <path class="d-edge" d="M 140 160 L 320 240"/>
  <path class="d-edge" d="M 680 160 L 590 240"/>
  <path class="d-edge" d="M 680 160 L 770 240"/>
  <path class="d-edge-accent" d="M 320 240 L 230 320"/>
  <path class="d-edge-accent" d="M 320 240 L 410 320"/>
  <circle class="d-box" cx="500" cy="80" r="20"/>
  <text class="d-text" x="500" y="85" text-anchor="middle">3</text>
  <circle class="d-box" cx="140" cy="160" r="20"/>
  <text class="d-text" x="140" y="165" text-anchor="middle">5</text>
  <circle class="d-box" cx="680" cy="160" r="20"/>
  <text class="d-text" x="680" y="165" text-anchor="middle">1</text>
  <circle class="d-box" cx="50" cy="240" r="20"/>
  <text class="d-text" x="50" y="245" text-anchor="middle">6</text>
  <circle class="d-box-accent" cx="320" cy="240" r="20"/>
  <text class="d-text" x="320" y="245" text-anchor="middle">2</text>
  <circle class="d-box" cx="590" cy="240" r="20"/>
  <text class="d-text" x="590" y="245" text-anchor="middle">0</text>
  <circle class="d-box" cx="770" cy="240" r="20"/>
  <text class="d-text" x="770" y="245" text-anchor="middle">8</text>
  <circle class="d-box-accent" cx="230" cy="320" r="20"/>
  <text class="d-text" x="230" y="325" text-anchor="middle">7</text>
  <circle class="d-box-accent" cx="410" cy="320" r="20"/>
  <text class="d-text" x="410" y="325" text-anchor="middle">4</text>
  <text class="d-sub" x="346" y="226">LCA(7, 4)</text>
  <text class="d-sub" x="204" y="306" text-anchor="end">p</text>
  <text class="d-sub" x="436" y="306">q</text>
</svg>

Look at where \`p\` and \`q\` sit relative to each node. For any node X there are only three possibilities:

1. \`p\` and \`q\` are in **different** subtrees of X (one left, one right) — then X is the LCA. No deeper node can contain both.
2. Both are in the **same** subtree of X — then the LCA is deeper, inside that subtree.
3. X **is** \`p\` or \`q\` — then X is the LCA if the other one is below it, which is guaranteed when both are in the tree.

The recursive solution turns those cases into return values. Each call answers: "what did I find in my subtree?"

- \`null\` — neither \`p\` nor \`q\` is here;
- \`p\` or \`q\` — I found one of them (and maybe the other below it);
- some other node — both are here, and this is their LCA, already computed deeper down.

📌 **Interview term: Post-order combination** — each node first collects the results of its left and right recursive calls, then combines them. Here: if both sides are non-null, this node is the answer; otherwise pass up whichever side is non-null. See the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods).

<svg class="iq-diagram" width="100%" viewBox="0 0 880 370" role="img" aria-label="Return values of the recursive search for nodes 7 and 8. Node 7 and node 8 return themselves, empty branches return null, and the root 3 receives a non-null result from both sides so it is the answer">
  <rect class="d-box-muted" x="336" y="4" width="208" height="28" rx="14"/>
  <text class="d-text" x="440" y="23" text-anchor="middle">Searching for 7 and 8</text>
  <path class="d-edge" d="M 500 80 L 140 160"/>
  <path class="d-edge" d="M 500 80 L 680 160"/>
  <path class="d-edge" d="M 140 160 L 50 240"/>
  <path class="d-edge" d="M 140 160 L 320 240"/>
  <path class="d-edge" d="M 680 160 L 590 240"/>
  <path class="d-edge" d="M 680 160 L 770 240"/>
  <path class="d-edge" d="M 320 240 L 230 320"/>
  <path class="d-edge" d="M 320 240 L 410 320"/>
  <circle class="d-box-accent" cx="500" cy="80" r="20"/>
  <text class="d-text" x="500" y="85" text-anchor="middle">3</text>
  <circle class="d-box" cx="140" cy="160" r="20"/>
  <text class="d-text" x="140" y="165" text-anchor="middle">5</text>
  <circle class="d-box" cx="680" cy="160" r="20"/>
  <text class="d-text" x="680" y="165" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="50" cy="240" r="20"/>
  <text class="d-text" x="50" y="245" text-anchor="middle">6</text>
  <circle class="d-box" cx="320" cy="240" r="20"/>
  <text class="d-text" x="320" y="245" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="590" cy="240" r="20"/>
  <text class="d-text" x="590" y="245" text-anchor="middle">0</text>
  <circle class="d-box-accent" cx="770" cy="240" r="20"/>
  <text class="d-text" x="770" y="245" text-anchor="middle">8</text>
  <circle class="d-box-accent" cx="230" cy="320" r="20"/>
  <text class="d-text" x="230" y="325" text-anchor="middle">7</text>
  <circle class="d-box-muted" cx="410" cy="320" r="20"/>
  <text class="d-text" x="410" y="325" text-anchor="middle">4</text>
  <text class="d-sub" x="526" y="66">both sides: 3</text>
  <text class="d-sub" x="114" y="146" text-anchor="end">returns 7</text>
  <text class="d-sub" x="706" y="146">returns 8</text>
  <text class="d-sub" x="24" y="226" text-anchor="end">null</text>
  <text class="d-sub" x="346" y="226">returns 7</text>
  <text class="d-sub" x="564" y="226" text-anchor="end">null</text>
  <text class="d-sub" x="796" y="226">returns 8</text>
  <text class="d-sub" x="204" y="306" text-anchor="end">returns 7</text>
  <text class="d-sub" x="436" y="306">null</text>
</svg>

Searching for 7 and 8: node 7 returns itself, which bubbles up through 2 and 5 because their other side is null. Node 8 returns itself up through 1. The root receives a non-null value from **both** sides, so it returns itself — 3 is the answer. Nodes 6, 4 and 0 contribute nothing.

📌 **Interview term: Early return on a match** — when the current node is \`p\` or \`q\`, the search returns it immediately without exploring its subtree. That is safe only because both nodes are known to exist: if the other one is below, this node is the LCA anyway; if it is elsewhere, another branch will report it.

## 4. Approaches

### Recursive search (the standard answer)

~~~text
lca(node):
    if node is empty or node is p or node is q: return node
    left  = lca(node.left)
    right = lca(node.right)
    if left and right are both non-empty: return node
    return whichever of left / right is non-empty (or empty)
~~~

Each node is visited at most once, so it is O(n) time and O(h) stack.

### Parent pointers + ancestor set

If you cannot reason about the recursion under pressure, there is a very concrete alternative: walk the tree once and record every node's **parent** in a hash map. Then climb from \`p\` to the root, putting every node into a set. Finally climb from \`q\`; the first node you meet that is in the set is the LCA. It is O(n) time and O(n) extra memory, and it is easy to adapt when the tree already stores parent pointers. Example 2 checks that both approaches agree on all 81 (p, q) pairs of the 9-node tree.

📌 **Interview term: Parent map** — a hash map from each node to its parent, built with one traversal. It turns "go up" into an O(1) lookup in a tree that only has child pointers. See [how a hash table works](/interview-question/how-does-a-hash-table-work).

### When one node may be missing

The standard version returns \`p\` as soon as it sees \`p\`, so if \`q\` is not in the tree at all it still answers \`p\` — a confident wrong answer. Example 2 shows it: asked for the LCA of 5 and a node 99 that is not in the tree, the naive version prints 5. The safe version visits the **whole** tree (no early return), counts how many of \`p\` and \`q\` it actually met, and returns a result only if the count is 2.

📌 **Interview term: Precondition** — an assumption the algorithm relies on (here: both nodes exist). State it out loud, or remove it with extra work.

### The binary search tree shortcut

In a BST, values tell you where to go: if both values are smaller than the current node, go left; if both are larger, go right; otherwise the current node splits them and is the LCA. That is O(h) time and O(1) space — but it is wrong on a general binary tree, where values carry no ordering.

## 5. The Code in Java

~~~java
// Lowest common ancestor of nodes p and q; both must be in the tree.
static Node lca(Node root, Node p, Node q) {
    if (root == null || root == p || root == q) return root; // == compares references
    Node left = lca(root.left, p, q);
    Node right = lca(root.right, p, q);
    if (left != null && right != null) return root;          // p on one side, q on the other
    return left != null ? left : right;
}
~~~

The parent-map version (example 2):

~~~java
// Map every node to its parent, collect p's ancestors, climb from q.
static Node lcaParents(Node root, Node p, Node q) {
    Map<Node, Node> parent = new HashMap<>(); // Node has no equals(): keys compare by identity
    parent.put(root, null);
    Deque<Node> stack = new ArrayDeque<>();
    stack.push(root);
    while (!stack.isEmpty()) {
        Node node = stack.pop();
        for (Node child : new Node[]{node.left, node.right}) {
            if (child != null) {
                parent.put(child, node);
                stack.push(child);
            }
        }
    }
    Set<Node> ancestors = new HashSet<>();
    for (Node a = p; a != null; a = parent.get(a)) ancestors.add(a);
    while (!ancestors.contains(q)) q = parent.get(q);
    return q;
}
~~~

**What to point out in this code:**

- **\`==\` on objects compares references**, which is exactly node identity. That is the right test here; \`equals\` would be wrong if \`Node\` ever overrode it to compare values.
- **\`HashMap<Node, Node>\` uses \`hashCode\` and \`equals\`.** Our \`Node\` does not override them, so both fall back to \`Object\`'s identity-based versions and every node is its own key. If someone later overrides \`equals\` by value, two nodes with equal values collapse into one key. (\`IdentityHashMap\` exists for exactly this situation.)
- \`ArrayDeque\` is used as a stack (\`push\` / \`pop\`) for the iterative walk, so this version does not recurse at all.
- \`HashMap\` allows a \`null\` value, which is how the root records "no parent": \`parent.get(root)\` returns \`null\` and the climb stops.
- The recursive \`lca\` uses one frame per level: with the default stack, 100,000 nested calls threw \`StackOverflowError\` in our run, so a very deep chain needs the iterative version.

📌 **Interview term: Identity vs. equality** — identity means "the same object" (\`==\` on references); equality means "equal values" (\`equals\`). LCA is about identity: two different nodes can hold the same value.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21 (the code only uses Java 17 features)). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Both examples use the tree \`[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4]\` from the diagrams. Example 1 asks six LCA questions, including one where p is an ancestor of q and one where p and q are the same node. Example 2 checks the parent-map version against the recursive one on all 81 ordered pairs of nodes, then shows the missing-node trap and the safe counting version.

**Example 1 — six LCA queries** prints:

~~~text
3
5
5
3
2
0
~~~

**Example 2 — parent map cross-check and the missing-node trap** prints:

~~~text
recursive and parent-map agree on 81 of 81 pairs
lca(5, 99) naive: 5
lca(5, 99) safe:  none
lca(6, 4) safe:   5
lca(5, 4) safe:   5
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive search | O(n) | O(h) | each node is visited at most once; one stack frame per level |
| Parent map + ancestor set | O(n) | O(n) | one walk builds the map; the climbs are O(h) each |
| Safe (counting) version | O(n) | O(h) | always visits every node, but still once each |
| BST shortcut (BST only) | O(h) | O(1) | one root-to-node walk steered by value |

n is the number of nodes and h the height: O(log n) when balanced, O(n) for a chain (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)). If the same tree gets many LCA queries, preprocessing such as binary lifting (each node stores its 2^k-th ancestor) brings each query down to O(log n); for a single query, the O(n) recursive search is the expected answer.

## 8. Edge Cases

- **p is an ancestor of q** — the answer is p (\`lca(5, 4) = 5\` in example 1).
- **p and q are the same node** — the answer is that node (\`lca(0, 0) = 0\`).
- **One of them is the root** — the root.
- **p and q are siblings** — their parent (\`lca(7, 4) = 2\`).
- **A node is not in the tree** — the standard version is wrong (it returns 5 for 5 and 99); use the counting version or verify both nodes first.
- **Duplicate values** — if the question gives values instead of nodes, duplicates make "the node with value 5" ambiguous; ask, or work with node references.

## Common Pitfalls

- **Assuming both nodes exist without saying so.** The short version returns a non-null wrong answer when one is missing.
- **Using the BST shortcut on a general binary tree.** Values carry no order there; the walk goes the wrong way.
- **Calling \`equals\` instead of \`==\`.** If \`Node\` overrides \`equals\` by value, two different nodes with the same value look identical.
- **A value-based \`equals\`/\`hashCode\` with \`HashMap<Node, ...>\`.** Equal-valued nodes share one key; use identity semantics or \`IdentityHashMap\`.
- **Deep recursion.** 100,000 nested calls threw \`StackOverflowError\` with the default stack in our run; use the iterative version for chains.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">The LCA of p and q is the deepest node with both in its subtree; a node counts as its own descendant.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursion:</strong> <span style="color:#f0e2c8;">Return the node if it is null, p or q; otherwise recurse left and right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Combine:</strong> <span style="color:#f0e2c8;">If both sides return non-null, this node is the LCA; otherwise pass up the non-null side.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time and O(h) stack; it assumes both nodes are in the tree.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Compare nodes with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> (reference); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Node, Node&gt;</code> is identity-based only while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Node</code> does not override <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if p or q might not be in the tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Visit the whole tree without the early return, count how many of p and q you actually met, and return the result only if the count is 2. Otherwise return null.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does it change for a binary search tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Steer by value: both smaller, go left; both larger, go right; otherwise the current node is the LCA. O(h) time, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if nodes have parent pointers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Climb from p putting ancestors in a set, then climb from q until you hit the set. Or measure both depths, lift the deeper one, and step both up together for O(1) extra space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you answer many LCA queries on the same tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Preprocess once: binary lifting stores each node's 2^k-th ancestor in O(n log n), then each query takes O(log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the distance between two nodes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">depth(p) + depth(q) − 2 · depth(LCA). One more walk computes the depths, so it stays O(n).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lowest common ancestor (LCA)** | Deepest node with both p and q in its subtree (a node is its own descendant) |
| **Post-order combination** | Collect the left and right results first, then combine them at the node |
| **Early return on a match** | Stop exploring below a node that is p or q; safe when both exist |
| **Parent map** | Hash map from each node to its parent, built in one traversal |
| **Precondition** | An assumption the algorithm relies on, such as both nodes being present |
| **Identity vs. equality** | Same object vs. equal values; LCA compares identity |

Related: the same "combine the two child results at the node" pattern drives the [diameter of a binary tree](/interview-question/how-do-you-compute-the-diameter-of-a-binary-tree) and the [balanced-tree check](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced).

---
**Conclusion:** The lowest common ancestor falls out of one post-order rule: a call returns the node if it is \`null\`, \`p\` or \`q\`; otherwise it asks both children, and if both report something, the current node is the LCA. In Java that is a ten-line method comparing references with \`==\`, O(n) time and O(h) stack. Know its precondition — both nodes must exist, or it returns a confident wrong answer (5 for 5 and 99 in our run) — the counting fix, the \`HashMap\` parent-map alternative and why it depends on \`Node\` keeping identity \`equals\`, and the O(h) shortcut that only works on a BST.`,
        examples: [
          {
            label: "Recursive LCA: six queries on one tree",
            code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    // Build a tree from a level-order array; null marks a missing child.
    static Node build(Integer[] values) {
        if (values.length == 0 || values[0] == null) return null;
        Node root = new Node(values[0]);
        Deque<Node> queue = new ArrayDeque<>();
        queue.offer(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            Node node = queue.poll();
            if (i < values.length && values[i] != null) {
                node.left = new Node(values[i]);
                queue.offer(node.left);
            }
            i++;
            if (i < values.length && values[i] != null) {
                node.right = new Node(values[i]);
                queue.offer(node.right);
            }
            i++;
        }
        return root;
    }


    // Return the node holding val (values are unique here), or null.
    static Node find(Node node, int val) {
        if (node == null || node.val == val) return node;
        Node left = find(node.left, val);
        return left != null ? left : find(node.right, val);
    }

    // Lowest common ancestor of nodes p and q; both must be in the tree.
    static Node lca(Node root, Node p, Node q) {
        if (root == null || root == p || root == q) return root; // == compares references
        Node left = lca(root.left, p, q);
        Node right = lca(root.right, p, q);
        if (left != null && right != null) return root;          // p on one side, q on the other
        return left != null ? left : right;
    }

    static Node root = build(new Integer[]{3, 5, 1, 6, 2, 0, 8, null, null, 7, 4});

    static int ask(int a, int b) {
        return lca(root, find(root, a), find(root, b)).val;
    }

    public static void main(String[] args) {
        System.out.println(ask(5, 1)); // 3
        System.out.println(ask(5, 4)); // 5
        System.out.println(ask(6, 4)); // 5
        System.out.println(ask(7, 8)); // 3
        System.out.println(ask(7, 4)); // 2
        System.out.println(ask(0, 0)); // 0
    }
}`,
          },
          {
            label: "Parent map cross-check and the missing-node trap",
            code: `import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.Set;

public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    // Build a tree from a level-order array; null marks a missing child.
    static Node build(Integer[] values) {
        if (values.length == 0 || values[0] == null) return null;
        Node root = new Node(values[0]);
        Deque<Node> queue = new ArrayDeque<>();
        queue.offer(root);
        int i = 1;
        while (!queue.isEmpty() && i < values.length) {
            Node node = queue.poll();
            if (i < values.length && values[i] != null) {
                node.left = new Node(values[i]);
                queue.offer(node.left);
            }
            i++;
            if (i < values.length && values[i] != null) {
                node.right = new Node(values[i]);
                queue.offer(node.right);
            }
            i++;
        }
        return root;
    }


    static Node lca(Node root, Node p, Node q) {
        if (root == null || root == p || root == q) return root;
        Node left = lca(root.left, p, q);
        Node right = lca(root.right, p, q);
        if (left != null && right != null) return root;
        return left != null ? left : right;
    }

    // Map every node to its parent, collect p's ancestors, climb from q.
    static Node lcaParents(Node root, Node p, Node q) {
        Map<Node, Node> parent = new HashMap<>(); // Node has no equals(): keys compare by identity
        parent.put(root, null);
        Deque<Node> stack = new ArrayDeque<>();
        stack.push(root);
        while (!stack.isEmpty()) {
            Node node = stack.pop();
            for (Node child : new Node[]{node.left, node.right}) {
                if (child != null) {
                    parent.put(child, node);
                    stack.push(child);
                }
            }
        }
        Set<Node> ancestors = new HashSet<>();
        for (Node a = p; a != null; a = parent.get(a)) ancestors.add(a);
        while (!ancestors.contains(q)) q = parent.get(q);
        return q;
    }

    static int found;

    static Node go(Node node, Node p, Node q) {
        if (node == null) return null;
        Node left = go(node.left, p, q);   // no early return: visit everything
        Node right = go(node.right, p, q);
        if (node == p || node == q) {
            found++;
            return node;
        }
        if (left != null && right != null) return node;
        return left != null ? left : right;
    }

    // Like lca, but returns null unless BOTH p and q are really in the tree.
    static Node lcaSafe(Node root, Node p, Node q) {
        found = 0;
        Node answer = go(root, p, q);
        return found == 2 ? answer : null;
    }

    static void allNodes(Node node, List<Node> out) {
        if (node == null) return;
        out.add(node);
        allNodes(node.left, out);
        allNodes(node.right, out);
    }

    public static void main(String[] args) {
        Node root = build(new Integer[]{3, 5, 1, 6, 2, 0, 8, null, null, 7, 4});
        List<Node> nodes = new ArrayList<>();
        allNodes(root, nodes);
        int same = 0;
        for (Node a : nodes) for (Node b : nodes) if (lca(root, a, b) == lcaParents(root, a, b)) same++;
        System.out.println("recursive and parent-map agree on " + same + " of " + nodes.size() * nodes.size() + " pairs");

        Map<Integer, Node> byVal = new HashMap<>();
        for (Node n : nodes) byVal.put(n.val, n);
        Node stranger = new Node(99);         // never inserted into the tree
        Node naive = lca(root, byVal.get(5), stranger);
        Node safe = lcaSafe(root, byVal.get(5), stranger);
        System.out.println("lca(5, 99) naive: " + (naive != null ? String.valueOf(naive.val) : "none"));
        System.out.println("lca(5, 99) safe:  " + (safe != null ? String.valueOf(safe.val) : "none"));
        System.out.println("lca(6, 4) safe:   " + lcaSafe(root, byVal.get(6), byVal.get(4)).val);
        System.out.println("lca(5, 4) safe:   " + lcaSafe(root, byVal.get(5), byVal.get(4)).val);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given the root of a binary tree — not necessarily a binary search tree — and two nodes p and q that are in the tree, write a C++ function that returns their lowest common ancestor: the deepest node that has both p and q as descendants, where a node counts as a descendant of itself."

**What a strong answer should cover:**
- The definition, including that p can be the answer when it is an ancestor of q.
- The recursive post-order search: return the node if it is null, p or q; if both children return non-null, the current node is the LCA.
- O(n) time and O(h) space, and why the early return is safe only when both nodes exist.
- How to handle a possibly missing node (count matches, no early return) and the parent-map alternative.
- C++ details: compare \`const Node*\` pointers, key an \`unordered_map\` by pointer, and use \`at()\` rather than \`operator[]\` for lookups.
- The BST shortcut and why it does not apply to a general binary tree.

**Clarifying questions expected:**
- Is it a BST or a general binary tree?
- Are both nodes guaranteed to be in the tree, and are they given as nodes or as values?

**Code / implementation expected:** Yes — \`const Node* lca(const Node* root, const Node* p, const Node* q)\`, in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a binary tree and a recursive function are; everything else is explained.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Two cousins at a family reunion are arguing about how they are related. Someone pulls out the family tree. You put a finger on each cousin and move both fingers upward, generation by generation, until they land on the same person. That person — the first shared one, the youngest relative they both descend from — is their **lowest common ancestor**. Their great-great-grandmother is a common ancestor too, but she is higher up and less informative.

In a binary tree the question is the same: given two nodes \`p\` and \`q\`, find the deepest node that has both of them in its subtree. One twist matters a lot: **a node counts as its own descendant**, so if \`p\` is an ancestor of \`q\`, the answer is \`p\` itself.

📌 **Interview term: Lowest common ancestor (LCA)** — the deepest node that has both \`p\` and \`q\` as descendants, where every node is a descendant of itself.

LCA shows up everywhere once you notice it: the distance between two nodes is depth(p) + depth(q) − 2 · depth(LCA); version-control systems find the merge base of two branches with the same idea on a commit graph; and file paths compare by finding their shared parent folder. In interviews it is a favourite because the recursive solution is only a few lines long, yet explaining **why** it works — and when it silently gives a wrong answer — separates candidates sharply.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is this a binary search tree or any binary tree? | In a [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) you can steer by value in O(h) without searching both sides; this page solves the general case. |
| Are \`p\` and \`q\` guaranteed to be in the tree? | The classic short solution **assumes yes**. If one may be missing, it returns a wrong non-null answer (example 2), and you need the counting version. |
| Are \`p\` and \`q\` given as node references or as values? Are values unique? | With references you compare identity. With values you must find the nodes first, and duplicate values make the question ambiguous. |
| Do nodes have parent pointers? | With parent pointers, the problem becomes "first common node of two upward paths", like intersecting two linked lists. |
| One query or many? | Many queries on the same tree justify preprocessing (binary lifting, Euler tour) for faster answers per query. |

## 3. The Core Idea

<svg class="iq-diagram" width="100%" viewBox="0 0 880 370" role="img" aria-label="Tree with root 3. Nodes 7 and 4 are the two children of node 2, so their lowest common ancestor is 2">
  <rect class="d-box-muted" x="368" y="4" width="144" height="28" rx="14"/>
  <text class="d-text" x="440" y="23" text-anchor="middle">LCA(7, 4) = 2</text>
  <path class="d-edge" d="M 500 80 L 140 160"/>
  <path class="d-edge" d="M 500 80 L 680 160"/>
  <path class="d-edge" d="M 140 160 L 50 240"/>
  <path class="d-edge" d="M 140 160 L 320 240"/>
  <path class="d-edge" d="M 680 160 L 590 240"/>
  <path class="d-edge" d="M 680 160 L 770 240"/>
  <path class="d-edge-accent" d="M 320 240 L 230 320"/>
  <path class="d-edge-accent" d="M 320 240 L 410 320"/>
  <circle class="d-box" cx="500" cy="80" r="20"/>
  <text class="d-text" x="500" y="85" text-anchor="middle">3</text>
  <circle class="d-box" cx="140" cy="160" r="20"/>
  <text class="d-text" x="140" y="165" text-anchor="middle">5</text>
  <circle class="d-box" cx="680" cy="160" r="20"/>
  <text class="d-text" x="680" y="165" text-anchor="middle">1</text>
  <circle class="d-box" cx="50" cy="240" r="20"/>
  <text class="d-text" x="50" y="245" text-anchor="middle">6</text>
  <circle class="d-box-accent" cx="320" cy="240" r="20"/>
  <text class="d-text" x="320" y="245" text-anchor="middle">2</text>
  <circle class="d-box" cx="590" cy="240" r="20"/>
  <text class="d-text" x="590" y="245" text-anchor="middle">0</text>
  <circle class="d-box" cx="770" cy="240" r="20"/>
  <text class="d-text" x="770" y="245" text-anchor="middle">8</text>
  <circle class="d-box-accent" cx="230" cy="320" r="20"/>
  <text class="d-text" x="230" y="325" text-anchor="middle">7</text>
  <circle class="d-box-accent" cx="410" cy="320" r="20"/>
  <text class="d-text" x="410" y="325" text-anchor="middle">4</text>
  <text class="d-sub" x="346" y="226">LCA(7, 4)</text>
  <text class="d-sub" x="204" y="306" text-anchor="end">p</text>
  <text class="d-sub" x="436" y="306">q</text>
</svg>

Look at where \`p\` and \`q\` sit relative to each node. For any node X there are only three possibilities:

1. \`p\` and \`q\` are in **different** subtrees of X (one left, one right) — then X is the LCA. No deeper node can contain both.
2. Both are in the **same** subtree of X — then the LCA is deeper, inside that subtree.
3. X **is** \`p\` or \`q\` — then X is the LCA if the other one is below it, which is guaranteed when both are in the tree.

The recursive solution turns those cases into return values. Each call answers: "what did I find in my subtree?"

- \`null\` — neither \`p\` nor \`q\` is here;
- \`p\` or \`q\` — I found one of them (and maybe the other below it);
- some other node — both are here, and this is their LCA, already computed deeper down.

📌 **Interview term: Post-order combination** — each node first collects the results of its left and right recursive calls, then combines them. Here: if both sides are non-null, this node is the answer; otherwise pass up whichever side is non-null. See the [tree traversal methods](/interview-question/what-are-the-tree-traversal-methods).

<svg class="iq-diagram" width="100%" viewBox="0 0 880 370" role="img" aria-label="Return values of the recursive search for nodes 7 and 8. Node 7 and node 8 return themselves, empty branches return null, and the root 3 receives a non-null result from both sides so it is the answer">
  <rect class="d-box-muted" x="336" y="4" width="208" height="28" rx="14"/>
  <text class="d-text" x="440" y="23" text-anchor="middle">Searching for 7 and 8</text>
  <path class="d-edge" d="M 500 80 L 140 160"/>
  <path class="d-edge" d="M 500 80 L 680 160"/>
  <path class="d-edge" d="M 140 160 L 50 240"/>
  <path class="d-edge" d="M 140 160 L 320 240"/>
  <path class="d-edge" d="M 680 160 L 590 240"/>
  <path class="d-edge" d="M 680 160 L 770 240"/>
  <path class="d-edge" d="M 320 240 L 230 320"/>
  <path class="d-edge" d="M 320 240 L 410 320"/>
  <circle class="d-box-accent" cx="500" cy="80" r="20"/>
  <text class="d-text" x="500" y="85" text-anchor="middle">3</text>
  <circle class="d-box" cx="140" cy="160" r="20"/>
  <text class="d-text" x="140" y="165" text-anchor="middle">5</text>
  <circle class="d-box" cx="680" cy="160" r="20"/>
  <text class="d-text" x="680" y="165" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="50" cy="240" r="20"/>
  <text class="d-text" x="50" y="245" text-anchor="middle">6</text>
  <circle class="d-box" cx="320" cy="240" r="20"/>
  <text class="d-text" x="320" y="245" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="590" cy="240" r="20"/>
  <text class="d-text" x="590" y="245" text-anchor="middle">0</text>
  <circle class="d-box-accent" cx="770" cy="240" r="20"/>
  <text class="d-text" x="770" y="245" text-anchor="middle">8</text>
  <circle class="d-box-accent" cx="230" cy="320" r="20"/>
  <text class="d-text" x="230" y="325" text-anchor="middle">7</text>
  <circle class="d-box-muted" cx="410" cy="320" r="20"/>
  <text class="d-text" x="410" y="325" text-anchor="middle">4</text>
  <text class="d-sub" x="526" y="66">both sides: 3</text>
  <text class="d-sub" x="114" y="146" text-anchor="end">returns 7</text>
  <text class="d-sub" x="706" y="146">returns 8</text>
  <text class="d-sub" x="24" y="226" text-anchor="end">null</text>
  <text class="d-sub" x="346" y="226">returns 7</text>
  <text class="d-sub" x="564" y="226" text-anchor="end">null</text>
  <text class="d-sub" x="796" y="226">returns 8</text>
  <text class="d-sub" x="204" y="306" text-anchor="end">returns 7</text>
  <text class="d-sub" x="436" y="306">null</text>
</svg>

Searching for 7 and 8: node 7 returns itself, which bubbles up through 2 and 5 because their other side is null. Node 8 returns itself up through 1. The root receives a non-null value from **both** sides, so it returns itself — 3 is the answer. Nodes 6, 4 and 0 contribute nothing.

📌 **Interview term: Early return on a match** — when the current node is \`p\` or \`q\`, the search returns it immediately without exploring its subtree. That is safe only because both nodes are known to exist: if the other one is below, this node is the LCA anyway; if it is elsewhere, another branch will report it.

## 4. Approaches

### Recursive search (the standard answer)

~~~text
lca(node):
    if node is empty or node is p or node is q: return node
    left  = lca(node.left)
    right = lca(node.right)
    if left and right are both non-empty: return node
    return whichever of left / right is non-empty (or empty)
~~~

Each node is visited at most once, so it is O(n) time and O(h) stack.

### Parent pointers + ancestor set

If you cannot reason about the recursion under pressure, there is a very concrete alternative: walk the tree once and record every node's **parent** in a hash map. Then climb from \`p\` to the root, putting every node into a set. Finally climb from \`q\`; the first node you meet that is in the set is the LCA. It is O(n) time and O(n) extra memory, and it is easy to adapt when the tree already stores parent pointers. Example 2 checks that both approaches agree on all 81 (p, q) pairs of the 9-node tree.

📌 **Interview term: Parent map** — a hash map from each node to its parent, built with one traversal. It turns "go up" into an O(1) lookup in a tree that only has child pointers. See [how a hash table works](/interview-question/how-does-a-hash-table-work).

### When one node may be missing

The standard version returns \`p\` as soon as it sees \`p\`, so if \`q\` is not in the tree at all it still answers \`p\` — a confident wrong answer. Example 2 shows it: asked for the LCA of 5 and a node 99 that is not in the tree, the naive version prints 5. The safe version visits the **whole** tree (no early return), counts how many of \`p\` and \`q\` it actually met, and returns a result only if the count is 2.

📌 **Interview term: Precondition** — an assumption the algorithm relies on (here: both nodes exist). State it out loud, or remove it with extra work.

### The binary search tree shortcut

In a BST, values tell you where to go: if both values are smaller than the current node, go left; if both are larger, go right; otherwise the current node splits them and is the LCA. That is O(h) time and O(1) space — but it is wrong on a general binary tree, where values carry no ordering.

## 5. The Code in C++

~~~cpp
// Lowest common ancestor of nodes p and q; both must be in the tree.
const Node* lca(const Node* root, const Node* p, const Node* q) {
    if (root == nullptr || root == p || root == q) return root; // compares addresses
    const Node* left = lca(root->left, p, q);
    const Node* right = lca(root->right, p, q);
    if (left && right) return root;                             // p on one side, q on the other
    return left ? left : right;
}
~~~

The parent-map version (example 2):

~~~cpp
// Map every node to its parent, collect p's ancestors, climb from q.
const Node* lcaParents(const Node* root, const Node* p, const Node* q) {
    std::unordered_map<const Node*, const Node*> parent{{root, nullptr}}; // keys are addresses
    std::vector<const Node*> stack{root};
    while (!stack.empty()) {
        const Node* node = stack.back();
        stack.pop_back();
        for (const Node* child : {node->left, node->right}) {
            if (child) {
                parent[child] = node;
                stack.push_back(child);
            }
        }
    }
    std::unordered_set<const Node*> ancestors;
    for (const Node* a = p; a; a = parent.at(a)) ancestors.insert(a);
    while (!ancestors.count(q)) q = parent.at(q);   // at() throws instead of inserting
    return q;
}
~~~

**What to point out in this code:**

- **Pointer comparison is identity.** \`root == p\` compares addresses, so it is true only for the very same node.
- **\`std::unordered_map<const Node*, const Node*>\`** hashes the pointer value, which is cheap and identity-based by construction.
- **\`at()\` vs \`operator[]\`.** \`parent[child] = node\` inserts on purpose. For lookups the code uses \`parent.at(a)\`, which throws \`std::out_of_range\` for a missing key, whereas \`parent[a]\` would silently insert a null entry and hide a bug.
- The iterative walk uses a \`std::vector<const Node*>\` as a stack (\`push_back\` / \`back\` / \`pop_back\`), so this version cannot overflow the call stack.
- In example 2 the "stranger" node is a local \`Node stranger(99);\` — its address is valid for the whole of \`main\`, and it is never linked into the tree.
- The recursive \`lca\` uses one frame per level; on a very deep chain that can overflow the stack, which in C++ is a crash, not an exception.

📌 **Interview term: Identity vs. equality** — identity means "the same object" (equal pointers); equality means "equal values". LCA is about identity: two different nodes can hold the same value.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13 with -std=c++17). The same programs were written in Python, JavaScript, Java and C++ and all four printed exactly the same lines. Both examples use the tree \`[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4]\` from the diagrams. Example 1 asks six LCA questions, including one where p is an ancestor of q and one where p and q are the same node. Example 2 checks the parent-map version against the recursive one on all 81 ordered pairs of nodes, then shows the missing-node trap and the safe counting version.

**Example 1 — six LCA queries** prints:

~~~text
3
5
5
3
2
0
~~~

**Example 2 — parent map cross-check and the missing-node trap** prints:

~~~text
recursive and parent-map agree on 81 of 81 pairs
lca(5, 99) naive: 5
lca(5, 99) safe:  none
lca(6, 4) safe:   5
lca(5, 4) safe:   5
~~~

## 7. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Recursive search | O(n) | O(h) | each node is visited at most once; one stack frame per level |
| Parent map + ancestor set | O(n) | O(n) | one walk builds the map; the climbs are O(h) each |
| Safe (counting) version | O(n) | O(h) | always visits every node, but still once each |
| BST shortcut (BST only) | O(h) | O(1) | one root-to-node walk steered by value |

n is the number of nodes and h the height: O(log n) when balanced, O(n) for a chain (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)). If the same tree gets many LCA queries, preprocessing such as binary lifting (each node stores its 2^k-th ancestor) brings each query down to O(log n); for a single query, the O(n) recursive search is the expected answer.

## 8. Edge Cases

- **p is an ancestor of q** — the answer is p (\`lca(5, 4) = 5\` in example 1).
- **p and q are the same node** — the answer is that node (\`lca(0, 0) = 0\`).
- **One of them is the root** — the root.
- **p and q are siblings** — their parent (\`lca(7, 4) = 2\`).
- **A node is not in the tree** — the standard version is wrong (it returns 5 for 5 and 99); use the counting version or verify both nodes first.
- **Duplicate values** — if the question gives values instead of nodes, duplicates make "the node with value 5" ambiguous; ask, or work with node references.

## Common Pitfalls

- **Assuming both nodes exist without saying so.** The short version returns a non-null wrong answer when one is missing.
- **Using the BST shortcut on a general binary tree.** Values carry no order there; the walk goes the wrong way.
- **Looking up with \`operator[]\`.** \`parent[x]\` inserts a default (null) entry for an unknown key and hides the bug; use \`at()\` or \`find()\`.
- **Comparing values instead of pointers.** \`root->val == p->val\` breaks with duplicate values; compare the pointers.
- **Dangling pointers.** If nodes are freed or a vector of nodes reallocates, the stored \`const Node*\` keys become invalid; own nodes so their addresses stay stable (the examples use \`std::unique_ptr\`).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">The LCA of p and q is the deepest node with both in its subtree; a node counts as its own descendant.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursion:</strong> <span style="color:#f0e2c8;">Return the node if it is null, p or q; otherwise recurse left and right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Combine:</strong> <span style="color:#f0e2c8;">If both sides return non-null, this node is the LCA; otherwise pass up the non-null side.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time and O(h) stack; it assumes both nodes are in the tree.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const Node*</code> pointers; look up the parent map with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">at()</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> inserts missing keys.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if p or q might not be in the tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Visit the whole tree without the early return, count how many of p and q you actually met, and return the result only if the count is 2. Otherwise return null.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does it change for a binary search tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Steer by value: both smaller, go left; both larger, go right; otherwise the current node is the LCA. O(h) time, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if nodes have parent pointers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Climb from p putting ancestors in a set, then climb from q until you hit the set. Or measure both depths, lift the deeper one, and step both up together for O(1) extra space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you answer many LCA queries on the same tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Preprocess once: binary lifting stores each node's 2^k-th ancestor in O(n log n), then each query takes O(log n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the distance between two nodes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">depth(p) + depth(q) − 2 · depth(LCA). One more walk computes the depths, so it stays O(n).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Lowest common ancestor (LCA)** | Deepest node with both p and q in its subtree (a node is its own descendant) |
| **Post-order combination** | Collect the left and right results first, then combine them at the node |
| **Early return on a match** | Stop exploring below a node that is p or q; safe when both exist |
| **Parent map** | Hash map from each node to its parent, built in one traversal |
| **Precondition** | An assumption the algorithm relies on, such as both nodes being present |
| **Identity vs. equality** | Same object vs. equal values; LCA compares identity |

Related: the same "combine the two child results at the node" pattern drives the [diameter of a binary tree](/interview-question/how-do-you-compute-the-diameter-of-a-binary-tree) and the [balanced-tree check](/interview-question/how-do-you-check-if-a-binary-tree-is-balanced).

---
**Conclusion:** The lowest common ancestor falls out of one post-order rule: a call returns the node if it is \`nullptr\`, \`p\` or \`q\`; otherwise it asks both children, and if both report something, the current node is the LCA. In C++ that is a ten-line function comparing \`const Node*\` pointers, O(n) time and O(h) stack. Know its precondition — both nodes must exist, or it returns a confident wrong answer (5 for 5 and 99 in our run) — the counting fix, the \`unordered_map\` parent-map alternative (look up with \`at()\`), and the O(h) shortcut that only works on a BST.`,
        examples: [
          {
            label: "Recursive LCA: six queries on one tree",
            code: `#include <algorithm>
#include <climits>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <queue>
#include <vector>

struct Node {
    int val;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int v) : val(v) {}
};

const int N = INT_MIN;                       // marks a missing child in the input
std::vector<std::unique_ptr<Node>> pool;     // owns every node, frees them at exit

Node* make(int v) {
    pool.push_back(std::make_unique<Node>(v));
    return pool.back().get();
}

// Build a tree from a level-order vector; N marks a missing child.
Node* build(const std::vector<int>& values) {
    if (values.empty() || values[0] == N) return nullptr;
    Node* root = make(values[0]);
    std::queue<Node*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        Node* node = q.front();
        q.pop();
        if (i < values.size() && values[i] != N) {
            node->left = make(values[i]);
            q.push(node->left);
        }
        i++;
        if (i < values.size() && values[i] != N) {
            node->right = make(values[i]);
            q.push(node->right);
        }
        i++;
    }
    return root;
}
// Return the node holding val (values are unique here), or nullptr.
const Node* find(const Node* node, int val) {
    if (node == nullptr || node->val == val) return node;
    const Node* left = find(node->left, val);
    return left ? left : find(node->right, val);
}

// Lowest common ancestor of nodes p and q; both must be in the tree.
const Node* lca(const Node* root, const Node* p, const Node* q) {
    if (root == nullptr || root == p || root == q) return root; // compares addresses
    const Node* left = lca(root->left, p, q);
    const Node* right = lca(root->right, p, q);
    if (left && right) return root;                             // p on one side, q on the other
    return left ? left : right;
}

const Node* root = build({3, 5, 1, 6, 2, 0, 8, N, N, 7, 4});

int ask(int a, int b) { return lca(root, find(root, a), find(root, b))->val; }

int main() {
    std::cout << ask(5, 1) << "\\n"; // 3
    std::cout << ask(5, 4) << "\\n"; // 5
    std::cout << ask(6, 4) << "\\n"; // 5
    std::cout << ask(7, 8) << "\\n"; // 3
    std::cout << ask(7, 4) << "\\n"; // 2
    std::cout << ask(0, 0) << "\\n"; // 0
}`,
          },
          {
            label: "Parent map cross-check and the missing-node trap",
            code: `#include <algorithm>
#include <climits>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <queue>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

struct Node {
    int val;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int v) : val(v) {}
};

const int N = INT_MIN;                       // marks a missing child in the input
std::vector<std::unique_ptr<Node>> pool;     // owns every node, frees them at exit

Node* make(int v) {
    pool.push_back(std::make_unique<Node>(v));
    return pool.back().get();
}

// Build a tree from a level-order vector; N marks a missing child.
Node* build(const std::vector<int>& values) {
    if (values.empty() || values[0] == N) return nullptr;
    Node* root = make(values[0]);
    std::queue<Node*> q;
    q.push(root);
    size_t i = 1;
    while (!q.empty() && i < values.size()) {
        Node* node = q.front();
        q.pop();
        if (i < values.size() && values[i] != N) {
            node->left = make(values[i]);
            q.push(node->left);
        }
        i++;
        if (i < values.size() && values[i] != N) {
            node->right = make(values[i]);
            q.push(node->right);
        }
        i++;
    }
    return root;
}
const Node* lca(const Node* root, const Node* p, const Node* q) {
    if (root == nullptr || root == p || root == q) return root;
    const Node* left = lca(root->left, p, q);
    const Node* right = lca(root->right, p, q);
    if (left && right) return root;
    return left ? left : right;
}

// Map every node to its parent, collect p's ancestors, climb from q.
const Node* lcaParents(const Node* root, const Node* p, const Node* q) {
    std::unordered_map<const Node*, const Node*> parent{{root, nullptr}}; // keys are addresses
    std::vector<const Node*> stack{root};
    while (!stack.empty()) {
        const Node* node = stack.back();
        stack.pop_back();
        for (const Node* child : {node->left, node->right}) {
            if (child) {
                parent[child] = node;
                stack.push_back(child);
            }
        }
    }
    std::unordered_set<const Node*> ancestors;
    for (const Node* a = p; a; a = parent.at(a)) ancestors.insert(a);
    while (!ancestors.count(q)) q = parent.at(q);   // at() throws instead of inserting
    return q;
}

const Node* go(const Node* node, const Node* p, const Node* q, int& found) {
    if (node == nullptr) return nullptr;
    const Node* left = go(node->left, p, q, found);   // no early return: visit everything
    const Node* right = go(node->right, p, q, found);
    if (node == p || node == q) {
        found++;
        return node;
    }
    if (left && right) return node;
    return left ? left : right;
}

// Like lca, but returns nullptr unless BOTH p and q are really in the tree.
const Node* lcaSafe(const Node* root, const Node* p, const Node* q) {
    int found = 0;
    const Node* answer = go(root, p, q, found);
    return found == 2 ? answer : nullptr;
}

void allNodes(const Node* node, std::vector<const Node*>& out) {
    if (!node) return;
    out.push_back(node);
    allNodes(node->left, out);
    allNodes(node->right, out);
}

std::string show(const Node* n) { return n ? std::to_string(n->val) : "none"; }

int main() {
    const Node* root = build({3, 5, 1, 6, 2, 0, 8, N, N, 7, 4});
    std::vector<const Node*> nodes;
    allNodes(root, nodes);
    int same = 0;
    for (const Node* a : nodes)
        for (const Node* b : nodes)
            if (lca(root, a, b) == lcaParents(root, a, b)) same++;
    std::cout << "recursive and parent-map agree on " << same << " of " << nodes.size() * nodes.size() << " pairs\\n";

    std::unordered_map<int, const Node*> byVal;
    for (const Node* n : nodes) byVal[n->val] = n;
    Node stranger(99);                     // never inserted into the tree
    std::cout << "lca(5, 99) naive: " << show(lca(root, byVal[5], &stranger)) << "\\n";
    std::cout << "lca(5, 99) safe:  " << show(lcaSafe(root, byVal[5], &stranger)) << "\\n";
    std::cout << "lca(6, 4) safe:   " << show(lcaSafe(root, byVal[6], byVal[4])) << "\\n";
    std::cout << "lca(5, 4) safe:   " << show(lcaSafe(root, byVal[5], byVal[4])) << "\\n";
}`,
          },
        ],
      },
    },
  },
];

export default augments;
