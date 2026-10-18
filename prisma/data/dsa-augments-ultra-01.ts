/**
 * DSA ULTRA — batch 01: foundations — Big-O notation, the cost of common operations on arrays,
 * hash maps and balanced trees, space complexity and recursion stack space, amortized analysis,
 * and recursion with base cases. One complete answer per language (Python, JavaScript, Java,
 * C++). Every example was run with python3 / node / javac+java / g++ -std=c++17 by
 * scripts/verify-dsa-examples.ts and the quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is Big-O notation?",
    difficulty: "easy",
    seoDescription: "Big-O notation explained from zero: growth rates, dropping constants, reading complexity from loops, with step counts verified in Python, JS, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Explain Big-O notation to me as if I had never heard of it. Then look at a few loops written in Python and tell me their Big-O, and explain why we are allowed to drop constants."

**What a strong answer should cover:**
- Big-O describes how running time (or memory) **grows** as the input size n grows; it is about the shape of the growth, not seconds.
- Drop constant factors and lower-order terms: 3n² + 5n + 20 is O(n²); 2n is O(n).
- The common classes in order, with an example each: O(1) index, O(log n) binary search, O(n) one pass, O(n log n) good sorting, O(n²) all pairs, O(2ⁿ) all subsets.
- Reading code: sequential steps add, nested loops multiply, halving gives log n; Big-O is an upper bound and usually quoted for the worst case (Theta and Omega for tight and lower bounds).
- Python-specific hidden costs: \`x in list\` is O(n) while \`x in set\` and dict lookups are O(1) on average; \`list.pop(0)\` and slicing are O(n); \`sort()\` is O(n log n).

**Code / implementation expected:** Optional — a few Python functions whose loops the candidate labels O(1), O(log n), O(n), O(n²).`,
        answer: `**Target Audience:** Complete beginners preparing for coding interviews — no maths beyond multiplication assumed.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Every idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every number on this page (step counts, comparisons, overflow values) comes from actually running the Python code shown, and the **Verified** section quotes that output.

## 1. Why This Even Matters — A Story First

You are throwing a party and have two jobs. Job one: hand each guest a name badge as they arrive. Job two: make sure every guest shakes hands with every other guest.

With 10 guests, both jobs feel quick. With 1,000 guests, job one takes 1,000 badge hand-outs, but job two needs 499,500 handshakes. Nobody got slower at handing out badges or shaking hands. The difference is **how the amount of work grows when the party grows**: the badges grow in step with the guests, the handshakes grow with the guests *times* the guests.

Big-O notation is just a short way to write down that growth pattern. "Badges" is O(n), "handshakes" is O(n²). It lets two engineers compare two solutions on a whiteboard, without a stopwatch, and know which one will collapse when the input gets big.

## 2. The Core Idea in Plain Language

Pick a way to measure the input: the number of items in a list, the number of characters in a string, the number of nodes in a graph. Call it **n**. Then count the basic steps the code takes (comparisons, additions, reads) as a formula in n. Big-O keeps only the part of that formula that matters when n is huge.

📌 **Interview term: Input size (n)** — the number that measures how big the input is; complexity is always stated in terms of it (and sometimes two of them, like n and m).

📌 **Interview term: Time complexity** — how the number of basic steps an algorithm performs grows as n grows.

📌 **Interview term: Big-O notation** — a way of writing an upper bound on that growth, ignoring constant factors and smaller terms. Formally, f(n) is O(g(n)) if there are constants c and n₀ such that f(n) ≤ c · g(n) for every n ≥ n₀.

That formal line just says: "past some point, f never grows faster than g, give or take a constant multiplier". This is why we may simplify:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="Simplifying a step count to Big-O in three stages">
  <defs>
    <marker id="b01q1-arrow-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="380" y="26" text-anchor="middle">From an exact step count to a Big-O class</text>
  <rect class="d-box-muted" x="30" y="56" width="200" height="110" rx="10"/>
  <text class="d-text" x="130" y="90" text-anchor="middle">1. Count steps</text>
  <text class="d-sub" x="130" y="120" text-anchor="middle">3n² + 5n + 20</text>
  <text class="d-sub" x="130" y="146" text-anchor="middle">exact formula</text>
  <path class="d-edge" d="M 236 111 L 284 111" marker-end="url(#b01q1-arrow-a)"/>
  <rect class="d-box-muted" x="290" y="56" width="200" height="110" rx="10"/>
  <text class="d-text" x="390" y="90" text-anchor="middle">2. Keep the top term</text>
  <text class="d-sub" x="390" y="120" text-anchor="middle">3n²</text>
  <text class="d-sub" x="390" y="146" text-anchor="middle">5n + 20 is tiny later</text>
  <path class="d-edge" d="M 496 111 L 544 111" marker-end="url(#b01q1-arrow-a)"/>
  <rect class="d-box-accent" x="550" y="56" width="180" height="110" rx="10"/>
  <text class="d-text d-accent" x="640" y="90" text-anchor="middle">3. Drop the constant</text>
  <text class="d-sub" x="640" y="120" text-anchor="middle">O(n²)</text>
  <text class="d-sub" x="640" y="146" text-anchor="middle">the growth class</text>
</svg>

At n = 1,000, 3n² is 3,000,000 while 5n + 20 is 5,020: the smaller terms are less than 0.2% of the total, and their share keeps shrinking as n grows. The constant 3 does not change the shape either: double n and both n² and 3n² become four times bigger.

📌 **Interview term: Dominant term** — the fastest-growing part of the formula; it is the only part Big-O keeps.

📌 **Interview term: Asymptotic analysis** — studying behaviour as n grows towards infinity, which is exactly what Big-O, Theta and Omega describe.

## 3. The Growth Classes You Will Meet

| Big-O | Name | Typical example | Steps at n = 1,000 (measured below) |
| :--- | :--- | :--- | :--- |
| O(1) | constant | read \`nums[0]\`, a hash lookup on average | 1 |
| O(log n) | logarithmic | [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) | 9 |
| O(n) | linear | one pass over a list | 1,000 |
| O(n log n) | linearithmic | [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work) | 9,000 |
| O(n²) | quadratic | compare every pair | 499,500 |
| O(2ⁿ) | exponential | try every [subset](/interview-question/how-do-you-generate-all-subsets-of-an-array) | 2^1000: not countable |

<svg class="iq-diagram" width="100%" viewBox="0 0 760 320" role="img" aria-label="Measured steps at n equal to 1000 for five growth classes, bar length on a log scale">
  <text class="d-text" x="380" y="26" text-anchor="middle">Steps at n = 1000, bar length on a log scale</text>
  <text class="d-text" x="24" y="72">O(1)</text>
  <rect class="d-box-accent" x="150" y="54" width="10" height="26" rx="4"/>
  <text class="d-sub" x="176" y="72">1</text>
  <text class="d-text" x="24" y="124">O(log n)</text>
  <rect class="d-box-accent" x="150" y="106" width="86" height="26" rx="4"/>
  <text class="d-sub" x="252" y="124">9</text>
  <text class="d-text" x="24" y="176">O(n)</text>
  <rect class="d-box-accent" x="150" y="158" width="270" height="26" rx="4"/>
  <text class="d-sub" x="436" y="176">1,000</text>
  <text class="d-text" x="24" y="228">O(n log n)</text>
  <rect class="d-box-accent" x="150" y="210" width="356" height="26" rx="4"/>
  <text class="d-sub" x="522" y="228">9,000</text>
  <text class="d-text" x="24" y="280">O(n²)</text>
  <rect class="d-box-accent" x="150" y="262" width="513" height="26" rx="4"/>
  <text class="d-sub" x="679" y="280">499,500</text>
</svg>

Each step up the ladder is a big jump. Note that the bars use a log scale: on a normal scale the O(n²) bar would be 500 times longer than the O(n) bar.

## 4. How to Read the Big-O of Code — Five Rules

1. **A fixed number of steps is O(1)**, no matter how big n is — reading one element, one arithmetic operation, one comparison.
2. **A loop over n items is O(n)** if its body is O(1).
3. **Nested loops multiply.** A loop over n items with a loop over n items inside it is O(n · n) = O(n²). (Pairs with i < j are n(n − 1)/2, still O(n²).)
4. **Halving gives a logarithm.** If each round cuts the remaining work in half, the number of rounds is about log₂ n.
5. **Sequential blocks add, then you keep the biggest.** O(n) followed by O(n²) is O(n + n²) = O(n²).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="Halving 16 down to 1 takes four rounds">
  <defs>
    <marker id="b01q1-arrow-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="380" y="26" text-anchor="middle">Rule 4: halving 16 items reaches 1 after 4 rounds</text>
  <rect class="d-box-muted" x="30" y="60" width="100" height="64" rx="10"/>
  <text class="d-text" x="80" y="98" text-anchor="middle">16</text>
  <path class="d-edge" d="M 134 92 L 174 92" marker-end="url(#b01q1-arrow-b)"/>
  <rect class="d-box-muted" x="180" y="60" width="100" height="64" rx="10"/>
  <text class="d-text" x="230" y="98" text-anchor="middle">8</text>
  <path class="d-edge" d="M 284 92 L 324 92" marker-end="url(#b01q1-arrow-b)"/>
  <rect class="d-box-muted" x="330" y="60" width="100" height="64" rx="10"/>
  <text class="d-text" x="380" y="98" text-anchor="middle">4</text>
  <path class="d-edge" d="M 434 92 L 474 92" marker-end="url(#b01q1-arrow-b)"/>
  <rect class="d-box-muted" x="480" y="60" width="100" height="64" rx="10"/>
  <text class="d-text" x="530" y="98" text-anchor="middle">2</text>
  <path class="d-edge" d="M 584 92 L 624 92" marker-end="url(#b01q1-arrow-b)"/>
  <rect class="d-box-accent" x="630" y="60" width="100" height="64" rx="10"/>
  <text class="d-text d-accent" x="680" y="98" text-anchor="middle">1</text>
</svg>

Four arrows for 16 items, because 2⁴ = 16. For 1,048,576 items (2²⁰) it is only 20 rounds, which is why logarithmic algorithms feel almost free.

Here are the five patterns as Python functions that count their own steps. They are the core of the first runnable example:

~~~python
def constant_steps(n):
    return 1                      # e.g. read nums[0]: one step, whatever n is

def log_steps(n):
    steps = 0
    while n > 1:                  # halve the problem until one item is left
        n //= 2
        steps += 1
    return steps

def linear_steps(n):
    steps = 0
    for _ in range(n):            # touch every item once
        steps += 1
    return steps

def n_log_n_steps(n):
    steps = 0
    for _ in range(n):            # n times ...
        steps += log_steps(n)     # ... run a halving loop
    return steps

def quadratic_steps(n):
    steps = 0
    for i in range(n):            # every pair (i, j) with i < j
        for j in range(i + 1, n):
            steps += 1
    return steps
~~~

A few Python details in that code:

- \`n //= 2\` is **floor division**, so the value stays a whole number. Plain \`/\` would give a float (\`5 / 2\` is \`2.5\`) and the loop would never hit exactly 1.
- \`for _ in range(n)\` is the idiomatic "do this n times" loop; \`range\` does not build a list, so it costs O(1) extra memory.
- The step counters are ordinary Python \`int\`s. Python integers have arbitrary precision, so even a huge O(n²) count never overflows (the Java and C++ versions of this page need \`long\` / \`long long\` for that).

📌 **Interview term: Logarithmic time** — work that grows with log n, typically because each step halves (or divides by a constant) the remaining problem.

## 5. Worst, Best and Average Case — and O vs Θ vs Ω

The same code can take different numbers of steps on different inputs of the same size. Linear search finds the target at index 0 in one step (best case) but needs all n steps when the target is missing (worst case).

📌 **Interview term: Worst case** — the maximum number of steps over all inputs of size n. When people say "linear search is O(n)" they mean the worst case.

📌 **Interview term: Average case** — the expected number of steps over some distribution of inputs (for example, "keys are spread evenly by the hash function").

📌 **Interview term: Big-Theta (Θ) and Big-Omega (Ω)** — Θ is a tight bound (grows exactly like g, up to constants); Ω is a lower bound (grows at least like g). Big-O is only an upper bound, so technically linear search is also O(n²), but in an interview you give the tightest bound you can.

Space is measured the same way: count the extra memory as a function of n. That topic has its own page: [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 6. Hidden Loops in Python: One Line Is Not One Step

The trap in Python is that a lot of work hides behind short syntax. Big-O counts what the line *does*, not how many characters it has. This snippet counts how many equality checks Python performs for \`in\` on a list versus a set:

~~~python
class Tracked:
    eq_calls = 0
    def __init__(self, v):
        self.v = v
    def __eq__(self, other):          # count every equality check Python makes
        Tracked.eq_calls += 1
        return self.v == other.v
    def __hash__(self):
        return hash(self.v)

items = [Tracked(i) for i in range(10000)]
as_set = set(items)

Tracked.eq_calls = 0
found = Tracked(9999) in items        # one line, but a hidden O(n) loop
print("x in list:", found, "after", Tracked.eq_calls, "== checks")

Tracked.eq_calls = 0
found = Tracked(9999) in as_set       # hash first, then usually one check
print("x in set: ", found, "after", Tracked.eq_calls, "== checks")

print("Python ints do not overflow:", 100000 * 100000, 2 ** 64)
~~~

Output of \`python3 main.py\`:

~~~text
x in list: True after 10000 == checks
x in set:  True after 1 == checks
Python ints do not overflow: 10000000000 18446744073709551616
~~~

Same line, same answer, but the list did 10,000 checks (a hidden O(n) loop) while the set did 1 (it jumps to the right bucket using the hash, O(1) on average — see [how a hash table works](/interview-question/how-does-a-hash-table-work)).

Other common hidden costs in Python, from the [Python wiki TimeComplexity page](https://wiki.python.org/moin/TimeComplexity):

| Looks cheap | Real cost | Why |
| :--- | :--- | :--- |
| \`x in my_list\` | O(n) | scans the list |
| \`my_list.insert(0, x)\` / \`my_list.pop(0)\` | O(n) | every other element shifts one place; use \`collections.deque\` for O(1) at both ends |
| \`nums[1:]\` | O(k) for a slice of length k | a slice is a new list, a copy |
| \`sorted(nums)\` / \`nums.sort()\` | O(n log n) | a full comparison sort |
| \`len(nums)\` | O(1) | the length is stored, not counted |

Building a string with \`s += piece\` in a loop is another one: [PEP 8](https://peps.python.org/pep-0008/#programming-recommendations) asks you not to rely on CPython's in-place concatenation optimisation, and to use \`"".join(pieces)\` (one O(total length) pass) instead.

## 7. Example: Linear vs Binary Search

The cleanest way to *feel* the difference between O(n) and O(log n) is to answer the same question two ways. Both functions below search a sorted list for a value and count comparisons:

~~~python
def linear_search(nums, target):
    comparisons = 0
    for x in nums:                 # O(n): may look at every item
        comparisons += 1
        if x == target:
            return True, comparisons
    return False, comparisons

def binary_search(nums, target):
    comparisons = 0
    lo, hi = 0, len(nums) - 1
    while lo <= hi:                # O(log n): halves the range each round
        comparisons += 1
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return True, comparisons
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return False, comparisons
~~~

\`(lo + hi) // 2\` is safe in Python because integers never overflow; in Java or C++ the same line can overflow for very large arrays, which is why those versions write \`lo + (hi - lo) / 2\`. Binary search has its own deep-dive page: [how binary search works and what it requires](/interview-question/how-does-binary-search-work-and-what-are-its-requirements).

The second example also shows why constants are dropped. This function makes two passes instead of one:

~~~python
def min_and_max_two_passes(nums):
    steps = 0
    lo = nums[0]
    for x in nums:                 # first pass: n steps
        steps += 1
        lo = min(lo, x)
    hi = nums[0]
    for x in nums:                 # second pass: n more steps
        steps += 1
        hi = max(hi, x)
    return lo, hi, steps           # 2n steps in total, which is still O(n)
~~~

It takes 2n steps. Double n and it takes twice as long, exactly like a one-pass version: both are O(n).

## 8. Verified: Running the Code

Both programs are the runnable examples under "Python code" on this page. They were run with \`python3 main.py\`.

**Example 1 — step counts for each class:**

~~~text
n=10: O(1)=1, O(log n)=3, O(n)=10, O(n log n)=30, O(n^2)=45
n=100: O(1)=1, O(log n)=6, O(n)=100, O(n log n)=600, O(n^2)=4950
n=1000: O(1)=1, O(log n)=9, O(n)=1000, O(n log n)=9000, O(n^2)=499500
doubling n from 1000 to 2000:
  O(1) grows x1.00
  O(log n) grows x1.11
  O(n) grows x2.00
  O(n log n) grows x2.22
  O(n^2) grows x4.00
~~~

How to read it: going from n = 1,000 to n = 2,000, O(1) stays put, O(log n) grows by only one step (×1.11), O(n) exactly doubles, O(n log n) slightly more than doubles, and O(n²) quadruples. That "what happens when n doubles" test is a quick way to identify a class from measurements.

**Example 2 — linear vs binary search, and two passes:**

~~~text
n=16: linear=16 comparisons, binary=5 comparisons
n=1024: linear=1024 comparisons, binary=11 comparisons
n=1048576: linear=1048576 comparisons, binary=21 comparisons
two passes over 5 items: min=1, max=9, steps=10
~~~

From 16 to 1,048,576 items, linear search went from 16 to 1,048,576 comparisons, while binary search went from 5 to 21. The two-pass min/max took 10 steps for 5 items: 2n, still linear.

## 9. Complexity of the Examples

| Function | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`constant_steps\` | O(1) | O(1) | fixed work |
| \`log_steps\` | O(log n) | O(1) | n halves each round |
| \`linear_steps\` | O(n) | O(1) | one step per item |
| \`n_log_n_steps\` | O(n log n) | O(1) | n rounds of a log n loop |
| \`quadratic_steps\` | O(n²) | O(1) | n(n − 1)/2 pairs |
| linear search | O(n) worst, O(1) best | O(1) | may touch every item |
| binary search | O(log n) worst, O(1) best | O(1) | halves the range |

## 10. Edge Cases and Subtleties

- **Two inputs, two variables.** Comparing every item of a list of size n with every item of a list of size m is O(n · m), not O(n²). Do not merge variables that are independent.
- **n = 0 and n = 1.** Big-O says nothing about tiny inputs; still, the code must handle them (\`log_steps(1)\` returns 0 rounds, which is correct).
- **Big-O is not seconds.** A smaller class wins *eventually*. For small n, constant factors and memory behaviour can make the "worse" algorithm faster.
- **Logarithm base does not matter.** log₂ n and log₁₀ n differ only by a constant factor (about 3.32), so we just write O(log n).
- **Big-O of a loop depends on the loop body.** A single loop that calls an O(n) function inside is O(n²) — see the hidden-loop table above.

## Common Pitfalls

- **Calling a line O(1) because it is short.** \`x in my_list\`, \`my_list.index(x)\`, \`my_list.count(x)\` and \`my_list.remove(x)\` are all O(n) scans; inside a loop they quietly turn O(n) code into O(n²).
- **Using a list as a queue.** \`pop(0)\` shifts every remaining element, so n pops cost O(n²) in total; \`collections.deque.popleft()\` is O(1).
- **Forgetting that slicing copies.** Recursing on \`nums[1:]\` copies the rest of the list at every level: O(n²) time and O(n²) total memory for what should be O(n). Pass indices instead.
- **Saying "Python is slow so Big-O does not matter".** A constant factor of 50 is nothing next to the jump from 21 to 1,048,576 comparisons measured above.
- **Using \`/\` in a halving loop.** \`n / 2\` gives a float; use \`//\` so the loop counts real halvings.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">Big-O describes how the number of steps (or memory) grows as the input size n grows, keeping only the fastest-growing term and dropping constant factors.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The ladder:</strong> <span style="color:#f0e2c8;">From fast to slow: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(1)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(log n)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(n)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(n log n)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(n^2)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(2^n)</code>. At n = 1000 I measured 1, 9, 1000, 9000 and 499,500 steps for the first five.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reading code:</strong> <span style="color:#f0e2c8;">Sequential blocks add, nested loops multiply, a loop that halves its range is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(log n)</code>, and you keep the biggest term: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3n^2 + 5n + 20</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(n^2)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Python specifics:</strong> <span style="color:#f0e2c8;">Short lines can hide loops: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x in list</code> is O(n) but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x in set</code> is O(1) on average, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop(0)</code> and slicing are O(n), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort()</code> is O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Precision:</strong> <span style="color:#f0e2c8;">Big-O is an upper bound, usually quoted for the worst case; Theta is the tight bound and Omega the lower bound. I always give time and space.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is O(2n) different from O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Constants are dropped because both double when n doubles; my two-pass min/max takes 2n steps and is still O(n). In practice the constant can matter, but it does not change the class.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the Big-O of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x in some_list</code> inside a for loop over n items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n) per check times n iterations, so O(n^2). Converting the list to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> first costs O(n) once and makes each check O(1) on average, so the whole thing becomes O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is binary search O(log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each comparison halves the remaining range, so after k steps there are n / 2^k items left; that reaches 1 when k = log2 n. I measured 21 comparisons for n = 1,048,576.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Big-O tell you which code is faster for n = 10?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It describes growth for large n. For tiny inputs a simple O(n^2) loop can beat an O(n log n) algorithm with more overhead; you measure with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timeit</code> when it matters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does O(1) mean for a dict lookup?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Average-case constant time, assuming hashes spread out. The Python wiki lists the worst case as O(n), for example when many keys collide.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Input size (n)** | The number that measures how big the input is |
| **Time complexity** | How the step count grows as n grows |
| **Big-O notation** | Upper bound on growth, ignoring constants and smaller terms |
| **Dominant term** | The fastest-growing part of a formula; the only part kept |
| **Asymptotic analysis** | Studying behaviour as n becomes very large |
| **Logarithmic time** | Work that grows with log n, usually from halving |
| **Worst case** | Maximum steps over all inputs of size n |
| **Average case** | Expected steps under some input distribution |
| **Big-Theta / Big-Omega** | Tight bound / lower bound on growth |
| **Floor division (\`//\`)** | Python division that rounds down to a whole number |

**Conclusion:** Big-O is a way of describing how work grows with the input, not how long one run takes. Count the steps as a formula in n, keep the biggest term, drop the constant, and you have the class. The measured numbers make the stakes concrete: at a million items, binary search needed 21 comparisons where linear search needed 1,048,576, and doubling n quadrupled the quadratic count. In Python, the extra skill is spotting the loops hidden inside short-looking calls, so the Big-O you state matches the code you actually wrote.`,
        examples: [
          {
            label: "Count the steps of O(1), O(log n), O(n), O(n log n) and O(n^2) code",
            code: `# Count the basic steps each growth class takes for an input of size n.

def constant_steps(n):
    return 1                      # e.g. read nums[0]: one step, whatever n is

def log_steps(n):
    steps = 0
    while n > 1:                  # halve the problem until one item is left
        n //= 2
        steps += 1
    return steps

def linear_steps(n):
    steps = 0
    for _ in range(n):            # touch every item once
        steps += 1
    return steps

def n_log_n_steps(n):
    steps = 0
    for _ in range(n):            # n times ...
        steps += log_steps(n)     # ... run a halving loop
    return steps

def quadratic_steps(n):
    steps = 0
    for i in range(n):            # every pair (i, j) with i < j
        for j in range(i + 1, n):
            steps += 1
    return steps

CLASSES = [
    ("O(1)", constant_steps),
    ("O(log n)", log_steps),
    ("O(n)", linear_steps),
    ("O(n log n)", n_log_n_steps),
    ("O(n^2)", quadratic_steps),
]

for n in [10, 100, 1000]:
    parts = [name + "=" + str(f(n)) for name, f in CLASSES]
    print("n=" + str(n) + ": " + ", ".join(parts))

print("doubling n from 1000 to 2000:")
for name, f in CLASSES:
    ratio = f(2000) / f(1000)
    print("  " + name + " grows x" + format(ratio, ".2f"))`,
          },
          {
            label: "Linear vs binary search: comparisons as n grows",
            code: `# Same question, two algorithms: is \`target\` in a sorted list?
# We count comparisons instead of timing, so the numbers are the same on every machine.

def linear_search(nums, target):
    comparisons = 0
    for x in nums:                 # O(n): may look at every item
        comparisons += 1
        if x == target:
            return True, comparisons
    return False, comparisons

def binary_search(nums, target):
    comparisons = 0
    lo, hi = 0, len(nums) - 1
    while lo <= hi:                # O(log n): halves the range each round
        comparisons += 1
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return True, comparisons
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return False, comparisons

def min_and_max_two_passes(nums):
    steps = 0
    lo = nums[0]
    for x in nums:                 # first pass: n steps
        steps += 1
        lo = min(lo, x)
    hi = nums[0]
    for x in nums:                 # second pass: n more steps
        steps += 1
        hi = max(hi, x)
    return lo, hi, steps           # 2n steps in total, which is still O(n)

for n in [16, 1024, 1048576]:
    nums = list(range(n))          # 0, 1, ..., n-1 (sorted)
    target = n                     # absent: the worst case for both searches
    _, lin = linear_search(nums, target)
    _, binr = binary_search(nums, target)
    print("n=" + str(n) + ": linear=" + str(lin) + " comparisons, binary=" + str(binr) + " comparisons")

lo, hi, steps = min_and_max_two_passes([5, 3, 9, 1, 7])
print("two passes over 5 items: min=" + str(lo) + ", max=" + str(hi) + ", steps=" + str(steps))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Explain Big-O notation to me as if I had never heard of it. Then look at a few loops written in JavaScript and tell me their Big-O, and explain why we are allowed to drop constants."

**What a strong answer should cover:**
- Big-O describes how running time (or memory) **grows** as the input size n grows; it is about the shape of the growth, not seconds.
- Drop constant factors and lower-order terms: 3n² + 5n + 20 is O(n²); 2n is O(n).
- The common classes in order, with an example each: O(1) index, O(log n) binary search, O(n) one pass, O(n log n) good sorting, O(n²) all pairs, O(2ⁿ) all subsets.
- Reading code: sequential steps add, nested loops multiply, halving gives log n; Big-O is an upper bound and usually quoted for the worst case (Theta and Omega for tight and lower bounds).
- JavaScript-specific hidden costs: \`includes\`/\`indexOf\` and spread are O(n) scans or copies, \`Set.has\`/\`Map.get\` are O(1) on average, and \`sort()\` without a comparator sorts numbers as strings.

**Code / implementation expected:** Optional — a few JavaScript functions whose loops the candidate labels O(1), O(log n), O(n), O(n²).`,
        answer: `**Target Audience:** Complete beginners preparing for coding interviews — no maths beyond multiplication assumed.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Every idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every number on this page (step counts, comparisons, overflow values) comes from actually running the JavaScript code shown, and the **Verified** section quotes that output.

## 1. Why This Even Matters — A Story First

You are throwing a party and have two jobs. Job one: hand each guest a name badge as they arrive. Job two: make sure every guest shakes hands with every other guest.

With 10 guests, both jobs feel quick. With 1,000 guests, job one takes 1,000 badge hand-outs, but job two needs 499,500 handshakes. Nobody got slower at handing out badges or shaking hands. The difference is **how the amount of work grows when the party grows**: the badges grow in step with the guests, the handshakes grow with the guests *times* the guests.

Big-O notation is just a short way to write down that growth pattern. "Badges" is O(n), "handshakes" is O(n²). It lets two engineers compare two solutions on a whiteboard, without a stopwatch, and know which one will collapse when the input gets big.

## 2. The Core Idea in Plain Language

Pick a way to measure the input: the number of items in a list, the number of characters in a string, the number of nodes in a graph. Call it **n**. Then count the basic steps the code takes (comparisons, additions, reads) as a formula in n. Big-O keeps only the part of that formula that matters when n is huge.

📌 **Interview term: Input size (n)** — the number that measures how big the input is; complexity is always stated in terms of it (and sometimes two of them, like n and m).

📌 **Interview term: Time complexity** — how the number of basic steps an algorithm performs grows as n grows.

📌 **Interview term: Big-O notation** — a way of writing an upper bound on that growth, ignoring constant factors and smaller terms. Formally, f(n) is O(g(n)) if there are constants c and n₀ such that f(n) ≤ c · g(n) for every n ≥ n₀.

That formal line just says: "past some point, f never grows faster than g, give or take a constant multiplier". This is why we may simplify:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="Simplifying a step count to Big-O in three stages">
  <defs>
    <marker id="b01q1-arrow-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="380" y="26" text-anchor="middle">From an exact step count to a Big-O class</text>
  <rect class="d-box-muted" x="30" y="56" width="200" height="110" rx="10"/>
  <text class="d-text" x="130" y="90" text-anchor="middle">1. Count steps</text>
  <text class="d-sub" x="130" y="120" text-anchor="middle">3n² + 5n + 20</text>
  <text class="d-sub" x="130" y="146" text-anchor="middle">exact formula</text>
  <path class="d-edge" d="M 236 111 L 284 111" marker-end="url(#b01q1-arrow-a)"/>
  <rect class="d-box-muted" x="290" y="56" width="200" height="110" rx="10"/>
  <text class="d-text" x="390" y="90" text-anchor="middle">2. Keep the top term</text>
  <text class="d-sub" x="390" y="120" text-anchor="middle">3n²</text>
  <text class="d-sub" x="390" y="146" text-anchor="middle">5n + 20 is tiny later</text>
  <path class="d-edge" d="M 496 111 L 544 111" marker-end="url(#b01q1-arrow-a)"/>
  <rect class="d-box-accent" x="550" y="56" width="180" height="110" rx="10"/>
  <text class="d-text d-accent" x="640" y="90" text-anchor="middle">3. Drop the constant</text>
  <text class="d-sub" x="640" y="120" text-anchor="middle">O(n²)</text>
  <text class="d-sub" x="640" y="146" text-anchor="middle">the growth class</text>
</svg>

At n = 1,000, 3n² is 3,000,000 while 5n + 20 is 5,020: the smaller terms are less than 0.2% of the total, and their share keeps shrinking as n grows. The constant 3 does not change the shape either: double n and both n² and 3n² become four times bigger.

📌 **Interview term: Dominant term** — the fastest-growing part of the formula; it is the only part Big-O keeps.

📌 **Interview term: Asymptotic analysis** — studying behaviour as n grows towards infinity, which is exactly what Big-O, Theta and Omega describe.

## 3. The Growth Classes You Will Meet

| Big-O | Name | Typical example | Steps at n = 1,000 (measured below) |
| :--- | :--- | :--- | :--- |
| O(1) | constant | read \`nums[0]\`, a hash lookup on average | 1 |
| O(log n) | logarithmic | [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) | 9 |
| O(n) | linear | one pass over a list | 1,000 |
| O(n log n) | linearithmic | [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work) | 9,000 |
| O(n²) | quadratic | compare every pair | 499,500 |
| O(2ⁿ) | exponential | try every [subset](/interview-question/how-do-you-generate-all-subsets-of-an-array) | 2^1000: not countable |

<svg class="iq-diagram" width="100%" viewBox="0 0 760 320" role="img" aria-label="Measured steps at n equal to 1000 for five growth classes, bar length on a log scale">
  <text class="d-text" x="380" y="26" text-anchor="middle">Steps at n = 1000, bar length on a log scale</text>
  <text class="d-text" x="24" y="72">O(1)</text>
  <rect class="d-box-accent" x="150" y="54" width="10" height="26" rx="4"/>
  <text class="d-sub" x="176" y="72">1</text>
  <text class="d-text" x="24" y="124">O(log n)</text>
  <rect class="d-box-accent" x="150" y="106" width="86" height="26" rx="4"/>
  <text class="d-sub" x="252" y="124">9</text>
  <text class="d-text" x="24" y="176">O(n)</text>
  <rect class="d-box-accent" x="150" y="158" width="270" height="26" rx="4"/>
  <text class="d-sub" x="436" y="176">1,000</text>
  <text class="d-text" x="24" y="228">O(n log n)</text>
  <rect class="d-box-accent" x="150" y="210" width="356" height="26" rx="4"/>
  <text class="d-sub" x="522" y="228">9,000</text>
  <text class="d-text" x="24" y="280">O(n²)</text>
  <rect class="d-box-accent" x="150" y="262" width="513" height="26" rx="4"/>
  <text class="d-sub" x="679" y="280">499,500</text>
</svg>

Each step up the ladder is a big jump. Note that the bars use a log scale: on a normal scale the O(n²) bar would be 500 times longer than the O(n) bar.

## 4. How to Read the Big-O of Code — Five Rules

1. **A fixed number of steps is O(1)**, no matter how big n is — reading one element, one arithmetic operation, one comparison.
2. **A loop over n items is O(n)** if its body is O(1).
3. **Nested loops multiply.** A loop over n items with a loop over n items inside it is O(n · n) = O(n²). (Pairs with i < j are n(n − 1)/2, still O(n²).)
4. **Halving gives a logarithm.** If each round cuts the remaining work in half, the number of rounds is about log₂ n.
5. **Sequential blocks add, then you keep the biggest.** O(n) followed by O(n²) is O(n + n²) = O(n²).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="Halving 16 down to 1 takes four rounds">
  <defs>
    <marker id="b01q1-arrow-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="380" y="26" text-anchor="middle">Rule 4: halving 16 items reaches 1 after 4 rounds</text>
  <rect class="d-box-muted" x="30" y="60" width="100" height="64" rx="10"/>
  <text class="d-text" x="80" y="98" text-anchor="middle">16</text>
  <path class="d-edge" d="M 134 92 L 174 92" marker-end="url(#b01q1-arrow-b)"/>
  <rect class="d-box-muted" x="180" y="60" width="100" height="64" rx="10"/>
  <text class="d-text" x="230" y="98" text-anchor="middle">8</text>
  <path class="d-edge" d="M 284 92 L 324 92" marker-end="url(#b01q1-arrow-b)"/>
  <rect class="d-box-muted" x="330" y="60" width="100" height="64" rx="10"/>
  <text class="d-text" x="380" y="98" text-anchor="middle">4</text>
  <path class="d-edge" d="M 434 92 L 474 92" marker-end="url(#b01q1-arrow-b)"/>
  <rect class="d-box-muted" x="480" y="60" width="100" height="64" rx="10"/>
  <text class="d-text" x="530" y="98" text-anchor="middle">2</text>
  <path class="d-edge" d="M 584 92 L 624 92" marker-end="url(#b01q1-arrow-b)"/>
  <rect class="d-box-accent" x="630" y="60" width="100" height="64" rx="10"/>
  <text class="d-text d-accent" x="680" y="98" text-anchor="middle">1</text>
</svg>

Four arrows for 16 items, because 2⁴ = 16. For 1,048,576 items (2²⁰) it is only 20 rounds, which is why logarithmic algorithms feel almost free.

Here are the five patterns as JavaScript functions that count their own steps. They are the core of the first runnable example:

~~~javascript
function constantSteps(n) {
  return 1;                       // e.g. read nums[0]: one step, whatever n is
}

function logSteps(n) {
  let steps = 0;
  while (n > 1) {                 // halve the problem until one item is left
    n = Math.floor(n / 2);        // plain n / 2 would give a fraction in JS
    steps++;
  }
  return steps;
}

function linearSteps(n) {
  let steps = 0;
  for (let i = 0; i < n; i++) steps++;          // touch every item once
  return steps;
}

function nLogNSteps(n) {
  let steps = 0;
  for (let i = 0; i < n; i++) steps += logSteps(n); // n halving loops
  return steps;
}

function quadraticSteps(n) {
  let steps = 0;
  for (let i = 0; i < n; i++)                   // every pair (i, j) with i < j
    for (let j = i + 1; j < n; j++) steps++;
  return steps;
}
~~~

A few JavaScript details in that code:

- JavaScript has one \`number\` type (a 64-bit floating-point value), so \`n / 2\` on an odd number gives a fraction (\`5 / 2\` is \`2.5\`). \`Math.floor(n / 2)\` keeps the halving on whole numbers.
- The counters are plain numbers. They are exact integers up to \`Number.MAX_SAFE_INTEGER\` (9,007,199,254,740,991, printed in the snippet below), far above anything these loops reach. Beyond that you would need \`BigInt\`.
- \`let\` inside \`for\` gives each loop its own variable; nothing here allocates memory that grows with n, so the extra space is O(1).

📌 **Interview term: Logarithmic time** — work that grows with log n, typically because each step halves (or divides by a constant) the remaining problem.

## 5. Worst, Best and Average Case — and O vs Θ vs Ω

The same code can take different numbers of steps on different inputs of the same size. Linear search finds the target at index 0 in one step (best case) but needs all n steps when the target is missing (worst case).

📌 **Interview term: Worst case** — the maximum number of steps over all inputs of size n. When people say "linear search is O(n)" they mean the worst case.

📌 **Interview term: Average case** — the expected number of steps over some distribution of inputs (for example, "keys are spread evenly by the hash function").

📌 **Interview term: Big-Theta (Θ) and Big-Omega (Ω)** — Θ is a tight bound (grows exactly like g, up to constants); Ω is a lower bound (grows at least like g). Big-O is only an upper bound, so technically linear search is also O(n²), but in an interview you give the tightest bound you can.

Space is measured the same way: count the extra memory as a function of n. That topic has its own page: [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 6. Hidden Loops in JavaScript: One Call Is Not One Step

In JavaScript, a single method call can hide a full scan. This snippet wraps an array in a \`Proxy\` that counts every element read, then asks \`includes\`; it also shows two number and sorting surprises that matter when you reason about cost and correctness:

~~~javascript
// Count how many times Array.prototype.includes reads an element.
const data = Array.from({ length: 10000 }, (_, i) => i);
let reads = 0;
const watched = new Proxy(data, {
  get(target, key) {
    if (typeof key === "string" && /^[0-9]+$/.test(key)) reads++;
    return target[key];
  },
});
console.log("includes(9999):", watched.includes(9999), "after", reads, "element reads");

const asSet = new Set(data);
console.log("Set.has(9999):", asSet.has(9999));

console.log("2 ** 53 + 1 === 2 ** 53:", 2 ** 53 + 1 === 2 ** 53);
console.log("MAX_SAFE_INTEGER:", Number.MAX_SAFE_INTEGER);
console.log("[10, 9, 1, 100].sort():", JSON.stringify([10, 9, 1, 100].sort()));
console.log("with a comparator:", JSON.stringify([10, 9, 1, 100].sort((a, b) => a - b)));
~~~

Output of \`node main.js\`:

~~~text
includes(9999): true after 10000 element reads
Set.has(9999): true
2 ** 53 + 1 === 2 ** 53: true
MAX_SAFE_INTEGER: 9007199254740991
[10, 9, 1, 100].sort(): [1,10,100,9]
with a comparator: [1,9,10,100]
~~~

\`includes\` read all 10,000 elements to find the last one: it is an O(n) scan, and so are \`indexOf\`, \`find\`, \`some\` and \`filter\`. A \`Set\` or \`Map\` answers membership without scanning; the ECMAScript specification requires them to give "access times that are sublinear on the number of elements" on average ([ECMA-262, Keyed Collections](https://tc39.es/ecma262/multipage/keyed-collections.html)), and in practice V8 implements them as hash tables ([V8 Deep Dives: Understanding Map Internals](https://itnext.io/v8-deep-dives-understanding-map-internals-45eb94a183df)), with O(1) average lookups — see [how a hash table works](/interview-question/how-does-a-hash-table-work).

The other two lines are correctness traps that interviewers like:

- \`2 ** 53 + 1 === 2 ** 53\` is \`true\`: above \`Number.MAX_SAFE_INTEGER\`, a number can no longer represent every integer. If a count could get that large, use \`BigInt\`.
- \`[10, 9, 1, 100].sort()\` gave \`[1,10,100,9]\`: without a comparator, \`sort\` compares the values as **strings**. Pass \`(a, b) => a - b\` for numbers. Either way, sorting is a comparison sort, so treat it as O(n log n).

| Looks cheap | Real cost |
| :--- | :--- |
| \`arr.includes(x)\`, \`arr.indexOf(x)\`, \`arr.find(...)\` | O(n) scan |
| \`[...arr]\`, \`arr.slice()\`, \`arr.concat(b)\` | O(n) copy |
| \`arr.sort(cmp)\` | O(n log n) |
| \`set.has(x)\`, \`map.get(k)\` | O(1) on average |
| \`arr.length\`, \`arr[i]\` | O(1) |

## 7. Example: Linear vs Binary Search

The cleanest way to *feel* the difference between O(n) and O(log n) is to answer the same question two ways. Both functions below search a sorted list for a value and count comparisons:

~~~javascript
function linearSearch(nums, target) {
  let comparisons = 0;
  for (const x of nums) {          // O(n): may look at every item
    comparisons++;
    if (x === target) return [true, comparisons];
  }
  return [false, comparisons];
}

function binarySearch(nums, target) {
  let comparisons = 0;
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {               // O(log n): halves the range each round
    comparisons++;
    const mid = Math.floor((lo + hi) / 2);   // (lo + hi) / 2 alone is a fraction
    if (nums[mid] === target) return [true, comparisons];
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return [false, comparisons];
}
~~~

\`Math.floor((lo + hi) / 2)\` is safe in JavaScript for any real array length, because the sum stays far below 2^53; the Java and C++ versions write \`lo + (hi - lo) / 2\` because their 32-bit \`int\` can overflow. Binary search has its own deep-dive page: [how binary search works and what it requires](/interview-question/how-does-binary-search-work-and-what-are-its-requirements).

The second example also shows why constants are dropped. This function makes two passes instead of one:

~~~javascript
function minAndMaxTwoPasses(nums) {
  let steps = 0;
  let lo = nums[0];
  for (const x of nums) { steps++; lo = Math.min(lo, x); }   // first pass: n steps
  let hi = nums[0];
  for (const x of nums) { steps++; hi = Math.max(hi, x); }   // second pass: n more
  return [lo, hi, steps];          // 2n steps in total, which is still O(n)
}
~~~

It takes 2n steps. Double n and it takes twice as long, exactly like a one-pass version: both are O(n).

## 8. Verified: Running the Code

Both programs are the runnable examples under "JavaScript code" on this page. They were run with \`node main.js\`.

**Example 1 — step counts for each class:**

~~~text
n=10: O(1)=1, O(log n)=3, O(n)=10, O(n log n)=30, O(n^2)=45
n=100: O(1)=1, O(log n)=6, O(n)=100, O(n log n)=600, O(n^2)=4950
n=1000: O(1)=1, O(log n)=9, O(n)=1000, O(n log n)=9000, O(n^2)=499500
doubling n from 1000 to 2000:
  O(1) grows x1.00
  O(log n) grows x1.11
  O(n) grows x2.00
  O(n log n) grows x2.22
  O(n^2) grows x4.00
~~~

How to read it: going from n = 1,000 to n = 2,000, O(1) stays put, O(log n) grows by only one step (×1.11), O(n) exactly doubles, O(n log n) slightly more than doubles, and O(n²) quadruples. That "what happens when n doubles" test is a quick way to identify a class from measurements.

**Example 2 — linear vs binary search, and two passes:**

~~~text
n=16: linear=16 comparisons, binary=5 comparisons
n=1024: linear=1024 comparisons, binary=11 comparisons
n=1048576: linear=1048576 comparisons, binary=21 comparisons
two passes over 5 items: min=1, max=9, steps=10
~~~

From 16 to 1,048,576 items, linear search went from 16 to 1,048,576 comparisons, while binary search went from 5 to 21. The two-pass min/max took 10 steps for 5 items: 2n, still linear.

## 9. Complexity of the Examples

| Function | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`constantSteps\` | O(1) | O(1) | fixed work |
| \`logSteps\` | O(log n) | O(1) | n halves each round |
| \`linearSteps\` | O(n) | O(1) | one step per item |
| \`nLogNSteps\` | O(n log n) | O(1) | n rounds of a log n loop |
| \`quadraticSteps\` | O(n²) | O(1) | n(n − 1)/2 pairs |
| linear search | O(n) worst, O(1) best | O(1) | may touch every item |
| binary search | O(log n) worst, O(1) best | O(1) | halves the range |

## 10. Edge Cases and Subtleties

- **Two inputs, two variables.** Comparing every item of a list of size n with every item of a list of size m is O(n · m), not O(n²). Do not merge variables that are independent.
- **n = 0 and n = 1.** Big-O says nothing about tiny inputs; still, the code must handle them (\`logSteps(1)\` returns 0 rounds, which is correct).
- **Big-O is not seconds.** A smaller class wins *eventually*. For small n, constant factors and memory behaviour can make the "worse" algorithm faster.
- **Logarithm base does not matter.** log₂ n and log₁₀ n differ only by a constant factor (about 3.32), so we just write O(log n).
- **Big-O of a loop depends on the loop body.** A single loop that calls an O(n) function inside is O(n²) — see the hidden-loop table above.

## Common Pitfalls

- **\`includes\` / \`indexOf\` inside a loop.** Each call is an O(n) scan, so the loop becomes O(n²). Build a \`Set\` once (O(n)) and call \`has\` instead.
- **Spreading or slicing in a loop or recursion.** \`[...arr, x]\` and \`arr.slice(1)\` copy the whole array every time; n of them cost O(n²).
- **Calling \`sort()\` without a comparator on numbers.** It sorts as strings (\`[1,10,100,9]\` above). That is a correctness bug, not a speed bug, but it shows up in complexity questions that start with "sort the array".
- **Halving with \`n / 2\`.** It produces fractions; use \`Math.floor(n / 2)\` or \`n >> 1\` (only for values below 2^31).
- **Counting past 2^53.** Plain numbers silently lose precision there; use \`BigInt\` for very large counts.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">Big-O describes how the number of steps (or memory) grows as the input size n grows, keeping only the fastest-growing term and dropping constant factors.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The ladder:</strong> <span style="color:#f0e2c8;">From fast to slow: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(1)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(log n)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(n)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(n log n)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(n^2)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(2^n)</code>. At n = 1000 I measured 1, 9, 1000, 9000 and 499,500 steps for the first five.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reading code:</strong> <span style="color:#f0e2c8;">Sequential blocks add, nested loops multiply, a loop that halves its range is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(log n)</code>, and you keep the biggest term: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3n^2 + 5n + 20</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(n^2)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. JavaScript specifics:</strong> <span style="color:#f0e2c8;">Method calls hide loops: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">includes</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">indexOf</code> and spread are O(n), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort</code> is O(n log n), while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set.has</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map.get</code> are O(1) on average.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Precision:</strong> <span style="color:#f0e2c8;">Big-O is an upper bound, usually quoted for the worst case; Theta is the tight bound and Omega the lower bound. I always give time and space.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is O(2n) different from O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Constants are dropped because both double when n doubles; my two-pass min/max takes 2n steps and is still O(n). In practice the constant can matter, but it does not change the class.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the cost of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">arr.filter(x =&gt; other.includes(x))</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n times m): <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter</code> visits n items and each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">includes</code> scans m. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const s = new Set(other)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.has(x)</code> it becomes O(n + m).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is binary search O(log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each comparison halves the remaining range, so after k steps there are n / 2^k items left; that reaches 1 when k = log2 n. I measured 21 comparisons for n = 1,048,576.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Big-O tell you which code is faster for n = 10?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It describes growth for large n. For tiny inputs a plain loop can beat a cleverer algorithm with more overhead; you measure with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">performance.now()</code> when it matters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a JavaScript object lookup O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On average, yes, in practice; but the spec only promises sublinear access for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>. For key-value data with many inserts and deletes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> is the clearer choice.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Input size (n)** | The number that measures how big the input is |
| **Time complexity** | How the step count grows as n grows |
| **Big-O notation** | Upper bound on growth, ignoring constants and smaller terms |
| **Dominant term** | The fastest-growing part of a formula; the only part kept |
| **Asymptotic analysis** | Studying behaviour as n becomes very large |
| **Logarithmic time** | Work that grows with log n, usually from halving |
| **Worst case** | Maximum steps over all inputs of size n |
| **Average case** | Expected steps under some input distribution |
| **Big-Theta / Big-Omega** | Tight bound / lower bound on growth |
| **\`Number.MAX_SAFE_INTEGER\`** | Largest integer a JS number holds exactly: 2^53 − 1 |

**Conclusion:** Big-O is a way of describing how work grows with the input, not how long one run takes. Count the steps as a formula in n, keep the biggest term, drop the constant, and you have the class. The measured numbers make the stakes concrete: at a million items, binary search needed 21 comparisons where linear search needed 1,048,576, and doubling n quadrupled the quadratic count. In JavaScript, the extra skill is spotting the loops hidden inside short-looking calls, so the Big-O you state matches the code you actually wrote.`,
        examples: [
          {
            label: "Count the steps of O(1), O(log n), O(n), O(n log n) and O(n^2) code",
            code: `// Count the basic steps each growth class takes for an input of size n.

function constantSteps(n) {
  return 1;                       // e.g. read nums[0]: one step, whatever n is
}

function logSteps(n) {
  let steps = 0;
  while (n > 1) {                 // halve the problem until one item is left
    n = Math.floor(n / 2);        // plain n / 2 would give a fraction in JS
    steps++;
  }
  return steps;
}

function linearSteps(n) {
  let steps = 0;
  for (let i = 0; i < n; i++) steps++;          // touch every item once
  return steps;
}

function nLogNSteps(n) {
  let steps = 0;
  for (let i = 0; i < n; i++) steps += logSteps(n); // n halving loops
  return steps;
}

function quadraticSteps(n) {
  let steps = 0;
  for (let i = 0; i < n; i++)                   // every pair (i, j) with i < j
    for (let j = i + 1; j < n; j++) steps++;
  return steps;
}

const CLASSES = [
  ["O(1)", constantSteps],
  ["O(log n)", logSteps],
  ["O(n)", linearSteps],
  ["O(n log n)", nLogNSteps],
  ["O(n^2)", quadraticSteps],
];

for (const n of [10, 100, 1000]) {
  const parts = CLASSES.map(([name, f]) => name + "=" + f(n));
  console.log("n=" + n + ": " + parts.join(", "));
}

console.log("doubling n from 1000 to 2000:");
for (const [name, f] of CLASSES) {
  const ratio = f(2000) / f(1000);
  console.log("  " + name + " grows x" + ratio.toFixed(2));
}`,
          },
          {
            label: "Linear vs binary search: comparisons as n grows",
            code: `// Same question, two algorithms: is \`target\` in a sorted array?
// We count comparisons instead of timing, so the numbers are the same on every machine.

function linearSearch(nums, target) {
  let comparisons = 0;
  for (const x of nums) {          // O(n): may look at every item
    comparisons++;
    if (x === target) return [true, comparisons];
  }
  return [false, comparisons];
}

function binarySearch(nums, target) {
  let comparisons = 0;
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {               // O(log n): halves the range each round
    comparisons++;
    const mid = Math.floor((lo + hi) / 2);   // (lo + hi) / 2 alone is a fraction
    if (nums[mid] === target) return [true, comparisons];
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return [false, comparisons];
}

function minAndMaxTwoPasses(nums) {
  let steps = 0;
  let lo = nums[0];
  for (const x of nums) { steps++; lo = Math.min(lo, x); }   // first pass: n steps
  let hi = nums[0];
  for (const x of nums) { steps++; hi = Math.max(hi, x); }   // second pass: n more
  return [lo, hi, steps];          // 2n steps in total, which is still O(n)
}

for (const n of [16, 1024, 1048576]) {
  const nums = Array.from({ length: n }, (_, i) => i);   // 0, 1, ..., n-1 (sorted)
  const target = n;                // absent: the worst case for both searches
  const lin = linearSearch(nums, target)[1];
  const bin = binarySearch(nums, target)[1];
  console.log("n=" + n + ": linear=" + lin + " comparisons, binary=" + bin + " comparisons");
}

const [lo, hi, steps] = minAndMaxTwoPasses([5, 3, 9, 1, 7]);
console.log("two passes over 5 items: min=" + lo + ", max=" + hi + ", steps=" + steps);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Explain Big-O notation to me as if I had never heard of it. Then look at a few loops written in Java and tell me their Big-O, and explain why we are allowed to drop constants."

**What a strong answer should cover:**
- Big-O describes how running time (or memory) **grows** as the input size n grows; it is about the shape of the growth, not seconds.
- Drop constant factors and lower-order terms: 3n² + 5n + 20 is O(n²); 2n is O(n).
- The common classes in order, with an example each: O(1) index, O(log n) binary search, O(n) one pass, O(n log n) good sorting, O(n²) all pairs, O(2ⁿ) all subsets.
- Reading code: sequential steps add, nested loops multiply, halving gives log n; Big-O is an upper bound and usually quoted for the worst case (Theta and Omega for tight and lower bounds).
- Java-specific points: \`ArrayList.contains\` is O(n) while \`HashSet.contains\` is O(1) on average, \`LinkedList.get(i)\` is O(n), and step counts or \`lo + hi\` can overflow \`int\`.

**Code / implementation expected:** Optional — a few Java methods whose loops the candidate labels O(1), O(log n), O(n), O(n²).`,
        answer: `**Target Audience:** Complete beginners preparing for coding interviews — no maths beyond multiplication assumed.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Every idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every number on this page (step counts, comparisons, overflow values) comes from actually running the Java code shown, and the **Verified** section quotes that output.

## 1. Why This Even Matters — A Story First

You are throwing a party and have two jobs. Job one: hand each guest a name badge as they arrive. Job two: make sure every guest shakes hands with every other guest.

With 10 guests, both jobs feel quick. With 1,000 guests, job one takes 1,000 badge hand-outs, but job two needs 499,500 handshakes. Nobody got slower at handing out badges or shaking hands. The difference is **how the amount of work grows when the party grows**: the badges grow in step with the guests, the handshakes grow with the guests *times* the guests.

Big-O notation is just a short way to write down that growth pattern. "Badges" is O(n), "handshakes" is O(n²). It lets two engineers compare two solutions on a whiteboard, without a stopwatch, and know which one will collapse when the input gets big.

## 2. The Core Idea in Plain Language

Pick a way to measure the input: the number of items in a list, the number of characters in a string, the number of nodes in a graph. Call it **n**. Then count the basic steps the code takes (comparisons, additions, reads) as a formula in n. Big-O keeps only the part of that formula that matters when n is huge.

📌 **Interview term: Input size (n)** — the number that measures how big the input is; complexity is always stated in terms of it (and sometimes two of them, like n and m).

📌 **Interview term: Time complexity** — how the number of basic steps an algorithm performs grows as n grows.

📌 **Interview term: Big-O notation** — a way of writing an upper bound on that growth, ignoring constant factors and smaller terms. Formally, f(n) is O(g(n)) if there are constants c and n₀ such that f(n) ≤ c · g(n) for every n ≥ n₀.

That formal line just says: "past some point, f never grows faster than g, give or take a constant multiplier". This is why we may simplify:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="Simplifying a step count to Big-O in three stages">
  <defs>
    <marker id="b01q1-arrow-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="380" y="26" text-anchor="middle">From an exact step count to a Big-O class</text>
  <rect class="d-box-muted" x="30" y="56" width="200" height="110" rx="10"/>
  <text class="d-text" x="130" y="90" text-anchor="middle">1. Count steps</text>
  <text class="d-sub" x="130" y="120" text-anchor="middle">3n² + 5n + 20</text>
  <text class="d-sub" x="130" y="146" text-anchor="middle">exact formula</text>
  <path class="d-edge" d="M 236 111 L 284 111" marker-end="url(#b01q1-arrow-a)"/>
  <rect class="d-box-muted" x="290" y="56" width="200" height="110" rx="10"/>
  <text class="d-text" x="390" y="90" text-anchor="middle">2. Keep the top term</text>
  <text class="d-sub" x="390" y="120" text-anchor="middle">3n²</text>
  <text class="d-sub" x="390" y="146" text-anchor="middle">5n + 20 is tiny later</text>
  <path class="d-edge" d="M 496 111 L 544 111" marker-end="url(#b01q1-arrow-a)"/>
  <rect class="d-box-accent" x="550" y="56" width="180" height="110" rx="10"/>
  <text class="d-text d-accent" x="640" y="90" text-anchor="middle">3. Drop the constant</text>
  <text class="d-sub" x="640" y="120" text-anchor="middle">O(n²)</text>
  <text class="d-sub" x="640" y="146" text-anchor="middle">the growth class</text>
</svg>

At n = 1,000, 3n² is 3,000,000 while 5n + 20 is 5,020: the smaller terms are less than 0.2% of the total, and their share keeps shrinking as n grows. The constant 3 does not change the shape either: double n and both n² and 3n² become four times bigger.

📌 **Interview term: Dominant term** — the fastest-growing part of the formula; it is the only part Big-O keeps.

📌 **Interview term: Asymptotic analysis** — studying behaviour as n grows towards infinity, which is exactly what Big-O, Theta and Omega describe.

## 3. The Growth Classes You Will Meet

| Big-O | Name | Typical example | Steps at n = 1,000 (measured below) |
| :--- | :--- | :--- | :--- |
| O(1) | constant | read \`nums[0]\`, a hash lookup on average | 1 |
| O(log n) | logarithmic | [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) | 9 |
| O(n) | linear | one pass over a list | 1,000 |
| O(n log n) | linearithmic | [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work) | 9,000 |
| O(n²) | quadratic | compare every pair | 499,500 |
| O(2ⁿ) | exponential | try every [subset](/interview-question/how-do-you-generate-all-subsets-of-an-array) | 2^1000: not countable |

<svg class="iq-diagram" width="100%" viewBox="0 0 760 320" role="img" aria-label="Measured steps at n equal to 1000 for five growth classes, bar length on a log scale">
  <text class="d-text" x="380" y="26" text-anchor="middle">Steps at n = 1000, bar length on a log scale</text>
  <text class="d-text" x="24" y="72">O(1)</text>
  <rect class="d-box-accent" x="150" y="54" width="10" height="26" rx="4"/>
  <text class="d-sub" x="176" y="72">1</text>
  <text class="d-text" x="24" y="124">O(log n)</text>
  <rect class="d-box-accent" x="150" y="106" width="86" height="26" rx="4"/>
  <text class="d-sub" x="252" y="124">9</text>
  <text class="d-text" x="24" y="176">O(n)</text>
  <rect class="d-box-accent" x="150" y="158" width="270" height="26" rx="4"/>
  <text class="d-sub" x="436" y="176">1,000</text>
  <text class="d-text" x="24" y="228">O(n log n)</text>
  <rect class="d-box-accent" x="150" y="210" width="356" height="26" rx="4"/>
  <text class="d-sub" x="522" y="228">9,000</text>
  <text class="d-text" x="24" y="280">O(n²)</text>
  <rect class="d-box-accent" x="150" y="262" width="513" height="26" rx="4"/>
  <text class="d-sub" x="679" y="280">499,500</text>
</svg>

Each step up the ladder is a big jump. Note that the bars use a log scale: on a normal scale the O(n²) bar would be 500 times longer than the O(n) bar.

## 4. How to Read the Big-O of Code — Five Rules

1. **A fixed number of steps is O(1)**, no matter how big n is — reading one element, one arithmetic operation, one comparison.
2. **A loop over n items is O(n)** if its body is O(1).
3. **Nested loops multiply.** A loop over n items with a loop over n items inside it is O(n · n) = O(n²). (Pairs with i < j are n(n − 1)/2, still O(n²).)
4. **Halving gives a logarithm.** If each round cuts the remaining work in half, the number of rounds is about log₂ n.
5. **Sequential blocks add, then you keep the biggest.** O(n) followed by O(n²) is O(n + n²) = O(n²).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="Halving 16 down to 1 takes four rounds">
  <defs>
    <marker id="b01q1-arrow-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="380" y="26" text-anchor="middle">Rule 4: halving 16 items reaches 1 after 4 rounds</text>
  <rect class="d-box-muted" x="30" y="60" width="100" height="64" rx="10"/>
  <text class="d-text" x="80" y="98" text-anchor="middle">16</text>
  <path class="d-edge" d="M 134 92 L 174 92" marker-end="url(#b01q1-arrow-b)"/>
  <rect class="d-box-muted" x="180" y="60" width="100" height="64" rx="10"/>
  <text class="d-text" x="230" y="98" text-anchor="middle">8</text>
  <path class="d-edge" d="M 284 92 L 324 92" marker-end="url(#b01q1-arrow-b)"/>
  <rect class="d-box-muted" x="330" y="60" width="100" height="64" rx="10"/>
  <text class="d-text" x="380" y="98" text-anchor="middle">4</text>
  <path class="d-edge" d="M 434 92 L 474 92" marker-end="url(#b01q1-arrow-b)"/>
  <rect class="d-box-muted" x="480" y="60" width="100" height="64" rx="10"/>
  <text class="d-text" x="530" y="98" text-anchor="middle">2</text>
  <path class="d-edge" d="M 584 92 L 624 92" marker-end="url(#b01q1-arrow-b)"/>
  <rect class="d-box-accent" x="630" y="60" width="100" height="64" rx="10"/>
  <text class="d-text d-accent" x="680" y="98" text-anchor="middle">1</text>
</svg>

Four arrows for 16 items, because 2⁴ = 16. For 1,048,576 items (2²⁰) it is only 20 rounds, which is why logarithmic algorithms feel almost free.

Here are the five patterns as Java functions that count their own steps. They are the core of the first runnable example:

~~~java
static long constantSteps(long n) {
    return 1;                          // e.g. read nums[0]: one step, whatever n is
}

static long logSteps(long n) {
    long steps = 0;
    while (n > 1) {                    // halve the problem until one item is left
        n /= 2;                        // integer division on long
        steps++;
    }
    return steps;
}

static long linearSteps(long n) {
    long steps = 0;
    for (long i = 0; i < n; i++) steps++;              // touch every item once
    return steps;
}

static long nLogNSteps(long n) {
    long steps = 0;
    for (long i = 0; i < n; i++) steps += logSteps(n);  // n halving loops
    return steps;
}

static long quadraticSteps(long n) {
    long steps = 0;                    // long, not int: n^2 overflows int quickly
    for (long i = 0; i < n; i++)       // every pair (i, j) with i < j
        for (long j = i + 1; j < n; j++) steps++;
    return steps;
}
~~~

A few Java details in that code:

- The counters are \`long\`, not \`int\`. An \`int\` holds at most 2,147,483,647, and an O(n²) count passes that at n of about 65,000. Java does not throw on overflow; it silently wraps around (shown in the snippet below).
- \`n /= 2\` on a \`long\` is integer division, so the halving loop counts whole halvings.
- \`Main::logSteps\` is a method reference stored in a \`LongUnaryOperator\`, which lets the driver loop over the five functions without boxing every number into a \`Long\`.

📌 **Interview term: Logarithmic time** — work that grows with log n, typically because each step halves (or divides by a constant) the remaining problem.

## 5. Worst, Best and Average Case — and O vs Θ vs Ω

The same code can take different numbers of steps on different inputs of the same size. Linear search finds the target at index 0 in one step (best case) but needs all n steps when the target is missing (worst case).

📌 **Interview term: Worst case** — the maximum number of steps over all inputs of size n. When people say "linear search is O(n)" they mean the worst case.

📌 **Interview term: Average case** — the expected number of steps over some distribution of inputs (for example, "keys are spread evenly by the hash function").

📌 **Interview term: Big-Theta (Θ) and Big-Omega (Ω)** — Θ is a tight bound (grows exactly like g, up to constants); Ω is a lower bound (grows at least like g). Big-O is only an upper bound, so technically linear search is also O(n²), but in an interview you give the tightest bound you can.

Space is measured the same way: count the extra memory as a function of n. That topic has its own page: [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 6. Hidden Loops in Java: One Call Is Not One Step

In Java, collection methods hide loops of very different cost. This snippet counts how many times \`equals\` runs for \`ArrayList.contains\` versus \`HashSet.contains\`, and shows the \`int\` overflow that bites step counters:

~~~java
import java.util.*;

public class Main {
    static int equalsCalls = 0;

    record Key(int v) {
        @Override public boolean equals(Object o) {      // count every equality check
            equalsCalls++;
            return o instanceof Key k && k.v == v;
        }
        @Override public int hashCode() { return Integer.hashCode(v); }
    }

    public static void main(String[] args) {
        List<Key> list = new ArrayList<>();
        for (int i = 0; i < 10000; i++) list.add(new Key(i));
        Set<Key> set = new HashSet<>(list);

        equalsCalls = 0;
        boolean found = list.contains(new Key(9999));   // hidden O(n) loop
        System.out.println("ArrayList.contains: " + found + " after " + equalsCalls + " equals calls");

        equalsCalls = 0;
        found = set.contains(new Key(9999));            // hash first, then usually one check
        System.out.println("HashSet.contains:   " + found + " after " + equalsCalls + " equals calls");

        int n = 100000;
        int pairsInt = n * n;                           // silently wraps around
        long pairsLong = (long) n * n;                  // widen BEFORE multiplying
        System.out.println("int n * n  = " + pairsInt);
        System.out.println("long n * n = " + pairsLong);
    }
}
~~~

Output of \`javac Main.java && java Main\`:

~~~text
ArrayList.contains: true after 10000 equals calls
HashSet.contains:   true after 1 equals calls
int n * n  = 1410065408
long n * n = 10000000000
~~~

Same question, same answer: the \`ArrayList\` called \`equals\` 10,000 times (an O(n) scan), the \`HashSet\` once (it uses \`hashCode\` to jump to a bucket, O(1) on average — see [how a hash table works](/interview-question/how-does-a-hash-table-work)). And \`100000 * 100000\` in \`int\` printed 1,410,065,408 instead of 10,000,000,000: cast to \`long\` *before* multiplying.

| Looks cheap | Real cost |
| :--- | :--- |
| \`list.contains(x)\`, \`list.indexOf(x)\`, \`list.remove(Object)\` on an \`ArrayList\` | O(n) scan |
| \`list.add(0, x)\` on an \`ArrayList\` | O(n), every element shifts |
| \`linkedList.get(i)\` | O(n), it walks from the nearer end |
| \`Collections.sort(list)\`, \`Arrays.sort(arr)\` | O(n log n) |
| \`set.contains(x)\`, \`map.get(k)\` on a \`HashSet\` / \`HashMap\` | O(1) on average |
| \`arr[i]\`, \`arrayList.get(i)\`, \`size()\` | O(1) |

## 7. Example: Linear vs Binary Search

The cleanest way to *feel* the difference between O(n) and O(log n) is to answer the same question two ways. Both functions below search a sorted list for a value and count comparisons:

~~~java
static int linearSearch(int[] nums, int target) {
    int comparisons = 0;
    for (int x : nums) {               // O(n): may look at every item
        comparisons++;
        if (x == target) return comparisons;
    }
    return comparisons;
}

static int binarySearch(int[] nums, int target) {
    int comparisons = 0;
    int lo = 0, hi = nums.length - 1;
    while (lo <= hi) {                 // O(log n): halves the range each round
        comparisons++;
        int mid = lo + (hi - lo) / 2;  // avoids int overflow of (lo + hi)
        if (nums[mid] == target) return comparisons;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return comparisons;
}
~~~

\`lo + (hi - lo) / 2\` is the Java idiom for the middle index: \`(lo + hi) / 2\` can overflow \`int\` when both indices are above about 1.07 billion. The JDK has a ready-made \`Arrays.binarySearch\` that does the same O(log n) search. Binary search has its own deep-dive page: [how binary search works and what it requires](/interview-question/how-does-binary-search-work-and-what-are-its-requirements).

The second example also shows why constants are dropped. This function makes two passes instead of one:

~~~java
static int[] minAndMaxTwoPasses(int[] nums) {
    int steps = 0;
    int lo = nums[0];
    for (int x : nums) { steps++; lo = Math.min(lo, x); }   // first pass: n steps
    int hi = nums[0];
    for (int x : nums) { steps++; hi = Math.max(hi, x); }   // second pass: n more
    return new int[]{lo, hi, steps};   // 2n steps in total, which is still O(n)
}
~~~

It takes 2n steps. Double n and it takes twice as long, exactly like a one-pass version: both are O(n).

## 8. Verified: Running the Code

Both programs are the runnable examples under "Java code" on this page. They were run with \`javac Main.java && java Main\`.

**Example 1 — step counts for each class:**

~~~text
n=10: O(1)=1, O(log n)=3, O(n)=10, O(n log n)=30, O(n^2)=45
n=100: O(1)=1, O(log n)=6, O(n)=100, O(n log n)=600, O(n^2)=4950
n=1000: O(1)=1, O(log n)=9, O(n)=1000, O(n log n)=9000, O(n^2)=499500
doubling n from 1000 to 2000:
  O(1) grows x1.00
  O(log n) grows x1.11
  O(n) grows x2.00
  O(n log n) grows x2.22
  O(n^2) grows x4.00
~~~

How to read it: going from n = 1,000 to n = 2,000, O(1) stays put, O(log n) grows by only one step (×1.11), O(n) exactly doubles, O(n log n) slightly more than doubles, and O(n²) quadruples. That "what happens when n doubles" test is a quick way to identify a class from measurements.

**Example 2 — linear vs binary search, and two passes:**

~~~text
n=16: linear=16 comparisons, binary=5 comparisons
n=1024: linear=1024 comparisons, binary=11 comparisons
n=1048576: linear=1048576 comparisons, binary=21 comparisons
two passes over 5 items: min=1, max=9, steps=10
~~~

From 16 to 1,048,576 items, linear search went from 16 to 1,048,576 comparisons, while binary search went from 5 to 21. The two-pass min/max took 10 steps for 5 items: 2n, still linear.

## 9. Complexity of the Examples

| Function | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`constantSteps\` | O(1) | O(1) | fixed work |
| \`logSteps\` | O(log n) | O(1) | n halves each round |
| \`linearSteps\` | O(n) | O(1) | one step per item |
| \`nLogNSteps\` | O(n log n) | O(1) | n rounds of a log n loop |
| \`quadraticSteps\` | O(n²) | O(1) | n(n − 1)/2 pairs |
| linear search | O(n) worst, O(1) best | O(1) | may touch every item |
| binary search | O(log n) worst, O(1) best | O(1) | halves the range |

## 10. Edge Cases and Subtleties

- **Two inputs, two variables.** Comparing every item of a list of size n with every item of a list of size m is O(n · m), not O(n²). Do not merge variables that are independent.
- **n = 0 and n = 1.** Big-O says nothing about tiny inputs; still, the code must handle them (\`logSteps(1)\` returns 0 rounds, which is correct).
- **Big-O is not seconds.** A smaller class wins *eventually*. For small n, constant factors and memory behaviour can make the "worse" algorithm faster.
- **Logarithm base does not matter.** log₂ n and log₁₀ n differ only by a constant factor (about 3.32), so we just write O(log n).
- **Big-O of a loop depends on the loop body.** A single loop that calls an O(n) function inside is O(n²) — see the hidden-loop table above.

## Common Pitfalls

- **\`int\` overflow in counts and indices.** \`n * n\` with \`int n = 100000\` printed 1,410,065,408. Use \`long\` and cast before multiplying.
- **\`(lo + hi) / 2\` in binary search.** It overflows for huge arrays; write \`lo + (hi - lo) / 2\`.
- **\`list.contains\` inside a loop.** Each call is an O(n) scan, so the loop is O(n²). Put the items in a \`HashSet\` first.
- **\`LinkedList.get(i)\` in a for loop.** Each call walks the list, so a loop over all indices is O(n²). Iterate with for-each instead.
- **Ignoring boxing.** \`List<Integer>\` stores objects, not raw ints. It does not change the Big-O, but it adds a large constant factor and memory per element compared with \`int[]\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">Big-O describes how the number of steps (or memory) grows as the input size n grows, keeping only the fastest-growing term and dropping constant factors.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The ladder:</strong> <span style="color:#f0e2c8;">From fast to slow: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(1)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(log n)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(n)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(n log n)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(n^2)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(2^n)</code>. At n = 1000 I measured 1, 9, 1000, 9000 and 499,500 steps for the first five.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reading code:</strong> <span style="color:#f0e2c8;">Sequential blocks add, nested loops multiply, a loop that halves its range is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(log n)</code>, and you keep the biggest term: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3n^2 + 5n + 20</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(n^2)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Java specifics:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList.contains</code> is O(n) but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet.contains</code> is O(1) on average, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LinkedList.get(i)</code> is O(n), and counts like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n * n</code> need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> or they wrap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Precision:</strong> <span style="color:#f0e2c8;">Big-O is an upper bound, usually quoted for the worst case; Theta is the tight bound and Omega the lower bound. I always give time and space.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is O(2n) different from O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Constants are dropped because both double when n doubles; my two-pass min/max takes 2n steps and is still O(n). In practice the constant can matter, but it does not change the class.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the Big-O of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">list.contains(x)</code> inside a loop over n items?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n) per call times n calls, so O(n^2) for an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList</code>. Building a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet</code> first costs O(n) once and makes each lookup O(1) on average.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is binary search O(log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each comparison halves the remaining range, so after k steps there are n / 2^k items left; that reaches 1 when k = log2 n. I measured 21 comparisons for n = 1,048,576.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Big-O tell you which code is faster for n = 10?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It describes growth for large n, and the JVM adds warm-up and JIT effects for small runs. To compare real speed you use a benchmark harness such as JMH.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is HashMap.get always O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On average, assuming <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hashCode</code> spreads keys well; the JavaDoc states it that way. With many colliding keys a bucket gets long; since Java 8 large buckets become balanced trees, which caps that case at O(log n) for comparable keys (JEP 180).</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Input size (n)** | The number that measures how big the input is |
| **Time complexity** | How the step count grows as n grows |
| **Big-O notation** | Upper bound on growth, ignoring constants and smaller terms |
| **Dominant term** | The fastest-growing part of a formula; the only part kept |
| **Asymptotic analysis** | Studying behaviour as n becomes very large |
| **Logarithmic time** | Work that grows with log n, usually from halving |
| **Worst case** | Maximum steps over all inputs of size n |
| **Average case** | Expected steps under some input distribution |
| **Big-Theta / Big-Omega** | Tight bound / lower bound on growth |
| **Integer overflow** | A value too big for \`int\` wraps around silently in Java |

**Conclusion:** Big-O is a way of describing how work grows with the input, not how long one run takes. Count the steps as a formula in n, keep the biggest term, drop the constant, and you have the class. The measured numbers make the stakes concrete: at a million items, binary search needed 21 comparisons where linear search needed 1,048,576, and doubling n quadrupled the quadratic count. In Java, the extra skill is spotting the loops hidden inside short-looking calls, so the Big-O you state matches the code you actually wrote.`,
        examples: [
          {
            label: "Count the steps of O(1), O(log n), O(n), O(n log n) and O(n^2) code",
            code: `import java.util.Locale;
import java.util.function.LongUnaryOperator;

public class Main {
    // Count the basic steps each growth class takes for an input of size n.

    static long constantSteps(long n) {
        return 1;                          // e.g. read nums[0]: one step, whatever n is
    }

    static long logSteps(long n) {
        long steps = 0;
        while (n > 1) {                    // halve the problem until one item is left
            n /= 2;                        // integer division on long
            steps++;
        }
        return steps;
    }

    static long linearSteps(long n) {
        long steps = 0;
        for (long i = 0; i < n; i++) steps++;              // touch every item once
        return steps;
    }

    static long nLogNSteps(long n) {
        long steps = 0;
        for (long i = 0; i < n; i++) steps += logSteps(n);  // n halving loops
        return steps;
    }

    static long quadraticSteps(long n) {
        long steps = 0;                    // long, not int: n^2 overflows int quickly
        for (long i = 0; i < n; i++)       // every pair (i, j) with i < j
            for (long j = i + 1; j < n; j++) steps++;
        return steps;
    }

    public static void main(String[] args) {
        String[] names = {"O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n^2)"};
        LongUnaryOperator[] fs = {Main::constantSteps, Main::logSteps, Main::linearSteps,
                                  Main::nLogNSteps, Main::quadraticSteps};

        for (long n : new long[]{10, 100, 1000}) {
            StringBuilder sb = new StringBuilder("n=" + n + ": ");
            for (int k = 0; k < fs.length; k++) {
                if (k > 0) sb.append(", ");
                sb.append(names[k]).append("=").append(fs[k].applyAsLong(n));
            }
            System.out.println(sb);
        }

        System.out.println("doubling n from 1000 to 2000:");
        for (int k = 0; k < fs.length; k++) {
            double ratio = (double) fs[k].applyAsLong(2000) / fs[k].applyAsLong(1000);
            System.out.println("  " + names[k] + " grows x" + String.format(Locale.US, "%.2f", ratio));
        }
    }
}`,
          },
          {
            label: "Linear vs binary search: comparisons as n grows",
            code: `public class Main {
    // Same question, two algorithms: is target in a sorted array?
    // We count comparisons instead of timing, so the numbers are the same on every machine.

    static int linearSearch(int[] nums, int target) {
        int comparisons = 0;
        for (int x : nums) {               // O(n): may look at every item
            comparisons++;
            if (x == target) return comparisons;
        }
        return comparisons;
    }

    static int binarySearch(int[] nums, int target) {
        int comparisons = 0;
        int lo = 0, hi = nums.length - 1;
        while (lo <= hi) {                 // O(log n): halves the range each round
            comparisons++;
            int mid = lo + (hi - lo) / 2;  // avoids int overflow of (lo + hi)
            if (nums[mid] == target) return comparisons;
            if (nums[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return comparisons;
    }

    static int[] minAndMaxTwoPasses(int[] nums) {
        int steps = 0;
        int lo = nums[0];
        for (int x : nums) { steps++; lo = Math.min(lo, x); }   // first pass: n steps
        int hi = nums[0];
        for (int x : nums) { steps++; hi = Math.max(hi, x); }   // second pass: n more
        return new int[]{lo, hi, steps};   // 2n steps in total, which is still O(n)
    }

    public static void main(String[] args) {
        for (int n : new int[]{16, 1024, 1048576}) {
            int[] nums = new int[n];
            for (int i = 0; i < n; i++) nums[i] = i;   // 0, 1, ..., n-1 (sorted)
            int target = n;                            // absent: worst case for both
            int lin = linearSearch(nums, target);
            int bin = binarySearch(nums, target);
            System.out.println("n=" + n + ": linear=" + lin + " comparisons, binary=" + bin + " comparisons");
        }
        int[] r = minAndMaxTwoPasses(new int[]{5, 3, 9, 1, 7});
        System.out.println("two passes over 5 items: min=" + r[0] + ", max=" + r[1] + ", steps=" + r[2]);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Explain Big-O notation to me as if I had never heard of it. Then look at a few loops written in C++ and tell me their Big-O, and explain why we are allowed to drop constants."

**What a strong answer should cover:**
- Big-O describes how running time (or memory) **grows** as the input size n grows; it is about the shape of the growth, not seconds.
- Drop constant factors and lower-order terms: 3n² + 5n + 20 is O(n²); 2n is O(n).
- The common classes in order, with an example each: O(1) index, O(log n) binary search, O(n) one pass, O(n log n) good sorting, O(n²) all pairs, O(2ⁿ) all subsets.
- Reading code: sequential steps add, nested loops multiply, halving gives log n; Big-O is an upper bound and usually quoted for the worst case (Theta and Omega for tight and lower bounds).
- C++-specific points: \`std::find\` is O(n) while \`unordered_set\`/\`unordered_map\` lookups are O(1) on average, passing a vector by value is an O(n) copy, and counts need \`long long\`.

**Code / implementation expected:** Optional — a few C++ functions whose loops the candidate labels O(1), O(log n), O(n), O(n²).`,
        answer: `**Target Audience:** Complete beginners preparing for coding interviews — no maths beyond multiplication assumed.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Every idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every number on this page (step counts, comparisons, overflow values) comes from actually running the C++ code shown, and the **Verified** section quotes that output.

## 1. Why This Even Matters — A Story First

You are throwing a party and have two jobs. Job one: hand each guest a name badge as they arrive. Job two: make sure every guest shakes hands with every other guest.

With 10 guests, both jobs feel quick. With 1,000 guests, job one takes 1,000 badge hand-outs, but job two needs 499,500 handshakes. Nobody got slower at handing out badges or shaking hands. The difference is **how the amount of work grows when the party grows**: the badges grow in step with the guests, the handshakes grow with the guests *times* the guests.

Big-O notation is just a short way to write down that growth pattern. "Badges" is O(n), "handshakes" is O(n²). It lets two engineers compare two solutions on a whiteboard, without a stopwatch, and know which one will collapse when the input gets big.

## 2. The Core Idea in Plain Language

Pick a way to measure the input: the number of items in a list, the number of characters in a string, the number of nodes in a graph. Call it **n**. Then count the basic steps the code takes (comparisons, additions, reads) as a formula in n. Big-O keeps only the part of that formula that matters when n is huge.

📌 **Interview term: Input size (n)** — the number that measures how big the input is; complexity is always stated in terms of it (and sometimes two of them, like n and m).

📌 **Interview term: Time complexity** — how the number of basic steps an algorithm performs grows as n grows.

📌 **Interview term: Big-O notation** — a way of writing an upper bound on that growth, ignoring constant factors and smaller terms. Formally, f(n) is O(g(n)) if there are constants c and n₀ such that f(n) ≤ c · g(n) for every n ≥ n₀.

That formal line just says: "past some point, f never grows faster than g, give or take a constant multiplier". This is why we may simplify:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="Simplifying a step count to Big-O in three stages">
  <defs>
    <marker id="b01q1-arrow-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="380" y="26" text-anchor="middle">From an exact step count to a Big-O class</text>
  <rect class="d-box-muted" x="30" y="56" width="200" height="110" rx="10"/>
  <text class="d-text" x="130" y="90" text-anchor="middle">1. Count steps</text>
  <text class="d-sub" x="130" y="120" text-anchor="middle">3n² + 5n + 20</text>
  <text class="d-sub" x="130" y="146" text-anchor="middle">exact formula</text>
  <path class="d-edge" d="M 236 111 L 284 111" marker-end="url(#b01q1-arrow-a)"/>
  <rect class="d-box-muted" x="290" y="56" width="200" height="110" rx="10"/>
  <text class="d-text" x="390" y="90" text-anchor="middle">2. Keep the top term</text>
  <text class="d-sub" x="390" y="120" text-anchor="middle">3n²</text>
  <text class="d-sub" x="390" y="146" text-anchor="middle">5n + 20 is tiny later</text>
  <path class="d-edge" d="M 496 111 L 544 111" marker-end="url(#b01q1-arrow-a)"/>
  <rect class="d-box-accent" x="550" y="56" width="180" height="110" rx="10"/>
  <text class="d-text d-accent" x="640" y="90" text-anchor="middle">3. Drop the constant</text>
  <text class="d-sub" x="640" y="120" text-anchor="middle">O(n²)</text>
  <text class="d-sub" x="640" y="146" text-anchor="middle">the growth class</text>
</svg>

At n = 1,000, 3n² is 3,000,000 while 5n + 20 is 5,020: the smaller terms are less than 0.2% of the total, and their share keeps shrinking as n grows. The constant 3 does not change the shape either: double n and both n² and 3n² become four times bigger.

📌 **Interview term: Dominant term** — the fastest-growing part of the formula; it is the only part Big-O keeps.

📌 **Interview term: Asymptotic analysis** — studying behaviour as n grows towards infinity, which is exactly what Big-O, Theta and Omega describe.

## 3. The Growth Classes You Will Meet

| Big-O | Name | Typical example | Steps at n = 1,000 (measured below) |
| :--- | :--- | :--- | :--- |
| O(1) | constant | read \`nums[0]\`, a hash lookup on average | 1 |
| O(log n) | logarithmic | [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) | 9 |
| O(n) | linear | one pass over a list | 1,000 |
| O(n log n) | linearithmic | [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work) | 9,000 |
| O(n²) | quadratic | compare every pair | 499,500 |
| O(2ⁿ) | exponential | try every [subset](/interview-question/how-do-you-generate-all-subsets-of-an-array) | 2^1000: not countable |

<svg class="iq-diagram" width="100%" viewBox="0 0 760 320" role="img" aria-label="Measured steps at n equal to 1000 for five growth classes, bar length on a log scale">
  <text class="d-text" x="380" y="26" text-anchor="middle">Steps at n = 1000, bar length on a log scale</text>
  <text class="d-text" x="24" y="72">O(1)</text>
  <rect class="d-box-accent" x="150" y="54" width="10" height="26" rx="4"/>
  <text class="d-sub" x="176" y="72">1</text>
  <text class="d-text" x="24" y="124">O(log n)</text>
  <rect class="d-box-accent" x="150" y="106" width="86" height="26" rx="4"/>
  <text class="d-sub" x="252" y="124">9</text>
  <text class="d-text" x="24" y="176">O(n)</text>
  <rect class="d-box-accent" x="150" y="158" width="270" height="26" rx="4"/>
  <text class="d-sub" x="436" y="176">1,000</text>
  <text class="d-text" x="24" y="228">O(n log n)</text>
  <rect class="d-box-accent" x="150" y="210" width="356" height="26" rx="4"/>
  <text class="d-sub" x="522" y="228">9,000</text>
  <text class="d-text" x="24" y="280">O(n²)</text>
  <rect class="d-box-accent" x="150" y="262" width="513" height="26" rx="4"/>
  <text class="d-sub" x="679" y="280">499,500</text>
</svg>

Each step up the ladder is a big jump. Note that the bars use a log scale: on a normal scale the O(n²) bar would be 500 times longer than the O(n) bar.

## 4. How to Read the Big-O of Code — Five Rules

1. **A fixed number of steps is O(1)**, no matter how big n is — reading one element, one arithmetic operation, one comparison.
2. **A loop over n items is O(n)** if its body is O(1).
3. **Nested loops multiply.** A loop over n items with a loop over n items inside it is O(n · n) = O(n²). (Pairs with i < j are n(n − 1)/2, still O(n²).)
4. **Halving gives a logarithm.** If each round cuts the remaining work in half, the number of rounds is about log₂ n.
5. **Sequential blocks add, then you keep the biggest.** O(n) followed by O(n²) is O(n + n²) = O(n²).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="Halving 16 down to 1 takes four rounds">
  <defs>
    <marker id="b01q1-arrow-b" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="380" y="26" text-anchor="middle">Rule 4: halving 16 items reaches 1 after 4 rounds</text>
  <rect class="d-box-muted" x="30" y="60" width="100" height="64" rx="10"/>
  <text class="d-text" x="80" y="98" text-anchor="middle">16</text>
  <path class="d-edge" d="M 134 92 L 174 92" marker-end="url(#b01q1-arrow-b)"/>
  <rect class="d-box-muted" x="180" y="60" width="100" height="64" rx="10"/>
  <text class="d-text" x="230" y="98" text-anchor="middle">8</text>
  <path class="d-edge" d="M 284 92 L 324 92" marker-end="url(#b01q1-arrow-b)"/>
  <rect class="d-box-muted" x="330" y="60" width="100" height="64" rx="10"/>
  <text class="d-text" x="380" y="98" text-anchor="middle">4</text>
  <path class="d-edge" d="M 434 92 L 474 92" marker-end="url(#b01q1-arrow-b)"/>
  <rect class="d-box-muted" x="480" y="60" width="100" height="64" rx="10"/>
  <text class="d-text" x="530" y="98" text-anchor="middle">2</text>
  <path class="d-edge" d="M 584 92 L 624 92" marker-end="url(#b01q1-arrow-b)"/>
  <rect class="d-box-accent" x="630" y="60" width="100" height="64" rx="10"/>
  <text class="d-text d-accent" x="680" y="98" text-anchor="middle">1</text>
</svg>

Four arrows for 16 items, because 2⁴ = 16. For 1,048,576 items (2²⁰) it is only 20 rounds, which is why logarithmic algorithms feel almost free.

Here are the five patterns as C++ functions that count their own steps. They are the core of the first runnable example:

~~~cpp
long long constantSteps(long long n) {
    return 1;                              // e.g. read nums[0]: one step, whatever n is
}

long long logSteps(long long n) {
    long long steps = 0;
    while (n > 1) {                        // halve the problem until one item is left
        n /= 2;
        steps++;
    }
    return steps;
}

long long linearSteps(long long n) {
    long long steps = 0;
    for (long long i = 0; i < n; i++) steps++;              // touch every item once
    return steps;
}

long long nLogNSteps(long long n) {
    long long steps = 0;
    for (long long i = 0; i < n; i++) steps += logSteps(n);  // n halving loops
    return steps;
}

long long quadraticSteps(long long n) {
    long long steps = 0;                   // long long: signed int overflow is undefined
    for (long long i = 0; i < n; i++)      // every pair (i, j) with i < j
        for (long long j = i + 1; j < n; j++) steps++;
    return steps;
}
~~~

A few C++ details in that code:

- The counters are \`long long\`. A 32-bit \`int\` tops out at 2,147,483,647, which an O(n²) count passes at n of about 65,000, and **signed integer overflow is undefined behaviour** in C++: the program is not guaranteed to wrap, crash or do anything predictable.
- \`n /= 2\` on an integer type is integer division, so the loop counts whole halvings.
- An optimising compiler (\`-O2\`) is allowed to replace a counting loop with a formula. That does not change what Big-O says about the algorithm; it describes the algorithm you wrote, not the machine code.

📌 **Interview term: Logarithmic time** — work that grows with log n, typically because each step halves (or divides by a constant) the remaining problem.

## 5. Worst, Best and Average Case — and O vs Θ vs Ω

The same code can take different numbers of steps on different inputs of the same size. Linear search finds the target at index 0 in one step (best case) but needs all n steps when the target is missing (worst case).

📌 **Interview term: Worst case** — the maximum number of steps over all inputs of size n. When people say "linear search is O(n)" they mean the worst case.

📌 **Interview term: Average case** — the expected number of steps over some distribution of inputs (for example, "keys are spread evenly by the hash function").

📌 **Interview term: Big-Theta (Θ) and Big-Omega (Ω)** — Θ is a tight bound (grows exactly like g, up to constants); Ω is a lower bound (grows at least like g). Big-O is only an upper bound, so technically linear search is also O(n²), but in an interview you give the tightest bound you can.

Space is measured the same way: count the extra memory as a function of n. That topic has its own page: [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

## 6. Hidden Loops in C++: One Call Is Not One Step

In C++, algorithm calls and container methods hide loops of very different cost. This snippet counts how many times \`operator==\` runs for \`std::find\` on a vector versus \`count\` on an \`unordered_set\`, and shows the unsigned wrap-around that breaks index arithmetic:

~~~cpp
#include <algorithm>
#include <iostream>
#include <unordered_set>
#include <vector>
using namespace std;

int eqCalls = 0;
struct Key {
    int v;
    bool operator==(const Key& o) const { eqCalls++; return v == o.v; }  // count checks
};
struct KeyHash {
    size_t operator()(const Key& k) const { return hash<int>()(k.v); }
};

int main() {
    vector<Key> vec;
    for (int i = 0; i < 10000; i++) vec.push_back({i});
    unordered_set<Key, KeyHash> set(vec.begin(), vec.end());

    eqCalls = 0;
    bool found = find(vec.begin(), vec.end(), Key{9999}) != vec.end();  // O(n) scan
    cout << boolalpha << "std::find:            " << found << " after " << eqCalls << " == calls\\n";

    eqCalls = 0;
    found = set.count(Key{9999}) > 0;                  // hash first, then a few checks
    cout << "unordered_set::count: " << found << " after " << eqCalls << " == calls\\n";

    vector<int> empty;
    cout << "empty.size() - 1 = " << empty.size() - 1 << "  (size_t is unsigned)\\n";
    return 0;
}
~~~

Output of \`g++ -std=c++17 main.cpp && ./a.out\`:

~~~text
std::find:            true after 10000 == calls
unordered_set::count: true after 1 == calls
empty.size() - 1 = 18446744073709551615  (size_t is unsigned)
~~~

\`std::find\` compared 10,000 times (an O(n) scan); the \`unordered_set\` compared once, after using the hash to jump to a bucket (O(1) on average — see [how a hash table works](/interview-question/how-does-a-hash-table-work)). And \`size() - 1\` on an empty vector is 18,446,744,073,709,551,615, because \`size_t\` is unsigned: a loop like \`for (size_t i = v.size() - 1; i >= 0; --i)\` never ends.

| Looks cheap | Real cost |
| :--- | :--- |
| \`std::find\`, \`std::count\` on a vector | O(n) scan |
| \`v.insert(v.begin(), x)\`, \`v.erase(v.begin())\` | O(n), elements shift |
| Passing \`std::vector<int>\` **by value** | O(n) copy on every call |
| \`std::sort(v.begin(), v.end())\` | O(n log n) |
| \`std::advance\` on a \`std::list\` iterator | O(k), it steps one node at a time |
| \`s.count(x)\` on an \`unordered_set\`, \`m.find(k)\` on an \`unordered_map\` | O(1) on average |
| \`v[i]\`, \`v.size()\` | O(1) |

## 7. Example: Linear vs Binary Search

The cleanest way to *feel* the difference between O(n) and O(log n) is to answer the same question two ways. Both functions below search a sorted list for a value and count comparisons:

~~~cpp
int linearSearch(const vector<int>& nums, int target) {
    int comparisons = 0;
    for (int x : nums) {                   // O(n): may look at every item
        comparisons++;
        if (x == target) return comparisons;
    }
    return comparisons;
}

int binarySearch(const vector<int>& nums, int target) {
    int comparisons = 0;
    int lo = 0, hi = (int) nums.size() - 1; // cast first: size() is unsigned
    while (lo <= hi) {                     // O(log n): halves the range each round
        comparisons++;
        int mid = lo + (hi - lo) / 2;      // avoids signed overflow of (lo + hi)
        if (nums[mid] == target) return comparisons;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return comparisons;
}
~~~

\`lo + (hi - lo) / 2\` avoids signed overflow of \`lo + hi\`, and \`(int) nums.size() - 1\` casts first because \`size()\` returns an unsigned \`size_t\`: on an empty vector, \`size() - 1\` wraps to a huge number (shown below). The standard library already has \`std::binary_search\` and \`std::lower_bound\`, both O(log n) on random-access iterators. Binary search has its own deep-dive page: [how binary search works and what it requires](/interview-question/how-does-binary-search-work-and-what-are-its-requirements).

The second example also shows why constants are dropped. This function makes two passes instead of one:

~~~cpp
// Passing by const reference avoids an O(n) copy of the vector on every call.
vector<int> minAndMaxTwoPasses(const vector<int>& nums) {
    int steps = 0;
    int lo = nums[0];
    for (int x : nums) { steps++; lo = min(lo, x); }   // first pass: n steps
    int hi = nums[0];
    for (int x : nums) { steps++; hi = max(hi, x); }   // second pass: n more
    return {lo, hi, steps};                // 2n steps in total, which is still O(n)
}
~~~

It takes 2n steps. Double n and it takes twice as long, exactly like a one-pass version: both are O(n).

## 8. Verified: Running the Code

Both programs are the runnable examples under "C++ code" on this page. They were run with \`g++ -std=c++17 main.cpp && ./a.out\`.

**Example 1 — step counts for each class:**

~~~text
n=10: O(1)=1, O(log n)=3, O(n)=10, O(n log n)=30, O(n^2)=45
n=100: O(1)=1, O(log n)=6, O(n)=100, O(n log n)=600, O(n^2)=4950
n=1000: O(1)=1, O(log n)=9, O(n)=1000, O(n log n)=9000, O(n^2)=499500
doubling n from 1000 to 2000:
  O(1) grows x1.00
  O(log n) grows x1.11
  O(n) grows x2.00
  O(n log n) grows x2.22
  O(n^2) grows x4.00
~~~

How to read it: going from n = 1,000 to n = 2,000, O(1) stays put, O(log n) grows by only one step (×1.11), O(n) exactly doubles, O(n log n) slightly more than doubles, and O(n²) quadruples. That "what happens when n doubles" test is a quick way to identify a class from measurements.

**Example 2 — linear vs binary search, and two passes:**

~~~text
n=16: linear=16 comparisons, binary=5 comparisons
n=1024: linear=1024 comparisons, binary=11 comparisons
n=1048576: linear=1048576 comparisons, binary=21 comparisons
two passes over 5 items: min=1, max=9, steps=10
~~~

From 16 to 1,048,576 items, linear search went from 16 to 1,048,576 comparisons, while binary search went from 5 to 21. The two-pass min/max took 10 steps for 5 items: 2n, still linear.

## 9. Complexity of the Examples

| Function | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| \`constantSteps\` | O(1) | O(1) | fixed work |
| \`logSteps\` | O(log n) | O(1) | n halves each round |
| \`linearSteps\` | O(n) | O(1) | one step per item |
| \`nLogNSteps\` | O(n log n) | O(1) | n rounds of a log n loop |
| \`quadraticSteps\` | O(n²) | O(1) | n(n − 1)/2 pairs |
| linear search | O(n) worst, O(1) best | O(1) | may touch every item |
| binary search | O(log n) worst, O(1) best | O(1) | halves the range |

## 10. Edge Cases and Subtleties

- **Two inputs, two variables.** Comparing every item of a list of size n with every item of a list of size m is O(n · m), not O(n²). Do not merge variables that are independent.
- **n = 0 and n = 1.** Big-O says nothing about tiny inputs; still, the code must handle them (\`logSteps(1)\` returns 0 rounds, which is correct).
- **Big-O is not seconds.** A smaller class wins *eventually*. For small n, constant factors and memory behaviour can make the "worse" algorithm faster.
- **Logarithm base does not matter.** log₂ n and log₁₀ n differ only by a constant factor (about 3.32), so we just write O(log n).
- **Big-O of a loop depends on the loop body.** A single loop that calls an O(n) function inside is O(n²) — see the hidden-loop table above.

## Common Pitfalls

- **Passing containers by value.** \`void f(std::vector<int> v)\` copies all n elements on every call; in a recursive function that turns O(n) into O(n²). Use \`const std::vector<int>&\`.
- **Signed overflow.** \`int\` counts of n² overflow near n = 65,000 and the result is undefined behaviour, not a predictable wrap. Use \`long long\`.
- **Unsigned \`size()\` arithmetic.** \`v.size() - 1\` on an empty vector is a huge number; cast to a signed type first or restructure the loop.
- **\`std::find\` or \`std::count\` inside a loop.** Each is an O(n) scan; put the values in an \`unordered_set\` first.
- **Thinking \`-O2\` changes the Big-O.** The optimiser can speed up constants or even fold a loop, but you are graded on the algorithm.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">Big-O describes how the number of steps (or memory) grows as the input size n grows, keeping only the fastest-growing term and dropping constant factors.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The ladder:</strong> <span style="color:#f0e2c8;">From fast to slow: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(1)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(log n)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(n)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(n log n)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(n^2)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(2^n)</code>. At n = 1000 I measured 1, 9, 1000, 9000 and 499,500 steps for the first five.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reading code:</strong> <span style="color:#f0e2c8;">Sequential blocks add, nested loops multiply, a loop that halves its range is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(log n)</code>, and you keep the biggest term: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3n^2 + 5n + 20</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">O(n^2)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. C++ specifics:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::find</code> is O(n), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_set::count</code> is O(1) on average, passing a vector by value is an O(n) copy, and counts need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> because signed overflow is undefined.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Precision:</strong> <span style="color:#f0e2c8;">Big-O is an upper bound, usually quoted for the worst case; Theta is the tight bound and Omega the lower bound. I always give time and space.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is O(2n) different from O(n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Constants are dropped because both double when n doubles; my two-pass min/max takes 2n steps and is still O(n). In practice the constant can matter, but it does not change the class.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the cost of calling <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">f(std::vector&lt;int&gt; v)</code> n times?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each call copies v, so O(n) per call and O(n^2) in total even if f itself is O(1). Taking <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const std::vector&lt;int&gt;&amp;</code> makes each call O(1) to set up.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is binary search O(log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each comparison halves the remaining range, so after k steps there are n / 2^k items left; that reaches 1 when k = log2 n. I measured 21 comparisons for n = 1,048,576.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Big-O tell you which code is faster for n = 10?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It describes growth for large n; for tiny inputs cache behaviour and constants dominate, and a linear scan over a small <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> often beats a tree lookup. You measure with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::chrono</code> when it matters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unordered_map::find</code> always O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Average constant, worst case linear in the size, as cppreference states, for example when many keys land in the same bucket. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::map</code> gives a guaranteed O(log n) instead.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Input size (n)** | The number that measures how big the input is |
| **Time complexity** | How the step count grows as n grows |
| **Big-O notation** | Upper bound on growth, ignoring constants and smaller terms |
| **Dominant term** | The fastest-growing part of a formula; the only part kept |
| **Asymptotic analysis** | Studying behaviour as n becomes very large |
| **Logarithmic time** | Work that grows with log n, usually from halving |
| **Worst case** | Maximum steps over all inputs of size n |
| **Average case** | Expected steps under some input distribution |
| **Big-Theta / Big-Omega** | Tight bound / lower bound on growth |
| **Undefined behaviour** | C++ code with no guaranteed result, such as signed overflow |

**Conclusion:** Big-O is a way of describing how work grows with the input, not how long one run takes. Count the steps as a formula in n, keep the biggest term, drop the constant, and you have the class. The measured numbers make the stakes concrete: at a million items, binary search needed 21 comparisons where linear search needed 1,048,576, and doubling n quadrupled the quadratic count. In C++, the extra skill is spotting the loops hidden inside short-looking calls, so the Big-O you state matches the code you actually wrote.`,
        examples: [
          {
            label: "Count the steps of O(1), O(log n), O(n), O(n log n) and O(n^2) code",
            code: `#include <cstdio>
#include <string>
#include <vector>
#include <iostream>
using namespace std;

// Count the basic steps each growth class takes for an input of size n.

long long constantSteps(long long n) {
    return 1;                              // e.g. read nums[0]: one step, whatever n is
}

long long logSteps(long long n) {
    long long steps = 0;
    while (n > 1) {                        // halve the problem until one item is left
        n /= 2;
        steps++;
    }
    return steps;
}

long long linearSteps(long long n) {
    long long steps = 0;
    for (long long i = 0; i < n; i++) steps++;              // touch every item once
    return steps;
}

long long nLogNSteps(long long n) {
    long long steps = 0;
    for (long long i = 0; i < n; i++) steps += logSteps(n);  // n halving loops
    return steps;
}

long long quadraticSteps(long long n) {
    long long steps = 0;                   // long long: signed int overflow is undefined
    for (long long i = 0; i < n; i++)      // every pair (i, j) with i < j
        for (long long j = i + 1; j < n; j++) steps++;
    return steps;
}

int main() {
    vector<string> names = {"O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n^2)"};
    vector<long long (*)(long long)> fs = {constantSteps, logSteps, linearSteps,
                                           nLogNSteps, quadraticSteps};

    for (long long n : {10LL, 100LL, 1000LL}) {
        string line = "n=" + to_string(n) + ": ";
        for (size_t k = 0; k < fs.size(); k++) {
            if (k > 0) line += ", ";
            line += names[k] + "=" + to_string(fs[k](n));
        }
        cout << line << "\\n";
    }

    cout << "doubling n from 1000 to 2000:\\n";
    for (size_t k = 0; k < fs.size(); k++) {
        double ratio = (double) fs[k](2000) / fs[k](1000);
        printf("  %s grows x%.2f\\n", names[k].c_str(), ratio);
    }
    return 0;
}`,
          },
          {
            label: "Linear vs binary search: comparisons as n grows",
            code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

// Same question, two algorithms: is target in a sorted vector?
// We count comparisons instead of timing, so the numbers are the same on every machine.

int linearSearch(const vector<int>& nums, int target) {
    int comparisons = 0;
    for (int x : nums) {                   // O(n): may look at every item
        comparisons++;
        if (x == target) return comparisons;
    }
    return comparisons;
}

int binarySearch(const vector<int>& nums, int target) {
    int comparisons = 0;
    int lo = 0, hi = (int) nums.size() - 1; // cast first: size() is unsigned
    while (lo <= hi) {                     // O(log n): halves the range each round
        comparisons++;
        int mid = lo + (hi - lo) / 2;      // avoids signed overflow of (lo + hi)
        if (nums[mid] == target) return comparisons;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return comparisons;
}

// Passing by const reference avoids an O(n) copy of the vector on every call.
vector<int> minAndMaxTwoPasses(const vector<int>& nums) {
    int steps = 0;
    int lo = nums[0];
    for (int x : nums) { steps++; lo = min(lo, x); }   // first pass: n steps
    int hi = nums[0];
    for (int x : nums) { steps++; hi = max(hi, x); }   // second pass: n more
    return {lo, hi, steps};                // 2n steps in total, which is still O(n)
}

int main() {
    for (int n : {16, 1024, 1048576}) {
        vector<int> nums(n);
        for (int i = 0; i < n; i++) nums[i] = i;       // 0, 1, ..., n-1 (sorted)
        int target = n;                                // absent: worst case for both
        cout << "n=" << n << ": linear=" << linearSearch(nums, target)
             << " comparisons, binary=" << binarySearch(nums, target) << " comparisons\\n";
    }
    vector<int> r = minAndMaxTwoPasses({5, 3, 9, 1, 7});
    cout << "two passes over 5 items: min=" << r[0] << ", max=" << r[1] << ", steps=" << r[2] << "\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the time complexity of common operations on arrays, hash maps, and balanced trees?",
    difficulty: "easy",
    seoDescription: "Big-O of array, hash map and balanced tree operations, why each cost is what it is, and the matching types in Python, JavaScript, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You will be coding in Python. Before we start, tell me the time complexity of the basic operations — access, search, insert and delete — on an array, a hash map and a balanced binary search tree, and which Python types you would use for each."

**What a strong answer should cover:**
- Dynamic array: O(1) index access, O(1) amortized append, O(n) insert or delete at the front or middle (elements shift), O(n) search, O(log n) search if sorted.
- Hash map: O(1) average insert, lookup and delete; O(n) worst case under collisions; no ordering of keys.
- Balanced BST: O(log n) insert, delete and lookup because the height stays about log n; also min, max, floor, ceiling and ordered iteration; an unbalanced BST degrades to O(n).
- Choosing: hash map for pure lookups, tree for ordered or range queries, array for index access and fast iteration.
- Python mapping: \`list\` is a dynamic array, \`dict\`/\`set\` are hash tables, and there is no built-in balanced tree (\`bisect\` on a sorted list has O(n) inserts).

**Code / implementation expected:** Optional — use \`list\`, \`dict\` and \`bisect\` correctly and state the cost of each call.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a list and a loop are; everything else is explained.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every count on this page (shifts, comparisons, tree heights) comes from running the Python code shown, and the **Verified** section quotes that output. Library guarantees are quoted from the official documentation and linked.

## 1. Why This Even Matters — A Story First

Picture three ways to store coats at a party.

- **The coat rail.** Coats hang in a row, numbered from the door. "Coat number 7" is instant: walk to the seventh hook. But squeezing a new coat in at the front means sliding every other coat along by one, and finding "the red coat" means walking the whole rail.
- **The ticket counter.** You hand in your coat and get a ticket. The attendant's ticket tells them exactly which hook to go to, so getting your coat back is instant no matter how many coats there are. But the hooks are in no useful order: "give me all coats from guests whose names start with B" means checking every hook.
- **The alphabetical cabinet.** Coats are filed by guest name in a cabinet where each drawer splits the remaining names in half. Finding any name takes a handful of "left or right?" decisions, and the coats are always in alphabetical order, so "all the Bs" or "the name just after Mia" are easy.

Those are an **array**, a **hash map** and a **balanced binary search tree**. Almost every interview solution is built from them, and choosing the right one is usually the difference between O(n²) and O(n) code. The interviewer asks this question to check that you know the price of each move *before* you build on it.

## 2. The Three Structures in Plain Language

📌 **Interview term: Array (dynamic array)** — items stored side by side in one block of memory, so item i lives at "start + i × item size". A dynamic array also grows by itself when full. In Python that is \`list\`.

📌 **Interview term: Random access** — reaching any position directly in O(1), without walking past the earlier ones. Arrays have it; linked lists do not (see [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list)).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="An array stores items side by side, so index 3 is found by arithmetic">
  <text class="d-text" x="380" y="26" text-anchor="middle">Array: slots side by side in memory</text>
  <rect class="d-box-muted" x="80" y="60" width="100" height="60" rx="6"/>
  <text class="d-text" x="130" y="96" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="200" y="60" width="100" height="60" rx="6"/>
  <text class="d-text" x="250" y="96" text-anchor="middle">20</text>
  <rect class="d-box-muted" x="320" y="60" width="100" height="60" rx="6"/>
  <text class="d-text" x="370" y="96" text-anchor="middle">30</text>
  <rect class="d-box-accent" x="440" y="60" width="100" height="60" rx="6"/>
  <text class="d-text d-accent" x="490" y="96" text-anchor="middle">40</text>
  <rect class="d-box-muted" x="560" y="60" width="100" height="60" rx="6"/>
  <text class="d-text" x="610" y="96" text-anchor="middle">50</text>
  <text class="d-sub" x="130" y="150" text-anchor="middle">index 0</text>
  <text class="d-sub" x="250" y="150" text-anchor="middle">index 1</text>
  <text class="d-sub" x="370" y="150" text-anchor="middle">index 2</text>
  <text class="d-sub d-accent" x="490" y="150" text-anchor="middle">index 3</text>
  <text class="d-sub" x="610" y="150" text-anchor="middle">index 4</text>
</svg>

Reading index 3 is one address calculation, O(1). Inserting at index 0 means moving all five values one slot to the right, O(n).

📌 **Interview term: Hash map (hash table)** — a structure that turns each key into a number with a **hash function**, uses that number to pick a **bucket**, and stores the key there. In Python that is \`dict\` / \`set\`. The full mechanics have their own page: [how a hash table works](/interview-question/how-does-a-hash-table-work).

📌 **Interview term: Collision** — two different keys landing in the same bucket. A few are normal; many in one bucket make lookups slow.

📌 **Interview term: Load factor** — entries divided by buckets. Hash tables grow (rehash into more buckets) when it gets too high, which keeps buckets short on average.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="A hash function sends each key straight to one bucket">
  <defs>
    <marker id="b01q2-arrow-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="380" y="26" text-anchor="middle">Hash map: the key picks its bucket directly</text>
  <rect class="d-box-muted" x="40" y="70" width="150" height="50" rx="8"/>
  <text class="d-text" x="115" y="100" text-anchor="middle">key: bob</text>
  <path class="d-edge" d="M 196 95 L 266 95" marker-end="url(#b01q2-arrow-a)"/>
  <rect class="d-box-accent" x="272" y="70" width="170" height="50" rx="8"/>
  <text class="d-text d-accent" x="357" y="100" text-anchor="middle">hash(bob) = 2</text>
  <path class="d-edge-accent" d="M 448 95 C 500 95 510 150 560 150" marker-end="url(#b01q2-arrow-a)"/>
  <rect class="d-box-muted" x="566" y="50" width="160" height="34" rx="6"/>
  <text class="d-sub" x="646" y="72" text-anchor="middle">bucket 0: alice</text>
  <rect class="d-box-muted" x="566" y="92" width="160" height="34" rx="6"/>
  <text class="d-sub" x="646" y="114" text-anchor="middle">bucket 1: empty</text>
  <rect class="d-box-accent" x="566" y="134" width="160" height="34" rx="6"/>
  <text class="d-sub d-accent" x="646" y="156" text-anchor="middle">bucket 2: bob</text>
  <rect class="d-box-muted" x="566" y="176" width="160" height="34" rx="6"/>
  <text class="d-sub" x="646" y="198" text-anchor="middle">bucket 3: carol</text>
</svg>

The lookup cost does not depend on how many keys exist, only on how many share bob's bucket. That is why it is O(1) **on average** and O(n) **in the worst case**.

📌 **Interview term: Binary search tree (BST)** — a tree where every node's left subtree holds smaller keys and the right subtree larger keys, so each comparison discards one side. More on the [BST page](/interview-question/what-is-a-binary-search-tree-bst).

📌 **Interview term: Height** — the number of levels from the root to the deepest leaf. Every BST operation walks one root-to-leaf path, so its cost is O(height).

📌 **Interview term: Balanced (self-balancing) tree** — a BST that restructures itself on insert and delete (red-black and AVL trees are the common designs) so its height stays O(log n). In Python: none built in.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 290" role="img" aria-label="A balanced tree of 7 keys has 3 levels while sorted inserts build a chain">
  <text class="d-text" x="200" y="26" text-anchor="middle">Balanced: 7 keys, height 3</text>
  <circle class="d-box-accent" cx="200" cy="70" r="22"/>
  <text class="d-text" x="200" y="76" text-anchor="middle">4</text>
  <path class="d-edge" d="M 186 88 L 126 132"/>
  <path class="d-edge" d="M 214 88 L 274 132"/>
  <circle class="d-box-muted" cx="114" cy="148" r="22"/>
  <text class="d-text" x="114" y="154" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="286" cy="148" r="22"/>
  <text class="d-text" x="286" y="154" text-anchor="middle">6</text>
  <path class="d-edge" d="M 104 168 L 76 208"/>
  <path class="d-edge" d="M 124 168 L 152 208"/>
  <path class="d-edge" d="M 276 168 L 248 208"/>
  <path class="d-edge" d="M 296 168 L 324 208"/>
  <circle class="d-box-muted" cx="68" cy="226" r="22"/>
  <text class="d-text" x="68" y="232" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="160" cy="226" r="22"/>
  <text class="d-text" x="160" y="232" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="240" cy="226" r="22"/>
  <text class="d-text" x="240" y="232" text-anchor="middle">5</text>
  <circle class="d-box-muted" cx="332" cy="226" r="22"/>
  <text class="d-text" x="332" y="232" text-anchor="middle">7</text>
  <text class="d-text" x="590" y="26" text-anchor="middle">Sorted inserts: a chain</text>
  <circle class="d-box-muted" cx="480" cy="62" r="20"/>
  <text class="d-text" x="480" y="68" text-anchor="middle">1</text>
  <path class="d-edge" d="M 494 76 L 518 92"/>
  <circle class="d-box-muted" cx="530" cy="104" r="20"/>
  <text class="d-text" x="530" y="110" text-anchor="middle">2</text>
  <path class="d-edge" d="M 544 118 L 568 134"/>
  <circle class="d-box-muted" cx="580" cy="146" r="20"/>
  <text class="d-text" x="580" y="152" text-anchor="middle">3</text>
  <path class="d-edge" d="M 594 160 L 618 176"/>
  <circle class="d-box-muted" cx="630" cy="188" r="20"/>
  <text class="d-text" x="630" y="194" text-anchor="middle">4</text>
  <path class="d-edge-dashed" d="M 644 202 L 672 222"/>
  <text class="d-sub" x="700" y="252" text-anchor="middle">height n</text>
</svg>

Same keys, different insert order. On the left, finding 7 takes 3 comparisons; on the right, a plain BST that received the keys in sorted order became a linked list, and finding the last key takes n comparisons. Self-balancing trees exist to prevent the right-hand shape.

## 3. The Complexity Table

This is the table to know by heart. "n" is the number of stored items.

| Operation | Dynamic array | Hash map | Balanced BST |
| :--- | :--- | :--- | :--- |
| Access by position (index i) | **O(1)** | — | O(log n) only with extra subtree sizes; usually not offered |
| Search for a value / key | O(n) unsorted, O(log n) if sorted | **O(1) average**, O(n) worst | **O(log n)** |
| Insert at the end | **O(1) amortized** | — | — |
| Insert / delete at the front or middle | O(n) — elements shift | — | — |
| Insert a key | — | **O(1) average**, O(n) worst | **O(log n)** |
| Delete a key | O(n) (find + shift) | **O(1) average**, O(n) worst | **O(log n)** |
| Min / max | O(n) unsorted, O(1) if sorted | O(n) | **O(log n)** |
| Floor / ceiling / "next larger key" | O(log n) if sorted | O(n) | **O(log n)** |
| Iterate all items in sorted order | O(n log n) to sort first | O(n log n) to sort first | **O(n)** in-order walk |
| Extra space | O(n) | O(n) | O(n) |

📌 **Interview term: Amortized O(1)** — an operation that is occasionally expensive but cheap on average over any long sequence; appending to a dynamic array is the classic case. It has its own page: [amortized analysis](/interview-question/what-is-amortized-analysis).

📌 **Interview term: Average case vs worst case** — the hash map O(1) is an average that assumes the hash spreads keys out; the worst case, with every key in one bucket, is O(n). The balanced tree's O(log n) is a worst-case guarantee.

## 4. Which Python Type Is Which

| Structure | Python type | Notes |
| :--- | :--- | :--- |
| Dynamic array | \`list\` | index O(1), \`append\` O(1) amortized, \`insert(0, x)\` / \`pop(0)\` O(n) |
| Hash map / hash set | \`dict\`, \`set\` | get, set, delete, \`in\`: O(1) average, O(n) worst |
| Balanced BST | **none in the standard library** | \`bisect\` on a sorted list gives O(log n) search but O(n) insert/delete |
| Double-ended queue | \`collections.deque\` | O(1) append and pop at both ends, O(n) indexing in the middle |
| Heap (not a sorted map) | \`heapq\` on a list | push/pop min in O(log n); see [heaps](/interview-question/what-is-a-heap-priority-queue) |

The list and dict figures match the [Python wiki TimeComplexity page](https://wiki.python.org/moin/TimeComplexity), which lists \`append\` as O(1) amortized, \`insert\` as O(n), and dict get/set/delete as O(1) average with an O(n) amortized worst case. The [Python docs](https://docs.python.org/3/library/stdtypes.html#dict) also guarantee that a dict keeps insertion order (since 3.7) — that is the order you add keys, which is not sorted order.

If you need a real ordered map in an interview, say so out loud: "Python has no TreeMap; I will use a sorted list with \`bisect\` and accept O(n) inserts, or a heap if I only need the minimum." Third-party packages exist, but most interview environments only allow the standard library.

## 5. Why Each Cost Is What It Is

**Arrays shift.** Inserting at position i means every item after i moves one slot right. This function does exactly that and counts the moves:

~~~python
def insert_at(buf, size, index, value):
    """Insert into a fixed buffer holding \`size\` items; return element shifts."""
    shifts = 0
    for j in range(size, index, -1):      # move everything after index right by one
        buf[j] = buf[j - 1]
        shifts += 1
    buf[index] = value
    return shifts
~~~

Inserting at the end moves nothing; inserting at the front moves everything. Over 1,000 front inserts that adds up to 0 + 1 + … + 999 = 499,500 shifts (measured below). In Python, \`list.insert(0, x)\` does exactly this shifting in C, so it is faster per element than this loop, but it is still O(n) per insert.

**Hash tables jump to one bucket.** A tiny chained hash table that counts how many stored keys it compares against:

~~~python
class ChainedHashTable:
    def __init__(self, buckets):
        self.buckets = [[] for _ in range(buckets)]

    def put(self, key):
        self.buckets[key % len(self.buckets)].append(key)

    def comparisons_to_find(self, key):
        compared = 0
        for k in self.buckets[key % len(self.buckets)]:   # only one bucket is scanned
            compared += 1
            if k == key:
                break
        return compared
~~~

With 100,000 keys in 100,003 buckets, each bucket holds at most one key, so a lookup compares at most once. Force all keys into one bucket and the same lookup compares against every key: that is the O(n) worst case.

**Trees cost one path.** A plain (not self-balancing) BST, plus an insert order that keeps it balanced:

~~~python
class Node:
    def __init__(self, key):
        self.key, self.left, self.right = key, None, None

def bst_insert(root, key):                # iterative: no recursion depth limit to worry about
    node = Node(key)
    if root is None:
        return node
    cur = root
    while True:
        if key < cur.key:
            if cur.left is None:
                cur.left = node
                return root
            cur = cur.left
        else:
            if cur.right is None:
                cur.right = node
                return root
            cur = cur.right

def comparisons_to_find(root, key):
    compared, cur = 0, root
    while cur is not None:
        compared += 1
        if key == cur.key:
            return compared
        cur = cur.left if key < cur.key else cur.right
    return compared

def middle_first(lo, hi, out):            # order that keeps the tree balanced
    if lo > hi:
        return
    mid = (lo + hi) // 2
    out.append(mid)
    middle_first(lo, mid - 1, out)
    middle_first(mid + 1, hi, out)
~~~

Inserting 0…999 in sorted order sends every key to the right: a chain of height 1,000. Inserting the middle key first, then the middles of each half, gives height 10, because 2¹⁰ = 1,024 ≥ 1,000. Self-balancing trees achieve that shape automatically, whatever the insert order. Tree walks that follow on from this are on the [tree traversal page](/interview-question/what-are-the-tree-traversal-methods).

## 6. Python Quirks: When a dict Stops Being O(1)

A dict is only O(1) on average *because* hashes spread keys out. This snippet makes every key hash to 42 and counts the \`==\` calls Python needs to insert n keys:

~~~python
class BadKey:
    eq_calls = 0
    def __init__(self, v):
        self.v = v
    def __hash__(self):
        return 42                       # every key collides
    def __eq__(self, other):
        BadKey.eq_calls += 1
        return self.v == other.v

for n in [100, 200, 400]:
    BadKey.eq_calls = 0
    d = {}
    for i in range(n):
        d[BadKey(i)] = i
    print(n, "colliding inserts ->", BadKey.eq_calls, "== calls")

d = {"zebra": 1, "apple": 2, "mango": 3}
print("dict keeps insertion order:", list(d))
~~~

Output of \`python3 main.py\`:

~~~text
100 colliding inserts -> 5039 == calls
200 colliding inserts -> 20089 == calls
400 colliding inserts -> 80131 == calls
dict keeps insertion order: ['zebra', 'apple', 'mango']
~~~

Doubling n from 100 to 200 to 400 multiplied the work by about 4 each time: with every key colliding, each insert compares against the keys already there, so n inserts cost O(n²) and a single lookup costs O(n). Real keys like \`int\` and \`str\` hash well, but this is exactly the "O(n) worst case" in the complexity table, and why custom \`__hash__\` methods must spread values out (hash a tuple of the fields: \`hash((self.x, self.y))\`).

The last line shows the insertion-order guarantee: \`zebra\` stays first even though it sorts last. "Ordered" for a dict means insertion order, not sorted order; for sorted output you still pay O(n log n) to sort.

## 7. The Same Operations with Python Built-ins

In an interview you use the library, not a hand-written table. Here are the same operations with the standard Python tools, with the cost of each call in the comments:

~~~python
ages = {"alice": 28, "bob": 31, "carol": 25}       # dict: a hash table
ages["dave"] = 40                                   # insert: O(1) average
del ages["dave"]                                    # delete: O(1) average
print("hash map: age of bob = " + str(ages["bob"]) + ", has dave = " + str("dave" in ages).lower())
# sorted() copies and sorts the keys: O(n log n)
print("hash map keys, sorted for printing: " + fmt(sorted(ages)))
~~~

~~~python
# Python has no built-in balanced tree. A sorted list + bisect gives O(log n)
# searches, but insert and delete still shift elements: O(n).
keys = []
for k in [30, 10, 40, 20]:
    bisect.insort(keys, k)                          # O(log n) search + O(n) shift
print("ordered keys: " + fmt(keys))

i = bisect.bisect_right(keys, 25)                   # first index with key > 25
floor_25 = keys[i - 1] if i > 0 else None           # largest key <= 25
j = bisect.bisect_left(keys, 25)                    # first index with key >= 25
ceil_25 = keys[j] if j < len(keys) else None        # smallest key >= 25
print("floor(25) = " + str(floor_25) + ", ceiling(25) = " + str(ceil_25))
print("smallest = " + str(keys[0]) + ", largest = " + str(keys[-1]))

del keys[bisect.bisect_left(keys, 10)]              # O(n): later items shift left
print("after removing 10: smallest = " + str(keys[0]) + ", size = " + str(len(keys)))
~~~

~~~python
arr = [10, 20, 30, 40]                              # list: a dynamic array
third = arr[2]                                      # index: O(1)
arr.append(50)                                      # append: O(1) amortized
print("array: element at index 2 = " + str(third) + ", after append: " + fmt(arr))
~~~

\`bisect_left\` returns the first index whose key is **>= x** and \`bisect_right\` the first index whose key is **> x**; floor and ceiling follow from those two. \`bisect.insort\` finds the spot in O(log n) and then shifts in O(n), which is the honest cost of keeping a sorted list.

## 8. Verified: Running the Code

All three programs are the runnable examples under "Python code" on this page, run with \`python3 main.py\`.

**Example 1 — array shifts, searches and hash buckets:**

~~~text
dynamic array, n=1000:
  1000 inserts at the end   -> 0 element shifts
  1000 inserts at the front -> 499500 element shifts
search among n=100000 keys (comparisons made):
  linear scan, missing key   = 100000
  binary search, missing key = 17
  hash table, missing key    = 0
  hash table, present key    = 1
hash table worst case, 1000 keys in one bucket = 1000
~~~

The front inserts cost 499,500 shifts against 0 for the end — the O(n) vs O(1) difference, repeated 1,000 times. For the search, binary search needed 17 comparisons (⌊log₂ 100,000⌋ + 1), the hash table at most 1, and the linear scan all 100,000. The last line is the hash-table worst case: 1,000 comparisons when every key shares a bucket.

**Example 2 — balanced vs unbalanced BST:**

~~~text
binary search tree with 1000 keys:
  inserted in sorted order -> height 1000, find max: 1000 comparisons
  inserted middle-first    -> height 10, find max: 10 comparisons
~~~

Same 1,000 keys, same code; only the insert order differs. Height 1,000 means O(n) per operation, height 10 means O(log n).

**Example 3 — the standard-library versions:**

~~~text
hash map: age of bob = 31, has dave = false
hash map keys, sorted for printing: [alice, bob, carol]
ordered keys: [10, 20, 30, 40]
floor(25) = 20, ceiling(25) = 30
smallest = 10, largest = 40
after removing 10: smallest = 20, size = 3
array: element at index 2 = 30, after append: [10, 20, 30, 40, 50]
~~~

## 9. How to Choose

| You need... | Use | Why |
| :--- | :--- | :--- |
| "Have I seen this before?", counting, grouping | Hash map / set | O(1) average lookups |
| Sorted order, nearest key, ranges, min and max with updates | Balanced BST | O(log n) for all of them |
| Access by position, iteration, the input itself | Array | O(1) index, compact memory |
| Only the smallest (or largest) item, repeatedly | Heap | O(log n) push/pop, O(1) peek |
| Searching a sorted array that does not change | Array + binary search | O(log n), no extra memory |

## 10. Edge Cases and Subtleties

- **"O(1)" hash map lookups still hash the key.** Hashing a string of length k costs O(k), so a lookup of a long string key is O(k), not free.
- **Amortized is not worst case.** One append that triggers a resize costs O(n). If a single operation must never be slow (real-time systems), that matters.
- **Small n.** For a handful of items, a linear scan over an array is often faster than a hash map or a tree because of memory locality and lower constants.
- **Sorted array vs tree.** If the data is built once and then only read, a sorted array with binary search beats a tree: same O(log n) search, less memory, no O(n) inserts after the build.
- **Deleting from the middle of an array** needs a search (O(n) unsorted, O(log n) sorted) *and* a shift (O(n)), so it is O(n) either way.

## Common Pitfalls

- **Assuming Python has a TreeMap.** It does not. A sorted list with \`bisect\` is O(log n) to search but O(n) to insert or delete; \`heapq\` only gives you the minimum.
- **\`x in list\` in a loop.** O(n) per check. Convert to a \`set\` once and the checks become O(1) on average.
- **Using \`list.pop(0)\` as a queue.** Each pop shifts the whole list: O(n). Use \`collections.deque.popleft()\`.
- **Mutable or badly hashed keys.** Lists cannot be dict keys (they are unhashable); a custom \`__hash__\` that returns a constant turns every dict operation into O(n), as measured above.
- **Reading "dict is ordered" as "dict is sorted".** It keeps insertion order only; sorting the keys is still O(n log n).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Arrays:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code> gives O(1) indexing and O(1) amortized <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code>, but inserting or deleting at the front or middle is O(n) because elements shift; searching an unsorted list is O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Hash maps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> give O(1) average insert, lookup and delete, O(n) worst case when keys collide, and no sorted order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Balanced trees:</strong> <span style="color:#f0e2c8;">A balanced BST gives O(log n) insert, delete, lookup, min, max, floor and ceiling, plus sorted iteration in O(n), because the height stays about log2 n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Python reality:</strong> <span style="color:#f0e2c8;">Python has no built-in balanced tree. I would use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect</code> on a sorted list (O(log n) search, O(n) insert) or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq</code> when I only need the minimum.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Choosing:</strong> <span style="color:#f0e2c8;">Hash map for pure lookups, tree when I need order or ranges, array when I need index access or tight iteration.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is a dict lookup O(1) but only on average?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The hash picks one bucket directly. If many keys share a bucket, Python has to compare against each of them; with a constant <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__hash__</code> I measured about n^2/2 equality checks for n inserts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you get floor and ceiling queries in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a sorted list and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect_right(keys, x) - 1</code> for the floor and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect_left(keys, x)</code> for the ceiling, both O(log n). Inserts into that list are O(n), which is fine if the data is mostly read.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the cost of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sorted(d)</code> on a dict with n keys?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n log n): the dict has no sorted order, so the keys are copied and sorted. Iterating the dict itself is O(n) in insertion order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">list.append</code> O(1) if the list sometimes has to grow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It over-allocates, so most appends just write into spare space; the occasional resize is O(n), but it happens rarely enough that the average per append is constant. That is amortized analysis.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is a sorted list better than a dict?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you need order: range queries, nearest key, k-th smallest. When you only ask “is it there?” the dict wins.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Array (dynamic array)** | Items side by side in memory; grows when full |
| **Random access** | Reaching any index in O(1) |
| **Hash map (hash table)** | Key → hash → bucket; O(1) average operations |
| **Collision** | Two keys in the same bucket |
| **Load factor** | Entries divided by buckets; triggers a resize when high |
| **Binary search tree (BST)** | Smaller keys left, larger keys right |
| **Height** | Levels from root to deepest leaf; BST cost is O(height) |
| **Balanced (self-balancing) tree** | BST that keeps its height O(log n), e.g. red-black or AVL |
| **Amortized O(1)** | Occasionally expensive, constant on average over a sequence |
| **Average vs worst case** | Typical cost vs the guaranteed maximum |
| **\`bisect\`** | Python module for binary search on a sorted list |

**Conclusion:** Arrays give instant access by position but pay O(n) to make room in the middle; hash maps give O(1) average lookups but no order and an O(n) worst case; balanced trees give O(log n) for everything, including the ordered queries the other two cannot answer cheaply. The runs on this page put numbers on it: 499,500 shifts versus 0, 100,000 comparisons versus 17 versus 1, and a tree of height 1,000 versus 10 from nothing but insert order. In Python, the extra step is knowing which built-in type gives you which guarantee — and saying so before you write the first line.`,
        examples: [
          {
            label: "Count shifts and comparisons: array inserts, linear vs binary search, hash buckets",
            code: `# Count the real work behind array and hash-table operations.

def insert_at(buf, size, index, value):
    """Insert into a fixed buffer holding \`size\` items; return element shifts."""
    shifts = 0
    for j in range(size, index, -1):      # move everything after index right by one
        buf[j] = buf[j - 1]
        shifts += 1
    buf[index] = value
    return shifts

class ChainedHashTable:
    def __init__(self, buckets):
        self.buckets = [[] for _ in range(buckets)]

    def put(self, key):
        self.buckets[key % len(self.buckets)].append(key)

    def comparisons_to_find(self, key):
        compared = 0
        for k in self.buckets[key % len(self.buckets)]:   # only one bucket is scanned
            compared += 1
            if k == key:
                break
        return compared


def linear_comparisons(nums, target):
    compared = 0
    for x in nums:
        compared += 1
        if x == target:
            break
    return compared

def binary_comparisons(nums, target):
    compared, lo, hi = 0, 0, len(nums) - 1
    while lo <= hi:
        compared += 1
        mid = (lo + hi) // 2
        if nums[mid] == target:
            break
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return compared

n = 1000
buf, size, front = [0] * n, 0, 0
for v in range(n):
    front += insert_at(buf, size, 0, v)
    size += 1
buf, size, back = [0] * n, 0, 0
for v in range(n):
    back += insert_at(buf, size, size, v)
    size += 1
print("dynamic array, n=1000:")
print("  1000 inserts at the end   -> " + str(back) + " element shifts")
print("  1000 inserts at the front -> " + str(front) + " element shifts")

n = 100000
nums = list(range(n))
table = ChainedHashTable(100003)
for k in nums:
    table.put(k)
print("search among n=100000 keys (comparisons made):")
print("  linear scan, missing key   = " + str(linear_comparisons(nums, n)))
print("  binary search, missing key = " + str(binary_comparisons(nums, n)))
print("  hash table, missing key    = " + str(table.comparisons_to_find(n)))
print("  hash table, present key    = " + str(table.comparisons_to_find(54321)))

bad = ChainedHashTable(100003)
for k in range(1000):
    bad.put(k * 100003)                   # every key lands in bucket 0
print("hash table worst case, 1000 keys in one bucket = " + str(bad.comparisons_to_find(1000 * 100003)))`,
          },
          {
            label: "Balanced vs unbalanced binary search tree: height and lookup cost",
            code: `# A binary search tree is only O(log n) when it stays balanced. Count it.

class Node:
    def __init__(self, key):
        self.key, self.left, self.right = key, None, None

def bst_insert(root, key):                # iterative: no recursion depth limit to worry about
    node = Node(key)
    if root is None:
        return node
    cur = root
    while True:
        if key < cur.key:
            if cur.left is None:
                cur.left = node
                return root
            cur = cur.left
        else:
            if cur.right is None:
                cur.right = node
                return root
            cur = cur.right

def comparisons_to_find(root, key):
    compared, cur = 0, root
    while cur is not None:
        compared += 1
        if key == cur.key:
            return compared
        cur = cur.left if key < cur.key else cur.right
    return compared

def middle_first(lo, hi, out):            # order that keeps the tree balanced
    if lo > hi:
        return
    mid = (lo + hi) // 2
    out.append(mid)
    middle_first(lo, mid - 1, out)
    middle_first(mid + 1, hi, out)

def height(root):
    best, stack = 0, [(root, 1)] if root else []
    while stack:
        node, d = stack.pop()
        best = max(best, d)
        for child in (node.left, node.right):
            if child:
                stack.append((child, d + 1))
    return best

sorted_root = None
for k in range(1000):
    sorted_root = bst_insert(sorted_root, k)
order = []
middle_first(0, 999, order)
balanced_root = None
for k in order:
    balanced_root = bst_insert(balanced_root, k)
print("binary search tree with 1000 keys:")
print("  inserted in sorted order -> height " + str(height(sorted_root)) + ", find max: " + str(comparisons_to_find(sorted_root, 999)) + " comparisons")
print("  inserted middle-first    -> height " + str(height(balanced_root)) + ", find max: " + str(comparisons_to_find(balanced_root, 999)) + " comparisons")`,
          },
          {
            label: "The standard-library structures and what each call costs",
            code: `# The standard Python tools for each structure, and what each call costs.
import bisect

def fmt(items):
    return "[" + ", ".join(str(x) for x in items) + "]"

ages = {"alice": 28, "bob": 31, "carol": 25}       # dict: a hash table
ages["dave"] = 40                                   # insert: O(1) average
del ages["dave"]                                    # delete: O(1) average
print("hash map: age of bob = " + str(ages["bob"]) + ", has dave = " + str("dave" in ages).lower())
# sorted() copies and sorts the keys: O(n log n)
print("hash map keys, sorted for printing: " + fmt(sorted(ages)))

# Python has no built-in balanced tree. A sorted list + bisect gives O(log n)
# searches, but insert and delete still shift elements: O(n).
keys = []
for k in [30, 10, 40, 20]:
    bisect.insort(keys, k)                          # O(log n) search + O(n) shift
print("ordered keys: " + fmt(keys))

i = bisect.bisect_right(keys, 25)                   # first index with key > 25
floor_25 = keys[i - 1] if i > 0 else None           # largest key <= 25
j = bisect.bisect_left(keys, 25)                    # first index with key >= 25
ceil_25 = keys[j] if j < len(keys) else None        # smallest key >= 25
print("floor(25) = " + str(floor_25) + ", ceiling(25) = " + str(ceil_25))
print("smallest = " + str(keys[0]) + ", largest = " + str(keys[-1]))

del keys[bisect.bisect_left(keys, 10)]              # O(n): later items shift left
print("after removing 10: smallest = " + str(keys[0]) + ", size = " + str(len(keys)))

arr = [10, 20, 30, 40]                              # list: a dynamic array
third = arr[2]                                      # index: O(1)
arr.append(50)                                      # append: O(1) amortized
print("array: element at index 2 = " + str(third) + ", after append: " + fmt(arr))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You will be coding in JavaScript. Before we start, tell me the time complexity of the basic operations — access, search, insert and delete — on an array, a hash map and a balanced binary search tree, and which JavaScript types you would use for each."

**What a strong answer should cover:**
- Dynamic array: O(1) index access, O(1) amortized append, O(n) insert or delete at the front or middle (elements shift), O(n) search, O(log n) search if sorted.
- Hash map: O(1) average insert, lookup and delete; O(n) worst case under collisions; no ordering of keys.
- Balanced BST: O(log n) insert, delete and lookup because the height stays about log n; also min, max, floor, ceiling and ordered iteration; an unbalanced BST degrades to O(n).
- Choosing: hash map for pure lookups, tree for ordered or range queries, array for index access and fast iteration.
- JavaScript mapping: \`Array\` is a dynamic array, \`Map\`/\`Set\` are hash tables (spec: sublinear access on average), plain objects stringify keys, and there is no built-in balanced tree.

**Code / implementation expected:** Optional — use \`Array\`, \`Map\` and a binary search on a sorted array, and state the cost of each call.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a list and a loop are; everything else is explained.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every count on this page (shifts, comparisons, tree heights) comes from running the JavaScript code shown, and the **Verified** section quotes that output. Library guarantees are quoted from the official documentation and linked.

## 1. Why This Even Matters — A Story First

Picture three ways to store coats at a party.

- **The coat rail.** Coats hang in a row, numbered from the door. "Coat number 7" is instant: walk to the seventh hook. But squeezing a new coat in at the front means sliding every other coat along by one, and finding "the red coat" means walking the whole rail.
- **The ticket counter.** You hand in your coat and get a ticket. The attendant's ticket tells them exactly which hook to go to, so getting your coat back is instant no matter how many coats there are. But the hooks are in no useful order: "give me all coats from guests whose names start with B" means checking every hook.
- **The alphabetical cabinet.** Coats are filed by guest name in a cabinet where each drawer splits the remaining names in half. Finding any name takes a handful of "left or right?" decisions, and the coats are always in alphabetical order, so "all the Bs" or "the name just after Mia" are easy.

Those are an **array**, a **hash map** and a **balanced binary search tree**. Almost every interview solution is built from them, and choosing the right one is usually the difference between O(n²) and O(n) code. The interviewer asks this question to check that you know the price of each move *before* you build on it.

## 2. The Three Structures in Plain Language

📌 **Interview term: Array (dynamic array)** — items stored side by side in one block of memory, so item i lives at "start + i × item size". A dynamic array also grows by itself when full. In JavaScript that is \`Array\`.

📌 **Interview term: Random access** — reaching any position directly in O(1), without walking past the earlier ones. Arrays have it; linked lists do not (see [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list)).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="An array stores items side by side, so index 3 is found by arithmetic">
  <text class="d-text" x="380" y="26" text-anchor="middle">Array: slots side by side in memory</text>
  <rect class="d-box-muted" x="80" y="60" width="100" height="60" rx="6"/>
  <text class="d-text" x="130" y="96" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="200" y="60" width="100" height="60" rx="6"/>
  <text class="d-text" x="250" y="96" text-anchor="middle">20</text>
  <rect class="d-box-muted" x="320" y="60" width="100" height="60" rx="6"/>
  <text class="d-text" x="370" y="96" text-anchor="middle">30</text>
  <rect class="d-box-accent" x="440" y="60" width="100" height="60" rx="6"/>
  <text class="d-text d-accent" x="490" y="96" text-anchor="middle">40</text>
  <rect class="d-box-muted" x="560" y="60" width="100" height="60" rx="6"/>
  <text class="d-text" x="610" y="96" text-anchor="middle">50</text>
  <text class="d-sub" x="130" y="150" text-anchor="middle">index 0</text>
  <text class="d-sub" x="250" y="150" text-anchor="middle">index 1</text>
  <text class="d-sub" x="370" y="150" text-anchor="middle">index 2</text>
  <text class="d-sub d-accent" x="490" y="150" text-anchor="middle">index 3</text>
  <text class="d-sub" x="610" y="150" text-anchor="middle">index 4</text>
</svg>

Reading index 3 is one address calculation, O(1). Inserting at index 0 means moving all five values one slot to the right, O(n).

📌 **Interview term: Hash map (hash table)** — a structure that turns each key into a number with a **hash function**, uses that number to pick a **bucket**, and stores the key there. In JavaScript that is \`Map\` / \`Set\`. The full mechanics have their own page: [how a hash table works](/interview-question/how-does-a-hash-table-work).

📌 **Interview term: Collision** — two different keys landing in the same bucket. A few are normal; many in one bucket make lookups slow.

📌 **Interview term: Load factor** — entries divided by buckets. Hash tables grow (rehash into more buckets) when it gets too high, which keeps buckets short on average.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="A hash function sends each key straight to one bucket">
  <defs>
    <marker id="b01q2-arrow-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="380" y="26" text-anchor="middle">Hash map: the key picks its bucket directly</text>
  <rect class="d-box-muted" x="40" y="70" width="150" height="50" rx="8"/>
  <text class="d-text" x="115" y="100" text-anchor="middle">key: bob</text>
  <path class="d-edge" d="M 196 95 L 266 95" marker-end="url(#b01q2-arrow-a)"/>
  <rect class="d-box-accent" x="272" y="70" width="170" height="50" rx="8"/>
  <text class="d-text d-accent" x="357" y="100" text-anchor="middle">hash(bob) = 2</text>
  <path class="d-edge-accent" d="M 448 95 C 500 95 510 150 560 150" marker-end="url(#b01q2-arrow-a)"/>
  <rect class="d-box-muted" x="566" y="50" width="160" height="34" rx="6"/>
  <text class="d-sub" x="646" y="72" text-anchor="middle">bucket 0: alice</text>
  <rect class="d-box-muted" x="566" y="92" width="160" height="34" rx="6"/>
  <text class="d-sub" x="646" y="114" text-anchor="middle">bucket 1: empty</text>
  <rect class="d-box-accent" x="566" y="134" width="160" height="34" rx="6"/>
  <text class="d-sub d-accent" x="646" y="156" text-anchor="middle">bucket 2: bob</text>
  <rect class="d-box-muted" x="566" y="176" width="160" height="34" rx="6"/>
  <text class="d-sub" x="646" y="198" text-anchor="middle">bucket 3: carol</text>
</svg>

The lookup cost does not depend on how many keys exist, only on how many share bob's bucket. That is why it is O(1) **on average** and O(n) **in the worst case**.

📌 **Interview term: Binary search tree (BST)** — a tree where every node's left subtree holds smaller keys and the right subtree larger keys, so each comparison discards one side. More on the [BST page](/interview-question/what-is-a-binary-search-tree-bst).

📌 **Interview term: Height** — the number of levels from the root to the deepest leaf. Every BST operation walks one root-to-leaf path, so its cost is O(height).

📌 **Interview term: Balanced (self-balancing) tree** — a BST that restructures itself on insert and delete (red-black and AVL trees are the common designs) so its height stays O(log n). In JavaScript: none built in.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 290" role="img" aria-label="A balanced tree of 7 keys has 3 levels while sorted inserts build a chain">
  <text class="d-text" x="200" y="26" text-anchor="middle">Balanced: 7 keys, height 3</text>
  <circle class="d-box-accent" cx="200" cy="70" r="22"/>
  <text class="d-text" x="200" y="76" text-anchor="middle">4</text>
  <path class="d-edge" d="M 186 88 L 126 132"/>
  <path class="d-edge" d="M 214 88 L 274 132"/>
  <circle class="d-box-muted" cx="114" cy="148" r="22"/>
  <text class="d-text" x="114" y="154" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="286" cy="148" r="22"/>
  <text class="d-text" x="286" y="154" text-anchor="middle">6</text>
  <path class="d-edge" d="M 104 168 L 76 208"/>
  <path class="d-edge" d="M 124 168 L 152 208"/>
  <path class="d-edge" d="M 276 168 L 248 208"/>
  <path class="d-edge" d="M 296 168 L 324 208"/>
  <circle class="d-box-muted" cx="68" cy="226" r="22"/>
  <text class="d-text" x="68" y="232" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="160" cy="226" r="22"/>
  <text class="d-text" x="160" y="232" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="240" cy="226" r="22"/>
  <text class="d-text" x="240" y="232" text-anchor="middle">5</text>
  <circle class="d-box-muted" cx="332" cy="226" r="22"/>
  <text class="d-text" x="332" y="232" text-anchor="middle">7</text>
  <text class="d-text" x="590" y="26" text-anchor="middle">Sorted inserts: a chain</text>
  <circle class="d-box-muted" cx="480" cy="62" r="20"/>
  <text class="d-text" x="480" y="68" text-anchor="middle">1</text>
  <path class="d-edge" d="M 494 76 L 518 92"/>
  <circle class="d-box-muted" cx="530" cy="104" r="20"/>
  <text class="d-text" x="530" y="110" text-anchor="middle">2</text>
  <path class="d-edge" d="M 544 118 L 568 134"/>
  <circle class="d-box-muted" cx="580" cy="146" r="20"/>
  <text class="d-text" x="580" y="152" text-anchor="middle">3</text>
  <path class="d-edge" d="M 594 160 L 618 176"/>
  <circle class="d-box-muted" cx="630" cy="188" r="20"/>
  <text class="d-text" x="630" y="194" text-anchor="middle">4</text>
  <path class="d-edge-dashed" d="M 644 202 L 672 222"/>
  <text class="d-sub" x="700" y="252" text-anchor="middle">height n</text>
</svg>

Same keys, different insert order. On the left, finding 7 takes 3 comparisons; on the right, a plain BST that received the keys in sorted order became a linked list, and finding the last key takes n comparisons. Self-balancing trees exist to prevent the right-hand shape.

## 3. The Complexity Table

This is the table to know by heart. "n" is the number of stored items.

| Operation | Dynamic array | Hash map | Balanced BST |
| :--- | :--- | :--- | :--- |
| Access by position (index i) | **O(1)** | — | O(log n) only with extra subtree sizes; usually not offered |
| Search for a value / key | O(n) unsorted, O(log n) if sorted | **O(1) average**, O(n) worst | **O(log n)** |
| Insert at the end | **O(1) amortized** | — | — |
| Insert / delete at the front or middle | O(n) — elements shift | — | — |
| Insert a key | — | **O(1) average**, O(n) worst | **O(log n)** |
| Delete a key | O(n) (find + shift) | **O(1) average**, O(n) worst | **O(log n)** |
| Min / max | O(n) unsorted, O(1) if sorted | O(n) | **O(log n)** |
| Floor / ceiling / "next larger key" | O(log n) if sorted | O(n) | **O(log n)** |
| Iterate all items in sorted order | O(n log n) to sort first | O(n log n) to sort first | **O(n)** in-order walk |
| Extra space | O(n) | O(n) | O(n) |

📌 **Interview term: Amortized O(1)** — an operation that is occasionally expensive but cheap on average over any long sequence; appending to a dynamic array is the classic case. It has its own page: [amortized analysis](/interview-question/what-is-amortized-analysis).

📌 **Interview term: Average case vs worst case** — the hash map O(1) is an average that assumes the hash spreads keys out; the worst case, with every key in one bucket, is O(n). The balanced tree's O(log n) is a worst-case guarantee.

## 4. Which JavaScript Type Is Which

| Structure | JavaScript type | Notes |
| :--- | :--- | :--- |
| Dynamic array | \`Array\` | index O(1), \`push\`/\`pop\` O(1) amortized, \`unshift\`/\`shift\`/\`splice\` in the middle O(n) |
| Hash map / hash set | \`Map\`, \`Set\` | \`get\`, \`set\`, \`has\`, \`delete\`: O(1) on average; any value can be a key |
| Plain object as a map | \`{}\` | keys become strings; integer-like keys are reordered (shown below) |
| Balanced BST | **none built in** | sorted array + binary search: O(log n) search, O(n) insert/delete |
| Heap | none built in | write one (about 30 lines); see [heaps](/interview-question/what-is-a-heap-priority-queue) |

The ECMAScript specification requires \`Map\` and \`Set\` to provide "access times that are sublinear on the number of elements in the collection" on average ([ECMA-262, Keyed Collections](https://tc39.es/ecma262/multipage/keyed-collections.html)); V8 meets that with hash tables ([V8 Deep Dives: Understanding Map Internals](https://itnext.io/v8-deep-dives-understanding-map-internals-45eb94a183df)). The spec does not state complexities for \`Array\` at all; the figures in the table are the standard model interviewers use for a dense array.

If you need an ordered map in an interview, say so: "JavaScript has no TreeMap; I will keep a sorted array with binary search and accept O(n) inserts, or write a heap if I only need the minimum."

## 5. Why Each Cost Is What It Is

**Arrays shift.** Inserting at position i means every item after i moves one slot right. This function does exactly that and counts the moves:

~~~javascript
function insertAt(buf, size, index, value) {
  // Insert into a fixed buffer holding \`size\` items; return element shifts.
  let shifts = 0;
  for (let j = size; j > index; j--) {   // move everything after index right by one
    buf[j] = buf[j - 1];
    shifts++;
  }
  buf[index] = value;
  return shifts;
}
~~~

Inserting at the end moves nothing; inserting at the front moves everything. Over 1,000 front inserts that adds up to 0 + 1 + … + 999 = 499,500 shifts (measured below). In JavaScript, \`arr.splice(0, 0, x)\` and \`arr.unshift(x)\` have to do the same shifting, so treat them as O(n) per call.

**Hash tables jump to one bucket.** A tiny chained hash table that counts how many stored keys it compares against:

~~~javascript
class ChainedHashTable {
  constructor(buckets) {
    this.buckets = Array.from({ length: buckets }, () => []);
  }
  put(key) {
    this.buckets[key % this.buckets.length].push(key);
  }
  comparisonsToFind(key) {
    let compared = 0;
    for (const k of this.buckets[key % this.buckets.length]) {  // one bucket only
      compared++;
      if (k === key) break;
    }
    return compared;
  }
}
~~~

With 100,000 keys in 100,003 buckets, each bucket holds at most one key, so a lookup compares at most once. Force all keys into one bucket and the same lookup compares against every key: that is the O(n) worst case.

**Trees cost one path.** A plain (not self-balancing) BST, plus an insert order that keeps it balanced:

~~~javascript
class Node {
  constructor(key) {
    this.key = key;
    this.left = null;
    this.right = null;
  }
}

function bstInsert(root, key) {           // iterative: no call-stack depth to worry about
  const node = new Node(key);
  if (root === null) return node;
  let cur = root;
  while (true) {
    if (key < cur.key) {
      if (cur.left === null) { cur.left = node; return root; }
      cur = cur.left;
    } else {
      if (cur.right === null) { cur.right = node; return root; }
      cur = cur.right;
    }
  }
}

function comparisonsToFind(root, key) {
  let compared = 0, cur = root;
  while (cur !== null) {
    compared++;
    if (key === cur.key) return compared;
    cur = key < cur.key ? cur.left : cur.right;
  }
  return compared;
}

function middleFirst(lo, hi, out) {       // order that keeps the tree balanced
  if (lo > hi) return;
  const mid = Math.floor((lo + hi) / 2);
  out.push(mid);
  middleFirst(lo, mid - 1, out);
  middleFirst(mid + 1, hi, out);
}
~~~

Inserting 0…999 in sorted order sends every key to the right: a chain of height 1,000. Inserting the middle key first, then the middles of each half, gives height 10, because 2¹⁰ = 1,024 ≥ 1,000. Self-balancing trees achieve that shape automatically, whatever the insert order. Tree walks that follow on from this are on the [tree traversal page](/interview-question/what-are-the-tree-traversal-methods).

## 6. JavaScript Quirks: Map vs Plain Object

Both \`Map\` and plain objects are used as hash maps, but they behave differently in ways that bite in interviews:

~~~javascript
const obj = { b: 1, 2: "x", a: 1, 1: "y" };
console.log("Object.keys order:", JSON.stringify(Object.keys(obj)));

const map = new Map([["b", 1], [2, "x"], ["a", 1], [1, "y"]]);
console.log("Map keys order:   ", JSON.stringify([...map.keys()]));

const k1 = { id: 1 }, k2 = { id: 1 };
const byObject = new Map([[k1, "first"]]);
console.log("Map with object keys, same contents:", byObject.get(k2), "| same object:", byObject.get(k1));

const plain = {};
plain[k1] = "first";
console.log("plain object turns the key into a string:", JSON.stringify(Object.keys(plain)));
~~~

Output of \`node main.js\`:

~~~text
Object.keys order: ["1","2","b","a"]
Map keys order:    ["b",2,"a",1]
Map with object keys, same contents: undefined | same object: first
plain object turns the key into a string: ["[object Object]"]
~~~

- **Order.** \`Object.keys\` put the integer-like keys \`"1"\` and \`"2"\` first, in ascending order, then the string keys in insertion order. A \`Map\` keeps pure insertion order, and keeps \`2\` as a number.
- **Key type.** A plain object turns every key into a string, so an object key becomes \`"[object Object]"\` and all object keys collide on that one name. A \`Map\` compares object keys by identity: \`k2\` has the same contents as \`k1\` but is a different object, so \`get(k2)\` is \`undefined\`.
- **Cost.** Both give O(1) average lookups in practice, but \`Map\` is the clearer choice for a dictionary that grows and shrinks, and \`map.size\` is O(1) while \`Object.keys(obj).length\` builds an array: O(n).

None of these is "ordered" in the sorted sense: sorting keys is still O(n log n).

## 7. The Same Operations with JavaScript Built-ins

In an interview you use the library, not a hand-written table. Here are the same operations with the standard JavaScript tools, with the cost of each call in the comments:

~~~javascript
const ages = new Map([["alice", 28], ["bob", 31], ["carol", 25]]);  // a hash table
ages.set("dave", 40);                              // insert: O(1) average
ages.delete("dave");                               // delete: O(1) average
console.log("hash map: age of bob = " + ages.get("bob") + ", has dave = " + ages.has("dave"));
console.log("hash map keys, sorted for printing: " + fmt([...ages.keys()].sort()));
~~~

~~~javascript
// JavaScript has no built-in balanced tree. A sorted array + binary search gives
// O(log n) searches, but splice still shifts elements: O(n).
function lowerBound(a, x) {                        // first index with a[i] >= x
  let lo = 0, hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (a[mid] < x) lo = mid + 1; else hi = mid;
  }
  return lo;
}
function upperBound(a, x) {                        // first index with a[i] > x
  let lo = 0, hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (a[mid] <= x) lo = mid + 1; else hi = mid;
  }
  return lo;
}

const keys = [];
for (const k of [30, 10, 40, 20]) keys.splice(lowerBound(keys, k), 0, k);  // O(n) shift
console.log("ordered keys: " + fmt(keys));

const i = upperBound(keys, 25);
const floor25 = i > 0 ? keys[i - 1] : null;        // largest key <= 25
const j = lowerBound(keys, 25);
const ceil25 = j < keys.length ? keys[j] : null;   // smallest key >= 25
console.log("floor(25) = " + floor25 + ", ceiling(25) = " + ceil25);
console.log("smallest = " + keys[0] + ", largest = " + keys[keys.length - 1]);

keys.splice(lowerBound(keys, 10), 1);              // O(n): later items shift left
console.log("after removing 10: smallest = " + keys[0] + ", size = " + keys.length);
~~~

~~~javascript
const arr = [10, 20, 30, 40];                      // Array: a dynamic array
const third = arr[2];                              // index: O(1)
arr.push(50);                                      // append: O(1) amortized
console.log("array: element at index 2 = " + third + ", after append: " + fmt(arr));
~~~

\`lowerBound\` returns the first index whose value is **>= x** and \`upperBound\` the first whose value is **> x**; floor and ceiling follow. \`(lo + hi) >>> 1\` is an unsigned shift that halves the sum as a whole number (safe for array lengths). \`splice\` at the found position is the O(n) part. Also note \`[...ages.keys()].sort()\` sorts strings correctly by default, but numbers would need a comparator.

## 8. Verified: Running the Code

All three programs are the runnable examples under "JavaScript code" on this page, run with \`node main.js\`.

**Example 1 — array shifts, searches and hash buckets:**

~~~text
dynamic array, n=1000:
  1000 inserts at the end   -> 0 element shifts
  1000 inserts at the front -> 499500 element shifts
search among n=100000 keys (comparisons made):
  linear scan, missing key   = 100000
  binary search, missing key = 17
  hash table, missing key    = 0
  hash table, present key    = 1
hash table worst case, 1000 keys in one bucket = 1000
~~~

The front inserts cost 499,500 shifts against 0 for the end — the O(n) vs O(1) difference, repeated 1,000 times. For the search, binary search needed 17 comparisons (⌊log₂ 100,000⌋ + 1), the hash table at most 1, and the linear scan all 100,000. The last line is the hash-table worst case: 1,000 comparisons when every key shares a bucket.

**Example 2 — balanced vs unbalanced BST:**

~~~text
binary search tree with 1000 keys:
  inserted in sorted order -> height 1000, find max: 1000 comparisons
  inserted middle-first    -> height 10, find max: 10 comparisons
~~~

Same 1,000 keys, same code; only the insert order differs. Height 1,000 means O(n) per operation, height 10 means O(log n).

**Example 3 — the standard-library versions:**

~~~text
hash map: age of bob = 31, has dave = false
hash map keys, sorted for printing: [alice, bob, carol]
ordered keys: [10, 20, 30, 40]
floor(25) = 20, ceiling(25) = 30
smallest = 10, largest = 40
after removing 10: smallest = 20, size = 3
array: element at index 2 = 30, after append: [10, 20, 30, 40, 50]
~~~

## 9. How to Choose

| You need... | Use | Why |
| :--- | :--- | :--- |
| "Have I seen this before?", counting, grouping | Hash map / set | O(1) average lookups |
| Sorted order, nearest key, ranges, min and max with updates | Balanced BST | O(log n) for all of them |
| Access by position, iteration, the input itself | Array | O(1) index, compact memory |
| Only the smallest (or largest) item, repeatedly | Heap | O(log n) push/pop, O(1) peek |
| Searching a sorted array that does not change | Array + binary search | O(log n), no extra memory |

## 10. Edge Cases and Subtleties

- **"O(1)" hash map lookups still hash the key.** Hashing a string of length k costs O(k), so a lookup of a long string key is O(k), not free.
- **Amortized is not worst case.** One append that triggers a resize costs O(n). If a single operation must never be slow (real-time systems), that matters.
- **Small n.** For a handful of items, a linear scan over an array is often faster than a hash map or a tree because of memory locality and lower constants.
- **Sorted array vs tree.** If the data is built once and then only read, a sorted array with binary search beats a tree: same O(log n) search, less memory, no O(n) inserts after the build.
- **Deleting from the middle of an array** needs a search (O(n) unsorted, O(log n) sorted) *and* a shift (O(n)), so it is O(n) either way.

## Common Pitfalls

- **Assuming JavaScript has a TreeMap.** It does not. A sorted array is O(log n) to search but O(n) to insert or delete with \`splice\`.
- **Using \`shift()\` on a large array as a queue.** Each call has to move the rest of the elements; keep a head index instead, or use a linked structure.
- **Using a plain object with object keys.** Every object key becomes \`"[object Object]"\`; use \`Map\`.
- **Counting entries with \`Object.keys(obj).length\` in a loop.** That builds an array each time (O(n)); \`map.size\` is O(1).
- **Expecting \`Map\` to be sorted.** It keeps insertion order; sort the keys (O(n log n)) when you need sorted output.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Arrays:</strong> <span style="color:#f0e2c8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array</code> gives O(1) indexing and O(1) amortized <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code>, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unshift</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code> in the middle are O(n) because elements shift; searching is O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Hash maps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> give O(1) average <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">delete</code>, O(n) worst case under heavy collisions, and insertion order, not sorted order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Balanced trees:</strong> <span style="color:#f0e2c8;">A balanced BST gives O(log n) insert, delete, lookup, min, max, floor and ceiling, plus sorted iteration in O(n), because the height stays about log2 n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. JavaScript reality:</strong> <span style="color:#f0e2c8;">There is no built-in balanced tree or heap. I would use a sorted array with binary search (O(log n) search, O(n) insert) or write a small heap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Choosing:</strong> <span style="color:#f0e2c8;">Map for pure lookups, a tree when I need order or ranges, an array when I need index access or tight iteration.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Map or plain object for counting words?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>: keys keep their type, insertion order is plain, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code> is O(1), and there is no clash with inherited names like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">constructor</code>. Both are O(1) average per update.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you do floor and ceiling queries in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a sorted array and binary search for the first index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;= x</code> (ceiling) and the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt; x</code> minus one (floor), both O(log n). Inserting into it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">splice</code> is O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">arr.includes(x)</code> O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it is a linear scan, O(n). Put the values in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> once (O(n)) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has</code> is O(1) on average.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">push</code> O(1) if the array sometimes has to grow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Engines keep spare capacity, so most pushes write into free space and an occasional O(n) grow is spread across many pushes. That is amortized O(1); the spec itself does not promise it, but it is the expected model.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the spec actually guarantee for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only that access is sublinear in the number of elements on average. In practice V8 uses a hash table, so O(1) average is the right interview answer.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Array (dynamic array)** | Items side by side in memory; grows when full |
| **Random access** | Reaching any index in O(1) |
| **Hash map (hash table)** | Key → hash → bucket; O(1) average operations |
| **Collision** | Two keys in the same bucket |
| **Load factor** | Entries divided by buckets; triggers a resize when high |
| **Binary search tree (BST)** | Smaller keys left, larger keys right |
| **Height** | Levels from root to deepest leaf; BST cost is O(height) |
| **Balanced (self-balancing) tree** | BST that keeps its height O(log n), e.g. red-black or AVL |
| **Amortized O(1)** | Occasionally expensive, constant on average over a sequence |
| **Average vs worst case** | Typical cost vs the guaranteed maximum |
| **Sublinear** | Grows slower than n; the ECMAScript promise for \`Map\` access |

**Conclusion:** Arrays give instant access by position but pay O(n) to make room in the middle; hash maps give O(1) average lookups but no order and an O(n) worst case; balanced trees give O(log n) for everything, including the ordered queries the other two cannot answer cheaply. The runs on this page put numbers on it: 499,500 shifts versus 0, 100,000 comparisons versus 17 versus 1, and a tree of height 1,000 versus 10 from nothing but insert order. In JavaScript, the extra step is knowing which built-in type gives you which guarantee — and saying so before you write the first line.`,
        examples: [
          {
            label: "Count shifts and comparisons: array inserts, linear vs binary search, hash buckets",
            code: `// Count the real work behind array and hash-table operations.

function insertAt(buf, size, index, value) {
  // Insert into a fixed buffer holding \`size\` items; return element shifts.
  let shifts = 0;
  for (let j = size; j > index; j--) {   // move everything after index right by one
    buf[j] = buf[j - 1];
    shifts++;
  }
  buf[index] = value;
  return shifts;
}

class ChainedHashTable {
  constructor(buckets) {
    this.buckets = Array.from({ length: buckets }, () => []);
  }
  put(key) {
    this.buckets[key % this.buckets.length].push(key);
  }
  comparisonsToFind(key) {
    let compared = 0;
    for (const k of this.buckets[key % this.buckets.length]) {  // one bucket only
      compared++;
      if (k === key) break;
    }
    return compared;
  }
}

function linearComparisons(nums, target) {
  let compared = 0;
  for (const x of nums) {
    compared++;
    if (x === target) break;
  }
  return compared;
}

function binaryComparisons(nums, target) {
  let compared = 0, lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    compared++;
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] === target) break;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return compared;
}

let n = 1000;
let buf = new Array(n).fill(0), size = 0, front = 0;
for (let v = 0; v < n; v++) { front += insertAt(buf, size, 0, v); size++; }
buf = new Array(n).fill(0); size = 0;
let back = 0;
for (let v = 0; v < n; v++) { back += insertAt(buf, size, size, v); size++; }
console.log("dynamic array, n=1000:");
console.log("  1000 inserts at the end   -> " + back + " element shifts");
console.log("  1000 inserts at the front -> " + front + " element shifts");

n = 100000;
const nums = Array.from({ length: n }, (_, i) => i);
const table = new ChainedHashTable(100003);
for (const k of nums) table.put(k);
console.log("search among n=100000 keys (comparisons made):");
console.log("  linear scan, missing key   = " + linearComparisons(nums, n));
console.log("  binary search, missing key = " + binaryComparisons(nums, n));
console.log("  hash table, missing key    = " + table.comparisonsToFind(n));
console.log("  hash table, present key    = " + table.comparisonsToFind(54321));

const bad = new ChainedHashTable(100003);
for (let k = 0; k < 1000; k++) bad.put(k * 100003);   // every key lands in bucket 0
console.log("hash table worst case, 1000 keys in one bucket = " + bad.comparisonsToFind(1000 * 100003));`,
          },
          {
            label: "Balanced vs unbalanced binary search tree: height and lookup cost",
            code: `// A binary search tree is only O(log n) when it stays balanced. Count it.

class Node {
  constructor(key) {
    this.key = key;
    this.left = null;
    this.right = null;
  }
}

function bstInsert(root, key) {           // iterative: no call-stack depth to worry about
  const node = new Node(key);
  if (root === null) return node;
  let cur = root;
  while (true) {
    if (key < cur.key) {
      if (cur.left === null) { cur.left = node; return root; }
      cur = cur.left;
    } else {
      if (cur.right === null) { cur.right = node; return root; }
      cur = cur.right;
    }
  }
}

function comparisonsToFind(root, key) {
  let compared = 0, cur = root;
  while (cur !== null) {
    compared++;
    if (key === cur.key) return compared;
    cur = key < cur.key ? cur.left : cur.right;
  }
  return compared;
}

function middleFirst(lo, hi, out) {       // order that keeps the tree balanced
  if (lo > hi) return;
  const mid = Math.floor((lo + hi) / 2);
  out.push(mid);
  middleFirst(lo, mid - 1, out);
  middleFirst(mid + 1, hi, out);
}

function height(root) {
  let best = 0;
  const stack = root ? [[root, 1]] : [];
  while (stack.length) {
    const [node, d] = stack.pop();
    best = Math.max(best, d);
    for (const child of [node.left, node.right]) if (child) stack.push([child, d + 1]);
  }
  return best;
}

let sortedRoot = null;
for (let k = 0; k < 1000; k++) sortedRoot = bstInsert(sortedRoot, k);
const order = [];
middleFirst(0, 999, order);
let balancedRoot = null;
for (const k of order) balancedRoot = bstInsert(balancedRoot, k);
console.log("binary search tree with 1000 keys:");
console.log("  inserted in sorted order -> height " + height(sortedRoot) + ", find max: " + comparisonsToFind(sortedRoot, 999) + " comparisons");
console.log("  inserted middle-first    -> height " + height(balancedRoot) + ", find max: " + comparisonsToFind(balancedRoot, 999) + " comparisons");`,
          },
          {
            label: "The standard-library structures and what each call costs",
            code: `// The standard JavaScript tools for each structure, and what each call costs.

function fmt(items) {
  return "[" + items.join(", ") + "]";
}

const ages = new Map([["alice", 28], ["bob", 31], ["carol", 25]]);  // a hash table
ages.set("dave", 40);                              // insert: O(1) average
ages.delete("dave");                               // delete: O(1) average
console.log("hash map: age of bob = " + ages.get("bob") + ", has dave = " + ages.has("dave"));
console.log("hash map keys, sorted for printing: " + fmt([...ages.keys()].sort()));

// JavaScript has no built-in balanced tree. A sorted array + binary search gives
// O(log n) searches, but splice still shifts elements: O(n).
function lowerBound(a, x) {                        // first index with a[i] >= x
  let lo = 0, hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (a[mid] < x) lo = mid + 1; else hi = mid;
  }
  return lo;
}
function upperBound(a, x) {                        // first index with a[i] > x
  let lo = 0, hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (a[mid] <= x) lo = mid + 1; else hi = mid;
  }
  return lo;
}

const keys = [];
for (const k of [30, 10, 40, 20]) keys.splice(lowerBound(keys, k), 0, k);  // O(n) shift
console.log("ordered keys: " + fmt(keys));

const i = upperBound(keys, 25);
const floor25 = i > 0 ? keys[i - 1] : null;        // largest key <= 25
const j = lowerBound(keys, 25);
const ceil25 = j < keys.length ? keys[j] : null;   // smallest key >= 25
console.log("floor(25) = " + floor25 + ", ceiling(25) = " + ceil25);
console.log("smallest = " + keys[0] + ", largest = " + keys[keys.length - 1]);

keys.splice(lowerBound(keys, 10), 1);              // O(n): later items shift left
console.log("after removing 10: smallest = " + keys[0] + ", size = " + keys.length);

const arr = [10, 20, 30, 40];                      // Array: a dynamic array
const third = arr[2];                              // index: O(1)
arr.push(50);                                      // append: O(1) amortized
console.log("array: element at index 2 = " + third + ", after append: " + fmt(arr));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You will be coding in Java. Before we start, tell me the time complexity of the basic operations — access, search, insert and delete — on an array, a hash map and a balanced binary search tree, and which Java types you would use for each."

**What a strong answer should cover:**
- Dynamic array: O(1) index access, O(1) amortized append, O(n) insert or delete at the front or middle (elements shift), O(n) search, O(log n) search if sorted.
- Hash map: O(1) average insert, lookup and delete; O(n) worst case under collisions; no ordering of keys.
- Balanced BST: O(log n) insert, delete and lookup because the height stays about log n; also min, max, floor, ceiling and ordered iteration; an unbalanced BST degrades to O(n).
- Choosing: hash map for pure lookups, tree for ordered or range queries, array for index access and fast iteration.
- Java mapping: \`ArrayList\` (dynamic array), \`HashMap\`/\`HashSet\` (hash tables, treeified buckets since Java 8), \`TreeMap\`/\`TreeSet\` (red-black trees with \`floorKey\`/\`ceilingKey\`); boxed values need \`equals\`.

**Code / implementation expected:** Optional — use \`ArrayList\`, \`HashMap\` and \`TreeMap\` correctly and state the cost of each call.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a list and a loop are; everything else is explained.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every count on this page (shifts, comparisons, tree heights) comes from running the Java code shown, and the **Verified** section quotes that output. Library guarantees are quoted from the official documentation and linked.

## 1. Why This Even Matters — A Story First

Picture three ways to store coats at a party.

- **The coat rail.** Coats hang in a row, numbered from the door. "Coat number 7" is instant: walk to the seventh hook. But squeezing a new coat in at the front means sliding every other coat along by one, and finding "the red coat" means walking the whole rail.
- **The ticket counter.** You hand in your coat and get a ticket. The attendant's ticket tells them exactly which hook to go to, so getting your coat back is instant no matter how many coats there are. But the hooks are in no useful order: "give me all coats from guests whose names start with B" means checking every hook.
- **The alphabetical cabinet.** Coats are filed by guest name in a cabinet where each drawer splits the remaining names in half. Finding any name takes a handful of "left or right?" decisions, and the coats are always in alphabetical order, so "all the Bs" or "the name just after Mia" are easy.

Those are an **array**, a **hash map** and a **balanced binary search tree**. Almost every interview solution is built from them, and choosing the right one is usually the difference between O(n²) and O(n) code. The interviewer asks this question to check that you know the price of each move *before* you build on it.

## 2. The Three Structures in Plain Language

📌 **Interview term: Array (dynamic array)** — items stored side by side in one block of memory, so item i lives at "start + i × item size". A dynamic array also grows by itself when full. In Java that is \`ArrayList\`.

📌 **Interview term: Random access** — reaching any position directly in O(1), without walking past the earlier ones. Arrays have it; linked lists do not (see [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list)).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="An array stores items side by side, so index 3 is found by arithmetic">
  <text class="d-text" x="380" y="26" text-anchor="middle">Array: slots side by side in memory</text>
  <rect class="d-box-muted" x="80" y="60" width="100" height="60" rx="6"/>
  <text class="d-text" x="130" y="96" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="200" y="60" width="100" height="60" rx="6"/>
  <text class="d-text" x="250" y="96" text-anchor="middle">20</text>
  <rect class="d-box-muted" x="320" y="60" width="100" height="60" rx="6"/>
  <text class="d-text" x="370" y="96" text-anchor="middle">30</text>
  <rect class="d-box-accent" x="440" y="60" width="100" height="60" rx="6"/>
  <text class="d-text d-accent" x="490" y="96" text-anchor="middle">40</text>
  <rect class="d-box-muted" x="560" y="60" width="100" height="60" rx="6"/>
  <text class="d-text" x="610" y="96" text-anchor="middle">50</text>
  <text class="d-sub" x="130" y="150" text-anchor="middle">index 0</text>
  <text class="d-sub" x="250" y="150" text-anchor="middle">index 1</text>
  <text class="d-sub" x="370" y="150" text-anchor="middle">index 2</text>
  <text class="d-sub d-accent" x="490" y="150" text-anchor="middle">index 3</text>
  <text class="d-sub" x="610" y="150" text-anchor="middle">index 4</text>
</svg>

Reading index 3 is one address calculation, O(1). Inserting at index 0 means moving all five values one slot to the right, O(n).

📌 **Interview term: Hash map (hash table)** — a structure that turns each key into a number with a **hash function**, uses that number to pick a **bucket**, and stores the key there. In Java that is \`HashMap\` / \`HashSet\`. The full mechanics have their own page: [how a hash table works](/interview-question/how-does-a-hash-table-work).

📌 **Interview term: Collision** — two different keys landing in the same bucket. A few are normal; many in one bucket make lookups slow.

📌 **Interview term: Load factor** — entries divided by buckets. Hash tables grow (rehash into more buckets) when it gets too high, which keeps buckets short on average.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="A hash function sends each key straight to one bucket">
  <defs>
    <marker id="b01q2-arrow-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="380" y="26" text-anchor="middle">Hash map: the key picks its bucket directly</text>
  <rect class="d-box-muted" x="40" y="70" width="150" height="50" rx="8"/>
  <text class="d-text" x="115" y="100" text-anchor="middle">key: bob</text>
  <path class="d-edge" d="M 196 95 L 266 95" marker-end="url(#b01q2-arrow-a)"/>
  <rect class="d-box-accent" x="272" y="70" width="170" height="50" rx="8"/>
  <text class="d-text d-accent" x="357" y="100" text-anchor="middle">hash(bob) = 2</text>
  <path class="d-edge-accent" d="M 448 95 C 500 95 510 150 560 150" marker-end="url(#b01q2-arrow-a)"/>
  <rect class="d-box-muted" x="566" y="50" width="160" height="34" rx="6"/>
  <text class="d-sub" x="646" y="72" text-anchor="middle">bucket 0: alice</text>
  <rect class="d-box-muted" x="566" y="92" width="160" height="34" rx="6"/>
  <text class="d-sub" x="646" y="114" text-anchor="middle">bucket 1: empty</text>
  <rect class="d-box-accent" x="566" y="134" width="160" height="34" rx="6"/>
  <text class="d-sub d-accent" x="646" y="156" text-anchor="middle">bucket 2: bob</text>
  <rect class="d-box-muted" x="566" y="176" width="160" height="34" rx="6"/>
  <text class="d-sub" x="646" y="198" text-anchor="middle">bucket 3: carol</text>
</svg>

The lookup cost does not depend on how many keys exist, only on how many share bob's bucket. That is why it is O(1) **on average** and O(n) **in the worst case**.

📌 **Interview term: Binary search tree (BST)** — a tree where every node's left subtree holds smaller keys and the right subtree larger keys, so each comparison discards one side. More on the [BST page](/interview-question/what-is-a-binary-search-tree-bst).

📌 **Interview term: Height** — the number of levels from the root to the deepest leaf. Every BST operation walks one root-to-leaf path, so its cost is O(height).

📌 **Interview term: Balanced (self-balancing) tree** — a BST that restructures itself on insert and delete (red-black and AVL trees are the common designs) so its height stays O(log n). In Java: \`TreeMap\` / \`TreeSet\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 290" role="img" aria-label="A balanced tree of 7 keys has 3 levels while sorted inserts build a chain">
  <text class="d-text" x="200" y="26" text-anchor="middle">Balanced: 7 keys, height 3</text>
  <circle class="d-box-accent" cx="200" cy="70" r="22"/>
  <text class="d-text" x="200" y="76" text-anchor="middle">4</text>
  <path class="d-edge" d="M 186 88 L 126 132"/>
  <path class="d-edge" d="M 214 88 L 274 132"/>
  <circle class="d-box-muted" cx="114" cy="148" r="22"/>
  <text class="d-text" x="114" y="154" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="286" cy="148" r="22"/>
  <text class="d-text" x="286" y="154" text-anchor="middle">6</text>
  <path class="d-edge" d="M 104 168 L 76 208"/>
  <path class="d-edge" d="M 124 168 L 152 208"/>
  <path class="d-edge" d="M 276 168 L 248 208"/>
  <path class="d-edge" d="M 296 168 L 324 208"/>
  <circle class="d-box-muted" cx="68" cy="226" r="22"/>
  <text class="d-text" x="68" y="232" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="160" cy="226" r="22"/>
  <text class="d-text" x="160" y="232" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="240" cy="226" r="22"/>
  <text class="d-text" x="240" y="232" text-anchor="middle">5</text>
  <circle class="d-box-muted" cx="332" cy="226" r="22"/>
  <text class="d-text" x="332" y="232" text-anchor="middle">7</text>
  <text class="d-text" x="590" y="26" text-anchor="middle">Sorted inserts: a chain</text>
  <circle class="d-box-muted" cx="480" cy="62" r="20"/>
  <text class="d-text" x="480" y="68" text-anchor="middle">1</text>
  <path class="d-edge" d="M 494 76 L 518 92"/>
  <circle class="d-box-muted" cx="530" cy="104" r="20"/>
  <text class="d-text" x="530" y="110" text-anchor="middle">2</text>
  <path class="d-edge" d="M 544 118 L 568 134"/>
  <circle class="d-box-muted" cx="580" cy="146" r="20"/>
  <text class="d-text" x="580" y="152" text-anchor="middle">3</text>
  <path class="d-edge" d="M 594 160 L 618 176"/>
  <circle class="d-box-muted" cx="630" cy="188" r="20"/>
  <text class="d-text" x="630" y="194" text-anchor="middle">4</text>
  <path class="d-edge-dashed" d="M 644 202 L 672 222"/>
  <text class="d-sub" x="700" y="252" text-anchor="middle">height n</text>
</svg>

Same keys, different insert order. On the left, finding 7 takes 3 comparisons; on the right, a plain BST that received the keys in sorted order became a linked list, and finding the last key takes n comparisons. Self-balancing trees exist to prevent the right-hand shape.

## 3. The Complexity Table

This is the table to know by heart. "n" is the number of stored items.

| Operation | Dynamic array | Hash map | Balanced BST |
| :--- | :--- | :--- | :--- |
| Access by position (index i) | **O(1)** | — | O(log n) only with extra subtree sizes; usually not offered |
| Search for a value / key | O(n) unsorted, O(log n) if sorted | **O(1) average**, O(n) worst | **O(log n)** |
| Insert at the end | **O(1) amortized** | — | — |
| Insert / delete at the front or middle | O(n) — elements shift | — | — |
| Insert a key | — | **O(1) average**, O(n) worst | **O(log n)** |
| Delete a key | O(n) (find + shift) | **O(1) average**, O(n) worst | **O(log n)** |
| Min / max | O(n) unsorted, O(1) if sorted | O(n) | **O(log n)** |
| Floor / ceiling / "next larger key" | O(log n) if sorted | O(n) | **O(log n)** |
| Iterate all items in sorted order | O(n log n) to sort first | O(n log n) to sort first | **O(n)** in-order walk |
| Extra space | O(n) | O(n) | O(n) |

📌 **Interview term: Amortized O(1)** — an operation that is occasionally expensive but cheap on average over any long sequence; appending to a dynamic array is the classic case. It has its own page: [amortized analysis](/interview-question/what-is-amortized-analysis).

📌 **Interview term: Average case vs worst case** — the hash map O(1) is an average that assumes the hash spreads keys out; the worst case, with every key in one bucket, is O(n). The balanced tree's O(log n) is a worst-case guarantee.

## 4. Which Java Type Is Which

| Structure | Java type | Notes |
| :--- | :--- | :--- |
| Dynamic array | \`ArrayList\` (or plain \`int[]\`) | \`get\`/\`set\` O(1), \`add\` O(1) amortized, \`add(0, x)\` / \`remove(0)\` O(n) |
| Hash map / hash set | \`HashMap\`, \`HashSet\` | \`get\`, \`put\`, \`remove\`, \`containsKey\`: O(1) on average |
| Balanced BST | \`TreeMap\`, \`TreeSet\` | red-black tree: O(log n) \`get\`/\`put\`/\`remove\`, plus \`floorKey\`, \`ceilingKey\`, \`firstKey\`, \`lastKey\` |
| Insertion-ordered hash map | \`LinkedHashMap\` | hash map that also remembers insertion order |
| Deque / heap | \`ArrayDeque\`, \`PriorityQueue\` | see [heaps](/interview-question/what-is-a-heap-priority-queue) |

These are documented guarantees. The \`ArrayList\` JavaDoc says \`size\`, \`get\`, \`set\` and friends run in constant time and "the add operation runs in amortized constant time, that is, adding n elements requires O(n) time". The \`HashMap\` JavaDoc promises constant time for \`get\` and \`put\` "assuming the hash function disperses the elements properly". The \`TreeMap\` JavaDoc describes it as "a Red-Black tree based NavigableMap implementation" with "guaranteed log(n) time cost for the containsKey, get, put and remove operations" ([TreeMap, Java SE 21](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/TreeMap.html)). Since Java 8, a \`HashMap\` bucket with many colliding keys is converted into a balanced tree, which improves that worst case from O(n) to O(log n) for comparable keys ([JEP 180](https://openjdk.org/jeps/180)).

## 5. Why Each Cost Is What It Is

**Arrays shift.** Inserting at position i means every item after i moves one slot right. This function does exactly that and counts the moves:

~~~java
static int insertAt(int[] buf, int size, int index, int value) {
    // Insert into a fixed buffer holding size items; return element shifts.
    int shifts = 0;
    for (int j = size; j > index; j--) {   // move everything after index right by one
        buf[j] = buf[j - 1];
        shifts++;
    }
    buf[index] = value;
    return shifts;
}
~~~

Inserting at the end moves nothing; inserting at the front moves everything. Over 1,000 front inserts that adds up to 0 + 1 + … + 999 = 499,500 shifts (measured below). In Java, \`ArrayList.add(0, x)\` does this shift with \`System.arraycopy\`, which is fast per element but still O(n) per insert.

**Hash tables jump to one bucket.** A tiny chained hash table that counts how many stored keys it compares against:

~~~java
static class ChainedHashTable {
    final List<List<Integer>> buckets = new ArrayList<>();
    ChainedHashTable(int count) {
        for (int i = 0; i < count; i++) buckets.add(new ArrayList<>());
    }
    void put(int key) {
        buckets.get(key % buckets.size()).add(key);
    }
    int comparisonsToFind(int key) {
        int compared = 0;
        for (int k : buckets.get(key % buckets.size())) {  // one bucket only
            compared++;
            if (k == key) break;           // k is unboxed to int here, so == is safe
        }
        return compared;
    }
}
~~~

With 100,000 keys in 100,003 buckets, each bucket holds at most one key, so a lookup compares at most once. Force all keys into one bucket and the same lookup compares against every key: that is the O(n) worst case.

**Trees cost one path.** A plain (not self-balancing) BST, plus an insert order that keeps it balanced:

~~~java
static class Node {
    int key;
    Node left, right;
    Node(int key) { this.key = key; }
}

static Node bstInsert(Node root, int key) {   // iterative: no stack depth to worry about
    Node node = new Node(key);
    if (root == null) return node;
    Node cur = root;
    while (true) {
        if (key < cur.key) {
            if (cur.left == null) { cur.left = node; return root; }
            cur = cur.left;
        } else {
            if (cur.right == null) { cur.right = node; return root; }
            cur = cur.right;
        }
    }
}

static int comparisonsToFind(Node root, int key) {
    int compared = 0;
    Node cur = root;
    while (cur != null) {
        compared++;
        if (key == cur.key) return compared;
        cur = key < cur.key ? cur.left : cur.right;
    }
    return compared;
}

static void middleFirst(int lo, int hi, List<Integer> out) {  // keeps the tree balanced
    if (lo > hi) return;
    int mid = lo + (hi - lo) / 2;
    out.add(mid);
    middleFirst(lo, mid - 1, out);
    middleFirst(mid + 1, hi, out);
}
~~~

Inserting 0…999 in sorted order sends every key to the right: a chain of height 1,000. Inserting the middle key first, then the middles of each half, gives height 10, because 2¹⁰ = 1,024 ≥ 1,000. Self-balancing trees achieve that shape automatically, whatever the insert order. Tree walks that follow on from this are on the [tree traversal page](/interview-question/what-are-the-tree-traversal-methods).

## 6. Java Quirks: Order and Boxed Values

Two Java behaviours that come up when you use these maps in an interview:

~~~java
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> hash = new HashMap<>();
        Map<String, Integer> tree = new TreeMap<>();
        for (String s : new String[]{"pear", "fig", "apple", "kiwi", "banana"}) {
            hash.put(s, s.length());
            tree.put(s, s.length());
        }
        System.out.println("HashMap keys: " + hash.keySet());
        System.out.println("TreeMap keys: " + tree.keySet());

        Map<String, Integer> scores = new HashMap<>();
        scores.put("a", 127); scores.put("b", 127);
        scores.put("c", 1000); scores.put("d", 1000);
        System.out.println("127 == 127   : " + (scores.get("a") == scores.get("b")));
        System.out.println("1000 == 1000 : " + (scores.get("c") == scores.get("d")));
        System.out.println("1000 equals  : " + scores.get("c").equals(scores.get("d")));
    }
}
~~~

Output of \`javac Main.java && java Main\`:

~~~text
HashMap keys: [banana, apple, pear, kiwi, fig]
TreeMap keys: [apple, banana, fig, kiwi, pear]
127 == 127   : true
1000 == 1000 : false
1000 equals  : true
~~~

- **\`HashMap\` has no meaningful order.** The keys came out as \`[banana, apple, pear, kiwi, fig]\`: neither insertion order nor sorted, just the bucket layout, which can change between versions or after a resize. \`TreeMap\` iterates in sorted order (O(n) for the whole walk), and \`LinkedHashMap\` in insertion order.
- **Map values are boxed \`Integer\` objects.** \`==\` compares object identity. Java caches boxed values from -128 to 127, so \`127 == 127\` happened to be \`true\`, but \`1000 == 1000\` was \`false\`. Use \`.equals\`, or unbox to \`int\` first. This is a correctness bug that complexity questions often hide (for example, comparing two frequency maps).

## 7. The Same Operations with Java Collections

In an interview you use the library, not a hand-written table. Here are the same operations with the standard Java tools, with the cost of each call in the comments:

~~~java
Map<String, Integer> ages = new HashMap<>();     // a hash table
ages.put("alice", 28);
ages.put("bob", 31);
ages.put("carol", 25);
ages.put("dave", 40);                            // insert: O(1) average
ages.remove("dave");                             // delete: O(1) average
System.out.println("hash map: age of bob = " + ages.get("bob") + ", has dave = " + ages.containsKey("dave"));
System.out.println("hash map keys, sorted for printing: " + fmt(new TreeSet<>(ages.keySet())));
~~~

~~~java
TreeMap<Integer, String> tree = new TreeMap<>(); // a red-black tree
for (int k : new int[]{30, 10, 40, 20}) tree.put(k, "v" + k);   // O(log n) each
System.out.println("ordered keys: " + fmt(tree.keySet()));
System.out.println("floor(25) = " + tree.floorKey(25) + ", ceiling(25) = " + tree.ceilingKey(25));
System.out.println("smallest = " + tree.firstKey() + ", largest = " + tree.lastKey());
tree.remove(10);                                 // O(log n), no shifting
System.out.println("after removing 10: smallest = " + tree.firstKey() + ", size = " + tree.size());
~~~

~~~java
List<Integer> arr = new ArrayList<>(List.of(10, 20, 30, 40));   // a dynamic array
int third = arr.get(2);                          // index: O(1)
arr.add(50);                                     // append: O(1) amortized
System.out.println("array: element at index 2 = " + third + ", after append: " + fmt(arr));
~~~

\`TreeMap\` gives you the tree operations directly: \`floorKey(x)\` is the largest key <= x, \`ceilingKey(x)\` the smallest key >= x, and both return \`null\` when there is none. Removing a key is O(log n) with no shifting, unlike a sorted array. Printing \`new TreeSet<>(ages.keySet())\` sorts the hash keys in O(n log n) just for display.

## 8. Verified: Running the Code

All three programs are the runnable examples under "Java code" on this page, run with \`javac Main.java && java Main\`.

**Example 1 — array shifts, searches and hash buckets:**

~~~text
dynamic array, n=1000:
  1000 inserts at the end   -> 0 element shifts
  1000 inserts at the front -> 499500 element shifts
search among n=100000 keys (comparisons made):
  linear scan, missing key   = 100000
  binary search, missing key = 17
  hash table, missing key    = 0
  hash table, present key    = 1
hash table worst case, 1000 keys in one bucket = 1000
~~~

The front inserts cost 499,500 shifts against 0 for the end — the O(n) vs O(1) difference, repeated 1,000 times. For the search, binary search needed 17 comparisons (⌊log₂ 100,000⌋ + 1), the hash table at most 1, and the linear scan all 100,000. The last line is the hash-table worst case: 1,000 comparisons when every key shares a bucket.

**Example 2 — balanced vs unbalanced BST:**

~~~text
binary search tree with 1000 keys:
  inserted in sorted order -> height 1000, find max: 1000 comparisons
  inserted middle-first    -> height 10, find max: 10 comparisons
~~~

Same 1,000 keys, same code; only the insert order differs. Height 1,000 means O(n) per operation, height 10 means O(log n).

**Example 3 — the standard-library versions:**

~~~text
hash map: age of bob = 31, has dave = false
hash map keys, sorted for printing: [alice, bob, carol]
ordered keys: [10, 20, 30, 40]
floor(25) = 20, ceiling(25) = 30
smallest = 10, largest = 40
after removing 10: smallest = 20, size = 3
array: element at index 2 = 30, after append: [10, 20, 30, 40, 50]
~~~

## 9. How to Choose

| You need... | Use | Why |
| :--- | :--- | :--- |
| "Have I seen this before?", counting, grouping | Hash map / set | O(1) average lookups |
| Sorted order, nearest key, ranges, min and max with updates | Balanced BST | O(log n) for all of them |
| Access by position, iteration, the input itself | Array | O(1) index, compact memory |
| Only the smallest (or largest) item, repeatedly | Heap | O(log n) push/pop, O(1) peek |
| Searching a sorted array that does not change | Array + binary search | O(log n), no extra memory |

## 10. Edge Cases and Subtleties

- **"O(1)" hash map lookups still hash the key.** Hashing a string of length k costs O(k), so a lookup of a long string key is O(k), not free.
- **Amortized is not worst case.** One append that triggers a resize costs O(n). If a single operation must never be slow (real-time systems), that matters.
- **Small n.** For a handful of items, a linear scan over an array is often faster than a hash map or a tree because of memory locality and lower constants.
- **Sorted array vs tree.** If the data is built once and then only read, a sorted array with binary search beats a tree: same O(log n) search, less memory, no O(n) inserts after the build.
- **Deleting from the middle of an array** needs a search (O(n) unsorted, O(log n) sorted) *and* a shift (O(n)), so it is O(n) either way.

## Common Pitfalls

- **Iterating a \`HashMap\` and expecting an order.** It has none; use \`TreeMap\` for sorted or \`LinkedHashMap\` for insertion order.
- **Comparing boxed values with \`==\`.** Values above 127 are usually different objects; \`1000 == 1000\` printed \`false\`. Use \`equals\` or \`int\`.
- **Mutating a key after inserting it.** If \`hashCode\` changes, the entry is now in the wrong bucket and \`get\` cannot find it.
- **\`list.remove(0)\` on an \`ArrayList\` in a loop.** O(n) each; use \`ArrayDeque\` for queue behaviour.
- **Forgetting \`floorKey\` can return \`null\`.** Unboxing that \`null\` into an \`int\` throws \`NullPointerException\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Arrays:</strong> <span style="color:#f0e2c8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList</code> gives O(1) <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> and O(1) amortized <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add</code>, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add(0, x)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove(0)</code> is O(n) because elements shift; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contains</code> is O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Hash maps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> gives O(1) average <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove</code> assuming a good <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hashCode</code>; since Java 8 a heavily colliding bucket becomes a tree, so the bad case is O(log n) for comparable keys.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Balanced trees:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeMap</code> is a red-black tree: guaranteed O(log n) <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">remove</code>, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">floorKey</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ceilingKey</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">firstKey</code> and sorted iteration.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Java specifics:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> iteration order is meaningless, values are boxed so compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LinkedHashMap</code> keeps insertion order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Choosing:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap</code> for pure lookups, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeMap</code> when I need order or ranges, an array or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList</code> when I need index access or tight iteration.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you pick <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">TreeMap</code> over <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When I need sorted keys or ordered queries: nearest key with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">floorKey</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ceilingKey</code>, ranges with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">subMap</code>, min/max with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">firstKey</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lastKey</code>. I pay O(log n) per operation instead of O(1) average.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the worst case of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap.get</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without treeification it is O(n) when all keys share a bucket. Since Java 8, large buckets are converted to balanced trees, so for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Comparable</code> keys it is O(log n) (JEP 180).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">1000 == 1000</code> print false?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The values are boxed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> objects and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> compares references. The JLS requires caching only for -128 to 127, so larger values are usually separate objects. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">equals</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ArrayList.add</code> cost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Amortized O(1): the JavaDoc says adding n elements takes O(n) time. An individual add that triggers a resize copies the array, O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get a sorted list of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap</code> keys?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Copy them into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeSet</code> or a list and sort: O(n log n). Or use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeMap</code> from the start if order matters on every read.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Array (dynamic array)** | Items side by side in memory; grows when full |
| **Random access** | Reaching any index in O(1) |
| **Hash map (hash table)** | Key → hash → bucket; O(1) average operations |
| **Collision** | Two keys in the same bucket |
| **Load factor** | Entries divided by buckets; triggers a resize when high |
| **Binary search tree (BST)** | Smaller keys left, larger keys right |
| **Height** | Levels from root to deepest leaf; BST cost is O(height) |
| **Balanced (self-balancing) tree** | BST that keeps its height O(log n), e.g. red-black or AVL |
| **Amortized O(1)** | Occasionally expensive, constant on average over a sequence |
| **Average vs worst case** | Typical cost vs the guaranteed maximum |
| **Treeification** | Java 8+ turning a crowded \`HashMap\` bucket into a balanced tree |

**Conclusion:** Arrays give instant access by position but pay O(n) to make room in the middle; hash maps give O(1) average lookups but no order and an O(n) worst case; balanced trees give O(log n) for everything, including the ordered queries the other two cannot answer cheaply. The runs on this page put numbers on it: 499,500 shifts versus 0, 100,000 comparisons versus 17 versus 1, and a tree of height 1,000 versus 10 from nothing but insert order. In Java, the extra step is knowing which built-in type gives you which guarantee — and saying so before you write the first line.`,
        examples: [
          {
            label: "Count shifts and comparisons: array inserts, linear vs binary search, hash buckets",
            code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    // Count the real work behind array and hash-table operations.

    static int insertAt(int[] buf, int size, int index, int value) {
        // Insert into a fixed buffer holding size items; return element shifts.
        int shifts = 0;
        for (int j = size; j > index; j--) {   // move everything after index right by one
            buf[j] = buf[j - 1];
            shifts++;
        }
        buf[index] = value;
        return shifts;
    }

    static class ChainedHashTable {
        final List<List<Integer>> buckets = new ArrayList<>();
        ChainedHashTable(int count) {
            for (int i = 0; i < count; i++) buckets.add(new ArrayList<>());
        }
        void put(int key) {
            buckets.get(key % buckets.size()).add(key);
        }
        int comparisonsToFind(int key) {
            int compared = 0;
            for (int k : buckets.get(key % buckets.size())) {  // one bucket only
                compared++;
                if (k == key) break;           // k is unboxed to int here, so == is safe
            }
            return compared;
        }
    }

    static int linearComparisons(int[] nums, int target) {
        int compared = 0;
        for (int x : nums) {
            compared++;
            if (x == target) break;
        }
        return compared;
    }

    static int binaryComparisons(int[] nums, int target) {
        int compared = 0, lo = 0, hi = nums.length - 1;
        while (lo <= hi) {
            compared++;
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) break;
            if (nums[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return compared;
    }

    public static void main(String[] args) {
        int n = 1000;
        int[] buf = new int[n];
        int size = 0, front = 0, back = 0;
        for (int v = 0; v < n; v++) { front += insertAt(buf, size, 0, v); size++; }
        buf = new int[n];
        size = 0;
        for (int v = 0; v < n; v++) { back += insertAt(buf, size, size, v); size++; }
        System.out.println("dynamic array, n=1000:");
        System.out.println("  1000 inserts at the end   -> " + back + " element shifts");
        System.out.println("  1000 inserts at the front -> " + front + " element shifts");

        n = 100000;
        int[] nums = new int[n];
        ChainedHashTable table = new ChainedHashTable(100003);
        for (int i = 0; i < n; i++) { nums[i] = i; table.put(i); }
        System.out.println("search among n=100000 keys (comparisons made):");
        System.out.println("  linear scan, missing key   = " + linearComparisons(nums, n));
        System.out.println("  binary search, missing key = " + binaryComparisons(nums, n));
        System.out.println("  hash table, missing key    = " + table.comparisonsToFind(n));
        System.out.println("  hash table, present key    = " + table.comparisonsToFind(54321));

        ChainedHashTable bad = new ChainedHashTable(100003);
        for (int k = 0; k < 1000; k++) bad.put(k * 100003);   // every key lands in bucket 0
        System.out.println("hash table worst case, 1000 keys in one bucket = " + bad.comparisonsToFind(1000 * 100003));
    }
}`,
          },
          {
            label: "Balanced vs unbalanced binary search tree: height and lookup cost",
            code: `import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

public class Main {
    // A binary search tree is only O(log n) when it stays balanced. Count it.

    static class Node {
        int key;
        Node left, right;
        Node(int key) { this.key = key; }
    }

    static Node bstInsert(Node root, int key) {   // iterative: no stack depth to worry about
        Node node = new Node(key);
        if (root == null) return node;
        Node cur = root;
        while (true) {
            if (key < cur.key) {
                if (cur.left == null) { cur.left = node; return root; }
                cur = cur.left;
            } else {
                if (cur.right == null) { cur.right = node; return root; }
                cur = cur.right;
            }
        }
    }

    static int comparisonsToFind(Node root, int key) {
        int compared = 0;
        Node cur = root;
        while (cur != null) {
            compared++;
            if (key == cur.key) return compared;
            cur = key < cur.key ? cur.left : cur.right;
        }
        return compared;
    }

    static void middleFirst(int lo, int hi, List<Integer> out) {  // keeps the tree balanced
        if (lo > hi) return;
        int mid = lo + (hi - lo) / 2;
        out.add(mid);
        middleFirst(lo, mid - 1, out);
        middleFirst(mid + 1, hi, out);
    }

    static int height(Node root) {
        int best = 0;
        Deque<Object[]> stack = new ArrayDeque<>();
        if (root != null) stack.push(new Object[]{root, 1});
        while (!stack.isEmpty()) {
            Object[] top = stack.pop();
            Node node = (Node) top[0];
            int d = (Integer) top[1];
            best = Math.max(best, d);
            if (node.left != null) stack.push(new Object[]{node.left, d + 1});
            if (node.right != null) stack.push(new Object[]{node.right, d + 1});
        }
        return best;
    }

    public static void main(String[] args) {
        Node sortedRoot = null;
        for (int k = 0; k < 1000; k++) sortedRoot = bstInsert(sortedRoot, k);
        List<Integer> order = new ArrayList<>();
        middleFirst(0, 999, order);
        Node balancedRoot = null;
        for (int k : order) balancedRoot = bstInsert(balancedRoot, k);
        System.out.println("binary search tree with 1000 keys:");
        System.out.println("  inserted in sorted order -> height " + height(sortedRoot) + ", find max: " + comparisonsToFind(sortedRoot, 999) + " comparisons");
        System.out.println("  inserted middle-first    -> height " + height(balancedRoot) + ", find max: " + comparisonsToFind(balancedRoot, 999) + " comparisons");
    }
}`,
          },
          {
            label: "The standard-library structures and what each call costs",
            code: `import java.util.*;

public class Main {
    // The standard Java tools for each structure, and what each call costs.

    static String fmt(Collection<?> items) {
        StringBuilder sb = new StringBuilder("[");
        for (Object x : items) {
            if (sb.length() > 1) sb.append(", ");
            sb.append(x);
        }
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        Map<String, Integer> ages = new HashMap<>();     // a hash table
        ages.put("alice", 28);
        ages.put("bob", 31);
        ages.put("carol", 25);
        ages.put("dave", 40);                            // insert: O(1) average
        ages.remove("dave");                             // delete: O(1) average
        System.out.println("hash map: age of bob = " + ages.get("bob") + ", has dave = " + ages.containsKey("dave"));
        System.out.println("hash map keys, sorted for printing: " + fmt(new TreeSet<>(ages.keySet())));

        TreeMap<Integer, String> tree = new TreeMap<>(); // a red-black tree
        for (int k : new int[]{30, 10, 40, 20}) tree.put(k, "v" + k);   // O(log n) each
        System.out.println("ordered keys: " + fmt(tree.keySet()));
        System.out.println("floor(25) = " + tree.floorKey(25) + ", ceiling(25) = " + tree.ceilingKey(25));
        System.out.println("smallest = " + tree.firstKey() + ", largest = " + tree.lastKey());
        tree.remove(10);                                 // O(log n), no shifting
        System.out.println("after removing 10: smallest = " + tree.firstKey() + ", size = " + tree.size());

        List<Integer> arr = new ArrayList<>(List.of(10, 20, 30, 40));   // a dynamic array
        int third = arr.get(2);                          // index: O(1)
        arr.add(50);                                     // append: O(1) amortized
        System.out.println("array: element at index 2 = " + third + ", after append: " + fmt(arr));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You will be coding in C++. Before we start, tell me the time complexity of the basic operations — access, search, insert and delete — on an array, a hash map and a balanced binary search tree, and which C++ types you would use for each."

**What a strong answer should cover:**
- Dynamic array: O(1) index access, O(1) amortized append, O(n) insert or delete at the front or middle (elements shift), O(n) search, O(log n) search if sorted.
- Hash map: O(1) average insert, lookup and delete; O(n) worst case under collisions; no ordering of keys.
- Balanced BST: O(log n) insert, delete and lookup because the height stays about log n; also min, max, floor, ceiling and ordered iteration; an unbalanced BST degrades to O(n).
- Choosing: hash map for pure lookups, tree for ordered or range queries, array for index access and fast iteration.
- C++ mapping: \`std::vector\` (dynamic array), \`unordered_map\`/\`unordered_set\` (hash tables), \`std::map\`/\`std::set\` (red-black trees in practice); \`operator[]\` inserts and reallocation invalidates iterators.

**Code / implementation expected:** Optional — use \`std::vector\`, \`unordered_map\` and \`std::map\` correctly and state the cost of each call.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a list and a loop are; everything else is explained.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every count on this page (shifts, comparisons, tree heights) comes from running the C++ code shown, and the **Verified** section quotes that output. Library guarantees are quoted from the official documentation and linked.

## 1. Why This Even Matters — A Story First

Picture three ways to store coats at a party.

- **The coat rail.** Coats hang in a row, numbered from the door. "Coat number 7" is instant: walk to the seventh hook. But squeezing a new coat in at the front means sliding every other coat along by one, and finding "the red coat" means walking the whole rail.
- **The ticket counter.** You hand in your coat and get a ticket. The attendant's ticket tells them exactly which hook to go to, so getting your coat back is instant no matter how many coats there are. But the hooks are in no useful order: "give me all coats from guests whose names start with B" means checking every hook.
- **The alphabetical cabinet.** Coats are filed by guest name in a cabinet where each drawer splits the remaining names in half. Finding any name takes a handful of "left or right?" decisions, and the coats are always in alphabetical order, so "all the Bs" or "the name just after Mia" are easy.

Those are an **array**, a **hash map** and a **balanced binary search tree**. Almost every interview solution is built from them, and choosing the right one is usually the difference between O(n²) and O(n) code. The interviewer asks this question to check that you know the price of each move *before* you build on it.

## 2. The Three Structures in Plain Language

📌 **Interview term: Array (dynamic array)** — items stored side by side in one block of memory, so item i lives at "start + i × item size". A dynamic array also grows by itself when full. In C++ that is \`std::vector\`.

📌 **Interview term: Random access** — reaching any position directly in O(1), without walking past the earlier ones. Arrays have it; linked lists do not (see [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list)).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="An array stores items side by side, so index 3 is found by arithmetic">
  <text class="d-text" x="380" y="26" text-anchor="middle">Array: slots side by side in memory</text>
  <rect class="d-box-muted" x="80" y="60" width="100" height="60" rx="6"/>
  <text class="d-text" x="130" y="96" text-anchor="middle">10</text>
  <rect class="d-box-muted" x="200" y="60" width="100" height="60" rx="6"/>
  <text class="d-text" x="250" y="96" text-anchor="middle">20</text>
  <rect class="d-box-muted" x="320" y="60" width="100" height="60" rx="6"/>
  <text class="d-text" x="370" y="96" text-anchor="middle">30</text>
  <rect class="d-box-accent" x="440" y="60" width="100" height="60" rx="6"/>
  <text class="d-text d-accent" x="490" y="96" text-anchor="middle">40</text>
  <rect class="d-box-muted" x="560" y="60" width="100" height="60" rx="6"/>
  <text class="d-text" x="610" y="96" text-anchor="middle">50</text>
  <text class="d-sub" x="130" y="150" text-anchor="middle">index 0</text>
  <text class="d-sub" x="250" y="150" text-anchor="middle">index 1</text>
  <text class="d-sub" x="370" y="150" text-anchor="middle">index 2</text>
  <text class="d-sub d-accent" x="490" y="150" text-anchor="middle">index 3</text>
  <text class="d-sub" x="610" y="150" text-anchor="middle">index 4</text>
</svg>

Reading index 3 is one address calculation, O(1). Inserting at index 0 means moving all five values one slot to the right, O(n).

📌 **Interview term: Hash map (hash table)** — a structure that turns each key into a number with a **hash function**, uses that number to pick a **bucket**, and stores the key there. In C++ that is \`std::unordered_map\` / \`unordered_set\`. The full mechanics have their own page: [how a hash table works](/interview-question/how-does-a-hash-table-work).

📌 **Interview term: Collision** — two different keys landing in the same bucket. A few are normal; many in one bucket make lookups slow.

📌 **Interview term: Load factor** — entries divided by buckets. Hash tables grow (rehash into more buckets) when it gets too high, which keeps buckets short on average.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="A hash function sends each key straight to one bucket">
  <defs>
    <marker id="b01q2-arrow-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="380" y="26" text-anchor="middle">Hash map: the key picks its bucket directly</text>
  <rect class="d-box-muted" x="40" y="70" width="150" height="50" rx="8"/>
  <text class="d-text" x="115" y="100" text-anchor="middle">key: bob</text>
  <path class="d-edge" d="M 196 95 L 266 95" marker-end="url(#b01q2-arrow-a)"/>
  <rect class="d-box-accent" x="272" y="70" width="170" height="50" rx="8"/>
  <text class="d-text d-accent" x="357" y="100" text-anchor="middle">hash(bob) = 2</text>
  <path class="d-edge-accent" d="M 448 95 C 500 95 510 150 560 150" marker-end="url(#b01q2-arrow-a)"/>
  <rect class="d-box-muted" x="566" y="50" width="160" height="34" rx="6"/>
  <text class="d-sub" x="646" y="72" text-anchor="middle">bucket 0: alice</text>
  <rect class="d-box-muted" x="566" y="92" width="160" height="34" rx="6"/>
  <text class="d-sub" x="646" y="114" text-anchor="middle">bucket 1: empty</text>
  <rect class="d-box-accent" x="566" y="134" width="160" height="34" rx="6"/>
  <text class="d-sub d-accent" x="646" y="156" text-anchor="middle">bucket 2: bob</text>
  <rect class="d-box-muted" x="566" y="176" width="160" height="34" rx="6"/>
  <text class="d-sub" x="646" y="198" text-anchor="middle">bucket 3: carol</text>
</svg>

The lookup cost does not depend on how many keys exist, only on how many share bob's bucket. That is why it is O(1) **on average** and O(n) **in the worst case**.

📌 **Interview term: Binary search tree (BST)** — a tree where every node's left subtree holds smaller keys and the right subtree larger keys, so each comparison discards one side. More on the [BST page](/interview-question/what-is-a-binary-search-tree-bst).

📌 **Interview term: Height** — the number of levels from the root to the deepest leaf. Every BST operation walks one root-to-leaf path, so its cost is O(height).

📌 **Interview term: Balanced (self-balancing) tree** — a BST that restructures itself on insert and delete (red-black and AVL trees are the common designs) so its height stays O(log n). In C++: \`std::map\` / \`std::set\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 290" role="img" aria-label="A balanced tree of 7 keys has 3 levels while sorted inserts build a chain">
  <text class="d-text" x="200" y="26" text-anchor="middle">Balanced: 7 keys, height 3</text>
  <circle class="d-box-accent" cx="200" cy="70" r="22"/>
  <text class="d-text" x="200" y="76" text-anchor="middle">4</text>
  <path class="d-edge" d="M 186 88 L 126 132"/>
  <path class="d-edge" d="M 214 88 L 274 132"/>
  <circle class="d-box-muted" cx="114" cy="148" r="22"/>
  <text class="d-text" x="114" y="154" text-anchor="middle">2</text>
  <circle class="d-box-muted" cx="286" cy="148" r="22"/>
  <text class="d-text" x="286" y="154" text-anchor="middle">6</text>
  <path class="d-edge" d="M 104 168 L 76 208"/>
  <path class="d-edge" d="M 124 168 L 152 208"/>
  <path class="d-edge" d="M 276 168 L 248 208"/>
  <path class="d-edge" d="M 296 168 L 324 208"/>
  <circle class="d-box-muted" cx="68" cy="226" r="22"/>
  <text class="d-text" x="68" y="232" text-anchor="middle">1</text>
  <circle class="d-box-muted" cx="160" cy="226" r="22"/>
  <text class="d-text" x="160" y="232" text-anchor="middle">3</text>
  <circle class="d-box-muted" cx="240" cy="226" r="22"/>
  <text class="d-text" x="240" y="232" text-anchor="middle">5</text>
  <circle class="d-box-muted" cx="332" cy="226" r="22"/>
  <text class="d-text" x="332" y="232" text-anchor="middle">7</text>
  <text class="d-text" x="590" y="26" text-anchor="middle">Sorted inserts: a chain</text>
  <circle class="d-box-muted" cx="480" cy="62" r="20"/>
  <text class="d-text" x="480" y="68" text-anchor="middle">1</text>
  <path class="d-edge" d="M 494 76 L 518 92"/>
  <circle class="d-box-muted" cx="530" cy="104" r="20"/>
  <text class="d-text" x="530" y="110" text-anchor="middle">2</text>
  <path class="d-edge" d="M 544 118 L 568 134"/>
  <circle class="d-box-muted" cx="580" cy="146" r="20"/>
  <text class="d-text" x="580" y="152" text-anchor="middle">3</text>
  <path class="d-edge" d="M 594 160 L 618 176"/>
  <circle class="d-box-muted" cx="630" cy="188" r="20"/>
  <text class="d-text" x="630" y="194" text-anchor="middle">4</text>
  <path class="d-edge-dashed" d="M 644 202 L 672 222"/>
  <text class="d-sub" x="700" y="252" text-anchor="middle">height n</text>
</svg>

Same keys, different insert order. On the left, finding 7 takes 3 comparisons; on the right, a plain BST that received the keys in sorted order became a linked list, and finding the last key takes n comparisons. Self-balancing trees exist to prevent the right-hand shape.

## 3. The Complexity Table

This is the table to know by heart. "n" is the number of stored items.

| Operation | Dynamic array | Hash map | Balanced BST |
| :--- | :--- | :--- | :--- |
| Access by position (index i) | **O(1)** | — | O(log n) only with extra subtree sizes; usually not offered |
| Search for a value / key | O(n) unsorted, O(log n) if sorted | **O(1) average**, O(n) worst | **O(log n)** |
| Insert at the end | **O(1) amortized** | — | — |
| Insert / delete at the front or middle | O(n) — elements shift | — | — |
| Insert a key | — | **O(1) average**, O(n) worst | **O(log n)** |
| Delete a key | O(n) (find + shift) | **O(1) average**, O(n) worst | **O(log n)** |
| Min / max | O(n) unsorted, O(1) if sorted | O(n) | **O(log n)** |
| Floor / ceiling / "next larger key" | O(log n) if sorted | O(n) | **O(log n)** |
| Iterate all items in sorted order | O(n log n) to sort first | O(n log n) to sort first | **O(n)** in-order walk |
| Extra space | O(n) | O(n) | O(n) |

📌 **Interview term: Amortized O(1)** — an operation that is occasionally expensive but cheap on average over any long sequence; appending to a dynamic array is the classic case. It has its own page: [amortized analysis](/interview-question/what-is-amortized-analysis).

📌 **Interview term: Average case vs worst case** — the hash map O(1) is an average that assumes the hash spreads keys out; the worst case, with every key in one bucket, is O(n). The balanced tree's O(log n) is a worst-case guarantee.

## 4. Which C++ Type Is Which

| Structure | C++ type | Notes |
| :--- | :--- | :--- |
| Dynamic array | \`std::vector\` | \`v[i]\` O(1), \`push_back\` O(1) amortized, \`insert\`/\`erase\` at the front or middle O(n) |
| Hash map / hash set | \`std::unordered_map\`, \`std::unordered_set\` | \`find\`, \`insert\`, \`erase\`: O(1) average, O(n) worst |
| Balanced BST | \`std::map\`, \`std::set\` | O(log n) \`find\`/\`insert\`/\`erase\`, plus \`lower_bound\`/\`upper_bound\`, sorted iteration |
| Deque / heap | \`std::deque\`, \`std::priority_queue\` | \`priority_queue\` is a max-heap by default; see [heaps](/interview-question/what-is-a-heap-priority-queue) |

cppreference lists \`push_back\` as amortized constant, \`unordered_map\` lookups as constant on average and linear in the size in the worst case, and \`std::map\` search, insertion and removal as logarithmic. The standard only fixes those complexities, not the data structure; in practice \`std::map\` is a red-black tree, and in GCC 13's libstdc++ (the compiler used for this page) \`std::map\` is a wrapper around \`_Rb_tree\`, documented in \`bits/stl_tree.h\` as "Red-black tree class".

Iterator rules matter for complexity code too: a \`push_back\` that reallocates invalidates **all** iterators and references into a vector; an \`unordered_map\` insert that triggers a rehash invalidates iterators (but not references to elements); inserting into a \`std::map\` invalidates nothing.

## 5. Why Each Cost Is What It Is

**Arrays shift.** Inserting at position i means every item after i moves one slot right. This function does exactly that and counts the moves:

~~~cpp
int insertAt(vector<int>& buf, int size, int index, int value) {
    // Insert into a fixed buffer holding size items; return element shifts.
    int shifts = 0;
    for (int j = size; j > index; j--) {   // move everything after index right by one
        buf[j] = buf[j - 1];
        shifts++;
    }
    buf[index] = value;
    return shifts;
}
~~~

Inserting at the end moves nothing; inserting at the front moves everything. Over 1,000 front inserts that adds up to 0 + 1 + … + 999 = 499,500 shifts (measured below). In C++, \`v.insert(v.begin(), x)\` performs this shift with element moves, so it is O(n) per insert; on a \`std::deque\` the same front insert is O(1).

**Hash tables jump to one bucket.** A tiny chained hash table that counts how many stored keys it compares against:

~~~cpp
struct ChainedHashTable {
    vector<vector<int>> buckets;
    explicit ChainedHashTable(int count) : buckets(count) {}
    void put(int key) { buckets[key % buckets.size()].push_back(key); }
    int comparisonsToFind(int key) const {
        int compared = 0;
        for (int k : buckets[key % buckets.size()]) {  // one bucket only
            compared++;
            if (k == key) break;
        }
        return compared;
    }
};
~~~

With 100,000 keys in 100,003 buckets, each bucket holds at most one key, so a lookup compares at most once. Force all keys into one bucket and the same lookup compares against every key: that is the O(n) worst case.

**Trees cost one path.** A plain (not self-balancing) BST, plus an insert order that keeps it balanced:

~~~cpp
struct Node {
    int key;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int k) : key(k) {}
};

Node* bstInsert(Node* root, Node* node) {        // iterative: no stack depth to worry about
    if (root == nullptr) return node;
    Node* cur = root;
    while (true) {
        if (node->key < cur->key) {
            if (cur->left == nullptr) { cur->left = node; return root; }
            cur = cur->left;
        } else {
            if (cur->right == nullptr) { cur->right = node; return root; }
            cur = cur->right;
        }
    }
}

int comparisonsToFind(const Node* root, int key) {
    int compared = 0;
    const Node* cur = root;
    while (cur != nullptr) {
        compared++;
        if (key == cur->key) return compared;
        cur = key < cur->key ? cur->left : cur->right;
    }
    return compared;
}

void middleFirst(int lo, int hi, vector<int>& out) {   // order that keeps the tree balanced
    if (lo > hi) return;
    int mid = lo + (hi - lo) / 2;
    out.push_back(mid);
    middleFirst(lo, mid - 1, out);
    middleFirst(mid + 1, hi, out);
}
~~~

Inserting 0…999 in sorted order sends every key to the right: a chain of height 1,000. Inserting the middle key first, then the middles of each half, gives height 10, because 2¹⁰ = 1,024 ≥ 1,000. Self-balancing trees achieve that shape automatically, whatever the insert order. Tree walks that follow on from this are on the [tree traversal page](/interview-question/what-are-the-tree-traversal-methods).

## 6. C++ Quirks: Bad Hashes and operator[]

Two C++ behaviours to know: what a bad hash function does to \`unordered_map\`, and the side effect of \`operator[]\`:

~~~cpp
#include <iostream>
#include <string>
#include <unordered_map>
using namespace std;

int eqCalls = 0;
struct Key {
    int v;
    bool operator==(const Key& o) const { eqCalls++; return v == o.v; }
};
struct ConstantHash {
    size_t operator()(const Key&) const { return 42; }   // every key collides
};

int main() {
    for (int n : {100, 200, 400}) {
        eqCalls = 0;
        unordered_map<Key, int, ConstantHash> m;
        for (int i = 0; i < n; i++) m[Key{i}] = i;
        cout << n << " colliding inserts -> " << eqCalls << " == calls\\n";
    }

    unordered_map<string, int> stock = {{"apple", 3}};
    cout << "size before reading a missing key: " << stock.size() << "\\n";
    int pears = stock["pear"];                             // operator[] INSERTS a 0
    cout << "stock[\\"pear\\"] = " << pears << ", size after: " << stock.size() << "\\n";
    cout << "find() does not insert: " << (stock.find("plum") == stock.end() ? "not found" : "found")
         << ", size: " << stock.size() << "\\n";
}
~~~

Output of \`g++ -std=c++17 main.cpp && ./a.out\`:

~~~text
100 colliding inserts -> 4950 == calls
200 colliding inserts -> 19900 == calls
400 colliding inserts -> 79800 == calls
size before reading a missing key: 1
stock["pear"] = 0, size after: 2
find() does not insert: not found, size: 2
~~~

- **A constant hash makes every operation O(n).** With all keys in one bucket, n inserts made exactly n(n − 1)/2 equality checks: 4,950, 19,900, 79,800. Doubling n quadrupled the work, the signature of O(n²) total. Real \`std::hash<int>\` and \`std::hash<std::string>\` spread keys out; for a custom key, combine the hashes of its fields.
- **\`operator[]\` inserts.** Reading \`stock["pear"]\` on a missing key *created* it with value 0, so the size went from 1 to 2. Use \`find\`, \`count\` or \`at\` (which throws on a missing key) when you only want to read. The same is true for \`std::map::operator[]\`.

## 7. The Same Operations with the C++ Standard Library

In an interview you use the library, not a hand-written table. Here are the same operations with the standard C++ tools, with the cost of each call in the comments:

~~~cpp
unordered_map<string, int> ages = {{"alice", 28}, {"bob", 31}, {"carol", 25}};  // hash table
ages["dave"] = 40;                                    // insert: O(1) average
ages.erase("dave");                                   // delete: O(1) average
cout << boolalpha << "hash map: age of bob = " << ages.at("bob")
     << ", has dave = " << (ages.count("dave") > 0) << "\\n";
vector<string> names;
for (const auto& [name, age] : ages) names.push_back(name);
sort(names.begin(), names.end());                     // iteration order is unspecified
cout << "hash map keys, sorted for printing: [" << names[0] << ", " << names[1] << ", " << names[2] << "]\\n";
~~~

~~~cpp
map<int, string> tree;                                // ordered map, a red-black tree in libstdc++
for (int k : {30, 10, 40, 20}) tree[k] = "v" + to_string(k);   // O(log n) each
vector<int> keys;
for (const auto& kv : tree) keys.push_back(kv.first); // in-order: sorted
cout << "ordered keys: " << fmt(keys.begin(), keys.end()) << "\\n";
auto up = tree.upper_bound(25);                       // first key > 25
int floor25 = prev(up)->first;                        // largest key <= 25 (exists here)
int ceil25 = tree.lower_bound(25)->first;             // smallest key >= 25
cout << "floor(25) = " << floor25 << ", ceiling(25) = " << ceil25 << "\\n";
cout << "smallest = " << tree.begin()->first << ", largest = " << tree.rbegin()->first << "\\n";
tree.erase(10);                                       // O(log n), no shifting
cout << "after removing 10: smallest = " << tree.begin()->first << ", size = " << tree.size() << "\\n";
~~~

~~~cpp
vector<int> arr = {10, 20, 30, 40};                   // a dynamic array
int third = arr[2];                                   // index: O(1)
arr.push_back(50);                                    // append: O(1) amortized
cout << "array: element at index 2 = " << third << ", after append: " << fmt(arr.begin(), arr.end()) << "\\n";
~~~

\`lower_bound(x)\` is the first key **>= x** (the ceiling) and \`upper_bound(x)\` the first key **> x**; stepping one back with \`prev\` gives the floor. Both are O(log n) member functions — calling the free function \`std::lower_bound\` on a map's iterators would be O(n), because map iterators are not random-access. \`unordered_map\` iteration order is unspecified, so the names are copied out and sorted before printing.

## 8. Verified: Running the Code

All three programs are the runnable examples under "C++ code" on this page, run with \`g++ -std=c++17 main.cpp && ./a.out\`.

**Example 1 — array shifts, searches and hash buckets:**

~~~text
dynamic array, n=1000:
  1000 inserts at the end   -> 0 element shifts
  1000 inserts at the front -> 499500 element shifts
search among n=100000 keys (comparisons made):
  linear scan, missing key   = 100000
  binary search, missing key = 17
  hash table, missing key    = 0
  hash table, present key    = 1
hash table worst case, 1000 keys in one bucket = 1000
~~~

The front inserts cost 499,500 shifts against 0 for the end — the O(n) vs O(1) difference, repeated 1,000 times. For the search, binary search needed 17 comparisons (⌊log₂ 100,000⌋ + 1), the hash table at most 1, and the linear scan all 100,000. The last line is the hash-table worst case: 1,000 comparisons when every key shares a bucket.

**Example 2 — balanced vs unbalanced BST:**

~~~text
binary search tree with 1000 keys:
  inserted in sorted order -> height 1000, find max: 1000 comparisons
  inserted middle-first    -> height 10, find max: 10 comparisons
~~~

Same 1,000 keys, same code; only the insert order differs. Height 1,000 means O(n) per operation, height 10 means O(log n).

**Example 3 — the standard-library versions:**

~~~text
hash map: age of bob = 31, has dave = false
hash map keys, sorted for printing: [alice, bob, carol]
ordered keys: [10, 20, 30, 40]
floor(25) = 20, ceiling(25) = 30
smallest = 10, largest = 40
after removing 10: smallest = 20, size = 3
array: element at index 2 = 30, after append: [10, 20, 30, 40, 50]
~~~

## 9. How to Choose

| You need... | Use | Why |
| :--- | :--- | :--- |
| "Have I seen this before?", counting, grouping | Hash map / set | O(1) average lookups |
| Sorted order, nearest key, ranges, min and max with updates | Balanced BST | O(log n) for all of them |
| Access by position, iteration, the input itself | Array | O(1) index, compact memory |
| Only the smallest (or largest) item, repeatedly | Heap | O(log n) push/pop, O(1) peek |
| Searching a sorted array that does not change | Array + binary search | O(log n), no extra memory |

## 10. Edge Cases and Subtleties

- **"O(1)" hash map lookups still hash the key.** Hashing a string of length k costs O(k), so a lookup of a long string key is O(k), not free.
- **Amortized is not worst case.** One append that triggers a resize costs O(n). If a single operation must never be slow (real-time systems), that matters.
- **Small n.** For a handful of items, a linear scan over an array is often faster than a hash map or a tree because of memory locality and lower constants.
- **Sorted array vs tree.** If the data is built once and then only read, a sorted array with binary search beats a tree: same O(log n) search, less memory, no O(n) inserts after the build.
- **Deleting from the middle of an array** needs a search (O(n) unsorted, O(log n) sorted) *and* a shift (O(n)), so it is O(n) either way.

## Common Pitfalls

- **Reading a map with \`operator[]\`.** It inserts a default value for a missing key (size went from 1 to 2 above). Use \`find\` or \`count\`.
- **\`std::lower_bound\` on a \`std::map\`.** The free algorithm walks bidirectional iterators in O(n); call \`m.lower_bound(x)\` for O(log n).
- **Keeping iterators across \`push_back\`.** A reallocation invalidates every iterator and reference into the vector; reserve first or use indices.
- **Writing a weak custom hash.** A constant or low-quality hash turns \`unordered_map\` into an O(n) list per bucket (79,800 comparisons for 400 inserts above).
- **Erasing from the front of a vector in a loop.** Each \`erase(begin())\` is O(n); use \`std::deque\` or iterate from the back.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Arrays:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> gives O(1) indexing and O(1) amortized <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code>, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">erase</code> at the front or middle is O(n) because elements move; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::find</code> is O(n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Hash maps:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::unordered_map</code> gives O(1) average <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">erase</code>, O(n) worst case when keys collide, and an unspecified iteration order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Balanced trees:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::map</code> gives O(log n) <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">erase</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lower_bound</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">upper_bound</code>, and sorted iteration; libstdc++ implements it as a red-black tree.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. C++ specifics:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> inserts missing keys, the member <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lower_bound</code> is O(log n) but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::lower_bound</code> on map iterators is O(n), and vector reallocation invalidates iterators.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Choosing:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> for pure lookups, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::map</code> when I need order or ranges, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> when I need index access or cache-friendly iteration.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::map</code> a better choice than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unordered_map</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When I need ordered keys or nearest-key queries with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lower_bound</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">upper_bound</code>, or a guaranteed O(log n) worst case instead of an O(n) worst case. For small maps, the difference in constants often matters more than Big-O.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the worst case of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unordered_map::find</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Linear in the size, when many keys fall into the same bucket. I measured exactly n(n-1)/2 equality checks for n inserts with a constant hash.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">m[key]</code> be a bug in a read-only function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It inserts a default-constructed value when the key is missing, changing the map and its size, and it does not compile on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> map. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">at</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">push_back</code> cost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Amortized O(1). An individual call that exceeds capacity reallocates and moves all elements, O(n), and invalidates every iterator into the vector.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get floor and ceiling from a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::set</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.lower_bound(x)</code> is the ceiling; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.upper_bound(x)</code> stepped back with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prev</code> is the floor, after checking it is not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">begin()</code>. Both are O(log n).</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Array (dynamic array)** | Items side by side in memory; grows when full |
| **Random access** | Reaching any index in O(1) |
| **Hash map (hash table)** | Key → hash → bucket; O(1) average operations |
| **Collision** | Two keys in the same bucket |
| **Load factor** | Entries divided by buckets; triggers a resize when high |
| **Binary search tree (BST)** | Smaller keys left, larger keys right |
| **Height** | Levels from root to deepest leaf; BST cost is O(height) |
| **Balanced (self-balancing) tree** | BST that keeps its height O(log n), e.g. red-black or AVL |
| **Amortized O(1)** | Occasionally expensive, constant on average over a sequence |
| **Average vs worst case** | Typical cost vs the guaranteed maximum |
| **Iterator invalidation** | An iterator that no longer safely points into a container after a change |

**Conclusion:** Arrays give instant access by position but pay O(n) to make room in the middle; hash maps give O(1) average lookups but no order and an O(n) worst case; balanced trees give O(log n) for everything, including the ordered queries the other two cannot answer cheaply. The runs on this page put numbers on it: 499,500 shifts versus 0, 100,000 comparisons versus 17 versus 1, and a tree of height 1,000 versus 10 from nothing but insert order. In C++, the extra step is knowing which built-in type gives you which guarantee — and saying so before you write the first line.`,
        examples: [
          {
            label: "Count shifts and comparisons: array inserts, linear vs binary search, hash buckets",
            code: `#include <iostream>
#include <vector>
using namespace std;

// Count the real work behind array and hash-table operations.

int insertAt(vector<int>& buf, int size, int index, int value) {
    // Insert into a fixed buffer holding size items; return element shifts.
    int shifts = 0;
    for (int j = size; j > index; j--) {   // move everything after index right by one
        buf[j] = buf[j - 1];
        shifts++;
    }
    buf[index] = value;
    return shifts;
}

struct ChainedHashTable {
    vector<vector<int>> buckets;
    explicit ChainedHashTable(int count) : buckets(count) {}
    void put(int key) { buckets[key % buckets.size()].push_back(key); }
    int comparisonsToFind(int key) const {
        int compared = 0;
        for (int k : buckets[key % buckets.size()]) {  // one bucket only
            compared++;
            if (k == key) break;
        }
        return compared;
    }
};

int linearComparisons(const vector<int>& nums, int target) {
    int compared = 0;
    for (int x : nums) {
        compared++;
        if (x == target) break;
    }
    return compared;
}

int binaryComparisons(const vector<int>& nums, int target) {
    int compared = 0, lo = 0, hi = (int) nums.size() - 1;
    while (lo <= hi) {
        compared++;
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) break;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return compared;
}

int main() {
    int n = 1000;
    vector<int> buf(n);
    int size = 0, front = 0, back = 0;
    for (int v = 0; v < n; v++) { front += insertAt(buf, size, 0, v); size++; }
    buf.assign(n, 0);
    size = 0;
    for (int v = 0; v < n; v++) { back += insertAt(buf, size, size, v); size++; }
    cout << "dynamic array, n=1000:\\n";
    cout << "  1000 inserts at the end   -> " << back << " element shifts\\n";
    cout << "  1000 inserts at the front -> " << front << " element shifts\\n";

    n = 100000;
    vector<int> nums(n);
    ChainedHashTable table(100003);
    for (int i = 0; i < n; i++) { nums[i] = i; table.put(i); }
    cout << "search among n=100000 keys (comparisons made):\\n";
    cout << "  linear scan, missing key   = " << linearComparisons(nums, n) << "\\n";
    cout << "  binary search, missing key = " << binaryComparisons(nums, n) << "\\n";
    cout << "  hash table, missing key    = " << table.comparisonsToFind(n) << "\\n";
    cout << "  hash table, present key    = " << table.comparisonsToFind(54321) << "\\n";

    ChainedHashTable bad(100003);
    for (int k = 0; k < 1000; k++) bad.put(k * 100003);   // every key lands in bucket 0
    cout << "hash table worst case, 1000 keys in one bucket = " << bad.comparisonsToFind(1000 * 100003) << "\\n";
    return 0;
}`,
          },
          {
            label: "Balanced vs unbalanced binary search tree: height and lookup cost",
            code: `#include <algorithm>
#include <iostream>
#include <memory>
#include <utility>
#include <vector>
using namespace std;

// A binary search tree is only O(log n) when it stays balanced. Count it.

struct Node {
    int key;
    Node* left = nullptr;
    Node* right = nullptr;
    explicit Node(int k) : key(k) {}
};

Node* bstInsert(Node* root, Node* node) {        // iterative: no stack depth to worry about
    if (root == nullptr) return node;
    Node* cur = root;
    while (true) {
        if (node->key < cur->key) {
            if (cur->left == nullptr) { cur->left = node; return root; }
            cur = cur->left;
        } else {
            if (cur->right == nullptr) { cur->right = node; return root; }
            cur = cur->right;
        }
    }
}

int comparisonsToFind(const Node* root, int key) {
    int compared = 0;
    const Node* cur = root;
    while (cur != nullptr) {
        compared++;
        if (key == cur->key) return compared;
        cur = key < cur->key ? cur->left : cur->right;
    }
    return compared;
}

void middleFirst(int lo, int hi, vector<int>& out) {   // order that keeps the tree balanced
    if (lo > hi) return;
    int mid = lo + (hi - lo) / 2;
    out.push_back(mid);
    middleFirst(lo, mid - 1, out);
    middleFirst(mid + 1, hi, out);
}

int height(const Node* root) {
    int best = 0;
    vector<pair<const Node*, int>> stack;
    if (root) stack.push_back({root, 1});
    while (!stack.empty()) {
        auto [node, d] = stack.back();
        stack.pop_back();
        best = max(best, d);
        if (node->left) stack.push_back({node->left, d + 1});
        if (node->right) stack.push_back({node->right, d + 1});
    }
    return best;
}

int main() {
    vector<unique_ptr<Node>> pool;                   // owns every node, frees them at the end
    auto make = [&](int k) { pool.push_back(make_unique<Node>(k)); return pool.back().get(); };

    Node* sortedRoot = nullptr;
    for (int k = 0; k < 1000; k++) sortedRoot = bstInsert(sortedRoot, make(k));
    vector<int> order;
    middleFirst(0, 999, order);
    Node* balancedRoot = nullptr;
    for (int k : order) balancedRoot = bstInsert(balancedRoot, make(k));
    cout << "binary search tree with 1000 keys:\\n";
    cout << "  inserted in sorted order -> height " << height(sortedRoot) << ", find max: " << comparisonsToFind(sortedRoot, 999) << " comparisons\\n";
    cout << "  inserted middle-first    -> height " << height(balancedRoot) << ", find max: " << comparisonsToFind(balancedRoot, 999) << " comparisons\\n";
    return 0;
}`,
          },
          {
            label: "The standard-library structures and what each call costs",
            code: `#include <algorithm>
#include <iostream>
#include <map>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

// The standard C++ tools for each structure, and what each call costs.

template <typename It>
string fmt(It first, It last) {
    string s = "[";
    for (It it = first; it != last; ++it) {
        if (it != first) s += ", ";
        s += to_string(*it);
    }
    return s + "]";
}

int main() {
    unordered_map<string, int> ages = {{"alice", 28}, {"bob", 31}, {"carol", 25}};  // hash table
    ages["dave"] = 40;                                    // insert: O(1) average
    ages.erase("dave");                                   // delete: O(1) average
    cout << boolalpha << "hash map: age of bob = " << ages.at("bob")
         << ", has dave = " << (ages.count("dave") > 0) << "\\n";
    vector<string> names;
    for (const auto& [name, age] : ages) names.push_back(name);
    sort(names.begin(), names.end());                     // iteration order is unspecified
    cout << "hash map keys, sorted for printing: [" << names[0] << ", " << names[1] << ", " << names[2] << "]\\n";

    map<int, string> tree;                                // ordered map, a red-black tree in libstdc++
    for (int k : {30, 10, 40, 20}) tree[k] = "v" + to_string(k);   // O(log n) each
    vector<int> keys;
    for (const auto& kv : tree) keys.push_back(kv.first); // in-order: sorted
    cout << "ordered keys: " << fmt(keys.begin(), keys.end()) << "\\n";
    auto up = tree.upper_bound(25);                       // first key > 25
    int floor25 = prev(up)->first;                        // largest key <= 25 (exists here)
    int ceil25 = tree.lower_bound(25)->first;             // smallest key >= 25
    cout << "floor(25) = " << floor25 << ", ceiling(25) = " << ceil25 << "\\n";
    cout << "smallest = " << tree.begin()->first << ", largest = " << tree.rbegin()->first << "\\n";
    tree.erase(10);                                       // O(log n), no shifting
    cout << "after removing 10: smallest = " << tree.begin()->first << ", size = " << tree.size() << "\\n";

    vector<int> arr = {10, 20, 30, 40};                   // a dynamic array
    int third = arr[2];                                   // index: O(1)
    arr.push_back(50);                                    // append: O(1) amortized
    cout << "array: element at index 2 = " << third << ", after append: " << fmt(arr.begin(), arr.end()) << "\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is space complexity, and how much stack space does recursion use?",
    difficulty: "easy",
    seoDescription: "Space complexity from zero: auxiliary space, the call stack, why recursion depth (not call count) sets stack use, and each language stack limit, verified.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"We talk a lot about time complexity. What is space complexity? And if I write a recursive function in Python, how much memory does the recursion itself use — for example for a recursive sum, a recursive binary search and naive Fibonacci?"

**What a strong answer should cover:**
- Space complexity is how extra memory grows with n; distinguish auxiliary space (extra) from total space (including the input), and say whether the output counts.
- Each active call occupies a stack frame, so recursion costs O(maximum recursion depth) stack space — not O(number of calls).
- Worked examples: recursive sum O(n) stack, recursive binary search O(log n), naive Fibonacci O(2ⁿ) time but O(n) stack, DFS O(height).
- Converting deep recursion to a loop or an explicit stack, and in-place algorithms with O(1) extra space.
- Python specifics: the default recursion limit of 1000 (\`RecursionError\`), no tail-call elimination in CPython, and slicing (\`nums[1:]\`) copying memory at every level.

**Code / implementation expected:** Yes — a recursive function and its iterative or explicit-stack rewrite in Python, with the stack depth stated.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a function call and a loop are.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every depth, count and error message on this page comes from running the Python code shown; the **Verified** section quotes that output. This page assumes you know [Big-O notation](/interview-question/what-is-big-o-notation); recursion itself is introduced on [what recursion and a base case are](/interview-question/what-is-recursion-and-what-is-a-base-case).

## 1. Why This Even Matters — A Story First

You are reading a recipe. Step 3 says "make the sauce (see page 40)". You put a sticky note on step 3 so you remember where you were, and turn to page 40. Page 40 says "first make the stock (see page 72)". Another sticky note, turn to page 72. When the stock is done you peel off the top note and go back to page 40; when the sauce is done you peel the next one and go back to step 3.

The pile of sticky notes is the **call stack**. Every function call that has started but not finished leaves one note behind. The notes are small, but they are not free, and the pile has a maximum height. A recipe that sends you 10,000 pages deep before anything finishes needs 10,000 notes at once.

Space complexity asks the same question as time complexity, about memory: "as the input grows, how much *extra* memory does this algorithm need?" Recursion is where people most often get the answer wrong, because the memory is hidden in those sticky notes.

## 2. Space Complexity in Plain Language

📌 **Interview term: Space complexity** — how the memory an algorithm needs grows as the input size n grows, written in Big-O.

📌 **Interview term: Auxiliary space** — the **extra** memory beyond the input: temporary arrays, hash maps, and the call stack. When an interviewer asks "what is the space complexity?", they almost always mean auxiliary space. Say which one you mean, and say whether the output counts.

📌 **Interview term: In-place algorithm** — one that rearranges the input using only O(1) extra memory, like reversing an array with two pointers.

Some quick examples:

| Code | Auxiliary space | Why |
| :--- | :--- | :--- |
| Sum a list with a loop | O(1) | one running total |
| Reverse a list in place with two pointers | O(1) | two indices and one temporary |
| Build a reversed copy | O(n) | a new list of n items |
| Count frequencies in a hash map | O(k) | one entry per distinct value, at most n |
| Prefix-sum array | O(n) | one number per position |
| 2D DP table for two strings of length n and m | O(n · m) | one cell per pair |

## 3. Where Recursion Hides Memory: the Call Stack

📌 **Interview term: Call stack** — the region of memory where the program keeps one record for every function call that has started and not yet returned. It is last-in, first-out: the most recent call finishes first.

📌 **Interview term: Stack frame** — that record: the call's parameters, local variables and where to return to. Its size is a constant for a given function.

📌 **Interview term: Recursion depth** — the largest number of frames of the recursive function alive at the same moment.

So the rule is:

> **Stack space of a recursion = (maximum recursion depth) × (frame size) = O(maximum depth).**

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="The call stack at the deepest point of sum of 3 holds four frames">
  <text class="d-text" x="380" y="26" text-anchor="middle">Call stack at the deepest point of sum(3)</text>
  <rect class="d-box-accent" x="250" y="56" width="260" height="50" rx="8"/>
  <text class="d-text d-accent" x="380" y="86" text-anchor="middle">sum(0): base case, returns 0</text>
  <rect class="d-box-muted" x="250" y="118" width="260" height="50" rx="8"/>
  <text class="d-text" x="380" y="148" text-anchor="middle">sum(1): waiting for sum(0)</text>
  <rect class="d-box-muted" x="250" y="180" width="260" height="50" rx="8"/>
  <text class="d-text" x="380" y="210" text-anchor="middle">sum(2): waiting for sum(1)</text>
  <rect class="d-box-muted" x="250" y="242" width="260" height="50" rx="8"/>
  <text class="d-text" x="380" y="272" text-anchor="middle">sum(3): waiting for sum(2)</text>
  <text class="d-sub" x="560" y="86">top: runs now</text>
  <text class="d-sub" x="560" y="272">bottom: first call</text>
</svg>

\`sum(n)\` needs n + 1 frames at its deepest point, so it uses O(n) stack even though it never creates a list. The measured run below shows 501 frames for \`sum(500)\`.

📌 **Interview term: Stack overflow** — running out of call-stack memory because the recursion went too deep. How Python reports it is covered in section 5.

### Depth, not number of calls

This is the point most candidates miss. Naive Fibonacci calls itself twice per call, so \`fib(20)\` makes 21,891 calls — but they are not all alive at once. When \`fib(19)\` returns, all of its frames are gone before \`fib(18)\` starts. At any moment, only one root-to-leaf path of the call tree is on the stack.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Call tree of fib of 4 with only one path on the stack at a time">
  <text class="d-text" x="380" y="26" text-anchor="middle">fib(4): 9 calls, at most 4 frames alive at once</text>
  <rect class="d-box-accent" x="330" y="50" width="100" height="40" rx="8"/>
  <text class="d-text d-accent" x="380" y="76" text-anchor="middle">fib(4)</text>
  <path class="d-edge-accent" d="M 360 90 L 220 128"/>
  <path class="d-edge" d="M 400 90 L 540 128"/>
  <rect class="d-box-accent" x="170" y="128" width="100" height="40" rx="8"/>
  <text class="d-text d-accent" x="220" y="154" text-anchor="middle">fib(3)</text>
  <rect class="d-box-muted" x="490" y="128" width="100" height="40" rx="8"/>
  <text class="d-text" x="540" y="154" text-anchor="middle">fib(2)</text>
  <path class="d-edge-accent" d="M 200 168 L 120 204"/>
  <path class="d-edge" d="M 240 168 L 320 204"/>
  <path class="d-edge" d="M 520 168 L 470 204"/>
  <path class="d-edge" d="M 560 168 L 610 204"/>
  <rect class="d-box-accent" x="70" y="204" width="100" height="40" rx="8"/>
  <text class="d-text d-accent" x="120" y="230" text-anchor="middle">fib(2)</text>
  <rect class="d-box-muted" x="270" y="204" width="100" height="40" rx="8"/>
  <text class="d-text" x="320" y="230" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="420" y="204" width="100" height="40" rx="8"/>
  <text class="d-text" x="470" y="230" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="560" y="204" width="100" height="40" rx="8"/>
  <text class="d-text" x="610" y="230" text-anchor="middle">fib(0)</text>
  <path class="d-edge-accent" d="M 100 244 L 60 266"/>
  <path class="d-edge" d="M 140 244 L 180 266"/>
  <text class="d-sub d-accent" x="60" y="284" text-anchor="middle">fib(1)</text>
  <text class="d-sub" x="180" y="284" text-anchor="middle">fib(0)</text>
</svg>

The highlighted path is what the stack holds at its deepest: fib(4), fib(3), fib(2), fib(1) — four frames for fib(4). In general, naive Fibonacci is **O(2ⁿ) time but only O(n) stack space**.

Common recursions and their stack space:

| Recursion | Max depth | Stack space |
| :--- | :--- | :--- |
| \`sum(n) = n + sum(n − 1)\` | n + 1 | O(n) |
| Binary search on n items | about log₂ n | O(log n) |
| Naive Fibonacci \`fib(n)\` | n | O(n) — even though time is O(2ⁿ) |
| DFS on a tree of height h | h | O(h): O(log n) balanced, O(n) for a chain |
| Merge sort | log₂ n | O(log n) stack + O(n) merge buffer = O(n) |
| Quicksort | log n on average, n in the worst case | O(log n) average, O(n) worst |
| Generating all subsets of n items | n | O(n) stack (plus the output itself) |

## 4. The Rule in Code

Here are the three recursions from the table, instrumented with \`enter()\` / \`leave()\` helpers that track the current and maximum depth. They are the core of the first runnable example:

~~~python
def sum_recursive(n):          # O(n) stack: n frames are alive at the deepest point
    enter()
    result = 0 if n == 0 else n + sum_recursive(n - 1)
    leave()
    return result

def sum_iterative(n):          # O(1) stack: one frame, one running total
    enter()
    total = 0
    for i in range(1, n + 1):
        total += i
    leave()
    return total
~~~

~~~python
def bsearch(nums, target, lo, hi):   # O(log n) stack: the range halves per call
    enter()
    if lo > hi:
        found = False
    else:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            found = True
        elif nums[mid] < target:
            found = bsearch(nums, target, mid + 1, hi)
        else:
            found = bsearch(nums, target, lo, mid - 1)
    leave()
    return found
~~~

~~~python
calls = 0
def fib(n):                    # O(2^n) time, but only O(n) stack
    global calls
    calls += 1
    enter()
    result = n if n < 2 else fib(n - 1) + fib(n - 2)
    leave()
    return result
~~~

The iterative sum uses one frame however large n gets; the recursive one keeps n + 1 frames waiting for the ones above them to return.

📌 **Interview term: Tail call** — a call that is the very last thing a function does (\`return f(n − 1, acc + n)\`). Some languages reuse the current frame for it (**tail-call optimisation**), turning the recursion into a loop with O(1) stack. Whether Python does that is answered by running it, in the next section.

## 5. The Stack Limit in Python

CPython does not let recursion run until the operating system's stack runs out. It counts frames and stops at a **recursion limit**. This snippet prints the limit, recurses under it and over it, and tries a tail-recursive version:

~~~python
import sys

def sum_to(n):                       # n + 1 frames deep
    return 0 if n == 0 else n + sum_to(n - 1)

def tail_sum(n, acc=0):              # tail-recursive: the call is the last thing it does
    return acc if n == 0 else tail_sum(n - 1, acc + n)

print("default recursion limit:", sys.getrecursionlimit())
print("sum_to(900) =", sum_to(900))
try:
    sum_to(5000)
except RecursionError as e:
    print("sum_to(5000) -> RecursionError:", e)
try:
    tail_sum(5000)
except RecursionError:
    print("tail_sum(5000) -> RecursionError too: CPython does not remove tail calls")
~~~

Output of \`python3 main.py\`:

~~~text
default recursion limit: 1000
sum_to(900) = 405450
sum_to(5000) -> RecursionError: maximum recursion depth exceeded
tail_sum(5000) -> RecursionError too: CPython does not remove tail calls
~~~

What the run shows:

- The default limit on this Python 3.13 run was **1000** frames (\`sys.getrecursionlimit()\`). \`sum_to(900)\` fits; \`sum_to(5000)\` raises \`RecursionError\`, a normal exception you can catch.
- The tail-recursive \`tail_sum\` fails too. CPython does **not** perform tail-call elimination, so writing the call last saves nothing. Any recursion deeper than about a thousand levels has to become a loop or use an explicit stack.
- \`sys.setrecursionlimit(n)\` raises the limit, but the frames still use real memory; pushing it very high can crash the interpreter instead of raising a clean error. In an interview, the safer answer is "I will make it iterative".

This is why, in Python, O(n) stack space is not just a Big-O remark: a recursive DFS on a path-shaped graph of 10,000 nodes simply fails.

## 6. Getting Rid of the Stack: Loops and Explicit Stacks

Two techniques remove the call-stack cost:

1. **A plain loop** when each call only depends on the next one (sum, factorial, binary search). That brings the stack down to O(1).
2. **An explicit stack** — a list you push and pop yourself — when the recursion branches (tree and graph walks). The memory moves from the small call stack to the much larger heap, and you control it.

Here is an in-place reversal next to a copying one, and a depth-first walk that uses its own stack:

~~~python
def reverse_in_place(a):       # O(1) extra: two indices and one temporary
    i, j = 0, len(a) - 1
    while i < j:
        a[i], a[j] = a[j], a[i]
        i += 1
        j -= 1
    return 0                   # extra element slots used

def reversed_copy(a):          # O(n) extra: a whole new list
    out = []
    for k in range(len(a) - 1, -1, -1):
        out.append(a[k])
    return out, len(out)       # extra element slots used
~~~

~~~python
def count_nodes(n, children):
    """Depth-first walk with our own stack instead of the call stack."""
    stack, seen, peak = [0], 0, 1
    while stack:
        node = stack.pop()
        seen += 1
        for child in children(node, n):
            stack.append(child)
        peak = max(peak, len(stack))
    return seen, peak

def chain(i, n):               # 0 -> 1 -> 2 -> ... : depth n
    return [i + 1] if i + 1 < n else []

def balanced(i, n):            # heap layout: children of i are 2i+1 and 2i+2
    return [c for c in (2 * i + 1, 2 * i + 2) if c < n]
~~~

On a 100,000-node chain, a recursive walk would need 100,000 frames, far beyond the limits shown in section 5. The explicit stack never held more than **1** entry, because each node is popped before its child is pushed. On a balanced tree of height 17, it peaked at 17 entries: an explicit-stack DFS stores pending nodes, about one per level here, so its memory is still O(height), just on the heap. (The same walk in breadth-first order is on the [BFS vs DFS page](/interview-question/what-is-the-difference-between-bfs-and-dfs).)

Python detail: a \`list\` stores references, so \`[0] * n\` is one block of n pointers, O(n). Slicing (\`nums[1:]\`) makes a **new** list. A recursive function that passes \`nums[1:]\` down keeps every slice alive along the current path: n + (n − 1) + … + 1 elements, which is **O(n²)** memory for an O(n)-depth recursion. Pass indices instead.

## 7. Verified: Running the Code

Both programs are the runnable examples under "Python code" on this page, run with \`python3 main.py\`.

**Example 1 — stack depth of recursive vs iterative code:**

~~~text
sum 1..500 recursive: 125250, max stack depth 501
sum 1..500 iterative: 125250, max stack depth 1
binary search over 1000000 items: found=true, max stack depth 20
fib(20) naive: 6765, calls 21891, max stack depth 20
~~~

\`sum(500)\` reached **501** frames (500 down to the base case 0), the loop **1**. Binary search over a million items needed only **20** frames, because the range halves per call. And \`fib(20)\` made **21,891** calls but never had more than **20** frames alive: exponential time, linear stack.

**Example 2 — extra space and the explicit stack:**

~~~text
reverse in place: [5, 4, 3, 2, 1], extra slots 0
reversed copy:    [5, 4, 3, 2, 1], extra slots 5
chain of 100000 nodes: visited 100000, peak explicit stack 1
balanced tree of 131071 nodes (height 17): visited 131071, peak explicit stack 17
~~~

Same reversed output, but the in-place version used 0 extra slots and the copy 5 (O(1) vs O(n)). The explicit-stack walk visited all 100,000 chain nodes with a stack of 1, and all 131,071 nodes of the balanced tree with a stack that peaked at 17.

## 8. Complexity of the Examples

| Function | Time | Stack space | Other extra space |
| :--- | :--- | :--- | :--- |
| recursive sum | O(n) | O(n) | O(1) |
| iterative sum | O(n) | O(1) | O(1) |
| recursive binary search | O(log n) | O(log n) | O(1) |
| naive \`fib(n)\` | O(2ⁿ) | O(n) | O(1) |
| reverse in place | O(n) | O(1) | O(1) |
| reversed copy | O(n) | O(1) | O(n) |
| explicit-stack DFS | O(n) | O(1) | O(h) to O(n) for the explicit stack |

## 9. Edge Cases and Subtleties

- **Memoisation trades space for time.** Caching \`fib\` results makes it O(n) time but adds an O(n) cache on top of the O(n) stack. Space is still O(n), but the constant doubles.
- **Output space.** Generating all subsets returns 2ⁿ lists; that is O(n · 2ⁿ) output even though the recursion stack is only O(n). State both.
- **The input can count.** "Total space" includes the input; "auxiliary space" does not. A function that sorts a copy of the input uses O(n) auxiliary space, while one that sorts in place may use only O(log n) for the recursion.
- **Two recursive calls do not double the depth.** \`f(n − 1) + f(n − 1)\` doubles the *time* per level, but the depth is still n.
- **Garbage counts while it is reachable.** Temporary objects that are still referenced (by a frame, a closure or a cache) are part of the algorithm's memory at that moment.

## Common Pitfalls

- **Counting calls instead of depth.** Naive \`fib(20)\` made 21,891 calls but never had more than 20 frames alive: the stack space is O(n), the time O(2ⁿ).
- **Recursing deeper than about 1,000 levels.** The default limit raises \`RecursionError\` (seen at 5,000 above); convert to a loop or an explicit stack.
- **Expecting tail recursion to help.** CPython does not eliminate tail calls; \`tail_sum(5000)\` failed exactly like the normal version.
- **Passing slices down a recursion.** \`f(nums[1:])\` copies at every level, O(n²) total memory and time; pass \`lo\`/\`hi\` indices.
- **Forgetting the output.** Returning a new list of n items is O(n) space even if the algorithm is otherwise in place; say whether you count the output.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">Space complexity is how the extra memory an algorithm needs grows with n; usually we count auxiliary space, not the input itself.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursion:</strong> <span style="color:#f0e2c8;">Every active call holds a stack frame, so recursion uses O(maximum depth) stack space, not O(number of calls).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Examples:</strong> <span style="color:#f0e2c8;">Recursive sum is O(n) stack, recursive binary search O(log n), naive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(n)</code> O(n) stack despite O(2^n) calls; I measured 20 frames for 21,891 calls of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(20)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Python specifics:</strong> <span style="color:#f0e2c8;">CPython stops at a recursion limit of 1000 by default and raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RecursionError</code>, and it does not eliminate tail calls, so deep recursion must become a loop.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The fix:</strong> <span style="color:#f0e2c8;">Replace the call stack with an explicit list used as a stack, or rewrite as a loop; in-place two-pointer code gets extra space down to O(1).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the space complexity of merge sort?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n) auxiliary for the merge buffers plus O(log n) stack for the recursion, so O(n) overall. In Python, slicing-based merge sort also allocates new lists at every level.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the stack space of naive Fibonacci O(n) and not O(2^n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only one root-to-leaf path of the call tree is on the stack at a time: when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(n-1)</code> returns, its frames are gone before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(n-2)</code> starts. The deepest path has n frames.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you just raise <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sys.setrecursionlimit</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You can, but frames still use memory and a very high limit can crash the interpreter with a real stack overflow. It is a patch; an explicit stack is the robust fix.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a recursive DFS on a tree O(n) space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is O(h), the height. For a balanced tree that is O(log n); for a path-shaped tree it is O(n), which in Python fails past about 1,000 levels.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does an in-place algorithm use O(1) space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if it also avoids recursion and copies. In-place quicksort still uses O(log n) stack on average and O(n) in the worst case.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Space complexity** | How memory use grows with n |
| **Auxiliary space** | Extra memory beyond the input |
| **In-place algorithm** | Rearranges the input with O(1) extra memory |
| **Call stack** | Last-in, first-out record of unfinished calls |
| **Stack frame** | One call's parameters, locals and return address |
| **Recursion depth** | Most frames of the function alive at once |
| **Stack overflow** | Running out of call-stack memory |
| **Tail call / tail-call optimisation** | A call made last; reusing its frame so recursion uses O(1) stack |
| **Recursion limit** | CPython frame cap (1000 by default) that raises \`RecursionError\` |

**Conclusion:** Space complexity is the memory version of Big-O, and recursion is where its hidden part lives: every unfinished call is a frame on the call stack, so a recursion costs O(maximum depth) stack space — 501 frames for \`sum(500)\`, 20 for a binary search over a million items, and 20 for \`fib(20)\` despite its 21,891 calls. In Python, that stack is limited, as the run in section 5 showed, so the practical skill is to keep recursion depth logarithmic or to replace it with a loop or an explicit stack, and to state both the time and the space of whatever you write.`,
        examples: [
          {
            label: "Measure the call-stack depth of recursive and iterative code",
            code: `# Measure how deep the call stack gets: the space cost of recursion.

depth = 0       # frames of our function currently on the stack
max_depth = 0   # the most there ever were at once

def enter():
    global depth, max_depth
    depth += 1
    max_depth = max(max_depth, depth)

def leave():
    global depth
    depth -= 1

def reset():
    global depth, max_depth
    depth = max_depth = 0

def sum_recursive(n):          # O(n) stack: n frames are alive at the deepest point
    enter()
    result = 0 if n == 0 else n + sum_recursive(n - 1)
    leave()
    return result

def sum_iterative(n):          # O(1) stack: one frame, one running total
    enter()
    total = 0
    for i in range(1, n + 1):
        total += i
    leave()
    return total

def bsearch(nums, target, lo, hi):   # O(log n) stack: the range halves per call
    enter()
    if lo > hi:
        found = False
    else:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            found = True
        elif nums[mid] < target:
            found = bsearch(nums, target, mid + 1, hi)
        else:
            found = bsearch(nums, target, lo, mid - 1)
    leave()
    return found

calls = 0
def fib(n):                    # O(2^n) time, but only O(n) stack
    global calls
    calls += 1
    enter()
    result = n if n < 2 else fib(n - 1) + fib(n - 2)
    leave()
    return result

reset(); r = sum_recursive(500)
print("sum 1..500 recursive: " + str(r) + ", max stack depth " + str(max_depth))
reset(); r = sum_iterative(500)
print("sum 1..500 iterative: " + str(r) + ", max stack depth " + str(max_depth))

nums = list(range(1000000))
reset(); found = bsearch(nums, 999999, 0, len(nums) - 1)
print("binary search over 1000000 items: found=" + str(found).lower() + ", max stack depth " + str(max_depth))

reset(); calls = 0; r = fib(20)
print("fib(20) naive: " + str(r) + ", calls " + str(calls) + ", max stack depth " + str(max_depth))`,
          },
          {
            label: "O(1) vs O(n) extra space, and replacing recursion with an explicit stack",
            code: `# Same answers, different memory: O(1) vs O(n) extra space, and an explicit stack.

def fmt(items):
    return "[" + ", ".join(str(x) for x in items) + "]"

def reverse_in_place(a):       # O(1) extra: two indices and one temporary
    i, j = 0, len(a) - 1
    while i < j:
        a[i], a[j] = a[j], a[i]
        i += 1
        j -= 1
    return 0                   # extra element slots used

def reversed_copy(a):          # O(n) extra: a whole new list
    out = []
    for k in range(len(a) - 1, -1, -1):
        out.append(a[k])
    return out, len(out)       # extra element slots used

def count_nodes(n, children):
    """Depth-first walk with our own stack instead of the call stack."""
    stack, seen, peak = [0], 0, 1
    while stack:
        node = stack.pop()
        seen += 1
        for child in children(node, n):
            stack.append(child)
        peak = max(peak, len(stack))
    return seen, peak

def chain(i, n):               # 0 -> 1 -> 2 -> ... : depth n
    return [i + 1] if i + 1 < n else []

def balanced(i, n):            # heap layout: children of i are 2i+1 and 2i+2
    return [c for c in (2 * i + 1, 2 * i + 2) if c < n]

a = [1, 2, 3, 4, 5]
extra = reverse_in_place(a)
print("reverse in place: " + fmt(a) + ", extra slots " + str(extra))
out, extra = reversed_copy([1, 2, 3, 4, 5])
print("reversed copy:    " + fmt(out) + ", extra slots " + str(extra))

seen, peak = count_nodes(100000, chain)
print("chain of 100000 nodes: visited " + str(seen) + ", peak explicit stack " + str(peak))
seen, peak = count_nodes(131071, balanced)
print("balanced tree of 131071 nodes (height 17): visited " + str(seen) + ", peak explicit stack " + str(peak))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"We talk a lot about time complexity. What is space complexity? And if I write a recursive function in JavaScript, how much memory does the recursion itself use — for example for a recursive sum, a recursive binary search and naive Fibonacci?"

**What a strong answer should cover:**
- Space complexity is how extra memory grows with n; distinguish auxiliary space (extra) from total space (including the input), and say whether the output counts.
- Each active call occupies a stack frame, so recursion costs O(maximum recursion depth) stack space — not O(number of calls).
- Worked examples: recursive sum O(n) stack, recursive binary search O(log n), naive Fibonacci O(2ⁿ) time but O(n) stack, DFS O(height).
- Converting deep recursion to a loop or an explicit stack, and in-place algorithms with O(1) extra space.
- JavaScript specifics: \`RangeError: Maximum call stack size exceeded\` (about 10,000 frames in Node.js 22), no tail-call elimination in V8, and \`slice\`/spread copying memory at every level.

**Code / implementation expected:** Yes — a recursive function and its iterative or explicit-stack rewrite in JavaScript, with the stack depth stated.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a function call and a loop are.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every depth, count and error message on this page comes from running the JavaScript code shown; the **Verified** section quotes that output. This page assumes you know [Big-O notation](/interview-question/what-is-big-o-notation); recursion itself is introduced on [what recursion and a base case are](/interview-question/what-is-recursion-and-what-is-a-base-case).

## 1. Why This Even Matters — A Story First

You are reading a recipe. Step 3 says "make the sauce (see page 40)". You put a sticky note on step 3 so you remember where you were, and turn to page 40. Page 40 says "first make the stock (see page 72)". Another sticky note, turn to page 72. When the stock is done you peel off the top note and go back to page 40; when the sauce is done you peel the next one and go back to step 3.

The pile of sticky notes is the **call stack**. Every function call that has started but not finished leaves one note behind. The notes are small, but they are not free, and the pile has a maximum height. A recipe that sends you 10,000 pages deep before anything finishes needs 10,000 notes at once.

Space complexity asks the same question as time complexity, about memory: "as the input grows, how much *extra* memory does this algorithm need?" Recursion is where people most often get the answer wrong, because the memory is hidden in those sticky notes.

## 2. Space Complexity in Plain Language

📌 **Interview term: Space complexity** — how the memory an algorithm needs grows as the input size n grows, written in Big-O.

📌 **Interview term: Auxiliary space** — the **extra** memory beyond the input: temporary arrays, hash maps, and the call stack. When an interviewer asks "what is the space complexity?", they almost always mean auxiliary space. Say which one you mean, and say whether the output counts.

📌 **Interview term: In-place algorithm** — one that rearranges the input using only O(1) extra memory, like reversing an array with two pointers.

Some quick examples:

| Code | Auxiliary space | Why |
| :--- | :--- | :--- |
| Sum a list with a loop | O(1) | one running total |
| Reverse a list in place with two pointers | O(1) | two indices and one temporary |
| Build a reversed copy | O(n) | a new list of n items |
| Count frequencies in a hash map | O(k) | one entry per distinct value, at most n |
| Prefix-sum array | O(n) | one number per position |
| 2D DP table for two strings of length n and m | O(n · m) | one cell per pair |

## 3. Where Recursion Hides Memory: the Call Stack

📌 **Interview term: Call stack** — the region of memory where the program keeps one record for every function call that has started and not yet returned. It is last-in, first-out: the most recent call finishes first.

📌 **Interview term: Stack frame** — that record: the call's parameters, local variables and where to return to. Its size is a constant for a given function.

📌 **Interview term: Recursion depth** — the largest number of frames of the recursive function alive at the same moment.

So the rule is:

> **Stack space of a recursion = (maximum recursion depth) × (frame size) = O(maximum depth).**

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="The call stack at the deepest point of sum of 3 holds four frames">
  <text class="d-text" x="380" y="26" text-anchor="middle">Call stack at the deepest point of sum(3)</text>
  <rect class="d-box-accent" x="250" y="56" width="260" height="50" rx="8"/>
  <text class="d-text d-accent" x="380" y="86" text-anchor="middle">sum(0): base case, returns 0</text>
  <rect class="d-box-muted" x="250" y="118" width="260" height="50" rx="8"/>
  <text class="d-text" x="380" y="148" text-anchor="middle">sum(1): waiting for sum(0)</text>
  <rect class="d-box-muted" x="250" y="180" width="260" height="50" rx="8"/>
  <text class="d-text" x="380" y="210" text-anchor="middle">sum(2): waiting for sum(1)</text>
  <rect class="d-box-muted" x="250" y="242" width="260" height="50" rx="8"/>
  <text class="d-text" x="380" y="272" text-anchor="middle">sum(3): waiting for sum(2)</text>
  <text class="d-sub" x="560" y="86">top: runs now</text>
  <text class="d-sub" x="560" y="272">bottom: first call</text>
</svg>

\`sum(n)\` needs n + 1 frames at its deepest point, so it uses O(n) stack even though it never creates a list. The measured run below shows 501 frames for \`sum(500)\`.

📌 **Interview term: Stack overflow** — running out of call-stack memory because the recursion went too deep. How JavaScript reports it is covered in section 5.

### Depth, not number of calls

This is the point most candidates miss. Naive Fibonacci calls itself twice per call, so \`fib(20)\` makes 21,891 calls — but they are not all alive at once. When \`fib(19)\` returns, all of its frames are gone before \`fib(18)\` starts. At any moment, only one root-to-leaf path of the call tree is on the stack.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Call tree of fib of 4 with only one path on the stack at a time">
  <text class="d-text" x="380" y="26" text-anchor="middle">fib(4): 9 calls, at most 4 frames alive at once</text>
  <rect class="d-box-accent" x="330" y="50" width="100" height="40" rx="8"/>
  <text class="d-text d-accent" x="380" y="76" text-anchor="middle">fib(4)</text>
  <path class="d-edge-accent" d="M 360 90 L 220 128"/>
  <path class="d-edge" d="M 400 90 L 540 128"/>
  <rect class="d-box-accent" x="170" y="128" width="100" height="40" rx="8"/>
  <text class="d-text d-accent" x="220" y="154" text-anchor="middle">fib(3)</text>
  <rect class="d-box-muted" x="490" y="128" width="100" height="40" rx="8"/>
  <text class="d-text" x="540" y="154" text-anchor="middle">fib(2)</text>
  <path class="d-edge-accent" d="M 200 168 L 120 204"/>
  <path class="d-edge" d="M 240 168 L 320 204"/>
  <path class="d-edge" d="M 520 168 L 470 204"/>
  <path class="d-edge" d="M 560 168 L 610 204"/>
  <rect class="d-box-accent" x="70" y="204" width="100" height="40" rx="8"/>
  <text class="d-text d-accent" x="120" y="230" text-anchor="middle">fib(2)</text>
  <rect class="d-box-muted" x="270" y="204" width="100" height="40" rx="8"/>
  <text class="d-text" x="320" y="230" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="420" y="204" width="100" height="40" rx="8"/>
  <text class="d-text" x="470" y="230" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="560" y="204" width="100" height="40" rx="8"/>
  <text class="d-text" x="610" y="230" text-anchor="middle">fib(0)</text>
  <path class="d-edge-accent" d="M 100 244 L 60 266"/>
  <path class="d-edge" d="M 140 244 L 180 266"/>
  <text class="d-sub d-accent" x="60" y="284" text-anchor="middle">fib(1)</text>
  <text class="d-sub" x="180" y="284" text-anchor="middle">fib(0)</text>
</svg>

The highlighted path is what the stack holds at its deepest: fib(4), fib(3), fib(2), fib(1) — four frames for fib(4). In general, naive Fibonacci is **O(2ⁿ) time but only O(n) stack space**.

Common recursions and their stack space:

| Recursion | Max depth | Stack space |
| :--- | :--- | :--- |
| \`sum(n) = n + sum(n − 1)\` | n + 1 | O(n) |
| Binary search on n items | about log₂ n | O(log n) |
| Naive Fibonacci \`fib(n)\` | n | O(n) — even though time is O(2ⁿ) |
| DFS on a tree of height h | h | O(h): O(log n) balanced, O(n) for a chain |
| Merge sort | log₂ n | O(log n) stack + O(n) merge buffer = O(n) |
| Quicksort | log n on average, n in the worst case | O(log n) average, O(n) worst |
| Generating all subsets of n items | n | O(n) stack (plus the output itself) |

## 4. The Rule in Code

Here are the three recursions from the table, instrumented with \`enter()\` / \`leave()\` helpers that track the current and maximum depth. They are the core of the first runnable example:

~~~javascript
function sumRecursive(n) {     // O(n) stack: n frames are alive at the deepest point
  enter();
  const result = n === 0 ? 0 : n + sumRecursive(n - 1);
  leave();
  return result;
}

function sumIterative(n) {     // O(1) stack: one frame, one running total
  enter();
  let total = 0;
  for (let i = 1; i <= n; i++) total += i;
  leave();
  return total;
}
~~~

~~~javascript
function bsearch(nums, target, lo, hi) {   // O(log n) stack: the range halves per call
  enter();
  let found;
  if (lo > hi) {
    found = false;
  } else {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] === target) found = true;
    else if (nums[mid] < target) found = bsearch(nums, target, mid + 1, hi);
    else found = bsearch(nums, target, lo, mid - 1);
  }
  leave();
  return found;
}
~~~

~~~javascript
let calls = 0;
function fib(n) {              // O(2^n) time, but only O(n) stack
  calls++;
  enter();
  const result = n < 2 ? n : fib(n - 1) + fib(n - 2);
  leave();
  return result;
}
~~~

The iterative sum uses one frame however large n gets; the recursive one keeps n + 1 frames waiting for the ones above them to return.

📌 **Interview term: Tail call** — a call that is the very last thing a function does (\`return f(n − 1, acc + n)\`). Some languages reuse the current frame for it (**tail-call optimisation**), turning the recursion into a loop with O(1) stack. Whether JavaScript does that is answered by running it, in the next section.

## 5. The Stack Limit in JavaScript

A JavaScript engine gives the call stack a fixed amount of memory. When recursion exceeds it, the engine throws a \`RangeError\`. This snippet recurses until that happens, then tries a tail-recursive function:

~~~javascript
let deepest = 0;
function dive(d) {                   // recurses until the engine refuses
  deepest = d;
  dive(d + 1);
}
try {
  dive(1);
} catch (e) {
  console.log(e.constructor.name + ": " + e.message);
}
console.log("deepest frame reached:", deepest);

function tailSum(n, acc) {           // tail-recursive: the call is the last thing it does
  return n === 0 ? acc : tailSum(n - 1, acc + n);
}
try {
  tailSum(1000000, 0);
} catch (e) {
  console.log("tailSum(1000000, 0) -> " + e.constructor.name + ": no tail-call elimination here");
}
~~~

Output of \`node main.js\`:

~~~text
RangeError: Maximum call stack size exceeded
deepest frame reached: 10463
tailSum(1000000, 0) -> RangeError: no tail-call elimination here
~~~

What the run shows (Node.js 22 on Linux; the exact number depends on the engine, its flags and how big each frame is):

- The engine refused at about **10,000 frames** with \`RangeError: Maximum call stack size exceeded\`. Browsers have their own, different limits, so never rely on a specific number.
- The tail-recursive \`tailSum\` failed in the same way. The ES2015 specification describes proper tail calls in strict mode, but this Node.js run shows that V8 does not perform them, so a tail call still adds a frame.
- The error is catchable, but recovering from it is fragile; the real fix is an iterative version.

So in JavaScript, O(n) stack space is a hard limit in practice: a recursive DFS over a 100,000-node linked list or path-shaped tree will throw.

## 6. Getting Rid of the Stack: Loops and Explicit Stacks

Two techniques remove the call-stack cost:

1. **A plain loop** when each call only depends on the next one (sum, factorial, binary search). That brings the stack down to O(1).
2. **An explicit stack** — a list you push and pop yourself — when the recursion branches (tree and graph walks). The memory moves from the small call stack to the much larger heap, and you control it.

Here is an in-place reversal next to a copying one, and a depth-first walk that uses its own stack:

~~~javascript
function reverseInPlace(a) {   // O(1) extra: two indices and one temporary
  let i = 0, j = a.length - 1;
  while (i < j) {
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    i++; j--;
  }
  return 0;                    // extra element slots used
}

function reversedCopy(a) {     // O(n) extra: a whole new array
  const out = [];
  for (let k = a.length - 1; k >= 0; k--) out.push(a[k]);
  return [out, out.length];    // extra element slots used
}
~~~

~~~javascript
function countNodes(n, children) {
  // Depth-first walk with our own stack instead of the call stack.
  const stack = [0];
  let seen = 0, peak = 1;
  while (stack.length > 0) {
    const node = stack.pop();
    seen++;
    for (const child of children(node, n)) stack.push(child);
    peak = Math.max(peak, stack.length);
  }
  return [seen, peak];
}

function chain(i, n) {         // 0 -> 1 -> 2 -> ... : depth n
  return i + 1 < n ? [i + 1] : [];
}

function balanced(i, n) {      // heap layout: children of i are 2i+1 and 2i+2
  return [2 * i + 1, 2 * i + 2].filter((c) => c < n);
}
~~~

On a 100,000-node chain, a recursive walk would need 100,000 frames, far beyond the limits shown in section 5. The explicit stack never held more than **1** entry, because each node is popped before its child is pushed. On a balanced tree of height 17, it peaked at 17 entries: an explicit-stack DFS stores pending nodes, about one per level here, so its memory is still O(height), just on the heap. (The same walk in breadth-first order is on the [BFS vs DFS page](/interview-question/what-is-the-difference-between-bfs-and-dfs).)

JavaScript detail: \`arr.slice(1)\`, \`[...arr]\` and \`arr.concat()\` all make **new** arrays. A recursion that passes \`arr.slice(1)\` down keeps every slice alive along the current path: n + (n − 1) + … + 1 elements, which is **O(n²)** memory for an O(n)-depth recursion. Pass indices instead. Closures can also keep large arrays alive longer than you expect, which is still memory your algorithm uses.

## 7. Verified: Running the Code

Both programs are the runnable examples under "JavaScript code" on this page, run with \`node main.js\`.

**Example 1 — stack depth of recursive vs iterative code:**

~~~text
sum 1..500 recursive: 125250, max stack depth 501
sum 1..500 iterative: 125250, max stack depth 1
binary search over 1000000 items: found=true, max stack depth 20
fib(20) naive: 6765, calls 21891, max stack depth 20
~~~

\`sum(500)\` reached **501** frames (500 down to the base case 0), the loop **1**. Binary search over a million items needed only **20** frames, because the range halves per call. And \`fib(20)\` made **21,891** calls but never had more than **20** frames alive: exponential time, linear stack.

**Example 2 — extra space and the explicit stack:**

~~~text
reverse in place: [5, 4, 3, 2, 1], extra slots 0
reversed copy:    [5, 4, 3, 2, 1], extra slots 5
chain of 100000 nodes: visited 100000, peak explicit stack 1
balanced tree of 131071 nodes (height 17): visited 131071, peak explicit stack 17
~~~

Same reversed output, but the in-place version used 0 extra slots and the copy 5 (O(1) vs O(n)). The explicit-stack walk visited all 100,000 chain nodes with a stack of 1, and all 131,071 nodes of the balanced tree with a stack that peaked at 17.

## 8. Complexity of the Examples

| Function | Time | Stack space | Other extra space |
| :--- | :--- | :--- | :--- |
| recursive sum | O(n) | O(n) | O(1) |
| iterative sum | O(n) | O(1) | O(1) |
| recursive binary search | O(log n) | O(log n) | O(1) |
| naive \`fib(n)\` | O(2ⁿ) | O(n) | O(1) |
| reverse in place | O(n) | O(1) | O(1) |
| reversed copy | O(n) | O(1) | O(n) |
| explicit-stack DFS | O(n) | O(1) | O(h) to O(n) for the explicit stack |

## 9. Edge Cases and Subtleties

- **Memoisation trades space for time.** Caching \`fib\` results makes it O(n) time but adds an O(n) cache on top of the O(n) stack. Space is still O(n), but the constant doubles.
- **Output space.** Generating all subsets returns 2ⁿ lists; that is O(n · 2ⁿ) output even though the recursion stack is only O(n). State both.
- **The input can count.** "Total space" includes the input; "auxiliary space" does not. A function that sorts a copy of the input uses O(n) auxiliary space, while one that sorts in place may use only O(log n) for the recursion.
- **Two recursive calls do not double the depth.** \`f(n − 1) + f(n − 1)\` doubles the *time* per level, but the depth is still n.
- **Garbage counts while it is reachable.** Temporary objects that are still referenced (by a frame, a closure or a cache) are part of the algorithm's memory at that moment.

## Common Pitfalls

- **Counting calls instead of depth.** Naive \`fib(20)\` made 21,891 calls but never had more than 20 frames alive: the stack space is O(n), the time O(2ⁿ).
- **Recursing on long chains.** About 10,000 frames was the limit in this Node.js run; deep recursion throws \`RangeError\`. Use a loop or an array as a stack.
- **Expecting tail-call optimisation.** \`tailSum(1000000, 0)\` threw just like a normal recursion; do not count on it.
- **\`slice\` or spread inside recursion.** Each call copies, so memory and time become O(n²); pass \`lo\`/\`hi\` indices.
- **Forgetting the output.** Returning a new array of n items is O(n) space even when the algorithm is otherwise in place; say whether you count it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">Space complexity is how the extra memory an algorithm needs grows with n; usually we count auxiliary space, not the input itself.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursion:</strong> <span style="color:#f0e2c8;">Every active call holds a stack frame, so recursion uses O(maximum depth) stack space, not O(number of calls).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Examples:</strong> <span style="color:#f0e2c8;">Recursive sum is O(n) stack, recursive binary search O(log n), naive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(n)</code> O(n) stack despite O(2^n) calls; I measured 20 frames for 21,891 calls of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(20)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. JavaScript specifics:</strong> <span style="color:#f0e2c8;">The engine throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError: Maximum call stack size exceeded</code>, about 10,000 frames in my Node.js 22 run, and V8 does not eliminate tail calls.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The fix:</strong> <span style="color:#f0e2c8;">Replace the call stack with an array used as a stack (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code>), or rewrite as a loop; two-pointer code gets extra space down to O(1).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the space complexity of merge sort?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n) auxiliary for the merge buffers plus O(log n) stack for the recursion, so O(n) overall. Versions that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slice</code> at every level allocate even more garbage.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the stack space of naive Fibonacci O(n) and not O(2^n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only one root-to-leaf path of the call tree is on the stack at a time: when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(n-1)</code> returns, its frames are gone before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(n-2)</code> starts. The deepest path has n frames.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"use strict"</code> give you tail calls?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The spec describes proper tail calls in strict mode, but V8 does not implement them, and my Node.js run threw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError</code> for a tail-recursive sum. Write a loop.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a recursive DFS on a tree O(n) space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is O(h), the height. Balanced: O(log n). Path-shaped: O(n), and past roughly ten thousand levels it throws in Node.js.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">array.reverse()</code> O(1) space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, it reverses in place. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...array].reverse()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toReversed()</code> create a copy, which is O(n) extra.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Space complexity** | How memory use grows with n |
| **Auxiliary space** | Extra memory beyond the input |
| **In-place algorithm** | Rearranges the input with O(1) extra memory |
| **Call stack** | Last-in, first-out record of unfinished calls |
| **Stack frame** | One call's parameters, locals and return address |
| **Recursion depth** | Most frames of the function alive at once |
| **Stack overflow** | Running out of call-stack memory |
| **Tail call / tail-call optimisation** | A call made last; reusing its frame so recursion uses O(1) stack |
| **\`RangeError\`** | The error JavaScript engines throw when the call stack overflows |

**Conclusion:** Space complexity is the memory version of Big-O, and recursion is where its hidden part lives: every unfinished call is a frame on the call stack, so a recursion costs O(maximum depth) stack space — 501 frames for \`sum(500)\`, 20 for a binary search over a million items, and 20 for \`fib(20)\` despite its 21,891 calls. In JavaScript, that stack is limited, as the run in section 5 showed, so the practical skill is to keep recursion depth logarithmic or to replace it with a loop or an explicit stack, and to state both the time and the space of whatever you write.`,
        examples: [
          {
            label: "Measure the call-stack depth of recursive and iterative code",
            code: `// Measure how deep the call stack gets: the space cost of recursion.

let depth = 0;      // frames of our function currently on the stack
let maxDepth = 0;   // the most there ever were at once
function enter() { depth++; maxDepth = Math.max(maxDepth, depth); }
function leave() { depth--; }
function reset() { depth = 0; maxDepth = 0; }

function sumRecursive(n) {     // O(n) stack: n frames are alive at the deepest point
  enter();
  const result = n === 0 ? 0 : n + sumRecursive(n - 1);
  leave();
  return result;
}

function sumIterative(n) {     // O(1) stack: one frame, one running total
  enter();
  let total = 0;
  for (let i = 1; i <= n; i++) total += i;
  leave();
  return total;
}

function bsearch(nums, target, lo, hi) {   // O(log n) stack: the range halves per call
  enter();
  let found;
  if (lo > hi) {
    found = false;
  } else {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] === target) found = true;
    else if (nums[mid] < target) found = bsearch(nums, target, mid + 1, hi);
    else found = bsearch(nums, target, lo, mid - 1);
  }
  leave();
  return found;
}

let calls = 0;
function fib(n) {              // O(2^n) time, but only O(n) stack
  calls++;
  enter();
  const result = n < 2 ? n : fib(n - 1) + fib(n - 2);
  leave();
  return result;
}

reset();
let r = sumRecursive(500);
console.log("sum 1..500 recursive: " + r + ", max stack depth " + maxDepth);
reset();
r = sumIterative(500);
console.log("sum 1..500 iterative: " + r + ", max stack depth " + maxDepth);

const nums = Array.from({ length: 1000000 }, (_, i) => i);
reset();
const found = bsearch(nums, 999999, 0, nums.length - 1);
console.log("binary search over 1000000 items: found=" + found + ", max stack depth " + maxDepth);

reset();
calls = 0;
r = fib(20);
console.log("fib(20) naive: " + r + ", calls " + calls + ", max stack depth " + maxDepth);`,
          },
          {
            label: "O(1) vs O(n) extra space, and replacing recursion with an explicit stack",
            code: `// Same answers, different memory: O(1) vs O(n) extra space, and an explicit stack.

function fmt(items) {
  return "[" + items.join(", ") + "]";
}

function reverseInPlace(a) {   // O(1) extra: two indices and one temporary
  let i = 0, j = a.length - 1;
  while (i < j) {
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    i++; j--;
  }
  return 0;                    // extra element slots used
}

function reversedCopy(a) {     // O(n) extra: a whole new array
  const out = [];
  for (let k = a.length - 1; k >= 0; k--) out.push(a[k]);
  return [out, out.length];    // extra element slots used
}

function countNodes(n, children) {
  // Depth-first walk with our own stack instead of the call stack.
  const stack = [0];
  let seen = 0, peak = 1;
  while (stack.length > 0) {
    const node = stack.pop();
    seen++;
    for (const child of children(node, n)) stack.push(child);
    peak = Math.max(peak, stack.length);
  }
  return [seen, peak];
}

function chain(i, n) {         // 0 -> 1 -> 2 -> ... : depth n
  return i + 1 < n ? [i + 1] : [];
}

function balanced(i, n) {      // heap layout: children of i are 2i+1 and 2i+2
  return [2 * i + 1, 2 * i + 2].filter((c) => c < n);
}

const a = [1, 2, 3, 4, 5];
let extra = reverseInPlace(a);
console.log("reverse in place: " + fmt(a) + ", extra slots " + extra);
const [out, extraCopy] = reversedCopy([1, 2, 3, 4, 5]);
console.log("reversed copy:    " + fmt(out) + ", extra slots " + extraCopy);

let [seen, peak] = countNodes(100000, chain);
console.log("chain of 100000 nodes: visited " + seen + ", peak explicit stack " + peak);
[seen, peak] = countNodes(131071, balanced);
console.log("balanced tree of 131071 nodes (height 17): visited " + seen + ", peak explicit stack " + peak);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"We talk a lot about time complexity. What is space complexity? And if I write a recursive function in Java, how much memory does the recursion itself use — for example for a recursive sum, a recursive binary search and naive Fibonacci?"

**What a strong answer should cover:**
- Space complexity is how extra memory grows with n; distinguish auxiliary space (extra) from total space (including the input), and say whether the output counts.
- Each active call occupies a stack frame, so recursion costs O(maximum recursion depth) stack space — not O(number of calls).
- Worked examples: recursive sum O(n) stack, recursive binary search O(log n), naive Fibonacci O(2ⁿ) time but O(n) stack, DFS O(height).
- Converting deep recursion to a loop or an explicit stack, and in-place algorithms with O(1) extra space.
- Java specifics: fixed per-thread stacks and \`StackOverflowError\` (about 21,000 small frames by default in OpenJDK 21), \`-Xss\`, no tail-call elimination, and boxing in \`List<Integer>\`.

**Code / implementation expected:** Yes — a recursive method and its iterative or \`ArrayDeque\` explicit-stack rewrite in Java, with the stack depth stated.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a function call and a loop are.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every depth, count and error message on this page comes from running the Java code shown; the **Verified** section quotes that output. This page assumes you know [Big-O notation](/interview-question/what-is-big-o-notation); recursion itself is introduced on [what recursion and a base case are](/interview-question/what-is-recursion-and-what-is-a-base-case).

## 1. Why This Even Matters — A Story First

You are reading a recipe. Step 3 says "make the sauce (see page 40)". You put a sticky note on step 3 so you remember where you were, and turn to page 40. Page 40 says "first make the stock (see page 72)". Another sticky note, turn to page 72. When the stock is done you peel off the top note and go back to page 40; when the sauce is done you peel the next one and go back to step 3.

The pile of sticky notes is the **call stack**. Every function call that has started but not finished leaves one note behind. The notes are small, but they are not free, and the pile has a maximum height. A recipe that sends you 10,000 pages deep before anything finishes needs 10,000 notes at once.

Space complexity asks the same question as time complexity, about memory: "as the input grows, how much *extra* memory does this algorithm need?" Recursion is where people most often get the answer wrong, because the memory is hidden in those sticky notes.

## 2. Space Complexity in Plain Language

📌 **Interview term: Space complexity** — how the memory an algorithm needs grows as the input size n grows, written in Big-O.

📌 **Interview term: Auxiliary space** — the **extra** memory beyond the input: temporary arrays, hash maps, and the call stack. When an interviewer asks "what is the space complexity?", they almost always mean auxiliary space. Say which one you mean, and say whether the output counts.

📌 **Interview term: In-place algorithm** — one that rearranges the input using only O(1) extra memory, like reversing an array with two pointers.

Some quick examples:

| Code | Auxiliary space | Why |
| :--- | :--- | :--- |
| Sum a list with a loop | O(1) | one running total |
| Reverse a list in place with two pointers | O(1) | two indices and one temporary |
| Build a reversed copy | O(n) | a new list of n items |
| Count frequencies in a hash map | O(k) | one entry per distinct value, at most n |
| Prefix-sum array | O(n) | one number per position |
| 2D DP table for two strings of length n and m | O(n · m) | one cell per pair |

## 3. Where Recursion Hides Memory: the Call Stack

📌 **Interview term: Call stack** — the region of memory where the program keeps one record for every function call that has started and not yet returned. It is last-in, first-out: the most recent call finishes first.

📌 **Interview term: Stack frame** — that record: the call's parameters, local variables and where to return to. Its size is a constant for a given function.

📌 **Interview term: Recursion depth** — the largest number of frames of the recursive function alive at the same moment.

So the rule is:

> **Stack space of a recursion = (maximum recursion depth) × (frame size) = O(maximum depth).**

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="The call stack at the deepest point of sum of 3 holds four frames">
  <text class="d-text" x="380" y="26" text-anchor="middle">Call stack at the deepest point of sum(3)</text>
  <rect class="d-box-accent" x="250" y="56" width="260" height="50" rx="8"/>
  <text class="d-text d-accent" x="380" y="86" text-anchor="middle">sum(0): base case, returns 0</text>
  <rect class="d-box-muted" x="250" y="118" width="260" height="50" rx="8"/>
  <text class="d-text" x="380" y="148" text-anchor="middle">sum(1): waiting for sum(0)</text>
  <rect class="d-box-muted" x="250" y="180" width="260" height="50" rx="8"/>
  <text class="d-text" x="380" y="210" text-anchor="middle">sum(2): waiting for sum(1)</text>
  <rect class="d-box-muted" x="250" y="242" width="260" height="50" rx="8"/>
  <text class="d-text" x="380" y="272" text-anchor="middle">sum(3): waiting for sum(2)</text>
  <text class="d-sub" x="560" y="86">top: runs now</text>
  <text class="d-sub" x="560" y="272">bottom: first call</text>
</svg>

\`sum(n)\` needs n + 1 frames at its deepest point, so it uses O(n) stack even though it never creates a list. The measured run below shows 501 frames for \`sum(500)\`.

📌 **Interview term: Stack overflow** — running out of call-stack memory because the recursion went too deep. How Java reports it is covered in section 5.

### Depth, not number of calls

This is the point most candidates miss. Naive Fibonacci calls itself twice per call, so \`fib(20)\` makes 21,891 calls — but they are not all alive at once. When \`fib(19)\` returns, all of its frames are gone before \`fib(18)\` starts. At any moment, only one root-to-leaf path of the call tree is on the stack.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Call tree of fib of 4 with only one path on the stack at a time">
  <text class="d-text" x="380" y="26" text-anchor="middle">fib(4): 9 calls, at most 4 frames alive at once</text>
  <rect class="d-box-accent" x="330" y="50" width="100" height="40" rx="8"/>
  <text class="d-text d-accent" x="380" y="76" text-anchor="middle">fib(4)</text>
  <path class="d-edge-accent" d="M 360 90 L 220 128"/>
  <path class="d-edge" d="M 400 90 L 540 128"/>
  <rect class="d-box-accent" x="170" y="128" width="100" height="40" rx="8"/>
  <text class="d-text d-accent" x="220" y="154" text-anchor="middle">fib(3)</text>
  <rect class="d-box-muted" x="490" y="128" width="100" height="40" rx="8"/>
  <text class="d-text" x="540" y="154" text-anchor="middle">fib(2)</text>
  <path class="d-edge-accent" d="M 200 168 L 120 204"/>
  <path class="d-edge" d="M 240 168 L 320 204"/>
  <path class="d-edge" d="M 520 168 L 470 204"/>
  <path class="d-edge" d="M 560 168 L 610 204"/>
  <rect class="d-box-accent" x="70" y="204" width="100" height="40" rx="8"/>
  <text class="d-text d-accent" x="120" y="230" text-anchor="middle">fib(2)</text>
  <rect class="d-box-muted" x="270" y="204" width="100" height="40" rx="8"/>
  <text class="d-text" x="320" y="230" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="420" y="204" width="100" height="40" rx="8"/>
  <text class="d-text" x="470" y="230" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="560" y="204" width="100" height="40" rx="8"/>
  <text class="d-text" x="610" y="230" text-anchor="middle">fib(0)</text>
  <path class="d-edge-accent" d="M 100 244 L 60 266"/>
  <path class="d-edge" d="M 140 244 L 180 266"/>
  <text class="d-sub d-accent" x="60" y="284" text-anchor="middle">fib(1)</text>
  <text class="d-sub" x="180" y="284" text-anchor="middle">fib(0)</text>
</svg>

The highlighted path is what the stack holds at its deepest: fib(4), fib(3), fib(2), fib(1) — four frames for fib(4). In general, naive Fibonacci is **O(2ⁿ) time but only O(n) stack space**.

Common recursions and their stack space:

| Recursion | Max depth | Stack space |
| :--- | :--- | :--- |
| \`sum(n) = n + sum(n − 1)\` | n + 1 | O(n) |
| Binary search on n items | about log₂ n | O(log n) |
| Naive Fibonacci \`fib(n)\` | n | O(n) — even though time is O(2ⁿ) |
| DFS on a tree of height h | h | O(h): O(log n) balanced, O(n) for a chain |
| Merge sort | log₂ n | O(log n) stack + O(n) merge buffer = O(n) |
| Quicksort | log n on average, n in the worst case | O(log n) average, O(n) worst |
| Generating all subsets of n items | n | O(n) stack (plus the output itself) |

## 4. The Rule in Code

Here are the three recursions from the table, instrumented with \`enter()\` / \`leave()\` helpers that track the current and maximum depth. They are the core of the first runnable example:

~~~java
static long sumRecursive(int n) {   // O(n) stack: n frames are alive at the deepest point
    enter();
    long result = n == 0 ? 0 : n + sumRecursive(n - 1);
    leave();
    return result;
}

static long sumIterative(int n) {   // O(1) stack: one frame, one running total
    enter();
    long total = 0;
    for (int i = 1; i <= n; i++) total += i;
    leave();
    return total;
}
~~~

~~~java
static boolean bsearch(int[] nums, int target, int lo, int hi) {  // O(log n) stack
    enter();
    boolean found;
    if (lo > hi) {
        found = false;
    } else {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) found = true;
        else if (nums[mid] < target) found = bsearch(nums, target, mid + 1, hi);
        else found = bsearch(nums, target, lo, mid - 1);
    }
    leave();
    return found;
}
~~~

~~~java
static long calls = 0;
static int fib(int n) {             // O(2^n) time, but only O(n) stack
    calls++;
    enter();
    int result = n < 2 ? n : fib(n - 1) + fib(n - 2);
    leave();
    return result;
}
~~~

The iterative sum uses one frame however large n gets; the recursive one keeps n + 1 frames waiting for the ones above them to return.

📌 **Interview term: Tail call** — a call that is the very last thing a function does (\`return f(n − 1, acc + n)\`). Some languages reuse the current frame for it (**tail-call optimisation**), turning the recursion into a loop with O(1) stack. Whether Java does that is answered by running it, in the next section.

## 5. The Stack Limit in Java

Each Java thread has a fixed-size stack. When recursion exceeds it, the JVM throws \`StackOverflowError\`. This snippet finds roughly where that happens with the default stack, then runs a million-deep recursion on a thread created with a bigger stack:

~~~java
public class Main {
    static int deepest = 0;

    static void dive(int d) {          // recurses until the JVM refuses
        deepest = d;
        dive(d + 1);
    }

    static long sumTo(int n) {
        return n == 0 ? 0 : n + sumTo(n - 1);
    }

    public static void main(String[] args) throws InterruptedException {
        try {
            dive(1);
        } catch (StackOverflowError e) {
            System.out.println("StackOverflowError after roughly " + (deepest / 1000) * 1000 + " frames (default stack)");
        }

        try {
            sumTo(1_000_000);
        } catch (StackOverflowError e) {
            System.out.println("sumTo(1000000) on the main thread -> StackOverflowError");
        }

        long[] result = new long[1];
        Thread big = new Thread(null, () -> result[0] = sumTo(1_000_000), "big-stack", 512L * 1024 * 1024);
        big.start();
        big.join();
        System.out.println("sumTo(1000000) on a thread with a 512 MB stack = " + result[0]);
    }
}
~~~

Output of \`javac Main.java && java Main\`:

~~~text
StackOverflowError after roughly 21000 frames (default stack)
sumTo(1000000) on the main thread -> StackOverflowError
sumTo(1000000) on a thread with a 512 MB stack = 500000500000
~~~

What the run shows (OpenJDK 21 on Linux, default settings; the number varies with the JVM version, \`-Xss\`, frame size and JIT compilation, which is why the code rounds it):

- The main thread overflowed after **roughly 21,000 frames** of a tiny method in the quoted run (an earlier run printed 22,000: the JIT changes frame sizes). Bigger frames (more locals and parameters) overflow sooner.
- A million-deep \`sumTo\` failed on the main thread but worked on a thread constructed with a 512 MB \`stackSize\`. The JavaDoc for that constructor warns that the value is only a request and some platforms ignore it, so this is a workaround, not a design.
- \`-Xss\` sets the default stack size for new threads from the command line (this repository's example checker runs Java with \`-Xss64m\`, which is one more reason the runnable examples here avoid deep recursion: their output must not depend on the stack size).
- The JVM does not eliminate tail calls, so a tail-recursive method grows the stack too.

\`StackOverflowError\` is an \`Error\`, not an \`Exception\`: catching it is legal, as above, but production code should not rely on recovering from it.

## 6. Getting Rid of the Stack: Loops and Explicit Stacks

Two techniques remove the call-stack cost:

1. **A plain loop** when each call only depends on the next one (sum, factorial, binary search). That brings the stack down to O(1).
2. **An explicit stack** — a list you push and pop yourself — when the recursion branches (tree and graph walks). The memory moves from the small call stack to the much larger heap, and you control it.

Here is an in-place reversal next to a copying one, and a depth-first walk that uses its own stack:

~~~java
static int reverseInPlace(int[] a) {   // O(1) extra: two indices and one temporary
    int i = 0, j = a.length - 1;
    while (i < j) {
        int tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        i++; j--;
    }
    return 0;                          // extra element slots used
}

static int[] reversedCopy(int[] a) {   // O(n) extra: a whole new array
    int[] out = new int[a.length];
    for (int k = 0; k < a.length; k++) out[k] = a[a.length - 1 - k];
    return out;                        // out.length extra slots
}
~~~

~~~java
static int[] countNodes(int n, BiFunction<Integer, Integer, List<Integer>> children) {
    // Depth-first walk with our own stack instead of the call stack.
    Deque<Integer> stack = new ArrayDeque<>();
    stack.push(0);
    int seen = 0, peak = 1;
    while (!stack.isEmpty()) {
        int node = stack.pop();
        seen++;
        for (int child : children.apply(node, n)) stack.push(child);
        peak = Math.max(peak, stack.size());
    }
    return new int[]{seen, peak};
}

static List<Integer> chain(int i, int n) {      // 0 -> 1 -> 2 -> ... : depth n
    return i + 1 < n ? List.of(i + 1) : List.of();
}

static List<Integer> balanced(int i, int n) {   // children of i are 2i+1 and 2i+2
    List<Integer> out = new ArrayList<>();
    for (int c : new int[]{2 * i + 1, 2 * i + 2}) if (c < n) out.add(c);
    return out;
}
~~~

On a 100,000-node chain, a recursive walk would need 100,000 frames, far beyond the limits shown in section 5. The explicit stack never held more than **1** entry, because each node is popped before its child is pushed. On a balanced tree of height 17, it peaked at 17 entries: an explicit-stack DFS stores pending nodes, about one per level here, so its memory is still O(height), just on the heap. (The same walk in breadth-first order is on the [BFS vs DFS page](/interview-question/what-is-the-difference-between-bfs-and-dfs).)

Java detail: an \`int[]\` of n elements is one compact block of 4n bytes, but a \`List<Integer>\` holds n references to boxed \`Integer\` objects, several times more memory for the same O(n). Objects live on the heap, so a big \`new int[n]\` inside a recursive method costs heap memory, while the frame itself only holds the reference.

## 7. Verified: Running the Code

Both programs are the runnable examples under "Java code" on this page, run with \`javac Main.java && java Main\`.

**Example 1 — stack depth of recursive vs iterative code:**

~~~text
sum 1..500 recursive: 125250, max stack depth 501
sum 1..500 iterative: 125250, max stack depth 1
binary search over 1000000 items: found=true, max stack depth 20
fib(20) naive: 6765, calls 21891, max stack depth 20
~~~

\`sum(500)\` reached **501** frames (500 down to the base case 0), the loop **1**. Binary search over a million items needed only **20** frames, because the range halves per call. And \`fib(20)\` made **21,891** calls but never had more than **20** frames alive: exponential time, linear stack.

**Example 2 — extra space and the explicit stack:**

~~~text
reverse in place: [5, 4, 3, 2, 1], extra slots 0
reversed copy:    [5, 4, 3, 2, 1], extra slots 5
chain of 100000 nodes: visited 100000, peak explicit stack 1
balanced tree of 131071 nodes (height 17): visited 131071, peak explicit stack 17
~~~

Same reversed output, but the in-place version used 0 extra slots and the copy 5 (O(1) vs O(n)). The explicit-stack walk visited all 100,000 chain nodes with a stack of 1, and all 131,071 nodes of the balanced tree with a stack that peaked at 17.

## 8. Complexity of the Examples

| Function | Time | Stack space | Other extra space |
| :--- | :--- | :--- | :--- |
| recursive sum | O(n) | O(n) | O(1) |
| iterative sum | O(n) | O(1) | O(1) |
| recursive binary search | O(log n) | O(log n) | O(1) |
| naive \`fib(n)\` | O(2ⁿ) | O(n) | O(1) |
| reverse in place | O(n) | O(1) | O(1) |
| reversed copy | O(n) | O(1) | O(n) |
| explicit-stack DFS | O(n) | O(1) | O(h) to O(n) for the explicit stack |

## 9. Edge Cases and Subtleties

- **Memoisation trades space for time.** Caching \`fib\` results makes it O(n) time but adds an O(n) cache on top of the O(n) stack. Space is still O(n), but the constant doubles.
- **Output space.** Generating all subsets returns 2ⁿ lists; that is O(n · 2ⁿ) output even though the recursion stack is only O(n). State both.
- **The input can count.** "Total space" includes the input; "auxiliary space" does not. A function that sorts a copy of the input uses O(n) auxiliary space, while one that sorts in place may use only O(log n) for the recursion.
- **Two recursive calls do not double the depth.** \`f(n − 1) + f(n − 1)\` doubles the *time* per level, but the depth is still n.
- **Garbage counts while it is reachable.** Temporary objects that are still referenced (by a frame, a closure or a cache) are part of the algorithm's memory at that moment.

## Common Pitfalls

- **Counting calls instead of depth.** Naive \`fib(20)\` made 21,891 calls but never had more than 20 frames alive: the stack space is O(n), the time O(2ⁿ).
- **Deep recursion on the main thread.** About 21,000 small frames was the default limit here; a DFS over a long chain throws \`StackOverflowError\`. Use \`ArrayDeque\` as an explicit stack.
- **Relying on \`-Xss\` or a big-stack \`Thread\` in an interview.** It works around the problem; it does not remove the O(n) stack. Mention it, then write the iterative version.
- **Boxing in your explicit stack.** \`ArrayDeque<Integer>\` boxes every value; for hot loops an \`int[]\` with a top index is lighter. Same Big-O, smaller constant.
- **Forgetting the output.** Returning a new array of n elements is O(n) space even when the algorithm is otherwise in place; say whether you count it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">Space complexity is how the extra memory an algorithm needs grows with n; usually we count auxiliary space, not the input itself.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursion:</strong> <span style="color:#f0e2c8;">Every active call holds a stack frame, so recursion uses O(maximum depth) stack space, not O(number of calls).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Examples:</strong> <span style="color:#f0e2c8;">Recursive sum is O(n) stack, recursive binary search O(log n), naive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(n)</code> O(n) stack despite O(2^n) calls; I measured 20 frames for 21,891 calls of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(20)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Java specifics:</strong> <span style="color:#f0e2c8;">Each thread has a fixed stack; deep recursion throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code> (about 21,000 small frames by default in my OpenJDK 21 run), and the JVM does not eliminate tail calls.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The fix:</strong> <span style="color:#f0e2c8;">Use an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> as an explicit stack or rewrite as a loop; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-Xss</code> or a big-stack <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Thread</code> only moves the limit.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the space complexity of merge sort?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n) auxiliary for the merge buffer plus O(log n) stack for the recursion, so O(n) overall. Allocating one buffer up front avoids creating new arrays at every level.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the stack space of naive Fibonacci O(n) and not O(2^n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only one root-to-leaf path of the call tree is on the stack at a time: when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(n-1)</code> returns, its frames are gone before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(n-2)</code> starts. The deepest path has n frames.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you fix a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">StackOverflowError</code> in a DFS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Replace recursion with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque&lt;Integer&gt;</code> used via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code>. The memory is still O(depth) or O(n), but it lives on the heap, which is far larger than a thread stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a recursive DFS on a tree O(n) space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is O(h), the height. Balanced: O(log n). Path-shaped: O(n), which overflows the default stack at a few tens of thousands of levels.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do arrays you create inside a recursive method live?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On the heap. The frame holds only the reference, but the array is still part of the algorithm's space complexity while it is reachable.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Space complexity** | How memory use grows with n |
| **Auxiliary space** | Extra memory beyond the input |
| **In-place algorithm** | Rearranges the input with O(1) extra memory |
| **Call stack** | Last-in, first-out record of unfinished calls |
| **Stack frame** | One call's parameters, locals and return address |
| **Recursion depth** | Most frames of the function alive at once |
| **Stack overflow** | Running out of call-stack memory |
| **Tail call / tail-call optimisation** | A call made last; reusing its frame so recursion uses O(1) stack |
| **\`-Xss\`** | JVM flag that sets the default thread stack size |

**Conclusion:** Space complexity is the memory version of Big-O, and recursion is where its hidden part lives: every unfinished call is a frame on the call stack, so a recursion costs O(maximum depth) stack space — 501 frames for \`sum(500)\`, 20 for a binary search over a million items, and 20 for \`fib(20)\` despite its 21,891 calls. In Java, that stack is limited, as the run in section 5 showed, so the practical skill is to keep recursion depth logarithmic or to replace it with a loop or an explicit stack, and to state both the time and the space of whatever you write.`,
        examples: [
          {
            label: "Measure the call-stack depth of recursive and iterative code",
            code: `public class Main {
    // Measure how deep the call stack gets: the space cost of recursion.

    static int depth = 0;      // frames of our method currently on the stack
    static int maxDepth = 0;   // the most there ever were at once
    static void enter() { depth++; maxDepth = Math.max(maxDepth, depth); }
    static void leave() { depth--; }
    static void reset() { depth = 0; maxDepth = 0; }

    static long sumRecursive(int n) {   // O(n) stack: n frames are alive at the deepest point
        enter();
        long result = n == 0 ? 0 : n + sumRecursive(n - 1);
        leave();
        return result;
    }

    static long sumIterative(int n) {   // O(1) stack: one frame, one running total
        enter();
        long total = 0;
        for (int i = 1; i <= n; i++) total += i;
        leave();
        return total;
    }

    static boolean bsearch(int[] nums, int target, int lo, int hi) {  // O(log n) stack
        enter();
        boolean found;
        if (lo > hi) {
            found = false;
        } else {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) found = true;
            else if (nums[mid] < target) found = bsearch(nums, target, mid + 1, hi);
            else found = bsearch(nums, target, lo, mid - 1);
        }
        leave();
        return found;
    }

    static long calls = 0;
    static int fib(int n) {             // O(2^n) time, but only O(n) stack
        calls++;
        enter();
        int result = n < 2 ? n : fib(n - 1) + fib(n - 2);
        leave();
        return result;
    }

    public static void main(String[] args) {
        reset();
        long r = sumRecursive(500);
        System.out.println("sum 1..500 recursive: " + r + ", max stack depth " + maxDepth);
        reset();
        r = sumIterative(500);
        System.out.println("sum 1..500 iterative: " + r + ", max stack depth " + maxDepth);

        int[] nums = new int[1000000];
        for (int i = 0; i < nums.length; i++) nums[i] = i;
        reset();
        boolean found = bsearch(nums, 999999, 0, nums.length - 1);
        System.out.println("binary search over 1000000 items: found=" + found + ", max stack depth " + maxDepth);

        reset();
        calls = 0;
        int f = fib(20);
        System.out.println("fib(20) naive: " + f + ", calls " + calls + ", max stack depth " + maxDepth);
    }
}`,
          },
          {
            label: "O(1) vs O(n) extra space, and replacing recursion with an explicit stack",
            code: `import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.function.BiFunction;

public class Main {
    // Same answers, different memory: O(1) vs O(n) extra space, and an explicit stack.

    static String fmt(int[] a) {
        StringBuilder sb = new StringBuilder("[");
        for (int k = 0; k < a.length; k++) sb.append(k > 0 ? ", " : "").append(a[k]);
        return sb.append("]").toString();
    }

    static int reverseInPlace(int[] a) {   // O(1) extra: two indices and one temporary
        int i = 0, j = a.length - 1;
        while (i < j) {
            int tmp = a[i]; a[i] = a[j]; a[j] = tmp;
            i++; j--;
        }
        return 0;                          // extra element slots used
    }

    static int[] reversedCopy(int[] a) {   // O(n) extra: a whole new array
        int[] out = new int[a.length];
        for (int k = 0; k < a.length; k++) out[k] = a[a.length - 1 - k];
        return out;                        // out.length extra slots
    }

    static int[] countNodes(int n, BiFunction<Integer, Integer, List<Integer>> children) {
        // Depth-first walk with our own stack instead of the call stack.
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(0);
        int seen = 0, peak = 1;
        while (!stack.isEmpty()) {
            int node = stack.pop();
            seen++;
            for (int child : children.apply(node, n)) stack.push(child);
            peak = Math.max(peak, stack.size());
        }
        return new int[]{seen, peak};
    }

    static List<Integer> chain(int i, int n) {      // 0 -> 1 -> 2 -> ... : depth n
        return i + 1 < n ? List.of(i + 1) : List.of();
    }

    static List<Integer> balanced(int i, int n) {   // children of i are 2i+1 and 2i+2
        List<Integer> out = new ArrayList<>();
        for (int c : new int[]{2 * i + 1, 2 * i + 2}) if (c < n) out.add(c);
        return out;
    }

    public static void main(String[] args) {
        int[] a = {1, 2, 3, 4, 5};
        int extra = reverseInPlace(a);
        System.out.println("reverse in place: " + fmt(a) + ", extra slots " + extra);
        int[] out = reversedCopy(new int[]{1, 2, 3, 4, 5});
        System.out.println("reversed copy:    " + fmt(out) + ", extra slots " + out.length);

        int[] r = countNodes(100000, Main::chain);
        System.out.println("chain of 100000 nodes: visited " + r[0] + ", peak explicit stack " + r[1]);
        r = countNodes(131071, Main::balanced);
        System.out.println("balanced tree of 131071 nodes (height 17): visited " + r[0] + ", peak explicit stack " + r[1]);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"We talk a lot about time complexity. What is space complexity? And if I write a recursive function in C++, how much memory does the recursion itself use — for example for a recursive sum, a recursive binary search and naive Fibonacci?"

**What a strong answer should cover:**
- Space complexity is how extra memory grows with n; distinguish auxiliary space (extra) from total space (including the input), and say whether the output counts.
- Each active call occupies a stack frame, so recursion costs O(maximum recursion depth) stack space — not O(number of calls).
- Worked examples: recursive sum O(n) stack, recursive binary search O(log n), naive Fibonacci O(2ⁿ) time but O(n) stack, DFS O(height).
- Converting deep recursion to a loop or an explicit stack, and in-place algorithms with O(1) extra space.
- C++ specifics: the stack is an OS limit (8 MB here), overflow is a crash (\`SIGSEGV\`), not an exception, \`-O2\` may remove tail recursion but is not guaranteed to, and big locals belong in \`std::vector\`.

**Code / implementation expected:** Yes — a recursive function and its iterative or \`std::vector\` explicit-stack rewrite in C++, with the stack depth stated.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what a function call and a loop are.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every depth, count and error message on this page comes from running the C++ code shown; the **Verified** section quotes that output. This page assumes you know [Big-O notation](/interview-question/what-is-big-o-notation); recursion itself is introduced on [what recursion and a base case are](/interview-question/what-is-recursion-and-what-is-a-base-case).

## 1. Why This Even Matters — A Story First

You are reading a recipe. Step 3 says "make the sauce (see page 40)". You put a sticky note on step 3 so you remember where you were, and turn to page 40. Page 40 says "first make the stock (see page 72)". Another sticky note, turn to page 72. When the stock is done you peel off the top note and go back to page 40; when the sauce is done you peel the next one and go back to step 3.

The pile of sticky notes is the **call stack**. Every function call that has started but not finished leaves one note behind. The notes are small, but they are not free, and the pile has a maximum height. A recipe that sends you 10,000 pages deep before anything finishes needs 10,000 notes at once.

Space complexity asks the same question as time complexity, about memory: "as the input grows, how much *extra* memory does this algorithm need?" Recursion is where people most often get the answer wrong, because the memory is hidden in those sticky notes.

## 2. Space Complexity in Plain Language

📌 **Interview term: Space complexity** — how the memory an algorithm needs grows as the input size n grows, written in Big-O.

📌 **Interview term: Auxiliary space** — the **extra** memory beyond the input: temporary arrays, hash maps, and the call stack. When an interviewer asks "what is the space complexity?", they almost always mean auxiliary space. Say which one you mean, and say whether the output counts.

📌 **Interview term: In-place algorithm** — one that rearranges the input using only O(1) extra memory, like reversing an array with two pointers.

Some quick examples:

| Code | Auxiliary space | Why |
| :--- | :--- | :--- |
| Sum a list with a loop | O(1) | one running total |
| Reverse a list in place with two pointers | O(1) | two indices and one temporary |
| Build a reversed copy | O(n) | a new list of n items |
| Count frequencies in a hash map | O(k) | one entry per distinct value, at most n |
| Prefix-sum array | O(n) | one number per position |
| 2D DP table for two strings of length n and m | O(n · m) | one cell per pair |

## 3. Where Recursion Hides Memory: the Call Stack

📌 **Interview term: Call stack** — the region of memory where the program keeps one record for every function call that has started and not yet returned. It is last-in, first-out: the most recent call finishes first.

📌 **Interview term: Stack frame** — that record: the call's parameters, local variables and where to return to. Its size is a constant for a given function.

📌 **Interview term: Recursion depth** — the largest number of frames of the recursive function alive at the same moment.

So the rule is:

> **Stack space of a recursion = (maximum recursion depth) × (frame size) = O(maximum depth).**

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="The call stack at the deepest point of sum of 3 holds four frames">
  <text class="d-text" x="380" y="26" text-anchor="middle">Call stack at the deepest point of sum(3)</text>
  <rect class="d-box-accent" x="250" y="56" width="260" height="50" rx="8"/>
  <text class="d-text d-accent" x="380" y="86" text-anchor="middle">sum(0): base case, returns 0</text>
  <rect class="d-box-muted" x="250" y="118" width="260" height="50" rx="8"/>
  <text class="d-text" x="380" y="148" text-anchor="middle">sum(1): waiting for sum(0)</text>
  <rect class="d-box-muted" x="250" y="180" width="260" height="50" rx="8"/>
  <text class="d-text" x="380" y="210" text-anchor="middle">sum(2): waiting for sum(1)</text>
  <rect class="d-box-muted" x="250" y="242" width="260" height="50" rx="8"/>
  <text class="d-text" x="380" y="272" text-anchor="middle">sum(3): waiting for sum(2)</text>
  <text class="d-sub" x="560" y="86">top: runs now</text>
  <text class="d-sub" x="560" y="272">bottom: first call</text>
</svg>

\`sum(n)\` needs n + 1 frames at its deepest point, so it uses O(n) stack even though it never creates a list. The measured run below shows 501 frames for \`sum(500)\`.

📌 **Interview term: Stack overflow** — running out of call-stack memory because the recursion went too deep. How C++ reports it is covered in section 5.

### Depth, not number of calls

This is the point most candidates miss. Naive Fibonacci calls itself twice per call, so \`fib(20)\` makes 21,891 calls — but they are not all alive at once. When \`fib(19)\` returns, all of its frames are gone before \`fib(18)\` starts. At any moment, only one root-to-leaf path of the call tree is on the stack.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Call tree of fib of 4 with only one path on the stack at a time">
  <text class="d-text" x="380" y="26" text-anchor="middle">fib(4): 9 calls, at most 4 frames alive at once</text>
  <rect class="d-box-accent" x="330" y="50" width="100" height="40" rx="8"/>
  <text class="d-text d-accent" x="380" y="76" text-anchor="middle">fib(4)</text>
  <path class="d-edge-accent" d="M 360 90 L 220 128"/>
  <path class="d-edge" d="M 400 90 L 540 128"/>
  <rect class="d-box-accent" x="170" y="128" width="100" height="40" rx="8"/>
  <text class="d-text d-accent" x="220" y="154" text-anchor="middle">fib(3)</text>
  <rect class="d-box-muted" x="490" y="128" width="100" height="40" rx="8"/>
  <text class="d-text" x="540" y="154" text-anchor="middle">fib(2)</text>
  <path class="d-edge-accent" d="M 200 168 L 120 204"/>
  <path class="d-edge" d="M 240 168 L 320 204"/>
  <path class="d-edge" d="M 520 168 L 470 204"/>
  <path class="d-edge" d="M 560 168 L 610 204"/>
  <rect class="d-box-accent" x="70" y="204" width="100" height="40" rx="8"/>
  <text class="d-text d-accent" x="120" y="230" text-anchor="middle">fib(2)</text>
  <rect class="d-box-muted" x="270" y="204" width="100" height="40" rx="8"/>
  <text class="d-text" x="320" y="230" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="420" y="204" width="100" height="40" rx="8"/>
  <text class="d-text" x="470" y="230" text-anchor="middle">fib(1)</text>
  <rect class="d-box-muted" x="560" y="204" width="100" height="40" rx="8"/>
  <text class="d-text" x="610" y="230" text-anchor="middle">fib(0)</text>
  <path class="d-edge-accent" d="M 100 244 L 60 266"/>
  <path class="d-edge" d="M 140 244 L 180 266"/>
  <text class="d-sub d-accent" x="60" y="284" text-anchor="middle">fib(1)</text>
  <text class="d-sub" x="180" y="284" text-anchor="middle">fib(0)</text>
</svg>

The highlighted path is what the stack holds at its deepest: fib(4), fib(3), fib(2), fib(1) — four frames for fib(4). In general, naive Fibonacci is **O(2ⁿ) time but only O(n) stack space**.

Common recursions and their stack space:

| Recursion | Max depth | Stack space |
| :--- | :--- | :--- |
| \`sum(n) = n + sum(n − 1)\` | n + 1 | O(n) |
| Binary search on n items | about log₂ n | O(log n) |
| Naive Fibonacci \`fib(n)\` | n | O(n) — even though time is O(2ⁿ) |
| DFS on a tree of height h | h | O(h): O(log n) balanced, O(n) for a chain |
| Merge sort | log₂ n | O(log n) stack + O(n) merge buffer = O(n) |
| Quicksort | log n on average, n in the worst case | O(log n) average, O(n) worst |
| Generating all subsets of n items | n | O(n) stack (plus the output itself) |

## 4. The Rule in Code

Here are the three recursions from the table, instrumented with \`enter()\` / \`leave()\` helpers that track the current and maximum depth. They are the core of the first runnable example:

~~~cpp
long long sumRecursive(int n) {    // O(n) stack: n frames are alive at the deepest point
    enter();
    long long result = n == 0 ? 0 : n + sumRecursive(n - 1);
    leave();
    return result;
}

long long sumIterative(int n) {    // O(1) stack: one frame, one running total
    enter();
    long long total = 0;
    for (int i = 1; i <= n; i++) total += i;
    leave();
    return total;
}
~~~

~~~cpp
bool bsearch(const vector<int>& nums, int target, int lo, int hi) {  // O(log n) stack
    enter();
    bool found;
    if (lo > hi) {
        found = false;
    } else {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) found = true;
        else if (nums[mid] < target) found = bsearch(nums, target, mid + 1, hi);
        else found = bsearch(nums, target, lo, mid - 1);
    }
    leave();
    return found;
}
~~~

~~~cpp
long long calls = 0;
int fib(int n) {                   // O(2^n) time, but only O(n) stack
    calls++;
    enter();
    int result = n < 2 ? n : fib(n - 1) + fib(n - 2);
    leave();
    return result;
}
~~~

The iterative sum uses one frame however large n gets; the recursive one keeps n + 1 frames waiting for the ones above them to return.

📌 **Interview term: Tail call** — a call that is the very last thing a function does (\`return f(n − 1, acc + n)\`). Some languages reuse the current frame for it (**tail-call optimisation**), turning the recursion into a loop with O(1) stack. Whether C++ does that is answered by running it, in the next section.

## 5. The Stack Limit in C++

C++ has no recursion counter and no catchable error: the program uses the operating system's stack for the main thread, and if recursion goes past it, the process is killed. This snippet is compiled twice, without and with optimisation, and run with a small and a huge n:

~~~cpp
#include <cstdlib>
#include <iostream>

long long sumTo(long long n) {           // n + 1 frames deep (unless the optimiser removes them)
    return n == 0 ? 0 : n + sumTo(n - 1);
}

int main(int argc, char** argv) {
    long long n = argc > 1 ? std::atoll(argv[1]) : 1000;
    std::cout << "sumTo(" << n << ") = " << std::flush;
    std::cout << sumTo(n) << std::endl;
    return 0;
}
~~~

Output of the build-and-run steps (each command is shown after a \`$\`):

~~~text
$ ulimit -s   (stack size limit in KB)
8192
$ ./sum_O0 1000
sumTo(1000) = 500500
$ ./sum_O0 10000000
sumTo(10000000) =
exit status: 139
$ ./sum_O2 10000000
sumTo(10000000) = 50000005000000
~~~

What the run shows (GCC 13 on Linux):

- The main-thread stack limit was **8192 KB** (\`ulimit -s\`), an operating-system setting, not a C++ one.
- At \`-O0\`, ten million nested calls overflowed it and the process died with exit status **139**: 128 + signal 11, \`SIGSEGV\`. There is no exception to catch; formally, the behaviour is undefined.
- At \`-O2\`, the *same source* returned the right answer. GCC rewrote this simple recursion into a loop with an accumulator, so it used O(1) stack. That is an optimisation the compiler is **allowed** but **not required** to make; change the code slightly, the compiler or the flags, and the crash comes back. Do not count on it in an interview.

The safe rule: assume recursion costs O(depth) stack, and keep depth logarithmic or convert to a loop / explicit \`std::vector\` stack.

## 6. Getting Rid of the Stack: Loops and Explicit Stacks

Two techniques remove the call-stack cost:

1. **A plain loop** when each call only depends on the next one (sum, factorial, binary search). That brings the stack down to O(1).
2. **An explicit stack** — a list you push and pop yourself — when the recursion branches (tree and graph walks). The memory moves from the small call stack to the much larger heap, and you control it.

Here is an in-place reversal next to a copying one, and a depth-first walk that uses its own stack:

~~~cpp
int reverseInPlace(vector<int>& a) {          // O(1) extra: two indices and std::swap
    int i = 0, j = (int) a.size() - 1;
    while (i < j) swap(a[i++], a[j--]);
    return 0;                                 // extra element slots used
}

vector<int> reversedCopy(const vector<int>& a) {   // O(n) extra: a whole new vector
    return vector<int>(a.rbegin(), a.rend());      // out.size() extra slots
}
~~~

~~~cpp
template <typename Children>
pair<int, int> countNodes(int n, Children children) {
    // Depth-first walk with our own stack instead of the call stack.
    vector<int> stack = {0};
    int seen = 0, peak = 1;
    while (!stack.empty()) {
        int node = stack.back();
        stack.pop_back();
        seen++;
        for (int child : children(node, n)) stack.push_back(child);
        peak = max(peak, (int) stack.size());
    }
    return {seen, peak};
}

vector<int> chain(int i, int n) {             // 0 -> 1 -> 2 -> ... : depth n
    return i + 1 < n ? vector<int>{i + 1} : vector<int>{};
}

vector<int> balanced(int i, int n) {          // children of i are 2i+1 and 2i+2
    vector<int> out;
    for (int c : {2 * i + 1, 2 * i + 2}) if (c < n) out.push_back(c);
    return out;
}
~~~

On a 100,000-node chain, a recursive walk would need 100,000 frames, far beyond the limits shown in section 5. The explicit stack never held more than **1** entry, because each node is popped before its child is pushed. On a balanced tree of height 17, it peaked at 17 entries: an explicit-stack DFS stores pending nodes, about one per level here, so its memory is still O(height), just on the heap. (The same walk in breadth-first order is on the [BFS vs DFS page](/interview-question/what-is-the-difference-between-bfs-and-dfs).)

C++ detail: local variables live in the stack frame, so a large local array (\`int buf[10000000];\`, about 40 MB) overflows the 8 MB stack even without recursion. Put big buffers in a \`std::vector\`, which keeps its elements on the heap and only a small header in the frame. Passing a \`std::vector\` **by value** into a recursive function copies it at every level: O(n) per call; pass \`const std::vector<int>&\`.

## 7. Verified: Running the Code

Both programs are the runnable examples under "C++ code" on this page, run with \`g++ -std=c++17 main.cpp && ./a.out\`.

**Example 1 — stack depth of recursive vs iterative code:**

~~~text
sum 1..500 recursive: 125250, max stack depth 501
sum 1..500 iterative: 125250, max stack depth 1
binary search over 1000000 items: found=true, max stack depth 20
fib(20) naive: 6765, calls 21891, max stack depth 20
~~~

\`sum(500)\` reached **501** frames (500 down to the base case 0), the loop **1**. Binary search over a million items needed only **20** frames, because the range halves per call. And \`fib(20)\` made **21,891** calls but never had more than **20** frames alive: exponential time, linear stack.

**Example 2 — extra space and the explicit stack:**

~~~text
reverse in place: [5, 4, 3, 2, 1], extra slots 0
reversed copy:    [5, 4, 3, 2, 1], extra slots 5
chain of 100000 nodes: visited 100000, peak explicit stack 1
balanced tree of 131071 nodes (height 17): visited 131071, peak explicit stack 17
~~~

Same reversed output, but the in-place version used 0 extra slots and the copy 5 (O(1) vs O(n)). The explicit-stack walk visited all 100,000 chain nodes with a stack of 1, and all 131,071 nodes of the balanced tree with a stack that peaked at 17.

## 8. Complexity of the Examples

| Function | Time | Stack space | Other extra space |
| :--- | :--- | :--- | :--- |
| recursive sum | O(n) | O(n) | O(1) |
| iterative sum | O(n) | O(1) | O(1) |
| recursive binary search | O(log n) | O(log n) | O(1) |
| naive \`fib(n)\` | O(2ⁿ) | O(n) | O(1) |
| reverse in place | O(n) | O(1) | O(1) |
| reversed copy | O(n) | O(1) | O(n) |
| explicit-stack DFS | O(n) | O(1) | O(h) to O(n) for the explicit stack |

## 9. Edge Cases and Subtleties

- **Memoisation trades space for time.** Caching \`fib\` results makes it O(n) time but adds an O(n) cache on top of the O(n) stack. Space is still O(n), but the constant doubles.
- **Output space.** Generating all subsets returns 2ⁿ lists; that is O(n · 2ⁿ) output even though the recursion stack is only O(n). State both.
- **The input can count.** "Total space" includes the input; "auxiliary space" does not. A function that sorts a copy of the input uses O(n) auxiliary space, while one that sorts in place may use only O(log n) for the recursion.
- **Two recursive calls do not double the depth.** \`f(n − 1) + f(n − 1)\` doubles the *time* per level, but the depth is still n.
- **Garbage counts while it is reachable.** Temporary objects that are still referenced (by a frame, a closure or a cache) are part of the algorithm's memory at that moment.

## Common Pitfalls

- **Counting calls instead of depth.** Naive \`fib(20)\` made 21,891 calls but never had more than 20 frames alive: the stack space is O(n), the time O(2ⁿ).
- **Trusting \`-O2\` to save deep recursion.** It turned \`sumTo\` into a loop here, but that is not guaranteed; at \`-O0\` the same code crashed with exit status 139.
- **Big local arrays.** A local \`int a[10000000]\` (about 40 MB) does not fit in an 8 MB stack; use \`std::vector\`.
- **Passing containers by value in recursion.** Each level copies the whole vector: O(n) extra per frame, O(n²) total. Use \`const&\`.
- **Expecting an exception.** Stack overflow in C++ is a crash, not a \`std::exception\`; you cannot clean up after it.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">Space complexity is how the extra memory an algorithm needs grows with n; usually we count auxiliary space, not the input itself.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Recursion:</strong> <span style="color:#f0e2c8;">Every active call holds a stack frame, so recursion uses O(maximum depth) stack space, not O(number of calls).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Examples:</strong> <span style="color:#f0e2c8;">Recursive sum is O(n) stack, recursive binary search O(log n), naive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(n)</code> O(n) stack despite O(2^n) calls; I measured 20 frames for 21,891 calls of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(20)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. C++ specifics:</strong> <span style="color:#f0e2c8;">The main-thread stack is an OS limit, 8 MB here; overflowing it kills the process with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SIGSEGV</code> (exit 139), and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-O2</code> may or may not turn recursion into a loop.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The fix:</strong> <span style="color:#f0e2c8;">Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> as an explicit stack or rewrite as a loop, keep big buffers in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> on the heap, and pass containers by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the space complexity of merge sort?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">O(n) auxiliary for the merge buffer plus O(log n) stack for the recursion, so O(n) overall. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::stable_sort</code> also uses a buffer; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> sorts in place but still recurses.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the stack space of naive Fibonacci O(n) and not O(2^n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only one root-to-leaf path of the call tree is on the stack at a time: when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(n-1)</code> returns, its frames are gone before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(n-2)</code> starts. The deepest path has n frames.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does C++ do tail-call optimisation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The language does not require it. GCC at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-O2</code> removed the recursion from my <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sumTo</code>, but at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-O0</code> the same code overflowed the stack. It is an optimisation, not a guarantee.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a recursive DFS on a tree O(n) space?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is O(h), the height. Balanced: O(log n). Path-shaped: O(n), which can crash with millions of nodes on an 8 MB stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Stack or heap: where does a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::vector&lt;int&gt;(n)</code> live?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The small vector object (pointer, size, capacity) is in the frame; its n elements are on the heap. That is why it does not overflow the stack, but it is still O(n) space.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Space complexity** | How memory use grows with n |
| **Auxiliary space** | Extra memory beyond the input |
| **In-place algorithm** | Rearranges the input with O(1) extra memory |
| **Call stack** | Last-in, first-out record of unfinished calls |
| **Stack frame** | One call's parameters, locals and return address |
| **Recursion depth** | Most frames of the function alive at once |
| **Stack overflow** | Running out of call-stack memory |
| **Tail call / tail-call optimisation** | A call made last; reusing its frame so recursion uses O(1) stack |
| **\`SIGSEGV\`** | The signal that kills a C++ program on a stack overflow (exit 139) |

**Conclusion:** Space complexity is the memory version of Big-O, and recursion is where its hidden part lives: every unfinished call is a frame on the call stack, so a recursion costs O(maximum depth) stack space — 501 frames for \`sum(500)\`, 20 for a binary search over a million items, and 20 for \`fib(20)\` despite its 21,891 calls. In C++, that stack is limited, as the run in section 5 showed, so the practical skill is to keep recursion depth logarithmic or to replace it with a loop or an explicit stack, and to state both the time and the space of whatever you write.`,
        examples: [
          {
            label: "Measure the call-stack depth of recursive and iterative code",
            code: `#include <iostream>
#include <vector>
using namespace std;

// Measure how deep the call stack gets: the space cost of recursion.

int depth = 0;      // frames of our function currently on the stack
int maxDepth = 0;   // the most there ever were at once
void enter() { depth++; if (depth > maxDepth) maxDepth = depth; }
void leave() { depth--; }
void reset() { depth = 0; maxDepth = 0; }

long long sumRecursive(int n) {    // O(n) stack: n frames are alive at the deepest point
    enter();
    long long result = n == 0 ? 0 : n + sumRecursive(n - 1);
    leave();
    return result;
}

long long sumIterative(int n) {    // O(1) stack: one frame, one running total
    enter();
    long long total = 0;
    for (int i = 1; i <= n; i++) total += i;
    leave();
    return total;
}

bool bsearch(const vector<int>& nums, int target, int lo, int hi) {  // O(log n) stack
    enter();
    bool found;
    if (lo > hi) {
        found = false;
    } else {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) found = true;
        else if (nums[mid] < target) found = bsearch(nums, target, mid + 1, hi);
        else found = bsearch(nums, target, lo, mid - 1);
    }
    leave();
    return found;
}

long long calls = 0;
int fib(int n) {                   // O(2^n) time, but only O(n) stack
    calls++;
    enter();
    int result = n < 2 ? n : fib(n - 1) + fib(n - 2);
    leave();
    return result;
}

int main() {
    reset();
    long long r = sumRecursive(500);
    cout << "sum 1..500 recursive: " << r << ", max stack depth " << maxDepth << "\\n";
    reset();
    r = sumIterative(500);
    cout << "sum 1..500 iterative: " << r << ", max stack depth " << maxDepth << "\\n";

    vector<int> nums(1000000);
    for (int i = 0; i < (int) nums.size(); i++) nums[i] = i;
    reset();
    bool found = bsearch(nums, 999999, 0, (int) nums.size() - 1);
    cout << boolalpha << "binary search over 1000000 items: found=" << found << ", max stack depth " << maxDepth << "\\n";

    reset();
    calls = 0;
    int f = fib(20);
    cout << "fib(20) naive: " << f << ", calls " << calls << ", max stack depth " << maxDepth << "\\n";
    return 0;
}`,
          },
          {
            label: "O(1) vs O(n) extra space, and replacing recursion with an explicit stack",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

// Same answers, different memory: O(1) vs O(n) extra space, and an explicit stack.

string fmt(const vector<int>& a) {
    string s = "[";
    for (size_t k = 0; k < a.size(); k++) s += (k ? ", " : "") + to_string(a[k]);
    return s + "]";
}

int reverseInPlace(vector<int>& a) {          // O(1) extra: two indices and std::swap
    int i = 0, j = (int) a.size() - 1;
    while (i < j) swap(a[i++], a[j--]);
    return 0;                                 // extra element slots used
}

vector<int> reversedCopy(const vector<int>& a) {   // O(n) extra: a whole new vector
    return vector<int>(a.rbegin(), a.rend());      // out.size() extra slots
}

template <typename Children>
pair<int, int> countNodes(int n, Children children) {
    // Depth-first walk with our own stack instead of the call stack.
    vector<int> stack = {0};
    int seen = 0, peak = 1;
    while (!stack.empty()) {
        int node = stack.back();
        stack.pop_back();
        seen++;
        for (int child : children(node, n)) stack.push_back(child);
        peak = max(peak, (int) stack.size());
    }
    return {seen, peak};
}

vector<int> chain(int i, int n) {             // 0 -> 1 -> 2 -> ... : depth n
    return i + 1 < n ? vector<int>{i + 1} : vector<int>{};
}

vector<int> balanced(int i, int n) {          // children of i are 2i+1 and 2i+2
    vector<int> out;
    for (int c : {2 * i + 1, 2 * i + 2}) if (c < n) out.push_back(c);
    return out;
}

int main() {
    vector<int> a = {1, 2, 3, 4, 5};
    int extra = reverseInPlace(a);
    cout << "reverse in place: " << fmt(a) << ", extra slots " << extra << "\\n";
    vector<int> out = reversedCopy({1, 2, 3, 4, 5});
    cout << "reversed copy:    " << fmt(out) << ", extra slots " << out.size() << "\\n";

    auto [seen, peak] = countNodes(100000, chain);
    cout << "chain of 100000 nodes: visited " << seen << ", peak explicit stack " << peak << "\\n";
    auto [seen2, peak2] = countNodes(131071, balanced);
    cout << "balanced tree of 131071 nodes (height 17): visited " << seen2 << ", peak explicit stack " << peak2 << "\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is amortized analysis?",
    difficulty: "medium",
    seoDescription: "Amortized analysis explained: why dynamic-array append is O(1), the aggregate, banker and potential methods, with copy counts verified in 4 languages.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Appending to a dynamic array sometimes has to copy every element into a bigger block, which is O(n). Yet everyone says append is O(1). Explain how both can be true, what amortized analysis is, and show it for the Python structures you would use."

**What a strong answer should cover:**
- Amortized cost = total cost of a worst-case sequence of n operations, divided by n; it is a guarantee, not an average over random inputs.
- The doubling argument: copies 1 + 2 + 4 + … < 2n, so n appends cost under 3n — O(1) amortized, while a single append is still O(n) in the worst case.
- Why the growth must be geometric: growing by a constant amount gives O(n²) total; shrinking must leave a gap (shrink at ¼ full, not ½) or it thrashes.
- The three methods by name (aggregate, accounting/banker, potential) and another example such as a queue built from two stacks.
- Python specifics: \`list.append\` is amortized O(1) while \`list.pop(0)\` is O(n) every call; CPython over-allocates by roughly an eighth, which is still a geometric growth factor.

**Clarifying questions expected:**
- "Do we care about the worst case of a single operation (latency), or only total throughput?"
- "Do we know the final size in advance, so we could pre-allocate?"

**Code / implementation expected:** Optional — a Python dynamic array or a two-stack queue that counts copies, with the amortized argument stated.`,
        answer: `**Target Audience:** Interview candidates who know [Big-O notation](/interview-question/what-is-big-o-notation) and want to understand why "occasionally slow" operations can still be O(1).
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every count on this page comes from running the Python code shown, and the **Verified** section quotes that output; library behaviour is either measured or cited.

## 1. Why This Even Matters — A Story First

You collect books. They live on a bookshelf, and when the shelf is full you buy one twice as big and carry every book across. Moving day is miserable: the day you go from 512 to 1,024 slots, you carry 512 books.

But look at the whole year. You moved 1 book, then 2, then 4, then 8 … then 512. Add them up: 1,023 moves for 1,024 books, **less than one move per book**. Most days you simply put a new book on the shelf. The rare terrible day is paid for by the hundreds of easy days before it.

That is amortized analysis: instead of asking "how bad can one operation be?", you ask "how bad can a long **sequence** of operations be, per operation?" For the bookshelf the answer is "a small constant", even though one day was huge. The same reasoning explains why appending to a dynamic array is called O(1), why a queue made of two stacks is fast, and why a badly chosen growth rule can quietly make code quadratic.

## 2. The Idea in Plain Language

📌 **Interview term: Amortized cost** — the total cost of a worst-case sequence of n operations, divided by n. "Append is O(1) amortized" means: any n appends, starting from empty, cost O(n) in total.

📌 **Interview term: Amortized vs average case** — average case averages over *random inputs* and can be unlucky; amortized averages over a *sequence* and is a guarantee for every sequence. No probability is involved.

📌 **Interview term: Dynamic array** — an array that, when full, allocates a bigger block and copies its elements over (see [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list)).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Cost of pushes 1 to 17 with doubling, spikes at 2, 3, 5, 9 and 17">
  <text class="d-text" x="380" y="26" text-anchor="middle">Cost of each push with doubling (measured)</text>
  <path class="d-edge" d="M 60 250 L 720 250"/>
  <rect class="d-box-muted" x="70" y="240" width="26" height="10"/>
  <rect class="d-box-accent" x="108" y="230" width="26" height="20"/>
  <rect class="d-box-accent" x="146" y="220" width="26" height="30"/>
  <rect class="d-box-muted" x="184" y="240" width="26" height="10"/>
  <rect class="d-box-accent" x="222" y="200" width="26" height="50"/>
  <rect class="d-box-muted" x="260" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="298" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="336" y="240" width="26" height="10"/>
  <rect class="d-box-accent" x="374" y="160" width="26" height="90"/>
  <rect class="d-box-muted" x="412" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="450" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="488" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="526" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="564" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="602" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="640" y="240" width="26" height="10"/>
  <rect class="d-box-accent" x="678" y="80" width="26" height="170"/>
  <path class="d-edge-dashed" d="M 60 220 L 720 220"/>
  <text class="d-sub" x="83" y="274" text-anchor="middle">1</text>
  <text class="d-sub" x="235" y="274" text-anchor="middle">5</text>
  <text class="d-sub" x="387" y="274" text-anchor="middle">9</text>
  <text class="d-sub" x="539" y="274" text-anchor="middle">13</text>
  <text class="d-sub" x="691" y="274" text-anchor="middle">17</text>
  <text class="d-sub d-accent" x="387" y="148" text-anchor="middle">cost 9</text>
  <text class="d-sub d-accent" x="640" y="72" text-anchor="middle">cost 17</text>
  <text class="d-sub" x="80" y="120">dashed line: 3 per push</text>
</svg>

The spikes (accent bars) are the resizes: costs 2, 3, 5, 9, 17 at pushes 2, 3, 5, 9 and 17. Every other push costs 1. The spikes get taller, but they also get twice as far apart, so the running average never exceeds 3 per push — the dashed line.

## 3. Proving It: Three Methods

### Aggregate method

📌 **Interview term: Aggregate method** — add up the total cost of n operations directly and divide by n.

With doubling from capacity 1, resizes happen when the size reaches 1, 2, 4, …, up to the largest power of two below n, and each copies that many elements:

> copies = 1 + 2 + 4 + … + 2ᵏ = 2ᵏ⁺¹ − 1 < 2n

Each push also does 1 write, so the total is less than n + 2n = **3n**, and the amortized cost per push is **O(1)**. The run below measured 1,023 copies for 1,000 pushes and 1,048,575 for a million — both under 2n.

### Accounting (banker's) method

📌 **Interview term: Accounting (banker's) method** — charge every operation a fixed "price"; cheap operations overpay and store the extra as credit, and expensive ones spend the saved credit. If the credit never goes negative, the price is a valid amortized cost.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 220" role="img" aria-label="Each push pays 3 coins: one for the write and two saved for a future copy">
  <defs>
    <marker id="b01q4-arrow-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="380" y="26" text-anchor="middle">Banker view: every push pays 3 coins</text>
  <rect class="d-box-accent" x="40" y="70" width="180" height="90" rx="10"/>
  <text class="d-text d-accent" x="130" y="104" text-anchor="middle">push pays 3</text>
  <text class="d-sub" x="130" y="134" text-anchor="middle">a fixed price</text>
  <path class="d-edge" d="M 226 115 L 290 115" marker-end="url(#b01q4-arrow-a)"/>
  <rect class="d-box-muted" x="296" y="56" width="180" height="56" rx="10"/>
  <text class="d-text" x="386" y="90" text-anchor="middle">1 coin: the write</text>
  <rect class="d-box-muted" x="296" y="124" width="180" height="56" rx="10"/>
  <text class="d-text" x="386" y="158" text-anchor="middle">2 coins: saved</text>
  <path class="d-edge-dashed" d="M 482 152 L 546 152" marker-end="url(#b01q4-arrow-a)"/>
  <rect class="d-box-muted" x="552" y="110" width="180" height="84" rx="10"/>
  <text class="d-text" x="642" y="144" text-anchor="middle">later resize</text>
  <text class="d-sub" x="642" y="172" text-anchor="middle">spends saved coins</text>
</svg>

Why 2 saved coins are enough: right after a resize to capacity 2m, the array holds m elements and no credit. The next m pushes each save 2 coins, 2m in total, which is exactly what the next resize needs to copy 2m elements. Credit never goes negative, so 3 per push is a valid amortized cost.

### Potential method

📌 **Interview term: Potential method** — define a "potential" Φ, a number computed from the data structure's state (like stored energy). Amortized cost = actual cost + change in Φ. If Φ starts at 0 and never goes negative, the amortized costs add up to at least the actual total.

For the dynamic array, Φ = 2 · size − capacity works: a normal push raises Φ by 2 (actual 1, amortized 3), and a push that resizes from capacity m drops Φ from m to 2, cancelling the m copies (actual m + 1, amortized 3 again). Φ is 0 or more once the array has been filled the first time, which is all the proof needs. It is the banker's argument written as a formula, and it is the method used for harder cases such as [union-find](/interview-question/what-is-the-union-find-disjoint-set-data-structure) with path compression.

## 4. The Code: a Dynamic Array That Counts Its Copies

~~~python
class DynamicArray:
    def __init__(self, grow):
        self.grow = grow            # function: old capacity -> new capacity
        self.capacity = 1
        self.size = 0
        self.slots = [None]
        self.copies = 0             # elements moved during resizes

    def push(self, value):
        """Append; return the cost of this push (1 write + any copies)."""
        cost = 1
        if self.size == self.capacity:          # full: allocate and copy
            new_cap = self.grow(self.capacity)
            new_slots = [None] * new_cap
            for i in range(self.size):
                new_slots[i] = self.slots[i]
            self.copies += self.size
            cost += self.size
            self.slots, self.capacity = new_slots, new_cap
        self.slots[self.size] = value
        self.size += 1
        return cost
~~~

Python detail: the hand-written class uses \`[None] * new_cap\` to allocate and a plain loop to copy, so every copy is visible and counted. A real \`list\` does the same work in C (\`list.append\` never shows you the copy), which is why you cannot see the cost — only the occasional slower append.

### Why the growth rule must be multiplicative

The same class takes the growth rule as a function. With **doubling**, the average cost settled at about 2 per push no matter how large n got. With **"add 16 slots"**, a resize happens every 16 pushes and copies everything stored so far: the copies are 16 + 32 + 48 + … ≈ n² / 32, so the average cost *grows with n* (32.31 per push at n = 1,000 and 313.06 at n = 10,000 in the run below). Constant-size growth is O(n) per push, O(n²) in total.

📌 **Interview term: Geometric growth** — growing capacity by a constant **factor** (×1.5, ×2) rather than a constant amount. Any factor greater than 1 keeps the copies a geometric series and append amortized O(1).

## 5. How Python's list Really Grows

Python's \`list\` is a dynamic array, and you can watch it over-allocate: \`sys.getsizeof\` reports the bytes the list object has reserved, which jumps only when it grows.

~~~python
import sys

nums = []
last = sys.getsizeof(nums)
print("len  0: list object is", last, "bytes")
for i in range(64):
    nums.append(i)
    size = sys.getsizeof(nums)
    if size != last:                   # the list just over-allocated new room
        slots = (size - sys.getsizeof([])) // 8
        print("len " + str(len(nums)).rjust(2) + ": grew to " + str(size) + " bytes, room for about " + str(slots) + " items")
        last = size
~~~

Output of \`python3 main.py\`:

~~~text
len  0: list object is 56 bytes
len  1: grew to 88 bytes, room for about 4 items
len  5: grew to 120 bytes, room for about 8 items
len  9: grew to 184 bytes, room for about 16 items
len 17: grew to 248 bytes, room for about 24 items
len 25: grew to 312 bytes, room for about 32 items
len 33: grew to 376 bytes, room for about 40 items
len 41: grew to 472 bytes, room for about 52 items
len 53: grew to 568 bytes, room for about 64 items
~~~

On this 64-bit CPython 3.13 run, the list reserved room for 4, 8, 16, 24, 32, 40, 52 and 64 items (each slot is an 8-byte pointer, hence "about"). That is the growth pattern described in a comment in CPython's \`Objects/listobject.c\`: past the first few sizes it grows by roughly an eighth plus a small constant, not by doubling.

That is still enough for amortized O(1). Any growth by a constant **factor** greater than 1 makes the copies form a geometric series; a smaller factor just means more frequent, smaller resizes (a bigger constant in front of the O(n) total) and less wasted memory. The [Python wiki TimeComplexity page](https://wiki.python.org/moin/TimeComplexity) lists \`append\` as O(1) amortized for exactly this reason. If you know the final size, \`[None] * n\` allocates once.

## 6. A Second Classic: a Queue Made of Two Stacks

A queue (first in, first out) can be built from two stacks: push new items onto \`inbox\`; to dequeue, pop from \`outbox\`, and when \`outbox\` is empty, first pour everything from \`inbox\` into it (which reverses the order, putting the oldest item on top). The full question has its own page: [implement a queue using two stacks](/interview-question/how-do-you-implement-a-queue-using-two-stacks).

~~~python
class TwoStackQueue:
    def __init__(self):
        self.inbox, self.outbox = [], []
        self.moves = 0                      # elements moved from inbox to outbox

    def enqueue(self, x):                   # always O(1)
        self.inbox.append(x)

    def dequeue(self):
        """Return (value, elements moved by this call)."""
        moved = 0
        if not self.outbox:                 # refill only when outbox is empty
            while self.inbox:
                self.outbox.append(self.inbox.pop())
                moved += 1
        self.moves += moved
        return self.outbox.pop(), moved
~~~

One dequeue can be terrible: after 1,000 enqueues, the first dequeue moves all 1,000 elements. But **each element is moved at most once** in its life (inbox → outbox), so over any sequence the moves can never exceed the number of enqueues. Every operation is O(1) amortized. In Python both stacks are plain lists (\`append\` and \`pop()\` from the end are O(1) amortized). For a real queue, \`collections.deque\` already gives O(1) \`append\` and \`popleft\` without any amortization trick, but the two-stack version is the standard interview question.

## 7. A Trap: Shrinking Too Eagerly

If a dynamic array also shrinks when elements are removed, the shrink rule must leave a gap. Shrink to half capacity as soon as the array is half empty, and a push/pop pair at the boundary resizes *every* time: the push grows (copy n), the pop shrinks (copy n), and so on.

~~~python
def copies_for(shrink_at, start, rounds):
    """Fill to \`start\` items (a full array), then alternate push/pop \`rounds\` times.
    Grow x2 when full; shrink to half when size <= capacity * shrink_at."""
    capacity, size, copies = start, start, 0
    for _ in range(rounds):
        if size == capacity:            # push into a full array: grow
            copies += size
            capacity *= 2
        size += 1
        size -= 1                       # pop
        if capacity > 1 and size <= capacity * shrink_at:
            copies += size              # shrink: copy survivors into a smaller array
            capacity //= 2
    return copies
~~~

The fix is to shrink only when the array is a **quarter** full. After any resize the array is half full, so at least a quarter-capacity's worth of operations must happen before the next resize, which pays for it.

📌 **Interview term: Thrashing** — repeatedly growing and shrinking (or loading and evicting) because the thresholds are too close together, so every operation pays the expensive path.

## 8. Verified: Running the Code

All three programs are the runnable examples under "Python code" on this page, run with \`python3 main.py\`.

**Example 1 — cost of each push, doubling vs +16:**

~~~text
doubling: cost of each push (1 write + copies)
  push 1: cost 1
  push 2: cost 2 (grow 1 -> 2)
  push 3: cost 3 (grow 2 -> 4)
  push 4: cost 1
  push 5: cost 5 (grow 4 -> 8)
  push 6: cost 1
  push 7: cost 1
  push 8: cost 1
  push 9: cost 9 (grow 8 -> 16)
  push 10: cost 1
  push 11: cost 1
  push 12: cost 1
  push 13: cost 1
  push 14: cost 1
  push 15: cost 1
  push 16: cost 1
  push 17: cost 17 (grow 16 -> 32)
doubling, n=1000: copies 1023, total cost 2023, average 2.02 per push
doubling, n=1000000: copies 1048575, total cost 2048575, average 2.05 per push
grow by +16, n=1000: copies 31311, total cost 32311, average 32.31 per push
grow by +16, n=10000: copies 3120625, total cost 3130625, average 313.06 per push
~~~

The per-push costs spike at pushes 2, 3, 5, 9 and 17 (the resizes) and are 1 otherwise. With doubling the average stayed at 2.02 and 2.05 per push from 1,000 to 1,000,000 pushes; with +16 it went from 32.31 to 313.06 when n grew tenfold — the signature of O(n) per push.

**Example 2 — the two-stack queue:**

~~~text
enqueue 1..1000, then dequeue all
  first five out: [1, 2, 3, 4, 5]
  most expensive single dequeue moved 1000 elements
  total moves 1000 over 2000 operations = 0.50 per operation
interleaved: 100000 enqueues and 50000 dequeues
  most expensive single dequeue moved 32768 elements
  total moves 65534 over 150000 operations = 0.44 per operation
~~~

The queue is still first-in, first-out (1, 2, 3, 4, 5). One dequeue moved 1,000 elements, yet the total was 1,000 moves for 2,000 operations. In the interleaved run the worst dequeue moved 32,768 elements, and the average was still below 1 move per operation.

**Example 3 — shrink policies:**

~~~text
shrink when half empty   -> 2048000 copies for 1000 push/pop pairs
shrink when 3/4 empty    -> 1024 copies for 1000 push/pop pairs
~~~

Shrinking at half full did 2,048 copies per push/pop pair (one grow and one shrink of 1,024 elements, every round). Shrinking at a quarter did one grow and then nothing.

## 9. Complexity Summary

| Operation | Worst single call | Amortized | Why |
| :--- | :--- | :--- | :--- |
| Dynamic array push, doubling | O(n) | **O(1)** | copies sum to < 2n |
| Dynamic array push, +16 growth | O(n) | O(n) | copies sum to about n² / 32 |
| Dynamic array pop with ¼ shrink rule | O(n) | **O(1)** | a gap between grow and shrink thresholds |
| Dynamic array pop with ½ shrink rule | O(n) | O(n) | thrashes at the boundary |
| Two-stack queue enqueue | O(1) | O(1) | one push |
| Two-stack queue dequeue | O(n) | **O(1)** | each element moved once |
| Space for all of the above | — | O(n) | at most a constant factor of slack |

Other places amortized analysis shows up: hash tables that rehash into a bigger table ([how a hash table works](/interview-question/how-does-a-hash-table-work)), the [monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it) where each element is pushed and popped once, the [sliding window](/interview-question/what-is-the-sliding-window-technique) where each pointer only moves forward, and union-find with path compression.

## 10. Edge Cases and Subtleties

- **Amortized bounds assume you start from the beginning.** "n operations cost O(n)" is about a sequence starting from an empty (or freshly built) structure; a single operation picked at random can still be the expensive one.
- **Latency vs throughput.** Amortized O(1) is about total work. If one slow operation is unacceptable (a request with a deadline), pre-allocate or use a structure with a worst-case O(1) bound.
- **Two different "O(1)s".** Hash-map lookups are *average-case* O(1) (they depend on the hash); dynamic-array appends are *amortized* O(1) (they do not). A hash table's insert is both: average-case per operation, amortized over resizes.
- **The starting capacity does not matter** for the Big-O; it only changes how many tiny resizes happen at the start.
- **Memory slack.** Doubling can leave up to half the capacity unused right after a resize; that is the price of O(1) appends, and still O(n) space.

## Common Pitfalls

- **Calling amortized O(1) "average case".** Amortized is a guarantee over *every* sequence of operations, with no probability involved. A dict lookup is average-case O(1); \`list.append\` is amortized O(1).
- **Forgetting the occasional O(n) spike.** One \`append\` that triggers a resize copies the whole list. For latency-sensitive code, pre-size with \`[None] * n\`.
- **Using \`list.pop(0)\` as a queue and calling it amortized.** It is O(n) on *every* call, not occasionally; use \`collections.deque\`.
- **Growing by a constant amount.** Adding 16 slots per resize gave 313 copies per push at n = 10,000 in the run above, and the number keeps rising with n: O(n) per push, O(n²) in total.
- **Shrinking at half full.** Alternating append/pop at the boundary copied 2,048,000 elements for 1,000 pairs; shrink at a quarter instead.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">Amortized analysis bounds the total cost of any sequence of n operations and divides by n, so an occasionally expensive operation can still be O(1) amortized.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The classic example:</strong> <span style="color:#f0e2c8;">Dynamic-array append: a resize copies everything, but with doubling the copies are 1 + 2 + 4 + ... &lt; 2n, so n appends cost under 3n. I measured 2.05 per push at a million pushes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The methods:</strong> <span style="color:#f0e2c8;">Aggregate: sum the total. Banker: charge each push 3 credits and save 2 for later copies. Potential: a function of the state that pays for the expensive steps.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Python specifics:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.append</code> is amortized O(1); CPython over-allocates by about an eighth, which is still geometric. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop(0)</code> is O(n) every time, not amortized.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The difference:</strong> <span style="color:#f0e2c8;">Amortized is a worst-case guarantee over a sequence, not an average over random inputs; a single operation can still be O(n).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does growing by a constant (say +16) break it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then a resize happens every 16 pushes and copies the current size, so the copies add up to about n^2 / 32: O(n) per push. I measured 313 copies per push at n = 10,000, rising with n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a dict insert amortized O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its resizes are amortized like a list, but the per-operation O(1) is also an average that depends on the hash spreading keys out. So it is amortized and average-case together.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the two-stack queue prove?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each element is pushed once, moved once and popped once, so n operations do at most about 3n steps even though one dequeue can move every element: amortized O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is amortized not good enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When every single operation must be fast, like a frame in a game or a real-time control loop. Then you pre-allocate or use a structure with a worst-case bound.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why shrink at a quarter, not a half?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At half, alternating push and pop at the boundary resizes every time: O(n) each. Shrinking at a quarter leaves a gap, so after a resize Omega(n) operations must happen before the next.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Amortized cost** | Total cost of a worst-case sequence divided by its length |
| **Amortized vs average case** | Guarantee over every sequence vs expectation over random inputs |
| **Dynamic array** | Array that grows by allocating a bigger block and copying |
| **Aggregate method** | Sum the total cost of n operations, divide by n |
| **Accounting (banker's) method** | Overcharge cheap operations, spend the credit on expensive ones |
| **Potential method** | Amortized cost = actual cost + change in a state function Φ |
| **Geometric growth** | Grow capacity by a constant factor, not a constant amount |
| **Thrashing** | Resizing back and forth because thresholds are too close |
| **Over-allocation** | Reserving more slots than needed so most appends are cheap |

**Conclusion:** Amortized analysis answers "what does each operation cost over a whole sequence?" rather than "what is the worst single operation?". For a dynamic array that doubles, the resizes copy fewer than 2n elements in total, so append is O(1) amortized even though one append can be O(n) — measured here at 2.05 copies-plus-writes per push over a million pushes, against 313 per push for a constant +16 growth rule. The same reasoning makes a two-stack queue O(1) per operation and explains why shrinking must wait until a quarter full. In Python, the built-in structures already follow these rules, so the interview skill is to explain *why* they are O(1), name the method you are using, and point out when a single slow operation would still matter.`,
        examples: [
          {
            label: "Dynamic array: cost of every push, doubling vs growing by a constant",
            code: `# A dynamic array built by hand, counting every element copy.

class DynamicArray:
    def __init__(self, grow):
        self.grow = grow            # function: old capacity -> new capacity
        self.capacity = 1
        self.size = 0
        self.slots = [None]
        self.copies = 0             # elements moved during resizes

    def push(self, value):
        """Append; return the cost of this push (1 write + any copies)."""
        cost = 1
        if self.size == self.capacity:          # full: allocate and copy
            new_cap = self.grow(self.capacity)
            new_slots = [None] * new_cap
            for i in range(self.size):
                new_slots[i] = self.slots[i]
            self.copies += self.size
            cost += self.size
            self.slots, self.capacity = new_slots, new_cap
        self.slots[self.size] = value
        self.size += 1
        return cost

def double(c):
    return c * 2

def plus16(c):
    return c + 16

print("doubling: cost of each push (1 write + copies)")
arr = DynamicArray(double)
for v in range(1, 18):
    before = arr.capacity
    cost = arr.push(v)
    note = " (grow " + str(before) + " -> " + str(arr.capacity) + ")" if arr.capacity != before else ""
    print("  push " + str(v) + ": cost " + str(cost) + note)

for name, grow, sizes in [("doubling", double, [1000, 1000000]), ("grow by +16", plus16, [1000, 10000])]:
    for n in sizes:
        arr = DynamicArray(grow)
        total = 0
        for v in range(n):
            total += arr.push(v)
        avg = total / n
        print(name + ", n=" + str(n) + ": copies " + str(arr.copies) + ", total cost " + str(total)
              + ", average " + format(avg, ".2f") + " per push")`,
          },
          {
            label: "Queue from two stacks: one slow dequeue, O(1) amortized",
            code: `# A queue built from two stacks: one dequeue can be slow, the average is O(1).

def fmt(items):
    return "[" + ", ".join(str(x) for x in items) + "]"

class TwoStackQueue:
    def __init__(self):
        self.inbox, self.outbox = [], []
        self.moves = 0                      # elements moved from inbox to outbox

    def enqueue(self, x):                   # always O(1)
        self.inbox.append(x)

    def dequeue(self):
        """Return (value, elements moved by this call)."""
        moved = 0
        if not self.outbox:                 # refill only when outbox is empty
            while self.inbox:
                self.outbox.append(self.inbox.pop())
                moved += 1
        self.moves += moved
        return self.outbox.pop(), moved

q = TwoStackQueue()
for x in range(1, 1001):
    q.enqueue(x)
first_five, worst = [], 0
for _ in range(1000):
    value, moved = q.dequeue()
    worst = max(worst, moved)
    if len(first_five) < 5:
        first_five.append(value)
print("enqueue 1..1000, then dequeue all")
print("  first five out: " + fmt(first_five))
print("  most expensive single dequeue moved " + str(worst) + " elements")
print("  total moves " + str(q.moves) + " over 2000 operations = "
      + format(q.moves / 2000, ".2f") + " per operation")

q = TwoStackQueue()
ops, worst = 0, 0
for x in range(1, 100001):                  # interleave: 2 enqueues, then 1 dequeue
    q.enqueue(x)
    ops += 1
    if x % 2 == 0:
        _, moved = q.dequeue()
        worst = max(worst, moved)
        ops += 1
print("interleaved: 100000 enqueues and 50000 dequeues")
print("  most expensive single dequeue moved " + str(worst) + " elements")
print("  total moves " + str(q.moves) + " over " + str(ops) + " operations = "
      + format(q.moves / ops, ".2f") + " per operation")`,
          },
          {
            label: "Why shrinking at half full breaks the bound",
            code: `# Shrinking too eagerly breaks the amortized bound. Count the copies.

def copies_for(shrink_at, start, rounds):
    """Fill to \`start\` items (a full array), then alternate push/pop \`rounds\` times.
    Grow x2 when full; shrink to half when size <= capacity * shrink_at."""
    capacity, size, copies = start, start, 0
    for _ in range(rounds):
        if size == capacity:            # push into a full array: grow
            copies += size
            capacity *= 2
        size += 1
        size -= 1                       # pop
        if capacity > 1 and size <= capacity * shrink_at:
            copies += size              # shrink: copy survivors into a smaller array
            capacity //= 2
    return copies

for label, shrink_at in [("shrink when half empty   ", 0.5), ("shrink when 3/4 empty    ", 0.25)]:
    c = copies_for(shrink_at, 1024, 1000)
    print(label + "-> " + str(c) + " copies for 1000 push/pop pairs")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Appending to a dynamic array sometimes has to copy every element into a bigger block, which is O(n). Yet everyone says append is O(1). Explain how both can be true, what amortized analysis is, and show it for the JavaScript structures you would use."

**What a strong answer should cover:**
- Amortized cost = total cost of a worst-case sequence of n operations, divided by n; it is a guarantee, not an average over random inputs.
- The doubling argument: copies 1 + 2 + 4 + … < 2n, so n appends cost under 3n — O(1) amortized, while a single append is still O(n) in the worst case.
- Why the growth must be geometric: growing by a constant amount gives O(n²) total; shrinking must leave a gap (shrink at ¼ full, not ½) or it thrashes.
- The three methods by name (aggregate, accounting/banker, potential) and another example such as a queue built from two stacks.
- JavaScript specifics: \`push\`/\`pop\` are amortized O(1) in practice (the spec does not define array growth), \`shift()\` moves elements, and a two-stack queue gives an amortized O(1) dequeue.

**Clarifying questions expected:**
- "Do we care about the worst case of a single operation (latency), or only total throughput?"
- "Do we know the final size in advance, so we could pre-allocate?"

**Code / implementation expected:** Optional — a JavaScript dynamic array or a two-stack queue that counts copies, with the amortized argument stated.`,
        answer: `**Target Audience:** Interview candidates who know [Big-O notation](/interview-question/what-is-big-o-notation) and want to understand why "occasionally slow" operations can still be O(1).
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every count on this page comes from running the JavaScript code shown, and the **Verified** section quotes that output; library behaviour is either measured or cited.

## 1. Why This Even Matters — A Story First

You collect books. They live on a bookshelf, and when the shelf is full you buy one twice as big and carry every book across. Moving day is miserable: the day you go from 512 to 1,024 slots, you carry 512 books.

But look at the whole year. You moved 1 book, then 2, then 4, then 8 … then 512. Add them up: 1,023 moves for 1,024 books, **less than one move per book**. Most days you simply put a new book on the shelf. The rare terrible day is paid for by the hundreds of easy days before it.

That is amortized analysis: instead of asking "how bad can one operation be?", you ask "how bad can a long **sequence** of operations be, per operation?" For the bookshelf the answer is "a small constant", even though one day was huge. The same reasoning explains why appending to a dynamic array is called O(1), why a queue made of two stacks is fast, and why a badly chosen growth rule can quietly make code quadratic.

## 2. The Idea in Plain Language

📌 **Interview term: Amortized cost** — the total cost of a worst-case sequence of n operations, divided by n. "Append is O(1) amortized" means: any n appends, starting from empty, cost O(n) in total.

📌 **Interview term: Amortized vs average case** — average case averages over *random inputs* and can be unlucky; amortized averages over a *sequence* and is a guarantee for every sequence. No probability is involved.

📌 **Interview term: Dynamic array** — an array that, when full, allocates a bigger block and copies its elements over (see [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list)).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Cost of pushes 1 to 17 with doubling, spikes at 2, 3, 5, 9 and 17">
  <text class="d-text" x="380" y="26" text-anchor="middle">Cost of each push with doubling (measured)</text>
  <path class="d-edge" d="M 60 250 L 720 250"/>
  <rect class="d-box-muted" x="70" y="240" width="26" height="10"/>
  <rect class="d-box-accent" x="108" y="230" width="26" height="20"/>
  <rect class="d-box-accent" x="146" y="220" width="26" height="30"/>
  <rect class="d-box-muted" x="184" y="240" width="26" height="10"/>
  <rect class="d-box-accent" x="222" y="200" width="26" height="50"/>
  <rect class="d-box-muted" x="260" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="298" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="336" y="240" width="26" height="10"/>
  <rect class="d-box-accent" x="374" y="160" width="26" height="90"/>
  <rect class="d-box-muted" x="412" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="450" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="488" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="526" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="564" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="602" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="640" y="240" width="26" height="10"/>
  <rect class="d-box-accent" x="678" y="80" width="26" height="170"/>
  <path class="d-edge-dashed" d="M 60 220 L 720 220"/>
  <text class="d-sub" x="83" y="274" text-anchor="middle">1</text>
  <text class="d-sub" x="235" y="274" text-anchor="middle">5</text>
  <text class="d-sub" x="387" y="274" text-anchor="middle">9</text>
  <text class="d-sub" x="539" y="274" text-anchor="middle">13</text>
  <text class="d-sub" x="691" y="274" text-anchor="middle">17</text>
  <text class="d-sub d-accent" x="387" y="148" text-anchor="middle">cost 9</text>
  <text class="d-sub d-accent" x="640" y="72" text-anchor="middle">cost 17</text>
  <text class="d-sub" x="80" y="120">dashed line: 3 per push</text>
</svg>

The spikes (accent bars) are the resizes: costs 2, 3, 5, 9, 17 at pushes 2, 3, 5, 9 and 17. Every other push costs 1. The spikes get taller, but they also get twice as far apart, so the running average never exceeds 3 per push — the dashed line.

## 3. Proving It: Three Methods

### Aggregate method

📌 **Interview term: Aggregate method** — add up the total cost of n operations directly and divide by n.

With doubling from capacity 1, resizes happen when the size reaches 1, 2, 4, …, up to the largest power of two below n, and each copies that many elements:

> copies = 1 + 2 + 4 + … + 2ᵏ = 2ᵏ⁺¹ − 1 < 2n

Each push also does 1 write, so the total is less than n + 2n = **3n**, and the amortized cost per push is **O(1)**. The run below measured 1,023 copies for 1,000 pushes and 1,048,575 for a million — both under 2n.

### Accounting (banker's) method

📌 **Interview term: Accounting (banker's) method** — charge every operation a fixed "price"; cheap operations overpay and store the extra as credit, and expensive ones spend the saved credit. If the credit never goes negative, the price is a valid amortized cost.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 220" role="img" aria-label="Each push pays 3 coins: one for the write and two saved for a future copy">
  <defs>
    <marker id="b01q4-arrow-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="380" y="26" text-anchor="middle">Banker view: every push pays 3 coins</text>
  <rect class="d-box-accent" x="40" y="70" width="180" height="90" rx="10"/>
  <text class="d-text d-accent" x="130" y="104" text-anchor="middle">push pays 3</text>
  <text class="d-sub" x="130" y="134" text-anchor="middle">a fixed price</text>
  <path class="d-edge" d="M 226 115 L 290 115" marker-end="url(#b01q4-arrow-a)"/>
  <rect class="d-box-muted" x="296" y="56" width="180" height="56" rx="10"/>
  <text class="d-text" x="386" y="90" text-anchor="middle">1 coin: the write</text>
  <rect class="d-box-muted" x="296" y="124" width="180" height="56" rx="10"/>
  <text class="d-text" x="386" y="158" text-anchor="middle">2 coins: saved</text>
  <path class="d-edge-dashed" d="M 482 152 L 546 152" marker-end="url(#b01q4-arrow-a)"/>
  <rect class="d-box-muted" x="552" y="110" width="180" height="84" rx="10"/>
  <text class="d-text" x="642" y="144" text-anchor="middle">later resize</text>
  <text class="d-sub" x="642" y="172" text-anchor="middle">spends saved coins</text>
</svg>

Why 2 saved coins are enough: right after a resize to capacity 2m, the array holds m elements and no credit. The next m pushes each save 2 coins, 2m in total, which is exactly what the next resize needs to copy 2m elements. Credit never goes negative, so 3 per push is a valid amortized cost.

### Potential method

📌 **Interview term: Potential method** — define a "potential" Φ, a number computed from the data structure's state (like stored energy). Amortized cost = actual cost + change in Φ. If Φ starts at 0 and never goes negative, the amortized costs add up to at least the actual total.

For the dynamic array, Φ = 2 · size − capacity works: a normal push raises Φ by 2 (actual 1, amortized 3), and a push that resizes from capacity m drops Φ from m to 2, cancelling the m copies (actual m + 1, amortized 3 again). Φ is 0 or more once the array has been filled the first time, which is all the proof needs. It is the banker's argument written as a formula, and it is the method used for harder cases such as [union-find](/interview-question/what-is-the-union-find-disjoint-set-data-structure) with path compression.

## 4. The Code: a Dynamic Array That Counts Its Copies

~~~javascript
class DynamicArray {
  constructor(grow) {
    this.grow = grow;            // function: old capacity -> new capacity
    this.capacity = 1;
    this.size = 0;
    this.slots = new Array(1);
    this.copies = 0;             // elements moved during resizes
  }

  push(value) {
    // Append; return the cost of this push (1 write + any copies).
    let cost = 1;
    if (this.size === this.capacity) {           // full: allocate and copy
      const newCap = this.grow(this.capacity);
      const newSlots = new Array(newCap);
      for (let i = 0; i < this.size; i++) newSlots[i] = this.slots[i];
      this.copies += this.size;
      cost += this.size;
      this.slots = newSlots;
      this.capacity = newCap;
    }
    this.slots[this.size] = value;
    this.size++;
    return cost;
  }
}
~~~

JavaScript detail: the hand-written class allocates with \`new Array(newCap)\` and copies with an explicit loop, so every copy is visible and counted. A real \`Array\` hides this work inside the engine, which is why you cannot count it from a script.

### Why the growth rule must be multiplicative

The same class takes the growth rule as a function. With **doubling**, the average cost settled at about 2 per push no matter how large n got. With **"add 16 slots"**, a resize happens every 16 pushes and copies everything stored so far: the copies are 16 + 32 + 48 + … ≈ n² / 32, so the average cost *grows with n* (32.31 per push at n = 1,000 and 313.06 at n = 10,000 in the run below). Constant-size growth is O(n) per push, O(n²) in total.

📌 **Interview term: Geometric growth** — growing capacity by a constant **factor** (×1.5, ×2) rather than a constant amount. Any factor greater than 1 keeps the copies a geometric series and append amortized O(1).

## 5. What You Can (and Cannot) See of Array Growth in JavaScript

JavaScript does not expose an array's capacity, and the ECMAScript specification says nothing about how \`push\` grows storage. The only thing you can observe from a script is time, so this snippet times \`push\` at three sizes:

~~~javascript
// The spec does not expose an array's capacity, so we can only time push.
// Numbers are wall-clock and vary by machine and run; look at the trend only.
for (const n of [100000, 1000000, 10000000]) {
  const arr = [];
  const t0 = performance.now();
  for (let i = 0; i < n; i++) arr.push(i);
  const ms = performance.now() - t0;
  console.log("n=" + String(n).padStart(8) + ": " + ((ms * 1e6) / n).toFixed(1) + " ns per push");
}
~~~

Output of \`node main.js\`:

~~~text
n=  100000: 55.0 ns per push
n= 1000000: 25.6 ns per push
n=10000000: 31.0 ns per push
~~~

These are wall-clock numbers from one Node.js 22 run; they change from run to run and machine to machine, so read only the trend. The cost per push did **not** grow with n: ten times more elements did not make each push ten times slower. That is what amortized O(1) looks like from the outside. The first, smallest run was slower per push because the engine had not yet optimised the loop (JIT warm-up), not because of the array.

Because the spec does not promise this, treat "\`push\` is amortized O(1)" as the standard engine behaviour that interviewers expect, not as a language guarantee. If you know the final size, filling a pre-sized array (\`new Array(n)\` or \`Array.from({ length: n })\`) avoids repeated growth.

## 6. A Second Classic: a Queue Made of Two Stacks

A queue (first in, first out) can be built from two stacks: push new items onto \`inbox\`; to dequeue, pop from \`outbox\`, and when \`outbox\` is empty, first pour everything from \`inbox\` into it (which reverses the order, putting the oldest item on top). The full question has its own page: [implement a queue using two stacks](/interview-question/how-do-you-implement-a-queue-using-two-stacks).

~~~javascript
class TwoStackQueue {
  constructor() {
    this.inbox = [];
    this.outbox = [];
    this.moves = 0;                       // elements moved from inbox to outbox
  }
  enqueue(x) {                            // always O(1)
    this.inbox.push(x);
  }
  dequeue() {
    // Return [value, elements moved by this call].
    let moved = 0;
    if (this.outbox.length === 0) {       // refill only when outbox is empty
      while (this.inbox.length > 0) {
        this.outbox.push(this.inbox.pop());
        moved++;
      }
    }
    this.moves += moved;
    return [this.outbox.pop(), moved];
  }
}
~~~

One dequeue can be terrible: after 1,000 enqueues, the first dequeue moves all 1,000 elements. But **each element is moved at most once** in its life (inbox → outbox), so over any sequence the moves can never exceed the number of enqueues. Every operation is O(1) amortized. In JavaScript both stacks are plain arrays (\`push\` and \`pop\` at the end). This is also a practical answer to "\`shift()\` is slow on a big array": two stacks, or an array plus a head index, give an O(1) amortized dequeue.

## 7. A Trap: Shrinking Too Eagerly

If a dynamic array also shrinks when elements are removed, the shrink rule must leave a gap. Shrink to half capacity as soon as the array is half empty, and a push/pop pair at the boundary resizes *every* time: the push grows (copy n), the pop shrinks (copy n), and so on.

~~~javascript
function copiesFor(shrinkAt, start, rounds) {
  // Fill to \`start\` items (a full array), then alternate push/pop \`rounds\` times.
  // Grow x2 when full; shrink to half when size <= capacity * shrinkAt.
  let capacity = start, size = start, copies = 0;
  for (let r = 0; r < rounds; r++) {
    if (size === capacity) {           // push into a full array: grow
      copies += size;
      capacity *= 2;
    }
    size += 1;
    size -= 1;                         // pop
    if (capacity > 1 && size <= capacity * shrinkAt) {
      copies += size;                  // shrink: copy survivors into a smaller array
      capacity = Math.floor(capacity / 2);
    }
  }
  return copies;
}
~~~

The fix is to shrink only when the array is a **quarter** full. After any resize the array is half full, so at least a quarter-capacity's worth of operations must happen before the next resize, which pays for it.

📌 **Interview term: Thrashing** — repeatedly growing and shrinking (or loading and evicting) because the thresholds are too close together, so every operation pays the expensive path.

## 8. Verified: Running the Code

All three programs are the runnable examples under "JavaScript code" on this page, run with \`node main.js\`.

**Example 1 — cost of each push, doubling vs +16:**

~~~text
doubling: cost of each push (1 write + copies)
  push 1: cost 1
  push 2: cost 2 (grow 1 -> 2)
  push 3: cost 3 (grow 2 -> 4)
  push 4: cost 1
  push 5: cost 5 (grow 4 -> 8)
  push 6: cost 1
  push 7: cost 1
  push 8: cost 1
  push 9: cost 9 (grow 8 -> 16)
  push 10: cost 1
  push 11: cost 1
  push 12: cost 1
  push 13: cost 1
  push 14: cost 1
  push 15: cost 1
  push 16: cost 1
  push 17: cost 17 (grow 16 -> 32)
doubling, n=1000: copies 1023, total cost 2023, average 2.02 per push
doubling, n=1000000: copies 1048575, total cost 2048575, average 2.05 per push
grow by +16, n=1000: copies 31311, total cost 32311, average 32.31 per push
grow by +16, n=10000: copies 3120625, total cost 3130625, average 313.06 per push
~~~

The per-push costs spike at pushes 2, 3, 5, 9 and 17 (the resizes) and are 1 otherwise. With doubling the average stayed at 2.02 and 2.05 per push from 1,000 to 1,000,000 pushes; with +16 it went from 32.31 to 313.06 when n grew tenfold — the signature of O(n) per push.

**Example 2 — the two-stack queue:**

~~~text
enqueue 1..1000, then dequeue all
  first five out: [1, 2, 3, 4, 5]
  most expensive single dequeue moved 1000 elements
  total moves 1000 over 2000 operations = 0.50 per operation
interleaved: 100000 enqueues and 50000 dequeues
  most expensive single dequeue moved 32768 elements
  total moves 65534 over 150000 operations = 0.44 per operation
~~~

The queue is still first-in, first-out (1, 2, 3, 4, 5). One dequeue moved 1,000 elements, yet the total was 1,000 moves for 2,000 operations. In the interleaved run the worst dequeue moved 32,768 elements, and the average was still below 1 move per operation.

**Example 3 — shrink policies:**

~~~text
shrink when half empty   -> 2048000 copies for 1000 push/pop pairs
shrink when 3/4 empty    -> 1024 copies for 1000 push/pop pairs
~~~

Shrinking at half full did 2,048 copies per push/pop pair (one grow and one shrink of 1,024 elements, every round). Shrinking at a quarter did one grow and then nothing.

## 9. Complexity Summary

| Operation | Worst single call | Amortized | Why |
| :--- | :--- | :--- | :--- |
| Dynamic array push, doubling | O(n) | **O(1)** | copies sum to < 2n |
| Dynamic array push, +16 growth | O(n) | O(n) | copies sum to about n² / 32 |
| Dynamic array pop with ¼ shrink rule | O(n) | **O(1)** | a gap between grow and shrink thresholds |
| Dynamic array pop with ½ shrink rule | O(n) | O(n) | thrashes at the boundary |
| Two-stack queue enqueue | O(1) | O(1) | one push |
| Two-stack queue dequeue | O(n) | **O(1)** | each element moved once |
| Space for all of the above | — | O(n) | at most a constant factor of slack |

Other places amortized analysis shows up: hash tables that rehash into a bigger table ([how a hash table works](/interview-question/how-does-a-hash-table-work)), the [monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it) where each element is pushed and popped once, the [sliding window](/interview-question/what-is-the-sliding-window-technique) where each pointer only moves forward, and union-find with path compression.

## 10. Edge Cases and Subtleties

- **Amortized bounds assume you start from the beginning.** "n operations cost O(n)" is about a sequence starting from an empty (or freshly built) structure; a single operation picked at random can still be the expensive one.
- **Latency vs throughput.** Amortized O(1) is about total work. If one slow operation is unacceptable (a request with a deadline), pre-allocate or use a structure with a worst-case O(1) bound.
- **Two different "O(1)s".** Hash-map lookups are *average-case* O(1) (they depend on the hash); dynamic-array appends are *amortized* O(1) (they do not). A hash table's insert is both: average-case per operation, amortized over resizes.
- **The starting capacity does not matter** for the Big-O; it only changes how many tiny resizes happen at the start.
- **Memory slack.** Doubling can leave up to half the capacity unused right after a resize; that is the price of O(1) appends, and still O(n) space.

## Common Pitfalls

- **Calling amortized O(1) "average case".** Amortized is a guarantee over *every* sequence of operations, with no probability involved; \`Map.get\` is average-case O(1), \`push\` is amortized O(1).
- **Assuming the spec guarantees \`push\` cost.** It does not specify storage at all; amortized O(1) is the engine behaviour everyone relies on. Say so if asked.
- **Using \`shift()\` as a queue on large arrays.** It moves the remaining elements; use two stacks or a head index for an amortized O(1) dequeue.
- **Growing by a constant amount.** Adding 16 slots per resize gave 313 copies per push at n = 10,000 in the run above, and the number keeps rising with n: O(n) per push.
- **Shrinking at half full.** Alternating push/pop at the boundary copied 2,048,000 elements for 1,000 pairs; shrink at a quarter instead.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">Amortized analysis bounds the total cost of any sequence of n operations and divides by n, so an occasionally expensive operation can still be O(1) amortized.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The classic example:</strong> <span style="color:#f0e2c8;">Dynamic-array append: a resize copies everything, but with doubling the copies are 1 + 2 + 4 + ... &lt; 2n, so n appends cost under 3n. I measured 2.05 per push at a million pushes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The methods:</strong> <span style="color:#f0e2c8;">Aggregate: sum the total. Banker: charge each push 3 credits and save 2 for later copies. Potential: a function of the state that pays for the expensive steps.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. JavaScript specifics:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> is amortized O(1) in practice, though the spec does not say how arrays grow; my timing showed constant cost per push from 1 to 10 million elements. A two-stack queue fixes slow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shift</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The difference:</strong> <span style="color:#f0e2c8;">Amortized is a worst-case guarantee over a sequence, not an average over random inputs; a single operation can still be O(n).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does growing by a constant (say +16) break it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then a resize happens every 16 pushes and copies the current size, so the copies add up to about n^2 / 32: O(n) per push. I measured 313 copies per push at n = 10,000, rising with n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make an O(1) amortized queue in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two arrays: push to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inbox</code>; when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code> is empty, pop everything from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inbox</code> into it, then pop from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">outbox</code>. Each element moves once, so dequeue is amortized O(1).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the two-stack queue prove?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each element is pushed once, moved once and popped once, so n operations do at most about 3n steps even though one dequeue can move every element.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is amortized not good enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When every single operation must be fast, like an animation frame. Then you pre-allocate (for example a typed array of fixed size) or use a structure with a worst-case bound.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why shrink at a quarter, not a half?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At half, alternating push and pop at the boundary resizes every time: O(n) each. Shrinking at a quarter leaves a gap, so after a resize Omega(n) operations must happen before the next.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Amortized cost** | Total cost of a worst-case sequence divided by its length |
| **Amortized vs average case** | Guarantee over every sequence vs expectation over random inputs |
| **Dynamic array** | Array that grows by allocating a bigger block and copying |
| **Aggregate method** | Sum the total cost of n operations, divide by n |
| **Accounting (banker's) method** | Overcharge cheap operations, spend the credit on expensive ones |
| **Potential method** | Amortized cost = actual cost + change in a state function Φ |
| **Geometric growth** | Grow capacity by a constant factor, not a constant amount |
| **Thrashing** | Resizing back and forth because thresholds are too close |
| **JIT warm-up** | The engine optimising hot code after it has run a while; skews early timings |

**Conclusion:** Amortized analysis answers "what does each operation cost over a whole sequence?" rather than "what is the worst single operation?". For a dynamic array that doubles, the resizes copy fewer than 2n elements in total, so append is O(1) amortized even though one append can be O(n) — measured here at 2.05 copies-plus-writes per push over a million pushes, against 313 per push for a constant +16 growth rule. The same reasoning makes a two-stack queue O(1) per operation and explains why shrinking must wait until a quarter full. In JavaScript, the built-in structures already follow these rules, so the interview skill is to explain *why* they are O(1), name the method you are using, and point out when a single slow operation would still matter.`,
        examples: [
          {
            label: "Dynamic array: cost of every push, doubling vs growing by a constant",
            code: `// A dynamic array built by hand, counting every element copy.

class DynamicArray {
  constructor(grow) {
    this.grow = grow;            // function: old capacity -> new capacity
    this.capacity = 1;
    this.size = 0;
    this.slots = new Array(1);
    this.copies = 0;             // elements moved during resizes
  }

  push(value) {
    // Append; return the cost of this push (1 write + any copies).
    let cost = 1;
    if (this.size === this.capacity) {           // full: allocate and copy
      const newCap = this.grow(this.capacity);
      const newSlots = new Array(newCap);
      for (let i = 0; i < this.size; i++) newSlots[i] = this.slots[i];
      this.copies += this.size;
      cost += this.size;
      this.slots = newSlots;
      this.capacity = newCap;
    }
    this.slots[this.size] = value;
    this.size++;
    return cost;
  }
}

const double = (c) => c * 2;
const plus16 = (c) => c + 16;

console.log("doubling: cost of each push (1 write + copies)");
let arr = new DynamicArray(double);
for (let v = 1; v <= 17; v++) {
  const before = arr.capacity;
  const cost = arr.push(v);
  const note = arr.capacity !== before ? " (grow " + before + " -> " + arr.capacity + ")" : "";
  console.log("  push " + v + ": cost " + cost + note);
}

const runs = [["doubling", double, [1000, 1000000]], ["grow by +16", plus16, [1000, 10000]]];
for (const [name, grow, sizes] of runs) {
  for (const n of sizes) {
    arr = new DynamicArray(grow);
    let total = 0;
    for (let v = 0; v < n; v++) total += arr.push(v);
    const avg = total / n;
    console.log(name + ", n=" + n + ": copies " + arr.copies + ", total cost " + total +
      ", average " + avg.toFixed(2) + " per push");
  }
}`,
          },
          {
            label: "Queue from two stacks: one slow dequeue, O(1) amortized",
            code: `// A queue built from two stacks: one dequeue can be slow, the average is O(1).

function fmt(items) {
  return "[" + items.join(", ") + "]";
}

class TwoStackQueue {
  constructor() {
    this.inbox = [];
    this.outbox = [];
    this.moves = 0;                       // elements moved from inbox to outbox
  }
  enqueue(x) {                            // always O(1)
    this.inbox.push(x);
  }
  dequeue() {
    // Return [value, elements moved by this call].
    let moved = 0;
    if (this.outbox.length === 0) {       // refill only when outbox is empty
      while (this.inbox.length > 0) {
        this.outbox.push(this.inbox.pop());
        moved++;
      }
    }
    this.moves += moved;
    return [this.outbox.pop(), moved];
  }
}

let q = new TwoStackQueue();
for (let x = 1; x <= 1000; x++) q.enqueue(x);
const firstFive = [];
let worst = 0;
for (let i = 0; i < 1000; i++) {
  const [value, moved] = q.dequeue();
  worst = Math.max(worst, moved);
  if (firstFive.length < 5) firstFive.push(value);
}
console.log("enqueue 1..1000, then dequeue all");
console.log("  first five out: " + fmt(firstFive));
console.log("  most expensive single dequeue moved " + worst + " elements");
console.log("  total moves " + q.moves + " over 2000 operations = " + (q.moves / 2000).toFixed(2) + " per operation");

q = new TwoStackQueue();
let ops = 0;
worst = 0;
for (let x = 1; x <= 100000; x++) {       // interleave: 2 enqueues, then 1 dequeue
  q.enqueue(x);
  ops++;
  if (x % 2 === 0) {
    const moved = q.dequeue()[1];
    worst = Math.max(worst, moved);
    ops++;
  }
}
console.log("interleaved: 100000 enqueues and 50000 dequeues");
console.log("  most expensive single dequeue moved " + worst + " elements");
console.log("  total moves " + q.moves + " over " + ops + " operations = " + (q.moves / ops).toFixed(2) + " per operation");`,
          },
          {
            label: "Why shrinking at half full breaks the bound",
            code: `// Shrinking too eagerly breaks the amortized bound. Count the copies.

function copiesFor(shrinkAt, start, rounds) {
  // Fill to \`start\` items (a full array), then alternate push/pop \`rounds\` times.
  // Grow x2 when full; shrink to half when size <= capacity * shrinkAt.
  let capacity = start, size = start, copies = 0;
  for (let r = 0; r < rounds; r++) {
    if (size === capacity) {           // push into a full array: grow
      copies += size;
      capacity *= 2;
    }
    size += 1;
    size -= 1;                         // pop
    if (capacity > 1 && size <= capacity * shrinkAt) {
      copies += size;                  // shrink: copy survivors into a smaller array
      capacity = Math.floor(capacity / 2);
    }
  }
  return copies;
}

for (const [label, shrinkAt] of [["shrink when half empty   ", 0.5], ["shrink when 3/4 empty    ", 0.25]]) {
  const c = copiesFor(shrinkAt, 1024, 1000);
  console.log(label + "-> " + c + " copies for 1000 push/pop pairs");
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Appending to a dynamic array sometimes has to copy every element into a bigger block, which is O(n). Yet everyone says append is O(1). Explain how both can be true, what amortized analysis is, and show it for the Java structures you would use."

**What a strong answer should cover:**
- Amortized cost = total cost of a worst-case sequence of n operations, divided by n; it is a guarantee, not an average over random inputs.
- The doubling argument: copies 1 + 2 + 4 + … < 2n, so n appends cost under 3n — O(1) amortized, while a single append is still O(n) in the worst case.
- Why the growth must be geometric: growing by a constant amount gives O(n²) total; shrinking must leave a gap (shrink at ¼ full, not ½) or it thrashes.
- The three methods by name (aggregate, accounting/banker, potential) and another example such as a queue built from two stacks.
- Java specifics: the \`ArrayList\` JavaDoc promises amortized constant-time \`add\`; OpenJDK grows by about 1.5x, \`new ArrayList<>(n)\` pre-sizes, and \`ArrayDeque\` beats \`remove(0)\` for queues.

**Clarifying questions expected:**
- "Do we care about the worst case of a single operation (latency), or only total throughput?"
- "Do we know the final size in advance, so we could pre-allocate?"

**Code / implementation expected:** Optional — a Java dynamic array or a two-stack queue (\`ArrayDeque\`) that counts copies, with the amortized argument stated.`,
        answer: `**Target Audience:** Interview candidates who know [Big-O notation](/interview-question/what-is-big-o-notation) and want to understand why "occasionally slow" operations can still be O(1).
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every count on this page comes from running the Java code shown, and the **Verified** section quotes that output; library behaviour is either measured or cited.

## 1. Why This Even Matters — A Story First

You collect books. They live on a bookshelf, and when the shelf is full you buy one twice as big and carry every book across. Moving day is miserable: the day you go from 512 to 1,024 slots, you carry 512 books.

But look at the whole year. You moved 1 book, then 2, then 4, then 8 … then 512. Add them up: 1,023 moves for 1,024 books, **less than one move per book**. Most days you simply put a new book on the shelf. The rare terrible day is paid for by the hundreds of easy days before it.

That is amortized analysis: instead of asking "how bad can one operation be?", you ask "how bad can a long **sequence** of operations be, per operation?" For the bookshelf the answer is "a small constant", even though one day was huge. The same reasoning explains why appending to a dynamic array is called O(1), why a queue made of two stacks is fast, and why a badly chosen growth rule can quietly make code quadratic.

## 2. The Idea in Plain Language

📌 **Interview term: Amortized cost** — the total cost of a worst-case sequence of n operations, divided by n. "Append is O(1) amortized" means: any n appends, starting from empty, cost O(n) in total.

📌 **Interview term: Amortized vs average case** — average case averages over *random inputs* and can be unlucky; amortized averages over a *sequence* and is a guarantee for every sequence. No probability is involved.

📌 **Interview term: Dynamic array** — an array that, when full, allocates a bigger block and copies its elements over (see [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list)).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Cost of pushes 1 to 17 with doubling, spikes at 2, 3, 5, 9 and 17">
  <text class="d-text" x="380" y="26" text-anchor="middle">Cost of each push with doubling (measured)</text>
  <path class="d-edge" d="M 60 250 L 720 250"/>
  <rect class="d-box-muted" x="70" y="240" width="26" height="10"/>
  <rect class="d-box-accent" x="108" y="230" width="26" height="20"/>
  <rect class="d-box-accent" x="146" y="220" width="26" height="30"/>
  <rect class="d-box-muted" x="184" y="240" width="26" height="10"/>
  <rect class="d-box-accent" x="222" y="200" width="26" height="50"/>
  <rect class="d-box-muted" x="260" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="298" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="336" y="240" width="26" height="10"/>
  <rect class="d-box-accent" x="374" y="160" width="26" height="90"/>
  <rect class="d-box-muted" x="412" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="450" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="488" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="526" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="564" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="602" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="640" y="240" width="26" height="10"/>
  <rect class="d-box-accent" x="678" y="80" width="26" height="170"/>
  <path class="d-edge-dashed" d="M 60 220 L 720 220"/>
  <text class="d-sub" x="83" y="274" text-anchor="middle">1</text>
  <text class="d-sub" x="235" y="274" text-anchor="middle">5</text>
  <text class="d-sub" x="387" y="274" text-anchor="middle">9</text>
  <text class="d-sub" x="539" y="274" text-anchor="middle">13</text>
  <text class="d-sub" x="691" y="274" text-anchor="middle">17</text>
  <text class="d-sub d-accent" x="387" y="148" text-anchor="middle">cost 9</text>
  <text class="d-sub d-accent" x="640" y="72" text-anchor="middle">cost 17</text>
  <text class="d-sub" x="80" y="120">dashed line: 3 per push</text>
</svg>

The spikes (accent bars) are the resizes: costs 2, 3, 5, 9, 17 at pushes 2, 3, 5, 9 and 17. Every other push costs 1. The spikes get taller, but they also get twice as far apart, so the running average never exceeds 3 per push — the dashed line.

## 3. Proving It: Three Methods

### Aggregate method

📌 **Interview term: Aggregate method** — add up the total cost of n operations directly and divide by n.

With doubling from capacity 1, resizes happen when the size reaches 1, 2, 4, …, up to the largest power of two below n, and each copies that many elements:

> copies = 1 + 2 + 4 + … + 2ᵏ = 2ᵏ⁺¹ − 1 < 2n

Each push also does 1 write, so the total is less than n + 2n = **3n**, and the amortized cost per push is **O(1)**. The run below measured 1,023 copies for 1,000 pushes and 1,048,575 for a million — both under 2n.

### Accounting (banker's) method

📌 **Interview term: Accounting (banker's) method** — charge every operation a fixed "price"; cheap operations overpay and store the extra as credit, and expensive ones spend the saved credit. If the credit never goes negative, the price is a valid amortized cost.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 220" role="img" aria-label="Each push pays 3 coins: one for the write and two saved for a future copy">
  <defs>
    <marker id="b01q4-arrow-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="380" y="26" text-anchor="middle">Banker view: every push pays 3 coins</text>
  <rect class="d-box-accent" x="40" y="70" width="180" height="90" rx="10"/>
  <text class="d-text d-accent" x="130" y="104" text-anchor="middle">push pays 3</text>
  <text class="d-sub" x="130" y="134" text-anchor="middle">a fixed price</text>
  <path class="d-edge" d="M 226 115 L 290 115" marker-end="url(#b01q4-arrow-a)"/>
  <rect class="d-box-muted" x="296" y="56" width="180" height="56" rx="10"/>
  <text class="d-text" x="386" y="90" text-anchor="middle">1 coin: the write</text>
  <rect class="d-box-muted" x="296" y="124" width="180" height="56" rx="10"/>
  <text class="d-text" x="386" y="158" text-anchor="middle">2 coins: saved</text>
  <path class="d-edge-dashed" d="M 482 152 L 546 152" marker-end="url(#b01q4-arrow-a)"/>
  <rect class="d-box-muted" x="552" y="110" width="180" height="84" rx="10"/>
  <text class="d-text" x="642" y="144" text-anchor="middle">later resize</text>
  <text class="d-sub" x="642" y="172" text-anchor="middle">spends saved coins</text>
</svg>

Why 2 saved coins are enough: right after a resize to capacity 2m, the array holds m elements and no credit. The next m pushes each save 2 coins, 2m in total, which is exactly what the next resize needs to copy 2m elements. Credit never goes negative, so 3 per push is a valid amortized cost.

### Potential method

📌 **Interview term: Potential method** — define a "potential" Φ, a number computed from the data structure's state (like stored energy). Amortized cost = actual cost + change in Φ. If Φ starts at 0 and never goes negative, the amortized costs add up to at least the actual total.

For the dynamic array, Φ = 2 · size − capacity works: a normal push raises Φ by 2 (actual 1, amortized 3), and a push that resizes from capacity m drops Φ from m to 2, cancelling the m copies (actual m + 1, amortized 3 again). Φ is 0 or more once the array has been filled the first time, which is all the proof needs. It is the banker's argument written as a formula, and it is the method used for harder cases such as [union-find](/interview-question/what-is-the-union-find-disjoint-set-data-structure) with path compression.

## 4. The Code: a Dynamic Array That Counts Its Copies

~~~java
static class DynamicArray {
    final IntUnaryOperator grow;   // old capacity -> new capacity
    int capacity = 1, size = 0;
    int[] slots = new int[1];
    long copies = 0;               // elements moved during resizes

    DynamicArray(IntUnaryOperator grow) { this.grow = grow; }

    /** Append; return the cost of this push (1 write + any copies). */
    long push(int value) {
        long cost = 1;
        if (size == capacity) {                    // full: allocate and copy
            int newCap = grow.applyAsInt(capacity);
            int[] newSlots = new int[newCap];
            for (int i = 0; i < size; i++) newSlots[i] = slots[i];
            copies += size;
            cost += size;
            slots = newSlots;
            capacity = newCap;
        }
        slots[size++] = value;
        return cost;
    }
}
~~~

Java detail: the hand-written class uses a raw \`int[]\` and an explicit copy loop so every copy is counted; a real \`ArrayList\` copies with \`Arrays.copyOf\` (a fast native copy) and stores boxed \`Integer\` references, but the number of elements copied follows the same arithmetic. \`copies\` and \`total\` are \`long\` so the counts cannot overflow \`int\` for big n.

### Why the growth rule must be multiplicative

The same class takes the growth rule as a function. With **doubling**, the average cost settled at about 2 per push no matter how large n got. With **"add 16 slots"**, a resize happens every 16 pushes and copies everything stored so far: the copies are 16 + 32 + 48 + … ≈ n² / 32, so the average cost *grows with n* (32.31 per push at n = 1,000 and 313.06 at n = 10,000 in the run below). Constant-size growth is O(n) per push, O(n²) in total.

📌 **Interview term: Geometric growth** — growing capacity by a constant **factor** (×1.5, ×2) rather than a constant amount. Any factor greater than 1 keeps the copies a geometric series and append amortized O(1).

## 5. How ArrayList Really Grows

\`ArrayList\` stores its elements in a private \`Object[] elementData\`. This snippet reads that array's length with reflection to watch the capacity change (it must be run with \`--add-opens\`, because the module system blocks this access by default — do not do this in real code):

~~~java
import java.lang.reflect.Field;
import java.util.ArrayList;

public class Main {
    // Reads ArrayList's private backing array. Needs:
    //   java --add-opens java.base/java.util=ALL-UNNAMED Main
    static int capacity(ArrayList<?> list) throws Exception {
        Field f = ArrayList.class.getDeclaredField("elementData");
        f.setAccessible(true);
        return ((Object[]) f.get(list)).length;
    }

    public static void main(String[] args) throws Exception {
        ArrayList<Integer> list = new ArrayList<>();
        System.out.println("new ArrayList<>(): capacity " + capacity(list));
        int last = capacity(list);
        for (int i = 0; i < 200; i++) {
            list.add(i);
            int cap = capacity(list);
            if (cap != last) {
                System.out.println("size " + list.size() + ": capacity " + last + " -> " + cap);
                last = cap;
            }
        }
        ArrayList<Integer> sized = new ArrayList<>(1000);   // pre-sized: no resize for 1000 adds
        System.out.println("new ArrayList<>(1000): capacity " + capacity(sized));
    }
}
~~~

Output of \`javac Main.java && java --add-opens java.base/java.util=ALL-UNNAMED Main\`:

~~~text
new ArrayList<>(): capacity 0
size 1: capacity 0 -> 10
size 11: capacity 10 -> 15
size 16: capacity 15 -> 22
size 23: capacity 22 -> 33
size 34: capacity 33 -> 49
size 50: capacity 49 -> 73
size 74: capacity 73 -> 109
size 110: capacity 109 -> 163
size 164: capacity 163 -> 244
new ArrayList<>(1000): capacity 1000
~~~

On this OpenJDK 21 run, a new \`ArrayList\` started with **capacity 0**, allocated 10 on the first \`add\`, and then grew by about 1.5× each time: 10 → 15 → 22 → 33 → 49 → … (\`newCapacity ≈ oldCapacity + oldCapacity / 2\`). A factor of 1.5 is still geometric, so the copies add up to O(n). The JavaDoc states the contract without fixing the factor: "The add operation runs in amortized constant time, that is, adding n elements requires O(n) time."

\`new ArrayList<>(1000)\` allocated 1,000 slots up front, so the next 1,000 adds never resize; \`ensureCapacity(n)\` does the same for an existing list.

## 6. A Second Classic: a Queue Made of Two Stacks

A queue (first in, first out) can be built from two stacks: push new items onto \`inbox\`; to dequeue, pop from \`outbox\`, and when \`outbox\` is empty, first pour everything from \`inbox\` into it (which reverses the order, putting the oldest item on top). The full question has its own page: [implement a queue using two stacks](/interview-question/how-do-you-implement-a-queue-using-two-stacks).

~~~java
static class TwoStackQueue {
    final Deque<Integer> inbox = new ArrayDeque<>();
    final Deque<Integer> outbox = new ArrayDeque<>();
    long moves = 0;                      // elements moved from inbox to outbox
    int lastMoved = 0;                   // elements moved by the latest dequeue

    void enqueue(int x) {                // always O(1)
        inbox.push(x);
    }

    int dequeue() {
        int moved = 0;
        if (outbox.isEmpty()) {          // refill only when outbox is empty
            while (!inbox.isEmpty()) {
                outbox.push(inbox.pop());
                moved++;
            }
        }
        moves += moved;
        lastMoved = moved;
        return outbox.pop();
    }
}
~~~

One dequeue can be terrible: after 1,000 enqueues, the first dequeue moves all 1,000 elements. But **each element is moved at most once** in its life (inbox → outbox), so over any sequence the moves can never exceed the number of enqueues. Every operation is O(1) amortized. In Java the two stacks are \`ArrayDeque<Integer>\`s used with \`push\`/\`pop\` (the JavaDoc recommends \`ArrayDeque\` over the legacy \`Stack\` class). For production, \`ArrayDeque\` is itself already an O(1) amortized queue with \`offer\`/\`poll\`.

## 7. A Trap: Shrinking Too Eagerly

If a dynamic array also shrinks when elements are removed, the shrink rule must leave a gap. Shrink to half capacity as soon as the array is half empty, and a push/pop pair at the boundary resizes *every* time: the push grows (copy n), the pop shrinks (copy n), and so on.

~~~java
static long copiesFor(double shrinkAt, int start, int rounds) {
    // Fill to start items (a full array), then alternate push/pop rounds times.
    // Grow x2 when full; shrink to half when size <= capacity * shrinkAt.
    long capacity = start, size = start, copies = 0;
    for (int r = 0; r < rounds; r++) {
        if (size == capacity) {            // push into a full array: grow
            copies += size;
            capacity *= 2;
        }
        size += 1;
        size -= 1;                         // pop
        if (capacity > 1 && size <= capacity * shrinkAt) {
            copies += size;                // shrink: copy survivors into a smaller array
            capacity /= 2;
        }
    }
    return copies;
}
~~~

The fix is to shrink only when the array is a **quarter** full. After any resize the array is half full, so at least a quarter-capacity's worth of operations must happen before the next resize, which pays for it.

📌 **Interview term: Thrashing** — repeatedly growing and shrinking (or loading and evicting) because the thresholds are too close together, so every operation pays the expensive path.

## 8. Verified: Running the Code

All three programs are the runnable examples under "Java code" on this page, run with \`javac Main.java && java Main\`.

**Example 1 — cost of each push, doubling vs +16:**

~~~text
doubling: cost of each push (1 write + copies)
  push 1: cost 1
  push 2: cost 2 (grow 1 -> 2)
  push 3: cost 3 (grow 2 -> 4)
  push 4: cost 1
  push 5: cost 5 (grow 4 -> 8)
  push 6: cost 1
  push 7: cost 1
  push 8: cost 1
  push 9: cost 9 (grow 8 -> 16)
  push 10: cost 1
  push 11: cost 1
  push 12: cost 1
  push 13: cost 1
  push 14: cost 1
  push 15: cost 1
  push 16: cost 1
  push 17: cost 17 (grow 16 -> 32)
doubling, n=1000: copies 1023, total cost 2023, average 2.02 per push
doubling, n=1000000: copies 1048575, total cost 2048575, average 2.05 per push
grow by +16, n=1000: copies 31311, total cost 32311, average 32.31 per push
grow by +16, n=10000: copies 3120625, total cost 3130625, average 313.06 per push
~~~

The per-push costs spike at pushes 2, 3, 5, 9 and 17 (the resizes) and are 1 otherwise. With doubling the average stayed at 2.02 and 2.05 per push from 1,000 to 1,000,000 pushes; with +16 it went from 32.31 to 313.06 when n grew tenfold — the signature of O(n) per push.

**Example 2 — the two-stack queue:**

~~~text
enqueue 1..1000, then dequeue all
  first five out: [1, 2, 3, 4, 5]
  most expensive single dequeue moved 1000 elements
  total moves 1000 over 2000 operations = 0.50 per operation
interleaved: 100000 enqueues and 50000 dequeues
  most expensive single dequeue moved 32768 elements
  total moves 65534 over 150000 operations = 0.44 per operation
~~~

The queue is still first-in, first-out (1, 2, 3, 4, 5). One dequeue moved 1,000 elements, yet the total was 1,000 moves for 2,000 operations. In the interleaved run the worst dequeue moved 32,768 elements, and the average was still below 1 move per operation.

**Example 3 — shrink policies:**

~~~text
shrink when half empty   -> 2048000 copies for 1000 push/pop pairs
shrink when 3/4 empty    -> 1024 copies for 1000 push/pop pairs
~~~

Shrinking at half full did 2,048 copies per push/pop pair (one grow and one shrink of 1,024 elements, every round). Shrinking at a quarter did one grow and then nothing.

## 9. Complexity Summary

| Operation | Worst single call | Amortized | Why |
| :--- | :--- | :--- | :--- |
| Dynamic array push, doubling | O(n) | **O(1)** | copies sum to < 2n |
| Dynamic array push, +16 growth | O(n) | O(n) | copies sum to about n² / 32 |
| Dynamic array pop with ¼ shrink rule | O(n) | **O(1)** | a gap between grow and shrink thresholds |
| Dynamic array pop with ½ shrink rule | O(n) | O(n) | thrashes at the boundary |
| Two-stack queue enqueue | O(1) | O(1) | one push |
| Two-stack queue dequeue | O(n) | **O(1)** | each element moved once |
| Space for all of the above | — | O(n) | at most a constant factor of slack |

Other places amortized analysis shows up: hash tables that rehash into a bigger table ([how a hash table works](/interview-question/how-does-a-hash-table-work)), the [monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it) where each element is pushed and popped once, the [sliding window](/interview-question/what-is-the-sliding-window-technique) where each pointer only moves forward, and union-find with path compression.

## 10. Edge Cases and Subtleties

- **Amortized bounds assume you start from the beginning.** "n operations cost O(n)" is about a sequence starting from an empty (or freshly built) structure; a single operation picked at random can still be the expensive one.
- **Latency vs throughput.** Amortized O(1) is about total work. If one slow operation is unacceptable (a request with a deadline), pre-allocate or use a structure with a worst-case O(1) bound.
- **Two different "O(1)s".** Hash-map lookups are *average-case* O(1) (they depend on the hash); dynamic-array appends are *amortized* O(1) (they do not). A hash table's insert is both: average-case per operation, amortized over resizes.
- **The starting capacity does not matter** for the Big-O; it only changes how many tiny resizes happen at the start.
- **Memory slack.** Doubling can leave up to half the capacity unused right after a resize; that is the price of O(1) appends, and still O(n) space.

## Common Pitfalls

- **Calling amortized O(1) "average case".** Amortized is a guarantee over *every* sequence of operations, with no probability involved; \`HashMap.get\` is average-case O(1), \`ArrayList.add\` is amortized O(1).
- **Ignoring the resize spike.** One \`add\` that resizes copies the whole backing array; pre-size with \`new ArrayList<>(n)\` or \`ensureCapacity\` when you know n.
- **Using \`ArrayList.remove(0)\` as a queue.** It shifts every element on every call: O(n), not amortized O(1). Use \`ArrayDeque\`.
- **Growing by a constant amount.** Adding 16 slots per resize gave 313 copies per push at n = 10,000 in the run above, rising with n: O(n) per push.
- **Shrinking at half full.** Alternating push/pop at the boundary copied 2,048,000 elements for 1,000 pairs; shrink at a quarter (\`ArrayList\` never shrinks by itself; \`trimToSize()\` is manual).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">Amortized analysis bounds the total cost of any sequence of n operations and divides by n, so an occasionally expensive operation can still be O(1) amortized.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The classic example:</strong> <span style="color:#f0e2c8;">Dynamic-array append: a resize copies everything, but with doubling the copies are 1 + 2 + 4 + ... &lt; 2n, so n appends cost under 3n. I measured 2.05 per push at a million pushes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The methods:</strong> <span style="color:#f0e2c8;">Aggregate: sum the total. Banker: charge each push 3 credits and save 2 for later copies. Potential: a function of the state that pays for the expensive steps.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Java specifics:</strong> <span style="color:#f0e2c8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList</code> JavaDoc promises amortized constant <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add</code>; OpenJDK 21 grows about 1.5x (10, 15, 22, 33 in my run), which is still geometric. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new ArrayList&lt;&gt;(n)</code> avoids resizes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The difference:</strong> <span style="color:#f0e2c8;">Amortized is a worst-case guarantee over a sequence, not an average over random inputs; a single operation can still be O(n).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does growing by a constant (say +16) break it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then a resize happens every 16 adds and copies the current size, so the copies add up to about n^2 / 32: O(n) per add. I measured 313 copies per push at n = 10,000, rising with n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a 1.5x growth factor still give amortized O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Any constant factor greater than 1 makes the copy sizes a geometric series, whose sum is a constant times n. A smaller factor wastes less memory but resizes more often.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the two-stack queue prove?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each element is pushed once, moved once and popped once, so n operations do at most about 3n steps even though one dequeue can move every element.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap.put</code> amortized O(1)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Its resizing is amortized like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayList</code>: the table doubles when the load factor is exceeded and all entries are rehashed. The per-operation O(1) is additionally an average that depends on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hashCode</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is amortized not good enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When every operation must be fast, like low-latency trading code. Then you pre-size collections at startup so no resize happens on the hot path.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Amortized cost** | Total cost of a worst-case sequence divided by its length |
| **Amortized vs average case** | Guarantee over every sequence vs expectation over random inputs |
| **Dynamic array** | Array that grows by allocating a bigger block and copying |
| **Aggregate method** | Sum the total cost of n operations, divide by n |
| **Accounting (banker's) method** | Overcharge cheap operations, spend the credit on expensive ones |
| **Potential method** | Amortized cost = actual cost + change in a state function Φ |
| **Geometric growth** | Grow capacity by a constant factor, not a constant amount |
| **Thrashing** | Resizing back and forth because thresholds are too close |
| **\`ensureCapacity\`** | \`ArrayList\` method that pre-sizes the backing array |

**Conclusion:** Amortized analysis answers "what does each operation cost over a whole sequence?" rather than "what is the worst single operation?". For a dynamic array that doubles, the resizes copy fewer than 2n elements in total, so append is O(1) amortized even though one append can be O(n) — measured here at 2.05 copies-plus-writes per push over a million pushes, against 313 per push for a constant +16 growth rule. The same reasoning makes a two-stack queue O(1) per operation and explains why shrinking must wait until a quarter full. In Java, the built-in structures already follow these rules, so the interview skill is to explain *why* they are O(1), name the method you are using, and point out when a single slow operation would still matter.`,
        examples: [
          {
            label: "Dynamic array: cost of every push, doubling vs growing by a constant",
            code: `import java.util.Locale;
import java.util.function.IntUnaryOperator;

public class Main {
    // A dynamic array built by hand, counting every element copy.

    static class DynamicArray {
        final IntUnaryOperator grow;   // old capacity -> new capacity
        int capacity = 1, size = 0;
        int[] slots = new int[1];
        long copies = 0;               // elements moved during resizes

        DynamicArray(IntUnaryOperator grow) { this.grow = grow; }

        /** Append; return the cost of this push (1 write + any copies). */
        long push(int value) {
            long cost = 1;
            if (size == capacity) {                    // full: allocate and copy
                int newCap = grow.applyAsInt(capacity);
                int[] newSlots = new int[newCap];
                for (int i = 0; i < size; i++) newSlots[i] = slots[i];
                copies += size;
                cost += size;
                slots = newSlots;
                capacity = newCap;
            }
            slots[size++] = value;
            return cost;
        }
    }

    public static void main(String[] args) {
        IntUnaryOperator twice = c -> c * 2;
        IntUnaryOperator plus16 = c -> c + 16;

        System.out.println("doubling: cost of each push (1 write + copies)");
        DynamicArray arr = new DynamicArray(twice);
        for (int v = 1; v <= 17; v++) {
            int before = arr.capacity;
            long cost = arr.push(v);
            String note = arr.capacity != before ? " (grow " + before + " -> " + arr.capacity + ")" : "";
            System.out.println("  push " + v + ": cost " + cost + note);
        }

        String[] names = {"doubling", "grow by +16"};
        IntUnaryOperator[] grows = {twice, plus16};
        int[][] sizes = {{1000, 1000000}, {1000, 10000}};
        for (int k = 0; k < 2; k++) {
            for (int n : sizes[k]) {
                arr = new DynamicArray(grows[k]);
                long total = 0;
                for (int v = 0; v < n; v++) total += arr.push(v);
                double avg = (double) total / n;
                System.out.println(names[k] + ", n=" + n + ": copies " + arr.copies + ", total cost " + total
                    + ", average " + String.format(Locale.US, "%.2f", avg) + " per push");
            }
        }
    }
}`,
          },
          {
            label: "Queue from two stacks: one slow dequeue, O(1) amortized",
            code: `import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Locale;

public class Main {
    // A queue built from two stacks: one dequeue can be slow, the average is O(1).

    static class TwoStackQueue {
        final Deque<Integer> inbox = new ArrayDeque<>();
        final Deque<Integer> outbox = new ArrayDeque<>();
        long moves = 0;                      // elements moved from inbox to outbox
        int lastMoved = 0;                   // elements moved by the latest dequeue

        void enqueue(int x) {                // always O(1)
            inbox.push(x);
        }

        int dequeue() {
            int moved = 0;
            if (outbox.isEmpty()) {          // refill only when outbox is empty
                while (!inbox.isEmpty()) {
                    outbox.push(inbox.pop());
                    moved++;
                }
            }
            moves += moved;
            lastMoved = moved;
            return outbox.pop();
        }
    }

    static String fmt(List<Integer> items) {
        StringBuilder sb = new StringBuilder("[");
        for (int k = 0; k < items.size(); k++) sb.append(k > 0 ? ", " : "").append(items.get(k));
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        TwoStackQueue q = new TwoStackQueue();
        for (int x = 1; x <= 1000; x++) q.enqueue(x);
        List<Integer> firstFive = new ArrayList<>();
        int worst = 0;
        for (int i = 0; i < 1000; i++) {
            int value = q.dequeue();
            worst = Math.max(worst, q.lastMoved);
            if (firstFive.size() < 5) firstFive.add(value);
        }
        System.out.println("enqueue 1..1000, then dequeue all");
        System.out.println("  first five out: " + fmt(firstFive));
        System.out.println("  most expensive single dequeue moved " + worst + " elements");
        System.out.println("  total moves " + q.moves + " over 2000 operations = "
            + String.format(Locale.US, "%.2f", q.moves / 2000.0) + " per operation");

        q = new TwoStackQueue();
        int ops = 0;
        worst = 0;
        for (int x = 1; x <= 100000; x++) {  // interleave: 2 enqueues, then 1 dequeue
            q.enqueue(x);
            ops++;
            if (x % 2 == 0) {
                q.dequeue();
                worst = Math.max(worst, q.lastMoved);
                ops++;
            }
        }
        System.out.println("interleaved: 100000 enqueues and 50000 dequeues");
        System.out.println("  most expensive single dequeue moved " + worst + " elements");
        System.out.println("  total moves " + q.moves + " over " + ops + " operations = "
            + String.format(Locale.US, "%.2f", (double) q.moves / ops) + " per operation");
    }
}`,
          },
          {
            label: "Why shrinking at half full breaks the bound",
            code: `public class Main {
    // Shrinking too eagerly breaks the amortized bound. Count the copies.

    static long copiesFor(double shrinkAt, int start, int rounds) {
        // Fill to start items (a full array), then alternate push/pop rounds times.
        // Grow x2 when full; shrink to half when size <= capacity * shrinkAt.
        long capacity = start, size = start, copies = 0;
        for (int r = 0; r < rounds; r++) {
            if (size == capacity) {            // push into a full array: grow
                copies += size;
                capacity *= 2;
            }
            size += 1;
            size -= 1;                         // pop
            if (capacity > 1 && size <= capacity * shrinkAt) {
                copies += size;                // shrink: copy survivors into a smaller array
                capacity /= 2;
            }
        }
        return copies;
    }

    public static void main(String[] args) {
        String[] labels = {"shrink when half empty   ", "shrink when 3/4 empty    "};
        double[] shrinkAts = {0.5, 0.25};
        for (int k = 0; k < 2; k++) {
            long c = copiesFor(shrinkAts[k], 1024, 1000);
            System.out.println(labels[k] + "-> " + c + " copies for 1000 push/pop pairs");
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Appending to a dynamic array sometimes has to copy every element into a bigger block, which is O(n). Yet everyone says append is O(1). Explain how both can be true, what amortized analysis is, and show it for the C++ structures you would use."

**What a strong answer should cover:**
- Amortized cost = total cost of a worst-case sequence of n operations, divided by n; it is a guarantee, not an average over random inputs.
- The doubling argument: copies 1 + 2 + 4 + … < 2n, so n appends cost under 3n — O(1) amortized, while a single append is still O(n) in the worst case.
- Why the growth must be geometric: growing by a constant amount gives O(n²) total; shrinking must leave a gap (shrink at ¼ full, not ½) or it thrashes.
- The three methods by name (aggregate, accounting/banker, potential) and another example such as a queue built from two stacks.
- C++ specifics: \`push_back\` is amortized constant by the standard, libstdc++ doubles capacity, every reallocation invalidates iterators and references, and \`reserve(n)\` avoids resizes.

**Clarifying questions expected:**
- "Do we care about the worst case of a single operation (latency), or only total throughput?"
- "Do we know the final size in advance, so we could pre-allocate?"

**Code / implementation expected:** Optional — a C++ dynamic array or a two-stack queue that counts copies, with the amortized argument stated.`,
        answer: `**Target Audience:** Interview candidates who know [Big-O notation](/interview-question/what-is-big-o-notation) and want to understand why "occasionally slow" operations can still be O(1).
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every count on this page comes from running the C++ code shown, and the **Verified** section quotes that output; library behaviour is either measured or cited.

## 1. Why This Even Matters — A Story First

You collect books. They live on a bookshelf, and when the shelf is full you buy one twice as big and carry every book across. Moving day is miserable: the day you go from 512 to 1,024 slots, you carry 512 books.

But look at the whole year. You moved 1 book, then 2, then 4, then 8 … then 512. Add them up: 1,023 moves for 1,024 books, **less than one move per book**. Most days you simply put a new book on the shelf. The rare terrible day is paid for by the hundreds of easy days before it.

That is amortized analysis: instead of asking "how bad can one operation be?", you ask "how bad can a long **sequence** of operations be, per operation?" For the bookshelf the answer is "a small constant", even though one day was huge. The same reasoning explains why appending to a dynamic array is called O(1), why a queue made of two stacks is fast, and why a badly chosen growth rule can quietly make code quadratic.

## 2. The Idea in Plain Language

📌 **Interview term: Amortized cost** — the total cost of a worst-case sequence of n operations, divided by n. "Append is O(1) amortized" means: any n appends, starting from empty, cost O(n) in total.

📌 **Interview term: Amortized vs average case** — average case averages over *random inputs* and can be unlucky; amortized averages over a *sequence* and is a guarantee for every sequence. No probability is involved.

📌 **Interview term: Dynamic array** — an array that, when full, allocates a bigger block and copies its elements over (see [arrays vs linked lists](/interview-question/what-is-the-difference-between-an-array-and-a-linked-list)).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Cost of pushes 1 to 17 with doubling, spikes at 2, 3, 5, 9 and 17">
  <text class="d-text" x="380" y="26" text-anchor="middle">Cost of each push with doubling (measured)</text>
  <path class="d-edge" d="M 60 250 L 720 250"/>
  <rect class="d-box-muted" x="70" y="240" width="26" height="10"/>
  <rect class="d-box-accent" x="108" y="230" width="26" height="20"/>
  <rect class="d-box-accent" x="146" y="220" width="26" height="30"/>
  <rect class="d-box-muted" x="184" y="240" width="26" height="10"/>
  <rect class="d-box-accent" x="222" y="200" width="26" height="50"/>
  <rect class="d-box-muted" x="260" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="298" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="336" y="240" width="26" height="10"/>
  <rect class="d-box-accent" x="374" y="160" width="26" height="90"/>
  <rect class="d-box-muted" x="412" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="450" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="488" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="526" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="564" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="602" y="240" width="26" height="10"/>
  <rect class="d-box-muted" x="640" y="240" width="26" height="10"/>
  <rect class="d-box-accent" x="678" y="80" width="26" height="170"/>
  <path class="d-edge-dashed" d="M 60 220 L 720 220"/>
  <text class="d-sub" x="83" y="274" text-anchor="middle">1</text>
  <text class="d-sub" x="235" y="274" text-anchor="middle">5</text>
  <text class="d-sub" x="387" y="274" text-anchor="middle">9</text>
  <text class="d-sub" x="539" y="274" text-anchor="middle">13</text>
  <text class="d-sub" x="691" y="274" text-anchor="middle">17</text>
  <text class="d-sub d-accent" x="387" y="148" text-anchor="middle">cost 9</text>
  <text class="d-sub d-accent" x="640" y="72" text-anchor="middle">cost 17</text>
  <text class="d-sub" x="80" y="120">dashed line: 3 per push</text>
</svg>

The spikes (accent bars) are the resizes: costs 2, 3, 5, 9, 17 at pushes 2, 3, 5, 9 and 17. Every other push costs 1. The spikes get taller, but they also get twice as far apart, so the running average never exceeds 3 per push — the dashed line.

## 3. Proving It: Three Methods

### Aggregate method

📌 **Interview term: Aggregate method** — add up the total cost of n operations directly and divide by n.

With doubling from capacity 1, resizes happen when the size reaches 1, 2, 4, …, up to the largest power of two below n, and each copies that many elements:

> copies = 1 + 2 + 4 + … + 2ᵏ = 2ᵏ⁺¹ − 1 < 2n

Each push also does 1 write, so the total is less than n + 2n = **3n**, and the amortized cost per push is **O(1)**. The run below measured 1,023 copies for 1,000 pushes and 1,048,575 for a million — both under 2n.

### Accounting (banker's) method

📌 **Interview term: Accounting (banker's) method** — charge every operation a fixed "price"; cheap operations overpay and store the extra as credit, and expensive ones spend the saved credit. If the credit never goes negative, the price is a valid amortized cost.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 220" role="img" aria-label="Each push pays 3 coins: one for the write and two saved for a future copy">
  <defs>
    <marker id="b01q4-arrow-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="380" y="26" text-anchor="middle">Banker view: every push pays 3 coins</text>
  <rect class="d-box-accent" x="40" y="70" width="180" height="90" rx="10"/>
  <text class="d-text d-accent" x="130" y="104" text-anchor="middle">push pays 3</text>
  <text class="d-sub" x="130" y="134" text-anchor="middle">a fixed price</text>
  <path class="d-edge" d="M 226 115 L 290 115" marker-end="url(#b01q4-arrow-a)"/>
  <rect class="d-box-muted" x="296" y="56" width="180" height="56" rx="10"/>
  <text class="d-text" x="386" y="90" text-anchor="middle">1 coin: the write</text>
  <rect class="d-box-muted" x="296" y="124" width="180" height="56" rx="10"/>
  <text class="d-text" x="386" y="158" text-anchor="middle">2 coins: saved</text>
  <path class="d-edge-dashed" d="M 482 152 L 546 152" marker-end="url(#b01q4-arrow-a)"/>
  <rect class="d-box-muted" x="552" y="110" width="180" height="84" rx="10"/>
  <text class="d-text" x="642" y="144" text-anchor="middle">later resize</text>
  <text class="d-sub" x="642" y="172" text-anchor="middle">spends saved coins</text>
</svg>

Why 2 saved coins are enough: right after a resize to capacity 2m, the array holds m elements and no credit. The next m pushes each save 2 coins, 2m in total, which is exactly what the next resize needs to copy 2m elements. Credit never goes negative, so 3 per push is a valid amortized cost.

### Potential method

📌 **Interview term: Potential method** — define a "potential" Φ, a number computed from the data structure's state (like stored energy). Amortized cost = actual cost + change in Φ. If Φ starts at 0 and never goes negative, the amortized costs add up to at least the actual total.

For the dynamic array, Φ = 2 · size − capacity works: a normal push raises Φ by 2 (actual 1, amortized 3), and a push that resizes from capacity m drops Φ from m to 2, cancelling the m copies (actual m + 1, amortized 3 again). Φ is 0 or more once the array has been filled the first time, which is all the proof needs. It is the banker's argument written as a formula, and it is the method used for harder cases such as [union-find](/interview-question/what-is-the-union-find-disjoint-set-data-structure) with path compression.

## 4. The Code: a Dynamic Array That Counts Its Copies

~~~cpp
class DynamicArray {
public:
    explicit DynamicArray(function<int(int)> grow) : grow_(grow), slots_(new int[1]) {}
    ~DynamicArray() { delete[] slots_; }
    DynamicArray(const DynamicArray&) = delete;            // owns raw memory: no copies
    DynamicArray& operator=(const DynamicArray&) = delete;

    // Append; return the cost of this push (1 write + any copies).
    long long push(int value) {
        long long cost = 1;
        if (size_ == capacity_) {                           // full: allocate and copy
            int newCap = grow_(capacity_);
            int* newSlots = new int[newCap];
            for (int i = 0; i < size_; i++) newSlots[i] = slots_[i];
            copies_ += size_;
            cost += size_;
            delete[] slots_;
            slots_ = newSlots;
            capacity_ = newCap;
        }
        slots_[size_++] = value;
        return cost;
    }
    int capacity() const { return capacity_; }
    long long copies() const { return copies_; }

private:
    function<int(int)> grow_;
    int* slots_;
    int capacity_ = 1, size_ = 0;
    long long copies_ = 0;
};
~~~

C++ detail: the hand-written class manages raw memory with \`new[]\`/\`delete[]\`, so it deletes its copy constructor and assignment to avoid a double free (the "rule of three"). A real \`std::vector\` also *moves* elements instead of copying them when the element type has a \`noexcept\` move constructor, but the number of elements relocated per resize is the same.

### Why the growth rule must be multiplicative

The same class takes the growth rule as a function. With **doubling**, the average cost settled at about 2 per push no matter how large n got. With **"add 16 slots"**, a resize happens every 16 pushes and copies everything stored so far: the copies are 16 + 32 + 48 + … ≈ n² / 32, so the average cost *grows with n* (32.31 per push at n = 1,000 and 313.06 at n = 10,000 in the run below). Constant-size growth is O(n) per push, O(n²) in total.

📌 **Interview term: Geometric growth** — growing capacity by a constant **factor** (×1.5, ×2) rather than a constant amount. Any factor greater than 1 keeps the copies a geometric series and append amortized O(1).

## 5. How std::vector Really Grows

\`std::vector\` exposes its capacity directly with \`capacity()\`, and \`data()\` shows where the elements live, so you can watch every reallocation:

~~~cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v;
    std::size_t last = v.capacity();
    const int* where = v.data();
    int moves = 0;
    std::cout << "empty vector: capacity " << last << "\\n";
    for (int i = 0; i < 100; i++) {
        v.push_back(i);
        if (v.capacity() != last) {
            if (where != nullptr && v.data() != where) moves++;   // storage moved
            std::cout << "size " << v.size() << ": capacity " << last << " -> " << v.capacity() << "\\n";
            last = v.capacity();
            where = v.data();
        }
    }
    std::cout << "the elements moved to a new address " << moves << " times\\n";

    std::vector<int> r;
    r.reserve(100);                                  // one allocation up front
    const int* before = r.data();
    for (int i = 0; i < 100; i++) r.push_back(i);
    std::cout << std::boolalpha << "after reserve(100): capacity " << r.capacity()
              << ", same address after 100 push_backs: " << (r.data() == before) << "\\n";
}
~~~

Output of \`g++ -std=c++17 main.cpp && ./a.out\`:

~~~text
empty vector: capacity 0
size 1: capacity 0 -> 1
size 2: capacity 1 -> 2
size 3: capacity 2 -> 4
size 5: capacity 4 -> 8
size 9: capacity 8 -> 16
size 17: capacity 16 -> 32
size 33: capacity 32 -> 64
size 65: capacity 64 -> 128
the elements moved to a new address 7 times
after reserve(100): capacity 100, same address after 100 push_backs: true
~~~

With GCC 13's libstdc++ the capacity **doubled**: 1, 2, 4, 8, … 128, and the elements moved to a new address 7 times on the way to 100 items. That matches the library source on this machine: \`_M_check_len\` in \`bits/stl_vector.h\` computes the new length as \`size() + max(size(), n)\`, which is double the size when pushing one element. Other standard libraries may choose a different factor (the standard only requires \`push_back\` to be amortized constant, as cppreference lists it).

Two consequences that matter in C++:

- **Every reallocation invalidates all iterators, pointers and references** into the vector. Holding \`&v[0]\` across a \`push_back\` is a classic bug.
- **\`reserve(n)\`** allocates once: after \`reserve(100)\`, 100 \`push_back\`s kept the same address and never reallocated.

## 6. A Second Classic: a Queue Made of Two Stacks

A queue (first in, first out) can be built from two stacks: push new items onto \`inbox\`; to dequeue, pop from \`outbox\`, and when \`outbox\` is empty, first pour everything from \`inbox\` into it (which reverses the order, putting the oldest item on top). The full question has its own page: [implement a queue using two stacks](/interview-question/how-do-you-implement-a-queue-using-two-stacks).

~~~cpp
class TwoStackQueue {
public:
    void enqueue(int x) { inbox_.push_back(x); }        // always O(1)

    // Return {value, elements moved by this call}. Precondition: not empty.
    pair<int, int> dequeue() {
        int moved = 0;
        if (outbox_.empty()) {                          // refill only when outbox is empty
            while (!inbox_.empty()) {
                outbox_.push_back(inbox_.back());
                inbox_.pop_back();
                moved++;
            }
        }
        moves_ += moved;
        int value = outbox_.back();                     // read before pop_back: it returns void
        outbox_.pop_back();
        return {value, moved};
    }
    long long moves() const { return moves_; }

private:
    vector<int> inbox_, outbox_;                        // vectors used as stacks
    long long moves_ = 0;
};
~~~

One dequeue can be terrible: after 1,000 enqueues, the first dequeue moves all 1,000 elements. But **each element is moved at most once** in its life (inbox → outbox), so over any sequence the moves can never exceed the number of enqueues. Every operation is O(1) amortized. In C++ the two stacks are \`std::vector<int>\`s used with \`push_back\`/\`back\`/\`pop_back\`. Note that \`pop_back()\` returns \`void\`, so the value is read with \`back()\` first. \`std::queue\` (on top of \`std::deque\`) already gives O(1) push and pop.

## 7. A Trap: Shrinking Too Eagerly

If a dynamic array also shrinks when elements are removed, the shrink rule must leave a gap. Shrink to half capacity as soon as the array is half empty, and a push/pop pair at the boundary resizes *every* time: the push grows (copy n), the pop shrinks (copy n), and so on.

~~~cpp
long long copiesFor(double shrinkAt, long long start, int rounds) {
    // Fill to start items (a full array), then alternate push/pop rounds times.
    // Grow x2 when full; shrink to half when size <= capacity * shrinkAt.
    long long capacity = start, size = start, copies = 0;
    for (int r = 0; r < rounds; r++) {
        if (size == capacity) {            // push into a full array: grow
            copies += size;
            capacity *= 2;
        }
        size += 1;
        size -= 1;                         // pop
        if (capacity > 1 && size <= capacity * shrinkAt) {
            copies += size;                // shrink: copy survivors into a smaller array
            capacity /= 2;
        }
    }
    return copies;
}
~~~

The fix is to shrink only when the array is a **quarter** full. After any resize the array is half full, so at least a quarter-capacity's worth of operations must happen before the next resize, which pays for it.

📌 **Interview term: Thrashing** — repeatedly growing and shrinking (or loading and evicting) because the thresholds are too close together, so every operation pays the expensive path.

## 8. Verified: Running the Code

All three programs are the runnable examples under "C++ code" on this page, run with \`g++ -std=c++17 main.cpp && ./a.out\`.

**Example 1 — cost of each push, doubling vs +16:**

~~~text
doubling: cost of each push (1 write + copies)
  push 1: cost 1
  push 2: cost 2 (grow 1 -> 2)
  push 3: cost 3 (grow 2 -> 4)
  push 4: cost 1
  push 5: cost 5 (grow 4 -> 8)
  push 6: cost 1
  push 7: cost 1
  push 8: cost 1
  push 9: cost 9 (grow 8 -> 16)
  push 10: cost 1
  push 11: cost 1
  push 12: cost 1
  push 13: cost 1
  push 14: cost 1
  push 15: cost 1
  push 16: cost 1
  push 17: cost 17 (grow 16 -> 32)
doubling, n=1000: copies 1023, total cost 2023, average 2.02 per push
doubling, n=1000000: copies 1048575, total cost 2048575, average 2.05 per push
grow by +16, n=1000: copies 31311, total cost 32311, average 32.31 per push
grow by +16, n=10000: copies 3120625, total cost 3130625, average 313.06 per push
~~~

The per-push costs spike at pushes 2, 3, 5, 9 and 17 (the resizes) and are 1 otherwise. With doubling the average stayed at 2.02 and 2.05 per push from 1,000 to 1,000,000 pushes; with +16 it went from 32.31 to 313.06 when n grew tenfold — the signature of O(n) per push.

**Example 2 — the two-stack queue:**

~~~text
enqueue 1..1000, then dequeue all
  first five out: [1, 2, 3, 4, 5]
  most expensive single dequeue moved 1000 elements
  total moves 1000 over 2000 operations = 0.50 per operation
interleaved: 100000 enqueues and 50000 dequeues
  most expensive single dequeue moved 32768 elements
  total moves 65534 over 150000 operations = 0.44 per operation
~~~

The queue is still first-in, first-out (1, 2, 3, 4, 5). One dequeue moved 1,000 elements, yet the total was 1,000 moves for 2,000 operations. In the interleaved run the worst dequeue moved 32,768 elements, and the average was still below 1 move per operation.

**Example 3 — shrink policies:**

~~~text
shrink when half empty   -> 2048000 copies for 1000 push/pop pairs
shrink when 3/4 empty    -> 1024 copies for 1000 push/pop pairs
~~~

Shrinking at half full did 2,048 copies per push/pop pair (one grow and one shrink of 1,024 elements, every round). Shrinking at a quarter did one grow and then nothing.

## 9. Complexity Summary

| Operation | Worst single call | Amortized | Why |
| :--- | :--- | :--- | :--- |
| Dynamic array push, doubling | O(n) | **O(1)** | copies sum to < 2n |
| Dynamic array push, +16 growth | O(n) | O(n) | copies sum to about n² / 32 |
| Dynamic array pop with ¼ shrink rule | O(n) | **O(1)** | a gap between grow and shrink thresholds |
| Dynamic array pop with ½ shrink rule | O(n) | O(n) | thrashes at the boundary |
| Two-stack queue enqueue | O(1) | O(1) | one push |
| Two-stack queue dequeue | O(n) | **O(1)** | each element moved once |
| Space for all of the above | — | O(n) | at most a constant factor of slack |

Other places amortized analysis shows up: hash tables that rehash into a bigger table ([how a hash table works](/interview-question/how-does-a-hash-table-work)), the [monotonic stack](/interview-question/what-is-a-monotonic-stack-and-when-do-you-use-it) where each element is pushed and popped once, the [sliding window](/interview-question/what-is-the-sliding-window-technique) where each pointer only moves forward, and union-find with path compression.

## 10. Edge Cases and Subtleties

- **Amortized bounds assume you start from the beginning.** "n operations cost O(n)" is about a sequence starting from an empty (or freshly built) structure; a single operation picked at random can still be the expensive one.
- **Latency vs throughput.** Amortized O(1) is about total work. If one slow operation is unacceptable (a request with a deadline), pre-allocate or use a structure with a worst-case O(1) bound.
- **Two different "O(1)s".** Hash-map lookups are *average-case* O(1) (they depend on the hash); dynamic-array appends are *amortized* O(1) (they do not). A hash table's insert is both: average-case per operation, amortized over resizes.
- **The starting capacity does not matter** for the Big-O; it only changes how many tiny resizes happen at the start.
- **Memory slack.** Doubling can leave up to half the capacity unused right after a resize; that is the price of O(1) appends, and still O(n) space.

## Common Pitfalls

- **Calling amortized O(1) "average case".** Amortized is a guarantee over *every* sequence of operations, with no probability involved; \`unordered_map::find\` is average-case O(1), \`push_back\` is amortized O(1).
- **Keeping iterators or pointers across \`push_back\`.** A reallocation (7 of them on the way to 100 items above) invalidates them all; \`reserve\` first or store indices.
- **Forgetting \`reserve\` when the size is known.** It turns many reallocations into one, and removes the latency spikes.
- **Growing by a constant amount.** Adding 16 slots per resize gave 313 copies per push at n = 10,000 in the run above, rising with n: O(n) per push.
- **Expecting \`shrink_to_fit\` or \`pop_back\` to shrink cheaply.** \`pop_back\` never reduces capacity; \`shrink_to_fit\` is a non-binding request that may reallocate (O(n)). Shrinking at half full is how you get the 2,048,000-copy thrash measured above.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">Amortized analysis bounds the total cost of any sequence of n operations and divides by n, so an occasionally expensive operation can still be O(1) amortized.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The classic example:</strong> <span style="color:#f0e2c8;">Dynamic-array append: a resize copies everything, but with doubling the copies are 1 + 2 + 4 + ... &lt; 2n, so n appends cost under 3n. I measured 2.05 per push at a million pushes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The methods:</strong> <span style="color:#f0e2c8;">Aggregate: sum the total. Banker: charge each push 3 credits and save 2 for later copies. Potential: a function of the state that pays for the expensive steps.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. C++ specifics:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code> is amortized constant by the standard; libstdc++ doubles the capacity (1, 2, 4, 8 in my run), every reallocation invalidates iterators, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reserve</code> avoids them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The difference:</strong> <span style="color:#f0e2c8;">Amortized is a worst-case guarantee over a sequence, not an average over random inputs; a single operation can still be O(n).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does growing by a constant (say +16) break it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then a resize happens every 16 pushes and copies the current size, so the copies add up to about n^2 / 32: O(n) per push. I measured 313 copies per push at n = 10,000, rising with n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might a library choose 1.5x instead of 2x?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both are geometric, so both are amortized O(1). A smaller factor wastes less memory, and is sometimes argued to let freed blocks be reused; libstdc++ on GCC 13 uses doubling, as its source and my run show.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the two-stack queue prove?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each element is pushed once, moved once and popped once, so n operations do at most about 3n steps even though one dequeue can move every element.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What breaks if you keep <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int* p = &amp;v[0]</code> and then <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">push_back</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code> reallocates, the elements move and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p</code> dangles; dereferencing it is undefined behaviour. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reserve</code> beforehand, or keep an index.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is amortized not good enough?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When every operation must be fast, like an audio callback or a game frame. Then you <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reserve</code> at startup or use fixed-size storage such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::array</code>.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Amortized cost** | Total cost of a worst-case sequence divided by its length |
| **Amortized vs average case** | Guarantee over every sequence vs expectation over random inputs |
| **Dynamic array** | Array that grows by allocating a bigger block and copying |
| **Aggregate method** | Sum the total cost of n operations, divide by n |
| **Accounting (banker's) method** | Overcharge cheap operations, spend the credit on expensive ones |
| **Potential method** | Amortized cost = actual cost + change in a state function Φ |
| **Geometric growth** | Grow capacity by a constant factor, not a constant amount |
| **Thrashing** | Resizing back and forth because thresholds are too close |
| **\`reserve\`** | \`std::vector\` call that allocates capacity once, up front |

**Conclusion:** Amortized analysis answers "what does each operation cost over a whole sequence?" rather than "what is the worst single operation?". For a dynamic array that doubles, the resizes copy fewer than 2n elements in total, so append is O(1) amortized even though one append can be O(n) — measured here at 2.05 copies-plus-writes per push over a million pushes, against 313 per push for a constant +16 growth rule. The same reasoning makes a two-stack queue O(1) per operation and explains why shrinking must wait until a quarter full. In C++, the built-in structures already follow these rules, so the interview skill is to explain *why* they are O(1), name the method you are using, and point out when a single slow operation would still matter.`,
        examples: [
          {
            label: "Dynamic array: cost of every push, doubling vs growing by a constant",
            code: `#include <cstdio>
#include <functional>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

// A dynamic array built by hand, counting every element copy.

class DynamicArray {
public:
    explicit DynamicArray(function<int(int)> grow) : grow_(grow), slots_(new int[1]) {}
    ~DynamicArray() { delete[] slots_; }
    DynamicArray(const DynamicArray&) = delete;            // owns raw memory: no copies
    DynamicArray& operator=(const DynamicArray&) = delete;

    // Append; return the cost of this push (1 write + any copies).
    long long push(int value) {
        long long cost = 1;
        if (size_ == capacity_) {                           // full: allocate and copy
            int newCap = grow_(capacity_);
            int* newSlots = new int[newCap];
            for (int i = 0; i < size_; i++) newSlots[i] = slots_[i];
            copies_ += size_;
            cost += size_;
            delete[] slots_;
            slots_ = newSlots;
            capacity_ = newCap;
        }
        slots_[size_++] = value;
        return cost;
    }
    int capacity() const { return capacity_; }
    long long copies() const { return copies_; }

private:
    function<int(int)> grow_;
    int* slots_;
    int capacity_ = 1, size_ = 0;
    long long copies_ = 0;
};

int main() {
    auto twice = [](int c) { return c * 2; };
    auto plus16 = [](int c) { return c + 16; };

    cout << "doubling: cost of each push (1 write + copies)\\n";
    {
        DynamicArray arr(twice);
        for (int v = 1; v <= 17; v++) {
            int before = arr.capacity();
            long long cost = arr.push(v);
            cout << "  push " << v << ": cost " << cost;
            if (arr.capacity() != before) cout << " (grow " << before << " -> " << arr.capacity() << ")";
            cout << "\\n";
        }
    }

    vector<string> names = {"doubling", "grow by +16"};
    vector<function<int(int)>> grows = {twice, plus16};
    vector<vector<int>> sizes = {{1000, 1000000}, {1000, 10000}};
    for (int k = 0; k < 2; k++) {
        for (int n : sizes[k]) {
            DynamicArray arr(grows[k]);
            long long total = 0;
            for (int v = 0; v < n; v++) total += arr.push(v);
            double avg = (double) total / n;
            printf("%s, n=%d: copies %lld, total cost %lld, average %.2f per push\\n",
                   names[k].c_str(), n, arr.copies(), total, avg);
        }
    }
    return 0;
}`,
          },
          {
            label: "Queue from two stacks: one slow dequeue, O(1) amortized",
            code: `#include <algorithm>
#include <cstdio>
#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

// A queue built from two stacks: one dequeue can be slow, the average is O(1).

class TwoStackQueue {
public:
    void enqueue(int x) { inbox_.push_back(x); }        // always O(1)

    // Return {value, elements moved by this call}. Precondition: not empty.
    pair<int, int> dequeue() {
        int moved = 0;
        if (outbox_.empty()) {                          // refill only when outbox is empty
            while (!inbox_.empty()) {
                outbox_.push_back(inbox_.back());
                inbox_.pop_back();
                moved++;
            }
        }
        moves_ += moved;
        int value = outbox_.back();                     // read before pop_back: it returns void
        outbox_.pop_back();
        return {value, moved};
    }
    long long moves() const { return moves_; }

private:
    vector<int> inbox_, outbox_;                        // vectors used as stacks
    long long moves_ = 0;
};

int main() {
    TwoStackQueue q;
    for (int x = 1; x <= 1000; x++) q.enqueue(x);
    vector<int> firstFive;
    int worst = 0;
    for (int i = 0; i < 1000; i++) {
        auto [value, moved] = q.dequeue();
        worst = max(worst, moved);
        if (firstFive.size() < 5) firstFive.push_back(value);
    }
    cout << "enqueue 1..1000, then dequeue all\\n";
    cout << "  first five out: [" << firstFive[0] << ", " << firstFive[1] << ", " << firstFive[2]
         << ", " << firstFive[3] << ", " << firstFive[4] << "]\\n";
    cout << "  most expensive single dequeue moved " << worst << " elements\\n";
    printf("  total moves %lld over 2000 operations = %.2f per operation\\n", q.moves(), q.moves() / 2000.0);

    TwoStackQueue q2;
    int ops = 0;
    worst = 0;
    for (int x = 1; x <= 100000; x++) {                // interleave: 2 enqueues, then 1 dequeue
        q2.enqueue(x);
        ops++;
        if (x % 2 == 0) {
            worst = max(worst, q2.dequeue().second);
            ops++;
        }
    }
    cout << "interleaved: 100000 enqueues and 50000 dequeues\\n";
    cout << "  most expensive single dequeue moved " << worst << " elements\\n";
    printf("  total moves %lld over %d operations = %.2f per operation\\n", q2.moves(), ops, (double) q2.moves() / ops);
    return 0;
}`,
          },
          {
            label: "Why shrinking at half full breaks the bound",
            code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>
using namespace std;

// Shrinking too eagerly breaks the amortized bound. Count the copies.

long long copiesFor(double shrinkAt, long long start, int rounds) {
    // Fill to start items (a full array), then alternate push/pop rounds times.
    // Grow x2 when full; shrink to half when size <= capacity * shrinkAt.
    long long capacity = start, size = start, copies = 0;
    for (int r = 0; r < rounds; r++) {
        if (size == capacity) {            // push into a full array: grow
            copies += size;
            capacity *= 2;
        }
        size += 1;
        size -= 1;                         // pop
        if (capacity > 1 && size <= capacity * shrinkAt) {
            copies += size;                // shrink: copy survivors into a smaller array
            capacity /= 2;
        }
    }
    return copies;
}

int main() {
    vector<pair<string, double>> policies = {{"shrink when half empty   ", 0.5},
                                             {"shrink when 3/4 empty    ", 0.25}};
    for (const auto& [label, shrinkAt] : policies) {
        cout << label << "-> " << copiesFor(shrinkAt, 1024, 1000) << " copies for 1000 push/pop pairs\\n";
    }
    return 0;
}`,
          },
        ],
      },
    },
  },
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is recursion and what is a base case?",
    difficulty: "easy",
    seoDescription: "Recursion and base cases from zero: how calls wind and unwind, the three rules, base-case bugs, and memoisation, with traces verified in four languages.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"What is recursion, and what is a base case? Write a small recursive function in Python — say factorial or the sum of a list — point to the base case, and tell me what happens if it is missing."

**What a strong answer should cover:**
- Recursion: a function that solves a problem by calling itself on a smaller instance of the same problem.
- The base case: the smallest input, answered directly without another call; the recursive case: reduces the problem and calls itself.
- Every call must make progress toward the base case; a missing or unreachable base case recurses until the stack overflows.
- The call stack: calls wind down to the base case, then results unwind back up; stack space is the maximum depth, time is the number of calls times the work per call.
- Python specifics: a missing base case ends in \`RecursionError\` (default limit 1000), recursing on slices copies data, and \`functools.lru_cache\` memoises a recursion in one line.

**Code / implementation expected:** Yes — a short recursive Python function (factorial, sum, palindrome) with its base case, and its cost.`,
        answer: `**Target Audience:** Complete beginners preparing for coding interviews — you only need to know what a function is.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every trace, count and error message on this page comes from running the Python code shown, and the **Verified** section quotes that output.

## 1. Why This Even Matters — A Story First

You are sitting in a dark cinema and want to know which row you are in. You cannot see the row numbers, so you tap the person in front of you and ask, "Which row are you in?" They do not know either, so they ask the person in front of *them*. The question travels forward, row by row, until it reaches someone in the front row. They do not need to ask anyone: they *know* they are in row 1.

Then the answers travel back. "Row 1" becomes "row 2" for the person behind, "row 3" for the next, and eventually someone tells you "row 14", so you are in row 15.

That is recursion. Everybody runs the same simple rule ("ask the person in front, then add one"), the question gets smaller each time, and there is one person who can answer without asking: the **base case**. Without the front row, the question would travel forever. Recursion is how interviewers expect you to think about trees, graphs, [backtracking](/interview-question/what-is-backtracking) and [dynamic programming](/interview-question/what-is-dynamic-programming), so getting the base case right is a skill you will use in a large share of interview problems.

## 2. The Idea in Plain Language

📌 **Interview term: Recursion** — a function that solves a problem by calling itself on a smaller version of the same problem.

📌 **Interview term: Base case** — an input small enough to answer directly, without another recursive call. It is what stops the recursion.

📌 **Interview term: Recursive case** — the part that reduces the problem and calls the function again on the smaller input, then uses that answer.

📌 **Interview term: Progress toward the base case** — every recursive call must be on an input that is strictly "closer" to a base case (a smaller n, a shorter list, a smaller subtree). If not, the recursion never ends.

The three rules of a correct recursion:

1. **Have a base case** that returns without recursing.
2. **Make the recursive call on a smaller input.**
3. **Make sure every possible input eventually reaches a base case.**

📌 **Interview term: Recursive leap of faith** — when writing the recursive case, assume the call on the smaller input already returns the right answer, and only ask "how do I build my answer from it?". For factorial: if \`factorial(n − 1)\` is right, then \`n × factorial(n − 1)\` is right.

## 3. Winding Down and Unwinding

Each call that has started but not finished waits on the **call stack** (one frame per call; the memory cost is covered on [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)). Calls go *down* until a base case answers; then the answers come *back up*, each frame finishing its multiplication.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 340" role="img" aria-label="factorial of 4 calls down to the base case then returns 1, 2, 6 and 24 back up">
  <defs>
    <marker id="b01q5-arrow-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="190" y="26" text-anchor="middle">Winding: calls go down</text>
  <text class="d-text" x="570" y="26" text-anchor="middle">Unwinding: results come up</text>
  <rect class="d-box-muted" x="90" y="48" width="200" height="44" rx="8"/>
  <text class="d-text" x="190" y="76" text-anchor="middle">factorial(4)</text>
  <path class="d-edge" d="M 190 92 L 190 116" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="90" y="120" width="200" height="44" rx="8"/>
  <text class="d-text" x="190" y="148" text-anchor="middle">factorial(3)</text>
  <path class="d-edge" d="M 190 164 L 190 188" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="90" y="192" width="200" height="44" rx="8"/>
  <text class="d-text" x="190" y="220" text-anchor="middle">factorial(2)</text>
  <path class="d-edge" d="M 190 236 L 190 260" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-accent" x="90" y="264" width="200" height="44" rx="8"/>
  <text class="d-text d-accent" x="190" y="292" text-anchor="middle">factorial(1): base case</text>
  <path class="d-edge-dashed" d="M 296 286 L 464 286" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-accent" x="470" y="264" width="200" height="44" rx="8"/>
  <text class="d-text d-accent" x="570" y="292" text-anchor="middle">returns 1</text>
  <path class="d-edge-accent" d="M 570 264 L 570 240" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="470" y="192" width="200" height="44" rx="8"/>
  <text class="d-text" x="570" y="220" text-anchor="middle">2 x 1 = 2</text>
  <path class="d-edge-accent" d="M 570 192 L 570 168" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="470" y="120" width="200" height="44" rx="8"/>
  <text class="d-text" x="570" y="148" text-anchor="middle">3 x 2 = 6</text>
  <path class="d-edge-accent" d="M 570 120 L 570 96" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="470" y="48" width="200" height="44" rx="8"/>
  <text class="d-text" x="570" y="76" text-anchor="middle">4 x 6 = 24</text>
</svg>

No multiplication happens on the way down: each frame is parked, waiting for the answer from below. All the work happens on the way back up. The first example prints exactly this, with indentation showing the depth:

~~~python
def factorial(n, depth=0):
    pad = "  " * depth
    print(pad + "call factorial(" + str(n) + ")")
    if n <= 1:                                   # base case: answer known, no more calls
        print(pad + "return 1   <- base case")
        return 1
    result = n * factorial(n - 1, depth + 1)    # recursive case: a smaller problem
    print(pad + "return " + str(result))
    return result
~~~

📌 **Interview term: Unwinding** — the return phase, when each waiting call receives its sub-answer, finishes its own work and returns to its caller.

## 4. Five Small Recursions

Every recursive function has the same shape: check the base case(s), otherwise call on something smaller. Here are five, with the base case and the "smaller" step marked:

~~~python
def factorial(n):
    if n <= 1:                     # base case (covers 0 and 1)
        return 1
    return n * factorial(n - 1)    # n shrinks by 1 each call

def sum_list(nums, i=0):
    if i == len(nums):             # base case: nothing left to add
        return 0
    return nums[i] + sum_list(nums, i + 1)   # an index, not nums[1:], so no copying

def reverse_string(s, i=0):
    if i == len(s):                # base case: empty suffix
        return ""
    return reverse_string(s, i + 1) + s[i]

def power(base, exp):
    if exp == 0:                   # base case: anything to the power 0 is 1
        return 1
    half = power(base, exp // 2)   # exp halves: only about log2(exp) calls
    return half * half if exp % 2 == 0 else half * half * base

def is_palindrome(s, lo=0, hi=None):
    if hi is None:
        hi = len(s) - 1
    if lo >= hi:                   # base case: 0 or 1 characters left
        return True
    if s[lo] != s[hi]:             # second base case: a mismatch settles it
        return False
    return is_palindrome(s, lo + 1, hi - 1)
~~~

Python details in these functions:

- Default arguments (\`i=0\`, \`hi=None\`) let the caller write \`sum_list(nums)\` while the recursion passes the extra state. Never use a mutable default like \`visited=[]\`: it is created once and shared between calls; the examples pass the list in explicitly.
- \`sum_list\` walks with an **index** instead of recursing on \`nums[1:]\`; a slice copies the rest of the list at every level, turning O(n) into O(n²).
- \`exp // 2\` is floor division, so \`power\` halves the exponent and makes only about log₂(exp) calls.
- Python integers never overflow, so \`factorial(20)\` (and \`factorial(100)\`) is exact.

Two shapes appear here:

- **Linear recursion** — one recursive call per call (\`factorial\`, \`sum\`, \`reverse\`, \`palindrome\`): n calls for an input of size n.
- **Divide and conquer** — the input is cut in half (\`power\`): only about log₂ n calls. The same idea powers [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) and [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work).

📌 **Interview term: Multiple base cases** — some recursions need more than one stopping condition, like \`is_palindrome\` (0–1 characters left, or a mismatch) and Fibonacci (\`n = 0\` and \`n = 1\`).

## 5. Base Cases That Go Wrong

There are three classic base-case bugs:

1. **Missing** — the function always calls itself (next section shows what Python does).
2. **Unreachable** — the base case exists, but the steps jump over it.
3. **Wrong value** — the recursion stops, but returns the wrong thing for the smallest input (for example, \`factorial(0)\` returning 0 makes *every* factorial 0).

Bug 2 in code, with a guard so the demo can stop it:

~~~python
def count_down_by_two(n, visited, guard):
    visited.append(n)
    if len(visited) > guard:       # safety net so the demo stops; real code has none
        return "never reached the base case"
    if n == 0:                     # BUG: an odd n jumps from 1 to -1 and skips 0
        return "done"
    return count_down_by_two(n - 2, visited, guard)

def count_down_by_two_fixed(n, visited):
    visited.append(n)
    if n <= 0:                     # FIX: a range, not a single value, can always be hit
        return "done"
    return count_down_by_two_fixed(n - 2, visited)
~~~

Starting from 5 and stepping by 2 gives 5, 3, 1, −1, −3, … and never equals 0. A base case written as a *range* (\`n <= 0\`) catches every value that can arrive. Rule of thumb: test your recursion by hand on the two or three smallest inputs (0, 1, 2; empty and one-element lists) before anything else.

## 6. What a Missing Base Case Does in Python

Here is factorial with the base case deleted, plus the standard-library way to memoise a recursion:

~~~python
from functools import lru_cache

def factorial_no_base(n):
    return n * factorial_no_base(n - 1)       # BUG: no base case

try:
    factorial_no_base(5)
except RecursionError as e:
    print("RecursionError:", e)

@lru_cache(maxsize=None)                      # memoisation in one line
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print("fib(80) =", fib(80))
print(fib.cache_info())
~~~

Output of \`python3 main.py\`:

~~~text
RecursionError: maximum recursion depth exceeded
fib(80) = 23416728348467685
CacheInfo(hits=78, misses=81, maxsize=None, currsize=81)
~~~

Without a base case the calls never stop, and CPython raises \`RecursionError: maximum recursion depth exceeded\` when it hits its frame limit (1,000 by default; see [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)). It is a normal exception, so a bug like this fails loudly rather than crashing the interpreter.

\`@functools.lru_cache(maxsize=None)\` caches every result by argument, which is memoisation in one line: \`fib(80)\` returned immediately, with 81 distinct computations (\`misses\`) and 78 cache \`hits\`. \`functools.cache\` (available in this Python 3.13) is a shorter spelling of the same unbounded cache.

📌 **Interview term: Stack overflow** — the crash or error when recursion is so deep (or endless) that the call stack runs out of memory.

## 7. When Recursion Repeats Itself: Memoisation

Fibonacci has two base cases (\`fib(0) = 0\`, \`fib(1) = 1\`) and two recursive calls. That second call is a trap: \`fib(5)\` calls \`fib(4)\` and \`fib(3)\`, but \`fib(4)\` *also* calls \`fib(3)\`, and so on. The same subproblems are solved again and again, and the number of calls grows exponentially.

📌 **Interview term: Memoisation** — caching each subproblem's answer the first time it is computed, so later calls just look it up. It is the top-down form of [dynamic programming](/interview-question/what-is-dynamic-programming).

Here are both versions, from the third example:

~~~python
calls = 0

def fib(n):                        # two base cases, two recursive calls
    global calls
    calls += 1
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

def fib_memo(n, memo):             # same recursion, each answer computed once
    global calls
    calls += 1
    if n < 2:
        return n
    if n not in memo:
        memo[n] = fib_memo(n - 1, memo) + fib_memo(n - 2, memo)
    return memo[n]
~~~

Naive \`fib(25)\` made **242,785** calls; the memoised version made **49**: each value from 2 to 25 is computed once, and each of those computations makes two calls. The classic interview form of this is [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem).

### Recursion or a loop?

Anything recursive can be written with a loop (plus an explicit stack when the recursion branches). Choose recursion when the problem is naturally recursive — trees, nested structures, [tree traversals](/interview-question/what-are-the-tree-traversal-methods), backtracking — because the code mirrors the definition. Choose a loop when the recursion would be a long straight line (summing a long list): it uses O(1) stack instead of O(n).

## 8. Verified: Running the Code

All three programs are the runnable examples under "Python code" on this page, run with \`python3 main.py\`.

**Example 1 — the factorial trace:**

~~~text
call factorial(4)
  call factorial(3)
    call factorial(2)
      call factorial(1)
      return 1   <- base case
    return 2
  return 6
return 24
factorial(4) = 24
~~~

Four calls go down (indentation = depth), the base case answers \`1\` with no further call, and the results come back as 2, 6 and 24.

**Example 2 — five small recursions:**

~~~text
120
1
2432902008176640000
14
0
noisrucer
1024
1
true
false
~~~

Note the base-case inputs in the list: \`factorial(0)\`, the empty list and \`power(3, 0)\` are answered entirely by the base case.

**Example 3 — base-case bugs and memoisation:**

~~~text
buggy  (n == 0), start 5: [5, 3, 1, -1, -3, -5, -7] -> never reached the base case
fixed  (n <= 0), start 5: [5, 3, 1, -1] -> done
fixed  (n <= 0), start 4: [4, 2, 0] -> done
fib(25) = 75025 with naive recursion: 242785 calls
fib(25) = 75025 with memoisation:     49 calls
~~~

The buggy version passed 0 by and was only stopped by the demo guard; the fixed version stops at −1 for odd starts and at 0 for even ones. Both Fibonacci versions return 75,025, with 242,785 calls versus 49.

## 9. Complexity of the Examples

| Function | Calls | Time | Stack space |
| :--- | :--- | :--- | :--- |
| \`factorial(n)\` | n | O(n) | O(n) |
| sum of a list of n | n + 1 | O(n) | O(n) |
| reverse a string of n | n + 1 | O(n²) — each return builds a new string | O(n) |
| \`power(b, e)\` by halving | about log₂ e | O(log e) | O(log e) |
| palindrome check of n | about n / 2 | O(n) | O(n) |
| naive \`fib(n)\` | grows like 1.618ⁿ (242,785 for n = 25) | O(2ⁿ) bound | O(n) |
| memoised \`fib(n)\` | 2n − 1 (49 for n = 25) | O(n) | O(n) stack + O(n) memo |

The general rule: **time = number of calls × work per call**, and **stack space = maximum depth**. (Fibonacci's exact growth rate is about 1.618ⁿ; O(2ⁿ) is the simple upper bound usually quoted.)

## 10. Edge Cases and Subtleties

- **The smallest inputs are the base cases.** Empty list, empty string, n = 0, a \`null\` tree node — make sure each is handled and returns the right value.
- **Negative inputs.** \`factorial(-3)\` with base case \`n <= 1\` returns 1, which is wrong but at least stops; with \`n == 1\` it would never stop. Decide whether to reject invalid inputs.
- **Very deep inputs.** Linear recursion over a large input can exhaust the stack (section 6); prefer a loop for long straight-line recursions.
- **Base case vs guard.** A base case is part of the algorithm's logic; a depth guard like the one in the demo is a debugging tool, not a fix.
- **Mutual recursion.** \`is_even(n)\` calling \`is_odd(n − 1)\` and back is still recursion, and still needs a base case (\`is_even(0) = true\`).

## Common Pitfalls

- **No base case, or one that cannot be reached.** \`n == 0\` with steps of 2 skips 0 for odd n; the demo had to stop it with a guard. Use \`n <= 0\`, and check the base case for the smallest inputs (0, 1, empty list).
- **Recursing on slices.** \`f(nums[1:])\` copies the list on every call; pass an index.
- **Mutable default arguments.** \`def f(n, seen=[])\` shares one list across all calls to \`f\`; pass it explicitly or default to \`None\`.
- **Recursing deeper than about 1,000.** \`RecursionError\` arrives quickly for linear recursions over long lists; use a loop there.
- **Exponential repeated work.** Naive \`fib(25)\` made 242,785 calls; \`lru_cache\` or a dict memo brings it to linear.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">Recursion is a function solving a problem by calling itself on a smaller version of the same problem.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The base case:</strong> <span style="color:#f0e2c8;">The base case is the input small enough to answer directly, with no further call; without one, or if it is unreachable, the recursion never stops.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The three rules:</strong> <span style="color:#f0e2c8;">A base case, a recursive case that calls on a smaller input, and every call moving closer to the base case. Then trust the recursive call to be correct for the smaller input.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Python specifics:</strong> <span style="color:#f0e2c8;">Missing base cases end in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RecursionError</code> at about 1,000 frames; I avoid slicing in recursion, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools.lru_cache</code> to memoise.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">Time is calls times work per call; stack space is the maximum depth. Naive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(25)</code> made 242,785 calls, the memoised one 49.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can every recursion be written as a loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Linear recursions become a simple loop with an accumulator; branching ones need an explicit stack, usually a Python list with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">count_down_by_two(5)</code> with base case <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">n == 0</code> never stop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">5, 3, 1, -1: it steps over 0. The base case must cover every value the recursion can reach, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &lt;= 0</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the base case of a recursive binary tree function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node is None</code>: an empty subtree has height 0, sum 0, and so on. Handling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> once removes special cases for leaves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lru_cache</code> change Fibonacci?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(k)</code> is computed once and then read from the cache, so the call count drops from exponential to linear: 81 misses for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(80)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Python optimise tail recursion?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. CPython keeps a frame for every call, so a tail-recursive function still hits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RecursionError</code>; write the loop instead.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Recursion** | A function solving a problem by calling itself on a smaller version |
| **Base case** | An input answered directly, which stops the recursion |
| **Recursive case** | The part that shrinks the problem and calls itself |
| **Progress toward the base case** | Every call must be on a strictly smaller input |
| **Recursive leap of faith** | Assume the smaller call is right; build your answer from it |
| **Unwinding** | Results returning up the chain of waiting calls |
| **Multiple base cases** | More than one stopping condition, e.g. Fibonacci |
| **Stack overflow** | Running out of call-stack memory from too-deep recursion |
| **Memoisation** | Caching subproblem answers so each is computed once |
| **\`lru_cache\`** | Python decorator that memoises a function by its arguments |

**Conclusion:** Recursion solves a problem by handing a smaller copy of it to the same function and building the answer from what comes back; the base case is the input small enough to answer directly, and it is what makes the whole thing stop. Get the three rules right — a base case, a smaller recursive call, and guaranteed progress toward the base case — and recursion is the clearest way to express trees, divide-and-conquer and backtracking. The runs here show both sides: a clean wind-down and unwind for \`factorial(4)\`, a base case that odd numbers skipped right over, and a Fibonacci that needed 242,785 calls until memoisation cut it to 49. In Python, also know what a runaway recursion looks like, so you recognise the bug the moment you see it.`,
        examples: [
          {
            label: "Trace factorial(4): calls going down, returns coming back up",
            code: `# Watch recursion wind down to the base case and unwind back up.

def factorial(n, depth=0):
    pad = "  " * depth
    print(pad + "call factorial(" + str(n) + ")")
    if n <= 1:                                   # base case: answer known, no more calls
        print(pad + "return 1   <- base case")
        return 1
    result = n * factorial(n - 1, depth + 1)    # recursive case: a smaller problem
    print(pad + "return " + str(result))
    return result

answer = factorial(4)
print("factorial(4) = " + str(answer))`,
          },
          {
            label: "Five small recursions, each with its base case",
            code: `# Five small recursions. Each has a base case and a step toward it.

def factorial(n):
    if n <= 1:                     # base case (covers 0 and 1)
        return 1
    return n * factorial(n - 1)    # n shrinks by 1 each call

def sum_list(nums, i=0):
    if i == len(nums):             # base case: nothing left to add
        return 0
    return nums[i] + sum_list(nums, i + 1)   # an index, not nums[1:], so no copying

def reverse_string(s, i=0):
    if i == len(s):                # base case: empty suffix
        return ""
    return reverse_string(s, i + 1) + s[i]

def power(base, exp):
    if exp == 0:                   # base case: anything to the power 0 is 1
        return 1
    half = power(base, exp // 2)   # exp halves: only about log2(exp) calls
    return half * half if exp % 2 == 0 else half * half * base

def is_palindrome(s, lo=0, hi=None):
    if hi is None:
        hi = len(s) - 1
    if lo >= hi:                   # base case: 0 or 1 characters left
        return True
    if s[lo] != s[hi]:             # second base case: a mismatch settles it
        return False
    return is_palindrome(s, lo + 1, hi - 1)

print(factorial(5))  # 120
print(factorial(0))  # 1
print(factorial(20))  # 2432902008176640000
print(sum_list([3, 1, 4, 1, 5]))  # 14
print(sum_list([]))  # 0
print(reverse_string("recursion"))  # noisrucer
print(power(2, 10))  # 1024
print(power(3, 0))  # 1
print(str(is_palindrome("racecar")).lower())  # true
print(str(is_palindrome("recursion")).lower())  # false`,
          },
          {
            label: "Base-case bugs, and naive vs memoised Fibonacci",
            code: `# Base cases that are wrong, and base cases that repeat work.

def count_down_by_two(n, visited, guard):
    visited.append(n)
    if len(visited) > guard:       # safety net so the demo stops; real code has none
        return "never reached the base case"
    if n == 0:                     # BUG: an odd n jumps from 1 to -1 and skips 0
        return "done"
    return count_down_by_two(n - 2, visited, guard)

def count_down_by_two_fixed(n, visited):
    visited.append(n)
    if n <= 0:                     # FIX: a range, not a single value, can always be hit
        return "done"
    return count_down_by_two_fixed(n - 2, visited)

calls = 0

def fib(n):                        # two base cases, two recursive calls
    global calls
    calls += 1
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

def fib_memo(n, memo):             # same recursion, each answer computed once
    global calls
    calls += 1
    if n < 2:
        return n
    if n not in memo:
        memo[n] = fib_memo(n - 1, memo) + fib_memo(n - 2, memo)
    return memo[n]

def fmt(items):
    return "[" + ", ".join(str(x) for x in items) + "]"

visited = []
status = count_down_by_two(5, visited, 6)
print("buggy  (n == 0), start 5: " + fmt(visited) + " -> " + status)
visited = []
status = count_down_by_two_fixed(5, visited)
print("fixed  (n <= 0), start 5: " + fmt(visited) + " -> " + status)
visited = []
status = count_down_by_two_fixed(4, visited)
print("fixed  (n <= 0), start 4: " + fmt(visited) + " -> " + status)

calls = 0
value = fib(25)
print("fib(25) = " + str(value) + " with naive recursion: " + str(calls) + " calls")
calls = 0
value = fib_memo(25, {})
print("fib(25) = " + str(value) + " with memoisation:     " + str(calls) + " calls")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"What is recursion, and what is a base case? Write a small recursive function in JavaScript — say factorial or the sum of a list — point to the base case, and tell me what happens if it is missing."

**What a strong answer should cover:**
- Recursion: a function that solves a problem by calling itself on a smaller instance of the same problem.
- The base case: the smallest input, answered directly without another call; the recursive case: reduces the problem and calls itself.
- Every call must make progress toward the base case; a missing or unreachable base case recurses until the stack overflows.
- The call stack: calls wind down to the base case, then results unwind back up; stack space is the maximum depth, time is the number of calls times the work per call.
- JavaScript specifics: a missing base case ends in \`RangeError: Maximum call stack size exceeded\`, \`slice\` in recursion copies data, and big recursive products need \`BigInt\`.

**Code / implementation expected:** Yes — a short recursive JavaScript function (factorial, sum, palindrome) with its base case, and its cost.`,
        answer: `**Target Audience:** Complete beginners preparing for coding interviews — you only need to know what a function is.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every trace, count and error message on this page comes from running the JavaScript code shown, and the **Verified** section quotes that output.

## 1. Why This Even Matters — A Story First

You are sitting in a dark cinema and want to know which row you are in. You cannot see the row numbers, so you tap the person in front of you and ask, "Which row are you in?" They do not know either, so they ask the person in front of *them*. The question travels forward, row by row, until it reaches someone in the front row. They do not need to ask anyone: they *know* they are in row 1.

Then the answers travel back. "Row 1" becomes "row 2" for the person behind, "row 3" for the next, and eventually someone tells you "row 14", so you are in row 15.

That is recursion. Everybody runs the same simple rule ("ask the person in front, then add one"), the question gets smaller each time, and there is one person who can answer without asking: the **base case**. Without the front row, the question would travel forever. Recursion is how interviewers expect you to think about trees, graphs, [backtracking](/interview-question/what-is-backtracking) and [dynamic programming](/interview-question/what-is-dynamic-programming), so getting the base case right is a skill you will use in a large share of interview problems.

## 2. The Idea in Plain Language

📌 **Interview term: Recursion** — a function that solves a problem by calling itself on a smaller version of the same problem.

📌 **Interview term: Base case** — an input small enough to answer directly, without another recursive call. It is what stops the recursion.

📌 **Interview term: Recursive case** — the part that reduces the problem and calls the function again on the smaller input, then uses that answer.

📌 **Interview term: Progress toward the base case** — every recursive call must be on an input that is strictly "closer" to a base case (a smaller n, a shorter list, a smaller subtree). If not, the recursion never ends.

The three rules of a correct recursion:

1. **Have a base case** that returns without recursing.
2. **Make the recursive call on a smaller input.**
3. **Make sure every possible input eventually reaches a base case.**

📌 **Interview term: Recursive leap of faith** — when writing the recursive case, assume the call on the smaller input already returns the right answer, and only ask "how do I build my answer from it?". For factorial: if \`factorial(n − 1)\` is right, then \`n × factorial(n − 1)\` is right.

## 3. Winding Down and Unwinding

Each call that has started but not finished waits on the **call stack** (one frame per call; the memory cost is covered on [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)). Calls go *down* until a base case answers; then the answers come *back up*, each frame finishing its multiplication.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 340" role="img" aria-label="factorial of 4 calls down to the base case then returns 1, 2, 6 and 24 back up">
  <defs>
    <marker id="b01q5-arrow-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="190" y="26" text-anchor="middle">Winding: calls go down</text>
  <text class="d-text" x="570" y="26" text-anchor="middle">Unwinding: results come up</text>
  <rect class="d-box-muted" x="90" y="48" width="200" height="44" rx="8"/>
  <text class="d-text" x="190" y="76" text-anchor="middle">factorial(4)</text>
  <path class="d-edge" d="M 190 92 L 190 116" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="90" y="120" width="200" height="44" rx="8"/>
  <text class="d-text" x="190" y="148" text-anchor="middle">factorial(3)</text>
  <path class="d-edge" d="M 190 164 L 190 188" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="90" y="192" width="200" height="44" rx="8"/>
  <text class="d-text" x="190" y="220" text-anchor="middle">factorial(2)</text>
  <path class="d-edge" d="M 190 236 L 190 260" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-accent" x="90" y="264" width="200" height="44" rx="8"/>
  <text class="d-text d-accent" x="190" y="292" text-anchor="middle">factorial(1): base case</text>
  <path class="d-edge-dashed" d="M 296 286 L 464 286" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-accent" x="470" y="264" width="200" height="44" rx="8"/>
  <text class="d-text d-accent" x="570" y="292" text-anchor="middle">returns 1</text>
  <path class="d-edge-accent" d="M 570 264 L 570 240" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="470" y="192" width="200" height="44" rx="8"/>
  <text class="d-text" x="570" y="220" text-anchor="middle">2 x 1 = 2</text>
  <path class="d-edge-accent" d="M 570 192 L 570 168" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="470" y="120" width="200" height="44" rx="8"/>
  <text class="d-text" x="570" y="148" text-anchor="middle">3 x 2 = 6</text>
  <path class="d-edge-accent" d="M 570 120 L 570 96" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="470" y="48" width="200" height="44" rx="8"/>
  <text class="d-text" x="570" y="76" text-anchor="middle">4 x 6 = 24</text>
</svg>

No multiplication happens on the way down: each frame is parked, waiting for the answer from below. All the work happens on the way back up. The first example prints exactly this, with indentation showing the depth:

~~~javascript
function factorial(n, depth = 0) {
  const pad = "  ".repeat(depth);
  console.log(pad + "call factorial(" + n + ")");
  if (n <= 1) {                                    // base case: answer known, no more calls
    console.log(pad + "return 1   <- base case");
    return 1;
  }
  const result = n * factorial(n - 1, depth + 1);  // recursive case: a smaller problem
  console.log(pad + "return " + result);
  return result;
}
~~~

📌 **Interview term: Unwinding** — the return phase, when each waiting call receives its sub-answer, finishes its own work and returns to its caller.

## 4. Five Small Recursions

Every recursive function has the same shape: check the base case(s), otherwise call on something smaller. Here are five, with the base case and the "smaller" step marked:

~~~javascript
function factorial(n) {
  if (n <= 1) return 1;            // base case (covers 0 and 1)
  return n * factorial(n - 1);     // n shrinks by 1 each call
}

function sumList(nums, i = 0) {
  if (i === nums.length) return 0; // base case: nothing left to add
  return nums[i] + sumList(nums, i + 1);   // an index, not nums.slice(1), so no copying
}

function reverseString(s, i = 0) {
  if (i === s.length) return "";   // base case: empty suffix
  return reverseString(s, i + 1) + s[i];
}

function power(base, exp) {
  if (exp === 0) return 1;         // base case: anything to the power 0 is 1
  const half = power(base, Math.floor(exp / 2));   // exp halves: about log2(exp) calls
  return exp % 2 === 0 ? half * half : half * half * base;
}

function isPalindrome(s, lo = 0, hi = s.length - 1) {
  if (lo >= hi) return true;       // base case: 0 or 1 characters left
  if (s[lo] !== s[hi]) return false;   // second base case: a mismatch settles it
  return isPalindrome(s, lo + 1, hi - 1);
}
~~~

JavaScript details in these functions:

- Default parameters (\`i = 0\`, \`hi = s.length - 1\`) let callers write \`sumList(nums)\` while the recursion passes extra state. A default can refer to earlier parameters, which is how \`isPalindrome\` sets \`hi\`.
- \`sumList\` walks with an **index** instead of recursing on \`nums.slice(1)\`, which would copy the rest of the array at every level.
- \`Math.floor(exp / 2)\` keeps the exponent a whole number; plain \`/\` would produce fractions.
- \`factorial(20)\` printed exactly only because 2,432,902,008,176,640,000 happens to be representable as a double; the next section shows \`factorial(25)\` losing precision.

Two shapes appear here:

- **Linear recursion** — one recursive call per call (\`factorial\`, \`sum\`, \`reverse\`, \`palindrome\`): n calls for an input of size n.
- **Divide and conquer** — the input is cut in half (\`power\`): only about log₂ n calls. The same idea powers [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) and [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work).

📌 **Interview term: Multiple base cases** — some recursions need more than one stopping condition, like \`is_palindrome\` (0–1 characters left, or a mismatch) and Fibonacci (\`n = 0\` and \`n = 1\`).

## 5. Base Cases That Go Wrong

There are three classic base-case bugs:

1. **Missing** — the function always calls itself (next section shows what JavaScript does).
2. **Unreachable** — the base case exists, but the steps jump over it.
3. **Wrong value** — the recursion stops, but returns the wrong thing for the smallest input (for example, \`factorial(0)\` returning 0 makes *every* factorial 0).

Bug 2 in code, with a guard so the demo can stop it:

~~~javascript
function countDownByTwo(n, visited, guard) {
  visited.push(n);
  if (visited.length > guard) return "never reached the base case";  // demo safety net
  if (n === 0) return "done";      // BUG: an odd n jumps from 1 to -1 and skips 0
  return countDownByTwo(n - 2, visited, guard);
}

function countDownByTwoFixed(n, visited) {
  visited.push(n);
  if (n <= 0) return "done";       // FIX: a range, not a single value, can always be hit
  return countDownByTwoFixed(n - 2, visited);
}
~~~

Starting from 5 and stepping by 2 gives 5, 3, 1, −1, −3, … and never equals 0. A base case written as a *range* (\`n <= 0\`) catches every value that can arrive. Rule of thumb: test your recursion by hand on the two or three smallest inputs (0, 1, 2; empty and one-element lists) before anything else.

## 6. What a Missing Base Case Does in JavaScript

Here is factorial with the base case deleted, and a reminder that recursion on numbers runs into JavaScript's number type:

~~~javascript
function factorialNoBase(n) {
  return n * factorialNoBase(n - 1);         // BUG: no base case
}
try {
  factorialNoBase(5);
} catch (e) {
  console.log(e.constructor.name + ": " + e.message);
}

function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }
function factorialBig(n) { return n <= 1n ? 1n : n * factorialBig(n - 1n); }  // BigInt
console.log("factorial(25) as a number: " + factorial(25));
console.log("factorial(25) as a BigInt: " + factorialBig(25n));
~~~

Output of \`node main.js\`:

~~~text
RangeError: Maximum call stack size exceeded
factorial(25) as a number: 1.5511210043330986e+25
factorial(25) as a BigInt: 15511210043330985984000000
~~~

Without a base case the calls never stop, and the engine throws \`RangeError: Maximum call stack size exceeded\` when its stack is full (about 10,000 frames in this Node.js 22 setup; see [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)). It can be caught, but it signals a bug.

The second part is not about the base case, but it bites recursive maths: \`factorial(25)\` as a \`number\` printed \`1.5511210043330986e+25\`, an approximation, because numbers are 64-bit floats. The \`BigInt\` version (\`25n\`, \`1n\`) is exact. Note the base case had to change type too: \`n <= 1n\`.

📌 **Interview term: Stack overflow** — the crash or error when recursion is so deep (or endless) that the call stack runs out of memory.

## 7. When Recursion Repeats Itself: Memoisation

Fibonacci has two base cases (\`fib(0) = 0\`, \`fib(1) = 1\`) and two recursive calls. That second call is a trap: \`fib(5)\` calls \`fib(4)\` and \`fib(3)\`, but \`fib(4)\` *also* calls \`fib(3)\`, and so on. The same subproblems are solved again and again, and the number of calls grows exponentially.

📌 **Interview term: Memoisation** — caching each subproblem's answer the first time it is computed, so later calls just look it up. It is the top-down form of [dynamic programming](/interview-question/what-is-dynamic-programming).

Here are both versions, from the third example:

~~~javascript
let calls = 0;

function fib(n) {                  // two base cases, two recursive calls
  calls++;
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}

function fibMemo(n, memo) {        // same recursion, each answer computed once
  calls++;
  if (n < 2) return n;
  if (!memo.has(n)) memo.set(n, fibMemo(n - 1, memo) + fibMemo(n - 2, memo));
  return memo.get(n);
}
~~~

Naive \`fib(25)\` made **242,785** calls; the memoised version made **49**: each value from 2 to 25 is computed once, and each of those computations makes two calls. The classic interview form of this is [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem).

### Recursion or a loop?

Anything recursive can be written with a loop (plus an explicit stack when the recursion branches). Choose recursion when the problem is naturally recursive — trees, nested structures, [tree traversals](/interview-question/what-are-the-tree-traversal-methods), backtracking — because the code mirrors the definition. Choose a loop when the recursion would be a long straight line (summing a long list): it uses O(1) stack instead of O(n).

## 8. Verified: Running the Code

All three programs are the runnable examples under "JavaScript code" on this page, run with \`node main.js\`.

**Example 1 — the factorial trace:**

~~~text
call factorial(4)
  call factorial(3)
    call factorial(2)
      call factorial(1)
      return 1   <- base case
    return 2
  return 6
return 24
factorial(4) = 24
~~~

Four calls go down (indentation = depth), the base case answers \`1\` with no further call, and the results come back as 2, 6 and 24.

**Example 2 — five small recursions:**

~~~text
120
1
2432902008176640000
14
0
noisrucer
1024
1
true
false
~~~

Note the base-case inputs in the list: \`factorial(0)\`, the empty list and \`power(3, 0)\` are answered entirely by the base case.

**Example 3 — base-case bugs and memoisation:**

~~~text
buggy  (n == 0), start 5: [5, 3, 1, -1, -3, -5, -7] -> never reached the base case
fixed  (n <= 0), start 5: [5, 3, 1, -1] -> done
fixed  (n <= 0), start 4: [4, 2, 0] -> done
fib(25) = 75025 with naive recursion: 242785 calls
fib(25) = 75025 with memoisation:     49 calls
~~~

The buggy version passed 0 by and was only stopped by the demo guard; the fixed version stops at −1 for odd starts and at 0 for even ones. Both Fibonacci versions return 75,025, with 242,785 calls versus 49.

## 9. Complexity of the Examples

| Function | Calls | Time | Stack space |
| :--- | :--- | :--- | :--- |
| \`factorial(n)\` | n | O(n) | O(n) |
| sum of a list of n | n + 1 | O(n) | O(n) |
| reverse a string of n | n + 1 | O(n²) — each return builds a new string | O(n) |
| \`power(b, e)\` by halving | about log₂ e | O(log e) | O(log e) |
| palindrome check of n | about n / 2 | O(n) | O(n) |
| naive \`fib(n)\` | grows like 1.618ⁿ (242,785 for n = 25) | O(2ⁿ) bound | O(n) |
| memoised \`fib(n)\` | 2n − 1 (49 for n = 25) | O(n) | O(n) stack + O(n) memo |

The general rule: **time = number of calls × work per call**, and **stack space = maximum depth**. (Fibonacci's exact growth rate is about 1.618ⁿ; O(2ⁿ) is the simple upper bound usually quoted.)

## 10. Edge Cases and Subtleties

- **The smallest inputs are the base cases.** Empty list, empty string, n = 0, a \`null\` tree node — make sure each is handled and returns the right value.
- **Negative inputs.** \`factorial(-3)\` with base case \`n <= 1\` returns 1, which is wrong but at least stops; with \`n == 1\` it would never stop. Decide whether to reject invalid inputs.
- **Very deep inputs.** Linear recursion over a large input can exhaust the stack (section 6); prefer a loop for long straight-line recursions.
- **Base case vs guard.** A base case is part of the algorithm's logic; a depth guard like the one in the demo is a debugging tool, not a fix.
- **Mutual recursion.** \`is_even(n)\` calling \`is_odd(n − 1)\` and back is still recursion, and still needs a base case (\`is_even(0) = true\`).

## Common Pitfalls

- **No base case, or one that cannot be reached.** \`n === 0\` with steps of 2 skips 0 for odd n; the demo had to stop it with a guard. Use \`n <= 0\`, and test the smallest inputs (0, 1, empty array).
- **Recursing on \`slice\` or spread.** Each call copies the remaining array; pass an index.
- **Losing precision.** Recursive products and sums pass 2^53 quickly (\`factorial(25)\` above); use \`BigInt\` when exact large integers matter.
- **Deep recursion over long arrays.** About 10,000 frames was the limit here; a recursive \`sumList\` over 100,000 items throws \`RangeError\`. Use a loop or \`reduce\`.
- **Exponential repeated work.** Naive \`fib(25)\` made 242,785 calls; a \`Map\` memo brings it to 49.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">Recursion is a function solving a problem by calling itself on a smaller version of the same problem.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The base case:</strong> <span style="color:#f0e2c8;">The base case is the input small enough to answer directly, with no further call; without one, or if it is unreachable, the recursion never stops.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The three rules:</strong> <span style="color:#f0e2c8;">A base case, a recursive case that calls on a smaller input, and every call moving closer to the base case. Then trust the recursive call to be correct for the smaller input.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. JavaScript specifics:</strong> <span style="color:#f0e2c8;">Missing base cases end in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RangeError: Maximum call stack size exceeded</code>; I recurse with indices instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slice</code>, memoise with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>, and switch to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> for big products.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">Time is calls times work per call; stack space is the maximum depth. Naive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(25)</code> made 242,785 calls, the memoised one 49.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can every recursion be written as a loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Linear recursions become a simple loop with an accumulator; branching ones need an explicit stack, usually an array with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">countDownByTwo(5)</code> with base case <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">n === 0</code> never stop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">5, 3, 1, -1: it steps over 0. The base case must cover every value the recursion can reach, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &lt;= 0</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the base case of a recursive function on a tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node === null</code>: an empty subtree has height 0, sum 0, and so on. Handling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> once removes special cases for leaves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you memoise a recursive function in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass or close over a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>; check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo.has(n)</code> before computing and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">memo.set(n, value)</code> after. Each subproblem is then computed once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does JavaScript optimise tail calls?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The spec describes proper tail calls in strict mode, but V8 does not implement them, so in Node.js and Chrome a tail-recursive function still grows the stack.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Recursion** | A function solving a problem by calling itself on a smaller version |
| **Base case** | An input answered directly, which stops the recursion |
| **Recursive case** | The part that shrinks the problem and calls itself |
| **Progress toward the base case** | Every call must be on a strictly smaller input |
| **Recursive leap of faith** | Assume the smaller call is right; build your answer from it |
| **Unwinding** | Results returning up the chain of waiting calls |
| **Multiple base cases** | More than one stopping condition, e.g. Fibonacci |
| **Stack overflow** | Running out of call-stack memory from too-deep recursion |
| **Memoisation** | Caching subproblem answers so each is computed once |
| **\`BigInt\`** | JavaScript integer type with arbitrary precision (\`25n\`) |

**Conclusion:** Recursion solves a problem by handing a smaller copy of it to the same function and building the answer from what comes back; the base case is the input small enough to answer directly, and it is what makes the whole thing stop. Get the three rules right — a base case, a smaller recursive call, and guaranteed progress toward the base case — and recursion is the clearest way to express trees, divide-and-conquer and backtracking. The runs here show both sides: a clean wind-down and unwind for \`factorial(4)\`, a base case that odd numbers skipped right over, and a Fibonacci that needed 242,785 calls until memoisation cut it to 49. In JavaScript, also know what a runaway recursion looks like, so you recognise the bug the moment you see it.`,
        examples: [
          {
            label: "Trace factorial(4): calls going down, returns coming back up",
            code: `// Watch recursion wind down to the base case and unwind back up.

function factorial(n, depth = 0) {
  const pad = "  ".repeat(depth);
  console.log(pad + "call factorial(" + n + ")");
  if (n <= 1) {                                    // base case: answer known, no more calls
    console.log(pad + "return 1   <- base case");
    return 1;
  }
  const result = n * factorial(n - 1, depth + 1);  // recursive case: a smaller problem
  console.log(pad + "return " + result);
  return result;
}

const answer = factorial(4);
console.log("factorial(4) = " + answer);`,
          },
          {
            label: "Five small recursions, each with its base case",
            code: `// Five small recursions. Each has a base case and a step toward it.

function factorial(n) {
  if (n <= 1) return 1;            // base case (covers 0 and 1)
  return n * factorial(n - 1);     // n shrinks by 1 each call
}

function sumList(nums, i = 0) {
  if (i === nums.length) return 0; // base case: nothing left to add
  return nums[i] + sumList(nums, i + 1);   // an index, not nums.slice(1), so no copying
}

function reverseString(s, i = 0) {
  if (i === s.length) return "";   // base case: empty suffix
  return reverseString(s, i + 1) + s[i];
}

function power(base, exp) {
  if (exp === 0) return 1;         // base case: anything to the power 0 is 1
  const half = power(base, Math.floor(exp / 2));   // exp halves: about log2(exp) calls
  return exp % 2 === 0 ? half * half : half * half * base;
}

function isPalindrome(s, lo = 0, hi = s.length - 1) {
  if (lo >= hi) return true;       // base case: 0 or 1 characters left
  if (s[lo] !== s[hi]) return false;   // second base case: a mismatch settles it
  return isPalindrome(s, lo + 1, hi - 1);
}

console.log(factorial(5)); // 120
console.log(factorial(0)); // 1
console.log(factorial(20)); // 2432902008176640000
console.log(sumList([3, 1, 4, 1, 5])); // 14
console.log(sumList([])); // 0
console.log(reverseString("recursion")); // noisrucer
console.log(power(2, 10)); // 1024
console.log(power(3, 0)); // 1
console.log(isPalindrome("racecar")); // true
console.log(isPalindrome("recursion")); // false`,
          },
          {
            label: "Base-case bugs, and naive vs memoised Fibonacci",
            code: `// Base cases that are wrong, and base cases that repeat work.

function countDownByTwo(n, visited, guard) {
  visited.push(n);
  if (visited.length > guard) return "never reached the base case";  // demo safety net
  if (n === 0) return "done";      // BUG: an odd n jumps from 1 to -1 and skips 0
  return countDownByTwo(n - 2, visited, guard);
}

function countDownByTwoFixed(n, visited) {
  visited.push(n);
  if (n <= 0) return "done";       // FIX: a range, not a single value, can always be hit
  return countDownByTwoFixed(n - 2, visited);
}

let calls = 0;

function fib(n) {                  // two base cases, two recursive calls
  calls++;
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}

function fibMemo(n, memo) {        // same recursion, each answer computed once
  calls++;
  if (n < 2) return n;
  if (!memo.has(n)) memo.set(n, fibMemo(n - 1, memo) + fibMemo(n - 2, memo));
  return memo.get(n);
}

function fmt(items) {
  return "[" + items.join(", ") + "]";
}

let visited = [];
let status = countDownByTwo(5, visited, 6);
console.log("buggy  (n == 0), start 5: " + fmt(visited) + " -> " + status);
visited = [];
status = countDownByTwoFixed(5, visited);
console.log("fixed  (n <= 0), start 5: " + fmt(visited) + " -> " + status);
visited = [];
status = countDownByTwoFixed(4, visited);
console.log("fixed  (n <= 0), start 4: " + fmt(visited) + " -> " + status);

calls = 0;
let value = fib(25);
console.log("fib(25) = " + value + " with naive recursion: " + calls + " calls");
calls = 0;
value = fibMemo(25, new Map());
console.log("fib(25) = " + value + " with memoisation:     " + calls + " calls");`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"What is recursion, and what is a base case? Write a small recursive function in Java — say factorial or the sum of a list — point to the base case, and tell me what happens if it is missing."

**What a strong answer should cover:**
- Recursion: a function that solves a problem by calling itself on a smaller instance of the same problem.
- The base case: the smallest input, answered directly without another call; the recursive case: reduces the problem and calls itself.
- Every call must make progress toward the base case; a missing or unreachable base case recurses until the stack overflows.
- The call stack: calls wind down to the base case, then results unwind back up; stack space is the maximum depth, time is the number of calls times the work per call.
- Java specifics: a missing base case ends in \`StackOverflowError\`, there are no default parameters (use helper overloads), and \`long\` overflows silently at 21! (use \`BigInteger\`).

**Code / implementation expected:** Yes — a short recursive Java method (factorial, sum, palindrome) with its base case, and its cost.`,
        answer: `**Target Audience:** Complete beginners preparing for coding interviews — you only need to know what a function is.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every trace, count and error message on this page comes from running the Java code shown, and the **Verified** section quotes that output.

## 1. Why This Even Matters — A Story First

You are sitting in a dark cinema and want to know which row you are in. You cannot see the row numbers, so you tap the person in front of you and ask, "Which row are you in?" They do not know either, so they ask the person in front of *them*. The question travels forward, row by row, until it reaches someone in the front row. They do not need to ask anyone: they *know* they are in row 1.

Then the answers travel back. "Row 1" becomes "row 2" for the person behind, "row 3" for the next, and eventually someone tells you "row 14", so you are in row 15.

That is recursion. Everybody runs the same simple rule ("ask the person in front, then add one"), the question gets smaller each time, and there is one person who can answer without asking: the **base case**. Without the front row, the question would travel forever. Recursion is how interviewers expect you to think about trees, graphs, [backtracking](/interview-question/what-is-backtracking) and [dynamic programming](/interview-question/what-is-dynamic-programming), so getting the base case right is a skill you will use in a large share of interview problems.

## 2. The Idea in Plain Language

📌 **Interview term: Recursion** — a function that solves a problem by calling itself on a smaller version of the same problem.

📌 **Interview term: Base case** — an input small enough to answer directly, without another recursive call. It is what stops the recursion.

📌 **Interview term: Recursive case** — the part that reduces the problem and calls the function again on the smaller input, then uses that answer.

📌 **Interview term: Progress toward the base case** — every recursive call must be on an input that is strictly "closer" to a base case (a smaller n, a shorter list, a smaller subtree). If not, the recursion never ends.

The three rules of a correct recursion:

1. **Have a base case** that returns without recursing.
2. **Make the recursive call on a smaller input.**
3. **Make sure every possible input eventually reaches a base case.**

📌 **Interview term: Recursive leap of faith** — when writing the recursive case, assume the call on the smaller input already returns the right answer, and only ask "how do I build my answer from it?". For factorial: if \`factorial(n − 1)\` is right, then \`n × factorial(n − 1)\` is right.

## 3. Winding Down and Unwinding

Each call that has started but not finished waits on the **call stack** (one frame per call; the memory cost is covered on [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)). Calls go *down* until a base case answers; then the answers come *back up*, each frame finishing its multiplication.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 340" role="img" aria-label="factorial of 4 calls down to the base case then returns 1, 2, 6 and 24 back up">
  <defs>
    <marker id="b01q5-arrow-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="190" y="26" text-anchor="middle">Winding: calls go down</text>
  <text class="d-text" x="570" y="26" text-anchor="middle">Unwinding: results come up</text>
  <rect class="d-box-muted" x="90" y="48" width="200" height="44" rx="8"/>
  <text class="d-text" x="190" y="76" text-anchor="middle">factorial(4)</text>
  <path class="d-edge" d="M 190 92 L 190 116" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="90" y="120" width="200" height="44" rx="8"/>
  <text class="d-text" x="190" y="148" text-anchor="middle">factorial(3)</text>
  <path class="d-edge" d="M 190 164 L 190 188" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="90" y="192" width="200" height="44" rx="8"/>
  <text class="d-text" x="190" y="220" text-anchor="middle">factorial(2)</text>
  <path class="d-edge" d="M 190 236 L 190 260" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-accent" x="90" y="264" width="200" height="44" rx="8"/>
  <text class="d-text d-accent" x="190" y="292" text-anchor="middle">factorial(1): base case</text>
  <path class="d-edge-dashed" d="M 296 286 L 464 286" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-accent" x="470" y="264" width="200" height="44" rx="8"/>
  <text class="d-text d-accent" x="570" y="292" text-anchor="middle">returns 1</text>
  <path class="d-edge-accent" d="M 570 264 L 570 240" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="470" y="192" width="200" height="44" rx="8"/>
  <text class="d-text" x="570" y="220" text-anchor="middle">2 x 1 = 2</text>
  <path class="d-edge-accent" d="M 570 192 L 570 168" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="470" y="120" width="200" height="44" rx="8"/>
  <text class="d-text" x="570" y="148" text-anchor="middle">3 x 2 = 6</text>
  <path class="d-edge-accent" d="M 570 120 L 570 96" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="470" y="48" width="200" height="44" rx="8"/>
  <text class="d-text" x="570" y="76" text-anchor="middle">4 x 6 = 24</text>
</svg>

No multiplication happens on the way down: each frame is parked, waiting for the answer from below. All the work happens on the way back up. The first example prints exactly this, with indentation showing the depth:

~~~java
static long factorial(int n, int depth) {
    String pad = "  ".repeat(depth);                 // String.repeat: Java 11+
    System.out.println(pad + "call factorial(" + n + ")");
    if (n <= 1) {                                    // base case: answer known, no more calls
        System.out.println(pad + "return 1   <- base case");
        return 1;
    }
    long result = n * factorial(n - 1, depth + 1);   // recursive case: a smaller problem
    System.out.println(pad + "return " + result);
    return result;
}
~~~

📌 **Interview term: Unwinding** — the return phase, when each waiting call receives its sub-answer, finishes its own work and returns to its caller.

## 4. Five Small Recursions

Every recursive function has the same shape: check the base case(s), otherwise call on something smaller. Here are five, with the base case and the "smaller" step marked:

~~~java
static long factorial(int n) {
    if (n <= 1) return 1;                // base case (covers 0 and 1)
    return n * factorial(n - 1);         // n shrinks by 1 each call; long holds up to 20!
}

static int sumList(int[] nums, int i) {
    if (i == nums.length) return 0;      // base case: nothing left to add
    return nums[i] + sumList(nums, i + 1);
}

static String reverseString(String s, int i) {
    if (i == s.length()) return "";      // base case: empty suffix
    return reverseString(s, i + 1) + s.charAt(i);
}

static long power(long base, int exp) {
    if (exp == 0) return 1;              // base case: anything to the power 0 is 1
    long half = power(base, exp / 2);    // exp halves: about log2(exp) calls
    return exp % 2 == 0 ? half * half : half * half * base;
}

static boolean isPalindrome(String s, int lo, int hi) {
    if (lo >= hi) return true;           // base case: 0 or 1 characters left
    if (s.charAt(lo) != s.charAt(hi)) return false;   // a mismatch settles it
    return isPalindrome(s, lo + 1, hi - 1);
}
~~~

Java details in these methods:

- Java has no default parameters, so the recursive state (\`i\`, \`lo\`, \`hi\`) is passed explicitly; in real code you would add a public overload such as \`sumList(int[] nums)\` that calls \`sumList(nums, 0)\`.
- \`factorial\` returns \`long\`: 20! = 2,432,902,008,176,640,000 is the largest factorial that fits; 21! overflows silently (shown in the next section).
- \`reverseString\` builds a new \`String\` with \`+\` on every return, so it is O(n²) in total; a \`StringBuilder\` is the efficient choice, but the recursion is what is being shown here.
- \`exp / 2\` on an \`int\` is integer division, so \`power\` makes only about log₂(exp) calls.

Two shapes appear here:

- **Linear recursion** — one recursive call per call (\`factorial\`, \`sum\`, \`reverse\`, \`palindrome\`): n calls for an input of size n.
- **Divide and conquer** — the input is cut in half (\`power\`): only about log₂ n calls. The same idea powers [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) and [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work).

📌 **Interview term: Multiple base cases** — some recursions need more than one stopping condition, like \`is_palindrome\` (0–1 characters left, or a mismatch) and Fibonacci (\`n = 0\` and \`n = 1\`).

## 5. Base Cases That Go Wrong

There are three classic base-case bugs:

1. **Missing** — the function always calls itself (next section shows what Java does).
2. **Unreachable** — the base case exists, but the steps jump over it.
3. **Wrong value** — the recursion stops, but returns the wrong thing for the smallest input (for example, \`factorial(0)\` returning 0 makes *every* factorial 0).

Bug 2 in code, with a guard so the demo can stop it:

~~~java
static String countDownByTwo(int n, List<Integer> visited, int guard) {
    visited.add(n);
    if (visited.size() > guard) return "never reached the base case";  // demo safety net
    if (n == 0) return "done";     // BUG: an odd n jumps from 1 to -1 and skips 0
    return countDownByTwo(n - 2, visited, guard);
}

static String countDownByTwoFixed(int n, List<Integer> visited) {
    visited.add(n);
    if (n <= 0) return "done";     // FIX: a range, not a single value, can always be hit
    return countDownByTwoFixed(n - 2, visited);
}
~~~

Starting from 5 and stepping by 2 gives 5, 3, 1, −1, −3, … and never equals 0. A base case written as a *range* (\`n <= 0\`) catches every value that can arrive. Rule of thumb: test your recursion by hand on the two or three smallest inputs (0, 1, 2; empty and one-element lists) before anything else.

## 6. What a Missing Base Case Does in Java

Here is factorial with the base case deleted, and the overflow that a correct base case does not protect you from:

~~~java
import java.math.BigInteger;

public class Main {
    static long factorialNoBase(long n) {
        return n * factorialNoBase(n - 1);   // BUG: no base case
    }

    static long factorial(int n) { return n <= 1 ? 1 : n * factorial(n - 1); }

    static BigInteger factorialBig(int n) {
        return n <= 1 ? BigInteger.ONE : BigInteger.valueOf(n).multiply(factorialBig(n - 1));
    }

    public static void main(String[] args) {
        try {
            factorialNoBase(5);
        } catch (StackOverflowError e) {
            System.out.println("caught " + e.getClass().getName());
        }
        System.out.println("factorial(20) as long:   " + factorial(20));
        System.out.println("factorial(21) as long:   " + factorial(21) + "   (overflowed silently)");
        System.out.println("factorial(21) as BigInteger: " + factorialBig(21));
    }
}
~~~

Output of \`javac Main.java && java Main\`:

~~~text
caught java.lang.StackOverflowError
factorial(20) as long:   2432902008176640000
factorial(21) as long:   -4249290049419214848   (overflowed silently)
factorial(21) as BigInteger: 51090942171709440000
~~~

Without a base case the calls never stop, and the JVM throws \`java.lang.StackOverflowError\` when the thread stack is full (see [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) for the depth limits). It is an \`Error\`, not an \`Exception\`: catching it is possible, as here, but it means the code is wrong.

The second part: \`factorial(21)\` returned \`-4249290049419214848\`. The base case was fine; the \`long\` overflowed and wrapped around without any error. \`BigInteger\` gives the exact 51,090,942,171,709,440,000, and \`Math.multiplyExact\` would throw \`ArithmeticException\` on overflow instead of wrapping.

📌 **Interview term: Stack overflow** — the crash or error when recursion is so deep (or endless) that the call stack runs out of memory.

## 7. When Recursion Repeats Itself: Memoisation

Fibonacci has two base cases (\`fib(0) = 0\`, \`fib(1) = 1\`) and two recursive calls. That second call is a trap: \`fib(5)\` calls \`fib(4)\` and \`fib(3)\`, but \`fib(4)\` *also* calls \`fib(3)\`, and so on. The same subproblems are solved again and again, and the number of calls grows exponentially.

📌 **Interview term: Memoisation** — caching each subproblem's answer the first time it is computed, so later calls just look it up. It is the top-down form of [dynamic programming](/interview-question/what-is-dynamic-programming).

Here are both versions, from the third example:

~~~java
static long calls = 0;

static int fib(int n) {            // two base cases, two recursive calls
    calls++;
    if (n < 2) return n;
    return fib(n - 1) + fib(n - 2);
}

static int fibMemo(int n, Map<Integer, Integer> memo) {   // each answer computed once
    calls++;
    if (n < 2) return n;
    Integer cached = memo.get(n);
    if (cached != null) return cached;
    int value = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
    memo.put(n, value);
    return value;
}
~~~

Naive \`fib(25)\` made **242,785** calls; the memoised version made **49**: each value from 2 to 25 is computed once, and each of those computations makes two calls. The classic interview form of this is [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem).

### Recursion or a loop?

Anything recursive can be written with a loop (plus an explicit stack when the recursion branches). Choose recursion when the problem is naturally recursive — trees, nested structures, [tree traversals](/interview-question/what-are-the-tree-traversal-methods), backtracking — because the code mirrors the definition. Choose a loop when the recursion would be a long straight line (summing a long list): it uses O(1) stack instead of O(n).

## 8. Verified: Running the Code

All three programs are the runnable examples under "Java code" on this page, run with \`javac Main.java && java Main\`.

**Example 1 — the factorial trace:**

~~~text
call factorial(4)
  call factorial(3)
    call factorial(2)
      call factorial(1)
      return 1   <- base case
    return 2
  return 6
return 24
factorial(4) = 24
~~~

Four calls go down (indentation = depth), the base case answers \`1\` with no further call, and the results come back as 2, 6 and 24.

**Example 2 — five small recursions:**

~~~text
120
1
2432902008176640000
14
0
noisrucer
1024
1
true
false
~~~

Note the base-case inputs in the list: \`factorial(0)\`, the empty list and \`power(3, 0)\` are answered entirely by the base case.

**Example 3 — base-case bugs and memoisation:**

~~~text
buggy  (n == 0), start 5: [5, 3, 1, -1, -3, -5, -7] -> never reached the base case
fixed  (n <= 0), start 5: [5, 3, 1, -1] -> done
fixed  (n <= 0), start 4: [4, 2, 0] -> done
fib(25) = 75025 with naive recursion: 242785 calls
fib(25) = 75025 with memoisation:     49 calls
~~~

The buggy version passed 0 by and was only stopped by the demo guard; the fixed version stops at −1 for odd starts and at 0 for even ones. Both Fibonacci versions return 75,025, with 242,785 calls versus 49.

## 9. Complexity of the Examples

| Function | Calls | Time | Stack space |
| :--- | :--- | :--- | :--- |
| \`factorial(n)\` | n | O(n) | O(n) |
| sum of a list of n | n + 1 | O(n) | O(n) |
| reverse a string of n | n + 1 | O(n²) — each return builds a new string | O(n) |
| \`power(b, e)\` by halving | about log₂ e | O(log e) | O(log e) |
| palindrome check of n | about n / 2 | O(n) | O(n) |
| naive \`fib(n)\` | grows like 1.618ⁿ (242,785 for n = 25) | O(2ⁿ) bound | O(n) |
| memoised \`fib(n)\` | 2n − 1 (49 for n = 25) | O(n) | O(n) stack + O(n) memo |

The general rule: **time = number of calls × work per call**, and **stack space = maximum depth**. (Fibonacci's exact growth rate is about 1.618ⁿ; O(2ⁿ) is the simple upper bound usually quoted.)

## 10. Edge Cases and Subtleties

- **The smallest inputs are the base cases.** Empty list, empty string, n = 0, a \`null\` tree node — make sure each is handled and returns the right value.
- **Negative inputs.** \`factorial(-3)\` with base case \`n <= 1\` returns 1, which is wrong but at least stops; with \`n == 1\` it would never stop. Decide whether to reject invalid inputs.
- **Very deep inputs.** Linear recursion over a large input can exhaust the stack (section 6); prefer a loop for long straight-line recursions.
- **Base case vs guard.** A base case is part of the algorithm's logic; a depth guard like the one in the demo is a debugging tool, not a fix.
- **Mutual recursion.** \`is_even(n)\` calling \`is_odd(n − 1)\` and back is still recursion, and still needs a base case (\`is_even(0) = true\`).

## Common Pitfalls

- **No base case, or one that cannot be reached.** \`n == 0\` with steps of 2 skips 0 for odd n; the demo had to stop it with a guard. Use \`n <= 0\`, and test the smallest inputs (0, 1, empty array).
- **Silent overflow.** \`factorial(21)\` as \`long\` printed a negative number; use \`BigInteger\` or \`Math.multiplyExact\`.
- **Boxing in the memo.** \`Map<Integer, Integer>\` boxes keys and values; for dense integer keys an \`int[]\` or \`long[]\` memo is lighter and avoids the \`==\` on \`Integer\` trap.
- **Deep recursion on the main thread.** A linear recursion over a long array throws \`StackOverflowError\` after some tens of thousands of frames; use a loop.
- **Exponential repeated work.** Naive \`fib(25)\` made 242,785 calls; a memo brings it to 49.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">Recursion is a method solving a problem by calling itself on a smaller version of the same problem.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The base case:</strong> <span style="color:#f0e2c8;">The base case is the input small enough to answer directly, with no further call; without one, or if it is unreachable, the recursion never stops.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The three rules:</strong> <span style="color:#f0e2c8;">A base case, a recursive case that calls on a smaller input, and every call moving closer to the base case. Then trust the recursive call to be correct for the smaller input.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Java specifics:</strong> <span style="color:#f0e2c8;">Missing base cases end in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StackOverflowError</code>; there are no default parameters, so I add a helper overload; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> overflows silently at 21!, so I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInteger</code> when needed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">Time is calls times work per call; stack space is the maximum depth. Naive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(25)</code> made 242,785 calls, the memoised one 49.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can every recursion be written as a loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Linear recursions become a loop with an accumulator; branching ones need an explicit stack, usually an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">countDownByTwo(5)</code> with base case <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">n == 0</code> never stop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">5, 3, 1, -1: it steps over 0. The base case must cover every value the recursion can reach, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &lt;= 0</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the base case of a recursive method on a binary tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node == null</code>: an empty subtree has height 0, sum 0, and so on. Handling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> once removes special cases for leaves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should you catch <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">StackOverflowError</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not as a fix. It is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Error</code> that signals the recursion is too deep or never ends; rewrite with a loop or explicit stack instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you memoise in Java?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Integer, Integer&gt;</code> (check with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> test, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put</code>) or, for small dense keys, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long[]</code> array. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">computeIfAbsent</code> with a recursive function is risky because it must not modify the map from inside the mapping function.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Recursion** | A function solving a problem by calling itself on a smaller version |
| **Base case** | An input answered directly, which stops the recursion |
| **Recursive case** | The part that shrinks the problem and calls itself |
| **Progress toward the base case** | Every call must be on a strictly smaller input |
| **Recursive leap of faith** | Assume the smaller call is right; build your answer from it |
| **Unwinding** | Results returning up the chain of waiting calls |
| **Multiple base cases** | More than one stopping condition, e.g. Fibonacci |
| **Stack overflow** | Running out of call-stack memory from too-deep recursion |
| **Memoisation** | Caching subproblem answers so each is computed once |
| **\`StackOverflowError\`** | The JVM error thrown when recursion exhausts the thread stack |

**Conclusion:** Recursion solves a problem by handing a smaller copy of it to the same function and building the answer from what comes back; the base case is the input small enough to answer directly, and it is what makes the whole thing stop. Get the three rules right — a base case, a smaller recursive call, and guaranteed progress toward the base case — and recursion is the clearest way to express trees, divide-and-conquer and backtracking. The runs here show both sides: a clean wind-down and unwind for \`factorial(4)\`, a base case that odd numbers skipped right over, and a Fibonacci that needed 242,785 calls until memoisation cut it to 49. In Java, also know what a runaway recursion looks like, so you recognise the bug the moment you see it.`,
        examples: [
          {
            label: "Trace factorial(4): calls going down, returns coming back up",
            code: `public class Main {
    // Watch recursion wind down to the base case and unwind back up.

    static long factorial(int n, int depth) {
        String pad = "  ".repeat(depth);                 // String.repeat: Java 11+
        System.out.println(pad + "call factorial(" + n + ")");
        if (n <= 1) {                                    // base case: answer known, no more calls
            System.out.println(pad + "return 1   <- base case");
            return 1;
        }
        long result = n * factorial(n - 1, depth + 1);   // recursive case: a smaller problem
        System.out.println(pad + "return " + result);
        return result;
    }

    public static void main(String[] args) {
        long answer = factorial(4, 0);
        System.out.println("factorial(4) = " + answer);
    }
}`,
          },
          {
            label: "Five small recursions, each with its base case",
            code: `public class Main {
    // Five small recursions. Each has a base case and a step toward it.

    static long factorial(int n) {
        if (n <= 1) return 1;                // base case (covers 0 and 1)
        return n * factorial(n - 1);         // n shrinks by 1 each call; long holds up to 20!
    }

    static int sumList(int[] nums, int i) {
        if (i == nums.length) return 0;      // base case: nothing left to add
        return nums[i] + sumList(nums, i + 1);
    }

    static String reverseString(String s, int i) {
        if (i == s.length()) return "";      // base case: empty suffix
        return reverseString(s, i + 1) + s.charAt(i);
    }

    static long power(long base, int exp) {
        if (exp == 0) return 1;              // base case: anything to the power 0 is 1
        long half = power(base, exp / 2);    // exp halves: about log2(exp) calls
        return exp % 2 == 0 ? half * half : half * half * base;
    }

    static boolean isPalindrome(String s, int lo, int hi) {
        if (lo >= hi) return true;           // base case: 0 or 1 characters left
        if (s.charAt(lo) != s.charAt(hi)) return false;   // a mismatch settles it
        return isPalindrome(s, lo + 1, hi - 1);
    }

    public static void main(String[] args) {
        System.out.println(factorial(5));                       // 120
        System.out.println(factorial(0));                       // 1
        System.out.println(factorial(20));                      // 2432902008176640000
        System.out.println(sumList(new int[]{3, 1, 4, 1, 5}, 0)); // 14
        System.out.println(sumList(new int[]{}, 0));            // 0
        System.out.println(reverseString("recursion", 0));      // noisrucer
        System.out.println(power(2, 10));                       // 1024
        System.out.println(power(3, 0));                        // 1
        System.out.println(isPalindrome("racecar", 0, 6));      // true
        System.out.println(isPalindrome("recursion", 0, 8));    // false
    }
}`,
          },
          {
            label: "Base-case bugs, and naive vs memoised Fibonacci",
            code: `import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Main {
    // Base cases that are wrong, and base cases that repeat work.

    static String countDownByTwo(int n, List<Integer> visited, int guard) {
        visited.add(n);
        if (visited.size() > guard) return "never reached the base case";  // demo safety net
        if (n == 0) return "done";     // BUG: an odd n jumps from 1 to -1 and skips 0
        return countDownByTwo(n - 2, visited, guard);
    }

    static String countDownByTwoFixed(int n, List<Integer> visited) {
        visited.add(n);
        if (n <= 0) return "done";     // FIX: a range, not a single value, can always be hit
        return countDownByTwoFixed(n - 2, visited);
    }

    static long calls = 0;

    static int fib(int n) {            // two base cases, two recursive calls
        calls++;
        if (n < 2) return n;
        return fib(n - 1) + fib(n - 2);
    }

    static int fibMemo(int n, Map<Integer, Integer> memo) {   // each answer computed once
        calls++;
        if (n < 2) return n;
        Integer cached = memo.get(n);
        if (cached != null) return cached;
        int value = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
        memo.put(n, value);
        return value;
    }

    static String fmt(List<Integer> items) {
        StringBuilder sb = new StringBuilder("[");
        for (int k = 0; k < items.size(); k++) sb.append(k > 0 ? ", " : "").append(items.get(k));
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        List<Integer> visited = new ArrayList<>();
        String status = countDownByTwo(5, visited, 6);
        System.out.println("buggy  (n == 0), start 5: " + fmt(visited) + " -> " + status);
        visited = new ArrayList<>();
        status = countDownByTwoFixed(5, visited);
        System.out.println("fixed  (n <= 0), start 5: " + fmt(visited) + " -> " + status);
        visited = new ArrayList<>();
        status = countDownByTwoFixed(4, visited);
        System.out.println("fixed  (n <= 0), start 4: " + fmt(visited) + " -> " + status);

        calls = 0;
        int value = fib(25);
        System.out.println("fib(25) = " + value + " with naive recursion: " + calls + " calls");
        calls = 0;
        value = fibMemo(25, new HashMap<>());
        System.out.println("fib(25) = " + value + " with memoisation:     " + calls + " calls");
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"What is recursion, and what is a base case? Write a small recursive function in C++ — say factorial or the sum of a list — point to the base case, and tell me what happens if it is missing."

**What a strong answer should cover:**
- Recursion: a function that solves a problem by calling itself on a smaller instance of the same problem.
- The base case: the smallest input, answered directly without another call; the recursive case: reduces the problem and calls itself.
- Every call must make progress toward the base case; a missing or unreachable base case recurses until the stack overflows.
- The call stack: calls wind down to the base case, then results unwind back up; stack space is the maximum depth, time is the number of calls times the work per call.
- C++ specifics: a missing base case is a stack-overflow crash (\`SIGSEGV\`), not an exception; \`-Wall\` warns about infinite recursion; pass containers by \`const&\`; signed overflow past 20! is undefined behaviour.

**Code / implementation expected:** Yes — a short recursive C++ function (factorial, sum, palindrome) with its base case, and its cost.`,
        answer: `**Target Audience:** Complete beginners preparing for coding interviews — you only need to know what a function is.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain words first, then tagged with \`📌 Interview term:\` so you also learn the exact vocabulary an interviewer expects. Every trace, count and error message on this page comes from running the C++ code shown, and the **Verified** section quotes that output.

## 1. Why This Even Matters — A Story First

You are sitting in a dark cinema and want to know which row you are in. You cannot see the row numbers, so you tap the person in front of you and ask, "Which row are you in?" They do not know either, so they ask the person in front of *them*. The question travels forward, row by row, until it reaches someone in the front row. They do not need to ask anyone: they *know* they are in row 1.

Then the answers travel back. "Row 1" becomes "row 2" for the person behind, "row 3" for the next, and eventually someone tells you "row 14", so you are in row 15.

That is recursion. Everybody runs the same simple rule ("ask the person in front, then add one"), the question gets smaller each time, and there is one person who can answer without asking: the **base case**. Without the front row, the question would travel forever. Recursion is how interviewers expect you to think about trees, graphs, [backtracking](/interview-question/what-is-backtracking) and [dynamic programming](/interview-question/what-is-dynamic-programming), so getting the base case right is a skill you will use in a large share of interview problems.

## 2. The Idea in Plain Language

📌 **Interview term: Recursion** — a function that solves a problem by calling itself on a smaller version of the same problem.

📌 **Interview term: Base case** — an input small enough to answer directly, without another recursive call. It is what stops the recursion.

📌 **Interview term: Recursive case** — the part that reduces the problem and calls the function again on the smaller input, then uses that answer.

📌 **Interview term: Progress toward the base case** — every recursive call must be on an input that is strictly "closer" to a base case (a smaller n, a shorter list, a smaller subtree). If not, the recursion never ends.

The three rules of a correct recursion:

1. **Have a base case** that returns without recursing.
2. **Make the recursive call on a smaller input.**
3. **Make sure every possible input eventually reaches a base case.**

📌 **Interview term: Recursive leap of faith** — when writing the recursive case, assume the call on the smaller input already returns the right answer, and only ask "how do I build my answer from it?". For factorial: if \`factorial(n − 1)\` is right, then \`n × factorial(n − 1)\` is right.

## 3. Winding Down and Unwinding

Each call that has started but not finished waits on the **call stack** (one frame per call; the memory cost is covered on [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)). Calls go *down* until a base case answers; then the answers come *back up*, each frame finishing its multiplication.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 340" role="img" aria-label="factorial of 4 calls down to the base case then returns 1, 2, 6 and 24 back up">
  <defs>
    <marker id="b01q5-arrow-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="190" y="26" text-anchor="middle">Winding: calls go down</text>
  <text class="d-text" x="570" y="26" text-anchor="middle">Unwinding: results come up</text>
  <rect class="d-box-muted" x="90" y="48" width="200" height="44" rx="8"/>
  <text class="d-text" x="190" y="76" text-anchor="middle">factorial(4)</text>
  <path class="d-edge" d="M 190 92 L 190 116" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="90" y="120" width="200" height="44" rx="8"/>
  <text class="d-text" x="190" y="148" text-anchor="middle">factorial(3)</text>
  <path class="d-edge" d="M 190 164 L 190 188" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="90" y="192" width="200" height="44" rx="8"/>
  <text class="d-text" x="190" y="220" text-anchor="middle">factorial(2)</text>
  <path class="d-edge" d="M 190 236 L 190 260" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-accent" x="90" y="264" width="200" height="44" rx="8"/>
  <text class="d-text d-accent" x="190" y="292" text-anchor="middle">factorial(1): base case</text>
  <path class="d-edge-dashed" d="M 296 286 L 464 286" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-accent" x="470" y="264" width="200" height="44" rx="8"/>
  <text class="d-text d-accent" x="570" y="292" text-anchor="middle">returns 1</text>
  <path class="d-edge-accent" d="M 570 264 L 570 240" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="470" y="192" width="200" height="44" rx="8"/>
  <text class="d-text" x="570" y="220" text-anchor="middle">2 x 1 = 2</text>
  <path class="d-edge-accent" d="M 570 192 L 570 168" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="470" y="120" width="200" height="44" rx="8"/>
  <text class="d-text" x="570" y="148" text-anchor="middle">3 x 2 = 6</text>
  <path class="d-edge-accent" d="M 570 120 L 570 96" marker-end="url(#b01q5-arrow-a)"/>
  <rect class="d-box-muted" x="470" y="48" width="200" height="44" rx="8"/>
  <text class="d-text" x="570" y="76" text-anchor="middle">4 x 6 = 24</text>
</svg>

No multiplication happens on the way down: each frame is parked, waiting for the answer from below. All the work happens on the way back up. The first example prints exactly this, with indentation showing the depth:

~~~cpp
long long factorial(int n, int depth = 0) {
    string pad(2 * depth, ' ');
    cout << pad << "call factorial(" << n << ")\\n";
    if (n <= 1) {                                       // base case: answer known, no more calls
        cout << pad << "return 1   <- base case\\n";
        return 1;
    }
    long long result = n * factorial(n - 1, depth + 1); // recursive case: a smaller problem
    cout << pad << "return " << result << "\\n";
    return result;
}
~~~

📌 **Interview term: Unwinding** — the return phase, when each waiting call receives its sub-answer, finishes its own work and returns to its caller.

## 4. Five Small Recursions

Every recursive function has the same shape: check the base case(s), otherwise call on something smaller. Here are five, with the base case and the "smaller" step marked:

~~~cpp
long long factorial(int n) {
    if (n <= 1) return 1;                    // base case (covers 0 and 1)
    return n * factorial(n - 1);             // n shrinks by 1; long long holds up to 20!
}

int sumList(const vector<int>& nums, size_t i = 0) {   // const& : no copy per call
    if (i == nums.size()) return 0;          // base case: nothing left to add
    return nums[i] + sumList(nums, i + 1);
}

string reverseString(const string& s, size_t i = 0) {
    if (i == s.size()) return "";            // base case: empty suffix
    return reverseString(s, i + 1) + s[i];
}

long long power(long long base, int exp) {
    if (exp == 0) return 1;                  // base case: anything to the power 0 is 1
    long long half = power(base, exp / 2);   // exp halves: about log2(exp) calls
    return exp % 2 == 0 ? half * half : half * half * base;
}

bool isPalindrome(const string& s, int lo, int hi) {
    if (lo >= hi) return true;               // base case: 0 or 1 characters left
    if (s[lo] != s[hi]) return false;        // second base case: a mismatch settles it
    return isPalindrome(s, lo + 1, hi - 1);
}
~~~

C++ details in these functions:

- Default arguments (\`size_t i = 0\`) let callers write \`sumList(nums)\`; they are written in the declaration.
- Containers and strings are passed by **\`const&\`**. Passing a \`std::vector\` by value would copy it on every call, turning an O(n) recursion into O(n²).
- \`factorial\` returns \`long long\`: 20! is the largest factorial that fits in 64 bits. Going past it is **signed overflow, which is undefined behaviour** in C++, not a predictable wrap-around, so the program does not print it.
- \`reverseString\` creates a new \`std::string\` on every return (O(n²) total); building into one string by reference would be O(n), but the recursion is the point here.

Two shapes appear here:

- **Linear recursion** — one recursive call per call (\`factorial\`, \`sum\`, \`reverse\`, \`palindrome\`): n calls for an input of size n.
- **Divide and conquer** — the input is cut in half (\`power\`): only about log₂ n calls. The same idea powers [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) and [merge sort](/interview-question/how-do-merge-sort-and-quicksort-work).

📌 **Interview term: Multiple base cases** — some recursions need more than one stopping condition, like \`is_palindrome\` (0–1 characters left, or a mismatch) and Fibonacci (\`n = 0\` and \`n = 1\`).

## 5. Base Cases That Go Wrong

There are three classic base-case bugs:

1. **Missing** — the function always calls itself (next section shows what C++ does).
2. **Unreachable** — the base case exists, but the steps jump over it.
3. **Wrong value** — the recursion stops, but returns the wrong thing for the smallest input (for example, \`factorial(0)\` returning 0 makes *every* factorial 0).

Bug 2 in code, with a guard so the demo can stop it:

~~~cpp
string countDownByTwo(int n, vector<int>& visited, size_t guard) {
    visited.push_back(n);
    if (visited.size() > guard) return "never reached the base case";  // demo safety net
    if (n == 0) return "done";         // BUG: an odd n jumps from 1 to -1 and skips 0
    return countDownByTwo(n - 2, visited, guard);
}

string countDownByTwoFixed(int n, vector<int>& visited) {
    visited.push_back(n);
    if (n <= 0) return "done";         // FIX: a range, not a single value, can always be hit
    return countDownByTwoFixed(n - 2, visited);
}
~~~

Starting from 5 and stepping by 2 gives 5, 3, 1, −1, −3, … and never equals 0. A base case written as a *range* (\`n <= 0\`) catches every value that can arrive. Rule of thumb: test your recursion by hand on the two or three smallest inputs (0, 1, 2; empty and one-element lists) before anything else.

## 6. What a Missing Base Case Does in C++

Here is factorial with the base case deleted. The compiler can sometimes spot this; the program cannot recover from it:

~~~cpp
#include <iostream>

long long factorial(long long n) {
    return n * factorial(n - 1);          // BUG: no base case
}

int main() {
    std::cout << factorial(5) << "\\n";
}
~~~

Output of the build-and-run steps (each command is shown after a \`$\`):

~~~text
$ g++ -std=c++17 -Wall -O0 main.cpp -o main
main.cpp: In function ‘long long int factorial(long long int)’:
main.cpp:3:11: warning: infinite recursion detected [-Winfinite-recursion]
    3 | long long factorial(long long n) {
      |           ^~~~~~~~~
main.cpp:4:25: note: recursive call
    4 |     return n * factorial(n - 1);          // BUG: no base case
      |                ~~~~~~~~~^~~~~~~
$ ./main
exit status: 139
~~~

GCC 13 warned at compile time: \`-Wall\` includes \`-Winfinite-recursion\`, which detected that every path through \`factorial\` calls itself. Compile with \`-Wall\` and read warnings.

Running it anyway, the calls never stopped, the stack overflowed and the process was killed with exit status **139** (128 + signal 11, \`SIGSEGV\`). There is no exception to catch, and formally it is undefined behaviour (see [space complexity and recursion stack space](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) for the stack limits).

📌 **Interview term: Stack overflow** — the crash or error when recursion is so deep (or endless) that the call stack runs out of memory.

## 7. When Recursion Repeats Itself: Memoisation

Fibonacci has two base cases (\`fib(0) = 0\`, \`fib(1) = 1\`) and two recursive calls. That second call is a trap: \`fib(5)\` calls \`fib(4)\` and \`fib(3)\`, but \`fib(4)\` *also* calls \`fib(3)\`, and so on. The same subproblems are solved again and again, and the number of calls grows exponentially.

📌 **Interview term: Memoisation** — caching each subproblem's answer the first time it is computed, so later calls just look it up. It is the top-down form of [dynamic programming](/interview-question/what-is-dynamic-programming).

Here are both versions, from the third example:

~~~cpp
long long calls = 0;

int fib(int n) {                       // two base cases, two recursive calls
    calls++;
    if (n < 2) return n;
    return fib(n - 1) + fib(n - 2);
}

int fibMemo(int n, unordered_map<int, int>& memo) {   // each answer computed once
    calls++;
    if (n < 2) return n;
    auto it = memo.find(n);            // find, not memo[n]: operator[] would insert a 0
    if (it != memo.end()) return it->second;
    int value = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
    memo[n] = value;
    return value;
}
~~~

Naive \`fib(25)\` made **242,785** calls; the memoised version made **49**: each value from 2 to 25 is computed once, and each of those computations makes two calls. The classic interview form of this is [climbing stairs](/interview-question/how-do-you-solve-the-climbing-stairs-problem).

### Recursion or a loop?

Anything recursive can be written with a loop (plus an explicit stack when the recursion branches). Choose recursion when the problem is naturally recursive — trees, nested structures, [tree traversals](/interview-question/what-are-the-tree-traversal-methods), backtracking — because the code mirrors the definition. Choose a loop when the recursion would be a long straight line (summing a long list): it uses O(1) stack instead of O(n).

## 8. Verified: Running the Code

All three programs are the runnable examples under "C++ code" on this page, run with \`g++ -std=c++17 main.cpp && ./a.out\`.

**Example 1 — the factorial trace:**

~~~text
call factorial(4)
  call factorial(3)
    call factorial(2)
      call factorial(1)
      return 1   <- base case
    return 2
  return 6
return 24
factorial(4) = 24
~~~

Four calls go down (indentation = depth), the base case answers \`1\` with no further call, and the results come back as 2, 6 and 24.

**Example 2 — five small recursions:**

~~~text
120
1
2432902008176640000
14
0
noisrucer
1024
1
true
false
~~~

Note the base-case inputs in the list: \`factorial(0)\`, the empty list and \`power(3, 0)\` are answered entirely by the base case.

**Example 3 — base-case bugs and memoisation:**

~~~text
buggy  (n == 0), start 5: [5, 3, 1, -1, -3, -5, -7] -> never reached the base case
fixed  (n <= 0), start 5: [5, 3, 1, -1] -> done
fixed  (n <= 0), start 4: [4, 2, 0] -> done
fib(25) = 75025 with naive recursion: 242785 calls
fib(25) = 75025 with memoisation:     49 calls
~~~

The buggy version passed 0 by and was only stopped by the demo guard; the fixed version stops at −1 for odd starts and at 0 for even ones. Both Fibonacci versions return 75,025, with 242,785 calls versus 49.

## 9. Complexity of the Examples

| Function | Calls | Time | Stack space |
| :--- | :--- | :--- | :--- |
| \`factorial(n)\` | n | O(n) | O(n) |
| sum of a list of n | n + 1 | O(n) | O(n) |
| reverse a string of n | n + 1 | O(n²) — each return builds a new string | O(n) |
| \`power(b, e)\` by halving | about log₂ e | O(log e) | O(log e) |
| palindrome check of n | about n / 2 | O(n) | O(n) |
| naive \`fib(n)\` | grows like 1.618ⁿ (242,785 for n = 25) | O(2ⁿ) bound | O(n) |
| memoised \`fib(n)\` | 2n − 1 (49 for n = 25) | O(n) | O(n) stack + O(n) memo |

The general rule: **time = number of calls × work per call**, and **stack space = maximum depth**. (Fibonacci's exact growth rate is about 1.618ⁿ; O(2ⁿ) is the simple upper bound usually quoted.)

## 10. Edge Cases and Subtleties

- **The smallest inputs are the base cases.** Empty list, empty string, n = 0, a \`null\` tree node — make sure each is handled and returns the right value.
- **Negative inputs.** \`factorial(-3)\` with base case \`n <= 1\` returns 1, which is wrong but at least stops; with \`n == 1\` it would never stop. Decide whether to reject invalid inputs.
- **Very deep inputs.** Linear recursion over a large input can exhaust the stack (section 6); prefer a loop for long straight-line recursions.
- **Base case vs guard.** A base case is part of the algorithm's logic; a depth guard like the one in the demo is a debugging tool, not a fix.
- **Mutual recursion.** \`is_even(n)\` calling \`is_odd(n − 1)\` and back is still recursion, and still needs a base case (\`is_even(0) = true\`).

## Common Pitfalls

- **No base case, or one that cannot be reached.** \`n == 0\` with steps of 2 skips 0 for odd n; the demo had to stop it with a guard. Use \`n <= 0\`, and test the smallest inputs (0, 1, empty vector).
- **Passing containers by value.** Each recursive call copies the vector or string; use \`const&\`.
- **Signed overflow in recursive arithmetic.** Past 20!, \`long long\` overflows, which is undefined behaviour; check bounds or use a wider or arbitrary-precision type.
- **Using \`memo[n]\` to test the memo.** \`operator[]\` inserts a 0 for a missing key, which can look like a cached answer; use \`find\` or \`count\`.
- **Ignoring \`-Wall\`.** GCC flagged the missing base case as infinite recursion before the program ever ran.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">Recursion is a function solving a problem by calling itself on a smaller version of the same problem.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The base case:</strong> <span style="color:#f0e2c8;">The base case is the input small enough to answer directly, with no further call; without one, or if it is unreachable, the recursion never stops.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The three rules:</strong> <span style="color:#f0e2c8;">A base case, a recursive case that calls on a smaller input, and every call moving closer to the base case. Then trust the recursive call to be correct for the smaller input.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. C++ specifics:</strong> <span style="color:#f0e2c8;">A missing base case is a crash (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SIGSEGV</code>, exit 139), not an exception; GCC <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-Wall</code> warns about infinite recursion; I pass containers by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const&amp;</code> and watch for signed overflow.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">Time is calls times work per call; stack space is the maximum depth. Naive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fib(25)</code> made 242,785 calls, the memoised one 49.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can every recursion be written as a loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Linear recursions become a loop with an accumulator; branching ones need an explicit stack, usually a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_back</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">countDownByTwo(5)</code> with base case <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">n == 0</code> never stop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">5, 3, 1, -1: it steps over 0. The base case must cover every value the recursion can reach, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &lt;= 0</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the base case of a recursive function on a binary tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node == nullptr</code>: an empty subtree has height 0, sum 0, and so on. Handling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nullptr</code> once removes special cases for leaves.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why pass <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">const std::vector&lt;int&gt;&amp;</code> in a recursive function?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By value, every call copies the whole vector: O(n) extra time and memory per frame. A const reference costs nothing and still prevents modification.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Will the compiler turn my recursion into a loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It may: GCC at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-O2</code> can eliminate tail calls and some simple recursions. The standard does not require it, so you cannot rely on it for correctness.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| **Recursion** | A function solving a problem by calling itself on a smaller version |
| **Base case** | An input answered directly, which stops the recursion |
| **Recursive case** | The part that shrinks the problem and calls itself |
| **Progress toward the base case** | Every call must be on a strictly smaller input |
| **Recursive leap of faith** | Assume the smaller call is right; build your answer from it |
| **Unwinding** | Results returning up the chain of waiting calls |
| **Multiple base cases** | More than one stopping condition, e.g. Fibonacci |
| **Stack overflow** | Running out of call-stack memory from too-deep recursion |
| **Memoisation** | Caching subproblem answers so each is computed once |
| **\`-Winfinite-recursion\`** | GCC warning (part of \`-Wall\`) for functions that always call themselves |

**Conclusion:** Recursion solves a problem by handing a smaller copy of it to the same function and building the answer from what comes back; the base case is the input small enough to answer directly, and it is what makes the whole thing stop. Get the three rules right — a base case, a smaller recursive call, and guaranteed progress toward the base case — and recursion is the clearest way to express trees, divide-and-conquer and backtracking. The runs here show both sides: a clean wind-down and unwind for \`factorial(4)\`, a base case that odd numbers skipped right over, and a Fibonacci that needed 242,785 calls until memoisation cut it to 49. In C++, also know what a runaway recursion looks like, so you recognise the bug the moment you see it.`,
        examples: [
          {
            label: "Trace factorial(4): calls going down, returns coming back up",
            code: `#include <iostream>
#include <string>
using namespace std;

// Watch recursion wind down to the base case and unwind back up.

long long factorial(int n, int depth = 0) {
    string pad(2 * depth, ' ');
    cout << pad << "call factorial(" << n << ")\\n";
    if (n <= 1) {                                       // base case: answer known, no more calls
        cout << pad << "return 1   <- base case\\n";
        return 1;
    }
    long long result = n * factorial(n - 1, depth + 1); // recursive case: a smaller problem
    cout << pad << "return " << result << "\\n";
    return result;
}

int main() {
    long long answer = factorial(4);
    cout << "factorial(4) = " << answer << "\\n";
    return 0;
}`,
          },
          {
            label: "Five small recursions, each with its base case",
            code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

// Five small recursions. Each has a base case and a step toward it.

long long factorial(int n) {
    if (n <= 1) return 1;                    // base case (covers 0 and 1)
    return n * factorial(n - 1);             // n shrinks by 1; long long holds up to 20!
}

int sumList(const vector<int>& nums, size_t i = 0) {   // const& : no copy per call
    if (i == nums.size()) return 0;          // base case: nothing left to add
    return nums[i] + sumList(nums, i + 1);
}

string reverseString(const string& s, size_t i = 0) {
    if (i == s.size()) return "";            // base case: empty suffix
    return reverseString(s, i + 1) + s[i];
}

long long power(long long base, int exp) {
    if (exp == 0) return 1;                  // base case: anything to the power 0 is 1
    long long half = power(base, exp / 2);   // exp halves: about log2(exp) calls
    return exp % 2 == 0 ? half * half : half * half * base;
}

bool isPalindrome(const string& s, int lo, int hi) {
    if (lo >= hi) return true;               // base case: 0 or 1 characters left
    if (s[lo] != s[hi]) return false;        // second base case: a mismatch settles it
    return isPalindrome(s, lo + 1, hi - 1);
}

int main() {
    cout << boolalpha;
    cout << factorial(5) << "\\n";                    // 120
    cout << factorial(0) << "\\n";                    // 1
    cout << factorial(20) << "\\n";                   // 2432902008176640000
    cout << sumList({3, 1, 4, 1, 5}) << "\\n";        // 14
    cout << sumList({}) << "\\n";                     // 0
    cout << reverseString("recursion") << "\\n";      // noisrucer
    cout << power(2, 10) << "\\n";                    // 1024
    cout << power(3, 0) << "\\n";                     // 1
    cout << isPalindrome("racecar", 0, 6) << "\\n";   // true
    cout << isPalindrome("recursion", 0, 8) << "\\n"; // false
    return 0;
}`,
          },
          {
            label: "Base-case bugs, and naive vs memoised Fibonacci",
            code: `#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

// Base cases that are wrong, and base cases that repeat work.

string countDownByTwo(int n, vector<int>& visited, size_t guard) {
    visited.push_back(n);
    if (visited.size() > guard) return "never reached the base case";  // demo safety net
    if (n == 0) return "done";         // BUG: an odd n jumps from 1 to -1 and skips 0
    return countDownByTwo(n - 2, visited, guard);
}

string countDownByTwoFixed(int n, vector<int>& visited) {
    visited.push_back(n);
    if (n <= 0) return "done";         // FIX: a range, not a single value, can always be hit
    return countDownByTwoFixed(n - 2, visited);
}

long long calls = 0;

int fib(int n) {                       // two base cases, two recursive calls
    calls++;
    if (n < 2) return n;
    return fib(n - 1) + fib(n - 2);
}

int fibMemo(int n, unordered_map<int, int>& memo) {   // each answer computed once
    calls++;
    if (n < 2) return n;
    auto it = memo.find(n);            // find, not memo[n]: operator[] would insert a 0
    if (it != memo.end()) return it->second;
    int value = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
    memo[n] = value;
    return value;
}

string fmt(const vector<int>& items) {
    string s = "[";
    for (size_t k = 0; k < items.size(); k++) s += (k ? ", " : "") + to_string(items[k]);
    return s + "]";
}

int main() {
    vector<int> visited;
    string status = countDownByTwo(5, visited, 6);
    cout << "buggy  (n == 0), start 5: " << fmt(visited) << " -> " << status << "\\n";
    visited.clear();
    status = countDownByTwoFixed(5, visited);
    cout << "fixed  (n <= 0), start 5: " << fmt(visited) << " -> " << status << "\\n";
    visited.clear();
    status = countDownByTwoFixed(4, visited);
    cout << "fixed  (n <= 0), start 4: " << fmt(visited) << " -> " << status << "\\n";

    calls = 0;
    int value = fib(25);
    cout << "fib(25) = " << value << " with naive recursion: " << calls << " calls\\n";
    calls = 0;
    unordered_map<int, int> memo;
    value = fibMemo(25, memo);
    cout << "fib(25) = " << value << " with memoisation:     " << calls << " calls\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
];

export default augments;
