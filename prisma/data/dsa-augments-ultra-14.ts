/**
 * DSA ULTRA — batch 14: linked lists. One complete answer per language (Python,
 * JavaScript, Java, C++). Every example was run with python3 / node /
 * javac+java / g++ -std=c++17 by scripts/verify-dsa-examples.ts and the
 * quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  {
    title: `How do you find the node where a linked list cycle begins?`,
    difficulty: "medium",
    seoDescription: `Find where a linked list cycle begins in Python, JavaScript, Java and C++: Floyd fast and slow pointers, the mu and lambda proof, O(1) space.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You are given the head of a singly linked list that may contain a cycle. Return the node where the cycle begins, or None if there is no cycle. Can you do it without extra memory? Please write it in Python."

**What a strong answer should cover:**
- A hash-set baseline (first node seen twice is the entry), O(n) time and O(n) space.
- Floyd's tortoise and hare: slow moves 1, fast moves 2; when they meet, restart one pointer at the head and move both by 1 until they meet at the entry.
- Why phase 2 works: the meeting distance is a multiple of the cycle length, so mu more steps from the meeting point land on the entry. O(n) time, O(1) space.
- Edge cases: empty list, single node with and without a self-loop, cycle back to the head, duplicate values.
- Python specifics: compare nodes with \`is\`, not \`==\`; a plain class hashes by identity so \`set()\` works, but a \`@dataclass\` node defines \`__eq__\` and becomes unhashable.

**Clarifying questions expected:**
- "Return the node, or an index? What if there is no cycle?"
- "Is O(n) extra memory allowed, and may I modify the list?"

**Code / implementation expected:** Yes — \`detect_cycle(head)\` in Python with two pointers and no extra data structures.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture a jogging track shaped like the letter P. You enter at the bottom of the straight stem, run up it, and then you are on a loop that never lets you out. Two friends start at the entrance together: one jogs, the other runs exactly twice as fast. Because the loop has no exit, the fast runner eventually laps the slow one and they bump into each other somewhere on the loop.

Now the clever part. The moment they meet, the slow friend walks back to the entrance, and both friends move at **the same** walking pace. They meet again, and this time it is exactly at the gate where the stem joins the loop. Nobody needed a map, a notebook or a count of the laps.

A linked list with a cycle is that track. Each node points to the next one, and the last node points back to some earlier node instead of to nothing. The warm-up question, [detecting a cycle in a linked list](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list), only asks *whether* the track has a loop. This question asks for the **gate**: the first node that is part of the loop. It is a favourite medium question because the code is short but the reason it works is a small, elegant proof that interviewers like to hear you explain.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Should I return the node itself, or its index or value? | The classic version returns the node (a reference). Values can repeat, so a value does not identify the gate. |
| What do I return when there is no cycle? | Usually null / None / nullptr. Agree on it so the caller can tell the two cases apart. |
| May I modify the list (mark nodes, break links)? | Marking or rewiring is a trick that works, but it destroys the input. Floyd leaves the list untouched. |
| Is O(n) extra memory acceptable? | A hash set of visited nodes is simplest; the follow-up is almost always "now do it in O(1) space". |
| Can the list be empty, or a single node pointing to itself? | Both are legal inputs and are where off-by-one bugs hide. |

## 3. The Core Idea

📌 **Interview term: Cycle in a linked list** — following \`next\` pointers never reaches the end, because some node's \`next\` points back to a node that was already visited.

📌 **Interview term: Cycle entry (cycle start)** — the first node of the loop: the only node in the loop that is also reachable from outside it. Its index equals the position the tail points back to.

<svg class="iq-diagram" width="100%" viewBox="0 0 560 250" role="img" aria-label="Linked list 3 to 2 to 0 to minus 4, the tail points back to the node with value 2, which is where the cycle begins">
  <defs>
    <marker id="lc1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="70" y="34" text-anchor="middle">head</text>
  <path class="d-edge" d="M 70 42 L 70 60" fill="none" marker-end="url(#lc1-arrow)"/>
  <rect class="d-box" x="40" y="66" width="70" height="46" rx="8"/>
  <text class="d-text" x="75" y="95" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="170" y="66" width="70" height="46" rx="8"/>
  <text class="d-text" x="205" y="95" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="66" width="70" height="46" rx="8"/>
  <text class="d-text" x="335" y="95" text-anchor="middle">0</text>
  <rect class="d-box" x="430" y="66" width="70" height="46" rx="8"/>
  <text class="d-text" x="465" y="95" text-anchor="middle">-4</text>
  <path class="d-edge" d="M 112 89 L 164 89" fill="none" marker-end="url(#lc1-arrow)"/>
  <path class="d-edge" d="M 242 89 L 294 89" fill="none" marker-end="url(#lc1-arrow)"/>
  <path class="d-edge" d="M 372 89 L 424 89" fill="none" marker-end="url(#lc1-arrow)"/>
  <text class="d-text d-accent" x="205" y="50" text-anchor="middle">cycle start</text>
  <path class="d-edge-accent" d="M 465 114 C 465 200, 205 200, 205 120" fill="none" marker-end="url(#lc1-arrow)"/>
  <text class="d-sub" x="335" y="222" text-anchor="middle">tail points back</text>
</svg>

In this list the tail (-4) points back to the node holding 2, so the answer is that node (index 1). Walking from the head you see 3, 2, 0, -4, 2, 0, -4, ... forever.

### Approach 1: remember every node (hash set)

Walk the list and put every node you visit into a set. The first node that is **already in the set** is where the loop closes back on itself, which is exactly the cycle entry. If you reach the end (null), there is no cycle.

📌 **Interview term: Reference identity** — two variables are "the same node" only if they refer to the same object in memory, not merely to nodes with equal values. The set must compare nodes by identity.

This is O(n) time but O(n) extra memory.

### Approach 2: Floyd's tortoise and hare (O(1) memory)

📌 **Interview term: Floyd's cycle-finding algorithm (tortoise and hare)** — two pointers start at the head; \`slow\` moves one node per step and \`fast\` moves two. If there is a cycle they must meet inside it; if \`fast\` reaches the end, there is none. This is the [fast and slow pointers](/interview-question/what-is-the-fast-and-slow-pointer-technique) pattern.

Then **phase 2**: put one pointer back at the head, leave the other at the meeting point, and move both **one** step at a time. The node where they meet is the cycle entry.

## 4. Why Phase 2 Lands Exactly on the Entry

Name the two lengths of the "P" shape:

📌 **Interview term: mu (μ)** — the number of steps from the head to the cycle entry (the tail before the loop).

📌 **Interview term: lambda (λ)** — the number of nodes in the loop (the cycle length).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 320" role="img" aria-label="Rho shape: mu steps from head to the cycle start, then the meeting point is k steps into the loop, and lambda minus k steps remain back to the start">
  <defs>
    <marker id="lc2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="137" width="80" height="46" rx="8"/>
  <text class="d-text" x="70" y="166" text-anchor="middle">head</text>
  <path class="d-edge" d="M 112 160 L 318 160" fill="none" marker-end="url(#lc2-arrow)"/>
  <text class="d-sub" x="215" y="142" text-anchor="middle">mu steps</text>
  <path class="d-edge-accent" d="M 330 160 A 110 110 0 0 1 550 160" fill="none" marker-end="url(#lc2-arrow)"/>
  <path class="d-edge-dashed" d="M 550 160 A 110 110 0 0 1 330 160" fill="none" marker-end="url(#lc2-arrow)"/>
  <circle class="d-box-accent" cx="330" cy="160" r="9"/>
  <circle class="d-box-accent" cx="550" cy="160" r="9"/>
  <text class="d-text d-accent" x="330" y="198" text-anchor="middle">cycle start</text>
  <text class="d-text d-accent" x="550" y="198" text-anchor="middle">meeting point</text>
  <text class="d-sub" x="440" y="32" text-anchor="middle">k steps</text>
  <text class="d-sub" x="440" y="304" text-anchor="middle">lambda minus k steps</text>
</svg>

Say the pointers meet \`k\` steps past the entry. When they meet, slow has taken \`d\` steps in total, so \`d = mu + k + (some whole laps)\`. Fast took \`2d\` steps on the same track. The extra \`d\` steps that fast walked are spent going round the loop, so **\`d\` is a whole number of laps: a multiple of lambda**.

Now walk \`mu\` more steps from the meeting point. You will have walked \`k + mu\` steps past the entry in total, and \`d = mu + k + laps\` is a multiple of lambda, so \`k + mu\` is also a multiple of lambda: you are **back at the entry**. Meanwhile the pointer that restarted at the head also needs exactly \`mu\` steps to reach the entry. Both arrive at the same node on the same step, and that is the first moment they share a node.

Two facts you can check in the run output below rather than take on trust: phase 2 always takes exactly \`mu\` steps, and phase 1 ends after the smallest multiple of lambda that is at least \`mu\` (and at least 1).

📌 **Interview term: Rho shape** — the picture of a list with a cycle: a straight tail ending in a loop, like the Greek letter ρ. People use it when explaining Floyd.

## 5. The Solution in Python

A node is a tiny class with \`val\` and \`next\`. Example 1 also has a \`build(values, pos)\` helper that links the nodes and points the tail back to index \`pos\` (the usual LeetCode convention, \`-1\` meaning no cycle).

~~~python
def detect_cycle(head):
    """Floyd: return the node where the cycle begins, or None."""
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:              # phase 1: they met inside the loop
            slow = head               # phase 2: restart one pointer at the head
            while slow is not fast:
                slow = slow.next
                fast = fast.next
            return slow
    return None
~~~

**Why each line is there:**

- \`while fast and fast.next\` — fast jumps two nodes, so both \`fast\` and \`fast.next\` must exist. If either is \`None\` the list has an end, so there is no cycle. This one condition also covers an empty list (\`head\` is \`None\`).
- The meeting check comes **after** moving. Both pointers start at the head, so checking first would "meet" immediately.
- \`slow is fast\` compares **identity**. \`==\` on a plain class also falls back to identity, but \`is\` says what you mean and keeps working if someone later adds an \`__eq__\` that compares values.
- Phase 2 moves both pointers by one; the loop exits on the entry node, which is returned.

### The hash-set version

~~~python
def hash_start(head):
    seen = set()
    node = head
    while node:
        if node in seen:
            return node
        seen.add(node)
        node = node.next
    return None
~~~

A plain class without \`__eq__\` is hashed by identity, so \`set()\` stores nodes, not values. In a test run, two \`ListNode(1)\` objects compared \`False\` with both \`==\` and \`is\`, and a set of the two had length \`2\`. The trap is a \`@dataclass\` node: dataclasses generate \`__eq__\`, which sets \`__hash__\` to \`None\`, and putting one in a set raised \`TypeError: unhashable type: 'D'\`. Even if you made it hashable, value equality would merge different nodes holding equal values.

## 6. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Floyd on lists with and without a cycle** prints:

~~~text
[3, 2, 0, -4], tail -> 1: cycle starts at index 1 (value 2)
[1, 2], tail -> 0: cycle starts at index 0 (value 1)
[1], tail -> -1: no cycle
[1], tail -> 0: cycle starts at index 0 (value 1)
[], tail -> -1: no cycle
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], tail -> 7: cycle starts at index 7 (value 8)
[5, 5, 5, 5], tail -> 2: cycle starts at index 2 (value 5)
~~~

**Example 2 — Phase step counts, and Floyd versus a hash set** prints:

~~~text
n=10 pos=3: mu=3 lambda=7, met at index 7 after 7 steps, phase 2 took 3 steps, entry index 3
n=10 pos=0: mu=0 lambda=10, met at index 0 after 10 steps, phase 2 took 0 steps, entry index 0
n=10 pos=9: mu=9 lambda=1, met at index 9 after 9 steps, phase 2 took 9 steps, entry index 9
n=6 pos=2: mu=2 lambda=4, met at index 4 after 4 steps, phase 2 took 2 steps, entry index 2
n=100 pos=40: mu=40 lambda=60, met at index 60 after 60 steps, phase 2 took 40 steps, entry index 40
Floyd and the hash set agree on 495 of 495 lists
~~~

**Reading the output:** in the first block, "[5, 5, 5, 5], tail -> 2" finds index 2 even though every value is 5, which is why the function returns a node, not a value. In the second block, "phase 2 took" always equals mu (the \`pos\` the tail points to), and the meeting index varies: for n=10, pos=3 the pointers meet at index 7 after 7 steps (one lap of 7, the smallest multiple of lambda that is at least mu), and for n=100, pos=40 they meet at index 60 after 60 steps (one lap of 60). The last line runs both algorithms on every list of length 1 to 30, with and without a cycle, and they pick the same node every time.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Hash set of visited nodes | O(n) | O(n) | every node is inserted once; the first repeat is the entry |
| Floyd, phase 1 | O(n) | O(1) | slow takes at most mu + lambda steps before fast catches it |
| Floyd, phase 2 | O(n) | O(1) | exactly mu steps |
| Mark visited nodes in place | O(n) | O(1) | fast, but it destroys the list (or needs a spare field) |

n is the number of nodes, mu + lambda. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.


In Python both versions are O(n) time; the hash set also stores one reference per node (plus the set's own table), which is what Floyd avoids.

## 8. Edge Cases

- **Empty list:** no cycle; the loop condition fails immediately.
- **One node, next is null:** no cycle.
- **One node pointing to itself:** mu = 0, lambda = 1; the answer is the head.
- **Cycle back to the head** (pos = 0): mu = 0; phase 2 takes zero steps because the pointers already meet at the head.
- **Tail points to itself** (pos = n - 1): the loop is one node long; the answer is the tail.
- **Duplicate values:** compare nodes, never values.

## Common Pitfalls

- **Checking \`slow is fast\` before the first move.** Both start at \`head\`, so the loop reports a meeting at once and returns the head for every list.
- **Testing only \`fast.next\`.** \`while fast.next:\` raises \`AttributeError: 'NoneType' object has no attribute 'next'\` on an empty list or after \`fast\` steps past the end; test \`fast and fast.next\`.
- **Comparing values.** \`slow.val == fast.val\` gives wrong answers as soon as values repeat (the \`[5, 5, 5, 5]\` case above). Compare nodes with \`is\`.
- **A \`@dataclass\` node in a set.** It is unhashable by default and, worse, would compare by value. Use a plain class, or \`id(node)\` as the set key.
- **Restarting the wrong pointer, or moving fast by two in phase 2.** Phase 2 is one pointer from the head and one from the meeting point, both moving one step.
- **Printing a cyclic list.** A \`__repr__\` that walks \`next\` until \`None\` never ends; print a bounded number of nodes.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> of visited nodes: the first node already in the set is the entry. O(n) time, O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Phase 1:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> moves 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> moves 2, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while fast and fast.next</code>; if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow is fast</code> they met inside the loop.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Phase 2:</strong> <span style="color:#f0e2c8;">Reset <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow = head</code>, move both by 1; where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow is fast</code> again is the entry. If fast hit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why it works:</strong> <span style="color:#f0e2c8;">When they meet, slow has walked a multiple of the loop length, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mu</code> more steps from the meeting point land on the entry, exactly when the head pointer gets there.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Compare nodes with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code>; plain objects hash by identity, but a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@dataclass</code> node is unhashable and compares by value.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must fast move exactly two steps?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Any speed difference finds a meeting, but with speeds 1 and 2 the gap closes by exactly one node per step, so fast can never jump over slow, and the meeting distance is a multiple of lambda, which is what makes phase 2 land on the entry.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the cycle length?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After the meeting, keep one pointer still and walk the other until it comes back, counting steps: that count is lambda. O(lambda) extra time, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the hash-set version need <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">id(node)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for a plain class: it hashes by identity already. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">id(node)</code> if the node class defines <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code>, because then the default hash is gone.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the worst case for phase 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Slow enters the loop after mu steps and fast catches it within one more lap, so at most mu + lambda steps: O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it by modifying the list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, for example by pointing each visited node at a sentinel, but it destroys the input; say so and prefer Floyd unless the interviewer allows it.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cycle in a linked list** | following next pointers never reaches the end |
| **Cycle entry** | the first node of the loop; where the tail points back to |
| **Reference identity** | same object in memory, not just equal values |
| **Floyd's cycle-finding algorithm** | slow moves 1, fast moves 2; they meet inside a cycle |
| **mu (μ)** | steps from the head to the cycle entry |
| **lambda (λ)** | number of nodes in the loop |
| **Rho shape** | tail plus loop, the shape of a list with a cycle |
| **\`is\` (Python)** | identity comparison: the same object, not equal values |

---
**Conclusion:** Finding where a cycle begins is two passes of the same idea: a fast and a slow pointer meet inside the loop, then one restarts from the head and both walk at the same speed until they meet at the entry. The proof is one line, the meeting distance is a multiple of the loop length, so mu more steps from the meeting point lands on the entry. It is O(n) time and O(1) space, against the O(n) space of a hash set. In Python the code is ten lines; the marks are in the \`while fast and fast.next\` guard, comparing nodes with \`is\`, and knowing why a \`@dataclass\` node breaks the set version.`,
        examples: [
          { label: `Floyd on lists with and without a cycle`, code: `class ListNode:
    def __init__(self, val):
        self.val = val
        self.next = None


def build(values, pos):
    """Linked list from values; the tail points back to index pos (-1 = no cycle)."""
    nodes = [ListNode(v) for v in values]
    for a, b in zip(nodes, nodes[1:]):
        a.next = b
    if nodes and pos >= 0:
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None


def detect_cycle(head):
    """Floyd: return the node where the cycle begins, or None."""
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:              # phase 1: they met inside the loop
            slow = head               # phase 2: restart one pointer at the head
            while slow is not fast:
                slow = slow.next
                fast = fast.next
            return slow
    return None


def index_of(head, target):
    i, node = 0, head
    while node is not target:
        node = node.next
        i += 1
    return i


def fmt(values):
    return "[" + ", ".join(str(v) for v in values) + "]"


def describe(values, pos):
    head = build(values, pos)
    start = detect_cycle(head)
    label = fmt(values) + ", tail -> " + str(pos) + ": "
    if start is None:
        return label + "no cycle"
    return label + "cycle starts at index " + str(index_of(head, start)) + " (value " + str(start.val) + ")"


print(describe([3, 2, 0, -4], 1))  # [3, 2, 0, -4], tail -> 1: cycle starts at index 1 (value 2)
print(describe([1, 2], 0))  # [1, 2], tail -> 0: cycle starts at index 0 (value 1)
print(describe([1], -1))  # [1], tail -> -1: no cycle
print(describe([1], 0))  # [1], tail -> 0: cycle starts at index 0 (value 1)
print(describe([], -1))  # [], tail -> -1: no cycle
print(describe([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 7))  # [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], tail -> 7: cycle starts at index 7 (value 8)
print(describe([5, 5, 5, 5], 2))  # [5, 5, 5, 5], tail -> 2: cycle starts at index 2 (value 5)
` },
          { label: `Phase step counts, and Floyd versus a hash set`, code: `class ListNode:
    def __init__(self, val):
        self.val = val
        self.next = None


def build(values, pos):
    """Linked list from values; the tail points back to index pos (-1 = no cycle)."""
    nodes = [ListNode(v) for v in values]
    for a, b in zip(nodes, nodes[1:]):
        a.next = b
    if nodes and pos >= 0:
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None


def detect_cycle(head):
    """Floyd: return the node where the cycle begins, or None."""
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:              # phase 1: they met inside the loop
            slow = head               # phase 2: restart one pointer at the head
            while slow is not fast:
                slow = slow.next
                fast = fast.next
            return slow
    return None


def index_of(head, target):
    i, node = 0, head
    while node is not target:
        node = node.next
        i += 1
    return i


def floyd_trace(head):
    """Floyd again, counting the steps of each phase."""
    slow = fast = head
    phase1 = 0
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        phase1 += 1
        if slow is fast:
            meet = slow
            slow, phase2 = head, 0
            while slow is not fast:
                slow = slow.next
                fast = fast.next
                phase2 += 1
            return slow, meet, phase1, phase2
    return None, None, phase1, 0


def hash_start(head):
    """O(n)-space version: the first node seen twice is the entry."""
    seen = set()
    node = head
    while node:
        if node in seen:
            return node
        seen.add(node)
        node = node.next
    return None


for n, pos in [(10, 3), (10, 0), (10, 9), (6, 2), (100, 40)]:
    head = build(list(range(n)), pos)
    start, meet, p1, p2 = floyd_trace(head)
    print("n=" + str(n) + " pos=" + str(pos) + ": mu=" + str(pos) + " lambda=" + str(n - pos)
          + ", met at index " + str(index_of(head, meet)) + " after " + str(p1)
          + " steps, phase 2 took " + str(p2) + " steps, entry index " + str(index_of(head, start)))

agree = total = 0
for n in range(1, 31):
    for pos in range(-1, n):
        head = build(list(range(n)), pos)
        total += 1
        if detect_cycle(head) is hash_start(head):
            agree += 1
print("Floyd and the hash set agree on " + str(agree) + " of " + str(total) + " lists")
` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given the head of a singly linked list that may contain a cycle. Return the node where the cycle begins, or null if there is no cycle, ideally in constant extra memory. Please write it in JavaScript."

**What a strong answer should cover:**
- A \`Set\` baseline (first node seen twice is the entry), O(n) time and O(n) space.
- Floyd's tortoise and hare: slow moves 1, fast moves 2; on meeting, restart one pointer at the head and move both by 1 until they meet at the entry.
- Why phase 2 works: the meeting distance is a multiple of the cycle length, so mu more steps from the meeting point land on the entry. O(n) time, O(1) space.
- Edge cases: empty list, one node with a self-loop, cycle back to the head, duplicate values.
- JavaScript specifics: compare nodes with \`===\` (reference equality); a \`Set\` of objects keys by reference; a plain object cannot be used as a set of nodes because its keys become strings.

**Clarifying questions expected:**
- "Return the node itself, or an index? null when there is no cycle?"
- "Is O(n) extra memory allowed, and may I modify the list?"

**Code / implementation expected:** Yes — \`detectCycle(head)\` in JavaScript with two pointers.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture a jogging track shaped like the letter P. You enter at the bottom of the straight stem, run up it, and then you are on a loop that never lets you out. Two friends start at the entrance together: one jogs, the other runs exactly twice as fast. Because the loop has no exit, the fast runner eventually laps the slow one and they bump into each other somewhere on the loop.

Now the clever part. The moment they meet, the slow friend walks back to the entrance, and both friends move at **the same** walking pace. They meet again, and this time it is exactly at the gate where the stem joins the loop. Nobody needed a map, a notebook or a count of the laps.

A linked list with a cycle is that track. Each node points to the next one, and the last node points back to some earlier node instead of to nothing. The warm-up question, [detecting a cycle in a linked list](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list), only asks *whether* the track has a loop. This question asks for the **gate**: the first node that is part of the loop. It is a favourite medium question because the code is short but the reason it works is a small, elegant proof that interviewers like to hear you explain.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Should I return the node itself, or its index or value? | The classic version returns the node (a reference). Values can repeat, so a value does not identify the gate. |
| What do I return when there is no cycle? | Usually null / None / nullptr. Agree on it so the caller can tell the two cases apart. |
| May I modify the list (mark nodes, break links)? | Marking or rewiring is a trick that works, but it destroys the input. Floyd leaves the list untouched. |
| Is O(n) extra memory acceptable? | A hash set of visited nodes is simplest; the follow-up is almost always "now do it in O(1) space". |
| Can the list be empty, or a single node pointing to itself? | Both are legal inputs and are where off-by-one bugs hide. |

## 3. The Core Idea

📌 **Interview term: Cycle in a linked list** — following \`next\` pointers never reaches the end, because some node's \`next\` points back to a node that was already visited.

📌 **Interview term: Cycle entry (cycle start)** — the first node of the loop: the only node in the loop that is also reachable from outside it. Its index equals the position the tail points back to.

<svg class="iq-diagram" width="100%" viewBox="0 0 560 250" role="img" aria-label="Linked list 3 to 2 to 0 to minus 4, the tail points back to the node with value 2, which is where the cycle begins">
  <defs>
    <marker id="lc1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="70" y="34" text-anchor="middle">head</text>
  <path class="d-edge" d="M 70 42 L 70 60" fill="none" marker-end="url(#lc1-arrow)"/>
  <rect class="d-box" x="40" y="66" width="70" height="46" rx="8"/>
  <text class="d-text" x="75" y="95" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="170" y="66" width="70" height="46" rx="8"/>
  <text class="d-text" x="205" y="95" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="66" width="70" height="46" rx="8"/>
  <text class="d-text" x="335" y="95" text-anchor="middle">0</text>
  <rect class="d-box" x="430" y="66" width="70" height="46" rx="8"/>
  <text class="d-text" x="465" y="95" text-anchor="middle">-4</text>
  <path class="d-edge" d="M 112 89 L 164 89" fill="none" marker-end="url(#lc1-arrow)"/>
  <path class="d-edge" d="M 242 89 L 294 89" fill="none" marker-end="url(#lc1-arrow)"/>
  <path class="d-edge" d="M 372 89 L 424 89" fill="none" marker-end="url(#lc1-arrow)"/>
  <text class="d-text d-accent" x="205" y="50" text-anchor="middle">cycle start</text>
  <path class="d-edge-accent" d="M 465 114 C 465 200, 205 200, 205 120" fill="none" marker-end="url(#lc1-arrow)"/>
  <text class="d-sub" x="335" y="222" text-anchor="middle">tail points back</text>
</svg>

In this list the tail (-4) points back to the node holding 2, so the answer is that node (index 1). Walking from the head you see 3, 2, 0, -4, 2, 0, -4, ... forever.

### Approach 1: remember every node (hash set)

Walk the list and put every node you visit into a set. The first node that is **already in the set** is where the loop closes back on itself, which is exactly the cycle entry. If you reach the end (null), there is no cycle.

📌 **Interview term: Reference identity** — two variables are "the same node" only if they refer to the same object in memory, not merely to nodes with equal values. The set must compare nodes by identity.

This is O(n) time but O(n) extra memory.

### Approach 2: Floyd's tortoise and hare (O(1) memory)

📌 **Interview term: Floyd's cycle-finding algorithm (tortoise and hare)** — two pointers start at the head; \`slow\` moves one node per step and \`fast\` moves two. If there is a cycle they must meet inside it; if \`fast\` reaches the end, there is none. This is the [fast and slow pointers](/interview-question/what-is-the-fast-and-slow-pointer-technique) pattern.

Then **phase 2**: put one pointer back at the head, leave the other at the meeting point, and move both **one** step at a time. The node where they meet is the cycle entry.

## 4. Why Phase 2 Lands Exactly on the Entry

Name the two lengths of the "P" shape:

📌 **Interview term: mu (μ)** — the number of steps from the head to the cycle entry (the tail before the loop).

📌 **Interview term: lambda (λ)** — the number of nodes in the loop (the cycle length).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 320" role="img" aria-label="Rho shape: mu steps from head to the cycle start, then the meeting point is k steps into the loop, and lambda minus k steps remain back to the start">
  <defs>
    <marker id="lc2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="137" width="80" height="46" rx="8"/>
  <text class="d-text" x="70" y="166" text-anchor="middle">head</text>
  <path class="d-edge" d="M 112 160 L 318 160" fill="none" marker-end="url(#lc2-arrow)"/>
  <text class="d-sub" x="215" y="142" text-anchor="middle">mu steps</text>
  <path class="d-edge-accent" d="M 330 160 A 110 110 0 0 1 550 160" fill="none" marker-end="url(#lc2-arrow)"/>
  <path class="d-edge-dashed" d="M 550 160 A 110 110 0 0 1 330 160" fill="none" marker-end="url(#lc2-arrow)"/>
  <circle class="d-box-accent" cx="330" cy="160" r="9"/>
  <circle class="d-box-accent" cx="550" cy="160" r="9"/>
  <text class="d-text d-accent" x="330" y="198" text-anchor="middle">cycle start</text>
  <text class="d-text d-accent" x="550" y="198" text-anchor="middle">meeting point</text>
  <text class="d-sub" x="440" y="32" text-anchor="middle">k steps</text>
  <text class="d-sub" x="440" y="304" text-anchor="middle">lambda minus k steps</text>
</svg>

Say the pointers meet \`k\` steps past the entry. When they meet, slow has taken \`d\` steps in total, so \`d = mu + k + (some whole laps)\`. Fast took \`2d\` steps on the same track. The extra \`d\` steps that fast walked are spent going round the loop, so **\`d\` is a whole number of laps: a multiple of lambda**.

Now walk \`mu\` more steps from the meeting point. You will have walked \`k + mu\` steps past the entry in total, and \`d = mu + k + laps\` is a multiple of lambda, so \`k + mu\` is also a multiple of lambda: you are **back at the entry**. Meanwhile the pointer that restarted at the head also needs exactly \`mu\` steps to reach the entry. Both arrive at the same node on the same step, and that is the first moment they share a node.

Two facts you can check in the run output below rather than take on trust: phase 2 always takes exactly \`mu\` steps, and phase 1 ends after the smallest multiple of lambda that is at least \`mu\` (and at least 1).

📌 **Interview term: Rho shape** — the picture of a list with a cycle: a straight tail ending in a loop, like the Greek letter ρ. People use it when explaining Floyd.

## 5. The Solution in JavaScript

A node is a small class with \`val\` and \`next\`. The examples also use \`build(values, pos)\`, which links the nodes and points the tail back to index \`pos\` (\`-1\` meaning no cycle).

~~~javascript
// Floyd: return the node where the cycle begins, or null.
function detectCycle(head) {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) {          // phase 1: they met inside the loop
      slow = head;                // phase 2: restart one pointer at the head
      while (slow !== fast) {
        slow = slow.next;
        fast = fast.next;
      }
      return slow;
    }
  }
  return null;
}
~~~

**Why each line is there:**

- \`fast !== null && fast.next !== null\` — fast jumps two nodes, so both must exist; reaching \`null\` means the list ends and there is no cycle. It also handles \`head === null\`.
- The meeting check comes **after** moving; both pointers start on the head.
- \`slow === fast\` is **reference equality** for objects: true only when both variables point at the same node object. Two \`new ListNode(1)\` objects are never \`===\`.
- Phase 2 moves both by one and returns the node where they meet.

### The Set version

~~~javascript
function hashStart(head) {
  const seen = new Set();
  for (let node = head; node !== null; node = node.next) {
    if (seen.has(node)) return node;
    seen.add(node);
  }
  return null;
}
~~~

A \`Set\` compares keys with the SameValueZero rule, which for objects means "same reference" ([MDN: Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)). In a test run, a set holding two separate \`ListNode(1)\` objects had size \`2\`. A plain object \`{}\` used as a "seen" map would not work: every node key is converted to the same string \`"[object Object]"\`.

If the list is very long, prefer this loop (or Floyd) over recursion: a recursive walk of a long list ended in \`RangeError: Maximum call stack size exceeded\` when tried in Node.

## 6. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Floyd on lists with and without a cycle** prints:

~~~text
[3, 2, 0, -4], tail -> 1: cycle starts at index 1 (value 2)
[1, 2], tail -> 0: cycle starts at index 0 (value 1)
[1], tail -> -1: no cycle
[1], tail -> 0: cycle starts at index 0 (value 1)
[], tail -> -1: no cycle
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], tail -> 7: cycle starts at index 7 (value 8)
[5, 5, 5, 5], tail -> 2: cycle starts at index 2 (value 5)
~~~

**Example 2 — Phase step counts, and Floyd versus a hash set** prints:

~~~text
n=10 pos=3: mu=3 lambda=7, met at index 7 after 7 steps, phase 2 took 3 steps, entry index 3
n=10 pos=0: mu=0 lambda=10, met at index 0 after 10 steps, phase 2 took 0 steps, entry index 0
n=10 pos=9: mu=9 lambda=1, met at index 9 after 9 steps, phase 2 took 9 steps, entry index 9
n=6 pos=2: mu=2 lambda=4, met at index 4 after 4 steps, phase 2 took 2 steps, entry index 2
n=100 pos=40: mu=40 lambda=60, met at index 60 after 60 steps, phase 2 took 40 steps, entry index 40
Floyd and the hash set agree on 495 of 495 lists
~~~

**Reading the output:** in the first block, "[5, 5, 5, 5], tail -> 2" finds index 2 even though every value is 5, which is why the function returns a node, not a value. In the second block, "phase 2 took" always equals mu (the \`pos\` the tail points to), and the meeting index varies: for n=10, pos=3 the pointers meet at index 7 after 7 steps (one lap of 7, the smallest multiple of lambda that is at least mu), and for n=100, pos=40 they meet at index 60 after 60 steps (one lap of 60). The last line runs both algorithms on every list of length 1 to 30, with and without a cycle, and they pick the same node every time.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Hash set of visited nodes | O(n) | O(n) | every node is inserted once; the first repeat is the entry |
| Floyd, phase 1 | O(n) | O(1) | slow takes at most mu + lambda steps before fast catches it |
| Floyd, phase 2 | O(n) | O(1) | exactly mu steps |
| Mark visited nodes in place | O(n) | O(1) | fast, but it destroys the list (or needs a spare field) |

n is the number of nodes, mu + lambda. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.


In JavaScript the \`Set\` version stores one reference per node; the engine's hash table adds its own overhead on top, which Floyd avoids entirely.

## 8. Edge Cases

- **Empty list:** no cycle; the loop condition fails immediately.
- **One node, next is null:** no cycle.
- **One node pointing to itself:** mu = 0, lambda = 1; the answer is the head.
- **Cycle back to the head** (pos = 0): mu = 0; phase 2 takes zero steps because the pointers already meet at the head.
- **Tail points to itself** (pos = n - 1): the loop is one node long; the answer is the tail.
- **Duplicate values:** compare nodes, never values.

## Common Pitfalls

- **Checking \`slow === fast\` before moving.** Both start on \`head\`, so every list "meets" at the head.
- **Guarding only \`fast.next\`.** \`while (fast.next)\` throws \`TypeError: Cannot read properties of null\` when \`fast\` itself is \`null\`; check \`fast !== null && fast.next !== null\`.
- **Comparing \`val\`.** Values repeat (\`[5, 5, 5, 5]\` above); compare node references with \`===\`.
- **Using a plain object as the visited set.** Object keys are strings, so every node becomes \`"[object Object]"\` and the second node looks like a repeat. Use \`Set\` (or \`WeakSet\`).
- **Logging a cyclic list.** \`JSON.stringify(head)\` throws \`TypeError: Converting circular structure to JSON\`; print a bounded number of values instead.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of visited nodes: the first node with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen.has(node)</code> is the entry. O(n) time, O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Phase 1:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> moves 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> moves 2 while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast !== null &amp;&amp; fast.next !== null</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow === fast</code> means they met in the loop.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Phase 2:</strong> <span style="color:#f0e2c8;">Reset <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow = head</code>, move both by 1; the next <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow === fast</code> is the entry. If fast reached <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why it works:</strong> <span style="color:#f0e2c8;">At the meeting point slow has walked a multiple of the loop length, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mu</code> more steps from there land on the entry, the same moment the head pointer arrives.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code> on objects is reference equality and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> keys objects by reference; a plain object would turn every node into the same string key.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why speeds 1 and 2?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The gap closes by one node per step inside the loop, so fast cannot skip over slow, and slow has walked a whole number of laps at the meeting, which is what phase 2 relies on.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the cycle length?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From the meeting node, walk one pointer around until it returns, counting the steps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">WeakSet</code> help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It also keys by reference and lets nodes be garbage-collected later, but it is still O(n) memory during the call; Floyd is the O(1) answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the worst case for phase 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At most mu + lambda steps: slow reaches the loop after mu steps and fast catches it within one lap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test this without an infinite loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build lists with a known <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pos</code>, and convert the returned node to an index by walking from the head, as Example 1 does; never print the whole list.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cycle in a linked list** | following next pointers never reaches the end |
| **Cycle entry** | the first node of the loop; where the tail points back to |
| **Reference identity** | same object in memory, not just equal values |
| **Floyd's cycle-finding algorithm** | slow moves 1, fast moves 2; they meet inside a cycle |
| **mu (μ)** | steps from the head to the cycle entry |
| **lambda (λ)** | number of nodes in the loop |
| **Rho shape** | tail plus loop, the shape of a list with a cycle |
| **\`===\` on objects** | true only when both sides are the same object (reference equality) |
| **SameValueZero** | the equality rule \`Set\` and \`Map\` use for keys |

---
**Conclusion:** Finding where a cycle begins is two passes of the same idea: a fast and a slow pointer meet inside the loop, then one restarts from the head and both walk at the same speed until they meet at the entry. The proof is one line, the meeting distance is a multiple of the loop length, so mu more steps from the meeting point lands on the entry. It is O(n) time and O(1) space, against the O(n) space of a hash set. In JavaScript the marks are in the null checks on both \`fast\` and \`fast.next\`, comparing references with \`===\`, and choosing a \`Set\` (not an object) for the baseline.`,
        examples: [
          { label: `Floyd on lists with and without a cycle`, code: `class ListNode {
  constructor(val) {
    this.val = val;
    this.next = null;
  }
}

// Linked list from values; the tail points back to index pos (-1 = no cycle).
function build(values, pos) {
  const nodes = values.map((v) => new ListNode(v));
  for (let i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1];
  if (nodes.length && pos >= 0) nodes[nodes.length - 1].next = nodes[pos];
  return nodes.length ? nodes[0] : null;
}

// Floyd: return the node where the cycle begins, or null.
function detectCycle(head) {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) {          // phase 1: they met inside the loop
      slow = head;                // phase 2: restart one pointer at the head
      while (slow !== fast) {
        slow = slow.next;
        fast = fast.next;
      }
      return slow;
    }
  }
  return null;
}

function indexOf(head, target) {
  let i = 0;
  let node = head;
  while (node !== target) {
    node = node.next;
    i++;
  }
  return i;
}

function fmt(values) {
  return '[' + values.join(', ') + ']';
}

function describe(values, pos) {
  const head = build(values, pos);
  const start = detectCycle(head);
  const label = fmt(values) + ', tail -> ' + pos + ': ';
  if (start === null) return label + 'no cycle';
  return label + 'cycle starts at index ' + indexOf(head, start) + ' (value ' + start.val + ')';
}

console.log(describe([3, 2, 0, -4], 1)); // [3, 2, 0, -4], tail -> 1: cycle starts at index 1 (value 2)
console.log(describe([1, 2], 0)); // [1, 2], tail -> 0: cycle starts at index 0 (value 1)
console.log(describe([1], -1)); // [1], tail -> -1: no cycle
console.log(describe([1], 0)); // [1], tail -> 0: cycle starts at index 0 (value 1)
console.log(describe([], -1)); // [], tail -> -1: no cycle
console.log(describe([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 7)); // [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], tail -> 7: cycle starts at index 7 (value 8)
console.log(describe([5, 5, 5, 5], 2)); // [5, 5, 5, 5], tail -> 2: cycle starts at index 2 (value 5)
` },
          { label: `Phase step counts, and Floyd versus a hash set`, code: `class ListNode {
  constructor(val) {
    this.val = val;
    this.next = null;
  }
}

// Linked list from values; the tail points back to index pos (-1 = no cycle).
function build(values, pos) {
  const nodes = values.map((v) => new ListNode(v));
  for (let i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1];
  if (nodes.length && pos >= 0) nodes[nodes.length - 1].next = nodes[pos];
  return nodes.length ? nodes[0] : null;
}

// Floyd: return the node where the cycle begins, or null.
function detectCycle(head) {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) {          // phase 1: they met inside the loop
      slow = head;                // phase 2: restart one pointer at the head
      while (slow !== fast) {
        slow = slow.next;
        fast = fast.next;
      }
      return slow;
    }
  }
  return null;
}

function indexOf(head, target) {
  let i = 0;
  let node = head;
  while (node !== target) {
    node = node.next;
    i++;
  }
  return i;
}

// Floyd again, counting the steps of each phase.
function floydTrace(head) {
  let slow = head;
  let fast = head;
  let phase1 = 0;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
    phase1++;
    if (slow === fast) {
      const meet = slow;
      slow = head;
      let phase2 = 0;
      while (slow !== fast) {
        slow = slow.next;
        fast = fast.next;
        phase2++;
      }
      return { start: slow, meet: meet, phase1: phase1, phase2: phase2 };
    }
  }
  return { start: null, meet: null, phase1: phase1, phase2: 0 };
}

// O(n)-space version: the first node seen twice is the entry.
function hashStart(head) {
  const seen = new Set();
  for (let node = head; node !== null; node = node.next) {
    if (seen.has(node)) return node;
    seen.add(node);
  }
  return null;
}

function range(n) {
  return Array.from({ length: n }, (_, i) => i);
}

for (const [n, pos] of [[10, 3], [10, 0], [10, 9], [6, 2], [100, 40]]) {
  const head = build(range(n), pos);
  const t = floydTrace(head);
  console.log('n=' + n + ' pos=' + pos + ': mu=' + pos + ' lambda=' + (n - pos) +
    ', met at index ' + indexOf(head, t.meet) + ' after ' + t.phase1 +
    ' steps, phase 2 took ' + t.phase2 + ' steps, entry index ' + indexOf(head, t.start));
}

let agree = 0;
let total = 0;
for (let n = 1; n <= 30; n++) {
  for (let pos = -1; pos < n; pos++) {
    const head = build(range(n), pos);
    total++;
    if (detectCycle(head) === hashStart(head)) agree++;
  }
}
console.log('Floyd and the hash set agree on ' + agree + ' of ' + total + ' lists');
` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given the head of a singly linked list that might contain a cycle, return the node where the cycle begins, or null if there is none, using O(1) extra memory. Please write it in Java."

**What a strong answer should cover:**
- A \`HashSet<ListNode>\` baseline (first node seen twice is the entry), O(n) time and O(n) space.
- Floyd's tortoise and hare: slow moves 1, fast moves 2; on meeting, restart one pointer at the head and move both by 1 until they meet at the entry.
- Why phase 2 works: the meeting distance is a multiple of the cycle length, so mu more steps from the meeting point land on the entry. O(n) time, O(1) space.
- Edge cases: empty list, self-loop, cycle back to the head, duplicate values.
- Java specifics: \`==\` on objects compares references (what we want here); \`HashSet\` relies on \`equals\`/\`hashCode\`, so a node class that overrides them by value breaks the baseline; \`IdentityHashMap\` is the identity-keyed alternative.

**Clarifying questions expected:**
- "Should I return the node, or its index? null when there is no cycle?"
- "Is O(n) extra space acceptable, and may I modify the list?"

**Code / implementation expected:** Yes — \`ListNode detectCycle(ListNode head)\` in Java with two pointers.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture a jogging track shaped like the letter P. You enter at the bottom of the straight stem, run up it, and then you are on a loop that never lets you out. Two friends start at the entrance together: one jogs, the other runs exactly twice as fast. Because the loop has no exit, the fast runner eventually laps the slow one and they bump into each other somewhere on the loop.

Now the clever part. The moment they meet, the slow friend walks back to the entrance, and both friends move at **the same** walking pace. They meet again, and this time it is exactly at the gate where the stem joins the loop. Nobody needed a map, a notebook or a count of the laps.

A linked list with a cycle is that track. Each node points to the next one, and the last node points back to some earlier node instead of to nothing. The warm-up question, [detecting a cycle in a linked list](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list), only asks *whether* the track has a loop. This question asks for the **gate**: the first node that is part of the loop. It is a favourite medium question because the code is short but the reason it works is a small, elegant proof that interviewers like to hear you explain.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Should I return the node itself, or its index or value? | The classic version returns the node (a reference). Values can repeat, so a value does not identify the gate. |
| What do I return when there is no cycle? | Usually null / None / nullptr. Agree on it so the caller can tell the two cases apart. |
| May I modify the list (mark nodes, break links)? | Marking or rewiring is a trick that works, but it destroys the input. Floyd leaves the list untouched. |
| Is O(n) extra memory acceptable? | A hash set of visited nodes is simplest; the follow-up is almost always "now do it in O(1) space". |
| Can the list be empty, or a single node pointing to itself? | Both are legal inputs and are where off-by-one bugs hide. |

## 3. The Core Idea

📌 **Interview term: Cycle in a linked list** — following \`next\` pointers never reaches the end, because some node's \`next\` points back to a node that was already visited.

📌 **Interview term: Cycle entry (cycle start)** — the first node of the loop: the only node in the loop that is also reachable from outside it. Its index equals the position the tail points back to.

<svg class="iq-diagram" width="100%" viewBox="0 0 560 250" role="img" aria-label="Linked list 3 to 2 to 0 to minus 4, the tail points back to the node with value 2, which is where the cycle begins">
  <defs>
    <marker id="lc1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="70" y="34" text-anchor="middle">head</text>
  <path class="d-edge" d="M 70 42 L 70 60" fill="none" marker-end="url(#lc1-arrow)"/>
  <rect class="d-box" x="40" y="66" width="70" height="46" rx="8"/>
  <text class="d-text" x="75" y="95" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="170" y="66" width="70" height="46" rx="8"/>
  <text class="d-text" x="205" y="95" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="66" width="70" height="46" rx="8"/>
  <text class="d-text" x="335" y="95" text-anchor="middle">0</text>
  <rect class="d-box" x="430" y="66" width="70" height="46" rx="8"/>
  <text class="d-text" x="465" y="95" text-anchor="middle">-4</text>
  <path class="d-edge" d="M 112 89 L 164 89" fill="none" marker-end="url(#lc1-arrow)"/>
  <path class="d-edge" d="M 242 89 L 294 89" fill="none" marker-end="url(#lc1-arrow)"/>
  <path class="d-edge" d="M 372 89 L 424 89" fill="none" marker-end="url(#lc1-arrow)"/>
  <text class="d-text d-accent" x="205" y="50" text-anchor="middle">cycle start</text>
  <path class="d-edge-accent" d="M 465 114 C 465 200, 205 200, 205 120" fill="none" marker-end="url(#lc1-arrow)"/>
  <text class="d-sub" x="335" y="222" text-anchor="middle">tail points back</text>
</svg>

In this list the tail (-4) points back to the node holding 2, so the answer is that node (index 1). Walking from the head you see 3, 2, 0, -4, 2, 0, -4, ... forever.

### Approach 1: remember every node (hash set)

Walk the list and put every node you visit into a set. The first node that is **already in the set** is where the loop closes back on itself, which is exactly the cycle entry. If you reach the end (null), there is no cycle.

📌 **Interview term: Reference identity** — two variables are "the same node" only if they refer to the same object in memory, not merely to nodes with equal values. The set must compare nodes by identity.

This is O(n) time but O(n) extra memory.

### Approach 2: Floyd's tortoise and hare (O(1) memory)

📌 **Interview term: Floyd's cycle-finding algorithm (tortoise and hare)** — two pointers start at the head; \`slow\` moves one node per step and \`fast\` moves two. If there is a cycle they must meet inside it; if \`fast\` reaches the end, there is none. This is the [fast and slow pointers](/interview-question/what-is-the-fast-and-slow-pointer-technique) pattern.

Then **phase 2**: put one pointer back at the head, leave the other at the meeting point, and move both **one** step at a time. The node where they meet is the cycle entry.

## 4. Why Phase 2 Lands Exactly on the Entry

Name the two lengths of the "P" shape:

📌 **Interview term: mu (μ)** — the number of steps from the head to the cycle entry (the tail before the loop).

📌 **Interview term: lambda (λ)** — the number of nodes in the loop (the cycle length).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 320" role="img" aria-label="Rho shape: mu steps from head to the cycle start, then the meeting point is k steps into the loop, and lambda minus k steps remain back to the start">
  <defs>
    <marker id="lc2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="137" width="80" height="46" rx="8"/>
  <text class="d-text" x="70" y="166" text-anchor="middle">head</text>
  <path class="d-edge" d="M 112 160 L 318 160" fill="none" marker-end="url(#lc2-arrow)"/>
  <text class="d-sub" x="215" y="142" text-anchor="middle">mu steps</text>
  <path class="d-edge-accent" d="M 330 160 A 110 110 0 0 1 550 160" fill="none" marker-end="url(#lc2-arrow)"/>
  <path class="d-edge-dashed" d="M 550 160 A 110 110 0 0 1 330 160" fill="none" marker-end="url(#lc2-arrow)"/>
  <circle class="d-box-accent" cx="330" cy="160" r="9"/>
  <circle class="d-box-accent" cx="550" cy="160" r="9"/>
  <text class="d-text d-accent" x="330" y="198" text-anchor="middle">cycle start</text>
  <text class="d-text d-accent" x="550" y="198" text-anchor="middle">meeting point</text>
  <text class="d-sub" x="440" y="32" text-anchor="middle">k steps</text>
  <text class="d-sub" x="440" y="304" text-anchor="middle">lambda minus k steps</text>
</svg>

Say the pointers meet \`k\` steps past the entry. When they meet, slow has taken \`d\` steps in total, so \`d = mu + k + (some whole laps)\`. Fast took \`2d\` steps on the same track. The extra \`d\` steps that fast walked are spent going round the loop, so **\`d\` is a whole number of laps: a multiple of lambda**.

Now walk \`mu\` more steps from the meeting point. You will have walked \`k + mu\` steps past the entry in total, and \`d = mu + k + laps\` is a multiple of lambda, so \`k + mu\` is also a multiple of lambda: you are **back at the entry**. Meanwhile the pointer that restarted at the head also needs exactly \`mu\` steps to reach the entry. Both arrive at the same node on the same step, and that is the first moment they share a node.

Two facts you can check in the run output below rather than take on trust: phase 2 always takes exactly \`mu\` steps, and phase 1 ends after the smallest multiple of lambda that is at least \`mu\` (and at least 1).

📌 **Interview term: Rho shape** — the picture of a list with a cycle: a straight tail ending in a loop, like the Greek letter ρ. People use it when explaining Floyd.

## 5. The Solution in Java

\`ListNode\` is a static nested class with \`int val\` and \`ListNode next\`. The examples also use \`build(values, pos)\`, which links the nodes and points the tail back to index \`pos\` (\`-1\` meaning no cycle).

~~~java
static ListNode detectCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) {           // phase 1: same object, they met in the loop
            slow = head;              // phase 2: restart one pointer at the head
            while (slow != fast) {
                slow = slow.next;
                fast = fast.next;
            }
            return slow;
        }
    }
    return null;
}
~~~

**Why each line is there:**

- \`fast != null && fast.next != null\` — fast reads \`fast.next.next\`, so both must be non-null or you get a \`NullPointerException\`. Reaching \`null\` means there is no cycle. \`&&\` short-circuits, so \`fast.next\` is never read when \`fast\` is null.
- The meeting check comes **after** moving; both start on the head.
- \`slow == fast\` on object references is **reference comparison**: true only for the same object. That is exactly the question, "same node?". (It is \`equals\` you would use to compare contents.)
- Phase 2 moves both by one and returns the shared node.

### The HashSet version

~~~java
static ListNode hashStart(ListNode head) {
    Set<ListNode> seen = new HashSet<>();   // ListNode keeps Object.equals/hashCode: identity
    for (ListNode node = head; node != null; node = node.next) {
        if (!seen.add(node)) return node;   // add returns false if already present
    }
    return null;
}
~~~

\`Set.add\` returns \`false\` when the element is already present, so one call both checks and inserts. Because \`ListNode\` does not override \`equals\` and \`hashCode\`, it inherits \`Object\`'s identity-based versions; in a test run two \`new ListNode(1)\` objects gave \`x == y\` false, \`x.equals(y)\` false and a \`HashSet\` of size \`2\`. If your node class overrides \`equals\` to compare values, the set would merge different nodes holding equal values; use \`Collections.newSetFromMap(new IdentityHashMap<>())\` instead.

## 6. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Floyd on lists with and without a cycle** prints:

~~~text
[3, 2, 0, -4], tail -> 1: cycle starts at index 1 (value 2)
[1, 2], tail -> 0: cycle starts at index 0 (value 1)
[1], tail -> -1: no cycle
[1], tail -> 0: cycle starts at index 0 (value 1)
[], tail -> -1: no cycle
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], tail -> 7: cycle starts at index 7 (value 8)
[5, 5, 5, 5], tail -> 2: cycle starts at index 2 (value 5)
~~~

**Example 2 — Phase step counts, and Floyd versus a hash set** prints:

~~~text
n=10 pos=3: mu=3 lambda=7, met at index 7 after 7 steps, phase 2 took 3 steps, entry index 3
n=10 pos=0: mu=0 lambda=10, met at index 0 after 10 steps, phase 2 took 0 steps, entry index 0
n=10 pos=9: mu=9 lambda=1, met at index 9 after 9 steps, phase 2 took 9 steps, entry index 9
n=6 pos=2: mu=2 lambda=4, met at index 4 after 4 steps, phase 2 took 2 steps, entry index 2
n=100 pos=40: mu=40 lambda=60, met at index 60 after 60 steps, phase 2 took 40 steps, entry index 40
Floyd and the hash set agree on 495 of 495 lists
~~~

**Reading the output:** in the first block, "[5, 5, 5, 5], tail -> 2" finds index 2 even though every value is 5, which is why the function returns a node, not a value. In the second block, "phase 2 took" always equals mu (the \`pos\` the tail points to), and the meeting index varies: for n=10, pos=3 the pointers meet at index 7 after 7 steps (one lap of 7, the smallest multiple of lambda that is at least mu), and for n=100, pos=40 they meet at index 60 after 60 steps (one lap of 60). The last line runs both algorithms on every list of length 1 to 30, with and without a cycle, and they pick the same node every time.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Hash set of visited nodes | O(n) | O(n) | every node is inserted once; the first repeat is the entry |
| Floyd, phase 1 | O(n) | O(1) | slow takes at most mu + lambda steps before fast catches it |
| Floyd, phase 2 | O(n) | O(1) | exactly mu steps |
| Mark visited nodes in place | O(n) | O(1) | fast, but it destroys the list (or needs a spare field) |

n is the number of nodes, mu + lambda. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.


In Java the \`HashSet\` version also allocates an entry object per node, so its memory cost is noticeably larger than the reference count alone; Floyd allocates nothing.

## 8. Edge Cases

- **Empty list:** no cycle; the loop condition fails immediately.
- **One node, next is null:** no cycle.
- **One node pointing to itself:** mu = 0, lambda = 1; the answer is the head.
- **Cycle back to the head** (pos = 0): mu = 0; phase 2 takes zero steps because the pointers already meet at the head.
- **Tail points to itself** (pos = n - 1): the loop is one node long; the answer is the tail.
- **Duplicate values:** compare nodes, never values.

## Common Pitfalls

- **Checking \`slow == fast\` before moving.** Both start on \`head\`; the method returns the head for every list.
- **\`while (fast.next != null)\` alone.** Throws \`NullPointerException\` on an empty list or once \`fast\` becomes null; check \`fast != null\` first.
- **Comparing \`slow.val == fast.val\`.** Wrong with duplicate values. And if \`val\` were an \`Integer\`, \`==\` would compare references: in a test run \`Integer\` 127 == 127 was \`true\` but 128 == 128 was \`false\`.
- **A node class with value-based \`equals\`/\`hashCode\`** silently breaks the \`HashSet\` baseline; use identity.
- **\`toString()\` that walks the list.** On a cyclic list it never terminates; print a bounded number of nodes.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet&lt;ListNode&gt;</code>: the first node where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen.add(node)</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> is the entry. O(n) time, O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Phase 1:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> moves 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> moves 2 while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast != null &amp;&amp; fast.next != null</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow == fast</code> (same reference) means they met.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Phase 2:</strong> <span style="color:#f0e2c8;">Reset <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow = head</code>, move both by 1; the node where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow == fast</code> again is the entry. If fast hit null, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why it works:</strong> <span style="color:#f0e2c8;">At the meeting slow has walked a multiple of the loop length, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mu</code> more steps from the meeting point land on the entry exactly when the head pointer does.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> on objects is reference identity, which is what we want; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet</code> version depends on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode</code> not overriding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hashCode</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why speeds 1 and 2?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inside the loop the gap shrinks by one node per step, so fast cannot jump over slow, and slow has walked a whole number of laps at the meeting, which phase 2 depends on.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find the cycle length?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Hold one pointer at the meeting node and advance the other until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p == meet</code> again, counting steps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ListNode</code> overrides <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">equals</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Floyd is unaffected because it uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>. For the set version use an identity set: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Collections.newSetFromMap(new IdentityHashMap&lt;&gt;())</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Worst-case steps?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Phase 1 at most mu + lambda, phase 2 exactly mu: O(n) overall, O(1) extra memory.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could recursion help?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: there is nothing to return up a call stack, and a long list could throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>. Two iterative pointers are the right tool.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cycle in a linked list** | following next pointers never reaches the end |
| **Cycle entry** | the first node of the loop; where the tail points back to |
| **Reference identity** | same object in memory, not just equal values |
| **Floyd's cycle-finding algorithm** | slow moves 1, fast moves 2; they meet inside a cycle |
| **mu (μ)** | steps from the head to the cycle entry |
| **lambda (λ)** | number of nodes in the loop |
| **Rho shape** | tail plus loop, the shape of a list with a cycle |
| **Reference comparison (\`==\`)** | in Java, \`==\` on objects is true only for the same object |
| **IdentityHashMap** | a map that compares keys with \`==\` instead of \`equals\` |

---
**Conclusion:** Finding where a cycle begins is two passes of the same idea: a fast and a slow pointer meet inside the loop, then one restarts from the head and both walk at the same speed until they meet at the entry. The proof is one line, the meeting distance is a multiple of the loop length, so mu more steps from the meeting point lands on the entry. It is O(n) time and O(1) space, against the O(n) space of a hash set. In Java the marks are in the null-safe loop condition, using \`==\` deliberately for node identity, and knowing that the \`HashSet\` baseline silently depends on \`equals\`/\`hashCode\`.`,
        examples: [
          { label: `Floyd on lists with and without a cycle`, code: `import java.util.Arrays;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    // Linked list from values; the tail points back to index pos (-1 = no cycle).
    static ListNode build(int[] values, int pos) {
        ListNode[] nodes = new ListNode[values.length];
        for (int i = 0; i < values.length; i++) nodes[i] = new ListNode(values[i]);
        for (int i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1];
        if (nodes.length > 0 && pos >= 0) nodes[nodes.length - 1].next = nodes[pos];
        return nodes.length > 0 ? nodes[0] : null;
    }

    // Floyd: return the node where the cycle begins, or null.
    static ListNode detectCycle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) {           // phase 1: same object, they met in the loop
                slow = head;              // phase 2: restart one pointer at the head
                while (slow != fast) {
                    slow = slow.next;
                    fast = fast.next;
                }
                return slow;
            }
        }
        return null;
    }

    static int indexOf(ListNode head, ListNode target) {
        int i = 0;
        for (ListNode node = head; node != target; node = node.next) i++;
        return i;
    }

    static String describe(int[] values, int pos) {
        ListNode head = build(values, pos);
        ListNode start = detectCycle(head);
        String label = Arrays.toString(values) + ", tail -> " + pos + ": ";
        if (start == null) return label + "no cycle";
        return label + "cycle starts at index " + indexOf(head, start) + " (value " + start.val + ")";
    }

    public static void main(String[] args) {
        System.out.println(describe(new int[]{3, 2, 0, -4}, 1));
        System.out.println(describe(new int[]{1, 2}, 0));
        System.out.println(describe(new int[]{1}, -1));
        System.out.println(describe(new int[]{1}, 0));
        System.out.println(describe(new int[]{}, -1));
        System.out.println(describe(new int[]{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, 7));
        System.out.println(describe(new int[]{5, 5, 5, 5}, 2));
    }
}
` },
          { label: `Phase step counts, and Floyd versus a hash set`, code: `import java.util.HashSet;
import java.util.Set;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    // Linked list from values; the tail points back to index pos (-1 = no cycle).
    static ListNode build(int[] values, int pos) {
        ListNode[] nodes = new ListNode[values.length];
        for (int i = 0; i < values.length; i++) nodes[i] = new ListNode(values[i]);
        for (int i = 0; i + 1 < nodes.length; i++) nodes[i].next = nodes[i + 1];
        if (nodes.length > 0 && pos >= 0) nodes[nodes.length - 1].next = nodes[pos];
        return nodes.length > 0 ? nodes[0] : null;
    }

    // Floyd: return the node where the cycle begins, or null.
    static ListNode detectCycle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) {           // phase 1: same object, they met in the loop
                slow = head;              // phase 2: restart one pointer at the head
                while (slow != fast) {
                    slow = slow.next;
                    fast = fast.next;
                }
                return slow;
            }
        }
        return null;
    }

    static int indexOf(ListNode head, ListNode target) {
        int i = 0;
        for (ListNode node = head; node != target; node = node.next) i++;
        return i;
    }

    // Floyd again, counting the steps of each phase: {meetIndex, phase1, phase2, entryIndex}.
    static int[] floydTrace(ListNode head) {
        ListNode slow = head, fast = head;
        int phase1 = 0;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            phase1++;
            if (slow == fast) {
                ListNode meet = slow;
                slow = head;
                int phase2 = 0;
                while (slow != fast) {
                    slow = slow.next;
                    fast = fast.next;
                    phase2++;
                }
                return new int[]{indexOf(head, meet), phase1, phase2, indexOf(head, slow)};
            }
        }
        return null;
    }

    // O(n)-space version: the first node seen twice is the entry.
    static ListNode hashStart(ListNode head) {
        Set<ListNode> seen = new HashSet<>();   // ListNode keeps Object.equals/hashCode: identity
        for (ListNode node = head; node != null; node = node.next) {
            if (!seen.add(node)) return node;   // add returns false if already present
        }
        return null;
    }

    static int[] range(int n) {
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = i;
        return a;
    }

    public static void main(String[] args) {
        int[][] cases = {{10, 3}, {10, 0}, {10, 9}, {6, 2}, {100, 40}};
        for (int[] c : cases) {
            int n = c[0], pos = c[1];
            int[] t = floydTrace(build(range(n), pos));
            System.out.println("n=" + n + " pos=" + pos + ": mu=" + pos + " lambda=" + (n - pos)
                + ", met at index " + t[0] + " after " + t[1]
                + " steps, phase 2 took " + t[2] + " steps, entry index " + t[3]);
        }
        int agree = 0, total = 0;
        for (int n = 1; n <= 30; n++) {
            for (int pos = -1; pos < n; pos++) {
                ListNode head = build(range(n), pos);
                total++;
                if (detectCycle(head) == hashStart(head)) agree++;
            }
        }
        System.out.println("Floyd and the hash set agree on " + agree + " of " + total + " lists");
    }
}
` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a pointer to the head of a singly linked list that may contain a cycle, return a pointer to the node where the cycle begins, or nullptr if there is no cycle, using constant extra memory. Please write it in C++."

**What a strong answer should cover:**
- An \`std::unordered_set<ListNode*>\` baseline (first pointer seen twice is the entry), O(n) time and O(n) space.
- Floyd's tortoise and hare: slow moves 1, fast moves 2; on meeting, restart one pointer at the head and move both by 1 until they meet at the entry.
- Why phase 2 works: the meeting distance is a multiple of the cycle length, so mu more steps from the meeting point land on the entry. O(n) time, O(1) space.
- Edge cases: \`nullptr\` head, self-loop, cycle back to the head, duplicate values.
- C++ specifics: compare pointers (addresses), not values; dereferencing \`fast->next\` when \`fast\` is null is undefined behaviour; a list with a cycle cannot be freed with the usual walk-and-delete loop, so ownership must be handled separately.

**Clarifying questions expected:**
- "Return the node pointer, or an index? nullptr when there is no cycle?"
- "Who owns the nodes, and may I modify the list?"

**Code / implementation expected:** Yes — \`ListNode* detectCycle(ListNode* head)\` in C++ with two raw pointers.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture a jogging track shaped like the letter P. You enter at the bottom of the straight stem, run up it, and then you are on a loop that never lets you out. Two friends start at the entrance together: one jogs, the other runs exactly twice as fast. Because the loop has no exit, the fast runner eventually laps the slow one and they bump into each other somewhere on the loop.

Now the clever part. The moment they meet, the slow friend walks back to the entrance, and both friends move at **the same** walking pace. They meet again, and this time it is exactly at the gate where the stem joins the loop. Nobody needed a map, a notebook or a count of the laps.

A linked list with a cycle is that track. Each node points to the next one, and the last node points back to some earlier node instead of to nothing. The warm-up question, [detecting a cycle in a linked list](/interview-question/how-do-you-detect-a-cycle-in-a-linked-list), only asks *whether* the track has a loop. This question asks for the **gate**: the first node that is part of the loop. It is a favourite medium question because the code is short but the reason it works is a small, elegant proof that interviewers like to hear you explain.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Should I return the node itself, or its index or value? | The classic version returns the node (a reference). Values can repeat, so a value does not identify the gate. |
| What do I return when there is no cycle? | Usually null / None / nullptr. Agree on it so the caller can tell the two cases apart. |
| May I modify the list (mark nodes, break links)? | Marking or rewiring is a trick that works, but it destroys the input. Floyd leaves the list untouched. |
| Is O(n) extra memory acceptable? | A hash set of visited nodes is simplest; the follow-up is almost always "now do it in O(1) space". |
| Can the list be empty, or a single node pointing to itself? | Both are legal inputs and are where off-by-one bugs hide. |

## 3. The Core Idea

📌 **Interview term: Cycle in a linked list** — following \`next\` pointers never reaches the end, because some node's \`next\` points back to a node that was already visited.

📌 **Interview term: Cycle entry (cycle start)** — the first node of the loop: the only node in the loop that is also reachable from outside it. Its index equals the position the tail points back to.

<svg class="iq-diagram" width="100%" viewBox="0 0 560 250" role="img" aria-label="Linked list 3 to 2 to 0 to minus 4, the tail points back to the node with value 2, which is where the cycle begins">
  <defs>
    <marker id="lc1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="70" y="34" text-anchor="middle">head</text>
  <path class="d-edge" d="M 70 42 L 70 60" fill="none" marker-end="url(#lc1-arrow)"/>
  <rect class="d-box" x="40" y="66" width="70" height="46" rx="8"/>
  <text class="d-text" x="75" y="95" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="170" y="66" width="70" height="46" rx="8"/>
  <text class="d-text" x="205" y="95" text-anchor="middle">2</text>
  <rect class="d-box" x="300" y="66" width="70" height="46" rx="8"/>
  <text class="d-text" x="335" y="95" text-anchor="middle">0</text>
  <rect class="d-box" x="430" y="66" width="70" height="46" rx="8"/>
  <text class="d-text" x="465" y="95" text-anchor="middle">-4</text>
  <path class="d-edge" d="M 112 89 L 164 89" fill="none" marker-end="url(#lc1-arrow)"/>
  <path class="d-edge" d="M 242 89 L 294 89" fill="none" marker-end="url(#lc1-arrow)"/>
  <path class="d-edge" d="M 372 89 L 424 89" fill="none" marker-end="url(#lc1-arrow)"/>
  <text class="d-text d-accent" x="205" y="50" text-anchor="middle">cycle start</text>
  <path class="d-edge-accent" d="M 465 114 C 465 200, 205 200, 205 120" fill="none" marker-end="url(#lc1-arrow)"/>
  <text class="d-sub" x="335" y="222" text-anchor="middle">tail points back</text>
</svg>

In this list the tail (-4) points back to the node holding 2, so the answer is that node (index 1). Walking from the head you see 3, 2, 0, -4, 2, 0, -4, ... forever.

### Approach 1: remember every node (hash set)

Walk the list and put every node you visit into a set. The first node that is **already in the set** is where the loop closes back on itself, which is exactly the cycle entry. If you reach the end (null), there is no cycle.

📌 **Interview term: Reference identity** — two variables are "the same node" only if they refer to the same object in memory, not merely to nodes with equal values. The set must compare nodes by identity.

This is O(n) time but O(n) extra memory.

### Approach 2: Floyd's tortoise and hare (O(1) memory)

📌 **Interview term: Floyd's cycle-finding algorithm (tortoise and hare)** — two pointers start at the head; \`slow\` moves one node per step and \`fast\` moves two. If there is a cycle they must meet inside it; if \`fast\` reaches the end, there is none. This is the [fast and slow pointers](/interview-question/what-is-the-fast-and-slow-pointer-technique) pattern.

Then **phase 2**: put one pointer back at the head, leave the other at the meeting point, and move both **one** step at a time. The node where they meet is the cycle entry.

## 4. Why Phase 2 Lands Exactly on the Entry

Name the two lengths of the "P" shape:

📌 **Interview term: mu (μ)** — the number of steps from the head to the cycle entry (the tail before the loop).

📌 **Interview term: lambda (λ)** — the number of nodes in the loop (the cycle length).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 320" role="img" aria-label="Rho shape: mu steps from head to the cycle start, then the meeting point is k steps into the loop, and lambda minus k steps remain back to the start">
  <defs>
    <marker id="lc2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="137" width="80" height="46" rx="8"/>
  <text class="d-text" x="70" y="166" text-anchor="middle">head</text>
  <path class="d-edge" d="M 112 160 L 318 160" fill="none" marker-end="url(#lc2-arrow)"/>
  <text class="d-sub" x="215" y="142" text-anchor="middle">mu steps</text>
  <path class="d-edge-accent" d="M 330 160 A 110 110 0 0 1 550 160" fill="none" marker-end="url(#lc2-arrow)"/>
  <path class="d-edge-dashed" d="M 550 160 A 110 110 0 0 1 330 160" fill="none" marker-end="url(#lc2-arrow)"/>
  <circle class="d-box-accent" cx="330" cy="160" r="9"/>
  <circle class="d-box-accent" cx="550" cy="160" r="9"/>
  <text class="d-text d-accent" x="330" y="198" text-anchor="middle">cycle start</text>
  <text class="d-text d-accent" x="550" y="198" text-anchor="middle">meeting point</text>
  <text class="d-sub" x="440" y="32" text-anchor="middle">k steps</text>
  <text class="d-sub" x="440" y="304" text-anchor="middle">lambda minus k steps</text>
</svg>

Say the pointers meet \`k\` steps past the entry. When they meet, slow has taken \`d\` steps in total, so \`d = mu + k + (some whole laps)\`. Fast took \`2d\` steps on the same track. The extra \`d\` steps that fast walked are spent going round the loop, so **\`d\` is a whole number of laps: a multiple of lambda**.

Now walk \`mu\` more steps from the meeting point. You will have walked \`k + mu\` steps past the entry in total, and \`d = mu + k + laps\` is a multiple of lambda, so \`k + mu\` is also a multiple of lambda: you are **back at the entry**. Meanwhile the pointer that restarted at the head also needs exactly \`mu\` steps to reach the entry. Both arrive at the same node on the same step, and that is the first moment they share a node.

Two facts you can check in the run output below rather than take on trust: phase 2 always takes exactly \`mu\` steps, and phase 1 ends after the smallest multiple of lambda that is at least \`mu\` (and at least 1).

📌 **Interview term: Rho shape** — the picture of a list with a cycle: a straight tail ending in a loop, like the Greek letter ρ. People use it when explaining Floyd.

## 5. The Solution in C++

\`ListNode\` is a struct with \`int val\` and \`ListNode* next\`. The examples build lists with \`build(values, pos, owner)\`: the nodes live in a \`std::vector<std::unique_ptr<ListNode>>\`, and the raw \`next\` pointers only *refer* to them. That matters here, because a cyclic list has no last node, so the usual \`while (head) { auto n = head->next; delete head; head = n; }\` would loop forever over freed memory.

~~~cpp
ListNode* detectCycle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {          // phase 1: same address, they met in the loop
            slow = head;             // phase 2: restart one pointer at the head
            while (slow != fast) {
                slow = slow->next;
                fast = fast->next;
            }
            return slow;
        }
    }
    return nullptr;
}
~~~

**Why each line is there:**

- \`fast != nullptr && fast->next != nullptr\` — dereferencing a null pointer is undefined behaviour (usually a crash), and fast reads two links ahead. \`&&\` short-circuits, so \`fast->next\` is never read when \`fast\` is null.
- The meeting check comes **after** moving; both start on the head.
- \`slow == fast\` compares **addresses**: true only when both point at the same node. That is node identity, which is the question.
- Phase 2 moves both by one and returns the shared pointer.

### The unordered_set version

~~~cpp
ListNode* hashStart(ListNode* head) {
    std::unordered_set<ListNode*> seen;            // hashes the pointer (the address)
    for (ListNode* node = head; node != nullptr; node = node->next) {
        if (!seen.insert(node).second) return node; // .second is false if already present
    }
    return nullptr;
}
~~~

\`insert\` returns a pair whose \`.second\` is \`false\` when the key was already there, so one call checks and inserts. The key is the pointer, so nodes with equal values are still different keys.

## 6. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Floyd on lists with and without a cycle** prints:

~~~text
[3, 2, 0, -4], tail -> 1: cycle starts at index 1 (value 2)
[1, 2], tail -> 0: cycle starts at index 0 (value 1)
[1], tail -> -1: no cycle
[1], tail -> 0: cycle starts at index 0 (value 1)
[], tail -> -1: no cycle
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], tail -> 7: cycle starts at index 7 (value 8)
[5, 5, 5, 5], tail -> 2: cycle starts at index 2 (value 5)
~~~

**Example 2 — Phase step counts, and Floyd versus a hash set** prints:

~~~text
n=10 pos=3: mu=3 lambda=7, met at index 7 after 7 steps, phase 2 took 3 steps, entry index 3
n=10 pos=0: mu=0 lambda=10, met at index 0 after 10 steps, phase 2 took 0 steps, entry index 0
n=10 pos=9: mu=9 lambda=1, met at index 9 after 9 steps, phase 2 took 9 steps, entry index 9
n=6 pos=2: mu=2 lambda=4, met at index 4 after 4 steps, phase 2 took 2 steps, entry index 2
n=100 pos=40: mu=40 lambda=60, met at index 60 after 60 steps, phase 2 took 40 steps, entry index 40
Floyd and the hash set agree on 495 of 495 lists
~~~

**Reading the output:** in the first block, "[5, 5, 5, 5], tail -> 2" finds index 2 even though every value is 5, which is why the function returns a node, not a value. In the second block, "phase 2 took" always equals mu (the \`pos\` the tail points to), and the meeting index varies: for n=10, pos=3 the pointers meet at index 7 after 7 steps (one lap of 7, the smallest multiple of lambda that is at least mu), and for n=100, pos=40 they meet at index 60 after 60 steps (one lap of 60). The last line runs both algorithms on every list of length 1 to 30, with and without a cycle, and they pick the same node every time.

## 7. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Hash set of visited nodes | O(n) | O(n) | every node is inserted once; the first repeat is the entry |
| Floyd, phase 1 | O(n) | O(1) | slow takes at most mu + lambda steps before fast catches it |
| Floyd, phase 2 | O(n) | O(1) | exactly mu steps |
| Mark visited nodes in place | O(n) | O(1) | fast, but it destroys the list (or needs a spare field) |

n is the number of nodes, mu + lambda. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.


In C++ the \`unordered_set\` version allocates a hash node per element; Floyd uses two pointers on the stack and no heap memory at all.

## 8. Edge Cases

- **Empty list:** no cycle; the loop condition fails immediately.
- **One node, next is null:** no cycle.
- **One node pointing to itself:** mu = 0, lambda = 1; the answer is the head.
- **Cycle back to the head** (pos = 0): mu = 0; phase 2 takes zero steps because the pointers already meet at the head.
- **Tail points to itself** (pos = n - 1): the loop is one node long; the answer is the tail.
- **Duplicate values:** compare nodes, never values.

## Common Pitfalls

- **Checking \`slow == fast\` before moving.** Both start at \`head\`, so every list returns the head.
- **Guarding only \`fast->next\`.** If \`fast\` is \`nullptr\`, \`fast->next\` is undefined behaviour; test \`fast != nullptr\` first.
- **Comparing \`slow->val == fast->val\`.** Wrong with duplicate values; compare the pointers.
- **Freeing a cyclic list with a walk-and-delete loop.** It never reaches \`nullptr\` and deletes nodes twice. Break the cycle first (set the tail's \`next\` to \`nullptr\` once you know the entry) or keep ownership elsewhere, as the examples do with \`unique_ptr\`.
- **Printing the list in a loop until \`nullptr\`.** Infinite output on a cyclic list; print a bounded number of nodes.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_set&lt;ListNode*&gt;</code>: the first pointer whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert(...).second</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> is the entry. O(n) time, O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Phase 1:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> moves 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> moves 2 while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast &amp;&amp; fast-&gt;next</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow == fast</code> (same address) means they met in the loop.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Phase 2:</strong> <span style="color:#f0e2c8;">Reset <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow = head</code>, move both by 1; the next <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow == fast</code> is the entry. If fast hit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code>, return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why it works:</strong> <span style="color:#f0e2c8;">At the meeting slow has walked a multiple of the loop length, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mu</code> more steps from the meeting point land on the entry at the same moment as the head pointer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Null checks before every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-&gt;</code>; compare pointers, not values; and a cyclic list needs its cycle broken or separate ownership before it can be freed.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why speeds 1 and 2?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The gap closes by exactly one node per step in the loop, so fast cannot skip slow, and slow has walked whole laps at the meeting, which phase 2 needs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you break the cycle once you have the entry?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Walk from the entry until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p-&gt;next == entry</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p</code> is the tail. Set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p-&gt;next = nullptr</code>. Now the list can be freed normally.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the cycle length?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From the meeting node, advance one pointer until it returns, counting steps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Worst-case steps?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Phase 1 at most mu + lambda, phase 2 exactly mu: O(n) time, O(1) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::set&lt;ListNode*&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works, but it is a balanced tree: O(log n) per insert, O(n log n) overall. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_set</code> is O(1) average per insert.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Cycle in a linked list** | following next pointers never reaches the end |
| **Cycle entry** | the first node of the loop; where the tail points back to |
| **Reference identity** | same object in memory, not just equal values |
| **Floyd's cycle-finding algorithm** | slow moves 1, fast moves 2; they meet inside a cycle |
| **mu (μ)** | steps from the head to the cycle entry |
| **lambda (λ)** | number of nodes in the loop |
| **Rho shape** | tail plus loop, the shape of a list with a cycle |
| **Undefined behaviour** | C++ code whose result the standard does not define, such as dereferencing a null pointer |
| **\`std::unique_ptr\`** | a smart pointer that owns one object and deletes it when it goes out of scope |

---
**Conclusion:** Finding where a cycle begins is two passes of the same idea: a fast and a slow pointer meet inside the loop, then one restarts from the head and both walk at the same speed until they meet at the entry. The proof is one line, the meeting distance is a multiple of the loop length, so mu more steps from the meeting point lands on the entry. It is O(n) time and O(1) space, against the O(n) space of a hash set. In C++ the marks are in the null checks before each \`->\`, comparing addresses rather than values, and thinking about who frees a list that has no end.`,
        examples: [
          { label: `Floyd on lists with and without a cycle`, code: `#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct ListNode {
    int val;
    ListNode* next = nullptr;
    explicit ListNode(int v) : val(v) {}
};

using Owner = std::vector<std::unique_ptr<ListNode>>;

// Linked list from values; the tail points back to index pos (-1 = no cycle).
// The nodes are owned by \`owner\`, because a list with a cycle cannot be freed
// by the usual "walk and delete" loop.
ListNode* build(const std::vector<int>& values, int pos, Owner& owner) {
    owner.clear();
    for (int v : values) owner.push_back(std::make_unique<ListNode>(v));
    for (std::size_t i = 0; i + 1 < owner.size(); ++i) owner[i]->next = owner[i + 1].get();
    if (!owner.empty() && pos >= 0) owner.back()->next = owner[pos].get();
    return owner.empty() ? nullptr : owner[0].get();
}

// Floyd: return the node where the cycle begins, or nullptr.
ListNode* detectCycle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {          // phase 1: same address, they met in the loop
            slow = head;             // phase 2: restart one pointer at the head
            while (slow != fast) {
                slow = slow->next;
                fast = fast->next;
            }
            return slow;
        }
    }
    return nullptr;
}

int indexOf(ListNode* head, ListNode* target) {
    int i = 0;
    for (ListNode* node = head; node != target; node = node->next) ++i;
    return i;
}

std::string fmt(const std::vector<int>& values) {
    std::string s = "[";
    for (std::size_t i = 0; i < values.size(); ++i) s += (i ? ", " : "") + std::to_string(values[i]);
    return s + "]";
}

std::string describe(const std::vector<int>& values, int pos) {
    Owner owner;
    ListNode* head = build(values, pos, owner);
    ListNode* start = detectCycle(head);
    std::string label = fmt(values) + ", tail -> " + std::to_string(pos) + ": ";
    if (start == nullptr) return label + "no cycle";
    return label + "cycle starts at index " + std::to_string(indexOf(head, start)) +
           " (value " + std::to_string(start->val) + ")";
}

int main() {
    std::cout << describe({3, 2, 0, -4}, 1) << "\\n";
    std::cout << describe({1, 2}, 0) << "\\n";
    std::cout << describe({1}, -1) << "\\n";
    std::cout << describe({1}, 0) << "\\n";
    std::cout << describe({}, -1) << "\\n";
    std::cout << describe({1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, 7) << "\\n";
    std::cout << describe({5, 5, 5, 5}, 2) << "\\n";
}
` },
          { label: `Phase step counts, and Floyd versus a hash set`, code: `#include <iostream>
#include <memory>
#include <unordered_set>
#include <vector>

struct ListNode {
    int val;
    ListNode* next = nullptr;
    explicit ListNode(int v) : val(v) {}
};

using Owner = std::vector<std::unique_ptr<ListNode>>;

// Linked list from values; the tail points back to index pos (-1 = no cycle).
// The nodes are owned by \`owner\`, because a list with a cycle cannot be freed
// by the usual "walk and delete" loop.
ListNode* build(const std::vector<int>& values, int pos, Owner& owner) {
    owner.clear();
    for (int v : values) owner.push_back(std::make_unique<ListNode>(v));
    for (std::size_t i = 0; i + 1 < owner.size(); ++i) owner[i]->next = owner[i + 1].get();
    if (!owner.empty() && pos >= 0) owner.back()->next = owner[pos].get();
    return owner.empty() ? nullptr : owner[0].get();
}

// Floyd: return the node where the cycle begins, or nullptr.
ListNode* detectCycle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {          // phase 1: same address, they met in the loop
            slow = head;             // phase 2: restart one pointer at the head
            while (slow != fast) {
                slow = slow->next;
                fast = fast->next;
            }
            return slow;
        }
    }
    return nullptr;
}

int indexOf(ListNode* head, ListNode* target) {
    int i = 0;
    for (ListNode* node = head; node != target; node = node->next) ++i;
    return i;
}

struct Trace { ListNode* start; ListNode* meet; int phase1; int phase2; };

// Floyd again, counting the steps of each phase.
Trace floydTrace(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    int phase1 = 0;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        ++phase1;
        if (slow == fast) {
            ListNode* meet = slow;
            slow = head;
            int phase2 = 0;
            while (slow != fast) {
                slow = slow->next;
                fast = fast->next;
                ++phase2;
            }
            return {slow, meet, phase1, phase2};
        }
    }
    return {nullptr, nullptr, phase1, 0};
}

// O(n)-space version: the first node seen twice is the entry.
ListNode* hashStart(ListNode* head) {
    std::unordered_set<ListNode*> seen;            // hashes the pointer (the address)
    for (ListNode* node = head; node != nullptr; node = node->next) {
        if (!seen.insert(node).second) return node; // .second is false if already present
    }
    return nullptr;
}

std::vector<int> range(int n) {
    std::vector<int> a(n);
    for (int i = 0; i < n; ++i) a[i] = i;
    return a;
}

int main() {
    std::vector<std::pair<int, int>> cases = {{10, 3}, {10, 0}, {10, 9}, {6, 2}, {100, 40}};
    for (auto [n, pos] : cases) {
        Owner owner;
        ListNode* head = build(range(n), pos, owner);
        Trace t = floydTrace(head);
        std::cout << "n=" << n << " pos=" << pos << ": mu=" << pos << " lambda=" << (n - pos)
                  << ", met at index " << indexOf(head, t.meet) << " after " << t.phase1
                  << " steps, phase 2 took " << t.phase2 << " steps, entry index "
                  << indexOf(head, t.start) << "\\n";
    }
    int agree = 0, total = 0;
    for (int n = 1; n <= 30; ++n) {
        for (int pos = -1; pos < n; ++pos) {
            Owner owner;
            ListNode* head = build(range(n), pos, owner);
            ++total;
            if (detectCycle(head) == hashStart(head)) ++agree;
        }
    }
    std::cout << "Floyd and the hash set agree on " << agree << " of " << total << " lists\\n";
}
` },
        ],
      },
    },
  },
  {
    title: `How do you check if a linked list is a palindrome?`,
    difficulty: "easy",
    seoDescription: `Palindrome linked list in Python, JavaScript, Java and C++: find the middle, reverse the second half, compare, restore. O(n) time, O(1) space.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given the head of a singly linked list, return True if its values read the same forwards and backwards. First tell me the simple way, then do it in O(1) extra space. Please write it in Python."

**What a strong answer should cover:**
- The simple version: copy values into a Python list and compare (\`vals == vals[::-1]\`), O(n) time and O(n) space.
- The O(1)-space version: find the middle with fast and slow pointers, reverse the second half in place, compare value by value, then reverse it back.
- Correct middle for odd and even lengths, and a comparison loop driven by the shorter (second) half.
- Restoring the list before returning, even when the answer is False.
- Python specifics: the tuple-assignment reversal \`head.next, prev, head = prev, head, head.next\` (order matters), compare \`val\` with \`==\`, and the recursive version hits the default recursion limit of 1000 on long lists.

**Clarifying questions expected:**
- "Is O(n) extra space allowed? May I modify the list temporarily?"
- "Is an empty list a palindrome?"

**Code / implementation expected:** Yes — \`is_palindrome(head)\` in Python, ideally the O(1)-space version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a conga line of people, each holding the shoulders of the person in front. Every person wears a number on their back. You want to know whether the numbers read the same from the front of the line as from the back. With a row of chairs you would simply look at both ends. But in a conga line you can only start at the front and walk forward, one shoulder at a time; nobody is holding anyone from behind.

One easy trick is to write every number on a notepad as you walk, then read the notepad both ways. That works, but it needs a notepad as long as the line. The clever trick needs no notepad: walk to the middle of the line, ask the back half to turn around so they face the other way, then send one walker from the front and one from the (new) front of the back half and compare numbers pair by pair. Afterwards, ask the back half to turn around again so the line is exactly as you found it.

That is the interview question. A singly linked list only lets you move forward, so the "check both ends" idea from [valid palindrome for strings](/interview-question/how-do-you-check-if-a-string-is-a-valid-palindrome) does not work directly. The question tests three linked-list skills at once: [finding the middle of a linked list](/interview-question/how-do-you-find-the-middle-of-a-linked-list), [reversing a linked list](/interview-question/how-do-you-reverse-a-linked-list) and walking two lists side by side.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is O(n) extra memory allowed? | If yes, copy the values into an array and compare from both ends. The follow-up is usually O(1) space. |
| May I modify the list, and must it be restored? | The O(1) solution reverses half the list; well-behaved code puts it back before returning. |
| What counts as equal: the stored values only? | Values are compared, not nodes. Ask how values are typed (ints, strings). |
| Is an empty list or a single node a palindrome? | Normally yes, both read the same both ways. |
| Can other code read the list while I check it? | Temporarily reversing half the list is unsafe if another thread reads it at the same time. |

## 3. The Core Idea

📌 **Interview term: Palindrome** — a sequence that reads the same forwards and backwards, such as 1, 2, 3, 2, 1.

📌 **Interview term: Singly linked list** — each node stores a value and a pointer to the **next** node only, so you can walk forwards but never backwards, and there is no index lookup. (See [arrays versus linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).)

### Approach 1: copy to an array

Walk the list once and push every value into an array (or list, or vector). Then compare the array from both ends with two indices. Simple and hard to get wrong: O(n) time, but **O(n) extra space**.

### Approach 2: reverse the second half (O(1) space)

Four steps:

1. **Find the middle** with fast and slow pointers: \`slow\` moves one node, \`fast\` moves two. Stop when \`fast\` cannot take two more steps. \`slow\` is then the **last node of the first half**.
2. **Reverse the second half**, the part after \`slow\`, with the usual three-pointer in-place reversal.
3. **Compare** the first half (from the head) with the reversed second half, one pair at a time, until the second half runs out.
4. **Restore** the list by reversing the second half again and reattaching it to \`slow\`.

📌 **Interview term: Fast and slow pointers** — two pointers moving at different speeds through the same list; when the fast one reaches the end, the slow one is at the middle. See [the fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique).

<svg class="iq-diagram" width="100%" viewBox="0 0 600 230" role="img" aria-label="List 1 2 3 2 1 with slow stopped on the middle node and fast on the last node, the second half starts after slow">
  <defs>
    <marker id="lp1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="70" y="99" text-anchor="middle">1</text>
  <rect class="d-box" x="150" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="180" y="99" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="260" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="290" y="99" text-anchor="middle">3</text>
  <rect class="d-box" x="370" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="400" y="99" text-anchor="middle">2</text>
  <rect class="d-box" x="480" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="510" y="99" text-anchor="middle">1</text>
  <path class="d-edge" d="M 102 93 L 144 93" fill="none" marker-end="url(#lp1-arrow)"/>
  <path class="d-edge" d="M 212 93 L 254 93" fill="none" marker-end="url(#lp1-arrow)"/>
  <path class="d-edge" d="M 322 93 L 364 93" fill="none" marker-end="url(#lp1-arrow)"/>
  <path class="d-edge" d="M 432 93 L 474 93" fill="none" marker-end="url(#lp1-arrow)"/>
  <text class="d-text d-accent" x="290" y="50" text-anchor="middle">slow</text>
  <text class="d-text d-accent" x="510" y="50" text-anchor="middle">fast</text>
  <rect class="d-box-muted" x="40" y="150" width="280" height="56" rx="8"/>
  <text class="d-text" x="180" y="174" text-anchor="middle">first half</text>
  <text class="d-sub" x="180" y="196" text-anchor="middle">head to slow</text>
  <rect class="d-box-muted" x="370" y="150" width="170" height="56" rx="8"/>
  <text class="d-text" x="455" y="174" text-anchor="middle">second half</text>
  <text class="d-sub" x="455" y="196" text-anchor="middle">slow.next onward</text>
</svg>

The loop condition \`fast.next and fast.next.next\` stops \`slow\` on the middle node for an odd length (here the 3) and on the last node of the first half for an even length (for 1, 2, 2, 1 it stops on the first 2). Either way the second half starts at \`slow.next\`.

📌 **Interview term: In-place reversal** — reversing a list by changing each node's \`next\` pointer to the previous node, using O(1) extra memory (three pointers: previous, current, next).

<svg class="iq-diagram" width="100%" viewBox="0 0 600 310" role="img" aria-label="After reversing the second half, a pointer from the head and a pointer from the old tail compare 1 with 1 and 2 with 2">
  <defs>
    <marker id="lp2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="60" y="40" text-anchor="start">from head</text>
  <rect class="d-box" x="60" y="56" width="60" height="46" rx="8"/>
  <text class="d-text" x="90" y="85" text-anchor="middle">1</text>
  <rect class="d-box" x="200" y="56" width="60" height="46" rx="8"/>
  <text class="d-text" x="230" y="85" text-anchor="middle">2</text>
  <rect class="d-box" x="340" y="56" width="60" height="46" rx="8"/>
  <text class="d-text" x="370" y="85" text-anchor="middle">3</text>
  <path class="d-edge" d="M 122 79 L 194 79" fill="none" marker-end="url(#lp2-arrow)"/>
  <path class="d-edge" d="M 262 79 L 334 79" fill="none" marker-end="url(#lp2-arrow)"/>
  <text class="d-sub" x="60" y="284" text-anchor="start">from old tail</text>
  <rect class="d-box-accent" x="60" y="206" width="60" height="46" rx="8"/>
  <text class="d-text" x="90" y="235" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="200" y="206" width="60" height="46" rx="8"/>
  <text class="d-text" x="230" y="235" text-anchor="middle">2</text>
  <path class="d-edge" d="M 122 229 L 194 229" fill="none" marker-end="url(#lp2-arrow)"/>
  <path class="d-edge-dashed" d="M 90 108 L 90 200" fill="none"/>
  <path class="d-edge-dashed" d="M 230 108 L 230 200" fill="none"/>
  <text class="d-sub" x="150" y="160" text-anchor="middle">equal</text>
  <text class="d-sub" x="290" y="160" text-anchor="middle">equal</text>
  <path class="d-edge" d="M 262 229 C 330 229, 370 160, 370 108" fill="none" marker-end="url(#lp2-arrow)"/>
  <text class="d-sub" x="470" y="170" text-anchor="middle">points to 3</text>
</svg>

For an odd length the middle node belongs to the first half and is never compared, because it matches itself. The comparison loop runs while the **reversed second half** has nodes, since it is never longer than the first half.

📌 **Interview term: Restoring the input** — undoing a temporary change (here, reversing the second half back) before returning, so the caller gets the list exactly as it was. Interviewers notice when you do this without being asked.

## 4. The Solution in Python

~~~python
def reverse(head):
    prev = None
    while head:
        head.next, prev, head = prev, head, head.next
    return prev


def is_palindrome(head):
    """O(1) extra space: reverse the second half, compare, then restore it."""
    if head is None or head.next is None:
        return True
    slow = fast = head
    while fast.next and fast.next.next:       # slow ends on the last node of the first half
        slow = slow.next
        fast = fast.next.next
    second = reverse(slow.next)
    p1, p2, result = head, second, True
    while p2:                                 # the second half is never longer
        if p1.val != p2.val:
            result = False
            break
        p1, p2 = p1.next, p2.next
    slow.next = reverse(second)               # put the list back as it was
    return result
~~~

**Why each line is there:**

- The early return handles \`None\` and a single node, so the loop below can read \`fast.next\` safely.
- \`while fast.next and fast.next.next\` stops \`slow\` on the **last node of the first half**, which is the node whose \`next\` we must reattach later.
- \`reverse\` uses Python tuple assignment. The right side is evaluated first (\`prev, head, head.next\`), then assigned left to right. The order on the left matters: \`head.next\` must be assigned while \`head\` still names the current node, so it comes first.
- The comparison stores \`result\` and breaks instead of returning, so the restore line always runs.

### The simple version

~~~python
def is_palindrome_array(head):
    vals = []
    while head:
        vals.append(head.val)
        head = head.next
    return vals == vals[::-1]
~~~

Python makes this a one-liner after the copy: \`vals[::-1]\` builds a reversed copy and \`==\` compares element by element. It is a perfectly good first answer; mention the O(n) memory and offer the O(1) version. (Example 2 uses a two-index loop instead, which avoids the second copy.)

**Why not recursion?** A recursive "compare on the way back up" version is elegant but uses one call frame per node. Python's default recursion limit is 1000 (\`sys.getrecursionlimit()\` printed \`1000\` here), and a test function recursing 5000 deep raised \`RecursionError: maximum recursion depth exceeded\`.

## 5. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Reverse-the-second-half check, with the list printed afterwards** prints:

~~~text
[1, 2, 2, 1] => true, list after: [1, 2, 2, 1]
[1, 2] => false, list after: [1, 2]
[1] => true, list after: [1]
[] => true, list after: []
[1, 2, 3, 2, 1] => true, list after: [1, 2, 3, 2, 1]
[1, 2, 3, 1] => false, list after: [1, 2, 3, 1]
[7, 7, 7] => true, list after: [7, 7, 7]
[1, 0, 0] => false, list after: [1, 0, 0]
~~~

**Example 2 — Every 0/1 list up to 8 nodes, against the array version** prints:

~~~text
lists checked: 511
palindromes: 61
disagreements with the array version: 0
lists changed by the check: 0
without restoring, head now reaches: [1, 2, 3, 2]
~~~

**Reading the output:** in Example 1 every list prints the same values after the check as before, which shows the restore step works; \`[]\` and \`[1]\` are palindromes, \`[1, 2]\` and \`[1, 0, 0]\` are not. Example 2 runs the O(1)-space check and the copy-to-array check on all 511 lists of 0 to 8 nodes made of 0s and 1s: they agree on every one (61 of them are palindromes), and no list is changed. The last line shows what happens if you skip the restore on \`[1, 2, 3, 2, 1]\`: from the head you can now reach only four nodes, because the last node of the first half still points at the old fourth node, which became the tail of the reversed half.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy values into an array | O(n) | O(n) | one walk to copy, one two-index comparison |
| Push values on a stack, walk again | O(n) | O(n) | the stack replays the values backwards |
| Recursion with a front pointer | O(n) | O(n) call stack | each node waits on the call stack |
| Reverse second half, compare, restore | O(n) | O(1) | about n/2 + n/2 + n/2 + n/2 pointer steps, only a few pointers |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Empty list** and **one node:** palindromes; return early before touching pointers.
- **Two nodes:** a palindrome only if both values are equal (\`[1, 2]\` is false, \`[7, 7]\` is true).
- **Odd versus even length:** the middle node of an odd list is skipped; check both lengths in tests.
- **All values equal** (\`[7, 7, 7]\`): a palindrome, a good check that the comparison is by value.
- **Mismatch in the middle of the comparison:** still restore the list before returning \`false\`; store the result, do not return early.

## Common Pitfalls

- **Reordering the tuple assignment.** \`prev, head, head.next = head, head.next, prev\` assigns \`head\` before \`head.next\`, so the flip is written onto the next node instead of the current one; in a test run on a 3-node list it raised \`AttributeError\` as soon as \`head\` became \`None\`. Keep \`head.next\` first, or use an explicit \`nxt = head.next\` temporary.
- **Returning before restoring.** \`return False\` inside the comparison loop leaves the list half-reversed; store the result and restore first.
- **Wrong loop condition for the middle.** \`while fast and fast.next\` (the find-middle version) puts \`slow\` on the *second* middle for even lengths; that still works if you compare from \`slow\` itself, but mixing the two conventions causes off-by-one errors.
- **Comparing nodes with \`is\`.** Here you compare **values** (\`p1.val != p2.val\`); the nodes are always different objects.
- **Assuming \`vals[::-1]\` is free.** It allocates a full copy; fine for the warm-up, not for the O(1)-space ask.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Warm-up:</strong> <span style="color:#f0e2c8;">Copy values into a list and return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vals == vals[::-1]</code>. O(n) time, O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Find the middle:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> 1 step, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> 2 steps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while fast.next and fast.next.next</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> is the last node of the first half.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reverse and compare:</strong> <span style="color:#f0e2c8;">Reverse <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow.next</code> in place, then walk from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code> and from the reversed half comparing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val</code>s until the half runs out.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Restore:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow.next = reverse(second)</code> before returning, even on a mismatch. O(n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head.next, prev, head = prev, head, head.next</code> the left-hand order matters; recursion would hit the default limit of 1000 frames.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the middle node not need comparing in an odd list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is in the first half and has no partner; it matches itself. The loop runs only while the reversed second half has nodes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it without modifying the list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in O(1) space with a singly linked list. Without modifying it you need O(n) memory: a list copy, a stack, or the call stack of a recursive version.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if another thread reads the list while you check it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It would see a half-reversed list. Then use the O(n)-space copy, or hold a lock for the whole check.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the recursive version work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">front</code> pointer outside the recursion; recurse to the end, and on the way back compare each node with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">front</code> and advance it. O(n) stack, so long lists raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RecursionError</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the cost in pointer steps?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">About n/2 to find the middle, n/2 to reverse, up to n/2 to compare, n/2 to restore: still O(n).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Palindrome** | reads the same forwards and backwards |
| **Singly linked list** | each node points only to the next node |
| **Fast and slow pointers** | pointers at speeds 2 and 1; slow ends at the middle |
| **In-place reversal** | flip every next pointer with O(1) extra memory |
| **Restoring the input** | undo a temporary change before returning |
| **Tuple assignment** | Python evaluates the whole right side, then assigns targets left to right |

---
**Conclusion:** Checking a linked list for a palindrome combines three small skills: find the middle with fast and slow pointers, reverse the second half in place, and walk two lists side by side comparing values. That gives O(n) time and O(1) space; copying to an array gives the same time with O(n) space and is the right warm-up. Restore the list before returning, even when the answer is false. In Python, say the \`vals == vals[::-1]\` warm-up first, then write the half-reversal with the tuple-assignment order right and the restore line guaranteed to run.`,
        examples: [
          { label: `Reverse-the-second-half check, with the list printed afterwards`, code: `class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next


def build(values):
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head


def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out


def reverse(head):
    prev = None
    while head:
        head.next, prev, head = prev, head, head.next
    return prev


def is_palindrome(head):
    """O(1) extra space: reverse the second half, compare, then restore it."""
    if head is None or head.next is None:
        return True
    slow = fast = head
    while fast.next and fast.next.next:       # slow ends on the last node of the first half
        slow = slow.next
        fast = fast.next.next
    second = reverse(slow.next)
    p1, p2, result = head, second, True
    while p2:                                 # the second half is never longer
        if p1.val != p2.val:
            result = False
            break
        p1, p2 = p1.next, p2.next
    slow.next = reverse(second)               # put the list back as it was
    return result


def fmt(values):
    return "[" + ", ".join(str(v) for v in values) + "]"


def check(values):
    head = build(values)
    answer = is_palindrome(head)
    return fmt(values) + " => " + str(answer).lower() + ", list after: " + fmt(to_list(head))


print(check([1, 2, 2, 1]))  # [1, 2, 2, 1] => true, list after: [1, 2, 2, 1]
print(check([1, 2]))  # [1, 2] => false, list after: [1, 2]
print(check([1]))  # [1] => true, list after: [1]
print(check([]))  # [] => true, list after: []
print(check([1, 2, 3, 2, 1]))  # [1, 2, 3, 2, 1] => true, list after: [1, 2, 3, 2, 1]
print(check([1, 2, 3, 1]))  # [1, 2, 3, 1] => false, list after: [1, 2, 3, 1]
print(check([7, 7, 7]))  # [7, 7, 7] => true, list after: [7, 7, 7]
print(check([1, 0, 0]))  # [1, 0, 0] => false, list after: [1, 0, 0]
` },
          { label: `Every 0/1 list up to 8 nodes, against the array version`, code: `class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next


def build(values):
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head


def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out


def reverse(head):
    prev = None
    while head:
        head.next, prev, head = prev, head, head.next
    return prev


def is_palindrome(head):
    """O(1) extra space: reverse the second half, compare, then restore it."""
    if head is None or head.next is None:
        return True
    slow = fast = head
    while fast.next and fast.next.next:       # slow ends on the last node of the first half
        slow = slow.next
        fast = fast.next.next
    second = reverse(slow.next)
    p1, p2, result = head, second, True
    while p2:                                 # the second half is never longer
        if p1.val != p2.val:
            result = False
            break
        p1, p2 = p1.next, p2.next
    slow.next = reverse(second)               # put the list back as it was
    return result


def fmt(values):
    return "[" + ", ".join(str(v) for v in values) + "]"


def is_palindrome_array(head):
    """O(n) extra space: copy the values, compare from both ends."""
    vals = to_list(head)
    i, j = 0, len(vals) - 1
    while i < j:
        if vals[i] != vals[j]:
            return False
        i += 1
        j -= 1
    return True


checked = palindromes = disagreements = changed = 0
for length in range(0, 9):
    for mask in range(1 << length):
        values = [(mask >> b) & 1 for b in range(length)]
        head = build(values)
        fast_answer = is_palindrome(head)
        if to_list(head) != values:
            changed += 1
        if fast_answer != is_palindrome_array(head):
            disagreements += 1
        checked += 1
        palindromes += fast_answer
print("lists checked: " + str(checked))
print("palindromes: " + str(palindromes))
print("disagreements with the array version: " + str(disagreements))
print("lists changed by the check: " + str(changed))

# What goes wrong if you skip the restore step
head = build([1, 2, 3, 2, 1])
slow = head.next.next                  # the middle node, where the loop stops
reverse(slow.next)                     # reverse the second half and do not put it back
print("without restoring, head now reaches: " + fmt(to_list(head)))
` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given the head of a singly linked list, return true if its values read the same forwards and backwards. Start with the simple way, then do it in O(1) extra space. Please write it in JavaScript."

**What a strong answer should cover:**
- The simple version: copy values into an array and compare from both ends, O(n) time and O(n) space.
- The O(1)-space version: find the middle with fast and slow pointers, reverse the second half in place, compare value by value, then reverse it back.
- Correct middle for odd and even lengths; the comparison loop runs while the reversed half has nodes.
- Restoring the list before returning, even when the answer is false.
- JavaScript specifics: compare values with \`!==\` (strict, no type coercion), never compare two arrays with \`===\` (that checks references), and remember \`Array.prototype.reverse()\` reverses in place.

**Clarifying questions expected:**
- "Is O(n) extra space allowed? May I modify the list temporarily?"
- "Are the values numbers, or could they be strings?"

**Code / implementation expected:** Yes — \`isPalindrome(head)\` in JavaScript, ideally the O(1)-space version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a conga line of people, each holding the shoulders of the person in front. Every person wears a number on their back. You want to know whether the numbers read the same from the front of the line as from the back. With a row of chairs you would simply look at both ends. But in a conga line you can only start at the front and walk forward, one shoulder at a time; nobody is holding anyone from behind.

One easy trick is to write every number on a notepad as you walk, then read the notepad both ways. That works, but it needs a notepad as long as the line. The clever trick needs no notepad: walk to the middle of the line, ask the back half to turn around so they face the other way, then send one walker from the front and one from the (new) front of the back half and compare numbers pair by pair. Afterwards, ask the back half to turn around again so the line is exactly as you found it.

That is the interview question. A singly linked list only lets you move forward, so the "check both ends" idea from [valid palindrome for strings](/interview-question/how-do-you-check-if-a-string-is-a-valid-palindrome) does not work directly. The question tests three linked-list skills at once: [finding the middle of a linked list](/interview-question/how-do-you-find-the-middle-of-a-linked-list), [reversing a linked list](/interview-question/how-do-you-reverse-a-linked-list) and walking two lists side by side.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is O(n) extra memory allowed? | If yes, copy the values into an array and compare from both ends. The follow-up is usually O(1) space. |
| May I modify the list, and must it be restored? | The O(1) solution reverses half the list; well-behaved code puts it back before returning. |
| What counts as equal: the stored values only? | Values are compared, not nodes. Ask how values are typed (ints, strings). |
| Is an empty list or a single node a palindrome? | Normally yes, both read the same both ways. |
| Can other code read the list while I check it? | Temporarily reversing half the list is unsafe if another thread reads it at the same time. |

## 3. The Core Idea

📌 **Interview term: Palindrome** — a sequence that reads the same forwards and backwards, such as 1, 2, 3, 2, 1.

📌 **Interview term: Singly linked list** — each node stores a value and a pointer to the **next** node only, so you can walk forwards but never backwards, and there is no index lookup. (See [arrays versus linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).)

### Approach 1: copy to an array

Walk the list once and push every value into an array (or list, or vector). Then compare the array from both ends with two indices. Simple and hard to get wrong: O(n) time, but **O(n) extra space**.

### Approach 2: reverse the second half (O(1) space)

Four steps:

1. **Find the middle** with fast and slow pointers: \`slow\` moves one node, \`fast\` moves two. Stop when \`fast\` cannot take two more steps. \`slow\` is then the **last node of the first half**.
2. **Reverse the second half**, the part after \`slow\`, with the usual three-pointer in-place reversal.
3. **Compare** the first half (from the head) with the reversed second half, one pair at a time, until the second half runs out.
4. **Restore** the list by reversing the second half again and reattaching it to \`slow\`.

📌 **Interview term: Fast and slow pointers** — two pointers moving at different speeds through the same list; when the fast one reaches the end, the slow one is at the middle. See [the fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique).

<svg class="iq-diagram" width="100%" viewBox="0 0 600 230" role="img" aria-label="List 1 2 3 2 1 with slow stopped on the middle node and fast on the last node, the second half starts after slow">
  <defs>
    <marker id="lp1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="70" y="99" text-anchor="middle">1</text>
  <rect class="d-box" x="150" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="180" y="99" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="260" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="290" y="99" text-anchor="middle">3</text>
  <rect class="d-box" x="370" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="400" y="99" text-anchor="middle">2</text>
  <rect class="d-box" x="480" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="510" y="99" text-anchor="middle">1</text>
  <path class="d-edge" d="M 102 93 L 144 93" fill="none" marker-end="url(#lp1-arrow)"/>
  <path class="d-edge" d="M 212 93 L 254 93" fill="none" marker-end="url(#lp1-arrow)"/>
  <path class="d-edge" d="M 322 93 L 364 93" fill="none" marker-end="url(#lp1-arrow)"/>
  <path class="d-edge" d="M 432 93 L 474 93" fill="none" marker-end="url(#lp1-arrow)"/>
  <text class="d-text d-accent" x="290" y="50" text-anchor="middle">slow</text>
  <text class="d-text d-accent" x="510" y="50" text-anchor="middle">fast</text>
  <rect class="d-box-muted" x="40" y="150" width="280" height="56" rx="8"/>
  <text class="d-text" x="180" y="174" text-anchor="middle">first half</text>
  <text class="d-sub" x="180" y="196" text-anchor="middle">head to slow</text>
  <rect class="d-box-muted" x="370" y="150" width="170" height="56" rx="8"/>
  <text class="d-text" x="455" y="174" text-anchor="middle">second half</text>
  <text class="d-sub" x="455" y="196" text-anchor="middle">slow.next onward</text>
</svg>

The loop condition \`fast.next and fast.next.next\` stops \`slow\` on the middle node for an odd length (here the 3) and on the last node of the first half for an even length (for 1, 2, 2, 1 it stops on the first 2). Either way the second half starts at \`slow.next\`.

📌 **Interview term: In-place reversal** — reversing a list by changing each node's \`next\` pointer to the previous node, using O(1) extra memory (three pointers: previous, current, next).

<svg class="iq-diagram" width="100%" viewBox="0 0 600 310" role="img" aria-label="After reversing the second half, a pointer from the head and a pointer from the old tail compare 1 with 1 and 2 with 2">
  <defs>
    <marker id="lp2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="60" y="40" text-anchor="start">from head</text>
  <rect class="d-box" x="60" y="56" width="60" height="46" rx="8"/>
  <text class="d-text" x="90" y="85" text-anchor="middle">1</text>
  <rect class="d-box" x="200" y="56" width="60" height="46" rx="8"/>
  <text class="d-text" x="230" y="85" text-anchor="middle">2</text>
  <rect class="d-box" x="340" y="56" width="60" height="46" rx="8"/>
  <text class="d-text" x="370" y="85" text-anchor="middle">3</text>
  <path class="d-edge" d="M 122 79 L 194 79" fill="none" marker-end="url(#lp2-arrow)"/>
  <path class="d-edge" d="M 262 79 L 334 79" fill="none" marker-end="url(#lp2-arrow)"/>
  <text class="d-sub" x="60" y="284" text-anchor="start">from old tail</text>
  <rect class="d-box-accent" x="60" y="206" width="60" height="46" rx="8"/>
  <text class="d-text" x="90" y="235" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="200" y="206" width="60" height="46" rx="8"/>
  <text class="d-text" x="230" y="235" text-anchor="middle">2</text>
  <path class="d-edge" d="M 122 229 L 194 229" fill="none" marker-end="url(#lp2-arrow)"/>
  <path class="d-edge-dashed" d="M 90 108 L 90 200" fill="none"/>
  <path class="d-edge-dashed" d="M 230 108 L 230 200" fill="none"/>
  <text class="d-sub" x="150" y="160" text-anchor="middle">equal</text>
  <text class="d-sub" x="290" y="160" text-anchor="middle">equal</text>
  <path class="d-edge" d="M 262 229 C 330 229, 370 160, 370 108" fill="none" marker-end="url(#lp2-arrow)"/>
  <text class="d-sub" x="470" y="170" text-anchor="middle">points to 3</text>
</svg>

For an odd length the middle node belongs to the first half and is never compared, because it matches itself. The comparison loop runs while the **reversed second half** has nodes, since it is never longer than the first half.

📌 **Interview term: Restoring the input** — undoing a temporary change (here, reversing the second half back) before returning, so the caller gets the list exactly as it was. Interviewers notice when you do this without being asked.

## 4. The Solution in JavaScript

~~~javascript
function reverse(head) {
  let prev = null;
  while (head !== null) {
    const next = head.next;
    head.next = prev;
    prev = head;
    head = next;
  }
  return prev;
}

// O(1) extra space: reverse the second half, compare, then restore it.
function isPalindrome(head) {
  if (head === null || head.next === null) return true;
  let slow = head;
  let fast = head;
  while (fast.next !== null && fast.next.next !== null) { // slow ends on the last node of the first half
    slow = slow.next;
    fast = fast.next.next;
  }
  const second = reverse(slow.next);
  let p1 = head;
  let p2 = second;
  let result = true;
  while (p2 !== null) {                                   // the second half is never longer
    if (p1.val !== p2.val) {
      result = false;
      break;
    }
    p1 = p1.next;
    p2 = p2.next;
  }
  slow.next = reverse(second);                            // put the list back as it was
  return result;
}
~~~

**Why each line is there:**

- The early return covers \`null\` and one node, so \`fast.next\` is safe to read in the loop condition.
- \`fast.next !== null && fast.next.next !== null\` stops \`slow\` on the **last node of the first half**, the node we reattach to at the end.
- \`reverse\` needs the \`next\` temporary: once \`head.next = prev\` runs, the rest of the list is reachable only through \`next\`.
- \`p1.val !== p2.val\` is strict comparison: \`1 !== "1"\` is true, so a number and a string never count as equal by accident.
- \`result\` plus \`break\` (instead of \`return false\`) guarantees the restore line runs.

### The simple version

~~~javascript
function isPalindromeArray(head) {
  const vals = [];
  for (let node = head; node !== null; node = node.next) vals.push(node.val);
  for (let i = 0, j = vals.length - 1; i < j; i++, j--) {
    if (vals[i] !== vals[j]) return false;
  }
  return true;
}
~~~

A shortcut like \`vals.join() === [...vals].reverse().join()\` also works for numbers, but it builds strings and copies; and \`vals === vals.slice().reverse()\` is always \`false\`, because \`===\` on arrays compares references. Note that \`vals.reverse()\` without the copy reverses \`vals\` itself.

## 5. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Reverse-the-second-half check, with the list printed afterwards** prints:

~~~text
[1, 2, 2, 1] => true, list after: [1, 2, 2, 1]
[1, 2] => false, list after: [1, 2]
[1] => true, list after: [1]
[] => true, list after: []
[1, 2, 3, 2, 1] => true, list after: [1, 2, 3, 2, 1]
[1, 2, 3, 1] => false, list after: [1, 2, 3, 1]
[7, 7, 7] => true, list after: [7, 7, 7]
[1, 0, 0] => false, list after: [1, 0, 0]
~~~

**Example 2 — Every 0/1 list up to 8 nodes, against the array version** prints:

~~~text
lists checked: 511
palindromes: 61
disagreements with the array version: 0
lists changed by the check: 0
without restoring, head now reaches: [1, 2, 3, 2]
~~~

**Reading the output:** in Example 1 every list prints the same values after the check as before, which shows the restore step works; \`[]\` and \`[1]\` are palindromes, \`[1, 2]\` and \`[1, 0, 0]\` are not. Example 2 runs the O(1)-space check and the copy-to-array check on all 511 lists of 0 to 8 nodes made of 0s and 1s: they agree on every one (61 of them are palindromes), and no list is changed. The last line shows what happens if you skip the restore on \`[1, 2, 3, 2, 1]\`: from the head you can now reach only four nodes, because the last node of the first half still points at the old fourth node, which became the tail of the reversed half.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy values into an array | O(n) | O(n) | one walk to copy, one two-index comparison |
| Push values on a stack, walk again | O(n) | O(n) | the stack replays the values backwards |
| Recursion with a front pointer | O(n) | O(n) call stack | each node waits on the call stack |
| Reverse second half, compare, restore | O(n) | O(1) | about n/2 + n/2 + n/2 + n/2 pointer steps, only a few pointers |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Empty list** and **one node:** palindromes; return early before touching pointers.
- **Two nodes:** a palindrome only if both values are equal (\`[1, 2]\` is false, \`[7, 7]\` is true).
- **Odd versus even length:** the middle node of an odd list is skipped; check both lengths in tests.
- **All values equal** (\`[7, 7, 7]\`): a palindrome, a good check that the comparison is by value.
- **Mismatch in the middle of the comparison:** still restore the list before returning \`false\`; store the result, do not return early.

## Common Pitfalls

- **Forgetting the \`next\` temporary in \`reverse\`.** After \`head.next = prev\` the rest of the list is lost.
- **Returning before restoring.** \`return false\` inside the loop leaves the caller with a half-reversed list.
- **Comparing arrays with \`===\`.** \`[1, 2] === [1, 2]\` is \`false\`; compare element by element.
- **Loose equality.** \`p1.val != p2.val\` treats \`1\` and \`"1"\` as equal; use \`!==\`.
- **Reading \`fast.next.next\` without checking \`fast.next\`.** Throws \`TypeError: Cannot read properties of null (reading 'next')\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Warm-up:</strong> <span style="color:#f0e2c8;">Push values into an array and compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vals[i]</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vals[j]</code> from both ends. O(n) time, O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Find the middle:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> 1 step, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> 2 steps while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast.next !== null &amp;&amp; fast.next.next !== null</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> ends on the last node of the first half.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reverse and compare:</strong> <span style="color:#f0e2c8;">Reverse <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow.next</code> in place, walk both halves comparing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">val</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!==</code> until the reversed half ends.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Restore:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow.next = reverse(second)</code> before returning, even on a mismatch. O(n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Strict <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!==</code> for values, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code> on arrays, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reverse()</code> mutates the array it is called on.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the middle node of an odd list skipped?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It stays in the first half and has no partner; the loop runs only while the reversed half has nodes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you avoid modifying the list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in O(1) space with a singly linked list; without modification you need an array, a stack or recursion, all O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about a recursive solution?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">front</code> variable outside, recurse to the end and compare on the way back. It uses O(n) stack, and a very long list throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError: Maximum call stack size exceeded</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the values are objects?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Decide what equal means: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!==</code> compares references, so two equal-looking objects would differ. Compare a key field or a serialised form.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the temporary reversal safe if a callback reads the list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No; anything that reads the list during the check sees it half-reversed. Use the array version if that can happen.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Palindrome** | reads the same forwards and backwards |
| **Singly linked list** | each node points only to the next node |
| **Fast and slow pointers** | pointers at speeds 2 and 1; slow ends at the middle |
| **In-place reversal** | flip every next pointer with O(1) extra memory |
| **Restoring the input** | undo a temporary change before returning |
| **Strict equality (\`===\`)** | compares without type conversion; for objects and arrays, compares references |

---
**Conclusion:** Checking a linked list for a palindrome combines three small skills: find the middle with fast and slow pointers, reverse the second half in place, and walk two lists side by side comparing values. That gives O(n) time and O(1) space; copying to an array gives the same time with O(n) space and is the right warm-up. Restore the list before returning, even when the answer is false. In JavaScript, mention the array warm-up, then write the half-reversal with the \`next\` temporary, strict comparisons and a restore that always runs.`,
        examples: [
          { label: `Reverse-the-second-half check, with the list printed afterwards`, code: `class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

function build(values) {
  let head = null;
  for (let i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
  return head;
}

function toArray(head) {
  const out = [];
  for (let node = head; node !== null; node = node.next) out.push(node.val);
  return out;
}

function reverse(head) {
  let prev = null;
  while (head !== null) {
    const next = head.next;
    head.next = prev;
    prev = head;
    head = next;
  }
  return prev;
}

// O(1) extra space: reverse the second half, compare, then restore it.
function isPalindrome(head) {
  if (head === null || head.next === null) return true;
  let slow = head;
  let fast = head;
  while (fast.next !== null && fast.next.next !== null) { // slow ends on the last node of the first half
    slow = slow.next;
    fast = fast.next.next;
  }
  const second = reverse(slow.next);
  let p1 = head;
  let p2 = second;
  let result = true;
  while (p2 !== null) {                                   // the second half is never longer
    if (p1.val !== p2.val) {
      result = false;
      break;
    }
    p1 = p1.next;
    p2 = p2.next;
  }
  slow.next = reverse(second);                            // put the list back as it was
  return result;
}

function fmt(values) {
  return '[' + values.join(', ') + ']';
}

function check(values) {
  const head = build(values);
  const answer = isPalindrome(head);
  return fmt(values) + ' => ' + answer + ', list after: ' + fmt(toArray(head));
}

console.log(check([1, 2, 2, 1])); // [1, 2, 2, 1] => true, list after: [1, 2, 2, 1]
console.log(check([1, 2])); // [1, 2] => false, list after: [1, 2]
console.log(check([1])); // [1] => true, list after: [1]
console.log(check([])); // [] => true, list after: []
console.log(check([1, 2, 3, 2, 1])); // [1, 2, 3, 2, 1] => true, list after: [1, 2, 3, 2, 1]
console.log(check([1, 2, 3, 1])); // [1, 2, 3, 1] => false, list after: [1, 2, 3, 1]
console.log(check([7, 7, 7])); // [7, 7, 7] => true, list after: [7, 7, 7]
console.log(check([1, 0, 0])); // [1, 0, 0] => false, list after: [1, 0, 0]
` },
          { label: `Every 0/1 list up to 8 nodes, against the array version`, code: `class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

function build(values) {
  let head = null;
  for (let i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
  return head;
}

function toArray(head) {
  const out = [];
  for (let node = head; node !== null; node = node.next) out.push(node.val);
  return out;
}

function reverse(head) {
  let prev = null;
  while (head !== null) {
    const next = head.next;
    head.next = prev;
    prev = head;
    head = next;
  }
  return prev;
}

// O(1) extra space: reverse the second half, compare, then restore it.
function isPalindrome(head) {
  if (head === null || head.next === null) return true;
  let slow = head;
  let fast = head;
  while (fast.next !== null && fast.next.next !== null) { // slow ends on the last node of the first half
    slow = slow.next;
    fast = fast.next.next;
  }
  const second = reverse(slow.next);
  let p1 = head;
  let p2 = second;
  let result = true;
  while (p2 !== null) {                                   // the second half is never longer
    if (p1.val !== p2.val) {
      result = false;
      break;
    }
    p1 = p1.next;
    p2 = p2.next;
  }
  slow.next = reverse(second);                            // put the list back as it was
  return result;
}

function fmt(values) {
  return '[' + values.join(', ') + ']';
}

// O(n) extra space: copy the values, compare from both ends.
function isPalindromeArray(head) {
  const vals = toArray(head);
  for (let i = 0, j = vals.length - 1; i < j; i++, j--) {
    if (vals[i] !== vals[j]) return false;
  }
  return true;
}

let checked = 0;
let palindromes = 0;
let disagreements = 0;
let changed = 0;
for (let length = 0; length <= 8; length++) {
  for (let mask = 0; mask < (1 << length); mask++) {
    const values = [];
    for (let b = 0; b < length; b++) values.push((mask >> b) & 1);
    const head = build(values);
    const fastAnswer = isPalindrome(head);
    if (fmt(toArray(head)) !== fmt(values)) changed++;
    if (fastAnswer !== isPalindromeArray(head)) disagreements++;
    checked++;
    if (fastAnswer) palindromes++;
  }
}
console.log('lists checked: ' + checked);
console.log('palindromes: ' + palindromes);
console.log('disagreements with the array version: ' + disagreements);
console.log('lists changed by the check: ' + changed);

// What goes wrong if you skip the restore step
const head = build([1, 2, 3, 2, 1]);
const slow = head.next.next;          // the middle node, where the loop stops
reverse(slow.next);                   // reverse the second half and do not put it back
console.log('without restoring, head now reaches: ' + fmt(toArray(head)));
` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given the head of a singly linked list of integers, return true if it reads the same forwards and backwards. Explain the simple approach, then solve it in O(1) extra space. Please write it in Java."

**What a strong answer should cover:**
- The simple version: copy values into an \`ArrayList<Integer>\` and compare from both ends, O(n) time and O(n) space.
- The O(1)-space version: find the middle with fast and slow pointers, reverse the second half in place, compare, then reverse it back.
- Correct middle for odd and even lengths; the comparison loop runs while the reversed half has nodes.
- Restoring the list before returning, even when the answer is false.
- Java specifics: \`int\` fields compare with \`==\`, but boxed \`Integer\` values from a \`List\` must use \`equals\` (the \`Integer\` cache makes \`==\` work for small values only), and a deep recursive version can throw \`StackOverflowError\`.

**Clarifying questions expected:**
- "Is O(n) extra space allowed? May I modify the list temporarily?"
- "Is an empty list a palindrome?"

**Code / implementation expected:** Yes — \`boolean isPalindrome(ListNode head)\` in Java, ideally the O(1)-space version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a conga line of people, each holding the shoulders of the person in front. Every person wears a number on their back. You want to know whether the numbers read the same from the front of the line as from the back. With a row of chairs you would simply look at both ends. But in a conga line you can only start at the front and walk forward, one shoulder at a time; nobody is holding anyone from behind.

One easy trick is to write every number on a notepad as you walk, then read the notepad both ways. That works, but it needs a notepad as long as the line. The clever trick needs no notepad: walk to the middle of the line, ask the back half to turn around so they face the other way, then send one walker from the front and one from the (new) front of the back half and compare numbers pair by pair. Afterwards, ask the back half to turn around again so the line is exactly as you found it.

That is the interview question. A singly linked list only lets you move forward, so the "check both ends" idea from [valid palindrome for strings](/interview-question/how-do-you-check-if-a-string-is-a-valid-palindrome) does not work directly. The question tests three linked-list skills at once: [finding the middle of a linked list](/interview-question/how-do-you-find-the-middle-of-a-linked-list), [reversing a linked list](/interview-question/how-do-you-reverse-a-linked-list) and walking two lists side by side.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is O(n) extra memory allowed? | If yes, copy the values into an array and compare from both ends. The follow-up is usually O(1) space. |
| May I modify the list, and must it be restored? | The O(1) solution reverses half the list; well-behaved code puts it back before returning. |
| What counts as equal: the stored values only? | Values are compared, not nodes. Ask how values are typed (ints, strings). |
| Is an empty list or a single node a palindrome? | Normally yes, both read the same both ways. |
| Can other code read the list while I check it? | Temporarily reversing half the list is unsafe if another thread reads it at the same time. |

## 3. The Core Idea

📌 **Interview term: Palindrome** — a sequence that reads the same forwards and backwards, such as 1, 2, 3, 2, 1.

📌 **Interview term: Singly linked list** — each node stores a value and a pointer to the **next** node only, so you can walk forwards but never backwards, and there is no index lookup. (See [arrays versus linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).)

### Approach 1: copy to an array

Walk the list once and push every value into an array (or list, or vector). Then compare the array from both ends with two indices. Simple and hard to get wrong: O(n) time, but **O(n) extra space**.

### Approach 2: reverse the second half (O(1) space)

Four steps:

1. **Find the middle** with fast and slow pointers: \`slow\` moves one node, \`fast\` moves two. Stop when \`fast\` cannot take two more steps. \`slow\` is then the **last node of the first half**.
2. **Reverse the second half**, the part after \`slow\`, with the usual three-pointer in-place reversal.
3. **Compare** the first half (from the head) with the reversed second half, one pair at a time, until the second half runs out.
4. **Restore** the list by reversing the second half again and reattaching it to \`slow\`.

📌 **Interview term: Fast and slow pointers** — two pointers moving at different speeds through the same list; when the fast one reaches the end, the slow one is at the middle. See [the fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique).

<svg class="iq-diagram" width="100%" viewBox="0 0 600 230" role="img" aria-label="List 1 2 3 2 1 with slow stopped on the middle node and fast on the last node, the second half starts after slow">
  <defs>
    <marker id="lp1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="70" y="99" text-anchor="middle">1</text>
  <rect class="d-box" x="150" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="180" y="99" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="260" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="290" y="99" text-anchor="middle">3</text>
  <rect class="d-box" x="370" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="400" y="99" text-anchor="middle">2</text>
  <rect class="d-box" x="480" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="510" y="99" text-anchor="middle">1</text>
  <path class="d-edge" d="M 102 93 L 144 93" fill="none" marker-end="url(#lp1-arrow)"/>
  <path class="d-edge" d="M 212 93 L 254 93" fill="none" marker-end="url(#lp1-arrow)"/>
  <path class="d-edge" d="M 322 93 L 364 93" fill="none" marker-end="url(#lp1-arrow)"/>
  <path class="d-edge" d="M 432 93 L 474 93" fill="none" marker-end="url(#lp1-arrow)"/>
  <text class="d-text d-accent" x="290" y="50" text-anchor="middle">slow</text>
  <text class="d-text d-accent" x="510" y="50" text-anchor="middle">fast</text>
  <rect class="d-box-muted" x="40" y="150" width="280" height="56" rx="8"/>
  <text class="d-text" x="180" y="174" text-anchor="middle">first half</text>
  <text class="d-sub" x="180" y="196" text-anchor="middle">head to slow</text>
  <rect class="d-box-muted" x="370" y="150" width="170" height="56" rx="8"/>
  <text class="d-text" x="455" y="174" text-anchor="middle">second half</text>
  <text class="d-sub" x="455" y="196" text-anchor="middle">slow.next onward</text>
</svg>

The loop condition \`fast.next and fast.next.next\` stops \`slow\` on the middle node for an odd length (here the 3) and on the last node of the first half for an even length (for 1, 2, 2, 1 it stops on the first 2). Either way the second half starts at \`slow.next\`.

📌 **Interview term: In-place reversal** — reversing a list by changing each node's \`next\` pointer to the previous node, using O(1) extra memory (three pointers: previous, current, next).

<svg class="iq-diagram" width="100%" viewBox="0 0 600 310" role="img" aria-label="After reversing the second half, a pointer from the head and a pointer from the old tail compare 1 with 1 and 2 with 2">
  <defs>
    <marker id="lp2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="60" y="40" text-anchor="start">from head</text>
  <rect class="d-box" x="60" y="56" width="60" height="46" rx="8"/>
  <text class="d-text" x="90" y="85" text-anchor="middle">1</text>
  <rect class="d-box" x="200" y="56" width="60" height="46" rx="8"/>
  <text class="d-text" x="230" y="85" text-anchor="middle">2</text>
  <rect class="d-box" x="340" y="56" width="60" height="46" rx="8"/>
  <text class="d-text" x="370" y="85" text-anchor="middle">3</text>
  <path class="d-edge" d="M 122 79 L 194 79" fill="none" marker-end="url(#lp2-arrow)"/>
  <path class="d-edge" d="M 262 79 L 334 79" fill="none" marker-end="url(#lp2-arrow)"/>
  <text class="d-sub" x="60" y="284" text-anchor="start">from old tail</text>
  <rect class="d-box-accent" x="60" y="206" width="60" height="46" rx="8"/>
  <text class="d-text" x="90" y="235" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="200" y="206" width="60" height="46" rx="8"/>
  <text class="d-text" x="230" y="235" text-anchor="middle">2</text>
  <path class="d-edge" d="M 122 229 L 194 229" fill="none" marker-end="url(#lp2-arrow)"/>
  <path class="d-edge-dashed" d="M 90 108 L 90 200" fill="none"/>
  <path class="d-edge-dashed" d="M 230 108 L 230 200" fill="none"/>
  <text class="d-sub" x="150" y="160" text-anchor="middle">equal</text>
  <text class="d-sub" x="290" y="160" text-anchor="middle">equal</text>
  <path class="d-edge" d="M 262 229 C 330 229, 370 160, 370 108" fill="none" marker-end="url(#lp2-arrow)"/>
  <text class="d-sub" x="470" y="170" text-anchor="middle">points to 3</text>
</svg>

For an odd length the middle node belongs to the first half and is never compared, because it matches itself. The comparison loop runs while the **reversed second half** has nodes, since it is never longer than the first half.

📌 **Interview term: Restoring the input** — undoing a temporary change (here, reversing the second half back) before returning, so the caller gets the list exactly as it was. Interviewers notice when you do this without being asked.

## 4. The Solution in Java

~~~java
static ListNode reverse(ListNode head) {
    ListNode prev = null;
    while (head != null) {
        ListNode next = head.next;
        head.next = prev;
        prev = head;
        head = next;
    }
    return prev;
}

// O(1) extra space: reverse the second half, compare, then restore it.
static boolean isPalindrome(ListNode head) {
    if (head == null || head.next == null) return true;
    ListNode slow = head, fast = head;
    while (fast.next != null && fast.next.next != null) { // slow ends on the last node of the first half
        slow = slow.next;
        fast = fast.next.next;
    }
    ListNode second = reverse(slow.next);
    ListNode p1 = head, p2 = second;
    boolean result = true;
    while (p2 != null) {                                  // the second half is never longer
        if (p1.val != p2.val) {                           // int, so == compares values
            result = false;
            break;
        }
        p1 = p1.next;
        p2 = p2.next;
    }
    slow.next = reverse(second);                          // put the list back as it was
    return result;
}
~~~

**Why each line is there:**

- The early return covers \`null\` and one node, so \`fast.next\` can be read without a \`NullPointerException\`.
- \`fast.next != null && fast.next.next != null\` stops \`slow\` on the **last node of the first half**; \`&&\` short-circuits, so the second test never runs on a null.
- \`p1.val != p2.val\` is safe because \`val\` is a primitive \`int\`.
- \`result\` plus \`break\` guarantees the restore line runs.

### The simple version, and the Integer trap

~~~java
static boolean isPalindromeArray(ListNode head) {
    List<Integer> vals = toList(head);
    for (int i = 0, j = vals.size() - 1; i < j; i++, j--) {
        if (!vals.get(i).equals(vals.get(j))) return false;  // Integer: use equals, not ==
    }
    return true;
}
~~~

\`vals.get(i)\` returns an \`Integer\` object, so \`==\` would compare **references**. Java caches small boxed values, which hides the bug in small tests: in a test run, \`Integer\` 127 \`==\` 127 printed \`true\` but 128 \`==\` 128 printed \`false\`. The Javadoc for \`Integer.valueOf\` says it always caches values in the range -128 to 127 and may cache others ([Integer.valueOf, Java SE 21](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Integer.html#valueOf(int))). Use \`equals\`, or unbox to \`int\` first.

## 5. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Reverse-the-second-half check, with the list printed afterwards** prints:

~~~text
[1, 2, 2, 1] => true, list after: [1, 2, 2, 1]
[1, 2] => false, list after: [1, 2]
[1] => true, list after: [1]
[] => true, list after: []
[1, 2, 3, 2, 1] => true, list after: [1, 2, 3, 2, 1]
[1, 2, 3, 1] => false, list after: [1, 2, 3, 1]
[7, 7, 7] => true, list after: [7, 7, 7]
[1, 0, 0] => false, list after: [1, 0, 0]
~~~

**Example 2 — Every 0/1 list up to 8 nodes, against the array version** prints:

~~~text
lists checked: 511
palindromes: 61
disagreements with the array version: 0
lists changed by the check: 0
without restoring, head now reaches: [1, 2, 3, 2]
~~~

**Reading the output:** in Example 1 every list prints the same values after the check as before, which shows the restore step works; \`[]\` and \`[1]\` are palindromes, \`[1, 2]\` and \`[1, 0, 0]\` are not. Example 2 runs the O(1)-space check and the copy-to-array check on all 511 lists of 0 to 8 nodes made of 0s and 1s: they agree on every one (61 of them are palindromes), and no list is changed. The last line shows what happens if you skip the restore on \`[1, 2, 3, 2, 1]\`: from the head you can now reach only four nodes, because the last node of the first half still points at the old fourth node, which became the tail of the reversed half.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy values into an array | O(n) | O(n) | one walk to copy, one two-index comparison |
| Push values on a stack, walk again | O(n) | O(n) | the stack replays the values backwards |
| Recursion with a front pointer | O(n) | O(n) call stack | each node waits on the call stack |
| Reverse second half, compare, restore | O(n) | O(1) | about n/2 + n/2 + n/2 + n/2 pointer steps, only a few pointers |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Empty list** and **one node:** palindromes; return early before touching pointers.
- **Two nodes:** a palindrome only if both values are equal (\`[1, 2]\` is false, \`[7, 7]\` is true).
- **Odd versus even length:** the middle node of an odd list is skipped; check both lengths in tests.
- **All values equal** (\`[7, 7, 7]\`): a palindrome, a good check that the comparison is by value.
- **Mismatch in the middle of the comparison:** still restore the list before returning \`false\`; store the result, do not return early.

## Common Pitfalls

- **\`==\` on \`Integer\`.** Works for -128 to 127, fails above; use \`equals\` or primitive \`int\`.
- **Returning before restoring.** \`return false\` inside the loop leaves the list half-reversed for the caller.
- **Losing the rest of the list in \`reverse\`.** Save \`head.next\` in a local before overwriting it.
- **Checking \`fast.next.next\` without \`fast.next\`.** \`NullPointerException\` on even-length lists.
- **A recursive solution on a long list.** One frame per node; deep enough input throws \`StackOverflowError\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Warm-up:</strong> <span style="color:#f0e2c8;">Copy into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList&lt;Integer&gt;</code> and compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get(i)</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get(j)</code> using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>. O(n) time, O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Find the middle:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> 1 step, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> 2 steps while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast.next != null &amp;&amp; fast.next.next != null</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> is the last node of the first half.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reverse and compare:</strong> <span style="color:#f0e2c8;">Reverse <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow.next</code> in place, compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p1.val != p2.val</code> (primitive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>) until the reversed half ends.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Restore:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow.next = reverse(second)</code> before returning, even on a mismatch. O(n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Boxed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> happens to work only inside the -128 to 127 cache.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the middle node of an odd list skipped?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It stays in the first half with no partner; the loop runs only while the reversed half has nodes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you avoid modifying the list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in O(1) space; without modification use an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList</code>, an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> as a stack, or recursion, all O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this safe if other threads read the list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, they could see the half-reversed state. Use the copy version or synchronise the whole check.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the recursive version work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">front</code> field, recurse to the tail, compare on the way back and advance <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">front</code>. O(n) stack; long lists risk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not compare with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Deque</code> pop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You can push every value onto an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> and pop while walking again; it is still O(n) space, just a different container.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Palindrome** | reads the same forwards and backwards |
| **Singly linked list** | each node points only to the next node |
| **Fast and slow pointers** | pointers at speeds 2 and 1; slow ends at the middle |
| **In-place reversal** | flip every next pointer with O(1) extra memory |
| **Restoring the input** | undo a temporary change before returning |
| **Integer cache** | boxed \`Integer\` objects for -128 to 127 are shared, so \`==\` misleadingly works for them |

---
**Conclusion:** Checking a linked list for a palindrome combines three small skills: find the middle with fast and slow pointers, reverse the second half in place, and walk two lists side by side comparing values. That gives O(n) time and O(1) space; copying to an array gives the same time with O(n) space and is the right warm-up. Restore the list before returning, even when the answer is false. In Java, give the \`ArrayList\` warm-up with \`equals\`, then write the half-reversal with null-safe loop conditions and a restore that always runs.`,
        examples: [
          { label: `Reverse-the-second-half check, with the list printed afterwards`, code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val, ListNode next) { this.val = val; this.next = next; }
    }

    static ListNode build(int[] values) {
        ListNode head = null;
        for (int i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
        return head;
    }

    static List<Integer> toList(ListNode head) {
        List<Integer> out = new ArrayList<>();
        for (ListNode node = head; node != null; node = node.next) out.add(node.val);
        return out;
    }

    static ListNode reverse(ListNode head) {
        ListNode prev = null;
        while (head != null) {
            ListNode next = head.next;
            head.next = prev;
            prev = head;
            head = next;
        }
        return prev;
    }

    // O(1) extra space: reverse the second half, compare, then restore it.
    static boolean isPalindrome(ListNode head) {
        if (head == null || head.next == null) return true;
        ListNode slow = head, fast = head;
        while (fast.next != null && fast.next.next != null) { // slow ends on the last node of the first half
            slow = slow.next;
            fast = fast.next.next;
        }
        ListNode second = reverse(slow.next);
        ListNode p1 = head, p2 = second;
        boolean result = true;
        while (p2 != null) {                                  // the second half is never longer
            if (p1.val != p2.val) {                           // int, so == compares values
                result = false;
                break;
            }
            p1 = p1.next;
            p2 = p2.next;
        }
        slow.next = reverse(second);                          // put the list back as it was
        return result;
    }

    static String fmt(List<Integer> values) {
        return values.toString();                             // prints [1, 2, 3]
    }

    static String check(int[] values) {
        ListNode head = build(values);
        boolean answer = isPalindrome(head);
        return Arrays.toString(values) + " => " + answer + ", list after: " + fmt(toList(head));
    }

    public static void main(String[] args) {
        System.out.println(check(new int[]{1, 2, 2, 1}));
        System.out.println(check(new int[]{1, 2}));
        System.out.println(check(new int[]{1}));
        System.out.println(check(new int[]{}));
        System.out.println(check(new int[]{1, 2, 3, 2, 1}));
        System.out.println(check(new int[]{1, 2, 3, 1}));
        System.out.println(check(new int[]{7, 7, 7}));
        System.out.println(check(new int[]{1, 0, 0}));
    }
}
` },
          { label: `Every 0/1 list up to 8 nodes, against the array version`, code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val, ListNode next) { this.val = val; this.next = next; }
    }

    static ListNode build(int[] values) {
        ListNode head = null;
        for (int i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
        return head;
    }

    static List<Integer> toList(ListNode head) {
        List<Integer> out = new ArrayList<>();
        for (ListNode node = head; node != null; node = node.next) out.add(node.val);
        return out;
    }

    static ListNode reverse(ListNode head) {
        ListNode prev = null;
        while (head != null) {
            ListNode next = head.next;
            head.next = prev;
            prev = head;
            head = next;
        }
        return prev;
    }

    // O(1) extra space: reverse the second half, compare, then restore it.
    static boolean isPalindrome(ListNode head) {
        if (head == null || head.next == null) return true;
        ListNode slow = head, fast = head;
        while (fast.next != null && fast.next.next != null) { // slow ends on the last node of the first half
            slow = slow.next;
            fast = fast.next.next;
        }
        ListNode second = reverse(slow.next);
        ListNode p1 = head, p2 = second;
        boolean result = true;
        while (p2 != null) {                                  // the second half is never longer
            if (p1.val != p2.val) {                           // int, so == compares values
                result = false;
                break;
            }
            p1 = p1.next;
            p2 = p2.next;
        }
        slow.next = reverse(second);                          // put the list back as it was
        return result;
    }

    static String fmt(List<Integer> values) {
        return values.toString();                             // prints [1, 2, 3]
    }

    // O(n) extra space: copy the values, compare from both ends.
    static boolean isPalindromeArray(ListNode head) {
        List<Integer> vals = toList(head);
        for (int i = 0, j = vals.size() - 1; i < j; i++, j--) {
            if (!vals.get(i).equals(vals.get(j))) return false;  // Integer: use equals, not ==
        }
        return true;
    }

    public static void main(String[] args) {
        int checked = 0, palindromes = 0, disagreements = 0, changed = 0;
        for (int length = 0; length <= 8; length++) {
            for (int mask = 0; mask < (1 << length); mask++) {
                int[] values = new int[length];
                for (int b = 0; b < length; b++) values[b] = (mask >> b) & 1;
                ListNode head = build(values);
                List<Integer> before = toList(head);
                boolean fastAnswer = isPalindrome(head);
                if (!toList(head).equals(before)) changed++;
                if (fastAnswer != isPalindromeArray(head)) disagreements++;
                checked++;
                if (fastAnswer) palindromes++;
            }
        }
        System.out.println("lists checked: " + checked);
        System.out.println("palindromes: " + palindromes);
        System.out.println("disagreements with the array version: " + disagreements);
        System.out.println("lists changed by the check: " + changed);

        // What goes wrong if you skip the restore step
        ListNode head = build(new int[]{1, 2, 3, 2, 1});
        ListNode slow = head.next.next;        // the middle node, where the loop stops
        reverse(slow.next);                    // reverse the second half and do not put it back
        System.out.println("without restoring, head now reaches: " + fmt(toList(head)));
    }
}
` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a pointer to the head of a singly linked list of integers, return true if it reads the same forwards and backwards. Explain the simple approach, then solve it in O(1) extra space without leaking memory. Please write it in C++."

**What a strong answer should cover:**
- The simple version: copy values into a \`std::vector<int>\` and compare from both ends (\`std::equal\` with reverse iterators), O(n) time and O(n) space.
- The O(1)-space version: find the middle with fast and slow pointers, reverse the second half in place, compare, then reverse it back.
- Correct middle for odd and even lengths; the comparison loop runs while the reversed half has nodes.
- Restoring the list before returning, even when the answer is false.
- C++ specifics: check for \`nullptr\` before every \`->\`; if the list is not restored, a walk-and-delete from the head frees only part of it and leaks the rest.

**Clarifying questions expected:**
- "Is O(n) extra space allowed? May I modify the list temporarily?"
- "Who owns the nodes, so I know whether I must restore the list?"

**Code / implementation expected:** Yes — \`bool isPalindrome(ListNode* head)\` in C++, ideally the O(1)-space version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a conga line of people, each holding the shoulders of the person in front. Every person wears a number on their back. You want to know whether the numbers read the same from the front of the line as from the back. With a row of chairs you would simply look at both ends. But in a conga line you can only start at the front and walk forward, one shoulder at a time; nobody is holding anyone from behind.

One easy trick is to write every number on a notepad as you walk, then read the notepad both ways. That works, but it needs a notepad as long as the line. The clever trick needs no notepad: walk to the middle of the line, ask the back half to turn around so they face the other way, then send one walker from the front and one from the (new) front of the back half and compare numbers pair by pair. Afterwards, ask the back half to turn around again so the line is exactly as you found it.

That is the interview question. A singly linked list only lets you move forward, so the "check both ends" idea from [valid palindrome for strings](/interview-question/how-do-you-check-if-a-string-is-a-valid-palindrome) does not work directly. The question tests three linked-list skills at once: [finding the middle of a linked list](/interview-question/how-do-you-find-the-middle-of-a-linked-list), [reversing a linked list](/interview-question/how-do-you-reverse-a-linked-list) and walking two lists side by side.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is O(n) extra memory allowed? | If yes, copy the values into an array and compare from both ends. The follow-up is usually O(1) space. |
| May I modify the list, and must it be restored? | The O(1) solution reverses half the list; well-behaved code puts it back before returning. |
| What counts as equal: the stored values only? | Values are compared, not nodes. Ask how values are typed (ints, strings). |
| Is an empty list or a single node a palindrome? | Normally yes, both read the same both ways. |
| Can other code read the list while I check it? | Temporarily reversing half the list is unsafe if another thread reads it at the same time. |

## 3. The Core Idea

📌 **Interview term: Palindrome** — a sequence that reads the same forwards and backwards, such as 1, 2, 3, 2, 1.

📌 **Interview term: Singly linked list** — each node stores a value and a pointer to the **next** node only, so you can walk forwards but never backwards, and there is no index lookup. (See [arrays versus linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list).)

### Approach 1: copy to an array

Walk the list once and push every value into an array (or list, or vector). Then compare the array from both ends with two indices. Simple and hard to get wrong: O(n) time, but **O(n) extra space**.

### Approach 2: reverse the second half (O(1) space)

Four steps:

1. **Find the middle** with fast and slow pointers: \`slow\` moves one node, \`fast\` moves two. Stop when \`fast\` cannot take two more steps. \`slow\` is then the **last node of the first half**.
2. **Reverse the second half**, the part after \`slow\`, with the usual three-pointer in-place reversal.
3. **Compare** the first half (from the head) with the reversed second half, one pair at a time, until the second half runs out.
4. **Restore** the list by reversing the second half again and reattaching it to \`slow\`.

📌 **Interview term: Fast and slow pointers** — two pointers moving at different speeds through the same list; when the fast one reaches the end, the slow one is at the middle. See [the fast and slow pointer technique](/interview-question/what-is-the-fast-and-slow-pointer-technique).

<svg class="iq-diagram" width="100%" viewBox="0 0 600 230" role="img" aria-label="List 1 2 3 2 1 with slow stopped on the middle node and fast on the last node, the second half starts after slow">
  <defs>
    <marker id="lp1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="70" y="99" text-anchor="middle">1</text>
  <rect class="d-box" x="150" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="180" y="99" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="260" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="290" y="99" text-anchor="middle">3</text>
  <rect class="d-box" x="370" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="400" y="99" text-anchor="middle">2</text>
  <rect class="d-box" x="480" y="70" width="60" height="46" rx="8"/>
  <text class="d-text" x="510" y="99" text-anchor="middle">1</text>
  <path class="d-edge" d="M 102 93 L 144 93" fill="none" marker-end="url(#lp1-arrow)"/>
  <path class="d-edge" d="M 212 93 L 254 93" fill="none" marker-end="url(#lp1-arrow)"/>
  <path class="d-edge" d="M 322 93 L 364 93" fill="none" marker-end="url(#lp1-arrow)"/>
  <path class="d-edge" d="M 432 93 L 474 93" fill="none" marker-end="url(#lp1-arrow)"/>
  <text class="d-text d-accent" x="290" y="50" text-anchor="middle">slow</text>
  <text class="d-text d-accent" x="510" y="50" text-anchor="middle">fast</text>
  <rect class="d-box-muted" x="40" y="150" width="280" height="56" rx="8"/>
  <text class="d-text" x="180" y="174" text-anchor="middle">first half</text>
  <text class="d-sub" x="180" y="196" text-anchor="middle">head to slow</text>
  <rect class="d-box-muted" x="370" y="150" width="170" height="56" rx="8"/>
  <text class="d-text" x="455" y="174" text-anchor="middle">second half</text>
  <text class="d-sub" x="455" y="196" text-anchor="middle">slow.next onward</text>
</svg>

The loop condition \`fast.next and fast.next.next\` stops \`slow\` on the middle node for an odd length (here the 3) and on the last node of the first half for an even length (for 1, 2, 2, 1 it stops on the first 2). Either way the second half starts at \`slow.next\`.

📌 **Interview term: In-place reversal** — reversing a list by changing each node's \`next\` pointer to the previous node, using O(1) extra memory (three pointers: previous, current, next).

<svg class="iq-diagram" width="100%" viewBox="0 0 600 310" role="img" aria-label="After reversing the second half, a pointer from the head and a pointer from the old tail compare 1 with 1 and 2 with 2">
  <defs>
    <marker id="lp2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="60" y="40" text-anchor="start">from head</text>
  <rect class="d-box" x="60" y="56" width="60" height="46" rx="8"/>
  <text class="d-text" x="90" y="85" text-anchor="middle">1</text>
  <rect class="d-box" x="200" y="56" width="60" height="46" rx="8"/>
  <text class="d-text" x="230" y="85" text-anchor="middle">2</text>
  <rect class="d-box" x="340" y="56" width="60" height="46" rx="8"/>
  <text class="d-text" x="370" y="85" text-anchor="middle">3</text>
  <path class="d-edge" d="M 122 79 L 194 79" fill="none" marker-end="url(#lp2-arrow)"/>
  <path class="d-edge" d="M 262 79 L 334 79" fill="none" marker-end="url(#lp2-arrow)"/>
  <text class="d-sub" x="60" y="284" text-anchor="start">from old tail</text>
  <rect class="d-box-accent" x="60" y="206" width="60" height="46" rx="8"/>
  <text class="d-text" x="90" y="235" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="200" y="206" width="60" height="46" rx="8"/>
  <text class="d-text" x="230" y="235" text-anchor="middle">2</text>
  <path class="d-edge" d="M 122 229 L 194 229" fill="none" marker-end="url(#lp2-arrow)"/>
  <path class="d-edge-dashed" d="M 90 108 L 90 200" fill="none"/>
  <path class="d-edge-dashed" d="M 230 108 L 230 200" fill="none"/>
  <text class="d-sub" x="150" y="160" text-anchor="middle">equal</text>
  <text class="d-sub" x="290" y="160" text-anchor="middle">equal</text>
  <path class="d-edge" d="M 262 229 C 330 229, 370 160, 370 108" fill="none" marker-end="url(#lp2-arrow)"/>
  <text class="d-sub" x="470" y="170" text-anchor="middle">points to 3</text>
</svg>

For an odd length the middle node belongs to the first half and is never compared, because it matches itself. The comparison loop runs while the **reversed second half** has nodes, since it is never longer than the first half.

📌 **Interview term: Restoring the input** — undoing a temporary change (here, reversing the second half back) before returning, so the caller gets the list exactly as it was. Interviewers notice when you do this without being asked.

## 4. The Solution in C++

~~~cpp
ListNode* reverse(ListNode* head) {
    ListNode* prev = nullptr;
    while (head != nullptr) {
        ListNode* next = head->next;
        head->next = prev;
        prev = head;
        head = next;
    }
    return prev;
}

// O(1) extra space: reverse the second half, compare, then restore it.
bool isPalindrome(ListNode* head) {
    if (head == nullptr || head->next == nullptr) return true;
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast->next != nullptr && fast->next->next != nullptr) { // slow ends on the last node of the first half
        slow = slow->next;
        fast = fast->next->next;
    }
    ListNode* second = reverse(slow->next);
    ListNode* p1 = head;
    ListNode* p2 = second;
    bool result = true;
    while (p2 != nullptr) {                                        // the second half is never longer
        if (p1->val != p2->val) {
            result = false;
            break;
        }
        p1 = p1->next;
        p2 = p2->next;
    }
    slow->next = reverse(second);                                  // put the list back as it was
    return result;
}
~~~

**Why each line is there:**

- The early return covers \`nullptr\` and one node, so \`fast->next\` is safe to read.
- \`fast->next != nullptr && fast->next->next != nullptr\` stops \`slow\` on the **last node of the first half**. Reading \`fast->next->next\` when \`fast->next\` is null would be undefined behaviour; \`&&\` short-circuits to prevent it.
- \`result\` plus \`break\` guarantees the restore line runs.
- Restoring matters for **memory**, not just politeness: after the reversal, the first half's last node still points at the old first node of the second half, which is now the *tail* of the reversed part. A walk from the head reaches only that one extra node, so the usual free loop would leak everything else. Example 2 prints exactly what is reachable in that state.

### The simple version

~~~cpp
bool isPalindromeVector(ListNode* head) {
    std::vector<int> v = toVector(head);
    return std::equal(v.begin(), v.begin() + v.size() / 2, v.rbegin());
}
~~~

\`std::equal(first, last, other)\` compares the range \`[first, last)\` element by element with the range starting at \`other\`; passing \`v.rbegin()\` walks the vector backwards. Only the first half is compared, because the second half would repeat the same pairs.

## 5. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Reverse-the-second-half check, with the list printed afterwards** prints:

~~~text
[1, 2, 2, 1] => true, list after: [1, 2, 2, 1]
[1, 2] => false, list after: [1, 2]
[1] => true, list after: [1]
[] => true, list after: []
[1, 2, 3, 2, 1] => true, list after: [1, 2, 3, 2, 1]
[1, 2, 3, 1] => false, list after: [1, 2, 3, 1]
[7, 7, 7] => true, list after: [7, 7, 7]
[1, 0, 0] => false, list after: [1, 0, 0]
~~~

**Example 2 — Every 0/1 list up to 8 nodes, against the array version** prints:

~~~text
lists checked: 511
palindromes: 61
disagreements with the array version: 0
lists changed by the check: 0
without restoring, head now reaches: [1, 2, 3, 2]
~~~

**Reading the output:** in Example 1 every list prints the same values after the check as before, which shows the restore step works; \`[]\` and \`[1]\` are palindromes, \`[1, 2]\` and \`[1, 0, 0]\` are not. Example 2 runs the O(1)-space check and the copy-to-array check on all 511 lists of 0 to 8 nodes made of 0s and 1s: they agree on every one (61 of them are palindromes), and no list is changed. The last line shows what happens if you skip the restore on \`[1, 2, 3, 2, 1]\`: from the head you can now reach only four nodes, because the last node of the first half still points at the old fourth node, which became the tail of the reversed half.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Copy values into an array | O(n) | O(n) | one walk to copy, one two-index comparison |
| Push values on a stack, walk again | O(n) | O(n) | the stack replays the values backwards |
| Recursion with a front pointer | O(n) | O(n) call stack | each node waits on the call stack |
| Reverse second half, compare, restore | O(n) | O(1) | about n/2 + n/2 + n/2 + n/2 pointer steps, only a few pointers |

See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Empty list** and **one node:** palindromes; return early before touching pointers.
- **Two nodes:** a palindrome only if both values are equal (\`[1, 2]\` is false, \`[7, 7]\` is true).
- **Odd versus even length:** the middle node of an odd list is skipped; check both lengths in tests.
- **All values equal** (\`[7, 7, 7]\`): a palindrome, a good check that the comparison is by value.
- **Mismatch in the middle of the comparison:** still restore the list before returning \`false\`; store the result, do not return early.

## Common Pitfalls

- **Leaking memory by not restoring.** A walk-and-delete from the head stops at the reversed half's tail; the remaining nodes are unreachable. Restore, or free both halves separately (Example 2 does that for the broken case).
- **Dereferencing null.** \`fast->next->next\` without checking \`fast->next\` is undefined behaviour.
- **Returning before restoring.** \`return false\` inside the loop skips the restore.
- **Losing the list in \`reverse\`.** Save \`head->next\` in a local before overwriting it.
- **Comparing pointers instead of values.** \`p1 != p2\` compares addresses, which always differ here; compare \`p1->val\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Warm-up:</strong> <span style="color:#f0e2c8;">Copy into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt;</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::equal(v.begin(), v.begin() + v.size() / 2, v.rbegin())</code>. O(n) time, O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Find the middle:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> 1 step, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> 2 steps while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast-&gt;next &amp;&amp; fast-&gt;next-&gt;next</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> is the last node of the first half.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reverse and compare:</strong> <span style="color:#f0e2c8;">Reverse <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow-&gt;next</code> in place, compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p1-&gt;val</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p2-&gt;val</code> until the reversed half ends.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Restore:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow-&gt;next = reverse(second)</code> before returning, even on a mismatch. O(n) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Without the restore, freeing from the head leaks most of the second half; null-check before every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-&gt;</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the middle node of an odd list skipped?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It stays in the first half with no partner; the loop runs only while the reversed half has nodes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you avoid modifying the list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in O(1) space; otherwise copy into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector</code>, push onto a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack</code>, or recurse, all O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the list look like if you forget to restore?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For 1, 2, 3, 2, 1 the head reaches 1, 2, 3, 2 and stops; the last 1 now heads its own two-node list. Freeing from the head leaks it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the check thread-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No; another thread reading the list during the check sees it half-reversed. Copy instead, or lock around the whole check.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::list</code> change anything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::list</code> is doubly linked with bidirectional iterators, so you could compare from both ends directly with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">begin()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rbegin()</code>; the question is about a hand-rolled singly linked list.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Palindrome** | reads the same forwards and backwards |
| **Singly linked list** | each node points only to the next node |
| **Fast and slow pointers** | pointers at speeds 2 and 1; slow ends at the middle |
| **In-place reversal** | flip every next pointer with O(1) extra memory |
| **Restoring the input** | undo a temporary change before returning |
| **\`std::equal\`** | standard algorithm that compares two ranges element by element |
| **Memory leak** | heap memory that is no longer reachable and can never be freed |

---
**Conclusion:** Checking a linked list for a palindrome combines three small skills: find the middle with fast and slow pointers, reverse the second half in place, and walk two lists side by side comparing values. That gives O(n) time and O(1) space; copying to an array gives the same time with O(n) space and is the right warm-up. Restore the list before returning, even when the answer is false. In C++, mention the vector warm-up, then write the half-reversal with null-safe conditions and a guaranteed restore, and be ready to explain how skipping the restore leaks nodes.`,
        examples: [
          { label: `Reverse-the-second-half check, with the list printed afterwards`, code: `#include <iostream>
#include <string>
#include <vector>

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v, ListNode* n) : val(v), next(n) {}
};

ListNode* build(const std::vector<int>& values) {
    ListNode* head = nullptr;
    for (auto it = values.rbegin(); it != values.rend(); ++it) head = new ListNode(*it, head);
    return head;
}

std::vector<int> toVector(ListNode* head) {
    std::vector<int> out;
    for (ListNode* node = head; node != nullptr; node = node->next) out.push_back(node->val);
    return out;
}

void freeList(ListNode* head) {
    while (head != nullptr) {
        ListNode* next = head->next;
        delete head;
        head = next;
    }
}

ListNode* reverse(ListNode* head) {
    ListNode* prev = nullptr;
    while (head != nullptr) {
        ListNode* next = head->next;
        head->next = prev;
        prev = head;
        head = next;
    }
    return prev;
}

// O(1) extra space: reverse the second half, compare, then restore it.
bool isPalindrome(ListNode* head) {
    if (head == nullptr || head->next == nullptr) return true;
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast->next != nullptr && fast->next->next != nullptr) { // slow ends on the last node of the first half
        slow = slow->next;
        fast = fast->next->next;
    }
    ListNode* second = reverse(slow->next);
    ListNode* p1 = head;
    ListNode* p2 = second;
    bool result = true;
    while (p2 != nullptr) {                                        // the second half is never longer
        if (p1->val != p2->val) {
            result = false;
            break;
        }
        p1 = p1->next;
        p2 = p2->next;
    }
    slow->next = reverse(second);                                  // put the list back as it was
    return result;
}

std::string fmt(const std::vector<int>& values) {
    std::string s = "[";
    for (std::size_t i = 0; i < values.size(); ++i) s += (i ? ", " : "") + std::to_string(values[i]);
    return s + "]";
}

std::string check(const std::vector<int>& values) {
    ListNode* head = build(values);
    bool answer = isPalindrome(head);
    std::string line = fmt(values) + " => " + (answer ? "true" : "false") + ", list after: " + fmt(toVector(head));
    freeList(head);                       // safe: the list was restored
    return line;
}

int main() {
    std::cout << check({1, 2, 2, 1}) << "\\n";
    std::cout << check({1, 2}) << "\\n";
    std::cout << check({1}) << "\\n";
    std::cout << check({}) << "\\n";
    std::cout << check({1, 2, 3, 2, 1}) << "\\n";
    std::cout << check({1, 2, 3, 1}) << "\\n";
    std::cout << check({7, 7, 7}) << "\\n";
    std::cout << check({1, 0, 0}) << "\\n";
}
` },
          { label: `Every 0/1 list up to 8 nodes, against the array version`, code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v, ListNode* n) : val(v), next(n) {}
};

ListNode* build(const std::vector<int>& values) {
    ListNode* head = nullptr;
    for (auto it = values.rbegin(); it != values.rend(); ++it) head = new ListNode(*it, head);
    return head;
}

std::vector<int> toVector(ListNode* head) {
    std::vector<int> out;
    for (ListNode* node = head; node != nullptr; node = node->next) out.push_back(node->val);
    return out;
}

void freeList(ListNode* head) {
    while (head != nullptr) {
        ListNode* next = head->next;
        delete head;
        head = next;
    }
}

ListNode* reverse(ListNode* head) {
    ListNode* prev = nullptr;
    while (head != nullptr) {
        ListNode* next = head->next;
        head->next = prev;
        prev = head;
        head = next;
    }
    return prev;
}

// O(1) extra space: reverse the second half, compare, then restore it.
bool isPalindrome(ListNode* head) {
    if (head == nullptr || head->next == nullptr) return true;
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast->next != nullptr && fast->next->next != nullptr) { // slow ends on the last node of the first half
        slow = slow->next;
        fast = fast->next->next;
    }
    ListNode* second = reverse(slow->next);
    ListNode* p1 = head;
    ListNode* p2 = second;
    bool result = true;
    while (p2 != nullptr) {                                        // the second half is never longer
        if (p1->val != p2->val) {
            result = false;
            break;
        }
        p1 = p1->next;
        p2 = p2->next;
    }
    slow->next = reverse(second);                                  // put the list back as it was
    return result;
}

std::string fmt(const std::vector<int>& values) {
    std::string s = "[";
    for (std::size_t i = 0; i < values.size(); ++i) s += (i ? ", " : "") + std::to_string(values[i]);
    return s + "]";
}

// O(n) extra space: copy the values, compare the first half with the reversed back half.
bool isPalindromeVector(ListNode* head) {
    std::vector<int> v = toVector(head);
    return std::equal(v.begin(), v.begin() + v.size() / 2, v.rbegin());
}

int main() {
    int checked = 0, palindromes = 0, disagreements = 0, changed = 0;
    for (int length = 0; length <= 8; ++length) {
        for (int mask = 0; mask < (1 << length); ++mask) {
            std::vector<int> values;
            for (int b = 0; b < length; ++b) values.push_back((mask >> b) & 1);
            ListNode* head = build(values);
            bool fastAnswer = isPalindrome(head);
            if (toVector(head) != values) ++changed;
            if (fastAnswer != isPalindromeVector(head)) ++disagreements;
            ++checked;
            if (fastAnswer) ++palindromes;
            freeList(head);
        }
    }
    std::cout << "lists checked: " << checked << "\\n";
    std::cout << "palindromes: " << palindromes << "\\n";
    std::cout << "disagreements with the array version: " << disagreements << "\\n";
    std::cout << "lists changed by the check: " << changed << "\\n";

    // What goes wrong if you skip the restore step
    ListNode* head = build({1, 2, 3, 2, 1});
    ListNode* slow = head->next->next;     // the middle node, where the loop stops
    ListNode* tail = reverse(slow->next);  // reverse the second half and do not put it back
    std::cout << "without restoring, head now reaches: " << fmt(toVector(head)) << "\\n";
    slow->next = nullptr;                  // split into two clean lists so both can be freed
    freeList(head);
    freeList(tail);
}
` },
        ],
      },
    },
  },
  {
    title: `How do you find the intersection node of two linked lists?`,
    difficulty: "easy",
    seoDescription: `Intersection of two linked lists in Python, JavaScript, Java and C++: hash set, length difference and the switch-heads two-pointer trick in O(1) space.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You get the heads of two singly linked lists. If they merge into one shared tail, return the first shared node; otherwise return None. The lists have no cycles and must not be changed. Can you do it in O(1) extra memory? Please write it in Python."

**What a strong answer should cover:**
- Intersection means the same node object, not equal values; the shared part is a common tail (Y shape).
- A hash-set baseline in O(m + n) time and O(m) space.
- An O(1)-space answer: align by length difference, or the switch-heads two pointers that both walk a + c + b nodes.
- Why the switch-heads loop ends with no intersection: both pointers become None on the same step.
- Python specifics: compare with \`is\`, write the switch as \`pa = pa.next if pa else head_b\`, and remember that a plain class hashes by identity so \`set()\` holds nodes, not values.

**Clarifying questions expected:**
- "Same node, or equal values?"
- "Can the lists contain cycles, and may I modify them?"

**Code / implementation expected:** Yes — \`get_intersection(head_a, head_b)\` in Python, O(1) space.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Two hiking trails start at different car parks, wind through the forest separately, and at some point join into one shared path that leads to the same waterfall. Two friends start at the two car parks at the same moment and walk at the same speed. Where do the trails merge?

If the trails were the same length before the junction, the friends would simply arrive at the junction together. They are not, so one friend gets there first and walks on alone. Here is the trick: when a friend reaches the waterfall, they are teleported to the **other** car park and keep walking. Now each friend walks "my trail + the shared part + the other trail", which is the same total distance for both. So on their second approach to the junction they arrive **at the same moment**, and the first place they stand side by side is the junction. If the trails never merge, they both reach the end of the second trail at the same moment instead and stop.

Two singly linked lists that **intersect** look exactly like those trails: they start apart and, from some node on, share every node to the end. The question asks for that first shared node. It is rated easy because the code is five lines, but explaining why the switch-heads trick terminates is what separates a memorised answer from an understood one.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does "intersect" mean the same node object, or equal values? | It means the same node (same reference). Two lists can hold equal values without sharing any node. |
| Can either list contain a cycle? | The classic version guarantees no cycles; with cycles the two-pointer trick can loop forever. |
| What should I return if they do not intersect? | Usually null / None / nullptr. |
| Must the lists be left unchanged? | Yes in the classic version; all three approaches below are read-only. |
| Is O(n) extra memory allowed? | A hash set is the easy answer; the follow-up asks for O(1). |

## 3. The Core Idea

📌 **Interview term: Intersection node** — the first node that belongs to both lists. Because each node has a single \`next\`, once two lists share a node they share **every** node after it: the shape is a Y, never an X.

📌 **Interview term: Node identity** — two lists intersect at a node only if they reach the very same object in memory. Equal values are not enough.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="Two lists forming a Y shape: list A 4 then 1, list B 5 then 6 then 1, both continue into the shared nodes 8, 4, 5">
  <defs>
    <marker id="li1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="128" y="30" text-anchor="middle">headA</text>
  <rect class="d-box" x="100" y="40" width="56" height="46" rx="8"/>
  <text class="d-text" x="128" y="69" text-anchor="middle">4</text>
  <rect class="d-box" x="210" y="40" width="56" height="46" rx="8"/>
  <text class="d-text" x="238" y="69" text-anchor="middle">1</text>
  <path class="d-edge" d="M 158 63 L 204 63" fill="none" marker-end="url(#li1-arrow)"/>
  <text class="d-sub" x="58" y="180" text-anchor="middle">headB</text>
  <rect class="d-box" x="30" y="192" width="56" height="46" rx="8"/>
  <text class="d-text" x="58" y="221" text-anchor="middle">5</text>
  <rect class="d-box" x="140" y="192" width="56" height="46" rx="8"/>
  <text class="d-text" x="168" y="221" text-anchor="middle">6</text>
  <rect class="d-box" x="250" y="192" width="56" height="46" rx="8"/>
  <text class="d-text" x="278" y="221" text-anchor="middle">1</text>
  <path class="d-edge" d="M 88 215 L 134 215" fill="none" marker-end="url(#li1-arrow)"/>
  <path class="d-edge" d="M 198 215 L 244 215" fill="none" marker-end="url(#li1-arrow)"/>
  <rect class="d-box-accent" x="380" y="116" width="56" height="46" rx="8"/>
  <text class="d-text" x="408" y="145" text-anchor="middle">8</text>
  <rect class="d-box" x="490" y="116" width="56" height="46" rx="8"/>
  <text class="d-text" x="518" y="145" text-anchor="middle">4</text>
  <rect class="d-box" x="600" y="116" width="56" height="46" rx="8"/>
  <text class="d-text" x="628" y="145" text-anchor="middle">5</text>
  <path class="d-edge" d="M 438 139 L 484 139" fill="none" marker-end="url(#li1-arrow)"/>
  <path class="d-edge" d="M 548 139 L 594 139" fill="none" marker-end="url(#li1-arrow)"/>
  <path class="d-edge" d="M 268 70 L 374 128" fill="none" marker-end="url(#li1-arrow)"/>
  <path class="d-edge" d="M 308 206 L 374 150" fill="none" marker-end="url(#li1-arrow)"/>
  <text class="d-text d-accent" x="408" y="100" text-anchor="middle">intersection</text>
</svg>

Here list A is 4, 1, 8, 4, 5 and list B is 5, 6, 1, 8, 4, 5. Both contain the value 1, but those are two different nodes; the answer is the node holding 8.

### Approach 1: hash set

Walk list A and put every node into a set (a [hash table](/interview-question/how-does-a-hash-table-work) keyed by node identity). Then walk list B; the first node already in the set is the intersection. O(m + n) time, O(m) extra space.

### Approach 2: length difference

Measure both lengths. Advance the longer list's pointer by the difference, so both pointers are the same distance from the end. Then move them together; the first time they point at the same node is the intersection (or both reach the end together). O(m + n) time, O(1) space, but three passes.

### Approach 3: switch heads (two pointers)

📌 **Interview term: Switch-heads two pointers** — pointer A walks list A and then continues at the head of B; pointer B walks list B and then continues at the head of A. Stop when they are equal.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="Pointer A walks A only, shared, then B only; pointer B walks B only, shared, then A only; both cover the same distance and reach the intersection together">
  <defs>
    <marker id="li2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="30" y="38" text-anchor="start">pointer A</text>
  <rect class="d-box" x="30" y="50" width="100" height="46" rx="8"/>
  <text class="d-text" x="80" y="79" text-anchor="middle">A only</text>
  <rect class="d-box-muted" x="130" y="50" width="150" height="46" rx="8"/>
  <text class="d-text" x="205" y="79" text-anchor="middle">shared</text>
  <rect class="d-box" x="280" y="50" width="150" height="46" rx="8"/>
  <text class="d-text" x="355" y="79" text-anchor="middle">B only</text>
  <rect class="d-box-accent" x="470" y="50" width="140" height="46" rx="8"/>
  <text class="d-text" x="540" y="79" text-anchor="middle">meet</text>
  <path class="d-edge-accent" d="M 432 73 L 464 73" fill="none" marker-end="url(#li2-arrow)"/>
  <text class="d-sub" x="30" y="148" text-anchor="start">pointer B</text>
  <rect class="d-box" x="30" y="160" width="150" height="46" rx="8"/>
  <text class="d-text" x="105" y="189" text-anchor="middle">B only</text>
  <rect class="d-box-muted" x="180" y="160" width="150" height="46" rx="8"/>
  <text class="d-text" x="255" y="189" text-anchor="middle">shared</text>
  <rect class="d-box" x="330" y="160" width="100" height="46" rx="8"/>
  <text class="d-text" x="380" y="189" text-anchor="middle">A only</text>
  <rect class="d-box-accent" x="470" y="160" width="140" height="46" rx="8"/>
  <text class="d-text" x="540" y="189" text-anchor="middle">meet</text>
  <path class="d-edge-accent" d="M 432 183 L 464 183" fill="none" marker-end="url(#li2-arrow)"/>
</svg>

Write \`a\` for the nodes only in A, \`b\` for the nodes only in B and \`c\` for the shared tail. Pointer A walks \`a + c\`, jumps, then walks \`b\` more to reach the intersection: \`a + c + b\` nodes, plus the one step it spends on null before jumping. Pointer B walks \`b + c + a\`: the same number. So they arrive at the intersection on the same step, and they cannot have met earlier because before that they were on unshared nodes.

If there is no intersection (\`c = 0\`), each pointer walks \`a + b\` nodes and then both become null on the **same** step, so \`pA == pB\` (both null) ends the loop and null is returned. That is why the loop needs no length check and no cycle detection.

📌 **Interview term: Loop invariant** — a statement that is true on every iteration. Here: after the switch, both pointers are the same number of steps away from the intersection (or from the shared null end).

## 4. The Solution in Python

The examples build two lists that share a tail with \`make_pair(a_only, b_only, shared)\`: the shared nodes are created once, and both lists end by pointing into them.

~~~python
def get_intersection(head_a, head_b):
    """Switch heads: each pointer walks its own list, then the other one."""
    pa, pb = head_a, head_b
    while pa is not pb:
        pa = pa.next if pa else head_b
        pb = pb.next if pb else head_a
    return pa                      # the shared node, or None when both ran out together
~~~

**Why each line is there:**

- \`while pa is not pb\` compares **identity**. \`None is None\` is true, which is exactly how the loop ends when the lists never meet.
- \`pa.next if pa else head_b\` — when \`pa\` falls off the end (becomes \`None\`), it switches to the other head on the **next** step. Switching on \`None\` (not on \`pa.next is None\`) matters: the pointer visits the \`None\` position once, which keeps both walks the same length, \`a + c + b + 1\` including that step, and lets the no-intersection case end with both at \`None\`.
- No length counters and no special cases for empty lists: if \`head_a\` is \`None\`, \`pa\` jumps straight to \`head_b\`.

### The length-difference version

~~~python
def by_length_difference(head_a, head_b):
    la, lb = length(head_a), length(head_b)
    while la > lb:
        head_a, la = head_a.next, la - 1
    while lb > la:
        head_b, lb = head_b.next, lb - 1
    while head_a is not head_b:
        head_a, head_b = head_a.next, head_b.next
    return head_a
~~~

Same O(1) space, easier to explain, one more pass. In Python the tuple assignment \`head_a, la = head_a.next, la - 1\` keeps the pointer and its counter in step.

The hash-set version (\`by_hash_set\` in Example 2) puts A's nodes in a \`set()\`. That works because a plain class without \`__eq__\` hashes and compares by identity; a \`@dataclass\` node would compare by value and be unhashable.

## 5. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Switch-heads intersection on Y-shaped and separate lists** prints:

~~~text
A = [4, 1, 8, 4, 5], B = [5, 6, 1, 8, 4, 5]: intersect at value 8 (A index 2, B index 3)
A = [2, 6, 4], B = [1, 5]: no intersection
A = [7, 9], B = [3, 7, 9]: intersect at value 7 (A index 0, B index 1)
A = [5, 6], B = [5, 6]: intersect at value 5 (A index 0, B index 0)
A = [1, 2, 3, 10], B = [9, 10]: intersect at value 10 (A index 3, B index 1)
A = [], B = [1]: no intersection
A = [1, 2, 3], B = [1, 2, 3]: no intersection
~~~

**Example 2 — Hash set, length difference and switch heads on every small shape** prints:

~~~text
all three methods agree on 125 of 125 shapes
a=2 b=3 shared=3: switch-heads loop ran 9 iterations
a=2 b=2 shared=3: switch-heads loop ran 2 iterations
a=3 b=2 shared=0: switch-heads loop ran 6 iterations
a=0 b=0 shared=4: switch-heads loop ran 0 iterations
a=5 b=1 shared=1: switch-heads loop ran 8 iterations
~~~

**Reading the output:** in Example 1 the first line finds the node holding 8 even though the value 1 appears in both lists; the line "A = [1, 2, 3], B = [1, 2, 3]" shows two lists with identical values and **no** intersection, because they share no node. In Example 2 the three approaches agree on all 125 shapes with 0 to 4 nodes in each part. The iteration counts are \`a + c + b + 1\` when the lists intersect and the unshared lengths differ (2 + 3 + 3 + 1 = 9, and 5 + 1 + 1 + 1 = 8), the \`+ 1\` being the step each pointer spends on null before switching; just \`a\` when the unshared parts are equally long (2, and 0 for two identical heads); and \`a + b + 1\` with no intersection (3 + 2 + 1 = 6), when both pointers reach null together.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Compare every pair of nodes | O(m · n) | O(1) | for each node of A, scan all of B |
| Hash set of A's nodes | O(m + n) | O(m) | one pass to insert, one pass to look up |
| Length difference | O(m + n) | O(1) | two length passes plus one aligned pass |
| Switch heads | O(m + n) | O(1) | each pointer takes at most m + n steps |

m and n are the lengths of the two lists. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Either list empty:** no intersection; the switch-heads loop ends after the other list is walked once.
- **Same list passed twice:** the answer is the head (a = b = 0).
- **Intersection at a head:** one list is a suffix of the other (a = 0 or b = 0).
- **Intersection only at the last node:** c = 1.
- **Equal values, no shared nodes:** no intersection; this is the case that catches value comparison.
- **Lists with cycles:** outside the classic problem; say so and ask before assuming.

## Common Pitfalls

- **Comparing values.** \`pa.val == pb.val\` reports an intersection for \`[1, 2, 3]\` and \`[1, 2, 3]\` built separately; compare nodes with \`is\`.
- **Switching on \`pa.next is None\`.** Skipping the \`None\` step makes the walks unequal when there is no intersection, and the loop never ends.
- **Using \`==\` with a node class that defines \`__eq__\`.** Then \`==\` compares values; \`is\` always means the same object.
- **Assuming the lists have equal length.** Walking both from the heads in lockstep without aligning misses the junction whenever \`a != b\`.
- **Modifying a list to find the junction** (for example, temporarily linking A's tail to B's head and running cycle detection). It works, but you must undo it; mention it as an alternative only.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Intersection means the same node object; the shared part is a common tail, so the lists form a Y.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Baseline:</strong> <span style="color:#f0e2c8;">Put every node of A in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set()</code>, return the first node of B that is in it. O(m + n) time, O(m) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The trick:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pa</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pb</code> walk their lists; on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> jump to the other head; loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while pa is not pb</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why it ends:</strong> <span style="color:#f0e2c8;">Both walk a + c + b nodes, so they meet at the junction; with no junction both reach <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> on the same step.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code>; a plain class hashes by identity, so the set version stores nodes, not values.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can they not meet before the intersection?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Before the junction each pointer is on a node unique to one list, so the two pointers cannot be the same object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the lists could contain cycles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The switch-heads loop could run forever. First detect a cycle in each list with Floyd, then handle the cases (both acyclic, both cyclic) separately.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many iterations in the worst case?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At most m + n + 1 including the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> step; Example 2 shows 9 iterations for a=2, b=3, c=3.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which O(1) version would you pick?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either. Length difference is easiest to explain; switch heads is shorter and does one fewer pass.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">id(node)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen.add(id(node))</code> works too, but it is only needed when the node class defines <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Intersection node** | the first node that both lists reach |
| **Node identity** | same object in memory, not equal values |
| **Switch-heads two pointers** | each pointer walks its list, then the other list |
| **Loop invariant** | a fact that stays true on every iteration |
| **Conditional expression** | Python \`x if cond else y\`, used here for the pointer switch |

---
**Conclusion:** Two intersecting lists form a Y, so the question is where the arms join. A hash set answers it in O(m + n) time and O(m) space; aligning the lengths or the switch-heads trick answers it in O(1) space, because both pointers walk exactly a + c + b nodes and meet at the junction, or both reach null together when there is none. In Python, compare with \`is\`, switch on \`None\` rather than on \`next is None\`, and you have the whole O(1)-space answer in five lines.`,
        examples: [
          { label: `Switch-heads intersection on Y-shaped and separate lists`, code: `class ListNode:
    def __init__(self, val):
        self.val = val
        self.next = None


def link(values, tail=None):
    """Build nodes for values, ending in the (possibly shared) tail."""
    head = tail
    for v in reversed(values):
        node = ListNode(v)
        node.next = head
        head = node
    return head


def make_pair(a_only, b_only, shared):
    common = link(shared)
    return link(a_only, common), link(b_only, common), common


def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out


def get_intersection(head_a, head_b):
    """Switch heads: each pointer walks its own list, then the other one."""
    pa, pb = head_a, head_b
    while pa is not pb:
        pa = pa.next if pa else head_b
        pb = pb.next if pb else head_a
    return pa                      # the shared node, or None when both ran out together


def index_of(head, target):
    i = 0
    while head is not target:
        head = head.next
        i += 1
    return i


def fmt(values):
    return "[" + ", ".join(str(v) for v in values) + "]"


def describe(a_only, b_only, shared):
    head_a, head_b, _ = make_pair(a_only, b_only, shared)
    node = get_intersection(head_a, head_b)
    label = "A = " + fmt(to_list(head_a)) + ", B = " + fmt(to_list(head_b)) + ": "
    if node is None:
        return label + "no intersection"
    return (label + "intersect at value " + str(node.val) + " (A index " + str(index_of(head_a, node))
            + ", B index " + str(index_of(head_b, node)) + ")")


print(describe([4, 1], [5, 6, 1], [8, 4, 5]))  # A = [4, 1, 8, 4, 5], B = [5, 6, 1, 8, 4, 5]: intersect at value 8 (A index 2, B index 3)
print(describe([2, 6, 4], [1, 5], []))  # A = [2, 6, 4], B = [1, 5]: no intersection
print(describe([], [3], [7, 9]))  # A = [7, 9], B = [3, 7, 9]: intersect at value 7 (A index 0, B index 1)
print(describe([], [], [5, 6]))  # A = [5, 6], B = [5, 6]: intersect at value 5 (A index 0, B index 0)
print(describe([1, 2, 3], [9], [10]))  # A = [1, 2, 3, 10], B = [9, 10]: intersect at value 10 (A index 3, B index 1)
print(describe([], [1], []))  # A = [], B = [1]: no intersection
print(describe([1, 2, 3], [1, 2, 3], []))  # A = [1, 2, 3], B = [1, 2, 3]: no intersection
` },
          { label: `Hash set, length difference and switch heads on every small shape`, code: `class ListNode:
    def __init__(self, val):
        self.val = val
        self.next = None


def link(values, tail=None):
    """Build nodes for values, ending in the (possibly shared) tail."""
    head = tail
    for v in reversed(values):
        node = ListNode(v)
        node.next = head
        head = node
    return head


def make_pair(a_only, b_only, shared):
    common = link(shared)
    return link(a_only, common), link(b_only, common), common


def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out


def get_intersection(head_a, head_b):
    """Switch heads: each pointer walks its own list, then the other one."""
    pa, pb = head_a, head_b
    while pa is not pb:
        pa = pa.next if pa else head_b
        pb = pb.next if pb else head_a
    return pa                      # the shared node, or None when both ran out together


def index_of(head, target):
    i = 0
    while head is not target:
        head = head.next
        i += 1
    return i


def fmt(values):
    return "[" + ", ".join(str(v) for v in values) + "]"


def by_hash_set(head_a, head_b):
    seen = set()
    while head_a:
        seen.add(head_a)
        head_a = head_a.next
    while head_b:
        if head_b in seen:
            return head_b
        head_b = head_b.next
    return None


def length(head):
    n = 0
    while head:
        n += 1
        head = head.next
    return n


def by_length_difference(head_a, head_b):
    la, lb = length(head_a), length(head_b)
    while la > lb:
        head_a, la = head_a.next, la - 1
    while lb > la:
        head_b, lb = head_b.next, lb - 1
    while head_a is not head_b:
        head_a, head_b = head_a.next, head_b.next
    return head_a


def iterations(head_a, head_b):
    pa, pb, steps = head_a, head_b, 0
    while pa is not pb:
        pa = pa.next if pa else head_b
        pb = pb.next if pb else head_a
        steps += 1
    return steps


agree = total = 0
for a in range(5):
    for b in range(5):
        for c in range(5):
            head_a, head_b, common = make_pair(list(range(a)), list(range(b)), list(range(c)))
            expected = common                         # None when c == 0
            got = [get_intersection(head_a, head_b), by_hash_set(head_a, head_b), by_length_difference(head_a, head_b)]
            total += 1
            if all(g is expected for g in got):
                agree += 1
print("all three methods agree on " + str(agree) + " of " + str(total) + " shapes")

for a, b, c in [(2, 3, 3), (2, 2, 3), (3, 2, 0), (0, 0, 4), (5, 1, 1)]:
    head_a, head_b, _ = make_pair(list(range(a)), list(range(b)), list(range(c)))
    print("a=" + str(a) + " b=" + str(b) + " shared=" + str(c) + ": switch-heads loop ran "
          + str(iterations(head_a, head_b)) + " iterations")
` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You get the heads of two singly linked lists. If they merge into a shared tail, return the first shared node; otherwise return null. No cycles, and the lists must not be changed. Can you do it in O(1) extra memory? Please write it in JavaScript."

**What a strong answer should cover:**
- Intersection means the same node object, not equal values; the lists form a Y.
- A \`Set\` baseline in O(m + n) time and O(m) space.
- An O(1)-space answer: align by length difference, or switch heads so both pointers walk a + c + b nodes.
- Why the switch-heads loop ends with no intersection: both pointers become null on the same step.
- JavaScript specifics: \`===\` is reference equality for objects; \`Set\` keys objects by reference; mixing \`null\` and \`undefined\` breaks \`pa !== pb\`.

**Clarifying questions expected:**
- "Same node, or equal values?"
- "Can the lists contain cycles, and may I modify them?"

**Code / implementation expected:** Yes — \`getIntersection(headA, headB)\` in JavaScript, O(1) space.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Two hiking trails start at different car parks, wind through the forest separately, and at some point join into one shared path that leads to the same waterfall. Two friends start at the two car parks at the same moment and walk at the same speed. Where do the trails merge?

If the trails were the same length before the junction, the friends would simply arrive at the junction together. They are not, so one friend gets there first and walks on alone. Here is the trick: when a friend reaches the waterfall, they are teleported to the **other** car park and keep walking. Now each friend walks "my trail + the shared part + the other trail", which is the same total distance for both. So on their second approach to the junction they arrive **at the same moment**, and the first place they stand side by side is the junction. If the trails never merge, they both reach the end of the second trail at the same moment instead and stop.

Two singly linked lists that **intersect** look exactly like those trails: they start apart and, from some node on, share every node to the end. The question asks for that first shared node. It is rated easy because the code is five lines, but explaining why the switch-heads trick terminates is what separates a memorised answer from an understood one.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does "intersect" mean the same node object, or equal values? | It means the same node (same reference). Two lists can hold equal values without sharing any node. |
| Can either list contain a cycle? | The classic version guarantees no cycles; with cycles the two-pointer trick can loop forever. |
| What should I return if they do not intersect? | Usually null / None / nullptr. |
| Must the lists be left unchanged? | Yes in the classic version; all three approaches below are read-only. |
| Is O(n) extra memory allowed? | A hash set is the easy answer; the follow-up asks for O(1). |

## 3. The Core Idea

📌 **Interview term: Intersection node** — the first node that belongs to both lists. Because each node has a single \`next\`, once two lists share a node they share **every** node after it: the shape is a Y, never an X.

📌 **Interview term: Node identity** — two lists intersect at a node only if they reach the very same object in memory. Equal values are not enough.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="Two lists forming a Y shape: list A 4 then 1, list B 5 then 6 then 1, both continue into the shared nodes 8, 4, 5">
  <defs>
    <marker id="li1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="128" y="30" text-anchor="middle">headA</text>
  <rect class="d-box" x="100" y="40" width="56" height="46" rx="8"/>
  <text class="d-text" x="128" y="69" text-anchor="middle">4</text>
  <rect class="d-box" x="210" y="40" width="56" height="46" rx="8"/>
  <text class="d-text" x="238" y="69" text-anchor="middle">1</text>
  <path class="d-edge" d="M 158 63 L 204 63" fill="none" marker-end="url(#li1-arrow)"/>
  <text class="d-sub" x="58" y="180" text-anchor="middle">headB</text>
  <rect class="d-box" x="30" y="192" width="56" height="46" rx="8"/>
  <text class="d-text" x="58" y="221" text-anchor="middle">5</text>
  <rect class="d-box" x="140" y="192" width="56" height="46" rx="8"/>
  <text class="d-text" x="168" y="221" text-anchor="middle">6</text>
  <rect class="d-box" x="250" y="192" width="56" height="46" rx="8"/>
  <text class="d-text" x="278" y="221" text-anchor="middle">1</text>
  <path class="d-edge" d="M 88 215 L 134 215" fill="none" marker-end="url(#li1-arrow)"/>
  <path class="d-edge" d="M 198 215 L 244 215" fill="none" marker-end="url(#li1-arrow)"/>
  <rect class="d-box-accent" x="380" y="116" width="56" height="46" rx="8"/>
  <text class="d-text" x="408" y="145" text-anchor="middle">8</text>
  <rect class="d-box" x="490" y="116" width="56" height="46" rx="8"/>
  <text class="d-text" x="518" y="145" text-anchor="middle">4</text>
  <rect class="d-box" x="600" y="116" width="56" height="46" rx="8"/>
  <text class="d-text" x="628" y="145" text-anchor="middle">5</text>
  <path class="d-edge" d="M 438 139 L 484 139" fill="none" marker-end="url(#li1-arrow)"/>
  <path class="d-edge" d="M 548 139 L 594 139" fill="none" marker-end="url(#li1-arrow)"/>
  <path class="d-edge" d="M 268 70 L 374 128" fill="none" marker-end="url(#li1-arrow)"/>
  <path class="d-edge" d="M 308 206 L 374 150" fill="none" marker-end="url(#li1-arrow)"/>
  <text class="d-text d-accent" x="408" y="100" text-anchor="middle">intersection</text>
</svg>

Here list A is 4, 1, 8, 4, 5 and list B is 5, 6, 1, 8, 4, 5. Both contain the value 1, but those are two different nodes; the answer is the node holding 8.

### Approach 1: hash set

Walk list A and put every node into a set (a [hash table](/interview-question/how-does-a-hash-table-work) keyed by node identity). Then walk list B; the first node already in the set is the intersection. O(m + n) time, O(m) extra space.

### Approach 2: length difference

Measure both lengths. Advance the longer list's pointer by the difference, so both pointers are the same distance from the end. Then move them together; the first time they point at the same node is the intersection (or both reach the end together). O(m + n) time, O(1) space, but three passes.

### Approach 3: switch heads (two pointers)

📌 **Interview term: Switch-heads two pointers** — pointer A walks list A and then continues at the head of B; pointer B walks list B and then continues at the head of A. Stop when they are equal.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="Pointer A walks A only, shared, then B only; pointer B walks B only, shared, then A only; both cover the same distance and reach the intersection together">
  <defs>
    <marker id="li2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="30" y="38" text-anchor="start">pointer A</text>
  <rect class="d-box" x="30" y="50" width="100" height="46" rx="8"/>
  <text class="d-text" x="80" y="79" text-anchor="middle">A only</text>
  <rect class="d-box-muted" x="130" y="50" width="150" height="46" rx="8"/>
  <text class="d-text" x="205" y="79" text-anchor="middle">shared</text>
  <rect class="d-box" x="280" y="50" width="150" height="46" rx="8"/>
  <text class="d-text" x="355" y="79" text-anchor="middle">B only</text>
  <rect class="d-box-accent" x="470" y="50" width="140" height="46" rx="8"/>
  <text class="d-text" x="540" y="79" text-anchor="middle">meet</text>
  <path class="d-edge-accent" d="M 432 73 L 464 73" fill="none" marker-end="url(#li2-arrow)"/>
  <text class="d-sub" x="30" y="148" text-anchor="start">pointer B</text>
  <rect class="d-box" x="30" y="160" width="150" height="46" rx="8"/>
  <text class="d-text" x="105" y="189" text-anchor="middle">B only</text>
  <rect class="d-box-muted" x="180" y="160" width="150" height="46" rx="8"/>
  <text class="d-text" x="255" y="189" text-anchor="middle">shared</text>
  <rect class="d-box" x="330" y="160" width="100" height="46" rx="8"/>
  <text class="d-text" x="380" y="189" text-anchor="middle">A only</text>
  <rect class="d-box-accent" x="470" y="160" width="140" height="46" rx="8"/>
  <text class="d-text" x="540" y="189" text-anchor="middle">meet</text>
  <path class="d-edge-accent" d="M 432 183 L 464 183" fill="none" marker-end="url(#li2-arrow)"/>
</svg>

Write \`a\` for the nodes only in A, \`b\` for the nodes only in B and \`c\` for the shared tail. Pointer A walks \`a + c\`, jumps, then walks \`b\` more to reach the intersection: \`a + c + b\` nodes, plus the one step it spends on null before jumping. Pointer B walks \`b + c + a\`: the same number. So they arrive at the intersection on the same step, and they cannot have met earlier because before that they were on unshared nodes.

If there is no intersection (\`c = 0\`), each pointer walks \`a + b\` nodes and then both become null on the **same** step, so \`pA == pB\` (both null) ends the loop and null is returned. That is why the loop needs no length check and no cycle detection.

📌 **Interview term: Loop invariant** — a statement that is true on every iteration. Here: after the switch, both pointers are the same number of steps away from the intersection (or from the shared null end).

## 4. The Solution in JavaScript

The examples build two lists that share a tail with \`makePair(aOnly, bOnly, shared)\`: the shared nodes are created once and both lists end by pointing into them.

~~~javascript
function getIntersection(headA, headB) {
  let pa = headA;
  let pb = headB;
  while (pa !== pb) {
    pa = pa !== null ? pa.next : headB;
    pb = pb !== null ? pb.next : headA;
  }
  return pa;                     // the shared node, or null when both ran out together
}
~~~

**Why each line is there:**

- \`pa !== pb\` is reference comparison for objects, and \`null !== null\` is false, so the loop also ends when both pointers run out together.
- The switch happens when the pointer **is** \`null\`, one step after the last node. That extra step keeps both walks equally long and is what makes the no-intersection case end.
- Both pointers must hold \`null\` (not \`undefined\`) at the end of a list. If one list ended with \`next\` left \`undefined\`, \`null !== undefined\` would be true and the loop would continue. The \`ListNode\` constructor sets \`next = null\` explicitly for that reason.

### The length-difference version

~~~javascript
function byLengthDifference(headA, headB) {
  let la = length(headA);
  let lb = length(headB);
  for (; la > lb; la--) headA = headA.next;
  for (; lb > la; lb--) headB = headB.next;
  while (headA !== headB) {
    headA = headA.next;
    headB = headB.next;
  }
  return headA;
}
~~~

The \`Set\` version (\`byHashSet\` in Example 2) relies on \`Set\` comparing object keys by reference, so two nodes with value 1 are two different keys. A plain object as the "seen" map would not work: every node key turns into the string \`"[object Object]"\`.

## 5. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Switch-heads intersection on Y-shaped and separate lists** prints:

~~~text
A = [4, 1, 8, 4, 5], B = [5, 6, 1, 8, 4, 5]: intersect at value 8 (A index 2, B index 3)
A = [2, 6, 4], B = [1, 5]: no intersection
A = [7, 9], B = [3, 7, 9]: intersect at value 7 (A index 0, B index 1)
A = [5, 6], B = [5, 6]: intersect at value 5 (A index 0, B index 0)
A = [1, 2, 3, 10], B = [9, 10]: intersect at value 10 (A index 3, B index 1)
A = [], B = [1]: no intersection
A = [1, 2, 3], B = [1, 2, 3]: no intersection
~~~

**Example 2 — Hash set, length difference and switch heads on every small shape** prints:

~~~text
all three methods agree on 125 of 125 shapes
a=2 b=3 shared=3: switch-heads loop ran 9 iterations
a=2 b=2 shared=3: switch-heads loop ran 2 iterations
a=3 b=2 shared=0: switch-heads loop ran 6 iterations
a=0 b=0 shared=4: switch-heads loop ran 0 iterations
a=5 b=1 shared=1: switch-heads loop ran 8 iterations
~~~

**Reading the output:** in Example 1 the first line finds the node holding 8 even though the value 1 appears in both lists; the line "A = [1, 2, 3], B = [1, 2, 3]" shows two lists with identical values and **no** intersection, because they share no node. In Example 2 the three approaches agree on all 125 shapes with 0 to 4 nodes in each part. The iteration counts are \`a + c + b + 1\` when the lists intersect and the unshared lengths differ (2 + 3 + 3 + 1 = 9, and 5 + 1 + 1 + 1 = 8), the \`+ 1\` being the step each pointer spends on null before switching; just \`a\` when the unshared parts are equally long (2, and 0 for two identical heads); and \`a + b + 1\` with no intersection (3 + 2 + 1 = 6), when both pointers reach null together.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Compare every pair of nodes | O(m · n) | O(1) | for each node of A, scan all of B |
| Hash set of A's nodes | O(m + n) | O(m) | one pass to insert, one pass to look up |
| Length difference | O(m + n) | O(1) | two length passes plus one aligned pass |
| Switch heads | O(m + n) | O(1) | each pointer takes at most m + n steps |

m and n are the lengths of the two lists. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Either list empty:** no intersection; the switch-heads loop ends after the other list is walked once.
- **Same list passed twice:** the answer is the head (a = b = 0).
- **Intersection at a head:** one list is a suffix of the other (a = 0 or b = 0).
- **Intersection only at the last node:** c = 1.
- **Equal values, no shared nodes:** no intersection; this is the case that catches value comparison.
- **Lists with cycles:** outside the classic problem; say so and ask before assuming.

## Common Pitfalls

- **Comparing \`val\`.** Separate lists with equal values would look intersecting; compare nodes with \`===\`.
- **\`null\` versus \`undefined\`.** A node whose \`next\` was never set is \`undefined\`; the loop test \`pa !== pb\` then never sees two equal "ends". Initialise \`next = null\`.
- **Switching on \`pa.next === null\`.** Skipping the null step makes the walks unequal with no intersection, and the loop spins forever.
- **Loose \`!=\`.** \`pa != pb\` treats \`null\` and \`undefined\` as equal, which hides the bug above instead of fixing it; prefer clean data and \`!==\`.
- **Using an object \`{}\` as the visited set.** All node keys become the same string.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Intersection means the same node object; after it the lists share every node (a Y shape).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Baseline:</strong> <span style="color:#f0e2c8;">Add all of A's nodes to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>, return the first node of B with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen.has(node)</code>. O(m + n) time, O(m) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The trick:</strong> <span style="color:#f0e2c8;">Two pointers; when one is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> it jumps to the other head; loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while (pa !== pb)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why it ends:</strong> <span style="color:#f0e2c8;">Both walk a + c + b nodes and meet at the junction; with no junction both are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> on the same step.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code> compares object references; keep list ends as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, or the final comparison fails.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can they not meet early?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Before the junction each pointer is on a node unique to its list, so they cannot be the same object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if there are cycles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The loop could run forever; detect cycles first with Floyd and handle the cyclic case separately.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Worst-case iterations?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At most m + n + 1, counting the null step; Example 2 prints 9 for a=2, b=3, c=3.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">WeakSet</code> be better for the baseline?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It also keys by reference and does not keep nodes alive afterwards, but memory during the call is still O(m).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it by modifying the lists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Link A's tail to B's head and find the cycle start with Floyd, then unlink. It works, but mutating input is usually not allowed.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Intersection node** | the first node that both lists reach |
| **Node identity** | same object in memory, not equal values |
| **Switch-heads two pointers** | each pointer walks its list, then the other list |
| **Loop invariant** | a fact that stays true on every iteration |
| **Reference equality** | \`===\` on objects: true only for the same object |

---
**Conclusion:** Two intersecting lists form a Y, so the question is where the arms join. A hash set answers it in O(m + n) time and O(m) space; aligning the lengths or the switch-heads trick answers it in O(1) space, because both pointers walk exactly a + c + b nodes and meet at the junction, or both reach null together when there is none. In JavaScript, compare references with \`===\`, keep list ends as \`null\`, and the switch-heads loop is the whole O(1)-space answer.`,
        examples: [
          { label: `Switch-heads intersection on Y-shaped and separate lists`, code: `class ListNode {
  constructor(val) {
    this.val = val;
    this.next = null;
  }
}

// Build nodes for values, ending in the (possibly shared) tail.
function link(values, tail = null) {
  let head = tail;
  for (let i = values.length - 1; i >= 0; i--) {
    const node = new ListNode(values[i]);
    node.next = head;
    head = node;
  }
  return head;
}

function makePair(aOnly, bOnly, shared) {
  const common = link(shared);
  return [link(aOnly, common), link(bOnly, common), common];
}

function toArray(head) {
  const out = [];
  for (let node = head; node !== null; node = node.next) out.push(node.val);
  return out;
}

// Switch heads: each pointer walks its own list, then the other one.
function getIntersection(headA, headB) {
  let pa = headA;
  let pb = headB;
  while (pa !== pb) {
    pa = pa !== null ? pa.next : headB;
    pb = pb !== null ? pb.next : headA;
  }
  return pa;                     // the shared node, or null when both ran out together
}

function indexOf(head, target) {
  let i = 0;
  while (head !== target) {
    head = head.next;
    i++;
  }
  return i;
}

function fmt(values) {
  return '[' + values.join(', ') + ']';
}

function describe(aOnly, bOnly, shared) {
  const [headA, headB] = makePair(aOnly, bOnly, shared);
  const node = getIntersection(headA, headB);
  const label = 'A = ' + fmt(toArray(headA)) + ', B = ' + fmt(toArray(headB)) + ': ';
  if (node === null) return label + 'no intersection';
  return label + 'intersect at value ' + node.val + ' (A index ' + indexOf(headA, node) +
    ', B index ' + indexOf(headB, node) + ')';
}

console.log(describe([4, 1], [5, 6, 1], [8, 4, 5])); // A = [4, 1, 8, 4, 5], B = [5, 6, 1, 8, 4, 5]: intersect at value 8 (A index 2, B index 3)
console.log(describe([2, 6, 4], [1, 5], [])); // A = [2, 6, 4], B = [1, 5]: no intersection
console.log(describe([], [3], [7, 9])); // A = [7, 9], B = [3, 7, 9]: intersect at value 7 (A index 0, B index 1)
console.log(describe([], [], [5, 6])); // A = [5, 6], B = [5, 6]: intersect at value 5 (A index 0, B index 0)
console.log(describe([1, 2, 3], [9], [10])); // A = [1, 2, 3, 10], B = [9, 10]: intersect at value 10 (A index 3, B index 1)
console.log(describe([], [1], [])); // A = [], B = [1]: no intersection
console.log(describe([1, 2, 3], [1, 2, 3], [])); // A = [1, 2, 3], B = [1, 2, 3]: no intersection
` },
          { label: `Hash set, length difference and switch heads on every small shape`, code: `class ListNode {
  constructor(val) {
    this.val = val;
    this.next = null;
  }
}

// Build nodes for values, ending in the (possibly shared) tail.
function link(values, tail = null) {
  let head = tail;
  for (let i = values.length - 1; i >= 0; i--) {
    const node = new ListNode(values[i]);
    node.next = head;
    head = node;
  }
  return head;
}

function makePair(aOnly, bOnly, shared) {
  const common = link(shared);
  return [link(aOnly, common), link(bOnly, common), common];
}

function toArray(head) {
  const out = [];
  for (let node = head; node !== null; node = node.next) out.push(node.val);
  return out;
}

// Switch heads: each pointer walks its own list, then the other one.
function getIntersection(headA, headB) {
  let pa = headA;
  let pb = headB;
  while (pa !== pb) {
    pa = pa !== null ? pa.next : headB;
    pb = pb !== null ? pb.next : headA;
  }
  return pa;                     // the shared node, or null when both ran out together
}

function indexOf(head, target) {
  let i = 0;
  while (head !== target) {
    head = head.next;
    i++;
  }
  return i;
}

function fmt(values) {
  return '[' + values.join(', ') + ']';
}

function byHashSet(headA, headB) {
  const seen = new Set();
  for (let n = headA; n !== null; n = n.next) seen.add(n);
  for (let n = headB; n !== null; n = n.next) if (seen.has(n)) return n;
  return null;
}

function length(head) {
  let n = 0;
  for (; head !== null; head = head.next) n++;
  return n;
}

function byLengthDifference(headA, headB) {
  let la = length(headA);
  let lb = length(headB);
  for (; la > lb; la--) headA = headA.next;
  for (; lb > la; lb--) headB = headB.next;
  while (headA !== headB) {
    headA = headA.next;
    headB = headB.next;
  }
  return headA;
}

function iterations(headA, headB) {
  let pa = headA;
  let pb = headB;
  let steps = 0;
  while (pa !== pb) {
    pa = pa !== null ? pa.next : headB;
    pb = pb !== null ? pb.next : headA;
    steps++;
  }
  return steps;
}

function range(n) {
  return Array.from({ length: n }, (_, i) => i);
}

let agree = 0;
let total = 0;
for (let a = 0; a < 5; a++) {
  for (let b = 0; b < 5; b++) {
    for (let c = 0; c < 5; c++) {
      const [headA, headB, common] = makePair(range(a), range(b), range(c));
      const got = [getIntersection(headA, headB), byHashSet(headA, headB), byLengthDifference(headA, headB)];
      total++;
      if (got.every((g) => g === common)) agree++;   // common is null when c == 0
    }
  }
}
console.log('all three methods agree on ' + agree + ' of ' + total + ' shapes');

for (const [a, b, c] of [[2, 3, 3], [2, 2, 3], [3, 2, 0], [0, 0, 4], [5, 1, 1]]) {
  const [headA, headB] = makePair(range(a), range(b), range(c));
  console.log('a=' + a + ' b=' + b + ' shared=' + c + ': switch-heads loop ran ' +
    iterations(headA, headB) + ' iterations');
}
` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You get the heads of two singly linked lists. If they merge into a shared tail, return the first shared node; otherwise return null. No cycles, and the lists must stay unchanged. Can you do it in O(1) extra memory? Please write it in Java."

**What a strong answer should cover:**
- Intersection means the same node object, not equal values; the lists form a Y.
- A \`HashSet<ListNode>\` baseline in O(m + n) time and O(m) space.
- An O(1)-space answer: align by length difference, or switch heads so both pointers walk a + c + b nodes.
- Why the switch-heads loop ends with no intersection: both pointers become null on the same step.
- Java specifics: \`==\` on references is the identity test we need (not \`equals\`); the \`HashSet\` version depends on \`ListNode\` keeping \`Object\`'s identity \`equals\`/\`hashCode\`.

**Clarifying questions expected:**
- "Same node, or equal values?"
- "Can the lists contain cycles, and may I modify them?"

**Code / implementation expected:** Yes — \`ListNode getIntersection(ListNode headA, ListNode headB)\` in Java, O(1) space.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Two hiking trails start at different car parks, wind through the forest separately, and at some point join into one shared path that leads to the same waterfall. Two friends start at the two car parks at the same moment and walk at the same speed. Where do the trails merge?

If the trails were the same length before the junction, the friends would simply arrive at the junction together. They are not, so one friend gets there first and walks on alone. Here is the trick: when a friend reaches the waterfall, they are teleported to the **other** car park and keep walking. Now each friend walks "my trail + the shared part + the other trail", which is the same total distance for both. So on their second approach to the junction they arrive **at the same moment**, and the first place they stand side by side is the junction. If the trails never merge, they both reach the end of the second trail at the same moment instead and stop.

Two singly linked lists that **intersect** look exactly like those trails: they start apart and, from some node on, share every node to the end. The question asks for that first shared node. It is rated easy because the code is five lines, but explaining why the switch-heads trick terminates is what separates a memorised answer from an understood one.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does "intersect" mean the same node object, or equal values? | It means the same node (same reference). Two lists can hold equal values without sharing any node. |
| Can either list contain a cycle? | The classic version guarantees no cycles; with cycles the two-pointer trick can loop forever. |
| What should I return if they do not intersect? | Usually null / None / nullptr. |
| Must the lists be left unchanged? | Yes in the classic version; all three approaches below are read-only. |
| Is O(n) extra memory allowed? | A hash set is the easy answer; the follow-up asks for O(1). |

## 3. The Core Idea

📌 **Interview term: Intersection node** — the first node that belongs to both lists. Because each node has a single \`next\`, once two lists share a node they share **every** node after it: the shape is a Y, never an X.

📌 **Interview term: Node identity** — two lists intersect at a node only if they reach the very same object in memory. Equal values are not enough.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="Two lists forming a Y shape: list A 4 then 1, list B 5 then 6 then 1, both continue into the shared nodes 8, 4, 5">
  <defs>
    <marker id="li1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="128" y="30" text-anchor="middle">headA</text>
  <rect class="d-box" x="100" y="40" width="56" height="46" rx="8"/>
  <text class="d-text" x="128" y="69" text-anchor="middle">4</text>
  <rect class="d-box" x="210" y="40" width="56" height="46" rx="8"/>
  <text class="d-text" x="238" y="69" text-anchor="middle">1</text>
  <path class="d-edge" d="M 158 63 L 204 63" fill="none" marker-end="url(#li1-arrow)"/>
  <text class="d-sub" x="58" y="180" text-anchor="middle">headB</text>
  <rect class="d-box" x="30" y="192" width="56" height="46" rx="8"/>
  <text class="d-text" x="58" y="221" text-anchor="middle">5</text>
  <rect class="d-box" x="140" y="192" width="56" height="46" rx="8"/>
  <text class="d-text" x="168" y="221" text-anchor="middle">6</text>
  <rect class="d-box" x="250" y="192" width="56" height="46" rx="8"/>
  <text class="d-text" x="278" y="221" text-anchor="middle">1</text>
  <path class="d-edge" d="M 88 215 L 134 215" fill="none" marker-end="url(#li1-arrow)"/>
  <path class="d-edge" d="M 198 215 L 244 215" fill="none" marker-end="url(#li1-arrow)"/>
  <rect class="d-box-accent" x="380" y="116" width="56" height="46" rx="8"/>
  <text class="d-text" x="408" y="145" text-anchor="middle">8</text>
  <rect class="d-box" x="490" y="116" width="56" height="46" rx="8"/>
  <text class="d-text" x="518" y="145" text-anchor="middle">4</text>
  <rect class="d-box" x="600" y="116" width="56" height="46" rx="8"/>
  <text class="d-text" x="628" y="145" text-anchor="middle">5</text>
  <path class="d-edge" d="M 438 139 L 484 139" fill="none" marker-end="url(#li1-arrow)"/>
  <path class="d-edge" d="M 548 139 L 594 139" fill="none" marker-end="url(#li1-arrow)"/>
  <path class="d-edge" d="M 268 70 L 374 128" fill="none" marker-end="url(#li1-arrow)"/>
  <path class="d-edge" d="M 308 206 L 374 150" fill="none" marker-end="url(#li1-arrow)"/>
  <text class="d-text d-accent" x="408" y="100" text-anchor="middle">intersection</text>
</svg>

Here list A is 4, 1, 8, 4, 5 and list B is 5, 6, 1, 8, 4, 5. Both contain the value 1, but those are two different nodes; the answer is the node holding 8.

### Approach 1: hash set

Walk list A and put every node into a set (a [hash table](/interview-question/how-does-a-hash-table-work) keyed by node identity). Then walk list B; the first node already in the set is the intersection. O(m + n) time, O(m) extra space.

### Approach 2: length difference

Measure both lengths. Advance the longer list's pointer by the difference, so both pointers are the same distance from the end. Then move them together; the first time they point at the same node is the intersection (or both reach the end together). O(m + n) time, O(1) space, but three passes.

### Approach 3: switch heads (two pointers)

📌 **Interview term: Switch-heads two pointers** — pointer A walks list A and then continues at the head of B; pointer B walks list B and then continues at the head of A. Stop when they are equal.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="Pointer A walks A only, shared, then B only; pointer B walks B only, shared, then A only; both cover the same distance and reach the intersection together">
  <defs>
    <marker id="li2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="30" y="38" text-anchor="start">pointer A</text>
  <rect class="d-box" x="30" y="50" width="100" height="46" rx="8"/>
  <text class="d-text" x="80" y="79" text-anchor="middle">A only</text>
  <rect class="d-box-muted" x="130" y="50" width="150" height="46" rx="8"/>
  <text class="d-text" x="205" y="79" text-anchor="middle">shared</text>
  <rect class="d-box" x="280" y="50" width="150" height="46" rx="8"/>
  <text class="d-text" x="355" y="79" text-anchor="middle">B only</text>
  <rect class="d-box-accent" x="470" y="50" width="140" height="46" rx="8"/>
  <text class="d-text" x="540" y="79" text-anchor="middle">meet</text>
  <path class="d-edge-accent" d="M 432 73 L 464 73" fill="none" marker-end="url(#li2-arrow)"/>
  <text class="d-sub" x="30" y="148" text-anchor="start">pointer B</text>
  <rect class="d-box" x="30" y="160" width="150" height="46" rx="8"/>
  <text class="d-text" x="105" y="189" text-anchor="middle">B only</text>
  <rect class="d-box-muted" x="180" y="160" width="150" height="46" rx="8"/>
  <text class="d-text" x="255" y="189" text-anchor="middle">shared</text>
  <rect class="d-box" x="330" y="160" width="100" height="46" rx="8"/>
  <text class="d-text" x="380" y="189" text-anchor="middle">A only</text>
  <rect class="d-box-accent" x="470" y="160" width="140" height="46" rx="8"/>
  <text class="d-text" x="540" y="189" text-anchor="middle">meet</text>
  <path class="d-edge-accent" d="M 432 183 L 464 183" fill="none" marker-end="url(#li2-arrow)"/>
</svg>

Write \`a\` for the nodes only in A, \`b\` for the nodes only in B and \`c\` for the shared tail. Pointer A walks \`a + c\`, jumps, then walks \`b\` more to reach the intersection: \`a + c + b\` nodes, plus the one step it spends on null before jumping. Pointer B walks \`b + c + a\`: the same number. So they arrive at the intersection on the same step, and they cannot have met earlier because before that they were on unshared nodes.

If there is no intersection (\`c = 0\`), each pointer walks \`a + b\` nodes and then both become null on the **same** step, so \`pA == pB\` (both null) ends the loop and null is returned. That is why the loop needs no length check and no cycle detection.

📌 **Interview term: Loop invariant** — a statement that is true on every iteration. Here: after the switch, both pointers are the same number of steps away from the intersection (or from the shared null end).

## 4. The Solution in Java

The examples build two lists that share a tail: \`link(shared, null)\` creates the shared nodes once, then \`link(aOnly, common)\` and \`link(bOnly, common)\` build each list in front of them.

~~~java
static ListNode getIntersection(ListNode headA, ListNode headB) {
    ListNode pa = headA, pb = headB;
    while (pa != pb) {                 // reference comparison: same node object?
        pa = (pa != null) ? pa.next : headB;
        pb = (pb != null) ? pb.next : headA;
    }
    return pa;                         // the shared node, or null when both ran out together
}
~~~

**Why each line is there:**

- \`pa != pb\` compares **references**. That is exactly the question "same node?"; \`equals\` would be wrong if someone overrode it to compare values.
- The ternary switches only when the pointer **is** \`null\`, one step past the last node, so both walks have the same length and the no-intersection case ends with both \`null\` (and \`null == null\` is true).
- There is no \`NullPointerException\` risk: \`pa.next\` is read only when \`pa != null\`.

### The length-difference version

~~~java
static ListNode byLengthDifference(ListNode headA, ListNode headB) {
    int la = length(headA), lb = length(headB);
    for (; la > lb; la--) headA = headA.next;
    for (; lb > la; lb--) headB = headB.next;
    while (headA != headB) {
        headA = headA.next;
        headB = headB.next;
    }
    return headA;
}
~~~

The \`HashSet\` version (\`byHashSet\` in Example 2) works because \`ListNode\` does not override \`equals\`/\`hashCode\`, so the set uses \`Object\`'s identity versions. If your node class does override them by value, use \`Collections.newSetFromMap(new IdentityHashMap<>())\`.

## 5. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Switch-heads intersection on Y-shaped and separate lists** prints:

~~~text
A = [4, 1, 8, 4, 5], B = [5, 6, 1, 8, 4, 5]: intersect at value 8 (A index 2, B index 3)
A = [2, 6, 4], B = [1, 5]: no intersection
A = [7, 9], B = [3, 7, 9]: intersect at value 7 (A index 0, B index 1)
A = [5, 6], B = [5, 6]: intersect at value 5 (A index 0, B index 0)
A = [1, 2, 3, 10], B = [9, 10]: intersect at value 10 (A index 3, B index 1)
A = [], B = [1]: no intersection
A = [1, 2, 3], B = [1, 2, 3]: no intersection
~~~

**Example 2 — Hash set, length difference and switch heads on every small shape** prints:

~~~text
all three methods agree on 125 of 125 shapes
a=2 b=3 shared=3: switch-heads loop ran 9 iterations
a=2 b=2 shared=3: switch-heads loop ran 2 iterations
a=3 b=2 shared=0: switch-heads loop ran 6 iterations
a=0 b=0 shared=4: switch-heads loop ran 0 iterations
a=5 b=1 shared=1: switch-heads loop ran 8 iterations
~~~

**Reading the output:** in Example 1 the first line finds the node holding 8 even though the value 1 appears in both lists; the line "A = [1, 2, 3], B = [1, 2, 3]" shows two lists with identical values and **no** intersection, because they share no node. In Example 2 the three approaches agree on all 125 shapes with 0 to 4 nodes in each part. The iteration counts are \`a + c + b + 1\` when the lists intersect and the unshared lengths differ (2 + 3 + 3 + 1 = 9, and 5 + 1 + 1 + 1 = 8), the \`+ 1\` being the step each pointer spends on null before switching; just \`a\` when the unshared parts are equally long (2, and 0 for two identical heads); and \`a + b + 1\` with no intersection (3 + 2 + 1 = 6), when both pointers reach null together.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Compare every pair of nodes | O(m · n) | O(1) | for each node of A, scan all of B |
| Hash set of A's nodes | O(m + n) | O(m) | one pass to insert, one pass to look up |
| Length difference | O(m + n) | O(1) | two length passes plus one aligned pass |
| Switch heads | O(m + n) | O(1) | each pointer takes at most m + n steps |

m and n are the lengths of the two lists. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Either list empty:** no intersection; the switch-heads loop ends after the other list is walked once.
- **Same list passed twice:** the answer is the head (a = b = 0).
- **Intersection at a head:** one list is a suffix of the other (a = 0 or b = 0).
- **Intersection only at the last node:** c = 1.
- **Equal values, no shared nodes:** no intersection; this is the case that catches value comparison.
- **Lists with cycles:** outside the classic problem; say so and ask before assuming.

## Common Pitfalls

- **Comparing \`pa.val == pb.val\`.** Separate lists with equal values look intersecting; compare references.
- **Using \`pa.equals(pb)\`.** Works only while \`equals\` is not overridden; \`==\` states the intent and cannot be changed by a subclass.
- **Switching on \`pa.next == null\`.** Skips the null step; with no intersection the pointers never become equal and the loop never ends.
- **\`HashSet\` with a value-based \`equals\`.** Merges different nodes with equal values; use an identity set.
- **Forgetting the no-intersection return.** The method must return \`null\` (both pointers), not the last node visited.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Intersection means the same node object; after it the lists share every node (a Y shape).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Baseline:</strong> <span style="color:#f0e2c8;">Add A's nodes to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet&lt;ListNode&gt;</code>, return the first node of B that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contains</code> finds. O(m + n) time, O(m) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The trick:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pa = (pa != null) ? pa.next : headB</code> and the mirror for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pb</code>, looping <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while (pa != pb)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why it ends:</strong> <span style="color:#f0e2c8;">Both walk a + c + b nodes and meet at the junction; with no junction both are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> on the same step.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> on objects is reference identity, which is the right test; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet</code> baseline silently depends on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hashCode</code> not being overridden.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can they not meet early?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Before the junction each pointer is on a node that belongs to only one list.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if there are cycles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The loop may never end. Detect a cycle in each list first (Floyd) and handle cyclic lists separately.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Worst-case iterations?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At most m + n + 1 counting the null step; Example 2 prints 9 for a=2, b=3, c=3.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Length difference or switch heads?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both O(1) space. Length difference makes three passes and is easiest to explain; switch heads is shorter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ListNode</code> overrides <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">equals</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both O(1) versions still work because they use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>; only the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet</code> version breaks, so switch it to an identity set.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Intersection node** | the first node that both lists reach |
| **Node identity** | same object in memory, not equal values |
| **Switch-heads two pointers** | each pointer walks its list, then the other list |
| **Loop invariant** | a fact that stays true on every iteration |
| **IdentityHashMap** | a map that compares keys with \`==\` instead of \`equals\` |

---
**Conclusion:** Two intersecting lists form a Y, so the question is where the arms join. A hash set answers it in O(m + n) time and O(m) space; aligning the lengths or the switch-heads trick answers it in O(1) space, because both pointers walk exactly a + c + b nodes and meet at the junction, or both reach null together when there is none. In Java, compare references with \`==\` on purpose, switch heads only on \`null\`, and know why the \`HashSet\` baseline depends on identity \`equals\`.`,
        examples: [
          { label: `Switch-heads intersection on Y-shaped and separate lists`, code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    // Build nodes for values, ending in the (possibly shared) tail.
    static ListNode link(int[] values, ListNode tail) {
        ListNode head = tail;
        for (int i = values.length - 1; i >= 0; i--) {
            ListNode node = new ListNode(values[i]);
            node.next = head;
            head = node;
        }
        return head;
    }

    static List<Integer> toList(ListNode head) {
        List<Integer> out = new ArrayList<>();
        for (ListNode n = head; n != null; n = n.next) out.add(n.val);
        return out;
    }

    // Switch heads: each pointer walks its own list, then the other one.
    static ListNode getIntersection(ListNode headA, ListNode headB) {
        ListNode pa = headA, pb = headB;
        while (pa != pb) {                 // reference comparison: same node object?
            pa = (pa != null) ? pa.next : headB;
            pb = (pb != null) ? pb.next : headA;
        }
        return pa;                         // the shared node, or null when both ran out together
    }

    static int indexOf(ListNode head, ListNode target) {
        int i = 0;
        for (ListNode n = head; n != target; n = n.next) i++;
        return i;
    }

    static String describe(int[] aOnly, int[] bOnly, int[] shared) {
        ListNode common = link(shared, null);
        ListNode headA = link(aOnly, common), headB = link(bOnly, common);
        ListNode node = getIntersection(headA, headB);
        String label = "A = " + toList(headA) + ", B = " + toList(headB) + ": ";
        if (node == null) return label + "no intersection";
        return label + "intersect at value " + node.val + " (A index " + indexOf(headA, node)
            + ", B index " + indexOf(headB, node) + ")";
    }

    public static void main(String[] args) {
        System.out.println(describe(new int[]{4, 1}, new int[]{5, 6, 1}, new int[]{8, 4, 5}));
        System.out.println(describe(new int[]{2, 6, 4}, new int[]{1, 5}, new int[]{}));
        System.out.println(describe(new int[]{}, new int[]{3}, new int[]{7, 9}));
        System.out.println(describe(new int[]{}, new int[]{}, new int[]{5, 6}));
        System.out.println(describe(new int[]{1, 2, 3}, new int[]{9}, new int[]{10}));
        System.out.println(describe(new int[]{}, new int[]{1}, new int[]{}));
        System.out.println(describe(new int[]{1, 2, 3}, new int[]{1, 2, 3}, new int[]{}));
    }
}
` },
          { label: `Hash set, length difference and switch heads on every small shape`, code: `import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val) { this.val = val; }
    }

    // Build nodes for values, ending in the (possibly shared) tail.
    static ListNode link(int[] values, ListNode tail) {
        ListNode head = tail;
        for (int i = values.length - 1; i >= 0; i--) {
            ListNode node = new ListNode(values[i]);
            node.next = head;
            head = node;
        }
        return head;
    }

    static List<Integer> toList(ListNode head) {
        List<Integer> out = new ArrayList<>();
        for (ListNode n = head; n != null; n = n.next) out.add(n.val);
        return out;
    }

    // Switch heads: each pointer walks its own list, then the other one.
    static ListNode getIntersection(ListNode headA, ListNode headB) {
        ListNode pa = headA, pb = headB;
        while (pa != pb) {                 // reference comparison: same node object?
            pa = (pa != null) ? pa.next : headB;
            pb = (pb != null) ? pb.next : headA;
        }
        return pa;                         // the shared node, or null when both ran out together
    }

    static int indexOf(ListNode head, ListNode target) {
        int i = 0;
        for (ListNode n = head; n != target; n = n.next) i++;
        return i;
    }

    static ListNode byHashSet(ListNode headA, ListNode headB) {
        Set<ListNode> seen = new HashSet<>();     // ListNode keeps identity equals/hashCode
        for (ListNode n = headA; n != null; n = n.next) seen.add(n);
        for (ListNode n = headB; n != null; n = n.next) if (seen.contains(n)) return n;
        return null;
    }

    static int length(ListNode head) {
        int n = 0;
        for (; head != null; head = head.next) n++;
        return n;
    }

    static ListNode byLengthDifference(ListNode headA, ListNode headB) {
        int la = length(headA), lb = length(headB);
        for (; la > lb; la--) headA = headA.next;
        for (; lb > la; lb--) headB = headB.next;
        while (headA != headB) {
            headA = headA.next;
            headB = headB.next;
        }
        return headA;
    }

    static int iterations(ListNode headA, ListNode headB) {
        ListNode pa = headA, pb = headB;
        int steps = 0;
        while (pa != pb) {
            pa = (pa != null) ? pa.next : headB;
            pb = (pb != null) ? pb.next : headA;
            steps++;
        }
        return steps;
    }

    static int[] range(int n) {
        int[] r = new int[n];
        for (int i = 0; i < n; i++) r[i] = i;
        return r;
    }

    public static void main(String[] args) {
        int agree = 0, total = 0;
        for (int a = 0; a < 5; a++) {
            for (int b = 0; b < 5; b++) {
                for (int c = 0; c < 5; c++) {
                    ListNode common = link(range(c), null);   // null when c == 0
                    ListNode headA = link(range(a), common), headB = link(range(b), common);
                    total++;
                    if (getIntersection(headA, headB) == common && byHashSet(headA, headB) == common
                            && byLengthDifference(headA, headB) == common) agree++;
                }
            }
        }
        System.out.println("all three methods agree on " + agree + " of " + total + " shapes");

        int[][] cases = {{2, 3, 3}, {2, 2, 3}, {3, 2, 0}, {0, 0, 4}, {5, 1, 1}};
        for (int[] k : cases) {
            ListNode common = link(range(k[2]), null);
            ListNode headA = link(range(k[0]), common), headB = link(range(k[1]), common);
            System.out.println("a=" + k[0] + " b=" + k[1] + " shared=" + k[2] + ": switch-heads loop ran "
                + iterations(headA, headB) + " iterations");
        }
    }
}
` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You get pointers to the heads of two singly linked lists. If they merge into a shared tail, return a pointer to the first shared node; otherwise return nullptr. No cycles, and the lists must stay unchanged. Can you do it in O(1) extra memory? Please write it in C++."

**What a strong answer should cover:**
- Intersection means the same node (same address), not equal values; the lists form a Y.
- An \`std::unordered_set<ListNode*>\` baseline in O(m + n) time and O(m) space.
- An O(1)-space answer: align by length difference, or switch heads so both pointers walk a + c + b nodes.
- Why the switch-heads loop ends with no intersection: both pointers become nullptr on the same step.
- C++ specifics: compare pointers, not \`->val\`; never dereference a null pointer in the switch; the shared tail is owned once, so freeing both lists independently would delete it twice.

**Clarifying questions expected:**
- "Same node, or equal values?"
- "Who owns the shared nodes, and can there be cycles?"

**Code / implementation expected:** Yes — \`ListNode* getIntersection(ListNode* headA, ListNode* headB)\` in C++, O(1) space.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Two hiking trails start at different car parks, wind through the forest separately, and at some point join into one shared path that leads to the same waterfall. Two friends start at the two car parks at the same moment and walk at the same speed. Where do the trails merge?

If the trails were the same length before the junction, the friends would simply arrive at the junction together. They are not, so one friend gets there first and walks on alone. Here is the trick: when a friend reaches the waterfall, they are teleported to the **other** car park and keep walking. Now each friend walks "my trail + the shared part + the other trail", which is the same total distance for both. So on their second approach to the junction they arrive **at the same moment**, and the first place they stand side by side is the junction. If the trails never merge, they both reach the end of the second trail at the same moment instead and stop.

Two singly linked lists that **intersect** look exactly like those trails: they start apart and, from some node on, share every node to the end. The question asks for that first shared node. It is rated easy because the code is five lines, but explaining why the switch-heads trick terminates is what separates a memorised answer from an understood one.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does "intersect" mean the same node object, or equal values? | It means the same node (same reference). Two lists can hold equal values without sharing any node. |
| Can either list contain a cycle? | The classic version guarantees no cycles; with cycles the two-pointer trick can loop forever. |
| What should I return if they do not intersect? | Usually null / None / nullptr. |
| Must the lists be left unchanged? | Yes in the classic version; all three approaches below are read-only. |
| Is O(n) extra memory allowed? | A hash set is the easy answer; the follow-up asks for O(1). |

## 3. The Core Idea

📌 **Interview term: Intersection node** — the first node that belongs to both lists. Because each node has a single \`next\`, once two lists share a node they share **every** node after it: the shape is a Y, never an X.

📌 **Interview term: Node identity** — two lists intersect at a node only if they reach the very same object in memory. Equal values are not enough.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="Two lists forming a Y shape: list A 4 then 1, list B 5 then 6 then 1, both continue into the shared nodes 8, 4, 5">
  <defs>
    <marker id="li1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="128" y="30" text-anchor="middle">headA</text>
  <rect class="d-box" x="100" y="40" width="56" height="46" rx="8"/>
  <text class="d-text" x="128" y="69" text-anchor="middle">4</text>
  <rect class="d-box" x="210" y="40" width="56" height="46" rx="8"/>
  <text class="d-text" x="238" y="69" text-anchor="middle">1</text>
  <path class="d-edge" d="M 158 63 L 204 63" fill="none" marker-end="url(#li1-arrow)"/>
  <text class="d-sub" x="58" y="180" text-anchor="middle">headB</text>
  <rect class="d-box" x="30" y="192" width="56" height="46" rx="8"/>
  <text class="d-text" x="58" y="221" text-anchor="middle">5</text>
  <rect class="d-box" x="140" y="192" width="56" height="46" rx="8"/>
  <text class="d-text" x="168" y="221" text-anchor="middle">6</text>
  <rect class="d-box" x="250" y="192" width="56" height="46" rx="8"/>
  <text class="d-text" x="278" y="221" text-anchor="middle">1</text>
  <path class="d-edge" d="M 88 215 L 134 215" fill="none" marker-end="url(#li1-arrow)"/>
  <path class="d-edge" d="M 198 215 L 244 215" fill="none" marker-end="url(#li1-arrow)"/>
  <rect class="d-box-accent" x="380" y="116" width="56" height="46" rx="8"/>
  <text class="d-text" x="408" y="145" text-anchor="middle">8</text>
  <rect class="d-box" x="490" y="116" width="56" height="46" rx="8"/>
  <text class="d-text" x="518" y="145" text-anchor="middle">4</text>
  <rect class="d-box" x="600" y="116" width="56" height="46" rx="8"/>
  <text class="d-text" x="628" y="145" text-anchor="middle">5</text>
  <path class="d-edge" d="M 438 139 L 484 139" fill="none" marker-end="url(#li1-arrow)"/>
  <path class="d-edge" d="M 548 139 L 594 139" fill="none" marker-end="url(#li1-arrow)"/>
  <path class="d-edge" d="M 268 70 L 374 128" fill="none" marker-end="url(#li1-arrow)"/>
  <path class="d-edge" d="M 308 206 L 374 150" fill="none" marker-end="url(#li1-arrow)"/>
  <text class="d-text d-accent" x="408" y="100" text-anchor="middle">intersection</text>
</svg>

Here list A is 4, 1, 8, 4, 5 and list B is 5, 6, 1, 8, 4, 5. Both contain the value 1, but those are two different nodes; the answer is the node holding 8.

### Approach 1: hash set

Walk list A and put every node into a set (a [hash table](/interview-question/how-does-a-hash-table-work) keyed by node identity). Then walk list B; the first node already in the set is the intersection. O(m + n) time, O(m) extra space.

### Approach 2: length difference

Measure both lengths. Advance the longer list's pointer by the difference, so both pointers are the same distance from the end. Then move them together; the first time they point at the same node is the intersection (or both reach the end together). O(m + n) time, O(1) space, but three passes.

### Approach 3: switch heads (two pointers)

📌 **Interview term: Switch-heads two pointers** — pointer A walks list A and then continues at the head of B; pointer B walks list B and then continues at the head of A. Stop when they are equal.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 240" role="img" aria-label="Pointer A walks A only, shared, then B only; pointer B walks B only, shared, then A only; both cover the same distance and reach the intersection together">
  <defs>
    <marker id="li2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="30" y="38" text-anchor="start">pointer A</text>
  <rect class="d-box" x="30" y="50" width="100" height="46" rx="8"/>
  <text class="d-text" x="80" y="79" text-anchor="middle">A only</text>
  <rect class="d-box-muted" x="130" y="50" width="150" height="46" rx="8"/>
  <text class="d-text" x="205" y="79" text-anchor="middle">shared</text>
  <rect class="d-box" x="280" y="50" width="150" height="46" rx="8"/>
  <text class="d-text" x="355" y="79" text-anchor="middle">B only</text>
  <rect class="d-box-accent" x="470" y="50" width="140" height="46" rx="8"/>
  <text class="d-text" x="540" y="79" text-anchor="middle">meet</text>
  <path class="d-edge-accent" d="M 432 73 L 464 73" fill="none" marker-end="url(#li2-arrow)"/>
  <text class="d-sub" x="30" y="148" text-anchor="start">pointer B</text>
  <rect class="d-box" x="30" y="160" width="150" height="46" rx="8"/>
  <text class="d-text" x="105" y="189" text-anchor="middle">B only</text>
  <rect class="d-box-muted" x="180" y="160" width="150" height="46" rx="8"/>
  <text class="d-text" x="255" y="189" text-anchor="middle">shared</text>
  <rect class="d-box" x="330" y="160" width="100" height="46" rx="8"/>
  <text class="d-text" x="380" y="189" text-anchor="middle">A only</text>
  <rect class="d-box-accent" x="470" y="160" width="140" height="46" rx="8"/>
  <text class="d-text" x="540" y="189" text-anchor="middle">meet</text>
  <path class="d-edge-accent" d="M 432 183 L 464 183" fill="none" marker-end="url(#li2-arrow)"/>
</svg>

Write \`a\` for the nodes only in A, \`b\` for the nodes only in B and \`c\` for the shared tail. Pointer A walks \`a + c\`, jumps, then walks \`b\` more to reach the intersection: \`a + c + b\` nodes, plus the one step it spends on null before jumping. Pointer B walks \`b + c + a\`: the same number. So they arrive at the intersection on the same step, and they cannot have met earlier because before that they were on unshared nodes.

If there is no intersection (\`c = 0\`), each pointer walks \`a + b\` nodes and then both become null on the **same** step, so \`pA == pB\` (both null) ends the loop and null is returned. That is why the loop needs no length check and no cycle detection.

📌 **Interview term: Loop invariant** — a statement that is true on every iteration. Here: after the switch, both pointers are the same number of steps away from the intersection (or from the shared null end).

## 4. The Solution in C++

The examples keep every node in a \`Pool\` (a vector of \`std::unique_ptr<ListNode>\`) and build the two lists with \`link(values, tail, pool)\` so that both end in the same shared nodes. A shared tail has two "owners" in the list sense, so the usual free-the-list loop run on A and then on B would \`delete\` the shared nodes twice, which is undefined behaviour. One owner per node avoids that.

~~~cpp
ListNode* getIntersection(ListNode* headA, ListNode* headB) {
    ListNode* pa = headA;
    ListNode* pb = headB;
    while (pa != pb) {                     // address comparison: same node?
        pa = (pa != nullptr) ? pa->next : headB;
        pb = (pb != nullptr) ? pb->next : headA;
    }
    return pa;                             // the shared node, or nullptr when both ran out together
}
~~~

**Why each line is there:**

- \`pa != pb\` compares **addresses**: two pointers are equal only if they point at the same node.
- The ternary reads \`pa->next\` only when \`pa\` is not null, and switches heads on the step after the last node; both walks are then equally long, and with no intersection both pointers are \`nullptr\` together.
- The function only reads the lists; it never allocates or frees.

### The length-difference version

~~~cpp
ListNode* byLengthDifference(ListNode* headA, ListNode* headB) {
    int la = length(headA), lb = length(headB);
    for (; la > lb; --la) headA = headA->next;
    for (; lb > la; --lb) headB = headB->next;
    while (headA != headB) {
        headA = headA->next;
        headB = headB->next;
    }
    return headA;
}
~~~

The hash version (\`byHashSet\` in Example 2) stores \`ListNode*\` keys in an \`std::unordered_set\`, which hashes the pointer value, so it is keyed by node identity automatically.

## 5. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Switch-heads intersection on Y-shaped and separate lists** prints:

~~~text
A = [4, 1, 8, 4, 5], B = [5, 6, 1, 8, 4, 5]: intersect at value 8 (A index 2, B index 3)
A = [2, 6, 4], B = [1, 5]: no intersection
A = [7, 9], B = [3, 7, 9]: intersect at value 7 (A index 0, B index 1)
A = [5, 6], B = [5, 6]: intersect at value 5 (A index 0, B index 0)
A = [1, 2, 3, 10], B = [9, 10]: intersect at value 10 (A index 3, B index 1)
A = [], B = [1]: no intersection
A = [1, 2, 3], B = [1, 2, 3]: no intersection
~~~

**Example 2 — Hash set, length difference and switch heads on every small shape** prints:

~~~text
all three methods agree on 125 of 125 shapes
a=2 b=3 shared=3: switch-heads loop ran 9 iterations
a=2 b=2 shared=3: switch-heads loop ran 2 iterations
a=3 b=2 shared=0: switch-heads loop ran 6 iterations
a=0 b=0 shared=4: switch-heads loop ran 0 iterations
a=5 b=1 shared=1: switch-heads loop ran 8 iterations
~~~

**Reading the output:** in Example 1 the first line finds the node holding 8 even though the value 1 appears in both lists; the line "A = [1, 2, 3], B = [1, 2, 3]" shows two lists with identical values and **no** intersection, because they share no node. In Example 2 the three approaches agree on all 125 shapes with 0 to 4 nodes in each part. The iteration counts are \`a + c + b + 1\` when the lists intersect and the unshared lengths differ (2 + 3 + 3 + 1 = 9, and 5 + 1 + 1 + 1 = 8), the \`+ 1\` being the step each pointer spends on null before switching; just \`a\` when the unshared parts are equally long (2, and 0 for two identical heads); and \`a + b + 1\` with no intersection (3 + 2 + 1 = 6), when both pointers reach null together.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Compare every pair of nodes | O(m · n) | O(1) | for each node of A, scan all of B |
| Hash set of A's nodes | O(m + n) | O(m) | one pass to insert, one pass to look up |
| Length difference | O(m + n) | O(1) | two length passes plus one aligned pass |
| Switch heads | O(m + n) | O(1) | each pointer takes at most m + n steps |

m and n are the lengths of the two lists. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Either list empty:** no intersection; the switch-heads loop ends after the other list is walked once.
- **Same list passed twice:** the answer is the head (a = b = 0).
- **Intersection at a head:** one list is a suffix of the other (a = 0 or b = 0).
- **Intersection only at the last node:** c = 1.
- **Equal values, no shared nodes:** no intersection; this is the case that catches value comparison.
- **Lists with cycles:** outside the classic problem; say so and ask before assuming.

## Common Pitfalls

- **Comparing \`pa->val == pb->val\`.** Separate lists with equal values look intersecting; compare the pointers.
- **Dereferencing a null pointer in the switch.** \`pa = pa->next ? pa->next : headB\` crashes when \`pa\` is already \`nullptr\`; test \`pa\` itself.
- **Switching on \`pa->next == nullptr\`.** Skips the null step; with no intersection the loop never ends.
- **Double free of the shared tail.** Freeing list A and list B separately deletes the shared nodes twice. Free the unique parts of each list, then the shared tail once, or use one owner as the examples do.
- **\`std::set<ListNode*>\` for the baseline.** Works, but O(log n) per operation; \`unordered_set\` is O(1) on average.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Intersection means the same node address; after it the lists share every node (a Y shape).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Baseline:</strong> <span style="color:#f0e2c8;">Insert A's pointers into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_set&lt;ListNode*&gt;</code>, return the first node of B with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count(n)</code>. O(m + n) time, O(m) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The trick:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pa = pa ? pa-&gt;next : headB</code> and the mirror for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pb</code>, looping <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while (pa != pb)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why it ends:</strong> <span style="color:#f0e2c8;">Both walk a + c + b nodes and meet at the junction; with no junction both are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code> on the same step.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">Compare pointers, never dereference null in the switch, and remember the shared tail must be freed exactly once.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can they not meet early?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Before the junction each pointer is on a node only one list contains, so the addresses differ.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if there are cycles?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The loop may not end; detect cycles with Floyd first and treat cyclic lists separately.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Worst-case iterations?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At most m + n + 1 counting the null step; Example 2 prints 9 for a=2, b=3, c=3.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you free two intersecting lists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Find the intersection, free A up to (not including) it, free B up to it, then free the shared tail once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Length difference or switch heads?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both O(1) space. Length difference is easiest to reason about; switch heads is shorter and does one fewer pass.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Intersection node** | the first node that both lists reach |
| **Node identity** | same object in memory, not equal values |
| **Switch-heads two pointers** | each pointer walks its list, then the other list |
| **Loop invariant** | a fact that stays true on every iteration |
| **Double free** | calling \`delete\` twice on the same object, which is undefined behaviour |

---
**Conclusion:** Two intersecting lists form a Y, so the question is where the arms join. A hash set answers it in O(m + n) time and O(m) space; aligning the lengths or the switch-heads trick answers it in O(1) space, because both pointers walk exactly a + c + b nodes and meet at the junction, or both reach null together when there is none. In C++, compare addresses, guard every \`->\` in the switch, and be ready to explain who frees the shared tail.`,
        examples: [
          { label: `Switch-heads intersection on Y-shaped and separate lists`, code: `#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct ListNode {
    int val;
    ListNode* next = nullptr;
    explicit ListNode(int v) : val(v) {}
};

// Every node is owned exactly once by a pool. The shared tail belongs to both
// lists, so freeing list A and then list B would delete it twice.
using Pool = std::vector<std::unique_ptr<ListNode>>;

ListNode* link(const std::vector<int>& values, ListNode* tail, Pool& pool) {
    ListNode* head = tail;
    for (auto it = values.rbegin(); it != values.rend(); ++it) {
        pool.push_back(std::make_unique<ListNode>(*it));
        pool.back()->next = head;
        head = pool.back().get();
    }
    return head;
}

std::string fmt(ListNode* head) {
    std::string s = "[";
    for (ListNode* n = head; n != nullptr; n = n->next) s += (n == head ? "" : ", ") + std::to_string(n->val);
    return s + "]";
}

// Switch heads: each pointer walks its own list, then the other one.
ListNode* getIntersection(ListNode* headA, ListNode* headB) {
    ListNode* pa = headA;
    ListNode* pb = headB;
    while (pa != pb) {                     // address comparison: same node?
        pa = (pa != nullptr) ? pa->next : headB;
        pb = (pb != nullptr) ? pb->next : headA;
    }
    return pa;                             // the shared node, or nullptr when both ran out together
}

int indexOf(ListNode* head, ListNode* target) {
    int i = 0;
    for (ListNode* n = head; n != target; n = n->next) ++i;
    return i;
}

std::string describe(const std::vector<int>& aOnly, const std::vector<int>& bOnly, const std::vector<int>& shared) {
    Pool pool;
    ListNode* common = link(shared, nullptr, pool);
    ListNode* headA = link(aOnly, common, pool);
    ListNode* headB = link(bOnly, common, pool);
    ListNode* node = getIntersection(headA, headB);
    std::string label = "A = " + fmt(headA) + ", B = " + fmt(headB) + ": ";
    if (node == nullptr) return label + "no intersection";
    return label + "intersect at value " + std::to_string(node->val) + " (A index " +
           std::to_string(indexOf(headA, node)) + ", B index " + std::to_string(indexOf(headB, node)) + ")";
}

int main() {
    std::cout << describe({4, 1}, {5, 6, 1}, {8, 4, 5}) << "\\n";
    std::cout << describe({2, 6, 4}, {1, 5}, {}) << "\\n";
    std::cout << describe({}, {3}, {7, 9}) << "\\n";
    std::cout << describe({}, {}, {5, 6}) << "\\n";
    std::cout << describe({1, 2, 3}, {9}, {10}) << "\\n";
    std::cout << describe({}, {1}, {}) << "\\n";
    std::cout << describe({1, 2, 3}, {1, 2, 3}, {}) << "\\n";
}
` },
          { label: `Hash set, length difference and switch heads on every small shape`, code: `#include <iostream>
#include <memory>
#include <string>
#include <unordered_set>
#include <vector>

struct ListNode {
    int val;
    ListNode* next = nullptr;
    explicit ListNode(int v) : val(v) {}
};

// Every node is owned exactly once by a pool. The shared tail belongs to both
// lists, so freeing list A and then list B would delete it twice.
using Pool = std::vector<std::unique_ptr<ListNode>>;

ListNode* link(const std::vector<int>& values, ListNode* tail, Pool& pool) {
    ListNode* head = tail;
    for (auto it = values.rbegin(); it != values.rend(); ++it) {
        pool.push_back(std::make_unique<ListNode>(*it));
        pool.back()->next = head;
        head = pool.back().get();
    }
    return head;
}

std::string fmt(ListNode* head) {
    std::string s = "[";
    for (ListNode* n = head; n != nullptr; n = n->next) s += (n == head ? "" : ", ") + std::to_string(n->val);
    return s + "]";
}

// Switch heads: each pointer walks its own list, then the other one.
ListNode* getIntersection(ListNode* headA, ListNode* headB) {
    ListNode* pa = headA;
    ListNode* pb = headB;
    while (pa != pb) {                     // address comparison: same node?
        pa = (pa != nullptr) ? pa->next : headB;
        pb = (pb != nullptr) ? pb->next : headA;
    }
    return pa;                             // the shared node, or nullptr when both ran out together
}

int indexOf(ListNode* head, ListNode* target) {
    int i = 0;
    for (ListNode* n = head; n != target; n = n->next) ++i;
    return i;
}

ListNode* byHashSet(ListNode* headA, ListNode* headB) {
    std::unordered_set<ListNode*> seen;           // keyed by address
    for (ListNode* n = headA; n != nullptr; n = n->next) seen.insert(n);
    for (ListNode* n = headB; n != nullptr; n = n->next) if (seen.count(n)) return n;
    return nullptr;
}

int length(ListNode* head) {
    int n = 0;
    for (; head != nullptr; head = head->next) ++n;
    return n;
}

ListNode* byLengthDifference(ListNode* headA, ListNode* headB) {
    int la = length(headA), lb = length(headB);
    for (; la > lb; --la) headA = headA->next;
    for (; lb > la; --lb) headB = headB->next;
    while (headA != headB) {
        headA = headA->next;
        headB = headB->next;
    }
    return headA;
}

int iterations(ListNode* headA, ListNode* headB) {
    ListNode* pa = headA;
    ListNode* pb = headB;
    int steps = 0;
    while (pa != pb) {
        pa = (pa != nullptr) ? pa->next : headB;
        pb = (pb != nullptr) ? pb->next : headA;
        ++steps;
    }
    return steps;
}

std::vector<int> range(int n) {
    std::vector<int> r(n);
    for (int i = 0; i < n; ++i) r[i] = i;
    return r;
}

int main() {
    int agree = 0, total = 0;
    for (int a = 0; a < 5; ++a) {
        for (int b = 0; b < 5; ++b) {
            for (int c = 0; c < 5; ++c) {
                Pool pool;
                ListNode* common = link(range(c), nullptr, pool);   // nullptr when c == 0
                ListNode* headA = link(range(a), common, pool);
                ListNode* headB = link(range(b), common, pool);
                ++total;
                if (getIntersection(headA, headB) == common && byHashSet(headA, headB) == common &&
                    byLengthDifference(headA, headB) == common) ++agree;
            }
        }
    }
    std::cout << "all three methods agree on " << agree << " of " << total << " shapes\\n";

    int cases[][3] = {{2, 3, 3}, {2, 2, 3}, {3, 2, 0}, {0, 0, 4}, {5, 1, 1}};
    for (auto& k : cases) {
        Pool pool;
        ListNode* common = link(range(k[2]), nullptr, pool);
        ListNode* headA = link(range(k[0]), common, pool);
        ListNode* headB = link(range(k[1]), common, pool);
        std::cout << "a=" << k[0] << " b=" << k[1] << " shared=" << k[2] << ": switch-heads loop ran "
                  << iterations(headA, headB) << " iterations\\n";
    }
}
` },
        ],
      },
    },
  },
  {
    title: `How do you remove the nth node from the end of a linked list?`,
    difficulty: "medium",
    seoDescription: `Remove the nth node from the end of a linked list in Python, JavaScript, Java and C++: dummy node plus a fixed gap between two pointers, one pass.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given the head of a singly linked list, remove the nth node from the end and return the head. For 1, 2, 3, 4, 5 and n = 2 the answer is 1, 2, 3, 5. Can you do it in one pass? Please write it in Python."

**What a strong answer should cover:**
- The two-pass baseline: count the length, then unlink the node at index length - n.
- The one-pass version: a dummy node, \`fast\` moved n + 1 links ahead, then both pointers move until \`fast\` is None; \`slow\` is the predecessor of the target.
- Why the dummy node matters: removing the head (n = length) needs no special case.
- O(L) time and O(1) space for both, and an honest note that "one pass" does not mean fewer pointer moves.
- Python specifics: \`ListNode(0, head)\` as the dummy, \`for _ in range(n + 1)\`, and the unlinked node is reclaimed by the garbage collector once nothing refers to it.

**Clarifying questions expected:**
- "Is n 1-based and always between 1 and the length?"
- "Should I return the new head?"

**Code / implementation expected:** Yes — \`remove_nth_from_end(head, n)\` in Python, one pass.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are in a queue of people at a ticket office and you are told: "the second person from the back has to leave". Nobody in the queue knows how long it is, and you can only walk from the front. The obvious plan is to walk to the back counting heads, then walk again from the front to the right spot. That works, but it takes two trips.

A neater plan uses two friends and a rope. Tie a rope of a fixed length between them, so the front friend is always a fixed number of people ahead of the back friend. Walk them both down the queue together. When the front friend steps past the last person, the back friend is standing exactly where you need to be, right **before** the person who must leave, because the rope fixed the distance to the end.

In a singly linked list there is no "index from the end" and no way to walk backwards, so "nth from the end" is that queue. The question tests the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique) with a fixed gap, and one small but important trick: a **dummy node** in front of the head, so removing the very first node needs no special case.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is n 1-based (n = 1 is the last node)? | That is the usual convention; 0-based would shift every index by one. |
| Is n guaranteed to be between 1 and the length? | If not, decide what to return for n = 0 or n larger than the list (here: the list unchanged). |
| Can the list have a single node? | Removing its only node must return an empty list. |
| Should I return the new head? | Yes: the head itself may be the node removed. |
| Do I need to free the removed node? | In C++ yes (\`delete\`); in garbage-collected languages, unlinking is enough. |

## 3. The Core Idea

📌 **Interview term: nth node from the end** — with 1-based counting, n = 1 is the tail and n = length is the head. It is the node at 0-based index \`length - n\` from the front.

### Approach 1: two passes

Walk the list once to count its \`length\`. The node to remove is at index \`length - n\`; walk again to the node just before it (index \`length - n - 1\`) and unlink. O(L) time, O(1) space. Correct, but needs a special case when \`length - n\` is 0 (removing the head), unless you use a dummy node.

### Approach 2: one pass with a fixed gap

📌 **Interview term: Dummy (sentinel) node** — an extra node placed before the real head, so every real node, including the head, has a node before it. You return \`dummy.next\` at the end.

📌 **Interview term: Fixed-gap two pointers** — two pointers that start together, then one moves ahead by k links; after that both move one link at a time, so the distance between them never changes.

Start \`slow\` and \`fast\` at the dummy. Move \`fast\` ahead **n + 1** links. Then move both until \`fast\` is null. Because the gap is n + 1 links, \`slow\` stops on the node **before** the one to remove, which is exactly where you need to be to unlink it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Step 1: slow on the dummy node, fast moved n plus 1 equals 3 links ahead onto node 3">
  <defs>
    <marker id="ln1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="49" y="89" text-anchor="middle">dummy</text>
  <rect class="d-box" x="110" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="139" y="89" text-anchor="middle">1</text>
  <rect class="d-box" x="200" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="229" y="89" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="290" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="319" y="89" text-anchor="middle">3</text>
  <rect class="d-box" x="380" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="409" y="89" text-anchor="middle">4</text>
  <rect class="d-box" x="470" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="499" y="89" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="560" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="589" y="89" text-anchor="middle">null</text>
  <path class="d-edge" d="M 80 83 L 104 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 170 83 L 194 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 260 83 L 284 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 350 83 L 374 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 440 83 L 464 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 530 83 L 554 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <text class="d-text d-accent" x="49" y="44" text-anchor="middle">slow</text>
  <text class="d-text d-accent" x="319" y="44" text-anchor="middle">fast</text>
  <path class="d-edge-dashed" d="M 49 124 L 319 124" fill="none" marker-end="url(#ln1-arrow)"/>
  <text class="d-sub" x="184" y="160" text-anchor="middle">gap: n + 1 links</text>
</svg>

For the list 1, 2, 3, 4, 5 and n = 2 (remove the 4), \`fast\` first moves 3 links from the dummy to node 3.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="Step 2: both pointers moved until fast is null, slow is on node 3 just before the target node 4, which is unlinked">
  <defs>
    <marker id="ln2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="49" y="89" text-anchor="middle">dummy</text>
  <rect class="d-box" x="110" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="139" y="89" text-anchor="middle">1</text>
  <rect class="d-box" x="200" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="229" y="89" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="290" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="319" y="89" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="380" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="409" y="89" text-anchor="middle">4</text>
  <rect class="d-box" x="470" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="499" y="89" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="560" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="589" y="89" text-anchor="middle">null</text>
  <path class="d-edge" d="M 80 83 L 104 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 170 83 L 194 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 260 83 L 284 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 350 83 L 374 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 440 83 L 464 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 530 83 L 554 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <text class="d-text d-accent" x="319" y="44" text-anchor="middle">slow</text>
  <text class="d-text d-accent" x="589" y="44" text-anchor="middle">fast</text>
  <text class="d-sub" x="409" y="44" text-anchor="middle">target</text>
  <path class="d-edge-accent" d="M 319 110 C 330 180, 490 180, 499 112" fill="none" marker-end="url(#ln2-arrow)"/>
  <text class="d-sub" x="409" y="208" text-anchor="middle">slow.next = slow.next.next</text>
</svg>

Then both move together. When \`fast\` reaches null, \`slow\` is on node 3, and \`slow.next = slow.next.next\` skips node 4. The result is 1, 2, 3, 5.

Why n + 1 and not n? With a gap of n, \`slow\` would stop **on** the target, and in a singly linked list you cannot unlink a node from itself: you need its predecessor. The dummy node is what makes "the predecessor of the head" exist.

📌 **Interview term: Unlinking** — removing a node by making its predecessor point past it (\`prev.next = prev.next.next\`). The node itself is not changed; it simply becomes unreachable.

## 4. The Solution in Python

~~~python
def remove_nth_from_end(head, n):
    """One pass: a dummy node and a gap of n + 1 links between slow and fast."""
    if n < 1:
        return head
    dummy = ListNode(0, head)
    slow = fast = dummy
    for _ in range(n + 1):
        if fast is None:              # n is larger than the list: leave it unchanged
            return head
        fast = fast.next
    while fast:
        slow = slow.next
        fast = fast.next
    slow.next = slow.next.next        # slow is the node just before the target
    return dummy.next
~~~

**Why each line is there:**

- \`dummy = ListNode(0, head)\` gives the head a predecessor. Returning \`dummy.next\` (not \`head\`) is essential: if the head was removed, \`head\` still points at the removed node.
- \`slow = fast = dummy\` makes both names refer to the same node object. That is safe because we **rebind** the names afterwards, we never mutate through one of them expecting the other to stay put.
- \`for _ in range(n + 1)\` opens the gap; \`_\` is the conventional name for a loop variable you do not use. The \`fast is None\` check turns an out-of-range n into "no change" instead of an \`AttributeError\`.
- After \`while fast\`, the gap guarantees \`slow.next\` is the target, so \`slow.next.next\` is safe.
- The removed node needs no cleanup: CPython frees an object when its reference count drops to zero, and nothing refers to it any more once it is unlinked (unless the caller kept a reference).

### The two-pass version

~~~python
def remove_two_pass(head, n):
    length, node = 0, head
    while node:
        length += 1
        node = node.next
    dummy = ListNode(0, head)
    prev = dummy
    for _ in range(length - n):
        prev = prev.next
    prev.next = prev.next.next
    return dummy.next
~~~

Example 2 runs both versions with a move counter (the counter lines are left out above).

## 5. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — One-pass removal with a dummy node, including the edge cases** prints:

~~~text
n=2: [1, 2, 3, 4, 5] -> [1, 2, 3, 5]
n=1: [1] -> []
n=1: [1, 2] -> [1]
n=2: [1, 2] -> [2]
n=5: [1, 2, 3, 4, 5] -> [2, 3, 4, 5]
n=1: [1, 2, 3, 4, 5] -> [1, 2, 3, 4]
n=4: [1, 2, 3] -> [1, 2, 3]
n=0: [1, 2, 3] -> [1, 2, 3]
~~~

**Example 2 — One pass versus two passes: same results, and the pointer moves counted** prints:

~~~text
compared 36 (length, n) pairs, mismatches: 0
L=5 n=2: two-pass moves 8, one-pass moves 9
L=10 n=1: two-pass moves 19, one-pass moves 20
L=10 n=10: two-pass moves 10, one-pass moves 11
L=100 n=50: two-pass moves 150, one-pass moves 151
~~~

**Reading the output:** Example 1 covers the tricky cases: removing the only node gives \`[]\`, n = 5 on a five-node list removes the head (no special case needed thanks to the dummy), and n = 4 on a three-node list or n = 0 leave the list unchanged because of the guards. Example 2 compares the one-pass and two-pass versions on all 36 (length, n) pairs for lengths 1 to 8 and finds no difference. The move counts make an honest point: the "one-pass" version makes slightly *more* pointer moves (2L - n + 1) than the two-pass version (2L - n). One pass means the list is walked once by a pair of pointers, not that less work is done; its real advantage shows when the list is a stream you cannot walk twice.

## 6. Complexity

| Approach | Time | Extra space | Pointer moves (length L) |
| :--- | :--- | :--- | :--- |
| Copy nodes into an array, index L - n - 1 | O(L) | O(L) | L, plus the array |
| Two passes: count, then walk | O(L) | O(1) | L + (L - n) = 2L - n |
| One pass, fixed gap of n + 1 | O(L) | O(1) | (L + 1) + (L - n) = 2L - n + 1 |

The move counts are from Example 2's counters. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Single node, n = 1:** the result is empty; \`slow\` stays on the dummy and \`dummy.next\` becomes null.
- **n equals the length:** the head is removed; with the dummy node this is the ordinary path.
- **n = 1:** the tail is removed; \`slow\` stops on the second-to-last node.
- **n larger than the length, or n below 1:** outside the classic constraints; the guards return the list unchanged. Ask the interviewer which behaviour they want.
- **Empty list:** with the guard, returns null (n is always larger than a length of 0).

## Common Pitfalls

- **Returning \`head\` instead of \`dummy.next\`.** When n equals the length, the head itself is removed and \`head\` still points at it; the output would still show the removed node.
- **A gap of n instead of n + 1.** \`slow\` then lands **on** the target, and you cannot unlink a node without its predecessor.
- **No dummy node.** Then removing the head needs its own branch (\`if fast is None: return head.next\` after the first loop), which is easy to get wrong.
- **Trusting n blindly.** \`range(n + 1)\` with n larger than the list raises \`AttributeError: 'NoneType' object has no attribute 'next'\`; guard it or state the constraint.
- **Mutable default arguments in helpers.** A builder like \`def build(values, out=[])\` keeps the same list between calls; use \`None\` and create a new list inside.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;">Count the length, then walk to index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length - n - 1</code> and unlink. Two passes, O(L) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Dummy node:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dummy = ListNode(0, head)</code> so the head has a predecessor; always return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dummy.next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Fixed gap:</strong> <span style="color:#f0e2c8;">Move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> n + 1 links from the dummy, then move both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while fast</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> stops just before the target.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Unlink:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow.next = slow.next.next</code>. O(L) time, O(1) space, one pass.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">The removed node is reclaimed automatically once unreferenced; guard <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast is None</code> if n can exceed the length.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why n + 1 and not n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With a gap of n, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> stops on the target; to unlink it you need its predecessor, which is one link earlier.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the one-pass version faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not really: it makes 2L - n + 1 pointer moves against 2L - n for two passes. Its advantage is walking the list only once, which matters for streams or very long lists that are expensive to traverse.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if n can be larger than the length?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast is None</code> while opening the gap and return the list unchanged (or raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValueError</code>, if the interviewer prefers).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you remove the kth node from the front?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Walk k - 1 links from the dummy and unlink; no gap needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you do it recursively?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: recurse to the end and count on the way back, unlinking when the count reaches n. It uses O(L) stack and hits Python's default recursion limit of 1000 on long lists.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **nth node from the end** | 1-based: n = 1 is the tail, n = length is the head |
| **Dummy (sentinel) node** | an extra node before the head so the head has a predecessor |
| **Fixed-gap two pointers** | two pointers kept a constant number of links apart |
| **Unlinking** | \`prev.next = prev.next.next\`: skip a node so it becomes unreachable |
| **Rebinding** | making a Python name refer to a different object; it never changes the old object |

---
**Conclusion:** Removing the nth node from the end is the fixed-gap two-pointer pattern: put a dummy node before the head, move one pointer n + 1 links ahead, then move both until the leader falls off the end; the follower is on the predecessor of the target. It is O(L) time and O(1) space, and the dummy node removes the special case for deleting the head. In Python, write the dummy node, the \`range(n + 1)\` gap and \`return dummy.next\`, and mention the guard for an out-of-range n.`,
        examples: [
          { label: `One-pass removal with a dummy node, including the edge cases`, code: `class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next


def build(values):
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head


def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out


def fmt(values):
    return "[" + ", ".join(str(v) for v in values) + "]"


def remove_nth_from_end(head, n):
    """One pass: a dummy node and a gap of n + 1 links between slow and fast."""
    if n < 1:
        return head
    dummy = ListNode(0, head)
    slow = fast = dummy
    for _ in range(n + 1):
        if fast is None:              # n is larger than the list: leave it unchanged
            return head
        fast = fast.next
    while fast:
        slow = slow.next
        fast = fast.next
    slow.next = slow.next.next        # slow is the node just before the target
    return dummy.next


def show(values, n):
    return "n=" + str(n) + ": " + fmt(values) + " -> " + fmt(to_list(remove_nth_from_end(build(values), n)))


print(show([1, 2, 3, 4, 5], 2))  # n=2: [1, 2, 3, 4, 5] -> [1, 2, 3, 5]
print(show([1], 1))  # n=1: [1] -> []
print(show([1, 2], 1))  # n=1: [1, 2] -> [1]
print(show([1, 2], 2))  # n=2: [1, 2] -> [2]
print(show([1, 2, 3, 4, 5], 5))  # n=5: [1, 2, 3, 4, 5] -> [2, 3, 4, 5]
print(show([1, 2, 3, 4, 5], 1))  # n=1: [1, 2, 3, 4, 5] -> [1, 2, 3, 4]
print(show([1, 2, 3], 4))  # n=4: [1, 2, 3] -> [1, 2, 3]
print(show([1, 2, 3], 0))  # n=0: [1, 2, 3] -> [1, 2, 3]
` },
          { label: `One pass versus two passes: same results, and the pointer moves counted`, code: `class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next


def build(values):
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head


def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out


def fmt(values):
    return "[" + ", ".join(str(v) for v in values) + "]"


def remove_nth_from_end(head, n):
    """One pass: a dummy node and a gap of n + 1 links between slow and fast."""
    if n < 1:
        return head
    dummy = ListNode(0, head)
    slow = fast = dummy
    for _ in range(n + 1):
        if fast is None:              # n is larger than the list: leave it unchanged
            return head
        fast = fast.next
    while fast:
        slow = slow.next
        fast = fast.next
    slow.next = slow.next.next        # slow is the node just before the target
    return dummy.next


moves = 0


def remove_two_pass(head, n):
    """Two passes: count the length, then walk to the predecessor of the target."""
    global moves
    length, node = 0, head
    while node:
        length += 1
        node = node.next
        moves += 1
    dummy = ListNode(0, head)
    prev = dummy
    for _ in range(length - n):
        prev = prev.next
        moves += 1
    prev.next = prev.next.next
    return dummy.next


def remove_one_pass_counted(head, n):
    global moves
    dummy = ListNode(0, head)
    slow = fast = dummy
    for _ in range(n + 1):
        fast = fast.next
        moves += 1
    while fast:
        slow, fast = slow.next, fast.next
        moves += 2
    slow.next = slow.next.next
    return dummy.next


pairs = mismatches = 0
for length in range(1, 9):
    for n in range(1, length + 1):
        values = list(range(1, length + 1))
        a = to_list(remove_nth_from_end(build(values), n))
        b = to_list(remove_two_pass(build(values), n))
        pairs += 1
        if a != b:
            mismatches += 1
print("compared " + str(pairs) + " (length, n) pairs, mismatches: " + str(mismatches))

for length, n in [(5, 2), (10, 1), (10, 10), (100, 50)]:
    values = list(range(1, length + 1))
    moves = 0
    remove_two_pass(build(values), n)
    two = moves
    moves = 0
    remove_one_pass_counted(build(values), n)
    print("L=" + str(length) + " n=" + str(n) + ": two-pass moves " + str(two) + ", one-pass moves " + str(moves))
` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given the head of a singly linked list, remove the nth node from the end and return the head. For 1, 2, 3, 4, 5 and n = 2 the answer is 1, 2, 3, 5. Can you do it in one pass? Please write it in JavaScript."

**What a strong answer should cover:**
- The two-pass baseline: count the length, then unlink the node at index length - n.
- The one-pass version: a dummy node, \`fast\` moved n + 1 links ahead, then both move until \`fast\` is null; \`slow\` is the predecessor of the target.
- Why the dummy node matters: removing the head needs no special case.
- O(L) time and O(1) space, and an honest note that "one pass" does not mean fewer pointer moves.
- JavaScript specifics: \`let\` (not \`const\`) for pointers you reassign, strict \`!== null\` checks, and garbage collection reclaiming the unlinked node.

**Clarifying questions expected:**
- "Is n 1-based and always between 1 and the length?"
- "Should I return the new head?"

**Code / implementation expected:** Yes — \`removeNthFromEnd(head, n)\` in JavaScript, one pass.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are in a queue of people at a ticket office and you are told: "the second person from the back has to leave". Nobody in the queue knows how long it is, and you can only walk from the front. The obvious plan is to walk to the back counting heads, then walk again from the front to the right spot. That works, but it takes two trips.

A neater plan uses two friends and a rope. Tie a rope of a fixed length between them, so the front friend is always a fixed number of people ahead of the back friend. Walk them both down the queue together. When the front friend steps past the last person, the back friend is standing exactly where you need to be, right **before** the person who must leave, because the rope fixed the distance to the end.

In a singly linked list there is no "index from the end" and no way to walk backwards, so "nth from the end" is that queue. The question tests the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique) with a fixed gap, and one small but important trick: a **dummy node** in front of the head, so removing the very first node needs no special case.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is n 1-based (n = 1 is the last node)? | That is the usual convention; 0-based would shift every index by one. |
| Is n guaranteed to be between 1 and the length? | If not, decide what to return for n = 0 or n larger than the list (here: the list unchanged). |
| Can the list have a single node? | Removing its only node must return an empty list. |
| Should I return the new head? | Yes: the head itself may be the node removed. |
| Do I need to free the removed node? | In C++ yes (\`delete\`); in garbage-collected languages, unlinking is enough. |

## 3. The Core Idea

📌 **Interview term: nth node from the end** — with 1-based counting, n = 1 is the tail and n = length is the head. It is the node at 0-based index \`length - n\` from the front.

### Approach 1: two passes

Walk the list once to count its \`length\`. The node to remove is at index \`length - n\`; walk again to the node just before it (index \`length - n - 1\`) and unlink. O(L) time, O(1) space. Correct, but needs a special case when \`length - n\` is 0 (removing the head), unless you use a dummy node.

### Approach 2: one pass with a fixed gap

📌 **Interview term: Dummy (sentinel) node** — an extra node placed before the real head, so every real node, including the head, has a node before it. You return \`dummy.next\` at the end.

📌 **Interview term: Fixed-gap two pointers** — two pointers that start together, then one moves ahead by k links; after that both move one link at a time, so the distance between them never changes.

Start \`slow\` and \`fast\` at the dummy. Move \`fast\` ahead **n + 1** links. Then move both until \`fast\` is null. Because the gap is n + 1 links, \`slow\` stops on the node **before** the one to remove, which is exactly where you need to be to unlink it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Step 1: slow on the dummy node, fast moved n plus 1 equals 3 links ahead onto node 3">
  <defs>
    <marker id="ln1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="49" y="89" text-anchor="middle">dummy</text>
  <rect class="d-box" x="110" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="139" y="89" text-anchor="middle">1</text>
  <rect class="d-box" x="200" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="229" y="89" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="290" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="319" y="89" text-anchor="middle">3</text>
  <rect class="d-box" x="380" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="409" y="89" text-anchor="middle">4</text>
  <rect class="d-box" x="470" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="499" y="89" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="560" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="589" y="89" text-anchor="middle">null</text>
  <path class="d-edge" d="M 80 83 L 104 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 170 83 L 194 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 260 83 L 284 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 350 83 L 374 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 440 83 L 464 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 530 83 L 554 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <text class="d-text d-accent" x="49" y="44" text-anchor="middle">slow</text>
  <text class="d-text d-accent" x="319" y="44" text-anchor="middle">fast</text>
  <path class="d-edge-dashed" d="M 49 124 L 319 124" fill="none" marker-end="url(#ln1-arrow)"/>
  <text class="d-sub" x="184" y="160" text-anchor="middle">gap: n + 1 links</text>
</svg>

For the list 1, 2, 3, 4, 5 and n = 2 (remove the 4), \`fast\` first moves 3 links from the dummy to node 3.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="Step 2: both pointers moved until fast is null, slow is on node 3 just before the target node 4, which is unlinked">
  <defs>
    <marker id="ln2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="49" y="89" text-anchor="middle">dummy</text>
  <rect class="d-box" x="110" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="139" y="89" text-anchor="middle">1</text>
  <rect class="d-box" x="200" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="229" y="89" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="290" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="319" y="89" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="380" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="409" y="89" text-anchor="middle">4</text>
  <rect class="d-box" x="470" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="499" y="89" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="560" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="589" y="89" text-anchor="middle">null</text>
  <path class="d-edge" d="M 80 83 L 104 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 170 83 L 194 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 260 83 L 284 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 350 83 L 374 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 440 83 L 464 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 530 83 L 554 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <text class="d-text d-accent" x="319" y="44" text-anchor="middle">slow</text>
  <text class="d-text d-accent" x="589" y="44" text-anchor="middle">fast</text>
  <text class="d-sub" x="409" y="44" text-anchor="middle">target</text>
  <path class="d-edge-accent" d="M 319 110 C 330 180, 490 180, 499 112" fill="none" marker-end="url(#ln2-arrow)"/>
  <text class="d-sub" x="409" y="208" text-anchor="middle">slow.next = slow.next.next</text>
</svg>

Then both move together. When \`fast\` reaches null, \`slow\` is on node 3, and \`slow.next = slow.next.next\` skips node 4. The result is 1, 2, 3, 5.

Why n + 1 and not n? With a gap of n, \`slow\` would stop **on** the target, and in a singly linked list you cannot unlink a node from itself: you need its predecessor. The dummy node is what makes "the predecessor of the head" exist.

📌 **Interview term: Unlinking** — removing a node by making its predecessor point past it (\`prev.next = prev.next.next\`). The node itself is not changed; it simply becomes unreachable.

## 4. The Solution in JavaScript

~~~javascript
function removeNthFromEnd(head, n) {
  if (n < 1) return head;
  const dummy = new ListNode(0, head);
  let slow = dummy;
  let fast = dummy;
  for (let i = 0; i <= n; i++) {
    if (fast === null) return head;   // n is larger than the list: leave it unchanged
    fast = fast.next;
  }
  while (fast !== null) {
    slow = slow.next;
    fast = fast.next;
  }
  slow.next = slow.next.next;         // slow is the node just before the target
  return dummy.next;
}
~~~

**Why each line is there:**

- \`const dummy\` is fine: the binding never changes, only \`dummy.next\` does (\`const\` stops reassignment, not mutation). \`slow\` and \`fast\` are reassigned, so they are \`let\`.
- \`for (let i = 0; i <= n; i++)\` runs n + 1 times; \`<=\` is deliberate. The \`fast === null\` check prevents \`TypeError: Cannot read properties of null\` when n exceeds the length.
- After the loop, \`slow.next\` is the target, so \`slow.next.next\` is safe.
- \`return dummy.next\`, never \`head\`: the head may be the node that was removed.
- The unlinked node is garbage once nothing references it; the engine reclaims it.

### The two-pass version

~~~javascript
function removeTwoPass(head, n) {
  let length = 0;
  for (let node = head; node !== null; node = node.next) length++;
  const dummy = new ListNode(0, head);
  let prev = dummy;
  for (let i = 0; i < length - n; i++) prev = prev.next;
  prev.next = prev.next.next;
  return dummy.next;
}
~~~

Example 2 runs both with a move counter (the counter lines are left out above).

## 5. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — One-pass removal with a dummy node, including the edge cases** prints:

~~~text
n=2: [1, 2, 3, 4, 5] -> [1, 2, 3, 5]
n=1: [1] -> []
n=1: [1, 2] -> [1]
n=2: [1, 2] -> [2]
n=5: [1, 2, 3, 4, 5] -> [2, 3, 4, 5]
n=1: [1, 2, 3, 4, 5] -> [1, 2, 3, 4]
n=4: [1, 2, 3] -> [1, 2, 3]
n=0: [1, 2, 3] -> [1, 2, 3]
~~~

**Example 2 — One pass versus two passes: same results, and the pointer moves counted** prints:

~~~text
compared 36 (length, n) pairs, mismatches: 0
L=5 n=2: two-pass moves 8, one-pass moves 9
L=10 n=1: two-pass moves 19, one-pass moves 20
L=10 n=10: two-pass moves 10, one-pass moves 11
L=100 n=50: two-pass moves 150, one-pass moves 151
~~~

**Reading the output:** Example 1 covers the tricky cases: removing the only node gives \`[]\`, n = 5 on a five-node list removes the head (no special case needed thanks to the dummy), and n = 4 on a three-node list or n = 0 leave the list unchanged because of the guards. Example 2 compares the one-pass and two-pass versions on all 36 (length, n) pairs for lengths 1 to 8 and finds no difference. The move counts make an honest point: the "one-pass" version makes slightly *more* pointer moves (2L - n + 1) than the two-pass version (2L - n). One pass means the list is walked once by a pair of pointers, not that less work is done; its real advantage shows when the list is a stream you cannot walk twice.

## 6. Complexity

| Approach | Time | Extra space | Pointer moves (length L) |
| :--- | :--- | :--- | :--- |
| Copy nodes into an array, index L - n - 1 | O(L) | O(L) | L, plus the array |
| Two passes: count, then walk | O(L) | O(1) | L + (L - n) = 2L - n |
| One pass, fixed gap of n + 1 | O(L) | O(1) | (L + 1) + (L - n) = 2L - n + 1 |

The move counts are from Example 2's counters. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Single node, n = 1:** the result is empty; \`slow\` stays on the dummy and \`dummy.next\` becomes null.
- **n equals the length:** the head is removed; with the dummy node this is the ordinary path.
- **n = 1:** the tail is removed; \`slow\` stops on the second-to-last node.
- **n larger than the length, or n below 1:** outside the classic constraints; the guards return the list unchanged. Ask the interviewer which behaviour they want.
- **Empty list:** with the guard, returns null (n is always larger than a length of 0).

## Common Pitfalls

- **Returning \`head\` instead of \`dummy.next\`.** Wrong whenever the head is removed.
- **\`i < n\` instead of \`i <= n\`.** A gap of n puts \`slow\` on the target instead of before it.
- **Declaring \`slow\`/\`fast\` with \`const\`.** Reassigning them throws \`TypeError: Assignment to constant variable.\`
- **No guard on n.** n larger than the list makes \`fast.next\` throw on \`null\`.
- **Missing \`next = null\` default.** If a node's \`next\` is \`undefined\`, \`fast !== null\` stays true at the end and \`fast.next\` throws; give the constructor \`next = null\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;">Count the length, walk to index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length - n - 1</code>, unlink. Two passes, O(L) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Dummy node:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const dummy = new ListNode(0, head)</code> so the head has a predecessor; return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dummy.next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Fixed gap:</strong> <span style="color:#f0e2c8;">Move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> n + 1 links (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &lt;= n</code>), then both while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast !== null</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> ends just before the target.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Unlink:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow.next = slow.next.next</code>. O(L) time, O(1) space, one pass.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let</code> for the moving pointers, strict null checks, and the GC reclaims the unlinked node.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why n + 1 and not n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A gap of n stops <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> on the target; you need its predecessor to unlink it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is one pass faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in pointer moves: 2L - n + 1 versus 2L - n (Example 2). It walks the list once, which is the point when traversal is expensive.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if n is out of range?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Guard while opening the gap and return the list unchanged, or throw a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code> if the interviewer prefers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you store nodes in an array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: push every node, then unlink <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr[len - n - 1]</code> (or return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head.next</code> when removing the head). O(L) extra space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Recursive version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recurse to the end, count on the way back, unlink at count n. O(L) stack; very long lists throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError: Maximum call stack size exceeded</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **nth node from the end** | 1-based: n = 1 is the tail, n = length is the head |
| **Dummy (sentinel) node** | an extra node before the head so the head has a predecessor |
| **Fixed-gap two pointers** | two pointers kept a constant number of links apart |
| **Unlinking** | \`prev.next = prev.next.next\`: skip a node so it becomes unreachable |
| **\`const\` binding** | cannot be reassigned, but the object it holds can still be changed |

---
**Conclusion:** Removing the nth node from the end is the fixed-gap two-pointer pattern: put a dummy node before the head, move one pointer n + 1 links ahead, then move both until the leader falls off the end; the follower is on the predecessor of the target. It is O(L) time and O(1) space, and the dummy node removes the special case for deleting the head. In JavaScript, write the dummy node, the \`i <= n\` gap loop and \`return dummy.next\`, with strict null checks around every \`.next\`.`,
        examples: [
          { label: `One-pass removal with a dummy node, including the edge cases`, code: `class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

function build(values) {
  let head = null;
  for (let i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
  return head;
}

function toArray(head) {
  const out = [];
  for (let node = head; node !== null; node = node.next) out.push(node.val);
  return out;
}

function fmt(values) {
  return '[' + values.join(', ') + ']';
}

// One pass: a dummy node and a gap of n + 1 links between slow and fast.
function removeNthFromEnd(head, n) {
  if (n < 1) return head;
  const dummy = new ListNode(0, head);
  let slow = dummy;
  let fast = dummy;
  for (let i = 0; i <= n; i++) {
    if (fast === null) return head;   // n is larger than the list: leave it unchanged
    fast = fast.next;
  }
  while (fast !== null) {
    slow = slow.next;
    fast = fast.next;
  }
  slow.next = slow.next.next;         // slow is the node just before the target
  return dummy.next;
}

function show(values, n) {
  return 'n=' + n + ': ' + fmt(values) + ' -> ' + fmt(toArray(removeNthFromEnd(build(values), n)));
}

console.log(show([1, 2, 3, 4, 5], 2)); // n=2: [1, 2, 3, 4, 5] -> [1, 2, 3, 5]
console.log(show([1], 1)); // n=1: [1] -> []
console.log(show([1, 2], 1)); // n=1: [1, 2] -> [1]
console.log(show([1, 2], 2)); // n=2: [1, 2] -> [2]
console.log(show([1, 2, 3, 4, 5], 5)); // n=5: [1, 2, 3, 4, 5] -> [2, 3, 4, 5]
console.log(show([1, 2, 3, 4, 5], 1)); // n=1: [1, 2, 3, 4, 5] -> [1, 2, 3, 4]
console.log(show([1, 2, 3], 4)); // n=4: [1, 2, 3] -> [1, 2, 3]
console.log(show([1, 2, 3], 0)); // n=0: [1, 2, 3] -> [1, 2, 3]
` },
          { label: `One pass versus two passes: same results, and the pointer moves counted`, code: `class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

function build(values) {
  let head = null;
  for (let i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
  return head;
}

function toArray(head) {
  const out = [];
  for (let node = head; node !== null; node = node.next) out.push(node.val);
  return out;
}

function fmt(values) {
  return '[' + values.join(', ') + ']';
}

// One pass: a dummy node and a gap of n + 1 links between slow and fast.
function removeNthFromEnd(head, n) {
  if (n < 1) return head;
  const dummy = new ListNode(0, head);
  let slow = dummy;
  let fast = dummy;
  for (let i = 0; i <= n; i++) {
    if (fast === null) return head;   // n is larger than the list: leave it unchanged
    fast = fast.next;
  }
  while (fast !== null) {
    slow = slow.next;
    fast = fast.next;
  }
  slow.next = slow.next.next;         // slow is the node just before the target
  return dummy.next;
}

let moves = 0;

// Two passes: count the length, then walk to the predecessor of the target.
function removeTwoPass(head, n) {
  let length = 0;
  for (let node = head; node !== null; node = node.next) {
    length++;
    moves++;
  }
  const dummy = new ListNode(0, head);
  let prev = dummy;
  for (let i = 0; i < length - n; i++) {
    prev = prev.next;
    moves++;
  }
  prev.next = prev.next.next;
  return dummy.next;
}

function removeOnePassCounted(head, n) {
  const dummy = new ListNode(0, head);
  let slow = dummy;
  let fast = dummy;
  for (let i = 0; i <= n; i++) {
    fast = fast.next;
    moves++;
  }
  while (fast !== null) {
    slow = slow.next;
    fast = fast.next;
    moves += 2;
  }
  slow.next = slow.next.next;
  return dummy.next;
}

function range1(n) {
  return Array.from({ length: n }, (_, i) => i + 1);
}

let pairs = 0;
let mismatches = 0;
for (let length = 1; length <= 8; length++) {
  for (let n = 1; n <= length; n++) {
    const a = fmt(toArray(removeNthFromEnd(build(range1(length)), n)));
    const b = fmt(toArray(removeTwoPass(build(range1(length)), n)));
    pairs++;
    if (a !== b) mismatches++;
  }
}
console.log('compared ' + pairs + ' (length, n) pairs, mismatches: ' + mismatches);

for (const [length, n] of [[5, 2], [10, 1], [10, 10], [100, 50]]) {
  moves = 0;
  removeTwoPass(build(range1(length)), n);
  const two = moves;
  moves = 0;
  removeOnePassCounted(build(range1(length)), n);
  console.log('L=' + length + ' n=' + n + ': two-pass moves ' + two + ', one-pass moves ' + moves);
}
` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given the head of a singly linked list, remove the nth node from the end and return the head. For 1, 2, 3, 4, 5 and n = 2 the answer is 1, 2, 3, 5. Can you do it in one pass? Please write it in Java."

**What a strong answer should cover:**
- The two-pass baseline: count the length, then unlink the node at index length - n.
- The one-pass version: a dummy node, \`fast\` moved n + 1 links ahead, then both move until \`fast\` is null; \`slow\` is the predecessor of the target.
- Why the dummy node matters: removing the head needs no special case.
- O(L) time and O(1) space, and an honest note that "one pass" does not mean fewer pointer moves.
- Java specifics: \`NullPointerException\` if n exceeds the length without a guard; the unlinked node is reclaimed by the garbage collector; \`java.util.LinkedList\` already has \`remove(int)\` but the question is about your own node class.

**Clarifying questions expected:**
- "Is n 1-based and always between 1 and the length?"
- "Should I return the new head?"

**Code / implementation expected:** Yes — \`ListNode removeNthFromEnd(ListNode head, int n)\` in Java, one pass.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are in a queue of people at a ticket office and you are told: "the second person from the back has to leave". Nobody in the queue knows how long it is, and you can only walk from the front. The obvious plan is to walk to the back counting heads, then walk again from the front to the right spot. That works, but it takes two trips.

A neater plan uses two friends and a rope. Tie a rope of a fixed length between them, so the front friend is always a fixed number of people ahead of the back friend. Walk them both down the queue together. When the front friend steps past the last person, the back friend is standing exactly where you need to be, right **before** the person who must leave, because the rope fixed the distance to the end.

In a singly linked list there is no "index from the end" and no way to walk backwards, so "nth from the end" is that queue. The question tests the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique) with a fixed gap, and one small but important trick: a **dummy node** in front of the head, so removing the very first node needs no special case.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is n 1-based (n = 1 is the last node)? | That is the usual convention; 0-based would shift every index by one. |
| Is n guaranteed to be between 1 and the length? | If not, decide what to return for n = 0 or n larger than the list (here: the list unchanged). |
| Can the list have a single node? | Removing its only node must return an empty list. |
| Should I return the new head? | Yes: the head itself may be the node removed. |
| Do I need to free the removed node? | In C++ yes (\`delete\`); in garbage-collected languages, unlinking is enough. |

## 3. The Core Idea

📌 **Interview term: nth node from the end** — with 1-based counting, n = 1 is the tail and n = length is the head. It is the node at 0-based index \`length - n\` from the front.

### Approach 1: two passes

Walk the list once to count its \`length\`. The node to remove is at index \`length - n\`; walk again to the node just before it (index \`length - n - 1\`) and unlink. O(L) time, O(1) space. Correct, but needs a special case when \`length - n\` is 0 (removing the head), unless you use a dummy node.

### Approach 2: one pass with a fixed gap

📌 **Interview term: Dummy (sentinel) node** — an extra node placed before the real head, so every real node, including the head, has a node before it. You return \`dummy.next\` at the end.

📌 **Interview term: Fixed-gap two pointers** — two pointers that start together, then one moves ahead by k links; after that both move one link at a time, so the distance between them never changes.

Start \`slow\` and \`fast\` at the dummy. Move \`fast\` ahead **n + 1** links. Then move both until \`fast\` is null. Because the gap is n + 1 links, \`slow\` stops on the node **before** the one to remove, which is exactly where you need to be to unlink it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Step 1: slow on the dummy node, fast moved n plus 1 equals 3 links ahead onto node 3">
  <defs>
    <marker id="ln1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="49" y="89" text-anchor="middle">dummy</text>
  <rect class="d-box" x="110" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="139" y="89" text-anchor="middle">1</text>
  <rect class="d-box" x="200" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="229" y="89" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="290" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="319" y="89" text-anchor="middle">3</text>
  <rect class="d-box" x="380" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="409" y="89" text-anchor="middle">4</text>
  <rect class="d-box" x="470" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="499" y="89" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="560" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="589" y="89" text-anchor="middle">null</text>
  <path class="d-edge" d="M 80 83 L 104 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 170 83 L 194 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 260 83 L 284 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 350 83 L 374 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 440 83 L 464 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 530 83 L 554 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <text class="d-text d-accent" x="49" y="44" text-anchor="middle">slow</text>
  <text class="d-text d-accent" x="319" y="44" text-anchor="middle">fast</text>
  <path class="d-edge-dashed" d="M 49 124 L 319 124" fill="none" marker-end="url(#ln1-arrow)"/>
  <text class="d-sub" x="184" y="160" text-anchor="middle">gap: n + 1 links</text>
</svg>

For the list 1, 2, 3, 4, 5 and n = 2 (remove the 4), \`fast\` first moves 3 links from the dummy to node 3.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="Step 2: both pointers moved until fast is null, slow is on node 3 just before the target node 4, which is unlinked">
  <defs>
    <marker id="ln2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="49" y="89" text-anchor="middle">dummy</text>
  <rect class="d-box" x="110" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="139" y="89" text-anchor="middle">1</text>
  <rect class="d-box" x="200" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="229" y="89" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="290" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="319" y="89" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="380" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="409" y="89" text-anchor="middle">4</text>
  <rect class="d-box" x="470" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="499" y="89" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="560" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="589" y="89" text-anchor="middle">null</text>
  <path class="d-edge" d="M 80 83 L 104 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 170 83 L 194 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 260 83 L 284 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 350 83 L 374 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 440 83 L 464 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 530 83 L 554 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <text class="d-text d-accent" x="319" y="44" text-anchor="middle">slow</text>
  <text class="d-text d-accent" x="589" y="44" text-anchor="middle">fast</text>
  <text class="d-sub" x="409" y="44" text-anchor="middle">target</text>
  <path class="d-edge-accent" d="M 319 110 C 330 180, 490 180, 499 112" fill="none" marker-end="url(#ln2-arrow)"/>
  <text class="d-sub" x="409" y="208" text-anchor="middle">slow.next = slow.next.next</text>
</svg>

Then both move together. When \`fast\` reaches null, \`slow\` is on node 3, and \`slow.next = slow.next.next\` skips node 4. The result is 1, 2, 3, 5.

Why n + 1 and not n? With a gap of n, \`slow\` would stop **on** the target, and in a singly linked list you cannot unlink a node from itself: you need its predecessor. The dummy node is what makes "the predecessor of the head" exist.

📌 **Interview term: Unlinking** — removing a node by making its predecessor point past it (\`prev.next = prev.next.next\`). The node itself is not changed; it simply becomes unreachable.

## 4. The Solution in Java

~~~java
static ListNode removeNthFromEnd(ListNode head, int n) {
    if (n < 1) return head;
    ListNode dummy = new ListNode(0, head);
    ListNode slow = dummy, fast = dummy;
    for (int i = 0; i <= n; i++) {
        if (fast == null) return head;      // n is larger than the list: leave it unchanged
        fast = fast.next;
    }
    while (fast != null) {
        slow = slow.next;
        fast = fast.next;
    }
    slow.next = slow.next.next;             // slow is the node just before the target
    return dummy.next;
}
~~~

**Why each line is there:**

- \`new ListNode(0, head)\` is the dummy; it costs one small allocation and removes the head special case.
- \`i <= n\` runs the loop n + 1 times. The \`fast == null\` check turns an out-of-range n into "no change" instead of a \`NullPointerException\`.
- After the loop, \`slow.next\` is the target and is non-null, so \`slow.next.next\` is safe.
- \`return dummy.next\`, not \`head\`, because the head may have been removed.
- There is nothing to free: once no reference reaches the removed node, it is eligible for garbage collection.

### The two-pass version

~~~java
static ListNode removeTwoPass(ListNode head, int n) {
    int length = 0;
    for (ListNode node = head; node != null; node = node.next) length++;
    ListNode dummy = new ListNode(0, head);
    ListNode prev = dummy;
    for (int i = 0; i < length - n; i++) prev = prev.next;
    prev.next = prev.next.next;
    return dummy.next;
}
~~~

Example 2 runs both with a static move counter (the counter lines are left out above). For comparison, \`java.util.LinkedList\` is doubly linked and stores its size, so \`list.remove(list.size() - n)\` would do the job on that class; interviewers want the hand-written singly linked version.

## 5. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — One-pass removal with a dummy node, including the edge cases** prints:

~~~text
n=2: [1, 2, 3, 4, 5] -> [1, 2, 3, 5]
n=1: [1] -> []
n=1: [1, 2] -> [1]
n=2: [1, 2] -> [2]
n=5: [1, 2, 3, 4, 5] -> [2, 3, 4, 5]
n=1: [1, 2, 3, 4, 5] -> [1, 2, 3, 4]
n=4: [1, 2, 3] -> [1, 2, 3]
n=0: [1, 2, 3] -> [1, 2, 3]
~~~

**Example 2 — One pass versus two passes: same results, and the pointer moves counted** prints:

~~~text
compared 36 (length, n) pairs, mismatches: 0
L=5 n=2: two-pass moves 8, one-pass moves 9
L=10 n=1: two-pass moves 19, one-pass moves 20
L=10 n=10: two-pass moves 10, one-pass moves 11
L=100 n=50: two-pass moves 150, one-pass moves 151
~~~

**Reading the output:** Example 1 covers the tricky cases: removing the only node gives \`[]\`, n = 5 on a five-node list removes the head (no special case needed thanks to the dummy), and n = 4 on a three-node list or n = 0 leave the list unchanged because of the guards. Example 2 compares the one-pass and two-pass versions on all 36 (length, n) pairs for lengths 1 to 8 and finds no difference. The move counts make an honest point: the "one-pass" version makes slightly *more* pointer moves (2L - n + 1) than the two-pass version (2L - n). One pass means the list is walked once by a pair of pointers, not that less work is done; its real advantage shows when the list is a stream you cannot walk twice.

## 6. Complexity

| Approach | Time | Extra space | Pointer moves (length L) |
| :--- | :--- | :--- | :--- |
| Copy nodes into an array, index L - n - 1 | O(L) | O(L) | L, plus the array |
| Two passes: count, then walk | O(L) | O(1) | L + (L - n) = 2L - n |
| One pass, fixed gap of n + 1 | O(L) | O(1) | (L + 1) + (L - n) = 2L - n + 1 |

The move counts are from Example 2's counters. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Single node, n = 1:** the result is empty; \`slow\` stays on the dummy and \`dummy.next\` becomes null.
- **n equals the length:** the head is removed; with the dummy node this is the ordinary path.
- **n = 1:** the tail is removed; \`slow\` stops on the second-to-last node.
- **n larger than the length, or n below 1:** outside the classic constraints; the guards return the list unchanged. Ask the interviewer which behaviour they want.
- **Empty list:** with the guard, returns null (n is always larger than a length of 0).

## Common Pitfalls

- **Returning \`head\` instead of \`dummy.next\`.** Wrong whenever the head is the node removed.
- **\`i < n\` instead of \`i <= n\`.** A gap of n puts \`slow\` on the target.
- **No guard when n can exceed the length.** \`fast.next\` on null throws \`NullPointerException\`.
- **Comparing lists with \`==\` in tests.** \`List<Integer>\` results must be compared with \`equals\` (Example 2 does this); \`==\` checks whether they are the same list object.
- **Forgetting the single-node case.** With the dummy it works (\`slow\` stays on the dummy); without it, removing the only node needs its own branch.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;">Count the length, walk to index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length - n - 1</code>, unlink. Two passes, O(L) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Dummy node:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode dummy = new ListNode(0, head)</code> so the head has a predecessor; return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dummy.next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Fixed gap:</strong> <span style="color:#f0e2c8;">Move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> n + 1 links (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &lt;= n</code>), then both while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast != null</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> ends just before the target.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Unlink:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow.next = slow.next.next</code>. O(L) time, O(1) space, one pass.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Guard <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast == null</code> to avoid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NullPointerException</code>; the removed node is garbage-collected, no cleanup needed.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why n + 1 and not n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A gap of n stops <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> on the target; unlinking needs the predecessor.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is one pass faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in pointer moves: 2L - n + 1 against 2L - n (Example 2). It is a single traversal, which matters when traversal itself is costly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if n is invalid?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return the list unchanged as here, or throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IllegalArgumentException</code>; agree on it with the interviewer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">java.util.LinkedList</code> do it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is doubly linked and keeps its size, so it can index from either end; the question is about a singly linked list without a size field.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Recursive version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recurse to the end, count on the way back, unlink when the count is n. O(L) stack; a very long list can throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **nth node from the end** | 1-based: n = 1 is the tail, n = length is the head |
| **Dummy (sentinel) node** | an extra node before the head so the head has a predecessor |
| **Fixed-gap two pointers** | two pointers kept a constant number of links apart |
| **Unlinking** | \`prev.next = prev.next.next\`: skip a node so it becomes unreachable |
| **Garbage collection** | the JVM frees objects that are no longer reachable |

---
**Conclusion:** Removing the nth node from the end is the fixed-gap two-pointer pattern: put a dummy node before the head, move one pointer n + 1 links ahead, then move both until the leader falls off the end; the follower is on the predecessor of the target. It is O(L) time and O(1) space, and the dummy node removes the special case for deleting the head. In Java, write the dummy node, the \`i <= n\` gap loop and \`return dummy.next\`, and guard against a null \`fast\` if n is not guaranteed valid.`,
        examples: [
          { label: `One-pass removal with a dummy node, including the edge cases`, code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val, ListNode next) { this.val = val; this.next = next; }
    }

    static ListNode build(int[] values) {
        ListNode head = null;
        for (int i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
        return head;
    }

    static List<Integer> toList(ListNode head) {
        List<Integer> out = new ArrayList<>();
        for (ListNode n = head; n != null; n = n.next) out.add(n.val);
        return out;
    }

    // One pass: a dummy node and a gap of n + 1 links between slow and fast.
    static ListNode removeNthFromEnd(ListNode head, int n) {
        if (n < 1) return head;
        ListNode dummy = new ListNode(0, head);
        ListNode slow = dummy, fast = dummy;
        for (int i = 0; i <= n; i++) {
            if (fast == null) return head;      // n is larger than the list: leave it unchanged
            fast = fast.next;
        }
        while (fast != null) {
            slow = slow.next;
            fast = fast.next;
        }
        slow.next = slow.next.next;             // slow is the node just before the target
        return dummy.next;
    }

    static int[] range1(int n) {
        int[] r = new int[n];
        for (int i = 0; i < n; i++) r[i] = i + 1;
        return r;
    }

    static String show(int[] values, int n) {
        return "n=" + n + ": " + Arrays.toString(values) + " -> " + toList(removeNthFromEnd(build(values), n));
    }

    public static void main(String[] args) {
        System.out.println(show(new int[]{1, 2, 3, 4, 5}, 2));
        System.out.println(show(new int[]{1}, 1));
        System.out.println(show(new int[]{1, 2}, 1));
        System.out.println(show(new int[]{1, 2}, 2));
        System.out.println(show(new int[]{1, 2, 3, 4, 5}, 5));
        System.out.println(show(new int[]{1, 2, 3, 4, 5}, 1));
        System.out.println(show(new int[]{1, 2, 3}, 4));
        System.out.println(show(new int[]{1, 2, 3}, 0));
    }
}
` },
          { label: `One pass versus two passes: same results, and the pointer moves counted`, code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val, ListNode next) { this.val = val; this.next = next; }
    }

    static ListNode build(int[] values) {
        ListNode head = null;
        for (int i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
        return head;
    }

    static List<Integer> toList(ListNode head) {
        List<Integer> out = new ArrayList<>();
        for (ListNode n = head; n != null; n = n.next) out.add(n.val);
        return out;
    }

    // One pass: a dummy node and a gap of n + 1 links between slow and fast.
    static ListNode removeNthFromEnd(ListNode head, int n) {
        if (n < 1) return head;
        ListNode dummy = new ListNode(0, head);
        ListNode slow = dummy, fast = dummy;
        for (int i = 0; i <= n; i++) {
            if (fast == null) return head;      // n is larger than the list: leave it unchanged
            fast = fast.next;
        }
        while (fast != null) {
            slow = slow.next;
            fast = fast.next;
        }
        slow.next = slow.next.next;             // slow is the node just before the target
        return dummy.next;
    }

    static int[] range1(int n) {
        int[] r = new int[n];
        for (int i = 0; i < n; i++) r[i] = i + 1;
        return r;
    }

    static int moves = 0;

    // Two passes: count the length, then walk to the predecessor of the target.
    static ListNode removeTwoPass(ListNode head, int n) {
        int length = 0;
        for (ListNode node = head; node != null; node = node.next) {
            length++;
            moves++;
        }
        ListNode dummy = new ListNode(0, head);
        ListNode prev = dummy;
        for (int i = 0; i < length - n; i++) {
            prev = prev.next;
            moves++;
        }
        prev.next = prev.next.next;
        return dummy.next;
    }

    static ListNode removeOnePassCounted(ListNode head, int n) {
        ListNode dummy = new ListNode(0, head);
        ListNode slow = dummy, fast = dummy;
        for (int i = 0; i <= n; i++) {
            fast = fast.next;
            moves++;
        }
        while (fast != null) {
            slow = slow.next;
            fast = fast.next;
            moves += 2;
        }
        slow.next = slow.next.next;
        return dummy.next;
    }

    public static void main(String[] args) {
        int pairs = 0, mismatches = 0;
        for (int length = 1; length <= 8; length++) {
            for (int n = 1; n <= length; n++) {
                List<Integer> a = toList(removeNthFromEnd(build(range1(length)), n));
                List<Integer> b = toList(removeTwoPass(build(range1(length)), n));
                pairs++;
                if (!a.equals(b)) mismatches++;
            }
        }
        System.out.println("compared " + pairs + " (length, n) pairs, mismatches: " + mismatches);

        int[][] cases = {{5, 2}, {10, 1}, {10, 10}, {100, 50}};
        for (int[] c : cases) {
            moves = 0;
            removeTwoPass(build(range1(c[0])), c[1]);
            int two = moves;
            moves = 0;
            removeOnePassCounted(build(range1(c[0])), c[1]);
            System.out.println("L=" + c[0] + " n=" + c[1] + ": two-pass moves " + two + ", one-pass moves " + moves);
        }
    }
}
` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a pointer to the head of a singly linked list, remove the nth node from the end and return the head. For 1, 2, 3, 4, 5 and n = 2 the answer is 1, 2, 3, 5. Do it in one pass and do not leak memory. Please write it in C++."

**What a strong answer should cover:**
- The two-pass baseline: count the length, then unlink the node at index length - n.
- The one-pass version: a dummy node, \`fast\` moved n + 1 links ahead, then both move until \`fast\` is nullptr; \`slow\` is the predecessor of the target.
- Why the dummy node matters: removing the head needs no special case; in C++ the dummy can live on the stack.
- O(L) time and O(1) space, and an honest note that "one pass" does not mean fewer pointer moves.
- C++ specifics: \`delete\` the unlinked node (unlinking alone leaks it), save the pointer before relinking, never dereference \`nullptr\`.

**Clarifying questions expected:**
- "Is n 1-based and always between 1 and the length?"
- "Do I own the nodes, so I should free the removed one?"

**Code / implementation expected:** Yes — \`ListNode* removeNthFromEnd(ListNode* head, int n)\` in C++, one pass, freeing the removed node.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You are in a queue of people at a ticket office and you are told: "the second person from the back has to leave". Nobody in the queue knows how long it is, and you can only walk from the front. The obvious plan is to walk to the back counting heads, then walk again from the front to the right spot. That works, but it takes two trips.

A neater plan uses two friends and a rope. Tie a rope of a fixed length between them, so the front friend is always a fixed number of people ahead of the back friend. Walk them both down the queue together. When the front friend steps past the last person, the back friend is standing exactly where you need to be, right **before** the person who must leave, because the rope fixed the distance to the end.

In a singly linked list there is no "index from the end" and no way to walk backwards, so "nth from the end" is that queue. The question tests the [two-pointer technique](/interview-question/what-is-the-two-pointer-technique) with a fixed gap, and one small but important trick: a **dummy node** in front of the head, so removing the very first node needs no special case.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is n 1-based (n = 1 is the last node)? | That is the usual convention; 0-based would shift every index by one. |
| Is n guaranteed to be between 1 and the length? | If not, decide what to return for n = 0 or n larger than the list (here: the list unchanged). |
| Can the list have a single node? | Removing its only node must return an empty list. |
| Should I return the new head? | Yes: the head itself may be the node removed. |
| Do I need to free the removed node? | In C++ yes (\`delete\`); in garbage-collected languages, unlinking is enough. |

## 3. The Core Idea

📌 **Interview term: nth node from the end** — with 1-based counting, n = 1 is the tail and n = length is the head. It is the node at 0-based index \`length - n\` from the front.

### Approach 1: two passes

Walk the list once to count its \`length\`. The node to remove is at index \`length - n\`; walk again to the node just before it (index \`length - n - 1\`) and unlink. O(L) time, O(1) space. Correct, but needs a special case when \`length - n\` is 0 (removing the head), unless you use a dummy node.

### Approach 2: one pass with a fixed gap

📌 **Interview term: Dummy (sentinel) node** — an extra node placed before the real head, so every real node, including the head, has a node before it. You return \`dummy.next\` at the end.

📌 **Interview term: Fixed-gap two pointers** — two pointers that start together, then one moves ahead by k links; after that both move one link at a time, so the distance between them never changes.

Start \`slow\` and \`fast\` at the dummy. Move \`fast\` ahead **n + 1** links. Then move both until \`fast\` is null. Because the gap is n + 1 links, \`slow\` stops on the node **before** the one to remove, which is exactly where you need to be to unlink it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Step 1: slow on the dummy node, fast moved n plus 1 equals 3 links ahead onto node 3">
  <defs>
    <marker id="ln1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="49" y="89" text-anchor="middle">dummy</text>
  <rect class="d-box" x="110" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="139" y="89" text-anchor="middle">1</text>
  <rect class="d-box" x="200" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="229" y="89" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="290" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="319" y="89" text-anchor="middle">3</text>
  <rect class="d-box" x="380" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="409" y="89" text-anchor="middle">4</text>
  <rect class="d-box" x="470" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="499" y="89" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="560" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="589" y="89" text-anchor="middle">null</text>
  <path class="d-edge" d="M 80 83 L 104 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 170 83 L 194 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 260 83 L 284 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 350 83 L 374 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 440 83 L 464 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <path class="d-edge" d="M 530 83 L 554 83" fill="none" marker-end="url(#ln1-arrow)"/>
  <text class="d-text d-accent" x="49" y="44" text-anchor="middle">slow</text>
  <text class="d-text d-accent" x="319" y="44" text-anchor="middle">fast</text>
  <path class="d-edge-dashed" d="M 49 124 L 319 124" fill="none" marker-end="url(#ln1-arrow)"/>
  <text class="d-sub" x="184" y="160" text-anchor="middle">gap: n + 1 links</text>
</svg>

For the list 1, 2, 3, 4, 5 and n = 2 (remove the 4), \`fast\` first moves 3 links from the dummy to node 3.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="Step 2: both pointers moved until fast is null, slow is on node 3 just before the target node 4, which is unlinked">
  <defs>
    <marker id="ln2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="49" y="89" text-anchor="middle">dummy</text>
  <rect class="d-box" x="110" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="139" y="89" text-anchor="middle">1</text>
  <rect class="d-box" x="200" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="229" y="89" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="290" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="319" y="89" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="380" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="409" y="89" text-anchor="middle">4</text>
  <rect class="d-box" x="470" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="499" y="89" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="560" y="60" width="58" height="46" rx="8"/>
  <text class="d-text" x="589" y="89" text-anchor="middle">null</text>
  <path class="d-edge" d="M 80 83 L 104 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 170 83 L 194 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 260 83 L 284 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 350 83 L 374 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 440 83 L 464 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <path class="d-edge" d="M 530 83 L 554 83" fill="none" marker-end="url(#ln2-arrow)"/>
  <text class="d-text d-accent" x="319" y="44" text-anchor="middle">slow</text>
  <text class="d-text d-accent" x="589" y="44" text-anchor="middle">fast</text>
  <text class="d-sub" x="409" y="44" text-anchor="middle">target</text>
  <path class="d-edge-accent" d="M 319 110 C 330 180, 490 180, 499 112" fill="none" marker-end="url(#ln2-arrow)"/>
  <text class="d-sub" x="409" y="208" text-anchor="middle">slow.next = slow.next.next</text>
</svg>

Then both move together. When \`fast\` reaches null, \`slow\` is on node 3, and \`slow.next = slow.next.next\` skips node 4. The result is 1, 2, 3, 5.

Why n + 1 and not n? With a gap of n, \`slow\` would stop **on** the target, and in a singly linked list you cannot unlink a node from itself: you need its predecessor. The dummy node is what makes "the predecessor of the head" exist.

📌 **Interview term: Unlinking** — removing a node by making its predecessor point past it (\`prev.next = prev.next.next\`). The node itself is not changed; it simply becomes unreachable.

## 4. The Solution in C++

~~~cpp
ListNode* removeNthFromEnd(ListNode* head, int n) {
    if (n < 1) return head;
    ListNode dummy(0, head);                 // on the stack: nothing to free
    ListNode* slow = &dummy;
    ListNode* fast = &dummy;
    for (int i = 0; i <= n; ++i) {
        if (fast == nullptr) return head;    // n is larger than the list: leave it unchanged
        fast = fast->next;
    }
    while (fast != nullptr) {
        slow = slow->next;
        fast = fast->next;
    }
    ListNode* target = slow->next;           // slow is the node just before the target
    slow->next = target->next;
    delete target;                           // unlinking alone would leak it
    return dummy.next;
}
~~~

**Why each line is there:**

- \`ListNode dummy(0, head)\` lives on the stack, so it disappears automatically when the function returns; taking \`&dummy\` gives a pointer to start from. Returning \`dummy.next\` (a copy of the pointer) is safe; returning \`&dummy\` would not be.
- \`i <= n\` runs the loop n + 1 times; the \`fast == nullptr\` check prevents undefined behaviour when n exceeds the length.
- \`target\` is saved **before** relinking, then deleted. Writing \`slow->next = slow->next->next\` alone (as in garbage-collected languages) would leak the node, because nothing points at it any more.
- \`return dummy.next\`, never \`head\`: if the head was removed, \`head\` is now a dangling pointer to freed memory.

### The two-pass version

~~~cpp
ListNode* removeTwoPass(ListNode* head, int n) {
    int length = 0;
    for (ListNode* node = head; node != nullptr; node = node->next) ++length;
    ListNode dummy(0, head);
    ListNode* prev = &dummy;
    for (int i = 0; i < length - n; ++i) prev = prev->next;
    ListNode* target = prev->next;
    prev->next = target->next;
    delete target;
    return dummy.next;
}
~~~

Example 2 runs both with a global move counter (the counter lines are left out above) and frees every list it builds.

## 5. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — One-pass removal with a dummy node, including the edge cases** prints:

~~~text
n=2: [1, 2, 3, 4, 5] -> [1, 2, 3, 5]
n=1: [1] -> []
n=1: [1, 2] -> [1]
n=2: [1, 2] -> [2]
n=5: [1, 2, 3, 4, 5] -> [2, 3, 4, 5]
n=1: [1, 2, 3, 4, 5] -> [1, 2, 3, 4]
n=4: [1, 2, 3] -> [1, 2, 3]
n=0: [1, 2, 3] -> [1, 2, 3]
~~~

**Example 2 — One pass versus two passes: same results, and the pointer moves counted** prints:

~~~text
compared 36 (length, n) pairs, mismatches: 0
L=5 n=2: two-pass moves 8, one-pass moves 9
L=10 n=1: two-pass moves 19, one-pass moves 20
L=10 n=10: two-pass moves 10, one-pass moves 11
L=100 n=50: two-pass moves 150, one-pass moves 151
~~~

**Reading the output:** Example 1 covers the tricky cases: removing the only node gives \`[]\`, n = 5 on a five-node list removes the head (no special case needed thanks to the dummy), and n = 4 on a three-node list or n = 0 leave the list unchanged because of the guards. Example 2 compares the one-pass and two-pass versions on all 36 (length, n) pairs for lengths 1 to 8 and finds no difference. The move counts make an honest point: the "one-pass" version makes slightly *more* pointer moves (2L - n + 1) than the two-pass version (2L - n). One pass means the list is walked once by a pair of pointers, not that less work is done; its real advantage shows when the list is a stream you cannot walk twice.

## 6. Complexity

| Approach | Time | Extra space | Pointer moves (length L) |
| :--- | :--- | :--- | :--- |
| Copy nodes into an array, index L - n - 1 | O(L) | O(L) | L, plus the array |
| Two passes: count, then walk | O(L) | O(1) | L + (L - n) = 2L - n |
| One pass, fixed gap of n + 1 | O(L) | O(1) | (L + 1) + (L - n) = 2L - n + 1 |

The move counts are from Example 2's counters. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Single node, n = 1:** the result is empty; \`slow\` stays on the dummy and \`dummy.next\` becomes null.
- **n equals the length:** the head is removed; with the dummy node this is the ordinary path.
- **n = 1:** the tail is removed; \`slow\` stops on the second-to-last node.
- **n larger than the length, or n below 1:** outside the classic constraints; the guards return the list unchanged. Ask the interviewer which behaviour they want.
- **Empty list:** with the guard, returns null (n is always larger than a length of 0).

## Common Pitfalls

- **Leaking the removed node.** \`slow->next = slow->next->next\` without \`delete\` leaks it; save the pointer first, then delete.
- **Deleting before relinking.** \`delete slow->next; slow->next = slow->next->next;\` reads freed memory, which is undefined behaviour.
- **Returning \`head\` after removing the head.** \`head\` now dangles; return \`dummy.next\`.
- **A gap of n (\`i < n\`).** \`slow\` lands on the target, and a singly linked node cannot unlink itself.
- **Heap-allocating the dummy and forgetting it.** \`new ListNode(0, head)\` without a matching \`delete\` leaks one node per call; a stack dummy avoids that.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;">Count the length, walk to index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length - n - 1</code>, unlink and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete</code>. Two passes, O(L) time, O(1) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Dummy node:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode dummy(0, head)</code> on the stack, pointers start at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;dummy</code>; return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dummy.next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Fixed gap:</strong> <span style="color:#f0e2c8;">Move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast</code> n + 1 links (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &lt;= n</code>), then both while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fast != nullptr</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> ends just before the target.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Unlink and free:</strong> <span style="color:#f0e2c8;">Save <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target = slow-&gt;next</code>, set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow-&gt;next = target-&gt;next</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete target</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">No leak, no dangling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code>, no null dereference: those are the three things an interviewer checks in C++.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why n + 1 and not n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A gap of n stops <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow</code> on the target; you need the predecessor to relink around it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is one pass faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not in pointer moves: 2L - n + 1 against 2L - n (Example 2). It traverses once, which matters when traversal is expensive.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a stack dummy rather than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">new</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It needs no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete</code> and cannot leak; its address is only used inside the function.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you write it with smart pointers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::unique_ptr&lt;ListNode&gt; next</code>, unlinking by moving <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target-&gt;next</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slow-&gt;next</code> frees the node automatically; beware that destroying a very long <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unique_ptr</code> chain recursively can overflow the stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::forward_list</code> offer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a standard singly linked list with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">erase_after(it)</code>, which is exactly the predecessor-based removal this solution does by hand.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **nth node from the end** | 1-based: n = 1 is the tail, n = length is the head |
| **Dummy (sentinel) node** | an extra node before the head so the head has a predecessor |
| **Fixed-gap two pointers** | two pointers kept a constant number of links apart |
| **Unlinking** | \`prev.next = prev.next.next\`: skip a node so it becomes unreachable |
| **Dangling pointer** | a pointer to memory that has already been freed |
| **\`erase_after\`** | \`std::forward_list\` removal that takes the predecessor, like \`slow\` here |

---
**Conclusion:** Removing the nth node from the end is the fixed-gap two-pointer pattern: put a dummy node before the head, move one pointer n + 1 links ahead, then move both until the leader falls off the end; the follower is on the predecessor of the target. It is O(L) time and O(1) space, and the dummy node removes the special case for deleting the head. In C++, add the stack dummy node, the \`i <= n\` gap, and save-relink-delete for the target, and return \`dummy.next\` so no pointer dangles.`,
        examples: [
          { label: `One-pass removal with a dummy node, including the edge cases`, code: `#include <iostream>
#include <string>
#include <vector>

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v, ListNode* n) : val(v), next(n) {}
};

ListNode* build(const std::vector<int>& values) {
    ListNode* head = nullptr;
    for (auto it = values.rbegin(); it != values.rend(); ++it) head = new ListNode(*it, head);
    return head;
}

std::vector<int> toVector(ListNode* head) {
    std::vector<int> out;
    for (ListNode* n = head; n != nullptr; n = n->next) out.push_back(n->val);
    return out;
}

void freeList(ListNode* head) {
    while (head != nullptr) {
        ListNode* next = head->next;
        delete head;
        head = next;
    }
}

std::string fmt(const std::vector<int>& values) {
    std::string s = "[";
    for (std::size_t i = 0; i < values.size(); ++i) s += (i ? ", " : "") + std::to_string(values[i]);
    return s + "]";
}

// One pass: a dummy node and a gap of n + 1 links between slow and fast.
ListNode* removeNthFromEnd(ListNode* head, int n) {
    if (n < 1) return head;
    ListNode dummy(0, head);                 // on the stack: nothing to free
    ListNode* slow = &dummy;
    ListNode* fast = &dummy;
    for (int i = 0; i <= n; ++i) {
        if (fast == nullptr) return head;    // n is larger than the list: leave it unchanged
        fast = fast->next;
    }
    while (fast != nullptr) {
        slow = slow->next;
        fast = fast->next;
    }
    ListNode* target = slow->next;           // slow is the node just before the target
    slow->next = target->next;
    delete target;                           // unlinking alone would leak it
    return dummy.next;
}

std::vector<int> range1(int n) {
    std::vector<int> r(n);
    for (int i = 0; i < n; ++i) r[i] = i + 1;
    return r;
}

std::string show(const std::vector<int>& values, int n) {
    ListNode* head = removeNthFromEnd(build(values), n);
    std::string line = "n=" + std::to_string(n) + ": " + fmt(values) + " -> " + fmt(toVector(head));
    freeList(head);
    return line;
}

int main() {
    std::cout << show({1, 2, 3, 4, 5}, 2) << "\\n";
    std::cout << show({1}, 1) << "\\n";
    std::cout << show({1, 2}, 1) << "\\n";
    std::cout << show({1, 2}, 2) << "\\n";
    std::cout << show({1, 2, 3, 4, 5}, 5) << "\\n";
    std::cout << show({1, 2, 3, 4, 5}, 1) << "\\n";
    std::cout << show({1, 2, 3}, 4) << "\\n";
    std::cout << show({1, 2, 3}, 0) << "\\n";
}
` },
          { label: `One pass versus two passes: same results, and the pointer moves counted`, code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v, ListNode* n) : val(v), next(n) {}
};

ListNode* build(const std::vector<int>& values) {
    ListNode* head = nullptr;
    for (auto it = values.rbegin(); it != values.rend(); ++it) head = new ListNode(*it, head);
    return head;
}

std::vector<int> toVector(ListNode* head) {
    std::vector<int> out;
    for (ListNode* n = head; n != nullptr; n = n->next) out.push_back(n->val);
    return out;
}

void freeList(ListNode* head) {
    while (head != nullptr) {
        ListNode* next = head->next;
        delete head;
        head = next;
    }
}

std::string fmt(const std::vector<int>& values) {
    std::string s = "[";
    for (std::size_t i = 0; i < values.size(); ++i) s += (i ? ", " : "") + std::to_string(values[i]);
    return s + "]";
}

// One pass: a dummy node and a gap of n + 1 links between slow and fast.
ListNode* removeNthFromEnd(ListNode* head, int n) {
    if (n < 1) return head;
    ListNode dummy(0, head);                 // on the stack: nothing to free
    ListNode* slow = &dummy;
    ListNode* fast = &dummy;
    for (int i = 0; i <= n; ++i) {
        if (fast == nullptr) return head;    // n is larger than the list: leave it unchanged
        fast = fast->next;
    }
    while (fast != nullptr) {
        slow = slow->next;
        fast = fast->next;
    }
    ListNode* target = slow->next;           // slow is the node just before the target
    slow->next = target->next;
    delete target;                           // unlinking alone would leak it
    return dummy.next;
}

std::vector<int> range1(int n) {
    std::vector<int> r(n);
    for (int i = 0; i < n; ++i) r[i] = i + 1;
    return r;
}

int moves = 0;

// Two passes: count the length, then walk to the predecessor of the target.
ListNode* removeTwoPass(ListNode* head, int n) {
    int length = 0;
    for (ListNode* node = head; node != nullptr; node = node->next) {
        ++length;
        ++moves;
    }
    ListNode dummy(0, head);
    ListNode* prev = &dummy;
    for (int i = 0; i < length - n; ++i) {
        prev = prev->next;
        ++moves;
    }
    ListNode* target = prev->next;
    prev->next = target->next;
    delete target;
    return dummy.next;
}

ListNode* removeOnePassCounted(ListNode* head, int n) {
    ListNode dummy(0, head);
    ListNode* slow = &dummy;
    ListNode* fast = &dummy;
    for (int i = 0; i <= n; ++i) {
        fast = fast->next;
        ++moves;
    }
    while (fast != nullptr) {
        slow = slow->next;
        fast = fast->next;
        moves += 2;
    }
    ListNode* target = slow->next;
    slow->next = target->next;
    delete target;
    return dummy.next;
}

int main() {
    int pairs = 0, mismatches = 0;
    for (int length = 1; length <= 8; ++length) {
        for (int n = 1; n <= length; ++n) {
            ListNode* a = removeNthFromEnd(build(range1(length)), n);
            ListNode* b = removeTwoPass(build(range1(length)), n);
            ++pairs;
            if (toVector(a) != toVector(b)) ++mismatches;
            freeList(a);
            freeList(b);
        }
    }
    std::cout << "compared " << pairs << " (length, n) pairs, mismatches: " << mismatches << "\\n";

    std::vector<std::pair<int, int>> cases = {{5, 2}, {10, 1}, {10, 10}, {100, 50}};
    for (auto [length, n] : cases) {
        moves = 0;
        freeList(removeTwoPass(build(range1(length)), n));
        int two = moves;
        moves = 0;
        freeList(removeOnePassCounted(build(range1(length)), n));
        std::cout << "L=" << length << " n=" << n << ": two-pass moves " << two << ", one-pass moves " << moves << "\\n";
    }
}
` },
        ],
      },
    },
  },
  {
    title: `How do you add two numbers stored as linked lists?`,
    difficulty: "medium",
    seoDescription: `Add two numbers stored as linked lists in Python, JavaScript, Java and C++: carry-based digit addition, a dummy head, and the forward-order variant.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Two non-negative integers are stored as linked lists, one digit per node, ones digit first: 342 is 2 → 4 → 3. Return their sum as a linked list in the same format. Please write it in Python."

**What a strong answer should cover:**
- Column addition: walk both lists together, \`total = carry + x + y\`, append \`total % 10\`, carry \`total // 10\`.
- Loop while either list **or the carry** remains, treating a missing digit as 0; a dummy head avoids a special case for the first node.
- O(max(m, n)) time, output of at most max(m, n) + 1 nodes.
- The forward-order follow-up: stacks (or reversing) plus prepending.
- Python specifics: \`divmod(total, 10)\`; Python ints never overflow, so "convert, add, convert back" does work for moderate sizes, but \`int(str)\` refuses inputs over 4300 digits by default and the interviewer is testing list handling anyway.

**Clarifying questions expected:**
- "Ones digit first? Can the lists have different lengths?"
- "May I modify the inputs, and how long can the numbers be?"

**Code / implementation expected:** Yes — \`add_two_numbers(l1, l2)\` in Python, building a new list.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Python, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Remember adding numbers on paper in primary school? You line the numbers up on the right, add the ones column, write down the last digit and **carry** the 1 into the next column, then move left. You never needed to know how big the numbers were; you just worked column by column until both numbers and the carry ran out.

Now imagine the digits come to you on a conveyor belt, one at a time, **ones digit first**. 342 arrives as 2, then 4, then 3. Another belt brings 465 as 5, 6, 4. Your job is to send the answer, 807, out on a third belt in the same order: 7, 0, 8. That is exactly the paper method, and the belts are linked lists.

This is a classic interview problem because it looks like a number problem but is really a **list-building** problem: walk two lists at different lengths, keep one small piece of state (the carry), and build a new list as you go. It also has a trap: the "just convert to a number, add, convert back" shortcut breaks for long inputs in most languages, and the interviewer will ask you why.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the digits stored least significant first? | The classic version is reversed (ones digit at the head), which matches column addition. Forward order is a different follow-up. |
| Can the lists have different lengths? | Almost always yes; the loop must keep going while either list has digits. |
| Are there leading zeros, or negative numbers? | Usually no to both; zero itself is the single-node list [0]. |
| May I modify the input lists? | The standard answer builds a new list and leaves the inputs alone. |
| How long can the numbers be? | If they can exceed 64 bits, converting to a built-in integer type overflows or loses precision. |

## 3. The Core Idea

📌 **Interview term: Least significant digit first (reverse order)** — the list's head holds the ones digit, the next node the tens, and so on. 342 is stored as 2 → 4 → 3.

📌 **Interview term: Carry** — when a column adds up to 10 or more, the tens part (always 0 or 1 here, since 9 + 9 + 1 = 19) moves into the next column.

<svg class="iq-diagram" width="100%" viewBox="0 0 560 290" role="img" aria-label="Column addition of 342 and 465 stored least significant digit first: 2 plus 5 is 7, 4 plus 6 is 10 so write 0 carry 1, 3 plus 4 plus 1 is 8">
  <defs>
    <marker id="la1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="58" text-anchor="start">l1</text>
  <rect class="d-box" x="100" y="30" width="60" height="46" rx="8"/>
  <text class="d-text" x="130" y="59" text-anchor="middle">2</text>
  <rect class="d-box" x="230" y="30" width="60" height="46" rx="8"/>
  <text class="d-text" x="260" y="59" text-anchor="middle">4</text>
  <rect class="d-box" x="360" y="30" width="60" height="46" rx="8"/>
  <text class="d-text" x="390" y="59" text-anchor="middle">3</text>
  <path class="d-edge" d="M 162 53 L 224 53" fill="none" marker-end="url(#la1-arrow)"/>
  <path class="d-edge" d="M 292 53 L 354 53" fill="none" marker-end="url(#la1-arrow)"/>
  <text class="d-text" x="20" y="138" text-anchor="start">l2</text>
  <rect class="d-box" x="100" y="110" width="60" height="46" rx="8"/>
  <text class="d-text" x="130" y="139" text-anchor="middle">5</text>
  <rect class="d-box" x="230" y="110" width="60" height="46" rx="8"/>
  <text class="d-text" x="260" y="139" text-anchor="middle">6</text>
  <rect class="d-box" x="360" y="110" width="60" height="46" rx="8"/>
  <text class="d-text" x="390" y="139" text-anchor="middle">4</text>
  <path class="d-edge" d="M 162 133 L 224 133" fill="none" marker-end="url(#la1-arrow)"/>
  <path class="d-edge" d="M 292 133 L 354 133" fill="none" marker-end="url(#la1-arrow)"/>
  <text class="d-text d-accent" x="20" y="248" text-anchor="start">sum</text>
  <rect class="d-box-accent" x="100" y="220" width="60" height="46" rx="8"/>
  <text class="d-text" x="130" y="249" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="230" y="220" width="60" height="46" rx="8"/>
  <text class="d-text" x="260" y="249" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="360" y="220" width="60" height="46" rx="8"/>
  <text class="d-text" x="390" y="249" text-anchor="middle">8</text>
  <path class="d-edge" d="M 162 243 L 224 243" fill="none" marker-end="url(#la1-arrow)"/>
  <path class="d-edge" d="M 292 243 L 354 243" fill="none" marker-end="url(#la1-arrow)"/>
  <text class="d-text d-accent" x="325" y="194" text-anchor="middle">carry 1</text>
  <text class="d-sub" x="490" y="58" text-anchor="middle">342</text>
  <text class="d-sub" x="490" y="138" text-anchor="middle">465</text>
  <text class="d-sub" x="490" y="248" text-anchor="middle">807</text>
</svg>

Column by column: 2 + 5 = 7; 4 + 6 = 10, write 0 and carry 1; 3 + 4 + 1 = 8. The result list is 7 → 0 → 8, which is 807.

### The loop

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Each step: total is carry plus the two digits, the new node gets total mod 10, the carry becomes total div 10, repeat while either list or the carry remains">
  <defs>
    <marker id="la2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="180" height="64" rx="8"/>
  <text class="d-text" x="110" y="68" text-anchor="middle">total</text>
  <text class="d-sub" x="110" y="90" text-anchor="middle">carry + x + y</text>
  <path class="d-edge" d="M 204 72 L 236 72" fill="none" marker-end="url(#la2-arrow)"/>
  <rect class="d-box-accent" x="240" y="40" width="180" height="64" rx="8"/>
  <text class="d-text" x="330" y="68" text-anchor="middle">new node</text>
  <text class="d-sub" x="330" y="90" text-anchor="middle">total mod 10</text>
  <path class="d-edge" d="M 424 72 L 456 72" fill="none" marker-end="url(#la2-arrow)"/>
  <rect class="d-box" x="460" y="40" width="180" height="64" rx="8"/>
  <text class="d-text" x="550" y="68" text-anchor="middle">carry</text>
  <text class="d-sub" x="550" y="90" text-anchor="middle">total div 10</text>
  <path class="d-edge-dashed" d="M 550 108 C 550 180, 110 180, 110 112" fill="none" marker-end="url(#la2-arrow)"/>
  <text class="d-sub" x="330" y="196" text-anchor="middle">while l1, l2 or carry</text>
</svg>

1. Start a **dummy node** so the result list has a fixed place to hang its first digit, and keep a \`tail\` pointer to the last node built.
2. While **either list still has digits or the carry is not zero**: add the carry and whatever digits are present (a missing digit counts as 0).
3. Append a node holding \`total mod 10\`; set \`carry = total div 10\`; advance each list that still has nodes.
4. Return \`dummy.next\`.

📌 **Interview term: Dummy head (sentinel)** — a placeholder node in front of the list you are building, so appending the first node is no different from appending any other. The same trick appears in [merging two sorted linked lists](/interview-question/how-do-you-merge-two-sorted-linked-lists).

The \`or carry\` part of the loop condition is the line most people forget: 5 + 5 = 10 needs a **new final node** for the carried 1, giving 0 → 1.

### Why not convert to a number?

The shortcut "read each list into an integer, add, write the digits back" is O(n) too, but the numbers can have hundreds of digits. Built-in fixed-width integers overflow (or, in JavaScript, silently lose precision), so the digit-by-digit loop is the answer interviewers want. The language section below shows exactly what goes wrong in each language.

### Follow-up: digits in forward order

📌 **Interview term: Most significant digit first (forward order)** — 342 stored as 3 → 4 → 2. Column addition must start from the ones digit, which is now at the **end**.

Two standard fixes: [reverse both lists](/interview-question/how-do-you-reverse-a-linked-list), add, and reverse the result; or push each list's digits onto a **stack** and pop them, which hands you the digits ones-first, then build the result by **prepending** each new node so it comes out in forward order. Example 2 does the stack version.

## 4. The Solution in Python

~~~python
def add_two_numbers(l1, l2):
    """Digits are stored ones-first; returns the sum as a new list, ones-first."""
    dummy = tail = ListNode(0)
    carry = 0
    while l1 or l2 or carry:
        total = carry
        if l1:
            total += l1.val
            l1 = l1.next
        if l2:
            total += l2.val
            l2 = l2.next
        carry, digit = divmod(total, 10)
        tail.next = ListNode(digit)
        tail = tail.next
    return dummy.next
~~~

**Why each line is there:**

- \`dummy = tail = ListNode(0)\` — both names start on the same placeholder node. \`tail\` then moves along the new list; \`dummy\` stays put so \`dummy.next\` is the head of the answer.
- \`while l1 or l2 or carry\` — \`None\` and \`0\` are both falsy, so this one condition reads "while there is any digit or a carry left".
- \`divmod(total, 10)\` returns the quotient and remainder together: for 10 it is \`(1, 0)\`, for 19 it is \`(1, 9)\`.
- Reassigning \`l1 = l1.next\` only moves the local name; the caller's lists are not modified.

### The shortcut, and why it is not the answer

Python integers have arbitrary precision, so \`int("9" * 25) + 1\` printed \`10000000000000000000000000\` in a test run with no overflow. You *could* read each list into an \`int\`, add and split the result into digits. Two reasons not to:

- The interviewer is asking about list traversal and carries; the shortcut skips the whole question.
- Converting very long numbers between \`str\` and \`int\` is limited. On the Python 3.13 used here, \`sys.get_int_max_str_digits()\` printed \`4300\`, and \`int("9" * 5000)\` raised \`ValueError: Exceeds the limit (4300 digits) for integer string conversion\` ([Python docs: integer string conversion length limitation](https://docs.python.org/3/library/stdtypes.html#int-max-str-digits)). The digit loop has no such limit.

### Forward order with stacks

~~~python
def add_forward(l1, l2):
    s1, s2 = [], []
    while l1:
        s1.append(l1.val)
        l1 = l1.next
    while l2:
        s2.append(l2.val)
        l2 = l2.next
    head, carry = None, 0
    while s1 or s2 or carry:
        total = carry + (s1.pop() if s1 else 0) + (s2.pop() if s2 else 0)
        carry, digit = divmod(total, 10)
        head = ListNode(digit, head)      # prepend, so the result is forward order
    return head
~~~

A Python \`list\` is the idiomatic stack: \`append\` pushes and \`pop()\` removes the last item, both O(1) amortised.

## 5. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Digit-by-digit addition with a carry (ones digit first)** prints:

~~~text
[2, 4, 3] + [5, 6, 4] = [7, 0, 8] (342 + 465 = 807)
[0] + [0] = [0] (0 + 0 = 0)
[9, 9, 9, 9, 9, 9, 9] + [9, 9, 9, 9] = [8, 9, 9, 9, 0, 0, 0, 1] (9999999 + 9999 = 10009998)
[5] + [5] = [0, 1] (5 + 5 = 10)
[1, 8] + [0] = [1, 8] (81 + 0 = 81)
[] + [] = [] (0 + 0 = 0)
~~~

**Example 2 — Forward-order digits with stacks, including 30-digit numbers** prints:

~~~text
7243 + 564 = 7807
0 + 0 = 0
999 + 1 = 1000
123456789012345678901234567890 + 987654321098765432109876543210 = 1111111110111111111011111111100
999999999999999999999999999999 + 1 = 1000000000000000000000000000000
~~~

**Reading the output:** Example 1 shows the cases that break naive code: \`[5] + [5]\` needs the extra carry node (\`[0, 1]\`), the seven-nines plus four-nines case carries through every position into a new eighth digit, lists of different lengths keep going on the longer one, and two empty lists give an empty result (shown as the number 0). The readable numbers in brackets are made by reading the digits backwards as text, not by converting to an integer. Example 2 adds forward-order lists with stacks, including two 30-digit numbers and a 30-digit run of nines plus one, both far past what a 64-bit integer can hold.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Digit by digit with a carry | O(max(m, n)) | O(1) besides the output | one pass over the longer list; the result has at most max(m, n) + 1 nodes |
| Convert to built-in integers | O(m + n) | O(1) | but overflows for long inputs (see below) |
| Forward order with stacks | O(m + n) | O(m + n) | both lists are copied onto stacks |
| Forward order by reversing | O(m + n) | O(1) besides the output | three reversals and one addition pass, but the inputs are modified (or must be reversed back) |

m and n are the list lengths. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Different lengths:** treat a missing digit as 0 and keep looping on the longer list.
- **Final carry:** \`[5] + [5]\` and \`[9, 9] + [1]\` both end with a carry that needs a new node.
- **Zero:** \`[0] + [0]\` is \`[0]\`; there is no carry and exactly one node is built.
- **Empty lists:** not a valid number in the classic problem, but the loop returns an empty list without crashing.
- **Very long numbers:** the digit loop has no size limit; only the shortcut does.

## Common Pitfalls

- **Forgetting the final carry.** \`while l1 or l2:\` returns \`[0]\` for 5 + 5 instead of \`[0, 1]\`.
- **Stopping at the shorter list.** \`while l1 and l2:\` drops the remaining digits of the longer number.
- **Returning \`dummy\` instead of \`dummy.next\`.** The answer would start with a spurious 0.
- **Using \`/\` instead of \`//\` (or \`divmod\`).** \`total / 10\` is a float in Python 3 (\`1.0\`), and \`ListNode(1.0)\` prints as \`1.0\`.
- **Relying on \`int(...)\` conversion.** Correct for small inputs, refused above 4300 digits by default, and not what the question is testing.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Paper addition: digits come ones-first, so walk both lists together carrying into the next node.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The loop:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while l1 or l2 or carry</code>: add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">carry</code> and any present digits, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">carry, digit = divmod(total, 10)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Build:</strong> <span style="color:#f0e2c8;">A dummy head and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail</code> pointer: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail.next = ListNode(digit)</code>; return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dummy.next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(max(m, n)) time; the result has at most max(m, n) + 1 nodes; inputs are not modified.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Python ints never overflow, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int(str)</code> is capped at 4300 digits by default and the shortcut skips the point of the question.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the digits are stored most significant first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push both lists onto stacks (Python lists), pop to add ones-first, and prepend each new node with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode(digit, head)</code>. Or reverse both lists, add, and reverse the result.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the carry ever be more than 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: the largest column is 9 + 9 + 1 = 19, so the carry is 0 or 1.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it in place?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You could write the sums into the longer list's nodes and append one node for a final carry, saving allocations, but it destroys an input; ask first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about subtracting, or negative numbers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Subtraction needs a borrow instead of a carry and a comparison to know which number is larger; signs are usually stored separately.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you do it recursively?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recurse with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(l1, l2, carry)</code> and return a node whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> is the recursive result. It reads nicely but uses O(max(m, n)) stack, limited to about 1000 frames by default.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Least significant digit first** | the head holds the ones digit; 342 is 2, 4, 3 |
| **Most significant digit first** | the head holds the highest digit; 342 is 3, 4, 2 |
| **Carry** | the tens part of a column sum, added to the next column |
| **Dummy head** | a placeholder node before the list being built |
| **\`divmod(a, b)\`** | Python built-in returning \`(a // b, a % b)\` in one call |
| **Arbitrary precision** | Python ints grow as needed and never overflow |

---
**Conclusion:** Adding two numbers stored as linked lists is paper addition: walk both lists together, add the digits and the carry, append \`total mod 10\`, keep \`total div 10\` as the next carry, and keep going while either list or the carry remains. It is O(max(m, n)) time, needs only a dummy head and a tail pointer, and, unlike converting to a built-in integer, works for numbers of any length. In Python, \`divmod\`, a dummy head and the \`or carry\` condition are the whole solution; be ready to explain why the convert-to-int shortcut is not the answer even though Python ints do not overflow.`,
        examples: [
          { label: `Digit-by-digit addition with a carry (ones digit first)`, code: `class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next


def build(digits):
    head = None
    for d in reversed(digits):
        head = ListNode(d, head)
    return head


def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out


def fmt(values):
    return "[" + ", ".join(str(v) for v in values) + "]"


def add_two_numbers(l1, l2):
    """Digits are stored ones-first; returns the sum as a new list, ones-first."""
    dummy = tail = ListNode(0)
    carry = 0
    while l1 or l2 or carry:
        total = carry
        if l1:
            total += l1.val
            l1 = l1.next
        if l2:
            total += l2.val
            l2 = l2.next
        carry, digit = divmod(total, 10)
        tail.next = ListNode(digit)
        tail = tail.next
    return dummy.next


def as_number(digits):
    """Read ones-first digits as text, without converting to an integer."""
    return "".join(str(d) for d in reversed(digits)) or "0"


def show(a, b):
    s = to_list(add_two_numbers(build(a), build(b)))
    return (fmt(a) + " + " + fmt(b) + " = " + fmt(s)
            + " (" + as_number(a) + " + " + as_number(b) + " = " + as_number(s) + ")")


print(show([2, 4, 3], [5, 6, 4]))  # [2, 4, 3] + [5, 6, 4] = [7, 0, 8] (342 + 465 = 807)
print(show([0], [0]))  # [0] + [0] = [0] (0 + 0 = 0)
print(show([9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9]))  # [9, 9, 9, 9, 9, 9, 9] + [9, 9, 9, 9] = [8, 9, 9, 9, 0, 0, 0, 1] (9999999 + 9999 = 10009998)
print(show([5], [5]))  # [5] + [5] = [0, 1] (5 + 5 = 10)
print(show([1, 8], [0]))  # [1, 8] + [0] = [1, 8] (81 + 0 = 81)
print(show([], []))  # [] + [] = [] (0 + 0 = 0)
` },
          { label: `Forward-order digits with stacks, including 30-digit numbers`, code: `class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next


def build(digits):
    head = None
    for d in reversed(digits):
        head = ListNode(d, head)
    return head


def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out


def fmt(values):
    return "[" + ", ".join(str(v) for v in values) + "]"


def add_two_numbers(l1, l2):
    """Digits are stored ones-first; returns the sum as a new list, ones-first."""
    dummy = tail = ListNode(0)
    carry = 0
    while l1 or l2 or carry:
        total = carry
        if l1:
            total += l1.val
            l1 = l1.next
        if l2:
            total += l2.val
            l2 = l2.next
        carry, digit = divmod(total, 10)
        tail.next = ListNode(digit)
        tail = tail.next
    return dummy.next


def add_forward(l1, l2):
    """Digits stored most significant first: use stacks, prepend each new node."""
    s1, s2 = [], []
    while l1:
        s1.append(l1.val)
        l1 = l1.next
    while l2:
        s2.append(l2.val)
        l2 = l2.next
    head, carry = None, 0
    while s1 or s2 or carry:
        total = carry + (s1.pop() if s1 else 0) + (s2.pop() if s2 else 0)
        carry, digit = divmod(total, 10)
        head = ListNode(digit, head)      # prepend, so the result is forward order
    return head


def digits_of(text):
    return [int(ch) for ch in text]


def show(a, b):
    s = add_forward(build(digits_of(a)), build(digits_of(b)))
    return a + " + " + b + " = " + "".join(str(d) for d in to_list(s))


print(show("7243", "564"))  # 7243 + 564 = 7807
print(show("0", "0"))  # 0 + 0 = 0
print(show("999", "1"))  # 999 + 1 = 1000
print(show("123456789012345678901234567890", "987654321098765432109876543210"))  # 123456789012345678901234567890 + 987654321098765432109876543210 = 1111111110111111111011111111100
print(show("999999999999999999999999999999", "1"))  # 999999999999999999999999999999 + 1 = 1000000000000000000000000000000
` },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Two non-negative integers are stored as linked lists, one digit per node, ones digit first: 342 is 2 → 4 → 3. Return their sum as a linked list in the same format. Please write it in JavaScript."

**What a strong answer should cover:**
- Column addition: walk both lists together, \`total = carry + x + y\`, append \`total % 10\`, carry \`Math.floor(total / 10)\`.
- Loop while either list **or the carry** remains, treating a missing digit as 0; a dummy head avoids a special case for the first node.
- O(max(m, n)) time, output of at most max(m, n) + 1 nodes.
- The forward-order follow-up: arrays as stacks plus prepending.
- JavaScript specifics: \`/\` is floating-point division, so floor it; converting to \`Number\` loses precision past \`Number.MAX_SAFE_INTEGER\` (2^53 - 1), and \`BigInt\` would work but skips the point of the question.

**Clarifying questions expected:**
- "Ones digit first? Can the lists have different lengths?"
- "How long can the numbers be?"

**Code / implementation expected:** Yes — \`addTwoNumbers(l1, l2)\` in JavaScript, building a new list.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is JavaScript, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Remember adding numbers on paper in primary school? You line the numbers up on the right, add the ones column, write down the last digit and **carry** the 1 into the next column, then move left. You never needed to know how big the numbers were; you just worked column by column until both numbers and the carry ran out.

Now imagine the digits come to you on a conveyor belt, one at a time, **ones digit first**. 342 arrives as 2, then 4, then 3. Another belt brings 465 as 5, 6, 4. Your job is to send the answer, 807, out on a third belt in the same order: 7, 0, 8. That is exactly the paper method, and the belts are linked lists.

This is a classic interview problem because it looks like a number problem but is really a **list-building** problem: walk two lists at different lengths, keep one small piece of state (the carry), and build a new list as you go. It also has a trap: the "just convert to a number, add, convert back" shortcut breaks for long inputs in most languages, and the interviewer will ask you why.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the digits stored least significant first? | The classic version is reversed (ones digit at the head), which matches column addition. Forward order is a different follow-up. |
| Can the lists have different lengths? | Almost always yes; the loop must keep going while either list has digits. |
| Are there leading zeros, or negative numbers? | Usually no to both; zero itself is the single-node list [0]. |
| May I modify the input lists? | The standard answer builds a new list and leaves the inputs alone. |
| How long can the numbers be? | If they can exceed 64 bits, converting to a built-in integer type overflows or loses precision. |

## 3. The Core Idea

📌 **Interview term: Least significant digit first (reverse order)** — the list's head holds the ones digit, the next node the tens, and so on. 342 is stored as 2 → 4 → 3.

📌 **Interview term: Carry** — when a column adds up to 10 or more, the tens part (always 0 or 1 here, since 9 + 9 + 1 = 19) moves into the next column.

<svg class="iq-diagram" width="100%" viewBox="0 0 560 290" role="img" aria-label="Column addition of 342 and 465 stored least significant digit first: 2 plus 5 is 7, 4 plus 6 is 10 so write 0 carry 1, 3 plus 4 plus 1 is 8">
  <defs>
    <marker id="la1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="58" text-anchor="start">l1</text>
  <rect class="d-box" x="100" y="30" width="60" height="46" rx="8"/>
  <text class="d-text" x="130" y="59" text-anchor="middle">2</text>
  <rect class="d-box" x="230" y="30" width="60" height="46" rx="8"/>
  <text class="d-text" x="260" y="59" text-anchor="middle">4</text>
  <rect class="d-box" x="360" y="30" width="60" height="46" rx="8"/>
  <text class="d-text" x="390" y="59" text-anchor="middle">3</text>
  <path class="d-edge" d="M 162 53 L 224 53" fill="none" marker-end="url(#la1-arrow)"/>
  <path class="d-edge" d="M 292 53 L 354 53" fill="none" marker-end="url(#la1-arrow)"/>
  <text class="d-text" x="20" y="138" text-anchor="start">l2</text>
  <rect class="d-box" x="100" y="110" width="60" height="46" rx="8"/>
  <text class="d-text" x="130" y="139" text-anchor="middle">5</text>
  <rect class="d-box" x="230" y="110" width="60" height="46" rx="8"/>
  <text class="d-text" x="260" y="139" text-anchor="middle">6</text>
  <rect class="d-box" x="360" y="110" width="60" height="46" rx="8"/>
  <text class="d-text" x="390" y="139" text-anchor="middle">4</text>
  <path class="d-edge" d="M 162 133 L 224 133" fill="none" marker-end="url(#la1-arrow)"/>
  <path class="d-edge" d="M 292 133 L 354 133" fill="none" marker-end="url(#la1-arrow)"/>
  <text class="d-text d-accent" x="20" y="248" text-anchor="start">sum</text>
  <rect class="d-box-accent" x="100" y="220" width="60" height="46" rx="8"/>
  <text class="d-text" x="130" y="249" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="230" y="220" width="60" height="46" rx="8"/>
  <text class="d-text" x="260" y="249" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="360" y="220" width="60" height="46" rx="8"/>
  <text class="d-text" x="390" y="249" text-anchor="middle">8</text>
  <path class="d-edge" d="M 162 243 L 224 243" fill="none" marker-end="url(#la1-arrow)"/>
  <path class="d-edge" d="M 292 243 L 354 243" fill="none" marker-end="url(#la1-arrow)"/>
  <text class="d-text d-accent" x="325" y="194" text-anchor="middle">carry 1</text>
  <text class="d-sub" x="490" y="58" text-anchor="middle">342</text>
  <text class="d-sub" x="490" y="138" text-anchor="middle">465</text>
  <text class="d-sub" x="490" y="248" text-anchor="middle">807</text>
</svg>

Column by column: 2 + 5 = 7; 4 + 6 = 10, write 0 and carry 1; 3 + 4 + 1 = 8. The result list is 7 → 0 → 8, which is 807.

### The loop

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Each step: total is carry plus the two digits, the new node gets total mod 10, the carry becomes total div 10, repeat while either list or the carry remains">
  <defs>
    <marker id="la2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="180" height="64" rx="8"/>
  <text class="d-text" x="110" y="68" text-anchor="middle">total</text>
  <text class="d-sub" x="110" y="90" text-anchor="middle">carry + x + y</text>
  <path class="d-edge" d="M 204 72 L 236 72" fill="none" marker-end="url(#la2-arrow)"/>
  <rect class="d-box-accent" x="240" y="40" width="180" height="64" rx="8"/>
  <text class="d-text" x="330" y="68" text-anchor="middle">new node</text>
  <text class="d-sub" x="330" y="90" text-anchor="middle">total mod 10</text>
  <path class="d-edge" d="M 424 72 L 456 72" fill="none" marker-end="url(#la2-arrow)"/>
  <rect class="d-box" x="460" y="40" width="180" height="64" rx="8"/>
  <text class="d-text" x="550" y="68" text-anchor="middle">carry</text>
  <text class="d-sub" x="550" y="90" text-anchor="middle">total div 10</text>
  <path class="d-edge-dashed" d="M 550 108 C 550 180, 110 180, 110 112" fill="none" marker-end="url(#la2-arrow)"/>
  <text class="d-sub" x="330" y="196" text-anchor="middle">while l1, l2 or carry</text>
</svg>

1. Start a **dummy node** so the result list has a fixed place to hang its first digit, and keep a \`tail\` pointer to the last node built.
2. While **either list still has digits or the carry is not zero**: add the carry and whatever digits are present (a missing digit counts as 0).
3. Append a node holding \`total mod 10\`; set \`carry = total div 10\`; advance each list that still has nodes.
4. Return \`dummy.next\`.

📌 **Interview term: Dummy head (sentinel)** — a placeholder node in front of the list you are building, so appending the first node is no different from appending any other. The same trick appears in [merging two sorted linked lists](/interview-question/how-do-you-merge-two-sorted-linked-lists).

The \`or carry\` part of the loop condition is the line most people forget: 5 + 5 = 10 needs a **new final node** for the carried 1, giving 0 → 1.

### Why not convert to a number?

The shortcut "read each list into an integer, add, write the digits back" is O(n) too, but the numbers can have hundreds of digits. Built-in fixed-width integers overflow (or, in JavaScript, silently lose precision), so the digit-by-digit loop is the answer interviewers want. The language section below shows exactly what goes wrong in each language.

### Follow-up: digits in forward order

📌 **Interview term: Most significant digit first (forward order)** — 342 stored as 3 → 4 → 2. Column addition must start from the ones digit, which is now at the **end**.

Two standard fixes: [reverse both lists](/interview-question/how-do-you-reverse-a-linked-list), add, and reverse the result; or push each list's digits onto a **stack** and pop them, which hands you the digits ones-first, then build the result by **prepending** each new node so it comes out in forward order. Example 2 does the stack version.

## 4. The Solution in JavaScript

~~~javascript
function addTwoNumbers(l1, l2) {
  const dummy = new ListNode(0);
  let tail = dummy;
  let carry = 0;
  while (l1 !== null || l2 !== null || carry !== 0) {
    let total = carry;
    if (l1 !== null) {
      total += l1.val;
      l1 = l1.next;
    }
    if (l2 !== null) {
      total += l2.val;
      l2 = l2.next;
    }
    carry = Math.floor(total / 10);
    tail.next = new ListNode(total % 10);
    tail = tail.next;
  }
  return dummy.next;
}
~~~

**Why each line is there:**

- \`const dummy\` never changes; \`tail\` walks along the new list. Returning \`dummy.next\` skips the placeholder.
- The three-part condition keeps going on the longer list and for a final carry.
- \`Math.floor(total / 10)\`: in JavaScript \`/\` always produces a floating-point result, so \`15 / 10\` is \`1.5\`. Flooring gives the carry. \`total % 10\` is the digit (safe here because \`total\` is never negative).
- Reassigning the parameters \`l1\`, \`l2\` only moves local variables; the caller's lists are untouched.

### The shortcut, and why it breaks

Every JavaScript \`number\` is a 64-bit floating-point value, which represents integers exactly only up to \`Number.MAX_SAFE_INTEGER\`, 9007199254740991. In a test run, \`console.log(9007199254740993)\` printed \`9007199254740992\`: the last digit is silently wrong, no error. So "read the list into a number, add, split" fails for any input longer than about 15 digits. \`BigInt\` does have arbitrary precision (\`BigInt("99999999999999999999") + 1n\` printed \`100000000000000000000n\`), but using it sidesteps the list problem the interviewer asked about.

### Forward order with stacks

~~~javascript
function addForward(l1, l2) {
  const s1 = [];
  const s2 = [];
  for (; l1 !== null; l1 = l1.next) s1.push(l1.val);
  for (; l2 !== null; l2 = l2.next) s2.push(l2.val);
  let head = null;
  let carry = 0;
  while (s1.length > 0 || s2.length > 0 || carry !== 0) {
    const total = carry + (s1.length ? s1.pop() : 0) + (s2.length ? s2.pop() : 0);
    carry = Math.floor(total / 10);
    head = new ListNode(total % 10, head);   // prepend, so the result is forward order
  }
  return head;
}
~~~

An array with \`push\` and \`pop\` is the standard JavaScript stack. Note \`s1.pop()\` on an empty array returns \`undefined\`, and \`undefined + 1\` is \`NaN\`, hence the length checks.

## 5. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Digit-by-digit addition with a carry (ones digit first)** prints:

~~~text
[2, 4, 3] + [5, 6, 4] = [7, 0, 8] (342 + 465 = 807)
[0] + [0] = [0] (0 + 0 = 0)
[9, 9, 9, 9, 9, 9, 9] + [9, 9, 9, 9] = [8, 9, 9, 9, 0, 0, 0, 1] (9999999 + 9999 = 10009998)
[5] + [5] = [0, 1] (5 + 5 = 10)
[1, 8] + [0] = [1, 8] (81 + 0 = 81)
[] + [] = [] (0 + 0 = 0)
~~~

**Example 2 — Forward-order digits with stacks, including 30-digit numbers** prints:

~~~text
7243 + 564 = 7807
0 + 0 = 0
999 + 1 = 1000
123456789012345678901234567890 + 987654321098765432109876543210 = 1111111110111111111011111111100
999999999999999999999999999999 + 1 = 1000000000000000000000000000000
~~~

**Reading the output:** Example 1 shows the cases that break naive code: \`[5] + [5]\` needs the extra carry node (\`[0, 1]\`), the seven-nines plus four-nines case carries through every position into a new eighth digit, lists of different lengths keep going on the longer one, and two empty lists give an empty result (shown as the number 0). The readable numbers in brackets are made by reading the digits backwards as text, not by converting to an integer. Example 2 adds forward-order lists with stacks, including two 30-digit numbers and a 30-digit run of nines plus one, both far past what a 64-bit integer can hold.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Digit by digit with a carry | O(max(m, n)) | O(1) besides the output | one pass over the longer list; the result has at most max(m, n) + 1 nodes |
| Convert to built-in integers | O(m + n) | O(1) | but overflows for long inputs (see below) |
| Forward order with stacks | O(m + n) | O(m + n) | both lists are copied onto stacks |
| Forward order by reversing | O(m + n) | O(1) besides the output | three reversals and one addition pass, but the inputs are modified (or must be reversed back) |

m and n are the list lengths. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Different lengths:** treat a missing digit as 0 and keep looping on the longer list.
- **Final carry:** \`[5] + [5]\` and \`[9, 9] + [1]\` both end with a carry that needs a new node.
- **Zero:** \`[0] + [0]\` is \`[0]\`; there is no carry and exactly one node is built.
- **Empty lists:** not a valid number in the classic problem, but the loop returns an empty list without crashing.
- **Very long numbers:** the digit loop has no size limit; only the shortcut does.

## Common Pitfalls

- **Not flooring the division.** \`carry = total / 10\` makes the carry \`1.5\` and the next digit wrong; use \`Math.floor\` (or \`total >= 10 ? 1 : 0\`).
- **Forgetting the final carry.** Without \`|| carry !== 0\`, 5 + 5 returns \`[0]\`.
- **Converting to \`Number\`.** Wrong beyond 2^53 with no error; e.g. 9007199254740993 becomes 9007199254740992.
- **Popping an empty stack.** \`[].pop()\` is \`undefined\`, and adding it turns the total into \`NaN\`.
- **Returning \`dummy\`.** The answer would start with a spurious 0.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Paper addition: digits come ones-first, so walk both lists together carrying into the next node.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The loop:</strong> <span style="color:#f0e2c8;">While <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">l1 !== null || l2 !== null || carry !== 0</code>: add the carry and any present digits; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">carry = Math.floor(total / 10)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Build:</strong> <span style="color:#f0e2c8;">A dummy head and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail.next = new ListNode(total % 10)</code>; return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dummy.next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(max(m, n)) time; at most max(m, n) + 1 result nodes; inputs untouched.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/</code> is float division, so floor it; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Number</code> is exact only up to 2^53 - 1, so the convert-and-add shortcut silently breaks.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">BigInt</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It would give the right answer, but the question is about traversing lists with a carry; using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> avoids the whole exercise, and parsing the list into a string first is still O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the digits are stored most significant first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push both lists onto arrays, pop to add ones-first, and prepend each new node. Or reverse both, add, reverse the result.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the carry exceed 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: the largest column is 9 + 9 + 1 = 19.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">total % 10</code> safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Here, yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total</code> is never negative. With negative numbers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">%</code> in JavaScript keeps the sign of the dividend (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-3 % 10</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-3</code>).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Recursive version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recurse on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(l1, l2, carry)</code> and return a node whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> is the recursive result; O(max(m, n)) stack, so very long numbers can throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Least significant digit first** | the head holds the ones digit; 342 is 2, 4, 3 |
| **Most significant digit first** | the head holds the highest digit; 342 is 3, 4, 2 |
| **Carry** | the tens part of a column sum, added to the next column |
| **Dummy head** | a placeholder node before the list being built |
| **\`Number.MAX_SAFE_INTEGER\`** | 9007199254740991, the largest integer a JavaScript number holds exactly |
| **\`BigInt\`** | arbitrary-precision integers in JavaScript, written with an \`n\` suffix |

---
**Conclusion:** Adding two numbers stored as linked lists is paper addition: walk both lists together, add the digits and the carry, append \`total mod 10\`, keep \`total div 10\` as the next carry, and keep going while either list or the carry remains. It is O(max(m, n)) time, needs only a dummy head and a tail pointer, and, unlike converting to a built-in integer, works for numbers of any length. In JavaScript, floor the division, keep the \`|| carry !== 0\` condition, and be ready to explain why converting to \`Number\` fails silently past 2^53.`,
        examples: [
          { label: `Digit-by-digit addition with a carry (ones digit first)`, code: `class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

function build(digits) {
  let head = null;
  for (let i = digits.length - 1; i >= 0; i--) head = new ListNode(digits[i], head);
  return head;
}

function toArray(head) {
  const out = [];
  for (let node = head; node !== null; node = node.next) out.push(node.val);
  return out;
}

function fmt(values) {
  return '[' + values.join(', ') + ']';
}

// Digits are stored ones-first; returns the sum as a new list, ones-first.
function addTwoNumbers(l1, l2) {
  const dummy = new ListNode(0);
  let tail = dummy;
  let carry = 0;
  while (l1 !== null || l2 !== null || carry !== 0) {
    let total = carry;
    if (l1 !== null) {
      total += l1.val;
      l1 = l1.next;
    }
    if (l2 !== null) {
      total += l2.val;
      l2 = l2.next;
    }
    carry = Math.floor(total / 10);
    tail.next = new ListNode(total % 10);
    tail = tail.next;
  }
  return dummy.next;
}

// Read ones-first digits as text, without converting to a number.
function asNumber(digits) {
  return digits.slice().reverse().join('') || '0';
}

function show(a, b) {
  const s = toArray(addTwoNumbers(build(a), build(b)));
  return fmt(a) + ' + ' + fmt(b) + ' = ' + fmt(s) +
    ' (' + asNumber(a) + ' + ' + asNumber(b) + ' = ' + asNumber(s) + ')';
}

console.log(show([2, 4, 3], [5, 6, 4])); // [2, 4, 3] + [5, 6, 4] = [7, 0, 8] (342 + 465 = 807)
console.log(show([0], [0])); // [0] + [0] = [0] (0 + 0 = 0)
console.log(show([9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9])); // [9, 9, 9, 9, 9, 9, 9] + [9, 9, 9, 9] = [8, 9, 9, 9, 0, 0, 0, 1] (9999999 + 9999 = 10009998)
console.log(show([5], [5])); // [5] + [5] = [0, 1] (5 + 5 = 10)
console.log(show([1, 8], [0])); // [1, 8] + [0] = [1, 8] (81 + 0 = 81)
console.log(show([], [])); // [] + [] = [] (0 + 0 = 0)
` },
          { label: `Forward-order digits with stacks, including 30-digit numbers`, code: `class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

function build(digits) {
  let head = null;
  for (let i = digits.length - 1; i >= 0; i--) head = new ListNode(digits[i], head);
  return head;
}

function toArray(head) {
  const out = [];
  for (let node = head; node !== null; node = node.next) out.push(node.val);
  return out;
}

function fmt(values) {
  return '[' + values.join(', ') + ']';
}

// Digits are stored ones-first; returns the sum as a new list, ones-first.
function addTwoNumbers(l1, l2) {
  const dummy = new ListNode(0);
  let tail = dummy;
  let carry = 0;
  while (l1 !== null || l2 !== null || carry !== 0) {
    let total = carry;
    if (l1 !== null) {
      total += l1.val;
      l1 = l1.next;
    }
    if (l2 !== null) {
      total += l2.val;
      l2 = l2.next;
    }
    carry = Math.floor(total / 10);
    tail.next = new ListNode(total % 10);
    tail = tail.next;
  }
  return dummy.next;
}

// Digits stored most significant first: use stacks, prepend each new node.
function addForward(l1, l2) {
  const s1 = [];
  const s2 = [];
  for (; l1 !== null; l1 = l1.next) s1.push(l1.val);
  for (; l2 !== null; l2 = l2.next) s2.push(l2.val);
  let head = null;
  let carry = 0;
  while (s1.length > 0 || s2.length > 0 || carry !== 0) {
    const total = carry + (s1.length ? s1.pop() : 0) + (s2.length ? s2.pop() : 0);
    carry = Math.floor(total / 10);
    head = new ListNode(total % 10, head);   // prepend, so the result is forward order
  }
  return head;
}

function digitsOf(text) {
  return text.split('').map(Number);
}

function show(a, b) {
  const s = addForward(build(digitsOf(a)), build(digitsOf(b)));
  return a + ' + ' + b + ' = ' + toArray(s).join('');
}

console.log(show('7243', '564')); // 7243 + 564 = 7807
console.log(show('0', '0')); // 0 + 0 = 0
console.log(show('999', '1')); // 999 + 1 = 1000
console.log(show('123456789012345678901234567890', '987654321098765432109876543210')); // 123456789012345678901234567890 + 987654321098765432109876543210 = 1111111110111111111011111111100
console.log(show('999999999999999999999999999999', '1')); // 999999999999999999999999999999 + 1 = 1000000000000000000000000000000
` },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Two non-negative integers are stored as linked lists, one digit per node, ones digit first: 342 is 2 → 4 → 3. Return their sum as a linked list in the same format. Please write it in Java."

**What a strong answer should cover:**
- Column addition: walk both lists together, \`total = carry + x + y\`, append \`total % 10\`, carry \`total / 10\` (integer division).
- Loop while either list **or the carry** remains, treating a missing digit as 0; a dummy head avoids a special case for the first node.
- O(max(m, n)) time, output of at most max(m, n) + 1 nodes.
- The forward-order follow-up: \`ArrayDeque\` stacks plus prepending.
- Java specifics: converting to \`long\` overflows past 19 digits and wraps silently to a negative number; \`BigInteger\` works but skips the point; prefer \`ArrayDeque\` over the legacy \`Stack\` class.

**Clarifying questions expected:**
- "Ones digit first? Can the lists have different lengths?"
- "How long can the numbers be?"

**Code / implementation expected:** Yes — \`ListNode addTwoNumbers(ListNode l1, ListNode l2)\` in Java, building a new list.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is Java, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Remember adding numbers on paper in primary school? You line the numbers up on the right, add the ones column, write down the last digit and **carry** the 1 into the next column, then move left. You never needed to know how big the numbers were; you just worked column by column until both numbers and the carry ran out.

Now imagine the digits come to you on a conveyor belt, one at a time, **ones digit first**. 342 arrives as 2, then 4, then 3. Another belt brings 465 as 5, 6, 4. Your job is to send the answer, 807, out on a third belt in the same order: 7, 0, 8. That is exactly the paper method, and the belts are linked lists.

This is a classic interview problem because it looks like a number problem but is really a **list-building** problem: walk two lists at different lengths, keep one small piece of state (the carry), and build a new list as you go. It also has a trap: the "just convert to a number, add, convert back" shortcut breaks for long inputs in most languages, and the interviewer will ask you why.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the digits stored least significant first? | The classic version is reversed (ones digit at the head), which matches column addition. Forward order is a different follow-up. |
| Can the lists have different lengths? | Almost always yes; the loop must keep going while either list has digits. |
| Are there leading zeros, or negative numbers? | Usually no to both; zero itself is the single-node list [0]. |
| May I modify the input lists? | The standard answer builds a new list and leaves the inputs alone. |
| How long can the numbers be? | If they can exceed 64 bits, converting to a built-in integer type overflows or loses precision. |

## 3. The Core Idea

📌 **Interview term: Least significant digit first (reverse order)** — the list's head holds the ones digit, the next node the tens, and so on. 342 is stored as 2 → 4 → 3.

📌 **Interview term: Carry** — when a column adds up to 10 or more, the tens part (always 0 or 1 here, since 9 + 9 + 1 = 19) moves into the next column.

<svg class="iq-diagram" width="100%" viewBox="0 0 560 290" role="img" aria-label="Column addition of 342 and 465 stored least significant digit first: 2 plus 5 is 7, 4 plus 6 is 10 so write 0 carry 1, 3 plus 4 plus 1 is 8">
  <defs>
    <marker id="la1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="58" text-anchor="start">l1</text>
  <rect class="d-box" x="100" y="30" width="60" height="46" rx="8"/>
  <text class="d-text" x="130" y="59" text-anchor="middle">2</text>
  <rect class="d-box" x="230" y="30" width="60" height="46" rx="8"/>
  <text class="d-text" x="260" y="59" text-anchor="middle">4</text>
  <rect class="d-box" x="360" y="30" width="60" height="46" rx="8"/>
  <text class="d-text" x="390" y="59" text-anchor="middle">3</text>
  <path class="d-edge" d="M 162 53 L 224 53" fill="none" marker-end="url(#la1-arrow)"/>
  <path class="d-edge" d="M 292 53 L 354 53" fill="none" marker-end="url(#la1-arrow)"/>
  <text class="d-text" x="20" y="138" text-anchor="start">l2</text>
  <rect class="d-box" x="100" y="110" width="60" height="46" rx="8"/>
  <text class="d-text" x="130" y="139" text-anchor="middle">5</text>
  <rect class="d-box" x="230" y="110" width="60" height="46" rx="8"/>
  <text class="d-text" x="260" y="139" text-anchor="middle">6</text>
  <rect class="d-box" x="360" y="110" width="60" height="46" rx="8"/>
  <text class="d-text" x="390" y="139" text-anchor="middle">4</text>
  <path class="d-edge" d="M 162 133 L 224 133" fill="none" marker-end="url(#la1-arrow)"/>
  <path class="d-edge" d="M 292 133 L 354 133" fill="none" marker-end="url(#la1-arrow)"/>
  <text class="d-text d-accent" x="20" y="248" text-anchor="start">sum</text>
  <rect class="d-box-accent" x="100" y="220" width="60" height="46" rx="8"/>
  <text class="d-text" x="130" y="249" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="230" y="220" width="60" height="46" rx="8"/>
  <text class="d-text" x="260" y="249" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="360" y="220" width="60" height="46" rx="8"/>
  <text class="d-text" x="390" y="249" text-anchor="middle">8</text>
  <path class="d-edge" d="M 162 243 L 224 243" fill="none" marker-end="url(#la1-arrow)"/>
  <path class="d-edge" d="M 292 243 L 354 243" fill="none" marker-end="url(#la1-arrow)"/>
  <text class="d-text d-accent" x="325" y="194" text-anchor="middle">carry 1</text>
  <text class="d-sub" x="490" y="58" text-anchor="middle">342</text>
  <text class="d-sub" x="490" y="138" text-anchor="middle">465</text>
  <text class="d-sub" x="490" y="248" text-anchor="middle">807</text>
</svg>

Column by column: 2 + 5 = 7; 4 + 6 = 10, write 0 and carry 1; 3 + 4 + 1 = 8. The result list is 7 → 0 → 8, which is 807.

### The loop

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Each step: total is carry plus the two digits, the new node gets total mod 10, the carry becomes total div 10, repeat while either list or the carry remains">
  <defs>
    <marker id="la2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="180" height="64" rx="8"/>
  <text class="d-text" x="110" y="68" text-anchor="middle">total</text>
  <text class="d-sub" x="110" y="90" text-anchor="middle">carry + x + y</text>
  <path class="d-edge" d="M 204 72 L 236 72" fill="none" marker-end="url(#la2-arrow)"/>
  <rect class="d-box-accent" x="240" y="40" width="180" height="64" rx="8"/>
  <text class="d-text" x="330" y="68" text-anchor="middle">new node</text>
  <text class="d-sub" x="330" y="90" text-anchor="middle">total mod 10</text>
  <path class="d-edge" d="M 424 72 L 456 72" fill="none" marker-end="url(#la2-arrow)"/>
  <rect class="d-box" x="460" y="40" width="180" height="64" rx="8"/>
  <text class="d-text" x="550" y="68" text-anchor="middle">carry</text>
  <text class="d-sub" x="550" y="90" text-anchor="middle">total div 10</text>
  <path class="d-edge-dashed" d="M 550 108 C 550 180, 110 180, 110 112" fill="none" marker-end="url(#la2-arrow)"/>
  <text class="d-sub" x="330" y="196" text-anchor="middle">while l1, l2 or carry</text>
</svg>

1. Start a **dummy node** so the result list has a fixed place to hang its first digit, and keep a \`tail\` pointer to the last node built.
2. While **either list still has digits or the carry is not zero**: add the carry and whatever digits are present (a missing digit counts as 0).
3. Append a node holding \`total mod 10\`; set \`carry = total div 10\`; advance each list that still has nodes.
4. Return \`dummy.next\`.

📌 **Interview term: Dummy head (sentinel)** — a placeholder node in front of the list you are building, so appending the first node is no different from appending any other. The same trick appears in [merging two sorted linked lists](/interview-question/how-do-you-merge-two-sorted-linked-lists).

The \`or carry\` part of the loop condition is the line most people forget: 5 + 5 = 10 needs a **new final node** for the carried 1, giving 0 → 1.

### Why not convert to a number?

The shortcut "read each list into an integer, add, write the digits back" is O(n) too, but the numbers can have hundreds of digits. Built-in fixed-width integers overflow (or, in JavaScript, silently lose precision), so the digit-by-digit loop is the answer interviewers want. The language section below shows exactly what goes wrong in each language.

### Follow-up: digits in forward order

📌 **Interview term: Most significant digit first (forward order)** — 342 stored as 3 → 4 → 2. Column addition must start from the ones digit, which is now at the **end**.

Two standard fixes: [reverse both lists](/interview-question/how-do-you-reverse-a-linked-list), add, and reverse the result; or push each list's digits onto a **stack** and pop them, which hands you the digits ones-first, then build the result by **prepending** each new node so it comes out in forward order. Example 2 does the stack version.

## 4. The Solution in Java

~~~java
static ListNode addTwoNumbers(ListNode l1, ListNode l2) {
    ListNode dummy = new ListNode(0, null);
    ListNode tail = dummy;
    int carry = 0;
    while (l1 != null || l2 != null || carry != 0) {
        int total = carry;
        if (l1 != null) {
            total += l1.val;
            l1 = l1.next;
        }
        if (l2 != null) {
            total += l2.val;
            l2 = l2.next;
        }
        carry = total / 10;                  // int division truncates: 0 or 1
        tail.next = new ListNode(total % 10, null);
        tail = tail.next;
    }
    return dummy.next;
}
~~~

**Why each line is there:**

- \`dummy\` stays on the placeholder, \`tail\` walks the new list; \`dummy.next\` is the answer.
- The condition keeps going on the longer list and for the final carry.
- \`total / 10\` on two \`int\`s is integer division (it truncates), so the carry is exactly 0 or 1; \`total % 10\` is the digit.
- Reassigning the parameters only changes local references; Java passes references by value, so the caller's \`l1\` still points at its head.

### The shortcut, and why it breaks

A \`long\` holds at most \`Long.MAX_VALUE\` = 9223372036854775807 (19 digits). Java integer arithmetic does not throw on overflow, it wraps: in a test run \`Long.MAX_VALUE + 1\` printed \`-9223372036854775808\`. So reading a 20-digit list into a \`long\` gives a silently wrong answer. \`Math.addExact\` would throw \`ArithmeticException\` instead of wrapping, and \`java.math.BigInteger\` has arbitrary precision, but either way you are no longer solving the list problem.

### Forward order with stacks

~~~java
static ListNode addForward(ListNode l1, ListNode l2) {
    Deque<Integer> s1 = new ArrayDeque<>(), s2 = new ArrayDeque<>();
    for (; l1 != null; l1 = l1.next) s1.push(l1.val);
    for (; l2 != null; l2 = l2.next) s2.push(l2.val);
    ListNode head = null;
    int carry = 0;
    while (!s1.isEmpty() || !s2.isEmpty() || carry != 0) {
        int total = carry + (s1.isEmpty() ? 0 : s1.pop()) + (s2.isEmpty() ? 0 : s2.pop());
        carry = total / 10;
        head = new ListNode(total % 10, head);   // prepend, so the result is forward order
    }
    return head;
}
~~~

\`ArrayDeque.push\` and \`pop\` work at the front, giving stack (LIFO) order. The \`Deque\` Javadoc says the interface "should be used in preference to the legacy Stack class" ([Deque, Java SE 21](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Deque.html)). Popping an empty \`ArrayDeque\` throws \`NoSuchElementException\`, hence the \`isEmpty()\` checks.

## 5. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Digit-by-digit addition with a carry (ones digit first)** prints:

~~~text
[2, 4, 3] + [5, 6, 4] = [7, 0, 8] (342 + 465 = 807)
[0] + [0] = [0] (0 + 0 = 0)
[9, 9, 9, 9, 9, 9, 9] + [9, 9, 9, 9] = [8, 9, 9, 9, 0, 0, 0, 1] (9999999 + 9999 = 10009998)
[5] + [5] = [0, 1] (5 + 5 = 10)
[1, 8] + [0] = [1, 8] (81 + 0 = 81)
[] + [] = [] (0 + 0 = 0)
~~~

**Example 2 — Forward-order digits with stacks, including 30-digit numbers** prints:

~~~text
7243 + 564 = 7807
0 + 0 = 0
999 + 1 = 1000
123456789012345678901234567890 + 987654321098765432109876543210 = 1111111110111111111011111111100
999999999999999999999999999999 + 1 = 1000000000000000000000000000000
~~~

**Reading the output:** Example 1 shows the cases that break naive code: \`[5] + [5]\` needs the extra carry node (\`[0, 1]\`), the seven-nines plus four-nines case carries through every position into a new eighth digit, lists of different lengths keep going on the longer one, and two empty lists give an empty result (shown as the number 0). The readable numbers in brackets are made by reading the digits backwards as text, not by converting to an integer. Example 2 adds forward-order lists with stacks, including two 30-digit numbers and a 30-digit run of nines plus one, both far past what a 64-bit integer can hold.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Digit by digit with a carry | O(max(m, n)) | O(1) besides the output | one pass over the longer list; the result has at most max(m, n) + 1 nodes |
| Convert to built-in integers | O(m + n) | O(1) | but overflows for long inputs (see below) |
| Forward order with stacks | O(m + n) | O(m + n) | both lists are copied onto stacks |
| Forward order by reversing | O(m + n) | O(1) besides the output | three reversals and one addition pass, but the inputs are modified (or must be reversed back) |

m and n are the list lengths. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Different lengths:** treat a missing digit as 0 and keep looping on the longer list.
- **Final carry:** \`[5] + [5]\` and \`[9, 9] + [1]\` both end with a carry that needs a new node.
- **Zero:** \`[0] + [0]\` is \`[0]\`; there is no carry and exactly one node is built.
- **Empty lists:** not a valid number in the classic problem, but the loop returns an empty list without crashing.
- **Very long numbers:** the digit loop has no size limit; only the shortcut does.

## Common Pitfalls

- **Forgetting the final carry.** Without \`|| carry != 0\`, 5 + 5 returns \`[0]\`.
- **Converting to \`long\`.** Silently wraps past 19 digits; there is no exception unless you use \`Math.addExact\`.
- **Popping an empty \`ArrayDeque\`.** Throws \`NoSuchElementException\`; check \`isEmpty()\` first.
- **Comparing \`Integer\` digits with \`==\`.** If you compare popped \`Integer\` values, use \`equals\` or unbox: \`==\` compares references outside the -128 to 127 cache.
- **Returning \`dummy\`.** The answer would start with a spurious 0.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Paper addition: digits come ones-first, so walk both lists together carrying into the next node.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The loop:</strong> <span style="color:#f0e2c8;">While <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">l1 != null || l2 != null || carry != 0</code>: add the carry and any present digits; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">carry = total / 10</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Build:</strong> <span style="color:#f0e2c8;">A dummy head and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail.next = new ListNode(total % 10, null)</code>; return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dummy.next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(max(m, n)) time; at most max(m, n) + 1 result nodes; inputs untouched.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> overflow wraps silently (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Long.MAX_VALUE + 1</code> is negative); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInteger</code> works but avoids the list problem.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">BigInteger</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It would work, but you would still have to walk the lists to build it, and the interviewer wants the carry logic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the digits are stored most significant first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push both onto <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> stacks, pop to add ones-first, prepend each new node. Or reverse both lists, add, reverse the result.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the carry exceed 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: the largest column is 9 + 9 + 1 = 19.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ArrayDeque</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Stack</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Stack</code> extends the synchronised <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vector</code>, and its own Javadoc points to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deque</code> implementations instead; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> is the usual one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Recursive version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recurse on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(l1, l2, carry)</code> returning a node whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next</code> is the recursive result; O(max(m, n)) stack, so very long numbers risk <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Least significant digit first** | the head holds the ones digit; 342 is 2, 4, 3 |
| **Most significant digit first** | the head holds the highest digit; 342 is 3, 4, 2 |
| **Carry** | the tens part of a column sum, added to the next column |
| **Dummy head** | a placeholder node before the list being built |
| **Integer overflow (Java)** | arithmetic past the type range wraps around silently |
| **\`ArrayDeque\`** | resizable array deque; the recommended stack and queue in Java |

---
**Conclusion:** Adding two numbers stored as linked lists is paper addition: walk both lists together, add the digits and the carry, append \`total mod 10\`, keep \`total div 10\` as the next carry, and keep going while either list or the carry remains. It is O(max(m, n)) time, needs only a dummy head and a tail pointer, and, unlike converting to a built-in integer, works for numbers of any length. In Java, integer division gives the carry, the \`|| carry != 0\` condition gives the final node, and you should be ready to explain why a \`long\` shortcut silently wraps.`,
        examples: [
          { label: `Digit-by-digit addition with a carry (ones digit first)`, code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val, ListNode next) { this.val = val; this.next = next; }
    }

    static ListNode build(int[] digits) {
        ListNode head = null;
        for (int i = digits.length - 1; i >= 0; i--) head = new ListNode(digits[i], head);
        return head;
    }

    static List<Integer> toList(ListNode head) {
        List<Integer> out = new ArrayList<>();
        for (ListNode n = head; n != null; n = n.next) out.add(n.val);
        return out;
    }

    // Digits are stored ones-first; returns the sum as a new list, ones-first.
    static ListNode addTwoNumbers(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0, null);
        ListNode tail = dummy;
        int carry = 0;
        while (l1 != null || l2 != null || carry != 0) {
            int total = carry;
            if (l1 != null) {
                total += l1.val;
                l1 = l1.next;
            }
            if (l2 != null) {
                total += l2.val;
                l2 = l2.next;
            }
            carry = total / 10;                  // int division truncates: 0 or 1
            tail.next = new ListNode(total % 10, null);
            tail = tail.next;
        }
        return dummy.next;
    }

    // Read ones-first digits as text, without converting to a number.
    static String asNumber(List<Integer> digits) {
        StringBuilder sb = new StringBuilder();
        for (int i = digits.size() - 1; i >= 0; i--) sb.append(digits.get(i));
        return sb.length() == 0 ? "0" : sb.toString();
    }

    static String show(int[] a, int[] b) {
        List<Integer> la = toList(build(a)), lb = toList(build(b));
        List<Integer> s = toList(addTwoNumbers(build(a), build(b)));
        return Arrays.toString(a) + " + " + Arrays.toString(b) + " = " + s
            + " (" + asNumber(la) + " + " + asNumber(lb) + " = " + asNumber(s) + ")";
    }

    public static void main(String[] args) {
        System.out.println(show(new int[]{2, 4, 3}, new int[]{5, 6, 4}));
        System.out.println(show(new int[]{0}, new int[]{0}));
        System.out.println(show(new int[]{9, 9, 9, 9, 9, 9, 9}, new int[]{9, 9, 9, 9}));
        System.out.println(show(new int[]{5}, new int[]{5}));
        System.out.println(show(new int[]{1, 8}, new int[]{0}));
        System.out.println(show(new int[]{}, new int[]{}));
    }
}
` },
          { label: `Forward-order digits with stacks, including 30-digit numbers`, code: `import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int val, ListNode next) { this.val = val; this.next = next; }
    }

    static ListNode build(int[] digits) {
        ListNode head = null;
        for (int i = digits.length - 1; i >= 0; i--) head = new ListNode(digits[i], head);
        return head;
    }

    static List<Integer> toList(ListNode head) {
        List<Integer> out = new ArrayList<>();
        for (ListNode n = head; n != null; n = n.next) out.add(n.val);
        return out;
    }

    // Digits are stored ones-first; returns the sum as a new list, ones-first.
    static ListNode addTwoNumbers(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0, null);
        ListNode tail = dummy;
        int carry = 0;
        while (l1 != null || l2 != null || carry != 0) {
            int total = carry;
            if (l1 != null) {
                total += l1.val;
                l1 = l1.next;
            }
            if (l2 != null) {
                total += l2.val;
                l2 = l2.next;
            }
            carry = total / 10;                  // int division truncates: 0 or 1
            tail.next = new ListNode(total % 10, null);
            tail = tail.next;
        }
        return dummy.next;
    }

    // Digits stored most significant first: use stacks, prepend each new node.
    static ListNode addForward(ListNode l1, ListNode l2) {
        Deque<Integer> s1 = new ArrayDeque<>(), s2 = new ArrayDeque<>();
        for (; l1 != null; l1 = l1.next) s1.push(l1.val);
        for (; l2 != null; l2 = l2.next) s2.push(l2.val);
        ListNode head = null;
        int carry = 0;
        while (!s1.isEmpty() || !s2.isEmpty() || carry != 0) {
            int total = carry + (s1.isEmpty() ? 0 : s1.pop()) + (s2.isEmpty() ? 0 : s2.pop());
            carry = total / 10;
            head = new ListNode(total % 10, head);   // prepend, so the result is forward order
        }
        return head;
    }

    static int[] digitsOf(String text) {
        int[] d = new int[text.length()];
        for (int i = 0; i < d.length; i++) d[i] = text.charAt(i) - '0';
        return d;
    }

    static String show(String a, String b) {
        StringBuilder sb = new StringBuilder();
        for (int d : toList(addForward(build(digitsOf(a)), build(digitsOf(b))))) sb.append(d);
        return a + " + " + b + " = " + sb;
    }

    public static void main(String[] args) {
        System.out.println(show("7243", "564"));
        System.out.println(show("0", "0"));
        System.out.println(show("999", "1"));
        System.out.println(show("123456789012345678901234567890", "987654321098765432109876543210"));
        System.out.println(show("999999999999999999999999999999", "1"));
    }
}
` },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Two non-negative integers are stored as linked lists, one digit per node, ones digit first: 342 is 2 → 4 → 3. Return their sum as a new linked list in the same format, without leaking memory. Please write it in C++."

**What a strong answer should cover:**
- Column addition: walk both lists together, \`total = carry + x + y\`, append \`total % 10\`, carry \`total / 10\`.
- Loop while either list **or the carry** remains, treating a missing digit as 0; a dummy head (on the stack) avoids a special case for the first node.
- O(max(m, n)) time, output of at most max(m, n) + 1 nodes, which the caller owns.
- The forward-order follow-up: \`std::stack\` plus prepending.
- C++ specifics: \`unsigned long long\` wraps past 20 digits and signed overflow is undefined behaviour, so converting is wrong; \`std::stack::pop()\` returns \`void\`, read \`top()\` first.

**Clarifying questions expected:**
- "Ones digit first? Can the lists have different lengths?"
- "Who frees the result list?"

**Code / implementation expected:** Yes — \`ListNode* addTwoNumbers(ListNode* l1, ListNode* l2)\` in C++, building a new list.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a linked list node is; everything else is explained
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All code is C++, and every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Remember adding numbers on paper in primary school? You line the numbers up on the right, add the ones column, write down the last digit and **carry** the 1 into the next column, then move left. You never needed to know how big the numbers were; you just worked column by column until both numbers and the carry ran out.

Now imagine the digits come to you on a conveyor belt, one at a time, **ones digit first**. 342 arrives as 2, then 4, then 3. Another belt brings 465 as 5, 6, 4. Your job is to send the answer, 807, out on a third belt in the same order: 7, 0, 8. That is exactly the paper method, and the belts are linked lists.

This is a classic interview problem because it looks like a number problem but is really a **list-building** problem: walk two lists at different lengths, keep one small piece of state (the carry), and build a new list as you go. It also has a trap: the "just convert to a number, add, convert back" shortcut breaks for long inputs in most languages, and the interviewer will ask you why.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the digits stored least significant first? | The classic version is reversed (ones digit at the head), which matches column addition. Forward order is a different follow-up. |
| Can the lists have different lengths? | Almost always yes; the loop must keep going while either list has digits. |
| Are there leading zeros, or negative numbers? | Usually no to both; zero itself is the single-node list [0]. |
| May I modify the input lists? | The standard answer builds a new list and leaves the inputs alone. |
| How long can the numbers be? | If they can exceed 64 bits, converting to a built-in integer type overflows or loses precision. |

## 3. The Core Idea

📌 **Interview term: Least significant digit first (reverse order)** — the list's head holds the ones digit, the next node the tens, and so on. 342 is stored as 2 → 4 → 3.

📌 **Interview term: Carry** — when a column adds up to 10 or more, the tens part (always 0 or 1 here, since 9 + 9 + 1 = 19) moves into the next column.

<svg class="iq-diagram" width="100%" viewBox="0 0 560 290" role="img" aria-label="Column addition of 342 and 465 stored least significant digit first: 2 plus 5 is 7, 4 plus 6 is 10 so write 0 carry 1, 3 plus 4 plus 1 is 8">
  <defs>
    <marker id="la1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="58" text-anchor="start">l1</text>
  <rect class="d-box" x="100" y="30" width="60" height="46" rx="8"/>
  <text class="d-text" x="130" y="59" text-anchor="middle">2</text>
  <rect class="d-box" x="230" y="30" width="60" height="46" rx="8"/>
  <text class="d-text" x="260" y="59" text-anchor="middle">4</text>
  <rect class="d-box" x="360" y="30" width="60" height="46" rx="8"/>
  <text class="d-text" x="390" y="59" text-anchor="middle">3</text>
  <path class="d-edge" d="M 162 53 L 224 53" fill="none" marker-end="url(#la1-arrow)"/>
  <path class="d-edge" d="M 292 53 L 354 53" fill="none" marker-end="url(#la1-arrow)"/>
  <text class="d-text" x="20" y="138" text-anchor="start">l2</text>
  <rect class="d-box" x="100" y="110" width="60" height="46" rx="8"/>
  <text class="d-text" x="130" y="139" text-anchor="middle">5</text>
  <rect class="d-box" x="230" y="110" width="60" height="46" rx="8"/>
  <text class="d-text" x="260" y="139" text-anchor="middle">6</text>
  <rect class="d-box" x="360" y="110" width="60" height="46" rx="8"/>
  <text class="d-text" x="390" y="139" text-anchor="middle">4</text>
  <path class="d-edge" d="M 162 133 L 224 133" fill="none" marker-end="url(#la1-arrow)"/>
  <path class="d-edge" d="M 292 133 L 354 133" fill="none" marker-end="url(#la1-arrow)"/>
  <text class="d-text d-accent" x="20" y="248" text-anchor="start">sum</text>
  <rect class="d-box-accent" x="100" y="220" width="60" height="46" rx="8"/>
  <text class="d-text" x="130" y="249" text-anchor="middle">7</text>
  <rect class="d-box-accent" x="230" y="220" width="60" height="46" rx="8"/>
  <text class="d-text" x="260" y="249" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="360" y="220" width="60" height="46" rx="8"/>
  <text class="d-text" x="390" y="249" text-anchor="middle">8</text>
  <path class="d-edge" d="M 162 243 L 224 243" fill="none" marker-end="url(#la1-arrow)"/>
  <path class="d-edge" d="M 292 243 L 354 243" fill="none" marker-end="url(#la1-arrow)"/>
  <text class="d-text d-accent" x="325" y="194" text-anchor="middle">carry 1</text>
  <text class="d-sub" x="490" y="58" text-anchor="middle">342</text>
  <text class="d-sub" x="490" y="138" text-anchor="middle">465</text>
  <text class="d-sub" x="490" y="248" text-anchor="middle">807</text>
</svg>

Column by column: 2 + 5 = 7; 4 + 6 = 10, write 0 and carry 1; 3 + 4 + 1 = 8. The result list is 7 → 0 → 8, which is 807.

### The loop

<svg class="iq-diagram" width="100%" viewBox="0 0 660 220" role="img" aria-label="Each step: total is carry plus the two digits, the new node gets total mod 10, the carry becomes total div 10, repeat while either list or the carry remains">
  <defs>
    <marker id="la2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="180" height="64" rx="8"/>
  <text class="d-text" x="110" y="68" text-anchor="middle">total</text>
  <text class="d-sub" x="110" y="90" text-anchor="middle">carry + x + y</text>
  <path class="d-edge" d="M 204 72 L 236 72" fill="none" marker-end="url(#la2-arrow)"/>
  <rect class="d-box-accent" x="240" y="40" width="180" height="64" rx="8"/>
  <text class="d-text" x="330" y="68" text-anchor="middle">new node</text>
  <text class="d-sub" x="330" y="90" text-anchor="middle">total mod 10</text>
  <path class="d-edge" d="M 424 72 L 456 72" fill="none" marker-end="url(#la2-arrow)"/>
  <rect class="d-box" x="460" y="40" width="180" height="64" rx="8"/>
  <text class="d-text" x="550" y="68" text-anchor="middle">carry</text>
  <text class="d-sub" x="550" y="90" text-anchor="middle">total div 10</text>
  <path class="d-edge-dashed" d="M 550 108 C 550 180, 110 180, 110 112" fill="none" marker-end="url(#la2-arrow)"/>
  <text class="d-sub" x="330" y="196" text-anchor="middle">while l1, l2 or carry</text>
</svg>

1. Start a **dummy node** so the result list has a fixed place to hang its first digit, and keep a \`tail\` pointer to the last node built.
2. While **either list still has digits or the carry is not zero**: add the carry and whatever digits are present (a missing digit counts as 0).
3. Append a node holding \`total mod 10\`; set \`carry = total div 10\`; advance each list that still has nodes.
4. Return \`dummy.next\`.

📌 **Interview term: Dummy head (sentinel)** — a placeholder node in front of the list you are building, so appending the first node is no different from appending any other. The same trick appears in [merging two sorted linked lists](/interview-question/how-do-you-merge-two-sorted-linked-lists).

The \`or carry\` part of the loop condition is the line most people forget: 5 + 5 = 10 needs a **new final node** for the carried 1, giving 0 → 1.

### Why not convert to a number?

The shortcut "read each list into an integer, add, write the digits back" is O(n) too, but the numbers can have hundreds of digits. Built-in fixed-width integers overflow (or, in JavaScript, silently lose precision), so the digit-by-digit loop is the answer interviewers want. The language section below shows exactly what goes wrong in each language.

### Follow-up: digits in forward order

📌 **Interview term: Most significant digit first (forward order)** — 342 stored as 3 → 4 → 2. Column addition must start from the ones digit, which is now at the **end**.

Two standard fixes: [reverse both lists](/interview-question/how-do-you-reverse-a-linked-list), add, and reverse the result; or push each list's digits onto a **stack** and pop them, which hands you the digits ones-first, then build the result by **prepending** each new node so it comes out in forward order. Example 2 does the stack version.

## 4. The Solution in C++

~~~cpp
ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
    ListNode dummy(0, nullptr);                 // on the stack: nothing to free
    ListNode* tail = &dummy;
    int carry = 0;
    while (l1 != nullptr || l2 != nullptr || carry != 0) {
        int total = carry;
        if (l1 != nullptr) {
            total += l1->val;
            l1 = l1->next;
        }
        if (l2 != nullptr) {
            total += l2->val;
            l2 = l2->next;
        }
        carry = total / 10;
        tail->next = new ListNode(total % 10, nullptr);
        tail = tail->next;
    }
    return dummy.next;                          // the caller owns the new list
}
~~~

**Why each line is there:**

- \`ListNode dummy(0, nullptr)\` lives on the stack and is destroyed when the function returns; only the nodes after it are heap-allocated. Returning \`dummy.next\` copies the pointer out, which is safe.
- The condition keeps going on the longer list and for the final carry.
- \`total / 10\` on \`int\`s truncates, so the carry is 0 or 1; \`total % 10\` is the digit.
- Every result node comes from \`new\`, so the caller must free the list (the examples call \`freeList\` on the inputs and the result).

### The shortcut, and why it breaks

The widest standard integer type, \`unsigned long long\`, holds 18446744073709551615 (20 digits). Unsigned arithmetic wraps modulo 2^64: in a test run \`ULLONG_MAX + 1\` printed \`0\`. Signed overflow (for \`long long\`) is worse, it is undefined behaviour, so the compiler is allowed to assume it never happens. Converting the lists to integers is therefore wrong for long inputs, and C++ has no built-in big-integer type.

### Forward order with stacks

~~~cpp
ListNode* addForward(ListNode* l1, ListNode* l2) {
    std::stack<int> s1, s2;
    for (; l1 != nullptr; l1 = l1->next) s1.push(l1->val);
    for (; l2 != nullptr; l2 = l2->next) s2.push(l2->val);
    ListNode* head = nullptr;
    int carry = 0;
    while (!s1.empty() || !s2.empty() || carry != 0) {
        int total = carry;
        if (!s1.empty()) { total += s1.top(); s1.pop(); }   // pop() returns void in C++
        if (!s2.empty()) { total += s2.top(); s2.pop(); }
        carry = total / 10;
        head = new ListNode(total % 10, head);               // prepend, so the result is forward order
    }
    return head;
}
~~~

\`std::stack\` is an adapter (over \`std::deque\` by default) whose \`pop()\` removes the top element but returns nothing, so you read \`top()\` first. Calling \`top()\` or \`pop()\` on an empty stack is undefined behaviour, hence the \`empty()\` checks.

## 5. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`. The same programs were also written in the three other languages on this page and printed exactly the same lines.

**Example 1 — Digit-by-digit addition with a carry (ones digit first)** prints:

~~~text
[2, 4, 3] + [5, 6, 4] = [7, 0, 8] (342 + 465 = 807)
[0] + [0] = [0] (0 + 0 = 0)
[9, 9, 9, 9, 9, 9, 9] + [9, 9, 9, 9] = [8, 9, 9, 9, 0, 0, 0, 1] (9999999 + 9999 = 10009998)
[5] + [5] = [0, 1] (5 + 5 = 10)
[1, 8] + [0] = [1, 8] (81 + 0 = 81)
[] + [] = [] (0 + 0 = 0)
~~~

**Example 2 — Forward-order digits with stacks, including 30-digit numbers** prints:

~~~text
7243 + 564 = 7807
0 + 0 = 0
999 + 1 = 1000
123456789012345678901234567890 + 987654321098765432109876543210 = 1111111110111111111011111111100
999999999999999999999999999999 + 1 = 1000000000000000000000000000000
~~~

**Reading the output:** Example 1 shows the cases that break naive code: \`[5] + [5]\` needs the extra carry node (\`[0, 1]\`), the seven-nines plus four-nines case carries through every position into a new eighth digit, lists of different lengths keep going on the longer one, and two empty lists give an empty result (shown as the number 0). The readable numbers in brackets are made by reading the digits backwards as text, not by converting to an integer. Example 2 adds forward-order lists with stacks, including two 30-digit numbers and a 30-digit run of nines plus one, both far past what a 64-bit integer can hold.

## 6. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Digit by digit with a carry | O(max(m, n)) | O(1) besides the output | one pass over the longer list; the result has at most max(m, n) + 1 nodes |
| Convert to built-in integers | O(m + n) | O(1) | but overflows for long inputs (see below) |
| Forward order with stacks | O(m + n) | O(m + n) | both lists are copied onto stacks |
| Forward order by reversing | O(m + n) | O(1) besides the output | three reversals and one addition pass, but the inputs are modified (or must be reversed back) |

m and n are the list lengths. See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read the table.

## 7. Edge Cases

- **Different lengths:** treat a missing digit as 0 and keep looping on the longer list.
- **Final carry:** \`[5] + [5]\` and \`[9, 9] + [1]\` both end with a carry that needs a new node.
- **Zero:** \`[0] + [0]\` is \`[0]\`; there is no carry and exactly one node is built.
- **Empty lists:** not a valid number in the classic problem, but the loop returns an empty list without crashing.
- **Very long numbers:** the digit loop has no size limit; only the shortcut does.

## Common Pitfalls

- **Forgetting the final carry.** Without \`|| carry != 0\`, 5 + 5 returns \`[0]\`.
- **Converting to \`unsigned long long\`.** Wraps silently past 20 digits; \`long long\` overflow is undefined behaviour.
- **\`int x = s1.pop();\`** does not compile: \`pop()\` returns \`void\`. Read \`top()\`, then \`pop()\`.
- **Heap-allocating the dummy.** \`new ListNode(0, nullptr)\` as the dummy leaks one node per call unless you remember to delete it; a stack dummy cannot leak.
- **Not documenting ownership.** The caller receives a heap-allocated list and must free it; say so in the interview.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Paper addition: digits come ones-first, so walk both lists together carrying into the next node.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The loop:</strong> <span style="color:#f0e2c8;">While <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">l1 || l2 || carry</code>: add the carry and any present digits; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">carry = total / 10</code>, digit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total % 10</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Build:</strong> <span style="color:#f0e2c8;">A stack <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ListNode dummy</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tail = &amp;dummy</code>; append with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code>; return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dummy.next</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(max(m, n)) time; at most max(m, n) + 1 result nodes, owned by the caller.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unsigned long long</code> wraps and signed overflow is undefined behaviour, so never convert; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack::pop()</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not convert to an integer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The widest built-in type holds 20 digits; longer inputs wrap (unsigned) or are undefined behaviour (signed). C++ has no standard big-integer type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the digits are stored most significant first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push both lists onto <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack&lt;int&gt;</code>, pop to add ones-first, prepend each new node. Or reverse both lists, add, reverse the result.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the carry exceed 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: the largest column is 9 + 9 + 1 = 19.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you avoid manual <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">delete</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::unique_ptr&lt;ListNode&gt; next</code> so the list frees itself; note that destroying a very long chain recursively can overflow the stack, so free long lists iteratively.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you reuse the input nodes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, write sums into the longer list and append one node for a final carry, saving allocations; but it changes the input and complicates ownership, so ask first.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Least significant digit first** | the head holds the ones digit; 342 is 2, 4, 3 |
| **Most significant digit first** | the head holds the highest digit; 342 is 3, 4, 2 |
| **Carry** | the tens part of a column sum, added to the next column |
| **Dummy head** | a placeholder node before the list being built |
| **Unsigned wraparound** | unsigned integers in C++ wrap modulo 2^N on overflow, which is well defined |
| **\`std::stack\`** | container adapter with \`push\`, \`top\` and a \`pop\` that returns \`void\` |

---
**Conclusion:** Adding two numbers stored as linked lists is paper addition: walk both lists together, add the digits and the carry, append \`total mod 10\`, keep \`total div 10\` as the next carry, and keep going while either list or the carry remains. It is O(max(m, n)) time, needs only a dummy head and a tail pointer, and, unlike converting to a built-in integer, works for numbers of any length. In C++, a stack dummy, the \`|| carry != 0\` condition and clear ownership of the new list are the whole answer; be ready to explain why fixed-width integers cannot replace it.`,
        examples: [
          { label: `Digit-by-digit addition with a carry (ones digit first)`, code: `#include <iostream>
#include <string>
#include <vector>

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v, ListNode* n) : val(v), next(n) {}
};

ListNode* build(const std::vector<int>& digits) {
    ListNode* head = nullptr;
    for (auto it = digits.rbegin(); it != digits.rend(); ++it) head = new ListNode(*it, head);
    return head;
}

std::vector<int> toVector(ListNode* head) {
    std::vector<int> out;
    for (ListNode* n = head; n != nullptr; n = n->next) out.push_back(n->val);
    return out;
}

void freeList(ListNode* head) {
    while (head != nullptr) {
        ListNode* next = head->next;
        delete head;
        head = next;
    }
}

std::string fmt(const std::vector<int>& values) {
    std::string s = "[";
    for (std::size_t i = 0; i < values.size(); ++i) s += (i ? ", " : "") + std::to_string(values[i]);
    return s + "]";
}

// Digits are stored ones-first; returns the sum as a new list, ones-first.
ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
    ListNode dummy(0, nullptr);                 // on the stack: nothing to free
    ListNode* tail = &dummy;
    int carry = 0;
    while (l1 != nullptr || l2 != nullptr || carry != 0) {
        int total = carry;
        if (l1 != nullptr) {
            total += l1->val;
            l1 = l1->next;
        }
        if (l2 != nullptr) {
            total += l2->val;
            l2 = l2->next;
        }
        carry = total / 10;
        tail->next = new ListNode(total % 10, nullptr);
        tail = tail->next;
    }
    return dummy.next;                          // the caller owns the new list
}

// Read ones-first digits as text, without converting to an integer.
std::string asNumber(const std::vector<int>& digits) {
    std::string s;
    for (auto it = digits.rbegin(); it != digits.rend(); ++it) s += std::to_string(*it);
    return s.empty() ? "0" : s;
}

std::string show(const std::vector<int>& a, const std::vector<int>& b) {
    ListNode* l1 = build(a);
    ListNode* l2 = build(b);
    ListNode* sum = addTwoNumbers(l1, l2);
    std::vector<int> s = toVector(sum);
    freeList(l1);
    freeList(l2);
    freeList(sum);
    return fmt(a) + " + " + fmt(b) + " = " + fmt(s) +
           " (" + asNumber(a) + " + " + asNumber(b) + " = " + asNumber(s) + ")";
}

int main() {
    std::cout << show({2, 4, 3}, {5, 6, 4}) << "\\n";
    std::cout << show({0}, {0}) << "\\n";
    std::cout << show({9, 9, 9, 9, 9, 9, 9}, {9, 9, 9, 9}) << "\\n";
    std::cout << show({5}, {5}) << "\\n";
    std::cout << show({1, 8}, {0}) << "\\n";
    std::cout << show({}, {}) << "\\n";
}
` },
          { label: `Forward-order digits with stacks, including 30-digit numbers`, code: `#include <iostream>
#include <stack>
#include <string>
#include <vector>

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v, ListNode* n) : val(v), next(n) {}
};

ListNode* build(const std::vector<int>& digits) {
    ListNode* head = nullptr;
    for (auto it = digits.rbegin(); it != digits.rend(); ++it) head = new ListNode(*it, head);
    return head;
}

std::vector<int> toVector(ListNode* head) {
    std::vector<int> out;
    for (ListNode* n = head; n != nullptr; n = n->next) out.push_back(n->val);
    return out;
}

void freeList(ListNode* head) {
    while (head != nullptr) {
        ListNode* next = head->next;
        delete head;
        head = next;
    }
}

std::string fmt(const std::vector<int>& values) {
    std::string s = "[";
    for (std::size_t i = 0; i < values.size(); ++i) s += (i ? ", " : "") + std::to_string(values[i]);
    return s + "]";
}

// Digits are stored ones-first; returns the sum as a new list, ones-first.
ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
    ListNode dummy(0, nullptr);                 // on the stack: nothing to free
    ListNode* tail = &dummy;
    int carry = 0;
    while (l1 != nullptr || l2 != nullptr || carry != 0) {
        int total = carry;
        if (l1 != nullptr) {
            total += l1->val;
            l1 = l1->next;
        }
        if (l2 != nullptr) {
            total += l2->val;
            l2 = l2->next;
        }
        carry = total / 10;
        tail->next = new ListNode(total % 10, nullptr);
        tail = tail->next;
    }
    return dummy.next;                          // the caller owns the new list
}

// Digits stored most significant first: use stacks, prepend each new node.
ListNode* addForward(ListNode* l1, ListNode* l2) {
    std::stack<int> s1, s2;
    for (; l1 != nullptr; l1 = l1->next) s1.push(l1->val);
    for (; l2 != nullptr; l2 = l2->next) s2.push(l2->val);
    ListNode* head = nullptr;
    int carry = 0;
    while (!s1.empty() || !s2.empty() || carry != 0) {
        int total = carry;
        if (!s1.empty()) { total += s1.top(); s1.pop(); }   // pop() returns void in C++
        if (!s2.empty()) { total += s2.top(); s2.pop(); }
        carry = total / 10;
        head = new ListNode(total % 10, head);               // prepend, so the result is forward order
    }
    return head;
}

std::vector<int> digitsOf(const std::string& text) {
    std::vector<int> d;
    for (char ch : text) d.push_back(ch - '0');
    return d;
}

std::string show(const std::string& a, const std::string& b) {
    ListNode* l1 = build(digitsOf(a));
    ListNode* l2 = build(digitsOf(b));
    ListNode* sum = addForward(l1, l2);
    std::string s;
    for (int d : toVector(sum)) s += char('0' + d);
    freeList(l1);
    freeList(l2);
    freeList(sum);
    return a + " + " + b + " = " + s;
}

int main() {
    std::cout << show("7243", "564") << "\\n";
    std::cout << show("0", "0") << "\\n";
    std::cout << show("999", "1") << "\\n";
    std::cout << show("123456789012345678901234567890", "987654321098765432109876543210") << "\\n";
    std::cout << show("999999999999999999999999999999", "1") << "\\n";
}
` },
        ],
      },
    },
  },
];

export default augments;
