---
slug: llm-evals-without-fooling-yourself
title: "LLM Evals Without Fooling Yourself: Graders, pass@k, Judge Bias and Error Bars"
excerpt: How to turn "the new prompt feels better" into a number you can trust. Covers choosing graders, the unbiased pass@k estimator, the position bias in LLM judges and how to cancel it, and how many examples you need before a difference means anything, with runnable code for each.
tags: ["ai", "llm", "evals", "testing", "statistics"]
cover: /blog-images/llm-evals-without-fooling-yourself/cover.png
---

Every team building on large language models (LLMs) reaches the same moment. Someone changes a prompt, tries five questions in a playground, and says "this is better". Someone else tries five different questions and says it is worse. Both are guessing.

An **eval** (short for evaluation) is the fix: a fixed set of example inputs, a way to grade each output, and a score you can compare between versions. It is the LLM version of a test suite. But an eval can mislead you just as easily as a playground can, in four predictable ways:

1. The grader marks right answers wrong, or wrong answers right.
2. You sample several answers per question and compute pass@k the tempting way, which is biased.
3. You use another LLM as the grader and it prefers whichever answer it reads first.
4. You compare 84% with 88% on 50 examples and call it a win, when it could easily be noise.

This post takes them one at a time. Every example is self-contained JavaScript you can run on the page, and the numbers were cross-checked in Python with SciPy.

## Start with the dataset, not the metric

> **Short answer:** 50 to a few hundred real inputs, each with what a good answer must contain, beat any clever metric on made-up data.

Before any scoring, collect the examples. The most useful ones come from real usage: support tickets, search queries, the questions in your logs that went badly. For each one, write down what a correct output must do. Sometimes that is an exact answer ("Paris"). Sometimes it is a list of checks: "mentions the refund window", "does not promise a date", "returns valid JSON with an `items` array".

Three habits make the set worth keeping:

- **Tag each example** by type (billing, technical, tricky phrasing, should-refuse). A total score hides the fact that one category collapsed.
- **Add every production failure** you fix as a new example, so it cannot quietly come back. This is the LLM version of a regression test.
- **Keep a held-out slice** you do not look at while tuning prompts. If you tune against every example, the score stops measuring how the system behaves on new inputs.

![An eval loop: a fixed dataset of tagged examples goes through the system under test, a grader scores each output, and the results are summarised with error bars before comparing against the previous version; production failures are added back into the dataset.](/blog-images/llm-evals-without-fooling-yourself/eval-loop.svg)

## Pitfall 1: the grader is wrong

> **Short answer:** prefer code graders when the answer can be checked by code; make them tolerant of formatting but strict about meaning; and read a sample of the failures by hand.

There are three kinds of grader:

- **Code graders:** exact match, normalised match, a regular expression, a JSON schema check, or unit tests for generated code. Fast, free and deterministic.
- **Model graders** (an "LLM-as-a-judge"): another model reads the output and a rubric and returns a score or a preference. Flexible, but they cost money and have biases (Pitfall 3).
- **Human graders:** the ground truth, but slow. Use them to build the dataset and to check the other two.

Even the simplest code grader can be wrong in both directions. Here are three graders for the question "What is the capital of France?" run on six answers:

```javascript-run
// Three graders on the same answers. Expected answer: "Paris".
const answers = ['Paris', 'paris', 'Paris.', 'The capital is Paris.', 'Lyon', 'Not Paris, it is Lyon'];

const exact = a => a === 'Paris';
const normalise = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
const normalised = a => normalise(a) === 'paris';
const contains = a => normalise(a).split(' ').includes('paris');

for (const a of answers) {
  console.log(JSON.stringify(a).padEnd(25), 'exact:', exact(a) ? 'pass' : 'FAIL',
    ' normalised:', normalised(a) ? 'pass' : 'FAIL', ' contains:', contains(a) ? 'pass' : 'FAIL');
}
```

Output:

```text
"Paris"                   exact: pass  normalised: pass  contains: pass
"paris"                   exact: FAIL  normalised: pass  contains: pass
"Paris."                  exact: FAIL  normalised: pass  contains: pass
"The capital is Paris."   exact: FAIL  normalised: FAIL  contains: pass
"Lyon"                    exact: FAIL  normalised: FAIL  contains: FAIL
"Not Paris, it is Lyon"   exact: FAIL  normalised: FAIL  contains: pass
```

Exact match failed four answers, three of them correct: a **false negative** rate that would make any model look bad. The "contains" grader fixed those but passed "Not Paris, it is Lyon": a **false positive**. Neither is safe on its own.

The practical fixes:

- **Constrain the output** so code can grade it. Ask for JSON with an `answer` field, or a single choice from a list, and grade that field.
- **Normalise formatting** (case, punctuation, whitespace, number formats) but never meaning.
- **Read 20 failures by hand** every time you change the grader. If several "failures" are actually right, the grader is the bug.

## Pitfall 2: computing pass@k the tempting way

> **Short answer:** generate n ≥ k samples per problem, count the c that pass, and use 1 − C(n−c, k) / C(n, k). The shortcut 1 − (1 − c/n)^k underestimates.

**pass@k** is the probability that at least one of k sampled answers passes. It matters whenever users (or an agent) can retry, or when you pick the best of several candidates, as with code generation checked by unit tests.

The obvious estimate is: measure pass@1 as c/n, then assume each of the k tries is independent, giving 1 − (1 − c/n)^k. The paper that introduced the HumanEval benchmark, [Chen et al., 2021](https://arxiv.org/abs/2107.03374), warns against this: "One may be tempted to estimate pass@k with 1−(1−p̂)^k where p̂ is the empirical estimate of pass@1, but we show that it is biased." Instead they generate n samples per task ("we use n = 200 and k ≤ 100"), count the c correct ones, and compute the chance that a random subset of k contains at least one correct sample: 1 − C(n−c, k) / C(n, k), where C(a, b) is "a choose b".

Their reference code computes it as a product, so the huge binomial coefficients never overflow. Here it is in JavaScript, plus a simulation that checks both estimators against a known true value:

```javascript-run
// pass@k: the chance that at least one of k samples passes.
// Unbiased estimator from Chen et al. (2021): 1 - C(n-c, k) / C(n, k),
// computed as a product so the binomials never overflow.
function passAtK(n, c, k) {
  if (n - c < k) return 1;
  let prodFail = 1;
  for (let i = n - c + 1; i <= n; i++) prodFail *= 1 - k / i;
  return 1 - prodFail;
}

// The tempting shortcut: estimate pass@1 as c/n, then assume independence.
const naive = (n, c, k) => 1 - Math.pow(1 - c / n, k);

// Small seeded random generator so the output is the same on every run.
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = 10, k = 5, trueP = 0.2;      // 10 samples per problem, true pass rate 20%
const truth = 1 - Math.pow(1 - trueP, k);
const rand = rng(42);
let sumUnbiased = 0, sumNaive = 0;
const problems = 20000;
for (let t = 0; t < problems; t++) {
  let c = 0;
  for (let i = 0; i < n; i++) if (rand() < trueP) c++;
  sumUnbiased += passAtK(n, c, k);
  sumNaive += naive(n, c, k);
}
console.log('true pass@5:     ', truth.toFixed(4));
console.log('unbiased average:', (sumUnbiased / problems).toFixed(4));
console.log('naive average:   ', (sumNaive / problems).toFixed(4));
console.log('passAtK(200, 10, 1) =', passAtK(200, 10, 1).toFixed(4));
console.log('passAtK(200, 10, 10) =', passAtK(200, 10, 10).toFixed(4));
```

Output:

```text
true pass@5:      0.6723
unbiased average: 0.6718
naive average:    0.5930
passAtK(200, 10, 1) = 0.0500
passAtK(200, 10, 10) = 0.4085
```

Across 20,000 simulated problems with a true pass rate of 20%, the unbiased estimator lands on the true pass@5 (0.6718 vs 0.6723), while the shortcut reports 0.5930, about 8 points too low. The last two lines check the product form against the textbook formula: with 10 correct out of 200, pass@10 is 0.4085, the same value Python's `math.comb` gives for 1 − C(190, 10) / C(200, 10).

Why the shortcut is low: 1 − (1 − p)^k is a concave curve, so plugging in a noisy estimate of p gives a result that is too small on average (Jensen's inequality). The subset formula does not have that problem because it never estimates p first.

![The unbiased pass@k estimator picks k of the n generated samples without replacement and asks whether at least one passes; the shortcut estimates pass@1 first and then assumes independent tries, which comes out low on average.](/blog-images/llm-evals-without-fooling-yourself/pass-at-k.svg)

## Pitfall 3: the judge prefers whatever it reads first

> **Short answer:** LLM judges have position, verbosity and self-preference biases. For pairwise comparisons, ask twice with the order swapped and only count a win when both calls agree.

Using a strong model to grade open-ended answers works surprisingly well. The MT-Bench paper, [Zheng et al., 2023](https://arxiv.org/abs/2306.05685) (NeurIPS 2023 Datasets and Benchmarks), found that GPT-4 as a judge reached "over 80% agreement, the same level of agreement between humans". But the same paper measured its biases:

- **Position bias.** Given two similar answers, GPT-4 gave the same verdict in both orders only 65.0% of the time; in 30.0% of cases it favoured whichever answer came first. The paper notes that "Most LLM judges favor the first position."
- **Verbosity bias.** Padding an answer with a repetitive list fooled GPT-4 in 8.7% of the attacks they tried, and fooled GPT-3.5 and Claude-v1 in 91.3%.
- **Self-enhancement.** GPT-4 gave its own answers a 10% higher win rate and Claude-v1 a 25% higher one, though the authors say their study "cannot determine" whether that is bias or genuine quality.

These numbers are from 2023 models and will differ for today's judges. The point is the method: measure your judge's biases instead of assuming it has none.

The cheapest fix comes from the same paper: "call a judge twice by swapping the order of two answers and only declare a win when an answer is preferred in both orders." Here is why it works, with a simulated judge that prefers the first answer 65% of the time, comparing two answers of equal quality:

```javascript-run
// A simulated judge comparing two answers of EQUAL quality.
// It has a position bias: it prefers whichever answer it sees first 65% of the time.
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(7);
const judge = (first, second) => (rand() < 0.65 ? first : second);

const pairs = 1000;
let singleA = 0;
const swapped = { A: 0, B: 0, tie: 0 };
for (let i = 0; i < pairs; i++) {
  // One call, A always shown first
  if (judge('A', 'B') === 'A') singleA++;
  // Two calls, both orders; only count a win if both calls agree
  const v1 = judge('A', 'B');
  const v2 = judge('B', 'A');
  if (v1 === v2) swapped[v1]++; else swapped.tie++;
}
console.log('one order, A first: A wins', (100 * singleA / pairs).toFixed(1) + '%');
console.log('both orders: A wins', (100 * swapped.A / pairs).toFixed(1) + '%,',
  'B wins', (100 * swapped.B / pairs).toFixed(1) + '%,',
  'inconsistent', (100 * swapped.tie / pairs).toFixed(1) + '%');
```

Output:

```text
one order, A first: A wins 66.0%
both orders: A wins 23.3%, B wins 21.5%, inconsistent 55.2%
```

With one call and A always first, a pure coin flip between equal answers turns into "A wins 66%", a fake improvement. With both orders, A and B come out roughly even, and the large "inconsistent" share tells you honestly that the judge cannot separate them. If you always put the new version first (or always second), single-order judging will quietly bias every comparison you run.

![When the judge sees answer A first it tends to pick A, and when B is first it tends to pick B; counting a win only when both orders agree cancels the position bias and leaves disagreements as ties.](/blog-images/llm-evals-without-fooling-yourself/swap-judge.svg)

Other mitigations from the paper and from practice:

- **Give the judge a reference answer** for questions with a correct answer. In the paper, on a small test of 10 maths questions (judged in both orders), this cut GPT-4's failure rate "from 70% to 15%".
- **Few-shot examples** of good grading raised GPT-4's consistency "from 65.0% to 77.5%".
- **Grade against a rubric with yes/no checks** ("mentions the refund window") rather than asking for a 1 to 10 score. Narrow questions are easier to judge consistently.
- **Calibrate against humans:** have people grade 50 to 100 outputs and measure how often the judge agrees before trusting it alone.

## Pitfall 4: no error bars

> **Short answer:** a score from 50 examples is a range, not a number. 42 out of 50 is anywhere from about 72% to 92%.

A pass rate measured on a sample is an estimate. The **Wilson score interval** is a standard way to put a 95% range around a proportion, and it behaves well even for small samples and rates near 0% or 100%:

```javascript-run
// Wilson score interval: a 95% range for a pass rate measured on n examples.
function wilson(passed, n, z = 1.96) {
  const p = passed / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [centre - half, centre + half];
}

const pct = x => (x * 100).toFixed(1) + '%';
for (const [passed, n] of [[42, 50], [84, 100], [420, 500], [4200, 5000]]) {
  const [lo, hi] = wilson(passed, n);
  console.log(`${passed}/${n} = ${pct(passed / n)}  95% range: ${pct(lo)} to ${pct(hi)}`);
}
```

Output:

```text
42/50 = 84.0%  95% range: 71.5% to 91.7%
84/100 = 84.0%  95% range: 75.6% to 89.9%
420/500 = 84.0%  95% range: 80.5% to 87.0%
4200/5000 = 84.0%  95% range: 83.0% to 85.0%
```

(SciPy's `binomtest(...).proportion_ci(method='wilson')` gives the same four ranges.) The same 84% is a 20-point-wide range on 50 examples and a 2-point range on 5,000. Since the range shrinks with the square root of n, halving its width takes four times as many examples.

![The same 84 percent pass rate has a 95 percent range of about 72 to 92 percent with 50 examples, 76 to 90 with 100, 80.5 to 87 with 500, and 83 to 85 with 5000.](/blog-images/llm-evals-without-fooling-yourself/error-bars.svg)

### Comparing two versions: use the disagreements

When you compare prompt v1 with prompt v2, run both on the **same** examples. Then the examples both pass or both fail tell you nothing about which is better; only the disagreements do. An exact **sign test** on those disagreements (the idea behind McNemar's test) asks: if the two versions were equally good, how surprising is a split this lopsided? That surprise is the **p-value**; small values (commonly below 0.05) mean the difference is unlikely to be luck.

```javascript-run
// Did prompt v2 really beat v1? Same 50 examples, graded pass/fail for both.
// Only the examples where the two versions disagree carry information.
function binom(n, k) {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}
// Exact two-sided sign test on the disagreements.
function signTest(v2Wins, v1Wins) {
  const n = v2Wins + v1Wins;
  const low = Math.min(v2Wins, v1Wins);
  let tail = 0;
  for (let k = 0; k <= low; k++) tail += binom(n, k);
  return Math.min(1, (2 * tail) / 2 ** n);
}

const scenarios = [
  { v1Pass: 42, v2Pass: 45, v2Wins: 5, v1Wins: 2 },
  { v1Pass: 42, v2Pass: 48, v2Wins: 7, v1Wins: 1 },
  { v1Pass: 420, v2Pass: 450, v2Wins: 50, v1Wins: 20 },
];
for (const s of scenarios) {
  const n = s.v1Pass > 100 ? 500 : 50;
  console.log(`v1 ${s.v1Pass}/${n}, v2 ${s.v2Pass}/${n}: v2 better on ${s.v2Wins}, worse on ${s.v1Wins}, p = ${signTest(s.v2Wins, s.v1Wins).toFixed(4)}`);
}
```

Output:

```text
v1 42/50, v2 45/50: v2 better on 5, worse on 2, p = 0.4531
v1 42/50, v2 48/50: v2 better on 7, worse on 1, p = 0.0703
v1 420/500, v2 450/500: v2 better on 50, worse on 20, p = 0.0004
```

(These match SciPy's `binomtest` exactly: 0.453125, 0.0703125 and 0.00044.) The first comparison, 84% to 90%, is the kind of result that gets announced in a stand-up. It is entirely consistent with noise: between two equally good prompts, a split at least as lopsided as 5 to 2, in either direction, happens about 45% of the time. Even 84% to 96% on 50 examples does not clear the usual 0.05 bar. The same relative gain on 500 examples is clear.

Two practical consequences:

- **Look at the disagreeing examples themselves.** Seven examples are few enough to read, and they show *what* changed, which a score never will.
- **Re-run when outputs are random.** If you sample at temperature above 0, one run per example adds its own noise. Run each example a few times, or score at temperature 0 for regression checks.

## Putting it in your pipeline

A minimal setup that avoids all four pitfalls:

1. A versioned file of examples with tags, expected answers or rubric checks, and a held-out slice.
2. Code graders wherever the output can be constrained; an LLM judge with a reference answer and swapped order where it cannot.
3. A report per run: overall pass rate with its Wilson range, pass rate per tag, and the list of examples that changed since the last run.
4. In CI, fail the build on clear regressions (a sign test on the disagreements, or a drop on must-pass examples), not on any small dip in the average.
5. Every fixed production bug becomes a new example.

None of this needs a framework. Each piece above is a few dozen lines, and writing them yourself is the best way to understand what an off-the-shelf eval tool is doing for you.

## Cheat sheet

| Problem | What goes wrong | Fix |
|---|---|---|
| Grader | Exact match fails correct answers; loose matching passes wrong ones | Constrain output format, normalise formatting only, read failures by hand |
| pass@k | 1 − (1 − c/n)^k underestimates | 1 − C(n−c, k) / C(n, k) with n ≥ k samples, computed as a product |
| LLM judge | Position, verbosity and self-preference biases | Swap order and require agreement, give a reference answer, use yes/no rubric checks, calibrate against humans |
| Small samples | 42/50 reported as "84%" | Report a Wilson 95% range (71.5% to 91.7%) |
| Comparing versions | 84% vs 90% on 50 examples called a win | Same examples for both, sign test on the disagreements (p = 0.45 here) |
| Overfitting the eval | Prompt tuned on every example | Keep a held-out slice; add production failures as new examples |
