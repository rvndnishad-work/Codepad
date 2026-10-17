/**
 * DSA ULTRA — batch 31: backtracking — what backtracking is, generating all subsets, generating
 * all permutations, and Combination Sum. One complete answer per language (Python, JavaScript,
 * Java, C++). Every example was run with python3 / node / javac+java / g++ -std=c++17 by
 * scripts/verify-dsa-examples.ts and the quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  {
    title: "What is backtracking?",
    difficulty: "medium",
    seoDescription: "Backtracking explained for beginners: choose, explore, un-choose, pruning and the state-space tree, with verified Python, JavaScript, Java and C++ code.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Explain what backtracking is, how it differs from plain brute force, and show me the pattern on a small problem in Python."

**What a strong answer should cover:**
- The idea: build a solution one decision at a time, and undo the last decision when it cannot lead to an answer, then try the next option.
- The three-step pattern choose / explore / un-choose, and the base case that records a complete solution.
- Pruning: checking constraints *before* recursing, and why it is the difference between backtracking and brute force.
- The state-space tree picture, and complexity as (number of nodes) × (work per node), usually exponential; space is the recursion depth.
- Python details: one shared \`list\` as the path with \`append\`/\`pop\`, recording a copy (\`path[:]\` or \`"".join(path)\`), and the default recursion limit of 1000 frames that caps the depth.

**Code / implementation expected:** Optional — a short recursive generator in Python (for example generate parentheses) that shows choose / explore / un-choose and one pruning rule.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a function call and recursion are  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are in a hedge maze with a piece of chalk. At every fork you pick a path and walk on. When you hit a dead end you do not teleport back to the entrance — you walk back to the **last fork** where an untried path is left, chalk off the one you just tried, and take the next. Eventually you have either found the exit or tried everything.

Now imagine some paths have a sign at their entrance: *no exit this way*. You never even walk down those. You still search the whole maze in principle, but you skip whole regions of it without stepping in.

That is backtracking. Walking forward is **choosing**, walking back to the fork is **un-choosing**, and the signs are **pruning**. Many interview problems — every subset, every permutation, every way to hit a target sum, placing queens on a board — are mazes like this, where each fork is a decision.

## 2. The Idea in Plain Words

A backtracking algorithm builds an answer piece by piece. At each step it looks at the choices it may make next, makes one, and calls itself to handle the rest. When that call returns — either because it recorded a finished answer or because it got stuck — the algorithm **undoes** the choice so that the next choice starts from exactly the same state.

📌 **Interview term: Backtracking** — a search that builds candidate solutions one decision at a time and abandons (undoes) a partial candidate as soon as it cannot be completed into a valid solution.

📌 **Interview term: Partial solution** — the decisions made so far (here, the characters placed so far). It lives in one shared variable that grows and shrinks as the search moves.

📌 **Interview term: Choose / explore / un-choose** — the three-line heart of every backtracking function: apply a move, recurse, then reverse the move.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="The backtracking loop: choose a move, explore deeper, un-choose the move, then try the next option">
  <defs>
    <marker id="b31q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="105" y="66" text-anchor="middle">1. choose</text>
  <text class="d-sub" x="105" y="88" text-anchor="middle">apply one move</text>
  <rect class="d-box" x="245" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="320" y="66" text-anchor="middle">2. explore</text>
  <text class="d-sub" x="320" y="88" text-anchor="middle">recurse deeper</text>
  <rect class="d-box" x="460" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="535" y="66" text-anchor="middle">3. un-choose</text>
  <text class="d-sub" x="535" y="88" text-anchor="middle">undo that move</text>
  <path class="d-edge" d="M 182 70 L 240 70" marker-end="url(#b31q1-arrow)"/>
  <path class="d-edge" d="M 397 70 L 455 70" marker-end="url(#b31q1-arrow)"/>
  <path class="d-edge-accent" d="M 535 102 L 535 160 L 105 160 L 105 106" fill="none" marker-end="url(#b31q1-arrow)"/>
  <text class="d-sub d-accent" x="320" y="186" text-anchor="middle">then try the next option</text>
</svg>

The arrow back from step 3 is the whole trick: after the undo, the state is exactly what it was before step 1, so the loop can try the next option on a clean slate.

Backtracking is recursion in a particular shape, so if base cases are new, read [what recursion and a base case are](/interview-question/what-is-recursion-and-what-is-a-base-case) first.

## 3. A Concrete Problem: Generate Parentheses

To see the idea on something real, take a classic: **list every valid string of n pairs of parentheses.** For n = 2 the answers are \`(())\` and \`()()\`. A string is valid when, reading left to right, you never close more brackets than you have opened, and at the end everything is closed.

Each position is a fork with two options: \`(\` or \`)\`. Drawing every fork gives a tree:

📌 **Interview term: State-space tree** — the tree of all partial solutions: the root is the empty solution, each edge is one decision, and each leaf is a complete candidate. Backtracking is a depth-first walk of this tree that never stores the tree itself.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 400" role="img" aria-label="State space tree for two pairs of parentheses. Dashed branches are pruned and the two leaves are the answers">
  <path class="d-edge" d="M 340 57 L 220 103"/>
  <path class="d-edge-dashed" d="M 340 57 L 500 103"/>
  <path class="d-edge" d="M 220 137 L 120 183"/>
  <path class="d-edge" d="M 220 137 L 340 183"/>
  <path class="d-edge-dashed" d="M 120 217 L 50 263"/>
  <path class="d-edge" d="M 120 217 L 170 263"/>
  <path class="d-edge" d="M 340 217 L 330 263"/>
  <path class="d-edge-dashed" d="M 340 217 L 460 263"/>
  <path class="d-edge-accent" d="M 170 297 L 170 343"/>
  <path class="d-edge-accent" d="M 330 297 L 330 343"/>
  <rect class="d-box" x="305" y="23" width="70" height="34" rx="6"/>
  <text class="d-text" x="340" y="45" text-anchor="middle">start</text>
  <rect class="d-box" x="185" y="103" width="70" height="34" rx="6"/>
  <text class="d-text" x="220" y="125" text-anchor="middle">(</text>
  <rect class="d-box-muted" x="465" y="103" width="70" height="34" rx="6"/>
  <text class="d-text" x="500" y="125" text-anchor="middle">)</text>
  <rect class="d-box" x="85" y="183" width="70" height="34" rx="6"/>
  <text class="d-text" x="120" y="205" text-anchor="middle">((</text>
  <rect class="d-box" x="305" y="183" width="70" height="34" rx="6"/>
  <text class="d-text" x="340" y="205" text-anchor="middle">()</text>
  <rect class="d-box-muted" x="15" y="263" width="70" height="34" rx="6"/>
  <text class="d-text" x="50" y="285" text-anchor="middle">(((</text>
  <rect class="d-box" x="135" y="263" width="70" height="34" rx="6"/>
  <text class="d-text" x="170" y="285" text-anchor="middle">(()</text>
  <rect class="d-box" x="295" y="263" width="70" height="34" rx="6"/>
  <text class="d-text" x="330" y="285" text-anchor="middle">()(</text>
  <rect class="d-box-muted" x="425" y="263" width="70" height="34" rx="6"/>
  <text class="d-text" x="460" y="285" text-anchor="middle">())</text>
  <rect class="d-box-accent" x="135" y="343" width="70" height="34" rx="6"/>
  <text class="d-text" x="170" y="365" text-anchor="middle">(())</text>
  <rect class="d-box-accent" x="295" y="343" width="70" height="34" rx="6"/>
  <text class="d-text" x="330" y="365" text-anchor="middle">()()</text>
  <text class="d-sub" x="560" y="190">dashed: pruned</text>
  <text class="d-sub" x="560" y="220">solid: explored</text>
  <text class="d-sub d-accent" x="560" y="250">accent: recorded</text>
</svg>

Three branches are dashed. \`)\` as the first character can never become valid — nothing is open. \`(((\` has used three opens when only two are allowed. \`())\` closes more than it opened. A backtracking search refuses those moves immediately, so nothing below them is ever generated.

📌 **Interview term: Pruning** — skipping a branch of the state-space tree because a constraint already shows that no complete solution can lie below it.

📌 **Interview term: Constraint check** — the test (here \`opened < n\` and \`closed < opened\`) that decides whether a move is allowed before recursing on it.

## 4. Brute Force First, Then Backtracking

The brute-force version tries both characters at every position, builds all 2^(2n) strings, and checks each one at the end. It already uses choose / explore / un-choose, but it never prunes:

~~~python
def brute_force(n):
    out, calls = [], [0]

    def build(path):
        calls[0] += 1
        if len(path) == 2 * n:
            if is_valid(path):
                out.append("".join(path))
            return
        for ch in "()":
            path.append(ch)      # choose
            build(path)          # explore
            path.pop()           # un-choose

    build([])
    return out, calls[0]
~~~

Backtracking adds two constraint checks *before* each recursive call. A \`(\` is allowed only while fewer than n have been opened; a \`)\` is allowed only while there is something open to close. Every string that survives to full length is valid, so no final check is needed:

~~~python
def backtrack(n):
    out, calls = [], [0]

    def build(path, opened, closed):
        calls[0] += 1
        if len(path) == 2 * n:
            out.append("".join(path))
            return
        if opened < n:                      # constraint 1: at most n "("
            path.append("(")
            build(path, opened + 1, closed)
            path.pop()
        if closed < opened:                 # constraint 2: never close more than opened
            path.append(")")
            build(path, opened, closed + 1)
            path.pop()

    build([], 0, 0)
    return out, calls[0]
~~~

**What to point out in this Python code:**

- \`path\` is one list shared by every call. \`append\` is the *choose*, \`pop\` is the *un-choose*; both are O(1) at the end of a list.
- \`"".join(path)\` turns the list into a new string at the moment we record it, so later changes to \`path\` cannot touch the stored answer.
- \`calls = [0]\` is a one-element list so the nested function can update it; \`nonlocal calls\` would work just as well.
- The recursion depth equals the length of the string, 2n. Python allows about 1000 frames by default (\`sys.getrecursionlimit()\` printed 1000 in our run), so depth is never the problem here; the number of *calls* is.

Python strings are immutable, so you will also see the style \`build(s + "(", ...)\`: every call gets its own new string and there is nothing to undo. That is still backtracking — the undo happens implicitly when the call returns — but it copies the string at every step (O(n) each time). The shared-list style makes the undo visible, which is exactly what interviewers want to see.

Both versions return the same list. The difference is how much of the tree they walk. For n = 4 the run in section 6 counted:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 180" role="img" aria-label="Calls needed for n equal to 4: brute force makes 511 calls, backtracking with pruning makes 64">
  <text class="d-text" x="20" y="62">brute force</text>
  <rect class="d-box-muted" x="160" y="40" width="440" height="36" rx="6"/>
  <text class="d-text" x="380" y="63" text-anchor="middle">511 calls</text>
  <text class="d-text" x="20" y="142">backtracking</text>
  <rect class="d-box-accent" x="160" y="120" width="55" height="36" rx="6"/>
  <text class="d-text" x="270" y="143" text-anchor="middle">64 calls</text>
</svg>

Both bars are drawn to scale and produce the same 14 answers. Brute force makes 511 calls (every node of a full binary tree of depth 8), backtracking makes 64, and the gap widens fast: for n = 8 it is 131,071 calls against 6,917.

## 5. Watching It Move: a Full Trace

Example 2 prints every decision for n = 2, indented by depth, so you can read the state-space tree from top to bottom. Note that every \`choose\` is followed later by an \`undo\` of the same character at the same indentation, and that pruned moves are refused before any recursion happens:

~~~text
choose ( -> (
  choose ( -> ((
    prune ( : already used 2 opens
    choose ) -> (()
      prune ( : already used 2 opens
      choose ) -> (())
        record (())
      undo )   -> (()
    undo )   -> ((
  undo (   -> (
  choose ) -> ()
    choose ( -> ()(
      prune ( : already used 2 opens
      choose ) -> ()()
        record ()()
      undo )   -> ()(
    undo (   -> ()
    prune ) : nothing open to close
  undo )   -> (
undo (   -> (empty)
prune ) : nothing open to close
~~~

Read it like the maze: walk in with \`(\`, \`((\`, get stopped by the *already used 2 opens* sign, take \`)\` instead, record \`(())\`, then walk all the way back to the first fork and try \`()\` next.

## 6. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — all valid parentheses strings, brute force vs backtracking, with call counts** prints:

~~~text
n = 1: 1 strings: ()
  brute force calls 7, backtracking calls 3, same answer: true
n = 2: 2 strings: (()) ()()
  brute force calls 31, backtracking calls 8, same answer: true
n = 3: 5 strings: ((())) (()()) (())() ()(()) ()()()
  brute force calls 127, backtracking calls 22, same answer: true
n = 4: 14 strings: (((()))) ((()())) ((())()) ((()))() (()(())) (()()()) (()())() (())(()) (())()() ()((())) ()(()()) ()(())() ()()(()) ()()()()
  brute force calls 511, backtracking calls 64, same answer: true
n = 8: 1430 strings
  brute force calls 131071, backtracking calls 6917, same answer: true
~~~

**Example 2 — a full choose / explore / un-choose trace for n = 2** prints:

~~~text
choose ( -> (
  choose ( -> ((
    prune ( : already used 2 opens
    choose ) -> (()
      prune ( : already used 2 opens
      choose ) -> (())
        record (())
      undo )   -> (()
    undo )   -> ((
  undo (   -> (
  choose ) -> ()
    choose ( -> ()(
      prune ( : already used 2 opens
      choose ) -> ()()
        record ()()
      undo )   -> ()(
    undo (   -> ()
    prune ) : nothing open to close
  undo )   -> (
undo (   -> (empty)
prune ) : nothing open to close
~~~

## 7. Where Backtracking Shows Up

Almost every "list all" or "find any arrangement that satisfies these rules" problem is backtracking. What changes from problem to problem is only *what a choice is* and *which constraint prunes*:

| Problem | One decision | Pruning rule |
| :--- | :--- | :--- |
| [All subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array) | include the next element or not | none needed: every node is an answer |
| [All permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array) | which unused element goes next | skip elements already used |
| [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem) | which number to add next | stop when the running sum passes the target |
| [N-Queens](/interview-question/how-do-you-solve-the-n-queens-problem) | which column gets the queen in this row | skip columns and diagonals already attacked |
| Generate parentheses (this page) | \`(\` or \`)\` | at most n opens; never close more than opened |

Backtracking is a depth-first search over the state-space tree, which is why its memory is only the current path — see [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs). When the same sub-problem keeps reappearing in different branches, the better tool is [dynamic programming](/interview-question/what-is-dynamic-programming); when one locally best choice is provably safe, it is a [greedy algorithm](/interview-question/what-is-a-greedy-algorithm).

## 8. Complexity

The cost of a backtracking search is **(number of nodes visited) × (work per node)**. The number of nodes is usually exponential, which is unavoidable when the output itself is exponential — you cannot print 1,430 strings in less than 1,430 steps. Pruning shrinks the node count, not the output.

| Version | Calls measured (n = 4 / n = 8) | Time | Extra space | Why |
| :--- | :--- | :--- | :--- | :--- |
| Brute force | 511 / 131,071 | O(2^(2n) · n) | O(n) | every one of the 2^(2n) strings is built and checked in O(n) |
| Backtracking | 64 / 6,917 | O(n · answers) | O(n) | every visited node is a prefix of some valid answer (at most 2n prefixes each), and each leaf costs O(n) to copy |

The extra space in both cases is the recursion depth plus the shared path, 2n — the output list is not counted. How much stack a recursive call uses is covered in [space complexity and recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

📌 **Interview term: Exponential time** — running time that grows like c^n for some constant c > 1; typical for searches that must list exponentially many answers.

## 9. Edge Cases

- **The base case comes first.** Check "is the path complete?" before looping over choices, or you will try to extend a finished answer.
- **Undo exactly what you did.** If a choice changes two things (for example a path and a \`used\` flag), the un-choose must reverse both, in reverse order.
- **Prune before recursing, not after.** A check at the top of the recursive call still costs a call per pruned branch; checking before the call saves it.
- **No answer at all.** A search can legitimately return an empty list (for example a target that no combination reaches). Do not treat that as an error.
- **Stop early when one answer is enough.** For "does any arrangement exist?" questions, return \`true\` up the call chain as soon as one leaf succeeds instead of finishing the whole tree.

## Common Pitfalls

- **Recording the live list.** \`out.append(path)\` stores a reference to the one shared list; after all the \`pop()\` calls every stored answer is the same empty list. Record \`path[:]\` or \`"".join(path)\`.
- **Forgetting the un-choose.** If the \`pop()\` is missing, the next branch starts with leftover characters and every later answer is wrong. Every \`append\` before a recursive call needs a matching \`pop\` after it.
- **Pruning too late.** Checking validity only at the leaves is brute force (511 calls for n = 4 in our run); checking \`opened < n\` and \`closed < opened\` before recursing cut it to 64.
- **Mutable default arguments.** \`def build(path=[])\` shares one list across *separate* top-level calls. Create the list inside the outer function.
- **Deep recursion.** A backtracking search whose depth grows with the input (for example a 2,000-cell path) will hit \`RecursionError\`; switch to an explicit stack or raise the limit with care.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">backtracking builds a solution one decision at a time and undoes the last decision when it cannot lead to a valid answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pattern:</strong> <span style="color:#f0e2c8;">choose a move, explore recursively, un-choose the move; a base case records complete solutions.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pruning:</strong> <span style="color:#f0e2c8;">check constraints before recursing so whole subtrees are never visited; for n = 4 parentheses that is 64 calls instead of 511.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">nodes visited × work per node, usually exponential; extra space is the recursion depth.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">one shared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code> as the path, and record a copy (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path[:]</code>); recursion depth is capped at about 1000 frames by default.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your output is a list of empty lists. What happened?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You appended <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> itself, not a copy. Every entry points at the same list, which is empty after the final <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">out.append(path[:])</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is backtracking the same as DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is DFS over the tree of partial solutions, which is built on the fly instead of stored. Backtracking adds two things: undoing state on the way back, and pruning branches that cannot succeed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you analyse the running time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count the nodes of the state-space tree and multiply by the work per node. For generate parentheses that is the 6,917 calls we measured for n = 8, each doing O(1) work plus O(n) to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">join</code> at a leaf.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use backtracking?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the same sub-problem repeats, dynamic programming with memoisation is faster; when only one best answer is needed and a greedy rule is provably correct, greedy is faster still.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you avoid recursion in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: keep an explicit list of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(path, opened, closed)</code> states and pop from it. It removes the recursion limit at the cost of readability.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Backtracking** | Build a solution step by step; undo a step that cannot lead to an answer |
| **Partial solution** | The decisions made so far, kept in one shared variable |
| **Choose / explore / un-choose** | Apply a move, recurse, reverse the move |
| **State-space tree** | Tree of all partial solutions; backtracking walks it depth-first |
| **Pruning** | Skipping a subtree because no solution can lie below it |
| **Constraint check** | The test that decides whether a move is allowed |
| **Exponential time** | Growth like c^n; normal when the output itself is exponential |

---
**Conclusion:** In Python, backtracking is a recursive function around one shared list: \`append\` a move, recurse, \`pop\` it, and record \`path[:]\` (or a joined string) when the path is complete. Pruning — refusing moves that cannot lead to an answer — is what turns it from brute force into a usable algorithm: on generate parentheses it cut 131,071 calls to 6,917 for n = 8. Next, apply the same template to [subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array), [permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array), [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem) and [N-Queens](/interview-question/how-do-you-solve-the-n-queens-problem).`,
        examples: [
          {
            label: "Generate parentheses: brute force vs backtracking (call counts)",
            code: `# Generate every valid string of n pairs of parentheses.
# Brute force builds all 2^(2n) strings and filters; backtracking prunes.

def is_valid(s):
    depth = 0
    for ch in s:
        depth += 1 if ch == "(" else -1
        if depth < 0:
            return False
    return depth == 0


def brute_force(n):
    out, calls = [], [0]

    def build(path):
        calls[0] += 1
        if len(path) == 2 * n:
            if is_valid(path):
                out.append("".join(path))
            return
        for ch in "()":
            path.append(ch)      # choose
            build(path)          # explore
            path.pop()           # un-choose

    build([])
    return out, calls[0]


def backtrack(n):
    out, calls = [], [0]

    def build(path, opened, closed):
        calls[0] += 1
        if len(path) == 2 * n:
            out.append("".join(path))
            return
        if opened < n:                      # constraint 1: at most n "("
            path.append("(")
            build(path, opened + 1, closed)
            path.pop()
        if closed < opened:                 # constraint 2: never close more than opened
            path.append(")")
            build(path, opened, closed + 1)
            path.pop()

    build([], 0, 0)
    return out, calls[0]


for n in range(1, 5):
    good, bt_calls = backtrack(n)
    same, bf_calls = brute_force(n)
    print("n = " + str(n) + ": " + str(len(good)) + " strings: " + " ".join(good))
    print("  brute force calls " + str(bf_calls) + ", backtracking calls " + str(bt_calls)
          + ", same answer: " + str(good == same).lower())

good, bt_calls = backtrack(8)
same, bf_calls = brute_force(8)
print("n = 8: " + str(len(good)) + " strings")
print("  brute force calls " + str(bf_calls) + ", backtracking calls " + str(bt_calls)
      + ", same answer: " + str(good == same).lower())`,
          },
          {
            label: "Trace every choose, prune and undo for n = 2",
            code: `# Trace choose -> explore -> un-choose for n = 2 pairs of parentheses.
# Every line is indented by recursion depth, so you can see the tree.

N = 2
path = []   # ONE shared list: we change it, recurse, then change it back


def build(opened, closed):
    pad = "  " * len(path)
    if len(path) == 2 * N:
        print(pad + "record " + "".join(path))
        return
    for ch in "()":
        if ch == "(" and opened == N:
            print(pad + "prune ( : already used " + str(N) + " opens")
            continue
        if ch == ")" and closed == opened:
            print(pad + "prune ) : nothing open to close")
            continue
        path.append(ch)                                  # choose
        print(pad + "choose " + ch + " -> " + "".join(path))
        if ch == "(":
            build(opened + 1, closed)                    # explore
        else:
            build(opened, closed + 1)
        path.pop()                                       # un-choose
        print(pad + "undo " + ch + "   -> " + ("".join(path) or "(empty)"))


build(0, 0)`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Explain what backtracking is, how it differs from plain brute force, and show me the pattern on a small problem in JavaScript."

**What a strong answer should cover:**
- The idea: build a solution one decision at a time, and undo the last decision when it cannot lead to an answer, then try the next option.
- The three-step pattern choose / explore / un-choose, and the base case that records a complete solution.
- Pruning: checking constraints *before* recursing, and why it is the difference between backtracking and brute force.
- The state-space tree picture, and complexity as (number of nodes) × (work per node), usually exponential; space is the recursion depth.
- JavaScript details: one shared array as the path with \`push\`/\`pop\`, recording a copy (\`[...path]\` or \`path.join("")\`), and closures holding the result and counters.

**Code / implementation expected:** Optional — a short recursive generator in JavaScript (for example generate parentheses) that shows choose / explore / un-choose and one pruning rule.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a function call and recursion are  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are in a hedge maze with a piece of chalk. At every fork you pick a path and walk on. When you hit a dead end you do not teleport back to the entrance — you walk back to the **last fork** where an untried path is left, chalk off the one you just tried, and take the next. Eventually you have either found the exit or tried everything.

Now imagine some paths have a sign at their entrance: *no exit this way*. You never even walk down those. You still search the whole maze in principle, but you skip whole regions of it without stepping in.

That is backtracking. Walking forward is **choosing**, walking back to the fork is **un-choosing**, and the signs are **pruning**. Many interview problems — every subset, every permutation, every way to hit a target sum, placing queens on a board — are mazes like this, where each fork is a decision.

## 2. The Idea in Plain Words

A backtracking algorithm builds an answer piece by piece. At each step it looks at the choices it may make next, makes one, and calls itself to handle the rest. When that call returns — either because it recorded a finished answer or because it got stuck — the algorithm **undoes** the choice so that the next choice starts from exactly the same state.

📌 **Interview term: Backtracking** — a search that builds candidate solutions one decision at a time and abandons (undoes) a partial candidate as soon as it cannot be completed into a valid solution.

📌 **Interview term: Partial solution** — the decisions made so far (here, the characters placed so far). It lives in one shared variable that grows and shrinks as the search moves.

📌 **Interview term: Choose / explore / un-choose** — the three-line heart of every backtracking function: apply a move, recurse, then reverse the move.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="The backtracking loop: choose a move, explore deeper, un-choose the move, then try the next option">
  <defs>
    <marker id="b31q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="105" y="66" text-anchor="middle">1. choose</text>
  <text class="d-sub" x="105" y="88" text-anchor="middle">apply one move</text>
  <rect class="d-box" x="245" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="320" y="66" text-anchor="middle">2. explore</text>
  <text class="d-sub" x="320" y="88" text-anchor="middle">recurse deeper</text>
  <rect class="d-box" x="460" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="535" y="66" text-anchor="middle">3. un-choose</text>
  <text class="d-sub" x="535" y="88" text-anchor="middle">undo that move</text>
  <path class="d-edge" d="M 182 70 L 240 70" marker-end="url(#b31q1-arrow)"/>
  <path class="d-edge" d="M 397 70 L 455 70" marker-end="url(#b31q1-arrow)"/>
  <path class="d-edge-accent" d="M 535 102 L 535 160 L 105 160 L 105 106" fill="none" marker-end="url(#b31q1-arrow)"/>
  <text class="d-sub d-accent" x="320" y="186" text-anchor="middle">then try the next option</text>
</svg>

The arrow back from step 3 is the whole trick: after the undo, the state is exactly what it was before step 1, so the loop can try the next option on a clean slate.

Backtracking is recursion in a particular shape, so if base cases are new, read [what recursion and a base case are](/interview-question/what-is-recursion-and-what-is-a-base-case) first.

## 3. A Concrete Problem: Generate Parentheses

To see the idea on something real, take a classic: **list every valid string of n pairs of parentheses.** For n = 2 the answers are \`(())\` and \`()()\`. A string is valid when, reading left to right, you never close more brackets than you have opened, and at the end everything is closed.

Each position is a fork with two options: \`(\` or \`)\`. Drawing every fork gives a tree:

📌 **Interview term: State-space tree** — the tree of all partial solutions: the root is the empty solution, each edge is one decision, and each leaf is a complete candidate. Backtracking is a depth-first walk of this tree that never stores the tree itself.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 400" role="img" aria-label="State space tree for two pairs of parentheses. Dashed branches are pruned and the two leaves are the answers">
  <path class="d-edge" d="M 340 57 L 220 103"/>
  <path class="d-edge-dashed" d="M 340 57 L 500 103"/>
  <path class="d-edge" d="M 220 137 L 120 183"/>
  <path class="d-edge" d="M 220 137 L 340 183"/>
  <path class="d-edge-dashed" d="M 120 217 L 50 263"/>
  <path class="d-edge" d="M 120 217 L 170 263"/>
  <path class="d-edge" d="M 340 217 L 330 263"/>
  <path class="d-edge-dashed" d="M 340 217 L 460 263"/>
  <path class="d-edge-accent" d="M 170 297 L 170 343"/>
  <path class="d-edge-accent" d="M 330 297 L 330 343"/>
  <rect class="d-box" x="305" y="23" width="70" height="34" rx="6"/>
  <text class="d-text" x="340" y="45" text-anchor="middle">start</text>
  <rect class="d-box" x="185" y="103" width="70" height="34" rx="6"/>
  <text class="d-text" x="220" y="125" text-anchor="middle">(</text>
  <rect class="d-box-muted" x="465" y="103" width="70" height="34" rx="6"/>
  <text class="d-text" x="500" y="125" text-anchor="middle">)</text>
  <rect class="d-box" x="85" y="183" width="70" height="34" rx="6"/>
  <text class="d-text" x="120" y="205" text-anchor="middle">((</text>
  <rect class="d-box" x="305" y="183" width="70" height="34" rx="6"/>
  <text class="d-text" x="340" y="205" text-anchor="middle">()</text>
  <rect class="d-box-muted" x="15" y="263" width="70" height="34" rx="6"/>
  <text class="d-text" x="50" y="285" text-anchor="middle">(((</text>
  <rect class="d-box" x="135" y="263" width="70" height="34" rx="6"/>
  <text class="d-text" x="170" y="285" text-anchor="middle">(()</text>
  <rect class="d-box" x="295" y="263" width="70" height="34" rx="6"/>
  <text class="d-text" x="330" y="285" text-anchor="middle">()(</text>
  <rect class="d-box-muted" x="425" y="263" width="70" height="34" rx="6"/>
  <text class="d-text" x="460" y="285" text-anchor="middle">())</text>
  <rect class="d-box-accent" x="135" y="343" width="70" height="34" rx="6"/>
  <text class="d-text" x="170" y="365" text-anchor="middle">(())</text>
  <rect class="d-box-accent" x="295" y="343" width="70" height="34" rx="6"/>
  <text class="d-text" x="330" y="365" text-anchor="middle">()()</text>
  <text class="d-sub" x="560" y="190">dashed: pruned</text>
  <text class="d-sub" x="560" y="220">solid: explored</text>
  <text class="d-sub d-accent" x="560" y="250">accent: recorded</text>
</svg>

Three branches are dashed. \`)\` as the first character can never become valid — nothing is open. \`(((\` has used three opens when only two are allowed. \`())\` closes more than it opened. A backtracking search refuses those moves immediately, so nothing below them is ever generated.

📌 **Interview term: Pruning** — skipping a branch of the state-space tree because a constraint already shows that no complete solution can lie below it.

📌 **Interview term: Constraint check** — the test (here \`opened < n\` and \`closed < opened\`) that decides whether a move is allowed before recursing on it.

## 4. Brute Force First, Then Backtracking

The brute-force version tries both characters at every position, builds all 2^(2n) strings, and checks each one at the end. It already uses choose / explore / un-choose, but it never prunes:

~~~javascript
function bruteForce(n) {
  const out = [];
  let calls = 0;
  function build(path) {
    calls++;
    if (path.length === 2 * n) {
      if (isValid(path)) out.push(path.join(""));
      return;
    }
    for (const ch of ["(", ")"]) {
      path.push(ch);   // choose
      build(path);     // explore
      path.pop();      // un-choose
    }
  }
  build([]);
  return { out, calls };
}
~~~

Backtracking adds two constraint checks *before* each recursive call. A \`(\` is allowed only while fewer than n have been opened; a \`)\` is allowed only while there is something open to close. Every string that survives to full length is valid, so no final check is needed:

~~~javascript
function backtrack(n) {
  const out = [];
  let calls = 0;
  function build(path, opened, closed) {
    calls++;
    if (path.length === 2 * n) {
      out.push(path.join(""));
      return;
    }
    if (opened < n) {            // constraint 1: at most n "("
      path.push("(");
      build(path, opened + 1, closed);
      path.pop();
    }
    if (closed < opened) {       // constraint 2: never close more than opened
      path.push(")");
      build(path, opened, closed + 1);
      path.pop();
    }
  }
  build([], 0, 0);
  return { out, calls };
}
~~~

**What to point out in this JavaScript code:**

- \`path\` is one array shared by every call. \`push\` is the *choose*, \`pop\` is the *un-choose*; both work on the end of the array.
- \`path.join("")\` builds a new string at the moment we record it, so later changes to \`path\` cannot touch the stored answer.
- \`build\` is a closure: it reads and updates \`out\` and \`calls\` from the enclosing function, so no globals are needed.
- The recursion depth equals the length of the string, 2n. The maximum call-stack depth in JavaScript depends on the engine and is not fixed by the language standard, so for very deep searches use an explicit stack.

JavaScript strings are immutable, so you will also see the style \`build(s + "(", ...)\`: every call gets its own new string and there is nothing to undo. That is still backtracking — the undo happens implicitly when the call returns — but it builds a new string at every step. The shared-array style makes the undo visible, which is what interviewers want to see.

Both versions return the same list. The difference is how much of the tree they walk. For n = 4 the run in section 6 counted:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 180" role="img" aria-label="Calls needed for n equal to 4: brute force makes 511 calls, backtracking with pruning makes 64">
  <text class="d-text" x="20" y="62">brute force</text>
  <rect class="d-box-muted" x="160" y="40" width="440" height="36" rx="6"/>
  <text class="d-text" x="380" y="63" text-anchor="middle">511 calls</text>
  <text class="d-text" x="20" y="142">backtracking</text>
  <rect class="d-box-accent" x="160" y="120" width="55" height="36" rx="6"/>
  <text class="d-text" x="270" y="143" text-anchor="middle">64 calls</text>
</svg>

Both bars are drawn to scale and produce the same 14 answers. Brute force makes 511 calls (every node of a full binary tree of depth 8), backtracking makes 64, and the gap widens fast: for n = 8 it is 131,071 calls against 6,917.

## 5. Watching It Move: a Full Trace

Example 2 prints every decision for n = 2, indented by depth, so you can read the state-space tree from top to bottom. Note that every \`choose\` is followed later by an \`undo\` of the same character at the same indentation, and that pruned moves are refused before any recursion happens:

~~~text
choose ( -> (
  choose ( -> ((
    prune ( : already used 2 opens
    choose ) -> (()
      prune ( : already used 2 opens
      choose ) -> (())
        record (())
      undo )   -> (()
    undo )   -> ((
  undo (   -> (
  choose ) -> ()
    choose ( -> ()(
      prune ( : already used 2 opens
      choose ) -> ()()
        record ()()
      undo )   -> ()(
    undo (   -> ()
    prune ) : nothing open to close
  undo )   -> (
undo (   -> (empty)
prune ) : nothing open to close
~~~

Read it like the maze: walk in with \`(\`, \`((\`, get stopped by the *already used 2 opens* sign, take \`)\` instead, record \`(())\`, then walk all the way back to the first fork and try \`()\` next.

## 6. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\` (Node.js 22; the same code runs in the page). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — all valid parentheses strings, brute force vs backtracking, with call counts** prints:

~~~text
n = 1: 1 strings: ()
  brute force calls 7, backtracking calls 3, same answer: true
n = 2: 2 strings: (()) ()()
  brute force calls 31, backtracking calls 8, same answer: true
n = 3: 5 strings: ((())) (()()) (())() ()(()) ()()()
  brute force calls 127, backtracking calls 22, same answer: true
n = 4: 14 strings: (((()))) ((()())) ((())()) ((()))() (()(())) (()()()) (()())() (())(()) (())()() ()((())) ()(()()) ()(())() ()()(()) ()()()()
  brute force calls 511, backtracking calls 64, same answer: true
n = 8: 1430 strings
  brute force calls 131071, backtracking calls 6917, same answer: true
~~~

**Example 2 — a full choose / explore / un-choose trace for n = 2** prints:

~~~text
choose ( -> (
  choose ( -> ((
    prune ( : already used 2 opens
    choose ) -> (()
      prune ( : already used 2 opens
      choose ) -> (())
        record (())
      undo )   -> (()
    undo )   -> ((
  undo (   -> (
  choose ) -> ()
    choose ( -> ()(
      prune ( : already used 2 opens
      choose ) -> ()()
        record ()()
      undo )   -> ()(
    undo (   -> ()
    prune ) : nothing open to close
  undo )   -> (
undo (   -> (empty)
prune ) : nothing open to close
~~~

## 7. Where Backtracking Shows Up

Almost every "list all" or "find any arrangement that satisfies these rules" problem is backtracking. What changes from problem to problem is only *what a choice is* and *which constraint prunes*:

| Problem | One decision | Pruning rule |
| :--- | :--- | :--- |
| [All subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array) | include the next element or not | none needed: every node is an answer |
| [All permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array) | which unused element goes next | skip elements already used |
| [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem) | which number to add next | stop when the running sum passes the target |
| [N-Queens](/interview-question/how-do-you-solve-the-n-queens-problem) | which column gets the queen in this row | skip columns and diagonals already attacked |
| Generate parentheses (this page) | \`(\` or \`)\` | at most n opens; never close more than opened |

Backtracking is a depth-first search over the state-space tree, which is why its memory is only the current path — see [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs). When the same sub-problem keeps reappearing in different branches, the better tool is [dynamic programming](/interview-question/what-is-dynamic-programming); when one locally best choice is provably safe, it is a [greedy algorithm](/interview-question/what-is-a-greedy-algorithm).

## 8. Complexity

The cost of a backtracking search is **(number of nodes visited) × (work per node)**. The number of nodes is usually exponential, which is unavoidable when the output itself is exponential — you cannot print 1,430 strings in less than 1,430 steps. Pruning shrinks the node count, not the output.

| Version | Calls measured (n = 4 / n = 8) | Time | Extra space | Why |
| :--- | :--- | :--- | :--- | :--- |
| Brute force | 511 / 131,071 | O(2^(2n) · n) | O(n) | every one of the 2^(2n) strings is built and checked in O(n) |
| Backtracking | 64 / 6,917 | O(n · answers) | O(n) | every visited node is a prefix of some valid answer (at most 2n prefixes each), and each leaf costs O(n) to copy |

The extra space in both cases is the recursion depth plus the shared path, 2n — the output list is not counted. How much stack a recursive call uses is covered in [space complexity and recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

📌 **Interview term: Exponential time** — running time that grows like c^n for some constant c > 1; typical for searches that must list exponentially many answers.

## 9. Edge Cases

- **The base case comes first.** Check "is the path complete?" before looping over choices, or you will try to extend a finished answer.
- **Undo exactly what you did.** If a choice changes two things (for example a path and a \`used\` flag), the un-choose must reverse both, in reverse order.
- **Prune before recursing, not after.** A check at the top of the recursive call still costs a call per pruned branch; checking before the call saves it.
- **No answer at all.** A search can legitimately return an empty list (for example a target that no combination reaches). Do not treat that as an error.
- **Stop early when one answer is enough.** For "does any arrangement exist?" questions, return \`true\` up the call chain as soon as one leaf succeeds instead of finishing the whole tree.

## Common Pitfalls

- **Recording the live array.** \`out.push(path)\` stores a reference to the one shared array; after all the \`pop()\` calls every stored answer is the same empty array. Record \`[...path]\` or \`path.join("")\`.
- **Forgetting the un-choose.** If the \`pop()\` is missing, the next branch starts with leftover characters. Every \`push\` before a recursive call needs a matching \`pop\` after it.
- **Pruning too late.** Checking validity only at the leaves is brute force (511 calls for n = 4 in our run); checking \`opened < n\` and \`closed < opened\` before recursing cut it to 64.
- **\`for...in\` over an array.** It iterates the *keys* as strings (\`"0"\`, \`"1"\`), not the values. Use \`for...of\` or an index loop for the choices.
- **Comparing arrays with \`===\`.** Two arrays with the same contents are still different objects; compare element by element (the example does this with \`every\`).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">backtracking builds a solution one decision at a time and undoes the last decision when it cannot lead to a valid answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pattern:</strong> <span style="color:#f0e2c8;">choose a move, explore recursively, un-choose the move; a base case records complete solutions.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pruning:</strong> <span style="color:#f0e2c8;">check constraints before recursing so whole subtrees are never visited; for n = 4 parentheses that is 64 calls instead of 511.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">nodes visited × work per node, usually exponential; extra space is the recursion depth.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">one shared array with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code> as the path, record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...path]</code> (a copy), and keep results in a closure rather than globals.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your result is an array of empty arrays. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You pushed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> itself. Every entry is the same array object, empty after the final <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>. Push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...path]</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path.slice()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is backtracking the same as DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is DFS over the tree of partial solutions, built on the fly instead of stored. Backtracking adds undoing state on the way back and pruning branches that cannot succeed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you analyse the running time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count the nodes of the state-space tree and multiply by the work per node. For generate parentheses we measured 6,917 calls for n = 8, each O(1) plus O(n) for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">join</code> at a leaf.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use backtracking?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When sub-problems repeat, memoised dynamic programming is faster; when a greedy rule is provably correct and one answer is enough, greedy is faster still.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could this be a generator function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function* build(...)</code> can <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield path.join("")</code> at each leaf and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield*</code> the recursive calls, so the caller can stop early without building the whole list.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Backtracking** | Build a solution step by step; undo a step that cannot lead to an answer |
| **Partial solution** | The decisions made so far, kept in one shared variable |
| **Choose / explore / un-choose** | Apply a move, recurse, reverse the move |
| **State-space tree** | Tree of all partial solutions; backtracking walks it depth-first |
| **Pruning** | Skipping a subtree because no solution can lie below it |
| **Constraint check** | The test that decides whether a move is allowed |
| **Exponential time** | Growth like c^n; normal when the output itself is exponential |

---
**Conclusion:** In JavaScript, backtracking is a recursive closure around one shared array: \`push\` a move, recurse, \`pop\` it, and record \`[...path]\` (or a joined string) when the path is complete. Pruning — refusing moves that cannot lead to an answer — is what makes it practical: on generate parentheses it cut 131,071 calls to 6,917 for n = 8. Next, apply the same template to [subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array), [permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array), [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem) and [N-Queens](/interview-question/how-do-you-solve-the-n-queens-problem).`,
        examples: [
          {
            label: "Generate parentheses: brute force vs backtracking (call counts)",
            code: `// Generate every valid string of n pairs of parentheses.
// Brute force builds all 2^(2n) strings and filters; backtracking prunes.

function isValid(s) {
  let depth = 0;
  for (const ch of s) {
    depth += ch === "(" ? 1 : -1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function bruteForce(n) {
  const out = [];
  let calls = 0;
  function build(path) {
    calls++;
    if (path.length === 2 * n) {
      if (isValid(path)) out.push(path.join(""));
      return;
    }
    for (const ch of ["(", ")"]) {
      path.push(ch);   // choose
      build(path);     // explore
      path.pop();      // un-choose
    }
  }
  build([]);
  return { out, calls };
}

function backtrack(n) {
  const out = [];
  let calls = 0;
  function build(path, opened, closed) {
    calls++;
    if (path.length === 2 * n) {
      out.push(path.join(""));
      return;
    }
    if (opened < n) {            // constraint 1: at most n "("
      path.push("(");
      build(path, opened + 1, closed);
      path.pop();
    }
    if (closed < opened) {       // constraint 2: never close more than opened
      path.push(")");
      build(path, opened, closed + 1);
      path.pop();
    }
  }
  build([], 0, 0);
  return { out, calls };
}

const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

for (let n = 1; n <= 4; n++) {
  const bt = backtrack(n);
  const bf = bruteForce(n);
  console.log("n = " + n + ": " + bt.out.length + " strings: " + bt.out.join(" "));
  console.log("  brute force calls " + bf.calls + ", backtracking calls " + bt.calls +
    ", same answer: " + sameList(bt.out, bf.out));
}

const bt8 = backtrack(8);
const bf8 = bruteForce(8);
console.log("n = 8: " + bt8.out.length + " strings");
console.log("  brute force calls " + bf8.calls + ", backtracking calls " + bt8.calls +
  ", same answer: " + sameList(bt8.out, bf8.out));`,
          },
          {
            label: "Trace every choose, prune and undo for n = 2",
            code: `// Trace choose -> explore -> un-choose for n = 2 pairs of parentheses.
// Every line is indented by recursion depth, so you can see the tree.

const N = 2;
const path = [];   // ONE shared array: we change it, recurse, then change it back

function build(opened, closed) {
  const pad = "  ".repeat(path.length);
  if (path.length === 2 * N) {
    console.log(pad + "record " + path.join(""));
    return;
  }
  for (const ch of ["(", ")"]) {
    if (ch === "(" && opened === N) {
      console.log(pad + "prune ( : already used " + N + " opens");
      continue;
    }
    if (ch === ")" && closed === opened) {
      console.log(pad + "prune ) : nothing open to close");
      continue;
    }
    path.push(ch);                                   // choose
    console.log(pad + "choose " + ch + " -> " + path.join(""));
    if (ch === "(") build(opened + 1, closed);       // explore
    else build(opened, closed + 1);
    path.pop();                                      // un-choose
    console.log(pad + "undo " + ch + "   -> " + (path.join("") || "(empty)"));
  }
}

build(0, 0);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Explain what backtracking is, how it differs from plain brute force, and show me the pattern on a small problem in Java."

**What a strong answer should cover:**
- The idea: build a solution one decision at a time, and undo the last decision when it cannot lead to an answer, then try the next option.
- The three-step pattern choose / explore / un-choose, and the base case that records a complete solution.
- Pruning: checking constraints *before* recursing, and why it is the difference between backtracking and brute force.
- The state-space tree picture, and complexity as (number of nodes) × (work per node), usually exponential; space is the recursion depth.
- Java details: a \`StringBuilder\` (or \`List\`) as the shared path with \`append\`/\`deleteCharAt\`, recording \`path.toString()\` or \`new ArrayList<>(path)\`, and \`StackOverflowError\` when recursion is too deep.

**Code / implementation expected:** Optional — a short recursive generator in Java (for example generate parentheses) that shows choose / explore / un-choose and one pruning rule.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a function call and recursion are  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are in a hedge maze with a piece of chalk. At every fork you pick a path and walk on. When you hit a dead end you do not teleport back to the entrance — you walk back to the **last fork** where an untried path is left, chalk off the one you just tried, and take the next. Eventually you have either found the exit or tried everything.

Now imagine some paths have a sign at their entrance: *no exit this way*. You never even walk down those. You still search the whole maze in principle, but you skip whole regions of it without stepping in.

That is backtracking. Walking forward is **choosing**, walking back to the fork is **un-choosing**, and the signs are **pruning**. Many interview problems — every subset, every permutation, every way to hit a target sum, placing queens on a board — are mazes like this, where each fork is a decision.

## 2. The Idea in Plain Words

A backtracking algorithm builds an answer piece by piece. At each step it looks at the choices it may make next, makes one, and calls itself to handle the rest. When that call returns — either because it recorded a finished answer or because it got stuck — the algorithm **undoes** the choice so that the next choice starts from exactly the same state.

📌 **Interview term: Backtracking** — a search that builds candidate solutions one decision at a time and abandons (undoes) a partial candidate as soon as it cannot be completed into a valid solution.

📌 **Interview term: Partial solution** — the decisions made so far (here, the characters placed so far). It lives in one shared variable that grows and shrinks as the search moves.

📌 **Interview term: Choose / explore / un-choose** — the three-line heart of every backtracking function: apply a move, recurse, then reverse the move.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="The backtracking loop: choose a move, explore deeper, un-choose the move, then try the next option">
  <defs>
    <marker id="b31q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="105" y="66" text-anchor="middle">1. choose</text>
  <text class="d-sub" x="105" y="88" text-anchor="middle">apply one move</text>
  <rect class="d-box" x="245" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="320" y="66" text-anchor="middle">2. explore</text>
  <text class="d-sub" x="320" y="88" text-anchor="middle">recurse deeper</text>
  <rect class="d-box" x="460" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="535" y="66" text-anchor="middle">3. un-choose</text>
  <text class="d-sub" x="535" y="88" text-anchor="middle">undo that move</text>
  <path class="d-edge" d="M 182 70 L 240 70" marker-end="url(#b31q1-arrow)"/>
  <path class="d-edge" d="M 397 70 L 455 70" marker-end="url(#b31q1-arrow)"/>
  <path class="d-edge-accent" d="M 535 102 L 535 160 L 105 160 L 105 106" fill="none" marker-end="url(#b31q1-arrow)"/>
  <text class="d-sub d-accent" x="320" y="186" text-anchor="middle">then try the next option</text>
</svg>

The arrow back from step 3 is the whole trick: after the undo, the state is exactly what it was before step 1, so the loop can try the next option on a clean slate.

Backtracking is recursion in a particular shape, so if base cases are new, read [what recursion and a base case are](/interview-question/what-is-recursion-and-what-is-a-base-case) first.

## 3. A Concrete Problem: Generate Parentheses

To see the idea on something real, take a classic: **list every valid string of n pairs of parentheses.** For n = 2 the answers are \`(())\` and \`()()\`. A string is valid when, reading left to right, you never close more brackets than you have opened, and at the end everything is closed.

Each position is a fork with two options: \`(\` or \`)\`. Drawing every fork gives a tree:

📌 **Interview term: State-space tree** — the tree of all partial solutions: the root is the empty solution, each edge is one decision, and each leaf is a complete candidate. Backtracking is a depth-first walk of this tree that never stores the tree itself.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 400" role="img" aria-label="State space tree for two pairs of parentheses. Dashed branches are pruned and the two leaves are the answers">
  <path class="d-edge" d="M 340 57 L 220 103"/>
  <path class="d-edge-dashed" d="M 340 57 L 500 103"/>
  <path class="d-edge" d="M 220 137 L 120 183"/>
  <path class="d-edge" d="M 220 137 L 340 183"/>
  <path class="d-edge-dashed" d="M 120 217 L 50 263"/>
  <path class="d-edge" d="M 120 217 L 170 263"/>
  <path class="d-edge" d="M 340 217 L 330 263"/>
  <path class="d-edge-dashed" d="M 340 217 L 460 263"/>
  <path class="d-edge-accent" d="M 170 297 L 170 343"/>
  <path class="d-edge-accent" d="M 330 297 L 330 343"/>
  <rect class="d-box" x="305" y="23" width="70" height="34" rx="6"/>
  <text class="d-text" x="340" y="45" text-anchor="middle">start</text>
  <rect class="d-box" x="185" y="103" width="70" height="34" rx="6"/>
  <text class="d-text" x="220" y="125" text-anchor="middle">(</text>
  <rect class="d-box-muted" x="465" y="103" width="70" height="34" rx="6"/>
  <text class="d-text" x="500" y="125" text-anchor="middle">)</text>
  <rect class="d-box" x="85" y="183" width="70" height="34" rx="6"/>
  <text class="d-text" x="120" y="205" text-anchor="middle">((</text>
  <rect class="d-box" x="305" y="183" width="70" height="34" rx="6"/>
  <text class="d-text" x="340" y="205" text-anchor="middle">()</text>
  <rect class="d-box-muted" x="15" y="263" width="70" height="34" rx="6"/>
  <text class="d-text" x="50" y="285" text-anchor="middle">(((</text>
  <rect class="d-box" x="135" y="263" width="70" height="34" rx="6"/>
  <text class="d-text" x="170" y="285" text-anchor="middle">(()</text>
  <rect class="d-box" x="295" y="263" width="70" height="34" rx="6"/>
  <text class="d-text" x="330" y="285" text-anchor="middle">()(</text>
  <rect class="d-box-muted" x="425" y="263" width="70" height="34" rx="6"/>
  <text class="d-text" x="460" y="285" text-anchor="middle">())</text>
  <rect class="d-box-accent" x="135" y="343" width="70" height="34" rx="6"/>
  <text class="d-text" x="170" y="365" text-anchor="middle">(())</text>
  <rect class="d-box-accent" x="295" y="343" width="70" height="34" rx="6"/>
  <text class="d-text" x="330" y="365" text-anchor="middle">()()</text>
  <text class="d-sub" x="560" y="190">dashed: pruned</text>
  <text class="d-sub" x="560" y="220">solid: explored</text>
  <text class="d-sub d-accent" x="560" y="250">accent: recorded</text>
</svg>

Three branches are dashed. \`)\` as the first character can never become valid — nothing is open. \`(((\` has used three opens when only two are allowed. \`())\` closes more than it opened. A backtracking search refuses those moves immediately, so nothing below them is ever generated.

📌 **Interview term: Pruning** — skipping a branch of the state-space tree because a constraint already shows that no complete solution can lie below it.

📌 **Interview term: Constraint check** — the test (here \`opened < n\` and \`closed < opened\`) that decides whether a move is allowed before recursing on it.

## 4. Brute Force First, Then Backtracking

The brute-force version tries both characters at every position, builds all 2^(2n) strings, and checks each one at the end. It already uses choose / explore / un-choose, but it never prunes:

~~~java
static void bruteBuild(int n, StringBuilder path, List<String> out) {
    calls++;
    if (path.length() == 2 * n) {
        if (isValid(path)) out.add(path.toString());
        return;
    }
    for (char ch : new char[] {'(', ')'}) {
        path.append(ch);                       // choose
        bruteBuild(n, path, out);              // explore
        path.deleteCharAt(path.length() - 1);  // un-choose
    }
}
~~~

Backtracking adds two constraint checks *before* each recursive call. A \`(\` is allowed only while fewer than n have been opened; a \`)\` is allowed only while there is something open to close. Every string that survives to full length is valid, so no final check is needed:

~~~java
static void btBuild(int n, StringBuilder path, int opened, int closed, List<String> out) {
    calls++;
    if (path.length() == 2 * n) {
        out.add(path.toString());
        return;
    }
    if (opened < n) {                  // constraint 1: at most n '('
        path.append('(');
        btBuild(n, path, opened + 1, closed, out);
        path.deleteCharAt(path.length() - 1);
    }
    if (closed < opened) {             // constraint 2: never close more than opened
        path.append(')');
        btBuild(n, path, opened, closed + 1, out);
        path.deleteCharAt(path.length() - 1);
    }
}
~~~

**What to point out in this Java code:**

- \`path\` is one \`StringBuilder\` shared by every call. \`append\` is the *choose*, \`deleteCharAt(path.length() - 1)\` is the *un-choose*.
- \`path.toString()\` creates a new immutable \`String\` at the moment we record it, so later edits to the builder cannot touch stored answers.
- The counter is a \`static int calls\`, reset before each run. In production code you would pass a small counter object instead of a static field.
- \`good.equals(same)\` compares two \`List<String>\` element by element, which is how the example checks that both methods agree.
- Depth is 2n here, tiny. Very deep recursion in Java ends in \`StackOverflowError\`; the stack size is a JVM setting (\`-Xss\`), not a language constant.

Java \`String\` is immutable, so you will also see the style \`build(s + "(", ...)\`: every call gets its own new string and there is nothing to undo. That is still backtracking — the undo happens implicitly when the call returns — but it allocates a new string at every step. The \`StringBuilder\` style makes the undo visible, which is what interviewers want to see.

Both versions return the same list. The difference is how much of the tree they walk. For n = 4 the run in section 6 counted:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 180" role="img" aria-label="Calls needed for n equal to 4: brute force makes 511 calls, backtracking with pruning makes 64">
  <text class="d-text" x="20" y="62">brute force</text>
  <rect class="d-box-muted" x="160" y="40" width="440" height="36" rx="6"/>
  <text class="d-text" x="380" y="63" text-anchor="middle">511 calls</text>
  <text class="d-text" x="20" y="142">backtracking</text>
  <rect class="d-box-accent" x="160" y="120" width="55" height="36" rx="6"/>
  <text class="d-text" x="270" y="143" text-anchor="middle">64 calls</text>
</svg>

Both bars are drawn to scale and produce the same 14 answers. Brute force makes 511 calls (every node of a full binary tree of depth 8), backtracking makes 64, and the gap widens fast: for n = 8 it is 131,071 calls against 6,917.

## 5. Watching It Move: a Full Trace

Example 2 prints every decision for n = 2, indented by depth, so you can read the state-space tree from top to bottom. Note that every \`choose\` is followed later by an \`undo\` of the same character at the same indentation, and that pruned moves are refused before any recursion happens:

~~~text
choose ( -> (
  choose ( -> ((
    prune ( : already used 2 opens
    choose ) -> (()
      prune ( : already used 2 opens
      choose ) -> (())
        record (())
      undo )   -> (()
    undo )   -> ((
  undo (   -> (
  choose ) -> ()
    choose ( -> ()(
      prune ( : already used 2 opens
      choose ) -> ()()
        record ()()
      undo )   -> ()(
    undo (   -> ()
    prune ) : nothing open to close
  undo )   -> (
undo (   -> (empty)
prune ) : nothing open to close
~~~

Read it like the maze: walk in with \`(\`, \`((\`, get stopped by the *already used 2 opens* sign, take \`)\` instead, record \`(())\`, then walk all the way back to the first fork and try \`()\` next.

## 6. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — all valid parentheses strings, brute force vs backtracking, with call counts** prints:

~~~text
n = 1: 1 strings: ()
  brute force calls 7, backtracking calls 3, same answer: true
n = 2: 2 strings: (()) ()()
  brute force calls 31, backtracking calls 8, same answer: true
n = 3: 5 strings: ((())) (()()) (())() ()(()) ()()()
  brute force calls 127, backtracking calls 22, same answer: true
n = 4: 14 strings: (((()))) ((()())) ((())()) ((()))() (()(())) (()()()) (()())() (())(()) (())()() ()((())) ()(()()) ()(())() ()()(()) ()()()()
  brute force calls 511, backtracking calls 64, same answer: true
n = 8: 1430 strings
  brute force calls 131071, backtracking calls 6917, same answer: true
~~~

**Example 2 — a full choose / explore / un-choose trace for n = 2** prints:

~~~text
choose ( -> (
  choose ( -> ((
    prune ( : already used 2 opens
    choose ) -> (()
      prune ( : already used 2 opens
      choose ) -> (())
        record (())
      undo )   -> (()
    undo )   -> ((
  undo (   -> (
  choose ) -> ()
    choose ( -> ()(
      prune ( : already used 2 opens
      choose ) -> ()()
        record ()()
      undo )   -> ()(
    undo (   -> ()
    prune ) : nothing open to close
  undo )   -> (
undo (   -> (empty)
prune ) : nothing open to close
~~~

## 7. Where Backtracking Shows Up

Almost every "list all" or "find any arrangement that satisfies these rules" problem is backtracking. What changes from problem to problem is only *what a choice is* and *which constraint prunes*:

| Problem | One decision | Pruning rule |
| :--- | :--- | :--- |
| [All subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array) | include the next element or not | none needed: every node is an answer |
| [All permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array) | which unused element goes next | skip elements already used |
| [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem) | which number to add next | stop when the running sum passes the target |
| [N-Queens](/interview-question/how-do-you-solve-the-n-queens-problem) | which column gets the queen in this row | skip columns and diagonals already attacked |
| Generate parentheses (this page) | \`(\` or \`)\` | at most n opens; never close more than opened |

Backtracking is a depth-first search over the state-space tree, which is why its memory is only the current path — see [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs). When the same sub-problem keeps reappearing in different branches, the better tool is [dynamic programming](/interview-question/what-is-dynamic-programming); when one locally best choice is provably safe, it is a [greedy algorithm](/interview-question/what-is-a-greedy-algorithm).

## 8. Complexity

The cost of a backtracking search is **(number of nodes visited) × (work per node)**. The number of nodes is usually exponential, which is unavoidable when the output itself is exponential — you cannot print 1,430 strings in less than 1,430 steps. Pruning shrinks the node count, not the output.

| Version | Calls measured (n = 4 / n = 8) | Time | Extra space | Why |
| :--- | :--- | :--- | :--- | :--- |
| Brute force | 511 / 131,071 | O(2^(2n) · n) | O(n) | every one of the 2^(2n) strings is built and checked in O(n) |
| Backtracking | 64 / 6,917 | O(n · answers) | O(n) | every visited node is a prefix of some valid answer (at most 2n prefixes each), and each leaf costs O(n) to copy |

The extra space in both cases is the recursion depth plus the shared path, 2n — the output list is not counted. How much stack a recursive call uses is covered in [space complexity and recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

📌 **Interview term: Exponential time** — running time that grows like c^n for some constant c > 1; typical for searches that must list exponentially many answers.

## 9. Edge Cases

- **The base case comes first.** Check "is the path complete?" before looping over choices, or you will try to extend a finished answer.
- **Undo exactly what you did.** If a choice changes two things (for example a path and a \`used\` flag), the un-choose must reverse both, in reverse order.
- **Prune before recursing, not after.** A check at the top of the recursive call still costs a call per pruned branch; checking before the call saves it.
- **No answer at all.** A search can legitimately return an empty list (for example a target that no combination reaches). Do not treat that as an error.
- **Stop early when one answer is enough.** For "does any arrangement exist?" questions, return \`true\` up the call chain as soon as one leaf succeeds instead of finishing the whole tree.

## Common Pitfalls

- **Storing the live builder or list.** \`out.add(path)\` on a shared \`List<Integer>\` stores a reference; after the undos every stored entry is the same (empty) list. Store \`path.toString()\` or \`new ArrayList<>(path)\`.
- **Forgetting the un-choose.** If \`deleteCharAt\` is missing, the next branch starts with leftover characters. Every \`append\` before a recursive call needs a matching delete after it.
- **Pruning too late.** Checking validity only at the leaves is brute force (511 calls for n = 4 in our run); checking \`opened < n\` and \`closed < opened\` first cut it to 64.
- **\`list.remove(x)\` with an \`int\`.** On a \`List<Integer>\`, \`remove(int)\` removes by *index* and \`remove(Object)\` by *value*. To undo the last choice, use \`remove(list.size() - 1)\`.
- **Comparing with \`==\`.** \`==\` on two \`String\` or \`List\` objects compares references; use \`equals\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">backtracking builds a solution one decision at a time and undoes the last decision when it cannot lead to a valid answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pattern:</strong> <span style="color:#f0e2c8;">choose a move, explore recursively, un-choose the move; a base case records complete solutions.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pruning:</strong> <span style="color:#f0e2c8;">check constraints before recursing so whole subtrees are never visited; for n = 4 parentheses that is 64 calls instead of 511.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">nodes visited × work per node, usually exponential; extra space is the recursion depth.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">a shared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StringBuilder</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList</code> as the path, undo with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deleteCharAt</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove(size - 1)</code>, and record a copy (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toString()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new ArrayList&lt;&gt;(path)</code>).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">All your stored lists are empty. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You added the shared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> itself. Every entry is the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList</code>, empty after the last undo. Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new ArrayList&lt;&gt;(path)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is backtracking the same as DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is DFS over the tree of partial solutions, built on the fly instead of stored. Backtracking adds undoing state on the way back and pruning branches that cannot succeed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you analyse the running time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count the nodes of the state-space tree and multiply by the work per node. We measured 6,917 calls for n = 8; each is O(1) plus O(n) for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toString()</code> at a leaf.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use backtracking?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When sub-problems repeat, memoised dynamic programming is faster; when a greedy rule is provably correct and one answer is enough, greedy is faster still.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the recursion is very deep?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Java throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>. Either convert to an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> of states, or run the search in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Thread</code> created with a larger stack size.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Backtracking** | Build a solution step by step; undo a step that cannot lead to an answer |
| **Partial solution** | The decisions made so far, kept in one shared variable |
| **Choose / explore / un-choose** | Apply a move, recurse, reverse the move |
| **State-space tree** | Tree of all partial solutions; backtracking walks it depth-first |
| **Pruning** | Skipping a subtree because no solution can lie below it |
| **Constraint check** | The test that decides whether a move is allowed |
| **Exponential time** | Growth like c^n; normal when the output itself is exponential |

---
**Conclusion:** In Java, backtracking is a recursive method around one shared \`StringBuilder\` or \`ArrayList\`: append a move, recurse, delete it, and store a copy when the path is complete. Pruning — refusing moves that cannot lead to an answer — is what makes it practical: on generate parentheses it cut 131,071 calls to 6,917 for n = 8. Next, apply the same template to [subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array), [permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array), [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem) and [N-Queens](/interview-question/how-do-you-solve-the-n-queens-problem).`,
        examples: [
          {
            label: "Generate parentheses: brute force vs backtracking (call counts)",
            code: `import java.util.ArrayList;
import java.util.List;

// Generate every valid string of n pairs of parentheses.
// Brute force builds all 2^(2n) strings and filters; backtracking prunes.
public class Main {
    static int calls;

    static boolean isValid(CharSequence s) {
        int depth = 0;
        for (int i = 0; i < s.length(); i++) {
            depth += s.charAt(i) == '(' ? 1 : -1;
            if (depth < 0) return false;
        }
        return depth == 0;
    }

    static void bruteBuild(int n, StringBuilder path, List<String> out) {
        calls++;
        if (path.length() == 2 * n) {
            if (isValid(path)) out.add(path.toString());
            return;
        }
        for (char ch : new char[] {'(', ')'}) {
            path.append(ch);                       // choose
            bruteBuild(n, path, out);              // explore
            path.deleteCharAt(path.length() - 1);  // un-choose
        }
    }

    static void btBuild(int n, StringBuilder path, int opened, int closed, List<String> out) {
        calls++;
        if (path.length() == 2 * n) {
            out.add(path.toString());
            return;
        }
        if (opened < n) {                  // constraint 1: at most n '('
            path.append('(');
            btBuild(n, path, opened + 1, closed, out);
            path.deleteCharAt(path.length() - 1);
        }
        if (closed < opened) {             // constraint 2: never close more than opened
            path.append(')');
            btBuild(n, path, opened, closed + 1, out);
            path.deleteCharAt(path.length() - 1);
        }
    }

    static void report(int n, boolean listAll) {
        List<String> good = new ArrayList<>();
        calls = 0;
        btBuild(n, new StringBuilder(), 0, 0, good);
        int btCalls = calls;
        List<String> same = new ArrayList<>();
        calls = 0;
        bruteBuild(n, new StringBuilder(), same);
        int bfCalls = calls;
        if (listAll) System.out.println("n = " + n + ": " + good.size() + " strings: " + String.join(" ", good));
        else System.out.println("n = " + n + ": " + good.size() + " strings");
        System.out.println("  brute force calls " + bfCalls + ", backtracking calls " + btCalls
            + ", same answer: " + good.equals(same));
    }

    public static void main(String[] args) {
        for (int n = 1; n <= 4; n++) report(n, true);
        report(8, false);
    }
}`,
          },
          {
            label: "Trace every choose, prune and undo for n = 2",
            code: `// Trace choose -> explore -> un-choose for n = 2 pairs of parentheses.
// Every line is indented by recursion depth, so you can see the tree.
public class Main {
    static final int N = 2;
    static final StringBuilder path = new StringBuilder();  // ONE shared buffer

    static void build(int opened, int closed) {
        String pad = "  ".repeat(path.length());
        if (path.length() == 2 * N) {
            System.out.println(pad + "record " + path);
            return;
        }
        for (char ch : new char[] {'(', ')'}) {
            if (ch == '(' && opened == N) {
                System.out.println(pad + "prune ( : already used " + N + " opens");
                continue;
            }
            if (ch == ')' && closed == opened) {
                System.out.println(pad + "prune ) : nothing open to close");
                continue;
            }
            path.append(ch);                                   // choose
            System.out.println(pad + "choose " + ch + " -> " + path);
            if (ch == '(') build(opened + 1, closed);          // explore
            else build(opened, closed + 1);
            path.deleteCharAt(path.length() - 1);              // un-choose
            System.out.println(pad + "undo " + ch + "   -> " + (path.length() == 0 ? "(empty)" : path.toString()));
        }
    }

    public static void main(String[] args) {
        build(0, 0);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Explain what backtracking is, how it differs from plain brute force, and show me the pattern on a small problem in C++."

**What a strong answer should cover:**
- The idea: build a solution one decision at a time, and undo the last decision when it cannot lead to an answer, then try the next option.
- The three-step pattern choose / explore / un-choose, and the base case that records a complete solution.
- Pruning: checking constraints *before* recursing, and why it is the difference between backtracking and brute force.
- The state-space tree picture, and complexity as (number of nodes) × (work per node), usually exponential; space is the recursion depth.
- C++ details: pass the shared path by reference (\`string&\` / \`vector<int>&\`) with \`push_back\`/\`pop_back\`; \`out.push_back(path)\` copies, so the stored answer is safe; passing by value instead copies the path at every level.

**Code / implementation expected:** Optional — a short recursive generator in C++ (for example generate parentheses) that shows choose / explore / un-choose and one pruning rule.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a function call and recursion are  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are in a hedge maze with a piece of chalk. At every fork you pick a path and walk on. When you hit a dead end you do not teleport back to the entrance — you walk back to the **last fork** where an untried path is left, chalk off the one you just tried, and take the next. Eventually you have either found the exit or tried everything.

Now imagine some paths have a sign at their entrance: *no exit this way*. You never even walk down those. You still search the whole maze in principle, but you skip whole regions of it without stepping in.

That is backtracking. Walking forward is **choosing**, walking back to the fork is **un-choosing**, and the signs are **pruning**. Many interview problems — every subset, every permutation, every way to hit a target sum, placing queens on a board — are mazes like this, where each fork is a decision.

## 2. The Idea in Plain Words

A backtracking algorithm builds an answer piece by piece. At each step it looks at the choices it may make next, makes one, and calls itself to handle the rest. When that call returns — either because it recorded a finished answer or because it got stuck — the algorithm **undoes** the choice so that the next choice starts from exactly the same state.

📌 **Interview term: Backtracking** — a search that builds candidate solutions one decision at a time and abandons (undoes) a partial candidate as soon as it cannot be completed into a valid solution.

📌 **Interview term: Partial solution** — the decisions made so far (here, the characters placed so far). It lives in one shared variable that grows and shrinks as the search moves.

📌 **Interview term: Choose / explore / un-choose** — the three-line heart of every backtracking function: apply a move, recurse, then reverse the move.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="The backtracking loop: choose a move, explore deeper, un-choose the move, then try the next option">
  <defs>
    <marker id="b31q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="105" y="66" text-anchor="middle">1. choose</text>
  <text class="d-sub" x="105" y="88" text-anchor="middle">apply one move</text>
  <rect class="d-box" x="245" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="320" y="66" text-anchor="middle">2. explore</text>
  <text class="d-sub" x="320" y="88" text-anchor="middle">recurse deeper</text>
  <rect class="d-box" x="460" y="40" width="150" height="60" rx="8"/>
  <text class="d-text" x="535" y="66" text-anchor="middle">3. un-choose</text>
  <text class="d-sub" x="535" y="88" text-anchor="middle">undo that move</text>
  <path class="d-edge" d="M 182 70 L 240 70" marker-end="url(#b31q1-arrow)"/>
  <path class="d-edge" d="M 397 70 L 455 70" marker-end="url(#b31q1-arrow)"/>
  <path class="d-edge-accent" d="M 535 102 L 535 160 L 105 160 L 105 106" fill="none" marker-end="url(#b31q1-arrow)"/>
  <text class="d-sub d-accent" x="320" y="186" text-anchor="middle">then try the next option</text>
</svg>

The arrow back from step 3 is the whole trick: after the undo, the state is exactly what it was before step 1, so the loop can try the next option on a clean slate.

Backtracking is recursion in a particular shape, so if base cases are new, read [what recursion and a base case are](/interview-question/what-is-recursion-and-what-is-a-base-case) first.

## 3. A Concrete Problem: Generate Parentheses

To see the idea on something real, take a classic: **list every valid string of n pairs of parentheses.** For n = 2 the answers are \`(())\` and \`()()\`. A string is valid when, reading left to right, you never close more brackets than you have opened, and at the end everything is closed.

Each position is a fork with two options: \`(\` or \`)\`. Drawing every fork gives a tree:

📌 **Interview term: State-space tree** — the tree of all partial solutions: the root is the empty solution, each edge is one decision, and each leaf is a complete candidate. Backtracking is a depth-first walk of this tree that never stores the tree itself.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 400" role="img" aria-label="State space tree for two pairs of parentheses. Dashed branches are pruned and the two leaves are the answers">
  <path class="d-edge" d="M 340 57 L 220 103"/>
  <path class="d-edge-dashed" d="M 340 57 L 500 103"/>
  <path class="d-edge" d="M 220 137 L 120 183"/>
  <path class="d-edge" d="M 220 137 L 340 183"/>
  <path class="d-edge-dashed" d="M 120 217 L 50 263"/>
  <path class="d-edge" d="M 120 217 L 170 263"/>
  <path class="d-edge" d="M 340 217 L 330 263"/>
  <path class="d-edge-dashed" d="M 340 217 L 460 263"/>
  <path class="d-edge-accent" d="M 170 297 L 170 343"/>
  <path class="d-edge-accent" d="M 330 297 L 330 343"/>
  <rect class="d-box" x="305" y="23" width="70" height="34" rx="6"/>
  <text class="d-text" x="340" y="45" text-anchor="middle">start</text>
  <rect class="d-box" x="185" y="103" width="70" height="34" rx="6"/>
  <text class="d-text" x="220" y="125" text-anchor="middle">(</text>
  <rect class="d-box-muted" x="465" y="103" width="70" height="34" rx="6"/>
  <text class="d-text" x="500" y="125" text-anchor="middle">)</text>
  <rect class="d-box" x="85" y="183" width="70" height="34" rx="6"/>
  <text class="d-text" x="120" y="205" text-anchor="middle">((</text>
  <rect class="d-box" x="305" y="183" width="70" height="34" rx="6"/>
  <text class="d-text" x="340" y="205" text-anchor="middle">()</text>
  <rect class="d-box-muted" x="15" y="263" width="70" height="34" rx="6"/>
  <text class="d-text" x="50" y="285" text-anchor="middle">(((</text>
  <rect class="d-box" x="135" y="263" width="70" height="34" rx="6"/>
  <text class="d-text" x="170" y="285" text-anchor="middle">(()</text>
  <rect class="d-box" x="295" y="263" width="70" height="34" rx="6"/>
  <text class="d-text" x="330" y="285" text-anchor="middle">()(</text>
  <rect class="d-box-muted" x="425" y="263" width="70" height="34" rx="6"/>
  <text class="d-text" x="460" y="285" text-anchor="middle">())</text>
  <rect class="d-box-accent" x="135" y="343" width="70" height="34" rx="6"/>
  <text class="d-text" x="170" y="365" text-anchor="middle">(())</text>
  <rect class="d-box-accent" x="295" y="343" width="70" height="34" rx="6"/>
  <text class="d-text" x="330" y="365" text-anchor="middle">()()</text>
  <text class="d-sub" x="560" y="190">dashed: pruned</text>
  <text class="d-sub" x="560" y="220">solid: explored</text>
  <text class="d-sub d-accent" x="560" y="250">accent: recorded</text>
</svg>

Three branches are dashed. \`)\` as the first character can never become valid — nothing is open. \`(((\` has used three opens when only two are allowed. \`())\` closes more than it opened. A backtracking search refuses those moves immediately, so nothing below them is ever generated.

📌 **Interview term: Pruning** — skipping a branch of the state-space tree because a constraint already shows that no complete solution can lie below it.

📌 **Interview term: Constraint check** — the test (here \`opened < n\` and \`closed < opened\`) that decides whether a move is allowed before recursing on it.

## 4. Brute Force First, Then Backtracking

The brute-force version tries both characters at every position, builds all 2^(2n) strings, and checks each one at the end. It already uses choose / explore / un-choose, but it never prunes:

~~~cpp
void bruteBuild(int n, string& path, vector<string>& out) {
    calls++;
    if ((int)path.size() == 2 * n) {
        if (isValid(path)) out.push_back(path);   // push_back copies the string
        return;
    }
    for (char ch : {'(', ')'}) {
        path.push_back(ch);        // choose
        bruteBuild(n, path, out);  // explore
        path.pop_back();           // un-choose
    }
}
~~~

Backtracking adds two constraint checks *before* each recursive call. A \`(\` is allowed only while fewer than n have been opened; a \`)\` is allowed only while there is something open to close. Every string that survives to full length is valid, so no final check is needed:

~~~cpp
void btBuild(int n, string& path, int opened, int closed, vector<string>& out) {
    calls++;
    if ((int)path.size() == 2 * n) {
        out.push_back(path);
        return;
    }
    if (opened < n) {              // constraint 1: at most n '('
        path.push_back('(');
        btBuild(n, path, opened + 1, closed, out);
        path.pop_back();
    }
    if (closed < opened) {         // constraint 2: never close more than opened
        path.push_back(')');
        btBuild(n, path, opened, closed + 1, out);
        path.pop_back();
    }
}
~~~

**What to point out in this C++ code:**

- \`path\` is one \`std::string\` passed as \`string&\` to every call. \`push_back\` is the *choose*, \`pop_back\` is the *un-choose*.
- \`out.push_back(path)\` copies the string into the vector, so the stored answer is independent of later edits. (In Python, JavaScript or Java you must make that copy yourself.)
- If you wrote \`void btBuild(int n, string path, ...)\` — by value — every call would get its own copy and the undo would happen automatically, but you would pay an O(n) copy per call.
- \`good == same\` compares two \`vector<string>\` element by element; \`boolalpha\` prints it as \`true\`.
- Depth is 2n here, tiny. Very deep recursion in C++ overflows the native stack and crashes the process; there is no exception to catch, so use an explicit stack for deep searches.

You will also see the style \`build(s + "(", ...)\` with \`s\` taken by value or \`const string&\`: every call gets its own new string and there is nothing to undo. That is still backtracking — the undo happens implicitly when the call returns — but it allocates a new string at every step. The reference-plus-\`pop_back\` style makes the undo visible and avoids the copies.

Both versions return the same list. The difference is how much of the tree they walk. For n = 4 the run in section 6 counted:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 180" role="img" aria-label="Calls needed for n equal to 4: brute force makes 511 calls, backtracking with pruning makes 64">
  <text class="d-text" x="20" y="62">brute force</text>
  <rect class="d-box-muted" x="160" y="40" width="440" height="36" rx="6"/>
  <text class="d-text" x="380" y="63" text-anchor="middle">511 calls</text>
  <text class="d-text" x="20" y="142">backtracking</text>
  <rect class="d-box-accent" x="160" y="120" width="55" height="36" rx="6"/>
  <text class="d-text" x="270" y="143" text-anchor="middle">64 calls</text>
</svg>

Both bars are drawn to scale and produce the same 14 answers. Brute force makes 511 calls (every node of a full binary tree of depth 8), backtracking makes 64, and the gap widens fast: for n = 8 it is 131,071 calls against 6,917.

## 5. Watching It Move: a Full Trace

Example 2 prints every decision for n = 2, indented by depth, so you can read the state-space tree from top to bottom. Note that every \`choose\` is followed later by an \`undo\` of the same character at the same indentation, and that pruned moves are refused before any recursion happens:

~~~text
choose ( -> (
  choose ( -> ((
    prune ( : already used 2 opens
    choose ) -> (()
      prune ( : already used 2 opens
      choose ) -> (())
        record (())
      undo )   -> (()
    undo )   -> ((
  undo (   -> (
  choose ) -> ()
    choose ( -> ()(
      prune ( : already used 2 opens
      choose ) -> ()()
        record ()()
      undo )   -> ()(
    undo (   -> ()
    prune ) : nothing open to close
  undo )   -> (
undo (   -> (empty)
prune ) : nothing open to close
~~~

Read it like the maze: walk in with \`(\`, \`((\`, get stopped by the *already used 2 opens* sign, take \`)\` instead, record \`(())\`, then walk all the way back to the first fork and try \`()\` next.

## 6. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp -o main && ./main\` (GCC 13.3). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — all valid parentheses strings, brute force vs backtracking, with call counts** prints:

~~~text
n = 1: 1 strings: ()
  brute force calls 7, backtracking calls 3, same answer: true
n = 2: 2 strings: (()) ()()
  brute force calls 31, backtracking calls 8, same answer: true
n = 3: 5 strings: ((())) (()()) (())() ()(()) ()()()
  brute force calls 127, backtracking calls 22, same answer: true
n = 4: 14 strings: (((()))) ((()())) ((())()) ((()))() (()(())) (()()()) (()())() (())(()) (())()() ()((())) ()(()()) ()(())() ()()(()) ()()()()
  brute force calls 511, backtracking calls 64, same answer: true
n = 8: 1430 strings
  brute force calls 131071, backtracking calls 6917, same answer: true
~~~

**Example 2 — a full choose / explore / un-choose trace for n = 2** prints:

~~~text
choose ( -> (
  choose ( -> ((
    prune ( : already used 2 opens
    choose ) -> (()
      prune ( : already used 2 opens
      choose ) -> (())
        record (())
      undo )   -> (()
    undo )   -> ((
  undo (   -> (
  choose ) -> ()
    choose ( -> ()(
      prune ( : already used 2 opens
      choose ) -> ()()
        record ()()
      undo )   -> ()(
    undo (   -> ()
    prune ) : nothing open to close
  undo )   -> (
undo (   -> (empty)
prune ) : nothing open to close
~~~

## 7. Where Backtracking Shows Up

Almost every "list all" or "find any arrangement that satisfies these rules" problem is backtracking. What changes from problem to problem is only *what a choice is* and *which constraint prunes*:

| Problem | One decision | Pruning rule |
| :--- | :--- | :--- |
| [All subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array) | include the next element or not | none needed: every node is an answer |
| [All permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array) | which unused element goes next | skip elements already used |
| [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem) | which number to add next | stop when the running sum passes the target |
| [N-Queens](/interview-question/how-do-you-solve-the-n-queens-problem) | which column gets the queen in this row | skip columns and diagonals already attacked |
| Generate parentheses (this page) | \`(\` or \`)\` | at most n opens; never close more than opened |

Backtracking is a depth-first search over the state-space tree, which is why its memory is only the current path — see [BFS vs DFS](/interview-question/what-is-the-difference-between-bfs-and-dfs). When the same sub-problem keeps reappearing in different branches, the better tool is [dynamic programming](/interview-question/what-is-dynamic-programming); when one locally best choice is provably safe, it is a [greedy algorithm](/interview-question/what-is-a-greedy-algorithm).

## 8. Complexity

The cost of a backtracking search is **(number of nodes visited) × (work per node)**. The number of nodes is usually exponential, which is unavoidable when the output itself is exponential — you cannot print 1,430 strings in less than 1,430 steps. Pruning shrinks the node count, not the output.

| Version | Calls measured (n = 4 / n = 8) | Time | Extra space | Why |
| :--- | :--- | :--- | :--- | :--- |
| Brute force | 511 / 131,071 | O(2^(2n) · n) | O(n) | every one of the 2^(2n) strings is built and checked in O(n) |
| Backtracking | 64 / 6,917 | O(n · answers) | O(n) | every visited node is a prefix of some valid answer (at most 2n prefixes each), and each leaf costs O(n) to copy |

The extra space in both cases is the recursion depth plus the shared path, 2n — the output list is not counted. How much stack a recursive call uses is covered in [space complexity and recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

📌 **Interview term: Exponential time** — running time that grows like c^n for some constant c > 1; typical for searches that must list exponentially many answers.

## 9. Edge Cases

- **The base case comes first.** Check "is the path complete?" before looping over choices, or you will try to extend a finished answer.
- **Undo exactly what you did.** If a choice changes two things (for example a path and a \`used\` flag), the un-choose must reverse both, in reverse order.
- **Prune before recursing, not after.** A check at the top of the recursive call still costs a call per pruned branch; checking before the call saves it.
- **No answer at all.** A search can legitimately return an empty list (for example a target that no combination reaches). Do not treat that as an error.
- **Stop early when one answer is enough.** For "does any arrangement exist?" questions, return \`true\` up the call chain as soon as one leaf succeeds instead of finishing the whole tree.

## Common Pitfalls

- **Forgetting the \`&\`.** \`void build(string path)\` copies the path at every level. The answer stays correct, but your explicit \`pop_back\` now undoes a copy nobody else sees, and the copies cost O(n) each.
- **Forgetting the un-choose.** If \`pop_back\` is missing, the next branch starts with leftover characters. Every \`push_back\` before a recursive call needs a matching \`pop_back\` after it.
- **Pruning too late.** Checking validity only at the leaves is brute force (511 calls for n = 4 in our run); checking \`opened < n\` and \`closed < opened\` first cut it to 64.
- **Storing pointers or references to the path.** A \`vector<string*>\` of \`&path\` would alias exactly like the Python and Java bugs; store values.
- **\`int\` counters on big searches.** Call counts grow exponentially; the example uses \`long long calls\` so larger n does not overflow a signed \`int\` (undefined behaviour).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">backtracking builds a solution one decision at a time and undoes the last decision when it cannot lead to a valid answer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pattern:</strong> <span style="color:#f0e2c8;">choose a move, explore recursively, un-choose the move; a base case records complete solutions.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pruning:</strong> <span style="color:#f0e2c8;">check constraints before recursing so whole subtrees are never visited; for n = 4 parentheses that is 64 calls instead of 511.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">nodes visited × work per node, usually exponential; extra space is the recursion depth.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">pass the path as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string&amp;</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;&amp;</code>, undo with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_back</code>, and let <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">out.push_back(path)</code> take the copy.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why pass <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">path</code> by reference?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So all calls share one buffer and each step costs O(1). By value, every call copies the path (O(n)) and the explicit undo becomes pointless.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is backtracking the same as DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is DFS over the tree of partial solutions, built on the fly instead of stored. Backtracking adds undoing state on the way back and pruning branches that cannot succeed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you analyse the running time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count the nodes of the state-space tree and multiply by the work per node. We measured 6,917 calls for n = 8; each is O(1) plus O(n) to copy the string at a leaf.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use backtracking?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When sub-problems repeat, memoised dynamic programming is faster; when a greedy rule is provably correct and one answer is enough, greedy is faster still.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the recursion is too deep?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The native stack overflows and the program crashes (usually a segmentation fault). Convert to an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> used as a stack of states.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Backtracking** | Build a solution step by step; undo a step that cannot lead to an answer |
| **Partial solution** | The decisions made so far, kept in one shared variable |
| **Choose / explore / un-choose** | Apply a move, recurse, reverse the move |
| **State-space tree** | Tree of all partial solutions; backtracking walks it depth-first |
| **Pruning** | Skipping a subtree because no solution can lie below it |
| **Constraint check** | The test that decides whether a move is allowed |
| **Exponential time** | Growth like c^n; normal when the output itself is exponential |

---
**Conclusion:** In C++, backtracking is a recursive function around one shared \`std::string\` or \`std::vector\` passed by reference: \`push_back\` a move, recurse, \`pop_back\` it, and let \`out.push_back(path)\` copy the finished answer. Pruning — refusing moves that cannot lead to an answer — is what makes it practical: on generate parentheses it cut 131,071 calls to 6,917 for n = 8. Next, apply the same template to [subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array), [permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array), [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem) and [N-Queens](/interview-question/how-do-you-solve-the-n-queens-problem).`,
        examples: [
          {
            label: "Generate parentheses: brute force vs backtracking (call counts)",
            code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

// Generate every valid string of n pairs of parentheses.
// Brute force builds all 2^(2n) strings and filters; backtracking prunes.
long long calls = 0;

bool isValid(const string& s) {
    int depth = 0;
    for (char ch : s) {
        depth += ch == '(' ? 1 : -1;
        if (depth < 0) return false;
    }
    return depth == 0;
}

void bruteBuild(int n, string& path, vector<string>& out) {
    calls++;
    if ((int)path.size() == 2 * n) {
        if (isValid(path)) out.push_back(path);   // push_back copies the string
        return;
    }
    for (char ch : {'(', ')'}) {
        path.push_back(ch);        // choose
        bruteBuild(n, path, out);  // explore
        path.pop_back();           // un-choose
    }
}

void btBuild(int n, string& path, int opened, int closed, vector<string>& out) {
    calls++;
    if ((int)path.size() == 2 * n) {
        out.push_back(path);
        return;
    }
    if (opened < n) {              // constraint 1: at most n '('
        path.push_back('(');
        btBuild(n, path, opened + 1, closed, out);
        path.pop_back();
    }
    if (closed < opened) {         // constraint 2: never close more than opened
        path.push_back(')');
        btBuild(n, path, opened, closed + 1, out);
        path.pop_back();
    }
}

void report(int n, bool listAll) {
    vector<string> good, same;
    string path;
    calls = 0;
    btBuild(n, path, 0, 0, good);
    long long btCalls = calls;
    calls = 0;
    bruteBuild(n, path, same);
    long long bfCalls = calls;
    cout << "n = " << n << ": " << good.size() << " strings";
    if (listAll) {
        cout << ":";
        for (const string& s : good) cout << " " << s;
    }
    cout << "\\n";
    cout << boolalpha << "  brute force calls " << bfCalls << ", backtracking calls " << btCalls
         << ", same answer: " << (good == same) << "\\n";
}

int main() {
    for (int n = 1; n <= 4; n++) report(n, true);
    report(8, false);
}`,
          },
          {
            label: "Trace every choose, prune and undo for n = 2",
            code: `#include <iostream>
#include <string>
using namespace std;

// Trace choose -> explore -> un-choose for n = 2 pairs of parentheses.
// Every line is indented by recursion depth, so you can see the tree.
const int N = 2;
string path;   // ONE shared string: we change it, recurse, then change it back

void build(int opened, int closed) {
    string pad(2 * path.size(), ' ');
    if ((int)path.size() == 2 * N) {
        cout << pad << "record " << path << "\\n";
        return;
    }
    for (char ch : {'(', ')'}) {
        if (ch == '(' && opened == N) {
            cout << pad << "prune ( : already used " << N << " opens\\n";
            continue;
        }
        if (ch == ')' && closed == opened) {
            cout << pad << "prune ) : nothing open to close\\n";
            continue;
        }
        path.push_back(ch);                                // choose
        cout << pad << "choose " << ch << " -> " << path << "\\n";
        if (ch == '(') build(opened + 1, closed);          // explore
        else build(opened, closed + 1);
        path.pop_back();                                   // un-choose
        cout << pad << "undo " << ch << "   -> " << (path.empty() ? "(empty)" : path) << "\\n";
    }
}

int main() {
    build(0, 0);
}`,
          },
        ],
      },
    },
  },
  {
    title: "How do you generate all subsets of an array?",
    difficulty: "medium",
    seoDescription: "Generate every subset (the power set) with backtracking, a cascade or bitmasks, plus duplicates, in verified Python, JavaScript, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a list of distinct integers, return every possible subset — the power set. Code it in Python, then tell me what changes if the list can contain duplicates."

**What a strong answer should cover:**
- Every element is either in or out, so there are 2^n subsets including the empty one; that bounds both time and output size.
- A backtracking solution (loop from a start index, choose / recurse with i + 1 / un-choose) and why the start index prevents reordered repeats.
- At least one alternative: the iterative doubling (cascade) or the bitmask from 0 to 2^n - 1.
- Complexity O(n · 2^n) time and output, O(n) extra space for the recursion, and why it cannot be beaten when every subset must be listed.
- Duplicates (Subsets II): sort, then skip a value equal to the previous one at the same level (\`i > start\`).
- Python details: record \`path[:]\` (a copy) not \`path\`; \`itertools.combinations\` gives the same sets ordered by size; \`1 << n\` is exact for any n because Python integers do not overflow.

**Clarifying questions expected:**
- Can the input contain duplicates, and if so should equal subsets appear once?
- Does the order of the subsets (or inside each subset) matter?
- How large can n get? (2^n grows very fast.)

**Code / implementation expected:** Yes — a backtracking function in Python returning \`list[list[int]]\`, plus the sort-and-skip change for duplicates.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and basic recursion  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A pizza place offers three extra toppings: mushrooms, olives and peppers. How many different pizzas can you order? For each topping you make one yes/no decision — on or off — so there are 2 × 2 × 2 = 8 pizzas, from the plain one (no toppings) to the one with everything.

Listing those 8 pizzas is exactly this problem. With 10 toppings it is 1,024 pizzas, with 20 it is over a million. The idea stays the same: walk through the toppings and, for each one, try *with* and *without*. That walk is the simplest example of [backtracking](/interview-question/what-is-backtracking).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the input contain duplicates? | With \`[1, 2, 2]\`, \`[1, 2]\` could appear twice; removing that needs a sort and a skip rule (section 6). |
| Should the empty subset be included? | Mathematically yes; almost every version of this problem expects \`[]\` in the answer. |
| Does the order of the output matter? | Each method produces a different order (section 7); if a specific order is required, pick the method that gives it or sort afterwards. |
| How large can n be? | The answer has 2^n entries, so n beyond about 20 to 25 is impractical to list; it tells you a polynomial solution is not expected. |
| Return them, or just count / process them? | Counting is simply 2^n; processing one at a time avoids storing them all. |

## 3. The Core Idea

For an array of n distinct numbers, every subset is described by n yes/no decisions: is element 0 in, is element 1 in, and so on. Two choices, n times, gives 2^n subsets.

📌 **Interview term: Subset** — any selection of elements from the array, in their original relative order, including none of them (the empty subset) and all of them.

📌 **Interview term: Power set** — the set of all subsets of a set. For n elements it has 2^n members.

📌 **Interview term: Include / exclude decision** — the binary choice made for each element; the decisions together identify exactly one subset.

The most common backtracking version does not walk the yes/no tree directly. Instead, every call **records the current path as a subset**, then tries adding each *later* element. Its recursion tree for \`[1, 2, 3]\` has exactly 8 nodes, and each node is one answer:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 350" role="img" aria-label="Recursion tree of the loop version for 1, 2, 3. Every one of the eight nodes is a subset">
  <path class="d-edge" d="M 340 57 L 150 113"/>
  <path class="d-edge" d="M 340 57 L 400 113"/>
  <path class="d-edge" d="M 340 57 L 580 113"/>
  <path class="d-edge" d="M 150 147 L 80 203"/>
  <path class="d-edge" d="M 150 147 L 230 203"/>
  <path class="d-edge" d="M 400 147 L 400 203"/>
  <path class="d-edge" d="M 80 237 L 80 293"/>
  <rect class="d-box-accent" x="295" y="23" width="90" height="34" rx="6"/>
  <text class="d-text" x="340" y="45" text-anchor="middle">[ ]</text>
  <rect class="d-box-accent" x="105" y="113" width="90" height="34" rx="6"/>
  <text class="d-text" x="150" y="135" text-anchor="middle">[1]</text>
  <rect class="d-box-accent" x="355" y="113" width="90" height="34" rx="6"/>
  <text class="d-text" x="400" y="135" text-anchor="middle">[2]</text>
  <rect class="d-box-accent" x="535" y="113" width="90" height="34" rx="6"/>
  <text class="d-text" x="580" y="135" text-anchor="middle">[3]</text>
  <rect class="d-box-accent" x="35" y="203" width="90" height="34" rx="6"/>
  <text class="d-text" x="80" y="225" text-anchor="middle">[1, 2]</text>
  <rect class="d-box-accent" x="185" y="203" width="90" height="34" rx="6"/>
  <text class="d-text" x="230" y="225" text-anchor="middle">[1, 3]</text>
  <rect class="d-box-accent" x="355" y="203" width="90" height="34" rx="6"/>
  <text class="d-text" x="400" y="225" text-anchor="middle">[2, 3]</text>
  <rect class="d-box-accent" x="35" y="293" width="90" height="34" rx="6"/>
  <text class="d-text" x="80" y="315" text-anchor="middle">[1, 2, 3]</text>
  <text class="d-sub" x="560" y="225">start index rule:</text>
  <text class="d-sub" x="560" y="250">only add later items</text>
</svg>

Reading the tree in depth-first order (root, then left subtree, then right) gives \`[]\`, \`[1]\`, \`[1, 2]\`, \`[1, 2, 3]\`, \`[1, 3]\`, \`[2]\`, \`[2, 3]\`, \`[3]\` — exactly the first line of example 1. \`[2]\` has no child \`[2, 1]\`, because from index 1 the loop only looks at later indices; that is what stops \`[1, 2]\` and \`[2, 1]\` from both appearing.

📌 **Interview term: Start index** — the parameter that says from which position the loop may pick the next element. Moving it to \`i + 1\` after choosing \`nums[i]\` makes every subset appear once, in increasing index order.

## 4. Four Ways to Build It in Python

**A. Backtracking with a loop** — record, then extend with each later element:

~~~python
def subsets_loop(nums):
    """Backtracking: every node of the recursion tree is a subset."""
    out, path = [], []

    def go(start):
        out.append(path[:])              # record a COPY of the current path
        for i in range(start, len(nums)):
            path.append(nums[i])         # choose nums[i]
            go(i + 1)                    # only later indices: no reordered repeats
            path.pop()                   # un-choose

    go(0)
    return out
~~~

**B. Backtracking with take / skip** — at index i, branch twice: once with \`nums[i]\`, once without. This is the include/exclude tree itself; answers appear only at the leaves (depth n):

~~~python
def subsets_take_skip(nums):
    """Backtracking: at index i, either take nums[i] or skip it."""
    out, path = [], []

    def go(i):
        if i == len(nums):
            out.append(path[:])
            return
        path.append(nums[i])             # take
        go(i + 1)
        path.pop()                       # skip
        go(i + 1)

    go(0)
    return out
~~~

**C. Iterative cascade** — start from \`[[]]\`; for each new element, copy every subset so far and add the element to the copy. Each element doubles the list: 1 → 2 → 4 → 8.

~~~python
def subsets_cascade(nums):
    """Iterative: each new element doubles the list."""
    out = [[]]
    for x in nums:
        out += [s + [x] for s in out]
    return out
~~~

**D. Bitmask** — count \`mask\` from 0 to 2^n - 1; bit i of the mask says whether \`nums[i]\` is in. The numbers 0..7 written in binary are exactly the 8 include/exclude patterns:

~~~python
def subsets_bitmask(nums):
    """Bit i of mask says whether nums[i] is in the subset."""
    n = len(nums)
    return [[nums[i] for i in range(n) if mask >> i & 1] for mask in range(1 << n)]
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="Mask 5 has bits 0 and 2 set, so it selects nums at index 0 and 2, giving the subset 1, 3">
  <defs>
    <marker id="b31q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="55">nums</text>
  <rect class="d-box" x="130" y="30" width="60" height="40" rx="6"/>
  <text class="d-text" x="160" y="55" text-anchor="middle">1</text>
  <rect class="d-box" x="230" y="30" width="60" height="40" rx="6"/>
  <text class="d-text" x="260" y="55" text-anchor="middle">2</text>
  <rect class="d-box" x="330" y="30" width="60" height="40" rx="6"/>
  <text class="d-text" x="360" y="55" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 160 72 L 160 118"/>
  <path class="d-edge-dashed" d="M 260 72 L 260 118"/>
  <path class="d-edge-accent" d="M 360 72 L 360 118"/>
  <text class="d-text" x="20" y="145">mask 5</text>
  <rect class="d-box-accent" x="130" y="120" width="60" height="40" rx="6"/>
  <text class="d-text" x="160" y="145" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="230" y="120" width="60" height="40" rx="6"/>
  <text class="d-text" x="260" y="145" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="330" y="120" width="60" height="40" rx="6"/>
  <text class="d-text" x="360" y="145" text-anchor="middle">1</text>
  <text class="d-sub" x="160" y="190" text-anchor="middle">bit 0</text>
  <text class="d-sub" x="260" y="190" text-anchor="middle">bit 1</text>
  <text class="d-sub" x="360" y="190" text-anchor="middle">bit 2</text>
  <path class="d-edge" d="M 400 140 L 462 140" marker-end="url(#b31q2-arrow)"/>
  <rect class="d-box-accent" x="470" y="120" width="130" height="40" rx="6"/>
  <text class="d-text" x="535" y="145" text-anchor="middle">[1, 3]</text>
</svg>

Mask 5 is binary 101: bits 0 and 2 are set, so it selects \`nums[0]\` and \`nums[2]\` and produces \`[1, 3]\`. For more on reading and setting bits, see [bit manipulation tricks](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews).

📌 **Interview term: Bitmask** — an integer whose binary digits are used as a row of on/off flags, one per element.

**What to point out in this Python code:**

- \`out.append(path[:])\` — the slice makes a copy. Appending \`path\` itself stores the one shared list, which is empty once every \`pop()\` has run.
- The loop version records at the *top* of every call, so every node of the tree is an answer and there is no separate base case; the loop simply does not run when \`start == len(nums)\`.
- In the cascade, \`out += [s + [x] for s in out]\` is safe because the list comprehension is fully built before \`+=\` extends \`out\`. A plain \`for s in out: out.append(...)\` would keep seeing the new items and never stop.
- \`mask >> i & 1\` reads bit i. Python integers are arbitrary precision, so \`1 << n\` never overflows — but 2^n subsets will run out of time and memory long before that matters.
- The standard library also has this: the itertools documentation lists a \`powerset\` recipe built from \`chain.from_iterable(combinations(s, r) for r in range(len(s) + 1))\` ([itertools recipes](https://docs.python.org/3/library/itertools.html#itertools-recipes)). In our run it returned \`[(), (1,), (2,), (3,), (1, 2), (1, 3), (2, 3), (1, 2, 3)]\` — tuples, ordered by size. In an interview, write the backtracking version first and mention this as the library shortcut.

## 5. Which Method to Choose

| Method | Order it produces for [1, 2, 3] | Strength | Weakness |
| :--- | :--- | :--- | :--- |
| A. Loop backtracking | \`[]\`, \`[1]\`, \`[1, 2]\`, \`[1, 2, 3]\`, \`[1, 3]\`, \`[2]\`, ... | extends to duplicates and pruning; the standard interview answer | recursion |
| B. Take / skip | \`[1, 2, 3]\`, \`[1, 2]\`, \`[1, 3]\`, \`[1]\`, ... \`[]\` | mirrors the yes/no reasoning exactly | twice as many calls (2^(n+1) - 1 nodes) |
| C. Cascade | \`[]\`, \`[1]\`, \`[2]\`, \`[1, 2]\`, \`[3]\`, ... | no recursion, very short | everything lives in memory at once |
| D. Bitmask | same as C | no recursion, easy to jump to the k-th subset | n is limited by the integer width |

## 6. Duplicates: Subsets II

If the input is \`[2, 1, 2]\`, the plain algorithm produces duplicate sets: \`[2]\` twice, and both \`[2, 1]\` and \`[1, 2]\`. The fix has two parts:

1. **Sort** the input, so equal values sit next to each other: \`[1, 2, 2]\`.
2. In the loop, **skip \`nums[i]\` when it equals \`nums[i - 1]\` and \`i > start\`.** Choosing the second 2 as the first pick *at this level* would rebuild exactly the subtree the first 2 already built.

~~~python
def subsets(nums, skip_duplicates):
    out, path = [], []

    def go(start):
        out.append(path[:])
        for i in range(start, len(nums)):
            # Same value as the previous choice AT THIS LEVEL -> same subtree again.
            if skip_duplicates and i > start and nums[i] == nums[i - 1]:
                continue
            path.append(nums[i])
            go(i + 1)
            path.pop()

    go(0)
    return out
~~~

The condition is \`i > start\`, not \`i > 0\`: the second 2 is still allowed when it comes *right after* the first 2 was chosen at the level above (that is how \`[2, 2]\` and \`[1, 2, 2]\` are formed). Example 2 shows all three stages on \`[2, 1, 2]\`: unsorted with no rule, sorted with no rule (still duplicated), and sorted with the rule (6 unique subsets).

📌 **Interview term: Duplicate skipping at the same level** — in a sorted input, refusing to start a branch with a value that an earlier sibling branch already started with.

## 7. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — four ways to build the power set of [1, 2, 3], plus empty and one-element input** prints:

~~~text
backtracking, loop:  [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]
backtracking, take:  [[1, 2, 3], [1, 2], [1, 3], [1], [2, 3], [2], [3], []]
iterative cascade:   [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
bitmask:             [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
empty input:         [[]]
single element:      [[], [7]]
~~~

**Example 2 — Subsets II (duplicates) with the sort-and-skip rule, and how fast 2^n grows** prints:

~~~text
no skip, unsorted:  [[], [2], [2, 1], [2, 1, 2], [2, 2], [1], [1, 2], [2]]
no skip, sorted:    [[], [1], [1, 2], [1, 2, 2], [1, 2], [2], [2, 2], [2]]
sorted + skip rule: [[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]
[2, 2, 2] unique:   [[], [2], [2, 2], [2, 2, 2]]
n = 0: 1 subsets, 0 numbers stored
n = 1: 2 subsets, 1 numbers stored
n = 5: 32 subsets, 80 numbers stored
n = 10: 1024 subsets, 5120 numbers stored
n = 16: 65536 subsets, 524288 numbers stored
~~~

The last five lines confirm the growth: 2^n subsets and n · 2^(n-1) numbers in total (each element appears in exactly half of the subsets).

## 8. Complexity

| Method | Time | Extra space (beyond the output) | Why |
| :--- | :--- | :--- | :--- |
| A. Loop backtracking | O(n · 2^n) | O(n) | 2^n calls, each copies a path of length up to n |
| B. Take / skip | O(n · 2^n) | O(n) | 2^(n+1) - 1 calls, 2^n leaves each copy up to n |
| C. Cascade | O(n · 2^n) | O(n) | each subset is built once by copying its parent |
| D. Bitmask | O(n · 2^n) | O(n) | 2^n masks, n bit tests each |
| Output itself | — | O(n · 2^n) | n · 2^(n-1) numbers in total (524,288 for n = 16 in our run) |

Because the output already has n · 2^(n-1) numbers, no algorithm that lists every subset can be faster than O(n · 2^n). See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read these, and [space complexity of recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) for why the recursion costs only O(n).

## 9. Edge Cases

- **Empty input** → \`[[]]\`: one subset, the empty one. Example 1 prints it. Returning \`[]\` (no subsets at all) is a common mistake.
- **One element** \`[7]\` → \`[[], [7]]\`.
- **All equal values** \`[2, 2, 2]\` with the skip rule → \`[[], [2], [2, 2], [2, 2, 2]]\`: four subsets, one per count of 2s.
- **Negative numbers or zero** change nothing: subsets do not look at the values (unless you are skipping duplicates, which only compares them).
- **Large n**: n = 20 already means 1,048,576 subsets. If the real question is "is there a subset with property X?", look for a DP or pruning approach instead — for example [equal-sum partition](/interview-question/how-do-you-check-if-an-array-can-be-partitioned-into-two-equal-sum-subsets) or [bitmask DP](/interview-question/what-is-bitmask-dynamic-programming).

## Common Pitfalls

- **\`out.append(path)\` without a copy.** Every stored subset is the same list object; at the end they are all \`[]\`. Use \`path[:]\` or \`list(path)\`.
- **Recursing with \`i\` instead of \`i + 1\`.** The same element is picked again and again (that is [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem), not subsets) and the recursion never reaches an end: the path keeps growing until Python raises \`RecursionError\`.
- **Skipping duplicates without sorting first.** The \`nums[i] == nums[i - 1]\` test only works when equal values are neighbours. Our run on unsorted \`[2, 1, 2]\` without the rule produced \`[2]\` twice and both \`[2, 1]\` and \`[1, 2]\`.
- **\`i > 0\` instead of \`i > start\` in the skip rule.** That also skips the second 2 when it is the *first* choice at a deeper level, so \`[1, 2, 2]\` and \`[2, 2]\` disappear.
- **Using a \`set\` of lists to de-duplicate.** Lists are not hashable; you would need \`set(tuple(sorted(s)) ...)\`, which costs extra time and loses the natural order. The skip rule avoids generating duplicates at all.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Count first:</strong> <span style="color:#f0e2c8;">every element is in or out, so there are 2^n subsets, including the empty one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">backtracking: record the path at every call, loop i from start, choose nums[i], recurse with i + 1, un-choose.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Alternatives:</strong> <span style="color:#f0e2c8;">the iterative cascade doubles the list per element; a bitmask from 0 to 2^n - 1 reads bit i as include nums[i].</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n · 2^n) time and output, O(n) extra space; optimal because the output itself is that big. Duplicates: sort and skip equal values when i &gt; start.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path[:]</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code>; mention <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">itertools.combinations</code> over every size as the library shortcut.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does your output list contain only empty lists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append(path)</code> stored the same list object, emptied by the final <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>. Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path[:]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle duplicates in the input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort, then in the loop skip <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt; start and nums[i] == nums[i - 1]</code>. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 2]</code> that gives 6 subsets instead of 8.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which of your methods would you pick, and why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Backtracking: it extends naturally to pruning and to duplicates. The bitmask version is shortest but needs n small enough for a mask, and the cascade holds everything in memory at once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the time complexity, and can you beat it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n · 2^n): there are 2^n subsets and copying one costs up to n. You cannot beat it when you must output them all, because the output itself has n · 2^(n-1) numbers (524,288 for n = 16 in our run).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you only need subsets of size k?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same loop, but record only when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len(path) == k</code> and stop descending at that depth; that is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">itertools.combinations(nums, k)</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subset** | Any selection of the elements, including none and all |
| **Power set** | The set of all 2^n subsets |
| **Include / exclude decision** | The yes/no choice made for each element |
| **Start index** | Where the loop may pick the next element; i + 1 prevents reordered repeats |
| **Bitmask** | An integer used as a row of on/off flags |
| **Duplicate skipping at the same level** | In sorted input, do not start a branch with a value a sibling already used |

---
**Conclusion:** In Python, the subsets problem is a ten-line backtracking function: record \`path[:]\` at every call, loop \`i\` from \`start\`, \`append\`, recurse with \`i + 1\`, \`pop\`. The iterative cascade and the bitmask loop give the same 2^n sets in a different order, and duplicates need only a sort plus the \`i > start\` skip rule. The same template with one change — which elements are allowed next — gives [permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array), and with a running sum it gives [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem).`,
        examples: [
          {
            label: "Power set four ways: loop backtracking, take/skip, cascade, bitmask",
            code: `# Four ways to generate every subset (the power set) of an array.

def subsets_loop(nums):
    """Backtracking: every node of the recursion tree is a subset."""
    out, path = [], []

    def go(start):
        out.append(path[:])              # record a COPY of the current path
        for i in range(start, len(nums)):
            path.append(nums[i])         # choose nums[i]
            go(i + 1)                    # only later indices: no reordered repeats
            path.pop()                   # un-choose

    go(0)
    return out


def subsets_take_skip(nums):
    """Backtracking: at index i, either take nums[i] or skip it."""
    out, path = [], []

    def go(i):
        if i == len(nums):
            out.append(path[:])
            return
        path.append(nums[i])             # take
        go(i + 1)
        path.pop()                       # skip
        go(i + 1)

    go(0)
    return out


def subsets_cascade(nums):
    """Iterative: each new element doubles the list."""
    out = [[]]
    for x in nums:
        out += [s + [x] for s in out]
    return out


def subsets_bitmask(nums):
    """Bit i of mask says whether nums[i] is in the subset."""
    n = len(nums)
    return [[nums[i] for i in range(n) if mask >> i & 1] for mask in range(1 << n)]


def fmt(subs):
    return "[" + ", ".join("[" + ", ".join(map(str, s)) + "]" for s in subs) + "]"


nums = [1, 2, 3]
print("backtracking, loop:  " + fmt(subsets_loop(nums)))
print("backtracking, take:  " + fmt(subsets_take_skip(nums)))
print("iterative cascade:   " + fmt(subsets_cascade(nums)))
print("bitmask:             " + fmt(subsets_bitmask(nums)))
print("empty input:         " + fmt(subsets_loop([])))
print("single element:      " + fmt(subsets_loop([7])))`,
          },
          {
            label: "Subsets II: sort + skip duplicates, and output size for n up to 16",
            code: `# Subsets II (input with duplicates) and how fast the output grows.

def subsets(nums, skip_duplicates):
    out, path = [], []

    def go(start):
        out.append(path[:])
        for i in range(start, len(nums)):
            # Same value as the previous choice AT THIS LEVEL -> same subtree again.
            if skip_duplicates and i > start and nums[i] == nums[i - 1]:
                continue
            path.append(nums[i])
            go(i + 1)
            path.pop()

    go(0)
    return out


def fmt(subs):
    return "[" + ", ".join("[" + ", ".join(map(str, s)) + "]" for s in subs) + "]"


raw = [2, 1, 2]
print("no skip, unsorted:  " + fmt(subsets(raw, False)))
print("no skip, sorted:    " + fmt(subsets(sorted(raw), False)))
print("sorted + skip rule: " + fmt(subsets(sorted(raw), True)))
print("[2, 2, 2] unique:   " + fmt(subsets([2, 2, 2], True)))

for n in [0, 1, 5, 10, 16]:
    subs = subsets(list(range(1, n + 1)), False)
    stored = sum(len(s) for s in subs)
    print("n = " + str(n) + ": " + str(len(subs)) + " subsets, " + str(stored) + " numbers stored")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an array of distinct integers, return every possible subset — the power set. Code it in JavaScript, then tell me what changes if the array can contain duplicates."

**What a strong answer should cover:**
- Every element is either in or out, so there are 2^n subsets including the empty one; that bounds both time and output size.
- A backtracking solution (loop from a start index, choose / recurse with i + 1 / un-choose) and why the start index prevents reordered repeats.
- At least one alternative: the iterative doubling (cascade) or the bitmask from 0 to 2^n - 1.
- Complexity O(n · 2^n) time and output, O(n) extra space for the recursion, and why it cannot be beaten when every subset must be listed.
- Duplicates (Subsets II): sort, then skip a value equal to the previous one at the same level (\`i > start\`).
- JavaScript details: record \`[...path]\` (a copy) not \`path\`; sort numbers with \`(a, b) => a - b\` because the default sort compares strings; \`1 << n\` is a 32-bit operation, so bitmasks break at n = 31.

**Clarifying questions expected:**
- Can the input contain duplicates, and if so should equal subsets appear once?
- Does the order of the subsets (or inside each subset) matter?
- How large can n get? (2^n grows very fast.)

**Code / implementation expected:** Yes — a backtracking function in JavaScript returning an array of arrays, plus the sort-and-skip change for duplicates.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and basic recursion  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A pizza place offers three extra toppings: mushrooms, olives and peppers. How many different pizzas can you order? For each topping you make one yes/no decision — on or off — so there are 2 × 2 × 2 = 8 pizzas, from the plain one (no toppings) to the one with everything.

Listing those 8 pizzas is exactly this problem. With 10 toppings it is 1,024 pizzas, with 20 it is over a million. The idea stays the same: walk through the toppings and, for each one, try *with* and *without*. That walk is the simplest example of [backtracking](/interview-question/what-is-backtracking).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the input contain duplicates? | With \`[1, 2, 2]\`, \`[1, 2]\` could appear twice; removing that needs a sort and a skip rule (section 6). |
| Should the empty subset be included? | Mathematically yes; almost every version of this problem expects \`[]\` in the answer. |
| Does the order of the output matter? | Each method produces a different order (section 7); if a specific order is required, pick the method that gives it or sort afterwards. |
| How large can n be? | The answer has 2^n entries, so n beyond about 20 to 25 is impractical to list; it tells you a polynomial solution is not expected. |
| Return them, or just count / process them? | Counting is simply 2^n; processing one at a time avoids storing them all. |

## 3. The Core Idea

For an array of n distinct numbers, every subset is described by n yes/no decisions: is element 0 in, is element 1 in, and so on. Two choices, n times, gives 2^n subsets.

📌 **Interview term: Subset** — any selection of elements from the array, in their original relative order, including none of them (the empty subset) and all of them.

📌 **Interview term: Power set** — the set of all subsets of a set. For n elements it has 2^n members.

📌 **Interview term: Include / exclude decision** — the binary choice made for each element; the decisions together identify exactly one subset.

The most common backtracking version does not walk the yes/no tree directly. Instead, every call **records the current path as a subset**, then tries adding each *later* element. Its recursion tree for \`[1, 2, 3]\` has exactly 8 nodes, and each node is one answer:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 350" role="img" aria-label="Recursion tree of the loop version for 1, 2, 3. Every one of the eight nodes is a subset">
  <path class="d-edge" d="M 340 57 L 150 113"/>
  <path class="d-edge" d="M 340 57 L 400 113"/>
  <path class="d-edge" d="M 340 57 L 580 113"/>
  <path class="d-edge" d="M 150 147 L 80 203"/>
  <path class="d-edge" d="M 150 147 L 230 203"/>
  <path class="d-edge" d="M 400 147 L 400 203"/>
  <path class="d-edge" d="M 80 237 L 80 293"/>
  <rect class="d-box-accent" x="295" y="23" width="90" height="34" rx="6"/>
  <text class="d-text" x="340" y="45" text-anchor="middle">[ ]</text>
  <rect class="d-box-accent" x="105" y="113" width="90" height="34" rx="6"/>
  <text class="d-text" x="150" y="135" text-anchor="middle">[1]</text>
  <rect class="d-box-accent" x="355" y="113" width="90" height="34" rx="6"/>
  <text class="d-text" x="400" y="135" text-anchor="middle">[2]</text>
  <rect class="d-box-accent" x="535" y="113" width="90" height="34" rx="6"/>
  <text class="d-text" x="580" y="135" text-anchor="middle">[3]</text>
  <rect class="d-box-accent" x="35" y="203" width="90" height="34" rx="6"/>
  <text class="d-text" x="80" y="225" text-anchor="middle">[1, 2]</text>
  <rect class="d-box-accent" x="185" y="203" width="90" height="34" rx="6"/>
  <text class="d-text" x="230" y="225" text-anchor="middle">[1, 3]</text>
  <rect class="d-box-accent" x="355" y="203" width="90" height="34" rx="6"/>
  <text class="d-text" x="400" y="225" text-anchor="middle">[2, 3]</text>
  <rect class="d-box-accent" x="35" y="293" width="90" height="34" rx="6"/>
  <text class="d-text" x="80" y="315" text-anchor="middle">[1, 2, 3]</text>
  <text class="d-sub" x="560" y="225">start index rule:</text>
  <text class="d-sub" x="560" y="250">only add later items</text>
</svg>

Reading the tree in depth-first order (root, then left subtree, then right) gives \`[]\`, \`[1]\`, \`[1, 2]\`, \`[1, 2, 3]\`, \`[1, 3]\`, \`[2]\`, \`[2, 3]\`, \`[3]\` — exactly the first line of example 1. \`[2]\` has no child \`[2, 1]\`, because from index 1 the loop only looks at later indices; that is what stops \`[1, 2]\` and \`[2, 1]\` from both appearing.

📌 **Interview term: Start index** — the parameter that says from which position the loop may pick the next element. Moving it to \`i + 1\` after choosing \`nums[i]\` makes every subset appear once, in increasing index order.

## 4. Four Ways to Build It in JavaScript

**A. Backtracking with a loop** — record, then extend with each later element:

~~~javascript
function subsetsLoop(nums) {
  // Backtracking: every node of the recursion tree is a subset.
  const out = [], path = [];
  function go(start) {
    out.push([...path]);                 // record a COPY of the current path
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);                // choose nums[i]
      go(i + 1);                         // only later indices: no reordered repeats
      path.pop();                        // un-choose
    }
  }
  go(0);
  return out;
}
~~~

**B. Backtracking with take / skip** — at index i, branch twice: once with \`nums[i]\`, once without. This is the include/exclude tree itself; answers appear only at the leaves (depth n):

~~~javascript
function subsetsTakeSkip(nums) {
  // Backtracking: at index i, either take nums[i] or skip it.
  const out = [], path = [];
  function go(i) {
    if (i === nums.length) {
      out.push([...path]);
      return;
    }
    path.push(nums[i]);                  // take
    go(i + 1);
    path.pop();                          // skip
    go(i + 1);
  }
  go(0);
  return out;
}
~~~

**C. Iterative cascade** — start from \`[[]]\`; for each new element, copy every subset so far and add the element to the copy. Each element doubles the list: 1 → 2 → 4 → 8.

~~~javascript
function subsetsCascade(nums) {
  // Iterative: each new element doubles the list.
  let out = [[]];
  for (const x of nums) out = out.concat(out.map((s) => [...s, x]));
  return out;
}
~~~

**D. Bitmask** — count \`mask\` from 0 to 2^n - 1; bit i of the mask says whether \`nums[i]\` is in. The numbers 0..7 written in binary are exactly the 8 include/exclude patterns:

~~~javascript
function subsetsBitmask(nums) {
  // Bit i of mask says whether nums[i] is in the subset.
  const n = nums.length, out = [];
  for (let mask = 0; mask < (1 << n); mask++) {
    const s = [];
    for (let i = 0; i < n; i++) if ((mask >> i) & 1) s.push(nums[i]);
    out.push(s);
  }
  return out;
}
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="Mask 5 has bits 0 and 2 set, so it selects nums at index 0 and 2, giving the subset 1, 3">
  <defs>
    <marker id="b31q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="55">nums</text>
  <rect class="d-box" x="130" y="30" width="60" height="40" rx="6"/>
  <text class="d-text" x="160" y="55" text-anchor="middle">1</text>
  <rect class="d-box" x="230" y="30" width="60" height="40" rx="6"/>
  <text class="d-text" x="260" y="55" text-anchor="middle">2</text>
  <rect class="d-box" x="330" y="30" width="60" height="40" rx="6"/>
  <text class="d-text" x="360" y="55" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 160 72 L 160 118"/>
  <path class="d-edge-dashed" d="M 260 72 L 260 118"/>
  <path class="d-edge-accent" d="M 360 72 L 360 118"/>
  <text class="d-text" x="20" y="145">mask 5</text>
  <rect class="d-box-accent" x="130" y="120" width="60" height="40" rx="6"/>
  <text class="d-text" x="160" y="145" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="230" y="120" width="60" height="40" rx="6"/>
  <text class="d-text" x="260" y="145" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="330" y="120" width="60" height="40" rx="6"/>
  <text class="d-text" x="360" y="145" text-anchor="middle">1</text>
  <text class="d-sub" x="160" y="190" text-anchor="middle">bit 0</text>
  <text class="d-sub" x="260" y="190" text-anchor="middle">bit 1</text>
  <text class="d-sub" x="360" y="190" text-anchor="middle">bit 2</text>
  <path class="d-edge" d="M 400 140 L 462 140" marker-end="url(#b31q2-arrow)"/>
  <rect class="d-box-accent" x="470" y="120" width="130" height="40" rx="6"/>
  <text class="d-text" x="535" y="145" text-anchor="middle">[1, 3]</text>
</svg>

Mask 5 is binary 101: bits 0 and 2 are set, so it selects \`nums[0]\` and \`nums[2]\` and produces \`[1, 3]\`. For more on reading and setting bits, see [bit manipulation tricks](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews).

📌 **Interview term: Bitmask** — an integer whose binary digits are used as a row of on/off flags, one per element.

**What to point out in this JavaScript code:**

- \`out.push([...path])\` — the spread makes a copy. Pushing \`path\` itself stores the one shared array, which is empty once every \`pop()\` has run.
- The loop version records at the *top* of every call, so every node of the tree is an answer and there is no separate base case; the loop simply does not run when \`start === nums.length\`.
- The cascade builds the new subsets with \`out.map(...)\` first and only then \`concat\`s them, so it never iterates over items it is adding.
- Bitwise operators in JavaScript convert their operands to 32-bit integers. In our run \`1 << 31\` printed \`-2147483648\` and \`1 << 32\` printed \`1\`, so the bitmask version silently breaks above n = 30. Use \`2 ** n\` for counts, or \`BigInt\` masks, if you ever need more — though 2^31 subsets is already far too many to list.
- There is no built-in power-set or combinations function in JavaScript, so interviewers expect you to write one of these.

## 5. Which Method to Choose

| Method | Order it produces for [1, 2, 3] | Strength | Weakness |
| :--- | :--- | :--- | :--- |
| A. Loop backtracking | \`[]\`, \`[1]\`, \`[1, 2]\`, \`[1, 2, 3]\`, \`[1, 3]\`, \`[2]\`, ... | extends to duplicates and pruning; the standard interview answer | recursion |
| B. Take / skip | \`[1, 2, 3]\`, \`[1, 2]\`, \`[1, 3]\`, \`[1]\`, ... \`[]\` | mirrors the yes/no reasoning exactly | twice as many calls (2^(n+1) - 1 nodes) |
| C. Cascade | \`[]\`, \`[1]\`, \`[2]\`, \`[1, 2]\`, \`[3]\`, ... | no recursion, very short | everything lives in memory at once |
| D. Bitmask | same as C | no recursion, easy to jump to the k-th subset | n is limited by the integer width |

## 6. Duplicates: Subsets II

If the input is \`[2, 1, 2]\`, the plain algorithm produces duplicate sets: \`[2]\` twice, and both \`[2, 1]\` and \`[1, 2]\`. The fix has two parts:

1. **Sort** the input, so equal values sit next to each other: \`[1, 2, 2]\`.
2. In the loop, **skip \`nums[i]\` when it equals \`nums[i - 1]\` and \`i > start\`.** Choosing the second 2 as the first pick *at this level* would rebuild exactly the subtree the first 2 already built.

~~~javascript
function subsets(nums, skipDuplicates) {
  const out = [], path = [];
  function go(start) {
    out.push([...path]);
    for (let i = start; i < nums.length; i++) {
      // Same value as the previous choice AT THIS LEVEL -> same subtree again.
      if (skipDuplicates && i > start && nums[i] === nums[i - 1]) continue;
      path.push(nums[i]);
      go(i + 1);
      path.pop();
    }
  }
  go(0);
  return out;
}
~~~

The condition is \`i > start\`, not \`i > 0\`: the second 2 is still allowed when it comes *right after* the first 2 was chosen at the level above (that is how \`[2, 2]\` and \`[1, 2, 2]\` are formed). Example 2 shows all three stages on \`[2, 1, 2]\`: unsorted with no rule, sorted with no rule (still duplicated), and sorted with the rule (6 unique subsets).

📌 **Interview term: Duplicate skipping at the same level** — in a sorted input, refusing to start a branch with a value that an earlier sibling branch already started with.

## 7. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\` (Node.js 22; the same code runs in the page). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — four ways to build the power set of [1, 2, 3], plus empty and one-element input** prints:

~~~text
backtracking, loop:  [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]
backtracking, take:  [[1, 2, 3], [1, 2], [1, 3], [1], [2, 3], [2], [3], []]
iterative cascade:   [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
bitmask:             [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
empty input:         [[]]
single element:      [[], [7]]
~~~

**Example 2 — Subsets II (duplicates) with the sort-and-skip rule, and how fast 2^n grows** prints:

~~~text
no skip, unsorted:  [[], [2], [2, 1], [2, 1, 2], [2, 2], [1], [1, 2], [2]]
no skip, sorted:    [[], [1], [1, 2], [1, 2, 2], [1, 2], [2], [2, 2], [2]]
sorted + skip rule: [[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]
[2, 2, 2] unique:   [[], [2], [2, 2], [2, 2, 2]]
n = 0: 1 subsets, 0 numbers stored
n = 1: 2 subsets, 1 numbers stored
n = 5: 32 subsets, 80 numbers stored
n = 10: 1024 subsets, 5120 numbers stored
n = 16: 65536 subsets, 524288 numbers stored
~~~

The last five lines confirm the growth: 2^n subsets and n · 2^(n-1) numbers in total (each element appears in exactly half of the subsets).

## 8. Complexity

| Method | Time | Extra space (beyond the output) | Why |
| :--- | :--- | :--- | :--- |
| A. Loop backtracking | O(n · 2^n) | O(n) | 2^n calls, each copies a path of length up to n |
| B. Take / skip | O(n · 2^n) | O(n) | 2^(n+1) - 1 calls, 2^n leaves each copy up to n |
| C. Cascade | O(n · 2^n) | O(n) | each subset is built once by copying its parent |
| D. Bitmask | O(n · 2^n) | O(n) | 2^n masks, n bit tests each |
| Output itself | — | O(n · 2^n) | n · 2^(n-1) numbers in total (524,288 for n = 16 in our run) |

Because the output already has n · 2^(n-1) numbers, no algorithm that lists every subset can be faster than O(n · 2^n). See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read these, and [space complexity of recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) for why the recursion costs only O(n).

## 9. Edge Cases

- **Empty input** → \`[[]]\`: one subset, the empty one. Example 1 prints it. Returning \`[]\` (no subsets at all) is a common mistake.
- **One element** \`[7]\` → \`[[], [7]]\`.
- **All equal values** \`[2, 2, 2]\` with the skip rule → \`[[], [2], [2, 2], [2, 2, 2]]\`: four subsets, one per count of 2s.
- **Negative numbers or zero** change nothing: subsets do not look at the values (unless you are skipping duplicates, which only compares them).
- **Large n**: n = 20 already means 1,048,576 subsets. If the real question is "is there a subset with property X?", look for a DP or pruning approach instead — for example [equal-sum partition](/interview-question/how-do-you-check-if-an-array-can-be-partitioned-into-two-equal-sum-subsets) or [bitmask DP](/interview-question/what-is-bitmask-dynamic-programming).

## Common Pitfalls

- **\`out.push(path)\` without a copy.** Every stored subset is the same array; at the end they are all \`[]\`. Use \`[...path]\` or \`path.slice()\`.
- **Sorting with the default comparator.** \`[10, 1, 2].sort()\` gave \`[ 1, 10, 2 ]\` in our run because it compares strings. Pass \`(a, b) => a - b\` before using the duplicate-skip rule.
- **Skipping duplicates without sorting first.** The \`nums[i] === nums[i - 1]\` test only works when equal values are neighbours. Our run on unsorted \`[2, 1, 2]\` without the rule produced \`[2]\` twice and both \`[2, 1]\` and \`[1, 2]\`.
- **\`i > 0\` instead of \`i > start\` in the skip rule.** That also skips the second 2 when it is the first choice at a deeper level, so \`[1, 2, 2]\` and \`[2, 2]\` disappear.
- **Recursing with \`i\` instead of \`i + 1\`.** The same element is picked again and again (that is [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem)) and the path keeps growing until the engine throws a stack-overflow \`RangeError\`.
- **De-duplicating with a \`Set\` of arrays.** Arrays compare by reference, so a \`Set\` keeps every one of them. You would need string keys such as \`s.join(",")\`; the skip rule avoids creating duplicates at all.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Count first:</strong> <span style="color:#f0e2c8;">every element is in or out, so there are 2^n subsets, including the empty one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">backtracking: record the path at every call, loop i from start, choose nums[i], recurse with i + 1, un-choose.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Alternatives:</strong> <span style="color:#f0e2c8;">the iterative cascade doubles the list per element; a bitmask from 0 to 2^n - 1 reads bit i as include nums[i].</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n · 2^n) time and output, O(n) extra space; optimal because the output itself is that big. Duplicates: sort and skip equal values when i &gt; start.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...path]</code>, sort with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a - b</code>, and remember <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 &lt;&lt; n</code> is 32-bit.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is every subset in your result empty?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push(path)</code> stored the same array, emptied by the final <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>. Push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...path]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle duplicates in the input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort numerically, then skip <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt; start &amp;&amp; nums[i] === nums[i - 1]</code>. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 2]</code> that gives 6 subsets instead of 8.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does your bitmask version work for 40 elements?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 &lt;&lt; 40</code> is computed on 32-bit integers. It would need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code>, but 2^40 subsets cannot be listed anyway; for large n you count or sample instead of enumerating.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the time complexity, and can you beat it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n · 2^n): 2^n subsets, each copied in up to n steps. You cannot beat it when the output itself has n · 2^(n-1) numbers (524,288 for n = 16 in our run).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you produce subsets lazily?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Write a generator: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function* go(start)</code> that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield [...path]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield* go(i + 1)</code>. The caller can stop after the first few without building all 2^n.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subset** | Any selection of the elements, including none and all |
| **Power set** | The set of all 2^n subsets |
| **Include / exclude decision** | The yes/no choice made for each element |
| **Start index** | Where the loop may pick the next element; i + 1 prevents reordered repeats |
| **Bitmask** | An integer used as a row of on/off flags |
| **Duplicate skipping at the same level** | In sorted input, do not start a branch with a value a sibling already used |

---
**Conclusion:** In JavaScript, the subsets problem is a short recursive closure: push \`[...path]\` at every call, loop \`i\` from \`start\`, \`push\`, recurse with \`i + 1\`, \`pop\`. The cascade and the bitmask loop give the same 2^n sets in a different order (the bitmask only up to 30 elements, because bitwise operators are 32-bit), and duplicates need only a numeric sort plus the \`i > start\` skip rule. The same template with one change — which elements are allowed next — gives [permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array), and with a running sum it gives [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem).`,
        examples: [
          {
            label: "Power set four ways: loop backtracking, take/skip, cascade, bitmask",
            code: `// Four ways to generate every subset (the power set) of an array.

function subsetsLoop(nums) {
  // Backtracking: every node of the recursion tree is a subset.
  const out = [], path = [];
  function go(start) {
    out.push([...path]);                 // record a COPY of the current path
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);                // choose nums[i]
      go(i + 1);                         // only later indices: no reordered repeats
      path.pop();                        // un-choose
    }
  }
  go(0);
  return out;
}

function subsetsTakeSkip(nums) {
  // Backtracking: at index i, either take nums[i] or skip it.
  const out = [], path = [];
  function go(i) {
    if (i === nums.length) {
      out.push([...path]);
      return;
    }
    path.push(nums[i]);                  // take
    go(i + 1);
    path.pop();                          // skip
    go(i + 1);
  }
  go(0);
  return out;
}

function subsetsCascade(nums) {
  // Iterative: each new element doubles the list.
  let out = [[]];
  for (const x of nums) out = out.concat(out.map((s) => [...s, x]));
  return out;
}

function subsetsBitmask(nums) {
  // Bit i of mask says whether nums[i] is in the subset.
  const n = nums.length, out = [];
  for (let mask = 0; mask < (1 << n); mask++) {
    const s = [];
    for (let i = 0; i < n; i++) if ((mask >> i) & 1) s.push(nums[i]);
    out.push(s);
  }
  return out;
}

const fmt = (subs) => "[" + subs.map((s) => "[" + s.join(", ") + "]").join(", ") + "]";

const nums = [1, 2, 3];
console.log("backtracking, loop:  " + fmt(subsetsLoop(nums)));
console.log("backtracking, take:  " + fmt(subsetsTakeSkip(nums)));
console.log("iterative cascade:   " + fmt(subsetsCascade(nums)));
console.log("bitmask:             " + fmt(subsetsBitmask(nums)));
console.log("empty input:         " + fmt(subsetsLoop([])));
console.log("single element:      " + fmt(subsetsLoop([7])));`,
          },
          {
            label: "Subsets II: sort + skip duplicates, and output size for n up to 16",
            code: `// Subsets II (input with duplicates) and how fast the output grows.

function subsets(nums, skipDuplicates) {
  const out = [], path = [];
  function go(start) {
    out.push([...path]);
    for (let i = start; i < nums.length; i++) {
      // Same value as the previous choice AT THIS LEVEL -> same subtree again.
      if (skipDuplicates && i > start && nums[i] === nums[i - 1]) continue;
      path.push(nums[i]);
      go(i + 1);
      path.pop();
    }
  }
  go(0);
  return out;
}

const fmt = (subs) => "[" + subs.map((s) => "[" + s.join(", ") + "]").join(", ") + "]";
const sortedCopy = (a) => [...a].sort((x, y) => x - y);   // numeric compare, not the default string sort

const raw = [2, 1, 2];
console.log("no skip, unsorted:  " + fmt(subsets(raw, false)));
console.log("no skip, sorted:    " + fmt(subsets(sortedCopy(raw), false)));
console.log("sorted + skip rule: " + fmt(subsets(sortedCopy(raw), true)));
console.log("[2, 2, 2] unique:   " + fmt(subsets([2, 2, 2], true)));

for (const n of [0, 1, 5, 10, 16]) {
  const nums = Array.from({ length: n }, (_, i) => i + 1);
  const subs = subsets(nums, false);
  const stored = subs.reduce((acc, s) => acc + s.length, 0);
  console.log("n = " + n + ": " + subs.length + " subsets, " + stored + " numbers stored");
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an int array of distinct values, return every possible subset as a \`List<List<Integer>>\`. Code it in Java, then tell me what changes if the array can contain duplicates."

**What a strong answer should cover:**
- Every element is either in or out, so there are 2^n subsets including the empty one; that bounds both time and output size.
- A backtracking solution (loop from a start index, choose / recurse with i + 1 / un-choose) and why the start index prevents reordered repeats.
- At least one alternative: the iterative doubling (cascade) or the bitmask from 0 to 2^n - 1.
- Complexity O(n · 2^n) time and output, O(n) extra space for the recursion, and why it cannot be beaten when every subset must be listed.
- Duplicates (Subsets II): sort, then skip a value equal to the previous one at the same level (\`i > start\`).
- Java details: add \`new ArrayList<>(path)\` (a copy) not \`path\`; undo with \`path.remove(path.size() - 1)\` (by index); \`1 << n\` is a 32-bit \`int\` shift, so use \`1L << n\` beyond 30.

**Clarifying questions expected:**
- Can the input contain duplicates, and if so should equal subsets appear once?
- Does the order of the subsets (or inside each subset) matter?
- How large can n get? (2^n grows very fast.)

**Code / implementation expected:** Yes — a backtracking method in Java returning \`List<List<Integer>>\`, plus the sort-and-skip change for duplicates.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and basic recursion  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A pizza place offers three extra toppings: mushrooms, olives and peppers. How many different pizzas can you order? For each topping you make one yes/no decision — on or off — so there are 2 × 2 × 2 = 8 pizzas, from the plain one (no toppings) to the one with everything.

Listing those 8 pizzas is exactly this problem. With 10 toppings it is 1,024 pizzas, with 20 it is over a million. The idea stays the same: walk through the toppings and, for each one, try *with* and *without*. That walk is the simplest example of [backtracking](/interview-question/what-is-backtracking).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the input contain duplicates? | With \`[1, 2, 2]\`, \`[1, 2]\` could appear twice; removing that needs a sort and a skip rule (section 6). |
| Should the empty subset be included? | Mathematically yes; almost every version of this problem expects \`[]\` in the answer. |
| Does the order of the output matter? | Each method produces a different order (section 7); if a specific order is required, pick the method that gives it or sort afterwards. |
| How large can n be? | The answer has 2^n entries, so n beyond about 20 to 25 is impractical to list; it tells you a polynomial solution is not expected. |
| Return them, or just count / process them? | Counting is simply 2^n; processing one at a time avoids storing them all. |

## 3. The Core Idea

For an array of n distinct numbers, every subset is described by n yes/no decisions: is element 0 in, is element 1 in, and so on. Two choices, n times, gives 2^n subsets.

📌 **Interview term: Subset** — any selection of elements from the array, in their original relative order, including none of them (the empty subset) and all of them.

📌 **Interview term: Power set** — the set of all subsets of a set. For n elements it has 2^n members.

📌 **Interview term: Include / exclude decision** — the binary choice made for each element; the decisions together identify exactly one subset.

The most common backtracking version does not walk the yes/no tree directly. Instead, every call **records the current path as a subset**, then tries adding each *later* element. Its recursion tree for \`[1, 2, 3]\` has exactly 8 nodes, and each node is one answer:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 350" role="img" aria-label="Recursion tree of the loop version for 1, 2, 3. Every one of the eight nodes is a subset">
  <path class="d-edge" d="M 340 57 L 150 113"/>
  <path class="d-edge" d="M 340 57 L 400 113"/>
  <path class="d-edge" d="M 340 57 L 580 113"/>
  <path class="d-edge" d="M 150 147 L 80 203"/>
  <path class="d-edge" d="M 150 147 L 230 203"/>
  <path class="d-edge" d="M 400 147 L 400 203"/>
  <path class="d-edge" d="M 80 237 L 80 293"/>
  <rect class="d-box-accent" x="295" y="23" width="90" height="34" rx="6"/>
  <text class="d-text" x="340" y="45" text-anchor="middle">[ ]</text>
  <rect class="d-box-accent" x="105" y="113" width="90" height="34" rx="6"/>
  <text class="d-text" x="150" y="135" text-anchor="middle">[1]</text>
  <rect class="d-box-accent" x="355" y="113" width="90" height="34" rx="6"/>
  <text class="d-text" x="400" y="135" text-anchor="middle">[2]</text>
  <rect class="d-box-accent" x="535" y="113" width="90" height="34" rx="6"/>
  <text class="d-text" x="580" y="135" text-anchor="middle">[3]</text>
  <rect class="d-box-accent" x="35" y="203" width="90" height="34" rx="6"/>
  <text class="d-text" x="80" y="225" text-anchor="middle">[1, 2]</text>
  <rect class="d-box-accent" x="185" y="203" width="90" height="34" rx="6"/>
  <text class="d-text" x="230" y="225" text-anchor="middle">[1, 3]</text>
  <rect class="d-box-accent" x="355" y="203" width="90" height="34" rx="6"/>
  <text class="d-text" x="400" y="225" text-anchor="middle">[2, 3]</text>
  <rect class="d-box-accent" x="35" y="293" width="90" height="34" rx="6"/>
  <text class="d-text" x="80" y="315" text-anchor="middle">[1, 2, 3]</text>
  <text class="d-sub" x="560" y="225">start index rule:</text>
  <text class="d-sub" x="560" y="250">only add later items</text>
</svg>

Reading the tree in depth-first order (root, then left subtree, then right) gives \`[]\`, \`[1]\`, \`[1, 2]\`, \`[1, 2, 3]\`, \`[1, 3]\`, \`[2]\`, \`[2, 3]\`, \`[3]\` — exactly the first line of example 1. \`[2]\` has no child \`[2, 1]\`, because from index 1 the loop only looks at later indices; that is what stops \`[1, 2]\` and \`[2, 1]\` from both appearing.

📌 **Interview term: Start index** — the parameter that says from which position the loop may pick the next element. Moving it to \`i + 1\` after choosing \`nums[i]\` makes every subset appear once, in increasing index order.

## 4. Four Ways to Build It in Java

**A. Backtracking with a loop** — record, then extend with each later element:

~~~java
// Backtracking: every node of the recursion tree is a subset.
static void loop(int[] nums, int start, List<Integer> path, List<List<Integer>> out) {
    out.add(new ArrayList<>(path));            // record a COPY of the current path
    for (int i = start; i < nums.length; i++) {
        path.add(nums[i]);                     // choose nums[i]
        loop(nums, i + 1, path, out);          // only later indices: no reordered repeats
        path.remove(path.size() - 1);          // un-choose (by index, not by value)
    }
}
~~~

**B. Backtracking with take / skip** — at index i, branch twice: once with \`nums[i]\`, once without. This is the include/exclude tree itself; answers appear only at the leaves (depth n):

~~~java
// Backtracking: at index i, either take nums[i] or skip it.
static void takeSkip(int[] nums, int i, List<Integer> path, List<List<Integer>> out) {
    if (i == nums.length) {
        out.add(new ArrayList<>(path));
        return;
    }
    path.add(nums[i]);                         // take
    takeSkip(nums, i + 1, path, out);
    path.remove(path.size() - 1);              // skip
    takeSkip(nums, i + 1, path, out);
}
~~~

**C. Iterative cascade** — start from \`[[]]\`; for each new element, copy every subset so far and add the element to the copy. Each element doubles the list: 1 → 2 → 4 → 8.

~~~java
// Iterative: each new element doubles the list.
static List<List<Integer>> subsetsCascade(int[] nums) {
    List<List<Integer>> out = new ArrayList<>();
    out.add(new ArrayList<>());
    for (int x : nums) {
        int size = out.size();                 // freeze the size before adding
        for (int k = 0; k < size; k++) {
            List<Integer> s = new ArrayList<>(out.get(k));
            s.add(x);
            out.add(s);
        }
    }
    return out;
}
~~~

**D. Bitmask** — count \`mask\` from 0 to 2^n - 1; bit i of the mask says whether \`nums[i]\` is in. The numbers 0..7 written in binary are exactly the 8 include/exclude patterns:

~~~java
// Bit i of mask says whether nums[i] is in the subset.
static List<List<Integer>> subsetsBitmask(int[] nums) {
    int n = nums.length;
    List<List<Integer>> out = new ArrayList<>();
    for (int mask = 0; mask < (1 << n); mask++) {
        List<Integer> s = new ArrayList<>();
        for (int i = 0; i < n; i++) if (((mask >> i) & 1) == 1) s.add(nums[i]);
        out.add(s);
    }
    return out;
}
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="Mask 5 has bits 0 and 2 set, so it selects nums at index 0 and 2, giving the subset 1, 3">
  <defs>
    <marker id="b31q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="55">nums</text>
  <rect class="d-box" x="130" y="30" width="60" height="40" rx="6"/>
  <text class="d-text" x="160" y="55" text-anchor="middle">1</text>
  <rect class="d-box" x="230" y="30" width="60" height="40" rx="6"/>
  <text class="d-text" x="260" y="55" text-anchor="middle">2</text>
  <rect class="d-box" x="330" y="30" width="60" height="40" rx="6"/>
  <text class="d-text" x="360" y="55" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 160 72 L 160 118"/>
  <path class="d-edge-dashed" d="M 260 72 L 260 118"/>
  <path class="d-edge-accent" d="M 360 72 L 360 118"/>
  <text class="d-text" x="20" y="145">mask 5</text>
  <rect class="d-box-accent" x="130" y="120" width="60" height="40" rx="6"/>
  <text class="d-text" x="160" y="145" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="230" y="120" width="60" height="40" rx="6"/>
  <text class="d-text" x="260" y="145" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="330" y="120" width="60" height="40" rx="6"/>
  <text class="d-text" x="360" y="145" text-anchor="middle">1</text>
  <text class="d-sub" x="160" y="190" text-anchor="middle">bit 0</text>
  <text class="d-sub" x="260" y="190" text-anchor="middle">bit 1</text>
  <text class="d-sub" x="360" y="190" text-anchor="middle">bit 2</text>
  <path class="d-edge" d="M 400 140 L 462 140" marker-end="url(#b31q2-arrow)"/>
  <rect class="d-box-accent" x="470" y="120" width="130" height="40" rx="6"/>
  <text class="d-text" x="535" y="145" text-anchor="middle">[1, 3]</text>
</svg>

Mask 5 is binary 101: bits 0 and 2 are set, so it selects \`nums[0]\` and \`nums[2]\` and produces \`[1, 3]\`. For more on reading and setting bits, see [bit manipulation tricks](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews).

📌 **Interview term: Bitmask** — an integer whose binary digits are used as a row of on/off flags, one per element.

**What to point out in this Java code:**

- \`out.add(new ArrayList<>(path))\` copies the current path. Adding \`path\` itself stores the one shared list, which is empty after the last undo.
- \`path.remove(path.size() - 1)\` calls \`remove(int index)\`. On a \`List<Integer>\`, \`remove(Object)\` removes by value instead — in our check, \`remove(0)\` on \`[5, 0, 7]\` gave \`[0, 7]\` while \`remove(Integer.valueOf(0))\` gave \`[5, 7]\`.
- In the cascade, \`int size = out.size()\` is read before the inner loop. Iterating \`for (List<Integer> s : out)\` while adding to \`out\` threw \`java.util.ConcurrentModificationException\` in our check.
- \`1 << n\` is an \`int\` shift and Java uses only the low 5 bits of the shift count: in our run \`1 << 31\` printed \`-2147483648\` and \`1 << 32\` printed \`1\`. Use \`1L << n\` (a \`long\`) above 30 elements — though 2^31 subsets would not fit in memory anyway.
- \`List.toString()\` prints \`[[], [1], [1, 2]]\`, which is why the Java example can print the result directly.

## 5. Which Method to Choose

| Method | Order it produces for [1, 2, 3] | Strength | Weakness |
| :--- | :--- | :--- | :--- |
| A. Loop backtracking | \`[]\`, \`[1]\`, \`[1, 2]\`, \`[1, 2, 3]\`, \`[1, 3]\`, \`[2]\`, ... | extends to duplicates and pruning; the standard interview answer | recursion |
| B. Take / skip | \`[1, 2, 3]\`, \`[1, 2]\`, \`[1, 3]\`, \`[1]\`, ... \`[]\` | mirrors the yes/no reasoning exactly | twice as many calls (2^(n+1) - 1 nodes) |
| C. Cascade | \`[]\`, \`[1]\`, \`[2]\`, \`[1, 2]\`, \`[3]\`, ... | no recursion, very short | everything lives in memory at once |
| D. Bitmask | same as C | no recursion, easy to jump to the k-th subset | n is limited by the integer width |

## 6. Duplicates: Subsets II

If the input is \`[2, 1, 2]\`, the plain algorithm produces duplicate sets: \`[2]\` twice, and both \`[2, 1]\` and \`[1, 2]\`. The fix has two parts:

1. **Sort** the input, so equal values sit next to each other: \`[1, 2, 2]\`.
2. In the loop, **skip \`nums[i]\` when it equals \`nums[i - 1]\` and \`i > start\`.** Choosing the second 2 as the first pick *at this level* would rebuild exactly the subtree the first 2 already built.

~~~java
static void go(int[] nums, boolean skip, int start, List<Integer> path, List<List<Integer>> out) {
    out.add(new ArrayList<>(path));
    for (int i = start; i < nums.length; i++) {
        // Same value as the previous choice AT THIS LEVEL -> same subtree again.
        if (skip && i > start && nums[i] == nums[i - 1]) continue;
        path.add(nums[i]);
        go(nums, skip, i + 1, path, out);
        path.remove(path.size() - 1);
    }
}
~~~

The condition is \`i > start\`, not \`i > 0\`: the second 2 is still allowed when it comes *right after* the first 2 was chosen at the level above (that is how \`[2, 2]\` and \`[1, 2, 2]\` are formed). Example 2 shows all three stages on \`[2, 1, 2]\`: unsorted with no rule, sorted with no rule (still duplicated), and sorted with the rule (6 unique subsets).

📌 **Interview term: Duplicate skipping at the same level** — in a sorted input, refusing to start a branch with a value that an earlier sibling branch already started with.

## 7. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — four ways to build the power set of [1, 2, 3], plus empty and one-element input** prints:

~~~text
backtracking, loop:  [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]
backtracking, take:  [[1, 2, 3], [1, 2], [1, 3], [1], [2, 3], [2], [3], []]
iterative cascade:   [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
bitmask:             [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
empty input:         [[]]
single element:      [[], [7]]
~~~

**Example 2 — Subsets II (duplicates) with the sort-and-skip rule, and how fast 2^n grows** prints:

~~~text
no skip, unsorted:  [[], [2], [2, 1], [2, 1, 2], [2, 2], [1], [1, 2], [2]]
no skip, sorted:    [[], [1], [1, 2], [1, 2, 2], [1, 2], [2], [2, 2], [2]]
sorted + skip rule: [[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]
[2, 2, 2] unique:   [[], [2], [2, 2], [2, 2, 2]]
n = 0: 1 subsets, 0 numbers stored
n = 1: 2 subsets, 1 numbers stored
n = 5: 32 subsets, 80 numbers stored
n = 10: 1024 subsets, 5120 numbers stored
n = 16: 65536 subsets, 524288 numbers stored
~~~

The last five lines confirm the growth: 2^n subsets and n · 2^(n-1) numbers in total (each element appears in exactly half of the subsets).

## 8. Complexity

| Method | Time | Extra space (beyond the output) | Why |
| :--- | :--- | :--- | :--- |
| A. Loop backtracking | O(n · 2^n) | O(n) | 2^n calls, each copies a path of length up to n |
| B. Take / skip | O(n · 2^n) | O(n) | 2^(n+1) - 1 calls, 2^n leaves each copy up to n |
| C. Cascade | O(n · 2^n) | O(n) | each subset is built once by copying its parent |
| D. Bitmask | O(n · 2^n) | O(n) | 2^n masks, n bit tests each |
| Output itself | — | O(n · 2^n) | n · 2^(n-1) numbers in total (524,288 for n = 16 in our run) |

Because the output already has n · 2^(n-1) numbers, no algorithm that lists every subset can be faster than O(n · 2^n). See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read these, and [space complexity of recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) for why the recursion costs only O(n).

## 9. Edge Cases

- **Empty input** → \`[[]]\`: one subset, the empty one. Example 1 prints it. Returning \`[]\` (no subsets at all) is a common mistake.
- **One element** \`[7]\` → \`[[], [7]]\`.
- **All equal values** \`[2, 2, 2]\` with the skip rule → \`[[], [2], [2, 2], [2, 2, 2]]\`: four subsets, one per count of 2s.
- **Negative numbers or zero** change nothing: subsets do not look at the values (unless you are skipping duplicates, which only compares them).
- **Large n**: n = 20 already means 1,048,576 subsets. If the real question is "is there a subset with property X?", look for a DP or pruning approach instead — for example [equal-sum partition](/interview-question/how-do-you-check-if-an-array-can-be-partitioned-into-two-equal-sum-subsets) or [bitmask DP](/interview-question/what-is-bitmask-dynamic-programming).

## Common Pitfalls

- **\`out.add(path)\` without a copy.** Every stored subset is the same \`ArrayList\`; at the end they are all \`[]\`. Use \`new ArrayList<>(path)\`.
- **\`path.remove(x)\` with a value.** With an \`int\` argument it removes by index; with an \`Integer\` by value. Undo the last choice with \`remove(path.size() - 1)\`.
- **Skipping duplicates without sorting first.** The \`nums[i] == nums[i - 1]\` test needs \`Arrays.sort(nums)\` first. Our run on unsorted \`[2, 1, 2]\` without the rule produced \`[2]\` twice and both \`[2, 1]\` and \`[1, 2]\`.
- **\`i > 0\` instead of \`i > start\` in the skip rule.** That also skips the second 2 when it is the first choice at a deeper level, so \`[1, 2, 2]\` and \`[2, 2]\` disappear.
- **Modifying \`out\` while iterating it** (cascade) throws \`ConcurrentModificationException\`; freeze the size first.
- **Comparing \`Integer\` objects with \`==\`.** Fine for small values that Java caches, wrong for larger ones; compare \`int\` values or use \`equals\`. The examples compare primitive \`int[]\` elements, so they are safe.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Count first:</strong> <span style="color:#f0e2c8;">every element is in or out, so there are 2^n subsets, including the empty one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">backtracking: record the path at every call, loop i from start, choose nums[i], recurse with i + 1, un-choose.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Alternatives:</strong> <span style="color:#f0e2c8;">the iterative cascade doubles the list per element; a bitmask from 0 to 2^n - 1 reads bit i as include nums[i].</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n · 2^n) time and output, O(n) extra space; optimal because the output itself is that big. Duplicates: sort and skip equal values when i &gt; start.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new ArrayList&lt;&gt;(path)</code>, undo with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove(path.size() - 1)</code>, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1L &lt;&lt; n</code> if you ever shift past 30.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are all your subsets empty lists?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You added the shared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> itself; every entry is the same list, emptied by the last undo. Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new ArrayList&lt;&gt;(path)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle duplicates in the input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort(nums)</code>, then skip <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt; start &amp;&amp; nums[i] == nums[i - 1]</code>. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 2]</code> that gives 6 subsets instead of 8.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">remove(path.size() - 1)</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">remove(nums[i])</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove(int)</code> is by index, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove(nums[i])</code> would delete position <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> — the wrong element, or an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IndexOutOfBoundsException</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the time complexity, and can you beat it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n · 2^n): 2^n subsets, each copied in up to n steps. You cannot beat it when the output itself has n · 2^(n-1) numbers (524,288 for n = 16 in our run).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use a bitmask for 40 elements?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1L &lt;&lt; i</code>), and 2^40 lists will never fit in the heap. For large n you count subsets with DP instead of listing them.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subset** | Any selection of the elements, including none and all |
| **Power set** | The set of all 2^n subsets |
| **Include / exclude decision** | The yes/no choice made for each element |
| **Start index** | Where the loop may pick the next element; i + 1 prevents reordered repeats |
| **Bitmask** | An integer used as a row of on/off flags |
| **Duplicate skipping at the same level** | In sorted input, do not start a branch with a value a sibling already used |

---
**Conclusion:** In Java, the subsets problem is a recursive method with a shared \`ArrayList<Integer>\`: add \`new ArrayList<>(path)\` at every call, loop \`i\` from \`start\`, \`add\`, recurse with \`i + 1\`, \`remove(path.size() - 1)\`. The cascade and the bitmask loop give the same 2^n sets in a different order, and duplicates need only \`Arrays.sort\` plus the \`i > start\` skip rule. The same template with one change — which elements are allowed next — gives [permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array), and with a running sum it gives [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem).`,
        examples: [
          {
            label: "Power set four ways: loop backtracking, take/skip, cascade, bitmask",
            code: `import java.util.ArrayList;
import java.util.List;

// Four ways to generate every subset (the power set) of an array.
public class Main {
    // Backtracking: every node of the recursion tree is a subset.
    static void loop(int[] nums, int start, List<Integer> path, List<List<Integer>> out) {
        out.add(new ArrayList<>(path));            // record a COPY of the current path
        for (int i = start; i < nums.length; i++) {
            path.add(nums[i]);                     // choose nums[i]
            loop(nums, i + 1, path, out);          // only later indices: no reordered repeats
            path.remove(path.size() - 1);          // un-choose (by index, not by value)
        }
    }

    // Backtracking: at index i, either take nums[i] or skip it.
    static void takeSkip(int[] nums, int i, List<Integer> path, List<List<Integer>> out) {
        if (i == nums.length) {
            out.add(new ArrayList<>(path));
            return;
        }
        path.add(nums[i]);                         // take
        takeSkip(nums, i + 1, path, out);
        path.remove(path.size() - 1);              // skip
        takeSkip(nums, i + 1, path, out);
    }

    static List<List<Integer>> subsetsLoop(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        loop(nums, 0, new ArrayList<>(), out);
        return out;
    }

    static List<List<Integer>> subsetsTakeSkip(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        takeSkip(nums, 0, new ArrayList<>(), out);
        return out;
    }

    // Iterative: each new element doubles the list.
    static List<List<Integer>> subsetsCascade(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        out.add(new ArrayList<>());
        for (int x : nums) {
            int size = out.size();                 // freeze the size before adding
            for (int k = 0; k < size; k++) {
                List<Integer> s = new ArrayList<>(out.get(k));
                s.add(x);
                out.add(s);
            }
        }
        return out;
    }

    // Bit i of mask says whether nums[i] is in the subset.
    static List<List<Integer>> subsetsBitmask(int[] nums) {
        int n = nums.length;
        List<List<Integer>> out = new ArrayList<>();
        for (int mask = 0; mask < (1 << n); mask++) {
            List<Integer> s = new ArrayList<>();
            for (int i = 0; i < n; i++) if (((mask >> i) & 1) == 1) s.add(nums[i]);
            out.add(s);
        }
        return out;
    }

    static String fmt(List<List<Integer>> subs) {
        return subs.toString();   // AbstractCollection.toString gives [[], [1], [1, 2]]
    }

    public static void main(String[] args) {
        int[] nums = {1, 2, 3};
        System.out.println("backtracking, loop:  " + fmt(subsetsLoop(nums)));
        System.out.println("backtracking, take:  " + fmt(subsetsTakeSkip(nums)));
        System.out.println("iterative cascade:   " + fmt(subsetsCascade(nums)));
        System.out.println("bitmask:             " + fmt(subsetsBitmask(nums)));
        System.out.println("empty input:         " + fmt(subsetsLoop(new int[] {})));
        System.out.println("single element:      " + fmt(subsetsLoop(new int[] {7})));
    }
}`,
          },
          {
            label: "Subsets II: sort + skip duplicates, and output size for n up to 16",
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

// Subsets II (input with duplicates) and how fast the output grows.
public class Main {
    static void go(int[] nums, boolean skip, int start, List<Integer> path, List<List<Integer>> out) {
        out.add(new ArrayList<>(path));
        for (int i = start; i < nums.length; i++) {
            // Same value as the previous choice AT THIS LEVEL -> same subtree again.
            if (skip && i > start && nums[i] == nums[i - 1]) continue;
            path.add(nums[i]);
            go(nums, skip, i + 1, path, out);
            path.remove(path.size() - 1);
        }
    }

    static List<List<Integer>> subsets(int[] nums, boolean skip) {
        List<List<Integer>> out = new ArrayList<>();
        go(nums, skip, 0, new ArrayList<>(), out);
        return out;
    }

    static int[] sortedCopy(int[] a) {
        int[] c = a.clone();
        Arrays.sort(c);
        return c;
    }

    public static void main(String[] args) {
        int[] raw = {2, 1, 2};
        System.out.println("no skip, unsorted:  " + subsets(raw, false));
        System.out.println("no skip, sorted:    " + subsets(sortedCopy(raw), false));
        System.out.println("sorted + skip rule: " + subsets(sortedCopy(raw), true));
        System.out.println("[2, 2, 2] unique:   " + subsets(new int[] {2, 2, 2}, true));

        for (int n : new int[] {0, 1, 5, 10, 16}) {
            int[] nums = new int[n];
            for (int i = 0; i < n; i++) nums[i] = i + 1;
            List<List<Integer>> subs = subsets(nums, false);
            long stored = 0;
            for (List<Integer> s : subs) stored += s.size();
            System.out.println("n = " + n + ": " + subs.size() + " subsets, " + stored + " numbers stored");
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a \`vector<int>\` of distinct values, return every possible subset as a \`vector<vector<int>>\`. Code it in C++, then tell me what changes if the input can contain duplicates."

**What a strong answer should cover:**
- Every element is either in or out, so there are 2^n subsets including the empty one; that bounds both time and output size.
- A backtracking solution (loop from a start index, choose / recurse with i + 1 / un-choose) and why the start index prevents reordered repeats.
- At least one alternative: the iterative doubling (cascade) or the bitmask from 0 to 2^n - 1.
- Complexity O(n · 2^n) time and output, O(n) extra space for the recursion, and why it cannot be beaten when every subset must be listed.
- Duplicates (Subsets II): sort, then skip a value equal to the previous one at the same level (\`i > start\`).
- C++ details: pass \`path\` by reference and let \`out.push_back(path)\` copy it; never hold a reference into \`out\` while pushing to it (reallocation); \`1 << n\` on \`int\` is undefined behaviour from n = 32, so use \`1LL << n\`.

**Clarifying questions expected:**
- Can the input contain duplicates, and if so should equal subsets appear once?
- Does the order of the subsets (or inside each subset) matter?
- How large can n get? (2^n grows very fast.)

**Code / implementation expected:** Yes — a backtracking function in C++ returning \`vector<vector<int>>\`, plus the sort-and-skip change for duplicates.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and basic recursion  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A pizza place offers three extra toppings: mushrooms, olives and peppers. How many different pizzas can you order? For each topping you make one yes/no decision — on or off — so there are 2 × 2 × 2 = 8 pizzas, from the plain one (no toppings) to the one with everything.

Listing those 8 pizzas is exactly this problem. With 10 toppings it is 1,024 pizzas, with 20 it is over a million. The idea stays the same: walk through the toppings and, for each one, try *with* and *without*. That walk is the simplest example of [backtracking](/interview-question/what-is-backtracking).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the input contain duplicates? | With \`[1, 2, 2]\`, \`[1, 2]\` could appear twice; removing that needs a sort and a skip rule (section 6). |
| Should the empty subset be included? | Mathematically yes; almost every version of this problem expects \`[]\` in the answer. |
| Does the order of the output matter? | Each method produces a different order (section 7); if a specific order is required, pick the method that gives it or sort afterwards. |
| How large can n be? | The answer has 2^n entries, so n beyond about 20 to 25 is impractical to list; it tells you a polynomial solution is not expected. |
| Return them, or just count / process them? | Counting is simply 2^n; processing one at a time avoids storing them all. |

## 3. The Core Idea

For an array of n distinct numbers, every subset is described by n yes/no decisions: is element 0 in, is element 1 in, and so on. Two choices, n times, gives 2^n subsets.

📌 **Interview term: Subset** — any selection of elements from the array, in their original relative order, including none of them (the empty subset) and all of them.

📌 **Interview term: Power set** — the set of all subsets of a set. For n elements it has 2^n members.

📌 **Interview term: Include / exclude decision** — the binary choice made for each element; the decisions together identify exactly one subset.

The most common backtracking version does not walk the yes/no tree directly. Instead, every call **records the current path as a subset**, then tries adding each *later* element. Its recursion tree for \`[1, 2, 3]\` has exactly 8 nodes, and each node is one answer:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 350" role="img" aria-label="Recursion tree of the loop version for 1, 2, 3. Every one of the eight nodes is a subset">
  <path class="d-edge" d="M 340 57 L 150 113"/>
  <path class="d-edge" d="M 340 57 L 400 113"/>
  <path class="d-edge" d="M 340 57 L 580 113"/>
  <path class="d-edge" d="M 150 147 L 80 203"/>
  <path class="d-edge" d="M 150 147 L 230 203"/>
  <path class="d-edge" d="M 400 147 L 400 203"/>
  <path class="d-edge" d="M 80 237 L 80 293"/>
  <rect class="d-box-accent" x="295" y="23" width="90" height="34" rx="6"/>
  <text class="d-text" x="340" y="45" text-anchor="middle">[ ]</text>
  <rect class="d-box-accent" x="105" y="113" width="90" height="34" rx="6"/>
  <text class="d-text" x="150" y="135" text-anchor="middle">[1]</text>
  <rect class="d-box-accent" x="355" y="113" width="90" height="34" rx="6"/>
  <text class="d-text" x="400" y="135" text-anchor="middle">[2]</text>
  <rect class="d-box-accent" x="535" y="113" width="90" height="34" rx="6"/>
  <text class="d-text" x="580" y="135" text-anchor="middle">[3]</text>
  <rect class="d-box-accent" x="35" y="203" width="90" height="34" rx="6"/>
  <text class="d-text" x="80" y="225" text-anchor="middle">[1, 2]</text>
  <rect class="d-box-accent" x="185" y="203" width="90" height="34" rx="6"/>
  <text class="d-text" x="230" y="225" text-anchor="middle">[1, 3]</text>
  <rect class="d-box-accent" x="355" y="203" width="90" height="34" rx="6"/>
  <text class="d-text" x="400" y="225" text-anchor="middle">[2, 3]</text>
  <rect class="d-box-accent" x="35" y="293" width="90" height="34" rx="6"/>
  <text class="d-text" x="80" y="315" text-anchor="middle">[1, 2, 3]</text>
  <text class="d-sub" x="560" y="225">start index rule:</text>
  <text class="d-sub" x="560" y="250">only add later items</text>
</svg>

Reading the tree in depth-first order (root, then left subtree, then right) gives \`[]\`, \`[1]\`, \`[1, 2]\`, \`[1, 2, 3]\`, \`[1, 3]\`, \`[2]\`, \`[2, 3]\`, \`[3]\` — exactly the first line of example 1. \`[2]\` has no child \`[2, 1]\`, because from index 1 the loop only looks at later indices; that is what stops \`[1, 2]\` and \`[2, 1]\` from both appearing.

📌 **Interview term: Start index** — the parameter that says from which position the loop may pick the next element. Moving it to \`i + 1\` after choosing \`nums[i]\` makes every subset appear once, in increasing index order.

## 4. Four Ways to Build It in C++

**A. Backtracking with a loop** — record, then extend with each later element:

~~~cpp
// Backtracking: every node of the recursion tree is a subset.
void loop(const vector<int>& nums, size_t start, vector<int>& path, Subsets& out) {
    out.push_back(path);                       // push_back copies the vector
    for (size_t i = start; i < nums.size(); i++) {
        path.push_back(nums[i]);               // choose nums[i]
        loop(nums, i + 1, path, out);          // only later indices: no reordered repeats
        path.pop_back();                       // un-choose
    }
}
~~~

**B. Backtracking with take / skip** — at index i, branch twice: once with \`nums[i]\`, once without. This is the include/exclude tree itself; answers appear only at the leaves (depth n):

~~~cpp
// Backtracking: at index i, either take nums[i] or skip it.
void takeSkip(const vector<int>& nums, size_t i, vector<int>& path, Subsets& out) {
    if (i == nums.size()) {
        out.push_back(path);
        return;
    }
    path.push_back(nums[i]);                   // take
    takeSkip(nums, i + 1, path, out);
    path.pop_back();                           // skip
    takeSkip(nums, i + 1, path, out);
}
~~~

**C. Iterative cascade** — start from \`[[]]\`; for each new element, copy every subset so far and add the element to the copy. Each element doubles the list: 1 → 2 → 4 → 8.

~~~cpp
// Iterative: each new element doubles the list.
Subsets subsetsCascade(const vector<int>& nums) {
    Subsets out = {{}};
    for (int x : nums) {
        size_t size = out.size();              // index, not a reference: push_back may reallocate
        for (size_t k = 0; k < size; k++) {
            vector<int> s = out[k];
            s.push_back(x);
            out.push_back(s);
        }
    }
    return out;
}
~~~

**D. Bitmask** — count \`mask\` from 0 to 2^n - 1; bit i of the mask says whether \`nums[i]\` is in. The numbers 0..7 written in binary are exactly the 8 include/exclude patterns:

~~~cpp
// Bit i of mask says whether nums[i] is in the subset.
Subsets subsetsBitmask(const vector<int>& nums) {
    int n = nums.size();
    Subsets out;
    for (long long mask = 0; mask < (1LL << n); mask++) {
        vector<int> s;
        for (int i = 0; i < n; i++) if ((mask >> i) & 1) s.push_back(nums[i]);
        out.push_back(s);
    }
    return out;
}
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="Mask 5 has bits 0 and 2 set, so it selects nums at index 0 and 2, giving the subset 1, 3">
  <defs>
    <marker id="b31q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="55">nums</text>
  <rect class="d-box" x="130" y="30" width="60" height="40" rx="6"/>
  <text class="d-text" x="160" y="55" text-anchor="middle">1</text>
  <rect class="d-box" x="230" y="30" width="60" height="40" rx="6"/>
  <text class="d-text" x="260" y="55" text-anchor="middle">2</text>
  <rect class="d-box" x="330" y="30" width="60" height="40" rx="6"/>
  <text class="d-text" x="360" y="55" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 160 72 L 160 118"/>
  <path class="d-edge-dashed" d="M 260 72 L 260 118"/>
  <path class="d-edge-accent" d="M 360 72 L 360 118"/>
  <text class="d-text" x="20" y="145">mask 5</text>
  <rect class="d-box-accent" x="130" y="120" width="60" height="40" rx="6"/>
  <text class="d-text" x="160" y="145" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="230" y="120" width="60" height="40" rx="6"/>
  <text class="d-text" x="260" y="145" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="330" y="120" width="60" height="40" rx="6"/>
  <text class="d-text" x="360" y="145" text-anchor="middle">1</text>
  <text class="d-sub" x="160" y="190" text-anchor="middle">bit 0</text>
  <text class="d-sub" x="260" y="190" text-anchor="middle">bit 1</text>
  <text class="d-sub" x="360" y="190" text-anchor="middle">bit 2</text>
  <path class="d-edge" d="M 400 140 L 462 140" marker-end="url(#b31q2-arrow)"/>
  <rect class="d-box-accent" x="470" y="120" width="130" height="40" rx="6"/>
  <text class="d-text" x="535" y="145" text-anchor="middle">[1, 3]</text>
</svg>

Mask 5 is binary 101: bits 0 and 2 are set, so it selects \`nums[0]\` and \`nums[2]\` and produces \`[1, 3]\`. For more on reading and setting bits, see [bit manipulation tricks](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews).

📌 **Interview term: Bitmask** — an integer whose binary digits are used as a row of on/off flags, one per element.

**What to point out in this C++ code:**

- \`out.push_back(path)\` copies the vector, so the stored subset is independent of later \`pop_back\` calls. That is the opposite of Python, JavaScript and Java, where you must copy by hand.
- \`path\` is passed as \`vector<int>&\`. Passing by value would copy it at every call — still correct, but O(n) extra per call.
- In the cascade, the loop uses an index \`k\` and copies \`out[k]\` into \`s\` before \`push_back\`. A range-for over \`out\` (or a reference \`auto& s = out[k]\`) while pushing is undefined behaviour, because \`push_back\` may reallocate and invalidate every iterator and reference ([std::vector::push_back](https://en.cppreference.com/w/cpp/container/vector/push_back)).
- The bitmask loop uses \`long long mask\` and \`1LL << n\`. Shifting an \`int\` by 32 or more is undefined behaviour ([shift operators](https://en.cppreference.com/w/cpp/language/operator_arithmetic)), so \`1 << n\` silently breaks for large n.
- Indices are \`size_t\` to match \`nums.size()\` and avoid signed/unsigned comparison warnings.

## 5. Which Method to Choose

| Method | Order it produces for [1, 2, 3] | Strength | Weakness |
| :--- | :--- | :--- | :--- |
| A. Loop backtracking | \`[]\`, \`[1]\`, \`[1, 2]\`, \`[1, 2, 3]\`, \`[1, 3]\`, \`[2]\`, ... | extends to duplicates and pruning; the standard interview answer | recursion |
| B. Take / skip | \`[1, 2, 3]\`, \`[1, 2]\`, \`[1, 3]\`, \`[1]\`, ... \`[]\` | mirrors the yes/no reasoning exactly | twice as many calls (2^(n+1) - 1 nodes) |
| C. Cascade | \`[]\`, \`[1]\`, \`[2]\`, \`[1, 2]\`, \`[3]\`, ... | no recursion, very short | everything lives in memory at once |
| D. Bitmask | same as C | no recursion, easy to jump to the k-th subset | n is limited by the integer width |

## 6. Duplicates: Subsets II

If the input is \`[2, 1, 2]\`, the plain algorithm produces duplicate sets: \`[2]\` twice, and both \`[2, 1]\` and \`[1, 2]\`. The fix has two parts:

1. **Sort** the input, so equal values sit next to each other: \`[1, 2, 2]\`.
2. In the loop, **skip \`nums[i]\` when it equals \`nums[i - 1]\` and \`i > start\`.** Choosing the second 2 as the first pick *at this level* would rebuild exactly the subtree the first 2 already built.

~~~cpp
void go(const vector<int>& nums, bool skip, size_t start, vector<int>& path, Subsets& out) {
    out.push_back(path);
    for (size_t i = start; i < nums.size(); i++) {
        // Same value as the previous choice AT THIS LEVEL -> same subtree again.
        if (skip && i > start && nums[i] == nums[i - 1]) continue;
        path.push_back(nums[i]);
        go(nums, skip, i + 1, path, out);
        path.pop_back();
    }
}
~~~

The condition is \`i > start\`, not \`i > 0\`: the second 2 is still allowed when it comes *right after* the first 2 was chosen at the level above (that is how \`[2, 2]\` and \`[1, 2, 2]\` are formed). Example 2 shows all three stages on \`[2, 1, 2]\`: unsorted with no rule, sorted with no rule (still duplicated), and sorted with the rule (6 unique subsets).

📌 **Interview term: Duplicate skipping at the same level** — in a sorted input, refusing to start a branch with a value that an earlier sibling branch already started with.

## 7. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp -o main && ./main\` (GCC 13.3). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — four ways to build the power set of [1, 2, 3], plus empty and one-element input** prints:

~~~text
backtracking, loop:  [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]
backtracking, take:  [[1, 2, 3], [1, 2], [1, 3], [1], [2, 3], [2], [3], []]
iterative cascade:   [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
bitmask:             [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
empty input:         [[]]
single element:      [[], [7]]
~~~

**Example 2 — Subsets II (duplicates) with the sort-and-skip rule, and how fast 2^n grows** prints:

~~~text
no skip, unsorted:  [[], [2], [2, 1], [2, 1, 2], [2, 2], [1], [1, 2], [2]]
no skip, sorted:    [[], [1], [1, 2], [1, 2, 2], [1, 2], [2], [2, 2], [2]]
sorted + skip rule: [[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]
[2, 2, 2] unique:   [[], [2], [2, 2], [2, 2, 2]]
n = 0: 1 subsets, 0 numbers stored
n = 1: 2 subsets, 1 numbers stored
n = 5: 32 subsets, 80 numbers stored
n = 10: 1024 subsets, 5120 numbers stored
n = 16: 65536 subsets, 524288 numbers stored
~~~

The last five lines confirm the growth: 2^n subsets and n · 2^(n-1) numbers in total (each element appears in exactly half of the subsets).

## 8. Complexity

| Method | Time | Extra space (beyond the output) | Why |
| :--- | :--- | :--- | :--- |
| A. Loop backtracking | O(n · 2^n) | O(n) | 2^n calls, each copies a path of length up to n |
| B. Take / skip | O(n · 2^n) | O(n) | 2^(n+1) - 1 calls, 2^n leaves each copy up to n |
| C. Cascade | O(n · 2^n) | O(n) | each subset is built once by copying its parent |
| D. Bitmask | O(n · 2^n) | O(n) | 2^n masks, n bit tests each |
| Output itself | — | O(n · 2^n) | n · 2^(n-1) numbers in total (524,288 for n = 16 in our run) |

Because the output already has n · 2^(n-1) numbers, no algorithm that lists every subset can be faster than O(n · 2^n). See [Big-O notation](/interview-question/what-is-big-o-notation) for how to read these, and [space complexity of recursion](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) for why the recursion costs only O(n).

## 9. Edge Cases

- **Empty input** → \`[[]]\`: one subset, the empty one. Example 1 prints it. Returning \`[]\` (no subsets at all) is a common mistake.
- **One element** \`[7]\` → \`[[], [7]]\`.
- **All equal values** \`[2, 2, 2]\` with the skip rule → \`[[], [2], [2, 2], [2, 2, 2]]\`: four subsets, one per count of 2s.
- **Negative numbers or zero** change nothing: subsets do not look at the values (unless you are skipping duplicates, which only compares them).
- **Large n**: n = 20 already means 1,048,576 subsets. If the real question is "is there a subset with property X?", look for a DP or pruning approach instead — for example [equal-sum partition](/interview-question/how-do-you-check-if-an-array-can-be-partitioned-into-two-equal-sum-subsets) or [bitmask DP](/interview-question/what-is-bitmask-dynamic-programming).

## Common Pitfalls

- **Iterating \`out\` while pushing into it** (cascade with a range-for). Reallocation invalidates the iterators: undefined behaviour, often a crash. Loop by index over a frozen size.
- **\`1 << n\` for the mask.** \`int\` shifts are undefined at n ≥ 32; use \`1LL << n\` or \`size_t{1} << n\`.
- **Skipping duplicates without sorting first.** The \`nums[i] == nums[i - 1]\` test needs \`sort(nums.begin(), nums.end())\` first. Our run on unsorted \`[2, 1, 2]\` without the rule produced \`[2]\` twice and both \`[2, 1]\` and \`[1, 2]\`.
- **\`i > 0\` instead of \`i > start\` in the skip rule.** That also skips the second 2 when it is the first choice at a deeper level, so \`[1, 2, 2]\` and \`[2, 2]\` disappear.
- **Passing \`path\` by value by accident.** Correct output, much slower; and a \`pop_back\` on the copy does nothing for the caller.
- **\`i - 1\` with \`size_t\` when \`i == 0\`.** It wraps around to a huge number. The \`i > start\` test comes first, so \`nums[i - 1]\` is never read at \`i == 0\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Count first:</strong> <span style="color:#f0e2c8;">every element is in or out, so there are 2^n subsets, including the empty one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">backtracking: record the path at every call, loop i from start, choose nums[i], recurse with i + 1, un-choose.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Alternatives:</strong> <span style="color:#f0e2c8;">the iterative cascade doubles the list per element; a bitmask from 0 to 2^n - 1 reads bit i as include nums[i].</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n · 2^n) time and output, O(n) extra space; optimal because the output itself is that big. Duplicates: sort and skip equal values when i &gt; start.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> by reference, let <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">out.push_back(path)</code> copy it, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1LL &lt;&lt; n</code> for masks, and never iterate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">out</code> while pushing to it.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you need to copy <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">path</code> before storing it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">out.push_back(path)</code> already copies the vector. You only alias if you store pointers or references.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle duplicates in the input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort</code> first, then skip <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt; start &amp;&amp; nums[i] == nums[i - 1]</code>. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2, 2]</code> that gives 6 subsets instead of 8.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your cascade crashed. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A range-for over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">out</code> while calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">out.push_back</code> uses iterators that reallocation invalidated. Loop by index up to the size you read before the loop.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the time complexity, and can you beat it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n · 2^n): 2^n subsets, each copied in up to n steps. You cannot beat it when the output itself has n · 2^(n-1) numbers (524,288 for n = 16 in our run).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you cut memory if you only need to process each subset?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass a callback (or a lambda) and call it at each node instead of storing; extra space drops to O(n) for the path.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subset** | Any selection of the elements, including none and all |
| **Power set** | The set of all 2^n subsets |
| **Include / exclude decision** | The yes/no choice made for each element |
| **Start index** | Where the loop may pick the next element; i + 1 prevents reordered repeats |
| **Bitmask** | An integer used as a row of on/off flags |
| **Duplicate skipping at the same level** | In sorted input, do not start a branch with a value a sibling already used |

---
**Conclusion:** In C++, the subsets problem is a recursive function with \`vector<int>& path\`: \`out.push_back(path)\` at every call, loop \`i\` from \`start\`, \`push_back\`, recurse with \`i + 1\`, \`pop_back\`. The cascade and the bitmask loop give the same 2^n sets in a different order — mind iterator invalidation and \`1LL << n\` — and duplicates need only a \`sort\` plus the \`i > start\` skip rule. The same template with one change — which elements are allowed next — gives [permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array), and with a running sum it gives [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem).`,
        examples: [
          {
            label: "Power set four ways: loop backtracking, take/skip, cascade, bitmask",
            code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

// Four ways to generate every subset (the power set) of an array.
using Subsets = vector<vector<int>>;

// Backtracking: every node of the recursion tree is a subset.
void loop(const vector<int>& nums, size_t start, vector<int>& path, Subsets& out) {
    out.push_back(path);                       // push_back copies the vector
    for (size_t i = start; i < nums.size(); i++) {
        path.push_back(nums[i]);               // choose nums[i]
        loop(nums, i + 1, path, out);          // only later indices: no reordered repeats
        path.pop_back();                       // un-choose
    }
}

// Backtracking: at index i, either take nums[i] or skip it.
void takeSkip(const vector<int>& nums, size_t i, vector<int>& path, Subsets& out) {
    if (i == nums.size()) {
        out.push_back(path);
        return;
    }
    path.push_back(nums[i]);                   // take
    takeSkip(nums, i + 1, path, out);
    path.pop_back();                           // skip
    takeSkip(nums, i + 1, path, out);
}

Subsets subsetsLoop(const vector<int>& nums) {
    Subsets out;
    vector<int> path;
    loop(nums, 0, path, out);
    return out;
}

Subsets subsetsTakeSkip(const vector<int>& nums) {
    Subsets out;
    vector<int> path;
    takeSkip(nums, 0, path, out);
    return out;
}

// Iterative: each new element doubles the list.
Subsets subsetsCascade(const vector<int>& nums) {
    Subsets out = {{}};
    for (int x : nums) {
        size_t size = out.size();              // index, not a reference: push_back may reallocate
        for (size_t k = 0; k < size; k++) {
            vector<int> s = out[k];
            s.push_back(x);
            out.push_back(s);
        }
    }
    return out;
}

// Bit i of mask says whether nums[i] is in the subset.
Subsets subsetsBitmask(const vector<int>& nums) {
    int n = nums.size();
    Subsets out;
    for (long long mask = 0; mask < (1LL << n); mask++) {
        vector<int> s;
        for (int i = 0; i < n; i++) if ((mask >> i) & 1) s.push_back(nums[i]);
        out.push_back(s);
    }
    return out;
}

string fmt(const Subsets& subs) {
    string r = "[";
    for (size_t k = 0; k < subs.size(); k++) {
        if (k) r += ", ";
        r += "[";
        for (size_t i = 0; i < subs[k].size(); i++) {
            if (i) r += ", ";
            r += to_string(subs[k][i]);
        }
        r += "]";
    }
    return r + "]";
}

int main() {
    vector<int> nums = {1, 2, 3};
    cout << "backtracking, loop:  " << fmt(subsetsLoop(nums)) << "\\n";
    cout << "backtracking, take:  " << fmt(subsetsTakeSkip(nums)) << "\\n";
    cout << "iterative cascade:   " << fmt(subsetsCascade(nums)) << "\\n";
    cout << "bitmask:             " << fmt(subsetsBitmask(nums)) << "\\n";
    cout << "empty input:         " << fmt(subsetsLoop({})) << "\\n";
    cout << "single element:      " << fmt(subsetsLoop({7})) << "\\n";
}`,
          },
          {
            label: "Subsets II: sort + skip duplicates, and output size for n up to 16",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

// Subsets II (input with duplicates) and how fast the output grows.
using Subsets = vector<vector<int>>;

void go(const vector<int>& nums, bool skip, size_t start, vector<int>& path, Subsets& out) {
    out.push_back(path);
    for (size_t i = start; i < nums.size(); i++) {
        // Same value as the previous choice AT THIS LEVEL -> same subtree again.
        if (skip && i > start && nums[i] == nums[i - 1]) continue;
        path.push_back(nums[i]);
        go(nums, skip, i + 1, path, out);
        path.pop_back();
    }
}

Subsets subsets(const vector<int>& nums, bool skip) {
    Subsets out;
    vector<int> path;
    go(nums, skip, 0, path, out);
    return out;
}

vector<int> sortedCopy(vector<int> a) {   // taken by value: the caller's vector is untouched
    sort(a.begin(), a.end());
    return a;
}

string fmt(const Subsets& subs) {
    string r = "[";
    for (size_t k = 0; k < subs.size(); k++) {
        if (k) r += ", ";
        r += "[";
        for (size_t i = 0; i < subs[k].size(); i++) {
            if (i) r += ", ";
            r += to_string(subs[k][i]);
        }
        r += "]";
    }
    return r + "]";
}

int main() {
    vector<int> raw = {2, 1, 2};
    cout << "no skip, unsorted:  " << fmt(subsets(raw, false)) << "\\n";
    cout << "no skip, sorted:    " << fmt(subsets(sortedCopy(raw), false)) << "\\n";
    cout << "sorted + skip rule: " << fmt(subsets(sortedCopy(raw), true)) << "\\n";
    cout << "[2, 2, 2] unique:   " << fmt(subsets({2, 2, 2}, true)) << "\\n";

    for (int n : {0, 1, 5, 10, 16}) {
        vector<int> nums(n);
        for (int i = 0; i < n; i++) nums[i] = i + 1;
        Subsets subs = subsets(nums, false);
        long long stored = 0;
        for (const auto& s : subs) stored += s.size();
        cout << "n = " << n << ": " << subs.size() << " subsets, " << stored << " numbers stored\\n";
    }
}`,
          },
        ],
      },
    },
  },
  {
    title: "How do you generate all permutations of an array?",
    difficulty: "medium",
    seoDescription: "Generate all permutations with backtracking (used array or swaps), handle duplicates and next permutation, in verified Python, JavaScript, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a list of distinct integers, return all of its permutations. Write it in Python with backtracking, and then tell me how you would handle duplicate values."

**What a strong answer should cover:**
- There are n! permutations of n distinct elements: n choices for the first position, n - 1 for the second, and so on.
- Backtracking with a \`used\` marker: pick any unused element for the next position, recurse, then undo both the path and the marker.
- The in-place swap alternative (fix position k by swapping each candidate into it) and how its output order differs.
- Complexity O(n · n!) time, O(n) extra space; impossible to beat when all permutations must be listed.
- Duplicates (Permutations II): sort, and skip \`nums[i]\` when it equals \`nums[i - 1]\` and \`nums[i - 1]\` is not used; or the next-permutation algorithm.
- Python details: copy with \`path[:]\`, the tuple swap \`a[k], a[i] = a[i], a[k]\`, and \`itertools.permutations\` as the library version — which treats equal values as different, so it repeats permutations of \`[1, 1, 2]\`.

**Clarifying questions expected:**
- Are the values distinct, and if not, should equal permutations appear once?
- Does the output need to be in sorted (lexicographic) order?
- Do you need all of them, or just the next one / the k-th one?

**Code / implementation expected:** Yes — a backtracking function in Python with a \`used\` list (or in-place swaps), plus the duplicate-skip rule.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and basic recursion  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Three friends — Ana, Ben and Cy — arrive for a photo and argue about who stands where. How many different line-ups are there? Anyone of the three can stand on the left. Once that is decided, either of the two others can stand in the middle. The last person takes the last spot. That is 3 × 2 × 1 = 6 line-ups.

Listing those six line-ups is the permutations problem. With 8 friends it is 40,320 line-ups, with 10 it is over 3.6 million, so the problem is less about speed and more about getting a clean, correct procedure — which is [backtracking](/interview-question/what-is-backtracking): put someone in the next spot, arrange the rest, then take them back out and try the next person.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all values distinct? | With duplicates, \`[1, 1, 2]\` has only 3 different arrangements, not 6; you need the skip rule (section 6). |
| Does the output order matter? | The \`used\` version on sorted input gives lexicographic order; the swap version does not. |
| How large can n be? | n! explodes (10! = 3,628,800), so n is usually 8 or less when every permutation must be returned. |
| Do you need all permutations, or only the next / k-th one? | The next permutation is an O(n) in-place algorithm — no enumeration needed. |

## 3. The Core Idea

Fill the result from left to right. At each position, any element that has *not been used yet* may go there. After choosing one, fill the remaining positions the same way; when every position is filled, record the arrangement. Then take the last element back out and try the next unused one.

📌 **Interview term: Permutation** — an arrangement of all the elements in some order. n distinct elements have n! (n factorial = n × (n - 1) × ... × 1) permutations.

📌 **Interview term: Used array** — a boolean per position that says whether that element is already in the current path, so each element is placed exactly once.

<svg class="iq-diagram" width="100%" viewBox="0 0 730 300" role="img" aria-label="Permutation tree for 1, 2, 3: three choices for the first slot, two for the second, one for the third, giving six leaves">
  <path class="d-edge" d="M 365 47 L 115 93"/>
  <path class="d-edge" d="M 365 47 L 365 93"/>
  <path class="d-edge" d="M 365 47 L 615 93"/>
  <path class="d-edge" d="M 115 127 L 55 173"/>
  <path class="d-edge" d="M 115 127 L 175 173"/>
  <path class="d-edge" d="M 365 127 L 305 173"/>
  <path class="d-edge" d="M 365 127 L 425 173"/>
  <path class="d-edge" d="M 615 127 L 555 173"/>
  <path class="d-edge" d="M 615 127 L 675 173"/>
  <path class="d-edge-accent" d="M 55 207 L 55 253"/>
  <path class="d-edge-accent" d="M 175 207 L 175 253"/>
  <path class="d-edge-accent" d="M 305 207 L 305 253"/>
  <path class="d-edge-accent" d="M 425 207 L 425 253"/>
  <path class="d-edge-accent" d="M 555 207 L 555 253"/>
  <path class="d-edge-accent" d="M 675 207 L 675 253"/>
  <rect class="d-box" x="330" y="13" width="70" height="34" rx="6"/>
  <text class="d-text" x="365" y="35" text-anchor="middle">[ ]</text>
  <rect class="d-box" x="80" y="93" width="70" height="34" rx="6"/>
  <text class="d-text" x="115" y="115" text-anchor="middle">1</text>
  <rect class="d-box" x="330" y="93" width="70" height="34" rx="6"/>
  <text class="d-text" x="365" y="115" text-anchor="middle">2</text>
  <rect class="d-box" x="580" y="93" width="70" height="34" rx="6"/>
  <text class="d-text" x="615" y="115" text-anchor="middle">3</text>
  <rect class="d-box" x="20" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="55" y="195" text-anchor="middle">1,2</text>
  <rect class="d-box" x="140" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="175" y="195" text-anchor="middle">1,3</text>
  <rect class="d-box" x="270" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="305" y="195" text-anchor="middle">2,1</text>
  <rect class="d-box" x="390" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="425" y="195" text-anchor="middle">2,3</text>
  <rect class="d-box" x="520" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="555" y="195" text-anchor="middle">3,1</text>
  <rect class="d-box" x="640" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="675" y="195" text-anchor="middle">3,2</text>
  <rect class="d-box-accent" x="20" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="55" y="275" text-anchor="middle">1,2,3</text>
  <rect class="d-box-accent" x="140" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="175" y="275" text-anchor="middle">1,3,2</text>
  <rect class="d-box-accent" x="270" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="305" y="275" text-anchor="middle">2,1,3</text>
  <rect class="d-box-accent" x="390" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="425" y="275" text-anchor="middle">2,3,1</text>
  <rect class="d-box-accent" x="520" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="555" y="275" text-anchor="middle">3,1,2</text>
  <rect class="d-box-accent" x="640" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="675" y="275" text-anchor="middle">3,2,1</text>
</svg>

Three branches at the top, two under each, one under each of those: 3 × 2 × 1 = 6 leaves, and the leaves read left to right are the permutations in sorted order. Unlike [subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array), only the leaves are answers, and the loop always starts from index 0 — the \`used\` array, not a start index, prevents repeats.

## 4. Two Backtracking Versions in Python

**A. The \`used\` array** — the standard answer:

~~~python
def permute_used(nums):
    """Pick any unused element for the next slot; a used[] array remembers."""
    out, path, used = [], [], [False] * len(nums)
    calls = [0]

    def go():
        calls[0] += 1
        if len(path) == len(nums):
            out.append(path[:])          # copy: path keeps changing
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            used[i] = True               # choose
            path.append(nums[i])
            go()                         # explore
            path.pop()                   # un-choose (both pieces of state)
            used[i] = False

    go()
    return out, calls[0]
~~~

**B. In-place swaps** — instead of a separate path, treat the array itself as the path. Positions \`0..k-1\` are already decided; to decide position k, swap each candidate \`a[i]\` (for i ≥ k) into slot k, recurse on k + 1, then swap back:

~~~python
def permute_swap(nums):
    """Fix position k by swapping each candidate into it; no extra array."""
    a, out = nums[:], []

    def go(k):
        if k == len(a):
            out.append(a[:])
            return
        for i in range(k, len(a)):
            a[k], a[i] = a[i], a[k]      # choose: bring a[i] to slot k
            go(k + 1)
            a[k], a[i] = a[i], a[k]      # un-choose: swap back

    go(0)
    return out
~~~

📌 **Interview term: Swap-based permutation** — generating permutations by swapping each remaining element into the current position and swapping it back afterwards; no extra \`used\` array or path is needed.

**What to point out in this Python code:**

- \`used = [False] * len(nums)\` marks which positions are already in \`path\`. Both pieces of state are changed on the way in and restored on the way out — in reverse order.
- \`a[k], a[i] = a[i], a[k]\` swaps without a temporary variable: the right side is built as a tuple first, then unpacked.
- \`permute_swap\` works on a copy \`a = nums[:]\`, so the caller list is not reordered.
- The library version is \`itertools.permutations(nums)\`. It yields tuples in lexicographic order of the *input positions* and treats elements as unique by position, not value ([itertools.permutations](https://docs.python.org/3/library/itertools.html#itertools.permutations)). In our run, \`list(permutations([1, 1, 2]))\` returned 6 tuples with every arrangement twice — wrap it in \`set()\` or use the skip rule when values repeat.
- Python integers never overflow, so \`math.factorial(n)\` is exact for any n; the limit is time, not number size.

The two versions produce the same six permutations but **not in the same order**: the swap version prints \`[3, 2, 1]\` before \`[3, 1, 2]\`, because after swapping 3 to the front the remaining elements are in the order \`2, 1\`. If the interviewer wants sorted output, use version A on a sorted input.

## 5. Next Permutation: the Iterative Way

There is a classic O(n) algorithm that turns one permutation into the next one in sorted order, in place:

1. From the right, find the first position i with \`a[i] < a[i + 1]\`. Everything to the right of i is in decreasing order, so it is already the *last* arrangement of that tail. If there is no such i, the whole array is the last permutation.
2. From the right, find the first position j with \`a[j] > a[i]\`.
3. Swap \`a[i]\` and \`a[j]\`.
4. Reverse the tail after i, turning it from decreasing (largest) into increasing (smallest).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Next permutation of 1 3 5 4 2: find i at value 3 and j at value 4, swap them, then reverse the tail to get 1 4 2 3 5">
  <text class="d-sub d-accent" x="310" y="40" text-anchor="middle">i</text>
  <text class="d-sub d-accent" x="470" y="40" text-anchor="middle">j</text>
  <text class="d-text" x="20" y="77">1. find i, j</text>
  <rect class="d-box" x="200" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="230" y="77" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="280" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="310" y="77" text-anchor="middle">3</text>
  <rect class="d-box" x="360" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="390" y="77" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="440" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="470" y="77" text-anchor="middle">4</text>
  <rect class="d-box" x="520" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="550" y="77" text-anchor="middle">2</text>
  <text class="d-text" x="20" y="167">2. swap</text>
  <rect class="d-box" x="200" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="230" y="167" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="280" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="310" y="167" text-anchor="middle">4</text>
  <rect class="d-box" x="360" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="390" y="167" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="440" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="470" y="167" text-anchor="middle">3</text>
  <rect class="d-box" x="520" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="550" y="167" text-anchor="middle">2</text>
  <text class="d-text" x="20" y="257">3. reverse tail</text>
  <rect class="d-box" x="200" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="230" y="257" text-anchor="middle">1</text>
  <rect class="d-box" x="280" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="310" y="257" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="360" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="390" y="257" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="440" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="470" y="257" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="520" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="550" y="257" text-anchor="middle">5</text>
</svg>

For \`[1, 3, 5, 4, 2]\`: i points at 3 (because 3 < 5), j points at 4 (the rightmost value larger than 3), the swap gives \`[1, 4, 5, 3, 2]\`, and reversing the tail \`5, 3, 2\` gives \`[1, 4, 2, 3, 5]\` — the very next arrangement in sorted order.

~~~python
def next_permutation(a):
    """Rearrange a into the next larger order in place; False if it was the last."""
    i = len(a) - 2
    while i >= 0 and a[i] >= a[i + 1]:   # 1. find the rightmost ascent a[i] < a[i+1]
        i -= 1
    if i < 0:
        a.reverse()                      # last order: wrap round to the first one
        return False
    j = len(a) - 1
    while a[j] <= a[i]:                  # 2. rightmost element bigger than a[i]
        j -= 1
    a[i], a[j] = a[j], a[i]              # 3. swap them
    a[i + 1:] = reversed(a[i + 1:])      # 4. make the tail as small as possible
    return True
~~~

📌 **Interview term: Lexicographic order** — dictionary order: compare two sequences at the first position where they differ. \`[1, 3, 2]\` comes before \`[2, 1, 3]\`.

📌 **Interview term: Next permutation** — the smallest arrangement that is lexicographically greater than the current one; computable in O(n) time and O(1) extra space.

## 6. Duplicates: Permutations II

With \`[1, 1, 2]\`, the two 1s are interchangeable, so the plain algorithm prints each arrangement twice. The fix: sort the input so equal values are neighbours, then **use equal values only from left to right** — skip \`nums[i]\` if it equals \`nums[i - 1]\` and \`nums[i - 1]\` is *not* currently used.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="With sorted input 1, 1, 2 the second 1 is skipped as a first choice while the first 1 is unused">
  <path class="d-edge" d="M 320 57 L 130 133"/>
  <path class="d-edge-dashed" d="M 320 57 L 320 133"/>
  <path class="d-edge" d="M 320 57 L 510 133"/>
  <rect class="d-box" x="270" y="23" width="100" height="34" rx="6"/>
  <text class="d-text" x="320" y="45" text-anchor="middle">[ ]</text>
  <rect class="d-box-accent" x="70" y="133" width="120" height="34" rx="6"/>
  <text class="d-text" x="130" y="155" text-anchor="middle">first 1</text>
  <rect class="d-box-muted" x="260" y="133" width="120" height="34" rx="6"/>
  <text class="d-text" x="320" y="155" text-anchor="middle">second 1</text>
  <rect class="d-box-accent" x="450" y="133" width="120" height="34" rx="6"/>
  <text class="d-text" x="510" y="155" text-anchor="middle">2</text>
  <text class="d-sub" x="130" y="200" text-anchor="middle">kept</text>
  <text class="d-sub" x="320" y="200" text-anchor="middle">skipped</text>
  <text class="d-sub" x="320" y="224" text-anchor="middle">twin still unused</text>
  <text class="d-sub" x="510" y="200" text-anchor="middle">kept</text>
</svg>

At the root, the first 1 is free, so starting with the second 1 would just repeat the subtree that starts with the first 1. Deeper down, once the first 1 is in the path, the second 1 is allowed.

~~~python
def permute_unique(nums, skip_duplicates):
    nums = sorted(nums)                  # equal values must sit next to each other
    out, path, used = [], [], [False] * len(nums)

    def go():
        if len(path) == len(nums):
            out.append(path[:])
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            # Use equal values left to right only: skip nums[i] while its twin
            # nums[i - 1] is still unused in this branch.
            if skip_duplicates and i > 0 and nums[i] == nums[i - 1] and not used[i - 1]:
                continue
            used[i] = True
            path.append(nums[i])
            go()
            path.pop()
            used[i] = False

    go()
    return out
~~~

The next-permutation loop handles duplicates for free: the \`>=\` and \`<=\` comparisons skip over equal values, so starting from the sorted array it visits each distinct arrangement exactly once. Example 2 checks both methods on \`[1, 1, 2, 2, 3]\`: 5! / (2! · 2!) = 30.

📌 **Interview term: Multiset permutation** — a permutation of a collection with repeated values; the count is n! divided by the factorial of each value multiplicity.

## 7. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — used-array vs swap backtracking on [1, 2, 3], and n! for n up to 8 with call counts** prints:

~~~text
used[] array:  [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]
swap in place: [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 2, 1], [3, 1, 2]]
empty input:   [[]]
n = 1: 1 permutations, 2 calls
n = 2: 2 permutations, 5 calls
n = 3: 6 permutations, 16 calls
n = 4: 24 permutations, 65 calls
n = 5: 120 permutations, 326 calls
n = 6: 720 permutations, 1957 calls
n = 7: 5040 permutations, 13700 calls
n = 8: 40320 permutations, 109601 calls
~~~

**Example 2 — Permutations II (duplicates) by the skip rule and by next permutation** prints:

~~~text
no skip:        [[1, 1, 2], [1, 2, 1], [1, 1, 2], [1, 2, 1], [2, 1, 1], [2, 1, 1]]
skip rule:      [[1, 1, 2], [1, 2, 1], [2, 1, 1]]
next perm loop: [[1, 1, 2], [1, 2, 1], [2, 1, 1]]
[1, 1, 2, 2, 3]: 30 by skip rule, 30 by next permutation
next of [1, 3, 2]: true -> [2, 1, 3]
next of [3, 2, 1]: false -> [1, 2, 3]
~~~

The call counts in example 1 grow slightly faster than n!: the tree has one node for every partial arrangement, 1 + n + n(n-1) + ... + n!, which is about 2.7 × n! (109,601 calls for 40,320 permutations at n = 8).

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`used\` backtracking | O(n · n!) | O(n) | about e · n! nodes; each leaf copies n elements |
| Swap backtracking | O(n · n!) | O(n) recursion | same tree, no \`used\` array or separate path |
| Next-permutation loop | O(n · n!) total, O(n) per step | O(1) | each step scans and reverses at most n elements |
| Output | — | O(n · n!) | n! arrangements of n numbers |

See [Big-O notation](/interview-question/what-is-big-o-notation) if n · n! looks unfamiliar; it grows faster than any exponential c^n.

## 9. Edge Cases

- **Empty input** → \`[[]]\`: exactly one arrangement of nothing. Example 1 prints it.
- **One element** → one permutation.
- **All values equal** → one permutation; the skip rule (or next permutation) gives exactly that.
- **Output order.** Specify it: lexicographic needs sorted input plus the \`used\` version or next permutation.
- **Constraints instead of all arrangements.** If only *some* permutations are valid (no two queens attacking, no adjacent equal letters), prune inside the loop — that is how [N-Queens](/interview-question/how-do-you-solve-the-n-queens-problem) works: a permutation of columns with diagonal checks.

## Common Pitfalls

- **Storing \`path\` instead of \`path[:]\`.** All stored permutations end up as the same, empty list.
- **Undoing only half the state.** Forgetting \`used[i] = False\` after \`pop()\` makes every later branch think that element is taken; you get far fewer permutations.
- **Skip rule without sorting.** \`nums[i] == nums[i - 1]\` only finds twins that are neighbours; sort first.
- **Expecting \`itertools.permutations\` to remove duplicates.** It does not: \`[1, 1, 2]\` gives 6 tuples, not 3.
- **Expecting the swap version to be in sorted order.** It is not: our run produced \`[3, 2, 1]\` before \`[3, 1, 2]\`. Use the \`used\` version on sorted input if order matters.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Count first:</strong> <span style="color:#f0e2c8;">n distinct elements have n! permutations: n choices for the first slot, n - 1 for the next, and so on.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">backtracking with a used array: for each unused element, mark it, append it, recurse, then pop and unmark; record when the path has n elements.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Alternative:</strong> <span style="color:#f0e2c8;">swap each candidate into position k and swap back, or step with the O(n) next-permutation algorithm.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity and duplicates:</strong> <span style="color:#f0e2c8;">O(n · n!) time, O(n) extra space. For duplicates, sort and skip nums[i] when it equals nums[i - 1] and nums[i - 1] is unused.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">copy with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path[:]</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">itertools.permutations</code> exists but repeats arrangements when values repeat.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the swap version print <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[3, 2, 1]</code> before <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[3, 1, 2]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After swapping 3 to the front the rest of the list is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 1]</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 2]</code>, and the swap version never re-sorts. It is still correct, just not lexicographic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle duplicates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort, then skip <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i] == nums[i - 1]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">not used[i - 1]</code>: equal values are used left to right only. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 1, 2]</code> gives 3 instead of 6.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the time complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n · n!): n! leaves, each copied in O(n). We counted 109,601 calls for n = 8, about 2.7 calls per permutation, so the copies dominate.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the next permutation without generating all of them?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Find the rightmost i with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i] &lt; a[i + 1]</code>, swap <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i]</code> with the rightmost larger element, and reverse the tail. O(n) time, O(1) extra space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you return the k-th permutation directly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with the factorial number system: the first element is index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k // (n - 1)!</code> among the remaining ones, and so on. O(n^2) with a list, no enumeration.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Permutation** | An arrangement of all elements in some order; n! of them for n distinct elements |
| **Used array** | One flag per element: is it already in the current path? |
| **Swap-based permutation** | Swap each candidate into the current slot, recurse, swap back |
| **Lexicographic order** | Dictionary order: compare at the first differing position |
| **Next permutation** | The next larger arrangement, found in O(n) by find, swap, reverse |
| **Multiset permutation** | Permutation with repeated values; n! divided by each multiplicity factorial |

---
**Conclusion:** In Python, permutations are a backtracking function with a shared \`path\` and a \`used\` list: pick any unused element, recurse, then undo both changes, and record \`path[:]\` when it is full. The swap version saves the \`used\` list but gives a different order; duplicates need a sort plus the \`not used[i - 1]\` skip rule; and \`itertools.permutations\` is the library shortcut that does not de-duplicate. Compare it with [subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array) (start index instead of a used array) and [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem) (start index plus a running total).`,
        examples: [
          {
            label: "Permutations two ways (used[] and swaps), and how n! grows",
            code: `# Two backtracking ways to generate all permutations, and how fast n! grows.

def permute_used(nums):
    """Pick any unused element for the next slot; a used[] array remembers."""
    out, path, used = [], [], [False] * len(nums)
    calls = [0]

    def go():
        calls[0] += 1
        if len(path) == len(nums):
            out.append(path[:])          # copy: path keeps changing
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            used[i] = True               # choose
            path.append(nums[i])
            go()                         # explore
            path.pop()                   # un-choose (both pieces of state)
            used[i] = False

    go()
    return out, calls[0]


def permute_swap(nums):
    """Fix position k by swapping each candidate into it; no extra array."""
    a, out = nums[:], []

    def go(k):
        if k == len(a):
            out.append(a[:])
            return
        for i in range(k, len(a)):
            a[k], a[i] = a[i], a[k]      # choose: bring a[i] to slot k
            go(k + 1)
            a[k], a[i] = a[i], a[k]      # un-choose: swap back

    go(0)
    return out


def fmt(perms):
    return "[" + ", ".join("[" + ", ".join(map(str, p)) + "]" for p in perms) + "]"


perms, _ = permute_used([1, 2, 3])
print("used[] array:  " + fmt(perms))
print("swap in place: " + fmt(permute_swap([1, 2, 3])))
perms, _ = permute_used([])
print("empty input:   " + fmt(perms))

for n in range(1, 9):
    perms, calls = permute_used(list(range(1, n + 1)))
    print("n = " + str(n) + ": " + str(len(perms)) + " permutations, " + str(calls) + " calls")`,
          },
          {
            label: "Permutations II with duplicates, and the next-permutation algorithm",
            code: `# Permutations II (duplicates) two ways: the skip rule, and next permutation.

def permute_unique(nums, skip_duplicates):
    nums = sorted(nums)                  # equal values must sit next to each other
    out, path, used = [], [], [False] * len(nums)

    def go():
        if len(path) == len(nums):
            out.append(path[:])
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            # Use equal values left to right only: skip nums[i] while its twin
            # nums[i - 1] is still unused in this branch.
            if skip_duplicates and i > 0 and nums[i] == nums[i - 1] and not used[i - 1]:
                continue
            used[i] = True
            path.append(nums[i])
            go()
            path.pop()
            used[i] = False

    go()
    return out


def next_permutation(a):
    """Rearrange a into the next larger order in place; False if it was the last."""
    i = len(a) - 2
    while i >= 0 and a[i] >= a[i + 1]:   # 1. find the rightmost ascent a[i] < a[i+1]
        i -= 1
    if i < 0:
        a.reverse()                      # last order: wrap round to the first one
        return False
    j = len(a) - 1
    while a[j] <= a[i]:                  # 2. rightmost element bigger than a[i]
        j -= 1
    a[i], a[j] = a[j], a[i]              # 3. swap them
    a[i + 1:] = reversed(a[i + 1:])      # 4. make the tail as small as possible
    return True


def all_by_next(nums):
    a, out = sorted(nums), []
    while True:
        out.append(a[:])
        if not next_permutation(a):
            return out


def fmt(perms):
    return "[" + ", ".join("[" + ", ".join(map(str, p)) + "]" for p in perms) + "]"


print("no skip:        " + fmt(permute_unique([1, 2, 1], False)))
print("skip rule:      " + fmt(permute_unique([1, 2, 1], True)))
print("next perm loop: " + fmt(all_by_next([1, 2, 1])))
print("[1, 1, 2, 2, 3]: " + str(len(permute_unique([1, 1, 2, 2, 3], True))) + " by skip rule, "
      + str(len(all_by_next([1, 1, 2, 2, 3]))) + " by next permutation")
a = [1, 3, 2]
print("next of [1, 3, 2]: " + str(next_permutation(a)).lower() + " -> " + fmt([a])[1:-1])
a = [3, 2, 1]
print("next of [3, 2, 1]: " + str(next_permutation(a)).lower() + " -> " + fmt([a])[1:-1])`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an array of distinct integers, return all of its permutations. Write it in JavaScript with backtracking, and then tell me how you would handle duplicate values."

**What a strong answer should cover:**
- There are n! permutations of n distinct elements: n choices for the first position, n - 1 for the second, and so on.
- Backtracking with a \`used\` marker: pick any unused element for the next position, recurse, then undo both the path and the marker.
- The in-place swap alternative (fix position k by swapping each candidate into it) and how its output order differs.
- Complexity O(n · n!) time, O(n) extra space; impossible to beat when all permutations must be listed.
- Duplicates (Permutations II): sort, and skip \`nums[i]\` when it equals \`nums[i - 1]\` and \`nums[i - 1]\` is not used; or the next-permutation algorithm.
- JavaScript details: copy with \`[...path]\`, the destructuring swap \`[a[k], a[i]] = [a[i], a[k]]\`, a numeric sort \`(x, y) => x - y\`, and no built-in permutation function.

**Clarifying questions expected:**
- Are the values distinct, and if not, should equal permutations appear once?
- Does the output need to be in sorted (lexicographic) order?
- Do you need all of them, or just the next one / the k-th one?

**Code / implementation expected:** Yes — a backtracking function in JavaScript with a \`used\` array (or in-place swaps), plus the duplicate-skip rule.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and basic recursion  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Three friends — Ana, Ben and Cy — arrive for a photo and argue about who stands where. How many different line-ups are there? Anyone of the three can stand on the left. Once that is decided, either of the two others can stand in the middle. The last person takes the last spot. That is 3 × 2 × 1 = 6 line-ups.

Listing those six line-ups is the permutations problem. With 8 friends it is 40,320 line-ups, with 10 it is over 3.6 million, so the problem is less about speed and more about getting a clean, correct procedure — which is [backtracking](/interview-question/what-is-backtracking): put someone in the next spot, arrange the rest, then take them back out and try the next person.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all values distinct? | With duplicates, \`[1, 1, 2]\` has only 3 different arrangements, not 6; you need the skip rule (section 6). |
| Does the output order matter? | The \`used\` version on sorted input gives lexicographic order; the swap version does not. |
| How large can n be? | n! explodes (10! = 3,628,800), so n is usually 8 or less when every permutation must be returned. |
| Do you need all permutations, or only the next / k-th one? | The next permutation is an O(n) in-place algorithm — no enumeration needed. |

## 3. The Core Idea

Fill the result from left to right. At each position, any element that has *not been used yet* may go there. After choosing one, fill the remaining positions the same way; when every position is filled, record the arrangement. Then take the last element back out and try the next unused one.

📌 **Interview term: Permutation** — an arrangement of all the elements in some order. n distinct elements have n! (n factorial = n × (n - 1) × ... × 1) permutations.

📌 **Interview term: Used array** — a boolean per position that says whether that element is already in the current path, so each element is placed exactly once.

<svg class="iq-diagram" width="100%" viewBox="0 0 730 300" role="img" aria-label="Permutation tree for 1, 2, 3: three choices for the first slot, two for the second, one for the third, giving six leaves">
  <path class="d-edge" d="M 365 47 L 115 93"/>
  <path class="d-edge" d="M 365 47 L 365 93"/>
  <path class="d-edge" d="M 365 47 L 615 93"/>
  <path class="d-edge" d="M 115 127 L 55 173"/>
  <path class="d-edge" d="M 115 127 L 175 173"/>
  <path class="d-edge" d="M 365 127 L 305 173"/>
  <path class="d-edge" d="M 365 127 L 425 173"/>
  <path class="d-edge" d="M 615 127 L 555 173"/>
  <path class="d-edge" d="M 615 127 L 675 173"/>
  <path class="d-edge-accent" d="M 55 207 L 55 253"/>
  <path class="d-edge-accent" d="M 175 207 L 175 253"/>
  <path class="d-edge-accent" d="M 305 207 L 305 253"/>
  <path class="d-edge-accent" d="M 425 207 L 425 253"/>
  <path class="d-edge-accent" d="M 555 207 L 555 253"/>
  <path class="d-edge-accent" d="M 675 207 L 675 253"/>
  <rect class="d-box" x="330" y="13" width="70" height="34" rx="6"/>
  <text class="d-text" x="365" y="35" text-anchor="middle">[ ]</text>
  <rect class="d-box" x="80" y="93" width="70" height="34" rx="6"/>
  <text class="d-text" x="115" y="115" text-anchor="middle">1</text>
  <rect class="d-box" x="330" y="93" width="70" height="34" rx="6"/>
  <text class="d-text" x="365" y="115" text-anchor="middle">2</text>
  <rect class="d-box" x="580" y="93" width="70" height="34" rx="6"/>
  <text class="d-text" x="615" y="115" text-anchor="middle">3</text>
  <rect class="d-box" x="20" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="55" y="195" text-anchor="middle">1,2</text>
  <rect class="d-box" x="140" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="175" y="195" text-anchor="middle">1,3</text>
  <rect class="d-box" x="270" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="305" y="195" text-anchor="middle">2,1</text>
  <rect class="d-box" x="390" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="425" y="195" text-anchor="middle">2,3</text>
  <rect class="d-box" x="520" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="555" y="195" text-anchor="middle">3,1</text>
  <rect class="d-box" x="640" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="675" y="195" text-anchor="middle">3,2</text>
  <rect class="d-box-accent" x="20" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="55" y="275" text-anchor="middle">1,2,3</text>
  <rect class="d-box-accent" x="140" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="175" y="275" text-anchor="middle">1,3,2</text>
  <rect class="d-box-accent" x="270" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="305" y="275" text-anchor="middle">2,1,3</text>
  <rect class="d-box-accent" x="390" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="425" y="275" text-anchor="middle">2,3,1</text>
  <rect class="d-box-accent" x="520" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="555" y="275" text-anchor="middle">3,1,2</text>
  <rect class="d-box-accent" x="640" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="675" y="275" text-anchor="middle">3,2,1</text>
</svg>

Three branches at the top, two under each, one under each of those: 3 × 2 × 1 = 6 leaves, and the leaves read left to right are the permutations in sorted order. Unlike [subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array), only the leaves are answers, and the loop always starts from index 0 — the \`used\` array, not a start index, prevents repeats.

## 4. Two Backtracking Versions in JavaScript

**A. The \`used\` array** — the standard answer:

~~~javascript
function permuteUsed(nums) {
  // Pick any unused element for the next slot; a used[] array remembers.
  const out = [], path = [], used = new Array(nums.length).fill(false);
  let calls = 0;
  function go() {
    calls++;
    if (path.length === nums.length) {
      out.push([...path]);               // copy: path keeps changing
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;                    // choose
      path.push(nums[i]);
      go();                              // explore
      path.pop();                        // un-choose (both pieces of state)
      used[i] = false;
    }
  }
  go();
  return { out, calls };
}
~~~

**B. In-place swaps** — instead of a separate path, treat the array itself as the path. Positions \`0..k-1\` are already decided; to decide position k, swap each candidate \`a[i]\` (for i ≥ k) into slot k, recurse on k + 1, then swap back:

~~~javascript
function permuteSwap(nums) {
  // Fix position k by swapping each candidate into it; no extra array.
  const a = [...nums], out = [];
  function go(k) {
    if (k === a.length) {
      out.push([...a]);
      return;
    }
    for (let i = k; i < a.length; i++) {
      [a[k], a[i]] = [a[i], a[k]];       // choose: bring a[i] to slot k
      go(k + 1);
      [a[k], a[i]] = [a[i], a[k]];       // un-choose: swap back
    }
  }
  go(0);
  return out;
}
~~~

📌 **Interview term: Swap-based permutation** — generating permutations by swapping each remaining element into the current position and swapping it back afterwards; no extra \`used\` array or path is needed.

**What to point out in this JavaScript code:**

- \`new Array(nums.length).fill(false)\` creates the \`used\` array. Both \`path\` and \`used[i]\` are changed on the way in and restored on the way out.
- \`[a[k], a[i]] = [a[i], a[k]]\` is the destructuring swap: the right side builds a temporary two-element array, then assigns it back.
- \`permuteSwap\` copies the input with \`[...nums]\`, so the caller array is not reordered.
- JavaScript has no built-in permutation generator, so this code (or the next-permutation loop in section 6) is what the interviewer expects.
- Counting permutations with a \`Number\` is exact only up to 2^53: in our check, 18! was still a safe integer and 19! was not. Use \`BigInt\` if you need exact factorials above 18 — you will never *list* that many permutations anyway.

The two versions produce the same six permutations but **not in the same order**: the swap version prints \`[3, 2, 1]\` before \`[3, 1, 2]\`, because after swapping 3 to the front the remaining elements are in the order \`2, 1\`. If the interviewer wants sorted output, use version A on a sorted input.

## 5. Next Permutation: the Iterative Way

There is a classic O(n) algorithm that turns one permutation into the next one in sorted order, in place:

1. From the right, find the first position i with \`a[i] < a[i + 1]\`. Everything to the right of i is in decreasing order, so it is already the *last* arrangement of that tail. If there is no such i, the whole array is the last permutation.
2. From the right, find the first position j with \`a[j] > a[i]\`.
3. Swap \`a[i]\` and \`a[j]\`.
4. Reverse the tail after i, turning it from decreasing (largest) into increasing (smallest).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Next permutation of 1 3 5 4 2: find i at value 3 and j at value 4, swap them, then reverse the tail to get 1 4 2 3 5">
  <text class="d-sub d-accent" x="310" y="40" text-anchor="middle">i</text>
  <text class="d-sub d-accent" x="470" y="40" text-anchor="middle">j</text>
  <text class="d-text" x="20" y="77">1. find i, j</text>
  <rect class="d-box" x="200" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="230" y="77" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="280" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="310" y="77" text-anchor="middle">3</text>
  <rect class="d-box" x="360" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="390" y="77" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="440" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="470" y="77" text-anchor="middle">4</text>
  <rect class="d-box" x="520" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="550" y="77" text-anchor="middle">2</text>
  <text class="d-text" x="20" y="167">2. swap</text>
  <rect class="d-box" x="200" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="230" y="167" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="280" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="310" y="167" text-anchor="middle">4</text>
  <rect class="d-box" x="360" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="390" y="167" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="440" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="470" y="167" text-anchor="middle">3</text>
  <rect class="d-box" x="520" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="550" y="167" text-anchor="middle">2</text>
  <text class="d-text" x="20" y="257">3. reverse tail</text>
  <rect class="d-box" x="200" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="230" y="257" text-anchor="middle">1</text>
  <rect class="d-box" x="280" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="310" y="257" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="360" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="390" y="257" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="440" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="470" y="257" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="520" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="550" y="257" text-anchor="middle">5</text>
</svg>

For \`[1, 3, 5, 4, 2]\`: i points at 3 (because 3 < 5), j points at 4 (the rightmost value larger than 3), the swap gives \`[1, 4, 5, 3, 2]\`, and reversing the tail \`5, 3, 2\` gives \`[1, 4, 2, 3, 5]\` — the very next arrangement in sorted order.

~~~javascript
function nextPermutation(a) {
  // Rearrange a into the next larger order in place; false if it was the last.
  let i = a.length - 2;
  while (i >= 0 && a[i] >= a[i + 1]) i--;   // 1. find the rightmost ascent a[i] < a[i+1]
  if (i < 0) {
    a.reverse();                            // last order: wrap round to the first one
    return false;
  }
  let j = a.length - 1;
  while (a[j] <= a[i]) j--;                 // 2. rightmost element bigger than a[i]
  [a[i], a[j]] = [a[j], a[i]];              // 3. swap them
  reverseRange(a, i + 1, a.length - 1);     // 4. make the tail as small as possible
  return true;
}
~~~

📌 **Interview term: Lexicographic order** — dictionary order: compare two sequences at the first position where they differ. \`[1, 3, 2]\` comes before \`[2, 1, 3]\`.

📌 **Interview term: Next permutation** — the smallest arrangement that is lexicographically greater than the current one; computable in O(n) time and O(1) extra space.

## 6. Duplicates: Permutations II

With \`[1, 1, 2]\`, the two 1s are interchangeable, so the plain algorithm prints each arrangement twice. The fix: sort the input so equal values are neighbours, then **use equal values only from left to right** — skip \`nums[i]\` if it equals \`nums[i - 1]\` and \`nums[i - 1]\` is *not* currently used.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="With sorted input 1, 1, 2 the second 1 is skipped as a first choice while the first 1 is unused">
  <path class="d-edge" d="M 320 57 L 130 133"/>
  <path class="d-edge-dashed" d="M 320 57 L 320 133"/>
  <path class="d-edge" d="M 320 57 L 510 133"/>
  <rect class="d-box" x="270" y="23" width="100" height="34" rx="6"/>
  <text class="d-text" x="320" y="45" text-anchor="middle">[ ]</text>
  <rect class="d-box-accent" x="70" y="133" width="120" height="34" rx="6"/>
  <text class="d-text" x="130" y="155" text-anchor="middle">first 1</text>
  <rect class="d-box-muted" x="260" y="133" width="120" height="34" rx="6"/>
  <text class="d-text" x="320" y="155" text-anchor="middle">second 1</text>
  <rect class="d-box-accent" x="450" y="133" width="120" height="34" rx="6"/>
  <text class="d-text" x="510" y="155" text-anchor="middle">2</text>
  <text class="d-sub" x="130" y="200" text-anchor="middle">kept</text>
  <text class="d-sub" x="320" y="200" text-anchor="middle">skipped</text>
  <text class="d-sub" x="320" y="224" text-anchor="middle">twin still unused</text>
  <text class="d-sub" x="510" y="200" text-anchor="middle">kept</text>
</svg>

At the root, the first 1 is free, so starting with the second 1 would just repeat the subtree that starts with the first 1. Deeper down, once the first 1 is in the path, the second 1 is allowed.

~~~javascript
function permuteUnique(input, skipDuplicates) {
  const nums = numSort(input);           // equal values must sit next to each other
  const out = [], path = [], used = new Array(nums.length).fill(false);
  function go() {
    if (path.length === nums.length) {
      out.push([...path]);
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      // Use equal values left to right only: skip nums[i] while its twin
      // nums[i - 1] is still unused in this branch.
      if (skipDuplicates && i > 0 && nums[i] === nums[i - 1] && !used[i - 1]) continue;
      used[i] = true;
      path.push(nums[i]);
      go();
      path.pop();
      used[i] = false;
    }
  }
  go();
  return out;
}
~~~

The next-permutation loop handles duplicates for free: the \`>=\` and \`<=\` comparisons skip over equal values, so starting from the sorted array it visits each distinct arrangement exactly once. Example 2 checks both methods on \`[1, 1, 2, 2, 3]\`: 5! / (2! · 2!) = 30.

📌 **Interview term: Multiset permutation** — a permutation of a collection with repeated values; the count is n! divided by the factorial of each value multiplicity.

## 7. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\` (Node.js 22; the same code runs in the page). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — used-array vs swap backtracking on [1, 2, 3], and n! for n up to 8 with call counts** prints:

~~~text
used[] array:  [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]
swap in place: [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 2, 1], [3, 1, 2]]
empty input:   [[]]
n = 1: 1 permutations, 2 calls
n = 2: 2 permutations, 5 calls
n = 3: 6 permutations, 16 calls
n = 4: 24 permutations, 65 calls
n = 5: 120 permutations, 326 calls
n = 6: 720 permutations, 1957 calls
n = 7: 5040 permutations, 13700 calls
n = 8: 40320 permutations, 109601 calls
~~~

**Example 2 — Permutations II (duplicates) by the skip rule and by next permutation** prints:

~~~text
no skip:        [[1, 1, 2], [1, 2, 1], [1, 1, 2], [1, 2, 1], [2, 1, 1], [2, 1, 1]]
skip rule:      [[1, 1, 2], [1, 2, 1], [2, 1, 1]]
next perm loop: [[1, 1, 2], [1, 2, 1], [2, 1, 1]]
[1, 1, 2, 2, 3]: 30 by skip rule, 30 by next permutation
next of [1, 3, 2]: true -> [2, 1, 3]
next of [3, 2, 1]: false -> [1, 2, 3]
~~~

The call counts in example 1 grow slightly faster than n!: the tree has one node for every partial arrangement, 1 + n + n(n-1) + ... + n!, which is about 2.7 × n! (109,601 calls for 40,320 permutations at n = 8).

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`used\` backtracking | O(n · n!) | O(n) | about e · n! nodes; each leaf copies n elements |
| Swap backtracking | O(n · n!) | O(n) recursion | same tree, no \`used\` array or separate path |
| Next-permutation loop | O(n · n!) total, O(n) per step | O(1) | each step scans and reverses at most n elements |
| Output | — | O(n · n!) | n! arrangements of n numbers |

See [Big-O notation](/interview-question/what-is-big-o-notation) if n · n! looks unfamiliar; it grows faster than any exponential c^n.

## 9. Edge Cases

- **Empty input** → \`[[]]\`: exactly one arrangement of nothing. Example 1 prints it.
- **One element** → one permutation.
- **All values equal** → one permutation; the skip rule (or next permutation) gives exactly that.
- **Output order.** Specify it: lexicographic needs sorted input plus the \`used\` version or next permutation.
- **Constraints instead of all arrangements.** If only *some* permutations are valid (no two queens attacking, no adjacent equal letters), prune inside the loop — that is how [N-Queens](/interview-question/how-do-you-solve-the-n-queens-problem) works: a permutation of columns with diagonal checks.

## Common Pitfalls

- **Pushing \`path\` instead of \`[...path]\`.** All stored permutations end up as the same, empty array.
- **Undoing only half the state.** Forgetting \`used[i] = false\` after \`pop()\` makes later branches think that element is taken.
- **Sorting with the default comparator before the skip rule.** \`.sort()\` compares strings, so \`[10, 1, 2]\` sorts to \`[1, 10, 2]\`; pass \`(x, y) => x - y\`.
- **Skip rule without sorting.** \`nums[i] === nums[i - 1]\` only finds twins that are neighbours.
- **Expecting the swap version to be in sorted order.** Our run produced \`[3, 2, 1]\` before \`[3, 1, 2]\`.
- **Forgetting the semicolon before a destructuring swap.** A line starting with \`[\` right after a line with no semicolon is parsed as an index into the previous expression. Keep semicolons, as the examples do.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Count first:</strong> <span style="color:#f0e2c8;">n distinct elements have n! permutations: n choices for the first slot, n - 1 for the next, and so on.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">backtracking with a used array: for each unused element, mark it, append it, recurse, then pop and unmark; record when the path has n elements.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Alternative:</strong> <span style="color:#f0e2c8;">swap each candidate into position k and swap back, or step with the O(n) next-permutation algorithm.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity and duplicates:</strong> <span style="color:#f0e2c8;">O(n · n!) time, O(n) extra space. For duplicates, sort and skip nums[i] when it equals nums[i - 1] and nums[i - 1] is unused.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">copy with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...path]</code>, swap with destructuring, sort numerically before the duplicate rule; there is no built-in permutation generator.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the swap version print <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[3, 2, 1]</code> before <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[3, 1, 2]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After swapping 3 to the front the rest is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 1]</code>, and the swap version never re-sorts. Still correct, just not lexicographic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle duplicates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort numerically, then skip <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i] === nums[i - 1] &amp;&amp; !used[i - 1]</code>: equal values are used left to right only. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 1, 2]</code> gives 3 instead of 6.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the time complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n · n!): n! leaves, each copied in O(n). We counted 109,601 calls for n = 8, about 2.7 calls per permutation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the next permutation in place?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rightmost i with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i] &lt; a[i + 1]</code>, swap with the rightmost larger element, reverse the tail. O(n) time, O(1) extra space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you avoid building all n! arrays at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a generator, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function* permute()</code>, that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code>s a copy at each leaf; or loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextPermutation</code> and process each arrangement before moving on.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Permutation** | An arrangement of all elements in some order; n! of them for n distinct elements |
| **Used array** | One flag per element: is it already in the current path? |
| **Swap-based permutation** | Swap each candidate into the current slot, recurse, swap back |
| **Lexicographic order** | Dictionary order: compare at the first differing position |
| **Next permutation** | The next larger arrangement, found in O(n) by find, swap, reverse |
| **Multiset permutation** | Permutation with repeated values; n! divided by each multiplicity factorial |

---
**Conclusion:** In JavaScript, permutations are a recursive closure with a shared \`path\` and a \`used\` array: pick any unused element, recurse, then undo both changes, and push \`[...path]\` when it is full. The swap version saves the \`used\` array but gives a different order, duplicates need a numeric sort plus the \`!used[i - 1]\` skip rule, and the next-permutation loop is the iterative alternative. Compare it with [subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array) (start index instead of a used array) and [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem) (start index plus a running total).`,
        examples: [
          {
            label: "Permutations two ways (used[] and swaps), and how n! grows",
            code: `// Two backtracking ways to generate all permutations, and how fast n! grows.

function permuteUsed(nums) {
  // Pick any unused element for the next slot; a used[] array remembers.
  const out = [], path = [], used = new Array(nums.length).fill(false);
  let calls = 0;
  function go() {
    calls++;
    if (path.length === nums.length) {
      out.push([...path]);               // copy: path keeps changing
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;                    // choose
      path.push(nums[i]);
      go();                              // explore
      path.pop();                        // un-choose (both pieces of state)
      used[i] = false;
    }
  }
  go();
  return { out, calls };
}

function permuteSwap(nums) {
  // Fix position k by swapping each candidate into it; no extra array.
  const a = [...nums], out = [];
  function go(k) {
    if (k === a.length) {
      out.push([...a]);
      return;
    }
    for (let i = k; i < a.length; i++) {
      [a[k], a[i]] = [a[i], a[k]];       // choose: bring a[i] to slot k
      go(k + 1);
      [a[k], a[i]] = [a[i], a[k]];       // un-choose: swap back
    }
  }
  go(0);
  return out;
}

const fmt = (perms) => "[" + perms.map((p) => "[" + p.join(", ") + "]").join(", ") + "]";

console.log("used[] array:  " + fmt(permuteUsed([1, 2, 3]).out));
console.log("swap in place: " + fmt(permuteSwap([1, 2, 3])));
console.log("empty input:   " + fmt(permuteUsed([]).out));

for (let n = 1; n <= 8; n++) {
  const nums = Array.from({ length: n }, (_, i) => i + 1);
  const r = permuteUsed(nums);
  console.log("n = " + n + ": " + r.out.length + " permutations, " + r.calls + " calls");
}`,
          },
          {
            label: "Permutations II with duplicates, and the next-permutation algorithm",
            code: `// Permutations II (duplicates) two ways: the skip rule, and next permutation.

const numSort = (a) => [...a].sort((x, y) => x - y);   // numeric compare, not string order

function permuteUnique(input, skipDuplicates) {
  const nums = numSort(input);           // equal values must sit next to each other
  const out = [], path = [], used = new Array(nums.length).fill(false);
  function go() {
    if (path.length === nums.length) {
      out.push([...path]);
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      // Use equal values left to right only: skip nums[i] while its twin
      // nums[i - 1] is still unused in this branch.
      if (skipDuplicates && i > 0 && nums[i] === nums[i - 1] && !used[i - 1]) continue;
      used[i] = true;
      path.push(nums[i]);
      go();
      path.pop();
      used[i] = false;
    }
  }
  go();
  return out;
}

function reverseRange(a, lo, hi) {
  while (lo < hi) {
    [a[lo], a[hi]] = [a[hi], a[lo]];
    lo++;
    hi--;
  }
}

function nextPermutation(a) {
  // Rearrange a into the next larger order in place; false if it was the last.
  let i = a.length - 2;
  while (i >= 0 && a[i] >= a[i + 1]) i--;   // 1. find the rightmost ascent a[i] < a[i+1]
  if (i < 0) {
    a.reverse();                            // last order: wrap round to the first one
    return false;
  }
  let j = a.length - 1;
  while (a[j] <= a[i]) j--;                 // 2. rightmost element bigger than a[i]
  [a[i], a[j]] = [a[j], a[i]];              // 3. swap them
  reverseRange(a, i + 1, a.length - 1);     // 4. make the tail as small as possible
  return true;
}

function allByNext(nums) {
  const a = numSort(nums), out = [];
  while (true) {
    out.push([...a]);
    if (!nextPermutation(a)) return out;
  }
}

const fmt = (perms) => "[" + perms.map((p) => "[" + p.join(", ") + "]").join(", ") + "]";

console.log("no skip:        " + fmt(permuteUnique([1, 2, 1], false)));
console.log("skip rule:      " + fmt(permuteUnique([1, 2, 1], true)));
console.log("next perm loop: " + fmt(allByNext([1, 2, 1])));
console.log("[1, 1, 2, 2, 3]: " + permuteUnique([1, 1, 2, 2, 3], true).length + " by skip rule, " +
  allByNext([1, 1, 2, 2, 3]).length + " by next permutation");
let a = [1, 3, 2];
console.log("next of [1, 3, 2]: " + nextPermutation(a) + " -> [" + a.join(", ") + "]");
a = [3, 2, 1];
console.log("next of [3, 2, 1]: " + nextPermutation(a) + " -> [" + a.join(", ") + "]");`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an int array of distinct values, return all of its permutations as a \`List<List<Integer>>\`. Write it in Java with backtracking, and then tell me how you would handle duplicate values."

**What a strong answer should cover:**
- There are n! permutations of n distinct elements: n choices for the first position, n - 1 for the second, and so on.
- Backtracking with a \`used\` marker: pick any unused element for the next position, recurse, then undo both the path and the marker.
- The in-place swap alternative (fix position k by swapping each candidate into it) and how its output order differs.
- Complexity O(n · n!) time, O(n) extra space; impossible to beat when all permutations must be listed.
- Duplicates (Permutations II): sort, and skip \`nums[i]\` when it equals \`nums[i - 1]\` and \`nums[i - 1]\` is not used; or the next-permutation algorithm.
- Java details: \`new ArrayList<>(path)\` when recording, \`path.remove(path.size() - 1)\` to undo, a \`boolean[] used\` (default \`false\`), and that n! overflows \`int\` at n = 13.

**Clarifying questions expected:**
- Are the values distinct, and if not, should equal permutations appear once?
- Does the output need to be in sorted (lexicographic) order?
- Do you need all of them, or just the next one / the k-th one?

**Code / implementation expected:** Yes — a backtracking method in Java with a \`boolean[] used\` (or in-place swaps), plus the duplicate-skip rule.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and basic recursion  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Three friends — Ana, Ben and Cy — arrive for a photo and argue about who stands where. How many different line-ups are there? Anyone of the three can stand on the left. Once that is decided, either of the two others can stand in the middle. The last person takes the last spot. That is 3 × 2 × 1 = 6 line-ups.

Listing those six line-ups is the permutations problem. With 8 friends it is 40,320 line-ups, with 10 it is over 3.6 million, so the problem is less about speed and more about getting a clean, correct procedure — which is [backtracking](/interview-question/what-is-backtracking): put someone in the next spot, arrange the rest, then take them back out and try the next person.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all values distinct? | With duplicates, \`[1, 1, 2]\` has only 3 different arrangements, not 6; you need the skip rule (section 6). |
| Does the output order matter? | The \`used\` version on sorted input gives lexicographic order; the swap version does not. |
| How large can n be? | n! explodes (10! = 3,628,800), so n is usually 8 or less when every permutation must be returned. |
| Do you need all permutations, or only the next / k-th one? | The next permutation is an O(n) in-place algorithm — no enumeration needed. |

## 3. The Core Idea

Fill the result from left to right. At each position, any element that has *not been used yet* may go there. After choosing one, fill the remaining positions the same way; when every position is filled, record the arrangement. Then take the last element back out and try the next unused one.

📌 **Interview term: Permutation** — an arrangement of all the elements in some order. n distinct elements have n! (n factorial = n × (n - 1) × ... × 1) permutations.

📌 **Interview term: Used array** — a boolean per position that says whether that element is already in the current path, so each element is placed exactly once.

<svg class="iq-diagram" width="100%" viewBox="0 0 730 300" role="img" aria-label="Permutation tree for 1, 2, 3: three choices for the first slot, two for the second, one for the third, giving six leaves">
  <path class="d-edge" d="M 365 47 L 115 93"/>
  <path class="d-edge" d="M 365 47 L 365 93"/>
  <path class="d-edge" d="M 365 47 L 615 93"/>
  <path class="d-edge" d="M 115 127 L 55 173"/>
  <path class="d-edge" d="M 115 127 L 175 173"/>
  <path class="d-edge" d="M 365 127 L 305 173"/>
  <path class="d-edge" d="M 365 127 L 425 173"/>
  <path class="d-edge" d="M 615 127 L 555 173"/>
  <path class="d-edge" d="M 615 127 L 675 173"/>
  <path class="d-edge-accent" d="M 55 207 L 55 253"/>
  <path class="d-edge-accent" d="M 175 207 L 175 253"/>
  <path class="d-edge-accent" d="M 305 207 L 305 253"/>
  <path class="d-edge-accent" d="M 425 207 L 425 253"/>
  <path class="d-edge-accent" d="M 555 207 L 555 253"/>
  <path class="d-edge-accent" d="M 675 207 L 675 253"/>
  <rect class="d-box" x="330" y="13" width="70" height="34" rx="6"/>
  <text class="d-text" x="365" y="35" text-anchor="middle">[ ]</text>
  <rect class="d-box" x="80" y="93" width="70" height="34" rx="6"/>
  <text class="d-text" x="115" y="115" text-anchor="middle">1</text>
  <rect class="d-box" x="330" y="93" width="70" height="34" rx="6"/>
  <text class="d-text" x="365" y="115" text-anchor="middle">2</text>
  <rect class="d-box" x="580" y="93" width="70" height="34" rx="6"/>
  <text class="d-text" x="615" y="115" text-anchor="middle">3</text>
  <rect class="d-box" x="20" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="55" y="195" text-anchor="middle">1,2</text>
  <rect class="d-box" x="140" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="175" y="195" text-anchor="middle">1,3</text>
  <rect class="d-box" x="270" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="305" y="195" text-anchor="middle">2,1</text>
  <rect class="d-box" x="390" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="425" y="195" text-anchor="middle">2,3</text>
  <rect class="d-box" x="520" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="555" y="195" text-anchor="middle">3,1</text>
  <rect class="d-box" x="640" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="675" y="195" text-anchor="middle">3,2</text>
  <rect class="d-box-accent" x="20" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="55" y="275" text-anchor="middle">1,2,3</text>
  <rect class="d-box-accent" x="140" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="175" y="275" text-anchor="middle">1,3,2</text>
  <rect class="d-box-accent" x="270" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="305" y="275" text-anchor="middle">2,1,3</text>
  <rect class="d-box-accent" x="390" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="425" y="275" text-anchor="middle">2,3,1</text>
  <rect class="d-box-accent" x="520" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="555" y="275" text-anchor="middle">3,1,2</text>
  <rect class="d-box-accent" x="640" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="675" y="275" text-anchor="middle">3,2,1</text>
</svg>

Three branches at the top, two under each, one under each of those: 3 × 2 × 1 = 6 leaves, and the leaves read left to right are the permutations in sorted order. Unlike [subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array), only the leaves are answers, and the loop always starts from index 0 — the \`used\` array, not a start index, prevents repeats.

## 4. Two Backtracking Versions in Java

**A. The \`used\` array** — the standard answer:

~~~java
// Pick any unused element for the next slot; a used[] array remembers.
static void used(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> out) {
    calls++;
    if (path.size() == nums.length) {
        out.add(new ArrayList<>(path));        // copy: path keeps changing
        return;
    }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true;                        // choose
        path.add(nums[i]);
        used(nums, used, path, out);           // explore
        path.remove(path.size() - 1);          // un-choose (both pieces of state)
        used[i] = false;
    }
}
~~~

**B. In-place swaps** — instead of a separate path, treat the array itself as the path. Positions \`0..k-1\` are already decided; to decide position k, swap each candidate \`a[i]\` (for i ≥ k) into slot k, recurse on k + 1, then swap back:

~~~java
// Fix position k by swapping each candidate into it; no extra array.
static void swap(int[] a, int k, List<List<Integer>> out) {
    if (k == a.length) {
        List<Integer> p = new ArrayList<>();
        for (int x : a) p.add(x);
        out.add(p);
        return;
    }
    for (int i = k; i < a.length; i++) {
        int t = a[k]; a[k] = a[i]; a[i] = t;   // choose: bring a[i] to slot k
        swap(a, k + 1, out);
        t = a[k]; a[k] = a[i]; a[i] = t;       // un-choose: swap back
    }
}
~~~

📌 **Interview term: Swap-based permutation** — generating permutations by swapping each remaining element into the current position and swapping it back afterwards; no extra \`used\` array or path is needed.

**What to point out in this Java code:**

- \`new boolean[nums.length]\` starts all \`false\`, so no fill is needed. Both \`path\` and \`used[i]\` are restored after the recursive call.
- \`out.add(new ArrayList<>(path))\` copies the path; \`path.remove(path.size() - 1)\` is \`remove(int index)\`, the right overload for undoing the last choice.
- The swap version copies the array with \`nums.clone()\` so the caller array keeps its order, and converts each finished \`int[]\` into a \`List<Integer>\` (boxing each value).
- Java has no built-in permutation generator in the standard library, so this code (or the next-permutation loop in section 6) is what the interviewer expects.
- Factorials overflow \`int\` quickly: in our check, an \`int\` loop gave \`479001600\` for 12! (correct) and \`1932053504\` for 13! (the true value is 6,227,020,800). Use \`long\` for counts above 12.

The two versions produce the same six permutations but **not in the same order**: the swap version prints \`[3, 2, 1]\` before \`[3, 1, 2]\`, because after swapping 3 to the front the remaining elements are in the order \`2, 1\`. If the interviewer wants sorted output, use version A on a sorted input.

## 5. Next Permutation: the Iterative Way

There is a classic O(n) algorithm that turns one permutation into the next one in sorted order, in place:

1. From the right, find the first position i with \`a[i] < a[i + 1]\`. Everything to the right of i is in decreasing order, so it is already the *last* arrangement of that tail. If there is no such i, the whole array is the last permutation.
2. From the right, find the first position j with \`a[j] > a[i]\`.
3. Swap \`a[i]\` and \`a[j]\`.
4. Reverse the tail after i, turning it from decreasing (largest) into increasing (smallest).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Next permutation of 1 3 5 4 2: find i at value 3 and j at value 4, swap them, then reverse the tail to get 1 4 2 3 5">
  <text class="d-sub d-accent" x="310" y="40" text-anchor="middle">i</text>
  <text class="d-sub d-accent" x="470" y="40" text-anchor="middle">j</text>
  <text class="d-text" x="20" y="77">1. find i, j</text>
  <rect class="d-box" x="200" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="230" y="77" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="280" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="310" y="77" text-anchor="middle">3</text>
  <rect class="d-box" x="360" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="390" y="77" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="440" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="470" y="77" text-anchor="middle">4</text>
  <rect class="d-box" x="520" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="550" y="77" text-anchor="middle">2</text>
  <text class="d-text" x="20" y="167">2. swap</text>
  <rect class="d-box" x="200" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="230" y="167" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="280" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="310" y="167" text-anchor="middle">4</text>
  <rect class="d-box" x="360" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="390" y="167" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="440" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="470" y="167" text-anchor="middle">3</text>
  <rect class="d-box" x="520" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="550" y="167" text-anchor="middle">2</text>
  <text class="d-text" x="20" y="257">3. reverse tail</text>
  <rect class="d-box" x="200" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="230" y="257" text-anchor="middle">1</text>
  <rect class="d-box" x="280" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="310" y="257" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="360" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="390" y="257" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="440" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="470" y="257" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="520" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="550" y="257" text-anchor="middle">5</text>
</svg>

For \`[1, 3, 5, 4, 2]\`: i points at 3 (because 3 < 5), j points at 4 (the rightmost value larger than 3), the swap gives \`[1, 4, 5, 3, 2]\`, and reversing the tail \`5, 3, 2\` gives \`[1, 4, 2, 3, 5]\` — the very next arrangement in sorted order.

~~~java
// Rearrange a into the next larger order in place; false if it was the last.
static boolean nextPermutation(int[] a) {
    int i = a.length - 2;
    while (i >= 0 && a[i] >= a[i + 1]) i--;    // 1. find the rightmost ascent a[i] < a[i+1]
    if (i < 0) {
        reverse(a, 0, a.length - 1);           // last order: wrap round to the first one
        return false;
    }
    int j = a.length - 1;
    while (a[j] <= a[i]) j--;                  // 2. rightmost element bigger than a[i]
    swap(a, i, j);                             // 3. swap them
    reverse(a, i + 1, a.length - 1);           // 4. make the tail as small as possible
    return true;
}
~~~

📌 **Interview term: Lexicographic order** — dictionary order: compare two sequences at the first position where they differ. \`[1, 3, 2]\` comes before \`[2, 1, 3]\`.

📌 **Interview term: Next permutation** — the smallest arrangement that is lexicographically greater than the current one; computable in O(n) time and O(1) extra space.

## 6. Duplicates: Permutations II

With \`[1, 1, 2]\`, the two 1s are interchangeable, so the plain algorithm prints each arrangement twice. The fix: sort the input so equal values are neighbours, then **use equal values only from left to right** — skip \`nums[i]\` if it equals \`nums[i - 1]\` and \`nums[i - 1]\` is *not* currently used.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="With sorted input 1, 1, 2 the second 1 is skipped as a first choice while the first 1 is unused">
  <path class="d-edge" d="M 320 57 L 130 133"/>
  <path class="d-edge-dashed" d="M 320 57 L 320 133"/>
  <path class="d-edge" d="M 320 57 L 510 133"/>
  <rect class="d-box" x="270" y="23" width="100" height="34" rx="6"/>
  <text class="d-text" x="320" y="45" text-anchor="middle">[ ]</text>
  <rect class="d-box-accent" x="70" y="133" width="120" height="34" rx="6"/>
  <text class="d-text" x="130" y="155" text-anchor="middle">first 1</text>
  <rect class="d-box-muted" x="260" y="133" width="120" height="34" rx="6"/>
  <text class="d-text" x="320" y="155" text-anchor="middle">second 1</text>
  <rect class="d-box-accent" x="450" y="133" width="120" height="34" rx="6"/>
  <text class="d-text" x="510" y="155" text-anchor="middle">2</text>
  <text class="d-sub" x="130" y="200" text-anchor="middle">kept</text>
  <text class="d-sub" x="320" y="200" text-anchor="middle">skipped</text>
  <text class="d-sub" x="320" y="224" text-anchor="middle">twin still unused</text>
  <text class="d-sub" x="510" y="200" text-anchor="middle">kept</text>
</svg>

At the root, the first 1 is free, so starting with the second 1 would just repeat the subtree that starts with the first 1. Deeper down, once the first 1 is in the path, the second 1 is allowed.

~~~java
static void go(int[] nums, boolean skip, boolean[] used, List<Integer> path, List<List<Integer>> out) {
    if (path.size() == nums.length) {
        out.add(new ArrayList<>(path));
        return;
    }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        // Use equal values left to right only: skip nums[i] while its twin
        // nums[i - 1] is still unused in this branch.
        if (skip && i > 0 && nums[i] == nums[i - 1] && !used[i - 1]) continue;
        used[i] = true;
        path.add(nums[i]);
        go(nums, skip, used, path, out);
        path.remove(path.size() - 1);
        used[i] = false;
    }
}
~~~

The next-permutation loop handles duplicates for free: the \`>=\` and \`<=\` comparisons skip over equal values, so starting from the sorted array it visits each distinct arrangement exactly once. Example 2 checks both methods on \`[1, 1, 2, 2, 3]\`: 5! / (2! · 2!) = 30.

📌 **Interview term: Multiset permutation** — a permutation of a collection with repeated values; the count is n! divided by the factorial of each value multiplicity.

## 7. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — used-array vs swap backtracking on [1, 2, 3], and n! for n up to 8 with call counts** prints:

~~~text
used[] array:  [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]
swap in place: [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 2, 1], [3, 1, 2]]
empty input:   [[]]
n = 1: 1 permutations, 2 calls
n = 2: 2 permutations, 5 calls
n = 3: 6 permutations, 16 calls
n = 4: 24 permutations, 65 calls
n = 5: 120 permutations, 326 calls
n = 6: 720 permutations, 1957 calls
n = 7: 5040 permutations, 13700 calls
n = 8: 40320 permutations, 109601 calls
~~~

**Example 2 — Permutations II (duplicates) by the skip rule and by next permutation** prints:

~~~text
no skip:        [[1, 1, 2], [1, 2, 1], [1, 1, 2], [1, 2, 1], [2, 1, 1], [2, 1, 1]]
skip rule:      [[1, 1, 2], [1, 2, 1], [2, 1, 1]]
next perm loop: [[1, 1, 2], [1, 2, 1], [2, 1, 1]]
[1, 1, 2, 2, 3]: 30 by skip rule, 30 by next permutation
next of [1, 3, 2]: true -> [2, 1, 3]
next of [3, 2, 1]: false -> [1, 2, 3]
~~~

The call counts in example 1 grow slightly faster than n!: the tree has one node for every partial arrangement, 1 + n + n(n-1) + ... + n!, which is about 2.7 × n! (109,601 calls for 40,320 permutations at n = 8).

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`used\` backtracking | O(n · n!) | O(n) | about e · n! nodes; each leaf copies n elements |
| Swap backtracking | O(n · n!) | O(n) recursion | same tree, no \`used\` array or separate path |
| Next-permutation loop | O(n · n!) total, O(n) per step | O(1) | each step scans and reverses at most n elements |
| Output | — | O(n · n!) | n! arrangements of n numbers |

See [Big-O notation](/interview-question/what-is-big-o-notation) if n · n! looks unfamiliar; it grows faster than any exponential c^n.

## 9. Edge Cases

- **Empty input** → \`[[]]\`: exactly one arrangement of nothing. Example 1 prints it.
- **One element** → one permutation.
- **All values equal** → one permutation; the skip rule (or next permutation) gives exactly that.
- **Output order.** Specify it: lexicographic needs sorted input plus the \`used\` version or next permutation.
- **Constraints instead of all arrangements.** If only *some* permutations are valid (no two queens attacking, no adjacent equal letters), prune inside the loop — that is how [N-Queens](/interview-question/how-do-you-solve-the-n-queens-problem) works: a permutation of columns with diagonal checks.

## Common Pitfalls

- **Adding \`path\` instead of \`new ArrayList<>(path)\`.** All stored permutations end up as the same, empty list.
- **Undoing only half the state.** Forgetting \`used[i] = false\` makes later branches think that element is taken.
- **\`path.remove(nums[i])\`.** With an \`int\` argument that removes by *index*; you delete the wrong element or get \`IndexOutOfBoundsException\`.
- **Skip rule without \`Arrays.sort\`.** \`nums[i] == nums[i - 1]\` only finds twins that are neighbours.
- **Counting n! in an \`int\`.** Wraps silently from 13! on; use \`long\` (fine up to 20!) or \`BigInteger\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Count first:</strong> <span style="color:#f0e2c8;">n distinct elements have n! permutations: n choices for the first slot, n - 1 for the next, and so on.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">backtracking with a used array: for each unused element, mark it, append it, recurse, then pop and unmark; record when the path has n elements.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Alternative:</strong> <span style="color:#f0e2c8;">swap each candidate into position k and swap back, or step with the O(n) next-permutation algorithm.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity and duplicates:</strong> <span style="color:#f0e2c8;">O(n · n!) time, O(n) extra space. For duplicates, sort and skip nums[i] when it equals nums[i - 1] and nums[i - 1] is unused.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[] used</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new ArrayList&lt;&gt;(path)</code> to record, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove(path.size() - 1)</code> to undo, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> for any factorial above 12.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the swap version print <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[3, 2, 1]</code> before <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[3, 1, 2]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After swapping 3 to the front the rest is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[2, 1]</code>, and the swap version never re-sorts. Still correct, just not lexicographic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle duplicates?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort</code>, then skip <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i] == nums[i - 1] &amp;&amp; !used[i - 1]</code>: equal values are used left to right only. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 1, 2]</code> gives 3 instead of 6.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the time complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n · n!): n! leaves, each copied in O(n). We counted 109,601 calls for n = 8, about 2.7 calls per permutation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get the next permutation in place?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rightmost i with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a[i] &lt; a[i + 1]</code>, swap with the rightmost larger element, reverse the tail. O(n) time, O(1) extra space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How much memory does returning all permutations of 10 elements take?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">3,628,800 lists of 10 boxed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code>s — tens of millions of object references. If you only need to process them, loop with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nextPermutation</code> on one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> instead.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Permutation** | An arrangement of all elements in some order; n! of them for n distinct elements |
| **Used array** | One flag per element: is it already in the current path? |
| **Swap-based permutation** | Swap each candidate into the current slot, recurse, swap back |
| **Lexicographic order** | Dictionary order: compare at the first differing position |
| **Next permutation** | The next larger arrangement, found in O(n) by find, swap, reverse |
| **Multiset permutation** | Permutation with repeated values; n! divided by each multiplicity factorial |

---
**Conclusion:** In Java, permutations are a recursive method with a shared \`ArrayList<Integer>\` and a \`boolean[] used\`: pick any unused index, recurse, then undo both, and add \`new ArrayList<>(path)\` when the path is full. The swap version saves the \`used\` array but gives a different order, duplicates need \`Arrays.sort\` plus the \`!used[i - 1]\` skip rule, and the next-permutation loop works on a single \`int[]\`. Compare it with [subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array) (start index instead of a used array) and [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem) (start index plus a running total).`,
        examples: [
          {
            label: "Permutations two ways (used[] and swaps), and how n! grows",
            code: `import java.util.ArrayList;
import java.util.List;

// Two backtracking ways to generate all permutations, and how fast n! grows.
public class Main {
    static long calls;

    // Pick any unused element for the next slot; a used[] array remembers.
    static void used(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> out) {
        calls++;
        if (path.size() == nums.length) {
            out.add(new ArrayList<>(path));        // copy: path keeps changing
            return;
        }
        for (int i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true;                        // choose
            path.add(nums[i]);
            used(nums, used, path, out);           // explore
            path.remove(path.size() - 1);          // un-choose (both pieces of state)
            used[i] = false;
        }
    }

    static List<List<Integer>> permuteUsed(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        calls = 0;
        used(nums, new boolean[nums.length], new ArrayList<>(), out);
        return out;
    }

    // Fix position k by swapping each candidate into it; no extra array.
    static void swap(int[] a, int k, List<List<Integer>> out) {
        if (k == a.length) {
            List<Integer> p = new ArrayList<>();
            for (int x : a) p.add(x);
            out.add(p);
            return;
        }
        for (int i = k; i < a.length; i++) {
            int t = a[k]; a[k] = a[i]; a[i] = t;   // choose: bring a[i] to slot k
            swap(a, k + 1, out);
            t = a[k]; a[k] = a[i]; a[i] = t;       // un-choose: swap back
        }
    }

    static List<List<Integer>> permuteSwap(int[] nums) {
        List<List<Integer>> out = new ArrayList<>();
        swap(nums.clone(), 0, out);
        return out;
    }

    public static void main(String[] args) {
        System.out.println("used[] array:  " + permuteUsed(new int[] {1, 2, 3}));
        System.out.println("swap in place: " + permuteSwap(new int[] {1, 2, 3}));
        System.out.println("empty input:   " + permuteUsed(new int[] {}));

        for (int n = 1; n <= 8; n++) {
            int[] nums = new int[n];
            for (int i = 0; i < n; i++) nums[i] = i + 1;
            List<List<Integer>> perms = permuteUsed(nums);
            System.out.println("n = " + n + ": " + perms.size() + " permutations, " + calls + " calls");
        }
    }
}`,
          },
          {
            label: "Permutations II with duplicates, and the next-permutation algorithm",
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

// Permutations II (duplicates) two ways: the skip rule, and next permutation.
public class Main {
    static void go(int[] nums, boolean skip, boolean[] used, List<Integer> path, List<List<Integer>> out) {
        if (path.size() == nums.length) {
            out.add(new ArrayList<>(path));
            return;
        }
        for (int i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            // Use equal values left to right only: skip nums[i] while its twin
            // nums[i - 1] is still unused in this branch.
            if (skip && i > 0 && nums[i] == nums[i - 1] && !used[i - 1]) continue;
            used[i] = true;
            path.add(nums[i]);
            go(nums, skip, used, path, out);
            path.remove(path.size() - 1);
            used[i] = false;
        }
    }

    static List<List<Integer>> permuteUnique(int[] input, boolean skip) {
        int[] nums = input.clone();
        Arrays.sort(nums);                         // equal values must sit next to each other
        List<List<Integer>> out = new ArrayList<>();
        go(nums, skip, new boolean[nums.length], new ArrayList<>(), out);
        return out;
    }

    static void swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }

    static void reverse(int[] a, int lo, int hi) { while (lo < hi) swap(a, lo++, hi--); }

    // Rearrange a into the next larger order in place; false if it was the last.
    static boolean nextPermutation(int[] a) {
        int i = a.length - 2;
        while (i >= 0 && a[i] >= a[i + 1]) i--;    // 1. find the rightmost ascent a[i] < a[i+1]
        if (i < 0) {
            reverse(a, 0, a.length - 1);           // last order: wrap round to the first one
            return false;
        }
        int j = a.length - 1;
        while (a[j] <= a[i]) j--;                  // 2. rightmost element bigger than a[i]
        swap(a, i, j);                             // 3. swap them
        reverse(a, i + 1, a.length - 1);           // 4. make the tail as small as possible
        return true;
    }

    static List<List<Integer>> allByNext(int[] nums) {
        int[] a = nums.clone();
        Arrays.sort(a);
        List<List<Integer>> out = new ArrayList<>();
        do {
            List<Integer> p = new ArrayList<>();
            for (int x : a) p.add(x);
            out.add(p);
        } while (nextPermutation(a));
        return out;
    }

    public static void main(String[] args) {
        System.out.println("no skip:        " + permuteUnique(new int[] {1, 2, 1}, false));
        System.out.println("skip rule:      " + permuteUnique(new int[] {1, 2, 1}, true));
        System.out.println("next perm loop: " + allByNext(new int[] {1, 2, 1}));
        int[] big = {1, 1, 2, 2, 3};
        System.out.println("[1, 1, 2, 2, 3]: " + permuteUnique(big, true).size() + " by skip rule, "
            + allByNext(big).size() + " by next permutation");
        int[] a = {1, 3, 2};
        boolean moved = nextPermutation(a);
        System.out.println("next of [1, 3, 2]: " + moved + " -> " + Arrays.toString(a));
        a = new int[] {3, 2, 1};
        moved = nextPermutation(a);
        System.out.println("next of [3, 2, 1]: " + moved + " -> " + Arrays.toString(a));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a \`vector<int>\` of distinct values, return all of its permutations. Write it in C++ with backtracking, and then tell me how you would handle duplicate values and where the standard library helps."

**What a strong answer should cover:**
- There are n! permutations of n distinct elements: n choices for the first position, n - 1 for the second, and so on.
- Backtracking with a \`used\` marker: pick any unused element for the next position, recurse, then undo both the path and the marker.
- The in-place swap alternative (fix position k by swapping each candidate into it) and how its output order differs.
- Complexity O(n · n!) time, O(n) extra space; impossible to beat when all permutations must be listed.
- Duplicates (Permutations II): sort, and skip \`nums[i]\` when it equals \`nums[i - 1]\` and \`nums[i - 1]\` is not used; or the next-permutation algorithm.
- C++ details: \`std::next_permutation\` generates permutations in lexicographic order *only if you start from a sorted range*; \`out.push_back(path)\` copies; \`std::swap\` for the swap version; n! overflows \`int\` at n = 13.

**Clarifying questions expected:**
- Are the values distinct, and if not, should equal permutations appear once?
- Does the output need to be in sorted (lexicographic) order?
- Do you need all of them, or just the next one / the k-th one?

**Code / implementation expected:** Yes — a backtracking function in C++ with a \`vector<bool> used\` (or in-place swaps), plus the duplicate rule; knowing \`std::next_permutation\` is a plus.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and basic recursion  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Three friends — Ana, Ben and Cy — arrive for a photo and argue about who stands where. How many different line-ups are there? Anyone of the three can stand on the left. Once that is decided, either of the two others can stand in the middle. The last person takes the last spot. That is 3 × 2 × 1 = 6 line-ups.

Listing those six line-ups is the permutations problem. With 8 friends it is 40,320 line-ups, with 10 it is over 3.6 million, so the problem is less about speed and more about getting a clean, correct procedure — which is [backtracking](/interview-question/what-is-backtracking): put someone in the next spot, arrange the rest, then take them back out and try the next person.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are all values distinct? | With duplicates, \`[1, 1, 2]\` has only 3 different arrangements, not 6; you need the skip rule (section 6). |
| Does the output order matter? | The \`used\` version on sorted input gives lexicographic order; the swap version does not. |
| How large can n be? | n! explodes (10! = 3,628,800), so n is usually 8 or less when every permutation must be returned. |
| Do you need all permutations, or only the next / k-th one? | The next permutation is an O(n) in-place algorithm — no enumeration needed. |

## 3. The Core Idea

Fill the result from left to right. At each position, any element that has *not been used yet* may go there. After choosing one, fill the remaining positions the same way; when every position is filled, record the arrangement. Then take the last element back out and try the next unused one.

📌 **Interview term: Permutation** — an arrangement of all the elements in some order. n distinct elements have n! (n factorial = n × (n - 1) × ... × 1) permutations.

📌 **Interview term: Used array** — a boolean per position that says whether that element is already in the current path, so each element is placed exactly once.

<svg class="iq-diagram" width="100%" viewBox="0 0 730 300" role="img" aria-label="Permutation tree for 1, 2, 3: three choices for the first slot, two for the second, one for the third, giving six leaves">
  <path class="d-edge" d="M 365 47 L 115 93"/>
  <path class="d-edge" d="M 365 47 L 365 93"/>
  <path class="d-edge" d="M 365 47 L 615 93"/>
  <path class="d-edge" d="M 115 127 L 55 173"/>
  <path class="d-edge" d="M 115 127 L 175 173"/>
  <path class="d-edge" d="M 365 127 L 305 173"/>
  <path class="d-edge" d="M 365 127 L 425 173"/>
  <path class="d-edge" d="M 615 127 L 555 173"/>
  <path class="d-edge" d="M 615 127 L 675 173"/>
  <path class="d-edge-accent" d="M 55 207 L 55 253"/>
  <path class="d-edge-accent" d="M 175 207 L 175 253"/>
  <path class="d-edge-accent" d="M 305 207 L 305 253"/>
  <path class="d-edge-accent" d="M 425 207 L 425 253"/>
  <path class="d-edge-accent" d="M 555 207 L 555 253"/>
  <path class="d-edge-accent" d="M 675 207 L 675 253"/>
  <rect class="d-box" x="330" y="13" width="70" height="34" rx="6"/>
  <text class="d-text" x="365" y="35" text-anchor="middle">[ ]</text>
  <rect class="d-box" x="80" y="93" width="70" height="34" rx="6"/>
  <text class="d-text" x="115" y="115" text-anchor="middle">1</text>
  <rect class="d-box" x="330" y="93" width="70" height="34" rx="6"/>
  <text class="d-text" x="365" y="115" text-anchor="middle">2</text>
  <rect class="d-box" x="580" y="93" width="70" height="34" rx="6"/>
  <text class="d-text" x="615" y="115" text-anchor="middle">3</text>
  <rect class="d-box" x="20" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="55" y="195" text-anchor="middle">1,2</text>
  <rect class="d-box" x="140" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="175" y="195" text-anchor="middle">1,3</text>
  <rect class="d-box" x="270" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="305" y="195" text-anchor="middle">2,1</text>
  <rect class="d-box" x="390" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="425" y="195" text-anchor="middle">2,3</text>
  <rect class="d-box" x="520" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="555" y="195" text-anchor="middle">3,1</text>
  <rect class="d-box" x="640" y="173" width="70" height="34" rx="6"/>
  <text class="d-text" x="675" y="195" text-anchor="middle">3,2</text>
  <rect class="d-box-accent" x="20" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="55" y="275" text-anchor="middle">1,2,3</text>
  <rect class="d-box-accent" x="140" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="175" y="275" text-anchor="middle">1,3,2</text>
  <rect class="d-box-accent" x="270" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="305" y="275" text-anchor="middle">2,1,3</text>
  <rect class="d-box-accent" x="390" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="425" y="275" text-anchor="middle">2,3,1</text>
  <rect class="d-box-accent" x="520" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="555" y="275" text-anchor="middle">3,1,2</text>
  <rect class="d-box-accent" x="640" y="253" width="70" height="34" rx="6"/>
  <text class="d-text" x="675" y="275" text-anchor="middle">3,2,1</text>
</svg>

Three branches at the top, two under each, one under each of those: 3 × 2 × 1 = 6 leaves, and the leaves read left to right are the permutations in sorted order. Unlike [subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array), only the leaves are answers, and the loop always starts from index 0 — the \`used\` array, not a start index, prevents repeats.

## 4. Two Backtracking Versions in C++

**A. The \`used\` array** — the standard answer:

~~~cpp
// Pick any unused element for the next slot; a used[] array remembers.
void usedGo(const vector<int>& nums, vector<bool>& used, vector<int>& path, Perms& out) {
    calls++;
    if (path.size() == nums.size()) {
        out.push_back(path);                   // push_back copies path
        return;
    }
    for (size_t i = 0; i < nums.size(); i++) {
        if (used[i]) continue;
        used[i] = true;                        // choose
        path.push_back(nums[i]);
        usedGo(nums, used, path, out);         // explore
        path.pop_back();                       // un-choose (both pieces of state)
        used[i] = false;
    }
}
~~~

**B. In-place swaps** — instead of a separate path, treat the array itself as the path. Positions \`0..k-1\` are already decided; to decide position k, swap each candidate \`a[i]\` (for i ≥ k) into slot k, recurse on k + 1, then swap back:

~~~cpp
// Fix position k by swapping each candidate into it; no extra array.
void swapGo(vector<int>& a, size_t k, Perms& out) {
    if (k == a.size()) {
        out.push_back(a);
        return;
    }
    for (size_t i = k; i < a.size(); i++) {
        swap(a[k], a[i]);                      // choose: bring a[i] to slot k
        swapGo(a, k + 1, out);
        swap(a[k], a[i]);                      // un-choose: swap back
    }
}
~~~

📌 **Interview term: Swap-based permutation** — generating permutations by swapping each remaining element into the current position and swapping it back afterwards; no extra \`used\` array or path is needed.

**What to point out in this C++ code:**

- \`vector<bool> used(n, false)\` marks taken positions. Both \`path\` and \`used[i]\` are restored after the recursive call.
- \`out.push_back(path)\` copies the current vector, so no manual copy is needed when recording.
- \`std::swap(a[k], a[i])\` swaps two elements; \`permuteSwap\` takes its argument by value, so it works on a copy and the caller vector keeps its order.
- The standard library has \`std::next_permutation(first, last)\`: it rearranges the range into the next lexicographically greater permutation and returns \`true\`, or, if there is none, rearranges it into the first (sorted) permutation and returns \`false\` ([std::next_permutation](https://en.cppreference.com/w/cpp/algorithm/next_permutation)). In our run, calling it on \`{3, 2, 1}\` returned \`false\` and left \`{1, 2, 3}\`.
- Factorials overflow a 32-bit \`int\` from 13! (6,227,020,800) on. Use \`long long\` (fine up to 20!) for counts; signed overflow is undefined behaviour.

The two versions produce the same six permutations but **not in the same order**: the swap version prints \`[3, 2, 1]\` before \`[3, 1, 2]\`, because after swapping 3 to the front the remaining elements are in the order \`2, 1\`. If the interviewer wants sorted output, use version A on a sorted input.

## 5. Next Permutation: the Iterative Way

There is a classic O(n) algorithm that turns one permutation into the next one in sorted order, in place:

1. From the right, find the first position i with \`a[i] < a[i + 1]\`. Everything to the right of i is in decreasing order, so it is already the *last* arrangement of that tail. If there is no such i, the whole array is the last permutation.
2. From the right, find the first position j with \`a[j] > a[i]\`.
3. Swap \`a[i]\` and \`a[j]\`.
4. Reverse the tail after i, turning it from decreasing (largest) into increasing (smallest).

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="Next permutation of 1 3 5 4 2: find i at value 3 and j at value 4, swap them, then reverse the tail to get 1 4 2 3 5">
  <text class="d-sub d-accent" x="310" y="40" text-anchor="middle">i</text>
  <text class="d-sub d-accent" x="470" y="40" text-anchor="middle">j</text>
  <text class="d-text" x="20" y="77">1. find i, j</text>
  <rect class="d-box" x="200" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="230" y="77" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="280" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="310" y="77" text-anchor="middle">3</text>
  <rect class="d-box" x="360" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="390" y="77" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="440" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="470" y="77" text-anchor="middle">4</text>
  <rect class="d-box" x="520" y="52" width="60" height="40" rx="6"/>
  <text class="d-text" x="550" y="77" text-anchor="middle">2</text>
  <text class="d-text" x="20" y="167">2. swap</text>
  <rect class="d-box" x="200" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="230" y="167" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="280" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="310" y="167" text-anchor="middle">4</text>
  <rect class="d-box" x="360" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="390" y="167" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="440" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="470" y="167" text-anchor="middle">3</text>
  <rect class="d-box" x="520" y="142" width="60" height="40" rx="6"/>
  <text class="d-text" x="550" y="167" text-anchor="middle">2</text>
  <text class="d-text" x="20" y="257">3. reverse tail</text>
  <rect class="d-box" x="200" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="230" y="257" text-anchor="middle">1</text>
  <rect class="d-box" x="280" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="310" y="257" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="360" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="390" y="257" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="440" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="470" y="257" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="520" y="232" width="60" height="40" rx="6"/>
  <text class="d-text" x="550" y="257" text-anchor="middle">5</text>
</svg>

For \`[1, 3, 5, 4, 2]\`: i points at 3 (because 3 < 5), j points at 4 (the rightmost value larger than 3), the swap gives \`[1, 4, 5, 3, 2]\`, and reversing the tail \`5, 3, 2\` gives \`[1, 4, 2, 3, 5]\` — the very next arrangement in sorted order.

~~~cpp
// Hand-written: rearrange a into the next larger order; false if it was the last.
bool nextPerm(vector<int>& a) {
    int i = (int)a.size() - 2;
    while (i >= 0 && a[i] >= a[i + 1]) i--;    // 1. find the rightmost ascent a[i] < a[i+1]
    if (i < 0) {
        reverse(a.begin(), a.end());           // last order: wrap round to the first one
        return false;
    }
    int j = (int)a.size() - 1;
    while (a[j] <= a[i]) j--;                  // 2. rightmost element bigger than a[i]
    swap(a[i], a[j]);                          // 3. swap them
    reverse(a.begin() + i + 1, a.end());       // 4. make the tail as small as possible
    return true;
}
~~~

📌 **Interview term: Lexicographic order** — dictionary order: compare two sequences at the first position where they differ. \`[1, 3, 2]\` comes before \`[2, 1, 3]\`.

📌 **Interview term: Next permutation** — the smallest arrangement that is lexicographically greater than the current one; computable in O(n) time and O(1) extra space.

## 6. Duplicates: Permutations II

With \`[1, 1, 2]\`, the two 1s are interchangeable, so the plain algorithm prints each arrangement twice. The fix: sort the input so equal values are neighbours, then **use equal values only from left to right** — skip \`nums[i]\` if it equals \`nums[i - 1]\` and \`nums[i - 1]\` is *not* currently used.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="With sorted input 1, 1, 2 the second 1 is skipped as a first choice while the first 1 is unused">
  <path class="d-edge" d="M 320 57 L 130 133"/>
  <path class="d-edge-dashed" d="M 320 57 L 320 133"/>
  <path class="d-edge" d="M 320 57 L 510 133"/>
  <rect class="d-box" x="270" y="23" width="100" height="34" rx="6"/>
  <text class="d-text" x="320" y="45" text-anchor="middle">[ ]</text>
  <rect class="d-box-accent" x="70" y="133" width="120" height="34" rx="6"/>
  <text class="d-text" x="130" y="155" text-anchor="middle">first 1</text>
  <rect class="d-box-muted" x="260" y="133" width="120" height="34" rx="6"/>
  <text class="d-text" x="320" y="155" text-anchor="middle">second 1</text>
  <rect class="d-box-accent" x="450" y="133" width="120" height="34" rx="6"/>
  <text class="d-text" x="510" y="155" text-anchor="middle">2</text>
  <text class="d-sub" x="130" y="200" text-anchor="middle">kept</text>
  <text class="d-sub" x="320" y="200" text-anchor="middle">skipped</text>
  <text class="d-sub" x="320" y="224" text-anchor="middle">twin still unused</text>
  <text class="d-sub" x="510" y="200" text-anchor="middle">kept</text>
</svg>

At the root, the first 1 is free, so starting with the second 1 would just repeat the subtree that starts with the first 1. Deeper down, once the first 1 is in the path, the second 1 is allowed.

~~~cpp
void go(const vector<int>& nums, bool skip, vector<bool>& used, vector<int>& path, Perms& out) {
    if (path.size() == nums.size()) {
        out.push_back(path);
        return;
    }
    for (size_t i = 0; i < nums.size(); i++) {
        if (used[i]) continue;
        // Use equal values left to right only: skip nums[i] while its twin
        // nums[i - 1] is still unused in this branch.
        if (skip && i > 0 && nums[i] == nums[i - 1] && !used[i - 1]) continue;
        used[i] = true;
        path.push_back(nums[i]);
        go(nums, skip, used, path, out);
        path.pop_back();
        used[i] = false;
    }
}
~~~

The next-permutation loop handles duplicates for free: the \`>=\` and \`<=\` comparisons skip over equal values, so starting from the sorted array it visits each distinct arrangement exactly once. Example 2 checks both methods on \`[1, 1, 2, 2, 3]\`: 5! / (2! · 2!) = 30.

📌 **Interview term: Multiset permutation** — a permutation of a collection with repeated values; the count is n! divided by the factorial of each value multiplicity.

## 7. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp -o main && ./main\` (GCC 13.3). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — used-array vs swap backtracking on [1, 2, 3], and n! for n up to 8 with call counts** prints:

~~~text
used[] array:  [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]
swap in place: [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 2, 1], [3, 1, 2]]
empty input:   [[]]
n = 1: 1 permutations, 2 calls
n = 2: 2 permutations, 5 calls
n = 3: 6 permutations, 16 calls
n = 4: 24 permutations, 65 calls
n = 5: 120 permutations, 326 calls
n = 6: 720 permutations, 1957 calls
n = 7: 5040 permutations, 13700 calls
n = 8: 40320 permutations, 109601 calls
~~~

**Example 2 — Permutations II (duplicates) by the skip rule and by next permutation** prints:

~~~text
no skip:        [[1, 1, 2], [1, 2, 1], [1, 1, 2], [1, 2, 1], [2, 1, 1], [2, 1, 1]]
skip rule:      [[1, 1, 2], [1, 2, 1], [2, 1, 1]]
next perm loop: [[1, 1, 2], [1, 2, 1], [2, 1, 1]]
[1, 1, 2, 2, 3]: 30 by skip rule, 30 by next permutation
next of [1, 3, 2]: true -> [2, 1, 3]
next of [3, 2, 1]: false -> [1, 2, 3]
~~~

The call counts in example 1 grow slightly faster than n!: the tree has one node for every partial arrangement, 1 + n + n(n-1) + ... + n!, which is about 2.7 × n! (109,601 calls for 40,320 permutations at n = 8).

## 8. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`used\` backtracking | O(n · n!) | O(n) | about e · n! nodes; each leaf copies n elements |
| Swap backtracking | O(n · n!) | O(n) recursion | same tree, no \`used\` array or separate path |
| Next-permutation loop | O(n · n!) total, O(n) per step | O(1) | each step scans and reverses at most n elements |
| Output | — | O(n · n!) | n! arrangements of n numbers |

See [Big-O notation](/interview-question/what-is-big-o-notation) if n · n! looks unfamiliar; it grows faster than any exponential c^n.

## 9. Edge Cases

- **Empty input** → \`[[]]\`: exactly one arrangement of nothing. Example 1 prints it.
- **One element** → one permutation.
- **All values equal** → one permutation; the skip rule (or next permutation) gives exactly that.
- **Output order.** Specify it: lexicographic needs sorted input plus the \`used\` version or next permutation.
- **Constraints instead of all arrangements.** If only *some* permutations are valid (no two queens attacking, no adjacent equal letters), prune inside the loop — that is how [N-Queens](/interview-question/how-do-you-solve-the-n-queens-problem) works: a permutation of columns with diagonal checks.

## Common Pitfalls

- **\`do { ... } while (next_permutation(...))\` on unsorted input.** It only visits permutations *after* the start. In our check, starting from \`{1, 2, 1}\` produced 2 arrangements instead of 3. Sort first.
- **Undoing only half the state.** Forgetting \`used[i] = false\` makes later branches think that element is taken.
- **Skip rule without sorting.** \`nums[i] == nums[i - 1]\` only finds twins that are neighbours.
- **Holding a reference to an element of \`out\`** while pushing more results; reallocation invalidates it.
- **Counting n! in an \`int\`.** From 13! on it overflows, which is undefined behaviour for signed types; use \`long long\` or \`unsigned long long\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Count first:</strong> <span style="color:#f0e2c8;">n distinct elements have n! permutations: n choices for the first slot, n - 1 for the next, and so on.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Algorithm:</strong> <span style="color:#f0e2c8;">backtracking with a used array: for each unused element, mark it, append it, recurse, then pop and unmark; record when the path has n elements.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Alternative:</strong> <span style="color:#f0e2c8;">swap each candidate into position k and swap back, or step with the O(n) next-permutation algorithm.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity and duplicates:</strong> <span style="color:#f0e2c8;">O(n · n!) time, O(n) extra space. For duplicates, sort and skip nums[i] when it equals nums[i - 1] and nums[i - 1] is unused.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">out.push_back(path)</code> copies for you; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::next_permutation</code> on a sorted vector lists each distinct permutation once, even when values repeat.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you just use the standard library?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: sort, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">do { use(v); } while (next_permutation(v.begin(), v.end()));</code>. It lists each distinct arrangement once, even with duplicates, in O(n) per step. Be ready to implement it by hand too.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle duplicates with backtracking?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort, then skip <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i] == nums[i - 1] &amp;&amp; !used[i - 1]</code>: equal values are used left to right only. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1, 1, 2}</code> gives 3 instead of 6.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the time complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n · n!): n! leaves, each copied in O(n). We counted 109,601 calls for n = 8, about 2.7 calls per permutation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the swap version print <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[3, 2, 1]</code> before <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[3, 1, 2]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After swapping 3 to the front the rest is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{2, 1}</code>, and the swap version never re-sorts. Still correct, just not lexicographic.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">next_permutation</code> do when it is already at the last permutation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> and leaves the range in sorted (first) order — our run turned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{3, 2, 1}</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{1, 2, 3}</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Permutation** | An arrangement of all elements in some order; n! of them for n distinct elements |
| **Used array** | One flag per element: is it already in the current path? |
| **Swap-based permutation** | Swap each candidate into the current slot, recurse, swap back |
| **Lexicographic order** | Dictionary order: compare at the first differing position |
| **Next permutation** | The next larger arrangement, found in O(n) by find, swap, reverse |
| **Multiset permutation** | Permutation with repeated values; n! divided by each multiplicity factorial |

---
**Conclusion:** In C++, permutations are a recursive function with \`vector<int>& path\` and a \`vector<bool> used\`: pick any unused index, recurse, then undo both, and \`out.push_back(path)\` when the path is full. The swap version saves the \`used\` array but gives a different order, duplicates need a \`sort\` plus the \`!used[i - 1]\` skip rule, and \`std::next_permutation\` on a sorted vector is the library way — sorted start required. Compare it with [subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array) (start index instead of a used array) and [Combination Sum](/interview-question/how-do-you-solve-the-combination-sum-problem) (start index plus a running total).`,
        examples: [
          {
            label: "Permutations two ways (used[] and swaps), and how n! grows",
            code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

// Two backtracking ways to generate all permutations, and how fast n! grows.
using Perms = vector<vector<int>>;
long long calls = 0;

// Pick any unused element for the next slot; a used[] array remembers.
void usedGo(const vector<int>& nums, vector<bool>& used, vector<int>& path, Perms& out) {
    calls++;
    if (path.size() == nums.size()) {
        out.push_back(path);                   // push_back copies path
        return;
    }
    for (size_t i = 0; i < nums.size(); i++) {
        if (used[i]) continue;
        used[i] = true;                        // choose
        path.push_back(nums[i]);
        usedGo(nums, used, path, out);         // explore
        path.pop_back();                       // un-choose (both pieces of state)
        used[i] = false;
    }
}

Perms permuteUsed(const vector<int>& nums) {
    Perms out;
    vector<bool> used(nums.size(), false);
    vector<int> path;
    calls = 0;
    usedGo(nums, used, path, out);
    return out;
}

// Fix position k by swapping each candidate into it; no extra array.
void swapGo(vector<int>& a, size_t k, Perms& out) {
    if (k == a.size()) {
        out.push_back(a);
        return;
    }
    for (size_t i = k; i < a.size(); i++) {
        swap(a[k], a[i]);                      // choose: bring a[i] to slot k
        swapGo(a, k + 1, out);
        swap(a[k], a[i]);                      // un-choose: swap back
    }
}

Perms permuteSwap(vector<int> a) {             // by value: works on a copy
    Perms out;
    swapGo(a, 0, out);
    return out;
}

string fmt(const Perms& perms) {
    string r = "[";
    for (size_t k = 0; k < perms.size(); k++) {
        if (k) r += ", ";
        r += "[";
        for (size_t i = 0; i < perms[k].size(); i++) {
            if (i) r += ", ";
            r += to_string(perms[k][i]);
        }
        r += "]";
    }
    return r + "]";
}

int main() {
    cout << "used[] array:  " << fmt(permuteUsed({1, 2, 3})) << "\\n";
    cout << "swap in place: " << fmt(permuteSwap({1, 2, 3})) << "\\n";
    cout << "empty input:   " << fmt(permuteUsed({})) << "\\n";

    for (int n = 1; n <= 8; n++) {
        vector<int> nums(n);
        for (int i = 0; i < n; i++) nums[i] = i + 1;
        Perms perms = permuteUsed(nums);
        cout << "n = " << n << ": " << perms.size() << " permutations, " << calls << " calls\\n";
    }
}`,
          },
          {
            label: "Permutations II with duplicates, and the next-permutation algorithm",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

// Permutations II (duplicates) two ways: the skip rule, and next permutation.
using Perms = vector<vector<int>>;

void go(const vector<int>& nums, bool skip, vector<bool>& used, vector<int>& path, Perms& out) {
    if (path.size() == nums.size()) {
        out.push_back(path);
        return;
    }
    for (size_t i = 0; i < nums.size(); i++) {
        if (used[i]) continue;
        // Use equal values left to right only: skip nums[i] while its twin
        // nums[i - 1] is still unused in this branch.
        if (skip && i > 0 && nums[i] == nums[i - 1] && !used[i - 1]) continue;
        used[i] = true;
        path.push_back(nums[i]);
        go(nums, skip, used, path, out);
        path.pop_back();
        used[i] = false;
    }
}

Perms permuteUnique(vector<int> nums, bool skip) {
    sort(nums.begin(), nums.end());            // equal values must sit next to each other
    Perms out;
    vector<bool> used(nums.size(), false);
    vector<int> path;
    go(nums, skip, used, path, out);
    return out;
}

// Hand-written: rearrange a into the next larger order; false if it was the last.
bool nextPerm(vector<int>& a) {
    int i = (int)a.size() - 2;
    while (i >= 0 && a[i] >= a[i + 1]) i--;    // 1. find the rightmost ascent a[i] < a[i+1]
    if (i < 0) {
        reverse(a.begin(), a.end());           // last order: wrap round to the first one
        return false;
    }
    int j = (int)a.size() - 1;
    while (a[j] <= a[i]) j--;                  // 2. rightmost element bigger than a[i]
    swap(a[i], a[j]);                          // 3. swap them
    reverse(a.begin() + i + 1, a.end());       // 4. make the tail as small as possible
    return true;
}

Perms allByNext(vector<int> a) {
    sort(a.begin(), a.end());
    Perms out;
    do out.push_back(a); while (nextPerm(a));
    return out;
}

size_t countWithStd(vector<int> a) {           // the same loop with std::next_permutation
    sort(a.begin(), a.end());
    size_t count = 0;
    do count++; while (next_permutation(a.begin(), a.end()));
    return count;
}

string fmtOne(const vector<int>& p) {
    string r = "[";
    for (size_t i = 0; i < p.size(); i++) r += (i ? ", " : "") + to_string(p[i]);
    return r + "]";
}

string fmt(const Perms& perms) {
    string r = "[";
    for (size_t k = 0; k < perms.size(); k++) r += (k ? ", " : "") + fmtOne(perms[k]);
    return r + "]";
}

int main() {
    cout << boolalpha;
    cout << "no skip:        " << fmt(permuteUnique({1, 2, 1}, false)) << "\\n";
    cout << "skip rule:      " << fmt(permuteUnique({1, 2, 1}, true)) << "\\n";
    cout << "next perm loop: " << fmt(allByNext({1, 2, 1})) << "\\n";
    cout << "[1, 1, 2, 2, 3]: " << permuteUnique({1, 1, 2, 2, 3}, true).size() << " by skip rule, "
         << countWithStd({1, 1, 2, 2, 3}) << " by next permutation\\n";
    vector<int> a = {1, 3, 2};
    bool moved = nextPerm(a);
    cout << "next of [1, 3, 2]: " << moved << " -> " << fmtOne(a) << "\\n";
    a = {3, 2, 1};
    moved = nextPerm(a);
    cout << "next of [3, 2, 1]: " << moved << " -> " << fmtOne(a) << "\\n";
}`,
          },
        ],
      },
    },
  },
  {
    title: "How do you solve the Combination Sum problem?",
    difficulty: "medium",
    seoDescription: "Combination Sum with backtracking: start index, reuse, sort-and-break pruning, Combination Sum II and a DP count, in Python, JavaScript, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a list of distinct positive integers \`candidates\` and a \`target\`, return every unique combination of candidates that sums to the target. Each number may be used any number of times. Code it in Python."

**What a strong answer should cover:**
- Backtracking with a running \`remaining\` amount: choose a candidate, recurse with \`remaining - x\`, un-choose; record when \`remaining\` is 0.
- The start index: recurse with \`i\` (reuse allowed) and never go back to smaller indices, so each combination appears once instead of in every order.
- Pruning: sort the candidates and \`break\` as soon as a candidate exceeds \`remaining\`.
- Complexity is exponential in target / smallest candidate; extra space is the recursion depth, at most target / smallest candidate.
- The variants: Combination Sum II (each number once, duplicates in input: \`i + 1\` plus the skip rule) and counting combinations with coin-change DP.
- Python details: \`sorted()\` returns a new list (the input is left alone), record \`path[:]\`, and the recursion depth is up to target / smallest candidate, which can reach the default limit of 1000 frames.

**Clarifying questions expected:**
- Are the candidates distinct and all positive?
- May a number be used more than once?
- Does the order of the combinations (or within a combination) matter?

**Code / implementation expected:** Yes — a backtracking function in Python returning \`list[list[int]]\`, with the start index and the sort-and-break pruning.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know recursion and the subsets pattern  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A vending machine takes only 2-, 3-, 6- and 7-cent coins, and a snack costs exactly 7 cents. Which handfuls of coins could you put in? A 7 on its own works. So does 2 + 2 + 3. Putting in 2, then 3, then 2 is the same handful as 2 + 2 + 3 — the machine does not care about order. Anything else either falls short or overshoots.

Listing every such handful is the **Combination Sum** problem: given the coin values (\`candidates\`) and the price (\`target\`), list every multiset of coins that adds up to the price, using each coin value as often as you like. It is one of the most common [backtracking](/interview-question/what-is-backtracking) interview questions because it combines three ideas: a running total, reuse of choices, and pruning.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can a number be used more than once? | Yes in Combination Sum (recurse with \`i\`); no in Combination Sum II (recurse with \`i + 1\`). |
| Are the candidates distinct? | Duplicates in the input need the sort-and-skip rule, or the same combination appears twice. |
| Are all candidates positive? | A 0 can be added forever without changing the sum, so the search never ends; negatives make pruning by "too big" invalid. |
| Is the order of combinations important? | Sorting the candidates first gives each combination in non-decreasing order and the list in a predictable order. |
| Do you need the combinations, or only how many there are? | The count alone is a fast dynamic-programming problem (section 7). |

## 3. The Core Idea

Keep a \`path\` (the coins chosen so far) and \`remaining\` (how much is still needed). At each step, try adding each allowed candidate: subtract it from \`remaining\` and recurse. Three outcomes:

- \`remaining == 0\` → the path is an answer; record a copy.
- \`remaining < 0\` → overshot; this branch is dead.
- otherwise → keep choosing.

📌 **Interview term: Combination** — a selection where order does not matter: \`[2, 2, 3]\` and \`[3, 2, 2]\` are the same combination.

📌 **Interview term: Remaining target** — the amount still to be reached; passing it down instead of summing the path each time makes every step O(1).

The subtle part is **which candidates are allowed next**. If every level may pick any candidate, the search builds \`[2, 2, 3]\`, \`[2, 3, 2]\` and \`[3, 2, 2]\` separately. The fix is the start index from [subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array), with one twist: after choosing \`nums[i]\`, the next level starts at **\`i\`** (the same number may come again), not \`i + 1\`. Choices then appear in non-decreasing index order, so each multiset is built exactly once.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Without a start index the same multiset 2, 2, 3 is built three times. With a start index it is built once">
  <text class="d-text" x="20" y="65">no start index</text>
  <rect class="d-box-accent" x="200" y="40" width="110" height="40" rx="6"/>
  <text class="d-text" x="255" y="65" text-anchor="middle">2, 2, 3</text>
  <rect class="d-box-accent" x="350" y="40" width="110" height="40" rx="6"/>
  <text class="d-text" x="405" y="65" text-anchor="middle">2, 3, 2</text>
  <rect class="d-box-accent" x="500" y="40" width="110" height="40" rx="6"/>
  <text class="d-text" x="555" y="65" text-anchor="middle">3, 2, 2</text>
  <text class="d-text" x="20" y="155">with start index</text>
  <rect class="d-box-accent" x="200" y="130" width="110" height="40" rx="6"/>
  <text class="d-text" x="255" y="155" text-anchor="middle">2, 2, 3</text>
  <rect class="d-box-muted" x="350" y="130" width="110" height="40" rx="6"/>
  <text class="d-sub" x="405" y="155" text-anchor="middle">never built</text>
  <rect class="d-box-muted" x="500" y="130" width="110" height="40" rx="6"/>
  <text class="d-sub" x="555" y="155" text-anchor="middle">never built</text>
</svg>

📌 **Interview term: Start index (with reuse)** — the next level may only choose candidates at index \`i\` or later, where \`i\` is the index just chosen. Reuse is allowed; going back is not.

## 4. The Search Tree and Pruning

Sort the candidates first. Then, inside the loop, as soon as \`nums[i] > remaining\`, every later candidate is too big too, and you can \`break\` out of the loop instead of trying them one by one. Here is the whole search for \`[2, 3, 6, 7]\`, target 7, with that pruning — each circle shows \`remaining\`, each label the number just added:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 350" role="img" aria-label="Search tree for candidates 2, 3, 6, 7 and target 7. Each circle shows the remaining amount; the two zeros are the answers 7 and 2, 2, 3">
  <path class="d-edge" d="M 350 62 L 140 108"/>
  <path class="d-edge" d="M 350 62 L 300 108"/>
  <path class="d-edge" d="M 350 62 L 460 108"/>
  <path class="d-edge" d="M 350 62 L 600 108"/>
  <path class="d-edge" d="M 140 152 L 70 198"/>
  <path class="d-edge" d="M 140 152 L 230 198"/>
  <path class="d-edge" d="M 300 152 L 340 198"/>
  <path class="d-edge" d="M 70 242 L 25 288"/>
  <path class="d-edge" d="M 70 242 L 140 288"/>
  <circle class="d-box" cx="350" cy="40" r="22"/>
  <text class="d-text" x="350" y="45" text-anchor="middle">7</text>
  <circle class="d-box" cx="140" cy="130" r="22"/>
  <text class="d-text" x="140" y="135" text-anchor="middle">5</text>
  <text class="d-sub d-accent" x="170" y="135">+2</text>
  <circle class="d-box" cx="300" cy="130" r="22"/>
  <text class="d-text" x="300" y="135" text-anchor="middle">4</text>
  <text class="d-sub d-accent" x="330" y="135">+3</text>
  <circle class="d-box-muted" cx="460" cy="130" r="22"/>
  <text class="d-text" x="460" y="135" text-anchor="middle">1</text>
  <text class="d-sub d-accent" x="490" y="135">+6</text>
  <circle class="d-box-accent" cx="600" cy="130" r="22"/>
  <text class="d-text" x="600" y="135" text-anchor="middle">0</text>
  <text class="d-sub d-accent" x="630" y="135">+7</text>
  <circle class="d-box" cx="70" cy="220" r="22"/>
  <text class="d-text" x="70" y="225" text-anchor="middle">3</text>
  <text class="d-sub d-accent" x="100" y="225">+2</text>
  <circle class="d-box-muted" cx="230" cy="220" r="22"/>
  <text class="d-text" x="230" y="225" text-anchor="middle">2</text>
  <text class="d-sub d-accent" x="260" y="225">+3</text>
  <circle class="d-box-muted" cx="340" cy="220" r="22"/>
  <text class="d-text" x="340" y="225" text-anchor="middle">1</text>
  <text class="d-sub d-accent" x="370" y="225">+3</text>
  <circle class="d-box-muted" cx="25" cy="310" r="22"/>
  <text class="d-text" x="25" y="315" text-anchor="middle">1</text>
  <text class="d-sub d-accent" x="55" y="315">+2</text>
  <circle class="d-box-accent" cx="140" cy="310" r="22"/>
  <text class="d-text" x="140" y="315" text-anchor="middle">0</text>
  <text class="d-sub d-accent" x="170" y="315">+3</text>
  <text class="d-sub" x="520" y="240">circle: remaining</text>
  <text class="d-sub" x="520" y="265">grey: dead end</text>
  <text class="d-sub d-accent" x="520" y="290">zero: answer</text>
</svg>

The tree has exactly 10 nodes, matching the 10 calls example 1 counts for this input. The two zeros are the answers: \`[7]\` (right) and \`[2, 2, 3]\` (bottom left). The grey circles are dead ends: at \`remaining = 1\` after adding 6, the next candidate allowed is 6 again, which is already too big, so the loop breaks immediately.

📌 **Interview term: Sort-and-break pruning** — on sorted candidates, stop the loop at the first candidate larger than the remaining target, because all later ones are larger too.

## 5. The Code in Python

~~~python
def combination_sum(candidates, target, prune):
    nums = sorted(candidates) if prune else list(candidates)
    out, path = [], []
    calls = [0]

    def go(start, remaining):
        calls[0] += 1
        if remaining == 0:
            out.append(path[:])          # found one: record a copy
            return
        if remaining < 0:
            return                       # overshot: dead end
        for i in range(start, len(nums)):
            if prune and nums[i] > remaining:
                break                    # sorted, so every later number is too big as well
            path.append(nums[i])         # choose
            go(i, remaining - nums[i])   # i, not i + 1: the same number may be used again
            path.pop()                   # un-choose

    go(0, target)
    return out, calls[0]
~~~

**What to point out in this Python code:**

- \`sorted(candidates)\` returns a new sorted list; \`candidates.sort()\` would reorder the caller list in place.
- \`go(i, remaining - nums[i])\` passes \`i\`, not \`i + 1\`: the same number may be chosen again at the next level. Passing \`start\` as \`i\` (and never going back to smaller indices) is what keeps \`[2, 2, 3]\` from also appearing as \`[2, 3, 2]\`.
- \`break\` instead of \`continue\` is safe only because the list is sorted: once \`nums[i]\` is too big, every later number is too.
- \`out.append(path[:])\` stores a copy; the shared \`path\` keeps changing after this line.
- The recursion depth is at most \`target // min(candidates)\` + 1. Python stops at about 1000 frames by default (\`sys.getrecursionlimit()\` printed 1000 in our run), and in our check \`candidates = [1]\`, \`target = 2000\` raised \`RecursionError: maximum recursion depth exceeded\`; the number of combinations would be the bigger problem long before that for most inputs.

With \`prune\` off, the function still finds the same combinations — the \`remaining < 0\` check catches overshoots — but it has to make the overshooting call first. Example 1 measures the difference: 28 vs 10 calls for target 7, 1,239 vs 575 for \`[2, 3, 5, 7, 11]\` and target 30.

## 6. The Two Variations Interviewers Ask Next

**The bug to recognise: no start index.** If every level loops over all candidates, order starts to matter and each combination appears once per ordering:

~~~python
def no_start_index(nums, target):
    """BUG on purpose: every level loops from index 0, so order matters."""
    out, path = [], []

    def go(remaining):
        if remaining == 0:
            out.append(path[:])
            return
        for x in nums:
            if x > remaining:
                break
            path.append(x)
            go(remaining - x)
            path.pop()

    go(target)
    return out
~~~

**Combination Sum II** — each candidate may be used **at most once**, and the input may contain duplicates (\`[10, 1, 2, 7, 6, 1, 5]\`). Two changes: recurse with \`i + 1\`, and use the same-level duplicate skip from [Subsets II](/interview-question/how-do-you-generate-all-subsets-of-an-array):

~~~python
def combination_sum2(candidates, target):
    """Each candidate used at most once; candidates may contain duplicates."""
    nums = sorted(candidates)
    out, path = [], []

    def go(start, remaining):
        if remaining == 0:
            out.append(path[:])
            return
        for i in range(start, len(nums)):
            if nums[i] > remaining:
                break
            if i > start and nums[i] == nums[i - 1]:
                continue                 # same value at the same level -> same subtree
            path.append(nums[i])
            go(i + 1, remaining - nums[i])   # i + 1: each element at most once
            path.pop()

    go(0, target)
    return out
~~~

📌 **Interview term: Combination Sum II** — the variant where each input element is used at most once and the input may contain duplicates; solved with \`i + 1\` plus skipping equal values at the same level.

## 7. Only Need the Count? Use DP

If the question is "how many combinations", listing them is wasteful. This is exactly the counting version of [coin change](/interview-question/how-do-you-solve-the-coin-change-problem): \`ways[t]\` is the number of combinations that make total t.

~~~python
def count_ways(nums, target):
    """Coin-change style DP: number of combinations (order ignored)."""
    ways = [1] + [0] * target
    for x in nums:                       # outer loop over numbers -> combinations
        for t in range(x, target + 1):
            ways[t] += ways[t - x]
    return ways[target]
~~~

The loop over numbers is on the **outside**. That way each number is fully processed before the next, so every combination is counted once in a single order. Swapping the loops counts ordered sequences instead (\`[2, 2, 3]\`, \`[2, 3, 2]\` and \`[3, 2, 2]\` separately). Example 2 checks that the DP counts — 2, 3 and 64 — match the number of combinations the backtracking found in example 1, and then counts 37,744 combinations for target 200, which the DP does in 5 × 200 steps.

📌 **Interview term: Counting DP** — computing how many solutions exist from the counts of smaller sub-problems, without listing them. See [dynamic programming](/interview-question/what-is-dynamic-programming).

## 8. Verified: Running the Code

Each example below was saved as \`main.py\` and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — Combination Sum on five inputs, and call counts with and without sort + break pruning** prints:

~~~text
candidates [2, 3, 6, 7], target 7 -> [[2, 2, 3], [7]]
candidates [2, 3, 5], target 8 -> [[2, 2, 2, 2], [2, 3, 3], [3, 5]]
candidates [8, 7, 4, 3], target 11 -> [[3, 4, 4], [3, 8], [4, 7]]
candidates [2], target 1 -> []
candidates [1], target 2 -> [[1, 1]]
[2, 3, 6, 7], target 7: 2 combinations, calls plain 28, sort + break 10
[2, 3, 5], target 8: 3 combinations, calls plain 23, sort + break 13
[2, 3, 5, 7, 11], target 30: 64 combinations, calls plain 1239, sort + break 575
[3, 5, 7, 2, 11], target 40: 148 combinations, calls plain 2760, sort + break 1634
~~~

**Example 2 — the start-index bug, Combination Sum II, and a DP count that cross-checks the backtracking** prints:

~~~text
no start index:  [[2, 2, 3], [2, 3, 2], [3, 2, 2], [7]]
Combination Sum II [10, 1, 2, 7, 6, 1, 5], 8 -> [[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]]
Combination Sum II [2, 5, 2, 1, 2], 5 -> [[1, 2, 2], [5]]
DP count [2, 3, 6, 7], 7: 2
DP count [2, 3, 5], 8: 3
DP count [2, 3, 5, 7, 11], 30: 64
DP count [2, 3, 5, 7, 11], 200: 37744
~~~

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Backtracking with sort + break | exponential; loose bound O(N^(T/M + 1)) | O(T / M) | depth at most T / M (smallest candidate M), up to N branches per node |
| Backtracking without pruning | same bound, more calls | O(T / M) | every overshooting call is still made (1,239 vs 575 in our run) |
| Sorting first | O(N log N) | depends on the sort | done once, negligible next to the search |
| Counting DP | O(N · T) | O(T) | one pass over totals per number |

Here N is the number of candidates, T the target and M the smallest candidate. The output itself can be exponential in T / M, so no listing algorithm is polynomial in general. Extra space excludes the output.

## 10. Edge Cases

- **No combination exists** — \`[2]\`, target 1 → \`[]\`. Example 1 prints it. An empty list is a valid answer, not an error.
- **A single candidate used many times** — \`[1]\`, target 2 → \`[[1, 1]]\`.
- **Target smaller than every candidate** — the loop breaks immediately at the root.
- **Unsorted input** — \`[8, 7, 4, 3]\`, target 11 → \`[[3, 4, 4], [3, 8], [4, 7]]\` once sorted; without the sort, \`break\` would be wrong.
- **Zero or negative candidates** — not allowed in the standard problem; a 0 makes the search infinite. Ask, and reject or filter them.

## Common Pitfalls

- **Recursing with \`i + 1\`.** That forbids reuse: \`[2, 2, 3]\` disappears and only \`[7]\` is left for target 7. \`i + 1\` is Combination Sum II, not this problem.
- **Looping from 0 at every level.** Our run printed \`[[2, 2, 3], [2, 3, 2], [3, 2, 2], [7]]\` — the same combination in three orders.
- **\`break\` on an unsorted list.** It skips valid larger-index numbers after the first one that is too big. Sort first, or use \`continue\`.
- **\`out.append(path)\` without a copy.** Every stored combination is the same list, empty at the end.
- **Zero or negative candidates.** A 0 can be added forever without changing the sum, so the recursion never ends; the standard problem guarantees positive candidates — confirm it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Approach:</strong> <span style="color:#f0e2c8;">backtracking with a path and a remaining target: add a candidate, recurse with remaining minus it, remove it; record when remaining is 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. No duplicates:</strong> <span style="color:#f0e2c8;">a start index: recurse with i, so reuse is allowed but the search never goes back to smaller indices, and each combination appears once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pruning:</strong> <span style="color:#f0e2c8;">sort the candidates and break as soon as one is bigger than remaining; that cut 1,239 calls to 575 on a target-30 test.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity and variants:</strong> <span style="color:#f0e2c8;">exponential in target / smallest candidate, O(T / M) extra space. Combination Sum II: recurse with i + 1 and skip equal values at the same level. Count only: coin-change DP in O(N · T).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted()</code> returns a new list, record <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path[:]</code>, and recursion depth is up to target / min candidate (limit about 1000 frames).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why pass <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">i</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">i + 1</code> in the recursive call?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because each number may be reused. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> lets the next level pick the same number again; never going back below <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> stops reordered duplicates.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for Combination Sum II (each number once, duplicates in the input)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recurse with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i + 1</code>, sort, and skip <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt; start and nums[i] == nums[i - 1]</code>. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[10, 1, 2, 7, 6, 1, 5]</code>, 8 that gives 4 combinations.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the time complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exponential in the target: a loose upper bound is O(N^(T/M + 1)) for N candidates, target T and smallest candidate M, since the depth is at most T/M and each node branches at most N ways. Pruning cut our 30-target case from 1,239 calls to 575.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if I only need the number of combinations?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use DP like coin change: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[0] = 1</code>, outer loop over numbers, inner loop over totals, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[t] += ways[t - x]</code>. O(N · T) — it gave 37,744 for target 200 instantly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the outer DP loop over numbers, not totals?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Numbers outside means each combination is counted once, in one fixed order. Totals outside counts ordered sequences (permutations) instead.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Combination** | A selection where order does not matter |
| **Remaining target** | The amount still needed, passed down the recursion |
| **Start index (with reuse)** | Next level may choose index i or later; reuse yes, going back no |
| **Sort-and-break pruning** | On sorted candidates, stop at the first one bigger than remaining |
| **Combination Sum II** | Each element at most once, duplicates in input: i + 1 plus same-level skip |
| **Counting DP** | Count solutions from smaller sub-problems without listing them |

---
**Conclusion:** In Python, Combination Sum is the subsets template with two changes: carry the \`remaining\` amount, and recurse with \`i\` instead of \`i + 1\` so a number can repeat. Sort the candidates so that \`break\` can stop the loop as soon as a number is too big, record \`path[:]\` when \`remaining\` hits 0, and reach for the coin-change DP when only the count is needed. The same skeleton, with a different rule for the next choice, solves [permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array) and [N-Queens](/interview-question/how-do-you-solve-the-n-queens-problem).`,
        examples: [
          {
            label: "Combination Sum: results, and calls with vs without pruning",
            code: `# Combination Sum: candidates are distinct, each may be reused any number of times.

def combination_sum(candidates, target, prune):
    nums = sorted(candidates) if prune else list(candidates)
    out, path = [], []
    calls = [0]

    def go(start, remaining):
        calls[0] += 1
        if remaining == 0:
            out.append(path[:])          # found one: record a copy
            return
        if remaining < 0:
            return                       # overshot: dead end
        for i in range(start, len(nums)):
            if prune and nums[i] > remaining:
                break                    # sorted, so every later number is too big as well
            path.append(nums[i])         # choose
            go(i, remaining - nums[i])   # i, not i + 1: the same number may be used again
            path.pop()                   # un-choose

    go(0, target)
    return out, calls[0]


def fmt(combos):
    return "[" + ", ".join("[" + ", ".join(map(str, c)) + "]" for c in combos) + "]"


tests = [([2, 3, 6, 7], 7), ([2, 3, 5], 8), ([8, 7, 4, 3], 11), ([2], 1), ([1], 2)]
for cands, target in tests:
    combos, _ = combination_sum(cands, target, True)
    print("candidates " + fmt([cands])[1:-1] + ", target " + str(target) + " -> " + fmt(combos))

for cands, target in [([2, 3, 6, 7], 7), ([2, 3, 5], 8), ([2, 3, 5, 7, 11], 30), ([3, 5, 7, 2, 11], 40)]:
    plain, plain_calls = combination_sum(cands, target, False)
    fast, fast_calls = combination_sum(cands, target, True)
    print(fmt([cands])[1:-1] + ", target " + str(target) + ": " + str(len(fast))
          + " combinations, calls plain " + str(plain_calls) + ", sort + break " + str(fast_calls))`,
          },
          {
            label: "Start-index bug, Combination Sum II, and a DP count check",
            code: `# Three variations: the classic start-index bug, Combination Sum II, and a DP count check.

def no_start_index(nums, target):
    """BUG on purpose: every level loops from index 0, so order matters."""
    out, path = [], []

    def go(remaining):
        if remaining == 0:
            out.append(path[:])
            return
        for x in nums:
            if x > remaining:
                break
            path.append(x)
            go(remaining - x)
            path.pop()

    go(target)
    return out


def combination_sum2(candidates, target):
    """Each candidate used at most once; candidates may contain duplicates."""
    nums = sorted(candidates)
    out, path = [], []

    def go(start, remaining):
        if remaining == 0:
            out.append(path[:])
            return
        for i in range(start, len(nums)):
            if nums[i] > remaining:
                break
            if i > start and nums[i] == nums[i - 1]:
                continue                 # same value at the same level -> same subtree
            path.append(nums[i])
            go(i + 1, remaining - nums[i])   # i + 1: each element at most once
            path.pop()

    go(0, target)
    return out


def count_ways(nums, target):
    """Coin-change style DP: number of combinations (order ignored)."""
    ways = [1] + [0] * target
    for x in nums:                       # outer loop over numbers -> combinations
        for t in range(x, target + 1):
            ways[t] += ways[t - x]
    return ways[target]


def fmt(combos):
    return "[" + ", ".join("[" + ", ".join(map(str, c)) + "]" for c in combos) + "]"


print("no start index:  " + fmt(no_start_index([2, 3, 6, 7], 7)))
print("Combination Sum II [10, 1, 2, 7, 6, 1, 5], 8 -> " + fmt(combination_sum2([10, 1, 2, 7, 6, 1, 5], 8)))
print("Combination Sum II [2, 5, 2, 1, 2], 5 -> " + fmt(combination_sum2([2, 5, 2, 1, 2], 5)))
print("DP count [2, 3, 6, 7], 7: " + str(count_ways([2, 3, 6, 7], 7)))
print("DP count [2, 3, 5], 8: " + str(count_ways([2, 3, 5], 8)))
print("DP count [2, 3, 5, 7, 11], 30: " + str(count_ways([2, 3, 5, 7, 11], 30)))
print("DP count [2, 3, 5, 7, 11], 200: " + str(count_ways([2, 3, 5, 7, 11], 200)))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an array of distinct positive integers \`candidates\` and a \`target\`, return every unique combination that sums to the target. Each number may be used any number of times. Code it in JavaScript."

**What a strong answer should cover:**
- Backtracking with a running \`remaining\` amount: choose a candidate, recurse with \`remaining - x\`, un-choose; record when \`remaining\` is 0.
- The start index: recurse with \`i\` (reuse allowed) and never go back to smaller indices, so each combination appears once instead of in every order.
- Pruning: sort the candidates and \`break\` as soon as a candidate exceeds \`remaining\`.
- Complexity is exponential in target / smallest candidate; extra space is the recursion depth, at most target / smallest candidate.
- The variants: Combination Sum II (each number once, duplicates in input: \`i + 1\` plus the skip rule) and counting combinations with coin-change DP.
- JavaScript details: sort a copy with \`[...candidates].sort((a, b) => a - b)\` — the default sort compares strings and \`sort\` mutates — and push \`[...path]\` when recording.

**Clarifying questions expected:**
- Are the candidates distinct and all positive?
- May a number be used more than once?
- Does the order of the combinations (or within a combination) matter?

**Code / implementation expected:** Yes — a backtracking function in JavaScript returning an array of arrays, with the start index and the sort-and-break pruning.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know recursion and the subsets pattern  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A vending machine takes only 2-, 3-, 6- and 7-cent coins, and a snack costs exactly 7 cents. Which handfuls of coins could you put in? A 7 on its own works. So does 2 + 2 + 3. Putting in 2, then 3, then 2 is the same handful as 2 + 2 + 3 — the machine does not care about order. Anything else either falls short or overshoots.

Listing every such handful is the **Combination Sum** problem: given the coin values (\`candidates\`) and the price (\`target\`), list every multiset of coins that adds up to the price, using each coin value as often as you like. It is one of the most common [backtracking](/interview-question/what-is-backtracking) interview questions because it combines three ideas: a running total, reuse of choices, and pruning.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can a number be used more than once? | Yes in Combination Sum (recurse with \`i\`); no in Combination Sum II (recurse with \`i + 1\`). |
| Are the candidates distinct? | Duplicates in the input need the sort-and-skip rule, or the same combination appears twice. |
| Are all candidates positive? | A 0 can be added forever without changing the sum, so the search never ends; negatives make pruning by "too big" invalid. |
| Is the order of combinations important? | Sorting the candidates first gives each combination in non-decreasing order and the list in a predictable order. |
| Do you need the combinations, or only how many there are? | The count alone is a fast dynamic-programming problem (section 7). |

## 3. The Core Idea

Keep a \`path\` (the coins chosen so far) and \`remaining\` (how much is still needed). At each step, try adding each allowed candidate: subtract it from \`remaining\` and recurse. Three outcomes:

- \`remaining == 0\` → the path is an answer; record a copy.
- \`remaining < 0\` → overshot; this branch is dead.
- otherwise → keep choosing.

📌 **Interview term: Combination** — a selection where order does not matter: \`[2, 2, 3]\` and \`[3, 2, 2]\` are the same combination.

📌 **Interview term: Remaining target** — the amount still to be reached; passing it down instead of summing the path each time makes every step O(1).

The subtle part is **which candidates are allowed next**. If every level may pick any candidate, the search builds \`[2, 2, 3]\`, \`[2, 3, 2]\` and \`[3, 2, 2]\` separately. The fix is the start index from [subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array), with one twist: after choosing \`nums[i]\`, the next level starts at **\`i\`** (the same number may come again), not \`i + 1\`. Choices then appear in non-decreasing index order, so each multiset is built exactly once.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Without a start index the same multiset 2, 2, 3 is built three times. With a start index it is built once">
  <text class="d-text" x="20" y="65">no start index</text>
  <rect class="d-box-accent" x="200" y="40" width="110" height="40" rx="6"/>
  <text class="d-text" x="255" y="65" text-anchor="middle">2, 2, 3</text>
  <rect class="d-box-accent" x="350" y="40" width="110" height="40" rx="6"/>
  <text class="d-text" x="405" y="65" text-anchor="middle">2, 3, 2</text>
  <rect class="d-box-accent" x="500" y="40" width="110" height="40" rx="6"/>
  <text class="d-text" x="555" y="65" text-anchor="middle">3, 2, 2</text>
  <text class="d-text" x="20" y="155">with start index</text>
  <rect class="d-box-accent" x="200" y="130" width="110" height="40" rx="6"/>
  <text class="d-text" x="255" y="155" text-anchor="middle">2, 2, 3</text>
  <rect class="d-box-muted" x="350" y="130" width="110" height="40" rx="6"/>
  <text class="d-sub" x="405" y="155" text-anchor="middle">never built</text>
  <rect class="d-box-muted" x="500" y="130" width="110" height="40" rx="6"/>
  <text class="d-sub" x="555" y="155" text-anchor="middle">never built</text>
</svg>

📌 **Interview term: Start index (with reuse)** — the next level may only choose candidates at index \`i\` or later, where \`i\` is the index just chosen. Reuse is allowed; going back is not.

## 4. The Search Tree and Pruning

Sort the candidates first. Then, inside the loop, as soon as \`nums[i] > remaining\`, every later candidate is too big too, and you can \`break\` out of the loop instead of trying them one by one. Here is the whole search for \`[2, 3, 6, 7]\`, target 7, with that pruning — each circle shows \`remaining\`, each label the number just added:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 350" role="img" aria-label="Search tree for candidates 2, 3, 6, 7 and target 7. Each circle shows the remaining amount; the two zeros are the answers 7 and 2, 2, 3">
  <path class="d-edge" d="M 350 62 L 140 108"/>
  <path class="d-edge" d="M 350 62 L 300 108"/>
  <path class="d-edge" d="M 350 62 L 460 108"/>
  <path class="d-edge" d="M 350 62 L 600 108"/>
  <path class="d-edge" d="M 140 152 L 70 198"/>
  <path class="d-edge" d="M 140 152 L 230 198"/>
  <path class="d-edge" d="M 300 152 L 340 198"/>
  <path class="d-edge" d="M 70 242 L 25 288"/>
  <path class="d-edge" d="M 70 242 L 140 288"/>
  <circle class="d-box" cx="350" cy="40" r="22"/>
  <text class="d-text" x="350" y="45" text-anchor="middle">7</text>
  <circle class="d-box" cx="140" cy="130" r="22"/>
  <text class="d-text" x="140" y="135" text-anchor="middle">5</text>
  <text class="d-sub d-accent" x="170" y="135">+2</text>
  <circle class="d-box" cx="300" cy="130" r="22"/>
  <text class="d-text" x="300" y="135" text-anchor="middle">4</text>
  <text class="d-sub d-accent" x="330" y="135">+3</text>
  <circle class="d-box-muted" cx="460" cy="130" r="22"/>
  <text class="d-text" x="460" y="135" text-anchor="middle">1</text>
  <text class="d-sub d-accent" x="490" y="135">+6</text>
  <circle class="d-box-accent" cx="600" cy="130" r="22"/>
  <text class="d-text" x="600" y="135" text-anchor="middle">0</text>
  <text class="d-sub d-accent" x="630" y="135">+7</text>
  <circle class="d-box" cx="70" cy="220" r="22"/>
  <text class="d-text" x="70" y="225" text-anchor="middle">3</text>
  <text class="d-sub d-accent" x="100" y="225">+2</text>
  <circle class="d-box-muted" cx="230" cy="220" r="22"/>
  <text class="d-text" x="230" y="225" text-anchor="middle">2</text>
  <text class="d-sub d-accent" x="260" y="225">+3</text>
  <circle class="d-box-muted" cx="340" cy="220" r="22"/>
  <text class="d-text" x="340" y="225" text-anchor="middle">1</text>
  <text class="d-sub d-accent" x="370" y="225">+3</text>
  <circle class="d-box-muted" cx="25" cy="310" r="22"/>
  <text class="d-text" x="25" y="315" text-anchor="middle">1</text>
  <text class="d-sub d-accent" x="55" y="315">+2</text>
  <circle class="d-box-accent" cx="140" cy="310" r="22"/>
  <text class="d-text" x="140" y="315" text-anchor="middle">0</text>
  <text class="d-sub d-accent" x="170" y="315">+3</text>
  <text class="d-sub" x="520" y="240">circle: remaining</text>
  <text class="d-sub" x="520" y="265">grey: dead end</text>
  <text class="d-sub d-accent" x="520" y="290">zero: answer</text>
</svg>

The tree has exactly 10 nodes, matching the 10 calls example 1 counts for this input. The two zeros are the answers: \`[7]\` (right) and \`[2, 2, 3]\` (bottom left). The grey circles are dead ends: at \`remaining = 1\` after adding 6, the next candidate allowed is 6 again, which is already too big, so the loop breaks immediately.

📌 **Interview term: Sort-and-break pruning** — on sorted candidates, stop the loop at the first candidate larger than the remaining target, because all later ones are larger too.

## 5. The Code in JavaScript

~~~javascript
function combinationSum(candidates, target, prune) {
  // Copy before sorting, and sort numerically: the default sort compares strings.
  const nums = prune ? [...candidates].sort((a, b) => a - b) : [...candidates];
  const out = [], path = [];
  let calls = 0;
  function go(start, remaining) {
    calls++;
    if (remaining === 0) {
      out.push([...path]);               // found one: record a copy
      return;
    }
    if (remaining < 0) return;           // overshot: dead end
    for (let i = start; i < nums.length; i++) {
      if (prune && nums[i] > remaining) break;   // sorted, so every later number is too big as well
      path.push(nums[i]);                // choose
      go(i, remaining - nums[i]);        // i, not i + 1: the same number may be used again
      path.pop();                        // un-choose
    }
  }
  go(0, target);
  return { out, calls };
}
~~~

**What to point out in this JavaScript code:**

- \`[...candidates].sort((a, b) => a - b)\` copies first (because \`sort\` reorders in place) and compares numerically. Without the comparator, \`[10, 1, 2].sort()\` gave \`[ 1, 10, 2 ]\` in our run, and the \`break\` would then skip valid numbers.
- \`go(i, remaining - nums[i])\` passes \`i\`, not \`i + 1\`: the same number may be chosen again. Never going back below \`i\` keeps \`[2, 2, 3]\` from also appearing as \`[2, 3, 2]\`.
- \`break\` is safe only on sorted input: once \`nums[i]\` is too big, every later number is too.
- \`out.push([...path])\` stores a copy of the shared array.
- The recursion depth is at most \`Math.floor(target / min) + 1\`. The maximum call-stack depth is engine-specific, so a tiny candidate with a huge target can throw a \`RangeError\`; for normal interview inputs the number of combinations is the real limit.

With \`prune\` off, the function still finds the same combinations — the \`remaining < 0\` check catches overshoots — but it has to make the overshooting call first. Example 1 measures the difference: 28 vs 10 calls for target 7, 1,239 vs 575 for \`[2, 3, 5, 7, 11]\` and target 30.

## 6. The Two Variations Interviewers Ask Next

**The bug to recognise: no start index.** If every level loops over all candidates, order starts to matter and each combination appears once per ordering:

~~~javascript
function noStartIndex(nums, target) {
  // BUG on purpose: every level loops from index 0, so order matters.
  const out = [], path = [];
  function go(remaining) {
    if (remaining === 0) {
      out.push([...path]);
      return;
    }
    for (const x of nums) {
      if (x > remaining) break;
      path.push(x);
      go(remaining - x);
      path.pop();
    }
  }
  go(target);
  return out;
}
~~~

**Combination Sum II** — each candidate may be used **at most once**, and the input may contain duplicates (\`[10, 1, 2, 7, 6, 1, 5]\`). Two changes: recurse with \`i + 1\`, and use the same-level duplicate skip from [Subsets II](/interview-question/how-do-you-generate-all-subsets-of-an-array):

~~~javascript
function combinationSum2(candidates, target) {
  // Each candidate used at most once; candidates may contain duplicates.
  const nums = [...candidates].sort((a, b) => a - b);   // numeric sort: [10, 1, 2] would sort as strings otherwise
  const out = [], path = [];
  function go(start, remaining) {
    if (remaining === 0) {
      out.push([...path]);
      return;
    }
    for (let i = start; i < nums.length; i++) {
      if (nums[i] > remaining) break;
      if (i > start && nums[i] === nums[i - 1]) continue;  // same value at the same level -> same subtree
      path.push(nums[i]);
      go(i + 1, remaining - nums[i]);    // i + 1: each element at most once
      path.pop();
    }
  }
  go(0, target);
  return out;
}
~~~

📌 **Interview term: Combination Sum II** — the variant where each input element is used at most once and the input may contain duplicates; solved with \`i + 1\` plus skipping equal values at the same level.

## 7. Only Need the Count? Use DP

If the question is "how many combinations", listing them is wasteful. This is exactly the counting version of [coin change](/interview-question/how-do-you-solve-the-coin-change-problem): \`ways[t]\` is the number of combinations that make total t.

~~~javascript
function countWays(nums, target) {
  // Coin-change style DP: number of combinations (order ignored).
  const ways = new Array(target + 1).fill(0);
  ways[0] = 1;
  for (const x of nums) {                // outer loop over numbers -> combinations
    for (let t = x; t <= target; t++) ways[t] += ways[t - x];
  }
  return ways[target];
}
~~~

The loop over numbers is on the **outside**. That way each number is fully processed before the next, so every combination is counted once in a single order. Swapping the loops counts ordered sequences instead (\`[2, 2, 3]\`, \`[2, 3, 2]\` and \`[3, 2, 2]\` separately). Example 2 checks that the DP counts — 2, 3 and 64 — match the number of combinations the backtracking found in example 1, and then counts 37,744 combinations for target 200, which the DP does in 5 × 200 steps.

📌 **Interview term: Counting DP** — computing how many solutions exist from the counts of smaller sub-problems, without listing them. See [dynamic programming](/interview-question/what-is-dynamic-programming).

## 8. Verified: Running the Code

Each example below was saved as \`main.js\` and run with \`node main.js\` (Node.js 22; the same code runs in the page). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — Combination Sum on five inputs, and call counts with and without sort + break pruning** prints:

~~~text
candidates [2, 3, 6, 7], target 7 -> [[2, 2, 3], [7]]
candidates [2, 3, 5], target 8 -> [[2, 2, 2, 2], [2, 3, 3], [3, 5]]
candidates [8, 7, 4, 3], target 11 -> [[3, 4, 4], [3, 8], [4, 7]]
candidates [2], target 1 -> []
candidates [1], target 2 -> [[1, 1]]
[2, 3, 6, 7], target 7: 2 combinations, calls plain 28, sort + break 10
[2, 3, 5], target 8: 3 combinations, calls plain 23, sort + break 13
[2, 3, 5, 7, 11], target 30: 64 combinations, calls plain 1239, sort + break 575
[3, 5, 7, 2, 11], target 40: 148 combinations, calls plain 2760, sort + break 1634
~~~

**Example 2 — the start-index bug, Combination Sum II, and a DP count that cross-checks the backtracking** prints:

~~~text
no start index:  [[2, 2, 3], [2, 3, 2], [3, 2, 2], [7]]
Combination Sum II [10, 1, 2, 7, 6, 1, 5], 8 -> [[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]]
Combination Sum II [2, 5, 2, 1, 2], 5 -> [[1, 2, 2], [5]]
DP count [2, 3, 6, 7], 7: 2
DP count [2, 3, 5], 8: 3
DP count [2, 3, 5, 7, 11], 30: 64
DP count [2, 3, 5, 7, 11], 200: 37744
~~~

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Backtracking with sort + break | exponential; loose bound O(N^(T/M + 1)) | O(T / M) | depth at most T / M (smallest candidate M), up to N branches per node |
| Backtracking without pruning | same bound, more calls | O(T / M) | every overshooting call is still made (1,239 vs 575 in our run) |
| Sorting first | O(N log N) | depends on the sort | done once, negligible next to the search |
| Counting DP | O(N · T) | O(T) | one pass over totals per number |

Here N is the number of candidates, T the target and M the smallest candidate. The output itself can be exponential in T / M, so no listing algorithm is polynomial in general. Extra space excludes the output.

## 10. Edge Cases

- **No combination exists** — \`[2]\`, target 1 → \`[]\`. Example 1 prints it. An empty list is a valid answer, not an error.
- **A single candidate used many times** — \`[1]\`, target 2 → \`[[1, 1]]\`.
- **Target smaller than every candidate** — the loop breaks immediately at the root.
- **Unsorted input** — \`[8, 7, 4, 3]\`, target 11 → \`[[3, 4, 4], [3, 8], [4, 7]]\` once sorted; without the sort, \`break\` would be wrong.
- **Zero or negative candidates** — not allowed in the standard problem; a 0 makes the search infinite. Ask, and reject or filter them.

## Common Pitfalls

- **Default \`sort()\`.** It sorts as strings, which breaks the \`break\` pruning on inputs like \`[10, 1, 2]\`. Always pass \`(a, b) => a - b\`.
- **Recursing with \`i + 1\`.** That forbids reuse: \`[2, 2, 3]\` disappears for target 7. \`i + 1\` is Combination Sum II.
- **Looping from 0 at every level.** Our run printed \`[[2, 2, 3], [2, 3, 2], [3, 2, 2], [7]]\` — the same combination in three orders.
- **\`out.push(path)\` without a copy.** Every stored combination is the same array, empty at the end.
- **Zero or negative candidates.** A 0 can be added forever, so the recursion never ends; confirm the inputs are positive.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Approach:</strong> <span style="color:#f0e2c8;">backtracking with a path and a remaining target: add a candidate, recurse with remaining minus it, remove it; record when remaining is 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. No duplicates:</strong> <span style="color:#f0e2c8;">a start index: recurse with i, so reuse is allowed but the search never goes back to smaller indices, and each combination appears once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pruning:</strong> <span style="color:#f0e2c8;">sort the candidates and break as soon as one is bigger than remaining; that cut 1,239 calls to 575 on a target-30 test.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity and variants:</strong> <span style="color:#f0e2c8;">exponential in target / smallest candidate, O(T / M) extra space. Combination Sum II: recurse with i + 1 and skip equal values at the same level. Count only: coin-change DP in O(N · T).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">copy and sort numerically with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a - b</code> before using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code>, and push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...path]</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why pass <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">i</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">i + 1</code> in the recursive call?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each number may be reused, so the next level may pick the same index again; never going below <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> stops reordered duplicates.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for Combination Sum II?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recurse with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i + 1</code>, sort, and skip <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt; start &amp;&amp; nums[i] === nums[i - 1]</code>. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[10, 1, 2, 7, 6, 1, 5]</code>, 8 that gives 4 combinations.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the time complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exponential in the target: a loose upper bound is O(N^(T/M + 1)) for N candidates, target T and smallest candidate M. Pruning cut our target-30 case from 1,239 calls to 575.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if I only need the number of combinations?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Coin-change DP: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[0] = 1</code>, outer loop over numbers, inner over totals, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ways[t] += ways[t - x]</code>. O(N · T); 37,744 for target 200.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did your pruning skip a valid answer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Most likely the array was sorted with the default comparator, so it was in string order and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code> fired too early.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Combination** | A selection where order does not matter |
| **Remaining target** | The amount still needed, passed down the recursion |
| **Start index (with reuse)** | Next level may choose index i or later; reuse yes, going back no |
| **Sort-and-break pruning** | On sorted candidates, stop at the first one bigger than remaining |
| **Combination Sum II** | Each element at most once, duplicates in input: i + 1 plus same-level skip |
| **Counting DP** | Count solutions from smaller sub-problems without listing them |

---
**Conclusion:** In JavaScript, Combination Sum is the subsets template with two changes: carry the \`remaining\` amount, and recurse with \`i\` instead of \`i + 1\` so a number can repeat. Copy and sort numerically so that \`break\` can stop the loop as soon as a number is too big, push \`[...path]\` when \`remaining\` hits 0, and use the coin-change DP when only the count is needed. The same skeleton, with a different rule for the next choice, solves [permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array) and [N-Queens](/interview-question/how-do-you-solve-the-n-queens-problem).`,
        examples: [
          {
            label: "Combination Sum: results, and calls with vs without pruning",
            code: `// Combination Sum: candidates are distinct, each may be reused any number of times.

function combinationSum(candidates, target, prune) {
  // Copy before sorting, and sort numerically: the default sort compares strings.
  const nums = prune ? [...candidates].sort((a, b) => a - b) : [...candidates];
  const out = [], path = [];
  let calls = 0;
  function go(start, remaining) {
    calls++;
    if (remaining === 0) {
      out.push([...path]);               // found one: record a copy
      return;
    }
    if (remaining < 0) return;           // overshot: dead end
    for (let i = start; i < nums.length; i++) {
      if (prune && nums[i] > remaining) break;   // sorted, so every later number is too big as well
      path.push(nums[i]);                // choose
      go(i, remaining - nums[i]);        // i, not i + 1: the same number may be used again
      path.pop();                        // un-choose
    }
  }
  go(0, target);
  return { out, calls };
}

const fmtOne = (c) => "[" + c.join(", ") + "]";
const fmt = (combos) => "[" + combos.map(fmtOne).join(", ") + "]";

const tests = [[[2, 3, 6, 7], 7], [[2, 3, 5], 8], [[8, 7, 4, 3], 11], [[2], 1], [[1], 2]];
for (const [cands, target] of tests) {
  console.log("candidates " + fmtOne(cands) + ", target " + target + " -> " + fmt(combinationSum(cands, target, true).out));
}

for (const [cands, target] of [[[2, 3, 6, 7], 7], [[2, 3, 5], 8], [[2, 3, 5, 7, 11], 30], [[3, 5, 7, 2, 11], 40]]) {
  const plain = combinationSum(cands, target, false);
  const fast = combinationSum(cands, target, true);
  console.log(fmtOne(cands) + ", target " + target + ": " + fast.out.length +
    " combinations, calls plain " + plain.calls + ", sort + break " + fast.calls);
}`,
          },
          {
            label: "Start-index bug, Combination Sum II, and a DP count check",
            code: `// Three variations: the classic start-index bug, Combination Sum II, and a DP count check.

function noStartIndex(nums, target) {
  // BUG on purpose: every level loops from index 0, so order matters.
  const out = [], path = [];
  function go(remaining) {
    if (remaining === 0) {
      out.push([...path]);
      return;
    }
    for (const x of nums) {
      if (x > remaining) break;
      path.push(x);
      go(remaining - x);
      path.pop();
    }
  }
  go(target);
  return out;
}

function combinationSum2(candidates, target) {
  // Each candidate used at most once; candidates may contain duplicates.
  const nums = [...candidates].sort((a, b) => a - b);   // numeric sort: [10, 1, 2] would sort as strings otherwise
  const out = [], path = [];
  function go(start, remaining) {
    if (remaining === 0) {
      out.push([...path]);
      return;
    }
    for (let i = start; i < nums.length; i++) {
      if (nums[i] > remaining) break;
      if (i > start && nums[i] === nums[i - 1]) continue;  // same value at the same level -> same subtree
      path.push(nums[i]);
      go(i + 1, remaining - nums[i]);    // i + 1: each element at most once
      path.pop();
    }
  }
  go(0, target);
  return out;
}

function countWays(nums, target) {
  // Coin-change style DP: number of combinations (order ignored).
  const ways = new Array(target + 1).fill(0);
  ways[0] = 1;
  for (const x of nums) {                // outer loop over numbers -> combinations
    for (let t = x; t <= target; t++) ways[t] += ways[t - x];
  }
  return ways[target];
}

const fmt = (combos) => "[" + combos.map((c) => "[" + c.join(", ") + "]").join(", ") + "]";

console.log("no start index:  " + fmt(noStartIndex([2, 3, 6, 7], 7)));
console.log("Combination Sum II [10, 1, 2, 7, 6, 1, 5], 8 -> " + fmt(combinationSum2([10, 1, 2, 7, 6, 1, 5], 8)));
console.log("Combination Sum II [2, 5, 2, 1, 2], 5 -> " + fmt(combinationSum2([2, 5, 2, 1, 2], 5)));
console.log("DP count [2, 3, 6, 7], 7: " + countWays([2, 3, 6, 7], 7));
console.log("DP count [2, 3, 5], 8: " + countWays([2, 3, 5], 8));
console.log("DP count [2, 3, 5, 7, 11], 30: " + countWays([2, 3, 5, 7, 11], 30));
console.log("DP count [2, 3, 5, 7, 11], 200: " + countWays([2, 3, 5, 7, 11], 200));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an int array of distinct positive \`candidates\` and an int \`target\`, return every unique combination that sums to the target as a \`List<List<Integer>>\`. Each number may be used any number of times. Code it in Java."

**What a strong answer should cover:**
- Backtracking with a running \`remaining\` amount: choose a candidate, recurse with \`remaining - x\`, un-choose; record when \`remaining\` is 0.
- The start index: recurse with \`i\` (reuse allowed) and never go back to smaller indices, so each combination appears once instead of in every order.
- Pruning: sort the candidates and \`break\` as soon as a candidate exceeds \`remaining\`.
- Complexity is exponential in target / smallest candidate; extra space is the recursion depth, at most target / smallest candidate.
- The variants: Combination Sum II (each number once, duplicates in input: \`i + 1\` plus the skip rule) and counting combinations with coin-change DP.
- Java details: \`Arrays.sort\` on a \`clone()\` so the caller array is untouched, \`new ArrayList<>(path)\` when recording, and \`path.remove(path.size() - 1)\` (index, not value) to undo.

**Clarifying questions expected:**
- Are the candidates distinct and all positive?
- May a number be used more than once?
- Does the order of the combinations (or within a combination) matter?

**Code / implementation expected:** Yes — a backtracking method in Java returning \`List<List<Integer>>\`, with the start index and the sort-and-break pruning.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know recursion and the subsets pattern  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A vending machine takes only 2-, 3-, 6- and 7-cent coins, and a snack costs exactly 7 cents. Which handfuls of coins could you put in? A 7 on its own works. So does 2 + 2 + 3. Putting in 2, then 3, then 2 is the same handful as 2 + 2 + 3 — the machine does not care about order. Anything else either falls short or overshoots.

Listing every such handful is the **Combination Sum** problem: given the coin values (\`candidates\`) and the price (\`target\`), list every multiset of coins that adds up to the price, using each coin value as often as you like. It is one of the most common [backtracking](/interview-question/what-is-backtracking) interview questions because it combines three ideas: a running total, reuse of choices, and pruning.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can a number be used more than once? | Yes in Combination Sum (recurse with \`i\`); no in Combination Sum II (recurse with \`i + 1\`). |
| Are the candidates distinct? | Duplicates in the input need the sort-and-skip rule, or the same combination appears twice. |
| Are all candidates positive? | A 0 can be added forever without changing the sum, so the search never ends; negatives make pruning by "too big" invalid. |
| Is the order of combinations important? | Sorting the candidates first gives each combination in non-decreasing order and the list in a predictable order. |
| Do you need the combinations, or only how many there are? | The count alone is a fast dynamic-programming problem (section 7). |

## 3. The Core Idea

Keep a \`path\` (the coins chosen so far) and \`remaining\` (how much is still needed). At each step, try adding each allowed candidate: subtract it from \`remaining\` and recurse. Three outcomes:

- \`remaining == 0\` → the path is an answer; record a copy.
- \`remaining < 0\` → overshot; this branch is dead.
- otherwise → keep choosing.

📌 **Interview term: Combination** — a selection where order does not matter: \`[2, 2, 3]\` and \`[3, 2, 2]\` are the same combination.

📌 **Interview term: Remaining target** — the amount still to be reached; passing it down instead of summing the path each time makes every step O(1).

The subtle part is **which candidates are allowed next**. If every level may pick any candidate, the search builds \`[2, 2, 3]\`, \`[2, 3, 2]\` and \`[3, 2, 2]\` separately. The fix is the start index from [subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array), with one twist: after choosing \`nums[i]\`, the next level starts at **\`i\`** (the same number may come again), not \`i + 1\`. Choices then appear in non-decreasing index order, so each multiset is built exactly once.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Without a start index the same multiset 2, 2, 3 is built three times. With a start index it is built once">
  <text class="d-text" x="20" y="65">no start index</text>
  <rect class="d-box-accent" x="200" y="40" width="110" height="40" rx="6"/>
  <text class="d-text" x="255" y="65" text-anchor="middle">2, 2, 3</text>
  <rect class="d-box-accent" x="350" y="40" width="110" height="40" rx="6"/>
  <text class="d-text" x="405" y="65" text-anchor="middle">2, 3, 2</text>
  <rect class="d-box-accent" x="500" y="40" width="110" height="40" rx="6"/>
  <text class="d-text" x="555" y="65" text-anchor="middle">3, 2, 2</text>
  <text class="d-text" x="20" y="155">with start index</text>
  <rect class="d-box-accent" x="200" y="130" width="110" height="40" rx="6"/>
  <text class="d-text" x="255" y="155" text-anchor="middle">2, 2, 3</text>
  <rect class="d-box-muted" x="350" y="130" width="110" height="40" rx="6"/>
  <text class="d-sub" x="405" y="155" text-anchor="middle">never built</text>
  <rect class="d-box-muted" x="500" y="130" width="110" height="40" rx="6"/>
  <text class="d-sub" x="555" y="155" text-anchor="middle">never built</text>
</svg>

📌 **Interview term: Start index (with reuse)** — the next level may only choose candidates at index \`i\` or later, where \`i\` is the index just chosen. Reuse is allowed; going back is not.

## 4. The Search Tree and Pruning

Sort the candidates first. Then, inside the loop, as soon as \`nums[i] > remaining\`, every later candidate is too big too, and you can \`break\` out of the loop instead of trying them one by one. Here is the whole search for \`[2, 3, 6, 7]\`, target 7, with that pruning — each circle shows \`remaining\`, each label the number just added:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 350" role="img" aria-label="Search tree for candidates 2, 3, 6, 7 and target 7. Each circle shows the remaining amount; the two zeros are the answers 7 and 2, 2, 3">
  <path class="d-edge" d="M 350 62 L 140 108"/>
  <path class="d-edge" d="M 350 62 L 300 108"/>
  <path class="d-edge" d="M 350 62 L 460 108"/>
  <path class="d-edge" d="M 350 62 L 600 108"/>
  <path class="d-edge" d="M 140 152 L 70 198"/>
  <path class="d-edge" d="M 140 152 L 230 198"/>
  <path class="d-edge" d="M 300 152 L 340 198"/>
  <path class="d-edge" d="M 70 242 L 25 288"/>
  <path class="d-edge" d="M 70 242 L 140 288"/>
  <circle class="d-box" cx="350" cy="40" r="22"/>
  <text class="d-text" x="350" y="45" text-anchor="middle">7</text>
  <circle class="d-box" cx="140" cy="130" r="22"/>
  <text class="d-text" x="140" y="135" text-anchor="middle">5</text>
  <text class="d-sub d-accent" x="170" y="135">+2</text>
  <circle class="d-box" cx="300" cy="130" r="22"/>
  <text class="d-text" x="300" y="135" text-anchor="middle">4</text>
  <text class="d-sub d-accent" x="330" y="135">+3</text>
  <circle class="d-box-muted" cx="460" cy="130" r="22"/>
  <text class="d-text" x="460" y="135" text-anchor="middle">1</text>
  <text class="d-sub d-accent" x="490" y="135">+6</text>
  <circle class="d-box-accent" cx="600" cy="130" r="22"/>
  <text class="d-text" x="600" y="135" text-anchor="middle">0</text>
  <text class="d-sub d-accent" x="630" y="135">+7</text>
  <circle class="d-box" cx="70" cy="220" r="22"/>
  <text class="d-text" x="70" y="225" text-anchor="middle">3</text>
  <text class="d-sub d-accent" x="100" y="225">+2</text>
  <circle class="d-box-muted" cx="230" cy="220" r="22"/>
  <text class="d-text" x="230" y="225" text-anchor="middle">2</text>
  <text class="d-sub d-accent" x="260" y="225">+3</text>
  <circle class="d-box-muted" cx="340" cy="220" r="22"/>
  <text class="d-text" x="340" y="225" text-anchor="middle">1</text>
  <text class="d-sub d-accent" x="370" y="225">+3</text>
  <circle class="d-box-muted" cx="25" cy="310" r="22"/>
  <text class="d-text" x="25" y="315" text-anchor="middle">1</text>
  <text class="d-sub d-accent" x="55" y="315">+2</text>
  <circle class="d-box-accent" cx="140" cy="310" r="22"/>
  <text class="d-text" x="140" y="315" text-anchor="middle">0</text>
  <text class="d-sub d-accent" x="170" y="315">+3</text>
  <text class="d-sub" x="520" y="240">circle: remaining</text>
  <text class="d-sub" x="520" y="265">grey: dead end</text>
  <text class="d-sub d-accent" x="520" y="290">zero: answer</text>
</svg>

The tree has exactly 10 nodes, matching the 10 calls example 1 counts for this input. The two zeros are the answers: \`[7]\` (right) and \`[2, 2, 3]\` (bottom left). The grey circles are dead ends: at \`remaining = 1\` after adding 6, the next candidate allowed is 6 again, which is already too big, so the loop breaks immediately.

📌 **Interview term: Sort-and-break pruning** — on sorted candidates, stop the loop at the first candidate larger than the remaining target, because all later ones are larger too.

## 5. The Code in Java

~~~java
static void go(int[] nums, boolean prune, int start, int remaining, List<Integer> path, List<List<Integer>> out) {
    calls++;
    if (remaining == 0) {
        out.add(new ArrayList<>(path));        // found one: record a copy
        return;
    }
    if (remaining < 0) return;                 // overshot: dead end
    for (int i = start; i < nums.length; i++) {
        if (prune && nums[i] > remaining) break;   // sorted, so every later number is too big as well
        path.add(nums[i]);                     // choose
        go(nums, prune, i, remaining - nums[i], path, out);  // i, not i + 1: reuse allowed
        path.remove(path.size() - 1);          // un-choose: remove(int index), not remove(Object)
    }
}
~~~

**What to point out in this Java code:**

- \`candidates.clone()\` then \`Arrays.sort(nums)\` sorts a copy; sorting the parameter directly would reorder the caller array.
- \`go(nums, prune, i, remaining - nums[i], ...)\` passes \`i\`, not \`i + 1\`: the same number may be chosen again. Never going back below \`i\` keeps \`[2, 2, 3]\` from also appearing as \`[2, 3, 2]\`.
- \`path.remove(path.size() - 1)\` is \`remove(int index)\`. \`path.remove(nums[i])\` would also compile — and remove the element *at position* \`nums[i]\`.
- \`out.add(new ArrayList<>(path))\` stores a copy; \`List.toString()\` then prints \`[[2, 2, 3], [7]]\` directly.
- The counter is a \`static long calls\` reset per run. Recursion depth is at most target / smallest candidate + 1; extremely deep cases end in \`StackOverflowError\`.

With \`prune\` off, the function still finds the same combinations — the \`remaining < 0\` check catches overshoots — but it has to make the overshooting call first. Example 1 measures the difference: 28 vs 10 calls for target 7, 1,239 vs 575 for \`[2, 3, 5, 7, 11]\` and target 30.

## 6. The Two Variations Interviewers Ask Next

**The bug to recognise: no start index.** If every level loops over all candidates, order starts to matter and each combination appears once per ordering:

~~~java
// BUG on purpose: every level loops from index 0, so order matters.
static void noStart(int[] nums, int remaining, List<Integer> path, List<List<Integer>> out) {
    if (remaining == 0) {
        out.add(new ArrayList<>(path));
        return;
    }
    for (int x : nums) {
        if (x > remaining) break;
        path.add(x);
        noStart(nums, remaining - x, path, out);
        path.remove(path.size() - 1);
    }
}
~~~

**Combination Sum II** — each candidate may be used **at most once**, and the input may contain duplicates (\`[10, 1, 2, 7, 6, 1, 5]\`). Two changes: recurse with \`i + 1\`, and use the same-level duplicate skip from [Subsets II](/interview-question/how-do-you-generate-all-subsets-of-an-array):

~~~java
// Each candidate used at most once; candidates may contain duplicates.
static void go2(int[] nums, int start, int remaining, List<Integer> path, List<List<Integer>> out) {
    if (remaining == 0) {
        out.add(new ArrayList<>(path));
        return;
    }
    for (int i = start; i < nums.length; i++) {
        if (nums[i] > remaining) break;
        if (i > start && nums[i] == nums[i - 1]) continue;  // same value at the same level -> same subtree
        path.add(nums[i]);
        go2(nums, i + 1, remaining - nums[i], path, out);   // i + 1: each element at most once
        path.remove(path.size() - 1);
    }
}
~~~

📌 **Interview term: Combination Sum II** — the variant where each input element is used at most once and the input may contain duplicates; solved with \`i + 1\` plus skipping equal values at the same level.

## 7. Only Need the Count? Use DP

If the question is "how many combinations", listing them is wasteful. This is exactly the counting version of [coin change](/interview-question/how-do-you-solve-the-coin-change-problem): \`ways[t]\` is the number of combinations that make total t.

~~~java
// Coin-change style DP: number of combinations (order ignored).
static long countWays(int[] nums, int target) {
    long[] ways = new long[target + 1];
    ways[0] = 1;
    for (int x : nums)                         // outer loop over numbers -> combinations
        for (int t = x; t <= target; t++) ways[t] += ways[t - x];
    return ways[target];
}
~~~

The loop over numbers is on the **outside**. That way each number is fully processed before the next, so every combination is counted once in a single order. Swapping the loops counts ordered sequences instead (\`[2, 2, 3]\`, \`[2, 3, 2]\` and \`[3, 2, 2]\` separately). Example 2 checks that the DP counts — 2, 3 and 64 — match the number of combinations the backtracking found in example 1, and then counts 37,744 combinations for target 200, which the DP does in 5 × 200 steps.

📌 **Interview term: Counting DP** — computing how many solutions exist from the counts of smaller sub-problems, without listing them. See [dynamic programming](/interview-question/what-is-dynamic-programming).

## 8. Verified: Running the Code

Each example below was saved as \`Main.java\` and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — Combination Sum on five inputs, and call counts with and without sort + break pruning** prints:

~~~text
candidates [2, 3, 6, 7], target 7 -> [[2, 2, 3], [7]]
candidates [2, 3, 5], target 8 -> [[2, 2, 2, 2], [2, 3, 3], [3, 5]]
candidates [8, 7, 4, 3], target 11 -> [[3, 4, 4], [3, 8], [4, 7]]
candidates [2], target 1 -> []
candidates [1], target 2 -> [[1, 1]]
[2, 3, 6, 7], target 7: 2 combinations, calls plain 28, sort + break 10
[2, 3, 5], target 8: 3 combinations, calls plain 23, sort + break 13
[2, 3, 5, 7, 11], target 30: 64 combinations, calls plain 1239, sort + break 575
[3, 5, 7, 2, 11], target 40: 148 combinations, calls plain 2760, sort + break 1634
~~~

**Example 2 — the start-index bug, Combination Sum II, and a DP count that cross-checks the backtracking** prints:

~~~text
no start index:  [[2, 2, 3], [2, 3, 2], [3, 2, 2], [7]]
Combination Sum II [10, 1, 2, 7, 6, 1, 5], 8 -> [[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]]
Combination Sum II [2, 5, 2, 1, 2], 5 -> [[1, 2, 2], [5]]
DP count [2, 3, 6, 7], 7: 2
DP count [2, 3, 5], 8: 3
DP count [2, 3, 5, 7, 11], 30: 64
DP count [2, 3, 5, 7, 11], 200: 37744
~~~

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Backtracking with sort + break | exponential; loose bound O(N^(T/M + 1)) | O(T / M) | depth at most T / M (smallest candidate M), up to N branches per node |
| Backtracking without pruning | same bound, more calls | O(T / M) | every overshooting call is still made (1,239 vs 575 in our run) |
| Sorting first | O(N log N) | depends on the sort | done once, negligible next to the search |
| Counting DP | O(N · T) | O(T) | one pass over totals per number |

Here N is the number of candidates, T the target and M the smallest candidate. The output itself can be exponential in T / M, so no listing algorithm is polynomial in general. Extra space excludes the output.

## 10. Edge Cases

- **No combination exists** — \`[2]\`, target 1 → \`[]\`. Example 1 prints it. An empty list is a valid answer, not an error.
- **A single candidate used many times** — \`[1]\`, target 2 → \`[[1, 1]]\`.
- **Target smaller than every candidate** — the loop breaks immediately at the root.
- **Unsorted input** — \`[8, 7, 4, 3]\`, target 11 → \`[[3, 4, 4], [3, 8], [4, 7]]\` once sorted; without the sort, \`break\` would be wrong.
- **Zero or negative candidates** — not allowed in the standard problem; a 0 makes the search infinite. Ask, and reject or filter them.

## Common Pitfalls

- **Recursing with \`i + 1\`.** That forbids reuse: \`[2, 2, 3]\` disappears for target 7. \`i + 1\` is Combination Sum II.
- **Looping from 0 at every level.** Our run printed \`[[2, 2, 3], [2, 3, 2], [3, 2, 2], [7]]\` — the same combination in three orders.
- **\`break\` on an unsorted array.** It skips valid numbers after the first one that is too big. \`Arrays.sort\` first, or use \`continue\`.
- **Adding \`path\` itself.** Every stored combination is the same list, empty at the end.
- **\`remove(Object)\` vs \`remove(int)\`.** Undo with the index overload, \`remove(path.size() - 1)\`.
- **Zero or negative candidates.** A 0 can be added forever; confirm the inputs are positive.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Approach:</strong> <span style="color:#f0e2c8;">backtracking with a path and a remaining target: add a candidate, recurse with remaining minus it, remove it; record when remaining is 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. No duplicates:</strong> <span style="color:#f0e2c8;">a start index: recurse with i, so reuse is allowed but the search never goes back to smaller indices, and each combination appears once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pruning:</strong> <span style="color:#f0e2c8;">sort the candidates and break as soon as one is bigger than remaining; that cut 1,239 calls to 575 on a target-30 test.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity and variants:</strong> <span style="color:#f0e2c8;">exponential in target / smallest candidate, O(T / M) extra space. Combination Sum II: recurse with i + 1 and skip equal values at the same level. Count only: coin-change DP in O(N · T).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">sort a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clone()</code>, add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new ArrayList&lt;&gt;(path)</code>, undo with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove(path.size() - 1)</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why pass <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">i</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">i + 1</code> in the recursive call?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each number may be reused, so the next level may pick the same index again; never going below <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> stops reordered duplicates.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for Combination Sum II?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recurse with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i + 1</code>, sort, and skip <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt; start &amp;&amp; nums[i] == nums[i - 1]</code>. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[10, 1, 2, 7, 6, 1, 5]</code>, 8 that gives 4 combinations.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the time complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exponential in the target: a loose upper bound is O(N^(T/M + 1)) for N candidates, target T and smallest candidate M. Pruning cut our target-30 case from 1,239 calls to 575.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if I only need the number of combinations?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Coin-change DP with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long[] ways</code>: outer loop over numbers, inner over totals. O(N · T); 37,744 for target 200. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> because counts grow fast.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">List&lt;List&lt;Integer&gt;&gt;</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int[][]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The number of combinations and their lengths are not known in advance; lists grow as needed. Convert at the end if an array is required.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Combination** | A selection where order does not matter |
| **Remaining target** | The amount still needed, passed down the recursion |
| **Start index (with reuse)** | Next level may choose index i or later; reuse yes, going back no |
| **Sort-and-break pruning** | On sorted candidates, stop at the first one bigger than remaining |
| **Combination Sum II** | Each element at most once, duplicates in input: i + 1 plus same-level skip |
| **Counting DP** | Count solutions from smaller sub-problems without listing them |

---
**Conclusion:** In Java, Combination Sum is the subsets template with two changes: carry the \`remaining\` amount, and recurse with \`i\` instead of \`i + 1\` so a number can repeat. Sort a clone so that \`break\` can stop the loop early, add \`new ArrayList<>(path)\` when \`remaining\` hits 0, undo with \`remove(path.size() - 1)\`, and use the coin-change DP when only the count is needed. The same skeleton, with a different rule for the next choice, solves [permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array) and [N-Queens](/interview-question/how-do-you-solve-the-n-queens-problem).`,
        examples: [
          {
            label: "Combination Sum: results, and calls with vs without pruning",
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

// Combination Sum: candidates are distinct, each may be reused any number of times.
public class Main {
    static long calls;

    static void go(int[] nums, boolean prune, int start, int remaining, List<Integer> path, List<List<Integer>> out) {
        calls++;
        if (remaining == 0) {
            out.add(new ArrayList<>(path));        // found one: record a copy
            return;
        }
        if (remaining < 0) return;                 // overshot: dead end
        for (int i = start; i < nums.length; i++) {
            if (prune && nums[i] > remaining) break;   // sorted, so every later number is too big as well
            path.add(nums[i]);                     // choose
            go(nums, prune, i, remaining - nums[i], path, out);  // i, not i + 1: reuse allowed
            path.remove(path.size() - 1);          // un-choose: remove(int index), not remove(Object)
        }
    }

    static List<List<Integer>> combinationSum(int[] candidates, int target, boolean prune) {
        int[] nums = candidates.clone();           // do not reorder the caller's array
        if (prune) Arrays.sort(nums);
        List<List<Integer>> out = new ArrayList<>();
        calls = 0;
        go(nums, prune, 0, target, new ArrayList<>(), out);
        return out;
    }

    public static void main(String[] args) {
        int[][] cands = {{2, 3, 6, 7}, {2, 3, 5}, {8, 7, 4, 3}, {2}, {1}};
        int[] targets = {7, 8, 11, 1, 2};
        for (int t = 0; t < cands.length; t++) {
            System.out.println("candidates " + Arrays.toString(cands[t]) + ", target " + targets[t]
                + " -> " + combinationSum(cands[t], targets[t], true));
        }

        int[][] big = {{2, 3, 6, 7}, {2, 3, 5}, {2, 3, 5, 7, 11}, {3, 5, 7, 2, 11}};
        int[] bigTargets = {7, 8, 30, 40};
        for (int t = 0; t < big.length; t++) {
            combinationSum(big[t], bigTargets[t], false);
            long plainCalls = calls;
            List<List<Integer>> fast = combinationSum(big[t], bigTargets[t], true);
            System.out.println(Arrays.toString(big[t]) + ", target " + bigTargets[t] + ": " + fast.size()
                + " combinations, calls plain " + plainCalls + ", sort + break " + calls);
        }
    }
}`,
          },
          {
            label: "Start-index bug, Combination Sum II, and a DP count check",
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

// Three variations: the classic start-index bug, Combination Sum II, and a DP count check.
public class Main {
    // BUG on purpose: every level loops from index 0, so order matters.
    static void noStart(int[] nums, int remaining, List<Integer> path, List<List<Integer>> out) {
        if (remaining == 0) {
            out.add(new ArrayList<>(path));
            return;
        }
        for (int x : nums) {
            if (x > remaining) break;
            path.add(x);
            noStart(nums, remaining - x, path, out);
            path.remove(path.size() - 1);
        }
    }

    // Each candidate used at most once; candidates may contain duplicates.
    static void go2(int[] nums, int start, int remaining, List<Integer> path, List<List<Integer>> out) {
        if (remaining == 0) {
            out.add(new ArrayList<>(path));
            return;
        }
        for (int i = start; i < nums.length; i++) {
            if (nums[i] > remaining) break;
            if (i > start && nums[i] == nums[i - 1]) continue;  // same value at the same level -> same subtree
            path.add(nums[i]);
            go2(nums, i + 1, remaining - nums[i], path, out);   // i + 1: each element at most once
            path.remove(path.size() - 1);
        }
    }

    static List<List<Integer>> noStartIndex(int[] nums, int target) {
        List<List<Integer>> out = new ArrayList<>();
        noStart(nums, target, new ArrayList<>(), out);
        return out;
    }

    static List<List<Integer>> combinationSum2(int[] candidates, int target) {
        int[] nums = candidates.clone();
        Arrays.sort(nums);
        List<List<Integer>> out = new ArrayList<>();
        go2(nums, 0, target, new ArrayList<>(), out);
        return out;
    }

    // Coin-change style DP: number of combinations (order ignored).
    static long countWays(int[] nums, int target) {
        long[] ways = new long[target + 1];
        ways[0] = 1;
        for (int x : nums)                         // outer loop over numbers -> combinations
            for (int t = x; t <= target; t++) ways[t] += ways[t - x];
        return ways[target];
    }

    public static void main(String[] args) {
        System.out.println("no start index:  " + noStartIndex(new int[] {2, 3, 6, 7}, 7));
        System.out.println("Combination Sum II [10, 1, 2, 7, 6, 1, 5], 8 -> " + combinationSum2(new int[] {10, 1, 2, 7, 6, 1, 5}, 8));
        System.out.println("Combination Sum II [2, 5, 2, 1, 2], 5 -> " + combinationSum2(new int[] {2, 5, 2, 1, 2}, 5));
        System.out.println("DP count [2, 3, 6, 7], 7: " + countWays(new int[] {2, 3, 6, 7}, 7));
        System.out.println("DP count [2, 3, 5], 8: " + countWays(new int[] {2, 3, 5}, 8));
        System.out.println("DP count [2, 3, 5, 7, 11], 30: " + countWays(new int[] {2, 3, 5, 7, 11}, 30));
        System.out.println("DP count [2, 3, 5, 7, 11], 200: " + countWays(new int[] {2, 3, 5, 7, 11}, 200));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a \`vector<int>\` of distinct positive \`candidates\` and an int \`target\`, return every unique combination that sums to the target. Each number may be used any number of times. Code it in C++."

**What a strong answer should cover:**
- Backtracking with a running \`remaining\` amount: choose a candidate, recurse with \`remaining - x\`, un-choose; record when \`remaining\` is 0.
- The start index: recurse with \`i\` (reuse allowed) and never go back to smaller indices, so each combination appears once instead of in every order.
- Pruning: sort the candidates and \`break\` as soon as a candidate exceeds \`remaining\`.
- Complexity is exponential in target / smallest candidate; extra space is the recursion depth, at most target / smallest candidate.
- The variants: Combination Sum II (each number once, duplicates in input: \`i + 1\` plus the skip rule) and counting combinations with coin-change DP.
- C++ details: take the candidates by value (or copy) before \`std::sort\` so the caller is untouched, pass \`path\` by reference, \`out.push_back(path)\` copies, and use \`long long\` for counts.

**Clarifying questions expected:**
- Are the candidates distinct and all positive?
- May a number be used more than once?
- Does the order of the combinations (or within a combination) matter?

**Code / implementation expected:** Yes — a backtracking function in C++ returning \`vector<vector<int>>\`, with the start index and the sort-and-break pruning.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know recursion and the subsets pattern  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A vending machine takes only 2-, 3-, 6- and 7-cent coins, and a snack costs exactly 7 cents. Which handfuls of coins could you put in? A 7 on its own works. So does 2 + 2 + 3. Putting in 2, then 3, then 2 is the same handful as 2 + 2 + 3 — the machine does not care about order. Anything else either falls short or overshoots.

Listing every such handful is the **Combination Sum** problem: given the coin values (\`candidates\`) and the price (\`target\`), list every multiset of coins that adds up to the price, using each coin value as often as you like. It is one of the most common [backtracking](/interview-question/what-is-backtracking) interview questions because it combines three ideas: a running total, reuse of choices, and pruning.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can a number be used more than once? | Yes in Combination Sum (recurse with \`i\`); no in Combination Sum II (recurse with \`i + 1\`). |
| Are the candidates distinct? | Duplicates in the input need the sort-and-skip rule, or the same combination appears twice. |
| Are all candidates positive? | A 0 can be added forever without changing the sum, so the search never ends; negatives make pruning by "too big" invalid. |
| Is the order of combinations important? | Sorting the candidates first gives each combination in non-decreasing order and the list in a predictable order. |
| Do you need the combinations, or only how many there are? | The count alone is a fast dynamic-programming problem (section 7). |

## 3. The Core Idea

Keep a \`path\` (the coins chosen so far) and \`remaining\` (how much is still needed). At each step, try adding each allowed candidate: subtract it from \`remaining\` and recurse. Three outcomes:

- \`remaining == 0\` → the path is an answer; record a copy.
- \`remaining < 0\` → overshot; this branch is dead.
- otherwise → keep choosing.

📌 **Interview term: Combination** — a selection where order does not matter: \`[2, 2, 3]\` and \`[3, 2, 2]\` are the same combination.

📌 **Interview term: Remaining target** — the amount still to be reached; passing it down instead of summing the path each time makes every step O(1).

The subtle part is **which candidates are allowed next**. If every level may pick any candidate, the search builds \`[2, 2, 3]\`, \`[2, 3, 2]\` and \`[3, 2, 2]\` separately. The fix is the start index from [subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array), with one twist: after choosing \`nums[i]\`, the next level starts at **\`i\`** (the same number may come again), not \`i + 1\`. Choices then appear in non-decreasing index order, so each multiset is built exactly once.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 200" role="img" aria-label="Without a start index the same multiset 2, 2, 3 is built three times. With a start index it is built once">
  <text class="d-text" x="20" y="65">no start index</text>
  <rect class="d-box-accent" x="200" y="40" width="110" height="40" rx="6"/>
  <text class="d-text" x="255" y="65" text-anchor="middle">2, 2, 3</text>
  <rect class="d-box-accent" x="350" y="40" width="110" height="40" rx="6"/>
  <text class="d-text" x="405" y="65" text-anchor="middle">2, 3, 2</text>
  <rect class="d-box-accent" x="500" y="40" width="110" height="40" rx="6"/>
  <text class="d-text" x="555" y="65" text-anchor="middle">3, 2, 2</text>
  <text class="d-text" x="20" y="155">with start index</text>
  <rect class="d-box-accent" x="200" y="130" width="110" height="40" rx="6"/>
  <text class="d-text" x="255" y="155" text-anchor="middle">2, 2, 3</text>
  <rect class="d-box-muted" x="350" y="130" width="110" height="40" rx="6"/>
  <text class="d-sub" x="405" y="155" text-anchor="middle">never built</text>
  <rect class="d-box-muted" x="500" y="130" width="110" height="40" rx="6"/>
  <text class="d-sub" x="555" y="155" text-anchor="middle">never built</text>
</svg>

📌 **Interview term: Start index (with reuse)** — the next level may only choose candidates at index \`i\` or later, where \`i\` is the index just chosen. Reuse is allowed; going back is not.

## 4. The Search Tree and Pruning

Sort the candidates first. Then, inside the loop, as soon as \`nums[i] > remaining\`, every later candidate is too big too, and you can \`break\` out of the loop instead of trying them one by one. Here is the whole search for \`[2, 3, 6, 7]\`, target 7, with that pruning — each circle shows \`remaining\`, each label the number just added:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 350" role="img" aria-label="Search tree for candidates 2, 3, 6, 7 and target 7. Each circle shows the remaining amount; the two zeros are the answers 7 and 2, 2, 3">
  <path class="d-edge" d="M 350 62 L 140 108"/>
  <path class="d-edge" d="M 350 62 L 300 108"/>
  <path class="d-edge" d="M 350 62 L 460 108"/>
  <path class="d-edge" d="M 350 62 L 600 108"/>
  <path class="d-edge" d="M 140 152 L 70 198"/>
  <path class="d-edge" d="M 140 152 L 230 198"/>
  <path class="d-edge" d="M 300 152 L 340 198"/>
  <path class="d-edge" d="M 70 242 L 25 288"/>
  <path class="d-edge" d="M 70 242 L 140 288"/>
  <circle class="d-box" cx="350" cy="40" r="22"/>
  <text class="d-text" x="350" y="45" text-anchor="middle">7</text>
  <circle class="d-box" cx="140" cy="130" r="22"/>
  <text class="d-text" x="140" y="135" text-anchor="middle">5</text>
  <text class="d-sub d-accent" x="170" y="135">+2</text>
  <circle class="d-box" cx="300" cy="130" r="22"/>
  <text class="d-text" x="300" y="135" text-anchor="middle">4</text>
  <text class="d-sub d-accent" x="330" y="135">+3</text>
  <circle class="d-box-muted" cx="460" cy="130" r="22"/>
  <text class="d-text" x="460" y="135" text-anchor="middle">1</text>
  <text class="d-sub d-accent" x="490" y="135">+6</text>
  <circle class="d-box-accent" cx="600" cy="130" r="22"/>
  <text class="d-text" x="600" y="135" text-anchor="middle">0</text>
  <text class="d-sub d-accent" x="630" y="135">+7</text>
  <circle class="d-box" cx="70" cy="220" r="22"/>
  <text class="d-text" x="70" y="225" text-anchor="middle">3</text>
  <text class="d-sub d-accent" x="100" y="225">+2</text>
  <circle class="d-box-muted" cx="230" cy="220" r="22"/>
  <text class="d-text" x="230" y="225" text-anchor="middle">2</text>
  <text class="d-sub d-accent" x="260" y="225">+3</text>
  <circle class="d-box-muted" cx="340" cy="220" r="22"/>
  <text class="d-text" x="340" y="225" text-anchor="middle">1</text>
  <text class="d-sub d-accent" x="370" y="225">+3</text>
  <circle class="d-box-muted" cx="25" cy="310" r="22"/>
  <text class="d-text" x="25" y="315" text-anchor="middle">1</text>
  <text class="d-sub d-accent" x="55" y="315">+2</text>
  <circle class="d-box-accent" cx="140" cy="310" r="22"/>
  <text class="d-text" x="140" y="315" text-anchor="middle">0</text>
  <text class="d-sub d-accent" x="170" y="315">+3</text>
  <text class="d-sub" x="520" y="240">circle: remaining</text>
  <text class="d-sub" x="520" y="265">grey: dead end</text>
  <text class="d-sub d-accent" x="520" y="290">zero: answer</text>
</svg>

The tree has exactly 10 nodes, matching the 10 calls example 1 counts for this input. The two zeros are the answers: \`[7]\` (right) and \`[2, 2, 3]\` (bottom left). The grey circles are dead ends: at \`remaining = 1\` after adding 6, the next candidate allowed is 6 again, which is already too big, so the loop breaks immediately.

📌 **Interview term: Sort-and-break pruning** — on sorted candidates, stop the loop at the first candidate larger than the remaining target, because all later ones are larger too.

## 5. The Code in C++

~~~cpp
void go(const vector<int>& nums, bool prune, size_t start, int remaining, vector<int>& path, Combos& out) {
    calls++;
    if (remaining == 0) {
        out.push_back(path);                   // found one: push_back copies path
        return;
    }
    if (remaining < 0) return;                 // overshot: dead end
    for (size_t i = start; i < nums.size(); i++) {
        if (prune && nums[i] > remaining) break;   // sorted, so every later number is too big as well
        path.push_back(nums[i]);               // choose
        go(nums, prune, i, remaining - nums[i], path, out);  // i, not i + 1: reuse allowed
        path.pop_back();                       // un-choose
    }
}
~~~

**What to point out in this C++ code:**

- \`combinationSum(vector<int> nums, ...)\` takes the vector by value, so \`sort\` reorders only the local copy.
- \`go(nums, prune, i, remaining - nums[i], ...)\` passes \`i\`, not \`i + 1\`: the same number may be chosen again. Never going back below \`i\` keeps \`[2, 2, 3]\` from also appearing as \`[2, 3, 2]\`.
- \`out.push_back(path)\` copies the vector; \`path\` itself is shared through \`vector<int>&\` and restored with \`pop_back\`.
- \`nums[i] > remaining\` compares an \`int\` element with an \`int\`; the loop index is \`size_t\` to match \`nums.size()\`.
- \`for (const auto& [cands, target] : tests)\` is a C++17 structured binding over \`pair<vector<int>, int>\`.

With \`prune\` off, the function still finds the same combinations — the \`remaining < 0\` check catches overshoots — but it has to make the overshooting call first. Example 1 measures the difference: 28 vs 10 calls for target 7, 1,239 vs 575 for \`[2, 3, 5, 7, 11]\` and target 30.

## 6. The Two Variations Interviewers Ask Next

**The bug to recognise: no start index.** If every level loops over all candidates, order starts to matter and each combination appears once per ordering:

~~~cpp
// BUG on purpose: every level loops from index 0, so order matters.
void noStart(const vector<int>& nums, int remaining, vector<int>& path, Combos& out) {
    if (remaining == 0) {
        out.push_back(path);
        return;
    }
    for (int x : nums) {
        if (x > remaining) break;
        path.push_back(x);
        noStart(nums, remaining - x, path, out);
        path.pop_back();
    }
}
~~~

**Combination Sum II** — each candidate may be used **at most once**, and the input may contain duplicates (\`[10, 1, 2, 7, 6, 1, 5]\`). Two changes: recurse with \`i + 1\`, and use the same-level duplicate skip from [Subsets II](/interview-question/how-do-you-generate-all-subsets-of-an-array):

~~~cpp
// Each candidate used at most once; candidates may contain duplicates.
void go2(const vector<int>& nums, size_t start, int remaining, vector<int>& path, Combos& out) {
    if (remaining == 0) {
        out.push_back(path);
        return;
    }
    for (size_t i = start; i < nums.size(); i++) {
        if (nums[i] > remaining) break;
        if (i > start && nums[i] == nums[i - 1]) continue;  // same value at the same level -> same subtree
        path.push_back(nums[i]);
        go2(nums, i + 1, remaining - nums[i], path, out);   // i + 1: each element at most once
        path.pop_back();
    }
}
~~~

📌 **Interview term: Combination Sum II** — the variant where each input element is used at most once and the input may contain duplicates; solved with \`i + 1\` plus skipping equal values at the same level.

## 7. Only Need the Count? Use DP

If the question is "how many combinations", listing them is wasteful. This is exactly the counting version of [coin change](/interview-question/how-do-you-solve-the-coin-change-problem): \`ways[t]\` is the number of combinations that make total t.

~~~cpp
// Coin-change style DP: number of combinations (order ignored).
long long countWays(const vector<int>& nums, int target) {
    vector<long long> ways(target + 1, 0);
    ways[0] = 1;
    for (int x : nums)                             // outer loop over numbers -> combinations
        for (int t = x; t <= target; t++) ways[t] += ways[t - x];
    return ways[target];
}
~~~

The loop over numbers is on the **outside**. That way each number is fully processed before the next, so every combination is counted once in a single order. Swapping the loops counts ordered sequences instead (\`[2, 2, 3]\`, \`[2, 3, 2]\` and \`[3, 2, 2]\` separately). Example 2 checks that the DP counts — 2, 3 and 64 — match the number of combinations the backtracking found in example 1, and then counts 37,744 combinations for target 200, which the DP does in 5 × 200 steps.

📌 **Interview term: Counting DP** — computing how many solutions exist from the counts of smaller sub-problems, without listing them. See [dynamic programming](/interview-question/what-is-dynamic-programming).

## 8. Verified: Running the Code

Each example below was saved as \`main.cpp\` and run with \`g++ -std=c++17 -O2 main.cpp -o main && ./main\` (GCC 13.3). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — Combination Sum on five inputs, and call counts with and without sort + break pruning** prints:

~~~text
candidates [2, 3, 6, 7], target 7 -> [[2, 2, 3], [7]]
candidates [2, 3, 5], target 8 -> [[2, 2, 2, 2], [2, 3, 3], [3, 5]]
candidates [8, 7, 4, 3], target 11 -> [[3, 4, 4], [3, 8], [4, 7]]
candidates [2], target 1 -> []
candidates [1], target 2 -> [[1, 1]]
[2, 3, 6, 7], target 7: 2 combinations, calls plain 28, sort + break 10
[2, 3, 5], target 8: 3 combinations, calls plain 23, sort + break 13
[2, 3, 5, 7, 11], target 30: 64 combinations, calls plain 1239, sort + break 575
[3, 5, 7, 2, 11], target 40: 148 combinations, calls plain 2760, sort + break 1634
~~~

**Example 2 — the start-index bug, Combination Sum II, and a DP count that cross-checks the backtracking** prints:

~~~text
no start index:  [[2, 2, 3], [2, 3, 2], [3, 2, 2], [7]]
Combination Sum II [10, 1, 2, 7, 6, 1, 5], 8 -> [[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]]
Combination Sum II [2, 5, 2, 1, 2], 5 -> [[1, 2, 2], [5]]
DP count [2, 3, 6, 7], 7: 2
DP count [2, 3, 5], 8: 3
DP count [2, 3, 5, 7, 11], 30: 64
DP count [2, 3, 5, 7, 11], 200: 37744
~~~

## 9. Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Backtracking with sort + break | exponential; loose bound O(N^(T/M + 1)) | O(T / M) | depth at most T / M (smallest candidate M), up to N branches per node |
| Backtracking without pruning | same bound, more calls | O(T / M) | every overshooting call is still made (1,239 vs 575 in our run) |
| Sorting first | O(N log N) | depends on the sort | done once, negligible next to the search |
| Counting DP | O(N · T) | O(T) | one pass over totals per number |

Here N is the number of candidates, T the target and M the smallest candidate. The output itself can be exponential in T / M, so no listing algorithm is polynomial in general. Extra space excludes the output.

## 10. Edge Cases

- **No combination exists** — \`[2]\`, target 1 → \`[]\`. Example 1 prints it. An empty list is a valid answer, not an error.
- **A single candidate used many times** — \`[1]\`, target 2 → \`[[1, 1]]\`.
- **Target smaller than every candidate** — the loop breaks immediately at the root.
- **Unsorted input** — \`[8, 7, 4, 3]\`, target 11 → \`[[3, 4, 4], [3, 8], [4, 7]]\` once sorted; without the sort, \`break\` would be wrong.
- **Zero or negative candidates** — not allowed in the standard problem; a 0 makes the search infinite. Ask, and reject or filter them.

## Common Pitfalls

- **Recursing with \`i + 1\`.** That forbids reuse: \`[2, 2, 3]\` disappears for target 7. \`i + 1\` is Combination Sum II.
- **Looping from 0 at every level.** Our run printed \`[[2, 2, 3], [2, 3, 2], [3, 2, 2], [7]]\` — the same combination in three orders.
- **\`break\` on an unsorted vector.** It skips valid numbers after the first one that is too big. \`sort\` first, or use \`continue\`.
- **Taking \`path\` by value.** Still correct, but every call copies the path; and taking \`nums\` by non-const reference then sorting it changes the caller vector.
- **\`int\` for the DP counts.** Counts grow exponentially with the target; use \`long long\` (the example does) or check for overflow.
- **Zero or negative candidates.** A 0 can be added forever, so the recursion never ends; confirm the inputs are positive.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Approach:</strong> <span style="color:#f0e2c8;">backtracking with a path and a remaining target: add a candidate, recurse with remaining minus it, remove it; record when remaining is 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. No duplicates:</strong> <span style="color:#f0e2c8;">a start index: recurse with i, so reuse is allowed but the search never goes back to smaller indices, and each combination appears once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pruning:</strong> <span style="color:#f0e2c8;">sort the candidates and break as soon as one is bigger than remaining; that cut 1,239 calls to 575 on a target-30 test.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity and variants:</strong> <span style="color:#f0e2c8;">exponential in target / smallest candidate, O(T / M) extra space. Combination Sum II: recurse with i + 1 and skip equal values at the same level. Count only: coin-change DP in O(N · T).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">sort a copy, pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">path</code> by reference, let <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">out.push_back(path)</code> copy, and keep counts in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why pass <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">i</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">i + 1</code> in the recursive call?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each number may be reused, so the next level may pick the same index again; never going below <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> stops reordered duplicates.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for Combination Sum II?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recurse with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i + 1</code>, sort, and skip <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt; start &amp;&amp; nums[i] == nums[i - 1]</code>. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{10, 1, 2, 7, 6, 1, 5}</code>, 8 that gives 4 combinations.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the time complexity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exponential in the target: a loose upper bound is O(N^(T/M + 1)) for N candidates, target T and smallest candidate M. Pruning cut our target-30 case from 1,239 calls to 575.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if I only need the number of combinations?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Coin-change DP with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;long long&gt; ways(target + 1)</code>: outer loop over numbers, inner over totals. O(N · T); 37,744 for target 200.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you avoid storing all combinations?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass a callback and call it when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remaining == 0</code>; memory drops to the path plus the recursion, O(T / M).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Combination** | A selection where order does not matter |
| **Remaining target** | The amount still needed, passed down the recursion |
| **Start index (with reuse)** | Next level may choose index i or later; reuse yes, going back no |
| **Sort-and-break pruning** | On sorted candidates, stop at the first one bigger than remaining |
| **Combination Sum II** | Each element at most once, duplicates in input: i + 1 plus same-level skip |
| **Counting DP** | Count solutions from smaller sub-problems without listing them |

---
**Conclusion:** In C++, Combination Sum is the subsets template with two changes: carry the \`remaining\` amount, and recurse with \`i\` instead of \`i + 1\` so a number can repeat. Sort a copy so that \`break\` can stop the loop early, \`out.push_back(path)\` when \`remaining\` hits 0, and use the coin-change DP with \`long long\` when only the count is needed. The same skeleton, with a different rule for the next choice, solves [permutations](/interview-question/how-do-you-generate-all-permutations-of-an-array) and [N-Queens](/interview-question/how-do-you-solve-the-n-queens-problem).`,
        examples: [
          {
            label: "Combination Sum: results, and calls with vs without pruning",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

// Combination Sum: candidates are distinct, each may be reused any number of times.
using Combos = vector<vector<int>>;
long long calls = 0;

void go(const vector<int>& nums, bool prune, size_t start, int remaining, vector<int>& path, Combos& out) {
    calls++;
    if (remaining == 0) {
        out.push_back(path);                   // found one: push_back copies path
        return;
    }
    if (remaining < 0) return;                 // overshot: dead end
    for (size_t i = start; i < nums.size(); i++) {
        if (prune && nums[i] > remaining) break;   // sorted, so every later number is too big as well
        path.push_back(nums[i]);               // choose
        go(nums, prune, i, remaining - nums[i], path, out);  // i, not i + 1: reuse allowed
        path.pop_back();                       // un-choose
    }
}

Combos combinationSum(vector<int> nums, int target, bool prune) {   // by value: caller keeps its order
    if (prune) sort(nums.begin(), nums.end());
    Combos out;
    vector<int> path;
    calls = 0;
    go(nums, prune, 0, target, path, out);
    return out;
}

string fmtOne(const vector<int>& c) {
    string r = "[";
    for (size_t i = 0; i < c.size(); i++) r += (i ? ", " : "") + to_string(c[i]);
    return r + "]";
}

string fmt(const Combos& combos) {
    string r = "[";
    for (size_t k = 0; k < combos.size(); k++) r += (k ? ", " : "") + fmtOne(combos[k]);
    return r + "]";
}

int main() {
    vector<pair<vector<int>, int>> tests = {{{2, 3, 6, 7}, 7}, {{2, 3, 5}, 8}, {{8, 7, 4, 3}, 11}, {{2}, 1}, {{1}, 2}};
    for (const auto& [cands, target] : tests)
        cout << "candidates " << fmtOne(cands) << ", target " << target << " -> "
             << fmt(combinationSum(cands, target, true)) << "\\n";

    vector<pair<vector<int>, int>> big = {{{2, 3, 6, 7}, 7}, {{2, 3, 5}, 8}, {{2, 3, 5, 7, 11}, 30}, {{3, 5, 7, 2, 11}, 40}};
    for (const auto& [cands, target] : big) {
        combinationSum(cands, target, false);
        long long plainCalls = calls;
        Combos fast = combinationSum(cands, target, true);
        cout << fmtOne(cands) << ", target " << target << ": " << fast.size()
             << " combinations, calls plain " << plainCalls << ", sort + break " << calls << "\\n";
    }
}`,
          },
          {
            label: "Start-index bug, Combination Sum II, and a DP count check",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

// Three variations: the classic start-index bug, Combination Sum II, and a DP count check.
using Combos = vector<vector<int>>;

// BUG on purpose: every level loops from index 0, so order matters.
void noStart(const vector<int>& nums, int remaining, vector<int>& path, Combos& out) {
    if (remaining == 0) {
        out.push_back(path);
        return;
    }
    for (int x : nums) {
        if (x > remaining) break;
        path.push_back(x);
        noStart(nums, remaining - x, path, out);
        path.pop_back();
    }
}

// Each candidate used at most once; candidates may contain duplicates.
void go2(const vector<int>& nums, size_t start, int remaining, vector<int>& path, Combos& out) {
    if (remaining == 0) {
        out.push_back(path);
        return;
    }
    for (size_t i = start; i < nums.size(); i++) {
        if (nums[i] > remaining) break;
        if (i > start && nums[i] == nums[i - 1]) continue;  // same value at the same level -> same subtree
        path.push_back(nums[i]);
        go2(nums, i + 1, remaining - nums[i], path, out);   // i + 1: each element at most once
        path.pop_back();
    }
}

Combos noStartIndex(const vector<int>& nums, int target) {
    Combos out;
    vector<int> path;
    noStart(nums, target, path, out);
    return out;
}

Combos combinationSum2(vector<int> nums, int target) {
    sort(nums.begin(), nums.end());
    Combos out;
    vector<int> path;
    go2(nums, 0, target, path, out);
    return out;
}

// Coin-change style DP: number of combinations (order ignored).
long long countWays(const vector<int>& nums, int target) {
    vector<long long> ways(target + 1, 0);
    ways[0] = 1;
    for (int x : nums)                             // outer loop over numbers -> combinations
        for (int t = x; t <= target; t++) ways[t] += ways[t - x];
    return ways[target];
}

string fmt(const Combos& combos) {
    string r = "[";
    for (size_t k = 0; k < combos.size(); k++) {
        r += k ? ", [" : "[";
        for (size_t i = 0; i < combos[k].size(); i++) r += (i ? ", " : "") + to_string(combos[k][i]);
        r += "]";
    }
    return r + "]";
}

int main() {
    cout << "no start index:  " << fmt(noStartIndex({2, 3, 6, 7}, 7)) << "\\n";
    cout << "Combination Sum II [10, 1, 2, 7, 6, 1, 5], 8 -> " << fmt(combinationSum2({10, 1, 2, 7, 6, 1, 5}, 8)) << "\\n";
    cout << "Combination Sum II [2, 5, 2, 1, 2], 5 -> " << fmt(combinationSum2({2, 5, 2, 1, 2}, 5)) << "\\n";
    cout << "DP count [2, 3, 6, 7], 7: " << countWays({2, 3, 6, 7}, 7) << "\\n";
    cout << "DP count [2, 3, 5], 8: " << countWays({2, 3, 5}, 8) << "\\n";
    cout << "DP count [2, 3, 5, 7, 11], 30: " << countWays({2, 3, 5, 7, 11}, 30) << "\\n";
    cout << "DP count [2, 3, 5, 7, 11], 200: " << countWays({2, 3, 5, 7, 11}, 200) << "\\n";
}`,
          },
        ],
      },
    },
  },
];

export default augments;
