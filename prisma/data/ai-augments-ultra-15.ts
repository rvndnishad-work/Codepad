/**
 * AI ENGINEERING ULTRA — batch 15: evals I (what evals are and why every LLM
 * feature needs them; building a golden dataset; code-based versus model-based
 * graders; LLM-as-judge and its biases; why BLEU and ROUGE fail for LLM outputs).
 * Every example was run by scripts/verify-variant-examples.ts (node, python);
 * quoted output is that run's output.
 */
import type { AiUltraAugment } from "./ai-augments.types";

const augments: AiUltraAugment[] = [
  {
    title: `What are evals and why does every LLM feature need them?`,
    difficulty: "easy",
    seoDescription: `What LLM evals are (dataset, grader, harness), why nondeterministic outputs and non-local prompt effects make them mandatory, and how to start small.`,
    description: `**Question presented to candidate:**
"Our team ships LLM features by trying a few prompts in a playground and saying 'looks good'. Explain what evals are, how they differ from normal unit tests, and why you would insist on having them before the next prompt change or model upgrade."

**What a strong answer should cover:**
- An eval is a dataset of realistic inputs, a grader that turns each output into a score or pass/fail, and a harness that runs the system and aggregates the scores, ideally per slice
- Why LLM features need them more than ordinary code: outputs are open-ended and nondeterministic, and a prompt or model change has non-local effects (fixing one case breaks others you did not look at)
- The grader spectrum: code checks first, model-based (LLM-as-judge) graders for qualities code cannot check, human review to calibrate both
- Report rates with uncertainty, not single anecdotes: a 20-case suite cannot tell 78% from 82%; slices and a regression gate catch what an overall average hides
- Where evals live in the lifecycle: offline before shipping (CI gate on every prompt, model or retrieval change), online in production (sampled grading, user signals), and production failures fed back into the dataset

**Code / implementation expected:** Optional — a small harness that runs two prompt versions over a labelled set with code graders and reports per-slice pass rates is a strong addition.`,
    answer: `**Target Audience:** Anyone building on top of an LLM API who has never written an eval, and candidates who need to explain why "it looked good in the playground" is not a test.
**Difficulty:** Easy
**Verified with:** Node 22 and Python 3.12 (an eval harness over two stubbed prompt versions, and a sampling simulation with Wilson intervals). No model is called; the stub replies stand in for a real model. Vendor guidance is quoted with its source, checked October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the examples; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A bakery hires a new chef and changes the bread recipe: a little more salt, because one customer said it was bland. The owner tastes one loaf, likes it, and ships the recipe to all ten shops. A week later the sandwich shop complains that the bread now crumbles, the gluten-free line tastes wrong, and the original customer is happy. Nobody tasted the other loaves.

An LLM feature is that recipe. The prompt, the model version, the retrieved context and the tools together decide every answer, and a change made for one case quietly changes the others. Tasting one loaf in the playground is how most teams start. An **eval** is the habit of baking a fixed tray of test loaves, scoring each with the same rules, and comparing the tray to last week's tray before shipping.

There is a second twist. The same recipe in the same oven does not come out identical every time. LLMs are like that: the same prompt can produce different answers on different runs. So one good loaf proves very little; you need a pass *rate*, over enough loaves to trust it.

## 2. What an Eval Is

An eval has three parts. A set of inputs that look like real usage, each with what a good answer must satisfy. A way to check each output. And a harness that runs your whole system (prompt, model, retrieval, tools) on every input and adds the checks up.

📌 **Interview term: eval (evaluation)** — a repeatable measurement of model or system behaviour: a dataset of inputs, a grader per case, and a harness that runs the system and aggregates scores. Think "test suite whose result is a rate, not a green tick".

📌 **Interview term: grader** — the function that turns one output into a score or pass/fail. It can be code (string contains, JSON parses, exact number), a model (an LLM judge applying a rubric) or a human.

📌 **Interview term: golden dataset** — the curated, labelled set of inputs (and expected properties or reference answers) the eval runs on. How to build one is its own question: [How do you build a golden dataset for evaluating an LLM feature?](/interview-question/how-do-you-build-a-golden-dataset-for-evaluating-an-llm-feature)

<svg class="iq-diagram" width="100%" viewBox="0 0 760 240" role="img" aria-label="Eval loop: a dataset runs through the system under test, graders score each output, scores are compared to a baseline, and production failures flow back into the dataset">
  <rect class="d-box" x="20" y="60" width="140" height="70" rx="8"/>
  <text class="d-text" x="90" y="90" text-anchor="middle">dataset</text>
  <text class="d-sub" x="90" y="112" text-anchor="middle">real inputs + labels</text>
  <path class="d-edge" d="M 160 95 L 210 95"/>
  <polygon class="d-arrow" points="210,89 220,95 210,101"/>
  <rect class="d-box-accent" x="220" y="60" width="150" height="70" rx="8"/>
  <text class="d-text" x="295" y="90" text-anchor="middle">system</text>
  <text class="d-sub" x="295" y="112" text-anchor="middle">prompt + model + tools</text>
  <path class="d-edge" d="M 370 95 L 420 95"/>
  <polygon class="d-arrow" points="420,89 430,95 420,101"/>
  <rect class="d-box" x="430" y="60" width="130" height="70" rx="8"/>
  <text class="d-text" x="495" y="90" text-anchor="middle">graders</text>
  <text class="d-sub" x="495" y="112" text-anchor="middle">code, judge, human</text>
  <path class="d-edge" d="M 560 95 L 610 95"/>
  <polygon class="d-arrow" points="610,89 620,95 610,101"/>
  <rect class="d-box-muted" x="620" y="60" width="120" height="70" rx="8"/>
  <text class="d-text" x="680" y="90" text-anchor="middle">report</text>
  <text class="d-sub" x="680" y="112" text-anchor="middle">rate per slice</text>
  <path class="d-edge-dashed" d="M 680 130 L 680 200 L 90 200 L 90 140"/>
  <polygon class="d-arrow" points="84,140 90,130 96,140"/>
</svg>

The loop matters more than any single run: the dataset grows from real failures, so coverage follows how people actually use the feature instead of what the team guessed at launch.

## 3. Why Every LLM Feature Needs Them

### Reason 1: changes have non-local effects

In ordinary code, editing one function mostly affects its callers. In an LLM feature, one sentence in the system prompt is read on *every* request. Adding "always be maximally helpful" can fix an unhelpful refund reply and, at the same time, make the model chat before its JSON or answer a question it should refuse.

📌 **Interview term: regression** — a case that passed on the old version and fails on the new one. In LLM work, regressions are usually invisible to the person making the change, because they look at the case they meant to fix.

The first example, **"A tiny eval harness: a prompt fix that regresses two other slices"**, runs nine cases through two stubbed prompt versions. The key part is just a grader and a per-slice tally:

~~~js
function grade(c, out) {
  if (c.expect.contains) return out.includes(c.expect.contains);
  if (c.expect.refuse) return out === REFUSAL;
  if (c.expect.json) {
    try { const obj = JSON.parse(out); return c.expect.json.every((k) => k in obj); }
    catch { return false; }
  }
}
~~~

~~~text
slice          v1     v2
refunds        2/3    3/3
orders         3/3    2/3
out_of_scope   3/3    2/3
overall        8/9    7/9
~~~

The change did exactly what its author wanted (r3 now passes) and still made the product worse. An overall average alone would also mislead in the opposite direction: a change can raise the overall rate while one important slice collapses, which is why the gate in the program blocks on *any* slice regressing.

📌 **Interview term: slice** — a subset of cases sharing a property (intent, language, customer tier, input length). Reporting per slice catches regressions an overall average hides.

### Reason 2: outputs are nondeterministic

📌 **Interview term: nondeterminism** — the same input can produce different outputs across runs (sampling temperature, provider-side batching, model updates). A single run of a single case is an anecdote.

The second example, **"Nondeterminism and sample size: pass rates with Wilson intervals"**, simulates a model whose true pass rate is 80% and runs a 20-case suite five times with fixed seeds:

~~~text
  seed      7: 16/20 = 80.0%
  seed   1234: 17/20 = 85.0%
  seed  31337: 17/20 = 85.0%
  seed  99991: 16/20 = 80.0%
  seed 424242: 13/20 = 65.0%
~~~

Nothing changed between those runs, yet the score moved 20 points. If one of those had been "before" and another "after" a prompt edit, someone would have celebrated or panicked about noise.

📌 **Interview term: confidence interval** — a range that likely contains the true pass rate given the sample. The Wilson interval is a standard choice for pass rates because it behaves well near 0% and 100% and for small n.

~~~text
  n=  20  58.4% .. 91.9%  (width 33.5 points)
  n= 100  71.1% .. 86.7%  (width 15.5 points)
  n= 400  75.8% .. 83.6%  (width 7.8 points)
~~~

The width shrinks roughly with the square root of n: four times the cases for half the width. That is why a small suite is great for *finding* failures but weak for *ranking* two close versions. When two versions run on the same cases, compare them case by case (a paired comparison: how many flipped pass to fail and fail to pass) rather than comparing two independent intervals, which is more conservative.

### Reason 3: "good" is not one thing

A support answer must be correct, grounded in policy, polite, in the right format, and refuse what is out of scope. Each is a separate check, and they trade off against each other. Evals force the team to write down what good means, per dimension, instead of arguing from taste.

📌 **Interview term: success criteria** — the specific, measurable properties an output must have (for example "cites a policy section", "valid JSON with order_id", "refuses medical questions"). Anthropic docs recommend defining them before building tests and making them specific and measurable (Anthropic docs, "Define success criteria" and "Develop tests", checked October 2026).

## 4. The Three Kinds of Grader

| Grader | Good at | Weak at | Cost |
| :--- | :--- | :--- | :--- |
| Code | format, exact values, contains, refusal string, tests pass | tone, helpfulness, faithfulness of free text | near zero, deterministic |
| Model (LLM-as-judge) | rubric qualities on open-ended text | biases, drift, needs validation | one model call per case |
| Human | ground truth, new failure types, calibrating the others | slow, expensive, inconsistent between people | highest |

Anthropic guidance on building tests ranks these the same way: prefer code-based grading where possible because it is fast and reliable, use LLM-based grading for nuanced judgement after checking it is reliable, and avoid human grading where possible because it is slow and costly (Anthropic docs, "Develop tests", checked October 2026). The trade-offs are covered in depth in [When do you use code-based graders versus model-based graders?](/interview-question/when-do-you-use-code-based-graders-versus-model-based-graders) and the judge biases in [What is LLM-as-judge and what are its known biases?](/interview-question/what-is-llm-as-judge-and-what-are-its-known-biases). Why old text-overlap scores are not the answer is in [Why are BLEU and ROUGE poor metrics for LLM outputs, and what replaced them?](/interview-question/why-are-bleu-and-rouge-poor-metrics-for-llm-outputs-and-what-replaced-them)

## 5. Where Evals Live in the Lifecycle

📌 **Interview term: offline eval** — running the suite on a fixed dataset before shipping, typically in CI on every prompt, model, retrieval or tool change.

📌 **Interview term: online eval** — measuring live traffic: sampled outputs graded by a judge, plus user signals (thumbs down, edits, escalations, retries).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="Lifecycle: error analysis on traces creates cases, offline evals gate each change in CI, online evals watch production, and both feed back into error analysis">
  <rect class="d-box" x="20" y="50" width="160" height="70" rx="8"/>
  <text class="d-text" x="100" y="80" text-anchor="middle">error analysis</text>
  <text class="d-sub" x="100" y="102" text-anchor="middle">read real traces</text>
  <path class="d-edge" d="M 180 85 L 240 85"/>
  <polygon class="d-arrow" points="240,79 250,85 240,91"/>
  <rect class="d-box-accent" x="250" y="50" width="160" height="70" rx="8"/>
  <text class="d-text" x="330" y="80" text-anchor="middle">offline eval</text>
  <text class="d-sub" x="330" y="102" text-anchor="middle">CI gate per change</text>
  <path class="d-edge" d="M 410 85 L 470 85"/>
  <polygon class="d-arrow" points="470,79 480,85 470,91"/>
  <rect class="d-box" x="480" y="50" width="160" height="70" rx="8"/>
  <text class="d-text" x="560" y="80" text-anchor="middle">online eval</text>
  <text class="d-sub" x="560" y="102" text-anchor="middle">sampled live traffic</text>
  <path class="d-edge-dashed" d="M 640 85 L 700 85 L 700 150 L 100 150 L 100 130"/>
  <polygon class="d-arrow" points="94,130 100,120 106,130"/>
</svg>

The order matters. Start by reading real outputs and naming the failure types, then write graders for the ones that recur. Writing generic metrics ("helpfulness score") before looking at data produces dashboards nobody trusts. The CI side is covered in [How do you catch regressions when changing a prompt or upgrading a model?](/interview-question/how-do-you-catch-regressions-when-changing-a-prompt-or-upgrading-a-model) and the production side in [How do you monitor LLM quality drift in production?](/interview-question/how-do-you-monitor-llm-quality-drift-in-production)

## 6. Verified: Running the Code

Both programs use only the standard library and call no model. The stub replies stand for a real model under two prompt versions; the seeded generator stands for sampling randomness. What they leave out: real model variance across cases, judge graders, and cost.

**"A tiny eval harness: a prompt fix that regresses two other slices"** — \`node a.js\` and \`python3.12 a.py\` both print exactly:

~~~text
case  slice          v1    v2
r1    refunds        pass  pass
r2    refunds        pass  pass
r3    refunds        FAIL  pass  <- changed
o1    orders         pass  pass
o2    orders         pass  pass
o3    orders         pass  FAIL  <- changed
s1    out_of_scope   pass  pass
s2    out_of_scope   pass  FAIL  <- changed
s3    out_of_scope   pass  pass

slice          v1     v2
refunds        2/3    3/3
orders         3/3    2/3
out_of_scope   3/3    2/3
overall        8/9    7/9

the complaint that motivated v2 (r3) fixed: true
slices that regressed: orders, out_of_scope
gate decision: BLOCK v2
~~~

**"Nondeterminism and sample size: pass rates with Wilson intervals"** — \`node b.js\` and \`python3.12 b.py\` both print exactly:

~~~text
same prompt, same model, true pass rate 80%, five runs of a 20-case suite:
  seed      7: 16/20 = 80.0%
  seed   1234: 17/20 = 85.0%
  seed  31337: 17/20 = 85.0%
  seed  99991: 16/20 = 80.0%
  seed 424242: 13/20 = 65.0%
  spread: 65.0% to 85.0%

95% Wilson interval for an observed 80% pass rate:
  n=  20  58.4% .. 91.9%  (width 33.5 points)
  n=  50  67.0% .. 88.8%  (width 21.8 points)
  n= 100  71.1% .. 86.7%  (width 15.5 points)
  n= 400  75.8% .. 83.6%  (width 7.8 points)
  n=1000  77.4% .. 82.4%  (width 5.0 points)

is v2 (82/100) better than v1 (78/100)?
  v1 68.9% .. 85.0%
  v2 73.3% .. 88.3%
  intervals overlap: true  -> not evidence of improvement on its own
~~~

What the runs show:

- The edit fixed its target (r3) and broke o3 (chatty text before the JSON) and s2 (answered an out-of-scope finance question). Two of three slices regressed; the gate blocked it.
- With a true rate of 80%, five unchanged runs of a 20-case suite scored between 65% and 85%.
- At n=100, 78% and 82% have overlapping intervals; the suite cannot tell them apart without more cases or a paired comparison.

## 7. Starting Small

1. Pull 30-50 real inputs from logs (or write them with someone who knows the domain), including some that should be refused and some edge cases.
2. Write down, per case, what a correct answer must contain or avoid.
3. Write code graders for whatever is mechanical; add one judged dimension only where code cannot decide.
4. Run the suite on the current version, save it as the baseline, and run it on every change.
5. Every bug report or bad trace becomes a new case before it is fixed.

## Edge Cases Worth Knowing

- **Overfitting to the eval.** Iterating on the prompt until the suite passes can tune to those exact cases. Keep a held-out set you look at rarely.
- **Graders with bugs.** A grader that checks \`includes("refund")\` passes "we do not offer refunds". Spot-check grader verdicts by hand.
- **Model snapshots.** A provider alias that points to a newer model changes behaviour without any change on your side; pin versions and re-run evals on upgrade.
- **Multi-step systems.** For RAG and agents, grade the steps (retrieval, tool choice) as well as the final answer: see [How do you evaluate a RAG pipeline end to end?](/interview-question/how-do-you-evaluate-a-rag-pipeline-end-to-end) and [How do you evaluate and debug agent trajectories?](/interview-question/how-do-you-evaluate-and-debug-agent-trajectories)

## Common Pitfalls

- **Vibe checks as the release process.** Trying three prompts in a playground and shipping, which tests only the case the author was thinking about.
- **One overall number.** An average that went up while the refusal slice collapsed. Report per slice and gate on regressions.
- **Treating noise as signal.** Declaring a winner from a 3-point difference on 20 cases.
- **Generic metrics before error analysis.** Measuring "helpfulness" because a tool offers it, instead of the failures your users actually hit.
- **A dataset that never grows.** Launch-day cases only; production failures never added.
- **Unvalidated judges.** Trusting an LLM judge score without checking it against human labels.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">An eval is a test for model behaviour: a set of realistic inputs, a <strong style="color:#ffca28;">grader</strong> that turns each output into pass/fail or a score, and a harness that runs the whole system and reports the rates, broken down by slice.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why LLMs need them:</strong> <span style="color:#f0e2c8;">Two reasons. Outputs are open-ended and vary from run to run, so you measure rates, not single examples. And prompt or model changes have <strong style="color:#ffca28;">non-local effects</strong>: a line added to fix one complaint changes behaviour on inputs you never looked at.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What it looks like:</strong> <span style="color:#f0e2c8;">In my demo a prompt edit fixed the refund complaint it targeted, but broke a JSON reply and a refusal; overall it went from 8/9 to 7/9, and the per-slice gate blocked it. Playground testing would have shipped it, because the person looked at the case they fixed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Graders and size:</strong> <span style="color:#f0e2c8;">Code checks first (contains, schema, exact value, refusal), an LLM judge for qualities like tone or faithfulness, and humans to calibrate both. Size matters: at 20 cases an 80% pass rate has a 95% interval of about 58% to 92%, so I start small but grow the set where decisions are close.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Lifecycle:</strong> <span style="color:#f0e2c8;">The suite runs in CI on every prompt, model or retrieval change, a sampled version runs on production traffic, and every production failure becomes a new case. That is what lets a team change things quickly without fear.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is an eval different from a unit test?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A unit test checks a deterministic function and should pass 100% of the time. An eval checks a stochastic system with fuzzy correctness, so it reports a rate per slice and you compare against a baseline. Many eval cases do look like unit tests (an assertion on the output), they are just aggregated.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many cases do you need to start?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Twenty to fifty real cases are enough to start finding failures and to catch gross regressions. To tell small differences apart you need far more: the interval width at 80% is about 33 points at n=20 and 8 points at n=400. Compare versions on the same cases, which is a paired comparison and tighter than two separate intervals.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you do about nondeterminism?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pin what you can (model snapshot, temperature, prompt version), run each case more than once for flaky behaviours, and report the rate with an interval. Never decide from one run of one example.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Who writes the eval cases?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Engineers seed them, but the best cases come from real traffic and from domain experts who know what a correct answer is. Error analysis on production traces decides which failure types deserve cases. See the golden dataset question for the process.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are offline evals enough?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Offline evals catch regressions before shipping; online signals (sampled judge scores on live traffic, thumbs down, escalations, edits) catch drift and failure types your dataset did not contain. The two feed each other.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Eval | Dataset + grader + harness that measures system behaviour as a rate |
| Grader | Function that scores one output: code, model or human |
| Golden dataset | Curated, labelled inputs the eval runs on |
| Regression | A case that passed before a change and fails after it |
| Slice | Subset of cases sharing a property, reported separately |
| Nondeterminism | Same input, different outputs across runs |
| Confidence interval | Range likely to contain the true pass rate |
| Success criteria | Specific, measurable properties a good output must have |
| Offline eval | Fixed-dataset run before shipping, usually in CI |
| Online eval | Measurement on live production traffic |

**Conclusion:** Evals are the test suite of an LLM feature: realistic inputs, graders that score each output, and a harness that reports pass rates per slice against a baseline. They are mandatory because prompt and model changes have non-local effects and outputs vary from run to run, so a playground check of one example says almost nothing; in the demo a well-meant fix improved its target and still made the product worse, and an unchanged system scored anywhere from 65% to 85% on a 20-case suite. Start small with real inputs and code graders, add judged dimensions where code cannot decide, grow the dataset from production failures, and run it on every change. That is what lets a team iterate quickly instead of being afraid to touch the prompt.`,
    examples: [
      {
        label: `A tiny eval harness: a prompt fix that regresses two other slices`,
        variants: [
          { tech: "node", code: `// A minimal eval harness: dataset + system under test + code graders + a gate.
// The "model" is a deterministic stub: two prompt versions return canned replies.
const cases = [
  { id: "r1", slice: "refunds", input: "How long do refunds take?", expect: { contains: "5-7 business days" } },
  { id: "r2", slice: "refunds", input: "Refund for a damaged item?", expect: { contains: "5-7 business days" } },
  { id: "r3", slice: "refunds", input: "I want my money back, it broke", expect: { contains: "5-7 business days" } },
  { id: "o1", slice: "orders", input: "Where is order 1042?", expect: { json: ["order_id", "status"] } },
  { id: "o2", slice: "orders", input: "Status of order 77?", expect: { json: ["order_id", "status"] } },
  { id: "o3", slice: "orders", input: "Has 3001 shipped yet?", expect: { json: ["order_id", "status"] } },
  { id: "s1", slice: "out_of_scope", input: "Write my history essay", expect: { refuse: true } },
  { id: "s2", slice: "out_of_scope", input: "What stock should I buy?", expect: { refuse: true } },
  { id: "s3", slice: "out_of_scope", input: "Give me medical advice", expect: { refuse: true } },
];

const REFUSAL = "Sorry, I can only help with orders and refunds.";
// v1: original prompt. Weak on the angry-customer refund phrasing (r3).
const v1 = {
  r1: "Refunds take 5-7 business days.", r2: "Damaged items are refunded in 5-7 business days.",
  r3: "Please contact support.", o1: '{"order_id":1042,"status":"shipped"}',
  o2: '{"order_id":77,"status":"processing"}', o3: '{"order_id":3001,"status":"shipped"}',
  s1: REFUSAL, s2: REFUSAL, s3: REFUSAL,
};
// v2: someone added "always be maximally helpful and friendly" to fix r3.
const v2 = {
  ...v1,
  r3: "So sorry! Refunds take 5-7 business days.",
  o3: 'Great news! {"order_id":3001,"status":"shipped"}',
  s2: "Index funds are a popular choice for beginners.",
};

function grade(c, out) {
  if (c.expect.contains) return out.includes(c.expect.contains);
  if (c.expect.refuse) return out === REFUSAL;
  if (c.expect.json) {
    try {
      const obj = JSON.parse(out);
      return c.expect.json.every((k) => k in obj);
    } catch { return false; }
  }
  return false;
}

function runEval(name, sys) {
  const bySlice = {};
  let pass = 0;
  for (const c of cases) {
    const ok = grade(c, sys[c.id]);
    if (ok) pass++;
    bySlice[c.slice] = bySlice[c.slice] || [0, 0];
    bySlice[c.slice][0] += ok ? 1 : 0;
    bySlice[c.slice][1] += 1;
  }
  return { name, pass, total: cases.length, bySlice };
}

const base = runEval("v1", v1);
const cand = runEval("v2", v2);
console.log("case  slice          v1    v2");
for (const c of cases) {
  const a = grade(c, v1[c.id]) ? "pass" : "FAIL";
  const b = grade(c, v2[c.id]) ? "pass" : "FAIL";
  console.log(\`\${c.id.padEnd(5)} \${c.slice.padEnd(14)} \${a.padEnd(5)} \${b}\${a !== b ? "  <- changed" : ""}\`);
}
console.log("");
console.log("slice          v1     v2");
let regressed = [];
for (const s of Object.keys(base.bySlice)) {
  const [p1, n1] = base.bySlice[s];
  const [p2, n2] = cand.bySlice[s];
  console.log(\`\${s.padEnd(14)} \${p1}/\${n1}    \${p2}/\${n2}\`);
  if (p2 < p1) regressed.push(s);
}
console.log(\`overall        \${base.pass}/\${base.total}    \${cand.pass}/\${cand.total}\`);
console.log("");
const fixedTarget = grade(cases[2], v2.r3);
console.log(\`the complaint that motivated v2 (r3) fixed: \${fixedTarget}\`);
console.log(\`slices that regressed: \${regressed.length ? regressed.join(", ") : "none"}\`);
console.log(\`gate decision: \${regressed.length ? "BLOCK v2" : "SHIP v2"}\`);` },
          { tech: "python", code: `# A minimal eval harness: dataset + system under test + code graders + a gate.
# The "model" is a deterministic stub: two prompt versions return canned replies.
import json

cases = [
    {"id": "r1", "slice": "refunds", "input": "How long do refunds take?", "expect": {"contains": "5-7 business days"}},
    {"id": "r2", "slice": "refunds", "input": "Refund for a damaged item?", "expect": {"contains": "5-7 business days"}},
    {"id": "r3", "slice": "refunds", "input": "I want my money back, it broke", "expect": {"contains": "5-7 business days"}},
    {"id": "o1", "slice": "orders", "input": "Where is order 1042?", "expect": {"json": ["order_id", "status"]}},
    {"id": "o2", "slice": "orders", "input": "Status of order 77?", "expect": {"json": ["order_id", "status"]}},
    {"id": "o3", "slice": "orders", "input": "Has 3001 shipped yet?", "expect": {"json": ["order_id", "status"]}},
    {"id": "s1", "slice": "out_of_scope", "input": "Write my history essay", "expect": {"refuse": True}},
    {"id": "s2", "slice": "out_of_scope", "input": "What stock should I buy?", "expect": {"refuse": True}},
    {"id": "s3", "slice": "out_of_scope", "input": "Give me medical advice", "expect": {"refuse": True}},
]

REFUSAL = "Sorry, I can only help with orders and refunds."
# v1: original prompt. Weak on the angry-customer refund phrasing (r3).
v1 = {
    "r1": "Refunds take 5-7 business days.", "r2": "Damaged items are refunded in 5-7 business days.",
    "r3": "Please contact support.", "o1": '{"order_id":1042,"status":"shipped"}',
    "o2": '{"order_id":77,"status":"processing"}', "o3": '{"order_id":3001,"status":"shipped"}',
    "s1": REFUSAL, "s2": REFUSAL, "s3": REFUSAL,
}
# v2: someone added "always be maximally helpful and friendly" to fix r3.
v2 = {
    **v1,
    "r3": "So sorry! Refunds take 5-7 business days.",
    "o3": 'Great news! {"order_id":3001,"status":"shipped"}',
    "s2": "Index funds are a popular choice for beginners.",
}


def grade(c, out):
    e = c["expect"]
    if "contains" in e:
        return e["contains"] in out
    if "refuse" in e:
        return out == REFUSAL
    if "json" in e:
        try:
            obj = json.loads(out)
            return all(k in obj for k in e["json"])
        except ValueError:
            return False
    return False


def run_eval(name, sys):
    by_slice = {}
    passed = 0
    for c in cases:
        ok = grade(c, sys[c["id"]])
        if ok:
            passed += 1
        by_slice.setdefault(c["slice"], [0, 0])
        by_slice[c["slice"]][0] += 1 if ok else 0
        by_slice[c["slice"]][1] += 1
    return {"name": name, "pass": passed, "total": len(cases), "by_slice": by_slice}


base = run_eval("v1", v1)
cand = run_eval("v2", v2)
print("case  slice          v1    v2")
for c in cases:
    a = "pass" if grade(c, v1[c["id"]]) else "FAIL"
    b = "pass" if grade(c, v2[c["id"]]) else "FAIL"
    print(f"{c['id']:<5} {c['slice']:<14} {a:<5} {b}{'  <- changed' if a != b else ''}")
print("")
print("slice          v1     v2")
regressed = []
for s in base["by_slice"]:
    p1, n1 = base["by_slice"][s]
    p2, n2 = cand["by_slice"][s]
    print(f"{s:<14} {p1}/{n1}    {p2}/{n2}")
    if p2 < p1:
        regressed.append(s)
print(f"overall        {base['pass']}/{base['total']}    {cand['pass']}/{cand['total']}")
print("")
fixed_target = grade(cases[2], v2["r3"])
print(f"the complaint that motivated v2 (r3) fixed: {'true' if fixed_target else 'false'}")
print(f"slices that regressed: {', '.join(regressed) if regressed else 'none'}")
print(f"gate decision: {'BLOCK v2' if regressed else 'SHIP v2'}")` },
        ],
      },
      {
        label: `Nondeterminism and sample size: pass rates with Wilson intervals`,
        variants: [
          { tech: "node", code: `// Why evals report rates with error bars: a stub model that truly passes 80%
// of the time, sampled with a seeded generator (MINSTD) so the run is repeatable.
function rng(seed) {
  let x = seed;
  for (let i = 0; i < 5; i++) x = (x * 48271) % 2147483647; // warm up
  return () => { x = (x * 48271) % 2147483647; return x / 2147483647; };
}
function runSuite(n, trueRate, seed) {
  const r = rng(seed);
  let pass = 0;
  for (let i = 0; i < n; i++) if (r() < trueRate) pass++;
  return pass;
}
function wilson(pass, n, z = 1.96) {
  const p = pass / n;
  const d = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / d;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [centre - half, centre + half];
}
const pct = (x) => (100 * x).toFixed(1) + "%";

console.log("same prompt, same model, true pass rate 80%, five runs of a 20-case suite:");
const runs = [];
for (const seed of [7, 1234, 31337, 99991, 424242]) {
  const p = runSuite(20, 0.8, seed);
  runs.push(p);
  console.log(\`  seed \${String(seed).padStart(6)}: \${p}/20 = \${pct(p / 20)}\`);
}
console.log(\`  spread: \${pct(Math.min(...runs) / 20)} to \${pct(Math.max(...runs) / 20)}\`);
console.log("");
console.log("95% Wilson interval for an observed 80% pass rate:");
for (const n of [20, 50, 100, 400, 1000]) {
  const [lo, hi] = wilson(Math.round(0.8 * n), n);
  console.log(\`  n=\${String(n).padStart(4)}  \${pct(lo)} .. \${pct(hi)}  (width \${(100 * (hi - lo)).toFixed(1)} points)\`);
}
console.log("");
console.log("is v2 (82/100) better than v1 (78/100)?");
const a = wilson(78, 100), b = wilson(82, 100);
console.log(\`  v1 \${pct(a[0])} .. \${pct(a[1])}\`);
console.log(\`  v2 \${pct(b[0])} .. \${pct(b[1])}\`);
console.log(\`  intervals overlap: \${b[0] < a[1]}  -> not evidence of improvement on its own\`);` },
          { tech: "python", code: `# Why evals report rates with error bars: a stub model that truly passes 80%
# of the time, sampled with a seeded generator (MINSTD) so the run is repeatable.
import math


def rng(seed):
    x = seed
    for _ in range(5):  # warm up
        x = (x * 48271) % 2147483647
    def nxt():
        nonlocal x
        x = (x * 48271) % 2147483647
        return x / 2147483647
    return nxt


def run_suite(n, true_rate, seed):
    r = rng(seed)
    return sum(1 for _ in range(n) if r() < true_rate)


def wilson(passed, n, z=1.96):
    p = passed / n
    d = 1 + (z * z) / n
    centre = (p + (z * z) / (2 * n)) / d
    half = (z * math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d
    return centre - half, centre + half


def pct(x):
    return f"{100 * x:.1f}%"


print("same prompt, same model, true pass rate 80%, five runs of a 20-case suite:")
runs = []
for seed in [7, 1234, 31337, 99991, 424242]:
    p = run_suite(20, 0.8, seed)
    runs.append(p)
    print(f"  seed {seed:>6}: {p}/20 = {pct(p / 20)}")
print(f"  spread: {pct(min(runs) / 20)} to {pct(max(runs) / 20)}")
print("")
print("95% Wilson interval for an observed 80% pass rate:")
for n in [20, 50, 100, 400, 1000]:
    lo, hi = wilson(round(0.8 * n), n)
    print(f"  n={n:>4}  {pct(lo)} .. {pct(hi)}  (width {100 * (hi - lo):.1f} points)")
print("")
print("is v2 (82/100) better than v1 (78/100)?")
a = wilson(78, 100)
b = wilson(82, 100)
print(f"  v1 {pct(a[0])} .. {pct(a[1])}")
print(f"  v2 {pct(b[0])} .. {pct(b[1])}")
print(f"  intervals overlap: {'true' if b[0] < a[1] else 'false'}  -> not evidence of improvement on its own")` },
        ],
      },
    ],
  },
  {
    title: `How do you build a golden dataset for evaluating an LLM feature?`,
    difficulty: "medium",
    seoDescription: `Build an LLM golden dataset: sample real traces, dedupe and cluster, stratify rare slices, label with a rubric, check kappa, split without leakage.`,
    description: `**Question presented to candidate:**
"We are about to launch an LLM support assistant and want an eval set we can trust for every future prompt change and model upgrade. Walk me through how you would build that golden dataset: where the cases come from, how many, how you label them, and how you keep it useful over time."

**What a strong answer should cover:**
- Sources: real production or beta traces first (sampled, deduplicated), then targeted additions — known failures, edge cases, adversarial and should-refuse inputs, and synthetic cases only to fill gaps, reviewed by a human
- Coverage over volume: stratify by intent or slice with a floor for rare but high-stakes categories, because proportional sampling of traffic gives them zero cases; dedupe and cluster near-duplicates so 40 copies of one question do not count as 40 cases
- What a case holds: input (and context such as retrieved docs or conversation state), the expected answer or, more often, the properties a correct answer must have, slice tags and provenance
- Labels from people who know the domain, with a written rubric, two annotators on a sample, agreement measured with Cohen's kappa (raw agreement flatters), and disagreements adjudicated into rubric clarifications
- Hygiene: a dev split you iterate on and a held-out test split split by cluster so near-twins do not leak, versioning of the dataset, PII scrubbing, and a feedback loop that turns each production failure into a new case

**Clarifying questions expected:**
- Do we have production or beta traffic yet, and can we legally use it for evaluation (PII, consent, retention)?
- Which failures are most costly for the business (wrong refund promise, leaked data, rude tone), so we know which slices need depth?
- Who are the domain experts who can say what a correct answer is?

**Code / implementation expected:** Optional — a script that dedupes traces, stratifies by intent and splits by cluster, or a kappa calculation for label quality.`,
    answer: `**Target Audience:** Engineers who know why evals matter and now have to assemble the dataset behind them, and candidates asked to design one in an interview.
**Difficulty:** Medium
**Verified with:** Node 22 and Python 3.12 (a dataset builder over 200 simulated traces, and an inter-annotator agreement calculation). The traces and labels are synthetic and stated as such; no model is called.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the examples; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A driving examiner who tests every learner on the same quiet street, in daylight, with no other cars, will pass people who cannot merge onto a motorway. The test is not wrong, it is just not *representative*. A good driving test is designed: a mix of ordinary roads (because that is most of driving), a roundabout, a hill start, one awkward junction that causes most crashes, and the same route every time so two examiners can be compared.

A golden dataset is the route. If you pick cases by grabbing whatever is in the logs, you get 60% "where is my order" and nothing about the customer threatening legal action, which is exactly the case that ends up in the news. If you pick cases from your imagination, you test what you thought users would do, not what they do. Building the set is a design job: real traffic for realism, deliberate choices for coverage, and careful labels so that "pass" means the same thing every time.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Do we have production or beta traffic, and may we use it for evaluation? | Real traces are the best source, but PII, consent and retention rules decide how. |
| Which failures cost the most? | Those slices need depth even if they are rare in traffic. |
| Who can say what a correct answer is? | Labels from people without domain knowledge produce a confident, wrong dataset. |
| Is there one right answer, or many acceptable ones? | Decides between reference answers and property checks. |
| How often do prompts and models change? | Sets how much the suite must be automated and how fast it must run. |

## 3. What a Golden Case Contains

📌 **Interview term: golden dataset** — a curated, versioned set of evaluation cases with trusted labels, used as the fixed yardstick for every change. "Golden" means the labels are trusted, not that the outputs are perfect.

A case is more than a question and an answer:

| Field | Example | Why |
| :--- | :--- | :--- |
| input | "I want my money back, it broke" | what the system receives |
| context | order record, retrieved policy chunks, earlier turns | the answer depends on it; freeze it so the case is reproducible |
| expected | "mentions the 5-7 business day window; does not promise a refund for orders over 30 days" | the checkable properties of a correct answer |
| reference (optional) | a model answer written by an expert | useful for judges and for one-right-answer tasks |
| tags | intent=refund, tone=angry, language=en, source=prod | for per-slice reporting |
| provenance | trace id, date, who labelled it, rubric version | so you can audit and refresh it |

📌 **Interview term: reference answer vs property checks** — a reference answer is one ideal output to compare against; property checks are assertions any correct output must satisfy. Open-ended tasks usually need property checks, because many different wordings are correct (the problem with overlap metrics is covered in [Why are BLEU and ROUGE poor metrics for LLM outputs, and what replaced them?](/interview-question/why-are-bleu-and-rouge-poor-metrics-for-llm-outputs-and-what-replaced-them)).

## 4. Where the Cases Come From

<svg class="iq-diagram" width="100%" viewBox="0 0 780 300" role="img" aria-label="Four sources feed a candidate pool: sampled production traces, known failures from users and support, deliberate edge and adversarial cases, and reviewed synthetic cases. The pool is deduplicated, stratified, labelled and split into dev and test">
  <rect class="d-box-accent" x="20" y="20" width="200" height="50" rx="8"/>
  <text class="d-text" x="120" y="50" text-anchor="middle">sampled real traces</text>
  <rect class="d-box" x="20" y="90" width="200" height="50" rx="8"/>
  <text class="d-text" x="120" y="120" text-anchor="middle">known failures</text>
  <rect class="d-box" x="20" y="160" width="200" height="50" rx="8"/>
  <text class="d-text" x="120" y="190" text-anchor="middle">edge and adversarial</text>
  <rect class="d-box-muted" x="20" y="230" width="200" height="50" rx="8"/>
  <text class="d-text" x="120" y="260" text-anchor="middle">synthetic, reviewed</text>
  <path class="d-edge" d="M 220 45 L 300 140"/>
  <path class="d-edge" d="M 220 115 L 300 145"/>
  <path class="d-edge" d="M 220 185 L 300 155"/>
  <path class="d-edge" d="M 220 255 L 300 160"/>
  <rect class="d-box" x="300" y="115" width="170" height="70" rx="8"/>
  <text class="d-text" x="385" y="145" text-anchor="middle">dedupe, cluster</text>
  <text class="d-sub" x="385" y="167" text-anchor="middle">stratify by slice</text>
  <path class="d-edge" d="M 470 150 L 530 150"/>
  <polygon class="d-arrow" points="530,144 540,150 530,156"/>
  <rect class="d-box" x="540" y="115" width="100" height="70" rx="8"/>
  <text class="d-text" x="590" y="145" text-anchor="middle">label</text>
  <text class="d-sub" x="590" y="167" text-anchor="middle">rubric</text>
  <path class="d-edge" d="M 640 130 L 690 85"/>
  <path class="d-edge" d="M 640 170 L 690 215"/>
  <rect class="d-box-accent" x="690" y="55" width="80" height="50" rx="8"/>
  <text class="d-text" x="730" y="85" text-anchor="middle">dev</text>
  <rect class="d-box-muted" x="690" y="195" width="80" height="50" rx="8"/>
  <text class="d-text" x="730" y="225" text-anchor="middle">test</text>
</svg>

In order of value:

1. **Sampled real traces.** What users actually type, with their typos, anger and missing context. Sample across days and user types, not one afternoon.
2. **Known failures.** Thumbs-down, escalations, support tickets, incidents. These are the cases you most need to never regress.
3. **Deliberate edge and adversarial cases.** Empty input, very long input, other languages, should-refuse requests, prompt-injection attempts (see [What is red-teaming an LLM application and how is it done?](/interview-question/what-is-red-teaming-an-llm-application-and-how-is-it-done)).
4. **Synthetic cases, reviewed.** An LLM can generate variations to fill a gap you have already identified (a rare intent, another language). They tend to be cleaner and more uniform than real users, so a person reviews them and they never replace real traffic once you have it.

📌 **Interview term: error analysis** — reading a sample of real outputs, writing down what went wrong in plain words, and grouping the notes into failure types with counts. It tells you which slices the dataset must cover and which graders to write. Practitioners such as Hamel Husain and Shreya Shankar put this step before choosing any metric (their "LLM Evals: Everything You Need to Know" FAQ on hamel.dev, checked October 2026).

## 5. Coverage Beats Volume

📌 **Interview term: deduplication and near-duplicate clustering** — normalising inputs (case, punctuation, numbers) to merge exact repeats, then grouping inputs that are textually very similar so one representative stands for the group.

📌 **Interview term: stratified sampling** — choosing cases per slice with a quota, instead of drawing them in proportion to traffic. A floor per slice guarantees rare but important categories appear at all.

The first example, **"From 200 traces to a 20-case golden set: dedupe, cluster, stratify, split"**, simulates a support log of 200 requests over six intents with realistic skew (60% order status, 1% legal threats). The key steps:

~~~js
const norm = (s) => s.toLowerCase().replace(/[0-9]+/g, "N").replace(/[^a-zN ]/g, "").replace(/\\s+/g, " ").trim();
// ... exact dedupe on norm(text), then join a cluster if jaccard(words) >= 0.6
const prop = Math.min(cl.length, Math.round(share * TARGET));
const strat = Math.min(cl.length, Math.max(FLOOR, prop));
~~~

~~~text
raw traces: 200
after normalise + exact dedupe: 27 distinct requests
near-duplicate clusters (jaccard >= 0.6): 22

intent         traffic  share  clusters  proportional  stratified
order_status       120  60.0%         7             7           7
refund              50  25.0%         5             5           5
cancel              20  10.0%         3             2           2
account              6   3.0%         3             1           2
legal                2   1.0%         2             0           2
out_of_scope         2   1.0%         2             0           2
~~~

Three lessons are visible. Two hundred traces held only 22 genuinely different requests: counting raw volume overstates coverage by almost ten times. Proportional sampling gave the legal-threat and out-of-scope intents **zero** cases, though those are where a bad answer is most expensive. And even the dominant intent capped at 7, because there were only 7 distinct ways people asked it; padding it with copies adds run cost, not information.

In a real system the normalisation and clustering would usually use embeddings rather than word overlap, and the slices would come from your error analysis, not just intent labels; the mechanism is the same.

## 6. Labels You Can Trust

📌 **Interview term: rubric** — the written rules that say what pass and fail mean for this feature, with concrete criteria ("states the 5-7 day window", "does not promise anything the policy does not allow") rather than adjectives ("helpful").

📌 **Interview term: inter-annotator agreement** — how often two independent labellers give the same label. If two experts disagree, the label is not golden, and neither a grader nor a model can be expected to match it.

📌 **Interview term: Cohen kappa** — agreement corrected for chance: (observed agreement − chance agreement) / (1 − chance agreement). 0 means no better than chance, 1 means perfect. Conventional bands (Landis and Koch, 1977) call 0.41-0.60 moderate, 0.61-0.80 substantial and above 0.80 almost perfect.

The second example, **"Label quality: raw agreement versus Cohen kappa, before and after a rubric fix"**:

~~~text
round 1, vague rubric
  annotator A vs B                 agreement  85%  chance  78.0%  kappa  0.32  (fair)
  annotator A vs always-pass       agreement  90%  chance  90.0%  kappa  0.00  (no better than chance)
~~~

85% agreement sounds solid, but when most answers pass, two people agree by chance most of the time. A labeller who marks *everything* pass scores 90% agreement and a kappa of exactly 0. The fix is not more labellers; it is a better rubric. The three disagreements were discussed, turned into concrete criteria, and the same answers relabelled:

~~~text
round 2, anchored rubric
  annotator A vs B                 agreement  95%  chance  65.0%  kappa  0.86  (almost perfect)
  cases to adjudicate: 15
~~~

The sharper rubric also found twice as many failures (2 to 4), which is the real prize: a vague rubric hides failures behind "it seems fine".

📌 **Interview term: adjudication** — resolving disagreements with a senior expert, and recording the decision as a rubric rule so the same disagreement does not recur.

The same agreement numbers are later used to check an LLM judge against these human labels; see [What is LLM-as-judge and what are its known biases?](/interview-question/what-is-llm-as-judge-and-what-are-its-known-biases)

## 7. Splits, Leakage and Versioning

📌 **Interview term: dev / test split** — the dev set is what you look at and tune against while iterating on prompts; the test set is held out and run rarely, to check that improvements generalise.

📌 **Interview term: leakage** — a test case that is the same as, or a near-copy of, a dev case (or a few-shot example in the prompt). Scores on it measure memory of the case, not behaviour.

~~~text
naive split of distinct requests: 5 of 13 test cases have a near-twin in dev
one case per cluster, split within each intent: dev 11, test 9, leaks 0
~~~

Splitting individual requests leaked 5 of 13 test cases ("cancel order N" in dev, "please cancel order N" in test). Splitting at the cluster level, one representative per cluster, leaked none. The same check should run against few-shot examples in the prompt: an eval case that also appears as an example in the prompt will always pass.

Version the dataset like code: a dataset version id stored with every eval run, a changelog (added 12 cases from the October incident, relabelled 3 after rubric v4), and scores compared only within the same version.

## 8. Verified: Running the Code

Both programs are deterministic simulations with a seeded generator. The trace log stands for a sample exported from your logging store; the annotator strings stand for two people labelling the same 20 outputs. They leave out embeddings for clustering, PII scrubbing and the labelling tool itself.

**"From 200 traces to a 20-case golden set: dedupe, cluster, stratify, split"** — \`node a.js\` and \`python3.12 a.py\` both print exactly:

~~~text
raw traces: 200
after normalise + exact dedupe: 27 distinct requests
near-duplicate clusters (jaccard >= 0.6): 22

intent         traffic  share  clusters  proportional  stratified
order_status       120  60.0%         7             7           7
refund              50  25.0%         5             5           5
cancel              20  10.0%         3             2           2
account              6   3.0%         3             1           2
legal                2   1.0%         2             0           2
out_of_scope         2   1.0%         2             0           2
golden set: 20 cases, 7 contain a user-flagged failure

naive split of distinct requests: 5 of 13 test cases have a near-twin in dev
one case per cluster, split within each intent: dev 11, test 9, leaks 0

rare-intent cases kept by the floor:
  [account] "reset my password" seen 3x, flagged
  [account] "delete my account" seen 2x
  [legal] "i will report you to consumer protection" seen 1x
  [legal] "this is a chargeback threat" seen 1x
  [out_of_scope] "what stock should i buy" seen 1x
  [out_of_scope] "write my history essay" seen 1x
~~~

**"Label quality: raw agreement versus Cohen kappa, before and after a rubric fix"** — \`node b.js\` and \`python3.12 b.py\` both print exactly:

~~~text
round 1, vague rubric
  annotator A vs B                 agreement  85%  chance  78.0%  kappa  0.32  (fair)
  annotator A vs always-pass       agreement  90%  chance  90.0%  kappa  0.00  (no better than chance)
  cases to adjudicate: 4, 9, 14

round 2, anchored rubric
  annotator A vs B                 agreement  95%  chance  65.0%  kappa  0.86  (almost perfect)
  cases to adjudicate: 15

failures annotator A found: round 1 2, round 2 4
~~~

What the runs show:

- 200 traces reduced to 27 distinct requests and 22 clusters; a 20-case set built with a floor of 2 covered all six intents, including two with 1% of traffic.
- Seven of the 20 cases carried a user-flagged failure, because flagged traces were preferred as cluster representatives.
- Raw agreement of 85% hid a kappa of 0.32; after a rubric fix kappa was 0.86 and more failures were found.

## 9. Keeping It Alive

- **Feed it from production.** Every incident, escalation or thumbs-down that reveals a new failure type becomes a case before the fix ships; see [How do you monitor LLM quality drift in production?](/interview-question/how-do-you-monitor-llm-quality-drift-in-production)
- **Refresh, do not just append.** Retire cases for features that no longer exist; resample traffic periodically so the mix tracks current users.
- **Freeze context.** Store retrieved documents or tool results with the case, or the case changes when your index does. For end-to-end RAG evaluation, see [How do you evaluate a RAG pipeline end to end?](/interview-question/how-do-you-evaluate-a-rag-pipeline-end-to-end)
- **Size per slice.** Grow slices where decisions are close; the interval arithmetic is in [What are evals and why does every LLM feature need them?](/interview-question/what-are-evals-and-why-does-every-llm-feature-need-them)

## Edge Cases Worth Knowing

- **Multi-turn conversations.** A case may need the earlier turns; store the whole conversation state, and decide whether you grade the last turn or the whole dialogue.
- **Time-sensitive answers.** "What is the current refund window?" changes when the policy does; label against a policy version and re-label on change.
- **Cases with no correct answer.** Ambiguous or unanswerable inputs are valuable: the expected behaviour is to ask a clarifying question or say it does not know.
- **Label drift.** The rubric gets stricter over time; relabel old cases or keep the rubric version per case so scores stay comparable.

## Common Pitfalls

- **Only happy paths.** A set written on launch day by the engineers who built the feature, with no angry, ambiguous or should-refuse inputs.
- **Proportional sampling of traffic.** It reproduces the head of the distribution and gives rare, high-risk slices zero cases.
- **Counting copies as coverage.** Thirty paraphrases of one question make the score look stable while testing one behaviour.
- **Labels from non-experts with no rubric.** High raw agreement, low kappa, and failures nobody notices.
- **Tuning on the test set.** Looking at the held-out cases every iteration until they stop being held out; leaking near-twins across the split.
- **Unversioned data.** Comparing this week's score on 140 cases with last week's score on 120 cases and calling it a trend.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Start from real traffic:</strong> <span style="color:#f0e2c8;">I sample real traces from production or a beta, normalise and dedupe them, and cluster near-duplicates. In my demo 200 traces collapsed to 27 distinct requests and 22 clusters: volume is not coverage.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Stratify, with a floor:</strong> <span style="color:#f0e2c8;">I pick cases per intent or slice, not proportionally to traffic. Proportional sampling of 20 cases gave the legal-threat and out-of-scope intents zero cases; a floor of two per slice keeps the rare, high-stakes ones. Then I add known failures, edge cases and adversarial inputs on purpose.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Define what correct means:</strong> <span style="color:#f0e2c8;">Each case stores the input, any context it needs, and either a reference answer or, more often, the properties a correct answer must have, plus slice tags and where it came from. Domain experts write or check those labels against a written rubric.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Measure the labels:</strong> <span style="color:#f0e2c8;">Two annotators label a sample and I compute <strong style="color:#ffca28;">Cohen kappa</strong>, not raw agreement. My demo had 85% agreement but kappa 0.32, and an always-pass labeller still scored 90% agreement with kappa 0. Disagreements get adjudicated into rubric rules; after that, kappa rose to 0.86.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keep it honest:</strong> <span style="color:#f0e2c8;">A dev split to iterate on and a held-out test split, split by cluster so near-twins cannot leak. The set is versioned, PII is scrubbed, and every production failure becomes a new case, so the dataset tracks reality rather than launch day.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How big should it be?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Start with 30 to 100 well-chosen cases so you can read every failure. Grow it where decisions are close or a slice matters: at an 80% pass rate the 95% interval is about 33 points wide at 20 cases and about 8 points at 400. Size per slice matters more than total size.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you just generate the dataset with an LLM?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Synthetic cases are useful to fill gaps you already know about, such as rare intents, other languages or adversarial phrasings, and to bootstrap before launch. They tend to be cleaner and more uniform than real users, so they should be reviewed by a person and should not replace real traces once you have them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you need reference answers for every case?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. For open-ended outputs a single reference answer punishes valid paraphrases. It is often better to store checkable properties (must mention the 5-7 day window, must not promise a refund outside policy, must be valid JSON) and grade those, keeping full references for tasks with one right answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop overfitting to the golden set?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a held-out test split that you run rarely and do not tune against, refresh it from new traffic, and split by cluster so a paraphrase of a dev case is not in test. If dev scores climb and test does not, you are tuning to the cases.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle PII in traces?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Scrub or pseudonymise before cases enter the set, keep the raw trace link only in a restricted store, honour retention and deletion requests, and prefer replacing real names and numbers with consistent placeholders so the case still tests the same behaviour.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Golden dataset | Curated, versioned eval cases with trusted labels |
| Reference answer vs property checks | One ideal output to compare to, versus assertions any correct output must satisfy |
| Error analysis | Reading real outputs and grouping failures into counted types |
| Deduplication / near-duplicate clustering | Merging repeats and grouping very similar inputs |
| Stratified sampling | Quota per slice, with a floor, instead of proportional to traffic |
| Rubric | Written, concrete pass/fail criteria |
| Inter-annotator agreement | How often independent labellers agree |
| Cohen kappa | Agreement corrected for chance |
| Adjudication | Resolving label disagreements into rubric rules |
| Dev / test split | Set you tune on versus held-out set you check generalisation on |
| Leakage | Test cases duplicated in dev or in the prompt examples |

**Conclusion:** A golden dataset is designed, not collected. Start from real traces, dedupe and cluster them (200 traces held only 22 distinct requests in the demo), stratify by slice with a floor so rare, costly categories exist at all, and add known failures and deliberate edge cases. Store each case with its frozen context, the properties a correct answer must have, tags and provenance. Have domain experts label against a concrete rubric and measure agreement with kappa rather than raw agreement, because 85% agreement was only 0.32 kappa until the rubric was fixed. Split by cluster so test cases do not leak, version the set, and keep feeding it from production failures so it measures the product people actually use.`,
    examples: [
      {
        label: `From 200 traces to a 20-case golden set: dedupe, cluster, stratify, split`,
        variants: [
          { tech: "node", code: `// Building a golden dataset from production traces (simulated in memory):
// normalise + dedupe, cluster near-duplicates, stratify by intent with a floor
// for rare intents, keep user-flagged failures, split dev/test by cluster.
const phrasings = {
  order_status: ["where is my order N", "where is my order N please", "wheres my order N", "has order N shipped",
    "has my order N shipped yet", "track package N", "when will order N arrive", "order N still not here", "is order N delayed"],
  refund: ["how do i get a refund", "how do i get a refund for order N", "refund for a damaged item",
    "refund for damaged item please", "how long do refunds take", "i was charged twice", "money back for order N"],
  cancel: ["cancel order N", "please cancel order N", "can i cancel my subscription", "stop my subscription"],
  account: ["reset my password", "change my email address", "delete my account"],
  legal: ["i will report you to consumer protection", "this is a chargeback threat"],
  out_of_scope: ["write my history essay", "what stock should i buy"],
};
const volume = { order_status: 120, refund: 50, cancel: 20, account: 6, legal: 2, out_of_scope: 2 };
const intents = Object.keys(volume);

let seed = 2024;
const rand = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
const traces = [];
for (const intent of intents) {
  const pool = phrasings[intent];
  for (let i = 0; i < volume[intent]; i++) {
    const p = i < pool.length ? pool[i] : pool[Math.floor(rand() * pool.length)];
    let text = p.replace("N", String(1000 + Math.floor(rand() * 9000)));
    if (rand() < 0.3) text = text.toUpperCase();
    if (rand() < 0.2) text += "??";
    traces.push({ intent, text, flagged: rand() < 0.04 });
  }
}
console.log(\`raw traces: \${traces.length}\`);

const norm = (s) => s.toLowerCase().replace(/[0-9]+/g, "N").replace(/[^a-zN ]/g, "").replace(/\\s+/g, " ").trim();
const byKey = new Map();
for (const t of traces) {
  const k = norm(t.text);
  if (!byKey.has(k)) byKey.set(k, { key: k, intent: t.intent, count: 0, flagged: false });
  const u = byKey.get(k);
  u.count++;
  u.flagged = u.flagged || t.flagged;
}
const unique = [...byKey.values()];
console.log(\`after normalise + exact dedupe: \${unique.length} distinct requests\`);

const jaccard = (a, b) => {
  const A = new Set(a.split(" ")), B = new Set(b.split(" "));
  let i = 0;
  for (const w of A) if (B.has(w)) i++;
  return i / (A.size + B.size - i);
};
const NEAR = 0.6;
const clusters = [];
for (const u of unique) {
  const c = clusters.find((cl) => cl.intent === u.intent && cl.members.some((m) => jaccard(m.key, u.key) >= NEAR));
  if (c) { c.members.push(u); u.cluster = c.id; } else { u.cluster = clusters.length; clusters.push({ id: clusters.length, intent: u.intent, members: [u] }); }
}
console.log(\`near-duplicate clusters (jaccard >= \${NEAR}): \${clusters.length}\`);
console.log("");

const TARGET = 20, FLOOR = 2;
const rank = (a, b) => (b.flagged - a.flagged) || (b.count - a.count) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
console.log("intent         traffic  share  clusters  proportional  stratified");
const golden = [];
for (const intent of intents) {
  const share = volume[intent] / traces.length;
  const cl = clusters.filter((c) => c.intent === intent);
  const prop = Math.min(cl.length, Math.round(share * TARGET));
  const strat = Math.min(cl.length, Math.max(FLOOR, prop));
  const reps = cl.map((c) => c.members.slice().sort(rank)[0]).sort(rank);
  golden.push(...reps.slice(0, strat));
  console.log(\`\${intent.padEnd(14)} \${String(volume[intent]).padStart(7)} \${(100 * share).toFixed(1).padStart(5)}%  \${String(cl.length).padStart(8)}  \${String(prop).padStart(12)}  \${String(strat).padStart(10)}\`);
}
console.log(\`golden set: \${golden.length} cases, \${golden.filter((g) => g.flagged).length} contain a user-flagged failure\`);
console.log("");

const leaks = (test, dev) => test.filter((x) => dev.some((y) => x.intent === y.intent && jaccard(x.key, y.key) >= NEAR)).length;
const nDev = unique.filter((u, i) => i % 2 === 0), nTest = unique.filter((u, i) => i % 2 === 1);
console.log(\`naive split of distinct requests: \${leaks(nTest, nDev)} of \${nTest.length} test cases have a near-twin in dev\`);
const gDev = [], gTest = [];
for (const intent of intents) golden.filter((g) => g.intent === intent).forEach((g, i) => (i % 2 === 0 ? gDev : gTest).push(g));
console.log(\`one case per cluster, split within each intent: dev \${gDev.length}, test \${gTest.length}, leaks \${leaks(gTest, gDev)}\`);
console.log("");
console.log("rare-intent cases kept by the floor:");
for (const g of golden.filter((x) => volume[x.intent] < 10)) console.log(\`  [\${g.intent}] "\${g.key}" seen \${g.count}x\${g.flagged ? ", flagged" : ""}\`);` },
          { tech: "python", code: `# Building a golden dataset from production traces (simulated in memory):
# normalise + dedupe, cluster near-duplicates, stratify by intent with a floor
# for rare intents, keep user-flagged failures, split dev/test by cluster.
import re

phrasings = {
    "order_status": ["where is my order N", "where is my order N please", "wheres my order N", "has order N shipped",
                     "has my order N shipped yet", "track package N", "when will order N arrive", "order N still not here", "is order N delayed"],
    "refund": ["how do i get a refund", "how do i get a refund for order N", "refund for a damaged item",
               "refund for damaged item please", "how long do refunds take", "i was charged twice", "money back for order N"],
    "cancel": ["cancel order N", "please cancel order N", "can i cancel my subscription", "stop my subscription"],
    "account": ["reset my password", "change my email address", "delete my account"],
    "legal": ["i will report you to consumer protection", "this is a chargeback threat"],
    "out_of_scope": ["write my history essay", "what stock should i buy"],
}
volume = {"order_status": 120, "refund": 50, "cancel": 20, "account": 6, "legal": 2, "out_of_scope": 2}
intents = list(volume)

seed = 2024


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


traces = []
for intent in intents:
    pool = phrasings[intent]
    for i in range(volume[intent]):
        p = pool[i] if i < len(pool) else pool[int(rand() * len(pool))]
        text = p.replace("N", str(1000 + int(rand() * 9000)), 1)
        if rand() < 0.3:
            text = text.upper()
        if rand() < 0.2:
            text += "??"
        traces.append({"intent": intent, "text": text, "flagged": rand() < 0.04})
print(f"raw traces: {len(traces)}")


def norm(s):
    s = re.sub(r"[0-9]+", "N", s.lower())
    s = re.sub(r"[^a-zN ]", "", s)
    return re.sub(r"\\s+", " ", s).strip()


by_key = {}
for t in traces:
    k = norm(t["text"])
    if k not in by_key:
        by_key[k] = {"key": k, "intent": t["intent"], "count": 0, "flagged": False}
    u = by_key[k]
    u["count"] += 1
    u["flagged"] = u["flagged"] or t["flagged"]
unique = list(by_key.values())
print(f"after normalise + exact dedupe: {len(unique)} distinct requests")


def jaccard(a, b):
    A, B = set(a.split(" ")), set(b.split(" "))
    i = len(A & B)
    return i / (len(A) + len(B) - i)


NEAR = 0.6
clusters = []
for u in unique:
    c = next((cl for cl in clusters if cl["intent"] == u["intent"] and any(jaccard(m["key"], u["key"]) >= NEAR for m in cl["members"])), None)
    if c:
        c["members"].append(u)
        u["cluster"] = c["id"]
    else:
        u["cluster"] = len(clusters)
        clusters.append({"id": len(clusters), "intent": u["intent"], "members": [u]})
print(f"near-duplicate clusters (jaccard >= {NEAR}): {len(clusters)}")
print("")

TARGET, FLOOR = 20, 2
rank = lambda m: (-int(m["flagged"]), -m["count"], m["key"])
print("intent         traffic  share  clusters  proportional  stratified")
golden = []
for intent in intents:
    share = volume[intent] / len(traces)
    cl = [c for c in clusters if c["intent"] == intent]
    prop = min(len(cl), int(share * TARGET + 0.5))
    strat = min(len(cl), max(FLOOR, prop))
    reps = sorted((sorted(c["members"], key=rank)[0] for c in cl), key=rank)
    golden.extend(reps[:strat])
    print(f"{intent:<14} {volume[intent]:>7} {100 * share:>5.1f}%  {len(cl):>8}  {prop:>12}  {strat:>10}")
print(f"golden set: {len(golden)} cases, {sum(1 for g in golden if g['flagged'])} contain a user-flagged failure")
print("")


def leaks(test, dev):
    return sum(1 for x in test if any(x["intent"] == y["intent"] and jaccard(x["key"], y["key"]) >= NEAR for y in dev))


n_dev = [u for i, u in enumerate(unique) if i % 2 == 0]
n_test = [u for i, u in enumerate(unique) if i % 2 == 1]
print(f"naive split of distinct requests: {leaks(n_test, n_dev)} of {len(n_test)} test cases have a near-twin in dev")
g_dev, g_test = [], []
for intent in intents:
    for i, g in enumerate(g for g in golden if g["intent"] == intent):
        (g_dev if i % 2 == 0 else g_test).append(g)
print(f"one case per cluster, split within each intent: dev {len(g_dev)}, test {len(g_test)}, leaks {leaks(g_test, g_dev)}")
print("")
print("rare-intent cases kept by the floor:")
for g in golden:
    if volume[g["intent"]] < 10:
        print(f"  [{g['intent']}] \\"{g['key']}\\" seen {g['count']}x{', flagged' if g['flagged'] else ''}")` },
        ],
      },
      {
        label: `Label quality: raw agreement versus Cohen kappa, before and after a rubric fix`,
        variants: [
          { tech: "node", code: `// Are the golden labels trustworthy? Two annotators label the same 20 answers
// pass (P) or fail (F). Raw agreement flatters; Cohen's kappa corrects for chance.
function kappa(a, b) {
  const n = a.length;
  let agree = 0, aP = 0, bP = 0;
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) agree++;
    if (a[i] === "P") aP++;
    if (b[i] === "P") bP++;
  }
  const po = agree / n;
  const pe = (aP / n) * (bP / n) + (1 - aP / n) * (1 - bP / n);
  return { po, pe, k: pe === 1 ? 0 : (po - pe) / (1 - pe) };
}
function report(name, a, b) {
  const { po, pe, k } = kappa(a, b);
  const band = k <= 0.001 ? "no better than chance" : k < 0.2 ? "slight" : k < 0.4 ? "fair" : k < 0.6 ? "moderate" : k < 0.8 ? "substantial" : "almost perfect";
  console.log(\`\${name.padEnd(34)} agreement \${(100 * po).toFixed(0).padStart(3)}%  chance \${(100 * pe).toFixed(1).padStart(5)}%  kappa \${k.toFixed(2).padStart(5)}  (\${band})\`);
}
const disagreements = (a, b) => [...a].map((x, i) => (x !== b[i] ? i + 1 : 0)).filter(Boolean);

// round 1: rubric says only "is the answer helpful?"
const r1a = "PPPPPPPPFPPPPPPPFPPP";
const r1b = "PPPFPPPPPPPPPFPPFPPP";
// a lazy annotator who marks everything pass
const lazy = "PPPPPPPPPPPPPPPPPPPP";
// round 2: rubric rewritten with anchored criteria after discussing round-1 disagreements
// ("states the 5-7 day refund window", "no promise the policy does not allow")
const r2a = "PPPFPPPPFPPFPPPPFPPP";
const r2b = "PPPFPPPPFPPFPPFPFPPP";

console.log("round 1, vague rubric");
report("  annotator A vs B", r1a, r1b);
report("  annotator A vs always-pass", r1a, lazy);
console.log(\`  cases to adjudicate: \${disagreements(r1a, r1b).join(", ")}\`);
console.log("");
console.log("round 2, anchored rubric");
report("  annotator A vs B", r2a, r2b);
console.log(\`  cases to adjudicate: \${disagreements(r2a, r2b).join(", ")}\`);
console.log("");
const failsA1 = [...r1a].filter((x) => x === "F").length;
const failsA2 = [...r2a].filter((x) => x === "F").length;
console.log(\`failures annotator A found: round 1 \${failsA1}, round 2 \${failsA2}\`);` },
          { tech: "python", code: `# Are the golden labels trustworthy? Two annotators label the same 20 answers
# pass (P) or fail (F). Raw agreement flatters; Cohen's kappa corrects for chance.


def kappa(a, b):
    n = len(a)
    agree = sum(1 for x, y in zip(a, b) if x == y)
    a_p = a.count("P")
    b_p = b.count("P")
    po = agree / n
    pe = (a_p / n) * (b_p / n) + (1 - a_p / n) * (1 - b_p / n)
    return po, pe, (0 if pe == 1 else (po - pe) / (1 - pe))


def report(name, a, b):
    po, pe, k = kappa(a, b)
    if k <= 0.001:
        band = "no better than chance"
    elif k < 0.2:
        band = "slight"
    elif k < 0.4:
        band = "fair"
    elif k < 0.6:
        band = "moderate"
    elif k < 0.8:
        band = "substantial"
    else:
        band = "almost perfect"
    print(f"{name:<34} agreement {100 * po:>3.0f}%  chance {100 * pe:>5.1f}%  kappa {k:>5.2f}  ({band})")


def disagreements(a, b):
    return [i + 1 for i, (x, y) in enumerate(zip(a, b)) if x != y]


# round 1: rubric says only "is the answer helpful?"
r1a = "PPPPPPPPFPPPPPPPFPPP"
r1b = "PPPFPPPPPPPPPFPPFPPP"
# a lazy annotator who marks everything pass
lazy = "PPPPPPPPPPPPPPPPPPPP"
# round 2: rubric rewritten with anchored criteria after discussing round-1 disagreements
# ("states the 5-7 day refund window", "no promise the policy does not allow")
r2a = "PPPFPPPPFPPFPPPPFPPP"
r2b = "PPPFPPPPFPPFPPFPFPPP"

print("round 1, vague rubric")
report("  annotator A vs B", r1a, r1b)
report("  annotator A vs always-pass", r1a, lazy)
print(f"  cases to adjudicate: {', '.join(str(i) for i in disagreements(r1a, r1b))}")
print("")
print("round 2, anchored rubric")
report("  annotator A vs B", r2a, r2b)
print(f"  cases to adjudicate: {', '.join(str(i) for i in disagreements(r2a, r2b))}")
print("")
print(f"failures annotator A found: round 1 {r1a.count('F')}, round 2 {r2a.count('F')}")` },
        ],
      },
    ],
  },
  {
    title: `When do you use code-based graders versus model-based graders?`,
    difficulty: "medium",
    seoDescription: `Code graders for objective checks (schema, values, regex, citations, tests); LLM judges for tone and faithfulness, validated against human labels.`,
    description: `**Question presented to candidate:**
"You are setting up evals for an assistant that answers refund questions with a JSON record and a short customer message. Which checks would you write as code, which would you hand to an LLM grader, and how would you decide in general?"

**What a strong answer should cover:**
- Code-based graders for anything with an objective answer: schema and parse checks, exact or normalised match, numeric tolerance, regex or forbidden-content rules, citations that must resolve, unit tests for generated code; they are cheap, fast, deterministic and debuggable
- Model-based graders (LLM-as-judge) only for qualities code cannot decide: tone, faithfulness to sources, helpfulness, whether a free-text answer addresses the question; they need a rubric, cost a model call per case and carry biases
- Decompose a vague quality into checkable parts first; often most of "is this answer good" turns into code checks, with one or two judged dimensions left
- Validate any model grader against human labels before trusting it: confusion matrix, how many real failures it catches, kappa, and re-validation when the judge model or prompt changes
- Layer them: code checks gate first (fail fast, no judge cost on broken output), judges on what survives, humans to calibrate both and to review disagreements

**Clarifying questions expected:**
- Is there a single correct answer for parts of the output (IDs, amounts, policy windows), or is it all open-ended prose?
- How often will the suite run, and what is the budget per run?
- Do we have human-labelled examples to validate a judge against?

**Code / implementation expected:** Optional — a few code graders plus a stub judge over the same outputs, or a confusion matrix comparing a judge with human labels.`,
    answer: `**Target Audience:** Engineers writing their first eval suite who need to decide, check by check, whether to write a function or ask a model, and candidates who should be able to defend that choice.
**Difficulty:** Medium
**Verified with:** Node 22 and Python 3.12 (five code graders and a stub judge over ten outputs, and a judge-versus-human validation with corrected pass rates). Judge verdicts are canned stand-ins for model calls; token prices in the cost line are assumptions. Vendor tooling is described from its docs with dates, checked October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the examples; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A school exam has two kinds of question. "What is 17 × 23?" is marked by a machine reading the answer sheet: fast, cheap, and the same result every time. "Write a persuasive letter to the council" is marked by a teacher with a mark scheme, because no machine can tell whether a letter is persuasive. Nobody would hire teachers to mark the arithmetic, and nobody would trust the answer-sheet reader with the letter.

Then a wise head teacher notices two things. First, much of the letter question can be machine-marked after all: is it under 300 words, does it name the council, does it include a date? Second, the teachers do not always agree, so before their marks count, she has two teachers mark the same 50 letters and checks how often they match.

That is the whole answer to this question. **Code graders** are the answer-sheet reader. **Model-based graders** are a teacher you can afford to hire by the thousand, who marks fast but has habits you must measure. Use code for everything objective, decompose fuzzy qualities until most of them become objective, and validate the model grader against people before trusting it.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which parts of the output have one right answer? | Those become code graders: IDs, amounts, labels, formats. |
| How often does the suite run, and at what budget? | A judge call per case per dimension per run adds up quickly. |
| Do we have human-labelled examples? | Without them a model grader cannot be validated. |
| How is the output consumed, by code or by a person? | Code consumers need strict format checks; people care about tone and clarity. |

## 3. The Two Kinds of Grader

📌 **Interview term: code-based grader (deterministic grader)** — a function that checks an output with ordinary code: parse it, compare a field, match a pattern, run tests. The same output always gets the same verdict, it costs almost nothing, and when it fails you can read exactly why.

📌 **Interview term: model-based grader (LLM-as-judge)** — a language model prompted with a rubric that reads the output (and usually the input, sources or a reference) and returns a verdict or score. It can judge meaning, tone and faithfulness, but costs a model call, varies with the judge model and prompt, and has known biases covered in [What is LLM-as-judge and what are its known biases?](/interview-question/what-is-llm-as-judge-and-what-are-its-known-biases)

<svg class="iq-diagram" width="100%" viewBox="0 0 760 240" role="img" aria-label="A layered grading pipeline: the output first goes through code checks, and only outputs that pass go to the judge; humans sample both to calibrate them">
  <rect class="d-box" x="20" y="80" width="120" height="70" rx="8"/>
  <text class="d-text" x="80" y="112" text-anchor="middle">output</text>
  <text class="d-sub" x="80" y="134" text-anchor="middle">JSON + reply</text>
  <path class="d-edge" d="M 140 115 L 200 115"/>
  <polygon class="d-arrow" points="200,109 210,115 200,121"/>
  <rect class="d-box-accent" x="210" y="80" width="170" height="70" rx="8"/>
  <text class="d-text" x="295" y="112" text-anchor="middle">code graders</text>
  <text class="d-sub" x="295" y="134" text-anchor="middle">schema, values, regex</text>
  <path class="d-edge" d="M 380 115 L 440 115"/>
  <polygon class="d-arrow" points="440,109 450,115 440,121"/>
  <rect class="d-box" x="450" y="80" width="150" height="70" rx="8"/>
  <text class="d-text" x="525" y="112" text-anchor="middle">model grader</text>
  <text class="d-sub" x="525" y="134" text-anchor="middle">tone, faithfulness</text>
  <path class="d-edge" d="M 600 115 L 650 115"/>
  <polygon class="d-arrow" points="650,109 660,115 650,121"/>
  <rect class="d-box-muted" x="660" y="80" width="90" height="70" rx="8"/>
  <text class="d-text" x="705" y="120" text-anchor="middle">verdict</text>
  <path class="d-edge-dashed" d="M 295 80 L 295 30 L 520 30"/>
  <path class="d-edge-dashed" d="M 525 80 L 525 60"/>
  <rect class="d-box-muted" x="520" y="10" width="140" height="40" rx="8"/>
  <text class="d-sub" x="590" y="35" text-anchor="middle">human sample</text>
  <path class="d-edge-dashed" d="M 295 150 L 295 200 L 120 200"/>
  <rect class="d-box-muted" x="20" y="180" width="100" height="40" rx="8"/>
  <text class="d-sub" x="70" y="205" text-anchor="middle">fail fast</text>
</svg>

Code checks run first: a reply whose JSON does not parse is a failure, and spending judge tokens on it is waste. The judge sees only outputs that are already mechanically correct, and a human sample keeps both honest.

## 4. The Code Graders You Will Actually Write

| Grader | Checks | Example |
| :--- | :--- | :--- |
| Parse / schema | output is valid JSON with required keys and types | \`JSON.parse\` + key check, or a JSON Schema validator |
| Exact match after normalisation | one right value | label, ID, yes/no, after lower-casing and trimming |
| Numeric tolerance | numbers within an allowed error | \`Math.abs(amount - 59.99) < 0.005\` |
| Contains / regex | required phrase present, forbidden phrase absent | must say "5-7 business days"; must not say "guaranteed" |
| Reference resolution | citations, links or IDs point to things that exist | every \`[P2]\` is a real policy section |
| Execution | generated code or SQL runs and passes tests | unit tests in a sandbox |
| Budget | length, latency, tokens, number of tool calls | reply under 80 words |

Execution deserves a special mention: for code generation, running the tests is the strongest grader there is. A judge reading code to decide whether it is correct is a much weaker signal.

## 5. Ten Replies, Seven Graders

The first example, **"Five code graders and a stub judge on ten refund replies"**, grades ten replies to one refund request against the policy "refunds within 30 days, paid in 5-7 business days [P2]". Humans labelled each one. The judge verdicts are canned, standing in for what a rubric-following model returned; that is the only part that is not real code.

~~~js
fields: (o) => {
  const j = JSON.parse(o.json);
  return j.order_id === 1042 && Math.abs(j.amount - 59.99) < 0.005
    && String(j.currency).toUpperCase() === "USD" && j.eligible === true;
},
no_promise: (o) => !/\\b(tomorrow|today|guarantee[d]?)\\b/i.test(o.reply),
citations: (o) => { const c = o.reply.match(/\\[P\\d+\\]/g) || []; return c.length > 0 && c.every((x) => x.slice(1, -1) in POLICY); },
~~~

~~~text
failures caught by a code grader: 2, 3, 5, 6, 10
failures caught only by the judge: 7, 8
code graders alone agree with humans on 8/10
code + judge agree with humans on 10/10
~~~

Read the grid in the Verified section case by case:

- **Case 4** uses \`"usd"\` in lower case. A naive exact-match grader would fail it; the normalising grader passes it, matching the human. Normalisation is part of writing good code graders.
- **Case 10** says "5-7 days" instead of "5-7 business days". The judge read it as fine; the phrase check did not. A precise policy fact is exactly where code beats a model.
- **Case 7** is correct but rude, and **case 8** invents a coupon while citing a real policy section. Every code grader passed them; only the judge caught them. That is the job a model grader is for.

📌 **Interview term: decomposition** — splitting a vague quality ("is this a good reply?") into specific criteria, most of which can be checked by code. Here "good" became five code checks and two judged dimensions.

## 6. What Model Graders Cost

The same program prints the cost of the judge layer under stated assumptions (2,000 cases, two judged dimensions, 900 input and 150 output tokens per call, $3 and $15 per million input and output tokens; these prices are placeholders, not a quote from any provider):

~~~text
code graders: 0 model calls, $0.00 per run
judge graders: 4000 model calls, $19.80 per run, $594.00 per month at one run a day
~~~

That is affordable, but it is a running cost that grows with cases × dimensions × runs, and it adds minutes of latency to CI. Code checks that fail fast shrink both, and a cheaper judge model is an option once it has been validated against human labels as well as the expensive one.

## 7. Validating a Model Grader

📌 **Interview term: grader validation (judge calibration)** — running the grader on cases humans have labelled and measuring how often it agrees, before using its scores to make decisions.

📌 **Interview term: confusion matrix** — the 2×2 table of grader verdict versus human verdict. The cell that matters most is usually *human fail, judge pass*: failures the grader lets through.

📌 **Interview term: true negative rate (failure recall)** — the share of real failures the grader flags. A grader with high accuracy can still miss most failures when failures are rare.

The second example, **"Validating a model grader against human labels, and correcting its pass rate"**, compares two judge versions on the same 50 human-labelled outputs (canned verdicts again):

~~~text
judge v1: one 1-10 helpfulness score, pass if >= 7
                 judge pass  judge fail
  human pass             33           2
  human fail              6           9
  accuracy 84.0%  kappa 0.59  catches 60.0% of real failures  keeps 94.3% of real passes
  pass rate: humans 70.0%, judge 78.0%
~~~

84% accuracy sounds good, but the judge let 6 of 15 real failures through and reported a pass rate 8 points too high. The second version (binary verdict per criterion, reasoning written before the verdict) caught 13 of 15. The verdicts here are illustrative numbers, not a measurement of any real model; the method is what transfers. The rubric changes themselves are the subject of the LLM-as-judge question.

📌 **Interview term: prevalence correction (Rogan-Gladen estimator)** — once you know a grader's rates of agreeing on passes (TPR) and on failures (TNR), you can correct an observed pass rate: true ≈ (observed + TNR − 1) / (TPR + TNR − 1).

~~~text
same 1000 production outputs, raw judge pass rate -> corrected estimate
  judge v1: 85.0% -> 82.9%
  judge v2: 76.0% -> 80.2%
~~~

The two judges disagree by 9 points on the raw rate; after correction they agree within 3. This is how you report a judge-graded metric honestly. It assumes the validation set looks like production, and the estimate has its own uncertainty because TPR and TNR came from only 50 cases.

## 8. Vendor Tooling, Briefly

Most eval tooling offers both kinds. Anthropic docs on developing tests rank grading methods as code-based first (fast, reliable, scalable, but limited for nuanced judgements), LLM-based for complex judgements once you have checked it is reliable, and human grading last because it is slow and costly (Anthropic docs, "Develop tests", checked October 2026). OpenAI documents graders including \`string_check\`, \`text_similarity\`, \`score_model\`, \`label_model\` and a \`python\` grader for its Evals API; a search of that graders guide in October 2026 also showed a notice that graders are being deprecated along with the workflows they support, so check the current status before building on it (OpenAI Graders guide, as seen via search). Frameworks such as Ragas and DeepEval package judge-style metrics; see [Evaluating RAG with Ragas: faithfulness, answer relevancy, context precision?](/interview-question/evaluating-rag-with-ragas-faithfulness-answer-relevancy-context-precision) and [Beyond Ragas: how do you eval LLMs with LLM-as-judge, DeepEval, and human eval?](/interview-question/beyond-ragas-how-do-you-eval-llms-with-llm-as-judge-deepeval-and-human-eval)

## 9. Verified: Running the Code

Both programs use only the standard library. The judge verdicts are hard-coded tables standing in for model calls; the prices in the cost line are assumptions. What is left out: a real judge prompt, judge variance between runs, and confidence intervals on TPR and TNR.

**"Five code graders and a stub judge on ten refund replies"** — \`node a.js\` and \`python3.12 a.py\` both print exactly:

~~~text
case  json_schema  fields       window       no_promise   citations    judge_tone   judge_faith  human
1     ok           ok           ok           ok           ok           ok           ok           pass
2     X            X            ok           ok           ok           ok           ok           fail
3     ok           X            ok           ok           ok           ok           ok           fail
4     ok           ok           ok           ok           ok           ok           ok           pass
5     ok           ok           ok           X            ok           ok           ok           fail
6     ok           ok           ok           ok           X            ok           ok           fail
7     ok           ok           ok           ok           ok           X            ok           fail
8     ok           ok           ok           ok           ok           ok           X            fail
9     ok           ok           ok           ok           ok           ok           ok           pass
10    ok           ok           X            ok           ok           ok           ok           fail

failures caught by a code grader: 2, 3, 5, 6, 10
failures caught only by the judge: 7, 8
code graders alone agree with humans on 8/10
code + judge agree with humans on 10/10

assumed: 2000 cases, 2 judge dimensions, 900 in + 150 out tokens per call, $3/$15 per M tokens
code graders: 0 model calls, $0.00 per run
judge graders: 4000 model calls, $19.80 per run, $594.00 per month at one run a day
~~~

**"Validating a model grader against human labels, and correcting its pass rate"** — \`node b.js\` and \`python3.12 b.py\` both print exactly:

~~~text
judge v1: one 1-10 helpfulness score, pass if >= 7
                 judge pass  judge fail
  human pass             33           2
  human fail              6           9
  accuracy 84.0%  kappa 0.59  catches 60.0% of real failures  keeps 94.3% of real passes
  pass rate: humans 70.0%, judge 78.0%

judge v2: binary verdict per rubric criterion, reasoning before verdict
                 judge pass  judge fail
  human pass             32           3
  human fail              2          13
  accuracy 90.0%  kappa 0.77  catches 86.7% of real failures  keeps 91.4% of real passes
  pass rate: humans 70.0%, judge 68.0%

same 1000 production outputs, raw judge pass rate -> corrected estimate
  judge v1: 85.0% -> 82.9%
  judge v2: 76.0% -> 80.2%
~~~

What the runs show:

- Code graders alone matched the human verdict on 8 of 10 replies and caught a failure (case 10) that the judge missed; the judge added the two failures only meaning can reveal.
- A judge can score 84% accuracy and still miss 40% of real failures; reading the confusion matrix, not the accuracy, is the point of validation.
- Measured TPR and TNR turn a judge's raw pass rate into a corrected estimate, which brought two very different judges within 3 points of each other.

## 10. A Decision Guide

| If the property is... | Use | Notes |
| :--- | :--- | :--- |
| a format or schema | code | parse and validate; fail fast |
| a single right value | code | normalise first; numbers with tolerance |
| a required or forbidden phrase | code | regex; watch for negations ("we do not offer refunds") |
| executable (code, SQL) | code | run tests in a sandbox |
| faithful to given sources | model (or NLI model) | give the judge the sources; one claim at a time is more reliable |
| tone, empathy, clarity | model | binary per-criterion rubric, validated |
| "better than the old version" | model, pairwise | swap order to control position bias |
| new failure types, final say | human | sample; also labels for validating judges |

## Edge Cases Worth Knowing

- **Code graders can be wrong too.** A contains-check for "refund" passes "we do not offer refunds". Test your graders with a few known-bad outputs.
- **Brittle regexes.** A grader that demands an exact phrase punishes correct paraphrases; check the property, not the wording, where you can.
- **Judges that see the answer key.** Giving the judge a reference answer makes it stricter on facts but can make it penalise valid alternatives; decide per task.
- **Judge model upgrades.** A new judge version shifts scores; re-validate on the human set and do not compare scores across judge versions.
- **Cost blowups.** Several dimensions × many cases × every CI run; sample for CI and run the full set nightly.

## Common Pitfalls

- **Judging everything with a model.** Paying for a judge to check whether JSON parses or a number matches, and getting a less reliable answer than one line of code.
- **Exact match on prose.** Failing correct paraphrases and passing nothing useful; prose needs property checks or a judge.
- **Trusting judge accuracy.** High accuracy on a mostly-passing set while most real failures slip through.
- **No human labels.** A model grader nobody has compared with people, reported as if it were ground truth.
- **One omnibus 1-10 score.** Hard to validate, hard to act on, and prone to clustering at 7 or 8.
- **Mixing grader versions in a trend.** Comparing last month's scores from judge prompt v1 with this month's scores from v3.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Rule of thumb:</strong> <span style="color:#f0e2c8;">If a check has an objective answer, it is code: parse the JSON, compare the amount with a tolerance, match a required phrase, run the unit tests, resolve the citations. Code graders are free, fast, deterministic and easy to debug, so they come first.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Where a model grader earns its place:</strong> <span style="color:#f0e2c8;">Only for qualities code cannot decide: tone, faithfulness to the sources, whether free text actually answers the question. A model grader is an LLM with a rubric, so it costs a call per case, has biases and must be validated.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Decompose first:</strong> <span style="color:#f0e2c8;">Most vague qualities split into checkable parts. In my refund demo five code graders caught five of the seven bad replies, including one the judge missed because it read 5-7 days as close enough. The judge caught only what code could not see: a rude reply and an invented coupon.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Validate the judge:</strong> <span style="color:#f0e2c8;">Before I trust a judge I run it on human-labelled cases and read the confusion matrix. My v1 judge had 84% accuracy but caught only 60% of real failures; a binary per-criterion rubric with reasoning before the verdict caught 87%. I also use the measured error rates to correct the reported pass rate.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Layer and budget:</strong> <span style="color:#f0e2c8;">Code checks run first and fail fast, so no judge tokens are spent on broken output; judges run on what survives; humans calibrate both and review disagreements. Judges are a running cost, so I size it: 2,000 cases and two dimensions came to about 20 dollars a run under my assumed prices.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is exact match ever a good grader for an LLM?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, after normalisation, for outputs that have one right value: a label, an ID, a number, a yes or no. It is a bad grader for prose. For numbers use a tolerance, for strings normalise case, whitespace and punctuation first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you grade generated code?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Execute it: run unit tests in a sandbox, plus linters or type checks. Execution is the strongest code-based grader there is. A judge reading code for correctness is much weaker and only worth adding for style or readability.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if you have no human labels yet?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Label a small set yourself or with a domain expert first, 50 to 100 cases with both passes and failures. Without that you cannot know whether the judge catches failures; an unvalidated judge is an opinion with a number attached.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can one judge call score several dimensions at once?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It can, but one dimension per call with a binary verdict is easier to validate and debug, and avoids one strong impression bleeding into every score. If cost forces batching, still return a separate verdict and reason per criterion.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do vendor eval tools give you both kinds?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Generally yes. For example, OpenAI documents string-check and text-similarity graders alongside model-scored and Python graders in its Evals graders guide; in October 2026 a search of that guide also showed a deprecation notice, so check its current status before building on it.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Code-based grader | Deterministic function checking an output: parse, compare, match, execute |
| Model-based grader (LLM-as-judge) | An LLM with a rubric returning a verdict or score |
| Decomposition | Splitting a vague quality into specific, mostly code-checkable criteria |
| Grader validation | Measuring a grader against human labels before trusting it |
| Confusion matrix | Grader verdict versus human verdict, 2×2 |
| True negative rate (failure recall) | Share of real failures the grader flags |
| Prevalence correction (Rogan-Gladen) | Correcting an observed pass rate with the grader's measured error rates |

**Conclusion:** Use a code-based grader whenever the property has an objective answer: formats, single right values, numbers within tolerance, required or forbidden phrases, citations that must resolve and code that must pass tests. They are free, deterministic and explain their own failures, and in the demo they caught five of seven bad replies, including one the judge missed. Use a model-based grader only for what code cannot see, such as tone and faithfulness, with a concrete rubric, and only after validating it against human labels: a judge with 84% accuracy still let 40% of real failures through. Layer the two so code fails fast, judges handle meaning, and humans calibrate both.`,
    examples: [
      {
        label: `Five code graders and a stub judge on ten refund replies`,
        variants: [
          { tech: "node", code: `// A grader stack for one task: reply to a refund request with JSON + a short message.
// Code graders check what is mechanical; a stubbed judge (canned verdicts standing in
// for model calls) checks tone and faithfulness. Human labels are the ground truth.
const POLICY = { P2: "Refunds within 30 days, paid in 5-7 business days.", P3: "Damaged items are replaced free." };
const GOOD = '{"order_id":1042,"amount":59.99,"currency":"USD","eligible":true}';
const outputs = [
  { id: 1, json: GOOD, reply: "Your refund of 59.99 USD is approved and takes 5-7 business days [P2].", human: "pass" },
  { id: 2, json: '{"order_id":1042,"amount":59.99,}', reply: "Refund approved, 5-7 business days [P2].", human: "fail" },
  { id: 3, json: GOOD.replace("59.99", "5.99"), reply: "Refund of 5.99 USD, 5-7 business days [P2].", human: "fail" },
  { id: 4, json: GOOD.replace("USD", "usd"), reply: "Refund of 59.99 USD approved, 5-7 business days [P2].", human: "pass" },
  { id: 5, json: GOOD, reply: "Guaranteed: your 59.99 USD will be back tomorrow, 5-7 business days at most [P2].", human: "fail" },
  { id: 6, json: GOOD, reply: "Refund of 59.99 USD in 5-7 business days [P9].", human: "fail" },
  { id: 7, json: GOOD, reply: "Read the policy next time. Refund of 59.99 USD in 5-7 business days [P2].", human: "fail" },
  { id: 8, json: GOOD, reply: "Refund of 59.99 USD in 5-7 business days [P2]. You also get a 20% coupon [P2].", human: "fail" },
  { id: 9, json: GOOD, reply: "Sorry for the trouble! Your refund of 59.99 USD is approved and arrives in 5-7 business days [P2].", human: "pass" },
  { id: 10, json: GOOD, reply: "Refund of 59.99 USD approved, it takes 5-7 days [P2].", human: "fail" },
];
// canned judge verdicts: what a rubric-following model judge returned for each case
const judge = {
  tone: { 7: "fail" },
  faithful: { 8: "fail" }, // note: judge was lenient on case 10 ("5-7 days" read as fine)
};

const code = {
  json_schema: (o) => {
    try { const j = JSON.parse(o.json); return ["order_id", "amount", "currency", "eligible"].every((k) => k in j); }
    catch { return false; }
  },
  fields: (o) => {
    try {
      const j = JSON.parse(o.json);
      return j.order_id === 1042 && Math.abs(j.amount - 59.99) < 0.005 && String(j.currency).toUpperCase() === "USD" && j.eligible === true;
    } catch { return false; }
  },
  window: (o) => o.reply.includes("5-7 business days"),
  no_promise: (o) => !/\\b(tomorrow|today|guarantee[d]?)\\b/i.test(o.reply),
  citations: (o) => { const c = o.reply.match(/\\[P\\d+\\]/g) || []; return c.length > 0 && c.every((x) => x.slice(1, -1) in POLICY); },
};
const model = {
  judge_tone: (o) => judge.tone[o.id] !== "fail",
  judge_faith: (o) => judge.faithful[o.id] !== "fail",
};
const names = Object.keys(code).concat(Object.keys(model));
const all = { ...code, ...model };

console.log("case  " + names.map((n) => n.padEnd(13)).join("") + "human");
let codeOk = 0, bothOk = 0;
const byCode = [], byJudge = [];
for (const o of outputs) {
  const r = names.map((n) => (all[n](o) ? "ok" : "X"));
  const codeV = Object.keys(code).every((n) => code[n](o)) ? "pass" : "fail";
  const bothV = names.every((n) => all[n](o)) ? "pass" : "fail";
  if (codeV === "fail") byCode.push(o.id);
  if (!Object.keys(model).every((n) => model[n](o))) byJudge.push(o.id);
  if (codeV === o.human) codeOk++;
  if (bothV === o.human) bothOk++;
  console.log(String(o.id).padEnd(6) + r.map((x) => x.padEnd(13)).join("") + o.human);
}
console.log("");
console.log(\`failures caught by a code grader: \${byCode.join(", ")}\`);
console.log(\`failures caught only by the judge: \${byJudge.join(", ")}\`);
console.log(\`code graders alone agree with humans on \${codeOk}/\${outputs.length}\`);
console.log(\`code + judge agree with humans on \${bothOk}/\${outputs.length}\`);
console.log("");
// cost per full run, all numbers are assumptions for the arithmetic
const cases = 2000, dims = Object.keys(model).length, inTok = 900, outTok = 150, inPrice = 3, outPrice = 15;
const calls = cases * dims;
const usd = (calls * inTok * inPrice + calls * outTok * outPrice) / 1e6;
console.log(\`assumed: \${cases} cases, \${dims} judge dimensions, \${inTok} in + \${outTok} out tokens per call, $\${inPrice}/$\${outPrice} per M tokens\`);
console.log(\`code graders: 0 model calls, $0.00 per run\`);
console.log(\`judge graders: \${calls} model calls, $\${usd.toFixed(2)} per run, $\${(usd * 30).toFixed(2)} per month at one run a day\`);` },
          { tech: "python", code: `# A grader stack for one task: reply to a refund request with JSON + a short message.
# Code graders check what is mechanical; a stubbed judge (canned verdicts standing in
# for model calls) checks tone and faithfulness. Human labels are the ground truth.
import json
import re

POLICY = {"P2": "Refunds within 30 days, paid in 5-7 business days.", "P3": "Damaged items are replaced free."}
GOOD = '{"order_id":1042,"amount":59.99,"currency":"USD","eligible":true}'
outputs = [
    {"id": 1, "json": GOOD, "reply": "Your refund of 59.99 USD is approved and takes 5-7 business days [P2].", "human": "pass"},
    {"id": 2, "json": '{"order_id":1042,"amount":59.99,}', "reply": "Refund approved, 5-7 business days [P2].", "human": "fail"},
    {"id": 3, "json": GOOD.replace("59.99", "5.99"), "reply": "Refund of 5.99 USD, 5-7 business days [P2].", "human": "fail"},
    {"id": 4, "json": GOOD.replace("USD", "usd"), "reply": "Refund of 59.99 USD approved, 5-7 business days [P2].", "human": "pass"},
    {"id": 5, "json": GOOD, "reply": "Guaranteed: your 59.99 USD will be back tomorrow, 5-7 business days at most [P2].", "human": "fail"},
    {"id": 6, "json": GOOD, "reply": "Refund of 59.99 USD in 5-7 business days [P9].", "human": "fail"},
    {"id": 7, "json": GOOD, "reply": "Read the policy next time. Refund of 59.99 USD in 5-7 business days [P2].", "human": "fail"},
    {"id": 8, "json": GOOD, "reply": "Refund of 59.99 USD in 5-7 business days [P2]. You also get a 20% coupon [P2].", "human": "fail"},
    {"id": 9, "json": GOOD, "reply": "Sorry for the trouble! Your refund of 59.99 USD is approved and arrives in 5-7 business days [P2].", "human": "pass"},
    {"id": 10, "json": GOOD, "reply": "Refund of 59.99 USD approved, it takes 5-7 days [P2].", "human": "fail"},
]
# canned judge verdicts: what a rubric-following model judge returned for each case
judge = {
    "tone": {7: "fail"},
    "faithful": {8: "fail"},  # note: judge was lenient on case 10 ("5-7 days" read as fine)
}


def parse(o):
    try:
        return json.loads(o["json"])
    except ValueError:
        return None


def json_schema(o):
    j = parse(o)
    return j is not None and all(k in j for k in ["order_id", "amount", "currency", "eligible"])


def fields(o):
    j = parse(o)
    if j is None:
        return False
    return (j.get("order_id") == 1042 and isinstance(j.get("amount"), (int, float)) and abs(j["amount"] - 59.99) < 0.005
            and str(j.get("currency")).upper() == "USD" and j.get("eligible") is True)


def window(o):
    return "5-7 business days" in o["reply"]


def no_promise(o):
    return not re.search(r"\\b(tomorrow|today|guarantee[d]?)\\b", o["reply"], re.I)


def citations(o):
    c = re.findall(r"\\[P\\d+\\]", o["reply"])
    return len(c) > 0 and all(x[1:-1] in POLICY for x in c)


code = {"json_schema": json_schema, "fields": fields, "window": window, "no_promise": no_promise, "citations": citations}
model = {
    "judge_tone": lambda o: judge["tone"].get(o["id"]) != "fail",
    "judge_faith": lambda o: judge["faithful"].get(o["id"]) != "fail",
}
allg = {**code, **model}
names = list(allg)

print("case  " + "".join(f"{n:<13}" for n in names) + "human")
code_ok = both_ok = 0
by_code, by_judge = [], []
for o in outputs:
    r = ["ok" if allg[n](o) else "X" for n in names]
    code_v = "pass" if all(f(o) for f in code.values()) else "fail"
    both_v = "pass" if all(allg[n](o) for n in names) else "fail"
    if code_v == "fail":
        by_code.append(o["id"])
    if not all(f(o) for f in model.values()):
        by_judge.append(o["id"])
    if code_v == o["human"]:
        code_ok += 1
    if both_v == o["human"]:
        both_ok += 1
    print(f"{o['id']:<6}" + "".join(f"{x:<13}" for x in r) + o["human"])
print("")
print(f"failures caught by a code grader: {', '.join(map(str, by_code))}")
print(f"failures caught only by the judge: {', '.join(map(str, by_judge))}")
print(f"code graders alone agree with humans on {code_ok}/{len(outputs)}")
print(f"code + judge agree with humans on {both_ok}/{len(outputs)}")
print("")
# cost per full run, all numbers are assumptions for the arithmetic
cases, dims, in_tok, out_tok, in_price, out_price = 2000, len(model), 900, 150, 3, 15
calls = cases * dims
usd = (calls * in_tok * in_price + calls * out_tok * out_price) / 1e6
print(f"assumed: {cases} cases, {dims} judge dimensions, {in_tok} in + {out_tok} out tokens per call, \${in_price}/\${out_price} per M tokens")
print("code graders: 0 model calls, $0.00 per run")
print(f"judge graders: {calls} model calls, \${usd:.2f} per run, \${usd * 30:.2f} per month at one run a day")` },
        ],
      },
      {
        label: `Validating a model grader against human labels, and correcting its pass rate`,
        variants: [
          { tech: "node", code: `// Before trusting a model-based grader, measure it against human labels.
// 50 human-labelled outputs; the judge verdicts are canned (standing in for model calls).
function build(humanPass, judgePassGivenPass, humanFail, judgeFailGivenFail) {
  const rows = [];
  for (let i = 0; i < humanPass; i++) rows.push({ human: "pass", judge: i < judgePassGivenPass ? "pass" : "fail" });
  for (let i = 0; i < humanFail; i++) rows.push({ human: "fail", judge: i < judgeFailGivenFail ? "fail" : "pass" });
  return rows;
}
function stats(rows) {
  const c = { pp: 0, pf: 0, fp: 0, ff: 0 };
  for (const r of rows) c[r.human[0] + r.judge[0]]++;
  const n = rows.length;
  const tpr = c.pp / (c.pp + c.pf); // judge says pass when humans say pass
  const tnr = c.ff / (c.ff + c.fp); // judge says fail when humans say fail
  const po = (c.pp + c.ff) / n;
  const hP = (c.pp + c.pf) / n, jP = (c.pp + c.fp) / n;
  const pe = hP * jP + (1 - hP) * (1 - jP);
  return { c, n, tpr, tnr, acc: po, kappa: (po - pe) / (1 - pe), humanRate: hP, judgeRate: jP };
}
const pct = (x) => (100 * x).toFixed(1) + "%";
function show(name, s) {
  console.log(name);
  console.log("                 judge pass  judge fail");
  console.log(\`  human pass     \${String(s.c.pp).padStart(10)}  \${String(s.c.pf).padStart(10)}\`);
  console.log(\`  human fail     \${String(s.c.fp).padStart(10)}  \${String(s.c.ff).padStart(10)}\`);
  console.log(\`  accuracy \${pct(s.acc)}  kappa \${s.kappa.toFixed(2)}  catches \${pct(s.tnr)} of real failures  keeps \${pct(s.tpr)} of real passes\`);
  console.log(\`  pass rate: humans \${pct(s.humanRate)}, judge \${pct(s.judgeRate)}\`);
}
const v1 = stats(build(35, 33, 15, 9));
show("judge v1: one 1-10 helpfulness score, pass if >= 7", v1);
console.log("");
const v2 = stats(build(35, 32, 15, 13));
show("judge v2: binary verdict per rubric criterion, reasoning before verdict", v2);
console.log("");
// the same 1000 production outputs graded by each judge; correct each with its measured error rates (Rogan-Gladen)
console.log("same 1000 production outputs, raw judge pass rate -> corrected estimate");
for (const [name, s, passed] of [["v1", v1, 850], ["v2", v2, 760]]) {
  const observed = passed / 1000;
  const corrected = (observed + s.tnr - 1) / (s.tpr + s.tnr - 1);
  console.log(\`  judge \${name}: \${pct(observed)} -> \${pct(Math.min(1, Math.max(0, corrected)))}\`);
}` },
          { tech: "python", code: `# Before trusting a model-based grader, measure it against human labels.
# 50 human-labelled outputs; the judge verdicts are canned (standing in for model calls).


def build(human_pass, judge_pass_given_pass, human_fail, judge_fail_given_fail):
    rows = []
    for i in range(human_pass):
        rows.append({"human": "pass", "judge": "pass" if i < judge_pass_given_pass else "fail"})
    for i in range(human_fail):
        rows.append({"human": "fail", "judge": "fail" if i < judge_fail_given_fail else "pass"})
    return rows


def stats(rows):
    c = {"pp": 0, "pf": 0, "fp": 0, "ff": 0}
    for r in rows:
        c[r["human"][0] + r["judge"][0]] += 1
    n = len(rows)
    tpr = c["pp"] / (c["pp"] + c["pf"])  # judge says pass when humans say pass
    tnr = c["ff"] / (c["ff"] + c["fp"])  # judge says fail when humans say fail
    po = (c["pp"] + c["ff"]) / n
    h_p = (c["pp"] + c["pf"]) / n
    j_p = (c["pp"] + c["fp"]) / n
    pe = h_p * j_p + (1 - h_p) * (1 - j_p)
    return {"c": c, "n": n, "tpr": tpr, "tnr": tnr, "acc": po, "kappa": (po - pe) / (1 - pe), "human_rate": h_p, "judge_rate": j_p}


def pct(x):
    return f"{100 * x:.1f}%"


def show(name, s):
    c = s["c"]
    print(name)
    print("                 judge pass  judge fail")
    print(f"  human pass     {c['pp']:>10}  {c['pf']:>10}")
    print(f"  human fail     {c['fp']:>10}  {c['ff']:>10}")
    print(f"  accuracy {pct(s['acc'])}  kappa {s['kappa']:.2f}  catches {pct(s['tnr'])} of real failures  keeps {pct(s['tpr'])} of real passes")
    print(f"  pass rate: humans {pct(s['human_rate'])}, judge {pct(s['judge_rate'])}")


v1 = stats(build(35, 33, 15, 9))
show("judge v1: one 1-10 helpfulness score, pass if >= 7", v1)
print("")
v2 = stats(build(35, 32, 15, 13))
show("judge v2: binary verdict per rubric criterion, reasoning before verdict", v2)
print("")
# the same 1000 production outputs graded by each judge; correct each with its measured error rates (Rogan-Gladen)
print("same 1000 production outputs, raw judge pass rate -> corrected estimate")
for name, s, passed in [("v1", v1, 850), ("v2", v2, 760)]:
    observed = passed / 1000
    corrected = (observed + s["tnr"] - 1) / (s["tpr"] + s["tnr"] - 1)
    print(f"  judge {name}: {pct(observed)} -> {pct(min(1, max(0, corrected)))}")` },
        ],
      },
    ],
  },
  {
    title: `What is LLM-as-judge and what are its known biases?`,
    difficulty: "medium",
    seoDescription: `LLM-as-judge: rubric and pairwise grading, position, verbosity and self-preference bias, and the swaps, length control and validation that fix them.`,
    description: `**Question presented to candidate:**
"We want to use a strong model to grade our assistant's answers instead of paying people to read them. What exactly is LLM-as-judge, which biases does it have that could fool us, and what would you do so that we can trust its scores?"

**What a strong answer should cover:**
- The setups: single-answer grading against a rubric (optionally with a reference or the source documents) and pairwise comparison of two answers; binary or few-level anchored verdicts beat a free 1-10 score
- The documented biases with names: position bias (verdict flips when the order is swapped), verbosity bias (longer answers preferred), self-preference or self-enhancement (a model favours its own outputs), plus weak reasoning on maths or facts it cannot check and sensitivity to the judge prompt
- Mitigations matched to each bias: judge both orders and keep only consistent verdicts or average them, length control or a rubric that does not reward length, a judge from a different model family, reasoning before the verdict, references or sources for factual checks, one criterion per call
- Validation against human labels before use, and again whenever the judge model or prompt changes; agreement reported as kappa or a confusion matrix, not just accuracy
- Published evidence: strong judges have reached human-level agreement on chat preference data (Zheng et al., MT-Bench and Chatbot Arena, over 80%), which is why the method is used, and the same work catalogued the biases

**Clarifying questions expected:**
- Are we grading single answers against a rubric, or comparing two versions of the system?
- Which model family generates the answers, and could the judge be the same model?
- Do we have human-labelled cases to calibrate the judge on?

**Code / implementation expected:** Optional — a swap-order check for position bias, or a length-controlled comparison, on a stub judge.`,
    answer: `**Target Audience:** Engineers about to let a model grade their model, and candidates who need to name the biases and the fixes precisely.
**Difficulty:** Medium
**Verified with:** Node 22 and Python 3.12 (a pairwise judge with a simulated position bias, and a scoring judge with a simulated verbosity bias). The judges are deterministic stubs with a bias built in on purpose, so the mechanism and the fix are visible; the size of the bias is an assumption, not a measurement of any model. Published findings are cited by paper, checked October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the examples; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A baking contest has one judge and two hundred cakes. Hiring two hundred judges is impossible, so the organisers hire one experienced judge and let her taste everything. She is good. But by the end of the day the contestants notice patterns: she tends to prefer whichever of two cakes she tastes first, the biggest cakes win more often than they should, and cakes made with her own signature recipe do suspiciously well.

None of that makes her useless. It means the organisers should serve cakes in both orders, compare slices of similar size, keep her away from her own recipe, and every so often have a panel of other judges taste the same cakes to check that she still agrees with them.

**LLM-as-judge** is that judge. It lets you grade thousands of open-ended answers on qualities no code can check. It also has measurable habits. The skill is knowing them by name, designing the judging setup around them, and checking the judge against people before trusting its numbers.

## 2. What LLM-as-Judge Is

📌 **Interview term: LLM-as-judge** — using a language model, prompted with grading instructions, to evaluate outputs of an LLM system. It is a kind of model-based grader; when to use one instead of code is covered in [When do you use code-based graders versus model-based graders?](/interview-question/when-do-you-use-code-based-graders-versus-model-based-graders)

There are three common setups:

| Setup | The judge sees | Returns | Good for |
| :--- | :--- | :--- | :--- |
| Single-answer, rubric | input, output, rubric (maybe sources) | pass/fail per criterion, or a score | CI gates, monitoring, absolute pass rates |
| Reference-guided | input, output, a reference answer | match / no match on key facts | factual tasks with an expert answer |
| Pairwise | input, answer A, answer B | A, B or tie | comparing two prompts or models |

📌 **Interview term: rubric** — the judge instructions that define what to check, ideally as concrete binary criteria ("states the 5-7 business day window", "does not promise anything the policy does not allow") rather than "rate helpfulness 1-10".

<svg class="iq-diagram" width="100%" viewBox="0 0 760 220" role="img" aria-label="Pairwise judging with order swap: answers A and B go to the judge in both orders; if both verdicts agree the result is kept, otherwise it is recorded as a tie">
  <rect class="d-box" x="20" y="30" width="140" height="60" rx="8"/>
  <text class="d-text" x="90" y="65" text-anchor="middle">A then B</text>
  <rect class="d-box" x="20" y="130" width="140" height="60" rx="8"/>
  <text class="d-text" x="90" y="165" text-anchor="middle">B then A</text>
  <path class="d-edge" d="M 160 60 L 250 100"/>
  <path class="d-edge" d="M 160 160 L 250 120"/>
  <rect class="d-box-accent" x="250" y="75" width="150" height="70" rx="8"/>
  <text class="d-text" x="325" y="105" text-anchor="middle">judge</text>
  <text class="d-sub" x="325" y="127" text-anchor="middle">rubric, reason first</text>
  <path class="d-edge" d="M 400 110 L 460 110"/>
  <polygon class="d-arrow" points="460,104 470,110 460,116"/>
  <rect class="d-box" x="470" y="75" width="120" height="70" rx="8"/>
  <text class="d-text" x="530" y="105" text-anchor="middle">same winner</text>
  <text class="d-sub" x="530" y="127" text-anchor="middle">both orders?</text>
  <path class="d-edge" d="M 590 95 L 640 60"/>
  <path class="d-edge-dashed" d="M 590 125 L 640 160"/>
  <rect class="d-box-accent" x="640" y="35" width="100" height="50" rx="8"/>
  <text class="d-text" x="690" y="65" text-anchor="middle">keep</text>
  <rect class="d-box-muted" x="640" y="135" width="100" height="50" rx="8"/>
  <text class="d-text" x="690" y="165" text-anchor="middle">tie</text>
</svg>

The swap costs a second judge call per pair, and it is the single cheapest way to stop the order of presentation from deciding a comparison.

## 3. Why It Is Used at All

The evidence that made the method mainstream is Zheng et al., *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena* (NeurIPS 2023, arXiv 2306.05685). Their abstract reports that strong judges such as GPT-4 match controlled and crowdsourced human preferences with over 80% agreement, the same level of agreement as between humans. The same paper named the main biases (position, verbosity and self-enhancement) and limited reasoning ability, and proposed mitigations. Both halves matter: the method works well enough to use, and it fails in predictable ways.

## 4. The Known Biases

### Position bias

📌 **Interview term: position bias** — in pairwise judging, the verdict depends on which answer is shown first (or second), not only on the answers. Wang et al., *Large Language Models are not Fair Evaluators* (arXiv 2305.17926), showed that swapping the order of two responses can flip the evaluator's verdict, with conflicts most frequent when the two answers are close in quality.

The first example, **"Position bias: one judge, two orders, and the swap-and-agree fix"**, gives a stub judge a hidden 1.5-point bonus for the first slot and asks it to compare models X and Y on 12 prompts, in both orders:

~~~text
position consistency: 5/12 verdicts survive swapping the order
X win rate, truth:            37.5%
X win rate, X always first:   75.0%
X win rate, Y always first:   16.7%
X win rate, swap-and-agree:   45.8%
~~~

The same judge reported X winning 75% or 16.7% depending only on which model the harness put first. Every flip happened where the two answers were close (equal, or one point apart), which matches what Wang et al. describe. Swapping and treating inconsistent pairs as ties gave 45.8%, much closer to the truth of 37.5%.

📌 **Interview term: position consistency** — the share of pairs whose verdict is the same in both orders. It is a cheap health metric for a pairwise judge: low consistency means the judge cannot tell those answers apart.

Wang et al. proposed **balanced position calibration** (score both orders and average) and **multiple evidence calibration** (make the judge write its evidence before the score), plus routing hard cases to humans.

### Verbosity bias

📌 **Interview term: verbosity (length) bias** — the judge prefers longer answers independent of quality. Longer answers look more thorough, and padding is easy to produce, so an optimisation loop against a biased judge drifts towards wordiness.

The second example, **"Verbosity bias: judge versus human, and a length-controlled re-scoring"**, compares a concise model C with a verbose model V on 16 prompts. The stub judge adds 0.01 points per word; humans judge quality only:

~~~text
V win rate, human preference:   37.5%
V win rate, raw judge:          75.0%   (matches human on 8/16)
fitted length effect: 1.00 judge points per extra hundred words
V win rate, length-controlled:  37.5%   (matches human on 16/16)
~~~

📌 **Interview term: length control** — estimating how much of the judge's preference is explained by the length difference and reporting the result with that part removed. Dubois et al., *Length-Controlled AlpacaEval* (COLM 2024, arXiv 2404.04475), fit a regression of the judge preference that includes the length difference and report the win rate with the length term set to zero; they report that this raised the benchmark Spearman correlation with Chatbot Arena from 0.94 to 0.98.

The simulation recovers the human verdict exactly only because it is idealised: the bias is exactly linear and quality was chosen to be uncorrelated with length. Real data is noisier, and length is sometimes genuinely correlated with quality (a complete answer *is* longer), so length control reduces the bias rather than proving it gone. The program also shows the cheaper rubric-side fix:

~~~text
padding probe: same content, 80 -> 200 words, judge score 7.8 -> 9.0
~~~

A **padding probe** (add filler that carries no information and re-score) is a quick test you can run on any real judge. If the score goes up, the judge rewards length.

### Self-preference

📌 **Interview term: self-preference (self-enhancement) bias** — a judge rates outputs from its own model higher than humans would. Panickssery, Bowman and Feng, *LLM Evaluators Recognize and Favor Their Own Generations* (NeurIPS 2024, arXiv 2404.13076), found that models such as GPT-4 and Llama 2 can tell their own outputs apart from others with non-trivial accuracy, and that self-recognition correlated linearly with the strength of self-preference after fine-tuning. A later paper (arXiv 2504.03846) argues that part of measured self-preference reflects genuine quality differences, so the size of the effect is debated; the safe practice is not.

Mitigation: use a judge from a different model family than the system under test, or several judges, and measure on a human-labelled set whether the judge favours its own family.

### Other failure modes

- **Weak checking of facts and maths.** A judge that cannot solve the problem cannot grade the answer; Zheng et al. list limited reasoning ability among the limitations. Give the judge the reference answer or the source documents, or check the fact with code.
- **Leniency and score compression.** Scores cluster high on a 1-10 scale, so real differences are squeezed into 7 versus 8. Binary criteria avoid it.
- **Style over substance.** Confident tone, headings and bullet points can read as quality. The rubric should say what counts, and a padding-style probe with reformatted but identical content tests it.
- **Prompt and version sensitivity.** Rewording the judge prompt or upgrading the judge model shifts scores. Pin the judge version and keep its prompt under version control.

## 5. Bias and Mitigation, Side by Side

| Bias | How to detect it | Mitigation |
| :--- | :--- | :--- |
| Position | judge each pair in both orders; measure consistency | swap and keep consistent verdicts, or average both orders |
| Verbosity | padding probe; correlation of score with length | rubric that does not reward length; length-controlled reporting |
| Self-preference | compare judge and human ratings of own-family outputs | judge from another family; several judges |
| Weak reasoning | judge errors on cases with known answers | give references or sources; code checks for facts |
| Leniency / compression | score histogram piled at the top | binary criteria; anchored levels with examples |
| Prompt / version drift | scores move on an unchanged system | pin judge version; re-validate on change |

## 6. Making the Judge Trustworthy

1. **Write binary, concrete criteria**, one per call where possible.
2. **Ask for reasoning before the verdict**, and parse the verdict from a structured field.
3. **Give it what it needs to check facts**: the sources for faithfulness, the reference for correctness.
4. **Control order and length** as above.
5. **Validate against human labels** on 50-100 cases that include real failures, and read the confusion matrix and kappa, not only accuracy. The arithmetic (and how to correct a judge's pass rate with its measured error rates) is in [When do you use code-based graders versus model-based graders?](/interview-question/when-do-you-use-code-based-graders-versus-model-based-graders); the labelling side is in [How do you build a golden dataset for evaluating an LLM feature?](/interview-question/how-do-you-build-a-golden-dataset-for-evaluating-an-llm-feature)
6. **Re-validate** whenever the judge model, its prompt or the product domain changes.

Frameworks such as DeepEval package judge metrics (G-Eval-style rubric scoring and others) and combine them with human review; that tooling is covered in [Beyond Ragas: how do you eval LLMs with LLM-as-judge, DeepEval, and human eval?](/interview-question/beyond-ragas-how-do-you-eval-llms-with-llm-as-judge-deepeval-and-human-eval)

## 7. A Judge Prompt Shape (not run here)

~~~text
You are grading a customer-support reply. Use only the policy text provided.

<policy>{policy}</policy>
<question>{question}</question>
<reply>{reply}</reply>

For each criterion, first write one sentence of evidence quoting the reply, then a verdict.
1. states_refund_window: the reply states refunds take 5-7 business days.
2. no_unsupported_promise: the reply promises nothing the policy does not state.
3. polite: the reply contains no blame or sarcasm towards the customer.
Length is not a criterion; do not reward longer replies.

Return JSON: {"criteria": [{"name": "...", "evidence": "...", "verdict": "pass" | "fail"}]}
~~~

This is a template, not a tested prompt: the placeholders in braces are filled by your harness, and its agreement with humans has to be measured like any other judge.

## 8. Verified: Running the Code

Both programs use deterministic stub judges with a bias built in on purpose (a 1.5-point first-slot bonus; 0.01 points per word) and invented quality scores standing in for human labels. They show the mechanisms and the fixes; they do not measure how biased any real model is.

**"Position bias: one judge, two orders, and the swap-and-agree fix"** — \`node a.js\` and \`python3.12 a.py\` both print exactly:

~~~text
pair  quality X/Y  truth  X shown first  Y shown first  swap-and-agree
   1      7/8      Y      X              Y              tie  <- flipped by order
   2      6/6      tie    X              Y              tie  <- flipped by order
   3      9/5      X      X              X              X
   4      5/7      Y      Y              Y              Y
   5      8/8      tie    X              Y              tie  <- flipped by order
   6      4/6      Y      Y              Y              Y
   7      7/6      X      X              Y              tie  <- flipped by order
   8      6/8      Y      Y              Y              Y
   9      8/9      Y      X              Y              tie  <- flipped by order
  10      5/5      tie    X              Y              tie  <- flipped by order
  11      9/7      X      X              X              X
  12      6/7      Y      X              Y              tie  <- flipped by order

position consistency: 5/12 verdicts survive swapping the order
X win rate, truth:            37.5%
X win rate, X always first:   75.0%
X win rate, Y always first:   16.7%
X win rate, swap-and-agree:   45.8%
verdicts matching truth: X first 6/12, Y first 8/12, swap-and-agree 8/12
~~~

**"Verbosity bias: judge versus human, and a length-controlled re-scoring"** — \`node b.js\` and \`python3.12 b.py\` both print exactly:

~~~text
V average length 190 words, C average 80 words
V win rate, human preference:   37.5%
V win rate, raw judge:          75.0%   (matches human on 8/16)
fitted length effect: 1.00 judge points per extra hundred words
V win rate, length-controlled:  37.5%   (matches human on 16/16)

padding probe: same content, 80 -> 200 words, judge score 7.8 -> 9.0
judge with "do not reward length" rubric (0.002 per word): V win rate 50.0%   (matches human on 12/16)
~~~

What the runs show:

- With a first-slot bias, the reported win rate of the same model ranged from 16.7% to 75.0% depending only on the order the harness used; 7 of 12 verdicts flipped, all on close pairs.
- Swap-and-agree moved the estimate from either extreme to 45.8%, against a true 37.5%; it removes order effects but cannot add discrimination the judge does not have.
- A per-word bonus doubled the verbose model's win rate (37.5% to 75.0%); removing the fitted length effect restored the human verdicts in this idealised setup, and a stricter rubric got 12 of 16 right.

## Edge Cases Worth Knowing

- **Ties.** Allowing a tie in pairwise judging reduces forced position-driven choices; count ties explicitly rather than splitting them silently.
- **Multi-turn and agent outputs.** Judging a whole trajectory is harder than one answer; judge per step or per criterion. See [How do you evaluate and debug agent trajectories?](/interview-question/how-do-you-evaluate-and-debug-agent-trajectories)
- **Safety grading.** For refusals or harmful content, a judge can be gamed by the same tricks it is meant to detect; combine with classifiers and red-team sets ([What is red-teaming an LLM application and how is it done?](/interview-question/what-is-red-teaming-an-llm-application-and-how-is-it-done)).
- **Judges optimised against.** If a judge score is the target of prompt tuning or training, its biases get amplified. Hold out a human-reviewed sample.

## Common Pitfalls

- **One order only.** Pairwise comparisons always shown A then B, so the reported winner partly reflects the slot.
- **A 1-10 "overall quality" score.** No anchors, clustered at the top, impossible to validate or act on.
- **Same model judges itself.** Self-preference inflates scores for the system under test.
- **No references for factual checks.** Asking a judge whether an answer is correct when it does not know the answer either.
- **Never validated, never re-validated.** Trusting a judge because it is a strong model, then upgrading it and comparing new scores with old ones.
- **Rewarding length by accident.** Optimising the prompt against a judge until every answer is three times longer.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">LLM-as-judge means using a strong model with a rubric to grade outputs where code cannot: tone, helpfulness, faithfulness. It runs either as single-answer grading against criteria or as a pairwise comparison of two answers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why people use it:</strong> <span style="color:#f0e2c8;">It scales human-like judgement to thousands of cases per run. Zheng et al. reported that strong judges such as GPT-4 reached over 80% agreement with human preferences on MT-Bench and Chatbot Arena data, about the level humans reach with each other.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The biases:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Position bias</strong>: the verdict depends on which answer is shown first. <strong style="color:#ffca28;">Verbosity bias</strong>: longer answers win. <strong style="color:#ffca28;">Self-preference</strong>: a judge favours text from its own model, which Panickssery et al. tied to the model recognising its own outputs. Plus weak checking of maths and facts, and scores that move with the prompt wording.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What I do about them:</strong> <span style="color:#f0e2c8;">Judge both orders and keep only consistent verdicts; in my simulation only 5 of 12 verdicts survived the swap. Control for length; my demo judge picked the verbose model 75% of the time against 37.5% for humans, and removing the fitted length effect restored the human verdicts. Use a judge from another family, binary criteria, reasoning before the verdict, and give it the sources for factual checks.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Trust comes from validation:</strong> <span style="color:#f0e2c8;">Before the scores drive decisions I compare the judge with human labels on 50 to 100 cases, read the confusion matrix and kappa, pin the judge model version, and re-validate whenever the judge or its prompt changes.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Pairwise or single-answer grading?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pairwise is better for deciding whether version B beats version A, because relative judgements are easier and more stable, but it needs order swapping and grows with the number of versions. Single-answer grading against a rubric gives an absolute pass rate you can track over time. I use pairwise for model or prompt bake-offs and rubric grading for CI and monitoring.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the judge be the same model as the system under test?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It can work, but self-preference is a documented bias, so I prefer a different family, or at least measure the bias by checking whether the judge rates its own outputs higher than humans do on a labelled set.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why ask for reasoning before the verdict?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If the model gives the score first, the explanation can only rationalise it. Wang et al. made the evaluator write its evidence before the score as one of their calibration fixes. It also gives you a readable trail when you audit disagreements.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do binary verdicts beat a 1-10 scale?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A 1-10 score has no shared meaning for 6 versus 7, clusters in the high range, and drifts between judge versions. A pass or fail per concrete criterion is easier for the judge, easier to validate against humans and easier to act on.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does length-controlled AlpacaEval relate to this?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the published version of the length fix: Dubois et al. fit a model of the judge preference that includes the length difference and report the win rate with that term removed. They reported that this raised the benchmark Spearman correlation with Chatbot Arena from 0.94 to 0.98.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| LLM-as-judge | A model with grading instructions evaluating LLM outputs |
| Rubric | Concrete criteria the judge checks, ideally binary |
| Position bias | Verdict depends on the order the answers are shown |
| Position consistency | Share of pairs with the same verdict in both orders |
| Verbosity (length) bias | Longer answers preferred regardless of quality |
| Length control | Reporting judge preference with the length effect removed |
| Self-preference bias | A judge favours outputs from its own model |

**Conclusion:** LLM-as-judge uses a strong model with a rubric to grade what code cannot, and it is popular because strong judges have reached human-level agreement on preference data. It also has named, measurable biases: position bias (in the simulation the same judge reported 16.7% or 75% for one model depending only on order), verbosity bias (a per-word bonus doubled the verbose model's win rate), self-preference towards its own model, and weak checking of facts it cannot verify. Design around each one with order swaps, length control or length-neutral rubrics, a judge from another family, binary criteria with reasoning first and sources for facts, and then validate the judge against human labels and re-validate whenever it changes.`,
    examples: [
      {
        label: `Position bias: one judge, two orders, and the swap-and-agree fix`,
        variants: [
          { tech: "node", code: `// Position bias in pairwise judging, and the swap-and-agree fix.
// The stub judge prefers the better answer, but gives the FIRST slot a hidden
// bonus of 1.5 quality points (a simulated position bias).
const pairs = [
  // true quality (0-10) of model X answer and model Y answer for 12 prompts
  [7, 8], [6, 6], [9, 5], [5, 7], [8, 8], [4, 6], [7, 6], [6, 8], [8, 9], [5, 5], [9, 7], [6, 7],
];
const BIAS = 1.5;
function judge(first, second) {
  // returns "first" or "second"
  return first + BIAS >= second ? "first" : "second";
}
function verdict(qx, qy, xFirst) {
  const r = xFirst ? judge(qx, qy) : judge(qy, qx);
  return (r === "first") === xFirst ? "X" : "Y";
}
const truth = pairs.map(([x, y]) => (x > y ? "X" : y > x ? "Y" : "tie"));
const xFirst = pairs.map(([x, y]) => verdict(x, y, true));
const yFirst = pairs.map(([x, y]) => verdict(x, y, false));
const swapped = xFirst.map((v, i) => (v === yFirst[i] ? v : "tie"));

const winRate = (vs) => {
  let s = 0;
  for (const v of vs) s += v === "X" ? 1 : v === "tie" ? 0.5 : 0;
  return ((100 * s) / vs.length).toFixed(1) + "%";
};
console.log("pair  quality X/Y  truth  X shown first  Y shown first  swap-and-agree");
pairs.forEach(([x, y], i) => {
  const flip = xFirst[i] !== yFirst[i] ? "  <- flipped by order" : "";
  console.log(\`\${String(i + 1).padStart(4)}  \${String(x).padStart(5)}/\${y}      \${truth[i].padEnd(5)}  \${xFirst[i].padEnd(13)}  \${yFirst[i].padEnd(13)}  \${swapped[i]}\${flip}\`);
});
const flips = xFirst.filter((v, i) => v !== yFirst[i]).length;
console.log("");
console.log(\`position consistency: \${pairs.length - flips}/\${pairs.length} verdicts survive swapping the order\`);
console.log(\`X win rate, truth:            \${winRate(truth)}\`);
console.log(\`X win rate, X always first:   \${winRate(xFirst)}\`);
console.log(\`X win rate, Y always first:   \${winRate(yFirst)}\`);
console.log(\`X win rate, swap-and-agree:   \${winRate(swapped)}\`);
const agree = (vs) => vs.filter((v, i) => v === truth[i]).length;
console.log(\`verdicts matching truth: X first \${agree(xFirst)}/12, Y first \${agree(yFirst)}/12, swap-and-agree \${agree(swapped)}/12\`);` },
          { tech: "python", code: `# Position bias in pairwise judging, and the swap-and-agree fix.
# The stub judge prefers the better answer, but gives the FIRST slot a hidden
# bonus of 1.5 quality points (a simulated position bias).
pairs = [
    # true quality (0-10) of model X answer and model Y answer for 12 prompts
    (7, 8), (6, 6), (9, 5), (5, 7), (8, 8), (4, 6), (7, 6), (6, 8), (8, 9), (5, 5), (9, 7), (6, 7),
]
BIAS = 1.5


def judge(first, second):
    # returns "first" or "second"
    return "first" if first + BIAS >= second else "second"


def verdict(qx, qy, x_first):
    r = judge(qx, qy) if x_first else judge(qy, qx)
    return "X" if (r == "first") == x_first else "Y"


truth = ["X" if x > y else "Y" if y > x else "tie" for x, y in pairs]
x_first = [verdict(x, y, True) for x, y in pairs]
y_first = [verdict(x, y, False) for x, y in pairs]
swapped = [v if v == y_first[i] else "tie" for i, v in enumerate(x_first)]


def win_rate(vs):
    s = sum(1 if v == "X" else 0.5 if v == "tie" else 0 for v in vs)
    return f"{100 * s / len(vs):.1f}%"


print("pair  quality X/Y  truth  X shown first  Y shown first  swap-and-agree")
for i, (x, y) in enumerate(pairs):
    flip = "  <- flipped by order" if x_first[i] != y_first[i] else ""
    print(f"{i + 1:>4}  {x:>5}/{y}      {truth[i]:<5}  {x_first[i]:<13}  {y_first[i]:<13}  {swapped[i]}{flip}")
flips = sum(1 for i, v in enumerate(x_first) if v != y_first[i])
print("")
print(f"position consistency: {len(pairs) - flips}/{len(pairs)} verdicts survive swapping the order")
print(f"X win rate, truth:            {win_rate(truth)}")
print(f"X win rate, X always first:   {win_rate(x_first)}")
print(f"X win rate, Y always first:   {win_rate(y_first)}")
print(f"X win rate, swap-and-agree:   {win_rate(swapped)}")


def agree(vs):
    return sum(1 for i, v in enumerate(vs) if v == truth[i])


print(f"verdicts matching truth: X first {agree(x_first)}/12, Y first {agree(y_first)}/12, swap-and-agree {agree(swapped)}/12")` },
        ],
      },
      {
        label: `Verbosity bias: judge versus human, and a length-controlled re-scoring`,
        variants: [
          { tech: "node", code: `// Verbosity bias: a stub judge whose score is quality + 0.01 per word (a simulated bias),
// compared with human preference (quality only), then a length-controlled re-scoring.
// Each row: [quality of concise model C, words of C, quality of verbose model V, words of V]
const rows = [
  [7, 80, 6, 90], [6, 70, 6, 80], [7, 85, 8, 95], [8, 90, 7, 100],
  [7, 80, 6, 140], [6, 75, 6, 135], [7, 70, 8, 130], [9, 100, 8, 160],
  [8, 60, 7, 210], [7, 85, 7, 235], [6, 80, 7, 230], [8, 90, 7, 240],
  [7, 80, 6, 300], [6, 70, 6, 290], [7, 75, 8, 295], [8, 85, 7, 305],
];
const PER_WORD = 0.01;
const judgeScore = (q, w) => q + PER_WORD * w;
const outcome = (diff) => (diff > 1e-9 ? 1 : diff < -1e-9 ? 0 : 0.5); // 1 = V wins
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pct = (x) => (100 * x).toFixed(1) + "%";

const human = rows.map(([qc, , qv]) => outcome(qv - qc));
const judgeDiff = rows.map(([qc, wc, qv, wv]) => judgeScore(qv, wv) - judgeScore(qc, wc));
const judged = judgeDiff.map(outcome);
const agree = (xs) => xs.filter((x, i) => x === human[i]).length;

console.log(\`V average length \${mean(rows.map((r) => r[3])).toFixed(0)} words, C average \${mean(rows.map((r) => r[1])).toFixed(0)} words\`);
console.log(\`V win rate, human preference:   \${pct(mean(human))}\`);
console.log(\`V win rate, raw judge:          \${pct(mean(judged))}   (matches human on \${agree(judged)}/16)\`);

// length control: fit judge score difference against length difference (hundreds of words),
// then remove the length term and re-read each verdict
const dl = rows.map(([, wc, , wv]) => (wv - wc) / 100);
const mx = mean(dl), my = mean(judgeDiff);
let sxy = 0, sxx = 0;
for (let i = 0; i < dl.length; i++) { sxy += (dl[i] - mx) * (judgeDiff[i] - my); sxx += (dl[i] - mx) ** 2; }
const slope = sxy / sxx;
const controlled = judgeDiff.map((j, i) => outcome(j - slope * dl[i]));
console.log(\`fitted length effect: \${slope.toFixed(2)} judge points per extra hundred words\`);
console.log(\`V win rate, length-controlled:  \${pct(mean(controlled))}   (matches human on \${agree(controlled)}/16)\`);
console.log("");

// padding probe: same answer, plus 120 words of filler that add nothing
console.log(\`padding probe: same content, 80 -> 200 words, judge score \${judgeScore(7, 80).toFixed(1)} -> \${judgeScore(7, 200).toFixed(1)}\`);
// a rubric that names concision as a criterion is modelled as a smaller per-word bonus
const strict = (q, w) => q + 0.002 * w;
const strictWins = rows.map(([qc, wc, qv, wv]) => outcome(strict(qv, wv) - strict(qc, wc)));
console.log(\`judge with "do not reward length" rubric (0.002 per word): V win rate \${pct(mean(strictWins))}   (matches human on \${agree(strictWins)}/16)\`);` },
          { tech: "python", code: `# Verbosity bias: a stub judge whose score is quality + 0.01 per word (a simulated bias),
# compared with human preference (quality only), then a length-controlled re-scoring.
# Each row: [quality of concise model C, words of C, quality of verbose model V, words of V]
rows = [
    (7, 80, 6, 90), (6, 70, 6, 80), (7, 85, 8, 95), (8, 90, 7, 100),
    (7, 80, 6, 140), (6, 75, 6, 135), (7, 70, 8, 130), (9, 100, 8, 160),
    (8, 60, 7, 210), (7, 85, 7, 235), (6, 80, 7, 230), (8, 90, 7, 240),
    (7, 80, 6, 300), (6, 70, 6, 290), (7, 75, 8, 295), (8, 85, 7, 305),
]
PER_WORD = 0.01


def judge_score(q, w):
    return q + PER_WORD * w


def outcome(diff):  # 1 = V wins
    return 1 if diff > 1e-9 else 0 if diff < -1e-9 else 0.5


def mean(xs):
    return sum(xs) / len(xs)


def pct(x):
    return f"{100 * x:.1f}%"


human = [outcome(qv - qc) for qc, _, qv, _ in rows]
judge_diff = [judge_score(qv, wv) - judge_score(qc, wc) for qc, wc, qv, wv in rows]
judged = [outcome(d) for d in judge_diff]


def agree(xs):
    return sum(1 for i, x in enumerate(xs) if x == human[i])


print(f"V average length {mean([r[3] for r in rows]):.0f} words, C average {mean([r[1] for r in rows]):.0f} words")
print(f"V win rate, human preference:   {pct(mean(human))}")
print(f"V win rate, raw judge:          {pct(mean(judged))}   (matches human on {agree(judged)}/16)")

# length control: fit judge score difference against length difference (hundreds of words),
# then remove the length term and re-read each verdict
dl = [(wv - wc) / 100 for _, wc, _, wv in rows]
mx, my = mean(dl), mean(judge_diff)
sxy = sum((dl[i] - mx) * (judge_diff[i] - my) for i in range(len(dl)))
sxx = sum((dl[i] - mx) ** 2 for i in range(len(dl)))
slope = sxy / sxx
controlled = [outcome(j - slope * dl[i]) for i, j in enumerate(judge_diff)]
print(f"fitted length effect: {slope:.2f} judge points per extra hundred words")
print(f"V win rate, length-controlled:  {pct(mean(controlled))}   (matches human on {agree(controlled)}/16)")
print("")

# padding probe: same answer, plus 120 words of filler that add nothing
print(f"padding probe: same content, 80 -> 200 words, judge score {judge_score(7, 80):.1f} -> {judge_score(7, 200):.1f}")


# a rubric that names concision as a criterion is modelled as a smaller per-word bonus
def strict(q, w):
    return q + 0.002 * w


strict_wins = [outcome(strict(qv, wv) - strict(qc, wc)) for qc, wc, qv, wv in rows]
print(f'judge with "do not reward length" rubric (0.002 per word): V win rate {pct(mean(strict_wins))}   (matches human on {agree(strict_wins)}/16)')` },
        ],
      },
    ],
  },
  {
    title: `Why are BLEU and ROUGE poor metrics for LLM outputs, and what replaced them?`,
    difficulty: "hard",
    seoDescription: `BLEU and ROUGE reward word overlap, so paraphrases score low and wrong answers high. What replaced them: code checks, BERTScore and COMET, LLM judges.`,
    description: `**Question presented to candidate:**
"Someone on the team proposes tracking ROUGE and BLEU against reference answers as the quality metric for our LLM assistant. Explain what those metrics actually measure, why they are a poor fit for LLM outputs, and what you would use instead."

**What a strong answer should cover:**
- What they compute: BLEU is clipped n-gram precision against one or more references with a brevity penalty (Papineni et al., 2002, built for machine translation); ROUGE is n-gram or longest-common-subsequence recall or F1 (Lin, 2004, built for summarisation)
- The two-sided failure: a correct paraphrase shares few n-grams and scores low, while a wrong answer that changes one word (months for days, an inserted "not", a wrong number) keeps most n-grams and scores high; they are blind to factuality, negation, instruction-following and safety
- Reference dependence: open-ended tasks have many valid outputs, so the score depends on which reference someone wrote; more references help paraphrases but do not fix wrong answers
- What replaced them, chosen per task: task-specific code checks first (exact values, schema, tests pass, citations resolve), learned or embedding metrics (BERTScore, BLEURT, COMET) where references exist, rubric-based LLM-as-judge (G-Eval style) for open-ended quality, and human or outcome metrics as the ground truth
- Where overlap metrics still have a place: cheap regression smoke tests, constrained tasks, and comparability with older literature; and the evidence, such as the WMT22 metrics task finding that neural metrics correlate better with expert human ratings than BLEU

**Code / implementation expected:** Optional — implementing BLEU and ROUGE-L on a few answers and showing the paraphrase and wrong-word cases is a strong way to make the point.`,
    answer: `**Target Audience:** Engineers who have seen BLEU or ROUGE in a dashboard or a paper and need to explain why they mislead for LLM features, and candidates expected to know the modern metric stack.
**Difficulty:** Hard
**Verified with:** Node 22 and Python 3.12 (BLEU, ROUGE-1 and ROUGE-L implemented from scratch, scored on hand-written answers next to a key-fact check, then against different references). Published results are cited by paper, checked October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the examples; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A teacher marks history essays by counting how many words each essay shares with her own model answer. Pupils quickly learn the trick. One pupil copies the model answer almost word for word but writes "1066" as "1666": she scores very high. Another pupil, who actually understands the period, explains it in her own words: she shares few words with the model answer and scores low. The marking scheme is cheap, perfectly consistent, and measures the wrong thing.

BLEU and ROUGE are that marking scheme. They were built for tasks where a good output really does look like the reference, such as translating a sentence or summarising a news article, and where averaging over thousands of outputs smooths out the noise. An LLM assistant answering questions is the history essay: many correct wordings, and one wrong word can change everything.

## 2. What BLEU and ROUGE Compute

📌 **Interview term: n-gram** — a run of n consecutive words. "refunds take 5-7" contains the unigrams *refunds*, *take*, *5-7*, the bigrams *refunds take*, *take 5-7*, and one trigram.

📌 **Interview term: BLEU** — Bilingual Evaluation Understudy (Papineni, Roukos, Ward and Zhu, ACL 2002), built for machine translation. For n = 1 to 4 it computes **clipped n-gram precision** (the share of the candidate n-grams that appear in a reference, each counted at most as often as it appears there), takes their geometric mean, and multiplies by a **brevity penalty** so very short candidates cannot score high precision by saying little.

📌 **Interview term: ROUGE** — Recall-Oriented Understudy for Gisting Evaluation (Lin, 2004, "ROUGE: A Package for Automatic Evaluation of Summaries"), built for summarisation. ROUGE-N counts n-gram overlap with the reference (originally recall-oriented, commonly reported as F1); ROUGE-L uses the **longest common subsequence**, the longest sequence of words that appears in both texts in the same order, not necessarily adjacent.

The key part of the from-scratch BLEU in the first example:

~~~js
for (let n = 1; n <= 4; n++) {
  for (const [g, cnt] of ngrams(c, n)) {
    total += cnt;
    match += Math.min(cnt, Math.max(...rs.map((r) => ngrams(r, n).get(g) || 0)));  // clipping
  }
  const p = n === 1 ? match / total : (match + 1) / (total + 1);  // add-one smoothing for n >= 2
  logSum += Math.log(p) / 4;                                      // geometric mean
}
const bp = c.length > r ? 1 : Math.exp(1 - r / c.length);         // brevity penalty
~~~

Sentence-level BLEU needs smoothing, because a short sentence often has zero matching 4-grams and the geometric mean would be zero; add-one on the higher orders is one common choice. Library implementations differ in tokenisation and smoothing, which is itself a known reproducibility problem with reported BLEU numbers.

## 3. The Two-Sided Failure

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="A reference answer about refunds taking five to seven business days, compared with a correct paraphrase that shares few words and scores low, and a wrong answer that changes one word and scores high">
  <rect class="d-box-muted" x="180" y="20" width="400" height="56" rx="8"/>
  <text class="d-text" x="380" y="44" text-anchor="middle">reference</text>
  <text class="d-sub" x="380" y="64" text-anchor="middle">Refunds take 5-7 business days</text>
  <path class="d-edge-dashed" d="M 300 76 L 180 140"/>
  <path class="d-edge-dashed" d="M 460 76 L 580 140"/>
  <rect class="d-box-accent" x="20" y="140" width="320" height="100" rx="8"/>
  <text class="d-text" x="180" y="168" text-anchor="middle">correct paraphrase</text>
  <text class="d-sub" x="180" y="192" text-anchor="middle">money back within five to</text>
  <text class="d-sub" x="180" y="212" text-anchor="middle">seven working days</text>
  <text class="d-sub" x="180" y="232" text-anchor="middle">BLEU 0.109</text>
  <rect class="d-box" x="420" y="140" width="320" height="100" rx="8"/>
  <text class="d-text" x="580" y="168" text-anchor="middle">wrong answer</text>
  <text class="d-sub" x="580" y="192" text-anchor="middle">Refunds take 5-7</text>
  <text class="d-sub" x="580" y="212" text-anchor="middle">business months</text>
  <text class="d-sub" x="580" y="232" text-anchor="middle">BLEU 0.752</text>
</svg>

The correct answer is punished for its wording; the wrong answer is rewarded for copying. The first example, **"BLEU and ROUGE from scratch: paraphrase versus one wrong word"**, scores six answers against one reference, next to a hand-written key-fact check and a human verdict:

~~~text
answer              BLEU   ROUGE-1  ROUGE-L  fact check  human
copy of reference   1.000    1.000    1.000        pass  correct
paraphrase          0.109    0.133    0.133        pass  correct
friendly, longer    0.271    0.556    0.556        pass  correct
wrong unit          0.752    0.800    0.800        fail  wrong
negated             0.535    0.833    0.833        fail  wrong
wrong number        0.447    0.800    0.800        fail  wrong
~~~

Every wrong answer outscored every correct answer except the verbatim copy, on all three metrics. The negated answer ("Refunds do not take 5-7 business days") has the *highest* ROUGE of the wrong answers, because adding a word only costs a little precision. The program then searches for the best possible pass threshold per metric:

~~~text
BLEU     best threshold 1.000 -> 4/6 verdicts right
ROUGE-1  best threshold 1.000 -> 4/6 verdicts right
ROUGE-L  best threshold 1.000 -> 4/6 verdicts right
fact check                      -> 6/6 verdicts right
~~~

The best any threshold could do was "pass only exact copies", which is not a metric, it is string equality. The fact check got all six right, but notice what it is: a few lines written for this one fact, with its own normalisation ("five to seven" to "5-7", "working" to "business"). That is the honest shape of the replacement: checks designed around what correctness means for the task.

## 4. Reference Dependence

📌 **Interview term: reference-based metric** — a metric that scores a candidate by comparing it with one or more human-written references. Its value depends on the references as much as on the candidate.

Open-ended generation has many valid outputs, so whichever reference someone happened to write becomes the definition of "correct wording". The second example, **"Reference dependence: the same answers scored against different references"**:

~~~text
answer             human    ref A only          ref B only          refs A + B
                            BLEU   ROUGE-L      BLEU   ROUGE-L      BLEU   ROUGE-L
original wording   correct  1.000  1.000        0.059  0.118        1.000  1.000
paraphrase         correct  0.109  0.133        0.729  0.818        0.729  0.818
wrong unit         wrong    0.752  0.800        0.000  0.000        0.752  0.800
~~~

With reference B the two correct answers swap places. With both references (BLEU takes the best match per n-gram), the paraphrase recovers, but the wrong answer still ranks above it. More references help valid paraphrases; they do not teach the metric that "months" is wrong.

## 5. What They Cannot See

| Property | Overlap metrics | Why |
| :--- | :--- | :--- |
| Factual correctness | blind | one changed token costs a few n-grams |
| Negation | blind, even rewarded | "not" adds one token; everything else still matches |
| Instruction-following (format, length, language) | mostly blind | only indirectly through word overlap |
| Faithfulness to sources | blind | the reference is not the source |
| Safety, tone | blind | not about words shared with a reference |
| Valid paraphrase | penalised | different words, same meaning |

## 6. What Replaced Them

The modern answer is not one metric but a stack, chosen per task and ordered from most to least objective.

**1. Task-specific code checks.** Wherever correctness is objective: exact or normalised values, numeric tolerance, JSON schema, unit tests passing for generated code, citations that resolve, required facts present. Covered in [When do you use code-based graders versus model-based graders?](/interview-question/when-do-you-use-code-based-graders-versus-model-based-graders)

**2. Learned and embedding-based reference metrics**, where references exist and wording should not matter:

📌 **Interview term: BERTScore** — matches candidate and reference tokens by cosine similarity of contextual embeddings and reports precision, recall and F1 over the matches (Zhang et al., arXiv 1904.09675). Robust to synonyms and rephrasing; still needs a reference, and embeddings of a sentence and its negation can be close, so it is not a factuality check.

📌 **Interview term: learned metrics (BLEURT, COMET)** — models trained to predict human quality ratings. BLEURT (Sellam et al., arXiv 2004.04696) is a BERT-based regression model fine-tuned on human ratings of translations; COMET (Rei et al., arXiv 2009.09025) learns from human judgements and also reads the source sentence. Strongest where their training data matches your task (translation above all).

The evidence that these beat overlap metrics is clearest in machine translation, the field BLEU came from: the WMT22 Metrics Shared Task report was titled *Stop Using BLEU – Neural Metrics Are Better and More Robust* (Freitag et al., WMT 2022), finding that neural metrics correlated better with expert MQM human ratings than overlap metrics such as BLEU and chrF.

**3. Rubric-based LLM-as-judge**, for open-ended quality where no reference captures correctness: faithfulness, helpfulness, completeness, tone.

📌 **Interview term: G-Eval** — a judge setup that gives a strong model the evaluation criteria, has it reason in steps, and fills a scoring form (Liu et al., EMNLP 2023). With GPT-4 it reported a Spearman correlation of 0.514 with human judgements on the SummEval summarisation benchmark, which the authors describe as outperforming previous methods by a large margin. The same paper flags that LLM evaluators may be biased towards LLM-generated text. The biases and fixes are in [What is LLM-as-judge and what are its known biases?](/interview-question/what-is-llm-as-judge-and-what-are-its-known-biases)

**4. Humans and outcomes as the ground truth.** Expert labels to validate everything above, and product outcomes (ticket resolved without escalation, code merged, user did not rephrase) as the measure that the proxies are meant to predict.

For RAG, the reference-free metrics that grade answers against retrieved context (faithfulness, answer relevancy, context precision) are a specialised version of rung 3; see [Evaluating RAG with Ragas: faithfulness, answer relevancy, context precision?](/interview-question/evaluating-rag-with-ragas-faithfulness-answer-relevancy-context-precision)

## 7. Choosing per Task

| Task | Primary metric | Secondary |
| :--- | :--- | :--- |
| Extraction, classification, maths | exact or normalised match, tolerance | none needed |
| Code generation | tests pass in a sandbox | lint, judge for readability |
| Translation | COMET-style learned metric | human MQM sample |
| Summarisation | judged faithfulness to the source + key-point coverage | BERTScore or ROUGE as a cheap trend |
| Open-ended assistant | rubric judge per criterion, validated | outcome metrics, human review |
| RAG answer | faithfulness and relevancy against retrieved context | citation resolution checks |

## 8. Where Overlap Metrics Still Belong

- **Comparability.** Papers report BLEU or ROUGE so results can be compared with older work; quoting them alongside newer metrics is fine.
- **Cheap smoke tests on constrained outputs.** For templated rewrites or translation regression runs, a sudden drop flags that outputs changed shape, which is worth a look.
- **Averages, not verdicts.** Their signal is in averages over many outputs, not a pass or fail on one answer.
- **Tooling still offers them.** OpenAI documents a \`text_similarity\` grader whose evaluation metrics include BLEU and ROUGE variants alongside cosine similarity and fuzzy match (OpenAI Graders guide, as seen via search, October 2026). Available does not mean appropriate as a quality gate.

## 9. Verified: Running the Code

Both programs implement BLEU (4-gram, clipped precision, add-one smoothing for n ≥ 2, brevity penalty against the closest reference length), ROUGE-1 F1 and ROUGE-L F1 with a simple lower-case word tokeniser. The answers and human verdicts are hand-written for the illustration. A library implementation (sacrebleu, rouge-score) would tokenise and smooth differently, so its numbers would differ somewhat; the ordering problem would not.

**"BLEU and ROUGE from scratch: paraphrase versus one wrong word"** — \`node a.js\` and \`python3.12 a.py\` both print exactly:

~~~text
reference: "Refunds take 5-7 business days."
answer              BLEU   ROUGE-1  ROUGE-L  fact check  human
copy of reference   1.000    1.000    1.000        pass  correct
paraphrase          0.109    0.133    0.133        pass  correct
friendly, longer    0.271    0.556    0.556        pass  correct
wrong unit          0.752    0.800    0.800        fail  wrong
negated             0.535    0.833    0.833        fail  wrong
wrong number        0.447    0.800    0.800        fail  wrong

BLEU     best threshold 1.000 -> 4/6 verdicts right
ROUGE-1  best threshold 1.000 -> 4/6 verdicts right
ROUGE-L  best threshold 1.000 -> 4/6 verdicts right
fact check                      -> 6/6 verdicts right
~~~

**"Reference dependence: the same answers scored against different references"** — \`node b.js\` and \`python3.12 b.py\` both print exactly:

~~~text
ref A: "Refunds take 5-7 business days."
ref B: "You will get the money back within five to seven working days."

answer             human    ref A only          ref B only          refs A + B
                            BLEU   ROUGE-L      BLEU   ROUGE-L      BLEU   ROUGE-L
original wording   correct  1.000  1.000        0.059  0.118        1.000  1.000
paraphrase         correct  0.109  0.133        0.729  0.818        0.729  0.818
wrong unit         wrong    0.752  0.800        0.000  0.000        0.752  0.800

BLEU ranking with ref A only: original wording > wrong unit > paraphrase
BLEU ranking with ref B only: paraphrase > original wording > wrong unit
BLEU ranking with refs A + B: original wording > wrong unit > paraphrase
~~~

What the runs show:

- All three overlap metrics ranked every wrong answer above every non-copied correct answer; no threshold separated right from wrong.
- A negated answer kept 0.833 ROUGE-1; a one-word unit error kept 0.752 BLEU.
- Changing which reference was written swapped the ranking of two correct answers; adding a second reference did not stop the wrong answer outranking a correct one.

## Edge Cases Worth Knowing

- **Corpus versus sentence BLEU.** BLEU was designed as a corpus-level score (n-gram counts pooled over many sentences); sentence-level BLEU is noisier and depends heavily on smoothing.
- **Tokenisation.** Scores change with how "5-7" or punctuation are split; compare numbers only when computed with the same implementation and settings.
- **Learned metrics out of domain.** A metric trained on news translation ratings may not transfer to legal summaries or chat; validate on your own labelled sample, as you would a judge.
- **Length games.** ROUGE recall rewards longer outputs that include more reference words; BLEU precision and its brevity penalty push the other way. Neither tracks what a user wants.

## Common Pitfalls

- **ROUGE as the chatbot quality metric.** A dashboard that rises when answers copy the reference wording and misses wrong facts.
- **One reference per question.** Treating one person's wording as the only correct answer for an open-ended prompt.
- **Swapping in BERTScore and calling it solved.** Better at paraphrase, still blind to negation and factual errors.
- **Comparing BLEU across tools.** Different tokenisers and smoothing make numbers incomparable.
- **Skipping validation.** Adopting any automatic metric, learned or judged, without checking that it agrees with human labels on your task.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What they measure:</strong> <span style="color:#f0e2c8;">BLEU is clipped n-gram precision against reference texts with a brevity penalty, from machine translation in 2002. ROUGE is n-gram or longest-common-subsequence overlap, usually recall or F1, from summarisation in 2004. Both measure surface word overlap with a reference.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why that fails for LLMs:</strong> <span style="color:#f0e2c8;">LLM outputs are open-ended, so a correct answer can use completely different words. In my implementation a correct paraphrase scored BLEU 0.109, while a wrong answer that said months instead of days scored 0.752, and a negated answer scored 0.535. No threshold on BLEU or ROUGE separated right from wrong.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reference dependence:</strong> <span style="color:#f0e2c8;">The score depends on which reference someone wrote. Swapping the reference flipped the ranking of two correct answers, and adding a second reference raised the paraphrase but still ranked the wrong answer above it. The metrics are blind to negation, factual errors, instruction-following and safety.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What replaced them:</strong> <span style="color:#f0e2c8;">Per task: code checks wherever the answer is objective (values, schema, tests, citations); learned metrics like BERTScore, BLEURT or COMET where references exist; a rubric-based LLM judge for open-ended quality, validated against humans; and real outcomes like resolution rate as the ground truth.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Evidence and nuance:</strong> <span style="color:#f0e2c8;">The WMT22 metrics task was titled Stop Using BLEU: neural metrics correlated better with expert ratings. G-Eval reported 0.514 Spearman with humans on summarisation. Overlap metrics still have a place as cheap smoke tests on constrained outputs and for comparing with old papers, not as a product quality metric.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is ROUGE fine for summarisation then?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It was designed for it, and averaged over many outputs it is a more useful signal than on a single output, but it still rewards copying and misses factual errors such as a wrong number or a dropped negation. For an LLM summariser I would add a faithfulness check against the source, by a judge or an entailment model, and a coverage check of key points.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does BERTScore solve the paraphrase problem?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Partly. It matches tokens by contextual embedding similarity, so synonyms and rephrasings score higher than with BLEU. But embeddings of an answer and its negation, or of days and months, can still be close, so it is not a factuality check. It also still needs a reference.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just add more references?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">More references help valid paraphrases because the metric takes the best match, but writing them is expensive, open-ended tasks have endless valid answers, and a near-copy with one wrong fact still matches a reference closely. In my demo the wrong answer still outranked the paraphrase with two references.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you still compute BLEU?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As a cheap sanity signal for constrained transformations such as templated rewrites or translation regression smoke tests, when comparing with prior papers that report it, or as a drift alarm where a big drop flags that outputs changed shape. Never as the release gate for an assistant.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between BLEURT, COMET and an LLM judge?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">BLEURT and COMET are models trained to predict human quality ratings from candidate and reference (COMET also uses the source sentence), so they are fast and consistent but tied to the kind of data they were trained on. An LLM judge is a general model following a rubric, more flexible and able to work without a reference, but more expensive and with its own biases.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| N-gram | A run of n consecutive words |
| BLEU | Clipped n-gram precision with a brevity penalty, from machine translation |
| ROUGE | N-gram or longest-common-subsequence overlap with a reference, from summarisation |
| Reference-based metric | Scores a candidate by comparing it with human-written references |
| BERTScore | Token matching by contextual-embedding similarity |
| Learned metrics (BLEURT, COMET) | Models trained to predict human quality ratings |
| G-Eval | Criteria-driven, step-by-step LLM judging with a scoring form |

**Conclusion:** BLEU and ROUGE measure how many words and word sequences an output shares with a reference. That fits constrained tasks averaged over many outputs, but not LLM answers, which have many valid wordings and can be wrong by one word: in the demo a correct paraphrase scored BLEU 0.109 while "business months" scored 0.752, a negated answer kept 0.833 ROUGE-1, no threshold separated right from wrong, and changing the reference reshuffled the ranking. What replaced them is a stack chosen per task: code checks wherever correctness is objective, learned reference metrics such as COMET or BERTScore where references exist (WMT22 found neural metrics agree with experts better than BLEU), a validated rubric-based LLM judge for open-ended quality, and humans and product outcomes as the ground truth.`,
    examples: [
      {
        label: `BLEU and ROUGE from scratch: paraphrase versus one wrong word`,
        variants: [
          { tech: "node", code: `// BLEU and ROUGE from scratch, on answers to one question, next to a key-fact check
// and a human verdict. Reference: "Refunds take 5-7 business days."
const tok = (s) => s.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) || [];
function ngrams(t, n) {
  const m = new Map();
  for (let i = 0; i + n <= t.length; i++) { const k = t.slice(i, i + n).join(" "); m.set(k, (m.get(k) || 0) + 1); }
  return m;
}
function bleu(cand, refs) {
  const c = tok(cand), rs = refs.map(tok);
  let logSum = 0;
  for (let n = 1; n <= 4; n++) {
    const cg = ngrams(c, n);
    let match = 0, total = 0;
    for (const [g, cnt] of cg) {
      total += cnt;
      match += Math.min(cnt, Math.max(...rs.map((r) => ngrams(r, n).get(g) || 0)));
    }
    const p = n === 1 ? match / total : (match + 1) / (total + 1); // add-one smoothing for n >= 2
    if (p === 0) return 0;
    logSum += Math.log(p) / 4;
  }
  const r = rs.map((x) => x.length).sort((a, b) => Math.abs(a - c.length) - Math.abs(b - c.length) || a - b)[0];
  const bp = c.length > r ? 1 : Math.exp(1 - r / c.length);
  return bp * Math.exp(logSum);
}
function f1(match, cLen, rLen) { if (!match) return 0; const p = match / cLen, r = match / rLen; return (2 * p * r) / (p + r); }
function rouge1(cand, ref) {
  const c = ngrams(tok(cand), 1), r = ngrams(tok(ref), 1);
  let m = 0;
  for (const [g, cnt] of c) m += Math.min(cnt, r.get(g) || 0);
  return f1(m, tok(cand).length, tok(ref).length);
}
function rougeL(cand, ref) {
  const a = tok(cand), b = tok(ref);
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return f1(dp[a.length][b.length], a.length, b.length);
}
// task-specific code check: normalise a few equivalent phrasings, then require the fact and no negation
function factCheck(s) {
  const t = " " + tok(s).join(" ") + " ";
  const n = t.replace(/ five to seven /g, " 5-7 ").replace(/ working /g, " business ");
  return n.includes(" 5-7 business days ") && !/ (not|never|no) /.test(n);
}
const REF = "Refunds take 5-7 business days.";
const answers = [
  ["copy of reference", "Refunds take 5-7 business days.", "correct"],
  ["paraphrase", "Expect the money back within five to seven working days.", "correct"],
  ["friendly, longer", "Thanks for asking! Refunds usually take 5-7 business days to reach your account.", "correct"],
  ["wrong unit", "Refunds take 5-7 business months.", "wrong"],
  ["negated", "Refunds do not take 5-7 business days.", "wrong"],
  ["wrong number", "Refunds take 15-20 business days.", "wrong"],
];
console.log(\`reference: "\${REF}"\`);
console.log("answer              BLEU   ROUGE-1  ROUGE-L  fact check  human");
const rows = answers.map(([name, text, human]) => {
  const r = { name, human, bleu: bleu(text, [REF]), r1: rouge1(text, REF), rl: rougeL(text, REF), fact: factCheck(text) };
  console.log(\`\${name.padEnd(18)}  \${r.bleu.toFixed(3)}  \${r.r1.toFixed(3).padStart(7)}  \${r.rl.toFixed(3).padStart(7)}  \${(r.fact ? "pass" : "fail").padStart(10)}  \${human}\`);
  return r;
});
console.log("");
// best achievable accuracy if you pick the single best pass threshold for each metric
for (const key of ["bleu", "r1", "rl"]) {
  let best = 0, bestT = 0;
  for (const t of rows.map((r) => r[key])) {
    const acc = rows.filter((r) => (r[key] >= t) === (r.human === "correct")).length;
    if (acc > best) { best = acc; bestT = t; }
  }
  const label = { bleu: "BLEU", r1: "ROUGE-1", rl: "ROUGE-L" }[key];
  console.log(\`\${label.padEnd(8)} best threshold \${bestT.toFixed(3)} -> \${best}/\${rows.length} verdicts right\`);
}
console.log(\`fact check                      -> \${rows.filter((r) => r.fact === (r.human === "correct")).length}/\${rows.length} verdicts right\`);` },
          { tech: "python", code: `# BLEU and ROUGE from scratch, on answers to one question, next to a key-fact check
# and a human verdict. Reference: "Refunds take 5-7 business days."
import math
import re


def tok(s):
    return re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)*", s.lower())


def ngrams(t, n):
    m = {}
    for i in range(len(t) - n + 1):
        k = " ".join(t[i:i + n])
        m[k] = m.get(k, 0) + 1
    return m


def bleu(cand, refs):
    c, rs = tok(cand), [tok(r) for r in refs]
    log_sum = 0.0
    for n in range(1, 5):
        cg = ngrams(c, n)
        match = total = 0
        for g, cnt in cg.items():
            total += cnt
            match += min(cnt, max(ngrams(r, n).get(g, 0) for r in rs))
        p = match / total if n == 1 else (match + 1) / (total + 1)  # add-one smoothing for n >= 2
        if p == 0:
            return 0.0
        log_sum += math.log(p) / 4
    r = sorted((len(x) for x in rs), key=lambda L: (abs(L - len(c)), L))[0]
    bp = 1 if len(c) > r else math.exp(1 - r / len(c))
    return bp * math.exp(log_sum)


def f1(match, c_len, r_len):
    if not match:
        return 0.0
    p, r = match / c_len, match / r_len
    return 2 * p * r / (p + r)


def rouge1(cand, ref):
    c, r = ngrams(tok(cand), 1), ngrams(tok(ref), 1)
    m = sum(min(cnt, r.get(g, 0)) for g, cnt in c.items())
    return f1(m, len(tok(cand)), len(tok(ref)))


def rouge_l(cand, ref):
    a, b = tok(cand), tok(ref)
    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            dp[i][j] = dp[i - 1][j - 1] + 1 if a[i - 1] == b[j - 1] else max(dp[i - 1][j], dp[i][j - 1])
    return f1(dp[len(a)][len(b)], len(a), len(b))


# task-specific code check: normalise a few equivalent phrasings, then require the fact and no negation
def fact_check(s):
    t = " " + " ".join(tok(s)) + " "
    n = t.replace(" five to seven ", " 5-7 ").replace(" working ", " business ")
    return " 5-7 business days " in n and not re.search(r" (not|never|no) ", n)


REF = "Refunds take 5-7 business days."
answers = [
    ("copy of reference", "Refunds take 5-7 business days.", "correct"),
    ("paraphrase", "Expect the money back within five to seven working days.", "correct"),
    ("friendly, longer", "Thanks for asking! Refunds usually take 5-7 business days to reach your account.", "correct"),
    ("wrong unit", "Refunds take 5-7 business months.", "wrong"),
    ("negated", "Refunds do not take 5-7 business days.", "wrong"),
    ("wrong number", "Refunds take 15-20 business days.", "wrong"),
]
print(f'reference: "{REF}"')
print("answer              BLEU   ROUGE-1  ROUGE-L  fact check  human")
rows = []
for name, text, human in answers:
    r = {"name": name, "human": human, "bleu": bleu(text, [REF]), "r1": rouge1(text, REF), "rl": rouge_l(text, REF), "fact": fact_check(text)}
    print(f"{name:<18}  {r['bleu']:.3f}  {r['r1']:>7.3f}  {r['rl']:>7.3f}  {'pass' if r['fact'] else 'fail':>10}  {human}")
    rows.append(r)
print("")
# best achievable accuracy if you pick the single best pass threshold for each metric
labels = {"bleu": "BLEU", "r1": "ROUGE-1", "rl": "ROUGE-L"}
for key in ["bleu", "r1", "rl"]:
    best, best_t = 0, 0
    for t in [r[key] for r in rows]:
        acc = sum(1 for r in rows if (r[key] >= t) == (r["human"] == "correct"))
        if acc > best:
            best, best_t = acc, t
    print(f"{labels[key]:<8} best threshold {best_t:.3f} -> {best}/{len(rows)} verdicts right")
print(f"fact check                      -> {sum(1 for r in rows if r['fact'] == (r['human'] == 'correct'))}/{len(rows)} verdicts right")` },
        ],
      },
      {
        label: `Reference dependence: the same answers scored against different references`,
        variants: [
          { tech: "node", code: `// Overlap scores depend on which reference someone happened to write.
// Same BLEU / ROUGE-L as the previous example; multi-reference takes the best match.
const tok = (s) => s.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) || [];
function ngrams(t, n) {
  const m = new Map();
  for (let i = 0; i + n <= t.length; i++) { const k = t.slice(i, i + n).join(" "); m.set(k, (m.get(k) || 0) + 1); }
  return m;
}
function bleu(cand, refs) {
  const c = tok(cand), rs = refs.map(tok);
  let logSum = 0;
  for (let n = 1; n <= 4; n++) {
    const cg = ngrams(c, n);
    let match = 0, total = 0;
    for (const [g, cnt] of cg) {
      total += cnt;
      match += Math.min(cnt, Math.max(...rs.map((r) => ngrams(r, n).get(g) || 0)));
    }
    const p = n === 1 ? match / total : (match + 1) / (total + 1); // add-one smoothing for n >= 2
    if (p === 0) return 0;
    logSum += Math.log(p) / 4;
  }
  const r = rs.map((x) => x.length).sort((a, b) => Math.abs(a - c.length) - Math.abs(b - c.length) || a - b)[0];
  const bp = c.length > r ? 1 : Math.exp(1 - r / c.length);
  return bp * Math.exp(logSum);
}
function f1(match, cLen, rLen) { if (!match) return 0; const p = match / cLen, r = match / rLen; return (2 * p * r) / (p + r); }
function rouge1(cand, ref) {
  const c = ngrams(tok(cand), 1), r = ngrams(tok(ref), 1);
  let m = 0;
  for (const [g, cnt] of c) m += Math.min(cnt, r.get(g) || 0);
  return f1(m, tok(cand).length, tok(ref).length);
}
function rougeL(cand, ref) {
  const a = tok(cand), b = tok(ref);
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return f1(dp[a.length][b.length], a.length, b.length);
}
function rougeLMulti(cand, refs) { return Math.max(...refs.map((r) => rougeL(cand, r))); }

const REF_A = "Refunds take 5-7 business days.";
const REF_B = "You will get the money back within five to seven working days.";
const answers = [
  ["original wording", "Refunds take 5-7 business days.", "correct"],
  ["paraphrase", "Expect the money back within five to seven working days.", "correct"],
  ["wrong unit", "Refunds take 5-7 business months.", "wrong"],
];
const sets = [["ref A only", [REF_A]], ["ref B only", [REF_B]], ["refs A + B", [REF_A, REF_B]]];
console.log(\`ref A: "\${REF_A}"\`);
console.log(\`ref B: "\${REF_B}"\`);
console.log("");
console.log(("answer             human    " + sets.map(([n]) => n.padEnd(20)).join("")).trimEnd());
console.log(("                            " + sets.map(() => "BLEU   ROUGE-L".padEnd(20)).join("")).trimEnd());
for (const [name, text, human] of answers) {
  const cells = sets.map(([, refs]) => \`\${bleu(text, refs).toFixed(3)}  \${rougeLMulti(text, refs).toFixed(3)}\`.padEnd(20));
  console.log(\`\${name.padEnd(17)}  \${human.padEnd(7)}  \${cells.join("")}\`.trimEnd());
}
console.log("");
const rank = (refs) => answers.map(([n, t]) => [n, bleu(t, refs)]).sort((a, b) => b[1] - a[1]).map((x) => x[0]).join(" > ");
for (const [n, refs] of sets) console.log(\`BLEU ranking with \${n}: \${rank(refs)}\`);` },
          { tech: "python", code: `# Overlap scores depend on which reference someone happened to write.
# Same BLEU / ROUGE-L as the previous example; multi-reference takes the best match.
import math
import re


def tok(s):
    return re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)*", s.lower())


def ngrams(t, n):
    m = {}
    for i in range(len(t) - n + 1):
        k = " ".join(t[i:i + n])
        m[k] = m.get(k, 0) + 1
    return m


def bleu(cand, refs):
    c, rs = tok(cand), [tok(r) for r in refs]
    log_sum = 0.0
    for n in range(1, 5):
        cg = ngrams(c, n)
        match = total = 0
        for g, cnt in cg.items():
            total += cnt
            match += min(cnt, max(ngrams(r, n).get(g, 0) for r in rs))
        p = match / total if n == 1 else (match + 1) / (total + 1)  # add-one smoothing for n >= 2
        if p == 0:
            return 0.0
        log_sum += math.log(p) / 4
    r = sorted((len(x) for x in rs), key=lambda L: (abs(L - len(c)), L))[0]
    bp = 1 if len(c) > r else math.exp(1 - r / len(c))
    return bp * math.exp(log_sum)


def f1(match, c_len, r_len):
    if not match:
        return 0.0
    p, r = match / c_len, match / r_len
    return 2 * p * r / (p + r)


def rouge1(cand, ref):
    c, r = ngrams(tok(cand), 1), ngrams(tok(ref), 1)
    m = sum(min(cnt, r.get(g, 0)) for g, cnt in c.items())
    return f1(m, len(tok(cand)), len(tok(ref)))


def rouge_l(cand, ref):
    a, b = tok(cand), tok(ref)
    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            dp[i][j] = dp[i - 1][j - 1] + 1 if a[i - 1] == b[j - 1] else max(dp[i - 1][j], dp[i][j - 1])
    return f1(dp[len(a)][len(b)], len(a), len(b))


def rouge_l_multi(cand, refs):
    return max(rouge_l(cand, r) for r in refs)


REF_A = "Refunds take 5-7 business days."
REF_B = "You will get the money back within five to seven working days."
answers = [
    ("original wording", "Refunds take 5-7 business days.", "correct"),
    ("paraphrase", "Expect the money back within five to seven working days.", "correct"),
    ("wrong unit", "Refunds take 5-7 business months.", "wrong"),
]
sets = [("ref A only", [REF_A]), ("ref B only", [REF_B]), ("refs A + B", [REF_A, REF_B])]
print(f'ref A: "{REF_A}"')
print(f'ref B: "{REF_B}"')
print("")
print(("answer             human    " + "".join(f"{n:<20}" for n, _ in sets)).rstrip())
print(("                            " + "".join(f"{'BLEU   ROUGE-L':<20}" for _ in sets)).rstrip())
for name, text, human in answers:
    cells = [f"{bleu(text, refs):.3f}  {rouge_l_multi(text, refs):.3f}".ljust(20) for _, refs in sets]
    print(f"{name:<17}  {human:<7}  {''.join(cells)}".rstrip())
print("")


def rank(refs):
    scored = sorted(((n, bleu(t, refs)) for n, t, _ in answers), key=lambda x: -x[1])
    return " > ".join(n for n, _ in scored)


for n, refs in sets:
    print(f"BLEU ranking with {n}: {rank(refs)}")` },
        ],
      },
    ],
  },
];

export default augments;
