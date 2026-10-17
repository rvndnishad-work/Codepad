/**
 * DSA ULTRA — batch 11: stacks and strings — valid parentheses, a queue from two stacks,
 * a min stack with O(1) getMin, the monotonic stack pattern, and next greater element /
 * Daily Temperatures. One complete answer per language (Python, JavaScript, Java, C++).
 * Every example was run with python3 / node / javac+java / g++ -std=c++17 by
 * scripts/verify-dsa-examples.ts and the quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you check for valid/balanced parentheses?",
    difficulty: "easy",
    seoDescription: "Check balanced parentheses with a stack in Python, JavaScript, Java and C++: the three failure cases, O(n) cost and verified runs.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a string that contains only the characters ( ) [ ] { }, write a Python function that returns True if every bracket is closed by the same kind of bracket in the correct order, and False otherwise. Talk me through the edge cases."

**What a strong answer should cover:**
- Use a stack because the most recently opened bracket must close first (last in, first out).
- The three failure cases: a closer with an empty stack, a closer that does not match the top, and openers left over at the end.
- O(n) time and O(n) space, with the early exit on odd length and on the first mismatch.
- Why a single counter only works for one bracket type: it cannot see order, so \`([)]\` slips through.
- Python specifics: a \`list\` used as a stack with \`append\`, \`pop\` and \`stack[-1]\`; a \`dict\` mapping closer to opener; \`stack.pop()\` on an empty list raises \`IndexError\`, so check \`not stack\` first.

**Clarifying questions expected:**
- "Can the string contain characters other than brackets?"
- "Should an empty string count as valid?"

**Code / implementation expected:** Yes — a short Python function using a list as the stack and a dict of pairs.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; no prior knowledge of stacks assumed.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Python version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Think of a stack of plates in a canteen. You can only put a plate on the top and only take the plate from the top. Now imagine every opening bracket is a plate with a colour written on it: \`(\` is red, \`[\` is blue, \`{\` is green. Each time you read an opening bracket you put its plate on the pile. Each time you read a closing bracket, you must take the top plate off, and it has to be the matching colour. If the top plate is the wrong colour, or there is no plate at all, the string is broken. If you reach the end and plates are still on the pile, something was opened and never closed.

That is the whole algorithm. It matters because the same idea checks code in every compiler and editor (the red squiggle when you forget a \`}\`), validates HTML and JSON nesting, and evaluates maths expressions. Interviewers like it as a warm-up because it quickly shows whether you reach for the right data structure and whether you handle the empty cases without crashing.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which bracket types appear: only \`()\`, or also \`[]\` and \`{}\`? | With one type a simple counter is enough; with several you need a stack (Example 2 shows why). |
| Can the string contain other characters, such as letters or digits? | If yes, the loop must skip them instead of treating them as closers. |
| What should an empty string return? | Most versions say valid (\`true\`); the code below does that, but confirm. |
| How long can the input be? | Tells you whether O(n) extra memory is fine (it almost always is). |
| Return only true/false, or the position of the first error? | An editor wants the index; the interview version usually wants a boolean. |

## 3. The Core Idea

Brackets must close in the **reverse order** they opened: the most recently opened bracket is the first one that may close. "Last in, first out" is exactly what a stack gives you.

📌 **Interview term: Stack (LIFO)** — a collection where you add (push) and remove (pop) only at one end, the top, so the last item in is the first item out. See [the difference between a stack and a queue](/interview-question/what-is-the-difference-between-a-stack-and-a-queue).

📌 **Interview term: Matching pair** — an opening bracket and the closing bracket of the same kind, such as \`(\` and \`)\`. A lookup table from each closer to its opener is the usual way to test this.

The algorithm, in four rules:

1. Read the string left to right.
2. Opening bracket: push it.
3. Closing bracket: if the stack is empty, or its top is not the matching opener, the string is **invalid**. Otherwise pop.
4. At the end the string is valid only if the stack is **empty**.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="Scanning the string ([]) with a stack: push, push, pop on a match, pop on a match, stack ends empty so the string is valid">
  <defs>
    <marker id="b11q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="95" y="34" text-anchor="middle">read (</text>
  <text class="d-sub" x="95" y="56" text-anchor="middle">opener: push</text>
  <rect class="d-box-accent" x="60" y="192" width="70" height="34" rx="6"/>
  <text class="d-text" x="95" y="214" text-anchor="middle">(</text>
  <path class="d-edge" d="M 50 230 L 140 230"/>

  <path class="d-edge" d="M 148 120 L 192 120" marker-end="url(#b11q1-arrow)"/>

  <text class="d-text" x="245" y="34" text-anchor="middle">read [</text>
  <text class="d-sub" x="245" y="56" text-anchor="middle">opener: push</text>
  <rect class="d-box" x="210" y="192" width="70" height="34" rx="6"/>
  <text class="d-text" x="245" y="214" text-anchor="middle">(</text>
  <rect class="d-box-accent" x="210" y="150" width="70" height="34" rx="6"/>
  <text class="d-text" x="245" y="172" text-anchor="middle">[</text>
  <path class="d-edge" d="M 200 230 L 290 230"/>

  <path class="d-edge" d="M 298 120 L 342 120" marker-end="url(#b11q1-arrow)"/>

  <text class="d-text" x="395" y="34" text-anchor="middle">read ]</text>
  <text class="d-sub" x="395" y="56" text-anchor="middle">top is [ so pop</text>
  <rect class="d-box-accent" x="360" y="192" width="70" height="34" rx="6"/>
  <text class="d-text" x="395" y="214" text-anchor="middle">(</text>
  <path class="d-edge" d="M 350 230 L 440 230"/>

  <path class="d-edge" d="M 448 120 L 492 120" marker-end="url(#b11q1-arrow)"/>

  <text class="d-text" x="545" y="34" text-anchor="middle">read )</text>
  <text class="d-sub" x="545" y="56" text-anchor="middle">top is ( so pop</text>
  <rect class="d-box-muted" x="510" y="192" width="70" height="34" rx="6"/>
  <text class="d-sub" x="545" y="214" text-anchor="middle">empty</text>
  <path class="d-edge" d="M 500 230 L 590 230"/>
  <text class="d-text d-accent" x="545" y="256" text-anchor="middle">valid</text>
</svg>

The picture above traces \`([])\`: two pushes, two matching pops, and an empty stack at the end, so the answer is valid.

There are exactly three ways to fail, and a correct solution must catch all three:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="The three ways a bracket string fails: wrong kind on top, a stray closer with an empty stack, and openers left over at the end">
  <rect class="d-box-muted" x="20" y="20" width="200" height="180" rx="10"/>
  <text class="d-text" x="120" y="50" text-anchor="middle">([)]</text>
  <text class="d-sub" x="120" y="82" text-anchor="middle">after ( and [ the top is [</text>
  <text class="d-sub" x="120" y="106" text-anchor="middle">then ) arrives</text>
  <text class="d-sub" x="120" y="130" text-anchor="middle">[ is not the opener of )</text>
  <text class="d-text d-accent" x="120" y="170" text-anchor="middle">wrong kind on top</text>

  <rect class="d-box-muted" x="260" y="20" width="200" height="180" rx="10"/>
  <text class="d-text" x="360" y="50" text-anchor="middle">))((</text>
  <text class="d-sub" x="360" y="82" text-anchor="middle">the first ) arrives</text>
  <text class="d-sub" x="360" y="106" text-anchor="middle">the stack is empty</text>
  <text class="d-sub" x="360" y="130" text-anchor="middle">nothing to match it</text>
  <text class="d-text d-accent" x="360" y="170" text-anchor="middle">stray closer</text>

  <rect class="d-box-muted" x="500" y="20" width="200" height="180" rx="10"/>
  <text class="d-text" x="600" y="50" text-anchor="middle">((</text>
  <text class="d-sub" x="600" y="82" text-anchor="middle">push (, push (</text>
  <text class="d-sub" x="600" y="106" text-anchor="middle">the input ends</text>
  <text class="d-sub" x="600" y="130" text-anchor="middle">two openers remain</text>
  <text class="d-text d-accent" x="600" y="170" text-anchor="middle">never closed</text>
</svg>

From left to right: the wrong kind of opener is on top, a closer arrives when nothing is open, and openers are still waiting when the input ends.

📌 **Interview term: Early exit** — returning as soon as the answer is known. A wrong closer means invalid immediately; there is no need to read the rest. An odd length is also an instant "invalid", because brackets come in pairs.

## 4. Brute Force First, Then the Stack

**Brute force — delete pairs until nothing changes.** Repeatedly remove every \`()\`, \`[]\` and \`{}\` that sits side by side. If the string becomes empty it was valid. It is correct, but each pass scans the whole string and may only remove one pair, so in the worst case it does about n/2 passes of n characters each: O(n²) time, plus a new string every pass.

**A counter — only correct for one bracket type.** Add 1 for \`(\`, subtract 1 for \`)\`, fail if the count goes below zero, and require zero at the end. That is O(1) memory and perfect when the only bracket is \`()\`. With several types it breaks: separate counters for each type cannot see the *order*, so \`([)]\` looks fine to them. Example 2 runs both checks side by side to show this.

**The stack — one pass, O(n).** Every character is pushed at most once and popped at most once, so the work is linear.

## 5. The Python Solution, Line by Line

~~~python
def is_valid(s: str) -> bool:
    if len(s) % 2 == 1:              # odd length can never pair up
        return False
    pairs = {")": "(", "]": "[", "}": "{"}   # closer -> its opener
    stack = []                       # a list used as a stack
    for ch in s:
        if ch in pairs:              # closing bracket
            if not stack or stack[-1] != pairs[ch]:
                return False         # nothing open, or the wrong kind
            stack.pop()
        else:                        # opening bracket
            stack.append(ch)
    return not stack                 # leftovers mean something never closed
~~~

What each Python piece is doing:

- **\`stack = []\` with \`append\` and \`pop\`.** A Python \`list\` is the standard stack. \`append\` adds to the end and \`pop()\` with no argument removes from the end; both are amortised O(1) according to the [Python wiki TimeComplexity page](https://wiki.python.org/moin/TimeComplexity). The end of the list is the top of the stack, and \`stack[-1]\` reads it without removing it.
- **\`pairs = {")": "(", ...}\`.** Mapping each *closer* to its *opener* means one dictionary lookup answers both "is this a closer?" (\`ch in pairs\` checks the keys) and "what should be on top?" (\`pairs[ch]\`).
- **\`if not stack\`.** An empty list is falsy in Python, so \`not stack\` means "the stack is empty". This check must come *before* reading \`stack[-1]\`, because both reading and popping an empty list raise an error:

~~~python
stack = []
try:
    stack.pop()
except IndexError as e:
    print("IndexError:", e)
try:
    print(stack[-1])
except IndexError as e:
    print("IndexError:", e)
~~~

~~~text
IndexError: pop from empty list
IndexError: list index out of range
~~~

- **\`return not stack\`.** Returns \`True\` only when nothing is left open. Writing \`return True\` here is the most common bug: it accepts \`((\`.
- **\`for ch in s\`.** Iterating a Python string gives one-character strings, so no indexing is needed.

📌 **Interview term: Amortised O(1)** — an operation that is O(1) on average over many calls even though an occasional call is slower (here, when the list grows its internal array). See [amortized analysis](/interview-question/what-is-amortized-analysis).

If other characters are allowed, add a third branch: check openers with \`ch in "([{"\`, closers with \`ch in pairs\`, and simply \`continue\` for anything else.

### Dry run on \`{[()()]}\`

| Read | Action | Stack after (bottom to top) |
| :--- | :--- | :--- |
| \`{\` | opener: push | \`{\` |
| \`[\` | opener: push | \`{[\` |
| \`(\` | opener: push | \`{[(\` |
| \`)\` | top is \`(\`, matches: pop | \`{[\` |
| \`(\` | opener: push | \`{[(\` |
| \`)\` | top is \`(\`, matches: pop | \`{[\` |
| \`]\` | top is \`[\`, matches: pop | \`{\` |
| \`}\` | top is \`{\`, matches: pop | empty |

The stack is empty at the end, so the string is valid. The deepest the stack ever got was 3, which is the nesting depth.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`python3 main.py\` (Python 3.13). The same programs in the other three languages print exactly the same lines.

**Example 1 — Stack-based validator on normal and edge-case inputs** printed:

~~~text
valid("()") = true
valid("()[]{}") = true
valid("{[()()]}") = true
valid("(]") = false
valid("([)]") = false
valid("((") = false
valid("))((") = false
valid("(((") = false
valid("") = true
~~~

**Example 2 — Why one counter per bracket type is not enough** printed:

~~~text
(()()) -> counter: true, stack: true
([)] -> counter: true, stack: false
{[}] -> counter: true, stack: false
)( -> counter: false, stack: false
((]] -> counter: false, stack: false
[({})] -> counter: true, stack: true
~~~

In Example 2 the per-type counters accept \`([)]\` and \`{[}]\` because each type is balanced on its own; only the stack notices that a closer arrived while a different kind was on top.

## 7. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n) | Each character is looked at once; each push and pop is O(1) (amortised for the growable list) |
| Space | O(n) | In the worst case, such as \`((((\`, every character is an opener and sits on the stack |
| Counter version (one type only) | O(n) time, O(1) space | Only an integer is kept, but it cannot check order across types |
| Delete-pairs brute force | O(n²) time | Up to n/2 passes over the string |

For more on reading these costs, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty string** — the loop never runs and the stack is empty, so the code returns \`true\`. Confirm that is what the interviewer wants.
- **Odd length** — impossible to pair up; the code returns \`false\` before scanning.
- **Only closers** (\`))((\`) — the first \`)\` finds an empty stack: invalid immediately.
- **Only openers** (\`((\`) — the loop finishes with items on the stack: invalid.
- **Correct counts, wrong order** (\`([)]\`) — the type check on the top catches it.
- **Deep nesting** — the solution is a loop, not recursion, so a string nested a million levels deep cannot overflow the call stack.

## Common Pitfalls

- **Popping before checking.** \`stack.pop()\` on an empty list raises \`IndexError: pop from empty list\`, so \`")"\` crashes instead of returning \`False\`. Test \`not stack\` first, as above.
- **\`return True\` at the end.** Forgets the leftover-openers case: \`"(("\` would pass. The last line must be \`return not stack\` (or \`len(stack) == 0\`).
- **Mapping opener to closer, then comparing the wrong way round.** Both directions work, but mixing them (looking up \`pairs[ch]\` with an opener as the key) raises \`KeyError\`. Pick one direction and keep it.
- **Using \`str.replace\` in a loop.** \`while "()" in s: s = s.replace("()", "")\` is short but O(n²) and creates a new string on every pass.
- **Using a counter with several bracket types.** Example 2 shows \`([)]\` and \`{[}]\` passing the counter check.
- **Using \`collections.deque\` for no reason.** A deque also works, but a list is already O(1) at the end, so it adds an import without a benefit here.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Brackets must close in reverse order of opening, which is last in, first out, so I use a stack.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The loop:</strong> <span style="color:#f0e2c8;">Push every opener; for a closer, the stack must be non-empty and its top must be the matching opener, otherwise return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code>; then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The ending:</strong> <span style="color:#f0e2c8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">not stack</code>, because leftover openers were never closed. An odd length is an instant <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Python details:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stack[-1]</code> is the stack; a dict maps each closer to its opener; I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">not stack</code> before popping because an empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IndexError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The cost:</strong> <span style="color:#f0e2c8;">O(n) time since each character is pushed and popped at most once, O(n) space in the worst case of all openers.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the string also contains letters, like <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a(b)c</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Skip anything that is neither an opener nor a closer with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">continue</code>. The stack logic is unchanged.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it in O(1) extra space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only when there is a single bracket type: keep an integer balance that must never go negative and must end at zero. With several types the order matters, so you need the stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the index of the first error?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push indices instead of characters. A bad closer reports its own index; if openers are left over, report the index at the bottom of the stack (the oldest unclosed one).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the minimum number of brackets to add to make <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">())(</code> valid?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Scan once with a balance counter: each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">)</code> with balance zero needs an added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(</code>; whatever balance remains at the end needs that many <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">)</code>. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">())(</code> the answer is 2.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use a dict instead of a chain of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">if</code> statements?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It keeps the pairs in one place, makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ch in pairs</code> an O(1) membership test, and adding a new bracket type is one entry instead of new branches.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Stack (LIFO)** | Add and remove only at the top; the last item in is the first out |
| **Matching pair** | An opener and the closer of the same kind, such as \`(\` and \`)\` |
| **Early exit** | Return as soon as the answer is known (first mismatch, odd length) |
| **Amortised O(1)** | O(1) on average over many operations, even if one is occasionally slower |

---
**Conclusion:** Balanced brackets is a stack problem because the last bracket opened must be the first one closed. In Python the whole solution is a list used as a stack plus a dict from closer to opener: push openers, and for each closer check \`not stack\` and the top before popping, then return \`not stack\`. It runs in O(n) time and O(n) space, it catches all three failure modes (wrong kind, stray closer, leftovers), and the runs above show a counter-only shortcut accepting \`([)]\` while the stack correctly rejects it.`,
        examples: [
          {
            label: "Stack-based validator on normal and edge-case inputs",
            code: `def is_valid(s: str) -> bool:
    if len(s) % 2 == 1:              # odd length can never pair up
        return False
    pairs = {")": "(", "]": "[", "}": "{"}   # closer -> its opener
    stack = []                       # a list used as a stack
    for ch in s:
        if ch in pairs:              # closing bracket
            if not stack or stack[-1] != pairs[ch]:
                return False         # nothing open, or the wrong kind
            stack.pop()
        else:                        # opening bracket
            stack.append(ch)
    return not stack                 # leftovers mean something never closed


def show(s):
    return 'valid("' + s + '") = ' + str(is_valid(s)).lower()


print(show("()"))  # valid("()") = true
print(show("()[]{}"))  # valid("()[]{}") = true
print(show("{[()()]}"))  # valid("{[()()]}") = true
print(show("(]"))  # valid("(]") = false
print(show("([)]"))  # valid("([)]") = false
print(show("(("))  # valid("((") = false
print(show("))(("))  # valid("))((") = false
print(show("((("))  # valid("(((") = false
print(show(""))  # valid("") = true
`,
          },
          {
            label: "Why one counter per bracket type is not enough",
            code: `def counter_check(s):
    # One counter per bracket type: never below zero, all zero at the end.
    count = {"(": 0, "[": 0, "{": 0}
    opener = {")": "(", "]": "[", "}": "{"}
    for ch in s:
        if ch in count:
            count[ch] += 1
        else:
            count[opener[ch]] -= 1
            if count[opener[ch]] < 0:
                return False
    return all(v == 0 for v in count.values())


def stack_check(s):
    opener = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in opener:
            if not stack or stack.pop() != opener[ch]:
                return False
        else:
            stack.append(ch)
    return not stack


def b(x):
    return str(x).lower()


for s in ["(()())", "([)]", "{[}]", ")(", "((]]", "[({})]"]:
    print(s + " -> counter: " + b(counter_check(s)) + ", stack: " + b(stack_check(s)))
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given a string made only of ( ) [ ] { }, write a JavaScript function isValid(s) that returns true when every bracket is closed by the same kind in the right order. Walk me through the edge cases as you go."

**What a strong answer should cover:**
- A stack, because the latest opened bracket must be the first to close (last in, first out).
- All three failure cases: closer with an empty stack, closer that does not match the top, openers left at the end.
- O(n) time, O(n) space, early exit on odd length and on the first mismatch.
- Why one counter is not enough with several bracket types.
- JavaScript specifics: an array as the stack with \`push\`, \`pop\` and \`stack[stack.length - 1]\`; \`pop()\` on an empty array returns \`undefined\` instead of throwing, so an explicit length check keeps the logic clear; a \`Map\` (or plain object) for the pairs.

**Clarifying questions expected:**
- "Can the input contain other characters?"
- "What should an empty string return?"

**Code / implementation expected:** Yes — a JavaScript function using an array as the stack and a Map of pairs.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; no prior knowledge of stacks assumed.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this JavaScript version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Think of a stack of plates in a canteen. You can only put a plate on the top and only take the plate from the top. Now imagine every opening bracket is a plate with a colour written on it: \`(\` is red, \`[\` is blue, \`{\` is green. Each time you read an opening bracket you put its plate on the pile. Each time you read a closing bracket, you must take the top plate off, and it has to be the matching colour. If the top plate is the wrong colour, or there is no plate at all, the string is broken. If you reach the end and plates are still on the pile, something was opened and never closed.

That is the whole algorithm. It matters because the same idea checks code in every compiler and editor (the red squiggle when you forget a \`}\`), validates HTML and JSON nesting, and evaluates maths expressions. Interviewers like it as a warm-up because it quickly shows whether you reach for the right data structure and whether you handle the empty cases without crashing.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which bracket types appear: only \`()\`, or also \`[]\` and \`{}\`? | With one type a simple counter is enough; with several you need a stack (Example 2 shows why). |
| Can the string contain other characters, such as letters or digits? | If yes, the loop must skip them instead of treating them as closers. |
| What should an empty string return? | Most versions say valid (\`true\`); the code below does that, but confirm. |
| How long can the input be? | Tells you whether O(n) extra memory is fine (it almost always is). |
| Return only true/false, or the position of the first error? | An editor wants the index; the interview version usually wants a boolean. |

## 3. The Core Idea

Brackets must close in the **reverse order** they opened: the most recently opened bracket is the first one that may close. "Last in, first out" is exactly what a stack gives you.

📌 **Interview term: Stack (LIFO)** — a collection where you add (push) and remove (pop) only at one end, the top, so the last item in is the first item out. See [the difference between a stack and a queue](/interview-question/what-is-the-difference-between-a-stack-and-a-queue).

📌 **Interview term: Matching pair** — an opening bracket and the closing bracket of the same kind, such as \`(\` and \`)\`. A lookup table from each closer to its opener is the usual way to test this.

The algorithm, in four rules:

1. Read the string left to right.
2. Opening bracket: push it.
3. Closing bracket: if the stack is empty, or its top is not the matching opener, the string is **invalid**. Otherwise pop.
4. At the end the string is valid only if the stack is **empty**.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="Scanning the string ([]) with a stack: push, push, pop on a match, pop on a match, stack ends empty so the string is valid">
  <defs>
    <marker id="b11q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="95" y="34" text-anchor="middle">read (</text>
  <text class="d-sub" x="95" y="56" text-anchor="middle">opener: push</text>
  <rect class="d-box-accent" x="60" y="192" width="70" height="34" rx="6"/>
  <text class="d-text" x="95" y="214" text-anchor="middle">(</text>
  <path class="d-edge" d="M 50 230 L 140 230"/>

  <path class="d-edge" d="M 148 120 L 192 120" marker-end="url(#b11q1-arrow)"/>

  <text class="d-text" x="245" y="34" text-anchor="middle">read [</text>
  <text class="d-sub" x="245" y="56" text-anchor="middle">opener: push</text>
  <rect class="d-box" x="210" y="192" width="70" height="34" rx="6"/>
  <text class="d-text" x="245" y="214" text-anchor="middle">(</text>
  <rect class="d-box-accent" x="210" y="150" width="70" height="34" rx="6"/>
  <text class="d-text" x="245" y="172" text-anchor="middle">[</text>
  <path class="d-edge" d="M 200 230 L 290 230"/>

  <path class="d-edge" d="M 298 120 L 342 120" marker-end="url(#b11q1-arrow)"/>

  <text class="d-text" x="395" y="34" text-anchor="middle">read ]</text>
  <text class="d-sub" x="395" y="56" text-anchor="middle">top is [ so pop</text>
  <rect class="d-box-accent" x="360" y="192" width="70" height="34" rx="6"/>
  <text class="d-text" x="395" y="214" text-anchor="middle">(</text>
  <path class="d-edge" d="M 350 230 L 440 230"/>

  <path class="d-edge" d="M 448 120 L 492 120" marker-end="url(#b11q1-arrow)"/>

  <text class="d-text" x="545" y="34" text-anchor="middle">read )</text>
  <text class="d-sub" x="545" y="56" text-anchor="middle">top is ( so pop</text>
  <rect class="d-box-muted" x="510" y="192" width="70" height="34" rx="6"/>
  <text class="d-sub" x="545" y="214" text-anchor="middle">empty</text>
  <path class="d-edge" d="M 500 230 L 590 230"/>
  <text class="d-text d-accent" x="545" y="256" text-anchor="middle">valid</text>
</svg>

The picture above traces \`([])\`: two pushes, two matching pops, and an empty stack at the end, so the answer is valid.

There are exactly three ways to fail, and a correct solution must catch all three:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="The three ways a bracket string fails: wrong kind on top, a stray closer with an empty stack, and openers left over at the end">
  <rect class="d-box-muted" x="20" y="20" width="200" height="180" rx="10"/>
  <text class="d-text" x="120" y="50" text-anchor="middle">([)]</text>
  <text class="d-sub" x="120" y="82" text-anchor="middle">after ( and [ the top is [</text>
  <text class="d-sub" x="120" y="106" text-anchor="middle">then ) arrives</text>
  <text class="d-sub" x="120" y="130" text-anchor="middle">[ is not the opener of )</text>
  <text class="d-text d-accent" x="120" y="170" text-anchor="middle">wrong kind on top</text>

  <rect class="d-box-muted" x="260" y="20" width="200" height="180" rx="10"/>
  <text class="d-text" x="360" y="50" text-anchor="middle">))((</text>
  <text class="d-sub" x="360" y="82" text-anchor="middle">the first ) arrives</text>
  <text class="d-sub" x="360" y="106" text-anchor="middle">the stack is empty</text>
  <text class="d-sub" x="360" y="130" text-anchor="middle">nothing to match it</text>
  <text class="d-text d-accent" x="360" y="170" text-anchor="middle">stray closer</text>

  <rect class="d-box-muted" x="500" y="20" width="200" height="180" rx="10"/>
  <text class="d-text" x="600" y="50" text-anchor="middle">((</text>
  <text class="d-sub" x="600" y="82" text-anchor="middle">push (, push (</text>
  <text class="d-sub" x="600" y="106" text-anchor="middle">the input ends</text>
  <text class="d-sub" x="600" y="130" text-anchor="middle">two openers remain</text>
  <text class="d-text d-accent" x="600" y="170" text-anchor="middle">never closed</text>
</svg>

From left to right: the wrong kind of opener is on top, a closer arrives when nothing is open, and openers are still waiting when the input ends.

📌 **Interview term: Early exit** — returning as soon as the answer is known. A wrong closer means invalid immediately; there is no need to read the rest. An odd length is also an instant "invalid", because brackets come in pairs.

## 4. Brute Force First, Then the Stack

**Brute force — delete pairs until nothing changes.** Repeatedly remove every \`()\`, \`[]\` and \`{}\` that sits side by side. If the string becomes empty it was valid. It is correct, but each pass scans the whole string and may only remove one pair, so in the worst case it does about n/2 passes of n characters each: O(n²) time, plus a new string every pass.

**A counter — only correct for one bracket type.** Add 1 for \`(\`, subtract 1 for \`)\`, fail if the count goes below zero, and require zero at the end. That is O(1) memory and perfect when the only bracket is \`()\`. With several types it breaks: separate counters for each type cannot see the *order*, so \`([)]\` looks fine to them. Example 2 runs both checks side by side to show this.

**The stack — one pass, O(n).** Every character is pushed at most once and popped at most once, so the work is linear.

## 5. The JavaScript Solution, Line by Line

~~~javascript
function isValid(s) {
  if (s.length % 2 === 1) return false;          // odd length can never pair up
  const pairs = new Map([[')', '('], [']', '['], ['}', '{']]); // closer -> opener
  const stack = [];                               // an array used as a stack
  for (const ch of s) {
    if (pairs.has(ch)) {                          // closing bracket
      if (stack.length === 0 || stack[stack.length - 1] !== pairs.get(ch)) {
        return false;                             // nothing open, or the wrong kind
      }
      stack.pop();
    } else {                                      // opening bracket
      stack.push(ch);
    }
  }
  return stack.length === 0;                      // leftovers never closed
}
~~~

What each JavaScript piece is doing:

- **\`const stack = []\` with \`push\` and \`pop\`.** An array is JavaScript's stack. \`push\` adds at the end and \`pop\` removes from the end, so the end is the top. \`stack[stack.length - 1]\` reads the top without removing it (\`stack.at(-1)\` does the same; it printed the last element when run on Node 22).
- **\`new Map([...])\`.** A \`Map\` maps each closer to its opener. \`pairs.has(ch)\` answers "is this a closer?" and \`pairs.get(ch)\` gives the opener that must be on top. A plain object \`{ ')': '(' }\` also works for these three keys; a \`Map\` simply has no inherited keys to worry about.
- **\`for (const ch of s)\`.** Iterates the string one character at a time.
- **The empty check.** Unlike Python or Java, an empty array does **not** throw:

~~~javascript
const stack = [];
console.log(stack.pop());
console.log(stack[stack.length - 1]);
console.log(stack.pop() !== '(');
~~~

~~~text
undefined
undefined
true
~~~

Because \`undefined !== '('\` is \`true\`, the short form \`if (stack.pop() !== pairs.get(ch)) return false;\` happens to give the right answer for a stray closer. It works, but it hides the reason; the explicit \`stack.length === 0\` check states the rule and survives refactoring (for example if you later store \`undefined\`-able values).

- **\`return stack.length === 0\`.** Returning \`true\` instead is the classic bug that accepts \`((\`.

📌 **Interview term: Amortised O(1)** — an operation that is O(1) on average over many calls even though an occasional call is slower (here, when the engine grows the array storage). See [amortized analysis](/interview-question/what-is-amortized-analysis).

If letters are allowed, test openers with \`'([{'.includes(ch)\`, closers with \`pairs.has(ch)\`, and \`continue\` for anything else.

### Dry run on \`{[()()]}\`

| Read | Action | Stack after (bottom to top) |
| :--- | :--- | :--- |
| \`{\` | opener: push | \`{\` |
| \`[\` | opener: push | \`{[\` |
| \`(\` | opener: push | \`{[(\` |
| \`)\` | top is \`(\`, matches: pop | \`{[\` |
| \`(\` | opener: push | \`{[(\` |
| \`)\` | top is \`(\`, matches: pop | \`{[\` |
| \`]\` | top is \`[\`, matches: pop | \`{\` |
| \`}\` | top is \`{\`, matches: pop | empty |

The stack is empty at the end, so the string is valid. The deepest the stack ever got was 3, which is the nesting depth.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`node main.js\` (Node.js 22). The same programs in the other three languages print exactly the same lines.

**Example 1 — Stack-based validator on normal and edge-case inputs** printed:

~~~text
valid("()") = true
valid("()[]{}") = true
valid("{[()()]}") = true
valid("(]") = false
valid("([)]") = false
valid("((") = false
valid("))((") = false
valid("(((") = false
valid("") = true
~~~

**Example 2 — Why one counter per bracket type is not enough** printed:

~~~text
(()()) -> counter: true, stack: true
([)] -> counter: true, stack: false
{[}] -> counter: true, stack: false
)( -> counter: false, stack: false
((]] -> counter: false, stack: false
[({})] -> counter: true, stack: true
~~~

In Example 2 the per-type counters accept \`([)]\` and \`{[}]\` because each type is balanced on its own; only the stack notices that a closer arrived while a different kind was on top.

## 7. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n) | Each character is looked at once; each push and pop is O(1) (amortised for the growable array) |
| Space | O(n) | In the worst case, such as \`((((\`, every character is an opener and sits on the stack |
| Counter version (one type only) | O(n) time, O(1) space | Only an integer is kept, but it cannot check order across types |
| Delete-pairs brute force | O(n²) time | Up to n/2 passes over the string |

For more on reading these costs, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty string** — the loop never runs and the stack is empty, so the code returns \`true\`. Confirm that is what the interviewer wants.
- **Odd length** — impossible to pair up; the code returns \`false\` before scanning.
- **Only closers** (\`))((\`) — the first \`)\` finds an empty stack: invalid immediately.
- **Only openers** (\`((\`) — the loop finishes with items on the stack: invalid.
- **Correct counts, wrong order** (\`([)]\`) — the type check on the top catches it.
- **Deep nesting** — the solution is a loop, not recursion, so a string nested a million levels deep cannot overflow the call stack.

## Common Pitfalls

- **Returning \`true\` at the end.** Misses leftover openers; \`"(("\` would pass. Return \`stack.length === 0\`.
- **Relying on \`undefined\` by accident.** \`stack.pop()\` on an empty array silently returns \`undefined\`. The comparison happens to fail, but if the pairs table also returned \`undefined\` (for a character that is not a closer at all) then \`undefined !== undefined\` is \`false\` and garbage input is accepted. Check the length explicitly.
- **Using \`stack.shift()\` or \`unshift()\`.** Those work on the *front* of the array and turn the stack into the wrong end; stick to \`push\` and \`pop\`.
- **Comparing with \`==\`.** It works for one-character strings, but \`===\` avoids type coercion surprises and is what reviewers expect.
- **Using a counter with several bracket types.** Example 2 shows \`([)]\` passing the counter check.
- **Regex replace loops.** \`while (/\\(\\)|\\[\\]|\\{\\}/.test(s)) s = s.replace(...)\` is short but O(n²).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Brackets close in reverse order of opening, which is last in, first out, so I use a stack.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The loop:</strong> <span style="color:#f0e2c8;">Push openers; for a closer the stack must be non-empty and its top must be the matching opener, otherwise return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>; then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The ending:</strong> <span style="color:#f0e2c8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stack.length === 0</code>, because leftover openers were never closed; odd length is an instant <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. JavaScript details:</strong> <span style="color:#f0e2c8;">An array with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stack[stack.length - 1]</code> is the stack; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> holds closer to opener; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> on an empty array returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> rather than throwing, so I check the length explicitly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The cost:</strong> <span style="color:#f0e2c8;">O(n) time since each character is pushed and popped at most once, O(n) space for the all-openers case.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the string also contains letters, like <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a(b)c</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Skip any character that is neither an opener nor a closer with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">continue</code>; the stack logic stays the same.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it in O(1) extra space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only with a single bracket type: keep a balance counter that never drops below zero and ends at zero. With several types order matters and you need the stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> instead of an object literal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either works for three fixed keys. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>, no prototype keys, and reads clearly; an object is slightly shorter. Both lookups are effectively constant time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you report where the error is?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push indices instead of characters. A bad closer reports its own index; leftover openers report the index at the bottom of the stack, the oldest unclosed bracket.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many brackets must be added to make <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">())(</code> valid?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One pass with a balance counter: every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">)</code> at balance zero needs an extra <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(</code>; the final balance needs that many <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">)</code>. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">())(</code> the answer is 2.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Stack (LIFO)** | Add and remove only at the top; the last item in is the first out |
| **Matching pair** | An opener and the closer of the same kind, such as \`(\` and \`)\` |
| **Early exit** | Return as soon as the answer is known (first mismatch, odd length) |
| **Amortised O(1)** | O(1) on average over many operations, even if one is occasionally slower |

---
**Conclusion:** Balanced brackets is a stack problem because the last bracket opened must be the first one closed. In JavaScript an array with \`push\` and \`pop\` is the stack and a \`Map\` holds closer to opener: push openers, and for each closer check the length and the top before popping, then return \`stack.length === 0\`. It is O(n) time and O(n) space, it catches all three failure modes, and the runs above show that \`pop()\` on an empty array quietly returns \`undefined\`, which is exactly why the explicit length check belongs in the code.`,
        examples: [
          {
            label: "Stack-based validator on normal and edge-case inputs",
            code: `function isValid(s) {
  if (s.length % 2 === 1) return false;          // odd length can never pair up
  const pairs = new Map([[')', '('], [']', '['], ['}', '{']]); // closer -> opener
  const stack = [];                               // an array used as a stack
  for (const ch of s) {
    if (pairs.has(ch)) {                          // closing bracket
      if (stack.length === 0 || stack[stack.length - 1] !== pairs.get(ch)) {
        return false;                             // nothing open, or the wrong kind
      }
      stack.pop();
    } else {                                      // opening bracket
      stack.push(ch);
    }
  }
  return stack.length === 0;                      // leftovers never closed
}

function show(s) {
  return 'valid("' + s + '") = ' + isValid(s);
}

console.log(show("()")); // valid("()") = true
console.log(show("()[]{}")); // valid("()[]{}") = true
console.log(show("{[()()]}")); // valid("{[()()]}") = true
console.log(show("(]")); // valid("(]") = false
console.log(show("([)]")); // valid("([)]") = false
console.log(show("((")); // valid("((") = false
console.log(show("))((")); // valid("))((") = false
console.log(show("(((")); // valid("(((") = false
console.log(show("")); // valid("") = true
`,
          },
          {
            label: "Why one counter per bracket type is not enough",
            code: `function counterCheck(s) {
  // One counter per bracket type: never below zero, all zero at the end.
  const count = { '(': 0, '[': 0, '{': 0 };
  const opener = { ')': '(', ']': '[', '}': '{' };
  for (const ch of s) {
    if (ch in count) {
      count[ch]++;
    } else {
      count[opener[ch]]--;
      if (count[opener[ch]] < 0) return false;
    }
  }
  return Object.values(count).every((v) => v === 0);
}

function stackCheck(s) {
  const opener = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const ch of s) {
    if (ch in opener) {
      if (stack.length === 0 || stack.pop() !== opener[ch]) return false;
    } else {
      stack.push(ch);
    }
  }
  return stack.length === 0;
}

for (const s of ['(()())', '([)]', '{[}]', ')(', '((]]', '[({})]']) {
  console.log(s + ' -> counter: ' + counterCheck(s) + ', stack: ' + stackCheck(s));
}
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given a String containing only ( ) [ ] { }, write a Java method boolean isValid(String s) that returns true if every bracket is closed by the same type in the correct order. Which collection would you use for the stack, and why?"

**What a strong answer should cover:**
- A stack, because the most recently opened bracket must close first (last in, first out).
- The three failures: a closer with an empty stack, a closer that does not match the top, and openers left at the end.
- O(n) time and O(n) space, with early exits.
- Why one counter cannot handle several bracket types.
- Java specifics: \`Deque<Character>\` backed by \`ArrayDeque\` instead of the legacy \`java.util.Stack\`; \`pop()\` on an empty \`ArrayDeque\` throws \`NoSuchElementException\` while \`peek()\` returns \`null\`; \`char\` values are boxed to \`Character\`, so compare unboxed \`char\`s.

**Clarifying questions expected:**
- "Can the string contain other characters, or only brackets?"
- "Is an empty string valid?"

**Code / implementation expected:** Yes — a Java method using \`Deque<Character>\` (or a \`char[]\`) as the stack.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; no prior knowledge of stacks assumed.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Java version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Think of a stack of plates in a canteen. You can only put a plate on the top and only take the plate from the top. Now imagine every opening bracket is a plate with a colour written on it: \`(\` is red, \`[\` is blue, \`{\` is green. Each time you read an opening bracket you put its plate on the pile. Each time you read a closing bracket, you must take the top plate off, and it has to be the matching colour. If the top plate is the wrong colour, or there is no plate at all, the string is broken. If you reach the end and plates are still on the pile, something was opened and never closed.

That is the whole algorithm. It matters because the same idea checks code in every compiler and editor (the red squiggle when you forget a \`}\`), validates HTML and JSON nesting, and evaluates maths expressions. Interviewers like it as a warm-up because it quickly shows whether you reach for the right data structure and whether you handle the empty cases without crashing.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which bracket types appear: only \`()\`, or also \`[]\` and \`{}\`? | With one type a simple counter is enough; with several you need a stack (Example 2 shows why). |
| Can the string contain other characters, such as letters or digits? | If yes, the loop must skip them instead of treating them as closers. |
| What should an empty string return? | Most versions say valid (\`true\`); the code below does that, but confirm. |
| How long can the input be? | Tells you whether O(n) extra memory is fine (it almost always is). |
| Return only true/false, or the position of the first error? | An editor wants the index; the interview version usually wants a boolean. |

## 3. The Core Idea

Brackets must close in the **reverse order** they opened: the most recently opened bracket is the first one that may close. "Last in, first out" is exactly what a stack gives you.

📌 **Interview term: Stack (LIFO)** — a collection where you add (push) and remove (pop) only at one end, the top, so the last item in is the first item out. See [the difference between a stack and a queue](/interview-question/what-is-the-difference-between-a-stack-and-a-queue).

📌 **Interview term: Matching pair** — an opening bracket and the closing bracket of the same kind, such as \`(\` and \`)\`. A lookup table from each closer to its opener is the usual way to test this.

The algorithm, in four rules:

1. Read the string left to right.
2. Opening bracket: push it.
3. Closing bracket: if the stack is empty, or its top is not the matching opener, the string is **invalid**. Otherwise pop.
4. At the end the string is valid only if the stack is **empty**.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="Scanning the string ([]) with a stack: push, push, pop on a match, pop on a match, stack ends empty so the string is valid">
  <defs>
    <marker id="b11q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="95" y="34" text-anchor="middle">read (</text>
  <text class="d-sub" x="95" y="56" text-anchor="middle">opener: push</text>
  <rect class="d-box-accent" x="60" y="192" width="70" height="34" rx="6"/>
  <text class="d-text" x="95" y="214" text-anchor="middle">(</text>
  <path class="d-edge" d="M 50 230 L 140 230"/>

  <path class="d-edge" d="M 148 120 L 192 120" marker-end="url(#b11q1-arrow)"/>

  <text class="d-text" x="245" y="34" text-anchor="middle">read [</text>
  <text class="d-sub" x="245" y="56" text-anchor="middle">opener: push</text>
  <rect class="d-box" x="210" y="192" width="70" height="34" rx="6"/>
  <text class="d-text" x="245" y="214" text-anchor="middle">(</text>
  <rect class="d-box-accent" x="210" y="150" width="70" height="34" rx="6"/>
  <text class="d-text" x="245" y="172" text-anchor="middle">[</text>
  <path class="d-edge" d="M 200 230 L 290 230"/>

  <path class="d-edge" d="M 298 120 L 342 120" marker-end="url(#b11q1-arrow)"/>

  <text class="d-text" x="395" y="34" text-anchor="middle">read ]</text>
  <text class="d-sub" x="395" y="56" text-anchor="middle">top is [ so pop</text>
  <rect class="d-box-accent" x="360" y="192" width="70" height="34" rx="6"/>
  <text class="d-text" x="395" y="214" text-anchor="middle">(</text>
  <path class="d-edge" d="M 350 230 L 440 230"/>

  <path class="d-edge" d="M 448 120 L 492 120" marker-end="url(#b11q1-arrow)"/>

  <text class="d-text" x="545" y="34" text-anchor="middle">read )</text>
  <text class="d-sub" x="545" y="56" text-anchor="middle">top is ( so pop</text>
  <rect class="d-box-muted" x="510" y="192" width="70" height="34" rx="6"/>
  <text class="d-sub" x="545" y="214" text-anchor="middle">empty</text>
  <path class="d-edge" d="M 500 230 L 590 230"/>
  <text class="d-text d-accent" x="545" y="256" text-anchor="middle">valid</text>
</svg>

The picture above traces \`([])\`: two pushes, two matching pops, and an empty stack at the end, so the answer is valid.

There are exactly three ways to fail, and a correct solution must catch all three:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="The three ways a bracket string fails: wrong kind on top, a stray closer with an empty stack, and openers left over at the end">
  <rect class="d-box-muted" x="20" y="20" width="200" height="180" rx="10"/>
  <text class="d-text" x="120" y="50" text-anchor="middle">([)]</text>
  <text class="d-sub" x="120" y="82" text-anchor="middle">after ( and [ the top is [</text>
  <text class="d-sub" x="120" y="106" text-anchor="middle">then ) arrives</text>
  <text class="d-sub" x="120" y="130" text-anchor="middle">[ is not the opener of )</text>
  <text class="d-text d-accent" x="120" y="170" text-anchor="middle">wrong kind on top</text>

  <rect class="d-box-muted" x="260" y="20" width="200" height="180" rx="10"/>
  <text class="d-text" x="360" y="50" text-anchor="middle">))((</text>
  <text class="d-sub" x="360" y="82" text-anchor="middle">the first ) arrives</text>
  <text class="d-sub" x="360" y="106" text-anchor="middle">the stack is empty</text>
  <text class="d-sub" x="360" y="130" text-anchor="middle">nothing to match it</text>
  <text class="d-text d-accent" x="360" y="170" text-anchor="middle">stray closer</text>

  <rect class="d-box-muted" x="500" y="20" width="200" height="180" rx="10"/>
  <text class="d-text" x="600" y="50" text-anchor="middle">((</text>
  <text class="d-sub" x="600" y="82" text-anchor="middle">push (, push (</text>
  <text class="d-sub" x="600" y="106" text-anchor="middle">the input ends</text>
  <text class="d-sub" x="600" y="130" text-anchor="middle">two openers remain</text>
  <text class="d-text d-accent" x="600" y="170" text-anchor="middle">never closed</text>
</svg>

From left to right: the wrong kind of opener is on top, a closer arrives when nothing is open, and openers are still waiting when the input ends.

📌 **Interview term: Early exit** — returning as soon as the answer is known. A wrong closer means invalid immediately; there is no need to read the rest. An odd length is also an instant "invalid", because brackets come in pairs.

## 4. Brute Force First, Then the Stack

**Brute force — delete pairs until nothing changes.** Repeatedly remove every \`()\`, \`[]\` and \`{}\` that sits side by side. If the string becomes empty it was valid. It is correct, but each pass scans the whole string and may only remove one pair, so in the worst case it does about n/2 passes of n characters each: O(n²) time, plus a new string every pass.

**A counter — only correct for one bracket type.** Add 1 for \`(\`, subtract 1 for \`)\`, fail if the count goes below zero, and require zero at the end. That is O(1) memory and perfect when the only bracket is \`()\`. With several types it breaks: separate counters for each type cannot see the *order*, so \`([)]\` looks fine to them. Example 2 runs both checks side by side to show this.

**The stack — one pass, O(n).** Every character is pushed at most once and popped at most once, so the work is linear.

## 5. The Java Solution, Line by Line

~~~java
static boolean isValid(String s) {
    if (s.length() % 2 == 1) return false;       // odd length can never pair up
    Deque<Character> stack = new ArrayDeque<>();  // preferred over java.util.Stack
    for (int i = 0; i < s.length(); i++) {
        char ch = s.charAt(i);
        if (ch == '(' || ch == '[' || ch == '{') {
            stack.push(ch);                       // opening bracket
        } else {
            if (stack.isEmpty()) return false;    // pop() would throw here
            char open = stack.pop();              // unboxed to a char
            if (open != opener(ch)) return false; // wrong kind
        }
    }
    return stack.isEmpty();                       // leftovers never closed
}

static char opener(char close) {
    switch (close) {
        case ')': return '(';
        case ']': return '[';
        default:  return '{';
    }
}
~~~

What each Java piece is doing:

- **\`Deque<Character> stack = new ArrayDeque<>()\`.** The [\`java.util.Stack\` documentation](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Stack.html) itself says the \`Deque\` interface and its implementations should be used in preference to \`Stack\`. \`Stack\` extends \`Vector\` and its \`pop\` and \`peek\` are \`synchronized\` (you can see this with \`javap java.util.Stack\`), which is locking you do not need in single-threaded code. \`ArrayDeque.push\` adds at the head and \`pop\` removes from the head, so the head is the top.
- **Boxing.** A \`Deque\` stores objects, so each \`char\` is boxed to a \`Character\` on \`push\`. Assigning \`char open = stack.pop()\` unboxes it again, and \`open != opener(ch)\` then compares two primitives, which is always correct.
- **Empty behaviour.** This is why the \`isEmpty()\` check sits before \`pop()\`:

~~~java
import java.util.*;
public class Main {
    public static void main(String[] args) {
        Deque<Character> stack = new ArrayDeque<>();
        System.out.println("peek() on empty = " + stack.peek());
        try { stack.pop(); } catch (NoSuchElementException e) { System.out.println("pop() on empty threw " + e.getClass().getSimpleName()); }
        try { stack.push(null); } catch (NullPointerException e) { System.out.println("push(null) threw " + e.getClass().getSimpleName()); }
        Integer a = 127, b = 127, c = 1000, d = 1000;
        System.out.println("127 == 127 -> " + (a == b));
        System.out.println("1000 == 1000 -> " + (c == d));
        System.out.println("1000 equals 1000 -> " + c.equals(d));
    }
}
~~~

~~~text
peek() on empty = null
pop() on empty threw NoSuchElementException
push(null) threw NullPointerException
127 == 127 -> true
1000 == 1000 -> false
1000 equals 1000 -> true
~~~

The last three lines are a preview of a trap covered in the pitfalls: \`==\` on boxed values compares object identity, and it only looks right for small values because \`Integer.valueOf\` caches -128 to 127 (its documentation guarantees that range).

- **\`return stack.isEmpty()\`.** Rejects leftover openers such as \`((\`.

📌 **Interview term: Autoboxing** — Java automatically wrapping a primitive (\`char\`, \`int\`) in its object type (\`Character\`, \`Integer\`) so it can go into a collection, and unwrapping it again when you assign it back to a primitive.

📌 **Interview term: Amortised O(1)** — an operation that is O(1) on average over many calls even though an occasional call is slower (here, when \`ArrayDeque\` grows its array). See [amortized analysis](/interview-question/what-is-amortized-analysis).

**Faster variant without boxing.** Because the stack can never hold more than \`s.length()\` characters, a \`char[] stack = new char[s.length()]\` plus an \`int top\` index does the same job with no objects at all. It is a good thing to mention if the interviewer asks about performance.

### Dry run on \`{[()()]}\`

| Read | Action | Stack after (bottom to top) |
| :--- | :--- | :--- |
| \`{\` | opener: push | \`{\` |
| \`[\` | opener: push | \`{[\` |
| \`(\` | opener: push | \`{[(\` |
| \`)\` | top is \`(\`, matches: pop | \`{[\` |
| \`(\` | opener: push | \`{[(\` |
| \`)\` | top is \`(\`, matches: pop | \`{[\` |
| \`]\` | top is \`[\`, matches: pop | \`{\` |
| \`}\` | top is \`{\`, matches: pop | empty |

The stack is empty at the end, so the string is valid. The deepest the stack ever got was 3, which is the nesting depth.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`javac Main.java && java Main\` (OpenJDK 21 (javac 21)). The same programs in the other three languages print exactly the same lines.

**Example 1 — Stack-based validator on normal and edge-case inputs** printed:

~~~text
valid("()") = true
valid("()[]{}") = true
valid("{[()()]}") = true
valid("(]") = false
valid("([)]") = false
valid("((") = false
valid("))((") = false
valid("(((") = false
valid("") = true
~~~

**Example 2 — Why one counter per bracket type is not enough** printed:

~~~text
(()()) -> counter: true, stack: true
([)] -> counter: true, stack: false
{[}] -> counter: true, stack: false
)( -> counter: false, stack: false
((]] -> counter: false, stack: false
[({})] -> counter: true, stack: true
~~~

In Example 2 the per-type counters accept \`([)]\` and \`{[}]\` because each type is balanced on its own; only the stack notices that a closer arrived while a different kind was on top.

## 7. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n) | Each character is looked at once; each push and pop is O(1) (amortised for the growable \`ArrayDeque\`) |
| Space | O(n) | In the worst case, such as \`((((\`, every character is an opener and sits on the stack |
| Counter version (one type only) | O(n) time, O(1) space | Only an integer is kept, but it cannot check order across types |
| Delete-pairs brute force | O(n²) time | Up to n/2 passes over the string |

For more on reading these costs, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty string** — the loop never runs and the stack is empty, so the code returns \`true\`. Confirm that is what the interviewer wants.
- **Odd length** — impossible to pair up; the code returns \`false\` before scanning.
- **Only closers** (\`))((\`) — the first \`)\` finds an empty stack: invalid immediately.
- **Only openers** (\`((\`) — the loop finishes with items on the stack: invalid.
- **Correct counts, wrong order** (\`([)]\`) — the type check on the top catches it.
- **Deep nesting** — the solution is a loop, not recursion, so a string nested a million levels deep cannot overflow the call stack.

## Common Pitfalls

- **Using \`java.util.Stack\`.** It works, but its own documentation recommends \`Deque\`, and it carries synchronisation and all of \`Vector\`'s index-based methods. Say why you chose \`ArrayDeque\`.
- **Calling \`pop()\` on an empty deque.** It throws \`NoSuchElementException\`, so \`")"\` crashes instead of returning \`false\`. Check \`isEmpty()\` first, or use \`peek()\`/\`poll()\`, which return \`null\`.
- **Comparing two \`Character\` objects with \`==\`.** \`stack.peek() == map.get(ch)\` compares references. It happens to work for bracket characters because \`Character.valueOf\` caches small values, but it is the same trap that breaks \`Integer\` comparisons for values above 127. Unbox to \`char\` first, as the code does.
- **\`return true\` at the end.** Accepts \`"(("\`; return \`stack.isEmpty()\`.
- **Using \`s.split("")\` or \`toCharArray()\` in a hot loop.** \`charAt(i)\` reads the character directly without building an array or strings.
- **A counter for several bracket types.** Example 2 shows \`([)]\` passing.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Brackets close in reverse order of opening, which is last in, first out, so I use a stack.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The loop:</strong> <span style="color:#f0e2c8;">Push openers; for a closer the stack must be non-empty and the popped opener must match, otherwise return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The ending:</strong> <span style="color:#f0e2c8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stack.isEmpty()</code> because leftover openers were never closed; odd length is an instant <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Java details:</strong> <span style="color:#f0e2c8;">I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deque&lt;Character&gt;</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code>, which the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Stack</code> docs themselves recommend; I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isEmpty()</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> because it throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoSuchElementException</code>, and I compare unboxed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char</code>s.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The cost:</strong> <span style="color:#f0e2c8;">O(n) time since each character is pushed and popped at most once, O(n) space; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char[]</code> stack removes the boxing if speed matters.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">java.util.Stack</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It extends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vector</code>, its methods are synchronised, and its documentation says to prefer <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deque</code> implementations such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the input has letters, like <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a(b)c</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Treat only the six bracket characters specially and skip everything else; the stack logic does not change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you avoid creating <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Character</code> objects?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char[] stack = new char[s.length()]</code> and an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int top</code>. Push is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stack[top++] = ch</code>, pop is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stack[--top]</code>, empty is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top == 0</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it in O(1) space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only with one bracket type, using an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> balance that must never go negative and must end at zero.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the error position?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push indices (a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deque&lt;Integer&gt;</code> or an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>) instead of characters; a bad closer reports its own index, leftovers report the oldest index still on the stack.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Stack (LIFO)** | Add and remove only at the top; the last item in is the first out |
| **Matching pair** | An opener and the closer of the same kind, such as \`(\` and \`)\` |
| **Early exit** | Return as soon as the answer is known (first mismatch, odd length) |
| **Amortised O(1)** | O(1) on average over many operations, even if one is occasionally slower |
| **Autoboxing** | Java wrapping a primitive like \`char\` in an object like \`Character\` for a collection |

---
**Conclusion:** Balanced brackets is a stack problem because the last bracket opened must be the first one closed. In Java the idiomatic stack is a \`Deque<Character>\` backed by \`ArrayDeque\`, which the \`Stack\` documentation itself recommends: push openers, check \`isEmpty()\` before \`pop()\` (which would throw \`NoSuchElementException\`), compare unboxed \`char\`s, and return \`stack.isEmpty()\`. It is O(n) time and O(n) space, and a \`char[]\` with an index removes boxing when speed matters.`,
        examples: [
          {
            label: "Stack-based validator on normal and edge-case inputs",
            code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    static boolean isValid(String s) {
        if (s.length() % 2 == 1) return false;       // odd length can never pair up
        Deque<Character> stack = new ArrayDeque<>();  // preferred over java.util.Stack
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (ch == '(' || ch == '[' || ch == '{') {
                stack.push(ch);                       // opening bracket
            } else {
                if (stack.isEmpty()) return false;    // pop() would throw here
                char open = stack.pop();              // unboxed to a char
                if (open != opener(ch)) return false; // wrong kind
            }
        }
        return stack.isEmpty();                       // leftovers never closed
    }

    static char opener(char close) {
        switch (close) {
            case ')': return '(';
            case ']': return '[';
            default:  return '{';
        }
    }

    static String show(String s) {
        return "valid(\\"" + s + "\\") = " + isValid(s);
    }

    public static void main(String[] args) {
        System.out.println(show("()"));        // valid("()") = true
        System.out.println(show("()[]{}"));    // valid("()[]{}") = true
        System.out.println(show("{[()()]}"));  // valid("{[()()]}") = true
        System.out.println(show("(]"));        // valid("(]") = false
        System.out.println(show("([)]"));      // valid("([)]") = false
        System.out.println(show("(("));        // valid("((") = false
        System.out.println(show("))(("));      // valid("))((") = false
        System.out.println(show("((("));       // valid("(((") = false
        System.out.println(show(""));          // valid("") = true
    }
}
`,
          },
          {
            label: "Why one counter per bracket type is not enough",
            code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    static int kind(char ch) {               // 0 = (), 1 = [], 2 = {}
        return "([{".indexOf(ch) >= 0 ? "([{".indexOf(ch) : ")]}".indexOf(ch);
    }

    static boolean counterCheck(String s) {
        // One counter per bracket type: never below zero, all zero at the end.
        int[] count = new int[3];
        for (char ch : s.toCharArray()) {
            if ("([{".indexOf(ch) >= 0) {
                count[kind(ch)]++;
            } else if (--count[kind(ch)] < 0) {
                return false;
            }
        }
        return count[0] == 0 && count[1] == 0 && count[2] == 0;
    }

    static boolean stackCheck(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char ch : s.toCharArray()) {
            if ("([{".indexOf(ch) >= 0) {
                stack.push(ch);
            } else if (stack.isEmpty() || kind(stack.pop()) != kind(ch)) {
                return false;
            }
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) {
        String[] inputs = {"(()())", "([)]", "{[}]", ")(", "((]]", "[({})]"};
        for (String s : inputs) {
            System.out.println(s + " -> counter: " + counterCheck(s) + ", stack: " + stackCheck(s));
        }
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a std::string containing only ( ) [ ] { }, write a C++ function bool isValid(const std::string& s) that returns true when every bracket is closed by the same kind in the correct order. What happens in your code if a closing bracket comes first?"

**What a strong answer should cover:**
- A stack, because the most recently opened bracket must close first (last in, first out).
- The three failures: a closer with an empty stack, a closer that does not match the top, and openers left at the end.
- O(n) time, O(n) space, early exits on odd length and the first mismatch.
- Why a counter cannot handle several bracket types.
- C++ specifics: \`std::stack<char>\` or a \`std::string\`/\`std::vector<char>\` used as a stack; \`top()\`/\`back()\` and \`pop()\`/\`pop_back()\` on an empty container are undefined behaviour, so \`empty()\` must be checked first; \`pop()\` returns \`void\`.

**Clarifying questions expected:**
- "Can the string contain characters other than brackets?"
- "Is the empty string valid?"

**Code / implementation expected:** Yes — a C++17 function using a \`std::string\` (or \`std::stack<char>\`) as the stack.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; no prior knowledge of stacks assumed.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this C++ version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Think of a stack of plates in a canteen. You can only put a plate on the top and only take the plate from the top. Now imagine every opening bracket is a plate with a colour written on it: \`(\` is red, \`[\` is blue, \`{\` is green. Each time you read an opening bracket you put its plate on the pile. Each time you read a closing bracket, you must take the top plate off, and it has to be the matching colour. If the top plate is the wrong colour, or there is no plate at all, the string is broken. If you reach the end and plates are still on the pile, something was opened and never closed.

That is the whole algorithm. It matters because the same idea checks code in every compiler and editor (the red squiggle when you forget a \`}\`), validates HTML and JSON nesting, and evaluates maths expressions. Interviewers like it as a warm-up because it quickly shows whether you reach for the right data structure and whether you handle the empty cases without crashing.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which bracket types appear: only \`()\`, or also \`[]\` and \`{}\`? | With one type a simple counter is enough; with several you need a stack (Example 2 shows why). |
| Can the string contain other characters, such as letters or digits? | If yes, the loop must skip them instead of treating them as closers. |
| What should an empty string return? | Most versions say valid (\`true\`); the code below does that, but confirm. |
| How long can the input be? | Tells you whether O(n) extra memory is fine (it almost always is). |
| Return only true/false, or the position of the first error? | An editor wants the index; the interview version usually wants a boolean. |

## 3. The Core Idea

Brackets must close in the **reverse order** they opened: the most recently opened bracket is the first one that may close. "Last in, first out" is exactly what a stack gives you.

📌 **Interview term: Stack (LIFO)** — a collection where you add (push) and remove (pop) only at one end, the top, so the last item in is the first item out. See [the difference between a stack and a queue](/interview-question/what-is-the-difference-between-a-stack-and-a-queue).

📌 **Interview term: Matching pair** — an opening bracket and the closing bracket of the same kind, such as \`(\` and \`)\`. A lookup table from each closer to its opener is the usual way to test this.

The algorithm, in four rules:

1. Read the string left to right.
2. Opening bracket: push it.
3. Closing bracket: if the stack is empty, or its top is not the matching opener, the string is **invalid**. Otherwise pop.
4. At the end the string is valid only if the stack is **empty**.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 270" role="img" aria-label="Scanning the string ([]) with a stack: push, push, pop on a match, pop on a match, stack ends empty so the string is valid">
  <defs>
    <marker id="b11q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="95" y="34" text-anchor="middle">read (</text>
  <text class="d-sub" x="95" y="56" text-anchor="middle">opener: push</text>
  <rect class="d-box-accent" x="60" y="192" width="70" height="34" rx="6"/>
  <text class="d-text" x="95" y="214" text-anchor="middle">(</text>
  <path class="d-edge" d="M 50 230 L 140 230"/>

  <path class="d-edge" d="M 148 120 L 192 120" marker-end="url(#b11q1-arrow)"/>

  <text class="d-text" x="245" y="34" text-anchor="middle">read [</text>
  <text class="d-sub" x="245" y="56" text-anchor="middle">opener: push</text>
  <rect class="d-box" x="210" y="192" width="70" height="34" rx="6"/>
  <text class="d-text" x="245" y="214" text-anchor="middle">(</text>
  <rect class="d-box-accent" x="210" y="150" width="70" height="34" rx="6"/>
  <text class="d-text" x="245" y="172" text-anchor="middle">[</text>
  <path class="d-edge" d="M 200 230 L 290 230"/>

  <path class="d-edge" d="M 298 120 L 342 120" marker-end="url(#b11q1-arrow)"/>

  <text class="d-text" x="395" y="34" text-anchor="middle">read ]</text>
  <text class="d-sub" x="395" y="56" text-anchor="middle">top is [ so pop</text>
  <rect class="d-box-accent" x="360" y="192" width="70" height="34" rx="6"/>
  <text class="d-text" x="395" y="214" text-anchor="middle">(</text>
  <path class="d-edge" d="M 350 230 L 440 230"/>

  <path class="d-edge" d="M 448 120 L 492 120" marker-end="url(#b11q1-arrow)"/>

  <text class="d-text" x="545" y="34" text-anchor="middle">read )</text>
  <text class="d-sub" x="545" y="56" text-anchor="middle">top is ( so pop</text>
  <rect class="d-box-muted" x="510" y="192" width="70" height="34" rx="6"/>
  <text class="d-sub" x="545" y="214" text-anchor="middle">empty</text>
  <path class="d-edge" d="M 500 230 L 590 230"/>
  <text class="d-text d-accent" x="545" y="256" text-anchor="middle">valid</text>
</svg>

The picture above traces \`([])\`: two pushes, two matching pops, and an empty stack at the end, so the answer is valid.

There are exactly three ways to fail, and a correct solution must catch all three:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="The three ways a bracket string fails: wrong kind on top, a stray closer with an empty stack, and openers left over at the end">
  <rect class="d-box-muted" x="20" y="20" width="200" height="180" rx="10"/>
  <text class="d-text" x="120" y="50" text-anchor="middle">([)]</text>
  <text class="d-sub" x="120" y="82" text-anchor="middle">after ( and [ the top is [</text>
  <text class="d-sub" x="120" y="106" text-anchor="middle">then ) arrives</text>
  <text class="d-sub" x="120" y="130" text-anchor="middle">[ is not the opener of )</text>
  <text class="d-text d-accent" x="120" y="170" text-anchor="middle">wrong kind on top</text>

  <rect class="d-box-muted" x="260" y="20" width="200" height="180" rx="10"/>
  <text class="d-text" x="360" y="50" text-anchor="middle">))((</text>
  <text class="d-sub" x="360" y="82" text-anchor="middle">the first ) arrives</text>
  <text class="d-sub" x="360" y="106" text-anchor="middle">the stack is empty</text>
  <text class="d-sub" x="360" y="130" text-anchor="middle">nothing to match it</text>
  <text class="d-text d-accent" x="360" y="170" text-anchor="middle">stray closer</text>

  <rect class="d-box-muted" x="500" y="20" width="200" height="180" rx="10"/>
  <text class="d-text" x="600" y="50" text-anchor="middle">((</text>
  <text class="d-sub" x="600" y="82" text-anchor="middle">push (, push (</text>
  <text class="d-sub" x="600" y="106" text-anchor="middle">the input ends</text>
  <text class="d-sub" x="600" y="130" text-anchor="middle">two openers remain</text>
  <text class="d-text d-accent" x="600" y="170" text-anchor="middle">never closed</text>
</svg>

From left to right: the wrong kind of opener is on top, a closer arrives when nothing is open, and openers are still waiting when the input ends.

📌 **Interview term: Early exit** — returning as soon as the answer is known. A wrong closer means invalid immediately; there is no need to read the rest. An odd length is also an instant "invalid", because brackets come in pairs.

## 4. Brute Force First, Then the Stack

**Brute force — delete pairs until nothing changes.** Repeatedly remove every \`()\`, \`[]\` and \`{}\` that sits side by side. If the string becomes empty it was valid. It is correct, but each pass scans the whole string and may only remove one pair, so in the worst case it does about n/2 passes of n characters each: O(n²) time, plus a new string every pass.

**A counter — only correct for one bracket type.** Add 1 for \`(\`, subtract 1 for \`)\`, fail if the count goes below zero, and require zero at the end. That is O(1) memory and perfect when the only bracket is \`()\`. With several types it breaks: separate counters for each type cannot see the *order*, so \`([)]\` looks fine to them. Example 2 runs both checks side by side to show this.

**The stack — one pass, O(n).** Every character is pushed at most once and popped at most once, so the work is linear.

## 5. The C++ Solution, Line by Line

~~~cpp
bool isValid(const std::string& s) {
    if (s.size() % 2 == 1) return false;     // odd length can never pair up
    std::string stack;                       // a string works as a char stack
    for (char ch : s) {
        if (ch == '(' || ch == '[' || ch == '{') {
            stack.push_back(ch);             // opening bracket
        } else {
            if (stack.empty()) return false; // back() on empty is undefined
            char open = stack.back();
            stack.pop_back();
            if ((ch == ')' && open != '(') ||
                (ch == ']' && open != '[') ||
                (ch == '}' && open != '{')) return false;  // wrong kind
        }
    }
    return stack.empty();                    // leftovers never closed
}
~~~

What each C++ piece is doing:

- **\`std::string stack\` with \`push_back\`, \`back\`, \`pop_back\`.** A \`std::string\` is a contiguous array of \`char\`, so it makes a perfectly good character stack: \`push_back\` pushes, \`back()\` reads the top, \`pop_back()\` removes it. \`std::vector<char>\` works the same way.
- **\`std::stack<char>\` is the textbook alternative.** It is a container *adapter*: in the libstdc++ header the declaration is \`template<typename _Tp, typename _Sequence = deque<_Tp> > class stack\`, so by default it wraps a \`std::deque\`. It exposes only \`push\`, \`top\`, \`pop\`, \`empty\` and \`size\`, which documents intent nicely. Note that \`pop()\` returns \`void\`; you read \`top()\` first and then call \`pop()\`:

~~~cpp
#include <stack>
int main() {
    std::stack<int> st;
    st.push(1);
    int x = st.pop();
    return x;
}
~~~

Compiling that file with \`g++ -std=c++17 pop.cpp\` fails with:

~~~text
pop.cpp:5:19: error: void value not ignored as it ought to be
~~~

- **\`if (stack.empty()) return false;\` before \`back()\`.** Calling \`back()\`, \`top()\` or \`pop()\` on an empty container is undefined behaviour: the standard library does no check for you, so the program may crash, return garbage or appear to work. This check is the line that makes a leading \`)\` safe.
- **\`const std::string& s\`.** Passing by const reference avoids copying the input.
- **\`return stack.empty()\`.** Rejects leftover openers such as \`((\`.

📌 **Interview term: Undefined behaviour (UB)** — code the C++ standard places no requirements on, such as reading \`back()\` of an empty container. The compiler is allowed to assume it never happens, so the result is unpredictable rather than a clean error.

📌 **Interview term: Container adapter** — a class like \`std::stack\` or \`std::queue\` that wraps another container (by default \`std::deque\`) and exposes only a restricted interface.

📌 **Interview term: Amortised O(1)** — O(1) on average over many calls even if one call is slower (here, when the string or vector grows its buffer). See [amortized analysis](/interview-question/what-is-amortized-analysis).

### Dry run on \`{[()()]}\`

| Read | Action | Stack after (bottom to top) |
| :--- | :--- | :--- |
| \`{\` | opener: push | \`{\` |
| \`[\` | opener: push | \`{[\` |
| \`(\` | opener: push | \`{[(\` |
| \`)\` | top is \`(\`, matches: pop | \`{[\` |
| \`(\` | opener: push | \`{[(\` |
| \`)\` | top is \`(\`, matches: pop | \`{[\` |
| \`]\` | top is \`[\`, matches: pop | \`{\` |
| \`}\` | top is \`{\`, matches: pop | empty |

The stack is empty at the end, so the string is valid. The deepest the stack ever got was 3, which is the nesting depth.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3 with -std=c++17). The same programs in the other three languages print exactly the same lines.

**Example 1 — Stack-based validator on normal and edge-case inputs** printed:

~~~text
valid("()") = true
valid("()[]{}") = true
valid("{[()()]}") = true
valid("(]") = false
valid("([)]") = false
valid("((") = false
valid("))((") = false
valid("(((") = false
valid("") = true
~~~

**Example 2 — Why one counter per bracket type is not enough** printed:

~~~text
(()()) -> counter: true, stack: true
([)] -> counter: true, stack: false
{[}] -> counter: true, stack: false
)( -> counter: false, stack: false
((]] -> counter: false, stack: false
[({})] -> counter: true, stack: true
~~~

In Example 2 the per-type counters accept \`([)]\` and \`{[}]\` because each type is balanced on its own; only the stack notices that a closer arrived while a different kind was on top.

## 7. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n) | Each character is looked at once; each push and pop is O(1) (amortised for the growable string) |
| Space | O(n) | In the worst case, such as \`((((\`, every character is an opener and sits on the stack |
| Counter version (one type only) | O(n) time, O(1) space | Only an integer is kept, but it cannot check order across types |
| Delete-pairs brute force | O(n²) time | Up to n/2 passes over the string |

For more on reading these costs, see [Big-O notation](/interview-question/what-is-big-o-notation).

## 8. Edge Cases

- **Empty string** — the loop never runs and the stack is empty, so the code returns \`true\`. Confirm that is what the interviewer wants.
- **Odd length** — impossible to pair up; the code returns \`false\` before scanning.
- **Only closers** (\`))((\`) — the first \`)\` finds an empty stack: invalid immediately.
- **Only openers** (\`((\`) — the loop finishes with items on the stack: invalid.
- **Correct counts, wrong order** (\`([)]\`) — the type check on the top catches it.
- **Deep nesting** — the solution is a loop, not recursion, so a string nested a million levels deep cannot overflow the call stack.

## Common Pitfalls

- **Calling \`top()\`/\`back()\` or \`pop()\` on an empty stack.** It is undefined behaviour, not an exception. Without the \`empty()\` check, \`")"\` may crash or silently read garbage.
- **Expecting \`pop()\` to return the value.** \`std::stack::pop()\` and \`pop_back()\` return \`void\`; \`int x = st.pop();\` does not compile. Read \`top()\` first.
- **Returning \`true\` at the end.** Accepts \`"(("\`; return \`stack.empty()\`.
- **Taking the string by value.** \`bool isValid(std::string s)\` copies the whole input on every call; use \`const std::string&\` (or \`std::string_view\`).
- **A counter for several bracket types.** Example 2 shows \`([)]\` passing.
- **\`s.size() - 1\` style arithmetic on an empty string.** \`size()\` is unsigned, so \`s.size() - 1\` wraps to a huge number when the string is empty. The range-for loop above avoids index arithmetic entirely.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Brackets close in reverse order of opening, which is last in, first out, so I use a stack.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The loop:</strong> <span style="color:#f0e2c8;">Push openers; for a closer the stack must be non-empty and its top must match, otherwise return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>; then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_back()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The ending:</strong> <span style="color:#f0e2c8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stack.empty()</code> because leftover openers were never closed; an odd length is an instant <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. C++ details:</strong> <span style="color:#f0e2c8;">I use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::string</code> (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack&lt;char&gt;</code>) as the stack, check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">empty()</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">back()</code> because reading an empty container is undefined behaviour, and remember <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The cost:</strong> <span style="color:#f0e2c8;">O(n) time since each character is pushed and popped once at most, O(n) space for the all-openers case.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::string</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::stack&lt;char&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both are fine. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack</code> documents intent and restricts the interface; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::string</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;char&gt;</code> is contiguous, can <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reserve</code>, and is easy to print while debugging.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">top()</code> on an empty <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::stack</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Undefined behaviour. There is no exception; you must check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">empty()</code> yourself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the input contains letters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Handle the six bracket characters and skip everything else; the stack logic is unchanged.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it in O(1) extra space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only with one bracket type: an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> balance that never goes below zero and ends at zero.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the position of the first error?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Push indices (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt;</code>) instead of characters; a bad closer reports its own index and leftovers report the oldest index still on the stack.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Stack (LIFO)** | Add and remove only at the top; the last item in is the first out |
| **Matching pair** | An opener and the closer of the same kind, such as \`(\` and \`)\` |
| **Early exit** | Return as soon as the answer is known (first mismatch, odd length) |
| **Amortised O(1)** | O(1) on average over many operations, even if one is occasionally slower |
| **Undefined behaviour (UB)** | Code the standard gives no meaning to, such as \`back()\` on an empty container |
| **Container adapter** | A wrapper such as \`std::stack\` that exposes a restricted interface over another container |

---
**Conclusion:** Balanced brackets is a stack problem because the last bracket opened must be the first one closed. In C++ a \`std::string\` or \`std::stack<char>\` is the stack: push openers, check \`empty()\` before \`back()\` or \`top()\` because reading an empty container is undefined behaviour, read before popping because \`pop()\` returns \`void\`, and return \`stack.empty()\`. It is O(n) time and O(n) space and catches the wrong kind, the stray closer and the leftovers.`,
        examples: [
          {
            label: "Stack-based validator on normal and edge-case inputs",
            code: `#include <iostream>
#include <string>

bool isValid(const std::string& s) {
    if (s.size() % 2 == 1) return false;     // odd length can never pair up
    std::string stack;                       // a string works as a char stack
    for (char ch : s) {
        if (ch == '(' || ch == '[' || ch == '{') {
            stack.push_back(ch);             // opening bracket
        } else {
            if (stack.empty()) return false; // back() on empty is undefined
            char open = stack.back();
            stack.pop_back();
            if ((ch == ')' && open != '(') ||
                (ch == ']' && open != '[') ||
                (ch == '}' && open != '{')) return false;  // wrong kind
        }
    }
    return stack.empty();                    // leftovers never closed
}

std::string show(const std::string& s) {
    return "valid(\\"" + s + "\\") = " + (isValid(s) ? "true" : "false");
}

int main() {
    std::cout << show("()") << "\\n";        // valid("()") = true
    std::cout << show("()[]{}") << "\\n";    // valid("()[]{}") = true
    std::cout << show("{[()()]}") << "\\n";  // valid("{[()()]}") = true
    std::cout << show("(]") << "\\n";        // valid("(]") = false
    std::cout << show("([)]") << "\\n";      // valid("([)]") = false
    std::cout << show("((") << "\\n";        // valid("((") = false
    std::cout << show("))((") << "\\n";      // valid("))((") = false
    std::cout << show("(((") << "\\n";       // valid("(((") = false
    std::cout << show("") << "\\n";          // valid("") = true
}
`,
          },
          {
            label: "Why one counter per bracket type is not enough",
            code: `#include <iostream>
#include <string>
#include <vector>

int kind(char ch) {                          // 0 = (), 1 = [], 2 = {}
    std::string open = "([{", close = ")]}";
    auto p = open.find(ch);
    return p != std::string::npos ? (int)p : (int)close.find(ch);
}
bool isOpen(char ch) { return ch == '(' || ch == '[' || ch == '{'; }

bool counterCheck(const std::string& s) {
    // One counter per bracket type: never below zero, all zero at the end.
    int count[3] = {0, 0, 0};
    for (char ch : s) {
        if (isOpen(ch)) count[kind(ch)]++;
        else if (--count[kind(ch)] < 0) return false;
    }
    return count[0] == 0 && count[1] == 0 && count[2] == 0;
}

bool stackCheck(const std::string& s) {
    std::vector<char> stack;
    for (char ch : s) {
        if (isOpen(ch)) {
            stack.push_back(ch);
        } else {
            if (stack.empty() || kind(stack.back()) != kind(ch)) return false;
            stack.pop_back();
        }
    }
    return stack.empty();
}

int main() {
    std::cout << std::boolalpha;
    for (std::string s : {"(()())", "([)]", "{[}]", ")(", "((]]", "[({})]"}) {
        std::cout << s << " -> counter: " << counterCheck(s)
                  << ", stack: " << stackCheck(s) << "\\n";
    }
}
`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you implement a queue using two stacks?",
    difficulty: "medium",
    seoDescription: "Build a FIFO queue from two stacks in Python, JavaScript, Java and C++, and see why lazy transfer makes every operation amortised O(1).",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Implement a first-in, first-out queue in Python using only two stacks. Support push, pop, peek and empty, and tell me the time complexity of each operation."

**What a strong answer should cover:**
- An inbox stack for pushes and an outbox stack for pops and peeks; pour inbox into outbox only when the outbox is empty.
- Why pouring reverses the order so the oldest element is on top, and the invariant that pouring into a non-empty outbox would break.
- Amortised O(1) per operation (each element moves at most once), worst case O(n) for a single pop.
- The naive design that pours back after every pop is O(n) per pop.
- Python specifics: lists as stacks with \`append\`/\`pop\`; in real code \`collections.deque\` is the queue to use, because \`list.pop(0)\` is O(n).

**Clarifying questions expected:**
- "What should pop do on an empty queue: raise or return a sentinel?"
- "Is amortised O(1) acceptable, or do you need a worst-case bound per call?"

**Code / implementation expected:** Yes — a small Python class with two lists.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a stack is.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Python version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

A bakery has a tall, narrow tray rack that only opens at the top. Fresh trays go in on top, and if you take a tray out, you get the newest one. That is a stack. But customers should get the *oldest* bread first, which is how a queue works.

The baker's trick: keep a second rack. When the counter needs bread and the second rack is empty, move every tray from the first rack into the second, one at a time. The newest tray, which was on top, goes in first and ends up at the bottom; the oldest tray ends up on top. Now the second rack hands out bread oldest first. New trays keep going into the first rack, and the baker only moves trays across again once the second rack is empty.

Interviewers ask this because it tests three things in one small class: whether you really understand LIFO versus FIFO, whether you can keep an invariant (never pour into a non-empty outbox), and whether you can explain **amortised** cost, which is why one slow operation does not make the whole structure slow.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which operations: \`push\`, \`pop\`, \`peek\`, \`empty\`, \`size\`? | The LeetCode version (232) wants the first four; \`size\` is just the sum of both stacks. |
| May I use only standard stack operations (push to top, pop from top, peek, size, empty)? | That is the usual rule; it forbids just indexing into the bottom of an array. |
| What should \`pop\` or \`peek\` do on an empty queue? | Throw, return a sentinel, or assume it never happens; decide before coding. |
| Is amortised O(1) per operation good enough, or must every single call be O(1)? | The two-stack queue gives amortised O(1); one pop can still cost O(n). |
| Will it be used from several threads? | If yes it needs locking; the interview version is single-threaded. |

## 3. The Core Idea

📌 **Interview term: Queue (FIFO)** — first in, first out: items leave in the order they arrived. A **stack** is LIFO, last in, first out. See [stack vs queue](/interview-question/what-is-the-difference-between-a-stack-and-a-queue).

Reversing a sequence twice gives back the original order. Pushing items onto one stack stores them newest-on-top; pouring them into a second stack reverses them, so the oldest is now on top. That is exactly the front of the queue.

- **inbox**: every \`push\` goes here. O(1).
- **outbox**: every \`pop\` and \`peek\` reads from here. If it is empty, first pour the whole inbox into it.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Queue built from two stacks. Push goes on top of the inbox. When the outbox is empty, the whole inbox is poured into it, which reverses the order so the oldest item ends on top of the outbox">
  <defs>
    <marker id="b11q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="150" y="40" text-anchor="middle">push lands on top</text>
  <rect class="d-box-accent" x="105" y="126" width="90" height="34" rx="6"/>
  <text class="d-text" x="150" y="148" text-anchor="middle">3</text>
  <rect class="d-box" x="105" y="168" width="90" height="34" rx="6"/>
  <text class="d-text" x="150" y="190" text-anchor="middle">2</text>
  <rect class="d-box" x="105" y="210" width="90" height="34" rx="6"/>
  <text class="d-text" x="150" y="232" text-anchor="middle">1</text>
  <path class="d-edge" d="M 95 250 L 205 250"/>
  <text class="d-text" x="150" y="278" text-anchor="middle">inbox</text>
  <path class="d-edge" d="M 150 52 L 150 116" marker-end="url(#b11q2-arrow)"/>

  <path class="d-edge-accent" d="M 225 186 L 455 186" marker-end="url(#b11q2-arrow)"/>
  <text class="d-sub" x="340" y="164" text-anchor="middle">pour everything across,</text>
  <text class="d-sub" x="340" y="214" text-anchor="middle">but only when the outbox is empty</text>

  <text class="d-sub" x="530" y="40" text-anchor="middle">pop and peek read the top</text>
  <rect class="d-box-accent" x="485" y="126" width="90" height="34" rx="6"/>
  <text class="d-text" x="530" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="485" y="168" width="90" height="34" rx="6"/>
  <text class="d-text" x="530" y="190" text-anchor="middle">2</text>
  <rect class="d-box" x="485" y="210" width="90" height="34" rx="6"/>
  <text class="d-text" x="530" y="232" text-anchor="middle">3</text>
  <path class="d-edge" d="M 475 250 L 585 250"/>
  <text class="d-text" x="530" y="278" text-anchor="middle">outbox</text>
  <path class="d-edge" d="M 530 116 L 530 52" marker-end="url(#b11q2-arrow)"/>
</svg>

After pushing 1, 2 and 3, the inbox holds 3 on top. Pouring moves 3, then 2, then 1, so 1 (the oldest) ends up on top of the outbox, ready to be popped first.

📌 **Interview term: Invariant** — a fact that is true after every operation. Here: *every item in the outbox is older than every item in the inbox, and the outbox top is the oldest item of all.* Pouring only into an **empty** outbox is what keeps it true. If the outbox still held 2 and you poured a newer 3 on top of it, 3 would come out before 2 and the queue would be wrong.

📌 **Interview term: Lazy transfer** — moving items only when they are needed (when the outbox is empty), rather than after every operation. This is what makes the structure fast.

## 4. Why It Is O(1) on Average: Amortised Analysis

One \`pop\` can be slow: if 1,000 items sit in the inbox and the outbox is empty, that pop moves all 1,000. So the worst case for a *single* call is O(n). But follow one element through its whole life:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 150" role="img" aria-label="The life of one element: push to inbox, pop from inbox, push to outbox, pop from outbox. Four stack operations in total">
  <defs>
    <marker id="b11q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="90" y="68" text-anchor="middle">1. push</text>
  <text class="d-sub" x="90" y="92" text-anchor="middle">onto the inbox</text>
  <path class="d-edge" d="M 164 75 L 196 75" marker-end="url(#b11q2-arrow2)"/>
  <rect class="d-box-muted" x="200" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="270" y="68" text-anchor="middle">2. pop</text>
  <text class="d-sub" x="270" y="92" text-anchor="middle">off the inbox</text>
  <path class="d-edge" d="M 344 75 L 376 75" marker-end="url(#b11q2-arrow2)"/>
  <rect class="d-box-muted" x="380" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="450" y="68" text-anchor="middle">3. push</text>
  <text class="d-sub" x="450" y="92" text-anchor="middle">onto the outbox</text>
  <path class="d-edge" d="M 524 75 L 556 75" marker-end="url(#b11q2-arrow2)"/>
  <rect class="d-box-accent" x="560" y="40" width="140" height="70" rx="10"/>
  <text class="d-text d-accent" x="630" y="68" text-anchor="middle">4. pop</text>
  <text class="d-sub" x="630" y="92" text-anchor="middle">off the outbox</text>
</svg>

Each element is pushed onto the inbox once, popped off it once, pushed onto the outbox once and popped off it once: four stack operations, ever, no matter how the calls are interleaved. Over n queue operations the total work is at most about 4n, so the average per operation is O(1).

📌 **Interview term: Amortised O(1)** — the average cost per operation over any sequence of operations is constant, even though an individual operation may cost more. See [amortized analysis](/interview-question/what-is-amortized-analysis).

📌 **Interview term: Aggregate method** — one way to prove an amortised bound: add up the total cost of any n operations and divide by n. The "four moves per element" count above is an aggregate argument.

**The naive alternative.** Keep everything in one stack and, on every dequeue, pour it all into a helper stack, pop, and pour it all back. Every pop then touches every element twice, which is O(n) per pop and O(n²) for n pops. Example 2 counts the moves for both designs: with 1,000 items the lazy two-stack queue moved 1,000 elements in total, while the naive version moved 1,000,000. It also shows the honest downside: the single worst pop in the lazy design moved all 1,000.

## 5. The Python Implementation

~~~python
class MyQueue:
    def __init__(self):
        self.inbox = []    # new items land here (top = newest)
        self.outbox = []   # items wait here in reversed order (top = oldest)

    def push(self, x):
        self.inbox.append(x)

    def _shift(self):
        # Refill the outbox only when it is empty: this keeps FIFO order.
        if not self.outbox:
            while self.inbox:
                self.outbox.append(self.inbox.pop())

    def pop(self):
        self._shift()
        return self.outbox.pop()

    def peek(self):
        self._shift()
        return self.outbox[-1]

    def empty(self):
        return not self.inbox and not self.outbox

    def state(self):
        return "in=" + fmt(self.inbox) + " out=" + fmt(self.outbox)
~~~

The Python details that matter:

- **Two lists as stacks.** \`append\` pushes onto the end and \`pop()\` removes from the end; the [Python wiki TimeComplexity page](https://wiki.python.org/moin/TimeComplexity) lists both as O(1) (append is amortised). The end of the list is the top.
- **\`_shift\` is the lazy pour.** The guard \`if not self.outbox\` is the whole correctness argument: pour only when the outbox is empty.
- **\`self.outbox[-1]\` for \`peek\`.** Reads the top without removing it.
- **Empty queue.** With both lists empty, \`self.outbox.pop()\` raises \`IndexError: pop from empty list\`. That is a reasonable "queue is empty" signal in Python; if the interviewer prefers, check \`self.empty()\` first and raise your own \`IndexError("pop from empty queue")\`.
- **A one-line pour.** \`self.outbox = self.inbox[::-1]; self.inbox = []\` does the same reversal with a slice. It is still O(k) for k items; just make sure you only do it when the outbox is empty.

**What you would use in production.** Python already ships a queue: \`collections.deque\` has \`append\` and \`popleft\`, both O(1) according to the [collections docs](https://docs.python.org/3/library/collections.html#collections.deque). Using a plain list as a queue with \`list.pop(0)\` is the thing to avoid, because removing the first element shifts every other element (O(n) on the TimeComplexity page). The two-stack queue is an interview exercise in reasoning, and it is also the classic way to build a queue in purely functional languages, where stacks (linked lists) are the cheap structure.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`python3 main.py\` (Python 3.13). The same programs in the other three languages print exactly the same lines.

**Example 1 — Two-stack queue: trace every operation** printed:

~~~text
push(1) -> in=[1] out=[]
push(2) -> in=[1, 2] out=[]
peek() = 1 -> in=[] out=[2, 1]
pop() = 1 -> in=[] out=[2]
push(3) -> in=[3] out=[2]
pop() = 2 -> in=[3] out=[]
pop() = 3 -> in=[] out=[]
empty() = true
~~~

**Example 2 — Counting element moves: lazy two-stack vs naive pour-back** printed:

~~~text
n=10: two-stack moves=10 (worst single pop 10), naive moves=100
n=100: two-stack moves=100 (worst single pop 100), naive moves=10000
n=1000: two-stack moves=1000 (worst single pop 1000), naive moves=1000000
~~~

In Example 1, \`peek()\` triggers the only pour of 1 and 2 (the outbox becomes \`[2, 1]\`, top on the right), and \`push(3)\` waits in the inbox until 2 has left. In Example 2 the two-stack queue moved exactly n elements in total for n items, while the naive design moved exactly n²; the worst single pop of the two-stack queue still moved all n.

## 7. Complexity

| Operation | Cost | Why |
| :--- | :--- | :--- |
| \`push\` | O(1) | One push onto the inbox (amortised, because the underlying array may grow) |
| \`pop\` / \`peek\` | amortised O(1), worst case O(n) | A pour happens only when the outbox is empty, and each element is poured at most once |
| \`empty\` / \`size\` | O(1) | Check or add the two sizes |
| Space | O(n) | Every element lives in exactly one of the two stacks |
| Naive "pour back every time" | O(n) per pop | Every pop moves every element twice |

## 8. Edge Cases

- **Pop or peek on an empty queue** — both stacks are empty, so there is nothing to pour. Decide the behaviour (throw or sentinel) and say it out loud.
- **Interleaved pushes and pops** — a push while the outbox is non-empty must go to the inbox and wait; the trace in Example 1 shows \`push(3)\` arriving while \`2\` is still in the outbox, and \`2\` correctly leaving first.
- **Peek then pop** — \`peek\` may trigger the pour; the following \`pop\` then finds the outbox already filled and does no extra work.
- **Many pushes, then many pops** — the first pop pours everything (the O(n) call); every later pop is O(1).
- **Alternating push, pop, push, pop** — each pop pours exactly one element, still O(1).

## Common Pitfalls

- **Pouring when the outbox is not empty.** Moving the inbox on top of existing outbox items puts newer items above older ones; the queue then returns items out of order.
- **Pouring back after every pop.** Correct but O(n) per pop; Example 2 measured 1,000,000 moves for 1,000 items.
- **Forgetting that \`peek\` must also pour.** If \`peek\` reads \`self.outbox[-1]\` without calling \`_shift\`, it raises \`IndexError\` whenever the outbox happens to be empty even though the inbox has items.
- **\`empty()\` checking only one stack.** The queue is empty only when *both* lists are empty.
- **Using \`list.pop(0)\` instead.** It looks like a queue but costs O(n) per call; in real code reach for \`collections.deque\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Two stacks: push onto an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inbox</code>; pop and peek from an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code>; when the outbox is empty, pour the whole inbox into it, which reverses the order so the oldest item is on top.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The invariant:</strong> <span style="color:#f0e2c8;">Only pour into an empty outbox; then every outbox item is older than every inbox item, so FIFO order holds.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">Push is O(1). Pop and peek are amortised O(1): each element is pushed and popped at most twice in its life, so n operations do at most about 4n stack steps, though one pop can be O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Python details:</strong> <span style="color:#f0e2c8;">Two lists with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-1]</code>; an empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IndexError</code>, which I either let through or replace with my own message.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The real-world note:</strong> <span style="color:#f0e2c8;">In production Python I would just use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popleft</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.pop(0)</code> is O(n).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you make every single operation O(1) in the worst case?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with this lazy scheme; one pop can pour n items. There are worst-case O(1) constructions that move a few items on every operation, but they are much more complex, and in practice you would use a deque.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not pour back into the inbox after each pop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because then every pop moves every element twice: O(n) per pop and O(n squared) overall, which Example 2 measured as 1,000,000 moves for 1,000 items.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">size()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len(self.inbox) + len(self.outbox)</code>; both are O(1) in Python.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do the opposite, a stack using queues?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. With one queue, after pushing x rotate the queue by popping from the front and re-appending size minus one times, so x is at the front. That makes push O(n) and pop O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where is this used for real?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In functional languages a queue is often two immutable linked lists used exactly like this, because a linked list is a cheap stack. It also shows up as an amortised-analysis teaching example.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Queue (FIFO)** | First in, first out: items leave in arrival order |
| **Invariant** | A fact that stays true after every operation (outbox items are older than inbox items) |
| **Lazy transfer** | Pour the inbox into the outbox only when the outbox is empty |
| **Amortised O(1)** | Constant average cost per operation over any sequence, even if one call is slow |
| **Aggregate method** | Prove an amortised bound by totalling the cost of n operations and dividing by n |

---
**Conclusion:** A queue from two stacks works because reversing twice restores the original order: push onto an inbox, and when the outbox is empty pour the whole inbox into it so the oldest item is on top. Pouring only into an empty outbox keeps FIFO order, and because each element is moved across at most once, every operation is amortised O(1) even though one pop can be O(n). The runs above show 1,000 total moves for 1,000 items versus 1,000,000 for the naive design. In Python, two lists make the stacks; in production code \`collections.deque\` is the real queue.`,
        examples: [
          {
            label: "Two-stack queue: trace every operation",
            code: `class MyQueue:
    def __init__(self):
        self.inbox = []    # new items land here (top = newest)
        self.outbox = []   # items wait here in reversed order (top = oldest)

    def push(self, x):
        self.inbox.append(x)

    def _shift(self):
        # Refill the outbox only when it is empty: this keeps FIFO order.
        if not self.outbox:
            while self.inbox:
                self.outbox.append(self.inbox.pop())

    def pop(self):
        self._shift()
        return self.outbox.pop()

    def peek(self):
        self._shift()
        return self.outbox[-1]

    def empty(self):
        return not self.inbox and not self.outbox

    def state(self):
        return "in=" + fmt(self.inbox) + " out=" + fmt(self.outbox)


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


q = MyQueue()
q.push(1); print("push(1) -> " + q.state())
q.push(2); print("push(2) -> " + q.state())
v = q.peek(); print("peek() = " + str(v) + " -> " + q.state())
v = q.pop(); print("pop() = " + str(v) + " -> " + q.state())
q.push(3); print("push(3) -> " + q.state())
v = q.pop(); print("pop() = " + str(v) + " -> " + q.state())
v = q.pop(); print("pop() = " + str(v) + " -> " + q.state())
print("empty() = " + str(q.empty()).lower())
`,
          },
          {
            label: "Counting element moves: lazy two-stack vs naive pour-back",
            code: `# Count how many times an element is moved between the two stacks.

def lazy_moves(n):
    # Two-stack queue: refill the outbox only when it is empty.
    inbox, outbox = [], []
    moves = worst = 0
    for i in range(n):
        inbox.append(i)
    for _ in range(n):
        moved = 0
        if not outbox:
            while inbox:
                outbox.append(inbox.pop())
                moved += 1
        outbox.pop()
        moves += moved
        worst = max(worst, moved)
    return moves, worst


def naive_moves(n):
    # Keep everything in one stack; to dequeue, pour it all out and back.
    main, temp = [], []
    moves = 0
    for i in range(n):
        main.append(i)
    for _ in range(n):
        while main:
            temp.append(main.pop())
            moves += 1
        temp.pop()                  # the oldest element is now on top
        while temp:
            main.append(temp.pop())
            moves += 1
    return moves


for n in [10, 100, 1000]:
    m, w = lazy_moves(n)
    print("n=" + str(n) + ": two-stack moves=" + str(m) + " (worst single pop " + str(w)
          + "), naive moves=" + str(naive_moves(n)))
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Implement a FIFO queue in JavaScript using only two stacks, with push, pop, peek and empty. Then tell me why you would not just use an array with shift."

**What a strong answer should cover:**
- An inbox for pushes and an outbox for pops and peeks; pour the inbox into the outbox only when the outbox is empty.
- Why pouring reverses order, and why pouring into a non-empty outbox breaks FIFO.
- Amortised O(1) per operation, worst case O(n) for one pop.
- The naive pour-back-every-time design is O(n) per pop.
- JavaScript specifics: arrays with \`push\`/\`pop\` as stacks; the specification defines \`Array.prototype.shift\` as moving every remaining element down one place, so a queue built on \`shift\` is O(n) per dequeue unless an engine optimises it; \`reverse()\` mutates in place.

**Clarifying questions expected:**
- "What should pop return on an empty queue, \`undefined\` or should it throw?"
- "Is amortised O(1) acceptable?"

**Code / implementation expected:** Yes — a JavaScript class with two arrays.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a stack is.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this JavaScript version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

A bakery has a tall, narrow tray rack that only opens at the top. Fresh trays go in on top, and if you take a tray out, you get the newest one. That is a stack. But customers should get the *oldest* bread first, which is how a queue works.

The baker's trick: keep a second rack. When the counter needs bread and the second rack is empty, move every tray from the first rack into the second, one at a time. The newest tray, which was on top, goes in first and ends up at the bottom; the oldest tray ends up on top. Now the second rack hands out bread oldest first. New trays keep going into the first rack, and the baker only moves trays across again once the second rack is empty.

Interviewers ask this because it tests three things in one small class: whether you really understand LIFO versus FIFO, whether you can keep an invariant (never pour into a non-empty outbox), and whether you can explain **amortised** cost, which is why one slow operation does not make the whole structure slow.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which operations: \`push\`, \`pop\`, \`peek\`, \`empty\`, \`size\`? | The LeetCode version (232) wants the first four; \`size\` is just the sum of both stacks. |
| May I use only standard stack operations (push to top, pop from top, peek, size, empty)? | That is the usual rule; it forbids just indexing into the bottom of an array. |
| What should \`pop\` or \`peek\` do on an empty queue? | Throw, return a sentinel, or assume it never happens; decide before coding. |
| Is amortised O(1) per operation good enough, or must every single call be O(1)? | The two-stack queue gives amortised O(1); one pop can still cost O(n). |
| Will it be used from several threads? | If yes it needs locking; the interview version is single-threaded. |

## 3. The Core Idea

📌 **Interview term: Queue (FIFO)** — first in, first out: items leave in the order they arrived. A **stack** is LIFO, last in, first out. See [stack vs queue](/interview-question/what-is-the-difference-between-a-stack-and-a-queue).

Reversing a sequence twice gives back the original order. Pushing items onto one stack stores them newest-on-top; pouring them into a second stack reverses them, so the oldest is now on top. That is exactly the front of the queue.

- **inbox**: every \`push\` goes here. O(1).
- **outbox**: every \`pop\` and \`peek\` reads from here. If it is empty, first pour the whole inbox into it.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Queue built from two stacks. Push goes on top of the inbox. When the outbox is empty, the whole inbox is poured into it, which reverses the order so the oldest item ends on top of the outbox">
  <defs>
    <marker id="b11q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="150" y="40" text-anchor="middle">push lands on top</text>
  <rect class="d-box-accent" x="105" y="126" width="90" height="34" rx="6"/>
  <text class="d-text" x="150" y="148" text-anchor="middle">3</text>
  <rect class="d-box" x="105" y="168" width="90" height="34" rx="6"/>
  <text class="d-text" x="150" y="190" text-anchor="middle">2</text>
  <rect class="d-box" x="105" y="210" width="90" height="34" rx="6"/>
  <text class="d-text" x="150" y="232" text-anchor="middle">1</text>
  <path class="d-edge" d="M 95 250 L 205 250"/>
  <text class="d-text" x="150" y="278" text-anchor="middle">inbox</text>
  <path class="d-edge" d="M 150 52 L 150 116" marker-end="url(#b11q2-arrow)"/>

  <path class="d-edge-accent" d="M 225 186 L 455 186" marker-end="url(#b11q2-arrow)"/>
  <text class="d-sub" x="340" y="164" text-anchor="middle">pour everything across,</text>
  <text class="d-sub" x="340" y="214" text-anchor="middle">but only when the outbox is empty</text>

  <text class="d-sub" x="530" y="40" text-anchor="middle">pop and peek read the top</text>
  <rect class="d-box-accent" x="485" y="126" width="90" height="34" rx="6"/>
  <text class="d-text" x="530" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="485" y="168" width="90" height="34" rx="6"/>
  <text class="d-text" x="530" y="190" text-anchor="middle">2</text>
  <rect class="d-box" x="485" y="210" width="90" height="34" rx="6"/>
  <text class="d-text" x="530" y="232" text-anchor="middle">3</text>
  <path class="d-edge" d="M 475 250 L 585 250"/>
  <text class="d-text" x="530" y="278" text-anchor="middle">outbox</text>
  <path class="d-edge" d="M 530 116 L 530 52" marker-end="url(#b11q2-arrow)"/>
</svg>

After pushing 1, 2 and 3, the inbox holds 3 on top. Pouring moves 3, then 2, then 1, so 1 (the oldest) ends up on top of the outbox, ready to be popped first.

📌 **Interview term: Invariant** — a fact that is true after every operation. Here: *every item in the outbox is older than every item in the inbox, and the outbox top is the oldest item of all.* Pouring only into an **empty** outbox is what keeps it true. If the outbox still held 2 and you poured a newer 3 on top of it, 3 would come out before 2 and the queue would be wrong.

📌 **Interview term: Lazy transfer** — moving items only when they are needed (when the outbox is empty), rather than after every operation. This is what makes the structure fast.

## 4. Why It Is O(1) on Average: Amortised Analysis

One \`pop\` can be slow: if 1,000 items sit in the inbox and the outbox is empty, that pop moves all 1,000. So the worst case for a *single* call is O(n). But follow one element through its whole life:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 150" role="img" aria-label="The life of one element: push to inbox, pop from inbox, push to outbox, pop from outbox. Four stack operations in total">
  <defs>
    <marker id="b11q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="90" y="68" text-anchor="middle">1. push</text>
  <text class="d-sub" x="90" y="92" text-anchor="middle">onto the inbox</text>
  <path class="d-edge" d="M 164 75 L 196 75" marker-end="url(#b11q2-arrow2)"/>
  <rect class="d-box-muted" x="200" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="270" y="68" text-anchor="middle">2. pop</text>
  <text class="d-sub" x="270" y="92" text-anchor="middle">off the inbox</text>
  <path class="d-edge" d="M 344 75 L 376 75" marker-end="url(#b11q2-arrow2)"/>
  <rect class="d-box-muted" x="380" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="450" y="68" text-anchor="middle">3. push</text>
  <text class="d-sub" x="450" y="92" text-anchor="middle">onto the outbox</text>
  <path class="d-edge" d="M 524 75 L 556 75" marker-end="url(#b11q2-arrow2)"/>
  <rect class="d-box-accent" x="560" y="40" width="140" height="70" rx="10"/>
  <text class="d-text d-accent" x="630" y="68" text-anchor="middle">4. pop</text>
  <text class="d-sub" x="630" y="92" text-anchor="middle">off the outbox</text>
</svg>

Each element is pushed onto the inbox once, popped off it once, pushed onto the outbox once and popped off it once: four stack operations, ever, no matter how the calls are interleaved. Over n queue operations the total work is at most about 4n, so the average per operation is O(1).

📌 **Interview term: Amortised O(1)** — the average cost per operation over any sequence of operations is constant, even though an individual operation may cost more. See [amortized analysis](/interview-question/what-is-amortized-analysis).

📌 **Interview term: Aggregate method** — one way to prove an amortised bound: add up the total cost of any n operations and divide by n. The "four moves per element" count above is an aggregate argument.

**The naive alternative.** Keep everything in one stack and, on every dequeue, pour it all into a helper stack, pop, and pour it all back. Every pop then touches every element twice, which is O(n) per pop and O(n²) for n pops. Example 2 counts the moves for both designs: with 1,000 items the lazy two-stack queue moved 1,000 elements in total, while the naive version moved 1,000,000. It also shows the honest downside: the single worst pop in the lazy design moved all 1,000.

## 5. The JavaScript Implementation

~~~javascript
class MyQueue {
  constructor() {
    this.inbox = [];   // new items land here (top = newest)
    this.outbox = [];  // items wait here in reversed order (top = oldest)
  }
  push(x) {
    this.inbox.push(x);
  }
  shift() {
    // Refill the outbox only when it is empty: this keeps FIFO order.
    if (this.outbox.length === 0) {
      while (this.inbox.length > 0) this.outbox.push(this.inbox.pop());
    }
  }
  pop() {
    this.shift();
    return this.outbox.pop();
  }
  peek() {
    this.shift();
    return this.outbox[this.outbox.length - 1];
  }
  empty() {
    return this.inbox.length === 0 && this.outbox.length === 0;
  }
  state() {
    return 'in=' + fmt(this.inbox) + ' out=' + fmt(this.outbox);
  }
}
~~~

The JavaScript details that matter:

- **Two arrays as stacks.** \`push\` and \`pop\` work at the end of an array, which is the top of the stack.
- **The lazy pour.** \`shift()\` here is our own method name (it shifts items across); it only pours when \`this.outbox.length === 0\`.
- **Empty queue.** If both arrays are empty, \`this.outbox.pop()\` returns \`undefined\` rather than throwing. That may be fine, but if \`undefined\` could also be a legitimate stored value, the caller cannot tell "empty" from "stored undefined"; checking \`empty()\` first and throwing is clearer.
- **Why not \`Array.prototype.shift\`?** The ECMAScript specification describes \`shift()\` as removing index 0 and then moving every remaining element down one index, which is O(n) work per call as written. Engines are free to optimise that, but the language does not promise it, so an array-with-shift queue has no guaranteed O(1) dequeue. The two-stack queue only ever uses \`push\` and \`pop\` at the end.

**The \`reverse()\` trap.** A tempting shortcut for the pour is \`this.outbox = this.inbox.reverse()\`. But \`reverse()\` reverses *in place* and returns the same array, so both names now point to one array:

~~~javascript
const inbox = [1, 2, 3];
const outbox = inbox.reverse();   // reverses in place and returns the SAME array
console.log(outbox === inbox);
inbox.push(4);                    // a later push to the inbox...
console.log(outbox.join(', '));  // ...shows up in the outbox too
~~~

~~~text
true
3, 2, 1, 4
~~~

If you use it, reset the inbox to a brand-new array straight after: \`this.outbox = this.inbox.reverse(); this.inbox = [];\`.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`node main.js\` (Node.js 22). The same programs in the other three languages print exactly the same lines.

**Example 1 — Two-stack queue: trace every operation** printed:

~~~text
push(1) -> in=[1] out=[]
push(2) -> in=[1, 2] out=[]
peek() = 1 -> in=[] out=[2, 1]
pop() = 1 -> in=[] out=[2]
push(3) -> in=[3] out=[2]
pop() = 2 -> in=[3] out=[]
pop() = 3 -> in=[] out=[]
empty() = true
~~~

**Example 2 — Counting element moves: lazy two-stack vs naive pour-back** printed:

~~~text
n=10: two-stack moves=10 (worst single pop 10), naive moves=100
n=100: two-stack moves=100 (worst single pop 100), naive moves=10000
n=1000: two-stack moves=1000 (worst single pop 1000), naive moves=1000000
~~~

In Example 1, \`peek()\` triggers the only pour of 1 and 2 (the outbox becomes \`[2, 1]\`, top on the right), and \`push(3)\` waits in the inbox until 2 has left. In Example 2 the two-stack queue moved exactly n elements in total for n items, while the naive design moved exactly n²; the worst single pop of the two-stack queue still moved all n.

## 7. Complexity

| Operation | Cost | Why |
| :--- | :--- | :--- |
| \`push\` | O(1) | One push onto the inbox (amortised, because the underlying array may grow) |
| \`pop\` / \`peek\` | amortised O(1), worst case O(n) | A pour happens only when the outbox is empty, and each element is poured at most once |
| \`empty\` / \`size\` | O(1) | Check or add the two sizes |
| Space | O(n) | Every element lives in exactly one of the two stacks |
| Naive "pour back every time" | O(n) per pop | Every pop moves every element twice |

## 8. Edge Cases

- **Pop or peek on an empty queue** — both stacks are empty, so there is nothing to pour. Decide the behaviour (throw or sentinel) and say it out loud.
- **Interleaved pushes and pops** — a push while the outbox is non-empty must go to the inbox and wait; the trace in Example 1 shows \`push(3)\` arriving while \`2\` is still in the outbox, and \`2\` correctly leaving first.
- **Peek then pop** — \`peek\` may trigger the pour; the following \`pop\` then finds the outbox already filled and does no extra work.
- **Many pushes, then many pops** — the first pop pours everything (the O(n) call); every later pop is O(1).
- **Alternating push, pop, push, pop** — each pop pours exactly one element, still O(1).

## Common Pitfalls

- **Pouring into a non-empty outbox.** Newer items end up above older ones and come out first.
- **\`outbox = inbox.reverse()\` without a fresh inbox.** \`reverse()\` mutates and returns the same array, so the two "stacks" become one array (shown above).
- **Using \`shift()\` and calling it a queue.** It is correct, but the specification describes it as O(n) per call; do not claim O(1) for it.
- **\`peek\` that forgets to pour.** Reading \`this.outbox[this.outbox.length - 1]\` without pouring returns \`undefined\` while items wait in the inbox.
- **Naming clash.** Calling your pour method \`shift\` (as here) is fine inside a class, but do not confuse it with \`Array.prototype.shift\` when you explain the code; some people prefer \`transfer\` or \`refill\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Two stacks: push onto an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inbox</code>, pop and peek from an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code>, and when the outbox is empty pour the whole inbox into it, which reverses the order so the oldest is on top.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The invariant:</strong> <span style="color:#f0e2c8;">Only pour into an empty outbox; every outbox item is then older than every inbox item.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">Push O(1); pop and peek amortised O(1) since each element is moved at most once, though one pop can be O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. JavaScript details:</strong> <span style="color:#f0e2c8;">Two arrays with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> on empty returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, so I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">empty()</code> if I need to throw; I avoid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox = inbox.reverse()</code> because it aliases the array.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why not shift:</strong> <span style="color:#f0e2c8;">The spec defines <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.prototype.shift</code> as moving every element down one index, so it is not a guaranteed O(1) dequeue; this design only touches the end of each array.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">array.shift()</code> for the queue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The spec describes it as moving every remaining element, O(n) per call, and engine optimisations are not guaranteed. For big queues, two stacks or a head index over an array is the safe choice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you build a queue with one array and a head pointer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">head</code>, read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items[head++]</code> to dequeue, and occasionally slice off the consumed prefix. That is also amortised O(1) and is another common answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a single pop ever be slow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. If n items are in the inbox and the outbox is empty, that pop moves n items. Example 2 shows the worst single pop moving all 1,000 items, while the total over all pops was also only 1,000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">size()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this.inbox.length + this.outbox.length</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you build a stack from queues?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With one queue, after enqueuing x rotate the others behind it (dequeue and re-enqueue size minus one times). Push becomes O(n), pop O(1).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Queue (FIFO)** | First in, first out: items leave in arrival order |
| **Invariant** | A fact that stays true after every operation (outbox items are older than inbox items) |
| **Lazy transfer** | Pour the inbox into the outbox only when the outbox is empty |
| **Amortised O(1)** | Constant average cost per operation over any sequence, even if one call is slow |
| **Aggregate method** | Prove an amortised bound by totalling the cost of n operations and dividing by n |

---
**Conclusion:** A queue from two stacks works because reversing twice restores the original order: push onto an inbox, and when the outbox is empty pour it all across so the oldest item is on top. Pouring only into an empty outbox keeps FIFO order, and since each element crosses at most once, operations are amortised O(1), with one pop possibly O(n). In JavaScript two arrays with \`push\` and \`pop\` are the stacks, \`reverse()\` must not be used to alias the inbox, and the design avoids \`Array.prototype.shift\`, which the specification defines as moving every element.`,
        examples: [
          {
            label: "Two-stack queue: trace every operation",
            code: `class MyQueue {
  constructor() {
    this.inbox = [];   // new items land here (top = newest)
    this.outbox = [];  // items wait here in reversed order (top = oldest)
  }
  push(x) {
    this.inbox.push(x);
  }
  shift() {
    // Refill the outbox only when it is empty: this keeps FIFO order.
    if (this.outbox.length === 0) {
      while (this.inbox.length > 0) this.outbox.push(this.inbox.pop());
    }
  }
  pop() {
    this.shift();
    return this.outbox.pop();
  }
  peek() {
    this.shift();
    return this.outbox[this.outbox.length - 1];
  }
  empty() {
    return this.inbox.length === 0 && this.outbox.length === 0;
  }
  state() {
    return 'in=' + fmt(this.inbox) + ' out=' + fmt(this.outbox);
  }
}

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

const q = new MyQueue();
let v;
q.push(1); console.log('push(1) -> ' + q.state());
q.push(2); console.log('push(2) -> ' + q.state());
v = q.peek(); console.log('peek() = ' + v + ' -> ' + q.state());
v = q.pop(); console.log('pop() = ' + v + ' -> ' + q.state());
q.push(3); console.log('push(3) -> ' + q.state());
v = q.pop(); console.log('pop() = ' + v + ' -> ' + q.state());
v = q.pop(); console.log('pop() = ' + v + ' -> ' + q.state());
console.log('empty() = ' + q.empty());
`,
          },
          {
            label: "Counting element moves: lazy two-stack vs naive pour-back",
            code: `// Count how many times an element is moved between the two stacks.

function lazyMoves(n) {
  // Two-stack queue: refill the outbox only when it is empty.
  const inbox = [], outbox = [];
  let moves = 0, worst = 0;
  for (let i = 0; i < n; i++) inbox.push(i);
  for (let k = 0; k < n; k++) {
    let moved = 0;
    if (outbox.length === 0) {
      while (inbox.length > 0) { outbox.push(inbox.pop()); moved++; }
    }
    outbox.pop();
    moves += moved;
    worst = Math.max(worst, moved);
  }
  return [moves, worst];
}

function naiveMoves(n) {
  // Keep everything in one stack; to dequeue, pour it all out and back.
  const main = [], temp = [];
  let moves = 0;
  for (let i = 0; i < n; i++) main.push(i);
  for (let k = 0; k < n; k++) {
    while (main.length > 0) { temp.push(main.pop()); moves++; }
    temp.pop();                   // the oldest element is now on top
    while (temp.length > 0) { main.push(temp.pop()); moves++; }
  }
  return moves;
}

for (const n of [10, 100, 1000]) {
  const [m, w] = lazyMoves(n);
  console.log('n=' + n + ': two-stack moves=' + m + ' (worst single pop ' + w +
    '), naive moves=' + naiveMoves(n));
}
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Implement a FIFO queue in Java using only two stacks, with push, pop, peek and empty for int values. Explain the complexity, and what your code does when the queue is empty."

**What a strong answer should cover:**
- An inbox for pushes and an outbox for pops and peeks; pour inbox into outbox only when the outbox is empty.
- Pouring reverses order; pouring into a non-empty outbox breaks FIFO.
- Amortised O(1) per operation, O(n) worst case for one pop.
- The naive pour-back design is O(n) per pop.
- Java specifics: \`Deque<Integer>\` with \`ArrayDeque\` (not \`java.util.Stack\`); \`peek()\` returns \`null\` on empty, and unboxing that \`null\` into an \`int\` throws \`NullPointerException\`; in production \`ArrayDeque\` is already a queue (\`offer\`/\`poll\`).

**Clarifying questions expected:**
- "Should pop on an empty queue throw an exception or return a sentinel?"
- "Is amortised O(1) acceptable?"

**Code / implementation expected:** Yes — a Java class with two \`ArrayDeque<Integer>\` stacks.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a stack is.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Java version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

A bakery has a tall, narrow tray rack that only opens at the top. Fresh trays go in on top, and if you take a tray out, you get the newest one. That is a stack. But customers should get the *oldest* bread first, which is how a queue works.

The baker's trick: keep a second rack. When the counter needs bread and the second rack is empty, move every tray from the first rack into the second, one at a time. The newest tray, which was on top, goes in first and ends up at the bottom; the oldest tray ends up on top. Now the second rack hands out bread oldest first. New trays keep going into the first rack, and the baker only moves trays across again once the second rack is empty.

Interviewers ask this because it tests three things in one small class: whether you really understand LIFO versus FIFO, whether you can keep an invariant (never pour into a non-empty outbox), and whether you can explain **amortised** cost, which is why one slow operation does not make the whole structure slow.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which operations: \`push\`, \`pop\`, \`peek\`, \`empty\`, \`size\`? | The LeetCode version (232) wants the first four; \`size\` is just the sum of both stacks. |
| May I use only standard stack operations (push to top, pop from top, peek, size, empty)? | That is the usual rule; it forbids just indexing into the bottom of an array. |
| What should \`pop\` or \`peek\` do on an empty queue? | Throw, return a sentinel, or assume it never happens; decide before coding. |
| Is amortised O(1) per operation good enough, or must every single call be O(1)? | The two-stack queue gives amortised O(1); one pop can still cost O(n). |
| Will it be used from several threads? | If yes it needs locking; the interview version is single-threaded. |

## 3. The Core Idea

📌 **Interview term: Queue (FIFO)** — first in, first out: items leave in the order they arrived. A **stack** is LIFO, last in, first out. See [stack vs queue](/interview-question/what-is-the-difference-between-a-stack-and-a-queue).

Reversing a sequence twice gives back the original order. Pushing items onto one stack stores them newest-on-top; pouring them into a second stack reverses them, so the oldest is now on top. That is exactly the front of the queue.

- **inbox**: every \`push\` goes here. O(1).
- **outbox**: every \`pop\` and \`peek\` reads from here. If it is empty, first pour the whole inbox into it.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Queue built from two stacks. Push goes on top of the inbox. When the outbox is empty, the whole inbox is poured into it, which reverses the order so the oldest item ends on top of the outbox">
  <defs>
    <marker id="b11q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="150" y="40" text-anchor="middle">push lands on top</text>
  <rect class="d-box-accent" x="105" y="126" width="90" height="34" rx="6"/>
  <text class="d-text" x="150" y="148" text-anchor="middle">3</text>
  <rect class="d-box" x="105" y="168" width="90" height="34" rx="6"/>
  <text class="d-text" x="150" y="190" text-anchor="middle">2</text>
  <rect class="d-box" x="105" y="210" width="90" height="34" rx="6"/>
  <text class="d-text" x="150" y="232" text-anchor="middle">1</text>
  <path class="d-edge" d="M 95 250 L 205 250"/>
  <text class="d-text" x="150" y="278" text-anchor="middle">inbox</text>
  <path class="d-edge" d="M 150 52 L 150 116" marker-end="url(#b11q2-arrow)"/>

  <path class="d-edge-accent" d="M 225 186 L 455 186" marker-end="url(#b11q2-arrow)"/>
  <text class="d-sub" x="340" y="164" text-anchor="middle">pour everything across,</text>
  <text class="d-sub" x="340" y="214" text-anchor="middle">but only when the outbox is empty</text>

  <text class="d-sub" x="530" y="40" text-anchor="middle">pop and peek read the top</text>
  <rect class="d-box-accent" x="485" y="126" width="90" height="34" rx="6"/>
  <text class="d-text" x="530" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="485" y="168" width="90" height="34" rx="6"/>
  <text class="d-text" x="530" y="190" text-anchor="middle">2</text>
  <rect class="d-box" x="485" y="210" width="90" height="34" rx="6"/>
  <text class="d-text" x="530" y="232" text-anchor="middle">3</text>
  <path class="d-edge" d="M 475 250 L 585 250"/>
  <text class="d-text" x="530" y="278" text-anchor="middle">outbox</text>
  <path class="d-edge" d="M 530 116 L 530 52" marker-end="url(#b11q2-arrow)"/>
</svg>

After pushing 1, 2 and 3, the inbox holds 3 on top. Pouring moves 3, then 2, then 1, so 1 (the oldest) ends up on top of the outbox, ready to be popped first.

📌 **Interview term: Invariant** — a fact that is true after every operation. Here: *every item in the outbox is older than every item in the inbox, and the outbox top is the oldest item of all.* Pouring only into an **empty** outbox is what keeps it true. If the outbox still held 2 and you poured a newer 3 on top of it, 3 would come out before 2 and the queue would be wrong.

📌 **Interview term: Lazy transfer** — moving items only when they are needed (when the outbox is empty), rather than after every operation. This is what makes the structure fast.

## 4. Why It Is O(1) on Average: Amortised Analysis

One \`pop\` can be slow: if 1,000 items sit in the inbox and the outbox is empty, that pop moves all 1,000. So the worst case for a *single* call is O(n). But follow one element through its whole life:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 150" role="img" aria-label="The life of one element: push to inbox, pop from inbox, push to outbox, pop from outbox. Four stack operations in total">
  <defs>
    <marker id="b11q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="90" y="68" text-anchor="middle">1. push</text>
  <text class="d-sub" x="90" y="92" text-anchor="middle">onto the inbox</text>
  <path class="d-edge" d="M 164 75 L 196 75" marker-end="url(#b11q2-arrow2)"/>
  <rect class="d-box-muted" x="200" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="270" y="68" text-anchor="middle">2. pop</text>
  <text class="d-sub" x="270" y="92" text-anchor="middle">off the inbox</text>
  <path class="d-edge" d="M 344 75 L 376 75" marker-end="url(#b11q2-arrow2)"/>
  <rect class="d-box-muted" x="380" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="450" y="68" text-anchor="middle">3. push</text>
  <text class="d-sub" x="450" y="92" text-anchor="middle">onto the outbox</text>
  <path class="d-edge" d="M 524 75 L 556 75" marker-end="url(#b11q2-arrow2)"/>
  <rect class="d-box-accent" x="560" y="40" width="140" height="70" rx="10"/>
  <text class="d-text d-accent" x="630" y="68" text-anchor="middle">4. pop</text>
  <text class="d-sub" x="630" y="92" text-anchor="middle">off the outbox</text>
</svg>

Each element is pushed onto the inbox once, popped off it once, pushed onto the outbox once and popped off it once: four stack operations, ever, no matter how the calls are interleaved. Over n queue operations the total work is at most about 4n, so the average per operation is O(1).

📌 **Interview term: Amortised O(1)** — the average cost per operation over any sequence of operations is constant, even though an individual operation may cost more. See [amortized analysis](/interview-question/what-is-amortized-analysis).

📌 **Interview term: Aggregate method** — one way to prove an amortised bound: add up the total cost of any n operations and divide by n. The "four moves per element" count above is an aggregate argument.

**The naive alternative.** Keep everything in one stack and, on every dequeue, pour it all into a helper stack, pop, and pour it all back. Every pop then touches every element twice, which is O(n) per pop and O(n²) for n pops. Example 2 counts the moves for both designs: with 1,000 items the lazy two-stack queue moved 1,000 elements in total, while the naive version moved 1,000,000. It also shows the honest downside: the single worst pop in the lazy design moved all 1,000.

## 5. The Java Implementation

~~~java
static class MyQueue {
    private final Deque<Integer> inbox = new ArrayDeque<>();   // top = newest
    private final Deque<Integer> outbox = new ArrayDeque<>();  // top = oldest

    void push(int x) { inbox.push(x); }

    private void shift() {
        // Refill the outbox only when it is empty: this keeps FIFO order.
        if (outbox.isEmpty()) {
            while (!inbox.isEmpty()) outbox.push(inbox.pop());
        }
    }

    int pop() { shift(); return outbox.pop(); }     // throws if both are empty
    int peek() { shift(); return outbox.peek(); }   // peek() returns null if empty
    boolean empty() { return inbox.isEmpty() && outbox.isEmpty(); }
}
~~~

The Java details that matter:

- **\`Deque<Integer>\` backed by \`ArrayDeque\`.** The [\`java.util.Stack\` documentation](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Stack.html) recommends \`Deque\` implementations over \`Stack\`. \`push\` and \`pop\` work at the head of the deque, which acts as the top.
- **Boxing.** The deques hold \`Integer\` objects; \`push(int x)\` autoboxes and \`int pop()\` auto-unboxes.
- **Empty queue.** With both deques empty, \`outbox.pop()\` throws \`NoSuchElementException\`, which is a sensible "queue is empty" signal. \`peek()\` is the dangerous one: \`ArrayDeque.peek()\` returns \`null\` on empty, and returning that from a method declared \`int\` unboxes \`null\`:

~~~java
import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    static Deque<Integer> outbox = new ArrayDeque<>();

    static int peek() {
        return outbox.peek();   // Integer null unboxed to int
    }

    public static void main(String[] args) {
        try {
            System.out.println(peek());
        } catch (NullPointerException e) {
            System.out.println("NullPointerException: " + e.getMessage());
        }
    }
}
~~~

~~~text
NullPointerException: Cannot invoke "java.lang.Integer.intValue()" because the return value of "java.util.Deque.peek()" is null
~~~

So either document that \`peek\` must not be called on an empty queue, or check \`empty()\` first and throw a clear \`NoSuchElementException("queue is empty")\` yourself.

📌 **Interview term: Autoboxing** — Java wrapping an \`int\` in an \`Integer\` object to store it in a collection, and unwrapping it when you assign it back to an \`int\`. Unwrapping \`null\` throws \`NullPointerException\`.

**What you would use in production.** \`ArrayDeque\` is already a queue: \`offer\` adds at the tail and \`poll\` removes from the head (returning \`null\` when empty), and \`java.util.concurrent\` has thread-safe queues. The two-stack version is about reasoning and amortised analysis.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`javac Main.java && java Main\` (OpenJDK 21 (javac 21)). The same programs in the other three languages print exactly the same lines.

**Example 1 — Two-stack queue: trace every operation** printed:

~~~text
push(1) -> in=[1] out=[]
push(2) -> in=[1, 2] out=[]
peek() = 1 -> in=[] out=[2, 1]
pop() = 1 -> in=[] out=[2]
push(3) -> in=[3] out=[2]
pop() = 2 -> in=[3] out=[]
pop() = 3 -> in=[] out=[]
empty() = true
~~~

**Example 2 — Counting element moves: lazy two-stack vs naive pour-back** printed:

~~~text
n=10: two-stack moves=10 (worst single pop 10), naive moves=100
n=100: two-stack moves=100 (worst single pop 100), naive moves=10000
n=1000: two-stack moves=1000 (worst single pop 1000), naive moves=1000000
~~~

In Example 1, \`peek()\` triggers the only pour of 1 and 2 (the outbox becomes \`[2, 1]\`, top on the right), and \`push(3)\` waits in the inbox until 2 has left. In Example 2 the two-stack queue moved exactly n elements in total for n items, while the naive design moved exactly n²; the worst single pop of the two-stack queue still moved all n.

## 7. Complexity

| Operation | Cost | Why |
| :--- | :--- | :--- |
| \`push\` | O(1) | One push onto the inbox (amortised, because the underlying array may grow) |
| \`pop\` / \`peek\` | amortised O(1), worst case O(n) | A pour happens only when the outbox is empty, and each element is poured at most once |
| \`empty\` / \`size\` | O(1) | Check or add the two sizes |
| Space | O(n) | Every element lives in exactly one of the two stacks |
| Naive "pour back every time" | O(n) per pop | Every pop moves every element twice |

## 8. Edge Cases

- **Pop or peek on an empty queue** — both stacks are empty, so there is nothing to pour. Decide the behaviour (throw or sentinel) and say it out loud.
- **Interleaved pushes and pops** — a push while the outbox is non-empty must go to the inbox and wait; the trace in Example 1 shows \`push(3)\` arriving while \`2\` is still in the outbox, and \`2\` correctly leaving first.
- **Peek then pop** — \`peek\` may trigger the pour; the following \`pop\` then finds the outbox already filled and does no extra work.
- **Many pushes, then many pops** — the first pop pours everything (the O(n) call); every later pop is O(1).
- **Alternating push, pop, push, pop** — each pop pours exactly one element, still O(1).

## Common Pitfalls

- **Pouring into a non-empty outbox.** Newer items land on top of older ones and leave first.
- **Unboxing a \`null\` from \`peek()\`.** \`int peek() { return outbox.peek(); }\` throws \`NullPointerException\` on an empty queue, as shown above.
- **Using \`java.util.Stack\`.** It works, but it is a synchronised \`Vector\` subclass and its documentation recommends \`Deque\`.
- **Comparing \`Integer\`s with \`==\`.** If you ever compare the front of two queues, \`a.peek() == b.peek()\` compares references and fails for values outside the -128 to 127 cache; use \`equals\` or unbox first.
- **\`peek\` that forgets to pour.** It returns \`null\` (and then throws on unboxing) while items wait in the inbox.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Two stacks: push onto an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inbox</code>, pop and peek from an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code>; when the outbox is empty pour the whole inbox into it, which reverses the order so the oldest is on top.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The invariant:</strong> <span style="color:#f0e2c8;">Only pour into an empty outbox; every outbox element is then older than every inbox element.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">Push O(1); pop and peek amortised O(1) since each element moves across at most once; one pop can be O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Java details:</strong> <span style="color:#f0e2c8;">Two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deque&lt;Integer&gt;</code> backed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoSuchElementException</code> on empty, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek()</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>, which throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NullPointerException</code> if unboxed to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, so I guard it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Real-world note:</strong> <span style="color:#f0e2c8;">In production I would use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> directly as a queue with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">offer</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">poll</code>, or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">java.util.concurrent</code> queue for threads.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ArrayDeque</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Stack</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Stack</code> javadoc recommends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deque</code> implementations; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Stack</code> extends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vector</code> and synchronises every call.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if someone calls <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">peek()</code> on an empty queue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox.peek()</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>, and returning it as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> unboxes it, throwing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NullPointerException</code>. I check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">empty()</code> and throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoSuchElementException</code> with a clear message instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this thread-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Two threads could both see an empty outbox and pour at the same time. You would need a lock around each method, or simply use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ConcurrentLinkedQueue</code> or an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayBlockingQueue</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can one pop be slow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the pour can move n elements. Example 2 shows the worst single pop moving 1,000 items while the total over all 1,000 pops was also 1,000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you avoid boxing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> arrays and top indices that grow by copying, like the stack in the monotonic-stack examples. It is faster but more code.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Queue (FIFO)** | First in, first out: items leave in arrival order |
| **Invariant** | A fact that stays true after every operation (outbox items are older than inbox items) |
| **Lazy transfer** | Pour the inbox into the outbox only when the outbox is empty |
| **Amortised O(1)** | Constant average cost per operation over any sequence, even if one call is slow |
| **Aggregate method** | Prove an amortised bound by totalling the cost of n operations and dividing by n |
| **Autoboxing** | Java wrapping an \`int\` as an \`Integer\` for collections; unboxing \`null\` throws |

---
**Conclusion:** A queue from two stacks works because reversing twice restores the original order: push onto an inbox, and when the outbox is empty pour it all across so the oldest item is on top. Pouring only into an empty outbox keeps FIFO order, and since each element crosses at most once, operations are amortised O(1), with one pop possibly O(n). In Java two \`ArrayDeque<Integer>\`s are the stacks; guard \`peek()\` because unboxing its \`null\` throws \`NullPointerException\`, and in production use \`ArrayDeque\` itself as the queue.`,
        examples: [
          {
            label: "Two-stack queue: trace every operation",
            code: `import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

public class Main {
    static class MyQueue {
        private final Deque<Integer> inbox = new ArrayDeque<>();   // top = newest
        private final Deque<Integer> outbox = new ArrayDeque<>();  // top = oldest

        void push(int x) { inbox.push(x); }

        private void shift() {
            // Refill the outbox only when it is empty: this keeps FIFO order.
            if (outbox.isEmpty()) {
                while (!inbox.isEmpty()) outbox.push(inbox.pop());
            }
        }

        int pop() { shift(); return outbox.pop(); }     // throws if both are empty
        int peek() { shift(); return outbox.peek(); }   // peek() returns null if empty
        boolean empty() { return inbox.isEmpty() && outbox.isEmpty(); }

        String state() { return "in=" + fmt(inbox) + " out=" + fmt(outbox); }
    }

    // ArrayDeque.push adds at the head, so iteration goes top to bottom.
    // Reverse it to print bottom to top like the other languages.
    static String fmt(Deque<Integer> d) {
        List<Integer> xs = new ArrayList<>();
        d.descendingIterator().forEachRemaining(xs::add);
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < xs.size(); i++) sb.append(i > 0 ? ", " : "").append(xs.get(i));
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        MyQueue q = new MyQueue();
        int v;
        q.push(1); System.out.println("push(1) -> " + q.state());
        q.push(2); System.out.println("push(2) -> " + q.state());
        v = q.peek(); System.out.println("peek() = " + v + " -> " + q.state());
        v = q.pop(); System.out.println("pop() = " + v + " -> " + q.state());
        q.push(3); System.out.println("push(3) -> " + q.state());
        v = q.pop(); System.out.println("pop() = " + v + " -> " + q.state());
        v = q.pop(); System.out.println("pop() = " + v + " -> " + q.state());
        System.out.println("empty() = " + q.empty());
    }
}
`,
          },
          {
            label: "Counting element moves: lazy two-stack vs naive pour-back",
            code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    // Count how many times an element is moved between the two stacks.

    static long[] lazyMoves(int n) {
        // Two-stack queue: refill the outbox only when it is empty.
        Deque<Integer> inbox = new ArrayDeque<>(), outbox = new ArrayDeque<>();
        long moves = 0, worst = 0;
        for (int i = 0; i < n; i++) inbox.push(i);
        for (int k = 0; k < n; k++) {
            long moved = 0;
            if (outbox.isEmpty()) {
                while (!inbox.isEmpty()) { outbox.push(inbox.pop()); moved++; }
            }
            outbox.pop();
            moves += moved;
            worst = Math.max(worst, moved);
        }
        return new long[] {moves, worst};
    }

    static long naiveMoves(int n) {
        // Keep everything in one stack; to dequeue, pour it all out and back.
        Deque<Integer> main = new ArrayDeque<>(), temp = new ArrayDeque<>();
        long moves = 0;
        for (int i = 0; i < n; i++) main.push(i);
        for (int k = 0; k < n; k++) {
            while (!main.isEmpty()) { temp.push(main.pop()); moves++; }
            temp.pop();                   // the oldest element is now on top
            while (!temp.isEmpty()) { main.push(temp.pop()); moves++; }
        }
        return moves;
    }

    public static void main(String[] args) {
        for (int n : new int[] {10, 100, 1000}) {
            long[] mw = lazyMoves(n);
            System.out.println("n=" + n + ": two-stack moves=" + mw[0] + " (worst single pop " + mw[1]
                + "), naive moves=" + naiveMoves(n));
        }
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Implement a FIFO queue of ints in C++ using only two stacks, with push, pop, peek and empty. What is the complexity, and what happens if pop is called on an empty queue?"

**What a strong answer should cover:**
- An inbox for pushes and an outbox for pops and peeks; pour the inbox into the outbox only when the outbox is empty.
- Pouring reverses order; pouring into a non-empty outbox breaks FIFO.
- Amortised O(1) per operation, O(n) worst case for one pop.
- The naive pour-back design is O(n) per pop.
- C++ specifics: \`std::stack<int>\` or \`std::vector<int>\` as stacks; \`top()\`/\`back()\` and \`pop()\` on empty are undefined behaviour and \`pop()\` returns \`void\`; in production \`std::queue\` (a \`std::deque\` adapter) is the queue to use.

**Clarifying questions expected:**
- "Can I assume pop is never called on an empty queue, or should I throw?"
- "Is amortised O(1) acceptable?"

**Code / implementation expected:** Yes — a C++ class with two \`std::vector<int>\` (or \`std::stack<int>\`) members.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a stack is.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this C++ version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

A bakery has a tall, narrow tray rack that only opens at the top. Fresh trays go in on top, and if you take a tray out, you get the newest one. That is a stack. But customers should get the *oldest* bread first, which is how a queue works.

The baker's trick: keep a second rack. When the counter needs bread and the second rack is empty, move every tray from the first rack into the second, one at a time. The newest tray, which was on top, goes in first and ends up at the bottom; the oldest tray ends up on top. Now the second rack hands out bread oldest first. New trays keep going into the first rack, and the baker only moves trays across again once the second rack is empty.

Interviewers ask this because it tests three things in one small class: whether you really understand LIFO versus FIFO, whether you can keep an invariant (never pour into a non-empty outbox), and whether you can explain **amortised** cost, which is why one slow operation does not make the whole structure slow.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which operations: \`push\`, \`pop\`, \`peek\`, \`empty\`, \`size\`? | The LeetCode version (232) wants the first four; \`size\` is just the sum of both stacks. |
| May I use only standard stack operations (push to top, pop from top, peek, size, empty)? | That is the usual rule; it forbids just indexing into the bottom of an array. |
| What should \`pop\` or \`peek\` do on an empty queue? | Throw, return a sentinel, or assume it never happens; decide before coding. |
| Is amortised O(1) per operation good enough, or must every single call be O(1)? | The two-stack queue gives amortised O(1); one pop can still cost O(n). |
| Will it be used from several threads? | If yes it needs locking; the interview version is single-threaded. |

## 3. The Core Idea

📌 **Interview term: Queue (FIFO)** — first in, first out: items leave in the order they arrived. A **stack** is LIFO, last in, first out. See [stack vs queue](/interview-question/what-is-the-difference-between-a-stack-and-a-queue).

Reversing a sequence twice gives back the original order. Pushing items onto one stack stores them newest-on-top; pouring them into a second stack reverses them, so the oldest is now on top. That is exactly the front of the queue.

- **inbox**: every \`push\` goes here. O(1).
- **outbox**: every \`pop\` and \`peek\` reads from here. If it is empty, first pour the whole inbox into it.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="Queue built from two stacks. Push goes on top of the inbox. When the outbox is empty, the whole inbox is poured into it, which reverses the order so the oldest item ends on top of the outbox">
  <defs>
    <marker id="b11q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="150" y="40" text-anchor="middle">push lands on top</text>
  <rect class="d-box-accent" x="105" y="126" width="90" height="34" rx="6"/>
  <text class="d-text" x="150" y="148" text-anchor="middle">3</text>
  <rect class="d-box" x="105" y="168" width="90" height="34" rx="6"/>
  <text class="d-text" x="150" y="190" text-anchor="middle">2</text>
  <rect class="d-box" x="105" y="210" width="90" height="34" rx="6"/>
  <text class="d-text" x="150" y="232" text-anchor="middle">1</text>
  <path class="d-edge" d="M 95 250 L 205 250"/>
  <text class="d-text" x="150" y="278" text-anchor="middle">inbox</text>
  <path class="d-edge" d="M 150 52 L 150 116" marker-end="url(#b11q2-arrow)"/>

  <path class="d-edge-accent" d="M 225 186 L 455 186" marker-end="url(#b11q2-arrow)"/>
  <text class="d-sub" x="340" y="164" text-anchor="middle">pour everything across,</text>
  <text class="d-sub" x="340" y="214" text-anchor="middle">but only when the outbox is empty</text>

  <text class="d-sub" x="530" y="40" text-anchor="middle">pop and peek read the top</text>
  <rect class="d-box-accent" x="485" y="126" width="90" height="34" rx="6"/>
  <text class="d-text" x="530" y="148" text-anchor="middle">1</text>
  <rect class="d-box" x="485" y="168" width="90" height="34" rx="6"/>
  <text class="d-text" x="530" y="190" text-anchor="middle">2</text>
  <rect class="d-box" x="485" y="210" width="90" height="34" rx="6"/>
  <text class="d-text" x="530" y="232" text-anchor="middle">3</text>
  <path class="d-edge" d="M 475 250 L 585 250"/>
  <text class="d-text" x="530" y="278" text-anchor="middle">outbox</text>
  <path class="d-edge" d="M 530 116 L 530 52" marker-end="url(#b11q2-arrow)"/>
</svg>

After pushing 1, 2 and 3, the inbox holds 3 on top. Pouring moves 3, then 2, then 1, so 1 (the oldest) ends up on top of the outbox, ready to be popped first.

📌 **Interview term: Invariant** — a fact that is true after every operation. Here: *every item in the outbox is older than every item in the inbox, and the outbox top is the oldest item of all.* Pouring only into an **empty** outbox is what keeps it true. If the outbox still held 2 and you poured a newer 3 on top of it, 3 would come out before 2 and the queue would be wrong.

📌 **Interview term: Lazy transfer** — moving items only when they are needed (when the outbox is empty), rather than after every operation. This is what makes the structure fast.

## 4. Why It Is O(1) on Average: Amortised Analysis

One \`pop\` can be slow: if 1,000 items sit in the inbox and the outbox is empty, that pop moves all 1,000. So the worst case for a *single* call is O(n). But follow one element through its whole life:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 150" role="img" aria-label="The life of one element: push to inbox, pop from inbox, push to outbox, pop from outbox. Four stack operations in total">
  <defs>
    <marker id="b11q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="90" y="68" text-anchor="middle">1. push</text>
  <text class="d-sub" x="90" y="92" text-anchor="middle">onto the inbox</text>
  <path class="d-edge" d="M 164 75 L 196 75" marker-end="url(#b11q2-arrow2)"/>
  <rect class="d-box-muted" x="200" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="270" y="68" text-anchor="middle">2. pop</text>
  <text class="d-sub" x="270" y="92" text-anchor="middle">off the inbox</text>
  <path class="d-edge" d="M 344 75 L 376 75" marker-end="url(#b11q2-arrow2)"/>
  <rect class="d-box-muted" x="380" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="450" y="68" text-anchor="middle">3. push</text>
  <text class="d-sub" x="450" y="92" text-anchor="middle">onto the outbox</text>
  <path class="d-edge" d="M 524 75 L 556 75" marker-end="url(#b11q2-arrow2)"/>
  <rect class="d-box-accent" x="560" y="40" width="140" height="70" rx="10"/>
  <text class="d-text d-accent" x="630" y="68" text-anchor="middle">4. pop</text>
  <text class="d-sub" x="630" y="92" text-anchor="middle">off the outbox</text>
</svg>

Each element is pushed onto the inbox once, popped off it once, pushed onto the outbox once and popped off it once: four stack operations, ever, no matter how the calls are interleaved. Over n queue operations the total work is at most about 4n, so the average per operation is O(1).

📌 **Interview term: Amortised O(1)** — the average cost per operation over any sequence of operations is constant, even though an individual operation may cost more. See [amortized analysis](/interview-question/what-is-amortized-analysis).

📌 **Interview term: Aggregate method** — one way to prove an amortised bound: add up the total cost of any n operations and divide by n. The "four moves per element" count above is an aggregate argument.

**The naive alternative.** Keep everything in one stack and, on every dequeue, pour it all into a helper stack, pop, and pour it all back. Every pop then touches every element twice, which is O(n) per pop and O(n²) for n pops. Example 2 counts the moves for both designs: with 1,000 items the lazy two-stack queue moved 1,000 elements in total, while the naive version moved 1,000,000. It also shows the honest downside: the single worst pop in the lazy design moved all 1,000.

## 5. The C++ Implementation

~~~cpp
class MyQueue {
    std::vector<int> inbox;   // top (back) = newest
    std::vector<int> outbox;  // top (back) = oldest

    void shift() {
        // Refill the outbox only when it is empty: this keeps FIFO order.
        if (outbox.empty()) {
            while (!inbox.empty()) {
                outbox.push_back(inbox.back());
                inbox.pop_back();
            }
        }
    }

public:
    void push(int x) { inbox.push_back(x); }
    int pop() {
        shift();
        int v = outbox.back();   // read first: pop_back() returns void
        outbox.pop_back();
        return v;
    }
    int peek() { shift(); return outbox.back(); }
    bool empty() const { return inbox.empty() && outbox.empty(); }
};
~~~

The C++ details that matter:

- **\`std::vector<int>\` as a stack.** \`push_back\`, \`back\` and \`pop_back\` work at the end, which is the top. \`std::stack<int>\` works identically through \`push\`, \`top\` and \`pop\`.
- **Read, then pop.** \`pop_back()\` (like \`std::stack::pop()\`) returns \`void\`, so \`pop()\` reads \`outbox.back()\` into \`v\` first.
- **Empty queue.** If both vectors are empty, \`outbox.back()\` is undefined behaviour: no exception, possibly garbage or a crash. If the interviewer wants a defined result, add \`if (empty()) throw std::out_of_range("queue is empty");\` at the top of \`pop\` and \`peek\`.
- **Returning by value.** \`peek()\` returns \`int\`, not \`int&\`. A reference into a vector is invalidated when that vector reallocates, and a later pour may push into the outbox and grow it; returning a copy avoids handing out a dangling reference.

📌 **Interview term: Undefined behaviour (UB)** — code the C++ standard gives no meaning to, such as reading \`back()\` of an empty vector; the result is unpredictable rather than a clean error.

**What you would use in production.** \`std::queue<int>\` already exists; by default it adapts a \`std::deque\`, with \`push\` at the back and \`pop\`/\`front\` at the front. The two-stack version is about reasoning and amortised analysis.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3 with -std=c++17). The same programs in the other three languages print exactly the same lines.

**Example 1 — Two-stack queue: trace every operation** printed:

~~~text
push(1) -> in=[1] out=[]
push(2) -> in=[1, 2] out=[]
peek() = 1 -> in=[] out=[2, 1]
pop() = 1 -> in=[] out=[2]
push(3) -> in=[3] out=[2]
pop() = 2 -> in=[3] out=[]
pop() = 3 -> in=[] out=[]
empty() = true
~~~

**Example 2 — Counting element moves: lazy two-stack vs naive pour-back** printed:

~~~text
n=10: two-stack moves=10 (worst single pop 10), naive moves=100
n=100: two-stack moves=100 (worst single pop 100), naive moves=10000
n=1000: two-stack moves=1000 (worst single pop 1000), naive moves=1000000
~~~

In Example 1, \`peek()\` triggers the only pour of 1 and 2 (the outbox becomes \`[2, 1]\`, top on the right), and \`push(3)\` waits in the inbox until 2 has left. In Example 2 the two-stack queue moved exactly n elements in total for n items, while the naive design moved exactly n²; the worst single pop of the two-stack queue still moved all n.

## 7. Complexity

| Operation | Cost | Why |
| :--- | :--- | :--- |
| \`push\` | O(1) | One push onto the inbox (amortised, because the underlying array may grow) |
| \`pop\` / \`peek\` | amortised O(1), worst case O(n) | A pour happens only when the outbox is empty, and each element is poured at most once |
| \`empty\` / \`size\` | O(1) | Check or add the two sizes |
| Space | O(n) | Every element lives in exactly one of the two stacks |
| Naive "pour back every time" | O(n) per pop | Every pop moves every element twice |

## 8. Edge Cases

- **Pop or peek on an empty queue** — both stacks are empty, so there is nothing to pour. Decide the behaviour (throw or sentinel) and say it out loud.
- **Interleaved pushes and pops** — a push while the outbox is non-empty must go to the inbox and wait; the trace in Example 1 shows \`push(3)\` arriving while \`2\` is still in the outbox, and \`2\` correctly leaving first.
- **Peek then pop** — \`peek\` may trigger the pour; the following \`pop\` then finds the outbox already filled and does no extra work.
- **Many pushes, then many pops** — the first pop pours everything (the O(n) call); every later pop is O(1).
- **Alternating push, pop, push, pop** — each pop pours exactly one element, still O(1).

## Common Pitfalls

- **Pouring into a non-empty outbox.** Newer items end up above older ones and leave first.
- **Calling \`back()\`/\`top()\` on an empty container.** Undefined behaviour, not an exception; guard it or document the precondition.
- **Expecting \`pop()\` to return the value.** \`std::stack::pop()\` and \`pop_back()\` return \`void\`; read the top first.
- **Returning \`int&\` from \`peek()\`.** A reference into a vector dangles after the vector reallocates.
- **Mixing up \`std::stack\` and \`std::vector\` member names.** \`std::stack\` has \`top()\`/\`push()\`/\`pop()\`; \`std::vector\` has \`back()\`/\`push_back()\`/\`pop_back()\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Two stacks: push onto an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inbox</code>, pop and peek from an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code>; when the outbox is empty pour the whole inbox into it, which reverses the order so the oldest is on top.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The invariant:</strong> <span style="color:#f0e2c8;">Only pour into an empty outbox; every outbox element is then older than every inbox element.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">Push O(1); pop and peek amortised O(1), each element moves across at most once, though one pop can be O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. C++ details:</strong> <span style="color:#f0e2c8;">Two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt;</code>s with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">back</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_back</code>; I read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">back()</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_back()</code> because it returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code>, and an empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">back()</code> is undefined behaviour, so I guard or document it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Real-world note:</strong> <span style="color:#f0e2c8;">In production I would use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::queue&lt;int&gt;</code>, which adapts a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::deque</code> by default.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does your <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pop</code> do on an empty queue?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As written, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox.back()</code> on an empty vector is undefined behaviour. I would either document the precondition or add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if (empty()) throw std::out_of_range(...)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::vector</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::stack</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either works. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> lets me <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reserve</code> and print the contents while debugging; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack</code> restricts the interface and documents intent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can one pop be slow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the pour can move n elements. Example 2 shows the worst single pop moving 1,000 items while the total for all 1,000 pops was also 1,000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">peek</code> return <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int&amp;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A reference into a vector is invalidated if the vector reallocates, which a later pour can cause. Returning by value is safe and cheap for an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it thread-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Concurrent calls race on both vectors; you would wrap each method in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::mutex</code> lock or use a concurrent queue library.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Queue (FIFO)** | First in, first out: items leave in arrival order |
| **Invariant** | A fact that stays true after every operation (outbox items are older than inbox items) |
| **Lazy transfer** | Pour the inbox into the outbox only when the outbox is empty |
| **Amortised O(1)** | Constant average cost per operation over any sequence, even if one call is slow |
| **Aggregate method** | Prove an amortised bound by totalling the cost of n operations and dividing by n |
| **Undefined behaviour (UB)** | Code the standard gives no meaning to, such as \`back()\` on an empty vector |

---
**Conclusion:** A queue from two stacks works because reversing twice restores the original order: push onto an inbox, and when the outbox is empty pour it all across so the oldest item is on top. Pouring only into an empty outbox keeps FIFO order, and since each element crosses at most once, operations are amortised O(1), with one pop possibly O(n). In C++ two \`std::vector<int>\`s are the stacks; read \`back()\` before \`pop_back()\`, guard against empty containers because that is undefined behaviour, and use \`std::queue\` in production.`,
        examples: [
          {
            label: "Two-stack queue: trace every operation",
            code: `#include <iostream>
#include <string>
#include <vector>

class MyQueue {
    std::vector<int> inbox;   // top (back) = newest
    std::vector<int> outbox;  // top (back) = oldest

    void shift() {
        // Refill the outbox only when it is empty: this keeps FIFO order.
        if (outbox.empty()) {
            while (!inbox.empty()) {
                outbox.push_back(inbox.back());
                inbox.pop_back();
            }
        }
    }

public:
    void push(int x) { inbox.push_back(x); }
    int pop() {
        shift();
        int v = outbox.back();   // read first: pop_back() returns void
        outbox.pop_back();
        return v;
    }
    int peek() { shift(); return outbox.back(); }
    bool empty() const { return inbox.empty() && outbox.empty(); }
    std::string state() const { return "in=" + fmt(inbox) + " out=" + fmt(outbox); }

    static std::string fmt(const std::vector<int>& xs) {
        std::string s = "[";
        for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + std::to_string(xs[i]);
        return s + "]";
    }
};

int main() {
    MyQueue q;
    int v;
    q.push(1); std::cout << "push(1) -> " << q.state() << "\\n";
    q.push(2); std::cout << "push(2) -> " << q.state() << "\\n";
    v = q.peek(); std::cout << "peek() = " << v << " -> " << q.state() << "\\n";
    v = q.pop(); std::cout << "pop() = " << v << " -> " << q.state() << "\\n";
    q.push(3); std::cout << "push(3) -> " << q.state() << "\\n";
    v = q.pop(); std::cout << "pop() = " << v << " -> " << q.state() << "\\n";
    v = q.pop(); std::cout << "pop() = " << v << " -> " << q.state() << "\\n";
    std::cout << "empty() = " << std::boolalpha << q.empty() << "\\n";
}
`,
          },
          {
            label: "Counting element moves: lazy two-stack vs naive pour-back",
            code: `#include <algorithm>
#include <iostream>
#include <utility>
#include <vector>

// Count how many times an element is moved between the two stacks.

std::pair<long long, long long> lazyMoves(int n) {
    // Two-stack queue: refill the outbox only when it is empty.
    std::vector<int> inbox, outbox;
    long long moves = 0, worst = 0;
    for (int i = 0; i < n; i++) inbox.push_back(i);
    for (int k = 0; k < n; k++) {
        long long moved = 0;
        if (outbox.empty()) {
            while (!inbox.empty()) { outbox.push_back(inbox.back()); inbox.pop_back(); moved++; }
        }
        outbox.pop_back();
        moves += moved;
        worst = std::max(worst, moved);
    }
    return {moves, worst};
}

long long naiveMoves(int n) {
    // Keep everything in one stack; to dequeue, pour it all out and back.
    std::vector<int> main, temp;
    long long moves = 0;
    for (int i = 0; i < n; i++) main.push_back(i);
    for (int k = 0; k < n; k++) {
        while (!main.empty()) { temp.push_back(main.back()); main.pop_back(); moves++; }
        temp.pop_back();              // the oldest element is now on top
        while (!temp.empty()) { main.push_back(temp.back()); temp.pop_back(); moves++; }
    }
    return moves;
}

int main() {
    for (int n : {10, 100, 1000}) {
        auto [m, w] = lazyMoves(n);
        std::cout << "n=" << n << ": two-stack moves=" << m << " (worst single pop " << w
                  << "), naive moves=" << naiveMoves(n) << "\\n";
    }
}
`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you design a min stack with O(1) getMin?",
    difficulty: "medium",
    seoDescription: "Design a min stack with O(1) push, pop, top and getMin in Python, JavaScript, Java and C++, including the duplicate-minimum bug.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Design a stack class in Python that supports push, pop, top and get_min, where every one of those operations runs in O(1) time. Talk me through how you keep the minimum correct after a pop."

**What a strong answer should cover:**
- Why a single current-minimum variable fails after popping the minimum.
- Storing (value, minimum so far) on each entry, or an auxiliary \`mins\` stack that is pushed on \`<=\`.
- All four operations O(1); O(n) extra space, and when the two-stack version saves memory.
- The duplicate-minimum case, and why \`<\` instead of \`<=\` breaks it.
- Python specifics: a list of tuples as the stack; \`min(self.stack)\` would be O(n); \`stack[-1]\` on an empty list raises \`IndexError\`; Python ints never overflow, so the encoded-difference trick is safe here.

**Clarifying questions expected:**
- "What should top or get_min do on an empty stack?"
- "Can values repeat?"

**Code / implementation expected:** Yes — a Python class backed by a list of (value, min) tuples.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a stack is.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Python version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Picture a pile of exam papers on a teacher's desk. Papers are added and removed only from the top. The head teacher keeps walking in and asking one question: "What is the lowest mark in the pile right now?" Searching the whole pile each time is slow. So the teacher writes a small note in the corner of each paper as it goes on the pile: *"lowest mark from here down: 42"*. Now the answer is always written on the top paper. When a paper is taken off, the paper below it already carries the correct note for the smaller pile.

That is the min stack. The trick, writing down the answer at the time each item arrives so you never have to recompute it, appears all over interviews and real systems: undo stacks that remember state, the running maximum in a sliding window, and expression evaluators. The question tests whether you see that a single "current minimum" variable is not enough, because it cannot be restored after a pop.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which operations: \`push\`, \`pop\`, \`top\`, \`getMin\`? All O(1)? | That is the standard LeetCode 155 contract; all four must be constant time. |
| Can \`pop\`, \`top\` or \`getMin\` be called on an empty stack? | Decide: throw, return a sentinel, or assume valid calls only. |
| Can values repeat? | Duplicates of the minimum are where the two-stack version breaks if you use \`<\` instead of \`<=\`. |
| What is the value range? | Matters for overflow if you use the memory-saving "encoded difference" trick in a fixed-width integer type. |
| Is memory tight? | The pair version stores two numbers per element; the two-stack version usually stores fewer. |

## 3. The Core Idea

**Why one variable is not enough.** Keep \`currentMin\` and update it on push: easy. But when you pop the minimum, what is the new minimum? The variable has forgotten. You would have to scan the whole stack, which is O(n).

**The fix: remember the minimum at every height.** When you push a value, also store "the minimum of everything at or below this point", which is \`min(value, previous top minimum)\`. Popping removes that snapshot along with the value, and the entry underneath already holds the right answer for the smaller stack.

📌 **Interview term: Running minimum (prefix minimum)** — the smallest value seen so far, recorded at each position. On a stack, "so far" means "at or below this entry".

📌 **Interview term: Invariant** — a fact that is true after every operation. Here: *the top entry always stores the minimum of the whole stack.*

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="A stack of pairs after pushing minus 2, 0 and minus 3. Each entry stores its value and the minimum at or below it. After one pop the new top already knows the minimum is minus 2">
  <defs>
    <marker id="b11q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="170" y="36" text-anchor="middle">after push -2, 0, -3</text>
  <rect class="d-box-accent" x="60" y="60" width="220" height="36" rx="6"/>
  <text class="d-text" x="120" y="83" text-anchor="middle">value -3</text>
  <text class="d-sub" x="220" y="83" text-anchor="middle">min -3</text>
  <rect class="d-box" x="60" y="104" width="220" height="36" rx="6"/>
  <text class="d-text" x="120" y="127" text-anchor="middle">value 0</text>
  <text class="d-sub" x="220" y="127" text-anchor="middle">min -2</text>
  <rect class="d-box" x="60" y="148" width="220" height="36" rx="6"/>
  <text class="d-text" x="120" y="171" text-anchor="middle">value -2</text>
  <text class="d-sub" x="220" y="171" text-anchor="middle">min -2</text>
  <path class="d-edge" d="M 50 194 L 290 194"/>
  <text class="d-sub" x="170" y="224" text-anchor="middle">getMin reads the top: -3</text>

  <path class="d-edge" d="M 300 122 L 356 122" marker-end="url(#b11q3-arrow)"/>
  <text class="d-sub" x="328" y="108" text-anchor="middle">pop</text>

  <text class="d-text" x="490" y="36" text-anchor="middle">after pop()</text>
  <rect class="d-box-accent" x="380" y="104" width="220" height="36" rx="6"/>
  <text class="d-text" x="440" y="127" text-anchor="middle">value 0</text>
  <text class="d-sub" x="540" y="127" text-anchor="middle">min -2</text>
  <rect class="d-box" x="380" y="148" width="220" height="36" rx="6"/>
  <text class="d-text" x="440" y="171" text-anchor="middle">value -2</text>
  <text class="d-sub" x="540" y="171" text-anchor="middle">min -2</text>
  <path class="d-edge" d="M 370 194 L 610 194"/>
  <text class="d-sub" x="490" y="224" text-anchor="middle">getMin reads the top: -2</text>
</svg>

On the left, every entry carries its own minimum, so \`getMin\` just reads the top. After \`pop()\` removes -3, the new top already says -2, with no searching.

**Variant: two stacks.** Instead of a pair on every entry, keep a second stack, \`mins\`, that only receives a value when it is **less than or equal to** the current minimum. On pop, if the popped value equals the top of \`mins\`, pop \`mins\` too.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 290" role="img" aria-label="Two stacks after pushing 3, 5, 2, 2. The values stack holds all four. The mins stack holds 3, 2, 2 because a value is copied there when it is less than or equal to the current minimum">
  <rect class="d-box" x="120" y="94" width="120" height="34" rx="6"/>
  <text class="d-text" x="180" y="116" text-anchor="middle">2</text>
  <rect class="d-box" x="120" y="136" width="120" height="34" rx="6"/>
  <text class="d-text" x="180" y="158" text-anchor="middle">2</text>
  <rect class="d-box" x="120" y="178" width="120" height="34" rx="6"/>
  <text class="d-text" x="180" y="200" text-anchor="middle">5</text>
  <rect class="d-box" x="120" y="220" width="120" height="34" rx="6"/>
  <text class="d-text" x="180" y="242" text-anchor="middle">3</text>
  <path class="d-edge" d="M 110 262 L 250 262"/>
  <text class="d-text" x="180" y="284" text-anchor="middle">values</text>

  <text class="d-sub" x="320" y="140" text-anchor="middle">push x to mins</text>
  <text class="d-sub" x="320" y="162" text-anchor="middle">when x &lt;= min</text>

  <rect class="d-box-accent" x="400" y="136" width="120" height="34" rx="6"/>
  <text class="d-text" x="460" y="158" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="400" y="178" width="120" height="34" rx="6"/>
  <text class="d-text" x="460" y="200" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="400" y="220" width="120" height="34" rx="6"/>
  <text class="d-text" x="460" y="242" text-anchor="middle">3</text>
  <path class="d-edge" d="M 390 262 L 530 262"/>
  <text class="d-text" x="460" y="284" text-anchor="middle">mins</text>
  <text class="d-sub" x="460" y="116" text-anchor="middle">5 was skipped</text>
</svg>

After pushing 3, 5, 2, 2 the \`mins\` stack holds 3, 2, 2: the 5 was skipped because it can never be the minimum while the 3 below it is still there. Both 2s were recorded, which is what the \`<=\` is for: if only one 2 were recorded, popping the first 2 would also pop it from \`mins\`, and the stack would report 3 while a 2 is still inside.

📌 **Interview term: Auxiliary stack** — a helper stack kept in step with the main one to answer a query (here, the minimum) in O(1).

## 4. Comparing the Designs

| Design | push / pop / top / getMin | Extra memory | Watch out for |
| :--- | :--- | :--- | :--- |
| Scan on \`getMin\` | O(1) / O(1) / O(1) / **O(n)** | none | Fails the O(1) requirement |
| One \`currentMin\` variable | O(1) each, but **wrong after popping the minimum** | O(1) | Cannot recover the previous minimum |
| Stack of (value, min) pairs | O(1) each | always n extra numbers | Simplest to get right |
| Two stacks (\`mins\` on \`<=\`) | O(1) each | between 1 and n extra numbers | Must use \`<=\`, not \`<\` |

Example 2 runs the duplicate case: with \`<=\` the minimum after \`push 1, push 1, pop\` is still 1; with \`<\` the \`mins\` stack is already empty, which is the bug. It also counts memory for the pushes 5, 6, 7, 8, 1, 2, 3: the pair stack stores 14 numbers, the two-stack version 9 (seven values plus the two minimums 5 and 1).

## 5. The Python Implementation

~~~python
class MinStack:
    """Each entry stores (value, minimum of everything at or below it)."""

    def __init__(self):
        self.stack = []

    def push(self, val):
        current_min = val if not self.stack else min(val, self.stack[-1][1])
        self.stack.append((val, current_min))

    def pop(self):
        return self.stack.pop()[0]

    def top(self):
        return self.stack[-1][0]

    def get_min(self):
        return self.stack[-1][1]
~~~

The Python details that matter:

- **A list of tuples.** \`self.stack.append((val, current_min))\` pushes a pair; \`self.stack[-1][1]\` reads the stored minimum of the top entry; \`self.stack.pop()[0]\` removes the pair and returns its value. Tuples are immutable, which suits a snapshot that must never change.
- **\`min(val, self.stack[-1][1])\`.** The built-in \`min\` with two arguments is O(1). The trap is \`min(self.stack)\` or \`min(v for v, _ in self.stack)\`, which scans every element: O(n).
- **The empty case.** On an empty list, \`self.stack[-1]\` raises \`IndexError: list index out of range\` and \`self.stack.pop()\` raises \`IndexError: pop from empty list\`. That is a reasonable error for an empty stack; if you want a clearer message, check \`if not self.stack: raise IndexError("get_min from empty stack")\`.
- **Naming.** Python style is \`get_min\`; LeetCode's Python template uses \`getMin\`. Say which one you are using.

**Two-stack version in Python** (from Example 2): \`self.values\` and \`self.mins\` are two lists; push appends to \`mins\` when \`not self.mins or val <= self.mins[-1]\`, and pop removes from \`mins\` when the popped value \`== self.mins[-1]\`.

**The memory-saving trick, and why Python does not care about overflow.** A well-known variant stores one number per entry: when a new minimum \`x\` arrives it pushes \`2*x - old_min\` instead of \`x\` and sets \`min = x\`, and decodes on pop. In fixed-width languages \`2*x\` can overflow; Python integers grow as needed, so overflow is not a concern. It is clever but harder to explain; the pair version is what most interviewers want first.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`python3 main.py\` (Python 3.13). The same programs in the other three languages print exactly the same lines.

**Example 1 — Min stack of (value, min) pairs, including duplicate minimums** printed:

~~~text
push(-2) -> min=-2
push(0) -> min=-2
push(-3) -> min=-3
getMin() = -3
pop() removed -3
top() = 0
getMin() = -2
after push 5, 3, 3: getMin() = 3
after one pop: getMin() = 3
after two pops: getMin() = 5
~~~

**Example 2 — Two-stack version: the < versus <= bug, and memory use** printed:

~~~text
two stacks with <=: push 1, push 1, pop -> getMin() = 1
two stacks with <: push 1, push 1, pop -> getMin() = EMPTY (bug)
pushed 7 values: pair stack stores 14 numbers, two stacks store 9
~~~

Example 1 reproduces the LeetCode 155 sample (minimum -3, then -2 after the pop) and the duplicate case (3 stays the minimum until both 3s are gone). Example 2 shows the strict \`<\` version losing the minimum, and the memory difference: 14 stored numbers for pairs versus 9 for two stacks.

## 7. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| \`push\` | O(1) | One push plus one comparison (amortised, because the underlying array may grow) |
| \`pop\` | O(1) | One pop (plus at most one pop of \`mins\`) |
| \`top\` | O(1) | Read the top entry |
| \`getMin\` | O(1) | Read the stored minimum at the top |
| Space | O(n) | The pair version stores 2n numbers; the two-stack version stores n plus the number of times a new minimum (or a tie) arrived |

## 8. Edge Cases

- **Duplicates of the minimum** — push 5, 3, 3, pop once: the minimum must still be 3. Example 1 checks exactly this.
- **Strictly increasing pushes** — the minimum never changes; the two-stack version keeps \`mins\` at size 1.
- **Strictly decreasing pushes** — every push is a new minimum; the two-stack version uses as much memory as the pair version.
- **Negative numbers and zero** — handled like any value; no sentinel such as 0 should be used for "no minimum".
- **Empty stack** — \`top\` and \`getMin\` have no answer. Pick a behaviour (throw is usual) and say it.

## Common Pitfalls

- **One \`self.min\` variable.** Correct until you pop the minimum, then wrong. The minimum must be stored per entry (or per change).
- **\`min(self.stack)\` inside \`get_min\`.** Looks O(1) because it is one line, but it is O(n).
- **Using \`<\` in the two-stack version.** Example 2 shows \`push 1, push 1, pop\` leaving \`mins\` empty.
- **Popping \`mins\` unconditionally.** \`mins\` only holds some values, so pop it only when the popped value equals its top.
- **Using \`float("inf")\` as an empty marker and forgetting it.** It works as an initial minimum, but then \`get_min\` on an empty stack returns \`inf\` silently instead of failing.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">A single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min</code> variable cannot be restored after popping the minimum, and scanning is O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The idea:</strong> <span style="color:#f0e2c8;">Store with every entry the minimum of everything at or below it: push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(val, min(val, top_min))</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get_min</code> reads the top, and a pop automatically restores the previous minimum.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The variant:</strong> <span style="color:#f0e2c8;">Or keep a second <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mins</code> stack that receives a value only when it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> the current minimum, and is popped when the popped value equals its top; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> is essential for duplicates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Python details:</strong> <span style="color:#f0e2c8;">A list of tuples with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-1]</code>; two-argument <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min</code> is O(1) but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min(self.stack)</code> would be O(n); an empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-1]</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IndexError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The cost:</strong> <span style="color:#f0e2c8;">All four operations O(1); O(n) extra space, 2n numbers for pairs and fewer for the two-stack version when minimums change rarely.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just keep one variable for the minimum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After popping the minimum you would need the previous minimum, which the variable has overwritten. Finding it again means scanning, which is O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;=</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;</code> in the two-stack version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With duplicates, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> records only one copy of the minimum; popping the first copy removes it from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mins</code> while another copy is still in the stack. Example 2 shows the stack ending with an empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mins</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you also support <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">get_max</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store a third field, the running maximum, in each tuple: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(val, current_min, current_max)</code>. Same O(1) reasoning.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use O(1) extra space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is an encoding trick that pushes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2*x - min</code> when a new minimum arrives and decodes on pop. In Python there is no overflow risk because ints are arbitrary precision; in Java or C++ you need a wider type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which version would you ship?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The pair version: it is short, obviously correct, and the memory cost is just one extra number per entry. I would mention the two-stack version as an optimisation when most pushes are not new minimums.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Running minimum (prefix minimum)** | The smallest value at or below each stack position, recorded when it is pushed |
| **Invariant** | A fact true after every operation: the top entry stores the minimum of the whole stack |
| **Auxiliary stack** | A helper stack kept in step with the main one to answer a query in O(1) |

---
**Conclusion:** A min stack gets O(1) \`get_min\` by remembering the minimum at every height: each entry stores \`(value, min of everything at or below it)\`, so the top always holds the answer and a pop restores the previous minimum automatically. The two-stack variant saves memory but must push to \`mins\` on \`<=\`, which the runs above show matters for duplicates. In Python a list of tuples is all it takes; just avoid \`min(self.stack)\`, which quietly turns the O(1) query into O(n).`,
        examples: [
          {
            label: "Min stack of (value, min) pairs, including duplicate minimums",
            code: `class MinStack:
    """Each entry stores (value, minimum of everything at or below it)."""

    def __init__(self):
        self.stack = []

    def push(self, val):
        current_min = val if not self.stack else min(val, self.stack[-1][1])
        self.stack.append((val, current_min))

    def pop(self):
        return self.stack.pop()[0]

    def top(self):
        return self.stack[-1][0]

    def get_min(self):
        return self.stack[-1][1]


s = MinStack()
for x in [-2, 0, -3]:
    s.push(x)
    print("push(" + str(x) + ") -> min=" + str(s.get_min()))
print("getMin() = " + str(s.get_min()))
print("pop() removed " + str(s.pop()))
print("top() = " + str(s.top()))
print("getMin() = " + str(s.get_min()))

# Duplicates of the minimum: popping one copy must keep the other.
d = MinStack()
for x in [5, 3, 3]:
    d.push(x)
print("after push 5, 3, 3: getMin() = " + str(d.get_min()))
d.pop()
print("after one pop: getMin() = " + str(d.get_min()))
d.pop()
print("after two pops: getMin() = " + str(d.get_min()))
`,
          },
          {
            label: "Two-stack version: the < versus <= bug, and memory use",
            code: `class TwoStackMin:
    """Values in one stack; a second stack holds only the running minimums."""

    def __init__(self, strict):
        self.strict = strict          # True reproduces the classic "<" bug
        self.values = []
        self.mins = []

    def push(self, val):
        self.values.append(val)
        if not self.mins:
            self.mins.append(val)
        elif (val < self.mins[-1]) if self.strict else (val <= self.mins[-1]):
            self.mins.append(val)

    def pop(self):
        val = self.values.pop()
        if self.mins and val == self.mins[-1]:
            self.mins.pop()
        return val

    def get_min(self):
        return str(self.mins[-1]) if self.mins else "EMPTY (bug)"


for strict, name in [(False, "two stacks with <="), (True, "two stacks with <")]:
    s = TwoStackMin(strict)
    s.push(1)
    s.push(1)
    s.pop()
    print(name + ": push 1, push 1, pop -> getMin() = " + s.get_min())

# Memory: the pair version always stores 2 numbers per element.
data = [5, 6, 7, 8, 1, 2, 3]
t = TwoStackMin(False)
for x in data:
    t.push(x)
print("pushed " + str(len(data)) + " values: pair stack stores " + str(2 * len(data))
      + " numbers, two stacks store " + str(len(t.values) + len(t.mins)))
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Design a MinStack class in JavaScript with push, pop, top and getMin, all in O(1) time. Explain how getMin stays correct after you pop the smallest value."

**What a strong answer should cover:**
- Why a single current-minimum variable fails after popping the minimum.
- Storing [value, min so far] per entry, or an auxiliary \`mins\` stack pushed on \`<=\`.
- All four operations O(1); O(n) extra space and the two-stack memory trade-off.
- The duplicate-minimum case and the \`<\` versus \`<=\` bug.
- JavaScript specifics: arrays as stacks; \`Math.min(...stack)\` is O(n) and spreading a huge array can throw \`RangeError\`; \`Math.min()\` with no arguments returns \`Infinity\`; \`pop()\` on empty returns \`undefined\`.

**Clarifying questions expected:**
- "What should getMin return on an empty stack?"
- "Can values repeat?"

**Code / implementation expected:** Yes — a JavaScript class backed by an array of [value, min] pairs.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a stack is.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this JavaScript version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Picture a pile of exam papers on a teacher's desk. Papers are added and removed only from the top. The head teacher keeps walking in and asking one question: "What is the lowest mark in the pile right now?" Searching the whole pile each time is slow. So the teacher writes a small note in the corner of each paper as it goes on the pile: *"lowest mark from here down: 42"*. Now the answer is always written on the top paper. When a paper is taken off, the paper below it already carries the correct note for the smaller pile.

That is the min stack. The trick, writing down the answer at the time each item arrives so you never have to recompute it, appears all over interviews and real systems: undo stacks that remember state, the running maximum in a sliding window, and expression evaluators. The question tests whether you see that a single "current minimum" variable is not enough, because it cannot be restored after a pop.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which operations: \`push\`, \`pop\`, \`top\`, \`getMin\`? All O(1)? | That is the standard LeetCode 155 contract; all four must be constant time. |
| Can \`pop\`, \`top\` or \`getMin\` be called on an empty stack? | Decide: throw, return a sentinel, or assume valid calls only. |
| Can values repeat? | Duplicates of the minimum are where the two-stack version breaks if you use \`<\` instead of \`<=\`. |
| What is the value range? | Matters for overflow if you use the memory-saving "encoded difference" trick in a fixed-width integer type. |
| Is memory tight? | The pair version stores two numbers per element; the two-stack version usually stores fewer. |

## 3. The Core Idea

**Why one variable is not enough.** Keep \`currentMin\` and update it on push: easy. But when you pop the minimum, what is the new minimum? The variable has forgotten. You would have to scan the whole stack, which is O(n).

**The fix: remember the minimum at every height.** When you push a value, also store "the minimum of everything at or below this point", which is \`min(value, previous top minimum)\`. Popping removes that snapshot along with the value, and the entry underneath already holds the right answer for the smaller stack.

📌 **Interview term: Running minimum (prefix minimum)** — the smallest value seen so far, recorded at each position. On a stack, "so far" means "at or below this entry".

📌 **Interview term: Invariant** — a fact that is true after every operation. Here: *the top entry always stores the minimum of the whole stack.*

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="A stack of pairs after pushing minus 2, 0 and minus 3. Each entry stores its value and the minimum at or below it. After one pop the new top already knows the minimum is minus 2">
  <defs>
    <marker id="b11q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="170" y="36" text-anchor="middle">after push -2, 0, -3</text>
  <rect class="d-box-accent" x="60" y="60" width="220" height="36" rx="6"/>
  <text class="d-text" x="120" y="83" text-anchor="middle">value -3</text>
  <text class="d-sub" x="220" y="83" text-anchor="middle">min -3</text>
  <rect class="d-box" x="60" y="104" width="220" height="36" rx="6"/>
  <text class="d-text" x="120" y="127" text-anchor="middle">value 0</text>
  <text class="d-sub" x="220" y="127" text-anchor="middle">min -2</text>
  <rect class="d-box" x="60" y="148" width="220" height="36" rx="6"/>
  <text class="d-text" x="120" y="171" text-anchor="middle">value -2</text>
  <text class="d-sub" x="220" y="171" text-anchor="middle">min -2</text>
  <path class="d-edge" d="M 50 194 L 290 194"/>
  <text class="d-sub" x="170" y="224" text-anchor="middle">getMin reads the top: -3</text>

  <path class="d-edge" d="M 300 122 L 356 122" marker-end="url(#b11q3-arrow)"/>
  <text class="d-sub" x="328" y="108" text-anchor="middle">pop</text>

  <text class="d-text" x="490" y="36" text-anchor="middle">after pop()</text>
  <rect class="d-box-accent" x="380" y="104" width="220" height="36" rx="6"/>
  <text class="d-text" x="440" y="127" text-anchor="middle">value 0</text>
  <text class="d-sub" x="540" y="127" text-anchor="middle">min -2</text>
  <rect class="d-box" x="380" y="148" width="220" height="36" rx="6"/>
  <text class="d-text" x="440" y="171" text-anchor="middle">value -2</text>
  <text class="d-sub" x="540" y="171" text-anchor="middle">min -2</text>
  <path class="d-edge" d="M 370 194 L 610 194"/>
  <text class="d-sub" x="490" y="224" text-anchor="middle">getMin reads the top: -2</text>
</svg>

On the left, every entry carries its own minimum, so \`getMin\` just reads the top. After \`pop()\` removes -3, the new top already says -2, with no searching.

**Variant: two stacks.** Instead of a pair on every entry, keep a second stack, \`mins\`, that only receives a value when it is **less than or equal to** the current minimum. On pop, if the popped value equals the top of \`mins\`, pop \`mins\` too.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 290" role="img" aria-label="Two stacks after pushing 3, 5, 2, 2. The values stack holds all four. The mins stack holds 3, 2, 2 because a value is copied there when it is less than or equal to the current minimum">
  <rect class="d-box" x="120" y="94" width="120" height="34" rx="6"/>
  <text class="d-text" x="180" y="116" text-anchor="middle">2</text>
  <rect class="d-box" x="120" y="136" width="120" height="34" rx="6"/>
  <text class="d-text" x="180" y="158" text-anchor="middle">2</text>
  <rect class="d-box" x="120" y="178" width="120" height="34" rx="6"/>
  <text class="d-text" x="180" y="200" text-anchor="middle">5</text>
  <rect class="d-box" x="120" y="220" width="120" height="34" rx="6"/>
  <text class="d-text" x="180" y="242" text-anchor="middle">3</text>
  <path class="d-edge" d="M 110 262 L 250 262"/>
  <text class="d-text" x="180" y="284" text-anchor="middle">values</text>

  <text class="d-sub" x="320" y="140" text-anchor="middle">push x to mins</text>
  <text class="d-sub" x="320" y="162" text-anchor="middle">when x &lt;= min</text>

  <rect class="d-box-accent" x="400" y="136" width="120" height="34" rx="6"/>
  <text class="d-text" x="460" y="158" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="400" y="178" width="120" height="34" rx="6"/>
  <text class="d-text" x="460" y="200" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="400" y="220" width="120" height="34" rx="6"/>
  <text class="d-text" x="460" y="242" text-anchor="middle">3</text>
  <path class="d-edge" d="M 390 262 L 530 262"/>
  <text class="d-text" x="460" y="284" text-anchor="middle">mins</text>
  <text class="d-sub" x="460" y="116" text-anchor="middle">5 was skipped</text>
</svg>

After pushing 3, 5, 2, 2 the \`mins\` stack holds 3, 2, 2: the 5 was skipped because it can never be the minimum while the 3 below it is still there. Both 2s were recorded, which is what the \`<=\` is for: if only one 2 were recorded, popping the first 2 would also pop it from \`mins\`, and the stack would report 3 while a 2 is still inside.

📌 **Interview term: Auxiliary stack** — a helper stack kept in step with the main one to answer a query (here, the minimum) in O(1).

## 4. Comparing the Designs

| Design | push / pop / top / getMin | Extra memory | Watch out for |
| :--- | :--- | :--- | :--- |
| Scan on \`getMin\` | O(1) / O(1) / O(1) / **O(n)** | none | Fails the O(1) requirement |
| One \`currentMin\` variable | O(1) each, but **wrong after popping the minimum** | O(1) | Cannot recover the previous minimum |
| Stack of (value, min) pairs | O(1) each | always n extra numbers | Simplest to get right |
| Two stacks (\`mins\` on \`<=\`) | O(1) each | between 1 and n extra numbers | Must use \`<=\`, not \`<\` |

Example 2 runs the duplicate case: with \`<=\` the minimum after \`push 1, push 1, pop\` is still 1; with \`<\` the \`mins\` stack is already empty, which is the bug. It also counts memory for the pushes 5, 6, 7, 8, 1, 2, 3: the pair stack stores 14 numbers, the two-stack version 9 (seven values plus the two minimums 5 and 1).

## 5. The JavaScript Implementation

~~~javascript
class MinStack {
  // Each entry stores [value, minimum of everything at or below it].
  constructor() {
    this.stack = [];
  }
  push(val) {
    const n = this.stack.length;
    const currentMin = n === 0 ? val : Math.min(val, this.stack[n - 1][1]);
    this.stack.push([val, currentMin]);
  }
  pop() {
    return this.stack.pop()[0];
  }
  top() {
    return this.stack[this.stack.length - 1][0];
  }
  getMin() {
    return this.stack[this.stack.length - 1][1];
  }
}
~~~

The JavaScript details that matter:

- **An array of two-element arrays.** \`this.stack.push([val, currentMin])\` stores a pair; \`this.stack[this.stack.length - 1][1]\` reads the minimum at the top. Each pair is a small array allocation; if that matters, two parallel arrays (\`values\` and \`mins\`) avoid it.
- **\`Math.min(val, top)\` is O(1)** with two arguments. The trap is \`Math.min(...this.values)\`: it is O(n) per call, and for very large stacks the spread can fail outright. Running this on Node 22:

~~~javascript
console.log(Math.min());
const big = new Array(1000000).fill(1);
try {
  console.log(Math.min(...big));
} catch (e) {
  console.log(e.name + ': ' + e.message);
}
~~~

~~~text
Infinity
RangeError: Maximum call stack size exceeded
~~~

The first line is also worth knowing: \`Math.min()\` with no arguments is \`Infinity\`, so a scan over an empty stack quietly returns \`Infinity\` instead of failing.

- **The empty case.** On an empty stack, \`this.stack[this.stack.length - 1]\` is \`undefined\`, and reading \`[1]\` of \`undefined\` throws a \`TypeError\`. That is a crash with a confusing message; check the length first and throw your own error if the interviewer wants defined behaviour.
- **Numbers.** JavaScript numbers are 64-bit floats, exact for integers up to \`Number.MAX_SAFE_INTEGER\` (2^53 - 1). The pair version only copies values, so precision is never an issue; the "encoded difference" trick computes \`2*x - min\`, which can lose precision for huge values.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`node main.js\` (Node.js 22). The same programs in the other three languages print exactly the same lines.

**Example 1 — Min stack of (value, min) pairs, including duplicate minimums** printed:

~~~text
push(-2) -> min=-2
push(0) -> min=-2
push(-3) -> min=-3
getMin() = -3
pop() removed -3
top() = 0
getMin() = -2
after push 5, 3, 3: getMin() = 3
after one pop: getMin() = 3
after two pops: getMin() = 5
~~~

**Example 2 — Two-stack version: the < versus <= bug, and memory use** printed:

~~~text
two stacks with <=: push 1, push 1, pop -> getMin() = 1
two stacks with <: push 1, push 1, pop -> getMin() = EMPTY (bug)
pushed 7 values: pair stack stores 14 numbers, two stacks store 9
~~~

Example 1 reproduces the LeetCode 155 sample (minimum -3, then -2 after the pop) and the duplicate case (3 stays the minimum until both 3s are gone). Example 2 shows the strict \`<\` version losing the minimum, and the memory difference: 14 stored numbers for pairs versus 9 for two stacks.

## 7. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| \`push\` | O(1) | One push plus one comparison (amortised, because the underlying array may grow) |
| \`pop\` | O(1) | One pop (plus at most one pop of \`mins\`) |
| \`top\` | O(1) | Read the top entry |
| \`getMin\` | O(1) | Read the stored minimum at the top |
| Space | O(n) | The pair version stores 2n numbers; the two-stack version stores n plus the number of times a new minimum (or a tie) arrived |

## 8. Edge Cases

- **Duplicates of the minimum** — push 5, 3, 3, pop once: the minimum must still be 3. Example 1 checks exactly this.
- **Strictly increasing pushes** — the minimum never changes; the two-stack version keeps \`mins\` at size 1.
- **Strictly decreasing pushes** — every push is a new minimum; the two-stack version uses as much memory as the pair version.
- **Negative numbers and zero** — handled like any value; no sentinel such as 0 should be used for "no minimum".
- **Empty stack** — \`top\` and \`getMin\` have no answer. Pick a behaviour (throw is usual) and say it.

## Common Pitfalls

- **One \`this.min\` variable.** Wrong as soon as you pop the minimum.
- **\`Math.min(...this.stack)\` in \`getMin\`.** O(n) per call, and the spread can throw \`RangeError\` for big arrays (shown above).
- **Using \`<\` in the two-stack version.** Example 2 shows \`mins\` ending empty after \`push 1, push 1, pop\`.
- **Comparing with \`==\`.** For numbers \`===\` is the safe default; \`==\` coerces types (for example \`'1' == 1\` is \`true\`), which can hide bugs if string input sneaks in.
- **Silent \`undefined\` on empty.** \`pop()\` returns \`undefined\` and reading \`[0]\` of it throws a \`TypeError\` far from the cause; guard the empty case explicitly.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">A single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min</code> variable cannot be restored after popping the minimum, and scanning is O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The idea:</strong> <span style="color:#f0e2c8;">Store with every entry the minimum at or below it: push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[val, Math.min(val, topMin)]</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getMin</code> reads the top, and popping restores the previous minimum for free.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The variant:</strong> <span style="color:#f0e2c8;">Or keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mins</code> stack that receives a value only when it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> the current minimum and is popped when the popped value equals its top; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> handles duplicates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. JavaScript details:</strong> <span style="color:#f0e2c8;">Arrays as stacks; two-argument <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.min</code> is O(1), but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.min(...arr)</code> is O(n) and can throw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code> on huge arrays; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> on empty returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>, so I guard it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The cost:</strong> <span style="color:#f0e2c8;">All four operations O(1); O(n) extra space, 2n numbers for pairs and fewer for two stacks.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not one variable for the minimum?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Popping the minimum would require the previous minimum, which the variable no longer has; recovering it means an O(n) scan.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;=</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With duplicate minimums, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> records only one copy, so popping the first copy empties <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mins</code> too early. Example 2 shows the result: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mins</code> is empty while a 1 is still on the stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Pairs or parallel arrays?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Parallel arrays (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">values</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mins</code>, pushed together) avoid allocating a small array per push and read slightly more clearly in a debugger; the logic is identical.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about the O(1) extra space trick?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It stores <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2*x - min</code> when a new minimum arrives. In JavaScript that arithmetic is exact only up to 2^53 - 1, so for very large values it can lose precision; BigInt would fix it but complicates the code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you add <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">getMax</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store a third value, the running maximum, in each entry, or keep a parallel <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxs</code> stack pushed on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;=</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Running minimum (prefix minimum)** | The smallest value at or below each stack position, recorded when it is pushed |
| **Invariant** | A fact true after every operation: the top entry stores the minimum of the whole stack |
| **Auxiliary stack** | A helper stack kept in step with the main one to answer a query in O(1) |

---
**Conclusion:** A min stack gets O(1) \`getMin\` by remembering the minimum at every height: each entry stores \`[value, min at or below it]\`, so the top always holds the answer and a pop restores the previous minimum. The two-stack variant saves memory but must use \`<=\` for duplicates, as the runs above show. In JavaScript arrays do the job; avoid \`Math.min(...stack)\`, which is O(n) and threw \`RangeError\` on a million-element array in Node 22.`,
        examples: [
          {
            label: "Min stack of (value, min) pairs, including duplicate minimums",
            code: `class MinStack {
  // Each entry stores [value, minimum of everything at or below it].
  constructor() {
    this.stack = [];
  }
  push(val) {
    const n = this.stack.length;
    const currentMin = n === 0 ? val : Math.min(val, this.stack[n - 1][1]);
    this.stack.push([val, currentMin]);
  }
  pop() {
    return this.stack.pop()[0];
  }
  top() {
    return this.stack[this.stack.length - 1][0];
  }
  getMin() {
    return this.stack[this.stack.length - 1][1];
  }
}

const s = new MinStack();
for (const x of [-2, 0, -3]) {
  s.push(x);
  console.log('push(' + x + ') -> min=' + s.getMin());
}
console.log('getMin() = ' + s.getMin());
console.log('pop() removed ' + s.pop());
console.log('top() = ' + s.top());
console.log('getMin() = ' + s.getMin());

// Duplicates of the minimum: popping one copy must keep the other.
const d = new MinStack();
for (const x of [5, 3, 3]) d.push(x);
console.log('after push 5, 3, 3: getMin() = ' + d.getMin());
d.pop();
console.log('after one pop: getMin() = ' + d.getMin());
d.pop();
console.log('after two pops: getMin() = ' + d.getMin());
`,
          },
          {
            label: "Two-stack version: the < versus <= bug, and memory use",
            code: `class TwoStackMin {
  // Values in one stack; a second stack holds only the running minimums.
  constructor(strict) {
    this.strict = strict;   // true reproduces the classic "<" bug
    this.values = [];
    this.mins = [];
  }
  push(val) {
    this.values.push(val);
    const top = this.mins[this.mins.length - 1];
    if (this.mins.length === 0 || (this.strict ? val < top : val <= top)) {
      this.mins.push(val);
    }
  }
  pop() {
    const val = this.values.pop();
    if (this.mins.length > 0 && val === this.mins[this.mins.length - 1]) this.mins.pop();
    return val;
  }
  getMin() {
    return this.mins.length > 0 ? String(this.mins[this.mins.length - 1]) : 'EMPTY (bug)';
  }
}

for (const [strict, name] of [[false, 'two stacks with <='], [true, 'two stacks with <']]) {
  const s = new TwoStackMin(strict);
  s.push(1);
  s.push(1);
  s.pop();
  console.log(name + ': push 1, push 1, pop -> getMin() = ' + s.getMin());
}

// Memory: the pair version always stores 2 numbers per element.
const data = [5, 6, 7, 8, 1, 2, 3];
const t = new TwoStackMin(false);
for (const x of data) t.push(x);
console.log('pushed ' + data.length + ' values: pair stack stores ' + 2 * data.length +
  ' numbers, two stacks store ' + (t.values.length + t.mins.length));
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Design a MinStack class in Java with push, pop, top and getMin for int values, all in O(1) time. How do you keep getMin correct after a pop, and what would you watch out for with boxed Integers?"

**What a strong answer should cover:**
- Why one \`min\` field fails after popping the minimum.
- Storing {value, min so far} per entry, or an auxiliary \`mins\` stack pushed on \`<=\`.
- All four operations O(1); O(n) extra space and the two-stack trade-off.
- Duplicates and the \`<\` versus \`<=\` bug.
- Java specifics: \`Deque<int[]>\` or two \`Deque<Integer>\`s with \`ArrayDeque\`; comparing two \`Integer\`s with \`==\` compares references and fails outside the -128 to 127 cache; \`int\` overflow in the encoded-difference trick (use \`long\`); \`Integer.MAX_VALUE\` as a sentinel is a real value.

**Clarifying questions expected:**
- "Should getMin on an empty stack throw?"
- "Can values repeat, and what is their range?"

**Code / implementation expected:** Yes — a Java class with a \`Deque<int[]>\` of {value, min} pairs, or two \`ArrayDeque\`s.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a stack is.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Java version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Picture a pile of exam papers on a teacher's desk. Papers are added and removed only from the top. The head teacher keeps walking in and asking one question: "What is the lowest mark in the pile right now?" Searching the whole pile each time is slow. So the teacher writes a small note in the corner of each paper as it goes on the pile: *"lowest mark from here down: 42"*. Now the answer is always written on the top paper. When a paper is taken off, the paper below it already carries the correct note for the smaller pile.

That is the min stack. The trick, writing down the answer at the time each item arrives so you never have to recompute it, appears all over interviews and real systems: undo stacks that remember state, the running maximum in a sliding window, and expression evaluators. The question tests whether you see that a single "current minimum" variable is not enough, because it cannot be restored after a pop.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which operations: \`push\`, \`pop\`, \`top\`, \`getMin\`? All O(1)? | That is the standard LeetCode 155 contract; all four must be constant time. |
| Can \`pop\`, \`top\` or \`getMin\` be called on an empty stack? | Decide: throw, return a sentinel, or assume valid calls only. |
| Can values repeat? | Duplicates of the minimum are where the two-stack version breaks if you use \`<\` instead of \`<=\`. |
| What is the value range? | Matters for overflow if you use the memory-saving "encoded difference" trick in a fixed-width integer type. |
| Is memory tight? | The pair version stores two numbers per element; the two-stack version usually stores fewer. |

## 3. The Core Idea

**Why one variable is not enough.** Keep \`currentMin\` and update it on push: easy. But when you pop the minimum, what is the new minimum? The variable has forgotten. You would have to scan the whole stack, which is O(n).

**The fix: remember the minimum at every height.** When you push a value, also store "the minimum of everything at or below this point", which is \`min(value, previous top minimum)\`. Popping removes that snapshot along with the value, and the entry underneath already holds the right answer for the smaller stack.

📌 **Interview term: Running minimum (prefix minimum)** — the smallest value seen so far, recorded at each position. On a stack, "so far" means "at or below this entry".

📌 **Interview term: Invariant** — a fact that is true after every operation. Here: *the top entry always stores the minimum of the whole stack.*

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="A stack of pairs after pushing minus 2, 0 and minus 3. Each entry stores its value and the minimum at or below it. After one pop the new top already knows the minimum is minus 2">
  <defs>
    <marker id="b11q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="170" y="36" text-anchor="middle">after push -2, 0, -3</text>
  <rect class="d-box-accent" x="60" y="60" width="220" height="36" rx="6"/>
  <text class="d-text" x="120" y="83" text-anchor="middle">value -3</text>
  <text class="d-sub" x="220" y="83" text-anchor="middle">min -3</text>
  <rect class="d-box" x="60" y="104" width="220" height="36" rx="6"/>
  <text class="d-text" x="120" y="127" text-anchor="middle">value 0</text>
  <text class="d-sub" x="220" y="127" text-anchor="middle">min -2</text>
  <rect class="d-box" x="60" y="148" width="220" height="36" rx="6"/>
  <text class="d-text" x="120" y="171" text-anchor="middle">value -2</text>
  <text class="d-sub" x="220" y="171" text-anchor="middle">min -2</text>
  <path class="d-edge" d="M 50 194 L 290 194"/>
  <text class="d-sub" x="170" y="224" text-anchor="middle">getMin reads the top: -3</text>

  <path class="d-edge" d="M 300 122 L 356 122" marker-end="url(#b11q3-arrow)"/>
  <text class="d-sub" x="328" y="108" text-anchor="middle">pop</text>

  <text class="d-text" x="490" y="36" text-anchor="middle">after pop()</text>
  <rect class="d-box-accent" x="380" y="104" width="220" height="36" rx="6"/>
  <text class="d-text" x="440" y="127" text-anchor="middle">value 0</text>
  <text class="d-sub" x="540" y="127" text-anchor="middle">min -2</text>
  <rect class="d-box" x="380" y="148" width="220" height="36" rx="6"/>
  <text class="d-text" x="440" y="171" text-anchor="middle">value -2</text>
  <text class="d-sub" x="540" y="171" text-anchor="middle">min -2</text>
  <path class="d-edge" d="M 370 194 L 610 194"/>
  <text class="d-sub" x="490" y="224" text-anchor="middle">getMin reads the top: -2</text>
</svg>

On the left, every entry carries its own minimum, so \`getMin\` just reads the top. After \`pop()\` removes -3, the new top already says -2, with no searching.

**Variant: two stacks.** Instead of a pair on every entry, keep a second stack, \`mins\`, that only receives a value when it is **less than or equal to** the current minimum. On pop, if the popped value equals the top of \`mins\`, pop \`mins\` too.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 290" role="img" aria-label="Two stacks after pushing 3, 5, 2, 2. The values stack holds all four. The mins stack holds 3, 2, 2 because a value is copied there when it is less than or equal to the current minimum">
  <rect class="d-box" x="120" y="94" width="120" height="34" rx="6"/>
  <text class="d-text" x="180" y="116" text-anchor="middle">2</text>
  <rect class="d-box" x="120" y="136" width="120" height="34" rx="6"/>
  <text class="d-text" x="180" y="158" text-anchor="middle">2</text>
  <rect class="d-box" x="120" y="178" width="120" height="34" rx="6"/>
  <text class="d-text" x="180" y="200" text-anchor="middle">5</text>
  <rect class="d-box" x="120" y="220" width="120" height="34" rx="6"/>
  <text class="d-text" x="180" y="242" text-anchor="middle">3</text>
  <path class="d-edge" d="M 110 262 L 250 262"/>
  <text class="d-text" x="180" y="284" text-anchor="middle">values</text>

  <text class="d-sub" x="320" y="140" text-anchor="middle">push x to mins</text>
  <text class="d-sub" x="320" y="162" text-anchor="middle">when x &lt;= min</text>

  <rect class="d-box-accent" x="400" y="136" width="120" height="34" rx="6"/>
  <text class="d-text" x="460" y="158" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="400" y="178" width="120" height="34" rx="6"/>
  <text class="d-text" x="460" y="200" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="400" y="220" width="120" height="34" rx="6"/>
  <text class="d-text" x="460" y="242" text-anchor="middle">3</text>
  <path class="d-edge" d="M 390 262 L 530 262"/>
  <text class="d-text" x="460" y="284" text-anchor="middle">mins</text>
  <text class="d-sub" x="460" y="116" text-anchor="middle">5 was skipped</text>
</svg>

After pushing 3, 5, 2, 2 the \`mins\` stack holds 3, 2, 2: the 5 was skipped because it can never be the minimum while the 3 below it is still there. Both 2s were recorded, which is what the \`<=\` is for: if only one 2 were recorded, popping the first 2 would also pop it from \`mins\`, and the stack would report 3 while a 2 is still inside.

📌 **Interview term: Auxiliary stack** — a helper stack kept in step with the main one to answer a query (here, the minimum) in O(1).

## 4. Comparing the Designs

| Design | push / pop / top / getMin | Extra memory | Watch out for |
| :--- | :--- | :--- | :--- |
| Scan on \`getMin\` | O(1) / O(1) / O(1) / **O(n)** | none | Fails the O(1) requirement |
| One \`currentMin\` variable | O(1) each, but **wrong after popping the minimum** | O(1) | Cannot recover the previous minimum |
| Stack of (value, min) pairs | O(1) each | always n extra numbers | Simplest to get right |
| Two stacks (\`mins\` on \`<=\`) | O(1) each | between 1 and n extra numbers | Must use \`<=\`, not \`<\` |

Example 2 runs the duplicate case: with \`<=\` the minimum after \`push 1, push 1, pop\` is still 1; with \`<\` the \`mins\` stack is already empty, which is the bug. It also counts memory for the pushes 5, 6, 7, 8, 1, 2, 3: the pair stack stores 14 numbers, the two-stack version 9 (seven values plus the two minimums 5 and 1).

## 5. The Java Implementation

~~~java
static class MinStack {
    // Each entry stores {value, minimum of everything at or below it}.
    private final Deque<int[]> stack = new ArrayDeque<>();

    void push(int val) {
        int currentMin = stack.isEmpty() ? val : Math.min(val, stack.peek()[1]);
        stack.push(new int[] {val, currentMin});
    }
    int pop() { return stack.pop()[0]; }
    int top() { return stack.peek()[0]; }
    int getMin() { return stack.peek()[1]; }
}
~~~

The Java details that matter:

- **\`Deque<int[]>\` with \`ArrayDeque\`.** Each entry is a two-element \`int[]\` holding the value and the minimum. \`ArrayDeque\` is the recommended stack in Java (the [\`Stack\` javadoc](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Stack.html) itself says to prefer \`Deque\`). \`stack.peek()[1]\` reads the minimum at the top.
- **No boxing in the comparisons.** Because the values sit in \`int[]\`, \`Math.min(val, stack.peek()[1])\` compares primitives. Nothing can go wrong with object identity.
- **The two-stack version needs care.** With \`Deque<Integer> values, mins\`, the line \`if (values.pop() == mins.peek())\` compares two \`Integer\` objects by reference. \`Integer.valueOf\` is documented to cache only -128 to 127, so for larger values the two objects are different and \`==\` is \`false\`. This program is that bug:

~~~java
import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    static Deque<Integer> values = new ArrayDeque<>(), mins = new ArrayDeque<>();

    static void push(int x) {
        values.push(x);
        if (mins.isEmpty() || x <= mins.peek()) mins.push(x);
    }

    static void popBuggy() {
        if (values.pop() == mins.peek()) mins.pop();   // Integer == Integer: compares references
    }

    public static void main(String[] args) {
        push(1000);
        push(2000);
        push(500);
        popBuggy();                       // 500 is outside the -128..127 cache
        System.out.println("getMin() after popping 500 = " + mins.peek());
    }
}
~~~

~~~text
getMin() after popping 500 = 500
~~~

500 was popped, yet \`getMin()\` still says 500, because \`mins\` was never popped. The fix in Example 2 is \`int val = values.pop();\` first, so the comparison \`val == mins.peek()\` unboxes \`mins.peek()\` and compares numbers (or use \`.equals\`).

📌 **Interview term: Integer cache** — \`Integer.valueOf\` (used by autoboxing) returns shared objects for -128 to 127, so \`==\` on boxed values looks correct for small numbers and fails for larger ones.

- **Overflow.** The pair version only copies values, so it never overflows. The memory-saving "encoded difference" trick computes \`2L * x - min\`; in \`int\` arithmetic that can overflow silently, so it needs \`long\`.
- **The empty case.** \`stack.peek()\` returns \`null\` on an empty \`ArrayDeque\`, so \`stack.peek()[1]\` throws \`NullPointerException\`. Check \`isEmpty()\` and throw \`EmptyStackException\` or \`NoSuchElementException\` with a clear message if the interviewer wants defined behaviour.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`javac Main.java && java Main\` (OpenJDK 21 (javac 21)). The same programs in the other three languages print exactly the same lines.

**Example 1 — Min stack of (value, min) pairs, including duplicate minimums** printed:

~~~text
push(-2) -> min=-2
push(0) -> min=-2
push(-3) -> min=-3
getMin() = -3
pop() removed -3
top() = 0
getMin() = -2
after push 5, 3, 3: getMin() = 3
after one pop: getMin() = 3
after two pops: getMin() = 5
~~~

**Example 2 — Two-stack version: the < versus <= bug, and memory use** printed:

~~~text
two stacks with <=: push 1, push 1, pop -> getMin() = 1
two stacks with <: push 1, push 1, pop -> getMin() = EMPTY (bug)
pushed 7 values: pair stack stores 14 numbers, two stacks store 9
~~~

Example 1 reproduces the LeetCode 155 sample (minimum -3, then -2 after the pop) and the duplicate case (3 stays the minimum until both 3s are gone). Example 2 shows the strict \`<\` version losing the minimum, and the memory difference: 14 stored numbers for pairs versus 9 for two stacks.

## 7. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| \`push\` | O(1) | One push plus one comparison (amortised, because the underlying array may grow) |
| \`pop\` | O(1) | One pop (plus at most one pop of \`mins\`) |
| \`top\` | O(1) | Read the top entry |
| \`getMin\` | O(1) | Read the stored minimum at the top |
| Space | O(n) | The pair version stores 2n numbers; the two-stack version stores n plus the number of times a new minimum (or a tie) arrived |

## 8. Edge Cases

- **Duplicates of the minimum** — push 5, 3, 3, pop once: the minimum must still be 3. Example 1 checks exactly this.
- **Strictly increasing pushes** — the minimum never changes; the two-stack version keeps \`mins\` at size 1.
- **Strictly decreasing pushes** — every push is a new minimum; the two-stack version uses as much memory as the pair version.
- **Negative numbers and zero** — handled like any value; no sentinel such as 0 should be used for "no minimum".
- **Empty stack** — \`top\` and \`getMin\` have no answer. Pick a behaviour (throw is usual) and say it.

## Common Pitfalls

- **\`Integer == Integer\` in the two-stack version.** Works in small tests (values under 128), fails for 500, as shown above. Unbox to \`int\` first or use \`equals\`.
- **One \`min\` field.** Wrong after popping the minimum.
- **Using \`<\` instead of \`<=\`.** Example 2 shows \`mins\` empty after \`push 1, push 1, pop\`.
- **\`Integer.MAX_VALUE\` as "no minimum yet".** It is a legal value; pushing it then makes the empty and non-empty states indistinguishable. Use an emptiness check.
- **\`int\` overflow in the encoding trick.** \`2 * x - min\` overflows for large inputs without any error; use \`long\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">A single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min</code> field cannot be restored after popping the minimum, and scanning is O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The idea:</strong> <span style="color:#f0e2c8;">Store with every entry the minimum at or below it, as an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]{val, min}</code> in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deque&lt;int[]&gt;</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getMin</code> reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek()[1]</code> and popping restores the previous minimum.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The variant:</strong> <span style="color:#f0e2c8;">Or two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque&lt;Integer&gt;</code>s where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mins</code> receives a value only when it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> the current minimum and is popped when the popped value equals its top.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Java details:</strong> <span style="color:#f0e2c8;">In the two-stack version I unbox before comparing, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer == Integer</code> compares references and fails above 127; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">peek()</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> on empty, so I guard it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The cost:</strong> <span style="color:#f0e2c8;">All four operations O(1); O(n) extra space; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> grows its array, so push is amortised O(1).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did your two-stack version pass small tests but fail on large numbers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">values.pop() == mins.peek()</code> compared two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> references. Autoboxing caches -128 to 127, so small values share objects and compare equal; 500 does not. Unbox first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;=</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With duplicates, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> records one copy of the minimum; popping the first copy then removes it from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mins</code> while another copy remains.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Deque&lt;int[]&gt;</code> instead of a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Pair</code> class?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either is fine. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> avoids boxing and needs no extra class; a small <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">record Entry(int val, int min)</code> reads better in a code review.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use O(1) extra space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes with the encoding trick that pushes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2*x - min</code> for a new minimum, but in Java the arithmetic must be done in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> to avoid silent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> overflow.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it thread-safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Concurrent pushes could interleave the read of the old minimum and the push. You would synchronise the methods or use a lock.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Running minimum (prefix minimum)** | The smallest value at or below each stack position, recorded when it is pushed |
| **Invariant** | A fact true after every operation: the top entry stores the minimum of the whole stack |
| **Auxiliary stack** | A helper stack kept in step with the main one to answer a query in O(1) |
| **Integer cache** | Shared \`Integer\` objects for -128 to 127, which makes \`==\` look correct only for small values |

---
**Conclusion:** A min stack gets O(1) \`getMin\` by remembering the minimum at every height: a \`Deque<int[]>\` of \`{value, min}\` pairs keeps the answer on top and restores it on pop. The two-stack variant saves memory but needs \`<=\` for duplicates and, in Java, an unboxed comparison: the run above shows \`Integer == Integer\` silently failing for 500. Mention \`long\` arithmetic if you bring up the encoding trick.`,
        examples: [
          {
            label: "Min stack of (value, min) pairs, including duplicate minimums",
            code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    static class MinStack {
        // Each entry stores {value, minimum of everything at or below it}.
        private final Deque<int[]> stack = new ArrayDeque<>();

        void push(int val) {
            int currentMin = stack.isEmpty() ? val : Math.min(val, stack.peek()[1]);
            stack.push(new int[] {val, currentMin});
        }
        int pop() { return stack.pop()[0]; }
        int top() { return stack.peek()[0]; }
        int getMin() { return stack.peek()[1]; }
    }

    public static void main(String[] args) {
        MinStack s = new MinStack();
        for (int x : new int[] {-2, 0, -3}) {
            s.push(x);
            System.out.println("push(" + x + ") -> min=" + s.getMin());
        }
        System.out.println("getMin() = " + s.getMin());
        System.out.println("pop() removed " + s.pop());
        System.out.println("top() = " + s.top());
        System.out.println("getMin() = " + s.getMin());

        // Duplicates of the minimum: popping one copy must keep the other.
        MinStack d = new MinStack();
        for (int x : new int[] {5, 3, 3}) d.push(x);
        System.out.println("after push 5, 3, 3: getMin() = " + d.getMin());
        d.pop();
        System.out.println("after one pop: getMin() = " + d.getMin());
        d.pop();
        System.out.println("after two pops: getMin() = " + d.getMin());
    }
}
`,
          },
          {
            label: "Two-stack version: the < versus <= bug, and memory use",
            code: `import java.util.ArrayDeque;
import java.util.Deque;

public class Main {
    static class TwoStackMin {
        // Values in one stack; a second stack holds only the running minimums.
        final boolean strict;                 // true reproduces the classic "<" bug
        final Deque<Integer> values = new ArrayDeque<>();
        final Deque<Integer> mins = new ArrayDeque<>();

        TwoStackMin(boolean strict) { this.strict = strict; }

        void push(int val) {
            values.push(val);
            if (mins.isEmpty() || (strict ? val < mins.peek() : val <= mins.peek())) mins.push(val);
        }

        int pop() {
            int val = values.pop();           // unbox to int BEFORE comparing
            if (!mins.isEmpty() && val == mins.peek()) mins.pop();
            return val;
        }

        String getMin() { return mins.isEmpty() ? "EMPTY (bug)" : String.valueOf(mins.peek()); }
    }

    public static void main(String[] args) {
        boolean[] modes = {false, true};
        String[] names = {"two stacks with <=", "two stacks with <"};
        for (int i = 0; i < 2; i++) {
            TwoStackMin s = new TwoStackMin(modes[i]);
            s.push(1);
            s.push(1);
            s.pop();
            System.out.println(names[i] + ": push 1, push 1, pop -> getMin() = " + s.getMin());
        }

        // Memory: the pair version always stores 2 numbers per element.
        int[] data = {5, 6, 7, 8, 1, 2, 3};
        TwoStackMin t = new TwoStackMin(false);
        for (int x : data) t.push(x);
        System.out.println("pushed " + data.length + " values: pair stack stores " + 2 * data.length
            + " numbers, two stacks store " + (t.values.size() + t.mins.size()));
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Design a MinStack class in C++ with push, pop, top and getMin for ints, each in O(1) time. How does getMin stay correct after pop, and what happens if someone calls it on an empty stack?"

**What a strong answer should cover:**
- Why one \`min\` member fails after popping the minimum.
- Storing {value, min so far} per entry, or an auxiliary \`mins\` stack pushed on \`<=\`.
- All four operations O(1); O(n) extra space and the two-stack trade-off.
- Duplicates and the \`<\` versus \`<=\` bug.
- C++ specifics: \`std::stack<std::pair<int,int>>\`; \`pop()\` returns \`void\` so read \`top()\` first; \`top()\` on empty is undefined behaviour; signed overflow in the encoded-difference trick is undefined behaviour, so use \`long long\`; \`INT_MAX\` as a sentinel is a real value.

**Clarifying questions expected:**
- "Can I assume getMin is never called on an empty stack?"
- "Can values repeat, and what is their range?"

**Code / implementation expected:** Yes — a C++ class wrapping \`std::stack<std::pair<int, int>>\`.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a stack is.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this C++ version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Picture a pile of exam papers on a teacher's desk. Papers are added and removed only from the top. The head teacher keeps walking in and asking one question: "What is the lowest mark in the pile right now?" Searching the whole pile each time is slow. So the teacher writes a small note in the corner of each paper as it goes on the pile: *"lowest mark from here down: 42"*. Now the answer is always written on the top paper. When a paper is taken off, the paper below it already carries the correct note for the smaller pile.

That is the min stack. The trick, writing down the answer at the time each item arrives so you never have to recompute it, appears all over interviews and real systems: undo stacks that remember state, the running maximum in a sliding window, and expression evaluators. The question tests whether you see that a single "current minimum" variable is not enough, because it cannot be restored after a pop.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which operations: \`push\`, \`pop\`, \`top\`, \`getMin\`? All O(1)? | That is the standard LeetCode 155 contract; all four must be constant time. |
| Can \`pop\`, \`top\` or \`getMin\` be called on an empty stack? | Decide: throw, return a sentinel, or assume valid calls only. |
| Can values repeat? | Duplicates of the minimum are where the two-stack version breaks if you use \`<\` instead of \`<=\`. |
| What is the value range? | Matters for overflow if you use the memory-saving "encoded difference" trick in a fixed-width integer type. |
| Is memory tight? | The pair version stores two numbers per element; the two-stack version usually stores fewer. |

## 3. The Core Idea

**Why one variable is not enough.** Keep \`currentMin\` and update it on push: easy. But when you pop the minimum, what is the new minimum? The variable has forgotten. You would have to scan the whole stack, which is O(n).

**The fix: remember the minimum at every height.** When you push a value, also store "the minimum of everything at or below this point", which is \`min(value, previous top minimum)\`. Popping removes that snapshot along with the value, and the entry underneath already holds the right answer for the smaller stack.

📌 **Interview term: Running minimum (prefix minimum)** — the smallest value seen so far, recorded at each position. On a stack, "so far" means "at or below this entry".

📌 **Interview term: Invariant** — a fact that is true after every operation. Here: *the top entry always stores the minimum of the whole stack.*

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="A stack of pairs after pushing minus 2, 0 and minus 3. Each entry stores its value and the minimum at or below it. After one pop the new top already knows the minimum is minus 2">
  <defs>
    <marker id="b11q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="170" y="36" text-anchor="middle">after push -2, 0, -3</text>
  <rect class="d-box-accent" x="60" y="60" width="220" height="36" rx="6"/>
  <text class="d-text" x="120" y="83" text-anchor="middle">value -3</text>
  <text class="d-sub" x="220" y="83" text-anchor="middle">min -3</text>
  <rect class="d-box" x="60" y="104" width="220" height="36" rx="6"/>
  <text class="d-text" x="120" y="127" text-anchor="middle">value 0</text>
  <text class="d-sub" x="220" y="127" text-anchor="middle">min -2</text>
  <rect class="d-box" x="60" y="148" width="220" height="36" rx="6"/>
  <text class="d-text" x="120" y="171" text-anchor="middle">value -2</text>
  <text class="d-sub" x="220" y="171" text-anchor="middle">min -2</text>
  <path class="d-edge" d="M 50 194 L 290 194"/>
  <text class="d-sub" x="170" y="224" text-anchor="middle">getMin reads the top: -3</text>

  <path class="d-edge" d="M 300 122 L 356 122" marker-end="url(#b11q3-arrow)"/>
  <text class="d-sub" x="328" y="108" text-anchor="middle">pop</text>

  <text class="d-text" x="490" y="36" text-anchor="middle">after pop()</text>
  <rect class="d-box-accent" x="380" y="104" width="220" height="36" rx="6"/>
  <text class="d-text" x="440" y="127" text-anchor="middle">value 0</text>
  <text class="d-sub" x="540" y="127" text-anchor="middle">min -2</text>
  <rect class="d-box" x="380" y="148" width="220" height="36" rx="6"/>
  <text class="d-text" x="440" y="171" text-anchor="middle">value -2</text>
  <text class="d-sub" x="540" y="171" text-anchor="middle">min -2</text>
  <path class="d-edge" d="M 370 194 L 610 194"/>
  <text class="d-sub" x="490" y="224" text-anchor="middle">getMin reads the top: -2</text>
</svg>

On the left, every entry carries its own minimum, so \`getMin\` just reads the top. After \`pop()\` removes -3, the new top already says -2, with no searching.

**Variant: two stacks.** Instead of a pair on every entry, keep a second stack, \`mins\`, that only receives a value when it is **less than or equal to** the current minimum. On pop, if the popped value equals the top of \`mins\`, pop \`mins\` too.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 290" role="img" aria-label="Two stacks after pushing 3, 5, 2, 2. The values stack holds all four. The mins stack holds 3, 2, 2 because a value is copied there when it is less than or equal to the current minimum">
  <rect class="d-box" x="120" y="94" width="120" height="34" rx="6"/>
  <text class="d-text" x="180" y="116" text-anchor="middle">2</text>
  <rect class="d-box" x="120" y="136" width="120" height="34" rx="6"/>
  <text class="d-text" x="180" y="158" text-anchor="middle">2</text>
  <rect class="d-box" x="120" y="178" width="120" height="34" rx="6"/>
  <text class="d-text" x="180" y="200" text-anchor="middle">5</text>
  <rect class="d-box" x="120" y="220" width="120" height="34" rx="6"/>
  <text class="d-text" x="180" y="242" text-anchor="middle">3</text>
  <path class="d-edge" d="M 110 262 L 250 262"/>
  <text class="d-text" x="180" y="284" text-anchor="middle">values</text>

  <text class="d-sub" x="320" y="140" text-anchor="middle">push x to mins</text>
  <text class="d-sub" x="320" y="162" text-anchor="middle">when x &lt;= min</text>

  <rect class="d-box-accent" x="400" y="136" width="120" height="34" rx="6"/>
  <text class="d-text" x="460" y="158" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="400" y="178" width="120" height="34" rx="6"/>
  <text class="d-text" x="460" y="200" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="400" y="220" width="120" height="34" rx="6"/>
  <text class="d-text" x="460" y="242" text-anchor="middle">3</text>
  <path class="d-edge" d="M 390 262 L 530 262"/>
  <text class="d-text" x="460" y="284" text-anchor="middle">mins</text>
  <text class="d-sub" x="460" y="116" text-anchor="middle">5 was skipped</text>
</svg>

After pushing 3, 5, 2, 2 the \`mins\` stack holds 3, 2, 2: the 5 was skipped because it can never be the minimum while the 3 below it is still there. Both 2s were recorded, which is what the \`<=\` is for: if only one 2 were recorded, popping the first 2 would also pop it from \`mins\`, and the stack would report 3 while a 2 is still inside.

📌 **Interview term: Auxiliary stack** — a helper stack kept in step with the main one to answer a query (here, the minimum) in O(1).

## 4. Comparing the Designs

| Design | push / pop / top / getMin | Extra memory | Watch out for |
| :--- | :--- | :--- | :--- |
| Scan on \`getMin\` | O(1) / O(1) / O(1) / **O(n)** | none | Fails the O(1) requirement |
| One \`currentMin\` variable | O(1) each, but **wrong after popping the minimum** | O(1) | Cannot recover the previous minimum |
| Stack of (value, min) pairs | O(1) each | always n extra numbers | Simplest to get right |
| Two stacks (\`mins\` on \`<=\`) | O(1) each | between 1 and n extra numbers | Must use \`<=\`, not \`<\` |

Example 2 runs the duplicate case: with \`<=\` the minimum after \`push 1, push 1, pop\` is still 1; with \`<\` the \`mins\` stack is already empty, which is the bug. It also counts memory for the pushes 5, 6, 7, 8, 1, 2, 3: the pair stack stores 14 numbers, the two-stack version 9 (seven values plus the two minimums 5 and 1).

## 5. The C++ Implementation

~~~cpp
class MinStack {
    // Each entry stores {value, minimum of everything at or below it}.
    std::stack<std::pair<int, int>> st;

public:
    void push(int val) {
        int currentMin = st.empty() ? val : std::min(val, st.top().second);
        st.push({val, currentMin});
    }
    int pop() {
        int v = st.top().first;   // std::stack::pop() returns void
        st.pop();
        return v;
    }
    int top() const { return st.top().first; }
    int getMin() const { return st.top().second; }
};
~~~

The C++ details that matter:

- **\`std::stack<std::pair<int, int>>\`.** Each entry stores \`first\` (the value) and \`second\` (the minimum at or below it). \`std::stack\` is a container adapter, by default over \`std::deque\` (the libstdc++ header declares \`template<typename _Tp, typename _Sequence = deque<_Tp> > class stack\`).
- **\`pop()\` returns \`void\`.** So \`MinStack::pop\` reads \`st.top().first\` into \`v\` and then calls \`st.pop()\`.
- **\`const\` member functions.** \`top()\` and \`getMin()\` are marked \`const\` because they do not change the stack; that lets them be called on a \`const MinStack&\`.
- **The empty case.** \`st.top()\` on an empty \`std::stack\` is undefined behaviour: no exception, the program may crash or read garbage. Either document "never call on empty" or add \`if (st.empty()) throw std::out_of_range("empty stack");\`.
- **Overflow.** The pair version only copies values, so it cannot overflow. The memory-saving "encoded difference" trick computes \`2*x - min\`; for \`int\` that can overflow, and signed integer overflow is undefined behaviour in C++, so the arithmetic must be done in \`long long\`.

📌 **Interview term: Undefined behaviour (UB)** — code the standard gives no meaning to, such as \`top()\` on an empty stack or signed \`int\` overflow; the compiler may assume it never happens.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3 with -std=c++17). The same programs in the other three languages print exactly the same lines.

**Example 1 — Min stack of (value, min) pairs, including duplicate minimums** printed:

~~~text
push(-2) -> min=-2
push(0) -> min=-2
push(-3) -> min=-3
getMin() = -3
pop() removed -3
top() = 0
getMin() = -2
after push 5, 3, 3: getMin() = 3
after one pop: getMin() = 3
after two pops: getMin() = 5
~~~

**Example 2 — Two-stack version: the < versus <= bug, and memory use** printed:

~~~text
two stacks with <=: push 1, push 1, pop -> getMin() = 1
two stacks with <: push 1, push 1, pop -> getMin() = EMPTY (bug)
pushed 7 values: pair stack stores 14 numbers, two stacks store 9
~~~

Example 1 reproduces the LeetCode 155 sample (minimum -3, then -2 after the pop) and the duplicate case (3 stays the minimum until both 3s are gone). Example 2 shows the strict \`<\` version losing the minimum, and the memory difference: 14 stored numbers for pairs versus 9 for two stacks.

## 7. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| \`push\` | O(1) | One push plus one comparison (amortised, because the underlying array may grow) |
| \`pop\` | O(1) | One pop (plus at most one pop of \`mins\`) |
| \`top\` | O(1) | Read the top entry |
| \`getMin\` | O(1) | Read the stored minimum at the top |
| Space | O(n) | The pair version stores 2n numbers; the two-stack version stores n plus the number of times a new minimum (or a tie) arrived |

## 8. Edge Cases

- **Duplicates of the minimum** — push 5, 3, 3, pop once: the minimum must still be 3. Example 1 checks exactly this.
- **Strictly increasing pushes** — the minimum never changes; the two-stack version keeps \`mins\` at size 1.
- **Strictly decreasing pushes** — every push is a new minimum; the two-stack version uses as much memory as the pair version.
- **Negative numbers and zero** — handled like any value; no sentinel such as 0 should be used for "no minimum".
- **Empty stack** — \`top\` and \`getMin\` have no answer. Pick a behaviour (throw is usual) and say it.

## Common Pitfalls

- **Calling \`top()\` on an empty stack.** Undefined behaviour, not an exception.
- **Writing \`int v = st.pop();\`.** Does not compile: \`pop()\` returns \`void\`.
- **Using \`<\` in the two-stack version.** Example 2 shows \`mins\` empty after \`push 1, push 1, pop\`.
- **\`INT_MAX\` as "no minimum".** It is a valid \`int\`; pushing it makes empty and non-empty look the same. Check \`empty()\` instead.
- **Signed overflow in the encoding trick.** \`2 * x - min\` in \`int\` is undefined behaviour for large values; use \`long long\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">A single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min</code> member cannot be restored after popping the minimum, and scanning is O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The idea:</strong> <span style="color:#f0e2c8;">Store with every entry the minimum at or below it, as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::pair&lt;int,int&gt;</code> in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getMin</code> reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top().second</code> and popping restores the previous minimum.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The variant:</strong> <span style="color:#f0e2c8;">Or two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt;</code>s where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mins</code> receives a value only when it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> the current minimum and is popped when the popped value equals its back.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. C++ details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop()</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">void</code>, so I read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code> first; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top()</code> on empty is undefined behaviour, so I guard or document it; the encoding trick needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> because signed overflow is UB.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The cost:</strong> <span style="color:#f0e2c8;">All four operations O(1); O(n) extra space.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">getMin</code> is called on an empty stack?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As written, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">st.top()</code> on an empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack</code> is undefined behaviour. I would add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if (st.empty()) throw std::out_of_range(...)</code> or state the precondition.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;=</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&lt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With duplicate minimums, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> records one copy, so popping the first copy pops <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mins</code> too early. Example 2 prints the empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mins</code> this produces.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::pair</code> and not a struct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either works. A small <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">struct Entry { int val; int min; };</code> gives readable member names instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">second</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use O(1) extra space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With the encoding trick that pushes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2*x - min</code> for a new minimum, done in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> so it cannot hit signed overflow, which is undefined behaviour.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::vector</code> be better than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::stack</code> here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is equivalent in cost. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> lets you <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reserve</code> and iterate for debugging; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack</code> restricts the interface to stack operations.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Running minimum (prefix minimum)** | The smallest value at or below each stack position, recorded when it is pushed |
| **Invariant** | A fact true after every operation: the top entry stores the minimum of the whole stack |
| **Auxiliary stack** | A helper stack kept in step with the main one to answer a query in O(1) |
| **Undefined behaviour (UB)** | Code the standard gives no meaning to, such as \`top()\` on empty or signed overflow |

---
**Conclusion:** A min stack gets O(1) \`getMin\` by remembering the minimum at every height: a \`std::stack<std::pair<int,int>>\` keeps \`{value, min}\` so the top always holds the answer and a pop restores the previous one. The two-stack variant saves memory but needs \`<=\` for duplicates. In C++ read \`top()\` before \`pop()\`, never call \`top()\` on an empty stack, and use \`long long\` for the encoding trick because signed overflow is undefined behaviour.`,
        examples: [
          {
            label: "Min stack of (value, min) pairs, including duplicate minimums",
            code: `#include <algorithm>
#include <iostream>
#include <stack>
#include <utility>

class MinStack {
    // Each entry stores {value, minimum of everything at or below it}.
    std::stack<std::pair<int, int>> st;

public:
    void push(int val) {
        int currentMin = st.empty() ? val : std::min(val, st.top().second);
        st.push({val, currentMin});
    }
    int pop() {
        int v = st.top().first;   // std::stack::pop() returns void
        st.pop();
        return v;
    }
    int top() const { return st.top().first; }
    int getMin() const { return st.top().second; }
};

int main() {
    MinStack s;
    for (int x : {-2, 0, -3}) {
        s.push(x);
        std::cout << "push(" << x << ") -> min=" << s.getMin() << "\\n";
    }
    std::cout << "getMin() = " << s.getMin() << "\\n";
    std::cout << "pop() removed " << s.pop() << "\\n";
    std::cout << "top() = " << s.top() << "\\n";
    std::cout << "getMin() = " << s.getMin() << "\\n";

    // Duplicates of the minimum: popping one copy must keep the other.
    MinStack d;
    for (int x : {5, 3, 3}) d.push(x);
    std::cout << "after push 5, 3, 3: getMin() = " << d.getMin() << "\\n";
    d.pop();
    std::cout << "after one pop: getMin() = " << d.getMin() << "\\n";
    d.pop();
    std::cout << "after two pops: getMin() = " << d.getMin() << "\\n";
}
`,
          },
          {
            label: "Two-stack version: the < versus <= bug, and memory use",
            code: `#include <iostream>
#include <string>
#include <vector>

class TwoStackMin {
    // Values in one stack; a second stack holds only the running minimums.
    bool strict;                       // true reproduces the classic "<" bug

public:
    std::vector<int> values, mins;
    explicit TwoStackMin(bool s) : strict(s) {}

    void push(int val) {
        values.push_back(val);
        if (mins.empty() || (strict ? val < mins.back() : val <= mins.back())) mins.push_back(val);
    }
    int pop() {
        int val = values.back();
        values.pop_back();
        if (!mins.empty() && val == mins.back()) mins.pop_back();
        return val;
    }
    std::string getMin() const {
        return mins.empty() ? "EMPTY (bug)" : std::to_string(mins.back());
    }
};

int main() {
    bool modes[] = {false, true};
    const char* names[] = {"two stacks with <=", "two stacks with <"};
    for (int i = 0; i < 2; i++) {
        TwoStackMin s(modes[i]);
        s.push(1);
        s.push(1);
        s.pop();
        std::cout << names[i] << ": push 1, push 1, pop -> getMin() = " << s.getMin() << "\\n";
    }

    // Memory: the pair version always stores 2 numbers per element.
    std::vector<int> data = {5, 6, 7, 8, 1, 2, 3};
    TwoStackMin t(false);
    for (int x : data) t.push(x);
    std::cout << "pushed " << data.size() << " values: pair stack stores " << 2 * data.size()
              << " numbers, two stacks store " << (t.values.size() + t.mins.size()) << "\\n";
}
`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is a monotonic stack and when do you use it?",
    difficulty: "medium",
    seoDescription: "Learn the monotonic stack pattern in Python, JavaScript, Java and C++: next and previous greater or smaller elements in O(n), with verified runs.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"What is a monotonic stack? Explain it, tell me which kinds of problems it solves, and code a Python example such as next greater element, explaining why it is O(n)."

**What a strong answer should cover:**
- A stack kept sorted (increasing or decreasing) by popping before each push; popped elements get their answer from the new element.
- The four variants: next or previous, greater or smaller, and how strict versus non-strict comparison handles duplicates.
- O(n) time because each index is pushed once and popped at most once, despite the nested loop.
- Recognising the pattern: nearest greater or smaller, spans, histogram rectangle, trapping rain water; and when a heap or monotonic deque fits better.
- Python specifics: a list of indices with \`append\`/\`pop\`/\`[-1]\`, \`[-1] * n\` for defaults, \`enumerate\`, and \`while stack and ...\` relying on short-circuit evaluation.

**Code / implementation expected:** Yes — a short Python next-greater (or stock span) function using a list as the stack.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a stack is.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Python version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Imagine people standing in a line at a viewpoint, all facing right, towards a mountain. Each person wants to know: *who is the first person to my right who is taller than me?* That is the person who blocks my view.

Checking every person against everyone to their right takes ages. Here is a faster way. Walk along the line from left to right, keeping a little group of "people still waiting for an answer". Whenever a new person arrives, everyone in the waiting group who is shorter than the newcomer has found their answer: it is the newcomer. They leave the group. Then the newcomer joins the group to wait for someone taller.

Notice something about the waiting group: it is always ordered from tallest (joined earliest) to shortest (joined most recently), because anyone shorter than a newcomer was removed. A group that is always sorted like this, where you only add and remove at one end, is a **monotonic stack**. It turns a "for every item, look for the nearest bigger or smaller item" problem from O(n²) into O(n), and that pattern shows up in a surprising number of interview problems.

## 2. What a Monotonic Stack Is

📌 **Interview term: Monotonic stack** — an ordinary stack that you keep sorted from bottom to top (always increasing, or always decreasing) by popping every element that would break the order before you push a new one.

📌 **Interview term: Monotonically decreasing / increasing** — "decreasing" means each element is smaller than (or equal to, depending on the rule) the one below it; "increasing" means each is larger.

The stack itself is nothing special: Python's list, a JavaScript array, Java's \`ArrayDeque\` or an \`int[]\`, C++'s \`std::vector\`. What makes it "monotonic" is the **rule you apply before each push**:

1. Look at the new element \`x\`.
2. While the stack is not empty and its top would break the order, **pop** the top. Each popped element has just met the element that answers its question.
3. Push \`x\` (usually its *index*, so you can compute distances and write into an answer array).

The popping is where the work happens. For "next greater element", an item stays on the stack exactly until a bigger item arrives, and that bigger item is the answer.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 290" role="img" aria-label="Bars for the array 2, 1, 2, 4, 3 with an arrow from each bar to its next greater element. The answers are 4, 2, 4, none, none">
  <defs>
    <marker id="b11q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="70" y="140" width="60" height="80" rx="4"/>
  <text class="d-text" x="100" y="208" text-anchor="middle">2</text>
  <rect class="d-box" x="180" y="180" width="60" height="40" rx="4"/>
  <text class="d-text" x="210" y="208" text-anchor="middle">1</text>
  <rect class="d-box" x="290" y="140" width="60" height="80" rx="4"/>
  <text class="d-text" x="320" y="208" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="400" y="60" width="60" height="160" rx="4"/>
  <text class="d-text" x="430" y="208" text-anchor="middle">4</text>
  <rect class="d-box" x="510" y="100" width="60" height="120" rx="4"/>
  <text class="d-text" x="540" y="208" text-anchor="middle">3</text>
  <path class="d-edge" d="M 40 220 L 600 220"/>

  <path class="d-edge-accent" d="M 100 134 Q 250 20 420 54" marker-end="url(#b11q4-arrow)"/>
  <path class="d-edge-accent" d="M 210 174 Q 260 120 310 136" marker-end="url(#b11q4-arrow)"/>
  <path class="d-edge-accent" d="M 330 134 Q 380 70 410 66" marker-end="url(#b11q4-arrow)"/>

  <text class="d-sub" x="40" y="252" text-anchor="start">next greater</text>
  <text class="d-text" x="100" y="252" text-anchor="middle">4</text>
  <text class="d-text" x="210" y="252" text-anchor="middle">2</text>
  <text class="d-text" x="320" y="252" text-anchor="middle">4</text>
  <text class="d-text" x="430" y="252" text-anchor="middle">-1</text>
  <text class="d-text" x="540" y="252" text-anchor="middle">-1</text>
</svg>

The arrows show the answer for \`[2, 1, 2, 4, 3]\`: the first 2 waits until 4, the 1 is answered by the very next 2, and 4 and 3 never meet anything bigger, so they keep the default -1.

### Dry run: next greater element of \`[2, 1, 2, 4, 3]\`

The stack holds indices; values are shown in brackets. It stays **decreasing** from bottom to top.

| i | x | Pops (and the answer they get) | Stack after (values) |
| :--- | :--- | :--- | :--- |
| 0 | 2 | none | [2] |
| 1 | 1 | none, 1 is not greater than 2 | [2, 1] |
| 2 | 2 | pop index 1, answer[1] = 2; stop, 2 is not greater than 2 | [2, 2] |
| 3 | 4 | pop index 2, answer[2] = 4; pop index 0, answer[0] = 4 | [4] |
| 4 | 3 | none | [4, 3] |
| end | | indices 3 and 4 never popped: answer stays -1 | |

Result: \`[4, 2, 4, -1, -1]\`, which is what Example 1 prints.

## 3. Why It Is O(n), Not O(n²)

There is a \`while\` loop inside a \`for\` loop, which looks quadratic. It is not, because of a simple counting argument: **each index is pushed exactly once and popped at most once.** So across the whole run there are at most n pushes and n pops, and the total work is O(n) no matter how the pops are spread out. One step might pop many items, but then those items are gone forever.

📌 **Interview term: Amortised O(1) per element** — the cost of one step can be large, but the total over all steps is O(n), so the average per element is constant. See [amortized analysis](/interview-question/what-is-amortized-analysis).

Example 2 measures this on the stock span problem with 100,000 prices: exactly 100,000 pushes and 99,995 pops, never more than one pop per push.

## 4. The Four Variants (and the One Knob That Changes Them)

Almost every monotonic stack question is one of four lookups: the nearest **greater** or **smaller** element, to the **right** (next) or to the **left** (previous).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="Four variants of the monotonic stack: next greater, next smaller, previous greater and previous smaller, with the pop rule for each">
  <text class="d-text" x="245" y="30" text-anchor="middle">answer to the right (next)</text>
  <text class="d-text" x="545" y="30" text-anchor="middle">answer to the left (previous)</text>

  <rect class="d-box-accent" x="120" y="50" width="250" height="90" rx="10"/>
  <text class="d-text" x="245" y="80" text-anchor="middle">next greater</text>
  <text class="d-sub" x="245" y="104" text-anchor="middle">pop while x &gt; top</text>
  <text class="d-sub" x="245" y="124" text-anchor="middle">popped item gets x</text>

  <rect class="d-box-muted" x="420" y="50" width="250" height="90" rx="10"/>
  <text class="d-text" x="545" y="80" text-anchor="middle">previous greater</text>
  <text class="d-sub" x="545" y="104" text-anchor="middle">pop while top &lt;= x</text>
  <text class="d-sub" x="545" y="124" text-anchor="middle">remaining top is the answer</text>

  <rect class="d-box-accent" x="120" y="166" width="250" height="90" rx="10"/>
  <text class="d-text" x="245" y="196" text-anchor="middle">next smaller</text>
  <text class="d-sub" x="245" y="220" text-anchor="middle">pop while x &lt; top</text>
  <text class="d-sub" x="245" y="240" text-anchor="middle">popped item gets x</text>

  <rect class="d-box-muted" x="420" y="166" width="250" height="90" rx="10"/>
  <text class="d-text" x="545" y="196" text-anchor="middle">previous smaller</text>
  <text class="d-sub" x="545" y="220" text-anchor="middle">pop while top &gt;= x</text>
  <text class="d-sub" x="545" y="240" text-anchor="middle">remaining top is the answer</text>

  <text class="d-sub" x="60" y="100" text-anchor="middle">greater</text>
  <text class="d-sub" x="60" y="216" text-anchor="middle">smaller</text>
</svg>

The two columns differ in *who gets the answer*. For "next", the popped element receives the answer (the new element is the first bigger or smaller item to its right). For "previous", you pop everything that cannot be the answer, and whatever remains on top is the answer for the new element.

**Strict or not?** Whether you pop on \`>\` or \`>=\` decides how equal values are treated. In the dry run, the second 2 did *not* pop the first 2, because "next greater" means strictly greater. If the question says "greater than or equal", flip to \`>=\`. Getting this wrong on purpose-built duplicate test cases is the most common bug.

Example 1 runs all four on the same array:

| Variant | Result for \`[2, 1, 2, 4, 3]\` |
| :--- | :--- |
| next greater | \`[4, 2, 4, -1, -1]\` |
| next smaller | \`[1, -1, -1, 3, -1]\` |
| previous greater | \`[-1, 2, -1, -1, 4]\` |
| previous smaller | \`[-1, -1, 1, 2, 2]\` |

## 5. When to Use It: The Signals

Reach for a monotonic stack when the question, for **each** element, asks about the **nearest** element on one side that is bigger or smaller, or about how far an element "reaches" before something bigger or smaller stops it.

| Problem | What the stack finds | Page |
| :--- | :--- | :--- |
| Next greater element, Daily Temperatures | Next greater to the right | [Daily Temperatures](/interview-question/how-do-you-find-the-next-greater-element-for-every-item-daily-temperatures) |
| Online stock span | Previous greater (how many days back are not higher) | Example 2 below |
| Largest rectangle in a histogram | Previous and next smaller bar for each bar | [Largest rectangle](/interview-question/how-do-you-find-the-largest-rectangle-in-a-histogram) |
| Trapping rain water | The walls on each side of a dip | [Trapping rain water](/interview-question/how-do-you-solve-the-trapping-rain-water-problem) |
| Sum of subarray minimums | For each element, how far left and right it stays the minimum | — |
| Remove k digits to make the smallest number | Keep an increasing stack of digits | — |

**Signals that it is *not* a monotonic stack:** you need the k-th largest (use a [heap](/interview-question/what-is-a-heap-priority-queue)), you need the maximum of a sliding window of fixed size (use a monotonic *deque*, which pops from both ends; see [the sliding window technique](/interview-question/what-is-the-sliding-window-technique)), or the nearest element can be on either side with no ordering rule.

📌 **Interview term: Monotonic deque** — the same idea with a double-ended queue, so old elements can also leave from the front when they slide out of a window.

### Worked example: stock span

The span of today's price is the number of consecutive days, ending today, on which the price was less than or equal to today's. That is "distance to the previous strictly greater price". Keep a stack of \`(price, span)\` pairs with **strictly decreasing** prices. When a new price arrives, pop every pair with price \`<=\` today and add its span to today's span; whatever is left on top is the previous greater day.

For prices \`[100, 80, 60, 70, 60, 75, 85]\` the spans are \`[1, 1, 1, 2, 1, 4, 6]\`: on the day of 75, it absorbs the spans of 60 (1) and 70 (2) for a total of 1 + 1 + 2 = 4.

## 6. The Python Template

~~~python
def nearest(nums, from_left, want_greater):
    """For each item, the nearest value on one side that is strictly
    greater (or smaller); -1 if there is none. One monotonic stack."""
    n = len(nums)
    result = [-1] * n
    stack = []                                 # holds indices
    for i in range(n):
        x = nums[i]
        if from_left:
            # Previous: pop everything that cannot beat x, top is the answer.
            while stack and (nums[stack[-1]] <= x if want_greater else nums[stack[-1]] >= x):
                stack.pop()
            if stack:
                result[i] = nums[stack[-1]]
            stack.append(i)
        else:
            # Next: x is the answer for every waiting index it beats.
            while stack and (x > nums[stack[-1]] if want_greater else x < nums[stack[-1]]):
                result[stack.pop()] = x
            stack.append(i)
    return result
~~~

Python details:

- **Store indices, not values.** \`stack.append(i)\` lets you write \`result[stack.pop()] = x\` for "next" problems and compute distances like \`i - j\` for spans and temperatures. Read the value with \`nums[stack[-1]]\`.
- **\`while stack and ...\`.** \`and\` short-circuits, so \`nums[stack[-1]]\` is never evaluated on an empty list (which would raise \`IndexError\`).
- **\`[-1] * n\`.** Creates the answer list pre-filled with the "no answer" value; anything never popped keeps it.
- **Right-to-left form.** The same "next greater" can be computed by scanning \`for i in reversed(range(n))\`, popping while \`nums[stack[-1]] <= nums[i]\`, and reading the remaining top as the answer. Both directions are O(n); pick one and stay consistent.
- **Performance note.** For very large inputs the Python loop overhead dominates, but the algorithm is still linear; there is no standard-library shortcut for this pattern.

## 7. Verified: Running the Code

Each example below was saved to a file and run with \`python3 main.py\` (Python 3.13). The same programs in the other three languages print exactly the same lines.

**Example 1 — All four variants on one array** printed:

~~~text
nums             [2, 1, 2, 4, 3]
next greater     [4, 2, 4, -1, -1]
next smaller     [1, -1, -1, 3, -1]
previous greater [-1, 2, -1, -1, 4]
previous smaller [-1, -1, 1, 2, 2]
~~~

**Example 2 — Online stock span, counting pushes and pops** printed:

~~~text
prices [100, 80, 60, 70, 60, 75, 85]
spans  [1, 1, 1, 2, 1, 4, 6]
n=100000 pushes=100000 pops=99995 sum of spans=49859883
~~~

Example 2 is the amortised argument made visible: 100,000 prices caused exactly 100,000 pushes and 99,995 pops, so the total stack work is under 2n even though some single calls popped many items. The span total is printed as a checksum so the four languages can be compared.

## 8. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n) | Each index is pushed once and popped at most once |
| Space | O(n) | In the worst case (for example a strictly decreasing array for "next greater") every index waits on the stack |
| Brute force | O(n²) | For each element, scan outward until you find the answer |
| One online \`next(price)\` call (stock span) | amortised O(1) | A single call may pop many items, but each item is popped once ever |

## 9. Edge Cases

- **Empty input** — no iterations; return an empty answer.
- **All equal values** — with a strict comparison nothing ever pops, so every "next greater" is -1. With a non-strict comparison every element pops its predecessor. Decide which the question means.
- **Strictly increasing input** — for "next greater", every element is popped by its neighbour; the stack never holds more than one item.
- **Strictly decreasing input** — nothing pops until the end; the stack grows to n. This is the worst case for memory.
- **Circular arrays** — loop over \`2n\` positions with \`i % n\` so elements near the end can find answers at the start; covered in [Daily Temperatures](/interview-question/how-do-you-find-the-next-greater-element-for-every-item-daily-temperatures).

## Common Pitfalls

- **Pushing values instead of indices.** You can no longer write into the right slot of the answer or compute distances. Push indices and look values up.
- **Wrong strictness.** \`<\` versus \`<=\` changes how duplicates behave; test with \`[2, 2]\`.
- **Reading \`stack[-1]\` without checking.** \`stack[-1]\` on an empty list raises \`IndexError\`; keep the \`stack and\` guard first.
- **Forgetting the leftovers.** Elements still on the stack at the end have no answer; make sure the default (-1 or 0) is already in the result list.
- **Calling it O(n²) because of the nested loop.** Explain the push-once, pop-once argument instead.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A monotonic stack is a normal stack I keep sorted, increasing or decreasing, by popping every element that would break the order before pushing the new one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it helps:</strong> <span style="color:#f0e2c8;">The elements I pop have just met their answer: for next greater, the new element is the first bigger item to their right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, because each index is pushed once and popped at most once, even though there is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code> inside the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code>; O(n) space in the worst case.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Variants:</strong> <span style="color:#f0e2c8;">Next or previous, greater or smaller; strict <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> or non-strict <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> decides how duplicates behave.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python details:</strong> <span style="color:#f0e2c8;">A list of indices with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stack[-1]</code>, guarded by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while stack and ...</code>, and a result list pre-filled with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-1] * n</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why store indices instead of values?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So you can write the answer into the right position and compute distances such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - j</code>; the value is always available as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[stack[-1]]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know a problem needs a monotonic stack?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When, for every element, you need the nearest greater or smaller element on one side, or how far an element reaches before something bigger or smaller stops it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes for a circular array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> from 0 to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2*n - 1</code>, read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i % n]</code>, and only push indices during the first pass. Elements near the end then see the start of the array.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference from a monotonic deque?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A deque also removes from the front, so elements can expire when they leave a fixed-size window. That is the tool for the sliding window maximum; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.deque</code> gives O(1) at both ends.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is largest rectangle in a histogram related?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For each bar you need the nearest smaller bar on the left and on the right; a monotonic increasing stack finds both in one pass, and the width between them gives the rectangle.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Monotonic stack** | A stack kept sorted by popping elements that would break the order before each push |
| **Monotonically decreasing / increasing** | Each element is smaller (or larger) than the one below it |
| **Amortised O(1) per element** | One step may pop many items, but the total over all steps is O(n) |
| **Monotonic deque** | The same idea with a deque, so elements can also expire from the front |

---
**Conclusion:** A monotonic stack is an ordinary stack with one rule: before pushing, pop everything that would break the sorted order. Every popped element has just met its nearest greater (or smaller) neighbour, and because each index is pushed once and popped at most once, the whole pass is O(n) instead of O(n²). The same template, with the direction and the comparison flipped, solves next and previous greater and smaller lookups, stock span, histogram rectangles and more. In Python it is a list of indices, guarded by \`while stack and ...\`.`,
        examples: [
          {
            label: "All four variants on one array",
            code: `def nearest(nums, from_left, want_greater):
    """For each item, the nearest value on one side that is strictly
    greater (or smaller); -1 if there is none. One monotonic stack."""
    n = len(nums)
    result = [-1] * n
    stack = []                                 # holds indices
    for i in range(n):
        x = nums[i]
        if from_left:
            # Previous: pop everything that cannot beat x, top is the answer.
            while stack and (nums[stack[-1]] <= x if want_greater else nums[stack[-1]] >= x):
                stack.pop()
            if stack:
                result[i] = nums[stack[-1]]
            stack.append(i)
        else:
            # Next: x is the answer for every waiting index it beats.
            while stack and (x > nums[stack[-1]] if want_greater else x < nums[stack[-1]]):
                result[stack.pop()] = x
            stack.append(i)
    return result


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


nums = [2, 1, 2, 4, 3]
print("nums             " + fmt(nums))
print("next greater     " + fmt(nearest(nums, False, True)))
print("next smaller     " + fmt(nearest(nums, False, False)))
print("previous greater " + fmt(nearest(nums, True, True)))
print("previous smaller " + fmt(nearest(nums, True, False)))
`,
          },
          {
            label: "Online stock span, counting pushes and pops",
            code: `class StockSpanner:
    """Span = how many consecutive days, ending today, had price <= today.
    The stack keeps (price, span) pairs with strictly decreasing prices."""

    def __init__(self):
        self.stack = []
        self.pushes = 0
        self.pops = 0

    def next(self, price):
        span = 1
        while self.stack and self.stack[-1][0] <= price:
            span += self.stack.pop()[1]       # absorb the smaller day's span
            self.pops += 1
        self.stack.append((price, span))
        self.pushes += 1
        return span


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


sp = StockSpanner()
prices = [100, 80, 60, 70, 60, 75, 85]
print("prices " + fmt(prices))
print("spans  " + fmt([sp.next(p) for p in prices]))

# Every price is pushed once and popped at most once: at most 2n stack steps.
big = StockSpanner()
n = 100000
total = 0
for i in range(n):
    total += big.next((i * 37) % 101)
print("n=" + str(n) + " pushes=" + str(big.pushes) + " pops=" + str(big.pops)
      + " sum of spans=" + str(total))
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"What is a monotonic stack? Explain the idea, give me the kinds of problems it is used for, and write a JavaScript example such as next greater element, with its complexity."

**What a strong answer should cover:**
- A stack kept sorted (increasing or decreasing) by popping before each push; popped elements get their answer from the new element.
- The four variants and how strict versus non-strict comparison handles duplicates.
- O(n) time by the push-once, pop-once argument.
- Recognising the pattern (nearest greater or smaller, spans, histogram, rain water) and when a heap or monotonic deque is better.
- JavaScript specifics: an array of indices with \`push\`/\`pop\` and \`stack[stack.length - 1]\`; \`new Array(n).fill(-1)\` for defaults; reading past the end gives \`undefined\`, so guard with \`stack.length\`; never use \`shift()\` here.

**Code / implementation expected:** Yes — a JavaScript next-greater (or stock span) function using an array as the stack.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a stack is.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this JavaScript version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Imagine people standing in a line at a viewpoint, all facing right, towards a mountain. Each person wants to know: *who is the first person to my right who is taller than me?* That is the person who blocks my view.

Checking every person against everyone to their right takes ages. Here is a faster way. Walk along the line from left to right, keeping a little group of "people still waiting for an answer". Whenever a new person arrives, everyone in the waiting group who is shorter than the newcomer has found their answer: it is the newcomer. They leave the group. Then the newcomer joins the group to wait for someone taller.

Notice something about the waiting group: it is always ordered from tallest (joined earliest) to shortest (joined most recently), because anyone shorter than a newcomer was removed. A group that is always sorted like this, where you only add and remove at one end, is a **monotonic stack**. It turns a "for every item, look for the nearest bigger or smaller item" problem from O(n²) into O(n), and that pattern shows up in a surprising number of interview problems.

## 2. What a Monotonic Stack Is

📌 **Interview term: Monotonic stack** — an ordinary stack that you keep sorted from bottom to top (always increasing, or always decreasing) by popping every element that would break the order before you push a new one.

📌 **Interview term: Monotonically decreasing / increasing** — "decreasing" means each element is smaller than (or equal to, depending on the rule) the one below it; "increasing" means each is larger.

The stack itself is nothing special: Python's list, a JavaScript array, Java's \`ArrayDeque\` or an \`int[]\`, C++'s \`std::vector\`. What makes it "monotonic" is the **rule you apply before each push**:

1. Look at the new element \`x\`.
2. While the stack is not empty and its top would break the order, **pop** the top. Each popped element has just met the element that answers its question.
3. Push \`x\` (usually its *index*, so you can compute distances and write into an answer array).

The popping is where the work happens. For "next greater element", an item stays on the stack exactly until a bigger item arrives, and that bigger item is the answer.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 290" role="img" aria-label="Bars for the array 2, 1, 2, 4, 3 with an arrow from each bar to its next greater element. The answers are 4, 2, 4, none, none">
  <defs>
    <marker id="b11q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="70" y="140" width="60" height="80" rx="4"/>
  <text class="d-text" x="100" y="208" text-anchor="middle">2</text>
  <rect class="d-box" x="180" y="180" width="60" height="40" rx="4"/>
  <text class="d-text" x="210" y="208" text-anchor="middle">1</text>
  <rect class="d-box" x="290" y="140" width="60" height="80" rx="4"/>
  <text class="d-text" x="320" y="208" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="400" y="60" width="60" height="160" rx="4"/>
  <text class="d-text" x="430" y="208" text-anchor="middle">4</text>
  <rect class="d-box" x="510" y="100" width="60" height="120" rx="4"/>
  <text class="d-text" x="540" y="208" text-anchor="middle">3</text>
  <path class="d-edge" d="M 40 220 L 600 220"/>

  <path class="d-edge-accent" d="M 100 134 Q 250 20 420 54" marker-end="url(#b11q4-arrow)"/>
  <path class="d-edge-accent" d="M 210 174 Q 260 120 310 136" marker-end="url(#b11q4-arrow)"/>
  <path class="d-edge-accent" d="M 330 134 Q 380 70 410 66" marker-end="url(#b11q4-arrow)"/>

  <text class="d-sub" x="40" y="252" text-anchor="start">next greater</text>
  <text class="d-text" x="100" y="252" text-anchor="middle">4</text>
  <text class="d-text" x="210" y="252" text-anchor="middle">2</text>
  <text class="d-text" x="320" y="252" text-anchor="middle">4</text>
  <text class="d-text" x="430" y="252" text-anchor="middle">-1</text>
  <text class="d-text" x="540" y="252" text-anchor="middle">-1</text>
</svg>

The arrows show the answer for \`[2, 1, 2, 4, 3]\`: the first 2 waits until 4, the 1 is answered by the very next 2, and 4 and 3 never meet anything bigger, so they keep the default -1.

### Dry run: next greater element of \`[2, 1, 2, 4, 3]\`

The stack holds indices; values are shown in brackets. It stays **decreasing** from bottom to top.

| i | x | Pops (and the answer they get) | Stack after (values) |
| :--- | :--- | :--- | :--- |
| 0 | 2 | none | [2] |
| 1 | 1 | none, 1 is not greater than 2 | [2, 1] |
| 2 | 2 | pop index 1, answer[1] = 2; stop, 2 is not greater than 2 | [2, 2] |
| 3 | 4 | pop index 2, answer[2] = 4; pop index 0, answer[0] = 4 | [4] |
| 4 | 3 | none | [4, 3] |
| end | | indices 3 and 4 never popped: answer stays -1 | |

Result: \`[4, 2, 4, -1, -1]\`, which is what Example 1 prints.

## 3. Why It Is O(n), Not O(n²)

There is a \`while\` loop inside a \`for\` loop, which looks quadratic. It is not, because of a simple counting argument: **each index is pushed exactly once and popped at most once.** So across the whole run there are at most n pushes and n pops, and the total work is O(n) no matter how the pops are spread out. One step might pop many items, but then those items are gone forever.

📌 **Interview term: Amortised O(1) per element** — the cost of one step can be large, but the total over all steps is O(n), so the average per element is constant. See [amortized analysis](/interview-question/what-is-amortized-analysis).

Example 2 measures this on the stock span problem with 100,000 prices: exactly 100,000 pushes and 99,995 pops, never more than one pop per push.

## 4. The Four Variants (and the One Knob That Changes Them)

Almost every monotonic stack question is one of four lookups: the nearest **greater** or **smaller** element, to the **right** (next) or to the **left** (previous).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="Four variants of the monotonic stack: next greater, next smaller, previous greater and previous smaller, with the pop rule for each">
  <text class="d-text" x="245" y="30" text-anchor="middle">answer to the right (next)</text>
  <text class="d-text" x="545" y="30" text-anchor="middle">answer to the left (previous)</text>

  <rect class="d-box-accent" x="120" y="50" width="250" height="90" rx="10"/>
  <text class="d-text" x="245" y="80" text-anchor="middle">next greater</text>
  <text class="d-sub" x="245" y="104" text-anchor="middle">pop while x &gt; top</text>
  <text class="d-sub" x="245" y="124" text-anchor="middle">popped item gets x</text>

  <rect class="d-box-muted" x="420" y="50" width="250" height="90" rx="10"/>
  <text class="d-text" x="545" y="80" text-anchor="middle">previous greater</text>
  <text class="d-sub" x="545" y="104" text-anchor="middle">pop while top &lt;= x</text>
  <text class="d-sub" x="545" y="124" text-anchor="middle">remaining top is the answer</text>

  <rect class="d-box-accent" x="120" y="166" width="250" height="90" rx="10"/>
  <text class="d-text" x="245" y="196" text-anchor="middle">next smaller</text>
  <text class="d-sub" x="245" y="220" text-anchor="middle">pop while x &lt; top</text>
  <text class="d-sub" x="245" y="240" text-anchor="middle">popped item gets x</text>

  <rect class="d-box-muted" x="420" y="166" width="250" height="90" rx="10"/>
  <text class="d-text" x="545" y="196" text-anchor="middle">previous smaller</text>
  <text class="d-sub" x="545" y="220" text-anchor="middle">pop while top &gt;= x</text>
  <text class="d-sub" x="545" y="240" text-anchor="middle">remaining top is the answer</text>

  <text class="d-sub" x="60" y="100" text-anchor="middle">greater</text>
  <text class="d-sub" x="60" y="216" text-anchor="middle">smaller</text>
</svg>

The two columns differ in *who gets the answer*. For "next", the popped element receives the answer (the new element is the first bigger or smaller item to its right). For "previous", you pop everything that cannot be the answer, and whatever remains on top is the answer for the new element.

**Strict or not?** Whether you pop on \`>\` or \`>=\` decides how equal values are treated. In the dry run, the second 2 did *not* pop the first 2, because "next greater" means strictly greater. If the question says "greater than or equal", flip to \`>=\`. Getting this wrong on purpose-built duplicate test cases is the most common bug.

Example 1 runs all four on the same array:

| Variant | Result for \`[2, 1, 2, 4, 3]\` |
| :--- | :--- |
| next greater | \`[4, 2, 4, -1, -1]\` |
| next smaller | \`[1, -1, -1, 3, -1]\` |
| previous greater | \`[-1, 2, -1, -1, 4]\` |
| previous smaller | \`[-1, -1, 1, 2, 2]\` |

## 5. When to Use It: The Signals

Reach for a monotonic stack when the question, for **each** element, asks about the **nearest** element on one side that is bigger or smaller, or about how far an element "reaches" before something bigger or smaller stops it.

| Problem | What the stack finds | Page |
| :--- | :--- | :--- |
| Next greater element, Daily Temperatures | Next greater to the right | [Daily Temperatures](/interview-question/how-do-you-find-the-next-greater-element-for-every-item-daily-temperatures) |
| Online stock span | Previous greater (how many days back are not higher) | Example 2 below |
| Largest rectangle in a histogram | Previous and next smaller bar for each bar | [Largest rectangle](/interview-question/how-do-you-find-the-largest-rectangle-in-a-histogram) |
| Trapping rain water | The walls on each side of a dip | [Trapping rain water](/interview-question/how-do-you-solve-the-trapping-rain-water-problem) |
| Sum of subarray minimums | For each element, how far left and right it stays the minimum | — |
| Remove k digits to make the smallest number | Keep an increasing stack of digits | — |

**Signals that it is *not* a monotonic stack:** you need the k-th largest (use a [heap](/interview-question/what-is-a-heap-priority-queue)), you need the maximum of a sliding window of fixed size (use a monotonic *deque*, which pops from both ends; see [the sliding window technique](/interview-question/what-is-the-sliding-window-technique)), or the nearest element can be on either side with no ordering rule.

📌 **Interview term: Monotonic deque** — the same idea with a double-ended queue, so old elements can also leave from the front when they slide out of a window.

### Worked example: stock span

The span of today's price is the number of consecutive days, ending today, on which the price was less than or equal to today's. That is "distance to the previous strictly greater price". Keep a stack of \`(price, span)\` pairs with **strictly decreasing** prices. When a new price arrives, pop every pair with price \`<=\` today and add its span to today's span; whatever is left on top is the previous greater day.

For prices \`[100, 80, 60, 70, 60, 75, 85]\` the spans are \`[1, 1, 1, 2, 1, 4, 6]\`: on the day of 75, it absorbs the spans of 60 (1) and 70 (2) for a total of 1 + 1 + 2 = 4.

## 6. The JavaScript Template

~~~javascript
function nearest(nums, fromLeft, wantGreater) {
  const n = nums.length;
  const result = new Array(n).fill(-1);
  const stack = [];
  for (let i = 0; i < n; i++) {
    const x = nums[i];
    if (fromLeft) {
      // Previous: pop everything that cannot beat x, top is the answer.
      while (stack.length && (wantGreater ? nums[stack[stack.length - 1]] <= x
                                          : nums[stack[stack.length - 1]] >= x)) {
        stack.pop();
      }
      if (stack.length) result[i] = nums[stack[stack.length - 1]];
      stack.push(i);
    } else {
      // Next: x is the answer for every waiting index it beats.
      while (stack.length && (wantGreater ? x > nums[stack[stack.length - 1]]
                                          : x < nums[stack[stack.length - 1]])) {
        result[stack.pop()] = x;
      }
      stack.push(i);
    }
  }
  return result;
}
~~~

JavaScript details:

- **Store indices.** \`stack.push(i)\` lets you write \`result[stack.pop()] = x\` and compute distances; read the value with \`nums[stack[stack.length - 1]]\`.
- **\`stack.length &&\` as the guard.** On an empty array \`stack[stack.length - 1]\` is \`undefined\` and \`nums[undefined]\` is also \`undefined\`; comparisons with \`undefined\` are always \`false\`, so a missing guard may not crash but silently does the wrong thing. Keep the length check first.
- **\`new Array(n).fill(-1)\`.** Pre-fills the default answer. (\`new Array(n)\` alone creates empty slots, which \`map\` skips; \`fill\` makes them real values.)
- **Only \`push\` and \`pop\`.** Both work at the end of the array. Do not use \`shift\`/\`unshift\`, which operate on the front.
- **Typed arrays.** For very large numeric inputs an \`Int32Array(n)\` with a manual \`top\` index avoids growing a regular array; the algorithm is identical.

## 7. Verified: Running the Code

Each example below was saved to a file and run with \`node main.js\` (Node.js 22). The same programs in the other three languages print exactly the same lines.

**Example 1 — All four variants on one array** printed:

~~~text
nums             [2, 1, 2, 4, 3]
next greater     [4, 2, 4, -1, -1]
next smaller     [1, -1, -1, 3, -1]
previous greater [-1, 2, -1, -1, 4]
previous smaller [-1, -1, 1, 2, 2]
~~~

**Example 2 — Online stock span, counting pushes and pops** printed:

~~~text
prices [100, 80, 60, 70, 60, 75, 85]
spans  [1, 1, 1, 2, 1, 4, 6]
n=100000 pushes=100000 pops=99995 sum of spans=49859883
~~~

Example 2 is the amortised argument made visible: 100,000 prices caused exactly 100,000 pushes and 99,995 pops, so the total stack work is under 2n even though some single calls popped many items. The span total is printed as a checksum so the four languages can be compared.

## 8. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n) | Each index is pushed once and popped at most once |
| Space | O(n) | In the worst case (for example a strictly decreasing array for "next greater") every index waits on the stack |
| Brute force | O(n²) | For each element, scan outward until you find the answer |
| One online \`next(price)\` call (stock span) | amortised O(1) | A single call may pop many items, but each item is popped once ever |

## 9. Edge Cases

- **Empty input** — no iterations; return an empty answer.
- **All equal values** — with a strict comparison nothing ever pops, so every "next greater" is -1. With a non-strict comparison every element pops its predecessor. Decide which the question means.
- **Strictly increasing input** — for "next greater", every element is popped by its neighbour; the stack never holds more than one item.
- **Strictly decreasing input** — nothing pops until the end; the stack grows to n. This is the worst case for memory.
- **Circular arrays** — loop over \`2n\` positions with \`i % n\` so elements near the end can find answers at the start; covered in [Daily Temperatures](/interview-question/how-do-you-find-the-next-greater-element-for-every-item-daily-temperatures).

## Common Pitfalls

- **Pushing values instead of indices.** You lose the position to write the answer into.
- **Wrong strictness.** \`<\` versus \`<=\` decides how equal values behave; test with \`[2, 2]\`.
- **Missing the length guard.** Comparisons with \`undefined\` are \`false\`, so the bug is silent rather than a crash.
- **\`new Array(n)\` without \`fill\`.** The slots are empty, and printing or mapping them gives surprising results; fill with the default.
- **Printing arrays with \`console.log(arr)\`.** Node prints \`[ 4, 2 ]\` with spaces inside the brackets; join the values yourself when the exact format matters, as the examples do.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A monotonic stack is a normal stack I keep sorted, increasing or decreasing, by popping every element that would break the order before pushing the new one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it helps:</strong> <span style="color:#f0e2c8;">Popped elements have just met their answer: for next greater, the new element is the first bigger item to their right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">O(n) time because each index is pushed once and popped at most once, despite the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while</code> inside the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code>; O(n) space at worst.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Variants:</strong> <span style="color:#f0e2c8;">Next or previous, greater or smaller; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> versus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> decides how duplicates behave.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript details:</strong> <span style="color:#f0e2c8;">An array of indices with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stack[stack.length - 1]</code>, guarded by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stack.length</code>, and a result pre-filled with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Array(n).fill(-1)</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why store indices?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So the answer can be written into the right slot and distances like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - j</code> computed; the value is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[stack[stack.length - 1]]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you forget the empty check?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In JavaScript it usually does not crash: the top is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> and the comparison is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>, so the loop just stops. That makes the bug hard to see, which is why I keep the guard explicit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a circular array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Loop to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 * n</code>, read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i % n]</code>, and push only during the first pass.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from a monotonic deque?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A deque can also drop elements from the front when they leave a window, which is what the sliding window maximum needs. In JavaScript you can simulate it with an array plus a head index.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Name three problems that use it.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Daily Temperatures (next greater), largest rectangle in a histogram (previous and next smaller), and online stock span (previous greater).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Monotonic stack** | A stack kept sorted by popping elements that would break the order before each push |
| **Monotonically decreasing / increasing** | Each element is smaller (or larger) than the one below it |
| **Amortised O(1) per element** | One step may pop many items, but the total over all steps is O(n) |
| **Monotonic deque** | The same idea with a deque, so elements can also expire from the front |

---
**Conclusion:** A monotonic stack is an ordinary stack with one rule: before pushing, pop everything that would break the sorted order. Every popped element has just met its nearest greater (or smaller) neighbour, and since each index is pushed once and popped at most once, the pass is O(n). Flip the direction or the comparison and the same template gives all four nearest-element lookups, stock span and histogram rectangles. In JavaScript it is an array of indices with \`push\` and \`pop\`, guarded by \`stack.length\` because a missing guard fails silently rather than loudly.`,
        examples: [
          {
            label: "All four variants on one array",
            code: `// For each item, the nearest value on one side that is strictly greater
// (or smaller); -1 if there is none. One monotonic stack of indices.
function nearest(nums, fromLeft, wantGreater) {
  const n = nums.length;
  const result = new Array(n).fill(-1);
  const stack = [];
  for (let i = 0; i < n; i++) {
    const x = nums[i];
    if (fromLeft) {
      // Previous: pop everything that cannot beat x, top is the answer.
      while (stack.length && (wantGreater ? nums[stack[stack.length - 1]] <= x
                                          : nums[stack[stack.length - 1]] >= x)) {
        stack.pop();
      }
      if (stack.length) result[i] = nums[stack[stack.length - 1]];
      stack.push(i);
    } else {
      // Next: x is the answer for every waiting index it beats.
      while (stack.length && (wantGreater ? x > nums[stack[stack.length - 1]]
                                          : x < nums[stack[stack.length - 1]])) {
        result[stack.pop()] = x;
      }
      stack.push(i);
    }
  }
  return result;
}

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

const nums = [2, 1, 2, 4, 3];
console.log('nums             ' + fmt(nums)); // nums             [2, 1, 2, 4, 3]
console.log('next greater     ' + fmt(nearest(nums, false, true))); // next greater     [4, 2, 4, -1, -1]
console.log('next smaller     ' + fmt(nearest(nums, false, false))); // next smaller     [1, -1, -1, 3, -1]
console.log('previous greater ' + fmt(nearest(nums, true, true))); // previous greater [-1, 2, -1, -1, 4]
console.log('previous smaller ' + fmt(nearest(nums, true, false))); // previous smaller [-1, -1, 1, 2, 2]
`,
          },
          {
            label: "Online stock span, counting pushes and pops",
            code: `// Span = how many consecutive days, ending today, had price <= today.
// The stack keeps [price, span] pairs with strictly decreasing prices.
class StockSpanner {
  constructor() {
    this.stack = [];
    this.pushes = 0;
    this.pops = 0;
  }
  next(price) {
    let span = 1;
    while (this.stack.length && this.stack[this.stack.length - 1][0] <= price) {
      span += this.stack.pop()[1];          // absorb the smaller day's span
      this.pops++;
    }
    this.stack.push([price, span]);
    this.pushes++;
    return span;
  }
}

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

const sp = new StockSpanner();
const prices = [100, 80, 60, 70, 60, 75, 85];
console.log('prices ' + fmt(prices));
console.log('spans  ' + fmt(prices.map((p) => sp.next(p))));

// Every price is pushed once and popped at most once: at most 2n stack steps.
const big = new StockSpanner();
const n = 100000;
let total = 0;
for (let i = 0; i < n; i++) total += big.next((i * 37) % 101);
console.log('n=' + n + ' pushes=' + big.pushes + ' pops=' + big.pops + ' sum of spans=' + total);
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"What is a monotonic stack? Explain it, tell me which problems it is for, and write a Java example such as next greater element. What would you use as the stack in Java, and why?"

**What a strong answer should cover:**
- A stack kept sorted (increasing or decreasing) by popping before each push; popped elements get their answer from the new element.
- The four variants and strict versus non-strict comparison for duplicates.
- O(n) time by the push-once, pop-once argument.
- Recognising the pattern and when a heap or monotonic deque is better.
- Java specifics: an \`int[]\` plus a \`top\` counter (no boxing) or \`ArrayDeque<Integer>\`; \`Arrays.fill(result, -1)\`; \`Arrays.toString\` for output; \`Integer\` comparisons with \`==\` are a trap if you store boxed values.

**Code / implementation expected:** Yes — a Java next-greater (or stock span) method using an \`int[]\` or \`ArrayDeque\` as the stack.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a stack is.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Java version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Imagine people standing in a line at a viewpoint, all facing right, towards a mountain. Each person wants to know: *who is the first person to my right who is taller than me?* That is the person who blocks my view.

Checking every person against everyone to their right takes ages. Here is a faster way. Walk along the line from left to right, keeping a little group of "people still waiting for an answer". Whenever a new person arrives, everyone in the waiting group who is shorter than the newcomer has found their answer: it is the newcomer. They leave the group. Then the newcomer joins the group to wait for someone taller.

Notice something about the waiting group: it is always ordered from tallest (joined earliest) to shortest (joined most recently), because anyone shorter than a newcomer was removed. A group that is always sorted like this, where you only add and remove at one end, is a **monotonic stack**. It turns a "for every item, look for the nearest bigger or smaller item" problem from O(n²) into O(n), and that pattern shows up in a surprising number of interview problems.

## 2. What a Monotonic Stack Is

📌 **Interview term: Monotonic stack** — an ordinary stack that you keep sorted from bottom to top (always increasing, or always decreasing) by popping every element that would break the order before you push a new one.

📌 **Interview term: Monotonically decreasing / increasing** — "decreasing" means each element is smaller than (or equal to, depending on the rule) the one below it; "increasing" means each is larger.

The stack itself is nothing special: Python's list, a JavaScript array, Java's \`ArrayDeque\` or an \`int[]\`, C++'s \`std::vector\`. What makes it "monotonic" is the **rule you apply before each push**:

1. Look at the new element \`x\`.
2. While the stack is not empty and its top would break the order, **pop** the top. Each popped element has just met the element that answers its question.
3. Push \`x\` (usually its *index*, so you can compute distances and write into an answer array).

The popping is where the work happens. For "next greater element", an item stays on the stack exactly until a bigger item arrives, and that bigger item is the answer.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 290" role="img" aria-label="Bars for the array 2, 1, 2, 4, 3 with an arrow from each bar to its next greater element. The answers are 4, 2, 4, none, none">
  <defs>
    <marker id="b11q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="70" y="140" width="60" height="80" rx="4"/>
  <text class="d-text" x="100" y="208" text-anchor="middle">2</text>
  <rect class="d-box" x="180" y="180" width="60" height="40" rx="4"/>
  <text class="d-text" x="210" y="208" text-anchor="middle">1</text>
  <rect class="d-box" x="290" y="140" width="60" height="80" rx="4"/>
  <text class="d-text" x="320" y="208" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="400" y="60" width="60" height="160" rx="4"/>
  <text class="d-text" x="430" y="208" text-anchor="middle">4</text>
  <rect class="d-box" x="510" y="100" width="60" height="120" rx="4"/>
  <text class="d-text" x="540" y="208" text-anchor="middle">3</text>
  <path class="d-edge" d="M 40 220 L 600 220"/>

  <path class="d-edge-accent" d="M 100 134 Q 250 20 420 54" marker-end="url(#b11q4-arrow)"/>
  <path class="d-edge-accent" d="M 210 174 Q 260 120 310 136" marker-end="url(#b11q4-arrow)"/>
  <path class="d-edge-accent" d="M 330 134 Q 380 70 410 66" marker-end="url(#b11q4-arrow)"/>

  <text class="d-sub" x="40" y="252" text-anchor="start">next greater</text>
  <text class="d-text" x="100" y="252" text-anchor="middle">4</text>
  <text class="d-text" x="210" y="252" text-anchor="middle">2</text>
  <text class="d-text" x="320" y="252" text-anchor="middle">4</text>
  <text class="d-text" x="430" y="252" text-anchor="middle">-1</text>
  <text class="d-text" x="540" y="252" text-anchor="middle">-1</text>
</svg>

The arrows show the answer for \`[2, 1, 2, 4, 3]\`: the first 2 waits until 4, the 1 is answered by the very next 2, and 4 and 3 never meet anything bigger, so they keep the default -1.

### Dry run: next greater element of \`[2, 1, 2, 4, 3]\`

The stack holds indices; values are shown in brackets. It stays **decreasing** from bottom to top.

| i | x | Pops (and the answer they get) | Stack after (values) |
| :--- | :--- | :--- | :--- |
| 0 | 2 | none | [2] |
| 1 | 1 | none, 1 is not greater than 2 | [2, 1] |
| 2 | 2 | pop index 1, answer[1] = 2; stop, 2 is not greater than 2 | [2, 2] |
| 3 | 4 | pop index 2, answer[2] = 4; pop index 0, answer[0] = 4 | [4] |
| 4 | 3 | none | [4, 3] |
| end | | indices 3 and 4 never popped: answer stays -1 | |

Result: \`[4, 2, 4, -1, -1]\`, which is what Example 1 prints.

## 3. Why It Is O(n), Not O(n²)

There is a \`while\` loop inside a \`for\` loop, which looks quadratic. It is not, because of a simple counting argument: **each index is pushed exactly once and popped at most once.** So across the whole run there are at most n pushes and n pops, and the total work is O(n) no matter how the pops are spread out. One step might pop many items, but then those items are gone forever.

📌 **Interview term: Amortised O(1) per element** — the cost of one step can be large, but the total over all steps is O(n), so the average per element is constant. See [amortized analysis](/interview-question/what-is-amortized-analysis).

Example 2 measures this on the stock span problem with 100,000 prices: exactly 100,000 pushes and 99,995 pops, never more than one pop per push.

## 4. The Four Variants (and the One Knob That Changes Them)

Almost every monotonic stack question is one of four lookups: the nearest **greater** or **smaller** element, to the **right** (next) or to the **left** (previous).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="Four variants of the monotonic stack: next greater, next smaller, previous greater and previous smaller, with the pop rule for each">
  <text class="d-text" x="245" y="30" text-anchor="middle">answer to the right (next)</text>
  <text class="d-text" x="545" y="30" text-anchor="middle">answer to the left (previous)</text>

  <rect class="d-box-accent" x="120" y="50" width="250" height="90" rx="10"/>
  <text class="d-text" x="245" y="80" text-anchor="middle">next greater</text>
  <text class="d-sub" x="245" y="104" text-anchor="middle">pop while x &gt; top</text>
  <text class="d-sub" x="245" y="124" text-anchor="middle">popped item gets x</text>

  <rect class="d-box-muted" x="420" y="50" width="250" height="90" rx="10"/>
  <text class="d-text" x="545" y="80" text-anchor="middle">previous greater</text>
  <text class="d-sub" x="545" y="104" text-anchor="middle">pop while top &lt;= x</text>
  <text class="d-sub" x="545" y="124" text-anchor="middle">remaining top is the answer</text>

  <rect class="d-box-accent" x="120" y="166" width="250" height="90" rx="10"/>
  <text class="d-text" x="245" y="196" text-anchor="middle">next smaller</text>
  <text class="d-sub" x="245" y="220" text-anchor="middle">pop while x &lt; top</text>
  <text class="d-sub" x="245" y="240" text-anchor="middle">popped item gets x</text>

  <rect class="d-box-muted" x="420" y="166" width="250" height="90" rx="10"/>
  <text class="d-text" x="545" y="196" text-anchor="middle">previous smaller</text>
  <text class="d-sub" x="545" y="220" text-anchor="middle">pop while top &gt;= x</text>
  <text class="d-sub" x="545" y="240" text-anchor="middle">remaining top is the answer</text>

  <text class="d-sub" x="60" y="100" text-anchor="middle">greater</text>
  <text class="d-sub" x="60" y="216" text-anchor="middle">smaller</text>
</svg>

The two columns differ in *who gets the answer*. For "next", the popped element receives the answer (the new element is the first bigger or smaller item to its right). For "previous", you pop everything that cannot be the answer, and whatever remains on top is the answer for the new element.

**Strict or not?** Whether you pop on \`>\` or \`>=\` decides how equal values are treated. In the dry run, the second 2 did *not* pop the first 2, because "next greater" means strictly greater. If the question says "greater than or equal", flip to \`>=\`. Getting this wrong on purpose-built duplicate test cases is the most common bug.

Example 1 runs all four on the same array:

| Variant | Result for \`[2, 1, 2, 4, 3]\` |
| :--- | :--- |
| next greater | \`[4, 2, 4, -1, -1]\` |
| next smaller | \`[1, -1, -1, 3, -1]\` |
| previous greater | \`[-1, 2, -1, -1, 4]\` |
| previous smaller | \`[-1, -1, 1, 2, 2]\` |

## 5. When to Use It: The Signals

Reach for a monotonic stack when the question, for **each** element, asks about the **nearest** element on one side that is bigger or smaller, or about how far an element "reaches" before something bigger or smaller stops it.

| Problem | What the stack finds | Page |
| :--- | :--- | :--- |
| Next greater element, Daily Temperatures | Next greater to the right | [Daily Temperatures](/interview-question/how-do-you-find-the-next-greater-element-for-every-item-daily-temperatures) |
| Online stock span | Previous greater (how many days back are not higher) | Example 2 below |
| Largest rectangle in a histogram | Previous and next smaller bar for each bar | [Largest rectangle](/interview-question/how-do-you-find-the-largest-rectangle-in-a-histogram) |
| Trapping rain water | The walls on each side of a dip | [Trapping rain water](/interview-question/how-do-you-solve-the-trapping-rain-water-problem) |
| Sum of subarray minimums | For each element, how far left and right it stays the minimum | — |
| Remove k digits to make the smallest number | Keep an increasing stack of digits | — |

**Signals that it is *not* a monotonic stack:** you need the k-th largest (use a [heap](/interview-question/what-is-a-heap-priority-queue)), you need the maximum of a sliding window of fixed size (use a monotonic *deque*, which pops from both ends; see [the sliding window technique](/interview-question/what-is-the-sliding-window-technique)), or the nearest element can be on either side with no ordering rule.

📌 **Interview term: Monotonic deque** — the same idea with a double-ended queue, so old elements can also leave from the front when they slide out of a window.

### Worked example: stock span

The span of today's price is the number of consecutive days, ending today, on which the price was less than or equal to today's. That is "distance to the previous strictly greater price". Keep a stack of \`(price, span)\` pairs with **strictly decreasing** prices. When a new price arrives, pop every pair with price \`<=\` today and add its span to today's span; whatever is left on top is the previous greater day.

For prices \`[100, 80, 60, 70, 60, 75, 85]\` the spans are \`[1, 1, 1, 2, 1, 4, 6]\`: on the day of 75, it absorbs the spans of 60 (1) and 70 (2) for a total of 1 + 1 + 2 = 4.

## 6. The Java Template

~~~java
static int[] nearest(int[] nums, boolean fromLeft, boolean wantGreater) {
    int n = nums.length;
    int[] result = new int[n];
    Arrays.fill(result, -1);
    int[] stack = new int[n];        // a plain int array as the stack: no boxing
    int top = 0;                     // number of items on the stack
    for (int i = 0; i < n; i++) {
        int x = nums[i];
        if (fromLeft) {
            // Previous: pop everything that cannot beat x, top is the answer.
            while (top > 0 && (wantGreater ? nums[stack[top - 1]] <= x : nums[stack[top - 1]] >= x)) top--;
            if (top > 0) result[i] = nums[stack[top - 1]];
        } else {
            // Next: x is the answer for every waiting index it beats.
            while (top > 0 && (wantGreater ? x > nums[stack[top - 1]] : x < nums[stack[top - 1]])) {
                result[stack[--top]] = x;
            }
        }
        stack[top++] = i;
    }
    return result;
}
~~~

Java details:

- **An \`int[]\` as the stack.** The stack can never hold more than n indices, so \`int[] stack = new int[n]\` with an \`int top\` counter is enough: push is \`stack[top++] = i\`, peek is \`stack[top - 1]\`, pop is \`stack[--top]\`, empty is \`top == 0\`. No \`Integer\` objects are created.
- **\`ArrayDeque<Integer>\` also works.** It reads more like a textbook stack (\`push\`, \`peek\`, \`pop\`, \`isEmpty\`) at the cost of boxing every index. Avoid \`java.util.Stack\`; its [documentation](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Stack.html) recommends \`Deque\` instead.
- **Boxed comparisons.** If you store *values* in a \`Deque<Integer>\`, write \`nums[i] > stack.peek()\` (one side is a primitive, so it unboxes) and never \`stack.peek() == other.peek()\`, which compares references and fails for values above 127.
- **\`Arrays.fill(result, -1)\`** sets the default; **\`Arrays.toString\`** prints \`[4, 2, 4, -1, -1]\`, which is why the other languages format their output the same way.
- **Right-to-left form.** Scanning \`for (int i = n - 1; i >= 0; i--)\` and popping while \`nums[stack[top - 1]] <= nums[i]\` gives the same next-greater answers; with an \`int i\` the loop condition \`i >= 0\` is safe.

## 7. Verified: Running the Code

Each example below was saved to a file and run with \`javac Main.java && java Main\` (OpenJDK 21 (javac 21)). The same programs in the other three languages print exactly the same lines.

**Example 1 — All four variants on one array** printed:

~~~text
nums             [2, 1, 2, 4, 3]
next greater     [4, 2, 4, -1, -1]
next smaller     [1, -1, -1, 3, -1]
previous greater [-1, 2, -1, -1, 4]
previous smaller [-1, -1, 1, 2, 2]
~~~

**Example 2 — Online stock span, counting pushes and pops** printed:

~~~text
prices [100, 80, 60, 70, 60, 75, 85]
spans  [1, 1, 1, 2, 1, 4, 6]
n=100000 pushes=100000 pops=99995 sum of spans=49859883
~~~

Example 2 is the amortised argument made visible: 100,000 prices caused exactly 100,000 pushes and 99,995 pops, so the total stack work is under 2n even though some single calls popped many items. The span total is printed as a checksum so the four languages can be compared.

## 8. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n) | Each index is pushed once and popped at most once |
| Space | O(n) | In the worst case (for example a strictly decreasing array for "next greater") every index waits on the stack |
| Brute force | O(n²) | For each element, scan outward until you find the answer |
| One online \`next(price)\` call (stock span) | amortised O(1) | A single call may pop many items, but each item is popped once ever |

## 9. Edge Cases

- **Empty input** — no iterations; return an empty answer.
- **All equal values** — with a strict comparison nothing ever pops, so every "next greater" is -1. With a non-strict comparison every element pops its predecessor. Decide which the question means.
- **Strictly increasing input** — for "next greater", every element is popped by its neighbour; the stack never holds more than one item.
- **Strictly decreasing input** — nothing pops until the end; the stack grows to n. This is the worst case for memory.
- **Circular arrays** — loop over \`2n\` positions with \`i % n\` so elements near the end can find answers at the start; covered in [Daily Temperatures](/interview-question/how-do-you-find-the-next-greater-element-for-every-item-daily-temperatures).

## Common Pitfalls

- **Pushing values instead of indices.** You can no longer write the answer into the right slot.
- **Wrong strictness.** \`<\` versus \`<=\` decides how duplicates behave; test \`[2, 2]\`.
- **\`Integer == Integer\`.** Comparing two boxed values by reference works for small numbers and fails above 127.
- **\`java.util.Stack\`.** Synchronised and legacy; use an \`int[]\` or \`ArrayDeque\`.
- **Forgetting the leftovers.** Use \`Arrays.fill\` for the default so unpopped indices already hold it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A monotonic stack is a normal stack I keep sorted, increasing or decreasing, by popping every element that would break the order before pushing the new one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it helps:</strong> <span style="color:#f0e2c8;">Popped elements have just met their answer: for next greater, the new element is the first bigger item to their right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">O(n) time because each index is pushed once and popped at most once; O(n) space at worst.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Variants:</strong> <span style="color:#f0e2c8;">Next or previous, greater or smaller; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> versus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> decides how duplicates behave.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java details:</strong> <span style="color:#f0e2c8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[] stack</code> with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top</code> counter avoids boxing; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque&lt;Integer&gt;</code> is the readable alternative, never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">java.util.Stack</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.fill(result, -1)</code> sets the defaults.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int[]</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ArrayDeque&lt;Integer&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The stack never exceeds n entries, so a fixed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> is enough, avoids creating an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> per push and is cache-friendly. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> is fine when readability matters more.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why store indices?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">To write into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result[j]</code> and to compute distances such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - j</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know a problem needs one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When, for each element, you need the nearest greater or smaller element on one side, or a span or width bounded by one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a circular array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> from 0 to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 * n - 1</code>, read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i % n]</code>, and push only while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &lt; n</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a monotonic deque?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same invariant in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> that also removes from the front when elements leave a fixed window; it gives the sliding window maximum in O(n).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Monotonic stack** | A stack kept sorted by popping elements that would break the order before each push |
| **Monotonically decreasing / increasing** | Each element is smaller (or larger) than the one below it |
| **Amortised O(1) per element** | One step may pop many items, but the total over all steps is O(n) |
| **Monotonic deque** | The same idea with a deque, so elements can also expire from the front |

---
**Conclusion:** A monotonic stack is an ordinary stack with one rule: before pushing, pop everything that would break the sorted order. Every popped element has just met its nearest greater (or smaller) neighbour, and since each index is pushed once and popped at most once, the pass is O(n). Flip the direction or the comparison and the same template gives all four nearest-element lookups, stock span and histogram rectangles. In Java an \`int[]\` with a top counter is the fastest stack, and \`ArrayDeque\` the readable one; never compare boxed values with \`==\`.`,
        examples: [
          {
            label: "All four variants on one array",
            code: `import java.util.Arrays;

public class Main {
    // For each item, the nearest value on one side that is strictly greater
    // (or smaller); -1 if there is none. One monotonic stack of indices.
    static int[] nearest(int[] nums, boolean fromLeft, boolean wantGreater) {
        int n = nums.length;
        int[] result = new int[n];
        Arrays.fill(result, -1);
        int[] stack = new int[n];        // a plain int array as the stack: no boxing
        int top = 0;                     // number of items on the stack
        for (int i = 0; i < n; i++) {
            int x = nums[i];
            if (fromLeft) {
                // Previous: pop everything that cannot beat x, top is the answer.
                while (top > 0 && (wantGreater ? nums[stack[top - 1]] <= x : nums[stack[top - 1]] >= x)) top--;
                if (top > 0) result[i] = nums[stack[top - 1]];
            } else {
                // Next: x is the answer for every waiting index it beats.
                while (top > 0 && (wantGreater ? x > nums[stack[top - 1]] : x < nums[stack[top - 1]])) {
                    result[stack[--top]] = x;
                }
            }
            stack[top++] = i;
        }
        return result;
    }

    public static void main(String[] args) {
        int[] nums = {2, 1, 2, 4, 3};
        System.out.println("nums             " + Arrays.toString(nums));
        System.out.println("next greater     " + Arrays.toString(nearest(nums, false, true)));
        System.out.println("next smaller     " + Arrays.toString(nearest(nums, false, false)));
        System.out.println("previous greater " + Arrays.toString(nearest(nums, true, true)));
        System.out.println("previous smaller " + Arrays.toString(nearest(nums, true, false)));
    }
}
`,
          },
          {
            label: "Online stock span, counting pushes and pops",
            code: `import java.util.Arrays;

public class Main {
    // Span = how many consecutive days, ending today, had price <= today.
    // Two parallel int arrays act as a stack of (price, span) pairs with
    // strictly decreasing prices.
    static class StockSpanner {
        int[] prices = new int[16], spans = new int[16];
        int size = 0;
        long pushes = 0, pops = 0;

        int next(int price) {
            int span = 1;
            while (size > 0 && prices[size - 1] <= price) {
                span += spans[--size];        // absorb the smaller day's span
                pops++;
            }
            if (size == prices.length) {      // grow like ArrayList does
                prices = Arrays.copyOf(prices, size * 2);
                spans = Arrays.copyOf(spans, size * 2);
            }
            prices[size] = price;
            spans[size++] = span;
            pushes++;
            return span;
        }
    }

    public static void main(String[] args) {
        StockSpanner sp = new StockSpanner();
        int[] prices = {100, 80, 60, 70, 60, 75, 85};
        int[] spans = new int[prices.length];
        for (int i = 0; i < prices.length; i++) spans[i] = sp.next(prices[i]);
        System.out.println("prices " + Arrays.toString(prices));
        System.out.println("spans  " + Arrays.toString(spans));

        // Every price is pushed once and popped at most once: at most 2n stack steps.
        StockSpanner big = new StockSpanner();
        int n = 100000;
        long total = 0;
        for (int i = 0; i < n; i++) total += big.next((i * 37) % 101);
        System.out.println("n=" + n + " pushes=" + big.pushes + " pops=" + big.pops + " sum of spans=" + total);
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"What is a monotonic stack? Explain it, give me the problems it solves, and code a C++ example such as next greater element, explaining the complexity."

**What a strong answer should cover:**
- A stack kept sorted (increasing or decreasing) by popping before each push; popped elements get their answer from the new element.
- The four variants and strict versus non-strict comparison for duplicates.
- O(n) time by the push-once, pop-once argument.
- Recognising the pattern and when a heap or monotonic deque is better.
- C++ specifics: \`std::vector<int>\` (or \`std::stack<int>\`) of indices; \`back()\` on empty is undefined behaviour so \`!stack.empty() &&\` must come first; \`std::vector<int> result(n, -1)\`; unsigned \`size_t\` in a reverse loop never goes below zero.

**Code / implementation expected:** Yes — a C++ next-greater (or stock span) function using \`std::vector<int>\` as the stack.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a stack is.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this C++ version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

Imagine people standing in a line at a viewpoint, all facing right, towards a mountain. Each person wants to know: *who is the first person to my right who is taller than me?* That is the person who blocks my view.

Checking every person against everyone to their right takes ages. Here is a faster way. Walk along the line from left to right, keeping a little group of "people still waiting for an answer". Whenever a new person arrives, everyone in the waiting group who is shorter than the newcomer has found their answer: it is the newcomer. They leave the group. Then the newcomer joins the group to wait for someone taller.

Notice something about the waiting group: it is always ordered from tallest (joined earliest) to shortest (joined most recently), because anyone shorter than a newcomer was removed. A group that is always sorted like this, where you only add and remove at one end, is a **monotonic stack**. It turns a "for every item, look for the nearest bigger or smaller item" problem from O(n²) into O(n), and that pattern shows up in a surprising number of interview problems.

## 2. What a Monotonic Stack Is

📌 **Interview term: Monotonic stack** — an ordinary stack that you keep sorted from bottom to top (always increasing, or always decreasing) by popping every element that would break the order before you push a new one.

📌 **Interview term: Monotonically decreasing / increasing** — "decreasing" means each element is smaller than (or equal to, depending on the rule) the one below it; "increasing" means each is larger.

The stack itself is nothing special: Python's list, a JavaScript array, Java's \`ArrayDeque\` or an \`int[]\`, C++'s \`std::vector\`. What makes it "monotonic" is the **rule you apply before each push**:

1. Look at the new element \`x\`.
2. While the stack is not empty and its top would break the order, **pop** the top. Each popped element has just met the element that answers its question.
3. Push \`x\` (usually its *index*, so you can compute distances and write into an answer array).

The popping is where the work happens. For "next greater element", an item stays on the stack exactly until a bigger item arrives, and that bigger item is the answer.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 290" role="img" aria-label="Bars for the array 2, 1, 2, 4, 3 with an arrow from each bar to its next greater element. The answers are 4, 2, 4, none, none">
  <defs>
    <marker id="b11q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="70" y="140" width="60" height="80" rx="4"/>
  <text class="d-text" x="100" y="208" text-anchor="middle">2</text>
  <rect class="d-box" x="180" y="180" width="60" height="40" rx="4"/>
  <text class="d-text" x="210" y="208" text-anchor="middle">1</text>
  <rect class="d-box" x="290" y="140" width="60" height="80" rx="4"/>
  <text class="d-text" x="320" y="208" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="400" y="60" width="60" height="160" rx="4"/>
  <text class="d-text" x="430" y="208" text-anchor="middle">4</text>
  <rect class="d-box" x="510" y="100" width="60" height="120" rx="4"/>
  <text class="d-text" x="540" y="208" text-anchor="middle">3</text>
  <path class="d-edge" d="M 40 220 L 600 220"/>

  <path class="d-edge-accent" d="M 100 134 Q 250 20 420 54" marker-end="url(#b11q4-arrow)"/>
  <path class="d-edge-accent" d="M 210 174 Q 260 120 310 136" marker-end="url(#b11q4-arrow)"/>
  <path class="d-edge-accent" d="M 330 134 Q 380 70 410 66" marker-end="url(#b11q4-arrow)"/>

  <text class="d-sub" x="40" y="252" text-anchor="start">next greater</text>
  <text class="d-text" x="100" y="252" text-anchor="middle">4</text>
  <text class="d-text" x="210" y="252" text-anchor="middle">2</text>
  <text class="d-text" x="320" y="252" text-anchor="middle">4</text>
  <text class="d-text" x="430" y="252" text-anchor="middle">-1</text>
  <text class="d-text" x="540" y="252" text-anchor="middle">-1</text>
</svg>

The arrows show the answer for \`[2, 1, 2, 4, 3]\`: the first 2 waits until 4, the 1 is answered by the very next 2, and 4 and 3 never meet anything bigger, so they keep the default -1.

### Dry run: next greater element of \`[2, 1, 2, 4, 3]\`

The stack holds indices; values are shown in brackets. It stays **decreasing** from bottom to top.

| i | x | Pops (and the answer they get) | Stack after (values) |
| :--- | :--- | :--- | :--- |
| 0 | 2 | none | [2] |
| 1 | 1 | none, 1 is not greater than 2 | [2, 1] |
| 2 | 2 | pop index 1, answer[1] = 2; stop, 2 is not greater than 2 | [2, 2] |
| 3 | 4 | pop index 2, answer[2] = 4; pop index 0, answer[0] = 4 | [4] |
| 4 | 3 | none | [4, 3] |
| end | | indices 3 and 4 never popped: answer stays -1 | |

Result: \`[4, 2, 4, -1, -1]\`, which is what Example 1 prints.

## 3. Why It Is O(n), Not O(n²)

There is a \`while\` loop inside a \`for\` loop, which looks quadratic. It is not, because of a simple counting argument: **each index is pushed exactly once and popped at most once.** So across the whole run there are at most n pushes and n pops, and the total work is O(n) no matter how the pops are spread out. One step might pop many items, but then those items are gone forever.

📌 **Interview term: Amortised O(1) per element** — the cost of one step can be large, but the total over all steps is O(n), so the average per element is constant. See [amortized analysis](/interview-question/what-is-amortized-analysis).

Example 2 measures this on the stock span problem with 100,000 prices: exactly 100,000 pushes and 99,995 pops, never more than one pop per push.

## 4. The Four Variants (and the One Knob That Changes Them)

Almost every monotonic stack question is one of four lookups: the nearest **greater** or **smaller** element, to the **right** (next) or to the **left** (previous).

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="Four variants of the monotonic stack: next greater, next smaller, previous greater and previous smaller, with the pop rule for each">
  <text class="d-text" x="245" y="30" text-anchor="middle">answer to the right (next)</text>
  <text class="d-text" x="545" y="30" text-anchor="middle">answer to the left (previous)</text>

  <rect class="d-box-accent" x="120" y="50" width="250" height="90" rx="10"/>
  <text class="d-text" x="245" y="80" text-anchor="middle">next greater</text>
  <text class="d-sub" x="245" y="104" text-anchor="middle">pop while x &gt; top</text>
  <text class="d-sub" x="245" y="124" text-anchor="middle">popped item gets x</text>

  <rect class="d-box-muted" x="420" y="50" width="250" height="90" rx="10"/>
  <text class="d-text" x="545" y="80" text-anchor="middle">previous greater</text>
  <text class="d-sub" x="545" y="104" text-anchor="middle">pop while top &lt;= x</text>
  <text class="d-sub" x="545" y="124" text-anchor="middle">remaining top is the answer</text>

  <rect class="d-box-accent" x="120" y="166" width="250" height="90" rx="10"/>
  <text class="d-text" x="245" y="196" text-anchor="middle">next smaller</text>
  <text class="d-sub" x="245" y="220" text-anchor="middle">pop while x &lt; top</text>
  <text class="d-sub" x="245" y="240" text-anchor="middle">popped item gets x</text>

  <rect class="d-box-muted" x="420" y="166" width="250" height="90" rx="10"/>
  <text class="d-text" x="545" y="196" text-anchor="middle">previous smaller</text>
  <text class="d-sub" x="545" y="220" text-anchor="middle">pop while top &gt;= x</text>
  <text class="d-sub" x="545" y="240" text-anchor="middle">remaining top is the answer</text>

  <text class="d-sub" x="60" y="100" text-anchor="middle">greater</text>
  <text class="d-sub" x="60" y="216" text-anchor="middle">smaller</text>
</svg>

The two columns differ in *who gets the answer*. For "next", the popped element receives the answer (the new element is the first bigger or smaller item to its right). For "previous", you pop everything that cannot be the answer, and whatever remains on top is the answer for the new element.

**Strict or not?** Whether you pop on \`>\` or \`>=\` decides how equal values are treated. In the dry run, the second 2 did *not* pop the first 2, because "next greater" means strictly greater. If the question says "greater than or equal", flip to \`>=\`. Getting this wrong on purpose-built duplicate test cases is the most common bug.

Example 1 runs all four on the same array:

| Variant | Result for \`[2, 1, 2, 4, 3]\` |
| :--- | :--- |
| next greater | \`[4, 2, 4, -1, -1]\` |
| next smaller | \`[1, -1, -1, 3, -1]\` |
| previous greater | \`[-1, 2, -1, -1, 4]\` |
| previous smaller | \`[-1, -1, 1, 2, 2]\` |

## 5. When to Use It: The Signals

Reach for a monotonic stack when the question, for **each** element, asks about the **nearest** element on one side that is bigger or smaller, or about how far an element "reaches" before something bigger or smaller stops it.

| Problem | What the stack finds | Page |
| :--- | :--- | :--- |
| Next greater element, Daily Temperatures | Next greater to the right | [Daily Temperatures](/interview-question/how-do-you-find-the-next-greater-element-for-every-item-daily-temperatures) |
| Online stock span | Previous greater (how many days back are not higher) | Example 2 below |
| Largest rectangle in a histogram | Previous and next smaller bar for each bar | [Largest rectangle](/interview-question/how-do-you-find-the-largest-rectangle-in-a-histogram) |
| Trapping rain water | The walls on each side of a dip | [Trapping rain water](/interview-question/how-do-you-solve-the-trapping-rain-water-problem) |
| Sum of subarray minimums | For each element, how far left and right it stays the minimum | — |
| Remove k digits to make the smallest number | Keep an increasing stack of digits | — |

**Signals that it is *not* a monotonic stack:** you need the k-th largest (use a [heap](/interview-question/what-is-a-heap-priority-queue)), you need the maximum of a sliding window of fixed size (use a monotonic *deque*, which pops from both ends; see [the sliding window technique](/interview-question/what-is-the-sliding-window-technique)), or the nearest element can be on either side with no ordering rule.

📌 **Interview term: Monotonic deque** — the same idea with a double-ended queue, so old elements can also leave from the front when they slide out of a window.

### Worked example: stock span

The span of today's price is the number of consecutive days, ending today, on which the price was less than or equal to today's. That is "distance to the previous strictly greater price". Keep a stack of \`(price, span)\` pairs with **strictly decreasing** prices. When a new price arrives, pop every pair with price \`<=\` today and add its span to today's span; whatever is left on top is the previous greater day.

For prices \`[100, 80, 60, 70, 60, 75, 85]\` the spans are \`[1, 1, 1, 2, 1, 4, 6]\`: on the day of 75, it absorbs the spans of 60 (1) and 70 (2) for a total of 1 + 1 + 2 = 4.

## 6. The C++ Template

~~~cpp
std::vector<int> nearest(const std::vector<int>& nums, bool fromLeft, bool wantGreater) {
    int n = (int)nums.size();
    std::vector<int> result(n, -1);
    std::vector<int> stack;                  // indices
    for (int i = 0; i < n; i++) {
        int x = nums[i];
        if (fromLeft) {
            // Previous: pop everything that cannot beat x, top is the answer.
            while (!stack.empty() && (wantGreater ? nums[stack.back()] <= x : nums[stack.back()] >= x))
                stack.pop_back();
            if (!stack.empty()) result[i] = nums[stack.back()];
        } else {
            // Next: x is the answer for every waiting index it beats.
            while (!stack.empty() && (wantGreater ? x > nums[stack.back()] : x < nums[stack.back()])) {
                result[stack.back()] = x;
                stack.pop_back();
            }
        }
        stack.push_back(i);
    }
    return result;
}
~~~

C++ details:

- **\`std::vector<int>\` as the stack.** \`push_back\`, \`back\` and \`pop_back\`; you can \`reserve(n)\` once because the stack never exceeds n. \`std::stack<int>\` works too, but it hides the contents, which makes debugging harder.
- **Guard order.** \`!stack.empty() && nums[stack.back()] ...\` relies on \`&&\` short-circuiting: \`back()\` on an empty vector is undefined behaviour, so the emptiness test must come first.
- **\`std::vector<int> result(n, -1)\`.** The constructor fills the default answer.
- **Signed loop indices.** The code uses \`int i\` and casts \`nums.size()\` once. If you write the right-to-left version, an unsigned index is a classic trap, because \`i >= 0\` is always true for \`size_t\`. Compiling this with warnings on:

~~~cpp
#include <cstddef>
#include <vector>
int main() {
    std::vector<int> v = {1, 2, 3};
    int sum = 0;
    for (std::size_t i = v.size() - 1; i >= 0; --i) sum += v[i];
    return sum;
}
~~~

~~~text
loop.cpp:6:42: warning: comparison of unsigned expression in '>= 0' is always true [-Wtype-limits]
~~~

That loop never ends normally: after \`i\` reaches 0, \`--i\` wraps around to the largest \`size_t\` value and \`v[i]\` reads far out of bounds. Use \`int\` (or \`std::ptrdiff_t\`) for reverse loops, or loop \`for (size_t i = n; i-- > 0;)\`.

📌 **Interview term: Undefined behaviour (UB)** — code the standard gives no meaning to, such as \`back()\` on an empty vector or reading out of bounds.

## 7. Verified: Running the Code

Each example below was saved to a file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3 with -std=c++17). The same programs in the other three languages print exactly the same lines.

**Example 1 — All four variants on one array** printed:

~~~text
nums             [2, 1, 2, 4, 3]
next greater     [4, 2, 4, -1, -1]
next smaller     [1, -1, -1, 3, -1]
previous greater [-1, 2, -1, -1, 4]
previous smaller [-1, -1, 1, 2, 2]
~~~

**Example 2 — Online stock span, counting pushes and pops** printed:

~~~text
prices [100, 80, 60, 70, 60, 75, 85]
spans  [1, 1, 1, 2, 1, 4, 6]
n=100000 pushes=100000 pops=99995 sum of spans=49859883
~~~

Example 2 is the amortised argument made visible: 100,000 prices caused exactly 100,000 pushes and 99,995 pops, so the total stack work is under 2n even though some single calls popped many items. The span total is printed as a checksum so the four languages can be compared.

## 8. Complexity

| | Cost | Why |
| :--- | :--- | :--- |
| Time | O(n) | Each index is pushed once and popped at most once |
| Space | O(n) | In the worst case (for example a strictly decreasing array for "next greater") every index waits on the stack |
| Brute force | O(n²) | For each element, scan outward until you find the answer |
| One online \`next(price)\` call (stock span) | amortised O(1) | A single call may pop many items, but each item is popped once ever |

## 9. Edge Cases

- **Empty input** — no iterations; return an empty answer.
- **All equal values** — with a strict comparison nothing ever pops, so every "next greater" is -1. With a non-strict comparison every element pops its predecessor. Decide which the question means.
- **Strictly increasing input** — for "next greater", every element is popped by its neighbour; the stack never holds more than one item.
- **Strictly decreasing input** — nothing pops until the end; the stack grows to n. This is the worst case for memory.
- **Circular arrays** — loop over \`2n\` positions with \`i % n\` so elements near the end can find answers at the start; covered in [Daily Temperatures](/interview-question/how-do-you-find-the-next-greater-element-for-every-item-daily-temperatures).

## Common Pitfalls

- **Pushing values instead of indices.** You lose the position to write the answer into.
- **Wrong strictness.** \`<\` versus \`<=\` decides how duplicates behave; test \`{2, 2}\`.
- **\`back()\` before \`empty()\`.** Undefined behaviour; keep \`!stack.empty() &&\` first.
- **Unsigned reverse loops.** \`for (size_t i = n - 1; i >= 0; --i)\` never terminates correctly (g++ warns with \`-Wextra\`).
- **Using \`std::stack\` and then needing to inspect it.** \`std::stack\` has no iteration; switch to \`std::vector\` if you need to see the contents.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A monotonic stack is a normal stack I keep sorted, increasing or decreasing, by popping every element that would break the order before pushing the new one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it helps:</strong> <span style="color:#f0e2c8;">Popped elements have just met their answer: for next greater, the new element is the first bigger item to their right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cost:</strong> <span style="color:#f0e2c8;">O(n) time because each index is pushed once and popped at most once; O(n) space at worst.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Variants:</strong> <span style="color:#f0e2c8;">Next or previous, greater or smaller; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> versus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> decides how duplicates behave.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ details:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt;</code> of indices with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">back</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_back</code>, guarded by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!stack.empty() &amp;&amp;</code> because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">back()</code> on empty is undefined behaviour, and signed indices in reverse loops.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::vector</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::stack</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same cost, but a vector can <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reserve(n)</code> up front and can be inspected in a debugger or printed; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stack</code> only exposes the top.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why store indices?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">To write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result[j]</code> and compute distances such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - j</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What goes wrong with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">size_t</code> in a reverse scan?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt;= 0</code> is always true for an unsigned type, so after 0 the index wraps to a huge value and reads out of bounds; g++ warns about it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-Wextra</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a circular array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 * n</code>, read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i % n]</code>, push only while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &lt; n</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a monotonic deque?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same idea with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::deque</code>, which can also pop from the front when elements leave a fixed-size window; it gives the sliding window maximum in O(n).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Monotonic stack** | A stack kept sorted by popping elements that would break the order before each push |
| **Monotonically decreasing / increasing** | Each element is smaller (or larger) than the one below it |
| **Amortised O(1) per element** | One step may pop many items, but the total over all steps is O(n) |
| **Monotonic deque** | The same idea with a deque, so elements can also expire from the front |
| **Undefined behaviour (UB)** | Code the standard gives no meaning to, such as \`back()\` on an empty vector |

---
**Conclusion:** A monotonic stack is an ordinary stack with one rule: before pushing, pop everything that would break the sorted order. Every popped element has just met its nearest greater (or smaller) neighbour, and since each index is pushed once and popped at most once, the pass is O(n). Flip the direction or the comparison and the same template gives all four nearest-element lookups, stock span and histogram rectangles. In C++ a \`std::vector<int>\` of indices, an \`empty()\` check before \`back()\`, and signed indices in reverse loops keep it safe.`,
        examples: [
          {
            label: "All four variants on one array",
            code: `#include <iostream>
#include <string>
#include <vector>

// For each item, the nearest value on one side that is strictly greater
// (or smaller); -1 if there is none. One monotonic stack of indices.
std::vector<int> nearest(const std::vector<int>& nums, bool fromLeft, bool wantGreater) {
    int n = (int)nums.size();
    std::vector<int> result(n, -1);
    std::vector<int> stack;                  // indices
    for (int i = 0; i < n; i++) {
        int x = nums[i];
        if (fromLeft) {
            // Previous: pop everything that cannot beat x, top is the answer.
            while (!stack.empty() && (wantGreater ? nums[stack.back()] <= x : nums[stack.back()] >= x))
                stack.pop_back();
            if (!stack.empty()) result[i] = nums[stack.back()];
        } else {
            // Next: x is the answer for every waiting index it beats.
            while (!stack.empty() && (wantGreater ? x > nums[stack.back()] : x < nums[stack.back()])) {
                result[stack.back()] = x;
                stack.pop_back();
            }
        }
        stack.push_back(i);
    }
    return result;
}

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

int main() {
    std::vector<int> nums = {2, 1, 2, 4, 3};
    std::cout << "nums             " << fmt(nums) << "\\n";
    std::cout << "next greater     " << fmt(nearest(nums, false, true)) << "\\n";
    std::cout << "next smaller     " << fmt(nearest(nums, false, false)) << "\\n";
    std::cout << "previous greater " << fmt(nearest(nums, true, true)) << "\\n";
    std::cout << "previous smaller " << fmt(nearest(nums, true, false)) << "\\n";
}
`,
          },
          {
            label: "Online stock span, counting pushes and pops",
            code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

// Span = how many consecutive days, ending today, had price <= today.
// The stack keeps {price, span} pairs with strictly decreasing prices.
class StockSpanner {
    std::vector<std::pair<int, int>> st;

public:
    long long pushes = 0, pops = 0;
    int next(int price) {
        int span = 1;
        while (!st.empty() && st.back().first <= price) {
            span += st.back().second;         // absorb the smaller day's span
            st.pop_back();
            pops++;
        }
        st.push_back({price, span});
        pushes++;
        return span;
    }
};

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

int main() {
    StockSpanner sp;
    std::vector<int> prices = {100, 80, 60, 70, 60, 75, 85}, spans;
    for (int p : prices) spans.push_back(sp.next(p));
    std::cout << "prices " << fmt(prices) << "\\n";
    std::cout << "spans  " << fmt(spans) << "\\n";

    // Every price is pushed once and popped at most once: at most 2n stack steps.
    StockSpanner big;
    int n = 100000;
    long long total = 0;
    for (int i = 0; i < n; i++) total += big.next((i * 37) % 101);
    std::cout << "n=" << n << " pushes=" << big.pushes << " pops=" << big.pops
              << " sum of spans=" << total << "\\n";
}
`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do you find the next greater element for every item (Daily Temperatures)?",
    difficulty: "medium",
    seoDescription: "Solve Daily Temperatures and next greater element in O(n) with a monotonic stack in Python, JavaScript, Java and C++, with verified runs.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a list of daily temperatures, return a list where each entry says how many days you have to wait after that day for a strictly warmer temperature, or 0 if there is none. Please code it in Python and get it under O(n squared)."

**What a strong answer should cover:**
- The O(n²) brute force first, then the monotonic decreasing stack of indices that answers each day when a warmer day pops it.
- Why it is O(n): each index is pushed once and popped at most once.
- Strict \`<\` for strictly warmer, and the default 0 for days never popped.
- The variants: circular (loop \`2n\` with \`i % n\`) and the subset version with a hash map.
- Python specifics: \`enumerate\`, \`[0] * n\`, a list as the stack with \`stack[-1]\`, \`while stack and ...\`, and \`dict.get(x, -1)\` for the subset variant.

**Clarifying questions expected:**
- "Is warmer strictly greater, or does an equal temperature count?"
- "What should the answer be when no warmer day exists?"

**Code / implementation expected:** Yes — a Python function using a list of indices as a monotonic stack.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a stack is.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Python version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

You keep a diary of the temperature every day. For each day, you want to write next to it: *"how many days until it got warmer than this?"* The slow way is to take each day and read forward until you find a warmer one. On a long cold spell that means reading almost the whole diary again for every single day.

A smarter diary-keeper reads the diary **once**. She keeps a short list of days that are "still waiting for a warmer day". When a new day arrives, every waiting day that is colder than it gets its answer right now (today minus that day) and is crossed off. Then the new day joins the waiting list. The waiting list is always ordered from warmest at the bottom to coldest at the top, because any colder day sitting above a warmer newcomer would have been crossed off already. That ordered waiting list is a [monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it).

This is the most common way the monotonic stack shows up in interviews, under several names: Daily Temperatures (LeetCode 739), Next Greater Element I and II (496 and 503), and stock span. Getting it right shows you can turn an obvious O(n²) scan into O(n) and explain why the nested loop is still linear.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Warmer means strictly greater, or greater or equal? | Decides \`<\` versus \`<=\` in the pop condition; equal days are the classic hidden test. |
| What goes in the answer when no warmer day exists? | Daily Temperatures uses 0 (a distance); Next Greater Element uses -1 (a value). |
| Do you want the number of days (a distance) or the warmer temperature (a value)? | Distance needs indices on the stack; value only needs the value. |
| How big can the input be? | Up to about 10^5 makes the O(n²) brute force too slow, so the stack is required. |
| Is the array circular? | Then loop twice with \`i % n\` (Next Greater Element II). |

## 3. The Core Idea

**Brute force.** For each day \`i\`, scan \`j = i + 1, i + 2, ...\` until \`temps[j] > temps[i]\`. In the worst case (a long run with no warmer day) each scan reads to the end: about n²/2 comparisons, O(n²) time.

**The monotonic stack.** Scan once, left to right, and keep a stack of *indices of days still waiting for a warmer day*. Their temperatures are **decreasing** from bottom to top (equal temperatures can sit next to each other, since equal is not warmer).

For each day \`i\` with temperature \`t\`:

1. While the stack is not empty **and** the day on top is colder than \`t\`: pop it as \`j\`, and set \`answer[j] = i - j\`.
2. Push \`i\`.

Days still on the stack at the end never saw a warmer day; their answer stays 0.

📌 **Interview term: Next greater element** — for each position, the first element to its right that is strictly larger. Daily Temperatures asks for the *distance* to it; Next Greater Element asks for its *value*.

📌 **Interview term: Monotonic decreasing stack** — a stack whose values never increase from bottom to top, maintained by popping smaller values before each push.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 280" role="img" aria-label="Day 5 with temperature 72 arrives. The stack holds days 2, 3 and 4 with temperatures 75, 71 and 69. Days 4 and 3 are colder, so they are popped with answers 1 and 2. Day 2 at 75 is warmer, so popping stops and day 5 is pushed">
  <defs>
    <marker id="b11q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="130" y="40" text-anchor="middle">stack before day 5</text>
  <rect class="d-box" x="60" y="116" width="140" height="34" rx="6"/>
  <text class="d-text" x="130" y="138" text-anchor="middle">day 4: 69</text>
  <rect class="d-box" x="60" y="158" width="140" height="34" rx="6"/>
  <text class="d-text" x="130" y="180" text-anchor="middle">day 3: 71</text>
  <rect class="d-box" x="60" y="200" width="140" height="34" rx="6"/>
  <text class="d-text" x="130" y="222" text-anchor="middle">day 2: 75</text>
  <path class="d-edge" d="M 50 244 L 210 244"/>

  <path class="d-edge" d="M 214 133 L 270 133" marker-end="url(#b11q5-arrow)"/>

  <text class="d-text" x="350" y="40" text-anchor="middle">day 5 arrives</text>
  <rect class="d-box-accent" x="280" y="116" width="140" height="34" rx="6"/>
  <text class="d-text d-accent" x="350" y="138" text-anchor="middle">day 5: 72</text>
  <text class="d-sub" x="350" y="182" text-anchor="middle">69 colder: answer[4] = 1</text>
  <text class="d-sub" x="350" y="204" text-anchor="middle">71 colder: answer[3] = 2</text>
  <text class="d-sub" x="350" y="226" text-anchor="middle">75 warmer: stop</text>

  <path class="d-edge" d="M 430 133 L 486 133" marker-end="url(#b11q5-arrow)"/>

  <text class="d-text" x="570" y="40" text-anchor="middle">stack after</text>
  <rect class="d-box-accent" x="500" y="158" width="140" height="34" rx="6"/>
  <text class="d-text" x="570" y="180" text-anchor="middle">day 5: 72</text>
  <rect class="d-box" x="500" y="200" width="140" height="34" rx="6"/>
  <text class="d-text" x="570" y="222" text-anchor="middle">day 2: 75</text>
  <path class="d-edge" d="M 490 244 L 650 244"/>
</svg>

This is the step for day 5 (72 degrees) in the sample \`[73, 74, 75, 71, 69, 72, 76, 73]\`: the two colder days on top (69 and 71) get their answers, and the warmer day 75 stays, because it is still waiting for something warmer than 75.

### Dry run on \`[73, 74, 75, 71, 69, 72, 76, 73]\`

| Day i | Temp | Pops (answer given) | Stack after (day: temp) |
| :--- | :--- | :--- | :--- |
| 0 | 73 | none | 0:73 |
| 1 | 74 | day 0, answer[0] = 1 | 1:74 |
| 2 | 75 | day 1, answer[1] = 1 | 2:75 |
| 3 | 71 | none | 2:75, 3:71 |
| 4 | 69 | none | 2:75, 3:71, 4:69 |
| 5 | 72 | day 4, answer[4] = 1; day 3, answer[3] = 2 | 2:75, 5:72 |
| 6 | 76 | day 5, answer[5] = 1; day 2, answer[2] = 4 | 6:76 |
| 7 | 73 | none | 6:76, 7:73 |
| end | | days 6 and 7 keep 0 | |

Answer: \`[1, 1, 4, 2, 1, 1, 0, 0]\`, which is what Example 1 prints.

📌 **Interview term: Amortised analysis** — the \`while\` loop can pop many items in one step, but every index is pushed once and popped at most once, so the total work over the whole scan is O(n). See [amortized analysis](/interview-question/what-is-amortized-analysis).

## 4. The Two Classic Variants

**Next Greater Element II (circular).** The array wraps around, so the last elements may find their answer at the start. Walk the indices \`0 .. 2n - 1\`, read \`nums[i % n]\`, and push indices only during the first pass (\`i < n\`). The second pass only answers elements that are still waiting.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 180" role="img" aria-label="Circular next greater for 1, 2, 1. The array is walked twice. The last 1 finds its answer 2 during the second pass">
  <defs>
    <marker id="b11q5-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="165" y="40" text-anchor="middle">first pass: i below n, push i</text>
  <text class="d-sub" x="485" y="40" text-anchor="middle">second pass: read i mod n only</text>
  <rect class="d-box" x="40" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="75" y="107" text-anchor="middle">1</text>
  <rect class="d-box" x="130" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="165" y="107" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="220" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="255" y="107" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="360" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="395" y="107" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="450" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="485" y="107" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="540" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="575" y="107" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 255 76 Q 370 50 478 74" marker-end="url(#b11q5-arrow2)"/>
  <text class="d-sub" x="75" y="150" text-anchor="middle">i = 0</text>
  <text class="d-sub" x="165" y="150" text-anchor="middle">i = 1</text>
  <text class="d-sub" x="255" y="150" text-anchor="middle">i = 2</text>
  <text class="d-sub" x="395" y="150" text-anchor="middle">i = 3</text>
  <text class="d-sub" x="485" y="150" text-anchor="middle">i = 4</text>
  <text class="d-sub" x="575" y="150" text-anchor="middle">i = 5</text>
</svg>

For \`[1, 2, 1]\` the last 1 (index 2) is still waiting at the end of the first pass; at \`i = 4\` the second pass reads \`nums[1] = 2\`, which answers it. The 2 itself never finds anything bigger, so it gets -1, giving \`[2, -1, 2]\`.

**Next Greater Element I (subset with a hash map).** You are given \`nums1\`, a subset of \`nums2\` with distinct values, and need each \`nums1\` value's next greater element *in \`nums2\`*. Run the stack over \`nums2\` once, record \`value -> next greater value\` in a hash map, and then answer each \`nums1\` value with a lookup (default -1). For \`nums1 = [4, 1, 2]\`, \`nums2 = [1, 3, 4, 2]\` the answer is \`[-1, 3, -1]\`. Example 3 runs both variants.

## 5. The Python Solution

~~~python
def daily_temperatures(temps):
    """answer[i] = days to wait after day i for a strictly warmer day (0 if never)."""
    answer = [0] * len(temps)
    stack = []                      # indices of days still waiting; temps decrease upward
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:   # today is warmer than the waiting day
            j = stack.pop()
            answer[j] = i - j
        stack.append(i)
    return answer                   # days left on the stack keep their 0
~~~

Python details:

- **\`[0] * len(temps)\`** builds the answer pre-filled with the "never warmer" value, so days left on the stack need no extra pass. (Multiplying a list of *numbers* is safe; multiplying a list of lists would share the inner list.)
- **\`for i, t in enumerate(temps)\`** gives the index and the value together.
- **The stack holds indices.** \`temps[stack[-1]]\` reads the waiting day's temperature, and \`i - j\` is the distance.
- **\`while stack and temps[stack[-1]] < t\`.** \`and\` short-circuits, so \`stack[-1]\` is never read on an empty list, where it would raise \`IndexError\`.
- **Strict \`<\`.** An equal temperature is not warmer, so it must not pop. Changing it to \`<=\` breaks the \`[70, 70, 70, 71]\` case.
- **Comparing results.** In Example 2, \`a == b\` compares two lists element by element, which is what you want; \`a is b\` would compare identity:

~~~python
print([1, 2] == [1, 2])
print([1, 2] is [1, 2])
~~~

~~~text
True
False
~~~

For Next Greater Element I, the subset version builds \`greater = {}\` and answers with \`greater.get(x, -1)\`, which returns -1 for values that never found a greater one without raising \`KeyError\`.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`python3 main.py\` (Python 3.13). The same programs in the other three languages print exactly the same lines.

**Example 1 — Daily Temperatures on the sample and edge cases** printed:

~~~text
[1, 1, 4, 2, 1, 1, 0, 0]
[1, 1, 1, 0]
[0, 0, 0]
[3, 2, 1, 0]
[0]
[]
~~~

**Example 2 — Brute force vs monotonic stack: counting comparisons** printed:

~~~text
sample: brute comparisons=11, stack comparisons=10, same answer=true
falling 3000: brute comparisons=168888, stack comparisons=5897, same answer=true
cold then hot 3000: brute comparisons=4498500, stack comparisons=5997, same answer=true
~~~

**Example 3 — Circular next greater (LeetCode 503) and the hash-map subset (LeetCode 496)** printed:

~~~text
[2, -1, 2]
[2, 3, 4, -1, 4]
[-1, -1, -1]
[-1, 3, -1]
[3, -1]
~~~

In Example 2 the "falling 3000" input repeats a slow fall from 100 to 31, and "cold then hot 3000" is 2,999 days at 30 followed by one day at 99. Equal days are not warmer, so in the second input the brute force scans to the end for every day (2,999 + 2,998 + ... = 4,498,500 comparisons) while the stack does fewer than two comparisons per day.

## 7. Complexity

| | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) extra | Each day may scan to the end |
| Monotonic stack | O(n) | O(n) | Each index pushed once and popped at most once; the stack can hold all n indices for a falling sequence |
| Circular version | O(n) | O(n) | Two passes of n, still at most n pushes |
| Subset version with hash map | O(n + m) | O(n) | One pass over \`nums2\`, then one lookup per \`nums1\` value |

Example 2 measured it: on 3,000 days of the same cold temperature followed by one hot day, the brute force made 4,498,500 comparisons and the stack 5,997, with identical answers.

## 8. Edge Cases

- **Equal temperatures** (\`[70, 70, 70, 71]\`) — equal is not warmer, so the pop uses strict \`<\`; all three 70s wait for the 71 and get \`[3, 2, 1, 0]\`.
- **Strictly falling** (\`[90, 80, 70]\`) — nobody is ever popped; everything stays 0, and the stack grows to n.
- **Strictly rising** (\`[30, 40, 50, 60]\`) — every day is answered by the next one: \`[1, 1, 1, 0]\`.
- **One day** (\`[50]\`) — \`[0]\`.
- **Empty input** — return an empty array; the loop never runs.
- **The last day** — always 0, because there is nothing after it.

## Common Pitfalls

- **Pushing temperatures instead of indices.** Then you cannot compute \`i - j\` or know which slot to fill.
- **\`<=\` instead of \`<\`.** Equal temperatures would answer each other; \`[70, 70, 70, 71]\` must give \`[3, 2, 1, 0]\`.
- **Popping the warmer day.** The condition is "top is colder than today"; flipping it builds an increasing stack and answers the wrong question.
- **\`greater[x]\` in the subset variant.** Raises \`KeyError\` for values with no greater element; use \`greater.get(x, -1)\`.
- **Two nested \`for\` loops "with a break".** Still O(n²) in the worst case: Example 2 counts 4,498,500 comparisons for 3,000 days.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Brute force:</strong> <span style="color:#f0e2c8;">For each day scan forward to the first warmer day: O(n²) for a long cold spell.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The idea:</strong> <span style="color:#f0e2c8;">Scan once with a stack of indices of days still waiting; their temperatures decrease from bottom to top.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The step:</strong> <span style="color:#f0e2c8;">For each day, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while stack and temps[stack[-1]] &lt; t</code>, pop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">answer[j] = i - j</code>; then push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>. Days left on the stack keep 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time because each index is pushed once and popped at most once, O(n) space for a falling sequence.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0] * n</code> for defaults, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">enumerate</code> for index and value, strict <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> because equal is not warmer; for the subset variant a dict with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get(x, -1)</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it O(n) when there is a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">while</code> inside the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">for</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each index enters the stack once and leaves at most once, so the total number of pops over the whole run is at most n. Example 2 shows 5,997 comparisons for 3,000 days.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if equal temperatures should count as warmer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Change the pop condition to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code>. Then each equal day immediately answers the one before it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a circular array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">range(2 * n)</code>, read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i % n]</code>, and append <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> only when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &lt; n</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the warmer temperature instead of the wait?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">answer[j] = t</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i - j</code>, with -1 as the default. The stack logic does not change.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a version without the stack?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: scan from the right and, for each day, jump forward using the answers already computed (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j += answer[j]</code>) until a warmer day or a 0 is found. It reuses the answer array instead of a stack; the stack version is the one most interviewers expect.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Next greater element** | The first element to the right that is strictly larger |
| **Monotonic decreasing stack** | A stack whose values never increase from bottom to top |
| **Amortised analysis** | Counting total work over the whole run: n pushes and at most n pops make O(n) |

---
**Conclusion:** Daily Temperatures is the next greater element problem with distances. Scan once and keep a stack of indices of days still waiting for a warmer day; each new day pops every colder day on top and gives it \`i - j\`, then waits itself. Because each index is pushed once and popped at most once, the pass is O(n), and the runs above show 5,997 comparisons where brute force needed 4,498,500. In Python it is a list of indices, \`[0] * n\` for the default, and strict \`<\` for strictly warmer; the circular and hash-map variants reuse the same loop.`,
        examples: [
          {
            label: "Daily Temperatures on the sample and edge cases",
            code: `def daily_temperatures(temps):
    """answer[i] = days to wait after day i for a strictly warmer day (0 if never)."""
    answer = [0] * len(temps)
    stack = []                      # indices of days still waiting; temps decrease upward
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:   # today is warmer than the waiting day
            j = stack.pop()
            answer[j] = i - j
        stack.append(i)
    return answer                   # days left on the stack keep their 0


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


print(fmt(daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73])))  # [1, 1, 4, 2, 1, 1, 0, 0]
print(fmt(daily_temperatures([30, 40, 50, 60])))  # [1, 1, 1, 0]
print(fmt(daily_temperatures([90, 80, 70])))  # [0, 0, 0]
print(fmt(daily_temperatures([70, 70, 70, 71])))  # [3, 2, 1, 0]
print(fmt(daily_temperatures([50])))  # [0]
print(fmt(daily_temperatures([])))  # []
`,
          },
          {
            label: "Brute force vs monotonic stack: counting comparisons",
            code: `# Brute force vs monotonic stack: same answers, very different work.

def brute(temps):
    n, steps = len(temps), 0
    answer = [0] * n
    for i in range(n):
        for j in range(i + 1, n):
            steps += 1                         # one comparison
            if temps[j] > temps[i]:
                answer[i] = j - i
                break
    return answer, steps


def with_stack(temps):
    n, steps = len(temps), 0
    answer, stack = [0] * n, []
    for i in range(n):
        while stack:
            steps += 1                         # one comparison
            if temps[stack[-1]] >= temps[i]:
                break
            j = stack.pop()
            answer[j] = i - j
        stack.append(i)
    return answer, steps


for name, temps in [
    ("sample", [73, 74, 75, 71, 69, 72, 76, 73]),
    ("falling 3000", [100 - (i % 70) for i in range(3000)]),
    ("cold then hot 3000", [30] * 2999 + [99]),
]:
    a, s1 = brute(temps)
    b, s2 = with_stack(temps)
    print(name + ": brute comparisons=" + str(s1) + ", stack comparisons=" + str(s2)
          + ", same answer=" + str(a == b).lower())
`,
          },
          {
            label: "Circular next greater (LeetCode 503) and the hash-map subset (LeetCode 496)",
            code: `# Two classic variants of "next greater element".

def next_greater_circular(nums):
    """LeetCode 503: the array wraps around. Walk it twice using i % n."""
    n = len(nums)
    result = [-1] * n
    stack = []                                   # indices waiting for a greater value
    for i in range(2 * n):
        x = nums[i % n]
        while stack and nums[stack[-1]] < x:
            result[stack.pop()] = x
        if i < n:                                # only first-pass indices need answers
            stack.append(i)
    return result


def next_greater_subset(nums1, nums2):
    """LeetCode 496: answers for nums1 (a subset of nums2, all distinct)."""
    greater = {}                                 # value -> its next greater value in nums2
    stack = []
    for x in nums2:
        while stack and stack[-1] < x:
            greater[stack.pop()] = x
        stack.append(x)
    return [greater.get(x, -1) for x in nums1]


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


print(fmt(next_greater_circular([1, 2, 1])))  # [2, -1, 2]
print(fmt(next_greater_circular([1, 2, 3, 4, 3])))  # [2, 3, 4, -1, 4]
print(fmt(next_greater_circular([5, 5, 5])))  # [-1, -1, -1]
print(fmt(next_greater_subset([4, 1, 2], [1, 3, 4, 2])))  # [-1, 3, -1]
print(fmt(next_greater_subset([2, 4], [1, 2, 3, 4])))  # [3, -1]
`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an array of daily temperatures, return an array where answer[i] is the number of days after day i until a strictly warmer temperature, or 0 if there is none. Write it in JavaScript in better than O(n squared)."

**What a strong answer should cover:**
- The O(n²) brute force, then a monotonic decreasing stack of indices that answers each day when a warmer day pops it.
- O(n) because each index is pushed once and popped at most once.
- Strict \`<\` for strictly warmer and 0 as the default.
- The circular and hash-map subset variants.
- JavaScript specifics: \`new Array(n).fill(0)\` (or an \`Int32Array\`, which starts zero-filled); arrays as stacks with \`push\`/\`pop\`; \`===\` on arrays compares references, so compare results element by element; \`Map\` for the subset variant.

**Clarifying questions expected:**
- "Does an equal temperature count as warmer?"
- "What value should days with no warmer day get?"

**Code / implementation expected:** Yes — a JavaScript function using an array of indices as a monotonic stack.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a stack is.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this JavaScript version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

You keep a diary of the temperature every day. For each day, you want to write next to it: *"how many days until it got warmer than this?"* The slow way is to take each day and read forward until you find a warmer one. On a long cold spell that means reading almost the whole diary again for every single day.

A smarter diary-keeper reads the diary **once**. She keeps a short list of days that are "still waiting for a warmer day". When a new day arrives, every waiting day that is colder than it gets its answer right now (today minus that day) and is crossed off. Then the new day joins the waiting list. The waiting list is always ordered from warmest at the bottom to coldest at the top, because any colder day sitting above a warmer newcomer would have been crossed off already. That ordered waiting list is a [monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it).

This is the most common way the monotonic stack shows up in interviews, under several names: Daily Temperatures (LeetCode 739), Next Greater Element I and II (496 and 503), and stock span. Getting it right shows you can turn an obvious O(n²) scan into O(n) and explain why the nested loop is still linear.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Warmer means strictly greater, or greater or equal? | Decides \`<\` versus \`<=\` in the pop condition; equal days are the classic hidden test. |
| What goes in the answer when no warmer day exists? | Daily Temperatures uses 0 (a distance); Next Greater Element uses -1 (a value). |
| Do you want the number of days (a distance) or the warmer temperature (a value)? | Distance needs indices on the stack; value only needs the value. |
| How big can the input be? | Up to about 10^5 makes the O(n²) brute force too slow, so the stack is required. |
| Is the array circular? | Then loop twice with \`i % n\` (Next Greater Element II). |

## 3. The Core Idea

**Brute force.** For each day \`i\`, scan \`j = i + 1, i + 2, ...\` until \`temps[j] > temps[i]\`. In the worst case (a long run with no warmer day) each scan reads to the end: about n²/2 comparisons, O(n²) time.

**The monotonic stack.** Scan once, left to right, and keep a stack of *indices of days still waiting for a warmer day*. Their temperatures are **decreasing** from bottom to top (equal temperatures can sit next to each other, since equal is not warmer).

For each day \`i\` with temperature \`t\`:

1. While the stack is not empty **and** the day on top is colder than \`t\`: pop it as \`j\`, and set \`answer[j] = i - j\`.
2. Push \`i\`.

Days still on the stack at the end never saw a warmer day; their answer stays 0.

📌 **Interview term: Next greater element** — for each position, the first element to its right that is strictly larger. Daily Temperatures asks for the *distance* to it; Next Greater Element asks for its *value*.

📌 **Interview term: Monotonic decreasing stack** — a stack whose values never increase from bottom to top, maintained by popping smaller values before each push.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 280" role="img" aria-label="Day 5 with temperature 72 arrives. The stack holds days 2, 3 and 4 with temperatures 75, 71 and 69. Days 4 and 3 are colder, so they are popped with answers 1 and 2. Day 2 at 75 is warmer, so popping stops and day 5 is pushed">
  <defs>
    <marker id="b11q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="130" y="40" text-anchor="middle">stack before day 5</text>
  <rect class="d-box" x="60" y="116" width="140" height="34" rx="6"/>
  <text class="d-text" x="130" y="138" text-anchor="middle">day 4: 69</text>
  <rect class="d-box" x="60" y="158" width="140" height="34" rx="6"/>
  <text class="d-text" x="130" y="180" text-anchor="middle">day 3: 71</text>
  <rect class="d-box" x="60" y="200" width="140" height="34" rx="6"/>
  <text class="d-text" x="130" y="222" text-anchor="middle">day 2: 75</text>
  <path class="d-edge" d="M 50 244 L 210 244"/>

  <path class="d-edge" d="M 214 133 L 270 133" marker-end="url(#b11q5-arrow)"/>

  <text class="d-text" x="350" y="40" text-anchor="middle">day 5 arrives</text>
  <rect class="d-box-accent" x="280" y="116" width="140" height="34" rx="6"/>
  <text class="d-text d-accent" x="350" y="138" text-anchor="middle">day 5: 72</text>
  <text class="d-sub" x="350" y="182" text-anchor="middle">69 colder: answer[4] = 1</text>
  <text class="d-sub" x="350" y="204" text-anchor="middle">71 colder: answer[3] = 2</text>
  <text class="d-sub" x="350" y="226" text-anchor="middle">75 warmer: stop</text>

  <path class="d-edge" d="M 430 133 L 486 133" marker-end="url(#b11q5-arrow)"/>

  <text class="d-text" x="570" y="40" text-anchor="middle">stack after</text>
  <rect class="d-box-accent" x="500" y="158" width="140" height="34" rx="6"/>
  <text class="d-text" x="570" y="180" text-anchor="middle">day 5: 72</text>
  <rect class="d-box" x="500" y="200" width="140" height="34" rx="6"/>
  <text class="d-text" x="570" y="222" text-anchor="middle">day 2: 75</text>
  <path class="d-edge" d="M 490 244 L 650 244"/>
</svg>

This is the step for day 5 (72 degrees) in the sample \`[73, 74, 75, 71, 69, 72, 76, 73]\`: the two colder days on top (69 and 71) get their answers, and the warmer day 75 stays, because it is still waiting for something warmer than 75.

### Dry run on \`[73, 74, 75, 71, 69, 72, 76, 73]\`

| Day i | Temp | Pops (answer given) | Stack after (day: temp) |
| :--- | :--- | :--- | :--- |
| 0 | 73 | none | 0:73 |
| 1 | 74 | day 0, answer[0] = 1 | 1:74 |
| 2 | 75 | day 1, answer[1] = 1 | 2:75 |
| 3 | 71 | none | 2:75, 3:71 |
| 4 | 69 | none | 2:75, 3:71, 4:69 |
| 5 | 72 | day 4, answer[4] = 1; day 3, answer[3] = 2 | 2:75, 5:72 |
| 6 | 76 | day 5, answer[5] = 1; day 2, answer[2] = 4 | 6:76 |
| 7 | 73 | none | 6:76, 7:73 |
| end | | days 6 and 7 keep 0 | |

Answer: \`[1, 1, 4, 2, 1, 1, 0, 0]\`, which is what Example 1 prints.

📌 **Interview term: Amortised analysis** — the \`while\` loop can pop many items in one step, but every index is pushed once and popped at most once, so the total work over the whole scan is O(n). See [amortized analysis](/interview-question/what-is-amortized-analysis).

## 4. The Two Classic Variants

**Next Greater Element II (circular).** The array wraps around, so the last elements may find their answer at the start. Walk the indices \`0 .. 2n - 1\`, read \`nums[i % n]\`, and push indices only during the first pass (\`i < n\`). The second pass only answers elements that are still waiting.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 180" role="img" aria-label="Circular next greater for 1, 2, 1. The array is walked twice. The last 1 finds its answer 2 during the second pass">
  <defs>
    <marker id="b11q5-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="165" y="40" text-anchor="middle">first pass: i below n, push i</text>
  <text class="d-sub" x="485" y="40" text-anchor="middle">second pass: read i mod n only</text>
  <rect class="d-box" x="40" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="75" y="107" text-anchor="middle">1</text>
  <rect class="d-box" x="130" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="165" y="107" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="220" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="255" y="107" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="360" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="395" y="107" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="450" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="485" y="107" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="540" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="575" y="107" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 255 76 Q 370 50 478 74" marker-end="url(#b11q5-arrow2)"/>
  <text class="d-sub" x="75" y="150" text-anchor="middle">i = 0</text>
  <text class="d-sub" x="165" y="150" text-anchor="middle">i = 1</text>
  <text class="d-sub" x="255" y="150" text-anchor="middle">i = 2</text>
  <text class="d-sub" x="395" y="150" text-anchor="middle">i = 3</text>
  <text class="d-sub" x="485" y="150" text-anchor="middle">i = 4</text>
  <text class="d-sub" x="575" y="150" text-anchor="middle">i = 5</text>
</svg>

For \`[1, 2, 1]\` the last 1 (index 2) is still waiting at the end of the first pass; at \`i = 4\` the second pass reads \`nums[1] = 2\`, which answers it. The 2 itself never finds anything bigger, so it gets -1, giving \`[2, -1, 2]\`.

**Next Greater Element I (subset with a hash map).** You are given \`nums1\`, a subset of \`nums2\` with distinct values, and need each \`nums1\` value's next greater element *in \`nums2\`*. Run the stack over \`nums2\` once, record \`value -> next greater value\` in a hash map, and then answer each \`nums1\` value with a lookup (default -1). For \`nums1 = [4, 1, 2]\`, \`nums2 = [1, 3, 4, 2]\` the answer is \`[-1, 3, -1]\`. Example 3 runs both variants.

## 5. The JavaScript Solution

~~~javascript
// answer[i] = days to wait after day i for a strictly warmer day (0 if never).
function dailyTemperatures(temps) {
  const answer = new Array(temps.length).fill(0);
  const stack = [];                 // indices of days still waiting; temps decrease upward
  for (let i = 0; i < temps.length; i++) {
    while (stack.length && temps[stack[stack.length - 1]] < temps[i]) {
      const j = stack.pop();        // today is warmer than the waiting day
      answer[j] = i - j;
    }
    stack.push(i);
  }
  return answer;                    // days left on the stack keep their 0
}
~~~

JavaScript details:

- **\`new Array(temps.length).fill(0)\`** pre-fills the default. Without \`fill\`, the slots are empty, not 0.
- **The stack holds indices.** \`temps[stack[stack.length - 1]]\` is the waiting day's temperature; \`i - j\` is the wait.
- **\`stack.length &&\` first.** Without it the top is \`undefined\`, \`temps[undefined]\` is \`undefined\`, and \`undefined < 72\` is \`false\`, so the loop silently does nothing rather than crashing.
- **Strict \`<\`.** Equal temperatures must not pop each other.
- **Typed arrays.** An \`Int32Array(n)\` is zero-filled on creation and can serve as both the answer and (with a \`top\` counter) the stack, avoiding array growth for very large inputs.
- **Comparing results.** \`===\` on two arrays compares references, which is why Example 2 compares element by element:

~~~javascript
console.log([1, 2] === [1, 2]);
console.log(new Int32Array(3).join(', '));
console.log([1, 1, 0]);
~~~

~~~text
false
0, 0, 0
[ 1, 1, 0 ]
~~~

The last line also shows why the examples format arrays with \`join\`: Node prints arrays with spaces inside the brackets.

For Next Greater Element I, a \`Map\` from value to next greater value with \`greater.has(x) ? greater.get(x) : -1\` answers each query; a plain object works too for integer keys, but a \`Map\` keeps number keys as numbers.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`node main.js\` (Node.js 22). The same programs in the other three languages print exactly the same lines.

**Example 1 — Daily Temperatures on the sample and edge cases** printed:

~~~text
[1, 1, 4, 2, 1, 1, 0, 0]
[1, 1, 1, 0]
[0, 0, 0]
[3, 2, 1, 0]
[0]
[]
~~~

**Example 2 — Brute force vs monotonic stack: counting comparisons** printed:

~~~text
sample: brute comparisons=11, stack comparisons=10, same answer=true
falling 3000: brute comparisons=168888, stack comparisons=5897, same answer=true
cold then hot 3000: brute comparisons=4498500, stack comparisons=5997, same answer=true
~~~

**Example 3 — Circular next greater (LeetCode 503) and the hash-map subset (LeetCode 496)** printed:

~~~text
[2, -1, 2]
[2, 3, 4, -1, 4]
[-1, -1, -1]
[-1, 3, -1]
[3, -1]
~~~

In Example 2 the "falling 3000" input repeats a slow fall from 100 to 31, and "cold then hot 3000" is 2,999 days at 30 followed by one day at 99. Equal days are not warmer, so in the second input the brute force scans to the end for every day (2,999 + 2,998 + ... = 4,498,500 comparisons) while the stack does fewer than two comparisons per day.

## 7. Complexity

| | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) extra | Each day may scan to the end |
| Monotonic stack | O(n) | O(n) | Each index pushed once and popped at most once; the stack can hold all n indices for a falling sequence |
| Circular version | O(n) | O(n) | Two passes of n, still at most n pushes |
| Subset version with hash map | O(n + m) | O(n) | One pass over \`nums2\`, then one lookup per \`nums1\` value |

Example 2 measured it: on 3,000 days of the same cold temperature followed by one hot day, the brute force made 4,498,500 comparisons and the stack 5,997, with identical answers.

## 8. Edge Cases

- **Equal temperatures** (\`[70, 70, 70, 71]\`) — equal is not warmer, so the pop uses strict \`<\`; all three 70s wait for the 71 and get \`[3, 2, 1, 0]\`.
- **Strictly falling** (\`[90, 80, 70]\`) — nobody is ever popped; everything stays 0, and the stack grows to n.
- **Strictly rising** (\`[30, 40, 50, 60]\`) — every day is answered by the next one: \`[1, 1, 1, 0]\`.
- **One day** (\`[50]\`) — \`[0]\`.
- **Empty input** — return an empty array; the loop never runs.
- **The last day** — always 0, because there is nothing after it.

## Common Pitfalls

- **Pushing temperatures instead of indices.** You cannot compute the wait.
- **\`<=\` instead of \`<\`.** Equal days would answer each other; \`[70, 70, 70, 71]\` must give \`[3, 2, 1, 0]\`.
- **\`new Array(n)\` without \`fill(0)\`.** Empty slots, not zeros; days never popped would print as empty.
- **Comparing arrays with \`===\`.** Always \`false\` for two different arrays, even with the same contents.
- **Nested loops with \`break\`.** Still O(n²) in the worst case; Example 2 counts 4,498,500 comparisons for 3,000 days.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Brute force:</strong> <span style="color:#f0e2c8;">For each day scan forward to the first warmer day: O(n²) for a long cold spell.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The idea:</strong> <span style="color:#f0e2c8;">Scan once with a stack of indices of days still waiting; their temperatures decrease from bottom to top.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The step:</strong> <span style="color:#f0e2c8;">While the stack is non-empty and the top day is colder than today, pop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">answer[j] = i - j</code>; then push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>. Days left keep 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time since each index is pushed once and popped at most once; O(n) space for a falling sequence.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Array(n).fill(0)</code> for defaults, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code> on an array of indices, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stack.length</code> guard because a missing one fails silently, and strict <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it linear with a nested loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every index is pushed once and popped at most once, so the inner loop runs at most n times in total. Example 2 shows 5,997 comparisons for 3,000 days versus 4,498,500 for brute force.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes if equal temperatures count?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> in the pop condition.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you do the circular version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Loop to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 * n</code>, read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i % n]</code>, push only when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &lt; n</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> in Next Greater Element I?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">To record each value's answer during the one pass over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums2</code>, then answer every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums1</code> query in O(1); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code> lets you return -1 for values never popped.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you avoid the stack?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, by scanning from the right and jumping forward with the answers already computed, but the stack version is the standard and easiest to explain.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Next greater element** | The first element to the right that is strictly larger |
| **Monotonic decreasing stack** | A stack whose values never increase from bottom to top |
| **Amortised analysis** | Counting total work over the whole run: n pushes and at most n pops make O(n) |

---
**Conclusion:** Daily Temperatures is the next greater element problem with distances. Scan once with an array of indices as a stack; each day pops every colder day on top and gives it \`i - j\`, then waits itself. Each index is pushed once and popped at most once, so the pass is O(n), and the runs above show 5,997 comparisons against 4,498,500 for brute force. In JavaScript remember \`fill(0)\` for the defaults, an explicit length guard, strict \`<\`, and that \`===\` on arrays compares references.`,
        examples: [
          {
            label: "Daily Temperatures on the sample and edge cases",
            code: `// answer[i] = days to wait after day i for a strictly warmer day (0 if never).
function dailyTemperatures(temps) {
  const answer = new Array(temps.length).fill(0);
  const stack = [];                 // indices of days still waiting; temps decrease upward
  for (let i = 0; i < temps.length; i++) {
    while (stack.length && temps[stack[stack.length - 1]] < temps[i]) {
      const j = stack.pop();        // today is warmer than the waiting day
      answer[j] = i - j;
    }
    stack.push(i);
  }
  return answer;                    // days left on the stack keep their 0
}

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

console.log(fmt(dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73]))); // [1, 1, 4, 2, 1, 1, 0, 0]
console.log(fmt(dailyTemperatures([30, 40, 50, 60]))); // [1, 1, 1, 0]
console.log(fmt(dailyTemperatures([90, 80, 70]))); // [0, 0, 0]
console.log(fmt(dailyTemperatures([70, 70, 70, 71]))); // [3, 2, 1, 0]
console.log(fmt(dailyTemperatures([50]))); // [0]
console.log(fmt(dailyTemperatures([]))); // []
`,
          },
          {
            label: "Brute force vs monotonic stack: counting comparisons",
            code: `// Brute force vs monotonic stack: same answers, very different work.

function brute(temps) {
  const n = temps.length, answer = new Array(n).fill(0);
  let steps = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      steps++;                                   // one comparison
      if (temps[j] > temps[i]) { answer[i] = j - i; break; }
    }
  }
  return [answer, steps];
}

function withStack(temps) {
  const n = temps.length, answer = new Array(n).fill(0), stack = [];
  let steps = 0;
  for (let i = 0; i < n; i++) {
    while (stack.length) {
      steps++;                                   // one comparison
      if (temps[stack[stack.length - 1]] >= temps[i]) break;
      const j = stack.pop();
      answer[j] = i - j;
    }
    stack.push(i);
  }
  return [answer, steps];
}

function sameArray(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);  // == on arrays compares references
}

const falling = [], coldThenHot = [];
for (let i = 0; i < 3000; i++) falling.push(100 - (i % 70));
for (let i = 0; i < 2999; i++) coldThenHot.push(30);
coldThenHot.push(99);

for (const [name, temps] of [['sample', [73, 74, 75, 71, 69, 72, 76, 73]],
                             ['falling 3000', falling], ['cold then hot 3000', coldThenHot]]) {
  const [a, s1] = brute(temps);
  const [b, s2] = withStack(temps);
  console.log(name + ': brute comparisons=' + s1 + ', stack comparisons=' + s2 +
    ', same answer=' + sameArray(a, b));
}
`,
          },
          {
            label: "Circular next greater (LeetCode 503) and the hash-map subset (LeetCode 496)",
            code: `// Two classic variants of "next greater element".

// LeetCode 503: the array wraps around. Walk it twice using i % n.
function nextGreaterCircular(nums) {
  const n = nums.length;
  const result = new Array(n).fill(-1);
  const stack = [];                              // indices waiting for a greater value
  for (let i = 0; i < 2 * n; i++) {
    const x = nums[i % n];
    while (stack.length && nums[stack[stack.length - 1]] < x) result[stack.pop()] = x;
    if (i < n) stack.push(i);                    // only first-pass indices need answers
  }
  return result;
}

// LeetCode 496: answers for nums1 (a subset of nums2, all distinct).
function nextGreaterSubset(nums1, nums2) {
  const greater = new Map();                     // value -> its next greater value in nums2
  const stack = [];
  for (const x of nums2) {
    while (stack.length && stack[stack.length - 1] < x) greater.set(stack.pop(), x);
    stack.push(x);
  }
  return nums1.map((x) => (greater.has(x) ? greater.get(x) : -1));
}

function fmt(xs) {
  return '[' + xs.join(', ') + ']';
}

console.log(fmt(nextGreaterCircular([1, 2, 1]))); // [2, -1, 2]
console.log(fmt(nextGreaterCircular([1, 2, 3, 4, 3]))); // [2, 3, 4, -1, 4]
console.log(fmt(nextGreaterCircular([5, 5, 5]))); // [-1, -1, -1]
console.log(fmt(nextGreaterSubset([4, 1, 2], [1, 3, 4, 2]))); // [-1, 3, -1]
console.log(fmt(nextGreaterSubset([2, 4], [1, 2, 3, 4]))); // [3, -1]
`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an int array of daily temperatures, return an int array where answer[i] is how many days after day i you wait for a strictly warmer temperature, or 0 if never. Write it in Java, better than O(n squared), and tell me what you use as the stack."

**What a strong answer should cover:**
- The O(n²) brute force, then a monotonic decreasing stack of indices answering each day when a warmer day pops it.
- O(n) by the push-once, pop-once argument.
- Strict \`<\` for strictly warmer; days never popped stay 0.
- The circular and hash-map subset variants.
- Java specifics: \`new int[n]\` is zero-filled by default; an \`int[]\` stack with a \`top\` counter avoids boxing (or \`ArrayDeque<Integer>\`, never \`Stack\`); \`Arrays.equals\` compares contents while \`a.equals(b)\` compares references; \`HashMap.getOrDefault\` for the subset variant.

**Clarifying questions expected:**
- "Does an equal temperature count as warmer?"
- "What is the maximum input size?"

**Code / implementation expected:** Yes — a Java method with an \`int[]\` used as the stack.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a stack is.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this Java version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

You keep a diary of the temperature every day. For each day, you want to write next to it: *"how many days until it got warmer than this?"* The slow way is to take each day and read forward until you find a warmer one. On a long cold spell that means reading almost the whole diary again for every single day.

A smarter diary-keeper reads the diary **once**. She keeps a short list of days that are "still waiting for a warmer day". When a new day arrives, every waiting day that is colder than it gets its answer right now (today minus that day) and is crossed off. Then the new day joins the waiting list. The waiting list is always ordered from warmest at the bottom to coldest at the top, because any colder day sitting above a warmer newcomer would have been crossed off already. That ordered waiting list is a [monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it).

This is the most common way the monotonic stack shows up in interviews, under several names: Daily Temperatures (LeetCode 739), Next Greater Element I and II (496 and 503), and stock span. Getting it right shows you can turn an obvious O(n²) scan into O(n) and explain why the nested loop is still linear.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Warmer means strictly greater, or greater or equal? | Decides \`<\` versus \`<=\` in the pop condition; equal days are the classic hidden test. |
| What goes in the answer when no warmer day exists? | Daily Temperatures uses 0 (a distance); Next Greater Element uses -1 (a value). |
| Do you want the number of days (a distance) or the warmer temperature (a value)? | Distance needs indices on the stack; value only needs the value. |
| How big can the input be? | Up to about 10^5 makes the O(n²) brute force too slow, so the stack is required. |
| Is the array circular? | Then loop twice with \`i % n\` (Next Greater Element II). |

## 3. The Core Idea

**Brute force.** For each day \`i\`, scan \`j = i + 1, i + 2, ...\` until \`temps[j] > temps[i]\`. In the worst case (a long run with no warmer day) each scan reads to the end: about n²/2 comparisons, O(n²) time.

**The monotonic stack.** Scan once, left to right, and keep a stack of *indices of days still waiting for a warmer day*. Their temperatures are **decreasing** from bottom to top (equal temperatures can sit next to each other, since equal is not warmer).

For each day \`i\` with temperature \`t\`:

1. While the stack is not empty **and** the day on top is colder than \`t\`: pop it as \`j\`, and set \`answer[j] = i - j\`.
2. Push \`i\`.

Days still on the stack at the end never saw a warmer day; their answer stays 0.

📌 **Interview term: Next greater element** — for each position, the first element to its right that is strictly larger. Daily Temperatures asks for the *distance* to it; Next Greater Element asks for its *value*.

📌 **Interview term: Monotonic decreasing stack** — a stack whose values never increase from bottom to top, maintained by popping smaller values before each push.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 280" role="img" aria-label="Day 5 with temperature 72 arrives. The stack holds days 2, 3 and 4 with temperatures 75, 71 and 69. Days 4 and 3 are colder, so they are popped with answers 1 and 2. Day 2 at 75 is warmer, so popping stops and day 5 is pushed">
  <defs>
    <marker id="b11q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="130" y="40" text-anchor="middle">stack before day 5</text>
  <rect class="d-box" x="60" y="116" width="140" height="34" rx="6"/>
  <text class="d-text" x="130" y="138" text-anchor="middle">day 4: 69</text>
  <rect class="d-box" x="60" y="158" width="140" height="34" rx="6"/>
  <text class="d-text" x="130" y="180" text-anchor="middle">day 3: 71</text>
  <rect class="d-box" x="60" y="200" width="140" height="34" rx="6"/>
  <text class="d-text" x="130" y="222" text-anchor="middle">day 2: 75</text>
  <path class="d-edge" d="M 50 244 L 210 244"/>

  <path class="d-edge" d="M 214 133 L 270 133" marker-end="url(#b11q5-arrow)"/>

  <text class="d-text" x="350" y="40" text-anchor="middle">day 5 arrives</text>
  <rect class="d-box-accent" x="280" y="116" width="140" height="34" rx="6"/>
  <text class="d-text d-accent" x="350" y="138" text-anchor="middle">day 5: 72</text>
  <text class="d-sub" x="350" y="182" text-anchor="middle">69 colder: answer[4] = 1</text>
  <text class="d-sub" x="350" y="204" text-anchor="middle">71 colder: answer[3] = 2</text>
  <text class="d-sub" x="350" y="226" text-anchor="middle">75 warmer: stop</text>

  <path class="d-edge" d="M 430 133 L 486 133" marker-end="url(#b11q5-arrow)"/>

  <text class="d-text" x="570" y="40" text-anchor="middle">stack after</text>
  <rect class="d-box-accent" x="500" y="158" width="140" height="34" rx="6"/>
  <text class="d-text" x="570" y="180" text-anchor="middle">day 5: 72</text>
  <rect class="d-box" x="500" y="200" width="140" height="34" rx="6"/>
  <text class="d-text" x="570" y="222" text-anchor="middle">day 2: 75</text>
  <path class="d-edge" d="M 490 244 L 650 244"/>
</svg>

This is the step for day 5 (72 degrees) in the sample \`[73, 74, 75, 71, 69, 72, 76, 73]\`: the two colder days on top (69 and 71) get their answers, and the warmer day 75 stays, because it is still waiting for something warmer than 75.

### Dry run on \`[73, 74, 75, 71, 69, 72, 76, 73]\`

| Day i | Temp | Pops (answer given) | Stack after (day: temp) |
| :--- | :--- | :--- | :--- |
| 0 | 73 | none | 0:73 |
| 1 | 74 | day 0, answer[0] = 1 | 1:74 |
| 2 | 75 | day 1, answer[1] = 1 | 2:75 |
| 3 | 71 | none | 2:75, 3:71 |
| 4 | 69 | none | 2:75, 3:71, 4:69 |
| 5 | 72 | day 4, answer[4] = 1; day 3, answer[3] = 2 | 2:75, 5:72 |
| 6 | 76 | day 5, answer[5] = 1; day 2, answer[2] = 4 | 6:76 |
| 7 | 73 | none | 6:76, 7:73 |
| end | | days 6 and 7 keep 0 | |

Answer: \`[1, 1, 4, 2, 1, 1, 0, 0]\`, which is what Example 1 prints.

📌 **Interview term: Amortised analysis** — the \`while\` loop can pop many items in one step, but every index is pushed once and popped at most once, so the total work over the whole scan is O(n). See [amortized analysis](/interview-question/what-is-amortized-analysis).

## 4. The Two Classic Variants

**Next Greater Element II (circular).** The array wraps around, so the last elements may find their answer at the start. Walk the indices \`0 .. 2n - 1\`, read \`nums[i % n]\`, and push indices only during the first pass (\`i < n\`). The second pass only answers elements that are still waiting.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 180" role="img" aria-label="Circular next greater for 1, 2, 1. The array is walked twice. The last 1 finds its answer 2 during the second pass">
  <defs>
    <marker id="b11q5-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="165" y="40" text-anchor="middle">first pass: i below n, push i</text>
  <text class="d-sub" x="485" y="40" text-anchor="middle">second pass: read i mod n only</text>
  <rect class="d-box" x="40" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="75" y="107" text-anchor="middle">1</text>
  <rect class="d-box" x="130" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="165" y="107" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="220" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="255" y="107" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="360" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="395" y="107" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="450" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="485" y="107" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="540" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="575" y="107" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 255 76 Q 370 50 478 74" marker-end="url(#b11q5-arrow2)"/>
  <text class="d-sub" x="75" y="150" text-anchor="middle">i = 0</text>
  <text class="d-sub" x="165" y="150" text-anchor="middle">i = 1</text>
  <text class="d-sub" x="255" y="150" text-anchor="middle">i = 2</text>
  <text class="d-sub" x="395" y="150" text-anchor="middle">i = 3</text>
  <text class="d-sub" x="485" y="150" text-anchor="middle">i = 4</text>
  <text class="d-sub" x="575" y="150" text-anchor="middle">i = 5</text>
</svg>

For \`[1, 2, 1]\` the last 1 (index 2) is still waiting at the end of the first pass; at \`i = 4\` the second pass reads \`nums[1] = 2\`, which answers it. The 2 itself never finds anything bigger, so it gets -1, giving \`[2, -1, 2]\`.

**Next Greater Element I (subset with a hash map).** You are given \`nums1\`, a subset of \`nums2\` with distinct values, and need each \`nums1\` value's next greater element *in \`nums2\`*. Run the stack over \`nums2\` once, record \`value -> next greater value\` in a hash map, and then answer each \`nums1\` value with a lookup (default -1). For \`nums1 = [4, 1, 2]\`, \`nums2 = [1, 3, 4, 2]\` the answer is \`[-1, 3, -1]\`. Example 3 runs both variants.

## 5. The Java Solution

~~~java
// answer[i] = days to wait after day i for a strictly warmer day (0 if never).
static int[] dailyTemperatures(int[] temps) {
    int n = temps.length;
    int[] answer = new int[n];        // Java zero-fills new int arrays
    int[] stack = new int[n];         // indices of waiting days; no Integer boxing
    int top = 0;
    for (int i = 0; i < n; i++) {
        while (top > 0 && temps[stack[top - 1]] < temps[i]) {
            int j = stack[--top];     // today is warmer than the waiting day
            answer[j] = i - j;
        }
        stack[top++] = i;
    }
    return answer;                    // days left on the stack keep their 0
}
~~~

Java details:

- **\`new int[n]\` is already all zeros.** Java gives every element of a new \`int\` array the default value 0, so days that never get popped need no extra work.
- **An \`int[]\` as the stack.** The stack never holds more than n indices, so \`int[] stack = new int[n]\` and an \`int top\` are enough: \`stack[top++] = i\` pushes, \`stack[top - 1]\` peeks, \`stack[--top]\` pops. No \`Integer\` objects are created, unlike \`ArrayDeque<Integer>\`.
- **\`ArrayDeque<Integer>\` is the readable alternative.** If you use it, write \`temps[stack.peek()] < temps[i]\` (indices are unboxed to index the array). Avoid \`java.util.Stack\`; its [documentation](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Stack.html) recommends \`Deque\`.
- **Strict \`<\`.** Equal temperatures must not pop each other.
- **Comparing arrays.** Example 2 uses \`Arrays.equals\`, because \`equals\` on an array is inherited from \`Object\` and compares references:

~~~java
import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int[] answer = new int[4];
        System.out.println(Arrays.toString(answer));
        int[] a = {1, 2}, b = {1, 2};
        System.out.println("a.equals(b) = " + a.equals(b));
        System.out.println("Arrays.equals(a, b) = " + Arrays.equals(a, b));
    }
}
~~~

~~~text
[0, 0, 0, 0]
a.equals(b) = false
Arrays.equals(a, b) = true
~~~

For Next Greater Element I, a \`HashMap<Integer, Integer>\` records each value's next greater value and \`greater.getOrDefault(x, -1)\` answers each query.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`javac Main.java && java Main\` (OpenJDK 21 (javac 21)). The same programs in the other three languages print exactly the same lines.

**Example 1 — Daily Temperatures on the sample and edge cases** printed:

~~~text
[1, 1, 4, 2, 1, 1, 0, 0]
[1, 1, 1, 0]
[0, 0, 0]
[3, 2, 1, 0]
[0]
[]
~~~

**Example 2 — Brute force vs monotonic stack: counting comparisons** printed:

~~~text
sample: brute comparisons=11, stack comparisons=10, same answer=true
falling 3000: brute comparisons=168888, stack comparisons=5897, same answer=true
cold then hot 3000: brute comparisons=4498500, stack comparisons=5997, same answer=true
~~~

**Example 3 — Circular next greater (LeetCode 503) and the hash-map subset (LeetCode 496)** printed:

~~~text
[2, -1, 2]
[2, 3, 4, -1, 4]
[-1, -1, -1]
[-1, 3, -1]
[3, -1]
~~~

In Example 2 the "falling 3000" input repeats a slow fall from 100 to 31, and "cold then hot 3000" is 2,999 days at 30 followed by one day at 99. Equal days are not warmer, so in the second input the brute force scans to the end for every day (2,999 + 2,998 + ... = 4,498,500 comparisons) while the stack does fewer than two comparisons per day.

## 7. Complexity

| | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) extra | Each day may scan to the end |
| Monotonic stack | O(n) | O(n) | Each index pushed once and popped at most once; the stack can hold all n indices for a falling sequence |
| Circular version | O(n) | O(n) | Two passes of n, still at most n pushes |
| Subset version with hash map | O(n + m) | O(n) | One pass over \`nums2\`, then one lookup per \`nums1\` value |

Example 2 measured it: on 3,000 days of the same cold temperature followed by one hot day, the brute force made 4,498,500 comparisons and the stack 5,997, with identical answers.

## 8. Edge Cases

- **Equal temperatures** (\`[70, 70, 70, 71]\`) — equal is not warmer, so the pop uses strict \`<\`; all three 70s wait for the 71 and get \`[3, 2, 1, 0]\`.
- **Strictly falling** (\`[90, 80, 70]\`) — nobody is ever popped; everything stays 0, and the stack grows to n.
- **Strictly rising** (\`[30, 40, 50, 60]\`) — every day is answered by the next one: \`[1, 1, 1, 0]\`.
- **One day** (\`[50]\`) — \`[0]\`.
- **Empty input** — return an empty array; the loop never runs.
- **The last day** — always 0, because there is nothing after it.

## Common Pitfalls

- **Pushing temperatures instead of indices.** You cannot compute \`i - j\`.
- **\`<=\` instead of \`<\`.** \`[70, 70, 70, 71]\` must give \`[3, 2, 1, 0]\`.
- **\`a.equals(b)\` on arrays.** Compares references; use \`Arrays.equals\`.
- **\`java.util.Stack\` or \`ArrayDeque<Integer>\` in a hot loop.** Both box every index; an \`int[]\` is simpler and faster here.
- **\`greater.get(x)\` unboxed into an \`int\`.** For a value with no answer it returns \`null\` and throws \`NullPointerException\`; use \`getOrDefault(x, -1)\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Brute force:</strong> <span style="color:#f0e2c8;">For each day scan forward to the first warmer day: O(n²) for a long cold spell.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The idea:</strong> <span style="color:#f0e2c8;">Scan once with a stack of indices of days still waiting; their temperatures decrease from bottom to top.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The step:</strong> <span style="color:#f0e2c8;">While the stack is non-empty and the top day is colder than today, pop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j</code> and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">answer[j] = i - j</code>; then push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new int[n]</code> is already zero for days never popped.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time since each index is pushed once and popped at most once; O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java details:</strong> <span style="color:#f0e2c8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> stack with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top</code> counter avoids boxing; strict <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> because equal is not warmer; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.equals</code> when comparing results, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getOrDefault(x, -1)</code> for the subset variant.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int[]</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ArrayDeque&lt;Integer&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The stack is bounded by n, so a plain array is enough and creates no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> objects. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> is fine when readability matters more.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every index is pushed once and popped at most once. Example 2 shows 5,997 comparisons for 3,000 days versus 4,498,500 for brute force.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if equal temperatures count as warmer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> in the pop condition.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle the circular version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> from 0 to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 * n - 1</code>, read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i % n]</code>, and push only while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &lt; n</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What goes wrong with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int v = greater.get(x)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> never found a greater value, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code>, and unboxing it throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NullPointerException</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getOrDefault(x, -1)</code> avoids that.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Next greater element** | The first element to the right that is strictly larger |
| **Monotonic decreasing stack** | A stack whose values never increase from bottom to top |
| **Amortised analysis** | Counting total work over the whole run: n pushes and at most n pops make O(n) |

---
**Conclusion:** Daily Temperatures is the next greater element problem with distances. Scan once with a stack of indices; each day pops every colder day on top and gives it \`i - j\`, then waits itself. Each index is pushed once and popped at most once, so the pass is O(n), and the runs above show 5,997 comparisons against 4,498,500 for brute force. In Java an \`int[]\` stack avoids boxing, \`new int[n]\` already holds the zeros, and \`Arrays.equals\` and \`getOrDefault\` avoid the reference and \`null\` traps.`,
        examples: [
          {
            label: "Daily Temperatures on the sample and edge cases",
            code: `import java.util.Arrays;

public class Main {
    // answer[i] = days to wait after day i for a strictly warmer day (0 if never).
    static int[] dailyTemperatures(int[] temps) {
        int n = temps.length;
        int[] answer = new int[n];        // Java zero-fills new int arrays
        int[] stack = new int[n];         // indices of waiting days; no Integer boxing
        int top = 0;
        for (int i = 0; i < n; i++) {
            while (top > 0 && temps[stack[top - 1]] < temps[i]) {
                int j = stack[--top];     // today is warmer than the waiting day
                answer[j] = i - j;
            }
            stack[top++] = i;
        }
        return answer;                    // days left on the stack keep their 0
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(dailyTemperatures(new int[] {73, 74, 75, 71, 69, 72, 76, 73}))); // [1, 1, 4, 2, 1, 1, 0, 0]
        System.out.println(Arrays.toString(dailyTemperatures(new int[] {30, 40, 50, 60})));   // [1, 1, 1, 0]
        System.out.println(Arrays.toString(dailyTemperatures(new int[] {90, 80, 70})));       // [0, 0, 0]
        System.out.println(Arrays.toString(dailyTemperatures(new int[] {70, 70, 70, 71})));   // [3, 2, 1, 0]
        System.out.println(Arrays.toString(dailyTemperatures(new int[] {50})));               // [0]
        System.out.println(Arrays.toString(dailyTemperatures(new int[] {})));                 // []
    }
}
`,
          },
          {
            label: "Brute force vs monotonic stack: counting comparisons",
            code: `import java.util.Arrays;

public class Main {
    // Brute force vs monotonic stack: same answers, very different work.
    static long steps;

    static int[] brute(int[] temps) {
        int n = temps.length;
        int[] answer = new int[n];
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                steps++;                                 // one comparison
                if (temps[j] > temps[i]) { answer[i] = j - i; break; }
            }
        }
        return answer;
    }

    static int[] withStack(int[] temps) {
        int n = temps.length, top = 0;
        int[] answer = new int[n], stack = new int[n];
        for (int i = 0; i < n; i++) {
            while (top > 0) {
                steps++;                                 // one comparison
                if (temps[stack[top - 1]] >= temps[i]) break;
                int j = stack[--top];
                answer[j] = i - j;
            }
            stack[top++] = i;
        }
        return answer;
    }

    public static void main(String[] args) {
        int[] falling = new int[3000], coldThenHot = new int[3000];
        for (int i = 0; i < 3000; i++) falling[i] = 100 - (i % 70);
        Arrays.fill(coldThenHot, 30);
        coldThenHot[2999] = 99;
        String[] names = {"sample", "falling 3000", "cold then hot 3000"};
        int[][] inputs = {{73, 74, 75, 71, 69, 72, 76, 73}, falling, coldThenHot};
        for (int k = 0; k < 3; k++) {
            steps = 0;
            int[] a = brute(inputs[k]);
            long s1 = steps;
            steps = 0;
            int[] b = withStack(inputs[k]);
            long s2 = steps;
            // Arrays.equals compares contents; a.equals(b) would compare references.
            System.out.println(names[k] + ": brute comparisons=" + s1 + ", stack comparisons=" + s2
                + ", same answer=" + Arrays.equals(a, b));
        }
    }
}
`,
          },
          {
            label: "Circular next greater (LeetCode 503) and the hash-map subset (LeetCode 496)",
            code: `import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class Main {
    // LeetCode 503: the array wraps around. Walk it twice using i % n.
    static int[] nextGreaterCircular(int[] nums) {
        int n = nums.length, top = 0;
        int[] result = new int[n], stack = new int[n];
        Arrays.fill(result, -1);
        for (int i = 0; i < 2 * n; i++) {
            int x = nums[i % n];
            while (top > 0 && nums[stack[top - 1]] < x) result[stack[--top]] = x;
            if (i < n) stack[top++] = i;             // only first-pass indices need answers
        }
        return result;
    }

    // LeetCode 496: answers for nums1 (a subset of nums2, all distinct).
    static int[] nextGreaterSubset(int[] nums1, int[] nums2) {
        Map<Integer, Integer> greater = new HashMap<>();   // value -> next greater in nums2
        int[] stack = new int[nums2.length];
        int top = 0;
        for (int x : nums2) {
            while (top > 0 && stack[top - 1] < x) greater.put(stack[--top], x);
            stack[top++] = x;
        }
        int[] out = new int[nums1.length];
        for (int i = 0; i < nums1.length; i++) out[i] = greater.getOrDefault(nums1[i], -1);
        return out;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(nextGreaterCircular(new int[] {1, 2, 1})));          // [2, -1, 2]
        System.out.println(Arrays.toString(nextGreaterCircular(new int[] {1, 2, 3, 4, 3})));    // [2, 3, 4, -1, 4]
        System.out.println(Arrays.toString(nextGreaterCircular(new int[] {5, 5, 5})));          // [-1, -1, -1]
        System.out.println(Arrays.toString(nextGreaterSubset(new int[] {4, 1, 2}, new int[] {1, 3, 4, 2}))); // [-1, 3, -1]
        System.out.println(Arrays.toString(nextGreaterSubset(new int[] {2, 4}, new int[] {1, 2, 3, 4})));    // [3, -1]
    }
}
`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given a vector of daily temperatures, return a vector where answer[i] is the number of days after day i until a strictly warmer temperature, or 0 if there is none. Code it in C++ in better than O(n squared)."

**What a strong answer should cover:**
- The O(n²) brute force, then a monotonic decreasing stack of indices that answers each day when a warmer day pops it.
- O(n) by the push-once, pop-once argument.
- Strict \`<\` for strictly warmer; days never popped stay 0.
- The circular and hash-map subset variants.
- C++ specifics: \`std::vector<int> answer(n, 0)\` and a \`std::vector<int>\` stack with \`reserve(n)\`; \`back()\` on empty is undefined behaviour; \`vector == vector\` compares contents; \`unordered_map::operator[]\` inserts a 0 for a missing key, so use \`find\` for the subset variant.

**Clarifying questions expected:**
- "Does an equal temperature count as warmer?"
- "What is the maximum input size?"

**Code / implementation expected:** Yes — a C++ function with a \`std::vector<int>\` of indices as the stack.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews; you should know what a stack is.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every code block in this C++ version was run, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

You keep a diary of the temperature every day. For each day, you want to write next to it: *"how many days until it got warmer than this?"* The slow way is to take each day and read forward until you find a warmer one. On a long cold spell that means reading almost the whole diary again for every single day.

A smarter diary-keeper reads the diary **once**. She keeps a short list of days that are "still waiting for a warmer day". When a new day arrives, every waiting day that is colder than it gets its answer right now (today minus that day) and is crossed off. Then the new day joins the waiting list. The waiting list is always ordered from warmest at the bottom to coldest at the top, because any colder day sitting above a warmer newcomer would have been crossed off already. That ordered waiting list is a [monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it).

This is the most common way the monotonic stack shows up in interviews, under several names: Daily Temperatures (LeetCode 739), Next Greater Element I and II (496 and 503), and stock span. Getting it right shows you can turn an obvious O(n²) scan into O(n) and explain why the nested loop is still linear.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Warmer means strictly greater, or greater or equal? | Decides \`<\` versus \`<=\` in the pop condition; equal days are the classic hidden test. |
| What goes in the answer when no warmer day exists? | Daily Temperatures uses 0 (a distance); Next Greater Element uses -1 (a value). |
| Do you want the number of days (a distance) or the warmer temperature (a value)? | Distance needs indices on the stack; value only needs the value. |
| How big can the input be? | Up to about 10^5 makes the O(n²) brute force too slow, so the stack is required. |
| Is the array circular? | Then loop twice with \`i % n\` (Next Greater Element II). |

## 3. The Core Idea

**Brute force.** For each day \`i\`, scan \`j = i + 1, i + 2, ...\` until \`temps[j] > temps[i]\`. In the worst case (a long run with no warmer day) each scan reads to the end: about n²/2 comparisons, O(n²) time.

**The monotonic stack.** Scan once, left to right, and keep a stack of *indices of days still waiting for a warmer day*. Their temperatures are **decreasing** from bottom to top (equal temperatures can sit next to each other, since equal is not warmer).

For each day \`i\` with temperature \`t\`:

1. While the stack is not empty **and** the day on top is colder than \`t\`: pop it as \`j\`, and set \`answer[j] = i - j\`.
2. Push \`i\`.

Days still on the stack at the end never saw a warmer day; their answer stays 0.

📌 **Interview term: Next greater element** — for each position, the first element to its right that is strictly larger. Daily Temperatures asks for the *distance* to it; Next Greater Element asks for its *value*.

📌 **Interview term: Monotonic decreasing stack** — a stack whose values never increase from bottom to top, maintained by popping smaller values before each push.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 280" role="img" aria-label="Day 5 with temperature 72 arrives. The stack holds days 2, 3 and 4 with temperatures 75, 71 and 69. Days 4 and 3 are colder, so they are popped with answers 1 and 2. Day 2 at 75 is warmer, so popping stops and day 5 is pushed">
  <defs>
    <marker id="b11q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="130" y="40" text-anchor="middle">stack before day 5</text>
  <rect class="d-box" x="60" y="116" width="140" height="34" rx="6"/>
  <text class="d-text" x="130" y="138" text-anchor="middle">day 4: 69</text>
  <rect class="d-box" x="60" y="158" width="140" height="34" rx="6"/>
  <text class="d-text" x="130" y="180" text-anchor="middle">day 3: 71</text>
  <rect class="d-box" x="60" y="200" width="140" height="34" rx="6"/>
  <text class="d-text" x="130" y="222" text-anchor="middle">day 2: 75</text>
  <path class="d-edge" d="M 50 244 L 210 244"/>

  <path class="d-edge" d="M 214 133 L 270 133" marker-end="url(#b11q5-arrow)"/>

  <text class="d-text" x="350" y="40" text-anchor="middle">day 5 arrives</text>
  <rect class="d-box-accent" x="280" y="116" width="140" height="34" rx="6"/>
  <text class="d-text d-accent" x="350" y="138" text-anchor="middle">day 5: 72</text>
  <text class="d-sub" x="350" y="182" text-anchor="middle">69 colder: answer[4] = 1</text>
  <text class="d-sub" x="350" y="204" text-anchor="middle">71 colder: answer[3] = 2</text>
  <text class="d-sub" x="350" y="226" text-anchor="middle">75 warmer: stop</text>

  <path class="d-edge" d="M 430 133 L 486 133" marker-end="url(#b11q5-arrow)"/>

  <text class="d-text" x="570" y="40" text-anchor="middle">stack after</text>
  <rect class="d-box-accent" x="500" y="158" width="140" height="34" rx="6"/>
  <text class="d-text" x="570" y="180" text-anchor="middle">day 5: 72</text>
  <rect class="d-box" x="500" y="200" width="140" height="34" rx="6"/>
  <text class="d-text" x="570" y="222" text-anchor="middle">day 2: 75</text>
  <path class="d-edge" d="M 490 244 L 650 244"/>
</svg>

This is the step for day 5 (72 degrees) in the sample \`[73, 74, 75, 71, 69, 72, 76, 73]\`: the two colder days on top (69 and 71) get their answers, and the warmer day 75 stays, because it is still waiting for something warmer than 75.

### Dry run on \`[73, 74, 75, 71, 69, 72, 76, 73]\`

| Day i | Temp | Pops (answer given) | Stack after (day: temp) |
| :--- | :--- | :--- | :--- |
| 0 | 73 | none | 0:73 |
| 1 | 74 | day 0, answer[0] = 1 | 1:74 |
| 2 | 75 | day 1, answer[1] = 1 | 2:75 |
| 3 | 71 | none | 2:75, 3:71 |
| 4 | 69 | none | 2:75, 3:71, 4:69 |
| 5 | 72 | day 4, answer[4] = 1; day 3, answer[3] = 2 | 2:75, 5:72 |
| 6 | 76 | day 5, answer[5] = 1; day 2, answer[2] = 4 | 6:76 |
| 7 | 73 | none | 6:76, 7:73 |
| end | | days 6 and 7 keep 0 | |

Answer: \`[1, 1, 4, 2, 1, 1, 0, 0]\`, which is what Example 1 prints.

📌 **Interview term: Amortised analysis** — the \`while\` loop can pop many items in one step, but every index is pushed once and popped at most once, so the total work over the whole scan is O(n). See [amortized analysis](/interview-question/what-is-amortized-analysis).

## 4. The Two Classic Variants

**Next Greater Element II (circular).** The array wraps around, so the last elements may find their answer at the start. Walk the indices \`0 .. 2n - 1\`, read \`nums[i % n]\`, and push indices only during the first pass (\`i < n\`). The second pass only answers elements that are still waiting.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 180" role="img" aria-label="Circular next greater for 1, 2, 1. The array is walked twice. The last 1 finds its answer 2 during the second pass">
  <defs>
    <marker id="b11q5-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="165" y="40" text-anchor="middle">first pass: i below n, push i</text>
  <text class="d-sub" x="485" y="40" text-anchor="middle">second pass: read i mod n only</text>
  <rect class="d-box" x="40" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="75" y="107" text-anchor="middle">1</text>
  <rect class="d-box" x="130" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="165" y="107" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="220" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="255" y="107" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="360" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="395" y="107" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="450" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="485" y="107" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="540" y="80" width="70" height="44" rx="6"/>
  <text class="d-text" x="575" y="107" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 255 76 Q 370 50 478 74" marker-end="url(#b11q5-arrow2)"/>
  <text class="d-sub" x="75" y="150" text-anchor="middle">i = 0</text>
  <text class="d-sub" x="165" y="150" text-anchor="middle">i = 1</text>
  <text class="d-sub" x="255" y="150" text-anchor="middle">i = 2</text>
  <text class="d-sub" x="395" y="150" text-anchor="middle">i = 3</text>
  <text class="d-sub" x="485" y="150" text-anchor="middle">i = 4</text>
  <text class="d-sub" x="575" y="150" text-anchor="middle">i = 5</text>
</svg>

For \`[1, 2, 1]\` the last 1 (index 2) is still waiting at the end of the first pass; at \`i = 4\` the second pass reads \`nums[1] = 2\`, which answers it. The 2 itself never finds anything bigger, so it gets -1, giving \`[2, -1, 2]\`.

**Next Greater Element I (subset with a hash map).** You are given \`nums1\`, a subset of \`nums2\` with distinct values, and need each \`nums1\` value's next greater element *in \`nums2\`*. Run the stack over \`nums2\` once, record \`value -> next greater value\` in a hash map, and then answer each \`nums1\` value with a lookup (default -1). For \`nums1 = [4, 1, 2]\`, \`nums2 = [1, 3, 4, 2]\` the answer is \`[-1, 3, -1]\`. Example 3 runs both variants.

## 5. The C++ Solution

~~~cpp
// answer[i] = days to wait after day i for a strictly warmer day (0 if never).
std::vector<int> dailyTemperatures(const std::vector<int>& temps) {
    int n = (int)temps.size();
    std::vector<int> answer(n, 0);
    std::vector<int> stack;             // indices of waiting days; temps decrease upward
    stack.reserve(n);
    for (int i = 0; i < n; i++) {
        while (!stack.empty() && temps[stack.back()] < temps[i]) {
            int j = stack.back();       // today is warmer than the waiting day
            stack.pop_back();
            answer[j] = i - j;
        }
        stack.push_back(i);
    }
    return answer;                      // days left on the stack keep their 0
}
~~~

C++ details:

- **\`std::vector<int> answer(n, 0)\`** fills the default; \`stack.reserve(n)\` avoids reallocations because the stack never exceeds n.
- **Read, then pop.** \`pop_back()\` returns \`void\`, so the code reads \`stack.back()\` into \`j\` first.
- **\`!stack.empty() &&\` first.** \`back()\` on an empty vector is undefined behaviour; the short-circuit keeps it safe.
- **\`int n = (int)temps.size()\`.** Using a signed \`int\` for indices keeps \`i - j\` simple and avoids unsigned wrap-around if you later write a reverse loop.
- **Comparing results.** \`a == b\` on two \`std::vector<int>\` compares sizes and elements, so Example 2 can use it directly.
- **The subset variant.** Example 3 uses \`greater.find(x)\` rather than \`greater[x]\`, because \`operator[]\` inserts a default-constructed value for a missing key:

~~~cpp
#include <iostream>
#include <unordered_map>
int main() {
    std::unordered_map<int, int> greater;
    std::cout << "size before: " << greater.size() << "\\n";
    std::cout << "greater[42] = " << greater[42] << "\\n";
    std::cout << "size after: " << greater.size() << "\\n";
}
~~~

~~~text
size before: 0
greater[42] = 0
size after: 1
~~~

So \`greater[x]\` would silently answer 0 (a wrong value, since -1 means "none") and grow the map.

📌 **Interview term: Undefined behaviour (UB)** — code the standard gives no meaning to, such as \`back()\` on an empty vector.

## 6. Verified: Running the Code

Each example below was saved to a file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (g++ 13.3 with -std=c++17). The same programs in the other three languages print exactly the same lines.

**Example 1 — Daily Temperatures on the sample and edge cases** printed:

~~~text
[1, 1, 4, 2, 1, 1, 0, 0]
[1, 1, 1, 0]
[0, 0, 0]
[3, 2, 1, 0]
[0]
[]
~~~

**Example 2 — Brute force vs monotonic stack: counting comparisons** printed:

~~~text
sample: brute comparisons=11, stack comparisons=10, same answer=true
falling 3000: brute comparisons=168888, stack comparisons=5897, same answer=true
cold then hot 3000: brute comparisons=4498500, stack comparisons=5997, same answer=true
~~~

**Example 3 — Circular next greater (LeetCode 503) and the hash-map subset (LeetCode 496)** printed:

~~~text
[2, -1, 2]
[2, 3, 4, -1, 4]
[-1, -1, -1]
[-1, 3, -1]
[3, -1]
~~~

In Example 2 the "falling 3000" input repeats a slow fall from 100 to 31, and "cold then hot 3000" is 2,999 days at 30 followed by one day at 99. Equal days are not warmer, so in the second input the brute force scans to the end for every day (2,999 + 2,998 + ... = 4,498,500 comparisons) while the stack does fewer than two comparisons per day.

## 7. Complexity

| | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) extra | Each day may scan to the end |
| Monotonic stack | O(n) | O(n) | Each index pushed once and popped at most once; the stack can hold all n indices for a falling sequence |
| Circular version | O(n) | O(n) | Two passes of n, still at most n pushes |
| Subset version with hash map | O(n + m) | O(n) | One pass over \`nums2\`, then one lookup per \`nums1\` value |

Example 2 measured it: on 3,000 days of the same cold temperature followed by one hot day, the brute force made 4,498,500 comparisons and the stack 5,997, with identical answers.

## 8. Edge Cases

- **Equal temperatures** (\`[70, 70, 70, 71]\`) — equal is not warmer, so the pop uses strict \`<\`; all three 70s wait for the 71 and get \`[3, 2, 1, 0]\`.
- **Strictly falling** (\`[90, 80, 70]\`) — nobody is ever popped; everything stays 0, and the stack grows to n.
- **Strictly rising** (\`[30, 40, 50, 60]\`) — every day is answered by the next one: \`[1, 1, 1, 0]\`.
- **One day** (\`[50]\`) — \`[0]\`.
- **Empty input** — return an empty array; the loop never runs.
- **The last day** — always 0, because there is nothing after it.

## Common Pitfalls

- **Pushing temperatures instead of indices.** You cannot compute \`i - j\`.
- **\`<=\` instead of \`<\`.** \`{70, 70, 70, 71}\` must give \`{3, 2, 1, 0}\`.
- **\`back()\` on an empty stack.** Undefined behaviour; keep \`!stack.empty() &&\` first.
- **\`unordered_map::operator[]\` for lookups.** Inserts 0 for a missing key and returns it; use \`find\` (or \`count\`) with a -1 default.
- **Unsigned index arithmetic.** \`size_t\` loops that count down never stop at 0; use \`int\` indices.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Brute force:</strong> <span style="color:#f0e2c8;">For each day scan forward to the first warmer day: O(n²) for a long cold spell.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The idea:</strong> <span style="color:#f0e2c8;">Scan once with a stack of indices of days still waiting; their temperatures decrease from bottom to top.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The step:</strong> <span style="color:#f0e2c8;">While the stack is non-empty and the top day is colder than today, read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j = stack.back()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_back()</code>, set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">answer[j] = i - j</code>; then push <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>. Days left keep 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time since each index is pushed once and popped at most once; O(n) space.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt; answer(n, 0)</code>, a reserved <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt;</code> stack, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">empty()</code> checked before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">back()</code> because that is UB, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> in the hash-map variant.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it O(n) with a nested loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each index is pushed once and popped at most once, so the inner loop runs at most n times overall. Example 2 shows 5,997 comparisons for 3,000 days versus 4,498,500 for brute force.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">find</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">greater[x]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> inserts a default 0 for a missing key and returns it, which is the wrong answer here (-1 means none) and grows the map.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::stack&lt;int&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It would work, but a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> can <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reserve(n)</code> and be inspected while debugging; the operations are the same.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if equal temperatures count as warmer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=</code> in the pop condition.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle the circular version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> from 0 to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 * n - 1</code>, read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i % n]</code>, and push only while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &lt; n</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Next greater element** | The first element to the right that is strictly larger |
| **Monotonic decreasing stack** | A stack whose values never increase from bottom to top |
| **Amortised analysis** | Counting total work over the whole run: n pushes and at most n pops make O(n) |
| **Undefined behaviour (UB)** | Code the standard gives no meaning to, such as \`back()\` on an empty vector |

---
**Conclusion:** Daily Temperatures is the next greater element problem with distances. Scan once with a \`std::vector<int>\` of indices; each day pops every colder day on top and gives it \`i - j\`, then waits itself. Each index is pushed once and popped at most once, so the pass is O(n), and the runs above show 5,997 comparisons against 4,498,500 for brute force. In C++ check \`empty()\` before \`back()\`, use signed indices, and look up the hash map with \`find\` because \`operator[]\` inserts.`,
        examples: [
          {
            label: "Daily Temperatures on the sample and edge cases",
            code: `#include <iostream>
#include <string>
#include <vector>

// answer[i] = days to wait after day i for a strictly warmer day (0 if never).
std::vector<int> dailyTemperatures(const std::vector<int>& temps) {
    int n = (int)temps.size();
    std::vector<int> answer(n, 0);
    std::vector<int> stack;             // indices of waiting days; temps decrease upward
    stack.reserve(n);
    for (int i = 0; i < n; i++) {
        while (!stack.empty() && temps[stack.back()] < temps[i]) {
            int j = stack.back();       // today is warmer than the waiting day
            stack.pop_back();
            answer[j] = i - j;
        }
        stack.push_back(i);
    }
    return answer;                      // days left on the stack keep their 0
}

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

int main() {
    std::cout << fmt(dailyTemperatures({73, 74, 75, 71, 69, 72, 76, 73})) << "\\n"; // [1, 1, 4, 2, 1, 1, 0, 0]
    std::cout << fmt(dailyTemperatures({30, 40, 50, 60})) << "\\n";   // [1, 1, 1, 0]
    std::cout << fmt(dailyTemperatures({90, 80, 70})) << "\\n";       // [0, 0, 0]
    std::cout << fmt(dailyTemperatures({70, 70, 70, 71})) << "\\n";   // [3, 2, 1, 0]
    std::cout << fmt(dailyTemperatures({50})) << "\\n";               // [0]
    std::cout << fmt(dailyTemperatures({})) << "\\n";                 // []
}
`,
          },
          {
            label: "Brute force vs monotonic stack: counting comparisons",
            code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

// Brute force vs monotonic stack: same answers, very different work.

std::pair<std::vector<int>, long long> brute(const std::vector<int>& temps) {
    int n = (int)temps.size();
    std::vector<int> answer(n, 0);
    long long steps = 0;
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            steps++;                                     // one comparison
            if (temps[j] > temps[i]) { answer[i] = j - i; break; }
        }
    }
    return {answer, steps};
}

std::pair<std::vector<int>, long long> withStack(const std::vector<int>& temps) {
    int n = (int)temps.size();
    std::vector<int> answer(n, 0), stack;
    long long steps = 0;
    for (int i = 0; i < n; i++) {
        while (!stack.empty()) {
            steps++;                                     // one comparison
            if (temps[stack.back()] >= temps[i]) break;
            answer[stack.back()] = i - stack.back();
            stack.pop_back();
        }
        stack.push_back(i);
    }
    return {answer, steps};
}

int main() {
    std::vector<int> falling, coldThenHot(2999, 30);
    for (int i = 0; i < 3000; i++) falling.push_back(100 - (i % 70));
    coldThenHot.push_back(99);
    std::vector<std::pair<std::string, std::vector<int>>> cases = {
        {"sample", {73, 74, 75, 71, 69, 72, 76, 73}},
        {"falling 3000", falling},
        {"cold then hot 3000", coldThenHot}};
    for (const auto& [name, temps] : cases) {
        auto [a, s1] = brute(temps);
        auto [b, s2] = withStack(temps);
        std::cout << name << ": brute comparisons=" << s1 << ", stack comparisons=" << s2
                  << ", same answer=" << (a == b ? "true" : "false") << "\\n";  // vector == compares contents
    }
}
`,
          },
          {
            label: "Circular next greater (LeetCode 503) and the hash-map subset (LeetCode 496)",
            code: `#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>

// LeetCode 503: the array wraps around. Walk it twice using i % n.
std::vector<int> nextGreaterCircular(const std::vector<int>& nums) {
    int n = (int)nums.size();
    std::vector<int> result(n, -1), stack;
    for (int i = 0; i < 2 * n; i++) {
        int x = nums[i % n];
        while (!stack.empty() && nums[stack.back()] < x) {
            result[stack.back()] = x;
            stack.pop_back();
        }
        if (i < n) stack.push_back(i);           // only first-pass indices need answers
    }
    return result;
}

// LeetCode 496: answers for nums1 (a subset of nums2, all distinct).
std::vector<int> nextGreaterSubset(const std::vector<int>& nums1, const std::vector<int>& nums2) {
    std::unordered_map<int, int> greater;        // value -> next greater value in nums2
    std::vector<int> stack;
    for (int x : nums2) {
        while (!stack.empty() && stack.back() < x) {
            greater[stack.back()] = x;
            stack.pop_back();
        }
        stack.push_back(x);
    }
    std::vector<int> out;
    for (int x : nums1) {
        auto it = greater.find(x);               // find, not operator[], which would insert 0
        out.push_back(it == greater.end() ? -1 : it->second);
    }
    return out;
}

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

int main() {
    std::cout << fmt(nextGreaterCircular({1, 2, 1})) << "\\n";             // [2, -1, 2]
    std::cout << fmt(nextGreaterCircular({1, 2, 3, 4, 3})) << "\\n";       // [2, 3, 4, -1, 4]
    std::cout << fmt(nextGreaterCircular({5, 5, 5})) << "\\n";             // [-1, -1, -1]
    std::cout << fmt(nextGreaterSubset({4, 1, 2}, {1, 3, 4, 2})) << "\\n"; // [-1, 3, -1]
    std::cout << fmt(nextGreaterSubset({2, 4}, {1, 2, 3, 4})) << "\\n";    // [3, -1]
}
`,
          },
        ],
      },
    },
  },
];

export default augments;
