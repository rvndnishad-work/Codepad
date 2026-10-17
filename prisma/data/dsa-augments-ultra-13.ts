/**
 * DSA ULTRA — batch 13: linked lists. One complete answer per language
 * (Python, JavaScript, Java, C++). Every example was run with python3 / node /
 * javac+java / g++ -std=c++17 by scripts/verify-dsa-examples.ts and the quoted
 * output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  {
    title: `How do you reverse a linked list?`,
    difficulty: "easy",
    seoDescription: `Reverse a linked list in Python, JavaScript, Java and C++: the three-pointer loop, the recursive version and its stack cost, with verified code.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given the head of a singly linked list, reverse it and return the new head. Write it in Python, and tell me how much extra memory it uses."

**What a strong answer should cover:**
- The idea: walk the list once and point every node's \`next\` at the node before it, so the old tail becomes the head.
- Three pointers (\`prev\`, \`curr\`, \`next\`) and why the next node must be saved before the arrow is flipped.
- O(n) time and O(1) extra space for the iterative version; the recursive version is O(n) time but O(n) call-stack space.
- Edge cases: empty list, one node, two nodes, and returning the new head rather than the old one.
- Python specifics: a small \`ListNode\` class, \`is None\` checks, why the order of a one-line tuple assignment matters, and why recursion fails past CPython's default limit of about 1,000 frames.

**Clarifying questions expected:**
- "Singly or doubly linked, and may I change the nodes in place or must I build a new list?"
- "How long can the list be? That decides whether recursion is safe."

**Code / implementation expected:** Yes — a Python \`reverse_list(head)\` with \`prev\` / \`curr\` / \`nxt\`, ideally plus the recursive version and its stack cost.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture a treasure hunt. Each clue card says where the next clue is hidden: card 1 says "look under the mat", the mat card says "look in the fridge", and so on until the last card says "the end". You only ever hold the first card.

Now the organiser asks you to run the hunt **backwards** for the next group, starting from the prize. You cannot photocopy the cards and you have no table to spread them out on. What you can do is walk the route once, and at every stop rewrite the card so it points to the place you just came from instead of the place you are going. The one rule: before you rewrite a card, read where it points, or you will never find the rest of the route.

That is reversing a linked list. The cards are **nodes**, the "where to look next" line is the \`next\` pointer, and the rule about reading before rewriting is the single bug that catches most candidates. It also matters beyond interviews: the same move is used to reverse part of a list, to [check whether a linked list is a palindrome](/interview-question/how-do-you-check-if-a-linked-list-is-a-palindrome), and to [add two numbers stored as linked lists](/interview-question/how-do-you-add-two-numbers-stored-as-linked-lists) when the digits come in the wrong order.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the list singly or doubly linked? | A doubly linked list also needs every \`prev\` pointer swapped; this page covers the singly linked case. |
| May I modify the nodes in place? | In place is O(1) extra space; if the original must survive, you have to build a new reversed list in O(n) space. |
| How long can the list be? | Tens of thousands of nodes rule out the recursive version because of call-stack depth. |
| What should an empty list return? | The empty list reversed is still empty; confirm you return the null value rather than raising an error. |
| Reverse the whole list, or only part of it? | Reversing positions m to n or groups of k uses the same loop with extra bookkeeping. |

## 3. What a Linked List Is (in One Minute)

A **linked list** stores items in separate little boxes called **nodes**. Each node holds a value and a pointer (a reference) to the next node. You keep only the first node; to reach the fifth item you must follow four pointers. This is different from an array, where items sit side by side and you can jump straight to any index; the trade-offs are covered in [array vs linked list](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).

📌 **Interview term: Singly linked list** — a chain of nodes where each node knows only the node after it, never the one before it.

📌 **Interview term: Head** — the first node of the list; the only node you are given directly.

📌 **Interview term: Null terminator** — the empty value (\`None\` in Python) stored in the last node's \`next\`, marking the end of the list.

<svg class="iq-diagram" width="100%" viewBox="0 0 670 160" role="img" aria-label="A singly linked list 1 to 2 to 3 to 4, the last node points to None">
  <defs>
    <marker id="rev1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="40" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="40" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="40" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="40" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="560" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="40" text-anchor="middle">None</text>
  <path class="d-edge" d="M 114 35 L 164 35" marker-end="url(#rev1-arrow)"/>
  <path class="d-edge" d="M 244 35 L 294 35" marker-end="url(#rev1-arrow)"/>
  <path class="d-edge" d="M 374 35 L 424 35" marker-end="url(#rev1-arrow)"/>
  <path class="d-edge" d="M 504 35 L 554 35" marker-end="url(#rev1-arrow)"/>
  <path class="d-edge-accent" d="M 75 104 L 75 68" marker-end="url(#rev1-arrow)"/>
  <text class="d-text d-accent" x="75" y="122" text-anchor="middle">head</text>
</svg>

The list \`1, 2, 3, 4\` is four nodes. The arrows are the \`next\` pointers; the last one points to \`None\`. Because each node only knows its successor, "reverse" cannot mean "read it from the back": there is no way to walk backwards. It has to mean "rewrite the arrows".

## 4. Brute Force First

The first idea most people have: walk the list, copy the values into an array (or push them on a stack), then walk the list again writing the values back in reverse order, or build brand-new nodes from the copy.

It works and it is O(n) time, but it costs **O(n) extra memory** for the copy, and if you build new nodes, any other code holding a reference to the old nodes still sees the old order. The interviewer is waiting for the version that rewires the nodes you already have and uses only a few extra variables.

📌 **Interview term: In place** — the algorithm rearranges the input itself and uses only O(1) extra memory (a fixed number of variables), however long the input is.

## 5. The Core Idea: Flip Every Arrow with Three Pointers

Walk the list once. At each node, make its \`next\` point **backwards** to the node you came from. You need three pointers to do this without losing anything:

- \`prev\` — the head of the part that is already reversed (starts as \`None\`, because the first node will become the tail).
- \`curr\` — the node you are flipping now (starts at \`head\`).
- \`nxt\` — a saved copy of \`curr.next\`, taken **before** you overwrite it, so you can still reach the rest of the list.

📌 **Interview term: Three-pointer reversal** — the standard in-place reversal: save \`next\`, point \`curr\` back at \`prev\`, then move \`prev\` and \`curr\` one step forward.

Here is the state after two loop steps on \`1, 2, 3, 4\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 800 190" role="img" aria-label="Halfway through the reversal, nodes 1 and 2 already point backwards, prev is on 2 and curr is on 3">
  <defs>
    <marker id="rev2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">after two steps</text>
  <rect class="d-box-muted" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">None</text>
  <rect class="d-box-accent" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">2</text>
  <rect class="d-box" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="560" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="70" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="690" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="70" text-anchor="middle">None</text>
  <path class="d-edge-accent" d="M 166 65 L 116 65" marker-end="url(#rev2-arrow)"/>
  <path class="d-edge-accent" d="M 296 65 L 246 65" marker-end="url(#rev2-arrow)"/>
  <path class="d-edge" d="M 504 65 L 554 65" marker-end="url(#rev2-arrow)"/>
  <path class="d-edge" d="M 634 65 L 684 65" marker-end="url(#rev2-arrow)"/>
  <path class="d-edge-accent" d="M 335 134 L 335 98" marker-end="url(#rev2-arrow)"/>
  <text class="d-text d-accent" x="335" y="152" text-anchor="middle">prev</text>
  <path class="d-edge" d="M 465 134 L 465 98" marker-end="url(#rev2-arrow)"/>
  <text class="d-text" x="465" y="152" text-anchor="middle">curr</text>
</svg>

Nodes 1 and 2 (highlighted) already point backwards, and node 1 points to \`None\` because it will be the tail. \`prev\` holds the reversed part \`2, 1\`; \`curr\` holds the untouched part \`3, 4\`. Notice that node 2 no longer points at node 3: if we had not kept \`curr\`, node 3 and everything after it would be unreachable.

The four moves of one step, for the whole run on \`1, 2, 3\` (the dash means \`None\`):

| Step | \`nxt\` saved | Arrow flipped | \`prev\` after | \`curr\` after |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 2 | 1 now points to — | 1 | 2 |
| 2 | 3 | 2 now points to 1 | 2 | 3 |
| 3 | — | 3 now points to 2 | 3 | — |

When \`curr\` becomes \`None\` the loop stops, and \`prev\` is the old tail, which is the new head:

<svg class="iq-diagram" width="100%" viewBox="0 0 670 160" role="img" aria-label="The finished reversal 4 to 3 to 2 to 1, the old head 1 is now the tail">
  <defs>
    <marker id="rev3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="40" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="170" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="40" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="300" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="40" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="430" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="40" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="560" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="40" text-anchor="middle">None</text>
  <path class="d-edge" d="M 114 35 L 164 35" marker-end="url(#rev3-arrow)"/>
  <path class="d-edge" d="M 244 35 L 294 35" marker-end="url(#rev3-arrow)"/>
  <path class="d-edge" d="M 374 35 L 424 35" marker-end="url(#rev3-arrow)"/>
  <path class="d-edge" d="M 504 35 L 554 35" marker-end="url(#rev3-arrow)"/>
  <path class="d-edge-accent" d="M 75 104 L 75 68" marker-end="url(#rev3-arrow)"/>
  <text class="d-text d-accent" x="75" y="122" text-anchor="middle">new head</text>
  <path class="d-edge" d="M 465 104 L 465 68" marker-end="url(#rev3-arrow)"/>
  <text class="d-text" x="465" y="122" text-anchor="middle">old head</text>
</svg>

📌 **Interview term: Loop invariant** — a statement true before and after every loop step. Here: "\`prev\` is the head of the already-reversed prefix, and \`curr\` is the head of the untouched suffix." Saying it out loud is the quickest way to convince an interviewer the code is right.

## 6. The Code in Python

In Python a node is a tiny class with two attributes. The end of the list is \`None\`, Python's single "nothing" object, and you test for it with \`is None\` (PEP 8 says comparisons to singletons such as \`None\` should use \`is\` / \`is not\`, [PEP 8](https://peps.python.org/pep-0008/#programming-recommendations)).

~~~python
class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next
~~~

The reversal:

~~~python
def reverse_list(head):
    prev = None
    curr = head
    while curr is not None:
        nxt = curr.next      # 1. remember the rest of the list
        curr.next = prev     # 2. flip this arrow
        prev = curr          # 3. step prev forward
        curr = nxt           # 4. step curr forward
    return prev              # prev is the new head
~~~

**Line by line:**

- \`prev = None\`: the reversed part starts empty, and the first node must end up pointing to \`None\` because it becomes the tail.
- \`nxt = curr.next\` must come **before** \`curr.next = prev\`. Once the arrow is flipped, the only reference to the rest of the list is gone, and Python would garbage-collect those nodes if nothing else referred to them.
- The loop ends when \`curr is None\`; at that moment \`prev\` is the last node that was processed, which is the new head.
- Python can do the four moves as one simultaneous assignment, \`curr.next, prev, curr = prev, curr, curr.next\`. The right side is evaluated first into a tuple, then the targets are assigned **left to right**. Order matters: written as \`prev, curr, curr.next = curr, curr.next, prev\`, the third target \`curr.next\` is looked up on the *new* \`curr\`, and on the last node that is \`None\`. Running that version on \`[1, 2, 3]\` printed:

~~~text
AttributeError 'NoneType' object has no attribute 'next' and no __dict__ for setting new attributes
~~~

The four named lines are easier to read aloud and harder to get wrong, so they are what this page uses.

📌 **Interview term: Simultaneous (tuple) assignment** — \`a, b = x, y\` evaluates every right-hand value first and only then assigns the targets from left to right.

## 7. The Recursive Version

Recursion gives a second, shorter answer that interviewers often ask for as a follow-up. If you are new to recursion, read [what recursion and a base case are](/interview-question/what-is-recursion-and-what-is-a-base-case) first.

~~~python
def reverse_recursive(head, depth=1):
    global max_depth
    max_depth = max(max_depth, depth)
    if head is None or head.next is None:   # base case: 0 or 1 node
        return head
    new_head = reverse_recursive(head.next, depth + 1)
    head.next.next = head    # the node after me now points back at me
    head.next = None         # and I become the tail of the reversed part
    return new_head
~~~

How to read it: "to reverse the list starting at \`head\`, first reverse everything after \`head\`; that returns the new head (the old tail). Now the node right after \`head\` is the last node of the reversed part, so make it point back at \`head\`, and make \`head\` the new tail." The base case is an empty list or a single node, which is already its own reverse. (\`depth\` only exists so Example 2 can count how deep the calls go.)

📌 **Interview term: Base case** — the input small enough to answer without another recursive call; here, zero or one node.

Each call waits for the call on the next node, so a list of n nodes needs n frames on the call stack at the same time. CPython limits that: \`sys.getrecursionlimit()\` printed \`1000\` on the Python 3.13 used here, and the recursive version on a 5,000-node list raised:

~~~text
RecursionError: maximum recursion depth exceeded
~~~

You can raise the limit with \`sys.setrecursionlimit\`, but that only moves the cliff. In Python, the iterative version is the answer for real inputs.

For how stack depth counts as memory, see [space complexity and recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 8. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Iterative reversal with three pointers** prints:

~~~text
[5, 4, 3, 2, 1]
[]
[7]
[2, 1]
old head 1 is now the tail: true
new head value: 3
~~~

**Example 2 — Recursive reversal and the call depth it needs** prints:

~~~text
[5, 4, 3, 2, 1] recursion depth 5
[] recursion depth 1
[9] recursion depth 1
[8, 4] recursion depth 2
n=500: recursion depth 500, iterative needs 3 pointer variables
reverse twice gives the original: true
~~~

**What the numbers show:** Example 1 covers the empty, one-node and two-node lists, and proves the caller's old \`head\` is now the tail, which is why the function must return \`prev\`. Example 2 shows the recursive version gives the same answers but needs one stack frame per node (depth 500 for 500 nodes), and that reversing twice gives back the original list.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy values, then write back or rebuild | O(n) | O(n) | one pass to copy, one pass to write; the copy holds n values |
| Iterative three pointers | O(n) | O(1) | each node is visited once; only \`prev\`, \`curr\`, \`nxt\` are stored |
| Recursive | O(n) | O(n) | one call per node, and all n calls are on the stack at the deepest point |

Example 2 shows the recursive cost directly: a 500-node list needed a recursion depth of 500, while the loop needs the same three variables for any length. For a refresher on the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 10. Edge Cases

- **Empty list** (\`head\` is \`None\`): the loop body never runs and the function returns \`prev\`, which is \`None\`. Example 1 prints \`[]\`.
- **One node:** one step; the node's \`next\` is set to \`None\` (it already was) and it is returned. Example 1 prints \`[7]\`.
- **Two nodes:** the smallest case where an arrow really flips; good for a dry run on the whiteboard. Example 1 prints \`[2, 1]\`.
- **The caller's old \`head\` variable:** after reversal it points at the tail. Example 1 checks this: \`old head 1 is now the tail: true\`.
- **A list with a cycle:** reversal never terminates on a cyclic list. If the input might be cyclic, [detect the cycle](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list) first.

## Common Pitfalls

- **Returning \`head\` instead of \`prev\`.** After the loop \`head\` still points at the old first node, which is now the tail, so the caller sees a one-element list \`[1]\`.
- **Flipping before saving.** \`curr.next = prev\` first, then \`nxt = curr.next\`, reads the arrow you just changed and loses the rest of the list.
- **Wrong order in a one-line tuple assignment.** \`prev, curr, curr.next = curr, curr.next, prev\` assigns \`curr\` before \`curr.next\`, so it writes to the wrong node and crashes on \`None\` (verified above).
- **Using \`== None\` or truthiness on values.** Test the node with \`is None\`; \`while curr.val:\` stops early on a node holding \`0\`.
- **Recursing on long lists.** CPython stops at about 1,000 frames by default (\`sys.getrecursionlimit()\` printed 1000 here), so the recursive version fails on inputs an interviewer might mention (10^5 nodes).
- **Forgetting \`head.next = None\` in the recursive version.** The old head keeps pointing to the second node and the second node points back at it: a two-node cycle that makes any printing loop run forever.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Walk the list once and turn every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> arrow around, so the last node becomes the head.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Three pointers:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> is the reversed part, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curr</code> is the node being flipped, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nxt</code> saves the rest before I overwrite <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curr.next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The loop:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nxt = curr.next</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curr.next = prev</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev = curr</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curr = nxt</code>; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curr is None</code>, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space; the recursive version is also O(n) time but uses O(n) call stack.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python details:</strong> <span style="color:#f0e2c8;">Compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is None</code>, and do not use recursion for long lists because CPython stops at about 1,000 frames by default.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it recursively?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: reverse <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head.next</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head.next.next = head</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head.next = None</code>, and return the new head from the deepest call. It is O(n) stack, so it hits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RecursionError</code> on long lists.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not copy the values into a list and rebuild?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That works in O(n) time but O(n) extra memory, and it creates new nodes; callers holding references to the old nodes would see unchanged data. Rewiring is O(1) extra space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you write the loop body in one line?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curr.next, prev, curr = prev, curr, curr.next</code> works because the right side is evaluated first, but the target order matters: putting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curr</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curr.next</code> writes to the wrong node.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you reverse only positions m to n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Walk to the node before position m, reverse the next n - m + 1 nodes with the same three pointers, then reconnect the two ends. Still one pass and O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you reverse in groups of k?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count k nodes ahead; if there are k, reverse them with the same loop and link the previous group tail to the new group head; otherwise leave the rest as is. O(n) time.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Singly linked list** | nodes that each point only to the next node |
| **Head** | the first node; the one you are given |
| **Null terminator** | the empty value in the last node's \`next\` |
| **In place** | rearranging the input itself with O(1) extra memory |
| **Three-pointer reversal** | save \`next\`, point back at \`prev\`, advance \`prev\` and \`curr\` |
| **Loop invariant** | a fact true before and after every loop step |
| **Base case** | the input small enough to answer without recursing |
| **Simultaneous (tuple) assignment** | \`a, b = x, y\`: evaluate all right-hand values first, then assign targets left to right |

---
**Conclusion:** Reversing a linked list is one pass with three pointers: save \`nxt\`, flip \`curr.next\` to \`prev\`, advance both, and return \`prev\`. That is O(n) time and O(1) extra space. The recursive version is shorter but uses one stack frame per node, and CPython's default limit of about 1,000 frames makes it unsafe for real inputs. In Python, what earns the marks is the order of the four moves, the \`is None\` checks, and knowing why a one-line tuple assignment can go wrong.`,
        examples: [
          { label: `Iterative reversal with three pointers`, code: `class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next


def build(values):
    dummy = ListNode(0)
    tail = dummy
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next


def to_list(head):
    out = []
    while head is not None:
        out.append(head.val)
        head = head.next
    return out


def reverse_list(head):
    prev = None
    curr = head
    while curr is not None:
        nxt = curr.next      # 1. remember the rest of the list
        curr.next = prev     # 2. flip this arrow
        prev = curr          # 3. step prev forward
        curr = nxt           # 4. step curr forward
    return prev              # prev is the new head


print(to_list(reverse_list(build([1, 2, 3, 4, 5]))))  # [5, 4, 3, 2, 1]
print(to_list(reverse_list(build([]))))  # []
print(to_list(reverse_list(build([7]))))  # [7]
print(to_list(reverse_list(build([1, 2]))))  # [2, 1]

head = build([1, 2, 3])
new_head = reverse_list(head)
print("old head " + str(head.val) + " is now the tail: " + str(head.next is None).lower())
print("new head value: " + str(new_head.val))` },
          { label: `Recursive reversal and the call depth it needs`, code: `class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next


def build(values):
    dummy = ListNode(0)
    tail = dummy
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next


def to_list(head):
    out = []
    while head is not None:
        out.append(head.val)
        head = head.next
    return out


max_depth = 0


def reverse_recursive(head, depth=1):
    global max_depth
    max_depth = max(max_depth, depth)
    if head is None or head.next is None:   # base case: 0 or 1 node
        return head
    new_head = reverse_recursive(head.next, depth + 1)
    head.next.next = head    # the node after me now points back at me
    head.next = None         # and I become the tail of the reversed part
    return new_head


def reverse_iterative(head):
    prev, curr = None, head
    while curr is not None:
        nxt = curr.next
        curr.next = prev
        prev, curr = curr, nxt
    return prev


for values in [[1, 2, 3, 4, 5], [], [9], [4, 8]]:
    max_depth = 0
    result = to_list(reverse_recursive(build(values)))
    print(str(result) + " recursion depth " + str(max_depth))

max_depth = 0
reverse_recursive(build(list(range(500))))
print("n=500: recursion depth " + str(max_depth) + ", iterative needs 3 pointer variables")

values = list(range(1, 11))
twice = to_list(reverse_iterative(reverse_iterative(build(values))))
print("reverse twice gives the original: " + str(twice == values).lower())` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given the head of a singly linked list, reverse it and return the new head. Write it in JavaScript, and tell me how much extra memory it uses."

**What a strong answer should cover:**
- The idea: walk the list once and point every node's \`next\` at the node before it, so the old tail becomes the head.
- Three pointers (\`prev\`, \`curr\`, \`next\`) and why the next node must be saved before the arrow is flipped.
- O(n) time and O(1) extra space for the iterative version; the recursive version is O(n) time but O(n) call-stack space.
- Edge cases: empty list, one node, two nodes, and returning the new head rather than the old one.
- JavaScript specifics: a \`ListNode\` class with \`next = null\`, \`null\` versus \`undefined\` in the loop test, and \`RangeError: Maximum call stack size exceeded\` for deep recursion.

**Clarifying questions expected:**
- "Singly or doubly linked, and may I change the nodes in place or must I build a new list?"
- "How long can the list be? That decides whether recursion is safe."

**Code / implementation expected:** Yes — a JavaScript \`reverseList(head)\` with \`prev\` / \`curr\` / \`nxt\`, ideally plus the recursive version and its stack cost.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture a treasure hunt. Each clue card says where the next clue is hidden: card 1 says "look under the mat", the mat card says "look in the fridge", and so on until the last card says "the end". You only ever hold the first card.

Now the organiser asks you to run the hunt **backwards** for the next group, starting from the prize. You cannot photocopy the cards and you have no table to spread them out on. What you can do is walk the route once, and at every stop rewrite the card so it points to the place you just came from instead of the place you are going. The one rule: before you rewrite a card, read where it points, or you will never find the rest of the route.

That is reversing a linked list. The cards are **nodes**, the "where to look next" line is the \`next\` pointer, and the rule about reading before rewriting is the single bug that catches most candidates. It also matters beyond interviews: the same move is used to reverse part of a list, to [check whether a linked list is a palindrome](/interview-question/how-do-you-check-if-a-linked-list-is-a-palindrome), and to [add two numbers stored as linked lists](/interview-question/how-do-you-add-two-numbers-stored-as-linked-lists) when the digits come in the wrong order.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the list singly or doubly linked? | A doubly linked list also needs every \`prev\` pointer swapped; this page covers the singly linked case. |
| May I modify the nodes in place? | In place is O(1) extra space; if the original must survive, you have to build a new reversed list in O(n) space. |
| How long can the list be? | Tens of thousands of nodes rule out the recursive version because of call-stack depth. |
| What should an empty list return? | The empty list reversed is still empty; confirm you return the null value rather than raising an error. |
| Reverse the whole list, or only part of it? | Reversing positions m to n or groups of k uses the same loop with extra bookkeeping. |

## 3. What a Linked List Is (in One Minute)

A **linked list** stores items in separate little boxes called **nodes**. Each node holds a value and a pointer (a reference) to the next node. You keep only the first node; to reach the fifth item you must follow four pointers. This is different from an array, where items sit side by side and you can jump straight to any index; the trade-offs are covered in [array vs linked list](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).

📌 **Interview term: Singly linked list** — a chain of nodes where each node knows only the node after it, never the one before it.

📌 **Interview term: Head** — the first node of the list; the only node you are given directly.

📌 **Interview term: Null terminator** — the empty value (\`null\` in JavaScript) stored in the last node's \`next\`, marking the end of the list.

<svg class="iq-diagram" width="100%" viewBox="0 0 670 160" role="img" aria-label="A singly linked list 1 to 2 to 3 to 4, the last node points to null">
  <defs>
    <marker id="rev1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="40" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="40" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="40" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="40" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="560" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="40" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 35 L 164 35" marker-end="url(#rev1-arrow)"/>
  <path class="d-edge" d="M 244 35 L 294 35" marker-end="url(#rev1-arrow)"/>
  <path class="d-edge" d="M 374 35 L 424 35" marker-end="url(#rev1-arrow)"/>
  <path class="d-edge" d="M 504 35 L 554 35" marker-end="url(#rev1-arrow)"/>
  <path class="d-edge-accent" d="M 75 104 L 75 68" marker-end="url(#rev1-arrow)"/>
  <text class="d-text d-accent" x="75" y="122" text-anchor="middle">head</text>
</svg>

The list \`1, 2, 3, 4\` is four nodes. The arrows are the \`next\` pointers; the last one points to \`null\`. Because each node only knows its successor, "reverse" cannot mean "read it from the back": there is no way to walk backwards. It has to mean "rewrite the arrows".

## 4. Brute Force First

The first idea most people have: walk the list, copy the values into an array (or push them on a stack), then walk the list again writing the values back in reverse order, or build brand-new nodes from the copy.

It works and it is O(n) time, but it costs **O(n) extra memory** for the copy, and if you build new nodes, any other code holding a reference to the old nodes still sees the old order. The interviewer is waiting for the version that rewires the nodes you already have and uses only a few extra variables.

📌 **Interview term: In place** — the algorithm rearranges the input itself and uses only O(1) extra memory (a fixed number of variables), however long the input is.

## 5. The Core Idea: Flip Every Arrow with Three Pointers

Walk the list once. At each node, make its \`next\` point **backwards** to the node you came from. You need three pointers to do this without losing anything:

- \`prev\` — the head of the part that is already reversed (starts as \`null\`, because the first node will become the tail).
- \`curr\` — the node you are flipping now (starts at \`head\`).
- \`nxt\` — a saved copy of \`curr.next\`, taken **before** you overwrite it, so you can still reach the rest of the list.

📌 **Interview term: Three-pointer reversal** — the standard in-place reversal: save \`next\`, point \`curr\` back at \`prev\`, then move \`prev\` and \`curr\` one step forward.

Here is the state after two loop steps on \`1, 2, 3, 4\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 800 190" role="img" aria-label="Halfway through the reversal, nodes 1 and 2 already point backwards, prev is on 2 and curr is on 3">
  <defs>
    <marker id="rev2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">after two steps</text>
  <rect class="d-box-muted" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">null</text>
  <rect class="d-box-accent" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">2</text>
  <rect class="d-box" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="560" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="70" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="690" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="70" text-anchor="middle">null</text>
  <path class="d-edge-accent" d="M 166 65 L 116 65" marker-end="url(#rev2-arrow)"/>
  <path class="d-edge-accent" d="M 296 65 L 246 65" marker-end="url(#rev2-arrow)"/>
  <path class="d-edge" d="M 504 65 L 554 65" marker-end="url(#rev2-arrow)"/>
  <path class="d-edge" d="M 634 65 L 684 65" marker-end="url(#rev2-arrow)"/>
  <path class="d-edge-accent" d="M 335 134 L 335 98" marker-end="url(#rev2-arrow)"/>
  <text class="d-text d-accent" x="335" y="152" text-anchor="middle">prev</text>
  <path class="d-edge" d="M 465 134 L 465 98" marker-end="url(#rev2-arrow)"/>
  <text class="d-text" x="465" y="152" text-anchor="middle">curr</text>
</svg>

Nodes 1 and 2 (highlighted) already point backwards, and node 1 points to \`null\` because it will be the tail. \`prev\` holds the reversed part \`2, 1\`; \`curr\` holds the untouched part \`3, 4\`. Notice that node 2 no longer points at node 3: if we had not kept \`curr\`, node 3 and everything after it would be unreachable.

The four moves of one step, for the whole run on \`1, 2, 3\` (the dash means \`null\`):

| Step | \`nxt\` saved | Arrow flipped | \`prev\` after | \`curr\` after |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 2 | 1 now points to — | 1 | 2 |
| 2 | 3 | 2 now points to 1 | 2 | 3 |
| 3 | — | 3 now points to 2 | 3 | — |

When \`curr\` becomes \`null\` the loop stops, and \`prev\` is the old tail, which is the new head:

<svg class="iq-diagram" width="100%" viewBox="0 0 670 160" role="img" aria-label="The finished reversal 4 to 3 to 2 to 1, the old head 1 is now the tail">
  <defs>
    <marker id="rev3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="40" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="170" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="40" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="300" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="40" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="430" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="40" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="560" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="40" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 35 L 164 35" marker-end="url(#rev3-arrow)"/>
  <path class="d-edge" d="M 244 35 L 294 35" marker-end="url(#rev3-arrow)"/>
  <path class="d-edge" d="M 374 35 L 424 35" marker-end="url(#rev3-arrow)"/>
  <path class="d-edge" d="M 504 35 L 554 35" marker-end="url(#rev3-arrow)"/>
  <path class="d-edge-accent" d="M 75 104 L 75 68" marker-end="url(#rev3-arrow)"/>
  <text class="d-text d-accent" x="75" y="122" text-anchor="middle">new head</text>
  <path class="d-edge" d="M 465 104 L 465 68" marker-end="url(#rev3-arrow)"/>
  <text class="d-text" x="465" y="122" text-anchor="middle">old head</text>
</svg>

📌 **Interview term: Loop invariant** — a statement true before and after every loop step. Here: "\`prev\` is the head of the already-reversed prefix, and \`curr\` is the head of the untouched suffix." Saying it out loud is the quickest way to convince an interviewer the code is right.

## 6. The Code in JavaScript

In JavaScript a node is a small class (or a plain object) with \`val\` and \`next\`. The end of the list is \`null\`. Give \`next\` a default of \`null\` in the constructor so a node never has \`next === undefined\`: the loop below tests \`curr !== null\`, and \`undefined !== null\` is \`true\`, which would walk off the end and crash.

~~~javascript
class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}
~~~

The reversal:

~~~javascript
function reverseList(head) {
  let prev = null;
  let curr = head;
  while (curr !== null) {
    const nxt = curr.next; // 1. remember the rest of the list
    curr.next = prev;      // 2. flip this arrow
    prev = curr;           // 3. step prev forward
    curr = nxt;            // 4. step curr forward
  }
  return prev;             // prev is the new head
}
~~~

**Line by line:**

- \`let prev = null\`: the reversed part starts empty, and the first node must end up pointing to \`null\` because it becomes the tail.
- \`const nxt = curr.next\` must come **before** \`curr.next = prev\`. Once the arrow is flipped, nothing refers to the rest of the list any more, and the garbage collector is free to reclaim it.
- \`while (curr !== null)\` uses strict comparison. If some node was built as \`{ val: 3 }\` with no \`next\`, then \`curr\` becomes \`undefined\`, \`undefined !== null\` is \`true\`, and the next \`curr.next\` throws. Running the loop on such a list printed:

~~~text
TypeError: Cannot read properties of undefined (reading 'next')
~~~

  Either always set \`next = null\` (as the class does) or write \`while (curr != null)\`, whose loose \`!=\` treats \`null\` and \`undefined\` alike.
- JavaScript can also do the four moves with array destructuring: \`[curr.next, prev, curr] = [prev, curr, curr.next];\`. The right-hand array is built first, then the targets are assigned left to right, so this order works (it printed \`3,2,1\` on \`[1, 2, 3]\`). It allocates a small array every step, so the named version is the one to write in an interview.

📌 **Interview term: Destructuring assignment** — \`[a, b] = [x, y]\` builds the right-hand array first and then assigns each element to the matching target, left to right.

## 7. The Recursive Version

Recursion gives a second, shorter answer that interviewers often ask for as a follow-up. If you are new to recursion, read [what recursion and a base case are](/interview-question/what-is-recursion-and-what-is-a-base-case) first.

~~~javascript
function reverseRecursive(head, depth = 1) {
  maxDepth = Math.max(maxDepth, depth);
  if (head === null || head.next === null) return head; // base case: 0 or 1 node
  const newHead = reverseRecursive(head.next, depth + 1);
  head.next.next = head; // the node after me now points back at me
  head.next = null;      // and I become the tail of the reversed part
  return newHead;
}
~~~

How to read it: "to reverse the list starting at \`head\`, first reverse everything after \`head\`; that returns the new head (the old tail). Now the node right after \`head\` is the last node of the reversed part, so make it point back at \`head\`, and make \`head\` the new tail." The base case is an empty list or a single node, which is already its own reverse. (\`depth\` only exists so Example 2 can count how deep the calls go.)

📌 **Interview term: Base case** — the input small enough to answer without another recursive call; here, zero or one node.

Each call waits for the call on the next node, so a list of n nodes needs n frames on the call stack at the same time. JavaScript engines have a fixed stack, and the size is not part of the language standard; running a million-deep recursion in Node 22 here threw:

~~~text
RangeError: Maximum call stack size exceeded
~~~

Proper tail calls were specified in ES2015, but this function is not a tail call anyway (it does work after the recursive call returns), so the iterative version is the one to ship.

For how stack depth counts as memory, see [space complexity and recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 8. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Iterative reversal with three pointers** prints:

~~~text
[5, 4, 3, 2, 1]
[]
[7]
[2, 1]
old head 1 is now the tail: true
new head value: 3
~~~

**Example 2 — Recursive reversal and the call depth it needs** prints:

~~~text
[5, 4, 3, 2, 1] recursion depth 5
[] recursion depth 1
[9] recursion depth 1
[8, 4] recursion depth 2
n=500: recursion depth 500, iterative needs 3 pointer variables
reverse twice gives the original: true
~~~

**What the numbers show:** Example 1 covers the empty, one-node and two-node lists, and proves the caller's old \`head\` is now the tail, which is why the function must return \`prev\`. Example 2 shows the recursive version gives the same answers but needs one stack frame per node (depth 500 for 500 nodes), and that reversing twice gives back the original list.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy values, then write back or rebuild | O(n) | O(n) | one pass to copy, one pass to write; the copy holds n values |
| Iterative three pointers | O(n) | O(1) | each node is visited once; only \`prev\`, \`curr\`, \`nxt\` are stored |
| Recursive | O(n) | O(n) | one call per node, and all n calls are on the stack at the deepest point |

Example 2 shows the recursive cost directly: a 500-node list needed a recursion depth of 500, while the loop needs the same three variables for any length. For a refresher on the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 10. Edge Cases

- **Empty list** (\`head\` is \`null\`): the loop body never runs and the function returns \`prev\`, which is \`null\`. Example 1 prints \`[]\`.
- **One node:** one step; the node's \`next\` is set to \`null\` (it already was) and it is returned. Example 1 prints \`[7]\`.
- **Two nodes:** the smallest case where an arrow really flips; good for a dry run on the whiteboard. Example 1 prints \`[2, 1]\`.
- **The caller's old \`head\` variable:** after reversal it points at the tail. Example 1 checks this: \`old head 1 is now the tail: true\`.
- **A list with a cycle:** reversal never terminates on a cyclic list. If the input might be cyclic, [detect the cycle](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list) first.

## Common Pitfalls

- **Returning \`head\` instead of \`prev\`.** After the loop \`head\` still points at the old first node, which is now the tail, so the caller sees a one-element list.
- **Flipping before saving.** \`curr.next = prev\` first, then \`nxt = curr.next\`, reads the arrow you just changed and loses the rest of the list.
- **\`undefined\` at the end of the list.** Nodes made as \`{ val: 1 }\` have \`next === undefined\`, so \`while (curr !== null)\` never stops and throws a \`TypeError\` (verified above). Default \`next\` to \`null\`, or test with \`!= null\`.
- **Forgetting \`head.next = null\` in the recursive version.** Nodes 1 and 2 end up pointing at each other. \`console.log\` in Node shows it as \`<ref *1> ... [Circular *1]\` and \`JSON.stringify\` throws \`TypeError: Converting circular structure to JSON\` (both seen when this bug was run here).
- **Recursing on long lists.** The call stack is small and engine-specific; a deep recursion throws \`RangeError: Maximum call stack size exceeded\`.
- **Reversing an array instead.** \`Array.prototype.reverse()\` reverses an array in place, but converting the list to an array and back costs O(n) extra memory, which is the thing the interviewer asked you to avoid.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Walk the list once and turn every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> arrow around, so the last node becomes the head.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Three pointers:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> is the reversed part, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curr</code> is the node being flipped, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nxt</code> saves the rest before I overwrite <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curr.next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The loop:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const nxt = curr.next; curr.next = prev; prev = curr; curr = nxt;</code> until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curr</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>, then return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space; the recursive version uses O(n) call stack.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript details:</strong> <span style="color:#f0e2c8;">Default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> so the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!== null</code> test works, and avoid recursion on long lists because it throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it recursively?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: reverse <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head.next</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head.next.next = head</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head.next = null</code>, and return the deepest node. It uses one stack frame per node, so it throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code> on very long lists.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not push the values into an array and rebuild?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n) extra memory, and new nodes; any code holding references to the old node objects would see the old order. Rewiring keeps the same objects.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[curr.next, prev, curr] = [prev, curr, curr.next]</code> do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The right-hand array is built first, then the targets are assigned left to right, so it is a correct one-line body. It allocates an array per step, so I would still write the four lines.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you reverse only positions m to n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Walk to the node before m, reverse the next n - m + 1 nodes with the same three pointers, then reconnect both ends. One pass, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know you did not create a cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Print the result with a loop that stops after a fixed number of nodes, or check that the old head now has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next === null</code>. Node prints a cyclic object as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[Circular *1]</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Singly linked list** | nodes that each point only to the next node |
| **Head** | the first node; the one you are given |
| **Null terminator** | the empty value in the last node's \`next\` |
| **In place** | rearranging the input itself with O(1) extra memory |
| **Three-pointer reversal** | save \`next\`, point back at \`prev\`, advance \`prev\` and \`curr\` |
| **Loop invariant** | a fact true before and after every loop step |
| **Base case** | the input small enough to answer without recursing |
| **Destructuring assignment** | \`[a, b] = [x, y]\`: build the right-hand array first, then assign targets left to right |

---
**Conclusion:** Reversing a linked list is one pass with three pointers: save \`nxt\`, flip \`curr.next\` to \`prev\`, advance both, and return \`prev\`. That is O(n) time and O(1) extra space. The recursive version is shorter but uses one stack frame per node and throws \`RangeError\` on long lists. In JavaScript, what earns the marks is the order of the four moves, defaulting \`next\` to \`null\` so the loop test is reliable, and spotting the accidental cycle when \`head.next = null\` is forgotten.`,
        examples: [
          { label: `Iterative reversal with three pointers`, code: `class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

function build(values) {
  const dummy = new ListNode(0);
  let tail = dummy;
  for (const v of values) {
    tail.next = new ListNode(v);
    tail = tail.next;
  }
  return dummy.next;
}

function toList(head) {
  const out = [];
  while (head !== null) {
    out.push(head.val);
    head = head.next;
  }
  return out;
}

const fmt = (arr) => '[' + arr.join(', ') + ']';

function reverseList(head) {
  let prev = null;
  let curr = head;
  while (curr !== null) {
    const nxt = curr.next; // 1. remember the rest of the list
    curr.next = prev;      // 2. flip this arrow
    prev = curr;           // 3. step prev forward
    curr = nxt;            // 4. step curr forward
  }
  return prev;             // prev is the new head
}

console.log(fmt(toList(reverseList(build([1, 2, 3, 4, 5]))))); // [5, 4, 3, 2, 1]
console.log(fmt(toList(reverseList(build([]))))); // []
console.log(fmt(toList(reverseList(build([7]))))); // [7]
console.log(fmt(toList(reverseList(build([1, 2]))))); // [2, 1]

const head = build([1, 2, 3]);
const newHead = reverseList(head);
console.log('old head ' + head.val + ' is now the tail: ' + (head.next === null));
console.log('new head value: ' + newHead.val);` },
          { label: `Recursive reversal and the call depth it needs`, code: `class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

function build(values) {
  const dummy = new ListNode(0);
  let tail = dummy;
  for (const v of values) {
    tail.next = new ListNode(v);
    tail = tail.next;
  }
  return dummy.next;
}

function toList(head) {
  const out = [];
  for (let n = head; n !== null; n = n.next) out.push(n.val);
  return out;
}

const fmt = (arr) => '[' + arr.join(', ') + ']';

let maxDepth = 0;

function reverseRecursive(head, depth = 1) {
  maxDepth = Math.max(maxDepth, depth);
  if (head === null || head.next === null) return head; // base case: 0 or 1 node
  const newHead = reverseRecursive(head.next, depth + 1);
  head.next.next = head; // the node after me now points back at me
  head.next = null;      // and I become the tail of the reversed part
  return newHead;
}

function reverseIterative(head) {
  let prev = null;
  let curr = head;
  while (curr !== null) {
    const nxt = curr.next;
    curr.next = prev;
    prev = curr;
    curr = nxt;
  }
  return prev;
}

for (const values of [[1, 2, 3, 4, 5], [], [9], [4, 8]]) {
  maxDepth = 0;
  const result = toList(reverseRecursive(build(values)));
  console.log(fmt(result) + ' recursion depth ' + maxDepth);
}

maxDepth = 0;
reverseRecursive(build(Array.from({ length: 500 }, (_, i) => i)));
console.log('n=500: recursion depth ' + maxDepth + ', iterative needs 3 pointer variables');

const values = Array.from({ length: 10 }, (_, i) => i + 1);
const twice = toList(reverseIterative(reverseIterative(build(values))));
console.log('reverse twice gives the original: ' + (fmt(twice) === fmt(values)));` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given the head of a singly linked list, reverse it and return the new head. Write it in Java, and tell me how much extra memory it uses."

**What a strong answer should cover:**
- The idea: walk the list once and point every node's \`next\` at the node before it, so the old tail becomes the head.
- Three pointers (\`prev\`, \`curr\`, \`next\`) and why the next node must be saved before the arrow is flipped.
- O(n) time and O(1) extra space for the iterative version; the recursive version is O(n) time but O(n) call-stack space.
- Edge cases: empty list, one node, two nodes, and returning the new head rather than the old one.
- Java specifics: a \`static\` nested \`ListNode\` class, references versus copies, \`NullPointerException\` on a bad dereference, and \`StackOverflowError\` for deep recursion.

**Clarifying questions expected:**
- "Singly or doubly linked, and may I change the nodes in place or must I build a new list?"
- "How long can the list be? That decides whether recursion is safe."

**Code / implementation expected:** Yes — a Java \`static ListNode reverseList(ListNode head)\` with \`prev\` / \`curr\` / \`nxt\`, ideally plus the recursive version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture a treasure hunt. Each clue card says where the next clue is hidden: card 1 says "look under the mat", the mat card says "look in the fridge", and so on until the last card says "the end". You only ever hold the first card.

Now the organiser asks you to run the hunt **backwards** for the next group, starting from the prize. You cannot photocopy the cards and you have no table to spread them out on. What you can do is walk the route once, and at every stop rewrite the card so it points to the place you just came from instead of the place you are going. The one rule: before you rewrite a card, read where it points, or you will never find the rest of the route.

That is reversing a linked list. The cards are **nodes**, the "where to look next" line is the \`next\` pointer, and the rule about reading before rewriting is the single bug that catches most candidates. It also matters beyond interviews: the same move is used to reverse part of a list, to [check whether a linked list is a palindrome](/interview-question/how-do-you-check-if-a-linked-list-is-a-palindrome), and to [add two numbers stored as linked lists](/interview-question/how-do-you-add-two-numbers-stored-as-linked-lists) when the digits come in the wrong order.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the list singly or doubly linked? | A doubly linked list also needs every \`prev\` pointer swapped; this page covers the singly linked case. |
| May I modify the nodes in place? | In place is O(1) extra space; if the original must survive, you have to build a new reversed list in O(n) space. |
| How long can the list be? | Tens of thousands of nodes rule out the recursive version because of call-stack depth. |
| What should an empty list return? | The empty list reversed is still empty; confirm you return the null value rather than raising an error. |
| Reverse the whole list, or only part of it? | Reversing positions m to n or groups of k uses the same loop with extra bookkeeping. |

## 3. What a Linked List Is (in One Minute)

A **linked list** stores items in separate little boxes called **nodes**. Each node holds a value and a pointer (a reference) to the next node. You keep only the first node; to reach the fifth item you must follow four pointers. This is different from an array, where items sit side by side and you can jump straight to any index; the trade-offs are covered in [array vs linked list](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).

📌 **Interview term: Singly linked list** — a chain of nodes where each node knows only the node after it, never the one before it.

📌 **Interview term: Head** — the first node of the list; the only node you are given directly.

📌 **Interview term: Null terminator** — the empty value (\`null\` in Java) stored in the last node's \`next\`, marking the end of the list.

<svg class="iq-diagram" width="100%" viewBox="0 0 670 160" role="img" aria-label="A singly linked list 1 to 2 to 3 to 4, the last node points to null">
  <defs>
    <marker id="rev1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="40" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="40" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="40" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="40" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="560" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="40" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 35 L 164 35" marker-end="url(#rev1-arrow)"/>
  <path class="d-edge" d="M 244 35 L 294 35" marker-end="url(#rev1-arrow)"/>
  <path class="d-edge" d="M 374 35 L 424 35" marker-end="url(#rev1-arrow)"/>
  <path class="d-edge" d="M 504 35 L 554 35" marker-end="url(#rev1-arrow)"/>
  <path class="d-edge-accent" d="M 75 104 L 75 68" marker-end="url(#rev1-arrow)"/>
  <text class="d-text d-accent" x="75" y="122" text-anchor="middle">head</text>
</svg>

The list \`1, 2, 3, 4\` is four nodes. The arrows are the \`next\` pointers; the last one points to \`null\`. Because each node only knows its successor, "reverse" cannot mean "read it from the back": there is no way to walk backwards. It has to mean "rewrite the arrows".

## 4. Brute Force First

The first idea most people have: walk the list, copy the values into an array (or push them on a stack), then walk the list again writing the values back in reverse order, or build brand-new nodes from the copy.

It works and it is O(n) time, but it costs **O(n) extra memory** for the copy, and if you build new nodes, any other code holding a reference to the old nodes still sees the old order. The interviewer is waiting for the version that rewires the nodes you already have and uses only a few extra variables.

📌 **Interview term: In place** — the algorithm rearranges the input itself and uses only O(1) extra memory (a fixed number of variables), however long the input is.

## 5. The Core Idea: Flip Every Arrow with Three Pointers

Walk the list once. At each node, make its \`next\` point **backwards** to the node you came from. You need three pointers to do this without losing anything:

- \`prev\` — the head of the part that is already reversed (starts as \`null\`, because the first node will become the tail).
- \`curr\` — the node you are flipping now (starts at \`head\`).
- \`nxt\` — a saved copy of \`curr.next\`, taken **before** you overwrite it, so you can still reach the rest of the list.

📌 **Interview term: Three-pointer reversal** — the standard in-place reversal: save \`next\`, point \`curr\` back at \`prev\`, then move \`prev\` and \`curr\` one step forward.

Here is the state after two loop steps on \`1, 2, 3, 4\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 800 190" role="img" aria-label="Halfway through the reversal, nodes 1 and 2 already point backwards, prev is on 2 and curr is on 3">
  <defs>
    <marker id="rev2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">after two steps</text>
  <rect class="d-box-muted" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">null</text>
  <rect class="d-box-accent" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">2</text>
  <rect class="d-box" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="560" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="70" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="690" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="70" text-anchor="middle">null</text>
  <path class="d-edge-accent" d="M 166 65 L 116 65" marker-end="url(#rev2-arrow)"/>
  <path class="d-edge-accent" d="M 296 65 L 246 65" marker-end="url(#rev2-arrow)"/>
  <path class="d-edge" d="M 504 65 L 554 65" marker-end="url(#rev2-arrow)"/>
  <path class="d-edge" d="M 634 65 L 684 65" marker-end="url(#rev2-arrow)"/>
  <path class="d-edge-accent" d="M 335 134 L 335 98" marker-end="url(#rev2-arrow)"/>
  <text class="d-text d-accent" x="335" y="152" text-anchor="middle">prev</text>
  <path class="d-edge" d="M 465 134 L 465 98" marker-end="url(#rev2-arrow)"/>
  <text class="d-text" x="465" y="152" text-anchor="middle">curr</text>
</svg>

Nodes 1 and 2 (highlighted) already point backwards, and node 1 points to \`null\` because it will be the tail. \`prev\` holds the reversed part \`2, 1\`; \`curr\` holds the untouched part \`3, 4\`. Notice that node 2 no longer points at node 3: if we had not kept \`curr\`, node 3 and everything after it would be unreachable.

The four moves of one step, for the whole run on \`1, 2, 3\` (the dash means \`null\`):

| Step | \`nxt\` saved | Arrow flipped | \`prev\` after | \`curr\` after |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 2 | 1 now points to — | 1 | 2 |
| 2 | 3 | 2 now points to 1 | 2 | 3 |
| 3 | — | 3 now points to 2 | 3 | — |

When \`curr\` becomes \`null\` the loop stops, and \`prev\` is the old tail, which is the new head:

<svg class="iq-diagram" width="100%" viewBox="0 0 670 160" role="img" aria-label="The finished reversal 4 to 3 to 2 to 1, the old head 1 is now the tail">
  <defs>
    <marker id="rev3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="40" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="170" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="40" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="300" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="40" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="430" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="40" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="560" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="40" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 35 L 164 35" marker-end="url(#rev3-arrow)"/>
  <path class="d-edge" d="M 244 35 L 294 35" marker-end="url(#rev3-arrow)"/>
  <path class="d-edge" d="M 374 35 L 424 35" marker-end="url(#rev3-arrow)"/>
  <path class="d-edge" d="M 504 35 L 554 35" marker-end="url(#rev3-arrow)"/>
  <path class="d-edge-accent" d="M 75 104 L 75 68" marker-end="url(#rev3-arrow)"/>
  <text class="d-text d-accent" x="75" y="122" text-anchor="middle">new head</text>
  <path class="d-edge" d="M 465 104 L 465 68" marker-end="url(#rev3-arrow)"/>
  <text class="d-text" x="465" y="122" text-anchor="middle">old head</text>
</svg>

📌 **Interview term: Loop invariant** — a statement true before and after every loop step. Here: "\`prev\` is the head of the already-reversed prefix, and \`curr\` is the head of the untouched suffix." Saying it out loud is the quickest way to convince an interviewer the code is right.

## 6. The Code in Java

In Java a node is a small \`static\` nested class. Fields of object type start as \`null\`, so a new node's \`next\` is already \`null\` without writing it. Variables such as \`prev\` and \`curr\` hold **references** (addresses of objects), so \`curr.next = prev\` changes one arrow and never copies a node.

~~~java
static class ListNode {
    int val;
    ListNode next;
    ListNode(int val) { this.val = val; }
}
~~~

The reversal:

~~~java
static ListNode reverseList(ListNode head) {
    ListNode prev = null;
    ListNode curr = head;
    while (curr != null) {
        ListNode nxt = curr.next; // 1. remember the rest of the list
        curr.next = prev;         // 2. flip this arrow
        prev = curr;              // 3. step prev forward
        curr = nxt;               // 4. step curr forward
    }
    return prev;                  // prev is the new head
}
~~~

**Line by line:**

- \`ListNode prev = null\`: the reversed part starts empty, and the first node must end up pointing to \`null\` because it becomes the tail.
- \`ListNode nxt = curr.next\` must come **before** \`curr.next = prev\`. Once the arrow is flipped, nothing refers to the rest of the list, and the garbage collector would reclaim it.
- \`while (curr != null)\`: \`!=\` on references compares identity, which is exactly the "have we fallen off the end" question.
- If you get the order wrong and touch a field of \`null\`, Java throws \`NullPointerException\`. Since JEP 358 ([openjdk.org/jeps/358](https://openjdk.org/jeps/358), delivered in JDK 14) the message names the field; on the JDK 21 used for this page, reading \`.next\` of a \`null\` local printed:

~~~text
java.lang.NullPointerException: Cannot read field "next" because "<local1>" is null
~~~

  (\`<local1>\` becomes the variable name when the class is compiled with \`javac -g\`.)

📌 **Interview term: Reference** — a Java variable of class type holds a reference to an object, not the object itself; assigning a reference (\`prev = curr\`) copies the address, never the node.

## 7. The Recursive Version

Recursion gives a second, shorter answer that interviewers often ask for as a follow-up. If you are new to recursion, read [what recursion and a base case are](/interview-question/what-is-recursion-and-what-is-a-base-case) first.

~~~java
static ListNode reverseRecursive(ListNode head, int depth) {
    maxDepth = Math.max(maxDepth, depth);
    if (head == null || head.next == null) return head; // base case: 0 or 1 node
    ListNode newHead = reverseRecursive(head.next, depth + 1);
    head.next.next = head; // the node after me now points back at me
    head.next = null;      // and I become the tail of the reversed part
    return newHead;
}
~~~

How to read it: "to reverse the list starting at \`head\`, first reverse everything after \`head\`; that returns the new head (the old tail). Now the node right after \`head\` is the last node of the reversed part, so make it point back at \`head\`, and make \`head\` the new tail." The base case is an empty list or a single node, which is already its own reverse. (\`depth\` only exists so Example 2 can count how deep the calls go.)

📌 **Interview term: Base case** — the input small enough to answer without another recursive call; here, zero or one node.

Each call waits for the call on the next node, so a list of n nodes needs n frames on the thread stack at the same time. When the stack runs out the JVM throws \`StackOverflowError\` (an \`Error\`, not an \`Exception\`, so a \`catch (Exception e)\` does not catch it). A 10-million-deep recursion here ended in exactly that. How deep you can go depends on the thread stack size (\`java -Xss...\`) and the frame size, so there is no fixed number to quote. The iterative version has no such limit.

For how stack depth counts as memory, see [space complexity and recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 8. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Iterative reversal with three pointers** prints:

~~~text
[5, 4, 3, 2, 1]
[]
[7]
[2, 1]
old head 1 is now the tail: true
new head value: 3
~~~

**Example 2 — Recursive reversal and the call depth it needs** prints:

~~~text
[5, 4, 3, 2, 1] recursion depth 5
[] recursion depth 1
[9] recursion depth 1
[8, 4] recursion depth 2
n=500: recursion depth 500, iterative needs 3 pointer variables
reverse twice gives the original: true
~~~

**What the numbers show:** Example 1 covers the empty, one-node and two-node lists, and proves the caller's old \`head\` is now the tail, which is why the function must return \`prev\`. Example 2 shows the recursive version gives the same answers but needs one stack frame per node (depth 500 for 500 nodes), and that reversing twice gives back the original list.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy values, then write back or rebuild | O(n) | O(n) | one pass to copy, one pass to write; the copy holds n values |
| Iterative three pointers | O(n) | O(1) | each node is visited once; only \`prev\`, \`curr\`, \`nxt\` are stored |
| Recursive | O(n) | O(n) | one call per node, and all n calls are on the stack at the deepest point |

Example 2 shows the recursive cost directly: a 500-node list needed a recursion depth of 500, while the loop needs the same three variables for any length. For a refresher on the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 10. Edge Cases

- **Empty list** (\`head\` is \`null\`): the loop body never runs and the function returns \`prev\`, which is \`null\`. Example 1 prints \`[]\`.
- **One node:** one step; the node's \`next\` is set to \`null\` (it already was) and it is returned. Example 1 prints \`[7]\`.
- **Two nodes:** the smallest case where an arrow really flips; good for a dry run on the whiteboard. Example 1 prints \`[2, 1]\`.
- **The caller's old \`head\` variable:** after reversal it points at the tail. Example 1 checks this: \`old head 1 is now the tail: true\`.
- **A list with a cycle:** reversal never terminates on a cyclic list. If the input might be cyclic, [detect the cycle](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list) first.

## Common Pitfalls

- **Returning \`head\` instead of \`prev\`.** After the loop \`head\` still references the old first node, which is now the tail, so the caller sees a one-element list.
- **Flipping before saving.** \`curr.next = prev\` first, then \`nxt = curr.next\`, reads the reference you just changed and loses the rest of the list.
- **\`NullPointerException\` on the last step.** Any \`curr.next.next\` written without checking \`curr.next != null\` crashes on the tail; the iterative version never needs it.
- **Recursing on long lists.** Deep recursion ends in \`StackOverflowError\`, which \`catch (Exception e)\` does not catch because it is an \`Error\`.
- **Reaching for \`java.util.LinkedList\`.** It is a doubly linked list ([Javadoc](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/LinkedList.html)) and \`Collections.reverse\` works on it, but the interviewer wants you to rewire nodes yourself, not call a library.
- **Forgetting \`head.next = null\` in the recursive version.** Nodes 1 and 2 point at each other, and any loop that prints the list never ends.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Walk the list once and turn every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> reference around, so the last node becomes the head.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Three pointers:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> is the reversed part, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curr</code> is the node being flipped, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nxt</code> saves the rest before I overwrite <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curr.next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The loop:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode nxt = curr.next; curr.next = prev; prev = curr; curr = nxt;</code> until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curr == null</code>, then return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space; the recursive version uses O(n) thread stack.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java details:</strong> <span style="color:#f0e2c8;">Only references move, nothing is copied; the recursive version risks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>, which is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Error</code> and not caught by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">catch (Exception e)</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it recursively?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: reverse <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head.next</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head.next.next = head; head.next = null;</code> and return the deepest node. One frame per node, so long lists overflow the stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Collections.reverse</code> on a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LinkedList</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That reverses a library list, which is doubly linked. The question is about rewiring your own singly linked nodes in O(1) extra space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">val</code> were an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Integer</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reversal never compares values, so nothing changes. It would matter in a merge, where comparing two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> objects with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> compares references and breaks outside the -128 to 127 cache.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you reverse only positions m to n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Walk to the node before m, reverse the next n - m + 1 nodes with the same three pointers, then reconnect both ends. One pass, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you reverse in groups of k?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Check that k nodes remain, reverse them with the same loop, link the previous group tail to the new group head, and move on. O(n) time, O(1) space.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Singly linked list** | nodes that each point only to the next node |
| **Head** | the first node; the one you are given |
| **Null terminator** | the empty value in the last node's \`next\` |
| **In place** | rearranging the input itself with O(1) extra memory |
| **Three-pointer reversal** | save \`next\`, point back at \`prev\`, advance \`prev\` and \`curr\` |
| **Loop invariant** | a fact true before and after every loop step |
| **Base case** | the input small enough to answer without recursing |
| **Reference** | a variable that holds the address of an object; assigning it never copies the object |

---
**Conclusion:** Reversing a linked list is one pass with three references: save \`nxt\`, flip \`curr.next\` to \`prev\`, advance both, and return \`prev\`. That is O(n) time and O(1) extra space, and no node is ever copied. The recursive version is shorter but uses one stack frame per node and ends in \`StackOverflowError\` on long lists. In Java, what earns the marks is the order of the four moves, \`null\` safety, and knowing that this is about your own nodes, not \`java.util.LinkedList\`.`,
        examples: [
          { label: `Iterative reversal with three pointers`, code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    static ListNode build(int... values) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        for (int v : values) {
            tail.next = new ListNode(v);
            tail = tail.next;
        }
        return dummy.next;
    }

    static String fmt(ListNode head) {
        List<String> out = new ArrayList<>();
        for (ListNode n = head; n != null; n = n.next) out.add(String.valueOf(n.val));
        return "[" + String.join(", ", out) + "]";
    }

    static ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode curr = head;
        while (curr != null) {
            ListNode nxt = curr.next; // 1. remember the rest of the list
            curr.next = prev;         // 2. flip this arrow
            prev = curr;              // 3. step prev forward
            curr = nxt;               // 4. step curr forward
        }
        return prev;                  // prev is the new head
    }

    public static void main(String[] args) {
        System.out.println(fmt(reverseList(build(1, 2, 3, 4, 5)))); // [5, 4, 3, 2, 1]
        System.out.println(fmt(reverseList(build())));              // []
        System.out.println(fmt(reverseList(build(7))));             // [7]
        System.out.println(fmt(reverseList(build(1, 2))));          // [2, 1]

        ListNode head = build(1, 2, 3);
        ListNode newHead = reverseList(head);
        System.out.println("old head " + head.val + " is now the tail: " + (head.next == null));
        System.out.println("new head value: " + newHead.val);
    }
}` },
          { label: `Recursive reversal and the call depth it needs`, code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    static ListNode build(List<Integer> values) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        for (int v : values) {
            tail.next = new ListNode(v);
            tail = tail.next;
        }
        return dummy.next;
    }

    static List<Integer> toList(ListNode head) {
        List<Integer> out = new ArrayList<>();
        for (ListNode n = head; n != null; n = n.next) out.add(n.val);
        return out;
    }

    static int maxDepth = 0;

    static ListNode reverseRecursive(ListNode head, int depth) {
        maxDepth = Math.max(maxDepth, depth);
        if (head == null || head.next == null) return head; // base case: 0 or 1 node
        ListNode newHead = reverseRecursive(head.next, depth + 1);
        head.next.next = head; // the node after me now points back at me
        head.next = null;      // and I become the tail of the reversed part
        return newHead;
    }

    static ListNode reverseIterative(ListNode head) {
        ListNode prev = null, curr = head;
        while (curr != null) {
            ListNode nxt = curr.next;
            curr.next = prev;
            prev = curr;
            curr = nxt;
        }
        return prev;
    }

    public static void main(String[] args) {
        List<List<Integer>> cases = List.of(List.of(1, 2, 3, 4, 5), List.of(), List.of(9), List.of(4, 8));
        for (List<Integer> values : cases) {
            maxDepth = 0;
            List<Integer> result = toList(reverseRecursive(build(values), 1));
            System.out.println(result + " recursion depth " + maxDepth);
        }

        List<Integer> big = new ArrayList<>();
        for (int i = 0; i < 500; i++) big.add(i);
        maxDepth = 0;
        reverseRecursive(build(big), 1);
        System.out.println("n=500: recursion depth " + maxDepth + ", iterative needs 3 pointer variables");

        List<Integer> values = new ArrayList<>();
        for (int i = 1; i <= 10; i++) values.add(i);
        List<Integer> twice = toList(reverseIterative(reverseIterative(build(values))));
        System.out.println("reverse twice gives the original: " + twice.equals(values));
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given the head of a singly linked list, reverse it and return the new head. Write it in C++, and tell me how much extra memory it uses."

**What a strong answer should cover:**
- The idea: walk the list once and point every node's \`next\` at the node before it, so the old tail becomes the head.
- Three pointers (\`prev\`, \`curr\`, \`next\`) and why the next node must be saved before the arrow is flipped.
- O(n) time and O(1) extra space for the iterative version; the recursive version is O(n) time but O(n) call-stack space.
- Edge cases: empty list, one node, two nodes, and returning the new head rather than the old one.
- C++ specifics: \`ListNode*\` and \`nullptr\`, no allocation or \`delete\` during reversal, undefined behaviour on a null dereference, and the member \`std::forward_list::reverse()\`.

**Clarifying questions expected:**
- "Singly or doubly linked, and may I change the nodes in place or must I build a new list?"
- "How long can the list be? That decides whether recursion is safe."

**Code / implementation expected:** Yes — a C++ \`ListNode* reverseList(ListNode* head)\` with \`prev\` / \`curr\` / \`nxt\`, ideally plus the recursive version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture a treasure hunt. Each clue card says where the next clue is hidden: card 1 says "look under the mat", the mat card says "look in the fridge", and so on until the last card says "the end". You only ever hold the first card.

Now the organiser asks you to run the hunt **backwards** for the next group, starting from the prize. You cannot photocopy the cards and you have no table to spread them out on. What you can do is walk the route once, and at every stop rewrite the card so it points to the place you just came from instead of the place you are going. The one rule: before you rewrite a card, read where it points, or you will never find the rest of the route.

That is reversing a linked list. The cards are **nodes**, the "where to look next" line is the \`next\` pointer, and the rule about reading before rewriting is the single bug that catches most candidates. It also matters beyond interviews: the same move is used to reverse part of a list, to [check whether a linked list is a palindrome](/interview-question/how-do-you-check-if-a-linked-list-is-a-palindrome), and to [add two numbers stored as linked lists](/interview-question/how-do-you-add-two-numbers-stored-as-linked-lists) when the digits come in the wrong order.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the list singly or doubly linked? | A doubly linked list also needs every \`prev\` pointer swapped; this page covers the singly linked case. |
| May I modify the nodes in place? | In place is O(1) extra space; if the original must survive, you have to build a new reversed list in O(n) space. |
| How long can the list be? | Tens of thousands of nodes rule out the recursive version because of call-stack depth. |
| What should an empty list return? | The empty list reversed is still empty; confirm you return the null value rather than raising an error. |
| Reverse the whole list, or only part of it? | Reversing positions m to n or groups of k uses the same loop with extra bookkeeping. |

## 3. What a Linked List Is (in One Minute)

A **linked list** stores items in separate little boxes called **nodes**. Each node holds a value and a pointer (a reference) to the next node. You keep only the first node; to reach the fifth item you must follow four pointers. This is different from an array, where items sit side by side and you can jump straight to any index; the trade-offs are covered in [array vs linked list](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).

📌 **Interview term: Singly linked list** — a chain of nodes where each node knows only the node after it, never the one before it.

📌 **Interview term: Head** — the first node of the list; the only node you are given directly.

📌 **Interview term: Null terminator** — the empty value (\`nullptr\` in C++) stored in the last node's \`next\`, marking the end of the list.

<svg class="iq-diagram" width="100%" viewBox="0 0 670 160" role="img" aria-label="A singly linked list 1 to 2 to 3 to 4, the last node points to nullptr">
  <defs>
    <marker id="rev1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="40" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="40" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="40" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="40" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="560" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="40" text-anchor="middle">nullptr</text>
  <path class="d-edge" d="M 114 35 L 164 35" marker-end="url(#rev1-arrow)"/>
  <path class="d-edge" d="M 244 35 L 294 35" marker-end="url(#rev1-arrow)"/>
  <path class="d-edge" d="M 374 35 L 424 35" marker-end="url(#rev1-arrow)"/>
  <path class="d-edge" d="M 504 35 L 554 35" marker-end="url(#rev1-arrow)"/>
  <path class="d-edge-accent" d="M 75 104 L 75 68" marker-end="url(#rev1-arrow)"/>
  <text class="d-text d-accent" x="75" y="122" text-anchor="middle">head</text>
</svg>

The list \`1, 2, 3, 4\` is four nodes. The arrows are the \`next\` pointers; the last one points to \`nullptr\`. Because each node only knows its successor, "reverse" cannot mean "read it from the back": there is no way to walk backwards. It has to mean "rewrite the arrows".

## 4. Brute Force First

The first idea most people have: walk the list, copy the values into an array (or push them on a stack), then walk the list again writing the values back in reverse order, or build brand-new nodes from the copy.

It works and it is O(n) time, but it costs **O(n) extra memory** for the copy, and if you build new nodes, any other code holding a reference to the old nodes still sees the old order. The interviewer is waiting for the version that rewires the nodes you already have and uses only a few extra variables.

📌 **Interview term: In place** — the algorithm rearranges the input itself and uses only O(1) extra memory (a fixed number of variables), however long the input is.

## 5. The Core Idea: Flip Every Arrow with Three Pointers

Walk the list once. At each node, make its \`next\` point **backwards** to the node you came from. You need three pointers to do this without losing anything:

- \`prev\` — the head of the part that is already reversed (starts as \`nullptr\`, because the first node will become the tail).
- \`curr\` — the node you are flipping now (starts at \`head\`).
- \`nxt\` — a saved copy of \`curr->next\`, taken **before** you overwrite it, so you can still reach the rest of the list.

📌 **Interview term: Three-pointer reversal** — the standard in-place reversal: save \`next\`, point \`curr\` back at \`prev\`, then move \`prev\` and \`curr\` one step forward.

Here is the state after two loop steps on \`1, 2, 3, 4\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 800 190" role="img" aria-label="Halfway through the reversal, nodes 1 and 2 already point backwards, prev is on 2 and curr is on 3">
  <defs>
    <marker id="rev2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">after two steps</text>
  <rect class="d-box-muted" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">nullptr</text>
  <rect class="d-box-accent" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">2</text>
  <rect class="d-box" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="560" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="70" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="690" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="70" text-anchor="middle">nullptr</text>
  <path class="d-edge-accent" d="M 166 65 L 116 65" marker-end="url(#rev2-arrow)"/>
  <path class="d-edge-accent" d="M 296 65 L 246 65" marker-end="url(#rev2-arrow)"/>
  <path class="d-edge" d="M 504 65 L 554 65" marker-end="url(#rev2-arrow)"/>
  <path class="d-edge" d="M 634 65 L 684 65" marker-end="url(#rev2-arrow)"/>
  <path class="d-edge-accent" d="M 335 134 L 335 98" marker-end="url(#rev2-arrow)"/>
  <text class="d-text d-accent" x="335" y="152" text-anchor="middle">prev</text>
  <path class="d-edge" d="M 465 134 L 465 98" marker-end="url(#rev2-arrow)"/>
  <text class="d-text" x="465" y="152" text-anchor="middle">curr</text>
</svg>

Nodes 1 and 2 (highlighted) already point backwards, and node 1 points to \`nullptr\` because it will be the tail. \`prev\` holds the reversed part \`2, 1\`; \`curr\` holds the untouched part \`3, 4\`. Notice that node 2 no longer points at node 3: if we had not kept \`curr\`, node 3 and everything after it would be unreachable.

The four moves of one step, for the whole run on \`1, 2, 3\` (the dash means \`nullptr\`):

| Step | \`nxt\` saved | Arrow flipped | \`prev\` after | \`curr\` after |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 2 | 1 now points to — | 1 | 2 |
| 2 | 3 | 2 now points to 1 | 2 | 3 |
| 3 | — | 3 now points to 2 | 3 | — |

When \`curr\` becomes \`nullptr\` the loop stops, and \`prev\` is the old tail, which is the new head:

<svg class="iq-diagram" width="100%" viewBox="0 0 670 160" role="img" aria-label="The finished reversal 4 to 3 to 2 to 1, the old head 1 is now the tail">
  <defs>
    <marker id="rev3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="40" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="170" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="40" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="300" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="40" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="430" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="40" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="560" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="40" text-anchor="middle">nullptr</text>
  <path class="d-edge" d="M 114 35 L 164 35" marker-end="url(#rev3-arrow)"/>
  <path class="d-edge" d="M 244 35 L 294 35" marker-end="url(#rev3-arrow)"/>
  <path class="d-edge" d="M 374 35 L 424 35" marker-end="url(#rev3-arrow)"/>
  <path class="d-edge" d="M 504 35 L 554 35" marker-end="url(#rev3-arrow)"/>
  <path class="d-edge-accent" d="M 75 104 L 75 68" marker-end="url(#rev3-arrow)"/>
  <text class="d-text d-accent" x="75" y="122" text-anchor="middle">new head</text>
  <path class="d-edge" d="M 465 104 L 465 68" marker-end="url(#rev3-arrow)"/>
  <text class="d-text" x="465" y="122" text-anchor="middle">old head</text>
</svg>

📌 **Interview term: Loop invariant** — a statement true before and after every loop step. Here: "\`prev\` is the head of the already-reversed prefix, and \`curr\` is the head of the untouched suffix." Saying it out loud is the quickest way to convince an interviewer the code is right.

## 6. The Code in C++

In C++ a node is a \`struct\` holding a value and a raw pointer \`ListNode* next\`. The end of the list is \`nullptr\` (the C++11 null pointer literal; prefer it over \`NULL\` or \`0\`). The examples keep every node in a \`std::vector<std::unique_ptr<ListNode>>\` pool so all memory is freed when the program ends; the reversal itself only rewires pointers and never allocates or frees anything.

~~~cpp
struct ListNode {
    int val;
    ListNode* next;
    explicit ListNode(int v) : val(v), next(nullptr) {}
};
~~~

The reversal:

~~~cpp
ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* curr = head;
    while (curr != nullptr) {
        ListNode* nxt = curr->next; // 1. remember the rest of the list
        curr->next = prev;          // 2. flip this arrow
        prev = curr;                // 3. step prev forward
        curr = nxt;                 // 4. step curr forward
    }
    return prev;                    // prev is the new head
}
~~~

**Line by line:**

- \`ListNode* prev = nullptr\`: the reversed part starts empty, and the first node must end up pointing to \`nullptr\` because it becomes the tail.
- \`ListNode* nxt = curr->next\` must come **before** \`curr->next = prev\`. Once the arrow is flipped, the only pointer to the rest of the list is gone. C++ has no garbage collector, so this is a memory **leak** as well as a wrong answer.
- \`curr->next\` is shorthand for \`(*curr).next\`. Doing it on \`nullptr\` is undefined behaviour (usually a segmentation fault), which is why the loop tests \`curr != nullptr\` first.
- C++14 added \`std::exchange\` (in \`<utility>\`), which sets a variable and returns its old value. The whole loop body becomes \`prev = std::exchange(curr, std::exchange(curr->next, prev));\` (the inner call flips the arrow and returns the old \`next\`; the outer call moves \`curr\` there and hands the old \`curr\` to \`prev\`). It printed \`3 2 1\` on \`[1, 2, 3]\`. It is neat, but the four named lines are easier to explain on a whiteboard.

📌 **Interview term: Undefined behaviour (UB)** — code the C++ standard gives no meaning to, such as dereferencing \`nullptr\`; the program may crash, print garbage or appear to work.

## 7. The Recursive Version

Recursion gives a second, shorter answer that interviewers often ask for as a follow-up. If you are new to recursion, read [what recursion and a base case are](/interview-question/what-is-recursion-and-what-is-a-base-case) first.

~~~cpp
ListNode* reverseRecursive(ListNode* head, int depth = 1) {
    maxDepth = std::max(maxDepth, depth);
    if (head == nullptr || head->next == nullptr) return head; // base case: 0 or 1 node
    ListNode* newHead = reverseRecursive(head->next, depth + 1);
    head->next->next = head; // the node after me now points back at me
    head->next = nullptr;    // and I become the tail of the reversed part
    return newHead;
}
~~~

How to read it: "to reverse the list starting at \`head\`, first reverse everything after \`head\`; that returns the new head (the old tail). Now the node right after \`head\` is the last node of the reversed part, so make it point back at \`head\`, and make \`head\` the new tail." The base case is an empty list or a single node, which is already its own reverse. (\`depth\` only exists so Example 2 can count how deep the calls go.)

📌 **Interview term: Base case** — the input small enough to answer without another recursive call; here, zero or one node.

Each call waits for the call on the next node, so a list of n nodes needs n frames on the stack at the same time. C++ gives no exception when the stack runs out: the recursive version on a 10-million-node list here simply crashed with \`Segmentation fault\` (exit code 139). Compilers may turn some tail calls into loops at \`-O2\`, but this function does work after the recursive call returns, so you cannot rely on that. The iterative version is the safe one.

For how stack depth counts as memory, see [space complexity and recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 8. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Iterative reversal with three pointers** prints:

~~~text
[5, 4, 3, 2, 1]
[]
[7]
[2, 1]
old head 1 is now the tail: true
new head value: 3
~~~

**Example 2 — Recursive reversal and the call depth it needs** prints:

~~~text
[5, 4, 3, 2, 1] recursion depth 5
[] recursion depth 1
[9] recursion depth 1
[8, 4] recursion depth 2
n=500: recursion depth 500, iterative needs 3 pointer variables
reverse twice gives the original: true
~~~

**What the numbers show:** Example 1 covers the empty, one-node and two-node lists, and proves the caller's old \`head\` is now the tail, which is why the function must return \`prev\`. Example 2 shows the recursive version gives the same answers but needs one stack frame per node (depth 500 for 500 nodes), and that reversing twice gives back the original list.

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy values, then write back or rebuild | O(n) | O(n) | one pass to copy, one pass to write; the copy holds n values |
| Iterative three pointers | O(n) | O(1) | each node is visited once; only \`prev\`, \`curr\`, \`nxt\` are stored |
| Recursive | O(n) | O(n) | one call per node, and all n calls are on the stack at the deepest point |

Example 2 shows the recursive cost directly: a 500-node list needed a recursion depth of 500, while the loop needs the same three variables for any length. For a refresher on the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 10. Edge Cases

- **Empty list** (\`head\` is \`nullptr\`): the loop body never runs and the function returns \`prev\`, which is \`nullptr\`. Example 1 prints \`[]\`.
- **One node:** one step; the node's \`next\` is set to \`nullptr\` (it already was) and it is returned. Example 1 prints \`[7]\`.
- **Two nodes:** the smallest case where an arrow really flips; good for a dry run on the whiteboard. Example 1 prints \`[2, 1]\`.
- **The caller's old \`head\` variable:** after reversal it points at the tail. Example 1 checks this: \`old head 1 is now the tail: true\`.
- **A list with a cycle:** reversal never terminates on a cyclic list. If the input might be cyclic, [detect the cycle](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list) first.

## Common Pitfalls

- **Returning \`head\` instead of \`prev\`.** After the loop \`head\` still points at the old first node, which is now the tail, so the caller sees a one-element list.
- **Flipping before saving.** \`curr->next = prev\` first, then \`nxt = curr->next\`, loses the only pointer to the rest of the list: a wrong answer and a memory leak.
- **Dereferencing \`nullptr\`.** \`curr->next->next\` on the tail is undefined behaviour; it may crash, or it may appear to work and corrupt memory.
- **Recursing on long lists.** There is no exception for running out of stack; the program just crashes (a 10-million-node recursion here ended in \`Segmentation fault\`).
- **Using \`std::reverse\` on a \`std::forward_list\`.** \`std::reverse\` needs bidirectional iterators; a singly linked \`std::forward_list\` has its own member \`reverse()\` instead ([cppreference](https://en.cppreference.com/w/cpp/container/forward_list/reverse)).
- **Deleting nodes while you walk.** If you also free nodes, save \`next\` before \`delete curr\`; reading \`curr->next\` after \`delete\` is use-after-free.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Walk the list once and turn every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> pointer around, so the last node becomes the head.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Three pointers:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> is the reversed part, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curr</code> is the node being flipped, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nxt</code> saves the rest before I overwrite <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curr-&gt;next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The loop:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode* nxt = curr-&gt;next; curr-&gt;next = prev; prev = curr; curr = nxt;</code> until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">curr == nullptr</code>, then return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space; no allocation and no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete</code>, just pointer writes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ details:</strong> <span style="color:#f0e2c8;">Never dereference <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code>, avoid recursion on long lists because stack overflow just crashes, and know that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::forward_list</code> has a member <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reverse()</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it recursively?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: reverse <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head-&gt;next</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head-&gt;next-&gt;next = head; head-&gt;next = nullptr;</code> and return the deepest node. One frame per node, and a stack overflow is a crash, not an exception.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Who owns the nodes after reversal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing changes ownership: the same nodes exist, only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> pointers moved. Whoever frees the list must now start from the new head.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you write it with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::exchange</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev = std::exchange(curr, std::exchange(curr-&gt;next, prev));</code> flips the arrow and advances in one statement. It is correct, but harder to explain than four lines.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you reverse only positions m to n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Walk to the node before m (a dummy node on the stack handles m = 1), reverse n - m + 1 nodes with the same pointers, then reconnect both ends.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the standard library offer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::forward_list::reverse()</code> reverses a singly linked list in place, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::list::reverse()</code> does the same for the doubly linked list; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::reverse</code> needs bidirectional iterators.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Singly linked list** | nodes that each point only to the next node |
| **Head** | the first node; the one you are given |
| **Null terminator** | the empty value in the last node's \`next\` |
| **In place** | rearranging the input itself with O(1) extra memory |
| **Three-pointer reversal** | save \`next\`, point back at \`prev\`, advance \`prev\` and \`curr\` |
| **Loop invariant** | a fact true before and after every loop step |
| **Base case** | the input small enough to answer without recursing |
| **Undefined behaviour (UB)** | code the standard gives no meaning to, such as dereferencing \`nullptr\` |

---
**Conclusion:** Reversing a linked list is one pass with three pointers: save \`nxt\`, flip \`curr->next\` to \`prev\`, advance both, and return \`prev\`. That is O(n) time and O(1) extra space, with no allocation and no \`delete\`. The recursive version is shorter but uses one stack frame per node, and in C++ a stack overflow is a crash, not an exception. What earns the marks is the order of the four moves, never dereferencing \`nullptr\`, and knowing that \`std::forward_list::reverse()\` exists.`,
        examples: [
          { label: `Iterative reversal with three pointers`, code: `#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct ListNode {
    int val;
    ListNode* next;
    explicit ListNode(int v) : val(v), next(nullptr) {}
};

// The pool owns every node, so all of them are freed when main returns.
std::vector<std::unique_ptr<ListNode>> pool;

ListNode* build(const std::vector<int>& values) {
    ListNode dummy(0);
    ListNode* tail = &dummy;
    for (int v : values) {
        pool.push_back(std::make_unique<ListNode>(v));
        tail->next = pool.back().get();
        tail = tail->next;
    }
    return dummy.next;
}

std::string fmt(const ListNode* head) {
    std::string s = "[";
    for (const ListNode* n = head; n != nullptr; n = n->next) {
        if (n != head) s += ", ";
        s += std::to_string(n->val);
    }
    return s + "]";
}

ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* curr = head;
    while (curr != nullptr) {
        ListNode* nxt = curr->next; // 1. remember the rest of the list
        curr->next = prev;          // 2. flip this arrow
        prev = curr;                // 3. step prev forward
        curr = nxt;                 // 4. step curr forward
    }
    return prev;                    // prev is the new head
}

int main() {
    std::cout << std::boolalpha;
    std::cout << fmt(reverseList(build({1, 2, 3, 4, 5}))) << "\\n"; // [5, 4, 3, 2, 1]
    std::cout << fmt(reverseList(build({}))) << "\\n";              // []
    std::cout << fmt(reverseList(build({7}))) << "\\n";             // [7]
    std::cout << fmt(reverseList(build({1, 2}))) << "\\n";          // [2, 1]

    ListNode* head = build({1, 2, 3});
    ListNode* newHead = reverseList(head);
    std::cout << "old head " << head->val << " is now the tail: " << (head->next == nullptr) << "\\n";
    std::cout << "new head value: " << newHead->val << "\\n";
}` },
          { label: `Recursive reversal and the call depth it needs`, code: `#include <algorithm>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct ListNode {
    int val;
    ListNode* next;
    explicit ListNode(int v) : val(v), next(nullptr) {}
};

std::vector<std::unique_ptr<ListNode>> pool; // owns every node

ListNode* build(const std::vector<int>& values) {
    ListNode dummy(0);
    ListNode* tail = &dummy;
    for (int v : values) {
        pool.push_back(std::make_unique<ListNode>(v));
        tail->next = pool.back().get();
        tail = tail->next;
    }
    return dummy.next;
}

std::vector<int> toVector(const ListNode* head) {
    std::vector<int> out;
    for (const ListNode* n = head; n != nullptr; n = n->next) out.push_back(n->val);
    return out;
}

std::string fmt(const std::vector<int>& v) {
    std::string s = "[";
    for (size_t i = 0; i < v.size(); ++i) s += (i ? ", " : "") + std::to_string(v[i]);
    return s + "]";
}

int maxDepth = 0;

ListNode* reverseRecursive(ListNode* head, int depth = 1) {
    maxDepth = std::max(maxDepth, depth);
    if (head == nullptr || head->next == nullptr) return head; // base case: 0 or 1 node
    ListNode* newHead = reverseRecursive(head->next, depth + 1);
    head->next->next = head; // the node after me now points back at me
    head->next = nullptr;    // and I become the tail of the reversed part
    return newHead;
}

ListNode* reverseIterative(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* curr = head;
    while (curr != nullptr) {
        ListNode* nxt = curr->next;
        curr->next = prev;
        prev = curr;
        curr = nxt;
    }
    return prev;
}

int main() {
    std::cout << std::boolalpha;
    std::vector<std::vector<int>> cases = {{1, 2, 3, 4, 5}, {}, {9}, {4, 8}};
    for (const auto& values : cases) {
        maxDepth = 0;
        std::vector<int> result = toVector(reverseRecursive(build(values)));
        std::cout << fmt(result) << " recursion depth " << maxDepth << "\\n";
    }

    std::vector<int> big(500);
    for (int i = 0; i < 500; ++i) big[i] = i;
    maxDepth = 0;
    reverseRecursive(build(big));
    std::cout << "n=500: recursion depth " << maxDepth << ", iterative needs 3 pointer variables\\n";

    std::vector<int> values;
    for (int i = 1; i <= 10; ++i) values.push_back(i);
    std::vector<int> twice = toVector(reverseIterative(reverseIterative(build(values))));
    std::cout << "reverse twice gives the original: " << (twice == values) << "\\n";
}` },
        ],
      },
    },
  },
  {
    title: `How do you merge two sorted linked lists?`,
    difficulty: "easy",
    seoDescription: `Merge two sorted linked lists in Python, JavaScript, Java and C++ with a dummy node: O(m+n) time, O(1) space, stability, recursion, verified code.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given the heads of two linked lists, each already sorted in ascending order. Merge them into one sorted list by splicing the existing nodes together, and return its head. Please write it in Python."

**What a strong answer should cover:**
- The idea: the smallest remaining value is always at the front of one of the two lists, so repeatedly take the smaller front node.
- A dummy (sentinel) node and a \`tail\` pointer, which remove the special case for the first node.
- Attaching the leftover list in one step when the other runs out.
- O(m + n) time and O(1) extra space for the loop; the recursive version uses O(m + n) stack.
- Stability: using \`<=\` so equal values keep list \`a\` first.
- Python specifics: \`is None\` checks, \`<=\` for stability, why \`heapq.merge\` does not apply to node objects, and the recursion limit for the recursive version.

**Clarifying questions expected:**
- "Can I reuse the input nodes, or must the original lists stay intact?"
- "Are there duplicates, and if so should ties come from the first list?"

**Code / implementation expected:** Yes — a Python \`merge_two_lists(a, b)\` with a dummy node, plus the recursive version if time allows.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Two teachers have each sorted their class's exam papers by score, lowest on top. The head teacher wants one pile for the whole year, still sorted. Nobody re-sorts 60 papers from scratch. Instead you put the two piles side by side, look at the two top papers, move the lower score onto the new pile, and repeat. When one pile is empty, you lift the whole other pile onto the new one in one go, because it is already in order.

That is merging two sorted linked lists. The piles are the lists, the top paper is the head node, and "move the paper" is just changing one pointer. Because you only ever compare the two top papers, the work is proportional to the total number of papers. This merge step is the heart of [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work), and it generalises to [merging k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists). The array version is a separate question, [merging two sorted arrays](/interview-question/how-do-you-merge-two-sorted-arrays); with lists there is no copying at all, only relinking.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| May I reuse (splice) the input nodes? | Splicing is O(1) extra space; if the inputs must stay intact you build new nodes in O(m + n) space. |
| Are both lists sorted ascending? | The algorithm relies on it; for descending order, flip the comparison. |
| What about equal values? | With \`<=\` ties take the node from the first list, which keeps the merge stable; ask if that matters. |
| Can either list be empty? | The answer is then simply the other list; the dummy node handles this without extra code. |
| How long can the lists be? | Long lists rule out the recursive version because of stack depth. |

## 3. The Core Idea: Always Take the Smaller Front Node

Keep one pointer at the front of each list (\`a\` and \`b\`). Compare their values, attach the smaller node to the end of the answer, and move that list's pointer forward. Stop when either list runs out, then attach the rest of the other.

<svg class="iq-diagram" width="100%" viewBox="0 0 540 370" role="img" aria-label="Two sorted input lists, a is 1 2 4 and b is 1 3 4, each ending in None">
  <defs>
    <marker id="mrg1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">list a</text>
  <rect class="d-box" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">None</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge-accent" d="M 75 134 L 75 98" marker-end="url(#mrg1-arrow)"/>
  <text class="d-text d-accent" x="75" y="152" text-anchor="middle">a</text>
  <text class="d-sub" x="40" y="206">list b</text>
  <rect class="d-box" x="40" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="250" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="250" text-anchor="middle">3</text>
  <rect class="d-box" x="300" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="250" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="430" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="250" text-anchor="middle">None</text>
  <path class="d-edge" d="M 114 245 L 164 245" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge" d="M 244 245 L 294 245" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge" d="M 374 245 L 424 245" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge-accent" d="M 75 314 L 75 278" marker-end="url(#mrg1-arrow)"/>
  <text class="d-text d-accent" x="75" y="332" text-anchor="middle">b</text>
</svg>

Both inputs are sorted. The answer must start with the smaller of the two heads, here a tie between two 1s.

📌 **Interview term: Merge step** — combining two sorted sequences into one sorted sequence by repeatedly taking the smaller front element; it is linear in the total length.

### The dummy node trick

The first node of the answer is special: before it exists there is no "end of the answer" to attach to. Rather than an \`if\` for that case, create a throw-away **dummy** node, let \`tail\` point at it, and always do \`tail.next = chosen; tail = tail.next\`. At the end, the real answer is \`dummy.next\`.

📌 **Interview term: Dummy (sentinel) node** — a placeholder node placed before the real head so the first insertion needs no special case; you return the node after it.

Here is the state after three nodes have been attached:

<svg class="iq-diagram" width="100%" viewBox="0 0 540 550" role="img" aria-label="Midway through the merge, the merged part is dummy 1 1 2 with tail on 2, a is on 4 and b is on 3">
  <defs>
    <marker id="mrg2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">merged so far</text>
  <rect class="d-box-muted" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">dummy</text>
  <rect class="d-box-accent" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">2</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge-accent" d="M 465 134 L 465 98" marker-end="url(#mrg2-arrow)"/>
  <text class="d-text d-accent" x="465" y="152" text-anchor="middle">tail</text>
  <text class="d-sub" x="40" y="206">rest of a</text>
  <rect class="d-box" x="40" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="250" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="170" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="250" text-anchor="middle">None</text>
  <path class="d-edge" d="M 114 245 L 164 245" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 75 314 L 75 278" marker-end="url(#mrg2-arrow)"/>
  <text class="d-text" x="75" y="332" text-anchor="middle">a</text>
  <text class="d-sub" x="40" y="386">rest of b</text>
  <rect class="d-box" x="40" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="430" text-anchor="middle">3</text>
  <rect class="d-box" x="170" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="430" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="300" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="430" text-anchor="middle">None</text>
  <path class="d-edge" d="M 114 425 L 164 425" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 244 425 L 294 425" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 75 494 L 75 458" marker-end="url(#mrg2-arrow)"/>
  <text class="d-text" x="75" y="512" text-anchor="middle">b</text>
</svg>

\`tail\` sits on the last attached node (2). The next comparison is \`a\` (4) against \`b\` (3); 3 is smaller, so \`b\`'s node is attached and \`b\` moves to the second 4.

When \`b\` has given up 3 and 4, \`b\` reaches \`None\` and the loop stops; the remaining \`a\` node (4) is attached in one step:

<svg class="iq-diagram" width="100%" viewBox="0 0 1060 160" role="img" aria-label="The finished merge dummy then 1 1 2 3 4 4, the answer starts at the node after dummy">
  <defs>
    <marker id="mrg3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="40" text-anchor="middle">dummy</text>
  <rect class="d-box-accent" x="170" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="40" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="300" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="40" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="430" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="40" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="560" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="40" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="690" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="40" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="820" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="855" y="40" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="950" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="985" y="40" text-anchor="middle">None</text>
  <path class="d-edge" d="M 114 35 L 164 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 244 35 L 294 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 374 35 L 424 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 504 35 L 554 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 634 35 L 684 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 764 35 L 814 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 894 35 L 944 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 75 104 L 75 68" marker-end="url(#mrg3-arrow)"/>
  <text class="d-text" x="75" y="122" text-anchor="middle">dummy</text>
  <path class="d-edge-accent" d="M 205 104 L 205 68" marker-end="url(#mrg3-arrow)"/>
  <text class="d-text d-accent" x="205" y="122" text-anchor="middle">dummy.next</text>
</svg>

The answer is everything after \`dummy\`. No node was copied: the same six nodes from the inputs are now linked in one chain.

### Why \`<=\` and not \`<\`

When values tie, \`<=\` takes the node from \`a\` first. With plain numbers you cannot tell the difference, but if the nodes are records sorted by a key (orders sorted by time, students by score), taking from \`a\` first keeps the original relative order of equal keys.

📌 **Interview term: Stable merge** — a merge in which equal elements keep their original relative order (all equal elements from the first list come before those from the second).

## 4. The Code in Python

The node is the usual two-attribute class; the end of a list is \`None\`.

~~~python
def merge_two_lists(a, b):
    dummy = ListNode(0)          # placeholder in front of the answer
    tail = dummy                 # last node of the merged list so far
    while a is not None and b is not None:
        if a.val <= b.val:       # <= keeps equal values from a first (stable)
            tail.next = a
            a = a.next
        else:
            tail.next = b
            b = b.next
        tail = tail.next
    tail.next = a if a is not None else b   # attach whatever is left
    return dummy.next
~~~

**Line by line:**

- \`dummy = ListNode(0)\` is a throw-away node in front of the answer, so attaching the first real node is the same \`tail.next = ...\` as every other node. Without it you need an \`if head is None:\` special case.
- \`while a is not None and b is not None\` runs while both lists still have nodes; as soon as one runs out, the rest of the other is already sorted and is attached in one move.
- \`a.val <= b.val\` (not \`<\`) takes the node from \`a\` when the values tie. That keeps equal values in their original order, a property called stability; Example 2 shows the difference.
- \`tail.next = a if a is not None else b\` attaches the leftover list. Python programmers often write \`tail.next = a or b\`, which also works here because a node object is always truthy (it does not define \`__bool__\` or \`__len__\`); the explicit form is clearer to read aloud.
- No new nodes are created apart from \`dummy\`. The function only changes \`next\` attributes, so the input lists are consumed: after the call, the nodes belong to the merged list.

The standard library has \`heapq.merge\`, which merges already-sorted *iterables* lazily (\`list(heapq.merge([1, 3, 5], [2, 4, 6]))\` printed \`[1, 2, 3, 4, 5, 6]\` here; [docs](https://docs.python.org/3/library/heapq.html#heapq.merge)). It works on Python lists and generators, not on your own node objects, so in an interview you still write the loop.

📌 **Interview term: Truthiness** — Python treats some values (\`None\`, \`0\`, empty containers) as false in an \`if\` or \`or\`; most objects, including a plain node, count as true.

## 5. The Recursive Version

The merge also has a short recursive form: the answer's head is the smaller of the two heads, and its \`next\` is the merge of everything that is left. If you are new to recursion, see [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).

~~~python
def merge_recursive(a, b):
    if a is None:
        return b
    if b is None:
        return a
    if a.val <= b.val:
        a.next = merge_recursive(a.next, b)
        return a
    b.next = merge_recursive(a, b.next)
    return b
~~~

The base cases are "one list is empty, so the answer is the other". It is elegant, but each call waits for the next one. The recursion is m + n calls deep, one per node. CPython's default limit is about 1,000 frames (\`sys.getrecursionlimit()\` printed 1000 here), so two 600-node lists already raise \`RecursionError\`. Use the loop for real inputs.

## 6. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Dummy-node merge on normal and edge-case inputs** prints:

~~~text
[1, 1, 2, 3, 4, 4]
[]
[0]
[1, 2, 3, 5]
[-3, -2, -1]
merged head is the old head of a: true
old head of b now points to value 3
~~~

**Example 2 — Stability, the recursive version, and counting comparisons** prints:

~~~text
<= keeps a first: 1a 1b 2a 2b 3b 4a
<  puts b first:  1b 1a 2b 2a 3b 4a
recursive:        1a 1b 2a 2b 3b 4a
interleaved 4 + 4 nodes: 7 comparisons
a ends first, 3 + 4 nodes: 3 comparisons
~~~

**What the numbers show:** Example 1 covers empty, one-sided, negative and duplicate inputs, and proves the merge reuses the original nodes. Example 2 tags each node with the list it came from: \`<=\` keeps \`a\` first on ties (\`1a 1b 2a 2b\`), \`<\` flips them (\`1b 1a 2b 2a\`), and the recursive version matches the stable loop. The comparison counts show the loop stops comparing as soon as one list runs out.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy all values, sort, rebuild | O((m + n) log(m + n)) | O(m + n) | ignores that the inputs are already sorted |
| Iterative merge with dummy node | O(m + n) | O(1) | each node is attached once; only \`dummy\`, \`tail\`, \`a\`, \`b\` are stored |
| Recursive merge | O(m + n) | O(m + n) | one stack frame per attached node |

The comparison count is at most m + n - 1. Example 2 measured 7 comparisons for two interleaved 4-node lists (4 + 4 - 1) and only 3 when list \`a\` (3 nodes, all smaller) ran out first, because the leftover is attached without comparing. For the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Both lists empty:** the loop never runs, \`tail.next\` is set to \`None\`, and \`dummy.next\` is \`None\`. Example 1 prints \`[]\`.
- **One list empty:** the loop never runs and the whole other list is attached. Example 1 prints \`[0]\`.
- **One list entirely smaller:** \`[5]\` with \`[1, 2, 3]\` takes 1, 2, 3 from \`b\`, then attaches \`5\`. Example 1 prints \`[1, 2, 3, 5]\`.
- **Negative numbers and duplicates:** comparisons work the same way. Example 1 prints \`[-3, -2, -1]\` and \`[1, 1, 2, 3, 4, 4]\`.
- **The inputs after the call:** they are consumed. Example 1 shows the merged head is the old head of \`a\`, and the old head of \`b\` (2) now points to 3, a node that came from \`a\`.

## Common Pitfalls

- **Forgetting the leftover.** When the loop ends one list may still have nodes; without \`tail.next = a if a is not None else b\` they are silently dropped.
- **Forgetting to advance \`tail\`.** Without \`tail = tail.next\`, every node is attached to the same place and only the last one survives.
- **Using \`<\` when stability matters.** Ties then come from \`b\` first; with plain integers nobody can tell, but with records (same score, different names) the order changes (Example 2).
- **Returning \`dummy\` instead of \`dummy.next\`.** The caller gets an extra \`0\` at the front.
- **Recursing on long lists.** The recursive merge is m + n frames deep and hits CPython's default limit of about 1,000.
- **Expecting the inputs to survive.** The merge reuses the nodes; after it, walking the old \`b\` head can wander into nodes from \`a\`. Example 1 shows the old head of \`b\` now points to \`3\`, a node from \`a\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Both lists are sorted, so the smallest remaining value is always at the front of one of them; repeatedly take the smaller front node.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Dummy node:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dummy = ListNode(0)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail = dummy</code> remove the special case for the first node; return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dummy.next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The loop:</strong> <span style="color:#f0e2c8;">While both are non-empty, attach the smaller of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>, advance that list and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail</code>, then attach whatever is left.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(m + n) time, O(1) extra space; nodes are relinked, not copied.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> keeps it stable, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq.merge</code> exists for Python iterables but not for node objects, and the recursive version hits the 1,000-frame default limit.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you write it recursively?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If one list is empty return the other; otherwise the smaller head points to the merge of the rest and is returned. Same O(m + n) time but O(m + n) stack, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RecursionError</code> on long lists.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you merge k sorted lists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push the k heads into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(val, index, node)</code> tuples and pop the smallest each time: O(N log k). The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code> breaks ties so Python never compares two nodes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is your merge stable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, because ties take from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>. Example 2 shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1a 1b 2a 2b</code>; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> it becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1b 1a 2b 2a</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many comparisons does it make?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At most m + n - 1, and fewer if one list runs out early: 7 for two interleaved 4-node lists, 3 when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> ended first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where is this used?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the merge step of merge sort on a linked list, which sorts in O(n log n) with no random access needed.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Merge step** | combine two sorted sequences by repeatedly taking the smaller front element |
| **Dummy (sentinel) node** | a placeholder before the real head so the first insertion is not special |
| **Stable merge** | equal elements keep their original order, first list first |
| **Truthiness** | how Python treats a value in \`if\` / \`or\`; a plain node object is always true |

---
**Conclusion:** Merging two sorted linked lists is the merge step from merge sort done with pointers: a dummy node, a \`tail\`, a loop that attaches the smaller front node with \`<=\`, and one final line that attaches the leftover. It runs in O(m + n) time with O(1) extra space and creates no new nodes. In Python, the extra marks come from using \`is None\`, knowing that \`heapq.merge\` is for iterables rather than node objects, and choosing the loop over recursion because of the default 1,000-frame limit.`,
        examples: [
          { label: `Dummy-node merge on normal and edge-case inputs`, code: `class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next


def build(values):
    dummy = ListNode(0)
    tail = dummy
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next


def to_list(head):
    out = []
    while head is not None:
        out.append(head.val)
        head = head.next
    return out


def merge_two_lists(a, b):
    dummy = ListNode(0)          # placeholder in front of the answer
    tail = dummy                 # last node of the merged list so far
    while a is not None and b is not None:
        if a.val <= b.val:       # <= keeps equal values from a first (stable)
            tail.next = a
            a = a.next
        else:
            tail.next = b
            b = b.next
        tail = tail.next
    tail.next = a if a is not None else b   # attach whatever is left
    return dummy.next


print(to_list(merge_two_lists(build([1, 2, 4]), build([1, 3, 4]))))  # [1, 1, 2, 3, 4, 4]
print(to_list(merge_two_lists(build([]), build([]))))  # []
print(to_list(merge_two_lists(build([]), build([0]))))  # [0]
print(to_list(merge_two_lists(build([5]), build([1, 2, 3]))))  # [1, 2, 3, 5]
print(to_list(merge_two_lists(build([-3, -1]), build([-2]))))  # [-3, -2, -1]

a = build([1, 3, 5])
b = build([2, 4, 6])
first_a, first_b = a, b
merged = merge_two_lists(a, b)
print("merged head is the old head of a: " + str(merged is first_a).lower())
print("old head of b now points to value " + str(first_b.next.val))` },
          { label: `Stability, the recursive version, and counting comparisons`, code: `class ListNode:
    def __init__(self, val, tag, next=None):
        self.val = val
        self.tag = tag      # which list the node came from, to see stability
        self.next = next


def build(prefix, values):
    dummy = ListNode(0, "")
    tail = dummy
    for v in values:
        tail.next = ListNode(v, prefix)
        tail = tail.next
    return dummy.next


def tags(head):
    out = []
    while head is not None:
        out.append(str(head.val) + head.tag)
        head = head.next
    return " ".join(out)


comparisons = 0


def merge_iterative(a, b, keep_a_first=True):
    global comparisons
    dummy = ListNode(0, "")
    tail = dummy
    while a is not None and b is not None:
        comparisons += 1
        take_a = a.val <= b.val if keep_a_first else a.val < b.val
        if take_a:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a if a is not None else b
    return dummy.next


def merge_recursive(a, b):
    if a is None:
        return b
    if b is None:
        return a
    if a.val <= b.val:
        a.next = merge_recursive(a.next, b)
        return a
    b.next = merge_recursive(a, b.next)
    return b


A = [1, 2, 4]
B = [1, 2, 3]
print("<= keeps a first: " + tags(merge_iterative(build("a", A), build("b", B), True)))
print("<  puts b first:  " + tags(merge_iterative(build("a", A), build("b", B), False)))
print("recursive:        " + tags(merge_recursive(build("a", A), build("b", B))))

comparisons = 0
merge_iterative(build("a", [1, 3, 5, 7]), build("b", [2, 4, 6, 8]))
print("interleaved 4 + 4 nodes: " + str(comparisons) + " comparisons")

comparisons = 0
merge_iterative(build("a", [1, 2, 3]), build("b", [10, 20, 30, 40]))
print("a ends first, 3 + 4 nodes: " + str(comparisons) + " comparisons")` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given the heads of two linked lists, each already sorted in ascending order. Merge them into one sorted list by splicing the existing nodes together, and return its head. Please write it in JavaScript."

**What a strong answer should cover:**
- The idea: the smallest remaining value is always at the front of one of the two lists, so repeatedly take the smaller front node.
- A dummy (sentinel) node and a \`tail\` pointer, which remove the special case for the first node.
- Attaching the leftover list in one step when the other runs out.
- O(m + n) time and O(1) extra space for the loop; the recursive version uses O(m + n) stack.
- Stability: using \`<=\` so equal values keep list \`a\` first.
- JavaScript specifics: \`null\` checks, \`a ?? b\` for the leftover, numbers versus strings in \`<=\`, and \`RangeError\` for the recursive version.

**Clarifying questions expected:**
- "Can I reuse the input nodes, or must the original lists stay intact?"
- "Are there duplicates, and if so should ties come from the first list?"

**Code / implementation expected:** Yes — a JavaScript \`mergeTwoLists(a, b)\` with a dummy node, plus the recursive version if time allows.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Two teachers have each sorted their class's exam papers by score, lowest on top. The head teacher wants one pile for the whole year, still sorted. Nobody re-sorts 60 papers from scratch. Instead you put the two piles side by side, look at the two top papers, move the lower score onto the new pile, and repeat. When one pile is empty, you lift the whole other pile onto the new one in one go, because it is already in order.

That is merging two sorted linked lists. The piles are the lists, the top paper is the head node, and "move the paper" is just changing one pointer. Because you only ever compare the two top papers, the work is proportional to the total number of papers. This merge step is the heart of [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work), and it generalises to [merging k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists). The array version is a separate question, [merging two sorted arrays](/interview-question/how-do-you-merge-two-sorted-arrays); with lists there is no copying at all, only relinking.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| May I reuse (splice) the input nodes? | Splicing is O(1) extra space; if the inputs must stay intact you build new nodes in O(m + n) space. |
| Are both lists sorted ascending? | The algorithm relies on it; for descending order, flip the comparison. |
| What about equal values? | With \`<=\` ties take the node from the first list, which keeps the merge stable; ask if that matters. |
| Can either list be empty? | The answer is then simply the other list; the dummy node handles this without extra code. |
| How long can the lists be? | Long lists rule out the recursive version because of stack depth. |

## 3. The Core Idea: Always Take the Smaller Front Node

Keep one pointer at the front of each list (\`a\` and \`b\`). Compare their values, attach the smaller node to the end of the answer, and move that list's pointer forward. Stop when either list runs out, then attach the rest of the other.

<svg class="iq-diagram" width="100%" viewBox="0 0 540 370" role="img" aria-label="Two sorted input lists, a is 1 2 4 and b is 1 3 4, each ending in null">
  <defs>
    <marker id="mrg1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">list a</text>
  <rect class="d-box" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge-accent" d="M 75 134 L 75 98" marker-end="url(#mrg1-arrow)"/>
  <text class="d-text d-accent" x="75" y="152" text-anchor="middle">a</text>
  <text class="d-sub" x="40" y="206">list b</text>
  <rect class="d-box" x="40" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="250" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="250" text-anchor="middle">3</text>
  <rect class="d-box" x="300" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="250" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="430" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="250" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 245 L 164 245" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge" d="M 244 245 L 294 245" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge" d="M 374 245 L 424 245" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge-accent" d="M 75 314 L 75 278" marker-end="url(#mrg1-arrow)"/>
  <text class="d-text d-accent" x="75" y="332" text-anchor="middle">b</text>
</svg>

Both inputs are sorted. The answer must start with the smaller of the two heads, here a tie between two 1s.

📌 **Interview term: Merge step** — combining two sorted sequences into one sorted sequence by repeatedly taking the smaller front element; it is linear in the total length.

### The dummy node trick

The first node of the answer is special: before it exists there is no "end of the answer" to attach to. Rather than an \`if\` for that case, create a throw-away **dummy** node, let \`tail\` point at it, and always do \`tail.next = chosen; tail = tail.next\`. At the end, the real answer is \`dummy.next\`.

📌 **Interview term: Dummy (sentinel) node** — a placeholder node placed before the real head so the first insertion needs no special case; you return the node after it.

Here is the state after three nodes have been attached:

<svg class="iq-diagram" width="100%" viewBox="0 0 540 550" role="img" aria-label="Midway through the merge, the merged part is dummy 1 1 2 with tail on 2, a is on 4 and b is on 3">
  <defs>
    <marker id="mrg2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">merged so far</text>
  <rect class="d-box-muted" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">dummy</text>
  <rect class="d-box-accent" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">2</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge-accent" d="M 465 134 L 465 98" marker-end="url(#mrg2-arrow)"/>
  <text class="d-text d-accent" x="465" y="152" text-anchor="middle">tail</text>
  <text class="d-sub" x="40" y="206">rest of a</text>
  <rect class="d-box" x="40" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="250" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="170" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="250" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 245 L 164 245" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 75 314 L 75 278" marker-end="url(#mrg2-arrow)"/>
  <text class="d-text" x="75" y="332" text-anchor="middle">a</text>
  <text class="d-sub" x="40" y="386">rest of b</text>
  <rect class="d-box" x="40" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="430" text-anchor="middle">3</text>
  <rect class="d-box" x="170" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="430" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="300" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="430" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 425 L 164 425" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 244 425 L 294 425" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 75 494 L 75 458" marker-end="url(#mrg2-arrow)"/>
  <text class="d-text" x="75" y="512" text-anchor="middle">b</text>
</svg>

\`tail\` sits on the last attached node (2). The next comparison is \`a\` (4) against \`b\` (3); 3 is smaller, so \`b\`'s node is attached and \`b\` moves to the second 4.

When \`b\` has given up 3 and 4, \`b\` reaches \`null\` and the loop stops; the remaining \`a\` node (4) is attached in one step:

<svg class="iq-diagram" width="100%" viewBox="0 0 1060 160" role="img" aria-label="The finished merge dummy then 1 1 2 3 4 4, the answer starts at the node after dummy">
  <defs>
    <marker id="mrg3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="40" text-anchor="middle">dummy</text>
  <rect class="d-box-accent" x="170" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="40" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="300" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="40" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="430" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="40" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="560" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="40" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="690" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="40" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="820" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="855" y="40" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="950" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="985" y="40" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 35 L 164 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 244 35 L 294 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 374 35 L 424 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 504 35 L 554 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 634 35 L 684 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 764 35 L 814 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 894 35 L 944 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 75 104 L 75 68" marker-end="url(#mrg3-arrow)"/>
  <text class="d-text" x="75" y="122" text-anchor="middle">dummy</text>
  <path class="d-edge-accent" d="M 205 104 L 205 68" marker-end="url(#mrg3-arrow)"/>
  <text class="d-text d-accent" x="205" y="122" text-anchor="middle">dummy.next</text>
</svg>

The answer is everything after \`dummy\`. No node was copied: the same six nodes from the inputs are now linked in one chain.

### Why \`<=\` and not \`<\`

When values tie, \`<=\` takes the node from \`a\` first. With plain numbers you cannot tell the difference, but if the nodes are records sorted by a key (orders sorted by time, students by score), taking from \`a\` first keeps the original relative order of equal keys.

📌 **Interview term: Stable merge** — a merge in which equal elements keep their original relative order (all equal elements from the first list come before those from the second).

## 4. The Code in JavaScript

The node is the usual class with \`val\` and \`next = null\`; the end of a list is \`null\`.

~~~javascript
function mergeTwoLists(a, b) {
  const dummy = new ListNode(0); // placeholder in front of the answer
  let tail = dummy;              // last node of the merged list so far
  while (a !== null && b !== null) {
    if (a.val <= b.val) {        // <= keeps equal values from a first (stable)
      tail.next = a;
      a = a.next;
    } else {
      tail.next = b;
      b = b.next;
    }
    tail = tail.next;
  }
  tail.next = a !== null ? a : b; // attach whatever is left
  return dummy.next;
}
~~~

**Line by line:**

- \`const dummy = new ListNode(0)\` is a throw-away node in front of the answer, so attaching the first real node is the same \`tail.next = ...\` as every other node. Without it you need an \`if (head === null)\` special case.
- \`while (a !== null && b !== null)\` runs while both lists still have nodes; as soon as one runs out, the rest of the other is already sorted and is attached in one move.
- \`a.val <= b.val\` (not \`<\`) takes the node from \`a\` when the values tie. That keeps equal values in their original order, a property called stability; Example 2 shows the difference.
- \`tail.next = a !== null ? a : b\` attaches the leftover list. ES2020 code can write \`tail.next = a ?? b\`: the **nullish coalescing** operator \`??\` returns its right side only when the left is \`null\` or \`undefined\`.
- Watch the type of \`val\`. \`<=\` on two strings compares them character by character, so \`"10" <= "9"\` is \`true\` while \`10 <= 9\` is \`false\` (both printed here). If values arrive as strings, convert with \`Number(...)\` first.
- No new nodes are created apart from \`dummy\`. The function only changes \`next\` properties, so the inputs are consumed.

📌 **Interview term: Nullish coalescing (\`??\`)** — \`x ?? y\` is \`x\` unless \`x\` is \`null\` or \`undefined\`, in which case it is \`y\`.

## 5. The Recursive Version

The merge also has a short recursive form: the answer's head is the smaller of the two heads, and its \`next\` is the merge of everything that is left. If you are new to recursion, see [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).

~~~javascript
function mergeRecursive(a, b) {
  if (a === null) return b;
  if (b === null) return a;
  if (a.val <= b.val) {
    a.next = mergeRecursive(a.next, b);
    return a;
  }
  b.next = mergeRecursive(a, b.next);
  return b;
}
~~~

The base cases are "one list is empty, so the answer is the other". It is elegant, but each call waits for the next one. The recursion is m + n calls deep, one per node, and a deep enough chain throws \`RangeError: Maximum call stack size exceeded\`. The stack size depends on the engine, so use the loop for real inputs.

## 6. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Dummy-node merge on normal and edge-case inputs** prints:

~~~text
[1, 1, 2, 3, 4, 4]
[]
[0]
[1, 2, 3, 5]
[-3, -2, -1]
merged head is the old head of a: true
old head of b now points to value 3
~~~

**Example 2 — Stability, the recursive version, and counting comparisons** prints:

~~~text
<= keeps a first: 1a 1b 2a 2b 3b 4a
<  puts b first:  1b 1a 2b 2a 3b 4a
recursive:        1a 1b 2a 2b 3b 4a
interleaved 4 + 4 nodes: 7 comparisons
a ends first, 3 + 4 nodes: 3 comparisons
~~~

**What the numbers show:** Example 1 covers empty, one-sided, negative and duplicate inputs, and proves the merge reuses the original nodes. Example 2 tags each node with the list it came from: \`<=\` keeps \`a\` first on ties (\`1a 1b 2a 2b\`), \`<\` flips them (\`1b 1a 2b 2a\`), and the recursive version matches the stable loop. The comparison counts show the loop stops comparing as soon as one list runs out.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy all values, sort, rebuild | O((m + n) log(m + n)) | O(m + n) | ignores that the inputs are already sorted |
| Iterative merge with dummy node | O(m + n) | O(1) | each node is attached once; only \`dummy\`, \`tail\`, \`a\`, \`b\` are stored |
| Recursive merge | O(m + n) | O(m + n) | one stack frame per attached node |

The comparison count is at most m + n - 1. Example 2 measured 7 comparisons for two interleaved 4-node lists (4 + 4 - 1) and only 3 when list \`a\` (3 nodes, all smaller) ran out first, because the leftover is attached without comparing. For the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Both lists empty:** the loop never runs, \`tail.next\` is set to \`null\`, and \`dummy.next\` is \`null\`. Example 1 prints \`[]\`.
- **One list empty:** the loop never runs and the whole other list is attached. Example 1 prints \`[0]\`.
- **One list entirely smaller:** \`[5]\` with \`[1, 2, 3]\` takes 1, 2, 3 from \`b\`, then attaches \`5\`. Example 1 prints \`[1, 2, 3, 5]\`.
- **Negative numbers and duplicates:** comparisons work the same way. Example 1 prints \`[-3, -2, -1]\` and \`[1, 1, 2, 3, 4, 4]\`.
- **The inputs after the call:** they are consumed. Example 1 shows the merged head is the old head of \`a\`, and the old head of \`b\` (2) now points to 3, a node that came from \`a\`.

## Common Pitfalls

- **Forgetting the leftover.** When the loop ends one list may still have nodes; without \`tail.next = a ?? b\` they are silently dropped.
- **Forgetting to advance \`tail\`.** Without \`tail = tail.next\`, every node is attached to the same place.
- **Comparing strings.** \`"10" <= "9"\` is \`true\` in JavaScript, so values read from JSON or the DOM as strings merge in the wrong order. Convert with \`Number(...)\`.
- **Using \`<\` when stability matters.** Ties then come from \`b\` first, which changes the order of records with equal keys (Example 2).
- **Returning \`dummy\` instead of \`dummy.next\`.** The caller gets an extra \`0\` at the front.
- **Recursing on long lists.** One frame per node; long lists throw \`RangeError\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Both lists are sorted, so the smallest remaining value is always at the front of one of them; repeatedly take the smaller front node.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Dummy node:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const dummy = new ListNode(0)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let tail = dummy</code> remove the special case for the first node; return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dummy.next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The loop:</strong> <span style="color:#f0e2c8;">While both are non-null, attach the smaller with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>, advance that list and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail.next = a ?? b</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(m + n) time, O(1) extra space; nodes are relinked, not copied.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript details:</strong> <span style="color:#f0e2c8;">Make sure <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val</code> is a number, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"10" &lt;= "9"</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code>; and avoid the recursive version on long lists because of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you write it recursively?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If one list is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> return the other; otherwise the smaller head points to the merge of the rest and is returned. O(m + n) stack, so it can throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you merge k sorted lists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">JavaScript has no built-in heap, so either write a small binary heap (O(N log k)) or merge the lists in pairs, halving the count each round (also O(N log k)).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is your merge stable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, because ties take from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>. Example 2 shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1a 1b 2a 2b</code>; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> it becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1b 1a 2b 2a</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">??</code> do in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">tail.next = a ?? b</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> unless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>. Unlike <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">||</code>, it would not skip a falsy value such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>, though here <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> is either a node or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many comparisons does it make?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At most m + n - 1, fewer if one list ends early: 7 for two interleaved 4-node lists, 3 when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> ended first.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Merge step** | combine two sorted sequences by repeatedly taking the smaller front element |
| **Dummy (sentinel) node** | a placeholder before the real head so the first insertion is not special |
| **Stable merge** | equal elements keep their original order, first list first |
| **Nullish coalescing (\`??\`)** | \`x ?? y\` is \`y\` only when \`x\` is \`null\` or \`undefined\` |

---
**Conclusion:** Merging two sorted linked lists is the merge step from merge sort done with pointers: a dummy node, a \`tail\`, a loop that attaches the smaller front node with \`<=\`, and \`tail.next = a ?? b\` for the leftover. It runs in O(m + n) time with O(1) extra space and creates no new nodes. In JavaScript, the extra marks come from making sure the values are numbers rather than strings and choosing the loop over recursion for long lists.`,
        examples: [
          { label: `Dummy-node merge on normal and edge-case inputs`, code: `class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

function build(values) {
  const dummy = new ListNode(0);
  let tail = dummy;
  for (const v of values) {
    tail.next = new ListNode(v);
    tail = tail.next;
  }
  return dummy.next;
}

function toList(head) {
  const out = [];
  for (let n = head; n !== null; n = n.next) out.push(n.val);
  return out;
}

const fmt = (arr) => '[' + arr.join(', ') + ']';

function mergeTwoLists(a, b) {
  const dummy = new ListNode(0); // placeholder in front of the answer
  let tail = dummy;              // last node of the merged list so far
  while (a !== null && b !== null) {
    if (a.val <= b.val) {        // <= keeps equal values from a first (stable)
      tail.next = a;
      a = a.next;
    } else {
      tail.next = b;
      b = b.next;
    }
    tail = tail.next;
  }
  tail.next = a !== null ? a : b; // attach whatever is left
  return dummy.next;
}

console.log(fmt(toList(mergeTwoLists(build([1, 2, 4]), build([1, 3, 4]))))); // [1, 1, 2, 3, 4, 4]
console.log(fmt(toList(mergeTwoLists(build([]), build([]))))); // []
console.log(fmt(toList(mergeTwoLists(build([]), build([0]))))); // [0]
console.log(fmt(toList(mergeTwoLists(build([5]), build([1, 2, 3]))))); // [1, 2, 3, 5]
console.log(fmt(toList(mergeTwoLists(build([-3, -1]), build([-2]))))); // [-3, -2, -1]

const a = build([1, 3, 5]);
const b = build([2, 4, 6]);
const firstA = a;
const firstB = b;
const merged = mergeTwoLists(a, b);
console.log('merged head is the old head of a: ' + (merged === firstA));
console.log('old head of b now points to value ' + firstB.next.val);` },
          { label: `Stability, the recursive version, and counting comparisons`, code: `class ListNode {
  constructor(val, tag, next = null) {
    this.val = val;
    this.tag = tag; // which list the node came from, to see stability
    this.next = next;
  }
}

function build(prefix, values) {
  const dummy = new ListNode(0, '');
  let tail = dummy;
  values.forEach((v) => {
    tail.next = new ListNode(v, prefix);
    tail = tail.next;
  });
  return dummy.next;
}

function tags(head) {
  const out = [];
  for (let n = head; n !== null; n = n.next) out.push(n.val + n.tag);
  return out.join(' ');
}

let comparisons = 0;

function mergeIterative(a, b, keepAFirst = true) {
  const dummy = new ListNode(0, '');
  let tail = dummy;
  while (a !== null && b !== null) {
    comparisons++;
    const takeA = keepAFirst ? a.val <= b.val : a.val < b.val;
    if (takeA) {
      tail.next = a;
      a = a.next;
    } else {
      tail.next = b;
      b = b.next;
    }
    tail = tail.next;
  }
  tail.next = a !== null ? a : b;
  return dummy.next;
}

function mergeRecursive(a, b) {
  if (a === null) return b;
  if (b === null) return a;
  if (a.val <= b.val) {
    a.next = mergeRecursive(a.next, b);
    return a;
  }
  b.next = mergeRecursive(a, b.next);
  return b;
}

const A = [1, 2, 4];
const B = [1, 2, 3];
console.log('<= keeps a first: ' + tags(mergeIterative(build('a', A), build('b', B), true)));
console.log('<  puts b first:  ' + tags(mergeIterative(build('a', A), build('b', B), false)));
console.log('recursive:        ' + tags(mergeRecursive(build('a', A), build('b', B))));

comparisons = 0;
mergeIterative(build('a', [1, 3, 5, 7]), build('b', [2, 4, 6, 8]));
console.log('interleaved 4 + 4 nodes: ' + comparisons + ' comparisons');

comparisons = 0;
mergeIterative(build('a', [1, 2, 3]), build('b', [10, 20, 30, 40]));
console.log('a ends first, 3 + 4 nodes: ' + comparisons + ' comparisons');` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You are given the heads of two linked lists, each already sorted in ascending order. Merge them into one sorted list by splicing the existing nodes together, and return its head. Please write it in Java."

**What a strong answer should cover:**
- The idea: the smallest remaining value is always at the front of one of the two lists, so repeatedly take the smaller front node.
- A dummy (sentinel) node and a \`tail\` pointer, which remove the special case for the first node.
- Attaching the leftover list in one step when the other runs out.
- O(m + n) time and O(1) extra space for the loop; the recursive version uses O(m + n) stack.
- Stability: using \`<=\` so equal values keep list \`a\` first.
- Java specifics: \`int\` versus \`Integer\` (\`==\` compares references), \`null\` checks, and \`StackOverflowError\` for the recursive version.

**Clarifying questions expected:**
- "Can I reuse the input nodes, or must the original lists stay intact?"
- "Are there duplicates, and if so should ties come from the first list?"

**Code / implementation expected:** Yes — a Java \`static ListNode mergeTwoLists(ListNode a, ListNode b)\` with a dummy node.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Two teachers have each sorted their class's exam papers by score, lowest on top. The head teacher wants one pile for the whole year, still sorted. Nobody re-sorts 60 papers from scratch. Instead you put the two piles side by side, look at the two top papers, move the lower score onto the new pile, and repeat. When one pile is empty, you lift the whole other pile onto the new one in one go, because it is already in order.

That is merging two sorted linked lists. The piles are the lists, the top paper is the head node, and "move the paper" is just changing one pointer. Because you only ever compare the two top papers, the work is proportional to the total number of papers. This merge step is the heart of [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work), and it generalises to [merging k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists). The array version is a separate question, [merging two sorted arrays](/interview-question/how-do-you-merge-two-sorted-arrays); with lists there is no copying at all, only relinking.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| May I reuse (splice) the input nodes? | Splicing is O(1) extra space; if the inputs must stay intact you build new nodes in O(m + n) space. |
| Are both lists sorted ascending? | The algorithm relies on it; for descending order, flip the comparison. |
| What about equal values? | With \`<=\` ties take the node from the first list, which keeps the merge stable; ask if that matters. |
| Can either list be empty? | The answer is then simply the other list; the dummy node handles this without extra code. |
| How long can the lists be? | Long lists rule out the recursive version because of stack depth. |

## 3. The Core Idea: Always Take the Smaller Front Node

Keep one pointer at the front of each list (\`a\` and \`b\`). Compare their values, attach the smaller node to the end of the answer, and move that list's pointer forward. Stop when either list runs out, then attach the rest of the other.

<svg class="iq-diagram" width="100%" viewBox="0 0 540 370" role="img" aria-label="Two sorted input lists, a is 1 2 4 and b is 1 3 4, each ending in null">
  <defs>
    <marker id="mrg1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">list a</text>
  <rect class="d-box" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge-accent" d="M 75 134 L 75 98" marker-end="url(#mrg1-arrow)"/>
  <text class="d-text d-accent" x="75" y="152" text-anchor="middle">a</text>
  <text class="d-sub" x="40" y="206">list b</text>
  <rect class="d-box" x="40" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="250" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="250" text-anchor="middle">3</text>
  <rect class="d-box" x="300" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="250" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="430" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="250" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 245 L 164 245" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge" d="M 244 245 L 294 245" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge" d="M 374 245 L 424 245" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge-accent" d="M 75 314 L 75 278" marker-end="url(#mrg1-arrow)"/>
  <text class="d-text d-accent" x="75" y="332" text-anchor="middle">b</text>
</svg>

Both inputs are sorted. The answer must start with the smaller of the two heads, here a tie between two 1s.

📌 **Interview term: Merge step** — combining two sorted sequences into one sorted sequence by repeatedly taking the smaller front element; it is linear in the total length.

### The dummy node trick

The first node of the answer is special: before it exists there is no "end of the answer" to attach to. Rather than an \`if\` for that case, create a throw-away **dummy** node, let \`tail\` point at it, and always do \`tail.next = chosen; tail = tail.next\`. At the end, the real answer is \`dummy.next\`.

📌 **Interview term: Dummy (sentinel) node** — a placeholder node placed before the real head so the first insertion needs no special case; you return the node after it.

Here is the state after three nodes have been attached:

<svg class="iq-diagram" width="100%" viewBox="0 0 540 550" role="img" aria-label="Midway through the merge, the merged part is dummy 1 1 2 with tail on 2, a is on 4 and b is on 3">
  <defs>
    <marker id="mrg2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">merged so far</text>
  <rect class="d-box-muted" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">dummy</text>
  <rect class="d-box-accent" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">2</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge-accent" d="M 465 134 L 465 98" marker-end="url(#mrg2-arrow)"/>
  <text class="d-text d-accent" x="465" y="152" text-anchor="middle">tail</text>
  <text class="d-sub" x="40" y="206">rest of a</text>
  <rect class="d-box" x="40" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="250" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="170" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="250" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 245 L 164 245" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 75 314 L 75 278" marker-end="url(#mrg2-arrow)"/>
  <text class="d-text" x="75" y="332" text-anchor="middle">a</text>
  <text class="d-sub" x="40" y="386">rest of b</text>
  <rect class="d-box" x="40" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="430" text-anchor="middle">3</text>
  <rect class="d-box" x="170" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="430" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="300" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="430" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 425 L 164 425" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 244 425 L 294 425" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 75 494 L 75 458" marker-end="url(#mrg2-arrow)"/>
  <text class="d-text" x="75" y="512" text-anchor="middle">b</text>
</svg>

\`tail\` sits on the last attached node (2). The next comparison is \`a\` (4) against \`b\` (3); 3 is smaller, so \`b\`'s node is attached and \`b\` moves to the second 4.

When \`b\` has given up 3 and 4, \`b\` reaches \`null\` and the loop stops; the remaining \`a\` node (4) is attached in one step:

<svg class="iq-diagram" width="100%" viewBox="0 0 1060 160" role="img" aria-label="The finished merge dummy then 1 1 2 3 4 4, the answer starts at the node after dummy">
  <defs>
    <marker id="mrg3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="40" text-anchor="middle">dummy</text>
  <rect class="d-box-accent" x="170" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="40" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="300" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="40" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="430" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="40" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="560" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="40" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="690" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="40" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="820" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="855" y="40" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="950" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="985" y="40" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 35 L 164 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 244 35 L 294 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 374 35 L 424 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 504 35 L 554 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 634 35 L 684 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 764 35 L 814 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 894 35 L 944 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 75 104 L 75 68" marker-end="url(#mrg3-arrow)"/>
  <text class="d-text" x="75" y="122" text-anchor="middle">dummy</text>
  <path class="d-edge-accent" d="M 205 104 L 205 68" marker-end="url(#mrg3-arrow)"/>
  <text class="d-text d-accent" x="205" y="122" text-anchor="middle">dummy.next</text>
</svg>

The answer is everything after \`dummy\`. No node was copied: the same six nodes from the inputs are now linked in one chain.

### Why \`<=\` and not \`<\`

When values tie, \`<=\` takes the node from \`a\` first. With plain numbers you cannot tell the difference, but if the nodes are records sorted by a key (orders sorted by time, students by score), taking from \`a\` first keeps the original relative order of equal keys.

📌 **Interview term: Stable merge** — a merge in which equal elements keep their original relative order (all equal elements from the first list come before those from the second).

## 4. The Code in Java

The node is the usual \`static\` nested class; an unset \`next\` is \`null\`.

~~~java
static ListNode mergeTwoLists(ListNode a, ListNode b) {
    ListNode dummy = new ListNode(0); // placeholder in front of the answer
    ListNode tail = dummy;            // last node of the merged list so far
    while (a != null && b != null) {
        if (a.val <= b.val) {         // <= keeps equal values from a first (stable)
            tail.next = a;
            a = a.next;
        } else {
            tail.next = b;
            b = b.next;
        }
        tail = tail.next;
    }
    tail.next = (a != null) ? a : b;  // attach whatever is left
    return dummy.next;
}
~~~

**Line by line:**

- \`ListNode dummy = new ListNode(0)\` is a throw-away node in front of the answer, so attaching the first real node is the same \`tail.next = ...\` as every other node. Without it you need an \`if (head == null)\` special case.
- \`while (a != null && b != null)\` runs while both lists still have nodes; as soon as one runs out, the rest of the other is already sorted and is attached in one move.
- \`a.val <= b.val\` (not \`<\`) takes the node from \`a\` when the values tie. That keeps equal values in their original order, a property called stability; Example 2 shows the difference.
- \`tail.next = (a != null) ? a : b\` attaches the leftover list in O(1).
- \`val\` is a primitive \`int\`, so \`<=\` compares numbers. If your node used \`Integer val\`, \`<\` and \`<=\` would still unbox and compare numbers, but \`==\` would compare *references*: \`Integer p = 1000, q = 1000; p == q\` printed \`false\` here, because only -128 to 127 are cached. Use \`int\`, or \`Integer.compare\` / \`.equals\`.
- No new nodes are created apart from \`dummy\`. The function only changes \`next\` fields, so the inputs are consumed.

📌 **Interview term: Autoboxing** — Java automatically wraps an \`int\` in an \`Integer\` object (and unwraps it back); \`==\` on two \`Integer\` objects compares the objects, not the numbers.

## 5. The Recursive Version

The merge also has a short recursive form: the answer's head is the smaller of the two heads, and its \`next\` is the merge of everything that is left. If you are new to recursion, see [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).

~~~java
static ListNode mergeRecursive(ListNode a, ListNode b) {
    if (a == null) return b;
    if (b == null) return a;
    if (a.val <= b.val) {
        a.next = mergeRecursive(a.next, b);
        return a;
    }
    b.next = mergeRecursive(a, b.next);
    return b;
}
~~~

The base cases are "one list is empty, so the answer is the other". It is elegant, but each call waits for the next one. The recursion is m + n calls deep, one per node, and a deep enough chain throws \`StackOverflowError\`. How deep you can go depends on the thread stack size (\`-Xss\`), so use the loop for real inputs.

## 6. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Dummy-node merge on normal and edge-case inputs** prints:

~~~text
[1, 1, 2, 3, 4, 4]
[]
[0]
[1, 2, 3, 5]
[-3, -2, -1]
merged head is the old head of a: true
old head of b now points to value 3
~~~

**Example 2 — Stability, the recursive version, and counting comparisons** prints:

~~~text
<= keeps a first: 1a 1b 2a 2b 3b 4a
<  puts b first:  1b 1a 2b 2a 3b 4a
recursive:        1a 1b 2a 2b 3b 4a
interleaved 4 + 4 nodes: 7 comparisons
a ends first, 3 + 4 nodes: 3 comparisons
~~~

**What the numbers show:** Example 1 covers empty, one-sided, negative and duplicate inputs, and proves the merge reuses the original nodes. Example 2 tags each node with the list it came from: \`<=\` keeps \`a\` first on ties (\`1a 1b 2a 2b\`), \`<\` flips them (\`1b 1a 2b 2a\`), and the recursive version matches the stable loop. The comparison counts show the loop stops comparing as soon as one list runs out.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy all values, sort, rebuild | O((m + n) log(m + n)) | O(m + n) | ignores that the inputs are already sorted |
| Iterative merge with dummy node | O(m + n) | O(1) | each node is attached once; only \`dummy\`, \`tail\`, \`a\`, \`b\` are stored |
| Recursive merge | O(m + n) | O(m + n) | one stack frame per attached node |

The comparison count is at most m + n - 1. Example 2 measured 7 comparisons for two interleaved 4-node lists (4 + 4 - 1) and only 3 when list \`a\` (3 nodes, all smaller) ran out first, because the leftover is attached without comparing. For the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Both lists empty:** the loop never runs, \`tail.next\` is set to \`null\`, and \`dummy.next\` is \`null\`. Example 1 prints \`[]\`.
- **One list empty:** the loop never runs and the whole other list is attached. Example 1 prints \`[0]\`.
- **One list entirely smaller:** \`[5]\` with \`[1, 2, 3]\` takes 1, 2, 3 from \`b\`, then attaches \`5\`. Example 1 prints \`[1, 2, 3, 5]\`.
- **Negative numbers and duplicates:** comparisons work the same way. Example 1 prints \`[-3, -2, -1]\` and \`[1, 1, 2, 3, 4, 4]\`.
- **The inputs after the call:** they are consumed. Example 1 shows the merged head is the old head of \`a\`, and the old head of \`b\` (2) now points to 3, a node that came from \`a\`.

## Common Pitfalls

- **Forgetting the leftover.** When the loop ends one list may still have nodes; without \`tail.next = (a != null) ? a : b\` they are silently dropped.
- **Forgetting to advance \`tail\`.** Without \`tail = tail.next\`, every node is attached to the same place.
- **\`Integer\` values compared with \`==\`.** If the node stores \`Integer\`, an equality check like \`a.val == b.val\` compares references and is \`false\` for equal values outside -128 to 127.
- **Using \`<\` when stability matters.** Ties then come from \`b\` first, which changes the order of records with equal keys (Example 2).
- **Returning \`dummy\` instead of \`dummy.next\`.** The caller gets an extra \`0\` at the front.
- **Recursing on long lists.** One frame per node; long lists throw \`StackOverflowError\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Both lists are sorted, so the smallest remaining value is always at the front of one of them; repeatedly take the smaller front node.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Dummy node:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode dummy = new ListNode(0); ListNode tail = dummy;</code> removes the special case for the first node; return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dummy.next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The loop:</strong> <span style="color:#f0e2c8;">While both are non-null, attach the smaller with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>, advance that list and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail</code>, then attach the non-null leftover.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(m + n) time, O(1) extra space; only references change.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java details:</strong> <span style="color:#f0e2c8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val</code> an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> so comparisons are numeric; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> compares references. The recursive version risks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you write it recursively?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If one list is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> return the other; otherwise the smaller head points to the merge of the rest. Same time, but O(m + n) stack and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code> risk.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you merge k sorted lists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue&lt;ListNode&gt;</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(x, y) -&gt; Integer.compare(x.val, y.val)</code>: poll the smallest, offer its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code>. O(N log k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Integer.compare</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x.val - y.val</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Subtraction can overflow for values near <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MIN_VALUE</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MAX_VALUE</code> and flip the sign; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.compare</code> never overflows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is your merge stable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, ties take from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>. Example 2 shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1a 1b 2a 2b</code>; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1b 1a 2b 2a</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many comparisons does it make?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At most m + n - 1: 7 for two interleaved 4-node lists, and only 3 when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> ran out first.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Merge step** | combine two sorted sequences by repeatedly taking the smaller front element |
| **Dummy (sentinel) node** | a placeholder before the real head so the first insertion is not special |
| **Stable merge** | equal elements keep their original order, first list first |
| **Autoboxing** | automatic wrapping of \`int\` into \`Integer\`; \`==\` on \`Integer\` compares objects |

---
**Conclusion:** Merging two sorted linked lists is the merge step from merge sort done with references: a dummy node, a \`tail\`, a loop that attaches the smaller front node with \`<=\`, and one final line that attaches the leftover. It runs in O(m + n) time with O(1) extra space and creates no new nodes. In Java, the extra marks come from keeping \`val\` an \`int\` (or comparing \`Integer\`s correctly), handling \`null\` cleanly, and knowing how the same idea scales to k lists with a \`PriorityQueue\`.`,
        examples: [
          { label: `Dummy-node merge on normal and edge-case inputs`, code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    static ListNode build(int... values) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        for (int v : values) {
            tail.next = new ListNode(v);
            tail = tail.next;
        }
        return dummy.next;
    }

    static List<Integer> toList(ListNode head) {
        List<Integer> out = new ArrayList<>();
        for (ListNode n = head; n != null; n = n.next) out.add(n.val);
        return out;
    }

    static ListNode mergeTwoLists(ListNode a, ListNode b) {
        ListNode dummy = new ListNode(0); // placeholder in front of the answer
        ListNode tail = dummy;            // last node of the merged list so far
        while (a != null && b != null) {
            if (a.val <= b.val) {         // <= keeps equal values from a first (stable)
                tail.next = a;
                a = a.next;
            } else {
                tail.next = b;
                b = b.next;
            }
            tail = tail.next;
        }
        tail.next = (a != null) ? a : b;  // attach whatever is left
        return dummy.next;
    }

    public static void main(String[] args) {
        System.out.println(toList(mergeTwoLists(build(1, 2, 4), build(1, 3, 4)))); // [1, 1, 2, 3, 4, 4]
        System.out.println(toList(mergeTwoLists(build(), build())));               // []
        System.out.println(toList(mergeTwoLists(build(), build(0))));              // [0]
        System.out.println(toList(mergeTwoLists(build(5), build(1, 2, 3))));       // [1, 2, 3, 5]
        System.out.println(toList(mergeTwoLists(build(-3, -1), build(-2))));       // [-3, -2, -1]

        ListNode a = build(1, 3, 5);
        ListNode b = build(2, 4, 6);
        ListNode firstA = a, firstB = b;
        ListNode merged = mergeTwoLists(a, b);
        System.out.println("merged head is the old head of a: " + (merged == firstA));
        System.out.println("old head of b now points to value " + firstB.next.val);
    }
}` },
          { label: `Stability, the recursive version, and counting comparisons`, code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    static class ListNode {
        int val;
        String tag; // which list the node came from, to see stability
        ListNode next;
        ListNode(int val, String tag) { this.val = val; this.tag = tag; }
    }

    static ListNode build(String prefix, int... values) {
        ListNode dummy = new ListNode(0, "");
        ListNode tail = dummy;
        for (int i = 0; i < values.length; i++) {
            tail.next = new ListNode(values[i], prefix);
            tail = tail.next;
        }
        return dummy.next;
    }

    static String tags(ListNode head) {
        List<String> out = new ArrayList<>();
        for (ListNode n = head; n != null; n = n.next) out.add(n.val + n.tag);
        return String.join(" ", out);
    }

    static int comparisons = 0;

    static ListNode mergeIterative(ListNode a, ListNode b, boolean keepAFirst) {
        ListNode dummy = new ListNode(0, "");
        ListNode tail = dummy;
        while (a != null && b != null) {
            comparisons++;
            boolean takeA = keepAFirst ? a.val <= b.val : a.val < b.val;
            if (takeA) {
                tail.next = a;
                a = a.next;
            } else {
                tail.next = b;
                b = b.next;
            }
            tail = tail.next;
        }
        tail.next = (a != null) ? a : b;
        return dummy.next;
    }

    static ListNode mergeRecursive(ListNode a, ListNode b) {
        if (a == null) return b;
        if (b == null) return a;
        if (a.val <= b.val) {
            a.next = mergeRecursive(a.next, b);
            return a;
        }
        b.next = mergeRecursive(a, b.next);
        return b;
    }

    public static void main(String[] args) {
        int[] A = {1, 2, 4};
        int[] B = {1, 2, 3};
        System.out.println("<= keeps a first: " + tags(mergeIterative(build("a", A), build("b", B), true)));
        System.out.println("<  puts b first:  " + tags(mergeIterative(build("a", A), build("b", B), false)));
        System.out.println("recursive:        " + tags(mergeRecursive(build("a", A), build("b", B))));

        comparisons = 0;
        mergeIterative(build("a", 1, 3, 5, 7), build("b", 2, 4, 6, 8), true);
        System.out.println("interleaved 4 + 4 nodes: " + comparisons + " comparisons");

        comparisons = 0;
        mergeIterative(build("a", 1, 2, 3), build("b", 10, 20, 30, 40), true);
        System.out.println("a ends first, 3 + 4 nodes: " + comparisons + " comparisons");
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You are given the heads of two linked lists, each already sorted in ascending order. Merge them into one sorted list by splicing the existing nodes together, and return its head. Please write it in C++."

**What a strong answer should cover:**
- The idea: the smallest remaining value is always at the front of one of the two lists, so repeatedly take the smaller front node.
- A dummy (sentinel) node and a \`tail\` pointer, which remove the special case for the first node.
- Attaching the leftover list in one step when the other runs out.
- O(m + n) time and O(1) extra space for the loop; the recursive version uses O(m + n) stack.
- Stability: using \`<=\` so equal values keep list \`a\` first.
- C++ specifics: a stack-allocated dummy node, no allocation or \`delete\`, ownership of the nodes after the merge, and \`std::forward_list::merge\`.

**Clarifying questions expected:**
- "Can I reuse the input nodes, or must the original lists stay intact?"
- "Are there duplicates, and if so should ties come from the first list?"

**Code / implementation expected:** Yes — a C++ \`ListNode* mergeTwoLists(ListNode* a, ListNode* b)\` with a dummy node on the stack.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Two teachers have each sorted their class's exam papers by score, lowest on top. The head teacher wants one pile for the whole year, still sorted. Nobody re-sorts 60 papers from scratch. Instead you put the two piles side by side, look at the two top papers, move the lower score onto the new pile, and repeat. When one pile is empty, you lift the whole other pile onto the new one in one go, because it is already in order.

That is merging two sorted linked lists. The piles are the lists, the top paper is the head node, and "move the paper" is just changing one pointer. Because you only ever compare the two top papers, the work is proportional to the total number of papers. This merge step is the heart of [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work), and it generalises to [merging k sorted lists](/interview-question/how-do-you-merge-k-sorted-lists). The array version is a separate question, [merging two sorted arrays](/interview-question/how-do-you-merge-two-sorted-arrays); with lists there is no copying at all, only relinking.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| May I reuse (splice) the input nodes? | Splicing is O(1) extra space; if the inputs must stay intact you build new nodes in O(m + n) space. |
| Are both lists sorted ascending? | The algorithm relies on it; for descending order, flip the comparison. |
| What about equal values? | With \`<=\` ties take the node from the first list, which keeps the merge stable; ask if that matters. |
| Can either list be empty? | The answer is then simply the other list; the dummy node handles this without extra code. |
| How long can the lists be? | Long lists rule out the recursive version because of stack depth. |

## 3. The Core Idea: Always Take the Smaller Front Node

Keep one pointer at the front of each list (\`a\` and \`b\`). Compare their values, attach the smaller node to the end of the answer, and move that list's pointer forward. Stop when either list runs out, then attach the rest of the other.

<svg class="iq-diagram" width="100%" viewBox="0 0 540 370" role="img" aria-label="Two sorted input lists, a is 1 2 4 and b is 1 3 4, each ending in nullptr">
  <defs>
    <marker id="mrg1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">list a</text>
  <rect class="d-box" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">nullptr</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge-accent" d="M 75 134 L 75 98" marker-end="url(#mrg1-arrow)"/>
  <text class="d-text d-accent" x="75" y="152" text-anchor="middle">a</text>
  <text class="d-sub" x="40" y="206">list b</text>
  <rect class="d-box" x="40" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="250" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="250" text-anchor="middle">3</text>
  <rect class="d-box" x="300" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="250" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="430" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="250" text-anchor="middle">nullptr</text>
  <path class="d-edge" d="M 114 245 L 164 245" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge" d="M 244 245 L 294 245" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge" d="M 374 245 L 424 245" marker-end="url(#mrg1-arrow)"/>
  <path class="d-edge-accent" d="M 75 314 L 75 278" marker-end="url(#mrg1-arrow)"/>
  <text class="d-text d-accent" x="75" y="332" text-anchor="middle">b</text>
</svg>

Both inputs are sorted. The answer must start with the smaller of the two heads, here a tie between two 1s.

📌 **Interview term: Merge step** — combining two sorted sequences into one sorted sequence by repeatedly taking the smaller front element; it is linear in the total length.

### The dummy node trick

The first node of the answer is special: before it exists there is no "end of the answer" to attach to. Rather than an \`if\` for that case, create a throw-away **dummy** node, let \`tail\` point at it, and always do \`tail->next = chosen; tail = tail->next\`. At the end, the real answer is \`dummy->next\`.

📌 **Interview term: Dummy (sentinel) node** — a placeholder node placed before the real head so the first insertion needs no special case; you return the node after it.

Here is the state after three nodes have been attached:

<svg class="iq-diagram" width="100%" viewBox="0 0 540 550" role="img" aria-label="Midway through the merge, the merged part is dummy 1 1 2 with tail on 2, a is on 4 and b is on 3">
  <defs>
    <marker id="mrg2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">merged so far</text>
  <rect class="d-box-muted" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">dummy</text>
  <rect class="d-box-accent" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">2</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge-accent" d="M 465 134 L 465 98" marker-end="url(#mrg2-arrow)"/>
  <text class="d-text d-accent" x="465" y="152" text-anchor="middle">tail</text>
  <text class="d-sub" x="40" y="206">rest of a</text>
  <rect class="d-box" x="40" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="250" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="170" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="250" text-anchor="middle">nullptr</text>
  <path class="d-edge" d="M 114 245 L 164 245" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 75 314 L 75 278" marker-end="url(#mrg2-arrow)"/>
  <text class="d-text" x="75" y="332" text-anchor="middle">a</text>
  <text class="d-sub" x="40" y="386">rest of b</text>
  <rect class="d-box" x="40" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="430" text-anchor="middle">3</text>
  <rect class="d-box" x="170" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="430" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="300" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="430" text-anchor="middle">nullptr</text>
  <path class="d-edge" d="M 114 425 L 164 425" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 244 425 L 294 425" marker-end="url(#mrg2-arrow)"/>
  <path class="d-edge" d="M 75 494 L 75 458" marker-end="url(#mrg2-arrow)"/>
  <text class="d-text" x="75" y="512" text-anchor="middle">b</text>
</svg>

\`tail\` sits on the last attached node (2). The next comparison is \`a\` (4) against \`b\` (3); 3 is smaller, so \`b\`'s node is attached and \`b\` moves to the second 4.

When \`b\` has given up 3 and 4, \`b\` reaches \`nullptr\` and the loop stops; the remaining \`a\` node (4) is attached in one step:

<svg class="iq-diagram" width="100%" viewBox="0 0 1060 160" role="img" aria-label="The finished merge dummy then 1 1 2 3 4 4, the answer starts at the node after dummy">
  <defs>
    <marker id="mrg3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="40" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="40" text-anchor="middle">dummy</text>
  <rect class="d-box-accent" x="170" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="40" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="300" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="40" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="430" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="40" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="560" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="40" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="690" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="40" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="820" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="855" y="40" text-anchor="middle">4</text>
  <rect class="d-box-muted" x="950" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="985" y="40" text-anchor="middle">nullptr</text>
  <path class="d-edge" d="M 114 35 L 164 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 244 35 L 294 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 374 35 L 424 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 504 35 L 554 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 634 35 L 684 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 764 35 L 814 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 894 35 L 944 35" marker-end="url(#mrg3-arrow)"/>
  <path class="d-edge" d="M 75 104 L 75 68" marker-end="url(#mrg3-arrow)"/>
  <text class="d-text" x="75" y="122" text-anchor="middle">dummy</text>
  <path class="d-edge-accent" d="M 205 104 L 205 68" marker-end="url(#mrg3-arrow)"/>
  <text class="d-text d-accent" x="205" y="122" text-anchor="middle">dummy.next</text>
</svg>

The answer is everything after \`dummy\`. No node was copied: the same six nodes from the inputs are now linked in one chain.

### Why \`<=\` and not \`<\`

When values tie, \`<=\` takes the node from \`a\` first. With plain numbers you cannot tell the difference, but if the nodes are records sorted by a key (orders sorted by time, students by score), taking from \`a\` first keeps the original relative order of equal keys.

📌 **Interview term: Stable merge** — a merge in which equal elements keep their original relative order (all equal elements from the first list come before those from the second).

## 4. The Code in C++

The node is the usual \`struct\` with a \`ListNode* next\`; the end of a list is \`nullptr\`.

~~~cpp
ListNode* mergeTwoLists(ListNode* a, ListNode* b) {
    ListNode dummy(0);           // placeholder in front of the answer (on the stack)
    ListNode* tail = &dummy;     // last node of the merged list so far
    while (a != nullptr && b != nullptr) {
        if (a->val <= b->val) {  // <= keeps equal values from a first (stable)
            tail->next = a;
            a = a->next;
        } else {
            tail->next = b;
            b = b->next;
        }
        tail = tail->next;
    }
    tail->next = (a != nullptr) ? a : b; // attach whatever is left
    return dummy.next;
}
~~~

**Line by line:**

- \`ListNode dummy(0)\` is a throw-away node **on the stack** in front of the answer, so attaching the first real node is the same \`tail->next = ...\` as every other node. It needs no \`new\` and no \`delete\`: it disappears when the function returns.
- Returning \`dummy.next\` is safe because it copies a pointer to a heap node out of \`dummy\`. Returning \`&dummy\` would hand back a pointer to a destroyed local: a **dangling pointer**.
- \`while (a != nullptr && b != nullptr)\` runs while both lists still have nodes; as soon as one runs out, the rest of the other is attached in one move.
- \`a->val <= b->val\` (not \`<\`) takes the node from \`a\` when the values tie, which keeps equal values in their original order (stability; see Example 2).
- No nodes are allocated or freed. The function only changes \`next\` pointers, so ownership of every node moves to the merged list; free it once, from the new head.
- The standard library does this for its own singly linked list: \`std::forward_list::merge\` splices the nodes of the other list in, is stable (elements of \`*this\` come before equal elements of the other list), and leaves the other list empty ([cppreference](https://en.cppreference.com/w/cpp/container/forward_list/merge)). Merging \`{1, 3, 5}\` with \`{2, 3, 4}\` printed \`1 2 3 3 4 5\` here. A custom comparator passed to it must be a strict ordering like \`<\`, never \`<=\`.

📌 **Interview term: Dangling pointer** — a pointer to memory that has already been freed or to a local variable whose function has returned; using it is undefined behaviour.

## 5. The Recursive Version

The merge also has a short recursive form: the answer's head is the smaller of the two heads, and its \`next\` is the merge of everything that is left. If you are new to recursion, see [recursion and base cases](/interview-question/what-is-recursion-and-what-is-a-base-case).

~~~cpp
ListNode* mergeRecursive(ListNode* a, ListNode* b) {
    if (a == nullptr) return b;
    if (b == nullptr) return a;
    if (a->val <= b->val) {
        a->next = mergeRecursive(a->next, b);
        return a;
    }
    b->next = mergeRecursive(a, b->next);
    return b;
}
~~~

The base cases are "one list is empty, so the answer is the other". It is elegant, but each call waits for the next one. The recursion is m + n calls deep, one per node. Running out of stack in C++ is a crash, not an exception, so use the loop for real inputs.

## 6. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Dummy-node merge on normal and edge-case inputs** prints:

~~~text
[1, 1, 2, 3, 4, 4]
[]
[0]
[1, 2, 3, 5]
[-3, -2, -1]
merged head is the old head of a: true
old head of b now points to value 3
~~~

**Example 2 — Stability, the recursive version, and counting comparisons** prints:

~~~text
<= keeps a first: 1a 1b 2a 2b 3b 4a
<  puts b first:  1b 1a 2b 2a 3b 4a
recursive:        1a 1b 2a 2b 3b 4a
interleaved 4 + 4 nodes: 7 comparisons
a ends first, 3 + 4 nodes: 3 comparisons
~~~

**What the numbers show:** Example 1 covers empty, one-sided, negative and duplicate inputs, and proves the merge reuses the original nodes. Example 2 tags each node with the list it came from: \`<=\` keeps \`a\` first on ties (\`1a 1b 2a 2b\`), \`<\` flips them (\`1b 1a 2b 2a\`), and the recursive version matches the stable loop. The comparison counts show the loop stops comparing as soon as one list runs out.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy all values, sort, rebuild | O((m + n) log(m + n)) | O(m + n) | ignores that the inputs are already sorted |
| Iterative merge with dummy node | O(m + n) | O(1) | each node is attached once; only \`dummy\`, \`tail\`, \`a\`, \`b\` are stored |
| Recursive merge | O(m + n) | O(m + n) | one stack frame per attached node |

The comparison count is at most m + n - 1. Example 2 measured 7 comparisons for two interleaved 4-node lists (4 + 4 - 1) and only 3 when list \`a\` (3 nodes, all smaller) ran out first, because the leftover is attached without comparing. For the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Both lists empty:** the loop never runs, \`tail->next\` is set to \`nullptr\`, and \`dummy->next\` is \`nullptr\`. Example 1 prints \`[]\`.
- **One list empty:** the loop never runs and the whole other list is attached. Example 1 prints \`[0]\`.
- **One list entirely smaller:** \`[5]\` with \`[1, 2, 3]\` takes 1, 2, 3 from \`b\`, then attaches \`5\`. Example 1 prints \`[1, 2, 3, 5]\`.
- **Negative numbers and duplicates:** comparisons work the same way. Example 1 prints \`[-3, -2, -1]\` and \`[1, 1, 2, 3, 4, 4]\`.
- **The inputs after the call:** they are consumed. Example 1 shows the merged head is the old head of \`a\`, and the old head of \`b\` (2) now points to 3, a node that came from \`a\`.

## Common Pitfalls

- **Forgetting the leftover.** When the loop ends one list may still have nodes; without \`tail->next = a ? a : b\` they are silently dropped (and leaked if nobody else points at them).
- **Allocating the dummy with \`new\` and never deleting it.** A stack \`ListNode dummy(0);\` avoids the leak entirely.
- **Returning \`&dummy\`.** That is a pointer to a local that no longer exists; return \`dummy.next\`.
- **Using \`<=\` in a comparator for the standard library.** \`std::forward_list::merge\`, \`std::sort\` and friends need a strict ordering like \`<\`; your own loop can use \`<=\` to take from \`a\` first.
- **Freeing both inputs after the merge.** The merged list owns all the nodes now; deleting the old \`a\` and \`b\` lists as well is a double free.
- **Recursing on long lists.** One frame per node, and a stack overflow is a crash.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Both lists are sorted, so the smallest remaining value is always at the front of one of them; repeatedly take the smaller front node.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Dummy node:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode dummy(0); ListNode* tail = &amp;dummy;</code> on the stack removes the first-node special case with no allocation; return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dummy.next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The loop:</strong> <span style="color:#f0e2c8;">While both are non-null, attach the smaller with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>, advance that list and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail</code>, then attach the leftover.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(m + n) time, O(1) extra space; no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code>, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete</code>, only pointer writes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ details:</strong> <span style="color:#f0e2c8;">Never return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;dummy</code>; the merged list now owns every node; and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::forward_list::merge</code> does the same splice, stably.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you write it recursively?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If one list is null return the other; otherwise the smaller head points to the merge of the rest. O(m + n) stack, and a stack overflow is a crash.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you merge k sorted lists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::priority_queue</code> with a comparator that puts the smallest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val</code> on top (it is a max-heap by default, so the comparator is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x-&gt;val &gt; y-&gt;val</code>). O(N log k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the dummy on the stack?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It only lives for the call, so a local avoids <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete</code>. Returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dummy.next</code> copies the pointer out before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dummy</code> is destroyed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is your merge stable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, ties take from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>. Example 2 shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1a 1b 2a 2b</code>; with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1b 1a 2b 2a</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many comparisons does it make?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At most m + n - 1: 7 for two interleaved 4-node lists, and only 3 when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> ran out first.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Merge step** | combine two sorted sequences by repeatedly taking the smaller front element |
| **Dummy (sentinel) node** | a placeholder before the real head so the first insertion is not special |
| **Stable merge** | equal elements keep their original order, first list first |
| **Dangling pointer** | a pointer to memory that was freed or to a local that no longer exists |

---
**Conclusion:** Merging two sorted linked lists is the merge step from merge sort done with pointers: a dummy node on the stack, a \`tail\`, a loop that attaches the smaller front node with \`<=\`, and one final line that attaches the leftover. It runs in O(m + n) time with O(1) extra space, with no allocation and no \`delete\`. In C++, the extra marks come from never returning \`&dummy\`, being clear that the merged list now owns every node, and knowing that \`std::forward_list::merge\` does the same splice stably.`,
        examples: [
          { label: `Dummy-node merge on normal and edge-case inputs`, code: `#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct ListNode {
    int val;
    ListNode* next;
    explicit ListNode(int v) : val(v), next(nullptr) {}
};

std::vector<std::unique_ptr<ListNode>> pool; // owns every node

ListNode* build(const std::vector<int>& values) {
    ListNode dummy(0);
    ListNode* tail = &dummy;
    for (int v : values) {
        pool.push_back(std::make_unique<ListNode>(v));
        tail->next = pool.back().get();
        tail = tail->next;
    }
    return dummy.next;
}

std::string fmt(const ListNode* head) {
    std::string s = "[";
    for (const ListNode* n = head; n != nullptr; n = n->next) {
        if (n != head) s += ", ";
        s += std::to_string(n->val);
    }
    return s + "]";
}

ListNode* mergeTwoLists(ListNode* a, ListNode* b) {
    ListNode dummy(0);           // placeholder in front of the answer (on the stack)
    ListNode* tail = &dummy;     // last node of the merged list so far
    while (a != nullptr && b != nullptr) {
        if (a->val <= b->val) {  // <= keeps equal values from a first (stable)
            tail->next = a;
            a = a->next;
        } else {
            tail->next = b;
            b = b->next;
        }
        tail = tail->next;
    }
    tail->next = (a != nullptr) ? a : b; // attach whatever is left
    return dummy.next;
}

int main() {
    std::cout << std::boolalpha;
    std::cout << fmt(mergeTwoLists(build({1, 2, 4}), build({1, 3, 4}))) << "\\n"; // [1, 1, 2, 3, 4, 4]
    std::cout << fmt(mergeTwoLists(build({}), build({}))) << "\\n";               // []
    std::cout << fmt(mergeTwoLists(build({}), build({0}))) << "\\n";              // [0]
    std::cout << fmt(mergeTwoLists(build({5}), build({1, 2, 3}))) << "\\n";       // [1, 2, 3, 5]
    std::cout << fmt(mergeTwoLists(build({-3, -1}), build({-2}))) << "\\n";       // [-3, -2, -1]

    ListNode* a = build({1, 3, 5});
    ListNode* b = build({2, 4, 6});
    ListNode* firstA = a;
    ListNode* firstB = b;
    ListNode* merged = mergeTwoLists(a, b);
    std::cout << "merged head is the old head of a: " << (merged == firstA) << "\\n";
    std::cout << "old head of b now points to value " << firstB->next->val << "\\n";
}` },
          { label: `Stability, the recursive version, and counting comparisons`, code: `#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct ListNode {
    int val;
    std::string tag; // which list the node came from, to see stability
    ListNode* next;
    ListNode(int v, std::string t) : val(v), tag(std::move(t)), next(nullptr) {}
};

std::vector<std::unique_ptr<ListNode>> pool; // owns every node

ListNode* build(const std::string& prefix, const std::vector<int>& values) {
    ListNode dummy(0, "");
    ListNode* tail = &dummy;
    for (size_t i = 0; i < values.size(); ++i) {
        pool.push_back(std::make_unique<ListNode>(values[i], prefix));
        tail->next = pool.back().get();
        tail = tail->next;
    }
    return dummy.next;
}

std::string tags(const ListNode* head) {
    std::string s;
    for (const ListNode* n = head; n != nullptr; n = n->next) {
        if (n != head) s += " ";
        s += std::to_string(n->val) + n->tag;
    }
    return s;
}

int comparisons = 0;

ListNode* mergeIterative(ListNode* a, ListNode* b, bool keepAFirst = true) {
    ListNode dummy(0, "");
    ListNode* tail = &dummy;
    while (a != nullptr && b != nullptr) {
        ++comparisons;
        bool takeA = keepAFirst ? a->val <= b->val : a->val < b->val;
        if (takeA) {
            tail->next = a;
            a = a->next;
        } else {
            tail->next = b;
            b = b->next;
        }
        tail = tail->next;
    }
    tail->next = (a != nullptr) ? a : b;
    return dummy.next;
}

ListNode* mergeRecursive(ListNode* a, ListNode* b) {
    if (a == nullptr) return b;
    if (b == nullptr) return a;
    if (a->val <= b->val) {
        a->next = mergeRecursive(a->next, b);
        return a;
    }
    b->next = mergeRecursive(a, b->next);
    return b;
}

int main() {
    std::vector<int> A = {1, 2, 4};
    std::vector<int> B = {1, 2, 3};
    std::cout << "<= keeps a first: " << tags(mergeIterative(build("a", A), build("b", B), true)) << "\\n";
    std::cout << "<  puts b first:  " << tags(mergeIterative(build("a", A), build("b", B), false)) << "\\n";
    std::cout << "recursive:        " << tags(mergeRecursive(build("a", A), build("b", B))) << "\\n";

    comparisons = 0;
    mergeIterative(build("a", {1, 3, 5, 7}), build("b", {2, 4, 6, 8}));
    std::cout << "interleaved 4 + 4 nodes: " << comparisons << " comparisons\\n";

    comparisons = 0;
    mergeIterative(build("a", {1, 2, 3}), build("b", {10, 20, 30, 40}));
    std::cout << "a ends first, 3 + 4 nodes: " << comparisons << " comparisons\\n";
}` },
        ],
      },
    },
  },
  {
    title: `What is the fast and slow pointer technique?`,
    difficulty: "easy",
    seoDescription: `The fast and slow pointer (tortoise and hare) technique in Python, JavaScript, Java and C++: list middle, cycle detection, happy numbers, verified code.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"What is the fast and slow pointer technique? Explain how it works and show me, in Python, two problems it solves on a linked list."

**What a strong answer should cover:**
- Two pointers start at the same place; the slow one moves one step and the fast one moves two steps per round.
- Use 1, the middle: when the fast pointer reaches the end, the slow pointer is halfway.
- Use 2, cycles (Floyd's algorithm): inside a loop the fast pointer gains one node per round, so the two must meet; if the fast one reaches the end, there is no cycle.
- O(n) time and O(1) extra space, compared with O(n) space for a hash set of visited nodes.
- It also works on any sequence where each value determines the next (happy numbers, find the duplicate number).
- Python specifics: comparing nodes with \`is\` (not \`==\` or values), the \`fast is not None and fast.next is not None\` order, and a \`set\` as the O(n)-space alternative.

**Code / implementation expected:** Optional — a short Python function for the middle or for cycle detection; the explanation of why the pointers meet matters more.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A tortoise and a hare start a race at the same spot. The hare runs twice as fast.

- If the course is a **straight road**, the hare reaches the finish line first, and at that exact moment the tortoise is precisely **halfway** along the road. You found the middle of the road without ever measuring it.
- If the course is secretly a **circular track**, the hare never finishes. It keeps going round, and sooner or later it comes up behind the tortoise and **laps** it. The moment they are side by side proves the track has a loop.

That is the whole technique. On a linked list you cannot see the length or the shape; you can only follow \`next\` pointers one at a time. Sending two pointers at different speeds turns "how long is it?" and "does it loop?" into questions you can answer in one pass with two variables.

## 2. The Core Idea

Keep two pointers into the same list. Both start at the head. Each round, \`slow\` moves one node and \`fast\` moves two. Everything follows from one fact: **after k rounds, \`fast\` is exactly k nodes ahead of \`slow\`**.

📌 **Interview term: Fast and slow pointers (tortoise and hare)** — two pointers that walk the same sequence at different speeds, usually one step and two steps per round, so their distance changes by a known amount each round.

The technique is a special case of the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique): both pointers move in the same direction, but at different speeds instead of under a comparison rule.

### Use 1: finding the middle

When \`fast\` runs out of list, it has covered about n nodes and \`slow\` about n / 2. So \`slow\` is on the middle node:

<svg class="iq-diagram" width="100%" viewBox="0 0 800 550" role="img" aria-label="Slow moves one node and fast moves two nodes per step on the list 1 to 5, after two steps slow is on 3 and fast is on 5">
  <defs>
    <marker id="fs1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">start</text>
  <rect class="d-box-accent" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="70" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="690" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="70" text-anchor="middle">None</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 504 65 L 554 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 634 65 L 684 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge-accent" d="M 75 134 L 75 98" marker-end="url(#fs1-arrow)"/>
  <text class="d-text d-accent" x="75" y="152" text-anchor="middle">slow and fast</text>
  <text class="d-sub" x="40" y="206">after step 1</text>
  <rect class="d-box" x="40" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="250" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="170" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="250" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="250" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="250" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="250" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="690" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="250" text-anchor="middle">None</text>
  <path class="d-edge" d="M 114 245 L 164 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 244 245 L 294 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 374 245 L 424 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 504 245 L 554 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 634 245 L 684 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge-accent" d="M 205 314 L 205 278" marker-end="url(#fs1-arrow)"/>
  <text class="d-text d-accent" x="205" y="332" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 335 314 L 335 278" marker-end="url(#fs1-arrow)"/>
  <text class="d-text" x="335" y="332" text-anchor="middle">fast</text>
  <text class="d-sub" x="40" y="386">after step 2</text>
  <rect class="d-box" x="40" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="430" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="430" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="430" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="430" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="430" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="690" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="430" text-anchor="middle">None</text>
  <path class="d-edge" d="M 114 425 L 164 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 244 425 L 294 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 374 425 L 424 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 504 425 L 554 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 634 425 L 684 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge-accent" d="M 335 494 L 335 458" marker-end="url(#fs1-arrow)"/>
  <text class="d-text d-accent" x="335" y="512" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 595 494 L 595 458" marker-end="url(#fs1-arrow)"/>
  <text class="d-text" x="595" y="512" text-anchor="middle">fast</text>
</svg>

On \`1, 2, 3, 4, 5\`: after step 1 \`slow\` is on 2 and \`fast\` on 3; after step 2 \`slow\` is on 3 and \`fast\` on 5. \`fast.next\` is now \`None\`, so the loop stops and \`slow\` (3) is the middle. For even lengths there are two middles; which one you get depends on where \`fast\` starts, which is the subject of [finding the middle of a linked list](/interview-question/how-do-you-find-the-middle-of-a-linked-list).

### Use 2: detecting a cycle

A **cycle** means some node's \`next\` points back to an earlier node, so following \`next\` never reaches \`None\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 220" role="img" aria-label="A list 1 to 6 where node 6 links back to node 3, so nodes 3 to 6 form a loop">
  <defs>
    <marker id="fs2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="100" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="100" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="100" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="430" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="100" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="560" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="100" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="690" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="100" text-anchor="middle">6</text>
  <path class="d-edge" d="M 114 95 L 164 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge" d="M 244 95 L 294 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge" d="M 374 95 L 424 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge" d="M 504 95 L 554 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge" d="M 634 95 L 684 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge-accent" d="M 725 66 L 725 30 L 335 30 L 335 64" fill="none" marker-end="url(#fs2-arrow)"/>
  <text class="d-sub" x="530" y="20" text-anchor="middle">6 links back to 3</text>
  <path class="d-edge" d="M 75 164 L 75 128" marker-end="url(#fs2-arrow)"/>
  <text class="d-text" x="75" y="182" text-anchor="middle">head</text>
  <path class="d-edge-accent" d="M 335 164 L 335 128" marker-end="url(#fs2-arrow)"/>
  <text class="d-text d-accent" x="335" y="182" text-anchor="middle">loop entry</text>
</svg>

Here node 6 links back to node 3, so nodes 3, 4, 5, 6 repeat for ever. If there is no cycle, \`fast\` reaches \`None\` and we are done: no cycle. If there is one, both pointers eventually enter the loop. From then on, each round \`fast\` gains exactly one node on \`slow\`, so the distance between them (measured forwards around the loop) goes down by one per round: k, k - 1, ..., 1, 0. It cannot skip zero, so they **must** land on the same node. That meeting is the proof of a cycle.

📌 **Interview term: Floyd's cycle detection** — the algorithm that detects a cycle by moving one pointer one step and another two steps per round and checking whether they ever point at the same node; it uses O(1) extra memory.

The full treatment, including a dry run and the hash-set alternative, is in [detecting a cycle in a linked list](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list); finding *where* the loop begins is [finding the node where the cycle begins](/interview-question/how-do-you-find-the-node-where-a-linked-list-cycle-begins).

### Use 3: sequences that are secretly linked lists

The technique does not need node objects. Any process where "the current value decides the next value" behaves like a linked list: the value is the node and the rule is \`next\`. A **happy number** is one where repeatedly replacing the number by the sum of the squares of its digits reaches 1. Starting from 19: 1 + 81 = 82, then 64 + 4 = 68, then 36 + 64 = 100, then 1. Starting from 2 the sequence never reaches 1; it falls into the loop 4, 16, 37, 58, 89, 145, 42, 20, 4. Detecting "stuck in a loop" is cycle detection, so fast and slow pointers answer it with two integers.

📌 **Interview term: Implicit linked list** — a sequence where each value determines the next one through a rule, so it can be walked (and can loop) exactly like a linked list even though no nodes exist.

### Related, but not the same

- **Gap pointers:** to [remove the nth node from the end](/interview-question/how-do-you-remove-the-nth-node-from-the-end-of-a-linked-list), both pointers move at the same speed but one starts n nodes ahead. Same family, different rule.
- **Palindrome check:** [checking whether a linked list is a palindrome](/interview-question/how-do-you-check-if-a-linked-list-is-a-palindrome) finds the middle with fast and slow pointers, then [reverses the second half](/interview-question/how-do-you-reverse-a-linked-list).

## 3. The Code in Python

Both list uses share the same loop. The middle:

~~~python
def middle(head):
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next          # 1 step
        fast = fast.next.next     # 2 steps
    return slow
~~~

Cycle detection is the same loop with one extra check after each move:

~~~python
def meet(head):
    """Return (meeting node, steps) if fast catches slow, else (None, steps)."""
    slow = fast = head
    steps = 0
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        steps += 1
        if slow is fast:          # same node object, not just equal values
            return slow, steps
    return None, steps
~~~

**What to notice:**

- \`slow is fast\` asks "are these the same node object?". Never compare values (\`slow.val == fast.val\`): two different nodes can hold the same value, which would report a cycle that is not there. Plain \`==\` on a class without \`__eq__\` also falls back to identity, but the moment someone adds \`__eq__\` (a \`@dataclass\` does it automatically) \`==\` compares contents, so \`is\` is the safe habit.
- \`while fast is not None and fast.next is not None\` relies on \`and\` short-circuiting: if \`fast\` is \`None\`, Python never evaluates \`fast.next\`. Swapping the two conditions raises \`AttributeError\` on the last step.
- \`slow = fast = head\` binds both names to the same node; it does not copy anything.

📌 **Interview term: Object identity** — whether two references point at the very same object (\`is\` in Python), as opposed to equality of their contents (\`==\`).

The number-sequence version swaps "follow \`next\`" for "apply the digit-square rule":

~~~python
def step(n):
    """Next number in the sequence: the sum of the squares of the digits."""
    total = 0
    while n > 0:
        d = n % 10
        total += d * d
        n //= 10
    return total

def is_happy(n):
    """Fast/slow pointers on a sequence of numbers instead of list nodes."""
    slow = n
    fast = step(n)
    while fast != 1 and slow != fast:
        slow = step(slow)            # 1 step
        fast = step(step(fast))      # 2 steps
    return fast == 1
~~~

\`fast\` starts one step ahead (\`step(n)\`) so the \`while\` test is not true on the first check. Python's \`//\` is floor division, so \`n //= 10\` drops the last digit; \`/\` would produce a float.

## 4. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Middle of a list and cycle detection with one pattern** prints:

~~~text
middle of [1, 2, 3, 4, 5]: 3
middle of [1, 2, 3, 4, 5, 6]: 4
middle of [8]: 8
cycle in 1 -> 2 -> 3 -> 4 -> back to 2: true
cycle in [1, 2, 3, 4]: false
pointers met at value 4 after 3 steps
~~~

**Example 2 — Fast and slow pointers on a number sequence (happy numbers)** prints:

~~~text
19 is happy: true
2 is happy: false
7 is happy: true
1 is happy: true
sequence from 2: 2 4 16 37 58 89 145 42 20 4
hash set version stored 9 numbers, fast/slow stored 2
~~~

**What the numbers show:** Example 1 uses one loop shape for both jobs: it finds the middle of odd, even and one-node lists, reports the cycle in \`1 -> 2 -> 3 -> 4 -> back to 2\`, and shows that the pointers met on node 4 after 3 rounds. Example 2 applies the identical idea to numbers, where the "list" is generated on the fly: 2 falls into the loop starting at 4 (the printed sequence returns to 4), so 2 is not happy.

## 5. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Count the length, then walk to the middle | O(n) | O(1) | two passes over the list |
| Fast and slow pointers, middle | O(n) | O(1) | one pass; \`fast\` stops after about n / 2 rounds |
| Hash set of visited nodes, cycle | O(n) | O(n) | stores every node until a repeat |
| Fast and slow pointers, cycle | O(n) | O(1) | \`fast\` reaches the end, or catches \`slow\` within one lap of the loop after \`slow\` enters it |

Example 2 shows the space difference on a real loop: for the sequence starting at 2, the set stored 9 numbers before seeing a repeat, while fast/slow keeps exactly 2 variables however long the sequence is.

## 6. Edge Cases

- **Empty list:** \`fast\` is \`None\` from the start; the middle is \`None\` and there is no cycle.
- **One node:** \`fast.next\` is \`None\`; the middle is that node. Example 1 prints \`middle of [8]: 8\`.
- **A node that points to itself:** a cycle of length 1; after one round \`slow\` and \`fast\` are both on it.
- **Even length:** two middles; this loop returns the second (\`4\` for \`[1, 2, 3, 4, 5, 6]\` in Example 1).
- **The number 1:** for happy numbers the sequence is already at 1; \`fast\` starts at \`step(1) = 1\`, and the function returns true at once.

## Common Pitfalls

- **Comparing values instead of nodes.** \`slow.val == fast.val\` gives false cycle reports on lists with duplicates; use \`slow is fast\`.
- **Wrong order in the loop test.** \`while fast.next and fast\` crashes on \`None\`; the \`None\` check of \`fast\` must come first.
- **Checking for a meeting before moving.** Both pointers start on \`head\`, so \`if slow is fast\` before the first move is always true.
- **Using a \`@dataclass\` node in a visited set.** A dataclass defines \`__eq__\` and so sets \`__hash__\` to \`None\`; \`{D(1)}\` raised \`TypeError: unhashable type: 'D'\` here. Fast/slow needs no hashing at all.
- **Mixing up the two middles.** Starting \`fast\` at \`head\` gives the second middle of an even list; starting it at \`head.next\` gives the first. Decide which one the problem needs.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Two pointers start together; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> moves one step and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> moves two each round, so their distance grows by one per round.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Middle:</strong> <span style="color:#f0e2c8;">When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> reaches the end (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast is None or fast.next is None</code>), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> has gone half as far: the middle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cycle:</strong> <span style="color:#f0e2c8;">If there is a loop, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> enters it and closes the gap to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> by one node per round, so they must meet: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow is fast</code> means a cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space, versus O(n) space for a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> of visited nodes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python details:</strong> <span style="color:#f0e2c8;">Compare nodes with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code>, put the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> check of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> first, and the same trick works on any sequence where each value determines the next (happy numbers).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must they meet and not jump over each other?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inside the loop, each round <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> gains exactly one node on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code>, so the gap goes k, k - 1, ..., 1, 0. It cannot skip zero.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find where the cycle starts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After they meet, put one pointer back at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code> and move both one step at a time; they meet again at the cycle entry. That is the follow-up question about the cycle start.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">set</code> of visited nodes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is simpler and also O(n) time, but it stores up to n nodes. Example 2 shows it stored 9 numbers for the sequence from 2, while fast/slow stored 2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would speeds 1 and 3 work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When both start at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code>, yes: after t rounds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> is 2t nodes ahead, and 2t eventually becomes a multiple of the loop length (a quick simulation over small lists always met). But the gap now changes by 2, so the simple "cannot skip zero" argument is gone, and the cycle-start trick depends on speeds 1 and 2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where else is it used?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Middle of a list (merge sort split, palindrome check), cycle detection, happy numbers, and finding the duplicate in an array whose values are indices.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Fast and slow pointers (tortoise and hare)** | two pointers on one sequence, moving one and two steps per round |
| **Floyd's cycle detection** | detect a loop by checking whether the fast pointer catches the slow one |
| **Implicit linked list** | a sequence where each value determines the next, walked like a list |
| **Object identity** | whether two names refer to the very same object (\`is\`) |

---
**Conclusion:** The fast and slow pointer technique sends two pointers down the same sequence at one and two steps per round. When the fast one runs out, the slow one is in the middle; if the fast one ever lands on the slow one, the sequence loops. Both answers cost O(n) time and O(1) extra space, which is what beats a \`set\` of visited nodes. In Python, compare nodes with \`is\`, test \`fast is not None\` before \`fast.next\`, and remember the same idea works on number sequences like happy numbers.`,
        examples: [
          { label: `Middle of a list and cycle detection with one pattern`, code: `class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next


def build(values, pos=-1):
    """Build a list; if pos >= 0 the last node links back to index pos (a cycle)."""
    nodes = [ListNode(v) for v in values]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    if pos >= 0 and nodes:
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None


def middle(head):
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next          # 1 step
        fast = fast.next.next     # 2 steps
    return slow


def meet(head):
    """Return (meeting node, steps) if fast catches slow, else (None, steps)."""
    slow = fast = head
    steps = 0
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        steps += 1
        if slow is fast:          # same node object, not just equal values
            return slow, steps
    return None, steps


for values in [[1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 6], [8]]:
    print("middle of " + str(values) + ": " + str(middle(build(values)).val))

node, steps = meet(build([1, 2, 3, 4], 1))
print("cycle in 1 -> 2 -> 3 -> 4 -> back to 2: " + str(node is not None).lower())
node2, _ = meet(build([1, 2, 3, 4]))
print("cycle in [1, 2, 3, 4]: " + str(node2 is not None).lower())
print("pointers met at value " + str(node.val) + " after " + str(steps) + " steps")` },
          { label: `Fast and slow pointers on a number sequence (happy numbers)`, code: `def step(n):
    """Next number in the sequence: the sum of the squares of the digits."""
    total = 0
    while n > 0:
        d = n % 10
        total += d * d
        n //= 10
    return total


def is_happy(n):
    """Fast/slow pointers on a sequence of numbers instead of list nodes."""
    slow = n
    fast = step(n)
    while fast != 1 and slow != fast:
        slow = step(slow)            # 1 step
        fast = step(step(fast))      # 2 steps
    return fast == 1


def is_happy_with_set(n):
    seen = set()
    while n != 1 and n not in seen:
        seen.add(n)
        n = step(n)
    return n == 1, len(seen)


print("19 is happy: " + str(is_happy(19)).lower())  # 19 is happy: true
print("2 is happy: " + str(is_happy(2)).lower())  # 2 is happy: false
print("7 is happy: " + str(is_happy(7)).lower())  # 7 is happy: true
print("1 is happy: " + str(is_happy(1)).lower())  # 1 is happy: true

seq = [2]
for _ in range(9):
    seq.append(step(seq[-1]))
print("sequence from 2: " + " ".join(str(x) for x in seq))

happy, stored = is_happy_with_set(2)
print("hash set version stored " + str(stored) + " numbers, fast/slow stored 2")` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"What is the fast and slow pointer technique? Explain how it works and show me, in JavaScript, two problems it solves on a linked list."

**What a strong answer should cover:**
- Two pointers start at the same place; the slow one moves one step and the fast one moves two steps per round.
- Use 1, the middle: when the fast pointer reaches the end, the slow pointer is halfway.
- Use 2, cycles (Floyd's algorithm): inside a loop the fast pointer gains one node per round, so the two must meet; if the fast one reaches the end, there is no cycle.
- O(n) time and O(1) extra space, compared with O(n) space for a hash set of visited nodes.
- It also works on any sequence where each value determines the next (happy numbers, find the duplicate number).
- JavaScript specifics: \`===\` on objects is reference equality, checking \`fast !== null\` before \`fast.next\`, and \`Math.floor\` when the sequence is numeric.

**Code / implementation expected:** Optional — a short JavaScript function for the middle or for cycle detection; the explanation of why the pointers meet matters more.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A tortoise and a hare start a race at the same spot. The hare runs twice as fast.

- If the course is a **straight road**, the hare reaches the finish line first, and at that exact moment the tortoise is precisely **halfway** along the road. You found the middle of the road without ever measuring it.
- If the course is secretly a **circular track**, the hare never finishes. It keeps going round, and sooner or later it comes up behind the tortoise and **laps** it. The moment they are side by side proves the track has a loop.

That is the whole technique. On a linked list you cannot see the length or the shape; you can only follow \`next\` pointers one at a time. Sending two pointers at different speeds turns "how long is it?" and "does it loop?" into questions you can answer in one pass with two variables.

## 2. The Core Idea

Keep two pointers into the same list. Both start at the head. Each round, \`slow\` moves one node and \`fast\` moves two. Everything follows from one fact: **after k rounds, \`fast\` is exactly k nodes ahead of \`slow\`**.

📌 **Interview term: Fast and slow pointers (tortoise and hare)** — two pointers that walk the same sequence at different speeds, usually one step and two steps per round, so their distance changes by a known amount each round.

The technique is a special case of the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique): both pointers move in the same direction, but at different speeds instead of under a comparison rule.

### Use 1: finding the middle

When \`fast\` runs out of list, it has covered about n nodes and \`slow\` about n / 2. So \`slow\` is on the middle node:

<svg class="iq-diagram" width="100%" viewBox="0 0 800 550" role="img" aria-label="Slow moves one node and fast moves two nodes per step on the list 1 to 5, after two steps slow is on 3 and fast is on 5">
  <defs>
    <marker id="fs1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">start</text>
  <rect class="d-box-accent" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="70" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="690" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="70" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 504 65 L 554 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 634 65 L 684 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge-accent" d="M 75 134 L 75 98" marker-end="url(#fs1-arrow)"/>
  <text class="d-text d-accent" x="75" y="152" text-anchor="middle">slow and fast</text>
  <text class="d-sub" x="40" y="206">after step 1</text>
  <rect class="d-box" x="40" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="250" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="170" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="250" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="250" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="250" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="250" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="690" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="250" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 245 L 164 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 244 245 L 294 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 374 245 L 424 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 504 245 L 554 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 634 245 L 684 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge-accent" d="M 205 314 L 205 278" marker-end="url(#fs1-arrow)"/>
  <text class="d-text d-accent" x="205" y="332" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 335 314 L 335 278" marker-end="url(#fs1-arrow)"/>
  <text class="d-text" x="335" y="332" text-anchor="middle">fast</text>
  <text class="d-sub" x="40" y="386">after step 2</text>
  <rect class="d-box" x="40" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="430" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="430" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="430" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="430" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="430" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="690" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="430" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 425 L 164 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 244 425 L 294 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 374 425 L 424 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 504 425 L 554 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 634 425 L 684 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge-accent" d="M 335 494 L 335 458" marker-end="url(#fs1-arrow)"/>
  <text class="d-text d-accent" x="335" y="512" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 595 494 L 595 458" marker-end="url(#fs1-arrow)"/>
  <text class="d-text" x="595" y="512" text-anchor="middle">fast</text>
</svg>

On \`1, 2, 3, 4, 5\`: after step 1 \`slow\` is on 2 and \`fast\` on 3; after step 2 \`slow\` is on 3 and \`fast\` on 5. \`fast.next\` is now \`null\`, so the loop stops and \`slow\` (3) is the middle. For even lengths there are two middles; which one you get depends on where \`fast\` starts, which is the subject of [finding the middle of a linked list](/interview-question/how-do-you-find-the-middle-of-a-linked-list).

### Use 2: detecting a cycle

A **cycle** means some node's \`next\` points back to an earlier node, so following \`next\` never reaches \`null\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 220" role="img" aria-label="A list 1 to 6 where node 6 links back to node 3, so nodes 3 to 6 form a loop">
  <defs>
    <marker id="fs2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="100" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="100" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="100" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="430" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="100" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="560" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="100" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="690" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="100" text-anchor="middle">6</text>
  <path class="d-edge" d="M 114 95 L 164 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge" d="M 244 95 L 294 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge" d="M 374 95 L 424 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge" d="M 504 95 L 554 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge" d="M 634 95 L 684 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge-accent" d="M 725 66 L 725 30 L 335 30 L 335 64" fill="none" marker-end="url(#fs2-arrow)"/>
  <text class="d-sub" x="530" y="20" text-anchor="middle">6 links back to 3</text>
  <path class="d-edge" d="M 75 164 L 75 128" marker-end="url(#fs2-arrow)"/>
  <text class="d-text" x="75" y="182" text-anchor="middle">head</text>
  <path class="d-edge-accent" d="M 335 164 L 335 128" marker-end="url(#fs2-arrow)"/>
  <text class="d-text d-accent" x="335" y="182" text-anchor="middle">loop entry</text>
</svg>

Here node 6 links back to node 3, so nodes 3, 4, 5, 6 repeat for ever. If there is no cycle, \`fast\` reaches \`null\` and we are done: no cycle. If there is one, both pointers eventually enter the loop. From then on, each round \`fast\` gains exactly one node on \`slow\`, so the distance between them (measured forwards around the loop) goes down by one per round: k, k - 1, ..., 1, 0. It cannot skip zero, so they **must** land on the same node. That meeting is the proof of a cycle.

📌 **Interview term: Floyd's cycle detection** — the algorithm that detects a cycle by moving one pointer one step and another two steps per round and checking whether they ever point at the same node; it uses O(1) extra memory.

The full treatment, including a dry run and the hash-set alternative, is in [detecting a cycle in a linked list](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list); finding *where* the loop begins is [finding the node where the cycle begins](/interview-question/how-do-you-find-the-node-where-a-linked-list-cycle-begins).

### Use 3: sequences that are secretly linked lists

The technique does not need node objects. Any process where "the current value decides the next value" behaves like a linked list: the value is the node and the rule is \`next\`. A **happy number** is one where repeatedly replacing the number by the sum of the squares of its digits reaches 1. Starting from 19: 1 + 81 = 82, then 64 + 4 = 68, then 36 + 64 = 100, then 1. Starting from 2 the sequence never reaches 1; it falls into the loop 4, 16, 37, 58, 89, 145, 42, 20, 4. Detecting "stuck in a loop" is cycle detection, so fast and slow pointers answer it with two integers.

📌 **Interview term: Implicit linked list** — a sequence where each value determines the next one through a rule, so it can be walked (and can loop) exactly like a linked list even though no nodes exist.

### Related, but not the same

- **Gap pointers:** to [remove the nth node from the end](/interview-question/how-do-you-remove-the-nth-node-from-the-end-of-a-linked-list), both pointers move at the same speed but one starts n nodes ahead. Same family, different rule.
- **Palindrome check:** [checking whether a linked list is a palindrome](/interview-question/how-do-you-check-if-a-linked-list-is-a-palindrome) finds the middle with fast and slow pointers, then [reverses the second half](/interview-question/how-do-you-reverse-a-linked-list).

## 3. The Code in JavaScript

Both list uses share the same loop. The middle:

~~~javascript
function middle(head) {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;      // 1 step
    fast = fast.next.next; // 2 steps
  }
  return slow;
}
~~~

Cycle detection is the same loop with one extra check after each move:

~~~javascript
// Returns { node, steps }: node is the meeting node, or null when there is no cycle.
function meet(head) {
  let slow = head;
  let fast = head;
  let steps = 0;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
    steps++;
    if (slow === fast) return { node: slow, steps }; // same object, not just equal values
  }
  return { node: null, steps };
}
~~~

**What to notice:**

- \`slow === fast\` on two objects is \`true\` only when both variables refer to the same object; it never compares contents. That is exactly the "same node" test the technique needs. Never compare values (\`slow.val === fast.val\`): two different nodes can hold the same value.
- \`while (fast !== null && fast.next !== null)\` relies on \`&&\` short-circuiting: when \`fast\` is \`null\`, \`fast.next\` is never read. Swapping them throws \`TypeError: Cannot read properties of null\`.
- If nodes might have \`next === undefined\` (plain object literals without \`next\`), test with \`!= null\`, which matches both \`null\` and \`undefined\`.

📌 **Interview term: Reference equality** — \`===\` on objects is true only when both sides are the same object in memory; two objects with identical fields are still unequal.

The number-sequence version swaps "follow \`next\`" for "apply the digit-square rule":

~~~javascript
// Next number in the sequence: the sum of the squares of the digits.
function step(n) {
  let total = 0;
  while (n > 0) {
    const d = n % 10;
    total += d * d;
    n = Math.floor(n / 10); // plain / would give a fraction in JavaScript
  }
  return total;
}

// Fast/slow pointers on a sequence of numbers instead of list nodes.
function isHappy(n) {
  let slow = n;
  let fast = step(n);
  while (fast !== 1 && slow !== fast) {
    slow = step(slow);       // 1 step
    fast = step(step(fast)); // 2 steps
  }
  return fast === 1;
}
~~~

\`fast\` starts one step ahead (\`step(n)\`) so the \`while\` test is not true on the first check. JavaScript numbers are all floating point, so the digit loop uses \`Math.floor(n / 10)\`; plain \`n / 10\` would turn 19 into \`1.9\` instead of \`1\`, and the digit sums would be wrong.

## 4. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Middle of a list and cycle detection with one pattern** prints:

~~~text
middle of [1, 2, 3, 4, 5]: 3
middle of [1, 2, 3, 4, 5, 6]: 4
middle of [8]: 8
cycle in 1 -> 2 -> 3 -> 4 -> back to 2: true
cycle in [1, 2, 3, 4]: false
pointers met at value 4 after 3 steps
~~~

**Example 2 — Fast and slow pointers on a number sequence (happy numbers)** prints:

~~~text
19 is happy: true
2 is happy: false
7 is happy: true
1 is happy: true
sequence from 2: 2 4 16 37 58 89 145 42 20 4
hash set version stored 9 numbers, fast/slow stored 2
~~~

**What the numbers show:** Example 1 uses one loop shape for both jobs: it finds the middle of odd, even and one-node lists, reports the cycle in \`1 -> 2 -> 3 -> 4 -> back to 2\`, and shows that the pointers met on node 4 after 3 rounds. Example 2 applies the identical idea to numbers, where the "list" is generated on the fly: 2 falls into the loop starting at 4 (the printed sequence returns to 4), so 2 is not happy.

## 5. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Count the length, then walk to the middle | O(n) | O(1) | two passes over the list |
| Fast and slow pointers, middle | O(n) | O(1) | one pass; \`fast\` stops after about n / 2 rounds |
| Hash set of visited nodes, cycle | O(n) | O(n) | stores every node until a repeat |
| Fast and slow pointers, cycle | O(n) | O(1) | \`fast\` reaches the end, or catches \`slow\` within one lap of the loop after \`slow\` enters it |

Example 2 shows the space difference on a real loop: for the sequence starting at 2, the set stored 9 numbers before seeing a repeat, while fast/slow keeps exactly 2 variables however long the sequence is.

## 6. Edge Cases

- **Empty list:** \`fast\` is \`null\` from the start; the middle is \`null\` and there is no cycle.
- **One node:** \`fast.next\` is \`null\`; the middle is that node. Example 1 prints \`middle of [8]: 8\`.
- **A node that points to itself:** a cycle of length 1; after one round \`slow\` and \`fast\` are both on it.
- **Even length:** two middles; this loop returns the second (\`4\` for \`[1, 2, 3, 4, 5, 6]\` in Example 1).
- **The number 1:** for happy numbers the sequence is already at 1; \`fast\` starts at \`step(1) = 1\`, and the function returns true at once.

## Common Pitfalls

- **Comparing values instead of nodes.** \`slow.val === fast.val\` gives false cycle reports on lists with duplicates; compare the nodes with \`slow === fast\`.
- **Wrong order in the loop test.** \`fast.next !== null && fast !== null\` reads \`.next\` of \`null\` and throws; check \`fast\` first.
- **\`undefined\` at the end of the list.** Object literals without \`next\` make \`!== null\` tests pass for \`undefined\`; default \`next\` to \`null\` or use \`!= null\`.
- **Checking for a meeting before moving.** Both start on \`head\`, so the check before the first move is always true.
- **Float division in number sequences.** In the happy-number variant, \`n / 10\` keeps the fraction; use \`Math.floor(n / 10)\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Two pointers start together; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> moves one step and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> moves two each round, so their distance grows by one per round.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Middle:</strong> <span style="color:#f0e2c8;">When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> hits the end (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast === null || fast.next === null</code>), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> is halfway: the middle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cycle:</strong> <span style="color:#f0e2c8;">If there is a loop, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> closes the gap to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> by one node per round, so they must meet; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow === fast</code> means a cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space, versus O(n) for a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of visited nodes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code> on objects is reference equality, which is what we want; check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast.next</code>; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.floor</code> in number sequences.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must they meet and not jump over each other?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inside the loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> gains exactly one node per round, so the gap counts down k, k - 1, ..., 0 and cannot skip zero.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find where the cycle starts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After the meeting, move one pointer back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code> and step both one at a time; they meet at the cycle entry.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Set</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of nodes works (it compares objects by reference) and is O(n) time, but it holds up to n entries. Example 2 shows 9 stored values versus 2 variables.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">WeakSet</code> fix the memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakSet</code> lets garbage collection drop entries for objects nobody else references, but the list still references every node, so it still grows to n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where else is it used?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Middle of a list, palindrome linked list, cycle detection, happy numbers, and the find-the-duplicate array problem.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Fast and slow pointers (tortoise and hare)** | two pointers on one sequence, moving one and two steps per round |
| **Floyd's cycle detection** | detect a loop by checking whether the fast pointer catches the slow one |
| **Implicit linked list** | a sequence where each value determines the next, walked like a list |
| **Reference equality** | \`===\` on objects is true only for the same object |

---
**Conclusion:** The fast and slow pointer technique sends two pointers down the same sequence at one and two steps per round. When the fast one runs out, the slow one is in the middle; if the fast one ever lands on the slow one, the sequence loops. Both answers cost O(n) time and O(1) extra space, which is what beats a \`Set\` of visited nodes. In JavaScript, compare nodes with \`===\` (reference equality), check \`fast !== null\` before \`fast.next\`, and use \`Math.floor\` when the sequence is numeric.`,
        examples: [
          { label: `Middle of a list and cycle detection with one pattern`, code: `class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

// Build a list; if pos >= 0 the last node links back to index pos (a cycle).
function build(values, pos = -1) {
  const nodes = values.map((v) => new ListNode(v));
  for (let i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1];
  if (pos >= 0 && nodes.length > 0) nodes[nodes.length - 1].next = nodes[pos];
  return nodes.length > 0 ? nodes[0] : null;
}

const fmt = (arr) => '[' + arr.join(', ') + ']';

function middle(head) {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;      // 1 step
    fast = fast.next.next; // 2 steps
  }
  return slow;
}

// Returns { node, steps }: node is the meeting node, or null when there is no cycle.
function meet(head) {
  let slow = head;
  let fast = head;
  let steps = 0;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
    steps++;
    if (slow === fast) return { node: slow, steps }; // same object, not just equal values
  }
  return { node: null, steps };
}

for (const values of [[1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 6], [8]]) {
  console.log('middle of ' + fmt(values) + ': ' + middle(build(values)).val);
}

const r = meet(build([1, 2, 3, 4], 1));
console.log('cycle in 1 -> 2 -> 3 -> 4 -> back to 2: ' + (r.node !== null));
console.log('cycle in [1, 2, 3, 4]: ' + (meet(build([1, 2, 3, 4])).node !== null));
console.log('pointers met at value ' + r.node.val + ' after ' + r.steps + ' steps');` },
          { label: `Fast and slow pointers on a number sequence (happy numbers)`, code: `// Next number in the sequence: the sum of the squares of the digits.
function step(n) {
  let total = 0;
  while (n > 0) {
    const d = n % 10;
    total += d * d;
    n = Math.floor(n / 10); // plain / would give a fraction in JavaScript
  }
  return total;
}

// Fast/slow pointers on a sequence of numbers instead of list nodes.
function isHappy(n) {
  let slow = n;
  let fast = step(n);
  while (fast !== 1 && slow !== fast) {
    slow = step(slow);       // 1 step
    fast = step(step(fast)); // 2 steps
  }
  return fast === 1;
}

function isHappyWithSet(n) {
  const seen = new Set();
  while (n !== 1 && !seen.has(n)) {
    seen.add(n);
    n = step(n);
  }
  return { happy: n === 1, stored: seen.size };
}

console.log('19 is happy: ' + isHappy(19)); // 19 is happy: true
console.log('2 is happy: ' + isHappy(2)); // 2 is happy: false
console.log('7 is happy: ' + isHappy(7)); // 7 is happy: true
console.log('1 is happy: ' + isHappy(1)); // 1 is happy: true

const seq = [2];
for (let i = 0; i < 9; i++) seq.push(step(seq[seq.length - 1]));
console.log('sequence from 2: ' + seq.join(' '));

const r = isHappyWithSet(2);
console.log('hash set version stored ' + r.stored + ' numbers, fast/slow stored 2');` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"What is the fast and slow pointer technique? Explain how it works and show me, in Java, two problems it solves on a linked list."

**What a strong answer should cover:**
- Two pointers start at the same place; the slow one moves one step and the fast one moves two steps per round.
- Use 1, the middle: when the fast pointer reaches the end, the slow pointer is halfway.
- Use 2, cycles (Floyd's algorithm): inside a loop the fast pointer gains one node per round, so the two must meet; if the fast one reaches the end, there is no cycle.
- O(n) time and O(1) extra space, compared with O(n) space for a hash set of visited nodes.
- It also works on any sequence where each value determines the next (happy numbers, find the duplicate number).
- Java specifics: \`==\` compares references (never \`.equals\` on nodes), the \`fast != null && fast.next != null\` order, and \`HashSet\` boxing in the alternative.

**Code / implementation expected:** Optional — a short Java function for the middle or for cycle detection; the explanation of why the pointers meet matters more.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A tortoise and a hare start a race at the same spot. The hare runs twice as fast.

- If the course is a **straight road**, the hare reaches the finish line first, and at that exact moment the tortoise is precisely **halfway** along the road. You found the middle of the road without ever measuring it.
- If the course is secretly a **circular track**, the hare never finishes. It keeps going round, and sooner or later it comes up behind the tortoise and **laps** it. The moment they are side by side proves the track has a loop.

That is the whole technique. On a linked list you cannot see the length or the shape; you can only follow \`next\` pointers one at a time. Sending two pointers at different speeds turns "how long is it?" and "does it loop?" into questions you can answer in one pass with two variables.

## 2. The Core Idea

Keep two pointers into the same list. Both start at the head. Each round, \`slow\` moves one node and \`fast\` moves two. Everything follows from one fact: **after k rounds, \`fast\` is exactly k nodes ahead of \`slow\`**.

📌 **Interview term: Fast and slow pointers (tortoise and hare)** — two pointers that walk the same sequence at different speeds, usually one step and two steps per round, so their distance changes by a known amount each round.

The technique is a special case of the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique): both pointers move in the same direction, but at different speeds instead of under a comparison rule.

### Use 1: finding the middle

When \`fast\` runs out of list, it has covered about n nodes and \`slow\` about n / 2. So \`slow\` is on the middle node:

<svg class="iq-diagram" width="100%" viewBox="0 0 800 550" role="img" aria-label="Slow moves one node and fast moves two nodes per step on the list 1 to 5, after two steps slow is on 3 and fast is on 5">
  <defs>
    <marker id="fs1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">start</text>
  <rect class="d-box-accent" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="70" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="690" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="70" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 504 65 L 554 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 634 65 L 684 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge-accent" d="M 75 134 L 75 98" marker-end="url(#fs1-arrow)"/>
  <text class="d-text d-accent" x="75" y="152" text-anchor="middle">slow and fast</text>
  <text class="d-sub" x="40" y="206">after step 1</text>
  <rect class="d-box" x="40" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="250" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="170" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="250" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="250" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="250" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="250" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="690" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="250" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 245 L 164 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 244 245 L 294 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 374 245 L 424 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 504 245 L 554 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 634 245 L 684 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge-accent" d="M 205 314 L 205 278" marker-end="url(#fs1-arrow)"/>
  <text class="d-text d-accent" x="205" y="332" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 335 314 L 335 278" marker-end="url(#fs1-arrow)"/>
  <text class="d-text" x="335" y="332" text-anchor="middle">fast</text>
  <text class="d-sub" x="40" y="386">after step 2</text>
  <rect class="d-box" x="40" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="430" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="430" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="430" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="430" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="430" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="690" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="430" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 425 L 164 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 244 425 L 294 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 374 425 L 424 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 504 425 L 554 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 634 425 L 684 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge-accent" d="M 335 494 L 335 458" marker-end="url(#fs1-arrow)"/>
  <text class="d-text d-accent" x="335" y="512" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 595 494 L 595 458" marker-end="url(#fs1-arrow)"/>
  <text class="d-text" x="595" y="512" text-anchor="middle">fast</text>
</svg>

On \`1, 2, 3, 4, 5\`: after step 1 \`slow\` is on 2 and \`fast\` on 3; after step 2 \`slow\` is on 3 and \`fast\` on 5. \`fast.next\` is now \`null\`, so the loop stops and \`slow\` (3) is the middle. For even lengths there are two middles; which one you get depends on where \`fast\` starts, which is the subject of [finding the middle of a linked list](/interview-question/how-do-you-find-the-middle-of-a-linked-list).

### Use 2: detecting a cycle

A **cycle** means some node's \`next\` points back to an earlier node, so following \`next\` never reaches \`null\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 220" role="img" aria-label="A list 1 to 6 where node 6 links back to node 3, so nodes 3 to 6 form a loop">
  <defs>
    <marker id="fs2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="100" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="100" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="100" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="430" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="100" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="560" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="100" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="690" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="100" text-anchor="middle">6</text>
  <path class="d-edge" d="M 114 95 L 164 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge" d="M 244 95 L 294 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge" d="M 374 95 L 424 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge" d="M 504 95 L 554 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge" d="M 634 95 L 684 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge-accent" d="M 725 66 L 725 30 L 335 30 L 335 64" fill="none" marker-end="url(#fs2-arrow)"/>
  <text class="d-sub" x="530" y="20" text-anchor="middle">6 links back to 3</text>
  <path class="d-edge" d="M 75 164 L 75 128" marker-end="url(#fs2-arrow)"/>
  <text class="d-text" x="75" y="182" text-anchor="middle">head</text>
  <path class="d-edge-accent" d="M 335 164 L 335 128" marker-end="url(#fs2-arrow)"/>
  <text class="d-text d-accent" x="335" y="182" text-anchor="middle">loop entry</text>
</svg>

Here node 6 links back to node 3, so nodes 3, 4, 5, 6 repeat for ever. If there is no cycle, \`fast\` reaches \`null\` and we are done: no cycle. If there is one, both pointers eventually enter the loop. From then on, each round \`fast\` gains exactly one node on \`slow\`, so the distance between them (measured forwards around the loop) goes down by one per round: k, k - 1, ..., 1, 0. It cannot skip zero, so they **must** land on the same node. That meeting is the proof of a cycle.

📌 **Interview term: Floyd's cycle detection** — the algorithm that detects a cycle by moving one pointer one step and another two steps per round and checking whether they ever point at the same node; it uses O(1) extra memory.

The full treatment, including a dry run and the hash-set alternative, is in [detecting a cycle in a linked list](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list); finding *where* the loop begins is [finding the node where the cycle begins](/interview-question/how-do-you-find-the-node-where-a-linked-list-cycle-begins).

### Use 3: sequences that are secretly linked lists

The technique does not need node objects. Any process where "the current value decides the next value" behaves like a linked list: the value is the node and the rule is \`next\`. A **happy number** is one where repeatedly replacing the number by the sum of the squares of its digits reaches 1. Starting from 19: 1 + 81 = 82, then 64 + 4 = 68, then 36 + 64 = 100, then 1. Starting from 2 the sequence never reaches 1; it falls into the loop 4, 16, 37, 58, 89, 145, 42, 20, 4. Detecting "stuck in a loop" is cycle detection, so fast and slow pointers answer it with two integers.

📌 **Interview term: Implicit linked list** — a sequence where each value determines the next one through a rule, so it can be walked (and can loop) exactly like a linked list even though no nodes exist.

### Related, but not the same

- **Gap pointers:** to [remove the nth node from the end](/interview-question/how-do-you-remove-the-nth-node-from-the-end-of-a-linked-list), both pointers move at the same speed but one starts n nodes ahead. Same family, different rule.
- **Palindrome check:** [checking whether a linked list is a palindrome](/interview-question/how-do-you-check-if-a-linked-list-is-a-palindrome) finds the middle with fast and slow pointers, then [reverses the second half](/interview-question/how-do-you-reverse-a-linked-list).

## 3. The Code in Java

Both list uses share the same loop. The middle:

~~~java
static ListNode middle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;      // 1 step
        fast = fast.next.next; // 2 steps
    }
    return slow;
}
~~~

Cycle detection is the same loop with one extra check after each move:

~~~java
// Returns the meeting node, or null when there is no cycle; sets steps.
static ListNode meet(ListNode head) {
    ListNode slow = head, fast = head;
    steps = 0;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        steps++;
        if (slow == fast) return slow; // == compares references: the same node
    }
    return null;
}
~~~

**What to notice:**

- \`slow == fast\` on objects compares **references**: it is \`true\` only when both point to the same node, which is exactly the test the technique needs. Do not use \`.equals\` or compare \`val\`: if \`ListNode\` overrides \`equals\` to compare values, two different nodes with the same value look "equal". With such an override, a hash-set walk over the acyclic list \`1 -> 2 -> 1\` reported a cycle here (\`value-equals visited set says cycle: true\`).
- \`while (fast != null && fast.next != null)\` relies on \`&&\` short-circuiting: when \`fast\` is \`null\`, \`fast.next\` is never evaluated. Swapping them throws \`NullPointerException\`.
- \`ListNode slow = head, fast = head;\` copies the reference twice; no node is copied.

📌 **Interview term: Reference equality** — \`==\` on Java objects tests whether two references point to the same object; \`.equals\` tests whatever the class defines as "equal".

The number-sequence version swaps "follow \`next\`" for "apply the digit-square rule":

~~~java
// Next number in the sequence: the sum of the squares of the digits.
static int step(int n) {
    int total = 0;
    while (n > 0) {
        int d = n % 10;
        total += d * d;
        n /= 10; // int division drops the fraction
    }
    return total;
}

// Fast/slow pointers on a sequence of numbers instead of list nodes.
static boolean isHappy(int n) {
    int slow = n;
    int fast = step(n);
    while (fast != 1 && slow != fast) {
        slow = step(slow);       // 1 step
        fast = step(step(fast)); // 2 steps
    }
    return fast == 1;
}
~~~

\`fast\` starts one step ahead (\`step(n)\`) so the \`while\` test is not true on the first check. \`n /= 10\` on an \`int\` is integer division and drops the last digit. The hash-set version stores \`Integer\` objects (each \`add\` autoboxes the \`int\`), which is part of why the two-variable version is lighter.

## 4. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Middle of a list and cycle detection with one pattern** prints:

~~~text
middle of [1, 2, 3, 4, 5]: 3
middle of [1, 2, 3, 4, 5, 6]: 4
middle of [8]: 8
cycle in 1 -> 2 -> 3 -> 4 -> back to 2: true
cycle in [1, 2, 3, 4]: false
pointers met at value 4 after 3 steps
~~~

**Example 2 — Fast and slow pointers on a number sequence (happy numbers)** prints:

~~~text
19 is happy: true
2 is happy: false
7 is happy: true
1 is happy: true
sequence from 2: 2 4 16 37 58 89 145 42 20 4
hash set version stored 9 numbers, fast/slow stored 2
~~~

**What the numbers show:** Example 1 uses one loop shape for both jobs: it finds the middle of odd, even and one-node lists, reports the cycle in \`1 -> 2 -> 3 -> 4 -> back to 2\`, and shows that the pointers met on node 4 after 3 rounds. Example 2 applies the identical idea to numbers, where the "list" is generated on the fly: 2 falls into the loop starting at 4 (the printed sequence returns to 4), so 2 is not happy.

## 5. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Count the length, then walk to the middle | O(n) | O(1) | two passes over the list |
| Fast and slow pointers, middle | O(n) | O(1) | one pass; \`fast\` stops after about n / 2 rounds |
| Hash set of visited nodes, cycle | O(n) | O(n) | stores every node until a repeat |
| Fast and slow pointers, cycle | O(n) | O(1) | \`fast\` reaches the end, or catches \`slow\` within one lap of the loop after \`slow\` enters it |

Example 2 shows the space difference on a real loop: for the sequence starting at 2, the set stored 9 numbers before seeing a repeat, while fast/slow keeps exactly 2 variables however long the sequence is.

## 6. Edge Cases

- **Empty list:** \`fast\` is \`null\` from the start; the middle is \`null\` and there is no cycle.
- **One node:** \`fast.next\` is \`null\`; the middle is that node. Example 1 prints \`middle of [8]: 8\`.
- **A node that points to itself:** a cycle of length 1; after one round \`slow\` and \`fast\` are both on it.
- **Even length:** two middles; this loop returns the second (\`4\` for \`[1, 2, 3, 4, 5, 6]\` in Example 1).
- **The number 1:** for happy numbers the sequence is already at 1; \`fast\` starts at \`step(1) = 1\`, and the function returns true at once.

## Common Pitfalls

- **Comparing with \`.equals\` or \`val\`.** A value-based \`equals\` makes different nodes look the same and reports cycles that do not exist (verified above); use \`==\` on the references.
- **Wrong order in the loop test.** \`fast.next != null && fast != null\` throws \`NullPointerException\` at the end of an even list; check \`fast\` first.
- **Checking for a meeting before moving.** Both start on \`head\`, so the check before the first move is always true.
- **Boxing in the hash-set alternative.** \`HashSet<Integer>\` stores an \`Integer\` object per value; the two-variable version avoids that memory entirely.
- **Mixing up the two middles.** \`fast = head\` gives the second middle of an even list; \`fast = head.next\` gives the first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Two references start together; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> moves one step and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> moves two each round, so their distance grows by one per round.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Middle:</strong> <span style="color:#f0e2c8;">When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast == null || fast.next == null</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> has gone half as far: the middle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cycle:</strong> <span style="color:#f0e2c8;">If there is a loop, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> closes the gap to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> by one node per round, so they must meet; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow == fast</code> means a cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space, versus O(n) for a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet&lt;ListNode&gt;</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> compares references, which is the right test; never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.equals</code> on nodes; check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast != null</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast.next</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must they meet and not jump over each other?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inside the loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> gains exactly one node per round, so the gap counts down to 0 and cannot skip it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find where the cycle starts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After the meeting, reset one reference to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code> and step both one node at a time; they meet at the entry.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashSet</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode</code> keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object</code>'s identity <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hashCode</code>, but it stores up to n references plus hash-table overhead. Fast/slow stores two.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if someone overrides <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">equals</code> on <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ListNode</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A value-based <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code> breaks the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet</code> version: different nodes with equal values look like a revisit. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IdentityHashMap</code>-based sets or fast/slow avoid the problem.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where else is it used?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Middle of a list, palindrome linked list, cycle detection, happy numbers, and the find-the-duplicate array problem.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Fast and slow pointers (tortoise and hare)** | two pointers on one sequence, moving one and two steps per round |
| **Floyd's cycle detection** | detect a loop by checking whether the fast pointer catches the slow one |
| **Implicit linked list** | a sequence where each value determines the next, walked like a list |
| **Reference equality** | \`==\` on objects tests whether both references point to the same object |

---
**Conclusion:** The fast and slow pointer technique sends two references down the same sequence at one and two steps per round. When the fast one runs out, the slow one is in the middle; if the fast one ever lands on the slow one, the sequence loops. Both answers cost O(n) time and O(1) extra space, which is what beats a \`HashSet\` of visited nodes. In Java, compare nodes with \`==\`, never \`.equals\`, and check \`fast != null\` before \`fast.next\`.`,
        examples: [
          { label: `Middle of a list and cycle detection with one pattern`, code: `import java.util.Arrays;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    // Build a list; if pos >= 0 the last node links back to index pos (a cycle).
    static ListNode build(int[] values, int pos) {
        if (values.length == 0) return null;
        ListNode[] nodes = new ListNode[values.length];
        for (int i = 0; i < values.length; i++) nodes[i] = new ListNode(values[i]);
        for (int i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1];
        if (pos >= 0) nodes[nodes.length - 1].next = nodes[pos];
        return nodes[0];
    }

    static ListNode middle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;      // 1 step
            fast = fast.next.next; // 2 steps
        }
        return slow;
    }

    static int steps = 0;

    // Returns the meeting node, or null when there is no cycle; sets steps.
    static ListNode meet(ListNode head) {
        ListNode slow = head, fast = head;
        steps = 0;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            steps++;
            if (slow == fast) return slow; // == compares references: the same node
        }
        return null;
    }

    public static void main(String[] args) {
        int[][] cases = {{1, 2, 3, 4, 5}, {1, 2, 3, 4, 5, 6}, {8}};
        for (int[] values : cases) {
            System.out.println("middle of " + Arrays.toString(values) + ": " + middle(build(values, -1)).val);
        }

        ListNode node = meet(build(new int[]{1, 2, 3, 4}, 1));
        int metAfter = steps;
        System.out.println("cycle in 1 -> 2 -> 3 -> 4 -> back to 2: " + (node != null));
        System.out.println("cycle in [1, 2, 3, 4]: " + (meet(build(new int[]{1, 2, 3, 4}, -1)) != null));
        System.out.println("pointers met at value " + node.val + " after " + metAfter + " steps");
    }
}` },
          { label: `Fast and slow pointers on a number sequence (happy numbers)`, code: `import java.util.HashSet;
import java.util.Set;

public class Main {
    // Next number in the sequence: the sum of the squares of the digits.
    static int step(int n) {
        int total = 0;
        while (n > 0) {
            int d = n % 10;
            total += d * d;
            n /= 10; // int division drops the fraction
        }
        return total;
    }

    // Fast/slow pointers on a sequence of numbers instead of list nodes.
    static boolean isHappy(int n) {
        int slow = n;
        int fast = step(n);
        while (fast != 1 && slow != fast) {
            slow = step(slow);       // 1 step
            fast = step(step(fast)); // 2 steps
        }
        return fast == 1;
    }

    static int storedBySet = 0;

    static boolean isHappyWithSet(int n) {
        Set<Integer> seen = new HashSet<>(); // every add boxes an int into an Integer
        while (n != 1 && !seen.contains(n)) {
            seen.add(n);
            n = step(n);
        }
        storedBySet = seen.size();
        return n == 1;
    }

    public static void main(String[] args) {
        System.out.println("19 is happy: " + isHappy(19)); // 19 is happy: true
        System.out.println("2 is happy: " + isHappy(2));   // 2 is happy: false
        System.out.println("7 is happy: " + isHappy(7));   // 7 is happy: true
        System.out.println("1 is happy: " + isHappy(1));   // 1 is happy: true

        StringBuilder seq = new StringBuilder("2");
        int x = 2;
        for (int i = 0; i < 9; i++) {
            x = step(x);
            seq.append(' ').append(x);
        }
        System.out.println("sequence from 2: " + seq);

        isHappyWithSet(2);
        System.out.println("hash set version stored " + storedBySet + " numbers, fast/slow stored 2");
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"What is the fast and slow pointer technique? Explain how it works and show me, in C++, two problems it solves on a linked list."

**What a strong answer should cover:**
- Two pointers start at the same place; the slow one moves one step and the fast one moves two steps per round.
- Use 1, the middle: when the fast pointer reaches the end, the slow pointer is halfway.
- Use 2, cycles (Floyd's algorithm): inside a loop the fast pointer gains one node per round, so the two must meet; if the fast one reaches the end, there is no cycle.
- O(n) time and O(1) extra space, compared with O(n) space for a hash set of visited nodes.
- It also works on any sequence where each value determines the next (happy numbers, find the duplicate number).
- C++ specifics: comparing \`ListNode*\` addresses, short-circuit order to avoid dereferencing \`nullptr\`, and freeing nodes safely when the list has a cycle.

**Code / implementation expected:** Optional — a short C++ function for the middle or for cycle detection; the explanation of why the pointers meet matters more.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A tortoise and a hare start a race at the same spot. The hare runs twice as fast.

- If the course is a **straight road**, the hare reaches the finish line first, and at that exact moment the tortoise is precisely **halfway** along the road. You found the middle of the road without ever measuring it.
- If the course is secretly a **circular track**, the hare never finishes. It keeps going round, and sooner or later it comes up behind the tortoise and **laps** it. The moment they are side by side proves the track has a loop.

That is the whole technique. On a linked list you cannot see the length or the shape; you can only follow \`next\` pointers one at a time. Sending two pointers at different speeds turns "how long is it?" and "does it loop?" into questions you can answer in one pass with two variables.

## 2. The Core Idea

Keep two pointers into the same list. Both start at the head. Each round, \`slow\` moves one node and \`fast\` moves two. Everything follows from one fact: **after k rounds, \`fast\` is exactly k nodes ahead of \`slow\`**.

📌 **Interview term: Fast and slow pointers (tortoise and hare)** — two pointers that walk the same sequence at different speeds, usually one step and two steps per round, so their distance changes by a known amount each round.

The technique is a special case of the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique): both pointers move in the same direction, but at different speeds instead of under a comparison rule.

### Use 1: finding the middle

When \`fast\` runs out of list, it has covered about n nodes and \`slow\` about n / 2. So \`slow\` is on the middle node:

<svg class="iq-diagram" width="100%" viewBox="0 0 800 550" role="img" aria-label="Slow moves one node and fast moves two nodes per step on the list 1 to 5, after two steps slow is on 3 and fast is on 5">
  <defs>
    <marker id="fs1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">start</text>
  <rect class="d-box-accent" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="70" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="690" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="70" text-anchor="middle">nullptr</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 504 65 L 554 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 634 65 L 684 65" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge-accent" d="M 75 134 L 75 98" marker-end="url(#fs1-arrow)"/>
  <text class="d-text d-accent" x="75" y="152" text-anchor="middle">slow and fast</text>
  <text class="d-sub" x="40" y="206">after step 1</text>
  <rect class="d-box" x="40" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="250" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="170" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="250" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="250" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="250" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="250" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="690" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="250" text-anchor="middle">nullptr</text>
  <path class="d-edge" d="M 114 245 L 164 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 244 245 L 294 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 374 245 L 424 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 504 245 L 554 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 634 245 L 684 245" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge-accent" d="M 205 314 L 205 278" marker-end="url(#fs1-arrow)"/>
  <text class="d-text d-accent" x="205" y="332" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 335 314 L 335 278" marker-end="url(#fs1-arrow)"/>
  <text class="d-text" x="335" y="332" text-anchor="middle">fast</text>
  <text class="d-sub" x="40" y="386">after step 2</text>
  <rect class="d-box" x="40" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="430" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="430" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="430" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="430" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="430" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="690" y="400" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="430" text-anchor="middle">nullptr</text>
  <path class="d-edge" d="M 114 425 L 164 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 244 425 L 294 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 374 425 L 424 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 504 425 L 554 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge" d="M 634 425 L 684 425" marker-end="url(#fs1-arrow)"/>
  <path class="d-edge-accent" d="M 335 494 L 335 458" marker-end="url(#fs1-arrow)"/>
  <text class="d-text d-accent" x="335" y="512" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 595 494 L 595 458" marker-end="url(#fs1-arrow)"/>
  <text class="d-text" x="595" y="512" text-anchor="middle">fast</text>
</svg>

On \`1, 2, 3, 4, 5\`: after step 1 \`slow\` is on 2 and \`fast\` on 3; after step 2 \`slow\` is on 3 and \`fast\` on 5. \`fast->next\` is now \`nullptr\`, so the loop stops and \`slow\` (3) is the middle. For even lengths there are two middles; which one you get depends on where \`fast\` starts, which is the subject of [finding the middle of a linked list](/interview-question/how-do-you-find-the-middle-of-a-linked-list).

### Use 2: detecting a cycle

A **cycle** means some node's \`next\` points back to an earlier node, so following \`next\` never reaches \`nullptr\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 220" role="img" aria-label="A list 1 to 6 where node 6 links back to node 3, so nodes 3 to 6 form a loop">
  <defs>
    <marker id="fs2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="100" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="100" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="100" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="430" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="100" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="560" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="100" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="690" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="100" text-anchor="middle">6</text>
  <path class="d-edge" d="M 114 95 L 164 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge" d="M 244 95 L 294 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge" d="M 374 95 L 424 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge" d="M 504 95 L 554 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge" d="M 634 95 L 684 95" marker-end="url(#fs2-arrow)"/>
  <path class="d-edge-accent" d="M 725 66 L 725 30 L 335 30 L 335 64" fill="none" marker-end="url(#fs2-arrow)"/>
  <text class="d-sub" x="530" y="20" text-anchor="middle">6 links back to 3</text>
  <path class="d-edge" d="M 75 164 L 75 128" marker-end="url(#fs2-arrow)"/>
  <text class="d-text" x="75" y="182" text-anchor="middle">head</text>
  <path class="d-edge-accent" d="M 335 164 L 335 128" marker-end="url(#fs2-arrow)"/>
  <text class="d-text d-accent" x="335" y="182" text-anchor="middle">loop entry</text>
</svg>

Here node 6 links back to node 3, so nodes 3, 4, 5, 6 repeat for ever. If there is no cycle, \`fast\` reaches \`nullptr\` and we are done: no cycle. If there is one, both pointers eventually enter the loop. From then on, each round \`fast\` gains exactly one node on \`slow\`, so the distance between them (measured forwards around the loop) goes down by one per round: k, k - 1, ..., 1, 0. It cannot skip zero, so they **must** land on the same node. That meeting is the proof of a cycle.

📌 **Interview term: Floyd's cycle detection** — the algorithm that detects a cycle by moving one pointer one step and another two steps per round and checking whether they ever point at the same node; it uses O(1) extra memory.

The full treatment, including a dry run and the hash-set alternative, is in [detecting a cycle in a linked list](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list); finding *where* the loop begins is [finding the node where the cycle begins](/interview-question/how-do-you-find-the-node-where-a-linked-list-cycle-begins).

### Use 3: sequences that are secretly linked lists

The technique does not need node objects. Any process where "the current value decides the next value" behaves like a linked list: the value is the node and the rule is \`next\`. A **happy number** is one where repeatedly replacing the number by the sum of the squares of its digits reaches 1. Starting from 19: 1 + 81 = 82, then 64 + 4 = 68, then 36 + 64 = 100, then 1. Starting from 2 the sequence never reaches 1; it falls into the loop 4, 16, 37, 58, 89, 145, 42, 20, 4. Detecting "stuck in a loop" is cycle detection, so fast and slow pointers answer it with two integers.

📌 **Interview term: Implicit linked list** — a sequence where each value determines the next one through a rule, so it can be walked (and can loop) exactly like a linked list even though no nodes exist.

### Related, but not the same

- **Gap pointers:** to [remove the nth node from the end](/interview-question/how-do-you-remove-the-nth-node-from-the-end-of-a-linked-list), both pointers move at the same speed but one starts n nodes ahead. Same family, different rule.
- **Palindrome check:** [checking whether a linked list is a palindrome](/interview-question/how-do-you-check-if-a-linked-list-is-a-palindrome) finds the middle with fast and slow pointers, then [reverses the second half](/interview-question/how-do-you-reverse-a-linked-list).

## 3. The Code in C++

Both list uses share the same loop. The middle:

~~~cpp
ListNode* middle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;       // 1 step
        fast = fast->next->next; // 2 steps
    }
    return slow;
}
~~~

Cycle detection is the same loop with one extra check after each move:

~~~cpp
// Returns the meeting node, or nullptr when there is no cycle; writes the step count.
ListNode* meet(ListNode* head, int& steps) {
    ListNode* slow = head;
    ListNode* fast = head;
    steps = 0;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        ++steps;
        if (slow == fast) return slow; // pointer equality: the same node
    }
    return nullptr;
}
~~~

**What to notice:**

- \`slow == fast\` compares two \`ListNode*\` addresses: it is \`true\` only when both point at the same node. Never compare \`slow->val == fast->val\`: different nodes can hold the same value.
- \`while (fast != nullptr && fast->next != nullptr)\` relies on \`&&\` short-circuiting: when \`fast\` is null, \`fast->next\` is never evaluated. Swapped, it dereferences \`nullptr\`, which is undefined behaviour (usually a crash).
- The pointers are plain \`ListNode*\` values; moving them never allocates or frees memory, and the examples keep every node, including nodes inside a cycle, in a \`std::vector<std::unique_ptr<ListNode>>\` pool so they are freed safely. (A naive "walk and \`delete\`" loop on a cyclic list would never stop, or free a node twice.)

📌 **Interview term: Short-circuit evaluation** — \`&&\` evaluates its right side only when the left side is true, so \`p != nullptr && p->next != nullptr\` never dereferences a null pointer.

The number-sequence version swaps "follow \`next\`" for "apply the digit-square rule":

~~~cpp
// Next number in the sequence: the sum of the squares of the digits.
int step(int n) {
    int total = 0;
    while (n > 0) {
        int d = n % 10;
        total += d * d;
        n /= 10; // integer division drops the fraction
    }
    return total;
}

// Fast/slow pointers on a sequence of numbers instead of list nodes.
bool isHappy(int n) {
    int slow = n;
    int fast = step(n);
    while (fast != 1 && slow != fast) {
        slow = step(slow);       // 1 step
        fast = step(step(fast)); // 2 steps
    }
    return fast == 1;
}
~~~

\`fast\` starts one step ahead (\`step(n)\`) so the \`while\` test is not true on the first check. \`n /= 10\` on an \`int\` is integer division and drops the last digit. The set version uses \`std::unordered_set<int>\`, which allocates a node per stored value; the fast/slow version allocates nothing.

## 4. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Middle of a list and cycle detection with one pattern** prints:

~~~text
middle of [1, 2, 3, 4, 5]: 3
middle of [1, 2, 3, 4, 5, 6]: 4
middle of [8]: 8
cycle in 1 -> 2 -> 3 -> 4 -> back to 2: true
cycle in [1, 2, 3, 4]: false
pointers met at value 4 after 3 steps
~~~

**Example 2 — Fast and slow pointers on a number sequence (happy numbers)** prints:

~~~text
19 is happy: true
2 is happy: false
7 is happy: true
1 is happy: true
sequence from 2: 2 4 16 37 58 89 145 42 20 4
hash set version stored 9 numbers, fast/slow stored 2
~~~

**What the numbers show:** Example 1 uses one loop shape for both jobs: it finds the middle of odd, even and one-node lists, reports the cycle in \`1 -> 2 -> 3 -> 4 -> back to 2\`, and shows that the pointers met on node 4 after 3 rounds. Example 2 applies the identical idea to numbers, where the "list" is generated on the fly: 2 falls into the loop starting at 4 (the printed sequence returns to 4), so 2 is not happy.

## 5. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Count the length, then walk to the middle | O(n) | O(1) | two passes over the list |
| Fast and slow pointers, middle | O(n) | O(1) | one pass; \`fast\` stops after about n / 2 rounds |
| Hash set of visited nodes, cycle | O(n) | O(n) | stores every node until a repeat |
| Fast and slow pointers, cycle | O(n) | O(1) | \`fast\` reaches the end, or catches \`slow\` within one lap of the loop after \`slow\` enters it |

Example 2 shows the space difference on a real loop: for the sequence starting at 2, the set stored 9 numbers before seeing a repeat, while fast/slow keeps exactly 2 variables however long the sequence is.

## 6. Edge Cases

- **Empty list:** \`fast\` is \`nullptr\` from the start; the middle is \`nullptr\` and there is no cycle.
- **One node:** \`fast->next\` is \`nullptr\`; the middle is that node. Example 1 prints \`middle of [8]: 8\`.
- **A node that points to itself:** a cycle of length 1; after one round \`slow\` and \`fast\` are both on it.
- **Even length:** two middles; this loop returns the second (\`4\` for \`[1, 2, 3, 4, 5, 6]\` in Example 1).
- **The number 1:** for happy numbers the sequence is already at 1; \`fast\` starts at \`step(1) = 1\`, and the function returns true at once.

## Common Pitfalls

- **Comparing values instead of addresses.** \`slow->val == fast->val\` gives false cycle reports with duplicates; compare the pointers.
- **Wrong order in the loop test.** \`fast->next != nullptr && fast != nullptr\` dereferences null first: undefined behaviour.
- **Checking for a meeting before moving.** Both start on \`head\`, so the check before the first move is always true.
- **Freeing a cyclic list with a plain walk.** A \`while (p) { next = p->next; delete p; p = next; }\` loop on a cycle reaches an already deleted node: use-after-free. Break the cycle first, or let an owning container free the nodes.
- **Mixing up the two middles.** \`fast = head\` gives the second middle of an even list; \`fast = head->next\` gives the first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Two pointers start together; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> moves one step and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> moves two each round, so their distance grows by one per round.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Middle:</strong> <span style="color:#f0e2c8;">When <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast == nullptr || fast-&gt;next == nullptr</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> has gone half as far: the middle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cycle:</strong> <span style="color:#f0e2c8;">If there is a loop, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> closes the gap by one node per round, so they must meet; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow == fast</code> (same address) means a cycle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space, versus O(n) for an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::unordered_set&lt;ListNode*&gt;</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ details:</strong> <span style="color:#f0e2c8;">Short-circuit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast &amp;&amp; fast-&gt;next</code> in that order, compare addresses not values, and never free a cyclic list with a naive walk.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must they meet and not jump over each other?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inside the loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> gains exactly one node per round, so the gap counts down to 0 and cannot skip it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find where the cycle starts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After the meeting, reset one pointer to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code> and step both one node at a time; they meet at the entry.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unordered_set&lt;ListNode*&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works and is O(n) average time, but it stores every visited pointer, and common implementations allocate a node per entry. Fast/slow uses two pointers and no allocation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">fast-&gt;next-&gt;next</code> safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only because the loop condition already checked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast != nullptr &amp;&amp; fast-&gt;next != nullptr</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast-&gt;next-&gt;next</code> may itself be null, which is fine to assign.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where else is it used?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Middle of a list, palindrome linked list, cycle detection, happy numbers, and the find-the-duplicate array problem.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Fast and slow pointers (tortoise and hare)** | two pointers on one sequence, moving one and two steps per round |
| **Floyd's cycle detection** | detect a loop by checking whether the fast pointer catches the slow one |
| **Implicit linked list** | a sequence where each value determines the next, walked like a list |
| **Short-circuit evaluation** | \`&&\` skips its right side when the left side is false |

---
**Conclusion:** The fast and slow pointer technique sends two pointers down the same sequence at one and two steps per round. When the fast one runs out, the slow one is in the middle; if the fast one ever lands on the slow one, the sequence loops. Both answers cost O(n) time and O(1) extra space with no allocation, which is what beats an \`unordered_set\` of visited pointers. In C++, compare addresses, keep the \`fast != nullptr && fast->next != nullptr\` order, and be careful freeing a list that may contain a cycle.`,
        examples: [
          { label: `Middle of a list and cycle detection with one pattern`, code: `#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct ListNode {
    int val;
    ListNode* next;
    explicit ListNode(int v) : val(v), next(nullptr) {}
};

std::vector<std::unique_ptr<ListNode>> pool; // owns every node, even nodes in a cycle

// Build a list; if pos >= 0 the last node links back to index pos (a cycle).
ListNode* build(const std::vector<int>& values, int pos = -1) {
    std::vector<ListNode*> nodes;
    for (int v : values) {
        pool.push_back(std::make_unique<ListNode>(v));
        nodes.push_back(pool.back().get());
    }
    for (size_t i = 0; i + 1 < nodes.size(); ++i) nodes[i]->next = nodes[i + 1];
    if (pos >= 0 && !nodes.empty()) nodes.back()->next = nodes[pos];
    return nodes.empty() ? nullptr : nodes[0];
}

std::string fmt(const std::vector<int>& v) {
    std::string s = "[";
    for (size_t i = 0; i < v.size(); ++i) s += (i ? ", " : "") + std::to_string(v[i]);
    return s + "]";
}

ListNode* middle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;       // 1 step
        fast = fast->next->next; // 2 steps
    }
    return slow;
}

// Returns the meeting node, or nullptr when there is no cycle; writes the step count.
ListNode* meet(ListNode* head, int& steps) {
    ListNode* slow = head;
    ListNode* fast = head;
    steps = 0;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        ++steps;
        if (slow == fast) return slow; // pointer equality: the same node
    }
    return nullptr;
}

int main() {
    std::cout << std::boolalpha;
    std::vector<std::vector<int>> cases = {{1, 2, 3, 4, 5}, {1, 2, 3, 4, 5, 6}, {8}};
    for (const auto& values : cases) {
        std::cout << "middle of " << fmt(values) << ": " << middle(build(values))->val << "\\n";
    }

    int steps = 0, ignored = 0;
    ListNode* node = meet(build({1, 2, 3, 4}, 1), steps);
    std::cout << "cycle in 1 -> 2 -> 3 -> 4 -> back to 2: " << (node != nullptr) << "\\n";
    std::cout << "cycle in [1, 2, 3, 4]: " << (meet(build({1, 2, 3, 4}), ignored) != nullptr) << "\\n";
    std::cout << "pointers met at value " << node->val << " after " << steps << " steps\\n";
}` },
          { label: `Fast and slow pointers on a number sequence (happy numbers)`, code: `#include <iostream>
#include <unordered_set>

// Next number in the sequence: the sum of the squares of the digits.
int step(int n) {
    int total = 0;
    while (n > 0) {
        int d = n % 10;
        total += d * d;
        n /= 10; // integer division drops the fraction
    }
    return total;
}

// Fast/slow pointers on a sequence of numbers instead of list nodes.
bool isHappy(int n) {
    int slow = n;
    int fast = step(n);
    while (fast != 1 && slow != fast) {
        slow = step(slow);       // 1 step
        fast = step(step(fast)); // 2 steps
    }
    return fast == 1;
}

bool isHappyWithSet(int n, size_t& stored) {
    std::unordered_set<int> seen;
    while (n != 1 && seen.count(n) == 0) {
        seen.insert(n);
        n = step(n);
    }
    stored = seen.size();
    return n == 1;
}

int main() {
    std::cout << std::boolalpha;
    std::cout << "19 is happy: " << isHappy(19) << "\\n"; // 19 is happy: true
    std::cout << "2 is happy: " << isHappy(2) << "\\n";   // 2 is happy: false
    std::cout << "7 is happy: " << isHappy(7) << "\\n";   // 7 is happy: true
    std::cout << "1 is happy: " << isHappy(1) << "\\n";   // 1 is happy: true

    std::cout << "sequence from 2: 2";
    int x = 2;
    for (int i = 0; i < 9; ++i) {
        x = step(x);
        std::cout << " " << x;
    }
    std::cout << "\\n";

    size_t stored = 0;
    isHappyWithSet(2, stored);
    std::cout << "hash set version stored " << stored << " numbers, fast/slow stored 2\\n";
}` },
        ],
      },
    },
  },
  {
    title: `How do you find the middle of a linked list?`,
    difficulty: "easy",
    seoDescription: `Find the middle of a linked list in Python, JavaScript, Java and C++: two passes vs fast and slow pointers, first vs second middle, verified code.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given the head of a singly linked list, return its middle node. If the list has an even number of nodes, return the second of the two middle nodes. Please do it in Python, in one pass if you can."

**What a strong answer should cover:**
- The baseline: count the nodes, then walk half way (two passes, O(1) space), or copy into an array (O(n) space).
- The one-pass fast and slow pointer loop, and why \`slow\` is in the middle when \`fast\` runs out.
- Even lengths: which middle each starting position gives, and how to get the other one.
- O(n) time and O(1) space, and the honest point that fast/slow does about as many pointer hops as two passes.
- Python specifics: \`//\` for the index in the array version, the \`fast is not None and fast.next is not None\` order, and no \`len()\` on a hand-made node class.

**Clarifying questions expected:**
- "For an even length, should I return the first or the second middle?"
- "Should I return the node or its value, and what for an empty list?"

**Code / implementation expected:** Yes — a Python \`middle(head)\` with slow and fast pointers, and a note on the first-middle variant.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are handed a long paper scroll and asked to cut it exactly in half. The catch: you can only unroll it from the start, and you have no ruler. One way is to unroll the whole thing counting the panels (say 40), roll it back up, and unroll again counting to 20. That works, but you went over the scroll one and a half times.

A friend suggests a trick. Two people walk along the unrolled scroll from the start, one taking one panel per step and the other taking two. When the fast walker steps off the end, the slow one is standing on the middle panel. One walk, no counting.

A linked list is that scroll: you can only follow it forwards from the head, and it does not know its own length. Finding the middle is a small question on its own, but it is also the first step of splitting a list for [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work) and of [checking whether a linked list is a palindrome](/interview-question/how-do-you-check-if-a-linked-list-is-a-palindrome), so interviewers like it as a warm-up.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| For an even length, first or second middle? | \`[1, 2, 3, 4]\` has two middles (2 and 3); the loop's starting position decides which you get. |
| Return the node or its value? | Returning the node lets the caller split or delete there; the value alone does not. |
| What should an empty list return? | There is no middle; return the null value rather than crashing. |
| Is the length known or stored anywhere? | If the list object tracks its size, walking \`size / 2\` steps is enough and the trick is unnecessary. |
| Can the list have a cycle? | Then there is no "end" and no middle; you would detect the cycle first. |

## 3. Brute Force First

**Copy to an array.** Walk the list once, storing every node in an array, then return the node at index \`n / 2\` (rounded down). O(n) time and **O(n) extra space**, which is the cost the interviewer wants you to remove.

**Two passes.** Walk once to count the nodes, then walk again \`n / 2\` steps from the head. O(n) time and O(1) extra space. This is a perfectly correct answer, and saying it first shows you understand the problem before you reach for a trick:

~~~python
def middle_two_pass(head):
    length, hops = 0, 0
    node = head
    while node is not None:          # pass 1: count
        length += 1
        node = node.next
        hops += 1
    node = head
    for _ in range(length // 2):     # pass 2: walk half way
        node = node.next
        hops += 1
    return node.val, hops, 0
~~~

(\`hops\` only exists so Example 2 can count pointer moves.) The usual follow-up is "can you do it in one pass?".

## 4. The Core Idea: Fast and Slow Pointers

Move two pointers from the head: \`slow\` one node per round, \`fast\` two nodes per round. After k rounds \`slow\` has moved k nodes and \`fast\` 2k nodes, so when \`fast\` reaches the end, \`slow\` is half way. This is the [fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique), which also detects cycles.

📌 **Interview term: Fast and slow pointers** — two pointers walking the same list at one and two nodes per round; when the fast one finishes, the slow one is at the middle.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 190" role="img" aria-label="On the list 1 to 5 the loop stops with slow on 3 and fast on 5, so 3 is the middle">
  <defs>
    <marker id="mid1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">odd length, loop finished</text>
  <rect class="d-box" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="70" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="690" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="70" text-anchor="middle">None</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge" d="M 504 65 L 554 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge" d="M 634 65 L 684 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge-accent" d="M 335 134 L 335 98" marker-end="url(#mid1-arrow)"/>
  <text class="d-text d-accent" x="335" y="152" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 595 134 L 595 98" marker-end="url(#mid1-arrow)"/>
  <text class="d-text" x="595" y="152" text-anchor="middle">fast</text>
</svg>

On \`1, 2, 3, 4, 5\` the loop runs two rounds: \`slow\` goes 1, 2, 3 and \`fast\` goes 1, 3, 5. Now \`fast.next\` is \`None\`, the loop stops, and \`slow\` is on 3, the exact middle.

### Even lengths: which middle?

An even list has two middles. Where \`fast\` starts decides which one \`slow\` stops on:

<svg class="iq-diagram" width="100%" viewBox="0 0 930 370" role="img" aria-label="On the list 1 to 6, starting fast at head leaves slow on 4, starting fast one node ahead leaves slow on 3">
  <defs>
    <marker id="mid2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">fast starts at head</text>
  <rect class="d-box" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="70" text-anchor="middle">5</text>
  <rect class="d-box" x="690" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="70" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="820" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="855" y="70" text-anchor="middle">None</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 504 65 L 554 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 634 65 L 684 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 764 65 L 814 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge-accent" d="M 465 134 L 465 98" marker-end="url(#mid2-arrow)"/>
  <text class="d-text d-accent" x="465" y="152" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 855 134 L 855 98" marker-end="url(#mid2-arrow)"/>
  <text class="d-text" x="855" y="152" text-anchor="middle">fast</text>
  <text class="d-sub" x="40" y="206">fast starts one node ahead</text>
  <rect class="d-box" x="40" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="250" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="250" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="250" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="250" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="250" text-anchor="middle">5</text>
  <rect class="d-box" x="690" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="250" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="820" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="855" y="250" text-anchor="middle">None</text>
  <path class="d-edge" d="M 114 245 L 164 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 244 245 L 294 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 374 245 L 424 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 504 245 L 554 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 634 245 L 684 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 764 245 L 814 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge-accent" d="M 335 314 L 335 278" marker-end="url(#mid2-arrow)"/>
  <text class="d-text d-accent" x="335" y="332" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 725 314 L 725 278" marker-end="url(#mid2-arrow)"/>
  <text class="d-text" x="725" y="332" text-anchor="middle">fast</text>
</svg>

With \`fast\` starting at the head, \`fast\` steps 1, 3, 5, then off the end to \`None\`, so \`slow\` gets one more round and stops on 4, the **second middle**. With \`fast\` starting one node ahead (at \`head.next\`), \`fast\` steps 2, 4, 6 and stops because \`6.next\` is \`None\`, so \`slow\` stops on 3, the **first middle**. For odd lengths both versions give the same node.

📌 **Interview term: First vs second middle** — for an even number of nodes n, the nodes at positions n / 2 and n / 2 + 1 (counting from 1); the first is what you need to split a list into two halves of equal size.

📌 **Interview term: One-pass algorithm** — an algorithm that reads its input once from start to end, without going back; useful when restarting is expensive or the step is part of a larger single walk.

## 5. The Code in Python

The second middle (the usual interview version):

~~~python
def second_middle(head):
    """For an even length, return the second of the two middle nodes."""
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
    return slow
~~~

The first middle, for splitting a list in half:

~~~python
def first_middle(head):
    """For an even length, return the first of the two middle nodes."""
    if head is None:
        return None
    slow, fast = head, head.next      # fast starts one node ahead
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
    return slow
~~~

**Line by line:**

- \`slow = fast = head\` binds both names to the head node; nothing is copied.
- \`while fast is not None and fast.next is not None\`: the \`None\` check on \`fast\` must come first. Python's \`and\` stops at the first false operand, so \`fast.next\` is never read on \`None\`.
- \`fast = fast.next.next\` is safe because the loop test just proved \`fast.next\` is a node; the result may be \`None\`, which ends the loop next time.
- \`first_middle\` starts \`fast\` at \`head.next\`, one node ahead, so \`slow\` stops one node earlier on even lengths. It needs the \`head is None\` guard because \`None.next\` would raise \`AttributeError\`.
- In the copy-to-array version (Example 2), \`nodes[len(nodes) // 2]\` uses \`//\`, floor division, which always gives an \`int\` index; \`/\` would give a float and \`nodes[2.5]\` raises \`TypeError\`.

📌 **Interview term: Floor division** — \`//\` in Python divides and rounds down to a whole number, so \`5 // 2\` is \`2\`.

## 6. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — First and second middle for every length from 0 to 6** prints:

~~~text
n=0: second middle none, first middle none
n=1: second middle 1, first middle 1
n=2: second middle 2, first middle 1
n=3: second middle 2, first middle 2
n=4: second middle 3, first middle 2
n=5: second middle 3, first middle 3
n=6: second middle 4, first middle 3
~~~

**Example 2 — Copy to array vs two passes vs fast/slow: hops and memory** prints:

~~~text
n=1000 copy to array: middle 501, 1000 hops, 1000 nodes stored
n=1000 two passes: middle 501, 1500 hops, 0 nodes stored
n=1000 fast/slow: middle 501, 1500 hops, 0 nodes stored
n=1001 copy to array: middle 501, 1001 hops, 1001 nodes stored
n=1001 two passes: middle 501, 1501 hops, 0 nodes stored
n=1001 fast/slow: middle 501, 1500 hops, 0 nodes stored
~~~

**What the numbers show:** Example 1 is the whole even/odd story in seven lines: the two versions agree for odd lengths and differ by one node for even lengths, and both handle the empty list. Example 2 finds the same middle (501) three ways and counts the cost: the array copy makes fewer hops but stores every node, while two passes and fast/slow store nothing and make the same 1,500 hops on 1,000 nodes (1,501 and 1,500 on 1,001 nodes).

## 7. Complexity

| Approach | Time | Extra space | Pointer hops on 1,000 nodes (Example 2) |
| :--- | :--- | :--- | :--- |
| Copy nodes into an array | O(n) | O(n) | 1,000, but stores 1,000 references |
| Two passes (count, then walk half) | O(n) | O(1) | 1,500 |
| Fast and slow pointers | O(n) | O(1) | 1,500 |

The honest reading of the last column: **fast/slow does not make fewer pointer moves than two passes.** Both touch about 1.5n \`next\` pointers. What it gives you is a single loop with no length counter, which is why it is the version that slots into bigger one-pass algorithms (find the middle while reversing the first half, split for merge sort, detect a cycle with the same loop). For the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty list:** both versions return \`None\`. Example 1 prints \`n=0: second middle none, first middle none\`.
- **One node:** the node is its own middle in both versions (\`n=1\` in Example 1).
- **Two nodes:** second middle is node 2, first middle is node 1; this is the case that most often exposes an off-by-one.
- **Odd lengths:** both versions agree (\`n=3\`, \`n=5\` in Example 1).
- **A cycle:** \`fast\` never reaches the end, so the loop never stops. If the input may be cyclic, [detect the cycle](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list) first.

## Common Pitfalls

- **Checking \`fast.next\` before \`fast\`.** \`while fast.next and fast\` raises \`AttributeError: 'NoneType' object has no attribute 'next'\` on even lengths.
- **Not saying which middle you return.** For \`[1, 2, 3, 4]\` the loop with \`fast = head\` returns 3; with \`fast = head.next\` it returns 2. Ask, then pick.
- **Indexing with \`/\`.** In the array version \`nodes[len(nodes) / 2]\` is a float index and raises \`TypeError\`; use \`//\`.
- **Forgetting the empty list in \`first_middle\`.** \`head.next\` on \`None\` raises; guard it first.
- **Claiming fast/slow does fewer steps.** It does not: Example 2 counted 1,500 hops for both the two-pass and the fast/slow version on 1,000 nodes. Its advantages are one pass and no length counter.
- **Calling \`len(head)\`.** A hand-written node class has no \`__len__\`, so this raises \`TypeError\`; you count by walking.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Brute force:</strong> <span style="color:#f0e2c8;">Copy the nodes into a Python list and return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nodes[len(nodes) // 2]</code>: O(n) time but O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Better:</strong> <span style="color:#f0e2c8;">Two passes: count the length, then walk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length // 2</code> steps. O(n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. One pass:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> moves 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> moves 2; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast is None or fast.next is None</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> is the middle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Even lengths:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast = head</code> gives the second middle, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast = head.next</code> gives the first; I would confirm which one is wanted.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Honest cost:</strong> <span style="color:#f0e2c8;">Fast/slow makes the same number of pointer hops as two passes (1,500 each for 1,000 nodes in my run); its value is one loop and being the building block for palindrome checks and merge sort.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which middle does merge sort need?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The first middle, so a two-node list splits into one and one. With the second middle, you would need the node before it to cut the list.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">fast.next.next</code> safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The loop condition has just checked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast.next is not None</code>; the double hop may produce <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>, and that ends the next check.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you check a palindrome with this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Find the middle, reverse the second half in place, compare the two halves node by node, and optionally reverse back. O(n) time, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about a doubly linked list with a tail pointer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Walk one pointer from each end until they meet or cross; same O(n), no speed trick needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you delete the middle node?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> that trails <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code>; when the loop ends, set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev.next = slow.next</code>. A one-node list becomes empty.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Fast and slow pointers** | pointers moving one and two nodes per round; slow ends at the middle |
| **First vs second middle** | the two middle nodes of an even-length list |
| **One-pass algorithm** | reads the input once from start to end |
| **Floor division** | \`//\`: divide and round down to a whole number |

---
**Conclusion:** Finding the middle of a linked list has a correct two-pass answer (count, then walk half way) and a one-pass answer with fast and slow pointers: when \`fast\` can no longer take two steps, \`slow\` is in the middle. Both are O(n) time and O(1) space, and they even make the same number of pointer hops; the one-pass loop wins on simplicity and reuse. In Python, the details that matter are the \`fast is not None and fast.next is not None\` order, \`//\` for any index arithmetic, and stating up front which middle you return for even lengths.`,
        examples: [
          { label: `First and second middle for every length from 0 to 6`, code: `class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next


def build(values):
    dummy = ListNode(0)
    tail = dummy
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next


def second_middle(head):
    """For an even length, return the second of the two middle nodes."""
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
    return slow


def first_middle(head):
    """For an even length, return the first of the two middle nodes."""
    if head is None:
        return None
    slow, fast = head, head.next      # fast starts one node ahead
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
    return slow


def show(node):
    return "none" if node is None else str(node.val)


for n in range(7):
    head = build(list(range(1, n + 1)))
    print("n=" + str(n) + ": second middle " + show(second_middle(head))
          + ", first middle " + show(first_middle(head)))` },
          { label: `Copy to array vs two passes vs fast/slow: hops and memory`, code: `class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next


def build_one_to_n(n):
    dummy = ListNode(0)
    tail = dummy
    for v in range(1, n + 1):
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next


def middle_by_copy(head):
    nodes, hops = [], 0
    node = head
    while node is not None:
        nodes.append(node)
        node = node.next
        hops += 1
    return nodes[len(nodes) // 2].val, hops, len(nodes)


def middle_two_pass(head):
    length, hops = 0, 0
    node = head
    while node is not None:          # pass 1: count
        length += 1
        node = node.next
        hops += 1
    node = head
    for _ in range(length // 2):     # pass 2: walk half way
        node = node.next
        hops += 1
    return node.val, hops, 0


def middle_fast_slow(head):
    slow = fast = head
    hops = 0
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        hops += 3                    # slow moved once, fast moved twice
    return slow.val, hops, 0


for n in [1000, 1001]:
    head = build_one_to_n(n)
    for name, fn in [("copy to array", middle_by_copy), ("two passes", middle_two_pass),
                     ("fast/slow", middle_fast_slow)]:
        mid, hops, stored = fn(head)
        print("n=" + str(n) + " " + name + ": middle " + str(mid) + ", "
              + str(hops) + " hops, " + str(stored) + " nodes stored")` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given the head of a singly linked list, return its middle node. If the list has an even number of nodes, return the second of the two middle nodes. Please do it in JavaScript, in one pass if you can."

**What a strong answer should cover:**
- The baseline: count the nodes, then walk half way (two passes, O(1) space), or copy into an array (O(n) space).
- The one-pass fast and slow pointer loop, and why \`slow\` is in the middle when \`fast\` runs out.
- Even lengths: which middle each starting position gives, and how to get the other one.
- O(n) time and O(1) space, and the honest point that fast/slow does about as many pointer hops as two passes.
- JavaScript specifics: no integer division (\`Math.floor(n / 2)\`), \`null\` checks in the right order, and \`undefined\` from a fractional array index.

**Clarifying questions expected:**
- "For an even length, should I return the first or the second middle?"
- "Should I return the node or its value, and what for an empty list?"

**Code / implementation expected:** Yes — a JavaScript \`middle(head)\` with slow and fast pointers, and a note on the first-middle variant.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are handed a long paper scroll and asked to cut it exactly in half. The catch: you can only unroll it from the start, and you have no ruler. One way is to unroll the whole thing counting the panels (say 40), roll it back up, and unroll again counting to 20. That works, but you went over the scroll one and a half times.

A friend suggests a trick. Two people walk along the unrolled scroll from the start, one taking one panel per step and the other taking two. When the fast walker steps off the end, the slow one is standing on the middle panel. One walk, no counting.

A linked list is that scroll: you can only follow it forwards from the head, and it does not know its own length. Finding the middle is a small question on its own, but it is also the first step of splitting a list for [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work) and of [checking whether a linked list is a palindrome](/interview-question/how-do-you-check-if-a-linked-list-is-a-palindrome), so interviewers like it as a warm-up.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| For an even length, first or second middle? | \`[1, 2, 3, 4]\` has two middles (2 and 3); the loop's starting position decides which you get. |
| Return the node or its value? | Returning the node lets the caller split or delete there; the value alone does not. |
| What should an empty list return? | There is no middle; return the null value rather than crashing. |
| Is the length known or stored anywhere? | If the list object tracks its size, walking \`size / 2\` steps is enough and the trick is unnecessary. |
| Can the list have a cycle? | Then there is no "end" and no middle; you would detect the cycle first. |

## 3. Brute Force First

**Copy to an array.** Walk the list once, storing every node in an array, then return the node at index \`n / 2\` (rounded down). O(n) time and **O(n) extra space**, which is the cost the interviewer wants you to remove.

**Two passes.** Walk once to count the nodes, then walk again \`n / 2\` steps from the head. O(n) time and O(1) extra space. This is a perfectly correct answer, and saying it first shows you understand the problem before you reach for a trick:

~~~javascript
function middleTwoPass(head) {
  let length = 0;
  let hops = 0;
  for (let node = head; node !== null; node = node.next) { // pass 1: count
    length++;
    hops++;
  }
  let node = head;
  for (let i = 0; i < Math.floor(length / 2); i++) {       // pass 2: walk half way
    node = node.next;
    hops++;
  }
  return [node.val, hops, 0];
}
~~~

(\`hops\` only exists so Example 2 can count pointer moves.) The usual follow-up is "can you do it in one pass?".

## 4. The Core Idea: Fast and Slow Pointers

Move two pointers from the head: \`slow\` one node per round, \`fast\` two nodes per round. After k rounds \`slow\` has moved k nodes and \`fast\` 2k nodes, so when \`fast\` reaches the end, \`slow\` is half way. This is the [fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique), which also detects cycles.

📌 **Interview term: Fast and slow pointers** — two pointers walking the same list at one and two nodes per round; when the fast one finishes, the slow one is at the middle.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 190" role="img" aria-label="On the list 1 to 5 the loop stops with slow on 3 and fast on 5, so 3 is the middle">
  <defs>
    <marker id="mid1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">odd length, loop finished</text>
  <rect class="d-box" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="70" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="690" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="70" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge" d="M 504 65 L 554 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge" d="M 634 65 L 684 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge-accent" d="M 335 134 L 335 98" marker-end="url(#mid1-arrow)"/>
  <text class="d-text d-accent" x="335" y="152" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 595 134 L 595 98" marker-end="url(#mid1-arrow)"/>
  <text class="d-text" x="595" y="152" text-anchor="middle">fast</text>
</svg>

On \`1, 2, 3, 4, 5\` the loop runs two rounds: \`slow\` goes 1, 2, 3 and \`fast\` goes 1, 3, 5. Now \`fast.next\` is \`null\`, the loop stops, and \`slow\` is on 3, the exact middle.

### Even lengths: which middle?

An even list has two middles. Where \`fast\` starts decides which one \`slow\` stops on:

<svg class="iq-diagram" width="100%" viewBox="0 0 930 370" role="img" aria-label="On the list 1 to 6, starting fast at head leaves slow on 4, starting fast one node ahead leaves slow on 3">
  <defs>
    <marker id="mid2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">fast starts at head</text>
  <rect class="d-box" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="70" text-anchor="middle">5</text>
  <rect class="d-box" x="690" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="70" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="820" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="855" y="70" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 504 65 L 554 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 634 65 L 684 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 764 65 L 814 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge-accent" d="M 465 134 L 465 98" marker-end="url(#mid2-arrow)"/>
  <text class="d-text d-accent" x="465" y="152" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 855 134 L 855 98" marker-end="url(#mid2-arrow)"/>
  <text class="d-text" x="855" y="152" text-anchor="middle">fast</text>
  <text class="d-sub" x="40" y="206">fast starts one node ahead</text>
  <rect class="d-box" x="40" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="250" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="250" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="250" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="250" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="250" text-anchor="middle">5</text>
  <rect class="d-box" x="690" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="250" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="820" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="855" y="250" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 245 L 164 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 244 245 L 294 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 374 245 L 424 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 504 245 L 554 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 634 245 L 684 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 764 245 L 814 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge-accent" d="M 335 314 L 335 278" marker-end="url(#mid2-arrow)"/>
  <text class="d-text d-accent" x="335" y="332" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 725 314 L 725 278" marker-end="url(#mid2-arrow)"/>
  <text class="d-text" x="725" y="332" text-anchor="middle">fast</text>
</svg>

With \`fast\` starting at the head, \`fast\` steps 1, 3, 5, then off the end to \`null\`, so \`slow\` gets one more round and stops on 4, the **second middle**. With \`fast\` starting one node ahead (at \`head.next\`), \`fast\` steps 2, 4, 6 and stops because \`6.next\` is \`null\`, so \`slow\` stops on 3, the **first middle**. For odd lengths both versions give the same node.

📌 **Interview term: First vs second middle** — for an even number of nodes n, the nodes at positions n / 2 and n / 2 + 1 (counting from 1); the first is what you need to split a list into two halves of equal size.

📌 **Interview term: One-pass algorithm** — an algorithm that reads its input once from start to end, without going back; useful when restarting is expensive or the step is part of a larger single walk.

## 5. The Code in JavaScript

The second middle (the usual interview version):

~~~javascript
// For an even length, return the second of the two middle nodes.
function secondMiddle(head) {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
}
~~~

The first middle, for splitting a list in half:

~~~javascript
// For an even length, return the first of the two middle nodes.
function firstMiddle(head) {
  if (head === null) return null;
  let slow = head;
  let fast = head.next; // fast starts one node ahead
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
}
~~~

**Line by line:**

- \`let slow = head; let fast = head;\` copies the reference to the head node; nothing is copied.
- \`while (fast !== null && fast.next !== null)\`: \`&&\` stops at the first false operand, so \`fast.next\` is never read when \`fast\` is \`null\`.
- \`fast = fast.next.next\` is safe because the loop test just proved \`fast.next\` is a node; the result may be \`null\`, which ends the loop next time.
- \`firstMiddle\` starts \`fast\` at \`head.next\`, one node ahead, so \`slow\` stops one node earlier on even lengths. It needs the \`head === null\` guard first.
- In the copy-to-array version (Example 2) the index is \`Math.floor(nodes.length / 2)\`. JavaScript has no integer division: \`nodes[5 / 2]\` is \`nodes[2.5]\`, which is simply \`undefined\` (no error), and the next \`.val\` throws.

📌 **Interview term: Integer division** — division that drops the fractional part; JavaScript has none for ordinary numbers, so you write \`Math.floor(a / b)\` (or \`a >> 1\` for small non-negative integers).

## 6. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — First and second middle for every length from 0 to 6** prints:

~~~text
n=0: second middle none, first middle none
n=1: second middle 1, first middle 1
n=2: second middle 2, first middle 1
n=3: second middle 2, first middle 2
n=4: second middle 3, first middle 2
n=5: second middle 3, first middle 3
n=6: second middle 4, first middle 3
~~~

**Example 2 — Copy to array vs two passes vs fast/slow: hops and memory** prints:

~~~text
n=1000 copy to array: middle 501, 1000 hops, 1000 nodes stored
n=1000 two passes: middle 501, 1500 hops, 0 nodes stored
n=1000 fast/slow: middle 501, 1500 hops, 0 nodes stored
n=1001 copy to array: middle 501, 1001 hops, 1001 nodes stored
n=1001 two passes: middle 501, 1501 hops, 0 nodes stored
n=1001 fast/slow: middle 501, 1500 hops, 0 nodes stored
~~~

**What the numbers show:** Example 1 is the whole even/odd story in seven lines: the two versions agree for odd lengths and differ by one node for even lengths, and both handle the empty list. Example 2 finds the same middle (501) three ways and counts the cost: the array copy makes fewer hops but stores every node, while two passes and fast/slow store nothing and make the same 1,500 hops on 1,000 nodes (1,501 and 1,500 on 1,001 nodes).

## 7. Complexity

| Approach | Time | Extra space | Pointer hops on 1,000 nodes (Example 2) |
| :--- | :--- | :--- | :--- |
| Copy nodes into an array | O(n) | O(n) | 1,000, but stores 1,000 references |
| Two passes (count, then walk half) | O(n) | O(1) | 1,500 |
| Fast and slow pointers | O(n) | O(1) | 1,500 |

The honest reading of the last column: **fast/slow does not make fewer pointer moves than two passes.** Both touch about 1.5n \`next\` pointers. What it gives you is a single loop with no length counter, which is why it is the version that slots into bigger one-pass algorithms (find the middle while reversing the first half, split for merge sort, detect a cycle with the same loop). For the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty list:** both versions return \`null\`. Example 1 prints \`n=0: second middle none, first middle none\`.
- **One node:** the node is its own middle in both versions (\`n=1\` in Example 1).
- **Two nodes:** second middle is node 2, first middle is node 1; this is the case that most often exposes an off-by-one.
- **Odd lengths:** both versions agree (\`n=3\`, \`n=5\` in Example 1).
- **A cycle:** \`fast\` never reaches the end, so the loop never stops. If the input may be cyclic, [detect the cycle](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list) first.

## Common Pitfalls

- **Checking \`fast.next\` before \`fast\`.** \`while (fast.next !== null && fast !== null)\` throws \`TypeError\` on even lengths.
- **Not saying which middle you return.** For \`[1, 2, 3, 4]\` the loop with \`fast = head\` returns 3; with \`fast = head.next\` it returns 2. Ask, then pick.
- **Fractional array indices.** \`nodes[nodes.length / 2]\` on an odd length is \`undefined\`, silently; use \`Math.floor\`.
- **\`undefined\` instead of \`null\`.** Nodes built as \`{ val: 1 }\` have \`next === undefined\`, so \`!== null\` tests pass when they should not; default \`next\` to \`null\` or use \`!= null\`.
- **Claiming fast/slow does fewer steps.** It does not: Example 2 counted 1,500 hops for both the two-pass and the fast/slow version on 1,000 nodes. Its advantages are one pass and no length counter.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Brute force:</strong> <span style="color:#f0e2c8;">Push the nodes into an array and return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nodes[Math.floor(nodes.length / 2)]</code>: O(n) time but O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Better:</strong> <span style="color:#f0e2c8;">Two passes: count the length, then walk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.floor(length / 2)</code> steps. O(n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. One pass:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> moves 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> moves 2; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast === null || fast.next === null</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> is the middle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Even lengths:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast = head</code> gives the second middle, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast = head.next</code> the first; I would confirm which one is wanted.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Honest cost:</strong> <span style="color:#f0e2c8;">Fast/slow makes the same number of hops as two passes (1,500 each for 1,000 nodes in my run); its value is one loop and being a building block.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which middle does merge sort need?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The first middle, so a two-node list splits into one and one; then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const right = mid.next; mid.next = null;</code> cuts the list.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nodes[nodes.length / 2]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For an odd length the index is a fraction such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2.5</code>, which is just a missing property, so you get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> with no error.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you check a palindrome with this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Find the middle, reverse the second half in place, compare node by node, then optionally restore. O(n) time, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you delete the middle node?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> behind <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code>; after the loop set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev.next = slow.next</code>. A one-node list becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">fast.next.next</code> safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The loop condition has just checked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast.next !== null</code>; the double hop may give <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>, which ends the loop at the next check.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Fast and slow pointers** | pointers moving one and two nodes per round; slow ends at the middle |
| **First vs second middle** | the two middle nodes of an even-length list |
| **One-pass algorithm** | reads the input once from start to end |
| **Integer division** | dropping the fraction; written \`Math.floor(a / b)\` in JavaScript |

---
**Conclusion:** Finding the middle of a linked list has a correct two-pass answer (count, then walk half way) and a one-pass answer with fast and slow pointers: when \`fast\` can no longer take two steps, \`slow\` is in the middle. Both are O(n) time and O(1) space, and they even make the same number of pointer hops; the one-pass loop wins on simplicity and reuse. In JavaScript, the details that matter are the \`null\` checks in the right order, \`Math.floor\` for any index arithmetic, and stating which middle you return for even lengths.`,
        examples: [
          { label: `First and second middle for every length from 0 to 6`, code: `class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

function build(values) {
  const dummy = new ListNode(0);
  let tail = dummy;
  for (const v of values) {
    tail.next = new ListNode(v);
    tail = tail.next;
  }
  return dummy.next;
}

// For an even length, return the second of the two middle nodes.
function secondMiddle(head) {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
}

// For an even length, return the first of the two middle nodes.
function firstMiddle(head) {
  if (head === null) return null;
  let slow = head;
  let fast = head.next; // fast starts one node ahead
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
}

const show = (node) => (node === null ? 'none' : String(node.val));

for (let n = 0; n <= 6; n++) {
  const head = build(Array.from({ length: n }, (_, i) => i + 1));
  console.log('n=' + n + ': second middle ' + show(secondMiddle(head)) +
    ', first middle ' + show(firstMiddle(head)));
}` },
          { label: `Copy to array vs two passes vs fast/slow: hops and memory`, code: `class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

function buildOneToN(n) {
  const dummy = new ListNode(0);
  let tail = dummy;
  for (let v = 1; v <= n; v++) {
    tail.next = new ListNode(v);
    tail = tail.next;
  }
  return dummy.next;
}

function middleByCopy(head) {
  const nodes = [];
  let hops = 0;
  for (let node = head; node !== null; node = node.next) {
    nodes.push(node);
    hops++;
  }
  return [nodes[Math.floor(nodes.length / 2)].val, hops, nodes.length];
}

function middleTwoPass(head) {
  let length = 0;
  let hops = 0;
  for (let node = head; node !== null; node = node.next) { // pass 1: count
    length++;
    hops++;
  }
  let node = head;
  for (let i = 0; i < Math.floor(length / 2); i++) {       // pass 2: walk half way
    node = node.next;
    hops++;
  }
  return [node.val, hops, 0];
}

function middleFastSlow(head) {
  let slow = head;
  let fast = head;
  let hops = 0;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
    hops += 3; // slow moved once, fast moved twice
  }
  return [slow.val, hops, 0];
}

for (const n of [1000, 1001]) {
  const head = buildOneToN(n);
  const methods = [['copy to array', middleByCopy], ['two passes', middleTwoPass],
    ['fast/slow', middleFastSlow]];
  for (const [name, fn] of methods) {
    const [mid, hops, stored] = fn(head);
    console.log('n=' + n + ' ' + name + ': middle ' + mid + ', ' + hops + ' hops, ' +
      stored + ' nodes stored');
  }
}` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given the head of a singly linked list, return its middle node. If the list has an even number of nodes, return the second of the two middle nodes. Please do it in Java, in one pass if you can."

**What a strong answer should cover:**
- The baseline: count the nodes, then walk half way (two passes, O(1) space), or copy into an array (O(n) space).
- The one-pass fast and slow pointer loop, and why \`slow\` is in the middle when \`fast\` runs out.
- Even lengths: which middle each starting position gives, and how to get the other one.
- O(n) time and O(1) space, and the honest point that fast/slow does about as many pointer hops as two passes.
- Java specifics: \`int\` division for the index, \`fast != null && fast.next != null\`, and why \`LinkedList.get(size() / 2)\` is not O(1).

**Clarifying questions expected:**
- "For an even length, should I return the first or the second middle?"
- "Should I return the node or its value, and what for an empty list?"

**Code / implementation expected:** Yes — a Java \`static ListNode middle(ListNode head)\` with slow and fast references.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are handed a long paper scroll and asked to cut it exactly in half. The catch: you can only unroll it from the start, and you have no ruler. One way is to unroll the whole thing counting the panels (say 40), roll it back up, and unroll again counting to 20. That works, but you went over the scroll one and a half times.

A friend suggests a trick. Two people walk along the unrolled scroll from the start, one taking one panel per step and the other taking two. When the fast walker steps off the end, the slow one is standing on the middle panel. One walk, no counting.

A linked list is that scroll: you can only follow it forwards from the head, and it does not know its own length. Finding the middle is a small question on its own, but it is also the first step of splitting a list for [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work) and of [checking whether a linked list is a palindrome](/interview-question/how-do-you-check-if-a-linked-list-is-a-palindrome), so interviewers like it as a warm-up.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| For an even length, first or second middle? | \`[1, 2, 3, 4]\` has two middles (2 and 3); the loop's starting position decides which you get. |
| Return the node or its value? | Returning the node lets the caller split or delete there; the value alone does not. |
| What should an empty list return? | There is no middle; return the null value rather than crashing. |
| Is the length known or stored anywhere? | If the list object tracks its size, walking \`size / 2\` steps is enough and the trick is unnecessary. |
| Can the list have a cycle? | Then there is no "end" and no middle; you would detect the cycle first. |

## 3. Brute Force First

**Copy to an array.** Walk the list once, storing every node in an array, then return the node at index \`n / 2\` (rounded down). O(n) time and **O(n) extra space**, which is the cost the interviewer wants you to remove.

**Two passes.** Walk once to count the nodes, then walk again \`n / 2\` steps from the head. O(n) time and O(1) extra space. This is a perfectly correct answer, and saying it first shows you understand the problem before you reach for a trick:

~~~java
static int[] middleTwoPass(ListNode head) {
    int length = 0, hops = 0;
    for (ListNode node = head; node != null; node = node.next) { // pass 1: count
        length++;
        hops++;
    }
    ListNode node = head;
    for (int i = 0; i < length / 2; i++) {                       // pass 2: walk half way
        node = node.next;
        hops++;
    }
    return new int[]{node.val, hops, 0};
}
~~~

(\`hops\` only exists so Example 2 can count pointer moves.) The usual follow-up is "can you do it in one pass?".

## 4. The Core Idea: Fast and Slow Pointers

Move two pointers from the head: \`slow\` one node per round, \`fast\` two nodes per round. After k rounds \`slow\` has moved k nodes and \`fast\` 2k nodes, so when \`fast\` reaches the end, \`slow\` is half way. This is the [fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique), which also detects cycles.

📌 **Interview term: Fast and slow pointers** — two pointers walking the same list at one and two nodes per round; when the fast one finishes, the slow one is at the middle.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 190" role="img" aria-label="On the list 1 to 5 the loop stops with slow on 3 and fast on 5, so 3 is the middle">
  <defs>
    <marker id="mid1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">odd length, loop finished</text>
  <rect class="d-box" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="70" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="690" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="70" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge" d="M 504 65 L 554 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge" d="M 634 65 L 684 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge-accent" d="M 335 134 L 335 98" marker-end="url(#mid1-arrow)"/>
  <text class="d-text d-accent" x="335" y="152" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 595 134 L 595 98" marker-end="url(#mid1-arrow)"/>
  <text class="d-text" x="595" y="152" text-anchor="middle">fast</text>
</svg>

On \`1, 2, 3, 4, 5\` the loop runs two rounds: \`slow\` goes 1, 2, 3 and \`fast\` goes 1, 3, 5. Now \`fast.next\` is \`null\`, the loop stops, and \`slow\` is on 3, the exact middle.

### Even lengths: which middle?

An even list has two middles. Where \`fast\` starts decides which one \`slow\` stops on:

<svg class="iq-diagram" width="100%" viewBox="0 0 930 370" role="img" aria-label="On the list 1 to 6, starting fast at head leaves slow on 4, starting fast one node ahead leaves slow on 3">
  <defs>
    <marker id="mid2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">fast starts at head</text>
  <rect class="d-box" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="70" text-anchor="middle">5</text>
  <rect class="d-box" x="690" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="70" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="820" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="855" y="70" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 504 65 L 554 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 634 65 L 684 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 764 65 L 814 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge-accent" d="M 465 134 L 465 98" marker-end="url(#mid2-arrow)"/>
  <text class="d-text d-accent" x="465" y="152" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 855 134 L 855 98" marker-end="url(#mid2-arrow)"/>
  <text class="d-text" x="855" y="152" text-anchor="middle">fast</text>
  <text class="d-sub" x="40" y="206">fast starts one node ahead</text>
  <rect class="d-box" x="40" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="250" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="250" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="250" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="250" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="250" text-anchor="middle">5</text>
  <rect class="d-box" x="690" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="250" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="820" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="855" y="250" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 245 L 164 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 244 245 L 294 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 374 245 L 424 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 504 245 L 554 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 634 245 L 684 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 764 245 L 814 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge-accent" d="M 335 314 L 335 278" marker-end="url(#mid2-arrow)"/>
  <text class="d-text d-accent" x="335" y="332" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 725 314 L 725 278" marker-end="url(#mid2-arrow)"/>
  <text class="d-text" x="725" y="332" text-anchor="middle">fast</text>
</svg>

With \`fast\` starting at the head, \`fast\` steps 1, 3, 5, then off the end to \`null\`, so \`slow\` gets one more round and stops on 4, the **second middle**. With \`fast\` starting one node ahead (at \`head.next\`), \`fast\` steps 2, 4, 6 and stops because \`6.next\` is \`null\`, so \`slow\` stops on 3, the **first middle**. For odd lengths both versions give the same node.

📌 **Interview term: First vs second middle** — for an even number of nodes n, the nodes at positions n / 2 and n / 2 + 1 (counting from 1); the first is what you need to split a list into two halves of equal size.

📌 **Interview term: One-pass algorithm** — an algorithm that reads its input once from start to end, without going back; useful when restarting is expensive or the step is part of a larger single walk.

## 5. The Code in Java

The second middle (the usual interview version):

~~~java
// For an even length, return the second of the two middle nodes.
static ListNode secondMiddle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow;
}
~~~

The first middle, for splitting a list in half:

~~~java
// For an even length, return the first of the two middle nodes.
static ListNode firstMiddle(ListNode head) {
    if (head == null) return null;
    ListNode slow = head, fast = head.next; // fast starts one node ahead
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow;
}
~~~

**Line by line:**

- \`ListNode slow = head, fast = head;\` copies the reference to the head node twice; no node is copied.
- \`while (fast != null && fast.next != null)\`: \`&&\` short-circuits, so \`fast.next\` is never evaluated when \`fast\` is \`null\`. Reversed, the even-length case throws \`NullPointerException\`.
- \`fast = fast.next.next\` is safe because the loop test just proved \`fast.next\` is not \`null\`; the result may be \`null\`, which ends the loop.
- \`firstMiddle\` starts \`fast\` at \`head.next\`, one node ahead, so \`slow\` stops one node earlier on even lengths. It needs the \`head == null\` guard first.
- In the copy-to-array version (Example 2), \`nodes.size() / 2\` is \`int\` division, which drops the fraction, so the index is always valid.

📌 **Interview term: Short-circuit evaluation** — \`&&\` evaluates its right side only when the left side is true, which makes \`fast != null && fast.next != null\` safe.

## 6. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — First and second middle for every length from 0 to 6** prints:

~~~text
n=0: second middle none, first middle none
n=1: second middle 1, first middle 1
n=2: second middle 2, first middle 1
n=3: second middle 2, first middle 2
n=4: second middle 3, first middle 2
n=5: second middle 3, first middle 3
n=6: second middle 4, first middle 3
~~~

**Example 2 — Copy to array vs two passes vs fast/slow: hops and memory** prints:

~~~text
n=1000 copy to array: middle 501, 1000 hops, 1000 nodes stored
n=1000 two passes: middle 501, 1500 hops, 0 nodes stored
n=1000 fast/slow: middle 501, 1500 hops, 0 nodes stored
n=1001 copy to array: middle 501, 1001 hops, 1001 nodes stored
n=1001 two passes: middle 501, 1501 hops, 0 nodes stored
n=1001 fast/slow: middle 501, 1500 hops, 0 nodes stored
~~~

**What the numbers show:** Example 1 is the whole even/odd story in seven lines: the two versions agree for odd lengths and differ by one node for even lengths, and both handle the empty list. Example 2 finds the same middle (501) three ways and counts the cost: the array copy makes fewer hops but stores every node, while two passes and fast/slow store nothing and make the same 1,500 hops on 1,000 nodes (1,501 and 1,500 on 1,001 nodes).

## 7. Complexity

| Approach | Time | Extra space | Pointer hops on 1,000 nodes (Example 2) |
| :--- | :--- | :--- | :--- |
| Copy nodes into an array | O(n) | O(n) | 1,000, but stores 1,000 references |
| Two passes (count, then walk half) | O(n) | O(1) | 1,500 |
| Fast and slow pointers | O(n) | O(1) | 1,500 |

The honest reading of the last column: **fast/slow does not make fewer pointer moves than two passes.** Both touch about 1.5n \`next\` pointers. What it gives you is a single loop with no length counter, which is why it is the version that slots into bigger one-pass algorithms (find the middle while reversing the first half, split for merge sort, detect a cycle with the same loop). For the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty list:** both versions return \`null\`. Example 1 prints \`n=0: second middle none, first middle none\`.
- **One node:** the node is its own middle in both versions (\`n=1\` in Example 1).
- **Two nodes:** second middle is node 2, first middle is node 1; this is the case that most often exposes an off-by-one.
- **Odd lengths:** both versions agree (\`n=3\`, \`n=5\` in Example 1).
- **A cycle:** \`fast\` never reaches the end, so the loop never stops. If the input may be cyclic, [detect the cycle](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list) first.

## Common Pitfalls

- **Checking \`fast.next\` before \`fast\`.** \`while (fast.next != null && fast != null)\` throws \`NullPointerException\` on even lengths.
- **Not saying which middle you return.** For \`[1, 2, 3, 4]\` the loop with \`fast = head\` returns 3; with \`fast = head.next\` it returns 2. Ask, then pick.
- **Using \`java.util.LinkedList.get(size() / 2)\`.** It works, but \`get(i)\` walks the list from the nearer end, so it is O(n), not O(1), and it is not the node-level answer the interviewer wants.
- **Forgetting the empty list in \`firstMiddle\`.** \`head.next\` on \`null\` throws; guard it first.
- **Claiming fast/slow does fewer steps.** It does not: Example 2 counted 1,500 hops for both the two-pass and the fast/slow version on 1,000 nodes. Its advantages are one pass and no length counter.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Brute force:</strong> <span style="color:#f0e2c8;">Copy the nodes into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList</code> and return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nodes.get(nodes.size() / 2)</code>: O(n) time but O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Better:</strong> <span style="color:#f0e2c8;">Two passes: count the length, then walk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length / 2</code> steps. O(n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. One pass:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> moves 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> moves 2; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast == null || fast.next == null</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> is the middle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Even lengths:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast = head</code> gives the second middle, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast = head.next</code> the first; I would confirm which one is wanted.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Honest cost:</strong> <span style="color:#f0e2c8;">Fast/slow makes the same number of hops as two passes (1,500 each for 1,000 nodes in my run); its value is one loop and being a building block.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which middle does merge sort need?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The first middle, so a two-node list splits into one and one; then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode right = mid.next; mid.next = null;</code> cuts the list.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LinkedList.get(size() / 2)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is O(n) because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> walks from the nearer end, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size()</code> is tracked by the library. With your own nodes there is no size field to read.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you check a palindrome with this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Find the middle, reverse the second half, compare node by node, then optionally restore. O(n) time, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you delete the middle node?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> behind <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code>; after the loop set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev.next = slow.next</code>. A one-node list becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">fast.next.next</code> safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The loop condition has just checked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast.next != null</code>; the double hop may give <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>, which ends the loop.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Fast and slow pointers** | pointers moving one and two nodes per round; slow ends at the middle |
| **First vs second middle** | the two middle nodes of an even-length list |
| **One-pass algorithm** | reads the input once from start to end |
| **Short-circuit evaluation** | \`&&\` skips its right side when the left side is false |

---
**Conclusion:** Finding the middle of a linked list has a correct two-pass answer (count, then walk half way) and a one-pass answer with fast and slow references: when \`fast\` can no longer take two steps, \`slow\` is in the middle. Both are O(n) time and O(1) space, and they make the same number of pointer hops; the one-pass loop wins on simplicity and reuse. In Java, the details that matter are the \`fast != null && fast.next != null\` order, not relying on \`LinkedList.get\`, and stating which middle you return for even lengths.`,
        examples: [
          { label: `First and second middle for every length from 0 to 6`, code: `public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    static ListNode buildOneToN(int n) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        for (int v = 1; v <= n; v++) {
            tail.next = new ListNode(v);
            tail = tail.next;
        }
        return dummy.next;
    }

    // For an even length, return the second of the two middle nodes.
    static ListNode secondMiddle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;
    }

    // For an even length, return the first of the two middle nodes.
    static ListNode firstMiddle(ListNode head) {
        if (head == null) return null;
        ListNode slow = head, fast = head.next; // fast starts one node ahead
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;
    }

    static String show(ListNode node) {
        return node == null ? "none" : String.valueOf(node.val);
    }

    public static void main(String[] args) {
        for (int n = 0; n <= 6; n++) {
            ListNode head = buildOneToN(n);
            System.out.println("n=" + n + ": second middle " + show(secondMiddle(head))
                    + ", first middle " + show(firstMiddle(head)));
        }
    }
}` },
          { label: `Copy to array vs two passes vs fast/slow: hops and memory`, code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    static ListNode buildOneToN(int n) {
        ListNode dummy = new ListNode(0);
        ListNode tail = dummy;
        for (int v = 1; v <= n; v++) {
            tail.next = new ListNode(v);
            tail = tail.next;
        }
        return dummy.next;
    }

    // Each method returns {middle value, hops, nodes stored}.
    static int[] middleByCopy(ListNode head) {
        List<ListNode> nodes = new ArrayList<>();
        int hops = 0;
        for (ListNode node = head; node != null; node = node.next) {
            nodes.add(node);
            hops++;
        }
        return new int[]{nodes.get(nodes.size() / 2).val, hops, nodes.size()};
    }

    static int[] middleTwoPass(ListNode head) {
        int length = 0, hops = 0;
        for (ListNode node = head; node != null; node = node.next) { // pass 1: count
            length++;
            hops++;
        }
        ListNode node = head;
        for (int i = 0; i < length / 2; i++) {                       // pass 2: walk half way
            node = node.next;
            hops++;
        }
        return new int[]{node.val, hops, 0};
    }

    static int[] middleFastSlow(ListNode head) {
        ListNode slow = head, fast = head;
        int hops = 0;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            hops += 3; // slow moved once, fast moved twice
        }
        return new int[]{slow.val, hops, 0};
    }

    static void report(int n, String name, int[] r) {
        System.out.println("n=" + n + " " + name + ": middle " + r[0] + ", " + r[1] + " hops, " + r[2] + " nodes stored");
    }

    public static void main(String[] args) {
        for (int n : new int[]{1000, 1001}) {
            ListNode head = buildOneToN(n);
            report(n, "copy to array", middleByCopy(head));
            report(n, "two passes", middleTwoPass(head));
            report(n, "fast/slow", middleFastSlow(head));
        }
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given the head of a singly linked list, return its middle node. If the list has an even number of nodes, return the second of the two middle nodes. Please do it in C++, in one pass if you can."

**What a strong answer should cover:**
- The baseline: count the nodes, then walk half way (two passes, O(1) space), or copy into an array (O(n) space).
- The one-pass fast and slow pointer loop, and why \`slow\` is in the middle when \`fast\` runs out.
- Even lengths: which middle each starting position gives, and how to get the other one.
- O(n) time and O(1) space, and the honest point that fast/slow does about as many pointer hops as two passes.
- C++ specifics: short-circuit order to avoid dereferencing \`nullptr\`, \`std::size_t\` arithmetic, and no \`size()\` on \`std::forward_list\`.

**Clarifying questions expected:**
- "For an even length, should I return the first or the second middle?"
- "Should I return the node or its value, and what for an empty list?"

**Code / implementation expected:** Yes — a C++ \`ListNode* middle(ListNode* head)\` with slow and fast pointers.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are handed a long paper scroll and asked to cut it exactly in half. The catch: you can only unroll it from the start, and you have no ruler. One way is to unroll the whole thing counting the panels (say 40), roll it back up, and unroll again counting to 20. That works, but you went over the scroll one and a half times.

A friend suggests a trick. Two people walk along the unrolled scroll from the start, one taking one panel per step and the other taking two. When the fast walker steps off the end, the slow one is standing on the middle panel. One walk, no counting.

A linked list is that scroll: you can only follow it forwards from the head, and it does not know its own length. Finding the middle is a small question on its own, but it is also the first step of splitting a list for [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work) and of [checking whether a linked list is a palindrome](/interview-question/how-do-you-check-if-a-linked-list-is-a-palindrome), so interviewers like it as a warm-up.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| For an even length, first or second middle? | \`[1, 2, 3, 4]\` has two middles (2 and 3); the loop's starting position decides which you get. |
| Return the node or its value? | Returning the node lets the caller split or delete there; the value alone does not. |
| What should an empty list return? | There is no middle; return the null value rather than crashing. |
| Is the length known or stored anywhere? | If the list object tracks its size, walking \`size / 2\` steps is enough and the trick is unnecessary. |
| Can the list have a cycle? | Then there is no "end" and no middle; you would detect the cycle first. |

## 3. Brute Force First

**Copy to an array.** Walk the list once, storing every node in an array, then return the node at index \`n / 2\` (rounded down). O(n) time and **O(n) extra space**, which is the cost the interviewer wants you to remove.

**Two passes.** Walk once to count the nodes, then walk again \`n / 2\` steps from the head. O(n) time and O(1) extra space. This is a perfectly correct answer, and saying it first shows you understand the problem before you reach for a trick:

~~~cpp
Result middleTwoPass(ListNode* head) {
    int length = 0, hops = 0;
    for (ListNode* node = head; node != nullptr; node = node->next) { // pass 1: count
        ++length;
        ++hops;
    }
    ListNode* node = head;
    for (int i = 0; i < length / 2; ++i) {                           // pass 2: walk half way
        node = node->next;
        ++hops;
    }
    return {node->val, hops, 0};
}
~~~

(\`hops\` only exists so Example 2 can count pointer moves.) The usual follow-up is "can you do it in one pass?".

## 4. The Core Idea: Fast and Slow Pointers

Move two pointers from the head: \`slow\` one node per round, \`fast\` two nodes per round. After k rounds \`slow\` has moved k nodes and \`fast\` 2k nodes, so when \`fast\` reaches the end, \`slow\` is half way. This is the [fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique), which also detects cycles.

📌 **Interview term: Fast and slow pointers** — two pointers walking the same list at one and two nodes per round; when the fast one finishes, the slow one is at the middle.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 190" role="img" aria-label="On the list 1 to 5 the loop stops with slow on 3 and fast on 5, so 3 is the middle">
  <defs>
    <marker id="mid1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">odd length, loop finished</text>
  <rect class="d-box" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="70" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="690" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="70" text-anchor="middle">nullptr</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge" d="M 504 65 L 554 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge" d="M 634 65 L 684 65" marker-end="url(#mid1-arrow)"/>
  <path class="d-edge-accent" d="M 335 134 L 335 98" marker-end="url(#mid1-arrow)"/>
  <text class="d-text d-accent" x="335" y="152" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 595 134 L 595 98" marker-end="url(#mid1-arrow)"/>
  <text class="d-text" x="595" y="152" text-anchor="middle">fast</text>
</svg>

On \`1, 2, 3, 4, 5\` the loop runs two rounds: \`slow\` goes 1, 2, 3 and \`fast\` goes 1, 3, 5. Now \`fast->next\` is \`nullptr\`, the loop stops, and \`slow\` is on 3, the exact middle.

### Even lengths: which middle?

An even list has two middles. Where \`fast\` starts decides which one \`slow\` stops on:

<svg class="iq-diagram" width="100%" viewBox="0 0 930 370" role="img" aria-label="On the list 1 to 6, starting fast at head leaves slow on 4, starting fast one node ahead leaves slow on 3">
  <defs>
    <marker id="mid2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">fast starts at head</text>
  <rect class="d-box" x="40" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="70" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="70" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="70" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="430" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="70" text-anchor="middle">5</text>
  <rect class="d-box" x="690" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="70" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="820" y="40" width="70" height="50" rx="6"/>
  <text class="d-text" x="855" y="70" text-anchor="middle">nullptr</text>
  <path class="d-edge" d="M 114 65 L 164 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 244 65 L 294 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 374 65 L 424 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 504 65 L 554 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 634 65 L 684 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 764 65 L 814 65" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge-accent" d="M 465 134 L 465 98" marker-end="url(#mid2-arrow)"/>
  <text class="d-text d-accent" x="465" y="152" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 855 134 L 855 98" marker-end="url(#mid2-arrow)"/>
  <text class="d-text" x="855" y="152" text-anchor="middle">fast</text>
  <text class="d-sub" x="40" y="206">fast starts one node ahead</text>
  <rect class="d-box" x="40" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="250" text-anchor="middle">1</text>
  <rect class="d-box" x="170" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="250" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="250" text-anchor="middle">3</text>
  <rect class="d-box" x="430" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="250" text-anchor="middle">4</text>
  <rect class="d-box" x="560" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="250" text-anchor="middle">5</text>
  <rect class="d-box" x="690" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="725" y="250" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="820" y="220" width="70" height="50" rx="6"/>
  <text class="d-text" x="855" y="250" text-anchor="middle">nullptr</text>
  <path class="d-edge" d="M 114 245 L 164 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 244 245 L 294 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 374 245 L 424 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 504 245 L 554 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 634 245 L 684 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge" d="M 764 245 L 814 245" marker-end="url(#mid2-arrow)"/>
  <path class="d-edge-accent" d="M 335 314 L 335 278" marker-end="url(#mid2-arrow)"/>
  <text class="d-text d-accent" x="335" y="332" text-anchor="middle">slow</text>
  <path class="d-edge" d="M 725 314 L 725 278" marker-end="url(#mid2-arrow)"/>
  <text class="d-text" x="725" y="332" text-anchor="middle">fast</text>
</svg>

With \`fast\` starting at the head, \`fast\` steps 1, 3, 5, then off the end to \`nullptr\`, so \`slow\` gets one more round and stops on 4, the **second middle**. With \`fast\` starting one node ahead (at \`head->next\`), \`fast\` steps 2, 4, 6 and stops because \`6->next\` is \`nullptr\`, so \`slow\` stops on 3, the **first middle**. For odd lengths both versions give the same node.

📌 **Interview term: First vs second middle** — for an even number of nodes n, the nodes at positions n / 2 and n / 2 + 1 (counting from 1); the first is what you need to split a list into two halves of equal size.

📌 **Interview term: One-pass algorithm** — an algorithm that reads its input once from start to end, without going back; useful when restarting is expensive or the step is part of a larger single walk.

## 5. The Code in C++

The second middle (the usual interview version):

~~~cpp
// For an even length, return the second of the two middle nodes.
ListNode* secondMiddle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}
~~~

The first middle, for splitting a list in half:

~~~cpp
// For an even length, return the first of the two middle nodes.
ListNode* firstMiddle(ListNode* head) {
    if (head == nullptr) return nullptr;
    ListNode* slow = head;
    ListNode* fast = head->next; // fast starts one node ahead
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}
~~~

**Line by line:**

- \`ListNode* slow = head; ListNode* fast = head;\` copies a pointer; no node is copied or allocated.
- \`while (fast != nullptr && fast->next != nullptr)\`: \`&&\` short-circuits, so \`fast->next\` is never evaluated on a null pointer. Reversed, it is undefined behaviour on the even-length case.
- \`fast = fast->next->next\` is safe because the loop test just proved \`fast->next\` is not null; the result may be \`nullptr\`, which ends the loop.
- \`firstMiddle\` starts \`fast\` at \`head->next\`, one node ahead, so \`slow\` stops one node earlier on even lengths. It needs the \`head == nullptr\` guard first.
- In the copy-to-array version (Example 2), \`nodes.size() / 2\` is unsigned (\`std::size_t\`) integer division. Mixing it with \`int\` counters gives sign-comparison warnings under \`-Wall\`; keep index arithmetic in \`std::size_t\`.

📌 **Interview term: Short-circuit evaluation** — \`&&\` evaluates its right side only when the left side is true, which makes \`fast != nullptr && fast->next != nullptr\` safe.

## 6. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — First and second middle for every length from 0 to 6** prints:

~~~text
n=0: second middle none, first middle none
n=1: second middle 1, first middle 1
n=2: second middle 2, first middle 1
n=3: second middle 2, first middle 2
n=4: second middle 3, first middle 2
n=5: second middle 3, first middle 3
n=6: second middle 4, first middle 3
~~~

**Example 2 — Copy to array vs two passes vs fast/slow: hops and memory** prints:

~~~text
n=1000 copy to array: middle 501, 1000 hops, 1000 nodes stored
n=1000 two passes: middle 501, 1500 hops, 0 nodes stored
n=1000 fast/slow: middle 501, 1500 hops, 0 nodes stored
n=1001 copy to array: middle 501, 1001 hops, 1001 nodes stored
n=1001 two passes: middle 501, 1501 hops, 0 nodes stored
n=1001 fast/slow: middle 501, 1500 hops, 0 nodes stored
~~~

**What the numbers show:** Example 1 is the whole even/odd story in seven lines: the two versions agree for odd lengths and differ by one node for even lengths, and both handle the empty list. Example 2 finds the same middle (501) three ways and counts the cost: the array copy makes fewer hops but stores every node, while two passes and fast/slow store nothing and make the same 1,500 hops on 1,000 nodes (1,501 and 1,500 on 1,001 nodes).

## 7. Complexity

| Approach | Time | Extra space | Pointer hops on 1,000 nodes (Example 2) |
| :--- | :--- | :--- | :--- |
| Copy nodes into an array | O(n) | O(n) | 1,000, but stores 1,000 references |
| Two passes (count, then walk half) | O(n) | O(1) | 1,500 |
| Fast and slow pointers | O(n) | O(1) | 1,500 |

The honest reading of the last column: **fast/slow does not make fewer pointer moves than two passes.** Both touch about 1.5n \`next\` pointers. What it gives you is a single loop with no length counter, which is why it is the version that slots into bigger one-pass algorithms (find the middle while reversing the first half, split for merge sort, detect a cycle with the same loop). For the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty list:** both versions return \`nullptr\`. Example 1 prints \`n=0: second middle none, first middle none\`.
- **One node:** the node is its own middle in both versions (\`n=1\` in Example 1).
- **Two nodes:** second middle is node 2, first middle is node 1; this is the case that most often exposes an off-by-one.
- **Odd lengths:** both versions agree (\`n=3\`, \`n=5\` in Example 1).
- **A cycle:** \`fast\` never reaches the end, so the loop never stops. If the input may be cyclic, [detect the cycle](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list) first.

## Common Pitfalls

- **Checking \`fast->next\` before \`fast\`.** \`fast->next != nullptr && fast != nullptr\` dereferences null first: undefined behaviour.
- **Not saying which middle you return.** For \`[1, 2, 3, 4]\` the loop with \`fast = head\` returns 3; with \`fast = head->next\` it returns 2. Ask, then pick.
- **Signed/unsigned mixing.** Comparing an \`int\` counter with \`nodes.size()\` warns under \`-Wall\` and can misbehave for negative values; use \`std::size_t\`.
- **Forgetting the empty list in \`firstMiddle\`.** \`head->next\` on \`nullptr\` is undefined behaviour; guard it first.
- **Claiming fast/slow does fewer steps.** It does not: Example 2 counted 1,500 hops for both the two-pass and the fast/slow version on 1,000 nodes. Its advantages are one pass and no length counter.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Brute force:</strong> <span style="color:#f0e2c8;">Copy the node pointers into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;ListNode*&gt;</code> and return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nodes[nodes.size() / 2]</code>: O(n) time but O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Better:</strong> <span style="color:#f0e2c8;">Two passes: count the length, then walk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length / 2</code> steps. O(n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. One pass:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> moves 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> moves 2; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast == nullptr || fast-&gt;next == nullptr</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> is the middle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Even lengths:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast = head</code> gives the second middle, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast = head-&gt;next</code> the first; I would confirm which one is wanted.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Honest cost:</strong> <span style="color:#f0e2c8;">Fast/slow makes the same number of hops as two passes (1,500 each for 1,000 nodes in my run); its value is one loop and being a building block.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which middle does merge sort need?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The first middle, so a two-node list splits into one and one; then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode* right = mid-&gt;next; mid-&gt;next = nullptr;</code> cuts the list.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::forward_list</code> offer here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size()</code> member and no random access, so you would still walk it; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::next(begin, k)</code> is O(k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you check a palindrome with this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Find the middle, reverse the second half in place, compare node by node, then optionally restore. O(n) time, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you delete the middle node?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> behind <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code>; after the loop set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev-&gt;next = slow-&gt;next</code> and free <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> if you own it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">fast-&gt;next-&gt;next</code> safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The loop condition has just checked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast-&gt;next != nullptr</code>; the double hop may give <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code>, which ends the loop.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Fast and slow pointers** | pointers moving one and two nodes per round; slow ends at the middle |
| **First vs second middle** | the two middle nodes of an even-length list |
| **One-pass algorithm** | reads the input once from start to end |
| **Short-circuit evaluation** | \`&&\` skips its right side when the left side is false |

---
**Conclusion:** Finding the middle of a linked list has a correct two-pass answer (count, then walk half way) and a one-pass answer with fast and slow pointers: when \`fast\` can no longer take two steps, \`slow\` is in the middle. Both are O(n) time and O(1) space with no allocation, and they make the same number of pointer hops; the one-pass loop wins on simplicity and reuse. In C++, the details that matter are the short-circuit order that keeps you from dereferencing \`nullptr\`, \`std::size_t\` index arithmetic, and stating which middle you return for even lengths.`,
        examples: [
          { label: `First and second middle for every length from 0 to 6`, code: `#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct ListNode {
    int val;
    ListNode* next;
    explicit ListNode(int v) : val(v), next(nullptr) {}
};

std::vector<std::unique_ptr<ListNode>> pool; // owns every node

ListNode* buildOneToN(int n) {
    ListNode dummy(0);
    ListNode* tail = &dummy;
    for (int v = 1; v <= n; ++v) {
        pool.push_back(std::make_unique<ListNode>(v));
        tail->next = pool.back().get();
        tail = tail->next;
    }
    return dummy.next;
}

// For an even length, return the second of the two middle nodes.
ListNode* secondMiddle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}

// For an even length, return the first of the two middle nodes.
ListNode* firstMiddle(ListNode* head) {
    if (head == nullptr) return nullptr;
    ListNode* slow = head;
    ListNode* fast = head->next; // fast starts one node ahead
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}

std::string show(const ListNode* node) {
    return node == nullptr ? "none" : std::to_string(node->val);
}

int main() {
    for (int n = 0; n <= 6; ++n) {
        ListNode* head = buildOneToN(n);
        std::cout << "n=" << n << ": second middle " << show(secondMiddle(head))
                  << ", first middle " << show(firstMiddle(head)) << "\\n";
    }
}` },
          { label: `Copy to array vs two passes vs fast/slow: hops and memory`, code: `#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct ListNode {
    int val;
    ListNode* next;
    explicit ListNode(int v) : val(v), next(nullptr) {}
};

std::vector<std::unique_ptr<ListNode>> pool; // owns every node

ListNode* buildOneToN(int n) {
    ListNode dummy(0);
    ListNode* tail = &dummy;
    for (int v = 1; v <= n; ++v) {
        pool.push_back(std::make_unique<ListNode>(v));
        tail->next = pool.back().get();
        tail = tail->next;
    }
    return dummy.next;
}

struct Result { int middle; int hops; size_t stored; };

Result middleByCopy(ListNode* head) {
    std::vector<ListNode*> nodes;
    int hops = 0;
    for (ListNode* node = head; node != nullptr; node = node->next) {
        nodes.push_back(node);
        ++hops;
    }
    return {nodes[nodes.size() / 2]->val, hops, nodes.size()};
}

Result middleTwoPass(ListNode* head) {
    int length = 0, hops = 0;
    for (ListNode* node = head; node != nullptr; node = node->next) { // pass 1: count
        ++length;
        ++hops;
    }
    ListNode* node = head;
    for (int i = 0; i < length / 2; ++i) {                           // pass 2: walk half way
        node = node->next;
        ++hops;
    }
    return {node->val, hops, 0};
}

Result middleFastSlow(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    int hops = 0;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        hops += 3; // slow moved once, fast moved twice
    }
    return {slow->val, hops, 0};
}

void report(int n, const std::string& name, const Result& r) {
    std::cout << "n=" << n << " " << name << ": middle " << r.middle << ", " << r.hops
              << " hops, " << r.stored << " nodes stored\\n";
}

int main() {
    for (int n : {1000, 1001}) {
        ListNode* head = buildOneToN(n);
        report(n, "copy to array", middleByCopy(head));
        report(n, "two passes", middleTwoPass(head));
        report(n, "fast/slow", middleFastSlow(head));
    }
}` },
        ],
      },
    },
  },
  {
    title: `How do you detect a cycle in a linked list?`,
    difficulty: "medium",
    seoDescription: `Detect a cycle in a linked list in Python, JavaScript, Java and C++: hash set vs Floyd's tortoise and hare, why they meet, cycle start, verified code.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given the head of a linked list, tell me whether it contains a cycle, meaning some node's next pointer leads back to an earlier node. Write it in Python. Can you do it with constant extra memory?"

**What a strong answer should cover:**
- The simple approach: remember visited nodes in a hash set; O(n) time and O(n) space.
- Floyd's tortoise and hare: one pointer moves one step, the other two; they meet if and only if there is a cycle; O(n) time and O(1) space.
- Why they must meet: inside the loop the gap shrinks by exactly one node per round, so it cannot be skipped.
- Comparing node identity, not values, and handling the empty list, one node, and a node that points to itself.
- The follow-ups: cycle length, and where the cycle starts (reset one pointer to the head).
- Python specifics: identity with \`is\`, why a \`set\` of nodes works with the default hash but not with a \`@dataclass\` node, and checking \`fast is not None\` before \`fast.next\`.

**Clarifying questions expected:**
- "Do you only need true or false, or also where the cycle starts?"
- "May I modify the list (for example mark visited nodes), or must it stay unchanged?"

**Code / implementation expected:** Yes — a Python \`has_cycle(head)\` using Floyd's algorithm, ideally after describing the hash-set version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are following signposts through a huge forest park: each post points to the next one, and the last post should point to the exit. But someone has knocked a post round, and now it points back to a post you passed earlier. If that happened, you will walk in circles for ever, and since every post looks the same, you cannot tell just by looking.

Option one: tie a ribbon on every post you pass. If you ever reach a post that already has your ribbon, you are going in circles. That works, but you need as many ribbons as there are posts.

Option two needs no ribbons. You and a friend set off together; you walk, your friend jogs at twice your speed. If there is an exit, your friend reaches it first and phones you. If there is a loop, your friend goes round it and eventually comes up behind you, and you meet. Meeting is the proof.

A linked list with a bad \`next\` pointer is that forest. Code that walks it, prints it, frees it or counts it will hang or crash. Detecting cycles is also the basis of harder questions, such as [finding where the cycle begins](/interview-question/how-do-you-find-the-node-where-a-linked-list-cycle-begins), and of the same idea on graphs, [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you need only yes or no, or the start of the cycle too? | Floyd answers yes or no; finding the start needs a second phase. |
| Is O(n) extra memory acceptable? | If yes, a hash set is the simplest correct answer; if not, Floyd. |
| May I modify the nodes? | Marking visited nodes in place is O(1) space but destroys the input. |
| Can node values repeat? | They usually can, which is why you must compare node identity, not values. |
| How long can the list be? | Very long lists make the O(n) set expensive and rule out recursion. |

## 3. What a Cycle Looks Like

In a normal list, following \`next\` eventually reaches \`None\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 670 160" role="img" aria-label="The same values without a cycle, the last node points to None">
  <defs>
    <marker id="cyc2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="40" text-anchor="middle">3</text>
  <rect class="d-box" x="170" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="40" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="40" text-anchor="middle">0</text>
  <rect class="d-box" x="430" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="40" text-anchor="middle">-4</text>
  <rect class="d-box-muted" x="560" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="40" text-anchor="middle">None</text>
  <path class="d-edge" d="M 114 35 L 164 35" marker-end="url(#cyc2-arrow)"/>
  <path class="d-edge" d="M 244 35 L 294 35" marker-end="url(#cyc2-arrow)"/>
  <path class="d-edge" d="M 374 35 L 424 35" marker-end="url(#cyc2-arrow)"/>
  <path class="d-edge" d="M 504 35 L 554 35" marker-end="url(#cyc2-arrow)"/>
  <path class="d-edge" d="M 75 104 L 75 68" marker-end="url(#cyc2-arrow)"/>
  <text class="d-text" x="75" y="122" text-anchor="middle">head</text>
</svg>

In a list with a cycle, the last node's \`next\` points back to an earlier node instead, so the walk never ends:

<svg class="iq-diagram" width="100%" viewBox="0 0 540 220" role="img" aria-label="The list 3 then 2 then 0 then minus 4, where minus 4 links back to 2, so 2 0 and minus 4 form a loop">
  <defs>
    <marker id="cyc1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="100" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="170" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="100" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="100" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="430" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="100" text-anchor="middle">-4</text>
  <path class="d-edge" d="M 114 95 L 164 95" marker-end="url(#cyc1-arrow)"/>
  <path class="d-edge" d="M 244 95 L 294 95" marker-end="url(#cyc1-arrow)"/>
  <path class="d-edge" d="M 374 95 L 424 95" marker-end="url(#cyc1-arrow)"/>
  <path class="d-edge-accent" d="M 465 66 L 465 30 L 205 30 L 205 64" fill="none" marker-end="url(#cyc1-arrow)"/>
  <text class="d-sub" x="335" y="20" text-anchor="middle">-4 links back to 2</text>
  <path class="d-edge" d="M 75 164 L 75 128" marker-end="url(#cyc1-arrow)"/>
  <text class="d-text" x="75" y="182" text-anchor="middle">head</text>
  <path class="d-edge-accent" d="M 205 164 L 205 128" marker-end="url(#cyc1-arrow)"/>
  <text class="d-text d-accent" x="205" y="182" text-anchor="middle">cycle entry</text>
</svg>

Here \`-4\` links back to \`2\`, so \`2, 0, -4\` repeat for ever. A cyclic list always has this shape: a straight **tail** from the head to the entry (here just node \`3\`), then a **loop**. The tail can be empty (the last node points to the head) and the loop can be a single node pointing to itself.

📌 **Interview term: Cycle (in a linked list)** — a situation where following \`next\` pointers returns to a node already visited, so the walk never reaches the null terminator.

📌 **Interview term: Tail length and loop length** — the number of nodes before the cycle entry (often written μ, "mu") and the number of nodes in the loop (λ, "lambda"); the list has μ + λ nodes.

## 4. Approach 1: Remember Every Node (Hash Set)

Walk the list and keep a set of nodes already visited. If the current node is already in the set, the walk has come back: cycle. If you reach \`None\`, no cycle. A [hash table](/interview-question/how-does-a-hash-table-work) makes each lookup O(1) on average.

~~~python
def has_cycle_set(head):
    """Hash set of visited nodes: simpler, but O(n) extra memory."""
    seen = set()                  # plain objects hash by identity
    node = head
    while node is not None:
        if node in seen:
            return True
        seen.add(node)
        node = node.next
    return False
~~~

A Python \`set\` stores objects by their hash. A plain class without \`__eq__\` uses the default identity-based hash and equality, so the set really asks "have I seen **this node object** before?", which is what we need. Two traps: if the node class defines \`__eq__\` (a \`@dataclass\` does it for you), Python sets its \`__hash__\` to \`None\` and \`set.add(node)\` fails; \`{D(1)}\` on a dataclass node raised \`TypeError: unhashable type: 'D'\` here. And if you added a value-based \`__eq__\` and \`__hash__\`, two different nodes with the same value would look like a revisit. Storing \`id(node)\` instead of the node avoids both.

📌 **Interview term: Hashable** — an object Python can put in a \`set\` or use as a \`dict\` key; it needs a \`__hash__\` that never changes and an \`__eq__\` that agrees with it.

This is O(n) time and **O(n) extra memory**: on a 10,000-node list it stored all 10,000 nodes before seeing the repeat (Example 2). It is a fine first answer; then the interviewer asks for O(1) memory.

📌 **Interview term: Visited set** — a set of everything already processed, used to detect a repeat; the standard O(n)-space way to find cycles in lists and graphs.

## 5. Approach 2: Floyd's Tortoise and Hare

Use the [fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique): both pointers start at the head; each round \`slow\` moves one node and \`fast\` moves two.

- **No cycle:** \`fast\` runs off the end (it, or the node after it, is \`None\`). Return false.
- **Cycle:** \`fast\` can never reach an end. Both pointers eventually enter the loop, and from then on, each round \`fast\` gets **exactly one node closer** to \`slow\` (it moves 2, \`slow\` moves 1). The gap goes k, k - 1, ..., 1, 0, so it cannot jump over zero: they land on the same node. Return true.

📌 **Interview term: Floyd's cycle detection (tortoise and hare)** — detect a cycle by moving one pointer one step and another two steps per round; they meet on the same node if and only if there is a cycle. O(n) time, O(1) space.

Dry run on the cyclic list above (\`3, 2, 0, -4\` with \`-4\` linking back to \`2\`):

| Round | \`slow\` on | \`fast\` on | Same node? |
| :--- | :--- | :--- | :--- |
| start | 3 | 3 | (not checked) |
| 1 | 2 | 0 | no |
| 2 | 0 | 2 | no |
| 3 | -4 | -4 | **yes: cycle** |

<svg class="iq-diagram" width="100%" viewBox="0 0 540 250" role="img" aria-label="After three rounds slow and fast both stand on the node minus 4, which proves the cycle">
  <defs>
    <marker id="cyc3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">after round 3</text>
  <rect class="d-box" x="40" y="100" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="130" text-anchor="middle">3</text>
  <rect class="d-box" x="170" y="100" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="130" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="100" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="130" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="430" y="100" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="130" text-anchor="middle">-4</text>
  <path class="d-edge" d="M 114 125 L 164 125" marker-end="url(#cyc3-arrow)"/>
  <path class="d-edge" d="M 244 125 L 294 125" marker-end="url(#cyc3-arrow)"/>
  <path class="d-edge" d="M 374 125 L 424 125" marker-end="url(#cyc3-arrow)"/>
  <path class="d-edge-accent" d="M 465 96 L 465 60 L 205 60 L 205 94" fill="none" marker-end="url(#cyc3-arrow)"/>
  <path class="d-edge-accent" d="M 465 194 L 465 158" marker-end="url(#cyc3-arrow)"/>
  <text class="d-text d-accent" x="465" y="212" text-anchor="middle">slow and fast</text>
</svg>

In round 2 \`fast\` went \`0 -> -4 -> 2\` around the loop, and in round 3 it went \`2 -> 0 -> -4\`, landing on the same node as \`slow\`.

### How many rounds?

\`slow\` enters the loop after μ rounds. From then on \`fast\` closes the gap by one per round and the gap is less than λ, so they meet within λ more rounds: fewer than μ + λ = n rounds in total. Example 2 measured it: on a 10,000-node list whose tail links back to index 3,000 (μ = 3,000, λ = 7,000) they met after 7,000 rounds.

### Bonus: cycle length and cycle start

Once they have met, two more short walks give more information (the full proof is on [the cycle start page](/interview-question/how-do-you-find-the-node-where-a-linked-list-cycle-begins)):

~~~python
def analyse(head):
    # Phase 1: find a meeting point inside the loop.
    slow = fast = head
    steps = 0
    while True:
        slow = slow.next
        fast = fast.next.next
        steps += 1
        if slow is fast:
            break
    # Cycle length: walk once around the loop from the meeting point.
    length = 1
    node = slow.next
    while node is not slow:
        node = node.next
        length += 1
    # Phase 2: one pointer from the head, one from the meeting point, both 1 step.
    a, b = head, slow
    while a is not b:
        a = a.next
        b = b.next
    return steps, length, a.val
~~~

Walking once around from the meeting node counts λ. For the start: put one pointer at the head, leave the other at the meeting node, and move both one step at a time; they meet exactly at the cycle entry.

## 6. The Code in Python

~~~python
def has_cycle(head):
    """Floyd: slow moves 1, fast moves 2. They meet only if there is a loop."""
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:          # identity, not ==
            return True
    return False                  # fast fell off the end: no cycle
~~~

**Line by line:**

- \`slow = fast = head\` binds both names to the head; the first check happens **after** the first move, otherwise they would "meet" at the start.
- \`while fast is not None and fast.next is not None\`: \`fast\` must be checked first; \`and\` stops early, so \`fast.next\` is never read on \`None\`. If this condition fails, \`fast\` reached the end, and a list with an end has no cycle.
- \`if slow is fast\` compares identity. \`slow.val == fast.val\` would report a false cycle on \`[1, 1]\`.
- No allocation at all: two names, whatever the list length.

## 7. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Floyd and a hash set on cyclic and acyclic lists** prints:

~~~text
[3, 2, 0, -4] pos=1: floyd true, hash set true
[1, 2] pos=0: floyd true, hash set true
[1] pos=-1: floyd false, hash set false
[1] pos=0: floyd true, hash set true
[] pos=-1: floyd false, hash set false
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10] pos=-1: floyd false, hash set false
~~~

**Example 2 — Meeting step, cycle length and cycle start on a 10,000-node list** prints:

~~~text
n=10000 pos=3000: met after 7000 steps, cycle length 7000, cycle starts at index 3000, hash set stored 10000 nodes
n=10 pos=0: met after 10 steps, cycle length 10, cycle starts at index 0, hash set stored 10 nodes
n=6 pos=5: met after 5 steps, cycle length 1, cycle starts at index 5, hash set stored 6 nodes
~~~

**What the numbers show:** Example 1 checks that Floyd and the hash set agree on six inputs: a normal cycle, a two-node loop, a self-loop, an empty list, and two acyclic lists. Example 2 shows the costs and the bonus answers on three cyclic lists: the meeting round is always below μ + λ (7,000 for the 10,000-node list, 10 when the whole list is the loop, 5 for a self-loop at the tail), the loop walk recovers the cycle length, the head-and-meeting-point walk recovers the start index exactly, and the hash set had to store every node.

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Hash set of visited nodes | O(n) average | O(n) | each node is looked up and stored once; Example 2 stored 10,000 nodes |
| Mark nodes in place | O(n) | O(1) | changes the input, usually not allowed |
| Floyd's tortoise and hare | O(n) | O(1) | fewer than μ + λ = n rounds; two pointers only |
| Floyd plus cycle length and start | O(n) | O(1) | at most one extra lap and one extra walk from the head |

For the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 9. Edge Cases

- **Empty list:** \`fast\` is \`None\` at once; no cycle. Example 1 prints \`[] pos=-1: floyd false, hash set false\`.
- **One node, no cycle:** \`fast.next\` is \`None\`; no cycle.
- **One node pointing to itself:** after round 1 both pointers are on it; cycle (\`[1] pos=0\` in Example 1).
- **Two nodes in a loop:** \`[1, 2]\` with the tail linking to the head is a cycle (\`pos=0\` in Example 1).
- **Whole list is the loop** (μ = 0): Example 2's \`n=10 pos=0\` met after 10 rounds, one full lap.
- **Duplicate values:** irrelevant, because nodes are compared by identity, never by value.

## Common Pitfalls

- **Comparing values.** \`slow.val == fast.val\` reports a cycle on \`[1, 1]\`; compare nodes with \`is\`.
- **Checking before moving.** Both start on \`head\`, so \`if slow is fast\` before the first move returns \`True\` for every list.
- **\`fast.next\` before \`fast\` in the loop test.** It raises \`AttributeError\` on even-length acyclic lists.
- **Dataclass nodes in a \`set\`.** A \`@dataclass\` defines \`__eq__\`, which makes instances unhashable (\`TypeError: unhashable type\`), and a value-based hash would confuse equal-valued nodes. Store \`id(node)\` or use Floyd.
- **Printing the list to debug it.** A \`while node:\` print loop on a cyclic list never ends; cap it at a fixed number of nodes.
- **Marking nodes by mutating them.** Setting \`node.visited = True\` or rewiring \`next\` to a sentinel works but destroys the input; say so if you suggest it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Simple answer:</strong> <span style="color:#f0e2c8;">Walk the list with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> of visited nodes; seeing a node twice means a cycle. O(n) time, O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Optimal answer:</strong> <span style="color:#f0e2c8;">Floyd: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> moves 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> moves 2. If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> reaches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> there is no cycle; if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow is fast</code> there is one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why they meet:</strong> <span style="color:#f0e2c8;">Once both are in the loop, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> gains exactly one node per round, so the gap counts down to zero and cannot jump over it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time: they meet within one lap of the loop after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> enters it. O(1) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python details:</strong> <span style="color:#f0e2c8;">Compare nodes with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code>, check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast is not None</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast.next</code>, and remember a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@dataclass</code> node is unhashable in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find where the cycle starts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After they meet, move one pointer back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code> and step both one node at a time; they meet at the entry. Example 2 found index 3000 on a list built with the loop at 3000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the cycle length?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From the meeting node, walk until you return to it, counting steps. Example 2 printed 7000 for a 10,000-node list looping back to index 3000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many rounds can Floyd take?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fewer than tail length plus loop length, so at most about n. The 10,000-node run met after 7,000 rounds.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it without extra memory and without two pointers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only by modifying the list, for example pointing each visited node at a sentinel. It works but destroys the input, so it is rarely acceptable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the list is huge and lives in a database?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Floyd still works with two cursors and constant memory; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> of millions of ids may not fit. That is the practical reason to know it.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cycle (in a linked list)** | following \`next\` returns to a node already visited |
| **Tail length and loop length** | μ nodes before the cycle entry, λ nodes in the loop |
| **Visited set** | a set of processed items used to spot a repeat |
| **Floyd's cycle detection (tortoise and hare)** | one-step and two-step pointers meet only if there is a cycle |
| **Hashable** | can go in a \`set\`: has a stable \`__hash__\` consistent with \`__eq__\` |

---
**Conclusion:** To detect a cycle in a linked list, start with the honest simple answer, a \`set\` of visited nodes (O(n) time, O(n) space), then give Floyd's tortoise and hare: \`slow\` moves one, \`fast\` moves two, and they meet if and only if there is a loop, because the gap shrinks by exactly one per round. That is O(n) time and O(1) space, and two short extra walks give the cycle length and start. In Python, compare nodes with \`is\`, test \`fast is not None\` before \`fast.next\`, and know why a \`@dataclass\` node cannot go into a \`set\`.`,
        examples: [
          { label: `Floyd and a hash set on cyclic and acyclic lists`, code: `class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next


def build(values, pos=-1):
    """Build a list; if pos >= 0 the tail links back to the node at index pos."""
    nodes = [ListNode(v) for v in values]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    if pos >= 0 and nodes:
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None


def has_cycle(head):
    """Floyd: slow moves 1, fast moves 2. They meet only if there is a loop."""
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:          # identity, not ==
            return True
    return False                  # fast fell off the end: no cycle


def has_cycle_set(head):
    """Hash set of visited nodes: simpler, but O(n) extra memory."""
    seen = set()                  # plain objects hash by identity
    node = head
    while node is not None:
        if node in seen:
            return True
        seen.add(node)
        node = node.next
    return False


cases = [([3, 2, 0, -4], 1), ([1, 2], 0), ([1], -1), ([1], 0), ([], -1), (list(range(1, 11)), -1)]
for values, pos in cases:
    head = build(values, pos)
    print(str(values) + " pos=" + str(pos) + ": floyd " + str(has_cycle(head)).lower()
          + ", hash set " + str(has_cycle_set(head)).lower())` },
          { label: `Meeting step, cycle length and cycle start on a 10,000-node list`, code: `class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next


def build_indexed(n, pos):
    """Nodes hold their own index 0..n-1; the tail links back to index pos."""
    nodes = [ListNode(i) for i in range(n)]
    for i in range(n - 1):
        nodes[i].next = nodes[i + 1]
    nodes[-1].next = nodes[pos]
    return nodes[0]


def analyse(head):
    # Phase 1: find a meeting point inside the loop.
    slow = fast = head
    steps = 0
    while True:
        slow = slow.next
        fast = fast.next.next
        steps += 1
        if slow is fast:
            break
    # Cycle length: walk once around the loop from the meeting point.
    length = 1
    node = slow.next
    while node is not slow:
        node = node.next
        length += 1
    # Phase 2: one pointer from the head, one from the meeting point, both 1 step.
    a, b = head, slow
    while a is not b:
        a = a.next
        b = b.next
    return steps, length, a.val


def stored_by_set(head):
    seen = set()
    node = head
    while node not in seen:
        seen.add(node)
        node = node.next
    return len(seen)


for n, pos in [(10000, 3000), (10, 0), (6, 5)]:
    head = build_indexed(n, pos)
    steps, length, start = analyse(head)
    print("n=" + str(n) + " pos=" + str(pos) + ": met after " + str(steps) + " steps, cycle length "
          + str(length) + ", cycle starts at index " + str(start)
          + ", hash set stored " + str(stored_by_set(head)) + " nodes")` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given the head of a linked list, tell me whether it contains a cycle, meaning some node's next pointer leads back to an earlier node. Write it in JavaScript. Can you do it with constant extra memory?"

**What a strong answer should cover:**
- The simple approach: remember visited nodes in a hash set; O(n) time and O(n) space.
- Floyd's tortoise and hare: one pointer moves one step, the other two; they meet if and only if there is a cycle; O(n) time and O(1) space.
- Why they must meet: inside the loop the gap shrinks by exactly one node per round, so it cannot be skipped.
- Comparing node identity, not values, and handling the empty list, one node, and a node that points to itself.
- The follow-ups: cycle length, and where the cycle starts (reset one pointer to the head).
- JavaScript specifics: \`Set\` and \`===\` compare objects by reference, \`null\` checks in the right order, and why \`JSON.stringify\` throws on a cyclic list.

**Clarifying questions expected:**
- "Do you only need true or false, or also where the cycle starts?"
- "May I modify the list (for example mark visited nodes), or must it stay unchanged?"

**Code / implementation expected:** Yes — a JavaScript \`hasCycle(head)\` using Floyd's algorithm, ideally after describing the hash-set version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are following signposts through a huge forest park: each post points to the next one, and the last post should point to the exit. But someone has knocked a post round, and now it points back to a post you passed earlier. If that happened, you will walk in circles for ever, and since every post looks the same, you cannot tell just by looking.

Option one: tie a ribbon on every post you pass. If you ever reach a post that already has your ribbon, you are going in circles. That works, but you need as many ribbons as there are posts.

Option two needs no ribbons. You and a friend set off together; you walk, your friend jogs at twice your speed. If there is an exit, your friend reaches it first and phones you. If there is a loop, your friend goes round it and eventually comes up behind you, and you meet. Meeting is the proof.

A linked list with a bad \`next\` pointer is that forest. Code that walks it, prints it, frees it or counts it will hang or crash. Detecting cycles is also the basis of harder questions, such as [finding where the cycle begins](/interview-question/how-do-you-find-the-node-where-a-linked-list-cycle-begins), and of the same idea on graphs, [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you need only yes or no, or the start of the cycle too? | Floyd answers yes or no; finding the start needs a second phase. |
| Is O(n) extra memory acceptable? | If yes, a hash set is the simplest correct answer; if not, Floyd. |
| May I modify the nodes? | Marking visited nodes in place is O(1) space but destroys the input. |
| Can node values repeat? | They usually can, which is why you must compare node identity, not values. |
| How long can the list be? | Very long lists make the O(n) set expensive and rule out recursion. |

## 3. What a Cycle Looks Like

In a normal list, following \`next\` eventually reaches \`null\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 670 160" role="img" aria-label="The same values without a cycle, the last node points to null">
  <defs>
    <marker id="cyc2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="40" text-anchor="middle">3</text>
  <rect class="d-box" x="170" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="40" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="40" text-anchor="middle">0</text>
  <rect class="d-box" x="430" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="40" text-anchor="middle">-4</text>
  <rect class="d-box-muted" x="560" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="40" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 35 L 164 35" marker-end="url(#cyc2-arrow)"/>
  <path class="d-edge" d="M 244 35 L 294 35" marker-end="url(#cyc2-arrow)"/>
  <path class="d-edge" d="M 374 35 L 424 35" marker-end="url(#cyc2-arrow)"/>
  <path class="d-edge" d="M 504 35 L 554 35" marker-end="url(#cyc2-arrow)"/>
  <path class="d-edge" d="M 75 104 L 75 68" marker-end="url(#cyc2-arrow)"/>
  <text class="d-text" x="75" y="122" text-anchor="middle">head</text>
</svg>

In a list with a cycle, the last node's \`next\` points back to an earlier node instead, so the walk never ends:

<svg class="iq-diagram" width="100%" viewBox="0 0 540 220" role="img" aria-label="The list 3 then 2 then 0 then minus 4, where minus 4 links back to 2, so 2 0 and minus 4 form a loop">
  <defs>
    <marker id="cyc1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="100" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="170" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="100" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="100" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="430" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="100" text-anchor="middle">-4</text>
  <path class="d-edge" d="M 114 95 L 164 95" marker-end="url(#cyc1-arrow)"/>
  <path class="d-edge" d="M 244 95 L 294 95" marker-end="url(#cyc1-arrow)"/>
  <path class="d-edge" d="M 374 95 L 424 95" marker-end="url(#cyc1-arrow)"/>
  <path class="d-edge-accent" d="M 465 66 L 465 30 L 205 30 L 205 64" fill="none" marker-end="url(#cyc1-arrow)"/>
  <text class="d-sub" x="335" y="20" text-anchor="middle">-4 links back to 2</text>
  <path class="d-edge" d="M 75 164 L 75 128" marker-end="url(#cyc1-arrow)"/>
  <text class="d-text" x="75" y="182" text-anchor="middle">head</text>
  <path class="d-edge-accent" d="M 205 164 L 205 128" marker-end="url(#cyc1-arrow)"/>
  <text class="d-text d-accent" x="205" y="182" text-anchor="middle">cycle entry</text>
</svg>

Here \`-4\` links back to \`2\`, so \`2, 0, -4\` repeat for ever. A cyclic list always has this shape: a straight **tail** from the head to the entry (here just node \`3\`), then a **loop**. The tail can be empty (the last node points to the head) and the loop can be a single node pointing to itself.

📌 **Interview term: Cycle (in a linked list)** — a situation where following \`next\` pointers returns to a node already visited, so the walk never reaches the null terminator.

📌 **Interview term: Tail length and loop length** — the number of nodes before the cycle entry (often written μ, "mu") and the number of nodes in the loop (λ, "lambda"); the list has μ + λ nodes.

## 4. Approach 1: Remember Every Node (Hash Set)

Walk the list and keep a set of nodes already visited. If the current node is already in the set, the walk has come back: cycle. If you reach \`null\`, no cycle. A [hash table](/interview-question/how-does-a-hash-table-work) makes each lookup O(1) on average.

~~~javascript
// Set of visited nodes: simpler, but O(n) extra memory.
function hasCycleSet(head) {
  const seen = new Set(); // objects are compared by reference
  for (let node = head; node !== null; node = node.next) {
    if (seen.has(node)) return true;
    seen.add(node);
  }
  return false;
}
~~~

A JavaScript \`Set\` compares objects by **reference** (its equality rule, SameValueZero, treats two objects as equal only when they are the same object), so \`seen.has(node)\` asks "have I seen this exact node?", which is what we need. Two different nodes with the same \`val\` are never confused. A \`WeakSet\` does not save memory here: it only lets entries disappear when nothing else refers to the node, and the list itself refers to every node.

📌 **Interview term: SameValueZero** — the equality rule \`Set\` and \`Map\` use for keys: like \`===\`, except \`NaN\` equals \`NaN\`; objects match only when they are the same object.

This is O(n) time and **O(n) extra memory**: on a 10,000-node list it stored all 10,000 nodes before seeing the repeat (Example 2). It is a fine first answer; then the interviewer asks for O(1) memory.

📌 **Interview term: Visited set** — a set of everything already processed, used to detect a repeat; the standard O(n)-space way to find cycles in lists and graphs.

## 5. Approach 2: Floyd's Tortoise and Hare

Use the [fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique): both pointers start at the head; each round \`slow\` moves one node and \`fast\` moves two.

- **No cycle:** \`fast\` runs off the end (it, or the node after it, is \`null\`). Return false.
- **Cycle:** \`fast\` can never reach an end. Both pointers eventually enter the loop, and from then on, each round \`fast\` gets **exactly one node closer** to \`slow\` (it moves 2, \`slow\` moves 1). The gap goes k, k - 1, ..., 1, 0, so it cannot jump over zero: they land on the same node. Return true.

📌 **Interview term: Floyd's cycle detection (tortoise and hare)** — detect a cycle by moving one pointer one step and another two steps per round; they meet on the same node if and only if there is a cycle. O(n) time, O(1) space.

Dry run on the cyclic list above (\`3, 2, 0, -4\` with \`-4\` linking back to \`2\`):

| Round | \`slow\` on | \`fast\` on | Same node? |
| :--- | :--- | :--- | :--- |
| start | 3 | 3 | (not checked) |
| 1 | 2 | 0 | no |
| 2 | 0 | 2 | no |
| 3 | -4 | -4 | **yes: cycle** |

<svg class="iq-diagram" width="100%" viewBox="0 0 540 250" role="img" aria-label="After three rounds slow and fast both stand on the node minus 4, which proves the cycle">
  <defs>
    <marker id="cyc3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">after round 3</text>
  <rect class="d-box" x="40" y="100" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="130" text-anchor="middle">3</text>
  <rect class="d-box" x="170" y="100" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="130" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="100" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="130" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="430" y="100" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="130" text-anchor="middle">-4</text>
  <path class="d-edge" d="M 114 125 L 164 125" marker-end="url(#cyc3-arrow)"/>
  <path class="d-edge" d="M 244 125 L 294 125" marker-end="url(#cyc3-arrow)"/>
  <path class="d-edge" d="M 374 125 L 424 125" marker-end="url(#cyc3-arrow)"/>
  <path class="d-edge-accent" d="M 465 96 L 465 60 L 205 60 L 205 94" fill="none" marker-end="url(#cyc3-arrow)"/>
  <path class="d-edge-accent" d="M 465 194 L 465 158" marker-end="url(#cyc3-arrow)"/>
  <text class="d-text d-accent" x="465" y="212" text-anchor="middle">slow and fast</text>
</svg>

In round 2 \`fast\` went \`0 -> -4 -> 2\` around the loop, and in round 3 it went \`2 -> 0 -> -4\`, landing on the same node as \`slow\`.

### How many rounds?

\`slow\` enters the loop after μ rounds. From then on \`fast\` closes the gap by one per round and the gap is less than λ, so they meet within λ more rounds: fewer than μ + λ = n rounds in total. Example 2 measured it: on a 10,000-node list whose tail links back to index 3,000 (μ = 3,000, λ = 7,000) they met after 7,000 rounds.

### Bonus: cycle length and cycle start

Once they have met, two more short walks give more information (the full proof is on [the cycle start page](/interview-question/how-do-you-find-the-node-where-a-linked-list-cycle-begins)):

~~~javascript
function analyse(head) {
  // Phase 1: find a meeting point inside the loop.
  let slow = head;
  let fast = head;
  let steps = 0;
  do {
    slow = slow.next;
    fast = fast.next.next;
    steps++;
  } while (slow !== fast);
  // Cycle length: walk once around the loop from the meeting point.
  let length = 1;
  for (let node = slow.next; node !== slow; node = node.next) length++;
  // Phase 2: one pointer from the head, one from the meeting point, both 1 step.
  let a = head;
  let b = slow;
  while (a !== b) {
    a = a.next;
    b = b.next;
  }
  return [steps, length, a.val];
}
~~~

Walking once around from the meeting node counts λ. For the start: put one pointer at the head, leave the other at the meeting node, and move both one step at a time; they meet exactly at the cycle entry.

## 6. The Code in JavaScript

~~~javascript
// Floyd: slow moves 1, fast moves 2. They meet only if there is a loop.
function hasCycle(head) {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true; // same object reference
  }
  return false; // fast fell off the end: no cycle
}
~~~

**Line by line:**

- \`let slow = head; let fast = head;\` the first check happens **after** the first move, otherwise they would "meet" at the start.
- \`while (fast !== null && fast.next !== null)\`: \`fast\` must be checked first; \`&&\` stops early. If this condition fails, \`fast\` reached the end, and a list with an end has no cycle.
- \`slow === fast\` is reference equality on objects: true only for the same node. \`slow.val === fast.val\` would report a false cycle on \`[1, 1]\`.
- No allocation at all: two variables, whatever the list length. (A cyclic list is also why \`JSON.stringify\` on it throws \`TypeError: Converting circular structure to JSON\`, and why Node's \`console.log\` prints \`[Circular *1]\`; both were seen on a two-node cycle here.)

## 7. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Floyd and a hash set on cyclic and acyclic lists** prints:

~~~text
[3, 2, 0, -4] pos=1: floyd true, hash set true
[1, 2] pos=0: floyd true, hash set true
[1] pos=-1: floyd false, hash set false
[1] pos=0: floyd true, hash set true
[] pos=-1: floyd false, hash set false
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10] pos=-1: floyd false, hash set false
~~~

**Example 2 — Meeting step, cycle length and cycle start on a 10,000-node list** prints:

~~~text
n=10000 pos=3000: met after 7000 steps, cycle length 7000, cycle starts at index 3000, hash set stored 10000 nodes
n=10 pos=0: met after 10 steps, cycle length 10, cycle starts at index 0, hash set stored 10 nodes
n=6 pos=5: met after 5 steps, cycle length 1, cycle starts at index 5, hash set stored 6 nodes
~~~

**What the numbers show:** Example 1 checks that Floyd and the hash set agree on six inputs: a normal cycle, a two-node loop, a self-loop, an empty list, and two acyclic lists. Example 2 shows the costs and the bonus answers on three cyclic lists: the meeting round is always below μ + λ (7,000 for the 10,000-node list, 10 when the whole list is the loop, 5 for a self-loop at the tail), the loop walk recovers the cycle length, the head-and-meeting-point walk recovers the start index exactly, and the hash set had to store every node.

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Hash set of visited nodes | O(n) average | O(n) | each node is looked up and stored once; Example 2 stored 10,000 nodes |
| Mark nodes in place | O(n) | O(1) | changes the input, usually not allowed |
| Floyd's tortoise and hare | O(n) | O(1) | fewer than μ + λ = n rounds; two pointers only |
| Floyd plus cycle length and start | O(n) | O(1) | at most one extra lap and one extra walk from the head |

For the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 9. Edge Cases

- **Empty list:** \`fast\` is \`null\` at once; no cycle. Example 1 prints \`[] pos=-1: floyd false, hash set false\`.
- **One node, no cycle:** \`fast.next\` is \`null\`; no cycle.
- **One node pointing to itself:** after round 1 both pointers are on it; cycle (\`[1] pos=0\` in Example 1).
- **Two nodes in a loop:** \`[1, 2]\` with the tail linking to the head is a cycle (\`pos=0\` in Example 1).
- **Whole list is the loop** (μ = 0): Example 2's \`n=10 pos=0\` met after 10 rounds, one full lap.
- **Duplicate values:** irrelevant, because nodes are compared by identity, never by value.

## Common Pitfalls

- **Comparing values.** \`slow.val === fast.val\` reports a cycle on \`[1, 1]\`; compare the node objects.
- **Checking before moving.** Both start on \`head\`, so a check before the first move is always true.
- **\`fast.next\` before \`fast\` in the loop test.** It throws \`TypeError\` on acyclic lists.
- **\`undefined\` ends.** Nodes without an explicit \`next = null\` make \`!== null\` tests pass on \`undefined\`; use \`!= null\` or always set \`null\`.
- **\`JSON.stringify\` to inspect the list.** It throws \`TypeError: Converting circular structure to JSON\` on exactly the inputs you are debugging.
- **Expecting \`WeakSet\` to make the set version O(1) space.** It does not; every node is still referenced by the list.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Simple answer:</strong> <span style="color:#f0e2c8;">Walk the list with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of visited nodes; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> compares objects by reference, so seeing a node twice means a cycle. O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Optimal answer:</strong> <span style="color:#f0e2c8;">Floyd: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> moves 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> moves 2. If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> reaches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> there is no cycle; if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow === fast</code> there is one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why they meet:</strong> <span style="color:#f0e2c8;">Once both are in the loop, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> gains exactly one node per round, so the gap counts down to zero and cannot jump over it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time: they meet within one lap of the loop after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> enters it. O(1) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code> on objects is reference equality, check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast !== null</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast.next</code>, and do not debug with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JSON.stringify</code> on a cyclic list.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find where the cycle starts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After they meet, move one pointer back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code> and step both one node at a time; they meet at the entry. Example 2 found index 3000 on a list built with the loop at 3000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the cycle length?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From the meeting node, walk until you return to it, counting steps. Example 2 printed 7000 for a 10,000-node list looping back to index 3000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">WeakSet</code> make the set version cheaper?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Entries are only dropped when nothing else references the node, and the list references all of them, so it still grows to n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many rounds can Floyd take?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fewer than tail length plus loop length, so at most about n. The 10,000-node run met after 7,000 rounds.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">console.log</code> print a cyclic object?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Node detects the cycle and prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;ref *1&gt;</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[Circular *1]</code> instead of recursing; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JSON.stringify</code> throws instead.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cycle (in a linked list)** | following \`next\` returns to a node already visited |
| **Tail length and loop length** | μ nodes before the cycle entry, λ nodes in the loop |
| **Visited set** | a set of processed items used to spot a repeat |
| **Floyd's cycle detection (tortoise and hare)** | one-step and two-step pointers meet only if there is a cycle |
| **SameValueZero** | the key-equality rule of \`Set\` and \`Map\`; objects match only if they are the same object |

---
**Conclusion:** To detect a cycle in a linked list, start with the honest simple answer, a \`Set\` of visited nodes (O(n) time, O(n) space), then give Floyd's tortoise and hare: \`slow\` moves one, \`fast\` moves two, and they meet if and only if there is a loop, because the gap shrinks by exactly one per round. That is O(n) time and O(1) space, and two short extra walks give the cycle length and start. In JavaScript, rely on reference equality (\`===\`, \`Set\`), test \`fast !== null\` before \`fast.next\`, and do not reach for \`JSON.stringify\` to debug a list that may be cyclic.`,
        examples: [
          { label: `Floyd and a hash set on cyclic and acyclic lists`, code: `class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

// Build a list; if pos >= 0 the tail links back to the node at index pos.
function build(values, pos = -1) {
  const nodes = values.map((v) => new ListNode(v));
  for (let i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1];
  if (pos >= 0 && nodes.length > 0) nodes[nodes.length - 1].next = nodes[pos];
  return nodes.length > 0 ? nodes[0] : null;
}

const fmt = (arr) => '[' + arr.join(', ') + ']';

// Floyd: slow moves 1, fast moves 2. They meet only if there is a loop.
function hasCycle(head) {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true; // same object reference
  }
  return false; // fast fell off the end: no cycle
}

// Set of visited nodes: simpler, but O(n) extra memory.
function hasCycleSet(head) {
  const seen = new Set(); // objects are compared by reference
  for (let node = head; node !== null; node = node.next) {
    if (seen.has(node)) return true;
    seen.add(node);
  }
  return false;
}

const cases = [[[3, 2, 0, -4], 1], [[1, 2], 0], [[1], -1], [[1], 0], [[], -1],
  [Array.from({ length: 10 }, (_, i) => i + 1), -1]];
for (const [values, pos] of cases) {
  const head = build(values, pos);
  console.log(fmt(values) + ' pos=' + pos + ': floyd ' + hasCycle(head) +
    ', hash set ' + hasCycleSet(head));
}` },
          { label: `Meeting step, cycle length and cycle start on a 10,000-node list`, code: `class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

// Nodes hold their own index 0..n-1; the tail links back to index pos.
function buildIndexed(n, pos) {
  const nodes = Array.from({ length: n }, (_, i) => new ListNode(i));
  for (let i = 0; i + 1 < n; i++) nodes[i].next = nodes[i + 1];
  nodes[n - 1].next = nodes[pos];
  return nodes[0];
}

function analyse(head) {
  // Phase 1: find a meeting point inside the loop.
  let slow = head;
  let fast = head;
  let steps = 0;
  do {
    slow = slow.next;
    fast = fast.next.next;
    steps++;
  } while (slow !== fast);
  // Cycle length: walk once around the loop from the meeting point.
  let length = 1;
  for (let node = slow.next; node !== slow; node = node.next) length++;
  // Phase 2: one pointer from the head, one from the meeting point, both 1 step.
  let a = head;
  let b = slow;
  while (a !== b) {
    a = a.next;
    b = b.next;
  }
  return [steps, length, a.val];
}

function storedBySet(head) {
  const seen = new Set();
  let node = head;
  while (!seen.has(node)) {
    seen.add(node);
    node = node.next;
  }
  return seen.size;
}

for (const [n, pos] of [[10000, 3000], [10, 0], [6, 5]]) {
  const head = buildIndexed(n, pos);
  const [steps, length, start] = analyse(head);
  console.log('n=' + n + ' pos=' + pos + ': met after ' + steps + ' steps, cycle length ' + length +
    ', cycle starts at index ' + start + ', hash set stored ' + storedBySet(head) + ' nodes');
}` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given the head of a linked list, tell me whether it contains a cycle, meaning some node's next pointer leads back to an earlier node. Write it in Java. Can you do it with constant extra memory?"

**What a strong answer should cover:**
- The simple approach: remember visited nodes in a hash set; O(n) time and O(n) space.
- Floyd's tortoise and hare: one pointer moves one step, the other two; they meet if and only if there is a cycle; O(n) time and O(1) space.
- Why they must meet: inside the loop the gap shrinks by exactly one node per round, so it cannot be skipped.
- Comparing node identity, not values, and handling the empty list, one node, and a node that points to itself.
- The follow-ups: cycle length, and where the cycle starts (reset one pointer to the head).
- Java specifics: \`==\` versus \`.equals\`, how \`HashSet<ListNode>\` depends on \`Object\` identity \`equals\`/\`hashCode\`, and \`NullPointerException\` from a wrong loop test.

**Clarifying questions expected:**
- "Do you only need true or false, or also where the cycle starts?"
- "May I modify the list (for example mark visited nodes), or must it stay unchanged?"

**Code / implementation expected:** Yes — a Java \`hasCycle(head)\` using Floyd's algorithm, ideally after describing the hash-set version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are following signposts through a huge forest park: each post points to the next one, and the last post should point to the exit. But someone has knocked a post round, and now it points back to a post you passed earlier. If that happened, you will walk in circles for ever, and since every post looks the same, you cannot tell just by looking.

Option one: tie a ribbon on every post you pass. If you ever reach a post that already has your ribbon, you are going in circles. That works, but you need as many ribbons as there are posts.

Option two needs no ribbons. You and a friend set off together; you walk, your friend jogs at twice your speed. If there is an exit, your friend reaches it first and phones you. If there is a loop, your friend goes round it and eventually comes up behind you, and you meet. Meeting is the proof.

A linked list with a bad \`next\` pointer is that forest. Code that walks it, prints it, frees it or counts it will hang or crash. Detecting cycles is also the basis of harder questions, such as [finding where the cycle begins](/interview-question/how-do-you-find-the-node-where-a-linked-list-cycle-begins), and of the same idea on graphs, [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you need only yes or no, or the start of the cycle too? | Floyd answers yes or no; finding the start needs a second phase. |
| Is O(n) extra memory acceptable? | If yes, a hash set is the simplest correct answer; if not, Floyd. |
| May I modify the nodes? | Marking visited nodes in place is O(1) space but destroys the input. |
| Can node values repeat? | They usually can, which is why you must compare node identity, not values. |
| How long can the list be? | Very long lists make the O(n) set expensive and rule out recursion. |

## 3. What a Cycle Looks Like

In a normal list, following \`next\` eventually reaches \`null\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 670 160" role="img" aria-label="The same values without a cycle, the last node points to null">
  <defs>
    <marker id="cyc2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="40" text-anchor="middle">3</text>
  <rect class="d-box" x="170" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="40" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="40" text-anchor="middle">0</text>
  <rect class="d-box" x="430" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="40" text-anchor="middle">-4</text>
  <rect class="d-box-muted" x="560" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="40" text-anchor="middle">null</text>
  <path class="d-edge" d="M 114 35 L 164 35" marker-end="url(#cyc2-arrow)"/>
  <path class="d-edge" d="M 244 35 L 294 35" marker-end="url(#cyc2-arrow)"/>
  <path class="d-edge" d="M 374 35 L 424 35" marker-end="url(#cyc2-arrow)"/>
  <path class="d-edge" d="M 504 35 L 554 35" marker-end="url(#cyc2-arrow)"/>
  <path class="d-edge" d="M 75 104 L 75 68" marker-end="url(#cyc2-arrow)"/>
  <text class="d-text" x="75" y="122" text-anchor="middle">head</text>
</svg>

In a list with a cycle, the last node's \`next\` points back to an earlier node instead, so the walk never ends:

<svg class="iq-diagram" width="100%" viewBox="0 0 540 220" role="img" aria-label="The list 3 then 2 then 0 then minus 4, where minus 4 links back to 2, so 2 0 and minus 4 form a loop">
  <defs>
    <marker id="cyc1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="100" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="170" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="100" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="100" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="430" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="100" text-anchor="middle">-4</text>
  <path class="d-edge" d="M 114 95 L 164 95" marker-end="url(#cyc1-arrow)"/>
  <path class="d-edge" d="M 244 95 L 294 95" marker-end="url(#cyc1-arrow)"/>
  <path class="d-edge" d="M 374 95 L 424 95" marker-end="url(#cyc1-arrow)"/>
  <path class="d-edge-accent" d="M 465 66 L 465 30 L 205 30 L 205 64" fill="none" marker-end="url(#cyc1-arrow)"/>
  <text class="d-sub" x="335" y="20" text-anchor="middle">-4 links back to 2</text>
  <path class="d-edge" d="M 75 164 L 75 128" marker-end="url(#cyc1-arrow)"/>
  <text class="d-text" x="75" y="182" text-anchor="middle">head</text>
  <path class="d-edge-accent" d="M 205 164 L 205 128" marker-end="url(#cyc1-arrow)"/>
  <text class="d-text d-accent" x="205" y="182" text-anchor="middle">cycle entry</text>
</svg>

Here \`-4\` links back to \`2\`, so \`2, 0, -4\` repeat for ever. A cyclic list always has this shape: a straight **tail** from the head to the entry (here just node \`3\`), then a **loop**. The tail can be empty (the last node points to the head) and the loop can be a single node pointing to itself.

📌 **Interview term: Cycle (in a linked list)** — a situation where following \`next\` pointers returns to a node already visited, so the walk never reaches the null terminator.

📌 **Interview term: Tail length and loop length** — the number of nodes before the cycle entry (often written μ, "mu") and the number of nodes in the loop (λ, "lambda"); the list has μ + λ nodes.

## 4. Approach 1: Remember Every Node (Hash Set)

Walk the list and keep a set of nodes already visited. If the current node is already in the set, the walk has come back: cycle. If you reach \`null\`, no cycle. A [hash table](/interview-question/how-does-a-hash-table-work) makes each lookup O(1) on average.

~~~java
// HashSet of visited nodes: simpler, but O(n) extra memory.
static boolean hasCycleSet(ListNode head) {
    Set<ListNode> seen = new HashSet<>();
    for (ListNode node = head; node != null; node = node.next) {
        if (!seen.add(node)) return true; // add returns false if already present
    }
    return false;
}
~~~

\`HashSet<ListNode>\` calls \`hashCode()\` and \`equals()\`. If \`ListNode\` does not override them, it inherits \`Object\`'s identity versions, so the set asks "have I seen this exact node?". \`seen.add(node)\` returns \`false\` when the node is already present, which makes the loop one line. The trap: if someone overrides \`equals\`/\`hashCode\` to compare values, different nodes with equal values look like a revisit; with such an override, the acyclic list \`1 -> 2 -> 1\` was reported as a cycle here (\`value-equals visited set says cycle: true\`). \`Collections.newSetFromMap(new IdentityHashMap<>())\` gives an identity-based set regardless of overrides.

📌 **Interview term: Identity hash** — the \`hashCode()\`/\`equals()\` inherited from \`Object\`, based on which object it is rather than what it contains.

This is O(n) time and **O(n) extra memory**: on a 10,000-node list it stored all 10,000 nodes before seeing the repeat (Example 2). It is a fine first answer; then the interviewer asks for O(1) memory.

📌 **Interview term: Visited set** — a set of everything already processed, used to detect a repeat; the standard O(n)-space way to find cycles in lists and graphs.

## 5. Approach 2: Floyd's Tortoise and Hare

Use the [fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique): both pointers start at the head; each round \`slow\` moves one node and \`fast\` moves two.

- **No cycle:** \`fast\` runs off the end (it, or the node after it, is \`null\`). Return false.
- **Cycle:** \`fast\` can never reach an end. Both pointers eventually enter the loop, and from then on, each round \`fast\` gets **exactly one node closer** to \`slow\` (it moves 2, \`slow\` moves 1). The gap goes k, k - 1, ..., 1, 0, so it cannot jump over zero: they land on the same node. Return true.

📌 **Interview term: Floyd's cycle detection (tortoise and hare)** — detect a cycle by moving one pointer one step and another two steps per round; they meet on the same node if and only if there is a cycle. O(n) time, O(1) space.

Dry run on the cyclic list above (\`3, 2, 0, -4\` with \`-4\` linking back to \`2\`):

| Round | \`slow\` on | \`fast\` on | Same node? |
| :--- | :--- | :--- | :--- |
| start | 3 | 3 | (not checked) |
| 1 | 2 | 0 | no |
| 2 | 0 | 2 | no |
| 3 | -4 | -4 | **yes: cycle** |

<svg class="iq-diagram" width="100%" viewBox="0 0 540 250" role="img" aria-label="After three rounds slow and fast both stand on the node minus 4, which proves the cycle">
  <defs>
    <marker id="cyc3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">after round 3</text>
  <rect class="d-box" x="40" y="100" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="130" text-anchor="middle">3</text>
  <rect class="d-box" x="170" y="100" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="130" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="100" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="130" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="430" y="100" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="130" text-anchor="middle">-4</text>
  <path class="d-edge" d="M 114 125 L 164 125" marker-end="url(#cyc3-arrow)"/>
  <path class="d-edge" d="M 244 125 L 294 125" marker-end="url(#cyc3-arrow)"/>
  <path class="d-edge" d="M 374 125 L 424 125" marker-end="url(#cyc3-arrow)"/>
  <path class="d-edge-accent" d="M 465 96 L 465 60 L 205 60 L 205 94" fill="none" marker-end="url(#cyc3-arrow)"/>
  <path class="d-edge-accent" d="M 465 194 L 465 158" marker-end="url(#cyc3-arrow)"/>
  <text class="d-text d-accent" x="465" y="212" text-anchor="middle">slow and fast</text>
</svg>

In round 2 \`fast\` went \`0 -> -4 -> 2\` around the loop, and in round 3 it went \`2 -> 0 -> -4\`, landing on the same node as \`slow\`.

### How many rounds?

\`slow\` enters the loop after μ rounds. From then on \`fast\` closes the gap by one per round and the gap is less than λ, so they meet within λ more rounds: fewer than μ + λ = n rounds in total. Example 2 measured it: on a 10,000-node list whose tail links back to index 3,000 (μ = 3,000, λ = 7,000) they met after 7,000 rounds.

### Bonus: cycle length and cycle start

Once they have met, two more short walks give more information (the full proof is on [the cycle start page](/interview-question/how-do-you-find-the-node-where-a-linked-list-cycle-begins)):

~~~java
// Returns {steps until meeting, cycle length, index where the cycle starts}.
static int[] analyse(ListNode head) {
    // Phase 1: find a meeting point inside the loop.
    ListNode slow = head, fast = head;
    int steps = 0;
    do {
        slow = slow.next;
        fast = fast.next.next;
        steps++;
    } while (slow != fast);
    // Cycle length: walk once around the loop from the meeting point.
    int length = 1;
    for (ListNode node = slow.next; node != slow; node = node.next) length++;
    // Phase 2: one pointer from the head, one from the meeting point, both 1 step.
    ListNode a = head, b = slow;
    while (a != b) {
        a = a.next;
        b = b.next;
    }
    return new int[]{steps, length, a.val};
}
~~~

Walking once around from the meeting node counts λ. For the start: put one pointer at the head, leave the other at the meeting node, and move both one step at a time; they meet exactly at the cycle entry.

## 6. The Code in Java

~~~java
// Floyd: slow moves 1, fast moves 2. They meet only if there is a loop.
static boolean hasCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true; // reference equality
    }
    return false; // fast fell off the end: no cycle
}
~~~

**Line by line:**

- \`ListNode slow = head, fast = head;\` the first check happens **after** the first move, otherwise they would "meet" at the start.
- \`while (fast != null && fast.next != null)\`: \`fast\` must be checked first; \`&&\` short-circuits. If this condition fails, \`fast\` reached the end, and a list with an end has no cycle.
- \`slow == fast\` compares references: true only for the same node, whatever \`equals\` says.
- No allocation at all: two references, whatever the list length, and nothing for the garbage collector to do.

## 7. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Floyd and a hash set on cyclic and acyclic lists** prints:

~~~text
[3, 2, 0, -4] pos=1: floyd true, hash set true
[1, 2] pos=0: floyd true, hash set true
[1] pos=-1: floyd false, hash set false
[1] pos=0: floyd true, hash set true
[] pos=-1: floyd false, hash set false
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10] pos=-1: floyd false, hash set false
~~~

**Example 2 — Meeting step, cycle length and cycle start on a 10,000-node list** prints:

~~~text
n=10000 pos=3000: met after 7000 steps, cycle length 7000, cycle starts at index 3000, hash set stored 10000 nodes
n=10 pos=0: met after 10 steps, cycle length 10, cycle starts at index 0, hash set stored 10 nodes
n=6 pos=5: met after 5 steps, cycle length 1, cycle starts at index 5, hash set stored 6 nodes
~~~

**What the numbers show:** Example 1 checks that Floyd and the hash set agree on six inputs: a normal cycle, a two-node loop, a self-loop, an empty list, and two acyclic lists. Example 2 shows the costs and the bonus answers on three cyclic lists: the meeting round is always below μ + λ (7,000 for the 10,000-node list, 10 when the whole list is the loop, 5 for a self-loop at the tail), the loop walk recovers the cycle length, the head-and-meeting-point walk recovers the start index exactly, and the hash set had to store every node.

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Hash set of visited nodes | O(n) average | O(n) | each node is looked up and stored once; Example 2 stored 10,000 nodes |
| Mark nodes in place | O(n) | O(1) | changes the input, usually not allowed |
| Floyd's tortoise and hare | O(n) | O(1) | fewer than μ + λ = n rounds; two pointers only |
| Floyd plus cycle length and start | O(n) | O(1) | at most one extra lap and one extra walk from the head |

For the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 9. Edge Cases

- **Empty list:** \`fast\` is \`null\` at once; no cycle. Example 1 prints \`[] pos=-1: floyd false, hash set false\`.
- **One node, no cycle:** \`fast.next\` is \`null\`; no cycle.
- **One node pointing to itself:** after round 1 both pointers are on it; cycle (\`[1] pos=0\` in Example 1).
- **Two nodes in a loop:** \`[1, 2]\` with the tail linking to the head is a cycle (\`pos=0\` in Example 1).
- **Whole list is the loop** (μ = 0): Example 2's \`n=10 pos=0\` met after 10 rounds, one full lap.
- **Duplicate values:** irrelevant, because nodes are compared by identity, never by value.

## Common Pitfalls

- **Comparing with \`.equals\` or values.** A value-based \`equals\` makes different nodes look the same; use \`==\` for Floyd and identity semantics for the set.
- **Checking before moving.** Both start on \`head\`, so a check before the first move is always true.
- **\`fast.next\` before \`fast\` in the loop test.** It throws \`NullPointerException\` on acyclic lists.
- **Overriding \`hashCode\` with mutable fields.** If \`hashCode\` used \`val\` and a node's value changed while in the \`HashSet\`, the set could no longer find it.
- **\`toString()\` on a cyclic list.** A recursive \`toString\` that prints \`val + next\` recurses for ever and ends in \`StackOverflowError\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Simple answer:</strong> <span style="color:#f0e2c8;">Walk the list with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet&lt;ListNode&gt;</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen.add(node)</code> returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> means a cycle. O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Optimal answer:</strong> <span style="color:#f0e2c8;">Floyd: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> moves 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> moves 2. If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> reaches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> there is no cycle; if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow == fast</code> there is one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why they meet:</strong> <span style="color:#f0e2c8;">Once both are in the loop, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> gains exactly one node per round, so the gap counts down to zero and cannot jump over it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time: they meet within one lap of the loop after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> enters it. O(1) extra space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> is reference equality, which is right; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet</code> version silently breaks if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode</code> overrides <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code> by value.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find where the cycle starts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After they meet, move one reference back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code> and step both one node at a time; they meet at the entry. Example 2 found index 3000 on a list built with the loop at 3000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the cycle length?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From the meeting node, walk until you return to it, counting steps. Example 2 printed 7000 for a 10,000-node list looping back to index 3000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ListNode</code> overrides <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">equals</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Floyd is unaffected because it uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>. For the set version use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.newSetFromMap(new IdentityHashMap&lt;&gt;())</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many rounds can Floyd take?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fewer than tail length plus loop length, so at most about n. The 10,000-node run met after 7,000 rounds.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does this show up in real Java code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Any structure that follows references, such as a parent chain or a serializer walking an object graph, needs cycle protection; serializers usually keep an identity map of visited objects.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cycle (in a linked list)** | following \`next\` returns to a node already visited |
| **Tail length and loop length** | μ nodes before the cycle entry, λ nodes in the loop |
| **Visited set** | a set of processed items used to spot a repeat |
| **Floyd's cycle detection (tortoise and hare)** | one-step and two-step pointers meet only if there is a cycle |
| **Identity hash** | \`Object\`'s \`equals\`/\`hashCode\`, based on which object it is |

---
**Conclusion:** To detect a cycle in a linked list, start with the honest simple answer, a \`HashSet<ListNode>\` of visited nodes (O(n) time, O(n) space), then give Floyd's tortoise and hare: \`slow\` moves one, \`fast\` moves two, and they meet if and only if there is a loop, because the gap shrinks by exactly one per round. That is O(n) time and O(1) space, and two short extra walks give the cycle length and start. In Java, compare with \`==\`, test \`fast != null\` before \`fast.next\`, and remember that the set version depends on \`ListNode\` keeping identity \`equals\`/\`hashCode\`.`,
        examples: [
          { label: `Floyd and a hash set on cyclic and acyclic lists`, code: `import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
        // No equals/hashCode override: HashSet uses identity, which is what we want.
    }

    // Build a list; if pos >= 0 the tail links back to the node at index pos.
    static ListNode build(int[] values, int pos) {
        if (values.length == 0) return null;
        ListNode[] nodes = new ListNode[values.length];
        for (int i = 0; i < values.length; i++) nodes[i] = new ListNode(values[i]);
        for (int i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1];
        if (pos >= 0) nodes[nodes.length - 1].next = nodes[pos];
        return nodes[0];
    }

    // Floyd: slow moves 1, fast moves 2. They meet only if there is a loop.
    static boolean hasCycle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true; // reference equality
        }
        return false; // fast fell off the end: no cycle
    }

    // HashSet of visited nodes: simpler, but O(n) extra memory.
    static boolean hasCycleSet(ListNode head) {
        Set<ListNode> seen = new HashSet<>();
        for (ListNode node = head; node != null; node = node.next) {
            if (!seen.add(node)) return true; // add returns false if already present
        }
        return false;
    }

    public static void main(String[] args) {
        int[][] values = {{3, 2, 0, -4}, {1, 2}, {1}, {1}, {}, {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}};
        int[] pos = {1, 0, -1, 0, -1, -1};
        for (int i = 0; i < values.length; i++) {
            ListNode head = build(values[i], pos[i]);
            System.out.println(Arrays.toString(values[i]) + " pos=" + pos[i] + ": floyd " + hasCycle(head)
                    + ", hash set " + hasCycleSet(head));
        }
    }
}` },
          { label: `Meeting step, cycle length and cycle start on a 10,000-node list`, code: `import java.util.HashSet;
import java.util.Set;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    // Nodes hold their own index 0..n-1; the tail links back to index pos.
    static ListNode buildIndexed(int n, int pos) {
        ListNode[] nodes = new ListNode[n];
        for (int i = 0; i < n; i++) nodes[i] = new ListNode(i);
        for (int i = 0; i + 1 < n; i++) nodes[i].next = nodes[i + 1];
        nodes[n - 1].next = nodes[pos];
        return nodes[0];
    }

    // Returns {steps until meeting, cycle length, index where the cycle starts}.
    static int[] analyse(ListNode head) {
        // Phase 1: find a meeting point inside the loop.
        ListNode slow = head, fast = head;
        int steps = 0;
        do {
            slow = slow.next;
            fast = fast.next.next;
            steps++;
        } while (slow != fast);
        // Cycle length: walk once around the loop from the meeting point.
        int length = 1;
        for (ListNode node = slow.next; node != slow; node = node.next) length++;
        // Phase 2: one pointer from the head, one from the meeting point, both 1 step.
        ListNode a = head, b = slow;
        while (a != b) {
            a = a.next;
            b = b.next;
        }
        return new int[]{steps, length, a.val};
    }

    static int storedBySet(ListNode head) {
        Set<ListNode> seen = new HashSet<>();
        ListNode node = head;
        while (seen.add(node)) node = node.next;
        return seen.size();
    }

    public static void main(String[] args) {
        int[][] cases = {{10000, 3000}, {10, 0}, {6, 5}};
        for (int[] c : cases) {
            ListNode head = buildIndexed(c[0], c[1]);
            int[] r = analyse(head);
            System.out.println("n=" + c[0] + " pos=" + c[1] + ": met after " + r[0] + " steps, cycle length " + r[1]
                    + ", cycle starts at index " + r[2] + ", hash set stored " + storedBySet(head) + " nodes");
        }
    }
}` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given the head of a linked list, tell me whether it contains a cycle, meaning some node's next pointer leads back to an earlier node. Write it in C++. Can you do it with constant extra memory?"

**What a strong answer should cover:**
- The simple approach: remember visited nodes in a hash set; O(n) time and O(n) space.
- Floyd's tortoise and hare: one pointer moves one step, the other two; they meet if and only if there is a cycle; O(n) time and O(1) space.
- Why they must meet: inside the loop the gap shrinks by exactly one node per round, so it cannot be skipped.
- Comparing node identity, not values, and handling the empty list, one node, and a node that points to itself.
- The follow-ups: cycle length, and where the cycle starts (reset one pointer to the head).
- C++ specifics: comparing \`ListNode*\` addresses, \`unordered_set<const ListNode*>\`, short-circuit order, and freeing nodes safely when the list contains a cycle.

**Clarifying questions expected:**
- "Do you only need true or false, or also where the cycle starts?"
- "May I modify the list (for example mark visited nodes), or must it stay unchanged?"

**Code / implementation expected:** Yes — a C++ \`hasCycle(head)\` using Floyd's algorithm, ideally after describing the hash-set version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — no prior algorithms knowledge assumed
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are following signposts through a huge forest park: each post points to the next one, and the last post should point to the exit. But someone has knocked a post round, and now it points back to a post you passed earlier. If that happened, you will walk in circles for ever, and since every post looks the same, you cannot tell just by looking.

Option one: tie a ribbon on every post you pass. If you ever reach a post that already has your ribbon, you are going in circles. That works, but you need as many ribbons as there are posts.

Option two needs no ribbons. You and a friend set off together; you walk, your friend jogs at twice your speed. If there is an exit, your friend reaches it first and phones you. If there is a loop, your friend goes round it and eventually comes up behind you, and you meet. Meeting is the proof.

A linked list with a bad \`next\` pointer is that forest. Code that walks it, prints it, frees it or counts it will hang or crash. Detecting cycles is also the basis of harder questions, such as [finding where the cycle begins](/interview-question/how-do-you-find-the-node-where-a-linked-list-cycle-begins), and of the same idea on graphs, [detecting a cycle in a directed graph](/interview-question/how-do-you-detect-a-cycle-in-a-directed-graph).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do you need only yes or no, or the start of the cycle too? | Floyd answers yes or no; finding the start needs a second phase. |
| Is O(n) extra memory acceptable? | If yes, a hash set is the simplest correct answer; if not, Floyd. |
| May I modify the nodes? | Marking visited nodes in place is O(1) space but destroys the input. |
| Can node values repeat? | They usually can, which is why you must compare node identity, not values. |
| How long can the list be? | Very long lists make the O(n) set expensive and rule out recursion. |

## 3. What a Cycle Looks Like

In a normal list, following \`next\` eventually reaches \`nullptr\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 670 160" role="img" aria-label="The same values without a cycle, the last node points to nullptr">
  <defs>
    <marker id="cyc2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="40" text-anchor="middle">3</text>
  <rect class="d-box" x="170" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="40" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="40" text-anchor="middle">0</text>
  <rect class="d-box" x="430" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="40" text-anchor="middle">-4</text>
  <rect class="d-box-muted" x="560" y="10" width="70" height="50" rx="6"/>
  <text class="d-text" x="595" y="40" text-anchor="middle">nullptr</text>
  <path class="d-edge" d="M 114 35 L 164 35" marker-end="url(#cyc2-arrow)"/>
  <path class="d-edge" d="M 244 35 L 294 35" marker-end="url(#cyc2-arrow)"/>
  <path class="d-edge" d="M 374 35 L 424 35" marker-end="url(#cyc2-arrow)"/>
  <path class="d-edge" d="M 504 35 L 554 35" marker-end="url(#cyc2-arrow)"/>
  <path class="d-edge" d="M 75 104 L 75 68" marker-end="url(#cyc2-arrow)"/>
  <text class="d-text" x="75" y="122" text-anchor="middle">head</text>
</svg>

In a list with a cycle, the last node's \`next\` points back to an earlier node instead, so the walk never ends:

<svg class="iq-diagram" width="100%" viewBox="0 0 540 220" role="img" aria-label="The list 3 then 2 then 0 then minus 4, where minus 4 links back to 2, so 2 0 and minus 4 form a loop">
  <defs>
    <marker id="cyc1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="100" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="170" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="100" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="300" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="100" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="430" y="70" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="100" text-anchor="middle">-4</text>
  <path class="d-edge" d="M 114 95 L 164 95" marker-end="url(#cyc1-arrow)"/>
  <path class="d-edge" d="M 244 95 L 294 95" marker-end="url(#cyc1-arrow)"/>
  <path class="d-edge" d="M 374 95 L 424 95" marker-end="url(#cyc1-arrow)"/>
  <path class="d-edge-accent" d="M 465 66 L 465 30 L 205 30 L 205 64" fill="none" marker-end="url(#cyc1-arrow)"/>
  <text class="d-sub" x="335" y="20" text-anchor="middle">-4 links back to 2</text>
  <path class="d-edge" d="M 75 164 L 75 128" marker-end="url(#cyc1-arrow)"/>
  <text class="d-text" x="75" y="182" text-anchor="middle">head</text>
  <path class="d-edge-accent" d="M 205 164 L 205 128" marker-end="url(#cyc1-arrow)"/>
  <text class="d-text d-accent" x="205" y="182" text-anchor="middle">cycle entry</text>
</svg>

Here \`-4\` links back to \`2\`, so \`2, 0, -4\` repeat for ever. A cyclic list always has this shape: a straight **tail** from the head to the entry (here just node \`3\`), then a **loop**. The tail can be empty (the last node points to the head) and the loop can be a single node pointing to itself.

📌 **Interview term: Cycle (in a linked list)** — a situation where following \`next\` pointers returns to a node already visited, so the walk never reaches the null terminator.

📌 **Interview term: Tail length and loop length** — the number of nodes before the cycle entry (often written μ, "mu") and the number of nodes in the loop (λ, "lambda"); the list has μ + λ nodes.

## 4. Approach 1: Remember Every Node (Hash Set)

Walk the list and keep a set of nodes already visited. If the current node is already in the set, the walk has come back: cycle. If you reach \`nullptr\`, no cycle. A [hash table](/interview-question/how-does-a-hash-table-work) makes each lookup O(1) on average.

~~~cpp
// Set of visited node addresses: simpler, but O(n) extra memory.
bool hasCycleSet(ListNode* head) {
    std::unordered_set<const ListNode*> seen;
    for (ListNode* node = head; node != nullptr; node = node->next) {
        if (!seen.insert(node).second) return true; // insert reports false if already there
    }
    return false;
}
~~~

\`std::unordered_set<const ListNode*>\` stores node **addresses**, and \`std::hash\` for pointers hashes the address, so the set asks "have I seen this exact node?". \`seen.insert(node).second\` is \`false\` when the address was already there, which makes the loop one line. Never key the set on \`val\`: different nodes can hold the same value.

📌 **Interview term: Address identity** — two \`ListNode*\` are equal exactly when they point at the same node; comparing pointers never looks at the values inside.

This is O(n) time and **O(n) extra memory**: on a 10,000-node list it stored all 10,000 nodes before seeing the repeat (Example 2). It is a fine first answer; then the interviewer asks for O(1) memory.

📌 **Interview term: Visited set** — a set of everything already processed, used to detect a repeat; the standard O(n)-space way to find cycles in lists and graphs.

## 5. Approach 2: Floyd's Tortoise and Hare

Use the [fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique): both pointers start at the head; each round \`slow\` moves one node and \`fast\` moves two.

- **No cycle:** \`fast\` runs off the end (it, or the node after it, is \`nullptr\`). Return false.
- **Cycle:** \`fast\` can never reach an end. Both pointers eventually enter the loop, and from then on, each round \`fast\` gets **exactly one node closer** to \`slow\` (it moves 2, \`slow\` moves 1). The gap goes k, k - 1, ..., 1, 0, so it cannot jump over zero: they land on the same node. Return true.

📌 **Interview term: Floyd's cycle detection (tortoise and hare)** — detect a cycle by moving one pointer one step and another two steps per round; they meet on the same node if and only if there is a cycle. O(n) time, O(1) space.

Dry run on the cyclic list above (\`3, 2, 0, -4\` with \`-4\` linking back to \`2\`):

| Round | \`slow\` on | \`fast\` on | Same node? |
| :--- | :--- | :--- | :--- |
| start | 3 | 3 | (not checked) |
| 1 | 2 | 0 | no |
| 2 | 0 | 2 | no |
| 3 | -4 | -4 | **yes: cycle** |

<svg class="iq-diagram" width="100%" viewBox="0 0 540 250" role="img" aria-label="After three rounds slow and fast both stand on the node minus 4, which proves the cycle">
  <defs>
    <marker id="cyc3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="40" y="26">after round 3</text>
  <rect class="d-box" x="40" y="100" width="70" height="50" rx="6"/>
  <text class="d-text" x="75" y="130" text-anchor="middle">3</text>
  <rect class="d-box" x="170" y="100" width="70" height="50" rx="6"/>
  <text class="d-text" x="205" y="130" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="100" width="70" height="50" rx="6"/>
  <text class="d-text" x="335" y="130" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="430" y="100" width="70" height="50" rx="6"/>
  <text class="d-text" x="465" y="130" text-anchor="middle">-4</text>
  <path class="d-edge" d="M 114 125 L 164 125" marker-end="url(#cyc3-arrow)"/>
  <path class="d-edge" d="M 244 125 L 294 125" marker-end="url(#cyc3-arrow)"/>
  <path class="d-edge" d="M 374 125 L 424 125" marker-end="url(#cyc3-arrow)"/>
  <path class="d-edge-accent" d="M 465 96 L 465 60 L 205 60 L 205 94" fill="none" marker-end="url(#cyc3-arrow)"/>
  <path class="d-edge-accent" d="M 465 194 L 465 158" marker-end="url(#cyc3-arrow)"/>
  <text class="d-text d-accent" x="465" y="212" text-anchor="middle">slow and fast</text>
</svg>

In round 2 \`fast\` went \`0 -> -4 -> 2\` around the loop, and in round 3 it went \`2 -> 0 -> -4\`, landing on the same node as \`slow\`.

### How many rounds?

\`slow\` enters the loop after μ rounds. From then on \`fast\` closes the gap by one per round and the gap is less than λ, so they meet within λ more rounds: fewer than μ + λ = n rounds in total. Example 2 measured it: on a 10,000-node list whose tail links back to index 3,000 (μ = 3,000, λ = 7,000) they met after 7,000 rounds.

### Bonus: cycle length and cycle start

Once they have met, two more short walks give more information (the full proof is on [the cycle start page](/interview-question/how-do-you-find-the-node-where-a-linked-list-cycle-begins)):

~~~cpp
Analysis analyse(ListNode* head) {
    // Phase 1: find a meeting point inside the loop.
    ListNode* slow = head;
    ListNode* fast = head;
    int steps = 0;
    do {
        slow = slow->next;
        fast = fast->next->next;
        ++steps;
    } while (slow != fast);
    // Cycle length: walk once around the loop from the meeting point.
    int length = 1;
    for (ListNode* node = slow->next; node != slow; node = node->next) ++length;
    // Phase 2: one pointer from the head, one from the meeting point, both 1 step.
    ListNode* a = head;
    ListNode* b = slow;
    while (a != b) {
        a = a->next;
        b = b->next;
    }
    return {steps, length, a->val};
}
~~~

Walking once around from the meeting node counts λ. For the start: put one pointer at the head, leave the other at the meeting node, and move both one step at a time; they meet exactly at the cycle entry.

## 6. The Code in C++

~~~cpp
// Floyd: slow moves 1, fast moves 2. They meet only if there is a loop.
bool hasCycle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true; // same address
    }
    return false; // fast fell off the end: no cycle
}
~~~

**Line by line:**

- \`ListNode* slow = head; ListNode* fast = head;\` the first check happens **after** the first move, otherwise they would "meet" at the start.
- \`while (fast != nullptr && fast->next != nullptr)\`: \`fast\` must be checked first; \`&&\` short-circuits, so \`fast->next\` is never evaluated on a null pointer. If this fails, \`fast\` reached the end: no cycle.
- \`slow == fast\` compares addresses.
- No allocation at all. Note that a cyclic list cannot be freed with the usual "save next, \`delete\` current" walk, because the walk comes back to a node it already deleted; the examples keep all nodes in a \`std::vector<std::unique_ptr<ListNode>>\` pool, which frees each exactly once.

## 7. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the other three languages on this page and printed exactly the same lines.

**Example 1 — Floyd and a hash set on cyclic and acyclic lists** prints:

~~~text
[3, 2, 0, -4] pos=1: floyd true, hash set true
[1, 2] pos=0: floyd true, hash set true
[1] pos=-1: floyd false, hash set false
[1] pos=0: floyd true, hash set true
[] pos=-1: floyd false, hash set false
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10] pos=-1: floyd false, hash set false
~~~

**Example 2 — Meeting step, cycle length and cycle start on a 10,000-node list** prints:

~~~text
n=10000 pos=3000: met after 7000 steps, cycle length 7000, cycle starts at index 3000, hash set stored 10000 nodes
n=10 pos=0: met after 10 steps, cycle length 10, cycle starts at index 0, hash set stored 10 nodes
n=6 pos=5: met after 5 steps, cycle length 1, cycle starts at index 5, hash set stored 6 nodes
~~~

**What the numbers show:** Example 1 checks that Floyd and the hash set agree on six inputs: a normal cycle, a two-node loop, a self-loop, an empty list, and two acyclic lists. Example 2 shows the costs and the bonus answers on three cyclic lists: the meeting round is always below μ + λ (7,000 for the 10,000-node list, 10 when the whole list is the loop, 5 for a self-loop at the tail), the loop walk recovers the cycle length, the head-and-meeting-point walk recovers the start index exactly, and the hash set had to store every node.

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Hash set of visited nodes | O(n) average | O(n) | each node is looked up and stored once; Example 2 stored 10,000 nodes |
| Mark nodes in place | O(n) | O(1) | changes the input, usually not allowed |
| Floyd's tortoise and hare | O(n) | O(1) | fewer than μ + λ = n rounds; two pointers only |
| Floyd plus cycle length and start | O(n) | O(1) | at most one extra lap and one extra walk from the head |

For the notation, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 9. Edge Cases

- **Empty list:** \`fast\` is \`nullptr\` at once; no cycle. Example 1 prints \`[] pos=-1: floyd false, hash set false\`.
- **One node, no cycle:** \`fast->next\` is \`nullptr\`; no cycle.
- **One node pointing to itself:** after round 1 both pointers are on it; cycle (\`[1] pos=0\` in Example 1).
- **Two nodes in a loop:** \`[1, 2]\` with the tail linking to the head is a cycle (\`pos=0\` in Example 1).
- **Whole list is the loop** (μ = 0): Example 2's \`n=10 pos=0\` met after 10 rounds, one full lap.
- **Duplicate values:** irrelevant, because nodes are compared by identity, never by value.

## Common Pitfalls

- **Comparing values.** \`slow->val == fast->val\` reports a cycle on \`[1, 1]\`; compare the pointers.
- **Checking before moving.** Both start on \`head\`, so a check before the first move is always true.
- **\`fast->next\` before \`fast\` in the loop test.** Dereferencing \`nullptr\` is undefined behaviour.
- **Freeing a cyclic list with a plain walk.** The walk returns to an already deleted node: use-after-free and a double free. Break the cycle first, or let an owning container free the nodes.
- **Keying the set on values.** \`std::unordered_set<int>\` of \`val\` confuses different nodes with equal values; key on \`const ListNode*\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Simple answer:</strong> <span style="color:#f0e2c8;">Walk the list with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::unordered_set&lt;const ListNode*&gt;</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert(node).second == false</code> means a cycle. O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Optimal answer:</strong> <span style="color:#f0e2c8;">Floyd: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> moves 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> moves 2. If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> reaches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code> there is no cycle; if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow == fast</code> there is one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why they meet:</strong> <span style="color:#f0e2c8;">Once both are in the loop, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> gains exactly one node per round, so the gap counts down to zero and cannot jump over it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n) time: they meet within one lap of the loop after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> enters it. O(1) extra space and no allocation.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ details:</strong> <span style="color:#f0e2c8;">Compare addresses, keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast != nullptr &amp;&amp; fast-&gt;next != nullptr</code> in that order, and never free a cyclic list with a naive delete loop.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find where the cycle starts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After they meet, move one pointer back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code> and step both one node at a time; they meet at the entry. Example 2 found index 3000 on a list built with the loop at 3000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the cycle length?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From the meeting node, walk until you return to it, counting steps. Example 2 printed 7000 for a 10,000-node list looping back to index 3000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you free a list that might be cyclic?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Find the cycle entry, cut the link from the last loop node to it, then delete normally; or own the nodes in a container such as a vector of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unique_ptr</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many rounds can Floyd take?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fewer than tail length plus loop length, so at most about n. The 10,000-node run met after 7,000 rounds.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">shared_ptr</code> nodes form a cycle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, and then the reference counts never reach zero, so the nodes leak. That is why owning pointers in a list usually go one way, or a back link uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">weak_ptr</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cycle (in a linked list)** | following \`next\` returns to a node already visited |
| **Tail length and loop length** | μ nodes before the cycle entry, λ nodes in the loop |
| **Visited set** | a set of processed items used to spot a repeat |
| **Floyd's cycle detection (tortoise and hare)** | one-step and two-step pointers meet only if there is a cycle |
| **Address identity** | two pointers are equal only when they point at the same node |

---
**Conclusion:** To detect a cycle in a linked list, start with the honest simple answer, an \`unordered_set\` of visited node addresses (O(n) time, O(n) space), then give Floyd's tortoise and hare: \`slow\` moves one, \`fast\` moves two, and they meet if and only if there is a loop, because the gap shrinks by exactly one per round. That is O(n) time, O(1) space and no allocation, and two short extra walks give the cycle length and start. In C++, compare addresses, keep the short-circuit order that avoids dereferencing \`nullptr\`, and plan how a possibly cyclic list will be freed.`,
        examples: [
          { label: `Floyd and a hash set on cyclic and acyclic lists`, code: `#include <iostream>
#include <memory>
#include <string>
#include <unordered_set>
#include <utility>
#include <vector>

struct ListNode {
    int val;
    ListNode* next;
    explicit ListNode(int v) : val(v), next(nullptr) {}
};

std::vector<std::unique_ptr<ListNode>> pool; // owns every node, even nodes in a cycle

// Build a list; if pos >= 0 the tail links back to the node at index pos.
ListNode* build(const std::vector<int>& values, int pos) {
    std::vector<ListNode*> nodes;
    for (int v : values) {
        pool.push_back(std::make_unique<ListNode>(v));
        nodes.push_back(pool.back().get());
    }
    for (size_t i = 0; i + 1 < nodes.size(); ++i) nodes[i]->next = nodes[i + 1];
    if (pos >= 0 && !nodes.empty()) nodes.back()->next = nodes[pos];
    return nodes.empty() ? nullptr : nodes[0];
}

std::string fmt(const std::vector<int>& v) {
    std::string s = "[";
    for (size_t i = 0; i < v.size(); ++i) s += (i ? ", " : "") + std::to_string(v[i]);
    return s + "]";
}

// Floyd: slow moves 1, fast moves 2. They meet only if there is a loop.
bool hasCycle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true; // same address
    }
    return false; // fast fell off the end: no cycle
}

// Set of visited node addresses: simpler, but O(n) extra memory.
bool hasCycleSet(ListNode* head) {
    std::unordered_set<const ListNode*> seen;
    for (ListNode* node = head; node != nullptr; node = node->next) {
        if (!seen.insert(node).second) return true; // insert reports false if already there
    }
    return false;
}

int main() {
    std::cout << std::boolalpha;
    std::vector<std::pair<std::vector<int>, int>> cases = {
        {{3, 2, 0, -4}, 1}, {{1, 2}, 0}, {{1}, -1}, {{1}, 0}, {{}, -1},
        {{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, -1}};
    for (const auto& [values, pos] : cases) {
        ListNode* head = build(values, pos);
        std::cout << fmt(values) << " pos=" << pos << ": floyd " << hasCycle(head)
                  << ", hash set " << hasCycleSet(head) << "\\n";
    }
}` },
          { label: `Meeting step, cycle length and cycle start on a 10,000-node list`, code: `#include <iostream>
#include <memory>
#include <unordered_set>
#include <vector>

struct ListNode {
    int val;
    ListNode* next;
    explicit ListNode(int v) : val(v), next(nullptr) {}
};

std::vector<std::unique_ptr<ListNode>> pool; // owns every node, even nodes in a cycle

// Nodes hold their own index 0..n-1; the tail links back to index pos.
ListNode* buildIndexed(int n, int pos) {
    std::vector<ListNode*> nodes;
    for (int i = 0; i < n; ++i) {
        pool.push_back(std::make_unique<ListNode>(i));
        nodes.push_back(pool.back().get());
    }
    for (int i = 0; i + 1 < n; ++i) nodes[i]->next = nodes[i + 1];
    nodes[n - 1]->next = nodes[pos];
    return nodes[0];
}

struct Analysis { int steps; int length; int start; };

Analysis analyse(ListNode* head) {
    // Phase 1: find a meeting point inside the loop.
    ListNode* slow = head;
    ListNode* fast = head;
    int steps = 0;
    do {
        slow = slow->next;
        fast = fast->next->next;
        ++steps;
    } while (slow != fast);
    // Cycle length: walk once around the loop from the meeting point.
    int length = 1;
    for (ListNode* node = slow->next; node != slow; node = node->next) ++length;
    // Phase 2: one pointer from the head, one from the meeting point, both 1 step.
    ListNode* a = head;
    ListNode* b = slow;
    while (a != b) {
        a = a->next;
        b = b->next;
    }
    return {steps, length, a->val};
}

size_t storedBySet(ListNode* head) {
    std::unordered_set<const ListNode*> seen;
    ListNode* node = head;
    while (seen.insert(node).second) node = node->next;
    return seen.size();
}

int main() {
    int cases[3][2] = {{10000, 3000}, {10, 0}, {6, 5}};
    for (auto& c : cases) {
        ListNode* head = buildIndexed(c[0], c[1]);
        Analysis r = analyse(head);
        std::cout << "n=" << c[0] << " pos=" << c[1] << ": met after " << r.steps << " steps, cycle length "
                  << r.length << ", cycle starts at index " << r.start << ", hash set stored "
                  << storedBySet(head) << " nodes\\n";
    }
}` },
        ],
      },
    },
  },
];

export default augments;
