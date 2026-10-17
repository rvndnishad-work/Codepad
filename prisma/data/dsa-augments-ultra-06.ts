/**
 * DSA ULTRA — batch 06: arrays and hashing — missing number, product except
 * self, longest consecutive sequence, prefix sums, subarray sum equals k.
 * One complete answer per language (Python, JavaScript, Java, C++). Every
 * example was run with python3 / node / javac+java / g++ -std=c++17 by
 * scripts/verify-dsa-examples.ts and the quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  {
    title: "How do you find the missing number in 0..n?",
    difficulty: "easy",
    seoDescription: "Find the missing number in 0..n with the Gauss sum or XOR in O(n) time and O(1) space, in Python, JavaScript, Java and C++, with the overflow trap shown.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You get a list of n distinct integers taken from the range 0 to n, so exactly one value in that range is missing. Write a Python function that returns it, and tell me the time and space cost."

**What a strong answer should cover:**
- The sum formula \`n * (n + 1) // 2 - sum(nums)\` and why it works (the range is fully known in advance).
- The XOR alternative and the cancelling property \`a ^ a == 0\`.
- O(n) time and O(1) extra space for both, versus O(n log n) for sorting and O(n) memory for a set.
- Python specifics: ints never overflow, \`//\` keeps the result an int (plain \`/\` gives a float), and \`sum()\` and \`enumerate()\` keep it short.
- Edge cases: missing value is 0 or n, single element.

**Clarifying questions expected:**
- "Are the values distinct, and is exactly one missing?" — the sum and XOR tricks depend on it.
- "Is the range 0..n or 1..n, and how large can n get?" — changes the formula and whether it overflows.

**Code / implementation expected:** Yes — a short function in Python; the sum version is two lines.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an array and a loop are; nothing else is assumed.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the Python code with \`python3 main.py\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Picture a cloakroom with tickets numbered 0 to 10. At the end of the night, eleven tickets were handed out but only ten coats come back, and the attendant wants to know which ticket number never returned. She could line the returned tickets up in order and look for the gap (that is sorting), or tick them off on a checklist (that is a hash set). But there is a cleverer trick: she knows the numbers 0 to 10 add up to 55. Add up the ten returned tickets, subtract from 55, and the difference *is* the missing ticket. One pass, nothing written down.

That is the whole problem: you are given \`n\` distinct numbers taken from the range \`0..n\` (which has \`n + 1\` values), so exactly one value is absent. Interviewers like it because it has four correct answers of different quality, and the best two (the sum formula and XOR) reward you for noticing a mathematical property instead of reaching for a data structure.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the numbers guaranteed distinct, and is exactly one missing? | The sum and XOR tricks rely on it. With duplicates or two missing values you need a different method (see the follow-ups). |
| Is the range exactly \`0..n\` where \`n\` is the array length? | Some variants use \`1..n\`. The formula changes, so confirm the bounds before writing it. |
| How large can \`n\` be? | It decides whether \`n * (n + 1)\` fits in a 32-bit integer in Java or C++. |
| May I modify the input array? | The in-place index-marking trick rewrites the array; sum and XOR do not. |
| Do you want O(1) extra space? | It rules out the hash set and tells you the interviewer wants the sum or XOR answer. |

## 3. The Core Idea: Use What You Already Know About 0..n

The range \`0..n\` is not random; you know everything about it in advance. You know how many values it has (\`n + 1\`), you know their total, and you know that each value should appear exactly once. Compare that "expected" picture with the array, and the single difference is your answer.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Expected numbers 0 to 3 compared with the array 3 0 1. The number 2 has no match, and 6 minus 4 equals 2">
  <text class="d-text" x="330" y="26" text-anchor="middle">n = 3, so the numbers 0, 1, 2, 3 should all appear</text>
  <text class="d-sub" x="30" y="90">expected</text>
  <rect class="d-box" x="140" y="62" width="60" height="44" rx="8"/>
  <text class="d-text" x="170" y="90" text-anchor="middle">0</text>
  <rect class="d-box" x="220" y="62" width="60" height="44" rx="8"/>
  <text class="d-text" x="250" y="90" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="300" y="62" width="60" height="44" rx="8"/>
  <text class="d-text d-accent" x="330" y="90" text-anchor="middle">2</text>
  <rect class="d-box" x="380" y="62" width="60" height="44" rx="8"/>
  <text class="d-text" x="410" y="90" text-anchor="middle">3</text>
  <text class="d-sub" x="30" y="172">array</text>
  <rect class="d-box-muted" x="140" y="144" width="60" height="44" rx="8"/>
  <text class="d-text" x="170" y="172" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="144" width="60" height="44" rx="8"/>
  <text class="d-text" x="250" y="172" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="300" y="144" width="60" height="44" rx="8"/>
  <text class="d-text" x="330" y="172" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="490" y="62" width="140" height="126" rx="10"/>
  <text class="d-sub" x="560" y="96" text-anchor="middle">sum expected 6</text>
  <text class="d-sub" x="560" y="124" text-anchor="middle">sum actual 4</text>
  <text class="d-text d-accent" x="560" y="160" text-anchor="middle">missing = 2</text>
</svg>

The expected total of \`0 + 1 + ... + n\` is \`n(n + 1) / 2\`. For \`n = 3\` that is 6. The array \`[3, 0, 1]\` adds up to 4, and \`6 - 4 = 2\`.

📌 **Interview term: Gauss sum formula** — the closed form \`n(n + 1) / 2\` for the sum \`1 + 2 + ... + n\` (adding 0 does not change it). Named after the story of young Carl Friedrich Gauss pairing 1 with 100, 2 with 99, and so on.

📌 **Interview term: Invariant** — a fact that is always true about the input, here "every value in \`0..n\` appears once except one". The fast solutions work by exploiting an invariant rather than searching.

## 4. Four Approaches, Worst to Best

1. **Sort, then scan.** After sorting, \`nums[i]\` should equal \`i\`; the first index where it does not is the answer (or \`n\` if all match). Simple, but sorting costs O(n log n) — see [Big-O notation](/interview-question/what-is-big-o-notation).
2. **Hash set.** Put every value in a set, then check \`0, 1, ..., n\` until one is absent. O(n) time, but O(n) extra memory. How a set gives average O(1) lookups is covered in [how a hash table works](/interview-question/how-does-a-hash-table-work).
3. **Sum formula.** \`expected - actual\`. O(n) time, O(1) space. The one trap: in fixed-width integer languages, \`n * (n + 1)\` can overflow.
4. **XOR.** XOR every index, \`n\`, and every value together. Equal numbers cancel, and only the missing one survives. O(n) time, O(1) space, and no overflow at all.

📌 **Interview term: XOR (exclusive or)** — a bitwise operation, written \`^\` in all four languages, with three properties that make it perfect here: \`a ^ a = 0\`, \`a ^ 0 = a\`, and the order of operations does not matter. More tricks like this are in [bit manipulation tricks](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="XOR pairs each index with an equal value. 0 pairs with 0, 1 with 1, 3 with 3, and 2 is left alone">
  <text class="d-sub" x="20" y="78">indices + n</text>
  <rect class="d-box" x="130" y="50" width="70" height="44" rx="8"/>
  <text class="d-text" x="165" y="78" text-anchor="middle">0</text>
  <rect class="d-box" x="230" y="50" width="70" height="44" rx="8"/>
  <text class="d-text" x="265" y="78" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="330" y="50" width="70" height="44" rx="8"/>
  <text class="d-text d-accent" x="365" y="78" text-anchor="middle">2</text>
  <rect class="d-box" x="430" y="50" width="70" height="44" rx="8"/>
  <text class="d-text" x="465" y="78" text-anchor="middle">3</text>
  <text class="d-sub" x="20" y="198">values</text>
  <rect class="d-box-muted" x="130" y="170" width="70" height="44" rx="8"/>
  <text class="d-text" x="165" y="198" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="230" y="170" width="70" height="44" rx="8"/>
  <text class="d-text" x="265" y="198" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="330" y="170" width="70" height="44" rx="8"/>
  <text class="d-text" x="365" y="198" text-anchor="middle">1</text>
  <path class="d-edge-dashed" d="M 165 94 L 265 170"/>
  <path class="d-edge-dashed" d="M 265 94 L 365 170"/>
  <path class="d-edge-dashed" d="M 465 94 L 165 170"/>
  <rect class="d-box-accent" x="540" y="100" width="100" height="70" rx="10"/>
  <text class="d-sub" x="590" y="126" text-anchor="middle">left over</text>
  <text class="d-text d-accent" x="590" y="154" text-anchor="middle">2</text>
</svg>

Every index from 0 to 3 is paired with an equal value in the array, except index 2. When everything is XORed together, each pair becomes 0, and the unpaired 2 is all that is left. The same cancelling idea solves [the single number problem](/interview-question/how-do-you-find-the-single-number-where-every-other-element-appears-twice).

📌 **Interview term: Integer overflow** — when a result is too large for the number type holding it. A 32-bit signed integer holds at most 2,147,483,647, so \`n * (n + 1)\` overflows once \`n\` passes about 46,340, even though the final answer would still fit.

A safe middle ground is the **running difference**: start with \`n\`, then add \`i - nums[i]\` for every index. It computes the same \`expected - actual\` value, but the running total never grows large, so it cannot overflow.

## 5. The Code in Python

All three O(n) answers, as they appear in Example 1. Read \`missing_by_sum\` first; it is the one most interviewers expect.

~~~python
def missing_by_sum(nums):
    n = len(nums)
    return n * (n + 1) // 2 - sum(nums)


def missing_by_xor(nums):
    x = len(nums)
    for i, v in enumerate(nums):
        x ^= i ^ v
    return x


def missing_by_set(nums):
    seen = set(nums)
    for v in range(len(nums) + 1):
        if v not in seen:
            return v
    return -1
~~~

**Line by line:**

- \`n * (n + 1) // 2\` uses \`//\`, integer division. With \`/\` Python 3 returns a float (\`6.0\`), and for very large \`n\` a float cannot represent every integer exactly.
- \`enumerate(nums)\` gives \`(index, value)\` pairs, so the XOR loop folds in both the index and the value in one step; starting \`x\` at \`len(nums)\` folds in \`n\` itself.
- \`missing_by_set\` is the readable fallback: \`v not in seen\` is an average O(1) set lookup.

## 6. Python Details That Matter Here

- **No overflow.** Python integers grow as large as memory allows; \`2 ** 100\` printed \`1267650600228229401496703205376\`. So the sum formula is completely safe in Python, and the overflow discussion is only something to *mention* because the interviewer may ask how it would behave in Java or C++.
- **One-liners exist** — \`return len(nums) * (len(nums) + 1) // 2 - sum(nums)\` — and are fine in an interview as long as you explain them.
- **\`functools.reduce(operator.xor, ...)\`** can express the XOR version, but the explicit loop is easier to talk through.

## 7. Verified: Running the Code

Each example below is in the **Python code** tab on this page. They were saved as \`main.py\` and run with \`python3 main.py\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Sum, XOR and hash set on the standard cases**

~~~text
[3, 0, 1] -> sum=2 xor=2 set=2
[0, 1] -> sum=2 xor=2 set=2
[9, 6, 4, 2, 3, 5, 7, 0, 1] -> sum=8 xor=8 set=8
[0] -> sum=1 xor=1 set=1
[1] -> sum=0 xor=0 set=0
~~~

**What this shows:** All three methods agree on every case, including the two edges where the missing value is \`n\` (\`[0, 1]\`) or 0 (\`[1]\`).

**Example 2 — What 32-bit overflow does to the sum formula**

~~~text
n = 200000, missing = 123456
32-bit n*(n+1)/2 - sum : -2147360192
64-bit n*(n+1)/2 - sum : 123456
32-bit running i - nums[i]: 123456
xor                    : 123456
~~~

**What this shows:** With \`n = 200000\`, the true product \`n * (n + 1)\` is 40,000,200,000, far above the 32-bit limit of 2,147,483,647. Python integers never overflow (\`2 ** 100\` prints all 31 digits), so this example wraps values to 32 bits by hand to show what Java or C++ would do. The wrapped formula gives a nonsense negative number; the 64-bit formula, the running difference (even when wrapped) and XOR all give 123456.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Sort, then scan | O(n log n) | O(1) to O(n) | The sort dominates; space depends on the sort |
| Hash set | O(n) average | O(n) | n inserts and up to n + 1 lookups |
| Sum formula | O(n) | O(1) | One pass to add the array |
| XOR | O(n) | O(1) | One pass, one integer of state |

## 9. Edge Cases

- **The missing number is \`n\`** (e.g. \`[0, 1]\` gives 2): the sort-and-scan method must return \`n\` when every index matches; sum and XOR handle it automatically.
- **The missing number is 0** (e.g. \`[1]\` gives 0).
- **A single element** \`[0]\` gives 1, and \`[1]\` gives 0.
- **Large \`n\`**: in Java and C++ the formula needs a 64-bit type or the running-difference form; Example 2 shows the 32-bit version going wrong at \`n = 200000\`.
- **Unsorted input** is the normal case; none of the O(n) methods care about order.

## 10. Common Pitfalls

- **Using \`/\` instead of \`//\`.** \`n * (n + 1) / 2\` returns a float in Python 3, so the function returns \`2.0\` instead of \`2\`.
- **Assuming the range is \`1..n\`.** For \`0..n\` the length of the array is \`n\`, and the formula uses \`len(nums)\`, not \`len(nums) - 1\` or \`max(nums)\`.
- **Using \`max(nums)\` as n.** If the missing value is \`n\` itself, \`max(nums)\` is \`n - 1\` and you get the wrong total.
- **Forgetting to fold in \`n\` for XOR.** XORing only indices \`0..n-1\` and values misses one term; start the accumulator at \`len(nums)\`.
- **Sorting in place with \`nums.sort()\`** when the caller did not expect the list to change; \`sorted(nums)\` makes a copy.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">The range <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0..n</code> has a known total, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n * (n + 1) // 2</code>; subtract <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sum(nums)</code> and the difference is the missing number.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">Every value appears once except one, so the expected total minus the actual total leaves exactly that value.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">O(n) time for one pass and O(1) extra space, compared with O(n log n) for sorting or O(n) memory for a set.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The alternative:</strong> <span style="color:#f0e2c8;">XOR all indices, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> and all values; equal numbers cancel because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ a == 0</code>, so only the missing one survives.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Python detail:</strong> <span style="color:#f0e2c8;">Python ints never overflow, so the formula is safe here; in Java or C++ I would use a 64-bit type or the XOR version.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if two numbers were missing?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Get two equations: the sum gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a + b</code> and the sum of squares gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a² + b²</code>; solve them. Or XOR everything to get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ b</code>, split the values by any set bit of that result, and XOR each group separately.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the input could contain duplicates?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then the sum trick no longer isolates one value. Use a set of seen values, or a list of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n + 1</code> booleans, and report the index that was never marked.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">//</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">/</code>?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In Python 3 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/</code> always returns a float, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">6 / 2</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3.0</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">//</code> keeps an int, which is exact for any size.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would this overflow in Python?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Python ints are arbitrary precision; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 ** 100</code> prints all of its digits. Overflow only matters in fixed-width languages.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it without extra space and without arithmetic tricks?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Cyclic placement: swap each value <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v &lt; n</code> into index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v</code>, then the first index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i] != i</code> is the answer. O(n) time, O(1) space, but it mutates the list.</span>
</div>


</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Gauss sum formula** | \`n(n + 1) / 2\`, the total of 0..n |
| **Invariant** | A fact that always holds about the input, used to shortcut the search |
| **XOR** | Bitwise exclusive or; \`a ^ a = 0\`, \`a ^ 0 = a\`, order does not matter |
| **Integer overflow** | A result too large for its number type |
| **Running difference** | Accumulating \`i - nums[i]\` so the total stays small |

---
**Conclusion:** The missing number in \`0..n\` is found by comparing what you have with what you know should be there. In Python the cleanest version is \`n * (n + 1) // 2 - sum(nums)\`: one pass, constant space, and no overflow risk because Python integers never overflow. Know the XOR version as well — it is the answer interviewers want when they ask for a method that is safe in Java or C++ — and be ready to explain why sorting (O(n log n)) and a set (O(n) memory) are correct but weaker.`,
        examples: [
          {
            label: "Sum, XOR and hash set on the standard cases",
            code: `def missing_by_sum(nums):
    n = len(nums)
    return n * (n + 1) // 2 - sum(nums)


def missing_by_xor(nums):
    x = len(nums)
    for i, v in enumerate(nums):
        x ^= i ^ v
    return x


def missing_by_set(nums):
    seen = set(nums)
    for v in range(len(nums) + 1):
        if v not in seen:
            return v
    return -1


tests = [[3, 0, 1], [0, 1], [9, 6, 4, 2, 3, 5, 7, 0, 1], [0], [1]]
for nums in tests:
    a, b, c = missing_by_sum(nums), missing_by_xor(nums), missing_by_set(nums)
    print("[" + ", ".join(str(v) for v in nums) + "] -> sum=" + str(a)
          + " xor=" + str(b) + " set=" + str(c))`,
          },
          {
            label: "What 32-bit overflow does to the sum formula",
            code: `# Python ints never overflow, so to show what a 32-bit int in Java or C++
# would do, wrap values to 32 bits by hand.
def wrap32(x):
    x &= 0xFFFFFFFF
    return x - (1 << 32) if x >= (1 << 31) else x


def div_trunc(a, b):  # Java/C++ integer division truncates toward zero
    q = abs(a) // abs(b)
    return q if (a >= 0) == (b >= 0) else -q


n, missing = 200000, 123456
nums = [v for v in range(n + 1) if v != missing]

total32 = 0
for v in nums:
    total32 = wrap32(total32 + v)
formula32 = div_trunc(wrap32(n * (n + 1)), 2)
print("n = " + str(n) + ", missing = " + str(missing))
print("32-bit n*(n+1)/2 - sum : " + str(wrap32(formula32 - total32)))
print("64-bit n*(n+1)/2 - sum : " + str(n * (n + 1) // 2 - sum(nums)))

running = n
for i, v in enumerate(nums):
    running = wrap32(running + i - v)
print("32-bit running i - nums[i]: " + str(running))

x = n
for i, v in enumerate(nums):
    x ^= i ^ v
print("xor                    : " + str(x))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You are given an array of n distinct integers from the range 0 to n, so one value is missing. Write a JavaScript function that finds it in linear time, and talk me through the space cost."

**What a strong answer should cover:**
- The sum formula \`n * (n + 1) / 2\` minus the array total, and why it works.
- The XOR method and why equal values cancel.
- O(n) time, O(1) space for both; O(n log n) for sorting, O(n) memory for a \`Set\`.
- JavaScript specifics: numbers are 64-bit floats, exact for integers up to \`Number.MAX_SAFE_INTEGER\`; bitwise \`^\` converts operands to 32-bit integers.
- Edge cases: missing 0 or missing n.

**Clarifying questions expected:**
- "Are the values distinct, and is exactly one missing?" — the sum and XOR tricks depend on it.
- "Is the range 0..n or 1..n, and how large can n get?" — changes the formula and whether it overflows.

**Code / implementation expected:** Yes — a short function in JavaScript; the sum or XOR version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an array and a loop are; nothing else is assumed.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the JavaScript code with \`node main.js\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Picture a cloakroom with tickets numbered 0 to 10. At the end of the night, eleven tickets were handed out but only ten coats come back, and the attendant wants to know which ticket number never returned. She could line the returned tickets up in order and look for the gap (that is sorting), or tick them off on a checklist (that is a hash set). But there is a cleverer trick: she knows the numbers 0 to 10 add up to 55. Add up the ten returned tickets, subtract from 55, and the difference *is* the missing ticket. One pass, nothing written down.

That is the whole problem: you are given \`n\` distinct numbers taken from the range \`0..n\` (which has \`n + 1\` values), so exactly one value is absent. Interviewers like it because it has four correct answers of different quality, and the best two (the sum formula and XOR) reward you for noticing a mathematical property instead of reaching for a data structure.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the numbers guaranteed distinct, and is exactly one missing? | The sum and XOR tricks rely on it. With duplicates or two missing values you need a different method (see the follow-ups). |
| Is the range exactly \`0..n\` where \`n\` is the array length? | Some variants use \`1..n\`. The formula changes, so confirm the bounds before writing it. |
| How large can \`n\` be? | It decides whether \`n * (n + 1)\` fits in a 32-bit integer in Java or C++. |
| May I modify the input array? | The in-place index-marking trick rewrites the array; sum and XOR do not. |
| Do you want O(1) extra space? | It rules out the hash set and tells you the interviewer wants the sum or XOR answer. |

## 3. The Core Idea: Use What You Already Know About 0..n

The range \`0..n\` is not random; you know everything about it in advance. You know how many values it has (\`n + 1\`), you know their total, and you know that each value should appear exactly once. Compare that "expected" picture with the array, and the single difference is your answer.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Expected numbers 0 to 3 compared with the array 3 0 1. The number 2 has no match, and 6 minus 4 equals 2">
  <text class="d-text" x="330" y="26" text-anchor="middle">n = 3, so the numbers 0, 1, 2, 3 should all appear</text>
  <text class="d-sub" x="30" y="90">expected</text>
  <rect class="d-box" x="140" y="62" width="60" height="44" rx="8"/>
  <text class="d-text" x="170" y="90" text-anchor="middle">0</text>
  <rect class="d-box" x="220" y="62" width="60" height="44" rx="8"/>
  <text class="d-text" x="250" y="90" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="300" y="62" width="60" height="44" rx="8"/>
  <text class="d-text d-accent" x="330" y="90" text-anchor="middle">2</text>
  <rect class="d-box" x="380" y="62" width="60" height="44" rx="8"/>
  <text class="d-text" x="410" y="90" text-anchor="middle">3</text>
  <text class="d-sub" x="30" y="172">array</text>
  <rect class="d-box-muted" x="140" y="144" width="60" height="44" rx="8"/>
  <text class="d-text" x="170" y="172" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="144" width="60" height="44" rx="8"/>
  <text class="d-text" x="250" y="172" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="300" y="144" width="60" height="44" rx="8"/>
  <text class="d-text" x="330" y="172" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="490" y="62" width="140" height="126" rx="10"/>
  <text class="d-sub" x="560" y="96" text-anchor="middle">sum expected 6</text>
  <text class="d-sub" x="560" y="124" text-anchor="middle">sum actual 4</text>
  <text class="d-text d-accent" x="560" y="160" text-anchor="middle">missing = 2</text>
</svg>

The expected total of \`0 + 1 + ... + n\` is \`n(n + 1) / 2\`. For \`n = 3\` that is 6. The array \`[3, 0, 1]\` adds up to 4, and \`6 - 4 = 2\`.

📌 **Interview term: Gauss sum formula** — the closed form \`n(n + 1) / 2\` for the sum \`1 + 2 + ... + n\` (adding 0 does not change it). Named after the story of young Carl Friedrich Gauss pairing 1 with 100, 2 with 99, and so on.

📌 **Interview term: Invariant** — a fact that is always true about the input, here "every value in \`0..n\` appears once except one". The fast solutions work by exploiting an invariant rather than searching.

## 4. Four Approaches, Worst to Best

1. **Sort, then scan.** After sorting, \`nums[i]\` should equal \`i\`; the first index where it does not is the answer (or \`n\` if all match). Simple, but sorting costs O(n log n) — see [Big-O notation](/interview-question/what-is-big-o-notation).
2. **Hash set.** Put every value in a set, then check \`0, 1, ..., n\` until one is absent. O(n) time, but O(n) extra memory. How a set gives average O(1) lookups is covered in [how a hash table works](/interview-question/how-does-a-hash-table-work).
3. **Sum formula.** \`expected - actual\`. O(n) time, O(1) space. The one trap: in fixed-width integer languages, \`n * (n + 1)\` can overflow.
4. **XOR.** XOR every index, \`n\`, and every value together. Equal numbers cancel, and only the missing one survives. O(n) time, O(1) space, and no overflow at all.

📌 **Interview term: XOR (exclusive or)** — a bitwise operation, written \`^\` in all four languages, with three properties that make it perfect here: \`a ^ a = 0\`, \`a ^ 0 = a\`, and the order of operations does not matter. More tricks like this are in [bit manipulation tricks](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="XOR pairs each index with an equal value. 0 pairs with 0, 1 with 1, 3 with 3, and 2 is left alone">
  <text class="d-sub" x="20" y="78">indices + n</text>
  <rect class="d-box" x="130" y="50" width="70" height="44" rx="8"/>
  <text class="d-text" x="165" y="78" text-anchor="middle">0</text>
  <rect class="d-box" x="230" y="50" width="70" height="44" rx="8"/>
  <text class="d-text" x="265" y="78" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="330" y="50" width="70" height="44" rx="8"/>
  <text class="d-text d-accent" x="365" y="78" text-anchor="middle">2</text>
  <rect class="d-box" x="430" y="50" width="70" height="44" rx="8"/>
  <text class="d-text" x="465" y="78" text-anchor="middle">3</text>
  <text class="d-sub" x="20" y="198">values</text>
  <rect class="d-box-muted" x="130" y="170" width="70" height="44" rx="8"/>
  <text class="d-text" x="165" y="198" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="230" y="170" width="70" height="44" rx="8"/>
  <text class="d-text" x="265" y="198" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="330" y="170" width="70" height="44" rx="8"/>
  <text class="d-text" x="365" y="198" text-anchor="middle">1</text>
  <path class="d-edge-dashed" d="M 165 94 L 265 170"/>
  <path class="d-edge-dashed" d="M 265 94 L 365 170"/>
  <path class="d-edge-dashed" d="M 465 94 L 165 170"/>
  <rect class="d-box-accent" x="540" y="100" width="100" height="70" rx="10"/>
  <text class="d-sub" x="590" y="126" text-anchor="middle">left over</text>
  <text class="d-text d-accent" x="590" y="154" text-anchor="middle">2</text>
</svg>

Every index from 0 to 3 is paired with an equal value in the array, except index 2. When everything is XORed together, each pair becomes 0, and the unpaired 2 is all that is left. The same cancelling idea solves [the single number problem](/interview-question/how-do-you-find-the-single-number-where-every-other-element-appears-twice).

📌 **Interview term: Integer overflow** — when a result is too large for the number type holding it. A 32-bit signed integer holds at most 2,147,483,647, so \`n * (n + 1)\` overflows once \`n\` passes about 46,340, even though the final answer would still fit.

A safe middle ground is the **running difference**: start with \`n\`, then add \`i - nums[i]\` for every index. It computes the same \`expected - actual\` value, but the running total never grows large, so it cannot overflow.

## 5. The Code in JavaScript

The three O(n) answers from Example 1. \`missingBySum\` is the expected one; \`missingByXor\` is the follow-up.

~~~javascript
function missingBySum(nums) {
  const n = nums.length;
  let total = n * (n + 1) / 2;
  for (const v of nums) total -= v;
  return total;
}

function missingByXor(nums) {
  let x = nums.length;
  for (let i = 0; i < nums.length; i++) x ^= i ^ nums[i];
  return x;
}

function missingBySet(nums) {
  const seen = new Set(nums);
  for (let v = 0; v <= nums.length; v++) {
    if (!seen.has(v)) return v;
  }
  return -1;
}
~~~

**Line by line:**

- \`n * (n + 1) / 2\` is always a whole number because one of \`n\` and \`n + 1\` is even, so the float division is exact.
- The XOR loop starts at \`nums.length\`, which folds in \`n\`, then XORs each index \`i\` and value \`nums[i]\`.
- \`new Set(nums)\` builds the set in one call, and \`seen.has(v)\` is the average O(1) lookup.

## 6. JavaScript Details That Matter Here

- **Numbers are 64-bit floats.** Every integer up to \`Number.MAX_SAFE_INTEGER\` (it printed \`9007199254740991\`, which is 2^53 - 1) is exact, so \`n * (n + 1) / 2\` is exact for any array that fits in memory. There is no 32-bit overflow in ordinary arithmetic.
- **Bitwise operators are 32-bit.** \`^\`, \`|\` and \`&\` convert their operands to 32-bit signed integers first. That is fine here because array indices and values are far below 2^31, but it is why \`| 0\` and \`Math.imul\` are used in Example 2 to *simulate* a Java or C++ \`int\`.
- **\`reduce\` works** — \`nums.reduce((a, b) => a + b, 0)\` — but always pass the initial \`0\`, or an empty array throws a TypeError.

## 7. Verified: Running the Code

Each example below is in the **JavaScript code** tab on this page. They were saved as \`main.js\` and run with \`node main.js\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Sum, XOR and hash set on the standard cases**

~~~text
[3, 0, 1] -> sum=2 xor=2 set=2
[0, 1] -> sum=2 xor=2 set=2
[9, 6, 4, 2, 3, 5, 7, 0, 1] -> sum=8 xor=8 set=8
[0] -> sum=1 xor=1 set=1
[1] -> sum=0 xor=0 set=0
~~~

**What this shows:** All three methods agree on every case, including the two edges where the missing value is \`n\` (\`[0, 1]\`) or 0 (\`[1]\`).

**Example 2 — What 32-bit overflow does to the sum formula**

~~~text
n = 200000, missing = 123456
32-bit n*(n+1)/2 - sum : -2147360192
64-bit n*(n+1)/2 - sum : 123456
32-bit running i - nums[i]: 123456
xor                    : 123456
~~~

**What this shows:** With \`n = 200000\`, the true product \`n * (n + 1)\` is 40,000,200,000, far above the 32-bit limit of 2,147,483,647. In JavaScript every number is a 64-bit float, so the plain formula is exact here (integers are exact up to \`Number.MAX_SAFE_INTEGER\`, which printed as 9007199254740991). \`Math.imul\` and \`| 0\` force 32-bit wrapping, which shows what a Java or C++ \`int\` would do: the wrapped formula is wrong, while the running difference and XOR are still right.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Sort, then scan | O(n log n) | O(1) to O(n) | The sort dominates; space depends on the sort |
| Hash set | O(n) average | O(n) | n inserts and up to n + 1 lookups |
| Sum formula | O(n) | O(1) | One pass to add the array |
| XOR | O(n) | O(1) | One pass, one integer of state |

## 9. Edge Cases

- **The missing number is \`n\`** (e.g. \`[0, 1]\` gives 2): the sort-and-scan method must return \`n\` when every index matches; sum and XOR handle it automatically.
- **The missing number is 0** (e.g. \`[1]\` gives 0).
- **A single element** \`[0]\` gives 1, and \`[1]\` gives 0.
- **Large \`n\`**: in Java and C++ the formula needs a 64-bit type or the running-difference form; Example 2 shows the 32-bit version going wrong at \`n = 200000\`.
- **Unsorted input** is the normal case; none of the O(n) methods care about order.

## 10. Common Pitfalls

- **\`reduce\` without an initial value.** \`[].reduce((a, b) => a + b)\` throws; \`missingBySum([])\` must still return 0.
- **Using \`Math.max(...nums)\` as n.** If the missing value is \`n\`, the maximum is \`n - 1\`. Use \`nums.length\`.
- **Spreading a huge array into \`Math.max(...nums)\`** can also exceed the engine argument limit; another reason to use the length.
- **Assuming \`^\` is exponent.** In JavaScript \`^\` is XOR; exponent is \`**\`. \`2 ^ 3\` is 1, not 8.
- **Comparing with \`==\`.** Use \`===\` in the scan versions so \`"2" == 2\` style coercion never hides a bug.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">The range <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0..n</code> has a known total, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n * (n + 1) / 2</code>; subtract the array sum and the difference is the missing value.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">Every value appears once except one, so expected minus actual is exactly that one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">One pass, O(n) time and O(1) space; sorting is O(n log n) and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> costs O(n) memory.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The alternative:</strong> <span style="color:#f0e2c8;">XOR <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code>, every index and every value; pairs cancel because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ a === 0</code>, leaving the missing number.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The JavaScript detail:</strong> <span style="color:#f0e2c8;">Numbers are doubles, exact up to 2^53 - 1, so the formula does not overflow here; in Java or C++ I would switch to XOR or a 64-bit type.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if two numbers were missing?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">XOR everything to get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ b</code>, pick its lowest set bit with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &amp; -x</code>, split all numbers into two groups by that bit, and XOR each group to get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code>. Or use the sum and the sum of squares.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the XOR version work for large values?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bitwise operators work on 32-bit signed integers, so it is correct for values below 2^31, which covers any realistic array length.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">n * (n + 1) / 2</code> never fractional?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One of two consecutive integers is even, so the product is even and the division by 2 is exact.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the array may contain duplicates?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then neither trick isolates one value; use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> of seen values or a boolean array of size n + 1.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you avoid extra space without math tricks?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Cyclic placement: swap each value into the index equal to it, then scan for the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i] !== i</code>. O(1) space, but it mutates the array.</span>
</div>


</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Gauss sum formula** | \`n(n + 1) / 2\`, the total of 0..n |
| **Invariant** | A fact that always holds about the input, used to shortcut the search |
| **XOR** | Bitwise exclusive or; \`a ^ a = 0\`, \`a ^ 0 = a\`, order does not matter |
| **Integer overflow** | A result too large for its number type |
| **Running difference** | Accumulating \`i - nums[i]\` so the total stays small |

---
**Conclusion:** Find the missing number by comparing the known range with the array: \`n * (n + 1) / 2\` minus the array total, or XOR of all indices, \`n\` and values. Both are one pass and constant space. In JavaScript the formula is safe because numbers are 64-bit floats that stay exact up to 2^53 - 1; the overflow problem only appears if you force 32-bit arithmetic, which is exactly what Java and C++ do and why XOR is the portable favourite.`,
        examples: [
          {
            label: "Sum, XOR and hash set on the standard cases",
            code: `function missingBySum(nums) {
  const n = nums.length;
  let total = n * (n + 1) / 2;
  for (const v of nums) total -= v;
  return total;
}

function missingByXor(nums) {
  let x = nums.length;
  for (let i = 0; i < nums.length; i++) x ^= i ^ nums[i];
  return x;
}

function missingBySet(nums) {
  const seen = new Set(nums);
  for (let v = 0; v <= nums.length; v++) {
    if (!seen.has(v)) return v;
  }
  return -1;
}

const tests = [[3, 0, 1], [0, 1], [9, 6, 4, 2, 3, 5, 7, 0, 1], [0], [1]];
for (const nums of tests) {
  const a = missingBySum(nums), b = missingByXor(nums), c = missingBySet(nums);
  console.log('[' + nums.join(', ') + '] -> sum=' + a + ' xor=' + b + ' set=' + c);
}`,
          },
          {
            label: "What 32-bit overflow does to the sum formula",
            code: `// JS numbers are 64-bit floats: n * (n + 1) / 2 is exact here. To show what a
// 32-bit int in Java or C++ would do, use Math.imul and |0, which wrap to 32 bits.
const n = 200000, missing = 123456;
const nums = [];
for (let v = 0; v <= n; v++) if (v !== missing) nums.push(v);

let total32 = 0;
for (const v of nums) total32 = (total32 + v) | 0;
const formula32 = (Math.imul(n, n + 1) / 2) | 0;
console.log('n = ' + n + ', missing = ' + missing);
console.log('32-bit n*(n+1)/2 - sum : ' + ((formula32 - total32) | 0));

let total = n * (n + 1) / 2;
for (const v of nums) total -= v;
console.log('64-bit n*(n+1)/2 - sum : ' + total);

let running = n;
for (let i = 0; i < nums.length; i++) running = (running + i - nums[i]) | 0;
console.log('32-bit running i - nums[i]: ' + running);

let x = n;
for (let i = 0; i < nums.length; i++) x ^= i ^ nums[i];
console.log('xor                    : ' + x);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an int array of n distinct numbers taken from 0 to n, one number in that range is missing. Write a Java method that returns it in O(n) time and O(1) extra space."

**What a strong answer should cover:**
- The sum formula and the XOR method, and why each isolates the missing value.
- O(n) time, O(1) space; sorting is O(n log n); a \`HashSet<Integer>\` is O(n) memory plus boxing.
- Java specifics: \`int\` overflow wraps silently, so \`n * (n + 1)\` must be computed as \`(long) n * (n + 1)\`, or use XOR or a running difference.
- Why the overflow happens before the division, while the overflowed array sum is harmless.
- Edge cases: missing 0 or n, single element.

**Clarifying questions expected:**
- "Are the values distinct, and is exactly one missing?" — the sum and XOR tricks depend on it.
- "Is the range 0..n or 1..n, and how large can n get?" — changes the formula and whether it overflows.

**Code / implementation expected:** Yes — a static method in Java; XOR or the \`long\` sum version.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an array and a loop are; nothing else is assumed.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the Java code with \`javac Main.java && java Main\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Picture a cloakroom with tickets numbered 0 to 10. At the end of the night, eleven tickets were handed out but only ten coats come back, and the attendant wants to know which ticket number never returned. She could line the returned tickets up in order and look for the gap (that is sorting), or tick them off on a checklist (that is a hash set). But there is a cleverer trick: she knows the numbers 0 to 10 add up to 55. Add up the ten returned tickets, subtract from 55, and the difference *is* the missing ticket. One pass, nothing written down.

That is the whole problem: you are given \`n\` distinct numbers taken from the range \`0..n\` (which has \`n + 1\` values), so exactly one value is absent. Interviewers like it because it has four correct answers of different quality, and the best two (the sum formula and XOR) reward you for noticing a mathematical property instead of reaching for a data structure.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the numbers guaranteed distinct, and is exactly one missing? | The sum and XOR tricks rely on it. With duplicates or two missing values you need a different method (see the follow-ups). |
| Is the range exactly \`0..n\` where \`n\` is the array length? | Some variants use \`1..n\`. The formula changes, so confirm the bounds before writing it. |
| How large can \`n\` be? | It decides whether \`n * (n + 1)\` fits in a 32-bit integer in Java or C++. |
| May I modify the input array? | The in-place index-marking trick rewrites the array; sum and XOR do not. |
| Do you want O(1) extra space? | It rules out the hash set and tells you the interviewer wants the sum or XOR answer. |

## 3. The Core Idea: Use What You Already Know About 0..n

The range \`0..n\` is not random; you know everything about it in advance. You know how many values it has (\`n + 1\`), you know their total, and you know that each value should appear exactly once. Compare that "expected" picture with the array, and the single difference is your answer.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Expected numbers 0 to 3 compared with the array 3 0 1. The number 2 has no match, and 6 minus 4 equals 2">
  <text class="d-text" x="330" y="26" text-anchor="middle">n = 3, so the numbers 0, 1, 2, 3 should all appear</text>
  <text class="d-sub" x="30" y="90">expected</text>
  <rect class="d-box" x="140" y="62" width="60" height="44" rx="8"/>
  <text class="d-text" x="170" y="90" text-anchor="middle">0</text>
  <rect class="d-box" x="220" y="62" width="60" height="44" rx="8"/>
  <text class="d-text" x="250" y="90" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="300" y="62" width="60" height="44" rx="8"/>
  <text class="d-text d-accent" x="330" y="90" text-anchor="middle">2</text>
  <rect class="d-box" x="380" y="62" width="60" height="44" rx="8"/>
  <text class="d-text" x="410" y="90" text-anchor="middle">3</text>
  <text class="d-sub" x="30" y="172">array</text>
  <rect class="d-box-muted" x="140" y="144" width="60" height="44" rx="8"/>
  <text class="d-text" x="170" y="172" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="144" width="60" height="44" rx="8"/>
  <text class="d-text" x="250" y="172" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="300" y="144" width="60" height="44" rx="8"/>
  <text class="d-text" x="330" y="172" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="490" y="62" width="140" height="126" rx="10"/>
  <text class="d-sub" x="560" y="96" text-anchor="middle">sum expected 6</text>
  <text class="d-sub" x="560" y="124" text-anchor="middle">sum actual 4</text>
  <text class="d-text d-accent" x="560" y="160" text-anchor="middle">missing = 2</text>
</svg>

The expected total of \`0 + 1 + ... + n\` is \`n(n + 1) / 2\`. For \`n = 3\` that is 6. The array \`[3, 0, 1]\` adds up to 4, and \`6 - 4 = 2\`.

📌 **Interview term: Gauss sum formula** — the closed form \`n(n + 1) / 2\` for the sum \`1 + 2 + ... + n\` (adding 0 does not change it). Named after the story of young Carl Friedrich Gauss pairing 1 with 100, 2 with 99, and so on.

📌 **Interview term: Invariant** — a fact that is always true about the input, here "every value in \`0..n\` appears once except one". The fast solutions work by exploiting an invariant rather than searching.

## 4. Four Approaches, Worst to Best

1. **Sort, then scan.** After sorting, \`nums[i]\` should equal \`i\`; the first index where it does not is the answer (or \`n\` if all match). Simple, but sorting costs O(n log n) — see [Big-O notation](/interview-question/what-is-big-o-notation).
2. **Hash set.** Put every value in a set, then check \`0, 1, ..., n\` until one is absent. O(n) time, but O(n) extra memory. How a set gives average O(1) lookups is covered in [how a hash table works](/interview-question/how-does-a-hash-table-work).
3. **Sum formula.** \`expected - actual\`. O(n) time, O(1) space. The one trap: in fixed-width integer languages, \`n * (n + 1)\` can overflow.
4. **XOR.** XOR every index, \`n\`, and every value together. Equal numbers cancel, and only the missing one survives. O(n) time, O(1) space, and no overflow at all.

📌 **Interview term: XOR (exclusive or)** — a bitwise operation, written \`^\` in all four languages, with three properties that make it perfect here: \`a ^ a = 0\`, \`a ^ 0 = a\`, and the order of operations does not matter. More tricks like this are in [bit manipulation tricks](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="XOR pairs each index with an equal value. 0 pairs with 0, 1 with 1, 3 with 3, and 2 is left alone">
  <text class="d-sub" x="20" y="78">indices + n</text>
  <rect class="d-box" x="130" y="50" width="70" height="44" rx="8"/>
  <text class="d-text" x="165" y="78" text-anchor="middle">0</text>
  <rect class="d-box" x="230" y="50" width="70" height="44" rx="8"/>
  <text class="d-text" x="265" y="78" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="330" y="50" width="70" height="44" rx="8"/>
  <text class="d-text d-accent" x="365" y="78" text-anchor="middle">2</text>
  <rect class="d-box" x="430" y="50" width="70" height="44" rx="8"/>
  <text class="d-text" x="465" y="78" text-anchor="middle">3</text>
  <text class="d-sub" x="20" y="198">values</text>
  <rect class="d-box-muted" x="130" y="170" width="70" height="44" rx="8"/>
  <text class="d-text" x="165" y="198" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="230" y="170" width="70" height="44" rx="8"/>
  <text class="d-text" x="265" y="198" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="330" y="170" width="70" height="44" rx="8"/>
  <text class="d-text" x="365" y="198" text-anchor="middle">1</text>
  <path class="d-edge-dashed" d="M 165 94 L 265 170"/>
  <path class="d-edge-dashed" d="M 265 94 L 365 170"/>
  <path class="d-edge-dashed" d="M 465 94 L 165 170"/>
  <rect class="d-box-accent" x="540" y="100" width="100" height="70" rx="10"/>
  <text class="d-sub" x="590" y="126" text-anchor="middle">left over</text>
  <text class="d-text d-accent" x="590" y="154" text-anchor="middle">2</text>
</svg>

Every index from 0 to 3 is paired with an equal value in the array, except index 2. When everything is XORed together, each pair becomes 0, and the unpaired 2 is all that is left. The same cancelling idea solves [the single number problem](/interview-question/how-do-you-find-the-single-number-where-every-other-element-appears-twice).

📌 **Interview term: Integer overflow** — when a result is too large for the number type holding it. A 32-bit signed integer holds at most 2,147,483,647, so \`n * (n + 1)\` overflows once \`n\` passes about 46,340, even though the final answer would still fit.

A safe middle ground is the **running difference**: start with \`n\`, then add \`i - nums[i]\` for every index. It computes the same \`expected - actual\` value, but the running total never grows large, so it cannot overflow.

## 5. The Code in Java

The three O(n) methods from Example 1, as static methods of \`Main\`.

~~~java
static int missingBySum(int[] nums) {
    int n = nums.length;
    long total = (long) n * (n + 1) / 2;   // long: n * (n + 1) overflows int for large n
    for (int v : nums) total -= v;
    return (int) total;
}

static int missingByXor(int[] nums) {
    int x = nums.length;
    for (int i = 0; i < nums.length; i++) x ^= i ^ nums[i];
    return x;
}

static int missingBySet(int[] nums) {
    Set<Integer> seen = new HashSet<>();
    for (int v : nums) seen.add(v);           // autoboxing: int -> Integer
    for (int v = 0; v <= nums.length; v++) {
        if (!seen.contains(v)) return v;
    }
    return -1;
}
~~~

**Line by line:**

- \`(long) n * (n + 1)\` casts *before* multiplying, so the multiplication is done in 64 bits. Writing \`(long) (n * (n + 1))\` would cast an already-overflowed \`int\` and be wrong.
- The XOR loop folds in \`n\` by starting at \`nums.length\`.
- \`HashSet<Integer>\` stores boxed \`Integer\` objects: each \`seen.add(v)\` autoboxes the \`int\`. It works, but every element becomes a separate object on the heap.

## 6. Java Details That Matter Here

- **\`int\` overflow wraps silently.** Running \`System.out.println(Integer.MAX_VALUE + 1)\` printed \`-2147483648\`, with no exception. Example 2 shows the formula \`n * (n + 1) / 2\` producing a nonsense answer at \`n = 200000\`.
- **\`Math.multiplyExact\` and \`Math.addExact\`** throw \`ArithmeticException\` on overflow instead of wrapping, if you want a loud failure rather than a silent one.
- **Prefer \`boolean[] seen = new boolean[n + 1]\`** over \`HashSet<Integer>\` when you do want a "seen" structure: the values are bounded by \`n\`, so an array is a perfect hash with no boxing.

## 7. Verified: Running the Code

Each example below is in the **Java code** tab on this page. They were saved as \`Main.java\` and run with \`javac Main.java && java Main\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Sum, XOR and hash set on the standard cases**

~~~text
[3, 0, 1] -> sum=2 xor=2 set=2
[0, 1] -> sum=2 xor=2 set=2
[9, 6, 4, 2, 3, 5, 7, 0, 1] -> sum=8 xor=8 set=8
[0] -> sum=1 xor=1 set=1
[1] -> sum=0 xor=0 set=0
~~~

**What this shows:** All three methods agree on every case, including the two edges where the missing value is \`n\` (\`[0, 1]\`) or 0 (\`[1]\`).

**Example 2 — What 32-bit overflow does to the sum formula**

~~~text
n = 200000, missing = 123456
32-bit n*(n+1)/2 - sum : -2147360192
64-bit n*(n+1)/2 - sum : 123456
32-bit running i - nums[i]: 123456
xor                    : 123456
~~~

**What this shows:** With \`n = 200000\`, the true product \`n * (n + 1)\` is 40,000,200,000, far above the 32-bit limit of 2,147,483,647. Java \`int\` arithmetic wraps silently (\`Integer.MAX_VALUE + 1\` printed -2147483648, no exception). Notice the wrapped *array sum* is not the problem: wrapping is consistent, so it cancels out in the subtraction. What breaks is that \`n * (n + 1)\` overflows *before* the division by 2. Casting to \`long\` first, the running difference, or XOR all give 123456.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Sort, then scan | O(n log n) | O(1) to O(n) | The sort dominates; space depends on the sort |
| Hash set | O(n) average | O(n) | n inserts and up to n + 1 lookups |
| Sum formula | O(n) | O(1) | One pass to add the array |
| XOR | O(n) | O(1) | One pass, one integer of state |

## 9. Edge Cases

- **The missing number is \`n\`** (e.g. \`[0, 1]\` gives 2): the sort-and-scan method must return \`n\` when every index matches; sum and XOR handle it automatically.
- **The missing number is 0** (e.g. \`[1]\` gives 0).
- **A single element** \`[0]\` gives 1, and \`[1]\` gives 0.
- **Large \`n\`**: in Java and C++ the formula needs a 64-bit type or the running-difference form; Example 2 shows the 32-bit version going wrong at \`n = 200000\`.
- **Unsorted input** is the normal case; none of the O(n) methods care about order.

## 10. Common Pitfalls

- **\`int expected = n * (n + 1) / 2;\`** overflows for \`n\` above about 46,340. Use \`(long) n * (n + 1) / 2\`, XOR, or the running difference.
- **Casting too late.** \`(long) (n * (n + 1))\` overflows first and widens the wrong value.
- **Using \`HashSet<Integer>\` when \`boolean[]\` works.** The values are in \`0..n\`, so an array index is the cheapest possible lookup.
- **Sorting with \`Arrays.sort(nums)\`** mutates the caller array; clone it if the input must be preserved.
- **Forgetting the case where \`n\` is missing** in a sort-and-scan solution: if every \`nums[i] == i\`, return \`nums.length\`.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Expected total <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n * (n + 1) / 2</code> minus the actual total is the missing number; or XOR all indices, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> and all values.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">The range is fully known; every value appears once except one, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ a == 0</code> makes pairs cancel.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) extra space, versus O(n log n) for sorting or O(n) for a set.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The Java trap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> overflow wraps silently, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n * (n + 1)</code> overflows near <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n = 46341</code>, so I cast to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> before multiplying or I use XOR.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What I would ship:</strong> <span style="color:#f0e2c8;">The XOR version: no overflow, no boxing, one loop, and it reads clearly with a comment.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the overflowed array sum not a problem?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two's-complement wrapping is consistent, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">expected - actual</code> comes out right modulo 2^32 if both sides wrap the same way. The bug is that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n * (n + 1)</code> wraps *before* dividing by 2, which is not the same as wrapping the true total.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Math.addExact</code> do?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It adds two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>s and throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArithmeticException</code> on overflow instead of wrapping, which turns a silent bug into a visible one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashSet&lt;Integer&gt;</code>?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works in O(n) average time, but every value is boxed into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> object. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[n + 1]</code> does the same job with no objects.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if two numbers are missing?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">XOR everything to get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ b</code>, take a set bit with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &amp; -x</code>, split the numbers into two groups by that bit, and XOR each group.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the array is already sorted?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then binary search: the first index where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i] != i</code> is the answer, found in O(log n). See [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements).</span>
</div>


</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Gauss sum formula** | \`n(n + 1) / 2\`, the total of 0..n |
| **Invariant** | A fact that always holds about the input, used to shortcut the search |
| **XOR** | Bitwise exclusive or; \`a ^ a = 0\`, \`a ^ 0 = a\`, order does not matter |
| **Integer overflow** | A result too large for its number type |
| **Running difference** | Accumulating \`i - nums[i]\` so the total stays small |

---
**Conclusion:** The missing number is the difference between the known total of \`0..n\` and the array total, or equivalently the XOR of every index, \`n\` and every value. In Java, the formula hides a real trap: \`int\` arithmetic wraps silently, and Example 2 shows \`n * (n + 1) / 2\` going wrong at \`n = 200000\`. Cast to \`long\` before multiplying, or use XOR — one loop, constant space, no boxing, and no overflow.`,
        examples: [
          {
            label: "Sum, XOR and hash set on the standard cases",
            code: `import java.util.HashSet;
import java.util.Set;

public class Main {
    static int missingBySum(int[] nums) {
        int n = nums.length;
        long total = (long) n * (n + 1) / 2;   // long: n * (n + 1) overflows int for large n
        for (int v : nums) total -= v;
        return (int) total;
    }

    static int missingByXor(int[] nums) {
        int x = nums.length;
        for (int i = 0; i < nums.length; i++) x ^= i ^ nums[i];
        return x;
    }

    static int missingBySet(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int v : nums) seen.add(v);           // autoboxing: int -> Integer
        for (int v = 0; v <= nums.length; v++) {
            if (!seen.contains(v)) return v;
        }
        return -1;
    }

    static String fmt(int[] a) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < a.length; i++) {
            if (i > 0) sb.append(", ");
            sb.append(a[i]);
        }
        return sb.append("]").toString();
    }

    public static void main(String[] args) {
        int[][] tests = {{3, 0, 1}, {0, 1}, {9, 6, 4, 2, 3, 5, 7, 0, 1}, {0}, {1}};
        for (int[] nums : tests) {
            System.out.println(fmt(nums) + " -> sum=" + missingBySum(nums)
                + " xor=" + missingByXor(nums) + " set=" + missingBySet(nums));
        }
    }
}`,
          },
          {
            label: "What 32-bit overflow does to the sum formula",
            code: `public class Main {
    public static void main(String[] args) {
        int n = 200000, missing = 123456;
        int[] nums = new int[n];
        for (int v = 0, k = 0; v <= n; v++) if (v != missing) nums[k++] = v;

        int total32 = 0;
        for (int v : nums) total32 += v;            // wraps silently past 2^31 - 1
        int formula32 = n * (n + 1) / 2;            // n * (n + 1) overflows BEFORE the / 2
        System.out.println("n = " + n + ", missing = " + missing);
        System.out.println("32-bit n*(n+1)/2 - sum : " + (formula32 - total32));

        long total = (long) n * (n + 1) / 2;
        for (int v : nums) total -= v;
        System.out.println("64-bit n*(n+1)/2 - sum : " + total);

        int running = n;
        for (int i = 0; i < nums.length; i++) running += i - nums[i];
        System.out.println("32-bit running i - nums[i]: " + running);

        int x = n;
        for (int i = 0; i < nums.length; i++) x ^= i ^ nums[i];
        System.out.println("xor                    : " + x);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You have a \`std::vector<int>\` holding n distinct values from 0 to n, with exactly one value of that range missing. Write a C++ function that finds it in linear time and constant extra space."

**What a strong answer should cover:**
- The sum formula and the XOR method, and why each isolates the missing value.
- O(n) time, O(1) space; sorting is O(n log n); \`std::unordered_set\` costs O(n) memory.
- C++ specifics: signed \`int\` overflow is undefined behaviour, not wrapping, so compute the total in \`long long\` or use XOR.
- \`size_t\` versus \`int\`: \`nums.size()\` is unsigned, so cast deliberately before mixing it with signed arithmetic.
- Edge cases: missing 0 or n, single element.

**Clarifying questions expected:**
- "Are the values distinct, and is exactly one missing?" — the sum and XOR tricks depend on it.
- "Is the range 0..n or 1..n, and how large can n get?" — changes the formula and whether it overflows.

**Code / implementation expected:** Yes — a C++17 function; XOR or the \`long long\` sum.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know what an array and a loop are; nothing else is assumed.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the C++ code with \`g++ -std=c++17 main.cpp && ./a.out\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Picture a cloakroom with tickets numbered 0 to 10. At the end of the night, eleven tickets were handed out but only ten coats come back, and the attendant wants to know which ticket number never returned. She could line the returned tickets up in order and look for the gap (that is sorting), or tick them off on a checklist (that is a hash set). But there is a cleverer trick: she knows the numbers 0 to 10 add up to 55. Add up the ten returned tickets, subtract from 55, and the difference *is* the missing ticket. One pass, nothing written down.

That is the whole problem: you are given \`n\` distinct numbers taken from the range \`0..n\` (which has \`n + 1\` values), so exactly one value is absent. Interviewers like it because it has four correct answers of different quality, and the best two (the sum formula and XOR) reward you for noticing a mathematical property instead of reaching for a data structure.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the numbers guaranteed distinct, and is exactly one missing? | The sum and XOR tricks rely on it. With duplicates or two missing values you need a different method (see the follow-ups). |
| Is the range exactly \`0..n\` where \`n\` is the array length? | Some variants use \`1..n\`. The formula changes, so confirm the bounds before writing it. |
| How large can \`n\` be? | It decides whether \`n * (n + 1)\` fits in a 32-bit integer in Java or C++. |
| May I modify the input array? | The in-place index-marking trick rewrites the array; sum and XOR do not. |
| Do you want O(1) extra space? | It rules out the hash set and tells you the interviewer wants the sum or XOR answer. |

## 3. The Core Idea: Use What You Already Know About 0..n

The range \`0..n\` is not random; you know everything about it in advance. You know how many values it has (\`n + 1\`), you know their total, and you know that each value should appear exactly once. Compare that "expected" picture with the array, and the single difference is your answer.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 230" role="img" aria-label="Expected numbers 0 to 3 compared with the array 3 0 1. The number 2 has no match, and 6 minus 4 equals 2">
  <text class="d-text" x="330" y="26" text-anchor="middle">n = 3, so the numbers 0, 1, 2, 3 should all appear</text>
  <text class="d-sub" x="30" y="90">expected</text>
  <rect class="d-box" x="140" y="62" width="60" height="44" rx="8"/>
  <text class="d-text" x="170" y="90" text-anchor="middle">0</text>
  <rect class="d-box" x="220" y="62" width="60" height="44" rx="8"/>
  <text class="d-text" x="250" y="90" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="300" y="62" width="60" height="44" rx="8"/>
  <text class="d-text d-accent" x="330" y="90" text-anchor="middle">2</text>
  <rect class="d-box" x="380" y="62" width="60" height="44" rx="8"/>
  <text class="d-text" x="410" y="90" text-anchor="middle">3</text>
  <text class="d-sub" x="30" y="172">array</text>
  <rect class="d-box-muted" x="140" y="144" width="60" height="44" rx="8"/>
  <text class="d-text" x="170" y="172" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="220" y="144" width="60" height="44" rx="8"/>
  <text class="d-text" x="250" y="172" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="300" y="144" width="60" height="44" rx="8"/>
  <text class="d-text" x="330" y="172" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="490" y="62" width="140" height="126" rx="10"/>
  <text class="d-sub" x="560" y="96" text-anchor="middle">sum expected 6</text>
  <text class="d-sub" x="560" y="124" text-anchor="middle">sum actual 4</text>
  <text class="d-text d-accent" x="560" y="160" text-anchor="middle">missing = 2</text>
</svg>

The expected total of \`0 + 1 + ... + n\` is \`n(n + 1) / 2\`. For \`n = 3\` that is 6. The array \`[3, 0, 1]\` adds up to 4, and \`6 - 4 = 2\`.

📌 **Interview term: Gauss sum formula** — the closed form \`n(n + 1) / 2\` for the sum \`1 + 2 + ... + n\` (adding 0 does not change it). Named after the story of young Carl Friedrich Gauss pairing 1 with 100, 2 with 99, and so on.

📌 **Interview term: Invariant** — a fact that is always true about the input, here "every value in \`0..n\` appears once except one". The fast solutions work by exploiting an invariant rather than searching.

## 4. Four Approaches, Worst to Best

1. **Sort, then scan.** After sorting, \`nums[i]\` should equal \`i\`; the first index where it does not is the answer (or \`n\` if all match). Simple, but sorting costs O(n log n) — see [Big-O notation](/interview-question/what-is-big-o-notation).
2. **Hash set.** Put every value in a set, then check \`0, 1, ..., n\` until one is absent. O(n) time, but O(n) extra memory. How a set gives average O(1) lookups is covered in [how a hash table works](/interview-question/how-does-a-hash-table-work).
3. **Sum formula.** \`expected - actual\`. O(n) time, O(1) space. The one trap: in fixed-width integer languages, \`n * (n + 1)\` can overflow.
4. **XOR.** XOR every index, \`n\`, and every value together. Equal numbers cancel, and only the missing one survives. O(n) time, O(1) space, and no overflow at all.

📌 **Interview term: XOR (exclusive or)** — a bitwise operation, written \`^\` in all four languages, with three properties that make it perfect here: \`a ^ a = 0\`, \`a ^ 0 = a\`, and the order of operations does not matter. More tricks like this are in [bit manipulation tricks](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 250" role="img" aria-label="XOR pairs each index with an equal value. 0 pairs with 0, 1 with 1, 3 with 3, and 2 is left alone">
  <text class="d-sub" x="20" y="78">indices + n</text>
  <rect class="d-box" x="130" y="50" width="70" height="44" rx="8"/>
  <text class="d-text" x="165" y="78" text-anchor="middle">0</text>
  <rect class="d-box" x="230" y="50" width="70" height="44" rx="8"/>
  <text class="d-text" x="265" y="78" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="330" y="50" width="70" height="44" rx="8"/>
  <text class="d-text d-accent" x="365" y="78" text-anchor="middle">2</text>
  <rect class="d-box" x="430" y="50" width="70" height="44" rx="8"/>
  <text class="d-text" x="465" y="78" text-anchor="middle">3</text>
  <text class="d-sub" x="20" y="198">values</text>
  <rect class="d-box-muted" x="130" y="170" width="70" height="44" rx="8"/>
  <text class="d-text" x="165" y="198" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="230" y="170" width="70" height="44" rx="8"/>
  <text class="d-text" x="265" y="198" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="330" y="170" width="70" height="44" rx="8"/>
  <text class="d-text" x="365" y="198" text-anchor="middle">1</text>
  <path class="d-edge-dashed" d="M 165 94 L 265 170"/>
  <path class="d-edge-dashed" d="M 265 94 L 365 170"/>
  <path class="d-edge-dashed" d="M 465 94 L 165 170"/>
  <rect class="d-box-accent" x="540" y="100" width="100" height="70" rx="10"/>
  <text class="d-sub" x="590" y="126" text-anchor="middle">left over</text>
  <text class="d-text d-accent" x="590" y="154" text-anchor="middle">2</text>
</svg>

Every index from 0 to 3 is paired with an equal value in the array, except index 2. When everything is XORed together, each pair becomes 0, and the unpaired 2 is all that is left. The same cancelling idea solves [the single number problem](/interview-question/how-do-you-find-the-single-number-where-every-other-element-appears-twice).

📌 **Interview term: Integer overflow** — when a result is too large for the number type holding it. A 32-bit signed integer holds at most 2,147,483,647, so \`n * (n + 1)\` overflows once \`n\` passes about 46,340, even though the final answer would still fit.

A safe middle ground is the **running difference**: start with \`n\`, then add \`i - nums[i]\` for every index. It computes the same \`expected - actual\` value, but the running total never grows large, so it cannot overflow.

## 5. The Code in C++

The three O(n) methods from Example 1.

~~~cpp
#include <iostream>
#include <string>
#include <unordered_set>
#include <vector>

int missingBySum(const std::vector<int>& nums) {
    long long n = static_cast<long long>(nums.size());
    long long total = n * (n + 1) / 2;   // 64-bit: signed int overflow is undefined behaviour
    for (int v : nums) total -= v;
    return static_cast<int>(total);
}

int missingByXor(const std::vector<int>& nums) {
    int x = static_cast<int>(nums.size());
    for (int i = 0; i < static_cast<int>(nums.size()); i++) x ^= i ^ nums[i];
    return x;
}

int missingBySet(const std::vector<int>& nums) {
    std::unordered_set<int> seen(nums.begin(), nums.end());
    for (int v = 0; v <= static_cast<int>(nums.size()); v++) {
        if (seen.count(v) == 0) return v;
    }
    return -1;
}
~~~

**Line by line:**

- \`long long n = static_cast<long long>(nums.size())\` converts the unsigned \`size_t\` once, so the whole formula runs in signed 64-bit arithmetic.
- The XOR loop casts the size to \`int\` for the loop counter, avoiding a signed/unsigned comparison warning.
- \`std::unordered_set<int> seen(nums.begin(), nums.end())\` builds the set from the iterator range in one line; \`seen.count(v)\` returns 0 or 1.

## 6. C++ Details That Matter Here

- **Signed overflow is undefined behaviour.** In C++ the compiler may assume a signed \`int\` never overflows, so \`n * (n + 1)\` with a large \`int n\` is not just "wrong", it makes the program undefined. Example 2 therefore models the 32-bit wrap with \`uint32_t\`, whose arithmetic is defined modulo 2^32.
- **\`size_t\` is unsigned.** \`nums.size() - 1\` on an empty vector wraps around to a huge number. Cast to a signed type before subtracting.
- **\`std::accumulate\` pitfall.** \`std::accumulate(v.begin(), v.end(), 0)\` accumulates in \`int\` because the initial value \`0\` is an \`int\`; pass \`0LL\` to accumulate in \`long long\`.

## 7. Verified: Running the Code

Each example below is in the **C++ code** tab on this page. They were saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Sum, XOR and hash set on the standard cases**

~~~text
[3, 0, 1] -> sum=2 xor=2 set=2
[0, 1] -> sum=2 xor=2 set=2
[9, 6, 4, 2, 3, 5, 7, 0, 1] -> sum=8 xor=8 set=8
[0] -> sum=1 xor=1 set=1
[1] -> sum=0 xor=0 set=0
~~~

**What this shows:** All three methods agree on every case, including the two edges where the missing value is \`n\` (\`[0, 1]\`) or 0 (\`[1]\`).

**Example 2 — What 32-bit overflow does to the sum formula**

~~~text
n = 200000, missing = 123456
32-bit n*(n+1)/2 - sum : -2147360192
64-bit n*(n+1)/2 - sum : 123456
32-bit running i - nums[i]: 123456
xor                    : 123456
~~~

**What this shows:** With \`n = 200000\`, the true product \`n * (n + 1)\` is 40,000,200,000, far above the 32-bit limit of 2,147,483,647. In C++ signed integer overflow is undefined behaviour, so this example must not overflow an \`int\` on purpose; it uses \`uint32_t\`, whose arithmetic is defined to wrap modulo 2^32, to model what a 32-bit register does. The wrapped formula is wrong; \`long long\`, the running difference and XOR all give 123456.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Sort, then scan | O(n log n) | O(1) to O(n) | The sort dominates; space depends on the sort |
| Hash set | O(n) average | O(n) | n inserts and up to n + 1 lookups |
| Sum formula | O(n) | O(1) | One pass to add the array |
| XOR | O(n) | O(1) | One pass, one integer of state |

## 9. Edge Cases

- **The missing number is \`n\`** (e.g. \`[0, 1]\` gives 2): the sort-and-scan method must return \`n\` when every index matches; sum and XOR handle it automatically.
- **The missing number is 0** (e.g. \`[1]\` gives 0).
- **A single element** \`[0]\` gives 1, and \`[1]\` gives 0.
- **Large \`n\`**: in Java and C++ the formula needs a 64-bit type or the running-difference form; Example 2 shows the 32-bit version going wrong at \`n = 200000\`.
- **Unsorted input** is the normal case; none of the O(n) methods care about order.

## 10. Common Pitfalls

- **\`int expected = n * (n + 1) / 2;\`** is undefined behaviour once the product passes 2^31 - 1. Use \`long long\`, XOR, or the running difference.
- **\`std::accumulate(..., 0)\`** sums in \`int\`; write \`0LL\`.
- **Mixing \`size_t\` and \`int\`.** \`for (int i = 0; i < nums.size(); i++)\` compiles with a warning; \`nums.size() - 1\` underflows for an empty vector.
- **\`std::sort(nums.begin(), nums.end())\`** on a \`const&\` parameter does not compile, and on a non-const one it mutates the caller data.
- **Assuming \`^\` is power.** It is XOR in C++; use \`std::pow\` for powers (and avoid floats for integer maths).

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Expected total <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n * (n + 1) / 2</code> minus the actual total is the missing value; or XOR all indices, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n</code> and values.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is correct:</strong> <span style="color:#f0e2c8;">The range is fully known; every value appears once except one, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ a == 0</code> cancels pairs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) extra space; sorting is O(n log n) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_set</code> is O(n) memory.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The C++ trap:</strong> <span style="color:#f0e2c8;">Signed overflow is undefined behaviour, so I compute the total in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> (or use XOR) and convert <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size()</code> deliberately.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What I would ship:</strong> <span style="color:#f0e2c8;">XOR: one loop, no overflow, no extra memory, no undefined behaviour to reason about.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is signed overflow worse in C++ than in Java?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Java defines <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> overflow as wrapping. C++ leaves signed overflow undefined, so the optimiser may assume it never happens and the program can behave arbitrarily.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you model 32-bit wrapping safely?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do the arithmetic in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uint32_t</code>, which is defined modulo 2^32, as Example 2 does, then reinterpret the bits as signed for display.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is wrong with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::accumulate(v.begin(), v.end(), 0)</code>?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The accumulator type is the type of the initial value, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, so a large sum overflows. Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0LL</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if two numbers are missing?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">XOR everything to get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ b</code>, isolate a set bit with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &amp; -x</code>, split the values into two groups by that bit, and XOR each group.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the vector is sorted?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Binary search for the first index where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i] != i</code>, O(log n). See [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements).</span>
</div>


</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Gauss sum formula** | \`n(n + 1) / 2\`, the total of 0..n |
| **Invariant** | A fact that always holds about the input, used to shortcut the search |
| **XOR** | Bitwise exclusive or; \`a ^ a = 0\`, \`a ^ 0 = a\`, order does not matter |
| **Integer overflow** | A result too large for its number type |
| **Running difference** | Accumulating \`i - nums[i]\` so the total stays small |

---
**Conclusion:** Comparing the known range \`0..n\` with the vector gives the missing value in one pass: either \`n(n + 1) / 2\` minus the total, or the XOR of every index, \`n\` and every value. In C++ the formula must be computed in \`long long\` because signed overflow is undefined behaviour, not a harmless wrap — Example 2 uses \`uint32_t\` to show the wrong result a 32-bit computation would produce. XOR sidesteps the whole issue and is the version to ship.`,
        examples: [
          {
            label: "Sum, XOR and hash set on the standard cases",
            code: `#include <iostream>
#include <string>
#include <unordered_set>
#include <vector>

int missingBySum(const std::vector<int>& nums) {
    long long n = static_cast<long long>(nums.size());
    long long total = n * (n + 1) / 2;   // 64-bit: signed int overflow is undefined behaviour
    for (int v : nums) total -= v;
    return static_cast<int>(total);
}

int missingByXor(const std::vector<int>& nums) {
    int x = static_cast<int>(nums.size());
    for (int i = 0; i < static_cast<int>(nums.size()); i++) x ^= i ^ nums[i];
    return x;
}

int missingBySet(const std::vector<int>& nums) {
    std::unordered_set<int> seen(nums.begin(), nums.end());
    for (int v = 0; v <= static_cast<int>(nums.size()); v++) {
        if (seen.count(v) == 0) return v;
    }
    return -1;
}

std::string fmt(const std::vector<int>& a) {
    std::string s = "[";
    for (size_t i = 0; i < a.size(); i++) {
        if (i > 0) s += ", ";
        s += std::to_string(a[i]);
    }
    return s + "]";
}

int main() {
    std::vector<std::vector<int>> tests = {{3, 0, 1}, {0, 1}, {9, 6, 4, 2, 3, 5, 7, 0, 1}, {0}, {1}};
    for (const auto& nums : tests) {
        std::cout << fmt(nums) << " -> sum=" << missingBySum(nums)
                  << " xor=" << missingByXor(nums) << " set=" << missingBySet(nums) << "\\n";
    }
    return 0;
}`,
          },
          {
            label: "What 32-bit overflow does to the sum formula",
            code: `#include <cstdint>
#include <iostream>
#include <vector>

// Signed int overflow is undefined behaviour in C++, so we model the 32-bit
// wrap with uint32_t (unsigned arithmetic is defined modulo 2^32) and then
// reinterpret the bits as a signed value.
int64_t asSigned(uint32_t u) {
    return u >= 2147483648u ? static_cast<int64_t>(u) - 4294967296LL : static_cast<int64_t>(u);
}

int main() {
    const int n = 200000, missing = 123456;
    std::vector<int> nums;
    for (int v = 0; v <= n; v++) if (v != missing) nums.push_back(v);

    uint32_t total32 = 0;
    for (int v : nums) total32 += static_cast<uint32_t>(v);
    int64_t product32 = asSigned(static_cast<uint32_t>(n) * static_cast<uint32_t>(n + 1));
    int64_t formula32 = product32 / 2;  // truncates toward zero, like int division
    std::cout << "n = " << n << ", missing = " << missing << "\\n";
    std::cout << "32-bit n*(n+1)/2 - sum : "
              << asSigned(static_cast<uint32_t>(formula32 - asSigned(total32))) << "\\n";

    long long total = static_cast<long long>(n) * (n + 1) / 2;
    for (int v : nums) total -= v;
    std::cout << "64-bit n*(n+1)/2 - sum : " << total << "\\n";

    uint32_t running = n;
    for (int i = 0; i < static_cast<int>(nums.size()); i++)
        running += static_cast<uint32_t>(i) - static_cast<uint32_t>(nums[i]);
    std::cout << "32-bit running i - nums[i]: " << asSigned(running) << "\\n";

    int x = n;
    for (int i = 0; i < static_cast<int>(nums.size()); i++) x ^= i ^ nums[i];
    std::cout << "xor                    : " << x << "\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
  {
    title: "How do you compute the product of an array except self without division?",
    difficulty: "medium",
    seoDescription: "Product of array except self without division: prefix and suffix products in O(n) time and O(1) extra space, in Python, JavaScript, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a list of integers, return a new list where each position holds the product of every other element. You may not use division, and I want it in linear time. Please write it in Python."

**What a strong answer should cover:**
- Answer at \`i\` = product of everything to the left times product of everything to the right.
- Two passes: fill \`answer\` with prefix products, then multiply in a running suffix product walking backwards.
- O(n) time, O(1) extra space (the output list is not counted); why division fails with zeros.
- Python specifics: \`[1] * n\` is safe for ints, \`range(n - 1, -1, -1)\` walks backwards, ints never overflow, and \`itertools.accumulate(nums, operator.mul)\` gives prefix products.
- Edge cases: one zero, several zeros, negatives.

**Clarifying questions expected:**
- "Can there be zeros, and is division really off the table?" — zeros are what make division fail.
- "Does the product fit in 32 bits, and does the output array count as extra space?"

**Code / implementation expected:** Yes — a two-pass function in Python.`,
        answer: `**Target Audience:** Beginners to intermediate candidates — you should know arrays and loops; prefix sums help but are explained here.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the Python code with \`python3 main.py\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Imagine four friends who each bring one ingredient to a shared recipe, and the recipe's strength is the product of all the ingredients. Now each friend asks: "how strong would it be *without me*?" The quick answer is "take the full product and divide by my part" — but the moment one friend brought an ingredient of strength 0, the full product is 0 and you cannot divide by zero. Worse, the interviewer has banned division outright.

So each friend needs "the product of everyone to my left" times "the product of everyone to my right". If you walk the line once from left to right, you can hand each friend the product of everyone before them. Walk back once from right to left, and you can multiply in everyone after them. Two walks, no division, and zeros are no longer special. That is the whole trick, and it is the same idea as a [prefix sum](/interview-question/what-is-the-prefix-sum-technique), with multiplication instead of addition.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is division really not allowed? | It is the defining constraint. Even if it were allowed, zeros make division fragile. |
| Can the array contain zeros or negative numbers? | Zeros break division; negatives change nothing for the prefix method but are worth a test. |
| Is the product guaranteed to fit in a 32-bit integer? | In Java and C++ it decides between \`int\` and a 64-bit type. |
| Does the output array count towards the extra space? | The usual convention is no, which makes the two-pass solution O(1) extra space. |
| What is the minimum length? | Usually at least 2; for length 1 the answer is \`[1]\` (an empty product). |

## 3. The Core Idea: Left Products Times Right Products

For each index \`i\`, the answer is (product of everything before \`i\`) times (product of everything after \`i\`).

📌 **Interview term: Prefix product** — the running product of the elements *before* an index. For \`[1, 2, 3, 4]\` the prefix products are \`[1, 1, 2, 6]\`; the first one is 1 because nothing comes before index 0.

📌 **Interview term: Suffix product** — the running product of the elements *after* an index: \`[24, 12, 4, 1]\` for the same array.

📌 **Interview term: Empty product** — the product of no numbers, defined as 1 (the multiplication identity), just as an empty sum is 0. It is why both running products start at 1.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 330" role="img" aria-label="For nums 1 2 3 4, the left products are 1 1 2 6, the right products are 24 12 4 1, and their element-wise product is 24 12 8 6">
  <defs>
    <marker id="b06q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="47">nums</text>
  <rect class="d-box-muted" x="170" y="20" width="70" height="42" rx="8"/>
  <text class="d-text" x="205" y="47" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="270" y="20" width="70" height="42" rx="8"/>
  <text class="d-text" x="305" y="47" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="370" y="20" width="70" height="42" rx="8"/>
  <text class="d-text" x="405" y="47" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="470" y="20" width="70" height="42" rx="8"/>
  <text class="d-text" x="505" y="47" text-anchor="middle">4</text>
  <text class="d-sub" x="20" y="127">left product</text>
  <rect class="d-box" x="170" y="100" width="70" height="42" rx="8"/>
  <text class="d-text" x="205" y="127" text-anchor="middle">1</text>
  <rect class="d-box" x="270" y="100" width="70" height="42" rx="8"/>
  <text class="d-text" x="305" y="127" text-anchor="middle">1</text>
  <rect class="d-box" x="370" y="100" width="70" height="42" rx="8"/>
  <text class="d-text" x="405" y="127" text-anchor="middle">2</text>
  <rect class="d-box" x="470" y="100" width="70" height="42" rx="8"/>
  <text class="d-text" x="505" y="127" text-anchor="middle">6</text>
  <path class="d-edge-accent" d="M 170 154 L 510 154" marker-end="url(#b06q2-arrow)"/>
  <text class="d-sub" x="20" y="207">right product</text>
  <rect class="d-box" x="170" y="180" width="70" height="42" rx="8"/>
  <text class="d-text" x="205" y="207" text-anchor="middle">24</text>
  <rect class="d-box" x="270" y="180" width="70" height="42" rx="8"/>
  <text class="d-text" x="305" y="207" text-anchor="middle">12</text>
  <rect class="d-box" x="370" y="180" width="70" height="42" rx="8"/>
  <text class="d-text" x="405" y="207" text-anchor="middle">4</text>
  <rect class="d-box" x="470" y="180" width="70" height="42" rx="8"/>
  <text class="d-text" x="505" y="207" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 510 234 L 170 234" marker-end="url(#b06q2-arrow)"/>
  <text class="d-sub" x="20" y="287">answer</text>
  <rect class="d-box" x="170" y="260" width="70" height="42" rx="8"/>
  <text class="d-text" x="205" y="287" text-anchor="middle">24</text>
  <rect class="d-box" x="270" y="260" width="70" height="42" rx="8"/>
  <text class="d-text" x="305" y="287" text-anchor="middle">12</text>
  <rect class="d-box-accent" x="370" y="260" width="70" height="42" rx="8"/>
  <text class="d-text d-accent" x="405" y="287" text-anchor="middle">8</text>
  <rect class="d-box" x="470" y="260" width="70" height="42" rx="8"/>
  <text class="d-text" x="505" y="287" text-anchor="middle">6</text>
</svg>

The left-product row is built walking right, the right-product row walking left, and each answer is the two numbers in its column multiplied together. Index 2 is highlighted; the next diagram zooms in on it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="For index 2, everything to the left multiplies to 2, everything to the right multiplies to 4, so the answer at index 2 is 8">
  <rect class="d-box" x="40" y="30" width="70" height="44" rx="8"/>
  <text class="d-text" x="75" y="58" text-anchor="middle">1</text>
  <rect class="d-box" x="130" y="30" width="70" height="44" rx="8"/>
  <text class="d-text" x="165" y="58" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="220" y="30" width="70" height="44" rx="8"/>
  <text class="d-sub" x="255" y="58" text-anchor="middle">3 skip</text>
  <rect class="d-box" x="310" y="30" width="70" height="44" rx="8"/>
  <text class="d-text" x="345" y="58" text-anchor="middle">4</text>
  <path class="d-edge" d="M 40 96 L 200 96"/>
  <text class="d-sub" x="120" y="126" text-anchor="middle">left of i: 1 x 2 = 2</text>
  <path class="d-edge" d="M 310 96 L 380 96"/>
  <text class="d-sub" x="345" y="126" text-anchor="middle">right: 4</text>
  <rect class="d-box-accent" x="440" y="30" width="170" height="110" rx="10"/>
  <text class="d-sub" x="525" y="66" text-anchor="middle">answer at i = 2</text>
  <text class="d-text d-accent" x="525" y="104" text-anchor="middle">2 x 4 = 8</text>
</svg>

The element at index 2 is skipped; the 2 on its left and the 4 on its right multiply to 8.

## 4. From Brute Force to O(1) Extra Space

1. **Brute force, O(n²).** For each \`i\`, loop over every \`j != i\` and multiply. Example 2 counts 999,000 multiplications for \`n = 1000\`.
2. **Division, O(n) — but forbidden and fragile.** Total product divided by \`nums[i]\`. With one zero, every answer except the zero position is 0 and you divide by zero at that position; with two zeros everything is 0. You would need special cases, and the interviewer said no division anyway.
3. **Two extra arrays, O(n) time and O(n) space.** Build \`left[]\` and \`right[]\` and multiply them.
4. **Two passes into the output, O(n) time and O(1) extra space.** Store the left products directly in \`answer\`, then walk back with a single running variable \`suffix\` and multiply it in. Example 2 counts 3,000 multiplications for \`n = 1000\`.

📌 **Interview term: Auxiliary (extra) space** — memory used beyond the input and the required output. Approach 4 uses only two variables, so its auxiliary space is O(1); see [space complexity](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

📌 **Interview term: Two-pass algorithm** — one that scans the data a fixed number of times (here twice: forwards, then backwards). Two passes is still O(n).

**Why zeros need no special case:** a zero at index \`z\` simply makes every prefix product after \`z\` and every suffix product before \`z\` equal 0, while the answer at \`z\` itself is the product of all the others. Running \`[5, 0, 2]\` in Example 1 gives \`[0, 10, 0]\`.

## 5. The Code in Python

The solution from Example 1.

~~~python
def product_except_self(nums):
    n = len(nums)
    answer = [1] * n
    prefix = 1
    for i in range(n):          # pass 1: answer[i] = product of everything LEFT of i
        answer[i] = prefix
        prefix *= nums[i]
    suffix = 1
    for i in range(n - 1, -1, -1):  # pass 2: multiply in everything RIGHT of i
        answer[i] *= suffix
        suffix *= nums[i]
    return answer
~~~

**Line by line:**

- \`answer = [1] * n\` creates a list of \`n\` ones. Repeating a list with \`*\` is safe here because ints are immutable; it is only a trap with nested lists (see Pitfalls).
- Pass 1 writes \`prefix\` into \`answer[i]\` *before* multiplying \`nums[i]\` in, so \`answer[i]\` holds the product strictly to the left.
- Pass 2 uses \`range(n - 1, -1, -1)\` (stop is exclusive, so -1 means "down to 0"). \`reversed(range(n))\` is an equivalent, more readable spelling.

## 6. Python Details That Matter Here

- **No overflow.** Python ints are arbitrary precision, so the products are always exact. The price is speed: multiplying huge numbers is slower than multiplying machine integers, but for interview inputs that does not matter.
- **\`itertools.accumulate(nums, operator.mul)\`** computes running products; on \`[1, 2, 3, 4]\` it returned \`[1, 2, 6, 24]\`. Note it is *inclusive* (includes the current element), so for this problem you would shift it by one; the explicit loop is clearer.
- **\`math.prod\`** multiplies an iterable in one call — handy for the brute force, but calling it inside a loop for every \`i\` is still O(n²).

## 7. Verified: Running the Code

Each example below is in the **Python code** tab on this page. They were saved as \`main.py\` and run with \`python3 main.py\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Two-pass product except self on five arrays**

~~~text
[1, 2, 3, 4] -> [24, 12, 8, 6]
[-1, 1, 0, -3, 3] -> [0, 0, 9, 0, 0]
[5, 0, 2] -> [0, 10, 0]
[0, 0] -> [0, 0]
[2, 3] -> [3, 2]
~~~

**What this shows:** The standard case, a single zero, two zeros, negatives and the length-2 case all come out right with no special handling.

**Example 2 — Counting multiplications: brute force vs two passes**

~~~text
n=10: brute 90 mults, two-pass 30 mults, same answer: true
n=100: brute 9900 mults, two-pass 300 mults, same answer: true
n=1000: brute 999000 mults, two-pass 3000 mults, same answer: true
~~~

**What this shows:** Brute force does \`n * (n - 1)\` multiplications (999,000 at \`n = 1000\`); the two-pass method does \`3n\` (3,000), and both produce the same array. The gap grows with \`n\`: the brute force is O(n²), the two-pass method O(n).

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) extra | n - 1 multiplications for each of n positions |
| Division | O(n) | O(1) extra | Not allowed, and zeros need special cases |
| Left and right arrays | O(n) | O(n) extra | Two helper arrays of length n |
| Two passes into the output | O(n) | O(1) extra | One running variable; the output array is not counted |

## 9. Edge Cases

- **One zero** (\`[5, 0, 2]\` gives \`[0, 10, 0]\`): only the zero position is non-zero.
- **Two or more zeros** (\`[0, 0]\` gives \`[0, 0]\`): every answer is 0.
- **Negative numbers** (\`[-1, 1, 0, -3, 3]\` gives \`[0, 0, 9, 0, 0]\`): signs work out naturally.
- **Length 2** (\`[2, 3]\` gives \`[3, 2]\`): each answer is simply the other element.
- **Length 1**: the answer is \`[1]\`, the empty product, if the problem allows it.

## 10. Common Pitfalls

- **Using division** \`total // nums[i]\`: it raises \`ZeroDivisionError\` when an element is 0, and the problem forbids it.
- **Writing \`prefix *= nums[i]\` before \`answer[i] = prefix\`.** Then \`answer[i]\` includes \`nums[i]\` itself.
- **\`range(n - 1, 0, -1)\`** stops at index 1 and never updates index 0. The stop must be -1.
- **Nested \`[[1] * n] * m\`** shares one inner list across rows; harmless for this 1D problem, but a classic trap if you extend to a grid. On \`[[0] * 2] * 2\`, setting \`a[0][0] = 5\` printed \`[[5, 0], [5, 0]]\`.
- **Calling \`math.prod\` per index** looks neat but is the O(n²) brute force.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">The answer at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> is the product of everything left of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> times the product of everything right of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pass one:</strong> <span style="color:#f0e2c8;">Walk left to right with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix = 1</code>; store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">answer[i]</code>, then multiply <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> into it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pass two:</strong> <span style="color:#f0e2c8;">Walk right to left with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">suffix = 1</code>; multiply <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">answer[i]</code> by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">suffix</code>, then multiply <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code> into it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) extra space beyond the output list; brute force would be O(n²).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why not division:</strong> <span style="color:#f0e2c8;">A zero makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total // nums[i]</code> raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ZeroDivisionError</code>, and the prefix method needs no special case for zeros.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with a zero in the input?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only the zero position gets a non-zero answer, the product of the others. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[5, 0, 2]</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 10, 0]</code> with no extra code.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you do it in one pass?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You can fill from both ends in the same loop (index <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> from the left and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n - 1 - i</code> from the right), but it is still two running products and still O(n); it is not asymptotically better.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does overflow matter in Python?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, ints are arbitrary precision. In Java or C++ you would ask whether the product fits in 32 bits.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you do it if division were allowed?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count zeros: with two or more, all zeros; with one, only that index gets the product of the non-zero values; with none, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total // x</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where else does this pattern appear?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Any "everything except me" query: prefix and suffix maxima, [trapping rain water](/interview-question/how-do-you-solve-the-trapping-rain-water-problem), and range sums with [prefix sums](/interview-question/what-is-the-prefix-sum-technique).</span>
</div>


</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix product** | Product of all elements before an index |
| **Suffix product** | Product of all elements after an index |
| **Empty product** | The product of no numbers, which is 1 |
| **Auxiliary space** | Memory used beyond the input and the output |
| **Two-pass algorithm** | Scans the data a fixed number of times; still O(n) |

---
**Conclusion:** Product of array except self is a prefix-and-suffix problem in disguise: each answer is the product to the left times the product to the right. In Python, two loops over \`range(n)\` and \`range(n - 1, -1, -1)\` with one running variable each give O(n) time and O(1) extra space, handle zeros and negatives with no special cases, and never overflow because Python ints are arbitrary precision. Knowing why division fails (zeros) is half of the answer.`,
        examples: [
          {
            label: "Two-pass product except self on five arrays",
            code: `def product_except_self(nums):
    n = len(nums)
    answer = [1] * n
    prefix = 1
    for i in range(n):          # pass 1: answer[i] = product of everything LEFT of i
        answer[i] = prefix
        prefix *= nums[i]
    suffix = 1
    for i in range(n - 1, -1, -1):  # pass 2: multiply in everything RIGHT of i
        answer[i] *= suffix
        suffix *= nums[i]
    return answer


def fmt(a):
    return "[" + ", ".join(str(v) for v in a) + "]"


tests = [[1, 2, 3, 4], [-1, 1, 0, -3, 3], [5, 0, 2], [0, 0], [2, 3]]
for nums in tests:
    print(fmt(nums) + " -> " + fmt(product_except_self(nums)))`,
          },
          {
            label: "Counting multiplications: brute force vs two passes",
            code: `# Count multiplications: brute force (for every i, multiply all j != i)
# versus the two-pass prefix/suffix method.
def brute(nums):
    mults = 0
    out = []
    for i in range(len(nums)):
        p = 1
        for j in range(len(nums)):
            if j != i:
                p *= nums[j]
                mults += 1
        out.append(p)
    return out, mults


def two_pass(nums):
    n, mults = len(nums), 0
    answer = [1] * n
    prefix = 1
    for i in range(n):
        answer[i] = prefix
        prefix *= nums[i]
        mults += 1
    suffix = 1
    for i in range(n - 1, -1, -1):
        answer[i] *= suffix
        suffix *= nums[i]
        mults += 2
    return answer, mults


for n in [10, 100, 1000]:
    nums = [1 if i % 3 else -1 for i in range(n)]   # small values: no overflow
    a, ma = brute(nums)
    b, mb = two_pass(nums)
    print("n=" + str(n) + ": brute " + str(ma) + " mults, two-pass " + str(mb)
          + " mults, same answer: " + str(a == b).lower())`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Write a JavaScript function that takes an array of integers and returns an array where each element is the product of all the other elements — without using division, and in O(n) time."

**What a strong answer should cover:**
- Answer at \`i\` = left product times right product.
- Two passes into the output array, with \`prefix\` and \`suffix\` running variables starting at 1.
- O(n) time, O(1) extra space; why division breaks on zeros (it produces \`Infinity\` or \`NaN\` in JS rather than an error).
- JavaScript specifics: \`new Array(n).fill(1)\`, numbers lose integer precision above 2^53 - 1, and \`0 * -9\` is \`-0\`.
- Edge cases: zeros and negatives.

**Clarifying questions expected:**
- "Can there be zeros, and is division really off the table?" — zeros are what make division fail.
- "Does the product fit in 32 bits, and does the output array count as extra space?"

**Code / implementation expected:** Yes — a two-pass function in JavaScript.`,
        answer: `**Target Audience:** Beginners to intermediate candidates — you should know arrays and loops; prefix sums help but are explained here.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the JavaScript code with \`node main.js\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Imagine four friends who each bring one ingredient to a shared recipe, and the recipe's strength is the product of all the ingredients. Now each friend asks: "how strong would it be *without me*?" The quick answer is "take the full product and divide by my part" — but the moment one friend brought an ingredient of strength 0, the full product is 0 and you cannot divide by zero. Worse, the interviewer has banned division outright.

So each friend needs "the product of everyone to my left" times "the product of everyone to my right". If you walk the line once from left to right, you can hand each friend the product of everyone before them. Walk back once from right to left, and you can multiply in everyone after them. Two walks, no division, and zeros are no longer special. That is the whole trick, and it is the same idea as a [prefix sum](/interview-question/what-is-the-prefix-sum-technique), with multiplication instead of addition.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is division really not allowed? | It is the defining constraint. Even if it were allowed, zeros make division fragile. |
| Can the array contain zeros or negative numbers? | Zeros break division; negatives change nothing for the prefix method but are worth a test. |
| Is the product guaranteed to fit in a 32-bit integer? | In Java and C++ it decides between \`int\` and a 64-bit type. |
| Does the output array count towards the extra space? | The usual convention is no, which makes the two-pass solution O(1) extra space. |
| What is the minimum length? | Usually at least 2; for length 1 the answer is \`[1]\` (an empty product). |

## 3. The Core Idea: Left Products Times Right Products

For each index \`i\`, the answer is (product of everything before \`i\`) times (product of everything after \`i\`).

📌 **Interview term: Prefix product** — the running product of the elements *before* an index. For \`[1, 2, 3, 4]\` the prefix products are \`[1, 1, 2, 6]\`; the first one is 1 because nothing comes before index 0.

📌 **Interview term: Suffix product** — the running product of the elements *after* an index: \`[24, 12, 4, 1]\` for the same array.

📌 **Interview term: Empty product** — the product of no numbers, defined as 1 (the multiplication identity), just as an empty sum is 0. It is why both running products start at 1.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 330" role="img" aria-label="For nums 1 2 3 4, the left products are 1 1 2 6, the right products are 24 12 4 1, and their element-wise product is 24 12 8 6">
  <defs>
    <marker id="b06q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="47">nums</text>
  <rect class="d-box-muted" x="170" y="20" width="70" height="42" rx="8"/>
  <text class="d-text" x="205" y="47" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="270" y="20" width="70" height="42" rx="8"/>
  <text class="d-text" x="305" y="47" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="370" y="20" width="70" height="42" rx="8"/>
  <text class="d-text" x="405" y="47" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="470" y="20" width="70" height="42" rx="8"/>
  <text class="d-text" x="505" y="47" text-anchor="middle">4</text>
  <text class="d-sub" x="20" y="127">left product</text>
  <rect class="d-box" x="170" y="100" width="70" height="42" rx="8"/>
  <text class="d-text" x="205" y="127" text-anchor="middle">1</text>
  <rect class="d-box" x="270" y="100" width="70" height="42" rx="8"/>
  <text class="d-text" x="305" y="127" text-anchor="middle">1</text>
  <rect class="d-box" x="370" y="100" width="70" height="42" rx="8"/>
  <text class="d-text" x="405" y="127" text-anchor="middle">2</text>
  <rect class="d-box" x="470" y="100" width="70" height="42" rx="8"/>
  <text class="d-text" x="505" y="127" text-anchor="middle">6</text>
  <path class="d-edge-accent" d="M 170 154 L 510 154" marker-end="url(#b06q2-arrow)"/>
  <text class="d-sub" x="20" y="207">right product</text>
  <rect class="d-box" x="170" y="180" width="70" height="42" rx="8"/>
  <text class="d-text" x="205" y="207" text-anchor="middle">24</text>
  <rect class="d-box" x="270" y="180" width="70" height="42" rx="8"/>
  <text class="d-text" x="305" y="207" text-anchor="middle">12</text>
  <rect class="d-box" x="370" y="180" width="70" height="42" rx="8"/>
  <text class="d-text" x="405" y="207" text-anchor="middle">4</text>
  <rect class="d-box" x="470" y="180" width="70" height="42" rx="8"/>
  <text class="d-text" x="505" y="207" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 510 234 L 170 234" marker-end="url(#b06q2-arrow)"/>
  <text class="d-sub" x="20" y="287">answer</text>
  <rect class="d-box" x="170" y="260" width="70" height="42" rx="8"/>
  <text class="d-text" x="205" y="287" text-anchor="middle">24</text>
  <rect class="d-box" x="270" y="260" width="70" height="42" rx="8"/>
  <text class="d-text" x="305" y="287" text-anchor="middle">12</text>
  <rect class="d-box-accent" x="370" y="260" width="70" height="42" rx="8"/>
  <text class="d-text d-accent" x="405" y="287" text-anchor="middle">8</text>
  <rect class="d-box" x="470" y="260" width="70" height="42" rx="8"/>
  <text class="d-text" x="505" y="287" text-anchor="middle">6</text>
</svg>

The left-product row is built walking right, the right-product row walking left, and each answer is the two numbers in its column multiplied together. Index 2 is highlighted; the next diagram zooms in on it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="For index 2, everything to the left multiplies to 2, everything to the right multiplies to 4, so the answer at index 2 is 8">
  <rect class="d-box" x="40" y="30" width="70" height="44" rx="8"/>
  <text class="d-text" x="75" y="58" text-anchor="middle">1</text>
  <rect class="d-box" x="130" y="30" width="70" height="44" rx="8"/>
  <text class="d-text" x="165" y="58" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="220" y="30" width="70" height="44" rx="8"/>
  <text class="d-sub" x="255" y="58" text-anchor="middle">3 skip</text>
  <rect class="d-box" x="310" y="30" width="70" height="44" rx="8"/>
  <text class="d-text" x="345" y="58" text-anchor="middle">4</text>
  <path class="d-edge" d="M 40 96 L 200 96"/>
  <text class="d-sub" x="120" y="126" text-anchor="middle">left of i: 1 x 2 = 2</text>
  <path class="d-edge" d="M 310 96 L 380 96"/>
  <text class="d-sub" x="345" y="126" text-anchor="middle">right: 4</text>
  <rect class="d-box-accent" x="440" y="30" width="170" height="110" rx="10"/>
  <text class="d-sub" x="525" y="66" text-anchor="middle">answer at i = 2</text>
  <text class="d-text d-accent" x="525" y="104" text-anchor="middle">2 x 4 = 8</text>
</svg>

The element at index 2 is skipped; the 2 on its left and the 4 on its right multiply to 8.

## 4. From Brute Force to O(1) Extra Space

1. **Brute force, O(n²).** For each \`i\`, loop over every \`j != i\` and multiply. Example 2 counts 999,000 multiplications for \`n = 1000\`.
2. **Division, O(n) — but forbidden and fragile.** Total product divided by \`nums[i]\`. With one zero, every answer except the zero position is 0 and you divide by zero at that position; with two zeros everything is 0. You would need special cases, and the interviewer said no division anyway.
3. **Two extra arrays, O(n) time and O(n) space.** Build \`left[]\` and \`right[]\` and multiply them.
4. **Two passes into the output, O(n) time and O(1) extra space.** Store the left products directly in \`answer\`, then walk back with a single running variable \`suffix\` and multiply it in. Example 2 counts 3,000 multiplications for \`n = 1000\`.

📌 **Interview term: Auxiliary (extra) space** — memory used beyond the input and the required output. Approach 4 uses only two variables, so its auxiliary space is O(1); see [space complexity](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

📌 **Interview term: Two-pass algorithm** — one that scans the data a fixed number of times (here twice: forwards, then backwards). Two passes is still O(n).

**Why zeros need no special case:** a zero at index \`z\` simply makes every prefix product after \`z\` and every suffix product before \`z\` equal 0, while the answer at \`z\` itself is the product of all the others. Running \`[5, 0, 2]\` in Example 1 gives \`[0, 10, 0]\`.

## 5. The Code in JavaScript

The solution from Example 1.

~~~javascript
function productExceptSelf(nums) {
  const n = nums.length;
  const answer = new Array(n).fill(1);
  let prefix = 1;
  for (let i = 0; i < n; i++) {      // pass 1: product of everything LEFT of i
    answer[i] = prefix;
    prefix *= nums[i];
  }
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) { // pass 2: multiply in everything RIGHT of i
    answer[i] *= suffix;
    suffix *= nums[i];
  }
  return answer;
}
~~~

**Line by line:**

- \`new Array(n).fill(1)\` creates \`n\` ones. \`fill\` with a primitive is safe; \`fill([])\` would put the *same* array object in every slot.
- Pass 1 assigns before it multiplies, so \`answer[i]\` excludes \`nums[i]\`.
- Pass 2 counts down with \`i--\` and multiplies the running \`suffix\` in.

## 6. JavaScript Details That Matter Here

- **Negative zero.** Multiplying \`0\` by a negative number gives \`-0\`. For \`[-1, 1, 0, -3, 3]\` the suffix product reaches \`0 * -9\`, and \`console.log\` of the raw array showed \`-0\`, while \`String(-0)\` is \`"0"\` and \`-0 === 0\` is \`true\`. That is why the example formats with \`join\`; a test using \`Object.is\` would see a difference.
- **Precision.** JavaScript numbers are 64-bit floats; integers are exact only up to \`Number.MAX_SAFE_INTEGER\` (9007199254740991). \`2 ** 53 + 1\` printed \`9007199254740992\`. If products can be that large, use \`BigInt\` (\`1n\`, \`2n\`, ...).
- **Division does not throw.** \`x / 0\` is \`Infinity\` and \`0 / 0\` is \`NaN\`, so a division-based solution fails *silently* in JS.

## 7. Verified: Running the Code

Each example below is in the **JavaScript code** tab on this page. They were saved as \`main.js\` and run with \`node main.js\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Two-pass product except self on five arrays**

~~~text
[1, 2, 3, 4] -> [24, 12, 8, 6]
[-1, 1, 0, -3, 3] -> [0, 0, 9, 0, 0]
[5, 0, 2] -> [0, 10, 0]
[0, 0] -> [0, 0]
[2, 3] -> [3, 2]
~~~

**What this shows:** The standard case, a single zero, two zeros, negatives and the length-2 case all come out right with no special handling.

**Example 2 — Counting multiplications: brute force vs two passes**

~~~text
n=10: brute 90 mults, two-pass 30 mults, same answer: true
n=100: brute 9900 mults, two-pass 300 mults, same answer: true
n=1000: brute 999000 mults, two-pass 3000 mults, same answer: true
~~~

**What this shows:** Brute force does \`n * (n - 1)\` multiplications (999,000 at \`n = 1000\`); the two-pass method does \`3n\` (3,000), and both produce the same array. The gap grows with \`n\`: the brute force is O(n²), the two-pass method O(n).

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) extra | n - 1 multiplications for each of n positions |
| Division | O(n) | O(1) extra | Not allowed, and zeros need special cases |
| Left and right arrays | O(n) | O(n) extra | Two helper arrays of length n |
| Two passes into the output | O(n) | O(1) extra | One running variable; the output array is not counted |

## 9. Edge Cases

- **One zero** (\`[5, 0, 2]\` gives \`[0, 10, 0]\`): only the zero position is non-zero.
- **Two or more zeros** (\`[0, 0]\` gives \`[0, 0]\`): every answer is 0.
- **Negative numbers** (\`[-1, 1, 0, -3, 3]\` gives \`[0, 0, 9, 0, 0]\`): signs work out naturally.
- **Length 2** (\`[2, 3]\` gives \`[3, 2]\`): each answer is simply the other element.
- **Length 1**: the answer is \`[1]\`, the empty product, if the problem allows it.

## 10. Common Pitfalls

- **\`new Array(n).fill([])\` or \`fill({})\`** shares one object across all slots; on \`fill([])\`, pushing once per slot gave lengths \`[1, 2, 3]\` because it was the same array.
- **Division-based solutions** return \`NaN\` or \`Infinity\` on zeros instead of failing loudly.
- **Expecting \`+0\`** in tests that use \`Object.is\` or \`toStrictEqual\`; the algorithm can produce \`-0\`.
- **Products beyond 2^53 - 1** silently lose precision; switch to \`BigInt\` if the constraints allow huge values.
- **\`for (let i = n - 1; i > 0; i--)\`** skips index 0; the condition must be \`i >= 0\`.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Each answer is the product of everything to its left times everything to its right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pass one:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix = 1</code>; for each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">answer[i] = prefix</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix *= nums[i]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pass two:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">suffix = 1</code>; from the right, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">answer[i] *= suffix</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">suffix *= nums[i]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n) time and O(1) extra space besides the output; brute force is O(n²).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The JavaScript detail:</strong> <span style="color:#f0e2c8;">Division would give <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Infinity</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code> on zeros, and the prefix method can produce <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-0</code>, which prints as 0 with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">join</code> but is distinct under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.is</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does your output contain -0?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 * -9</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-0</code> in IEEE 754 floating point. It equals <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">===</code> and prints as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code> via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">String</code>, so it is harmless unless a test uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.is</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x || 0</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x + 0</code> normalises it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the products exceed 2^53?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Numbers would round. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code>: start with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1n</code> and convert inputs with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt(x)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use reduce?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reduce</code> gives the total product, which only helps with division. The two-pass loop is clearer and avoids it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with a zero?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only the zero position is non-zero: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[5, 0, 2]</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 10, 0]</code> with no special case.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where else is this pattern used?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Any "all except me" query; the additive version is [prefix sums](/interview-question/what-is-the-prefix-sum-technique), and prefix/suffix maxima solve [trapping rain water](/interview-question/how-do-you-solve-the-trapping-rain-water-problem).</span>
</div>


</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix product** | Product of all elements before an index |
| **Suffix product** | Product of all elements after an index |
| **Empty product** | The product of no numbers, which is 1 |
| **Auxiliary space** | Memory used beyond the input and the output |
| **Two-pass algorithm** | Scans the data a fixed number of times; still O(n) |

---
**Conclusion:** Each answer is the product to its left times the product to its right, so two passes with a running \`prefix\` and \`suffix\` solve the problem in O(n) time and O(1) extra space without division. In JavaScript, watch the number model: division by zero fails silently with \`Infinity\`/\`NaN\`, products above 2^53 - 1 lose precision (use \`BigInt\` if needed), and multiplying zero by a negative gives \`-0\`, which prints as 0 but is a distinct value.`,
        examples: [
          {
            label: "Two-pass product except self on five arrays",
            code: `function productExceptSelf(nums) {
  const n = nums.length;
  const answer = new Array(n).fill(1);
  let prefix = 1;
  for (let i = 0; i < n; i++) {      // pass 1: product of everything LEFT of i
    answer[i] = prefix;
    prefix *= nums[i];
  }
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) { // pass 2: multiply in everything RIGHT of i
    answer[i] *= suffix;
    suffix *= nums[i];
  }
  return answer;
}

// String(-0) is "0", so join() hides the negative zero that 0 * -9 produces.
function fmt(a) {
  return '[' + a.join(', ') + ']';
}

const tests = [[1, 2, 3, 4], [-1, 1, 0, -3, 3], [5, 0, 2], [0, 0], [2, 3]];
for (const nums of tests) {
  console.log(fmt(nums) + ' -> ' + fmt(productExceptSelf(nums)));
}`,
          },
          {
            label: "Counting multiplications: brute force vs two passes",
            code: `// Count multiplications: brute force (for every i, multiply all j != i)
// versus the two-pass prefix/suffix method.
function brute(nums) {
  let mults = 0;
  const out = [];
  for (let i = 0; i < nums.length; i++) {
    let p = 1;
    for (let j = 0; j < nums.length; j++) {
      if (j !== i) { p *= nums[j]; mults++; }
    }
    out.push(p);
  }
  return [out, mults];
}

function twoPass(nums) {
  const n = nums.length;
  let mults = 0;
  const answer = new Array(n).fill(1);
  let prefix = 1;
  for (let i = 0; i < n; i++) { answer[i] = prefix; prefix *= nums[i]; mults++; }
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) { answer[i] *= suffix; suffix *= nums[i]; mults += 2; }
  return [answer, mults];
}

for (const n of [10, 100, 1000]) {
  const nums = [];
  for (let i = 0; i < n; i++) nums.push(i % 3 ? 1 : -1);
  const [a, ma] = brute(nums);
  const [b, mb] = twoPass(nums);
  const same = a.length === b.length && a.every((v, i) => v === b[i]);
  console.log('n=' + n + ': brute ' + ma + ' mults, two-pass ' + mb + ' mults, same answer: ' + same);
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Write a Java method that takes an int array and returns an int array where answer[i] is the product of all elements except nums[i]. No division allowed, O(n) time, and ideally O(1) extra space."

**What a strong answer should cover:**
- Answer at \`i\` = left product times right product, built in two passes.
- O(n) time, O(1) extra space with the output array not counted; why division fails (\`ArithmeticException\` on zero).
- Java specifics: \`int\` multiplication wraps silently on overflow; confirm the product fits in 32 bits or use \`long\`.
- \`new int[n]\` is zero-filled, so the first pass must assign, not multiply.
- Edge cases: zeros, negatives, length 2.

**Clarifying questions expected:**
- "Can there be zeros, and is division really off the table?" — zeros are what make division fail.
- "Does the product fit in 32 bits, and does the output array count as extra space?"

**Code / implementation expected:** Yes — a two-pass static method in Java.`,
        answer: `**Target Audience:** Beginners to intermediate candidates — you should know arrays and loops; prefix sums help but are explained here.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the Java code with \`javac Main.java && java Main\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Imagine four friends who each bring one ingredient to a shared recipe, and the recipe's strength is the product of all the ingredients. Now each friend asks: "how strong would it be *without me*?" The quick answer is "take the full product and divide by my part" — but the moment one friend brought an ingredient of strength 0, the full product is 0 and you cannot divide by zero. Worse, the interviewer has banned division outright.

So each friend needs "the product of everyone to my left" times "the product of everyone to my right". If you walk the line once from left to right, you can hand each friend the product of everyone before them. Walk back once from right to left, and you can multiply in everyone after them. Two walks, no division, and zeros are no longer special. That is the whole trick, and it is the same idea as a [prefix sum](/interview-question/what-is-the-prefix-sum-technique), with multiplication instead of addition.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is division really not allowed? | It is the defining constraint. Even if it were allowed, zeros make division fragile. |
| Can the array contain zeros or negative numbers? | Zeros break division; negatives change nothing for the prefix method but are worth a test. |
| Is the product guaranteed to fit in a 32-bit integer? | In Java and C++ it decides between \`int\` and a 64-bit type. |
| Does the output array count towards the extra space? | The usual convention is no, which makes the two-pass solution O(1) extra space. |
| What is the minimum length? | Usually at least 2; for length 1 the answer is \`[1]\` (an empty product). |

## 3. The Core Idea: Left Products Times Right Products

For each index \`i\`, the answer is (product of everything before \`i\`) times (product of everything after \`i\`).

📌 **Interview term: Prefix product** — the running product of the elements *before* an index. For \`[1, 2, 3, 4]\` the prefix products are \`[1, 1, 2, 6]\`; the first one is 1 because nothing comes before index 0.

📌 **Interview term: Suffix product** — the running product of the elements *after* an index: \`[24, 12, 4, 1]\` for the same array.

📌 **Interview term: Empty product** — the product of no numbers, defined as 1 (the multiplication identity), just as an empty sum is 0. It is why both running products start at 1.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 330" role="img" aria-label="For nums 1 2 3 4, the left products are 1 1 2 6, the right products are 24 12 4 1, and their element-wise product is 24 12 8 6">
  <defs>
    <marker id="b06q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="47">nums</text>
  <rect class="d-box-muted" x="170" y="20" width="70" height="42" rx="8"/>
  <text class="d-text" x="205" y="47" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="270" y="20" width="70" height="42" rx="8"/>
  <text class="d-text" x="305" y="47" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="370" y="20" width="70" height="42" rx="8"/>
  <text class="d-text" x="405" y="47" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="470" y="20" width="70" height="42" rx="8"/>
  <text class="d-text" x="505" y="47" text-anchor="middle">4</text>
  <text class="d-sub" x="20" y="127">left product</text>
  <rect class="d-box" x="170" y="100" width="70" height="42" rx="8"/>
  <text class="d-text" x="205" y="127" text-anchor="middle">1</text>
  <rect class="d-box" x="270" y="100" width="70" height="42" rx="8"/>
  <text class="d-text" x="305" y="127" text-anchor="middle">1</text>
  <rect class="d-box" x="370" y="100" width="70" height="42" rx="8"/>
  <text class="d-text" x="405" y="127" text-anchor="middle">2</text>
  <rect class="d-box" x="470" y="100" width="70" height="42" rx="8"/>
  <text class="d-text" x="505" y="127" text-anchor="middle">6</text>
  <path class="d-edge-accent" d="M 170 154 L 510 154" marker-end="url(#b06q2-arrow)"/>
  <text class="d-sub" x="20" y="207">right product</text>
  <rect class="d-box" x="170" y="180" width="70" height="42" rx="8"/>
  <text class="d-text" x="205" y="207" text-anchor="middle">24</text>
  <rect class="d-box" x="270" y="180" width="70" height="42" rx="8"/>
  <text class="d-text" x="305" y="207" text-anchor="middle">12</text>
  <rect class="d-box" x="370" y="180" width="70" height="42" rx="8"/>
  <text class="d-text" x="405" y="207" text-anchor="middle">4</text>
  <rect class="d-box" x="470" y="180" width="70" height="42" rx="8"/>
  <text class="d-text" x="505" y="207" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 510 234 L 170 234" marker-end="url(#b06q2-arrow)"/>
  <text class="d-sub" x="20" y="287">answer</text>
  <rect class="d-box" x="170" y="260" width="70" height="42" rx="8"/>
  <text class="d-text" x="205" y="287" text-anchor="middle">24</text>
  <rect class="d-box" x="270" y="260" width="70" height="42" rx="8"/>
  <text class="d-text" x="305" y="287" text-anchor="middle">12</text>
  <rect class="d-box-accent" x="370" y="260" width="70" height="42" rx="8"/>
  <text class="d-text d-accent" x="405" y="287" text-anchor="middle">8</text>
  <rect class="d-box" x="470" y="260" width="70" height="42" rx="8"/>
  <text class="d-text" x="505" y="287" text-anchor="middle">6</text>
</svg>

The left-product row is built walking right, the right-product row walking left, and each answer is the two numbers in its column multiplied together. Index 2 is highlighted; the next diagram zooms in on it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="For index 2, everything to the left multiplies to 2, everything to the right multiplies to 4, so the answer at index 2 is 8">
  <rect class="d-box" x="40" y="30" width="70" height="44" rx="8"/>
  <text class="d-text" x="75" y="58" text-anchor="middle">1</text>
  <rect class="d-box" x="130" y="30" width="70" height="44" rx="8"/>
  <text class="d-text" x="165" y="58" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="220" y="30" width="70" height="44" rx="8"/>
  <text class="d-sub" x="255" y="58" text-anchor="middle">3 skip</text>
  <rect class="d-box" x="310" y="30" width="70" height="44" rx="8"/>
  <text class="d-text" x="345" y="58" text-anchor="middle">4</text>
  <path class="d-edge" d="M 40 96 L 200 96"/>
  <text class="d-sub" x="120" y="126" text-anchor="middle">left of i: 1 x 2 = 2</text>
  <path class="d-edge" d="M 310 96 L 380 96"/>
  <text class="d-sub" x="345" y="126" text-anchor="middle">right: 4</text>
  <rect class="d-box-accent" x="440" y="30" width="170" height="110" rx="10"/>
  <text class="d-sub" x="525" y="66" text-anchor="middle">answer at i = 2</text>
  <text class="d-text d-accent" x="525" y="104" text-anchor="middle">2 x 4 = 8</text>
</svg>

The element at index 2 is skipped; the 2 on its left and the 4 on its right multiply to 8.

## 4. From Brute Force to O(1) Extra Space

1. **Brute force, O(n²).** For each \`i\`, loop over every \`j != i\` and multiply. Example 2 counts 999,000 multiplications for \`n = 1000\`.
2. **Division, O(n) — but forbidden and fragile.** Total product divided by \`nums[i]\`. With one zero, every answer except the zero position is 0 and you divide by zero at that position; with two zeros everything is 0. You would need special cases, and the interviewer said no division anyway.
3. **Two extra arrays, O(n) time and O(n) space.** Build \`left[]\` and \`right[]\` and multiply them.
4. **Two passes into the output, O(n) time and O(1) extra space.** Store the left products directly in \`answer\`, then walk back with a single running variable \`suffix\` and multiply it in. Example 2 counts 3,000 multiplications for \`n = 1000\`.

📌 **Interview term: Auxiliary (extra) space** — memory used beyond the input and the required output. Approach 4 uses only two variables, so its auxiliary space is O(1); see [space complexity](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

📌 **Interview term: Two-pass algorithm** — one that scans the data a fixed number of times (here twice: forwards, then backwards). Two passes is still O(n).

**Why zeros need no special case:** a zero at index \`z\` simply makes every prefix product after \`z\` and every suffix product before \`z\` equal 0, while the answer at \`z\` itself is the product of all the others. Running \`[5, 0, 2]\` in Example 1 gives \`[0, 10, 0]\`.

## 5. The Code in Java

The method from Example 1.

~~~java
static int[] productExceptSelf(int[] nums) {
    int n = nums.length;
    int[] answer = new int[n];
    int prefix = 1;
    for (int i = 0; i < n; i++) {       // pass 1: product of everything LEFT of i
        answer[i] = prefix;
        prefix *= nums[i];
    }
    int suffix = 1;
    for (int i = n - 1; i >= 0; i--) {  // pass 2: multiply in everything RIGHT of i
        answer[i] *= suffix;
        suffix *= nums[i];
    }
    return answer;
}
~~~

**Line by line:**

- \`new int[n]\` starts as all zeros, so pass 1 *assigns* \`answer[i] = prefix\`. If it multiplied instead, everything would stay 0.
- \`prefix\` and \`suffix\` are \`int\`. The usual problem statement guarantees every prefix and suffix product fits in 32 bits; if it does not, switch them (and the result) to \`long\`.
- \`Arrays.toString\` prints \`[24, 12, 8, 6]\`, the same format the other languages build by hand.

## 6. Java Details That Matter Here

- **Silent overflow.** \`int\` multiplication wraps: \`46341 * 46342\` printed \`-2147432674\`. Products grow fast, so confirm the constraint or use \`long\` (and \`Math.multiplyExact\` if you want an exception instead of a wrong answer).
- **Integer division by zero throws.** \`total / 0\` on \`int\` throws \`ArithmeticException\`, so a division-based solution crashes on zeros.
- **\`Arrays.equals(a, b)\`** compares contents; \`a == b\` on arrays compares references. Example 2 uses \`Arrays.equals\` to check that brute force and two passes agree.

## 7. Verified: Running the Code

Each example below is in the **Java code** tab on this page. They were saved as \`Main.java\` and run with \`javac Main.java && java Main\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Two-pass product except self on five arrays**

~~~text
[1, 2, 3, 4] -> [24, 12, 8, 6]
[-1, 1, 0, -3, 3] -> [0, 0, 9, 0, 0]
[5, 0, 2] -> [0, 10, 0]
[0, 0] -> [0, 0]
[2, 3] -> [3, 2]
~~~

**What this shows:** The standard case, a single zero, two zeros, negatives and the length-2 case all come out right with no special handling.

**Example 2 — Counting multiplications: brute force vs two passes**

~~~text
n=10: brute 90 mults, two-pass 30 mults, same answer: true
n=100: brute 9900 mults, two-pass 300 mults, same answer: true
n=1000: brute 999000 mults, two-pass 3000 mults, same answer: true
~~~

**What this shows:** Brute force does \`n * (n - 1)\` multiplications (999,000 at \`n = 1000\`); the two-pass method does \`3n\` (3,000), and both produce the same array. The gap grows with \`n\`: the brute force is O(n²), the two-pass method O(n).

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) extra | n - 1 multiplications for each of n positions |
| Division | O(n) | O(1) extra | Not allowed, and zeros need special cases |
| Left and right arrays | O(n) | O(n) extra | Two helper arrays of length n |
| Two passes into the output | O(n) | O(1) extra | One running variable; the output array is not counted |

## 9. Edge Cases

- **One zero** (\`[5, 0, 2]\` gives \`[0, 10, 0]\`): only the zero position is non-zero.
- **Two or more zeros** (\`[0, 0]\` gives \`[0, 0]\`): every answer is 0.
- **Negative numbers** (\`[-1, 1, 0, -3, 3]\` gives \`[0, 0, 9, 0, 0]\`): signs work out naturally.
- **Length 2** (\`[2, 3]\` gives \`[3, 2]\`): each answer is simply the other element.
- **Length 1**: the answer is \`[1]\`, the empty product, if the problem allows it.

## 10. Common Pitfalls

- **Multiplying into a fresh \`new int[n]\`** in pass 1: it is zero-filled, so everything stays 0. Assign first.
- **Division** throws \`ArithmeticException\` on a zero element, and is forbidden anyway.
- **Assuming \`int\` is enough without asking.** Large inputs overflow silently; ask for the constraint or use \`long\`.
- **Comparing arrays with \`==\`** in your own tests; use \`Arrays.equals\`.
- **Loop bound \`i > 0\`** in the backward pass skips index 0.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Answer at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> is the product left of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> times the product right of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pass one:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int prefix = 1</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">answer[i] = prefix; prefix *= nums[i];</code> left to right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pass two:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int suffix = 1</code>; right to left, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">answer[i] *= suffix; suffix *= nums[i];</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) extra space besides the output, versus O(n²) brute force.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Java detail:</strong> <span style="color:#f0e2c8;">Integer division by zero throws, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> products overflow silently, so I confirm the 32-bit guarantee or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the product does not fit in an int?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">suffix</code> and the result, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.multiplyExact</code> to detect overflow; beyond 64 bits, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInteger</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why assign in the first pass instead of multiply?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new int[n]</code> is zero-filled; multiplying into zeros keeps them zero.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle it with division allowed?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count zeros: two or more means all zeros; one means only that index gets the product of the rest; none means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total / nums[i]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the output array extra space?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By the usual convention no, because it is required output, so the two-pass method is O(1) extra space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can this be parallelised?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prefix products are a scan; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.parallelPrefix(arr, (a, b) -&gt; a * b)</code> computes inclusive running products in parallel, though for interview sizes the loop is simpler.</span>
</div>


</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix product** | Product of all elements before an index |
| **Suffix product** | Product of all elements after an index |
| **Empty product** | The product of no numbers, which is 1 |
| **Auxiliary space** | Memory used beyond the input and the output |
| **Two-pass algorithm** | Scans the data a fixed number of times; still O(n) |

---
**Conclusion:** The answer at each index is the product to its left times the product to its right, built with two passes and two running variables: O(n) time, O(1) extra space, no division. In Java remember that \`new int[n]\` is zero-filled (so assign in the first pass), that integer division by zero throws, and that \`int\` products overflow silently — confirm the 32-bit guarantee or move to \`long\`.`,
        examples: [
          {
            label: "Two-pass product except self on five arrays",
            code: `import java.util.Arrays;

public class Main {
    static int[] productExceptSelf(int[] nums) {
        int n = nums.length;
        int[] answer = new int[n];
        int prefix = 1;
        for (int i = 0; i < n; i++) {       // pass 1: product of everything LEFT of i
            answer[i] = prefix;
            prefix *= nums[i];
        }
        int suffix = 1;
        for (int i = n - 1; i >= 0; i--) {  // pass 2: multiply in everything RIGHT of i
            answer[i] *= suffix;
            suffix *= nums[i];
        }
        return answer;
    }

    public static void main(String[] args) {
        int[][] tests = {{1, 2, 3, 4}, {-1, 1, 0, -3, 3}, {5, 0, 2}, {0, 0}, {2, 3}};
        for (int[] nums : tests) {
            // Arrays.toString prints [1, 2, 3] — the same format as the other languages
            System.out.println(Arrays.toString(nums) + " -> " + Arrays.toString(productExceptSelf(nums)));
        }
    }
}`,
          },
          {
            label: "Counting multiplications: brute force vs two passes",
            code: `import java.util.Arrays;

public class Main {
    static long mults;

    static int[] brute(int[] nums) {
        int[] out = new int[nums.length];
        for (int i = 0; i < nums.length; i++) {
            int p = 1;
            for (int j = 0; j < nums.length; j++) {
                if (j != i) { p *= nums[j]; mults++; }
            }
            out[i] = p;
        }
        return out;
    }

    static int[] twoPass(int[] nums) {
        int n = nums.length;
        int[] answer = new int[n];
        int prefix = 1;
        for (int i = 0; i < n; i++) { answer[i] = prefix; prefix *= nums[i]; mults++; }
        int suffix = 1;
        for (int i = n - 1; i >= 0; i--) { answer[i] *= suffix; suffix *= nums[i]; mults += 2; }
        return answer;
    }

    public static void main(String[] args) {
        for (int n : new int[]{10, 100, 1000}) {
            int[] nums = new int[n];
            for (int i = 0; i < n; i++) nums[i] = i % 3 != 0 ? 1 : -1;
            mults = 0;
            int[] a = brute(nums);
            long ma = mults;
            mults = 0;
            int[] b = twoPass(nums);
            long mb = mults;
            // Arrays.equals compares contents; a == b would compare references
            System.out.println("n=" + n + ": brute " + ma + " mults, two-pass " + mb
                + " mults, same answer: " + Arrays.equals(a, b));
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"In C++, given a \`std::vector<int>\`, return a vector where element i is the product of all elements except nums[i], without using division, in O(n) time."

**What a strong answer should cover:**
- Answer at \`i\` = left product times right product, computed in two passes.
- O(n) time and O(1) extra space with the output not counted; why division fails on zeros (undefined behaviour for integers).
- C++ specifics: signed overflow is undefined behaviour, so pick \`long long\` if the product may exceed \`int\`.
- Counting down with an unsigned \`size_t\` index never terminates; use a signed index.
- Edge cases: zeros, negatives.

**Clarifying questions expected:**
- "Can there be zeros, and is division really off the table?" — zeros are what make division fail.
- "Does the product fit in 32 bits, and does the output array count as extra space?"

**Code / implementation expected:** Yes — a C++17 function returning a \`std::vector\`.`,
        answer: `**Target Audience:** Beginners to intermediate candidates — you should know arrays and loops; prefix sums help but are explained here.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the C++ code with \`g++ -std=c++17 main.cpp && ./a.out\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Imagine four friends who each bring one ingredient to a shared recipe, and the recipe's strength is the product of all the ingredients. Now each friend asks: "how strong would it be *without me*?" The quick answer is "take the full product and divide by my part" — but the moment one friend brought an ingredient of strength 0, the full product is 0 and you cannot divide by zero. Worse, the interviewer has banned division outright.

So each friend needs "the product of everyone to my left" times "the product of everyone to my right". If you walk the line once from left to right, you can hand each friend the product of everyone before them. Walk back once from right to left, and you can multiply in everyone after them. Two walks, no division, and zeros are no longer special. That is the whole trick, and it is the same idea as a [prefix sum](/interview-question/what-is-the-prefix-sum-technique), with multiplication instead of addition.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is division really not allowed? | It is the defining constraint. Even if it were allowed, zeros make division fragile. |
| Can the array contain zeros or negative numbers? | Zeros break division; negatives change nothing for the prefix method but are worth a test. |
| Is the product guaranteed to fit in a 32-bit integer? | In Java and C++ it decides between \`int\` and a 64-bit type. |
| Does the output array count towards the extra space? | The usual convention is no, which makes the two-pass solution O(1) extra space. |
| What is the minimum length? | Usually at least 2; for length 1 the answer is \`[1]\` (an empty product). |

## 3. The Core Idea: Left Products Times Right Products

For each index \`i\`, the answer is (product of everything before \`i\`) times (product of everything after \`i\`).

📌 **Interview term: Prefix product** — the running product of the elements *before* an index. For \`[1, 2, 3, 4]\` the prefix products are \`[1, 1, 2, 6]\`; the first one is 1 because nothing comes before index 0.

📌 **Interview term: Suffix product** — the running product of the elements *after* an index: \`[24, 12, 4, 1]\` for the same array.

📌 **Interview term: Empty product** — the product of no numbers, defined as 1 (the multiplication identity), just as an empty sum is 0. It is why both running products start at 1.

<svg class="iq-diagram" width="100%" viewBox="0 0 600 330" role="img" aria-label="For nums 1 2 3 4, the left products are 1 1 2 6, the right products are 24 12 4 1, and their element-wise product is 24 12 8 6">
  <defs>
    <marker id="b06q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="47">nums</text>
  <rect class="d-box-muted" x="170" y="20" width="70" height="42" rx="8"/>
  <text class="d-text" x="205" y="47" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="270" y="20" width="70" height="42" rx="8"/>
  <text class="d-text" x="305" y="47" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="370" y="20" width="70" height="42" rx="8"/>
  <text class="d-text" x="405" y="47" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="470" y="20" width="70" height="42" rx="8"/>
  <text class="d-text" x="505" y="47" text-anchor="middle">4</text>
  <text class="d-sub" x="20" y="127">left product</text>
  <rect class="d-box" x="170" y="100" width="70" height="42" rx="8"/>
  <text class="d-text" x="205" y="127" text-anchor="middle">1</text>
  <rect class="d-box" x="270" y="100" width="70" height="42" rx="8"/>
  <text class="d-text" x="305" y="127" text-anchor="middle">1</text>
  <rect class="d-box" x="370" y="100" width="70" height="42" rx="8"/>
  <text class="d-text" x="405" y="127" text-anchor="middle">2</text>
  <rect class="d-box" x="470" y="100" width="70" height="42" rx="8"/>
  <text class="d-text" x="505" y="127" text-anchor="middle">6</text>
  <path class="d-edge-accent" d="M 170 154 L 510 154" marker-end="url(#b06q2-arrow)"/>
  <text class="d-sub" x="20" y="207">right product</text>
  <rect class="d-box" x="170" y="180" width="70" height="42" rx="8"/>
  <text class="d-text" x="205" y="207" text-anchor="middle">24</text>
  <rect class="d-box" x="270" y="180" width="70" height="42" rx="8"/>
  <text class="d-text" x="305" y="207" text-anchor="middle">12</text>
  <rect class="d-box" x="370" y="180" width="70" height="42" rx="8"/>
  <text class="d-text" x="405" y="207" text-anchor="middle">4</text>
  <rect class="d-box" x="470" y="180" width="70" height="42" rx="8"/>
  <text class="d-text" x="505" y="207" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 510 234 L 170 234" marker-end="url(#b06q2-arrow)"/>
  <text class="d-sub" x="20" y="287">answer</text>
  <rect class="d-box" x="170" y="260" width="70" height="42" rx="8"/>
  <text class="d-text" x="205" y="287" text-anchor="middle">24</text>
  <rect class="d-box" x="270" y="260" width="70" height="42" rx="8"/>
  <text class="d-text" x="305" y="287" text-anchor="middle">12</text>
  <rect class="d-box-accent" x="370" y="260" width="70" height="42" rx="8"/>
  <text class="d-text d-accent" x="405" y="287" text-anchor="middle">8</text>
  <rect class="d-box" x="470" y="260" width="70" height="42" rx="8"/>
  <text class="d-text" x="505" y="287" text-anchor="middle">6</text>
</svg>

The left-product row is built walking right, the right-product row walking left, and each answer is the two numbers in its column multiplied together. Index 2 is highlighted; the next diagram zooms in on it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="For index 2, everything to the left multiplies to 2, everything to the right multiplies to 4, so the answer at index 2 is 8">
  <rect class="d-box" x="40" y="30" width="70" height="44" rx="8"/>
  <text class="d-text" x="75" y="58" text-anchor="middle">1</text>
  <rect class="d-box" x="130" y="30" width="70" height="44" rx="8"/>
  <text class="d-text" x="165" y="58" text-anchor="middle">2</text>
  <rect class="d-box-muted" x="220" y="30" width="70" height="44" rx="8"/>
  <text class="d-sub" x="255" y="58" text-anchor="middle">3 skip</text>
  <rect class="d-box" x="310" y="30" width="70" height="44" rx="8"/>
  <text class="d-text" x="345" y="58" text-anchor="middle">4</text>
  <path class="d-edge" d="M 40 96 L 200 96"/>
  <text class="d-sub" x="120" y="126" text-anchor="middle">left of i: 1 x 2 = 2</text>
  <path class="d-edge" d="M 310 96 L 380 96"/>
  <text class="d-sub" x="345" y="126" text-anchor="middle">right: 4</text>
  <rect class="d-box-accent" x="440" y="30" width="170" height="110" rx="10"/>
  <text class="d-sub" x="525" y="66" text-anchor="middle">answer at i = 2</text>
  <text class="d-text d-accent" x="525" y="104" text-anchor="middle">2 x 4 = 8</text>
</svg>

The element at index 2 is skipped; the 2 on its left and the 4 on its right multiply to 8.

## 4. From Brute Force to O(1) Extra Space

1. **Brute force, O(n²).** For each \`i\`, loop over every \`j != i\` and multiply. Example 2 counts 999,000 multiplications for \`n = 1000\`.
2. **Division, O(n) — but forbidden and fragile.** Total product divided by \`nums[i]\`. With one zero, every answer except the zero position is 0 and you divide by zero at that position; with two zeros everything is 0. You would need special cases, and the interviewer said no division anyway.
3. **Two extra arrays, O(n) time and O(n) space.** Build \`left[]\` and \`right[]\` and multiply them.
4. **Two passes into the output, O(n) time and O(1) extra space.** Store the left products directly in \`answer\`, then walk back with a single running variable \`suffix\` and multiply it in. Example 2 counts 3,000 multiplications for \`n = 1000\`.

📌 **Interview term: Auxiliary (extra) space** — memory used beyond the input and the required output. Approach 4 uses only two variables, so its auxiliary space is O(1); see [space complexity](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

📌 **Interview term: Two-pass algorithm** — one that scans the data a fixed number of times (here twice: forwards, then backwards). Two passes is still O(n).

**Why zeros need no special case:** a zero at index \`z\` simply makes every prefix product after \`z\` and every suffix product before \`z\` equal 0, while the answer at \`z\` itself is the product of all the others. Running \`[5, 0, 2]\` in Example 1 gives \`[0, 10, 0]\`.

## 5. The Code in C++

The function from Example 1 (it returns \`long long\` values to leave headroom).

~~~cpp
#include <iostream>
#include <string>
#include <vector>

std::vector<long long> productExceptSelf(const std::vector<int>& nums) {
    const int n = static_cast<int>(nums.size());
    std::vector<long long> answer(n, 1);
    long long prefix = 1;
    for (int i = 0; i < n; i++) {        // pass 1: product of everything LEFT of i
        answer[i] = prefix;
        prefix *= nums[i];
    }
    long long suffix = 1;
    for (int i = n - 1; i >= 0; i--) {   // pass 2: multiply in everything RIGHT of i
        answer[i] *= suffix;
        suffix *= nums[i];
    }
    return answer;
}
~~~

**Line by line:**

- \`std::vector<long long> answer(n, 1)\` creates \`n\` ones in 64-bit integers.
- The backward loop uses \`int i\`, not \`size_t i\`: with an unsigned index, \`i >= 0\` is always true and \`i--\` past 0 wraps to a huge number.
- \`prefix *= nums[i]\` promotes the \`int\` to \`long long\` before multiplying.

## 6. C++ Details That Matter Here

- **Signed overflow is undefined behaviour.** If \`int\` products overflow, the program is undefined, not just wrong. Using \`long long\` (as here) or proving the bound is part of a correct C++ answer.
- **Integer division by zero is undefined behaviour too** (in a test on x86-64 Linux with g++, \`10 / z\` with \`z == 0\` killed the program with "Floating point exception"), so the division approach is doubly risky.
- **\`std::vector\` comparison.** \`a == b\` on two vectors compares element by element, which Example 2 uses to confirm brute force and two passes agree.

## 7. Verified: Running the Code

Each example below is in the **C++ code** tab on this page. They were saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Two-pass product except self on five arrays**

~~~text
[1, 2, 3, 4] -> [24, 12, 8, 6]
[-1, 1, 0, -3, 3] -> [0, 0, 9, 0, 0]
[5, 0, 2] -> [0, 10, 0]
[0, 0] -> [0, 0]
[2, 3] -> [3, 2]
~~~

**What this shows:** The standard case, a single zero, two zeros, negatives and the length-2 case all come out right with no special handling.

**Example 2 — Counting multiplications: brute force vs two passes**

~~~text
n=10: brute 90 mults, two-pass 30 mults, same answer: true
n=100: brute 9900 mults, two-pass 300 mults, same answer: true
n=1000: brute 999000 mults, two-pass 3000 mults, same answer: true
~~~

**What this shows:** Brute force does \`n * (n - 1)\` multiplications (999,000 at \`n = 1000\`); the two-pass method does \`3n\` (3,000), and both produce the same array. The gap grows with \`n\`: the brute force is O(n²), the two-pass method O(n).

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) extra | n - 1 multiplications for each of n positions |
| Division | O(n) | O(1) extra | Not allowed, and zeros need special cases |
| Left and right arrays | O(n) | O(n) extra | Two helper arrays of length n |
| Two passes into the output | O(n) | O(1) extra | One running variable; the output array is not counted |

## 9. Edge Cases

- **One zero** (\`[5, 0, 2]\` gives \`[0, 10, 0]\`): only the zero position is non-zero.
- **Two or more zeros** (\`[0, 0]\` gives \`[0, 0]\`): every answer is 0.
- **Negative numbers** (\`[-1, 1, 0, -3, 3]\` gives \`[0, 0, 9, 0, 0]\`): signs work out naturally.
- **Length 2** (\`[2, 3]\` gives \`[3, 2]\`): each answer is simply the other element.
- **Length 1**: the answer is \`[1]\`, the empty product, if the problem allows it.

## 10. Common Pitfalls

- **\`for (size_t i = n - 1; i >= 0; i--)\`** is an infinite loop: an unsigned value is always \`>= 0\`. Use \`int\` or loop \`for (size_t i = n; i-- > 0;)\`.
- **\`int\` products** overflowing is undefined behaviour; use \`long long\` or confirm the constraint.
- **Division** by a zero element is undefined behaviour.
- **Returning a reference to a local vector** dangles; return by value (copy elision and move make it cheap).
- **Passing \`nums\` by value** copies the whole vector; take \`const std::vector<int>&\`.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Answer at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> is the product to the left times the product to the right.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pass one:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long prefix = 1</code>; left to right, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">answer[i] = prefix; prefix *= nums[i];</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pass two:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long suffix = 1</code>; right to left with a signed index, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">answer[i] *= suffix; suffix *= nums[i];</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) extra space besides the output, versus O(n²) brute force.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ detail:</strong> <span style="color:#f0e2c8;">Signed overflow and integer division by zero are both undefined behaviour, so I use 64-bit products and avoid division entirely.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a signed loop index going backwards?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size_t</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt;= 0</code> is always true and decrementing 0 wraps to the maximum value, so the loop never ends and indexes out of bounds.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if even <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long long</code> overflows?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then you need arbitrary precision, which the C++ standard library does not provide; most problems guarantee the product fits in 32 bits.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the output vector extra space?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, by the usual convention; it is required output. The algorithm needs only two scalars.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does a zero behave?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only the zero position gets a non-zero answer: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[5, 0, 2]</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 10, 0]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a standard algorithm for running products?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::partial_sum(first, last, out, std::multiplies&lt;&gt;())</code> writes inclusive running products; you would shift it by one to make it exclusive.</span>
</div>


</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix product** | Product of all elements before an index |
| **Suffix product** | Product of all elements after an index |
| **Empty product** | The product of no numbers, which is 1 |
| **Auxiliary space** | Memory used beyond the input and the output |
| **Two-pass algorithm** | Scans the data a fixed number of times; still O(n) |

---
**Conclusion:** Product of array except self is two running products — left to right, then right to left — multiplied into the output: O(n) time, O(1) extra space, no division. In C++ the details that separate a good answer are about undefined behaviour: use a 64-bit type if products can exceed \`int\`, never divide by an element that may be zero, and count down with a signed index so the backward loop terminates.`,
        examples: [
          {
            label: "Two-pass product except self on five arrays",
            code: `#include <iostream>
#include <string>
#include <vector>

std::vector<long long> productExceptSelf(const std::vector<int>& nums) {
    const int n = static_cast<int>(nums.size());
    std::vector<long long> answer(n, 1);
    long long prefix = 1;
    for (int i = 0; i < n; i++) {        // pass 1: product of everything LEFT of i
        answer[i] = prefix;
        prefix *= nums[i];
    }
    long long suffix = 1;
    for (int i = n - 1; i >= 0; i--) {   // pass 2: multiply in everything RIGHT of i
        answer[i] *= suffix;
        suffix *= nums[i];
    }
    return answer;
}

template <typename T>
std::string fmt(const std::vector<T>& a) {
    std::string s = "[";
    for (size_t i = 0; i < a.size(); i++) {
        if (i > 0) s += ", ";
        s += std::to_string(a[i]);
    }
    return s + "]";
}

int main() {
    std::vector<std::vector<int>> tests = {{1, 2, 3, 4}, {-1, 1, 0, -3, 3}, {5, 0, 2}, {0, 0}, {2, 3}};
    for (const auto& nums : tests) {
        std::cout << fmt(nums) << " -> " << fmt(productExceptSelf(nums)) << "\\n";
    }
    return 0;
}`,
          },
          {
            label: "Counting multiplications: brute force vs two passes",
            code: `#include <iostream>
#include <vector>

long long mults = 0;

std::vector<long long> brute(const std::vector<int>& nums) {
    std::vector<long long> out;
    for (size_t i = 0; i < nums.size(); i++) {
        long long p = 1;
        for (size_t j = 0; j < nums.size(); j++) {
            if (j != i) { p *= nums[j]; mults++; }
        }
        out.push_back(p);
    }
    return out;
}

std::vector<long long> twoPass(const std::vector<int>& nums) {
    const int n = static_cast<int>(nums.size());
    std::vector<long long> answer(n, 1);
    long long prefix = 1;
    for (int i = 0; i < n; i++) { answer[i] = prefix; prefix *= nums[i]; mults++; }
    long long suffix = 1;
    for (int i = n - 1; i >= 0; i--) { answer[i] *= suffix; suffix *= nums[i]; mults += 2; }
    return answer;
}

int main() {
    std::cout << std::boolalpha;
    for (int n : {10, 100, 1000}) {
        std::vector<int> nums(n);
        for (int i = 0; i < n; i++) nums[i] = i % 3 ? 1 : -1;
        mults = 0;
        auto a = brute(nums);
        long long ma = mults;
        mults = 0;
        auto b = twoPass(nums);
        long long mb = mults;
        // vector == compares element by element
        std::cout << "n=" << n << ": brute " << ma << " mults, two-pass " << mb
                  << " mults, same answer: " << (a == b) << "\\n";
    }
    return 0;
}`,
          },
        ],
      },
    },
  },
  {
    title: "Longest consecutive sequence in O(n) with hash set — why not sort?",
    difficulty: "medium",
    seoDescription: "Longest consecutive sequence in O(n) with a hash set and the start-of-run check, why sorting is O(n log n), in Python, JavaScript, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given an unsorted list of integers, return the length of the longest run of consecutive values, in O(n) time. Then tell me why you did not just sort it. Use Python."

**What a strong answer should cover:**
- Build a \`set\`, and only start counting from \`x\` when \`x - 1\` is not in the set.
- Why it is O(n): each number is walked over at most once, about 2n lookups in total (amortized).
- Why not sort: O(n log n) does more work than needed; trade-offs in memory, worst case and constants.
- Python specifics: iterate the \`set\`, not the list, so duplicates are not re-checked; \`in\` on a set is average O(1) but on a list is O(n).
- Edge cases: empty list, duplicates, negatives.

**Clarifying questions expected:**
- "Can there be duplicates, and should an empty array return 0?"
- "Is O(n log n) acceptable, or is O(n) required?" — the whole point of the question.

**Code / implementation expected:** Yes — a short Python function using \`set\`.`,
        answer: `**Target Audience:** Intermediate candidates — you should know arrays and what a hash set does; Big-O basics help.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the Python code with \`python3 main.py\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Imagine a deck of cards with numbers on them, shuffled and with some cards missing and some duplicated. You want the longest straight: the most numbers in a row, like 4-5-6-7. The obvious way is to sort the deck first and then read off the runs. That works, but sorting a big deck is the slow part.

A faster trick: spread the cards on a table where you can instantly check whether any number is present. Now pick up a card, say 5, and ask one question: "is 4 on the table?" If it is, 5 is in the middle of some straight, so you ignore it for now — whoever holds the start of that straight will count it. If 4 is *not* there, then 5 is the start of a straight, and you count upwards 6, 7, 8 until a number is missing. Because you only ever count upwards from a start, each card is counted inside a straight at most once. That is the O(n) answer, and the "why not sort" part of the question is asking you to explain exactly why it beats O(n log n).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the array contain duplicates? | Duplicates must not extend a run. A set removes them for free; the sort approach must skip equal neighbours. |
| Can it be empty? | The answer should then be 0, not 1. |
| What range can values take? | In Java and C++, \`x + 1\` overflows at the maximum \`int\`; the usual constraint (about plus or minus 10^9) avoids it. |
| Is O(n) required, or is O(n log n) acceptable? | It decides whether sorting is a fine answer, and it is the point of the question. |
| Do you want the length or the sequence itself? | Returning the run needs its start as well, a small change. |

## 3. The Core Idea: Only Count From the Start of a Run

Put every number in a hash set. A number \`x\` is the **start** of a consecutive run exactly when \`x - 1\` is not in the set. From each start, count upwards while \`x + 1\`, \`x + 2\`, ... are present.

📌 **Interview term: Consecutive sequence** — values that differ by exactly 1 when sorted, like 1, 2, 3, 4. They do not have to be adjacent in the array; \`[100, 4, 200, 1, 3, 2]\` contains the sequence 1, 2, 3, 4.

📌 **Interview term: Hash set** — a collection that answers "is \`x\` in here?" in average O(1) time by hashing \`x\` to a bucket. The details are in [how a hash table works](/interview-question/how-does-a-hash-table-work).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="The set 1 2 3 4 100 200. Runs start at 1, 100 and 200 because 0, 99 and 199 are absent. Walking from 1 reaches 4, a run of length 4">
  <defs>
    <marker id="b06q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub d-accent" x="70" y="38" text-anchor="middle">start</text>
  <rect class="d-box-accent" x="40" y="56" width="60" height="44" rx="8"/>
  <text class="d-text d-accent" x="70" y="84" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 100 78 L 136 78" marker-end="url(#b06q3-arrow)"/>
  <rect class="d-box" x="140" y="56" width="60" height="44" rx="8"/>
  <text class="d-text" x="170" y="84" text-anchor="middle">2</text>
  <path class="d-edge-accent" d="M 200 78 L 236 78" marker-end="url(#b06q3-arrow)"/>
  <rect class="d-box" x="240" y="56" width="60" height="44" rx="8"/>
  <text class="d-text" x="270" y="84" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 300 78 L 336 78" marker-end="url(#b06q3-arrow)"/>
  <rect class="d-box" x="340" y="56" width="60" height="44" rx="8"/>
  <text class="d-text" x="370" y="84" text-anchor="middle">4</text>
  <text class="d-sub" x="220" y="150" text-anchor="middle">run of length 4</text>
  <text class="d-sub d-accent" x="490" y="38" text-anchor="middle">start</text>
  <rect class="d-box-accent" x="460" y="56" width="60" height="44" rx="8"/>
  <text class="d-text d-accent" x="490" y="84" text-anchor="middle">100</text>
  <text class="d-sub" x="490" y="150" text-anchor="middle">length 1</text>
  <text class="d-sub d-accent" x="600" y="38" text-anchor="middle">start</text>
  <rect class="d-box-accent" x="570" y="56" width="60" height="44" rx="8"/>
  <text class="d-text d-accent" x="600" y="84" text-anchor="middle">200</text>
  <text class="d-sub" x="600" y="150" text-anchor="middle">length 1</text>
</svg>

Of the six numbers, only 1, 100 and 200 have no predecessor, so only those three start a walk. The walk from 1 visits 2, 3 and 4; numbers 2, 3 and 4 never start a walk of their own.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="For each x in the set, ask whether x minus 1 is in the set. If yes, skip x. If no, x starts a run, so count x plus 1, x plus 2 and so on">
  <defs>
    <marker id="b06q3-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="80" width="140" height="60" rx="10"/>
  <text class="d-text" x="90" y="115" text-anchor="middle">next x in set</text>
  <path class="d-edge" d="M 160 110 L 226 110" marker-end="url(#b06q3-arrow2)"/>
  <rect class="d-box" x="230" y="80" width="170" height="60" rx="10"/>
  <text class="d-text" x="315" y="115" text-anchor="middle">is x - 1 in set?</text>
  <path class="d-edge-dashed" d="M 400 96 L 466 46" marker-end="url(#b06q3-arrow2)"/>
  <text class="d-sub" x="420" y="56" text-anchor="middle">yes</text>
  <rect class="d-box-muted" x="470" y="16" width="190" height="56" rx="10"/>
  <text class="d-text" x="565" y="50" text-anchor="middle">skip: not a start</text>
  <path class="d-edge-accent" d="M 400 124 L 466 174" marker-end="url(#b06q3-arrow2)"/>
  <text class="d-sub" x="420" y="178" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="470" y="148" width="190" height="66" rx="10"/>
  <text class="d-text d-accent" x="565" y="176" text-anchor="middle">walk x+1, x+2</text>
  <text class="d-sub" x="565" y="200" text-anchor="middle">until a gap</text>
</svg>

Every number asks one membership question. Only starts go on to walk, and the walks never overlap.

## 4. Why O(n), and Why Not Just Sort?

**Why the hash-set version is O(n).** Each number does one "is \`x - 1\` present?" lookup: n lookups. The inner \`while\` loop runs only from starts, and each number is reached by at most one walk (the walk from the start of its run), so all the walks together do at most about n more lookups. Total: about 2n lookups, which is O(n). Example 2 counts exactly 2n lookups for a single run of \`n\` numbers.

📌 **Interview term: Amortized analysis** — bounding the *total* work of a loop rather than the worst single iteration. One walk can be n steps long, but the walks together are still n steps. See [amortized analysis](/interview-question/what-is-amortized-analysis).

**Why the start check matters.** Without the \`x - 1\` check, every number walks to the end of its run. For one run of n numbers that is \`n + (n - 1) + ... + 1 = n(n + 1) / 2\` steps, which is O(n²). Example 2 measured 50,005,000 lookups for n = 10,000 without the check and 20,000 with it.

**Why not sort?** Sorting is a perfectly correct answer: sort, then scan once and count runs (skipping duplicates). But comparison sorting costs O(n log n) — see [Big-O notation](/interview-question/what-is-big-o-notation) and [common sorting algorithms](/interview-question/compare-common-sorting-algorithms) — and the question explicitly asks for O(n). The honest trade-off to mention:

| | Hash set | Sort, then scan |
| :--- | :--- | :--- |
| Time | O(n) average | O(n log n) |
| Extra space | O(n) for the set | O(1) to O(n), depending on the sort |
| Worst case | Hash collisions can degrade lookups | Guaranteed O(n log n) |
| Constant factors | Hashing and pointer-chasing | Tight loops over contiguous memory |
| Mutates input | No | Yes, unless you copy first |

So "why not sort" has a precise answer: sorting does more work than the problem needs. You do not need the full order of the array, only "is the neighbour present?", and a hash set answers exactly that question in O(1). For small inputs sorting can still be the practical choice, and saying so shows judgement.

📌 **Interview term: Average-case vs worst-case** — the hash-set bound is an *average* (expected) bound that assumes a good hash function; the sort bound is a guaranteed worst case.

## 5. The Code in Python

The O(n) solution from Example 1.

~~~python
def longest_consecutive(nums):
    num_set = set(nums)              # O(n) to build; also removes duplicates
    best = 0
    for x in num_set:                # iterate the set, not nums (duplicates!)
        if x - 1 not in num_set:     # x starts a run only if x-1 is absent
            length = 1
            while x + length in num_set:
                length += 1
            best = max(best, length)
    return best
~~~

**Line by line:**

- \`set(nums)\` builds the set in O(n) and removes duplicates.
- \`for x in num_set\` iterates the set, not \`nums\`. With many duplicates of a start value, iterating the list would repeat the same walk for each copy.
- \`x - 1 not in num_set\` is the start check; \`x + length in num_set\` is the walk.

## 6. Python Details That Matter Here

- **\`in\` on a set vs a list.** \`x in some_set\` is an average O(1) hash lookup; \`x in some_list\` scans the whole list. Writing the walk against \`nums\` instead of \`num_set\` silently turns the algorithm into O(n²) or worse.
- **Ints never overflow,** so \`x + length\` is always safe in Python.
- **The sort baseline** is short too: \`sorted(set(nums))\` and one scan (see \`longest_by_sorting\` in Example 1). It is a fine thing to write first and then improve.

## 7. Verified: Running the Code

Each example below is in the **Python code** tab on this page. They were saved as \`main.py\` and run with \`python3 main.py\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Hash set and sorting on six inputs**

~~~text
[100, 4, 200, 1, 3, 2] -> hash set 4, sorting 4
[0, 3, 7, 2, 5, 8, 4, 6, 0, 1] -> hash set 9, sorting 9
[] -> hash set 0, sorting 0
[1, 2, 0, 1] -> hash set 3, sorting 3
[-1, -2, -3, 10] -> hash set 3, sorting 3
[7] -> hash set 1, sorting 1
~~~

**What this shows:** The hash-set answer and the sorting answer agree on every case, including the empty array, duplicates and negatives.

**Example 2 — Counting lookups: with and without the start check**

~~~text
n=10: longest 10/10, naive lookups 55, smart lookups 20
n=100: longest 100/100, naive lookups 5050, smart lookups 200
n=1000: longest 1000/1000, naive lookups 500500, smart lookups 2000
n=10000: longest 10000/10000, naive lookups 50005000, smart lookups 20000
~~~

**What this shows:** For a single run of \`n\` numbers, skipping the start check costs \`n(n + 1) / 2\` lookups (O(n²)); with the check it is exactly \`2n\` (O(n)). Both find the same longest run.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Hash set with start check | O(n) average | O(n) | About 2n set lookups in total |
| Hash set without start check | O(n²) | O(n) | Every element walks to the end of its run |
| Sort, then scan | O(n log n) | O(1) to O(n) | The sort dominates the single scan |
| Brute force (search for x+1 by scanning) | O(n³) | O(1) | Linear search for each step of each walk |

## 9. Edge Cases

- **Empty array** returns 0 (Example 1: \`[]\`).
- **Duplicates** (\`[1, 2, 0, 1]\` gives 3): the set ignores them; the sort version must skip equal neighbours.
- **Negative numbers** (\`[-1, -2, -3, 10]\` gives 3): nothing special.
- **Single element** returns 1.
- **Values at the integer limit** (Java and C++): \`x + 1\` overflows at the maximum \`int\`; see Pitfalls.

## 10. Common Pitfalls

- **Checking membership against the list** (\`x + 1 in nums\`) instead of the set: each lookup is O(n).
- **Skipping the \`x - 1\` start check:** correct, but O(n²); Example 2 shows 50,005,000 lookups at n = 10,000.
- **Returning 1 for an empty list** by initialising \`best = 1\`.
- **Iterating \`nums\` instead of the set** repeats walks for duplicate starts.
- **Sorting without removing duplicates:** \`[1, 2, 2, 3]\` must give 3, so equal neighbours must not reset or extend the run.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Put all numbers in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code>; a number starts a run only if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x - 1</code> is missing, and from a start I count up while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x + 1</code> is present.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why O(n):</strong> <span style="color:#f0e2c8;">Every number does one start check, and each number is visited by at most one walk, so about 2n lookups in total.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why not sort:</strong> <span style="color:#f0e2c8;">Sorting is O(n log n) and computes the full order, but I only need to know whether a neighbour exists, which a set answers in O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The trade-off:</strong> <span style="color:#f0e2c8;">The set uses O(n) memory and its bound is average-case; sorting is a guaranteed O(n log n) and can be fine for small inputs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Python detail:</strong> <span style="color:#f0e2c8;">I iterate the set rather than the list so duplicates do not repeat walks, and I test membership against the set, never the list.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the inner while loop not O(n²)?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It only runs from starts, and each number belongs to exactly one run, so all walks together touch each number once. That is amortized O(n).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would sorting be the better choice?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When memory is tight (sorting in place needs no set), when n is small, or when you need a guaranteed bound rather than an average one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the sequence itself?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Remember the start that produced <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code>, then return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(range(start, start + best))</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use union-find?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: union each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x + 1</code> when present and track component sizes; it is also near O(n) but more code. See [union-find](/interview-question/what-is-the-union-find-disjoint-set-data-structure).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the worst case for the set?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If many values land in the same bucket, lookups slow down and the bound degrades. Inputs crafted to collide can cause that; for ordinary inputs the average O(1) per lookup is the bound to state, and you should say it is an average.</span>
</div>


</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Consecutive sequence** | Values that differ by 1 when sorted, anywhere in the array |
| **Hash set** | Collection with average O(1) membership tests |
| **Start of a run** | A value \`x\` whose predecessor \`x - 1\` is absent |
| **Amortized analysis** | Bounding the total work across all iterations |
| **Average-case vs worst-case** | Expected cost with a good hash vs a guaranteed bound |

---
**Conclusion:** Longest consecutive sequence is a membership problem, not a sorting problem: put the numbers in a \`set\`, start counting only from values whose predecessor is missing, and every number is touched a constant number of times — O(n) on average, as Example 2's lookup counts confirm. Sorting is still correct and worth mentioning as the O(n log n) baseline with smaller memory and a guaranteed bound; the strong answer explains that trade-off instead of declaring one approach always better.`,
        examples: [
          {
            label: "Hash set and sorting on six inputs",
            code: `def longest_consecutive(nums):
    num_set = set(nums)              # O(n) to build; also removes duplicates
    best = 0
    for x in num_set:                # iterate the set, not nums (duplicates!)
        if x - 1 not in num_set:     # x starts a run only if x-1 is absent
            length = 1
            while x + length in num_set:
                length += 1
            best = max(best, length)
    return best


def longest_by_sorting(nums):        # the O(n log n) baseline
    if not nums:
        return 0
    s = sorted(set(nums))
    best = run = 1
    for i in range(1, len(s)):
        run = run + 1 if s[i] == s[i - 1] + 1 else 1
        best = max(best, run)
    return best


tests = [[100, 4, 200, 1, 3, 2], [0, 3, 7, 2, 5, 8, 4, 6, 0, 1], [], [1, 2, 0, 1],
         [-1, -2, -3, 10], [7]]
for nums in tests:
    print("[" + ", ".join(str(v) for v in nums) + "] -> hash set "
          + str(longest_consecutive(nums)) + ", sorting " + str(longest_by_sorting(nums)))`,
          },
          {
            label: "Counting lookups: with and without the start check",
            code: `# Count set lookups. "naive" walks forward from EVERY number; "smart" only
# from numbers whose predecessor is missing. Input: n distinct numbers forming
# one long run, listed in reverse order.
def count_lookups(nums, smart):
    num_set = set(nums)
    lookups = best = 0
    for x in num_set:
        if smart:
            lookups += 1
            if x - 1 in num_set:
                continue
        length = 1
        while True:
            lookups += 1
            if x + length not in num_set:
                break
            length += 1
        best = max(best, length)
    return best, lookups


for n in [10, 100, 1000, 10000]:
    nums = list(range(n - 1, -1, -1))
    b1, naive = count_lookups(nums, False)
    b2, smart = count_lookups(nums, True)
    print("n=" + str(n) + ": longest " + str(b1) + "/" + str(b2) + ", naive lookups "
          + str(naive) + ", smart lookups " + str(smart))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"In JavaScript, write a function that returns the length of the longest consecutive-values sequence in an unsorted array, in O(n). Also explain why sorting is not the answer here."

**What a strong answer should cover:**
- Build a \`Set\`, and start a walk only from \`x\` when \`x - 1\` is absent.
- Amortized O(n): each element is walked over at most once.
- Why not sort: O(n log n) versus O(n); memory and worst-case trade-offs.
- JavaScript specifics: \`Array.prototype.sort\` compares as strings by default, so a numeric sort needs \`(a, b) => a - b\`; \`Set\` iterates in insertion order; \`includes\` on an array is O(n).
- Edge cases: empty array, duplicates, negatives.

**Clarifying questions expected:**
- "Can there be duplicates, and should an empty array return 0?"
- "Is O(n log n) acceptable, or is O(n) required?" — the whole point of the question.

**Code / implementation expected:** Yes — a JavaScript function using \`Set\`.`,
        answer: `**Target Audience:** Intermediate candidates — you should know arrays and what a hash set does; Big-O basics help.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the JavaScript code with \`node main.js\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Imagine a deck of cards with numbers on them, shuffled and with some cards missing and some duplicated. You want the longest straight: the most numbers in a row, like 4-5-6-7. The obvious way is to sort the deck first and then read off the runs. That works, but sorting a big deck is the slow part.

A faster trick: spread the cards on a table where you can instantly check whether any number is present. Now pick up a card, say 5, and ask one question: "is 4 on the table?" If it is, 5 is in the middle of some straight, so you ignore it for now — whoever holds the start of that straight will count it. If 4 is *not* there, then 5 is the start of a straight, and you count upwards 6, 7, 8 until a number is missing. Because you only ever count upwards from a start, each card is counted inside a straight at most once. That is the O(n) answer, and the "why not sort" part of the question is asking you to explain exactly why it beats O(n log n).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the array contain duplicates? | Duplicates must not extend a run. A set removes them for free; the sort approach must skip equal neighbours. |
| Can it be empty? | The answer should then be 0, not 1. |
| What range can values take? | In Java and C++, \`x + 1\` overflows at the maximum \`int\`; the usual constraint (about plus or minus 10^9) avoids it. |
| Is O(n) required, or is O(n log n) acceptable? | It decides whether sorting is a fine answer, and it is the point of the question. |
| Do you want the length or the sequence itself? | Returning the run needs its start as well, a small change. |

## 3. The Core Idea: Only Count From the Start of a Run

Put every number in a hash set. A number \`x\` is the **start** of a consecutive run exactly when \`x - 1\` is not in the set. From each start, count upwards while \`x + 1\`, \`x + 2\`, ... are present.

📌 **Interview term: Consecutive sequence** — values that differ by exactly 1 when sorted, like 1, 2, 3, 4. They do not have to be adjacent in the array; \`[100, 4, 200, 1, 3, 2]\` contains the sequence 1, 2, 3, 4.

📌 **Interview term: Hash set** — a collection that answers "is \`x\` in here?" in average O(1) time by hashing \`x\` to a bucket. The details are in [how a hash table works](/interview-question/how-does-a-hash-table-work).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="The set 1 2 3 4 100 200. Runs start at 1, 100 and 200 because 0, 99 and 199 are absent. Walking from 1 reaches 4, a run of length 4">
  <defs>
    <marker id="b06q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub d-accent" x="70" y="38" text-anchor="middle">start</text>
  <rect class="d-box-accent" x="40" y="56" width="60" height="44" rx="8"/>
  <text class="d-text d-accent" x="70" y="84" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 100 78 L 136 78" marker-end="url(#b06q3-arrow)"/>
  <rect class="d-box" x="140" y="56" width="60" height="44" rx="8"/>
  <text class="d-text" x="170" y="84" text-anchor="middle">2</text>
  <path class="d-edge-accent" d="M 200 78 L 236 78" marker-end="url(#b06q3-arrow)"/>
  <rect class="d-box" x="240" y="56" width="60" height="44" rx="8"/>
  <text class="d-text" x="270" y="84" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 300 78 L 336 78" marker-end="url(#b06q3-arrow)"/>
  <rect class="d-box" x="340" y="56" width="60" height="44" rx="8"/>
  <text class="d-text" x="370" y="84" text-anchor="middle">4</text>
  <text class="d-sub" x="220" y="150" text-anchor="middle">run of length 4</text>
  <text class="d-sub d-accent" x="490" y="38" text-anchor="middle">start</text>
  <rect class="d-box-accent" x="460" y="56" width="60" height="44" rx="8"/>
  <text class="d-text d-accent" x="490" y="84" text-anchor="middle">100</text>
  <text class="d-sub" x="490" y="150" text-anchor="middle">length 1</text>
  <text class="d-sub d-accent" x="600" y="38" text-anchor="middle">start</text>
  <rect class="d-box-accent" x="570" y="56" width="60" height="44" rx="8"/>
  <text class="d-text d-accent" x="600" y="84" text-anchor="middle">200</text>
  <text class="d-sub" x="600" y="150" text-anchor="middle">length 1</text>
</svg>

Of the six numbers, only 1, 100 and 200 have no predecessor, so only those three start a walk. The walk from 1 visits 2, 3 and 4; numbers 2, 3 and 4 never start a walk of their own.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="For each x in the set, ask whether x minus 1 is in the set. If yes, skip x. If no, x starts a run, so count x plus 1, x plus 2 and so on">
  <defs>
    <marker id="b06q3-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="80" width="140" height="60" rx="10"/>
  <text class="d-text" x="90" y="115" text-anchor="middle">next x in set</text>
  <path class="d-edge" d="M 160 110 L 226 110" marker-end="url(#b06q3-arrow2)"/>
  <rect class="d-box" x="230" y="80" width="170" height="60" rx="10"/>
  <text class="d-text" x="315" y="115" text-anchor="middle">is x - 1 in set?</text>
  <path class="d-edge-dashed" d="M 400 96 L 466 46" marker-end="url(#b06q3-arrow2)"/>
  <text class="d-sub" x="420" y="56" text-anchor="middle">yes</text>
  <rect class="d-box-muted" x="470" y="16" width="190" height="56" rx="10"/>
  <text class="d-text" x="565" y="50" text-anchor="middle">skip: not a start</text>
  <path class="d-edge-accent" d="M 400 124 L 466 174" marker-end="url(#b06q3-arrow2)"/>
  <text class="d-sub" x="420" y="178" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="470" y="148" width="190" height="66" rx="10"/>
  <text class="d-text d-accent" x="565" y="176" text-anchor="middle">walk x+1, x+2</text>
  <text class="d-sub" x="565" y="200" text-anchor="middle">until a gap</text>
</svg>

Every number asks one membership question. Only starts go on to walk, and the walks never overlap.

## 4. Why O(n), and Why Not Just Sort?

**Why the hash-set version is O(n).** Each number does one "is \`x - 1\` present?" lookup: n lookups. The inner \`while\` loop runs only from starts, and each number is reached by at most one walk (the walk from the start of its run), so all the walks together do at most about n more lookups. Total: about 2n lookups, which is O(n). Example 2 counts exactly 2n lookups for a single run of \`n\` numbers.

📌 **Interview term: Amortized analysis** — bounding the *total* work of a loop rather than the worst single iteration. One walk can be n steps long, but the walks together are still n steps. See [amortized analysis](/interview-question/what-is-amortized-analysis).

**Why the start check matters.** Without the \`x - 1\` check, every number walks to the end of its run. For one run of n numbers that is \`n + (n - 1) + ... + 1 = n(n + 1) / 2\` steps, which is O(n²). Example 2 measured 50,005,000 lookups for n = 10,000 without the check and 20,000 with it.

**Why not sort?** Sorting is a perfectly correct answer: sort, then scan once and count runs (skipping duplicates). But comparison sorting costs O(n log n) — see [Big-O notation](/interview-question/what-is-big-o-notation) and [common sorting algorithms](/interview-question/compare-common-sorting-algorithms) — and the question explicitly asks for O(n). The honest trade-off to mention:

| | Hash set | Sort, then scan |
| :--- | :--- | :--- |
| Time | O(n) average | O(n log n) |
| Extra space | O(n) for the set | O(1) to O(n), depending on the sort |
| Worst case | Hash collisions can degrade lookups | Guaranteed O(n log n) |
| Constant factors | Hashing and pointer-chasing | Tight loops over contiguous memory |
| Mutates input | No | Yes, unless you copy first |

So "why not sort" has a precise answer: sorting does more work than the problem needs. You do not need the full order of the array, only "is the neighbour present?", and a hash set answers exactly that question in O(1). For small inputs sorting can still be the practical choice, and saying so shows judgement.

📌 **Interview term: Average-case vs worst-case** — the hash-set bound is an *average* (expected) bound that assumes a good hash function; the sort bound is a guaranteed worst case.

## 5. The Code in JavaScript

The O(n) solution from Example 1.

~~~javascript
function longestConsecutive(nums) {
  const numSet = new Set(nums);      // O(n) to build; also removes duplicates
  let best = 0;
  for (const x of numSet) {          // iterate the set, not nums (duplicates!)
    if (!numSet.has(x - 1)) {        // x starts a run only if x-1 is absent
      let length = 1;
      while (numSet.has(x + length)) length++;
      best = Math.max(best, length);
    }
  }
  return best;
}
~~~

**Line by line:**

- \`new Set(nums)\` builds the set and drops duplicates.
- \`for (const x of numSet)\` iterates the set in insertion order; the order does not matter for correctness.
- \`numSet.has(x - 1)\` is the start check; \`numSet.has(x + length)\` is the walk.

## 6. JavaScript Details That Matter Here

- **Default sort is a string sort.** \`[10, 9, 1, 100].sort()\` printed \`[ 1, 10, 100, 9 ]\`. The sort baseline in Example 1 passes \`(a, b) => a - b\`; forgetting it gives wrong runs for multi-digit numbers.
- **\`Set.has\` vs \`Array.includes\`.** \`has\` is an average O(1) hash lookup; \`includes\` scans the array, which would make the walk O(n) per step.
- **Integers are exact up to 2^53 - 1,** so \`x + length\` cannot overflow for 32-bit-range inputs.

## 7. Verified: Running the Code

Each example below is in the **JavaScript code** tab on this page. They were saved as \`main.js\` and run with \`node main.js\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Hash set and sorting on six inputs**

~~~text
[100, 4, 200, 1, 3, 2] -> hash set 4, sorting 4
[0, 3, 7, 2, 5, 8, 4, 6, 0, 1] -> hash set 9, sorting 9
[] -> hash set 0, sorting 0
[1, 2, 0, 1] -> hash set 3, sorting 3
[-1, -2, -3, 10] -> hash set 3, sorting 3
[7] -> hash set 1, sorting 1
~~~

**What this shows:** The hash-set answer and the sorting answer agree on every case, including the empty array, duplicates and negatives.

**Example 2 — Counting lookups: with and without the start check**

~~~text
n=10: longest 10/10, naive lookups 55, smart lookups 20
n=100: longest 100/100, naive lookups 5050, smart lookups 200
n=1000: longest 1000/1000, naive lookups 500500, smart lookups 2000
n=10000: longest 10000/10000, naive lookups 50005000, smart lookups 20000
~~~

**What this shows:** For a single run of \`n\` numbers, skipping the start check costs \`n(n + 1) / 2\` lookups (O(n²)); with the check it is exactly \`2n\` (O(n)). Both find the same longest run.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Hash set with start check | O(n) average | O(n) | About 2n set lookups in total |
| Hash set without start check | O(n²) | O(n) | Every element walks to the end of its run |
| Sort, then scan | O(n log n) | O(1) to O(n) | The sort dominates the single scan |
| Brute force (search for x+1 by scanning) | O(n³) | O(1) | Linear search for each step of each walk |

## 9. Edge Cases

- **Empty array** returns 0 (Example 1: \`[]\`).
- **Duplicates** (\`[1, 2, 0, 1]\` gives 3): the set ignores them; the sort version must skip equal neighbours.
- **Negative numbers** (\`[-1, -2, -3, 10]\` gives 3): nothing special.
- **Single element** returns 1.
- **Values at the integer limit** (Java and C++): \`x + 1\` overflows at the maximum \`int\`; see Pitfalls.

## 10. Common Pitfalls

- **\`nums.sort()\` without a comparator** sorts lexicographically, so the sort-based version finds wrong runs.
- **Using \`nums.includes(x + 1)\`** instead of \`set.has\`: O(n) per lookup.
- **Skipping the start check:** correct but O(n²); Example 2 shows 50,005,000 lookups at n = 10,000.
- **\`Math.max(...nums)\`-style tricks on huge arrays** can throw \`RangeError\` (a 10-million-element spread threw "Maximum call stack size exceeded" in Node 22).
- **Returning 1 for \`[]\`** by initialising \`best = 1\`.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Put everything in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> starts a run only if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x - 1</code> is missing, and from a start I count up with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">has(x + length)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why O(n):</strong> <span style="color:#f0e2c8;">One start check per element, and each element is walked over by at most one run: about 2n lookups.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why not sort:</strong> <span style="color:#f0e2c8;">Sorting is O(n log n) and gives the full order, but I only need neighbour membership, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set.has</code> answers in O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The trade-off:</strong> <span style="color:#f0e2c8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> costs O(n) memory and the bound is average-case; sorting is a guaranteed O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The JavaScript detail:</strong> <span style="color:#f0e2c8;">If I do sort, I must pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a, b) =&gt; a - b</code>, because the default sort compares numbers as strings.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the while loop not quadratic?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It runs only from starts, and each element belongs to one run, so the walks together cover each element once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[10, 9, 1].sort()</code> return?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[1, 10, 9]</code>: without a comparator, elements are compared as strings.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is sorting better?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For small arrays, when memory is tight, or when a guaranteed bound matters more than the average.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the sequence?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Track the start that produced <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> and build <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from({ length: best }, (_, i) =&gt; start + i)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could a plain object replace the Set?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It would work, but object keys become strings and you must guard inherited properties; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> keeps numbers as numbers and is the idiomatic choice.</span>
</div>


</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Consecutive sequence** | Values that differ by 1 when sorted, anywhere in the array |
| **Hash set** | Collection with average O(1) membership tests |
| **Start of a run** | A value \`x\` whose predecessor \`x - 1\` is absent |
| **Amortized analysis** | Bounding the total work across all iterations |
| **Average-case vs worst-case** | Expected cost with a good hash vs a guaranteed bound |

---
**Conclusion:** The O(n) answer treats the problem as membership: a \`Set\` of the values, a walk only from numbers whose predecessor is missing, and amortized two lookups per element, confirmed by the counts in Example 2. Sorting is the O(n log n) baseline — correct, lower memory, guaranteed — but it does more work than needed. In JavaScript, use \`Set.has\` rather than \`includes\`, and if you sort, never forget the numeric comparator.`,
        examples: [
          {
            label: "Hash set and sorting on six inputs",
            code: `function longestConsecutive(nums) {
  const numSet = new Set(nums);      // O(n) to build; also removes duplicates
  let best = 0;
  for (const x of numSet) {          // iterate the set, not nums (duplicates!)
    if (!numSet.has(x - 1)) {        // x starts a run only if x-1 is absent
      let length = 1;
      while (numSet.has(x + length)) length++;
      best = Math.max(best, length);
    }
  }
  return best;
}

function longestBySorting(nums) {    // the O(n log n) baseline
  if (nums.length === 0) return 0;
  // A comparator is required: the default sort compares numbers as strings.
  const s = [...new Set(nums)].sort((a, b) => a - b);
  let best = 1, run = 1;
  for (let i = 1; i < s.length; i++) {
    run = s[i] === s[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

const tests = [[100, 4, 200, 1, 3, 2], [0, 3, 7, 2, 5, 8, 4, 6, 0, 1], [], [1, 2, 0, 1],
  [-1, -2, -3, 10], [7]];
for (const nums of tests) {
  console.log('[' + nums.join(', ') + '] -> hash set ' + longestConsecutive(nums) +
    ', sorting ' + longestBySorting(nums));
}`,
          },
          {
            label: "Counting lookups: with and without the start check",
            code: `// Count set lookups. "naive" walks forward from EVERY number; "smart" only
// from numbers whose predecessor is missing. Input: n distinct numbers forming
// one long run, listed in reverse order.
function countLookups(nums, smart) {
  const numSet = new Set(nums);
  let lookups = 0, best = 0;
  for (const x of numSet) {
    if (smart) {
      lookups++;
      if (numSet.has(x - 1)) continue;
    }
    let length = 1;
    while (true) {
      lookups++;
      if (!numSet.has(x + length)) break;
      length++;
    }
    best = Math.max(best, length);
  }
  return [best, lookups];
}

for (const n of [10, 100, 1000, 10000]) {
  const nums = [];
  for (let v = n - 1; v >= 0; v--) nums.push(v);
  const [b1, naive] = countLookups(nums, false);
  const [b2, smart] = countLookups(nums, true);
  console.log('n=' + n + ': longest ' + b1 + '/' + b2 + ', naive lookups ' + naive +
    ', smart lookups ' + smart);
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Write a Java method that takes an int array and returns the length of the longest sequence of consecutive integers, in O(n) time. Then explain why you would not simply sort the array."

**What a strong answer should cover:**
- A \`HashSet<Integer>\` and the start check \`!set.contains(x - 1)\`.
- Amortized O(n): each element is walked over at most once.
- Why not sort: \`Arrays.sort\` is O(n log n); trade-offs in memory, worst case and constant factors (boxing).
- Java specifics: autoboxing every \`int\` into an \`Integer\`; \`x + 1\` overflows at \`Integer.MAX_VALUE\`.
- Edge cases: empty array, duplicates, negatives.

**Clarifying questions expected:**
- "Can there be duplicates, and should an empty array return 0?"
- "Is O(n log n) acceptable, or is O(n) required?" — the whole point of the question.

**Code / implementation expected:** Yes — a static Java method using \`HashSet<Integer>\`.`,
        answer: `**Target Audience:** Intermediate candidates — you should know arrays and what a hash set does; Big-O basics help.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the Java code with \`javac Main.java && java Main\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Imagine a deck of cards with numbers on them, shuffled and with some cards missing and some duplicated. You want the longest straight: the most numbers in a row, like 4-5-6-7. The obvious way is to sort the deck first and then read off the runs. That works, but sorting a big deck is the slow part.

A faster trick: spread the cards on a table where you can instantly check whether any number is present. Now pick up a card, say 5, and ask one question: "is 4 on the table?" If it is, 5 is in the middle of some straight, so you ignore it for now — whoever holds the start of that straight will count it. If 4 is *not* there, then 5 is the start of a straight, and you count upwards 6, 7, 8 until a number is missing. Because you only ever count upwards from a start, each card is counted inside a straight at most once. That is the O(n) answer, and the "why not sort" part of the question is asking you to explain exactly why it beats O(n log n).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the array contain duplicates? | Duplicates must not extend a run. A set removes them for free; the sort approach must skip equal neighbours. |
| Can it be empty? | The answer should then be 0, not 1. |
| What range can values take? | In Java and C++, \`x + 1\` overflows at the maximum \`int\`; the usual constraint (about plus or minus 10^9) avoids it. |
| Is O(n) required, or is O(n log n) acceptable? | It decides whether sorting is a fine answer, and it is the point of the question. |
| Do you want the length or the sequence itself? | Returning the run needs its start as well, a small change. |

## 3. The Core Idea: Only Count From the Start of a Run

Put every number in a hash set. A number \`x\` is the **start** of a consecutive run exactly when \`x - 1\` is not in the set. From each start, count upwards while \`x + 1\`, \`x + 2\`, ... are present.

📌 **Interview term: Consecutive sequence** — values that differ by exactly 1 when sorted, like 1, 2, 3, 4. They do not have to be adjacent in the array; \`[100, 4, 200, 1, 3, 2]\` contains the sequence 1, 2, 3, 4.

📌 **Interview term: Hash set** — a collection that answers "is \`x\` in here?" in average O(1) time by hashing \`x\` to a bucket. The details are in [how a hash table works](/interview-question/how-does-a-hash-table-work).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="The set 1 2 3 4 100 200. Runs start at 1, 100 and 200 because 0, 99 and 199 are absent. Walking from 1 reaches 4, a run of length 4">
  <defs>
    <marker id="b06q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub d-accent" x="70" y="38" text-anchor="middle">start</text>
  <rect class="d-box-accent" x="40" y="56" width="60" height="44" rx="8"/>
  <text class="d-text d-accent" x="70" y="84" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 100 78 L 136 78" marker-end="url(#b06q3-arrow)"/>
  <rect class="d-box" x="140" y="56" width="60" height="44" rx="8"/>
  <text class="d-text" x="170" y="84" text-anchor="middle">2</text>
  <path class="d-edge-accent" d="M 200 78 L 236 78" marker-end="url(#b06q3-arrow)"/>
  <rect class="d-box" x="240" y="56" width="60" height="44" rx="8"/>
  <text class="d-text" x="270" y="84" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 300 78 L 336 78" marker-end="url(#b06q3-arrow)"/>
  <rect class="d-box" x="340" y="56" width="60" height="44" rx="8"/>
  <text class="d-text" x="370" y="84" text-anchor="middle">4</text>
  <text class="d-sub" x="220" y="150" text-anchor="middle">run of length 4</text>
  <text class="d-sub d-accent" x="490" y="38" text-anchor="middle">start</text>
  <rect class="d-box-accent" x="460" y="56" width="60" height="44" rx="8"/>
  <text class="d-text d-accent" x="490" y="84" text-anchor="middle">100</text>
  <text class="d-sub" x="490" y="150" text-anchor="middle">length 1</text>
  <text class="d-sub d-accent" x="600" y="38" text-anchor="middle">start</text>
  <rect class="d-box-accent" x="570" y="56" width="60" height="44" rx="8"/>
  <text class="d-text d-accent" x="600" y="84" text-anchor="middle">200</text>
  <text class="d-sub" x="600" y="150" text-anchor="middle">length 1</text>
</svg>

Of the six numbers, only 1, 100 and 200 have no predecessor, so only those three start a walk. The walk from 1 visits 2, 3 and 4; numbers 2, 3 and 4 never start a walk of their own.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="For each x in the set, ask whether x minus 1 is in the set. If yes, skip x. If no, x starts a run, so count x plus 1, x plus 2 and so on">
  <defs>
    <marker id="b06q3-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="80" width="140" height="60" rx="10"/>
  <text class="d-text" x="90" y="115" text-anchor="middle">next x in set</text>
  <path class="d-edge" d="M 160 110 L 226 110" marker-end="url(#b06q3-arrow2)"/>
  <rect class="d-box" x="230" y="80" width="170" height="60" rx="10"/>
  <text class="d-text" x="315" y="115" text-anchor="middle">is x - 1 in set?</text>
  <path class="d-edge-dashed" d="M 400 96 L 466 46" marker-end="url(#b06q3-arrow2)"/>
  <text class="d-sub" x="420" y="56" text-anchor="middle">yes</text>
  <rect class="d-box-muted" x="470" y="16" width="190" height="56" rx="10"/>
  <text class="d-text" x="565" y="50" text-anchor="middle">skip: not a start</text>
  <path class="d-edge-accent" d="M 400 124 L 466 174" marker-end="url(#b06q3-arrow2)"/>
  <text class="d-sub" x="420" y="178" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="470" y="148" width="190" height="66" rx="10"/>
  <text class="d-text d-accent" x="565" y="176" text-anchor="middle">walk x+1, x+2</text>
  <text class="d-sub" x="565" y="200" text-anchor="middle">until a gap</text>
</svg>

Every number asks one membership question. Only starts go on to walk, and the walks never overlap.

## 4. Why O(n), and Why Not Just Sort?

**Why the hash-set version is O(n).** Each number does one "is \`x - 1\` present?" lookup: n lookups. The inner \`while\` loop runs only from starts, and each number is reached by at most one walk (the walk from the start of its run), so all the walks together do at most about n more lookups. Total: about 2n lookups, which is O(n). Example 2 counts exactly 2n lookups for a single run of \`n\` numbers.

📌 **Interview term: Amortized analysis** — bounding the *total* work of a loop rather than the worst single iteration. One walk can be n steps long, but the walks together are still n steps. See [amortized analysis](/interview-question/what-is-amortized-analysis).

**Why the start check matters.** Without the \`x - 1\` check, every number walks to the end of its run. For one run of n numbers that is \`n + (n - 1) + ... + 1 = n(n + 1) / 2\` steps, which is O(n²). Example 2 measured 50,005,000 lookups for n = 10,000 without the check and 20,000 with it.

**Why not sort?** Sorting is a perfectly correct answer: sort, then scan once and count runs (skipping duplicates). But comparison sorting costs O(n log n) — see [Big-O notation](/interview-question/what-is-big-o-notation) and [common sorting algorithms](/interview-question/compare-common-sorting-algorithms) — and the question explicitly asks for O(n). The honest trade-off to mention:

| | Hash set | Sort, then scan |
| :--- | :--- | :--- |
| Time | O(n) average | O(n log n) |
| Extra space | O(n) for the set | O(1) to O(n), depending on the sort |
| Worst case | Hash collisions can degrade lookups | Guaranteed O(n log n) |
| Constant factors | Hashing and pointer-chasing | Tight loops over contiguous memory |
| Mutates input | No | Yes, unless you copy first |

So "why not sort" has a precise answer: sorting does more work than the problem needs. You do not need the full order of the array, only "is the neighbour present?", and a hash set answers exactly that question in O(1). For small inputs sorting can still be the practical choice, and saying so shows judgement.

📌 **Interview term: Average-case vs worst-case** — the hash-set bound is an *average* (expected) bound that assumes a good hash function; the sort bound is a guaranteed worst case.

## 5. The Code in Java

The O(n) method from Example 1.

~~~java
static int longestConsecutive(int[] nums) {
    Set<Integer> numSet = new HashSet<>();
    for (int v : nums) numSet.add(v);       // O(n) to build; removes duplicates
    int best = 0;
    for (int x : numSet) {                  // iterate the set, not nums (duplicates!)
        if (!numSet.contains(x - 1)) {      // x starts a run only if x-1 is absent
            int length = 1;
            while (numSet.contains(x + length)) length++;
            best = Math.max(best, length);
        }
    }
    return best;
}
~~~

**Line by line:**

- \`numSet.add(v)\` autoboxes each \`int\` into an \`Integer\` object; \`contains(x - 1)\` boxes again to look it up.
- \`for (int x : numSet)\` iterates the set and unboxes each element; iterating the set rather than the array avoids repeated walks for duplicates.
- \`HashSet\` iteration order is unspecified, which is fine: the answer does not depend on order.

## 6. Java Details That Matter Here

- **Boxing cost.** \`HashSet<Integer>\` stores one \`Integer\` object per element plus the set entry around it. It is still O(n), but with a heavier constant than sorting a primitive \`int[]\`, which is part of the honest "why not sort" discussion.
- **Overflow in the walk.** With \`Integer.MAX_VALUE\` and \`Integer.MIN_VALUE\` both in the array, \`x + length\` wraps from MAX to MIN: a test run returned **2** for \`{2147483647, -2147483648}\`, while the sorting version returned the correct 1. The usual constraint (values within about plus or minus 10^9) rules this out; otherwise stop the walk at \`Integer.MAX_VALUE\` or use \`long\`.
- **\`Integer\` equality.** Comparing two \`Integer\` objects with \`==\` compares references outside the cached range: \`Integer p = 128, q = 128;\` gave \`p == q\` as \`false\` (while 127 gave \`true\`). Unbox to \`int\` or use \`equals\`.

## 7. Verified: Running the Code

Each example below is in the **Java code** tab on this page. They were saved as \`Main.java\` and run with \`javac Main.java && java Main\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Hash set and sorting on six inputs**

~~~text
[100, 4, 200, 1, 3, 2] -> hash set 4, sorting 4
[0, 3, 7, 2, 5, 8, 4, 6, 0, 1] -> hash set 9, sorting 9
[] -> hash set 0, sorting 0
[1, 2, 0, 1] -> hash set 3, sorting 3
[-1, -2, -3, 10] -> hash set 3, sorting 3
[7] -> hash set 1, sorting 1
~~~

**What this shows:** The hash-set answer and the sorting answer agree on every case, including the empty array, duplicates and negatives.

**Example 2 — Counting lookups: with and without the start check**

~~~text
n=10: longest 10/10, naive lookups 55, smart lookups 20
n=100: longest 100/100, naive lookups 5050, smart lookups 200
n=1000: longest 1000/1000, naive lookups 500500, smart lookups 2000
n=10000: longest 10000/10000, naive lookups 50005000, smart lookups 20000
~~~

**What this shows:** For a single run of \`n\` numbers, skipping the start check costs \`n(n + 1) / 2\` lookups (O(n²)); with the check it is exactly \`2n\` (O(n)). Both find the same longest run.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Hash set with start check | O(n) average | O(n) | About 2n set lookups in total |
| Hash set without start check | O(n²) | O(n) | Every element walks to the end of its run |
| Sort, then scan | O(n log n) | O(1) to O(n) | The sort dominates the single scan |
| Brute force (search for x+1 by scanning) | O(n³) | O(1) | Linear search for each step of each walk |

## 9. Edge Cases

- **Empty array** returns 0 (Example 1: \`[]\`).
- **Duplicates** (\`[1, 2, 0, 1]\` gives 3): the set ignores them; the sort version must skip equal neighbours.
- **Negative numbers** (\`[-1, -2, -3, 10]\` gives 3): nothing special.
- **Single element** returns 1.
- **Values at the integer limit** (Java and C++): \`x + 1\` overflows at the maximum \`int\`; see Pitfalls.

## 10. Common Pitfalls

- **Overflow at the edges:** \`x + length\` wraps at \`Integer.MAX_VALUE\`, producing a wrong run (tested: 2 instead of 1).
- **Comparing \`Integer\` objects with \`==\`** works for small values and fails above 127.
- **Skipping the start check:** correct but O(n²); Example 2 shows 50,005,000 lookups at n = 10,000.
- **\`Arrays.sort(nums)\` on the caller array** mutates it; clone first as \`longestBySorting\` does.
- **Not skipping duplicates in the sort version:** \`[1, 2, 2, 3]\` must give 3.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Put every value in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet&lt;Integer&gt;</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> starts a run only if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x - 1</code> is missing, and I count up while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x + length</code> is present.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why O(n):</strong> <span style="color:#f0e2c8;">One start check per value, and each value is walked over by at most one run: about 2n lookups.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why not sort:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.sort</code> is O(n log n) and computes the full order; I only need neighbour membership, which a hash set gives in average O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The trade-off:</strong> <span style="color:#f0e2c8;">The set boxes every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> and uses O(n) memory, so for small n sorting a primitive array can be practical.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x + 1</code> overflows at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code>; with the usual constraint that cannot happen, otherwise I guard the walk.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the while loop not quadratic?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It only runs from starts, and each value belongs to one run, so the walks together touch each value once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does boxing cost here?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each element becomes an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> object plus a set entry, so memory per element is several times an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>. Still O(n), but a heavier constant.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you avoid boxing?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Sort a primitive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> (O(n log n), no boxing), or use a primitive-int hash set from a library; the JDK has none built in.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is sorting better?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Small inputs, tight memory, or when you need a guaranteed bound instead of an average one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could union-find solve it?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: union <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x + 1</code> when present and track sizes; near O(n) but more code. See [union-find](/interview-question/what-is-the-union-find-disjoint-set-data-structure).</span>
</div>


</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Consecutive sequence** | Values that differ by 1 when sorted, anywhere in the array |
| **Hash set** | Collection with average O(1) membership tests |
| **Start of a run** | A value \`x\` whose predecessor \`x - 1\` is absent |
| **Amortized analysis** | Bounding the total work across all iterations |
| **Average-case vs worst-case** | Expected cost with a good hash vs a guaranteed bound |

---
**Conclusion:** Use a \`HashSet<Integer>\`, start a walk only from values with no predecessor, and every value is touched about twice — O(n) on average, as Example 2's counts show. Sorting with \`Arrays.sort\` is the correct O(n log n) baseline with no boxing and a guaranteed bound, and saying when it would win is part of a strong answer. In Java, also mention the two quiet traps: \`x + 1\` overflowing at \`Integer.MAX_VALUE\`, and \`Integer\` comparisons with \`==\`.`,
        examples: [
          {
            label: "Hash set and sorting on six inputs",
            code: `import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class Main {
    static int longestConsecutive(int[] nums) {
        Set<Integer> numSet = new HashSet<>();
        for (int v : nums) numSet.add(v);       // O(n) to build; removes duplicates
        int best = 0;
        for (int x : numSet) {                  // iterate the set, not nums (duplicates!)
            if (!numSet.contains(x - 1)) {      // x starts a run only if x-1 is absent
                int length = 1;
                while (numSet.contains(x + length)) length++;
                best = Math.max(best, length);
            }
        }
        return best;
    }

    static int longestBySorting(int[] nums) {   // the O(n log n) baseline
        if (nums.length == 0) return 0;
        int[] s = nums.clone();
        Arrays.sort(s);
        int best = 1, run = 1;
        for (int i = 1; i < s.length; i++) {
            if (s[i] == s[i - 1]) continue;     // skip duplicates
            run = (s[i] == s[i - 1] + 1) ? run + 1 : 1;
            best = Math.max(best, run);
        }
        return best;
    }

    public static void main(String[] args) {
        int[][] tests = {{100, 4, 200, 1, 3, 2}, {0, 3, 7, 2, 5, 8, 4, 6, 0, 1}, {}, {1, 2, 0, 1},
            {-1, -2, -3, 10}, {7}};
        for (int[] nums : tests) {
            System.out.println(Arrays.toString(nums) + " -> hash set " + longestConsecutive(nums)
                + ", sorting " + longestBySorting(nums));
        }
    }
}`,
          },
          {
            label: "Counting lookups: with and without the start check",
            code: `import java.util.HashSet;
import java.util.Set;

public class Main {
    static long lookups;

    // "naive" walks forward from EVERY number; "smart" only from numbers whose
    // predecessor is missing. Input: n distinct numbers forming one run, reversed.
    static int longest(int[] nums, boolean smart) {
        Set<Integer> numSet = new HashSet<>();
        for (int v : nums) numSet.add(v);
        int best = 0;
        for (int x : numSet) {
            if (smart) {
                lookups++;
                if (numSet.contains(x - 1)) continue;
            }
            int length = 1;
            while (true) {
                lookups++;
                if (!numSet.contains(x + length)) break;
                length++;
            }
            best = Math.max(best, length);
        }
        return best;
    }

    public static void main(String[] args) {
        for (int n : new int[]{10, 100, 1000, 10000}) {
            int[] nums = new int[n];
            for (int i = 0; i < n; i++) nums[i] = n - 1 - i;
            lookups = 0;
            int b1 = longest(nums, false);
            long naive = lookups;
            lookups = 0;
            int b2 = longest(nums, true);
            long smart = lookups;
            System.out.println("n=" + n + ": longest " + b1 + "/" + b2 + ", naive lookups " + naive
                + ", smart lookups " + smart);
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Using C++17, write a function that returns the length of the longest run of consecutive integers in an unsorted \`std::vector<int>\`, in O(n) time, and explain why sorting does not meet the requirement."

**What a strong answer should cover:**
- An \`std::unordered_set<int>\` and the start check \`count(x - 1) == 0\`.
- Amortized O(n): each element is walked over at most once.
- Why not sort: \`std::sort\` is O(n log n); trade-offs in memory, worst case and cache behaviour.
- C++ specifics: \`contains\` is C++20, so use \`count\` or \`find\` in C++17; \`x + 1\` at \`INT_MAX\` is signed overflow, which is undefined behaviour.
- Edge cases: empty vector, duplicates, negatives.

**Clarifying questions expected:**
- "Can there be duplicates, and should an empty array return 0?"
- "Is O(n log n) acceptable, or is O(n) required?" — the whole point of the question.

**Code / implementation expected:** Yes — a C++17 function using \`std::unordered_set\`.`,
        answer: `**Target Audience:** Intermediate candidates — you should know arrays and what a hash set does; Big-O basics help.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the C++ code with \`g++ -std=c++17 main.cpp && ./a.out\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Imagine a deck of cards with numbers on them, shuffled and with some cards missing and some duplicated. You want the longest straight: the most numbers in a row, like 4-5-6-7. The obvious way is to sort the deck first and then read off the runs. That works, but sorting a big deck is the slow part.

A faster trick: spread the cards on a table where you can instantly check whether any number is present. Now pick up a card, say 5, and ask one question: "is 4 on the table?" If it is, 5 is in the middle of some straight, so you ignore it for now — whoever holds the start of that straight will count it. If 4 is *not* there, then 5 is the start of a straight, and you count upwards 6, 7, 8 until a number is missing. Because you only ever count upwards from a start, each card is counted inside a straight at most once. That is the O(n) answer, and the "why not sort" part of the question is asking you to explain exactly why it beats O(n log n).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the array contain duplicates? | Duplicates must not extend a run. A set removes them for free; the sort approach must skip equal neighbours. |
| Can it be empty? | The answer should then be 0, not 1. |
| What range can values take? | In Java and C++, \`x + 1\` overflows at the maximum \`int\`; the usual constraint (about plus or minus 10^9) avoids it. |
| Is O(n) required, or is O(n log n) acceptable? | It decides whether sorting is a fine answer, and it is the point of the question. |
| Do you want the length or the sequence itself? | Returning the run needs its start as well, a small change. |

## 3. The Core Idea: Only Count From the Start of a Run

Put every number in a hash set. A number \`x\` is the **start** of a consecutive run exactly when \`x - 1\` is not in the set. From each start, count upwards while \`x + 1\`, \`x + 2\`, ... are present.

📌 **Interview term: Consecutive sequence** — values that differ by exactly 1 when sorted, like 1, 2, 3, 4. They do not have to be adjacent in the array; \`[100, 4, 200, 1, 3, 2]\` contains the sequence 1, 2, 3, 4.

📌 **Interview term: Hash set** — a collection that answers "is \`x\` in here?" in average O(1) time by hashing \`x\` to a bucket. The details are in [how a hash table works](/interview-question/how-does-a-hash-table-work).

<svg class="iq-diagram" width="100%" viewBox="0 0 660 200" role="img" aria-label="The set 1 2 3 4 100 200. Runs start at 1, 100 and 200 because 0, 99 and 199 are absent. Walking from 1 reaches 4, a run of length 4">
  <defs>
    <marker id="b06q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub d-accent" x="70" y="38" text-anchor="middle">start</text>
  <rect class="d-box-accent" x="40" y="56" width="60" height="44" rx="8"/>
  <text class="d-text d-accent" x="70" y="84" text-anchor="middle">1</text>
  <path class="d-edge-accent" d="M 100 78 L 136 78" marker-end="url(#b06q3-arrow)"/>
  <rect class="d-box" x="140" y="56" width="60" height="44" rx="8"/>
  <text class="d-text" x="170" y="84" text-anchor="middle">2</text>
  <path class="d-edge-accent" d="M 200 78 L 236 78" marker-end="url(#b06q3-arrow)"/>
  <rect class="d-box" x="240" y="56" width="60" height="44" rx="8"/>
  <text class="d-text" x="270" y="84" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 300 78 L 336 78" marker-end="url(#b06q3-arrow)"/>
  <rect class="d-box" x="340" y="56" width="60" height="44" rx="8"/>
  <text class="d-text" x="370" y="84" text-anchor="middle">4</text>
  <text class="d-sub" x="220" y="150" text-anchor="middle">run of length 4</text>
  <text class="d-sub d-accent" x="490" y="38" text-anchor="middle">start</text>
  <rect class="d-box-accent" x="460" y="56" width="60" height="44" rx="8"/>
  <text class="d-text d-accent" x="490" y="84" text-anchor="middle">100</text>
  <text class="d-sub" x="490" y="150" text-anchor="middle">length 1</text>
  <text class="d-sub d-accent" x="600" y="38" text-anchor="middle">start</text>
  <rect class="d-box-accent" x="570" y="56" width="60" height="44" rx="8"/>
  <text class="d-text d-accent" x="600" y="84" text-anchor="middle">200</text>
  <text class="d-sub" x="600" y="150" text-anchor="middle">length 1</text>
</svg>

Of the six numbers, only 1, 100 and 200 have no predecessor, so only those three start a walk. The walk from 1 visits 2, 3 and 4; numbers 2, 3 and 4 never start a walk of their own.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="For each x in the set, ask whether x minus 1 is in the set. If yes, skip x. If no, x starts a run, so count x plus 1, x plus 2 and so on">
  <defs>
    <marker id="b06q3-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="80" width="140" height="60" rx="10"/>
  <text class="d-text" x="90" y="115" text-anchor="middle">next x in set</text>
  <path class="d-edge" d="M 160 110 L 226 110" marker-end="url(#b06q3-arrow2)"/>
  <rect class="d-box" x="230" y="80" width="170" height="60" rx="10"/>
  <text class="d-text" x="315" y="115" text-anchor="middle">is x - 1 in set?</text>
  <path class="d-edge-dashed" d="M 400 96 L 466 46" marker-end="url(#b06q3-arrow2)"/>
  <text class="d-sub" x="420" y="56" text-anchor="middle">yes</text>
  <rect class="d-box-muted" x="470" y="16" width="190" height="56" rx="10"/>
  <text class="d-text" x="565" y="50" text-anchor="middle">skip: not a start</text>
  <path class="d-edge-accent" d="M 400 124 L 466 174" marker-end="url(#b06q3-arrow2)"/>
  <text class="d-sub" x="420" y="178" text-anchor="middle">no</text>
  <rect class="d-box-accent" x="470" y="148" width="190" height="66" rx="10"/>
  <text class="d-text d-accent" x="565" y="176" text-anchor="middle">walk x+1, x+2</text>
  <text class="d-sub" x="565" y="200" text-anchor="middle">until a gap</text>
</svg>

Every number asks one membership question. Only starts go on to walk, and the walks never overlap.

## 4. Why O(n), and Why Not Just Sort?

**Why the hash-set version is O(n).** Each number does one "is \`x - 1\` present?" lookup: n lookups. The inner \`while\` loop runs only from starts, and each number is reached by at most one walk (the walk from the start of its run), so all the walks together do at most about n more lookups. Total: about 2n lookups, which is O(n). Example 2 counts exactly 2n lookups for a single run of \`n\` numbers.

📌 **Interview term: Amortized analysis** — bounding the *total* work of a loop rather than the worst single iteration. One walk can be n steps long, but the walks together are still n steps. See [amortized analysis](/interview-question/what-is-amortized-analysis).

**Why the start check matters.** Without the \`x - 1\` check, every number walks to the end of its run. For one run of n numbers that is \`n + (n - 1) + ... + 1 = n(n + 1) / 2\` steps, which is O(n²). Example 2 measured 50,005,000 lookups for n = 10,000 without the check and 20,000 with it.

**Why not sort?** Sorting is a perfectly correct answer: sort, then scan once and count runs (skipping duplicates). But comparison sorting costs O(n log n) — see [Big-O notation](/interview-question/what-is-big-o-notation) and [common sorting algorithms](/interview-question/compare-common-sorting-algorithms) — and the question explicitly asks for O(n). The honest trade-off to mention:

| | Hash set | Sort, then scan |
| :--- | :--- | :--- |
| Time | O(n) average | O(n log n) |
| Extra space | O(n) for the set | O(1) to O(n), depending on the sort |
| Worst case | Hash collisions can degrade lookups | Guaranteed O(n log n) |
| Constant factors | Hashing and pointer-chasing | Tight loops over contiguous memory |
| Mutates input | No | Yes, unless you copy first |

So "why not sort" has a precise answer: sorting does more work than the problem needs. You do not need the full order of the array, only "is the neighbour present?", and a hash set answers exactly that question in O(1). For small inputs sorting can still be the practical choice, and saying so shows judgement.

📌 **Interview term: Average-case vs worst-case** — the hash-set bound is an *average* (expected) bound that assumes a good hash function; the sort bound is a guaranteed worst case.

## 5. The Code in C++

The O(n) function from Example 1.

~~~cpp
#include <algorithm>
#include <iostream>
#include <string>
#include <unordered_set>
#include <vector>

int longestConsecutive(const std::vector<int>& nums) {
    std::unordered_set<int> numSet(nums.begin(), nums.end());  // removes duplicates
    int best = 0;
    for (int x : numSet) {                    // iterate the set, not nums (duplicates!)
        if (numSet.count(x - 1) == 0) {       // x starts a run only if x-1 is absent
            int length = 1;
            while (numSet.count(x + length)) length++;
            best = std::max(best, length);
        }
    }
    return best;
}
~~~

**Line by line:**

- \`std::unordered_set<int> numSet(nums.begin(), nums.end())\` builds the set from the iterator range and drops duplicates.
- \`numSet.count(x - 1) == 0\` is the start check. \`count\` returns 0 or 1 for a set; \`contains\` would read better but only exists from C++20.
- Iteration order of \`unordered_set\` is unspecified; the result does not depend on it.

## 6. C++ Details That Matter Here

- **C++17 has no \`contains\`.** Use \`count(x)\` or \`find(x) != end()\`; both are average O(1).
- **Signed overflow is undefined behaviour.** If \`INT_MAX\` can appear, \`x + length\` overflows; the usual constraint (about plus or minus 10^9) avoids it, otherwise compute in \`long long\` or stop at \`INT_MAX\`.
- **\`reserve\`.** Calling \`numSet.reserve(nums.size())\` before inserting avoids rehashing as the set grows — a cheap improvement to mention.
- **Sort baseline:** \`std::sort\` plus \`std::unique\` + \`erase\` removes duplicates in place, as \`longestBySorting\` does (it takes the vector by value, so the caller copy is untouched).

## 7. Verified: Running the Code

Each example below is in the **C++ code** tab on this page. They were saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Hash set and sorting on six inputs**

~~~text
[100, 4, 200, 1, 3, 2] -> hash set 4, sorting 4
[0, 3, 7, 2, 5, 8, 4, 6, 0, 1] -> hash set 9, sorting 9
[] -> hash set 0, sorting 0
[1, 2, 0, 1] -> hash set 3, sorting 3
[-1, -2, -3, 10] -> hash set 3, sorting 3
[7] -> hash set 1, sorting 1
~~~

**What this shows:** The hash-set answer and the sorting answer agree on every case, including the empty array, duplicates and negatives.

**Example 2 — Counting lookups: with and without the start check**

~~~text
n=10: longest 10/10, naive lookups 55, smart lookups 20
n=100: longest 100/100, naive lookups 5050, smart lookups 200
n=1000: longest 1000/1000, naive lookups 500500, smart lookups 2000
n=10000: longest 10000/10000, naive lookups 50005000, smart lookups 20000
~~~

**What this shows:** For a single run of \`n\` numbers, skipping the start check costs \`n(n + 1) / 2\` lookups (O(n²)); with the check it is exactly \`2n\` (O(n)). Both find the same longest run.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Hash set with start check | O(n) average | O(n) | About 2n set lookups in total |
| Hash set without start check | O(n²) | O(n) | Every element walks to the end of its run |
| Sort, then scan | O(n log n) | O(1) to O(n) | The sort dominates the single scan |
| Brute force (search for x+1 by scanning) | O(n³) | O(1) | Linear search for each step of each walk |

## 9. Edge Cases

- **Empty array** returns 0 (Example 1: \`[]\`).
- **Duplicates** (\`[1, 2, 0, 1]\` gives 3): the set ignores them; the sort version must skip equal neighbours.
- **Negative numbers** (\`[-1, -2, -3, 10]\` gives 3): nothing special.
- **Single element** returns 1.
- **Values at the integer limit** (Java and C++): \`x + 1\` overflows at the maximum \`int\`; see Pitfalls.

## 10. Common Pitfalls

- **Calling \`contains\` in C++17**: it does not compile; use \`count\` or \`find\`.
- **\`x + length\` at \`INT_MAX\`** is signed overflow, undefined behaviour.
- **Skipping the start check:** correct but O(n²); Example 2 shows 50,005,000 lookups at n = 10,000.
- **\`std::unique\` without \`erase\`** only moves the unique elements to the front; the vector keeps its old size.
- **Using \`operator[]\` on an \`unordered_map\` as a membership test** inserts a default value; with \`unordered_set\` use \`count\` or \`find\`.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The idea:</strong> <span style="color:#f0e2c8;">Insert everything into an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_set</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> starts a run only if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count(x - 1) == 0</code>, and from a start I count up while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count(x + length)</code> is 1.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why O(n):</strong> <span style="color:#f0e2c8;">One start check per element, and each element is walked over by at most one run: about 2n lookups.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why not sort:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::sort</code> is O(n log n) and computes the full order; I only need neighbour membership.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The trade-off:</strong> <span style="color:#f0e2c8;">The hash set needs O(n) memory and node allocations, and its bound is average-case; sorting is a guaranteed O(n log n) and cache-friendly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ detail:</strong> <span style="color:#f0e2c8;">In C++17 I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> (no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contains</code>), I <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reserve</code> the set, and I note that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x + 1</code> at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INT_MAX</code> is undefined behaviour.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the inner loop not quadratic?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It only runs from starts, and each element belongs to one run, so the walks together touch each element once.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might sorting be faster in practice for small n?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A sorted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector</code> is contiguous and cache-friendly, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_set</code> allocates nodes and follows pointers; for small inputs the constant factors can dominate.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">reserve</code> buy you?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It sizes the bucket array up front so inserts do not trigger rehashing while the set grows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the worst case of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unordered_set</code>?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With many collisions a lookup degrades to linear in the bucket size, so the O(n) bound is an average, not a guarantee.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you return the sequence?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Remember the start that produced <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">best</code> and fill a vector with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::iota</code> from that start.</span>
</div>


</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Consecutive sequence** | Values that differ by 1 when sorted, anywhere in the array |
| **Hash set** | Collection with average O(1) membership tests |
| **Start of a run** | A value \`x\` whose predecessor \`x - 1\` is absent |
| **Amortized analysis** | Bounding the total work across all iterations |
| **Average-case vs worst-case** | Expected cost with a good hash vs a guaranteed bound |

---
**Conclusion:** The O(n) solution asks, for each value, only whether its neighbour exists: an \`std::unordered_set\`, a walk only from values with no predecessor, and about two lookups per element, as Example 2 counts. \`std::sort\` plus one scan is the correct O(n log n) baseline and can win on small inputs thanks to contiguous memory. In C++17, use \`count\` or \`find\` (not \`contains\`), reserve the set, and remember that \`x + 1\` at \`INT_MAX\` is undefined behaviour.`,
        examples: [
          {
            label: "Hash set and sorting on six inputs",
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <unordered_set>
#include <vector>

int longestConsecutive(const std::vector<int>& nums) {
    std::unordered_set<int> numSet(nums.begin(), nums.end());  // removes duplicates
    int best = 0;
    for (int x : numSet) {                    // iterate the set, not nums (duplicates!)
        if (numSet.count(x - 1) == 0) {       // x starts a run only if x-1 is absent
            int length = 1;
            while (numSet.count(x + length)) length++;
            best = std::max(best, length);
        }
    }
    return best;
}

int longestBySorting(std::vector<int> s) {    // the O(n log n) baseline (takes a copy)
    if (s.empty()) return 0;
    std::sort(s.begin(), s.end());
    s.erase(std::unique(s.begin(), s.end()), s.end());  // drop duplicates
    int best = 1, run = 1;
    for (size_t i = 1; i < s.size(); i++) {
        run = (s[i] == s[i - 1] + 1) ? run + 1 : 1;
        best = std::max(best, run);
    }
    return best;
}

std::string fmt(const std::vector<int>& a) {
    std::string s = "[";
    for (size_t i = 0; i < a.size(); i++) {
        if (i > 0) s += ", ";
        s += std::to_string(a[i]);
    }
    return s + "]";
}

int main() {
    std::vector<std::vector<int>> tests = {{100, 4, 200, 1, 3, 2}, {0, 3, 7, 2, 5, 8, 4, 6, 0, 1}, {},
                                           {1, 2, 0, 1}, {-1, -2, -3, 10}, {7}};
    for (const auto& nums : tests) {
        std::cout << fmt(nums) << " -> hash set " << longestConsecutive(nums)
                  << ", sorting " << longestBySorting(nums) << "\\n";
    }
    return 0;
}`,
          },
          {
            label: "Counting lookups: with and without the start check",
            code: `#include <algorithm>
#include <iostream>
#include <unordered_set>
#include <vector>

long long lookups = 0;

// "naive" walks forward from EVERY number; "smart" only from numbers whose
// predecessor is missing. Input: n distinct numbers forming one run, reversed.
int longest(const std::vector<int>& nums, bool smart) {
    std::unordered_set<int> numSet(nums.begin(), nums.end());
    int best = 0;
    for (int x : numSet) {
        if (smart) {
            lookups++;
            if (numSet.count(x - 1)) continue;
        }
        int length = 1;
        while (true) {
            lookups++;
            if (!numSet.count(x + length)) break;
            length++;
        }
        best = std::max(best, length);
    }
    return best;
}

int main() {
    for (int n : {10, 100, 1000, 10000}) {
        std::vector<int> nums;
        for (int v = n - 1; v >= 0; v--) nums.push_back(v);
        lookups = 0;
        int b1 = longest(nums, false);
        long long naive = lookups;
        lookups = 0;
        int b2 = longest(nums, true);
        long long smart = lookups;
        std::cout << "n=" << n << ": longest " << b1 << "/" << b2 << ", naive lookups " << naive
                  << ", smart lookups " << smart << "\\n";
    }
    return 0;
}`,
          },
        ],
      },
    },
  },
  {
    title: "What is the prefix sum technique?",
    difficulty: "easy",
    seoDescription: "The prefix sum technique: O(n) build, O(1) range-sum queries, 2D prefix sums and difference arrays, explained in Python, JavaScript, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"What is the prefix sum technique? Explain it, then write Python code that preprocesses a list so that any range-sum query takes constant time."

**What a strong answer should cover:**
- Definition: \`prefix[i]\` is the sum of the first \`i\` elements; with a leading 0, the range \`l..r\` is \`prefix[r + 1] - prefix[l]\`.
- Cost: O(n) to build, O(1) per query; O(n + q) instead of O(n·q) for q queries.
- When to use it (static array, subarray-sum problems) and when not (frequent updates: Fenwick or segment tree).
- Extensions: 2D prefix sums with inclusion-exclusion; difference arrays for range updates.
- Python specifics: \`itertools.accumulate\` (with \`initial=0\`), list comprehensions for 2D tables, ints never overflow.

**Code / implementation expected:** Yes — build and query functions in Python.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and loops.
**Difficulty:** Easy
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the Python code with \`python3 main.py\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Think of a car odometer. If it read 1,200 km when you left home and 1,550 km when you arrived, you drove 350 km — you did not need to add up every kilometre of the trip, you just subtracted two readings. A prefix sum is an odometer for an array: for every position it stores "total so far". Then the sum of any stretch of the array is just one reading minus another.

The trade is simple: spend one pass, O(n), writing down the running totals, and afterwards every "sum from index \`l\` to index \`r\`" question costs O(1) instead of a loop. When an array is queried many times, or when a problem talks about "subarrays with a given sum", this is the tool to reach for.

## 2. The Definition

📌 **Interview term: Prefix sum** — for an array \`nums\`, the array \`prefix\` where \`prefix[i]\` is the sum of the first \`i\` elements, \`nums[0] + ... + nums[i - 1]\`. Also called a *cumulative sum* or *running total*.

The most useful convention gives \`prefix\` one extra slot, \`prefix[0] = 0\` (the sum of no elements), so it has length \`n + 1\`. Then:

- \`prefix[i + 1] = prefix[i] + nums[i]\` builds it in one pass.
- The sum of the inclusive range \`nums[l..r]\` is \`prefix[r + 1] - prefix[l]\`.

📌 **Interview term: Range sum query** — asking for the sum of a contiguous stretch \`nums[l..r]\`. With a prefix array, each query is O(1).

📌 **Interview term: Sentinel** — a dummy value placed at the edge of a structure so that boundary cases need no special code. The leading 0 is a sentinel: without it, a range starting at index 0 would need an \`if\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 270" role="img" aria-label="nums 3 1 4 1 5 9 2 6 and its prefix array 0 3 4 8 9 14 23 25 31. The sum of indices 2 to 5 is prefix 6 minus prefix 2, which is 23 minus 4, or 19">
  <text class="d-sub" x="10" y="67">nums</text>
  <rect class="d-box-muted" x="120" y="40" width="56" height="42" rx="8"/>
  <text class="d-text" x="148" y="67" text-anchor="middle">3</text>
  <text class="d-sub" x="148" y="28" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="190" y="40" width="56" height="42" rx="8"/>
  <text class="d-text" x="218" y="67" text-anchor="middle">1</text>
  <text class="d-sub" x="218" y="28" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="260" y="40" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="288" y="67" text-anchor="middle">4</text>
  <text class="d-sub" x="288" y="28" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="330" y="40" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="358" y="67" text-anchor="middle">1</text>
  <text class="d-sub" x="358" y="28" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="400" y="40" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="428" y="67" text-anchor="middle">5</text>
  <text class="d-sub" x="428" y="28" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="470" y="40" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="498" y="67" text-anchor="middle">9</text>
  <text class="d-sub" x="498" y="28" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="540" y="40" width="56" height="42" rx="8"/>
  <text class="d-text" x="568" y="67" text-anchor="middle">2</text>
  <text class="d-sub" x="568" y="28" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="610" y="40" width="56" height="42" rx="8"/>
  <text class="d-text" x="638" y="67" text-anchor="middle">6</text>
  <text class="d-sub" x="638" y="28" text-anchor="middle">7</text>
  <text class="d-sub" x="10" y="147">prefix</text>
  <rect class="d-box" x="85" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="113" y="147" text-anchor="middle">0</text>
  <rect class="d-box" x="155" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="183" y="147" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="225" y="120" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="253" y="147" text-anchor="middle">4</text>
  <rect class="d-box" x="295" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="323" y="147" text-anchor="middle">8</text>
  <rect class="d-box" x="365" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="393" y="147" text-anchor="middle">9</text>
  <rect class="d-box" x="435" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="463" y="147" text-anchor="middle">14</text>
  <rect class="d-box-accent" x="505" y="120" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="533" y="147" text-anchor="middle">23</text>
  <rect class="d-box" x="575" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="603" y="147" text-anchor="middle">25</text>
  <rect class="d-box" x="645" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="673" y="147" text-anchor="middle">31</text>
  <rect class="d-box-muted" x="150" y="200" width="440" height="48" rx="10"/>
  <text class="d-text" x="370" y="230" text-anchor="middle">sum(2..5) = prefix[6] - prefix[2] = 23 - 4 = 19</text>
</svg>

The highlighted elements 4, 1, 5 and 9 add up to 19, and the same number falls out of two lookups in the prefix row: 23 (everything up to index 5) minus 4 (everything before index 2).

## 3. Why It Works, and When to Use It

\`prefix[r + 1]\` is the sum of \`nums[0..r]\` and \`prefix[l]\` is the sum of \`nums[0..l-1]\`. Subtracting removes the part before \`l\` and leaves exactly \`nums[l..r]\`. Nothing more than that.

**Use it when:**
- the array does **not change** and you answer **many** range-sum queries (q queries go from O(n·q) to O(n + q));
- a problem asks about **subarray sums** — "how many subarrays sum to \`k\`", "longest subarray with sum 0", "is there a subarray divisible by \`k\`". The trick is that a subarray sum is a *difference of two prefix sums*, so you look for pairs of prefixes. That is the whole solution of [count subarrays that sum to k](/interview-question/how-do-you-count-subarrays-that-sum-to-k);
- you need "everything except me" or "everything before me" totals — [product of array except self](/interview-question/how-do-you-compute-the-product-of-an-array-except-self-without-division) is the multiplicative cousin.

**Do not use a plain prefix array when** the values change between queries: one update can change O(n) prefix entries. Then use a Fenwick tree or a [segment tree](/interview-question/what-is-a-segment-tree-and-when-do-you-need-one), which support both updates and queries in O(log n).

📌 **Interview term: Precomputation** — doing work once up front so that later queries are cheap. Prefix sums are the simplest example.

## 4. Two Extensions Worth Knowing

**2D prefix sums.** For a grid, let \`P[r][c]\` be the sum of the rectangle from the top-left corner to just before \`(r, c)\`. Build it with \`P[r+1][c+1] = grid[r][c] + P[r][c+1] + P[r+1][c] - P[r][c]\`, and any rectangle sum becomes four lookups:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="A rectangle sum is the big top-left block, minus the strip above, minus the strip to the left, plus the corner that was subtracted twice">
  <rect class="d-box-muted" x="30" y="30" width="110" height="110" rx="4"/>
  <rect class="d-box-accent" x="30" y="30" width="110" height="110" rx="4"/>
  <path class="d-edge-dashed" d="M 70 70 L 140 70 L 140 140 L 70 140 Z"/>
  <text class="d-sub" x="85" y="172" text-anchor="middle">P[r2+1][c2+1]</text>
  <text class="d-text" x="175" y="90" text-anchor="middle">-</text>
  <rect class="d-box-muted" x="210" y="30" width="110" height="110" rx="4"/>
  <rect class="d-box-accent" x="210" y="30" width="110" height="40" rx="4"/>
  <path class="d-edge-dashed" d="M 250 70 L 320 70 L 320 140 L 250 140 Z"/>
  <text class="d-sub" x="265" y="172" text-anchor="middle">P[r1][c2+1]</text>
  <text class="d-text" x="355" y="90" text-anchor="middle">-</text>
  <rect class="d-box-muted" x="390" y="30" width="110" height="110" rx="4"/>
  <rect class="d-box-accent" x="390" y="30" width="40" height="110" rx="4"/>
  <path class="d-edge-dashed" d="M 430 70 L 500 70 L 500 140 L 430 140 Z"/>
  <text class="d-sub" x="445" y="172" text-anchor="middle">P[r2+1][c1]</text>
  <text class="d-text" x="535" y="90" text-anchor="middle">+</text>
  <rect class="d-box-muted" x="570" y="30" width="110" height="110" rx="4"/>
  <rect class="d-box-accent" x="570" y="30" width="40" height="40" rx="4"/>
  <path class="d-edge-dashed" d="M 610 70 L 680 70 L 680 140 L 610 140 Z"/>
  <text class="d-sub" x="625" y="172" text-anchor="middle">P[r1][c1]</text>
</svg>

Take the whole top-left block, cut away the strip above the rectangle and the strip to its left, then add back the corner, which was cut away twice. This add-subtract-add-back pattern is called inclusion-exclusion.

📌 **Interview term: Inclusion-exclusion** — counting a region by adding and subtracting overlapping parts so that each cell is counted exactly once.

**Difference arrays.** The reverse operation. To "add \`v\` to every element in \`[l, r]\`" many times, write \`+v\` at \`l\` and \`-v\` at \`r + 1\` in a difference array (O(1) per update), then take one prefix sum at the end to get the final values.

📌 **Interview term: Difference array** — an array of changes between neighbours; its prefix sum rebuilds the original. It turns range updates into O(1) point updates.

## 5. The Code in Python

The build and query functions from Example 1.

~~~python
from itertools import accumulate


def build_prefix(nums):
    prefix = [0] * (len(nums) + 1)      # prefix[i] = sum of nums[0..i-1]; prefix[0] = 0
    for i, v in enumerate(nums):
        prefix[i + 1] = prefix[i] + v
    return prefix


def range_sum(prefix, left, right):     # inclusive left..right, O(1)
    return prefix[right + 1] - prefix[left]
~~~

**Line by line:**

- \`prefix = [0] * (len(nums) + 1)\` reserves the sentinel slot at index 0.
- \`enumerate(nums)\` gives the index and value so \`prefix[i + 1] = prefix[i] + v\` reads like the definition.
- \`range_sum\` is the whole technique in one line: \`prefix[right + 1] - prefix[left]\`.

## 6. Python Details That Matter Here

- **\`itertools.accumulate\`** produces running totals. Without arguments it is *inclusive* and has no leading 0 (Example 1 prints \`[3, 4, 8, ...]\`). It also accepts an \`initial=\` argument (checked on Python 3.13; older interpreters may lack it): \`list(accumulate([3, 1, 4], initial=0))\` returned \`[0, 3, 4, 8]\`, exactly the sentinel form.
- **Building 2D tables:** \`[[0] * (cols + 1) for _ in range(rows + 1)]\` creates independent rows. \`[[0] * (cols + 1)] * (rows + 1)\` repeats *one* row object; a test assignment to \`a[0][0]\` showed up in every row.
- **No overflow:** Python ints are arbitrary precision, so prefix totals never wrap.

## 7. Verified: Running the Code

Each example below is in the **Python code** tab on this page. They were saved as \`main.py\` and run with \`python3 main.py\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Build a prefix array and answer range queries**

~~~text
nums   = [3, 1, 4, 1, 5, 9, 2, 6]
prefix = [0, 3, 4, 8, 9, 14, 23, 25, 31]
accumulate = [3, 4, 8, 9, 14, 23, 25, 31]
sum(0..7) = 31 (loop check 31)
sum(2..5) = 19 (loop check 19)
sum(3..3) = 1 (loop check 1)
sum(5..7) = 17 (loop check 17)
~~~

**What this shows:** Each O(1) answer matches a direct loop over the range. The running total without the leading 0 is what the language's built-in scan produces.

**Example 2 — 2D prefix sums for rectangle queries**

~~~text
  0   0   0   0   0
  0   3   3   4   8
  0   8  14  18  24
  0   9  17  21  28
region (0,0)-(2,3) = 28 (loop check 28)
region (1,1)-(2,2) = 11 (loop check 11)
region (0,1)-(1,2) = 10 (loop check 10)
region (2,3)-(2,3) = 1 (loop check 1)
~~~

**What this shows:** The first block is the whole \`P\` table, with its row and column of zero sentinels; each rectangle sum from four lookups matches the brute-force double loop.

**Example 3 — Difference array for range updates**

~~~text
add 5 to [1..3] -> diff = [0, 5, 0, 0, -5, 0, 0]
add 2 to [2..5] -> diff = [0, 5, 2, 0, -5, 0, -2]
add 1 to [0..0] -> diff = [1, 4, 2, 0, -5, 0, -2]
final  = [1, 5, 7, 7, 2, 2]
~~~

**What this shows:** Each update touches two cells of \`diff\`; one prefix-sum pass at the end produces the final array, here \`[1, 5, 7, 7, 2, 2]\`.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Build 1D prefix array | O(n) | O(n) | One pass, n + 1 totals |
| Range sum query with prefix | O(1) | O(1) | Two lookups and a subtraction |
| Range sum query by looping | O(r - l + 1) | O(1) | Adds every element of the range |
| q queries total | O(n + q) vs O(n·q) | O(n) | Build once, then constant time each |
| 2D build / rectangle query | O(R·C) / O(1) | O(R·C) | One pass over the grid, four lookups per query |
| Difference array: k range updates | O(k + n) | O(n) | O(1) per update plus one final prefix pass |

## 9. Edge Cases

- **A range starting at 0**: \`prefix[r + 1] - prefix[0]\`; the sentinel 0 makes it work with no special case.
- **A single element** \`l == r\`: \`prefix[l + 1] - prefix[l]\` is \`nums[l]\` (Example 1: \`sum(3..3) = 1\`).
- **Empty array**: \`prefix\` is \`[0]\`, and there is no valid range.
- **Negative numbers** are fine: subtraction still cancels the shared part.
- **Large totals**: a running sum of many 32-bit values can exceed 32 bits in Java and C++; store prefixes in 64-bit types.

## 10. Common Pitfalls

- **Off-by-one in the query:** \`prefix[r] - prefix[l]\` gives the sum of \`l..r-1\`. With the sentinel convention it is \`prefix[r + 1] - prefix[l]\`.
- **Forgetting the leading 0** and then special-casing \`l == 0\` everywhere.
- **\`[[0] * c] * r\`** for a 2D table shares one row between all rows.
- **Rebuilding the prefix array per query** throws away the whole benefit.
- **Using prefix sums on a frequently updated list:** each update is O(n); use a Fenwick or segment tree.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix[i]</code> is the sum of the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> elements, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix[0] = 0</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The query:</strong> <span style="color:#f0e2c8;">The sum of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[l..r]</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix[r + 1] - prefix[l]</code>, O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">O(n) to build once, then O(1) per query, so q queries cost O(n + q) instead of O(n·q).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where it shows up:</strong> <span style="color:#f0e2c8;">Subarray-sum problems, because a subarray sum is the difference of two prefix sums; plus 2D grids and difference arrays for range updates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Python detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">itertools.accumulate(nums, initial=0)</code> builds the sentinel form in one call, and ints never overflow.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you count subarrays that sum to k?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A subarray <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i..j</code> sums to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix[j+1] - prefix[i] == k</code>; keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code> of prefixes seen so far and add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count[prefix - k]</code> at each step. See [count subarrays that sum to k](/interview-question/how-do-you-count-subarrays-that-sum-to-k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the array is updated between queries?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One update changes up to n prefix entries. A Fenwick tree or [segment tree](/interview-question/what-is-a-segment-tree-and-when-do-you-need-one) gives O(log n) updates and queries.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do 2D prefix sums work?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">P[r+1][c+1] = grid[r][c] + P[r][c+1] + P[r+1][c] - P[r][c]</code>; a rectangle is four lookups by inclusion-exclusion.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a difference array?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The inverse: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+v</code> at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">l</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-v</code> at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r + 1</code> for each range update, then one prefix pass to rebuild the values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it work with negative numbers?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The subtraction cancels the shared prefix regardless of sign. Only the sliding-window technique needs non-negative values.</span>
</div>


</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix sum** | \`prefix[i]\` = sum of the first \`i\` elements |
| **Range sum query** | Sum of a contiguous stretch \`nums[l..r]\` |
| **Sentinel** | A dummy edge value (the leading 0) that removes special cases |
| **Precomputation** | Work done once so later queries are cheap |
| **Inclusion-exclusion** | Add and subtract overlapping parts so each cell counts once |
| **Difference array** | Array of neighbour differences; its prefix sum rebuilds the values |

---
**Conclusion:** The prefix sum technique stores running totals so that any range sum is one subtraction: \`prefix[r + 1] - prefix[l]\`, with a leading 0 as a sentinel. Building costs O(n) and each query O(1), and the same idea powers subarray-sum counting, 2D rectangle sums and difference arrays for range updates. In Python, \`itertools.accumulate(nums, initial=0)\` gives the table in one line, ints never overflow, and the one trap to avoid is sharing rows when building a 2D table.`,
        examples: [
          {
            label: "Build a prefix array and answer range queries",
            code: `from itertools import accumulate


def build_prefix(nums):
    prefix = [0] * (len(nums) + 1)      # prefix[i] = sum of nums[0..i-1]; prefix[0] = 0
    for i, v in enumerate(nums):
        prefix[i + 1] = prefix[i] + v
    return prefix


def range_sum(prefix, left, right):     # inclusive left..right, O(1)
    return prefix[right + 1] - prefix[left]


def fmt(a):
    return "[" + ", ".join(str(v) for v in a) + "]"


nums = [3, 1, 4, 1, 5, 9, 2, 6]
prefix = build_prefix(nums)
print("nums   = " + fmt(nums))
print("prefix = " + fmt(prefix))
# itertools.accumulate gives the same running totals, without the leading 0
print("accumulate = " + fmt(accumulate(nums)))
for left, right in [(0, 7), (2, 5), (3, 3), (5, 7)]:
    fast = range_sum(prefix, left, right)
    slow = sum(nums[left:right + 1])
    print("sum(" + str(left) + ".." + str(right) + ") = " + str(fast)
          + " (loop check " + str(slow) + ")")`,
          },
          {
            label: "2D prefix sums for rectangle queries",
            code: `# 2D prefix sums: P[r][c] = sum of the rectangle grid[0..r-1][0..c-1]
grid = [[3, 0, 1, 4],
        [5, 6, 3, 2],
        [1, 2, 0, 1]]
rows, cols = len(grid), len(grid[0])
P = [[0] * (cols + 1) for _ in range(rows + 1)]   # not [[0]*(cols+1)]*(rows+1): that shares one row
for r in range(rows):
    for c in range(cols):
        P[r + 1][c + 1] = grid[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c]


def region(r1, c1, r2, c2):  # inclusive corners, O(1): add big, cut two strips, add back overlap
    return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]


for row in P:
    print(" ".join(str(v).rjust(3) for v in row))
for r1, c1, r2, c2 in [(0, 0, 2, 3), (1, 1, 2, 2), (0, 1, 1, 2), (2, 3, 2, 3)]:
    slow = sum(grid[r][c] for r in range(r1, r2 + 1) for c in range(c1, c2 + 1))
    print("region (" + str(r1) + "," + str(c1) + ")-(" + str(r2) + "," + str(c2) + ") = "
          + str(region(r1, c1, r2, c2)) + " (loop check " + str(slow) + ")")`,
          },
          {
            label: "Difference array for range updates",
            code: `# Difference array: the reverse of a prefix sum. Each "add v to every index in
# [l, r]" costs O(1); one prefix-sum pass at the end produces the final array.
n = 6
diff = [0] * (n + 1)
updates = [(1, 3, 5), (2, 5, 2), (0, 0, 1)]
for left, right, v in updates:
    diff[left] += v
    diff[right + 1] -= v
    print("add " + str(v) + " to [" + str(left) + ".." + str(right) + "] -> diff = ["
          + ", ".join(str(d) for d in diff) + "]")
result, running = [], 0
for i in range(n):
    running += diff[i]
    result.append(running)
print("final  = [" + ", ".join(str(v) for v in result) + "]")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Explain the prefix sum technique, and write JavaScript that preprocesses an array so that range-sum queries are O(1)."

**What a strong answer should cover:**
- Definition: \`prefix[i]\` = sum of the first \`i\` elements, with \`prefix[0] = 0\`; range \`l..r\` = \`prefix[r + 1] - prefix[l]\`.
- O(n) build, O(1) query; O(n + q) for q queries.
- When to use it, and Fenwick or segment trees when the array changes.
- 2D prefix sums and difference arrays.
- JavaScript specifics: \`Array.from\` for 2D tables (not \`fill\` with an array), \`reduce\` with an initial value, integers exact up to 2^53 - 1.

**Code / implementation expected:** Yes — build and query functions in JavaScript.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and loops.
**Difficulty:** Easy
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the JavaScript code with \`node main.js\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Think of a car odometer. If it read 1,200 km when you left home and 1,550 km when you arrived, you drove 350 km — you did not need to add up every kilometre of the trip, you just subtracted two readings. A prefix sum is an odometer for an array: for every position it stores "total so far". Then the sum of any stretch of the array is just one reading minus another.

The trade is simple: spend one pass, O(n), writing down the running totals, and afterwards every "sum from index \`l\` to index \`r\`" question costs O(1) instead of a loop. When an array is queried many times, or when a problem talks about "subarrays with a given sum", this is the tool to reach for.

## 2. The Definition

📌 **Interview term: Prefix sum** — for an array \`nums\`, the array \`prefix\` where \`prefix[i]\` is the sum of the first \`i\` elements, \`nums[0] + ... + nums[i - 1]\`. Also called a *cumulative sum* or *running total*.

The most useful convention gives \`prefix\` one extra slot, \`prefix[0] = 0\` (the sum of no elements), so it has length \`n + 1\`. Then:

- \`prefix[i + 1] = prefix[i] + nums[i]\` builds it in one pass.
- The sum of the inclusive range \`nums[l..r]\` is \`prefix[r + 1] - prefix[l]\`.

📌 **Interview term: Range sum query** — asking for the sum of a contiguous stretch \`nums[l..r]\`. With a prefix array, each query is O(1).

📌 **Interview term: Sentinel** — a dummy value placed at the edge of a structure so that boundary cases need no special code. The leading 0 is a sentinel: without it, a range starting at index 0 would need an \`if\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 270" role="img" aria-label="nums 3 1 4 1 5 9 2 6 and its prefix array 0 3 4 8 9 14 23 25 31. The sum of indices 2 to 5 is prefix 6 minus prefix 2, which is 23 minus 4, or 19">
  <text class="d-sub" x="10" y="67">nums</text>
  <rect class="d-box-muted" x="120" y="40" width="56" height="42" rx="8"/>
  <text class="d-text" x="148" y="67" text-anchor="middle">3</text>
  <text class="d-sub" x="148" y="28" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="190" y="40" width="56" height="42" rx="8"/>
  <text class="d-text" x="218" y="67" text-anchor="middle">1</text>
  <text class="d-sub" x="218" y="28" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="260" y="40" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="288" y="67" text-anchor="middle">4</text>
  <text class="d-sub" x="288" y="28" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="330" y="40" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="358" y="67" text-anchor="middle">1</text>
  <text class="d-sub" x="358" y="28" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="400" y="40" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="428" y="67" text-anchor="middle">5</text>
  <text class="d-sub" x="428" y="28" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="470" y="40" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="498" y="67" text-anchor="middle">9</text>
  <text class="d-sub" x="498" y="28" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="540" y="40" width="56" height="42" rx="8"/>
  <text class="d-text" x="568" y="67" text-anchor="middle">2</text>
  <text class="d-sub" x="568" y="28" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="610" y="40" width="56" height="42" rx="8"/>
  <text class="d-text" x="638" y="67" text-anchor="middle">6</text>
  <text class="d-sub" x="638" y="28" text-anchor="middle">7</text>
  <text class="d-sub" x="10" y="147">prefix</text>
  <rect class="d-box" x="85" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="113" y="147" text-anchor="middle">0</text>
  <rect class="d-box" x="155" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="183" y="147" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="225" y="120" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="253" y="147" text-anchor="middle">4</text>
  <rect class="d-box" x="295" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="323" y="147" text-anchor="middle">8</text>
  <rect class="d-box" x="365" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="393" y="147" text-anchor="middle">9</text>
  <rect class="d-box" x="435" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="463" y="147" text-anchor="middle">14</text>
  <rect class="d-box-accent" x="505" y="120" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="533" y="147" text-anchor="middle">23</text>
  <rect class="d-box" x="575" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="603" y="147" text-anchor="middle">25</text>
  <rect class="d-box" x="645" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="673" y="147" text-anchor="middle">31</text>
  <rect class="d-box-muted" x="150" y="200" width="440" height="48" rx="10"/>
  <text class="d-text" x="370" y="230" text-anchor="middle">sum(2..5) = prefix[6] - prefix[2] = 23 - 4 = 19</text>
</svg>

The highlighted elements 4, 1, 5 and 9 add up to 19, and the same number falls out of two lookups in the prefix row: 23 (everything up to index 5) minus 4 (everything before index 2).

## 3. Why It Works, and When to Use It

\`prefix[r + 1]\` is the sum of \`nums[0..r]\` and \`prefix[l]\` is the sum of \`nums[0..l-1]\`. Subtracting removes the part before \`l\` and leaves exactly \`nums[l..r]\`. Nothing more than that.

**Use it when:**
- the array does **not change** and you answer **many** range-sum queries (q queries go from O(n·q) to O(n + q));
- a problem asks about **subarray sums** — "how many subarrays sum to \`k\`", "longest subarray with sum 0", "is there a subarray divisible by \`k\`". The trick is that a subarray sum is a *difference of two prefix sums*, so you look for pairs of prefixes. That is the whole solution of [count subarrays that sum to k](/interview-question/how-do-you-count-subarrays-that-sum-to-k);
- you need "everything except me" or "everything before me" totals — [product of array except self](/interview-question/how-do-you-compute-the-product-of-an-array-except-self-without-division) is the multiplicative cousin.

**Do not use a plain prefix array when** the values change between queries: one update can change O(n) prefix entries. Then use a Fenwick tree or a [segment tree](/interview-question/what-is-a-segment-tree-and-when-do-you-need-one), which support both updates and queries in O(log n).

📌 **Interview term: Precomputation** — doing work once up front so that later queries are cheap. Prefix sums are the simplest example.

## 4. Two Extensions Worth Knowing

**2D prefix sums.** For a grid, let \`P[r][c]\` be the sum of the rectangle from the top-left corner to just before \`(r, c)\`. Build it with \`P[r+1][c+1] = grid[r][c] + P[r][c+1] + P[r+1][c] - P[r][c]\`, and any rectangle sum becomes four lookups:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="A rectangle sum is the big top-left block, minus the strip above, minus the strip to the left, plus the corner that was subtracted twice">
  <rect class="d-box-muted" x="30" y="30" width="110" height="110" rx="4"/>
  <rect class="d-box-accent" x="30" y="30" width="110" height="110" rx="4"/>
  <path class="d-edge-dashed" d="M 70 70 L 140 70 L 140 140 L 70 140 Z"/>
  <text class="d-sub" x="85" y="172" text-anchor="middle">P[r2+1][c2+1]</text>
  <text class="d-text" x="175" y="90" text-anchor="middle">-</text>
  <rect class="d-box-muted" x="210" y="30" width="110" height="110" rx="4"/>
  <rect class="d-box-accent" x="210" y="30" width="110" height="40" rx="4"/>
  <path class="d-edge-dashed" d="M 250 70 L 320 70 L 320 140 L 250 140 Z"/>
  <text class="d-sub" x="265" y="172" text-anchor="middle">P[r1][c2+1]</text>
  <text class="d-text" x="355" y="90" text-anchor="middle">-</text>
  <rect class="d-box-muted" x="390" y="30" width="110" height="110" rx="4"/>
  <rect class="d-box-accent" x="390" y="30" width="40" height="110" rx="4"/>
  <path class="d-edge-dashed" d="M 430 70 L 500 70 L 500 140 L 430 140 Z"/>
  <text class="d-sub" x="445" y="172" text-anchor="middle">P[r2+1][c1]</text>
  <text class="d-text" x="535" y="90" text-anchor="middle">+</text>
  <rect class="d-box-muted" x="570" y="30" width="110" height="110" rx="4"/>
  <rect class="d-box-accent" x="570" y="30" width="40" height="40" rx="4"/>
  <path class="d-edge-dashed" d="M 610 70 L 680 70 L 680 140 L 610 140 Z"/>
  <text class="d-sub" x="625" y="172" text-anchor="middle">P[r1][c1]</text>
</svg>

Take the whole top-left block, cut away the strip above the rectangle and the strip to its left, then add back the corner, which was cut away twice. This add-subtract-add-back pattern is called inclusion-exclusion.

📌 **Interview term: Inclusion-exclusion** — counting a region by adding and subtracting overlapping parts so that each cell is counted exactly once.

**Difference arrays.** The reverse operation. To "add \`v\` to every element in \`[l, r]\`" many times, write \`+v\` at \`l\` and \`-v\` at \`r + 1\` in a difference array (O(1) per update), then take one prefix sum at the end to get the final values.

📌 **Interview term: Difference array** — an array of changes between neighbours; its prefix sum rebuilds the original. It turns range updates into O(1) point updates.

## 5. The Code in JavaScript

The build and query functions from Example 1.

~~~javascript
function buildPrefix(nums) {
  const prefix = new Array(nums.length + 1).fill(0); // prefix[i] = sum of nums[0..i-1]
  for (let i = 0; i < nums.length; i++) prefix[i + 1] = prefix[i] + nums[i];
  return prefix;
}

function rangeSum(prefix, left, right) { // inclusive left..right, O(1)
  return prefix[right + 1] - prefix[left];
}
~~~

**Line by line:**

- \`new Array(nums.length + 1).fill(0)\` makes the \`n + 1\` slots, with the sentinel at index 0.
- The loop fills \`prefix[i + 1] = prefix[i] + nums[i]\`.
- \`rangeSum\` is the one-line query \`prefix[right + 1] - prefix[left]\`.

## 6. JavaScript Details That Matter Here

- **There is no built-in scan.** A one-liner is \`nums.map((v) => (run += v))\` with \`let run = 0\`, which Example 1 uses to print the inclusive running totals; the explicit loop is clearer for the sentinel version.
- **2D tables:** \`Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0))\` creates a new row each time. \`new Array(rows + 1).fill(row)\` puts the *same* row object in every slot.
- **\`reduce\` needs an initial value** for empty ranges: \`slice(l, r + 1).reduce((a, b) => a + b, 0)\`.
- **Precision:** totals are exact while they stay within \`Number.MAX_SAFE_INTEGER\` (2^53 - 1).

## 7. Verified: Running the Code

Each example below is in the **JavaScript code** tab on this page. They were saved as \`main.js\` and run with \`node main.js\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Build a prefix array and answer range queries**

~~~text
nums   = [3, 1, 4, 1, 5, 9, 2, 6]
prefix = [0, 3, 4, 8, 9, 14, 23, 25, 31]
accumulate = [3, 4, 8, 9, 14, 23, 25, 31]
sum(0..7) = 31 (loop check 31)
sum(2..5) = 19 (loop check 19)
sum(3..3) = 1 (loop check 1)
sum(5..7) = 17 (loop check 17)
~~~

**What this shows:** Each O(1) answer matches a direct loop over the range. The running total without the leading 0 is what the language's built-in scan produces.

**Example 2 — 2D prefix sums for rectangle queries**

~~~text
  0   0   0   0   0
  0   3   3   4   8
  0   8  14  18  24
  0   9  17  21  28
region (0,0)-(2,3) = 28 (loop check 28)
region (1,1)-(2,2) = 11 (loop check 11)
region (0,1)-(1,2) = 10 (loop check 10)
region (2,3)-(2,3) = 1 (loop check 1)
~~~

**What this shows:** The first block is the whole \`P\` table, with its row and column of zero sentinels; each rectangle sum from four lookups matches the brute-force double loop.

**Example 3 — Difference array for range updates**

~~~text
add 5 to [1..3] -> diff = [0, 5, 0, 0, -5, 0, 0]
add 2 to [2..5] -> diff = [0, 5, 2, 0, -5, 0, -2]
add 1 to [0..0] -> diff = [1, 4, 2, 0, -5, 0, -2]
final  = [1, 5, 7, 7, 2, 2]
~~~

**What this shows:** Each update touches two cells of \`diff\`; one prefix-sum pass at the end produces the final array, here \`[1, 5, 7, 7, 2, 2]\`.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Build 1D prefix array | O(n) | O(n) | One pass, n + 1 totals |
| Range sum query with prefix | O(1) | O(1) | Two lookups and a subtraction |
| Range sum query by looping | O(r - l + 1) | O(1) | Adds every element of the range |
| q queries total | O(n + q) vs O(n·q) | O(n) | Build once, then constant time each |
| 2D build / rectangle query | O(R·C) / O(1) | O(R·C) | One pass over the grid, four lookups per query |
| Difference array: k range updates | O(k + n) | O(n) | O(1) per update plus one final prefix pass |

## 9. Edge Cases

- **A range starting at 0**: \`prefix[r + 1] - prefix[0]\`; the sentinel 0 makes it work with no special case.
- **A single element** \`l == r\`: \`prefix[l + 1] - prefix[l]\` is \`nums[l]\` (Example 1: \`sum(3..3) = 1\`).
- **Empty array**: \`prefix\` is \`[0]\`, and there is no valid range.
- **Negative numbers** are fine: subtraction still cancels the shared part.
- **Large totals**: a running sum of many 32-bit values can exceed 32 bits in Java and C++; store prefixes in 64-bit types.

## 10. Common Pitfalls

- **Off-by-one:** \`prefix[r] - prefix[l]\` sums \`l..r-1\`; use \`prefix[r + 1] - prefix[l]\`.
- **\`fill\` with an array** for a 2D table shares one row across all rows.
- **\`reduce\` without \`0\`** throws on an empty slice.
- **Rebuilding prefix sums inside the query** loses the O(1) benefit.
- **Mixing strings and numbers** (values read from input as strings) makes \`+\` concatenate: \`'3' + 1\` is \`'31'\`. Convert with \`Number\` first.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix[i]</code> is the sum of the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> elements, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix[0] = 0</code> as a sentinel.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The query:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sum(l..r) = prefix[r + 1] - prefix[l]</code>, O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">O(n) once, then O(1) per query: O(n + q) instead of O(n·q).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where it shows up:</strong> <span style="color:#f0e2c8;">Subarray-sum problems, 2D rectangle sums, and difference arrays for range updates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The JavaScript detail:</strong> <span style="color:#f0e2c8;">I build 2D tables with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from</code> so rows are not shared, and give <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reduce</code> an initial <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does this solve subarray sum equals k?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count earlier prefixes equal to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix - k</code> in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> as you go. See [count subarrays that sum to k](/interview-question/how-do-you-count-subarrays-that-sum-to-k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if values change?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a Fenwick tree or a [segment tree](/interview-question/what-is-a-segment-tree-and-when-do-you-need-one): O(log n) per update and query.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do 2D prefix sums work?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inclusion-exclusion: big block minus the strip above minus the strip to the left plus the corner.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">new Array(3).fill([])</code> surprise you?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">All three slots hold the same array; pushing into one appears in all. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array.from</code> with a factory avoids it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does it work with negative numbers?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes; the subtraction cancels the shared prefix regardless of sign.</span>
</div>


</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix sum** | \`prefix[i]\` = sum of the first \`i\` elements |
| **Range sum query** | Sum of a contiguous stretch \`nums[l..r]\` |
| **Sentinel** | A dummy edge value (the leading 0) that removes special cases |
| **Precomputation** | Work done once so later queries are cheap |
| **Inclusion-exclusion** | Add and subtract overlapping parts so each cell counts once |
| **Difference array** | Array of neighbour differences; its prefix sum rebuilds the values |

---
**Conclusion:** Prefix sums turn every range-sum query into one subtraction after a single O(n) pass: \`prefix[r + 1] - prefix[l]\`, with a leading 0 so ranges starting at index 0 need no special case. They are the basis of subarray-sum counting, 2D rectangle sums and difference arrays. In JavaScript, build 2D tables with \`Array.from\` rather than \`fill\`, give \`reduce\` an initial value, and remember totals are exact only up to 2^53 - 1.`,
        examples: [
          {
            label: "Build a prefix array and answer range queries",
            code: `function buildPrefix(nums) {
  const prefix = new Array(nums.length + 1).fill(0); // prefix[i] = sum of nums[0..i-1]
  for (let i = 0; i < nums.length; i++) prefix[i + 1] = prefix[i] + nums[i];
  return prefix;
}

function rangeSum(prefix, left, right) { // inclusive left..right, O(1)
  return prefix[right + 1] - prefix[left];
}

function fmt(a) {
  return '[' + a.join(', ') + ']';
}

const nums = [3, 1, 4, 1, 5, 9, 2, 6];
const prefix = buildPrefix(nums);
console.log('nums   = ' + fmt(nums));
console.log('prefix = ' + fmt(prefix));
// A running-total map gives the same totals, without the leading 0
let run = 0;
console.log('accumulate = ' + fmt(nums.map((v) => (run += v))));
for (const [left, right] of [[0, 7], [2, 5], [3, 3], [5, 7]]) {
  const fast = rangeSum(prefix, left, right);
  const slow = nums.slice(left, right + 1).reduce((a, b) => a + b, 0);
  console.log('sum(' + left + '..' + right + ') = ' + fast + ' (loop check ' + slow + ')');
}`,
          },
          {
            label: "2D prefix sums for rectangle queries",
            code: `// 2D prefix sums: P[r][c] = sum of the rectangle grid[0..r-1][0..c-1]
const grid = [[3, 0, 1, 4],
  [5, 6, 3, 2],
  [1, 2, 0, 1]];
const rows = grid.length, cols = grid[0].length;
// Array.from builds a NEW row each time; new Array(n).fill(row) would share one row
const P = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    P[r + 1][c + 1] = grid[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c];
  }
}

function region(r1, c1, r2, c2) { // inclusive corners, O(1)
  return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
}

for (const row of P) console.log(row.map((v) => String(v).padStart(3)).join(' '));
for (const [r1, c1, r2, c2] of [[0, 0, 2, 3], [1, 1, 2, 2], [0, 1, 1, 2], [2, 3, 2, 3]]) {
  let slow = 0;
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) slow += grid[r][c];
  console.log('region (' + r1 + ',' + c1 + ')-(' + r2 + ',' + c2 + ') = ' + region(r1, c1, r2, c2) +
    ' (loop check ' + slow + ')');
}`,
          },
          {
            label: "Difference array for range updates",
            code: `// Difference array: the reverse of a prefix sum. Each "add v to every index in
// [l, r]" costs O(1); one prefix-sum pass at the end produces the final array.
const n = 6;
const diff = new Array(n + 1).fill(0);
const updates = [[1, 3, 5], [2, 5, 2], [0, 0, 1]];
for (const [left, right, v] of updates) {
  diff[left] += v;
  diff[right + 1] -= v;
  console.log('add ' + v + ' to [' + left + '..' + right + '] -> diff = [' + diff.join(', ') + ']');
}
const result = [];
let running = 0;
for (let i = 0; i < n; i++) {
  running += diff[i];
  result.push(running);
}
console.log('final  = [' + result.join(', ') + ']');`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"What is the prefix sum technique? Explain it and implement it in Java so that range-sum queries on an int array take O(1) time."

**What a strong answer should cover:**
- Definition with the leading 0: range \`l..r\` = \`prefix[r + 1] - prefix[l]\`.
- O(n) build, O(1) query; O(n + q) for q queries.
- When to use it, and Fenwick or segment trees when the array changes.
- 2D prefix sums and difference arrays.
- Java specifics: store prefixes in \`long[]\` because a running total of \`int\`s overflows silently; \`Arrays.parallelPrefix\` exists; new arrays are zero-filled.

**Code / implementation expected:** Yes — build and query methods in Java.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and loops.
**Difficulty:** Easy
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the Java code with \`javac Main.java && java Main\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Think of a car odometer. If it read 1,200 km when you left home and 1,550 km when you arrived, you drove 350 km — you did not need to add up every kilometre of the trip, you just subtracted two readings. A prefix sum is an odometer for an array: for every position it stores "total so far". Then the sum of any stretch of the array is just one reading minus another.

The trade is simple: spend one pass, O(n), writing down the running totals, and afterwards every "sum from index \`l\` to index \`r\`" question costs O(1) instead of a loop. When an array is queried many times, or when a problem talks about "subarrays with a given sum", this is the tool to reach for.

## 2. The Definition

📌 **Interview term: Prefix sum** — for an array \`nums\`, the array \`prefix\` where \`prefix[i]\` is the sum of the first \`i\` elements, \`nums[0] + ... + nums[i - 1]\`. Also called a *cumulative sum* or *running total*.

The most useful convention gives \`prefix\` one extra slot, \`prefix[0] = 0\` (the sum of no elements), so it has length \`n + 1\`. Then:

- \`prefix[i + 1] = prefix[i] + nums[i]\` builds it in one pass.
- The sum of the inclusive range \`nums[l..r]\` is \`prefix[r + 1] - prefix[l]\`.

📌 **Interview term: Range sum query** — asking for the sum of a contiguous stretch \`nums[l..r]\`. With a prefix array, each query is O(1).

📌 **Interview term: Sentinel** — a dummy value placed at the edge of a structure so that boundary cases need no special code. The leading 0 is a sentinel: without it, a range starting at index 0 would need an \`if\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 270" role="img" aria-label="nums 3 1 4 1 5 9 2 6 and its prefix array 0 3 4 8 9 14 23 25 31. The sum of indices 2 to 5 is prefix 6 minus prefix 2, which is 23 minus 4, or 19">
  <text class="d-sub" x="10" y="67">nums</text>
  <rect class="d-box-muted" x="120" y="40" width="56" height="42" rx="8"/>
  <text class="d-text" x="148" y="67" text-anchor="middle">3</text>
  <text class="d-sub" x="148" y="28" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="190" y="40" width="56" height="42" rx="8"/>
  <text class="d-text" x="218" y="67" text-anchor="middle">1</text>
  <text class="d-sub" x="218" y="28" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="260" y="40" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="288" y="67" text-anchor="middle">4</text>
  <text class="d-sub" x="288" y="28" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="330" y="40" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="358" y="67" text-anchor="middle">1</text>
  <text class="d-sub" x="358" y="28" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="400" y="40" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="428" y="67" text-anchor="middle">5</text>
  <text class="d-sub" x="428" y="28" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="470" y="40" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="498" y="67" text-anchor="middle">9</text>
  <text class="d-sub" x="498" y="28" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="540" y="40" width="56" height="42" rx="8"/>
  <text class="d-text" x="568" y="67" text-anchor="middle">2</text>
  <text class="d-sub" x="568" y="28" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="610" y="40" width="56" height="42" rx="8"/>
  <text class="d-text" x="638" y="67" text-anchor="middle">6</text>
  <text class="d-sub" x="638" y="28" text-anchor="middle">7</text>
  <text class="d-sub" x="10" y="147">prefix</text>
  <rect class="d-box" x="85" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="113" y="147" text-anchor="middle">0</text>
  <rect class="d-box" x="155" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="183" y="147" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="225" y="120" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="253" y="147" text-anchor="middle">4</text>
  <rect class="d-box" x="295" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="323" y="147" text-anchor="middle">8</text>
  <rect class="d-box" x="365" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="393" y="147" text-anchor="middle">9</text>
  <rect class="d-box" x="435" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="463" y="147" text-anchor="middle">14</text>
  <rect class="d-box-accent" x="505" y="120" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="533" y="147" text-anchor="middle">23</text>
  <rect class="d-box" x="575" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="603" y="147" text-anchor="middle">25</text>
  <rect class="d-box" x="645" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="673" y="147" text-anchor="middle">31</text>
  <rect class="d-box-muted" x="150" y="200" width="440" height="48" rx="10"/>
  <text class="d-text" x="370" y="230" text-anchor="middle">sum(2..5) = prefix[6] - prefix[2] = 23 - 4 = 19</text>
</svg>

The highlighted elements 4, 1, 5 and 9 add up to 19, and the same number falls out of two lookups in the prefix row: 23 (everything up to index 5) minus 4 (everything before index 2).

## 3. Why It Works, and When to Use It

\`prefix[r + 1]\` is the sum of \`nums[0..r]\` and \`prefix[l]\` is the sum of \`nums[0..l-1]\`. Subtracting removes the part before \`l\` and leaves exactly \`nums[l..r]\`. Nothing more than that.

**Use it when:**
- the array does **not change** and you answer **many** range-sum queries (q queries go from O(n·q) to O(n + q));
- a problem asks about **subarray sums** — "how many subarrays sum to \`k\`", "longest subarray with sum 0", "is there a subarray divisible by \`k\`". The trick is that a subarray sum is a *difference of two prefix sums*, so you look for pairs of prefixes. That is the whole solution of [count subarrays that sum to k](/interview-question/how-do-you-count-subarrays-that-sum-to-k);
- you need "everything except me" or "everything before me" totals — [product of array except self](/interview-question/how-do-you-compute-the-product-of-an-array-except-self-without-division) is the multiplicative cousin.

**Do not use a plain prefix array when** the values change between queries: one update can change O(n) prefix entries. Then use a Fenwick tree or a [segment tree](/interview-question/what-is-a-segment-tree-and-when-do-you-need-one), which support both updates and queries in O(log n).

📌 **Interview term: Precomputation** — doing work once up front so that later queries are cheap. Prefix sums are the simplest example.

## 4. Two Extensions Worth Knowing

**2D prefix sums.** For a grid, let \`P[r][c]\` be the sum of the rectangle from the top-left corner to just before \`(r, c)\`. Build it with \`P[r+1][c+1] = grid[r][c] + P[r][c+1] + P[r+1][c] - P[r][c]\`, and any rectangle sum becomes four lookups:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="A rectangle sum is the big top-left block, minus the strip above, minus the strip to the left, plus the corner that was subtracted twice">
  <rect class="d-box-muted" x="30" y="30" width="110" height="110" rx="4"/>
  <rect class="d-box-accent" x="30" y="30" width="110" height="110" rx="4"/>
  <path class="d-edge-dashed" d="M 70 70 L 140 70 L 140 140 L 70 140 Z"/>
  <text class="d-sub" x="85" y="172" text-anchor="middle">P[r2+1][c2+1]</text>
  <text class="d-text" x="175" y="90" text-anchor="middle">-</text>
  <rect class="d-box-muted" x="210" y="30" width="110" height="110" rx="4"/>
  <rect class="d-box-accent" x="210" y="30" width="110" height="40" rx="4"/>
  <path class="d-edge-dashed" d="M 250 70 L 320 70 L 320 140 L 250 140 Z"/>
  <text class="d-sub" x="265" y="172" text-anchor="middle">P[r1][c2+1]</text>
  <text class="d-text" x="355" y="90" text-anchor="middle">-</text>
  <rect class="d-box-muted" x="390" y="30" width="110" height="110" rx="4"/>
  <rect class="d-box-accent" x="390" y="30" width="40" height="110" rx="4"/>
  <path class="d-edge-dashed" d="M 430 70 L 500 70 L 500 140 L 430 140 Z"/>
  <text class="d-sub" x="445" y="172" text-anchor="middle">P[r2+1][c1]</text>
  <text class="d-text" x="535" y="90" text-anchor="middle">+</text>
  <rect class="d-box-muted" x="570" y="30" width="110" height="110" rx="4"/>
  <rect class="d-box-accent" x="570" y="30" width="40" height="40" rx="4"/>
  <path class="d-edge-dashed" d="M 610 70 L 680 70 L 680 140 L 610 140 Z"/>
  <text class="d-sub" x="625" y="172" text-anchor="middle">P[r1][c1]</text>
</svg>

Take the whole top-left block, cut away the strip above the rectangle and the strip to its left, then add back the corner, which was cut away twice. This add-subtract-add-back pattern is called inclusion-exclusion.

📌 **Interview term: Inclusion-exclusion** — counting a region by adding and subtracting overlapping parts so that each cell is counted exactly once.

**Difference arrays.** The reverse operation. To "add \`v\` to every element in \`[l, r]\`" many times, write \`+v\` at \`l\` and \`-v\` at \`r + 1\` in a difference array (O(1) per update), then take one prefix sum at the end to get the final values.

📌 **Interview term: Difference array** — an array of changes between neighbours; its prefix sum rebuilds the original. It turns range updates into O(1) point updates.

## 5. The Code in Java

The build and query methods from Example 1.

~~~java
// long: a running total of many ints can pass Integer.MAX_VALUE
static long[] buildPrefix(int[] nums) {
    long[] prefix = new long[nums.length + 1];   // prefix[i] = sum of nums[0..i-1]
    for (int i = 0; i < nums.length; i++) prefix[i + 1] = prefix[i] + nums[i];
    return prefix;
}

static long rangeSum(long[] prefix, int left, int right) { // inclusive, O(1)
    return prefix[right + 1] - prefix[left];
}
~~~

**Line by line:**

- \`new long[nums.length + 1]\` is zero-filled, so \`prefix[0] = 0\` is already in place.
- \`prefix[i + 1] = prefix[i] + nums[i]\` widens each \`int\` to \`long\` before adding.
- \`rangeSum\` returns \`long\` for the same reason: a range total can exceed \`Integer.MAX_VALUE\`.

## 6. Java Details That Matter Here

- **Overflow:** a sum of many \`int\`s silently wraps past 2,147,483,647 (\`Integer.MAX_VALUE + 1\` printed -2147483648). Using \`long[]\` for the prefix array is the safe default.
- **\`Arrays.parallelPrefix(array, Integer::sum)\`** computes inclusive running totals in place (Example 1 prints \`[3, 4, 8, ...]\`). It writes into the same array, has no leading 0, and for \`int[]\` it can overflow, so the explicit \`long[]\` loop is usually what you want in an interview.
- **2D arrays:** \`new long[rows + 1][cols + 1]\` allocates independent zero-filled rows, so there is no row-sharing trap as in Python or JavaScript.

## 7. Verified: Running the Code

Each example below is in the **Java code** tab on this page. They were saved as \`Main.java\` and run with \`javac Main.java && java Main\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Build a prefix array and answer range queries**

~~~text
nums   = [3, 1, 4, 1, 5, 9, 2, 6]
prefix = [0, 3, 4, 8, 9, 14, 23, 25, 31]
accumulate = [3, 4, 8, 9, 14, 23, 25, 31]
sum(0..7) = 31 (loop check 31)
sum(2..5) = 19 (loop check 19)
sum(3..3) = 1 (loop check 1)
sum(5..7) = 17 (loop check 17)
~~~

**What this shows:** Each O(1) answer matches a direct loop over the range. The running total without the leading 0 is what the language's built-in scan produces.

**Example 2 — 2D prefix sums for rectangle queries**

~~~text
  0   0   0   0   0
  0   3   3   4   8
  0   8  14  18  24
  0   9  17  21  28
region (0,0)-(2,3) = 28 (loop check 28)
region (1,1)-(2,2) = 11 (loop check 11)
region (0,1)-(1,2) = 10 (loop check 10)
region (2,3)-(2,3) = 1 (loop check 1)
~~~

**What this shows:** The first block is the whole \`P\` table, with its row and column of zero sentinels; each rectangle sum from four lookups matches the brute-force double loop.

**Example 3 — Difference array for range updates**

~~~text
add 5 to [1..3] -> diff = [0, 5, 0, 0, -5, 0, 0]
add 2 to [2..5] -> diff = [0, 5, 2, 0, -5, 0, -2]
add 1 to [0..0] -> diff = [1, 4, 2, 0, -5, 0, -2]
final  = [1, 5, 7, 7, 2, 2]
~~~

**What this shows:** Each update touches two cells of \`diff\`; one prefix-sum pass at the end produces the final array, here \`[1, 5, 7, 7, 2, 2]\`.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Build 1D prefix array | O(n) | O(n) | One pass, n + 1 totals |
| Range sum query with prefix | O(1) | O(1) | Two lookups and a subtraction |
| Range sum query by looping | O(r - l + 1) | O(1) | Adds every element of the range |
| q queries total | O(n + q) vs O(n·q) | O(n) | Build once, then constant time each |
| 2D build / rectangle query | O(R·C) / O(1) | O(R·C) | One pass over the grid, four lookups per query |
| Difference array: k range updates | O(k + n) | O(n) | O(1) per update plus one final prefix pass |

## 9. Edge Cases

- **A range starting at 0**: \`prefix[r + 1] - prefix[0]\`; the sentinel 0 makes it work with no special case.
- **A single element** \`l == r\`: \`prefix[l + 1] - prefix[l]\` is \`nums[l]\` (Example 1: \`sum(3..3) = 1\`).
- **Empty array**: \`prefix\` is \`[0]\`, and there is no valid range.
- **Negative numbers** are fine: subtraction still cancels the shared part.
- **Large totals**: a running sum of many 32-bit values can exceed 32 bits in Java and C++; store prefixes in 64-bit types.

## 10. Common Pitfalls

- **\`int[] prefix\`** for large inputs overflows silently; use \`long[]\`.
- **Off-by-one:** \`prefix[r] - prefix[l]\` sums \`l..r-1\`.
- **\`Arrays.parallelPrefix\` on the input array** overwrites the caller data; clone first.
- **Recomputing the prefix array inside each query** loses the O(1) benefit.
- **Using prefix sums when values change often:** each update is O(n); use a Fenwick tree or segment tree.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix[i]</code> is the sum of the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> elements, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix[0] = 0</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The query:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sum(l..r) = prefix[r + 1] - prefix[l]</code>, O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">O(n) build, O(1) per query, O(n + q) overall.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where it shows up:</strong> <span style="color:#f0e2c8;">Subarray-sum counting, 2D rectangle sums, difference arrays for range updates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Java detail:</strong> <span style="color:#f0e2c8;">I store prefixes in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long[]</code> because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> totals overflow silently, and new arrays are already zero-filled, so the sentinel is free.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does it solve subarray sum equals k?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Long, Integer&gt;</code> of prefix counts; at each step add the count of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix - k</code>. See [count subarrays that sum to k](/interview-question/how-do-you-count-subarrays-that-sum-to-k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Arrays.parallelPrefix</code> do?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An in-place inclusive scan with any associative operator, possibly in parallel; for interview sizes a loop is clearer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if values change between queries?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a Fenwick tree or [segment tree](/interview-question/what-is-a-segment-tree-and-when-do-you-need-one) for O(log n) updates and queries.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do 2D prefix sums work?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">P[r+1][c+1] = grid[r][c] + P[r][c+1] + P[r+1][c] - P[r][c]</code>, then four lookups per rectangle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code>?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because n values up to about 2 * 10^9 each can sum far past 2^31 - 1, and Java wraps without warning.</span>
</div>


</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix sum** | \`prefix[i]\` = sum of the first \`i\` elements |
| **Range sum query** | Sum of a contiguous stretch \`nums[l..r]\` |
| **Sentinel** | A dummy edge value (the leading 0) that removes special cases |
| **Precomputation** | Work done once so later queries are cheap |
| **Inclusion-exclusion** | Add and subtract overlapping parts so each cell counts once |
| **Difference array** | Array of neighbour differences; its prefix sum rebuilds the values |

---
**Conclusion:** A prefix sum array stores running totals with a leading 0, so any range sum is \`prefix[r + 1] - prefix[l]\` in O(1) after an O(n) build. The same idea drives subarray-sum counting, 2D rectangle sums and difference arrays. In Java, keep the totals in \`long[]\` because \`int\` overflow is silent, and enjoy the free sentinel that zero-filled arrays give you.`,
        examples: [
          {
            label: "Build a prefix array and answer range queries",
            code: `import java.util.Arrays;

public class Main {
    // long: a running total of many ints can pass Integer.MAX_VALUE
    static long[] buildPrefix(int[] nums) {
        long[] prefix = new long[nums.length + 1];   // prefix[i] = sum of nums[0..i-1]
        for (int i = 0; i < nums.length; i++) prefix[i + 1] = prefix[i] + nums[i];
        return prefix;
    }

    static long rangeSum(long[] prefix, int left, int right) { // inclusive, O(1)
        return prefix[right + 1] - prefix[left];
    }

    public static void main(String[] args) {
        int[] nums = {3, 1, 4, 1, 5, 9, 2, 6};
        long[] prefix = buildPrefix(nums);
        System.out.println("nums   = " + Arrays.toString(nums));
        System.out.println("prefix = " + Arrays.toString(prefix));
        // Arrays.parallelPrefix does the running total in place, without the leading 0
        int[] acc = nums.clone();
        Arrays.parallelPrefix(acc, Integer::sum);
        System.out.println("accumulate = " + Arrays.toString(acc));
        int[][] queries = {{0, 7}, {2, 5}, {3, 3}, {5, 7}};
        for (int[] q : queries) {
            long fast = rangeSum(prefix, q[0], q[1]);
            long slow = 0;
            for (int i = q[0]; i <= q[1]; i++) slow += nums[i];
            System.out.println("sum(" + q[0] + ".." + q[1] + ") = " + fast + " (loop check " + slow + ")");
        }
    }
}`,
          },
          {
            label: "2D prefix sums for rectangle queries",
            code: `public class Main {
    public static void main(String[] args) {
        // 2D prefix sums: P[r][c] = sum of the rectangle grid[0..r-1][0..c-1]
        int[][] grid = {{3, 0, 1, 4},
                        {5, 6, 3, 2},
                        {1, 2, 0, 1}};
        int rows = grid.length, cols = grid[0].length;
        long[][] P = new long[rows + 1][cols + 1];   // Java zero-fills new arrays
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++)
                P[r + 1][c + 1] = grid[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c];

        for (long[] row : P) {
            StringBuilder sb = new StringBuilder();
            for (int c = 0; c < row.length; c++) {
                if (c > 0) sb.append(' ');
                sb.append(String.format("%3d", row[c]));
            }
            System.out.println(sb);
        }
        int[][] queries = {{0, 0, 2, 3}, {1, 1, 2, 2}, {0, 1, 1, 2}, {2, 3, 2, 3}};
        for (int[] q : queries) {
            int r1 = q[0], c1 = q[1], r2 = q[2], c2 = q[3];
            long fast = P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
            long slow = 0;
            for (int r = r1; r <= r2; r++) for (int c = c1; c <= c2; c++) slow += grid[r][c];
            System.out.println("region (" + r1 + "," + c1 + ")-(" + r2 + "," + c2 + ") = " + fast
                + " (loop check " + slow + ")");
        }
    }
}`,
          },
          {
            label: "Difference array for range updates",
            code: `import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        // Difference array: the reverse of a prefix sum. Each "add v to every index
        // in [l, r]" costs O(1); one prefix-sum pass at the end gives the final array.
        int n = 6;
        int[] diff = new int[n + 1];
        int[][] updates = {{1, 3, 5}, {2, 5, 2}, {0, 0, 1}};
        for (int[] u : updates) {
            diff[u[0]] += u[2];
            diff[u[1] + 1] -= u[2];
            System.out.println("add " + u[2] + " to [" + u[0] + ".." + u[1] + "] -> diff = " + Arrays.toString(diff));
        }
        int[] result = new int[n];
        int running = 0;
        for (int i = 0; i < n; i++) {
            running += diff[i];
            result[i] = running;
        }
        System.out.println("final  = " + Arrays.toString(result));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Explain the prefix sum technique and implement it in C++17 so that range-sum queries over a \`std::vector<int>\` run in constant time."

**What a strong answer should cover:**
- Definition with the leading 0: range \`l..r\` = \`prefix[r + 1] - prefix[l]\`.
- O(n) build, O(1) query; O(n + q) for q queries.
- When to use it, and Fenwick or segment trees when the data changes.
- 2D prefix sums and difference arrays.
- C++ specifics: \`long long\` totals (signed overflow is undefined behaviour), \`std::partial_sum\` and \`std::inclusive_scan\` in \`<numeric>\`, and the \`std::accumulate(..., 0)\` int trap.

**Code / implementation expected:** Yes — a build step and an O(1) query in C++17.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you should know arrays and loops.
**Difficulty:** Easy
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the C++ code with \`g++ -std=c++17 main.cpp && ./a.out\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Think of a car odometer. If it read 1,200 km when you left home and 1,550 km when you arrived, you drove 350 km — you did not need to add up every kilometre of the trip, you just subtracted two readings. A prefix sum is an odometer for an array: for every position it stores "total so far". Then the sum of any stretch of the array is just one reading minus another.

The trade is simple: spend one pass, O(n), writing down the running totals, and afterwards every "sum from index \`l\` to index \`r\`" question costs O(1) instead of a loop. When an array is queried many times, or when a problem talks about "subarrays with a given sum", this is the tool to reach for.

## 2. The Definition

📌 **Interview term: Prefix sum** — for an array \`nums\`, the array \`prefix\` where \`prefix[i]\` is the sum of the first \`i\` elements, \`nums[0] + ... + nums[i - 1]\`. Also called a *cumulative sum* or *running total*.

The most useful convention gives \`prefix\` one extra slot, \`prefix[0] = 0\` (the sum of no elements), so it has length \`n + 1\`. Then:

- \`prefix[i + 1] = prefix[i] + nums[i]\` builds it in one pass.
- The sum of the inclusive range \`nums[l..r]\` is \`prefix[r + 1] - prefix[l]\`.

📌 **Interview term: Range sum query** — asking for the sum of a contiguous stretch \`nums[l..r]\`. With a prefix array, each query is O(1).

📌 **Interview term: Sentinel** — a dummy value placed at the edge of a structure so that boundary cases need no special code. The leading 0 is a sentinel: without it, a range starting at index 0 would need an \`if\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 270" role="img" aria-label="nums 3 1 4 1 5 9 2 6 and its prefix array 0 3 4 8 9 14 23 25 31. The sum of indices 2 to 5 is prefix 6 minus prefix 2, which is 23 minus 4, or 19">
  <text class="d-sub" x="10" y="67">nums</text>
  <rect class="d-box-muted" x="120" y="40" width="56" height="42" rx="8"/>
  <text class="d-text" x="148" y="67" text-anchor="middle">3</text>
  <text class="d-sub" x="148" y="28" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="190" y="40" width="56" height="42" rx="8"/>
  <text class="d-text" x="218" y="67" text-anchor="middle">1</text>
  <text class="d-sub" x="218" y="28" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="260" y="40" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="288" y="67" text-anchor="middle">4</text>
  <text class="d-sub" x="288" y="28" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="330" y="40" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="358" y="67" text-anchor="middle">1</text>
  <text class="d-sub" x="358" y="28" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="400" y="40" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="428" y="67" text-anchor="middle">5</text>
  <text class="d-sub" x="428" y="28" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="470" y="40" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="498" y="67" text-anchor="middle">9</text>
  <text class="d-sub" x="498" y="28" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="540" y="40" width="56" height="42" rx="8"/>
  <text class="d-text" x="568" y="67" text-anchor="middle">2</text>
  <text class="d-sub" x="568" y="28" text-anchor="middle">6</text>
  <rect class="d-box-muted" x="610" y="40" width="56" height="42" rx="8"/>
  <text class="d-text" x="638" y="67" text-anchor="middle">6</text>
  <text class="d-sub" x="638" y="28" text-anchor="middle">7</text>
  <text class="d-sub" x="10" y="147">prefix</text>
  <rect class="d-box" x="85" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="113" y="147" text-anchor="middle">0</text>
  <rect class="d-box" x="155" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="183" y="147" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="225" y="120" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="253" y="147" text-anchor="middle">4</text>
  <rect class="d-box" x="295" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="323" y="147" text-anchor="middle">8</text>
  <rect class="d-box" x="365" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="393" y="147" text-anchor="middle">9</text>
  <rect class="d-box" x="435" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="463" y="147" text-anchor="middle">14</text>
  <rect class="d-box-accent" x="505" y="120" width="56" height="42" rx="8"/>
  <text class="d-text d-accent" x="533" y="147" text-anchor="middle">23</text>
  <rect class="d-box" x="575" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="603" y="147" text-anchor="middle">25</text>
  <rect class="d-box" x="645" y="120" width="56" height="42" rx="8"/>
  <text class="d-text" x="673" y="147" text-anchor="middle">31</text>
  <rect class="d-box-muted" x="150" y="200" width="440" height="48" rx="10"/>
  <text class="d-text" x="370" y="230" text-anchor="middle">sum(2..5) = prefix[6] - prefix[2] = 23 - 4 = 19</text>
</svg>

The highlighted elements 4, 1, 5 and 9 add up to 19, and the same number falls out of two lookups in the prefix row: 23 (everything up to index 5) minus 4 (everything before index 2).

## 3. Why It Works, and When to Use It

\`prefix[r + 1]\` is the sum of \`nums[0..r]\` and \`prefix[l]\` is the sum of \`nums[0..l-1]\`. Subtracting removes the part before \`l\` and leaves exactly \`nums[l..r]\`. Nothing more than that.

**Use it when:**
- the array does **not change** and you answer **many** range-sum queries (q queries go from O(n·q) to O(n + q));
- a problem asks about **subarray sums** — "how many subarrays sum to \`k\`", "longest subarray with sum 0", "is there a subarray divisible by \`k\`". The trick is that a subarray sum is a *difference of two prefix sums*, so you look for pairs of prefixes. That is the whole solution of [count subarrays that sum to k](/interview-question/how-do-you-count-subarrays-that-sum-to-k);
- you need "everything except me" or "everything before me" totals — [product of array except self](/interview-question/how-do-you-compute-the-product-of-an-array-except-self-without-division) is the multiplicative cousin.

**Do not use a plain prefix array when** the values change between queries: one update can change O(n) prefix entries. Then use a Fenwick tree or a [segment tree](/interview-question/what-is-a-segment-tree-and-when-do-you-need-one), which support both updates and queries in O(log n).

📌 **Interview term: Precomputation** — doing work once up front so that later queries are cheap. Prefix sums are the simplest example.

## 4. Two Extensions Worth Knowing

**2D prefix sums.** For a grid, let \`P[r][c]\` be the sum of the rectangle from the top-left corner to just before \`(r, c)\`. Build it with \`P[r+1][c+1] = grid[r][c] + P[r][c+1] + P[r+1][c] - P[r][c]\`, and any rectangle sum becomes four lookups:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="A rectangle sum is the big top-left block, minus the strip above, minus the strip to the left, plus the corner that was subtracted twice">
  <rect class="d-box-muted" x="30" y="30" width="110" height="110" rx="4"/>
  <rect class="d-box-accent" x="30" y="30" width="110" height="110" rx="4"/>
  <path class="d-edge-dashed" d="M 70 70 L 140 70 L 140 140 L 70 140 Z"/>
  <text class="d-sub" x="85" y="172" text-anchor="middle">P[r2+1][c2+1]</text>
  <text class="d-text" x="175" y="90" text-anchor="middle">-</text>
  <rect class="d-box-muted" x="210" y="30" width="110" height="110" rx="4"/>
  <rect class="d-box-accent" x="210" y="30" width="110" height="40" rx="4"/>
  <path class="d-edge-dashed" d="M 250 70 L 320 70 L 320 140 L 250 140 Z"/>
  <text class="d-sub" x="265" y="172" text-anchor="middle">P[r1][c2+1]</text>
  <text class="d-text" x="355" y="90" text-anchor="middle">-</text>
  <rect class="d-box-muted" x="390" y="30" width="110" height="110" rx="4"/>
  <rect class="d-box-accent" x="390" y="30" width="40" height="110" rx="4"/>
  <path class="d-edge-dashed" d="M 430 70 L 500 70 L 500 140 L 430 140 Z"/>
  <text class="d-sub" x="445" y="172" text-anchor="middle">P[r2+1][c1]</text>
  <text class="d-text" x="535" y="90" text-anchor="middle">+</text>
  <rect class="d-box-muted" x="570" y="30" width="110" height="110" rx="4"/>
  <rect class="d-box-accent" x="570" y="30" width="40" height="40" rx="4"/>
  <path class="d-edge-dashed" d="M 610 70 L 680 70 L 680 140 L 610 140 Z"/>
  <text class="d-sub" x="625" y="172" text-anchor="middle">P[r1][c1]</text>
</svg>

Take the whole top-left block, cut away the strip above the rectangle and the strip to its left, then add back the corner, which was cut away twice. This add-subtract-add-back pattern is called inclusion-exclusion.

📌 **Interview term: Inclusion-exclusion** — counting a region by adding and subtracting overlapping parts so that each cell is counted exactly once.

**Difference arrays.** The reverse operation. To "add \`v\` to every element in \`[l, r]\`" many times, write \`+v\` at \`l\` and \`-v\` at \`r + 1\` in a difference array (O(1) per update), then take one prefix sum at the end to get the final values.

📌 **Interview term: Difference array** — an array of changes between neighbours; its prefix sum rebuilds the original. It turns range updates into O(1) point updates.

## 5. The Code in C++

The build and the query from Example 1 (in the example both live inside \`main\`).

~~~cpp
std::vector<int> nums = {3, 1, 4, 1, 5, 9, 2, 6};
// long long: a running total of many ints can overflow int (undefined behaviour)
std::vector<long long> prefix(nums.size() + 1, 0);   // prefix[i] = sum of nums[0..i-1]
for (size_t i = 0; i < nums.size(); i++) prefix[i + 1] = prefix[i] + nums[i];

// any inclusive range l..r in O(1)
long long rangeSum = prefix[r + 1] - prefix[l];
~~~

**Line by line:**

- \`std::vector<long long> prefix(nums.size() + 1, 0)\` holds the sentinel and uses 64-bit totals.
- \`prefix[i + 1] = prefix[i] + nums[i]\` promotes each \`int\` to \`long long\` before adding.
- A query is \`prefix[r + 1] - prefix[l]\`; Example 1 checks it against \`std::accumulate\` over the same range.

## 6. C++ Details That Matter Here

- **\`std::partial_sum\`** (and C++17 \`std::inclusive_scan\`) write inclusive running totals. Writing into \`prefix.begin() + 1\` gives the sentinel form: in a test, \`inclusive_scan(v.begin(), v.end(), o.begin() + 1)\` on \`{3, 1, 4}\` produced \`0 3 4 8\`.
- **\`std::accumulate\` uses the type of its initial value.** \`accumulate(b, e, 0)\` sums in \`int\`; \`accumulate(b, e, 0LL)\` summed three values of 2,000,000,000 to 6000000000 correctly.
- **Signed overflow is undefined behaviour,** so \`long long\` for prefix totals is not optional when inputs can be large.

## 7. Verified: Running the Code

Each example below is in the **C++ code** tab on this page. They were saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Build a prefix array and answer range queries**

~~~text
nums   = [3, 1, 4, 1, 5, 9, 2, 6]
prefix = [0, 3, 4, 8, 9, 14, 23, 25, 31]
accumulate = [3, 4, 8, 9, 14, 23, 25, 31]
sum(0..7) = 31 (loop check 31)
sum(2..5) = 19 (loop check 19)
sum(3..3) = 1 (loop check 1)
sum(5..7) = 17 (loop check 17)
~~~

**What this shows:** Each O(1) answer matches a direct loop over the range. The running total without the leading 0 is what the language's built-in scan produces.

**Example 2 — 2D prefix sums for rectangle queries**

~~~text
  0   0   0   0   0
  0   3   3   4   8
  0   8  14  18  24
  0   9  17  21  28
region (0,0)-(2,3) = 28 (loop check 28)
region (1,1)-(2,2) = 11 (loop check 11)
region (0,1)-(1,2) = 10 (loop check 10)
region (2,3)-(2,3) = 1 (loop check 1)
~~~

**What this shows:** The first block is the whole \`P\` table, with its row and column of zero sentinels; each rectangle sum from four lookups matches the brute-force double loop.

**Example 3 — Difference array for range updates**

~~~text
add 5 to [1..3] -> diff = [0, 5, 0, 0, -5, 0, 0]
add 2 to [2..5] -> diff = [0, 5, 2, 0, -5, 0, -2]
add 1 to [0..0] -> diff = [1, 4, 2, 0, -5, 0, -2]
final  = [1, 5, 7, 7, 2, 2]
~~~

**What this shows:** Each update touches two cells of \`diff\`; one prefix-sum pass at the end produces the final array, here \`[1, 5, 7, 7, 2, 2]\`.

## 8. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Build 1D prefix array | O(n) | O(n) | One pass, n + 1 totals |
| Range sum query with prefix | O(1) | O(1) | Two lookups and a subtraction |
| Range sum query by looping | O(r - l + 1) | O(1) | Adds every element of the range |
| q queries total | O(n + q) vs O(n·q) | O(n) | Build once, then constant time each |
| 2D build / rectangle query | O(R·C) / O(1) | O(R·C) | One pass over the grid, four lookups per query |
| Difference array: k range updates | O(k + n) | O(n) | O(1) per update plus one final prefix pass |

## 9. Edge Cases

- **A range starting at 0**: \`prefix[r + 1] - prefix[0]\`; the sentinel 0 makes it work with no special case.
- **A single element** \`l == r\`: \`prefix[l + 1] - prefix[l]\` is \`nums[l]\` (Example 1: \`sum(3..3) = 1\`).
- **Empty array**: \`prefix\` is \`[0]\`, and there is no valid range.
- **Negative numbers** are fine: subtraction still cancels the shared part.
- **Large totals**: a running sum of many 32-bit values can exceed 32 bits in Java and C++; store prefixes in 64-bit types.

## 10. Common Pitfalls

- **\`std::vector<int> prefix\`** for large inputs: overflow is undefined behaviour. Use \`long long\`.
- **\`std::accumulate(..., 0)\`** silently accumulates in \`int\`; write \`0LL\`.
- **Off-by-one:** \`prefix[r] - prefix[l]\` sums \`l..r-1\`.
- **Indexing with \`size_t\` and subtracting** (\`r - l\` when \`r < l\`) wraps to a huge unsigned value.
- **Using prefix sums on frequently updated data:** O(n) per update; use a Fenwick or segment tree.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix[i]</code> is the sum of the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> elements, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix[0] = 0</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The query:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sum(l..r) = prefix[r + 1] - prefix[l]</code>, O(1).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cost:</strong> <span style="color:#f0e2c8;">O(n) build, O(1) per query, O(n + q) overall.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where it shows up:</strong> <span style="color:#f0e2c8;">Subarray-sum counting, 2D rectangle sums, difference arrays for range updates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ detail:</strong> <span style="color:#f0e2c8;">Totals in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> because signed overflow is undefined behaviour, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::partial_sum</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::inclusive_scan</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">begin() + 1</code> builds the table.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does it solve subarray sum equals k?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map&lt;long long, int&gt;</code> of prefix counts and add the count of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix - k</code> at each step. See [count subarrays that sum to k](/interview-question/how-do-you-count-subarrays-that-sum-to-k).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">partial_sum</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">inclusive_scan</code>?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both compute inclusive running totals; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inclusive_scan</code> (C++17) may reorder the operations, which allows parallel execution policies, so it expects an associative operation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if values change between queries?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A Fenwick tree or [segment tree](/interview-question/what-is-a-segment-tree-and-when-do-you-need-one): O(log n) per update and query.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do 2D prefix sums work?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">P[r+1][c+1] = grid[r][c] + P[r][c+1] + P[r+1][c] - P[r][c]</code>, then four lookups per rectangle.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">accumulate(v.begin(), v.end(), 0)</code> dangerous?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The accumulator has the type of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>, an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, so large sums overflow; pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0LL</code>.</span>
</div>


</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prefix sum** | \`prefix[i]\` = sum of the first \`i\` elements |
| **Range sum query** | Sum of a contiguous stretch \`nums[l..r]\` |
| **Sentinel** | A dummy edge value (the leading 0) that removes special cases |
| **Precomputation** | Work done once so later queries are cheap |
| **Inclusion-exclusion** | Add and subtract overlapping parts so each cell counts once |
| **Difference array** | Array of neighbour differences; its prefix sum rebuilds the values |

---
**Conclusion:** Prefix sums precompute running totals so any range sum is \`prefix[r + 1] - prefix[l]\` in O(1) after an O(n) pass, with a leading 0 as sentinel. The technique underlies subarray-sum counting, 2D rectangle queries and difference arrays. In C++17, store totals in \`long long\` (signed overflow is undefined behaviour), use \`std::partial_sum\` or \`std::inclusive_scan\` into \`begin() + 1\` if you like the standard algorithms, and never pass a plain \`0\` to \`std::accumulate\` for large sums.`,
        examples: [
          {
            label: "Build a prefix array and answer range queries",
            code: `#include <iostream>
#include <numeric>
#include <string>
#include <vector>

template <typename T>
std::string fmt(const std::vector<T>& a) {
    std::string s = "[";
    for (size_t i = 0; i < a.size(); i++) {
        if (i > 0) s += ", ";
        s += std::to_string(a[i]);
    }
    return s + "]";
}

int main() {
    std::vector<int> nums = {3, 1, 4, 1, 5, 9, 2, 6};
    // long long: a running total of many ints can overflow int (undefined behaviour)
    std::vector<long long> prefix(nums.size() + 1, 0);   // prefix[i] = sum of nums[0..i-1]
    for (size_t i = 0; i < nums.size(); i++) prefix[i + 1] = prefix[i] + nums[i];
    std::cout << "nums   = " << fmt(nums) << "\\n";
    std::cout << "prefix = " << fmt(prefix) << "\\n";
    // std::partial_sum writes the running totals, without the leading 0
    std::vector<long long> acc(nums.size());
    std::partial_sum(nums.begin(), nums.end(), acc.begin());
    std::cout << "accumulate = " << fmt(acc) << "\\n";
    int queries[4][2] = {{0, 7}, {2, 5}, {3, 3}, {5, 7}};
    for (auto& q : queries) {
        long long fast = prefix[q[1] + 1] - prefix[q[0]];   // inclusive range, O(1)
        long long slow = std::accumulate(nums.begin() + q[0], nums.begin() + q[1] + 1, 0LL);
        std::cout << "sum(" << q[0] << ".." << q[1] << ") = " << fast << " (loop check " << slow << ")\\n";
    }
    return 0;
}`,
          },
          {
            label: "2D prefix sums for rectangle queries",
            code: `#include <cstdio>
#include <iostream>
#include <vector>

int main() {
    // 2D prefix sums: P[r][c] = sum of the rectangle grid[0..r-1][0..c-1]
    std::vector<std::vector<int>> grid = {{3, 0, 1, 4},
                                          {5, 6, 3, 2},
                                          {1, 2, 0, 1}};
    const int rows = grid.size(), cols = grid[0].size();
    std::vector<std::vector<long long>> P(rows + 1, std::vector<long long>(cols + 1, 0));
    for (int r = 0; r < rows; r++)
        for (int c = 0; c < cols; c++)
            P[r + 1][c + 1] = grid[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c];

    for (const auto& row : P) {
        for (size_t c = 0; c < row.size(); c++) std::printf(c ? " %3lld" : "%3lld", row[c]);
        std::printf("\\n");
    }
    int queries[4][4] = {{0, 0, 2, 3}, {1, 1, 2, 2}, {0, 1, 1, 2}, {2, 3, 2, 3}};
    for (auto& q : queries) {
        int r1 = q[0], c1 = q[1], r2 = q[2], c2 = q[3];
        long long fast = P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
        long long slow = 0;
        for (int r = r1; r <= r2; r++) for (int c = c1; c <= c2; c++) slow += grid[r][c];
        std::printf("region (%d,%d)-(%d,%d) = %lld (loop check %lld)\\n", r1, c1, r2, c2, fast, slow);
    }
    return 0;
}`,
          },
          {
            label: "Difference array for range updates",
            code: `#include <iostream>
#include <string>
#include <vector>

std::string fmt(const std::vector<int>& a) {
    std::string s = "[";
    for (size_t i = 0; i < a.size(); i++) {
        if (i > 0) s += ", ";
        s += std::to_string(a[i]);
    }
    return s + "]";
}

int main() {
    // Difference array: the reverse of a prefix sum. Each "add v to every index
    // in [l, r]" costs O(1); one prefix-sum pass at the end gives the final array.
    const int n = 6;
    std::vector<int> diff(n + 1, 0);   // one extra slot so right + 1 never goes out of bounds
    int updates[3][3] = {{1, 3, 5}, {2, 5, 2}, {0, 0, 1}};
    for (auto& u : updates) {
        diff[u[0]] += u[2];
        diff[u[1] + 1] -= u[2];
        std::cout << "add " << u[2] << " to [" << u[0] << ".." << u[1] << "] -> diff = " << fmt(diff) << "\\n";
    }
    std::vector<int> result;
    int running = 0;
    for (int i = 0; i < n; i++) {
        running += diff[i];
        result.push_back(running);
    }
    std::cout << "final  = " << fmt(result) << "\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
  {
    title: "How do you count subarrays that sum to k?",
    difficulty: "medium",
    seoDescription: "Count subarrays with sum k in O(n) using prefix sums and a hash map of counts, why sliding windows fail on negatives, in Python, JavaScript, Java and C++.",
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given a list of integers that may include negatives, and a target k, count how many contiguous subarrays sum to exactly k. Brute force is O(n squared) — can you do it in linear time in Python?"

**What a strong answer should cover:**
- A subarray sum is \`P[j] - P[i]\`, so count earlier prefixes equal to \`prefix - k\`.
- A count map seeded with \`{0: 1}\`; count before recording; counts, not a set.
- O(n) average time, O(n) space; brute force O(n²); why a sliding window fails with negatives.
- Python specifics: \`collections.Counter\` returns 0 for a missing key without inserting it, unlike \`defaultdict\`; \`dict.get(key, 0)\` also works.
- Edge cases: zeros, \`k = 0\`, subarrays starting at index 0.

**Clarifying questions expected:**
- "Can the array contain negatives or zeros?" — decides between a sliding window and prefix sums.
- "Do you want the count or the subarrays themselves, and how large can the sums get?"

**Code / implementation expected:** Yes — a one-pass Python function with a \`Counter\` or dict.`,
        answer: `**Target Audience:** Intermediate candidates — you should know arrays and hash maps; prefix sums are explained here and linked.
**Difficulty:** Medium
**Language:** Python 3

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the Python code with \`python3 main.py\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Suppose you track your bank balance every day for a month, and you want to know how many stretches of consecutive days had a net change of exactly +700. Checking every possible stretch means comparing every start day with every end day — fine for a month, painful for ten years.

Here is the shortcut. The net change over a stretch is simply "balance at the end minus balance just before the start". So a stretch ending today has a net change of +700 exactly when some earlier balance was today's balance minus 700. If you keep a notebook of every balance you have seen so far and how many times you saw it, each day you look up one number and you know immediately how many good stretches end today. One pass through the month, one lookup per day. Replace "balance" with [prefix sum](/interview-question/what-is-the-prefix-sum-technique) and "notebook" with hash map, and that is the whole algorithm.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the array contain negative numbers or zeros? | If yes, a sliding window does not work, and you need prefix sums with a hash map (Example 2 shows the window failing). |
| Do you want the count, or the subarrays themselves? | Listing them can take O(n²) output; counting is O(n). |
| Are subarrays contiguous? | Yes in this problem; non-contiguous "subsets" would be a different, much harder problem. |
| How large can the values and n be? | In Java and C++ it decides whether the running sum needs a 64-bit type. |
| Can \`k\` be 0 or negative? | It is allowed and the algorithm handles it, but it is a good test case (\`[0, 0, 0]\` with \`k = 0\` has 6 subarrays). |

## 3. The Core Idea: A Subarray Sum Is a Difference of Two Prefix Sums

Let \`P[j]\` be the sum of the first \`j\` elements, with \`P[0] = 0\`. The subarray from index \`i\` to index \`j - 1\` sums to \`P[j] - P[i]\`. So:

**the subarray ending at position \`j - 1\` sums to \`k\` exactly when an earlier prefix \`P[i]\` equals \`P[j] - k\`.**

Count how many earlier prefixes have that value, for every \`j\`, and add them up.

📌 **Interview term: Subarray** — a contiguous, non-empty slice of an array. \`[7, 2, -3, 1]\` is a subarray of \`[3, 4, 7, 2, -3, 1, 4, 2]\`; \`[3, 7]\` is not.

📌 **Interview term: Prefix sum + hash map pattern** — walk the array once with a running sum and a map from "prefix value" to "how many times it has occurred", and at each step look up the complementary prefix. The same pattern solves "longest subarray with sum k", "subarrays divisible by k" and the [Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently) family.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Prefix sums 0 3 7 14 16 13 14 18 20 for the array 3 4 7 2 -3 1 4 2. Four pairs differ by exactly 7, one for each subarray that sums to 7">
  <path class="d-edge-accent" d="M 68 110 C 68 62, 224 62, 224 110" fill="none"/>
  <path class="d-edge-accent" d="M 224 110 C 224 71, 302 71, 302 110" fill="none"/>
  <path class="d-edge-accent" d="M 224 110 C 224 44, 536 44, 536 110" fill="none"/>
  <path class="d-edge-accent" d="M 458 110 C 458 53, 692 53, 692 110" fill="none"/>
  <rect class="d-box-accent" x="40" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="68" y="140" text-anchor="middle">0</text>
  <text class="d-sub" x="68" y="186" text-anchor="middle">P0</text>
  <rect class="d-box" x="118" y="112" width="56" height="44" rx="8"/>
  <text class="d-text" x="146" y="140" text-anchor="middle">3</text>
  <text class="d-sub" x="146" y="186" text-anchor="middle">P1</text>
  <rect class="d-box-accent" x="196" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="224" y="140" text-anchor="middle">7</text>
  <text class="d-sub" x="224" y="186" text-anchor="middle">P2</text>
  <rect class="d-box-accent" x="274" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="302" y="140" text-anchor="middle">14</text>
  <text class="d-sub" x="302" y="186" text-anchor="middle">P3</text>
  <rect class="d-box" x="352" y="112" width="56" height="44" rx="8"/>
  <text class="d-text" x="380" y="140" text-anchor="middle">16</text>
  <text class="d-sub" x="380" y="186" text-anchor="middle">P4</text>
  <rect class="d-box-accent" x="430" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="458" y="140" text-anchor="middle">13</text>
  <text class="d-sub" x="458" y="186" text-anchor="middle">P5</text>
  <rect class="d-box-accent" x="508" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="536" y="140" text-anchor="middle">14</text>
  <text class="d-sub" x="536" y="186" text-anchor="middle">P6</text>
  <rect class="d-box" x="586" y="112" width="56" height="44" rx="8"/>
  <text class="d-text" x="614" y="140" text-anchor="middle">18</text>
  <text class="d-sub" x="614" y="186" text-anchor="middle">P7</text>
  <rect class="d-box-accent" x="664" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="692" y="140" text-anchor="middle">20</text>
  <text class="d-sub" x="692" y="186" text-anchor="middle">P8</text>
</svg>

For \`[3, 4, 7, 2, -3, 1, 4, 2]\` and \`k = 7\`, each arc joins two prefix sums that differ by 7. P0 and P2 give \`[3, 4]\`; P2 and P3 give \`[7]\`; P2 and P6 give \`[7, 2, -3, 1]\`; P5 and P8 give \`[1, 4, 2]\`. Four arcs, four subarrays, and the answer is 4.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 150" role="img" aria-label="One step at P3. The prefix is 14, look up 14 minus 7 which is 7, the map says 7 was seen once, so add 1 to the count, then record 14">
  <defs>
    <marker id="b06q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="80" y="70" text-anchor="middle">prefix = 14</text>
  <text class="d-sub" x="80" y="94" text-anchor="middle">after 3, 4, 7</text>
  <path class="d-edge" d="M 150 75 L 186 75" marker-end="url(#b06q5-arrow)"/>
  <rect class="d-box" x="190" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="260" y="70" text-anchor="middle">need 14 - 7</text>
  <text class="d-sub" x="260" y="94" text-anchor="middle">look up 7</text>
  <path class="d-edge" d="M 330 75 L 366 75" marker-end="url(#b06q5-arrow)"/>
  <rect class="d-box-accent" x="370" y="40" width="140" height="70" rx="10"/>
  <text class="d-text d-accent" x="440" y="70" text-anchor="middle">seen[7] = 1</text>
  <text class="d-sub" x="440" y="94" text-anchor="middle">count += 1</text>
  <path class="d-edge" d="M 510 75 L 546 75" marker-end="url(#b06q5-arrow)"/>
  <rect class="d-box" x="550" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="630" y="70" text-anchor="middle">then seen[14] += 1</text>
  <text class="d-sub" x="630" y="94" text-anchor="middle">record after counting</text>
</svg>

At each step the order is: update the prefix, look up \`prefix - k\`, add its count, and only then record the current prefix.

## 4. Three Details That Make It Correct

1. **Seed the map with prefix 0, seen once (\`0 -> 1\`).** The empty prefix \`P[0] = 0\` exists before any element. Without it, subarrays that start at index 0 (like \`[3, 4]\` above) are never counted.
2. **Count, then record.** If you recorded \`prefix\` before looking up \`prefix - k\`, then with \`k = 0\` every position would match itself and count an *empty* subarray.
3. **Store counts, not just presence.** The same prefix value can occur many times (after zeros, or after a stretch that sums to 0), and each occurrence is a different start index. \`[0, 0, 0]\` with \`k = 0\` has 6 subarrays, which only a count map gets right.

📌 **Interview term: Complement lookup** — instead of searching for a pair, compute the value its partner must have (\`prefix - k\`) and look that up directly in O(1).

## 5. Why Not Brute Force or a Sliding Window?

**Brute force** fixes a start \`i\`, extends the end \`j\` with a running sum, and counts the matches: O(n²) time, O(1) space. It is the right first thing to say, and Example 2 uses it to check the fast version.

**A sliding window** (grow the right end, shrink the left end while the sum is too big) is O(n), but it only works when every number is positive: it assumes that adding an element never lowers the sum and removing one never raises it. With negatives or zeros the assumption breaks. Example 2 shows it returning 0 where the true count is 8, 12 and 4, and agreeing only on an all-positive array. When to use a window is covered in [the sliding window technique](/interview-question/what-is-the-sliding-window-technique).

📌 **Interview term: Monotonic (window) property** — "the window sum only goes up as it grows". The sliding window needs it; prefix sums with a hash map do not.

| Method | Time | Works with negatives? |
| :--- | :--- | :--- |
| All start/end pairs, re-summing each | O(n³) | Yes |
| Brute force with a running sum | O(n²) | Yes |
| Sliding window | O(n) | No — positive values only |
| Prefix sum + hash map | O(n) average | Yes |

## 6. The Code in Python

The O(n) solution from Example 1.

~~~python
from collections import Counter


def subarray_sum(nums, k):
    count = 0
    prefix = 0
    seen = Counter()          # prefix value -> how many times we have seen it
    seen[0] = 1               # the empty prefix: lets a subarray start at index 0
    for x in nums:
        prefix += x
        count += seen[prefix - k]   # Counter returns 0 for a missing key and does NOT insert it
        seen[prefix] += 1           # record AFTER counting, so a subarray is never empty
    return count
~~~

**Line by line:**

- \`seen = Counter()\` maps a prefix value to how many times it has occurred; \`seen[0] = 1\` seeds the empty prefix.
- \`count += seen[prefix - k]\` is the complement lookup. On a \`Counter\`, a missing key reads as 0 and is **not** inserted.
- \`seen[prefix] += 1\` comes after the lookup, so a position never pairs with itself.

## 7. Python Details That Matter Here

- **\`Counter\` vs \`defaultdict(int)\` on lookups.** Both return 0 for a missing key, but \`defaultdict\` *inserts* the key as a side effect. In a test, reading \`d[5]\` on an empty \`defaultdict(int)\` left \`len(d) == 1\`; the same read on a \`Counter\` left \`len(c) == 0\`. With \`defaultdict\`, every failed lookup of \`prefix - k\` adds a junk entry; the answer stays right, but memory grows.
- **\`dict.get(key, 0)\`** is the plain-dict equivalent (Example 2 uses it).
- **Ints never overflow,** so the running prefix is always exact.

## 8. Verified: Running the Code

Each example below is in the **Python code** tab on this page. They were saved as \`main.py\` and run with \`python3 main.py\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Prefix sum + hash map on seven inputs**

~~~text
[1, 1, 1], k=2 -> 2
[1, 2, 3], k=3 -> 2
[1, -1, 0], k=0 -> 3
[3, 4, 7, 2, -3, 1, 4, 2], k=7 -> 4
[0, 0, 0], k=0 -> 6
[5], k=5 -> 1
[1, 2], k=4 -> 0
~~~

**What this shows:** Every edge case from the list below gives the expected count, including \`[0, 0, 0]\` with \`k = 0\` (6) and the worked example \`[3, 4, 7, 2, -3, 1, 4, 2]\` with \`k = 7\` (4).

**Example 2 — Brute force vs hash map vs sliding window**

~~~text
[1, 0, 3, -3, -1, -1, 2, 0, 0, -2, -3, -1], k=-1: brute 8, hash map 8, sliding window 0
[-3, -3, -1, 1, 2, -2, -2, -1, -2, 3, 1, -1], k=-2: brute 12, hash map 12, sliding window 0
[2, -2, 0, 3, -2, 3, 2, 0, -2, 0, 1, 1], k=-1: brute 3, hash map 3, sliding window 1
[2, 2, 0, 2, 0, 0, -2, -3, -2, 3, 1, 3], k=1: brute 4, hash map 4, sliding window 0
positive only [1, 2, 1, 3, 1, 1, 2], k=3: brute 4, hash map 4, sliding window 4
~~~

**What this shows:** On four arrays with values from -3 to 3 (generated by the same tiny deterministic generator in all four languages), the hash map always matches brute force, while the sliding window is wrong every time. On an all-positive array all three agree: the window is only valid when values are positive.

## 9. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (running sum) | O(n²) | O(1) | Every start index, every end index |
| Sliding window | O(n) | O(1) | Each index enters and leaves once, but only correct for positives |
| Prefix sum + hash map | O(n) average | O(n) | One pass, one lookup and one update per element; up to n + 1 distinct prefixes |

## 10. Edge Cases

- **All zeros with \`k = 0\`**: \`[0, 0, 0]\` has 6 subarrays (3 + 2 + 1), which needs counts, not a set.
- **\`k = 0\` with mixed signs**: \`[1, -1, 0]\` gives 3 (\`[1, -1]\`, \`[0]\`, \`[1, -1, 0]\`).
- **A subarray starting at index 0**: needs the seed \`0 -> 1\` (\`[1, 1, 1]\`, \`k = 2\` gives 2).
- **No match**: \`[1, 2]\` with \`k = 4\` gives 0.
- **Single element equal to \`k\`**: \`[5]\`, \`k = 5\` gives 1.
- **Large sums** in Java and C++: the running prefix can exceed 32 bits even when each element fits.

## 11. Common Pitfalls

- **Forgetting \`seen[0] = 1\`:** subarrays starting at index 0 are missed (\`[1, 1, 1]\`, \`k = 2\` would give 1 instead of 2).
- **Recording before counting:** with \`k = 0\`, each position matches itself.
- **Using a \`set\` of prefixes** instead of counts: \`[0, 0, 0]\`, \`k = 0\` must give 6.
- **\`defaultdict\` lookups** insert a key for every miss; use \`Counter\` or \`.get\`.
- **Reaching for a sliding window:** it fails as soon as negatives or zeros appear (Example 2).

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The key fact:</strong> <span style="color:#f0e2c8;">A subarray sum is the difference of two prefix sums, so a subarray ending here sums to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code> when an earlier prefix equals <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix - k</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The algorithm:</strong> <span style="color:#f0e2c8;">One pass with a running <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix</code> and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code> of prefixes; add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen[prefix - k]</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen[prefix] += 1</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The details:</strong> <span style="color:#f0e2c8;">Seed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen[0] = 1</code> for subarrays starting at 0, count before recording, and keep counts because prefixes repeat.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n) average time and O(n) space, versus O(n²) brute force.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why not a window:</strong> <span style="color:#f0e2c8;">With negatives the window sum is not monotonic, so shrinking can skip valid answers; the prefix map does not care about signs.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why seed the map with 0?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It represents the empty prefix before index 0. Without it, a subarray starting at index 0 has no earlier prefix to pair with.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use a set of prefixes?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same prefix can occur several times, and each occurrence is a different start index. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 0, 0]</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k = 0</code> has 6 subarrays; a set would count 3.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find the longest such subarray?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store the *first* index of each prefix instead of a count, and track <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j - first[prefix - k]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about subarrays divisible by k?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix % k</code> as the key: two prefixes with the same remainder bound a subarray divisible by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>. Python <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">%</code> is already non-negative for positive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is the sliding window fine?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When all values are positive: then the window sum only grows as it widens. See [the sliding window technique](/interview-question/what-is-the-sliding-window-technique).</span>
</div>


</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subarray** | A contiguous, non-empty slice of an array |
| **Prefix sum + hash map pattern** | Running sum plus a map of prefix counts, with a complement lookup each step |
| **Complement lookup** | Compute the partner value (\`prefix - k\`) and look it up directly |
| **Monotonic (window) property** | Window sum only grows as it widens; required by sliding windows |

---
**Conclusion:** Counting subarrays that sum to \`k\` comes down to one identity: a subarray sum is the difference of two prefix sums. Walk the list once with a running sum and a \`Counter\` of earlier prefixes, add the count of \`prefix - k\` at each step, and you have O(n) average time even with negative numbers — the case where a sliding window silently fails, as Example 2 shows. The three details that make it correct are the \`{0: 1}\` seed, counting before recording, and keeping counts rather than a set; in Python, prefer \`Counter\` or \`.get\` so failed lookups do not insert keys.`,
        examples: [
          {
            label: "Prefix sum + hash map on seven inputs",
            code: `from collections import Counter


def subarray_sum(nums, k):
    count = 0
    prefix = 0
    seen = Counter()          # prefix value -> how many times we have seen it
    seen[0] = 1               # the empty prefix: lets a subarray start at index 0
    for x in nums:
        prefix += x
        count += seen[prefix - k]   # Counter returns 0 for a missing key and does NOT insert it
        seen[prefix] += 1           # record AFTER counting, so a subarray is never empty
    return count


def fmt(a):
    return "[" + ", ".join(str(v) for v in a) + "]"


tests = [([1, 1, 1], 2), ([1, 2, 3], 3), ([1, -1, 0], 0), ([3, 4, 7, 2, -3, 1, 4, 2], 7),
         ([0, 0, 0], 0), ([5], 5), ([1, 2], 4)]
for nums, k in tests:
    print(fmt(nums) + ", k=" + str(k) + " -> " + str(subarray_sum(nums, k)))`,
          },
          {
            label: "Brute force vs hash map vs sliding window",
            code: `# Brute force O(n^2) vs prefix sum + hash map O(n), plus a sliding window
# that is only correct when every number is positive.
def brute(nums, k):
    count = 0
    for i in range(len(nums)):
        s = 0
        for j in range(i, len(nums)):
            s += nums[j]
            if s == k:
                count += 1
    return count


def hashed(nums, k):
    count, prefix, seen = 0, 0, {0: 1}
    for x in nums:
        prefix += x
        count += seen.get(prefix - k, 0)
        seen[prefix] = seen.get(prefix, 0) + 1
    return count


def sliding_window(nums, k):  # shrink while sum > k: assumes adding never lowers the sum
    count = left = s = 0
    for right in range(len(nums)):
        s += nums[right]
        while s > k and left <= right:
            s -= nums[left]
            left += 1
        if s == k:
            count += 1
    return count


seed = 7
def next_rand():            # tiny deterministic generator, identical in every language
    global seed
    seed = (seed * 75 + 74) % 65537
    return seed


for trial in range(4):
    nums = [next_rand() % 7 - 3 for _ in range(12)]   # values in -3..3
    k = next_rand() % 5 - 2
    print("[" + ", ".join(str(v) for v in nums) + "], k=" + str(k) + ": brute " + str(brute(nums, k))
          + ", hash map " + str(hashed(nums, k)) + ", sliding window " + str(sliding_window(nums, k)))
pos = [1, 2, 1, 3, 1, 1, 2]
print("positive only [1, 2, 1, 3, 1, 1, 2], k=3: brute " + str(brute(pos, 3)) + ", hash map "
      + str(hashed(pos, 3)) + ", sliding window " + str(sliding_window(pos, 3)))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Write a JavaScript function that counts the contiguous subarrays of an integer array — negatives allowed — whose sum equals k, in O(n) time."

**What a strong answer should cover:**
- Subarray sum = \`P[j] - P[i]\`; count earlier prefixes equal to \`prefix - k\`.
- A \`Map\` of prefix counts seeded with \`0 -> 1\`; count before recording.
- O(n) average time, O(n) space; brute force O(n²); a sliding window fails with negatives.
- JavaScript specifics: \`Map.get\` returns \`undefined\` for a missing key, so use \`|| 0\`; plain-object keys become strings while \`Map\` keeps numbers.
- Edge cases: zeros, \`k = 0\`, subarrays from index 0.

**Clarifying questions expected:**
- "Can the array contain negatives or zeros?" — decides between a sliding window and prefix sums.
- "Do you want the count or the subarrays themselves, and how large can the sums get?"

**Code / implementation expected:** Yes — a one-pass JavaScript function using \`Map\`.`,
        answer: `**Target Audience:** Intermediate candidates — you should know arrays and hash maps; prefix sums are explained here and linked.
**Difficulty:** Medium
**Language:** JavaScript (ES2020+)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the JavaScript code with \`node main.js\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Suppose you track your bank balance every day for a month, and you want to know how many stretches of consecutive days had a net change of exactly +700. Checking every possible stretch means comparing every start day with every end day — fine for a month, painful for ten years.

Here is the shortcut. The net change over a stretch is simply "balance at the end minus balance just before the start". So a stretch ending today has a net change of +700 exactly when some earlier balance was today's balance minus 700. If you keep a notebook of every balance you have seen so far and how many times you saw it, each day you look up one number and you know immediately how many good stretches end today. One pass through the month, one lookup per day. Replace "balance" with [prefix sum](/interview-question/what-is-the-prefix-sum-technique) and "notebook" with hash map, and that is the whole algorithm.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the array contain negative numbers or zeros? | If yes, a sliding window does not work, and you need prefix sums with a hash map (Example 2 shows the window failing). |
| Do you want the count, or the subarrays themselves? | Listing them can take O(n²) output; counting is O(n). |
| Are subarrays contiguous? | Yes in this problem; non-contiguous "subsets" would be a different, much harder problem. |
| How large can the values and n be? | In Java and C++ it decides whether the running sum needs a 64-bit type. |
| Can \`k\` be 0 or negative? | It is allowed and the algorithm handles it, but it is a good test case (\`[0, 0, 0]\` with \`k = 0\` has 6 subarrays). |

## 3. The Core Idea: A Subarray Sum Is a Difference of Two Prefix Sums

Let \`P[j]\` be the sum of the first \`j\` elements, with \`P[0] = 0\`. The subarray from index \`i\` to index \`j - 1\` sums to \`P[j] - P[i]\`. So:

**the subarray ending at position \`j - 1\` sums to \`k\` exactly when an earlier prefix \`P[i]\` equals \`P[j] - k\`.**

Count how many earlier prefixes have that value, for every \`j\`, and add them up.

📌 **Interview term: Subarray** — a contiguous, non-empty slice of an array. \`[7, 2, -3, 1]\` is a subarray of \`[3, 4, 7, 2, -3, 1, 4, 2]\`; \`[3, 7]\` is not.

📌 **Interview term: Prefix sum + hash map pattern** — walk the array once with a running sum and a map from "prefix value" to "how many times it has occurred", and at each step look up the complementary prefix. The same pattern solves "longest subarray with sum k", "subarrays divisible by k" and the [Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently) family.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Prefix sums 0 3 7 14 16 13 14 18 20 for the array 3 4 7 2 -3 1 4 2. Four pairs differ by exactly 7, one for each subarray that sums to 7">
  <path class="d-edge-accent" d="M 68 110 C 68 62, 224 62, 224 110" fill="none"/>
  <path class="d-edge-accent" d="M 224 110 C 224 71, 302 71, 302 110" fill="none"/>
  <path class="d-edge-accent" d="M 224 110 C 224 44, 536 44, 536 110" fill="none"/>
  <path class="d-edge-accent" d="M 458 110 C 458 53, 692 53, 692 110" fill="none"/>
  <rect class="d-box-accent" x="40" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="68" y="140" text-anchor="middle">0</text>
  <text class="d-sub" x="68" y="186" text-anchor="middle">P0</text>
  <rect class="d-box" x="118" y="112" width="56" height="44" rx="8"/>
  <text class="d-text" x="146" y="140" text-anchor="middle">3</text>
  <text class="d-sub" x="146" y="186" text-anchor="middle">P1</text>
  <rect class="d-box-accent" x="196" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="224" y="140" text-anchor="middle">7</text>
  <text class="d-sub" x="224" y="186" text-anchor="middle">P2</text>
  <rect class="d-box-accent" x="274" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="302" y="140" text-anchor="middle">14</text>
  <text class="d-sub" x="302" y="186" text-anchor="middle">P3</text>
  <rect class="d-box" x="352" y="112" width="56" height="44" rx="8"/>
  <text class="d-text" x="380" y="140" text-anchor="middle">16</text>
  <text class="d-sub" x="380" y="186" text-anchor="middle">P4</text>
  <rect class="d-box-accent" x="430" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="458" y="140" text-anchor="middle">13</text>
  <text class="d-sub" x="458" y="186" text-anchor="middle">P5</text>
  <rect class="d-box-accent" x="508" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="536" y="140" text-anchor="middle">14</text>
  <text class="d-sub" x="536" y="186" text-anchor="middle">P6</text>
  <rect class="d-box" x="586" y="112" width="56" height="44" rx="8"/>
  <text class="d-text" x="614" y="140" text-anchor="middle">18</text>
  <text class="d-sub" x="614" y="186" text-anchor="middle">P7</text>
  <rect class="d-box-accent" x="664" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="692" y="140" text-anchor="middle">20</text>
  <text class="d-sub" x="692" y="186" text-anchor="middle">P8</text>
</svg>

For \`[3, 4, 7, 2, -3, 1, 4, 2]\` and \`k = 7\`, each arc joins two prefix sums that differ by 7. P0 and P2 give \`[3, 4]\`; P2 and P3 give \`[7]\`; P2 and P6 give \`[7, 2, -3, 1]\`; P5 and P8 give \`[1, 4, 2]\`. Four arcs, four subarrays, and the answer is 4.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 150" role="img" aria-label="One step at P3. The prefix is 14, look up 14 minus 7 which is 7, the map says 7 was seen once, so add 1 to the count, then record 14">
  <defs>
    <marker id="b06q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="80" y="70" text-anchor="middle">prefix = 14</text>
  <text class="d-sub" x="80" y="94" text-anchor="middle">after 3, 4, 7</text>
  <path class="d-edge" d="M 150 75 L 186 75" marker-end="url(#b06q5-arrow)"/>
  <rect class="d-box" x="190" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="260" y="70" text-anchor="middle">need 14 - 7</text>
  <text class="d-sub" x="260" y="94" text-anchor="middle">look up 7</text>
  <path class="d-edge" d="M 330 75 L 366 75" marker-end="url(#b06q5-arrow)"/>
  <rect class="d-box-accent" x="370" y="40" width="140" height="70" rx="10"/>
  <text class="d-text d-accent" x="440" y="70" text-anchor="middle">seen[7] = 1</text>
  <text class="d-sub" x="440" y="94" text-anchor="middle">count += 1</text>
  <path class="d-edge" d="M 510 75 L 546 75" marker-end="url(#b06q5-arrow)"/>
  <rect class="d-box" x="550" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="630" y="70" text-anchor="middle">then seen[14] += 1</text>
  <text class="d-sub" x="630" y="94" text-anchor="middle">record after counting</text>
</svg>

At each step the order is: update the prefix, look up \`prefix - k\`, add its count, and only then record the current prefix.

## 4. Three Details That Make It Correct

1. **Seed the map with prefix 0, seen once (\`0 -> 1\`).** The empty prefix \`P[0] = 0\` exists before any element. Without it, subarrays that start at index 0 (like \`[3, 4]\` above) are never counted.
2. **Count, then record.** If you recorded \`prefix\` before looking up \`prefix - k\`, then with \`k = 0\` every position would match itself and count an *empty* subarray.
3. **Store counts, not just presence.** The same prefix value can occur many times (after zeros, or after a stretch that sums to 0), and each occurrence is a different start index. \`[0, 0, 0]\` with \`k = 0\` has 6 subarrays, which only a count map gets right.

📌 **Interview term: Complement lookup** — instead of searching for a pair, compute the value its partner must have (\`prefix - k\`) and look that up directly in O(1).

## 5. Why Not Brute Force or a Sliding Window?

**Brute force** fixes a start \`i\`, extends the end \`j\` with a running sum, and counts the matches: O(n²) time, O(1) space. It is the right first thing to say, and Example 2 uses it to check the fast version.

**A sliding window** (grow the right end, shrink the left end while the sum is too big) is O(n), but it only works when every number is positive: it assumes that adding an element never lowers the sum and removing one never raises it. With negatives or zeros the assumption breaks. Example 2 shows it returning 0 where the true count is 8, 12 and 4, and agreeing only on an all-positive array. When to use a window is covered in [the sliding window technique](/interview-question/what-is-the-sliding-window-technique).

📌 **Interview term: Monotonic (window) property** — "the window sum only goes up as it grows". The sliding window needs it; prefix sums with a hash map do not.

| Method | Time | Works with negatives? |
| :--- | :--- | :--- |
| All start/end pairs, re-summing each | O(n³) | Yes |
| Brute force with a running sum | O(n²) | Yes |
| Sliding window | O(n) | No — positive values only |
| Prefix sum + hash map | O(n) average | Yes |

## 6. The Code in JavaScript

The O(n) solution from Example 1.

~~~javascript
function subarraySum(nums, k) {
  let count = 0;
  let prefix = 0;
  const seen = new Map();     // prefix value -> how many times we have seen it
  seen.set(0, 1);             // the empty prefix: lets a subarray start at index 0
  for (const x of nums) {
    prefix += x;
    count += seen.get(prefix - k) || 0;          // get() returns undefined when absent
    seen.set(prefix, (seen.get(prefix) || 0) + 1); // record AFTER counting
  }
  return count;
}
~~~

**Line by line:**

- \`seen.set(0, 1)\` seeds the empty prefix.
- \`seen.get(prefix - k) || 0\` turns the \`undefined\` of a missing key into 0. (\`undefined + 1\` would be \`NaN\`.)
- The \`set\` after the lookup records the current prefix so a position never pairs with itself.

## 7. JavaScript Details That Matter Here

- **\`Map\` vs plain object.** An object converts keys to strings: after \`o[1] = 1\`, \`Object.keys(o)\` printed \`[ '1' ]\` with type \`string\`. \`Map\` keeps the number, so \`m.get('1')\` is \`undefined\` while \`m.get(1)\` is 1. For numeric keys, including negatives, \`Map\` is the cleaner choice.
- **\`get\` returns \`undefined\`,** not 0. Forgetting \`|| 0\` (or \`?? 0\`) turns the count into \`NaN\`.
- **Integers are exact up to 2^53 - 1,** so the running prefix does not overflow for 32-bit-range inputs.

## 8. Verified: Running the Code

Each example below is in the **JavaScript code** tab on this page. They were saved as \`main.js\` and run with \`node main.js\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Prefix sum + hash map on seven inputs**

~~~text
[1, 1, 1], k=2 -> 2
[1, 2, 3], k=3 -> 2
[1, -1, 0], k=0 -> 3
[3, 4, 7, 2, -3, 1, 4, 2], k=7 -> 4
[0, 0, 0], k=0 -> 6
[5], k=5 -> 1
[1, 2], k=4 -> 0
~~~

**What this shows:** Every edge case from the list below gives the expected count, including \`[0, 0, 0]\` with \`k = 0\` (6) and the worked example \`[3, 4, 7, 2, -3, 1, 4, 2]\` with \`k = 7\` (4).

**Example 2 — Brute force vs hash map vs sliding window**

~~~text
[1, 0, 3, -3, -1, -1, 2, 0, 0, -2, -3, -1], k=-1: brute 8, hash map 8, sliding window 0
[-3, -3, -1, 1, 2, -2, -2, -1, -2, 3, 1, -1], k=-2: brute 12, hash map 12, sliding window 0
[2, -2, 0, 3, -2, 3, 2, 0, -2, 0, 1, 1], k=-1: brute 3, hash map 3, sliding window 1
[2, 2, 0, 2, 0, 0, -2, -3, -2, 3, 1, 3], k=1: brute 4, hash map 4, sliding window 0
positive only [1, 2, 1, 3, 1, 1, 2], k=3: brute 4, hash map 4, sliding window 4
~~~

**What this shows:** On four arrays with values from -3 to 3 (generated by the same tiny deterministic generator in all four languages), the hash map always matches brute force, while the sliding window is wrong every time. On an all-positive array all three agree: the window is only valid when values are positive.

## 9. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (running sum) | O(n²) | O(1) | Every start index, every end index |
| Sliding window | O(n) | O(1) | Each index enters and leaves once, but only correct for positives |
| Prefix sum + hash map | O(n) average | O(n) | One pass, one lookup and one update per element; up to n + 1 distinct prefixes |

## 10. Edge Cases

- **All zeros with \`k = 0\`**: \`[0, 0, 0]\` has 6 subarrays (3 + 2 + 1), which needs counts, not a set.
- **\`k = 0\` with mixed signs**: \`[1, -1, 0]\` gives 3 (\`[1, -1]\`, \`[0]\`, \`[1, -1, 0]\`).
- **A subarray starting at index 0**: needs the seed \`0 -> 1\` (\`[1, 1, 1]\`, \`k = 2\` gives 2).
- **No match**: \`[1, 2]\` with \`k = 4\` gives 0.
- **Single element equal to \`k\`**: \`[5]\`, \`k = 5\` gives 1.
- **Large sums** in Java and C++: the running prefix can exceed 32 bits even when each element fits.

## 11. Common Pitfalls

- **\`count += seen.get(prefix - k)\`** without \`|| 0\` makes \`count\` become \`NaN\` on the first miss.
- **Forgetting \`seen.set(0, 1)\`:** subarrays that start at index 0 are missed.
- **Recording before counting:** with \`k = 0\` each index matches itself.
- **A \`Set\` instead of counts:** \`[0, 0, 0]\`, \`k = 0\` must give 6.
- **A sliding window:** wrong as soon as negatives appear (Example 2).

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The key fact:</strong> <span style="color:#f0e2c8;">A subarray sum is the difference of two prefix sums, so I need earlier prefixes equal to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix - k</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The algorithm:</strong> <span style="color:#f0e2c8;">One pass with a running <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix</code> and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> of counts: add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen.get(prefix - k) || 0</code>, then increment <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen[prefix]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The details:</strong> <span style="color:#f0e2c8;">Seed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 -&gt; 1</code>, count before recording, and store counts because prefixes repeat.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n) average time, O(n) space, versus O(n²) brute force.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The JavaScript detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> keeps numeric keys as numbers and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> for misses, so I default it to 0.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a Map rather than an object?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Object keys are converted to strings, and objects inherit prototype properties. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> keeps keys as numbers and has no inherited keys.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why seed with 0?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the empty prefix before index 0; without it, subarrays that start at 0 never match.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you get the longest such subarray?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store the first index of each prefix and track <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j - first.get(prefix - k)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about subarrays divisible by k?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Key by remainder, but normalise it: in JS <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1 % 5</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code>, so use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">((prefix % k) + k) % k</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is a sliding window fine?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only for positive values, where the window sum grows monotonically. See [the sliding window technique](/interview-question/what-is-the-sliding-window-technique).</span>
</div>


</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subarray** | A contiguous, non-empty slice of an array |
| **Prefix sum + hash map pattern** | Running sum plus a map of prefix counts, with a complement lookup each step |
| **Complement lookup** | Compute the partner value (\`prefix - k\`) and look it up directly |
| **Monotonic (window) property** | Window sum only grows as it widens; required by sliding windows |

---
**Conclusion:** A subarray sums to \`k\` exactly when two prefix sums differ by \`k\`, so one pass with a running sum and a \`Map\` of earlier prefix counts gives the answer in O(n) average time, negatives included. Seed the map with \`0 -> 1\`, look up before you record, and keep counts. In JavaScript, use \`Map\` rather than an object so keys stay numbers, and default \`get\` misses to 0 — and leave the sliding window for all-positive inputs, as Example 2 demonstrates.`,
        examples: [
          {
            label: "Prefix sum + hash map on seven inputs",
            code: `function subarraySum(nums, k) {
  let count = 0;
  let prefix = 0;
  const seen = new Map();     // prefix value -> how many times we have seen it
  seen.set(0, 1);             // the empty prefix: lets a subarray start at index 0
  for (const x of nums) {
    prefix += x;
    count += seen.get(prefix - k) || 0;          // get() returns undefined when absent
    seen.set(prefix, (seen.get(prefix) || 0) + 1); // record AFTER counting
  }
  return count;
}

function fmt(a) {
  return '[' + a.join(', ') + ']';
}

const tests = [[[1, 1, 1], 2], [[1, 2, 3], 3], [[1, -1, 0], 0], [[3, 4, 7, 2, -3, 1, 4, 2], 7],
  [[0, 0, 0], 0], [[5], 5], [[1, 2], 4]];
for (const [nums, k] of tests) {
  console.log(fmt(nums) + ', k=' + k + ' -> ' + subarraySum(nums, k));
}`,
          },
          {
            label: "Brute force vs hash map vs sliding window",
            code: `// Brute force O(n^2) vs prefix sum + hash map O(n), plus a sliding window
// that is only correct when every number is positive.
function brute(nums, k) {
  let count = 0;
  for (let i = 0; i < nums.length; i++) {
    let s = 0;
    for (let j = i; j < nums.length; j++) {
      s += nums[j];
      if (s === k) count++;
    }
  }
  return count;
}

function hashed(nums, k) {
  let count = 0, prefix = 0;
  const seen = new Map([[0, 1]]);
  for (const x of nums) {
    prefix += x;
    count += seen.get(prefix - k) || 0;
    seen.set(prefix, (seen.get(prefix) || 0) + 1);
  }
  return count;
}

function slidingWindow(nums, k) { // shrink while sum > k: assumes adding never lowers the sum
  let count = 0, left = 0, s = 0;
  for (let right = 0; right < nums.length; right++) {
    s += nums[right];
    while (s > k && left <= right) { s -= nums[left]; left++; }
    if (s === k) count++;
  }
  return count;
}

let seed = 7;
function nextRand() { // tiny deterministic generator, identical in every language
  seed = (seed * 75 + 74) % 65537;
  return seed;
}

for (let trial = 0; trial < 4; trial++) {
  const nums = [];
  for (let i = 0; i < 12; i++) nums.push(nextRand() % 7 - 3); // values in -3..3
  const k = nextRand() % 5 - 2;
  console.log('[' + nums.join(', ') + '], k=' + k + ': brute ' + brute(nums, k) + ', hash map ' +
    hashed(nums, k) + ', sliding window ' + slidingWindow(nums, k));
}
const pos = [1, 2, 1, 3, 1, 1, 2];
console.log('positive only [1, 2, 1, 3, 1, 1, 2], k=3: brute ' + brute(pos, 3) + ', hash map ' +
  hashed(pos, 3) + ', sliding window ' + slidingWindow(pos, 3));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"In Java, given an int array that can contain negative numbers and an int k, return how many contiguous subarrays sum to k. Aim for O(n) time."

**What a strong answer should cover:**
- Subarray sum = \`P[j] - P[i]\`; count earlier prefixes equal to \`prefix - k\`.
- A \`HashMap\` of prefix counts seeded with \`0 -> 1\`; \`getOrDefault\` and \`merge\`; count before recording.
- O(n) average time, O(n) space; brute force O(n²); a sliding window fails with negatives.
- Java specifics: the running prefix can overflow \`int\`, so use \`long\` keys; \`getOrDefault(Object, ...)\` with an \`int\` against a \`Long\` map silently misses.
- Edge cases: zeros, \`k = 0\`, subarrays from index 0.

**Clarifying questions expected:**
- "Can the array contain negatives or zeros?" — decides between a sliding window and prefix sums.
- "Do you want the count or the subarrays themselves, and how large can the sums get?"

**Code / implementation expected:** Yes — a one-pass Java method using \`HashMap\`.`,
        answer: `**Target Audience:** Intermediate candidates — you should know arrays and hash maps; prefix sums are explained here and linked.
**Difficulty:** Medium
**Language:** Java 17+

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the Java code with \`javac Main.java && java Main\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Suppose you track your bank balance every day for a month, and you want to know how many stretches of consecutive days had a net change of exactly +700. Checking every possible stretch means comparing every start day with every end day — fine for a month, painful for ten years.

Here is the shortcut. The net change over a stretch is simply "balance at the end minus balance just before the start". So a stretch ending today has a net change of +700 exactly when some earlier balance was today's balance minus 700. If you keep a notebook of every balance you have seen so far and how many times you saw it, each day you look up one number and you know immediately how many good stretches end today. One pass through the month, one lookup per day. Replace "balance" with [prefix sum](/interview-question/what-is-the-prefix-sum-technique) and "notebook" with hash map, and that is the whole algorithm.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the array contain negative numbers or zeros? | If yes, a sliding window does not work, and you need prefix sums with a hash map (Example 2 shows the window failing). |
| Do you want the count, or the subarrays themselves? | Listing them can take O(n²) output; counting is O(n). |
| Are subarrays contiguous? | Yes in this problem; non-contiguous "subsets" would be a different, much harder problem. |
| How large can the values and n be? | In Java and C++ it decides whether the running sum needs a 64-bit type. |
| Can \`k\` be 0 or negative? | It is allowed and the algorithm handles it, but it is a good test case (\`[0, 0, 0]\` with \`k = 0\` has 6 subarrays). |

## 3. The Core Idea: A Subarray Sum Is a Difference of Two Prefix Sums

Let \`P[j]\` be the sum of the first \`j\` elements, with \`P[0] = 0\`. The subarray from index \`i\` to index \`j - 1\` sums to \`P[j] - P[i]\`. So:

**the subarray ending at position \`j - 1\` sums to \`k\` exactly when an earlier prefix \`P[i]\` equals \`P[j] - k\`.**

Count how many earlier prefixes have that value, for every \`j\`, and add them up.

📌 **Interview term: Subarray** — a contiguous, non-empty slice of an array. \`[7, 2, -3, 1]\` is a subarray of \`[3, 4, 7, 2, -3, 1, 4, 2]\`; \`[3, 7]\` is not.

📌 **Interview term: Prefix sum + hash map pattern** — walk the array once with a running sum and a map from "prefix value" to "how many times it has occurred", and at each step look up the complementary prefix. The same pattern solves "longest subarray with sum k", "subarrays divisible by k" and the [Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently) family.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Prefix sums 0 3 7 14 16 13 14 18 20 for the array 3 4 7 2 -3 1 4 2. Four pairs differ by exactly 7, one for each subarray that sums to 7">
  <path class="d-edge-accent" d="M 68 110 C 68 62, 224 62, 224 110" fill="none"/>
  <path class="d-edge-accent" d="M 224 110 C 224 71, 302 71, 302 110" fill="none"/>
  <path class="d-edge-accent" d="M 224 110 C 224 44, 536 44, 536 110" fill="none"/>
  <path class="d-edge-accent" d="M 458 110 C 458 53, 692 53, 692 110" fill="none"/>
  <rect class="d-box-accent" x="40" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="68" y="140" text-anchor="middle">0</text>
  <text class="d-sub" x="68" y="186" text-anchor="middle">P0</text>
  <rect class="d-box" x="118" y="112" width="56" height="44" rx="8"/>
  <text class="d-text" x="146" y="140" text-anchor="middle">3</text>
  <text class="d-sub" x="146" y="186" text-anchor="middle">P1</text>
  <rect class="d-box-accent" x="196" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="224" y="140" text-anchor="middle">7</text>
  <text class="d-sub" x="224" y="186" text-anchor="middle">P2</text>
  <rect class="d-box-accent" x="274" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="302" y="140" text-anchor="middle">14</text>
  <text class="d-sub" x="302" y="186" text-anchor="middle">P3</text>
  <rect class="d-box" x="352" y="112" width="56" height="44" rx="8"/>
  <text class="d-text" x="380" y="140" text-anchor="middle">16</text>
  <text class="d-sub" x="380" y="186" text-anchor="middle">P4</text>
  <rect class="d-box-accent" x="430" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="458" y="140" text-anchor="middle">13</text>
  <text class="d-sub" x="458" y="186" text-anchor="middle">P5</text>
  <rect class="d-box-accent" x="508" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="536" y="140" text-anchor="middle">14</text>
  <text class="d-sub" x="536" y="186" text-anchor="middle">P6</text>
  <rect class="d-box" x="586" y="112" width="56" height="44" rx="8"/>
  <text class="d-text" x="614" y="140" text-anchor="middle">18</text>
  <text class="d-sub" x="614" y="186" text-anchor="middle">P7</text>
  <rect class="d-box-accent" x="664" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="692" y="140" text-anchor="middle">20</text>
  <text class="d-sub" x="692" y="186" text-anchor="middle">P8</text>
</svg>

For \`[3, 4, 7, 2, -3, 1, 4, 2]\` and \`k = 7\`, each arc joins two prefix sums that differ by 7. P0 and P2 give \`[3, 4]\`; P2 and P3 give \`[7]\`; P2 and P6 give \`[7, 2, -3, 1]\`; P5 and P8 give \`[1, 4, 2]\`. Four arcs, four subarrays, and the answer is 4.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 150" role="img" aria-label="One step at P3. The prefix is 14, look up 14 minus 7 which is 7, the map says 7 was seen once, so add 1 to the count, then record 14">
  <defs>
    <marker id="b06q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="80" y="70" text-anchor="middle">prefix = 14</text>
  <text class="d-sub" x="80" y="94" text-anchor="middle">after 3, 4, 7</text>
  <path class="d-edge" d="M 150 75 L 186 75" marker-end="url(#b06q5-arrow)"/>
  <rect class="d-box" x="190" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="260" y="70" text-anchor="middle">need 14 - 7</text>
  <text class="d-sub" x="260" y="94" text-anchor="middle">look up 7</text>
  <path class="d-edge" d="M 330 75 L 366 75" marker-end="url(#b06q5-arrow)"/>
  <rect class="d-box-accent" x="370" y="40" width="140" height="70" rx="10"/>
  <text class="d-text d-accent" x="440" y="70" text-anchor="middle">seen[7] = 1</text>
  <text class="d-sub" x="440" y="94" text-anchor="middle">count += 1</text>
  <path class="d-edge" d="M 510 75 L 546 75" marker-end="url(#b06q5-arrow)"/>
  <rect class="d-box" x="550" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="630" y="70" text-anchor="middle">then seen[14] += 1</text>
  <text class="d-sub" x="630" y="94" text-anchor="middle">record after counting</text>
</svg>

At each step the order is: update the prefix, look up \`prefix - k\`, add its count, and only then record the current prefix.

## 4. Three Details That Make It Correct

1. **Seed the map with prefix 0, seen once (\`0 -> 1\`).** The empty prefix \`P[0] = 0\` exists before any element. Without it, subarrays that start at index 0 (like \`[3, 4]\` above) are never counted.
2. **Count, then record.** If you recorded \`prefix\` before looking up \`prefix - k\`, then with \`k = 0\` every position would match itself and count an *empty* subarray.
3. **Store counts, not just presence.** The same prefix value can occur many times (after zeros, or after a stretch that sums to 0), and each occurrence is a different start index. \`[0, 0, 0]\` with \`k = 0\` has 6 subarrays, which only a count map gets right.

📌 **Interview term: Complement lookup** — instead of searching for a pair, compute the value its partner must have (\`prefix - k\`) and look that up directly in O(1).

## 5. Why Not Brute Force or a Sliding Window?

**Brute force** fixes a start \`i\`, extends the end \`j\` with a running sum, and counts the matches: O(n²) time, O(1) space. It is the right first thing to say, and Example 2 uses it to check the fast version.

**A sliding window** (grow the right end, shrink the left end while the sum is too big) is O(n), but it only works when every number is positive: it assumes that adding an element never lowers the sum and removing one never raises it. With negatives or zeros the assumption breaks. Example 2 shows it returning 0 where the true count is 8, 12 and 4, and agreeing only on an all-positive array. When to use a window is covered in [the sliding window technique](/interview-question/what-is-the-sliding-window-technique).

📌 **Interview term: Monotonic (window) property** — "the window sum only goes up as it grows". The sliding window needs it; prefix sums with a hash map do not.

| Method | Time | Works with negatives? |
| :--- | :--- | :--- |
| All start/end pairs, re-summing each | O(n³) | Yes |
| Brute force with a running sum | O(n²) | Yes |
| Sliding window | O(n) | No — positive values only |
| Prefix sum + hash map | O(n) average | Yes |

## 6. The Code in Java

The O(n) method from Example 1, with 64-bit prefix keys.

~~~java
static int subarraySum(int[] nums, int k) {
    int count = 0;
    long prefix = 0;                         // long: the running sum can pass 2^31 - 1
    Map<Long, Integer> seen = new HashMap<>(); // prefix value -> times seen
    seen.put(0L, 1);                         // the empty prefix (0L: a Long key, not Integer)
    for (int x : nums) {
        prefix += x;
        count += seen.getOrDefault(prefix - k, 0);
        seen.merge(prefix, 1, Integer::sum); // record AFTER counting
    }
    return count;
}
~~~

**Line by line:**

- \`long prefix\` and \`Map<Long, Integer>\` keep the running sum exact even when it passes \`Integer.MAX_VALUE\`.
- \`seen.put(0L, 1)\` must use \`0L\`. A plain \`0\` is an \`int\` and cannot be boxed to \`Long\`, so \`put(0, 1)\` does not compile.
- \`seen.getOrDefault(prefix - k, 0)\`: \`prefix - k\` is a \`long\`, so it boxes to \`Long\` and matches the keys.
- \`seen.merge(prefix, 1, Integer::sum)\` inserts 1 or adds 1 to the existing count in one call.

## 7. Java Details That Matter Here

- **Boxed key types must match.** \`Map.getOrDefault\` and \`containsKey\` take an \`Object\`, so passing an \`int\` boxes it to \`Integer\`, and an \`Integer\` never equals a \`Long\`. In a test, a \`Map<Long, Integer>\` containing \`5L\` returned \`0\` for \`getOrDefault(5, 0)\`, \`1\` for \`getOrDefault(5L, 0)\`, and \`false\` for \`containsKey(5)\`. It compiles and silently gives the wrong count.
- **\`Integer\` caching.** Comparing counts with \`==\` compares references once they leave the small cached range: \`Integer p = 128, q = 128\` gave \`p == q\` as \`false\`. Use \`equals\` or unbox.
- **When \`int\` is enough.** Example 2 uses \`int prefix\` and \`Map<Integer, Integer>\` because its values are tiny; for general inputs, \`long\` is the safe default.

## 8. Verified: Running the Code

Each example below is in the **Java code** tab on this page. They were saved as \`Main.java\` and run with \`javac Main.java && java Main\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Prefix sum + hash map on seven inputs**

~~~text
[1, 1, 1], k=2 -> 2
[1, 2, 3], k=3 -> 2
[1, -1, 0], k=0 -> 3
[3, 4, 7, 2, -3, 1, 4, 2], k=7 -> 4
[0, 0, 0], k=0 -> 6
[5], k=5 -> 1
[1, 2], k=4 -> 0
~~~

**What this shows:** Every edge case from the list below gives the expected count, including \`[0, 0, 0]\` with \`k = 0\` (6) and the worked example \`[3, 4, 7, 2, -3, 1, 4, 2]\` with \`k = 7\` (4).

**Example 2 — Brute force vs hash map vs sliding window**

~~~text
[1, 0, 3, -3, -1, -1, 2, 0, 0, -2, -3, -1], k=-1: brute 8, hash map 8, sliding window 0
[-3, -3, -1, 1, 2, -2, -2, -1, -2, 3, 1, -1], k=-2: brute 12, hash map 12, sliding window 0
[2, -2, 0, 3, -2, 3, 2, 0, -2, 0, 1, 1], k=-1: brute 3, hash map 3, sliding window 1
[2, 2, 0, 2, 0, 0, -2, -3, -2, 3, 1, 3], k=1: brute 4, hash map 4, sliding window 0
positive only [1, 2, 1, 3, 1, 1, 2], k=3: brute 4, hash map 4, sliding window 4
~~~

**What this shows:** On four arrays with values from -3 to 3 (generated by the same tiny deterministic generator in all four languages), the hash map always matches brute force, while the sliding window is wrong every time. On an all-positive array all three agree: the window is only valid when values are positive.

## 9. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (running sum) | O(n²) | O(1) | Every start index, every end index |
| Sliding window | O(n) | O(1) | Each index enters and leaves once, but only correct for positives |
| Prefix sum + hash map | O(n) average | O(n) | One pass, one lookup and one update per element; up to n + 1 distinct prefixes |

## 10. Edge Cases

- **All zeros with \`k = 0\`**: \`[0, 0, 0]\` has 6 subarrays (3 + 2 + 1), which needs counts, not a set.
- **\`k = 0\` with mixed signs**: \`[1, -1, 0]\` gives 3 (\`[1, -1]\`, \`[0]\`, \`[1, -1, 0]\`).
- **A subarray starting at index 0**: needs the seed \`0 -> 1\` (\`[1, 1, 1]\`, \`k = 2\` gives 2).
- **No match**: \`[1, 2]\` with \`k = 4\` gives 0.
- **Single element equal to \`k\`**: \`[5]\`, \`k = 5\` gives 1.
- **Large sums** in Java and C++: the running prefix can exceed 32 bits even when each element fits.

## 11. Common Pitfalls

- **\`int\` key against a \`Map<Long, ...>\`** compiles and silently never matches (\`getOrDefault(Object, V)\` takes any object).
- **\`int prefix\`** overflows silently for large inputs; use \`long\`.
- **Forgetting the \`0 -> 1\` seed** misses subarrays that start at index 0.
- **Recording before counting:** with \`k = 0\` each index matches itself.
- **A sliding window:** wrong as soon as negatives appear (Example 2).

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The key fact:</strong> <span style="color:#f0e2c8;">A subarray sum is the difference of two prefix sums, so I count earlier prefixes equal to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix - k</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The algorithm:</strong> <span style="color:#f0e2c8;">One pass: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix += x; count += seen.getOrDefault(prefix - k, 0); seen.merge(prefix, 1, Integer::sum);</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The details:</strong> <span style="color:#f0e2c8;">Seed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen.put(0L, 1)</code>, count before recording, and store counts because prefixes repeat.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n) average time, O(n) space, versus O(n²) brute force.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The Java detail:</strong> <span style="color:#f0e2c8;">I keep the prefix in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Long</code> keys, and make sure every lookup passes a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>, because an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code> key never matches a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Long</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">merge(prefix, 1, Integer::sum)</code> do?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If the key is absent it stores 1; otherwise it stores <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">old + 1</code>. It replaces the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">put</code> pair.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">getOrDefault(x, 0)</code> always return 0?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> and the keys are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Long</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> boxes to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code>, which is never equal to a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Long</code>. Make the types match.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why seed with 0?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the empty prefix before index 0, so subarrays starting at index 0 can be counted.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find the longest subarray with sum k?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store the first index of each prefix with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">putIfAbsent</code>, and track <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j - first.get(prefix - k)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you avoid boxing entirely?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with the JDK maps; for bounded prefix values you could offset them into a primitive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> count array, otherwise a primitive-collection library.</span>
</div>


</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subarray** | A contiguous, non-empty slice of an array |
| **Prefix sum + hash map pattern** | Running sum plus a map of prefix counts, with a complement lookup each step |
| **Complement lookup** | Compute the partner value (\`prefix - k\`) and look it up directly |
| **Monotonic (window) property** | Window sum only grows as it widens; required by sliding windows |

---
**Conclusion:** Two prefix sums that differ by \`k\` bound a subarray that sums to \`k\`, so a single pass with a running \`long\` prefix and a \`HashMap\` of prefix counts counts them all in O(n) average time, negatives included. Seed with \`0L -> 1\`, look up before recording, and keep counts. The Java-specific traps are about boxing: an \`int\` lookup on a \`Map<Long, Integer>\` compiles but never matches, and \`Integer\` counts must be compared with \`equals\`, not \`==\`.`,
        examples: [
          {
            label: "Prefix sum + hash map on seven inputs",
            code: `import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class Main {
    static int subarraySum(int[] nums, int k) {
        int count = 0;
        long prefix = 0;                         // long: the running sum can pass 2^31 - 1
        Map<Long, Integer> seen = new HashMap<>(); // prefix value -> times seen
        seen.put(0L, 1);                         // the empty prefix (0L: a Long key, not Integer)
        for (int x : nums) {
            prefix += x;
            count += seen.getOrDefault(prefix - k, 0);
            seen.merge(prefix, 1, Integer::sum); // record AFTER counting
        }
        return count;
    }

    public static void main(String[] args) {
        int[][] arrays = {{1, 1, 1}, {1, 2, 3}, {1, -1, 0}, {3, 4, 7, 2, -3, 1, 4, 2}, {0, 0, 0}, {5}, {1, 2}};
        int[] ks = {2, 3, 0, 7, 0, 5, 4};
        for (int t = 0; t < arrays.length; t++) {
            System.out.println(Arrays.toString(arrays[t]) + ", k=" + ks[t] + " -> " + subarraySum(arrays[t], ks[t]));
        }
    }
}`,
          },
          {
            label: "Brute force vs hash map vs sliding window",
            code: `import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class Main {
    static int brute(int[] nums, int k) {
        int count = 0;
        for (int i = 0; i < nums.length; i++) {
            int s = 0;
            for (int j = i; j < nums.length; j++) {
                s += nums[j];
                if (s == k) count++;
            }
        }
        return count;
    }

    static int hashed(int[] nums, int k) {
        int count = 0, prefix = 0;
        Map<Integer, Integer> seen = new HashMap<>();
        seen.put(0, 1);
        for (int x : nums) {
            prefix += x;
            count += seen.getOrDefault(prefix - k, 0);
            seen.merge(prefix, 1, Integer::sum);
        }
        return count;
    }

    // shrink while sum > k: assumes adding a number never lowers the sum
    static int slidingWindow(int[] nums, int k) {
        int count = 0, left = 0, s = 0;
        for (int right = 0; right < nums.length; right++) {
            s += nums[right];
            while (s > k && left <= right) { s -= nums[left]; left++; }
            if (s == k) count++;
        }
        return count;
    }

    static int seed = 7;
    static int nextRand() { // tiny deterministic generator, identical in every language
        seed = (seed * 75 + 74) % 65537;
        return seed;
    }

    public static void main(String[] args) {
        for (int trial = 0; trial < 4; trial++) {
            int[] nums = new int[12];
            for (int i = 0; i < 12; i++) nums[i] = nextRand() % 7 - 3; // values in -3..3
            int k = nextRand() % 5 - 2;
            System.out.println(Arrays.toString(nums) + ", k=" + k + ": brute " + brute(nums, k)
                + ", hash map " + hashed(nums, k) + ", sliding window " + slidingWindow(nums, k));
        }
        int[] pos = {1, 2, 1, 3, 1, 1, 2};
        System.out.println("positive only [1, 2, 1, 3, 1, 1, 2], k=3: brute " + brute(pos, 3)
            + ", hash map " + hashed(pos, 3) + ", sliding window " + slidingWindow(pos, 3));
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"In C++17, given a \`std::vector<int>\` that may contain negatives, count the contiguous subarrays whose sum is exactly k, in linear time."

**What a strong answer should cover:**
- Subarray sum = \`P[j] - P[i]\`; count earlier prefixes equal to \`prefix - k\`.
- An \`std::unordered_map<long long, int>\` of prefix counts seeded with \`{0, 1}\`; count before recording.
- O(n) average time, O(n) space; brute force O(n²); a sliding window fails with negatives.
- C++ specifics: \`operator[]\` inserts a default value on a miss, so use \`find\` for lookups; signed overflow is undefined behaviour, so use \`long long\` prefixes.
- Edge cases: zeros, \`k = 0\`, subarrays from index 0.

**Clarifying questions expected:**
- "Can the array contain negatives or zeros?" — decides between a sliding window and prefix sums.
- "Do you want the count or the subarrays themselves, and how large can the sums get?"

**Code / implementation expected:** Yes — a one-pass C++17 function using \`std::unordered_map\`.`,
        answer: `**Target Audience:** Intermediate candidates — you should know arrays and hash maps; prefix sums are explained here and linked.
**Difficulty:** Medium
**Language:** C++17

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output shown in the **Verified** section was produced by actually running the C++ code with \`g++ -std=c++17 main.cpp && ./a.out\`; nothing is quoted from memory.

## 1. Why This Even Matters — A Story First

Suppose you track your bank balance every day for a month, and you want to know how many stretches of consecutive days had a net change of exactly +700. Checking every possible stretch means comparing every start day with every end day — fine for a month, painful for ten years.

Here is the shortcut. The net change over a stretch is simply "balance at the end minus balance just before the start". So a stretch ending today has a net change of +700 exactly when some earlier balance was today's balance minus 700. If you keep a notebook of every balance you have seen so far and how many times you saw it, each day you look up one number and you know immediately how many good stretches end today. One pass through the month, one lookup per day. Replace "balance" with [prefix sum](/interview-question/what-is-the-prefix-sum-technique) and "notebook" with hash map, and that is the whole algorithm.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the array contain negative numbers or zeros? | If yes, a sliding window does not work, and you need prefix sums with a hash map (Example 2 shows the window failing). |
| Do you want the count, or the subarrays themselves? | Listing them can take O(n²) output; counting is O(n). |
| Are subarrays contiguous? | Yes in this problem; non-contiguous "subsets" would be a different, much harder problem. |
| How large can the values and n be? | In Java and C++ it decides whether the running sum needs a 64-bit type. |
| Can \`k\` be 0 or negative? | It is allowed and the algorithm handles it, but it is a good test case (\`[0, 0, 0]\` with \`k = 0\` has 6 subarrays). |

## 3. The Core Idea: A Subarray Sum Is a Difference of Two Prefix Sums

Let \`P[j]\` be the sum of the first \`j\` elements, with \`P[0] = 0\`. The subarray from index \`i\` to index \`j - 1\` sums to \`P[j] - P[i]\`. So:

**the subarray ending at position \`j - 1\` sums to \`k\` exactly when an earlier prefix \`P[i]\` equals \`P[j] - k\`.**

Count how many earlier prefixes have that value, for every \`j\`, and add them up.

📌 **Interview term: Subarray** — a contiguous, non-empty slice of an array. \`[7, 2, -3, 1]\` is a subarray of \`[3, 4, 7, 2, -3, 1, 4, 2]\`; \`[3, 7]\` is not.

📌 **Interview term: Prefix sum + hash map pattern** — walk the array once with a running sum and a map from "prefix value" to "how many times it has occurred", and at each step look up the complementary prefix. The same pattern solves "longest subarray with sum k", "subarrays divisible by k" and the [Two Sum](/interview-question/how-do-you-solve-the-two-sum-problem-efficiently) family.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Prefix sums 0 3 7 14 16 13 14 18 20 for the array 3 4 7 2 -3 1 4 2. Four pairs differ by exactly 7, one for each subarray that sums to 7">
  <path class="d-edge-accent" d="M 68 110 C 68 62, 224 62, 224 110" fill="none"/>
  <path class="d-edge-accent" d="M 224 110 C 224 71, 302 71, 302 110" fill="none"/>
  <path class="d-edge-accent" d="M 224 110 C 224 44, 536 44, 536 110" fill="none"/>
  <path class="d-edge-accent" d="M 458 110 C 458 53, 692 53, 692 110" fill="none"/>
  <rect class="d-box-accent" x="40" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="68" y="140" text-anchor="middle">0</text>
  <text class="d-sub" x="68" y="186" text-anchor="middle">P0</text>
  <rect class="d-box" x="118" y="112" width="56" height="44" rx="8"/>
  <text class="d-text" x="146" y="140" text-anchor="middle">3</text>
  <text class="d-sub" x="146" y="186" text-anchor="middle">P1</text>
  <rect class="d-box-accent" x="196" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="224" y="140" text-anchor="middle">7</text>
  <text class="d-sub" x="224" y="186" text-anchor="middle">P2</text>
  <rect class="d-box-accent" x="274" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="302" y="140" text-anchor="middle">14</text>
  <text class="d-sub" x="302" y="186" text-anchor="middle">P3</text>
  <rect class="d-box" x="352" y="112" width="56" height="44" rx="8"/>
  <text class="d-text" x="380" y="140" text-anchor="middle">16</text>
  <text class="d-sub" x="380" y="186" text-anchor="middle">P4</text>
  <rect class="d-box-accent" x="430" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="458" y="140" text-anchor="middle">13</text>
  <text class="d-sub" x="458" y="186" text-anchor="middle">P5</text>
  <rect class="d-box-accent" x="508" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="536" y="140" text-anchor="middle">14</text>
  <text class="d-sub" x="536" y="186" text-anchor="middle">P6</text>
  <rect class="d-box" x="586" y="112" width="56" height="44" rx="8"/>
  <text class="d-text" x="614" y="140" text-anchor="middle">18</text>
  <text class="d-sub" x="614" y="186" text-anchor="middle">P7</text>
  <rect class="d-box-accent" x="664" y="112" width="56" height="44" rx="8"/>
  <text class="d-text d-accent" x="692" y="140" text-anchor="middle">20</text>
  <text class="d-sub" x="692" y="186" text-anchor="middle">P8</text>
</svg>

For \`[3, 4, 7, 2, -3, 1, 4, 2]\` and \`k = 7\`, each arc joins two prefix sums that differ by 7. P0 and P2 give \`[3, 4]\`; P2 and P3 give \`[7]\`; P2 and P6 give \`[7, 2, -3, 1]\`; P5 and P8 give \`[1, 4, 2]\`. Four arcs, four subarrays, and the answer is 4.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 150" role="img" aria-label="One step at P3. The prefix is 14, look up 14 minus 7 which is 7, the map says 7 was seen once, so add 1 to the count, then record 14">
  <defs>
    <marker id="b06q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="80" y="70" text-anchor="middle">prefix = 14</text>
  <text class="d-sub" x="80" y="94" text-anchor="middle">after 3, 4, 7</text>
  <path class="d-edge" d="M 150 75 L 186 75" marker-end="url(#b06q5-arrow)"/>
  <rect class="d-box" x="190" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="260" y="70" text-anchor="middle">need 14 - 7</text>
  <text class="d-sub" x="260" y="94" text-anchor="middle">look up 7</text>
  <path class="d-edge" d="M 330 75 L 366 75" marker-end="url(#b06q5-arrow)"/>
  <rect class="d-box-accent" x="370" y="40" width="140" height="70" rx="10"/>
  <text class="d-text d-accent" x="440" y="70" text-anchor="middle">seen[7] = 1</text>
  <text class="d-sub" x="440" y="94" text-anchor="middle">count += 1</text>
  <path class="d-edge" d="M 510 75 L 546 75" marker-end="url(#b06q5-arrow)"/>
  <rect class="d-box" x="550" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="630" y="70" text-anchor="middle">then seen[14] += 1</text>
  <text class="d-sub" x="630" y="94" text-anchor="middle">record after counting</text>
</svg>

At each step the order is: update the prefix, look up \`prefix - k\`, add its count, and only then record the current prefix.

## 4. Three Details That Make It Correct

1. **Seed the map with prefix 0, seen once (\`0 -> 1\`).** The empty prefix \`P[0] = 0\` exists before any element. Without it, subarrays that start at index 0 (like \`[3, 4]\` above) are never counted.
2. **Count, then record.** If you recorded \`prefix\` before looking up \`prefix - k\`, then with \`k = 0\` every position would match itself and count an *empty* subarray.
3. **Store counts, not just presence.** The same prefix value can occur many times (after zeros, or after a stretch that sums to 0), and each occurrence is a different start index. \`[0, 0, 0]\` with \`k = 0\` has 6 subarrays, which only a count map gets right.

📌 **Interview term: Complement lookup** — instead of searching for a pair, compute the value its partner must have (\`prefix - k\`) and look that up directly in O(1).

## 5. Why Not Brute Force or a Sliding Window?

**Brute force** fixes a start \`i\`, extends the end \`j\` with a running sum, and counts the matches: O(n²) time, O(1) space. It is the right first thing to say, and Example 2 uses it to check the fast version.

**A sliding window** (grow the right end, shrink the left end while the sum is too big) is O(n), but it only works when every number is positive: it assumes that adding an element never lowers the sum and removing one never raises it. With negatives or zeros the assumption breaks. Example 2 shows it returning 0 where the true count is 8, 12 and 4, and agreeing only on an all-positive array. When to use a window is covered in [the sliding window technique](/interview-question/what-is-the-sliding-window-technique).

📌 **Interview term: Monotonic (window) property** — "the window sum only goes up as it grows". The sliding window needs it; prefix sums with a hash map do not.

| Method | Time | Works with negatives? |
| :--- | :--- | :--- |
| All start/end pairs, re-summing each | O(n³) | Yes |
| Brute force with a running sum | O(n²) | Yes |
| Sliding window | O(n) | No — positive values only |
| Prefix sum + hash map | O(n) average | Yes |

## 6. The Code in C++

The O(n) function from Example 1.

~~~cpp
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>

int subarraySum(const std::vector<int>& nums, int k) {
    int count = 0;
    long long prefix = 0;                         // 64-bit: int overflow would be UB
    std::unordered_map<long long, int> seen;      // prefix value -> times seen
    seen[0] = 1;                                  // the empty prefix
    for (int x : nums) {
        prefix += x;
        auto it = seen.find(prefix - k);          // find() does not insert; seen[key] would
        if (it != seen.end()) count += it->second;
        seen[prefix]++;                           // record AFTER counting
    }
    return count;
}
~~~

**Line by line:**

- \`long long prefix\` keeps the running sum safe from overflow, and the map key type matches it.
- \`seen.find(prefix - k)\` looks up without inserting; \`it->second\` is the count.
- \`seen[prefix]++\` is the right place for \`operator[]\`: here inserting a 0 and incrementing it is exactly what we want.

## 7. C++ Details That Matter Here

- **\`operator[]\` inserts.** Reading \`m[42]\` on an empty \`unordered_map<int, int>\` returned 0 *and* left \`m.size() == 1\`; \`m.count(7)\` did not change the size. Using \`seen[prefix - k]\` for the lookup is still correct (the inserted value is 0), but it adds an entry for every miss, growing the map and causing rehashes.
- **Signed overflow is undefined behaviour,** so an \`int\` prefix on large inputs is not merely wrong. \`long long\` is the safe choice.
- **\`reserve(nums.size() + 1)\`** sizes the map up front, since there are at most n + 1 distinct prefixes.
- **Structured bindings** (\`for (const auto& [nums, k] : tests)\`) are C++17 and keep the test loop readable.

## 8. Verified: Running the Code

Each example below is in the **C++ code** tab on this page. They were saved as \`main.cpp\` and run with \`g++ -std=c++17 main.cpp && ./a.out\`; the blocks are the exact stdout. The Python, JavaScript, Java and C++ versions of each example print identical output.

**Example 1 — Prefix sum + hash map on seven inputs**

~~~text
[1, 1, 1], k=2 -> 2
[1, 2, 3], k=3 -> 2
[1, -1, 0], k=0 -> 3
[3, 4, 7, 2, -3, 1, 4, 2], k=7 -> 4
[0, 0, 0], k=0 -> 6
[5], k=5 -> 1
[1, 2], k=4 -> 0
~~~

**What this shows:** Every edge case from the list below gives the expected count, including \`[0, 0, 0]\` with \`k = 0\` (6) and the worked example \`[3, 4, 7, 2, -3, 1, 4, 2]\` with \`k = 7\` (4).

**Example 2 — Brute force vs hash map vs sliding window**

~~~text
[1, 0, 3, -3, -1, -1, 2, 0, 0, -2, -3, -1], k=-1: brute 8, hash map 8, sliding window 0
[-3, -3, -1, 1, 2, -2, -2, -1, -2, 3, 1, -1], k=-2: brute 12, hash map 12, sliding window 0
[2, -2, 0, 3, -2, 3, 2, 0, -2, 0, 1, 1], k=-1: brute 3, hash map 3, sliding window 1
[2, 2, 0, 2, 0, 0, -2, -3, -2, 3, 1, 3], k=1: brute 4, hash map 4, sliding window 0
positive only [1, 2, 1, 3, 1, 1, 2], k=3: brute 4, hash map 4, sliding window 4
~~~

**What this shows:** On four arrays with values from -3 to 3 (generated by the same tiny deterministic generator in all four languages), the hash map always matches brute force, while the sliding window is wrong every time. On an all-positive array all three agree: the window is only valid when values are positive.

## 9. Complexity

| Approach | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (running sum) | O(n²) | O(1) | Every start index, every end index |
| Sliding window | O(n) | O(1) | Each index enters and leaves once, but only correct for positives |
| Prefix sum + hash map | O(n) average | O(n) | One pass, one lookup and one update per element; up to n + 1 distinct prefixes |

## 10. Edge Cases

- **All zeros with \`k = 0\`**: \`[0, 0, 0]\` has 6 subarrays (3 + 2 + 1), which needs counts, not a set.
- **\`k = 0\` with mixed signs**: \`[1, -1, 0]\` gives 3 (\`[1, -1]\`, \`[0]\`, \`[1, -1, 0]\`).
- **A subarray starting at index 0**: needs the seed \`0 -> 1\` (\`[1, 1, 1]\`, \`k = 2\` gives 2).
- **No match**: \`[1, 2]\` with \`k = 4\` gives 0.
- **Single element equal to \`k\`**: \`[5]\`, \`k = 5\` gives 1.
- **Large sums** in Java and C++: the running prefix can exceed 32 bits even when each element fits.

## 11. Common Pitfalls

- **\`count += seen[prefix - k];\`** inserts a key on every miss; use \`find\`.
- **\`int prefix\`** on large inputs is undefined behaviour on overflow; use \`long long\`.
- **Forgetting the \`{0, 1}\` seed** misses subarrays starting at index 0.
- **Recording before counting:** with \`k = 0\` each index matches itself.
- **A sliding window:** wrong as soon as negatives appear (Example 2).

## 12. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The key fact:</strong> <span style="color:#f0e2c8;">A subarray sum is the difference of two prefix sums, so I count earlier prefixes equal to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix - k</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The algorithm:</strong> <span style="color:#f0e2c8;">One pass with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long prefix</code> and an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_map</code> of counts: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find(prefix - k)</code>, add its count, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seen[prefix]++</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The details:</strong> <span style="color:#f0e2c8;">Seed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{0, 1}</code>, count before recording, and store counts because prefixes repeat.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost:</strong> <span style="color:#f0e2c8;">O(n) average time, O(n) space, versus O(n²) brute force.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">operator[]</code> inserts on a miss, so lookups use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code>; prefixes are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> because signed overflow is undefined behaviour.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is wrong with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">seen[prefix - k]</code> for the lookup?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It inserts a zero entry for every miss. The count stays correct, but the map grows and rehashes needlessly; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> do not insert.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why seed with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">{0, 1}</code>?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the empty prefix before index 0, so subarrays that start at index 0 can be counted.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the worst case of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unordered_map</code>?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With heavy collisions a lookup degrades to linear in the bucket size, so O(n) is an average bound; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::map</code> gives guaranteed O(log n) per operation, O(n log n) overall.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you find the longest such subarray?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store the first index of each prefix (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emplace</code> does not overwrite) and track <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">j - first[prefix - k]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about subarrays divisible by k?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Key by remainder, normalised because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">%</code> can be negative in C++: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">((prefix % k) + k) % k</code>.</span>
</div>


</div>

## 13. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Subarray** | A contiguous, non-empty slice of an array |
| **Prefix sum + hash map pattern** | Running sum plus a map of prefix counts, with a complement lookup each step |
| **Complement lookup** | Compute the partner value (\`prefix - k\`) and look it up directly |
| **Monotonic (window) property** | Window sum only grows as it widens; required by sliding windows |

---
**Conclusion:** A subarray sums to \`k\` exactly when two prefix sums differ by \`k\`, so one pass with a running sum and an \`unordered_map\` of earlier prefix counts solves the problem in O(n) average time, negatives included — where a sliding window fails, as Example 2 shows. Seed with \`{0, 1}\`, look up before recording, and keep counts. In C++, use \`long long\` for the prefix and \`find\` for lookups, because \`operator[]\` inserts on every miss.`,
        examples: [
          {
            label: "Prefix sum + hash map on seven inputs",
            code: `#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>

int subarraySum(const std::vector<int>& nums, int k) {
    int count = 0;
    long long prefix = 0;                         // 64-bit: int overflow would be UB
    std::unordered_map<long long, int> seen;      // prefix value -> times seen
    seen[0] = 1;                                  // the empty prefix
    for (int x : nums) {
        prefix += x;
        auto it = seen.find(prefix - k);          // find() does not insert; seen[key] would
        if (it != seen.end()) count += it->second;
        seen[prefix]++;                           // record AFTER counting
    }
    return count;
}

std::string fmt(const std::vector<int>& a) {
    std::string s = "[";
    for (size_t i = 0; i < a.size(); i++) {
        if (i > 0) s += ", ";
        s += std::to_string(a[i]);
    }
    return s + "]";
}

int main() {
    std::vector<std::pair<std::vector<int>, int>> tests = {
        {{1, 1, 1}, 2}, {{1, 2, 3}, 3}, {{1, -1, 0}, 0}, {{3, 4, 7, 2, -3, 1, 4, 2}, 7},
        {{0, 0, 0}, 0}, {{5}, 5}, {{1, 2}, 4}};
    for (const auto& [nums, k] : tests) {
        std::cout << fmt(nums) << ", k=" << k << " -> " << subarraySum(nums, k) << "\\n";
    }
    return 0;
}`,
          },
          {
            label: "Brute force vs hash map vs sliding window",
            code: `#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>

int brute(const std::vector<int>& nums, int k) {
    int count = 0;
    for (size_t i = 0; i < nums.size(); i++) {
        int s = 0;
        for (size_t j = i; j < nums.size(); j++) {
            s += nums[j];
            if (s == k) count++;
        }
    }
    return count;
}

int hashed(const std::vector<int>& nums, int k) {
    int count = 0;
    long long prefix = 0;
    std::unordered_map<long long, int> seen{{0, 1}};
    for (int x : nums) {
        prefix += x;
        auto it = seen.find(prefix - k);
        if (it != seen.end()) count += it->second;
        seen[prefix]++;
    }
    return count;
}

// shrink while sum > k: assumes adding a number never lowers the sum
int slidingWindow(const std::vector<int>& nums, int k) {
    int count = 0, left = 0, s = 0;
    for (int right = 0; right < static_cast<int>(nums.size()); right++) {
        s += nums[right];
        while (s > k && left <= right) { s -= nums[left]; left++; }
        if (s == k) count++;
    }
    return count;
}

int seed = 7;
int nextRand() {  // tiny deterministic generator, identical in every language
    seed = (seed * 75 + 74) % 65537;
    return seed;
}

std::string fmt(const std::vector<int>& a) {
    std::string s = "[";
    for (size_t i = 0; i < a.size(); i++) {
        if (i > 0) s += ", ";
        s += std::to_string(a[i]);
    }
    return s + "]";
}

int main() {
    for (int trial = 0; trial < 4; trial++) {
        std::vector<int> nums;
        for (int i = 0; i < 12; i++) nums.push_back(nextRand() % 7 - 3);  // values in -3..3
        int k = nextRand() % 5 - 2;
        std::cout << fmt(nums) << ", k=" << k << ": brute " << brute(nums, k) << ", hash map "
                  << hashed(nums, k) << ", sliding window " << slidingWindow(nums, k) << "\\n";
    }
    std::vector<int> pos = {1, 2, 1, 3, 1, 1, 2};
    std::cout << "positive only [1, 2, 1, 3, 1, 1, 2], k=3: brute " << brute(pos, 3) << ", hash map "
              << hashed(pos, 3) << ", sliding window " << slidingWindow(pos, 3) << "\\n";
    return 0;
}`,
          },
        ],
      },
    },
  },
];

export default augments;
