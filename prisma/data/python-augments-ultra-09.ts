/**
 * PYTHON ULTRA — batch 09: stdlib II: numbers, dates, text. Every example was
 * run on python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts (the one runnable: false example, which
 * needs the IANA time zone database, on python3.12); quoted output is that
 * run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  {
    title: `Why does 0.1 + 0.2 != 0.3 in Python, and when do you use Decimal or Fraction?`,
    difficulty: "medium",
    seoDescription: `Why 0.1 + 0.2 is 0.30000000000000004 in Python: IEEE 754 binary floats, math.isclose, and when to use Decimal for money or Fraction for exact ratios.`,
    description: `**Question presented to candidate:**
"If I type \`0.1 + 0.2 == 0.3\` into Python I get \`False\`. Why does that happen, how should I compare floats, and when would you reach for \`decimal.Decimal\` or \`fractions.Fraction\` instead of \`float\`?"

**What a strong answer should cover:**
- A Python \`float\` is a 64-bit IEEE 754 binary double (53 bits of precision, \`sys.float_info.mant_dig == 53\`); 0.1, 0.2 and 0.3 have no exact binary form, so each literal is stored as the nearest binary fraction and the sum lands on a different neighbour than 0.3
- \`repr()\` prints the shortest string that round-trips, which is why \`0.1\` looks exact but \`Decimal(0.1)\` or \`(0.1).as_integer_ratio()\` reveals the real stored value
- Compare with a tolerance (\`math.isclose\`, with \`abs_tol\` near zero), sum with \`math.fsum\`, and know that \`round()\` uses round-half-to-even on the stored binary value (\`round(2.675, 2)\` is \`2.67\`)
- \`Decimal\` does base-10 arithmetic with a configurable context (28 significant digits by default, explicit rounding modes, \`quantize\` for cents): the right tool for money, and it must be built from strings or ints, not floats
- \`Fraction\` stores an exact numerator/denominator pair: exact for rational maths, but slower and its denominators can grow without bound
- Trade-offs: \`float\` is hardware-fast and right for science and measurement; \`Decimal\` and \`Fraction\` refuse or downgrade when mixed with floats

**Code / implementation expected:** Optional — show the stored value of 0.1, a tolerant comparison, and a money calculation with \`Decimal\` and \`quantize\`.`,
    answer: `**Target Audience:** Python developers who have been surprised by a float result and want to know exactly why, and which numeric type to use instead
**Difficulty:** Medium
**Python version:** Checked on CPython 3.11 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Try writing one third as a decimal on paper: \`0.3333...\`. However many 3s you write, you have to stop somewhere, and the number on the paper is a tiny bit less than a third. Add three of your rounded thirds and you get \`0.9999\`, not \`1\`. Nothing is broken; you simply cannot write 1/3 exactly with a finite number of decimal digits.

A computer has the same problem, but it counts in **base 2** instead of base 10. In base 2, one tenth is like one third is for us: it goes on forever (\`0.000110011001100...\`). Python has to stop after 53 binary digits, so the \`0.1\` you typed is stored as a number that is very slightly more than one tenth. The same happens to \`0.2\` and \`0.3\`. When you add the two rounded numbers, the result is rounded again, and it lands on a slightly different number than the rounded \`0.3\`. That is the whole story behind \`0.1 + 0.2 != 0.3\`.

It matters in interviews because it tests whether you know what a \`float\` actually is, and in real work because rounding errors in money are bugs that customers notice.

## 2. What a Python float Is

📌 **Interview term: IEEE 754 double precision (binary64)** — the hardware number format Python's \`float\` uses on practically every platform: 1 sign bit, 11 exponent bits and 52 stored fraction bits, giving 53 bits of precision. Python reports this in \`sys.float_info\`; on our run \`sys.float_info.mant_dig\` was \`53\` and \`sys.float_info.dig\` (decimal digits that always survive a round trip) was \`15\`.

📌 **Interview term: representation error** — the difference between the number you wrote and the nearest number the format can store. Any fraction whose denominator is not a power of two (1/10, 1/5, 1/3) has a representation error in binary.

You can see the stored value directly. \`Decimal(0.1)\` converts the float exactly, digit for digit, and \`as_integer_ratio()\` gives the exact fraction:

~~~python
from decimal import Decimal
print(Decimal(0.1))
# 0.1000000000000000055511151231257827021181583404541015625
print((0.1).as_integer_ratio())
# (3602879701896397, 36028797018963968)   the denominator is 2**55
print((0.1).hex())
# 0x1.999999999999ap-4                    the repeating binary 1001 1001 ... rounded up
~~~

So \`0.1\` is stored as 3602879701896397 / 2^55, which is about 5.55e-18 too big.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Pipeline: the literal 0.1 is rounded to the nearest binary double, the addition is rounded again, and repr prints the shortest string that maps back to the result">
  <defs>
    <marker id="fl1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="180" height="80" rx="8"/>
  <text class="d-text" x="110" y="92" text-anchor="middle">you type 0.1</text>
  <text class="d-sub" x="110" y="116" text-anchor="middle">a decimal literal</text>
  <rect class="d-box-accent" x="270" y="60" width="180" height="80" rx="8"/>
  <text class="d-text" x="360" y="92" text-anchor="middle">nearest double</text>
  <text class="d-sub" x="360" y="116" text-anchor="middle">rounding error 1</text>
  <rect class="d-box" x="520" y="60" width="180" height="80" rx="8"/>
  <text class="d-text" x="610" y="92" text-anchor="middle">a + b rounded</text>
  <text class="d-sub" x="610" y="116" text-anchor="middle">rounding error 2</text>
  <path class="d-edge" d="M 200 100 L 264 100" marker-end="url(#fl1-arrow)"/>
  <path class="d-edge" d="M 450 100 L 514 100" marker-end="url(#fl1-arrow)"/>
</svg>

There are two rounding steps: once when each literal becomes a float, and once when the hardware rounds the exact sum of the two stored values to the nearest double.

## 3. Why the Sum Misses 0.3 by Exactly One Step

Doubles near 0.3 are spaced \`math.ulp(0.3)\` = about \`5.55e-17\` apart. On our run:

| Value | Exact stored value |
| :--- | :--- |
| \`0.3\` | 0.299999999999999988897769753748434595763683319091796875 |
| \`0.1 + 0.2\` | 0.3000000000000000444089209850062616169452667236328125 |

Both 0.1 and 0.2 were rounded **up** when stored, so their exact sum is a little above 0.3, and it rounds to the double just above the one that holds \`0.3\`. \`math.nextafter(0.3, 1)\` prints \`0.30000000000000004\`, the same number as \`0.1 + 0.2\`: they are neighbours, one representable step apart.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 210" role="img" aria-label="Number line near 0.3 with two neighbouring doubles: the stored 0.3 just below three tenths and the result of 0.1 plus 0.2 one step above it">
  <path class="d-edge" d="M 40 110 L 680 110"/>
  <circle class="d-box-accent" cx="220" cy="110" r="9"/>
  <circle class="d-box" cx="360" cy="110" r="5"/>
  <circle class="d-box-accent" cx="500" cy="110" r="9"/>
  <text class="d-text" x="220" y="60" text-anchor="middle">stored 0.3</text>
  <text class="d-sub" x="220" y="160" text-anchor="middle">0.29999999999999998890</text>
  <text class="d-text" x="360" y="60" text-anchor="middle">true 3/10</text>
  <text class="d-text" x="500" y="60" text-anchor="middle">0.1 + 0.2</text>
  <text class="d-sub" x="500" y="160" text-anchor="middle">0.30000000000000004441</text>
</svg>

True three tenths sits between two doubles; \`0.3\` rounds to the lower one, while the sum of the stored 0.1 and 0.2 rounds to the upper one.

📌 **Interview term: ULP (unit in the last place)** — the gap between a float and the next representable float. \`math.ulp(x)\` returns it. Results that differ by one ULP are as close as two different floats can be.

### Why \`0.1\` prints as \`0.1\`

📌 **Interview term: shortest round-trip repr** — \`repr(x)\` prints the shortest decimal string that converts back to exactly the same float. \`0.1\` is the shortest string for the stored value of \`0.1\`, so you never see its tail. The sum is a different double, and the shortest string for it is \`0.30000000000000004\`. In Example 1, \`float("0.30000000000000004") == 0.1 + 0.2\` is \`True\`.

### A CPython detail: the compiler does the addition

CPython folds constant expressions at compile time. \`dis.dis("0.1+0.2")\` on 3.11 shows no addition at all:

~~~text
  0           0 RESUME                   0

  1           2 LOAD_CONST               0 (0.30000000000000004)
              4 RETURN_VALUE
~~~

The compiler computed the same IEEE 754 sum ahead of time and stored the result as a constant, so the answer is identical whether the addition happens at compile time or at run time.

## 4. Living With float: Compare, Sum and Round Correctly

**Never use \`==\` on computed floats.** Use a tolerance:

📌 **Interview term: \`math.isclose\`** — with the signature \`math.isclose(a, b, *, rel_tol=1e-09, abs_tol=0.0)\` (the tolerances are keyword-only), true when the two values are within a *relative* tolerance of each other. It was added in Python 3.5 by [PEP 485](https://peps.python.org/pep-0485/). Because the default tolerance is relative, comparing with zero always fails unless you pass \`abs_tol\`: \`math.isclose(1e-12, 0.0)\` is \`False\`, \`math.isclose(1e-12, 0.0, abs_tol=1e-9)\` is \`True\`.

**Sum many floats with \`math.fsum\`.** Adding \`0.1\` ten times in a loop gives \`0.9999999999999999\`, because each \`+=\` rounds. \`math.fsum\` tracks the lost low-order bits and returns the correctly rounded total, \`1.0\`.

**Know what \`round()\` does.**

📌 **Interview term: banker's rounding (round half to even)** — when a value is exactly halfway, round to the even neighbour. \`round(0.5)\`, \`round(1.5)\`, \`round(2.5)\` give \`0 2 2\`. It avoids the upward bias of always rounding halves up.

And \`round()\` sees the *stored* value: \`round(2.675, 2)\` gives \`2.67\`, because the stored 2.675 is really \`2.67499999999999982236431605997495353221893310546875\`, which is below the halfway point. This is not a bug in \`round\`; it is representation error again.

**Big numbers lose small ones.** With 53 bits, every integer up to 2^53 is exact, but \`2.0**53 + 1 == 2.0**53\` is \`True\` and \`1e16 + 1 - 1e16\` is \`0.0\`. Use \`int\` (unlimited precision) for large counters and IDs.

**\`nan\` is not equal to itself.** \`float("nan") == float("nan")\` is \`False\`; test with \`math.isnan\`.

## 5. Decimal: Base-10 Arithmetic for Money

📌 **Interview term: \`decimal.Decimal\`** — a decimal floating-point type from the standard library that stores digits in base 10, so \`Decimal("0.1")\` is exactly one tenth. It lets you choose precision and rounding. CPython ships a C implementation of it (the \`_decimal\` module, which imports on 3.11 and in Pyodide), so it is much faster than a pure-Python version would be.

~~~python
from decimal import Decimal, ROUND_HALF_UP
print(Decimal("0.1") + Decimal("0.2") == Decimal("0.3"))   # True
print(Decimal("1.10") + Decimal("2.20"))                    # 3.30  (keeps the trailing zero)
print(Decimal("2.665").quantize(Decimal("0.01")))           # 2.66  default ROUND_HALF_EVEN
print(Decimal("2.665").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))   # 2.67
~~~

Key rules:

- **Build from strings or ints, never from floats.** \`Decimal(0.1)\` faithfully copies the float error; \`Decimal(0.1) + Decimal(0.2)\` gave \`0.3000000000000000166533453694\` on our run.
- **Decimal still rounds**, just in base 10. 📌 **Interview term: context** — the settings object (\`decimal.getcontext()\`) that holds the precision (28 significant digits by default), the rounding mode and which conditions raise. \`Decimal(1) / Decimal(3)\` gives 28 threes. Change it temporarily with \`localcontext()\`.
- **\`quantize\` fixes the number of decimal places** with an explicit rounding mode; that is how you round to cents. Choose the mode your accounting rules require (\`ROUND_HALF_UP\`, \`ROUND_HALF_EVEN\`, ...).
- **Mixing with float raises \`TypeError\`**, which is a feature: you cannot accidentally reintroduce binary error. Mixing with \`int\` is fine.
- **Splitting totals:** dividing 100.00 by 3 and quantizing gives 33.33 three times, which loses a cent. Give the remainder to the last share (Example 2 prints \`33.33, 33.33, 33.34\`).

## 6. Fraction: Exact Rational Numbers

📌 **Interview term: \`fractions.Fraction\`** — a number stored as an exact integer numerator and denominator, always reduced (\`Fraction(6, 4)\` is \`3/2\`). Addition, multiplication and division of fractions never round.

~~~python
from fractions import Fraction
third = Fraction(1, 3)
print(third + third + third == 1)                 # True
print(Fraction("0.1"), Fraction(0.1))             # 1/10 3602879701896397/36028797018963968
print(Fraction(0.1).limit_denominator(1000))      # 1/10
~~~

- \`Fraction(0.1)\` shows the float's exact value as a ratio; \`Fraction("0.1")\` is one tenth.
- \`limit_denominator(n)\` finds the closest fraction with a denominator up to \`n\`, a handy way to recover "nice" ratios from floats.
- A \`Fraction\` mixed with a \`float\` returns a \`float\` (exactness is silently lost); mixed with an \`int\` it stays a \`Fraction\`.
- Cost: numerators and denominators are Python \`int\`s that can grow large in long computations, and every operation computes a GCD. On our machine \`a*b+a\` took about 19 ns with floats, 72 ns with \`Decimal\` and 1.7 µs with \`Fraction\` (\`timeit\`, python3.11; timings vary by machine).

## 7. Which Type When

| Need | Use | Why |
| :--- | :--- | :--- |
| Measurements, science, graphics, ML | \`float\` | hardware speed; inputs are approximate anyway |
| Money, prices, tax, invoices | \`Decimal\` (from strings) | exact decimal digits, explicit rounding rules |
| Exact ratios (probabilities, music intervals, symbolic maths) | \`Fraction\` | no rounding at all |
| Large whole numbers, counts, IDs, cents | \`int\` | unlimited precision, exact; store money as integer cents if you like |

| Property | \`float\` | \`Decimal\` | \`Fraction\` |
| :--- | :--- | :--- | :--- |
| Base | 2 | 10 | rational |
| \`0.1 + 0.2 == 0.3\` | \`False\` | \`True\` (from strings) | \`True\` |
| \`1/3\` exact | no | no (28 digits) | yes |
| Rounding control | \`round()\` only | context + \`quantize\` | none needed |
| Speed (our run) | ~19 ns | ~72 ns | ~1.7 µs |
| Mix with \`float\` | — | \`TypeError\` | becomes \`float\` |

## 8. Verified: Running the Code

Both examples were run with \`python3.11 main.py\` and again in this page (Pyodide 0.25.1), with identical output.

**Example 1 — what a float really stores** prints:

~~~text
0.30000000000000004
False
0.1000000000000000055511151231257827021181583404541015625
(3602879701896397, 36028797018963968)
0x1.999999999999ap-4
0.3 0.30000000000000004
True
0.9999999999999999 False
1.0
True
False
True
2.67 2.67499999999999982236431605997495353221893310546875
0 2 2
True
9007199254740992.0
0.0
False True
True inf
~~~

**Example 2 — Decimal for money and Fraction for exact ratios** prints:

~~~text
0.3
True
0.3000000000000000166533453694
3.30
59.97
2.68
2.66
2.67
28
0.3333333333333333333333333333
prec 5: 0.33333
TypeError: unsupported operand type(s) for +: 'decimal.Decimal' and 'float'
2.5
InvalidOperation for Decimal('abc')
True
3/10
1/10 3602879701896397/36028797018963968
1/10
3/2 3 2
float Fraction
[Decimal('33.33'), Decimal('33.33'), Decimal('33.34')] 100.00
~~~

**What the output shows:** the stored 0.1 is slightly more than a tenth; the repeated \`+=\` drifts to \`0.9999999999999999\` while \`fsum\` returns \`1.0\`; \`isclose\` needs \`abs_tol\` near zero; \`round(2.675, 2)\` is \`2.67\` because of the stored value. In the second program, string-built \`Decimal\`s add exactly, float-built ones carry the error, \`quantize\` rounds with the mode you choose, mixing with float raises, and \`Fraction\` arithmetic is exact until a float joins in.

## Common Pitfalls

- **\`Decimal(0.1)\` instead of \`Decimal("0.1")\`.** The float is converted exactly, error included. Read prices from strings, JSON (\`json.loads(s, parse_float=Decimal)\`) or database decimal columns.
- **\`abs(a - b) < 1e-9\` for every scale.** A fixed absolute tolerance is too strict for large numbers and too loose for tiny ones; \`math.isclose\` uses a relative tolerance and lets you add an absolute one.
- **Expecting \`round()\` to round halves up.** It rounds half to even, and on floats it works on the stored binary value. For money, use \`Decimal.quantize\` with an explicit rounding mode.
- **Using \`float\` as a dict key or for equality after arithmetic.** \`0.1 + 0.2\` and \`0.3\` are different keys.
- **Mixing \`Fraction\` with \`float\`.** The result is a plain float, and the exactness you paid for is gone without any warning.
- **Assuming \`Decimal\` never rounds.** Division and very long results are rounded to the context precision; set the precision and rounding you need.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The cause:</strong> <span style="color:#f0e2c8;">Python's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float</code> is an IEEE 754 binary double with 53 bits of precision. One tenth is a repeating fraction in binary, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.1</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.2</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.3</code> are each stored as the nearest double, and the rounded sum lands one step above the stored <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.3</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it looks fine:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">repr</code> prints the shortest string that round-trips, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.1</code> prints as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.1</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Decimal(0.1)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(0.1).as&#95;integer&#95;ratio()</code> shows the real stored value.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Working with floats:</strong> <span style="color:#f0e2c8;">Compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">math.isclose</code> (add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abs&#95;tol</code> near zero), sum with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">math.fsum</code>, and remember <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">round()</code> is round-half-to-even on the stored value.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Decimal:</strong> <span style="color:#f0e2c8;">For money use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Decimal</code> built from strings: exact base-10 digits, a context with 28 digits by default, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">quantize</code> with an explicit rounding mode for cents. Mixing with float raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Fraction:</strong> <span style="color:#f0e2c8;">For exact ratios use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Fraction</code>: never rounds, but slower and denominators can grow; mixing with a float gives a float.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is this a Python bug?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Any language using IEEE 754 doubles gives the same result; JavaScript prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.30000000000000004</code> too. Python only chooses how to print it, and its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">repr</code> prints the shortest string that converts back to the same double.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">round(2.675, 2)</code> give <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">2.67</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The literal 2.675 is stored as 2.67499999999999982..., which is below the halfway point, so it rounds down. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Decimal("2.675").quantize(Decimal("0.01"))</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2.68</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just store money as a float and round at the end?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Errors accumulate over many operations and rounding at the end can go the wrong way at a half-cent. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Decimal</code> or integer cents, and round at defined points with a documented rule.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">math.isclose(x, 0.0)</code> return for a tiny x?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code>, because the default tolerance is relative to the larger magnitude, and relative to zero nothing is close. Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abs&#95;tol</code>, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abs&#95;tol=1e-9</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Fraction</code> a bad choice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In long loops or with many different denominators: numerators and denominators keep growing and every operation reduces by a GCD. On our run it was about 90 times slower than float.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **IEEE 754 double precision (binary64)** | the 64-bit binary floating-point format behind Python's \`float\`, 53 bits of precision |
| **representation error** | the gap between the number you wrote and the nearest storable number |
| **ULP (unit in the last place)** | the distance from one float to the next representable float |
| **shortest round-trip repr** | \`repr\` prints the shortest decimal string that converts back to the same float |
| **\`math.isclose\`** | compares floats within a relative (and optional absolute) tolerance |
| **banker's rounding (round half to even)** | exact halves round to the even neighbour |
| **\`decimal.Decimal\`** | base-10 floating point with configurable precision and rounding |
| **context** | the \`decimal\` settings object: precision, rounding mode, traps |
| **\`fractions.Fraction\`** | an exact rational number stored as numerator and denominator |

---
**Conclusion:** \`0.1 + 0.2 != 0.3\` because Python's \`float\` is a binary IEEE 754 double: one tenth cannot be stored exactly, each literal is rounded to the nearest double, and the rounded sum lands one representable step above the stored \`0.3\`. Floats are still the right tool for measurements and science, as long as you compare with \`math.isclose\`, sum with \`math.fsum\` and treat \`round()\` with care. When the digits themselves matter, as with money, use \`Decimal\` built from strings and round with \`quantize\`; when you need exact ratios, use \`Fraction\` and accept the speed cost. Related: [Python's built-in data types](/interview-question/what-are-python-s-built-in-data-types) and [converting JSON](/interview-question/how-do-you-convert-between-python-objects-and-json), where \`parse_float=Decimal\` keeps every digit.
`,
    examples: [
      { label: `What a float really stores: repr, exact value, isclose, fsum and round`, code: `# Why 0.1 + 0.2 is not 0.3: floats are binary fractions
from decimal import Decimal
import math

print(0.1 + 0.2)  # 0.30000000000000004
print(0.1 + 0.2 == 0.3)  # False

# The value actually stored for the literal 0.1, written out in full
print(Decimal(0.1))
# The same value as an exact ratio of two integers (denominator is 2**55)
print((0.1).as_integer_ratio())  # (3602879701896397, 36028797018963968)
print((0.1).hex())  # 0x1.999999999999ap-4

# repr() prints the shortest string that round-trips to the same float
print(repr(0.3), repr(0.1 + 0.2))
print(float("0.30000000000000004") == 0.1 + 0.2)  # True

# Errors pile up: adding 0.1 ten times
total = 0.0
for _ in range(10):
    total += 0.1
print(total, total == 1.0)
print(math.fsum([0.1] * 10))  # 1.0

# Compare with a tolerance instead of ==
print(math.isclose(0.1 + 0.2, 0.3))  # True
print(math.isclose(1e-12, 0.0))  # False
print(math.isclose(1e-12, 0.0, abs_tol=1e-9))  # True

# round() works on the stored binary value, and ties go to the even neighbour
print(round(2.675, 2), Decimal(2.675))
print(round(0.5), round(1.5), round(2.5))  # 0 2 2

# Floats have 53 bits of precision: big numbers lose small ones
print(2.0**53 + 1 == 2.0**53)  # True
print(float(2**53 + 1))  # 9007199254740992.0
print(1e16 + 1 - 1e16)  # 0.0

# Special values
nan = float("nan")
print(nan == nan, math.isnan(nan))  # False True
print(float("inf") > 1e308, 1e308 * 10)  # True inf` },
      { label: `Decimal for money (quantize, context, rounding) and Fraction for exact ratios`, code: `# Decimal: base-10 arithmetic for money; Fraction: exact rationals
from decimal import Decimal, ROUND_HALF_UP, localcontext, getcontext, InvalidOperation
from fractions import Fraction

# Build Decimals from strings (or ints), never from floats
print(Decimal("0.1") + Decimal("0.2"))  # 0.3
print(Decimal("0.1") + Decimal("0.2") == Decimal("0.3"))  # True
print(Decimal(0.1) + Decimal(0.2))

# Decimal keeps significant trailing zeros
print(Decimal("1.10") + Decimal("2.20"))  # 3.30
print(Decimal("19.99") * 3)  # 59.97

# Rounding money: quantize to cents with an explicit rule
price = Decimal("2.675")
print(price.quantize(Decimal("0.01")))  # 2.68
print(Decimal("2.665").quantize(Decimal("0.01")))  # 2.66
print(Decimal("2.665").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))  # 2.67

# Division still rounds: to the context precision (28 digits by default)
print(getcontext().prec)  # 28
print(Decimal(1) / Decimal(3))
with localcontext() as ctx:
    ctx.prec = 5
    print("prec 5:", Decimal(1) / Decimal(3))

# Mixing Decimal and float is refused
try:
    Decimal("1.5") + 0.5
except TypeError as e:
    print("TypeError:", e)
print(Decimal("1.5") + 1)  # 2.5

# Decimal has a NaN and signals too
try:
    Decimal("abc")
except InvalidOperation as e:
    print("InvalidOperation for Decimal('abc')")

# Fraction: exact numerator/denominator, never rounds
third = Fraction(1, 3)
print(third + third + third == 1)  # True
print(Fraction(1, 10) + Fraction(2, 10))  # 3/10
print(Fraction("0.1"), Fraction(0.1))
print(Fraction(0.1).limit_denominator(1000))  # 1/10
print(Fraction(6, 4), Fraction(6, 4).numerator, Fraction(6, 4).denominator)  # 3/2 3 2

# Fraction with a float gives a float; with an int stays exact
print(type(Fraction(1, 2) + 0.5).__name__, type(Fraction(1, 2) + 1).__name__)  # float Fraction

# Splitting 100.00 three ways without losing a cent
total = Decimal("100.00")
share = (total / 3).quantize(Decimal("0.01"))
shares = [share, share, total - 2 * share]
print(shares, sum(shares))` },
    ],
  },
  {
    title: `How do you handle dates, times and time zones in Python?`,
    difficulty: "medium",
    seoDescription: `Python dates and times: naive vs aware datetime, timedelta, ISO 8601 parsing, zoneinfo time zones, DST gaps and folds, and why to store UTC.`,
    description: `**Question presented to candidate:**
"Our service stores timestamps from users all over the world and shows them in each user's local time. How do you work with dates, times and time zones in Python, and what goes wrong around daylight saving time?"

**What a strong answer should cover:**
- The \`datetime\` module types: \`date\`, \`time\`, \`datetime\`, \`timedelta\`, \`timezone\`; the difference between a **naive** datetime (no \`tzinfo\`) and an **aware** one, and that comparing the two raises \`TypeError\`
- Store and compute in UTC (\`datetime.now(timezone.utc)\`), convert to a local zone only for display with \`astimezone()\`; \`datetime.utcnow()\` returns a naive value and is deprecated since Python 3.12
- Real time zones with \`zoneinfo.ZoneInfo("Europe/London")\` (standard library since 3.9, PEP 615) backed by the IANA database (the OS copy or the \`tzdata\` package); a fixed \`timezone(timedelta(hours=-5))\` offset is not a time zone because it never changes for DST
- DST edge cases: the spring-forward gap (02:30 that never happens), the fall-back fold (01:30 twice, chosen with \`fold=0/1\`), and that arithmetic within one zone is wall-clock arithmetic, so convert to UTC for elapsed time
- Serialise with ISO 8601 (\`isoformat()\` / \`fromisoformat()\`, which accepts a trailing \`Z\` since 3.11) or Unix timestamps; \`strptime\`/\`strftime\` for custom formats; \`replace(tzinfo=...)\` attaches a zone while \`astimezone()\` converts
- \`time.monotonic()\` / \`time.perf_counter()\` for measuring durations, not wall-clock datetimes

**Clarifying questions expected:**
- Do we need the user's real time zone (with DST rules) or only a fixed offset?
- What format do timestamps arrive in, and do they carry an offset?
- Do we care about calendar arithmetic (add one month, same local time tomorrow) or elapsed time?

**Code / implementation expected:** Optional — store an aware UTC datetime, convert it to two \`ZoneInfo\` zones, and show one DST edge case.`,
    answer: `**Target Audience:** Python developers who store, compare or display timestamps and want to get time zones and daylight saving time right
**Difficulty:** Medium
**Python version:** Checked on CPython 3.11 (Example 1, also in this page on Pyodide 0.25.1) and CPython 3.12 (Example 2, which needs the IANA time zone database)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A friend in New York texts you: "Call me at 9." You are in Mumbai. Which 9? Their 9 or yours? And if they sent it on the weekend in March when American clocks jump forward an hour, is "9 tomorrow" 24 hours away or 23?

A timestamp without a time zone is that text message: it names a time on *somebody's* clock, but not whose. Software that stores "2024-03-10 09:30" without saying where gets it wrong the moment a second user, a second server or a daylight saving change shows up. Python's \`datetime\` module can represent all of this precisely, but only if you tell it which kind of time you mean.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do users need their real local time zone, with DST rules? | Needs \`zoneinfo\` and an IANA name like \`America/New_York\`, not a fixed offset |
| What format do incoming timestamps use, and do they include an offset? | Decides \`fromisoformat\`, \`strptime\` or Unix seconds, and whether input is naive |
| Is the arithmetic "elapsed time" or "same wall-clock time tomorrow"? | The two give different answers across a DST change |
| Where are timestamps stored (database column type)? | A \`timestamp with time zone\` column versus storing UTC by convention |
| Do we measure durations (timeouts, benchmarks)? | Those need a monotonic clock, not datetimes |

## 3. The Building Blocks

The \`datetime\` module has five types you use every day:

| Type | Holds | Example |
| :--- | :--- | :--- |
| \`date\` | year, month, day | \`date(2024, 2, 28)\` |
| \`time\` | hour, minute, second, microsecond, optional \`tzinfo\` | \`time(9, 30)\` |
| \`datetime\` | a date plus a time, optional \`tzinfo\` | \`datetime(2024, 3, 10, 9, 30)\` |
| \`timedelta\` | a duration (days, seconds, microseconds) | \`timedelta(days=1, hours=2)\` |
| \`timezone\` | a **fixed** offset from UTC | \`timezone(timedelta(hours=5, minutes=30))\` |

📌 **Interview term: naive datetime** — a \`datetime\` whose \`tzinfo\` is \`None\`. It is a reading on an unnamed clock; Python cannot know which instant it is.

📌 **Interview term: aware datetime** — a \`datetime\` with a \`tzinfo\` that gives its offset from UTC, so it identifies one exact instant.

Python refuses to mix them: \`naive < aware\` raises \`TypeError: can't compare offset-naive and offset-aware datetimes\` (Example 1). That error is your friend; it stops you from silently comparing two different clocks.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="A naive datetime has a date and time but no zone; an aware datetime also has a tzinfo with an offset from UTC and maps to one instant">
  <rect class="d-box-muted" x="30" y="40" width="290" height="150" rx="10"/>
  <text class="d-text" x="175" y="78" text-anchor="middle">naive datetime</text>
  <text class="d-sub" x="175" y="112" text-anchor="middle">2024-03-10 09:30</text>
  <text class="d-sub" x="175" y="146" text-anchor="middle">tzinfo is None</text>
  <rect class="d-box-accent" x="400" y="40" width="290" height="150" rx="10"/>
  <text class="d-text" x="545" y="78" text-anchor="middle">aware datetime</text>
  <text class="d-sub" x="545" y="112" text-anchor="middle">2024-03-10 09:30</text>
  <text class="d-sub" x="545" y="146" text-anchor="middle">tzinfo = UTC, offset +00:00</text>
</svg>

Both hold the same wall-clock reading; only the aware one says which instant it is, so only aware datetimes can be safely compared across zones.

## 4. The Golden Rule: Store UTC, Convert at the Edges

📌 **Interview term: UTC (Coordinated Universal Time)** — the reference clock with no daylight saving. Every aware datetime can be converted to it, and two UTC values compare and subtract correctly.

The pattern every production system uses:

1. **On input**, parse the user's timestamp with its zone (or attach the user's zone) and convert to UTC.
2. **Store and compute** in UTC: \`datetime.now(timezone.utc)\`, or \`datetime.now(UTC)\` with the \`datetime.UTC\` alias that 3.11 added.
3. **On output**, convert to the viewer's zone with \`astimezone()\` and format.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 200" role="img" aria-label="Input in a local zone is converted to UTC, stored and computed in UTC, then converted to the viewer zone for display">
  <defs>
    <marker id="dt1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="190" height="80" rx="8"/>
  <text class="d-text" x="115" y="92" text-anchor="middle">user input</text>
  <text class="d-sub" x="115" y="116" text-anchor="middle">local time + zone</text>
  <rect class="d-box-accent" x="285" y="60" width="190" height="80" rx="8"/>
  <text class="d-text" x="380" y="92" text-anchor="middle">store in UTC</text>
  <text class="d-sub" x="380" y="116" text-anchor="middle">compare, subtract</text>
  <rect class="d-box" x="550" y="60" width="190" height="80" rx="8"/>
  <text class="d-text" x="645" y="92" text-anchor="middle">display</text>
  <text class="d-sub" x="645" y="116" text-anchor="middle">astimezone(viewer)</text>
  <path class="d-edge" d="M 210 100 L 279 100" marker-end="url(#dt1-arrow)"/>
  <path class="d-edge" d="M 475 100 L 544 100" marker-end="url(#dt1-arrow)"/>
</svg>

Conversions happen only at the two edges; everything in the middle works on one unambiguous clock.

**\`utcnow()\` is a trap.** \`datetime.utcnow()\` returns the current UTC time as a **naive** datetime, which later code may treat as local time. Python 3.12 deprecated it together with \`utcfromtimestamp()\` and suggests \`datetime.now(datetime.UTC)\` instead ([background](https://blog.miguelgrinberg.com/post/it-s-time-for-a-change-datetime-utcnow-is-now-deprecated)). Example 2 catches the \`DeprecationWarning\` on 3.12 and shows the result's \`tzinfo\` is \`None\`.

**\`replace\` attaches, \`astimezone\` converts.** \`naive.replace(tzinfo=ist)\` says "this reading was on an IST clock" and keeps 09:30; \`aware.astimezone(ist)\` keeps the instant and changes the reading (09:30 UTC becomes 15:00 +05:30). Mixing them up shifts times by hours.

## 5. Real Time Zones: zoneinfo

A \`timezone(timedelta(hours=-5))\` object is a fixed offset. New York is not: it is UTC-5 in winter and UTC-4 in summer, and the dates of the switch have changed over the years by law.

📌 **Interview term: IANA time zone database (tz database)** — the public database of every region's offset rules and their history, with names like \`America/New_York\` or \`Asia/Kolkata\`. Operating systems ship a copy.

📌 **Interview term: \`zoneinfo.ZoneInfo\`** — the standard-library \`tzinfo\` implementation that reads the IANA database. It was added in Python 3.9 by [PEP 615](https://peps.python.org/pep-0615/); it uses the system's time zone data and falls back to the first-party \`tzdata\` package from PyPI when the system has none. \`ZoneInfo("America/New_York")\` returns a cached object (two calls give the same object on our run).

~~~python
from datetime import datetime, UTC
from zoneinfo import ZoneInfo
t = datetime(2024, 7, 1, 12, 0, tzinfo=UTC)
print(t.astimezone(ZoneInfo("America/New_York")))   # 2024-07-01 08:00:00-04:00
print(t.astimezone(ZoneInfo("Asia/Kolkata")))       # 2024-07-01 17:30:00+05:30
~~~

This is also why Example 2 cannot run inside this page: Pyodide 0.25.1 has no time zone database, and \`ZoneInfo("America/New_York")\` raised \`ZoneInfoNotFoundError\` there when we tried. It runs on any normal CPython 3.9+ with system tz data or \`tzdata\` installed. Example 1 uses only fixed offsets, so it runs here.

Older code uses the third-party \`pytz\` package, which needs \`zone.localize(naive)\` to attach a zone correctly (passing a \`pytz\` zone straight to the \`datetime\` constructor picks an old Local Mean Time offset such as -04:56 for New York) and \`normalize()\` after arithmetic. The [pytz project description](https://pypi.org/project/pytz/) itself says projects on Python 3.9 or later should use the standard-library support instead. We did not run \`pytz\` here; it is not installed in our sandbox.

📌 **Interview term: DST (daylight saving time)** — moving clocks forward in spring and back in autumn. It creates the two hard cases below.

## 6. The Two DST Edge Cases

In 2024, New York clocks jumped from 02:00 to 03:00 on 10 March and fell back from 02:00 to 01:00 on 3 November (both visible in Example 2).

📌 **Interview term: gap (nonexistent time)** — wall-clock times skipped in spring. \`02:30\` on 10 March never happened in New York. \`ZoneInfo\` does not raise for it; converting it to UTC and back gave \`03:30-04:00\` on our run, so validate user input if it matters.

📌 **Interview term: fold (ambiguous time)** — wall-clock times that happen twice in autumn. \`01:30\` on 3 November happened at UTC-4 and again an hour later at UTC-5. The \`fold\` attribute, added in Python 3.6 by [PEP 495](https://peps.python.org/pep-0495/), chooses: \`fold=0\` is the first occurrence (EDT, 05:30 UTC), \`fold=1\` the second (EST, 06:30 UTC).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 250" role="img" aria-label="Spring forward: the clock skips from 01:59 to 03:00 leaving a gap. Fall back: the hour from 01:00 to 01:59 is repeated, fold 0 is the first pass and fold 1 is the second">
  <text class="d-text d-accent" x="30" y="70">spring</text>
  <rect class="d-box" x="130" y="40" width="160" height="56" rx="8"/>
  <text class="d-text" x="210" y="74" text-anchor="middle">01:00 to 01:59</text>
  <rect class="d-box-muted" x="340" y="40" width="160" height="56" rx="8"/>
  <text class="d-text" x="420" y="74" text-anchor="middle">gap: 02:xx</text>
  <rect class="d-box" x="550" y="40" width="140" height="56" rx="8"/>
  <text class="d-text" x="620" y="74" text-anchor="middle">03:00 EDT</text>
  <text class="d-text d-accent" x="30" y="190">autumn</text>
  <rect class="d-box" x="130" y="160" width="160" height="56" rx="8"/>
  <text class="d-text" x="210" y="194" text-anchor="middle">01:30 fold 0</text>
  <rect class="d-box-accent" x="340" y="160" width="160" height="56" rx="8"/>
  <text class="d-text" x="420" y="194" text-anchor="middle">01:30 fold 1</text>
  <rect class="d-box" x="550" y="160" width="140" height="56" rx="8"/>
  <text class="d-text" x="620" y="194" text-anchor="middle">02:00 EST</text>
</svg>

In spring an hour of wall-clock readings does not exist; in autumn an hour of readings exists twice, and \`fold\` says which pass you mean.

### Wall-clock arithmetic versus elapsed time

Adding a \`timedelta\` to an aware datetime changes the **wall clock** and keeps the zone. Example 2 adds one day to Saturday 12:00 in New York and gets Sunday 12:00, but only 23 hours actually passed. For "exactly 24 hours later", convert to UTC, add, and convert back (it gives 13:00).

Subtraction has the same rule. Two datetimes that share the **same** \`tzinfo\` object are subtracted by wall clock, ignoring offsets: 01:00 to 04:00 on the spring-forward day printed \`3:00:00\` on our 3.12 run, while the same subtraction through UTC printed \`2:00:00\`. When you need elapsed time, subtract UTC values.

## 7. Arithmetic, Parsing and Formatting

📌 **Interview term: \`timedelta\`** — a duration normalised to days, seconds and microseconds. \`timedelta(hours=-1)\` prints \`-1 day, 23:00:00\` because only the days part can be negative. Use \`.total_seconds()\` for a single number.

\`timedelta\` has no months or years, because months have different lengths. "One month after 31 January" is a business rule; Example 1 clamps to the last day (\`2024-02-29\`). Third-party \`dateutil.relativedelta\` implements such rules if you need many of them.

📌 **Interview term: ISO 8601** — the international date format \`2024-03-10T09:30:00+05:30\`. \`isoformat()\` writes it and \`fromisoformat()\` reads it. Since 3.11, \`fromisoformat()\` parses most ISO 8601 forms, including a trailing \`Z\` for UTC (the [Ruff lint rule for the old workaround](https://docs.astral.sh/ruff/rules/fromisoformat-replace-z/) documents the change); before 3.11 people wrote \`s.replace("Z", "+00:00")\` first.

\`strptime(text, format)\` parses custom formats and \`strftime(format)\` writes them, with codes like \`%Y %m %d %H %M %I %p %A %Z\`. A string parsed without \`%z\` gives a naive datetime (Example 1 prints \`None\` for its \`tzinfo\`). Day and month names from \`%A\` and \`%p\` follow the current locale.

📌 **Interview term: Unix timestamp (epoch seconds)** — seconds since 1970-01-01 00:00 UTC. \`aware.timestamp()\` and \`datetime.fromtimestamp(ts, tz=timezone.utc)\` convert both ways. A **naive** datetime's \`.timestamp()\` assumes the machine's local zone: on our run the same naive 09:30 gave \`1710063000.0\` with \`TZ=UTC\` and \`1710043200.0\` with \`TZ=Asia/Kolkata\`.

For measuring how long something takes, use \`time.monotonic()\` or \`time.perf_counter()\`. The system clock can be adjusted while your code runs; a monotonic clock cannot go backward.

## 8. Verified: Running the Code

Example 1 was run with \`python3.11 main.py\` and again in this page (Pyodide 0.25.1), with identical output. Example 2 needs the IANA database, so it is marked "Open in playground" and was run with \`python3.12 main.py\` (python3.13 printed the same).

**Example 1 — datetime, timedelta, fixed offsets, parsing and formatting** prints:

~~~text
None UTC
2024-03-10T09:30:00
2024-03-10T09:30:00+00:00
2024-03-10 15:00:00+05:30
True
TypeError: can't compare offset-naive and offset-aware datetimes
2024-03-11 11:30:00+00:00
1 day, 2:00:00 93600.0
-1 day, 23:00:00
2024-02-29 2024-03-01
2 3 Wednesday
290
2024-02-29
5:30:00
2024-03-10 09:30:00+00:00
2024-03-10 09:30:00 None
2024-03-10 09:30 AM
1710063000.0
1970-01-01 00:00:00+00:00
2024-03-10 09:30:00+05:30
2024-03-10 04:00:00+00:00
~~~

**Example 2 — zoneinfo, DST gaps and folds, and utcnow** prints:

~~~text
2024-07-01 08:00:00-04:00 EDT
2024-07-01 17:30:00+05:30 IST
January offset: -5.0
July offset:    -4.0
wall clock +1 day: 2024-03-10 12:00:00-04:00 elapsed: 23:00:00
absolute +24h:    2024-03-10 13:00:00-04:00
nonexistent 02:30 round-trips to 2024-03-10 03:30:00-04:00
-4.0 -5.0 EDT EST
2024-11-03 05:30:00+00:00 2024-11-03 06:30:00+00:00
same tzinfo: 3:00:00  via UTC: 2:00:00
America/New_York   2024-11-03 01:30 EST
Europe/London      2024-11-03 06:30 GMT
Asia/Kolkata       2024-11-03 12:00 IST
2024-07-01 17:00:00+00:00 2024-07-01 16:00:00+00:00
None DeprecationWarning
UTC
~~~

**What the output shows:** in the first program, one instant compares equal in UTC and +05:30, naive and aware refuse to compare, \`timedelta\` normalises negative durations, \`fromisoformat\` accepts \`Z\`, and \`replace\` attaches while \`astimezone\` converts. In the second, New York is UTC-5 in January and UTC-4 in July, "plus one day" across the spring change is 23 real hours, the nonexistent 02:30 comes back as 03:30, the two 01:30s on 3 November map to different UTC instants, same-zone subtraction ignores the DST change, a fixed -05:00 offset is wrong in summer, and \`utcnow()\` returns a naive value with a \`DeprecationWarning\`.

## Common Pitfalls

- **Naive datetimes in storage.** Without a zone, nobody can say later which instant a row meant. Store aware UTC values (or a database type that keeps the offset).
- **\`datetime.utcnow()\` and \`utcfromtimestamp()\`.** They return naive values that look local; deprecated since 3.12. Use \`datetime.now(timezone.utc)\` and \`datetime.fromtimestamp(ts, tz=timezone.utc)\`.
- **A fixed offset instead of a zone.** \`timezone(timedelta(hours=-5))\` is wrong for New York half of the year; use \`ZoneInfo("America/New_York")\`.
- **Elapsed time computed in local time.** Same-\`tzinfo\` subtraction and addition are wall-clock operations; convert to UTC for durations.
- **\`replace(tzinfo=...)\` when you meant \`astimezone(...)\`.** One relabels, the other converts.
- **Using \`datetime.now()\` to time code.** The wall clock can jump; use \`time.perf_counter()\` or \`time.monotonic()\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The types:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">date</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">time</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">datetime</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timedelta</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timezone</code>. A datetime is naive when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tzinfo</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> and aware when it has an offset; Python refuses to compare the two.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The rule:</strong> <span style="color:#f0e2c8;">Store and compute in UTC with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">datetime.now(timezone.utc)</code>; convert to the user zone only for display with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">astimezone()</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">utcnow()</code> returns a naive value and is deprecated since 3.12.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Real zones:</strong> <span style="color:#f0e2c8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zoneinfo.ZoneInfo("America/New&#95;York")</code>, standard since 3.9, backed by the IANA database (system data or the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tzdata</code> package). A fixed offset ignores DST.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. DST traps:</strong> <span style="color:#f0e2c8;">Spring creates a gap of times that never happen; autumn repeats an hour, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fold=0/1</code> picks the occurrence. Arithmetic in one zone is wall-clock, so use UTC for elapsed time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Serialising:</strong> <span style="color:#f0e2c8;">Use ISO 8601 with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isoformat()</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fromisoformat()</code> (which accepts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Z</code> since 3.11) or Unix timestamps; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">time.monotonic()</code> for durations.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">replace(tzinfo=tz)</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">astimezone(tz)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">replace</code> keeps the wall-clock reading and just labels it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tz</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">astimezone</code> keeps the instant and computes the reading in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tz</code>. On a naive value, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">replace</code> is how you attach a known zone.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pytz</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zoneinfo</code> is in the standard library and works with normal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">datetime(..., tzinfo=zone)</code> construction. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pytz</code> you must call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">localize()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">normalize()</code>, and passing a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pytz</code> zone straight to the constructor gives a wrong historical offset. New code should use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zoneinfo</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add one day "at the same local time" versus "24 hours later"?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Same local time: add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timedelta(days=1)</code> to the aware local datetime. 24 hours: convert to UTC, add, and convert back. Across a DST change they differ by an hour.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">A user enters 02:30 on the spring-forward day. What happens?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That time does not exist. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ZoneInfo</code> does not raise; the value maps to an instant as if the old offset still applied, and round-tripping through UTC shows 03:30. Validate by checking that the round trip returns the same wall time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you store timestamps in a database?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As UTC in a column type that keeps the zone (for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timestamp with time zone</code> in PostgreSQL), plus the user's IANA zone name separately if you need to display or schedule in their local time.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **naive datetime** | a datetime with no \`tzinfo\`; it does not identify an instant |
| **aware datetime** | a datetime with a \`tzinfo\`; it identifies one exact instant |
| **UTC (Coordinated Universal Time)** | the reference clock with no daylight saving |
| **IANA time zone database (tz database)** | the public database of every region's offset rules |
| **\`zoneinfo.ZoneInfo\`** | the standard-library time zone that reads the IANA database |
| **DST (daylight saving time)** | moving clocks forward in spring and back in autumn |
| **gap (nonexistent time)** | wall-clock times skipped when clocks move forward |
| **fold (ambiguous time)** | wall-clock times repeated when clocks move back; \`fold\` picks one |
| **\`timedelta\`** | a duration in days, seconds and microseconds |
| **ISO 8601** | the standard text format for dates and times |
| **Unix timestamp (epoch seconds)** | seconds since 1970-01-01 00:00 UTC |

---
**Conclusion:** Dates and times go wrong when software forgets *whose* clock a reading is on. In Python, make every datetime aware, store and compute in UTC, and convert to a \`zoneinfo.ZoneInfo\` zone only at the edges for display. Know the two daylight saving cases, the spring gap and the autumn fold, and remember that arithmetic inside one zone is wall-clock arithmetic, so elapsed time belongs in UTC. Serialise with ISO 8601 or Unix timestamps, avoid the deprecated \`utcnow()\`, and use a monotonic clock for timing. Related: [converting objects to JSON](/interview-question/how-do-you-convert-between-python-objects-and-json), where datetimes need an explicit format, and [how to measure performance](/interview-question/how-do-you-measure-and-profile-python-performance), which uses \`perf_counter\`.
`,
    examples: [
      { label: `datetime, timedelta, fixed offsets, parsing and formatting`, code: `# date, time, datetime, timedelta and timezone (fixed offsets, no tz database needed)
from datetime import date, datetime, timedelta, timezone

# Naive: no time zone attached. Aware: tzinfo set.
naive = datetime(2024, 3, 10, 9, 30)
aware = datetime(2024, 3, 10, 9, 30, tzinfo=timezone.utc)
print(naive.tzinfo, aware.tzinfo)  # None UTC
print(naive.isoformat())  # 2024-03-10T09:30:00
print(aware.isoformat())  # 2024-03-10T09:30:00+00:00

# The same instant seen from a fixed +05:30 offset
ist = timezone(timedelta(hours=5, minutes=30), "IST")
print(aware.astimezone(ist))  # 2024-03-10 15:00:00+05:30
print(aware.astimezone(ist) == aware)  # True

# Naive and aware cannot be compared or subtracted
try:
    naive < aware
except TypeError as e:
    print("TypeError:", e)

# Arithmetic with timedelta
meeting = aware + timedelta(days=1, hours=2)
print(meeting)  # 2024-03-11 11:30:00+00:00
gap = meeting - aware
print(gap, gap.total_seconds())  # 1 day, 2:00:00 93600.0
print(timedelta(hours=-1))  # -1 day, 23:00:00

# Dates: day arithmetic and weekdays
d = date(2024, 2, 28)
print(d + timedelta(days=1), d + timedelta(days=2))  # 2024-02-29 2024-03-01
print(d.weekday(), d.isoweekday(), d.strftime("%A"))  # 2 3 Wednesday
print((date(2024, 12, 25) - date(2024, 3, 10)).days)  # 290

# timedelta has no "months": adding a month is your own rule
def add_month(d):
    y, m = divmod(d.month, 12)
    nxt = date(d.year + y, m + 1, 1)
    last = (nxt.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    return nxt.replace(day=min(d.day, last.day))
print(add_month(date(2024, 1, 31)))  # 2024-02-29

# Parsing and formatting
s = "2024-03-10T09:30:00+05:30"
parsed = datetime.fromisoformat(s)
print(parsed.utcoffset())  # 5:30:00
print(datetime.fromisoformat("2024-03-10T09:30:00Z"))  # 2024-03-10 09:30:00+00:00
p = datetime.strptime("10/03/2024 09:30", "%d/%m/%Y %H:%M")
print(p, p.tzinfo)  # 2024-03-10 09:30:00 None
print(p.strftime("%Y-%m-%d %I:%M %p"))  # 2024-03-10 09:30 AM

# Unix timestamps: seconds since 1970-01-01 UTC
print(aware.timestamp())  # 1710063000.0
print(datetime.fromtimestamp(0, tz=timezone.utc))  # 1970-01-01 00:00:00+00:00

# Attaching a zone (replace) is not converting (astimezone)
print(naive.replace(tzinfo=ist))  # 2024-03-10 09:30:00+05:30
print(naive.replace(tzinfo=ist).astimezone(timezone.utc))  # 2024-03-10 04:00:00+00:00` },
      { label: `zoneinfo: daylight saving gaps, folds and utcnow (needs the IANA database)`, runnable: false, python: "3.12", code: `# Real time zones with zoneinfo (needs the IANA database: the OS copy or the tzdata package)
import warnings
from datetime import datetime, timedelta, timezone, UTC
from zoneinfo import ZoneInfo

ny = ZoneInfo("America/New_York")
kolkata = ZoneInfo("Asia/Kolkata")

# One instant, three wall clocks
t = datetime(2024, 7, 1, 12, 0, tzinfo=UTC)
print(t.astimezone(ny), t.astimezone(ny).tzname())
print(t.astimezone(kolkata), t.astimezone(kolkata).tzname())

# Same zone, different offset: daylight saving time
def hours(td):
    return td.total_seconds() / 3600
print("January offset:", hours(datetime(2024, 1, 15, 12, tzinfo=ny).utcoffset()))
print("July offset:   ", hours(datetime(2024, 7, 15, 12, tzinfo=ny).utcoffset()))

# Spring forward: 2024-03-10 02:00 jumps to 03:00 in New York
before = datetime(2024, 3, 9, 12, 0, tzinfo=ny)
wall = before + timedelta(days=1)
print("wall clock +1 day:", wall, "elapsed:", wall.astimezone(UTC) - before.astimezone(UTC))
real = (before.astimezone(UTC) + timedelta(days=1)).astimezone(ny)
print("absolute +24h:   ", real)

# 02:30 on that day never happened on a New York clock
gap = datetime(2024, 3, 10, 2, 30, tzinfo=ny)
print("nonexistent 02:30 round-trips to", gap.astimezone(UTC).astimezone(ny))

# Fall back: 2024-11-03 01:30 happens twice; fold picks which one
first = datetime(2024, 11, 3, 1, 30, tzinfo=ny)
second = first.replace(fold=1)
print(hours(first.utcoffset()), hours(second.utcoffset()), first.tzname(), second.tzname())
print(first.astimezone(UTC), second.astimezone(UTC))

# Subtracting two datetimes in the SAME zone object ignores the DST change
a = datetime(2024, 3, 10, 1, 0, tzinfo=ny)
b = datetime(2024, 3, 10, 4, 0, tzinfo=ny)
print("same tzinfo:", b - a, " via UTC:", b.astimezone(UTC) - a.astimezone(UTC))

# Store UTC, convert for display
stored = datetime(2024, 11, 3, 6, 30, tzinfo=UTC)
for zone in ["America/New_York", "Europe/London", "Asia/Kolkata"]:
    print(f"{zone:18}", stored.astimezone(ZoneInfo(zone)).strftime("%Y-%m-%d %H:%M %Z"))

# Fixed offset vs real zone: a fixed -05:00 never moves for summer
fixed = timezone(timedelta(hours=-5))
print(datetime(2024, 7, 1, 12, tzinfo=fixed).astimezone(UTC), datetime(2024, 7, 1, 12, tzinfo=ny).astimezone(UTC))

# utcnow() returns a NAIVE datetime and is deprecated since 3.12
with warnings.catch_warnings(record=True) as caught:
    warnings.simplefilter("always")
    n = datetime.utcnow()
print(n.tzinfo, caught[0].category.__name__)
print(datetime.now(UTC).tzinfo)` },
    ],
  },
  {
    title: `How do you use regular expressions in Python?`,
    difficulty: "medium",
    seoDescription: `Python regular expressions with re: match vs search vs fullmatch, groups, findall, sub, flags, greedy vs lazy, lookarounds and common bugs.`,
    description: `**Question presented to candidate:**
"Walk me through using regular expressions in Python. What is the difference between \`re.match\`, \`re.search\` and \`re.fullmatch\`, how do groups work, and what mistakes do people make with the \`re\` module?"

**What a strong answer should cover:**
- Write patterns as raw strings (\`r"\\d+"\`) so backslashes reach the regex engine; \`match\` anchors at the start only, \`search\` scans anywhere, \`fullmatch\` must cover the whole string; all return a \`Match\` object or \`None\`
- Groups: numbered \`( )\`, named \`(?P<name>...)\`, non-capturing \`(?:...)\`; \`findall\` returns strings, a list of one group, or tuples depending on how many groups there are, while \`finditer\` yields \`Match\` objects lazily
- \`re.sub\` with backreferences (\`\\1\`, \`\\g<name>\`) or a function, \`re.split\` (a capturing group keeps separators), and flags such as \`IGNORECASE\`, \`MULTILINE\`, \`DOTALL\`, \`VERBOSE\`, \`ASCII\`
- Greedy vs lazy quantifiers (\`.+\` vs \`.+?\`), lookahead and lookbehind, \`re.escape\` for user input, and that \`str\` patterns are Unicode-aware (\`\\d\` matches Arabic-Indic digits)
- CPython details: \`re.compile\` returns a \`Pattern\`, and module-level calls are cached (512 entries on 3.11); the engine backtracks, so nested quantifiers like \`(a+)+b\` can take exponential time; 3.11 added atomic groups and possessive quantifiers
- Know when not to use a regex: \`str\` methods for simple tests, real parsers for HTML, JSON or nested structures

**Code / implementation expected:** Yes — extract fields from a log line with named groups, plus one substitution and one \`findall\`.`,
    answer: `**Target Audience:** Python developers who copy regexes from the internet and want to understand the \`re\` module well enough to write, read and debug their own
**Difficulty:** Medium
**Python version:** Checked on CPython 3.11 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine searching a 500-page server log for "every line where a date is followed by the word ERROR and a message". \`Ctrl+F\` finds the word ERROR, but not "a date, any date" or "the message after it". You need a way to describe the *shape* of the text: four digits, a dash, two digits, a dash, two digits, a space, then ERROR or WARN, then everything up to the semicolon.

A **regular expression** (regex) is a tiny language for describing such shapes. \`\\d{4}\` means "four digits"; \`(ERROR|WARN)\` means "either word, and remember which". Python's \`re\` module takes that description and finds, extracts, replaces or splits text by it. It is one of the most useful tools in the standard library, and one of the easiest to get subtly wrong.

📌 **Interview term: regular expression (regex)** — a pattern string that describes a set of strings, used to search, extract, replace and split text.

## 2. The First Rule: Raw Strings

Regex syntax uses backslashes everywhere (\`\\d\` digit, \`\\w\` word character, \`\\s\` whitespace, \`\\b\` word boundary). Python string literals *also* use backslashes (\`"\\n"\` newline, \`"\\b"\` backspace). Without care, Python eats the backslash before the regex engine sees it.

📌 **Interview term: raw string** — a literal with an \`r\` prefix, \`r"\\b"\`, in which backslashes are kept as typed. Write every pattern as a raw string.

Example 1 ends with the proof: \`re.findall("\\bcat\\b", "cat scat cat")\` returns \`[]\`, because \`"\\b"\` became a backspace character; \`re.findall(r"\\bcat\\b", ...)\` returns \`['cat', 'cat']\`.

## 3. Four Ways to Look: match, search, fullmatch, findall

| Function | Looks for | Returns |
| :--- | :--- | :--- |
| \`re.match(p, s)\` | a match **starting at position 0** | \`Match\` or \`None\` |
| \`re.search(p, s)\` | the **first** match anywhere | \`Match\` or \`None\` |
| \`re.fullmatch(p, s)\` | a match covering the **whole** string | \`Match\` or \`None\` |
| \`re.findall(p, s)\` | **all** non-overlapping matches | list of strings or tuples |
| \`re.finditer(p, s)\` | all matches, lazily | iterator of \`Match\` |

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Where each function may match in the string 1234: match must start at position 0, search may start anywhere, fullmatch must span from the first to the last character">
  <rect class="d-box" x="40" y="30" width="640" height="50" rx="8"/>
  <text class="d-text" x="360" y="61" text-anchor="middle">text: 1234 (pattern: three digits)</text>
  <rect class="d-box-accent" x="40" y="110" width="200" height="40" rx="6"/>
  <text class="d-text" x="140" y="135" text-anchor="middle">match: 123</text>
  <text class="d-sub" x="460" y="135" text-anchor="middle">must start at 0, may stop early</text>
  <rect class="d-box-accent" x="40" y="190" width="200" height="40" rx="6"/>
  <text class="d-text" x="140" y="215" text-anchor="middle">fullmatch: None</text>
  <text class="d-sub" x="460" y="215" text-anchor="middle">must start at 0 and end at the end</text>
</svg>

\`match\` is satisfied by the first three digits and ignores the fourth; \`fullmatch\` needs the pattern to consume all four, so it fails. \`search\` would also find \`123\`, but it could have started anywhere.

The most common bug with \`match\` is thinking it checks the whole string. Example 2 prints \`True False\` for \`match(r"\\d{3}", "1234")\` versus \`fullmatch\`: validation code should use \`fullmatch\` (or anchor the pattern with \`^...$\`, keeping in mind that \`$\` also matches before a trailing newline).

## 4. Match Objects and Groups

📌 **Interview term: \`Match\` object** — what a successful search returns. \`m.group(0)\` (or \`m[0]\`) is the whole match, \`m.group(1)\` the first group, \`m.groups()\` all groups as a tuple, \`m.span()\` / \`m.start()\` the positions. A \`Match\` is truthy and \`None\` is falsy, so \`if m := re.search(...)\` is the idiomatic test-and-bind (see [the walrus operator](/interview-question/what-is-the-walrus-operator)).

📌 **Interview term: capturing group** — parentheses \`( )\` that both group and remember the text they matched, numbered left to right by their opening parenthesis.

📌 **Interview term: named group** — \`(?P<name>...)\`, read with \`m["name"]\` or \`m.groupdict()\`. Much easier to maintain than counting parentheses.

📌 **Interview term: non-capturing group** — \`(?:...)\`, groups for \`|\` or a quantifier without creating a group. Use it when you need the grouping but not the text.

### The findall surprise

\`findall\` changes its return type with the number of groups:

| Groups in the pattern | \`findall\` returns | Example 1 |
| :--- | :--- | :--- |
| none | list of whole matches | \`['1', '22', '333']\` |
| exactly one | list of that group | \`['03', '03']\` (only the month) |
| two or more | list of tuples | \`[('a', '1'), ('b', '22'), ('c', '333')]\` |

If you add a group to an existing pattern "just to group an alternation", \`findall\` suddenly returns only that piece. Use \`(?:...)\` for grouping, or use \`finditer\` and read \`m.group(0)\`.

## 5. Replacing and Splitting

- \`re.sub(pattern, repl, s)\` replaces every match. In \`repl\`, \`\\1\` or \`\\g<1>\` or \`\\g<name>\` inserts a group: \`r"\\3/\\2/\\1"\` turns \`2024-03-10\` into \`10/03/2024\`.
- \`repl\` can be a **function** that receives the \`Match\` and returns the replacement: doubling every number in \`"3 apples, 10 pears"\` gives \`"6 apples, 20 pears"\`.
- \`re.subn\` also returns the number of replacements.
- \`re.split(r"[,;]\\s*", s)\` splits on a pattern. With a **capturing** group the separators are kept in the result: \`['a', ',', 'b', ';', 'c']\`.

## 6. Quantifiers: Greedy and Lazy

📌 **Interview term: quantifier** — how many times the previous item repeats: \`*\` (0+), \`+\` (1+), \`?\` (0 or 1), \`{m,n}\`.

📌 **Interview term: greedy vs lazy** — by default quantifiers are greedy: they take as much as possible and give back only if the rest of the pattern fails. Adding \`?\` (\`*?\`, \`+?\`, \`??\`) makes them lazy: take as little as possible.

On \`"<b>bold</b> and <i>italic</i>"\`, \`<.+>\` matches the entire string (from the first \`<\` to the last \`>\`), while \`<.+?>\` matches each tag separately. A negated class such as \`<[^>]+>\` is often clearer and faster than lazy matching.

## 7. Flags

| Flag | Short | Effect |
| :--- | :--- | :--- |
| \`re.IGNORECASE\` | \`re.I\` | case-insensitive matching |
| \`re.MULTILINE\` | \`re.M\` | \`^\` and \`$\` match at every line, not only the string ends |
| \`re.DOTALL\` | \`re.S\` | \`.\` also matches a newline |
| \`re.VERBOSE\` | \`re.X\` | whitespace ignored and \`#\` comments allowed in the pattern |
| \`re.ASCII\` | \`re.A\` | \`\\d \\w \\s \\b\` match ASCII only |

Combine with \`|\`: \`re.M | re.I\`. Pass them with the \`flags=\` keyword (see the bug in Section 10). \`VERBOSE\` turns an unreadable one-liner into a commented pattern; Example 1 builds a phone-number pattern that way.

## 8. Lookarounds, Unicode and Escaping

📌 **Interview term: lookahead / lookbehind** — zero-width assertions that check what comes after \`(?=...)\` / \`(?!...)\` or before \`(?<=...)\` / \`(?<!...)\` the current position without consuming it. A password rule "at least one digit and one uppercase letter, length 8+" is \`^(?=.*\\d)(?=.*[A-Z]).{8,}$\`; amounts after a dollar sign without the sign are \`(?<=\\$)\\d+\`. Python lookbehinds must have a fixed width.

**Unicode by default.** For \`str\` patterns, \`\\d\` means any Unicode decimal digit and \`\\w\` any Unicode letter or digit. Example 2 finds the Arabic-Indic \`٣٤\` with \`\\d+\`, and \`naïve café\` as two \`\\w+\` words. If you need ASCII only (for example validating an ID), add \`re.ASCII\` or write \`[0-9]\`.

**bytes need bytes patterns.** \`rb"\\d+"\` on \`b"id=42"\` works; a \`str\` pattern on bytes raises \`TypeError: cannot use a string pattern on a bytes-like object\`. See [bytes vs str](/interview-question/what-is-the-difference-between-bytes-and-str).

**Escape user input.** If a user types \`1+1=2?\` and you search for it as a pattern, \`+\` and \`?\` are quantifiers and the search fails. \`re.escape(user)\` gives \`1\\+1=2\\?\`, which matches literally.

## 9. What CPython Does: Compile, Cache, Backtrack

📌 **Interview term: compiled pattern (\`re.Pattern\`)** — the object \`re.compile(p)\` returns, with the same methods (\`match\`, \`search\`, \`findall\`, \`sub\` ...). CPython's \`re\` parses the pattern in Python (\`re._parser\`) and compiles it to codes run by the \`_sre\` C engine. \`re.compile(r"a(b|c)+", re.DEBUG)\` prints both the parsed tree and the code:

~~~text
LITERAL 97
MAX_REPEAT 1 MAXREPEAT
  SUBPATTERN 1 0 0
    IN
      LITERAL 98
      LITERAL 99

 0. INFO 8 0b1 2 MAXREPEAT (to 9)
      prefix_skip 1
      prefix [0x61] ('a')
      overlap [0]
 9: LITERAL 0x61 ('a')
11. REPEAT 13 1 MAXREPEAT (to 25)
15.   MARK 0
17.   IN 5 (to 23)
19.     RANGE 0x62 0x63 ('b'-'c')
22.     FAILURE
23:   MARK 1
25: MAX_UNTIL
26. SUCCESS
~~~

Module-level functions like \`re.search(p, s)\` compile the pattern and keep it in an internal cache: \`re._MAXCACHE\` is \`512\` on 3.11, 3.12 and 3.13 (a private detail), and on our run \`re.compile(r"\\d+")\` twice returned the very same object. So \`re.compile\` is mainly for readability and for reusing a named pattern, not a big speed win in most code.

📌 **Interview term: backtracking** — when part of a pattern fails, the engine goes back and tries the other choices it skipped (a shorter repeat, the other side of \`|\`). Python's engine is a backtracking engine, which is what makes groups, backreferences and lookarounds possible.

📌 **Interview term: catastrophic backtracking (ReDoS)** — a pattern with nested or overlapping quantifiers, such as \`(a+)+b\`, on an input that almost matches, makes the engine try exponentially many ways to split the input before giving up. On our machine (python3.11), \`re.match(r"(a+)+b", "a" * n + "c")\` took about 10 ms for n = 18, 42 ms for 20, 166 ms for 22 and 682 ms for 24: about four times slower for every two extra characters. An attacker who controls the input can freeze a server this way (regular expression denial of service).

Fixes: write unambiguous patterns (\`a+b\` instead of \`(a+)+b\`), limit input length, or use the **atomic groups** and **possessive quantifiers** that Python 3.11 added ([3.11 changelog](https://python.org/downloads/release/python-3115/)): \`(?>...)\` and \`*+ ++ ?+ {m,n}+\` never give characters back once matched. With \`(?>a+)+b\`, the same n = 24 input failed in about 30 µs on our run. Example 2 shows the difference: \`a+a\` matches \`"aaaa"\` because \`a+\` gives one \`a\` back, while \`a++a\` returns \`None\`.

## 10. Verified: Running the Code

Both examples were run with \`python3.11 main.py\` and again in this page (Pyodide 0.25.1), with identical output.

**Example 1 — match, search, groups, findall, sub, split, greedy vs lazy and flags** prints:

~~~text
True
None
(11, 16)
True
None
2024-03-10 2024 ('2024', '03', '10')
ERROR | {'level': 'ERROR', 'msg': 'db timeout after 30s'}
['1', '22', '333']
[('a', '1'), ('b', '22'), ('c', '333')]
['03', '03']
ERROR 11
WARN 50
10/03/2024
6 apples, 20 pears
('too many spaces', 2)
['a', 'b', 'c ', 'd']
['a', ',', 'b', ';', 'c']
['<b>bold</b> and <i>italic</i>']
['<b>', '</b>', '<i>', '</i>']
['first']
['first', 'Second', 'third']
['Second']
[('555', '1234'), ('555', '9876')]
[] ['cat', 'cat']
~~~

**Example 2 — compiled patterns, lookarounds, Unicode, escaping, atomic groups and classic bugs** prints:

~~~text
[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+ True
['ann@example.com', 'bob.smith+x@mail.co.uk']
['ababab', 'ab']
password False
Password1 True
Pass1 False
['30', '7']
['٣٤', '34']
['34']
['naïve', 'café']
[b'42']
TypeError: cannot use a string pattern on a bytes-like object
1\\+1=2\\?
False True
True
None
aaaa
AxAxAa
xxxxxx
True False
None True
(3, 11)
~~~

**What the output shows:** \`match\` failed for \`ERROR\` because it is not at position 0 while \`search\` found it at 11; \`findall\` changed shape with the group count; the greedy \`<.+>\` swallowed the whole string; \`^\` matched only the first line until \`MULTILINE\`; and the non-raw \`"\\bcat\\b"\` found nothing. In the second program the lookahead accepted only \`Password1\`, \`\\d\` matched Arabic-Indic digits until \`re.ASCII\`, a \`str\` pattern refused bytes, the unescaped \`1+1=2?\` failed to find itself, and \`re.sub("a", "x", "AaAaAa", re.I)\` replaced only two lowercase \`a\`s (\`AxAxAa\`) because \`re.I\` (value 2) was taken as \`count\`.

That last one is a real-world bug: the fourth positional parameter of \`re.sub\` is \`count\`, not \`flags\`. On python3.13, passing \`count\` positionally emits \`DeprecationWarning: 'count' is passed as positional argument\` (we ran Example 2 with \`-W error::DeprecationWarning\` on 3.13 to see it). Always write \`flags=re.I\` and \`count=n\` as keywords.

## 11. When Not to Use a Regex

- **Fixed text**: \`"ERROR" in line\`, \`s.startswith("http")\`, \`s.split(",")\`, \`s.replace("a", "b")\` are clearer and faster. See [common string methods](/interview-question/what-are-common-useful-string-methods).
- **Nested structures** like HTML, JSON or code: use a parser (\`html.parser\`, \`json\`, \`ast\`). Regexes cannot count matching brackets.
- **Email addresses and URLs**: a simple pattern for extraction is fine; for validation, use \`urllib.parse\` or send a confirmation email.

## Common Pitfalls

- **Forgetting the \`r\` prefix.** \`"\\b"\` is a backspace and \`"\\1"\` is the character with code 1; the pattern silently matches something else.
- **\`re.match\` used as "the whole string matches".** It anchors only at the start; use \`fullmatch\`.
- **Flags passed positionally.** \`re.sub(p, r, s, re.I)\` and \`re.split(p, s, re.M)\` put the flag into \`count\` / \`maxsplit\`; use \`flags=\`.
- **Adding a capturing group and breaking \`findall\`.** Use \`(?:...)\` when you only need grouping.
- **Greedy \`.*\` across delimiters.** \`<.*>\` spans many tags; use \`.*?\` or a negated class like \`[^>]*\`.
- **Nested quantifiers on untrusted input.** \`(a+)+\`, \`(\\w+\\s?)*\` and friends can backtrack exponentially; simplify the pattern, cap input length, or use atomic groups (3.11+).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The basics:</strong> <span style="color:#f0e2c8;">Use the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">re</code> module with raw-string patterns like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r"\\d+"</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">match</code> anchors at the start, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">search</code> finds the first match anywhere, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fullmatch</code> needs the whole string; they return a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Match</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Extracting:</strong> <span style="color:#f0e2c8;">Use named groups <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(?P&lt;name&gt;...)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m.groupdict()</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">findall</code> returns strings or tuples depending on the group count, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finditer</code> yields <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Match</code> objects lazily, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(?:...)</code> groups without capturing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Transforming:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">re.sub</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">\\1</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">\\g&lt;name&gt;</code> backreferences or a function, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">re.split</code> (a capturing group keeps separators), and flags like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">re.I</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">re.M</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">re.S</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">re.X</code> passed with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flags=</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Semantics:</strong> <span style="color:#f0e2c8;">Quantifiers are greedy unless you add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?</code>; lookarounds check without consuming; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> patterns are Unicode-aware, so use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">re.ASCII</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0-9]</code> for ASCII digits; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">re.escape</code> untrusted input.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Under the hood:</strong> <span style="color:#f0e2c8;">CPython compiles patterns to code for the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;sre</code> backtracking engine and caches them (512 entries). Nested quantifiers like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a+)+b</code> can backtrack exponentially; 3.11 added atomic groups and possessive quantifiers.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">re.match</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">re.search</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">match</code> only tries at position 0; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">search</code> tries every position and returns the first match. Neither requires the match to reach the end of the string; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fullmatch</code> does.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should you always call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">re.compile</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for speed in most code: module functions cache compiled patterns. Compile when you reuse a pattern by name, want to pass it around, or need methods with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pos</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">endpos</code>. In very hot loops it saves the cache lookup.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">re.findall(r"(\\d+)-(\\d+)", s)</code> return tuples?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the pattern has two capturing groups. With no groups you get whole matches, with one group a list of that group. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finditer</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m.group(0)</code> if you want the whole match regardless.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is catastrophic backtracking and how do you prevent it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Overlapping quantifiers give the engine exponentially many ways to split an input that almost matches; on our run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a+)+b</code> took about 0.7 s on 24 a's followed by c. Prevent it with unambiguous patterns, input length limits, or atomic groups <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(?&gt;...)</code> and possessive quantifiers from 3.11.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">\\d</code> match only 0 to 9?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> patterns: it matches any Unicode decimal digit, such as Arabic-Indic digits. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0-9]</code> or the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">re.ASCII</code> flag when you mean ASCII digits.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **regular expression (regex)** | a pattern describing a set of strings |
| **raw string** | \`r"..."\`, a literal in which backslashes are kept as typed |
| **\`Match\` object** | the result of a successful search: groups, positions, truthy |
| **capturing group** | \`( )\`, remembers the matched text by number |
| **named group** | \`(?P<name>...)\`, remembers the text by name |
| **non-capturing group** | \`(?:...)\`, groups without remembering |
| **quantifier** | how many times an item repeats: \`* + ? {m,n}\` |
| **greedy vs lazy** | take as much as possible vs as little as possible |
| **lookahead / lookbehind** | check what follows or precedes without consuming it |
| **compiled pattern (\`re.Pattern\`)** | the reusable object from \`re.compile\` |
| **backtracking** | the engine retrying earlier choices when a later part fails |
| **catastrophic backtracking (ReDoS)** | exponential retrying caused by ambiguous nested quantifiers |

---
**Conclusion:** The \`re\` module turns a description of text shape into search, extraction, replacement and splitting. Write patterns as raw strings, pick \`search\`, \`match\` or \`fullmatch\` deliberately, use named and non-capturing groups so \`findall\` and your future self are not surprised, and pass flags by keyword. Remember that \`str\` patterns are Unicode-aware, that quantifiers are greedy, and that CPython's engine backtracks: ambiguous nested quantifiers on untrusted input can take exponential time, which simpler patterns, input limits or the atomic groups added in 3.11 prevent. And when a string method or a real parser does the job, prefer it.
`,
    examples: [
      { label: `match, search, groups, findall, sub, split, greedy vs lazy and flags`, code: `# The re module: the four ways to look, groups, substitution, splitting
import re

log = "2024-03-10 ERROR db timeout after 30s; 2024-03-11 WARN disk at 91%"

# match: only at the start. search: anywhere. fullmatch: the whole string.
print(re.match(r"\\d{4}", log) is not None)  # True
print(re.match(r"ERROR", log))  # None
print(re.search(r"ERROR", log).span())  # (11, 16)
print(re.fullmatch(r"\\d{4}-\\d{2}-\\d{2}", "2024-03-10") is not None)  # True
print(re.fullmatch(r"\\d{4}-\\d{2}-\\d{2}", "2024-03-10x"))  # None

# A Match object: group(0) is the whole match, then numbered groups
m = re.search(r"(\\d{4})-(\\d{2})-(\\d{2})", log)
print(m.group(0), m.group(1), m.groups())

# Named groups read better
m = re.search(r"(?P<level>ERROR|WARN) (?P<msg>[^;]+)", log)
print(m["level"], "|", m.groupdict())

# findall returns strings when there are no groups, tuples when there are 2+
print(re.findall(r"\\d+", "a1 b22 c333"))  # ['1', '22', '333']
print(re.findall(r"(\\w)(\\d+)", "a1 b22 c333"))  # [('a', '1'), ('b', '22'), ('c', '333')]
# ...and only the group when there is exactly one
print(re.findall(r"\\d{4}-(\\d{2})-\\d{2}", log))  # ['03', '03']

# finditer yields Match objects lazily, with positions
for m in re.finditer(r"(?P<level>ERROR|WARN)", log):
    print(m["level"], m.start())

# sub: backreferences in the replacement, or a function
print(re.sub(r"(\\d{4})-(\\d{2})-(\\d{2})", r"\\3/\\2/\\1", log[:10]))  # 10/03/2024
print(re.sub(r"\\d+", lambda m: str(int(m.group()) * 2), "3 apples, 10 pears"))  # 6 apples, 20 pears
print(re.subn(r"\\s+", " ", "too   many    spaces"))  # ('too many spaces', 2)

# split: a capturing group keeps the separators
print(re.split(r"[,;]\\s*", "a, b;c ,d"))  # ['a', 'b', 'c ', 'd']
print(re.split(r"([,;])", "a,b;c"))  # ['a', ',', 'b', ';', 'c']

# Greedy vs lazy
html = "<b>bold</b> and <i>italic</i>"
print(re.findall(r"<.+>", html))
print(re.findall(r"<.+?>", html))  # ['<b>', '</b>', '<i>', '</i>']

# Flags: IGNORECASE, MULTILINE (^ and $ per line), VERBOSE (comments allowed)
text = "first line\\nSecond line\\nthird"
print(re.findall(r"^\\w+", text))  # ['first']
print(re.findall(r"^\\w+", text, re.MULTILINE))  # ['first', 'Second', 'third']
print(re.findall(r"^s\\w+", text, re.M | re.I))  # ['Second']
phone = re.compile(r"""
    (\\d{3})   # area code
    [-.\\s]?   # optional separator
    (\\d{4})   # number
""", re.VERBOSE)
print(phone.findall("call 555-1234 or 555.9876"))  # [('555', '1234'), ('555', '9876')]

# Raw strings: without r"", "\\b" is a backspace character, not a word boundary
print(re.findall("\\bcat\\b", "cat scat cat"), re.findall(r"\\bcat\\b", "cat scat cat"))` },
      { label: `Compiled patterns, lookarounds, Unicode, escaping, atomic groups and classic bugs`, code: `# Compiling, lookarounds, Unicode, escaping, backtracking and two classic bugs
import re

# A compiled pattern is an object with the same methods; re caches compiled patterns too
EMAIL = re.compile(r"[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+")
print(EMAIL.pattern, EMAIL.flags == re.UNICODE)
print(EMAIL.findall("mail ann@example.com or bob.smith+x@mail.co.uk now"))

# (?:...) groups without capturing, so findall is not affected
print(re.findall(r"(?:ab)+", "ababab abx"))  # ['ababab', 'ab']

# Lookahead: every condition checked from the same position, nothing consumed
strong = re.compile(r"^(?=.*\\d)(?=.*[A-Z]).{8,}$")
for pw in ["password", "Password1", "Pass1"]:
    print(pw, bool(strong.match(pw)))

# Lookbehind: amounts preceded by a dollar sign, without the sign
print(re.findall(r"(?<=\\$)\\d+", "cost $30, tax 5, tip $7"))  # ['30', '7']

# str patterns are Unicode-aware: \\d matches any decimal digit
print(re.findall(r"\\d+", "price ٣٤ or 34"))
print(re.findall(r"\\d+", "price ٣٤ or 34", re.ASCII))  # ['34']
print(re.findall(r"\\w+", "naïve café"))  # ['naïve', 'café']

# bytes patterns for bytes input; mixing raises TypeError
print(re.findall(rb"\\d+", b"id=42"))  # [b'42']
try:
    re.findall(r"\\d+", b"id=42")
except TypeError as e:
    print("TypeError:", e)

# re.escape for user input that must match literally
user = "1+1=2?"
print(re.escape(user))
print(bool(re.search(user, "is 1+1=2?")), bool(re.search(re.escape(user), "is 1+1=2?")))  # False True

# Backtracking: a+a matches because a+ gives one "a" back.
# An atomic group or possessive quantifier (3.11+) never gives characters back.
print(re.match(r"(?>a+)b", "aaab") is not None)  # True
print(re.match(r"a++a", "aaaa"))  # None
print(re.match(r"a+a", "aaaa").group())  # aaaa

# Bug 1: flags passed positionally land in count
print(re.sub("a", "x", "AaAaAa", re.I))
print(re.sub("a", "x", "AaAaAa", flags=re.I))  # xxxxxx

# Bug 2: forgetting that match() anchors only at the start, not the end
print(bool(re.match(r"\\d{3}", "1234")), bool(re.fullmatch(r"\\d{3}", "1234")))  # True False

# Bug 3: . does not match a newline unless DOTALL
print(re.search(r"a.b", "a\\nb"), re.search(r"a.b", "a\\nb", re.S) is not None)  # None True

# Match objects are truthy; use the walrus to test and bind
if (m := re.search(r"v(\\d+)\\.(\\d+)", "release v3.11 notes")):
    print(tuple(map(int, m.groups())))` },
    ],
  },
  {
    title: `What is the enum module and when should you use it?`,
    difficulty: "easy",
    seoDescription: `Python enum module: Enum, IntEnum, StrEnum, Flag and auto, how members behave, lookups, aliases, and when an enum beats plain constants.`,
    description: `**Question presented to candidate:**
"What does Python's \`enum\` module give you over plain constants like \`PENDING = 1\`, and how do \`Enum\`, \`IntEnum\`, \`StrEnum\` and \`Flag\` differ? When would you use one?"

**What a strong answer should cover:**
- An \`Enum\` is a class whose members are a fixed set of named singleton objects with a \`.name\` and a \`.value\`; members cannot be reassigned, iterate in definition order, and are looked up with \`Status(2)\` or \`Status["SHIPPED"]\`
- Why it beats magic strings and module constants: typos fail loudly with \`AttributeError\`, readable \`repr\`, type checkers can verify exhaustive \`match\`, and members carry methods and properties
- Plain \`Enum\` members are not equal to their values (\`Status.SHIPPED == 2\` is \`False\`); \`IntEnum\` and \`StrEnum\` (3.11) are subclasses of \`int\`/\`str\`, which helps interop (JSON, databases) but loses type safety
- \`auto()\`, aliases (two names with one value) versus \`@unique\` / \`@verify(UNIQUE)\`, and \`Flag\` / \`IntFlag\` for combinable bit flags with \`|\` and \`in\`
- Version details: \`enum\` arrived in 3.4 (PEP 435), \`auto\` and \`Flag\` in 3.6, \`StrEnum\`, \`ReprEnum\` and \`verify\` in 3.11, which also changed \`format()\` of \`str\`/\`int\` mixins; \`1 in Status\` raises \`TypeError\` on 3.11 but returns \`True\`/\`False\` on 3.12+
- When not to: open-ended or user-defined sets of values, or values loaded at runtime

**Code / implementation expected:** Optional — define an order-status enum, look members up from external values, and use it in \`match\`.`,
    answer: `**Target Audience:** Python beginners and intermediate developers who use strings or numbers as status codes and want to know what \`enum\` adds
**Difficulty:** Easy
**Python version:** Checked on CPython 3.11 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3); differences in 3.12 are called out where we ran them

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A traffic light has three states: red, amber, green. Not "Red", not "rde", not 4. If you model it in code with strings, nothing stops a colleague from writing \`if light == "gren":\`. The comparison is simply \`False\` forever, no error, and the car never moves. That is exactly what \`ship_str("shipped")\` in Example 2 does: a typo in \`"shiped"\` and the "notify customer" branch silently never runs.

An enumeration fixes the menu: there are exactly these three choices, each has a name, and anything else is an error the moment you type it. \`Status.SHIPED\` raises \`AttributeError\` immediately.

## 2. What an Enum Is

📌 **Interview term: enumeration (\`enum.Enum\`)** — a class whose attributes are a fixed set of named constants. The \`enum\` module was added in Python 3.4 by [PEP 435](https://peps.python.org/pep-0435/), whose authors describe an enumeration as "a set of symbolic names bound to unique, constant values".

~~~python
from enum import Enum

class Status(Enum):
    PENDING = 1
    SHIPPED = 2
    DELIVERED = 3
~~~

📌 **Interview term: member** — each name in the class body (\`Status.SHIPPED\`). A member is an instance of \`Status\`, with a \`.name\` (\`"SHIPPED"\`) and a \`.value\` (\`2\`).

What you get for free (all from Example 1):

| Feature | Code | Result |
| :--- | :--- | :--- |
| readable output | \`print(Status.SHIPPED)\`, \`repr(...)\` | \`Status.SHIPPED\`, \`<Status.SHIPPED: 2>\` |
| lookup by value | \`Status(3)\` | \`Status.DELIVERED\`; \`Status(9)\` raises \`ValueError\` |
| lookup by name | \`Status["PENDING"]\` | \`Status.PENDING\` |
| iteration in order | \`[s.name for s in Status]\` | \`['PENDING', 'SHIPPED', 'DELIVERED']\` |
| size and membership | \`len(Status)\`, \`Status.PENDING in Status\` | \`3 True\` |
| no reassignment | \`Status.PENDING = 5\` | \`AttributeError: cannot reassign member 'PENDING'\` |

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="The class Status holds three member objects; each member is an instance of Status with a name and a value">
  <rect class="d-box-accent" x="260" y="20" width="200" height="56" rx="8"/>
  <text class="d-text" x="360" y="54" text-anchor="middle">class Status(Enum)</text>
  <rect class="d-box" x="30" y="140" width="200" height="70" rx="8"/>
  <text class="d-text" x="130" y="168" text-anchor="middle">Status.PENDING</text>
  <text class="d-sub" x="130" y="192" text-anchor="middle">name PENDING, value 1</text>
  <rect class="d-box" x="260" y="140" width="200" height="70" rx="8"/>
  <text class="d-text" x="360" y="168" text-anchor="middle">Status.SHIPPED</text>
  <text class="d-sub" x="360" y="192" text-anchor="middle">name SHIPPED, value 2</text>
  <rect class="d-box" x="490" y="140" width="200" height="70" rx="8"/>
  <text class="d-text" x="590" y="168" text-anchor="middle">Status.DELIVERED</text>
  <text class="d-sub" x="590" y="192" text-anchor="middle">name DELIVERED, value 3</text>
  <path class="d-edge" d="M 320 76 L 150 138"/>
  <path class="d-edge" d="M 360 76 L 360 138"/>
  <path class="d-edge" d="M 400 76 L 570 138"/>
</svg>

The members are created once, when the class statement runs, and are the only instances of \`Status\` that will ever exist.

📌 **Interview term: singleton member** — there is exactly one object per member. \`Status(2) is Status.SHIPPED\` is \`True\`, \`copy.deepcopy\` and \`pickle\` return the same object (Example 2), so comparing with \`is\` is safe and members make good dict keys.

### What CPython builds

The class statement is processed by the metaclass \`enum.EnumType\` (3.11 renamed \`EnumMeta\` to \`EnumType\` and kept the old name as an alias; on our run \`enum.EnumMeta is enum.EnumType\` is \`True\`; see [metaclasses](/interview-question/what-is-a-metaclass)). It replaces each class attribute with a member object and records them. On our 3.11 run:

~~~text
>>> type(Status)
<class 'enum.EnumType'>
>>> type(Status.__members__).__name__
'mappingproxy'
>>> Status._value2member_map_
{1: <Status.PENDING: 1>, 2: <Status.SHIPPED: 2>, 3: <Status.DELIVERED: 3>}
~~~

\`__members__\` is a read-only mapping of every name (aliases included) to its member, and the private \`_value2member_map_\` dict is why \`Status(2)\` is a fast hash lookup rather than a scan.

## 3. Values, auto() and Aliases

📌 **Interview term: \`auto()\`** — lets the enum pick the value; for \`Enum\` it counts up from 1. \`auto\` (and \`Flag\`) were added in Python 3.6 per the [enum docs](https://docs.python.org/3.11/library/enum.html). For \`StrEnum\`, \`auto()\` produces the lower-cased member name (\`Env.PROD.value == "prod"\`).

📌 **Interview term: alias** — a second name with the same value as an earlier member. \`CRIMSON = 1\` after \`RED = auto()\` makes \`Color.CRIMSON is Color.RED\` true. Aliases do not appear when you iterate (\`['RED', 'GREEN']\`) but do appear in \`__members__\`. Forbid them with the \`@unique\` decorator: Example 1 shows \`ValueError: duplicate values found in <enum 'Bad'>: B -> A\`.

Python 3.11 added \`@verify(...)\` for more checks, such as \`CONTINUOUS\` (no missing integer values); Example 2's \`Grade\` with values 1, 2 and 4 raises \`ValueError: invalid enum 'Grade': missing values 3\`.

## 4. The Family: Enum, IntEnum, StrEnum, Flag

📌 **Interview term: \`IntEnum\` / \`StrEnum\`** — enums whose members are also real \`int\` / \`str\` objects. \`StrEnum\` was added in Python 3.11 (along with \`ReprEnum\`, its base, per the 3.11 changelog). On 3.11 the MRO shows it:

~~~text
>>> IntEnum.__mro__
(<enum 'IntEnum'>, <class 'int'>, <enum 'ReprEnum'>, <enum 'Enum'>, <class 'object'>)
>>> StrEnum.__mro__
(<enum 'StrEnum'>, <class 'str'>, <enum 'ReprEnum'>, <enum 'Enum'>, <class 'object'>)
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="Plain Enum members are only Enum instances; IntEnum members are also int; StrEnum members are also str">
  <rect class="d-box" x="30" y="30" width="200" height="70" rx="8"/>
  <text class="d-text" x="130" y="60" text-anchor="middle">Enum</text>
  <text class="d-sub" x="130" y="84" text-anchor="middle">SHIPPED == 2 is False</text>
  <rect class="d-box-accent" x="260" y="30" width="200" height="70" rx="8"/>
  <text class="d-text" x="360" y="60" text-anchor="middle">IntEnum</text>
  <text class="d-sub" x="360" y="84" text-anchor="middle">is an int too</text>
  <rect class="d-box-accent" x="490" y="30" width="200" height="70" rx="8"/>
  <text class="d-text" x="590" y="60" text-anchor="middle">StrEnum</text>
  <text class="d-sub" x="590" y="84" text-anchor="middle">is a str too</text>
  <rect class="d-box-muted" x="260" y="150" width="200" height="60" rx="8"/>
  <text class="d-text" x="360" y="186" text-anchor="middle">int</text>
  <rect class="d-box-muted" x="490" y="150" width="200" height="60" rx="8"/>
  <text class="d-text" x="590" y="186" text-anchor="middle">str</text>
  <path class="d-edge" d="M 360 100 L 360 148"/>
  <path class="d-edge" d="M 590 100 L 590 148"/>
</svg>

The mixed-in types make members usable anywhere an \`int\` or \`str\` is expected, which is convenient for JSON and databases and is exactly what costs you type safety.

| Type | Members equal their values? | Good for | Watch out |
| :--- | :--- | :--- | :--- |
| \`Enum\` | no | domain states, choices | serialise with \`.value\` |
| \`IntEnum\` | yes (\`Priority.HIGH == 3\`) | HTTP codes, C/OS constants, ordering | equals unrelated \`IntEnum\`s with the same number |
| \`StrEnum\` (3.11+) | yes (\`Env.PROD == "prod"\`) | config values, JSON, CLI choices | equals any string with that text |
| \`Flag\` / \`IntFlag\` | — | combinable options (permissions) | values should be powers of two (\`auto()\` does it) |

📌 **Interview term: \`Flag\`** — an enum whose members combine with \`|\`, \`&\`, \`^\` and \`~\`. \`Perm.READ | Perm.WRITE\` prints \`Perm.READ|WRITE\`, \`Perm.WRITE in rw\` is \`True\` and its \`.value\` is \`3\`.

Example 2 shows the \`IntEnum\` trap: \`Http.OK == Score.PERFECT\` is \`True\` because both are just \`200\`. A plain \`Enum\` would never confuse a status code with a score.

## 5. Enums in Real Code

- **Parse external input at the boundary**: \`Status(row["status"])\` turns a database or JSON string into a member and rejects unknown values with \`ValueError\`. Override the classmethod \`_missing_\` to accept variants such as different case (Example 2: \`Level("HIGH")\` works).
- **Serialise on the way out**: \`json.dumps(Status.SHIPPED)\` raises \`TypeError: Object of type Status is not JSON serializable\`; use \`.value\`, or a \`StrEnum\`, whose members are strings already (see [JSON conversion](/interview-question/how-do-you-convert-between-python-objects-and-json)).
- **Pattern matching**: \`case Status.PENDING:\` is a value pattern (dotted names compare with \`==\`), and type checkers can warn when you forget a member; see [match/case exhaustiveness](/interview-question/how-do-you-enforce-match-case-exhaustiveness-in-python).
- **Behaviour on the enum**: methods and properties live on the class. The \`Planet\` example uses \`__init__\` to unpack a tuple value into \`mass\` and \`radius\` and a \`gravity\` property (Earth prints \`9.8\`).
- **Functional API**: \`Enum("Animal", "CAT DOG BIRD")\` builds an enum at runtime, values \`1, 2, 3\`.

## 6. Version Differences Worth Knowing

- **\`format()\` of mixed-in enums changed in 3.11.** For a \`class Mixed(str, Enum)\`, \`f"{Mixed.A}"\` printed \`Mixed.A\` on our 3.11 and 3.12 runs, the same as \`str()\`. On 3.10 and earlier it returned the value \`"a"\`; this broke code that relied on it ([write-up](https://pycoders.com/link/10097/web)). If you want the value in strings, use \`StrEnum\` (whose \`str()\` is the value) or write \`.value\`.
- **\`in\` with a non-member.** \`1 in Status\` raises \`TypeError\` on 3.11 (with a \`DeprecationWarning\` announcing the change), and returned \`True\` on our 3.12 and 3.13 runs, because 3.12 checks values too. Code that must run on both should test \`Status.PENDING in Status\` or use \`try: Status(value)\`.
- **Error messages differ**: \`Status.SHIPED\` printed \`AttributeError: SHIPED\` on 3.11 and \`type object 'Status' has no attribute 'SHIPED'\` on 3.12.

## 7. Verified: Running the Code

Both examples were run with \`python3.11 main.py\` and again in this page (Pyodide 0.25.1), with identical output.

**Example 1 — Enum, auto, aliases, IntEnum, StrEnum, Flag and enums with methods** prints:

~~~text
Status.SHIPPED
<Status.SHIPPED: 2>
SHIPPED 2
Status True
Status.DELIVERED Status.PENDING
ValueError: 9 is not a valid Status
['PENDING', 'SHIPPED', 'DELIVERED']
3 True
True
False
AttributeError: cannot reassign member 'PENDING'
1 2 True
['RED', 'GREEN'] ['RED', 'GREEN', 'CRIMSON']
ValueError: duplicate values found in <enum 'Bad'>: B -> A
True True 4
True prod DEV
Perm.READ|WRITE True False 3
9.8 (5.976e+24, 6378140.0)
~~~

**Example 2 — enums in real code: match/case, _missing_, JSON, verify and gotchas** prints:

~~~text
nothing
AttributeError: SHIPED
on its way
Level.HIGH Level.LOW
TypeError: Object of type Status is not JSON serializable
{"status": "shipped"}
{"env": "prod"}
[<Animal.CAT: 1>, <Animal.DOG: 2>, <Animal.BIRD: 3>] 2
ValueError: invalid enum 'Grade': missing values 3
Mixed.A Mixed.A True
True True
(1,) 2
True True
5
~~~

**What the output shows:** members print with their class, look up by value and name, iterate in order without aliases, refuse reassignment, and plain members do not equal their values while \`IntEnum\` and \`StrEnum\` members do. The second program shows the silent magic-string typo versus the loud \`AttributeError\`, \`match\` on members, case-insensitive parsing via \`_missing_\`, the JSON \`TypeError\`, \`verify(CONTINUOUS)\` catching the missing 3, the \`IntEnum\` cross-type equality, and the trailing-comma tuple \`(1,)\`.

## Common Pitfalls

- **Comparing a plain \`Enum\` member with its value.** \`Status.SHIPPED == 2\` is \`False\`; convert the input with \`Status(2)\` first.
- **A trailing comma in a value.** \`S = 1,\` makes the value the tuple \`(1,)\`, so \`Size(1)\` fails.
- **Using \`IntEnum\` or \`StrEnum\` everywhere.** They equal raw ints and strings and members of other enums, which brings back the bugs enums are for. Use them only when interop needs it.
- **Relying on \`str()\` or f-strings for the value.** Use \`.value\` explicitly; the formatting of mixed-in enums changed in 3.11.
- **Accidental aliases.** Two members with the same value silently become one; add \`@unique\` when the values matter.
- **Enums for open sets.** Product categories that users can add belong in a database table, not a class.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Enum</code> is a class whose members are a fixed set of named singleton constants, each with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.name</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code>. It has been in the standard library since 3.4 (PEP 435).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why:</strong> <span style="color:#f0e2c8;">Typos fail loudly, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">repr</code> is readable, members cannot be reassigned, you can iterate and look up by value or name, and type checkers can check exhaustive <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">match</code> statements.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Equality:</strong> <span style="color:#f0e2c8;">Plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Enum</code> members do not equal their values, which keeps domains separate. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IntEnum</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StrEnum</code> (3.11) subclass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> for JSON and database interop, at the cost of that safety.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Tools:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">auto()</code> picks values, aliases share a value unless you add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@unique</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@verify</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Flag</code> combines members with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">|</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;missing&#95;</code> customises lookup of external values.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When:</strong> <span style="color:#f0e2c8;">Use one for any closed set of states or options known at coding time; parse input with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Status(value)</code> at the boundary and serialise with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get a member from a string coming from the database?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Status(value)</code> if the string is the value, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Status[name]</code> if it is the name. Both raise (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValueError</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">KeyError</code>) for unknown input; override <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;missing&#95;</code> to accept variants.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why would you prefer <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Enum</code> over <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">IntEnum</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IntEnum</code> members equal plain ints and members of other <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IntEnum</code>s with the same number, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Http.OK == Score.PERFECT</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>. A plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Enum</code> keeps those apart; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IntEnum</code> only when the value must act as an int.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make an enum JSON serialisable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Dump <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.value</code>, use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StrEnum</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IntEnum</code> whose members already are strings or ints, or pass a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">default=</code> function to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">json.dumps</code> that returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.value</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Flag</code> for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Options that combine, like permissions: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Perm.READ | Perm.WRITE</code>, tested with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">auto()</code> assigns powers of two so every combination has a unique value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are enum members singletons?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The metaclass creates each member once; lookups, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copy.deepcopy</code> and unpickling return the same object, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code> comparisons are safe.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **enumeration (\`enum.Enum\`)** | a class with a fixed set of named constant members |
| **member** | one named constant, an instance of the enum class with \`.name\` and \`.value\` |
| **singleton member** | exactly one object exists per member, so \`is\` works |
| **\`auto()\`** | lets the enum choose the value |
| **alias** | a second name for an existing member's value |
| **\`IntEnum\` / \`StrEnum\`** | enums whose members are also \`int\` / \`str\` |
| **\`Flag\`** | an enum whose members combine with bitwise operators |

---
**Conclusion:** The \`enum\` module turns a closed set of choices into a real type: a typo becomes an \`AttributeError\`, values are validated on lookup, members are readable singletons that can carry behaviour, and type checkers can check that every case is handled. Use a plain \`Enum\` by default, \`IntEnum\` or \`StrEnum\` only where values must behave as ints or strings, \`Flag\` for combinable options, and convert at the edges with \`Status(value)\` and \`.value\`. Related: [dataclasses](/interview-question/what-are-dataclasses), the other standard-library way to replace loose dicts and constants with real types.
`,
    examples: [
      { label: `Enum, auto, aliases, IntEnum, StrEnum, Flag and enums with methods`, code: `# Enum basics: named constants that are real objects
from enum import Enum, IntEnum, StrEnum, Flag, auto, unique

class Status(Enum):
    PENDING = 1
    SHIPPED = 2
    DELIVERED = 3

print(Status.SHIPPED)  # Status.SHIPPED
print(repr(Status.SHIPPED))  # <Status.SHIPPED: 2>
print(Status.SHIPPED.name, Status.SHIPPED.value)  # SHIPPED 2
print(type(Status.SHIPPED).__name__, isinstance(Status.SHIPPED, Status))  # Status True

# Look up by value and by name
print(Status(3), Status["PENDING"])  # Status.DELIVERED Status.PENDING
try:
    Status(9)
except ValueError as e:
    print("ValueError:", e)

# Iterate in definition order, count, and membership
print([s.name for s in Status])  # ['PENDING', 'SHIPPED', 'DELIVERED']
print(len(Status), Status.PENDING in Status)  # 3 True

# Members are singletons: compare with is (or ==); plain Enum is not an int
print(Status(2) is Status.SHIPPED)  # True
print(Status.SHIPPED == 2)  # False

# Members cannot be reassigned or added later
try:
    Status.PENDING = 5
except AttributeError as e:
    print("AttributeError:", e)

# auto() picks values; aliases share a value and point to the first name
class Color(Enum):
    RED = auto()
    GREEN = auto()
    CRIMSON = 1
print(Color.RED.value, Color.GREEN.value, Color.CRIMSON is Color.RED)  # 1 2 True
print([c.name for c in Color], list(Color.__members__))  # ['RED', 'GREEN'] ['RED', 'GREEN', 'CRIMSON']

try:
    @unique
    class Bad(Enum):
        A = 1
        B = 1
except ValueError as e:
    print("ValueError:", e)

# IntEnum and StrEnum members ARE ints / strs
class Priority(IntEnum):
    LOW = 1
    HIGH = 3
print(Priority.HIGH == 3, Priority.HIGH > Priority.LOW, Priority.HIGH + 1)  # True True 4

class Env(StrEnum):
    DEV = auto()
    PROD = auto()
print(Env.PROD == "prod", f"{Env.PROD}", Env.DEV.upper())  # True prod DEV

# Flag: members combine with | and test with in
class Perm(Flag):
    READ = auto()
    WRITE = auto()
    EXEC = auto()
rw = Perm.READ | Perm.WRITE
print(rw, Perm.WRITE in rw, Perm.EXEC in rw, rw.value)  # Perm.READ|WRITE True False 3

# Enums can carry behaviour
class Planet(Enum):
    MERCURY = (3.303e23, 2.4397e6)
    EARTH = (5.976e24, 6.37814e6)
    def __init__(self, mass, radius):
        self.mass, self.radius = mass, radius
    @property
    def gravity(self):
        return 6.673e-11 * self.mass / self.radius ** 2
print(round(Planet.EARTH.gravity, 2), Planet.EARTH.value)  # 9.8 (5.976e+24, 6378140.0)` },
      { label: `Enums in real code: match/case, _missing_, JSON, verify and gotchas`, code: `# Enums in real code: replacing magic strings, match/case, parsing, JSON, gotchas
import json
from enum import Enum, IntEnum, StrEnum, auto, verify, UNIQUE, CONTINUOUS

# The bug enums prevent: a typo in a magic string fails silently
def ship_str(order_status):
    if order_status == "shiped":     # typo, never true
        return "notify customer"
    return "nothing"
print(ship_str("shipped"))  # nothing

class Status(Enum):
    PENDING = "pending"
    SHIPPED = "shipped"
try:
    Status.SHIPED
except AttributeError as e:
    print("AttributeError:", e)

# match/case on members (dotted names are value patterns)
def describe(s):
    match s:
        case Status.PENDING:
            return "waiting"
        case Status.SHIPPED:
            return "on its way"
print(describe(Status("shipped")))  # on its way

# Parsing external input: _missing_ lets you accept variants
class Level(Enum):
    LOW = "low"
    HIGH = "high"
    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            for m in cls:
                if m.value == value.lower():
                    return m
        return None
print(Level("HIGH"), Level("low"))  # Level.HIGH Level.LOW

# JSON: a plain Enum is not serialisable; StrEnum / IntEnum are
try:
    json.dumps({"status": Status.SHIPPED})
except TypeError as e:
    print("TypeError:", e)
print(json.dumps({"status": Status.SHIPPED.value}))  # {"status": "shipped"}
class Env(StrEnum):
    PROD = auto()
print(json.dumps({"env": Env.PROD}))  # {"env": "prod"}

# Functional API: build an enum at runtime
Animal = Enum("Animal", "CAT DOG BIRD")
print(list(Animal), Animal.DOG.value)

# verify (3.11+): check constraints when the class is created
try:
    @verify(CONTINUOUS)
    class Grade(IntEnum):
        A = 1
        B = 2
        D = 4
except ValueError as e:
    print("ValueError:", e)

# Gotcha 1: the str() of a mixed-in enum is the member name for Enum + str
class Mixed(str, Enum):
    A = "a"
print(str(Mixed.A), f"{Mixed.A}", Mixed.A == "a")  # Mixed.A Mixed.A True

# Gotcha 2: IntEnum compares equal to unrelated IntEnums with the same number
class Http(IntEnum):
    OK = 200
class Score(IntEnum):
    PERFECT = 200
print(Http.OK == Score.PERFECT, Http.OK == 200)  # True True

# Gotcha 3: a trailing comma makes a tuple value
class Size(Enum):
    S = 1,
    M = 2
print(Size.S.value, Size.M.value)  # (1,) 2

# Members are hashable singletons: good dict keys, and pickle/copy keep identity
import copy, pickle
print(copy.deepcopy(Status.PENDING) is Status.PENDING, pickle.loads(pickle.dumps(Status.SHIPPED)) is Status.SHIPPED)  # True True
prices = {Status.PENDING: 0, Status.SHIPPED: 5}
print(prices[Status("shipped")])  # 5` },
    ],
  },
  {
    title: `How does the logging module work?`,
    difficulty: "medium",
    seoDescription: `How Python logging works: the logger tree, levels, handlers, formatters, propagation, lazy formatting, basicConfig vs dictConfig, and libraries.`,
    description: `**Question presented to candidate:**
"Explain how Python's \`logging\` module works. What are loggers, handlers and formatters, how does a log call decide whether and where to output something, and how would you set up logging for an application versus a library?"

**What a strong answer should cover:**
- Loggers come from \`logging.getLogger(__name__)\` and form a tree by dotted name under the root logger; each has a level, and an unset level (\`NOTSET\`) inherits the nearest ancestor's (the root defaults to \`WARNING\`)
- The flow of a record: logger level check, logger filters, then every handler on that logger and, while \`propagate\` is true, on each ancestor; each handler has its own level, filters and formatter
- Handlers decide the destination (\`StreamHandler\`, \`FileHandler\`, \`RotatingFileHandler\`, \`QueueHandler\`), formatters the text (\`%(asctime)s %(levelname)s %(name)s %(message)s\`)
- Use \`%\`-style arguments (\`log.info("user %s", uid)\`) so formatting is skipped when the record is filtered out; \`log.exception()\` inside \`except\` adds the traceback; \`extra=\` or a \`LoggerAdapter\` add context fields
- Configuration: \`basicConfig\` once at the application entry point (a no-op if the root already has handlers, unless \`force=True\`, added in 3.8), or \`dictConfig\` for real apps; libraries only call \`getLogger\` and add a \`NullHandler\`, never configure the root
- Pitfalls: duplicate lines from handlers on both a child and the root, \`disable_existing_loggers\` defaulting to true in \`dictConfig\`, and the last-resort handler that prints WARNING and above to stderr when nothing is configured

**Code / implementation expected:** Optional — configure a handler and formatter, show a module logger inheriting a level, and one propagation or \`exception()\` example.`,
    answer: `**Target Audience:** Python developers who use \`print\` for diagnostics, or who have fought duplicated or missing log lines, and want to understand how \`logging\` routes a message
**Difficulty:** Medium
**Python version:** Checked on CPython 3.11 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3); 3.12 additions were checked on python3.12

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Think of a large office mail room. Every department writes notes: "printer jammed", "invoice 42 failed", "server on fire". Each note is stamped with how urgent it is. The mail room then decides, per note: does anyone care about this urgency? Which inboxes does it go to — the department's own tray, the floor manager's, the head office's? Should it be typed up neatly with a time and the sender's name first?

\`print()\` is shouting across the office: everything goes to one place, always, with no urgency and no sender. Python's \`logging\` module is the mail room. The code that *writes* a message (often a library you did not write) is separated from the code that *decides* what to do with it (your application's configuration). That separation is the whole design, and once you see it, every confusing logging behaviour has a simple explanation.

## 2. The Four Parts

📌 **Interview term: logger** — the object your code calls (\`log.info(...)\`). Get one with \`logging.getLogger(name)\`; the same name always returns the same object, and the convention is \`logging.getLogger(__name__)\`, so loggers are named after modules.

📌 **Interview term: log record (\`LogRecord\`)** — the object a log call creates, holding the message template and arguments, the level, the logger name, the source line, the time, the thread, and the exception info. Formatters read its attributes (\`%(levelname)s\`, \`%(name)s\`, \`%(lineno)d\` ...).

📌 **Interview term: handler** — decides *where* a record goes: \`StreamHandler\` (a stream such as stdout or stderr), \`FileHandler\`, \`RotatingFileHandler\` and \`TimedRotatingFileHandler\` in \`logging.handlers\`, \`SysLogHandler\`, \`QueueHandler\`, or your own subclass with an \`emit\` method.

📌 **Interview term: formatter** — decides *how* a record looks, using a format string such as \`"%(asctime)s %(levelname)-8s %(name)s: %(message)s"\`. Each handler has one.

Plus **filters**, which can sit on loggers or handlers and drop or modify records.

## 3. Levels

📌 **Interview term: log level** — a number for severity. The standard ones (Example 1 prints them):

| Level | Value | Use for |
| :--- | :--- | :--- |
| \`DEBUG\` | 10 | detail for diagnosing problems |
| \`INFO\` | 20 | normal events (started, request served) |
| \`WARNING\` | 30 | something unexpected, still working |
| \`ERROR\` | 40 | an operation failed |
| \`CRITICAL\` | 50 | the program may not continue |

A record passes a logger if \`record.levelno >= logger.getEffectiveLevel()\`.

📌 **Interview term: effective level** — a logger whose own level is \`NOTSET\` (0) uses the level of its nearest ancestor that has one. The root logger's default is \`WARNING\`, which is why \`log.info()\` prints nothing in a fresh program. In Example 1, \`shop.db\` has \`db.level == 0\` and an effective level of \`30\` until we call \`db.setLevel(logging.DEBUG)\`.

## 4. The Logger Tree

Dots in names build a hierarchy: \`shop.db\` is a child of \`shop\`, which is a child of the root logger. Example 1 prints \`True True True\` for \`db.parent is app\`, \`app.parent is root\` and \`getLogger("shop.db") is db\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Logger tree: the root logger at the top, shop below it, and shop.db and shop.api below shop">
  <rect class="d-box-accent" x="260" y="20" width="200" height="60" rx="8"/>
  <text class="d-text" x="360" y="46" text-anchor="middle">root</text>
  <text class="d-sub" x="360" y="68" text-anchor="middle">level WARNING, handler</text>
  <rect class="d-box" x="260" y="120" width="200" height="60" rx="8"/>
  <text class="d-text" x="360" y="146" text-anchor="middle">shop</text>
  <text class="d-sub" x="360" y="168" text-anchor="middle">level NOTSET</text>
  <rect class="d-box" x="80" y="220" width="220" height="60" rx="8"/>
  <text class="d-text" x="190" y="246" text-anchor="middle">shop.db</text>
  <text class="d-sub" x="190" y="268" text-anchor="middle">level DEBUG</text>
  <rect class="d-box" x="420" y="220" width="220" height="60" rx="8"/>
  <text class="d-text" x="530" y="246" text-anchor="middle">shop.api</text>
  <text class="d-sub" x="530" y="268" text-anchor="middle">level NOTSET</text>
  <path class="d-edge" d="M 360 80 L 360 118"/>
  <path class="d-edge" d="M 320 180 L 200 218"/>
  <path class="d-edge" d="M 400 180 L 520 218"/>
</svg>

\`shop.api\` has no level, so it uses the root's \`WARNING\`; \`shop.db\` was set to \`DEBUG\`, so only that subtree becomes chatty. This is how you turn on detail for one noisy component without drowning in everything else.

Under the hood, \`logging.Logger.manager.loggerDict\` holds every logger created so far, and \`getLogger\` fixes up parent links when a parent is created after its child.

## 5. What Happens on One Log Call

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="Flow of a log call: check the logger effective level, run logger filters, create the record, pass it to each handler of the logger, then while propagate is true pass it to the handlers of each ancestor; each handler checks its own level and filters and formats">
  <defs>
    <marker id="lg1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="200" height="70" rx="8"/>
  <text class="d-text" x="120" y="60" text-anchor="middle">log.info(...)</text>
  <text class="d-sub" x="120" y="82" text-anchor="middle">level enabled?</text>
  <rect class="d-box" x="280" y="30" width="200" height="70" rx="8"/>
  <text class="d-text" x="380" y="60" text-anchor="middle">make LogRecord</text>
  <text class="d-sub" x="380" y="82" text-anchor="middle">logger filters</text>
  <rect class="d-box-accent" x="540" y="30" width="200" height="70" rx="8"/>
  <text class="d-text" x="640" y="60" text-anchor="middle">own handlers</text>
  <text class="d-sub" x="640" y="82" text-anchor="middle">level, filter, format</text>
  <rect class="d-box-accent" x="540" y="210" width="200" height="70" rx="8"/>
  <text class="d-text" x="640" y="240" text-anchor="middle">parent handlers</text>
  <text class="d-sub" x="640" y="262" text-anchor="middle">if propagate is True</text>
  <rect class="d-box-muted" x="280" y="210" width="200" height="70" rx="8"/>
  <text class="d-text" x="380" y="240" text-anchor="middle">no handler at all</text>
  <text class="d-sub" x="380" y="262" text-anchor="middle">lastResort to stderr</text>
  <path class="d-edge" d="M 220 65 L 274 65" marker-end="url(#lg1-arrow)"/>
  <path class="d-edge" d="M 480 65 L 534 65" marker-end="url(#lg1-arrow)"/>
  <path class="d-edge" d="M 640 100 L 640 204" marker-end="url(#lg1-arrow)"/>
  <path class="d-edge-dashed" d="M 540 245 L 486 245" marker-end="url(#lg1-arrow)"/>
</svg>

Step by step, as Example 1 demonstrates:

1. **Logger level check.** \`isEnabledFor(level)\` compares with the effective level; if it fails, nothing else happens (no record is even created).
2. **Record creation and logger filters.** A \`LogRecord\` is built; filters on the logger may drop it.
3. **Handlers of this logger**, then, while the current logger's \`propagate\` is \`True\`, **handlers of each ancestor**. Ancestor *levels* are not checked again; only their handlers' levels and filters are.
4. **Each handler** checks its own level, runs its filters, formats with its formatter and emits.
5. If no handler was found anywhere in the chain, the **last-resort handler** prints the message to stderr, but only for \`WARNING\` and above.

📌 **Interview term: propagation** — the record bubbling up to ancestor handlers. It is why the usual setup puts handlers only on the root logger, and why adding a handler to a child *as well* prints every line twice: Example 1's \`"printed twice"\` appears once from the \`db\` handler and once from the root handler, until \`db.propagate = False\`.

📌 **Interview term: handler level** — a second filter on the handler itself. With the logger at \`WARNING\` and the handler at \`ERROR\`, a \`warning()\` passes the logger but is dropped by the handler (Example 1's last two calls).

📌 **Interview term: last-resort handler (\`logging.lastResort\`)** — a stderr handler with level \`WARNING\` used when no handler exists. Example 2 captures it: \`'no handlers configured\\n'\`, with no level or name, because it uses a bare \`%(message)s\` format.

## 6. Writing Log Calls Well

**Use \`%\`-style arguments, not f-strings.** \`log.debug("query took %s ms", ms)\` stores the template and the arguments; the string is built only if a handler emits the record. Example 1's \`Expensive\` object counts its \`__str__\` calls: \`0\` after a filtered \`debug()\`, \`1\` after an emitted \`warning()\`. With \`log.debug(f"... {obj}")\` the formatting cost is paid every time, even when DEBUG is off. It also keeps one template per message, which log aggregators can group. For really expensive computations, guard with \`if log.isEnabledFor(logging.DEBUG):\`.

**\`log.exception()\` inside \`except\`.** It logs at \`ERROR\` and attaches the current exception, so the formatter appends the traceback. Example 1 shortens the traceback with a custom \`formatException\` (only so the output is identical on every machine); a normal formatter prints the full traceback. Use \`log.error(..., exc_info=True)\` for the same at another level.

**Add context with \`extra=\` or a \`LoggerAdapter\`.** \`log.warning("slow query", extra={"request_id": "r-17"})\` puts \`request_id\` on the record for \`%(request_id)s\`. A \`LoggerAdapter(logger, {"request_id": "r-18"})\` adds it to every call. If a format string uses a field that a record does not have, logging does not crash: on our run it printed \`--- Logging error ---\` and a traceback ending in \`ValueError: Formatting field not found in record: 'missing'\` to stderr, and carried on.

**Logging errors never crash your program.** That is controlled by \`logging.raiseExceptions\` (\`True\` by default, meaning "print the error to stderr", not "raise").

## 7. Configuring It: Application vs Library

**Libraries** call \`logging.getLogger(__name__)\` and log. They do not add \`StreamHandler\`s, set levels on the root, or call \`basicConfig\`. The standard advice is to add a \`NullHandler\` to the library's top-level logger: it does nothing, but because a handler exists, the last-resort handler does not print the library's warnings when the application did not configure logging (Example 2 shows \`stderr got: ''\`).

**Applications** configure once, at the entry point, ideally before anything logs.

📌 **Interview term: \`logging.basicConfig\`** — one-call setup of the root logger: a handler (stderr by default, or \`stream=\` / \`filename=\`), a format and a level. It does **nothing** if the root logger already has handlers; \`force=True\`, added in Python 3.8, removes and closes them first (per the [3.8 docs](https://docs.python.org/3.8/library/logging.html#logging.basicConfig)). Example 2: the second \`basicConfig\` is ignored (\`A INFO first config wins\`), the third with \`force=True\` takes over.

📌 **Interview term: \`logging.config.dictConfig\`** — declarative configuration from a dict (often loaded from YAML, TOML or JSON) with \`formatters\`, \`filters\`, \`handlers\`, \`loggers\` and \`root\`. Example 2 sends \`api\` to stdout at \`INFO\` without propagation, drops \`/health\` lines with a filter, and keeps everything else at \`WARNING\`. The \`"()"\` key names a factory for a custom filter or formatter.

Set \`"disable_existing_loggers": False\` unless you mean otherwise: its default is \`True\`, which disables every logger created *before* the call (on our run a logger made before \`dictConfig({"version": 1})\` had \`disabled == True\` afterwards). Module-level \`log = logging.getLogger(__name__)\` lines run at import time, so this silently mutes them.

**Performance and threads.** Handlers hold an \`RLock\` (\`handler.lock\`), so logging from several threads is safe. Slow handlers (network, slow disks) block the caller; the pattern is a \`QueueHandler\` on the root that puts records on a queue and a \`QueueListener\` thread that feeds the real handlers.

**3.12 additions we checked by running:** \`logging.getHandlerByName()\` exists on 3.12 and 3.13 but not 3.11, and \`LogRecord\` gained a \`taskName\` attribute (the asyncio task name) on 3.12; neither is used in the examples because the page runs 3.11.

## 8. Verified: Running the Code

Both examples were run with \`python3.11 main.py\` and again in this page (Pyodide 0.25.1), with identical output. All handlers write to \`sys.stdout\` so the output can be quoted; in a real app the default is stderr.

**Example 1 — loggers, levels, handlers, formatters, exception() and propagation** prints:

~~~text
True True True
10 20 30 40 50
0 30
WARNING  shop.db: pool at 91%
DEBUG    shop.db: query took 12 ms
formatted 0 times
WARNING  shop: value expensive
formatted 1 times
ERROR    shop: checkout failed for order 42
  traceback: ZeroDivisionError: division by zero
[db handler] printed twice: by db handler and by root handler
ERROR    shop.db: printed twice: by db handler and by root handler
[db handler] printed once: propagation off
ERROR    shop: kept by the handler level
hi bob INFO 7
Level 25 40
~~~

**Example 2 — basicConfig, the last-resort handler, NullHandler, dictConfig, filters and context** prints:

~~~text
stderr got: 'no handlers configured\\n'
stderr got: ''
A INFO first config wins
C app force=True replaced the handler
INFO [api] GET /orders 200
WARNING req=r-17 slow query
WARNING req=r-18 payment declined
[('ERROR', 'disk /var full')]
~~~

**What the output shows:** the INFO on \`shop.db\` vanished while its level was inherited, \`%d%%\` formatted lazily into \`91%\`, \`DEBUG\` appeared only for the subtree we turned up, the \`Expensive\` argument was never formatted for the dropped call, \`exception()\` attached the traceback, the double handler printed one line twice until propagation was turned off, and the handler level dropped the warning. The second program shows the last-resort output, the silent \`NullHandler\`, \`basicConfig\` ignoring its second call until \`force=True\`, the \`/health\` filter, and \`extra\` / \`LoggerAdapter\` context.

## 9. print vs logging

| | \`print()\` | \`logging\` |
| :--- | :--- | :--- |
| Severity | none | DEBUG to CRITICAL, filterable |
| Destination | stdout | any handlers: console, files, syslog, network, queue |
| Metadata | none | time, logger name, module, line, thread, exception |
| Turn off without code changes | no | yes, by configuration |
| Safe in libraries | no | yes, the app decides what to show |
| Formatting cost when unused | always | skipped with \`%\` args |

## Common Pitfalls

- **Calling \`basicConfig\` in a library or after logging started.** In a library it hijacks the app's output; after any logging call (which auto-calls \`basicConfig\` for module-level \`logging.info()\`), your later call is a no-op unless \`force=True\`.
- **Handlers on child loggers and the root.** Propagation prints every line twice; attach handlers to the root (or set \`propagate = False\` deliberately).
- **f-strings in log calls.** They format even when the level is off and defeat message grouping; pass arguments instead.
- **\`logging.info(...)\` (module-level) instead of a named logger.** It logs to the root, so you cannot tune it per module, and on an unconfigured root it calls \`basicConfig()\` for you.
- **\`dictConfig\` with the default \`disable_existing_loggers=True\`.** Loggers created at import time go silent.
- **\`log.error(str(e))\` in \`except\`.** You lose the traceback; use \`log.exception("context")\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The parts:</strong> <span style="color:#f0e2c8;">Loggers (from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getLogger(&#95;&#95;name&#95;&#95;)</code>) create <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LogRecord</code>s; handlers decide where they go; formatters decide how they look; filters can drop or enrich them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Levels and the tree:</strong> <span style="color:#f0e2c8;">Loggers form a tree by dotted name under the root. A record passes if its level is at least the logger effective level, inherited from the nearest ancestor with a level; the root defaults to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WARNING</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Routing:</strong> <span style="color:#f0e2c8;">After the logger check the record goes to that logger handlers and, while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">propagate</code> is true, every ancestor handler, each with its own level and filters. With no handler anywhere, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lastResort</code> prints WARNING and above to stderr.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Good calls:</strong> <span style="color:#f0e2c8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">%</code>-style arguments so formatting only happens when emitted, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">log.exception()</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except</code> for the traceback, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extra=</code> or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LoggerAdapter</code> for request context.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Configuration:</strong> <span style="color:#f0e2c8;">The application configures once at the entry point with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">basicConfig</code> (no-op if already configured, unless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">force=True</code>) or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dictConfig</code>; libraries only add a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NullHandler</code>. Put handlers on the root to avoid duplicates.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">log.info("hello")</code> print nothing in a new script?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The root logger level defaults to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WARNING</code> and there is no handler; the last-resort handler only prints WARNING and above. Call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">logging.basicConfig(level=logging.INFO)</code> at startup.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do my log lines appear twice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A handler is attached both to a child logger and to an ancestor (often root), and propagation sends the record to both. Keep handlers on the root, or set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">propagate = False</code> on the child.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">log.info("x=%s", x)</code> instead of an f-string?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The arguments are only formatted if the record is emitted, so disabled DEBUG calls are nearly free, and the constant template lets log tools group identical messages.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add a request ID to every log line?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LoggerAdapter</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extra=</code> for explicit calls, or a filter that sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">record.request&#95;id</code> from a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contextvars.ContextVar</code>, and add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">%(request&#95;id)s</code> to the format.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep logging from slowing down request handling?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">QueueHandler</code> so the request thread only enqueues the record, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">QueueListener</code> thread that runs the slow file or network handlers.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **logger** | the named object you call to log; part of a dotted-name tree |
| **log record (\`LogRecord\`)** | the object holding one log event and its metadata |
| **handler** | sends records to a destination: stream, file, network, queue |
| **formatter** | turns a record into text with a format string |
| **log level** | the numeric severity: DEBUG 10 up to CRITICAL 50 |
| **effective level** | a logger's own level, or the nearest ancestor's if unset |
| **propagation** | passing a record up to ancestor loggers' handlers |
| **handler level** | a per-handler minimum level, checked after the logger |
| **last-resort handler (\`logging.lastResort\`)** | the stderr handler used when no handler is configured |
| **\`logging.basicConfig\`** | one-call root setup, ignored if the root already has handlers |
| **\`logging.config.dictConfig\`** | declarative configuration from a dictionary |

---
**Conclusion:** \`logging\` separates producing messages from deciding what to do with them. Code everywhere calls a logger named after its module; a record passes the logger's effective level, then flows to that logger's handlers and up the tree through propagation, with each handler applying its own level, filters and formatter. Applications configure this once (handlers on the root, \`basicConfig\` or \`dictConfig\`), libraries only add a \`NullHandler\`, log calls pass arguments instead of pre-formatted strings, and \`exception()\` keeps the traceback. With that model, missing lines, duplicate lines and noisy libraries all have one-line fixes. Related: [exception handling](/interview-question/how-does-exception-handling-work-in-python) and [writing tests](/interview-question/how-do-you-write-tests-in-python-with-unittest-and-pytest), where pytest's \`caplog\` captures records much like Example 2's \`ListHandler\`.
`,
    examples: [
      { label: `Loggers, levels, handlers, formatters, exception() and propagation`, code: `# Loggers, levels, handlers, formatters and propagation
import logging
import sys

class ShortExc(logging.Formatter):
    # keep tracebacks to one line so the output is the same on every machine
    def formatException(self, ei):
        return "  traceback: " + ei[0].__name__ + ": " + str(ei[1])

handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(ShortExc("%(levelname)-8s %(name)s: %(message)s"))
root = logging.getLogger()
root.addHandler(handler)
root.setLevel(logging.WARNING)

# Loggers form a tree by dotted name
app = logging.getLogger("shop")
db = logging.getLogger("shop.db")
print(db.parent is app, app.parent is root, logging.getLogger("shop.db") is db)  # True True True

# Levels are numbers; a record passes if its level >= the effective level
print(logging.DEBUG, logging.INFO, logging.WARNING, logging.ERROR, logging.CRITICAL)  # 10 20 30 40 50
print(db.level, db.getEffectiveLevel())

db.info("not shown: INFO < WARNING inherited from root")
db.warning("pool at %d%%", 91)

# Turn on detail for one subtree only
db.setLevel(logging.DEBUG)
db.debug("query took %s ms", 12)
app.debug("still hidden: shop inherits WARNING")

# Arguments are formatted only if the record is emitted
class Expensive:
    calls = 0
    def __str__(self):
        Expensive.calls += 1
        return "expensive"
app.debug("value %s", Expensive())
print("formatted", Expensive.calls, "times")
app.warning("value %s", Expensive())
print("formatted", Expensive.calls, "times")

# exception() logs at ERROR and attaches the traceback
try:
    1 / 0
except ZeroDivisionError:
    app.exception("checkout failed for order %s", 42)

# Propagation: a record goes to its own handlers, then every ancestor handler
extra = logging.StreamHandler(sys.stdout)
extra.setFormatter(logging.Formatter("[db handler] %(message)s"))
db.addHandler(extra)
db.error("printed twice: by db handler and by root handler")
db.propagate = False
db.error("printed once: propagation off")

# Handler levels filter too, after the logger level
handler.setLevel(logging.ERROR)
app.warning("dropped by the handler level")
app.error("kept by the handler level")

# The same record fields are available to formatters
rec = logging.LogRecord("shop", logging.INFO, "main.py", 7, "hi %s", ("bob",), None)
print(rec.getMessage(), rec.levelname, rec.lineno)  # hi bob INFO 7
print(logging.getLevelName(25), logging.getLevelName("ERROR"))  # Level 25 40` },
      { label: `basicConfig, the last-resort handler, NullHandler, dictConfig, filters and context`, code: `# Configuring logging: basicConfig, the last-resort handler, libraries, dictConfig, context
import contextlib
import io
import logging
import logging.config
import sys

# 1. With no handlers anywhere, WARNING and above go to the "last resort" handler on stderr
err = io.StringIO()
with contextlib.redirect_stderr(err):
    logging.getLogger("lib").warning("no handlers configured")
    logging.getLogger("lib").info("INFO is dropped: the root level is WARNING")
print("stderr got:", repr(err.getvalue()))

# 2. A library adds a NullHandler so it never prints unless the app configures logging
lib = logging.getLogger("paylib")
lib.addHandler(logging.NullHandler())
err = io.StringIO()
with contextlib.redirect_stderr(err):
    lib.warning("silent: a handler exists, so no last resort")
print("stderr got:", repr(err.getvalue()))

# 3. basicConfig configures the root logger once; a second call is a no-op unless force=True
logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="A %(levelname)s %(message)s")
logging.basicConfig(stream=sys.stdout, level=logging.DEBUG, format="B %(message)s")
logging.info("first config wins")
logging.basicConfig(stream=sys.stdout, level=logging.DEBUG, format="C %(name)s %(message)s", force=True)
logging.getLogger("app").debug("force=True replaced the handler")

# 4. dictConfig: the declarative, production style (filters drop records)
class DropHealthChecks(logging.Filter):
    def filter(self, record):
        return "/health" not in record.getMessage()

logging.config.dictConfig({
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"plain": {"format": "%(levelname)s [%(name)s] %(message)s"}},
    "filters": {"no_health": {"()": DropHealthChecks}},
    "handlers": {
        "out": {"class": "logging.StreamHandler", "stream": "ext://sys.stdout",
                "formatter": "plain", "filters": ["no_health"]},
    },
    "loggers": {"api": {"level": "INFO", "handlers": ["out"], "propagate": False}},
    "root": {"level": "WARNING", "handlers": ["out"]},
})
api = logging.getLogger("api")
api.info("GET /orders 200")
api.info("GET /health 200")
api.debug("hidden: api level is INFO")
logging.getLogger("other").info("hidden: root level is WARNING")

# 5. Context: extra= adds fields; a LoggerAdapter adds them every time
ctx_handler = logging.StreamHandler(sys.stdout)
ctx_handler.setFormatter(logging.Formatter("%(levelname)s req=%(request_id)s %(message)s"))
req_log = logging.getLogger("req")
req_log.addHandler(ctx_handler)
req_log.propagate = False
req_log.warning("slow query", extra={"request_id": "r-17"})
adapter = logging.LoggerAdapter(req_log, {"request_id": "r-18"})
adapter.warning("payment declined")

# 6. Capture records in tests with a custom handler
class ListHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.records = []
    def emit(self, record):
        self.records.append((record.levelname, record.getMessage()))
cap = ListHandler()
svc = logging.getLogger("svc")
svc.addHandler(cap)
svc.propagate = False
svc.error("disk %s full", "/var")
print(cap.records)  # [('ERROR', 'disk /var full')]` },
    ],
  },
];

export default augments;
