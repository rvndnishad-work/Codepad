/**
 * AI ENGINEERING ULTRA — batch 16: Evals II (LLM-as-judge, DeepEval and human
 * eval beyond Ragas; the Ragas RAG metrics; evaluating a RAG pipeline end to end;
 * evaluating and debugging agent trajectories; catching regressions on prompt
 * changes and model upgrades).
 * Every example was run by scripts/verify-variant-examples.ts (node, python);
 * quoted output is that run's output.
 */
import type { AiUltraAugment } from "./ai-augments.types";

const augments: AiUltraAugment[] = [
  {
    title: `Beyond Ragas: how do you eval LLMs with LLM-as-judge, DeepEval, and human eval?`,
    difficulty: "medium",
    seoDescription: `A layered LLM eval stack: code checks, a rubric LLM judge, DeepEval in CI, and human review with kappa as the ceiling the judge is calibrated to.`,
    description: `**Question presented to candidate:**
"We already run Ragas on our RAG endpoint, but most of our product is not retrieval: summaries, support replies, an agent that files tickets. How would you evaluate those outputs? Talk me through where an LLM judge fits, what a framework like DeepEval gives you, and where humans still have to be involved."

**What a strong answer should cover:**
- A layered stack: code checks for anything objective, an LLM judge with a written rubric for subjective criteria, and human review as the source of truth that the judge is calibrated against
- LLM-as-judge done properly: specific rubric criteria (G-Eval style evaluation steps), a fixed judge model and prompt version, binary or low-precision scales, and agreement with human labels measured before the scores are trusted
- What DeepEval adds: a pytest-style harness (\`LLMTestCase\`, metrics with thresholds, \`assert_test\`, \`deepeval test run\`), a catalogue of RAG, agent and conversational metrics, and custom G-Eval criteria; and that it is a harness, not a source of truth
- Human evaluation as a designed process: written guidelines, two annotators on a shared subset, inter-annotator agreement (Cohen's kappa) as the ceiling the judge cannot beat, and adjudication of disagreements
- Routing and cost: humans see borderline judge scores, a random audit sample and escalations, not everything; the judge is re-checked against fresh human labels whenever the judge model, rubric or product changes

**Clarifying questions expected:**
- Which outputs are objective (formats, facts, actions) and which are subjective (tone, helpfulness), and who owns the definition of "good"?
- How many outputs a day, and what budget exists for human reviewers or domain experts?
- Is there an existing labelled set, or do we have to create the first human labels?

**Code / implementation expected:** Optional — a DeepEval test with a custom G-Eval criterion, or the arithmetic for judge-human agreement and review routing.`,
    answer: `**Target Audience:** Engineers who have one eval framework running (often Ragas on a RAG endpoint) and now need to evaluate the rest of an LLM product: summaries, support replies, agents, anything without a neat retrieval score.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (the judge-calibration and review-routing example below). DeepEval and G-Eval details were checked against the DeepEval docs, PyPI and the G-Eval paper via web search in October 2026; where only secondary sources were found, the text says so.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A restaurant chain wants every branch to cook the same dish to the same standard. It has three ways to check.

A **thermometer** in every kitchen: is the chicken at 74 °C? Cheap, instant, never argues. But it cannot tell you whether the dish tastes good.

A **trained taster** who visits every branch with a scoring sheet: seasoning 1 to 5, presentation 1 to 5. Much more useful, and still affordable at scale. But tasters have quirks. One likes salty food. One gives higher marks to bigger portions.

The **head chef** who tastes a handful of plates a week. Slow and expensive, but the head chef is the definition of "right". The head chef also tastes the same plates as the taster now and then, to check the taster still agrees.

An LLM product needs all three. Code checks are the thermometer. An **LLM judge** is the trained taster. **Human evaluation** is the head chef. Ragas, from the sibling question, is one specialised taster for retrieval answers; this doc is about the whole kitchen.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which outputs have an objective right answer, and which are matters of quality or tone? | Objective criteria go to code checks; only the subjective rest needs a judge or a human |
| Who decides what "good" means: support leads, lawyers, doctors? | The human labels must come from the people whose opinion defines quality, or the judge is calibrated to the wrong target |
| How many outputs per day, and what is the review budget? | Sets how many items humans can see and how much judge traffic is affordable |
| Is there an existing labelled set? | Without human labels you cannot measure whether a judge is trustworthy; creating them is step one |
| Is the evaluation offline (before release), online (on live traffic), or both? | Offline needs a fixed dataset and a CI gate; online needs sampling and dashboards |

## 3. The Three Layers

📌 **Interview term: code-based grader** — a check written as ordinary code: JSON parses, schema validates, the order ID matches, no forbidden phrase, the tool call had valid arguments. Deterministic, free, and impossible to argue with. The full comparison is in [When do you use code-based graders versus model-based graders?](/interview-question/when-do-you-use-code-based-graders-versus-model-based-graders)

📌 **Interview term: LLM-as-judge** — using a language model, given a written rubric, to score or compare outputs on criteria that code cannot check (helpfulness, tone, whether a summary left out something important). How judges fail is its own question: [What is LLM-as-judge and what are its known biases?](/interview-question/what-is-llm-as-judge-and-what-are-its-known-biases)

📌 **Interview term: human evaluation** — people, ideally domain experts, labelling outputs against written guidelines. It is the ground truth everything else is checked against, and the most expensive layer.

<svg class="iq-diagram" width="100%" viewBox="0 0 860 250" role="img" aria-label="Three evaluation layers from cheap code checks to an LLM judge to human review, with human labels calibrating the judge">
  <defs>
    <marker id="ai16q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="220" height="90" rx="10"/>
  <text class="d-text" x="130" y="76" text-anchor="middle">code checks</text>
  <text class="d-sub" x="130" y="102" text-anchor="middle">every output, free</text>
  <rect class="d-box-accent" x="320" y="40" width="220" height="90" rx="10"/>
  <text class="d-text" x="430" y="76" text-anchor="middle">LLM judge</text>
  <text class="d-sub" x="430" y="102" text-anchor="middle">every output, cents</text>
  <rect class="d-box-muted" x="620" y="40" width="220" height="90" rx="10"/>
  <text class="d-text" x="730" y="76" text-anchor="middle">human review</text>
  <text class="d-sub" x="730" y="102" text-anchor="middle">a sample, dollars</text>
  <path class="d-edge" d="M 244 85 L 314 85" marker-end="url(#ai16q1-arrow)"/>
  <path class="d-edge" d="M 544 85 L 614 85" marker-end="url(#ai16q1-arrow)"/>
  <path class="d-edge-dashed" d="M 730 134 L 730 200 L 430 200 L 430 138" marker-end="url(#ai16q1-arrow)"/>
  <text class="d-sub" x="580" y="225" text-anchor="middle">labels calibrate the judge</text>
</svg>

Each layer handles what the cheaper one cannot. Outputs that fail a code check never need a judge; outputs the judge is unsure about go to humans; and a stream of human labels flows back to measure the judge.

A useful rule of thumb when designing the stack: **push every criterion as far left as it will go.** "Mentions the refund amount" sounds subjective, but if the amount is in the test case, a regex can check it. Only what is left goes to the judge.

## 4. LLM-as-Judge, Done Properly

A judge is a prompt like any other, so it needs the same discipline as your product prompt.

1. **Specific criteria, not "rate this 1 to 10".** "Does the reply state the refund window from the policy?" is gradeable. "Is this a good reply?" mostly measures the judge model's taste.
2. **Ask for reasoning before the verdict**, and prefer binary or 3-point scales per criterion over one 10-point score. Fine scales give an illusion of precision.
3. **Pin the judge.** A fixed model snapshot, a versioned rubric, temperature 0 where the API allows it. Changing the judge changes every historical score.
4. **Measure it against humans before you trust it**, and again whenever the judge, the rubric or the product changes. Section 7 does this with numbers.

📌 **Interview term: G-Eval** — a judge method from Liu et al., "G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment" (EMNLP 2023, arXiv 2303.16634). The judge first generates evaluation steps from the criteria (chain of thought), then fills in a score, and the final score is a probability-weighted average over the score tokens rather than the single number the model printed. DeepEval's \`GEval\` metric is named after it.

How much should you trust a well-built judge? The widely cited reference point is Zheng et al., "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena" (NeurIPS 2023), which reported that GPT-4 as a judge reached over 80% agreement with human preferences, about the same level humans reached with each other. That was one benchmark of general chat preferences in 2023; your domain, your rubric and your judge model need their own measurement.

### Absolute scores versus pairwise comparisons

📌 **Interview term: pairwise comparison** — showing the judge (or a human) two outputs for the same input and asking which is better, instead of scoring each one alone. People and models are often more consistent at "which is better" than at "how good is this on a 1 to 5 scale", which makes pairwise the natural format for A/B tests of two prompts. Its cost is that it gives a relative answer only; for a release gate ("at least 95% must pass") you still need absolute pass or fail.

## 5. What DeepEval Gives You

📌 **Interview term: DeepEval** — an open-source Python framework from Confident AI that treats LLM evaluation like unit testing. As of October 2026 PyPI listed version 4.1.5.

The shape, from the DeepEval getting-started docs (checked via search, October 2026):

- An **\`LLMTestCase\`** holds one example: \`input\`, \`actual_output\`, and optionally \`expected_output\`, \`retrieval_context\`, tool calls.
- A **metric** scores a test case and has a **threshold**; DeepEval ships RAG metrics (answer relevancy, faithfulness, contextual precision, recall and relevancy), agent metrics (task completion, tool correctness, argument correctness and others) and conversational metrics, plus \`GEval\` for custom criteria in plain English.
- **\`assert_test(test_case, [metric])\`** inside a pytest-style test fails if a metric is under its threshold, and **\`deepeval test run test_file.py\`** runs the file, so evals live next to your other tests and run in CI.

~~~python
# Not run here: needs a judge-model API key. Shape from the DeepEval docs, October 2026.
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, SingleTurnParams

policy_reply = GEval(
    name="States the refund policy correctly",
    criteria="The reply gives the refund window and the restocking fee from the expected output, "
             "invents no other conditions, and stays polite.",
    evaluation_params=[SingleTurnParams.INPUT, SingleTurnParams.ACTUAL_OUTPUT, SingleTurnParams.EXPECTED_OUTPUT],
    threshold=0.7,
)

def test_refund_reply():
    case = LLMTestCase(
        input="Can I return my opened laptop?",
        actual_output="Yes, within 14 days. Opened laptops have a 15% restocking fee.",
        expected_output="14-day window; 15% restocking fee on opened laptops.",
    )
    assert_test(case, [policy_reply])

# deepeval test run test_refund.py
~~~

One naming caveat: older DeepEval examples, including many tutorials, import \`LLMTestCaseParams\`; the current docs and the 4.1.5 PyPI page show \`SingleTurnParams\`. I did not find the changelog entry for the rename, so check your installed version.

What DeepEval does **not** give you is trust. Every model-graded metric in it is an LLM judge with DeepEval's prompt, so everything in section 4 applies: pin the judge model, and measure the metric against your own human labels before using its threshold as a release gate. Similar harnesses exist (promptfoo, Braintrust, LangSmith, Ragas for RAG); the choice matters far less than having human-calibrated criteria.

## 6. Human Evaluation Is a Process, Not a Vibe

"Someone on the team looked at 30 outputs" is not human evaluation. To produce labels you can calibrate a judge against:

- **Write guidelines** with a definition and examples for each criterion, including borderline cases. Most disagreement between annotators turns out to be disagreement about the guideline.
- **Use the right people.** Medical, legal or financial content needs domain experts; crowd workers can rate tone but not correctness of a drug interaction.
- **Double-label a shared subset** so you can measure how much humans agree with each other.
- **Adjudicate** disagreements with a third reviewer, and feed the decision back into the guidelines.

📌 **Interview term: inter-annotator agreement (IAA)** — how often two human labellers give the same label to the same item. Raw agreement overstates it when one label is common, so it is usually reported as Cohen's kappa.

📌 **Interview term: Cohen's kappa** — agreement corrected for chance: κ = (p_o − p_e) / (1 − p_e), where p_o is the observed agreement and p_e the agreement two labellers would reach by chance given how often each says "pass". 1 is perfect, 0 is chance level. On the commonly used Landis and Koch (1977) scale, 0.61 to 0.80 is called substantial agreement.

📌 **Interview term: adjudicated label (gold label)** — the final label for an item after disagreements between annotators have been resolved. This is what you score the judge against.

The key insight: **human-human agreement is the ceiling.** If two of your experts only agree at κ = 0.7, a judge that "agrees with humans" at κ = 0.7 is as good as another expert, and chasing 0.95 is chasing noise. If the experts themselves are at κ = 0.3, the criterion is badly defined and no judge will fix it.

## 7. Verified: Running the Code

The example **"Calibrating an LLM judge against two human annotators, then routing reviews"** has 20 support replies, each with four features (facts correct, cites the policy, longer than 80 words, polite) and labels from two human annotators. Two judges are deterministic stubs that score the features a rubric prompt would look at, so the run needs no model: judge v1 gives a point for length (a known judge bias), judge v2 has a "facts first, length is not quality" rubric. The core of the agreement maths:

~~~js
function kappa(x, y) {
  const n = x.length;
  let agree = 0, x1 = 0, y1 = 0;
  for (let i = 0; i < n; i++) { if (x[i] === y[i]) agree++; x1 += x[i]; y1 += y[i]; }
  const po = agree / n;                                        // observed agreement
  const pe = (x1 / n) * (y1 / n) + (1 - x1 / n) * (1 - y1 / n); // agreement by chance
  return { po, k: (po - pe) / (1 - pe) };
}
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
human A vs human B: agreement=0.850 kappa=0.700 (20 cases)
human A vs adjudicated: agreement=1.000 kappa=1.000
human B vs adjudicated: agreement=0.850 kappa=0.700
judge v1 (length bonus): agreement=0.700 kappa=0.429 | judge-pass/human-fail=6 judge-fail/human-pass=0 | disagree on c03,c07,c10,c13,c15,c19
judge v2 (facts rubric): agreement=0.900 kappa=0.802 | judge-pass/human-fail=2 judge-fail/human-pass=0 | disagree on c07,c13
routed to human review: c02,c09,c10,c13,c16,c20 (6/20)
per day at 20000 outputs: judge $40.00 + humans $3000.00 = $3040.00 vs all-human $10000.00
~~~

How to read it:

- **The humans set the ceiling.** A and B agree on 17 of 20 (κ = 0.70). The adjudicator sided with A on all three disagreements, so B is the outlier: the fix is a guideline clarification for B, not more judge tuning.
- **Judge v1 looks fine on raw agreement (70%) and is not.** Its κ of 0.43 is well below the human ceiling, and all six errors are the dangerous kind: *judge pass, human fail*. Four of them (c03, c10, c15, c19) are long, policy-citing, wrong answers, which the length bonus pushed over the line.
- **Judge v2 reaches κ = 0.80** against the adjudicated labels, comparable to annotator B. Its two remaining misses, c07 and c13, are both correct but rude replies: the rubric has no tone criterion. The lesson is that the error list tells you which criterion to add, which a single agreement number never would.
- **Routing:** borderline items (judge v2 score of exactly 4: correct but no citation) plus every tenth item go to humans, 6 of 20 here. A real system routes a smaller share, but the shape is the same: humans see uncertainty and a random audit, not everything.
- **Cost, under stated assumptions** ($0.002 per judge call, $0.50 per human review, 20,000 outputs a day): $3,040 a day for judge plus routed review against $10,000 for reviewing everything. Both prices are assumptions for the arithmetic; plug in your own.

The simulation leaves out what makes this harder in practice: real judges are not deterministic, labels arrive over weeks, and the human sample must be random (not "the ones that looked odd") for the agreement numbers to mean anything.

## 8. Putting the Layers Together

| Layer | Runs on | Good at | Weak at | Trust comes from |
| :--- | :--- | :--- | :--- | :--- |
| Code checks | Every output, every CI run | Formats, exact facts, actions, safety rules | Anything that needs judgement | The code itself |
| LLM judge (G-Eval style rubric, DeepEval or similar) | Every output offline; a sample online | Tone, completeness, relevance, faithfulness | Biases (length, position, self-preference), drift when the judge model changes | Measured agreement with human labels |
| Human review | A random sample, borderline items, escalations | The definition of quality, new failure types | Cost, speed, consistency between people | Guidelines, inter-annotator agreement, adjudication |

A sensible loop: code checks gate every PR, the judge scores the full golden set and a production sample, humans label a few hundred items a month, and those labels both re-measure the judge and become new golden cases ([How do you build a golden dataset for evaluating an LLM feature?](/interview-question/how-do-you-build-a-golden-dataset-for-evaluating-an-llm-feature)). Live-traffic sampling is covered in [How do you monitor LLM quality drift in production?](/interview-question/how-do-you-monitor-llm-quality-drift-in-production)

## Edge Cases Worth Knowing

- **Raw agreement lies when one label dominates.** If 95% of outputs pass, a judge that always says "pass" has 95% agreement and κ = 0. Always report kappa and the confusion cells, especially *judge pass, human fail*.
- **Changing the judge model is a migration.** A new judge snapshot can shift every score while the product is unchanged. Re-run calibration before comparing scores across the change.
- **Humans drift too.** Annotators get faster and more lenient over weeks. Re-label a fixed anchor set occasionally to detect it.
- **Pairwise results do not convert to pass rates.** "B beats A 60% of the time" says nothing about whether either meets the release bar.
- **Framework metrics are someone else's rubric.** A DeepEval or Ragas "answer relevancy" score was designed for a general case; read its definition before deciding it measures what your users care about.

## Common Pitfalls

- **Using the judge without ever measuring it.** A judge score with no human comparison is a number with unknown meaning. Measure agreement on at least a few hundred labelled items before gating on it.
- **One holistic 1-10 score.** It hides which criterion failed and invites length and style bias. Use specific binary criteria with reasoning first.
- **Calling a quick look "human eval".** Without guidelines, double labelling and a random sample, human impressions are not ground truth.
- **Expecting the judge to beat the humans.** Agreement above the human-human ceiling usually means the test set is too easy or the labels came from the judge.
- **Letting the framework choose the criteria.** DeepEval, Ragas and others give ready metrics; the product team still has to say what good means.
- **Same model as generator and judge without checking.** Self-preference is a documented bias; at least measure it, or use a judge from a different model family.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame it as layers:</strong> <span style="color:#f0e2c8;">Ragas covers retrieval answers; for everything else I build three layers. <strong style="color:#ffca28;">Code checks</strong> for anything objective, an <strong style="color:#ffca28;">LLM judge</strong> with a written rubric for subjective criteria, and <strong style="color:#ffca28;">human review</strong> as the ground truth the judge is measured against.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Make the judge specific:</strong> <span style="color:#f0e2c8;">The judge gets binary criteria like <em style="color:#f0e2c8;">states the refund window from the policy</em>, reasons before it gives a verdict, and is pinned to one model snapshot and one rubric version. That is the G-Eval idea: evaluation steps first, then the score.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Place DeepEval:</strong> <span style="color:#f0e2c8;">DeepEval is the harness: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LLMTestCase</code>, metrics with thresholds, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assert_test</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">deepeval test run</code> in CI, plus ready RAG and agent metrics and custom <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GEval</code> criteria. It runs the judge; it does not make the judge trustworthy.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Run human eval as a process:</strong> <span style="color:#f0e2c8;">Guidelines with examples, domain experts, a double-labelled subset and adjudication. <strong style="color:#ffca28;">Human-human kappa is the ceiling</strong>: in my toy run two annotators agreed at 0.70, a length-biased judge at 0.43, and a facts-first rubric at 0.80.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Route and re-check:</strong> <span style="color:#f0e2c8;">Humans see borderline judge scores and a random audit sample, which kept the toy cost at about a third of reviewing everything. I re-measure judge agreement whenever the judge model, the rubric or the product changes.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use humans for everything?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Cost and speed: reviewing every output costs dollars each and takes days, so it cannot gate a pull request. Humans are better spent on a random sample, borderline cases and new failure types, with their labels used to keep the judge honest.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many human labels do you need to trust a judge?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Enough to estimate agreement with a useful margin and to cover each important slice: a few hundred labelled items is a common starting point, with both passes and failures well represented. Twenty items, as in the toy, shows the method but not a trustworthy number.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The judge agrees with humans 92% of the time. Is that good?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by itself. If 92% of outputs pass, always saying pass scores 92%. I want <strong style="color:#ffca28;">Cohen's kappa</strong>, the count of <em style="color:#d8d8d8;">judge pass, human fail</em> cases, and the human-human agreement for comparison.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is G-Eval and does DeepEval implement it exactly?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">G-Eval (Liu et al., 2023) has the judge generate evaluation steps and then weights the score by the probabilities of the score tokens. DeepEval's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GEval</code> is built on that idea, and a mirror of its docs lists a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">top_logprobs</code> parameter, which points to the probability weighting when the judge model returns log probabilities. I could not confirm what it does with a model that does not, so I check the source for my setup instead of assuming.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Pairwise or absolute scoring?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pairwise (<em style="color:#d8d8d8;">which of these two is better</em>) is usually more consistent and suits A/B comparisons of prompts or models. Absolute pass or fail per criterion is what a release gate needs. I often use both: pairwise to choose, absolute to gate.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Code-based grader | A deterministic check written as code: schema, exact match, regex, valid tool call |
| LLM-as-judge | A model scoring outputs against a written rubric |
| Human evaluation | People labelling outputs against guidelines; the ground truth |
| G-Eval | Judge method: generated evaluation steps, then a probability-weighted score (Liu et al., 2023) |
| Pairwise comparison | Choosing the better of two outputs instead of scoring each one |
| DeepEval | Open-source pytest-style LLM eval framework with metrics, thresholds and \`assert_test\` |
| Inter-annotator agreement | How often two human labellers agree on the same items |
| Cohen's kappa | Agreement corrected for chance; 1 perfect, 0 chance level |
| Adjudicated label | Final label after annotator disagreements are resolved |

**Conclusion:** Evaluating an LLM product beyond retrieval metrics is a layered system, not a choice of tool. Code checks take every criterion that has an objective answer; an LLM judge with specific, versioned rubric criteria scores the subjective rest at scale; and human evaluation, run as a real process with guidelines, double labelling and adjudication, defines what good means and measures the judge. DeepEval and similar frameworks make the judge layer easy to run in CI, but its scores mean something only after you have shown, with kappa against human labels and an error list you have actually read, that the judge agrees with your experts about as well as they agree with each other.`,
    examples: [
      {
        label: `Calibrating an LLM judge against two human annotators, then routing reviews`,
        variants: [
          { tech: "node", code: `// Calibrating an LLM judge against human labels, then routing to human review.
// The "judge" is a deterministic stub: it scores the features a rubric prompt
// would look at. No model is called.

// Each case: correct = the required facts are present, cites = cites the policy,
// long = over 80 words, toneOk = polite. humanA / humanB = two annotators (1 pass, 0 fail).
const CASES = [
  // id, correct, cites, long, toneOk, humanA, humanB
  ["c01", 1, 1, 0, 1, 1, 1], ["c02", 1, 0, 0, 1, 1, 1], ["c03", 0, 1, 1, 1, 0, 0],
  ["c04", 0, 0, 1, 1, 0, 0], ["c05", 1, 1, 1, 1, 1, 1], ["c06", 0, 1, 0, 1, 0, 0],
  ["c07", 1, 1, 0, 0, 0, 0], ["c08", 0, 0, 0, 1, 0, 0], ["c09", 1, 0, 1, 1, 1, 0],
  ["c10", 0, 1, 1, 1, 0, 1], ["c11", 1, 1, 0, 1, 1, 1], ["c12", 0, 0, 1, 1, 0, 0],
  ["c13", 1, 0, 0, 0, 0, 1], ["c14", 1, 1, 1, 1, 1, 1], ["c15", 0, 1, 1, 1, 0, 0],
  ["c16", 1, 0, 0, 1, 1, 1], ["c17", 0, 0, 0, 1, 0, 0], ["c18", 1, 1, 0, 1, 1, 1],
  ["c19", 0, 1, 1, 0, 0, 0], ["c20", 1, 0, 1, 1, 1, 1],
].map(([id, correct, cites, long, toneOk, a, b]) => ({ id, correct, cites, long, toneOk, a, b }));

// Adjudicated label: where annotators disagree, a third reviewer decides (here: correct AND polite).
const gold = (c) => (c.a === c.b ? c.a : c.correct && c.toneOk ? 1 : 0);

// Judge v1: 1-5 score, rewards length (a known judge bias), pass if score >= 3.
function judgeV1(c) { const s = (c.correct ? 3 : 1) + (c.long ? 1 : 0) + (c.cites ? 1 : 0); return { score: s, pass: s >= 3 ? 1 : 0 }; }
// Judge v2: rubric says "length is not a quality signal; facts first", pass if score >= 4.
function judgeV2(c) { const s = c.correct ? (c.cites ? 5 : 4) : (c.cites ? 2 : 1); return { score: s, pass: s >= 4 ? 1 : 0 }; }

function kappa(x, y) {
  const n = x.length;
  let agree = 0, x1 = 0, y1 = 0;
  for (let i = 0; i < n; i++) { if (x[i] === y[i]) agree++; x1 += x[i]; y1 += y[i]; }
  const po = agree / n;
  const pe = (x1 / n) * (y1 / n) + (1 - x1 / n) * (1 - y1 / n);
  return { po, k: (po - pe) / (1 - pe) };
}
const f3 = (v) => v.toFixed(3);

const A = CASES.map((c) => c.a), B = CASES.map((c) => c.b), G = CASES.map(gold);
const hh = kappa(A, B);
console.log(\`human A vs human B: agreement=\${f3(hh.po)} kappa=\${f3(hh.k)} (\${CASES.length} cases)\`);
for (const [name, H] of [["human A", A], ["human B", B]]) { const r = kappa(H, G); console.log(\`\${name} vs adjudicated: agreement=\${f3(r.po)} kappa=\${f3(r.k)}\`); }

for (const [name, judge] of [["judge v1 (length bonus)", judgeV1], ["judge v2 (facts rubric)", judgeV2]]) {
  const J = CASES.map((c) => judge(c).pass);
  const r = kappa(J, G);
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (let i = 0; i < G.length; i++) {
    if (J[i] && G[i]) tp++; else if (J[i] && !G[i]) fp++; else if (!J[i] && G[i]) fn++; else tn++;
  }
  const wrong = CASES.filter((c, i) => J[i] !== G[i]).map((c) => c.id).join(",");
  console.log(\`\${name}: agreement=\${f3(r.po)} kappa=\${f3(r.k)} | judge-pass/human-fail=\${fp} judge-fail/human-pass=\${fn} | disagree on \${wrong}\`);
}

// Routing: send borderline scores and a random-looking 10% audit (every 10th id) to humans.
const ROUTE = CASES.filter((c, i) => judgeV2(c).score === 4 || i % 10 === 9).map((c) => c.id);
console.log(\`routed to human review: \${ROUTE.join(",")} (\${ROUTE.length}/\${CASES.length})\`);

// Cost of the layered setup at volume. All prices are assumptions for the arithmetic.
const DAILY = 20000, JUDGE_COST = 0.002, HUMAN_COST = 0.5;
const share = ROUTE.length / CASES.length;
const judgeDay = DAILY * JUDGE_COST, humanDay = DAILY * share * HUMAN_COST, allHuman = DAILY * HUMAN_COST;
console.log(\`per day at \${DAILY} outputs: judge $\${judgeDay.toFixed(2)} + humans $\${humanDay.toFixed(2)} = $\${(judgeDay + humanDay).toFixed(2)} vs all-human $\${allHuman.toFixed(2)}\`);` },
          { tech: "python", code: `# Calibrating an LLM judge against human labels, then routing to human review.
# The "judge" is a deterministic stub: it scores the features a rubric prompt
# would look at. No model is called.

# Each case: correct = the required facts are present, cites = cites the policy,
# long = over 80 words, tone_ok = polite. a / b = two annotators (1 pass, 0 fail).
RAW = [
    # id, correct, cites, long, tone_ok, human_a, human_b
    ("c01", 1, 1, 0, 1, 1, 1), ("c02", 1, 0, 0, 1, 1, 1), ("c03", 0, 1, 1, 1, 0, 0),
    ("c04", 0, 0, 1, 1, 0, 0), ("c05", 1, 1, 1, 1, 1, 1), ("c06", 0, 1, 0, 1, 0, 0),
    ("c07", 1, 1, 0, 0, 0, 0), ("c08", 0, 0, 0, 1, 0, 0), ("c09", 1, 0, 1, 1, 1, 0),
    ("c10", 0, 1, 1, 1, 0, 1), ("c11", 1, 1, 0, 1, 1, 1), ("c12", 0, 0, 1, 1, 0, 0),
    ("c13", 1, 0, 0, 0, 0, 1), ("c14", 1, 1, 1, 1, 1, 1), ("c15", 0, 1, 1, 1, 0, 0),
    ("c16", 1, 0, 0, 1, 1, 1), ("c17", 0, 0, 0, 1, 0, 0), ("c18", 1, 1, 0, 1, 1, 1),
    ("c19", 0, 1, 1, 0, 0, 0), ("c20", 1, 0, 1, 1, 1, 1),
]
CASES = [dict(id=r[0], correct=r[1], cites=r[2], long=r[3], tone_ok=r[4], a=r[5], b=r[6]) for r in RAW]


def gold(c):
    # Adjudicated label: where annotators disagree, a third reviewer decides (here: correct AND polite).
    if c["a"] == c["b"]:
        return c["a"]
    return 1 if c["correct"] and c["tone_ok"] else 0


def judge_v1(c):
    # 1-5 score, rewards length (a known judge bias), pass if score >= 3.
    s = (3 if c["correct"] else 1) + (1 if c["long"] else 0) + (1 if c["cites"] else 0)
    return {"score": s, "pass": 1 if s >= 3 else 0}


def judge_v2(c):
    # Rubric says "length is not a quality signal; facts first", pass if score >= 4.
    s = (5 if c["cites"] else 4) if c["correct"] else (2 if c["cites"] else 1)
    return {"score": s, "pass": 1 if s >= 4 else 0}


def kappa(x, y):
    n = len(x)
    agree = sum(1 for i in range(n) if x[i] == y[i])
    x1, y1 = sum(x), sum(y)
    po = agree / n
    pe = (x1 / n) * (y1 / n) + (1 - x1 / n) * (1 - y1 / n)
    return {"po": po, "k": (po - pe) / (1 - pe)}


def f3(v):
    return f"{v:.3f}"


A = [c["a"] for c in CASES]
B = [c["b"] for c in CASES]
G = [gold(c) for c in CASES]
hh = kappa(A, B)
print(f"human A vs human B: agreement={f3(hh['po'])} kappa={f3(hh['k'])} ({len(CASES)} cases)")
for name, H in [("human A", A), ("human B", B)]:
    r = kappa(H, G)
    print(f"{name} vs adjudicated: agreement={f3(r['po'])} kappa={f3(r['k'])}")

for name, judge in [("judge v1 (length bonus)", judge_v1), ("judge v2 (facts rubric)", judge_v2)]:
    J = [judge(c)["pass"] for c in CASES]
    r = kappa(J, G)
    tp = fp = fn = tn = 0
    for j, g in zip(J, G):
        if j and g:
            tp += 1
        elif j and not g:
            fp += 1
        elif not j and g:
            fn += 1
        else:
            tn += 1
    wrong = ",".join(c["id"] for c, j, g in zip(CASES, J, G) if j != g)
    print(f"{name}: agreement={f3(r['po'])} kappa={f3(r['k'])} | judge-pass/human-fail={fp} judge-fail/human-pass={fn} | disagree on {wrong}")

# Routing: send borderline scores and a random-looking 10% audit (every 10th id) to humans.
ROUTE = [c["id"] for i, c in enumerate(CASES) if judge_v2(c)["score"] == 4 or i % 10 == 9]
print(f"routed to human review: {','.join(ROUTE)} ({len(ROUTE)}/{len(CASES)})")

# Cost of the layered setup at volume. All prices are assumptions for the arithmetic.
DAILY, JUDGE_COST, HUMAN_COST = 20000, 0.002, 0.5
share = len(ROUTE) / len(CASES)
judge_day = DAILY * JUDGE_COST
human_day = DAILY * share * HUMAN_COST
all_human = DAILY * HUMAN_COST
print(f"per day at {DAILY} outputs: judge \${judge_day:.2f} + humans \${human_day:.2f} = \${judge_day + human_day:.2f} vs all-human \${all_human:.2f}")` },
        ],
      },
    ],
  },
  {
    title: `Evaluating RAG with Ragas: faithfulness, answer relevancy, context precision?`,
    difficulty: "medium",
    seoDescription: `What Ragas faithfulness, answer relevancy, context precision and recall measure, how each is computed, and what to fix when one drops, with a demo.`,
    description: `**Question presented to candidate:**
"Our RAG assistant answers questions from the returns policy, and we have started logging Ragas scores. Explain what faithfulness, answer relevancy, context precision and context recall actually measure, how each is computed, and what you would change in the pipeline when each one drops."

**What a strong answer should cover:**
- Faithfulness: the answer is split into claims, each claim is checked against the retrieved context, score = supported claims / total claims; it detects answers not grounded in the context, not answers that are wrong in the real world
- Answer (response) relevancy: the judge writes questions back from the answer and Ragas averages their embedding cosine similarity to the real question; it penalises off-topic, incomplete or padded answers and says nothing about correctness
- Context precision: are the relevant chunks ranked near the top, computed as the mean of precision@k at each relevant rank; context recall: how many claims of a reference answer are supported by the retrieved context, so it needs a labelled reference
- Which stage each metric points at: precision and recall diagnose the retriever and reranker, faithfulness and relevancy diagnose the generator and prompt
- Limits: every score is an LLM judge plus (for relevancy) an embedding model, so scores shift with the judge, should be validated against human labels, and are read together with claim-level verdicts; the Ragas API changed between versions (collections API in 0.4)

**Code / implementation expected:** Optional — computing the four formulas on a small example, or a Ragas scoring call.`,
    answer: `**Target Audience:** Engineers who run or are about to run Ragas on a RAG system and want to know what each number means, how it is computed, and what to fix when it moves.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (a hand-computed version of the four formulas below). Metric definitions were checked against the Ragas documentation pages for v0.2 to v0.4 via web search in October 2026; API details that only appeared in third-party guides are marked as such.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

You ask a research assistant a question. They go to the library, pull four books off the shelf, read them, and write you an answer. The answer is wrong. Whose fault is it?

Maybe they pulled the wrong books (the right one was on the shelf, they never fetched it). Maybe they fetched it but put it at the bottom of the pile and never really read it. Maybe they had the right page open and still wrote something the book does not say. Or maybe the answer is perfectly true to the books, but about a different question from the one you asked.

These four failures need four different fixes, and a single "the answer was wrong" score cannot tell them apart. **Ragas** gives you one number for each: two about the books that were fetched (**context precision** and **context recall**) and two about the answer that was written (**faithfulness** and **answer relevancy**).

## 2. The Data Each Metric Needs

📌 **Interview term: Ragas** — an open-source Python library for evaluating RAG pipelines, mostly with an LLM acting as judge. It scores individual samples and aggregates them over a dataset.

A Ragas sample has up to four fields. The names below are the ones the current docs use (older versions called them \`question\`, \`answer\`, \`contexts\` and \`ground_truth\`):

| Field | What it is | Who produces it |
| :--- | :--- | :--- |
| \`user_input\` | The user question | Your dataset |
| \`retrieved_contexts\` | The chunks the retriever returned, in rank order | Your pipeline |
| \`response\` | The generated answer | Your pipeline |
| \`reference\` | A correct answer written by a human | Your dataset (only some metrics need it) |

<svg class="iq-diagram" width="100%" viewBox="0 0 860 300" role="img" aria-label="The four Ragas metrics connect the question, the retrieved contexts, the response and the reference">
  <rect class="d-box" x="40" y="40" width="200" height="60" rx="10"/>
  <text class="d-text" x="140" y="76" text-anchor="middle">user_input</text>
  <rect class="d-box" x="620" y="40" width="200" height="60" rx="10"/>
  <text class="d-text" x="720" y="76" text-anchor="middle">response</text>
  <rect class="d-box" x="40" y="200" width="200" height="60" rx="10"/>
  <text class="d-text" x="140" y="236" text-anchor="middle">reference</text>
  <rect class="d-box" x="620" y="200" width="200" height="60" rx="10"/>
  <text class="d-text" x="720" y="236" text-anchor="middle">retrieved_contexts</text>
  <path class="d-edge-accent" d="M 244 70 L 616 70"/>
  <text class="d-accent" x="430" y="56" text-anchor="middle">answer relevancy</text>
  <path class="d-edge-accent" d="M 720 104 L 720 196"/>
  <text class="d-accent" x="735" y="155">faithfulness</text>
  <path class="d-edge" d="M 244 230 L 616 230"/>
  <text class="d-sub" x="430" y="216" text-anchor="middle">context recall</text>
  <path class="d-edge-dashed" d="M 244 90 L 616 215"/>
  <text class="d-sub" x="300" y="175" text-anchor="middle">context precision</text>
</svg>

The two metrics on the response side (accent) judge the generator; the two on the context side judge the retriever. Context precision is drawn from the question to the contexts; the reference-based variant also uses the reference to decide which chunks count as relevant.

## 3. Faithfulness: Is Every Claim Backed by the Context?

📌 **Interview term: faithfulness** — the share of claims in the response that can be inferred from the retrieved contexts:

> faithfulness = (claims in the response supported by the retrieved context) / (total claims in the response)

The judge LLM does two jobs (Ragas docs, "Faithfulness"): it breaks the response into standalone claims, then decides for each claim whether the context supports it. Score range 0 to 1.

What it catches: the generator **adding things** the context does not say. That is the RAG version of hallucination ([What are hallucinations and what causes them?](/interview-question/what-are-hallucinations-and-what-causes-them)).

What it does **not** catch: an answer that faithfully repeats a wrong or irrelevant chunk. If the retriever returned last year's policy and the model quoted it exactly, faithfulness is 1.0. It is grounding, not truth.

📌 **Interview term: claim decomposition** — splitting an answer into short, independently checkable statements before verifying each. It is why faithfulness can say "3 of 4 claims supported" instead of a vague overall grade, and the claim list is what you should read when the score drops.

## 4. Answer Relevancy: Does the Answer Address the Question?

📌 **Interview term: answer relevancy (response relevancy)** — how well the response addresses the user input, measured backwards: the judge LLM generates several questions that the response would be a good answer to (3 by default in the Ragas docs), each is embedded, and the score is the mean cosine similarity between those generated questions and the real question.

Why backwards? If the answer is on point, the questions you could reconstruct from it look like the original. If it wanders off ("here is our shipping policy"), the reconstructed questions are about shipping.

Three things to know:

- It **does not check facts**. A confident, on-topic, wrong answer scores well.
- The Ragas docs say incomplete answers and answers with **redundant information** get lower scores, so padding is penalised.
- The score depends on the embedding model as well as the judge. Cosine similarity can in principle be negative, so the docs note that the range is not strictly 0 to 1. A 2024 study of Ragas on telecom question answering (arXiv 2407.12873) criticised the metric for this dependence on the chosen models.

(Cosine similarity itself is explained in [How does similarity search work — cosine, dot product and Euclidean?](/interview-question/how-does-similarity-search-work-cosine-dot-product-and-euclidean))

## 5. Context Precision: Are the Relevant Chunks at the Top?

📌 **Interview term: context precision@K** — a rank-aware score for the retrieved list. Each chunk at rank k gets a relevance flag v_k (1 relevant, 0 not), and:

> context precision@K = Σ (precision@k × v_k) / (number of relevant chunks in the top K)
> where precision@k = relevant chunks in the top k / k

In words: at every rank where a relevant chunk appears, measure what share of the list so far is relevant, then average those values. Relevant chunks at ranks 1 and 2 give (1/1 + 2/2) / 2 = 1.0. The same two chunks at ranks 3 and 4 give (1/3 + 2/4) / 2 = 0.417. Same chunks, worse order, much lower score.

Why rank matters: models pay more attention to some positions than others, a reranker or a smaller top-k may later cut the list, and irrelevant chunks at the top are noise the generator must ignore. Relevance is decided by the judge LLM, either against the reference answer or, in the reference-free variant, against the response; Ragas also documents non-LLM variants that compare chunks to labelled reference contexts with string similarity.

## 6. Context Recall: Did Retrieval Find Everything Needed?

📌 **Interview term: context recall** — the share of claims in the reference answer that the retrieved contexts support:

> context recall = (reference claims supported by the retrieved context) / (total reference claims)

It is the only one of the four that **needs a human-written reference**, because "everything needed" has to be defined by someone who knows the right answer. Older Ragas docs phrase it in terms of reference sentences; the current docs use claims.

Low recall means the information never reached the model. No prompt change can fix that; the fix is in chunking, query rewriting, hybrid search or a bigger top-k ([What are common RAG failure modes and how do you debug them?](/interview-question/what-are-common-rag-failure-modes-and-how-do-you-debug-them)).

## 7. Verified: Running the Code

Calling Ragas needs a judge model and an API key, so the example **"The four Ragas formulas by hand: faithfulness, answer relevancy, context precision, context recall"** implements the formulas directly. Where Ragas would ask an LLM to split claims, judge support or write questions back, a deterministic stub stands in: a claim is "supported" when every content word in it appears in the text, sentences are claims, and the back-generated questions are written into each scenario. Embeddings are word-count vectors. The numbers therefore show how the formulas react, not what Ragas would print for these strings. The precision formula, as in the docs:

~~~js
function contextPrecision(ctx) {
  const refClaims = claims(REFERENCE);
  const v = ctx.map((id) => (refClaims.some((c) => supportedBy(c, CHUNKS[id])) ? 1 : 0));
  let hits = 0, sum = 0;
  v.forEach((rel, i) => { if (rel) { hits++; sum += hits / (i + 1); } }); // precision@k at each relevant rank
  return { score: hits ? sum / hits : 0, v: v.join("") };
}
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
question: How many days do I have to return a laptop?
scenario                 faithful  ans_rel  ctx_prec  ctx_recall  relevance-by-rank
1 good                      1.000    0.718     1.000       1.000  110
2 relevant ranked low       1.000    0.718     0.417       1.000  0011
3 hallucinated claim        0.500    0.665     1.000       1.000  110
4 fee chunk missing         1.000    0.761     1.000       0.500  100
5 off-topic answer          1.000    0.167     1.000       1.000  110
  scenario 3 claim "Laptops can be returned within 14 days" -> supported
  scenario 3 claim "Return shipping is always free" -> NOT supported
~~~

Each scenario breaks one thing and only the matching metric moves:

- **2, relevant ranked low:** the same chunks, with two irrelevant ones above them. Context precision falls from 1.000 to 0.417; nothing else changes, because the answer and the overall content are the same. This is a ranking problem: add or fix a reranker.
- **3, hallucinated claim:** "Return shipping is always free" is in no chunk. Faithfulness halves to 0.500, and the claim-level lines name the unsupported claim. Context metrics stay perfect: retrieval did its job.
- **4, fee chunk missing:** the restocking-fee chunk was not retrieved. Context recall drops to 0.500. Faithfulness is still 1.000 because the answer only says what it was given, and answer relevancy actually rises (0.761), because the shorter answer matches the narrow question more closely. A complete answer can look *less* relevant than a partial one.
- **5, off-topic answer:** the model answered with the shipping chunk. Relevancy collapses to 0.167, yet **faithfulness is 1.000**: every word of it is in the context. This is the clearest demonstration that faithfulness measures grounding, not usefulness.

## 8. When a Metric Drops, Where to Look

| Metric low | Stage at fault | Typical fixes |
| :--- | :--- | :--- |
| Context recall | Retrieval misses information | Chunking, hybrid search, query rewriting, larger top-k, missing documents in the index |
| Context precision | Ranking or noise | Reranker, lower top-k, metadata filters |
| Faithfulness | Generator adds unsupported claims | Stricter grounding instructions, "say you do not know", citations, fewer distracting chunks |
| Answer relevancy | Generator misses the question or pads | Prompt for direct answers, query understanding, remove boilerplate |

Read the metrics together. High recall with low faithfulness is a generator problem; low recall with "low faithfulness" may just be the model filling a gap the retriever left. How these fit into a full pipeline evaluation, with labelled retrieval metrics and failure attribution, is the subject of [How do you evaluate a RAG pipeline end to end?](/interview-question/how-do-you-evaluate-a-rag-pipeline-end-to-end)

## 9. What the Ragas Code Looks Like

The Ragas API has changed several times. Third-party guides from 2026 describe the 0.4 line as moving metrics to a \`ragas.metrics.collections\` module, with an LLM wrapper built by \`llm_factory\` from an async client and per-sample scoring through \`score\` or \`ascore\`, returning an object with \`.value\` and \`.reason\`; one comparison lists 0.4.3 (January 2026) as the newest release. I could not read the official 0.4 pages directly, so treat this as the shape, not a copy-paste recipe:

~~~python
# Not run here: needs an API key. Shape as described for Ragas 0.4 (collections API), October 2026.
import asyncio
from openai import AsyncOpenAI
from ragas.llms import llm_factory
from ragas.metrics.collections import Faithfulness

async def main():
    judge = llm_factory("<judge-model>", client=AsyncOpenAI())
    faithfulness = Faithfulness(llm=judge)
    result = await faithfulness.ascore(
        user_input="How many days do I have to return a laptop?",
        response="Laptops can be returned within 14 days. Return shipping is always free.",
        retrieved_contexts=["Laptops can be returned within 14 days of delivery."],
    )
    print(result.value, result.reason)

asyncio.run(main())
~~~

Older code (0.1 to 0.3) builds a \`SingleTurnSample\` or a dataset and calls \`evaluate(...)\` with a list of metrics; those guides describe that style as legacy in 0.4. Pin the Ragas version in your eval environment: a library upgrade can change the judge prompts, and therefore the scores, with no change to your system.

## Edge Cases Worth Knowing

- **Empty or unparseable judge output.** A third-party guide reports that Ragas 0.4.3 faithfulness returns NaN when the judge extracts no statements; an aggregate that silently drops NaNs then averages over fewer samples. Count and report missing scores.
- **Refusals and "I do not know".** A refusal has no factual claims, so faithfulness may be undefined, and relevancy can be low for a *correct* refusal. Track unanswerable questions as their own slice.
- **Long answers with many trivial claims.** Many easy claims can dilute one serious unsupported claim. Read the claim list for low-scoring samples, and consider a separate "any unsupported claim" pass/fail.
- **Judge model changes.** Every metric here is judge-dependent. Switching the judge model or upgrading Ragas is a re-baseline, not a comparison.
- **The reference can be wrong.** Context recall trusts the reference answer; stale references make good retrieval look bad.

## Common Pitfalls

- **Treating faithfulness as correctness.** It checks the answer against the retrieved text. Wrong context, faithfully repeated, scores 1.0.
- **Averaging four metrics into one "RAG score".** The whole point is that they diagnose different stages; a blended number hides which stage broke.
- **Running context recall without real references.** It needs a human-written reference; synthetic references from the same model can be as wrong as the pipeline.
- **Never checking the judge against humans.** Label a sample by hand and measure agreement before gating releases on a Ragas threshold.
- **Comparing scores across Ragas versions or judge models.** Pin both; re-baseline when either changes.
- **Ignoring rank.** Teams track recall only and miss that the relevant chunk slid from rank 1 to rank 6, which context precision would have shown.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Say what Ragas is:</strong> <span style="color:#f0e2c8;">Ragas scores a RAG sample with an LLM judge using four fields: the question, the retrieved contexts, the response and, for some metrics, a human reference answer. Two metrics judge the retriever, two judge the generator.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Faithfulness:</strong> <span style="color:#f0e2c8;">The judge splits the response into claims and checks each against the retrieved context: <strong style="color:#ffca28;">supported claims / total claims</strong>. It measures grounding, not truth: in my demo an off-topic answer copied from a retrieved shipping chunk scored 1.0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Answer relevancy:</strong> <span style="color:#f0e2c8;">The judge writes several questions back from the answer, and Ragas averages their embedding cosine similarity to the real question. It penalises off-topic and padded answers, and says nothing about facts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Context precision and recall:</strong> <span style="color:#f0e2c8;">Precision is rank-aware: the mean of precision@k at each relevant rank, so the same relevant chunks at ranks 3 and 4 drop it from 1.0 to 0.417. Recall is reference claims supported by the context, and it is the one that needs a human-written reference.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Use them as a diagnosis:</strong> <span style="color:#f0e2c8;">Low recall: fix chunking, search or top-k. Low precision: add a reranker. Low faithfulness with good recall: fix the prompt or model. I pin the judge model and Ragas version, and check the scores against human labels before gating on them.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Faithfulness is 0.95 but users say answers are wrong. How?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Faithfulness only compares the answer with the retrieved text. If retrieval returns stale or wrong documents, a faithful answer is faithfully wrong. I would check <strong style="color:#ffca28;">context recall</strong> against references and look at which documents were retrieved.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which metrics need labelled data?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Context recall needs a human reference answer. Faithfulness and answer relevancy are reference-free. Context precision has variants that use a reference, use the response instead, or compare against labelled reference contexts without an LLM.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is answer relevancy computed by generating questions?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because comparing a question with its answer directly is hard: they are different kinds of text. Turning the answer back into questions makes both sides questions, so cosine similarity of embeddings is meaningful. The cost is a dependence on both the judge and the embedding model.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you trust Ragas scores across versions?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not blindly. The metrics are judge prompts, and the library API and prompts have changed between versions; third-party guides describe 0.4 moving to a collections API. I pin the Ragas version and judge model, and re-baseline when either changes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you do with a low context precision but good recall?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The right chunks are retrieved but buried under irrelevant ones. Add or tune a <strong style="color:#ffca28;">reranker</strong>, reduce top-k, or add metadata filters, then confirm precision rises without recall falling.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Ragas | Open-source library of mostly LLM-judged metrics for RAG pipelines |
| Faithfulness | Supported claims in the response / all claims in the response |
| Claim decomposition | Splitting an answer into short checkable statements |
| Answer relevancy (response relevancy) | Mean cosine similarity between the question and questions generated back from the answer |
| Context precision@K | Mean of precision@k over the ranks where relevant chunks appear |
| Context recall | Reference claims supported by the retrieved contexts / all reference claims |

**Conclusion:** Ragas splits a RAG answer into four questions: did retrieval find what was needed (context recall), did it put it at the top (context precision), does the answer stay inside the retrieved text (faithfulness), and does it address what was asked (answer relevancy). Each is a simple formula over judgements an LLM makes, which is both the strength (no labels needed for three of them) and the limit (every score depends on the judge and should be checked against human labels). Used as a set, with the claim-level verdicts read for low scores, they tell you which stage to fix; averaged into one number, they tell you almost nothing.`,
    examples: [
      {
        label: `The four Ragas formulas by hand: faithfulness, answer relevancy, context precision, context recall`,
        variants: [
          { tech: "node", code: `// The four core Ragas formulas, computed by hand. Where Ragas would ask an LLM
// (split into claims, judge support, write questions back from the answer) a
// deterministic stub does it: "supported" means every content word appears in the text.
const STOP = new Set("a an the is are be can do i to of in on for and or with within have has it you your my this that how what".split(" "));
const stem = (w) => (w.length > 4 && w.endsWith("ed") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);
const words = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\\s+/).filter((w) => w && !STOP.has(w)).map(stem);
const claims = (s) => s.split(". ").map((x) => x.replace(/\\.$/, "")).filter(Boolean);
const supportedBy = (claim, text) => { const t = new Set(words(text)); return words(claim).every((w) => t.has(w)); };

const CHUNKS = {
  R: "Laptops can be returned within 14 days of delivery.",
  F: "Opened laptops carry a 15 percent restocking fee.",
  S: "Standard shipping takes 3 to 5 business days.",
  W: "Every laptop includes a one year limited warranty.",
};
const QUESTION = "How many days do I have to return a laptop?";
const REFERENCE = "Laptops can be returned within 14 days. Opened laptops carry a 15 percent restocking fee.";

// Each scenario: retrieved chunk ids in rank order, the answer, and the questions
// the judge would generate back from that answer (for answer relevancy).
const SCENARIOS = [
  { name: "1 good", ctx: ["R", "F", "S"], answer: "Laptops can be returned within 14 days. Opened laptops carry a 15 percent restocking fee.",
    gen: ["How many days to return a laptop?", "Is there a fee to return an opened laptop?", "Can laptops be returned?"] },
  { name: "2 relevant ranked low", ctx: ["S", "W", "R", "F"], answer: "Laptops can be returned within 14 days. Opened laptops carry a 15 percent restocking fee.",
    gen: ["How many days to return a laptop?", "Is there a fee to return an opened laptop?", "Can laptops be returned?"] },
  { name: "3 hallucinated claim", ctx: ["R", "F", "S"], answer: "Laptops can be returned within 14 days. Return shipping is always free.",
    gen: ["How many days to return a laptop?", "Is return shipping free?", "Can laptops be returned?"] },
  { name: "4 fee chunk missing", ctx: ["R", "S", "W"], answer: "Laptops can be returned within 14 days.",
    gen: ["How many days to return a laptop?", "Can laptops be returned?", "What is the laptop return window?"] },
  { name: "5 off-topic answer", ctx: ["R", "F", "S"], answer: "Standard shipping takes 3 to 5 business days.",
    gen: ["How long does standard shipping take?", "How many business days is shipping?", "What is the shipping time?"] },
];

function faithfulness(answer, ctx) {
  const text = ctx.map((id) => CHUNKS[id]).join(" ");
  const cs = claims(answer);
  return cs.filter((c) => supportedBy(c, text)).length / cs.length;
}
function vec(s) { const m = new Map(); for (const w of words(s)) m.set(w, (m.get(w) || 0) + 1); return m; }
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const [w, x] of a) { na += x * x; if (b.has(w)) dot += x * b.get(w); }
  for (const [, y] of b) nb += y * y;
  return dot / Math.sqrt(na * nb);
}
function answerRelevancy(gen) { const q = vec(QUESTION); return gen.reduce((s, g) => s + cosine(vec(g), q), 0) / gen.length; }
// Context precision@K = sum over k of (precision@k * v_k) / (relevant items in top K).
function contextPrecision(ctx) {
  const refClaims = claims(REFERENCE);
  const v = ctx.map((id) => (refClaims.some((c) => supportedBy(c, CHUNKS[id])) ? 1 : 0));
  let hits = 0, sum = 0;
  v.forEach((rel, i) => { if (rel) { hits++; sum += hits / (i + 1); } });
  return { score: hits ? sum / hits : 0, v: v.join("") };
}
// Context recall = reference claims supported by the retrieved context / all reference claims.
function contextRecall(ctx) {
  const text = ctx.map((id) => CHUNKS[id]).join(" ");
  const rc = claims(REFERENCE);
  return rc.filter((c) => supportedBy(c, text)).length / rc.length;
}

const f = (x) => x.toFixed(3);
console.log(\`question: \${QUESTION}\`);
console.log("scenario                 faithful  ans_rel  ctx_prec  ctx_recall  relevance-by-rank");
for (const s of SCENARIOS) {
  const cp = contextPrecision(s.ctx);
  console.log(\`\${s.name.padEnd(24)} \${f(faithfulness(s.answer, s.ctx)).padStart(8)} \${f(answerRelevancy(s.gen)).padStart(8)} \${f(cp.score).padStart(9)} \${f(contextRecall(s.ctx)).padStart(11)}  \${cp.v}\`);
}
// Show the claim-level verdicts for the hallucination case, which is what to read when the number drops.
const s3 = SCENARIOS[2], text3 = s3.ctx.map((id) => CHUNKS[id]).join(" ");
for (const c of claims(s3.answer)) console.log(\`  scenario 3 claim "\${c}" -> \${supportedBy(c, text3) ? "supported" : "NOT supported"}\`);` },
          { tech: "python", code: `# The four core Ragas formulas, computed by hand. Where Ragas would ask an LLM
# (split into claims, judge support, write questions back from the answer) a
# deterministic stub does it: "supported" means every content word appears in the text.
import math
import re

STOP = set("a an the is are be can do i to of in on for and or with within have has it you your my this that how what".split(" "))


def stem(w):
    if len(w) > 4 and w.endswith("ed"):
        return w[:-2]
    if len(w) > 3 and w.endswith("s"):
        return w[:-1]
    return w


def words(s):
    return [stem(w) for w in re.sub(r"[^a-z0-9 ]", " ", s.lower()).split() if w not in STOP]


def claims(s):
    return [x[:-1] if x.endswith(".") else x for x in s.split(". ") if x]


def supported_by(claim, text):
    t = set(words(text))
    return all(w in t for w in words(claim))


CHUNKS = {
    "R": "Laptops can be returned within 14 days of delivery.",
    "F": "Opened laptops carry a 15 percent restocking fee.",
    "S": "Standard shipping takes 3 to 5 business days.",
    "W": "Every laptop includes a one year limited warranty.",
}
QUESTION = "How many days do I have to return a laptop?"
REFERENCE = "Laptops can be returned within 14 days. Opened laptops carry a 15 percent restocking fee."

# Each scenario: retrieved chunk ids in rank order, the answer, and the questions
# the judge would generate back from that answer (for answer relevancy).
FULL = "Laptops can be returned within 14 days. Opened laptops carry a 15 percent restocking fee."
GEN_FULL = ["How many days to return a laptop?", "Is there a fee to return an opened laptop?", "Can laptops be returned?"]
SCENARIOS = [
    {"name": "1 good", "ctx": ["R", "F", "S"], "answer": FULL, "gen": GEN_FULL},
    {"name": "2 relevant ranked low", "ctx": ["S", "W", "R", "F"], "answer": FULL, "gen": GEN_FULL},
    {"name": "3 hallucinated claim", "ctx": ["R", "F", "S"], "answer": "Laptops can be returned within 14 days. Return shipping is always free.",
     "gen": ["How many days to return a laptop?", "Is return shipping free?", "Can laptops be returned?"]},
    {"name": "4 fee chunk missing", "ctx": ["R", "S", "W"], "answer": "Laptops can be returned within 14 days.",
     "gen": ["How many days to return a laptop?", "Can laptops be returned?", "What is the laptop return window?"]},
    {"name": "5 off-topic answer", "ctx": ["R", "F", "S"], "answer": "Standard shipping takes 3 to 5 business days.",
     "gen": ["How long does standard shipping take?", "How many business days is shipping?", "What is the shipping time?"]},
]


def joined(ctx):
    return " ".join(CHUNKS[i] for i in ctx)


def faithfulness(answer, ctx):
    text = joined(ctx)
    cs = claims(answer)
    return sum(1 for c in cs if supported_by(c, text)) / len(cs)


def vec(s):
    m = {}
    for w in words(s):
        m[w] = m.get(w, 0) + 1
    return m


def cosine(a, b):
    dot = na = nb = 0
    for w, x in a.items():
        na += x * x
        if w in b:
            dot += x * b[w]
    for y in b.values():
        nb += y * y
    return dot / math.sqrt(na * nb)


def answer_relevancy(gen):
    q = vec(QUESTION)
    s = 0
    for g in gen:
        s += cosine(vec(g), q)
    return s / len(gen)


def context_precision(ctx):
    # Context precision@K = sum over k of (precision@k * v_k) / (relevant items in top K).
    ref = claims(REFERENCE)
    v = [1 if any(supported_by(c, CHUNKS[i]) for c in ref) else 0 for i in ctx]
    hits, total = 0, 0
    for k, rel in enumerate(v):
        if rel:
            hits += 1
            total += hits / (k + 1)
    return {"score": total / hits if hits else 0, "v": "".join(str(x) for x in v)}


def context_recall(ctx):
    # Context recall = reference claims supported by the retrieved context / all reference claims.
    text = joined(ctx)
    rc = claims(REFERENCE)
    return sum(1 for c in rc if supported_by(c, text)) / len(rc)


def f(x):
    return f"{x:.3f}"


print(f"question: {QUESTION}")
print("scenario                 faithful  ans_rel  ctx_prec  ctx_recall  relevance-by-rank")
for s in SCENARIOS:
    cp = context_precision(s["ctx"])
    print(f"{s['name']:<24} {f(faithfulness(s['answer'], s['ctx'])):>8} {f(answer_relevancy(s['gen'])):>8} {f(cp['score']):>9} {f(context_recall(s['ctx'])):>11}  {cp['v']}")
# Show the claim-level verdicts for the hallucination case, which is what to read when the number drops.
s3 = SCENARIOS[2]
text3 = joined(s3["ctx"])
for c in claims(s3["answer"]):
    print(f"  scenario 3 claim \\"{c}\\" -> {'supported' if supported_by(c, text3) else 'NOT supported'}")` },
        ],
      },
    ],
  },
  {
    title: `How do you evaluate a RAG pipeline end to end?`,
    difficulty: "hard",
    seoDescription: `Evaluate RAG at three levels: retrieval with recall@k and MRR, generation with oracle context, the full pipeline, then attribute each failure to a stage.`,
    description: `**Question presented to candidate:**
"We have a RAG assistant over our internal handbook and an end-to-end accuracy of about 64% on our test questions. Leadership wants it higher, but nobody can say whether the retriever or the model is the problem. Design the evaluation you would build for this pipeline, end to end."

**What a strong answer should cover:**
- Evaluate stages separately as well as end to end: a labelled retrieval set scored with recall@k, MRR or nDCG; the generator scored with the correct context supplied (oracle context); then the full pipeline against reference answers
- A golden set with evidence labels (which passage answers each question), slices by topic and difficulty, and deliberately unanswerable questions to test abstention
- Failure attribution per question: retrieval miss, right chunk retrieved but wrong one used, over-abstention, answering the unanswerable; the counts tell you which stage to invest in
- Generation-side scoring: answer correctness against a reference, faithfulness to the retrieved context, citation correctness, using code checks where possible and a calibrated LLM judge where not
- Operational metrics alongside quality (latency, tokens and cost per query), CI gating on every chunking, embedding, prompt or model change, and online signals after release

**Clarifying questions expected:**
- How big and how fast-changing is the corpus, and is there a per-user permission model on documents?
- Do we have real user questions to build the test set from, and who can label the correct evidence?
- What does a wrong answer cost compared with "I could not find that"?

**Code / implementation expected:** Optional — a small harness that computes stage metrics and attributes each failure to a stage.`,
    answer: `**Target Audience:** Engineers responsible for a RAG system in production who need an evaluation that says *where* it fails, not only how often, and candidates facing a design-style evaluation question.
**Difficulty:** Hard
**Verified with:** Node 22.22.0 and Python 3.12.3 (the stage-by-stage harness below). Framework descriptions (TruLens RAG triad, Ragas) were checked against their docs via web search in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A pizza delivery company gets complaints: 36% of pizzas arrive wrong. The manager's first instinct is to retrain the drivers. But a wrong pizza can come from three places: the order taker wrote it down wrong, the kitchen made the wrong pizza from a correct ticket, or the driver delivered the right pizza to the wrong house. Retraining drivers fixes only one of them.

The sensible manager checks each station on its own. Are tickets correct? Given a correct ticket, does the kitchen make the right pizza? Given the right pizza, does it reach the right door? Only after that does the overall 36% become actionable.

A RAG pipeline is the same: a **retriever** (the order taker, finding the right documents) and a **generator** (the kitchen, writing an answer from them). An end-to-end accuracy number tells you *that* something is wrong. Evaluating each stage, and attributing every failure to one, tells you *what to fix*.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How large is the corpus and how often does it change? | Frequent changes mean the test set must be tied to an index version, and labels must survive re-chunking |
| Are there per-user permissions on documents? | Retrieval must be evaluated per tenant or role; a correct answer from a forbidden document is a failure ([How do you scope retrieval with metadata filtering and multi-tenancy?](/interview-question/how-do-you-scope-retrieval-with-metadata-filtering-and-multi-tenancy)) |
| Do we have real user questions? | Real questions beat invented ones; they decide the test set's mix of easy, hard and unanswerable |
| Who can label the right evidence? | Retrieval metrics need someone to say which passage answers each question |
| What is worse: a wrong answer or "not found"? | Sets how much to weight abstention, and the threshold for answering at all |
| What latency and cost budget per query? | Quality changes such as larger top-k or a reranker have a price that belongs in the same report |

## 3. The Three Levels of Evaluation

<svg class="iq-diagram" width="100%" viewBox="0 0 860 270" role="img" aria-label="Three evaluation levels: retrieval scored against labelled evidence, generation scored with oracle context, and the full pipeline scored against reference answers">
  <defs>
    <marker id="ai16q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="100" y="80" text-anchor="middle">question</text>
  <rect class="d-box-accent" x="250" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="330" y="80" text-anchor="middle">retriever</text>
  <rect class="d-box-accent" x="480" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="560" y="80" text-anchor="middle">generator</text>
  <rect class="d-box" x="710" y="40" width="130" height="70" rx="10"/>
  <text class="d-text" x="775" y="80" text-anchor="middle">answer</text>
  <path class="d-edge" d="M 184 75 L 244 75" marker-end="url(#ai16q3-arrow)"/>
  <path class="d-edge" d="M 414 75 L 474 75" marker-end="url(#ai16q3-arrow)"/>
  <path class="d-edge" d="M 644 75 L 704 75" marker-end="url(#ai16q3-arrow)"/>
  <rect class="d-box-muted" x="250" y="170" width="160" height="70" rx="10"/>
  <text class="d-text" x="330" y="200" text-anchor="middle">level 1</text>
  <text class="d-sub" x="330" y="222" text-anchor="middle">recall@k, MRR</text>
  <rect class="d-box-muted" x="480" y="170" width="160" height="70" rx="10"/>
  <text class="d-text" x="560" y="200" text-anchor="middle">level 2</text>
  <text class="d-sub" x="560" y="222" text-anchor="middle">oracle context</text>
  <rect class="d-box-muted" x="680" y="170" width="160" height="70" rx="10"/>
  <text class="d-text" x="760" y="200" text-anchor="middle">level 3</text>
  <text class="d-sub" x="760" y="222" text-anchor="middle">end to end</text>
  <path class="d-edge-dashed" d="M 330 114 L 330 166"/>
  <path class="d-edge-dashed" d="M 560 114 L 560 166"/>
  <path class="d-edge-dashed" d="M 775 114 L 775 166"/>
</svg>

Level 1 scores the retriever alone, level 2 scores the generator alone by handing it the correct evidence, and level 3 scores what the user actually gets. Comparing the three is what localises a failure.

### Level 1: retrieval against labelled evidence

For each test question, a person marks which passage (or passages) contains the answer. Then score the retriever's ranked list:

📌 **Interview term: recall@k** — the share of questions for which a correct passage appears in the top k results. If the generator only sees the top 3, recall@3 is the ceiling on the whole system: the model cannot use evidence it never receives.

📌 **Interview term: MRR (mean reciprocal rank)** — the average of 1 / (rank of the first correct passage), counting 0 when it is missing. Rewards finding the evidence early: rank 1 scores 1, rank 2 scores 0.5.

📌 **Interview term: nDCG (normalised discounted cumulative gain)** — a ranking score that supports graded relevance (highly relevant, partly relevant) and discounts results by log of their position, normalised so that a perfect ranking scores 1. Use it when several passages are relevant to different degrees.

These metrics are deterministic and cheap: no LLM is involved, so they can run on every chunking, embedding, hybrid-search or reranker change. The retrieval techniques themselves are covered in [Hybrid search: why combine BM25 with vectors and how does RRF work?](/interview-question/hybrid-search-why-combine-bm25-with-vectors-and-how-does-rrf-work) and [Reranking in RAG: when and how to add a cross-encoder?](/interview-question/reranking-in-rag-when-and-how-to-add-a-cross-encoder)

**A practical detail interviewers like:** label the *evidence text* (or a document plus a character span), not a chunk ID. When you change the chunk size, chunk IDs change and an ID-based test set silently breaks; a span can be mapped to whichever new chunk contains it.

### Level 2: generation with oracle context

📌 **Interview term: oracle context** — feeding the generator the known-correct evidence instead of whatever the retriever returned. It answers "if retrieval were perfect, would the model get it right?" and isolates prompt and model problems from retrieval problems.

Score the generator's answer against a reference: exact or normalised match for short facts, a rubric LLM judge for longer answers, plus **faithfulness** (does the answer stay within the given text) and **citation correctness** (does each cited passage actually support the sentence it is attached to). Ragas packages LLM-judged versions of faithfulness and relevancy; the formulas are in the sibling question [Evaluating RAG with Ragas: faithfulness, answer relevancy, context precision?](/interview-question/evaluating-rag-with-ragas-faithfulness-answer-relevancy-context-precision)

### Level 3: the full pipeline

Run the real pipeline and score what the user receives. This is the number leadership asks for, but on its own it cannot say which stage failed. The TruLens project describes the same idea as a "RAG triad" of LLM-judged checks: **context relevance** (retriever), **groundedness** (generator against context) and **answer relevance** (answer against question) (TruLens docs, checked October 2026).

### The slice everyone forgets: unanswerable questions

📌 **Interview term: abstention (unanswerable slice)** — questions whose answer is deliberately not in the corpus, included to test whether the system says "I could not find that" instead of inventing an answer from the closest-looking passage. A pipeline that never abstains can score well on answerable questions and still be dangerous.

## 4. Failure Attribution

📌 **Interview term: failure attribution** — labelling every failed test question with the stage that caused it, by comparing the level 1, 2 and 3 results for that question. The counts per category are the work plan.

| Category | Evidence | What to fix |
| :--- | :--- | :--- |
| Retrieval miss | Correct passage not in top k | Chunking, hybrid search, query rewriting, larger k, missing documents |
| Wrong chunk used | Correct passage retrieved, answer drawn from another one | Reranking, prompt that asks the model to compare sources, fewer distractors |
| Over-abstain | Correct passage retrieved, model said "not found" | Prompt or threshold too strict, passage too terse to recognise |
| Answered the unanswerable | No correct passage exists, model answered anyway | Abstention instruction, answerability threshold, grounding checks |
| Generation error with oracle context | Fails even with perfect evidence | Prompt, model choice, output format |

## 5. Verified: Running the Code

The example **"End-to-end RAG eval harness: stage metrics plus failure attribution"** has an 8-passage handbook and 11 questions, two of them unanswerable. The retriever ranks passages by shared words (a stand-in for BM25 or embeddings); the generator is a deterministic stub that answers from the first retrieved passage sharing at least two words with the question, and otherwise says "not found". The harness runs all three levels and labels each question. The attribution logic:

~~~js
let label;
if (!q.gold) label = ans ? "answered unanswerable" : "correct abstain";
else if (ans === q.gold) label = "correct";
else if (rank === 0) label = "retrieval miss";
else if (ans === null) label = "over-abstain (gold retrieved)";
else label = "wrong chunk used (gold retrieved)";
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
q01 top3=[d1,d2,d6] gold=d1 answer=d1 -> correct
q02 top3=[d2,d1,d8] gold=d2 answer=d2 -> correct
q03 top3=[d3,d4] gold=d3 answer=d3 -> correct
q04 top3=[d4,d1,d2] gold=d4 answer=d4 -> correct
q05 top3=[d5] gold=d5 answer=d5 -> correct
q06 top3=[d6,d1,d2] gold=d6 answer=d6 -> correct
q07 top3=[] gold=d7 answer=not found -> retrieval miss
q08 top3=[d8] gold=d8 answer=not found -> over-abstain (gold retrieved)
q09 top3=[d1,d2,d4] gold=d2 answer=d1 -> wrong chunk used (gold retrieved)
q10 top3=[d1,d2,d4] gold=- answer=d1 -> answered unanswerable
q11 top3=[] gold=- answer=not found -> correct abstain
retrieval (9 answerable): recall@1=0.778 recall@3=0.889 MRR@3=0.833
generation with oracle context: 7/9 = 0.778
end to end (11 queries incl. unanswerable): 7/11 = 0.636
failure attribution:
  answered unanswerable              1
  correct                            6
  correct abstain                    1
  over-abstain (gold retrieved)      1
  retrieval miss                     1
  wrong chunk used (gold retrieved)  1
~~~

What the run says, and why one number would have hidden it:

- **End to end is 63.6%** (7 of 11), but the four failures have **four different causes**. Retraining or re-prompting the model would have fixed at most two of them.
- **q07 is a vocabulary gap.** "Deadline to submit receipts" shares no word with "Expense reports must be filed within 30 days". recall@3 catches it (0.889, not 1.0). A word-overlap retriever cannot fix this; embeddings or hybrid search can.
- **q09 is a ranking problem.** The right passage (d2, carry-over rules) *was* retrieved, at rank 2; the generator used d1 at rank 1, which ties on shared words. With oracle context the generator gets q09 right, which proves the generator is not the culprit. A reranker is.
- **q08 is a generator problem.** The right passage is retrieved at rank 1 and the generator still abstains, and also abstains with oracle context. Oracle accuracy (7/9 = 0.778) below 1.0 means some failures survive perfect retrieval.
- **q10 is the dangerous one.** "How many sick days per year do employees get?" has no answer in the handbook, and the system confidently answered from the vacation passage ("20 days"). Only the unanswerable slice reveals it; it does not appear in any retrieval metric.

The simulation leaves out what a real harness adds: an LLM judge for free-text answers, several runs per question to handle nondeterminism, latency and cost per query, and real-sized sets (hundreds of questions, so that a one-question change is not a 9-point swing).

## 6. Beyond Accuracy: The Rest of the Report

A RAG change can improve quality and still be a regression, so the eval report carries:

| Metric | Why it belongs in the same report |
| :--- | :--- |
| p50 and p95 latency per query | A reranker or larger k adds time |
| Input tokens and cost per query | Larger k multiplies prompt tokens on every request ([How do you estimate and control LLM costs in production?](/interview-question/how-do-you-estimate-and-control-llm-costs-in-production)) |
| Citation correctness | An answer with a wrong citation erodes trust even when the text is right |
| Per-slice results | Topic, document type, language, question type, unanswerable |
| Permission leaks | Count of answers drawing on documents the asking user may not see; the target is zero |

### When to run what

- **Every pull request** that touches chunking, embeddings, retrieval, prompts or the model: levels 1 to 3 on the golden set, compared with the main branch.
- **Every re-index**: level 1 at least, because a broken ingestion job (missing documents, empty chunks) shows up first as falling recall.
- **After release**: sample live traffic for judge scoring, track user feedback and "not found" rates, and add newly found failures to the golden set ([How do you monitor LLM quality drift in production?](/interview-question/how-do-you-monitor-llm-quality-drift-in-production)).

The full system design of a production RAG pipeline is in [How would you design a production RAG pipeline end-to-end in 2025-26?](/interview-question/how-would-you-design-a-production-rag-pipeline-end-to-end-in-2025-26); how to build and grow the question set is in [How do you build a golden dataset for evaluating an LLM feature?](/interview-question/how-do-you-build-a-golden-dataset-for-evaluating-an-llm-feature)

## Edge Cases Worth Knowing

- **Several valid passages.** Many questions are answerable from more than one place. Label all of them, or recall@k under-counts successes.
- **Multi-hop questions.** "Can I carry over vacation and also take parental leave in the same year?" needs two passages. Score "all required passages retrieved", not "any".
- **Corpus drift.** When documents are updated, references go stale. Version the test set together with the index snapshot, and re-check references when source documents change.
- **Judge-scored end-to-end metrics** inherit the judge's biases; calibrate against human labels before trusting a small difference ([Beyond Ragas: how do you eval LLMs with LLM-as-judge, DeepEval, and human eval?](/interview-question/beyond-ragas-how-do-you-eval-llms-with-llm-as-judge-deepeval-and-human-eval)).
- **Small sets swing wildly.** With 11 questions, one question is 9 points. Report counts next to percentages, and use hundreds of questions before comparing close variants.

## Common Pitfalls

- **Only measuring end to end.** It cannot separate a retrieval miss from a generator error, so teams tune prompts for problems that live in the index.
- **No unanswerable questions in the set.** The system is never tested on whether it can say "not found", which is where the worst production answers come from.
- **Labelling chunk IDs.** Any chunking change invalidates the labels. Label evidence text or spans.
- **Using synthetic questions only.** Questions generated from the documents share their vocabulary, which flatters lexical retrieval and hides gaps like q07.
- **Ignoring rank.** recall@10 can look fine while the right passage sits at rank 8, behind distractors the generator prefers.
- **Reporting quality without cost and latency.** "Recall went up 6 points" is incomplete if top-k tripled the prompt size.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Separate the stages:</strong> <span style="color:#f0e2c8;">An end-to-end accuracy number tells you something is wrong, not where. I evaluate at three levels: the <strong style="color:#ffca28;">retriever</strong> against labelled evidence, the <strong style="color:#ffca28;">generator</strong> with the correct evidence supplied, and the <strong style="color:#ffca28;">full pipeline</strong> against reference answers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Retrieval metrics:</strong> <span style="color:#f0e2c8;">For each test question a person marks the passage that answers it; I score <strong style="color:#ffca28;">recall@k</strong>, which is the ceiling on the whole system, and <strong style="color:#ffca28;">MRR</strong> or <strong style="color:#ffca28;">nDCG</strong> for rank. No LLM involved, so it runs on every chunking or embedding change. I label evidence text, not chunk IDs, so re-chunking does not break the set.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Oracle context:</strong> <span style="color:#f0e2c8;">Then I give the generator the gold passage directly. If it fails with perfect evidence, it is a prompt or model problem; if it passes, the failure lives in retrieval or ranking. I score correctness, faithfulness and citation correctness.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Attribute every failure:</strong> <span style="color:#f0e2c8;">Per question I label: retrieval miss, right passage retrieved but wrong one used, over-abstain, or answered an unanswerable question. In my toy harness 64% end to end split into four failures with four different fixes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Report and gate:</strong> <span style="color:#f0e2c8;">The same report carries per-slice results, p95 latency and cost per query, and it runs on every pull request touching retrieval, prompts or the model, plus every re-index. After release, sampled live traffic feeds new cases back into the set.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get labelled evidence without months of work?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Start from real questions, let a retriever propose candidate passages, and have a person confirm or correct them, which is much faster than searching from scratch. A few hundred labelled questions, with slices and an unanswerable share, is a workable start. Synthetic questions can fill gaps but share the documents' vocabulary.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why include unanswerable questions?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the worst production failure is a confident answer built from the nearest-looking passage. Only questions with no answer in the corpus test whether the system abstains. In my demo the unanswerable sick-days question was answered from the vacation passage.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Recall@10 is 95% but answers are still wrong. What next?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Check rank and use: MRR, where the gold passage sits, and the <em style="color:#d8d8d8;">wrong chunk used</em> count. If the generator prefers a distractor above the gold passage, the fix is a <strong style="color:#ffca28;">reranker</strong> or fewer chunks, not a bigger k. Then run oracle context to rule out the generator.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you evaluate citations?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For each cited sentence, check that the cited passage supports it: a code check that the citation points to a retrieved passage, then an entailment-style judge for support. Report citation precision (cited passages that support) separately from answer correctness.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes when the corpus updates daily?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Version the golden set with the index snapshot, run retrieval metrics after every ingestion, and re-check references whose source documents changed. A sudden recall drop after re-indexing usually means an ingestion bug, not a model problem.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| recall@k | Share of questions with a correct passage in the top k |
| MRR | Mean of 1 / rank of the first correct passage |
| nDCG | Graded, position-discounted ranking score normalised to 1 |
| Oracle context | Giving the generator the known-correct evidence to isolate it from retrieval |
| Abstention (unanswerable slice) | Questions with no answer in the corpus, testing whether the system says so |
| Failure attribution | Labelling each failure with the stage that caused it |

**Conclusion:** Evaluating a RAG pipeline end to end means evaluating it three times: the retriever against labelled evidence with recall@k and MRR, the generator on its own with oracle context, and the full pipeline against reference answers, including questions that have no answer. Comparing the three per question turns one disappointing accuracy number into a list of retrieval misses, ranking mistakes, over-cautious refusals and invented answers, each with its own fix. Put cost, latency and per-slice results in the same report, run it on every change to chunking, retrieval, prompts or model, and the question "is it the retriever or the model?" stops being a debate.`,
    examples: [
      {
        label: `End-to-end RAG eval harness: stage metrics plus failure attribution`,
        variants: [
          { tech: "node", code: `// End-to-end RAG eval harness on a tiny handbook. Retriever = word-overlap
// ranking (a stand-in for BM25 or vectors); generator = deterministic stub that
// answers from the first retrieved chunk sharing >= 2 words with the question,
// else says "not found". The harness scores each stage separately, then attributes failures.
const STOP = new Set("a an the is are be can do does i to of in on for and or with have has it you my what how many when long often each get".split(" "));
const stem = (w) => (w.length > 4 && w.endsWith("ed") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);
const words = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\\s+/).filter((w) => w && !STOP.has(w)).map(stem));
const overlap = (a, b) => { let n = 0; for (const w of a) if (b.has(w)) n++; return n; };

const DOCS = [
  ["d1", "Employees accrue 20 vacation days per year."],
  ["d2", "Up to 5 unused vacation days roll over into the next year."],
  ["d3", "Parental leave is 16 weeks paid for all employees."],
  ["d4", "Sick leave needs a doctor note after 3 consecutive sick days."],
  ["d5", "The office opens at 8 am and closes at 7 pm."],
  ["d6", "Remote work is allowed up to 3 days per week with manager approval."],
  ["d7", "Expense reports must be filed within 30 days of purchase."],
  ["d8", "Laptops are refreshed every 3 years by the IT team."],
].map(([id, text]) => ({ id, text, w: words(text) }));

// gold = the chunk that answers it; null = not answerable from the corpus.
const QUERIES = [
  ["q01", "How many vacation days do employees get per year?", "d1"],
  ["q02", "Can unused vacation roll over to next year?", "d2"],
  ["q03", "How long is paid parental leave?", "d3"],
  ["q04", "When do I need a doctor note for sick days?", "d4"],
  ["q05", "What time does the office close?", "d5"],
  ["q06", "How many days per week can I work remotely?", "d6"],
  ["q07", "What is the deadline to submit receipts?", "d7"],
  ["q08", "How often are laptops replaced?", "d8"],
  ["q09", "How many vacation days can I carry forward each year?", "d2"],
  ["q10", "How many sick days per year do employees get?", null],
  ["q11", "What is the dress code?", null],
].map(([id, q, gold]) => ({ id, q, gold, w: words(q) }));

function retrieve(qw, k) {
  return DOCS.map((d, i) => ({ d, s: overlap(qw, d.w), i }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, k).map((x) => x.d);
}
function generate(qw, ctx) {
  for (const d of ctx) if (overlap(qw, d.w) >= 2) return d.id; // answers from this chunk
  return null; // "not found in the handbook"
}

const K = 3;
const answerable = QUERIES.filter((q) => q.gold);
let r1 = 0, r3 = 0, mrr = 0, oracleOk = 0, e2eOk = 0;
const buckets = {};
const rows = [];
for (const q of QUERIES) {
  const ctx = retrieve(q.w, K);
  const ids = ctx.map((d) => d.id);
  const rank = q.gold ? ids.indexOf(q.gold) + 1 : 0;
  if (q.gold) { if (rank === 1) r1++; if (rank >= 1) { r3++; mrr += 1 / rank; } }
  // Stage 2 in isolation: give the generator the gold chunk only (oracle context).
  const oracle = q.gold ? generate(q.w, DOCS.filter((d) => d.id === q.gold)) : null;
  if (q.gold && oracle === q.gold) oracleOk++;
  const ans = generate(q.w, ctx);
  let label;
  if (!q.gold) label = ans ? "answered unanswerable" : "correct abstain";
  else if (ans === q.gold) label = "correct";
  else if (rank === 0) label = "retrieval miss";
  else if (ans === null) label = "over-abstain (gold retrieved)";
  else label = "wrong chunk used (gold retrieved)";
  if (label === "correct" || label === "correct abstain") e2eOk++;
  buckets[label] = (buckets[label] || 0) + 1;
  rows.push(\`\${q.id} top\${K}=[\${ids.join(",")}] gold=\${q.gold || "-"} answer=\${ans || "not found"} -> \${label}\`);
}
rows.forEach((r) => console.log(r));
const n = answerable.length, f = (x) => x.toFixed(3);
console.log(\`retrieval (\${n} answerable): recall@1=\${f(r1 / n)} recall@\${K}=\${f(r3 / n)} MRR@\${K}=\${f(mrr / n)}\`);
console.log(\`generation with oracle context: \${oracleOk}/\${n} = \${f(oracleOk / n)}\`);
console.log(\`end to end (\${QUERIES.length} queries incl. unanswerable): \${e2eOk}/\${QUERIES.length} = \${f(e2eOk / QUERIES.length)}\`);
console.log("failure attribution:");
for (const k of Object.keys(buckets).sort()) console.log(\`  \${k.padEnd(34)} \${buckets[k]}\`);` },
          { tech: "python", code: `# End-to-end RAG eval harness on a tiny handbook. Retriever = word-overlap
# ranking (a stand-in for BM25 or vectors); generator = deterministic stub that
# answers from the first retrieved chunk sharing >= 2 words with the question,
# else says "not found". The harness scores each stage separately, then attributes failures.
import re

STOP = set("a an the is are be can do does i to of in on for and or with have has it you my what how many when long often each get".split(" "))


def stem(w):
    if len(w) > 4 and w.endswith("ed"):
        return w[:-2]
    if len(w) > 3 and w.endswith("s"):
        return w[:-1]
    return w


def words(s):
    return {stem(w) for w in re.sub(r"[^a-z0-9 ]", " ", s.lower()).split() if w not in STOP}


def overlap(a, b):
    return len(a & b)


DOCS = [{"id": i, "text": t, "w": words(t)} for i, t in [
    ("d1", "Employees accrue 20 vacation days per year."),
    ("d2", "Up to 5 unused vacation days roll over into the next year."),
    ("d3", "Parental leave is 16 weeks paid for all employees."),
    ("d4", "Sick leave needs a doctor note after 3 consecutive sick days."),
    ("d5", "The office opens at 8 am and closes at 7 pm."),
    ("d6", "Remote work is allowed up to 3 days per week with manager approval."),
    ("d7", "Expense reports must be filed within 30 days of purchase."),
    ("d8", "Laptops are refreshed every 3 years by the IT team."),
]]

# gold = the chunk that answers it; None = not answerable from the corpus.
QUERIES = [{"id": i, "q": q, "gold": g, "w": words(q)} for i, q, g in [
    ("q01", "How many vacation days do employees get per year?", "d1"),
    ("q02", "Can unused vacation roll over to next year?", "d2"),
    ("q03", "How long is paid parental leave?", "d3"),
    ("q04", "When do I need a doctor note for sick days?", "d4"),
    ("q05", "What time does the office close?", "d5"),
    ("q06", "How many days per week can I work remotely?", "d6"),
    ("q07", "What is the deadline to submit receipts?", "d7"),
    ("q08", "How often are laptops replaced?", "d8"),
    ("q09", "How many vacation days can I carry forward each year?", "d2"),
    ("q10", "How many sick days per year do employees get?", None),
    ("q11", "What is the dress code?", None),
]]


def retrieve(qw, k):
    scored = [(overlap(qw, d["w"]), i, d) for i, d in enumerate(DOCS)]
    scored = [x for x in scored if x[0] > 0]
    scored.sort(key=lambda x: (-x[0], x[1]))
    return [d for _, _, d in scored[:k]]


def generate(qw, ctx):
    for d in ctx:
        if overlap(qw, d["w"]) >= 2:
            return d["id"]  # answers from this chunk
    return None  # "not found in the handbook"


K = 3
answerable = [q for q in QUERIES if q["gold"]]
r1 = r3 = oracle_ok = e2e_ok = 0
mrr = 0
buckets = {}
for q in QUERIES:
    ctx = retrieve(q["w"], K)
    ids = [d["id"] for d in ctx]
    rank = ids.index(q["gold"]) + 1 if q["gold"] in ids else 0
    if q["gold"]:
        if rank == 1:
            r1 += 1
        if rank >= 1:
            r3 += 1
            mrr += 1 / rank
    # Stage 2 in isolation: give the generator the gold chunk only (oracle context).
    oracle = generate(q["w"], [d for d in DOCS if d["id"] == q["gold"]]) if q["gold"] else None
    if q["gold"] and oracle == q["gold"]:
        oracle_ok += 1
    ans = generate(q["w"], ctx)
    if not q["gold"]:
        label = "answered unanswerable" if ans else "correct abstain"
    elif ans == q["gold"]:
        label = "correct"
    elif rank == 0:
        label = "retrieval miss"
    elif ans is None:
        label = "over-abstain (gold retrieved)"
    else:
        label = "wrong chunk used (gold retrieved)"
    if label in ("correct", "correct abstain"):
        e2e_ok += 1
    buckets[label] = buckets.get(label, 0) + 1
    print(f"{q['id']} top{K}=[{','.join(ids)}] gold={q['gold'] or '-'} answer={ans or 'not found'} -> {label}")

n = len(answerable)


def f(x):
    return f"{x:.3f}"


print(f"retrieval ({n} answerable): recall@1={f(r1 / n)} recall@{K}={f(r3 / n)} MRR@{K}={f(mrr / n)}")
print(f"generation with oracle context: {oracle_ok}/{n} = {f(oracle_ok / n)}")
print(f"end to end ({len(QUERIES)} queries incl. unanswerable): {e2e_ok}/{len(QUERIES)} = {f(e2e_ok / len(QUERIES))}")
print("failure attribution:")
for k in sorted(buckets):
    print(f"  {k:<34} {buckets[k]}")` },
        ],
      },
    ],
  },
  {
    title: `How do you evaluate and debug agent trajectories?`,
    difficulty: "hard",
    seoDescription: `Evaluate agents on outcome, route and reliability: state checks, trajectory match modes, process metrics, pass^k, and debugging from replayed traces.`,
    description: `**Question presented to candidate:**
"We have a customer-support agent that looks up orders, checks the refund policy and issues refunds through tools. It works in demos and fails unpredictably in staging. How would you evaluate it properly, and when a run goes wrong, how would you find out why?"

**What a strong answer should cover:**
- Outcome evaluation: a scenario suite with checkable end states (the refund row exists once, with the right amount), graded on the final state rather than on the agent's own claim of success
- Trajectory evaluation: comparing the sequence of tool calls with a reference (strict, unordered, subset, superset matching), plus reference-free process checks such as repeated calls, skipped mandatory steps, invalid arguments and error recovery, and an LLM judge over the trace where rules cannot decide
- Reliability over repeated runs: success rate per scenario across several runs, and the difference between pass@k (at least one of k succeeds) and pass^k (all k succeed), with pass^k the one that matters for production
- Debugging from traces: record every model call, tool call and result; replay failures against recorded tool results; diff a failing run against a passing one to find the first divergent step; group failures into a taxonomy
- Cost, steps and latency as guardrail metrics, and side-effect safety (no duplicate or unauthorised actions) as must-pass checks

**Clarifying questions expected:**
- Which tools have side effects that cannot be undone, and is there a sandbox or staging copy of them?
- Is there a single correct sequence of steps, or many acceptable ones?
- Does the agent talk to a user over several turns, so we also need a simulated user?

**Code / implementation expected:** Optional — scoring recorded trajectories (outcome, match modes, process flags, pass^k) and a first-divergence diff.`,
    answer: `**Target Audience:** Engineers building tool-using agents who can already evaluate a single LLM response and now need to evaluate, and debug, multi-step runs with real side effects.
**Difficulty:** Hard
**Verified with:** Node 22.22.0 and Python 3.12.3 (the trajectory scorer below). The τ-bench definitions and results, and the LangChain agentevals match modes, were checked via web search in October 2026; the agentevals per-mode rules were only found in secondary sources and are marked as such.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A driving test does not only check whether you arrived at the destination. An examiner sits next to you and notes everything: did you check the mirror, did you stop at the stop sign, did you take three attempts at a parallel park. A candidate who arrives at the right address after running a red light fails.

And the examiner does not pass you because you drove well once. A licence says you will drive safely *every* time.

Evaluating an agent is a driving test. The **outcome** matters (did the refund happen, exactly once, for the right amount), but so does the **route** (did it check the policy first, did it loop on the same lookup five times). And because the same agent can take a different route on every run, what matters is how reliably it succeeds, not whether it succeeded once in a demo.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which tools have side effects (refunds, emails, deletes), and is there a sandbox? | Evals must run against a fake or staging copy; must-pass checks on side effects come first |
| Is there one correct sequence of tool calls, or many acceptable ones? | Decides between strict matching, looser matching, or outcome-only grading |
| Does the agent hold a multi-turn conversation? | Then a simulated user is part of the test, and its variance is part of the result |
| What does a failed run cost compared with a slow one? | Sets the weight of success rate against steps, latency and token cost |
| Are traces already logged? | Debugging is trace-first; without traces there is nothing to replay |

## 3. What a Trajectory Is

📌 **Interview term: trajectory** — the full record of one agent run: every model call (its input and output), every tool call (name and arguments), every tool result, in order, up to the final answer. The loop that produces it is explained in [What is an AI agent and how does the agent loop work?](/interview-question/what-is-an-ai-agent-and-how-does-the-agent-loop-work)

📌 **Interview term: trace (span)** — how a trajectory is stored in observability tools: one trace per run, one span per model or tool call, with timings, token counts and costs attached. What to capture is covered in [What should you log and trace in an LLM application?](/interview-question/what-should-you-log-and-trace-in-an-llm-application) and [AI observability: how do you trace and log LLM calls in prod?](/interview-question/ai-observability-how-do-you-trace-and-log-llm-calls-in-prod)

<svg class="iq-diagram" width="100%" viewBox="0 0 860 230" role="img" aria-label="A reference trajectory of three tool calls compared with an agent run that repeats a lookup and skips the policy check">
  <defs>
    <marker id="ai16q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="70">reference</text>
  <rect class="d-box-accent" x="140" y="40" width="170" height="50" rx="8"/>
  <text class="d-text" x="225" y="70" text-anchor="middle">lookup_order</text>
  <rect class="d-box-accent" x="380" y="40" width="170" height="50" rx="8"/>
  <text class="d-text" x="465" y="70" text-anchor="middle">check_policy</text>
  <rect class="d-box-accent" x="620" y="40" width="170" height="50" rx="8"/>
  <text class="d-text" x="705" y="70" text-anchor="middle">issue_refund</text>
  <path class="d-edge" d="M 314 65 L 374 65" marker-end="url(#ai16q4-arrow)"/>
  <path class="d-edge" d="M 554 65 L 614 65" marker-end="url(#ai16q4-arrow)"/>
  <text class="d-text" x="20" y="170">run v1.r3</text>
  <rect class="d-box" x="140" y="140" width="170" height="50" rx="8"/>
  <text class="d-text" x="225" y="170" text-anchor="middle">lookup_order x3</text>
  <rect class="d-box-muted" x="380" y="140" width="170" height="50" rx="8"/>
  <text class="d-text" x="465" y="170" text-anchor="middle">skipped</text>
  <rect class="d-box" x="620" y="140" width="170" height="50" rx="8"/>
  <text class="d-text" x="705" y="170" text-anchor="middle">issue_refund</text>
  <path class="d-edge" d="M 314 165 L 374 165" marker-end="url(#ai16q4-arrow)"/>
  <path class="d-edge" d="M 554 165 L 614 165" marker-end="url(#ai16q4-arrow)"/>
</svg>

Run v1.r3 from the example ends with the correct refund, so an outcome-only eval passes it. The trajectory shows it looped on the lookup and never checked the refund policy: it got lucky on this order, and would refund an order the policy forbids.

## 4. Grade the Outcome on the Final State

📌 **Interview term: state-based outcome check** — grading a run by inspecting what the tools left behind (rows in a database, emails in an outbox), not by reading the agent's final message. Agents regularly say "Done, I have refunded your order" when they have not.

Build a **scenario suite**: realistic tasks, each with a starting state and a programmatic check of the end state. τ-bench (Yao et al., Sierra, arXiv 2406.12045) is the public example of this design: it compares the final database state with an annotated goal state, with an LLM playing the customer.

Outcome checks should include the **must-not** conditions: no duplicate refund, no action on another customer's order, no tool call the user did not authorise. These are pass or fail on every run, not averages ([How do you design human-in-the-loop approval for agent actions?](/interview-question/how-do-you-design-human-in-the-loop-approval-for-agent-actions)).

## 5. Grade the Route: Trajectory Matching and Process Checks

### Matching against a reference

When the task has a known good sequence, compare the run's tool calls with a reference trajectory. LangChain's agentevals package documents four match modes for this, \`strict\`, \`unordered\`, \`subset\` and \`superset\` (LangChain docs, October 2026). The per-mode rules below are the ones this doc's example implements, consistent with secondary descriptions of agentevals; check the library for its exact rules on argument matching:

📌 **Interview term: trajectory match modes** —
- **strict:** the same calls, in the same order, nothing extra.
- **unordered:** the same calls, any order.
- **subset:** the agent made only calls that are in the reference (it may have skipped some).
- **superset:** the agent made every reference call, and possibly extra ones.

Which mode to choose is a product decision. "Policy check must come before refund" calls for strict ordering on those two calls; "look things up in any order" calls for unordered; "extra read-only lookups are fine" calls for superset.

### Reference-free process checks

Many tasks have no single right sequence, so add checks that need no reference:

📌 **Interview term: process metrics** — properties of the route, scored per step or per run: valid tool arguments, repeated identical calls (loops), mandatory steps skipped, errors followed by recovery, number of steps, tokens and cost. Rules handle the objective ones; an **LLM judge reading the whole trace** handles questions like "was this a reasonable tool to call here?".

Steps and cost belong in the report as **guardrail metrics**: a version that succeeds as often but takes 40 steps instead of 4 is a regression.

## 6. Reliability: pass@k Versus pass^k

Agents are nondeterministic, so every scenario runs several times.

📌 **Interview term: pass@k** — the probability that **at least one** of k independent runs succeeds. It measures whether the agent *can* do the task; useful when a human or a verifier picks the best attempt.

📌 **Interview term: pass^k (pass-hat-k)** — the probability that **all** k runs succeed, defined in the τ-bench paper. It measures whether the agent does the task *consistently*, which is what a production agent serving thousands of customers needs. With n runs per task and c successes, the unbiased estimate is C(c, k) / C(n, k), averaged over tasks.

The gap is large in practice. The τ-bench paper reported that GPT-4o-based function-calling agents succeeded on under 50% of tasks and that pass^8 was below 25% on the retail domain; Sierra's write-up called that about a 60% drop from pass^1 (τ-bench paper and Sierra blog, as quoted by search results in October 2026; mid-2024 models). Any single-run demo hides exactly this.

## 7. Verified: Running the Code

The example **"Scoring recorded agent trajectories: outcome, match modes, process flags, pass^k"** scores ten recorded runs of a refund agent (two versions, five runs each) for one task: "refund order 123, damaged item, 49.99". The runs are recorded fixtures, which is how real debugging works too: replaying recorded tool results needs neither a model nor real tools. The heart of the matching:

~~~js
const key = ([tool, args]) => \`\${tool}(\${JSON.stringify(args)})\`;
function match(run) {
  const a = run.map(key), r = REF.map(key), ca = count(a), cr = count(r);
  return {
    strict: a.length === r.length && a.every((k, i) => k === r[i]),
    unordered: contains(ca, cr) && contains(cr, ca),
    subset: contains(cr, ca),   // agent used only reference calls
    superset: contains(ca, cr), // agent made every reference call (extras allowed)
  };
}
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
run    ok  steps  strict unord subset super  process flags
v1.r1  Y    3     Y      Y     Y      Y     none
v1.r2  Y    3     -      Y     Y      Y     none
v1.r3  Y    4     -      -     -      -     repeated call, skipped policy
v1.r4  -    3     -      -     -      -     none
v1.r5  Y    4     -      -     -      Y     error recovered
v1: success 4/5, strict-match rate 0.200, pass@1=0.800 pass^1=0.800, pass@3=1.000 pass^3=0.400
v2.r1  Y    3     Y      Y     Y      Y     none
v2.r2  Y    3     Y      Y     Y      Y     none
v2.r3  -    2     -      -     Y      -     none
v2.r4  Y    3     Y      Y     Y      Y     none
v2.r5  -    4     -      -     -      Y     repeated call
v2: success 3/5, strict-match rate 0.600, pass@1=0.600 pass^1=0.600, pass@3=1.000 pass^3=0.100
v1.r4 vs v1.r1 -> step 3: expected issue_refund({"id":123,"amount":49.99}) got issue_refund({"id":123,"amount":4999})
v2.r3 vs v2.r1 -> step 3: expected issue_refund({"id":123,"amount":49.99}) got (end)
v2.r5 vs v2.r1 -> step 4: expected (end) got issue_refund({"id":123,"amount":49.99})
~~~

What the table shows:

- **Outcome and route disagree in both directions.** v1.r3 succeeds (Y) but loops and skips the policy check. v1.r4 follows the reference tool sequence and fails: the amount is 4999 instead of 49.99, a well-formed but wrong argument that no process flag caught. You need both kinds of check.
- **The match modes give different verdicts on the same runs.** v1.r2 (policy before lookup) fails strict and passes unordered. v1.r5 (a failed lookup on the wrong ID, then recovery) fails everything except superset. v2.r3 stops early and passes only subset.
- **v2 looks better by trajectory and is worse by outcome.** Its strict-match rate is 0.600 against 0.200 for v1, but it succeeds 3/5 against 4/5, because it sometimes stops before refunding and once refunds **twice** (v2.r5, a retry with no idempotency check). A double refund is a must-not failure whatever the averages say.
- **pass@3 is 1.000 for both versions; pass^3 is 0.400 for v1 and 0.100 for v2.** "It can do it" is true for both. "It does it every time" is far from true for either: on pass^1 v2 reaches three quarters of v1 (0.600 against 0.800), on pass^3 only a quarter (0.100 against 0.400). Consistency gaps grow with k.
- **The first-divergence diff names the bug.** v1.r4 diverges at step 3 in the refund amount (a units confusion, cents versus dollars); v2.r3 ends where step 3 should be (gave up early); v2.r5 has an unexpected step 4 (duplicate refund). Each points at a different fix: argument formatting, a stopping rule, an idempotency key.

Five runs per version is far too few for real decisions; the point is the method. The simulation also leaves out a simulated user, model calls and real timing.

## 8. Debugging a Failed Trajectory

📌 **Interview term: replay with recorded tool results** — re-running an agent from a stored trace with tool calls answered from the recording instead of live systems. It turns a flaky, side-effecting failure into a repeatable one you can step through, and lets you change the prompt and see whether the decision at the failing step changes.

📌 **Interview term: first divergent step** — the earliest step where a failing run differs from a passing run of the same task (or from the previous version on the same scenario). The bug is almost always at or just before it; everything after is consequence.

A debugging routine that works:

1. **Find the trace** for the failed scenario run (trace ID in the eval report).
2. **Diff it** against a passing run or the reference and jump to the first divergent step.
3. **Read the model input at that step**: the tool result it had just received, the conversation so far, the tool descriptions. Often the cause is a confusing tool result or description ([How do you design good tool definitions for an LLM?](/interview-question/how-do-you-design-good-tool-definitions-for-an-llm)).
4. **Replay from that step** with recorded tool results, several times, to see whether the wrong decision is consistent or occasional.
5. **Fix and re-run the whole suite**, then add the failure as a permanent scenario.

📌 **Interview term: failure taxonomy** — a fixed set of categories for failed runs (wrong tool, bad arguments, skipped required step, gave up early, looped, duplicated a side effect, misread a tool error, hallucinated a tool result). Counting failures per category turns a pile of anecdotes into a ranked list of what to fix; tool-error handling specifically is covered in [How should an agent handle tool errors, timeouts and retries?](/interview-question/how-should-an-agent-handle-tool-errors-timeouts-and-retries)

## 9. Summary of What to Measure

| Kind | Metric | Grader |
| :--- | :--- | :--- |
| Outcome | Task success on the final state | Code check on tool state |
| Must-not | Duplicate, unauthorised or out-of-scope actions | Code check; any failure blocks |
| Reliability | Success per scenario over n runs, pass^k | Arithmetic over runs |
| Route | Match against reference (strict, unordered, subset, superset) | Code |
| Process | Loops, skipped steps, argument validity, recovery | Code rules, LLM judge over the trace |
| Guardrails | Steps, tokens, cost, wall-clock time per run | Trace metadata |

## Edge Cases Worth Knowing

- **Many correct routes.** Do not force strict matching on a task with legitimate variations; you will "fix" correct behaviour. Use outcome checks plus process rules, and reserve strict ordering for the steps where order is policy.
- **Simulated users add variance.** When an LLM plays the customer, some failures come from the simulator. Read a sample of failed conversations before blaming the agent.
- **Recorded fixtures go stale.** If a tool's response format changes, replays against old recordings test a world that no longer exists. Re-record periodically.
- **Live tool calls in evals.** Running evals against real systems with side effects is how test refunds reach real customers. Use sandboxes or fakes ([How do you sandbox an agent and enforce least-privilege tool access?](/interview-question/how-do-you-sandbox-an-agent-and-enforce-least-privilege-tool-access)).
- **Judge reading long traces.** An LLM judge over a 60-step trace can miss the one bad step. Have it score per step, or point it at the steps your rules flagged.

## Common Pitfalls

- **Trusting the agent's final message.** "I have issued the refund" is not evidence; the tool state is.
- **One run per scenario.** A single success hides an agent that fails one time in three. Run each scenario several times and report pass^k.
- **Outcome-only grading.** Lucky successes that skip mandatory checks pass, and will fail on the next customer.
- **Strict matching everywhere.** Penalises harmless reordering and extra read-only lookups, so the metric goes down when behaviour gets better.
- **Debugging from the final answer.** Without the trace and a first-divergence diff, teams edit prompts at random.
- **No cost or step budget in the report.** A version that succeeds by trying 30 tools has regressed.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Three things to grade:</strong> <span style="color:#f0e2c8;">For an agent I grade the <strong style="color:#ffca28;">outcome</strong>, the <strong style="color:#ffca28;">route</strong>, and <strong style="color:#ffca28;">reliability</strong>. Arriving at the right answer after skipping a mandatory check is a failure waiting to happen, and one good demo run says nothing about the next thousand.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Outcome on the final state:</strong> <span style="color:#f0e2c8;">Each scenario has a starting state and a code check of the end state: the refund row exists <strong style="color:#ffca28;">exactly once</strong> with the right amount. I never trust the agent saying <em style="color:#f0e2c8;">done</em>. Must-not checks, like duplicate or unauthorised actions, block on any failure.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Route:</strong> <span style="color:#f0e2c8;">Where there is a good reference sequence, I match tool calls in the right mode: strict, unordered, subset or superset, as agentevals offers. Without one, I use process rules (loops, skipped steps, argument validity, recovery) and an LLM judge over the trace, and track steps and cost as guardrails.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Reliability:</strong> <span style="color:#f0e2c8;">Every scenario runs several times. <strong style="color:#ffca28;">pass@k</strong> asks if any run succeeds; <strong style="color:#ffca28;">pass^k</strong> asks if all do, and that is what production feels. In my toy run both versions had pass@3 of 1.0, but pass^3 was 0.4 and 0.1. τ-bench reported pass^8 under 25% on retail for 2024 GPT-4o agents.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Debug from traces:</strong> <span style="color:#f0e2c8;">Every run is traced. For a failure I diff it against a passing run, go to the <strong style="color:#ffca28;">first divergent step</strong>, read the model input there, and replay from that step with recorded tool results until the fix changes the decision. Then the case joins the suite and the failure taxonomy.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just grade the final answer?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because an agent can reach the right state by luck or by breaking a rule, and the next customer will not be so lucky. In my demo one run refunded correctly while skipping the policy check entirely; only a route check caught it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many runs per scenario?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Enough to estimate a success rate per scenario, often 3 to 10 depending on cost, and more for the scenarios that decide a release. Report the variance and pass^k, not the best run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you choose between strict and unordered matching?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From the product rule. If order is policy, like checking eligibility before refunding, enforce order on those steps. If order does not matter, use unordered or superset, otherwise the metric punishes harmless variation and you end up tuning toward one arbitrary path.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is replay and why does it help?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Re-running the agent from a stored trace with tool calls answered from the recording. It makes a flaky failure repeatable, avoids real side effects, and lets me check whether a prompt change actually changes the decision at the failing step.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when you upgrade the agent model?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run the whole scenario suite several times on both versions and compare per scenario, including pass^k, steps and cost, and diff trajectories where outcomes flipped. Process metrics often move before the success rate does, so they warn early.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Trajectory | The ordered record of every model call, tool call and result in one agent run |
| Trace (span) | How a trajectory is stored: one trace per run, one span per call |
| State-based outcome check | Grading a run by the state its tools left behind |
| Trajectory match modes | strict, unordered, subset, superset comparison of tool calls with a reference |
| Process metrics | Properties of the route: loops, skipped steps, argument validity, recovery, steps, cost |
| pass@k | Probability at least one of k runs succeeds |
| pass^k | Probability all k runs succeed (τ-bench) |
| Replay with recorded tool results | Re-running from a trace with tools answered from the recording |
| First divergent step | Earliest step where a failing run differs from a passing one |
| Failure taxonomy | Fixed categories for failed runs, counted to prioritise fixes |

**Conclusion:** An agent is evaluated like a driving test: on where it ended up, on the route it took, and on whether it does it every time. Grade the outcome on the real end state with must-not checks for side effects; grade the route with reference matching in the mode the task allows plus process rules and a judge over the trace; and run every scenario several times, because pass^k, not a demo, is what users experience. When a run fails, debug from the trace: diff it against a good run, go to the first divergent step, replay it against recorded tool results, and file the failure in a taxonomy and the suite so it never comes back silently.`,
    examples: [
      {
        label: `Scoring recorded agent trajectories: outcome, match modes, process flags, pass^k`,
        variants: [
          { tech: "node", code: `// Scoring recorded agent trajectories: outcome (final state), trajectory match
// against a reference (strict / unordered / subset / superset), process flags,
// pass@k vs pass^k over repeated runs, and the first step where a failing run diverges.
// The traces are recorded fixtures; replaying them needs no model and no real tools.
const REF = [["lookup_order", { id: 123 }], ["check_policy", { reason: "damaged" }], ["issue_refund", { id: 123, amount: 49.99 }]];
const L = (id, ok = true) => ["lookup_order", { id }, ok ? "ok" : "error: not found"];
const P = ["check_policy", { reason: "damaged" }, "ok"];
const R = (amount) => ["issue_refund", { id: 123, amount }, "ok"];
const RUNS = {
  v1: [[L(123), P, R(49.99)], [P, L(123), R(49.99)], [L(123), L(123), L(123), R(49.99)], [L(123), P, R(4999)], [L(132, false), L(123), P, R(49.99)]],
  v2: [[L(123), P, R(49.99)], [L(123), P, R(49.99)], [L(123), P], [L(123), P, R(49.99)], [L(123), P, R(49.99), R(49.99)]],
};

const key = ([tool, args]) => \`\${tool}(\${JSON.stringify(args)})\`;
function count(list) { const m = new Map(); for (const k of list) m.set(k, (m.get(k) || 0) + 1); return m; }
function contains(big, small) { for (const [k, n] of small) if ((big.get(k) || 0) < n) return false; return true; }
function match(run) {
  const a = run.map(key), r = REF.map(key), ca = count(a), cr = count(r);
  return {
    strict: a.length === r.length && a.every((k, i) => k === r[i]),
    unordered: contains(ca, cr) && contains(cr, ca),
    subset: contains(cr, ca),   // agent used only reference calls
    superset: contains(ca, cr), // agent made every reference call (extras allowed)
  };
}
// Outcome = the final state the tools left behind: exactly one refund of 49.99 on order 123.
function outcome(run) {
  const refunds = run.filter(([t, , res]) => t === "issue_refund" && res === "ok").map(([, a]) => a);
  return refunds.length === 1 && refunds[0].id === 123 && refunds[0].amount === 49.99;
}
function process(run) {
  const flags = [];
  for (let i = 1; i < run.length; i++) if (key(run[i]) === key(run[i - 1])) { flags.push("repeated call"); break; }
  if (run.some((s) => s[2].startsWith("error"))) flags.push(outcome(run) ? "error recovered" : "error");
  if (!run.some((s) => s[0] === "check_policy")) flags.push("skipped policy");
  return flags;
}
const C = (n, k) => { if (k > n) return 0; let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r; };
const f = (x) => x.toFixed(3);
const yn = (b) => (b ? "Y" : "-");

console.log("run    ok  steps  strict unord subset super  process flags");
for (const [ver, runs] of Object.entries(RUNS)) {
  const ok = runs.map(outcome);
  runs.forEach((run, i) => {
    const m = match(run);
    console.log(\`\${ver}.r\${i + 1}  \${yn(ok[i])}   \${String(run.length).padStart(2)}     \${yn(m.strict)}      \${yn(m.unordered)}     \${yn(m.subset)}      \${yn(m.superset)}     \${process(run).join(", ") || "none"}\`);
  });
  const n = runs.length, c = ok.filter(Boolean).length;
  const strictRate = runs.filter((r) => match(r).strict).length / n;
  const parts = [1, 3].map((k) => \`pass@\${k}=\${f(1 - C(n - c, k) / C(n, k))} pass^\${k}=\${f(C(c, k) / C(n, k))}\`);
  console.log(\`\${ver}: success \${c}/\${n}, strict-match rate \${f(strictRate)}, \${parts.join(", ")}\`);
}

// Debugging: diff a failing run against a passing one and report the first divergent step.
function firstDivergence(good, bad) {
  for (let i = 0; i < Math.max(good.length, bad.length); i++) {
    const g = good[i] ? key(good[i]) : "(end)", b = bad[i] ? key(bad[i]) : "(end)";
    if (g !== b) return \`step \${i + 1}: expected \${g} got \${b}\`;
  }
  return "identical";
}
console.log(\`v1.r4 vs v1.r1 -> \${firstDivergence(RUNS.v1[0], RUNS.v1[3])}\`);
console.log(\`v2.r3 vs v2.r1 -> \${firstDivergence(RUNS.v2[0], RUNS.v2[2])}\`);
console.log(\`v2.r5 vs v2.r1 -> \${firstDivergence(RUNS.v2[0], RUNS.v2[4])}\`);` },
          { tech: "python", code: `# Scoring recorded agent trajectories: outcome (final state), trajectory match
# against a reference (strict / unordered / subset / superset), process flags,
# pass@k vs pass^k over repeated runs, and the first step where a failing run diverges.
# The traces are recorded fixtures; replaying them needs no model and no real tools.
import json
from collections import Counter

REF = [("lookup_order", {"id": 123}), ("check_policy", {"reason": "damaged"}), ("issue_refund", {"id": 123, "amount": 49.99})]


def L(id, ok=True):
    return ("lookup_order", {"id": id}, "ok" if ok else "error: not found")


P = ("check_policy", {"reason": "damaged"}, "ok")


def R(amount):
    return ("issue_refund", {"id": 123, "amount": amount}, "ok")


RUNS = {
    "v1": [[L(123), P, R(49.99)], [P, L(123), R(49.99)], [L(123), L(123), L(123), R(49.99)], [L(123), P, R(4999)], [L(132, False), L(123), P, R(49.99)]],
    "v2": [[L(123), P, R(49.99)], [L(123), P, R(49.99)], [L(123), P], [L(123), P, R(49.99)], [L(123), P, R(49.99), R(49.99)]],
}


def key(step):
    return f"{step[0]}({json.dumps(step[1], separators=(',', ':'))})"


def contains(big, small):
    return all(big[k] >= n for k, n in small.items())


def match(run):
    a = [key(s) for s in run]
    r = [key(s) for s in REF]
    ca, cr = Counter(a), Counter(r)
    return {
        "strict": a == r,
        "unordered": contains(ca, cr) and contains(cr, ca),
        "subset": contains(cr, ca),    # agent used only reference calls
        "superset": contains(ca, cr),  # agent made every reference call (extras allowed)
    }


def outcome(run):
    # Outcome = the final state the tools left behind: exactly one refund of 49.99 on order 123.
    refunds = [s[1] for s in run if s[0] == "issue_refund" and s[2] == "ok"]
    return len(refunds) == 1 and refunds[0]["id"] == 123 and refunds[0]["amount"] == 49.99


def process(run):
    flags = []
    for i in range(1, len(run)):
        if key(run[i]) == key(run[i - 1]):
            flags.append("repeated call")
            break
    if any(s[2].startswith("error") for s in run):
        flags.append("error recovered" if outcome(run) else "error")
    if not any(s[0] == "check_policy" for s in run):
        flags.append("skipped policy")
    return flags


def C(n, k):
    if k > n:
        return 0
    r = 1
    for i in range(k):
        r = (r * (n - i)) / (i + 1)
    return r


def f(x):
    return f"{x:.3f}"


def yn(b):
    return "Y" if b else "-"


print("run    ok  steps  strict unord subset super  process flags")
for ver, runs in RUNS.items():
    ok = [outcome(r) for r in runs]
    for i, run in enumerate(runs):
        m = match(run)
        print(f"{ver}.r{i + 1}  {yn(ok[i])}   {len(run):>2}     {yn(m['strict'])}      {yn(m['unordered'])}     {yn(m['subset'])}      {yn(m['superset'])}     {', '.join(process(run)) or 'none'}")
    n, c = len(runs), sum(ok)
    strict_rate = sum(1 for r in runs if match(r)["strict"]) / n
    parts = [f"pass@{k}={f(1 - C(n - c, k) / C(n, k))} pass^{k}={f(C(c, k) / C(n, k))}" for k in (1, 3)]
    print(f"{ver}: success {c}/{n}, strict-match rate {f(strict_rate)}, {', '.join(parts)}")


def first_divergence(good, bad):
    # Debugging: diff a failing run against a passing one and report the first divergent step.
    for i in range(max(len(good), len(bad))):
        g = key(good[i]) if i < len(good) else "(end)"
        b = key(bad[i]) if i < len(bad) else "(end)"
        if g != b:
            return f"step {i + 1}: expected {g} got {b}"
    return "identical"


print(f"v1.r4 vs v1.r1 -> {first_divergence(RUNS['v1'][0], RUNS['v1'][3])}")
print(f"v2.r3 vs v2.r1 -> {first_divergence(RUNS['v2'][0], RUNS['v2'][2])}")
print(f"v2.r5 vs v2.r1 -> {first_divergence(RUNS['v2'][0], RUNS['v2'][4])}")` },
        ],
      },
    ],
  },
  {
    title: `How do you catch regressions when changing a prompt or upgrading a model?`,
    difficulty: "medium",
    seoDescription: `Catch LLM regressions: pinned baseline vs candidate, an A/A noise floor, paired per-slice tests, case diffs, a model-upgrade checklist and canaries.`,
    description: `**Question presented to candidate:**
"Someone on the team rewrote the support assistant's system prompt, and separately we want to move to a newer model version. Both look better when we try a few examples. How would you make sure neither change quietly breaks something that works today?"

**What a strong answer should cover:**
- A fixed, versioned golden set run on the baseline and the candidate with everything else pinned (model snapshot, judge, temperature, retrieval index), compared case by case as a paired comparison, not as two separate averages
- Measuring the noise floor first: run the baseline against itself, run each case several times, and only call a difference a regression when it is larger than that noise (a paired sign or McNemar test, or confidence intervals on the difference)
- Per-slice results and flipped-case diffs, because an unchanged average can hide one slice that collapsed; plus must-pass cases that block on any failure
- Model upgrades are bigger than prompt edits: pin dated snapshots, re-run the full suite, re-check the LLM judge, compare format adherence, refusals, length, tool calls, latency and cost, and expect to re-tune the prompt
- Offline evals are necessary but not sufficient: shadow or canary traffic with live quality signals before full rollout, and every regression found becomes a permanent case

**Clarifying questions expected:**
- How large is the golden set, and is it sliced by the categories that matter (language, product area, customer tier)?
- Is the current model pinned to a dated snapshot or an alias that can move?
- What is the cost of a regression compared with delaying the change?

**Code / implementation expected:** Optional — a regression gate that compares baseline and candidate per slice with a noise check and a significance test.`,
    answer: `**Target Audience:** Engineers who own an LLM feature in production and must decide whether a prompt edit or a model upgrade is safe to ship.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (the regression gate below, with a seeded simulator). The promptfoo CI integration and the "Adding Error Bars to Evals" paper were checked via web search in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A bakery changes its bread recipe: a little less salt, a different flour. The head baker tastes three loaves and they are great. Two weeks later the wholesale customer who makes sandwiches complains that the new loaf falls apart when sliced thin. Nobody had tested slicing, because nobody thought the recipe change had anything to do with it.

Prompts and models behave the same way. A change aimed at one behaviour (friendlier tone) moves others nobody was watching (JSON formatting, the Spanish replies, refusal of out-of-scope questions). Trying a few examples is the baker tasting three loaves: it checks what you meant to change and nothing else.

There is a second trap. Bread varies from loaf to loaf even with the same recipe. If you bake one loaf of each recipe and compare, you may be comparing luck. LLM outputs vary from run to run in the same way, so a regression check must first know how big normal variation is.

## 2. The Basic Setup: Baseline Versus Candidate

📌 **Interview term: regression** — a change that makes something that used to work stop working (or work worse). In LLM systems regressions are often *non-local*: the change was to one part of the prompt, the damage is in a behaviour nobody linked to it.

📌 **Interview term: baseline and candidate** — the baseline is what runs in production today (prompt version, model snapshot, settings); the candidate is the proposed change. A regression check runs **both** on the same golden set at the same time, changing exactly one thing. The golden set itself is the subject of [How do you build a golden dataset for evaluating an LLM feature?](/interview-question/how-do-you-build-a-golden-dataset-for-evaluating-an-llm-feature)

Pin everything that is not under test:

- **The model snapshot.** Use a dated model ID, not an alias that the provider can move. OpenAI and Anthropic both publish deprecation and retirement schedules for dated models (OpenAI "Deprecations" page; Claude docs "Model deprecations", which promise at least 60 days notice for publicly released models; both checked October 2026); an alias that silently moves to a new snapshot is an unreviewed model upgrade.
- **The judge.** If outputs are graded by an LLM judge, its model and rubric version stay fixed during the comparison.
- **Sampling settings, retrieval index, tool versions.** Otherwise you are measuring two changes at once.

📌 **Interview term: paired comparison** — scoring baseline and candidate on the *same* cases and analysing the per-case differences, instead of comparing two separate averages. Because each case is compared with itself, the variation between easy and hard cases cancels out, and much smaller real changes become detectable. Miller, "Adding Error Bars to Evals: A Statistical Approach to Language Model Evaluations" (Anthropic, arXiv 2411.00640, 2024) recommends exactly this, and notes that two models can have overlapping confidence intervals and still differ significantly on a paired test.

## 3. Know Your Noise Floor

📌 **Interview term: A/A test (noise floor)** — running the baseline against itself. Any difference you see is pure noise: sampling randomness, judge randomness, provider-side variation. It tells you how large a difference must be before it means anything.

Two habits follow:

1. **Run each case several times** (3 to 5 is common for cheap features) and score the pass rate per case, so one unlucky sample does not flip the verdict.
2. **Test the difference.** On paired pass/fail data, the standard tool is a sign test on the cases that changed.

📌 **Interview term: McNemar's test (exact sign test)** — a test for paired yes/no data that looks only at the cases that changed between the two versions. If the change did nothing, regressions and improvements should be roughly equally likely, like coin flips; the p-value is the probability of a split at least as lopsided as the one observed.

## 4. Slices: Averages Launder Regressions

📌 **Interview term: slice** — a subset of the golden set defined by a tag: language, product area, customer tier, input length, should-refuse cases. Results are reported per slice, because a large improvement in a big slice can hide a collapse in a small one, and the overall average comes out unchanged.

<svg class="iq-diagram" width="100%" viewBox="0 0 860 280" role="img" aria-label="An unchanged overall pass rate hides two improving slices and one collapsing multilingual slice">
  <rect class="d-box" x="20" y="100" width="210" height="80" rx="10"/>
  <text class="d-text" x="125" y="133" text-anchor="middle">overall</text>
  <text class="d-sub" x="125" y="160" text-anchor="middle">86.7 to 86.7</text>
  <rect class="d-box" x="330" y="20" width="250" height="70" rx="10"/>
  <text class="d-text" x="455" y="50" text-anchor="middle">billing</text>
  <text class="d-sub" x="455" y="74" text-anchor="middle">86.7 to 97.3</text>
  <rect class="d-box" x="330" y="110" width="250" height="70" rx="10"/>
  <text class="d-text" x="455" y="140" text-anchor="middle">shipping</text>
  <text class="d-sub" x="455" y="164" text-anchor="middle">85.3 to 94.7</text>
  <rect class="d-box-accent" x="330" y="200" width="250" height="70" rx="10"/>
  <text class="d-text" x="455" y="230" text-anchor="middle">multilingual</text>
  <text class="d-sub" x="455" y="254" text-anchor="middle">88.0 to 68.0</text>
  <path class="d-edge" d="M 234 140 L 326 55"/>
  <path class="d-edge" d="M 234 140 L 326 145"/>
  <path class="d-edge-accent" d="M 234 140 L 326 235"/>
  <rect class="d-box-muted" x="660" y="200" width="180" height="70" rx="10"/>
  <text class="d-text" x="750" y="242" text-anchor="middle">gate blocks</text>
  <path class="d-edge-accent" d="M 584 235 L 656 235"/>
</svg>

These are the numbers from the example below. The candidate prompt made billing and shipping replies better and broke non-English replies, and the overall pass rate did not move at all.

📌 **Interview term: must-pass case** — a golden case that blocks the release on any failure, regardless of averages: a safety refusal, a legal disclaimer, a known past incident. Some teams call this set the "canaries" of the eval suite.

## 5. Verified: Running the Code

The example **"Regression gate: A/A noise floor, per-slice paired deltas and an exact sign test"** has 75 golden cases in three slices of 25, each graded 3 times per version. A seeded random generator stands in for "call the model and grade the answer", with a true pass probability per slice and version that the harness does not know: the candidate is better on billing and shipping and worse on multilingual (0.86 to 0.70). The run compares the baseline with a rerun of itself, then with the candidate, and applies a gate: block if the overall rate drops more than 2 points, if any slice drops more than 5 points with p < 0.05, or if a must-pass case regresses. A case counts as "down" when it passed fewer of its 3 runs than on the baseline. The test:

~~~js
function signTest(reg, imp) { // exact two-sided McNemar / sign test on flipped cases
  const n = reg + imp; if (n === 0) return 1;
  let tail = 0; for (let i = 0; i <= Math.min(reg, imp); i++) tail += C(n, i) * Math.pow(0.5, n);
  return Math.min(1, 2 * tail);
}
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
A/A noise floor (baseline vs baseline rerun): 86.7% vs 86.2%, delta -0.4 pts, flips 19 down / 17 up, p=0.868
overall: baseline 86.7% -> candidate 86.7% (+0.0 pts), flips 18 down / 17 up, p=1.000
  billing        86.7% ->  97.3%   +10.7 pts  flips 2 down / 7 up  p=0.180  regressed: bi05,bi21
  shipping       85.3% ->  94.7%    +9.3 pts  flips 1 down / 7 up  p=0.070  regressed: sh06
  multilingual   88.0% ->  68.0%   -20.0 pts  flips 15 down / 3 up  p=0.008  regressed: mu01,mu04,mu06,mu09,mu10,mu11,mu12,mu15,mu16,mu19,mu20,mu21,mu23,mu24,mu25
GATE: BLOCK -> multilingual slice dropped 20.0 pts (p=0.008)
~~~

What it shows:

- **The noise floor is high.** Running the *same* baseline twice changed the pass count of 36 of 75 cases (19 down, 17 up). Reading individual flips without this context would produce a list of "regressions" that are pure chance.
- **The overall number says nothing changed:** 86.7% to 86.7%, p = 1.000. A gate on the average alone would ship this.
- **The slices disagree sharply.** Multilingual fell 20 points with 15 cases down and 3 up, p = 0.008, so the gate blocks and lists the regressed case IDs for someone to read. Billing and shipping improved by about 10 points, but with p = 0.180 and 0.070 those improvements are not proven either.
- **Detection is not guaranteed.** I re-ran the same program with seeds 7, 2026 and 1 (outputs not shown). The true multilingual drop was identical, the observed drops were 6.7, 9.3 and 18.7 points, and none reached p < 0.05, so all three runs passed the gate. With 25 cases per slice and 3 runs each, a 16-point real regression is caught only some of the time. That is a sample-size problem, and the fix is more cases in the slices you care about, more runs, or a looser threshold that sends borderline results to a human.

The simulation leaves out real model and judge calls, correlated cases (several cases built from the same document, which the Miller paper says should be clustered), and the cost of running the suite.

## 6. Read the Diffs, Not Only the Numbers

📌 **Interview term: case-level diff** — the side-by-side baseline and candidate outputs for every case whose result changed. Numbers say *how much* moved; the diff says *what* moved. A "friendlier tone" edit that broke Spanish replies is usually obvious in five minutes of reading the flipped multilingual cases (for example, the new prompt's English examples pulled the reply language to English).

Tools automate the mechanics. promptfoo's GitHub Action, for instance, runs a before-and-after comparison on pull requests that modify prompt files and links to a viewer for the differences, and its CI docs show failing the job when the pass rate falls below a threshold (promptfoo docs, checked October 2026). The same pattern works with any eval harness and a CI script.

## 7. Model Upgrades Need More Than Prompt Edits

A new model version changes everything at once, so the checklist is longer:

| Check | Why |
| :--- | :--- |
| Full golden suite, several runs per case, per slice | Same as a prompt change, but expect more and wider flips |
| Format adherence: JSON validity, schema, length | New models often differ in verbosity and formatting ([How do you validate and repair structured LLM output at runtime?](/interview-question/how-do-you-validate-and-repair-structured-llm-output-at-runtime)) |
| Refusal and safety slices | Safety behaviour shifts between versions in both directions |
| Tool-calling behaviour | Different tool choice and argument style can break agents ([How do you evaluate and debug agent trajectories?](/interview-question/how-do-you-evaluate-and-debug-agent-trajectories)) |
| Latency, output tokens and cost per request | A better model that writes twice as much can double the bill; tokenizers can differ too |
| The LLM judge | If the judge is the same model family as the new generator, re-check judge agreement with human labels; a stronger model can satisfy a weak rubric in unintended ways |
| Prompt re-tuning | The old prompt was implicitly tuned for the old model; compare the new model with a re-tuned prompt as well as the old one |

Model choice in general is covered in [How do you choose the right model for a task?](/interview-question/how-do-you-choose-the-right-model-for-a-task)

## 8. After the Offline Gate

Offline evals only test what is in the golden set. Before full rollout:

📌 **Interview term: shadow test** — sending a copy of live traffic to the candidate without showing its output to users, then comparing it with production by judge scores, format checks, length and cost.

📌 **Interview term: canary release** — routing a small share of real users to the candidate and watching live quality signals (thumbs down, retries, escalations to humans, guardrail triggers) against the rest before increasing the share.

The rollout mechanics (prompt versioning, feature flags, rollback) are the sibling question [How do you version, test and safely roll out prompt changes?](/interview-question/how-do-you-version-test-and-safely-roll-out-prompt-changes); watching quality after release is [How do you monitor LLM quality drift in production?](/interview-question/how-do-you-monitor-llm-quality-drift-in-production). And close the loop: **every regression that reaches production becomes a golden case**, so it is tested on every future change.

## Edge Cases Worth Knowing

- **The judge changes at the same time.** If the judge model is upgraded together with the generator, you cannot tell which moved the score. Upgrade one at a time.
- **Provider-side changes without a version bump.** Behaviour can shift behind an alias. Pin snapshots and run the suite on a schedule, not only on your own changes.
- **Ties and partial credit.** With 1-5 judge scores, use a paired test on score differences (or bootstrap the mean difference) rather than forcing pass/fail.
- **Tiny slices.** A slice with 5 cases can never show a significant drop. Either grow it or make its cases must-pass.
- **Rollbacks are changes too.** Reverting to an old prompt can undo fixes made since; run the suite on the revert as well.

## Common Pitfalls

- **Comparing against last month's numbers.** Baseline and candidate must run together on the same set with the same judge, or you are measuring drift in everything else.
- **Gating on the average.** The example's overall delta was +0.0 points while one slice lost 20.
- **Treating every flip as a regression.** Without an A/A run you do not know that half the cases change on their own.
- **One run per case for a nondeterministic system.** Run several and compare rates, or the verdict is a coin toss.
- **Upgrading the model through an alias.** It ships an unreviewed change on the provider's schedule.
- **Never reading the flipped outputs.** The numbers find the slice; the diffs find the cause.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Make it an experiment:</strong> <span style="color:#f0e2c8;">I run the <strong style="color:#ffca28;">baseline</strong> and the <strong style="color:#ffca28;">candidate</strong> together on the same versioned golden set, changing exactly one thing: model snapshot, judge, temperature and index all pinned, and the model referenced by a dated ID, not an alias.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Measure the noise first:</strong> <span style="color:#f0e2c8;">LLM outputs vary, so I run each case several times and run the baseline against itself. In my toy run the same baseline changed the result of 36 of 75 cases on a rerun; without that number every flip looks like a regression.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Compare paired, per slice:</strong> <span style="color:#f0e2c8;">I compare per case, not two averages, and test the flips with an exact sign test. Per slice, because averages launder regressions: in the demo the overall rate stayed at 86.7% while multilingual fell 20 points, p = 0.008, and the gate blocked.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Read the diffs:</strong> <span style="color:#f0e2c8;">For every flipped case I read baseline and candidate outputs side by side. The numbers find the slice; the diff finds the cause. <strong style="color:#ffca28;">Must-pass</strong> cases block on any failure regardless of averages.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Model upgrades and rollout:</strong> <span style="color:#f0e2c8;">A model upgrade gets the longer list: format adherence, refusals, tool calls, length, latency and cost, re-checking the judge, and re-tuning the prompt. Then shadow or canary traffic with live signals, and every regression found becomes a golden case.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How big does the golden set need to be?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Big enough per slice to detect the drop you care about. In my demo a real 16-point drop on 25 cases with 3 runs each was significant in only 1 of 4 seeds. The fix is more cases where it matters, more runs, or making small slices must-pass.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a paired test instead of comparing two confidence intervals?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pairing cancels the difference between easy and hard cases, so the test is far more sensitive. Miller's <em style="color:#d8d8d8;">Adding Error Bars to Evals</em> (2024) notes that overlapping intervals can still hide a significant paired difference.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Our model alias was updated by the provider. What do you do?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Treat it as an unreviewed upgrade: pin the previous dated snapshot if it is still available, run the full suite on old versus new, and only move after the upgrade checklist passes. Going forward, always reference dated snapshots and run the suite on a schedule.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The candidate improves billing by 10 points but p is 0.18. Ship it?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That improvement is not proven, but the gate is about not getting worse. If no slice dropped beyond the noise and must-pass cases pass, shipping is reasonable; I would not claim the improvement until a bigger run or the canary confirms it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do evals replace a canary?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The golden set only contains what we thought to test. A shadow test or canary exposes the candidate to real traffic; live signals like thumbs down, retries and escalations catch what the set missed, and those cases go back into it.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Regression | A change that makes previously working behaviour worse |
| Baseline and candidate | Current production configuration and the proposed change, run side by side |
| Paired comparison | Analysing per-case differences on the same cases instead of two averages |
| A/A test (noise floor) | Baseline against itself, to measure normal variation |
| McNemar's test (exact sign test) | Paired test on the cases that changed between versions |
| Slice | A tagged subset of the golden set reported on its own |
| Must-pass case | A case that blocks release on any failure |
| Case-level diff | Side-by-side outputs for every case whose result changed |
| Shadow test | Candidate runs on copied live traffic without users seeing it |
| Canary release | A small share of real users gets the candidate first |

**Conclusion:** Catching regressions on a prompt or model change is a controlled experiment: run the baseline and the candidate together on a versioned golden set with everything else pinned, run each case several times, measure the noise floor with an A/A run, and compare paired per-case results overall and per slice with a proper test. Block on slices that drop beyond the noise and on any must-pass failure, read the flipped outputs to find the cause, give model upgrades the longer checklist (format, refusals, tools, cost, the judge itself), and let shadow or canary traffic catch what the golden set does not cover. Every regression that slips through becomes a new golden case, so the suite gets harder to fool with each change.`,
    examples: [
      {
        label: `Regression gate: A/A noise floor, per-slice paired deltas and an exact sign test`,
        variants: [
          { tech: "node", code: `// Regression gate for a prompt or model change. Each golden case is graded 3
// times per version (outputs are stochastic); a seeded generator stands in for
// the model + grader, so the run is reproducible. Steps: A/A noise floor,
// baseline vs candidate overall and per slice, flipped cases, exact sign test, gate.
let state = 42;
const rand = () => { state = (1664525 * state + 1013904223) % 4294967296; return state / 4294967296; };

const SLICES = ["billing", "shipping", "multilingual"];
// True per-slice pass probability for each version (unknown to the harness).
const P = { base: { billing: 0.88, shipping: 0.86, multilingual: 0.86 }, cand: { billing: 0.97, shipping: 0.96, multilingual: 0.7 } };
const CASES = [];
for (const s of SLICES) for (let i = 0; i < 25; i++) CASES.push({ id: \`\${s.slice(0, 2)}\${String(i + 1).padStart(2, "0")}\`, slice: s, critical: i === 0 });
const RUNS = 3;

function evaluate(version) {
  // Returns, per case, how many of RUNS attempts passed.
  return CASES.map((c) => { let k = 0; for (let r = 0; r < RUNS; r++) if (rand() < P[version][c.slice]) k++; return k; });
}
const rate = (res, idx) => idx.reduce((s, i) => s + res[i], 0) / (idx.length * RUNS);
const passed = (k) => k * 2 > RUNS; // majority of runs
const C = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r; };
function signTest(reg, imp) { // exact two-sided McNemar / sign test on flipped cases
  const n = reg + imp; if (n === 0) return 1;
  let tail = 0; for (let i = 0; i <= Math.min(reg, imp); i++) tail += C(n, i) * Math.pow(0.5, n);
  return Math.min(1, 2 * tail);
}
function flips(a, b, idx) {
  let reg = 0, imp = 0; const ids = [];
  for (const i of idx) { if (b[i] < a[i]) { reg++; ids.push(CASES[i].id); } else if (b[i] > a[i]) imp++; }
  return { reg, imp, ids };
}
const pct = (x) => (x * 100).toFixed(1);
const sgn = (x) => (x >= 0 ? "+" : "") + pct(x);
const ALL = CASES.map((_, i) => i);

const base = evaluate("base"), rerun = evaluate("base"), cand = evaluate("cand");
const aa = flips(base, rerun, ALL);
console.log(\`A/A noise floor (baseline vs baseline rerun): \${pct(rate(base, ALL))}% vs \${pct(rate(rerun, ALL))}%, delta \${sgn(rate(rerun, ALL) - rate(base, ALL))} pts, flips \${aa.reg} down / \${aa.imp} up, p=\${signTest(aa.reg, aa.imp).toFixed(3)}\`);
const d = rate(cand, ALL) - rate(base, ALL), all = flips(base, cand, ALL);
console.log(\`overall: baseline \${pct(rate(base, ALL))}% -> candidate \${pct(rate(cand, ALL))}% (\${sgn(d)} pts), flips \${all.reg} down / \${all.imp} up, p=\${signTest(all.reg, all.imp).toFixed(3)}\`);

const failures = [];
if (d < -0.02) failures.push("overall drop > 2 pts");
for (const s of SLICES) {
  const idx = ALL.filter((i) => CASES[i].slice === s);
  const ds = rate(cand, idx) - rate(base, idx), fl = flips(base, cand, idx), p = signTest(fl.reg, fl.imp);
  console.log(\`  \${s.padEnd(13)} \${pct(rate(base, idx)).padStart(5)}% -> \${pct(rate(cand, idx)).padStart(5)}%  \${sgn(ds).padStart(6)} pts  flips \${fl.reg} down / \${fl.imp} up  p=\${p.toFixed(3)}\${fl.ids.length ? "  regressed: " + fl.ids.join(",") : ""}\`);
  if (ds < -0.05 && p < 0.05) failures.push(\`\${s} slice dropped \${pct(-ds)} pts (p=\${p.toFixed(3)})\`);
}
for (const i of ALL) if (CASES[i].critical && passed(base[i]) && !passed(cand[i])) failures.push(\`critical case \${CASES[i].id} regressed\`);
console.log(failures.length ? \`GATE: BLOCK -> \${failures.join("; ")}\` : "GATE: PASS");` },
          { tech: "python", code: `# Regression gate for a prompt or model change. Each golden case is graded 3
# times per version (outputs are stochastic); a seeded generator stands in for
# the model + grader, so the run is reproducible. Steps: A/A noise floor,
# baseline vs candidate overall and per slice, flipped cases, exact sign test, gate.
state = 42


def rand():
    global state
    state = (1664525 * state + 1013904223) % 4294967296
    return state / 4294967296


SLICES = ["billing", "shipping", "multilingual"]
# True per-slice pass probability for each version (unknown to the harness).
P = {"base": {"billing": 0.88, "shipping": 0.86, "multilingual": 0.86}, "cand": {"billing": 0.97, "shipping": 0.96, "multilingual": 0.7}}
CASES = [{"id": f"{s[:2]}{i + 1:02d}", "slice": s, "critical": i == 0} for s in SLICES for i in range(25)]
RUNS = 3


def evaluate(version):
    # Returns, per case, how many of RUNS attempts passed.
    out = []
    for c in CASES:
        k = 0
        for _ in range(RUNS):
            if rand() < P[version][c["slice"]]:
                k += 1
        out.append(k)
    return out


def rate(res, idx):
    return sum(res[i] for i in idx) / (len(idx) * RUNS)


def passed(k):
    return k * 2 > RUNS  # majority of runs


def C(n, k):
    r = 1
    for i in range(k):
        r = (r * (n - i)) / (i + 1)
    return r


def sign_test(reg, imp):
    # exact two-sided McNemar / sign test on flipped cases
    n = reg + imp
    if n == 0:
        return 1
    tail = 0
    for i in range(min(reg, imp) + 1):
        tail += C(n, i) * 0.5 ** n
    return min(1, 2 * tail)


def flips(a, b, idx):
    reg = imp = 0
    ids = []
    for i in idx:
        if b[i] < a[i]:
            reg += 1
            ids.append(CASES[i]["id"])
        elif b[i] > a[i]:
            imp += 1
    return reg, imp, ids


def pct(x):
    return f"{x * 100:.1f}"


def sgn(x):
    return ("+" if x >= 0 else "") + pct(x)


ALL = list(range(len(CASES)))
base, rerun, cand = evaluate("base"), evaluate("base"), evaluate("cand")
reg, imp, _ = flips(base, rerun, ALL)
print(f"A/A noise floor (baseline vs baseline rerun): {pct(rate(base, ALL))}% vs {pct(rate(rerun, ALL))}%, delta {sgn(rate(rerun, ALL) - rate(base, ALL))} pts, flips {reg} down / {imp} up, p={sign_test(reg, imp):.3f}")
d = rate(cand, ALL) - rate(base, ALL)
reg, imp, _ = flips(base, cand, ALL)
print(f"overall: baseline {pct(rate(base, ALL))}% -> candidate {pct(rate(cand, ALL))}% ({sgn(d)} pts), flips {reg} down / {imp} up, p={sign_test(reg, imp):.3f}")

failures = []
if d < -0.02:
    failures.append("overall drop > 2 pts")
for s in SLICES:
    idx = [i for i in ALL if CASES[i]["slice"] == s]
    ds = rate(cand, idx) - rate(base, idx)
    reg, imp, ids = flips(base, cand, idx)
    p = sign_test(reg, imp)
    tail = f"  regressed: {','.join(ids)}" if ids else ""
    print(f"  {s:<13} {pct(rate(base, idx)):>5}% -> {pct(rate(cand, idx)):>5}%  {sgn(ds):>6} pts  flips {reg} down / {imp} up  p={p:.3f}{tail}")
    if ds < -0.05 and p < 0.05:
        failures.append(f"{s} slice dropped {pct(-ds)} pts (p={p:.3f})")
for i in ALL:
    if CASES[i]["critical"] and passed(base[i]) and not passed(cand[i]):
        failures.append(f"critical case {CASES[i]['id']} regressed")
print(f"GATE: BLOCK -> {'; '.join(failures)}" if failures else "GATE: PASS")` },
        ],
      },
    ],
  },
];

export default augments;
